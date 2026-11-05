setInterval(() => {
  const g = window.__game; if (!g || g.state.phase === 'menu') return;
  const gates = g.gates();
  const up = gates.find(x => x.t === 'upgrade'); if (up) return g.aim(up.x);
  const bar = gates.find(x => x.t === 'barrier' || x.t === 'ice'); if (bar) return g.aim(bar.x);
  let bx = 0, bv = -1;
  for (let x = -6; x <= 6; x += 0.25) { let v = 1; for (const q of gates) if (Math.abs(x - q.x) < q.w / 2 - 0.3) v *= q.t === 'mul' ? q.v : q.t === 'add' ? q.v + 1 : q.t === 'div' ? 0.5 : 1; if (v > bv + 0.01) { bv = v; bx = x; } }
  g.aim(bx);
}, 120);
