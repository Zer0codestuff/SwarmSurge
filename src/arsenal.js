// Shared gameplay values. Rank depends on the power of one troop, not army size.
export const RANKS = [
  { min: 1, name: 'Recruit', color: 0x42a5ff },
  { min: 4, name: 'Scout', color: 0x41e5ec },
  { min: 16, name: 'Ranger', color: 0x81efbc },
  { min: 64, name: 'Vanguard', color: 0x21c878 },
  { min: 256, name: 'Captain', color: 0xc9ec48 },
  { min: 4096, name: 'Elite', color: 0xffcf45 },
  { min: 65536, name: 'Inferno', color: 0xff8b42 },
  { min: 1e6, name: 'Crimson', color: 0xff627e },
  { min: 1e9, name: 'Mythic', color: 0xad7bff },
  { min: 1e12, name: 'Nova', color: 0xf47ae3 },
  { min: 1e16, name: 'Astral', color: 0xd4f1ff },
  { min: 1e21, name: 'Solar', color: 0xfff2af },
  { min: 1e26, name: 'Prismatic', color: 0xffffff },
];
export function rankOf(power) {
  let rank = 0;
  while (rank + 1 < RANKS.length && power >= RANKS[rank + 1].min) rank++;
  return rank;
}
export const WEAPON_SPECS = [
  null,
  { key: 'rifle', name: 'Blasters', range: 8, damage: .3, cooldown: .95, color: 0xc2f2ff },
  { key: 'rockets', name: 'Rockets', range: 10, damage: .85, cooldown: 1.25, color: 0xffb454, splash: 1.6 },
  { key: 'arc', name: 'Arc rifles', range: 8, damage: .5, cooldown: .8, color: 0x8affed, chain: 2 },
  { key: 'scatter', name: 'Scatterguns', range: 5.8, damage: .42, cooldown: .72, color: 0xffe0a3, cone: .82, targets: 3 },
  { key: 'rail', name: 'Railguns', range: 15, damage: 1.1, cooldown: 1.65, color: 0xb4b0ff, pierce: 3 },
  { key: 'flame', name: 'Flamethrowers', range: 4.5, damage: .13, cooldown: .3, color: 0xff8b42, cone: .7, targets: 6, burn: 2 },
  { key: 'frost', name: 'Frost projectors', range: 9, damage: .35, cooldown: .7, color: 0x80eaff, chill: 1.8, splash: 1.3 },
  { key: 'plasma', name: 'Plasma casters', range: 11, damage: .8, cooldown: 1.1, color: 0xff8dec, splash: 2.4 },
  // Mortars lob over gates and walls. Shock lances shove enemies back up the road.
  { key: 'mortar', name: 'Mortars', range: 13, damage: 1.15, cooldown: 1.9, color: 0xffe27a, splash: 2.2, lob: true },
  { key: 'shock', name: 'Shock lances', range: 6.5, damage: .5, cooldown: .85, color: 0x9dffb0, knock: 1.6, chill: .5 },
];
export const WEAPONS = ['Unarmed', ...WEAPON_SPECS.slice(1).map(spec => spec.name)];
export const WEAPON_IDS = Object.fromEntries(WEAPON_SPECS.slice(1).map((spec, i) => [spec.key, i + 1]));
export const CHASSIS_SPECS = [
  null,
  { key: 'bulldog', name: 'Bulldog tank', power: 2, guns: 1, armor: 3 },
  { key: 'siege', name: 'Siege crawler', power: 2, guns: 2, armor: 4 },
  { key: 'spider', name: 'Spider mech', power: 2, guns: 1, armor: 3, weapon: 4, rate: 2 },
  { key: 'hover', name: 'Hover fortress', power: 2, guns: 1, armor: 4, weapon: 7, rate: 2 },
  { key: 'railfort', name: 'Rail fortress', power: 3, guns: 1, armor: 5, weapon: 5 },
  { key: 'titan', name: 'Titan walker', power: 3, guns: 2, armor: 6, weapon: 8, rate: 2, aircraft: 1 },
  // Forms past the Titan carry a timed ability. Crates named 'tank' stop evolving at the Titan.
  { key: 'lancer', name: 'Prism lancer', power: 3, guns: 1, armor: 5, weapon: 10, rate: 2, ability: 'lance' },
  { key: 'dread', name: 'Dreadnought', power: 3, guns: 2, armor: 6, weapon: 9, rate: 2, ability: 'barrage' },
];
export const TANK_EVOLUTION_CAP = 6;
// Form abilities fire on their own. Damage follows the army like air strikes; target damage is capped per use.
export const ABILITY_SPECS = {
  lance: { name: 'Prism lance', every: 4.5, first: 1.5, width: 1.15, army: .2, base: 30, targetCap: .025, blockerShare: .15 },
  barrage: { name: 'Barrage', every: 6, first: 2, shells: 4, radius: 2.6, flight: .85, army: .14, base: 24, targetCap: .01 },
};
export const CHASSIS = ['Cannon', ...CHASSIS_SPECS.slice(1).map(spec => spec.name)];
export const CHASSIS_IDS = Object.fromEntries(CHASSIS_SPECS.slice(1).map((spec, i) => [spec.key, i + 1]));
export const AIRCRAFT_SPECS = [
  null,
  { name: 'Scout interceptor', label: 'Interceptor', damage: 1, width: 3, fortCap: .065, radius: 2.5 },
  { name: 'Strike jet', label: 'Strike jet', damage: 1.25, width: 3.6, fortCap: .07, radius: 2.85 },
  { name: 'Stealth bomber', label: 'Stealth bomber', damage: 1.5, width: 4.2, fortCap: .08, radius: 3.2 },
];

// Test relative motion, so a rolling ball and a fast troop cannot tunnel through each other.
export function sweptCircle(ax0, az0, ax1, az1, bx0, bz0, bx1, bz1, radius) {
  const x = ax0 - bx0, z = az0 - bz0;
  const dx = ax1 - bx1 - x, dz = az1 - bz1 - z;
  const length = dx * dx + dz * dz;
  const t = length > 1e-12 ? Math.max(0, Math.min(1, -(x * dx + z * dz) / length)) : 0;
  return (x + dx * t) ** 2 + (z + dz * t) ** 2 <= radius * radius;
}
