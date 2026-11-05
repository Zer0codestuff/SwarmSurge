// Bot policies, injected into the page. They run inside the simulation (every 0.1 s of game time).
window.__policies = (() => {
  const ABS = new Set(['upgrade', 'nuke', 'star']);
  const BLK = new Set(['barrier', 'ice', 'fence', 'statue']);
  function hazardAt(hz, x) {
    let p = 1;
    for (const s of hz.saws) if (Math.abs(x - s.x) < s.r + 0.6) p *= 0.65;
    for (const c of hz.crushers) if (Math.abs(x - c.x) < c.w / 2) p *= 0.6;
    for (const t of hz.turrets) if (Math.abs(x - t.x) < 1.6) p *= 0.75;
    return p;
  }
  // walk straight up the road at x from distance d0; returns multiplier and the first blocker/absorber hit
  function walk(x, d0, gates, depth) {
    const L = gates.filter((q) => q.d > d0 && Math.abs(x - q.x) <= q.w / 2 - 0.15).sort((a, b) => a.d - b.d);
    let m = 1;
    for (const q of L) {
      if (q.flip) { const f = (o) => (o.t === 'mul' ? o.v : 1 / o.v); m *= (f(q.fa) + f(q.fb)) / 2; }
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
    const flux = g.snapshot().flux;
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
      else if (q.t === 'upgrade') score = 1e30 * r.pre;
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
    const gates = g.gates().filter((q) => !ABS.has(q.t) && !BLK.has(q.t) && q.t !== 'portal');
    let best = -1, bx = 0;
    for (let x = -6; x <= 6.01; x += 0.25) {
      let v = 1;
      for (const q of gates) if (Math.abs(x - q.x) < q.w / 2 - 0.3) v *= q.t === 'mul' ? q.v : q.t === 'add' ? q.v + 1 : q.t === 'div' ? 1 / q.v : q.t === 'charge' ? q.v : 1;
      const blocked = g.gates().some((q) => BLK.has(q.t) && Math.abs(x - q.x) < q.w / 2);
      if (blocked) v *= 0.01;
      if (v > best + 0.01) { best = v; bx = x; }
    }
    g.aim(bx);
  }
  let rt = 0, rx = 0;
  function random(g) { if (--rt <= 0) { rt = 40; rx = (Math.random() * 2 - 1) * 6; } g.aim(rx); }
  function center(g) { g.aim(0); }
  return { smart, naive, random, center };
})();
