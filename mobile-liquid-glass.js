/* Mobile theme toggle: real backdrop refraction via SVG feDisplacementMap.
   Based on the SDF displacement technique from shuding/liquid-glass.
   The existing theme button, icons and click handler are left in place. */
(() => {
  'use strict';
  const toggle = document.querySelector('.theme-toggle-mobile');
  if (!toggle) return;

  const mq = window.matchMedia('(max-width: 600px), (max-width: 900px) and (max-height: 500px)');
  const id = 'portfolio-mobile-glass-filter';
  const svgNS = 'http://www.w3.org/2000/svg';
  // CSS.supports can accept this syntax even on engines that do not render
  // SVG refs in backdrop-filter. Use native refraction only on Chromium.
  // Safari/iOS and Firefox retain the layered glass fallback from CSS.
  const chromium = /\b(?:Chrome|Chromium|Edg|OPR)\/\d+/.test(navigator.userAgent) &&
    !/CriOS|EdgiOS|FxiOS/.test(navigator.userAgent);
  const supported = chromium && typeof CSS !== 'undefined' &&
    (CSS.supports('backdrop-filter', `url("#${id}") blur(.9px)`) ||
     CSS.supports('-webkit-backdrop-filter', `url("#${id}") blur(.9px)`));
  if (!supported) return;

  const createSVG = (name, attributes = {}) => {
    const element = document.createElementNS(svgNS, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  };
  const svg = createSVG('svg', { width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' });
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
  const defs = createSVG('defs');
  const filter = createSVG('filter', {
    id, filterUnits: 'objectBoundingBox', x: '-30%', y: '-30%',
    width: '160%', height: '160%', colorInterpolationFilters: 'sRGB'
  });
  const map = createSVG('feImage', { result: 'portfolio-glass-map', preserveAspectRatio: 'none' });
  const displacement = createSVG('feDisplacementMap', {
    'in': 'SourceGraphic', in2: 'portfolio-glass-map',
    xChannelSelector: 'R', yChannelSelector: 'G', scale: '13'
  });
  filter.append(map, displacement);
  defs.append(filter);
  svg.append(defs);

  const smoothStep = (a, b, value) => {
    const t = Math.min(1, Math.max(0, (value - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const capsuleSDF = (x, y, halfWidth, halfHeight, radius) => {
    const qx = Math.abs(x) - halfWidth + radius;
    const qy = Math.abs(y) - halfHeight + radius;
    return Math.min(Math.max(qx, qy), 0) +
      Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
  };

  let lastWidth = 0, lastHeight = 0;
  let mounted = false;
  function update() {
    if (!mq.matches) {
      toggle.classList.remove('portfolio-liquid-glass-ready');
      return;
    }
    const box = toggle.getBoundingClientRect();
    const width = Math.round(box.width);
    const height = Math.round(box.height);
    if (!width || !height) return;
    if (width === lastWidth && height === lastHeight && mounted) {
      toggle.classList.add('portfolio-liquid-glass-ready');
      return;
    }

    // One 100 x 44px RG displacement texture; generated only when the
    // capsule size changes, never on scroll/tap or during theme animation.
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const pixels = ctx.createImageData(width, height);
    const halfWidth = width / 2 - .5;
    const halfHeight = height / 2 - .5;
    const radius = halfHeight - .5;
    const scale = 13;
    const strength = 4.6;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = x + .5 - width / 2;
        const py = y + .5 - height / 2;
        const distance = capsuleSDF(px, py, halfWidth, halfHeight, radius);
        const rim = smoothStep(-11, -.7, distance);
        const gx = capsuleSDF(px + 1, py, halfWidth, halfHeight, radius) -
          capsuleSDF(px - 1, py, halfWidth, halfHeight, radius);
        const gy = capsuleSDF(px, py + 1, halfWidth, halfHeight, radius) -
          capsuleSDF(px, py - 1, halfWidth, halfHeight, radius);
        const magnitude = Math.hypot(gx, gy) || 1;
        const index = (y * width + x) * 4;
        pixels.data[index] = Math.round(255 * (.5 + strength * rim * gx / magnitude / scale));
        pixels.data[index + 1] = Math.round(255 * (.5 + strength * rim * gy / magnitude / scale));
        pixels.data[index + 2] = 0;
        pixels.data[index + 3] = 255;
      }
    }
    ctx.putImageData(pixels, 0, 0);
    map.setAttribute('width', String(width));
    map.setAttribute('height', String(height));
    map.setAttribute('href', canvas.toDataURL('image/png'));
    lastWidth = width;
    lastHeight = height;
    if (!mounted) {
      document.body.append(svg);
      mounted = true;
    }
    toggle.classList.add('portfolio-liquid-glass-ready');
  }

  update();
  mq.addEventListener?.('change', update);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(update).observe(toggle);
})();
