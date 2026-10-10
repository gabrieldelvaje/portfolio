/* WebKit/iOS liquid refraction for the mobile portfolio theme capsule.
   Safari cannot use SVG displacement via backdrop-filter, so we mirror only
   the nearby live page section and apply an SVG filter to that copy.
   Chromium keeps its existing native backdrop implementation untouched. */
(() => {
  'use strict';
  const toggle = document.querySelector('body > .theme-toggle-mobile');
  const sourceMain = document.querySelector('body > main');
  if (!toggle || !sourceMain) return;

  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /AppleWebKit/.test(ua) && /Safari/.test(ua) &&
    !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR/.test(ua);
  if (!ios && !safari) return;

  const media = window.matchMedia('(max-width: 600px), (max-width: 900px) and (max-height: 500px)');
  const svgNS = 'http://www.w3.org/2000/svg';
  const node = (tag, attributes = {}) => {
    const el = document.createElementNS(svgNS, tag);
    for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, String(value));
    return el;
  };

  const svg = node('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  const filter = node('filter', {
    id: 'portfolio-safari-refraction-filter', filterUnits: 'objectBoundingBox',
    primitiveUnits: 'userSpaceOnUse', x: '-20%', y: '-20%',
    width: '140%', height: '140%', colorInterpolationFilters: 'sRGB'
  });
  const map = node('feImage', { result: 'glass-map', preserveAspectRatio: 'none' });
  const displacement = node('feDisplacementMap', {
    'in': 'SourceGraphic', in2: 'glass-map', scale: 20,
    xChannelSelector: 'R', yChannelSelector: 'G'
  });
  filter.append(map, displacement);
  const defs = node('defs');
  defs.append(filter);
  svg.append(defs);

  const clip = document.createElement('span');
  clip.className = 'portfolio-glass-mirror-clip';
  clip.setAttribute('aria-hidden', 'true');
  clip.inert = true;
  const scene = document.createElement('div');
  scene.className = 'portfolio-glass-mirror-scene';
  scene.setAttribute('aria-hidden', 'true');
  scene.inert = true;
  clip.append(scene);

  const sdf = (x, y, halfW, halfH, radius) => {
    const qx = Math.abs(x) - halfW + radius;
    const qy = Math.abs(y) - halfH + radius;
    return Math.min(Math.max(qx, qy), 0) +
      Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
  };
  const smoothstep = (a, b, n) => {
    const t = Math.min(1, Math.max(0, (n - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  let mapWidth = 0;
  let mapHeight = 0;
  let activeIds = '';
  let active = false;
  let frame = 0;
  let observer;

  function texture(width, height) {
    if (mapWidth === width && mapHeight === height) return;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(width, height);
    const halfW = width / 2 - .5;
    const halfH = height / 2 - .5;
    const radius = halfH - .5;
    const scale = 20;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = x + .5 - width / 2;
        const py = y + .5 - height / 2;
        const edge = sdf(px, py, halfW, halfH, radius);
        const strength = smoothstep(-10, -.5, edge) * 6.5;
        const gx = sdf(px + 1, py, halfW, halfH, radius) -
                   sdf(px - 1, py, halfW, halfH, radius);
        const gy = sdf(px, py + 1, halfW, halfH, radius) -
                   sdf(px, py - 1, halfW, halfH, radius);
        const magnitude = Math.hypot(gx, gy) || 1;
        const i = (y * width + x) * 4;
        img.data[i] = 255 * (.5 + strength * gx / magnitude / scale);
        img.data[i + 1] = 255 * (.5 + strength * gy / magnitude / scale);
        img.data[i + 2] = 0;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    map.setAttribute('width', width);
    map.setAttribute('height', height);
    map.setAttribute('href', canvas.toDataURL('image/png'));
    mapWidth = width;
    mapHeight = height;
  }

  function nearbyPages(lens) {
    // Clone only visible root sections. A full document mirror would reload
    // hundreds of images, charts, and iframe content on every route change.
    return [...sourceMain.querySelectorAll(':scope > .page')].filter(page => {
      if (page.hidden || getComputedStyle(page).display === 'none') return false;
      const rect = page.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 &&
        rect.top <= lens.bottom + 60 && rect.bottom >= lens.top - 60;
    });
  }

  function safeClone(source) {
    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    for (const el of clone.querySelectorAll('[id]')) el.removeAttribute('id');
    // Never initialize embeds, videos or other expensive active media twice.
    for (const el of clone.querySelectorAll('iframe, video, audio, canvas, object, embed, script')) el.remove();
    for (const el of clone.querySelectorAll('a, button, input, select, textarea, [tabindex]')) {
      el.setAttribute('tabindex', '-1');
      if (el.matches('input, select, textarea')) el.setAttribute('disabled', '');
    }
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    return clone;
  }

  function sync() {
    frame = 0;
    if (!active || !media.matches) return;
    const lens = toggle.getBoundingClientRect();
    const main = sourceMain.getBoundingClientRect();
    const w = Math.round(lens.width), h = Math.round(lens.height);
    if (!w || !h || getComputedStyle(toggle).display === 'none') {
      clip.style.display = 'none';
      return;
    }
    clip.style.display = 'block';
    clip.style.left = lens.left + 'px';
    clip.style.top = lens.top + 'px';
    clip.style.width = w + 'px';
    clip.style.height = h + 'px';

    const sources = nearbyPages(lens);
    const ids = sources.map(el => el.dataset.page).join('|');
    if (ids !== activeIds) {
      activeIds = ids;
      scene.replaceChildren(...sources.map(source => {
        const clone = safeClone(source);
        clone.dataset.glassSource = source.dataset.page || '';
        return clone;
      }));
    }
    texture(w, h);

    // Pixel-align the copied sections to their originals in viewport space.
    scene.style.left = (main.left - lens.left) + 'px';
    scene.style.top = (main.top - lens.top) + 'px';
    scene.style.width = main.width + 'px';
    scene.style.height = main.height + 'px';
    scene.style.background = getComputedStyle(document.body).backgroundColor;
    for (const clone of scene.children) {
      const source = sources.find(el => el.dataset.page === clone.dataset.glassSource);
      if (!source) continue;
      const r = source.getBoundingClientRect();
      clone.style.position = 'absolute';
      clone.style.left = (r.left - main.left) + 'px';
      clone.style.top = (r.top - main.top) + 'px';
      clone.style.width = r.width + 'px';
      clone.style.height = r.height + 'px';
      clone.style.margin = '0';
      clone.style.transform = 'none';
    }
  }

  function schedule() {
    if (!active || frame) return;
    frame = requestAnimationFrame(sync);
  }

  function enable() {
    if (active) return;
    active = true;
    document.body.append(svg, clip);
    toggle.classList.add('portfolio-safari-refraction');
    activeIds = '';
    sync();
    observer = new MutationObserver(records => {
      if (records.some(r => r.target === document.body)) activeIds = '';
      schedule();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    // The light/dark switch changes <html data-theme>, not <body>.
    observer.observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme']
    });
  }

  function disable() {
    if (!active) return;
    active = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    observer?.disconnect();
    clip.remove();
    svg.remove();
    toggle.classList.remove('portfolio-safari-refraction');
    scene.replaceChildren();
    activeIds = '';
  }

  function refresh() { if (media.matches) enable(); else disable(); }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('hashchange', () => { activeIds = ''; schedule(); });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('scroll', schedule, { passive: true });
  media.addEventListener?.('change', refresh);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(schedule).observe(toggle);
  refresh();
})();
