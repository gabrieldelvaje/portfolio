const root = document.documentElement;
const pages = [...document.querySelectorAll('[data-page]')];
const links = [...document.querySelectorAll('[data-route]')];
const navLinks = document.querySelector('.nav-links');
const toggle = document.querySelector('.theme-toggle');
const toggleSlider = toggle.querySelector('.toggle-slider');

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem('portfolio-theme', theme);
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#211e1f' : '#f4f4f1';
  toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  toggle.setAttribute('aria-pressed', String(theme === 'dark'));
}

const savedTheme = localStorage.getItem('portfolio-theme');
setTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
toggle.addEventListener('click', () => {
  const currentTheme = root.dataset.theme;
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  const from = currentTheme === 'dark' ? 'translate(calc(100% + 4px), -50%)' : 'translate(0, -50%)';
  const to = nextTheme === 'dark' ? 'translate(calc(100% + 4px), -50%)' : 'translate(0, -50%)';

  setTheme(nextTheme);
  toggleSlider.getAnimations().forEach(animation => animation.cancel());
  toggleSlider.animate([
    { transform: from },
    { transform: to }
  ], {
    duration: 650,
    easing: 'cubic-bezier(.22, 1, .36, 1)',
    iterations: 1
  });
});

const inactiveSun = document.querySelector('.toggle-symbol.sun');
const inactiveSunIcon = inactiveSun.querySelector('img');
let sunHasSpunThisHover = false;

inactiveSun.addEventListener('pointerenter', () => {
  if (root.dataset.theme !== 'dark' || sunHasSpunThisHover) return;
  sunHasSpunThisHover = true;

  inactiveSunIcon.animate([
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(25deg)', offset: .5 },
    { transform: 'rotate(0deg)' }
  ], {
    duration: 650,
    easing: 'ease-in-out',
    iterations: 1,
    fill: 'none'
  });
});

inactiveSun.addEventListener('pointerleave', () => {
  sunHasSpunThisHover = false;
});

const inactiveMoon = document.querySelector('.toggle-symbol.moon');
const inactiveMoonIcon = inactiveMoon.querySelector('img');
let moonHasPulsedThisHover = false;

inactiveMoon.addEventListener('pointerenter', () => {
  if (root.dataset.theme !== 'light' || moonHasPulsedThisHover) return;
  moonHasPulsedThisHover = true;

  inactiveMoonIcon.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(1.1)', offset: .5 },
    { transform: 'scale(1)' }
  ], {
    duration: 700,
    easing: 'ease-in-out',
    iterations: 1
  });
});

inactiveMoon.addEventListener('pointerleave', () => {
  moonHasPulsedThisHover = false;
});

const routeOrder = ['about', 'work', 'resume'];
let currentPrimaryRoute = null;

function primaryRouteFor(route, projectOpen) {
  return projectOpen ? 'work' : route;
}

function applyRoute(validRoute, activePage, projectOpen, primaryRoute, direction) {
  root.dataset.routeDirection = direction;
  pages.forEach(page => page.hidden = page.dataset.page !== validRoute);
  links.forEach(link => {
    const active = link.dataset.route === validRoute || (projectOpen && link.dataset.route === 'work');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  navLinks.style.setProperty('--nav-offset', `${routeOrder.indexOf(primaryRoute) * 100}%`);
  document.body.classList.toggle('project-open', projectOpen);
  scrollTo({top: 0, behavior: 'smooth'});
}

function showRoute() {
  const route = location.hash.slice(1) || 'about';
  const validRoute = pages.some(page => page.dataset.page === route) ? route : 'about';
  const activePage = pages.find(page => page.dataset.page === validRoute);
  const projectOpen = activePage?.classList.contains('project-detail-page') || false;
  const primaryRoute = primaryRouteFor(validRoute, projectOpen);
  const nextIndex = routeOrder.indexOf(primaryRoute);
  const previousIndex = currentPrimaryRoute === null ? nextIndex : routeOrder.indexOf(currentPrimaryRoute);
  const direction = nextIndex < previousIndex ? 'backward' : 'forward';
  const shouldAnimate = currentPrimaryRoute !== null && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  applyRoute(validRoute, activePage, projectOpen, primaryRoute, direction);

  if (shouldAnimate) {
    activePage.getAnimations().forEach(animation => animation.cancel());
    activePage.animate([
      { opacity: 0, transform: `translateX(${direction === 'backward' ? '-32px' : '32px'})` },
      { opacity: 1, transform: 'translateX(0)' }
    ], {
      duration: 460,
      easing: 'cubic-bezier(.22, 1, .36, 1)',
      iterations: 1
    });
  }
  currentPrimaryRoute = primaryRoute;
}
addEventListener('hashchange', showRoute);
showRoute();

function previewNav(link) {
  const index = links.indexOf(link);
  if (index < 0) return;
  links.forEach(item => item.classList.toggle('nav-preview', item === link));
  navLinks.classList.add('is-previewing');
  navLinks.style.setProperty('--nav-offset', `${index * 100}%`);
}

function restoreNav() {
  links.forEach(item => item.classList.remove('nav-preview'));
  navLinks.classList.remove('is-previewing');
  navLinks.style.setProperty('--nav-offset', `${routeOrder.indexOf(currentPrimaryRoute) * 100}%`);
}

links.forEach(link => {
  link.addEventListener('pointerenter', () => previewNav(link));
  link.addEventListener('pointerleave', restoreNav);
  link.addEventListener('focus', () => previewNav(link));
  link.addEventListener('blur', restoreNav);
});

document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
  document.querySelectorAll('[data-category]').forEach(card => {
    const filter = button.dataset.filter;
    card.classList.toggle('filtered', filter !== 'all' && !card.dataset.category.includes(filter));
  });
}));

document.getElementById('year').textContent = new Date().getFullYear();
function updateTime(){document.querySelector('.local-time').textContent = new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date())}
updateTime(); setInterval(updateTime, 60000);
