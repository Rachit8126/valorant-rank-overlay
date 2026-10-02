// Daily stats derived from MMR history.
window.RO = window.RO || {};

// Start of the current "gaming day" given a reset hour (local time).
RO.dayStart = function (resetHour, now) {
  const d = new Date(now || Date.now());
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), resetHour, 0, 0, 0);
  if (d < s) s.setDate(s.getDate() - 1);
  return s.getTime();
};

RO.computeStats = function (history, resetHour) {
  const start = RO.dayStart(resetHour);
  const today = history.filter((h) => h.date >= start);
  let wins = 0, losses = 0, rr = 0;
  for (const h of today) {
    rr += h.change;
    // Heuristic: positive RR = win, otherwise loss (draws/zero-change count as loss).
    if (h.change > 0) wins++; else losses++;
  }
  return {
    wins,
    losses,
    todayRR: rr,
    lastRR: history.length ? history[0].change : null,
  };
};
