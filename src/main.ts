// ===== A-SERVICE PWA — MAIN ENTRY =====
import './styles/main.css';
import { initNav } from './components/nav';
import { initHero } from './components/hero';
import { initCarousel } from './components/carousel';
import { initForm } from './components/form';
import { initCabinet } from './components/cabinet';
import { initReveal } from './utils/reveal';
import { registerSW } from './utils/sw';
import { initBottomBar } from './components/bottomBar';
import { loadContent } from './lib/content';

document.addEventListener('DOMContentLoaded', async () => {
  registerSW();
  initNav();
  initHero();
  // Load dynamic content from Supabase first, then init carousel
  await loadContent();
  initCarousel();
  initForm();
  initCabinet();
  initReveal();
  initBottomBar();
});
