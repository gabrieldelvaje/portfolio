const root = document.documentElement;
const pages = [...document.querySelectorAll('[data-page]')];
const links = [...document.querySelectorAll('[data-route]')];
const navLinks = document.querySelector('.nav-links');
const navSlider = document.querySelector('.nav-slider');
const toggles = [...document.querySelectorAll('.theme-toggle')];

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem('portfolio-theme', theme);
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#211e1f' : '#f4f4f1';
  toggles.forEach(toggle => {
    toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  });
}

const savedTheme = localStorage.getItem('portfolio-theme');
setTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
toggles.forEach(toggle => {
  const toggleSlider = toggle.querySelector('.toggle-slider');
  toggle.addEventListener('click', () => {
    const currentTheme = root.dataset.theme;
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    const from = currentTheme === 'dark' ? 'translate(calc(100% + 4px), -50%)' : 'translate(0, -50%)';
    const to = nextTheme === 'dark' ? 'translate(calc(100% + 4px), -50%)' : 'translate(0, -50%)';

    setTheme(nextTheme);
    toggleSlider.getAnimations().forEach(animation => animation.cancel());
    toggleSlider.animate([{ transform: from }, { transform: to }], {
      duration: 650,
      easing: 'cubic-bezier(.22, 1, .36, 1)',
      iterations: 1
    });
  });

  const inactiveSun = toggle.querySelector('.toggle-symbol.sun');
  const inactiveMoon = toggle.querySelector('.toggle-symbol.moon');
  let sunHasSpunThisHover = false;
  let moonHasPulsedThisHover = false;

  inactiveSun.addEventListener('pointerenter', () => {
    if (root.dataset.theme !== 'dark' || sunHasSpunThisHover) return;
    sunHasSpunThisHover = true;
    inactiveSun.querySelector('img').animate([
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(25deg)', offset: .5 },
      { transform: 'rotate(0deg)' }
    ], { duration: 650, easing: 'ease-in-out', iterations: 1 });
  });
  inactiveSun.addEventListener('pointerleave', () => { sunHasSpunThisHover = false; });

  inactiveMoon.addEventListener('pointerenter', () => {
    if (root.dataset.theme !== 'light' || moonHasPulsedThisHover) return;
    moonHasPulsedThisHover = true;
    inactiveMoon.querySelector('img').animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.1)', offset: .5 },
      { transform: 'scale(1)' }
    ], { duration: 700, easing: 'ease-in-out', iterations: 1 });
  });
  inactiveMoon.addEventListener('pointerleave', () => { moonHasPulsedThisHover = false; });
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
  document.body.classList.toggle('project-open', projectOpen);
  document.body.classList.toggle('work-active', validRoute === 'work');
  document.body.classList.toggle('resume-active', validRoute === 'resume');
  if (validRoute !== 'work') {
    document.querySelector('.project-filters')?.classList.remove('is-open');
    const filterToggle = document.querySelector('.filter-menu-toggle');
    filterToggle?.setAttribute('aria-expanded', 'false');
    filterToggle?.setAttribute('aria-label', 'Open project filters');
  }
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

  navLinks.style.setProperty('--nav-offset', `${nextIndex * 100}%`);
  navSlider.getAnimations().forEach(animation => animation.cancel());
  if (currentPrimaryRoute !== null && nextIndex !== previousIndex) {
    navSlider.animate([
      { transform: `translateX(${previousIndex * 100}%)` },
      { transform: `translateX(${nextIndex * 100}%)` }
    ], {
      duration: 650,
      easing: 'cubic-bezier(.22, 1, .36, 1)',
      iterations: 1
    });
  }

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

const filterBar = document.querySelector('.project-filters');
const filterSlider = filterBar?.querySelector('.filter-slider');
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const filterMenuToggle = filterBar?.querySelector('.filter-menu-toggle');

function updateFilterSlider() {
  const activeFilter = filterButtons.find(button => button.classList.contains('active'));
  if (!filterBar || !activeFilter) return;
  const activeIndex = filterButtons.indexOf(activeFilter);
  filterBar.style.setProperty('--filter-left', `${activeFilter.offsetLeft}px`);
  filterBar.style.setProperty('--filter-width', `${activeFilter.offsetWidth}px`);
  filterBar.style.setProperty('--filter-offset', `${activeIndex * 100}%`);
}

filterMenuToggle?.addEventListener('click', () => {
  const isOpen = filterBar.classList.toggle('is-open');
  filterMenuToggle.setAttribute('aria-expanded', String(isOpen));
  filterMenuToggle.setAttribute('aria-label', isOpen ? 'Close project filters' : 'Open project filters');
  requestAnimationFrame(updateFilterSlider);
});

filterButtons.forEach(button => button.addEventListener('click', () => {
  const previousFilter = filterButtons.find(item => item.classList.contains('active'));
  const previousIndex = filterButtons.indexOf(previousFilter);
  const nextIndex = filterButtons.indexOf(button);
  if (previousIndex === nextIndex) return;

  filterButtons.forEach(item => item.classList.toggle('active', item === button));
  document.querySelectorAll('[data-category]').forEach(card => {
    const filter = button.dataset.filter;
    card.classList.toggle('filtered', filter !== 'all' && !card.dataset.category.includes(filter));
  });
  updateFilterSlider();

  if (!filterSlider) return;
  filterSlider.getAnimations().forEach(animation => animation.cancel());
  const isMobile = matchMedia('(max-width: 600px)').matches;
  const verticalOffset = isMobile ? '' : ', -50%';
  const frames = [
    { transform: `translate(${previousIndex * 100}%${verticalOffset})` },
    { transform: `translate(${nextIndex * 100}%${verticalOffset})` }
  ];
  filterSlider.animate(frames, {
    duration: 650,
    easing: 'cubic-bezier(.22, 1, .36, 1)',
    iterations: 1
  });

}));

document.addEventListener('pointerdown', event => {
  if (!filterBar?.classList.contains('is-open') || filterBar.contains(event.target)) return;
  filterBar.classList.remove('is-open');
  filterMenuToggle?.setAttribute('aria-expanded', 'false');
  filterMenuToggle?.setAttribute('aria-label', 'Open project filters');
});

addEventListener('resize', updateFilterSlider);
requestAnimationFrame(updateFilterSlider);

document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const track = carousel.querySelector('.story-track');
  const slides = [...carousel.querySelectorAll('.story-slide')];
  const footer = carousel.parentElement.querySelector('.carousel-footer');
  const dots = footer.querySelector('.carousel-dots');
  const status = footer.querySelector('.carousel-status');
  let current = 0;

  slides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
    dot.addEventListener('click', () => goTo(index));
    dots.append(dot);
  });

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    [...dots.children].forEach((dot, dotIndex) => {
      dot.classList.toggle('active', dotIndex === current);
      if (dotIndex === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    status.textContent = `${current + 1} / ${slides.length}`;
  }

  carousel.querySelector('.previous').addEventListener('click', () => goTo(current - 1));
  carousel.querySelector('.next').addEventListener('click', () => goTo(current + 1));
  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') goTo(current - 1);
    if (event.key === 'ArrowRight') goTo(current + 1);
  });
  let startX = 0;
  carousel.addEventListener('pointerdown', event => { startX = event.clientX; });
  carousel.addEventListener('pointerup', event => {
    const distance = event.clientX - startX;
    if (Math.abs(distance) > 45) goTo(current + (distance < 0 ? 1 : -1));
  });
  goTo(0);
});

const storyRepoLink = document.getElementById('story-repo-link');
document.querySelectorAll('[data-story-choice]').forEach(choice => {
  choice.addEventListener('click', () => {
    document.querySelectorAll('[data-story-choice]').forEach(item => {
      const active = item === choice;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
    if (!storyRepoLink) return;
    storyRepoLink.href = choice.dataset.repo;
    storyRepoLink.setAttribute('aria-label', `Open ${choice.dataset.storyName} repository on GitHub`);
  });
});

document.getElementById('year').textContent = new Date().getFullYear();
function updateTime(){document.querySelector('.local-time').textContent = new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date())}
updateTime(); setInterval(updateTime, 60000);
