// Bot policies, injected into the page. They run inside the simulation (every 0.1 s of game time).
window.__policies = (() => {
  const ABS = new Set(['upgrade', 'nuke', 'star', 'hangar', 'heart', 'tesla']);
  const BLK = new Set(['barrier', 'ice', 'fence', 'statue', 'redmul', 'redadd']);
  const BLUE_SPEED = 9;
  function hazardAt(hz, x) {
    let p = 1;
    for (const s of hz.saws) if (Math.abs(x - s.x) < s.r + 0.6) p *= 0.65;
    for (const c of hz.crushers) if (Math.abs(x - c.x) < c.w / 2) p *= 0.6;
    for (const t of hz.turrets) if (Math.abs(x - t.x) < 1.6) p *= 0.75;
    for (const h of hz.holes || []) if (Math.abs(x - h.x) < h.r * 2.2) p *= 0.3;
    for (const t of hz.tornados || []) if (Math.abs(x - t.x) < t.r + 0.8) p *= 0.8;
    for (const z of hz.zones || []) if (Math.abs(x - z.x) < z.w / 2 + 0.4) p *= 0.6;
    return p;
  }
  const faceF = (o) => (o.t === 'mul' ? o.v : o.t === 'add' ? o.v + 1 : 1 / o.v);
  let BELTS = [];
  // walk straight up the road at x from distance d0; returns multiplier and the first blocker/absorber hit
  function walk(x, d0, gates, depth) {
    for (const b of BELTS) if (b.d2 > d0 && Math.abs(x - b.x) < b.w / 2) x = Math.max(-6.3, Math.min(6.3, x + b.v * (b.d2 - Math.max(d0, b.d1)) / BLUE_SPEED));
    const L = gates.filter((q) => q.d > d0 && Math.abs(x - q.x) <= q.w / 2 - 0.15).sort((a, b) => a.d - b.d);
    let m = 1;
    for (const q of L) {
      if (q.locked) {
        const seal = gates.find(g => g.id === q.requires);
        if (!seal || seal.d > d0 && Math.abs(x - seal.x) > seal.w / 2 - 0.15) continue;
      }
      if (q.t === 'tesla' && q.active) continue;
      const on = q.phase ? q.phase.on / q.phase.period : 1;
      if (on < 1 && !BLK.has(q.t)) {
        const f = q.t === 'mul' ? q.v : q.t === 'add' ? q.v + 1 : q.t === 'div' ? 1 / q.v : 1;
        m *= f ** (q.on ? Math.min(1, on * 1.3) : on * 0.7);
        continue;
      }
      if (q.slot) m *= Math.exp(q.opts.reduce((a, o) => a + Math.log(faceF(o) * (o.t === 'div' ? 1 : q.boost || 1)), 0) / q.opts.length);
      else if (q.t === 'jump') {
        if (depth > 2) return { m, stop: null };
        const r = walk(q.to.x, q.to.d, gates, depth + 1);
        return { m: m * r.m, stop: r.stop, pre: r.stop ? m * r.pre : m, after: r.after, x2: q.to.x };
      } else if (q.t === 'loop') {
        if (depth > 1) continue;
        const r = walk(q.to.x, q.to.d, gates.filter((g) => g !== q), depth + 1);
        m *= Math.min(r.m, 1e12);
      } else if (q.flip) { const f = (o) => (o.t === 'mul' ? o.v : 1 / o.v); m *= (f(q.fa) + f(q.fb)) / 2; }
      else if (q.t === 'mul') m *= q.v;
      else if (q.t === 'add') m *= q.v + 1;
      else if (q.t === 'div') m /= q.v;
      else if (q.t === 'charge') m *= q.v + (q.max - q.v) * 0.3;
      else if (q.t === 'portal') {
        if (depth > 2) return { m, stop: null };
        const r = walk(q.to.x, q.to.d, gates, depth + 1);
        return { m: m * r.m, stop: r.stop, pre: r.stop ? m * r.pre : m, after: r.after, x2: q.to.x };
      } else if (BLK.has(q.t) || ABS.has(q.t)) {
        const after = walk(x, q.d, gates, depth + 1);
        return { m, stop: q, pre: m, after: after.m };
      }
    }
    return { m, stop: null, pre: m };
  }
  let cur = 0, hold = 0, starT = 0, starHit = false, starRun = 0;
  function smart(g) {
    if (starT > 0) starT--;
    starHit = false;
    const st = g.state;
    if (st.phase !== 'play' && st.phase !== 'intro') return;
    const gates = g.gates(), hz = g.hazards();
    BELTS = hz.belts || [];
    const flux = g.snapshot().flux;
    // a rolling ball close to the cannon costs lives: shoot it down first
    const ball = (hz.balls || []).filter((b) => b.d < 34).sort((a, b) => a.d - b.d)[0];
    if (ball) { cur = ball.x; hold = 3; g.aim(cur); return; }
    // defend: a pack of red units close to the cannon gets shot first (like any human would)
    const near = g.reds ? g.reds(14) : [];
    if (near.length >= 6) {
      // aim at the heaviest nearby pack (bucketed by lane), never straight into a wall
      const buckets = {};
      for (const [x, d, hp] of near) { const k = Math.round(x / 2); const b = buckets[k] || (buckets[k] = { sx: 0, w: 0 }); const w = hp / (1 + d); b.sx += x * w; b.w += w; }
      const top = Object.values(buckets).sort((a, b) => b.w - a.w)[0];
      let x = top.sx / top.w;
      for (const w of hz.walls || []) if (w.d1 < 14 && Math.abs(x - w.x) < 0.7) x = w.x + (x >= w.x ? 0.7 : -0.7);
      cur = Math.max(-6.1, Math.min(6.1, x)); hold = 2; g.aim(cur); return;
    }
    let best = -Infinity, bx = 0;
    const threats = g.threats ? g.threats() : [];
    const danger = (x) => threats.some((t) => Math.abs(x - t.x) < t.w / 2 + 0.9);
    for (let x = -6.1; x <= 6.11; x += 0.2) {
      if (danger(x)) continue;
      const r = walk(x, 0, gates, 0);
      const hp = hazardAt(hz, x);
      let score;
      const q = r.stop;
      if (!q) score = r.m * hp;
      else if (q.t === 'upgrade' || q.t === 'hangar') {
        // worth it only if it fills reasonably fast; otherwise keep multiplying first
        const fill = (q.need - q.prog) / (flux * r.pre);
        score = fill < 10 ? 1e30 * r.pre : r.pre * 0.05;
      }
      else if (q.t === 'tesla') score = (q.need - q.prog) / (flux * r.pre) < 12 ? 1e29 * r.pre : r.pre * 0.05;
      else if (q.t === 'heart') {
        const fill = (q.need - q.prog) / (flux * r.pre);
        score = st.lives <= 5 && fill < 6 ? 1e28 * r.pre : r.pre * 0.03;
      }
      else if (q.t === 'nuke') {
        const fill = (q.need - q.prog) / (flux * r.pre);
        score = fill < 4 && st.redUnits > 40 ? 1e25 * r.pre : r.pre * 0.05;
      } else if (q.t === 'star') {
        const fill = (q.need - q.prog) / (flux * r.pre);
        // feed the star in short bursts once a big army is on screen
        score = fill < 10 && starT <= 0 ? 1e27 * r.pre : r.pre * 0.05;
        if (score > 1e26) starHit = true;
      } else {
        const t = q.hp / (flux * r.pre);
        score = t < 18 ? r.pre * (r.after || 1) * hp / (1 + t / 6) : r.pre * 0.02;
      }
      if (score > best * 1.0001) { best = score; bx = x; }
    }
    // hysteresis so the stream doesn't jitter between equal options
    const rc = walk(cur, 0, gates, 0);
    if (hold > 0) hold--;
    if (starHit) { starRun++; if (starRun > 60) { starRun = 0; starT = 80; } } else starRun = 0;
    if (danger(cur)) { cur = bx; hold = 3; }
    else if (Math.abs(bx - cur) > 0.3 && (hold <= 0 || starHit)) { cur = bx; hold = starHit ? 8 : 3; }
    g.aim(cur);
  }
  // casual player: aims at the biggest visible multiplier product, ignores gold gates and blockers
  function naive(g) {
    const threats = g.threats ? g.threats() : [];
    const gates = g.gates().filter((q) => !q.locked && !ABS.has(q.t) && !BLK.has(q.t) && q.t !== 'portal');
    let best = -1, bx = 0;
    for (let x = -6; x <= 6.01; x += 0.25) {
      let v = 1;
      for (const q of gates) if (Math.abs(x - q.x) < q.w / 2 - 0.3) v *= q.t === 'mul' ? q.v : q.t === 'add' ? q.v + 1 : q.t === 'div' ? 1 / q.v : q.t === 'charge' ? q.v : 1;
      const blocked = g.gates().some((q) => BLK.has(q.t) && Math.abs(x - q.x) < q.w / 2);
      if (blocked) v *= 0.3; // casual players still shoot at a big number behind a barrier
      if (threats.some((t) => Math.abs(x - t.x) < t.w / 2 + 0.9)) v *= 1e-6;
      if (v > best + 0.01) { best = v; bx = x; }
    }
    g.aim(bx);
  }
  let rt = 0, rx = 0;
  function random(g) { if (--rt <= 0) { rt = 40; rx = (Math.random() * 2 - 1) * 6; } g.aim(rx); }
  function center(g) { g.aim(0); }
  return { smart, naive, random, center };
})();
