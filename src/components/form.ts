// ===== FORMS + PRICE MODAL =====
import { applyPhoneMask, isValidPhone } from '../utils/phone';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ── Init ──────────────────────────────────────────────────────────────────────
export function initForm(): void {
  initContactForm();
  initPriceForm();
  initModalTriggers();
}

// ── Backend API submission ────────────────────────────────────────────────────
async function submitOrder(payload: Record<string, string>): Promise<void> {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Ошибка отправки');
  }
}

// ── Contact form ──────────────────────────────────────────────────────────────
function initContactForm(): void {
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  if (!form) return;

  const phoneInput = form.querySelector<HTMLInputElement>('#f-phone');
  if (phoneInput) applyPhoneMask(phoneInput);

  attachValidation(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;

    const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Отправка...'; }

    try {
      await submitOrder({
        company: (form.querySelector('#f-company') as HTMLInputElement).value.trim(),
        city:    (form.querySelector('#f-city')    as HTMLSelectElement).value,
        phone:   (form.querySelector('#f-phone')   as HTMLInputElement).value.trim(),
        service: (form.querySelector('#f-service') as HTMLSelectElement).value,
        comment: (form.querySelector('#f-comment') as HTMLTextAreaElement).value.trim(),
      });

      form.style.display = 'none';
      document.getElementById('form-success')?.classList.add('visible');
    } catch (err) {
      console.error('Contact form error:', err);
      if (btn) { btn.disabled = false; btn.textContent = 'Отправить заявку'; }
      alert('Не удалось отправить заявку. Попробуйте позже или напишите нам напрямую.');
    }
  });
}

// ── Price modal form ──────────────────────────────────────────────────────────
function initPriceForm(): void {
  const form = document.getElementById('price-form') as HTMLFormElement | null;
  if (!form) return;

  const phoneInput = form.querySelector<HTMLInputElement>('#p-phone');
  if (phoneInput) applyPhoneMask(phoneInput);

  attachValidation(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;

    const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Отправка...'; }

    try {
      await submitOrder({
        name:    (form.querySelector('#p-name')    as HTMLInputElement).value.trim(),
        company: (form.querySelector('#p-company') as HTMLInputElement).value.trim(),
        phone:   (form.querySelector('#p-phone')   as HTMLInputElement).value.trim(),
        service: (form.querySelector('#p-service') as HTMLSelectElement).value,
        city:    (form.querySelector('#p-city')    as HTMLSelectElement).value,
        comment: (form.querySelector('#p-comment') as HTMLTextAreaElement).value.trim(),
      });

      closePriceModal();
      form.reset();
      if (btn) { btn.disabled = false; btn.textContent = 'Получить расчёт'; }
    } catch (err) {
      console.error('Price form error:', err);
      if (btn) { btn.disabled = false; btn.textContent = 'Получить расчёт'; }
      alert('Не удалось отправить заявку. Попробуйте позже.');
    }
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function initModalTriggers(): void {
  document.querySelectorAll<HTMLElement>('.open-price-modal').forEach((btn) => {
    btn.addEventListener('click', openPriceModal);
  });
  document.getElementById('price-modal-close')?.addEventListener('click', closePriceModal);
  document.getElementById('price-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('price-modal')) closePriceModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePriceModal();
  });
}

function openPriceModal(): void {
  const modal = document.getElementById('price-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.classList.add('visible'));
}

function closePriceModal(): void {
  const modal = document.getElementById('price-modal');
  if (!modal) return;
  modal.classList.remove('visible');
  setTimeout(() => { modal.style.display = 'none'; document.body.style.overflow = ''; }, 250);
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateForm(form: HTMLFormElement): boolean {
  let valid = true;
  form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[required]').forEach((field) => {
    if (!validateField(field)) valid = false;
  });
  return valid;
}

function validateField(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): boolean {
  const value = field.value.trim();
  let ok = value.length > 0;
  let errorMsg = 'Обязательное поле';
  if (ok && field.type === 'tel') {
    ok = isValidPhone(value);
    errorMsg = 'Введите корректный номер';
  }
  field.classList.toggle('error', !ok);
  let errEl = field.parentElement?.querySelector<HTMLElement>('.field-error');
  if (!ok) {
    if (!errEl) {
      errEl = document.createElement('span');
      errEl.className = 'field-error';
      field.parentElement?.appendChild(errEl);
    }
    errEl.textContent = errorMsg;
  } else {
    errEl?.remove();
  }
  return ok;
}

function attachValidation(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[required]').forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => { if (field.classList.contains('error')) validateField(field); });
  });
}
