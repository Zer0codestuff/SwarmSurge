import * as THREE from 'three';
import { THEMES } from './levels.js';
import { assetBatch, assetGlow } from './asset-kit.js';

const DARK = 0x182534, STEEL = 0x7d93a6, IVORY = 0xe8f0f4;
const RED = 0xd83140, AMBER = 0xffc85a, CYAN = 0x67e6ef;
const FAMILY = {
  desert: 'bastion', mob: 'bastion', arena: 'bastion',
  jungle: 'temple', tomb: 'temple',
  frost: 'crown', sky: 'crown', candy: 'crown',
  moon: 'station', factory: 'station', neon: 'station',
  lava: 'gothic', spooky: 'gothic', void: 'gothic', volcano: 'gothic', blackhole: 'gothic',
  coral: 'reef', crystal: 'prism', storm: 'prism', casino: 'casino',
};

function part(parent, name, x = 0, y = 0, z = 0) {
  const group = new THREE.Group(); group.name = name; group.position.set(x, y, z); parent.add(group);
  return group;
}

function cone(batch, r, h, x, y, z, color, sides = 8) {
  batch.add(new THREE.ConeGeometry(r, h, sides), color, x, y, z);
}

function prism(batch, r, h, x, y, z, color, rz = 0) {
  const g = new THREE.OctahedronGeometry(r); g.scale(1, h / (r * 2), 1);
  batch.add(g, color, x, y, z, 0, 0, rz);
}

export function buildBattleTower(theme = 'desert') {
  const palette = THEMES[theme] || THEMES.desert, family = FAMILY[theme] || 'bastion';
  const group = new THREE.Group(); group.name = `fort-${theme}`;
  const masonry = assetBatch(), trim = assetBatch(), glow = assetBatch();
  const color = palette.tower, roof = palette.roof;
  const accent = family === 'station' || family === 'prism' ? (theme === 'storm' ? AMBER : CYAN) : AMBER;
  const pale = theme === 'candy' ? 0xffe3ef : theme === 'tomb' || theme === 'jungle' ? 0xe6ba71 : STEEL;

  masonry.box(14.4, 2.6, 2.05, 0, 1.3, 0, color);
  trim.box(14.65, 0.3, 2.2, 0, 0.17, 0, DARK);
  trim.box(14.65, 0.22, 2.2, 0, 2.65, 0, pale);
  // A recessed entrance remains visible through the army at the base of the fort.
  trim.box(3.6, 2.25, 0.24, 0, 1.13, 1.06, DARK);
  masonry.box(0.33, 2.45, 0.44, -1.92, 1.23, 1.13, pale);
  masonry.box(0.33, 2.45, 0.44, 1.92, 1.23, 1.13, pale);
  trim.box(4.2, 0.34, 0.5, 0, 2.42, 1.16, roof);
  for (const x of [-5.4, -3.6, 3.6, 5.4]) {
    trim.box(0.64, 1.1, 0.12, x, 1.35, 1.08, DARK);
    trim.box(0.8, 0.14, 0.22, x, 0.78, 1.14, pale);
    glow.box(0.11, 0.7, 0.14, x, 1.37, 1.17, accent);
  }
  for (let x = -6.6; x < 6.7; x += 1.1) {
    if (Math.abs(x) < 2.1) continue;
    trim.box(0.65, 0.48, 1.75, x, 2.97, 0, color);
  }
  const gates = [];
  for (const sx of [-1, 1]) {
    const gate = part(group, 'armored-gate', sx * 0.82, 0, 1.24);
    const panels = assetBatch();
    panels.box(1.58, 1.97, 0.13, 0, 0.99, 0, roof);
    for (let k = 0; k < 3; k++) panels.box(1.35, 0.09, 0.08, 0, 0.45 + k * 0.55, 0.08, pale);
    panels.finish(gate, 'gate-panels'); gates.push(gate);
  }
  const flags = [];
  for (const sx of [-1, 1]) {
    const x = sx * 6.9;
    trim.cylinder(1.5, 0.45, x, 0.24, -0.15, DARK, 'y', 1.63);
    if (family === 'bastion') {
      masonry.cylinder(1.22, 4.65, x, 2.7, -0.15, color, 'y', 1.42, 8);
      trim.cylinder(1.4, 0.28, x, 4.85, -0.15, pale, 'y', 1.4, 8);
      cone(trim, 1.65, 1.8, x, 5.9, -0.15, roof);
      for (const dx of [-0.65, 0, 0.65]) masonry.box(0.32, 0.5, 0.34, x + dx, 4.3, 1.05, pale);
    } else if (family === 'temple') {
      for (let k = 0; k < 4; k++) {
        const width = 2.6 - k * 0.35;
        masonry.box(width, 1.15, width, x, 1 + k * 1.12, -0.15, k % 2 ? pale : color);
      }
      trim.box(2.85, 0.33, 2.9, x, 5.08, -0.15, roof);
      cone(trim, 1.25, 1.15, x, 5.78, -0.15, pale, 4);
      trim.box(0.45, 2.3, 0.18, x, 3.0, 1.19, roof);
    } else if (family === 'station') {
      masonry.box(2.65, 4.5, 2.65, x, 2.7, -0.15, color);
      trim.box(2.85, 0.36, 2.8, x, 4.86, -0.15, DARK);
      trim.box(2.3, 0.6, 2.4, x, 5.28, -0.15, pale);
      for (const dx of [-0.8, 0.8]) glow.box(0.15, 2.6, 0.13, x + dx, 3.08, 1.23, accent);
      if (theme === 'factory') {
        trim.cylinder(0.46, 1.25, x - sx * 0.55, 6.12, -0.35, DARK);
        trim.cylinder(0.6, 0.16, x - sx * 0.55, 6.77, -0.35, pale);
      } else {
        masonry.add(new THREE.SphereGeometry(1.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), pale, x, 5.58, -0.15);
        trim.cylinder(0.07, 1, x, 6.85, -0.15, pale);
        glow.sphere(0.18, x, 7.38, -0.15, accent);
      }
    } else if (family === 'gothic') {
      masonry.box(2.4, 4.8, 2.5, x, 2.8, -0.15, color);
      trim.box(2.7, 0.25, 2.8, x, 4.93, -0.15, pale);
      cone(trim, 1.55, 2.35, x, 6.22, -0.15, roof, 4);
      trim.box(0.7, 1.55, 0.13, x, 3.68, 1.15, DARK);
      glow.box(0.2, 1.1, 0.14, x, 3.78, 1.24, theme === 'spooky' ? 0xffa340 : accent);
      for (const dz of [-1, 1]) cone(trim, 0.23, 0.8, x - sx * 1.08, 5.45, dz * 0.85 - 0.15, pale, 4);
    } else if (family === 'reef') {
      masonry.cylinder(1.2, 4.3, x, 2.55, -0.15, color, 'y', 1.45, 10);
      trim.ring(1.27, 0.16, x, 3.9, -0.15, 0xffad91);
      masonry.sphere(1.48, x, 4.85, -0.15, roof, 1, 0.55, 1);
      for (const dx of [-0.65, 0, 0.65]) {
        trim.beam([x + dx, 4.95, -0.1], [x + dx * 1.22, 6.2 + (dx ? 0 : 0.65), -0.1], 0.24, 0.24, 0xffad91);
        trim.sphere(0.23, x + dx * 1.22, 6.2 + (dx ? 0 : 0.65), -0.1, 0xffad91);
      }
      trim.ring(0.46, 0.11, x, 3.2, 1.07, AMBER, 'z');
      glow.sphere(0.32, x, 3.2, 1.1, CYAN, 1, 1, 0.25);
    } else if (family === 'prism') {
      masonry.cylinder(1.25, 4.35, x, 2.58, -0.15, color, 'y', 1.45, 6);
      trim.ring(1.3, 0.13, x, 4.55, -0.15, pale);
      prism(masonry, 1.15, 2.55, x, 5.62, -0.15, roof);
      prism(glow, 0.42, 1.35, x, 5.75, 0.92, accent);
      for (const dx of [-0.82, 0.82]) trim.beam([x + dx, 0.7, 1], [x + dx * 0.9, 4.2, 1], 0.2, 0.18, pale);
    } else if (family === 'casino') {
      masonry.box(2.5, 4.5, 2.6, x, 2.7, -0.15, color);
      trim.box(2.8, 0.4, 2.85, x, 5.02, -0.15, roof);
      trim.cylinder(1.03, 0.9, x, 5.67, -0.15, roof, 'y', 1.23, 8);
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * Math.PI * 2;
        cone(trim, 0.19, 0.62, x + Math.cos(a) * 0.86, 6.4, -0.15 + Math.sin(a) * 0.86, AMBER, 5);
      }
      for (const dy of [2.4, 3.3, 4.2]) glow.sphere(0.13, x - sx * 1.07, dy, 1.18, AMBER);
    } else {
      // Snow, cloud and candy towers share stacked rounded caps and a raised crown.
      masonry.cylinder(1.2, 4.5, x, 2.65, -0.15, color, 'y', 1.4, 10);
      trim.cylinder(1.45, 0.35, x, 4.8, -0.15, pale, 'y', 1.45, 10);
      cone(trim, 1.6, 1.9, x, 5.9, -0.15, roof, 10);
      trim.sphere(0.4, x, 7.0, -0.15, theme === 'candy' ? 0xffe3ef : pale);
      for (const dx of [-0.7, 0.7]) trim.box(0.2, 2.2, 0.19, x + dx, 3.1, 1.05, pale);
    }
    trim.box(0.5, 1.15, 0.12, x, 2.45, 1.22, DARK);
    glow.box(0.14, 0.75, 0.13, x, 2.55, 1.31, accent);
    const poleY = family === 'station' && theme !== 'factory' ? 7.35 : 6.8;
    trim.cylinder(0.045, 1.05, x, poleY + 0.25, -0.15, pale, 'y', 0.045, 5);
    const flag = part(group, 'fort-banner', x, poleY + 0.4, -0.15);
    const cloth = assetBatch(); cloth.box(0.7, 0.48, 0.055, -sx * 0.35, 0, 0, RED); cloth.finish(flag, 'banner-cloth');
    flags.push({ group: flag, sx, y: flag.position.y });
  }
  trim.cylinder(0.55, 0.16, 0, 3.15, 1.16, pale, 'z', 0.55, 8);
  glow.add(new THREE.OctahedronGeometry(0.32), accent, 0, 3.16, 1.28);
  masonry.finish(group, 'fort-masonry'); trim.finish(group, 'fort-trim'); glow.finish(group, 'fort-lights', assetGlow);
  return {
    group,
    animate(t, state = {}) {
      const health = Math.max(0, Math.min(1, state.health ?? 1));
      for (const f of flags) {
        f.group.rotation.y = f.sx * 0.08 + Math.sin(t * 2.6 + f.sx) * 0.14;
        f.group.rotation.z = f.sx * (1 - health) * 0.22;
        f.group.position.y = f.y - (1 - health) * 0.22;
      }
      for (let k = 0; k < gates.length; k++) gates[k].position.z = 1.24 - (state.hit || 0) * 0.045;
    },
  };
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
