// Bosses for worlds 11 through 20 share the same animation contract as core bosses.
import { buildSculptedLate } from './boss-sculpted-late.js';
import { buildSculptedRoyal } from './boss-sculpted-royal.js';
import { buildSculptedCarnival } from './boss-sculpted-carnival.js';
import { buildSculptedWild } from './boss-sculpted-wild.js';

export function buildBoss2(type) {
  const model = buildSculptedRoyal(type) ?? buildSculptedLate(type) ?? buildSculptedCarnival(type) ?? buildSculptedWild(type);
  if (model) model.normalizedAttack = true;
  return model;
}
