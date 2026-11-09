// Personal bests and medals per world. Kept apart from `swarm-progress` so legacy saves stay untouched.
const KEY = 'swarm-records';
export const SWIFT_SECONDS = 65, CRUSH_SECONDS = 12;
export const MEDALS = [
  { id: 'flawless', name: 'Flawless', hint: 'Lose no hearts', icon: '♥' },
  { id: 'swift', name: 'Swift', hint: `Win in under ${SWIFT_SECONDS} s of battle`, icon: '⚡' },
  { id: 'overpowered', name: 'Overpowered', hint: `Beat the boss in under ${CRUSH_SECONDS} s`, icon: '♛' },
  { id: 'hardcore', name: 'Hardcore', hint: 'Win a one-heart run', icon: '☠' },
];
const clean = (value) => (Number.isFinite(value) && value > 0 ? value : 0);

export function loadRecords(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(KEY));
    if (saved && typeof saved === 'object' && saved.worlds && typeof saved.worlds === 'object') return saved;
  } catch {}
  return { worlds: {} };
}
export function saveRecords(records, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify(records)); return true; } catch { return false; }
}
export const medalsOf = (records, world) => MEDALS.filter((medal) => records.worlds[world]?.medals?.includes(medal.id));
export function medalTotal(records) {
  let total = 0;
  for (const world of Object.keys(records.worlds)) total += medalsOf(records, world).length;
  return total;
}
/** Seconds as m:ss.s. */
export function clock(seconds) {
  const tenths = Math.round(clean(seconds) * 10), minutes = Math.floor(tenths / 600);
  return `${minutes}:${String(((tenths % 600) / 10).toFixed(1)).padStart(4, '0')}`;
}
/**
 * Merge one victory into the records. `run`: { army, combo, kills, time, bossTime, heartsLost, full, hardcore }.
 * Times and medals only count for a run that started at stage one.
 * Returns the previous entry, which bests were beaten and which medals are new.
 */
export function recordRun(records, world, run) {
  const before = records.worlds[world] || {}, entry = { ...before, medals: [...(before.medals || [])] };
  const fresh = {};
  for (const stat of ['army', 'combo', 'kills']) {
    const value = clean(run[stat]);
    if (value > clean(before[stat])) { entry[stat] = value; fresh[stat] = clean(before[stat]) > 0; }
  }
  const earned = [];
  if (run.full) {
    const time = clean(run.time);
    if (time && (!clean(before.time) || time < before.time)) { entry.time = Math.round(time * 10) / 10; fresh.time = clean(before.time) > 0; }
    const wins = {
      flawless: run.heartsLost === 0,
      swift: time > 0 && time < SWIFT_SECONDS,
      overpowered: clean(run.bossTime) > 0 && run.bossTime < CRUSH_SECONDS,
      hardcore: !!run.hardcore,
    };
    for (const medal of MEDALS) if (wins[medal.id] && !entry.medals.includes(medal.id)) { entry.medals.push(medal.id); earned.push(medal.id); }
  }
  entry.wins = (clean(before.wins) || 0) + 1;
  records.worlds[world] = entry;
  return { before, entry, fresh, earned };
}
