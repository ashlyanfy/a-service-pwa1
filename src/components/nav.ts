// ===== NAVIGATION =====
import { showMainSite } from './cabinet';

export function initNav(): void {
  const nav = document.getElementById('nav');
  if (!nav) return;

  // Scroll effect
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // Active link tracking
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => {
          const href = link.getAttribute('href');
          link.classList.toggle('active', href === `#${entry.target.id}`);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach((s) => observer.observe(s));

  // Smooth scroll — also closes cabinet if open
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = (link as HTMLAnchorElement).getAttribute('href');
      if (!href || href === '#') return;
      e.preventDefault();

      const cabinet = document.getElementById('cabinet');
      const cabinetOpen = cabinet?.classList.contains('visible');

      if (cabinetOpen) {
        showMainSite();
      }

      const scrollTo = () => {
        const target = document.querySelector<HTMLElement>(href);
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top, behavior: cabinetOpen ? 'instant' : 'smooth' });
      };

      if (cabinetOpen) {
        // Wait two frames for DOM to re-render after showMainSite
        requestAnimationFrame(() => requestAnimationFrame(scrollTo));
      } else {
        scrollTo();
      }
    });
  });

  // PWA install button
  let deferredPrompt: any = null;
  const installBtn = document.getElementById('install-btn');

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn?.classList.remove('hidden');
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      installBtn.classList.add('hidden');
    }
    deferredPrompt = null;
  });

  window.addEventListener('appinstalled', () => {
    installBtn?.classList.add('hidden');
    deferredPrompt = null;
  });
}
