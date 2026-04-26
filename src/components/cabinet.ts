// ===== PERSONAL CABINET — CLIENT ONLY =====
import { waUrl, SERVICE_LABELS } from '../config';
import { applyPhoneMask, isValidEmail } from '../utils/phone';

interface User {
  name: string;
  company: string;
  phone: string;
  email: string;
}

interface Order {
  id: string;
  city: string;
  service: string;
  serviceLabel: string;
  count: number;
  address: string;
  date: string;
  comment: string;
  timestamp: string;
  statusUpdatedAt: string;
  status: 'sent' | 'progress' | 'done';
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  sent:     { label: 'Отправлено',  cls: 'status-new' },
  progress: { label: 'В обработке', cls: 'status-progress' },
  done:     { label: 'Выполнено',   cls: 'status-done' },
};

function formatElapsed(isoTimestamp: string): string {
  const diff  = Date.now() - new Date(isoTimestamp).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'только что';
  if (mins < 60)  return `${mins} мин.`;
  if (hours < 24) return `${hours} ч.`;
  if (days < 30)  return `${days} дн.`;
  return new Date(isoTimestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function tickTimers(): void {
  document.querySelectorAll<HTMLElement>('[data-timer]').forEach((el) => {
    const ts = el.getAttribute('data-timer');
    if (ts) el.textContent = formatElapsed(ts);
  });
}

function getSavedUser(): User | null {
  try { return JSON.parse(localStorage.getItem('as_user') || 'null'); }
  catch { return null; }
}

function saveUser(u: User): void {
  localStorage.setItem('as_user', JSON.stringify(u));
}

function getOrders(): Order[] {
  try {
    return JSON.parse(localStorage.getItem('as_orders') || '[]') as Order[];
  } catch { return []; }
}

function saveOrder(o: Order): void {
  try {
    const arr: Order[] = JSON.parse(localStorage.getItem('as_orders') || '[]');
    arr.unshift(o);
    localStorage.setItem('as_orders', JSON.stringify(arr));
  } catch { /* storage quota exceeded */ }
}

function genId(): string {
  return 'AS-' + Date.now().toString(36).toUpperCase().slice(-6);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function initCabinet(): void {
  initAuthTabs();
  initLoginForm();
  initRegisterForm();
  initLogout();
  initOrderForm();
  setInterval(tickTimers, 60_000);
  const saved = getSavedUser();
  if (saved) showDashboard(saved);
}

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

function initLoginForm(): void {
  const form = document.getElementById('form-login') as HTMLFormElement | null;
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = (form.querySelector('#l-email') as HTMLInputElement).value.trim();
    const pass  = (form.querySelector('#l-password') as HTMLInputElement).value;
    if (!email || !pass) { showFormError(form, 'Заполните все поля'); return; }
    if (!isValidEmail(email)) { showFormError(form, 'Введите корректный email'); return; }
    const saved = getSavedUser();
    loginUser(saved ?? { name: email.split('@')[0], company: '', phone: '', email });
  });
}

function initRegisterForm(): void {
  const form = document.getElementById('form-register') as HTMLFormElement | null;
  if (!form) return;
  const phoneInput = form.querySelector<HTMLInputElement>('#r-phone');
  if (phoneInput) applyPhoneMask(phoneInput);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name    = (form.querySelector('#r-name')     as HTMLInputElement).value.trim();
    const company = (form.querySelector('#r-company')  as HTMLInputElement).value.trim();
    const phone   = (form.querySelector('#r-phone')    as HTMLInputElement).value.trim();
    const email   = (form.querySelector('#r-email')    as HTMLInputElement).value.trim();
    const pass    = (form.querySelector('#r-password') as HTMLInputElement).value;
    if (!name || !email || !pass) { showFormError(form, 'Заполните обязательные поля'); return; }
    if (!isValidEmail(email)) { showFormError(form, 'Введите корректный email'); return; }
    if (pass.length < 6) { showFormError(form, 'Пароль должен быть не менее 6 символов'); return; }
    loginUser({ name, company, phone, email });
  });
}

function showFormError(form: HTMLFormElement, msg: string): void {
  let el = form.querySelector<HTMLElement>('.form-global-error');
  if (!el) {
    el = document.createElement('p');
    el.className = 'form-global-error';
    form.prepend(el);
  }
  el.textContent = msg;
}

function initLogout(): void {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('as_user');
    showAuthScreen();
  });
}

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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const user    = getSavedUser();
    const city    = (form.querySelector('#o-city')    as HTMLSelectElement).value;
    const service = (form.querySelector('#o-service') as HTMLSelectElement).value;
    const count   = (form.querySelector('#o-count')   as HTMLInputElement).value;
    const address = (form.querySelector('#o-address') as HTMLInputElement).value.trim();
    const date    = (form.querySelector('#o-date')    as HTMLInputElement).value;
    const comment = (form.querySelector('#o-comment') as HTMLTextAreaElement).value.trim();

    if (!city || !service || !count || !address) {
      showFormError(form as unknown as HTMLFormElement, 'Заполните обязательные поля (*)');
      return;
    }

    const sLabel  = SERVICE_LABELS[service] || service;
    const dateStr = date
      ? new Date(date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'не указана';
    const now = new Date().toISOString();

    const msg = [
      '📋 *Заявка A-SERVICE*', '',
      `🏢 Компания: ${user?.company || '—'}`,
      `👤 Имя: ${user?.name || '—'}`,
      `📞 Телефон: ${user?.phone || '—'}`,
      `📍 Город: ${city}`,
      `🔧 Услуга: ${sLabel}`,
      `🔢 Количество: ${count} устр.`,
      `📌 Адрес: ${address}`,
      `🗓 Дата: ${dateStr}`,
      comment ? `💬 Комментарий: ${comment}` : '',
    ].filter(Boolean).join('\n');

    const order: Order = {
      id: genId(), city, service, serviceLabel: sLabel,
      count: Number(count), address, date: dateStr,
      comment, timestamp: now, statusUpdatedAt: now, status: 'sent',
    };
    saveOrder(order);
    window.open(waUrl(msg), '_blank');

    renderStats(getOrders());
    renderTable(getOrders());
    const wrap = document.getElementById('order-form-wrap');
    if (wrap) wrap.style.display = 'none';
    form.reset();
  });
}

function loginUser(user: User): void {
  saveUser(user);
  showDashboard(user);
}

function showDashboard(user: User): void {
  document.getElementById('client-auth-screen')?.style.setProperty('display', 'none');
  const dash = document.getElementById('client-dashboard');
  if (!dash) return;
  dash.classList.add('visible');
  const nameEl = document.getElementById('dash-user-name');
  if (nameEl) nameEl.textContent = user.name;
  const orders = getOrders();
  renderStats(orders);
  renderTable(orders);
}

function showAuthScreen(): void {
  document.getElementById('client-auth-screen')?.style.removeProperty('display');
  document.getElementById('client-dashboard')?.classList.remove('visible');
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
    const created = new Date(o.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
    const s = STATUS_MAP[o.status] ?? STATUS_MAP.sent;
    const timerTs = o.statusUpdatedAt || o.timestamp;
    const elapsed = formatElapsed(timerTs);
    const timerLabel = o.status === 'done' ? `выполнено ${elapsed}` : o.status === 'progress' ? `в работе ${elapsed}` : `ожидает ${elapsed}`;
    return `<tr>
      <td><span class="order-id">${esc(o.id)}</span></td>
      <td>${esc(o.city)}</td>
      <td>${esc(o.serviceLabel)}</td>
      <td>${o.count}</td>
      <td>${created}</td>
      <td><div class="status-cell"><span class="status-badge ${s.cls}">${s.label}</span><span class="order-timer" data-timer="${timerTs}">${timerLabel}</span></div></td>
    </tr>`;
  }).join('');
}

export function showCabinet(): void {
  document.querySelectorAll<HTMLElement>('.main-content').forEach((el) => { el.style.display = 'none'; });
  document.getElementById('cabinet')?.classList.add('visible');
  const user = getSavedUser();
  if (user) showDashboard(user);
}

export function showMainSite(): void {
  document.querySelectorAll<HTMLElement>('.main-content').forEach((el) => { el.style.display = ''; });
  document.getElementById('cabinet')?.classList.remove('visible');
}
