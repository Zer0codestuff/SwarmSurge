import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';
import { loftGeometry, sweepGeometry } from './boss-shapes.js';

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
  [1.36, -0.25, 1.86, 0.62],
  [1.24, -0.6, 2.12, 0.06],
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

export { pod, lathe };

// Hull pod lofted along Z. Sections are [z, halfWidth, halfHeight, centerY, squareness].
function pod(sections, segments = 14, steps = 0) {
  const ordered = [...sections].sort((a, b) => b[0] - a[0]);
  const geo = loftGeometry(ordered.map(([z, w, h, y, p = 0.55]) => [-z, w, h, 0, y, p]),
    { segments, steps: steps || Math.max(6, ordered.length * 2 + 2) });
  return geo.rotateX(-Math.PI / 2);
}
// Upright loft. Sections are [y, halfWidth, halfDepth, centerZ, squareness].
function upright(sections, segments = 14, steps = 0) {
  return loftGeometry(sections.map(([y, w, d, z = 0, p = 0.6]) => [y, w, d, 0, z, p]),
    { segments, steps: steps || Math.max(6, sections.length * 2 + 2) });
}
// Lathe around Y from [radius, y] pairs listed bottom to top.
function lathe(profile, sides = 14) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y)), sides);
}
// Lathe whose axis runs along X, for wheels, hubs and axles.
function axle(profile, sides = 14) { return lathe(profile, sides).rotateZ(Math.PI / 2); }
// Rounded tire: torus with its axis on X.
function tire(radius, tube, sides = 16) { return new THREE.TorusGeometry(radius, tube, 6, sides).rotateY(Math.PI / 2); }
// Curved fender or blade: an annulus sector in the YZ plane, extruded across X.
// Angles start at the front (-Z) and turn upward.
function arch(outer, inner, width, a0, a1, segments = 10) {
  const shape = new THREE.Shape();
  for (let k = 0; k <= segments; k++) {
    const a = a0 + (a1 - a0) * k / segments;
    shape[k ? 'lineTo' : 'moveTo'](Math.cos(a) * outer, Math.sin(a) * outer);
  }
  for (let k = segments; k >= 0; k--) {
    const a = a0 + (a1 - a0) * k / segments;
    shape.lineTo(Math.cos(a) * inner, Math.sin(a) * inner);
  }
  const bevel = Math.min(0.02, (outer - inner) * 0.3);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 1 });
  return geo.translate(0, 0, -width / 2 + bevel).rotateY(Math.PI / 2);
}
// Tapered limb swept through points.
function limb(points, radii, segments = 8, steps = 6) { return sweepGeometry(points, radii, { segments, steps }); }

function batch() {
  const parts = [];
  function add(g, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    let geo = g.index ? g.toNonIndexed() : g;
    if (geo !== g) g.dispose();
    geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); geo.translate(x, y, z);
    // Colors may be a function of the placed vertex. Existing loft shading is kept as a multiplier.
    const pos = geo.attributes.position, shade = geo.attributes.color, count = pos.count;
    const fixed = typeof color === 'function' ? null : new THREE.Color(color), c = new THREE.Color();
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      if (fixed) c.copy(fixed); else c.set(color(pos.getX(i), pos.getY(i), pos.getZ(i)));
      const k = shade ? shade.getX(i) : 1;
      colors[i * 3] = c.r * k; colors[i * 3 + 1] = c.g * k; colors[i * 3 + 2] = c.b * k;
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
    // One lathe runs from breech to muzzle; colors follow distance along the bore.
    const profile = [[0.001, 0], [0.16, 0], [0.185, 0.03], [0.185, 0.17], [0.195, 0.18], [0.195, 0.235], [0.175, 0.25],
      [0.2, 0.27], [0.212, 0.36], [0.21, 0.62], [0.19, 0.73], [0.17, 0.765], [0.135, 0.78], [0.135, 1.02],
      [0.17, 1.035], [0.188, 1.065], [0.188, 1.215], [0.17, 1.245], [0.116, 1.245], [0.116, 1.075], [0.001, 1.07]];
    b.add(lathe(profile, 12).rotateX(-Math.PI / 2), (x, y, z) => {
      const d = -z;
      if (d > 1.06 && Math.hypot(x, y) < 0.12) return 0x08121f;
      return d < 0.175 ? NAVY : d < 0.245 ? STEEL : d < 0.77 ? tint : d < 1.03 ? DARK : IVORY;
    });
    b.add(pod([[-0.3, 0.06, 0.018, 0.2], [-0.36, 0.085, 0.03, 0.205], [-0.62, 0.085, 0.03, 0.2], [-0.69, 0.05, 0.016, 0.19]], 10), IVORY);
    b.box(0.13, 0.06, 0.5, 0, -0.205, -0.5, NAVY);
    for (const z of [-0.86, -0.95]) b.add(new THREE.TorusGeometry(0.142, 0.018, 4, 12), STEEL, 0, 0, z);
    for (const side of [-1, 1]) {
      for (const z of [-1.11, -1.18]) b.add(new THREE.BoxGeometry(0.03, 0.05, 0.045), 0x08121f, side * 0.18, 0, z);
      for (const z of [-0.34, -0.55]) {
        b.add(new THREE.BoxGeometry(0.014, 0.085, 0.13), NAVY, side * 0.206, 0.015, z);
        b.add(new THREE.BoxGeometry(0.014, 0.026, 0.09), CYAN, side * 0.213, 0.015, z);
      }
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
    // Inner road-wheel housing, a sloped fender with a pale rib, and lamps at both ends.
    hull.add(pod([[half + 0.14, 0.2, 0.12, 0.45], [half, 0.23, 0.19, 0.43], [-half, 0.23, 0.19, 0.43], [-half - 0.14, 0.2, 0.12, 0.45]], 12), NAVY, side * x);
    hull.add(pod([[half + 0.27, 0.26, 0.035, 0.72, 0.4], [half + 0.12, 0.28, 0.08, 0.79, 0.4], [-half + 0.05, 0.28, 0.085, 0.8, 0.4],
      [-half - 0.2, 0.27, 0.07, 0.77, 0.4], [-half - 0.3, 0.24, 0.03, 0.7, 0.45]], 14), tint, side * x);
    hull.add(pod([[half + 0.08, 0.05, 0.02, 0.875], [half - 0.05, 0.06, 0.03, 0.88], [-half + 0.05, 0.06, 0.03, 0.885], [-half - 0.08, 0.05, 0.02, 0.875]], 8), IVORY, side * (x + 0.15));
    hull.add(upright([[0.7, 0.07, 0.04], [0.76, 0.08, 0.05], [0.82, 0.07, 0.04]], 10), IVORY, side * x, 0, -half - 0.24);
    hull.add(upright([[0.71, 0.06, 0.04], [0.76, 0.065, 0.05], [0.81, 0.06, 0.04]], 10), AMBER, side * x, 0, half + 0.24);
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

function cupola(b, y, z, color = STEEL) {
  b.add(lathe([[0.17, 0], [0.19, 0.03], [0.19, 0.08], [0.15, 0.11], [0.001, 0.115]], 14), color, 0, y, z);
}

function buildBulldog(root, tint) {
  const b = batch(); tracks(root, b, tint);
  // Lower hull with a sloped glacis, then a rounded deck and a cast turret.
  b.add(pod([[1.0, 0.62, 0.12, 0.66], [0.82, 0.74, 0.2, 0.68], [-0.5, 0.76, 0.21, 0.69], [-0.86, 0.66, 0.12, 0.63], [-0.98, 0.5, 0.05, 0.6]]), NAVY);
  b.add(pod([[0.95, 0.62, 0.04, 0.86], [0.78, 0.7, 0.09, 0.88], [-0.42, 0.71, 0.1, 0.89], [-0.76, 0.6, 0.06, 0.85], [-0.86, 0.45, 0.02, 0.82]]), tint);
  b.add(upright([[0.9, 0.5, 0.56, 0.14, 0.62], [1.02, 0.52, 0.6, 0.13, 0.6], [1.18, 0.46, 0.55, 0.16, 0.6], [1.3, 0.34, 0.42, 0.2, 0.62], [1.33, 0.2, 0.26, 0.22, 0.6]]), tint);
  b.add(upright([[1.24, 0.36, 0.42, 0.22], [1.3, 0.33, 0.39, 0.22], [1.335, 0.25, 0.3, 0.22]], 16), IVORY);
  cupola(b, 1.31, 0.3);
  b.add(axle([[0.001, -0.42], [0.17, -0.42], [0.2, -0.36], [0.2, 0.36], [0.17, 0.42], [0.001, 0.42]], 14), STEEL, 0, 1.1, -0.34);
  b.add(pod([[-0.84, 0.42, 0.05, 0.78], [-0.92, 0.46, 0.07, 0.76], [-1.0, 0.4, 0.04, 0.72]], 12), IVORY);
  for (const s of [-1, 1]) {
    b.add(pod([[0.42, 0.06, 0.1, 1.05], [0.3, 0.08, 0.13, 1.06], [-0.2, 0.08, 0.13, 1.06], [-0.3, 0.06, 0.09, 1.05]], 10), IVORY, s * 0.5, 0, 0.12);
    for (const k of [0, 1]) b.add(lathe([[0.05, 0], [0.055, 0.12], [0.045, 0.16], [0.03, 0.17]], 8), DARK, s * (0.5 + k * 0.07), 1.12, -0.32, 0.9);
    b.add(limb([[s * 0.42, 0.86, 0.9], [s * 0.46, 0.98, 1.0], [s * 0.46, 1.08, 1.02]], [0.06, 0.055, 0.05], 8, 6), STEEL);
    b.add(lathe([[0.065, 0], [0.075, 0.04], [0.065, 0.08], [0.04, 0.085]], 8), DARK, s * 0.46, 1.06, 1.02);
    b.add(upright([[0.95, 0.06, 0.03], [1.0, 0.08, 0.04], [1.05, 0.06, 0.03]], 8), AMBER, s * 0.55, 0.16, 0.48);
  }
  for (let k = 0; k < 4; k++) b.add(axle([[0.001, -0.17], [0.02, -0.17], [0.02, 0.17], [0.001, 0.17]], 6), NAVY, 0, 0.98, 0.56 + k * 0.1);
  chevrons(b, 0, 1.345, 0.02, 0.22);
  b.finish(root, 'hull');
  const lights = batch();
  for (const s of [-1, 1]) lights.add(upright([[0.95, 0.07, 0.02], [0.99, 0.085, 0.025], [1.03, 0.07, 0.02]], 10), CYAN, s * 0.45, 0, -0.84);
  lights.add(pod([[0.32, 0.12, 0.012, 1.35], [0.0, 0.13, 0.018, 1.35], [-0.2, 0.1, 0.012, 1.35]], 8), CYAN, 0, 0.0, 0).finish(root, 'lamps', luminous);
}

function buildSiege(root, tint) {
  const b = batch(); tracks(root, b, tint, true);
  b.add(pod([[1.2, 0.72, 0.14, 0.7], [1.0, 0.84, 0.24, 0.74], [-0.7, 0.86, 0.24, 0.75], [-1.02, 0.74, 0.14, 0.68], [-1.12, 0.6, 0.06, 0.64]]), NAVY);
  b.add(pod([[1.12, 0.7, 0.05, 0.96], [0.95, 0.78, 0.12, 0.98], [-0.6, 0.8, 0.13, 0.99], [-0.92, 0.7, 0.07, 0.95], [-1.02, 0.55, 0.02, 0.92]]), tint);
  b.add(upright([[0.98, 0.5, 0.56, 0.27, 0.62], [1.12, 0.52, 0.58, 0.26, 0.6], [1.3, 0.46, 0.52, 0.28, 0.6], [1.42, 0.34, 0.4, 0.3, 0.62], [1.45, 0.2, 0.26, 0.3, 0.6]]), tint);
  b.add(upright([[1.36, 0.36, 0.42, 0.3], [1.42, 0.33, 0.38, 0.3], [1.46, 0.24, 0.3, 0.3]], 16), IVORY);
  cupola(b, 1.43, 0.36, NAVY);
  b.add(axle([[0.001, -0.48], [0.18, -0.48], [0.22, -0.4], [0.22, 0.4], [0.18, 0.48], [0.001, 0.48]], 14), STEEL, 0, 1.1, -0.26);
  for (const s of [-1, 1]) {
    // Rounded shoulder batteries with recessed rocket tubes.
    b.add(pod([[0.8, 0.16, 0.16, 0, 0.5], [0.66, 0.22, 0.22, 0, 0.5], [-0.24, 0.22, 0.22, 0, 0.5], [-0.38, 0.19, 0.19, 0, 0.5]], 16), IVORY, s * 0.91, 1.12, 0.0);
    b.add(pod([[0.3, 0.225, 0.04, 0.2], [0.2, 0.23, 0.05, 0.21], [-0.1, 0.23, 0.05, 0.21], [-0.2, 0.225, 0.04, 0.2]], 12), tint, s * 0.91, 1.12, 0.0);
    for (let k = 0; k < 4; k++) {
      const tx = s * 0.91 + (k % 2 - 0.5) * 0.17, ty = 1.12 + (Math.floor(k / 2) - 0.5) * 0.17;
      b.add(lathe([[0.07, 0], [0.072, 0.02], [0.055, 0.025], [0.05, 0.005], [0.001, 0.0]], 10).rotateX(-Math.PI / 2), 0x0b1624, tx, ty, -0.36);
      b.add(lathe([[0.04, 0], [0.04, 0.03], [0.025, 0.06], [0.001, 0.075]], 8).rotateX(-Math.PI / 2), AMBER, tx, ty, -0.34);
    }
    b.add(lathe([[0.12, 0], [0.11, 0.42], [0.13, 0.5], [0.13, 0.6], [0.1, 0.6], [0.1, 0.52]], 12), DARK, s * 0.62, 0.86, 0.95);
    b.add(new THREE.TorusGeometry(0.115, 0.022, 5, 12).rotateX(Math.PI / 2), STEEL, s * 0.62, 1.2, 0.95);
    b.add(limb([[s * 0.62, 0.72, -0.72], [s * 0.66, 0.6, -0.98], [s * 0.7, 0.5, -1.18]], [0.07, 0.06, 0.055], 8, 6), STEEL);
    b.add(arch(0.62, 0.56, 0.08, 2.4, 3.95, 8), AMBER, s * 0.84, 0.62, -1.62);
  }
  // Curved dozer blade, concave toward the enemy.
  b.add(arch(0.6, 0.53, 1.62, 2.4, 3.95, 12), IVORY, 0, 0.62, -1.62);
  for (let k = 0; k < 5; k++) b.add(axle([[0.001, -0.19], [0.022, -0.19], [0.022, 0.19], [0.001, 0.19]], 6), DARK, 0, 1.13, 0.6 + k * 0.09);
  b.finish(root, 'hull');
  const lights = batch();
  for (const s of [-1, 1]) lights.add(upright([[0.83, 0.09, 0.02], [0.87, 0.11, 0.025], [0.91, 0.09, 0.02]], 10), CYAN, s * 0.69, 0, -0.98);
  lights.add(new THREE.TorusGeometry(0.24, 0.018, 4, 20).rotateX(Math.PI / 2), CYAN, 0, 1.465, 0.3).finish(root, 'lamps', luminous);
}

function buildSpider(root, tint) {
  const body = node(root, 'suspension');
  const b = batch();
  // Segmented abdomen, plated carapace and a low sensor head.
  b.add(pod([[0.72, 0.42, 0.14, 1.02], [0.5, 0.56, 0.22, 1.0], [-0.42, 0.54, 0.2, 1.0], [-0.66, 0.4, 0.12, 1.02]]), NAVY);
  b.add(pod([[0.78, 0.4, 0.1, 1.2], [0.58, 0.56, 0.22, 1.22], [-0.36, 0.54, 0.22, 1.22], [-0.66, 0.4, 0.14, 1.2]]), tint);
  b.add(pod([[0.64, 0.32, 0.05, 1.4], [0.46, 0.44, 0.11, 1.42], [-0.26, 0.42, 0.11, 1.42], [-0.5, 0.3, 0.05, 1.4]]), IVORY);
  b.add(pod([[0.42, 0.2, 0.03, 1.52], [0.3, 0.26, 0.06, 1.53], [-0.06, 0.24, 0.06, 1.53], [-0.18, 0.18, 0.03, 1.52]], 12), NAVY);
  b.add(pod([[-0.48, 0.36, 0.16, 1.27], [-0.68, 0.33, 0.15, 1.27], [-0.82, 0.22, 0.09, 1.27]], 14), NAVY);
  for (let k = 0; k < 3; k++) b.add(new THREE.TorusGeometry(0.5 - k * 0.04, 0.025, 5, 20).rotateX(Math.PI / 2), STEEL, 0, 1.15, 0.38 - k * 0.32);
  for (const side of [-1, 1]) {
    b.add(lathe([[0.1, 0], [0.11, 0.3], [0.09, 0.34], [0.07, 0.34]], 10), DARK, side * 0.35, 1.36, 0.55);
    b.add(lathe([[0.08, 0], [0.09, 0.04], [0.07, 0.08], [0.001, 0.09]], 10), AMBER, side * 0.35, 1.7, 0.55);
    b.add(pod([[0.5, 0.05, 0.14, 1.24], [0.3, 0.07, 0.17, 1.25], [-0.15, 0.07, 0.17, 1.25], [-0.3, 0.05, 0.12, 1.24]], 10), IVORY, side * 0.56);
  }
  chevrons(b, 0, 1.565, 0.12, 0.22); b.finish(body, 'hull');
  const lights = batch();
  for (const s of [-1, 1]) lights.add(new THREE.SphereGeometry(0.06, 10, 8), CYAN, s * 0.2, 1.31, -0.84).add(new THREE.SphereGeometry(0.04, 8, 6), CYAN, s * 0.1, 1.38, -0.81);
  lights.finish(body, 'lamps', luminous);
  for (const side of [-1, 1]) for (let row = 0; row < 3; row++) {
    const z = (row - 1) * 0.73;
    const leg = node(root, 'spider-leg', side * 0.49, 1.0, z);
    leg.userData = { side, phase: row * Math.PI * 0.67 + (side > 0 ? Math.PI : 0), reach: row === 1 ? 0 : (row - 1) * 0.16 };
    const upper = batch();
    upper.add(axle([[0.001, -0.12], [0.13, -0.12], [0.15, -0.08], [0.15, 0.08], [0.13, 0.12], [0.001, 0.12]], 12).rotateY(Math.PI / 2), STEEL);
    upper.add(limb([[side * 0.04, 0.02, 0], [side * 0.26, 0.15, 0], [side * 0.52, -0.12, 0]], [0.1, 0.11, 0.075]), NAVY);
    upper.add(limb([[side * 0.08, 0.1, 0], [side * 0.27, 0.22, 0], [side * 0.44, 0.04, 0]], [0.06, 0.1, 0.05]).scale(1, 1, 1.5), tint);
    upper.add(new THREE.SphereGeometry(0.115, 10, 6), IVORY, side * 0.52, -0.14, 0);
    // The body supplies the ground shadow. Separate limb shadows would double
    // the articulated spider's draw calls for details below the camera's scale.
    upper.finish(leg, 'upper-leg').castShadow = false;
    const knee = node(leg, 'spider-knee', side * 0.52, -0.14, 0);
    const lower = batch();
    lower.add(limb([[0, 0, 0], [side * 0.12, -0.32, 0], [side * 0.15, -0.66, 0]], [0.07, 0.06, 0.04]), STEEL);
    lower.add(limb([[side * 0.02, -0.02, 0], [side * 0.11, -0.22, 0], [side * 0.15, -0.44, 0]], [0.11, 0.12, 0.06]).scale(1, 1, 1.25), tint);
    lower.add(lathe([[0.13, 0], [0.14, 0.04], [0.1, 0.09], [0.05, 0.11], [0.001, 0.11]], 12), NAVY, side * 0.15, -0.76, -0.02);
    lower.add(pod([[0.05, 0.08, 0.025, -0.71], [-0.1, 0.09, 0.035, -0.71], [-0.17, 0.06, 0.02, -0.72]], 8), IVORY, side * 0.15);
    lower.add(new THREE.BoxGeometry(0.06, 0.12, 0.03), AMBER, side * 0.13, -0.27, -0.1);
    lower.finish(knee, 'lower-leg').castShadow = false;
  }
}

function buildHover(root, tint) {
  const hover = node(root, 'hover');
  const b = batch();
  // A teardrop hull with a raised canopy spine and four ducted lift fans.
  b.add(pod([[1.02, 0.5, 0.12, 0.86], [0.8, 0.64, 0.19, 0.86], [-0.4, 0.64, 0.19, 0.86], [-0.85, 0.46, 0.13, 0.86], [-1.02, 0.24, 0.06, 0.88]]), NAVY);
  b.add(pod([[0.98, 0.5, 0.07, 1.04], [0.76, 0.62, 0.17, 1.08], [-0.34, 0.6, 0.17, 1.08], [-0.78, 0.44, 0.12, 1.05], [-0.98, 0.22, 0.05, 1.02]]), tint);
  b.add(pod([[0.8, 0.3, 0.05, 1.28], [0.6, 0.4, 0.13, 1.3], [-0.1, 0.38, 0.13, 1.32], [-0.42, 0.26, 0.07, 1.3], [-0.52, 0.14, 0.02, 1.28]], 16), IVORY);
  b.add(pod([[0.62, 0.2, 0.03, 1.44], [0.5, 0.24, 0.07, 1.45], [0.08, 0.22, 0.07, 1.46], [-0.06, 0.15, 0.03, 1.45]], 12), NAVY);
  for (const side of [-1, 1]) {
    // Swept strut wings carry the fans; rear fins lean outward.
    b.add(pod([[0.9, 0.08, 0.05, 0.98], [0.72, 0.1, 0.07, 0.99], [-0.62, 0.1, 0.07, 0.99], [-0.8, 0.08, 0.05, 0.98]], 10), tint, side * 0.72);
    b.add(upright([[1.0, 0.1, 0.32, 0.92], [1.2, 0.08, 0.26, 0.96], [1.44, 0.05, 0.14, 1.02], [1.5, 0.03, 0.08, 1.05]], 12), IVORY, side * 0.72);
    b.add(upright([[1.42, 0.055, 0.15, 1.02], [1.5, 0.04, 0.09, 1.05], [1.54, 0.02, 0.04, 1.07]], 10), AMBER, side * 0.72);
    for (const z of [-0.65, 0.64]) {
      b.add(lathe([[0.27, 0.6], [0.33, 0.64], [0.35, 0.74], [0.34, 0.9], [0.3, 0.97], [0.27, 0.95], [0.27, 0.62]], 18), NAVY, side * 0.96, 0, z);
      b.add(new THREE.TorusGeometry(0.31, 0.03, 6, 18).rotateX(Math.PI / 2), IVORY, side * 0.96, 0.95, z);
      b.add(lathe([[0.05, 0.62], [0.11, 0.66], [0.12, 0.9], [0.08, 0.98], [0.001, 1.0]], 12), tint, side * 0.96, 0, z);
      b.add(axle([[0.001, -0.3], [0.025, -0.3], [0.025, 0.3], [0.001, 0.3]], 6), STEEL, side * 0.96, 0.8, z);
      const rotor = node(hover, 'rotor', side * 0.96, 0.935, z);
      const blades = batch();
      for (let k = 0; k < 5; k++) blades.add(pod([[0.03, 0.04, 0.012, 0], [-0.24, 0.035, 0.008, 0]], 6).rotateY(k * TAU / 5), STEEL);
      blades.add(lathe([[0.07, -0.02], [0.07, 0.02], [0.03, 0.05], [0.001, 0.055]], 10), AMBER).finish(rotor, 'fan');
    }
  }
  b.finish(hover, 'hull');
  const flames = batch();
  for (const side of [-1, 1]) for (const z of [-0.65, 0.64]) {
    flames.add(lathe([[0.001, 0.12], [0.07, 0.2], [0.15, 0.36], [0.22, 0.56]], 14), CYAN, side * 0.96, 0, z);
    flames.add(new THREE.TorusGeometry(0.23, 0.022, 4, 16).rotateX(Math.PI / 2), CYAN, side * 0.96, 0.58, z);
  }
  flames.finish(hover, 'thrusters', luminous);
  const lamps = batch();
  lamps.add(pod([[-0.9, 0.3, 0.02, 1.0], [-0.97, 0.22, 0.015, 0.98]], 10), CYAN).finish(hover, 'lamps', luminous);
}

function buildRail(root, tint) {
  const b = batch();
  b.add(pod([[1.06, 0.5, 0.12, 0.7], [0.88, 0.6, 0.2, 0.72], [-0.62, 0.6, 0.2, 0.72], [-0.9, 0.5, 0.12, 0.68], [-1.0, 0.36, 0.05, 0.66]]), NAVY);
  b.add(pod([[1.0, 0.5, 0.05, 0.92], [0.85, 0.58, 0.1, 0.93], [-0.6, 0.58, 0.1, 0.94], [-0.86, 0.48, 0.06, 0.91]]), tint);
  b.add(upright([[0.98, 0.4, 0.6, 0.22, 0.6], [1.14, 0.41, 0.6, 0.21, 0.6], [1.28, 0.34, 0.52, 0.24, 0.62], [1.32, 0.24, 0.4, 0.26, 0.6]]), IVORY);
  b.add(upright([[1.27, 0.26, 0.4, 0.28], [1.38, 0.24, 0.37, 0.28], [1.44, 0.16, 0.28, 0.28]], 14), tint);
  for (const side of [-1, 1]) {
    for (const z of [-0.69, 0.77]) {
      b.add(arch(0.47, 0.41, 0.4, 0.2, Math.PI - 0.2, 10), tint, side * 0.97, 0.38, z);
      b.add(arch(0.48, 0.465, 0.12, 0.25, Math.PI - 0.25, 10), IVORY, side * 1.12, 0.38, z);
    }
    b.add(pod([[0.75, 0.1, 0.05, 0.86], [0.6, 0.12, 0.08, 0.87], [-0.5, 0.12, 0.08, 0.87], [-0.62, 0.1, 0.05, 0.86]], 10), tint, side * 0.86);
    // Capacitor towers behind the cab.
    b.add(lathe([[0.17, 0], [0.18, 0.06], [0.13, 0.1], [0.12, 0.56], [0.17, 0.6], [0.17, 0.66], [0.1, 0.7], [0.001, 0.71]], 14), NAVY, side * 0.54, 1.2, 0.7);
    b.add(lathe([[0.08, 0], [0.09, 0.05], [0.06, 0.1], [0.001, 0.12]], 10), AMBER, side * 0.54, 1.9, 0.7);
    for (const z of [-0.69, 0.77]) {
      const wheel = node(root, 'rail-wheel', side * 0.97, 0.38, z);
      const w = batch().add(tire(0.26, 0.09), RUBBER)
        .add(axle([[0.001, -0.14], [0.2, -0.14], [0.22, -0.1], [0.22, 0.1], [0.2, 0.14], [0.001, 0.14]], 16), STEEL)
        .add(axle([[0.001, -0.16], [0.08, -0.16], [0.09, -0.15], [0.09, 0.15], [0.08, 0.16], [0.001, 0.16]], 10), tint);
      for (let k = 0; k < 5; k++) w.add(new THREE.BoxGeometry(0.29, 0.05, 0.05), IVORY, 0, 0, 0, k * TAU / 10);
      w.finish(wheel, 'wheel');
    }
  }
  b.finish(root, 'hull');
  const slide = node(root, 'rail-slide');
  const rails = batch();
  for (const side of [-1, 1]) {
    rails.add(pod([[0.32, 0.07, 0.08, 1.5], [0.2, 0.1, 0.12, 1.5], [-1.0, 0.1, 0.12, 1.5], [-1.2, 0.09, 0.1, 1.5]], 12), NAVY, side * 0.45);
    rails.add(pod([[0.28, 0.06, 0.02, 1.63], [0.16, 0.08, 0.035, 1.635], [-1.06, 0.08, 0.035, 1.635], [-1.18, 0.06, 0.02, 1.63]], 10), IVORY, side * 0.45);
    rails.add(pod([[-1.0, 0.13, 0.15, 1.52], [-1.06, 0.15, 0.17, 1.52], [-1.18, 0.15, 0.17, 1.52], [-1.24, 0.12, 0.13, 1.52]], 14), tint, side * 0.45);
    rails.add(pod([[-1.22, 0.07, 0.07, 1.52], [-1.27, 0.06, 0.06, 1.52]], 10), STEEL, side * 0.45);
    for (let k = 0; k < 4; k++) rails.add(new THREE.TorusGeometry(0.13, 0.035, 6, 14), tint, side * 0.45, 1.5, -0.8 + k * 0.27);
  }
  rails.finish(slide, 'rails');
  const coils = batch();
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) coils.add(new THREE.TorusGeometry(0.15, 0.03, 6, 16).rotateX(Math.PI / 2), CYAN, side * 0.54, 1.36 + k * 0.15, 0.7);
    coils.box(0.045, 0.08, 1.27, side * 0.337, 1.55, -0.43, CYAN);
  }
  coils.finish(root, 'capacitors', luminous);
}

function buildTitan(root, tint) {
  const torso = node(root, 'titan-torso');
  const b = batch();
  // Pelvis, barrel chest, reactor pack and a visored head.
  b.add(upright([[0.94, 0.38, 0.3, 0.14], [1.04, 0.5, 0.36, 0.14], [1.16, 0.48, 0.36, 0.14], [1.24, 0.38, 0.3, 0.14]]), NAVY);
  b.add(upright([[1.2, 0.46, 0.36, 0.12, 0.66], [1.36, 0.62, 0.44, 0.1, 0.62], [1.62, 0.68, 0.46, 0.09, 0.6], [1.84, 0.62, 0.42, 0.1, 0.62], [1.96, 0.4, 0.3, 0.12, 0.66]], 20), tint);
  b.add(upright([[1.44, 0.34, 0.08, -0.3], [1.56, 0.42, 0.1, -0.32], [1.76, 0.42, 0.1, -0.31], [1.86, 0.32, 0.07, -0.28]], 16), IVORY);
  b.add(upright([[1.3, 0.4, 0.24, 0.55], [1.5, 0.44, 0.28, 0.58], [1.86, 0.42, 0.26, 0.58], [2.0, 0.3, 0.2, 0.56]], 16), NAVY);
  for (let k = 0; k < 3; k++) b.add(pod([[0.9, 0.3, 0.012, 1.48 + k * 0.1], [0.84, 0.34, 0.018, 1.48 + k * 0.1]], 8), DARK);
  b.add(upright([[1.92, 0.15, 0.15, 0.1], [2.04, 0.13, 0.13, 0.1]], 12), NAVY);
  b.add(upright([[2.02, 0.2, 0.2, 0.1, 0.7], [2.12, 0.26, 0.25, 0.08, 0.65], [2.3, 0.25, 0.24, 0.09, 0.65], [2.4, 0.17, 0.17, 0.1, 0.7]], 16), IVORY);
  b.add(pod([[0.32, 0.05, 0.02, 2.41], [0.22, 0.06, 0.07, 2.42], [-0.06, 0.06, 0.07, 2.43], [-0.14, 0.04, 0.03, 2.4]], 10), tint);
  b.add(pod([[0.0, 0.2, 0.06, 2.22], [-0.08, 0.22, 0.07, 2.22], [-0.16, 0.19, 0.05, 2.22]], 12), NAVY);
  for (const side of [-1, 1]) {
    // Domed pauldrons with a tinted rim.
    b.add(lathe([[0.2, -0.12], [0.26, 0], [0.27, 0.06], [0.24, 0.17], [0.15, 0.26], [0.001, 0.3]], 14).scale(1, 1, 1.12), IVORY, side * 0.8, 1.74, 0.11);
    b.add(new THREE.TorusGeometry(0.265, 0.035, 5, 16).rotateX(Math.PI / 2).scale(1, 1, 1.12), tint, side * 0.8, 1.76, 0.11);
    b.add(lathe([[0.13, 0], [0.12, 0.34], [0.145, 0.38], [0.145, 0.44], [0.11, 0.44], [0.11, 0.4]], 12), DARK, side * 0.24, 1.66, 0.62);
  }
  b.finish(torso, 'hull');
  for (const side of [-1, 1]) {
    const arm = node(torso, 'titan-arm', side * 0.79, 1.63, 0.1);
    arm.userData.side = side;
    batch().add(new THREE.SphereGeometry(0.17, 12, 8), STEEL)
      .add(limb([[0, -0.05, 0], [side * 0.08, -0.22, -0.03], [side * 0.15, -0.36, -0.06]], [0.11, 0.1, 0.1]), STEEL)
      .add(upright([[-0.68, 0.16, 0.22, -0.06], [-0.56, 0.2, 0.3, -0.07], [-0.3, 0.2, 0.3, -0.07], [-0.16, 0.16, 0.24, -0.06]], 16), tint, side * 0.15)
      .add(new THREE.SphereGeometry(0.15, 12, 8).scale(1, 0.85, 1.1), NAVY, side * 0.15, -0.72, -0.08)
      .add(pod([[-0.2, 0.12, 0.08, 0], [-0.32, 0.13, 0.09, 0]], 10).rotateX(0), IVORY, side * 0.15, -0.42, -0.24)
      .add(new THREE.SphereGeometry(0.04, 8, 6), AMBER, side * 0.15, -0.42, -0.4)
      .finish(arm, 'arm');
  }
  const lights = batch();
  lights.add(pod([[-0.13, 0.17, 0.03, 2.22], [-0.17, 0.18, 0.035, 2.22], [-0.2, 0.15, 0.025, 2.22]], 10), CYAN);
  lights.add(new THREE.TorusGeometry(0.13, 0.03, 6, 16), CYAN, 0, 1.66, -0.42);
  lights.finish(torso, 'lamps', luminous);
  for (const side of [-1, 1]) {
    const hip = node(root, 'titan-leg', side * 0.38, 0.99, 0.15);
    hip.userData.side = side;
    batch().add(axle([[0.001, -0.14], [0.14, -0.14], [0.16, -0.1], [0.16, 0.1], [0.14, 0.14], [0.001, 0.14]], 12), STEEL)
      .add(upright([[-0.38, 0.15, 0.17, 0.0], [-0.26, 0.2, 0.22, 0.02], [-0.06, 0.2, 0.22, 0.02], [0.04, 0.15, 0.17, 0.0]], 14), tint)
      .add(axle([[0.001, -0.17], [0.12, -0.17], [0.13, -0.13], [0.13, 0.13], [0.12, 0.17], [0.001, 0.17]], 12), NAVY, 0, -0.39, 0).finish(hip, 'thigh');
    const knee = node(hip, 'titan-knee', 0, -0.39, 0);
    batch().add(new THREE.SphereGeometry(0.13, 12, 8).scale(1.1, 1, 1), IVORY, 0, 0.0, -0.1)
      .add(upright([[-0.4, 0.15, 0.17, -0.06], [-0.3, 0.2, 0.22, -0.07], [-0.1, 0.19, 0.2, -0.05], [0.0, 0.14, 0.15, -0.03]], 14), tint)
      .add(pod([[0.22, 0.2, 0.06, -0.48], [0.1, 0.24, 0.1, -0.47], [-0.32, 0.24, 0.1, -0.47], [-0.56, 0.2, 0.06, -0.5]], 14), NAVY)
      .add(pod([[0.0, 0.18, 0.03, -0.38], [-0.12, 0.2, 0.05, -0.38], [-0.4, 0.18, 0.04, -0.39], [-0.48, 0.14, 0.02, -0.4]], 12), IVORY)
      .add(new THREE.BoxGeometry(0.22, 0.04, 0.06), AMBER, 0, -0.44, -0.55).finish(knee, 'shin');
  }
}

const ROSE = 0xff8df0;
// Prism lancer: an arrowhead skiff whose wing yokes carry a hoop around the guns. Three crystals
// orbit inside the hoop and focus the lance.
function buildLancer(root, tint) {
  const hover = node(root, 'hover');
  const b = batch();
  b.add(pod([[1.0, 0.3, 0.06, 0.84], [0.8, 0.56, 0.14, 0.84], [0.25, 0.7, 0.17, 0.85], [-0.5, 0.46, 0.15, 0.85], [-1.05, 0.2, 0.09, 0.86], [-1.4, 0.04, 0.03, 0.87]], 16), NAVY);
  b.add(pod([[0.92, 0.28, 0.05, 1.0], [0.7, 0.5, 0.12, 1.02], [0.2, 0.6, 0.13, 1.03], [-0.5, 0.38, 0.12, 1.01], [-1.0, 0.16, 0.07, 0.99], [-1.32, 0.03, 0.02, 0.97]], 16), tint);
  b.add(pod([[0.82, 0.18, 0.04, 1.14], [0.6, 0.28, 0.1, 1.16], [0.1, 0.27, 0.1, 1.17], [-0.12, 0.16, 0.05, 1.14]], 14), IVORY);
  b.add(pod([[0.5, 0.17, 0.03, 1.27], [0.3, 0.2, 0.05, 1.28], [0.05, 0.16, 0.03, 1.26]], 12), NAVY);
  b.add(pod([[-0.6, 0.05, 0.03, 1.11], [-0.9, 0.06, 0.04, 1.08], [-1.2, 0.03, 0.02, 1.03]], 8), IVORY);
  b.add(axle([[0.001, -0.5], [0.15, -0.5], [0.19, -0.42], [0.19, 0.42], [0.15, 0.5], [0.001, 0.5]], 14), STEEL, 0, 1.36, -0.32);
  // Rear mast under the charge orb.
  b.add(lathe([[0.2, 1.1], [0.16, 1.2], [0.1, 1.3], [0.085, 1.56], [0.12, 1.62], [0.001, 1.64]], 12), tint, 0, 0, 0.62);
  for (const side of [-1, 1]) {
    // Swept wings with pale tips, then fins that lean outward.
    b.add(pod([[0.9, 0.3, 0.03, 0.95, 0.4], [0.3, 0.44, 0.05, 0.96, 0.4], [-0.3, 0.22, 0.035, 0.96, 0.4], [-0.62, 0.05, 0.015, 0.96, 0.4]], 12), tint, side * 0.82);
    b.add(pod([[0.94, 0.08, 0.03, 0.97], [0.4, 0.1, 0.045, 0.98], [-0.1, 0.05, 0.03, 0.98]], 8), IVORY, side * 1.2);
    b.add(upright([[1.0, 0.05, 0.32, 0.7], [1.3, 0.04, 0.24, 0.78], [1.62, 0.02, 0.09, 0.9]], 10), IVORY, side * 0.52);
    b.add(upright([[1.58, 0.03, 0.1, 0.9], [1.68, 0.02, 0.05, 0.94], [1.72, 0.008, 0.02, 0.96]], 8), AMBER, side * 0.52);
    // Yoke from the wing root to the hoop.
    b.add(limb([[side * 0.8, 0.98, -0.1], [side * 0.98, 1.1, -0.55], [side * 1.0, 1.36, -0.95]], [0.07, 0.06, 0.055], 8, 8), STEEL);
    b.add(new THREE.SphereGeometry(0.085, 10, 8), tint, side * 1.0, 1.36, -0.95);
    // Lift pods under the wings and one under the prow.
    b.add(lathe([[0.1, 0.62], [0.2, 0.68], [0.22, 0.8], [0.16, 0.9], [0.001, 0.92]], 14), NAVY, side * 0.62, 0, 0.45);
  }
  b.add(lathe([[0.08, 0.66], [0.16, 0.7], [0.18, 0.8], [0.12, 0.88], [0.001, 0.9]], 14), NAVY, 0, 0, -0.75);
  b.add(new THREE.TorusGeometry(1.0, 0.04, 6, 40), STEEL, 0, 1.36, -0.95);
  for (let k = 0; k < 6; k++) {
    const a = k * TAU / 6 + TAU / 12;
    b.add(new THREE.BoxGeometry(0.1, 0.12, 0.1), IVORY, Math.cos(a) * 1.0, 1.36 + Math.sin(a) * 1.0, -0.95, 0, 0, a);
  }
  b.finish(hover, 'hull');
  const ring = node(hover, 'prism-ring', 0, 1.36, -0.95);
  const crystals = batch();
  for (let k = 0; k < 3; k++) {
    const a = k * TAU / 3 + Math.PI / 2, x = Math.cos(a) * 0.82, y = Math.sin(a) * 0.82;
    crystals.add(new THREE.OctahedronGeometry(0.13, 0).scale(1, 1, 2.3), k === 0 ? CYAN : k === 1 ? ROSE : AMBER, x, y, 0, 0, 0, a);
    crystals.add(new THREE.OctahedronGeometry(0.06, 0).scale(1, 1, 1.6), IVORY, x * 0.86, y * 0.86, 0.02);
  }
  crystals.add(new THREE.TorusGeometry(0.82, 0.016, 4, 36), CYAN).finish(ring, 'crystals', luminous);
  const flames = batch();
  for (const [x, z, r] of [[-0.62, 0.45, 0.2], [0.62, 0.45, 0.2], [0, -0.75, 0.16]]) {
    flames.add(lathe([[0.001, 0.2], [r * 0.4, 0.3], [r * 0.75, 0.46], [r, 0.62]], 14), CYAN, x, 0, z);
    flames.add(new THREE.TorusGeometry(r + 0.01, 0.02, 4, 16).rotateX(Math.PI / 2), CYAN, x, 0.64, z);
  }
  flames.finish(hover, 'thrusters', luminous);
  const lamps = batch();
  for (const side of [-1, 1]) lamps.add(pod([[0.86, 0.02, 0.012, 0.99], [0.3, 0.025, 0.014, 1.0], [-0.26, 0.02, 0.012, 0.99]], 6), CYAN, side * 1.27);
  lamps.add(pod([[-1.2, 0.05, 0.02, 0.95], [-1.42, 0.02, 0.012, 0.93]], 8), ROSE);
  lamps.add(pod([[0.45, 0.14, 0.012, 1.325], [0.12, 0.12, 0.012, 1.3]], 8), CYAN).finish(hover, 'lamps', luminous);
}

// Dreadnought: a long tracked hull with a ram bow, a stepped citadel, two rotary sponson guns,
// a rear mortar battery and a turning radar dish.
function buildDread(root, tint) {
  const b = batch(); tracks(root, b, tint, true);
  b.add(pod([[1.3, 0.74, 0.16, 0.72], [1.08, 0.88, 0.27, 0.76], [-0.8, 0.9, 0.27, 0.77], [-1.14, 0.78, 0.17, 0.7], [-1.28, 0.6, 0.07, 0.65]]), NAVY);
  b.add(pod([[1.2, 0.72, 0.05, 1.0], [1.0, 0.82, 0.12, 1.02], [-0.7, 0.84, 0.13, 1.03], [-1.04, 0.72, 0.07, 0.99], [-1.16, 0.56, 0.02, 0.95]]), tint);
  b.add(pod([[-1.1, 0.56, 0.16, 0.62, 0.45], [-1.3, 0.36, 0.14, 0.6, 0.45], [-1.52, 0.03, 0.07, 0.58, 0.45]], 14), IVORY);
  b.add(pod([[-1.16, 0.5, 0.02, 0.8], [-1.34, 0.3, 0.018, 0.76], [-1.5, 0.04, 0.015, 0.68]], 10), STEEL);
  // Citadel in two tiers, with a visor slot cut by a dark band.
  b.add(upright([[1.02, 0.6, 0.7, 0.12, 0.7], [1.2, 0.62, 0.72, 0.12, 0.68], [1.42, 0.56, 0.64, 0.14, 0.68], [1.5, 0.46, 0.52, 0.16, 0.7]], 18), tint);
  b.add(upright([[1.46, 0.4, 0.44, 0.24, 0.7], [1.62, 0.42, 0.46, 0.24, 0.68], [1.8, 0.36, 0.4, 0.26, 0.68], [1.86, 0.26, 0.3, 0.28, 0.7]], 18), IVORY);
  b.add(upright([[1.84, 0.28, 0.32, 0.28], [1.9, 0.26, 0.3, 0.28], [1.93, 0.18, 0.2, 0.28]], 14), tint);
  b.add(axle([[0.001, -0.56], [0.19, -0.56], [0.23, -0.47], [0.23, 0.47], [0.19, 0.56], [0.001, 0.56]], 14), STEEL, 0, 1.24, -0.62);
  for (const side of [-1, 1]) {
    // Sponson housings and their mounting collars.
    b.add(pod([[0.5, 0.15, 0.13, 1.2], [0.3, 0.2, 0.18, 1.2], [-0.3, 0.2, 0.18, 1.2], [-0.48, 0.15, 0.13, 1.2]], 12), tint, side * 0.98);
    b.add(new THREE.TorusGeometry(0.16, 0.035, 6, 16), IVORY, side * 0.98, 1.2, -0.46);
    b.add(pod([[0.4, 0.06, 0.02, 1.4], [0.2, 0.08, 0.03, 1.4], [-0.2, 0.08, 0.03, 1.4], [-0.36, 0.06, 0.02, 1.4]], 8), IVORY, side * 0.98);
    // Exhaust stacks behind the bridge.
    b.add(lathe([[0.08, 0], [0.085, 0.3], [0.1, 0.34], [0.1, 0.42], [0.07, 0.42], [0.07, 0.3]], 10), DARK, side * 0.44, 1.48, 0.68, 0.18);
    b.add(new THREE.TorusGeometry(0.095, 0.02, 4, 12).rotateX(Math.PI / 2), AMBER, side * 0.44, 1.86, 0.75);
    for (const k of [0, 1]) {
      // Mortar battery on the rear deck, raised toward the front.
      const x = side * (0.17 + k * 0.32);
      b.add(lathe([[0.1, 0], [0.115, 0.04], [0.11, 0.5], [0.125, 0.52], [0.125, 0.58], [0.085, 0.58], [0.085, 0.06]], 12), DARK, x, 1.02, 1.08, -0.5);
      b.add(new THREE.TorusGeometry(0.118, 0.022, 4, 12).rotateX(Math.PI / 2 - 0.5), IVORY, x, 1.02 + Math.cos(0.5) * 0.55, 1.08 - Math.sin(0.5) * 0.55);
    }
    b.add(upright([[0.98, 0.07, 0.03], [1.04, 0.09, 0.04], [1.1, 0.07, 0.03]], 8), AMBER, side * 0.62, 0, 1.2);
  }
  b.add(pod([[1.3, 0.56, 0.06, 1.06], [1.18, 0.6, 0.09, 1.07], [0.92, 0.6, 0.09, 1.07], [0.86, 0.56, 0.06, 1.06]], 12), NAVY);
  b.add(lathe([[0.06, 0], [0.045, 0.1], [0.04, 0.5], [0.06, 0.53], [0.001, 0.54]], 8), STEEL, 0, 1.84, 0.62);
  chevrons(b, 0, 1.515, -0.3, 0.24);
  b.finish(root, 'hull');
  for (const side of [-1, 1]) {
    const gun = node(root, 'gatling', side * 0.98, 1.2, -0.5);
    gun.userData.side = side;
    const g = batch();
    for (let k = 0; k < 6; k++) {
      const a = k * TAU / 6;
      g.add(new THREE.CylinderGeometry(0.028, 0.028, 0.62, 6).rotateX(Math.PI / 2), DARK, Math.cos(a) * 0.085, Math.sin(a) * 0.085, -0.31);
    }
    g.add(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12).rotateX(Math.PI / 2), STEEL, 0, 0, -0.2)
      .add(new THREE.CylinderGeometry(0.125, 0.125, 0.05, 12).rotateX(Math.PI / 2), IVORY, 0, 0, -0.56)
      .add(new THREE.CylinderGeometry(0.05, 0.05, 0.66, 8).rotateX(Math.PI / 2), tint, 0, 0, -0.3).finish(gun, 'barrels');
  }
  const radar = node(root, 'radar', 0, 2.36, 0.62);
  batch().add(lathe([[0.001, 0], [0.12, 0.02], [0.24, 0.08], [0.32, 0.18], [0.3, 0.19], [0.22, 0.1], [0.11, 0.045], [0.001, 0.03]], 16).rotateX(-1.1), IVORY, 0, 0.1, 0)
    .add(limb([[0, 0.1, 0], [0, 0.2, -0.16], [0, 0.26, -0.3]], [0.018, 0.015, 0.012], 5, 3), STEEL)
    .add(new THREE.SphereGeometry(0.04, 8, 6), AMBER, 0, 0.26, -0.3).finish(radar, 'dish');
  const lights = batch();
  lights.add(pod([[0.02, 0.33, 0.035, 1.68], [-0.04, 0.35, 0.04, 1.68], [-0.1, 0.3, 0.03, 1.68]], 12), CYAN, 0, 0, -0.14);
  for (const side of [-1, 1]) {
    lights.add(upright([[0.84, 0.08, 0.02], [0.89, 0.1, 0.025], [0.94, 0.08, 0.02]], 10), CYAN, side * 0.55, 0, -1.14);
    for (const k of [0, 1]) lights.add(new THREE.SphereGeometry(0.06, 8, 6), AMBER, side * (0.17 + k * 0.32), 1.02 + Math.cos(0.5) * 0.6, 1.08 - Math.sin(0.5) * 0.6);
  }
  lights.finish(root, 'lamps', luminous);
}

const RED = 0xe8333a, CHASSIS = 0x2b2f3a;
const carriageGeometries = new Map();
/** Starting field-cannon carriage. Wheels are separate meshes that spin on X. */
export function buildCarriage(tint = 0x2f8bff) {
  if (!carriageGeometries.has(tint)) {
    const c = batch();
    c.add(pod([[0.92, 0.5, 0.1, 0.42], [0.72, 0.64, 0.18, 0.44], [-0.55, 0.64, 0.18, 0.44], [-0.84, 0.54, 0.12, 0.42], [-0.92, 0.4, 0.05, 0.4]]), CHASSIS);
    c.add(pod([[0.86, 0.6, 0.03, 0.6], [0.7, 0.72, 0.06, 0.61], [-0.6, 0.72, 0.06, 0.61], [-0.82, 0.62, 0.03, 0.6]], 18), RED);
    for (const x of [-0.82, 0.82]) for (const z of [-0.55, 0.55]) {
      c.add(arch(0.44, 0.405, 0.3, 0.35, Math.PI - 0.35, 10), RED, x, 0.33, z);
    }
    // Rounded mortar housing; the transparent dome closes its top.
    c.add(upright([[0.6, 0.5, 0.52, 0.12, 0.85], [0.78, 0.64, 0.68, 0.1, 0.85], [1.08, 0.66, 0.7, 0.08, 0.9], [1.36, 0.56, 0.6, 0.12, 0.85], [1.52, 0.44, 0.46, 0.18, 0.85], [1.56, 0.42, 0.44, 0.19, 0.85]], 24), tint);
    c.add(new THREE.TorusGeometry(0.66, 0.035, 6, 28).rotateX(Math.PI / 2).scale(1, 1, 1.06), RED, 0, 0.84, 0.1);
    c.add(new THREE.TorusGeometry(0.44, 0.035, 6, 24).rotateX(Math.PI / 2), STEEL, 0, 1.54, 0.19);
    c.add(axle([[0.001, -0.36], [0.17, -0.36], [0.21, -0.3], [0.21, 0.3], [0.17, 0.36], [0.001, 0.36]], 16), STEEL, 0, 1.1, -0.42);
    for (const side of [-1, 1]) {
      c.add(pod([[0.42, 0.04, 0.1, 1.0], [0.25, 0.05, 0.12, 1.02], [-0.15, 0.05, 0.12, 1.02], [-0.28, 0.04, 0.08, 1.0]], 10), IVORY, side * 0.64, 0, 0.12);
      c.add(axle([[0.001, -0.9], [0.05, -0.9], [0.05, 0.9], [0.001, 0.9]], 8), STEEL, 0, 0.33, side * 0.55);
    }
    carriageGeometries.set(tint, {
      body: c.geometry(),
      wheel: batch().add(tire(0.24, 0.1), RUBBER)
        .add(axle([[0.001, -0.15], [0.17, -0.15], [0.19, -0.11], [0.19, 0.11], [0.17, 0.15], [0.001, 0.15]], 16), RED)
        .add(axle([[0.001, -0.17], [0.06, -0.17], [0.07, -0.16], [0.07, 0.16], [0.06, 0.17], [0.001, 0.17]], 10), STEEL)
        .add(new THREE.BoxGeometry(0.32, 0.045, 0.3), CHASSIS).add(new THREE.BoxGeometry(0.32, 0.3, 0.045), CHASSIS).geometry(),
    });
  }
  const shared = carriageGeometries.get(tint);
  const group = new THREE.Group(); group.name = 'carriage';
  const body = new THREE.Mesh(shared.body, surface); body.castShadow = body.receiveShadow = true; group.add(body);
  const wheels = [];
  for (const x of [-0.82, 0.82]) for (const z of [-0.55, 0.55]) {
    const wheel = new THREE.Mesh(shared.wheel, surface); wheel.position.set(x, 0.33, z); wheel.castShadow = true;
    group.add(wheel); wheels.push(wheel);
  }
  return { group, body, wheels };
}

let socketGeometry = null;
/** Pedestal under the charge orb; placed 0.18 below the orb center. */
export function orbSocketGeometry() {
  if (!socketGeometry) {
    socketGeometry = batch().add(lathe([[0.06, -0.26], [0.07, -0.1], [0.13, -0.06], [0.2, 0.0], [0.17, 0.02], [0.1, -0.03], [0.001, -0.03]], 16), STEEL)
      .add(new THREE.TorusGeometry(0.19, 0.025, 5, 16).rotateX(Math.PI / 2), NAVY, 0, 0.0, 0).geometry();
  }
  return socketGeometry;
}

const builders = [null, buildBulldog, buildSiege, buildSpider, buildHover, buildRail, buildTitan, buildLancer, buildDread];

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
  const parts = { legs: [], knees: [], arms: [], rotors: [], wheels: [], gatlings: [] };
  group.traverse(part => {
    if (part.name === 'belt') parts.belt = part;
    if (part.name === 'rollers') parts.rollers = part;
    if (part.name === 'spider-leg' || part.name === 'titan-leg') parts.legs.push(part);
    if (part.name === 'spider-knee' || part.name === 'titan-knee') parts.knees.push(part);
    if (part.name === 'titan-arm') parts.arms.push(part);
    if (part.name === 'rotor') parts.rotors.push(part);
    if (part.name === 'rail-wheel') parts.wheels.push(part);
    if (part.name === 'hover') parts.hover = part;
    if (part.name === 'prism-ring') parts.prisms = part;
    if (part.name === 'gatling') parts.gatlings.push(part);
    if (part.name === 'radar') parts.radar = part;
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
    const id = Math.max(0, Math.min(builders.length - 1, Math.trunc(Number(requested) || 0)));
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
    if (p.prisms) {
      // The crystals spin up as the charge builds and flare on every volley.
      p.prisms.rotation.z = time * (1.4 + Math.max(0, Math.min(1, charge)) * 2.2);
      p.prisms.scale.setScalar(1 + kick * 0.07);
    }
    p.gatlings.forEach(gun => { gun.rotation.z = gun.userData.side * time * (5 + kick * 14); gun.position.z = -0.5 + kick * 0.05; });
    if (p.radar) p.radar.rotation.y = time * 1.3;
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
