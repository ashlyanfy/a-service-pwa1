// ===== SHARED CONFIG — A-SERVICE =====

export const WA_NUMBER = '77777294964';

export function waUrl(text: string): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

// Единый список городов для всех форм
export const CITIES = [
  'Алматы', 'Астана', 'Шымкент', 'Актобе',
  'Тараз', 'Павлодар', 'Усть-Каменогорск', 'Атырау', 'Семей', 'Другой',
] as const;

// Маппинг value → человекочитаемый label (используется в заявках кабинета)
export const SERVICE_LABELS: Record<string, string> = {
  'atm-install':         'Монтаж банкоматов',
  'atm-uninstall':       'Демонтаж банкоматов',
  'terminal-uninstall':  'Демонтаж терминалов',
  'service':             'Обслуживание',
  'logistics':           'Логистика',
  'painting':            'Покраска и ребрендинг',
  'other':               'Другое',
};
