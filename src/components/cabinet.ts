// ===== PERSONAL CABINET — Supabase Auth + DB =====
import { SERVICE_LABELS } from '../config';
import { applyPhoneMask } from '../utils/phone';
import { supabase, APP_URL } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

interface Order {
  id: string;
  city: string;
  service: string;
  service_label: string;
  count: number;
  address: string;
  scheduled_at: string | null;
  comment: string | null;
  status: 'sent' | 'progress' | 'done';
  status_updated_at: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  sent:     { label: 'Отправлено',  cls: 'status-new' },
  progress: { label: 'В обработке', cls: 'status-progress' },
  done:     { label: 'Выполнено',   cls: 'status-done' },
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatElapsed(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'только что';
  if (mins < 60)  return `${mins} мин.`;
  if (hours < 24) return `${hours} ч.`;
  if (days < 30)  return `${days} дн.`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function tickTimers(): void {
  document.querySelectorAll<HTMLElement>('[data-timer]').forEach((el) => {
    const ts = el.getAttribute('data-timer');
    if (ts) el.textContent = formatElapsed(ts);
  });
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

function showFormError(form: HTMLFormElement, msg: string): void {
  let el = form.querySelector<HTMLElement>('.form-global-error');
  if (!el) {
    el = document.createElement('p');
    el.className = 'form-global-error';
    form.prepend(el);
  }
  el.textContent = msg;
}

function clearFormError(form: HTMLFormElement): void {
  form.querySelector('.form-global-error')?.remove();
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initCabinet(): void {
  initAuthTabs();
  initLoginForm();
  initRegisterForm();
  initForgotPassword();
  initLogout();
  initOrderForm();
  initPasswordResetModal();
  setInterval(tickTimers, 60_000);

  // Проверяем сессию при загрузке
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) showDashboard(data.session.user);
  });

  // Слушаем изменения авторизации
  supabase.auth.onAuthStateChange((event, session) => {
    // Ссылка для сброса пароля — показываем модал
    if (event === 'PASSWORD_RECOVERY') {
      showPasswordResetModal();
      return;
    }
    if (session) showDashboard(session.user);
    else showAuthScreen();
  });
}

// ── Auth Tabs ─────────────────────────────────────────────────────────────────

function initAuthTabs(): void {
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const t = tab.getAttribute('data-tab');
      document.querySelectorAll('.auth-tab').forEach((x) => x.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.auth-form').forEach((f) => f.classList.remove('visible'));
      document.getElementById(`form-${t}`)?.classList.add('visible');
    });
  });
}

// ── Login ─────────────────────────────────────────────────────────────────────

function initLoginForm(): void {
  const form = document.getElementById('form-login') as HTMLFormElement | null;
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormError(form);
    const email = (form.querySelector('#l-email') as HTMLInputElement).value.trim();
    const pass  = (form.querySelector('#l-password') as HTMLInputElement).value;
    if (!email || !pass) { showFormError(form, 'Заполните все поля'); return; }

    const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Вход...'; }

    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });

    if (btn) { btn.disabled = false; btn.textContent = 'Войти'; }
    if (error) showFormError(form, 'Неверный email или пароль');
  });
}

// ── Register ──────────────────────────────────────────────────────────────────

function initRegisterForm(): void {
  const form = document.getElementById('form-register') as HTMLFormElement | null;
  if (!form) return;

  const phoneInput = form.querySelector<HTMLInputElement>('#r-phone');
  if (phoneInput) applyPhoneMask(phoneInput);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormError(form);

    const name    = (form.querySelector('#r-name')     as HTMLInputElement).value.trim();
    const company = (form.querySelector('#r-company')  as HTMLInputElement).value.trim();
    const phone   = (form.querySelector('#r-phone')    as HTMLInputElement).value.trim();
    const email   = (form.querySelector('#r-email')    as HTMLInputElement).value.trim();
    const pass    = (form.querySelector('#r-password') as HTMLInputElement).value;

    if (!name || !email || !pass) { showFormError(form, 'Заполните обязательные поля'); return; }
    if (pass.length < 6) { showFormError(form, 'Пароль — минимум 6 символов'); return; }

    const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Регистрация...'; }

    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { name, company, phone },
        emailRedirectTo: `${APP_URL}/`,
      },
    });

    if (btn) { btn.disabled = false; btn.textContent = 'Зарегистрироваться'; }

    if (error) {
      showFormError(form, error.message === 'User already registered'
        ? 'Этот email уже зарегистрирован'
        : 'Ошибка регистрации. Попробуйте ещё раз.');
    } else {
      showFormError(form, '✅ На почту отправлено письмо для подтверждения');
    }
  });
}

// ── Forgot Password ───────────────────────────────────────────────────────────

function initForgotPassword(): void {
  // Добавляем ссылку "Забыли пароль?" под кнопкой входа
  const loginForm = document.getElementById('form-login');
  if (!loginForm) return;

  const link = document.createElement('p');
  link.className = 'form-note';
  link.style.textAlign = 'center';
  link.style.marginTop = '8px';
  link.innerHTML = '<a href="#" id="forgot-link" style="color:var(--brand-3);font-size:13px;">Забыли пароль?</a>';
  loginForm.appendChild(link);

  document.getElementById('forgot-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = (document.querySelector('#l-email') as HTMLInputElement)?.value.trim();
    if (!email) {
      alert('Введите ваш email в поле выше');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/`,
    });
    if (error) alert('Ошибка: ' + error.message);
    else alert(`✅ Письмо для сброса пароля отправлено на ${email}`);
  });
}

// ── Password Reset Modal ──────────────────────────────────────────────────────

function initPasswordResetModal(): void {
  // Создаём модал динамически
  const modal = document.createElement('div');
  modal.id = 'reset-password-modal';
  modal.style.cssText = `
    display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);
    backdrop-filter:blur(6px);z-index:300;
    display:none;align-items:center;justify-content:center;padding:20px;
  `;
  modal.innerHTML = `
    <div style="
      width:100%;max-width:420px;background:rgba(12,9,24,0.97);
      border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:32px;
    ">
      <h3 style="font-size:1.25rem;font-weight:800;margin-bottom:8px;">Новый пароль</h3>
      <p style="color:var(--muted);font-size:14px;margin-bottom:24px;">
        Введите новый пароль для вашего аккаунта
      </p>
      <div class="form-group" style="display:grid;gap:6px;margin-bottom:14px;">
        <label class="form-label">Новый пароль *</label>
        <input id="reset-new-password" type="password" class="form-input"
          placeholder="Минимум 6 символов">
      </div>
      <div class="form-group" style="display:grid;gap:6px;margin-bottom:20px;">
        <label class="form-label">Повторите пароль *</label>
        <input id="reset-confirm-password" type="password" class="form-input"
          placeholder="Повторите пароль">
      </div>
      <p id="reset-error" style="color:#f87171;font-size:13px;margin-bottom:12px;display:none;"></p>
      <button id="reset-submit-btn" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;">
        Сохранить пароль
      </button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('reset-submit-btn')?.addEventListener('click', async () => {
    const newPass     = (document.getElementById('reset-new-password') as HTMLInputElement).value;
    const confirmPass = (document.getElementById('reset-confirm-password') as HTMLInputElement).value;
    const errEl       = document.getElementById('reset-error')!;

    errEl.style.display = 'none';

    if (newPass.length < 6) {
      errEl.textContent = 'Пароль должен быть не менее 6 символов';
      errEl.style.display = 'block';
      return;
    }
    if (newPass !== confirmPass) {
      errEl.textContent = 'Пароли не совпадают';
      errEl.style.display = 'block';
      return;
    }

    const btn = document.getElementById('reset-submit-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Сохранение...';

    const { error } = await supabase.auth.updateUser({ password: newPass });

    if (error) {
      errEl.textContent = 'Ошибка: ' + error.message;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Сохранить пароль';
    } else {
      hidePasswordResetModal();
      alert('✅ Пароль успешно изменён! Теперь войдите с новым паролем.');
      await supabase.auth.signOut();
    }
  });
}

function showPasswordResetModal(): void {
  // Открываем кабинет если не открыт
  const cabinet = document.getElementById('cabinet');
  if (!cabinet?.classList.contains('visible')) {
    showCabinet();
  }
  const modal = document.getElementById('reset-password-modal');
  if (modal) modal.style.display = 'flex';
}

function hidePasswordResetModal(): void {
  const modal = document.getElementById('reset-password-modal');
  if (modal) modal.style.display = 'none';
}

// ── Logout ────────────────────────────────────────────────────────────────────

function initLogout(): void {
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    showAuthScreen();
  });
}

// ── Order Form ────────────────────────────────────────────────────────────────

function initOrderForm(): void {
  document.getElementById('new-order-btn')?.addEventListener('click', () => {
    const wrap = document.getElementById('order-form-wrap');
    if (!wrap) return;
    const isOpen = wrap.style.display !== 'none';
    wrap.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  document.getElementById('close-order-form')?.addEventListener('click', () => {
    const wrap = document.getElementById('order-form-wrap');
    if (wrap) wrap.style.display = 'none';
  });

  const form = document.getElementById('order-form') as HTMLFormElement | null;
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const city    = (form.querySelector('#o-city')    as HTMLSelectElement).value;
    const service = (form.querySelector('#o-service') as HTMLSelectElement).value;
    const count   = parseInt((form.querySelector('#o-count') as HTMLInputElement).value) || 1;
    const address = (form.querySelector('#o-address') as HTMLInputElement).value.trim();
    const date    = (form.querySelector('#o-date')    as HTMLInputElement).value;
    const comment = (form.querySelector('#o-comment') as HTMLTextAreaElement).value.trim();

    if (!city || !service || !address) {
      showFormError(form as HTMLFormElement, 'Заполните обязательные поля (*)');
      return;
    }

    const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Отправка...'; }

    const serviceLabel = SERVICE_LABELS[service] || service;
    const meta = user.user_metadata as Record<string, string>;

    // Отправляем через API (email + Telegram)
    const res = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:         meta.name    || undefined,
        company:      meta.company || 'Клиент',
        phone:        meta.phone   || '+7 000 000 00 00',
        city,
        service,
        address:      address || undefined,
        count:        count   || undefined,
        scheduled_at: date    || undefined,
        comment:      comment || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { detail?: string };
      if (btn) { btn.disabled = false; btn.textContent = 'Отправить заявку'; }
      showFormError(form as HTMLFormElement, err.detail ?? 'Ошибка отправки. Попробуйте ещё раз.');
      return;
    }

    // Сохраняем в Supabase для истории клиента
    await supabase.from('client_orders').insert({
      user_id:       user.id,
      city,
      service,
      service_label: serviceLabel,
      count,
      address,
      scheduled_at:  date || null,
      comment:       comment || null,
    });

    if (btn) { btn.disabled = false; btn.textContent = 'Отправить заявку'; }
    form.reset();
    document.getElementById('order-form-wrap')!.style.display = 'none';
    await loadOrders(user.id);
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

async function showDashboard(user: { id: string; user_metadata: Record<string, unknown> }): Promise<void> {
  document.getElementById('client-auth-screen')?.style.setProperty('display', 'none');
  const dash = document.getElementById('client-dashboard');
  if (!dash) return;
  dash.classList.add('visible');

  const meta = user.user_metadata as Record<string, string>;
  const nameEl = document.getElementById('dash-user-name');
  if (nameEl) nameEl.textContent = meta.name || 'Клиент';

  await loadOrders(user.id);
}

function showAuthScreen(): void {
  document.getElementById('client-auth-screen')?.style.removeProperty('display');
  document.getElementById('client-dashboard')?.classList.remove('visible');
}

// ── Orders ────────────────────────────────────────────────────────────────────

async function loadOrders(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('client_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load orders:', error);
    return;
  }

  const orders = (data || []) as Order[];
  renderStats(orders);
  renderTable(orders);
}

function renderStats(orders: Order[]): void {
  const set = (id: string, v: string) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('stat-total',    String(orders.length));
  set('stat-new',      String(orders.filter((o) => o.status === 'sent').length));
  set('stat-progress', String(orders.filter((o) => o.status === 'progress').length));
  set('stat-done',     String(orders.filter((o) => o.status === 'done').length));
}

function renderTable(orders: Order[]): void {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted)">Заявок пока нет. Нажмите «Новая заявка».</td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map((o) => {
    const created = new Date(o.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
    const s = STATUS_MAP[o.status] ?? STATUS_MAP.sent;
    const timerTs = o.status_updated_at || o.created_at;
    const elapsed = formatElapsed(timerTs);
    const timerLabel = o.status === 'done' ? `выполнено ${elapsed}` : o.status === 'progress' ? `в работе ${elapsed}` : `ожидает ${elapsed}`;
    return `<tr>
      <td><span class="order-id">AS-${esc(o.id.slice(0,6).toUpperCase())}</span></td>
      <td>${esc(o.city)}</td>
      <td>${esc(o.service_label || o.service)}</td>
      <td>${o.count}</td>
      <td>${created}</td>
      <td><div class="status-cell"><span class="status-badge ${s.cls}">${s.label}</span><span class="order-timer" data-timer="${timerTs}">${timerLabel}</span></div></td>
    </tr>`;
  }).join('');
}

export function showCabinet(): void {
  document.querySelectorAll<HTMLElement>('.main-content').forEach((el) => { el.style.display = 'none'; });
  document.getElementById('cabinet')?.classList.add('visible');
}

export function showMainSite(): void {
  document.querySelectorAll<HTMLElement>('.main-content').forEach((el) => { el.style.display = ''; });
  document.getElementById('cabinet')?.classList.remove('visible');
}
