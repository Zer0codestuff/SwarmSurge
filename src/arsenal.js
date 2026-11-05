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
export const WEAPONS = ['Unarmed', 'Blasters', 'Rockets', 'Arc rifles'];
export const CHASSIS = ['Cannon', 'Bulldog tank', 'Siege crawler'];

// Test relative motion, so a rolling ball and a fast troop cannot tunnel through each other.
export function sweptCircle(ax0, az0, ax1, az1, bx0, bz0, bx1, bz1, radius) {
  const x = ax0 - bx0, z = az0 - bz0;
  const dx = ax1 - bx1 - x, dz = az1 - bz1 - z;
  const length = dx * dx + dz * dz;
  const t = length > 1e-12 ? Math.max(0, Math.min(1, -(x * dx + z * dz) / length)) : 0;
  return (x + dx * t) ** 2 + (z + dz * t) ** 2 <= radius * radius;
}
