import { helmet as sculptHelmet, cuirass } from './infantry-armor.js';
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

// Tessellation per detail level. 'mid' keeps every high-detail part and the full
// silhouette at coarser segment counts for troops in the middle distance.
const TESSELLATION = {
  high: { seg: 8, step: 4, limb: [6, 3], blob: [8, 5], plate: 10, ring: 12, cyl: 8, helmet: 20, cuirass: 14 },
  mid: { seg: 5, step: 2, limb: [4, 2], blob: [5, 3], plate: 6, ring: 7, cyl: 5, helmet: 10, cuirass: 8 },
  low: { seg: 4, step: 1, limb: [3, 1], blob: [4, 3], plate: 4, ring: 5, cyl: 4, helmet: 6, cuirass: 6 },
};
const detailLevel = (detail) => detail === true || detail === 'low' ? 'low' : detail === 'mid' ? 'mid' : 'high';

export function sculptKit(detail, animated = true) {
  const level = detailLevel(detail), low = level === 'low', t = TESSELLATION[level];
  const b = troopBuilder(animated, low);
  return {
    b, low, level, t,
    loft(sections, color, pos = [0, 0, 0], rot = [0, 0, 0], leg = 0, o = {}) {
      const thinSeg = (n, fallback) => n == null ? fallback
        : level === 'low' ? Math.max(4, Math.round(n * 0.55))
        : level === 'mid' ? Math.max(4, Math.round(n * 0.7)) : n;
      const thinStep = (n, fallback) => n == null ? fallback
        : level === 'low' ? Math.max(1, Math.round(n * 0.5))
        : level === 'mid' ? Math.max(2, Math.round(n * 0.7)) : n;
      b.add(loftGeometry(sections, { segments: thinSeg(o.segments, t.seg), steps: thinStep(o.steps, t.step), warp: o.warp }), color, pos, rot, leg);
    },
    limb(points, radii, color, leg = 0) {
      b.add(sweepGeometry(points, radii, { segments: t.limb[0], steps: t.limb[1] }), color, [0, 0, 0], [0, 0, 0], leg);
    },
    blob(r, scale, pos, color, leg = 0, rot = [0, 0, 0]) {
      b.add(new THREE.SphereGeometry(r, t.blob[0], t.blob[1]).scale(...scale), color, pos, rot, leg);
    },
    plate(outline, depth, bulge, color, pos, rot = [0, 0, 0], leg = 0) {
      b.add(patchGeometry(outline, depth, bulge, { segments: t.plate, rings: 1 }), color, pos, rot, leg);
    },
    ring(r, tube, pos, color, rot = [Math.PI / 2, 0, 0], arc = TAU) {
      b.add(new THREE.TorusGeometry(r, tube, 3, t.ring, arc), color, pos, rot);
    },
    cyl(top, bottom, h, pos, color, rot = [0, 0, 0], sides) {
      const n = sides == null ? t.cyl
        : level === 'low' ? Math.max(4, Math.round(sides * 0.5))
        : level === 'mid' ? Math.max(5, Math.round(sides * 0.75)) : sides;
      b.add(new THREE.CylinderGeometry(top, bottom, h, n), color, pos, rot);
    },
    gem(r, pos, color, stretch = 1.6, rot = [0, 0, 0]) {
      b.add(new THREE.OctahedronGeometry(r, 0).scale(1, stretch, 1), color, pos, rot);
    },
  };
}

function finish(k, name) {
  const geometry = k.b.finish();
  geometry.name = name + (k.level === 'high' ? '' : ' ' + k.level);
  geometry.userData.detail = k.level;
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
function surgeBot(detail) {
  const k = sculptKit(detail), low = k.low;
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
  cuirass(k,'bot');
  // Raised ceramic rails protect the exposed battery down the back.
  if (!low) for (const side of [-1, 1]) {
    k.limb([[side*.075,.415,-.192],[side*.095,.50,-.219],[side*.08,.61,-.207]],
      [.018,.023,.015], C.mid);
  }
  // Battery pack
  k.loft([[0.4, 0.1, 0.055], [0.5, 0.115, 0.065], [0.62, 0.1, 0.055], [0.65, 0.04, 0.03]], C.dark, [0, 0, -0.165]);
  k.blob(1, [0.035, 0.05, 0.015], [0, 0.52, -0.232], C.light);
  sculptHelmet(k,'bot');
  // Two inset optics sit in one smoked wraparound sensor housing.
  for (const s of [-1,1]) {
    k.plate([[-.037,.011],[-.024,.032],[.023,.032],[.037,.012],[.030,-.022],[-.021,-.025]],
      .009,.009,C.light,[s*.081,.797,.207],[0,s*.34,-s*.12]);
  }
  k.limb([[0.075, 0.975, -0.02], [0.1, 1.06, -0.04], [0.115, 1.12, -0.055]], [0.013, 0.011, 0.01], C.dark);
  k.blob(0.034, [1, 1, 1], [0.115, 1.13, -0.056], C.light);
  return finish(k, 'Surge bot');
}

// ------------------------------------------------------------ rank 4-6: Trooper
// A toy-soldier read: tinted uniform and face, dark boots, gloves and gear.
function trooper(detail) {
  const k = sculptKit(detail), low = k.low;
  for (const s of [-1, 1]) {
    const x = s * 0.105;
    k.loft([[0.08, 0.05, 0.056], [0.18, 0.058, 0.064], [0.35, 0.078, 0.076]], C.cloth, [x, 0, 0], undefined, s);
    if (!low) k.blob(1, [0.052, 0.05, 0.036], [x, 0.2, 0.052], C.dark, s);
    k.loft([[0, 0.07, 0.12, 0, 0.03, 0.75], [0.07, 0.072, 0.118, 0, 0.025, 0.75], [0.13, 0.058, 0.068, 0, 0]], C.dark, [x, 0, 0], undefined, s);
    arm(k, s, 0.05, C.cloth);
    k.blob(1, [0.07, 0.05, 0.08], [s * 0.21, 0.605, -0.005], C.joint);
    k.blob(0.048, [1, 1, 1.1], s > 0 ? HAND_R : HAND_L, C.dark);
  }
  cuirass(k,'trooper');
  // Rucksack with a rolled mat and radio whip.
  k.loft([[0.37, 0.115, 0.06], [0.47, 0.13, 0.075], [0.6, 0.12, 0.07], [0.66, 0.06, 0.04]], C.joint, [0, 0, -0.175]);
  if (!low) k.cyl(0.045, 0.045, 0.27, [0, 0.685, -0.185], C.cloth, [0, 0, Math.PI / 2]);
  if (!low) k.limb([[0.09, 0.62, -0.215], [0.105, 0.84, -0.24], [0.115, 0.97, -0.26]], [0.009, 0.007, 0.005], C.dark);
  sculptHelmet(k,'trooper');
  // The field trooper wears a short-billed helmet above an exposed face.
  k.plate([[-.151,.018],[-.09,.043],[.09,.043],[.151,.018],[.135,-.019],[0,-.026],[-.135,-.019]],
    .071,.026,C.joint,[0,.855,.145],[-.24,0,0]);
  for (const s of [-1,1]) k.blob(1,[.030,.021,.015],[s*.061,.804,.192],C.dark,0,[0,s*.26,0]);
  if (!low) k.plate([[-.021,.032],[.01,.034],[.033,-.025],[.012,-.034],[-.022,-.023]],
    .022,.023,C.trim,[0,.777,.199]);
  k.plate([[-.122,.032],[-.05,.049],[.11,.04],[.092,-.017],[-.052,-.083],[-.1,-.03]],
    .027,.021,0x587e77,[0,.676,.085]);

  return finish(k, 'Trooper');
}

// ------------------------------------------------------------ rank 7-9: Paladin
function paladin(detail) {
  const k = sculptKit(detail), low = k.low;
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
  cuirass(k,'paladin');
  // Waist tabard and a short cape keep the knightly silhouette.
  if (!low) k.plate([[-0.07, 0.04], [0.07, 0.04], [0.06, -0.16], [0, -0.19], [-0.06, -0.16]], 0.02, 0.02, C.dark, [0, 0.35, 0.13], [-0.12, 0, 0]);
  k.plate([[-0.16, 0.1], [0.16, 0.1], [0.21, -0.3], [0.08, -0.34], [0, -0.31], [-0.08, -0.34], [-0.21, -0.3]], 0.02, 0.06, C.dark, [0, 0.58, -0.17], [0.12, Math.PI, 0]);
  sculptHelmet(k,'paladin');
  if (!low) for (const s of [-1,1]) {
    const bevor=[[-.015,.064],[.093,.101],[.121,.079],[.090,-.033],[.014,-.072],[-.013,-.044]];
    k.plate(bevor.map(([x,y])=>[s*x,y]),.022,.018,C.trim,[s*.053,.755,.135],[0,s*.65,0]);
  }
  k.plate([[-0.17, 0], [-0.12, 0.09], [0.04, 0.13], [0.18, 0.06], [0.2, -0.01]], 0.03, 0.01, C.amber, [0, 0.975, -0.02], [0, Math.PI / 2, 0]);
  return finish(k, 'Paladin');
}

// ------------------------------------------------------------ rank 10-13: Ascended
function ascended(detail) {
  const k = sculptKit(detail), low = k.low;
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
  cuirass(k,'ascended');
  sculptHelmet(k,'ascended');
  if (!low) for(const s of [-1,1]) k.plate([[0,-.1],[s*.084,-.03],[s*.115,.174],[s*.087,.199],[s*.048,.08]],
    .018,.016,C.mid,[s*.089,.846,-.048],[-.23,s*.69,0]);
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
function raider(detail) {
  const k = sculptKit(detail), low = k.low;
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
    if (!low) k.plate([[-.045,.05],[.043,.035],[.032,-.027],[-.012,-.088],[-.039,-.021]],
      .024,.012,E.mid,[s*.15,.77,.15],[0,s*.56,s*.12]);
    // Curved horns sweep out and up from the helmet.
    k.limb([[s * 0.15, 0.9, -0.01], [s * 0.24, 0.96, -0.03], [s * 0.27, 1.06, -0.05], [s * 0.25, 1.13, -0.06]], [0.04, 0.032, 0.02, 0.006], E.trim);
  }
  cuirass(k,'raider');
  sculptHelmet(k,'raider');
  const muzzle=[[-.135,.025],[-.084,.064],[0,.047],[.084,.064],[.135,.025],[.095,-.041],[0,-.064],[-.095,-.041]];
  k.plate(muzzle,.038,.037,E.joint,[0,.752,.209]);
  for (const s of [-1,1]) {
    k.limb([[s*.098,.737,.228],[s*.119,.772,.256],[s*.119,.812,.265]],
      [.026,.021,.002],E.trim);
    if (!low) k.plate([[-.033,.014],[.020,.027],[.034,.004],[.020,-.015],[-.026,-.015]],
      .009,.011,E.light,[s*.082,.814,.215],[0,s*.44,s*.25]);
  }
  return finish(k, 'Raider');
}

// A flight suit with a swept, split solar sail. Only the outer vanes flex with
// the stride shader. The breastplate and arms keep the normal weapon anchors.
function sunwing(detail) {
  const k = sculptKit(detail), low = k.low;
  const enamel = 0xffedcf, copper = 0xca6b28, ceramic = 0x273550, plasma = 0x91fffa;
  cuirass(k,'sunwing');
  sculptHelmet(k,'sunwing');
  if (!low) k.ring(.095,.024,[0,.52,-.15],copper,[0,0,0]);
  k.gem(.068,[0,.52,-.18],plasma,1.1);
  for (const side of [-1,1]) {
    const x = side * .1;
    k.limb([[x,.35,0],[x,.21,.025],[x,.1,-.055]], [.067,.064,.046], ceramic);
    k.loft([[.02,.035,.07],[.055,.062,.1],[.13,.055,.06]], enamel, [x,0,-.04]);
    arm(k,side,.055,ceramic);
    k.blob(.085,[1,.78,1],[side*.21,.59,0],enamel);
    // Stagger the blades in depth so they read from the cannon camera.
    for (let blade=0; blade<(low ? 1 : 3); blade++) {
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
function aegisGuard(detail) {
  const k = sculptKit(detail), low = k.low;
  const steel = 0x55677e, ivory = 0xfff5cf, teal = 0x20756d, light = 0xa4fff0, brass = 0xffc168;
  cuirass(k,'aegis');
  sculptHelmet(k,'aegis');
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
export function raiderGeometry(detail = 'high') { return raider(detail); }
export function troopFormGeometry(form, detail = 'high') {
  const build = BUILDERS[form];
  if (!build) throw new RangeError(`Unknown troop form: ${form}`);
  return build(detail);
}

// ------------------------------------------------------------ enemy gear overlays
// Static instanced overlays drawn with each special enemy. Positions follow the
// raider body; drone nozzles stay where the engine places their glow.
const GEAR = { iron: 0x59606e, steel: 0x9aa3b1, ink: 0x1d2028, brass: 0xc79a3c, gold: 0xffcc40, bone: 0xf3e7cf, shell: 0x6a3446, fuse: 0xffaa22, spark: 0xfff07a, ice: 0xbdf3ff };

// Color bands follow the surface through its shoulder and turned rim. The
// same design is sampled at fewer rings for enemies across the battlefield.
function gearShell(k, sections, palette, zone, pos = [0,0,0], rot = [0,0,0], warp) {
  const segments = k.low ? 10 : k.level === 'mid' ? 14 : 20, steps = k.low ? 6 : k.level === 'mid' ? 8 : 12;
  const geometry = loftGeometry(sections,{segments, steps, warp});
  const { color } = geometry.attributes;
  const pigments = palette.map(hex => new THREE.Color(hex));
  for (let j=0; j<=steps; j++) for (let i=0; i<=segments; i++) {
    const index = j*(segments+1)+i, shade = color.getX(index);
    const c = pigments[zone(j/steps, i*TAU/segments)];
    color.setXYZ(index, c.r*shade, c.g*shade, c.b*shade);
  }
  for (const [index,v] of [[color.count-2,0],[color.count-1,1]]) {
    const c = pigments[zone(v,0)];
    color.setXYZ(index,c.r,c.g,c.b);
  }
  k.b.add(geometry,0xffffff,pos,rot);
}

function bomb(k) {
  gearShell(k,[[.97,.09,.10],[1.008,.156,.15],[1.09,.205,.20],[1.22,.215,.21],
    [1.30,.177,.17],[1.35,.096,.09],[1.37,.081,.078],[1.401,.068,.066]],
    [GEAR.ink,0x494b60,0xff964c,GEAR.iron],(v,a)=>{
      if(v>.82)return 3;
      if(v>.31 && v<.57 && Math.cos(3*a+4*v)>.15)return 2;
      return Math.cos(a*3)>.40?1:0;
    });
  k.limb([[0,1.39,0],[.017,1.45,.016],[.105,1.51,.02]],[.020,.017,.014],GEAR.fuse);
  k.gem(.049,[.11,1.53,.02],GEAR.spark,1.2);
}

function shield(k) {
  // A shallow dished buckler, rolled at the circumference, with a pressed
  // six-lobed sunburst rising out of the same metal as its central boss.
  gearShell(k,[[-.044,.035,.035],[-.038,.32,.32],[-.02,.425,.425],
    [.010,.432,.432],[.038,.409,.409],[.032,.366,.366],[.070,.274,.274],
    [.089,.17,.17],[.120,.112,.112],[.150,.074,.074],[.158,.012,.012]],
    [GEAR.iron,GEAR.steel,GEAR.brass,GEAR.gold],(v,a)=>{
      if(v<.24)return 0;
      if(v<.46 || v>.8)return 2;
      return Math.cos(6*a)>.4?3:1;
    },[0,.48,.37],[Math.PI/2,0,0],(x,y,z,u,v,a)=>
      [x,y+.028*Math.cos(a*6)*Math.sin(Math.PI*Math.max(0,(v-.45)/.55)),z]);
}

function helmet(k) {
  gearShell(k,[[.714,.220,.236],[.743,.31,.293],[.777,.323,.316],[.812,.30,.305],
    [.85,.303,.303],[.92,.282,.29],[.99,.242,.252],[1.05,.166,.164],
    [1.087,.072,.075],[1.123,.041,.049],[1.205,.007,.015]],
    [GEAR.iron,GEAR.ink,GEAR.steel,GEAR.brass],(v,a)=>{
      if(v<.22 || v>.86)return 2;
      if(v<.48 && Math.cos(a)>.27)return 1;
      return Math.abs(Math.sin(a))<.18?3:0;
    },undefined,undefined,(x,y,z,u,v,a)=>{
      const nose=Math.max(0,Math.cos(a))**6;
      return [x, y-.055*nose*(1-v),z+.066*nose*(1-v)];
    });
}

function droneGear(k) {
  for (const s of [-1, 1]) {
    const x = s * .184;
    gearShell(k,[[.265,.065,.065],[.28,.077,.075],[.329,.049,.051],[.38,.079,.078],
      [.51,.092,.089],[.62,.077,.074],[.686,.071,.064],[.722,.025,.031]],
      [GEAR.ink,GEAR.steel,GEAR.brass,0xa8e6ea],(v,a)=>{
        if(v<.27)return v<.12?2:0;
        if(v>.66 && Math.cos(3*a)>.37)return 3;
        return v<.45?2:1;
      },[x,0,-.269]);
    const wing = [[0, 0.05], [0.24, 0.0], [0.34, -0.06], [0.2, -0.07], [0, -0.06]].map(([u, v]) => [s * u, v]);
    k.plate(wing, 0.025, 0.01, GEAR.bone, [s * 0.24, 0.6, -0.25], [-Math.PI / 2, 0, s * 0.18]);
  }
  k.loft([[0.42, 0.11, 0.05], [0.52, 0.12, 0.06], [0.6, 0.1, 0.05]], GEAR.iron, [0, 0, -0.24]);
  k.plate([[0, 0], [0.12, 0], [0.04, 0.14]], 0.02, 0.005, GEAR.bone, [0, 0.66, -0.28], [0, Math.PI / 2, 0]);
}

function crabGear(k) {
  // Domed carapace with a central ridge and two sculpted pincers.
  gearShell(k,[[.486,.285,.239],[.506,.374,.310],[.549,.389,.324],
    [.60,.357,.303],[.678,.291,.256],[.740,.165,.166],[.776,.036,.045]],
    [GEAR.shell,0xce685a,0xf3b293],(v,a)=>{
      if(v<.25)return 1;
      const ridge=Math.cos(4*a+v*4);
      return ridge>.77?2:ridge>.32?1:0;
    },[0,0,-.049],undefined,(x,y,z,u,v,a)=>{
      const rib=Math.cos(4*a+v*4)*.018*Math.sin(Math.PI*v);
      return [x*(1+2*rib),y+rib,z*(1+2*rib)];
    });
  for (const s of [-1, 1]) {
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
  const k = sculptKit(detail, false);
  build(k);
  const geometry = k.b.finish();
  geometry.userData.shared = false;
  geometry.name = { 2: 'Bomb', 3: 'Round shield', 5: 'Tank helmet', 7: 'Drone jetpack', 8: 'Crab carapace' }[kind];
  return geometry;
}
