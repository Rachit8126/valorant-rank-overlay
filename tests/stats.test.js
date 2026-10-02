// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

global.window = global;
for (const f of ['config', 'api', 'stats']) {
  eval(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'));
}

const at = (y, m, d, h, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();

test('dayStart: after reset hour uses today', () => {
  assert.strictEqual(RO.dayStart(5, at(2026, 10, 2, 9)), at(2026, 10, 2, 5));
});
test('dayStart: before reset hour uses yesterday', () => {
  assert.strictEqual(RO.dayStart(5, at(2026, 10, 2, 3)), at(2026, 10, 1, 5));
});
test('dayStart: exactly at reset hour is new day', () => {
  assert.strictEqual(RO.dayStart(5, at(2026, 10, 2, 5)), at(2026, 10, 2, 5));
});
test('dayStart: crosses month boundary', () => {
  assert.strictEqual(RO.dayStart(5, at(2026, 11, 1, 2)), at(2026, 10, 31, 5));
});

function withNow(ts, fn) {
  const R = Date.now; Date.now = () => ts;
  try { return fn(); } finally { Date.now = R; }
}

test('computeStats: W/L, today RR, last RR', () => {
  const now = at(2026, 10, 2, 14);
  const h = [
    { date: at(2026, 10, 2, 13), change: -12 },
    { date: at(2026, 10, 2, 12), change: 20 },
    { date: at(2026, 10, 2, 8), change: 15 },
    { date: at(2026, 10, 2, 4), change: -30 }, // before reset, ignored
  ];
  const s = withNow(now, () => RO.computeStats(h, 5));
  assert.deepStrictEqual(s, { wins: 2, losses: 1, todayRR: 23, lastRR: -12 });
});
test('computeStats: no games today keeps lastRR', () => {
  const s = withNow(at(2026, 10, 2, 14), () => RO.computeStats([{ date: at(2026, 10, 1, 22), change: -9 }], 5));
  assert.deepStrictEqual(s, { wins: 0, losses: 0, todayRR: 0, lastRR: -9 });
});
test('computeStats: empty history', () => {
  const s = RO.computeStats([], 5);
  assert.deepStrictEqual(s, { wins: 0, losses: 0, todayRR: 0, lastRR: null });
});

test('config: round-trips through URL params', () => {
  const c = Object.assign({}, RO.DEFAULTS, { name: 'A B', tag: 'x#y', anim: false, opacity: 40, border: false });
  const back = RO.fromParams('?' + RO.toParams(c));
  assert.deepStrictEqual(back, c);
});
test('config: bad numbers fall back to defaults', () => {
  assert.strictEqual(RO.fromParams('?opacity=abc').opacity, RO.DEFAULTS.opacity);
});

function mockFetch(handler) {
  global.fetch = async (url, opts) => handler(url, opts);
}
const resp = (status, body, headers = {}) => ({
  ok: status < 400, status, json: async () => body, headers: { get: (k) => headers[k.toLowerCase()] ?? null },
});

test('api: fetchMmr parses current rank and encodes the player path', async () => {
  let seen;
  mockFetch((url, opts) => { seen = { url, opts }; return resp(200, { data: { current: { tier: { id: 17, name: 'Platinum 3' }, rr: 21, last_change: -12 } } }); });
  const m = await RO.fetchMmr({ region: 'ap', platform: 'pc', name: 'A B', tag: 'x#y', key: 'K' });
  assert.deepStrictEqual(m, { tierId: 17, tierName: 'Platinum 3', rr: 21, lastChange: -12 });
  assert.match(seen.url, /\/v3\/mmr\/ap\/pc\/A%20B\/x%23y$/);
  assert.strictEqual(seen.opts.headers.Authorization, 'K');
});
test('api: fetchHistory parses, filters and sorts newest first', async () => {
  mockFetch(() => resp(200, { data: { history: [
    { date: '2026-10-01T10:00:00Z', last_change: 10, match_id: 'a' },
    { date: '2026-10-01T12:00:00Z', last_change: -5, match_id: 'b' },
    { date: 'bad', last_change: 3 },
  ] } }));
  const h = await RO.fetchHistory({ region: 'ap', platform: 'pc', name: 'a', tag: 'b', key: 'K' });
  assert.deepStrictEqual(h.map((x) => x.matchId), ['b', 'a']);
});
test('api: error mapping', async () => {
  const cfg = { region: 'ap', platform: 'pc', name: 'a', tag: 'b', key: 'K' };
  for (const [status, msg] of [[401, 'Invalid API key'], [404, 'Player not found'], [429, 'Rate limited'], [500, 'API error 500']]) {
    mockFetch(() => resp(status, {}, { 'retry-after': '7' }));
    await assert.rejects(RO.fetchMmr(cfg), (e) => e.message === msg && e.status === status);
  }
  mockFetch(() => { throw new Error('offline'); });
  await assert.rejects(RO.fetchMmr(cfg), /Network error/);
});
test('api: unranked player (no current tier) is an error', async () => {
  mockFetch(() => resp(200, { data: { current: {} } }));
  await assert.rejects(RO.fetchMmr({ region: 'ap', platform: 'pc', name: 'a', tag: 'b', key: 'K' }), /No rank data/);
});
