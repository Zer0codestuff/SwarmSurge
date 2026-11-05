import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';

// Pale armor accepts the army's instance colors. Equipment keeps its dark outline.
const ALLY = {
  armor: 0xe2f1ff, trim: 0xfff5dc, dark: 0x17314c, joint: 0x284762,
  light: 0xa3f6ff, blue: 0x74bded, amber: 0xffbf53, visor: 0xecffff,
};
const ENEMY = {
  armor: 0xffe8df, trim: 0xffdba4, dark: 0x351e2d, joint: 0x59374a,
  light: 0xffc27b, blue: 0xffd2b2, amber: 0xffbc62, visor: 0xfff3c4,
};
const GUN = {
  dark: 0x152b42, body: 0x2b4963, edge: 0x6e8a9e,
  ivory: 0xfff0d0, cyan: 0x80efff, blue: 0x389ccc, amber: 0xffb448,
};
const STRIDE_HIP = 0.33;

// Six broad faces, twelve bevels and eight clipped corners: 44 triangles.
function bevelBox(width, height, depth, bevel = 0.02) {
  const half = [width / 2, height / 2, depth / 2];
  const radius = Math.min(bevel, ...half.map(n => n * 0.8));
  const inner = half.map(n => n - radius);
  const positions = [], normals = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  const normal = new THREE.Vector3(), center = new THREE.Vector3();
  function face(points) {
    a.fromArray(points[1]).sub(new THREE.Vector3().fromArray(points[0]));
    b.fromArray(points[2]).sub(new THREE.Vector3().fromArray(points[0]));
    normal.crossVectors(a, b).normalize();
    center.set(0, 0, 0);
    for (const p of points) center.add(new THREE.Vector3().fromArray(p));
    if (normal.dot(center) < 0) { points.reverse(); normal.negate(); }
    for (let i = 1; i < points.length - 1; i++) {
      for (const p of [points[0], points[i], points[i + 1]]) {
        positions.push(...p); normals.push(normal.x, normal.y, normal.z);
      }
    }
  }
  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3;
    for (const sign of [-1, 1]) {
      face([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sv]) => {
        const p = [0, 0, 0];
        p[axis] = sign * half[axis]; p[u] = su * inner[u]; p[v] = sv * inner[v];
        return p;
      }));
    }
  }
  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3;
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      face([[-1, true], [1, true], [1, false], [-1, false]].map(([sign, first]) => {
        const p = [0, 0, 0];
        p[axis] = sign * inner[axis];
        p[u] = su * (first ? half[u] : inner[u]);
        p[v] = sv * (first ? inner[v] : half[v]);
        return p;
      }));
    }
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const signs = [sx, sy, sz];
    face([0, 1, 2].map(axis => signs.map((s, i) => s * (i === axis ? half[i] : inner[i]))));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

function builder(animated = false, lowDetail = false) {
  const parts = [];
  function add(geometry, color, position = [0, 0, 0], rotation = [0, 0, 0], leg = 0) {
    geometry.rotateX(rotation[0]).rotateY(rotation[1]).rotateZ(rotation[2]);
    geometry.translate(...position);
    let g = geometry;
    if (g.index) { g = geometry.toNonIndexed(); geometry.dispose(); }
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    const tint = new THREE.Color(color);
    const p = g.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const stride = animated ? new Float32Array(p.count * 3) : null;
    for (let i = 0; i < p.count; i++) {
      colors.set([tint.r, tint.g, tint.b], i * 3);
      if (leg) {
        // A ratio keeps the hip pivot correct when the merged model is scaled.
        const radius = Math.hypot(p.getX(i), p.getY(i), p.getZ(i));
        stride.set([leg, STRIDE_HIP / Math.max(radius, 0.0001), 1], i * 3);
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    if (animated) g.setAttribute('unitStride', new THREE.BufferAttribute(stride, 3));
    parts.push(g);
  }
  return {
    add,
    box(size, position, color, bevel = 0.018, rotation, leg = 0, keepBevel = false) {
      const geometry = lowDetail && bevel < 0.04 && !keepBevel ? new THREE.BoxGeometry(...size) : bevelBox(...size, bevel);
      add(geometry, color, position, rotation, leg);
    },
    cylinder(front, rear, length, position, color, axis = 'z', segments = 8) {
      const rotation = axis === 'z' ? [Math.PI / 2, 0, 0] : axis === 'x' ? [0, 0, Math.PI / 2] : [0, 0, 0];
      add(new THREE.CylinderGeometry(front, rear, length, lowDetail ? 4 : segments), color, position, rotation);
    },
    sphere(radius, scale, position, color, width = 10, height = 6) {
      add(new THREE.SphereGeometry(radius, width, height).scale(...scale), color, position);
    },
    ring(radius, tube, position, color, segments = 10) {
      add(new THREE.TorusGeometry(radius, tube, 4, segments), color, position);
    },
    hose(points, radius, color) {
      const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
      add(new THREE.TubeGeometry(path, 6, radius, 5, false), color);
    },
    finish() {
      const geometry = mergeGeometries(parts, false);
      for (const part of parts) part.dispose();
      geometry.userData.shared = true;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      if (animated) {
        // The stride raises the feet and extends them beyond their resting pose.
        geometry.boundingBox.min.z -= 0.18;
        geometry.boundingBox.max.z += 0.18;
        geometry.boundingSphere.radius += 0.18;
      }
      return geometry;
    },
  };
}

/** A grounded humanoid facing +z. Low detail preserves the helmet and body outline. */
export function troopGeometry(enemy = false, detail = 'high') {
  const p = enemy ? ENEMY : ALLY;
  const low = detail === 'low';
  const b = builder(true, low);
  b.box([0.31, 0.09, 0.23], [0, 0.335, 0], p.dark, 0.025);
  b.box([0.36, 0.25, 0.25], [0, 0.49, 0], p.armor, 0.042);
  b.box([0.28, 0.17, 0.055], [0, 0.505, 0.137], p.blue, 0.025);
  b.box([0.16, 0.055, 0.014], [0, 0.53, 0.17], p.trim, 0.008);
  if (!low) {
    b.box([0.044, 0.026, 0.018], [0.09, 0.47, 0.174], p.amber, 0.005);
    b.box([0.09, 0.055, 0.035], [0, 0.34, 0.126], p.trim, 0.008);
  }
  b.cylinder(0.105, 0.11, 0.055, [0, 0.624, 0], p.dark, 'y');

  // The helmet has a separate brow, face gasket and inset visor.
  b.box([0.43, 0.33, 0.35], [0, 0.805, 0.005], p.armor, 0.064);
  b.box([0.39, 0.13, 0.035], [0, 0.81, 0.183], p.dark, 0.024);
  b.box([0.325, enemy ? 0.045 : 0.063, 0.017], [0, 0.821, 0.206], p.visor, 0.012);
  b.box([0.39, 0.043, 0.075], [0, 0.903, 0.154], p.blue, 0.018);
  b.box([0.20, 0.055, 0.036], [0, 0.721, 0.183], p.joint, 0.016);
  for (const side of [-1, 1]) {
    b.cylinder(0.059, 0.059, 0.036, [side * 0.218, 0.805, 0.01], p.dark, 'x');
    b.cylinder(0.033, 0.033, 0.041, [side * 0.223, 0.805, 0.01], p.blue, 'x');
    if (!low) b.box([0.043, 0.045, 0.035], [side * 0.09, 0.72, 0.205], p.trim, 0.006);
  }
  b.box([0.065, 0.045, 0.18], [0, 0.982, -0.018], p.trim, 0.014);
  b.box([0.032, 0.014, 0.075], [0, 1.01, -0.018], p.light, 0.005);
  if (enemy) {
    for (const side of [-1, 1]) {
      b.box([0.055, 0.12, 0.065], [side * 0.16, 0.967, -0.045], p.trim, 0.013, [0, 0, -side * 0.23], 0, true);
    }
  }

  b.box([0.235, 0.24, 0.13], [0, 0.49, -0.177], p.dark, 0.025);
  b.box([0.14, 0.14, 0.025], [0, 0.5, -0.25], p.blue, 0.016);
  b.box([0.055, 0.08, 0.014], [0, 0.515, -0.271], p.light, 0.008);
  for (const side of [-1, 1]) {
    b.box([0.145, 0.115, 0.20], [side * 0.235, 0.577, 0.005], p.blue, 0.032);
    b.box([0.11, 0.16, 0.125], [side * 0.25, 0.465, 0.01], p.joint, 0.025, [0, 0, side * 0.15]);
    b.box([0.12, 0.12, 0.17], [side * 0.277, 0.419, 0.092], p.armor, 0.028, [side === 1 ? -0.7 : -0.18, 0, 0]);
    b.box([0.105, 0.085, 0.105], [side * 0.28, 0.435, side === 1 ? 0.19 : 0.14], p.dark, 0.022);
    b.box([0.13, 0.16, 0.145], [side * 0.115, 0.245, -0.005], p.armor, 0.027, undefined, side);
    b.box([0.105, 0.12, 0.12], [side * 0.115, 0.113, 0], p.joint, 0.022, undefined, side);
    b.box([0.116, 0.075, 0.065], [side * 0.115, 0.172, 0.072], p.blue, 0.02, undefined, side);
    b.box([0.163, 0.095, 0.245], [side * 0.115, 0.063, 0.045], p.dark, 0.025, undefined, side);
    b.box([0.17, 0.035, 0.25], [side * 0.115, 0.0175, 0.045], p.joint, 0.01, undefined, side);
    b.box([0.122, 0.025, 0.06], [side * 0.115, 0.092, 0.135], p.trim, 0.008, undefined, side);
  }
  const geometry = b.finish();
  geometry.name = enemy ? 'Raider infantry' : 'Surge infantry';
  if (low) geometry.name += ' low';
  geometry.userData.detail = low ? 'low' : 'high';
  return geometry;
}

function grip(b, magazine = true) {
  b.box([0.068, 0.13, 0.075], [0.29, 0.387, 0.19], GUN.dark, 0.012, [-0.17, 0, 0]);
  if (magazine) b.box([0.077, 0.095, 0.11], [0.29, 0.373, 0.31], GUN.edge, 0.014, [0.12, 0, 0]);
}

function blaster(b) {
  grip(b);
  b.box([0.135, 0.125, 0.265], [0.29, 0.473, 0.275], GUN.dark, 0.024);
  b.box([0.105, 0.055, 0.23], [0.29, 0.547, 0.3], GUN.ivory, 0.016);
  b.box([0.145, 0.058, 0.115], [0.29, 0.475, 0.315], GUN.blue, 0.013);
  b.cylinder(0.039, 0.049, 0.22, [0.29, 0.485, 0.49], GUN.body);
  b.cylinder(0.06, 0.06, 0.055, [0.29, 0.485, 0.61], GUN.ivory);
  b.cylinder(0.036, 0.036, 0.008, [0.29, 0.485, 0.642], GUN.dark);
  b.cylinder(0.021, 0.021, 0.01, [0.29, 0.485, 0.649], GUN.cyan);
  b.box([0.055, 0.022, 0.10], [0.29, 0.584, 0.32], GUN.cyan, 0.005);
  b.box([0.045, 0.027, 0.035], [0.29, 0.578, 0.19], GUN.amber, 0.006);
}

function rocketLauncher(b) {
  grip(b, false);
  b.box([0.12, 0.09, 0.26], [0.29, 0.462, 0.25], GUN.dark, 0.02);
  b.cylinder(0.101, 0.108, 0.6, [0.29, 0.58, 0.335], GUN.body);
  for (const z of [0.05, 0.31, 0.61]) b.cylinder(0.118, 0.118, 0.048, [0.29, 0.58, z], GUN.ivory);
  b.cylinder(0.09, 0.09, 0.012, [0.29, 0.58, 0.018], GUN.dark);
  b.cylinder(0.072, 0.072, 0.13, [0.29, 0.58, 0.636], GUN.amber);
  b.cylinder(0, 0.076, 0.18, [0.29, 0.58, 0.776], GUN.ivory);
  for (const side of [-1, 1]) b.box([0.024, 0.16, 0.12], [0.29 + side * 0.085, 0.58, 0.648], GUN.blue, 0.006);
  b.box([0.04, 0.07, 0.045], [0.29, 0.72, 0.29], GUN.dark, 0.008);
  b.box([0.02, 0.025, 0.045], [0.29, 0.757, 0.29], GUN.cyan, 0.005);
  b.box([0.035, 0.055, 0.13], [0.398, 0.58, 0.28], GUN.amber, 0.006);
}

function arcRifle(b) {
  grip(b);
  b.box([0.15, 0.14, 0.27], [0.29, 0.48, 0.27], GUN.dark, 0.024);
  b.box([0.17, 0.065, 0.14], [0.29, 0.53, 0.31], GUN.cyan, 0.013);
  b.cylinder(0.044, 0.065, 0.23, [0.29, 0.49, 0.47], GUN.body);
  for (const z of [0.42, 0.49, 0.56]) b.ring(0.063, 0.015, [0.29, 0.49, z], GUN.cyan, 8);
  for (const side of [-1, 1]) {
    b.box([0.04, 0.10, 0.30], [0.29 + side * 0.085, 0.49, 0.62], GUN.ivory, 0.013, [0, -side * 0.09, 0]);
    b.box([0.025, 0.06, 0.055], [0.29 + side * 0.075, 0.49, 0.77], GUN.cyan, 0.008);
  }
  b.cylinder(0.105, 0.105, 0.11, [0, 0.49, -0.287], GUN.dark);
  b.cylinder(0.076, 0.076, 0.015, [0, 0.49, -0.35], GUN.cyan);
  b.hose([[0.09, 0.47, -0.28], [0.27, 0.34, -0.17], [0.39, 0.37, 0.13], [0.35, 0.45, 0.22]], 0.017, GUN.body);
}

function scattergun(b) {
  grip(b);
  b.box([0.18, 0.13, 0.23], [0.29, 0.475, 0.23], GUN.body, 0.023);
  for (const side of [-1, 1]) {
    const x = 0.29 + side * 0.052;
    b.cylinder(0.047, 0.047, 0.35, [x, 0.5, 0.47], GUN.dark);
    b.cylinder(0.055, 0.055, 0.055, [x, 0.5, 0.66], GUN.ivory);
    b.cylinder(0.039, 0.039, 0.008, [x, 0.5, 0.693], GUN.dark);
  }
  b.box([0.185, 0.075, 0.19], [0.29, 0.423, 0.47], GUN.ivory, 0.018);
  for (const z of [0.415, 0.47, 0.525]) b.box([0.193, 0.016, 0.014], [0.29, 0.42, z], GUN.body, 0.003);
  b.box([0.05, 0.028, 0.08], [0.29, 0.558, 0.25], GUN.cyan, 0.006);
  for (let i = 0; i < 3; i++) {
    b.cylinder(0.023, 0.023, 0.125, [-0.074 + i * 0.074, 0.48, -0.275], GUN.amber, 'y', 6);
    b.cylinder(0.025, 0.025, 0.027, [-0.074 + i * 0.074, 0.422, -0.275], GUN.dark, 'y', 6);
  }
}

function railgun(b) {
  grip(b);
  b.box([0.155, 0.14, 0.28], [0.29, 0.475, 0.23], GUN.dark, 0.023);
  b.box([0.115, 0.075, 0.15], [0.29, 0.477, 0.08], GUN.ivory, 0.016);
  b.box([0.04, 0.045, 0.48], [0.29, 0.49, 0.58], GUN.cyan, 0.01);
  for (const side of [-1, 1]) {
    const x = 0.29 + side * 0.068;
    b.box([0.05, 0.11, 0.51], [x, 0.49, 0.59], GUN.body, 0.014);
    b.box([0.03, 0.025, 0.46], [x, 0.552, 0.59], GUN.ivory, 0.006);
    b.box([0.055, 0.13, 0.065], [x, 0.49, 0.865], GUN.ivory, 0.01);
  }
  b.box([0.19, 0.027, 0.06], [0.29, 0.418, 0.865], GUN.dark, 0.006);
  b.box([0.065, 0.055, 0.1], [0.29, 0.567, 0.25], GUN.body, 0.009);
  b.cylinder(0.041, 0.05, 0.19, [0.29, 0.626, 0.27], GUN.dark);
  b.cylinder(0.031, 0.031, 0.012, [0.29, 0.626, 0.371], GUN.cyan);
}

function flamethrower(b) {
  grip(b, false);
  b.box([0.135, 0.13, 0.23], [0.29, 0.465, 0.255], GUN.body, 0.021);
  b.cylinder(0.061, 0.05, 0.22, [0.29, 0.49, 0.45], GUN.dark);
  b.cylinder(0.105, 0.06, 0.19, [0.29, 0.49, 0.625], GUN.ivory);
  b.cylinder(0.081, 0.081, 0.01, [0.29, 0.49, 0.727], GUN.dark);
  b.cylinder(0.034, 0.034, 0.012, [0.29, 0.49, 0.736], GUN.amber);
  b.cylinder(0.016, 0.016, 0.25, [0.29, 0.385, 0.55], GUN.dark, 'z', 6);
  b.sphere(0.026, [0.8, 1, 1.1], [0.29, 0.386, 0.688], GUN.amber, 6, 4);
  for (const side of [-1, 1]) {
    const x = side * 0.082;
    b.cylinder(0.067, 0.067, 0.29, [x, 0.48, -0.277], GUN.amber, 'y');
    for (const y of [0.37, 0.58]) b.cylinder(0.074, 0.074, 0.028, [x, y, -0.277], GUN.dark, 'y');
    b.cylinder(0.03, 0.04, 0.055, [x, 0.648, -0.277], GUN.body, 'y', 6);
  }
  b.hose([[0.12, 0.4, -0.29], [0.31, 0.29, -0.12], [0.39, 0.34, 0.1], [0.33, 0.41, 0.25]], 0.023, GUN.dark);
}

function frostProjector(b) {
  grip(b, false);
  b.box([0.14, 0.135, 0.24], [0.29, 0.47, 0.25], GUN.body, 0.023);
  b.cylinder(0.098, 0.066, 0.23, [0.29, 0.49, 0.455], GUN.ivory);
  b.cylinder(0.098, 0.098, 0.095, [0.29, 0.49, 0.58], GUN.blue);
  b.ring(0.098, 0.021, [0.29, 0.49, 0.636], GUN.ivory, 8);
  b.cylinder(0.055, 0.055, 0.012, [0.29, 0.49, 0.642], GUN.dark, 'z', 6);
  b.cylinder(0, 0.052, 0.16, [0.29, 0.49, 0.714], GUN.cyan, 'z', 6);
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    b.box([0.038, 0.12, 0.2], [0.29 + Math.sin(angle) * 0.092, 0.49 + Math.cos(angle) * 0.092, 0.545], GUN.ivory, 0.01, [0, 0, -angle]);
  }
  b.cylinder(0.105, 0.105, 0.28, [0, 0.48, -0.285], GUN.cyan, 'y');
  for (const y of [0.35, 0.61]) b.cylinder(0.113, 0.113, 0.04, [0, y, -0.285], GUN.dark, 'y');
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    b.box([0.055, 0.027, 0.12], [side * 0.119, 0.42 + i * 0.065, -0.286], GUN.ivory, 0.005);
  }
}

function plasmaCaster(b) {
  grip(b, false);
  b.box([0.155, 0.135, 0.24], [0.29, 0.45, 0.23], GUN.dark, 0.023);
  b.sphere(0.145, [1, 0.9, 1.05], [0.29, 0.505, 0.414], GUN.blue);
  b.sphere(0.103, [1, 0.9, 1.2], [0.29, 0.51, 0.477], GUN.cyan);
  for (const z of [0.36, 0.49]) b.ring(0.137, 0.023, [0.29, 0.505, z], GUN.ivory);
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    b.box([0.052, 0.07, 0.20], [0.29 + Math.sin(angle) * 0.107, 0.505 + Math.cos(angle) * 0.107, 0.597], GUN.body, 0.016, [0, 0, -angle]);
    b.box([0.03, 0.047, 0.047], [0.29 + Math.sin(angle) * 0.107, 0.505 + Math.cos(angle) * 0.107, 0.701], GUN.ivory, 0.008, [0, 0, -angle]);
  }
  b.sphere(0.075, [1, 1, 1.05], [0.29, 0.505, 0.616], GUN.cyan, 8, 5);
  b.box([0.24, 0.24, 0.11], [0, 0.49, -0.27], GUN.dark, 0.036);
  b.cylinder(0.083, 0.083, 0.025, [0, 0.49, -0.343], GUN.blue);
  b.cylinder(0.05, 0.05, 0.028, [0, 0.49, -0.36], GUN.cyan);
}

const WEAPONS = [null, blaster, rocketLauncher, arcRifle, scattergun, railgun, flamethrower, frostProjector, plasmaCaster];
const WEAPON_NAMES = [null, 'Blaster', 'Rocket launcher', 'Arc rifle', 'Scattergun', 'Railgun', 'Flamethrower', 'Frost projector', 'Plasma caster'];

/** Includes the existing weapon overlay's 1.2 scale and right-hand placement. */
export function weaponGeometry(id) {
  const kind = Number.isInteger(id) && WEAPONS[id] ? id : 1;
  const b = builder();
  WEAPONS[kind](b);
  const geometry = b.finish().scale(1.2, 1.2, 1.2);
  geometry.name = WEAPON_NAMES[kind];
  return geometry;
}

const troopTime = { value: 0 };
const STRIDE_SHADER = `
uniform float uTroopTime;
uniform float uTroopStride;
attribute vec3 unitStride;
#ifdef USE_INSTANCING
  attribute vec2 unitMotion;
#endif
float unitStrideAngle() {
  float phase = uTroopTime * 10.5;
  float movement = 1.0;
  #ifdef USE_INSTANCING
    phase = unitMotion.x;
    movement = unitMotion.y;
  #endif
  return sin(phase) * unitStride.x * 0.43 * uTroopStride * movement;
}
vec2 unitStrideRotate(vec2 value, float angle) {
  float s = sin(angle), c = cos(angle);
  return vec2(c * value.x - s * value.y, s * value.x + c * value.y);
}
`;

function patchMotionMaterial(material, stride) {
  const previousCompile = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey;
  material.onBeforeCompile = function(shader, renderer) {
    previousCompile.call(this, shader, renderer);
    shader.uniforms.uTroopTime = troopTime;
    shader.uniforms.uTroopStride = stride;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${STRIDE_SHADER}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        objectNormal.yz = unitStrideRotate(objectNormal.yz, unitStrideAngle());`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if (unitStride.x != 0.0) {
          float stepAngle = unitStrideAngle();
          float hipHeight = length(position) * unitStride.y;
          transformed.yz = unitStrideRotate(transformed.yz - vec2(hipHeight, 0.0), stepAngle) + vec2(hipHeight, 0.0);
          transformed.y += abs(sin(stepAngle)) * hipHeight * 0.22;
        }`);
  };
  material.customProgramCacheKey = function() {
    return `${previousKey.call(this)}|surge-infantry-stride-v2`;
  };
  material.needsUpdate = true;
}

/** Patch once, then attach the supplied shadow materials to the InstancedMesh. */
export function installTroopMotion(material) {
  if (material.userData.troopMotion) return material;
  const stride = { value: 1 };
  patchMotionMaterial(material, stride);
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  const distance = new THREE.MeshDistanceMaterial();
  patchMotionMaterial(depth, stride);
  patchMotionMaterial(distance, stride);
  material.userData.troopMotion = { stride, depthMaterial: depth, distanceMaterial: distance };
  material.addEventListener('dispose', () => { depth.dispose(); distance.dispose(); });
  return material;
}

/** Pass simulation seconds so pause and the saved battle also freeze the stride. */
export function updateTroopMotion(time) {
  if (Number.isFinite(time)) troopTime.value = time;
}
