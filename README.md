# A-SERVICE PWA — Инструкция по запуску и деплою

## Структура проекта

```
a-service-pwa/
├── public/
│   ├── assets/         ← фотографии и логотип (загрузить самостоятельно)
│   ├── icons/          ← иконки PWA (загрузить самостоятельно)
│   ├── index.html      ← главная страница
│   ├── manifest.json   ← PWA манифест
│   └── sw.js           ← Service Worker
├── src/
│   ├── components/
│   │   ├── nav.ts
│   │   ├── hero.ts
│   │   ├── carousel.ts
│   │   ├── form.ts
│   │   ├── cabinet.ts
│   │   └── bottomBar.ts
│   ├── utils/
│   │   ├── reveal.ts
│   │   └── sw.ts
│   ├── styles/
│   │   └── main.css
│   └── main.ts
├── ASSETS_README.md    ← список нужных файлов ассетов
├── netlify.toml
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Шаг 1 — Загрузите ассеты

Смотрите файл **ASSETS_README.md** — там полный список файлов с точными именами.

---

## Шаг 2 — Установите зависимости

```bash
cd a-service-pwa
npm install
```

Требования: **Node.js 18+**

---

## Шаг 3 — Локальный запуск (разработка)

```bash
npm run dev
```

Откроется браузер на `http://localhost:3000`

---

## Шаг 4 — Сборка для продакшена

```bash
npm run build
```

Готовые файлы появятся в папке `/dist`

Проверить результат локально:
```bash
npm run preview
```

---

## Шаг 5 — Деплой на Netlify

### Вариант A — через Netlify CLI (рекомендуется)

```bash
# Установить Netlify CLI
npm install -g netlify-cli

# Авторизоваться
netlify login

# Деплой
netlify deploy --prod --dir=dist
```

### Вариант B — через GitHub + Netlify UI

1. Создайте репозиторий на GitHub и запушьте проект:
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/ВАШ_ЛОГИН/a-service-pwa.git
git push -u origin main
```

2. Откройте [app.netlify.com](https://app.netlify.com)
3. New site → Import from Git → выберите репозиторий
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Нажмите **Deploy site**

### Вариант C — перетащить папку /dist вручную

1. Выполните `npm run build`
2. Откройте [app.netlify.com](https://app.netlify.com)
3. Перетащите папку `dist` в зону деплоя

---

## PWA — установка на устройство

После деплоя сайт автоматически предложит установить себя как приложение:
- **iOS (Safari)**: Поделиться → На экран «Домой»
- **Android/Chrome**: Появится баннер «Установить» или кнопка в браузере
- **Desktop Chrome/Edge**: Иконка установки в адресной строке

---

## Что включено

| Функция | Статус |
|---------|--------|
| Адаптивный дизайн (mobile/tablet/desktop) | ✅ |
| PWA (manifest + Service Worker) | ✅ |
| Оффлайн-кеширование | ✅ |
| Кнопка установки приложения | ✅ |
| Анимированный carousel с автопрокруткой | ✅ |
| Touch/swipe на мобильных | ✅ |
| Форма заявки с валидацией | ✅ |
| Личный кабинет (UI, localStorage) | ✅ |
| Мобильный bottom bar | ✅ |
| Scroll reveal анимации | ✅ |
| Анимированные счётчики в Hero | ✅ |
| SEO мета-теги | ✅ |

---

## Подключение бэкенда (позже)

В файле `src/components/form.ts` найдите функцию `initForm` — 
замените строку с `setTimeout` на реальный `fetch`:

```typescript
// Замените эту строку:
await new Promise((r) => setTimeout(r, 1200));

// На реальный API-вызов:
await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```
