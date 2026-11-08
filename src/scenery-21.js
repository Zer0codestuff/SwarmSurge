import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';
import { loftGeometry, sweepGeometry, patchGeometry } from './boss-shapes.js';
import { boulder } from './scenery-assets.js';

// Sculpted roadside props for the worlds 21-35 biomes. Same contract as scenery-assets.js:
// each builder returns one vertex-colored geometry standing on y = 0, for instanced scatter.
const TAU = Math.PI * 2;
const col = new THREE.Color(), tmp = new THREE.Color(), tmpA = new THREE.Color(), tmpB = new THREE.Color();

function noise(x, y, z, s = 1) {
  return Math.sin(x * 1.7 + s * 1.3) * Math.sin(y * 2.1 + s * 2.9) * Math.sin(z * 1.9 + s * .7)
    + .5 * Math.sin(x * 3.7 - s) * Math.sin(y * 3.3 + s * 1.7) * Math.sin(z * 4.1 + s * 2.3);
}

// Writes color = base * shade(x, y, z), keeping any existing shade as a factor.
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

const rise = (y1, lo = .78) => (x, y) => lo + (1 - lo) * Math.min(1, Math.max(0, y / y1));

// Horizontal band stripes and radial stripes painted from two colors.
function bandTone(a, b, k, phase = 0) {
  tmpA.set(a); tmpB.set(b);
  return (x, y) => tmp.copy(Math.sin(y * k + phase) > 0 ? tmpA : tmpB);
}
function radialTone(a, b, teeth = 8, phase = 0) {
  tmpA.set(a); tmpB.set(b);
  return (x, y, z) => tmp.copy(Math.cos(Math.atan2(z, x) * teeth + phase) > 0 ? tmpA : tmpB);
}
// Pale speckles over a base color (mushroom caps, candy, snow).
function spots(base, spot, scale = 2.2, threshold = .52, seed = 3) {
  tmpA.set(base); tmpB.set(spot);
  return (x, y, z) => tmp.copy(noise(x * scale, y * scale, z * scale, seed) > threshold ? tmpB : tmpA);
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

function starShape(color, r, depth = .14) {
  const shape = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * TAU - Math.PI / 2, rr = k % 2 ? r * .45 : r;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (k) shape.lineTo(x, y); else shape.moveTo(x, y);
  }
  shape.closePath();
  return paint(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -depth / 2), color, (x, y) => .8 + .2 * (y + r) / (2 * r));
}

// ---------- arc 1: pinball plaza, toy town, bubble bath, bounce castle, tilt palace ----------

// Pinball bumper: dark plinth, cushioned body, bright band. Pair with bumperCap for a lit top.
export function bumper(body = 0x35e0ff, band = 0xff4fd8) {
  return combine([
    paint(lathe([[1.04, 0], [1.04, .14], [.78, .24], [.6, .26]], 20), 0x241c44, rise(.26, .8)),
    paint(lathe([[.6, .24], [.76, .52], [.68, .92], [.5, 1.12]], 20), body, rise(1.12, .74)),
    paint(lathe([[.52, 1.1], [.56, 1.22], [.4, 1.32], [.26, 1.34]], 20), band),
  ]);
}
export function bumperCap(color = 0xffd21a) {
  return paint(lathe([[.38, 0], [.3, .12], [.15, .2], [.001, .22]], 16), color);
}

// Rollover lane light: slim post with a flat lens on top. Pair with rolloverLens.
export function rollover(color = 0x3affd0) {
  return combine([
    paint(lathe([[.26, 0], [.2, .1], [.11, .22], [.1, 1.4], [.13, 1.58], [.001, 1.6]], 10), 0x241c44, rise(1.6, .74)),
    paint(lathe([[.001, 1.52], [.28, 1.54], [.4, 1.64], [.28, 1.74], [.001, 1.76]], 14), color),
  ]);
}
export function rolloverLens(color = 0xaffff0) {
  return paint(lathe([[.001, 1.5], [.3, 1.52], [.42, 1.63], [.3, 1.75], [.001, 1.77]], 14), color);
}

// Shiny pinball resting in a shallow cradle.
export function steelBall() {
  return combine([
    paint(lathe([[.86, 0], [.82, .16], [.62, .22], [.5, .22]], 18), 0x241c44, rise(.22, .8)),
    paint(place(new THREE.SphereGeometry(.58, 18, 12), 0, .44, 0), 0xd6deec, (x, y, z) => {
      const d = Math.max(0, (x * .45 + y * .8 + z * .25) / .95);
      return .58 + .42 * d;
    }),
  ]);
}

// Low curved ball-return guide along the lane.
export function laneGuide(color = 0x3affd0) {
  return paint(sweepGeometry([[0, 0, 0], [0, .26, .9], [.1, .44, 1.9], [.14, .44, 2.8]], [.15, .17, .17, .13], { segments: 7, steps: 12 }), color, rise(.45, .76));
}

// Rounded toy block with studs on top and a letter, dots or plus on every face.
export function toyBlock(color = 0xff6a4a, kind = 0) {
  const body = loftGeometry([[0, .9, .9, 0, 0, .3], [1.0, 1.0, 1.0, 0, 0, .27], [2.0, .9, .9, 0, 0, .3]], { segments: 18, steps: 6 });
  const parts = [paint(body, color, (x, y) => .78 + .22 * y / 2)];
  for (const [sx, sz] of [[-.44, -.44], [.44, -.44], [-.44, .44], [.44, .44]]) {
    parts.push(paint(new THREE.CylinderGeometry(.17, .17, .2, 10).translate(sx, 2.05, sz), color, () => .94));
  }
  // letter strokes as thin plates on all four side faces
  const plateX = (w, h, y, z, tilt = 0) => { for (const sx of [-1, 1]) parts.push(paint(new THREE.BoxGeometry(.06, h, w).rotateX(tilt).translate(sx * 1.04, y, z), 0xfff4e0)); };
  const plateZ = (w, h, y, x, tilt = 0) => { for (const sz of [-1, 1]) parts.push(paint(new THREE.BoxGeometry(w, h, .06).rotateY(tilt).translate(x, y, sz * 1.04), 0xfff4e0)); };
  if (kind === 0) {
    for (const fn of [plateX, plateZ]) {
      fn(1.0, .15, .95, -.42, .56); fn(1.0, .15, .95, .42, -.56); fn(.62, .15, .45, 0, 0);
    }
  } else if (kind === 1) {
    for (const [py, pu] of [[.6, .32], [1.3, .32], [.6, -.32], [1.3, -.32]]) {
      for (const sx of [-1, 1]) {
        parts.push(paint(new THREE.CylinderGeometry(.13, .13, .07, 8).rotateX(Math.PI / 2).translate(sx * 1.04, py, pu), 0xfff4e0));
        parts.push(paint(new THREE.CylinderGeometry(.13, .13, .07, 8).rotateZ(Math.PI / 2).translate(pu, py, sx * 1.04), 0xfff4e0));
      }
    }
  } else if (kind === 2) {
    for (const fn of [plateX, plateZ]) { fn(.72, .15, .95, 0, 0); fn(.15, .72, .95, 0, 0); }
  } else {
    for (const fn of [plateX, plateZ]) { fn(.62, .15, 1.2, -.12, 0); fn(.62, .15, .7, -.12, 0); }
  }
  return combine(parts);
}

// Painted wooden spinning top with pale bands.
export function spinningTop(color = 0xff5a4a) {
  return paint(lathe([[.5, 0], [.52, .12], [.3, .3], [.56, .64], [.62, .84], [.4, 1.12], [.15, 1.32], [.06, 1.5], [.001, 1.54]], 16), color, (x, y) => (y > .3 && y < .62) || y > 1.1 ? tmp.set(0xfff0d8) : .8 + .2 * y / 1.5);
}

// Wax crayon with a darker tip and a pale paper band.
export function crayon(color = 0x2a7aff) {
  return combine([
    paint(new THREE.CylinderGeometry(.22, .22, 1.3, 8).translate(0, .85, 0), color, (x, y, z) => (.84 + .16 * y / 1.5) * (Math.abs(Math.sin(Math.atan2(z, x) * 2)) > .55 ? .88 : 1)),
    paint(new THREE.ConeGeometry(.22, .6, 8).translate(0, 1.8, 0), color, () => .82),
    paint(lathe([[.235, .35], [.235, .82], [.13, .97], [.001, .99]], 8), 0xfff4e0),
  ]);
}

// Toy rocket standing on three swept fins, with a porthole.
export function toyRocket() {
  const parts = [
    paint(lathe([[.5, 0], [.58, .3], [.58, 1.4], [.44, 2.3], [.2, 2.8], [.05, 3.0], [.001, 3.1]], 14), 0xeef2f8, (x, y) => (y > 2.4 ? tmp.set(0xe8443a) : .82 + .18 * y / 3.1)),
    paint(new THREE.TorusGeometry(.2, .055, 6, 12).translate(0, 1.7, .56), 0x3a6ad0),
    paint(new THREE.CircleGeometry(.17, 12).translate(0, 1.7, .57), 0x9ad8ff),
  ];
  for (let k = 0; k < 3; k++) {
    const fin = patchGeometry([[.42, .4], [.98, .06], [1.04, 0], [.42, 0]], .07, .02, { segments: 6, rings: 1 });
    parts.push(paint(place(fin, 0, 0, 0, 0, k * TAU / 3), 0xe8443a));
  }
  return combine(parts);
}

// Wooden train track piece: ballast, sleepers, two rails and rounded ends.
export function trainTrack() {
  const parts = [paint(new THREE.BoxGeometry(2.9, .12, 1.9).translate(0, .05, 0), 0x9a8a6a, rise(.1, .84))];
  for (let k = 0; k < 5; k++) parts.push(paint(new THREE.BoxGeometry(.32, .1, 1.6).translate(-1.12 + k * .56, .14, 0), 0xa8743a, rise(.2, .82)));
  for (const sz of [-.62, .62]) parts.push(paint(new THREE.BoxGeometry(2.7, .14, .18).translate(0, .3, sz), 0x6e4a2a, rise(.36, .8)));
  for (const sx of [-1.35, 1.35]) parts.push(paint(new THREE.CylinderGeometry(.16, .16, 1.7, 8).rotateX(Math.PI / 2).translate(sx, .3, 0), 0x6e4a2a));
  return combine(parts);
}

// Rubber duck: rounded body, head, orange beak, painted eyes and a raised tail.
export function duck(color = 0xffd21a) {
  return combine([
    paint(place(new THREE.SphereGeometry(.6, 14, 10), 0, .42, -.05, 0, 0, 0, [1.18, .74, .95]), color, rise(.9, .84)),
    paint(place(new THREE.SphereGeometry(.34, 12, 8), 0, .9, .38), color, () => .95),
    paint(place(new THREE.ConeGeometry(.13, .36, 8).rotateX(Math.PI / 2), 0, .9, .76), 0xff8a2a),
    paint(place(new THREE.SphereGeometry(.05, 6, 4), .15, .99, .58), 0x222a3a),
    paint(place(new THREE.SphereGeometry(.05, 6, 4), -.15, .99, .58), 0x222a3a),
    paint(place(new THREE.ConeGeometry(.2, .55, 8).rotateX(-1.95), 0, .58, -.66), color, () => .9),
  ]);
}

// Bath soap: oval bar with an embossed wave and a pale crest.
export function soapBar(color = 0xfff0f8) {
  const g = loftGeometry([[0, .78, .5, 0, 0, .42], [.4, .84, .54, 0, 0, .4], [.8, .78, .5, 0, 0, .42]], {
    segments: 20, steps: 5, warp: (x, y, z) => [x * 1.35, y, z],
  });
  return paint(g, color, (x, y) => .84 + .16 * y / .8 + (Math.abs(y - .6) < .14 ? .07 : 0));
}

// Puffy foam mound built from merged spheres.
export function foamHill() {
  return combine([
    place(paint(new THREE.SphereGeometry(.9, 12, 8), 0xffffff, (x, y) => .78 + .22 * Math.min(1, y / .8)), 0, .28, 0, 0, 0, 0, [1.4, .78, 1.2]),
    place(paint(new THREE.SphereGeometry(.58, 10, 7), 0xffffff, (x, y) => .8 + .2 * y), .95, .2, .3),
    place(paint(new THREE.SphereGeometry(.5, 10, 7), 0xf4faff, (x, y) => .8 + .2 * y), -.85, .16, -.3),
  ]);
}

// Sheet of six glossy bath tiles, laid flat.
export function tileSheet(a = 0x9ad4f0, b = 0xffb8dc) {
  const parts = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const tile = loftGeometry([[0, .4, .4, 0, 0, .3], [.09, .4, .4, 0, 0, .3]], { segments: 12, steps: 1 });
    parts.push(paint(place(tile, (i - 1) * .88, 0, (j - .5) * .88), (i + j) % 2 ? a : b));
  }
  return combine(parts);
}

// Cluster of soap bubbles; scatter with a transparent shell material.
export function bubbleCluster() {
  return combine([
    place(paint(new THREE.SphereGeometry(.5, 14, 10), 0xffffff), 0, .52, 0),
    place(paint(new THREE.SphereGeometry(.32, 10, 8), 0xffffff), .64, .36, .2),
    place(paint(new THREE.SphereGeometry(.26, 10, 8), 0xffffff), -.42, .84, .3),
  ]);
}

// Inflatable turret: stacked cushion bulges with a pale scallop ring.
export function inflatableTurret(color = 0xff4a6a) {
  return combine([
    paint(lathe([[1.05, 0], [1.12, .3], [.84, .72], [.96, 1.2], [.68, 1.7], [.8, 2.2], [.54, 2.7], [.6, 3.1], [.34, 3.5], [.001, 3.6]], 16), color, (x, y, z) => (Math.sin(y * 4.4) > .72 ? tmp.copy(tmpA.set(color)).lerp(tmpB.set(0xffffff), .4) : .78 + .22 * y / 3.6)),
    paint(place(new THREE.SphereGeometry(.32, 10, 8), 0, 3.76, 0), color, () => .95),
  ]);
}

// Balloon on a wobbly string with a glossy highlight.
export function balloon(color = 0xff4a6a) {
  tmpA.set(color); tmpB.set(0xffffff);
  return combine([
    paint(place(new THREE.SphereGeometry(.42, 14, 12), 0, 2.4, 0, 0, 0, 0, [1, 1.18, 1]), color, (x, y, z) => {
      const d = Math.max(0, (x * .5 + y * .85 + z * .3) / .75);
      return tmp.copy(tmpA).lerp(tmpB, .18 + .4 * d);
    }),
    paint(new THREE.ConeGeometry(.1, .16, 6).translate(0, 1.78, 0), color),
    paint(sweepGeometry([[0, 0, 0], [.09, .6, .04], [-.08, 1.1, -.05], [.05, 1.62, .02]], [.022, .022, .02, .018], { segments: 4, steps: 8 }), 0xd8d8e8),
  ]);
}

// Striped inflatable pillar with cushion rings.
export function inflatablePillar(a = 0xffd21a, b = 0xffffff) {
  return paint(lathe([[.5, 0], [.64, .35], [.56, .85], [.64, 1.35], [.56, 1.85], [.64, 2.35], [.5, 2.75], [.3, 2.92], [.001, 3.0]], 14), a, bandTone(a, b, 3.4, .5));
}

// Fairground bunting: rope sag between two poles with alternating flags.
export function bunting(a = 0xff4a6a, b = 0x2a7aff) {
  const parts = [
    paint(sweepGeometry([[-1.7, 1.5, 0], [-.6, .88, 0], [.6, .88, 0], [1.7, 1.5, 0]], [.03, .03, .03, .03], { segments: 4, steps: 10 }), 0xe8e8f0),
    paint(new THREE.CylinderGeometry(.05, .07, 1.6, 6).translate(-1.7, .8, 0), 0x8a6a4a),
    paint(new THREE.CylinderGeometry(.05, .07, 1.6, 6).translate(1.7, .8, 0), 0x8a6a4a),
  ];
  for (let k = 0; k < 6; k++) {
    const t = (k + .5) / 6, x = -1.7 + 3.4 * t, y = 1.5 - .62 * Math.sin(Math.PI * t);
    parts.push(paint(patchGeometry([[-.15, 0], [.15, 0], [0, -.36]], .03, .015, { segments: 5, rings: 1 }), k % 2 ? a : b).translate(x, y, .03));
  }
  return combine(parts);
}

// Grand marquee arch: gold sweep on plinths. Pair with archBulbs for the lit bulbs.
export function marqueeArch(gold = 0xffd21a) {
  const arch = sweepGeometry([[-1.7, 0, 0], [-1.5, 1.7, 0], [0, 2.6, 0], [1.5, 1.7, 0], [1.7, 0, 0]], [.2, .17, .16, .17, .2], { segments: 10, steps: 16 });
  return combine([
    paint(arch, gold, (x, y) => .8 + .2 * y / 2.6),
    paint(new THREE.CylinderGeometry(.3, .38, .55, 10).translate(-1.7, .27, 0), 0x3a2a5a),
    paint(new THREE.CylinderGeometry(.3, .38, .55, 10).translate(1.7, .27, 0), 0x3a2a5a),
    paint(new THREE.SphereGeometry(.22, 10, 8).translate(0, 2.72, 0), gold, () => .95),
  ]);
}
// Bulb string hugging the same arc as marqueeArch (scatter both with identical matrices).
export function archBulbs(color = 0xfff0a0) {
  const parts = [];
  const c = .744, r = 1.856, a0 = -.412, span = 3.966;
  for (let k = 0; k <= 6; k++) {
    const a = a0 + span * k / 6;
    parts.push(paint(new THREE.SphereGeometry(.14, 8, 6).translate(Math.cos(a) * r * 1.05, c + Math.sin(a) * r * 1.05, 0), k % 2 ? color : 0xffffff));
  }
  return combine(parts);
}

// Giant flipper statue on a round pedestal: fat lacquered bat with a pale tip band.
export function flipperStatue(color = 0xd8203c) {
  const bat = sweepGeometry([[0, 2.3, 0], [1.0, 2.5, .06], [2.0, 2.28, .12], [2.55, 1.95, .14]], [.5, .44, .32, .12], { segments: 8, steps: 14, flatten: .5 });
  return combine([
    paint(lathe([[1.0, 0], [1.06, .25], [.8, .62], [.6, .82], [.55, 2.0], [.001, 2.12]], 16), 0xe8e2d2, rise(2.1, .76)),
    paint(place(bat, -.2, 0, 0, 0, .1, 0), color, (x, y) => (x > 1.9 ? tmp.set(0xfff4e0) : .8 + .2 * (y - 1.9) / .7)),
    paint(starShape(0xffd21a, .3, .1).translate(-.9, 2.02, 0), 0xffd21a),
  ]);
}

// Star ornament on a slim post.
export function starPost(color = 0xffd21a) {
  return combine([
    paint(new THREE.CylinderGeometry(.07, .1, 2.0, 8).translate(0, 1.0, 0), 0x3a2a5a),
    paint(starShape(color, .5).translate(0, 2.45, 0), color),
  ]);
}

// ---------- arc 2: mushroom grove, circus, dream clouds, bazaar, hypno palace ----------

// Giant glowing toadstool; scatter with a tinted emissive material for the glow.
export function giantMushroom(cap = 0xff4a4a, s = 1) {
  return combine([
    paint(sweepGeometry([[0, 0, 0], [.08 * s, 1.1 * s, 0], [-.05 * s, 2.1 * s, .04 * s], [0, 2.9 * s, 0]], [.34 * s, .27 * s, .24 * s, .2 * s], { segments: 8, steps: 10 }), 0xf0e8d8, rise(2.9 * s, .78)),
    paint(lathe([[.001, 3.9 * s], [.55 * s, 3.8 * s], [1.15 * s, 3.45 * s], [1.5 * s, 2.95 * s], [1.42 * s, 2.8 * s], [.9 * s, 2.82 * s], [.35 * s, 2.9 * s], [.001, 2.92 * s]], 18), cap, spots(cap, 0xfff4e0, 2.2 * s, .5, 4)),
  ]);
}

// Fern: six arched fronds from a shared crown.
export function fern(color = 0x3a8a4a) {
  const parts = [];
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * TAU + .3, len = .95 + (k % 3) * .2, ca = Math.cos(a), sa = Math.sin(a);
    parts.push(paint(sweepGeometry([[0, .07, 0], [ca * .3, .36, sa * .3], [ca * len * .78, .42, sa * len * .78], [ca * len, .2, sa * len]], [.05, .05, .04, .012], { segments: 3, steps: 7, flatten: .5 }), color, rise(.45, .76)));
  }
  return combine(parts);
}

// Boulder wearing a mossy cap.
export function mossRock() {
  return combine([
    boulder(9, 0x7a7466, { rough: .26 }),
    paint(place(new THREE.SphereGeometry(.78, 12, 8), 0, .52, 0, 0, 0, 0, [1.12, .52, 1]), 0x4e8a3e, rise(.6, .8)),
  ]);
}

// Circus big top: striped wall and peaked roof with a pennant.
export function bigTop(color = 0xd8203c, s = 1) {
  return combine([
    paint(place(new THREE.CylinderGeometry(1.85 * s, 2.0 * s, 1.2 * s, 18, 1, true), 0, .6 * s, 0), color, radialTone(color, 0xfff4e0, 10)),
    paint(lathe([[.001, 3.3 * s], [.3 * s, 3.12 * s], [.9 * s, 2.4 * s], [1.5 * s, 1.6 * s], [1.95 * s, 1.2 * s], [2.0 * s, 1.18 * s]], 18), color, radialTone(color, 0xfff4e0, 10)),
    paint(new THREE.CylinderGeometry(.04 * s, .04 * s, .8 * s, 6).translate(0, 3.6 * s, 0), 0x6e4a2a),
    paint(place(patchGeometry([[0, 0], [.6, -.14], [0, -.3]], .03, .015, { segments: 5, rings: 1 }), 0, 3.9 * s, 0), 0xffd21a),
  ]);
}

// Circus show pedestal: banded drum with a pale top.
export function podium(color = 0xd8203c) {
  return combine([
    paint(lathe([[1.05, 0], [1.08, .18], [.95, .3], [.78, .42], [.78, 1.15], [.92, 1.3], [.95, 1.5], [.001, 1.56]], 18), color, (x, y) => (y > .4 && y < .52) || (y > 1.24 && y < 1.36) ? tmp.set(0xffe9a0) : .8 + .2 * y / 1.5),
    paint(place(new THREE.CylinderGeometry(.55, .62, .22, 14), 0, 1.64, 0), 0xfff4e0),
  ]);
}

// Popcorn cart: red body, spoked wheels, glass case, heap and striped canopy.
export function popcornCart() {
  const parts = [
    paint(loftGeometry([[0, .8, .55, 0, 0, .3], [.9, .84, .58, 0, 0, .3], [1.3, .76, .5, 0, 0, .3]], { segments: 14, steps: 4 }), 0xd8443a, rise(1.3, .78)),
    paint(place(new THREE.CylinderGeometry(.3, .3, .12, 12).rotateZ(Math.PI / 2), .84, .3, 0), 0x3a2a2a),
    paint(place(new THREE.CylinderGeometry(.3, .3, .12, 12).rotateZ(Math.PI / 2), -.84, .3, 0), 0x3a2a2a),
    paint(new THREE.BoxGeometry(.92, .5, .7).translate(0, 1.55, 0), 0xd8e8f0),
    paint(new THREE.BoxGeometry(1.0, .08, .78).translate(0, 1.84, 0), 0xfff4e0),
    paint(place(new THREE.SphereGeometry(.3, 10, 8), 0, 2.0, 0, 0, 0, 0, [1.4, .6, 1]), 0xffe9a0),
  ];
  for (const sx of [-.85, .85]) parts.push(paint(new THREE.CylinderGeometry(.05, .05, 1.0, 6).translate(sx, 2.4, 0), 0xfff4e0));
  const awn = new THREE.CylinderGeometry(.55, .55, 2.1, 12, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2);
  parts.push(paint(place(awn, 0, 2.9, 0), 0xd8443a, radialTone(0xd8443a, 0xfff4e0, 6, Math.PI / 6)));
  return combine(parts);
}

// Soft cloud mound with a tinted underside.
export function cloudPuff(tint = 0xffffff) {
  tmpA.set(tint); tmpB.set(0xd8c8f0);
  const puff = (x, y, z, sx, sy, sz, s) => paint(place(new THREE.SphereGeometry(1, 12, 8), x, y, z, 0, 0, 0, [sx * s, sy * s, sz * s]), tint, (px, py) => tmp.copy(tmpA).lerp(tmpB, Math.max(0, Math.min(1, -.35 - py))));
  return combine([
    puff(0, .3, 0, 1.5, .85, 1.1, .8),
    puff(1.0, .22, .3, 1.0, .7, .9, .8),
    puff(-.9, .18, -.25, .95, .65, .85, .8),
    puff(.2, .62, -.1, 1.0, .8, .9, .8),
  ]);
}

// Crescent moon on a slim pole: two crossed crescents stay readable from any angle.
export function moonOnPole(color = 0xffd86a) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, .85, -.8062, .8062, false);
  shape.absarc(.5, 0, .62, 1.4267, TAU - 1.4267, false);
  shape.closePath();
  const crescent = new THREE.ExtrudeGeometry(shape, { depth: .3, bevelEnabled: false, curveSegments: 10 });
  crescent.rotateY(Math.PI / 2);
  const moon = (ry) => paint(crescent.clone().rotateY(ry).translate(0, 3.3, 0), color, (x, y) => .8 + .2 * (y - 2.5) / 1.7);
  return combine([
    paint(new THREE.CylinderGeometry(.06, .09, 2.6, 8).translate(0, 1.3, 0), 0x8a7ab8),
    moon(0),
    moon(Math.PI / 2),
  ]);
}

// Floating star ornament (scatter above ground with cast off).
export function starFloat(color = 0xffe27a) {
  return paint(starShape(color, .55).translate(0, .6, 0), color);
}

// Giant pillow: squashed cushion with dimples.
export function pillow(color = 0xffd2f2) {
  const g = loftGeometry([[0, 1.0, .72, 0, 0, .5], [.34, 1.12, .8, 0, 0, .52], [.68, 1.0, .72, 0, 0, .5]], { segments: 20, steps: 6 });
  return paint(g, color, (x, y, z) => .84 + .16 * y / .68 - .05 * Math.max(0, noise(x * 2.6, y * 2.6, z * 2.6, 2)));
}

// Market stall: posts, counter, goods and a striped half-round awning.
export function marketStall(awning = 0xd8443a) {
  const parts = [];
  for (const [px, pz] of [[-1.0, -.55], [1.0, -.55], [-1.0, .55], [1.0, .55]]) {
    parts.push(paint(new THREE.CylinderGeometry(.06, .07, 2.1, 6).translate(px, 1.05, pz), 0x7a5232));
  }
  parts.push(paint(new THREE.BoxGeometry(2.0, .8, 1.1).translate(0, .4, 0), 0x9a6a3e, rise(.8, .8)));
  parts.push(paint(new THREE.BoxGeometry(2.14, .1, 1.24).translate(0, .85, 0), 0xc89a5e));
  for (let k = 0; k < 4; k++) parts.push(paint(place(new THREE.SphereGeometry(.13, 8, 6), -.66 + k * .44, .99, .18), 0xffa62a));
  const awn = new THREE.CylinderGeometry(.8, .8, 2.3, 14, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2);
  parts.push(paint(place(awn, 0, 2.0, .1), awning, radialTone(awning, 0xfff4e0, 6)));
  return combine(parts);
}

// Terracotta urn with a rim and a pale band.
export function clayPot(color = 0xc86a3a) {
  return paint(lathe([[.35, 0], [.52, .1], [.64, .45], [.66, .95], [.56, 1.35], [.4, 1.5], [.44, 1.62], [.52, 1.72], [.48, 1.8], [.001, 1.84]], 14), color, (x, y, z) => (y > 1.1 && y < 1.24 ? tmp.set(0xe8b88a) : (.8 + .2 * y / 1.8) * (1 + .05 * Math.cos(Math.atan2(z, x) * 6))));
}

// Rolled carpet standing on end with a spiral cap and strap bands.
export function carpetRoll() {
  const spiral = (x, y, z) => tmp.set(Math.sin(Math.atan2(z, x) + Math.hypot(x, z) * 7) > 0 ? 0xc8883a : 0xe8c888);
  return combine([
    paint(new THREE.CylinderGeometry(.32, .32, 1.3, 14).translate(0, .65, 0), 0xb8445a, (x, y, z) => .82 + .18 * y / 1.3 - (Math.abs(Math.abs((Math.atan2(z, x) / TAU + .5) * 14 % 1) - .5) < .06 ? .1 : 0)),
    paint(place(new THREE.CircleGeometry(.3, 14).rotateX(-Math.PI / 2).translate(0, 1.3, 0), 0, 0, 0), 0xd8b06a, spiral),
    paint(new THREE.CylinderGeometry(.345, .345, .1, 14).translate(0, .3, 0), 0x8a6a3a),
    paint(new THREE.CylinderGeometry(.345, .345, .1, 14).translate(0, 1.0, 0), 0x8a6a3a),
  ]);
}

// Standing lantern: dark post, pale glass cage and roof. Pair with lanternGlow for the lit core.
export function lanternPost() {
  return combine([
    paint(new THREE.CylinderGeometry(.07, .1, 2.1, 8).translate(0, 1.05, 0), 0x3a3028),
    paint(lathe([[.26, 2.0], [.3, 2.1], [.28, 2.6], [.2, 2.85], [.32, 2.95], [.22, 3.05], [.001, 3.1]], 10), 0xe8dca8, (x, y) => (y > 2.8 ? tmp.set(0x4a3a2a) : .88)),
  ]);
}
export function lanternGlow(color = 0xffb84a) {
  return paint(new THREE.SphereGeometry(.18, 8, 6).translate(0, 2.42, 0), color);
}

// Hypnotist's spiral disc on a post.
export function spiralDisc(color = 0xff4fd8) {
  return combine([
    paint(new THREE.CylinderGeometry(.09, .12, 1.7, 8).translate(0, .85, 0), 0x3a2a4e),
    paint(new THREE.CylinderGeometry(.74, .8, .14, 22).translate(0, 1.8, 0), color, (x, y, z) => {
      const a = Math.atan2(z, x), r = Math.hypot(x, z);
      return tmp.set(Math.sin(a * 2 + r * 9) > 0 ? 0xfff4e0 : color);
    }),
  ]);
}

// Cobra statue: coiled base, rising body, flared hood and head. Pair with cobraEyes.
export function cobraStatue() {
  return combine([
    paint(lathe([[.72, 0], [.76, .16], [.6, .3], [.001, .36]], 12), 0x6a588e),
    paint(sweepGeometry([[0, .3, 0], [.12, .85, .14], [.06, 1.55, .1], [0, 2.0, -.04]], [.2, .17, .15, .12], { segments: 8, steps: 10 }), 0x8a74aa, rise(2.0, .76)),
    paint(place(new THREE.SphereGeometry(.34, 12, 8), 0, 2.32, -.05, 0, 0, 0, [1.4, 1.7, .5]), 0x8a74aa, rise(2.6, .8)),
    paint(place(new THREE.SphereGeometry(.16, 10, 8), 0, 2.52, .2), 0x9a84ba),
  ]);
}
export function cobraEyes(color = 0xff4fd8) {
  return combine([
    paint(new THREE.SphereGeometry(.035, 6, 4).translate(.07, 2.56, .33), color),
    paint(new THREE.SphereGeometry(.035, 6, 4).translate(-.07, 2.56, .33), color),
  ]);
}

// ---------- arc 3: gold rush mine, red rock canyon, ghost town, glacier, dynamite ridge ----------

// Timber mine support frame: splayed legs, lintel and cross braces.
export function mineFrame() {
  const wood = 0x6e4a2a, sh = rise(3.0, .78);
  return combine([
    paint(place(sweepGeometry([[0, 0, 0], [.05, 1.5, 0], [.2, 2.75, 0]], [.19, .17, .15], { segments: 6, steps: 7 }), -1.05, 0, 0), wood, sh),
    paint(place(sweepGeometry([[0, 0, 0], [-.05, 1.5, 0], [-.2, 2.75, 0]], [.19, .17, .15], { segments: 6, steps: 7 }), 1.05, 0, 0), wood, sh),
    paint(new THREE.BoxGeometry(2.95, .32, .32).translate(0, 2.85, 0), wood, sh),
    paint(new THREE.BoxGeometry(2.2, .22, .24).translate(0, 2.25, 0), wood, sh),
    paint(new THREE.BoxGeometry(.15, 1.75, .14).rotateZ(.5).translate(-.72, 1.25, .1), wood, sh),
    paint(new THREE.BoxGeometry(.15, 1.75, .14).rotateZ(-.5).translate(.72, 1.25, .1), wood, sh),
  ]);
}

// Ore cart: riveted tub on spoked wheels with a heaped load.
export function oreCart() {
  return combine([
    paint(loftGeometry([[0, .72, .46, 0, 0, .3], [.85, .95, .62, 0, 0, .3]], { segments: 12, steps: 4 }), 0x8a3a2e, rise(.85, .76)),
    paint(place(new THREE.CylinderGeometry(.27, .27, .11, 12).rotateZ(Math.PI / 2), .82, .27, 0), 0x3a3230),
    paint(place(new THREE.CylinderGeometry(.27, .27, .11, 12).rotateZ(Math.PI / 2), -.82, .27, 0), 0x3a3230),
    paint(place(boulder(4, 0x8a8a92, { rough: .32, flat: .62 }), 0, .82, 0, 0, 0, 0, [1.1, .7, .9]), 0xa8a8b0),
    paint(place(boulder(6, 0xd8a83a, { rough: .5, flat: .8 }), .34, .92, .14, 0, 1, 0, .42), 0xffd23a),
    paint(place(boulder(7, 0xd8a83a, { rough: .5, flat: .8 }), -.28, .88, -.1, 0, 2, 0, .32), 0xffd23a),
  ]);
}

// Heap of gold nuggets.
export function goldPile() {
  const parts = [];
  [[0, 0, .55, 0], [.5, .12, .36, 1], [-.46, -.06, .32, 2], [.1, .32, .28, 3], [-.15, -.3, .24, 4]].forEach(([x, z, s, seed]) => {
    parts.push(place(paint(boulder(10 + seed, 0xe0a83a, { rough: .48, flat: .78 }), 0xffd23a), x, 0, z, 0, seed * 1.3, 0, s));
  });
  return combine(parts);
}

// Stratified mesa or butte with a flat top. Options tune height and footprint.
export function mesa(color = 0xb85a34, seed = 1, { h = 6, r = 2.2, band = 0xd88a4e } = {}) {
  const g = loftGeometry([
    [0, r, r, 0, 0, .2], [h * .12, r * .82, r * .82, 0, 0, .2], [h * .5, r * .58, r * .58, 0, 0, .2],
    [h * .78, r * .46, r * .46, 0, 0, .2], [h, r * .44, r * .44, 0, 0, .2],
  ], { segments: 12, steps: 8, warp: (x, y, z, u, v, a) => { const f = 1 + .09 * noise(Math.cos(a) * 2, y, Math.sin(a) * 2, seed); return [x * f, y, z * f]; } });
  return paint(faceted(g), color, (x, y, z) => (Math.sin(y * 2.6 + seed * 2) > .6 ? tmp.set(band) : .74 + .26 * Math.min(1, y / h + .15)));
}

// Wagon wheel standing on its rim: torus tire, spokes and iron hub.
export function wagonWheel() {
  const parts = [paint(new THREE.TorusGeometry(.78, .09, 8, 20), 0x6a4a2e, (x, y) => .82 + .18 * y),
    paint(place(new THREE.CylinderGeometry(.18, .18, .16, 10).rotateX(Math.PI / 2), 0, 0, 0), 0x4a3a2e)];
  for (let k = 0; k < 4; k++) {
    const spoke = new THREE.CylinderGeometry(.045, .045, 1.5, 6).rotateZ(k * Math.PI / 4);
    parts.push(paint(spoke, 0x7a5a3a));
  }
  return place(combine(parts), 0, .88, 0);
}

// Western false-front building: plank walls, tall parapet, porch and dark windows.
export function falseFront(wall = 0xb08a5e) {
  const plank = (x, y) => .8 + .18 * (y / 2.6) + .04 * Math.sin(y * 9);
  return combine([
    paint(new THREE.BoxGeometry(2.4, 1.9, 1.8).translate(0, .95, 0), wall, plank),
    paint(new THREE.BoxGeometry(2.6, 1.1, .22).translate(0, 2.3, .82), wall, plank),
    paint(new THREE.BoxGeometry(2.7, .16, .3).translate(0, 2.9, .82), 0x6e4a2e),
    paint(new THREE.BoxGeometry(2.3, .12, .95).translate(0, 2.0, 1.32), 0x6e4a2e),
    paint(new THREE.CylinderGeometry(.06, .06, 1.9, 6).translate(-.95, .95, 1.68), 0x6e4a2e),
    paint(new THREE.CylinderGeometry(.06, .06, 1.9, 6).translate(.95, .95, 1.68), 0x6e4a2e),
    paint(new THREE.BoxGeometry(.68, 1.3, .1).translate(0, .65, .91), 0x4a3226),
    paint(new THREE.BoxGeometry(.5, .5, .08).translate(-.8, 1.2, .91), 0x262a36),
    paint(new THREE.BoxGeometry(.5, .5, .08).translate(.8, 1.2, .91), 0x262a36),
  ]);
}

// Water tower: splayed legs, banded tank and conical roof.
export function waterTower() {
  const parts = [];
  for (const [lx, lz] of [[-.62, -.62], [.62, -.62], [-.62, .62], [.62, .62]]) {
    const leg = new THREE.CylinderGeometry(.07, .09, 2.7, 6);
    leg.rotateX(lz * .1); leg.rotateZ(-lx * .1);
    parts.push(paint(place(leg, lx * .78, 1.35, lz * .78), 0x5e4430));
  }
  const tank = lathe([[.95, 2.6], [1.02, 2.72], [1.02, 3.9], [.9, 4.1], [.55, 4.3], [.2, 4.5], [.001, 4.55]], 14);
  parts.push(paint(tank, 0x7a5a3a, (x, y, z) => .8 + .18 * (y - 2.6) / 2 + .04 * Math.sin(Math.atan2(z, x) * 8)));
  for (const y of [2.9, 3.7]) parts.push(paint(new THREE.CylinderGeometry(1.03, 1.03, .1, 14, 1, true).translate(0, y, 0), 0x4a3a2e));
  return combine(parts);
}

// Tumbleweed: tangled twig hoops resting on the ground.
export function tumbleweed() {
  const parts = [];
  for (let k = 0; k < 3; k++) {
    const t = place(new THREE.TorusGeometry(.52, .035, 5, 14), 0, .56, 0, k * 1.05, k * .8, k * .4);
    parts.push(paint(t, 0xa8845e, () => .82 + .1 * (k % 2)));
  }
  parts.push(paint(place(new THREE.TorusGeometry(.3, .03, 5, 12), 0, .56, 0, .8, .5, .3), 0x93744a));
  return combine(parts);
}

// Faceted ice cliff spires with snow-pale tips.
export function iceCliff() {
  const shard = (h, r) => faceted(lathe([[.001, 0], [r, h * .1], [r * .88, h * .68], [r * .58, h * .9], [.001, h]], 5));
  const tone = h => (x, y) => (y > h * .74 ? tmp.set(0xf4faff) : .74 + .26 * y / h);
  return combine([
    paint(shard(4.6, 1.05), 0xaee2f8, tone(4.6)),
    paint(place(shard(3.1, .78), 1.0, 0, .3, 0, .5, 0), 0xbce8ff, tone(3.1)),
    paint(place(shard(2.3, .66), -.9, 0, -.2, 0, 1.2, 0), 0x9ed8f0, tone(2.3)),
  ]);
}

// Smooth snowdrift mound.
export function snowDrift() {
  return paint(place(new THREE.SphereGeometry(1, 14, 8), 0, .18, 0, 0, 0, 0, [1.9, .42, 1.3]), 0xf4faff, (x, y) => .86 + .14 * Math.min(1, y / .4));
}

// Railway signal lamp: post, crossarm and hooded head. Pair with signalLens.
export function signalLamp(color = 0xff5a4a) {
  return combine([
    paint(new THREE.CylinderGeometry(.07, .1, 2.2, 8).translate(0, 1.1, 0), 0x2e3238),
    paint(new THREE.BoxGeometry(.85, .09, .09).translate(.22, 2.1, 0), 0x2e3238),
    paint(place(new THREE.CylinderGeometry(.17, .21, .3, 8), .52, 2.0, 0), 0x3a3e46),
    paint(new THREE.ConeGeometry(.2, .18, 8).translate(.52, 2.2, 0), 0x3a3e46),
  ]);
}
export function signalLens(color = 0xff5a4a) {
  return paint(new THREE.SphereGeometry(.17, 8, 6).translate(.52, 2.0, 0), color);
}

// TNT crate: red planks, pale band and a hanging fuse.
export function tntCrate() {
  const plank = (x, y) => .82 + .16 * (y / .9) + .05 * Math.sin(y * 12);
  return combine([
    paint(new THREE.BoxGeometry(1.0, .8, .8).translate(0, .45, 0), 0xd8382e, plank),
    paint(new THREE.BoxGeometry(1.04, .24, .84).translate(0, .45, 0), 0xfff4e0, () => .92),
    paint(sweepGeometry([[-.1, .85, 0], [-.07, 1.0, 0], [.02, 1.08, .03]], [.035, .03, .012], { segments: 4, steps: 5 }), 0xbfa878),
  ]);
}

// Powder barrel: bulged staves with iron bands.
export function powderBarrel() {
  return paint(lathe([[.4, 0], [.5, .1], [.56, .45], [.56, .85], [.5, 1.2], [.4, 1.3]], 14), 0x8a5a2e, (x, y, z) => {
    if (y < .12 || (y > .58 && y < .7)) return tmp.set(0x3a3a40);
    return (.8 + .18 * y / 1.3) * (1 + .06 * Math.abs(Math.cos(Math.atan2(z, x) * 7)));
  });
}

// Mine shaft entrance: rock mound with a framed dark portal and rubble.
export function mineShaft() {
  const hole = new THREE.CylinderGeometry(.6, .6, .8, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2);
  return combine([
    place(paint(boulder(14, 0x6a5a4a, { rough: .3, flat: .55 }), 0x75654e), 0, 0, 0, 0, 0, 0, [1.6, 1.0, 1.2]),
    paint(place(hole, 0, .72, .5), 0x14100c),
    paint(new THREE.BoxGeometry(.15, 1.6, .15).translate(-.64, .7, .68), 0x6a5232),
    paint(new THREE.BoxGeometry(.15, 1.6, .15).translate(.64, .7, .68), 0x6a5232),
    paint(new THREE.BoxGeometry(1.6, .16, .2).translate(0, 1.5, .68), 0x6a5232),
  ]);
}

// Static smoke column over a blasting site (puffs stacked upward).
export function smokeColumn() {
  return combine([
    place(paint(new THREE.SphereGeometry(.9, 10, 8), 0xb0a8a2, (x, y) => .8 + .2 * y / .9), 0, .4, 0, 0, 0, 0, [1.25, .8, 1.25]),
    place(paint(new THREE.SphereGeometry(.7, 10, 8), 0xbab2ac, (x, y) => .8 + .2 * y), .3, 1.5, .1),
    place(paint(new THREE.SphereGeometry(.55, 10, 8), 0xc4bcb6, (x, y) => .8 + .2 * y), -.2, 2.4, -.1),
    place(paint(new THREE.SphereGeometry(.4, 10, 8), 0xcec6c0, (x, y) => .8 + .2 * y), .1, 3.1, .05),
  ]);
}

// Show flag pole with a pennant.
export function flagPole(color = 0xffd21a) {
  return combine([
    paint(new THREE.CylinderGeometry(.06, .09, 3.2, 8).translate(0, 1.6, 0), 0xd8d0c0, rise(3.2, .8)),
    paint(place(patchGeometry([[0, 0], [.7, -.16], [0, -.34]], .03, .015, { segments: 5, rings: 1 }), 0, 3.15, 0), color),
  ]);
}

// Distant rock arch landmark: two thick strata legs meeting in a round crown.
export function rockArch() {
  const leg = (sx) => sweepGeometry([[2.6 * sx, 0, 0], [1.9 * sx, 2.1, 0], [.8 * sx, 3.3, 0], [0, 3.7, 0]], [1.15, .85, .58, .42], { segments: 10, steps: 10 });
  const strata = (x, y) => .74 + .26 * Math.min(1, y / 3.7) + (Math.sin(y * 2.4) > .62 ? .1 : 0);
  return combine([
    paint(leg(-1), 0xc07048, strata),
    paint(leg(1), 0xc07048, strata),
  ]);
}
