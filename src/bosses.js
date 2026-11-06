// Bosses for worlds 11 through 20 share the same animation contract as core bosses.
import { buildLateBoss } from './boss-assets-late.js';

export function buildBoss2(type) {
  const model = buildLateBoss(type);
  if (model) model.normalizedAttack = true;
  return model;
}
