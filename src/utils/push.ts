// ===== Web Push Utility — CRM Only =====
//
// Логика:
//   1. CRM-менеджер логинится → получает token → сохраняется в localStorage.
//   2. subscribeToPush(token) запрашивает разрешение → подписывает браузер →
//      отправляет subscription на бэкенд с токеном в заголовке.
//   3. Бэкенд хранит subscription в subscriptions.json.
//   4. При новой заявке бэкенд шлёт push → SW показывает уведомление.

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ── Типы ──────────────────────────────────────────────────────────────────────

export type PushStatus = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

/** Бросается когда сервер вернул 401 — токен истёк или сервер перезапускался. */
export class CrmAuthError extends Error {
  constructor() {
    super('CRM session expired');
    this.name = 'CrmAuthError';
  }
}

// ── Вспомогательные функции ───────────────────────────────────────────────────

/**
 * Конвертирует base64url VAPID public key → ArrayBuffer.
 * Возвращаем ArrayBuffer (не Uint8Array), чтобы избежать конфликта
 * TypeScript-дженерика Uint8Array<ArrayBufferLike> vs ArrayBufferView<ArrayBuffer>.
 */
function vapidKeyToBuffer(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64  = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary  = atob(base64);
  const buffer  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer.buffer as ArrayBuffer;
}

/** Возвращает заголовки с CRM-токеном для авторизованных запросов. */
function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Crm-Token': token,
  };
}

// ── Проверки поддержки и статуса ─────────────────────────────────────────────

/** Проверяет, поддерживает ли браузер Web Push. */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager'   in window &&
    'Notification'  in window
  );
}

/**
 * Возвращает текущий статус push-подписки.
 * Безопасен: возвращает 'unsupported' если SW не зарегистрирован.
 */
export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'subscribed' : 'unsubscribed';
  } catch {
    // SW мог не зарегистрироваться (например, HTTP вместо HTTPS)
    return 'unsupported';
  }
}

// ── Подписка ──────────────────────────────────────────────────────────────────

/**
 * Запрашивает разрешение на уведомления и подписывает браузер.
 * @param crmToken — сессионный токен CRM-менеджера для авторизации на бэкенде
 * @returns true при успехе, false при отказе пользователя или ошибке
 */
export async function subscribeToPush(crmToken: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  try {
    // Получаем VAPID public key с бэкенда
    const keyResponse = await fetch(`${API_URL}/api/push/vapid-public-key`);
    if (!keyResponse.ok) {
      throw new Error(`Failed to fetch VAPID key: ${keyResponse.status}`);
    }

    const { publicKey } = await keyResponse.json() as { publicKey: string };
    if (!publicKey || typeof publicKey !== 'string') {
      throw new Error('Invalid VAPID public key received from server');
    }

    const reg = await navigator.serviceWorker.ready;

    // Если подписка уже существует — синхронизируем с бэкендом
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await _sendSubscriptionToBackend(existing, crmToken);
      return true;
    }

    // Создаём новую подписку
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyToBuffer(publicKey),
    });

    await _sendSubscriptionToBackend(subscription, crmToken);
    return true;
  } catch (err) {
    // CrmAuthError пробрасываем наверх — cabinet.ts обработает (покажет логин)
    if (err instanceof CrmAuthError) throw err;
    console.error('[PUSH] Subscribe error:', err);
    return false;
  }
}

// ── Отписка ───────────────────────────────────────────────────────────────────

/**
 * Отменяет push-подписку в браузере и удаляет её с бэкенда.
 * @param crmToken — сессионный токен CRM-менеджера
 */
export async function unsubscribeFromPush(crmToken: string): Promise<void> {
  if (!isPushSupported()) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    const endpoint = sub.endpoint;

    // Сначала отписываем браузер
    await sub.unsubscribe();

    // Затем удаляем с бэкенда. Если запрос упадёт — бэкенд сам почистит
    // мёртвую подписку при следующей попытке отправки push (410 → auto-clean).
    const res = await fetch(`${API_URL}/api/push/unsubscribe`, {
      method: 'POST',
      headers: authHeaders(crmToken),
      body: JSON.stringify({ endpoint }),
    });

    if (!res.ok) {
      console.warn('[PUSH] Failed to remove subscription from server:', res.status);
    }
  } catch (err) {
    console.error('[PUSH] Unsubscribe error:', err);
  }
}

// ── Внутренние хелперы ────────────────────────────────────────────────────────

/**
 * Отправляет объект подписки на бэкенд для хранения.
 * Бросает Error если запрос не удался — вызывающий код должен обработать.
 */
async function _sendSubscriptionToBackend(
  sub: PushSubscription,
  crmToken: string,
): Promise<void> {
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth   = json.keys?.auth;

  if (!p256dh || !auth) {
    throw new Error('Push subscription is missing required keys');
  }

  const res = await fetch(`${API_URL}/api/push/subscribe`, {
    method: 'POST',
    headers: authHeaders(crmToken),
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh, auth },
    }),
  });

  if (res.status === 401) {
    throw new CrmAuthError();
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(error.detail ?? `Server error: ${res.status}`);
  }
}
