const STATIC_CACHE  = 'a-service-static-v1.6';
const DYNAMIC_CACHE = 'a-service-dynamic-v1.6';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install — кешируем статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — удаляем старые кеши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const cloned = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, cloned));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});

// ===== PUSH NOTIFICATIONS =====

// Получаем push от бэкенда → показываем системное уведомление
self.addEventListener('push', (event) => {
  let data = {
    title: '📋 Новая заявка',
    body: 'Поступила новая заявка',
    url: '/#cabinet',
    order_id: '',
  };

  if (event.data) {
    try { Object.assign(data, JSON.parse(event.data.text())); }
    catch (e) { /* битый JSON — используем дефолт */ }
  }

  const options = {
    body: data.body,
    icon: '/assets/dark-icon.png',
    badge: '/assets/dark-icon.png',
    tag: 'new-order-' + data.order_id,   // одно уведомление на заявку
    renotify: true,                        // показывает даже если tag совпадает
    data: { url: data.url },
    actions: [
      { action: 'open',  title: 'Открыть' },
      { action: 'close', title: 'Закрыть' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Клик по уведомлению → фокус на вкладку или открыть новую
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Если вкладка с нашим сайтом уже открыта — фокусируем её.
        // navigate() не поддерживается в Safari, поэтому только focus().
        const existing = clients.find((c) =>
          c.url.startsWith(self.location.origin)
        );
        if (existing && 'focus' in existing) {
          return existing.focus();
        }
        // Иначе открываем новую вкладку
        return self.clients.openWindow(targetUrl);
      })
  );
});