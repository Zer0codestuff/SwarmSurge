import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from '../vendor/addons/BufferGeometryUtils.js';
import { loftGeometry, sweepGeometry, patchGeometry } from './boss-shapes.js';
import { boulder } from './scenery-assets.js';

// Sculpted roadside props for worlds 36-50: harvest country, the prehistoric wilds and the cosmic finale.
// Same contract as scenery-assets.js: each builder returns one vertex-colored geometry
// standing on y = 0, ready for instanced scatter with a shared material.
const TAU = Math.PI * 2;
const col = new THREE.Color(), tmp = new THREE.Color();

function noise(x, y, z, s = 1) {
  return Math.sin(x * 1.7 + s * 1.3) * Math.sin(y * 2.1 + s * 2.9) * Math.sin(z * 1.9 + s * .7)
    + .5 * Math.sin(x * 3.7 - s) * Math.sin(y * 3.3 + s * 1.7) * Math.sin(z * 4.1 + s * 2.3);
}

// Writes color = base * shade(x, y, z); a shade that returns a Color replaces the base.
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

// Lumpy leaf drift raked off the trees.
export function leafPile(color = 0xd8721e) {
  const g = new THREE.SphereGeometry(.8, 10, 5, 0, TAU, 0, Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const d = 1 + .25 * noise(p.getX(i) * 2.4, 0, p.getZ(i) * 2.4, 3);
    p.setXYZ(i, p.getX(i) * d * 1.5, Math.max(0, p.getY(i)) * .3 * d, p.getZ(i) * d * 1.2);
  }
  g.computeVertexNormals();
  return paint(g, color, (x, y, z) => .66 + .34 * Math.abs(Math.sin(x * 6) * Math.cos(z * 6)));
}

// Fallen trunk with a pale sawn end and a stub branch.
export function fallenLog() {
  const parts = [paint(sweepGeometry([[-1.6, .34, 0], [-.8, .4, .05], [0, .38, 0], [.8, .42, -.06], [1.5, .36, 0]], [.42, .38, .36, .34, .26], { segments: 7, steps: 6 }), 0x6a4a2e,
    (x, y, z) => .76 + .24 * Math.abs(Math.cos(Math.atan2(z, x) * 7)) - (y > .6 ? .08 : 0))];
  for (const sx of [-1, 1]) {
    parts.push(paint(new THREE.CircleGeometry(sx > 0 ? .26 : .4, 10), 0xd8c49a).rotateY(sx * Math.PI / 2).translate(sx * 1.55, .36, 0));
  }
  parts.push(paint(sweepGeometry([[.4, .5, -.2], [.62, .72, -.3], [.7, .95, -.32]], [.07, .05, .03], { segments: 4, steps: 3 }), 0x5f4228, () => .9));
  return combine(parts);
}

// Small pond fish lying flat, facing +x.
export function koi() {
  const body = paint(new THREE.SphereGeometry(.16, 7, 5).scale(1.9, .5, .8), 0xff7a2a, (x, y) => .85 + .15 * y);
  const tail = paint(new THREE.ConeGeometry(.1, .26, 5).rotateZ(Math.PI / 2).scale(1, 1, .4).translate(-.34, .05, 0), 0xffd0a0);
  return combine([body.translate(0, .05, 0), tail]);
}

// Vermilion torii gate spanning x, pillars on the ground.
export function torii() {
  const red = 0xd8382a, dark = 0x8a2a1a, parts = [];
  for (const sx of [-1, 1]) {
    parts.push(paint(new THREE.CylinderGeometry(.13, .18, 2.6, 8).translate(sx * 1.1, 1.3, 0), red, (x, y) => .8 + .2 * y / 2.6));
    parts.push(paint(new THREE.CylinderGeometry(.22, .24, .2, 8).translate(sx * 1.1, .1, 0), dark));
  }
  parts.push(paint(new THREE.BoxGeometry(2.9, .22, .2).translate(0, 2.05, 0), red));
  parts.push(paint(sweepGeometry([[-1.7, 2.5, 0], [-1.35, 2.72, 0], [0, 2.82, 0], [1.35, 2.72, 0], [1.7, 2.5, 0]], [.15, .19, .21, .19, .15], { segments: 6, steps: 6 }), red, () => .95));
  parts.push(paint(new THREE.BoxGeometry(1.0, .4, .1).translate(0, 2.32, 0), dark));
  return combine(parts);
}

// Distant five-tier pagoda with flared roof brims.
export function pagoda(tiers = 5) {
  const parts = [];
  let y = 0, w = 3.2;
  for (let t = 0; t < tiers; t++) {
    const h = 1.7 - t * .18;
    const body = loftGeometry([[y, w * .78, w * .78, 0, 0, 4], [y + h, w * .68, w * .68, 0, 0, 4]], { segments: 12, steps: 2 });
    parts.push(paint(faceted(body), 0xe8e0d0, (x, py) => .8 + .2 * Math.min(1, Math.max(0, (py - y) / h))));
    const roof = lathe([[w * 1.12, y + h - .06], [w * .96, y + h + .14], [w * .6, y + h + .58], [w * .14, y + h + .98], [.001, y + h + 1.06]], 10);
    parts.push(paint(faceted(roof), 0x8a4a3a, (x, py) => .82 + .18 * Math.min(1, Math.max(0, (py - y - h) / 1.1))));
    y += h + 1.0; w *= .78;
  }
  parts.push(paint(new THREE.SphereGeometry(.17, 6, 4).translate(0, y + .08, 0), 0xffc84a));
  return combine(parts);
}

// Lumpy rounded mass used for tree canopies, moss clumps and smoke.
function blob(r, seed, squash = .8) {
  let g = new THREE.IcosahedronGeometry(r, 1);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const d = 1 + .22 * noise(p.getX(i) * 2.2, p.getY(i) * 2.2, p.getZ(i) * 2.2, seed);
    p.setXYZ(i, p.getX(i) * d, p.getY(i) * d * squash, p.getZ(i) * d);
  }
  g.computeVertexNormals();
  return g;
}

// ---------- harvest country (36-40) ----------

// Three arcing wheat blades with a grain ear each.
export function wheatTuft(seed = 1) {
  const parts = [];
  for (let b = 0; b < 3; b++) {
    const a = b * 2.1 + seed, dx = Math.cos(a) * .09 * (b + 1) / 3, dz = Math.sin(a) * .09 * (b + 1) / 3;
    parts.push(paint(sweepGeometry([[0, 0, 0], [dx * .5, .4, dz * .5], [dx, .8, dz], [dx * 1.5, 1.05, dz * 1.5]], [.032, .026, .018, .006], { segments: 3, steps: 4 }), b % 2 ? 0xe8c25a : 0xd8a83a, (x, y) => .8 + .2 * Math.min(1, y / 1.05)));
    parts.push(paint(lathe([[.001, 0], [.05, .09], [.052, .2], [.001, .28]], 5), 0xf0d878, (x, y) => .82 + .3 * Math.abs(Math.sin(y * 34))).translate(dx * 1.5, 1.02, dz * 1.5));
  }
  return combine(parts);
}

// Rolled hay bale lying on its side with a spiral swirl and two binding rings.
export function hayBale() {
  const body = new THREE.CylinderGeometry(.85, .85, 1.5, 14);
  body.rotateX(Math.PI / 2); body.translate(0, .85, 0);
  const parts = [paint(faceted(body), 0xd8b45a, (x, y) => {
    const a = Math.atan2(y - .85, x);
    return .74 + .26 * (.5 + .5 * Math.sin(a * 3 + Math.hypot(x, y - .85) * 2.4));
  })];
  for (const sz of [-.42, .42]) {
    parts.push(paint(new THREE.TorusGeometry(.86, .04, 5, 14).rotateX(Math.PI / 2).translate(0, .85, sz), 0xb0903e, () => .9));
  }
  return combine(parts);
}

// Three fence posts with two sagging rails, weathered wood.
export function fenceRun() {
  const parts = [];
  for (let p = 0; p < 3; p++) {
    const x = (p - 1) * 1.5, h = .95 + (p % 2) * .14;
    parts.push(paint(sweepGeometry([[x, 0, 0], [x + .03, h * .6, 0], [x, h, 0]], [.09, .07, .05], { segments: 5, steps: 3 }), 0x9a7a4a, (px, py) => .78 + .22 * py / h));
  }
  for (const y of [.38, .74]) {
    parts.push(paint(sweepGeometry([[-1.55, y + .05, 0], [0, y - .07, 0], [1.55, y + .05, 0]], [.05, .042, .05], { segments: 4, steps: 4 }), 0x7a5a32, () => .92));
  }
  return combine(parts);
}

// Red barn with gambrel roof, white trim, X-braced door and hay door.
export function barn() {
  const walls = loftGeometry([[0, 2.7, 4.5, 0, 0, 4], [2.3, 2.7, 4.5, 0, 0, 4]], { segments: 16, steps: 2 });
  const roof = loftGeometry([[2.25, 3.05, 5.0, 0, 0, 4], [3.3, 2.1, 3.6, 0, 0, 4], [4.1, .75, 1.3, 0, 0, 4], [4.32, .01, .3, 0, 0, 4]], { segments: 16, steps: 4 });
  const parts = [
    paint(faceted(walls), 0xb8402e, (x, y) => .78 + .22 * Math.min(1, y / 2.3) + .06 * Math.abs(Math.sin(x * 3.1))),
    paint(faceted(roof), 0x7c4228, (x, y) => .8 + .2 * Math.min(1, y / 4.3)),
    paint(new THREE.BoxGeometry(1.5, 2.0, .1).translate(0, 1.0, 4.5), 0x6a4a2e),
  ];
  for (const s of [-1, 1]) parts.push(paint(new THREE.BoxGeometry(1.62, .12, .06).rotateZ(s * .75).translate(0, 1.0, 4.56), 0xf0e8dc));
  parts.push(paint(new THREE.BoxGeometry(1.7, .14, .12).translate(0, 2.02, 4.5), 0xf0e8dc));
  parts.push(paint(new THREE.BoxGeometry(.9, .8, .08).translate(0, 3.0, 4.32), 0x5a3a24));
  return combine(parts);
}

// Octagonal windmill tower with four lattice sails facing +z.
export function windmill() {
  const parts = [
    paint(lathe([[1.9, 0], [1.25, 2.6], [1.0, 5.6], [1.08, 6.1]], 8), 0xb0a08a, (x, y) => .76 + .24 * Math.min(1, y / 6)),
    paint(lathe([[1.25, 6.0], [1.05, 6.6], [.55, 7.0], [.001, 7.1]], 8), 0x6a5a48, (x, y) => .82 + .18 * (y - 6) / 1.1),
    paint(new THREE.SphereGeometry(.3, 8, 6).translate(0, 6.4, .9), 0x8a7a64),
  ];
  for (let s = 0; s < 4; s++) {
    const blade = patchGeometry([[-.32, 0], [.32, 0], [.26, 3.6], [0, 4.0], [-.26, 3.6]], .03, .02, { segments: 10, rings: 2 });
    blade.rotateZ(s * Math.PI / 2);
    blade.translate(0, 6.4, .92);
    parts.push(paint(blade, 0xe8dcc4, (x, y) => .82 + .18 * Math.abs(Math.sin(x * 5 + y * 2))));
  }
  return combine(parts);
}

// Broad-canopy tree with lumpy foliage and optional fruit.
export function fruitTree(seed = 1, { leaf = 0x3f9a3a, leaf2 = 0x2f8a30, trunk = 0x7a5a3a, fruit = 0xd83a2a, fruits = 7 } = {}) {
  const parts = [paint(sweepGeometry([[0, 0, 0], [.04, .55, 0], [-.05, 1.1, .03], [.02, 1.55, 0]], [.24, .18, .13, .09], { segments: 6, steps: 5 }), trunk, (x, y) => .74 + .26 * Math.min(1, y / 1.5))];
  for (let b = 0; b < 3; b++) {
    const c = blob(1.05 - b * .14, seed + b * 3, .82);
    c.translate((b - 1) * .78, 1.9 + (b % 2) * .38, b % 2 ? .42 : -.38);
    parts.push(paint(c, b % 2 ? leaf : leaf2, (x, y) => .8 + .2 * Math.min(1, Math.max(0, (y - 1.2) / 1.6))));
  }
  for (let f = 0; f < fruits; f++) {
    const a = f * 2.4 + seed, r = .92 + .2 * ((f + seed) % 3) / 3;
    parts.push(paint(new THREE.SphereGeometry(.13, 6, 4), fruit, () => .95).translate(Math.cos(a) * r, 1.5 + .8 * ((f * 7 + seed) % 4) / 4, Math.sin(a) * r));
  }
  return combine(parts);
}

// Woven wicker basket with a flared rim.
export function basket() {
  const g = lathe([[.001, 0], [.5, .02], [.62, .18], [.66, .5], [.6, .62], [.55, .58], [.56, .46], [.52, .2], [.4, .12], [.001, .12]], 12);
  return paint(faceted(g), 0xc09a52, (x, y, z) => .74 + .26 * Math.abs(Math.sin(y * 16) * .5 + Math.cos(Math.atan2(z, x) * 6) * .5));
}

// Self-standing orchard ladder with a rear leg.
export function ladder() {
  const wood = 0xb08a52, parts = [];
  for (const sx of [-1, 1]) {
    parts.push(paint(sweepGeometry([[sx * .42, 0, .3], [sx * .45, 1.2, .05], [sx * .1, 2.3, -.18]], [.055, .05, .045], { segments: 5, steps: 4 }), wood, (x, y) => .8 + .2 * y / 2.3));
    parts.push(paint(sweepGeometry([[sx * .42, 0, -.34], [sx * .3, 1.1, -.2], [sx * .1, 2.3, -.18]], [.05, .045, .045], { segments: 5, steps: 4 }), 0x9a7a44, (x, y) => .8 + .2 * y / 2.3));
  }
  for (let r = 0; r < 4; r++) {
    const t = .3 + r * .18, y = 2.3 * t, z = .3 - .48 * t, hw = .42 - .32 * t;
    parts.push(paint(sweepGeometry([[-hw, y, z], [0, y + .01, z], [hw, y, z]], [.035, .03, .035], { segments: 4, steps: 3 }), 0x9a7a44, () => .9));
  }
  return combine(parts);
}

// Rounded hill mound for rolling country.
export function hillMound(color = 0x6ab84a, seed = 1) {
  const g = new THREE.SphereGeometry(1, 14, 8, 0, TAU, 0, Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const d = 1 + .16 * noise(p.getX(i) * 1.4, 0, p.getZ(i) * 1.4, seed);
    p.setXYZ(i, p.getX(i) * d * 2.3, Math.max(0, p.getY(i)) * .42 * d, p.getZ(i) * d * 1.7);
  }
  g.computeVertexNormals();
  return paint(g, color, (x, y) => .86 + .14 * Math.min(1, y / .6));
}

// Segmented bamboo stalk with ring joints and drooping leaves.
export function bambooStalk(seed = 1) {
  const h = 4.4 + (seed % 3) * .8, lean = .06;
  const parts = [paint(sweepGeometry([[0, 0, 0], [lean, h * .35, 0], [-lean, h * .7, .04], [lean * 2, h, 0]], [.17, .14, .115, .09], { segments: 6, steps: 6 }), 0x7ab84a,
    (x, y) => .8 + .2 * y / h - .18 * (Math.abs(Math.sin(y * 4.2)) > .88 ? 1 : 0))];
  for (let l = 0; l < 5; l++) {
    const a = l * 1.55 + seed, len = .85 + .3 * ((l + seed) % 3) / 3;
    const leaf = patchGeometry([[-.07, 0], [.07, 0], [.05, len * .7], [0, len], [-.05, len * .7]], .015, .02, { segments: 7, rings: 1 });
    leaf.rotateX(1.3 + .25 * (l % 2));
    leaf.rotateY(a);
    leaf.translate(Math.cos(a) * .12, h - .1 - l * .32, Math.sin(a) * .12);
    parts.push(paint(leaf, 0x8ac85a, (x, y) => .82 + .18 * Math.min(1, Math.max(0, y) / len)));
  }
  return combine(parts);
}

// Cluster of four leaning stalks.
export function bambooGrove(seed = 1) {
  const parts = [];
  [[0, 0, 1], [.5, .18, .78], [-.42, -.14, .9], [.12, -.42, .62]].forEach(([x, z, s], i) => {
    parts.push(place(bambooStalk(seed + i * 2), x, 0, z, 0, i * 1.7, 0, s));
  });
  return combine(parts);
}

// Pagoda stone lantern with a warm lit chamber.
export function stoneLantern() {
  const stone = 0xa8ae9e, dark = 0x6e7466;
  const parts = [
    paint(lathe([[.55, 0], [.6, .1], [.32, .16], [.24, .3], [.28, .44], [.001, .44]], 8), stone, (x, y) => .8 + .2 * y / .44),
    paint(new THREE.CylinderGeometry(.13, .17, .85, 6).translate(0, .85, 0), stone),
    paint(new THREE.BoxGeometry(.5, .46, .5).translate(0, 1.5, 0), 0xf2de9e, (x, y) => .9 + .1 * y),
    paint(lathe([[.6, 1.74], [.42, 1.88], [.56, 2.04], [.32, 2.22], [.08, 2.34], [.001, 2.38]], 8), dark, (x, y) => .84 + .16 * (y - 1.74) / .64),
    paint(new THREE.SphereGeometry(.08, 6, 4).translate(0, 2.44, 0), 0xc8cec0),
  ];
  for (const [dx, dz, ry] of [[0, .26, 0], [0, -.26, 0], [.26, 0, Math.PI / 2], [-.26, 0, Math.PI / 2]]) {
    parts.push(paint(new THREE.BoxGeometry(.3, .26, .02).rotateY(ry).translate(dx, 1.5, dz), 0x2a241c));
  }
  return combine(parts);
}

// Arched footbridge with plank deck and rail posts, spanning x by default.
export function bridge(span = 5.4, width = 1.7) {
  const wood = 0xb08a52, rail = 0x8a6238, N = 7, parts = [];
  for (let i = 0; i < N; i++) {
    const t = (i + .5) / N, x = (t - .5) * span, y = Math.sin(t * Math.PI) * span * .17;
    const plank = paint(new THREE.BoxGeometry(span / N * .95, .1, width), wood, () => (i % 2 ? .86 : 1));
    plank.rotateZ(Math.cos(t * Math.PI) * .5);
    plank.translate(x, y, 0);
    parts.push(plank);
  }
  for (const sz of [-1, 1]) {
    parts.push(paint(sweepGeometry([[-span / 2, .02, sz * width / 2], [0, span * .17 + .1, sz * width / 2], [span / 2, .02, sz * width / 2]], [.07, .06, .07], { segments: 5, steps: 7 }), rail, () => .9));
    for (const px of [-span / 2 + .3, 0, span / 2 - .3]) {
      const py = Math.sin((px / span + .5) * Math.PI) * span * .17;
      parts.push(paint(new THREE.CylinderGeometry(.045, .05, .52, 5).translate(px, py + .26, sz * width / 2), rail));
    }
  }
  return combine(parts);
}

// ---------- prehistoric wilds (41-45) ----------

// Ground fern: six flattened arcing fronds.
export function fern(seed = 1) {
  const parts = [];
  for (let f = 0; f < 6; f++) {
    const a = f / 6 * TAU + seed, len = 1.05 + .3 * ((f * 5 + seed) % 3) / 3, lift = .75 + .2 * ((f * 3 + seed) % 3) / 3;
    const ca = Math.cos(a), sa = Math.sin(a);
    parts.push(paint(sweepGeometry([[0, .1, 0], [ca * len * .45, .1 + lift * len * .5, sa * len * .45], [ca * len, .1 + lift * len * .62 - .22, sa * len]], [.05, .04, .012], { segments: 3, steps: 5, flatten: .22 }), f % 2 ? 0x3a8a3a : 0x2f7a30, (x, y) => .78 + .22 * Math.min(1, Math.max(0, y) / 1.1)));
  }
  return combine(parts);
}

// Cycad: squat trunk with a crown of stiff upright fronds.
export function cycad(seed = 1) {
  const parts = [paint(lathe([[.001, 0], [.3, .1], [.24, .7], [.18, 1.0], [.001, 1.04]], 8), 0x8a6a3a, (x, y) => .76 + .24 * y / 1.04)];
  for (let f = 0; f < 8; f++) {
    const a = f / 8 * TAU + seed, ca = Math.cos(a), sa = Math.sin(a), len = .9 + .3 * ((f + seed) % 3) / 3;
    parts.push(paint(sweepGeometry([[0, 1.0, 0], [ca * len * .5, 1.0 + len * .55, sa * len * .5], [ca * len, 1.0 + len * .38, sa * len]], [.055, .045, .014], { segments: 3, steps: 4, flatten: .3 }), f % 2 ? 0x3a8a3a : 0x2f7a30, () => .9));
  }
  return combine(parts);
}

// Twig nest bowl with a noisy rim and a clutch of eggs.
export function nestEggs(seed = 1, eggs = 3) {
  const parts = [paint(lathe([[.001, 0], [.72, .03], [.98, .28], [1.04, .72], [.94, .96], [.8, .9], [.86, .58], [.6, .26], [.001, .2]], 14), 0x9a7a4a,
    (x, y, z) => .62 + .38 * Math.abs(Math.sin(Math.atan2(z, x) * 7 + seed) * Math.sin(y * 9 + seed * 2)))];
  for (let e = 0; e < eggs; e++) {
    const a = e * 2.4 + seed;
    parts.push(paint(new THREE.SphereGeometry(.27, 8, 6).scale(1, 1.28, 1), e % 2 ? 0xf2ecdc : 0xe4ecd6, (x, y) => .84 + .16 * (y + .35) / .7).translate(Math.cos(a) * .34, .56, Math.sin(a) * .34));
  }
  return combine(parts);
}

// Fossil rib cage: curved spine with alternating rib arcs.
export function ribCage(seed = 1) {
  const bone = 0xe8e0cc;
  const parts = [paint(sweepGeometry([[-1.8, 1.2, 0], [0, 1.5, 0], [1.8, 1.15, 0]], [.12, .14, .12], { segments: 5, steps: 5 }), bone, (x, y) => .8 + .2 * Math.min(1, y / 1.5))];
  for (let r = 0; r < 5; r++) {
    const x = -1.3 + r * .62, h = 1.45 - Math.abs(x) * .18, w = .95 - r * .06, s = r % 2 ? 1 : -1;
    parts.push(paint(sweepGeometry([[x, h, 0], [x + .15 * s, h + .12, s * w * .7], [x + .05 * s, h - .3, s * w]], [.07, .058, .042], { segments: 4, steps: 5 }), bone, () => .92));
  }
  return combine(parts);
}

// Single weathered bone lying flat with knobbed ends.
export function bone() {
  const bone = 0xe8e0cc, sh = (x, y) => .78 + .22 * Math.min(1, y / .4);
  const parts = [paint(sweepGeometry([[-.9, .14, 0], [0, .18, 0], [.9, .14, 0]], [.09, .08, .09], { segments: 5, steps: 3 }), bone, sh)];
  for (const ex of [-1, 1]) for (const [dy, dz, r] of [[.1, .08, .13], [-.06, -.08, .12], [.1, -.08, .11], [-.06, .08, .11]]) {
    parts.push(paint(new THREE.SphereGeometry(r, 6, 4), bone, sh).translate(ex * .95, .14 + dy, dz));
  }
  return combine(parts);
}

// Swamp cypress: buttressed trunk, mossy crown and hanging strands.
export function cypress(seed = 1) {
  const parts = [paint(sweepGeometry([[0, 0, 0], [.1, .7, 0], [-.06, 1.9, .05], [.04, 3.2, 0]], [.8, .42, .3, .2], { segments: 7, steps: 6 }), 0x655743, (x, y) => .74 + .26 * Math.min(1, y / 3.2))];
  const moss = [0x4a7038, 0x54783c, 0x446834];
  for (let b = 0; b < 3; b++) {
    const c = blob(1.25 - b * .18, seed + b * 5, .85);
    c.translate(0, 3.1 + b * .95, 0);
    parts.push(paint(c, moss[b], (x, y) => .76 + .24 * Math.min(1, Math.max(0, (y - 2.4) / 2))));
  }
  for (let s = 0; s < 4; s++) {
    const a = s * 1.75 + seed, r = .85 + .25 * (s % 2), top = 3.4 - (s % 3) * .5;
    parts.push(paint(sweepGeometry([[Math.cos(a) * r, top, Math.sin(a) * r], [Math.cos(a) * (r + .12), top - .9, Math.sin(a) * (r + .12)], [Math.cos(a) * (r - .06), top - 1.9 - .3 * (s % 2), Math.sin(a) * (r - .06)]], [.04, .028, .014], { segments: 3, steps: 4 }), 0x7e8f56, () => .88));
  }
  return combine(parts);
}

// Flat lily pad with a notch cut out.
export function lilyPad() {
  const g = new THREE.CircleGeometry(.75, 9, .55, TAU - 1.1);
  g.rotateX(-Math.PI / 2);
  return paint(g, 0x3f8a3a, (x, y, z) => .82 + .18 * Math.abs(Math.sin(x * 3 + z * 2)));
}

// Lily pad with a small blossom.
export function lilyBloom() {
  const flower = lathe([[.001, .02], [.16, .05], [.1, .14], [.001, .17]], 6);
  return combine([lilyPad(), paint(faceted(flower), 0xffb0c8, (x, y) => .88 + .12 * y * 5).translate(0, .03, 0)]);
}

// Cattail reed clump.
export function reeds(seed = 1) {
  const parts = [];
  for (let r = 0; r < 5; r++) {
    const a = r * 1.9 + seed * .7, x = Math.cos(a) * .28 * r, z = Math.sin(a) * .28 * r;
    const h = 1.3 + .5 * ((r * 3 + seed) % 4) / 4;
    parts.push(paint(sweepGeometry([[x, 0, z], [x + .07, h * .55, z], [x + .03, h, z]], [.032, .022, .01], { segments: 3, steps: 3 }), 0x5f8a3a, (px, py) => .78 + .22 * py / h));
    if (r % 2) parts.push(paint(new THREE.SphereGeometry(.055, 5, 4).scale(1, 2.4, 1).translate(x + .03, h + .08, z), 0x8a5a2a, () => .95));
  }
  return combine(parts);
}

// Glossy tar pool with a raised rim and dark bubble domes.
export function tarPool(seed = 1) {
  const parts = [paint(lathe([[2.0, .06], [1.88, .02], [1.4, -.01], [.8, 0], [.001, .04]], 16), 0x101016, (x, y) => .9 + .1 * Math.min(1, y + .1))];
  for (let b = 0; b < 3; b++) {
    const a = b * 2.1 + seed, r = .22 + .3 * ((b + seed) % 3) / 3;
    parts.push(paint(new THREE.SphereGeometry(r, 7, 5).scale(1, .45, 1).translate(Math.cos(a) * 1.1, .1, Math.sin(a) * 1.1), 0x1c1c26, () => 1));
  }
  return combine(parts);
}

// Steam vent mound with a dark open throat.
export function steamVent(seed = 1) {
  const g = boulder(seed, 0x4c3c30, { rough: .3, flat: .55 });
  g.scale(1.35, .95, 1.35);
  return paint(g, 0x4c3c30, (x, y, z) => (y > .4 && Math.hypot(x, z) < .48 ? .1 : .74 + .26 * Math.min(1, y + .2)));
}

// Round amber nodule with a trapped insect silhouette on its face.
export function insectAmber(seed = 1) {
  const n = blob(.55, seed, .78);
  n.translate(0, .42, 0);
  const dark = 0x2c1a0c;
  const parts = [
    paint(n, 0xe89a28, (x, y) => .8 + .35 * Math.min(1, Math.max(0, y) + .2)),
    paint(new THREE.SphereGeometry(.09, 6, 4).scale(1, .8, 1.7).translate(0, .46, .38), dark),
    paint(new THREE.SphereGeometry(.05, 5, 4).translate(0, .52, .5), dark),
  ];
  for (const sw of [-1, 1]) parts.push(paint(new THREE.SphereGeometry(.11, 5, 4).scale(1.6, .12, .7).rotateY(sw * .5).translate(sw * .17, .52, .33), 0x4a3014));
  return combine(parts);
}

// Faceted amber spike; pass down = true for a ceiling stalactite.
export function amberSpike(len = 3, r = .45, down = false) {
  const g = faceted(lathe([[.001, 0], [r, len * .12], [r * .82, len * .68], [r * .3, len * .92], [.001, len]], 6));
  const c = new THREE.Color(0xffb02a);
  paint(g, 0xffb02a, (x, y) => tmp.copy(c).multiplyScalar(.62 + .5 * y / len));
  if (down) { g.rotateX(Math.PI); g.translate(0, len, 0); }
  return g;
}

// Tall craggy rock spire, for cliff-top worlds.
export function spireRock(seed = 1, color = 0xb09a78) {
  const g = loftGeometry([[0, 1.0, 1.0], [1.6, .78, .82], [3.4, .55, .52], [5.0, .34, .3], [6.0, .02, .02]], {
    segments: 9, steps: 7, warp: (x, y, z, u, v, a) => { const f = 1 + .32 * noise(Math.cos(a) * 1.6, y * .4, Math.sin(a) * 1.6, seed); return [x * f, y, z * f]; },
  });
  return paint(faceted(g), color, (x, y) => .68 + .32 * Math.min(1, y / 5));
}

// ---------- cosmic finale (46-50) ----------

// Triangular glass prism with faint spectral faces; use a translucent material.
export function glassPrism() {
  const g = faceted(new THREE.CylinderGeometry(.7, .7, 1.3, 3).translate(0, .65, 0));
  return paint(g, 0xffffff, (x, y, z) => tmp.setHSL(((Math.atan2(z, x) / TAU) + .6) % 1, .7, .8));
}

// White display pedestal with a molded cap and base.
export function pedestal() {
  return paint(lathe([[.6, 0], [.63, .08], [.5, .14], [.4, .9], [.5, 1.0], [.56, 1.06], [.001, 1.06]], 10), 0xf0f2f6, (x, y) => .84 + .16 * Math.min(1, y / 1.06));
}

// Lab emitter post with a pale glow tip.
export function laserPost() {
  return combine([
    paint(new THREE.CylinderGeometry(.1, .16, 2.2, 8).translate(0, 1.1, 0), 0xe8ecf4, (x, y) => .8 + .2 * y / 2.2),
    paint(new THREE.CylinderGeometry(.3, .3, .18, 8).translate(0, 2.28, 0), 0xc0c8d8),
    paint(new THREE.SphereGeometry(.14, 8, 6).translate(0, 2.5, 0), 0x8af0ff),
  ]);
}

// Flat tech panel with bright connector strips.
export function techPanel() {
  const cols = [0x3ad0ff, 0xff4fd8, 0x8aff4a, 0xffd21a];
  const parts = [paint(new THREE.BoxGeometry(2.2, .1, 1.6).translate(0, .05, 0), 0xe8ecf2, () => .86)];
  for (let k = 0; k < 4; k++) parts.push(paint(new THREE.BoxGeometry(.34, .05, 1.1).translate(-.75 + k * .5, .12, 0), cols[k]));
  return combine(parts);
}

// Brass clock tower with pale faces on opposite sides, dark hands and a pointed cap.
export function clockTower() {
  const brass = 0xb08a3a, dark = 0x6a4a1a;
  const parts = [paint(lathe([[1.1, 0], [1.0, .4], [.8, 3.2], [.72, 5.4], [.001, 5.5]], 8), brass, (x, y) => .76 + .24 * y / 5.5)];
  for (const sz of [1, -1]) {
    parts.push(paint(new THREE.CylinderGeometry(.72, .72, .12, 16).rotateX(Math.PI / 2).translate(0, 4.3, sz * .74), 0xf5efdc));
    parts.push(paint(new THREE.TorusGeometry(.72, .07, 6, 16).translate(0, 4.3, sz * .78), dark));
    parts.push(paint(new THREE.BoxGeometry(.07, .52, .05).translate(0, 4.42, sz * .84), dark));
    parts.push(paint(new THREE.BoxGeometry(.05, .38, .05).rotateZ(sz > 0 ? .9 : 2.2).translate(sz > 0 ? .1 : -.1, 4.26, sz * .84), dark));
  }
  parts.push(paint(lathe([[.9, 5.45], [.68, 5.9], [.3, 6.4], [.001, 6.55]], 8), dark, (x, y) => .8 + .2 * (y - 5.45) / 1.1));
  parts.push(paint(new THREE.SphereGeometry(.12, 6, 4).translate(0, 6.64, 0), 0xffc84a));
  return combine(parts);
}

// A-frame stand with a tilted pendulum rod and bob.
export function pendulum() {
  const brass = 0xb08a3a, parts = [];
  for (const sx of [-1, 1]) {
    parts.push(paint(sweepGeometry([[sx * .9, 0, 0], [sx * .5, 2.2, 0], [sx * .35, 2.6, 0]], [.08, .06, .05], { segments: 5, steps: 3 }), brass, (x, y) => .8 + .2 * y / 2.6));
  }
  parts.push(paint(new THREE.CylinderGeometry(.05, .05, 1.7, 6).rotateX(Math.PI / 2).translate(0, 2.55, 0), brass));
  parts.push(paint(sweepGeometry([[0, 2.5, 0], [.35, 1.3, 0], [.5, .38, 0]], [.045, .04, .035], { segments: 4, steps: 4 }), 0xd0a850, () => .92));
  parts.push(paint(new THREE.CylinderGeometry(.3, .34, .14, 10).rotateX(Math.PI / 2).translate(.52, .32, 0), 0xd0a850));
  return combine(parts);
}

// Brass-framed hourglass with pale bulbs and sand below.
export function hourglass() {
  const glass = 0xdceef2, sand = 0xe8c05a, brass = 0x9a7a2a;
  const parts = [
    paint(lathe([[.55, 0], [.58, .08], [.58, .16], [.001, .16]], 10), brass, () => .9),
    paint(lathe([[.55, 1.98], [.58, 2.06], [.58, 2.14], [.001, 2.14]], 10), brass, () => .9),
    paint(lathe([[.001, .16], [.4, .2], [.17, .78], [.14, 1.05], [.001, 1.05]], 12), glass, (x, y) => .86 + .14 * y / 1.05),
    paint(lathe([[.001, 1.12], [.14, 1.12], [.18, 1.4], [.4, 1.98], [.001, 2.0]], 12), glass, (x, y) => .86 + .14 * (y - 1.1) / .95),
    paint(lathe([[.001, .18], [.3, .22], [.12, .5], [.001, .52]], 10), sand, () => .95),
  ];
  for (let k = 0; k < 3; k++) {
    const a = k * TAU / 3 + .5;
    parts.push(paint(new THREE.CylinderGeometry(.035, .035, 1.9, 5).translate(Math.cos(a) * .42, 1.07, Math.sin(a) * .42), brass));
  }
  return combine(parts);
}

// Rainbow jellyfish: bell plus five drifting tentacles; use an additive material.
export function jelly(seed = 1) {
  const parts = [paint(lathe([[.001, .95], [.4, .92], [.7, .68], [.76, .3], [.58, .02], [.001, 0]], 12), 0xffffff,
    (x, y, z) => tmp.setHSL((.55 + .22 * Math.sin(seed * 2.3 + Math.atan2(z, x) * 2) + 1) % 1, .75, .58 + .2 * y / .95))];
  for (let t = 0; t < 5; t++) {
    const a = t * 1.26 + seed;
    parts.push(paint(sweepGeometry([[Math.cos(a) * .52, .04, Math.sin(a) * .52], [Math.cos(a) * .66, -.5, Math.sin(a) * .66], [Math.cos(a) * .4, -1.05, Math.sin(a) * .4]], [.045, .03, .016], { segments: 3, steps: 4 }), 0xffffff, () => .92));
  }
  return combine(parts);
}

// Golden crown with pointed spikes and pearl tips; float it with scatter y.
export function crownProp() {
  const gold = 0xffd86a;
  const parts = [paint(lathe([[.42, 0], [.47, .08], [.5, .3], [.47, .42], [.001, .42]], 12), gold, (x, y) => .78 + .22 * y / .42)];
  for (let p = 0; p < 6; p++) {
    const a = p / 6 * TAU;
    parts.push(paint(new THREE.ConeGeometry(.09, .3, 5).translate(Math.cos(a) * .44, .52, Math.sin(a) * .44), 0xffe08a, () => .95));
    parts.push(paint(new THREE.SphereGeometry(.05, 5, 4).translate(Math.cos(a) * .44, .7, Math.sin(a) * .44), 0xfff0b0, () => 1));
  }
  return combine(parts);
}
