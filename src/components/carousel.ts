// ===== PORTFOLIO CAROUSEL =====

export function initCarousel(): void {
  const track = document.getElementById('carousel-track') as HTMLElement | null;
  const prevBtn = document.getElementById('carousel-prev') as HTMLButtonElement | null;
  const nextBtn = document.getElementById('carousel-next') as HTMLButtonElement | null;
  const dotsContainer = document.getElementById('carousel-dots');
  if (!track || !dotsContainer) return;

  const originalCards = Array.from(track.querySelectorAll<HTMLElement>('.portfolio-card'));
  if (!originalCards.length) return;

  // gap должен совпадать с CSS .carousel-track { gap: 16px }
  const gap = 16;
  const originalLen = originalCards.length;
  const isDesktop = window.innerWidth >= 1024;

  // На десктопе клонируем все карточки один раз для бесконечной прокрутки
  if (isDesktop) {
    originalCards.forEach((c) => track.appendChild(c.cloneNode(true) as HTMLElement));
  }

  // cardWidth — мутабельный, обновляется при resize
  let cardWidth = originalCards[0].offsetWidth;
  let currentIndex = 0;
  let autoplayInterval: ReturnType<typeof setInterval> | null = null;

  const maxIndex = isDesktop
    ? originalLen - 1
    : Math.max(0, originalLen - Math.floor(window.innerWidth < 768 ? 1.2 : 2.2));

  // Создаём точки
  const dots: HTMLElement[] = [];
  const dotCount = isDesktop ? originalLen : maxIndex + 1;
  for (let i = 0; i < dotCount; i++) {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Слайд ${i + 1}`);
    dot.addEventListener('click', () => { goTo(i); resetAutoplay(); });
    dotsContainer.appendChild(dot);
    dots.push(dot);
  }

  function applyTransform(index: number, animate: boolean): void {
    const offset = index * (cardWidth + gap);
    track!.style.transition = animate ? 'transform 0.5s cubic-bezier(0.25,1,0.5,1)' : 'none';
    track!.style.transform = `translateX(-${offset}px)`;
  }

  function updateDots(index: number): void {
    const active = ((index % originalLen) + originalLen) % originalLen;
    dots.forEach((d, i) => d.classList.toggle('active', i === (isDesktop ? active : index)));
  }

  function goTo(index: number): void {
    if (isDesktop) {
      currentIndex = index;
      applyTransform(currentIndex, true);
      updateDots(currentIndex);

      if (currentIndex >= originalLen) {
        setTimeout(() => { currentIndex = 0; applyTransform(0, false); }, 520);
      } else if (currentIndex < 0) {
        setTimeout(() => { currentIndex = originalLen - 1; applyTransform(currentIndex, false); }, 520);
      }
    } else {
      currentIndex = Math.max(0, Math.min(index, maxIndex));
      applyTransform(currentIndex, true);
      updateDots(currentIndex);
      if (prevBtn) prevBtn.disabled = currentIndex === 0;
      if (nextBtn) nextBtn.disabled = currentIndex >= maxIndex;
    }
  }

  prevBtn?.addEventListener('click', () => { goTo(currentIndex - 1); resetAutoplay(); });
  nextBtn?.addEventListener('click', () => { goTo(currentIndex + 1); resetAutoplay(); });

  // Touch / drag
  let startX = 0;
  let isDragging = false;

  track.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { goTo(currentIndex + (diff > 0 ? 1 : -1)); resetAutoplay(); }
    isDragging = false;
  });

  // Autoplay
  function startAutoplay(): void {
    autoplayInterval = setInterval(() => {
      if (isDesktop) {
        goTo(currentIndex + 1);
      } else {
        goTo(currentIndex >= maxIndex ? 0 : currentIndex + 1);
      }
    }, 4000);
  }

  function resetAutoplay(): void {
    if (autoplayInterval) clearInterval(autoplayInterval);
    startAutoplay();
  }

  // Пауза при наведении — resetAutoplay при уходе, чтобы не накапливать интервалы
  track.addEventListener('mouseenter', () => { if (autoplayInterval) clearInterval(autoplayInterval); });
  track.addEventListener('mouseleave', () => resetAutoplay());

  // Resize: debounce + пересчёт cardWidth
  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      cardWidth = originalCards[0].offsetWidth;
      goTo(0);
    }, 150);
  }, { passive: true });

  goTo(0);
  startAutoplay();
}
