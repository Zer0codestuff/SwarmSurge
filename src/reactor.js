// All timings use battle seconds, so pause, hit-stop and slow motion agree with the cannon.
export const VENT_TIME = 3.9;
export const PEAK_TIME = 3.1;
export const BURST_TIME = 2.4;
export function newReactor(surge) {
  return { phase: 'ready', time: 0, power: 1, peak: surge ? 64 : 24 };
}
export function chargePower(r) {
  if (r.time >= PEAK_TIME) return r.peak;
  if (r.time >= 1.85) return 8;
  if (r.time >= .7) return 3;
  return 1;
}
export function triggerReactor(r) {
  if (r.phase === 'ready') {
    r.phase = 'charging';
  } else if (r.phase === 'charging' && chargePower(r) > 1) {
    r.power = chargePower(r);
    r.phase = 'burst';
    r.time = BURST_TIME;
  } else return false;
  return true;
}
export function tickReactor(r, dt) {
  if (r.phase === 'charging') {
    r.time += dt;
    if (r.time >= VENT_TIME) { r.phase = 'vented'; r.time = 0; }
  } else if (r.phase === 'burst') {
    r.time = Math.max(0, r.time - dt);
    if (r.time === 0) { r.phase = 'spent'; r.power = 1; }
  }
}
