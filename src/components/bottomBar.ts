// ===== MOBILE BOTTOM BAR =====
import { showCabinet, showMainSite } from './cabinet';

export function initBottomBar(): void {
  // Nav cabinet button (top bar)
  document.getElementById('nav-cabinet-btn')?.addEventListener('click', () => {
    showCabinet();
    document.querySelectorAll('.bottom-bar-btn').forEach((b) => b.classList.remove('active'));
  });

  const buttons = document.querySelectorAll<HTMLElement>('.bottom-bar-btn');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');

      if (target === 'cabinet') {
        showCabinet();
        setActive(btn);
        return;
      }

      // If coming back from cabinet — restore main site first
      showMainSite();

      if (target) {
        // Small delay so display:'' takes effect before scroll
        setTimeout(() => {
          document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }

      setActive(btn);
    });
  });

  function setActive(active: HTMLElement): void {
    buttons.forEach((b) => b.classList.remove('active'));
    active.classList.add('active');
  }

  // Sync active state on scroll
  const sectionIds = ['hero', 'services', 'portfolio', 'clients', 'contact'];
  const observer = new IntersectionObserver(
    (entries) => {
      // Pick the entry with highest intersection ratio
      let best = entries.reduce((a, b) => (a.intersectionRatio > b.intersectionRatio ? a : b));
      if (best.isIntersecting) {
        const id = best.target.id;
        buttons.forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-target') === id);
        });
      }
    },
    { threshold: [0.3, 0.6] }
  );

  sectionIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}
