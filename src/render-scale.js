// Adaptive drawing-buffer resolution. The ratio never drops below `floor`, the fixed quality
// the game shipped with, and climbs toward the screen's native density while frames keep
// their budget. A level that fails is retried only after a growing backoff, so a phone that
// throttles settles instead of oscillating.

export const SCALE_STEP = 0.25;
const TARGET_MS = 1000 / 60;
const WINDOW_MS = 2000, MIN_FRAMES = 60, SETTLE_MS = 700;
const LATE_MS = TARGET_MS * 1.3;
// Shares of late frames per window. Single hitches (shader compiles, GC) stay below both.
const UP_LATE = 0.04, DOWN_LATE = 0.15;
// GPU milliseconds per frame, as a share of the budget, when a timer query is available.
const UP_GPU = 0.62, DOWN_GPU = 0.86;
// JavaScript at this share of the budget makes the frame CPU bound; resolution would not help.
const CPU_BOUND = 0.75;
const BACKOFF_MS = 20000, MAX_BACKOFF_MS = 120000;

export function scaleLevels(floor, ceiling) {
  const levels = [floor];
  for (let r = Math.floor(floor / SCALE_STEP + 1e-6) * SCALE_STEP + SCALE_STEP; r < ceiling - 1e-3; r += SCALE_STEP) levels.push(r);
  if (ceiling > floor + 1e-3) levels.push(ceiling);
  return levels;
}

export function createRenderScale({ floor, ceiling, initial = floor }) {
  const levels = scaleLevels(floor, ceiling);
  let index = 0;
  for (let i = 0; i < levels.length; i++) if (levels[i] <= initial + 1e-6) index = i;
  let start = -1, settleUntil = 0, frames = 0, late = 0, spent = 0;
  let cpu = [], gpu = [], goodWindows = 0;
  // Each level that failed keeps the time it may be tried again and its current backoff.
  const retryAt = new Map(), backoff = new Map();
  let probedAt = -Infinity, probedIndex = -1;

  function reset(now) {
    start = -1; frames = late = spent = 0; cpu = []; gpu = [];
    settleUntil = now + SETTLE_MS;
  }
  const percentile = (values, p) => {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  };
  function move(now, next) {
    if (next < index && probedIndex === index && now - probedAt < 3 * WINDOW_MS + SETTLE_MS) {
      // The probe failed: keep this level out of reach for a while, longer each time.
      const wait = Math.min(MAX_BACKOFF_MS, (backoff.get(index) ?? BACKOFF_MS / 2) * 2);
      backoff.set(index, wait);
      retryAt.set(index, now + wait);
    }
    if (next > index) { probedAt = now; probedIndex = next; }
    index = next; goodWindows = 0;
    reset(now);
    return levels[index];
  }

  return {
    levels,
    get ratio() { return levels[index]; },
    get adaptive() { return levels.length > 1; },
    reset,
    /** Interval since the previous drawn frame and the JavaScript time spent on this one. */
    frame(now, intervalMs, cpuMs) {
      if (levels.length < 2) return null;
      if (now < settleUntil || intervalMs > 250) { if (intervalMs > 250) reset(now); return null; }
      if (start < 0) start = now;
      frames++; spent += intervalMs;
      if (intervalMs > LATE_MS) late++;
      cpu.push(cpuMs);
      if (frames < MIN_FRAMES || now - start < WINDOW_MS) return null;

      const lateShare = late / frames, meanInterval = spent / frames, cpuMedian = percentile(cpu, 0.5);
      const timed = gpu.length >= frames * 0.5, gpuHigh = percentile(gpu, 0.9);
      reset(now); settleUntil = now;
      if (cpuMedian > TARGET_MS * CPU_BOUND) { goodWindows = 0; return null; }
      const over = timed ? gpuHigh > TARGET_MS * DOWN_GPU : lateShare > DOWN_LATE;
      if (over) {
        if (index === 0) return null;
        // Pixel cost scales with area: drop straight to the level the overload implies,
        // at least one step, so a heavy scene does not spend several windows stuttering.
        const fit = timed ? TARGET_MS * UP_GPU / gpuHigh : TARGET_MS / meanInterval;
        let next = index - 1;
        while (next > 0 && (levels[next] / levels[index]) ** 2 > fit) next--;
        return move(now, next);
      }
      const next = index + 1;
      if (next >= levels.length) return null;
      const growth = (levels[next] / levels[index]) ** 2;
      const room = timed ? gpuHigh * growth < TARGET_MS * UP_GPU : lateShare <= UP_LATE;
      if (!room) { goodWindows = 0; return null; }
      // Without a GPU timer the only evidence is frame pacing, so ask for two calm windows.
      if (++goodWindows < (timed ? 1 : 2) || now < (retryAt.get(next) ?? 0)) return null;
      return move(now, next);
    },
    /** GPU milliseconds for a frame, reported whenever a timer query resolves. */
    gpu(ms) { if (start >= 0) gpu.push(ms); },
  };
}

// Times whole frames on the GPU where EXT_disjoint_timer_query_webgl2 exists. Results
// arrive a few frames late; disjoint intervals (power state changes) are discarded.
export function createGpuTimer(gl) {
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (!ext) return null;
  const pending = [], free = [];
  let active = null;
  return {
    begin() {
      if (active || pending.length >= 6) return;
      active = free.pop() ?? gl.createQuery();
      gl.beginQuery(ext.TIME_ELAPSED_EXT, active);
    },
    end() {
      if (!active) return;
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      pending.push(active); active = null;
    },
    /** Calls `report(ms)` for every finished query, oldest first. */
    poll(report) {
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
      while (pending.length) {
        const query = pending[0];
        if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) break;
        pending.shift();
        const ns = gl.getQueryParameter(query, gl.QUERY_RESULT);
        if (!disjoint) report(ns / 1e6);
        free.push(query);
      }
    },
  };
}
