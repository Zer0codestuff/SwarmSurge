import * as THREE from 'three';
import { troopBuilder } from './unit-assets.js';
import { loftGeometry, sweepGeometry, patchGeometry } from './boss-shapes.js';

// Allied troops change body form as their rank rises. Every form keeps the hip
// pivot, hand anchors and footprint of the original infantry, so weapon overlays,
// stride animation, shadows and collision stay valid across ranks.
export const TROOP_FORMS = ['Surge bot', 'Trooper', 'Paladin', 'Ascended', 'Sunwing', 'Aegis Guard'];
export const SUNWING_FORM = TROOP_FORMS.indexOf('Sunwing');
export const AEGIS_FORM = TROOP_FORMS.indexOf('Aegis Guard');
const FORM_OF_RANK = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3];
export function troopForm(rank) {
  return FORM_OF_RANK[Math.max(0, Math.min(FORM_OF_RANK.length - 1, rank | 0))];
}

// Pale parts take the rank color from the instance tint. Dark parts stay readable.
const C = {
  armor: 0xe6f3ff, trim: 0xfff4da, dark: 0x16304a, joint: 0x2a4a66,
  light: 0xb8fbff, mid: 0x86c6f0, amber: 0xffc35a, visor: 0xf2ffff, cloth: 0xb4d3ea,
};
const HAND_R = [0.29, 0.425, 0.19], HAND_L = [-0.265, 0.43, 0.16];
const TAU = Math.PI * 2;

export function sculptKit(low, animated = true) {
  const b = troopBuilder(animated, low);
  const seg = low ? 6 : 8, step = low ? 2 : 4;
  return {
    b, low,
    loft(sections, color, pos = [0, 0, 0], rot = [0, 0, 0], leg = 0, o = {}) {
      b.add(loftGeometry(sections, { segments: o.segments ?? seg, steps: o.steps ?? step, warp: o.warp }), color, pos, rot, leg);
    },
    limb(points, radii, color, leg = 0) {
      b.add(sweepGeometry(points, radii, { segments: low ? 4 : 6, steps: low ? 2 : 3 }), color, [0, 0, 0], [0, 0, 0], leg);
    },
    blob(r, scale, pos, color, leg = 0, rot = [0, 0, 0]) {
      b.add(new THREE.SphereGeometry(r, low ? 5 : 8, low ? 3 : 5).scale(...scale), color, pos, rot, leg);
    },
    plate(outline, depth, bulge, color, pos, rot = [0, 0, 0], leg = 0) {
      b.add(patchGeometry(outline, depth, bulge, { segments: low ? 6 : 10, rings: 1 }), color, pos, rot, leg);
    },
    ring(r, tube, pos, color, rot = [Math.PI / 2, 0, 0], arc = TAU) {
      b.add(new THREE.TorusGeometry(r, tube, 3, low ? 8 : 12, arc), color, pos, rot);
    },
    cyl(top, bottom, h, pos, color, rot = [0, 0, 0], sides) {
      b.add(new THREE.CylinderGeometry(top, bottom, h, sides ?? (low ? 5 : 8)), color, pos, rot);
    },
    gem(r, pos, color, stretch = 1.6, rot = [0, 0, 0]) {
      b.add(new THREE.OctahedronGeometry(r, 0).scale(1, stretch, 1), color, pos, rot);
    },
  };
}

function finish(k, name) {
  const geometry = k.b.finish();
  geometry.name = name + (k.low ? ' low' : '');
  geometry.userData.detail = k.low ? 'low' : 'high';
  return geometry;
}

// Sweeps run shoulder, elbow, wrist so both arms read as bent and holding forward.
function arm(k, s, radius, color, shoulder = 0.6) {
  const hand = s > 0 ? HAND_R : HAND_L;
  k.limb([[s * 0.215, shoulder, -0.005], [s * 0.272, shoulder - 0.12, -0.02], [hand[0], hand[1] + 0.02, hand[2] - 0.1], hand],
    [radius, radius * 0.88, radius * 0.82, radius * 0.72], color);
  return hand;
}

// ------------------------------------------------------------ rank 1-3: Surge bot
function surgeBot(low) {
  const k = sculptKit(low);
  for (const s of [-1, 1]) {
    const x = s * 0.105;
    k.loft([[0.07, 0.048, 0.052], [0.2, 0.052, 0.056], [0.34, 0.066, 0.066]], C.joint, [x, 0, 0], undefined, s);
    k.loft([[0, 0.07, 0.115, 0, 0.035, 0.7], [0.055, 0.078, 0.122, 0, 0.035, 0.7], [0.115, 0.058, 0.08, 0, 0.012]], C.armor, [x, 0, 0], undefined, s);
    if (!low) k.blob(0.052, [1, 0.9, 0.85], [x, 0.205, 0.025], C.mid, s);
    if (!low) k.blob(1, [0.06, 0.016, 0.05], [x, 0.012, 0.07], C.dark, s);
    arm(k, s, 0.05, C.armor);
    k.blob(0.075, [1, 0.9, 1], [s * 0.21, 0.6, -0.005], C.mid);
    k.blob(0.05, [1, 1, 1.1], s > 0 ? HAND_R : HAND_L, C.dark);
    // Round ear discs frame the face from every angle.
    k.cyl(0.062, 0.062, 0.045, [s * 0.218, 0.83, 0], C.mid, [0, 0, Math.PI / 2]);
    if (!low) k.cyl(0.036, 0.036, 0.05, [s * 0.223, 0.83, 0], C.light, [0, 0, Math.PI / 2]);
  }
  k.blob(0.15, [1, 0.5, 0.8], [0, 0.35, 0], C.dark);
  k.loft([[0.34, 0.13, 0.105], [0.41, 0.172, 0.128], [0.51, 0.19, 0.14], [0.6, 0.178, 0.132], [0.665, 0.1, 0.085]], C.armor);
  k.plate([[-0.1, 0.06], [0.1, 0.06], [0.11, -0.05], [0, -0.075], [-0.11, -0.05]], 0.03, 0.025, C.mid, [0, 0.505, 0.128]);
  k.blob(1, [0.06, 0.022, 0.02], [0, 0.515, 0.162], C.light);
  if (!low) k.blob(1, [0.018, 0.018, 0.012], [0.07, 0.48, 0.158], C.amber);
  // Raised ceramic rails protect the exposed battery down the back.
  for (const side of [-1, 1]) {
    k.limb([[side*.075,.415,-.192],[side*.095,.50,-.219],[side*.08,.61,-.207]],
      [.018,.023,.015], C.mid);
  }
  // Battery pack
  k.loft([[0.4, 0.1, 0.055], [0.5, 0.115, 0.065], [0.62, 0.1, 0.055], [0.65, 0.04, 0.03]], C.dark, [0, 0, -0.165]);
  k.blob(1, [0.035, 0.05, 0.015], [0, 0.52, -0.232], C.light);
  // Domed head with a curved visor and two glowing eyes.
  k.cyl(0.075, 0.09, 0.06, [0, 0.655, 0], C.dark);
  k.loft([[0.665, 0.07, 0.07], [0.69, 0.175, 0.16], [0.77, 0.228, 0.2], [0.875, 0.218, 0.195], [0.955, 0.162, 0.148], [1.0, 0.04, 0.04]], C.armor);
  k.blob(1, [0.185, 0.075, 0.09], [0, 0.825, 0.122], C.dark);
  for (const s of [-1, 1]) k.blob(1, [0.04, 0.034, 0.02], [s * 0.072, 0.83, 0.206], C.visor);
  k.limb([[0.075, 0.975, -0.02], [0.1, 1.06, -0.04], [0.115, 1.12, -0.055]], [0.013, 0.011, 0.01], C.dark);
  k.blob(0.034, [1, 1, 1], [0.115, 1.13, -0.056], C.light);
  return finish(k, 'Surge bot');
}

// ------------------------------------------------------------ rank 4-6: Trooper
// A toy-soldier read: tinted uniform and face, dark boots, gloves and gear.
function trooper(low) {
  const k = sculptKit(low);
  for (const s of [-1, 1]) {
    const x = s * 0.105;
    k.loft([[0.08, 0.05, 0.056], [0.18, 0.058, 0.064], [0.35, 0.078, 0.076]], C.cloth, [x, 0, 0], undefined, s);
    if (!low) k.blob(1, [0.052, 0.05, 0.036], [x, 0.2, 0.052], C.dark, s);
    k.loft([[0, 0.07, 0.12, 0, 0.03, 0.75], [0.07, 0.072, 0.118, 0, 0.025, 0.75], [0.13, 0.058, 0.068, 0, 0]], C.dark, [x, 0, 0], undefined, s);
    arm(k, s, 0.05, C.cloth);
    k.blob(1, [0.07, 0.05, 0.08], [s * 0.21, 0.605, -0.005], C.joint);
    k.blob(0.048, [1, 1, 1.1], s > 0 ? HAND_R : HAND_L, C.dark);
  }
  k.loft([[0.32, 0.13, 0.1], [0.4, 0.155, 0.112], [0.5, 0.18, 0.118], [0.6, 0.185, 0.118], [0.665, 0.1, 0.08]], C.cloth);
  // Plate carrier, pouches and belt in dark webbing.
  k.plate([[-0.13, 0.11], [-0.05, 0.13], [0.05, 0.13], [0.13, 0.11], [0.135, -0.1], [0, -0.11], [-0.135, -0.1]], 0.05, 0.03, C.mid, [0, 0.49, 0.098]);
  for (const x of low ? [] : [-0.075, 0, 0.075]) k.blob(1, [0.033, 0.036, 0.022], [x, 0.43, 0.15], C.dark);
  k.ring(0.152, 0.026, [0, 0.355, 0], C.dark);
  if (!low) k.blob(1, [0.03, 0.022, 0.014], [0, 0.355, 0.172], C.amber);
  // Rucksack with a rolled mat and radio whip.
  k.loft([[0.37, 0.115, 0.06], [0.47, 0.13, 0.075], [0.6, 0.12, 0.07], [0.66, 0.06, 0.04]], C.joint, [0, 0, -0.175]);
  if (!low) k.cyl(0.045, 0.045, 0.27, [0, 0.685, -0.185], C.cloth, [0, 0, Math.PI / 2]);
  if (!low) k.limb([[0.09, 0.62, -0.215], [0.105, 0.84, -0.24], [0.115, 0.97, -0.26]], [0.009, 0.007, 0.005], C.dark);
  // Face with eyes, a rounded helmet with brim and goggles resting on it.
  k.cyl(0.065, 0.075, 0.06, [0, 0.66, 0], C.cloth);
  k.loft([[0.67, 0.08, 0.08], [0.7, 0.13, 0.125, 0, 0.012], [0.79, 0.152, 0.152, 0, 0.015], [0.87, 0.148, 0.148], [0.92, 0.1, 0.1]], C.trim);
  k.blob(1, [0.15, 0.03, 0.04], [0, 0.812, 0.13], C.dark);
  for (const s of [-1, 1]) {
    k.blob(1, [0.05, 0.042, 0.028], [s * 0.056, 0.812, 0.15], C.dark);
    k.blob(1, [0.038, 0.032, 0.02], [s * 0.056, 0.813, 0.166], C.visor);
  }
  k.loft([[0.835, 0.212, 0.222, 0, 0.005], [0.855, 0.205, 0.215, 0, 0.005], [0.93, 0.185, 0.195, 0, -0.005], [1.0, 0.125, 0.135, 0, -0.012], [1.04, 0.02, 0.02, 0, -0.015]], C.armor);
  return finish(k, 'Trooper');
}

// ------------------------------------------------------------ rank 7-9: Paladin
function paladin(low) {
  const k = sculptKit(low);
  for (const s of [-1, 1]) {
    const x = s * 0.112;
    k.loft([[0.1, 0.056, 0.06], [0.2, 0.066, 0.07], [0.34, 0.085, 0.085]], C.dark, [x, 0, 0], undefined, s);
    k.loft([[0, 0.075, 0.13, 0, 0.04, 0.75], [0.06, 0.08, 0.125, 0, 0.035, 0.8], [0.12, 0.074, 0.085, 0, 0.012], [0.25, 0.07, 0.074, 0, 0.012], [0.28, 0.04, 0.04]], C.armor, [x, 0, 0], undefined, s);
    k.blob(1, [0.06, 0.058, 0.045], [x, 0.235, 0.06], C.trim, s);
    if (!low) k.plate([[-0.075, 0.06], [0.075, 0.06], [0.07, -0.07], [0, -0.09], [-0.07, -0.07]], 0.025, 0.03, C.armor, [x, 0.3, 0.095], [-0.15, 0, 0], s);
    arm(k, s, 0.058, C.dark, 0.58);
    if (!low) k.loft([[-0.14, 0.05, 0.05], [-0.08, 0.07, 0.068], [-0.02, 0.062, 0.06]], C.armor, s > 0 ? HAND_R : HAND_L, [1.3, 0, 0]);
    k.blob(0.052, [1, 1, 1.1], s > 0 ? HAND_R : HAND_L, C.joint);
    // Domed pauldrons sit over the shoulder ball with a gold rim.
    k.loft([[-0.075, 0.1, 0.105], [-0.02, 0.128, 0.13], [0.045, 0.112, 0.118], [0.09, 0.06, 0.065], [0.105, 0.01, 0.01]], C.armor, [s * 0.235, 0.575, -0.005], [0, 0, -s * 0.42]);
    k.ring(0.116, 0.016, [s * 0.205, 0.512, -0.005], C.amber, [Math.PI / 2, -s * 0.42, 0]);
  }
  k.blob(0.16, [1, 0.5, 0.82], [0, 0.35, 0], C.dark);
  k.loft([[0.33, 0.145, 0.115], [0.42, 0.185, 0.132], [0.53, 0.215, 0.15], [0.62, 0.2, 0.14], [0.675, 0.11, 0.09]], C.armor);
  k.plate([[-0.15, 0.08], [0.15, 0.08], [0.12, -0.06], [0, -0.13], [-0.12, -0.06]], 0.035, 0.04, C.trim, [0, 0.54, 0.125]);
  k.blob(0.042, [1, 1, 0.6], [0, 0.535, 0.18], C.light);
  if (!low) k.ring(0.05, 0.012, [0, 0.535, 0.178], C.amber, [0, 0, 0]);
  // Waist tabard and a short cape keep the knightly silhouette.
  if (!low) k.plate([[-0.07, 0.04], [0.07, 0.04], [0.06, -0.16], [0, -0.19], [-0.06, -0.16]], 0.02, 0.02, C.dark, [0, 0.35, 0.13], [-0.12, 0, 0]);
  k.plate([[-0.16, 0.1], [0.16, 0.1], [0.21, -0.3], [0.08, -0.34], [0, -0.31], [-0.08, -0.34], [-0.21, -0.3]], 0.02, 0.06, C.dark, [0, 0.58, -0.17], [0.12, Math.PI, 0]);
  // Great helm with a dark face recess, glowing slit and crest.
  k.cyl(0.08, 0.09, 0.06, [0, 0.67, 0], C.dark);
  k.loft([[0.67, 0.1, 0.1], [0.71, 0.165, 0.17], [0.8, 0.182, 0.19, 0, 0.005], [0.9, 0.172, 0.18], [0.975, 0.125, 0.13], [1.0, 0.03, 0.03]], C.armor);
  k.blob(1, [0.14, 0.055, 0.06], [0, 0.83, 0.14], C.dark);
  k.blob(1, [0.11, 0.016, 0.03], [0, 0.835, 0.182], C.light);
  k.blob(1, [0.02, 0.06, 0.025], [0, 0.765, 0.178], C.dark);
  k.plate([[-0.17, 0], [-0.12, 0.09], [0.04, 0.13], [0.18, 0.06], [0.2, -0.01]], 0.03, 0.01, C.amber, [0, 0.975, -0.02], [0, Math.PI / 2, 0]);
  return finish(k, 'Paladin');
}

// ------------------------------------------------------------ rank 10-13: Ascended
function ascended(low) {
  const k = sculptKit(low);
  for (const s of [-1, 1]) {
    const x = s * 0.1;
    k.loft([[0.1, 0.042, 0.048], [0.2, 0.05, 0.058], [0.34, 0.07, 0.07]], C.dark, [x, 0, 0], undefined, s);
    k.loft([[0, 0.05, 0.11, 0, 0.05, 0.8], [0.04, 0.06, 0.1, 0, 0.035], [0.12, 0.065, 0.07, 0, 0.012], [0.24, 0.058, 0.062, 0, 0.02], [0.27, 0.02, 0.03, 0, 0.04]], C.armor, [x, 0, 0], undefined, s);
    if (!low) k.gem(0.038, [x, 0.215, 0.07], C.light, 1.3);
    arm(k, s, 0.045, C.armor);
    k.blob(0.042, [1, 1, 1.15], s > 0 ? HAND_R : HAND_L, C.light);
    k.loft([[-0.06, 0.075, 0.08], [0, 0.085, 0.09], [0.06, 0.06, 0.065], [0.09, 0.01, 0.01]], C.mid, [s * 0.215, 0.6, -0.005], [0, 0, -s * 0.4]);
    // Light wings rise in a V behind the head, readable from the chase camera.
    const wing = [[0, 0], [0.08, 0.12], [0.2, 0.36], [0.27, 0.56], [0.24, 0.34], [0.16, 0.12], [0.06, -0.04]].map(([u, v]) => [s * u, v]);
    k.plate(wing, 0.018, 0.015, C.light, [s * 0.06, 0.6, -0.16], [-0.3, s * 0.35, 0]);
    if (!low) {
      const lower = [[0, 0], [0.1, 0.06], [0.28, 0.2], [0.34, 0.27], [0.2, 0.08], [0.05, -0.05]].map(([u, v]) => [s * u, v]);
      k.plate(lower, 0.014, 0.01, C.mid, [s * 0.07, 0.55, -0.15], [-0.15, s * 0.4, 0]);
      k.gem(0.032, [s * 0.31, 0.75, -0.02], C.light);
    }
  }
  k.blob(0.13, [1, 0.5, 0.8], [0, 0.35, 0], C.dark);
  k.loft([[0.33, 0.11, 0.09], [0.4, 0.13, 0.1], [0.5, 0.175, 0.122], [0.6, 0.195, 0.128], [0.665, 0.1, 0.08]], C.armor);
  k.plate([[-0.12, 0.08], [0.12, 0.08], [0.03, -0.12], [0, -0.15], [-0.03, -0.12]], 0.03, 0.03, C.trim, [0, 0.55, 0.112]);
  k.gem(0.045, [0, 0.54, 0.162], C.light, 1.4);
  // Smooth helm, dark face plate with glowing eyes, crystal crest and halo.
  k.cyl(0.06, 0.075, 0.07, [0, 0.665, 0], C.dark);
  k.loft([[0.67, 0.07, 0.07], [0.71, 0.14, 0.15], [0.81, 0.162, 0.172, 0, 0.004], [0.92, 0.148, 0.158, 0, -0.008], [0.99, 0.1, 0.11, 0, -0.018], [1.02, 0.015, 0.02, 0, -0.02]], C.armor);
  k.blob(1, [0.12, 0.065, 0.06], [0, 0.825, 0.128], C.dark);
  for (const s of [-1, 1]) k.blob(1, [0.035, 0.016, 0.014], [s * 0.048, 0.83, 0.183], C.visor, 0, [0, 0, s * 0.25]);
  for (const s of low ? [0] : [-1, 0, 1]) k.gem(s ? 0.026 : 0.036, [s * 0.07, 1.03 - Math.abs(s) * 0.03, -0.03], C.light, 2.2, [0, 0, -s * 0.35]);
  k.ring(0.16, 0.017, [0, 1.15, -0.07], C.light, [Math.PI / 2 - 0.3, 0, 0]);
  return finish(k, 'Ascended');
}

// ------------------------------------------------------------ enemy raider
// Same anchors as the allied bot so enemy overlays (bomb, shield, jetpack, shell)
// still sit on the body. Horns and a slanted visor make the faction readable.
const E = {
  armor: 0xffe9df, trim: 0xffdba4, dark: 0x351e2d, joint: 0x5a3549,
  light: 0xffc27b, mid: 0xffcfb4, visor: 0xfff1c0,
};
function raider(low) {
  const k = sculptKit(low);
  for (const s of [-1, 1]) {
    const x = s * 0.11;
    k.loft([[0.07, 0.05, 0.055], [0.2, 0.056, 0.06], [0.34, 0.07, 0.07]], E.joint, [x, 0, 0], undefined, s);
    k.loft([[0, 0.072, 0.12, 0, 0.035, 0.7], [0.06, 0.078, 0.122, 0, 0.03, 0.7], [0.12, 0.06, 0.075, 0, 0.01]], E.dark, [x, 0, 0], undefined, s);
    if (!low) k.blob(1, [0.055, 0.05, 0.04], [x, 0.205, 0.045], E.mid, s);
    arm(k, s, 0.052, E.armor);
    k.blob(0.05, [1, 1, 1.1], s > 0 ? HAND_R : HAND_L, E.dark);
    // Spiked shoulder guards
    k.loft([[-0.05, 0.085, 0.09], [0.01, 0.095, 0.1], [0.06, 0.06, 0.065], [0.08, 0.01, 0.01]], E.mid, [s * 0.215, 0.6, -0.005], [0, 0, -s * 0.4]);
    if (!low) k.b.add(new THREE.ConeGeometry(0.03, 0.1, 5), E.trim, [s * 0.255, 0.69, -0.01], [0, 0, -s * 0.5]);
    // A swept cheek plate leaves the visor exposed and gives the jaw two points.
    k.plate([[-.045,.05],[.043,.035],[.032,-.027],[-.012,-.088],[-.039,-.021]],
      .024,.012,E.mid,[s*.15,.77,.15],[0,s*.56,s*.12]);
    // Curved horns sweep out and up from the helmet.
    k.limb([[s * 0.15, 0.9, -0.01], [s * 0.24, 0.96, -0.03], [s * 0.27, 1.06, -0.05], [s * 0.25, 1.13, -0.06]], [0.04, 0.032, 0.02, 0.006], E.trim);
  }
  k.blob(0.15, [1, 0.5, 0.8], [0, 0.35, 0], E.dark);
  k.loft([[0.34, 0.135, 0.105], [0.42, 0.172, 0.13], [0.52, 0.19, 0.14], [0.61, 0.18, 0.13], [0.665, 0.1, 0.085]], E.armor);
  k.plate([[-0.12, 0.07], [0.12, 0.07], [0.09, -0.05], [0, -0.1], [-0.09, -0.05]], 0.03, 0.03, E.joint, [0, 0.52, 0.125]);
  k.blob(1, [0.035, 0.035, 0.02], [0, 0.515, 0.16], E.light);
  k.ring(0.15, 0.024, [0, 0.36, 0], E.dark);
  // Helmet with a jaw guard and an angry slanted visor.
  k.cyl(0.075, 0.09, 0.06, [0, 0.655, 0], E.dark);
  k.loft([[0.665, 0.08, 0.08], [0.69, 0.17, 0.165, 0, 0.01], [0.77, 0.215, 0.2, 0, 0.012], [0.87, 0.205, 0.19], [0.95, 0.15, 0.14], [0.99, 0.04, 0.04]], E.armor);
  k.blob(1, [0.17, 0.06, 0.08], [0, 0.73, 0.13], E.joint);
  for (let i = -2; i <= 2 && !low; i++) k.blob(1, [0.016, 0.03, 0.012], [i * 0.045, 0.735, 0.205 - Math.abs(i) * 0.012], E.trim);
  for (const s of [-1, 1]) {
    k.blob(1, [0.08, 0.04, 0.06], [s * 0.07, 0.84, 0.15], E.dark, 0, [0, 0, s * 0.3]);
    k.blob(1, [0.055, 0.02, 0.03], [s * 0.07, 0.838, 0.19], E.visor, 0, [0, 0, s * 0.3]);
  }
  return finish(k, 'Raider');
}

// A flight suit with a swept, split solar sail. Only the outer vanes flex with
// the stride shader. The breastplate and arms keep the normal weapon anchors.
function sunwing(low) {
  const k = sculptKit(low);
  const enamel = 0xffedcf, copper = 0xca6b28, ceramic = 0x273550, plasma = 0x91fffa;
  k.loft([[.27,.07,.07], [.37,.14,.11], [.55,.2,.13], [.64,.17,.12], [.7,.07,.07]], enamel);
  k.loft([[.65,.06,.07], [.72,.15,.13], [.85,.17,.16], [.95,.12,.12], [1.04,.025,.04,0,-.035]], copper);
  k.blob(1,[.14,.058,.07],[0,.82,.104],ceramic);
  k.blob(1,[.108,.018,.035],[0,.83,.16],plasma);
  k.ring(.095,.024,[0,.52,-.15],copper,[0,0,0]);
  k.gem(.068,[0,.52,-.18],plasma,1.1);
  for (const side of [-1,1]) {
    const x = side * .1;
    k.limb([[x,.35,0],[x,.21,.025],[x,.1,-.055]], [.067,.064,.046], ceramic);
    k.loft([[.02,.035,.07],[.055,.062,.1],[.13,.055,.06]], enamel, [x,0,-.04]);
    arm(k,side,.055,ceramic);
    k.blob(.085,[1,.78,1],[side*.21,.59,0],enamel);
    // Stagger the blades in depth so they read from the cannon camera.
    for (let blade=0; blade<(low ? 2 : 3); blade++) {
      const reach = .51 - blade*.09;
      const vane = [[0,0],[side*.11,.16],[side*reach,.36-blade*.06],
        [side*(reach-.09),.14-blade*.04],[side*.1,-.07]];
      k.plate(vane,.034,.025,blade===1 ? copper : enamel,
        [side*.13,.55-blade*.045,-.09-blade*.068],[-.55,side*.35,0],.28);
    }
    k.limb([[side*.11,.55,-.11],[side*.29,.72,-.18],[side*.56,.81,-.31]],
      [.032,.023,.009],plasma,.28);
  }
  return finish(k,'Sunwing');
}

// The left forearm carries a full-height kite shield. A raised rim, inset
// enamel and rear handgrip give it a silhouette from both sides of the road.
function aegisGuard(low) {
  const k = sculptKit(low);
  const steel = 0x55677e, ivory = 0xfff5cf, teal = 0x20756d, light = 0xa4fff0, brass = 0xffc168;
  k.loft([[.29,.11,.10],[.37,.16,.12],[.51,.215,.15],[.64,.20,.135],[.70,.10,.08]], steel);
  k.plate([[-.17,.10],[0,.14],[.17,.10],[.14,-.035],[0,-.14],[-.14,-.035]],
    .04,.045,ivory,[0,.53,.125]);
  k.loft([[.66,.08,.075],[.72,.15,.14],[.85,.18,.17],[.96,.155,.13],[1.02,.065,.085]], ivory);
  k.blob(1,[.156,.080,.068],[0,.817,.12],C.dark);
  for (const side of [-1,1]) {
    k.blob(1,[.056,.013,.019],[side*.065,.832,.178],light,0,[0,0,side*.12]);
    k.plate([[-.041,.087],[.04,.06],[.035,-.05],[0,-.11],[-.029,-.066]],
      .027,.028,ivory,[side*.126,.79,.112],[0,side*.68,-side*.16]);
    if (!low) {
      k.cyl(.055,.059,.028,[side*.171,.831,.015],brass,[0,0,Math.PI/2]);
      k.cyl(.034,.035,.034,[side*.185,.831,.015],steel,[0,0,Math.PI/2]);
    }
  }
  k.plate([[-.14,.032],[0,.059],[.14,.032],[.096,-.002],[.025,.013],[0,-.077],[-.024,.013],[-.09,-.002]],
    .017,.021,brass,[0,.859,.169]);
  // A swept vermilion horsehair crest sits in a separate brass shoe.
  k.plate([[-.135,-.02],[-.14,.033],[-.055,.071],[.095,.062],[.143,.025],[.116,-.02]],
    .064,.014,brass,[0,.994,-.012],[0,Math.PI/2,0]);
  k.plate([[-.13,.023],[-.17,.095],[-.105,.16],[.024,.195],[.17,.163],[.222,.085],[.233,-.021],[.133,.034],[.027,.070]],
    .043,.022,0xc95443,[0,1.001,-.012],[0,Math.PI/2,0]);
  k.loft([[.342,.158,.127],[.359,.173,.133],[.38,.16,.124]],brass);
  k.loft([[.36,.09,.045],[.43,.14,.075],[.60,.145,.08],[.65,.10,.055]],teal,[0,0,-.16]);
  k.plate([[-.095,.065],[0,.013],[.095,.065],[.075,-.006],[0,-.068],[-.075,-.006]],
    .017,.012,light,[0,.52,-.24],[0,Math.PI,0]);
  for (const s of [-1,1]) {
    const x=s*.105;
    k.limb([[x,.37,-.012],[x,.243,-.022],[x,.12,-.006]], [.068,.052,.042],steel,s);
    k.loft([[0,.077,.12,0,.037],[.045,.081,.122,0,.032],[.086,.065,.082]],steel,[x,0,0],undefined,s);
    k.loft([[.053,.069,.089,0,.024],[.125,.062,.07],[.189,.074,.076],[.228,.073,.078]],
      ivory,[x,0,.008],undefined,s);
    k.plate([[-.052,.039],[0,.061],[.051,.038],[.04,-.038],[0,-.06],[-.037,-.039]],.025,.028,
      teal,[x,.222,.064],undefined,s);
    arm(k,s,.057,steel);
    k.loft([[-.081,.093,.093],[-.048,.12,.112],[.010,.115,.102]],brass,[s*.22,.605,0],[0,0,-s*.29]);
    k.loft([[-.043,.126,.12],[.009,.138,.126],[.067,.094,.092],[.10,.027,.03]],teal,[s*.22,.605,0],[0,0,-s*.29]);
    const hand=s>0?HAND_R:HAND_L;
    k.loft([[-.047,.052,.061],[.006,.068,.075],[.061,.053,.052]],ivory,hand,[.84,0,-s*.18]);
    if (!low) {
      k.plate([[-.058,.042],[.052,.045],[.052,-.064],[.004,-.102],[-.05,-.057]],.019,.022,
        teal,[x,.323,.086],[-.16,0,-s*.12],s);
      k.plate([[-.049,.030],[0,-.006],[.049,.030],[.036,-.014],[0,-.043],[-.036,-.014]],
        .015,.014,brass,[s*.102,.548,.164],[0,s*.32,0]);
    }
  }
  const shield=[[-.185,.23],[0,.31],[.16,.23],[.15,.01],[.105,-.16],[0,-.285],[-.137,-.16],[-.19,.018]];
  const angle=[-.07,-.68,-.10];
  k.plate(shield,.075,.062,brass,[-.304,.51,.144],angle);
  k.plate(shield.map(([x,y])=>[x*.83,y*.84]),.047,.057,teal,[-.332,.515,.195],angle);
  const face = new THREE.Vector3(-.332,.515,.195), tilt = new THREE.Euler(...angle,'ZYX');
  const shieldPoint = (x,y,z) => new THREE.Vector3(x,y,z).applyEuler(tilt).add(face).toArray();
  k.gem(.055,shieldPoint(0,.043,.105),light,1.52,angle);
  k.plate([[-.099,.046],[0,-.012],[.099,.046],[.070,-.019],[0,-.067],[-.070,-.019]],
    .011,.012,ivory,shieldPoint(0,-.065,.077),angle);
  if (!low) {
    for (const s of [-1,1]) for (const y of [-.071,.165]) k.blob(.016,[1,1,.72],shieldPoint(s*.105,y,.055),brass,0,angle);
    k.limb([[-.31,.64,.087],[-.25,.54,.044],[-.25,.43,.076]], [.021,.023,.02],steel);
  }
  return finish(k,'Aegis Guard');
}

const BUILDERS = [surgeBot, trooper, paladin, ascended, sunwing, aegisGuard];
export function raiderGeometry(detail = 'high') { return raider(detail === 'low'); }
export function troopFormGeometry(form, detail = 'high') {
  const build = BUILDERS[form];
  if (!build) throw new RangeError(`Unknown troop form: ${form}`);
  return build(detail === 'low');
}

// ------------------------------------------------------------ enemy gear overlays
// Static instanced overlays drawn with each special enemy. Positions follow the
// raider body; drone nozzles stay where the engine places their glow.
const GEAR = { iron: 0x59606e, steel: 0x9aa3b1, ink: 0x1d2028, brass: 0xc79a3c, gold: 0xffcc40, bone: 0xf3e7cf, shell: 0x6a3446, fuse: 0xffaa22, spark: 0xfff07a, ice: 0xbdf3ff };

function bomb(k) {
  k.blob(0.2, [1, 1, 1], [0, 1.18, 0], GEAR.ink);
  k.blob(1, [0.07, 0.03, 0.07], [0, 1.37, 0], GEAR.iron);
  k.blob(1, [0.06, 0.05, 0.02], [-0.07, 1.25, 0.16], 0x555a66);
  k.limb([[0, 1.38, 0], [0.04, 1.47, 0.01], [0.1, 1.51, 0.02]], [0.018, 0.016, 0.014], GEAR.fuse);
  k.gem(0.045, [0.11, 1.53, 0.02], GEAR.spark, 1.2);
}

function shield(k) {
  const disc = Array.from({ length: 12 }, (_, i) => [Math.sin(i / 12 * TAU) * 0.42, Math.cos(i / 12 * TAU) * 0.42]);
  k.plate(disc, 0.06, 0.09, GEAR.steel, [0, 0.48, 0.36]);
  k.ring(0.42, 0.045, [0, 0.48, 0.37], GEAR.brass, [0, 0, 0]);
  k.ring(0.24, 0.016, [0, 0.48, 0.45], GEAR.iron, [0, 0, 0]);
  k.blob(0.1, [1, 1, 0.7], [0, 0.48, 0.47], GEAR.gold);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU;
    k.blob(0.025, [1, 1, 1], [Math.sin(a) * 0.33, 0.48 + Math.cos(a) * 0.33, 0.43], GEAR.brass);
  }
}

function helmet(k) {
  k.loft([[0.74, 0.3, 0.3], [0.8, 0.315, 0.315], [0.92, 0.29, 0.29], [1.04, 0.2, 0.2], [1.1, 0.04, 0.04]], GEAR.iron);
  k.ring(0.305, 0.03, [0, 0.76, 0], GEAR.steel);
  k.loft([[-0.04, 0.27, 0.06], [0.04, 0.27, 0.06]], GEAR.ink, [0, 0.84, 0.25], [0, 0, 0], 0, { segments: 10, steps: 1 });
  k.b.add(new THREE.ConeGeometry(0.07, 0.24, 7), GEAR.steel, [0, 1.2, 0]);
  for (const s of [-1, 1]) k.blob(0.03, [1, 1, 1], [s * 0.26, 0.86, 0.13], GEAR.brass);
}

function droneGear(k) {
  // Twin rounded fuel cells, nozzles at the glow anchors and swept wings.
  for (const s of [-1, 1]) {
    const x = s * 0.184;
    k.loft([[0.34, 0.06, 0.06], [0.4, 0.075, 0.075], [0.62, 0.075, 0.075], [0.7, 0.05, 0.05], [0.72, 0.01, 0.01]], GEAR.steel, [x, 0, -0.269]);
    k.loft([[0.27, 0.06, 0.06], [0.31, 0.05, 0.05], [0.36, 0.062, 0.062]], GEAR.ink, [x, 0, -0.269]);
    k.ring(0.075, 0.012, [x, 0.5, -0.269], GEAR.brass);
    const wing = [[0, 0.05], [0.24, 0.0], [0.34, -0.06], [0.2, -0.07], [0, -0.06]].map(([u, v]) => [s * u, v]);
    k.plate(wing, 0.025, 0.01, GEAR.bone, [s * 0.24, 0.6, -0.25], [-Math.PI / 2, 0, s * 0.18]);
  }
  k.loft([[0.42, 0.11, 0.05], [0.52, 0.12, 0.06], [0.6, 0.1, 0.05]], GEAR.iron, [0, 0, -0.24]);
  k.plate([[0, 0], [0.12, 0], [0.04, 0.14]], 0.02, 0.005, GEAR.bone, [0, 0.66, -0.28], [0, Math.PI / 2, 0]);
}

function crabGear(k) {
  // Domed carapace with a central ridge and two sculpted pincers.
  k.loft([[0.5, 0.36, 0.3, 0, -0.04], [0.56, 0.37, 0.31, 0, -0.04], [0.66, 0.31, 0.26, 0, -0.05], [0.74, 0.17, 0.15, 0, -0.06], [0.77, 0.02, 0.02, 0, -0.06]], GEAR.shell);
  k.limb([[0, 0.78, 0.18], [0, 0.785, -0.06], [0, 0.72, -0.3]], [0.03, 0.035, 0.025], 0xd96f5c);
  for (const s of [-1, 1]) {
    k.blob(1, [0.05, 0.03, 0.05], [s * 0.18, 0.72, 0.1], 0xd96f5c);
    k.limb([[s * 0.3, 0.45, 0.12], [s * 0.38, 0.44, 0.24]], [0.06, 0.07], GEAR.shell);
    const x = s * 0.39;
    k.loft([[-0.09, 0.09, 0.085], [0.0, 0.11, 0.1], [0.06, 0.085, 0.08], [0.1, 0.03, 0.03]], GEAR.bone, [x, 0.45, 0.31], [Math.PI / 2, 0, 0]);
    k.limb([[x + s * 0.02, 0.48, 0.4], [x + s * 0.045, 0.5, 0.5], [x + s * 0.01, 0.47, 0.6]], [0.05, 0.04, 0.008], GEAR.bone);
    k.limb([[x - s * 0.03, 0.42, 0.4], [x - s * 0.05, 0.4, 0.49], [x - s * 0.02, 0.43, 0.56]], [0.04, 0.032, 0.006], 0xe6d6b8);
  }
}

const GEAR_BUILDERS = { 2: bomb, 3: shield, 5: helmet, 7: droneGear, 8: crabGear };
/** Fresh static overlay geometry for an enemy kind, or null if it has none here. */
export function enemyGearGeometry(kind, detail = 'high') {
  const build = GEAR_BUILDERS[kind];
  if (!build) return null;
  const k = sculptKit(detail === 'low', false);
  build(k);
  const geometry = k.b.finish();
  geometry.userData.shared = false;
  geometry.name = { 2: 'Bomb', 3: 'Round shield', 5: 'Tank helmet', 7: 'Drone jetpack', 8: 'Crab carapace' }[kind];
  return geometry;
}
