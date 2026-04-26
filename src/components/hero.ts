// ===== HERO =====
export function initHero(): void {
  // Animated counter for stats
  const stats = document.querySelectorAll('[data-count]');
  
  const animateCount = (el: Element) => {
    const target = parseInt(el.getAttribute('data-count') || '0', 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 1800;
    const start = performance.now();
    
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = current.toLocaleString('ru-RU') + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    };
    
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach((s) => observer.observe(s));
}
