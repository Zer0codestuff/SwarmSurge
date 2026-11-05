// A deliberate equipment route for each world. Original obstacles and signature routes stay intact.
// Each entry is [first-stage equipment, second-stage equipment, boss-stage equipment, fort HP scale].
const ROUTES = [
  ['rifle', 'tank', 'rapid', 0.85],
  ['rifle', 'air', 'rockets', 1],
  ['tank', 'rifle', 'rockets', 0.7],
  ['rapid', 'tank', 'air', 0.32],
  ['scatter', 'air', 'tank', 0.65],
  ['rifle', 'rockets', 'arc', 0.65],
  ['spider', 'frost', 'arc', 0.65],
  ['squad', 'rifle', 'rockets', 0.6],
  ['tank', 'plasma', 'arc', 0.8],
  ['rail', 'hover', 'air', 0.8],
  ['siege', 'flame', 'rockets', 0.65],
  ['squad', 'spider', 'rail', 0.45],
  ['frost', 'hover', 'plasma', 0.65],
  ['arc', 'spider', 'squad', 0.6],
  ['siege', 'scatter', 'plasma', 0.65],
  ['frost', 'hover', 'arc', 0.5],
  ['flame', 'air', 'railfort', 0.7],
  ['railfort', 'rail', 'air', 0.65],
  ['air', 'hover', 'plasma', 0.65],
  ['siege', 'plasma', 'titan', 0.6],
];
const LESSONS = {
  rifle: 'Unlock blasters. Your troops can shoot while they run.',
  rockets: 'Rocket troops deal splash damage. Break up the heavy packs.',
  arc: 'Arc rifles chain lightning through three enemies.',
  scatter: 'Scatterguns hit a close pack in a wide fan.',
  rail: 'Railguns pierce three enemies at long range.',
  flame: 'Flamethrowers sweep close packs and leave them burning.',
  frost: 'Frost projectors slow enemies and rolling balls.',
  plasma: 'Plasma casters burst across a wide area.',
  siege: 'The Siege crawler carries extra guns and armor.',
  spider: 'The Spider mech deploys scatter troops and doubles the base fire rate.',
  hover: 'The Hover fortress deploys frost troops behind reinforced armor.',
  railfort: 'The Rail fortress triples shot power and deploys railgun troops.',
  titan: 'The Titan walker brings plasma troops, heavy armor and an air wing.',
  tank: 'Build a tank. Extra barrels, double shot power and reinforced armor.',
  air: 'Call the air wing. It makes repeated bombing runs for this level.',
  rapid: 'Rapid doubles your firing rate. Stack it to reach x8.',
  squad: 'Deploy an escort cannon. It mirrors your guns and adds two armor points.',
};
const FLANK_TYPES = { jungle:4, neon:7, candy:6, moon:5, sky:7, void:9, factory:8, casino:2, coral:4, spooky:9, arena:3, crystal:6, volcano:12, tomb:10, storm:7, blackhole:9 };

export function prepareCampaign(levels) {
  return levels.map((level, li) => ({
    ...level,
    stages: level.stages.map((original, si) => {
      const s = structuredClone(original), route = ROUTES[li];
      s.surge = [1, 8, 9, 16, 19].includes(li) && si === 2 || li === 1;
      s.targetTime = si === 2 ? 32 : s.surge ? 16 : 23;
      // Small, announced side attacks break up stationary play. Surge stages keep their free-fire rhythm.
      if (li >= 4 && !s.surge) s.flanks = {
        kind: FLANK_TYPES[level.theme] ?? 4, count: level.theme === 'moon' ? 1 : li >= 10 ? 4 : 3,
        start: si === 2 ? 10 : 7, every: 10, limit: si === 2 ? 1 : 2, warning: 1.4, firstSide: (li+si)%2,
      };
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
