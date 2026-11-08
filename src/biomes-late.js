// Biome data for worlds 21-50. Pure data: palettes, lighting, ambient particles, fort styling and map art.
// Decor lives in decor-late.js so this module stays free of renderer imports.
import { BIOMES as ARCS_A } from './biomes-21.js';
import { BIOMES as ARCS_B } from './biomes-36.js';

export const LATE_BIOMES = { ...ARCS_A, ...ARCS_B };
const pick = key => Object.fromEntries(Object.entries(LATE_BIOMES).filter(([, b]) => b[key] !== undefined).map(([t, b]) => [t, b[key]]));
export const LATE_PALETTES = pick('palette');
export const LATE_LIGHTS = pick('lights');
export const LATE_AMBIENT = pick('ambient');
export const LATE_FLANKS = pick('flank');
export const LATE_POSTS = pick('post');
export const LATE_FORT_FAMILY = Object.fromEntries(Object.entries(LATE_BIOMES).map(([t, b]) => [t, b.fort?.family ?? 'bastion']));
export const LATE_FORT_TRIM = Object.fromEntries(Object.entries(LATE_BIOMES).filter(([, b]) => b.fort?.trim !== undefined).map(([t, b]) => [t, b.fort.trim]));
export const LATE_FORT_LIGHT = Object.fromEntries(Object.entries(LATE_BIOMES).filter(([, b]) => b.fort?.light !== undefined).map(([t, b]) => [t, b.fort.light]));
export const LATE_GLOW_ROAD = new Set(Object.entries(LATE_BIOMES).filter(([, b]) => b.glowRoad).map(([t]) => t));
export function lateMapArt(theme, colors) { return LATE_BIOMES[theme]?.art?.(colors) ?? null; }
