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

const projectInfoDialog = document.querySelector('#project-info-dialog');
const projectInfoTitle = document.querySelector('#project-info-title');
const projectInfoDescription = document.querySelector('#project-info-description');

document.querySelectorAll('[data-project-info]').forEach(button => {
  button.addEventListener('click', () => {
    if (!projectInfoDialog) return;
    projectInfoTitle.textContent = button.dataset.infoTitle || '';
    projectInfoDescription.textContent = button.dataset.infoDescription || '';
    projectInfoDialog.showModal();
  });
});

projectInfoDialog?.querySelector('.project-info-close')?.addEventListener('click', () => projectInfoDialog.close());
projectInfoDialog?.addEventListener('click', event => {
  if (event.target === projectInfoDialog) projectInfoDialog.close();
});

document.querySelectorAll('.sugar-cane-preview').forEach(preview => {
  const userMessage = preview.querySelector('.chat-user-message');
  const newUserMessage = preview.querySelector('.chat-new-user-message');
  const aiMessage = preview.querySelector('.chat-ai-message');
  const typing = preview.querySelector('.chat-typing');
  const typingDots = [...preview.querySelectorAll('.chat-typing b')];
  const animatedParts = [userMessage, newUserMessage, aiMessage, typing, ...typingDots].filter(Boolean);
  let playing = false;

  function playChatSequence() {
    if (playing) return;
    playing = true;
    animatedParts.forEach(part => part.getAnimations().forEach(animation => animation.cancel()));

    const FLOW_DURATION = 3200;
    const MOTION_EASING = 'cubic-bezier(.22, 1, .36, 1)';
    const animationOptions = { duration: FLOW_DURATION, easing: 'linear', iterations: 1, fill: 'forwards' };
    const sequenceAnimations = [];

    sequenceAnimations.push(userMessage.animate([
      { opacity: 1, transform: 'translateY(0)', offset: 0 },
      { opacity: 1, transform: 'translateY(0)', offset: .04, easing: MOTION_EASING },
      { opacity: 0, transform: 'translateY(-48px)', offset: .19 },
      { opacity: 0, transform: 'translateY(-48px)', offset: 1 }
    ], animationOptions));

    sequenceAnimations.push(newUserMessage.animate([
      { opacity: 0, transform: 'translate(12px, 8px)', offset: 0 },
      { opacity: 0, transform: 'translate(12px, 8px)', offset: .04, easing: MOTION_EASING },
      { opacity: 1, transform: 'translate(0, -48px)', offset: .19 },
      { opacity: 1, transform: 'translate(0, -48px)', offset: .24, easing: MOTION_EASING },
      { opacity: 1, transform: 'translate(0, -96px)', offset: .38 },
      { opacity: 1, transform: 'translateY(-96px)', offset: 1 }
    ], animationOptions));

    sequenceAnimations.push(typing.animate([
      { opacity: 0, transform: 'translate(-10px, 10px)', offset: 0 },
      { opacity: 0, transform: 'translate(-10px, 10px)', offset: .25, easing: MOTION_EASING },
      { opacity: 1, transform: 'translate(0, -53px)', offset: .39 },
      { opacity: 1, transform: 'translate(0, -53px)', offset: .57, easing: 'ease-in-out' },
      { opacity: 0, transform: 'translate(0, -57px)', offset: .63 },
      { opacity: 0, transform: 'translate(0, -57px)', offset: 1 }
    ], animationOptions));

    typingDots.forEach((dot, index) => sequenceAnimations.push(dot.animate([
      { transform: 'translateY(0) scale(1)', opacity: .38, offset: 0 },
      { transform: 'translateY(-4px) scale(1.08)', opacity: 1, offset: .4 },
      { transform: 'translateY(0) scale(1)', opacity: .38, offset: .8 },
      { transform: 'translateY(0) scale(1)', opacity: .38, offset: 1 }
    ], {
      duration: 260,
      delay: 1160 + (index * 70),
      easing: 'ease-in-out',
      iterations: 2,
      fill: 'both'
    })));

    sequenceAnimations.push(aiMessage.animate([
      { opacity: 1, transform: 'translateY(0)', offset: 0 },
      { opacity: 1, transform: 'translateY(0)', offset: .04, easing: MOTION_EASING },
      { opacity: 1, transform: 'translateY(-48px)', offset: .19 },
      { opacity: 1, transform: 'translateY(-48px)', offset: .24, easing: MOTION_EASING },
      { opacity: 0, transform: 'translateY(-96px)', offset: .38 },
      { opacity: 0, transform: 'translate(-12px, 10px)', offset: .39 },
      { opacity: 0, transform: 'translate(-12px, 10px)', offset: .58, easing: MOTION_EASING },
      { opacity: 1, transform: 'translateY(0)', offset: .72 },
      { opacity: 1, transform: 'translateY(0)', offset: 1 }
    ], animationOptions));

    Promise.all(sequenceAnimations.map(animation => animation.finished.catch(() => {})))
      .then(() => { playing = false; });
  }

  preview.addEventListener('pointerenter', playChatSequence);
  preview.addEventListener('focusin', playChatSequence);
});

document.querySelectorAll('.revenue-growth-preview').forEach(preview => {
  const bars = [...preview.querySelectorAll('.revenue-bars i')];
  const patterns = [
    [43, 53, 65, 76, 86, 96],
    [0, 0, 42, 68, 82, 52],
    [28, 62, 38, 88, 56, 74]
  ];
  let playing = false;

  function playRevenueBars() {
    if (playing) return;
    playing = true;
    const animations = bars.map((bar, index) => {
      bar.getAnimations().forEach(animation => animation.cancel());
      const sequence = [
        [patterns[0], 0],
        [patterns[1], .32], [patterns[1], .335],
        [patterns[2], .66], [patterns[2], .675],
        [patterns[0], 1]
      ];
      return bar.animate(sequence.map(([pattern, offset]) => ({
        height: `${pattern[index]}%`,
        opacity: pattern[index] === 0 ? 0 : 1,
        offset,
        easing: 'cubic-bezier(.22, 1, .36, 1)'
      })), {
        duration: 2100,
        easing: 'linear',
        iterations: 1,
        fill: 'forwards'
      });
    });

    Promise.all(animations.map(animation => animation.finished.catch(() => {})))
      .then(() => { playing = false; });
  }

  preview.addEventListener('pointerenter', playRevenueBars);
  preview.addEventListener('focusin', playRevenueBars);
});

document.querySelectorAll('.piracicaba-preview').forEach(preview => {
  const cards = [...preview.querySelectorAll('.deck-map i')];
  const pageDots = [...preview.querySelectorAll('.deck-pagination i')];
  let playing = false;

  const slots = [
    { left: '0%', top: '15%', width: '25%', height: '70%', background: 'color-mix(in srgb, var(--ink) 16%, var(--bg))', borderColor: 'color-mix(in srgb, var(--ink) 12%, var(--bg))', opacity: 1 },
    { left: '31%', top: '4%', width: '38%', height: '92%', background: 'var(--blue)', borderColor: 'var(--blue)', opacity: 1 },
    { left: '75%', top: '15%', width: '25%', height: '70%', background: 'color-mix(in srgb, var(--ink) 16%, var(--bg))', borderColor: 'color-mix(in srgb, var(--ink) 12%, var(--bg))', opacity: 1 }
  ];
  const dotSlots = [
    { left: '0px', top: '1px', width: '7px', height: '7px', background: 'color-mix(in srgb, var(--ink) 24%, var(--bg))', borderRadius: '50%', opacity: 1 },
    { left: '13px', top: '0px', width: '19px', height: '8px', background: 'var(--blue)', borderRadius: '999px', opacity: 1 },
    { left: '38px', top: '1px', width: '7px', height: '7px', background: 'color-mix(in srgb, var(--ink) 24%, var(--bg))', borderRadius: '50%', opacity: 1 }
  ];

  function applySlot(card, slot) {
    Object.assign(card.style, slot);
  }

  async function shiftCards(step) {
    const animations = cards.map((card, index) => {
      const from = (index - step + 3) % 3;
      const to = (from + 2) % 3;
      const keyframes = from === 0
        ? [slots[0], { ...slots[0], left: '-30%', opacity: 0, offset: .72 }, { ...slots[2], left: '105%', opacity: 0, offset: .73 }, slots[2]]
        : [slots[from], slots[to]];
      return card.animate(keyframes, { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' });
    });
    const dotAnimations = pageDots.map((dot, index) => {
      const from = (index - step + 3) % 3;
      const to = (from + 2) % 3;
      const keyframes = from === 0
        ? [dotSlots[0], { ...dotSlots[0], left: '-9px', opacity: 0, offset: .72 }, { ...dotSlots[2], left: '47px', opacity: 0, offset: .73 }, dotSlots[2]]
        : [dotSlots[from], dotSlots[to]];
      return dot.animate(keyframes, { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' });
    });
    await Promise.all([...animations, ...dotAnimations].map(animation => animation.finished.catch(() => {})));
    cards.forEach((card, index) => applySlot(card, slots[(index - step - 1 + 3) % 3]));
    pageDots.forEach((dot, index) => applySlot(dot, dotSlots[(index - step - 1 + 3) % 3]));
    animations.forEach(animation => animation.cancel());
    dotAnimations.forEach(animation => animation.cancel());
  }

  async function playPiracicabaCarousel() {
    if (playing) return;
    playing = true;
    for (let step = 0; step < 3; step += 1) {
      await shiftCards(step);
      await new Promise(resolve => setTimeout(resolve, 120));
    }
    cards.forEach((card, index) => applySlot(card, slots[index]));
    pageDots.forEach((dot, index) => applySlot(dot, dotSlots[index]));
    playing = false;
  }

  preview.addEventListener('pointerenter', playPiracicabaCarousel);
  preview.addEventListener('focusin', playPiracicabaCarousel);
});

document.querySelectorAll('.music-farming-preview').forEach(preview => {
  const tabs = [...preview.querySelectorAll('.music-dashboard-tabs i')];
  const chart = preview.querySelector('.music-chart');
  const raceLines = [...preview.querySelectorAll('.music-line-chart path')];
  let playing = false;

  const wait = duration => new Promise(resolve => setTimeout(resolve, duration));

  function resetMusicRace() {
    raceLines.forEach(line => {
      line.setAttribute('stroke-dasharray', '1');
      line.setAttribute('stroke-dashoffset', '1');
    });
  }

  async function drawMusicRace() {
    const duration = 900;
    await new Promise(resolve => {
      const startedAt = performance.now();
      function drawFrame(now) {
        const progress = Math.min((now - startedAt) / duration, 1);
        raceLines.forEach(line => {
          line.setAttribute('stroke-dashoffset', String(1 - progress));
        });
        if (progress < 1) requestAnimationFrame(drawFrame);
        else resolve();
      }
      requestAnimationFrame(drawFrame);
    });
  }

  async function selectMusicTab(index, showLine) {
    tabs[index].classList.add('tab-click');
    await wait(130);
    tabs.forEach((tab, tabIndex) => tab.classList.toggle('is-active', tabIndex === index));
    chart.classList.toggle('show-line', showLine);
    await wait(180);
    tabs[index].classList.remove('tab-click');
  }

  async function playMusicTabs() {
    if (playing) return;
    playing = true;
    resetMusicRace();
    await wait(180);
    await selectMusicTab(2, true);
    await wait(70);
    await drawMusicRace();
    await wait(160);
    await selectMusicTab(1, false);
    await wait(350);
    resetMusicRace();
    playing = false;
  }

  preview.addEventListener('pointerenter', playMusicTabs);
  preview.addEventListener('focusin', playMusicTabs);
  resetMusicRace();
});

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

  const dotSlider = document.createElement('span');
  dotSlider.className = 'carousel-dot-slider';
  dotSlider.setAttribute('aria-hidden', 'true');
  dots.prepend(dotSlider);
  const dotButtons = [...dots.querySelectorAll('button')];

  function dotSliderOffset(index) {
    const dot = dotButtons[index];
    return dot ? dot.offsetLeft + (dot.offsetWidth / 2) - (dotSlider.offsetWidth / 2) : 0;
  }

  function goTo(index) {
    const previous = current;
    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotButtons.forEach((dot, dotIndex) => {
      dot.classList.toggle('active', dotIndex === current);
      if (dotIndex === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });

    const from = dotSliderOffset(previous);
    const to = dotSliderOffset(current);
    dotSlider.getAnimations().forEach(animation => animation.cancel());
    if (previous !== current) {
      const sliderAnimation = dotSlider.animate([
        { transform: `translateX(${from}px)` },
        { transform: `translateX(${to}px)` }
      ], {
        duration: 650,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        iterations: 1,
        fill: 'forwards'
      });
      sliderAnimation.addEventListener('finish', () => {
        dotSlider.style.transform = `translateX(${to}px)`;
        sliderAnimation.cancel();
      }, { once: true });
    } else {
      dotSlider.style.transform = `translateX(${to}px)`;
    }
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
