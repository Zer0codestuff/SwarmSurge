// Sculpted road obstacles: ice wall, chain-link fence, sand golem statue, saw, tesla gate, hangar
// and jump pad. Each function adds static art to a group and returns the nodes the engine animates.
// Labels, panels and collision stay with the callers. Placement uses a fixed hash, never
// Math.random, so building a stage does not move the seeded simulation stream.
import * as THREE from 'three';
import { assetBatch, assetGlow } from './asset-kit.js';
import { loftGeometry, sweepGeometry, headGeometry } from './boss-shapes.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// Lathe around Y from [radius, y] pairs listed bottom to top.
function lathe(profile, sides = 16) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y)), sides);
}
// Upright loft. Sections are [y, halfWidth, halfDepth, centerZ, squareness].
function upright(sections, segments = 18) {
  return loftGeometry(sections.map(([y, w, d, z = 0, p = 0.6]) => [y, w, d, 0, z, p]), { segments, steps: Math.max(6, sections.length * 2 + 2) });
}
// Profile in the XY plane extruded along Z and centered on it.
function extrude(points, depth, bevel = 0.03, holes = []) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const hole of holes) shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 8 });
  return geo.translate(0, 0, -depth / 2 + bevel);
}
function arc(cx, cy, rx, ry, a0, a1, n = 12) {
  const out = [];
  for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return out;
}
// Vertical blend between two colors with a faint positional mottle, for stone and ice.
function blend(low, high, y0, y1, mottle = 0) {
  const a = new THREE.Color(low), b = new THREE.Color(high), c = new THREE.Color();
  return (x, y, z) => c.copy(a).lerp(b, clamp((y - y0) / (y1 - y0) + (hash(Math.round(x * 6) + Math.round(y * 6) * 17 + Math.round(z * 6) * 43) - 0.5) * mottle, 0, 1));
}

// ---------- ice wall ----------
// A ridge of hexagonal crystals rising from a snow drift. Returns the translucent ice material.
export function sculptIceWall(group, w) {
  const ice = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.82, emissive: 0x1b5f80 });
  const crystals = assetBatch(), tone = blend(0x86d8f6, 0xf2fdff, 0.1, 2.3);
  const n = Math.max(4, Math.round(w / 0.56));
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), a = hash(i + 1), b = hash(i + 7.3), c = hash(i + 13.9);
    const h = 1.5 + a * 0.95 + (i % 2) * 0.25, r = 0.3 + b * 0.16;
    crystals.add(lathe([[r * 0.8, 0], [r, h * 0.2], [r * 0.9, h * 0.64], [r * 0.5, h * 0.87], [0.001, h]], 6), tone,
      (u - 0.5) * (w - 0.7), 0.05, (a - 0.5) * 0.3, (c - 0.5) * 0.3, c * TAU, (b - 0.5) * 0.4);
  }
  // Low shards fill the foot of the ridge on both faces.
  const m = Math.max(5, Math.round(w / 0.45));
  for (let i = 0; i < m; i++) {
    const u = (i + 0.5) / m, a = hash(i + 31.7), b = hash(i + 47.1), side = i % 2 ? 1 : -1;
    const h = 0.55 + a * 0.5, r = 0.16 + b * 0.1;
    crystals.add(lathe([[r * 0.8, 0], [r, h * 0.25], [r * 0.7, h * 0.7], [0.001, h]], 5), tone,
      (u - 0.5) * (w - 0.3), 0.05, side * (0.3 + b * 0.1), side * (0.25 + a * 0.3), a * TAU, (b - 0.5) * 0.7);
  }
  crystals.finish(group, 'ice-crystals', ice);
  const drift = assetBatch();
  drift.add(upright([[0, w / 2 + 0.12, 0.62, 0, 0.9], [0.1, w / 2 + 0.04, 0.54, 0, 0.9], [0.22, w / 2 - 0.2, 0.36, 0, 0.9], [0.28, w / 2 - 0.5, 0.14, 0, 0.9]], 20), blend(0xcfe9f7, 0xffffff, 0, 0.3));
  drift.finish(group, 'ice-drift').castShadow = false;
  return ice;
}

// ---------- chain-link fence ----------
// Galvanised posts on concrete footings, clamped rails, cross braces, a barbed coil and a hazard plate.
export function sculptFence(group, w, H) {
  const STEEL = 0xb4bdc9, DARK = 0x5a616c, CONCRETE = 0x8d9199, HAZARD = 0xffc83a;
  const b = assetBatch();
  for (const x of [-w / 2, 0, w / 2]) {
    b.add(lathe([[0.21, 0], [0.21, 0.09], [0.16, 0.15], [0.085, 0.19], [0.085, H - 0.18], [0.115, H - 0.16], [0.115, H - 0.07], [0.07, H - 0.02], [0.05, H + 0.08], [0.001, H + 0.1]], 10),
      (px, py) => (py < 0.17 ? CONCRETE : py > H - 0.17 ? DARK : STEEL), x, 0, 0);
    for (const y of [0.12, H - 0.05]) b.add(new THREE.TorusGeometry(0.105, 0.03, 5, 12).rotateY(Math.PI / 2), DARK, x, y === 0.12 ? 0.3 : H - 0.3, 0);
  }
  for (const y of [0.3, H - 0.3]) b.cylinder(0.055, w, 0, y, 0, DARK, 'x', 0.055, 8);
  for (const s of [-1, 1]) b.beam([s * w / 2, 0.34, -0.07], [0, H - 0.34, -0.07], 0.045, 0.045, DARK);
  // Barbed coil along the top rail.
  const turns = Math.max(3, Math.round(w * 2.4)), points = [];
  for (let k = 0; k <= turns * 8; k++) { const a = k / 8 * TAU; points.push([-w / 2 + w * k / (turns * 8), H + 0.2 + Math.cos(a) * 0.13, Math.sin(a) * 0.13]); }
  b.add(sweepGeometry(points, [0.017, 0.017], { segments: 4, steps: turns * 12 }), 0xdfe6ee);
  b.add(extrude([[-0.26, -0.18], [0.26, -0.18], [0, 0.27]], 0.05, 0.012), HAZARD, w / 4, 1.45, 0.09);
  b.add(extrude([[-0.035, -0.08], [0.035, -0.08], [0.035, 0.12], [-0.035, 0.12]], 0.02, 0), DARK, w / 4, 1.42, 0.125);
  b.finish(group, 'fence-frame');
}

// ---------- sand golem statue ----------
const SAND = 0xdfba82, SAND_DARK = 0xa87c48, RUNE = 0x5ff3df;
function golemHead(b, x, y, z, rx, rz, scale = 1) {
  b.add(headGeometry(0.78 * scale, 0.84 * scale, 0.74 * scale, { brow: 0.26, jaw: 0.95, snout: 0.08, cheeks: 0.04 }), SAND, x, y, z, rx, 0, rz);
}
// Large: a carved guardian on a stepped plinth. Small: its toppled head and a broken forearm.
export function sculptStatue(group, w, small) {
  const b = assetBatch(), glow = assetBatch();
  if (small) {
    const stone = blend(SAND_DARK, SAND, 0, 1.3, 0.14);
    b.box(w, 0.36, 1.6, 0, 0.18, 0, stone).box(w * 0.9, 0.34, 1.42, 0, 0.53, 0, stone).box(w * 0.96, 0.14, 1.52, 0, 0.77, 0, SAND_DARK);
    golemHead(b, -w * 0.14, 1.22, 0.12, 0.1, 0.5);
    for (const sx of [-1, 1]) glow.sphere(0.07, -w * 0.14 + sx * 0.17 - 0.03, 1.27 + sx * 0.08, 0.47, RUNE, 1, 0.6, 0.5);
    b.add(sweepGeometry([[w * 0.2, 0.9, -0.3], [w * 0.3, 1.05, 0.05], [w * 0.34, 1.0, 0.4]], [0.22, 0.2, 0.27], { segments: 10, steps: 8 }), stone);
    b.add(upright([[-0.2, 0.2, 0.2], [0, 0.28, 0.27], [0.2, 0.22, 0.22]], 12), SAND, w * 0.35, 1.02, 0.52, 0.5, 0, 0.3);
  } else {
    const s = clamp(w / 3.1, 0.82, 1), base = 0.7, stone = blend(SAND_DARK, SAND, 0.2, 3.4, 0.16);
    b.box(w, 0.26, 2.0, 0, 0.13, 0, SAND_DARK).box(w - 0.24, 0.32, 1.8, 0, 0.41, 0, stone).box(w - 0.06, 0.14, 1.94, 0, 0.63, 0, SAND);
    for (let k = 0; k < 5; k++) b.box(0.1, 0.2, 0.05, (k - 2) * (w - 0.7) / 4, 0.41, 0.9, SAND_DARK);
    const at = (geo, color, x, y, z, rx = 0, ry = 0, rz = 0) => b.add(geo.scale(s, s, s), color, x * s, base + y * s, z * s, rx, ry, rz);
    for (const sx of [-1, 1]) {
      at(upright([[0, 0.44, 0.5, 0.06, 0.7], [0.22, 0.42, 0.44, 0.02, 0.7], [0.6, 0.32, 0.36], [0.95, 0.38, 0.4], [1.2, 0.3, 0.34]], 14), stone, sx * 0.52, 0, 0);
      at(new THREE.SphereGeometry(0.52, 14, 10).scale(1, 0.82, 1), SAND_DARK, sx * 1.3, 2.52, 0);
      at(sweepGeometry([[sx * 1.3, 2.4, 0], [sx * 1.6, 1.75, 0.08], [sx * 1.5, 1.15, 0.3]], [0.36, 0.3, 0.4], { segments: 12, steps: 10 }), stone, 0, 0, 0);
      at(upright([[-0.34, 0.3, 0.3], [-0.05, 0.44, 0.42], [0.3, 0.36, 0.36], [0.36, 0.2, 0.2]], 14), SAND, sx * 1.48, 0.86, 0.36);
      at(new THREE.TorusGeometry(0.37, 0.07, 6, 16).rotateX(Math.PI / 2), SAND_DARK, sx * 1.52, 1.3, 0.26, 0.3);
    }
    at(upright([[0.95, 0.74, 0.5], [1.2, 0.64, 0.46], [1.5, 0.82, 0.56]], 20), SAND_DARK, 0, 0, 0);
    at(upright([[1.36, 0.72, 0.5, 0, 0.7], [1.72, 1.0, 0.66, 0.02, 0.7], [2.2, 1.24, 0.74, 0.04, 0.7], [2.62, 1.14, 0.66, 0, 0.7], [2.86, 0.7, 0.46, -0.02, 0.7], [2.96, 0.3, 0.26, -0.02, 0.7]], 26), stone, 0, 0, 0);
    at(new THREE.TorusGeometry(0.34, 0.07, 6, 20), SAND_DARK, 0, 2.2, 0.72);
    b.add(headGeometry(0.78 * s, 0.84 * s, 0.74 * s, { brow: 0.26, jaw: 0.95, snout: 0.08, cheeks: 0.04 }), SAND, 0, base + 3.3 * s, 0.14 * s);
    b.add(new THREE.TorusGeometry(0.42 * s, 0.09 * s, 6, 18).rotateX(Math.PI / 2), SAND_DARK, 0, base + 2.92 * s, 0.06 * s);
    for (const sx of [-1, 1]) glow.sphere(0.07 * s, sx * 0.18 * s, base + 3.37 * s, 0.49 * s, RUNE, 1, 0.6, 0.5);
    glow.add(new THREE.OctahedronGeometry(0.2 * s, 0).scale(1, 1.25, 0.5), RUNE, 0, base + 2.2 * s, 0.76 * s);
  }
  b.finish(group, 'statue-stone');
  glow.finish(group, 'statue-runes', assetGlow);
}

// ---------- saw ----------
// A toothed blade with relief slots on an axle carried by two A-frames over a floor slot.
export function sculptSaw(group, r) {
  const blade = new THREE.Group(); blade.name = 'saw-blade'; blade.position.y = r * 0.75; group.add(blade);
  const teeth = 18, rim = [];
  for (let k = 0; k < teeth; k++) {
    const a = k / teeth * TAU, step = TAU / teeth;
    rim.push([Math.cos(a) * (r + 0.17), Math.sin(a) * (r + 0.17)], [Math.cos(a + step * 0.34) * (r - 0.03), Math.sin(a + step * 0.34) * (r - 0.03)], [Math.cos(a + step * 0.9) * (r + 0.02), Math.sin(a + step * 0.9) * (r + 0.02)]);
  }
  const slots = [];
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; slots.push(arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.1, r * 0.1, 0, TAU, 10).slice(0, -1).reverse()); }
  const disc = assetBatch();
  disc.add(extrude(rim, 0.09, 0.02, slots), (x, y) => { const d = Math.hypot(x, y); return d > r - 0.05 ? 0xf4f8fb : d > r * 0.8 ? 0xaab4c0 : 0xd0d7e0; });
  disc.add(lathe([[r * 0.34, -0.09], [r * 0.34, 0.06], [r * 0.28, 0.1], [r * 0.12, 0.11], [0.001, 0.13]], 16).rotateX(Math.PI / 2), 0xe2343c);
  disc.add(lathe([[r * 0.34, -0.09], [r * 0.34, 0.06], [r * 0.28, 0.1], [0.001, 0.11]], 16).rotateX(-Math.PI / 2), 0xe2343c);
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; for (const s of [-1, 1]) disc.sphere(r * 0.045, Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22, s * 0.1, 0xf4f8fb); }
  disc.finish(blade, 'saw-disc');
  const frame = assetBatch(), top = r * 0.75;
  frame.box(r * 2.5, 0.08, 0.62, 0, 0.04, 0, 0x2c3036);
  for (const s of [-1, 1]) {
    frame.add(extrude([[-r * 0.36, 0], [r * 0.36, 0], [0.1, top + 0.12], [-0.1, top + 0.12]], 0.07, 0.015, [[[-r * 0.16, 0.14], [0, top - 0.16], [r * 0.16, 0.14]]]), 0x3b4450, 0, 0.06, s * 0.2);
    frame.add(lathe([[0.13, 0], [0.13, 0.05], [0.08, 0.08], [0.001, 0.09]], 10).rotateX(s * Math.PI / 2), 0xffc83a, 0, top, s * 0.24);
    frame.add(upright([[0, 0.14, 0.3, 0, 0.8], [0.14, 0.12, 0.28, 0, 0.8], [0.2, 0.06, 0.2, 0, 0.8]], 10), 0xffc83a, s * r * 1.22, 0.06, 0);
  }
  frame.finish(group, 'saw-frame');
  return blade;
}

// ---------- tesla gate ----------
// Two ribbed insulator posts under a copper bus bar. Returns the coil group that carries the orb.
export function sculptTesla(group, w, H) {
  const CERAMIC = 0xe6edf5, METAL = 0x4d5564, COPPER = 0xd98342, SILVER = 0xc3ccd8;
  const post = [[0.25, 0], [0.25, 0.1], [0.15, 0.16]];
  const sheds = Math.floor((H - 0.4) / 0.3);
  for (let k = 0; k < sheds; k++) { const y = 0.26 + k * 0.3; post.push([0.1, y], [0.21, y + 0.06], [0.21, y + 0.1], [0.1, y + 0.18]); }
  post.push([0.1, H - 0.08], [0.16, H - 0.06], [0.16, H + 0.06], [0.001, H + 0.08]);
  const b = assetBatch();
  for (const sx of [-1, 1]) {
    const px = sx * w / 2;
    b.add(lathe(post, 14), (x, y, z) => (y < 0.17 || y > H - 0.09 ? METAL : Math.hypot(x - px, z) > 0.15 ? CERAMIC : METAL), px, 0, 0);
  }
  b.cylinder(0.07, w, 0, H, 0, COPPER, 'x', 0.07, 10);
  for (const x of [-w / 4, 0, w / 4]) b.add(new THREE.TorusGeometry(0.1, 0.035, 5, 12).rotateY(Math.PI / 2), METAL, x, H, 0);
  b.add(lathe([[0.001, 0], [0.13, 0.03], [0.17, 0.14], [0.13, 0.26], [0.001, 0.3]], 12), SILVER, -w / 2, H + 0.06, 0);
  b.finish(group, 'tesla-frame');
  const coil = new THREE.Group(); coil.name = 'tesla-coil'; coil.position.set(w / 2, H, 0); group.add(coil);
  const winding = [[0.36, 0.04], [0.36, 0.12], [0.27, 0.18]];
  for (let k = 0; k < 24; k++) winding.push([k % 2 ? 0.2 : 0.235, 0.22 + k * 0.05]);
  winding.push([0.26, 1.42], [0.26, 1.48], [0.001, 1.5]);
  const c = assetBatch();
  c.add(lathe(winding, 14), (x, y) => (y < 0.2 || y > 1.4 ? METAL : COPPER));
  c.add(new THREE.TorusGeometry(0.4, 0.13, 10, 24).rotateX(Math.PI / 2), SILVER, 0, 1.58, 0);
  c.finish(coil, 'tesla-winding');
  return coil;
}

// ---------- hangar ----------
// A ribbed quonset shed with an open bay, a roof pad for the parked aircraft and apron lights.
export function sculptHangar(group, w) {
  const HULL = 0x2f52b4, RIB = 0x1b2c6e, BAY = 0x0b1230, PAD = 0x39445a, LIGHT = 0xffd75a;
  const b = assetBatch(), glow = assetBatch(), hw = w / 2, D = 1.8;
  b.add(extrude(arc(0, 0, hw, 1.5, 0, Math.PI, 16), D, 0.04), blend(RIB, HULL, 0, 0.9));
  for (let k = 0; k < 5; k++) b.add(new THREE.TorusGeometry(1, 0.045, 5, 18, Math.PI).scale(hw + 0.02, 1.52, 1), RIB, 0, 0, -D / 2 + 0.06 + k * (D - 0.12) / 4);
  b.add(extrude(arc(0, 0, hw - 0.28, 1.18, 0, Math.PI, 14), 0.06, 0), BAY, 0, 0.02, D / 2 + 0.01);
  b.add(extrude([...arc(0, 0, hw - 0.16, 1.3, 0, Math.PI, 14), ...arc(0, 0, hw - 0.28, 1.18, Math.PI, 0, 14)], 0.1, 0.015), 0xe9eef6, 0, 0.02, D / 2 + 0.02);
  b.box(w + 0.3, 0.06, 0.5, 0, 0.03, D / 2 + 0.22, PAD);
  b.add(lathe([[0.74, 0], [0.76, 0.05], [0.7, 0.09], [0.001, 0.1]], 20), PAD, 0, 1.46, 0);
  glow.add(new THREE.TorusGeometry(0.56, 0.035, 4, 24).rotateX(Math.PI / 2), LIGHT, 0, 1.57, 0);
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 3; k++) glow.sphere(0.055, sx * (hw - 0.1 - k * 0.02), 0.09, D / 2 + 0.08 + k * 0.16, LIGHT);
    b.cylinder(0.035, 0.7, sx * (hw - 0.5), 1.25 + 0.3, -D / 2 + 0.3, RIB, 'y', 0.045, 6);
    glow.sphere(0.07, sx * (hw - 0.5), 1.94, -D / 2 + 0.3, sx > 0 ? 0xff5a5a : 0x6dffb0);
  }
  b.finish(group, 'hangar-shed');
  glow.finish(group, 'hangar-lights', assetGlow);
}

// ---------- jump pad ----------
// A flared base, a real coil spring and a bumper rim around the membrane the caller adds.
export function sculptJumpPad(group, r) {
  const FRAME = 0x2a6aff, DEEP = 0x173a9c, SPRING = 0xffcc1a;
  const b = assetBatch();
  b.add(lathe([[r * 1.1, 0], [r * 1.12, 0.05], [r * 1.02, 0.11], [r * 0.5, 0.13], [0.001, 0.13]], 28), DEEP);
  const points = [], turns = 3;
  for (let k = 0; k <= turns * 14; k++) { const a = k / 14 * TAU; points.push([Math.cos(a) * r * 0.9, 0.12 + 0.2 * k / (turns * 14), Math.sin(a) * r * 0.9]); }
  b.add(sweepGeometry(points, [0.045, 0.045], { segments: 6, steps: turns * 28 }), SPRING);
  b.add(lathe([[r * 0.8, 0.3], [r * 0.99, 0.29], [r * 1.05, 0.34], [r * 1.03, 0.4], [r * 0.95, 0.43], [r * 0.83, 0.4], [r * 0.8, 0.36]], 28), FRAME);
  for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + Math.PI / 4; b.add(lathe([[0.1, 0], [0.11, 0.06], [0.07, 0.1], [0.001, 0.11]], 8), SPRING, Math.cos(a) * r * 1.06, 0.02, Math.sin(a) * r * 1.06); }
  b.finish(group, 'jump-frame').castShadow = false;
}
