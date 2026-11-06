import * as THREE from 'three';
import { sculptKit } from './troop-forms.js';

// Troop weapons held in the right hand. The grip sits at x 0.29, y 0.39, z 0.19
// in nominal troop units, and the bore runs along +z at about y 0.48.
const G = {
  dark: 0x152b42, body: 0x2b4963, edge: 0x6e8a9e,
  ivory: 0xfff0d0, cyan: 0x80efff, blue: 0x389ccc, amber: 0xffb448, glow: 0xd8fbff,
};
const X = 0.29;

// Loft along +z: sections are [z, half width, half height, x offset, y offset, power].
function body(k, sections, color, pos = [X, 0.48, 0], o) {
  k.loft(sections.map(([z, w, h, cx = 0, cy = 0, p]) => [z, w, h, cx, -cy, p ?? 1]), color, pos, [Math.PI / 2, 0, 0], 0, o);
}
function tube(k, r0, r1, z0, z1, y, color, x = X, sides) {
  k.cyl(r1, r0, z1 - z0, [x, y, (z0 + z1) / 2], color, [Math.PI / 2, 0, 0], sides);
}
function band(k, r, tube, y, z, color, x = X) { k.ring(r, tube, [x, y, z], color, [0, 0, 0]); }

function grip(k, magazine = true) {
  k.limb([[X, 0.45, 0.16], [X, 0.39, 0.18], [X, 0.33, 0.17]], [0.036, 0.034, 0.032], G.dark);
  if (magazine) body(k, [[0.27, 0.035, 0.05, 0, -0.06], [0.33, 0.038, 0.055, 0, -0.08], [0.36, 0.03, 0.04, 0, -0.09]], G.edge, [X, 0.44, 0], { segments: 6, steps: 2 });
}

function blaster(k) {
  grip(k);
  body(k, [[0.12, 0.05, 0.05], [0.16, 0.068, 0.068, 0, 0.005], [0.34, 0.066, 0.064], [0.41, 0.05, 0.045]], G.dark);
  body(k, [[0.15, 0.04, 0.02, 0, 0.065], [0.22, 0.05, 0.026, 0, 0.068], [0.38, 0.045, 0.022, 0, 0.062]], G.ivory);
  tube(k, 0.042, 0.036, 0.4, 0.6, 0.49, G.body);
  band(k, 0.055, 0.018, 0.49, 0.6, G.ivory);
  tube(k, 0.028, 0.028, 0.6, 0.625, 0.49, G.cyan);
  k.blob(1, [0.02, 0.012, 0.06], [X + 0.068, 0.49, 0.3], G.cyan);
  k.blob(1, [0.022, 0.018, 0.022], [X, 0.565, 0.18], G.amber);
}

function rocketLauncher(k) {
  grip(k, false);
  body(k, [[0.14, 0.05, 0.05], [0.2, 0.06, 0.06], [0.32, 0.055, 0.055]], G.dark, [X, 0.45, 0]);
  body(k, [[-0.02, 0.09, 0.09], [0.02, 0.112, 0.112], [0.1, 0.1, 0.1], [0.5, 0.1, 0.1], [0.58, 0.112, 0.112], [0.62, 0.105, 0.105]], G.body, [X, 0.58, 0]);
  for (const z of [0.06, 0.3, 0.56]) band(k, 0.108, 0.016, 0.58, z, G.ivory);
  body(k, [[0.6, 0.07, 0.07], [0.68, 0.075, 0.075], [0.76, 0.06, 0.06], [0.84, 0.02, 0.02]], G.amber, [X, 0.58, 0]);
  for (const s of [-1, 1]) k.plate([[0, 0], [0.09, 0.02], [0.1, -0.06], [0, -0.03]], 0.02, 0.005, G.blue, [X + s * 0.1, 0.58, 0.62], [0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]);
  body(k, [[0.24, 0.025, 0.03, 0, 0.13], [0.34, 0.03, 0.035, 0, 0.135]], G.dark, [X, 0.58, 0], { segments: 6, steps: 2 });
  k.blob(1, [0.018, 0.018, 0.012], [X, 0.745, 0.345], G.cyan);
}

function arcRifle(k) {
  grip(k);
  body(k, [[0.12, 0.055, 0.06], [0.18, 0.075, 0.075], [0.34, 0.07, 0.07], [0.42, 0.05, 0.05]], G.dark);
  body(k, [[0.2, 0.08, 0.03, 0, 0.05], [0.3, 0.085, 0.035, 0, 0.05], [0.38, 0.06, 0.025, 0, 0.045]], G.cyan, [X, 0.48, 0], { segments: 8, steps: 2 });
  tube(k, 0.05, 0.035, 0.4, 0.56, 0.49, G.body);
  for (const z of [0.43, 0.49, 0.55]) band(k, 0.058, 0.014, 0.49, z, G.cyan);
  for (const s of [-1, 1]) {
    k.limb([[X + s * 0.045, 0.49, 0.5], [X + s * 0.1, 0.5, 0.62], [X + s * 0.07, 0.49, 0.76]], [0.02, 0.018, 0.012], G.ivory);
    k.blob(0.022, [1, 1, 1], [X + s * 0.07, 0.49, 0.77], G.glow);
  }
  body(k, [[-0.34, 0.08, 0.08], [-0.3, 0.1, 0.1], [-0.25, 0.1, 0.1], [-0.22, 0.07, 0.07]], G.dark, [0, 0.49, 0]);
  band(k, 0.08, 0.014, 0.49, -0.35, G.cyan, 0);
  k.limb([[0.08, 0.47, -0.27], [0.25, 0.36, -0.15], [0.36, 0.38, 0.08], [0.33, 0.45, 0.2]], [0.016, 0.016, 0.016, 0.014], G.body);
}

function scattergun(k) {
  grip(k);
  body(k, [[0.12, 0.08, 0.06], [0.18, 0.09, 0.07], [0.32, 0.085, 0.065], [0.36, 0.07, 0.05]], G.body);
  for (const s of [-1, 1]) {
    tube(k, 0.042, 0.042, 0.3, 0.66, 0.5, G.dark, X + s * 0.05);
    band(k, 0.048, 0.014, 0.5, 0.66, G.ivory, X + s * 0.05);
  }
  body(k, [[0.38, 0.09, 0.04, 0, -0.07], [0.44, 0.095, 0.045, 0, -0.07], [0.54, 0.09, 0.04, 0, -0.07]], G.ivory, [X, 0.5, 0], { segments: 8, steps: 2 });
  k.blob(1, [0.025, 0.015, 0.05], [X, 0.565, 0.25], G.cyan);
  for (let i = 0; i < 3; i++) k.cyl(0.022, 0.022, 0.13, [-0.074 + i * 0.074, 0.48, -0.275], G.amber, [0, 0, 0], 6);
  k.cyl(0.13, 0.13, 0.03, [0, 0.415, -0.275], G.dark, [0, 0, 0], 10);
}

function railgun(k) {
  grip(k);
  body(k, [[0.02, 0.05, 0.05], [0.08, 0.07, 0.07], [0.34, 0.07, 0.07], [0.4, 0.055, 0.055]], G.dark);
  body(k, [[0.03, 0.055, 0.035, 0, 0.0], [0.13, 0.06, 0.04]], G.ivory, [X, 0.48, 0], { segments: 8, steps: 2 });
  for (const s of [-1, 1]) {
    body(k, [[0.36, 0.024, 0.055, s * 0.066, 0, 0.6], [0.6, 0.026, 0.06, s * 0.066, 0, 0.6], [0.86, 0.024, 0.055, s * 0.07, 0, 0.6], [0.9, 0.01, 0.03, s * 0.07]], G.body, [X, 0.49, 0], { segments: 8, steps: 3 });
    body(k, [[0.38, 0.012, 0.012, s * 0.066, 0.06], [0.84, 0.012, 0.012, s * 0.068, 0.06]], G.ivory, [X, 0.49, 0], { segments: 5, steps: 2 });
  }
  tube(k, 0.016, 0.016, 0.36, 0.86, 0.49, G.cyan, X, 6);
  for (const z of [0.46, 0.6, 0.74]) k.ring(0.085, 0.012, [X, 0.49, z], G.ivory, [0, 0, 0]);
  tube(k, 0.04, 0.032, 0.18, 0.36, 0.62, G.dark);
  k.blob(1, [0.025, 0.025, 0.01], [X, 0.62, 0.365], G.cyan);
}

function flamethrower(k) {
  grip(k, false);
  body(k, [[0.13, 0.055, 0.055], [0.18, 0.07, 0.068], [0.34, 0.065, 0.065], [0.4, 0.05, 0.05]], G.body);
  tube(k, 0.05, 0.045, 0.38, 0.54, 0.49, G.dark);
  body(k, [[0.53, 0.05, 0.05], [0.6, 0.065, 0.065], [0.68, 0.1, 0.1], [0.72, 0.11, 0.11], [0.73, 0.08, 0.08]], G.ivory);
  k.cyl(0.075, 0.075, 0.01, [X, 0.48, 0.728], G.dark, [Math.PI / 2, 0, 0], 10);
  k.blob(1, [0.035, 0.035, 0.01], [X, 0.48, 0.733], G.amber);
  k.limb([[X, 0.4, 0.42], [X, 0.38, 0.6], [X, 0.4, 0.68]], [0.014, 0.014, 0.012], G.dark);
  k.blob(0.024, [1, 1, 1.2], [X, 0.405, 0.69], G.amber);
  for (const s of [-1, 1]) {
    k.loft([[-0.15, 0.04, 0.04], [-0.12, 0.068, 0.068], [0.12, 0.068, 0.068], [0.15, 0.04, 0.04]], G.amber, [s * 0.082, 0.48, -0.277]);
    k.ring(0.07, 0.012, [s * 0.082, 0.39, -0.277], G.dark);
    k.ring(0.07, 0.012, [s * 0.082, 0.57, -0.277], G.dark);
  }
  k.limb([[0.1, 0.4, -0.29], [0.3, 0.29, -0.12], [0.39, 0.34, 0.1], [0.33, 0.41, 0.25]], [0.022, 0.022, 0.022, 0.02], G.dark);
}

function frostProjector(k) {
  grip(k, false);
  body(k, [[0.13, 0.055, 0.058], [0.18, 0.07, 0.07], [0.34, 0.068, 0.068], [0.4, 0.05, 0.05]], G.body);
  body(k, [[0.36, 0.06, 0.06], [0.48, 0.085, 0.085], [0.58, 0.1, 0.1], [0.64, 0.09, 0.09], [0.65, 0.06, 0.06]], G.ivory);
  band(k, 0.098, 0.018, 0.48, 0.6, G.blue);
  body(k, [[0.64, 0.05, 0.05], [0.7, 0.035, 0.035], [0.78, 0.005, 0.005]], G.cyan, [X, 0.48, 0], { segments: 6, steps: 2 });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    k.plate([[0, 0], [0.16, 0], [0.12, 0.06], [0.02, 0.05]], 0.02, 0.005, G.ivory, [X + Math.sin(a) * 0.08, 0.48 + Math.cos(a) * 0.08, 0.46], [0, -Math.PI / 2, -a + Math.PI / 2]);
  }
  k.loft([[-0.15, 0.06, 0.06], [-0.12, 0.1, 0.1], [0.12, 0.1, 0.1], [0.15, 0.06, 0.06]], G.cyan, [0, 0.48, -0.285]);
  for (const y of [0.37, 0.59]) k.ring(0.105, 0.014, [0, y, -0.285], G.dark);
  for (const s of [-1, 1]) k.gem(0.03, [s * 0.11, 0.48, -0.285], G.glow, 1.8);
}

function plasmaCaster(k) {
  grip(k, false);
  body(k, [[0.12, 0.06, 0.055], [0.17, 0.075, 0.07], [0.3, 0.07, 0.065], [0.34, 0.05, 0.05]], G.dark, [X, 0.46, 0]);
  k.blob(0.14, [1, 0.92, 1.05], [X, 0.5, 0.42], G.blue);
  k.blob(0.1, [1, 1, 1.1], [X, 0.505, 0.47], G.glow);
  for (const z of [0.36, 0.48]) k.ring(0.138, 0.02, [X, 0.5, z], G.ivory, [0, 0, 0]);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const x = X + Math.sin(a) * 0.105, y = 0.5 + Math.cos(a) * 0.105;
    k.limb([[x, y, 0.48], [X + Math.sin(a) * 0.12, 0.5 + Math.cos(a) * 0.12, 0.6], [X + Math.sin(a) * 0.075, 0.5 + Math.cos(a) * 0.075, 0.7]], [0.025, 0.022, 0.012], G.body);
  }
  k.blob(0.055, [1, 1, 1], [X, 0.5, 0.64], G.cyan);
  body(k, [[-0.33, 0.1, 0.1], [-0.3, 0.12, 0.12], [-0.22, 0.12, 0.12], [-0.2, 0.09, 0.09]], G.dark, [0, 0.49, 0]);
  k.blob(1, [0.06, 0.06, 0.02], [0, 0.49, -0.34], G.cyan);
}

const WEAPONS = [null, blaster, rocketLauncher, arcRifle, scattergun, railgun, flamethrower, frostProjector, plasmaCaster];
const NAMES = [null, 'Blaster', 'Rocket launcher', 'Arc rifle', 'Scattergun', 'Railgun', 'Flamethrower', 'Frost projector', 'Plasma caster'];

/** Includes the overlay's 1.2 scale and right-hand placement. 'low' halves the segment counts for distant troops. */
export function sculptedWeaponGeometry(id, detail = 'high') {
  const kind = Number.isInteger(id) && WEAPONS[id] ? id : 1;
  const k = sculptKit(detail === 'low', false);
  WEAPONS[kind](k);
  const geometry = k.b.finish().scale(1.2, 1.2, 1.2);
  geometry.name = NAMES[kind] + (detail === 'low' ? ' low' : '');
  return geometry;
}
