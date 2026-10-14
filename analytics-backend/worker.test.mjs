import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { dayAt, periodStarts } from './worker.mjs';
const origin = 'https://gabrieldelvaje.github.io';
function environment() {
  return { ALLOWED_ORIGIN: origin, ADMIN_PASSWORD: '12345678', TOKEN_SECRET: 'a'.repeat(64), VISITOR_SECRET: 'b'.repeat(64), DB: {}, LOGIN_LIMITER: { limit: async () => ({ success: true }) }, COLLECT_LIMITER: { limit: async () => ({ success: true }) } };
}
const request = (path, method = 'GET', value, headers = {}) => new Request('https://analytics.example' + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, ...(value === undefined ? {} : { body: JSON.stringify(value) }) });
test('Brasilia midnight and Monday/calendar-month boundaries', () => {
  assert.equal(dayAt(new Date('2026-10-14T02:59:59Z')), '2026-10-13');
  assert.equal(dayAt(new Date('2026-10-14T03:00:00Z')), '2026-10-14');
  assert.deepEqual(periodStarts('2026-10-14'), { today: '2026-10-14', week: '2026-10-12', month: '2026-10-01' });
  assert.equal(periodStarts('2026-01-01').week, '2025-12-29');
});
test('reject unauthenticated and forged statistics requests', async () => {
  const env = environment();
  assert.equal((await worker.fetch(request('/stats'), env)).status, 401);
  assert.equal((await worker.fetch(request('/stats', 'GET', undefined, { Authorization: 'Bearer forged' }), env)).status, 401);
  assert.equal((await worker.fetch(request('/stats', 'GET', undefined, { Origin: 'https://other.example' }), env)).status, 403);
});
test('password checked on server; credentials are not returned', async () => {
  const env = environment();
  assert.equal((await worker.fetch(request('/login', 'POST', { password: '87654321' }), env)).status, 401);
  const result = await worker.fetch(request('/login', 'POST', { password: env.ADMIN_PASSWORD }), env);
  assert.equal(result.status, 200);
  const text = await result.text();
  assert.equal(text.includes(env.ADMIN_PASSWORD), false);
  assert.equal(JSON.parse(text).token.split('.').length, 3);
});
test('rate limit login before credential verification', async () => {
  const env = environment();
  env.LOGIN_LIMITER.limit = async () => ({ success: false });
  assert.equal((await worker.fetch(request('/login', 'POST', { password: env.ADMIN_PASSWORD }), env)).status, 429);
});
test('authenticated stats zero fill and reject expiry/tampering', async () => {
  const env = environment();
  env.DB.prepare = () => ({ bind() { return this; } });
  env.DB.batch = async () => [
    { results: [{ visitors: 1, views: 2 }] }, { results: [{ visitors: 1, views: 3 }] },
    { results: [{ visitors: 2, views: 4 }] }, { results: [{ visitors: 2, views: 4, since: '2026-10-01' }] },
    { results: [{ day: dayAt(), visitors: 1, views: 2 }] }
  ];
  const login = await worker.fetch(request('/login', 'POST', { password: env.ADMIN_PASSWORD }), env);
  const { token } = await login.json();
  const response = await worker.fetch(request('/stats?days=7', 'GET', undefined, { Authorization: `Bearer ${token}` }), env);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.series.length, 7);
  assert.equal(data.series[0].visitors, 0);
  assert.equal(data.series[6].views, 2);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await worker.fetch(request('/stats?days=999', 'GET', undefined, { Authorization: `Bearer ${token}` }), env)).status, 400);
  const now = Date.now;
  try {
    Date.now = () => now() + 31 * 60 * 1000;
    assert.equal((await worker.fetch(request('/stats', 'GET', undefined, { Authorization: `Bearer ${token}` }), env)).status, 401);
  } finally { Date.now = now; }
});
test('collection hashes visitor IDs and ignores invalid identifiers', async () => {
  const env = environment();
  let args;
  env.DB.prepare = sql => ({ bind(...values) { args = { sql, values }; return this; }, run: async () => ({ success: true }) });
  const visitor = crypto.randomUUID();
  const event = crypto.randomUUID();
  assert.equal((await worker.fetch(request('/collect', 'POST', { visitor, event }), env)).status, 200);
  assert.match(args.sql, /INSERT OR IGNORE/);
  assert.equal(args.values[0], event);
  assert.notEqual(args.values[1], visitor);
  assert.match(args.values[1], /^[a-f0-9]{64}$/);
  assert.equal((await worker.fetch(request('/collect', 'POST', { visitor: 'bad', event }), env)).status, 400);
});
