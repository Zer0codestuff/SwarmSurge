import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';

const IVORY = 0xeaf5fa, NAVY = 0x142b49, BLUE = 0x2f8bff;
const STEEL = 0x7597b1, CYAN = 0x65f4ff, GOLD = 0xffbc50;
const templates = new Map();
const surface = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.47, metalness: 0.18 });
const light = new THREE.MeshBasicMaterial({ vertexColors: true });
surface.userData.shared = light.userData.shared = true;

function batch() {
  const parts = [];
  function add(source, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const g = source.index ? source.toNonIndexed() : source;
    if (g !== source) source.dispose();
    g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z);
    const c = new THREE.Color(color), colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(key)) g.deleteAttribute(key);
    parts.push(g);
    return api;
  }
  const api = {
    add,
    profile(points, thickness, x, y, z, color, rotation = 0, bevel = 0.025) {
      const shape = new THREE.Shape();
      points.forEach(([px, pz], i) => { if (i) shape.lineTo(px, pz); else shape.moveTo(px, pz); });
      shape.closePath();
      const b = Math.min(bevel, thickness * 0.25);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: thickness - b * 2, steps: 1, bevelEnabled: true,
        bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1,
      });
      geometry.rotateX(Math.PI / 2); geometry.translate(0, thickness / 2 - b, 0);
      return add(geometry, color, x, y, z, 0, 0, rotation);
    },
    box(w, h, d, x, y, z, color) {
      const bevel = Math.min(0.03, w * 0.12, d * 0.12);
      return api.profile([
        [-w / 2 + bevel, -d / 2], [w / 2 - bevel, -d / 2],
        [w / 2, -d / 2 + bevel], [w / 2, d / 2 - bevel],
        [w / 2 - bevel, d / 2], [-w / 2 + bevel, d / 2],
        [-w / 2, d / 2 - bevel], [-w / 2, -d / 2 + bevel],
      ], h, x, y, z, color, 0, Math.min(bevel, h * 0.22));
    },
    cylinder(radius, length, x, y, z, color, sides = 10) {
      return add(new THREE.CylinderGeometry(radius, radius, length, sides), color, x, y, z, Math.PI / 2);
    },
    finish(parent, name, material = surface) {
      const geometry = mergeGeometries(parts, false);
      parts.forEach(part => part.dispose());
      geometry.computeBoundingBox(); geometry.computeBoundingSphere(); geometry.userData.shared = true;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name; mesh.castShadow = material === surface; mesh.receiveShadow = material === surface;
      parent.add(mesh);
      return mesh;
    },
  };
  return api;
}

function mirrored(points, side) { return points.map(([x, z]) => [x * side, z]); }

function cockpit(body, y, z, wide = false) {
  const w = wide ? 0.22 : 0.15, length = wide ? 0.57 : 0.67;
  body.profile([[0, -length / 2], [w, -0.12], [w * 0.84, length / 2], [-w * 0.84, length / 2], [-w, -0.12]],
    0.13, 0, y, z, NAVY, 0, 0.019);
  body.profile([[0, -length * 0.36], [w * 0.66, -0.1], [w * 0.55, 0.12], [-w * 0.55, 0.12], [-w * 0.66, -0.1]],
    0.018, 0, y + 0.074, z, CYAN, 0, 0.004);
}

function enginePods(body, width, y, rear, radius = 0.12) {
  for (const side of [-1, 1]) {
    body.cylinder(radius, 0.62, side * width, y, rear - 0.31, NAVY);
    body.cylinder(radius * 1.12, 0.08, side * width, y, rear - 0.04, STEEL);
    body.cylinder(radius * 0.83, 0.015, side * width, y, rear + 0.006, GOLD);
  }
}

function scout(body, lamps) {
  body.profile([[0, -1.41], [0.16, -0.78], [0.2, 0.55], [0.12, 1.0], [-0.12, 1.0], [-0.2, 0.55], [-0.16, -0.78]],
    0.22, 0, 0.015, 0, IVORY);
  const wing = [[0.11, -0.31], [1.39, 0.4], [1.25, 0.69], [0.12, 0.48]];
  const panel = [[0.22, -0.12], [1.24, 0.43], [1.13, 0.55], [0.24, 0.35]];
  for (const side of [-1, 1]) {
    body.profile(mirrored(wing, side), 0.09, 0, -0.02, 0, BLUE);
    body.profile(mirrored(panel, side), 0.025, 0, 0.047, 0, IVORY, 0, 0.006);
    body.profile([[0, -0.2], [0.32, 0.03], [0.28, 0.3], [0, 0.24]],
      0.065, side * 0.29, 0.12, 0.67, BLUE, Math.PI / 2 - side * 0.12, 0.015);
    body.profile(mirrored([[0.16, 0.68], [0.67, 0.92], [0.6, 1.05], [0.14, 0.94]], side), 0.055, 0, 0.08, 0, IVORY, 0, 0.012);
    lamps.box(0.13, 0.035, 0.12, side * 1.26, 0.054, 0.48, side < 0 ? CYAN : GOLD);
  }
  body.profile([[0, -1.2], [0.065, -0.85], [0.06, -0.65], [-0.06, -0.65], [-0.065, -0.85]], 0.022, 0, 0.14, 0, BLUE, 0, 0.004);
  cockpit(body, 0.16, -0.39);
  enginePods(body, 0.24, -0.035, 1.07, 0.105);
  return { engineX: 0.24, engineY: -0.035, engineZ: 1.09, flameRadius: 0.074, flameLength: 0.27, flameHeight: 0.8 };
}

function strike(body, lamps) {
  body.profile([[0, -1.43], [0.18, -0.82], [0.33, -0.18], [0.37, 0.7], [0.22, 1.04], [-0.22, 1.04], [-0.37, 0.7], [-0.33, -0.18], [-0.18, -0.82]],
    0.23, 0, 0.025, 0, IVORY);
  const wing = [[0.22, -0.55], [1.58, 0.2], [1.62, 0.62], [0.85, 0.57], [0.27, 0.77]];
  const panel = [[0.35, -0.32], [1.4, 0.25], [1.42, 0.42], [0.76, 0.38], [0.35, 0.55]];
  for (const side of [-1, 1]) {
    body.profile(mirrored(wing, side), 0.1, 0, -0.035, 0, BLUE);
    body.profile(mirrored(panel, side), 0.025, 0, 0.04, 0, IVORY, 0, 0.006);
    body.profile(mirrored([[0.23, 0.65], [0.93, 0.93], [0.86, 1.15], [0.23, 1.0]], side), 0.065, 0, 0.07, 0, BLUE, 0, 0.014);
    body.profile([[0, -0.2], [0.4, 0.02], [0.34, 0.35], [0, 0.26]],
      0.075, side * 0.36, 0.14, 0.68, IVORY, Math.PI / 2 - side * 0.18, 0.015);
    body.profile([[0.12, 0.06], [0.31, 0.06], [0.27, 0.21], [0.1, 0.21]],
      0.08, side * 0.36, 0.14, 0.68, BLUE, Math.PI / 2 - side * 0.18, 0.009);
    // Two wing pylons make the strike jet readable from the game's high camera.
    body.box(0.1, 0.15, 0.28, side * 1.04, -0.12, 0.33, NAVY);
    body.cylinder(0.078, 0.48, side * 1.04, -0.2, 0.35, IVORY, 8);
    body.add(new THREE.ConeGeometry(0.08, 0.18, 8), GOLD, side * 1.04, -0.2, 0.02, -Math.PI / 2);
    body.box(0.13, 0.035, 0.08, side * 1.04, -0.2, 0.57, BLUE);
    lamps.box(0.14, 0.035, 0.15, side * 1.48, 0.047, 0.39, side < 0 ? CYAN : GOLD);
  }
  cockpit(body, 0.18, -0.49, true);
  body.profile([[0.12, 0.24], [0.24, 0.45], [-0.24, 0.45], [-0.12, 0.24]], 0.025, 0, 0.17, 0, BLUE, 0, 0.006);
  enginePods(body, 0.29, -0.045, 1.08, 0.125);
  return { engineX: 0.29, engineY: -0.045, engineZ: 1.1, flameRadius: 0.09, flameLength: 0.32, flameHeight: 0.8 };
}

function bomber(body, lamps) {
  body.profile([[0, -1.36], [0.4, -0.69], [1.71, 0.49], [1.56, 0.89], [0.77, 0.72], [0.56, 1.0], [0.2, 0.86], [0, 1.02],
    [-0.2, 0.86], [-0.56, 1.0], [-0.77, 0.72], [-1.56, 0.89], [-1.71, 0.49], [-0.4, -0.69]], 0.16, 0, 0, 0, NAVY);
  const panel = [[0.23, -0.65], [1.54, 0.49], [1.42, 0.67], [0.68, 0.5], [0.26, 0.67]];
  for (const side of [-1, 1]) {
    body.profile(mirrored(panel, side), 0.035, 0, 0.106, 0, IVORY, 0, 0.008);
    body.profile(mirrored([[0.42, -0.55], [1.54, 0.46], [1.44, 0.46], [0.3, -0.57]], side), 0.022, 0, 0.135, 0, BLUE, 0, 0.005);
    body.box(0.32, 0.13, 0.42, side * 0.39, 0.11, 0.64, BLUE);
    body.box(0.3, 0.1, 0.1, side * 0.39, 0.045, 0.89, STEEL);
    body.box(0.25, 0.067, 0.11, side * 0.39, 0.043, 0.94, NAVY);
    for (let k = 0; k < 3; k++) body.add(new THREE.BoxGeometry(0.21, 0.018, 0.035), NAVY, side * 0.39, 0.188, 0.55 + k * 0.09);
    lamps.box(0.12, 0.025, 0.14, side * 1.53, 0.112, 0.59, side < 0 ? CYAN : GOLD);
    lamps.box(0.16, 0.02, 0.045, side * 0.39, 0.198, 0.76, CYAN);
  }
  body.profile([[0, -1.28], [0.25, -0.69], [0.22, 0.49], [0, 0.86], [-0.22, 0.49], [-0.25, -0.69]],
    0.19, 0, 0.1, 0, BLUE);
  cockpit(body, 0.24, -0.5, true);
  return { engineX: 0.39, engineY: 0.043, engineZ: 1.0, flameRadius: 0.13, flameLength: 0.32, flameHeight: 0.34 };
}

const builders = [null, scout, strike, bomber];

function aircraftTemplate(tier) {
  if (!templates.has(tier)) {
    const group = new THREE.Group(); group.name = `support-aircraft-${tier}`;
    const body = batch(), lamps = batch();
    const config = builders[tier](body, lamps);
    body.finish(group, 'airframe'); lamps.finish(group, 'navigation-lights', light);
    const flame = batch();
    const plume = new THREE.ConeGeometry(config.flameRadius, config.flameLength, 8);
    plume.rotateX(Math.PI / 2); plume.scale(1, config.flameHeight, 1); plume.translate(0, 0, config.flameLength / 2);
    flame.add(plume, CYAN);
    const hot = new THREE.CylinderGeometry(config.flameRadius * 0.6, config.flameRadius * 0.6, 0.055, 8);
    hot.rotateX(Math.PI / 2); hot.scale(1, config.flameHeight, 1); hot.translate(0, 0, 0.023);
    flame.add(hot, IVORY);
    const first = flame.finish(group, 'engine-flame-left', light);
    first.position.set(-config.engineX, config.engineY, config.engineZ);
    const second = first.clone(); second.name = 'engine-flame-right'; second.position.x = config.engineX; group.add(second);
    templates.set(tier, group);
  }
  return templates.get(tier);
}

/** Cached aircraft shell. Forward is -Z; engines are independent flame meshes. */
export function createSupportAircraft(tier = 1) {
  const id = Math.max(1, Math.min(3, Math.trunc(Number(tier) || 1)));
  const group = aircraftTemplate(id).clone(true);
  const engines = [group.getObjectByName('engine-flame-left'), group.getObjectByName('engine-flame-right')];
  return { group, engines };
}
