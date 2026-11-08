import * as THREE from 'three';
import { assetBatch, assetGlow, attackPose } from './asset-kit.js';
import { loftGeometry, headGeometry, sweepGeometry, patchGeometry, clothGeometry, crownGeometry, fitBoss, bossSkin, bossMetal, bossCloth, bossShell } from './boss-shapes.js';

// Sculpted bosses for worlds 38-50: panda, shogun, trex, roc, clockwork and overlord.
// Same contract as the other sculpted modules: return fitBoss(group, pose, radius, height, animate) or null.

const TAU = Math.PI * 2;
const PATCH = { segments: 24, rings: 5 };

function node(parent, name, x = 0, y = 0, z = 0) {
  const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g;
}
function rig(name) { const group = new THREE.Group(); group.name = name; return { group, pose: node(group, name + '-pose') }; }
function stride(t, state, speed = 3.1) { return state.moving === false || state.stunned ? 0 : Math.sin(t * speed); }
function hitShake(pose, t, state) { const hit = Math.min(1, state.hit || 0); pose.rotation.z = Math.sin(t * 31) * hit * .035; pose.position.z = -hit * .1; }
function loft(batch, sections, color, x = 0, y = 0, z = 0, options = {}) {
  return batch.add(loftGeometry(sections, { segments: 24, steps: 22, ...options }), color, x, y, z);
}
function sweep(batch, points, radii, color, x = 0, y = 0, z = 0, options = {}) {
  return batch.add(sweepGeometry(points, radii, { segments: 10, steps: 18, ...options }), color, x, y, z);
}
function panel(batch, outline, color, x = 0, y = 0, z = 0, bulge = .2, depth = .12, rx = 0, ry = 0, rz = 0) {
  return batch.add(patchGeometry(outline, depth, bulge, PATCH), color, x, y, z, rx, ry, rz);
}
function bulb(batch, w, h, d, color, x = 0, y = 0, z = 0, options = {}) {
  return loft(batch, [[-h * .5, .01, .01], [-h * .4, w * .3, d * .3], [-h * .15, w * .49, d * .48], [h * .18, w * .47, d * .5], [h * .4, w * .28, d * .32], [h * .5, .01, .01]], color, x, y, z, options);
}
function loop(batch, radius, tube, color, x = 0, y = 0, z = 0, squash = 1) {
  const pts = []; for (let k = 0; k <= 20; k++) { const a = k / 20 * TAU; pts.push([Math.sin(a) * radius, Math.cos(a) * radius * squash, 0]); }
  return batch.add(sweepGeometry(pts, [tube, tube], { segments: 8, steps: 20 }), color, x, y, z);
}
function clawHand(batch, x, y, z, size, color) {
  bulb(batch, size, size * 1.05, size * .75, color, x, y, z, { segments: 14, steps: 12 });
  for (let k = 0; k < 3; k++) sweep(batch, [[x + (k - 1) * size * .26, y - size * .2, z + size * .24], [x + (k - 1) * size * .32, y - size * .55, z + size * .36], [x + (k - 1) * size * .27, y - size * .68, z + size * .55]], [size * .16, size * .15, .025], color, 0, 0, 0, { segments: 8, steps: 10 });
  sweep(batch, [[x - size * .36, y + size * .05, z], [x - size * .62, y - size * .12, z + size * .26], [x - size * .48, y - size * .38, z + size * .4]], [size * .19, size * .16, .025], color, 0, 0, 0, { segments: 8, steps: 10 });
}

// World 38: a huge kung-fu panda warlord with a round white belly, black mantle, jade sash and a bamboo staff.
function buildPanda() {
  const { group, pose } = rig('sculpted-panda');
  const WHITE = 0xf3efe2, INK = 0x211e24, JADE = 0x3f8f6a, CANE = 0x6f9c3f, CANE_NODE = 0x4c7030, AMBER = 0xffc963, CLAW = 0xd8d2c0;
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = node(pose, 'panda-leg-' + s, s * 1.25, 2.62, 0), b = assetBatch();
    loft(b, [[-2.5,.58,.68,0,.35],[-2.2,.74,.88,0,.28],[-1.5,.6,.7,0,.05],[-.85,.5,.56,0,-.02],[-.28,.62,.66,0,-.04],[.16,.56,.6,0,-.04]], INK);
    bulb(b, 1.15, .6, 1.3, INK, 0, -2.42, .38, { segments: 16, steps: 12 });
    for (let k = 0; k < 3; k++) sweep(b, [[(k - 1) * .36, -2.5, 1.0],[(k - 1) * .4, -2.48, 1.32],[(k - 1) * .38, -2.44, 1.48]], [.11, .1, .015], CLAW, 0, 0, 0, { segments: 8, steps: 10 });
    b.finish(leg, 'panda-padded-leg-' + s, bossSkin);
    legs.push({ leg, s });
  }
  const body = node(pose, 'panda-round-body', 0, 2.75, 0), fur = assetBatch(), mantle = assetBatch(), sash = assetBatch();
  loft(fur, [[.05,1.02,1.0],[.55,1.5,1.38],[1.5,1.86,1.6],[2.7,1.78,1.58],[3.7,1.34,1.28],[4.25,.72,.64]], WHITE, 0, 0, 0, { segments: 36, steps: 28 });
  fur.finish(body, 'panda-white-belly', bossSkin);
  loft(mantle, [[1.3,1.56,1.46],[1.95,1.92,1.74],[2.85,1.94,1.76],[3.65,1.56,1.42],[4.2,1.0,.88],[4.5,.42,.34]], INK, 0, 0, 0, { segments: 34, steps: 24, warp(x, y, z, u, v) { return [x, y, z - .42 * v * v]; } });
  mantle.finish(body, 'panda-black-shoulder-mantle', bossSkin);
  // jade sash around the waist with a knot and hanging tails
  const sashPts = []; for (let k = 0; k <= 22; k++) { const a = k / 22 * TAU; sashPts.push([Math.sin(a) * 1.82, 1.18, Math.cos(a) * 1.52]); }
  sweep(sash, sashPts, [.17, .17], JADE, 0, 0, 0, { segments: 8, steps: 22 });
  bulb(sash, .62, .5, .4, JADE, 0, 1.05, 1.62, { segments: 12, steps: 10 });
  panel(sash, [[-.22,0],[0,.5],[.22,0],[0,-.5]], 0xd9a644, 0, 1.05, 1.8, .08, .05);
  for (const s of [-1, 1]) panel(sash, [[-.16,0],[.16,.05],[.2,-.9],[.05,-1.5],[-.12,-.9]], JADE, s * .3, .55, 1.6, .05, .04, .18, 0, s * .1);
  sash.finish(body, 'panda-jade-sash', bossCloth);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = node(body, 'panda-arm-' + s, s * 2.02, 3.95, .05), b = assetBatch(), wrap = assetBatch();
    loft(b, [[-2.68,.48,.5],[-2.3,.66,.68],[-1.6,.6,.62],[-.9,.52,.54],[-.32,.6,.64,0,-.02],[.12,.52,.54]], INK);
    for (const y of [-2.05, -1.78]) wrap.cylinder(.6, .22, 0, y, 0, JADE, 'y', .6, 12);
    bulb(b, .88, .72, .82, INK, 0, -2.62, .16, { segments: 16, steps: 12 });
    b.finish(arm, 'panda-furred-arm-' + s, bossSkin);
    wrap.finish(arm, 'panda-jade-wrist-wraps-' + s, bossCloth);
    arms.push({ arm, s });
  }
  // segmented bamboo staff planted through the right paw
  const staff = node(arms[1].arm, 'panda-bamboo-staff', .32, -2.6, .35), cane = assetBatch(), nodes = assetBatch();
  sweep(cane, [[0,-4.0,0],[0,-1.9,.03],[0,0,0],[0,2.0,-.03],[0,4.7,0]], [.2,.19,.19,.19,.17], CANE, 0, 0, 0, { segments: 10, steps: 22, flutes: .05 });
  for (let k = 0; k < 7; k++) nodes.cylinder(.25, .14, 0, -3.2 + k * 1.3, 0, CANE_NODE, 'y', .25, 12);
  cane.finish(staff, 'panda-segmented-bamboo-cane', bossShell);
  nodes.finish(staff, 'panda-bamboo-nodes', bossMetal);
  const head = node(body, 'panda-head', 0, 4.55, .18), furH = assetBatch(), darkH = assetBatch(), eyes = assetBatch();
  bulb(furH, 2.7, 2.6, 2.45, WHITE, 0, .1, 0, { segments: 28, steps: 22 });
  for (const s of [-1, 1]) bulb(furH, 1.0, .95, .62, INK, s * 1.14, 1.32, -.3, { segments: 14, steps: 10 });
  furH.finish(head, 'panda-round-head-and-ears', bossSkin);
  for (const s of [-1, 1]) {
    panel(darkH, [[-.5,-.28],[.04,.34],[.52,.16],[.34,-.28],[0,-.4],[-.3,-.34]], INK, s * .62, .3, .96, .16, .07, 0, 0, -s * .38);
    bulb(darkH, 1.06, .78, .9, WHITE, 0, -.52, 1.0, { segments: 16, steps: 12 });
    bulb(darkH, .36, .28, .3, INK, 0, -.32, 1.62, { segments: 10, steps: 8 });
    sweep(darkH, [[s * .12, -.84, 1.5],[0, -.98, 1.66],[-s * .12, -.84, 1.5]], [.03, .045, .03], INK, 0, 0, 0, { segments: 6, steps: 8 });
    bulb(eyes, .17, .26, .12, AMBER, s * .58, .32, 1.16, { segments: 10, steps: 8 });
    bulb(eyes, .07, .07, .05, 0xffffff, s * .54, .38, 1.24, { segments: 6, steps: 5 });
  }
  darkH.finish(head, 'panda-eye-patches-and-muzzle', bossSkin);
  eyes.finish(head, 'panda-amber-eyes', assetGlow);
  return fitBoss(group, pose, 3.2, 10.2, (t, progress, state = {}) => {
    const a = attackPose(progress), walk = stride(t, state); hitShake(pose, t, state);
    body.position.y = 2.75 + Math.abs(walk) * .05 - a * .18;
    body.rotation.x = a * .1;
    for (const l of legs) l.leg.rotation.x = l.s * walk * .12;
    for (const l of arms) { const lift = l.s > 0 ? 2.35 : 1.1; l.arm.rotation.x = -a * lift - l.s * walk * .07; l.arm.rotation.z = l.s * (.12 - a * .08); }
    head.rotation.y = Math.sin(t * .6) * .08; head.rotation.x = a * .08;
  });
}

// World 40: an armored samurai shogun with a crescent-crested kabuto, menpo mask, lamellar plates and a katana.
function buildShogun() {
  const { group, pose } = rig('sculpted-shogun');
  const RED = 0xa32b34, LACQUER = 0x1c1b22, GOLD = 0xd9a644, IRON = 0x3a3f4a, PINK = 0xffb7c9, STEEL = 0xc9ced6;
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = node(pose, 'shogun-leg-' + s, s * 1.05, 3.0, 0), b = assetBatch(), plate = assetBatch();
    loft(b, [[-2.9,.5,.6,0,.1],[-2.5,.62,.72,0,.08],[-1.7,.52,.6,0,0],[-.9,.46,.52,0,-.04],[-.2,.56,.6,0,-.02],[.18,.5,.54]], LACQUER);
    bulb(b, 1.0, .55, 1.35, LACQUER, 0, -2.85, .42, { segments: 16, steps: 12 });
    for (const y of [-2.3, -1.5]) panel(plate, [[-.26,0],[0,.3],[.26,0],[0,-.3]], RED, 0, y, .56, .12, .05);
    plate.ring(.5, .07, 0, -.72, .1, GOLD, 'y');
    b.finish(leg, 'shogun-lacquered-greave-' + s, bossShell);
    plate.finish(leg, 'shogun-red-suneate-' + s, bossMetal);
    legs.push({ leg, s });
  }
  const torso = node(pose, 'shogun-torso', 0, 3.3, 0), cuirass = assetBatch(), collar = assetBatch(), trims = assetBatch();
  loft(cuirass, [[.05,.95,.8],[.5,1.42,1.12],[1.5,1.72,1.26],[2.6,1.62,1.2],[3.4,1.28,.98],[3.9,.82,.52]], RED, 0, 0, 0, { segments: 32, steps: 26 });
  cuirass.finish(torso, 'shogun-red-cuirass', bossShell);
  loft(collar, [[2.3,1.5,1.14],[3.0,1.66,1.24],[3.6,1.38,1.02],[3.95,.8,.5]], LACQUER);
  collar.finish(torso, 'shogun-black-collar-plate', bossMetal);
  sweep(trims, [[-.62,3.4,1.1],[0,3.62,1.24],[.62,3.4,1.1]], [.06,.075,.06], GOLD);
  for (const s of [-1, 1]) sweep(trims, [[s * .7,3.35,1.08],[s * .95,2.4,1.18],[s * .85,1.2,1.12]], [.05,.06,.04], GOLD);
  for (const s of [-1, 1]) sweep(trims, [[0,2.3,1.28],[s * .16,2.0,1.3],[s * .05,1.78,1.26]], [.07,.06,.03], GOLD);
  trims.finish(torso, 'shogun-gold-seams-and-cord', bossMetal);
  // layered skirt plates around the hips
  const skirt = node(torso, 'shogun-skirt', 0, -.5, 0), skirtB = assetBatch();
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * TAU;
    panel(skirtB, [[-.52,.5],[.52,.5],[.4,-.55],[0,-.72],[-.4,-.55]], k % 2 ? LACQUER : RED, Math.sin(a) * 1.28, 0, Math.cos(a) * 1.22, .16, .07, -.16, a, 0);
  }
  skirtB.finish(skirt, 'shogun-lacquered-kusazuri', bossMetal);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = node(torso, 'shogun-arm-' + s, s * 2.0, 3.1, 0), b = assetBatch();
    loft(b, [[-2.6,.34,.4],[-2.1,.5,.55],[-1.3,.44,.48],[-.55,.5,.54],[.05,.44,.46]], LACQUER);
    clawHand(b, 0, -2.55, .25, .62, IRON);
    b.finish(arm, 'shogun-armored-sleeve-' + s, bossMetal);
    const sode = node(arm, 'shogun-sode-' + s, 0, .3, -.05), sb = assetBatch();
    for (let k = 0; k < 3; k++) panel(sb, [[-.8,.42],[.1,.72],[.82,.34],[.66,-.28],[0,-.55],[-.6,-.22]], k === 0 ? RED : LACQUER, 0, .1 - k * .6, .05 + k * .2, .22 - k * .05, .06, -.3 - k * .26, 0, 0);
    sb.finish(sode, 'shogun-curved-lamellar-sode-' + s, bossMetal);
    arms.push({ arm, s });
  }
  const head = node(torso, 'shogun-kabuto-head', 0, 3.75, .1), mask = assetBatch(), glow = assetBatch(), helm = assetBatch(), guard = assetBatch();
  mask.add(headGeometry(1.7, 1.95, 1.6, { snout: .2, brow: .22, cheeks: .14, jaw: .5 }), 0x565e6e);
  for (const s of [-1, 1]) {
    panel(mask, [[-.34,.12],[.1,.2],[.3,.02],[.1,-.14],[-.3,-.1]], 0x23262e, s * .44, .3, .84, .1, .05, 0, 0, -s * .12);
    sweep(mask, [[s * .12, -.5, .95],[s * .34, -.55, .9],[s * .5, -.42, .78]], [.06, .07, .025], 0x23262e, 0, 0, 0, { segments: 6, steps: 10 });
    sweep(mask, [[s * .2, .52, .96],[s * .42, .6, .92],[s * .6, .48, .82]], [.05, .06, .025], GOLD, 0, 0, 0, { segments: 6, steps: 10 });
    bulb(glow, .34, .16, .1, PINK, s * .42, .3, .98, { segments: 10, steps: 8 });
  }
  mask.finish(head, 'shogun-iron-menpo-mask', bossMetal);
  glow.finish(head, 'shogun-cherry-eye-glow', assetGlow);
  loft(helm, [[.55,.88,.78],[.95,1.26,1.16],[1.35,1.44,1.34],[1.62,1.42,1.32],[1.82,1.05,.85],[1.9,.35,.24]], LACQUER, 0, 0, 0, { segments: 30, steps: 20 });
  for (let k = -2; k <= 2; k++) sweep(helm, [[k * .32, 1.82, .04],[k * .4, 1.4, .62],[k * .34, .95, .95]], [.03, .045, .025], GOLD, 0, 0, 0, { segments: 6, steps: 12 });
  helm.finish(head, 'shogun-lacquered-kabuto', bossMetal);
  for (let k = 0; k < 3; k++) {
    const r = 1.0 + k * .24, pts = [];
    for (let j = 0; j <= 20; j++) { const a = j / 20 * TAU; pts.push([Math.sin(a) * r, 0, Math.cos(a) * r]); }
    sweep(guard, pts, [.1 - k * .015, .1 - k * .015], k === 2 ? GOLD : LACQUER, 0, .5 - k * .42, 0, { segments: 8, steps: 20 });
  }
  sweep(guard, [[-1.02,1.6,1.2],[-.55,2.4,1.26],[0,2.7,1.28],[.55,2.4,1.26],[1.02,1.6,1.2]], [.06,.13,.16,.13,.06], GOLD, 0, 0, 0, { segments: 8, steps: 18, flatten: .55 });
  guard.finish(head, 'shogun-shikoro-and-maedate', bossMetal);
  bulb(glow, .2, .26, .1, PINK, 0, .95, 1.2, { segments: 8, steps: 6 });
  const katana = node(arms[1].arm, 'shogun-katana', 0, -2.5, .3), blade = assetBatch(), hilt = assetBatch();
  katana.rotation.set(2.2, 0, -.15);
  sweep(hilt, [[0,-1.05,0],[0,-.3,0],[0,.1,0]], [.11,.13,.1], RED, 0, 0, 0, { segments: 8, steps: 10, flatten: .8 });
  hilt.cylinder(.34, .09, 0, .16, 0, GOLD, 'y', .34, 12);
  sweep(blade, [[0,.2,0],[0,1.6,.1],[0,3.2,.28],[0,4.35,.5]], [.13,.105,.075,.02], STEEL, 0, 0, 0, { segments: 6, steps: 20, flatten: .6 });
  blade.finish(katana, 'shogun-curved-katana-blade', bossMetal);
  hilt.finish(katana, 'shogun-katana-hilt', bossMetal);
  return fitBoss(group, pose, 3.1, 11.2, (t, progress, state = {}) => {
    const a = attackPose(progress), walk = stride(t, state); hitShake(pose, t, state);
    torso.position.y = 3.3 + Math.abs(walk) * .045;
    torso.rotation.y = a * .3;
    for (const l of legs) l.leg.rotation.x = l.s * walk * .11;
    for (const l of arms) { l.arm.rotation.x = -a * 2.05 - l.s * walk * .06; l.arm.rotation.z = -l.s * (.1 + a * .1); }
    head.rotation.y = Math.sin(t * .6) * .06 - a * .18; head.rotation.x = a * .05;
  });
}

// World 41: a tyrannosaurus with a lofted skull, hinged jaw, small arms and a long balancing tail.
function buildTrex() {
  const { group, pose } = rig('sculpted-trex');
  const OLIVE = 0x6b7a3a, DARK = 0x43501f, CREAM = 0xe8dbb0, AMBER = 0xffb347, TOOTH = 0xf3ecd4, CLAW = 0xd9cfae;
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = node(pose, 'trex-leg-' + s, s * 1.5, 5.0, -.3), b = assetBatch();
    loft(b, [
      [-4.8,.5,.62,0,.5],[-4.5,.56,.7,0,.45],[-4.05,.5,.6,0,-.5],[-2.6,.85,.95,0,-.2],
      [-.9,1.05,1.15,0,.35],[.3,.92,1.02,0,.2],
    ], OLIVE, 0, 0, 0, { segments: 26, steps: 26 });
    bulb(b, 1.15, .6, 1.7, OLIVE, 0, -4.78, .55, { segments: 18, steps: 14 });
    for (let k = 0; k < 3; k++) sweep(b, [[(k - 1) * .4, -4.85, 1.35],[(k - 1) * .46, -4.78, 2.15],[(k - 1) * .44, -4.7, 2.5]], [.2, .16, .015], CLAW, 0, 0, 0, { segments: 8, steps: 12 });
    b.finish(leg, 'trex-digitigrade-leg-' + s, bossSkin);
    legs.push({ leg, s });
  }
  const torso = node(pose, 'trex-torso', 0, 4.9, -.4), hide = assetBatch(), belly = assetBatch(), spines = assetBatch();
  loft(hide, [[.05,.95,1.05],[.6,1.5,1.55],[1.7,1.85,1.7],[3.0,1.7,1.55],[3.9,1.3,1.15],[4.35,.85,.7]], OLIVE, 0, 0, 0, { segments: 34, steps: 28 });
  hide.finish(torso, 'trex-olive-hide', bossSkin);
  loft(belly, [[.35,.85,.95,0,.5],[1.1,1.32,1.38,0,.7],[2.1,1.6,1.48,0,.85],[3.0,1.38,1.2,0,.8],[3.55,.95,.7,0,.7]], CREAM, 0, 0, .48, { segments: 28, steps: 22 });
  belly.finish(torso, 'trex-cream-belly', bossSkin);
  for (let k = 0; k < 4; k++) panel(spines, [[-.5,.05],[0,.32],[.5,.05],[.28,-.22],[-.28,-.22]], DARK, 0, 1.1 + k * 1.0, [-1.7, -1.62, -1.38, -1.04][k], .12, .05, .1, Math.PI, 0);
  spines.finish(torso, 'trex-spine-stripes', bossSkin);
  const tail = node(torso, 'trex-tail', 0, .4, -.9), tb = assetBatch();
  sweep(tb, [[0,0,0],[0,-.35,-1.7],[.12,-.9,-3.4],[.08,-1.3,-4.9]], [.88,.62,.4,.06], OLIVE, 0, 0, 0, { segments: 14, steps: 24 });
  for (let k = 0; k < 3; k++) {
    const r = .66 - k * .14, y = -.3 - k * .38, z = -1.85 - k * 1.2, pts = [];
    for (let j = 0; j <= 16; j++) { const a = j / 16 * TAU; pts.push([Math.sin(a) * r, y, Math.cos(a) * r]); }
    sweep(tb, pts, [.06, .06], DARK, 0, 0, 0, { segments: 6, steps: 16 });
  }
  tb.finish(tail, 'trex-balancing-tail', bossSkin);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = node(torso, 'trex-arm-' + s, s * 1.45, 3.35, .95), b = assetBatch();
    loft(b, [[-1.05,.22,.26],[-.7,.3,.34],[-.25,.26,.3],[.15,.3,.34]], OLIVE, 0, 0, 0, { segments: 14, steps: 12 });
    for (let k = 0; k < 2; k++) sweep(b, [[(k * 2 - 1) * .14, -1.1, .18],[(k * 2 - 1) * .2, -1.32, .3],[(k * 2 - 1) * .18, -1.42, .4]], [.09, .07, .012], CLAW, 0, 0, 0, { segments: 6, steps: 8 });
    b.finish(arm, 'trex-small-clawed-arm-' + s, bossSkin);
    arms.push({ arm, s });
  }
  const neck = node(torso, 'trex-neck', 0, 3.7, .35), nb = assetBatch();
  sweep(nb, [[0,-.4,.1],[0,.4,.55],[0,1.2,1.05],[0,2.0,1.4]], [1.05,.9,.76,.66], OLIVE, 0, 0, 0, { segments: 20, steps: 20 });
  nb.finish(neck, 'trex-powerful-neck', bossSkin);
  const head = node(neck, 'trex-skull', 0, 2.1, 1.5), skull = assetBatch(), glow = assetBatch();
  skull.add(headGeometry(2.35, 2.7, 3.2, { snout: .45, brow: .22, cheeks: .16, jaw: .68 }), OLIVE);
  for (const s of [-1, 1]) {
    panel(skull, [[-.36,.02],[.08,.24],[.36,.0],[.12,-.2],[-.28,-.16]], DARK, s * .64, .44, .95, .12, .06, 0, 0, -s * .15);
    bulb(glow, .26, .34, .14, AMBER, s * .62, .44, 1.22, { segments: 10, steps: 8 });
    for (let k = 0; k < 4; k++) sweep(skull, [[s * (.42 + k * .16), -1.0, 1.45 - k * .34],[s * (.46 + k * .16), -1.3, 1.5 - k * .34],[s * (.44 + k * .16), -1.54, 1.54 - k * .34]], [.09, .07, .01], TOOTH, 0, 0, 0, { segments: 6, steps: 8 });
  }
  skull.finish(head, 'trex-lofted-skull', bossSkin);
  glow.finish(head, 'trex-amber-eyes', assetGlow);
  const jaw = node(head, 'trex-jaw', 0, -.85, .4), jb = assetBatch();
  sweep(jb, [[0,0,-.25],[0,-.02,.75],[0,.08,1.6],[0,.18,2.2]], [.5,.42,.28,.1], OLIVE, 0, 0, 0, { segments: 12, steps: 18, flatten: .8 });
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) sweep(jb, [[s * (.3 + k * .14), .3, .7 + k * .42],[s * (.33 + k * .14), .55, .77 + k * .42],[s * (.31 + k * .14), .68, .81 + k * .42]], [.07, .05, .008], TOOTH, 0, 0, 0, { segments: 6, steps: 8 });
  jb.finish(jaw, 'trex-hinged-jaw', bossSkin);
  return fitBoss(group, pose, 3.5, 11.6, (t, progress, state = {}) => {
    const a = attackPose(progress), walk = stride(t, state, 2.7); hitShake(pose, t, state);
    torso.rotation.x = .62 + a * .1;
    torso.position.y = 4.9 + Math.abs(walk) * .05 - a * .15;
    for (const l of legs) l.leg.rotation.x = l.s * walk * .1;
    for (const l of arms) l.arm.rotation.x = -.4 - a * .5;
    neck.rotation.x = a * .26;
    head.position.z = 1.5 + a * .9;
    head.rotation.x = -a * .22;
    jaw.rotation.x = a * .55;
    tail.rotation.x = -a * .1; tail.rotation.y = Math.sin(t * .8) * .08;
  });
}

// World 45: a giant mythical roc standing on talons with fanned feather wings, crest and tail plumes.
function buildRoc() {
  const { group, pose } = rig('sculpted-roc');
  const CHEST = 0x7a4a2b, DARKW = 0x5a3520, GOLD = 0xd9a644, CREAM = 0xf2e4c4, SKY = 0x8fc7e8, AMBER = 0xffcf6e, TALON = 0x4a3a28;
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = node(pose, 'roc-leg-' + s, s * 1.0, 3.45, 0), b = assetBatch(), down = assetBatch();
    loft(b, [[-3.35,.34,.4],[-2.9,.42,.48],[-2.0,.36,.42],[-1.0,.4,.46],[-.2,.48,.54],[.2,.42,.48]], 0xc9a05a, 0, 0, 0, { segments: 18, steps: 20 });
    for (let k = 0; k < 3; k++) {
      sweep(b, [[(k - 1) * .34, -3.3, .3],[(k - 1) * .44, -3.32, .95],[(k - 1) * .42, -3.28, 1.3]], [.17, .15, .03], 0xc9a05a, 0, 0, 0, { segments: 8, steps: 12 });
      sweep(b, [[(k - 1) * .42, -3.28, 1.3],[(k - 1) * .44, -3.24, 1.5],[(k - 1) * .4, -3.2, 1.58]], [.09, .06, .01], TALON, 0, 0, 0, { segments: 6, steps: 8 });
    }
    sweep(b, [[0, -3.3, -.2],[0, -3.32, -.6],[0, -3.28, -.78]], [.16, .14, .03], 0xc9a05a, 0, 0, 0, { segments: 8, steps: 10 });
    bulb(down, 1.15, 1.3, 1.1, CREAM, 0, -.55, .1, { segments: 16, steps: 12 });
    b.finish(leg, 'roc-scaled-bird-leg-' + s, bossSkin);
    down.finish(leg, 'roc-downy-thigh-' + s, bossCloth);
    legs.push({ leg, s });
  }
  const body = node(pose, 'roc-body', 0, 3.35, .1), coat = assetBatch(), breast = assetBatch();
  loft(coat, [[.1,.95,1.0,0,.15],[.9,1.35,1.35,0,.55],[2.0,1.62,1.5,0,.85],[3.1,1.52,1.35,0,1.0],[3.9,1.2,1.0,0,1.05],[4.35,.85,.65,0,1.0]], CHEST, 0, 0, 0, { segments: 32, steps: 26 });
  coat.finish(body, 'roc-chestnut-plumage', bossSkin);
  loft(breast, [[.5,.8,.85,0,.35],[1.3,1.2,1.1,0,.6],[2.3,1.45,1.28,0,.75],[3.1,1.25,1.02,0,.75],[3.6,.85,.6,0,.7]], CREAM, 0, 0, .55, { segments: 26, steps: 20 });
  breast.finish(body, 'roc-cream-breast', bossSkin);
  const tail = node(body, 'roc-tail-plumes', 0, .75, -1.0), tb = assetBatch(), tg = assetBatch();
  for (let k = 0; k < 5; k++) {
    const spread = (k - 2) * .24;
    sweep(k === 2 ? tg : tb, [[0,0,0],[Math.sin(spread) * .9, -.45, -1.5 - Math.abs(k - 2) * .1],[Math.sin(spread) * 1.7, -1.05, -3.1 - Math.abs(k - 2) * .25]], [.3, .24, .035], k === 2 ? GOLD : CHEST, 0, 0, 0, { segments: 8, steps: 16, flatten: .35 });
  }
  tb.finish(tail, 'roc-chestnut-tail-plumes', bossSkin);
  tg.finish(tail, 'roc-gilded-center-plume', bossMetal);
  const wings = [];
  for (const s of [-1, 1]) {
    const wing = node(body, 'roc-wing-' + s, s * 1.35, 3.3, .9), prim = assetBatch(), cov = assetBatch(), trim = assetBatch();
    for (let k = 0; k < 7; k++) {
      const rise = .5 - k * .18, zk = .12 - k * .17;
      sweep(prim, [[s * .3, 0, 0],[s * 2.0, rise * .5, zk * .6],[s * 4.2, rise, zk + .1]], [.3, .23, .025], DARKW, 0, 0, 0, { segments: 8, steps: 16, flatten: .45 });
    }
    for (let k = 0; k < 5; k++) {
      const rise = .3 + k * .06, zk = -.05 - k * .12;
      sweep(cov, [[s * .25, .1, .05],[s * 1.35, rise * .6, zk],[s * 2.6, rise, zk * .8]], [.34, .27, .05], CHEST, 0, 0, 0, { segments: 8, steps: 14, flatten: .5 });
    }
    for (let k = 0; k < 3; k++) sweep(trim, [[s * .2, .15, .1],[s * .9, .3, .05],[s * 1.6, .42, 0]], [.3, .24, .05], k === 1 ? SKY : CREAM, 0, 0, 0, { segments: 8, steps: 12, flatten: .5 });
    prim.finish(wing, 'roc-primary-feathers-' + s, bossSkin);
    cov.finish(wing, 'roc-peak-coverts-' + s, bossSkin);
    trim.finish(wing, 'roc-shoulder-covert-row-' + s, bossSkin);
    wings.push({ wing, s });
  }
  const neck = node(body, 'roc-neck', 0, 4.35, 1.15), nb = assetBatch();
  sweep(nb, [[0,0,0],[0,.75,.3],[0,1.35,.5]], [.95,.8,.7], CREAM, 0, 0, 0, { segments: 18, steps: 16 });
  loop(nb, .92, .12, GOLD, 0, .05, 0);
  nb.finish(neck, 'roc-cream-neck-and-gold-collar', bossSkin);
  const head = node(neck, 'roc-head', 0, 1.55, .6), hb = assetBatch(), glow = assetBatch(), crest = assetBatch();
  bulb(hb, 1.55, 1.5, 1.75, CREAM, 0, .1, .1, { segments: 22, steps: 18 });
  sweep(hb, [[0, .1, .95],[0, -.1, 1.6],[0, -.55, 2.0],[0, -1.05, 1.9]], [.48, .4, .24, .035], GOLD, 0, 0, 0, { segments: 10, steps: 18, flatten: .78 });
  panel(hb, [[-.4,0],[0,.18],[.4,0],[0,-.16]], 0x6a4a22, 0, .05, .95, .1, .05);
  for (const s of [-1, 1]) {
    panel(hb, [[-.26,0],[.05,.2],[.28,.02],[.08,-.14],[-.2,-.1]], 0x3a2a1a, s * .42, .28, .78, .1, .05, 0, 0, -s * .18);
    bulb(glow, .2, .26, .12, AMBER, s * .4, .28, .9, { segments: 8, steps: 6 });
    sweep(crest, [[s * .3, .75, .35],[s * .55, 1.15, -.35],[s * .7, 1.3, -1.0]], [.12, .1, .015], CHEST, 0, 0, 0, { segments: 6, steps: 10 });
  }
  hb.finish(head, 'roc-eagle-head-and-hooked-beak', bossSkin);
  glow.finish(head, 'roc-amber-eyes', assetGlow);
  crest.finish(head, 'roc-swept-crest', bossSkin);
  return fitBoss(group, pose, 3.7, 11.2, (t, progress, state = {}) => {
    const a = attackPose(progress), walk = stride(t, state, 2.9); hitShake(pose, t, state);
    body.position.y = 3.35 + Math.abs(walk) * .05 - a * .2;
    body.rotation.x = a * .12;
    for (const l of legs) l.leg.rotation.x = l.s * walk * .09;
    for (const l of wings) { l.wing.rotation.y = l.s * (.85 - a * .7 + Math.sin(t * .9) * .05); l.wing.rotation.z = l.s * (.28 + a * .38); }
    neck.rotation.x = a * .2;
    head.rotation.x = a * .5; head.rotation.y = Math.sin(t * .6) * .06;
    tail.rotation.y = Math.sin(t * .7) * .1; tail.rotation.x = a * .1;
  });
}

// World 48: the Chrono Keeper, a brass clockwork golem with a dial chest, gear shoulders and a pendulum.
function buildClockwork() {
  const { group, pose } = rig('sculpted-chrono-keeper');
  const BRASS = 0xb98a3e, COPPER = 0x9c5f33, IRON = 0x3a3630, CYAN = 0x7ce7e0, IVORY = 0xf0e6cc, GOLD = 0xd9a644;
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = node(pose, 'clockwork-leg-' + s, s * 1.15, 3.0, 0), b = assetBatch();
    loft(b, [[-2.9,.55,.6],[-2.3,.46,.5],[-1.3,.5,.54],[-.4,.6,.66],[.15,.66,.7]], IRON, 0, 0, 0, { segments: 20, steps: 18 });
    bulb(b, 1.3, .7, 1.4, BRASS, 0, -2.78, .3, { segments: 16, steps: 12 });
    b.ring(.62, .09, 0, -2.3, .05, BRASS, 'y');
    b.ring(.5, .09, 0, -1.25, .02, COPPER, 'y');
    b.finish(leg, 'clockwork-piston-leg-' + s, bossMetal);
    legs.push({ leg, s });
  }
  const torso = node(pose, 'clockwork-torso', 0, 2.95, 0), shell = assetBatch(), bands = assetBatch();
  loft(shell, [[.05,1.15,1.05],[.7,1.6,1.5],[1.8,1.85,1.7],[3.0,1.8,1.65],[3.9,1.45,1.35],[4.5,1.02,.88],[4.75,.66,.52]], BRASS, 0, 0, 0, { segments: 36, steps: 30 });
  shell.finish(torso, 'clockwork-brass-barrel', bossMetal);
  for (const [y, r] of [[.7, 1.52], [1.9, 1.78], [3.3, 1.6]]) {
    const pts = []; for (let k = 0; k <= 22; k++) { const a = k / 22 * TAU; pts.push([Math.sin(a) * r, 0, Math.cos(a) * r]); }
    sweep(bands, pts, [.11, .11], IRON, 0, y, 0, { segments: 8, steps: 22 });
  }
  bands.finish(torso, 'clockwork-iron-bands', bossMetal);
  const dial = node(torso, 'clockwork-dial', 0, 2.55, 1.6), face = assetBatch(), ticks = assetBatch();
  const circle = []; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; circle.push([Math.sin(a) * 1.08, Math.cos(a) * 1.08]); }
  panel(face, circle, IVORY, 0, 0, 0, .3, .18);
  face.cylinder(.14, .12, 0, 0, .3, GOLD, 'z', .14, 10);
  face.finish(dial, 'clockwork-ivory-dial', bossShell);
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; ticks.box(.09, .22, .06, Math.sin(a) * .88, Math.cos(a) * .88, .3, CYAN, 0, 0, a); }
  ticks.finish(dial, 'clockwork-glowing-numerals', assetGlow);
  const minuteHand = node(dial, 'clockwork-minute-hand', 0, 0, .46), hourHand = node(dial, 'clockwork-hour-hand', 0, 0, .4);
  const mh = assetBatch(); mh.box(.1, 1.15, .05, 0, .52, 0, GOLD); mh.finish(minuteHand, 'clockwork-minute-hand', bossMetal);
  const hh = assetBatch(); hh.box(.13, .75, .05, 0, .34, 0, IRON); hh.finish(hourHand, 'clockwork-hour-hand', bossMetal);
  const gears = [];
  for (const s of [-1, 1]) {
    const gear = node(torso, 'clockwork-shoulder-gear-' + s, s * 2.32, 4.55, -.3), gb = assetBatch();
    gb.cylinder(1.02, .32, 0, 0, 0, BRASS, 'x', 1.02, 16);
    const teeth = []; for (let k = 0; k <= 24; k++) { const a = k / 24 * TAU, r = k % 2 ? 1.24 : .86; teeth.push([0, Math.sin(a) * r, Math.cos(a) * r]); }
    sweep(gb, teeth, [.09, .09], COPPER, 0, 0, 0, { segments: 6, steps: 24 });
    gb.cylinder(.3, .5, 0, 0, 0, IRON, 'x', .3, 10);
    gb.finish(gear, 'clockwork-toothed-shoulder-gear-' + s, bossMetal);
    gears.push({ gear, s });
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = node(torso, 'clockwork-arm-' + s, s * 2.3, 4.5, .3), b = assetBatch();
    loft(b, [[-3.4,.4,.44],[-2.7,.5,.54],[-1.7,.4,.44],[-.7,.5,.54],[.2,.44,.48]], BRASS, 0, 0, 0, { segments: 18, steps: 18 });
    bulb(b, .62, .62, .62, IRON, 0, -1.8, 0, { segments: 12, steps: 10 });
    b.ring(.52, .08, 0, -2.5, 0, COPPER, 'y');
    for (const m of [-1, 1]) sweep(b, [[m * .18, -3.15, .18],[m * .3, -3.6, .42],[m * .38, -3.95, .72]], [.13, .1, .025], IRON, 0, 0, 0, { segments: 8, steps: 12 });
    b.finish(arm, 'clockwork-segmented-arm-' + s, bossMetal);
    arms.push({ arm, s });
  }
  const pendulum = node(torso, 'clockwork-pendulum', 0, .5, .6), pb = assetBatch(), pg = assetBatch();
  sweep(pb, [[0,0,0],[0,-1.5,0],[0,-2.7,.04]], [.09,.09,.08], GOLD, 0, 0, 0, { segments: 8, steps: 14 });
  pb.cylinder(.6, .22, 0, -2.85, .04, COPPER, 'x', .6, 14);
  bulb(pg, .3, .3, .12, CYAN, 0, -2.85, .2, { segments: 10, steps: 8 });
  pb.finish(pendulum, 'clockwork-pendulum-rod-and-bob', bossMetal);
  pg.finish(pendulum, 'clockwork-pendulum-glow', assetGlow);
  const head = node(torso, 'clockwork-hourglass-head', 0, 5.35, .1), glass = assetBatch(), frame = assetBatch(), sand = assetBatch();
  loft(glass, [[1.05,.52,.52],[.62,.95,.95],[.2,.44,.44],[-.2,.44,.44],[-.62,.95,.95],[-1.05,.52,.52]], 0xd8cfae, 0, 0, 0, { segments: 24, steps: 20 });
  glass.finish(head, 'clockwork-glass-hourglass', bossShell);
  loft(frame, [[1.28,.6,.6],[1.05,.72,.72],[.98,.78,.78]], BRASS, 0, 0, 0, { segments: 20, steps: 8 });
  loft(frame, [[-1.28,.6,.6],[-1.05,.72,.72],[-.98,.78,.78]], BRASS, 0, 0, 0, { segments: 20, steps: 8 });
  for (const [y, m] of [[1.14, 1], [-1.14, -1]]) for (let k = 0; k < 4; k++) {
    const a = k / 4 * TAU + Math.PI / 4;
    sweep(frame, [[Math.sin(a) * .68, y, Math.cos(a) * .68],[Math.sin(a) * .5, y + m * .2, Math.cos(a) * .5]], [.07, .06], IRON, 0, 0, 0, { segments: 6, steps: 8 });
  }
  bulb(frame, .5, .5, .5, GOLD, 0, 1.5, 0, { segments: 12, steps: 8 });
  sweep(frame, [[0,1.7,0],[0,2.05,.02],[0,2.3,.05]], [.1, .06, .012], GOLD, 0, 0, 0, { segments: 6, steps: 10 });
  frame.finish(head, 'clockwork-brass-hourglass-frame', bossMetal);
  bulb(sand, .5, .75, .5, CYAN, 0, .5, 0, { segments: 12, steps: 10 });
  bulb(sand, .34, .5, .34, CYAN, 0, -.55, 0, { segments: 10, steps: 8 });
  sand.finish(head, 'clockwork-flowing-sand', assetGlow);
  return fitBoss(group, pose, 3.4, 10.8, (t, progress, state = {}) => {
    const a = attackPose(progress), walk = stride(t, state, 2.6); hitShake(pose, t, state);
    torso.position.y = 2.95 + Math.abs(walk) * .04;
    for (const l of legs) l.leg.rotation.x = l.s * walk * .09;
    for (const l of arms) { l.arm.rotation.x = -a * 1.15 - l.s * walk * .05; l.arm.rotation.z = -l.s * (.06 + a * .12); }
    for (const g of gears) g.gear.rotation.x = t * .7 * g.s - a * 1.4;
    minuteHand.rotation.z = -t * .52; hourHand.rotation.z = -t * .043;
    pendulum.rotation.z = Math.sin(t * 2.3) * (.26 + a * .3);
    head.position.y = 5.35 + Math.sin(t * 1.1) * .06; head.rotation.y = Math.sin(t * .5) * .06;
  });
}

// World 50: the Singularity Overlord, a four-armed cosmic monarch with a shard halo and void crown.
function buildOverlord() {
  const { group, pose } = rig('sculpted-singularity-overlord');
  const VIOLET = 0x3a2450, DEEP = 0x1c1130, GOLD = 0xd9a644, STAR = 0xfff6d8, MAGENTA = 0xff6bd8;
  const robeNode = node(pose, 'overlord-robe'), rb = assetBatch();
  loft(rb, [[.15,1.6,1.5],[.8,2.1,1.95],[2.4,2.4,2.2],[4.4,2.1,1.9],[5.6,1.7,1.5],[6.6,1.4,1.2],[6.9,.8,.6]], VIOLET, 0, 0, 0, { segments: 40, steps: 30, warp(x, y, z, u, v, a) { const f = 1 + .05 * Math.cos(a * 9) * (1 - v * .5); return [x * f, y + .06 * Math.sin(a * 7) ** 2 * (1 - v) ** 7, z * f]; } });
  rb.finish(robeNode, 'overlord-folded-void-robe', bossCloth);
  const torso = node(pose, 'overlord-torso', 0, 6.55, .1), tb = assetBatch(), trims = assetBatch();
  loft(tb, [[.05,1.1,1.0],[.5,1.55,1.4],[1.4,1.8,1.6],[2.4,1.7,1.5],[3.0,1.35,1.15],[3.3,.9,.7]], DEEP, 0, 0, 0, { segments: 32, steps: 26 });
  tb.finish(torso, 'overlord-void-cuirass', bossCloth);
  for (const s of [-1, 1]) sweep(trims, [[s * .5, .4, 1.05],[s * .62, 1.5, 1.4],[s * .5, 2.6, 1.35],[s * .2, 3.1, 1.1]], [.06, .08, .06, .03], GOLD);
  trims.finish(torso, 'overlord-gold-seams', bossMetal);
  const core = assetBatch(), socket = assetBatch();
  panel(socket, [[-.55,0],[0,.6],[.55,0],[0,-.6]], 0x0a0614, 0, 1.55, 1.45, .2, .1);
  bulb(core, .5, .5, .3, MAGENTA, 0, 1.55, 1.56, { segments: 14, steps: 10 });
  socket.finish(torso, 'overlord-void-socket', bossCloth);
  core.finish(torso, 'overlord-singularity-core', assetGlow);
  const upperArms = [], lowerArms = [];
  for (const s of [-1, 1]) {
    const ua = node(torso, 'overlord-upper-arm-' + s, s * 2.0, 2.85, 0), ub = assetBatch();
    loft(ub, [[-2.5,.34,.4],[-2.0,.46,.52],[-1.1,.4,.46],[-.35,.46,.5],[.1,.4,.44]], VIOLET, 0, 0, 0, { segments: 16, steps: 16 });
    ub.ring(.5, .08, 0, -2.1, 0, GOLD, 'y');
    clawHand(ub, 0, -2.5, .2, .55, DEEP);
    ub.finish(ua, 'overlord-raised-arm-' + s, bossCloth);
    upperArms.push({ arm: ua, s });
    const la = node(torso, 'overlord-lower-arm-' + s, s * 1.7, 1.05, .15), lb = assetBatch();
    loft(lb, [[-2.3,.32,.38],[-1.8,.44,.48],[-.9,.36,.42],[-.2,.42,.46],[.1,.36,.4]], VIOLET, 0, 0, 0, { segments: 16, steps: 16 });
    lb.ring(.46, .07, 0, -1.9, 0, GOLD, 'y');
    clawHand(lb, 0, -2.28, .18, .5, DEEP);
    lb.finish(la, 'overlord-lower-arm-' + s, bossCloth);
    lowerArms.push({ arm: la, s });
  }
  const scepter = node(upperArms[1].arm, 'overlord-scepter', 0, -2.5, .25), sb = assetBatch(), sg = assetBatch();
  scepter.rotation.set(-.3, 0, -.4);
  sweep(sb, [[0,-1.4,0],[0,-.2,0],[0,1.2,0],[0,2.1,.05]], [.14,.16,.14,.11], GOLD, 0, 0, 0, { segments: 8, steps: 16 });
  for (let k = 0; k < 4; k++) { const a = k / 4 * TAU / 2; sweep(sb, [[Math.sin(a) * .1, 2.05, Math.cos(a) * .1],[Math.sin(a) * .3, 2.45, Math.cos(a) * .3]], [.05, .015], GOLD, 0, 0, 0, { segments: 6, steps: 8 }); }
  bulb(sg, .5, .6, .5, MAGENTA, 0, 2.7, .05, { segments: 12, steps: 10 });
  sb.finish(scepter, 'overlord-gold-scepter', bossMetal);
  sg.finish(scepter, 'overlord-scepter-star', assetGlow);
  const orb = node(lowerArms[0].arm, 'overlord-orb', 0, -2.3, .3), ob = assetBatch(), og = assetBatch();
  bulb(ob, .95, .95, .95, 0x50407f, 0, .35, 0, { segments: 18, steps: 14 });
  bulb(og, .48, .58, .48, MAGENTA, 0, 1.12, .14, { segments: 12, steps: 10 });
  for (let k = 0; k < 2; k++) sweep(ob, [[-.5, .1, k * .3 - .15],[0, .1, k * .3 - .15],[.5, .1, k * .3 - .15]], [.05, .06, .05], GOLD, 0, 0, 0, { segments: 6, steps: 10 });
  ob.finish(orb, 'overlord-orb-shell', bossShell);
  og.finish(orb, 'overlord-orb-core', assetGlow);
  const head = node(torso, 'overlord-head', 0, 3.5, .12), hood = assetBatch(), face = assetBatch(), eyes = assetBatch();
  bulb(hood, 2.0, 2.3, 2.0, DEEP, 0, .1, -.1, { segments: 26, steps: 20 });
  hood.finish(head, 'overlord-crowned-hood', bossCloth);
  panel(face, [[-.62,.12],[-.22,.58],[.32,.52],[.64,.06],[.32,-.42],[-.27,-.44]], 0x140a24, 0, .1, .92, .25, .1);
  face.finish(head, 'overlord-void-face', bossCloth);
  for (const s of [-1, 1]) panel(eyes, [[-.36,0],[0,.18],[.36,0],[0,-.15]], STAR, s * .32, .24, 1.08, .06, .04, 0, 0, -s * .3);
  panel(eyes, [[-.09,0],[0,.3],[.09,0],[0,-.28]], MAGENTA, 0, .62, 1.0, .05, .04);
  eyes.finish(head, 'overlord-starlight-eyes', assetGlow);
  const crown = assetBatch(), gems = assetBatch();
  crown.add(crownGeometry(1.02, .9, 7), GOLD, 0, 1.05, -.05);
  sweep(crown, [[-.5,.6,1.0],[0,.78,1.06],[.5,.6,1.0]], [.04, .055, .04], GOLD, 0, 0, 0, { segments: 6, steps: 10 });
  for (let k = 0; k < 3; k++) { const a = (k - 1) * .55; bulb(gems, .16, .2, .14, MAGENTA, Math.sin(a) * .98, 1.72, Math.cos(a) * .95, { segments: 8, steps: 6 }); }
  crown.finish(head, 'overlord-gold-crown', bossMetal);
  gems.finish(head, 'overlord-crown-gems', assetGlow);
  const halo = node(pose, 'overlord-shard-halo', 0, 11.2, -1.2), ringB = assetBatch(), shards = assetBatch(), shardGlow = assetBatch();
  const ringPts = []; for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU; ringPts.push([Math.sin(a) * 2.3, Math.cos(a) * 2.3, 0]); }
  sweep(ringB, ringPts, [.07, .07], GOLD, 0, 0, 0, { segments: 8, steps: 48 });
  ringB.finish(halo, 'overlord-gold-halo-ring', bossMetal);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * TAU, x = Math.sin(a) * 2.3, y = Math.cos(a) * 2.3;
    (k % 2 ? shardGlow : shards).add(loftGeometry([[-.02,.03,.02],[.28,.13,.055],[.66,.19,.085],[1.0,.008,.006]], { segments: 8, steps: 8 }), k % 2 ? MAGENTA : 0x8a6ab8, x, y, 0, 0, 0, -a);
  }
  shards.finish(halo, 'overlord-orbiting-shards', bossMetal);
  shardGlow.finish(halo, 'overlord-shard-fires', assetGlow);
  const cape = node(torso, 'overlord-cape', 0, 3.2, -1.0), cb = assetBatch();
  cb.add(clothGeometry(3.2, 5.4, { folds: 7, flare: .3, depth: .16, segments: 22, steps: 20 }), 0x2c1a44, 0, 0, 0, 0, Math.PI);
  cb.finish(cape, 'overlord-folded-cape', bossCloth);
  return fitBoss(group, pose, 4.0, 13, (t, progress, state = {}) => {
    const a = attackPose(progress); hitShake(pose, t, state);
    torso.position.y = 6.55 + Math.sin(t * .9) * .05 - a * .12;
    torso.rotation.y = Math.sin(t * .4) * .04;
    for (const l of upperArms) { l.arm.rotation.x = -.35 - a * 1.95; l.arm.rotation.z = l.s * (.42 + a * .2); }
    for (const l of lowerArms) { l.arm.rotation.x = -a * 1.2; l.arm.rotation.z = -l.s * .08; }
    head.rotation.x = -a * .14; head.rotation.y = Math.sin(t * .5) * .05;
    halo.rotation.z = t * .3 + a * 1.6;
    halo.scale.setScalar(1 + a * .16);
    halo.position.y = 11.2 + a * .7;
    cape.rotation.x = .08 + Math.sin(t * 1.2) * .03 + a * .1;
  });
}

export function buildSculptedWild(type) {
  switch (type) {
    case 'panda': return buildPanda();
    case 'shogun': return buildShogun();
    case 'trex': return buildTrex();
    case 'roc': return buildRoc();
    case 'clockwork': return buildClockwork();
    case 'overlord': return buildOverlord();
    default: return null;
  }
}
