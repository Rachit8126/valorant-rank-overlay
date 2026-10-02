// Renders the overlay card, including RR / rank-change animations.
window.RO = window.RO || {};

RO.animEnabled = true;

RO.applyStyle = function (c) {
  const s = document.documentElement.style;
  s.setProperty('--bg', c.bg);
  s.setProperty('--bg-opacity', String(Math.max(0, Math.min(100, c.opacity)) / 100));
  s.setProperty('--radius', c.radius + 'px');
  s.setProperty('--border', c.border ? '1px solid ' + c.borderColor : '1px solid transparent');
  s.setProperty('--shadow', c.shadow ? '0 8px 24px rgba(0,0,0,.45)' : 'none');
  s.setProperty('--accent', c.accent);
  s.setProperty('--rank', c.rankColor);
  s.setProperty('--label', c.labelColor);
  s.setProperty('--win', c.winColor);
  s.setProperty('--loss', c.lossColor);
  RO.animEnabled = c.anim !== false;
};

RO.applyVisibility = function (c) {
  const show = c.show.split(',');
  document.querySelectorAll('[data-item]').forEach((el) => {
    el.classList.toggle('hidden', !show.includes(el.dataset.item));
  });
};

RO.signed = (n) => (n > 0 ? '+' : '') + n;
RO.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (id) => document.getElementById(id);

// Restart a CSS animation class on an element.
RO.play = function (el, cls, ms) {
  if (!RO.animEnabled) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  if (ms) setTimeout(() => el.classList.remove(cls), ms);
};

RO.setSigned = function (el, n) {
  if (n === null || n === undefined) { el.textContent = '–'; el.className = 'v zero'; return; }
  const prev = el.textContent;
  el.textContent = RO.signed(n);
  el.className = 'v ' + (n > 0 ? 'pos' : n < 0 ? 'neg' : 'zero');
  if (prev !== el.textContent && prev !== '–' && prev !== '') RO.play(el, 'flash', 900);
};

// Floating "+15" / "-12" next to the RR value.
RO.popup = function (delta) {
  if (!RO.animEnabled || !delta) return;
  const p = $('popup');
  p.textContent = RO.signed(delta);
  p.className = 'popup ' + (delta > 0 ? 'pos' : 'neg');
  void p.offsetWidth;
  p.classList.add('go');
};

RO.setBar = function (pct, instant) {
  const bar = $('rr-bar');
  if (instant) bar.style.transition = 'none';
  bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
  if (instant) { void bar.offsetWidth; bar.style.transition = ''; }
};

RO.countTo = async function (from, to, ms) {
  const el = $('rr-num');
  if (!RO.animEnabled || from === to) { el.textContent = to; return; }
  const t0 = performance.now();
  await new Promise((resolve) => {
    (function step(t) {
      const k = Math.min(1, (t - t0) / ms);
      el.textContent = Math.round(from + (to - from) * k);
      k < 1 ? requestAnimationFrame(step) : resolve();
    })(t0);
  });
  el.textContent = to;
};

RO.setRank = async function (mmr) {
  $('rank-name').textContent = mmr.tierName;
  const icon = await RO.tierIcon(mmr.tierId);
  if (icon) $('rank-icon').src = icon;
};

RO.state = { tierId: null, rr: null };

// Core: transitions the card from the previous state to `mmr`. Calls are queued.
RO._queue = Promise.resolve();
RO.render = function (mmr, stats) {
  RO._queue = RO._queue.then(() => RO._render(mmr, stats)).catch(() => {});
  return RO._queue;
};

RO._render = async function (mmr, stats) {
  const st = RO.state;
  const card = $('card');
  const first = st.tierId === null;

  $('wins').textContent = stats.wins;
  $('losses').textContent = stats.losses;
  RO.setSigned($('last-rr'), stats.lastRR);
  RO.setSigned($('today-rr'), stats.todayRR);

  if (first || !RO.animEnabled) {
    await RO.setRank(mmr);
    $('rr-num').textContent = mmr.rr;
    RO.setBar(mmr.rr, first);
  } else if (mmr.tierId === st.tierId) {
    const delta = mmr.rr - st.rr;
    if (delta !== 0) {
      RO.popup(delta);
      RO.play($('rr-bar'), delta > 0 ? 'bar-gain' : 'bar-loss', 1000);
      RO.setBar(mmr.rr);
      await RO.countTo(st.rr, mmr.rr, 800);
    }
  } else if (mmr.tierId > st.tierId) {
    // Rank up: fill bar, swap icon with glow, restart bar at new RR.
    RO.popup(mmr.lastChange || 0);
    RO.setBar(100);
    await RO.countTo(st.rr, 100, 600);
    card.classList.add('rankup');
    await RO.sleep(250);
    await RO.setRank(mmr);
    RO.play($('rank-icon'), 'icon-up', 1600);
    RO.play($('rank-name'), 'name-up', 1600);
    RO.setBar(0, true);
    $('rr-num').textContent = 0;
    await RO.sleep(400);
    RO.setBar(mmr.rr);
    await RO.countTo(0, mmr.rr, 700);
    await RO.sleep(700);
    card.classList.remove('rankup');
  } else {
    // Derank: drain bar, drop icon in red, restart bar from the top.
    RO.popup(mmr.lastChange || 0);
    RO.setBar(0);
    await RO.countTo(st.rr, 0, 600);
    card.classList.add('derank');
    await RO.sleep(250);
    await RO.setRank(mmr);
    RO.play($('rank-icon'), 'icon-down', 1600);
    RO.play($('rank-name'), 'name-down', 1600);
    RO.setBar(100, true);
    $('rr-num').textContent = 100;
    await RO.sleep(400);
    RO.setBar(mmr.rr);
    await RO.countTo(100, mmr.rr, 700);
    await RO.sleep(700);
    card.classList.remove('derank');
  }

  st.tierId = mmr.tierId;
  st.rr = mmr.rr;
};

RO.setStatus = function (msg) {
  $('status').textContent = msg || '';
};
