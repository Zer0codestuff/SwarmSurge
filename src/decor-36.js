// Roadside decor for the worlds 36-50 biomes: harvest country, prehistoric wilds, cosmic finale.
// Each entry is (group, zCenter, totalLength) => void, matching DECOR in worlds.js.
// Props come from scenery-assets.js and scenery-36.js; keep the road corridor |x| < 8.8 clear.
import * as THREE from 'three';
import { paint, merge, scatter } from './models.js';
import { loftGeometry } from './boss-shapes.js';
import * as S from './scenery-assets.js';
import * as P from './scenery-36.js';

const vc = (flat = true) => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat });
const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
const emissiveVC = (color, strength = 1) => new THREE.MeshLambertMaterial({ vertexColors: true, emissive: color, emissiveIntensity: strength });

function far(g, mesh, x, y, z) { mesh.position.set(x, y, z); g.add(mesh); return mesh; }

function stars(g, zc, n, color, y0 = 20) {
  const geo = new THREE.BufferGeometry();
  const pts = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pts[i * 3] = (Math.random() - .5) * 400; pts[i * 3 + 1] = y0 + Math.random() * 120; pts[i * 3 + 2] = zc - 60 - Math.random() * 200; }
  geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color, size: .9, fog: false })));
}

function sideStrips(g, zc, total, color, opacity = 1, x = 12.5, w = 5) {
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, total), glow(color, opacity));
    m.rotation.x = -Math.PI / 2; m.position.set(sx * x, .02, zc); g.add(m);
  }
}

// Flat off-road water strip on both sides.
function waterStrips(g, zc, total, color, x = 13.2, w = 3.8) {
  const mat = new THREE.MeshLambertMaterial({ color });
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, total), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(sx * x, .02, zc); g.add(m);
  }
}

// Evenly spaced line of oriented props along both road sides (fences, gates).
function instLine(g, geo, mat, spacing, x, zc, total, rotY = 0, sMin = 1, sMax = 1, y = 0, jitter = .5) {
  const n = Math.max(2, Math.round(total / spacing));
  const inst = new THREE.InstancedMesh(geo, mat, n * 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3();
  let k = 0;
  for (const sx of [-1, 1]) for (let i = 0; i < n; i++) {
    p.set(sx * x + (Math.random() - .5) * jitter, y, zc - total / 2 + (i + .5) * (total / n) + (Math.random() - .5) * jitter);
    q.setFromAxisAngle(up, rotY + (Math.random() - .5) * .1);
    const s = sMin + Math.random() * (sMax - sMin);
    sc.set(s, s, s); m.compose(p, q, sc); inst.setMatrixAt(k++, m);
  }
  inst.castShadow = false;
  g.add(inst);
  return inst;
}

// Place explicit [x, z, scale] items with a random spin around y.
function placeInstances(g, geo, mat, items, y, cast = false) {
  const inst = new THREE.InstancedMesh(geo, mat, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3();
  items.forEach(([x, z, s], i) => {
    q.setFromAxisAngle(up, Math.random() * 6.28);
    p.set(x, y, z); sc.set(s, s, s);
    m.compose(p, q, sc); inst.setMatrixAt(i, m);
  });
  inst.castShadow = cast;
  g.add(inst);
  return inst;
}

// Two props sharing the same instance transforms (an opaque base plus a glowing part).
function scatter2(g, geoA, matA, geoB, matB, n, minX, spreadX, zc, total, sMin = .7, sMax = 1.6, y = 0) {
  const a = scatter(g, geoA, matA, n, minX, spreadX, zc, total, sMin, sMax, y, false);
  const b = new THREE.InstancedMesh(geoB, matB, n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { a.getMatrixAt(i, m); b.setMatrixAt(i, m); }
  b.castShadow = false;
  g.add(b);
  return [a, b];
}

// Puffy cumulus clump for cloud banks and skies.
function cloudPuff() {
  const parts = [];
  for (let k = 0; k < 4; k++) parts.push(paint(new THREE.SphereGeometry(1.6 - k * .22, 9, 7).translate((k - 1.5) * 1.9, (k % 2) * .7, (k % 2) * .9), 0xffffff));
  return merge(parts);
}

// Distant aurora curtains with a vertical color gradient, additive so they glow.
function auroraRibbons(g, zc, total) {
  const cols = [[0x3affa0, 0x2a7aff], [0x6affd8, 0xb04aff], [0x9aff6a, 0x2a9aff]];
  for (let r = 0; r < 3; r++) {
    const geo = new THREE.PlaneGeometry(90, 17, 22, 6);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, Math.sin(x * .11 + r * 2) * 7 + Math.sin(y * .3 + x * .06) * 2);
      p.setY(i, y + Math.sin(x * .07 + r) * 3);
    }
    const colors = new Float32Array(p.count * 3);
    const cA = new THREE.Color(cols[r][0]), cB = new THREE.Color(cols[r][1]), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      c.copy(cA).lerp(cB, Math.min(1, Math.max(0, p.getY(i) / 17 + .5)));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .38, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, fog: false });
    far(g, new THREE.Mesh(geo, mat), (r - 1) * 55, 34 + r * 7, zc - total / 2 - 50 - r * 30);
  }
}

// Soft radial nebula glows on the far sky dome.
function nebulaBackdrop(g, zc, total) {
  const specs = [[0xff6ad0, -60, 34, 46], [0x6a9aff, 40, 40, 60], [0xff9a5a, 90, 26, 34], [0x8affd8, -110, 24, 30]];
  for (const [color, x, y, r] of specs) {
    const geo = new THREE.CircleGeometry(r, 26);
    const p = geo.attributes.position, colors = new Float32Array(p.count * 3), c = new THREE.Color(color);
    for (let i = 0; i < p.count; i++) {
      const f = 1 - Math.min(1, Math.hypot(p.getX(i), p.getY(i)) / r) ** 1.6;
      colors[i * 3] = c.r * f; colors[i * 3 + 1] = c.g * f; colors[i * 3 + 2] = c.b * f;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, fog: false });
    far(g, new THREE.Mesh(geo, mat), x, y, zc - total / 2 - 120);
  }
}

// Flowing rainbow strip along both road sides for the prism labs.
function rainbowStrips(g, zc, total, x) {
  const spacing = .66;
  const seg = new THREE.PlaneGeometry(.5, spacing * 1.04); seg.rotateX(-Math.PI / 2);
  const n = Math.floor(total / spacing);
  const inst = new THREE.InstancedMesh(seg, new THREE.MeshBasicMaterial(), n * 2);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  let k = 0;
  for (const sx of [-1, 1]) for (let i = 0; i < n; i++) {
    m.makeTranslation(sx * x, .03, zc - total / 2 + i * spacing);
    inst.setMatrixAt(k, m);
    inst.setColorAt(k, c.setHSL(((i / 6) % 1 + 1) % 1, .85, .58));
    k++;
  }
  inst.castShadow = false;
  g.add(inst);
}

// Irregular koi pond patch.
function pondPatch() {
  const g = new THREE.CircleGeometry(2.4, 14);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const d = 1 + .18 * Math.sin(p.getX(i) * 2.1) * Math.cos(p.getZ(i) * 1.7 + 1);
    p.setX(i, p.getX(i) * d); p.setZ(i, p.getZ(i) * d);
  }
  g.computeVertexNormals();
  return paint(g, 0x2a5a50, (x, y, z) => .84 + .16 * Math.min(1, Math.hypot(x, z) / 2.4));
}

// Koi pond patches off-road, with lily pads, blooms, koi and a bridge over every third pond.
function bambooPonds(g, zc, total) {
  const ponds = [], pads = [], blooms = [], kois = [], spans = [];
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) {
    const x = sx * (11.5 + Math.random() * 6.5), z = zc - total / 2 + (i + .5) * (total / 5) + (Math.random() - .5) * 16, s = 1 + Math.random() * .9;
    ponds.push([x, z, s]);
    for (let k = 0; k < 5; k++) pads.push([x + (Math.random() - .5) * 3.4 * s, z + (Math.random() - .5) * 3.4 * s, .65 + Math.random() * .7]);
    for (let k = 0; k < 2; k++) blooms.push([x + (Math.random() - .5) * 3 * s, z + (Math.random() - .5) * 3 * s, .7 + Math.random() * .5]);
    for (let k = 0; k < 2; k++) kois.push([x + (Math.random() - .5) * 2.8 * s, z + (Math.random() - .5) * 2.8 * s, .8 + Math.random() * .6]);
    if (i % 3 === 1) spans.push([x, z, s]);
  }
  placeInstances(g, pondPatch(), vc(false), ponds, .04);
  placeInstances(g, P.lilyPad(), vc(false), pads, .07);
  placeInstances(g, P.lilyBloom(), vc(false), blooms, .07);
  placeInstances(g, P.koi(), vc(false), kois, .08);
  const bridgeGeo = P.bridge();
  for (const [x, z, s] of spans) far(g, new THREE.Mesh(bridgeGeo, vc(false)), x, 0, z).scale.setScalar(s * 1.1);
}

// Smoking volcano landmark: noise cone, glowing crater and a drift of ash.
function volcanoLandmark(g, x, z, seed = 1, s = 1) {
  const cone = loftGeometry([[0, 5, 5], [3.4, 3.8, 3.8], [6.4, 2.2, 2.2], [8.6, .8, .8], [9.4, .02, .02]], {
    segments: 14, steps: 8, warp: (px, py, pz, u, v, a) => { const f = 1 + .14 * Math.sin(a * 5 + seed) * Math.sin(py * .5); return [px * f, py, pz * f]; },
  });
  const body = new THREE.Group();
  body.add(new THREE.Mesh(paint(facetedLocal(cone), 0x4a3630), vc(true)));
  body.add(new THREE.Mesh(new THREE.CircleGeometry(2.1, 14).rotateX(-Math.PI / 2), glow(0xff6a1a)).translateY(5.72));
  const smoke = [];
  for (let k = 0; k < 4; k++) smoke.push(paint(new THREE.SphereGeometry(1.7 - k * .22, 8, 6).translate((k - 1.2) * 1.2, 6.4 + k * 1.6, (k % 2) * .9), k % 2 ? 0x6a5a52 : 0x7a6a60));
  body.add(new THREE.Mesh(merge(smoke), vc(false)));
  body.scale.setScalar(s);
  body.position.set(x, 0, z);
  g.add(body);
}
function facetedLocal(g) {
  const out = g.index ? g.toNonIndexed() : g;
  if (out !== g) g.dispose();
  out.computeVertexNormals();
  return out;
}

export const DECOR = {
  // 36 Harvest Fields: wheat fringes, hay bales, fence lines, red barns and a windmill far out.
  farm(g, zc, total) {
    scatter(g, P.wheatTuft(), vc(false), 300, 8.8, 3.2, zc, total, .8, 1.5, 0, false);
    scatter(g, P.wheatTuft(2), vc(false), 240, 11.8, 42, zc, total, .9, 1.7, 0, false);
    scatter(g, P.hayBale(), vc(false), 44, 10.5, 36, zc, total, .8, 1.7);
    instLine(g, P.fenceRun(), vc(false), 7.5, 9.3, zc, total, Math.PI / 2, .9, 1.15);
    scatter(g, P.hillMound(0xc8b050, 2), vc(false), 24, 18, 48, zc, total, .8, 2.1, -.06, false);
    scatter(g, S.pebble(4, 0xb09a5a), vc(false), 300, 9, 55, zc, total, .3, .7, 0, false);
    scatter(g, S.rockCluster(0x9a8a6a, 6), vc(false), 26, 16, 50, zc, total, .6, 1.2, 0, false);
    const barnGeo = P.barn();
    for (let k = 0; k < 4; k++) {
      const sx = k % 2 ? 1 : -1;
      const b = far(g, new THREE.Mesh(barnGeo, vc(false)), sx * (24 + (k % 3) * 9), 0, zc - total / 2 + 50 + k * (total / 4));
      b.rotation.y = (sx > 0 ? -Math.PI / 2 : Math.PI / 2) + (k % 2 ? .3 : -.2);
    }
    for (let k = 0; k < 2; k++) {
      const sx = k ? 1 : -1;
      far(g, new THREE.Mesh(P.windmill(), vc(false)), sx * (30 + k * 14), 0, zc + total / 6 - k * total / 3).rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
  },

  // 37 Orchard Hills: apple rows on mounds, baskets, ladders, dropped fruit.
  orchard(g, zc, total) {
    scatter(g, P.fruitTree(1), vc(false), 84, 9.5, 24, zc, total, .8, 1.35);
    scatter(g, P.fruitTree(2, { leaf: 0x4aa84a, leaf2: 0x3a9840, fruit: 0xff8a2a, fruits: 6 }), vc(false), 66, 13, 38, zc, total, .9, 1.5);
    scatter(g, P.hillMound(0x5aa83e, 3), vc(false), 28, 16, 48, zc, total, .8, 2.1, -.06, false);
    scatter(g, P.basket(), vc(false), 42, 9, 20, zc, total, .8, 1.4, 0, false);
    scatter(g, P.ladder(), vc(false), 22, 9.5, 18, zc, total, .85, 1.2);
    scatter(g, paint(new THREE.SphereGeometry(.12, 6, 4), 0xd83a2a), vc(false), 150, 8.8, 9, zc, total, .6, 1.1, 0, false);
    scatter(g, S.bush(0x3f8a3a, 0xff8ab0), vc(false), 80, 9.5, 34, zc, total, .7, 1.3, 0, false);
    scatter(g, S.pebble(6, 0x8a9a6a), vc(false), 240, 9, 50, zc, total, .3, .6, 0, false);
  },

  // 38 Bamboo Gardens: stalk rows and groves, lanterns, koi pond patches with arched bridges.
  bamboo(g, zc, total) {
    scatter(g, P.bambooStalk(), vc(false), 150, 8.8, 3.4, zc, total, .75, 1.1);
    scatter(g, P.bambooGrove(2), vc(false), 46, 11, 32, zc, total, 1.0, 1.6);
    scatter(g, P.reeds(3), vc(false), 90, 10.2, 6.5, zc, total, .8, 1.4, 0, false);
    scatter(g, P.stoneLantern(), vc(false), 34, 9.2, 13, zc, total, .8, 1.25);
    scatter(g, S.rockCluster(0x6a8a5a, 4), vc(false), 24, 14, 36, zc, total, .5, 1.1, 0, false);
    bambooPonds(g, zc, total);
  },

  // 39 Autumn Woods: maples in three hues, leaf drifts, fallen logs, mushrooms.
  autumn(g, zc, total) {
    scatter(g, P.fruitTree(3, { leaf: 0xd8721e, leaf2: 0xc85a1a, fruits: 0 }), vc(false), 70, 10, 32, zc, total, .8, 1.4);
    scatter(g, P.fruitTree(4, { leaf: 0xc8422a, leaf2: 0xa83220, fruits: 0 }), vc(false), 55, 12, 40, zc, total, .9, 1.5);
    scatter(g, P.fruitTree(5, { leaf: 0xe0a82a, leaf2: 0xcf9620, fruits: 0 }), vc(false), 48, 11, 44, zc, total, .85, 1.45);
    scatter(g, P.leafPile(0xd8721e), vc(false), 80, 9, 15, zc, total, .7, 1.5, .02, false);
    scatter(g, P.leafPile(0xc8422a), vc(false), 60, 10, 24, zc, total, .6, 1.3, .02, false);
    scatter(g, P.fallenLog(), vc(false), 26, 10, 26, zc, total, .8, 1.3);
    scatter(g, S.mushroom(0xc85a2a), vc(false), 70, 9, 18, zc, total, .6, 1.2, 0, false);
    scatter(g, S.bush(0x8a5a2a, 0xd8721e), vc(false), 60, 10, 30, zc, total, .7, 1.2, 0, false);
    scatter(g, S.pebble(14, 0x7a5a34), vc(false), 200, 9, 44, zc, total, .3, .6, 0, false);
  },

  // 40 Sakura Castle: blossom trees, petal drifts, lanterns, torii gates and a far pagoda.
  sakura(g, zc, total) {
    scatter(g, P.fruitTree(6, { trunk: 0x503238, leaf: 0xffb8cc, leaf2: 0xff9ab8, fruits: 0 }), vc(false), 84, 9.5, 24, zc, total, .8, 1.4);
    scatter(g, P.fruitTree(7, { trunk: 0x503238, leaf: 0xffd0dc, leaf2: 0xffb0c4, fruits: 0 }), vc(false), 48, 14, 38, zc, total, .9, 1.5);
    scatter(g, P.leafPile(0xffb8cc), vc(false), 90, 9, 13, zc, total, .6, 1.3, .02, false);
    scatter(g, P.stoneLantern(), vc(false), 38, 9.2, 14, zc, total, .8, 1.25);
    scatter(g, S.bush(0x4a7a3a, 0xffb0c8), vc(false), 70, 9.5, 22, zc, total, .6, 1.2, 0, false);
    scatter(g, S.rockCluster(0x8a8a92, 8), vc(false), 22, 13, 30, zc, total, .5, 1, 0, false);
    scatter(g, S.pebble(9, 0x9aa0a8), vc(false), 200, 9, 44, zc, total, .25, .5, 0, false);
    instLine(g, P.torii(), vc(false), 52, 10.6, zc, total, 0, .9, 1.1);
    const pagodaGeo = P.pagoda();
    for (let k = 0; k < 2; k++) {
      const sx = k ? 1 : -1;
      far(g, new THREE.Mesh(pagodaGeo, vc(false)), sx * 38, 0, zc + 30 - k * 90).rotation.y = sx * .8;
    }
  },

  // 41 Dino Valley: ferns and cycads, nests with eggs, rib cages, smoking volcanoes.
  dino(g, zc, total) {
    scatter(g, P.fern(), vc(false), 130, 8.8, 28, zc, total, 1.2, 2.2, 0, false);
    scatter(g, P.fern(3), vc(false), 22, 10, 30, zc, total, 2.4, 3.4, 0, false);
    scatter(g, P.cycad(), vc(false), 85, 10, 36, zc, total, 1.3, 2.2);
    scatter(g, P.nestEggs(1, 3), vc(false), 16, 11, 26, zc, total, .9, 1.4);
    scatter(g, P.nestEggs(2, 2), vc(false), 6, 18, 34, zc, total, 3.2, 4.6);
    scatter(g, P.ribCage(), vc(false), 10, 12, 30, zc, total, .9, 1.6);
    scatter(g, S.rockCluster(0x6a7a4a, 5), vc(false), 40, 12, 40, zc, total, .7, 1.4, 0, false);
    scatter(g, S.pebble(7, 0x7a6a4a), vc(false), 260, 9, 50, zc, total, .3, .7, 0, false);
    for (let k = 0; k < 3; k++) {
      const sx = k % 2 ? 1 : -1, z = zc - total / 2 + 60 + k * (total / 3), x = sx * (38 + (k % 3) * 8);
      volcanoLandmark(g, x, z, k + 1, 1.35);
    }
  },

  // 42 Misty Swamp: murky water strips, cypress with hanging moss, lily pads, reeds.
  swamp(g, zc, total) {
    waterStrips(g, zc, total, 0x27402e, 13.6, 5.5);
    scatter(g, P.cypress(), vc(false), 88, 10.5, 30, zc, total, .8, 1.45);
    scatter(g, P.cypress(4), vc(false), 18, 38, 60, zc, total, 2.0, 3.0, 0, false);
    scatter(g, P.lilyPad(), vc(false), 130, 11.4, 4.2, zc, total, .7, 1.4, .05, false);
    scatter(g, P.lilyBloom(), vc(false), 30, 11.8, 3.6, zc, total, .7, 1.15, .06, false);
    scatter(g, P.reeds(), vc(false), 150, 9.2, 7, zc, total, .8, 1.5, 0, false);
    scatter(g, S.mushroom(0x7a9a4a), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x1a2a08 }), 50, 9.5, 14, zc, total, .6, 1.2, 0, false);
    scatter(g, S.rockCluster(0x465244, 9), vc(false), 28, 12, 30, zc, total, .6, 1.2, 0, false);
    scatter(g, S.pebble(8, 0x39443a), vc(false), 220, 9, 45, zc, total, .3, .6, 0, false);
  },

  // 43 Tar Pits: glossy pools with bubbles, bones, dead trees, steam vents and glowing seams.
  tarpit(g, zc, total) {
    const tar = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .2, metalness: .72 });
    scatter(g, P.tarPool(), tar, 26, 9.5, 24, zc, total, .9, 2.1, .02, false);
    scatter(g, P.steamVent(), vc(false), 44, 10, 28, zc, total, .7, 1.3, 0, false);
    scatter(g, S.crystalCluster(0xff6a1a, 6, 0x2a1c14), emissiveVC(0xa03a00, 1.2), 34, 9.5, 22, zc, total, .4, .9, 0, false);
    scatter(g, P.bone(), vc(false), 70, 9, 26, zc, total, .7, 1.3, 0, false);
    scatter(g, P.ribCage(2), vc(false), 12, 11, 26, zc, total, .8, 1.4);
    scatter(g, S.deadTree(0x3a2e22, .95), vc(false), 55, 10, 34, zc, total, .8, 1.5);
    scatter(g, S.rockCluster(0x362c24, 10), vc(false), 46, 11, 36, zc, total, .6, 1.4, 0, false);
    sideStrips(g, zc, total, 0xff6a1a, .4, 11, 1.1);
  },

  // 44 Amber Caves: glowing amber clusters and spikes, insect nodules, hanging stalactites.
  amber(g, zc, total) {
    const glowMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xb05a08 });
    scatter(g, S.crystalCluster(0xffa02a, 3, 0x3a200e), glowMat, 120, 9.5, 38, zc, total, .5, 1.5);
    scatter(g, P.amberSpike(2.6, .45), glowMat, 70, 9.5, 30, zc, total, .5, 1.4);
    scatter(g, P.amberSpike(3.4, .5, true), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x8a4208 }), 60, 8.8, 38, zc, total, .6, 1.5, 16.5, false);
    const amberSkin = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: .85, roughness: .18, metalness: .05 });
    scatter(g, P.insectAmber(), amberSkin, 42, 9.2, 22, zc, total, .7, 1.3, .15, false);
    scatter(g, S.rockCluster(0x4a2e14, 11), vc(false), 56, 11, 40, zc, total, .6, 1.4, 0, false);
    scatter(g, S.pebble(9, 0x6a4420), vc(false), 240, 9, 50, zc, total, .3, .6, 0, false);
    sideStrips(g, zc, total, 0xffa028, .3, 9.6, .8);
  },

  // 45 Sky Nest: giant twig nests with eggs, rock spires, a cloud sea below the edges.
  nest(g, zc, total) {
    scatter(g, P.nestEggs(5, 3), vc(false), 10, 11, 20, zc, total, 3.0, 4.2);
    scatter(g, P.nestEggs(6, 2), vc(false), 10, 9.5, 16, zc, total, .9, 1.3);
    scatter(g, P.spireRock(), vc(false), 42, 12, 40, zc, total, .8, 1.8);
    scatter(g, P.spireRock(4, 0xc8b28a), vc(false), 12, 30, 50, zc, total, 1.8, 2.6, 0, false);
    scatter(g, S.rockCluster(0xb09a78, 12), vc(false), 40, 10, 34, zc, total, .6, 1.3, 0, false);
    scatter(g, S.pebble(10, 0xa8926a), vc(false), 220, 9, 46, zc, total, .3, .6, 0, false);
    const puffGeo = cloudPuff();
    const sea = scatter(g, puffGeo, vc(false), 30, 24, 60, zc, total, 2.6, 4.2, -3.2, false);
    sea.name = 'nest-cloud-sea';
    for (let k = 0; k < 6; k++) {
      far(g, new THREE.Mesh(puffGeo, vc(false)), -120 + k * 48, -3 + (k % 3), zc - total / 2 - 30 - (k % 2) * 40).scale.setScalar(3 + (k % 3));
    }
  },

  // 46 Prism Labs: glass prisms on pedestals, emitter posts, tech panels, rainbow strips.
  prismlab(g, zc, total) {
    const prismMat = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: .6, roughness: .06, metalness: .05 });
    scatter2(g, P.pedestal(), vc(false), P.glassPrism().translate(0, 1.0, 0), prismMat, 34, 9.6, 26, zc, total, .8, 1.2, 0);
    scatter(g, P.glassPrism(), prismMat, 26, 12, 30, zc, total, .7, 1.2);
    scatter2(g, P.laserPost(), vc(false), new THREE.SphereGeometry(.19, 8, 6).translate(0, 2.5, 0), glow(0x8af0ff, .85), 40, 9.4, 4, zc, total, .9, 1.15);
    scatter(g, P.techPanel(), vc(false), 64, 9, 30, zc, total, .7, 1.4, 0, false);
    rainbowStrips(g, zc, total, 9.7);
    scatter(g, S.column({ height: 4.2, radius: .38, color: 0xe2e7f0, cap: 0xc8d0de }), vc(false), 26, 11, 24, zc, total, .9, 1.1);
    scatter(g, S.pebble(13, 0xaab4cc), vc(false), 160, 9, 40, zc, total, .25, .5, 0, false);
  },

  // 47 Aurora Tundra: snowy pines, ice crystal spires, and aurora curtains far over the snow.
  aurora(g, zc, total) {
    scatter(g, S.pine(true, 0x2a4a44, 0x37635c), vc(false), 190, 10, 44, zc, total, .7, 1.3);
    scatter(g, S.crystalCluster(0x9fe8ff, 3, 0xcfe4f5), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x0e3a4a }), 80, 9.5, 30, zc, total, .5, 1.3, 0, false);
    scatter(g, P.spireRock(2, 0xcadcec), vc(false), 30, 14, 42, zc, total, .7, 1.4, 0, false);
    scatter(g, S.rockCluster(0xd0e0f0, 13), vc(false), 40, 11, 36, zc, total, .5, 1.2, 0, false);
    scatter(g, S.pebble(11, 0xe8f2fc), vc(false), 240, 9, 50, zc, total, .25, .5, 0, false);
    auroraRibbons(g, zc, total);
  },

  // 48 Chrono Clockworks: brass clock towers, standing gears, pendulums and hourglasses.
  chrono(g, zc, total) {
    scatter(g, P.clockTower(), vc(false), 18, 11, 26, zc, total, .85, 1.3);
    scatter(g, S.gear(0xc8982a, 12), vc(false), 48, 9.4, 22, zc, total, .7, 1.5, 0, false);
    scatter(g, P.pendulum(), vc(false), 22, 10, 22, zc, total, .8, 1.2);
    scatter(g, P.hourglass(), vc(false), 30, 9.2, 18, zc, total, .8, 1.2, 0, false);
    scatter(g, S.gear(0x8a6a2a, 8), vc(false), 26, 14, 36, zc, total, 1.7, 2.7, 0, false);
    scatter(g, S.pebble(12, 0x4a4038), vc(false), 200, 9, 44, zc, total, .3, .6, 0, false);
    sideStrips(g, zc, total, 0xffc84a, .25, 9.5, .7);
  },

  // 49 Nebula Reef: glowing space coral, drifting jellies, asteroid reefs under a nebula sky.
  nebula(g, zc, total) {
    stars(g, zc, 700, 0xffffff, 0);
    nebulaBackdrop(g, zc, total);
    scatter(g, S.coral(0xff6ad0, 1), emissiveVC(0x8a1458, .8), 55, 9, 30, zc, total, .7, 1.5, 0, false);
    scatter(g, S.coral(0x6af0ff, 2), emissiveVC(0x0a5a6a, .8), 45, 10, 34, zc, total, .7, 1.5, 0, false);
    scatter(g, P.jelly(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }), 55, 9.5, 34, zc, total, .7, 1.6, 3.4, false);
    scatter(g, S.asteroid(5, 0x3a2f4a), vc(false), 110, 10, 46, zc, total, .4, 1.8, 1.8, false);
    scatter(g, S.floatingShard(0xb08aff), emissiveVC(0x4a2a9a, .8), 40, 9, 30, zc, total, .6, 1.4, 1.8, false);
    sideStrips(g, zc, total, 0x6af0ff, .2, 9.5, .7);
  },

  // 50 Singularity Throne: golden pillar avenue, floating crowns and orbs under a far portal ring.
  throne(g, zc, total) {
    stars(g, zc, 800, 0xffe8c0, 0);
    // A giant portal ring and throne camped on the plain, offset so the fort gate never hides it.
    const ringZ = zc - total / 2 + 70, ringX = 30;
    const gold = new THREE.MeshLambertMaterial({ color: 0x8a6a1a, emissive: 0xffd86a, emissiveIntensity: .8, fog: false });
    // Sunk a third into the plain: the full arc stays inside the opening frame on wide screens.
    far(g, new THREE.Mesh(new THREE.TorusGeometry(12.5, 1.3, 8, 44), gold), ringX, 3.2, ringZ);
    far(g, new THREE.Mesh(new THREE.CircleGeometry(11.2, 40), new THREE.MeshBasicMaterial({ color: 0xffe8a0, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, fog: false })), ringX, 3.2, ringZ);
    const daisMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: false });
    far(g, new THREE.Mesh(paint(new THREE.CylinderGeometry(9, 11, 2.4, 12).translate(0, 1.2, 0), 0x241430), daisMat), ringX, 0, ringZ + 8);
    const back = loftGeometry([[0, 2.2, .9, 0, 0, 4], [7.5, 1.7, .7, 0, 0, 4], [10.5, .5, .5, 0, 0, 4]], { segments: 10, steps: 3 });
    far(g, new THREE.Mesh(paint(back, 0x140a20), daisMat), ringX, 2.4, ringZ + 4);
    far(g, new THREE.Mesh(paint(new THREE.BoxGeometry(7, 1.4, 1.2).translate(0, 3.2, 0), 0xffd86a), daisMat), ringX, 0, ringZ + 7.5);
    scatter(g, S.column({ height: 7, radius: .55, color: 0xd8a838, cap: 0xffd86a, banner: 0x8a1a3a }), vc(false), 30, 9.6, 9, zc, total, .95, 1.25);
    scatter(g, P.crownProp(), emissiveVC(0x8a5a10, .6), 34, 9.5, 26, zc, total, .8, 1.5, 1.5, false);
    scatter2(g, P.pedestal(), vc(false), new THREE.SphereGeometry(.42, 10, 8).translate(0, 1.5, 0), glow(0xffd86a, .9), 22, 10, 24, zc, total, .8, 1.15, 0);
    scatter(g, S.floatingShard(0xffd86a), emissiveVC(0x9a6a10, .8), 40, 10, 30, zc, total, .5, 1.2, 2.4, false);
    scatter(g, S.rockCluster(0x1a1028, 14), vc(false), 28, 14, 36, zc, total, .6, 1.3, 0, false);
  },
};
