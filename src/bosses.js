// Bosses for worlds 11 through 20 share the same animation contract as core bosses.
import { buildSculptedLate } from './boss-sculpted-late.js';
import { buildSculptedRoyal } from './boss-sculpted-royal.js';

export function buildBoss2(type) {
  const model = buildSculptedRoyal(type) ?? buildSculptedLate(type);
  if (model) model.normalizedAttack = true;
  return model;
}
