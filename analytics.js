(() => {
  'use strict';
  const dialog = document.getElementById('analytics-dialog');
  const trigger = document.getElementById('year');
  if (!dialog || !trigger) return;
  const endpoint = (window.PORTFOLIO_ANALYTICS_URL || '').replace(/\/$/, '');
  const form = dialog.querySelector('form');
  const password = dialog.querySelector('[name="password"]');
  const dashboard = dialog.querySelector('[data-analytics-dashboard]');
  const status = dialog.querySelector('[data-analytics-status]');
  const period = dialog.querySelector('[data-analytics-period]');
  const exclude = dialog.querySelector('[data-analytics-exclude]');
  const loginButton = form.querySelector('button');
  let token = '';
  let generation = 0;
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} }
  };
  const number = value => new Intl.NumberFormat('pt-BR').format(value);
  exclude.checked = storage.get('portfolio-analytics-exclude') === '1';
  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(endpoint + path, { ...options, headers, cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Senha incorreta ou acesso expirado.');
      if (response.status === 429) throw new Error('Muitas tentativas. Aguarde um minuto.');
      throw new Error('Não foi possível consultar as estatísticas. Tente novamente.');
    }
    return response.json();
  }
  function lock() {
    generation++;
    token = '';
    form.hidden = false;
    dashboard.hidden = true;
    password.value = '';
    dialog.querySelectorAll('[data-analytics-kpi]').forEach(el => el.textContent = '—');
    dialog.querySelector('[data-analytics-chart]').replaceChildren();
  }
  function chart(series) {
    const svg = dialog.querySelector('[data-analytics-chart]');
    svg.replaceChildren();
    const make = (name, attributes, content) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', name);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
      if (content !== undefined) node.textContent = content;
      svg.append(node);
      return node;
    };
    const max = Math.max(1, ...series.map(row => row.visitors));
    for (let i = 0; i <= 2; i++) {
      const y = 20 + i * 80;
      make('line', { x1: 40, x2: 640, y1: y, y2: y, stroke: 'currentColor', opacity: '.12' });
      make('text', { x: 32, y: y + 4, 'text-anchor': 'end' }, number(Math.round(max * (1 - i / 2))));
    }
    const step = 600 / Math.max(1, series.length);
    series.forEach((row, i) => {
      const height = row.visitors / max * 160;
      const bar = make('rect', { x: 40 + i * step + step * .15, y: 180 - height, width: step * .7, height, rx: 3, fill: '#0736fe' });
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${row.day}: ${number(row.visitors)} visitantes únicos · ${number(row.views)} visitas`;
      bar.append(title);
    });
    for (const i of [...new Set([0, Math.floor((series.length - 1) / 2), series.length - 1])]) {
      if (!series[i]) continue;
      make('text', { x: 40 + (i + .5) * step, y: 205, 'text-anchor': 'middle' }, series[i].day.slice(5).split('-').reverse().join('/'));
    }
    svg.setAttribute('aria-label', `Visitantes únicos por dia nos últimos ${series.length} dias. ${series.map(row => `${row.day}: ${row.visitors}`).join('; ')}`);
  }
  async function refresh() {
    const current = ++generation;
    status.textContent = 'Carregando estatísticas…';
    try {
      const data = await api(`/stats?days=${period.value}`);
      if (current !== generation || !dialog.open) return;
      for (const key of ['today', 'week', 'month', 'total']) {
        dialog.querySelector(`[data-analytics-kpi="${key}"]`).textContent = number(data[key].visitors);
        dialog.querySelector(`[data-analytics-views="${key}"]`).textContent = `${number(data[key].views)} visitas`;
      }
      chart(data.series);
      dialog.querySelector('[data-analytics-since]').textContent = data.since ? `Coleta desde ${data.since.split('-').reverse().join('/')}.` : 'Ainda não há visitas registradas.';
      status.textContent = 'Atualizado agora · horário de Brasília';
    } catch (error) {
      if (current !== generation || !dialog.open) return;
      if (error.message.includes('expirado')) lock();
      status.textContent = error.message;
    }
  }
  trigger.addEventListener('click', () => {
    dialog.showModal();
    status.textContent = endpoint ? '' : 'A coleta ainda não foi ativada. Falta conectar o serviço de estatísticas.';
    loginButton.disabled = !endpoint;
    password.focus();
  });
  dialog.querySelector('[data-analytics-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => { lock(); trigger.focus(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!endpoint) return;
    const current = ++generation;
    loginButton.disabled = true;
    status.textContent = 'Verificando acesso…';
    try {
      const data = await api('/login', { method: 'POST', body: JSON.stringify({ password: password.value }) });
      if (current !== generation || !dialog.open) return;
      token = data.token;
      password.value = '';
      form.hidden = true;
      dashboard.hidden = false;
      await refresh();
    } catch (error) { if (current === generation && dialog.open) status.textContent = error.message; }
    finally { loginButton.disabled = !endpoint; }
  });
  period.addEventListener('change', refresh);
  dialog.querySelector('[data-analytics-refresh]').addEventListener('click', refresh);
  dialog.querySelector('[data-analytics-logout]').addEventListener('click', () => { lock(); status.textContent = ''; password.focus(); });
  exclude.addEventListener('change', () => storage.set('portfolio-analytics-exclude', exclude.checked ? '1' : '0'));
  // One page load = one visit. Unique visitors use an anonymous browser ID.
  // Navigation between in-page sections does not inflate visits.
  if (!endpoint || exclude.checked || navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;
  const visitor = storage.get('portfolio-analytics-visitor') || crypto.randomUUID();
  storage.set('portfolio-analytics-visitor', visitor);
  const body = JSON.stringify({ visitor, event: crypto.randomUUID() });
  fetch(endpoint + '/collect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
})();
