/* Touch devices play the preview while the card is visible. */
(() => {
  const card = document.getElementById('card-agua-piracicaba');
  if (!card || !('IntersectionObserver' in window)) return;
  const touch = window.matchMedia('(hover: none)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  const update = () => card.classList.toggle('is-playing',
    visible && touch.matches && !reducedMotion.matches && !document.hidden);
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.6;
    update();
  }, { threshold: [0, 0.6] });
  observer.observe(card);
  touch.addEventListener('change', update);
  reducedMotion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
})();
