// Boss HP multipliers per world. Armies grow exponentially, so each extra second of a boss fight
// costs a large HP factor. Measured with seed-42 and seed-7 bots: normal bosses aim for about 24 s
// of smart play, capped so the naive policy still wins where it already won. Worlds 9, 10 and 19
// end in OP bursts that ignore boss HP, so their values only protect players without that route.
const BOSS_HP = [24, 1, 27, 18, 11, 1.6, 28, 3, 4, 6, 2.5, 50, 17, 15, 27, 7, 3.2, 20, 30, 1.5];

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
  ['siege', 'flame', 'plasma', 0.65],
  ['squad', 'spider', 'rail', 0.45],
  ['frost', 'hover', 'plasma', 0.65],
  ['arc', 'spider', 'squad', 0.6],
  ['siege', 'scatter', 'plasma', 0.65],
  ['frost', 'hover', 'rail', 0.5],
  ['flame', 'air', 'railfort', 0.7],
  ['railfort', 'rail', 'air', 0.65],
  ['air', 'hover', 'plasma', 0.65],
  ['siege', 'flame', 'titan', 0.6],
];
const LESSONS = {
  rifle: 'Unlock blasters. Your troops can shoot while they run.',
  rockets: 'Rocket troops deal splash damage. Break up the heavy packs.',
  arc: 'Arc rifles chain lightning through three enemies.',
  scatter: 'Scatterguns hit a close pack in a wide fan.',
  rail: 'Railguns pierce armor and three enemies at long range.',
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
import { LATE_FLANKS } from './biomes-late.js';

const FLANK_TYPES = { ...LATE_FLANKS, jungle:4, neon:7, candy:6, moon:5, sky:7, void:9, factory:8, casino:2, coral:4, spooky:9, arena:3, crystal:6, volcano:12, tomb:10, storm:7, blackhole:9 };
// Base HP of each enemy kind (RED_TYPES in main.js), used to size late flanks.
const RED_HP = [1, 12, 1, 6, 1, 40, 4, 2, 10, 3, 5, 5, 2];
const VAULTS = [
  { world: 4, stage: 1, x: 5.65, d: 30.5, hp: 1000, t: 'ice', prizes: [34, 37, 40] },
  { world: 6, stage: 2, x: 5.65, d: 31, hp: 8000, t: 'fence', prizes: [34.5, 37.5, 40.5] },
  { world: 12, stage: 1, x: -5.65, d: 24, hp: 350, t: 'fence', prizes: [28, 33, 38] },
  { world: 16, stage: 1, x: -5.65, d: 31.5, hp: 3000, t: 'ice', prizes: [35, 38, 41] },
];

function addVault(s, world, stage) {
  const vault = VAULTS.find(v => v.world === world && v.stage === stage);
  if (!vault) return;
  const id = `vault-${world}-${stage}`, period = 3.2;
  // Fixed costs buy five to seven seconds of an established narrow stream, before timing the prizes.
  s.gates.push({ t: vault.t, id, vault: true, x: vault.x, d: vault.d, w: 1.5, hp: vault.hp });
  vault.prizes.forEach((d, i) => s.gates.push({
    t: 'mul', v: [100, 100, 1000][i], requires: id, vaultStep: i, x: i ? vault.x : Math.sign(vault.x) * 5.1,
    d, w: i ? 1.5 : 1.25, color: 'gold', mega: true,
    slide: i ? undefined : { amp: 0.55, speed: 1.2, ph: 0 },
    // Match the phase windows to a regular troop's travel time along the chain.
    phase: { period, on: 0.7, off: (period - (d - vault.prizes[0]) / 9 % period) % period },
  }));
}

// Worlds 21-50 store their target HP directly (calibrated per stage), and write breakable HP and
// charge costs as fractions of it so a recalibration keeps every obstacle proportional.
function resolveFractions(s, target) {
  const scaled = (f, floor) => Math.max(floor, Math.round(f * target));
  const each = (list, key) => {
    for (const o of list || []) {
      if (o[key + 'F'] != null) { o[key] = scaled(o[key + 'F'], key === 'hp' ? 30 : 20); delete o[key + 'F']; }
    }
  };
  for (const key of ['hp', 'need']) {
    each(s.gates, key);
    for (const list of [s.spawners, s.turrets, s.balls, s.pillars, s.eggs, s.carts, s.holes, s.fusion]) each(list, key);
  }
}

function prepareLate(level, li, original, si) {
  const s = structuredClone(original), route = level.route;
  s.surge = !!original.surge;
  s.targetTime = si === 2 ? 32 : 23;
  s.enemyScale = 1.15;
  s.enemyWarmup = si === 0 ? 0.3 : 0.4;
  if (!s.surge) {
    // Late worlds restart from one barrel, so a flank carries a fixed toughness budget: heavy kinds
    // arrive as a weakened pair instead of a full pack that the raw cannon stream cannot stop.
    // Openers get one flank: a second one landing on a slow first stage snowballed into losses.
    // Ghosts phase past troops and cover, so they come as a pair with a smaller budget.
    const kind = FLANK_TYPES[level.theme] ?? 4, base = RED_HP[kind] ?? 1, ghost = kind === 9;
    const count = base >= 5 || ghost ? 2 : 3;
    s.flanks = {
      kind, count, start: si === 2 ? 8 : 8.5, every: 10, limit: si === 1 ? 2 : 1, warning: 1.4,
      firstSide: (li + si) % 2, hpScale: Math.min(1, (ghost ? 4 : 9) / (count * base)),
    };
  }
  const target = s.boss ? s.boss.hp : s.tower;
  resolveFractions(s, target);
  if (s.boss && !s.surge) { s.boss.sweep = true; s.boss.cadence = 0.9; s.boss.opening = 2.8; }
  // Every world starts from a single barrel, so equipment costs stop rising after world 20.
  const supplyScale = si === 0 ? 1.25 : 1.35 + si * 0.45, ci = Math.min(li, 19);
  for (const g of s.gates) {
    if (g.t === 'upgrade' || g.t === 'hangar') g.need = Math.round(Math.min(g.need, 18 + ci * 2 + si * 8) * supplyScale);
    if (g.t === 'charge') g.per = Math.max(8, g.per * 0.6);
  }
  const up = route[si];
  s.gates.unshift({ t: 'upgrade', up, need: Math.round((12 + ci + si * 5) * supplyScale), x: si % 2 ? 3.4 : -3.4, d: 5.5, w: 4.7 });
  s.tip = `${LESSONS[up]} ${original.tip}`;
  for (const b of s.balls || []) b.delay = Math.min(b.delay ?? 0, 5);
  return s;
}

export function prepareCampaign(levels) {
  return levels.map((level, li) => ({
    ...level,
    stages: level.stages.map((original, si) => {
      if (level.calibrated) return prepareLate(level, li, original, si);
      const s = structuredClone(original), route = level.route ?? ROUTES[li];
      s.surge = [1, 8, 9, 16, 19].includes(li) && si === 2 || li === 1;
      s.targetTime = si === 2 ? 32 : s.surge ? 16 : 23;
      // Equipment stays generous. Defenders become relevant sooner without adding more bodies.
      s.enemyScale = s.surge ? 1 : li === 0 ? 1.1 : 1.1 + li * 0.01;
      s.enemyWarmup = s.surge ? 0.35 : li === 0 ? 0.45 : 0.5;
      // The Moon opening has two investments before its crusher ladder can support a stream.
      if (li === 7 && si === 0) { s.enemyScale = 1; s.enemyWarmup = 0.35; }
      // Small, announced side attacks break up stationary play. Surge stages keep their free-fire rhythm.
      if (li >= 4 && !s.surge) s.flanks = {
        kind: FLANK_TYPES[level.theme] ?? 4, count: level.theme === 'moon' ? 1 : li >= 10 ? 4 : 3,
        start: si === 2 ? 8 : 8.5, every: 10, limit: si === 2 ? 1 : 2, warning: 1.4, firstSide: (li+si)%2, hpScale: 1.3,
      };
      if (s.tower) s.tower = Math.max(250, Math.round(s.tower * route[3]));
      if (s.boss) {
        const endurance = s.surge ? 1 : li === 0 ? 1.2 : li === 7 ? 1.25 : 1.8;
        s.boss.hp *= (li < 2 ? 0.9 : 0.8) * endurance * (BOSS_HP[li] ?? 1);
        if (!s.surge && li >= 2) {
          // Moon already alternates crushers across both lanes; another lane wipe stalls its army.
          if (li !== 7) s.boss.sweep = true;
          s.boss.cadence = 0.9;
          s.boss.opening = 2.8;
        }
      }
      const defenseScale = li === 0 ? 1.25 : s.surge ? 1.4 : 1.8 + li * 0.025;
      const supplyScale = si === 0 ? li === 7 ? 1.1 : 1.25 : 1.35 + si * 0.45;
      for (const g of s.gates) {
        if (g.hp) g.hp = Math.round(g.hp * defenseScale);
        // Front-line equipment used to cost up to a minute of unmultiplied shots.
        if (g.t === 'upgrade' || g.t === 'hangar') g.need = Math.round(Math.min(g.need, 18 + li * 2 + si * 8) * supplyScale);
        if (g.t === 'charge') g.per = Math.max(8, g.per * 0.6);
      }
      for (const defender of [...(s.spawners || []), ...(s.turrets || [])]) {
        defender.hp = Math.round(defender.hp * defenseScale);
      }
      const up = route[si];
      // Supply crates sit before the lane puzzles. Claim one, then choose your route.
      s.gates.unshift({ t: 'upgrade', up, need: Math.round((12 + li + si * 5) * supplyScale), x: si % 2 ? 3.4 : -3.4, d: 5.5, w: 4.7 });
      s.tip = `${LESSONS[up]} ${original.tip}`;
      // Short stationary routes are intentional. Longer fights gain a moving bonus lane.
      if (li >= 3 && !s.surge && si !== 2 && s.gates.length < 40) {
        s.gates.push({ t: 'mul', v: 3, x: 0, d: 43, w: 3.2, color: 'gold', slide: { amp: 4.5, speed: 0.48 } });
      }
      for (const b of s.balls || []) {
        b.delay = Math.min(b.delay ?? 0, 5);
        b.hp *= 0.7;
      }
      addVault(s, li + 1, si + 1);
      return s;
    }),
  }));
}
