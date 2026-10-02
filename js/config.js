// Shared config: defaults, URL param (de)serialisation.
window.RO = window.RO || {};

RO.DEFAULTS = {
  name: 'Matrix',
  tag: 'Fire',
  region: 'ap',
  platform: 'pc',
  key: '',
  bg: '#111418',
  opacity: 100,
  radius: 16,
  border: true,
  borderColor: '#2a3038',
  shadow: false,
  anim: true,
  accent: '#ff4655',
  rankColor: '#ffffff',
  labelColor: '#8b95a1',
  winColor: '#3ddc84',
  lossColor: '#ff5a5f',
  show: 'rank,rr,wl,last,today',
  resetHour: 5,
  refresh: 75,
};

RO.BOOL_KEYS = ['border', 'shadow', 'anim'];
RO.NUM_KEYS = ['opacity', 'radius', 'resetHour', 'refresh'];

RO.fromParams = function (search) {
  const p = new URLSearchParams(search);
  const c = Object.assign({}, RO.DEFAULTS);
  for (const k of Object.keys(RO.DEFAULTS)) {
    if (!p.has(k)) continue;
    const v = p.get(k);
    if (RO.BOOL_KEYS.includes(k)) c[k] = v === '1' || v === 'true';
    else if (RO.NUM_KEYS.includes(k)) {
      const n = Number(v);
      if (!Number.isNaN(n)) c[k] = n;
    } else c[k] = v;
  }
  return c;
};

RO.toParams = function (c) {
  const p = new URLSearchParams();
  for (const k of Object.keys(RO.DEFAULTS)) {
    let v = c[k];
    if (RO.BOOL_KEYS.includes(k)) v = v ? '1' : '0';
    p.set(k, String(v));
  }
  return p.toString();
};
