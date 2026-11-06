import * as THREE from 'three';
import { assetBatch, assetGlow } from './asset-kit.js';
import { loftGeometry, sweepGeometry } from './boss-shapes.js';
export { buildBattleTower } from './fort-assets.js';

const DARK = 0x182534, STEEL = 0x7d93a6, IVORY = 0xe8f0f4;
const RED = 0xd83140, AMBER = 0xffc85a, CYAN = 0x67e6ef;
const TAU = Math.PI * 2;

function part(parent, name, x = 0, y = 0, z = 0) {
  const group = new THREE.Group(); group.name = name; group.position.set(x, y, z); parent.add(group);
  return group;
}
// Lathe around Y from [radius, y] pairs listed bottom to top.
function lathe(profile, sides = 16) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y)), sides);
}
// Lathe along +Z, for barrels and pistons pointing at the player.
function latheZ(profile, sides = 14) { return lathe(profile, sides).rotateX(Math.PI / 2); }
// Upright loft. Sections are [y, halfWidth, halfDepth, centerZ, squareness].
function upright(sections, segments = 18) {
  return loftGeometry(sections.map(([y, w, d, z = 0, p = 0.6]) => [y, w, d, 0, z, p]), { segments, steps: Math.max(6, sections.length * 2 + 2) });
}
// Profile in the XY plane extruded along Z and centered on it.
function extrude(points, depth, bevel = 0.03, holes = []) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const hole of holes) shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
  return geo.translate(0, 0, -depth / 2 + bevel);
}
function arcPoints(cx, cy, r, a0, a1, n = 10) {
  const out = [];
  for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}

export function buildBattleTurret() {
  const group = new THREE.Group(); group.name = 'guard-turret';
  const base = assetBatch();
  // Stepped plinth with anchor bolts and a traverse ring.
  base.add(lathe([[1.18, 0], [1.2, 0.08], [1.1, 0.14], [1.0, 0.44], [0.9, 0.5], [0.92, 0.6], [0.86, 0.64], [0.001, 0.66]], 20), DARK);
  base.add(lathe([[0.9, 0.6], [0.94, 0.66], [0.94, 0.78], [0.88, 0.82], [0.001, 0.84]], 24), STEEL);
  base.add(new THREE.TorusGeometry(0.93, 0.06, 6, 28).rotateX(Math.PI / 2), RED, 0, 0.74, 0);
  for (let k = 0; k < 8; k++) {
    const a = k * TAU / 8 + Math.PI / 8;
    base.add(lathe([[0.07, 0], [0.08, 0.04], [0.06, 0.08], [0.001, 0.09]], 6), STEEL, Math.sin(a) * 1.08, 0.1, Math.cos(a) * 1.08);
  }
  for (const sx of [-1, 1]) base.add(upright([[0.08, 0.1, 0.32], [0.32, 0.08, 0.26], [0.42, 0.04, 0.2]], 10), RED, sx * 0.98, 0, 0.1);
  base.finish(group, 'turret-base');
  const head = part(group, 'turret-head', 0, 1.2, 0);
  const armor = assetBatch();
  // Cast armored head: a low rounded loft with cheek plates and a hatch.
  armor.add(upright([[-0.4, 0.62, 0.62, -0.1, 0.62], [-0.22, 0.74, 0.74, -0.08, 0.6], [0.12, 0.74, 0.72, -0.08, 0.6], [0.36, 0.62, 0.6, -0.1, 0.62], [0.5, 0.42, 0.42, -0.14, 0.62], [0.54, 0.2, 0.2, -0.16, 0.6]], 24), RED);
  armor.add(upright([[0.42, 0.44, 0.44, -0.14], [0.5, 0.4, 0.4, -0.14], [0.55, 0.3, 0.3, -0.15]], 18), STEEL);
  armor.add(lathe([[0.2, 0], [0.22, 0.04], [0.2, 0.08], [0.001, 0.09]], 14), DARK, 0.0, 0.52, -0.32);
  armor.add(new THREE.TorusGeometry(0.75, 0.04, 6, 28).rotateX(Math.PI / 2), DARK, 0, -0.26, -0.08);
  for (const sx of [-1, 1]) {
    armor.add(upright([[-0.3, 0.1, 0.5, -0.04], [-0.1, 0.13, 0.58, -0.04], [0.16, 0.12, 0.54, -0.04], [0.3, 0.08, 0.42, -0.06]], 12), DARK, sx * 0.74, 0, 0);
    for (let k = 0; k < 3; k++) armor.add(lathe([[0.05, -0.1], [0.055, 0.1], [0.04, 0.12], [0.001, 0.12]], 8), STEEL, sx * 0.86, 0.02, -0.4 + k * 0.28);
  }
  armor.add(upright([[0.0, 0.34, 0.12, 0.5], [0.14, 0.36, 0.14, 0.52], [0.32, 0.3, 0.1, 0.5], [0.4, 0.2, 0.06, 0.48]], 14), DARK);
  armor.finish(head, 'turret-armor');
  const recoil = part(head, 'turret-recoil', 0, -0.13, 0.37);
  const gun = assetBatch();
  gun.add(latheZ([[0.001, -0.08], [0.3, -0.08], [0.32, 0.02], [0.3, 0.12], [0.25, 0.16], [0.24, 0.5], [0.22, 0.56], [0.2, 0.62], [0.21, 0.7],
    [0.2, 0.72], [0.21, 0.78], [0.2, 0.8], [0.27, 0.83], [0.3, 0.86], [0.3, 1.0], [0.27, 1.04], [0.14, 1.04], [0.14, 0.92], [0.001, 0.92]], 16),
  (x, y, z) => (z > 0.9 && Math.hypot(x, y) < 0.15 ? 0x080f19 : z < 0.15 || z > 0.79 ? STEEL : DARK));
  for (const z of [0.66, 0.74]) gun.add(new THREE.TorusGeometry(0.215, 0.02, 4, 16), STEEL, 0, 0, z);
  gun.finish(recoil, 'turret-barrel');
  const muzzle = part(recoil, 'turret-muzzle', 0, 0, 1.06);
  const sensors = assetBatch();
  sensors.add(upright([[0.18, 0.2, 0.03, 0.62], [0.26, 0.22, 0.04, 0.63], [0.34, 0.18, 0.03, 0.62]], 12), 0xff6b6b);
  const eye = sensors.finish(head, 'turret-sensor', assetGlow);
  const flashBatch = assetBatch(); flashBatch.sphere(0.21, 0, 0, 0.12, AMBER, 1, 1, 1.9);
  const flash = flashBatch.finish(muzzle, 'turret-muzzle-flash', assetGlow); flash.visible = false;
  return {
    group, head, eye, muzzle,
    animate(t, state = {}) {
      const fire = Math.max(0, Math.min(1, state.fire01 || 0));
      recoil.position.z = 0.37 - fire * 0.14;
      flash.visible = fire > 0.55; flash.scale.setScalar(0.5 + fire * 0.6);
      eye.scale.y = 0.9 + Math.sin(t * 3) * 0.1 + fire * 0.2;
    },
  };
}

export function buildBattleSpawner(style = 'igloo') {
  const group = new THREE.Group(); group.name = `reinforcement-${style}`;
  const dome = style === 'dome';
  const color = dome ? 0xc89c43 : 0xdbe8f1, edge = dome ? 0x7e562c : 0x8ca8bd;
  const hull = assetBatch();
  hull.add(lathe([[1.6, 0], [1.62, 0.1], [1.52, 0.2], [1.48, 0.3], [0.001, 0.3]], 24), DARK);
  if (dome) {
    // Ribbed adobe dome with a raised drum and lantern.
    const shell = [];
    for (let k = 0; k <= 12; k++) { const a = k / 12 * Math.PI / 2; shell.push([1.45 * Math.cos(a) * (1 - 0.06 * Math.sin(a * 2)), 0.3 + 1.32 * Math.sin(a)]); }
    hull.add(lathe(shell, 28), color);
    for (let k = 0; k < 10; k++) {
      const a = k * TAU / 10;
      if (Math.cos(a) > 0.6) continue;
      const pts = []; for (let j = 0; j <= 6; j++) { const b = j / 6 * Math.PI * 0.46; pts.push([Math.sin(a) * 1.47 * Math.cos(b), 0.32 + 1.34 * Math.sin(b), Math.cos(a) * 1.47 * Math.cos(b)]); }
      hull.add(sweepGeometry(pts, [0.07, 0.06, 0.05], { segments: 6, steps: 10 }), edge);
    }
    hull.add(new THREE.TorusGeometry(1.46, 0.08, 6, 32).rotateX(Math.PI / 2), RED, 0, 0.36, 0);
    hull.add(lathe([[0.5, 1.45], [0.52, 1.55], [0.46, 1.6], [0.001, 1.62]], 20), edge);
    for (const sx of [-1, 1]) hull.add(upright([[0.9, 0.22, 0.4, -0.2], [1.1, 0.24, 0.44, -0.2], [1.24, 0.18, 0.36, -0.2]], 12), RED, sx * 1.12, 0, 0);
  } else {
    // Snow-block igloo: stacked courses with soft grooves between them.
    const shell = [];
    for (let k = 0; k <= 7; k++) {
      const a0 = k / 8 * Math.PI / 2, a1 = (k + 1) / 8 * Math.PI / 2, am = (a0 + a1) / 2;
      shell.push([1.42 * Math.cos(a0) - 0.03, 0.3 + 1.4 * Math.sin(a0) + 0.015]);
      shell.push([1.45 * Math.cos(am), 0.3 + 1.42 * Math.sin(am)]);
    }
    shell.push([0.001, 1.72]);
    // Alternate course shades so the stacked snow blocks read without extra geometry.
    const pale = new THREE.Color(color), shadow = new THREE.Color(color).multiplyScalar(0.86);
    hull.add(lathe(shell, 28), (x, y) => (Math.floor((y - 0.3) / 0.177) % 2 ? shadow : pale));
    hull.add(new THREE.TorusGeometry(1.43, 0.05, 6, 32).rotateX(Math.PI / 2), edge, 0, 0.32, 0);
  }
  // Vaulted entrance tunnel facing the player.
  const outer = [[-0.8, 0.12], [0.8, 0.12], ...arcPoints(0, 0.92, 0.8, 0, Math.PI, 14).slice(0, 15)];
  const inner = [[-0.56, 0.14], [-0.56, 0.95], ...arcPoints(0, 0.95, 0.56, Math.PI, 0, 12).slice(1), [0.56, 0.14]].reverse();
  hull.add(extrude(outer, 0.86, 0.05, [inner]), dome ? color : edge, 0, 0, 1.16);
  hull.add(extrude([[-0.84, 0.12], [0.84, 0.12], ...arcPoints(0, 0.92, 0.84, 0, Math.PI, 14).slice(0, 15)], 0.12, 0.03,
    [[[-0.6, 0.14], [-0.6, 0.95], ...arcPoints(0, 0.95, 0.6, Math.PI, 0, 12).slice(1), [0.6, 0.14]].reverse()]), dome ? RED : edge, 0, 0, 1.6);
  hull.add(extrude([[-0.56, 0.12], [0.56, 0.12], ...arcPoints(0, 0.95, 0.56, 0, Math.PI, 12).slice(0, 13)], 0.06, 0), DARK, 0, 0, 1.0);
  hull.add(lathe([[0.32, 1.6], [0.3, 1.72], [0.22, 1.82], [0.08, 1.88], [0.001, 1.9]], 14), edge);
  hull.add(lathe([[0.05, 1.86], [0.045, 2.36], [0.06, 2.38], [0.001, 2.4]], 8), DARK);
  hull.finish(group, 'bunker-shell');
  const doors = [];
  for (const sx of [-1, 1]) {
    const door = part(group, 'bunker-door', sx * 0.265, 0, 1.5);
    const panel = assetBatch();
    panel.add(extrude([[-0.25, 0.14], [0.25, 0.14], [0.25, 1.18], [-0.25, 1.18]], 0.1, 0.025), dome ? RED : color);
    for (const y of [0.4, 0.9]) panel.add(extrude([[-0.19, -0.035], [0.19, -0.035], [0.19, 0.035], [-0.19, 0.035]], 0.05, 0.012), edge, 0, y, 0.06);
    panel.add(new THREE.SphereGeometry(0.035, 8, 6), STEEL, -sx * 0.19, 0.66, 0.07);
    panel.finish(door, 'door-plate'); doors.push({ group: door, sx });
  }
  const lamps = assetBatch();
  for (const sx of [-1, 1]) lamps.add(upright([[0.62, 0.05, 0.03], [0.9, 0.06, 0.04], [1.18, 0.05, 0.03]], 10), 0xff6262, sx * 0.7, 0, 1.68);
  lamps.sphere(0.15, 0, 2.5, 0, dome ? AMBER : CYAN);
  const beacon = lamps.finish(group, 'bunker-signal', assetGlow);
  return {
    group,
    animate(t, state = {}) {
      const spawn = Math.max(0, Math.min(1, state.spawn01 || 0));
      for (const door of doors) door.group.position.x = door.sx * (0.265 + spawn * 0.29);
      beacon.scale.y = 1 + Math.sin(t * 2.4) * 0.015 + spawn * 0.055;
    },
  };
}

export function buildBattleWall(len) {
  const group = new THREE.Group(); group.name = 'lane-divider';
  const batch = assetBatch();
  // Jersey-barrier section run along the lane, with steel clamps at the joints.
  const profile = [[-0.19, 0.0], [0.19, 0.0], [0.19, 0.16], [0.13, 0.34], [0.12, 0.84], [-0.12, 0.84], [-0.13, 0.34], [-0.19, 0.16]];
  batch.add(extrude(profile, len, 0.03), (x, y) => (y < 0.17 ? DARK : IVORY));
  batch.add(extrude([[-0.15, 0.82], [0.15, 0.82], [0.16, 0.9], [0.12, 0.98], [-0.12, 0.98], [-0.16, 0.9]], len, 0.03), AMBER);
  const count = Math.max(1, Math.ceil(len / 3.5));
  for (let k = 0; k <= count; k++) {
    const z = -len / 2 + 0.12 + k * Math.max(0, len - 0.24) / count;
    const clamp = profile.map(([x, y]) => [x * 1.12, y * 1.06]);
    batch.add(extrude(clamp, Math.min(0.2, len), 0.02), STEEL, 0, 0, z);
    batch.add(extrude([[-0.18, 0.96], [0.18, 0.96], [0.18, 1.03], [-0.18, 1.03]], Math.min(0.2, len), 0.02), DARK, 0, 0, z);
    for (const sx of [-1, 1]) batch.add(new THREE.SphereGeometry(0.03, 6, 4), DARK, sx * 0.14, 0.6, z);
  }
  batch.finish(group, 'divider-panels');
  return group;
}

export function buildBattleCrusher(w) {
  const group = new THREE.Group(); group.name = 'hydraulic-crusher';
  const frame = assetBatch();
  for (const sx of [-1, 1]) {
    // Rounded steel columns with feet, guide rails and side hydraulics.
    frame.add(upright([[0.0, 0.3, 0.4], [0.1, 0.3, 0.4], [0.18, 0.22, 0.32], [5.0, 0.2, 0.3], [5.2, 0.22, 0.32]], 14), STEEL, sx * (w / 2 + 0.2), 0, 0);
    frame.add(lathe([[0.36, 0], [0.37, 0.08], [0.3, 0.18], [0.001, 0.2]], 16).scale(1, 1, 1.2), DARK, sx * (w / 2 + 0.2), 0, 0);
    frame.add(extrude([[-0.06, 0.4], [0.06, 0.4], [0.06, 4.95], [-0.06, 4.95]], 0.12, 0.02), DARK, sx * (w / 2 - 0.02), 0, 0);
    frame.add(lathe([[0.1, 0.6], [0.11, 0.7], [0.09, 0.74], [0.09, 3.8], [0.12, 3.84], [0.12, 4.0], [0.001, 4.02]], 10), IVORY, sx * (w / 2 + 0.2), 0, 0.42);
    for (let k = 0; k < 6; k++) frame.add(new THREE.BoxGeometry(0.43, 0.06, 0.62).translate(0, 0, 0), k % 2 ? DARK : AMBER, sx * (w / 2 + 0.2), 0.5 + k * 0.08, 0);
  }
  frame.add(upright([[-0.2, w / 2 + 0.42, 0.36], [0.0, w / 2 + 0.44, 0.38], [0.18, w / 2 + 0.4, 0.34], [0.22, w / 2 + 0.36, 0.3]], 16), DARK, 0, 5.18, 0);
  frame.add(extrude([[-(w / 2 + 0.3), 5.38], [w / 2 + 0.3, 5.38], [w / 2 + 0.26, 5.48], [-(w / 2 + 0.26), 5.48]], 0.76, 0.03), AMBER);
  for (const sx of [-1, 1]) frame.add(lathe([[0.18, 0], [0.2, 0.06], [0.16, 0.14], [0.001, 0.16]], 12), STEEL, sx * Math.max(0.2, w * 0.25), 4.98, -0.2);
  frame.finish(group, 'crusher-frame');
  const block = part(group, 'crusher-block');
  const ram = assetBatch();
  // Chamfered ram with a toothed striking face and hazard band toward the player.
  ram.add(upright([[0.24, w / 2 - 0.08, 0.78, 0, 0.8], [0.36, w / 2 - 0.05, 0.8, 0, 0.8], [1.3, w / 2 - 0.05, 0.8, 0, 0.8], [1.4, w / 2 - 0.14, 0.7, 0, 0.8]], 20), STEEL);
  ram.add(upright([[0.0, w / 2 - 0.2, 0.7, 0, 0.8], [0.06, w / 2 - 0.16, 0.74, 0, 0.8], [0.26, w / 2 - 0.12, 0.76, 0, 0.8]], 20), DARK);
  const stripeN = Math.max(1, Math.floor(w / 0.65));
  ram.add(extrude([[-(w / 2 - 0.12), 0.34], [w / 2 - 0.12, 0.34], [w / 2 - 0.12, 0.6], [-(w / 2 - 0.12), 0.6]], 0.04, 0.01), AMBER, 0, 0, 0.8);
  for (let k = 0; k < stripeN; k++) {
    const x = -w / 2 + 0.38 + k * (w - 0.76) / Math.max(1, stripeN - 1);
    ram.add(extrude([[-0.06, -0.13], [0.06, -0.13], [0.06, 0.13], [-0.06, 0.13]], 0.02, 0), DARK, x, 0.47, 0.83, 0, 0, -0.42);
  }
  const teeth = Math.max(2, Math.floor(w / 0.45));
  for (let k = 0; k < teeth; k++) {
    const x = -w / 2 + 0.3 + k * (w - 0.6) / Math.max(1, teeth - 1);
    ram.add(new THREE.ConeGeometry(0.13, 0.22, 6).rotateX(Math.PI), STEEL, x, -0.06, 0.4);
    ram.add(new THREE.ConeGeometry(0.13, 0.22, 6).rotateX(Math.PI), STEEL, x, -0.06, -0.4);
  }
  ram.finish(block, 'crusher-ram');
  const pistons = [];
  for (const sx of [-1, 1]) {
    const p = part(group, 'crusher-piston', sx * Math.max(0.2, w * 0.25), 0, -0.2);
    const rod = assetBatch(); rod.add(lathe([[0.1, 0], [0.1, 0.04], [0.075, 0.06], [0.075, 1.0]], 10), IVORY); rod.finish(p, 'piston-rod');
    pistons.push(p);
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.6), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.04; group.add(shadow);
  return {
    group, block, shadow,
    animate() {
      const bottom = Math.min(5.15, block.position.y + 1.4), length = Math.max(0.01, 5.15 - bottom);
      for (const p of pistons) { p.position.y = bottom; p.scale.y = length; }
    },
  };
}

export function buildBattlePillar() {
  const group = new THREE.Group(); group.name = 'fractured-obelisk';
  const body = part(group, 'pillar-body');
  const stone = assetBatch(), bands = assetBatch();
  // Fluted shaft with entasis, a molded base and capital, and a carved fracture.
  bands.add(lathe([[1.0, 0], [1.0, 0.36], [0.94, 0.42], [0.9, 0.5], [0.94, 0.56], [0.86, 0.66], [0.8, 0.8], [0.001, 0.8]], 8).rotateY(Math.PI / 8), 0x635e60);
  bands.add(lathe([[0.86, 0.6], [0.88, 0.7], [0.8, 0.78], [0.84, 0.86], [0.001, 0.86]], 24), 0x877e77);
  stone.add(sweepGeometry([[0, 0.8, 0], [0, 3.6, 0], [0, 6.4, 0], [0, 9.2, 0]], [0.74, 0.77, 0.72, 0.66], { segments: 40, steps: 24, flutes: 0.035 }), 0xb7aaa0);
  for (let k = 0; k < 4; k++) bands.add(new THREE.TorusGeometry(0.75 - k * 0.025, 0.05, 6, 28).rotateX(Math.PI / 2), 0x877e77, 0, 2.1 + k * 1.75, 0);
  bands.add(lathe([[0.001, 9.12], [0.68, 9.12], [0.74, 9.2], [0.86, 9.3], [0.9, 9.42], [0.86, 9.46], [0.001, 9.46]], 24), 0x877e77);
  bands.add(lathe([[1.0, 9.46], [1.0, 9.9], [0.001, 9.9]], 8).rotateY(Math.PI / 8), 0x635e60);
  // Front fracture: a zigzag crack carved across the shaft toward the player.
  const crack = [[-0.3, 2.8, 0.78], [0.05, 3.1, 0.8], [-0.12, 3.45, 0.8], [0.2, 3.8, 0.79], [0.0, 4.15, 0.8], [0.26, 4.45, 0.77]];
  bands.add(sweepGeometry(crack, [0.05, 0.06, 0.05, 0.06, 0.04, 0.02], { segments: 6, steps: 24, flatten: 0.4 }), DARK);
  for (const [x, y] of [[-0.15, 3.0], [0.12, 3.6], [0.1, 4.2]]) bands.add(new THREE.DodecahedronGeometry(0.09, 0), 0xcbbfb0, x + 0.2, y, 0.8);
  stone.finish(body, 'pillar-stone'); bands.finish(body, 'pillar-bands');
  return { group, body, height: 10 };
}
