const root = document.documentElement;
const slider = document.querySelector('.slider');
const originalSlides = [...slider.querySelectorAll('.slide')];
const goButtons = [...document.querySelectorAll('[data-go]')];
const count = document.querySelector('.rail-count b');
const toggle = document.querySelector('.mode-toggle');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

let logicalIndex = 0;
let scrollFrame = 0;
let scrollEndTimer = 0;
let resizing = false;
let wheelFrame = 0;
let wheelTarget = 0;

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem('portfolio-theme', theme);
  toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#211e1f' : '#f3f2ee';
}

setTheme(localStorage.getItem('portfolio-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
toggle.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

originalSlides.forEach(slide => {
  slide.hidden = false;
  slide.classList.remove('active', 'exit-up', 'exit-down', 'enter-from-top');
});

const lastClone = originalSlides.at(-1).cloneNode(true);
const firstClone = originalSlides[0].cloneNode(true);

[lastClone, firstClone].forEach(clone => {
  clone.dataset.clone = 'true';
  clone.setAttribute('aria-hidden', 'true');
  clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
});

slider.prepend(lastClone);
slider.append(firstClone);

const physicalSlides = [...slider.querySelectorAll('.slide')];

function viewportHeight() {
  return slider.clientHeight;
}

function withoutSmoothScroll(callback) {
  slider.classList.add('is-jumping');
  callback();
  requestAnimationFrame(() => requestAnimationFrame(() => slider.classList.remove('is-jumping')));
}

function jumpToPhysical(physicalIndex) {
  withoutSmoothScroll(() => {
    slider.scrollTop = physicalIndex * viewportHeight();
    wheelTarget = slider.scrollTop;
  });
}

function logicalFromPhysical(physicalIndex) {
  if (physicalIndex <= 0) return originalSlides.length - 1;
  if (physicalIndex >= originalSlides.length + 1) return 0;
  return physicalIndex - 1;
}

function updateNavigation(nextIndex) {
  logicalIndex = nextIndex;
  count.textContent = String(nextIndex + 1).padStart(2, '0');
  goButtons.forEach(button => {
    const active = Number(button.dataset.go) === nextIndex;
    button.classList.toggle('active', active);
    if (button.closest('.rail-dots')) button.setAttribute('aria-current', active ? 'true' : 'false');
  });
}

function updateFromScroll() {
  scrollFrame = 0;
  const physicalIndex = Math.max(0, Math.min(physicalSlides.length - 1, Math.round(slider.scrollTop / viewportHeight())));
  updateNavigation(logicalFromPhysical(physicalIndex));
}

function normalizeLoop() {
  if (resizing) return;
  const edgeTolerance = 2;
  if (slider.scrollTop <= edgeTolerance) jumpToPhysical(originalSlides.length);
  if (slider.scrollTop >= slider.scrollHeight - slider.clientHeight - edgeTolerance) jumpToPhysical(1);
}

slider.addEventListener('scroll', () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateFromScroll);
  clearTimeout(scrollEndTimer);
  scrollEndTimer = setTimeout(normalizeLoop, 160);
}, { passive: true });

if ('onscrollend' in window) slider.addEventListener('scrollend', normalizeLoop);

function animateWheel() {
  const distance = wheelTarget - slider.scrollTop;
  if (Math.abs(distance) < .5) {
    slider.scrollTop = wheelTarget;
    wheelFrame = 0;
    return;
  }

  slider.scrollTop += distance * .13;
  wheelFrame = requestAnimationFrame(animateWheel);
}

slider.addEventListener('wheel', event => {
  if (reduceMotion.matches || event.ctrlKey) return;
  event.preventDefault();

  const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewportHeight() : 1;
  const delta = event.deltaY * multiplier;
  const maximum = slider.scrollHeight - slider.clientHeight;

  if (!wheelFrame) wheelTarget = slider.scrollTop;
  wheelTarget = Math.max(0, Math.min(maximum, wheelTarget + delta));
  if (!wheelFrame) wheelFrame = requestAnimationFrame(animateWheel);
}, { passive: false });

function scrollToLogical(target) {
  const currentPhysical = slider.scrollTop / viewportHeight();
  const realPhysical = target + 1;
  const candidates = [realPhysical];
  if (target === 0) candidates.push(originalSlides.length + 1);
  if (target === originalSlides.length - 1) candidates.push(0);
  const destination = candidates.reduce((best, candidate) =>
    Math.abs(candidate - currentPhysical) < Math.abs(best - currentPhysical) ? candidate : best
  );

  slider.scrollTo({
    top: destination * viewportHeight(),
    behavior: reduceMotion.matches ? 'auto' : 'smooth'
  });
}

goButtons.forEach(button => button.addEventListener('click', () => scrollToLogical(Number(button.dataset.go))));

addEventListener('keydown', event => {
  if (!['ArrowDown', 'PageDown', ' ', 'ArrowUp', 'PageUp'].includes(event.key)) return;
  event.preventDefault();
  const direction = ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 1;
  const currentPhysical = Math.round(slider.scrollTop / viewportHeight());
  slider.scrollTo({
    top: (currentPhysical + direction) * viewportHeight(),
    behavior: reduceMotion.matches ? 'auto' : 'smooth'
  });
});

const revealSelectors = [
  '.about-statement', '.portrait-stage', '.resume-title', '.experience-stack',
  '.resume-side', '.work-heading', '.work-card'
].join(',');

physicalSlides.forEach(slide => {
  slide.querySelectorAll(revealSelectors).forEach(element => element.classList.add('reveal-target'));
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.target.classList.toggle('is-visible', entry.isIntersecting));
}, { root: slider, threshold: 0.42 });

physicalSlides.forEach(slide => observer.observe(slide));

addEventListener('resize', () => {
  resizing = true;
  clearTimeout(scrollEndTimer);
  jumpToPhysical(logicalIndex + 1);
  setTimeout(() => { resizing = false; }, 100);
});

jumpToPhysical(1);
updateNavigation(0);
