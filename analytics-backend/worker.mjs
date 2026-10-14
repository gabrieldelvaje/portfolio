const encoder = new TextEncoder();
const TZ = 'America/Sao_Paulo';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function dayAt(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function periodStarts(today) {
  const date = new Date(today + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return { today, week: date.toISOString().slice(0, 10), month: today.slice(0, 7) + '-01' };
}
async function hmac(secret, content) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(content)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function equal(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
async function validToken(token, secret) {
  const [expiry, nonce, signature, extra] = token.split('.');
  if (extra || !/^\d{13}$/.test(expiry || '') || !uuid.test(nonce || '') || !/^[a-f0-9]{64}$/.test(signature || '')) return false;
  const now = Date.now();
  if (+expiry <= now || +expiry > now + 30 * 60 * 1000) return false;
  return equal(signature, await hmac(secret, `admin:${expiry}.${nonce}`));
}
async function body(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new Error('body');
  const text = await request.text();
  if (text.length > 1024) throw new Error('body');
  const value = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('body');
  return value;
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' };
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (origin !== env.ALLOWED_ORIGIN) return reply({ error: 'Forbidden' }, 403);
    headers['Access-Control-Allow-Origin'] = env.ALLOWED_ORIGIN;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!env.DB || !env.ADMIN_PASSWORD || !env.TOKEN_SECRET || !env.VISITOR_SECRET || !env.LOGIN_LIMITER || !env.COLLECT_LIMITER) return reply({ error: 'Not configured' }, 503);
    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    try {
      if (url.pathname === '/login' && request.method === 'POST') {
        const limit = await env.LOGIN_LIMITER.limit({ key: ip });
        if (!limit.success) return reply({ error: 'Rate limited' }, 429);
        const input = await body(request);
        if (typeof input.password !== 'string' || !/^\d{8}$/.test(input.password)) return reply({ error: 'Unauthorized' }, 401);
        const [actual, expected] = await Promise.all([hmac(env.TOKEN_SECRET, 'password:' + input.password), hmac(env.TOKEN_SECRET, 'password:' + env.ADMIN_PASSWORD)]);
        if (!equal(actual, expected)) return reply({ error: 'Unauthorized' }, 401);
        const payload = `${Date.now() + 30 * 60 * 1000}.${crypto.randomUUID()}`;
        return reply({ token: `${payload}.${await hmac(env.TOKEN_SECRET, 'admin:' + payload)}` });
      }
      if (url.pathname === '/collect' && request.method === 'POST') {
        const limit = await env.COLLECT_LIMITER.limit({ key: ip });
        if (!limit.success) return reply({ error: 'Rate limited' }, 429);
        const input = await body(request);
        if (!uuid.test(input.visitor || '') || !uuid.test(input.event || '')) return reply({ error: 'Invalid event' }, 400);
        const visitor = await hmac(env.VISITOR_SECRET, input.visitor.toLowerCase());
        await env.DB.prepare('INSERT OR IGNORE INTO visits (event, visitor, day) VALUES (?, ?, ?)').bind(input.event.toLowerCase(), visitor, dayAt()).run();
        return reply({ ok: true });
      }
      if (url.pathname === '/stats' && request.method === 'GET') {
        if (!await validToken((request.headers.get('Authorization') || '').replace(/^Bearer /, ''), env.TOKEN_SECRET)) return reply({ error: 'Unauthorized' }, 401);
        const days = Number(url.searchParams.get('days') || 30);
        if (![7, 30, 90].includes(days)) return reply({ error: 'Invalid range' }, 400);
        const today = dayAt();
        const starts = periodStarts(today);
        const from = new Date(today + 'T12:00:00Z');
        from.setUTCDate(from.getUTCDate() - days + 1);
        // COUNT(DISTINCT) over each entire period; never sum daily uniques.
        const result = await env.DB.batch([
          ...Object.values(starts).map(start => env.DB.prepare('SELECT COUNT(DISTINCT visitor) AS visitors, COUNT(*) AS views FROM visits WHERE day >= ? AND day <= ?').bind(start, today)),
          env.DB.prepare('SELECT COUNT(DISTINCT visitor) AS visitors, COUNT(*) AS views, MIN(day) AS since FROM visits'),
          env.DB.prepare('SELECT day, COUNT(DISTINCT visitor) AS visitors, COUNT(*) AS views FROM visits WHERE day >= ? AND day <= ? GROUP BY day ORDER BY day').bind(from.toISOString().slice(0, 10), today)
        ]);
        const daily = new Map(result[4].results.map(row => [row.day, row]));
        const series = [];
        for (let i = 0; i < days; i++) {
          const day = from.toISOString().slice(0, 10);
          series.push(daily.get(day) || { day, visitors: 0, views: 0 });
          from.setUTCDate(from.getUTCDate() + 1);
        }
        return reply({ today: result[0].results[0], week: result[1].results[0], month: result[2].results[0], total: result[3].results[0], since: result[3].results[0].since, series });
      }
      return reply({ error: 'Not found' }, 404);
    } catch (error) {
      if (error.message === 'body' || error instanceof SyntaxError) return reply({ error: 'Invalid body' }, 400);
      return reply({ error: 'Service unavailable' }, 503);
    }
  }
};
