import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from '../vendor/addons/BufferGeometryUtils.js';
import { loftGeometry, sweepGeometry, patchGeometry } from './boss-shapes.js';

// Sculpted roadside props. Each builder returns one vertex-colored geometry,
// standing on y = 0, for instanced scatter with a shared Lambert material.
const TAU = Math.PI * 2;
const col = new THREE.Color(), tmp = new THREE.Color();

function noise(x, y, z, s = 1) {
  return Math.sin(x * 1.7 + s * 1.3) * Math.sin(y * 2.1 + s * 2.9) * Math.sin(z * 1.9 + s * .7)
    + .5 * Math.sin(x * 3.7 - s) * Math.sin(y * 3.3 + s * 1.7) * Math.sin(z * 4.1 + s * 2.3);
}

// Writes color = base * shade(x, y, z), keeping any existing shade from boss-shapes builders.
function paint(g, base, shade = () => 1) {
  const p = g.attributes.position, old = g.attributes.color, c = new Float32Array(p.count * 3);
  col.set(base);
  for (let i = 0; i < p.count; i++) {
    const s = shade(p.getX(i), p.getY(i), p.getZ(i), i), f = old ? old.getX(i) : 1;
    if (s && s.isColor) { c[i * 3] = s.r * f; c[i * 3 + 1] = s.g * f; c[i * 3 + 2] = s.b * f; continue; }
    c[i * 3] = col.r * s * f; c[i * 3 + 1] = col.g * s * f; c[i * 3 + 2] = col.b * s * f;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

const ground = (y0, y1, lo = .7) => (x, y) => lo + (1 - lo) * Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));

function place(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  if (s !== 1) g.scale(...(Array.isArray(s) ? s : [s, s, s]));
  g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z);
  return g;
}

function combine(parts) {
  const clean = parts.map(g => {
    const n = g.index ? g.toNonIndexed() : g;
    if (n !== g) g.dispose();
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'color'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  const out = mergeGeometries(clean);
  clean.forEach(g => g.dispose());
  out.computeBoundingSphere();
  return out;
}

function lathe(profile, sides = 12) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(.001, r), y)), sides);
}

function faceted(g) {
  const out = g.index ? g.toNonIndexed() : g;
  if (out !== g) g.dispose();
  out.computeVertexNormals();
  return out;
}

// Smooth lumpy stone. Crevices darken and can carry a hot or mossy accent.
export function boulder(seed = 1, color = 0x8a7f72, { detail = 1, rough = .28, flat = .72, accent, accentDepth = .9 } = {}) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position, depth = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = 1 + rough * noise(x * 1.3, y * 1.3, z * 1.3, seed);
    depth[i] = d; p.setXYZ(i, x * d, Math.max(-.15, y * d * flat), z * d);
  }
  g.translate(0, .1 * flat, 0); g.computeVertexNormals();
  const base = new THREE.Color(color), hot = accent !== undefined ? new THREE.Color(accent) : null;
  paint(g, color, (x, y, z, i) => {
    const s = (.62 + .38 * Math.min(1, (y + .1) / (1.1 * flat))) * (.85 + .15 * Math.min(1.2, depth[i]));
    if (hot && depth[i] < accentDepth) return tmp.copy(hot).lerp(base, Math.max(0, (depth[i] - accentDepth + .12) / .12));
    return s;
  });
  return g;
}
const rock = boulder;

export function rockCluster(color, seed = 1, opts = {}) {
  return combine([
    place(rock(seed, color, opts), 0, 0, 0, 0, 0, 0, [1, 1, 1]),
    place(rock(seed + 3, color, opts), .9, 0, .35, 0, 1, 0, .55),
    place(rock(seed + 7, color, opts), -.7, 0, -.4, 0, 2, 0, .4),
  ]);
}

export function saguaro() {
  const green = 0x4e9a3c, ribs = { segments: 7, flutes: .09 };
  const shade = (x, y) => .74 + .26 * Math.min(1, y / 2.4);
  return combine([
    paint(sweepGeometry([[0, 0, 0], [0, 1.2, 0], [.02, 2.4, 0], [0, 2.75, 0]], [.36, .34, .3, .05], { ...ribs, steps: 7 }), green, shade),
    paint(sweepGeometry([[.25, 1.0, 0], [.62, 1.04, 0], [.74, 1.4, 0], [.72, 1.95, 0], [.7, 2.08, 0]], [.18, .2, .19, .17, .04], { ...ribs, segments: 6, steps: 6 }), green, shade),
    paint(sweepGeometry([[-.25, 1.35, .04], [-.55, 1.38, .06], [-.62, 1.65, .06], [-.6, 1.92, .05]], [.16, .17, .15, .04], { ...ribs, segments: 6, steps: 5 }), green, shade),
    paint(new THREE.SphereGeometry(.07, 6, 4), 0xff7aa8).translate(0, 2.78, 0),
  ]);
}

export function deadTree(color = 0x5a4030, scale = 1) {
  const s = scale, sh = (x, y) => .72 + .28 * Math.min(1, y / (2 * s));
  return combine([
    paint(sweepGeometry([[0, 0, 0], [.08 * s, .7 * s, 0], [-.05 * s, 1.35 * s, .05 * s], [.1 * s, 1.9 * s, 0]], [.14 * s, .1 * s, .07 * s, .025 * s], { segments: 6, steps: 8 }), color, sh),
    paint(sweepGeometry([[.06 * s, .9 * s, 0], [.42 * s, 1.18 * s, .05 * s], [.62 * s, 1.55 * s, -.05 * s]], [.06 * s, .04 * s, .015 * s], { segments: 5, steps: 6 }), color, sh),
    paint(sweepGeometry([[-.02 * s, 1.2 * s, .03 * s], [-.38 * s, 1.42 * s, -.1 * s], [-.5 * s, 1.72 * s, -.18 * s]], [.05 * s, .035 * s, .012 * s], { segments: 5, steps: 6 }), color, sh),
  ]);
}

// Twisted haunted tree with a hollow knot.
export function spookyTree() {
  const bark = 0x2c2224, sh = (x, y) => .7 + .3 * Math.min(1, y / 3);
  const branch = (pts, r) => paint(sweepGeometry(pts, r, { segments: 4, steps: 5 }), bark, sh);
  return combine([
    paint(sweepGeometry([[0, 0, 0], [.2, .9, .1], [-.1, 1.9, -.05], [.15, 2.8, .1], [.05, 3.5, 0]], [.34, .22, .16, .1, .03], { segments: 6, steps: 8 }), bark, sh),
    branch([[.1, 2.0, 0], [.6, 2.4, .1], [.95, 2.5, -.1], [1.2, 2.95, -.05]], [.08, .06, .04, .012]),
    branch([[-.05, 2.4, 0], [-.55, 2.75, -.1], [-.7, 3.2, .1], [-1.0, 3.35, .15]], [.07, .05, .03, .01]),
    branch([[.05, 1.5, .05], [-.45, 1.65, .3], [-.8, 1.55, .45]], [.06, .04, .012]),
    paint(new THREE.SphereGeometry(.13, 8, 6).scale(1, 1.4, .5), 0x0e0a0c).translate(.14, 1.1, .2),
  ]);
}

// Layered pine with drooping tiers and optional snow on each shelf.
export function pine(snow = false, dark = 0x2f6b4f, light = 0x3d8a60) {
  const parts = [paint(new THREE.CylinderGeometry(.11, .16, .8, 6).translate(0, .4, 0), 0x6a4a2a)];
  const tiers = [[.55, 1.15, 1.6], [1.4, .84, 1.35], [2.2, .5, 1.05]];
  tiers.forEach(([y, r, h], i) => {
    const tier = lathe([[.001, y + h], [r * .45, y + h * .55], [r * .92, y + h * .12], [r, y], [.001, y + .05]], 7);
    parts.push(paint(tier, i % 2 ? light : dark, (x, yy) => .78 + .22 * (yy - y) / h));
    if (snow) parts.push(paint(lathe([[r * .62, y + h * .46], [r * .42, y + h * .64], [.001, y + h + .03]], 7), 0xf4f9ff));
  });
  return combine(parts);
}

function frond(angle, len = 2.2, droop = 1.1, width = .32, color = 0x3fb84a) {
  const steps = 4, pos = [], c = [], base = new THREE.Color(color);
  const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)), side = new THREE.Vector3(-dir.z, 0, dir.x);
  const row = t => {
    const along = dir.clone().multiplyScalar(t * len), y = .25 * Math.sin(t * Math.PI) - droop * t * t, w = width * Math.sin(Math.PI * Math.min(1, t * 1.1 + .08));
    const center = along.clone().setY(y + .06);
    return [along.clone().setY(y).addScaledVector(side, -w), center, along.clone().setY(y).addScaledVector(side, w)];
  };
  for (let i = 0; i < steps; i++) {
    const a = row(i / steps), b = row((i + 1) / steps), s = .8 + .2 * i / steps;
    for (const [p, q, r] of [[a[0], b[1], a[1]], [a[0], b[0], b[1]], [a[1], b[1], b[2]], [a[1], b[2], a[2]]]) {
      pos.push(...p.toArray(), ...r.toArray(), ...q.toArray());
      for (let k = 0; k < 3; k++) c.push(base.r * s, base.g * s, base.b * s);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

export function palm({ height = 4.3, lean = .7, trunk = 0x9a6a3a, leaf = 0x3fb84a, leaf2 = 0x2f9a3a, fronds = 7 } = {}) {
  const pts = [[0, 0, 0], [lean * .15, height * .35, 0], [lean * .55, height * .7, 0], [lean, height, 0]];
  const ringed = (x, y) => .78 + .16 * Math.abs(Math.sin(y * 9)) + .06 * y / height;
  const parts = [paint(sweepGeometry(pts, [.3, .24, .2, .17], { segments: 6, steps: 8 }), trunk, ringed)];
  for (let i = 0; i < fronds; i++) parts.push(frond(i / fronds * TAU + .3, 1.9 + (i % 3) * .25, .9 + (i % 2) * .4, .3, i % 2 ? leaf : leaf2).translate(lean, height, 0));
  for (let i = 0; i < 2; i++) parts.push(paint(new THREE.SphereGeometry(.15, 5, 4), 0x6a4a22).translate(lean + Math.cos(i * 2.1) * .18, height - .15, Math.sin(i * 2.1) * .18));
  return combine(parts);
}

export function bush(color = 0x2f8a35, flower = 0xff4f9a) {
  const parts = [];
  [[0, .45, 0, .75], [.55, .35, .2, .55], [-.45, .35, -.3, .58]].forEach(([x, y, z, s], i) => {
    parts.push(place(boulder(i + 2, color, { rough: .14, flat: .85 }), x, y - s * .35, z, 0, i, 0, s));
  });
  if (flower) for (let i = 0; i < 3; i++) parts.push(paint(new THREE.SphereGeometry(.13, 5, 3), flower).translate(Math.cos(i * 1.7) * .55, .78 + (i % 2) * .12, Math.sin(i * 1.7) * .45));
  return combine(parts);
}

// Lens-shaped lollipop with a painted spiral swirl.
export function lollipop(color = 0xff4f9a) {
  const disc = lathe([[.001, .14], [.45, .13], [.82, .08], [.9, 0], [.82, -.08], [.45, -.13], [.001, -.14]], 24);
  const pink = new THREE.Color(color), white = new THREE.Color(0xffffff);
  paint(disc, color, (x, y, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(z, x);
    return tmp.copy(Math.sin(a * 2 + r * 9) > 0 ? pink : white);
  });
  disc.rotateX(Math.PI / 2).translate(0, 2.6, 0);
  return combine([paint(new THREE.CylinderGeometry(.07, .07, 2.5, 6).translate(0, 1.25, 0), 0xffffff), disc]);
}

export function gumdrop(color) {
  return paint(lathe([[.001, 0], [.7, 0], [.74, .28], [.62, .72], [.36, 1.0], [.001, 1.08]], 16), color, (x, y) => .82 + .18 * y);
}

export function candyCane() {
  const pts = [[0, 0, 0], [0, 1.6, 0], [0, 2.3, 0], [.15, 2.62, 0], [.45, 2.68, 0], [.62, 2.45, 0], [.62, 2.2, 0]];
  const red = new THREE.Color(0xe8183a), white = new THREE.Color(0xffffff);
  return paint(sweepGeometry(pts, [.12, .12, .12, .12, .12, .12, .1], { segments: 8, steps: 26 }), 0xffffff, (x, y, z) => tmp.copy(Math.sin(y * 7 + Math.atan2(z, x) * 1 + x * 6) > 0 ? red : white));
}

export function crater(color = 0x7a7a8a) {
  return paint(lathe([[2.0, 0], [1.6, .26], [1.38, .34], [1.15, .2], [.8, .02], [.001, -.02]], 20), color, (x, y, z) => {
    const r = Math.hypot(x, z);
    return r < 1.3 ? .6 + .25 * r / 1.3 : .92 - .1 * (r - 1.3);
  });
}

// Fluted column with base and capital, optionally carrying a hanging banner.
export function column({ height = 6, radius = .5, color = 0xfff6e0, cap = 0xffe7a0, banner } = {}) {
  const shaft = loftGeometry([[.6, radius * 1.08, radius * 1.08], [height * .5, radius, radius], [height - .45, radius * .9, radius * .9]], {
    segments: 24, steps: 6, warp: (x, y, z, u, v, a) => { const f = 1 - .07 * Math.abs(Math.cos(a * 6)) ** .5; return [x * f, y, z * f]; },
  });
  const parts = [
    paint(shaft, color, (x, y) => .8 + .2 * y / height),
    paint(lathe([[radius * 1.6, 0], [radius * 1.6, .28], [radius * 1.3, .38], [radius * 1.25, .6], [.001, .6]], 16), cap),
    paint(lathe([[radius * .9, height - .5], [radius * 1.35, height - .25], [radius * 1.5, height - .2], [radius * 1.5, height], [.001, height]], 16), cap),
  ];
  if (banner) {
    const cloth = patchGeometry([[-.5, 0], [.5, 0], [.5, -2.2], [0, -2.6], [-.5, -2.2]], .05, .06, { segments: 16, rings: 1 });
    parts.push(paint(cloth, banner, (x, y) => .8 + .2 * (y + 2.6) / 2.6).translate(0, height - .7, radius + .06));
  }
  return combine(parts);
}

export function gear(color = 0xd0a040, teeth = 10) {
  const shape = new THREE.Shape(), r0 = .95, r1 = 1.22;
  for (let i = 0; i < teeth; i++) {
    const a = i / teeth * TAU, w = TAU / teeth;
    const pts = [[r0, a], [r1, a + w * .12], [r1, a + w * .42], [r0, a + w * .55]];
    pts.forEach(([r, b], k) => (i === 0 && k === 0 ? shape.moveTo : shape.lineTo).call(shape, Math.cos(b) * r, Math.sin(b) * r));
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, .28, 0, TAU, true); shape.holes.push(hole);
  for (let i = 0; i < 4; i++) {
    const h = new THREE.Path(), a = i / 4 * TAU + .4;
    h.absarc(Math.cos(a) * .62, Math.sin(a) * .62, .17, 0, TAU, true); shape.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: .3, bevelEnabled: false, curveSegments: 5 });
  g.translate(0, 0, -.15);
  return paint(faceted(g), color, (x, y) => .82 + .12 * (y + 1.2) / 2.4).translate(0, 1.25, 0);
}

export function crate() {
  const wood = 0xb07a3a, dark = 0x7a4a1a, parts = [paint(new THREE.BoxGeometry(1.04, 1.04, 1.04).translate(0, .55, 0), wood, ground(0, 1.1, .78))];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(new THREE.BoxGeometry(.14, 1.1, .14).translate(sx * .5, .55, sz * .5), dark));
  for (const y of [.06, 1.04]) for (const [w, d] of [[1.1, .14], [.14, 1.1]]) for (const s of [-1, 1]) {
    parts.push(paint(new THREE.BoxGeometry(w, .12, d).translate(d > .5 ? s * .5 : 0, y, w > .5 ? s * .5 : 0), dark));
  }
  for (const s of [-1, 1]) {
    parts.push(paint(new THREE.BoxGeometry(1.36, .12, .06).rotateZ(.78).translate(0, .55, s * .53), dark));
    parts.push(paint(new THREE.BoxGeometry(.06, .12, 1.36).rotateX(-.78).translate(s * .53, .55, 0), dark));
  }
  return combine(parts);
}

export function smokestack() {
  const brick = 0x8a8a92;
  return combine([
    paint(new THREE.BoxGeometry(3.2, 2.2, 3.2).translate(0, 1.1, 0), 0x5a5a62, ground(0, 2.2, .75)),
    paint(new THREE.BoxGeometry(3.4, .22, 3.4).translate(0, 2.25, 0), 0x45454c),
    paint(lathe([[.95, 2.2], [.86, 4], [.81, 6], [.81, 6.02], [.79, 6.8], [.79, 6.82], [.77, 7.2], [.77, 7.22], [.75, 8], [.75, 8.02], [.72, 8.6], [.86, 8.75], [.86, 9.15], [.6, 9.2], [.55, 8.9]], 14), brick, (x, y) => (y > 7.21 && y < 8.01 ? tmp.set(0xd23b30) : y > 6.01 && y < 6.81 ? tmp.set(0xf4f4f4) : .76 + .24 * y / 9)),
    paint(new THREE.CylinderGeometry(.14, .14, 2.8, 6).translate(1.0, 3.2, .8), 0xffb21a),
  ]);
}

// Branching coral: tapered sweeps that fork twice with pale tips.
export function coral(color, seed = 0) {
  const parts = [], tip = 0xfff4ec, sh = (x, y) => .74 + .26 * Math.min(1, y / 2.2);
  parts.push(paint(sweepGeometry([[0, 0, 0], [.05, .7, 0], [0, 1.3, .05]], [.24, .18, .14], { segments: 5, steps: 4 }), color, sh));
  for (let b = 0; b < 4; b++) {
    const a = b / 4 * TAU + seed, ca = Math.cos(a), sa = Math.sin(a), out = .45 + (b % 2) * .2;
    const end = [ca * (out + .35), 2.0 + (b % 2) * .4, sa * (out + .35)];
    parts.push(paint(sweepGeometry([[0, 1.1, 0], [ca * out, 1.5, sa * out], end], [.13, .1, .06], { segments: 4, steps: 5 }), color, sh));
    parts.push(paint(new THREE.SphereGeometry(.08, 5, 3), tip).translate(...end));
    const mid = [ca * out, 1.5, sa * out], twig = [mid[0] + sa * .3, 1.95, mid[2] - ca * .3];
    parts.push(paint(sweepGeometry([mid, [mid[0] + sa * .2, 1.7, mid[2] - ca * .2], twig], [.07, .05, .03], { segments: 4, steps: 3 }), color, sh));
    parts.push(paint(new THREE.SphereGeometry(.06, 4, 3), tip).translate(...twig));
  }
  return combine(parts);
}

export function shell() {
  const g = loftGeometry([[0, .5, .62], [.18, .46, .58], [.32, .3, .4], [.38, .02, .02]], {
    segments: 20, steps: 6, warp: (x, y, z, u, v, a) => { const f = 1 + .08 * Math.cos(a * 9); return [x * f, y * (1 + .1 * Math.cos(a * 9)), z * f]; },
  });
  return paint(g, 0xffd0c0, (x, y, z) => .82 + .18 * Math.abs(Math.cos(Math.atan2(z, x) * 9)));
}

// Ribbed pumpkin with a curled stem.
export function pumpkin() {
  const body = loftGeometry([[0, .2, .2], [.12, .55, .55], [.45, .7, .7], [.78, .55, .55], [.9, .14, .14], [.92, .02, .02]], {
    segments: 16, steps: 7, warp: (x, y, z, u, v, a) => { const f = 1 - .1 * Math.abs(Math.sin(a * 4)) ** .6; return [x * f, y, z * f]; },
  });
  paint(body, 0xff7a1a, (x, y, z) => .8 + .2 * Math.abs(Math.cos(Math.atan2(z, x) * 4)));
  return combine([body, paint(sweepGeometry([[0, .85, 0], [.03, 1.05, 0], [.12, 1.15, 0]], [.07, .05, .04], { segments: 5, steps: 5 }), 0x3a6a2a)]);
}

export function gravestone() {
  const slab = patchGeometry([[-.42, 0], [.42, 0], [.42, .82], [.3, 1.1], [0, 1.22], [-.3, 1.1], [-.42, .82]], .22, .03, { segments: 18, rings: 1 });
  return combine([
    paint(slab, 0x8a8a96, (x, y) => .72 + .28 * y / 1.2 - .08 * Math.max(0, Math.sin(x * 11 + y * 7))),
    paint(new THREE.BoxGeometry(.22, .05, .03).translate(0, .82, .14), 0x5a5a66),
    paint(new THREE.BoxGeometry(.06, .3, .03).translate(0, .82, .14), 0x5a5a66),
    paint(new THREE.SphereGeometry(.6, 8, 3, 0, TAU, 0, Math.PI / 2).scale(1, .22, .8).translate(0, 0, .3), 0x3a3026),
  ]);
}

export function mushroom(color = 0x9a7aff) {
  return combine([
    paint(sweepGeometry([[0, 0, 0], [.05, .3, 0], [0, .55, 0]], [.08, .06, .07], { segments: 6, steps: 4 }), 0xe8e0d0),
    paint(lathe([[.001, .7], [.2, .69], [.32, .6], [.34, .5], [.2, .52], [.001, .5]], 12), color),
  ]);
}

// Hexagonal crystals growing from a shared rock base.
export function crystalCluster(color, seed = 1, base = 0x2a2440) {
  const shard = (h, r) => faceted(lathe([[.001, 0], [r, h * .12], [r * .9, h * .78], [.001, h]], 6));
  const parts = [place(rock(seed, base, { rough: .2, flat: .4 }), 0, -.1, 0, 0, 0, 0, .8)];
  const c = new THREE.Color(color);
  [[0, 0, 2.6, .42, 0, 0], [.4, .2, 1.6, .28, .45, .3], [-.38, -.15, 1.8, .3, -.4, -.35], [.1, -.4, 1.2, .22, -.2, .5]].forEach(([x, z, h, r, rz, rx], i) => {
    const g = place(shard(h, r), x, .1, z, rx, i, rz);
    parts.push(paint(g, color, (px, py) => tmp.copy(c).multiplyScalar(.7 + .45 * py / h)));
  });
  return combine(parts);
}

// Craggy peak with snow above a jagged line and a darker base.
export function mountain(rockC = 0x4a5058, snowC = 0xe8eef8, seed = 1) {
  const g = loftGeometry([[0, 2.5, 2.3], [2.2, 1.8, 1.7], [4.6, .9, .85], [6.6, .25, .22], [7.0, .02, .02]], {
    segments: 14, steps: 10, warp: (x, y, z, u, v, a) => { const f = 1 + .22 * noise(Math.cos(a) * 2, y * .5, Math.sin(a) * 2, seed); return [x * f, y, z * f]; },
  });
  const snow = new THREE.Color(snowC), stone = new THREE.Color(rockC);
  return paint(faceted(g), rockC, (x, y, z) => {
    const line = 4.4 + .6 * Math.sin(Math.atan2(z, x) * 5 + seed);
    return y > line ? tmp.copy(snow) : tmp.copy(stone).multiplyScalar(.7 + .3 * y / 4.4);
  });
}

export function obelisk() {
  return combine([
    paint(new THREE.BoxGeometry(1.4, .4, 1.4).translate(0, .2, 0), 0xc8a060),
    paint(faceted(new THREE.CylinderGeometry(.34, .5, 6, 4, 1).rotateY(Math.PI / 4).translate(0, 3.4, 0)), 0xd8b070, (x, y) => .78 + .22 * y / 6.4 - (Math.abs(x) < .1 && Math.sin(y * 5) > .4 ? .2 : 0)),
    paint(faceted(new THREE.ConeGeometry(.42, .9, 4).rotateY(Math.PI / 4).translate(0, 6.85, 0)), 0xffd040),
  ]);
}

export function asteroid(seed, color) {
  return rock(seed, color, { detail: 1, rough: .38, flat: .9 });
}

// Double-ended floating crystal shard.
export function floatingShard(color) {
  const c = new THREE.Color(color);
  return paint(faceted(lathe([[.001, -1], [.36, -.35], [.32, .45], [.001, 1.15]], 6)), color, (x, y) => tmp.copy(c).multiplyScalar(.75 + .3 * (y + 1) / 2.15));
}

export function pebble(seed, color) {
  return boulder(seed, color, { detail: 0, rough: .2, flat: .65 });
}
