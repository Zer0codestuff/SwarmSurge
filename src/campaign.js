// A deliberate equipment route for each world. Original obstacles and signature routes stay intact.
// Each entry is [first-stage equipment, second-stage equipment, boss-stage equipment, fort HP scale].
const ROUTES = [
  ['rifle', 'tank', 'rapid', 0.85],
  ['rifle', 'air', 'rockets', 1],
  ['tank', 'rifle', 'rockets', 0.7],
  ['rapid', 'tank', 'air', 0.32],
  ['rifle', 'air', 'tank', 0.65],
  ['rifle', 'rockets', 'arc', 0.65],
  ['tank', 'air', 'arc', 0.65],
  ['air', 'rifle', 'rockets', 0.6],
  ['tank', 'rockets', 'arc', 0.8],
  ['rifle', 'tank', 'air', 0.8],
  ['tank', 'rifle', 'rockets', 0.65],
  ['air', 'tank', 'arc', 0.45],
  ['rifle', 'air', 'rockets', 0.65],
  ['arc', 'tank', 'air', 0.6],
  ['tank', 'rockets', 'tank', 0.65],
  ['rifle', 'tank', 'arc', 0.5],
  ['rockets', 'air', 'tank', 0.7],
  ['tank', 'arc', 'air', 0.65],
  ['air', 'arc', 'tank', 0.65],
  ['tank', 'arc', 'air', 0.6],
];
const LESSONS = {
  rifle: 'Unlock blasters. Your troops can shoot while they run.',
  rockets: 'Rocket troops deal splash damage. Break up the heavy packs.',
  arc: 'Arc rifles chain lightning through three enemies.',
  tank: 'Build a tank. Extra barrels, double shot power and reinforced armor.',
  air: 'Call the air wing. It makes repeated bombing runs for this level.',
  rapid: 'Rapid doubles your firing rate. Stack it to reach x8.',
};

export function prepareCampaign(levels) {
  return levels.map((level, li) => ({
    ...level,
    stages: level.stages.map((original, si) => {
      const s = structuredClone(original), route = ROUTES[li];
      s.surge = [1, 8, 9, 16, 19].includes(li) && si === 2 || li === 1;
      s.targetTime = si === 2 ? 32 : s.surge ? 16 : 23;
      if (s.tower) s.tower = Math.max(250, Math.round(s.tower * route[3]));
      if (s.boss) s.boss.hp *= li < 2 ? 0.9 : 0.8;
      for (const g of s.gates) {
        // Front-line equipment used to cost up to a minute of unmultiplied shots.
        if (g.t === 'upgrade' || g.t === 'hangar') g.need = Math.min(g.need, 18 + li * 2 + si * 8);
        if (g.t === 'charge') g.per = Math.max(8, g.per * 0.6);
      }
      const up = route[si];
      // Supply crates sit before the lane puzzles. Claim one, then choose your route.
      s.gates.unshift({ t: 'upgrade', up, need: 12 + li + si * 5, x: si % 2 ? 3.4 : -3.4, d: 5.5, w: 4.7 });
      s.tip = `${LESSONS[up]} ${original.tip}`;
      // Short stationary routes are intentional. Longer fights gain a moving bonus lane.
      if (li >= 3 && !s.surge && si !== 2 && s.gates.length < 40) {
        s.gates.push({ t: 'mul', v: 3, x: 0, d: 43, w: 3.2, color: 'gold', slide: { amp: 4.5, speed: 0.48 } });
      }
      for (const b of s.balls || []) {
        b.delay = Math.min(b.delay ?? 0, 5);
        b.hp *= 0.7;
      }
      return s;
    }),
  }));
}
