// Personal bests and medals per world. Kept apart from `swarm-progress` so legacy saves stay untouched.
const KEY = 'swarm-records';
export const SWIFT_SECONDS = 65, CRUSH_SECONDS = 12;
export const MEDALS = [
  { id: 'flawless', name: 'Flawless', hint: 'Lose no hearts', icon: '<path d="M12 21S2 15.5 2 8.5a5.5 5.5 0 0 1 10-3 5.5 5.5 0 0 1 10 3C22 15.5 12 21 12 21z"/>' },
  { id: 'swift', name: 'Swift', hint: `Win in under ${SWIFT_SECONDS} s of battle`, icon: '<path d="M14 1 3.5 13h7l-1 10L21 9h-7.5z"/>' },
  { id: 'overpowered', name: 'Overpowered', hint: `Beat the boss in under ${CRUSH_SECONDS} s`, icon: '<path d="m2 6 5.6 4.5L12 3l4.4 7.5L22 6l-2.2 11H4.2zM4.6 19h14.8v2H4.6z"/>' },
  { id: 'hardcore', name: 'Hardcore', hint: 'Win a one-heart run', icon: '<path fill-rule="evenodd" d="M12 2C6 2 3 6 3 11c0 3 1.7 5.3 4.5 6.1L8 21h2v-2h1v2h2v-2h1v2h2l.5-3.9C19.3 16.3 21 14 21 11c0-5-3-9-9-9zm-3.7 8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zm7.4 0a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zm-3.7 4.4-1.3 2.2h2.6z"/>' },
];
const clean = (value) => (Number.isFinite(value) && value > 0 ? value : 0);

export function loadRecords(storage) {
  try {
    const saved = JSON.parse((storage ?? globalThis.localStorage).getItem(KEY));
    if (saved && typeof saved === 'object' && saved.worlds && typeof saved.worlds === 'object') return saved;
  } catch {}
  return { worlds: {} };
}
export function saveRecords(records, storage) {
  try { (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify(records)); return true; } catch { return false; }
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
    const rounded = Math.round(time * 10) / 10;
    const faster = rounded > 0 && (!clean(before.time) || rounded < before.time);
    if (faster) { entry.time = rounded; fresh.time = clean(before.time) > 0; delete entry.splits; }
    // Old saves can acquire their missing splits by matching the displayed best.
    if ((faster || (!entry.splits && rounded === entry.time)) && run.splits?.length === 3 && run.splits.every(t => clean(t) > 0)) {
      entry.splits = run.splits.map(t => Math.round(t * 100) / 100);
    }
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
