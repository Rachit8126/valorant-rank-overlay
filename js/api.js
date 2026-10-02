// HenrikDev + valorant-api.com calls.
window.RO = window.RO || {};

RO.API_BASE = 'https://api.henrikdev.xyz';

RO.ApiError = class extends Error {
  constructor(message, status, retryAfter) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
};

RO.hget = async function (path, key) {
  let res;
  try {
    res = await fetch(RO.API_BASE + path, { headers: { Authorization: key, Accept: 'application/json' } });
  } catch (e) {
    throw new RO.ApiError('Network error', 0);
  }
  if (!res.ok) {
    const retry = Number(res.headers.get('retry-after')) || 0;
    const msg =
      res.status === 401 || res.status === 403 ? 'Invalid API key' :
      res.status === 404 ? 'Player not found' :
      res.status === 429 ? 'Rate limited' : 'API error ' + res.status;
    throw new RO.ApiError(msg, res.status, retry);
  }
  return res.json();
};

RO.playerPath = function (c) {
  return [c.region, c.platform, encodeURIComponent(c.name), encodeURIComponent(c.tag)].join('/');
};

RO.fetchMmr = async function (c) {
  const j = await RO.hget('/valorant/v3/mmr/' + RO.playerPath(c), c.key);
  const cur = j.data && j.data.current;
  if (!cur || !cur.tier) throw new RO.ApiError('No rank data', 404);
  return {
    tierId: cur.tier.id,
    tierName: cur.tier.name,
    rr: cur.rr,
    lastChange: cur.last_change,
  };
};

// Returns array of {date: ms, change: number, matchId}
RO.fetchHistory = async function (c) {
  const j = await RO.hget('/valorant/v2/mmr-history/' + RO.playerPath(c), c.key);
  const d = j.data;
  const list = Array.isArray(d) ? d : (d && (d.history || d.matches)) || [];
  return list
    .map((h) => ({
      date: Date.parse(h.date || h.date_raw_iso || '') || (h.date_raw ? h.date_raw * 1000 : 0),
      change: typeof h.last_change === 'number' ? h.last_change : h.mmr_change_to_last_game,
      matchId: h.match_id,
    }))
    .filter((h) => h.date && typeof h.change === 'number')
    .sort((a, b) => b.date - a.date);
};

// Tier icons from valorant-api.com (uses the newest episode's tier set).
RO._tiers = null;
RO.tierIcon = async function (tierId) {
  try {
    if (!RO._tiers) {
      const r = await fetch('https://valorant-api.com/v1/competitivetiers');
      const j = await r.json();
      RO._tiers = j.data[j.data.length - 1].tiers;
    }
    const t = RO._tiers.find((x) => x.tier === tierId);
    return t ? t.largeIcon || t.smallIcon : null;
  } catch (e) {
    return null;
  }
};
