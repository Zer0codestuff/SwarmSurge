import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';

// Templates own their geometry and materials for the life of the module. Rig
// instances own only their scene nodes and instance buffers. Use rig.dispose()
// when removing a cannon; do not dispose its shared geometry in a scene walk.
const templates = new Map();
const barrelGeometries = new Map();
const surface = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.47, metalness: 0.18 });
const luminous = new THREE.MeshBasicMaterial({ vertexColors: true });
surface.userData.shared = luminous.userData.shared = true;
const NAVY = 0x142b49, DARK = 0x223d58, RUBBER = 0x102132;
const IVORY = 0xeaf5fa, STEEL = 0x7597b1, CYAN = 0x65f4ff, AMBER = 0xffbc50;
const transform = new THREE.Object3D();
const direction = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const trackPose = { y: 0, z: 0, angle: 0 };
const TAU = Math.PI * 2;

const mounts = [
  [1.1, -0.2, 1.6, 0.2],
  [1.1, -0.2, 1.6, 0.2],
  [1.1, -0.2, 1.6, 0.2],
  [1.28, -0.28, 1.77, 0.14],
  [1.28, -0.32, 1.77, 0.12],
  [1.48, -0.28, 1.95, 0.36],
  [1.68, -0.35, 2.11, 0.6],
];

function beveledBox(w, h, d, bevel = 0.045) {
  const b = Math.min(bevel, w * 0.18, h * 0.18, d * 0.18);
  const x = w / 2 - b, y = h / 2 - b, cut = b * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-x + cut, -y);
  shape.lineTo(x - cut, -y); shape.lineTo(x, -y + cut);
  shape.lineTo(x, y - cut); shape.lineTo(x - cut, y);
  shape.lineTo(-x + cut, y); shape.lineTo(-x, y - cut);
  shape.lineTo(-x, -y + cut); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: d - b * 2, steps: 1, bevelEnabled: true,
    bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1,
  });
  g.translate(0, 0, -d / 2 + b);
  return g;
}

function batch() {
  const parts = [];
  function add(g, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    let geo = g.index ? g.toNonIndexed() : g;
    if (geo !== g) g.dispose();
    geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); geo.translate(x, y, z);
    const c = new THREE.Color(color), count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    for (const key of Object.keys(geo.attributes)) {
      if (!['position', 'normal', 'color'].includes(key)) geo.deleteAttribute(key);
    }
    parts.push(geo);
    return api;
  }
  const api = {
    add,
    box(w, h, d, x, y, z, color, rx = 0, ry = 0, rz = 0) {
      return add(beveledBox(w, h, d), color, x, y, z, rx, ry, rz);
    },
    cylinder(r, h, x, y, z, color, axis = 'y', bottom = r, sides = 10) {
      return add(new THREE.CylinderGeometry(r, bottom, h, sides), color, x, y, z,
        axis === 'z' ? Math.PI / 2 : 0, 0, axis === 'x' ? Math.PI / 2 : 0);
    },
    ring(r, tube, x, y, z, color, axis = 'y') {
      return add(new THREE.TorusGeometry(r, tube, 4, 14), color, x, y, z,
        axis === 'y' ? Math.PI / 2 : 0, axis === 'x' ? Math.PI / 2 : 0);
    },
    sphere(r, x, y, z, color) {
      return add(new THREE.SphereGeometry(r, 10, 6), color, x, y, z);
    },
    beam(a, b, w, d, color) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
      const geo = beveledBox(w, start.distanceTo(end), d);
      direction.subVectors(end, start).normalize();
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, direction));
      start.add(end).multiplyScalar(0.5);
      return add(geo, color, start.x, start.y, start.z);
    },
    geometry() {
      const geometry = mergeGeometries(parts, false);
      parts.forEach(part => part.dispose());
      geometry.computeBoundingSphere();
      geometry.userData.shared = true;
      return geometry;
    },
    finish(parent, name = '', material = surface) {
      const mesh = new THREE.Mesh(api.geometry(), material);
      mesh.name = name; mesh.castShadow = material === surface; mesh.receiveShadow = material === surface;
      parent.add(mesh);
      return mesh;
    },
  };
  return api;
}

/** Shared vertex-colored barrel geometry, mounted at Z=0 and firing toward -Z. */
export function cannonBarrelGeometry(tint = 0x2f8bff) {
  if (!barrelGeometries.has(tint)) {
    const b = batch();
    b.cylinder(0.18, 0.2, 0, 0, -0.11, NAVY, 'z', 0.18, 12);
    b.cylinder(0.185, 0.07, 0, 0, -0.035, STEEL, 'z', 0.185, 12);
    b.box(0.36, 0.32, 0.64, 0, 0, -0.47, tint);
    b.box(0.23, 0.035, 0.52, 0, 0.17, -0.46, IVORY);
    b.box(0.2, 0.075, 0.73, 0, -0.145, -0.53, NAVY);
    b.add(new THREE.CylinderGeometry(0.135, 0.135, 0.51, 12, 1, true), DARK, 0, 0, -0.9, Math.PI / 2);
    b.add(new THREE.CylinderGeometry(0.18, 0.18, 0.2, 12, 1, true), IVORY, 0, 0, -1.145, Math.PI / 2);
    b.add(new THREE.RingGeometry(0.115, 0.18, 12), IVORY, 0, 0, -1.245, 0, Math.PI);
    // Reverse the inner sleeve's winding so the bore has visible inside walls.
    const bore = new THREE.CylinderGeometry(0.115, 0.115, 0.18, 12, 1, true);
    const indices = bore.index.array;
    for (let k = 0; k < indices.length; k += 3) {
      const first = indices[k]; indices[k] = indices[k + 2]; indices[k + 2] = first;
    }
    bore.computeVertexNormals();
    b.add(bore, 0x0a1726, 0, 0, -1.155, Math.PI / 2);
    b.add(new THREE.CircleGeometry(0.115, 12), 0x070f1c, 0, 0, -1.064, 0, Math.PI);
    for (const side of [-1, 1]) for (const z of [-0.34, -0.6]) {
      b.add(new THREE.BoxGeometry(0.012, 0.1, 0.14), NAVY, side * 0.181, 0.015, z);
      b.add(new THREE.BoxGeometry(0.014, 0.027, 0.1), CYAN, side * 0.182, 0.015, z);
    }
    barrelGeometries.set(tint, b.geometry());
  }
  return barrelGeometries.get(tint);
}

function node(parent, name, x = 0, y = 0, z = 0) {
  const group = new THREE.Group(); group.name = name; group.position.set(x, y, z); parent.add(group);
  return group;
}

function chevrons(b, x, y, z, width = 0.18) {
  for (const s of [-1, 1]) b.box(width, 0.025, 0.055, x + s * width * 0.34, y, z + 0.02, IVORY, 0, -s * 0.65);
}

// The belt is a capsule in the YZ plane, with individual shoes following its
// perimeter. Each vehicle uses one instanced belt draw and one roller draw.
function trackPosition(distance, half, r, centerY) {
  const straight = half * 2, arc = Math.PI * r, length = straight * 2 + arc * 2;
  let d = ((distance % length) + length) % length;
  if (d < straight) {
    trackPose.y = centerY - r; trackPose.z = -half + d; trackPose.angle = 0;
    return trackPose;
  }
  d -= straight;
  if (d < arc) {
    const a = d / r;
    trackPose.y = centerY - r * Math.cos(a); trackPose.z = half + r * Math.sin(a); trackPose.angle = -a;
    return trackPose;
  }
  d -= arc;
  if (d < straight) {
    trackPose.y = centerY + r; trackPose.z = half - d; trackPose.angle = -Math.PI;
    return trackPose;
  }
  const a = Math.PI + (d - straight) / r;
  trackPose.y = centerY - r * Math.cos(a); trackPose.z = -half + r * Math.sin(a); trackPose.angle = -a;
  return trackPose;
}

function placeInstances(mesh, phase = 0) {
  const data = mesh.userData;
  if (data.kind === 'belt') {
    const length = data.half * 4 + TAU * data.radius;
    for (let side = 0; side < 2; side++) for (let k = 0; k < data.shoes; k++) {
      const { y, z, angle } = trackPosition(k / data.shoes * length + phase, data.half, data.radius, data.y);
      transform.position.set((side * 2 - 1) * data.x, y, z);
      transform.rotation.set(angle, 0, 0); transform.scale.set(1, 1, 1); transform.updateMatrix();
      mesh.setMatrixAt(side * data.shoes + k, transform.matrix);
    }
  } else {
    data.centers.forEach((center, k) => {
      transform.position.set(...center); transform.rotation.set(phase, 0, 0);
      transform.scale.set(1, 1, 1); transform.updateMatrix(); mesh.setMatrixAt(k, transform.matrix);
    });
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function tracks(parent, hull, tint, siege = false) {
  const x = siege ? 1.05 : 0.93, half = siege ? 0.94 : 0.78;
  for (const side of [-1, 1]) {
    hull.box(0.47, 0.38, half * 2 + 0.24, side * x, 0.43, 0, NAVY);
    hull.box(0.54, 0.17, half * 2 + 0.5, side * x, 0.79, 0, tint);
    hull.box(0.11, 0.045, half * 2 + 0.26, side * (x + 0.15), 0.89, 0, IVORY);
    hull.box(0.13, 0.11, 0.2, side * x, 0.76, -half - 0.2, IVORY);
    hull.box(0.13, 0.11, 0.13, side * x, 0.76, half + 0.2, AMBER);
  }
  const shoeGeo = batch().add(new THREE.BoxGeometry(0.45, 0.085, 0.13), RUBBER)
    .add(new THREE.BoxGeometry(0.38, 0.022, 0.052), STEEL, 0, 0.052, 0).geometry();
  const belt = new THREE.InstancedMesh(shoeGeo, surface, 56);
  belt.name = 'belt'; belt.userData = { kind: 'belt', x, half, radius: 0.27, y: 0.4, shoes: 28 };
  belt.castShadow = true; belt.frustumCulled = false; belt.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  parent.add(belt); placeInstances(belt);
  const rollerGeo = batch().cylinder(0.225, 0.48, 0, 0, 0, RUBBER, 'x')
    .cylinder(0.17, 0.5, 0, 0, 0, STEEL, 'x')
    .cylinder(0.108, 0.515, 0, 0, 0, tint, 'x')
    .add(new THREE.BoxGeometry(0.52, 0.042, 0.19), IVORY).geometry();
  const centers = [];
  for (const side of [-1, 1]) for (let k = 0; k < 5; k++) centers.push([side * x, 0.4, (k / 4 * 2 - 1) * half]);
  const rollers = new THREE.InstancedMesh(rollerGeo, surface, centers.length);
  rollers.name = 'rollers'; rollers.userData = { kind: 'rollers', centers };
  rollers.instanceMatrix.setUsage(THREE.DynamicDrawUsage); rollers.castShadow = true; rollers.frustumCulled = false;
  parent.add(rollers); placeInstances(rollers);
}

function buildBulldog(root, tint) {
  const b = batch(); tracks(root, b, tint);
  b.box(1.55, 0.35, 1.78, 0, 0.67, 0.05, NAVY);
  b.box(1.43, 0.27, 1.7, 0, 0.86, 0.03, tint);
  b.box(0.91, 0.38, 1.1, 0, 1.1, 0.12, tint);
  b.box(0.64, 0.095, 0.62, 0, 1.33, 0.24, IVORY);
  b.cylinder(0.39, 0.1, 0, 0.98, 0.05, DARK, 'y', 0.45, 12);
  b.box(0.9, 0.17, 0.18, 0, 0.85, -0.93, IVORY, 0.16);
  b.box(0.29, 0.12, 0.6, 0, 1.36, 0.21, NAVY);
  for (const s of [-1, 1]) {
    b.box(0.17, 0.22, 0.7, s * 0.56, 1.02, 0.08, IVORY);
    b.box(0.26, 0.11, 0.18, s * 0.45, 0.98, -0.67, NAVY);
    b.cylinder(0.1, 0.16, s * 0.54, 1.06, 0.77, DARK, 'z');
    b.box(0.09, 0.04, 0.27, s * 0.53, 1.19, 0.49, AMBER);
  }
  for (let k = 0; k < 4; k++) b.box(0.38, 0.026, 0.052, 0, 1.01, 0.55 + k * 0.1, NAVY);
  chevrons(b, 0, 1.397, 0.06, 0.25);
  b.finish(root, 'hull');
  const lights = batch();
  for (const s of [-1, 1]) lights.box(0.17, 0.065, 0.035, s * 0.45, 0.99, -0.77, CYAN);
  lights.box(0.27, 0.035, 0.04, 0, 1.43, 0.15, CYAN).finish(root, 'lamps', luminous);
}

function buildSiege(root, tint) {
  const b = batch(); tracks(root, b, tint, true);
  b.box(1.72, 0.38, 2.08, 0, 0.73, 0.08, NAVY);
  b.box(1.52, 0.32, 1.88, 0, 0.97, 0.1, tint);
  b.box(0.84, 0.35, 0.93, 0, 1.16, 0.27, tint);
  b.box(0.65, 0.11, 0.64, 0, 1.4, 0.28, IVORY);
  for (const s of [-1, 1]) {
    // Angled shoulder batteries and rear exhausts widen the siege silhouette.
    b.box(0.4, 0.42, 1.16, s * 0.91, 1.11, 0.22, IVORY, 0.05, 0, s * 0.1);
    b.box(0.28, 0.3, 0.16, s * 0.91, 1.12, -0.43, NAVY);
    for (let k = 0; k < 3; k++) b.cylinder(0.061, 0.095, s * 0.91 + (k - 1) * 0.079, 1.14, -0.53, AMBER, 'z', 0.061, 6);
    b.cylinder(0.11, 0.6, s * 0.64, 1.12, 0.93, DARK);
    b.cylinder(0.14, 0.11, s * 0.64, 1.45, 0.93, STEEL);
    b.beam([s * 0.65, 0.76, -0.67], [s * 0.82, 0.43, -1.15], 0.13, 0.13, STEEL);
    b.box(0.52, 0.4, 0.18, s * 0.48, 0.38, -1.22, IVORY, -0.22, -s * 0.18);
    b.box(0.08, 0.4, 0.2, s * 0.69, 0.38, -1.25, AMBER, -0.22);
  }
  b.box(1.74, 0.1, 0.17, 0, 0.2, -1.27, NAVY);
  b.box(0.35, 0.1, 0.47, 0, 1.49, 0.28, NAVY);
  for (let k = 0; k < 5; k++) b.box(0.38, 0.026, 0.055, 0, 1.15, 0.58 + k * 0.09, DARK);
  b.finish(root, 'hull');
  const lights = batch();
  for (const s of [-1, 1]) lights.box(0.22, 0.075, 0.035, s * 0.69, 0.87, -0.89, CYAN);
  lights.box(0.29, 0.025, 0.08, 0, 1.555, 0.28, CYAN).finish(root, 'lamps', luminous);
}

function buildSpider(root, tint) {
  const body = node(root, 'suspension');
  const b = batch();
  b.cylinder(0.67, 0.32, 0, 0.98, 0.08, NAVY, 'y', 0.48, 8);
  b.box(1.01, 0.36, 1.36, 0, 1.2, 0.02, tint);
  b.box(0.72, 0.18, 0.94, 0, 1.43, 0.04, IVORY);
  b.box(0.42, 0.1, 0.65, 0, 1.58, 0.17, NAVY);
  b.box(0.78, 0.19, 0.13, 0, 1.29, -0.73, NAVY);
  for (const side of [-1, 1]) {
    b.box(0.15, 0.32, 0.68, side * 0.54, 1.24, 0.14, IVORY, 0, 0, side * 0.13);
    b.cylinder(0.11, 0.37, side * 0.35, 1.5, 0.55, DARK);
    b.cylinder(0.09, 0.09, side * 0.35, 1.72, 0.55, AMBER);
  }
  chevrons(b, 0, 1.645, 0.07, 0.27); b.finish(body, 'hull');
  const lights = batch();
  for (const s of [-1, 1]) lights.box(0.22, 0.075, 0.03, s * 0.23, 1.31, -0.81, CYAN);
  lights.finish(body, 'lamps', luminous);
  for (const side of [-1, 1]) for (let row = 0; row < 3; row++) {
    const z = (row - 1) * 0.73;
    const leg = node(root, 'spider-leg', side * 0.49, 1.0, z);
    leg.userData = { side, phase: row * Math.PI * 0.67 + (side > 0 ? Math.PI : 0), reach: row === 1 ? 0 : (row - 1) * 0.16 };
    const upper = batch();
    upper.cylinder(0.16, 0.22, 0, 0, 0, STEEL, 'z');
    upper.beam([side * 0.04, 0, 0], [side * 0.52, -0.14, 0], 0.18, 0.21, NAVY);
    upper.beam([side * 0.12, 0.08, 0], [side * 0.48, -0.01, 0], 0.15, 0.27, tint);
    upper.box(0.18, 0.035, 0.15, side * 0.31, 0.065, 0, IVORY, 0, 0, -side * 0.2);
    upper.cylinder(0.14, 0.25, side * 0.52, -0.14, 0, IVORY, 'z');
    // The body supplies the ground shadow. Separate limb shadows would double
    // the articulated spider's draw calls for details below the camera's scale.
    upper.finish(leg, 'upper-leg').castShadow = false;
    const knee = node(leg, 'spider-knee', side * 0.52, -0.14, 0);
    const lower = batch();
    lower.beam([0, 0, 0], [side * 0.14, -0.64, 0], 0.11, 0.13, STEEL);
    lower.beam([side * 0.04, -0.05, 0], [side * 0.18, -0.41, 0], 0.2, 0.26, tint);
    lower.box(0.19, 0.12, 0.3, side * 0.15, -0.72, -0.025, NAVY);
    lower.box(0.18, 0.055, 0.26, side * 0.15, -0.64, -0.035, IVORY);
    lower.box(0.07, 0.12, 0.035, side * 0.18, -0.31, -0.145, AMBER);
    lower.finish(knee, 'lower-leg').castShadow = false;
  }
}

function buildHover(root, tint) {
  const hover = node(root, 'hover');
  const b = batch();
  b.box(1.27, 0.36, 1.81, 0, 0.86, 0.1, NAVY);
  b.box(1.21, 0.33, 1.58, 0, 1.08, 0.04, tint);
  b.box(0.79, 0.21, 1.05, 0, 1.35, 0.14, IVORY);
  b.box(0.42, 0.11, 0.67, 0, 1.52, 0.22, NAVY);
  b.box(0.74, 0.16, 0.16, 0, 1.14, -0.85, IVORY, 0.18);
  for (const side of [-1, 1]) {
    b.box(0.65, 0.14, 1.28, side * 0.86, 0.94, 0.33, tint, 0, side * 0.16, -side * 0.1);
    b.box(0.21, 0.47, 0.58, side * 0.89, 1.18, 0.91, IVORY, -0.25, 0, -side * 0.2);
    b.box(0.22, 0.08, 0.4, side * 0.91, 1.46, 0.84, AMBER, -0.25);
    for (const z of [-0.65, 0.64]) {
      b.cylinder(0.33, 0.27, side * 0.96, 0.73, z, NAVY, 'y', 0.28, 12);
      b.ring(0.27, 0.055, side * 0.96, 0.91, z, IVORY);
      b.cylinder(0.12, 0.12, side * 0.96, 0.99, z, tint);
      const rotor = node(hover, 'rotor', side * 0.96, 0.935, z);
      const blades = batch();
      for (let k = 0; k < 3; k++) blades.box(0.36, 0.035, 0.055, 0, 0, 0, STEEL, 0, k * Math.PI / 3);
      blades.cylinder(0.07, 0.06, 0, 0, 0, AMBER).finish(rotor, 'fan');
    }
  }
  b.finish(hover, 'hull');
  const flames = batch();
  for (const side of [-1, 1]) for (const z of [-0.65, 0.64]) {
    flames.cylinder(0.19, 0.38, side * 0.96, 0.37, z, CYAN, 'y', 0.075, 10);
    flames.ring(0.21, 0.026, side * 0.96, 0.57, z, CYAN);
  }
  flames.finish(hover, 'thrusters', luminous);
  const lamps = batch();
  lamps.box(0.63, 0.045, 0.035, 0, 1.2, -0.95, CYAN).finish(hover, 'lamps', luminous);
}

function buildRail(root, tint) {
  const b = batch();
  b.box(1.18, 0.35, 1.96, 0, 0.72, 0.04, NAVY);
  b.box(1.13, 0.28, 1.77, 0, 0.94, 0.08, tint);
  b.box(0.83, 0.27, 1.24, 0, 1.18, 0.21, IVORY);
  b.box(0.48, 0.21, 0.83, 0, 1.39, 0.28, tint);
  for (const side of [-1, 1]) {
    b.box(0.33, 0.29, 1.91, side * 0.86, 0.74, 0.05, tint, 0, side * 0.055);
    b.box(0.11, 0.055, 1.54, side * 0.91, 0.925, 0.06, IVORY);
    b.box(0.29, 0.62, 0.43, side * 0.54, 1.51, 0.7, NAVY, -0.12);
    b.box(0.32, 0.1, 0.46, side * 0.54, 1.88, 0.65, IVORY, -0.12);
    b.cylinder(0.1, 0.14, side * 0.54, 1.98, 0.65, AMBER);
    for (const z of [-0.69, 0.77]) {
      const wheel = node(root, 'rail-wheel', side * 0.97, 0.38, z);
      batch().cylinder(0.34, 0.26, 0, 0, 0, RUBBER, 'x', 0.34, 12)
        .cylinder(0.25, 0.285, 0, 0, 0, STEEL, 'x', 0.25, 10)
        .cylinder(0.145, 0.302, 0, 0, 0, tint, 'x', 0.145, 8)
        .box(0.31, 0.065, 0.31, 0, 0, 0, IVORY).finish(wheel, 'wheel');
    }
  }
  b.finish(root, 'hull');
  const slide = node(root, 'rail-slide');
  const rails = batch();
  for (const side of [-1, 1]) {
    rails.box(0.18, 0.22, 1.55, side * 0.45, 1.5, -0.43, NAVY);
    rails.box(0.16, 0.075, 1.51, side * 0.45, 1.66, -0.43, IVORY);
    rails.box(0.28, 0.32, 0.23, side * 0.45, 1.52, -1.1, tint);
    rails.box(0.18, 0.15, 0.07, side * 0.45, 1.52, -1.25, STEEL);
    for (let k = 0; k < 4; k++) rails.box(0.24, 0.29, 0.07, side * 0.45, 1.5, -0.8 + k * 0.27, tint);
  }
  rails.finish(slide, 'rails');
  const coils = batch();
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) coils.box(0.31, 0.045, 0.46, side * 0.54, 1.34 + k * 0.17, 0.7 - k * 0.02, CYAN);
    coils.box(0.045, 0.08, 1.27, side * 0.337, 1.55, -0.43, CYAN);
  }
  coils.finish(root, 'capacitors', luminous);
}

function buildTitan(root, tint) {
  const torso = node(root, 'titan-torso');
  const b = batch();
  b.box(0.97, 0.3, 0.74, 0, 1.08, 0.14, NAVY);
  b.box(1.25, 0.61, 0.84, 0, 1.57, 0.11, tint);
  b.box(0.87, 0.32, 0.18, 0, 1.67, -0.4, IVORY, -0.12);
  b.box(0.44, 0.13, 0.41, 0, 1.99, 0.1, NAVY);
  b.box(0.49, 0.3, 0.43, 0, 2.19, 0.09, IVORY);
  b.box(0.39, 0.14, 0.12, 0, 2.21, -0.16, NAVY);
  b.box(0.15, 0.15, 0.46, 0, 2.4, 0.1, tint);
  for (const side of [-1, 1]) {
    b.box(0.39, 0.4, 0.71, side * 0.78, 1.78, 0.11, IVORY, 0, 0, side * 0.11);
    b.box(0.27, 0.12, 0.55, side * 0.8, 2.05, 0.13, tint, 0, 0, side * 0.11);
    b.cylinder(0.13, 0.38, side * 0.4, 1.76, 0.59, DARK);
    b.cylinder(0.145, 0.08, side * 0.4, 1.99, 0.59, STEEL);
    const arm = node(torso, 'titan-arm', side * 0.79, 1.63, 0.1);
    arm.userData.side = side;
    batch().beam([0, 0, 0], [side * 0.16, -0.49, -0.06], 0.15, 0.2, STEEL)
      .box(0.37, 0.48, 0.55, side * 0.15, -0.36, -0.06, tint, -0.08, 0, -side * 0.09)
      .box(0.3, 0.08, 0.55, side * 0.15, -0.64, -0.07, NAVY)
      .box(0.23, 0.16, 0.055, side * 0.15, -0.39, -0.36, IVORY)
      .box(0.08, 0.13, 0.065, side * 0.15, -0.39, -0.4, AMBER).finish(arm, 'arm');
  }
  b.finish(torso, 'hull');
  const lights = batch();
  lights.box(0.31, 0.06, 0.04, 0, 2.22, -0.235, CYAN);
  lights.cylinder(0.15, 0.04, 0, 1.66, -0.52, CYAN, 'z');
  lights.finish(torso, 'lamps', luminous);
  for (const side of [-1, 1]) {
    const hip = node(root, 'titan-leg', side * 0.38, 0.99, 0.15);
    hip.userData.side = side;
    batch().cylinder(0.16, 0.26, 0, 0, 0, STEEL, 'x')
      .box(0.36, 0.38, 0.4, 0, -0.2, 0.02, tint)
      .cylinder(0.13, 0.4, 0, -0.39, 0, NAVY, 'x').finish(hip, 'thigh');
    const knee = node(hip, 'titan-knee', 0, -0.39, 0);
    batch().beam([0, 0, 0], [0, -0.38, 0.04], 0.17, 0.18, STEEL)
      .box(0.4, 0.39, 0.31, 0, -0.18, -0.05, IVORY, -0.07)
      .box(0.49, 0.16, 0.82, 0, -0.47, -0.16, NAVY)
      .box(0.43, 0.12, 0.61, 0, -0.37, -0.25, tint)
      .box(0.25, 0.045, 0.12, 0, -0.286, -0.42, AMBER).finish(knee, 'shin');
  }
}

const builders = [null, buildBulldog, buildSiege, buildSpider, buildHover, buildRail, buildTitan];

function getTemplate(id, tint) {
  const key = `${id}:${tint}`;
  if (!templates.has(key)) {
    const template = new THREE.Group(); template.name = `vehicle-form-${id}`;
    builders[id](template, tint); templates.set(key, template);
  }
  return templates.get(key);
}

function instanceForm(id, tint) {
  const group = getTemplate(id, tint).clone(true);
  const parts = { legs: [], knees: [], arms: [], rotors: [], wheels: [] };
  group.traverse(part => {
    if (part.name === 'belt') parts.belt = part;
    if (part.name === 'rollers') parts.rollers = part;
    if (part.name === 'spider-leg' || part.name === 'titan-leg') parts.legs.push(part);
    if (part.name === 'spider-knee' || part.name === 'titan-knee') parts.knees.push(part);
    if (part.name === 'titan-arm') parts.arms.push(part);
    if (part.name === 'rotor') parts.rotors.push(part);
    if (part.name === 'rail-wheel') parts.wheels.push(part);
    if (part.name === 'hover') parts.hover = part;
    if (part.name === 'thrusters') parts.thrusters = part;
    if (part.name === 'rail-slide') parts.railSlide = part;
    if (part.name === 'capacitors') parts.capacitors = part;
    if (part.name === 'titan-torso' || part.name === 'suspension') parts.torso = part;
  });
  let drawCalls = 0, triangles = 0;
  group.traverse(part => {
    if (!part.isMesh) return;
    drawCalls++;
    triangles += (part.geometry.index?.count ?? part.geometry.attributes.position.count) / 3 * (part.isInstancedMesh ? part.count : 1);
  });
  const bounds = new THREE.Box3().setFromObject(group);
  const stats = { drawCalls, triangles, min: bounds.min.toArray(), max: bounds.max.toArray() };
  return { group, parts, stats };
}

/** Lazy vehicle shell. Forward is -Z. Time/dt are seconds; charge is normalized. */
export function createVehicleRig(tint = 0x2f8bff) {
  const group = new THREE.Group(); group.name = 'vehicle-rig';
  const forms = new Map();
  const barrelAnchor = new THREE.Vector3(0, 1.1, -0.2);
  const glowAnchor = new THREE.Vector3(0, 1.6, 0.2);
  let form = null, formId = 0, travel = 0;
  function setForm(requested) {
    const id = Math.max(0, Math.min(6, Math.trunc(Number(requested) || 0)));
    if (id === formId) return;
    if (form) group.remove(form.group);
    formId = id; form = null;
    if (id) {
      if (!forms.has(id)) forms.set(id, instanceForm(id, tint));
      form = forms.get(id); group.add(form.group);
    }
    const mount = mounts[id];
    barrelAnchor.set(0, mount[0], mount[1]); glowAnchor.set(0, mount[2], mount[3]);
  }
  function animate(time, dt = 0, recoil = 0, speed = 0, charge = 0) {
    if (!form) return;
    const p = form.parts, motion = Math.min(1, Math.abs(speed) * 0.07);
    const advance = Math.max(0, Math.min(dt, 0.1)) * Math.min(10, Math.abs(speed)) * 0.3;
    travel += advance;
    const stride = travel * 6, kick = Math.max(0, Math.min(1, recoil));
    const breathing = Math.sin(time * 2.4) * 0.012;
    if (p.belt && advance > 0) { placeInstances(p.belt, travel * 0.8); placeInstances(p.rollers, -travel * 3.3); }
    if (formId === 3) {
      p.legs.forEach((leg, index) => {
        const a = stride + leg.userData.phase, lift = Math.max(0, Math.sin(a));
        leg.rotation.y = Math.cos(a) * 0.12 + leg.userData.reach;
        leg.rotation.z = -leg.userData.side * lift * 0.09;
        p.knees[index].rotation.z = leg.userData.side * lift * 0.22;
      });
      p.torso.position.y = breathing + Math.sin(stride * 2) * 0.025 * motion;
      p.torso.rotation.x = kick * 0.035;
    }
    if (p.hover) {
      p.hover.position.y = Math.sin(time * 2.8) * 0.07;
      p.hover.rotation.z = Math.sin(time * 2) * 0.025 - Math.max(-1, Math.min(1, speed * 0.06)) * 0.035;
      p.hover.rotation.x = Math.sin(time * 2.3) * 0.018 + kick * 0.035;
      p.thrusters.scale.y = 0.82 + Math.sin(time * 19) * 0.1 + motion * 0.22;
      p.rotors.forEach((rotor, i) => { rotor.rotation.y = time * (i % 2 ? -19 : 19); });
    }
    if (p.railSlide) {
      p.railSlide.position.z = kick * 0.16;
      const pulse = 1 + Math.sin(time * 8) * 0.012 + Math.max(0, Math.min(1, charge)) * 0.035;
      p.capacitors.scale.set(pulse, 1, pulse);
      p.wheels.forEach(wheel => { wheel.rotation.x = -travel * 2.4; });
    }
    if (formId === 6) {
      p.legs.forEach((leg, index) => {
        const a = stride * 0.72 + (leg.userData.side > 0 ? Math.PI : 0);
        leg.rotation.x = Math.sin(a) * 0.18;
        p.knees[index].rotation.x = Math.max(0, -Math.sin(a)) * 0.29;
      });
      p.torso.position.y = breathing + Math.abs(Math.cos(stride * 0.72)) * 0.035 * motion;
      p.torso.rotation.z = Math.sin(stride * 0.72) * 0.018 * motion;
      p.torso.rotation.x = kick * 0.055;
      p.arms.forEach(arm => { arm.rotation.x = Math.sin(stride * 0.72 + arm.userData.side * Math.PI / 2) * 0.1 * motion; });
    }
  }
  function clear() {
    group.clear();
    forms.forEach(value => value.group.traverse(part => { if (part.isInstancedMesh) part.dispose(); }));
    forms.clear(); form = null; formId = 0; travel = 0;
    barrelAnchor.set(0, 1.1, -0.2); glowAnchor.set(0, 1.6, 0.2);
  }
  return {
    group, setForm, animate, clear, dispose: clear, barrelAnchor, glowAnchor,
    get formId() { return formId; },
    get stats() { return form?.stats ?? { drawCalls: 0, triangles: 0, min: [0, 0, 0], max: [0, 0, 0] }; },
  };
}
