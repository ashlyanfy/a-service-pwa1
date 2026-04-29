// ===== PERSONAL CABINET — Supabase Auth + DB =====
import { waUrl, SERVICE_LABELS } from '../config';
import { applyPhoneMask } from '../utils/phone';
import { supabase } from '../lib/supabase';

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
  setInterval(tickTimers, 60_000);

  // Проверяем сессию при загрузке
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) showDashboard(data.session.user);
  });

  // Слушаем изменения авторизации
  supabase.auth.onAuthStateChange((_event, session) => {
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
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) alert('Ошибка: ' + error.message);
    else alert(`✅ Письмо для сброса пароля отправлено на ${email}`);
  });
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

    // Сохраняем в Supabase
    const { error } = await supabase.from('client_orders').insert({
      user_id:      user.id,
      city,
      service,
      service_label: serviceLabel,
      count,
      address,
      scheduled_at: date || null,
      comment:      comment || null,
    });

    if (error) {
      if (btn) { btn.disabled = false; btn.textContent = 'Отправить в WhatsApp'; }
      showFormError(form as HTMLFormElement, 'Ошибка сохранения. Попробуйте ещё раз.');
      return;
    }

    // Открываем WhatsApp
    const dateStr = date
      ? new Date(date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'не указана';

    const msg = [
      '📋 *Заявка A-SERVICE*', '',
      `🏢 Компания: ${meta.company || '—'}`,
      `👤 Имя: ${meta.name || '—'}`,
      `📞 Телефон: ${meta.phone || '—'}`,
      `📍 Город: ${city}`,
      `🔧 Услуга: ${serviceLabel}`,
      `🔢 Количество: ${count} устр.`,
      `📌 Адрес: ${address}`,
      `🗓 Дата: ${dateStr}`,
      comment ? `💬 Комментарий: ${comment}` : '',
    ].filter(Boolean).join('\n');

    window.open(waUrl(msg), '_blank');

    if (btn) { btn.disabled = false; btn.textContent = 'Отправить в WhatsApp'; }
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
