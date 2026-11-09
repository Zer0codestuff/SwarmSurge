// Sculpted roadside: a rounded kerb and one fence design per fort architecture family.
// Posts and spans are instanced in chunks along the road so distant chunks are culled.
import * as THREE from 'three';
import { assetBatch, bevelBox } from './asset-kit.js';
import { sweepGeometry } from './boss-shapes.js';

export const ROAD_SPAN = 2.5;
const SPAN = ROAD_SPAN, CHUNK = 100, GOLD = 0xffc85a;
const lathe = (profile, sides, phase = 0) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(.001, r), y)), sides, phase);
const faceted = (geometry) => { const flat = geometry.toNonIndexed(); geometry.dispose(); flat.computeVertexNormals(); return flat; };
const tone = (hex, factor) => new THREE.Color(hex).multiplyScalar(factor).getHex();

// A closed profile in (x, y) swept along z. Smooth profiles share normals around the section.
function extrudeZ(profile, length, smooth = false) {
  const n = profile.length, positions = [], indices = [];
  for (const z of [0, length]) for (const [x, y] of profile) positions.push(x, y, z);
  for (let k = 0; k < n; k++) { const a = k, b = (k + 1) % n; indices.push(a, a + n, b, b, a + n, b + n); }
  let geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices);
  if (smooth) geometry.computeVertexNormals(); else geometry = faceted(geometry);
  return geometry;
}
// A straight bar from one post to the next.
function bar(batch, radius, y, color, sides = 6, x = 0) {
  batch.add(new THREE.CylinderGeometry(radius, radius, SPAN, sides, 1, true), color, x, y, SPAN / 2, Math.PI / 2);
}
// A rope or garland hanging between two posts.
function sag(batch, top, drop, radius, color) {
  batch.add(sweepGeometry([[0, top, 0], [0, top - drop * .78, SPAN * .25], [0, top - drop, SPAN * .5], [0, top - drop * .78, SPAN * .75], [0, top, SPAN]], [radius, radius], { segments: 5, steps: 8 }), color);
}

// Each family fills a post batch and a span batch; `lit` parts use the unlit glow material.
// Local -x faces the road. Colors: post (fence), accent (roof), stone (wall), light (rail).
const FAMILIES = {
  // Turned bollards with capped heads and two timber rails.
  bastion({ post, span }, c) {
    post.add(lathe([[.18, 0], [.18, .1], [.13, .16], [.12, .9]], 6), c.post);
    post.add(lathe([[.12, .88], [.19, .92], [.18, 1.04], [.09, 1.13], [0, 1.14]], 6), c.accent);
    bar(span, .055, .8, tone(c.post, 1.12)); bar(span, .045, .42, tone(c.post, .9));
  },
  // Square stone pylons with stepped caps, a lintel beam and a stub baluster.
  temple({ post, span }, c) {
    post.add(faceted(lathe([[.24, 0], [.24, .12], [.19, .16], [.16, .92]], 4, Math.PI / 4)), c.stone);
    post.add(faceted(lathe([[.16, .9], [.25, .96], [.25, 1.08], [.12, 1.22], [0, 1.22]], 4, Math.PI / 4)), c.accent);
    span.add(bevelBox(.2, .16, SPAN, .03), tone(c.stone, 1.08), 0, .76, SPAN / 2);
    span.add(faceted(lathe([[.1, 0], [.07, .68]], 4, Math.PI / 4)), tone(c.stone, .9), 0, 0, SPAN / 2);
  },
  // Slim balusters with onion finials and a hanging garland.
  crown({ post, span }, c) {
    post.add(lathe([[.13, 0], [.14, .07], [.07, .2], [.06, .86]], 6), c.post);
    post.add(lathe([[.06, .84], [.11, .9], [.05, .98], [.15, 1.14], [.11, 1.28], [0, 1.46]], 6), c.accent);
    sag(span, .88, .32, .045, c.light); bar(span, .035, .3, tone(c.post, .9));
  },
  // Steel posts on base plates with a corrugated guard rail and a reflector.
  station({ post, span, lit }, c) {
    post.add(bevelBox(.1, 1, .16, .02), c.post, 0, .5, 0);
    post.add(bevelBox(.26, .06, .26, .02), tone(c.post, .8), 0, .03, 0);
    lit.add(bevelBox(.03, .12, .1, .01), c.light, -.065, .88, 0);
    const wave = [[-.06, .46], [-.12, .53], [-.06, .62], [-.12, .71], [-.06, .78]];
    span.add(extrudeZ([...wave, ...wave.map(([x, y]) => [x + .035, y]).reverse()], SPAN), tone(c.post, 1.2));
  },
  // Iron columns with pinnacles and a row of spear pickets.
  gothic({ post, span }, c) {
    post.add(faceted(lathe([[.15, 0], [.15, .1], [.11, .14], [.11, 1.06], [.17, 1.1], [.17, 1.2], [0, 1.62]], 4, Math.PI / 4)), c.post);
    bar(span, .03, 1, c.post, 4); bar(span, .03, .22, c.post, 4);
    for (const z of [.625, 1.25, 1.875]) {
      span.add(lathe([[.03, .22], [.03, 1.1]], 4), c.post, 0, 0, z);
      span.add(faceted(lathe([[.03, 1.08], [.07, 1.15], [0, 1.4]], 4)), c.accent, 0, 0, z);
    }
  },
  // Coral stubs with a side branch and a slack rope.
  reef({ post, span }, c) {
    post.add(lathe([[.2, 0], [.13, .28], [.17, .55], [.1, .85], [.16, 1.02], [.08, 1.18], [0, 1.2]], 6), c.accent);
    post.add(sweepGeometry([[.1, .58, 0], [.27, .78, .05], [.3, 1, .02]], [.07, .06, .04], { segments: 5, steps: 4 }), tone(c.accent, 1.15));
    sag(span, .95, .4, .04, c.post);
  },
  // Faceted crystal posts joined by a light bar.
  prism({ post, span, lit }, c) {
    post.add(faceted(lathe([[.15, 0], [.2, .45], [.13, 1.15], [0, 1.5]], 6)), c.accent);
    post.add(faceted(lathe([[.08, 0], [.1, .3], [0, .7]], 5)), tone(c.accent, 1.2), .15, .03, .08, 0, 0, -.35);
    bar(span, .03, .28, tone(c.post, .9), 4);
    lit.add(new THREE.CylinderGeometry(.035, .035, SPAN, 5, 1, true), c.light, 0, .74, SPAN / 2, Math.PI / 2);
  },
  // Gold stanchions with ball tops and a velvet rope.
  casino({ post, span }, c) {
    post.add(lathe([[.19, 0], [.2, .05], [.07, .12], [.05, .94], [.1, 1], [.05, 1.06]], 6), GOLD);
    post.add(new THREE.SphereGeometry(.11, 7, 5), GOLD, 0, 1.15, 0);
    sag(span, 1, .34, .055, c.accent);
  },
};
export const ROAD_FAMILIES = Object.keys(FAMILIES);

function finish(batch, material) {
  const holder = new THREE.Group();
  try { return batch.finish(holder, 'roadside', material).geometry; } catch { return null; }
}

/**
 * Kerbs and fences for both sides of the road.
 * colors: { post, accent, stone, light }; `kerb` is the material of the rounded kerb.
 */
export function buildRoadside(family, total, zc, colors, kerb) {
  const group = new THREE.Group(); group.name = `roadside-${family}`;
  const half = [[.27, 0], [.27, .1], [.2, .17], [.2, .52], [.15, .68], [.05, .75]];
  const section = [...half.map(([x, y]) => [-x, y]), ...half.map(([x, y]) => [x, y]).reverse()];
  const kerbGeometry = extrudeZ(section, total, true);
  for (const x of [-7.6, 7.6]) {
    const side = new THREE.Mesh(kerbGeometry, kerb); side.position.set(x, 0, zc - total / 2);
    side.castShadow = true; side.receiveShadow = true; group.add(side);
  }
  const parts = { post: assetBatch(), span: assetBatch(), lit: assetBatch() };
  (FAMILIES[family] || FAMILIES.bastion)(parts, colors);
  const solid = new THREE.MeshLambertMaterial({ vertexColors: true }), glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  const post = finish(parts.post, solid), span = finish(parts.span, solid), lit = finish(parts.lit, glow);
  if (!lit) glow.dispose();
  const count = Math.floor(total / SPAN), start = zc - total / 2, perChunk = Math.round(CHUNK / SPAN);
  const matrix = new THREE.Matrix4(), turn = new THREE.Matrix4().makeRotationY(Math.PI);
  for (let first = 0; first < count; first += perChunk) {
    const n = Math.min(perChunk, count - first);
    const meshes = [[post, solid, 0], [span, solid, 1], [lit, glow, family === 'station' ? 0 : 1]].filter(([geometry]) => geometry)
      .map(([geometry, material, spans]) => ({ mesh: new THREE.InstancedMesh(geometry, material, n * 2), spans }));
    for (let i = 0; i < n; i++) {
      const z = start + (first + i) * SPAN;
      for (const { mesh, spans } of meshes) {
        // The far side is turned around, so its spans start from the next post.
        matrix.makeTranslation(8.2, 0, z); mesh.setMatrixAt(i * 2, matrix);
        matrix.copy(turn).setPosition(-8.2, 0, z + (spans ? SPAN : 0)); mesh.setMatrixAt(i * 2 + 1, matrix);
      }
    }
    for (const { mesh } of meshes) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere?.(); group.add(mesh); }
  }
  return group;
}
