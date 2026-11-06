import * as THREE from 'three';
import { assetBatch, assetGlow, attackPose } from './asset-kit.js';

const C = {
  ink: 0x171d32, joint: 0x36435b, steel: 0x7d94a6, ivory: 0xf7eddb,
  gold: 0xe7b348, lightGold: 0xffdf86, amber: 0xffbd50, red: 0xc7394a,
  violet: 0x665089, purple: 0x352d59, cyan: 0x85e9f4,
};
const TAU = Math.PI * 2;

function node(parent, name, x = 0, y = 0, z = 0) {
  const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g;
}
function cone(batch, r, h, x, y, z, color, rx = 0, ry = 0, rz = 0, sides = 8) {
  return batch.add(new THREE.ConeGeometry(r, h, sides), color, x, y, z, rx, ry, rz);
}
function gem(batch, r, x, y, z, color, sx = 1, sy = 1, sz = 1, rz = 0) {
  return batch.add(new THREE.OctahedronGeometry(r).scale(sx, sy, sz), color, x, y, z, 0, 0, rz);
}
function plate(batch, points, depth, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const shape = new THREE.Shape();
  points.forEach(([px, py], i) => i ? shape.lineTo(px, py) : shape.moveTo(px, py)); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -depth * 0.5);
  return batch.add(g, color, x, y, z, rx, ry, rz);
}
function hose(batch, points, radius, color, sides = 6) {
  return batch.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 10, radius, sides, false), color);
}
function eyes(surface, glow, separation, y, z, color = C.amber, width = 0.55) {
  for (const s of [-1, 1]) {
    surface.box(width + 0.2, 0.34, 0.16, s * separation, y, z, C.ink, 0, 0, -s * 0.16);
    glow.box(width, 0.14, 0.18, s * separation, y - 0.01, z + 0.05, color, 0, 0, -s * 0.16);
  }
}
function motion(t, state) {
  return state.moving === false || state.stunned ? 0 : Math.sin(t * 3.6);
}
function rootRig(name) {
  const group = new THREE.Group(); group.name = name;
  return { group, pose: node(group, `${name}-pose`) };
}
function poseHit(pose, t, state, strength = 0.06) {
  const hit = Math.min(1, Math.max(0, state.hit || 0));
  pose.rotation.z = Math.sin(t * 37) * hit * strength;
  pose.position.z = -hit * 0.12;
}
function finishRig(rig, radius, height, animate) {
  const result = { group: rig.group, radius, height, animate };
  result.animate(0, 0, { moving: false, health: 1 });
  const bounds = new THREE.Box3().setFromObject(rig.pose);
  rig.pose.scale.setScalar(height / bounds.max.y);
  return result;
}

function buildDrill() {
  const rig = rootRig('foundry-drill'), { pose } = rig;
  const body = assetBatch(), lit = assetBatch();
  for (const s of [-1, 1]) {
    body.box(1.45, 1.35, 3.7, s * 2.0, 0.78, -0.2, C.ink);
    body.box(1.6, 0.35, 3.85, s * 2, 1.35, -0.2, 0xa87f3e);
    for (let k = 0; k < 6; k++) {
      body.cylinder(0.43, 1.5, s * 2, 0.65, -1.65 + k * 0.58, C.steel, 'x', 0.43, 8);
      body.box(1.5, 0.14, 0.21, s * 2, 0.12, -1.65 + k * 0.58, C.joint);
    }
  }
  body.box(3.65, 0.75, 2.5, 0, 1.6, -0.15, C.joint);
  body.cylinder(1.9, 0.42, 0, 2.08, 0, C.gold, 'y', 2.05);
  body.finish(pose, 'foundry-tread-chassis');
  const cabin = node(pose, 'foundry-cabin', 0, 2.25, 0);
  const armor = assetBatch();
  armor.box(3.4, 3.25, 2.55, 0, 1.72, -0.2, 0xbc8538);
  armor.box(3.7, 0.55, 2.75, 0, 0.3, -0.2, C.ink);
  armor.box(2.75, 1.5, 0.26, 0, 2.14, 1.17, C.ink);
  armor.box(2.35, 0.58, 0.25, 0, 2.4, 1.34, C.steel);
  for (const s of [-1, 1]) {
    armor.box(0.48, 1.35, 0.35, s * 1.52, 1.22, 1.12, C.gold, 0, 0, -s * 0.25);
    for (let j = 0; j < 3; j++) armor.box(0.7, 0.15, 0.25, s * 1.07, 0.9 + j * 0.33, 1.21, C.ink, 0, 0, s * 0.35);
    armor.cylinder(0.24, 2.4 + (s > 0 ? 0.6 : 0), s * 1.12, 5.0 + (s > 0 ? 0.3 : 0), -0.95, C.ink);
    armor.cylinder(0.36, 0.3, s * 1.12, 6.2 + (s > 0 ? 0.6 : 0), -0.95, C.steel);
    armor.box(0.52, 0.62, 0.5, s * 0.8, 3.72, -0.1, C.gold);
  }
  armor.box(2.5, 0.65, 1.85, 0, 3.47, -0.2, C.steel);
  armor.box(1.8, 0.5, 1.4, 0, 3.98, -0.2, C.ink);
  armor.finish(cabin, 'foundry-cabin-armor');
  lit.box(1.8, 0.22, 0.2, 0, 2.4, 1.5, C.amber).box(0.22, 0.8, 0.25, 0, 1.14, 1.25, C.amber);
  lit.finish(cabin, 'foundry-slits', assetGlow);
  const drills = [];
  for (const s of [-1, 1]) {
    const arm = node(cabin, `drill-arm-${s}`, s * 2.15, 2.0, -0.12);
    const b = assetBatch();
    b.cylinder(0.68, 0.85, 0, 0, 0, C.joint, 'x');
    b.box(1.05, 1.15, 1.55, s * 0.18, -0.32, 0.58, 0xb78438);
    b.cylinder(0.48, 1.65, s * 0.18, -0.3, 1.5, C.ink, 'z');
    b.cylinder(0.65, 0.28, s * 0.18, -0.3, 2.25, C.gold, 'z');
    b.finish(arm, `drill-housing-${s}`);
    const spindle = node(arm, `drill-spindle-${s}`, s * 0.18, -0.3, 2.3);
    const tip = assetBatch();
    cone(tip, 0.76, 2.9, 0, 0, 1.4, C.steel, Math.PI / 2);
    for (let j = 0; j < 6; j++) {
      const a = j * TAU / 6;
      tip.beam([Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0.2], [Math.cos(a + 1.1) * 0.13, Math.sin(a + 1.1) * 0.13, 2.55], 0.16, 0.13, j % 2 ? C.gold : C.ink);
    }
    tip.finish(spindle, `drill-cutting-head-${s}`);
    drills.push({ arm, spindle, s });
  }
  return finishRig(rig, 3.4, 9, (t, attack, state = {}) => {
    const a = attackPose(attack), walk = motion(t, state);
    poseHit(pose, t, state); cabin.position.y = 2.25 + Math.abs(walk) * 0.07;
    cabin.rotation.y = Math.sin(t * 0.65) * 0.06;
    for (const d of drills) {
      d.spindle.rotation.z = t * (state.stunned ? 0 : 12) + a * 4;
      d.arm.rotation.x = -a * 0.38 + walk * d.s * 0.025;
      d.arm.position.z = -0.12 + a * 0.45;
    }
  });
}

function pip(batch, x, y, z, axis = 'z', color = C.ink, radius = 0.22) {
  batch.cylinder(radius, 0.07, x, y, z, color, axis, radius, 10);
}
function smallDie(parent, name, color) {
  const g = node(parent, name), b = assetBatch();
  b.box(0.8, 0.8, 0.8, 0, 0, 0, color);
  for (const s of [-1, 1]) { pip(b, s * 0.18, s * 0.18, 0.42, 'z', C.gold, 0.08); pip(b, 0.42, s * 0.18, -s * 0.18, 'x', C.gold, 0.08); }
  pip(b, 0, 0.42, 0, 'y', C.gold, 0.1); b.finish(g, name); return g;
}
function buildDice() {
  const rig = rootRig('clockwork-dice'), { pose } = rig;
  const base = assetBatch();
  for (const s of [-1, 1]) {
    base.box(1.1, 0.8, 1.85, s * 1.3, 0.45, 0.35, C.red);
    base.box(0.7, 1.2, 0.9, s * 1.3, 1.34, 0, C.gold);
    base.ring(0.4, 0.1, s * 1.3, 1.4, 0.55, C.ink, 'z');
  }
  base.finish(pose, 'dice-clockwork-feet');
  const body = node(pose, 'dice-body', 0, 4.1, 0);
  const b = assetBatch(), g = assetBatch();
  b.box(4.3, 4.3, 4.1, 0, 0, 0, C.ivory);
  for (const s of [-1, 1]) {
    b.box(0.2, 4.3, 0.25, s * 2.0, 0, 2.09, C.gold);
    b.box(4.1, 0.2, 0.25, 0, s * 2, 2.09, C.gold);
    b.box(0.22, 4.3, 0.25, s * 2.0, 0, -2.0, C.red);
    b.box(0.7, 0.2, 0.18, s * 0.8, 0.77, 2.12, C.ink, 0, 0, -s * 0.3);
    b.box(0.8, 0.32, 0.15, s * 0.8, 0.35, 2.12, C.ink);
    g.box(0.45, 0.13, 0.2, s * 0.8, 0.36, 2.2, C.amber);
    for (const y of [-1, 0, 1]) pip(b, s * 2.17, y, s * 0.92, 'x');
  }
  b.box(1.45, 0.32, 0.2, 0, -0.65, 2.12, C.ink);
  for (let j = 0; j < 3; j++) b.box(0.2, 0.25, 0.22, -0.42 + j * 0.42, -0.63, 2.2, C.gold);
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1], [0, 0]]) pip(b, x, 2.17, z, 'y');
  b.cylinder(1.12, 0.4, 0, 2.4, 0, C.gold, 'y', 1.38);
  for (let k = 0; k < 6; k++) {
    const a = k * TAU / 6;
    cone(b, 0.22, 0.9, Math.cos(a) * 1.04, 3.0, Math.sin(a) * 1.04, C.gold);
    gem(g, 0.17, Math.cos(a) * 1.04, 2.95, Math.sin(a) * 1.04, k % 2 ? C.red : C.amber);
  }
  b.finish(body, 'dice-ivory-gold-shell'); g.finish(body, 'dice-eyes-and-jewels', assetGlow);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = node(body, `dice-arm-${s}`, s * 2.2, -0.4, 0);
    const b = assetBatch();
    b.beam([0, 0, 0], [s * 0.65, -0.85, 0.3], 0.35, 0.35, C.gold);
    b.sphere(0.5, s * 0.7, -1.05, 0.5, C.red);
    b.cylinder(0.65, 0.12, s * 0.7, -0.83, 0.5, C.gold, 'y');
    b.finish(arm, `dice-glove-${s}`); arms.push({ arm, s });
  }
  const dice = [smallDie(pose, 'juggling-die-0', C.red), smallDie(pose, 'juggling-die-1', C.ivory), smallDie(pose, 'juggling-die-2', C.red)];
  return finishRig(rig, 3.2, 9.5, (t, attack, state = {}) => {
    const a = attackPose(attack), walk = motion(t, state);
    poseHit(pose, t, state); body.position.y = 4.1 + Math.abs(walk) * 0.09 + a * 0.25;
    body.rotation.y = Math.sin(t * 0.9) * 0.12;
    arms.forEach(({ arm, s }) => { arm.rotation.z = s * (0.15 + a * 0.4); arm.rotation.x = Math.sin(t * 2 + s) * 0.12; });
    dice.forEach((d, k) => {
      const phase = t * (state.stunned ? 0 : 1.8) + k * TAU / 3;
      d.position.set(Math.cos(phase) * 2.8, 8.25 + Math.sin(phase * 2) * 0.72, Math.sin(phase) * 1.1);
      d.rotation.set(phase * 0.6, phase, phase * 0.4);
    });
  });
}

function buildKraken() {
  const rig = rootRig('coral-kraken'), { pose } = rig;
  const head = node(pose, 'kraken-mantle', 0, 5.4, -0.3);
  const shell = assetBatch(), light = assetBatch();
  shell.sphere(1, 0, 0.4, 0, 0xa83f69, 2.25, 3.45, 1.65);
  shell.sphere(1, 0, -1.25, 0.35, 0xd46d85, 2.2, 1.7, 1.7);
  for (const s of [-1, 1]) {
    plate(shell, [[0, -0.6], [s * 1.4, -0.1], [s * 1.0, 2.3], [0, 3.8]], 0.3, 0x6a4a6c, s * 1.2, 0.2, -0.6, 0, s * 0.22);
    shell.sphere(0.72, s * 0.9, -0.7, 1.42, C.ivory, 1, 1.1, 0.45);
    shell.sphere(0.37, s * 0.9, -0.7, 1.75, C.ink, 0.85, 1.3, 0.3);
    light.sphere(0.19, s * 0.88, -0.7, 1.84, C.cyan, 0.7, 1.3, 0.25);
    shell.beam([s * 0.34, -0.05, 1.6], [s * 1.58, -0.12, 1.49], 0.25, 0.3, 0x632f56);
    for (let k = 0; k < 4; k++) shell.cylinder(0.19 - k * 0.018, 0.09, s * (1.2 - k * 0.15), 0.4 + k * 0.64, 1.2 - k * 0.15, 0xf2a7a3, 'z');
  }
  shell.cylinder(0.7, 0.8, 0, -2.12, 1.1, C.ink, 'z', 0.92, 8);
  cone(shell, 0.34, 0.8, -0.24, -2.25, 1.64, 0xe7b38a, Math.PI / 2, 0, -0.2);
  cone(shell, 0.34, 0.8, 0.24, -2.25, 1.64, 0xe7b38a, Math.PI / 2, 0, 0.2);
  shell.finish(head, 'kraken-mantle-shell'); light.finish(head, 'kraken-pupils', assetGlow);
  const tentacles = [];
  for (let k = 0; k < 8; k++) {
    const angle = k * TAU / 8;
    const hip = node(pose, `kraken-tentacle-${k}`, Math.sin(angle) * 1.35, 3.25, Math.cos(angle) * 1.1);
    hip.rotation.y = angle;
    const upper = assetBatch();
    hose(upper, [[0, 0, 0], [0, -0.15, 0.7], [0, -0.55, 1.4], [0, -1.2, 1.9]], 0.45, k % 2 ? 0xbd507a : 0xd46d85);
    for (let j = 0; j < 3; j++) upper.cylinder(0.19, 0.08, 0, -0.27 - j * 0.3, 0.5 + j * 0.5, 0xf2c4b2, 'y', 0.19, 8);
    upper.finish(hip, `kraken-upper-${k}`);
    const tip = node(hip, `kraken-hook-${k}`, 0, -1.2, 1.9), b = assetBatch();
    hose(b, [[0, 0, 0], [0, -0.85, 0.5], [0, -1.15, 1.1], [0, -0.8, 1.55], [0, -0.2, 1.5]], 0.28, 0xbd507a);
    for (let j = 0; j < 3; j++) b.sphere(0.13, 0, -0.6 - Math.sin(j * 0.8) * 0.22, 0.5 + j * 0.35, 0xf2c4b2, 1, 0.45, 1);
    b.finish(tip, `kraken-sucker-tip-${k}`); tentacles.push({ hip, tip, angle });
  }
  return finishRig(rig, 3.3, 10, (t, attack, state = {}) => {
    const a = attackPose(attack), active = !state.stunned;
    poseHit(pose, t, state); head.position.y = 5.4 + Math.sin(t * 1.8) * 0.1 - a * 0.22;
    head.rotation.x = -a * 0.13; head.scale.y = 1 + Math.sin(t * 1.8) * 0.025;
    for (const { hip, tip, angle } of tentacles) {
      hip.rotation.x = (active ? Math.sin(t * 1.9 + angle) * 0.11 : 0) - a * 0.2;
      hip.rotation.z = active ? Math.cos(t * 1.5 + angle) * 0.1 : 0;
      tip.rotation.x = (active ? Math.sin(t * 2.1 + angle + 0.8) * 0.23 : 0) - a * 0.2;
    }
  });
}

function buildPumpkin() {
  const rig = rootRig('lantern-pumpkin'), { pose } = rig;
  const robes = node(pose, 'pumpkin-robes'), b = assetBatch();
  for (let k = 0; k < 8; k++) {
    const angle = k * TAU / 8, radial = 1.5;
    plate(b, [[-0.7, 0.2], [0.85, 0], [0.64, 5.5], [-0.5, 5.85]], 0.14, k % 2 ? 0x382b51 : 0x514064,
      Math.sin(angle) * radial, 0.05, Math.cos(angle) * radial, 0, angle, 0);
  }
  b.box(3.25, 1.2, 1.8, 0, 5.4, 0, 0x3c3546);
  b.box(2.9, 0.55, 2.0, 0, 5.8, 0, 0x79556c);
  b.box(0.55, 3.4, 0.26, 0, 3.4, 1.62, 0x78566b);
  for (let k = 0; k < 4; k++) b.ring(0.17, 0.06, 0, 2.1 + k * 0.8, 1.83, C.gold, 'z');
  b.finish(robes, 'pumpkin-folded-cloak');
  const head = node(pose, 'pumpkin-lantern-head', 0, 7.8, 0.1), h = assetBatch(), glow = assetBatch();
  for (let k = 0; k < 9; k++) {
    const angle = k * TAU / 9;
    h.sphere(1, Math.sin(angle) * 0.9, 0, Math.cos(angle) * 0.9, k % 2 ? 0xd97429 : 0xec9138, 0.78, 1.65, 0.78);
  }
  h.cylinder(0.25, 0.7, 0, 1.8, 0, 0x56734a, 'y', 0.4, 7);
  h.box(0.75, 0.28, 0.55, 0.22, 2.13, 0, 0x56734a, 0, 0, -0.4);
  h.cylinder(0.95, 0.36, 0, 1.55, 0, C.gold, 'y', 1.12);
  for (let k = 0; k < 5; k++) {
    const angle = k * TAU / 5;
    cone(h, 0.18, 0.8, Math.sin(angle) * 0.94, 2.08, Math.cos(angle) * 0.94, C.gold);
  }
  for (const s of [-1, 1]) {
    plate(h, [[-0.48, -0.24], [0.5, -0.16], [s * -0.2, 0.4]], 0.12, C.ink, s * 0.62, 0.35, 1.6, 0, 0, -s * 0.1);
    plate(glow, [[-0.29, -0.11], [0.31, -0.07], [s * -0.12, 0.23]], 0.13, C.amber, s * 0.62, 0.35, 1.69, 0, 0, -s * 0.1);
  }
  plate(h, [[-1.05, 0], [-0.55, -0.5], [0.55, -0.5], [1.05, 0], [0.45, -0.15], [0, -0.3], [-0.45, -0.15]], 0.15, C.ink, 0, -0.43, 1.6);
  for (let k = 0; k < 5; k++) glow.box(0.24, 0.14, 0.16, -0.63 + k * 0.31, -0.72 + Math.abs(2 - k) * 0.07, 1.7, C.amber, 0, 0, (k - 2) * 0.13);
  h.finish(head, 'pumpkin-carved-shell'); const face = glow.finish(head, 'pumpkin-lantern-face', assetGlow);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = node(pose, `pumpkin-vine-arm-${s}`, s * 1.75, 5.3, 0.1), a = assetBatch();
    a.beam([0, 0, 0], [s * 0.65, -1.1, 0.2], 0.55, 0.5, 0x4a3e54);
    a.beam([s * 0.65, -1.1, 0.2], [s * 0.82, -2.05, 0.75], 0.3, 0.3, 0x6f7448);
    for (let j = 0; j < 3; j++) {
      a.beam([s * 0.82, -1.95, 0.75], [s * (0.5 + j * 0.24), -2.6, 1.1], 0.12, 0.13, 0x9b9a65);
      cone(a, 0.11, 0.45, s * (0.5 + j * 0.24), -2.65, 1.26, 0xc6b287, Math.PI / 2);
    }
    a.finish(arm, `pumpkin-branch-claw-${s}`); arms.push({ arm, s });
  }
  const lamp = node(arms[1].arm, 'pumpkin-hand-lantern', 0.82, -3.05, 0.72), l = assetBatch(), fire = assetBatch();
  l.ring(0.32, 0.07, 0, 0.68, 0, C.ink, 'z');
  l.cylinder(0.58, 0.22, 0, 0.38, 0, C.gold, 'y', 0.68, 6);
  l.cylinder(0.58, 0.22, 0, -0.55, 0, C.gold, 'y', 0.45, 6);
  for (let k = 0; k < 6; k++) { const a = k * TAU / 6; l.beam([Math.cos(a) * 0.48, -0.46, Math.sin(a) * 0.48], [Math.cos(a) * 0.48, 0.35, Math.sin(a) * 0.48], 0.09, 0.09, C.ink); }
  gem(fire, 0.55, 0, -0.05, 0, C.amber, 0.65, 1.1, 0.65); l.finish(lamp, 'pumpkin-lantern-cage'); fire.finish(lamp, 'pumpkin-lantern-flame', assetGlow);
  return finishRig(rig, 3, 11, (t, attack, state = {}) => {
    const a = attackPose(attack); poseHit(pose, t, state);
    robes.rotation.y = Math.sin(t * 0.8) * 0.035;
    head.rotation.set(-a * 0.14, Math.sin(t * 0.7) * 0.08, Math.sin(t * 1.5) * 0.055);
    arms.forEach(({ arm, s }) => { arm.rotation.x = -a * (s > 0 ? 0.55 : 0.85) + Math.sin(t * 1.4 + s) * 0.07; arm.rotation.z = s * (0.08 + a * 0.06); });
    lamp.rotation.x = Math.sin(t * 1.6) * 0.09 + a * 0.25;
    face.scale.y = 1 + Math.sin(t * 6) * 0.025 + a * 0.04;
  });
}

function armoredLeg(parent, name, s, x, y, palette, length = 2.7) {
  const leg = node(parent, name, s * x, y, 0), b = assetBatch();
  b.box(0.95, length * 0.54, 1.1, 0, -length * 0.28, 0, palette.dark);
  b.box(1.05, length * 0.44, 0.8, 0, -length * 0.29, 0.35, palette.armor);
  b.cylinder(0.44, 1.1, 0, -length * 0.54, 0.15, palette.trim, 'x', 0.44, 8);
  b.box(1.14, length * 0.45, 1.1, 0, -length * 0.75, 0.1, palette.armor);
  b.box(1.3, 0.58, 1.8, 0, -length + 0.29, 0.42, palette.dark);
  b.box(1.22, 0.24, 0.8, 0, -length + 0.47, 0.95, palette.trim);
  b.finish(leg, name); return leg;
}
function buildCommander() {
  const rig = rootRig('siege-commander'), { pose } = rig;
  const palette = { armor: 0xb82f43, dark: 0x302b3d, trim: C.gold };
  const legs = [-1, 1].map(s => ({ leg: armoredLeg(pose, `commander-leg-${s}`, s, 1, 2.9, palette, 2.85), s }));
  const torso = node(pose, 'commander-torso', 0, 3, 0), b = assetBatch(), glow = assetBatch();
  b.box(3.25, 3.05, 2.1, 0, 1.65, -0.1, palette.armor);
  b.box(3.35, 0.5, 2.2, 0, 0.3, -0.1, palette.dark);
  b.box(0.62, 0.62, 0.23, 0, 0.3, 1.1, C.gold);
  b.box(2.7, 1.75, 0.55, 0, 2.03, 1.0, 0xd04b54);
  b.box(0.4, 2.9, 0.21, -0.5, 1.7, 1.36, C.gold, 0, 0, -0.16);
  for (let k = 0; k < 3; k++) b.box(0.52, 0.19, 0.2, 0.73, 2.25 - k * 0.29, 1.42, k % 2 ? C.ivory : C.gold);
  for (const s of [-1, 1]) {
    b.box(1.15, 0.5, 1.6, s * 1.85, 3.05, -0.1, C.gold);
    plate(b, [[-0.65, 0], [0.65, 0], [0.48, -1.85], [-0.6, -1.6]], 0.2, palette.armor, s * 0.9, 0.05, -0.7, -0.12);
  }
  b.box(2.6, 2.6, 1.1, 0, 1.8, -1.35, C.ink);
  b.cylinder(0.1, 2.1, -0.9, 4.4, -1.45, C.steel);
  b.sphere(0.18, -0.9, 5.45, -1.45, C.red);
  b.finish(torso, 'commander-coat-armor');
  const head = node(torso, 'commander-head', 0, 4.22, 0), h = assetBatch();
  h.box(1.7, 1.65, 1.55, 0, 0, 0, 0xbf695e);
  h.box(1.8, 0.75, 1.65, 0, -0.48, -0.05, C.joint);
  h.box(1.68, 0.42, 0.25, 0, -0.34, 0.88, C.ink);
  h.box(2.3, 0.28, 2.2, 0, 0.76, 0.2, C.ink);
  h.box(2.05, 0.76, 1.65, 0, 1.1, -0.12, palette.armor, 0.12);
  h.box(0.7, 0.58, 0.15, 0, 1.1, 0.85, C.gold);
  gem(h, 0.22, 0, 1.11, 1, C.ivory, 1, 1, 0.3);
  eyes(h, glow, 0.4, 0.15, 0.83, C.amber, 0.43);
  h.finish(head, 'commander-officer-helmet'); glow.finish(head, 'commander-visor', assetGlow);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = node(torso, `commander-arm-${s}`, s * 2.0, 2.6, 0), a = assetBatch();
    a.box(1.1, 1.75, 1.2, 0, -0.7, 0, palette.armor);
    a.cylinder(0.45, 1.16, 0, -1.45, 0.15, C.gold, 'x');
    a.box(1.15, 1.2, 1.25, 0, -2.05, 0.25, C.joint);
    a.box(0.95, 0.5, 0.45, 0, -2, 0.96, C.gold);
    if (s < 0) {
      a.cylinder(0.12, 2.3, 0, -2.35, 0.65, C.ink, 'y');
      a.cylinder(0.2, 0.28, 0, -1.3, 0.65, C.gold);
    }
    a.finish(arm, `commander-gauntlet-${s}`); arms.push({ arm, s });
  }
  const gun = node(torso, 'commander-shoulder-cannon', 1.7, 3.22, -0.2), g = assetBatch(), gl = assetBatch();
  g.box(1.28, 1.18, 2.6, 0, 0, 0.2, C.joint);
  for (const s of [-1, 1]) {
    g.cylinder(0.26, 2.4, s * 0.33, 0, 1.3, C.ink, 'z');
    g.ring(0.3, 0.1, s * 0.33, 0, 2.53, C.gold, 'z');
    g.cylinder(0.18, 0.06, s * 0.33, 0, 2.48, C.ink, 'z');
  }
  g.box(1.36, 0.28, 1.5, 0, 0.65, -0.1, palette.armor);
  g.finish(gun, 'commander-twin-artillery');
  gl.box(0.8, 0.15, 0.1, 0, 0.3, 1.54, C.amber).finish(gun, 'commander-gun-sight', assetGlow);
  return finishRig(rig, 3, 10.4, (t, attack, state = {}) => {
    const a = attackPose(attack), walk = motion(t, state); poseHit(pose, t, state);
    legs.forEach(({ leg, s }) => { leg.rotation.x = s * walk * 0.12; leg.position.y = 2.9 + Math.max(0, s * walk) * 0.07; });
    torso.position.y = 3 + Math.abs(walk) * 0.055;
    head.rotation.y = Math.sin(t * 0.65) * 0.09;
    arms.forEach(({ arm, s }) => { arm.rotation.x = -s * walk * 0.08 - a * (s < 0 ? 0.75 : 0.18); });
    gun.position.z = -0.2 - a * 0.26; gun.rotation.x = -a * 0.09;
  });
}

function buildSpider() {
  const rig = rootRig('crystal-spider'), { pose } = rig;
  const body = node(pose, 'spider-abdomen', 0, 3.2, -0.8), b = assetBatch(), glow = assetBatch();
  b.sphere(1, 0, 0.55, -0.65, 0x47395e, 2.2, 1.55, 2.3);
  b.sphere(1, 0, -0.2, 1.65, 0x302a47, 1.4, 1, 1.25);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) b.box(1.05, 0.3, 1.3, s * 1.08, 1.58 - k * 0.12, -1.75 + k * 1.1, k % 2 ? 0x6d5681 : 0x806694, 0.1, s * 0.26, -s * 0.22);
    cone(b, 0.23, 1, s * 0.46, -0.63, 2.58, C.ivory, Math.PI / 2 - 0.3, 0, -s * 0.3);
    for (let k = 0; k < 3; k++) glow.sphere(k ? 0.14 : 0.27, s * (0.4 + k * 0.3), 0.03 + k * 0.23, 2.72 - k * 0.15, k ? 0xce8ddd : 0xffa1de, 1, 1, 0.45);
  }
  for (let k = 0; k < 7; k++) {
    const angle = k * 2.4, x = Math.sin(angle) * 1.15, z = -0.8 + Math.cos(angle) * 1.1;
    gem(b, 0.64, x, 2.4 + (k % 3) * 0.22, z, k % 2 ? 0x78b8d8 : 0xb1e9ef, 0.7, 2.1, 0.9, x * -0.3);
  }
  gem(b, 0.83, 0, 3.53, -0.75, 0xb4e6f3, 0.8, 2.06, 0.7);
  b.finish(body, 'spider-crystal-carapace'); glow.finish(body, 'spider-six-eyes', assetGlow);
  const legs = [];
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    const z = 1.3 - k * 1.08, spread = (1.5 - k) * 0.4;
    const hip = node(pose, `spider-hip-${s}-${k}`, s * 1.1, 3.1, z - 0.8), u = assetBatch();
    u.sphere(0.35, 0, 0, 0, 0x786589);
    u.beam([0, 0, 0], [s * 1.75, 1, spread], 0.36, 0.34, 0x403452);
    u.beam([s * 0.25, 0.2, spread * 0.1], [s * 1.5, 1.03, spread * 0.85], 0.16, 0.48, 0x8c72a1);
    u.finish(hip, `spider-thigh-${s}-${k}`);
    const knee = node(hip, `spider-knee-${s}-${k}`, s * 1.75, 1, spread), l = assetBatch();
    l.sphere(0.32, 0, 0, 0, 0xb1ddeb);
    l.beam([0, 0, 0], [s * 0.8, -3.9, spread * 0.35], 0.23, 0.26, 0x302b45);
    l.beam([s * 0.08, -0.3, 0], [s * 0.55, -2.35, spread * 0.2], 0.12, 0.36, 0x88699c);
    cone(l, 0.21, 0.62, s * 0.8, -3.72, spread * 0.35, 0xa6d6e6, 0, 0, s * 0.18);
    l.finish(knee, `spider-shin-${s}-${k}`); legs.push({ hip, knee, s, k });
  }
  return finishRig(rig, 3.6, 8.5, (t, attack, state = {}) => {
    const a = attackPose(attack), active = state.moving !== false && !state.stunned; poseHit(pose, t, state);
    body.position.y = 3.2 + (active ? Math.sin(t * 6) * 0.05 : 0) - a * 0.32;
    body.rotation.x = -a * 0.12;
    legs.forEach(({ hip, knee, s, k }) => {
      const stride = active ? Math.sin(t * 5 + k * 1.5 + (s > 0 ? Math.PI : 0)) : 0;
      hip.rotation.x = stride * 0.15; hip.rotation.z = s * a * 0.08;
      knee.rotation.z = s * Math.max(0, stride) * 0.07 - s * a * 0.08;
    });
  });
}

function buildMagma() {
  const rig = rootRig('obsidian-magma'), { pose } = rig;
  const torso = node(pose, 'magma-furnace-body', 0, 5.1, -0.2), b = assetBatch(), glow = assetBatch();
  b.sphere(1, 0, 0.65, 0, 0x382f37, 2.55, 3.0, 1.9);
  b.sphere(1, 0, -1.7, -0.25, 0x4b3538, 2.0, 1.4, 1.8);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      plate(b, [[-0.7, 0.36], [0.65, 0.5], [0.82, -0.3], [0.2, -0.65], [-0.75, -0.3]], 0.38, k % 2 ? 0x5b3939 : 0x392f39,
        s * (0.75 + k * 0.1), 2.1 - k * 1.1, 1.6 - Math.abs(k - 1.5) * 0.16, 0.08, s * 0.16, -s * 0.22);
      glow.beam([s * 0.1, 2.1 - k * 1.08, 1.72], [s * 1.25, 1.85 - k * 1.08, 1.72], 0.13, 0.13, k % 2 ? 0xffc760 : 0xff7e3f);
    }
    b.sphere(0.93, s * 2.0, 1.35, -0.1, 0x4f373b, 1, 0.9, 1.15);
    cone(b, 0.4, 1.55, s * 2.06, 2.44, -0.25, 0x8d5644, 0, 0, -s * 0.36);
  }
  for (let k = 0; k < 5; k++) {
    const y = -1.0 + k * 1.05;
    gem(b, 0.67, 0, y, -1.8, k % 2 ? 0x7f5148 : 0x5d4143, 0.75, 1.4, 0.85);
    glow.box(0.18, 0.85, 0.15, 0, y, -2.35, 0xff994b, -0.12);
  }
  b.finish(torso, 'magma-basalt-chest'); glow.finish(torso, 'magma-furnace-seams', assetGlow);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = node(pose, `magma-hind-leg-${s}`, s * 1.45, 3.4, -0.15), l = assetBatch();
    l.sphere(1, 0, -0.65, 0, 0x463039, 1.05, 1.5, 1.2);
    l.box(1.25, 1.55, 1.3, 0, -2.05, 0.32, 0x4b343c, 0.12);
    l.box(1.62, 0.65, 2.5, 0, -3.01, 0.8, 0x342c36);
    for (let j = 0; j < 3; j++) cone(l, 0.23, 0.85, -0.49 + j * 0.49, -3.0, 2.02, 0xe8bb86, Math.PI / 2);
    l.box(0.18, 1.1, 0.12, s * 0.5, -1.8, 0.99, 0xef824b, 0, 0, s * 0.17);
    l.finish(leg, `magma-hind-armor-${s}`); legs.push({ leg, s });
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = node(torso, `magma-claw-arm-${s}`, s * 2.1, 1.2, 0.5), a = assetBatch();
    a.beam([0, 0, 0], [s * 0.65, -1.25, 0.5], 0.95, 0.9, 0x47313b);
    a.sphere(0.64, s * 0.65, -1.35, 0.55, 0x765049);
    a.beam([s * 0.65, -1.4, 0.55], [s * 0.85, -2.55, 1.4], 0.7, 0.8, 0x342c36);
    a.box(1.1, 0.65, 1.1, s * 0.8, -2.72, 1.6, 0x503641);
    for (let j = 0; j < 3; j++) cone(a, 0.19, 0.85, s * 0.8 - 0.35 + j * 0.35, -2.86, 2.32, 0xf1c38c, Math.PI / 2 + 0.3);
    a.finish(arm, `magma-talons-${s}`); arms.push({ arm, s });
  }
  const head = node(torso, 'magma-horned-head', 0, 4.6, 0.65), h = assetBatch(), eyesGlow = assetBatch();
  h.sphere(1, 0, 0, 0, 0x3f3039, 1.4, 1.45, 1.25);
  h.box(1.95, 0.85, 1.9, 0, -0.5, 1.2, 0x61403e);
  h.box(1.58, 0.34, 1.2, 0, -0.3, 2.0, 0x3a2b35);
  for (const s of [-1, 1]) {
    cone(h, 0.4, 2.65, s * 0.9, 1.74, -0.4, 0xd5a278, -0.2, 0, -s * 0.4);
    cone(h, 0.27, 1.3, s * 1.28, 0.05, -0.38, 0x8c5d4c, -0.3, 0, -s * 1.1);
    h.box(0.94, 0.3, 0.5, s * 0.72, 0.44, 1.03, 0x7e4b40, 0, 0, -s * 0.28);
    h.cylinder(0.17, 0.1, s * 0.49, -0.16, 2.68, C.ink, 'z', 0.17, 8);
    for (let j = 0; j < 3; j++) cone(h, 0.12, 0.46, s * 0.77, -0.97, 0.9 + j * 0.48, C.ivory, Math.PI);
  }
  gem(h, 0.56, 0, 1.05, 0.78, 0xad5f43, 0.6, 1.4, 0.5);
  eyes(h, eyesGlow, 0.64, 0.2, 1.1, 0xffcc6b, 0.57);
  h.finish(head, 'magma-horned-skull'); eyesGlow.finish(head, 'magma-eyes', assetGlow);
  const jaw = node(head, 'magma-jaw', 0, -0.95, 0.35), j = assetBatch(), mouth = assetBatch();
  j.box(1.92, 0.42, 2.85, 0, -0.14, 1.0, 0x583b3e);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) cone(j, 0.11, 0.34, s * 0.72, 0.16, 0.55 + k * 0.53, C.ivory);
  mouth.box(1.35, 0.07, 1.9, 0, 0.1, 1.12, 0xff8c47);
  j.finish(jaw, 'magma-lower-jaw'); mouth.finish(jaw, 'magma-mouth-heat', assetGlow);
  const wings = [];
  for (const s of [-1, 1]) {
    const wing = node(torso, `magma-wing-${s}`, s * 1.4, 2.4, -0.8), w = assetBatch();
    plate(w, [[0, 0], [s * 1.6, 2.2], [s * 4.0, 1.15], [s * 3.5, -0.6], [s * 2.2, -0.15], [s * 1.1, -1.2]], 0.12, 0x9b443c, 0, 0, 0);
    w.beam([0, 0, 0.1], [s * 1.6, 2.2, 0.1], 0.28, 0.3, 0x392c37);
    w.beam([s * 1.6, 2.2, 0.1], [s * 4, 1.15, 0.1], 0.26, 0.3, 0x392c37);
    w.beam([s * 1.6, 2.2, 0.1], [s * 3.5, -0.6, 0.1], 0.16, 0.2, 0xd27546);
    w.beam([s * 1.6, 2.2, 0.1], [s * 1.1, -1.2, 0.1], 0.16, 0.2, 0xd27546);
    cone(w, 0.18, 0.9, s * 1.6, 2.52, 0.1, C.ivory, 0, 0, -s * 0.4);
    w.finish(wing, `magma-wing-membrane-${s}`); wings.push({ wing, s });
  }
  const tail = node(pose, 'magma-tail-base', 0, 2.0, -1.5), tb = assetBatch();
  hose(tb, [[0, 0, 0], [0, -0.4, -1.2], [0, -0.85, -2.3], [0.4, -1.1, -3.1]], 0.58, 0x45303a);
  for (let k = 0; k < 4; k++) gem(tb, 0.32, 0, 0.3 - k * 0.33, -0.4 - k * 0.7, 0xd58350, 0.75, 1.3, 0.6);
  tb.finish(tail, 'magma-armored-tail');
  const tailTip = node(tail, 'magma-tail-tip', 0.4, -1.1, -3.1), tt = assetBatch();
  hose(tt, [[0, 0, 0], [0.5, 0.02, -0.8], [0.9, 0.32, -1.3]], 0.27, 0x69413f);
  gem(tt, 0.62, 1, 0.36, -1.4, 0xea9956, 0.65, 0.7, 1.6, -0.3); tt.finish(tailTip, 'magma-tail-blade');
  return finishRig(rig, 3.625, 13, (t, attack, state = {}) => {
    const a = attackPose(attack), walk = motion(t, state); poseHit(pose, t, state);
    torso.position.y = 5.1 + Math.abs(walk) * 0.08 - a * 0.16;
    torso.rotation.x = -a * 0.08;
    legs.forEach(({ leg, s }) => { leg.rotation.x = s * walk * 0.12; leg.position.y = 3.4 + Math.max(0, s * walk) * 0.08; });
    arms.forEach(({ arm, s }) => { arm.rotation.x = -a * 0.75 - s * walk * 0.09; });
    head.rotation.x = -a * 0.22; jaw.rotation.x = a * 0.45 + Math.sin(t * 1.1) * 0.025;
    wings.forEach(({ wing, s }) => { wing.rotation.y = s * (0.32 + Math.sin(t * 1.1) * 0.07 - a * 0.38); wing.rotation.z = s * (0.15 + a * 0.18); });
    tail.rotation.y = Math.sin(t * 1.2) * 0.12; tailTip.rotation.y = Math.sin(t * 1.2 - 0.5) * 0.22;
  });
}

function buildPharaoh() {
  const rig = rootRig('golden-pharaoh'), { pose } = rig;
  const palette = { armor: 0xd8c7a2, dark: 0x635951, trim: C.gold };
  const legs = [-1, 1].map(s => ({ leg: armoredLeg(pose, `pharaoh-leg-${s}`, s, 0.85, 2.8, palette, 2.75), s }));
  const torso = node(pose, 'pharaoh-torso', 0, 2.8, 0), b = assetBatch(), glow = assetBatch();
  b.cylinder(1.5, 3.65, 0, 1.9, 0, 0xd8c7a2, 'y', 1.2, 10);
  for (let k = 0; k < 6; k++) b.ring(1.31 + k * 0.025, 0.1, 0, 0.5 + k * 0.55, 0, k % 2 ? 0xb5a787 : 0xeaddbf);
  b.box(2.85, 1.55, 0.34, 0, 2.4, 1.22, 0x2b5d93);
  for (let k = 0; k < 3; k++) b.box(2.5 - k * 0.42, 0.18, 0.2, 0, 2.95 - k * 0.38, 1.45, C.gold);
  gem(b, 0.52, 0, 2.25, 1.55, C.gold, 1.2, 0.6, 0.3);
  gem(glow, 0.23, 0, 2.25, 1.73, C.cyan, 0.75, 0.6, 0.25);
  b.cylinder(1.63, 0.35, 0, 0.53, 0, C.gold, 'y', 1.43);
  plate(b, [[-1.45, 0], [1.45, 0], [1.8, -1.6], [0, -2.05], [-1.8, -1.6]], 0.24, 0x2a5388, 0, 0.4, 0.9);
  plate(b, [[-0.65, 0], [0.65, 0], [0.52, -1.48], [0, -1.82], [-0.52, -1.48]], 0.15, C.gold, 0, 0.35, 1.12);
  b.finish(torso, 'pharaoh-bandages-and-collar'); glow.finish(torso, 'pharaoh-scarab', assetGlow);
  const head = node(torso, 'pharaoh-mask', 0, 4.8, 0.08), h = assetBatch(), eyeGlow = assetBatch();
  h.box(1.62, 2, 1.48, 0, 0, 0, C.gold);
  plate(h, [[-0.66, 0.9], [0.66, 0.9], [0.7, -0.45], [0, -1], [-0.7, -0.45]], 0.3, 0xecc66d, 0, 0, 0.7);
  h.box(0.22, 0.74, 0.34, 0, -0.12, 0.98, 0xb8853c);
  h.box(0.62, 0.12, 0.16, 0, -0.6, 0.96, 0x815e37);
  h.box(0.33, 1.12, 0.4, 0, -1.18, 0.6, 0x294d82, 0.12);
  for (let k = 0; k < 4; k++) h.box(0.37, 0.1, 0.42, 0, -0.83 - k * 0.22, 0.6 + k * 0.025, C.gold, 0.12);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      h.box(0.75 + k * 0.045, 0.34, 1.3, s * (1.0 + k * 0.035), 0.82 - k * 0.34, -0.08, k % 2 ? C.gold : 0x2e5d96, 0, 0, s * 0.1);
    }
    h.box(0.7, 0.18, 0.2, s * 0.43, 0.43, 0.93, 0x24446e, 0, 0, -s * 0.1);
    eyeGlow.box(0.42, 0.1, 0.18, s * 0.42, 0.22, 1.02, C.cyan);
  }
  h.box(2.25, 0.48, 1.7, 0, 1.16, -0.08, 0x2f5c94);
  h.box(2.1, 0.14, 1.75, 0, 1.43, -0.08, C.gold);
  h.cylinder(0.12, 0.8, 0, 1.83, 0.7, C.gold, 'y', 0.22, 6);
  gem(h, 0.27, 0, 2.25, 0.7, C.gold, 0.75, 1.25, 0.6);
  h.finish(head, 'pharaoh-striped-headdress'); eyeGlow.finish(head, 'pharaoh-mask-eyes', assetGlow);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = node(torso, `pharaoh-arm-${s}`, s * 1.8, 3.0, 0), a = assetBatch();
    a.cylinder(0.46, 1.65, 0, -0.7, 0, 0xd2c3a1);
    a.cylinder(0.54, 0.3, 0, -0.45, 0, C.gold);
    a.cylinder(0.53, 0.3, 0, -1.22, 0, 0x2c5d94);
    a.beam([0, -1.35, 0], [0, -2.5, 0.55], 0.67, 0.68, 0xe6d5b1);
    a.box(0.8, 0.62, 0.8, 0, -2.42, 0.57, C.gold);
    a.finish(arm, `pharaoh-wrapped-arm-${s}`); arms.push({ arm, s });
  }
  const staff = node(arms[1].arm, 'pharaoh-crook', 0.35, -2.45, 0.85), st = assetBatch(), sg = assetBatch();
  st.cylinder(0.1, 6.8, 0, 0.75, 0, C.gold, 'y', 0.13, 8);
  hose(st, [[0, 4.08, 0], [0, 4.55, 0], [0.55, 4.8, 0], [1.06, 4.46, 0], [0.95, 3.98, 0]], 0.15, C.gold);
  for (let k = 0; k < 6; k++) st.cylinder(0.145, 0.22, 0, -1.7 + k * 0.8, 0, 0x2b578c);
  gem(sg, 0.31, 1.0, 4.0, 0, C.cyan, 0.6, 1.2, 0.65);
  st.finish(staff, 'pharaoh-gold-crook'); sg.finish(staff, 'pharaoh-crook-gem', assetGlow);
  return finishRig(rig, 2.9, 10.6, (t, attack, state = {}) => {
    const a = attackPose(attack), walk = motion(t, state); poseHit(pose, t, state);
    legs.forEach(({ leg, s }) => { leg.rotation.x = s * walk * 0.09; leg.position.y = 2.8 + Math.max(0, s * walk) * 0.04; });
    torso.position.y = 2.8 + Math.abs(walk) * 0.035;
    head.rotation.y = Math.sin(t * 0.6) * 0.08;
    arms.forEach(({ arm, s }) => { arm.rotation.x = s > 0 ? -0.04 - a * 0.18 : -0.12 - a * 0.7 - walk * 0.06; });
    staff.rotation.z = Math.sin(t * 0.9) * 0.025;
  });
}

function buildThunder() {
  const rig = rootRig('thunder-sentinel'), { pose } = rig;
  const palette = { armor: 0x63788d, dark: 0x303e58, trim: 0xb8c6ce };
  const legs = [-1, 1].map(s => ({ leg: armoredLeg(pose, `thunder-boot-${s}`, s, 1.4, 3.1, palette, 3.05), s }));
  const chest = node(pose, 'thunder-stone-chest', 0, 3.2, 0), b = assetBatch(), glow = assetBatch();
  b.box(4.7, 3.2, 2.8, 0, 1.7, -0.2, 0x4e6480);
  b.box(3.9, 1.1, 3, 0, 3.05, -0.2, 0x7f94a4);
  b.box(3.2, 0.72, 2.5, 0, 0.05, -0.1, 0x33445e);
  plate(b, [[-1.75, 0.55], [0, 0.9], [1.75, 0.55], [1.3, -0.75], [0, -1.18], [-1.3, -0.75]], 0.46, 0x91a6b0, 0, 1.95, 1.28);
  b.cylinder(0.77, 0.3, 0, 1.88, 1.7, C.ink, 'z', 0.77, 10);
  b.ring(0.69, 0.17, 0, 1.88, 1.91, C.gold, 'z');
  gem(glow, 0.55, 0, 1.88, 1.98, 0xffdf75, 0.65, 1, 0.25);
  for (const s of [-1, 1]) {
    glow.beam([s * 0.25, 2.9, 1.57], [s * 0.9, 2.2, 1.64], 0.12, 0.1, 0xffdf75);
    glow.beam([s * 0.9, 2.2, 1.64], [s * 1.75, 2.25, 1.55], 0.12, 0.1, 0xffdf75);
    b.box(0.55, 1.8, 0.8, s * 1.35, 4.05, -1, 0x8ca4b2);
    b.cylinder(0.2, 1.4, s * 1.35, 5.5, -1.0, C.gold);
    b.sphere(0.3, s * 1.35, 6.22, -1, C.ivory);
  }
  b.finish(chest, 'thunder-engraved-carapace'); glow.finish(chest, 'thunder-core-and-conduits', assetGlow);
  const head = node(chest, 'thunder-mask', 0, 4.1, 0.55), h = assetBatch(), hg = assetBatch();
  h.box(2.45, 2.1, 1.9, 0, 0.25, 0, 0x7e96a8);
  h.box(2.75, 0.55, 2.1, 0, 1.04, 0.12, 0xb5c8ce);
  h.box(1.9, 0.7, 0.6, 0, -0.61, 0.88, 0x435673);
  h.box(1.2, 0.15, 0.22, 0, -0.51, 1.23, C.ink);
  for (const s of [-1, 1]) {
    h.box(0.35, 0.85, 0.3, s * 0.96, -0.02, 1.1, 0xb4c5ce, 0, 0, -s * 0.2);
    plate(h, [[-0.3, 0], [0.3, 0], [0.12, 1.7], [-0.16, 1.15]], 0.35, 0xa7bbc7, s * 0.8, 1.1, -0.2, 0, 0, -s * 0.3);
  }
  eyes(h, hg, 0.56, 0.32, 1.02, 0xffdf75, 0.73);
  h.finish(head, 'thunder-cloud-brow'); hg.finish(head, 'thunder-eyes', assetGlow);
  const arms = [], coils = [];
  for (const s of [-1, 1]) {
    const arm = node(chest, `thunder-arm-${s}`, s * 2.65, 2.65, 0), a = assetBatch();
    a.sphere(0.95, 0, 0, 0, 0x6d8499, 1.12, 0.85, 1);
    a.box(1.25, 1.6, 1.35, 0, -1.05, 0.05, 0x495e7b);
    a.cylinder(0.63, 1.35, 0, -1.85, 0.3, C.joint, 'x');
    a.box(1.8, 1.6, 1.9, 0, -2.8, 0.6, 0x8098a8);
    a.box(1.85, 0.5, 1.95, 0, -3.34, 0.6, 0xb8c8ce);
    for (let k = 0; k < 3; k++) a.box(0.32, 0.7, 0.22, -0.57 + k * 0.57, -2.8, 1.61, C.gold);
    a.finish(arm, `thunder-hammer-gauntlet-${s}`); arms.push({ arm, s });
    const coil = node(chest, `thunder-shoulder-coil-${s}`, s * 2.75, 3.65, -0.35), c = assetBatch(), cg = assetBatch();
    c.cylinder(0.49, 2.15, 0, 0.2, 0, C.ink);
    for (let k = 0; k < 5; k++) c.cylinder(0.83 - Math.abs(2 - k) * 0.07, 0.18, 0, -0.55 + k * 0.38, 0, k % 2 ? C.gold : C.steel);
    c.sphere(0.52, 0, 1.48, 0, C.ivory, 1, 0.55, 1);
    cg.ring(0.87, 0.055, 0, 0.25, 0, 0xffe595);
    c.finish(coil, `thunder-tesla-stack-${s}`); cg.finish(coil, `thunder-tesla-ring-${s}`, assetGlow); coils.push({ coil, s });
  }
  return finishRig(rig, 3.9, 11.96, (t, attack, state = {}) => {
    const a = attackPose(attack), walk = motion(t, state); poseHit(pose, t, state, 0.04);
    chest.position.y = 3.2 + Math.abs(walk) * 0.065 - a * 0.14;
    legs.forEach(({ leg, s }) => { leg.rotation.x = s * walk * 0.1; leg.position.y = 3.1 + Math.max(0, s * walk) * 0.05; });
    arms.forEach(({ arm, s }) => { arm.rotation.x = -a * 0.95 - s * walk * 0.06; arm.rotation.z = -s * a * 0.12; });
    coils.forEach(({ coil, s }) => { coil.rotation.y = s * t * 0.5; coil.scale.y = 1 + a * 0.08 + Math.sin(t * 3 + s) * 0.015; });
    head.rotation.x = a * 0.1;
  });
}

function buildEmperor() {
  const rig = rootRig('void-emperor'), { pose } = rig;
  const palette = { armor: 0x544070, dark: 0x222840, trim: C.gold };
  const legs = [-1, 1].map(s => ({ leg: armoredLeg(pose, `emperor-sabatons-${s}`, s, 1.15, 3.35, palette, 3.3), s }));
  const torso = node(pose, 'emperor-cuirass', 0, 3.5, 0), b = assetBatch(), glow = assetBatch();
  b.box(3.7, 3.6, 2.45, 0, 1.95, -0.1, 0x392f53);
  plate(b, [[-1.7, 1.35], [-0.85, 1.85], [0, 1.5], [0.85, 1.85], [1.7, 1.35], [1.35, -0.8], [0, -1.55], [-1.35, -0.8]], 0.45, 0x715388, 0, 2.1, 1.13);
  b.beam([-1.55, 3.4, 1.43], [0, 2.6, 1.55], 0.24, 0.18, C.gold);
  b.beam([1.55, 3.4, 1.43], [0, 2.6, 1.55], 0.24, 0.18, C.gold);
  b.box(0.38, 2.6, 0.2, 0, 1.75, 1.55, C.gold);
  b.box(3.7, 0.65, 2.65, 0, 0.3, 0, C.ink);
  b.box(0.9, 0.75, 0.3, 0, 0.3, 1.46, C.gold);
  gem(glow, 0.38, 0, 2.55, 1.67, 0xe2baff, 0.7, 1.2, 0.3);
  for (const s of [-1, 1]) {
    plate(b, [[-0.85, 0], [0.85, 0], [1.0, -2], [0, -2.55], [-0.95, -1.85]], 0.3, 0x4b3a66, s * 1.17, 0.22, 1.0, 0.08, s * 0.12, -s * 0.1);
    b.beam([s * 0.4, 0.2, 1.35], [s * 0.98, -1.84, 1.2], 0.13, 0.16, C.gold);
    b.cylinder(0.98, 0.3, s * 1.95, 3.64, 0, C.gold, 'y', 1.15, 8);
  }
  b.finish(torso, 'emperor-royal-plate'); glow.finish(torso, 'emperor-heart-gem', assetGlow);
  const cape = node(torso, 'emperor-cape', 0, 3.2, -1.5), c = assetBatch();
  for (let k = -2; k <= 2; k++) {
    plate(c, [[-0.65, 0.35], [0.65, 0.35], [0.9, -5.65 + Math.abs(k) * 0.12], [0.15, -6.15 + Math.abs(k) * 0.25], [-0.75, -5.65]], 0.14,
      k % 2 ? 0x793b62 : 0x5c3058, k * 0.9, 0, -Math.abs(k) * 0.08, -0.08, k * 0.08);
    c.beam([k * 0.9 - 0.58, 0.28, 0.12], [k * 0.9 - 0.72, -5.6 + Math.abs(k) * 0.17, 0.35], 0.1, 0.09, 0xb78654);
  }
  c.finish(cape, 'emperor-folded-cape');
  const collar = assetBatch();
  for (const s of [-1, 1]) plate(collar, [[0, -0.3], [s * 0.3, 1.7], [s * 1.8, 0.75], [s * 1.4, -0.4]], 0.32, C.gold, 0, 3.55, -0.4, 0, s * 0.12);
  collar.finish(torso, 'emperor-high-collar');
  const head = node(torso, 'emperor-helm', 0, 5.5, 0), h = assetBatch(), hg = assetBatch();
  h.box(1.9, 2.15, 1.75, 0, 0, 0, 0x5d4675);
  plate(h, [[-0.85, 0.85], [0, 1.07], [0.85, 0.85], [0.8, -0.45], [0, -1.15], [-0.8, -0.45]], 0.27, 0xd6ab65, 0, -0.02, 0.85);
  h.box(0.23, 1.45, 0.22, 0, -0.18, 1.09, 0x876443);
  h.box(1.02, 0.17, 0.18, 0, -0.65, 1.05, C.ink);
  for (const s of [-1, 1]) {
    h.box(0.6, 1.9, 1.5, s * 1.05, 0.2, -0.22, 0x342b4a, 0, 0, -s * 0.12);
    h.beam([s * 0.93, -0.52, 0.8], [s * 0.98, 1.12, 0.55], 0.18, 0.2, C.gold);
    cone(h, 0.28, 2.3, s * 1.05, 1.75, -0.14, C.gold, -0.1, 0, -s * 0.23);
  }
  h.cylinder(1.15, 0.32, 0, 1.12, -0.08, C.gold, 'y', 1.25, 8);
  for (let k = 0; k < 5; k++) {
    const angle = k * TAU / 5;
    cone(h, 0.17, 1.02, Math.sin(angle) * 0.88, 1.78, Math.cos(angle) * 0.88 - 0.08, C.gold);
  }
  gem(hg, 0.32, 0, 1.3, 1.1, 0xe3b3ff, 0.7, 1.1, 0.25);
  eyes(h, hg, 0.43, 0.2, 1.03, 0xffedd0, 0.5);
  h.finish(head, 'emperor-crowned-mask'); hg.finish(head, 'emperor-mask-gems', assetGlow);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = node(torso, `emperor-arm-${s}`, s * 2.15, 3.15, -0.05), a = assetBatch();
    a.box(1.25, 1.65, 1.4, 0, -0.8, 0.05, 0x57406f);
    plate(a, [[-0.8, 0.3], [0.8, 0.3], [1.08, -0.58], [0, -0.95], [-1.08, -0.58]], 1.45, 0x7b5b8d, 0, 0.4, 0);
    a.box(1.55, 0.25, 1.55, 0, 0.65, 0, C.gold);
    for (let k = 0; k < 2; k++) cone(a, 0.22, 0.9, s * (0.5 + k * 0.35), 0.95 - k * 0.28, -0.15, C.gold, 0, 0, -s * 0.55);
    a.cylinder(0.5, 1.28, 0, -1.65, 0.15, C.joint, 'x');
    a.box(1.35, 1.45, 1.5, 0, -2.4, 0.35, 0x3d3154);
    a.box(1.4, 0.38, 1.55, 0, -2.97, 0.35, C.gold);
    a.box(0.9, 0.8, 0.25, 0, -2.35, 1.13, 0x95744b);
    a.finish(arm, `emperor-pauldrons-${s}`); arms.push({ arm, s });
  }
  const shield = node(arms[0].arm, 'emperor-royal-shield', -0.15, -2.1, 1.2), sh = assetBatch(), sl = assetBatch();
  plate(sh, [[-1.05, 1.45], [0, 1.72], [1.05, 1.45], [1.18, -0.5], [0, -1.9], [-1.18, -0.5]], 0.34, C.gold);
  plate(sh, [[-0.8, 1.18], [0, 1.4], [0.8, 1.18], [0.91, -0.4], [0, -1.55], [-0.91, -0.4]], 0.4, 0x46385d, 0, 0, 0.12);
  gem(sl, 0.54, 0, 0.2, 0.45, 0xddb8f2, 0.8, 1.2, 0.3);
  sh.finish(shield, 'emperor-crown-shield'); sl.finish(shield, 'emperor-shield-gem', assetGlow);
  const blade = node(arms[1].arm, 'emperor-scepter-blade', 0.12, -2.6, 0.62), sb = assetBatch(), sg = assetBatch();
  sb.cylinder(0.13, 3.2, 0, -0.7, 0, C.gold, 'y', 0.13, 8);
  sb.box(1.45, 0.24, 0.35, 0, 1, 0, C.gold);
  plate(sb, [[-0.36, 0], [0.36, 0], [0.55, 1.8], [0, 3.25], [-0.55, 1.8]], 0.23, C.gold, 0, 1.1, 0);
  plate(sg, [[-0.17, 0.2], [0.17, 0.2], [0.27, 1.72], [0, 2.7], [-0.27, 1.72]], 0.26, 0xc4a0e6, 0, 1.1, 0.08);
  sb.finish(blade, 'emperor-scepter-frame'); sg.finish(blade, 'emperor-scepter-edge', assetGlow);
  const halo = node(torso, 'emperor-regalia-orbit', 0, 5.4, -1.25), hb = assetBatch();
  hb.ring(2.25, 0.12, 0, 0, 0, C.gold, 'z');
  for (let k = 0; k < 8; k++) {
    const a = k * TAU / 8;
    hb.box(0.38, 0.55, 0.18, Math.sin(a) * 2.25, Math.cos(a) * 2.25, 0, C.lightGold, 0, 0, -a);
  }
  hb.finish(halo, 'emperor-celestial-crown');
  return finishRig(rig, 4.06, 12.76, (t, attack, state = {}) => {
    const a = attackPose(attack), walk = motion(t, state), injured = 1 - Math.min(1, Math.max(0, state.health ?? 1));
    poseHit(pose, t, state, 0.035);
    torso.position.y = 3.5 + Math.abs(walk) * 0.045;
    legs.forEach(({ leg, s }) => { leg.rotation.x = s * walk * 0.09; leg.position.y = 3.35 + Math.max(0, s * walk) * 0.05; });
    arms.forEach(({ arm, s }) => { arm.rotation.x = -a * (s > 0 ? 0.92 : 0.35) - s * walk * 0.06; arm.rotation.z = s * a * 0.1; });
    cape.rotation.x = 0.08 + Math.sin(t * 1.4) * 0.035 + a * 0.08;
    cape.rotation.y = Math.sin(t * 0.9) * 0.035;
    head.rotation.y = Math.sin(t * 0.45) * 0.06;
    halo.rotation.z = t * (0.15 + injured * 0.12);
    halo.scale.setScalar(1 + a * 0.055 + Math.sin(t * 1.6) * 0.012);
  });
}

export function buildLateBoss(type) {
  switch (type) {
    case 'drill': return buildDrill();
    case 'dice': return buildDice();
    case 'kraken': return buildKraken();
    case 'pumpkin': return buildPumpkin();
    case 'commander': return buildCommander();
    case 'spider': return buildSpider();
    case 'magma': return buildMagma();
    case 'pharaoh': return buildPharaoh();
    case 'thunder': return buildThunder();
    case 'emperor': return buildEmperor();
    default: return null;
  }
}
