// ===== SERVICE WORKER REGISTRATION =====
export function registerSW(): void {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });
    } catch (err) {
      console.error('[A-SERVICE] SW registration failed:', err);
    }
  });
}

function showUpdateBanner(): void {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: var(--bg-elevated); border: 1px solid var(--border-medium);
    border-radius: 8px; padding: 12px 20px; z-index: 9999;
    display: flex; gap: 12px; align-items: center;
    font-size: 14px; color: var(--text-primary);
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    animation: fadeUp 0.3s ease;
  `;
  banner.innerHTML = `
    <span>Доступно обновление сайта</span>
    <button onclick="window.location.reload()" style="
      background: var(--gold); color: var(--bg-deep);
      border: none; padding: 6px 14px; border-radius: 4px;
      font-size: 12px; font-weight: 600; cursor: pointer;
    ">Обновить</button>
    <button onclick="this.parentElement.remove()" style="
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; padding: 4px; font-size: 16px;
    ">×</button>
  `;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 10000);
}
