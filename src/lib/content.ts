import { supabase } from './supabase';

const ICONS: Record<string, string> = {
  truck:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="24" height="24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  package: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="24" height="24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
  users:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="24" height="24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  box:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="24" height="24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`,
  wrench:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="24" height="24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`,
};

export async function loadContent(): Promise<void> {
  await Promise.all([
    loadSiteTexts(),
    loadContacts(),
    loadExtraServices(),
    loadPortfolio(),
  ]);
}

// Теги разрешённые в текстах сайта (только безопасные)
const ALLOWED_TAGS = /^(em|strong|br|span)$/i;

function safeParse(html: string): DocumentFragment {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  // Удаляем все теги кроме разрешённых
  tpl.content.querySelectorAll('*').forEach(el => {
    if (!ALLOWED_TAGS.test(el.tagName)) {
      el.replaceWith(document.createTextNode(el.textContent ?? ''));
    }
  });
  return tpl.content;
}

async function loadSiteTexts(): Promise<void> {
  const { data } = await supabase.from('site_texts').select('*');
  if (!data) return;
  for (const row of data) {
    // hero texts — допускаем <em> и <br> для форматирования заголовков
    document.querySelectorAll<HTMLElement>(`[data-text="${row.key}"]`).forEach(el => {
      el.innerHTML = '';
      el.appendChild(safeParse(row.value));
    });
    // stats и services — только текст, без HTML
    document.querySelectorAll<HTMLElement>(`[data-stat="${row.key}"]`).forEach(el => {
      el.textContent = row.value;
    });
    document.querySelectorAll<HTMLElement>(`[data-service="${row.key}"]`).forEach(el => {
      el.textContent = row.value;
    });
  }
}

async function loadContacts(): Promise<void> {
  const { data } = await supabase.from('contacts').select('*');
  if (!data) return;
  for (const row of data) {
    document.querySelectorAll<HTMLElement>(`[data-contact="${row.key}"]`).forEach(el => {
      if (row.key === 'phone') {
        el.textContent = row.value;
        (el as HTMLAnchorElement).href = `tel:${row.value.replace(/\s/g, '')}`;
      } else if (row.key === 'email') {
        el.textContent = row.value;
        (el as HTMLAnchorElement).href = `mailto:${row.value}`;
      } else {
        el.textContent = row.value;
      }
    });
  }
}

async function loadExtraServices(): Promise<void> {
  const { data } = await supabase.from('extra_services').select('*').order('position');
  if (!data || data.length === 0) return;
  const cards = document.querySelectorAll<HTMLElement>('.extra-services-card');
  data.forEach((service, i) => {
    const card = cards[i];
    if (!card) return;
    const iconEl  = card.querySelector<HTMLElement>('.why-icon');
    const titleEl = card.querySelector<HTMLElement>('.extra-services-title');
    const descEl  = card.querySelector<HTMLElement>('.why-desc');
    if (iconEl && ICONS[service.icon_name]) iconEl.innerHTML = ICONS[service.icon_name];
    if (titleEl) titleEl.textContent = service.title;
    if (descEl)  descEl.textContent  = service.description;
  });
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function loadPortfolio(): Promise<void> {
  const { data } = await supabase.from('portfolio').select('*').order('position');
  // Only replace static HTML if DB has cards with proper external URLs
  const validCards = (data ?? []).filter(c => c.image_url && !c.image_url.startsWith('/assets/'));
  if (validCards.length === 0) return;
  const track = document.getElementById('carousel-track');
  if (!track) return;
  // Экранируем все данные из БД перед вставкой в HTML
  track.innerHTML = validCards.map(card => `
    <div class="portfolio-card">
      <div class="portfolio-img">
        <img src="${esc(card.image_url)}" alt="${esc(card.title)}" loading="lazy">
      </div>
      <div class="portfolio-info">
        <div class="portfolio-year">${esc(String(card.year))}</div>
        <div class="portfolio-title">${esc(card.title)}</div>
        <div class="portfolio-subtitle">${esc(card.subtitle)}</div>
      </div>
    </div>
  `).join('');
}
