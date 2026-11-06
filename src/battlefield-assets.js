import * as THREE from 'three';
import { assetBatch, assetGlow } from './asset-kit.js';
export { buildBattleTower } from './fort-assets.js';

const DARK = 0x182534, STEEL = 0x7d93a6, IVORY = 0xe8f0f4;
const RED = 0xd83140, AMBER = 0xffc85a, CYAN = 0x67e6ef;

function part(parent, name, x = 0, y = 0, z = 0) {
  const group = new THREE.Group(); group.name = name; group.position.set(x, y, z); parent.add(group);
  return group;
}

export function buildBattleTurret() {
  const group = new THREE.Group(); group.name = 'guard-turret';
  const base = assetBatch();
  base.cylinder(0.94, 0.56, 0, 0.3, 0, DARK, 'y', 1.15, 8);
  base.cylinder(0.85, 0.22, 0, 0.69, 0, STEEL, 'y', 0.95, 10);
  base.ring(0.88, 0.085, 0, 0.78, 0, RED);
  for (const sx of [-1, 1]) {
    base.box(0.38, 0.22, 1.4, sx * 0.84, 0.15, 0, STEEL);
    base.box(0.17, 0.12, 0.48, sx * 0.85, 0.3, 0.34, RED);
  }
  base.finish(group, 'turret-base');
  const head = part(group, 'turret-head', 0, 1.2, 0);
  const armor = assetBatch();
  armor.box(1.42, 0.84, 1.23, 0, 0.02, -0.13, RED);
  armor.box(1.12, 0.15, 1.27, 0, 0.52, -0.13, STEEL);
  armor.box(0.64, 0.38, 0.14, 0, 0.23, 0.52, DARK);
  for (const sx of [-1, 1]) {
    armor.box(0.24, 0.54, 1.32, sx * 0.76, 0.02, -0.06, DARK);
    for (let k = 0; k < 3; k++) armor.box(0.1, 0.24, 0.12, sx * 0.89, 0.03, -0.43 + k * 0.29, STEEL);
  }
  armor.finish(head, 'turret-armor');
  const recoil = part(head, 'turret-recoil', 0, -0.13, 0.37);
  const gun = assetBatch();
  gun.cylinder(0.23, 1.05, 0, 0, 0.47, DARK, 'z', 0.29, 10);
  gun.cylinder(0.3, 0.24, 0, 0, 0.87, STEEL, 'z', 0.3, 10);
  gun.ring(0.2, 0.065, 0, 0, 1.02, STEEL, 'z');
  gun.cylinder(0.135, 0.018, 0, 0, 1.025, 0x080f19, 'z');
  gun.finish(recoil, 'turret-barrel');
  const muzzle = part(recoil, 'turret-muzzle', 0, 0, 1.06);
  const sensors = assetBatch(); sensors.box(0.4, 0.15, 0.12, 0, 0.25, 0.62, 0xff6b6b);
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
  hull.cylinder(1.43, 0.28, 0, 0.16, 0, DARK, 'y', 1.55, 12);
  hull.add(new THREE.SphereGeometry(1.43, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), color, 0, 0.25, 0);
  hull.ring(1.39, 0.09, 0, 0.32, 0, edge);
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    hull.box(0.09, 0.65, 0.24, Math.sin(a) * 1.23, 0.72, Math.cos(a) * 1.23, edge, 0, a, 0);
  }
  if (dome) {
    for (const sx of [-1, 1]) {
      hull.box(0.4, 0.25, 0.72, sx * 1.16, 1.11, -0.25, RED);
      hull.box(0.3, 0.1, 0.52, sx * 1.16, 1.3, -0.25, edge);
    }
    hull.ring(0.92, 0.06, 0, 1.35, 0, edge);
  } else {
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + Math.PI / 8;
      hull.box(0.48, 0.1, 0.18, Math.sin(a) * 1.16, 0.91, Math.cos(a) * 1.16, edge, 0, a, 0);
    }
    hull.ring(1.32, 0.035, 0, 0.61, 0, edge);
  }
  hull.box(1.35, 1.3, 0.42, 0, 0.7, 1.18, edge);
  hull.box(1.11, 1.15, 0.1, 0, 0.65, 1.43, DARK);
  hull.box(1.58, 0.15, 0.57, 0, 0.15, 1.28, edge);
  hull.box(1.57, 0.2, 0.52, 0, 1.37, 1.25, RED);
  hull.cylinder(0.29, 0.23, 0, 1.75, 0, edge, 'y', 0.4, 8);
  hull.cylinder(0.055, 0.61, 0, 2.12, 0, DARK, 'y', 0.055, 6);
  hull.finish(group, 'bunker-shell');
  const doors = [];
  for (const sx of [-1, 1]) {
    const door = part(group, 'bunker-door', sx * 0.265, 0, 1.5);
    const panel = assetBatch();
    panel.box(0.5, 1.04, 0.11, 0, 0.66, 0, dome ? RED : color);
    for (const y of [0.4, 0.9]) panel.box(0.38, 0.08, 0.07, 0, y, 0.07, edge);
    panel.finish(door, 'door-plate'); doors.push({ group: door, sx });
  }
  const lamps = assetBatch();
  for (const sx of [-1, 1]) lamps.box(0.1, 0.46, 0.1, sx * 0.68, 0.9, 1.47, 0xff6262);
  lamps.sphere(0.15, 0, 2.46, 0, dome ? AMBER : CYAN);
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
  batch.box(0.34, 0.84, len, 0, 0.45, 0, IVORY);
  batch.box(0.38, 0.13, len, 0, 0.93, 0, AMBER);
  batch.box(0.36, 0.15, len, 0, 0.09, 0, DARK);
  const count = Math.max(1, Math.ceil(len / 3.5));
  for (let k = 0; k <= count; k++) {
    const z = -len / 2 + 0.12 + k * Math.max(0, len - 0.24) / count;
    batch.box(0.38, 0.85, Math.min(0.2, len), 0, 0.48, z, STEEL);
    batch.box(0.38, 0.1, Math.min(0.2, len), 0, 0.99, z, DARK);
  }
  batch.finish(group, 'divider-panels');
  return group;
}

export function buildBattleCrusher(w) {
  const group = new THREE.Group(); group.name = 'hydraulic-crusher';
  const frame = assetBatch();
  for (const sx of [-1, 1]) {
    frame.box(0.4, 5.2, 0.6, sx * (w / 2 + 0.2), 2.6, 0, STEEL);
    frame.box(0.44, 0.26, 0.66, sx * (w / 2 + 0.2), 0.14, 0, DARK);
    frame.box(0.19, 4.4, 0.12, sx * (w / 2 + 0.2), 2.7, 0.35, DARK);
  }
  frame.box(w + 0.8, 0.4, 0.7, 0, 5.2, 0, DARK);
  frame.box(w + 0.6, 0.13, 0.75, 0, 5.39, 0, AMBER);
  frame.finish(group, 'crusher-frame');
  const block = part(group, 'crusher-block');
  const ram = assetBatch();
  ram.box(w - 0.1, 1.4, 1.6, 0, 0.7, 0, STEEL);
  ram.box(w - 0.25, 0.25, 1.55, 0, 0.13, 0, DARK);
  ram.box(w - 0.2, 0.28, 0.04, 0, 0.47, 0.78, AMBER);
  const stripeN = Math.max(1, Math.floor(w / 0.65));
  for (let k = 0; k < stripeN; k++) {
    const x = -w / 2 + 0.38 + k * (w - 0.76) / Math.max(1, stripeN - 1);
    ram.box(0.17, 0.25, 0.02, x, 0.47, 0.79, DARK, 0, 0, -0.42);
  }
  ram.finish(block, 'crusher-ram');
  const pistons = [];
  for (const sx of [-1, 1]) {
    const p = part(group, 'crusher-piston', sx * Math.max(0.2, w * 0.25), 0, -0.2);
    const rod = assetBatch(); rod.cylinder(0.08, 1, 0, 0.5, 0, IVORY, 'y', 0.08, 8); rod.finish(p, 'piston-rod');
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
  bands.box(1.9, 0.48, 1.9, 0, 0.24, 0, 0x635e60);
  bands.box(1.7, 0.3, 1.7, 0, 0.62, 0, 0x877e77);
  stone.cylinder(0.74, 8.45, 0, 5.03, 0, 0xb7aaa0, 'y', 0.74, 8);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    stone.box(0.12, 7.95, 0.12, sx * 0.45, 5.02, sz * 0.45, 0xcbbfb0);
  }
  for (let k = 0; k < 4; k++) bands.cylinder(0.77, 0.1, 0, 2.1 + k * 1.75, 0, 0x877e77, 'y', 0.77, 8);
  bands.box(1.65, 0.26, 1.65, 0, 9.34, 0, 0x877e77);
  bands.box(1.9, 0.42, 1.9, 0, 9.68, 0, 0x635e60);
  // Front relief marks the fracture so the column reads as a breakable obstacle.
  for (let k = 0; k < 4; k++) bands.box(0.06, 0.46, 0.045, k % 2 ? 0.18 : -0.12, 3.1 + k * 0.44, 0.75, DARK, 0, 0, k % 2 ? -0.6 : 0.6);
  stone.finish(body, 'pillar-stone'); bands.finish(body, 'pillar-bands');
  return { group, body, height: 10 };
}
