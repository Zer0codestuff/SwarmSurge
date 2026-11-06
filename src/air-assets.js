import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';
import { loftGeometry } from './boss-shapes.js';
import { pod, lathe } from './vehicle-assets.js';

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
    // Colors may depend on the placed vertex; loft shading stays as a multiplier.
    const pos = g.attributes.position, shade = g.attributes.color;
    const fixed = typeof color === 'function' ? null : new THREE.Color(color), c = new THREE.Color();
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      if (fixed) c.copy(fixed); else c.set(color(pos.getX(i), pos.getY(i), pos.getZ(i)));
      const k = shade ? shade.getX(i) : 1;
      colors[i * 3] = c.r * k; colors[i * 3 + 1] = c.g * k; colors[i * 3 + 2] = c.b * k;
    }
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

// Airfoil loft across the span. Sections are [x, chordCenterZ, halfChord, halfThickness, y].
function wing(sections, segments = 14) {
  const sorted = [...sections].sort((a, b) => a[0] - b[0]);
  return loftGeometry(sorted.map(([x, z, c, t, y = 0]) => [x, t, c, -y, z, 1]),
    { segments, steps: Math.max(6, sorted.length * 2 + 2), shade: false }).rotateZ(-Math.PI / 2);
}
function mirror(sections, side) { return sections.map(([x, ...rest]) => [x * side, ...rest]); }
// Vertical fin: a wing rotated upright and canted outward.
function fin(sections, side, cant = 0.14) { return wing(sections, 10).rotateZ(Math.PI / 2 - side * cant); }
// Engine nacelle along +Z (rear). Profile is [radius, z] from intake to nozzle.
function nacelle(profile, sides = 12) { return lathe(profile, sides).rotateX(Math.PI / 2); }

function canopy(body, z0, z1, y, width, height) {
  const mid = (z0 + z1) / 2, half = (z1 - z0) / 2;
  body.add(pod([[z0 - 0.03, 0.03, 0.02, y], [z0 + half * 0.25, width * 1.08, height * 0.65, y], [mid, width * 1.12, height * 0.8, y], [z1, width * 0.7, height * 0.5, y], [z1 + 0.08, 0.04, 0.03, y]], 14), NAVY);
  body.add(pod([[z0, 0.02, 0.02, y + 0.02], [z0 + half * 0.3, width * 0.9, height * 0.75, y + 0.02, 0.9], [mid, width, height, y + 0.02, 0.9], [z1 - 0.06, width * 0.6, height * 0.55, y + 0.02, 0.9], [z1, 0.03, 0.03, y + 0.02]], 14),
    (x, yy) => (yy > y + 0.02 + height * 0.55 && Math.abs(x) < width * 0.35 ? 0xd8fbff : 0x46c9e6));
}

function engines(body, x, y, front, rear, r) {
  for (const side of [-1, 1]) {
    body.add(nacelle([[0.001, front], [r * 0.7, front + 0.02], [r * 0.95, front + 0.1], [r, front + 0.25], [r, rear - 0.12], [r * 0.92, rear - 0.04],
      [r * 0.95, rear - 0.03], [r * 1.05, rear], [r * 0.72, rear], [r * 0.72, rear - 0.05], [0.001, rear - 0.05]]), (px, py, pz) =>
      (pz > rear - 0.06 ? (Math.hypot(px - side * x, py - y) < r * 0.74 ? GOLD : STEEL) : NAVY), side * x, y, 0);
  }
}

function missile(body, x, y, z, length = 0.48, r = 0.05) {
  body.add(nacelle([[0.001, -length / 2], [r * 0.6, -length / 2 + 0.05], [r, -length / 2 + 0.13], [r, length / 2 - 0.02], [r * 0.8, length / 2], [0.001, length / 2]], 8),
    (px, py, pz) => (pz < z - length / 2 + 0.1 ? GOLD : IVORY), x, y, z);
  for (const a of [0, Math.PI / 2]) body.add(new THREE.BoxGeometry(r * 3.2, 0.012, 0.09), BLUE, x, y, z + length / 2 - 0.06, 0, 0, a);
}

function scout(body, lamps) {
  // Slim fuselage with a blue spine, swept wings and canted twin tails.
  body.add(pod([[-1.42, 0.015, 0.015, 0.06, 1], [-1.22, 0.08, 0.07, 0.065, 1], [-0.85, 0.15, 0.12, 0.07, 0.9], [-0.25, 0.19, 0.14, 0.07, 0.8],
    [0.45, 0.2, 0.13, 0.06, 0.8], [0.85, 0.16, 0.1, 0.05, 0.85], [1.02, 0.12, 0.08, 0.05, 0.9]], 16),
    IVORY);
  body.add(pod([[-1.24, 0.012, 0.01, 0.13], [-1.1, 0.045, 0.02, 0.15], [-0.86, 0.055, 0.025, 0.185], [-0.8, 0.03, 0.015, 0.19]], 8), BLUE);
  for (const side of [-1, 1]) {
    body.add(wing(mirror([[0.12, 0.12, 0.42, 0.05, 0], [0.6, 0.3, 0.29, 0.035, 0.01], [1.1, 0.46, 0.18, 0.022, 0.025]], side)), BLUE);
    body.add(wing(mirror([[1.1, 0.46, 0.18, 0.022, 0.025], [1.3, 0.53, 0.13, 0.016, 0.033], [1.38, 0.55, 0.1, 0.012, 0.035]], side), 12), IVORY);
    body.add(fin([[0.0, 0.77, 0.2, 0.025], [0.36, 0.92, 0.1, 0.015]], side), BLUE, side * 0.17, 0.12, 0);
    body.add(wing(mirror([[0.12, 0.88, 0.13, 0.022, 0.06], [0.58, 0.98, 0.07, 0.012, 0.07]], side), 10), IVORY);
    body.add(pod([[-0.2, 0.05, 0.03, 0.0], [-0.12, 0.08, 0.06, 0.0], [0.12, 0.08, 0.06, 0.0]], 10), NAVY, side * 0.2, -0.04, -0.2);
    lamps.add(new THREE.SphereGeometry(0.035, 8, 6), side < 0 ? CYAN : GOLD, side * 1.38, 0.04, 0.55);
  }
  canopy(body, -0.78, -0.12, 0.15, 0.1, 0.1);
  engines(body, 0.24, -0.035, 0.4, 1.07, 0.105);
  return { engineX: 0.24, engineY: -0.035, engineZ: 1.09, flameRadius: 0.074, flameLength: 0.27, flameHeight: 0.8 };
}

function strike(body, lamps) {
  // Broader blended fuselage, cropped delta wings, pylons with missiles.
  body.add(pod([[-1.44, 0.015, 0.015, 0.07, 1], [-1.2, 0.1, 0.08, 0.075, 1], [-0.75, 0.2, 0.13, 0.08, 0.85], [-0.1, 0.34, 0.15, 0.07, 0.6],
    [0.6, 0.36, 0.14, 0.06, 0.6], [0.95, 0.26, 0.1, 0.05, 0.7], [1.06, 0.2, 0.08, 0.05, 0.8]], 18),
    IVORY);
  body.add(pod([[-0.2, 0.02, 0.01, 0.2], [-0.05, 0.1, 0.025, 0.215], [0.7, 0.1, 0.025, 0.2], [0.9, 0.03, 0.01, 0.17]], 10), BLUE);
  for (const side of [-1, 1]) {
    body.add(wing(mirror([[0.25, 0.1, 0.62, 0.05, 0], [0.8, 0.3, 0.44, 0.035, 0.0], [1.36, 0.4, 0.27, 0.022, 0.01]], side)), BLUE);
    body.add(wing(mirror([[1.36, 0.4, 0.27, 0.022, 0.01], [1.56, 0.425, 0.21, 0.017, 0.01], [1.62, 0.43, 0.18, 0.014, 0.01]], side), 12), IVORY);
    body.add(wing(mirror([[0.2, 0.86, 0.2, 0.025, 0.07], [0.88, 1.02, 0.1, 0.014, 0.08]], side), 10), BLUE);
    body.add(fin([[0.0, 0.72, 0.24, 0.028], [0.26, 0.84, 0.16, 0.02]], side, 0.2), IVORY, side * 0.3, 0.13, 0);
    body.add(fin([[0.26, 0.84, 0.16, 0.02], [0.4, 0.9, 0.12, 0.016]], side, 0.2), BLUE, side * 0.3, 0.13, 0);
    // Side intakes.
    body.add(pod([[-0.55, 0.06, 0.05, 0.0], [-0.42, 0.1, 0.1, 0.0], [0.1, 0.1, 0.1, 0.0], [0.3, 0.07, 0.07, 0.0]], 12), (x, y, z) => (z < -0.5 ? 0x0b1624 : NAVY), side * 0.36, 0.0, 0);
    body.add(pod([[0.12, 0.04, 0.05, 0], [0.22, 0.05, 0.07, 0], [0.48, 0.05, 0.07, 0], [0.55, 0.035, 0.05, 0]], 8), NAVY, side * 1.04, -0.1, 0);
    missile(body, side * 1.04, -0.2, 0.3, 0.5, 0.055);
    lamps.add(new THREE.SphereGeometry(0.04, 8, 6), side < 0 ? CYAN : GOLD, side * 1.62, 0.03, 0.43);
  }
  canopy(body, -0.86, -0.12, 0.17, 0.13, 0.11);
  engines(body, 0.29, -0.045, 0.35, 1.08, 0.125);
  return { engineX: 0.29, engineY: -0.045, engineZ: 1.1, flameRadius: 0.09, flameLength: 0.32, flameHeight: 0.8 };
}

function bomber(body, lamps) {
  // Blended flying wing: one swept airfoil loft with a raised spine and buried engines.
  const lead = x => -1.36 + 1.06 * x;
  const span = [[0, 1.0, 0.14], [0.3, 0.9, 0.12], [0.6, 0.96, 0.09], [0.95, 0.78, 0.06], [1.3, 0.86, 0.04], [1.6, 0.66, 0.025], [1.72, 0.5, 0.015]];
  const section = ([x, trail, t], side = 1) => [x * side, (lead(x) + trail) / 2, (trail - lead(x)) / 2, t, 0.02 + x * 0.03];
  const inner = span.filter(([x]) => x <= 1.3), tip = span.filter(([x]) => x >= 1.3);
  body.add(wing([...inner.map(p => section(p, 1)), ...inner.filter(([x]) => x > 0).map(p => section(p, -1))], 18), NAVY);
  for (const side of [-1, 1]) {
    body.add(wing(tip.map(p => section(p, side)), 12), BLUE);
    // Pale leading-edge chevrons sit just above the skin.
    body.add(wing([section([0.45, lead(0.45) + 0.36, 0.006], side).map((v, i) => (i === 1 ? lead(0.45) + 0.2 : i === 2 ? 0.05 : i === 4 ? 0.1 : v)),
      section([1.25, lead(1.25) + 0.3, 0.006], side).map((v, i) => (i === 1 ? lead(1.25) + 0.16 : i === 2 ? 0.04 : i === 4 ? 0.075 : v))], 6), IVORY);
  }
  body.add(pod([[-1.3, 0.02, 0.02, 0.06], [-0.95, 0.18, 0.1, 0.09], [-0.35, 0.27, 0.14, 0.1], [0.35, 0.25, 0.12, 0.09], [0.86, 0.06, 0.04, 0.07]], 16), BLUE);
  for (const side of [-1, 1]) {
    body.add(pod([[0.2, 0.04, 0.02, 0.06], [0.35, 0.15, 0.08, 0.08], [0.75, 0.16, 0.08, 0.08], [0.95, 0.14, 0.04, 0.06]], 12),
      (x, y, z) => (z > 0.9 ? STEEL : z < 0.3 ? 0x0b1624 : BLUE), side * 0.39, 0, 0);
    for (let k = 0; k < 3; k++) body.add(new THREE.BoxGeometry(0.2, 0.012, 0.03), NAVY, side * 0.39, 0.16, 0.52 + k * 0.08);
    lamps.add(new THREE.SphereGeometry(0.04, 8, 6), side < 0 ? CYAN : GOLD, side * 1.62, 0.08, 0.57);
    lamps.add(pod([[0.68, 0.07, 0.008, 0.165], [0.84, 0.07, 0.008, 0.165]], 6), CYAN, side * 0.39, 0, 0);
  }
  canopy(body, -0.85, -0.25, 0.2, 0.13, 0.08);
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
