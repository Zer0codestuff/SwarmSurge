import * as THREE from 'three';
import { THEMES } from './levels.js';
import { LATE_FORT_FAMILY, LATE_FORT_TRIM, LATE_FORT_LIGHT } from './biomes-late.js';
import { assetBatch, assetGlow, bevelBox } from './asset-kit.js';
import { loftGeometry, sweepGeometry, patchGeometry, crownGeometry } from './boss-shapes.js';

// Sculpted biome forts: a gently curved curtain wall with pillowed stone faces,
// an arched gatehouse and one tower design per architecture family.
const DARK = 0x182534, STEEL = 0x8197aa, GOLD = 0xffc85a, RED = 0xd83140, HOLE = 0x0b1019;
const TAU = Math.PI * 2;
const FAMILY = {
  desert: 'bastion', mob: 'bastion', arena: 'bastion',
  jungle: 'temple', tomb: 'temple',
  frost: 'crown', sky: 'crown', candy: 'crown',
  moon: 'station', factory: 'station', neon: 'station',
  lava: 'gothic', spooky: 'gothic', void: 'gothic', volcano: 'gothic', blackhole: 'gothic',
  coral: 'reef', crystal: 'prism', storm: 'prism', casino: 'casino',
  ...LATE_FORT_FAMILY,
};
/** Architecture family of a biome; the roadside fences follow it. */
export const fortFamily = (theme) => FAMILY[theme] || 'bastion';
const TRIM = {
  candy: 0xffe8f2, tomb: 0xe9c47c, jungle: 0xd7b06a, sky: 0xffe2a0, frost: 0xe8f4ff, moon: 0xc6ccd8,
  factory: 0x9aa3ad, neon: 0x8d92c4, casino: 0xffd21a, coral: 0xffd8c2, crystal: 0xb9b0ff, storm: 0xaab4c8,
  ...LATE_FORT_TRIM,
};
const LIGHT = {
  spooky: 0xffa340, lava: 0xff7a2a, volcano: 0xff8a2a, void: 0xd16bff, blackhole: 0xffa25a, neon: 0xff4fe0,
  crystal: 0x6afff0, storm: 0xfff06a, moon: 0x8fe8ff, factory: 0xffb21a, coral: 0x7ff4ff, casino: 0xffe27a,
  frost: 0xbff4ff, sky: 0xffe7a0, candy: 0xfff0a0,
  ...LATE_FORT_LIGHT,
};
// Face blocks, parapet and gate profile for each family.
const STYLE = {
  bastion: { width: .95, rows: 3, pillow: .05, inset: .35, jitter: .14, top: 'merlon', arch: 'round', corbels: true },
  temple: { width: 1.25, rows: 3, pillow: .07, inset: .3, jitter: .16, top: 'step', arch: 'trapezoid' },
  crown: { width: 1.05, rows: 3, pillow: .08, inset: .55, jitter: .08, top: 'scallop', arch: 'round' },
  station: { width: 1.7, rows: 2, pillow: .025, inset: .14, jitter: .08, top: 'armor', arch: 'flat' },
  gothic: { width: .72, rows: 4, pillow: .04, inset: .3, jitter: .22, top: 'spike', arch: 'pointed', corbels: true },
  reef: { width: .78, rows: 3, pillow: .12, inset: .62, jitter: .22, top: 'coral', arch: 'round' },
  prism: { width: .82, rows: 3, pillow: .15, inset: .92, jitter: .24, top: 'crystal', arch: 'pointed' },
  casino: { width: .86, rows: 3, pillow: .03, inset: .2, jitter: .1, top: 'bulb', arch: 'round', corbels: true },
};

const BEND = .006, bend = x => -BEND * x * x;
const TOWER_X = 6.9, TOWER_Z = -.15 + bend(TOWER_X);
const WALL_Y = 2.55, GATE_Y = 3.62, GATE_W = 1.2, GATE_SPRING = 1.5;

const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
const hash = (i, seed = 1) => { const s = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };

function part(parent, name, x = 0, y = 0, z = 0) {
  const group = new THREE.Group(); group.name = name; group.position.set(x, y, z); parent.add(group);
  return group;
}

function lathe(profile, sides = 18, phase = 0) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(.001, r), y)), sides, phase);
}

function faceted(g) {
  const out = g.index ? g.toNonIndexed() : g;
  if (out !== g) g.dispose();
  out.computeVertexNormals();
  return out;
}

// Darkens surfaces toward the ground so towers and walls sit in the terrain.
function grade(g, y0, y1, lo = .72, hi = 1) {
  const p = g.attributes.position, old = g.attributes.color, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.max(0, (p.getY(i) - y0) / (y1 - y0))), s = lo + (hi - lo) * Math.sqrt(t);
    for (let k = 0; k < 3; k++) c[i * 3 + k] = s * (old ? old.array[i * 3 + k] : 1);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

// Batch wrapper that bends every vertex onto the curved wall line.
function bent(batch) {
  const api = {
    add(g, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
      const geo = g.index ? g.toNonIndexed() : g;
      if (geo !== g) g.dispose();
      geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); geo.translate(x, y, z);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + bend(p.getX(i)));
      batch.add(geo, color);
      return api;
    },
    box(w, h, d, x, y, z, color, rx = 0, ry = 0, rz = 0) { return api.add(bevelBox(w, h, d), color, x, y, z, rx, ry, rz); },
  };
  return api;
}

// A cross-section in (z, y) extruded along x and centered on the origin.
function extrudeAlongX(profile, length, steps) {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: length, steps, bevelEnabled: false, curveSegments: 1 });
  g.rotateY(-Math.PI / 2); g.translate(length / 2, 0, 0);
  return g;
}

function slab(points, depth) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false, curveSegments: 1 });
  return g;
}

// Arch outline from the left base, over the crown, to the right base.
function archPoints(w, spring, type) {
  if (type === 'flat') return [[-w, 0], [-w, spring + .55], [-w + .32, spring + .9], [w - .32, spring + .9], [w, spring + .55], [w, 0]];
  if (type === 'trapezoid') return [[-w, 0], [-w * .7, spring + .95], [w * .7, spring + .95], [w, 0]];
  const R = type === 'pointed' ? w * 1.55 : w, cx = w - R, top = Math.acos(Math.min(1, -cx / R)), n = 10, left = [], right = [];
  for (let i = 0; i <= n; i++) {
    const a = top * i / n, x = cx + R * Math.cos(a), y = spring + R * Math.sin(a);
    right.push([x, y]); if (i < n) left.push([-x, y]);
  }
  return [[-w, 0], ...left, ...right.reverse(), [w, 0]];
}

function archRing(w, t, spring, type) {
  const outer = archPoints(w + t, spring, type), inner = archPoints(w, spring, type);
  return [...outer, ...inner.reverse()];
}

// Doors take the left or right half of the arch, split at the crown.
function doorHalf(points, side) {
  const top = Math.max(...points.map(p => p[1])), half = points.filter(p => side < 0 ? p[0] < -1e-4 : p[0] > 1e-4);
  return side < 0 ? [...half, [0, top], [0, 0]] : [[0, 0], [0, top], ...half];
}

// Removes window and gate openings from a course of stones so blocks frame them.
function cutSpans(spans, holes, ya, yb) {
  let out = spans.map(s => [...s]);
  for (const [hx0, hx1, hy0, hy1] of holes) {
    if (yb <= hy0 || ya >= hy1) continue;
    out = out.flatMap(([a, b]) => b <= hx0 || a >= hx1 ? [[a, b]] : [[a, hx0], [hx1, b]].filter(([c, d]) => d - c > .2));
  }
  return out;
}

// Pillowed blocks: a flat-shaded inset top with four bevels, gaps show the darker core.
function blockFace({ spans, y0, y1, rows, width, z, pillow, inset, jitter, holes = [], seed = 1 }) {
  const pos = [], col = [], h = (y1 - y0) / rows, gap = .055;
  let n = 0;
  const quad = (a, b, c, d, s) => { pos.push(...a, ...b, ...c, ...a, ...c, ...d); for (let k = 0; k < 6; k++) col.push(s, s, s); };
  for (let r = 0; r < rows; r++) for (const [xa, xb] of cutSpans(spans, holes, y0 + r * h, y0 + (r + 1) * h)) {
    const off = (r % 2) * width * .5;
    for (let x = xa - off; x < xb; x += width) {
      const bx0 = Math.max(xa, x) + gap, bx1 = Math.min(xb, x + width) - gap, by0 = y0 + r * h + gap, by1 = y0 + (r + 1) * h - gap;
      if (bx1 - bx0 < .3) continue;
      const s = 1 - jitter * hash(n++, seed), d = Math.min(bx1 - bx0, by1 - by0) * inset * .5, zt = z + pillow * (.75 + .5 * hash(n++, seed));
      const o = [[bx0, by0, z], [bx1, by0, z], [bx1, by1, z], [bx0, by1, z]];
      const q = [[bx0 + d, by0 + d, zt], [bx1 - d, by0 + d, zt], [bx1 - d, by1 - d, zt], [bx0 + d, by1 - d, zt]];
      quad(q[0], q[1], q[2], q[3], s);
      for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; quad(o[k], o[k2], q[k2], q[k], s * (k === 0 ? .72 : k === 2 ? 1.04 : .86)); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function parapet(k, style, spans, y, z, seed) {
  const { wall, wallTrim, wallGlow, color, trimC, lightC } = k;
  let n = 0;
  for (const [x0, x1] of spans) {
    const pitch = style === 'armor' ? 1.08 : style === 'coral' || style === 'crystal' ? .52 : .9;
    const count = Math.max(1, Math.round((x1 - x0) / pitch)), step = (x1 - x0) / count;
    for (let i = 0; i < count; i++) {
      const x = x0 + step * (i + .5), r = hash(n++, seed);
      if (style === 'merlon') {
        wall.box(.56, .52, .34, x, y + .26, z, color);
        wallTrim.box(.64, .08, .4, x, y + .55, z, trimC);
      } else if (style === 'step') {
        wall.box(.66, .3, .4, x, y + .15, z, color);
        wallTrim.box(.38, .26, .32, x, y + .43, z, trimC);
      } else if (style === 'scallop') {
        wall.add(new THREE.CylinderGeometry(.3, .3, .34, 12, 1, false, 0, Math.PI), color, x, y, z, Math.PI / 2, 0, Math.PI / 2);
        wallTrim.add(new THREE.SphereGeometry(.07, 8, 6), trimC, x, y + .38, z);
      } else if (style === 'spike') {
        wall.box(.42, .42, .34, x, y + .21, z, color);
        wallTrim.add(new THREE.ConeGeometry(.27, .55, 4), trimC, x, y + .69, z, 0, Math.PI / 4, 0);
      } else if (style === 'armor') {
        wallTrim.box(step - .12, .56, .1, x, y + .24, z + .02, trimC, -.32);
        wallGlow.box(step - .4, .05, .06, x, y + .08, z + .11, lightC);
      } else if (style === 'coral') {
        const s = .2 + r * .13;
        wall.add(new THREE.SphereGeometry(s, 7, 5), i % 2 ? trimC : color, x, y + s * .55, z - .05, 0, 0, 0);
        if (i % 3 === 1) wallTrim.add(sweepGeometry([[0, 0, 0], [.05, .3, 0], [-.06, .55, .02]], [.07, .05, .025], { segments: 5, steps: 5 }), 0xff8a6a, x + .1, y + .1, z - .05);
      } else if (style === 'crystal') {
        const g = new THREE.OctahedronGeometry(.2); g.scale(1, 2.2 + r * 1.4, 1);
        wallTrim.add(g, k.roof, x, y + .32 + r * .12, z - .08, (r - .5) * .4, r * 2, (hash(n++, seed) - .5) * .7);
      } else if (style === 'bulb') {
        wall.box(.54, .44, .34, x, y + .22, z, color);
        wallTrim.box(.62, .07, .4, x, y + .47, z, trimC);
        wallGlow.add(new THREE.IcosahedronGeometry(.08, 0), lightC, x, y + .58, z);
      }
    }
  }
}

// One silhouette per family. Each returns the banner pole base.
const TOWERS = {
  bastion(k, X, Z, sx) {
    const { stone, trim, glow, color, roof, trimC, lightC } = k;
    stone.add(grade(lathe([[1.66, 0], [1.6, .45], [1.36, 1.2], [1.27, 1.4], [1.24, 4.2], [1.25, 4.28]]), 0, 4.3, .66), color, X, 0, Z);
    trim.add(lathe([[1.22, 4.05], [1.3, 4.12], [1.5, 4.42], [1.52, 4.95], [1.2, 5.0]]), trimC, X, 0, Z);
    trim.add(new THREE.TorusGeometry(1.29, .07, 5, 24), trimC, X, 1.4, Z, Math.PI / 2);
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU;
      trim.add(new THREE.BoxGeometry(.16, .3, .22), color, X + Math.sin(a) * 1.33, 4.2, Z + Math.cos(a) * 1.33, 0, a, 0);
    }
    for (let i = 0; i < 9; i++) {
      const a = (i + .5) / 9 * TAU;
      stone.box(.46, .5, .24, X + Math.sin(a) * 1.38, 5.22, Z + Math.cos(a) * 1.38, color, 0, a, 0);
    }
    trim.add(grade(lathe([[1.26, 4.98], [1.2, 5.06], [.96, 5.55], [.6, 6.3], [.24, 7.0], [.05, 7.42], [.001, 7.48]]), 5, 7.5, .78), roof, X, 0, Z);
    for (const y of [2.35, 3.45]) {
      const a = -sx * .38, x = X + Math.sin(a) * 1.25, z = Z + Math.cos(a) * 1.25;
      trim.box(.22, .66, .12, x, y, z, DARK, 0, a, 0);
      glow.box(.07, .44, .08, x + Math.sin(a) * .05, y, z + Math.cos(a) * .05, lightC, 0, a, 0);
    }
    return [X, 7.44, Z];
  },
  temple(k, X, Z, sx, theme) {
    const { stone, trim, glow, color, roof, trimC, lightC } = k;
    for (let t = 0; t < 3; t++) {
      const y0 = t * 1.38, rb = 1.62 - t * .36, rt = rb - .16;
      stone.add(grade(loftGeometry([[y0, rb, rb, 0, 0, .4], [y0 + 1.3, rt, rt, 0, 0, .4]], { segments: 20, steps: 2 }), 0, 4.2, .7), color, X, 0, Z);
      trim.add(loftGeometry([[y0 + 1.24, rt + .1, rt + .1, 0, 0, .4], [y0 + 1.4, rt + .1, rt + .1, 0, 0, .4]], { segments: 20, steps: 1 }), trimC, X, 0, Z);
    }
    for (let i = 0; i < 6; i++) {
      const y = .1 + i * .46, r = 1.62 - (y / 1.38) * .36 * .9;
      stone.box(.86, .16, .36, X, y + .08, Z + Math.min(1.58, r) + .02, mix(color, trimC, .25));
    }
    const face = patchGeometry([[-.46, .34], [0, .44], [.46, .34], [.5, -.08], [.26, -.44], [-.26, -.44], [-.5, -.08]], .1, .12, { segments: 20, rings: 2 });
    trim.add(face, trimC, X, 3.38, Z + .98);
    for (const ex of [-.17, .17]) glow.box(.15, .08, .06, X + ex, 3.46, Z + 1.13, lightC);
    trim.box(.3, .06, .06, X, 3.17, Z + 1.12, DARK);
    for (const [px, pz] of [[-.48, -.48], [.48, -.48], [-.48, .48], [.48, .48]]) trim.cylinder(.08, .82, X + px, 4.55, Z + pz, trimC, 'y', .1, 6);
    trim.box(1.36, .12, 1.36, X, 5.0, Z, trimC);
    trim.add(new THREE.ConeGeometry(.98, .78, 4), roof, X, 5.45, Z, 0, Math.PI / 4, 0);
    glow.add(new THREE.OctahedronGeometry(.2), lightC, X, 4.5, Z);
    if (theme === 'jungle') {
      for (const v of [0, 2]) {
        const x = X + (v - 1) * .82, z = Z + 1.05;
        trim.add(sweepGeometry([[x, 4.0, z + .1], [x + .12, 3.3, z + .32], [x - .08, 2.4, z + .5], [x + .1, 1.4, z + .62]], [.06, .05, .045, .03], { segments: 5, steps: 10 }), 0x3f8f3a);
        trim.add(new THREE.SphereGeometry(.16, 6, 4).scale(1, .45, 1), 0x4fa443, x + .12, 3.3, z + .38);
      }
    } else {
      trim.add(new THREE.ConeGeometry(.3, .38, 4), GOLD, X, 6.0, Z, 0, Math.PI / 4, 0);
    }
    return [X, theme === 'jungle' ? 5.84 : 6.16, Z];
  },
  crown(k, X, Z, sx, theme) {
    const { stone, trim, glow, color, roof, trimC, lightC } = k;
    stone.add(grade(lathe([[1.42, 0], [1.36, .35], [1.15, 1.0], [1.08, 2.5], [1.12, 3.9], [1.2, 4.15]]), 0, 4.2, .72), color, X, 0, Z);
    trim.add(lathe([[1.18, 4.1], [1.5, 4.35], [1.55, 4.75], [1.2, 4.8]]), trimC, X, 0, Z);
    trim.add(lathe([[1.12, 4.75], [1.3, 5.05], [1.22, 5.5], [.85, 5.95], [.4, 6.35], [.14, 6.75], [.03, 7.08], [.001, 7.12]]), roof, X, 0, Z);
    const a = -sx * .3;
    trim.add(slab(archPoints(.2, .5, 'round'), .06), DARK, X + Math.sin(a) * 1.08, 2.4, Z + Math.cos(a) * 1.08, 0, a, 0);
    glow.add(slab(archPoints(.13, .46, 'round'), .04), lightC, X + Math.sin(a) * 1.12, 2.45, Z + Math.cos(a) * 1.12, 0, a, 0);
    if (theme === 'frost') {
      for (let i = 0; i < 12; i++) {
        const b = i / 12 * TAU, len = .32 + hash(i, 4) * .3;
        trim.add(new THREE.ConeGeometry(.07, len, 5), 0xe4f6ff, X + Math.sin(b) * 1.46, 4.18 - len / 2, Z + Math.cos(b) * 1.46, Math.PI);
      }
      trim.add(new THREE.TorusGeometry(1.24, .1, 5, 22), 0xf7fbff, X, 4.98, Z, Math.PI / 2);
      glow.add(new THREE.OctahedronGeometry(.22).scale(1, 1.6, 1), lightC, X, 7.3, Z);
      return [X, 7.6, Z];
    }
    if (theme === 'candy') {
      for (let i = 0; i < 5; i++) trim.add(new THREE.TorusGeometry(1.12, .09, 6, 22), 0xffffff, X, .85 + i * .7, Z, Math.PI / 2);
      for (let i = 0; i < 10; i++) {
        const b = (i + .5) / 10 * TAU;
        trim.add(new THREE.SphereGeometry(.12, 8, 6).scale(1, 1.6, 1), 0xffffff, X + Math.sin(b) * 1.5, 4.18, Z + Math.cos(b) * 1.5);
      }
      trim.add(new THREE.SphereGeometry(.24, 12, 8), 0xe8183a, X, 7.25, Z);
      trim.add(sweepGeometry([[0, 0, 0], [.08, .22, 0], [.24, .38, 0]], [.035, .03, .02], { segments: 5, steps: 6 }), 0x3a8a2a, X, 7.4, Z);
      return [X - sx * .05, 7.42, Z - .2];
    }
    for (let i = 0; i < 8; i++) {
      const b = i / 8 * TAU, s = .42 + hash(i, 6) * .16;
      trim.add(new THREE.SphereGeometry(s, 10, 6), 0xffffff, X + Math.sin(b) * 1.42, .3 + s * .3, Z + Math.cos(b) * 1.42);
    }
    trim.add(new THREE.SphereGeometry(.18, 10, 8), GOLD, X, 7.22, Z);
    return [X, 7.36, Z];
  },
  station(k, X, Z, sx, theme) {
    const { stone, trim, glow, color, roof, trimC, lightC } = k;
    const sq = (y0, y1, r0, r1, p = .55) => loftGeometry([[y0, r0, r0, 0, 0, p], [y1, r1, r1, 0, 0, p]], { segments: 24, steps: 2 });
    stone.add(grade(sq(0, 2.42, 1.52, 1.36), 0, 4.6, .7), color, X, 0, Z);
    trim.add(sq(2.36, 2.68, 1.46, 1.46), trimC, X, 0, Z);
    stone.add(grade(sq(2.62, 4.48, 1.24, 1.16), 0, 4.6, .7), color, X, 0, Z);
    trim.add(sq(4.42, 4.7, 1.5, 1.5), trimC, X, 0, Z);
    for (const y of [.9, 1.65, 3.5]) trim.add(sq(y, y + .05, (y < 2.4 ? 1.52 - y * .066 : 1.24 - (y - 2.62) * .043) + .015, (y < 2.4 ? 1.52 - y * .066 : 1.24 - (y - 2.62) * .043) + .015), DARK, X, 0, Z);
    for (const ex of [-.52, .52]) {
      glow.box(.09, 1.5, .06, X + ex, 1.2, Z + 1.33, lightC);
      glow.box(.09, 1.3, .06, X + ex, 3.55, Z + 1.12, lightC);
    }
    trim.box(.62, .92, .1, X, 1.15, Z + 1.4, DARK);
    trim.box(.5, .1, .12, X, 1.2, Z + 1.45, trimC);
    if (theme === 'moon') {
      const dome = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; dome.push([Math.cos(a) * 1.12, 4.68 + Math.sin(a) * 1.12]); }
      trim.add(lathe(dome, 20), trimC, X, 0, Z);
      trim.add(sweepGeometry([0, .3, .6, .9, 1.2].map(t => [0, 4.68 + Math.sin(t) * 1.13, Math.cos(t) * 1.13]), [.15, .15, .15, .12, .08], { segments: 6, steps: 10, flatten: .25 }), DARK, X, 0, Z);
      trim.add(new THREE.CylinderGeometry(.13, .17, 1.05, 10), STEEL, X - sx * .1, 5.4, Z + .95, -.75);
      return [X, 5.78, Z];
    }
    if (theme === 'factory') {
      for (const [dx, dz, h, r] of [[-sx * .5, -.25, 2.3, .4], [sx * .45, .32, 1.6, .3]]) {
        trim.add(grade(lathe([[r, 4.7], [r * .9, 4.7 + h], [r * 1.18, 4.75 + h], [r * 1.18, 4.92 + h], [r * .8, 4.94 + h]], 14), 4.7, 4.7 + h, .7), color, X + dx, 0, Z + dz);
        trim.add(new THREE.TorusGeometry(r * .97, .05, 4, 16), GOLD, X + dx, 4.7 + h * .62, Z + dz, Math.PI / 2);
      }
      trim.add(sweepGeometry([[sx * .45, 5.4, .32], [sx * 1.2, 5.2, .5], [sx * 1.45, 4.2, .4], [sx * 1.5, 2.6, .2]], [.11, .11, .11, .11], { segments: 7, steps: 14 }), STEEL, X, 0, Z);
      glow.add(new THREE.SphereGeometry(.12, 8, 6), lightC, X - sx * .5, 7.12, Z - .25);
      return [X + sx * .7, 4.68, Z + .8];
    }
    trim.cylinder(.11, 2.5, X, 5.95, Z, STEEL, 'y', .16, 8);
    for (const [y, r] of [[5.25, .62], [5.9, .45], [6.5, .3]]) glow.add(new THREE.TorusGeometry(r, .045, 4, 20), lightC, X, y, Z, Math.PI / 2);
    glow.add(new THREE.SphereGeometry(.13, 8, 6), roof, X, 7.25, Z);
    return [X, 7.15, Z];
  },
  gothic(k, X, Z, sx, theme) {
    const { stone, trim, glow, color, roof, trimC, lightC } = k;
    const sq = (s, o = {}) => loftGeometry(s, { segments: 24, steps: 6, ...o });
    stone.add(grade(sq([[0, 1.4, 1.4, 0, 0, .36], [.5, 1.24, 1.24, 0, 0, .36], [4.6, 1.12, 1.12, 0, 0, .36], [4.9, 1.12, 1.12, 0, 0, .36]]), 0, 5, .62), color, X, 0, Z);
    trim.add(sq([[4.72, 1.12, 1.12, 0, 0, .36], [4.95, 1.32, 1.32, 0, 0, .36], [5.18, 1.32, 1.32, 0, 0, .36], [5.2, .9, .9, 0, 0, .36]], { steps: 4 }), trimC, X, 0, Z);
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      stone.add(grade(loftGeometry([[0, .3, .3, cx * 1.16, cz * 1.16, .6], [2.4, .2, .2, cx * 1.06, cz * 1.06, .6], [4.3, .1, .1, cx * 1.0, cz * 1.0, .6], [4.9, .02, .02, cx, cz, .6]], { segments: 8, steps: 6 }), 0, 5, .62), color, X, 0, Z);
      trim.add(loftGeometry([[5.15, .16, .16, cx * 1.12, cz * 1.12, .5], [5.4, .13, .13, cx * 1.12, cz * 1.12, .5], [6.05, .01, .01, cx * 1.12, cz * 1.12, .6]], { segments: 8, steps: 5 }), trimC, X, 0, Z);
    }
    const crook = theme === 'spooky' ? sx * -.4 : 0;
    trim.add(grade(sq([[5.12, 1.02, 1.02, 0, 0, .38], [5.6, .82, .82, 0, 0, .4], [6.4, .42, .42, 0, 0, .5], [7.3, .1, .1, 0, 0, .6], [7.72, .01, .01, 0, 0, .7]], {
      segments: 16, steps: 10, warp: (x, y, z) => [x + crook * Math.max(0, (y - 5.1) / 2.6) ** 2, y, z],
    }), 5, 7.7, .8), roof, X, 0, Z);
    const lancet = [[-.3, 0], [.3, 0], [.3, .82], [.17, 1.12], [0, 1.3], [-.17, 1.12], [-.3, .82]];
    trim.add(patchGeometry(lancet, .06, .02, { segments: 18, rings: 1 }), DARK, X, 2.6, Z + 1.13);
    glow.add(patchGeometry(lancet.map(([x, y]) => [x * .6, .1 + y * .82]), .04, .02, { segments: 18, rings: 1 }), lightC, X, 2.6, Z + 1.17);
    trim.add(new THREE.TorusGeometry(.3, .06, 5, 18), trimC, X, 4.2, Z + 1.15);
    glow.add(new THREE.CylinderGeometry(.25, .25, .04, 16), lightC, X, 4.2, Z + 1.14, Math.PI / 2);
    if (theme === 'lava' || theme === 'volcano') {
      for (let c = 0; c < 3; c++) {
        const x0 = (c - 1) * .62, pts = [];
        for (let i = 0; i < 5; i++) pts.push([x0 + (i % 2 ? .12 : -.08) + hash(c * 7 + i, 3) * .1, .15 + i * .42, 1.32 - i * .03]);
        glow.add(sweepGeometry(pts, [.05, .04, .035, .025, .012], { segments: 4, steps: 10 }), lightC, X, 0, Z);
      }
    }
    return [X + crook, 7.64, Z];
  },
  reef(k, X, Z, sx) {
    const { stone, trim, glow, color, trimC, lightC } = k;
    stone.add(grade(loftGeometry([[0, 1.62, 1.56], [.8, 1.32, 1.28], [2.2, 1.12, 1.1], [3.3, 1.24, 1.2], [4.1, 1.04, 1.0], [4.42, .66, .66], [4.5, .01, .01]], {
      segments: 22, steps: 16, warp: (x, y, z, u, v, a) => { const f = 1 + .06 * Math.sin(a * 5 + y * 2.2); return [x * f, y, z * f]; },
    }), 0, 4.5, .66), color, X, 0, Z);
    const shell = grade(loftGeometry([[4.15, .9, .9], [4.45, .84, .84], [5.4, .54, .54], [6.3, .25, .25], [6.9, .05, .05], [6.98, .005, .005]], {
      segments: 20, steps: 30, warp: (x, y, z, u, v, a) => { const f = 1 + .2 * Math.max(0, Math.sin(a + y * 8)) ** 3; return [x * f, y, z * f]; },
    }), 4.2, 7, .78);
    // Spiral grooves darken between the whorls of the turret shell.
    const sp = shell.attributes.position, sc = shell.attributes.color;
    for (let i = 0; i < sp.count; i++) {
      const s = .78 + .22 * Math.max(0, Math.sin(Math.atan2(sp.getX(i), sp.getZ(i)) + sp.getY(i) * 8));
      sc.setXYZ(i, sc.getX(i) * s, sc.getY(i) * s, sc.getZ(i) * s);
    }
    trim.add(shell, 0xffc6a8, X, 0, Z);
    for (let b = 0; b < 3; b++) {
      const a = (b - 1) * .9 - sx * .5, bx = Math.sin(a), bz = Math.cos(a), y = 1.6 + b * .7;
      const pts = [[bx * 1.05, y, bz * 1.05], [bx * 1.4, y + .45, bz * 1.4], [bx * 1.5, y + 1.05, bz * 1.45], [bx * 1.38, y + 1.5, bz * 1.32]];
      trim.add(sweepGeometry(pts, [.14, .11, .08, .04], { segments: 6, steps: 10 }), 0xff8a6a, X, 0, Z);
      trim.add(sweepGeometry([pts[1], [bx * 1.62, y + .85, bz * 1.62], [bx * 1.66, y + 1.15, bz * 1.66]], [.08, .05, .025], { segments: 5, steps: 6 }), 0xff9d7d, X, 0, Z);
    }
    for (let i = 0; i < 9; i++) {
      const a = hash(i, 9) * TAU, y = .5 + hash(i, 11) * 3.3, r = 1.18 + (y < 1 ? .25 : 0);
      trim.add(new THREE.SphereGeometry(.09 + hash(i, 13) * .07, 7, 5), trimC, X + Math.sin(a) * r, y, Z + Math.cos(a) * r);
    }
    trim.add(new THREE.TorusGeometry(.34, .09, 6, 18), GOLD, X, 2.55, Z + 1.12);
    glow.add(new THREE.CylinderGeometry(.27, .27, .05, 16), lightC, X, 2.55, Z + 1.12, Math.PI / 2);
    return [X, 6.88, Z];
  },
  prism(k, X, Z, sx, theme) {
    const { stone, trim, glow, color, roof, trimC, lightC } = k;
    stone.add(grade(faceted(lathe([[1.48, 0], [1.34, .5], [1.2, 4.0], [1.32, 4.25], [1.32, 4.45], [.9, 4.5]], 6, Math.PI / 6)), 0, 4.5, .64), color, X, 0, Z);
    for (const y of [1.5, 3.0]) trim.add(faceted(lathe([[1.31 - y * .03, y], [1.38 - y * .03, y + .06], [1.38 - y * .03, y + .2], [1.31 - y * .03, y + .26]], 6, Math.PI / 6)), trimC, X, 0, Z);
    const crystal = (h, r) => faceted(lathe([[.001, 0], [r, h * .18], [r * .9, h * .78], [.001, h]], 6));
    trim.add(crystal(3.15, .6), roof, X, 4.3, Z);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + .4, h = 1.3 + hash(i, 5) * .7;
      trim.add(crystal(h, .28), mix(roof, 0xffffff, .2), X + Math.sin(a) * .62, 4.32, Z + Math.cos(a) * .62, Math.cos(a) * .42, 0, -Math.sin(a) * .42);
    }
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * TAU + sx;
      glow.add(new THREE.OctahedronGeometry(.13).scale(1, 1.8, 1), lightC, X + Math.sin(a) * 1.2, 6.0 + i * .35, Z + Math.cos(a) * 1.2);
    }
    glow.box(.14, 2.2, .06, X, 2.3, Z + 1.24, lightC);
    if (theme === 'storm') {
      for (const y of [6.1, 6.6]) glow.add(new THREE.TorusGeometry(.32, .04, 4, 16), lightC, X, y, Z, Math.PI / 2);
    } else glow.add(new THREE.TorusGeometry(1.0, .04, 4, 28), lightC, X, 5.3, Z, Math.PI / 2 + .25 * sx, 0, .15);
    return [X, 7.4, Z];
  },
  casino(k, X, Z, sx) {
    const { stone, trim, glow, color, roof, lightC } = k;
    const sq = (y0, y1, r0, r1) => loftGeometry([[y0, r0, r0, 0, 0, .42], [y1, r1, r1, 0, 0, .42]], { segments: 24, steps: 2 });
    stone.add(grade(sq(0, 4.4, 1.46, 1.24), 0, 4.4, .7), color, X, 0, Z);
    for (const [y0, y1, r] of [[.35, .52, 1.48], [2.3, 2.44, 1.38], [4.3, 4.62, 1.42]]) trim.add(sq(y0, y1, r, r), roof, X, 0, Z);
    for (const ex of [-.92, .92]) for (let i = 0; i < 11; i++) {
      const y = .78 + i * .33;
      glow.add(new THREE.IcosahedronGeometry(.075, 0), i % 2 ? lightC : 0xffffff, X + ex, y, Z + 1.24 - y * .02);
    }
    glow.add(patchGeometry([[0, .42], [.3, 0], [0, -.42], [-.3, 0]], .05, .04, { segments: 16, rings: 1 }), 0xff3355, X, 3.3, Z + 1.27);
    trim.add(lathe([[1.15, 4.6], [1.22, 4.82], [1.06, 5.2], [.7, 5.55], [.3, 5.8], [.05, 5.98], [.001, 6.0]], 20), roof, X, 0, Z);
    trim.add(crownGeometry(1.24, .55, 6), roof, X, 4.62, Z);
    trim.cylinder(.56, .17, X, 6.52, Z, RED, 'z', .56, 20);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      trim.box(.16, .1, .19, X + Math.cos(a) * .48, 6.52 + Math.sin(a) * .48, Z, 0xffffff, 0, 0, a + Math.PI / 2);
    }
    trim.cylinder(.3, .19, X, 6.52, Z, 0xffffff, 'z', .3, 16);
    return [X, 7.06, Z];
  },
};

function flagGeometry() {
  const L = .9, H = .26, pts = [];
  for (let i = 0; i <= 4; i++) pts.push([L * i / 4, H - .03 * i]);
  pts.push([L * .72, 0]);
  for (let i = 4; i >= 0; i--) pts.push([L * i / 4, -H + .03 * i]);
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: .035, bevelEnabled: false });
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - .0175 + Math.sin(p.getX(i) * 5.2) * .07 * p.getX(i));
  g.computeVertexNormals();
  return g;
}

export function buildBattleTower(theme = 'desert') {
  const palette = THEMES[theme] || THEMES.desert, family = FAMILY[theme] || 'bastion', style = STYLE[family];
  const group = new THREE.Group(); group.name = `fort-${theme}`;
  const stone = assetBatch(), trim = assetBatch(), glow = assetBatch();
  const color = palette.tower, roof = palette.roof;
  const trimC = TRIM[theme] ?? mix(color, 0xfff1dc, .5), lightC = LIGHT[theme] ?? GOLD;
  const core = mix(color, DARK, .48), door = mix(roof, DARK, .12), iron = mix(trimC, DARK, .45);
  const k = { stone, trim, glow, wall: bent(stone), wallTrim: bent(trim), wallGlow: bent(glow), color, roof, trimC, lightC };
  const seed = Object.keys(THEMES).indexOf(theme) + 1;

  // Curtain wall: battered plinth, flat face and an overhanging parapet walk.
  k.wall.add(grade(extrudeAlongX([[-1.0, 0], [1.22, 0], [1.06, .62], [1.0, .7], [1.0, 2.24], [1.12, 2.33], [1.12, WALL_Y], [-1.0, WALL_Y]], 13.8, 20), 0, WALL_Y, .62, .92), core);
  k.wall.add(grade(extrudeAlongX([[-1.0, 0], [1.5, 0], [1.34, .62], [1.3, .72], [1.3, 3.3], [1.42, 3.4], [1.42, GATE_Y], [-1.0, GATE_Y]], 4.7, 4), 0, GATE_Y, .62, .92), core, 0, 0, 0);

  const windows = [3.35, 4.75].flatMap(x => [x, -x]);
  const holes = windows.map(x => [x - .32, x + .32, 1.05, 2.05]);
  k.wall.add(blockFace({ spans: [[-5.85, -2.36], [2.36, 5.85]], y0: .7, y1: 2.24, z: 1.005, holes, seed, ...style }), color);
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) {
    const w = i % 2 ? .46 : .74;
    k.wall.box(w, .44, .1, sx * (2.37 - w / 2), .98 + i * .5, 1.33, mix(color, trimC, .22));
  }
  for (const x of windows) {
    k.wallTrim.add(slab(archPoints(.24, .52, style.arch === 'pointed' ? 'pointed' : 'round'), .07), DARK, x, 1.15, .99);
    k.wallGlow.add(slab(archPoints(.13, .48, style.arch === 'pointed' ? 'pointed' : 'round'), .04), lightC, x, 1.2, 1.03);
  }
  for (const x of [-1.95, 1.95]) {
    k.wallTrim.box(.3, .9, .08, x, 2.25, 1.3, DARK);
    k.wallGlow.box(.1, .6, .05, x, 2.25, 1.34, lightC);
  }
  if (style.corbels) for (const [x0, x1] of [[-5.8, -2.4], [2.4, 5.8]]) {
    for (let x = x0 + .2; x < x1; x += .52) k.wallTrim.add(new THREE.BoxGeometry(.13, .2, .16), trimC, x, 2.17, 1.06);
  }
  parapet(k, style.top, [[-5.75, -2.42], [2.42, 5.75]], WALL_Y, .96, seed);
  parapet(k, style.top, [[-2.2, 2.2]], GATE_Y, 1.24, seed + 3);
  for (const sx of [-1, 1]) k.wallTrim.box(3.3, .1, .2, sx * 4.05, .72, 1.08, trimC);

  // Arched gate: dark recess, voussoir ring, keystone and crest light.
  const arch = archPoints(GATE_W, GATE_SPRING, style.arch), top = Math.max(...arch.map(p => p[1]));
  k.wall.add(slab(arch, .04), HOLE, 0, 0, 1.29);
  k.wallTrim.add(slab(archRing(GATE_W, .3, GATE_SPRING, style.arch), .24), trimC, 0, 0, 1.3);
  k.wallTrim.box(.38, .5, .32, 0, top + .16, 1.44, trimC);
  k.wallGlow.add(new THREE.OctahedronGeometry(.2), lightC, 0, Math.min(GATE_Y - .3, top + .7), 1.48);
  const gates = [];
  for (const side of [-1, 1]) {
    const cx = side * GATE_W / 2, gate = part(group, 'armored-gate', cx, 0, 1.33);
    const half = doorHalf(arch, side).map(([x, y]) => [x - cx - side * .015, y]);
    const panels = assetBatch();
    panels.add(slab(half, .12), door);
    const xs = half.map(p => p[0]), x0 = Math.min(...xs) + .05, x1 = Math.max(...xs) - .05;
    for (const y of [.42, 1.14]) {
      panels.box(x1 - x0, .1, .06, (x0 + x1) / 2, y, .13, iron);
      for (let i = 0; i < 3; i++) panels.add(new THREE.SphereGeometry(.035, 6, 4), iron, x0 + .12 + i * (x1 - x0 - .24) / 2, y, .17);
    }
    for (let i = 1; i < 3; i++) panels.box(.025, Math.min(GATE_SPRING, 1.4), .03, x0 + (x1 - x0) * i / 3, .75, .125, mix(door, DARK, .5));
    panels.finish(gate, 'gate-panels'); gates.push(gate);
  }

  const flags = [];
  for (const sx of [-1, 1]) {
    const X = sx * TOWER_X, Z = TOWER_Z;
    trim.add(grade(lathe([[1.72, 0], [1.72, .2], [1.64, .3]], 18), 0, .3, .55, .7), DARK, X, 0, Z);
    const [px, py, pz] = TOWERS[family](k, X, Z, sx, theme);
    trim.cylinder(.045, 1.0, px, py + .48, pz, trimC, 'y', .045, 6);
    trim.add(new THREE.SphereGeometry(.07, 8, 6), GOLD, px, py + 1.0, pz);
    const flag = part(group, 'fort-banner', px, py + .82, pz);
    const cloth = assetBatch(); cloth.add(flagGeometry(), RED, 0, 0, 0, 0, sx > 0 ? Math.PI : 0, 0); cloth.finish(flag, 'banner-cloth');
    flags.push({ group: flag, sx, y: flag.position.y });
  }
  stone.finish(group, 'fort-masonry'); trim.finish(group, 'fort-trim'); glow.finish(group, 'fort-lights', assetGlow);
  return {
    group,
    animate(t, state = {}) {
      const health = Math.max(0, Math.min(1, state.health ?? 1));
      for (const f of flags) {
        f.group.rotation.y = f.sx * .08 + Math.sin(t * 2.6 + f.sx) * .14;
        f.group.rotation.z = f.sx * (1 - health) * .22;
        f.group.position.y = f.y - (1 - health) * .22;
      }
      for (const gate of gates) gate.position.z = 1.33 - (state.hit || 0) * .045;
    },
  };
}
