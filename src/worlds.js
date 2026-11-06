// Roadside decor for the level 11-20 themes (the first 10 live in models.buildWorld).
import * as THREE from 'three';
import { lam, paint, merge, scatter } from './models.js';
import * as S from './scenery-assets.js';

const vc = (flat = true) => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat });
const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

function stars(g, zc, n, color, y0 = 20) {
  const geo = new THREE.BufferGeometry();
  const pts = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pts[i * 3] = (Math.random() - 0.5) * 400; pts[i * 3 + 1] = y0 + Math.random() * 120; pts[i * 3 + 2] = zc - 60 - Math.random() * 200; }
  geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.9, fog: false })));
}
function sideStrips(g, zc, total, color, opacity = 1, x = 12.5, w = 5) {
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, total), glow(color, opacity));
    m.rotation.x = -Math.PI / 2; m.position.set(sx * x, 0.01, zc); g.add(m);
  }
}
function far(g, mesh, x, y, z) { mesh.position.set(x, y, z); g.add(mesh); return mesh; }

const DECOR = {
  factory(g, zc, total) {
    scatter(g, S.smokestack(), vc(false), 50, 12, 40, zc, total, 0.8, 1.4);
    scatter(g, S.gear(), vc(false), 80, 9, 30, zc, total, 0.6, 1.4, 0, false);
    scatter(g, S.crate(), vc(false), 220, 9, 45, zc, total, 0.6, 1.3, 0, false);
    const pipe = new THREE.CylinderGeometry(0.3, 0.3, total, 8); pipe.rotateX(Math.PI / 2);
    for (const sx of [-1, 1]) far(g, new THREE.Mesh(pipe, lam(0xffb21a)), sx * 10.2, 0.6, zc);
  },
  casino(g, zc, total) {
    sideStrips(g, zc, total, 0xffd21a, 0.25, 9.6, 0.6);
    const chipCols = [0xd01030, 0x1a1a1a, 0x1a6aff, 0x1ab04a];
    chipCols.forEach((c, k) => {
      const parts = [];
      for (let i = 0; i < 6; i++) { const ch = paint(new THREE.CylinderGeometry(0.9, 0.9, 0.22, 16), i % 2 ? c : 0xffffff); ch.translate(0, 0.11 + i * 0.24, 0); parts.push(ch); }
      scatter(g, merge(parts), vc(false), 50, 9 + k, 40, zc, total, 0.7, 1.8);
    });
    const card = paint(new THREE.BoxGeometry(2.2, 3.2, 0.08), 0xffffff); card.translate(0, 1.6, 0);
    const pip = paint(new THREE.BoxGeometry(0.8, 0.8, 0.1), 0xd01030); pip.rotateZ(Math.PI / 4); pip.translate(0, 1.6, 0.03);
    scatter(g, merge([card, pip]), vc(), 70, 11, 40, zc, total, 0.8, 1.6);
    const bulb = new THREE.SphereGeometry(0.25, 8, 6); bulb.translate(0, 4.2, 0);
    scatter(g, bulb, glow(0xffe680), 120, 9, 2, zc, total, 1, 1.2, 0, false);
    const pole = new THREE.CylinderGeometry(0.08, 0.08, 4, 6); pole.translate(0, 2, 0);
    scatter(g, pole, lam(0xffd21a), 120, 9, 2, zc, total, 1, 1, 0, false);
    stars(g, zc, 300, 0xffe680);
  },
  coral(g, zc, total) {
    sideStrips(g, zc, total, 0x2ad0ff, 0.85, 14, 8);
    sideStrips(g, zc, total, 0xbff8ff, 0.5, 10, 1.2);
    const cols = [0xff6a8a, 0xff9a3a, 0xb06aff, 0xffe03a];
    cols.forEach((c, k) => scatter(g, S.coral(c, k), vc(false), 55, 8.8, 4, zc, total, 0.7, 1.5, 0, false));
    scatter(g, S.shell(), vc(false), 200, 9, 3, zc, total, 0.5, 1.2, 0, false);
    scatter(g, S.palm({ height: 5, lean: .9, leaf: 0x3ac04a, leaf2: 0x2fa63e }), vc(false), 60, 20, 30, zc, total, 0.8, 1.4);
  },
  spooky(g, zc, total) {
    scatter(g, S.spookyTree(), vc(false), 120, 11, 45, zc, total, 0.8, 1.5);
    scatter(g, S.gravestone(), vc(false), 200, 9, 25, zc, total, 0.7, 1.3, 0, false);
    scatter(g, S.pumpkin(), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x5a1a00 }), 140, 8.8, 14, zc, total, 0.6, 1.4, 0, false);
    scatter(g, S.mushroom(0x9a7aff), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x2a1060 }), 90, 9, 20, zc, total, 0.6, 1.4, 0, false);
    far(g, new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), glow(0xfff0c0)), 40, 60, zc - 170).material.fog = false;
    stars(g, zc, 200, 0xd0c0ff, 40);
  },
  arena(g, zc, total) {
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 5; k++) {
        const tier = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, total), lam(k % 2 ? 0xc8a070 : 0xb08a5a));
        tier.position.set(sx * (12 + k * 3.2), 0.6 + k * 1.2, zc); g.add(tier);
      }
      const crowd = new THREE.InstancedMesh(new THREE.SphereGeometry(0.4, 6, 4), new THREE.MeshLambertMaterial(), 600);
      const m = new THREE.Matrix4(), cols = [0xd23b30, 0x22b8ff, 0xffd21a, 0xffffff, 0x7aff5a].map((c) => new THREE.Color(c));
      for (let i = 0; i < 600; i++) {
        const k = i % 5;
        m.makeTranslation(sx * (12 + k * 3.2 + (Math.random() - 0.5) * 2.4), 1.6 + k * 1.2, zc - total / 2 + Math.random() * total);
        crowd.setMatrixAt(i, m); crowd.setColorAt(i, cols[(Math.random() * 5) | 0]);
      }
      g.add(crowd);
    }
    scatter(g, S.column({ height: 7, radius: .5, color: 0xf0e0c0, cap: 0xe0c890, banner: 0xc0302a }), vc(false), 40, 9.6, 0.5, zc, total, 1, 1);
  },
  crystal(g, zc, total) {
    scatter(g, S.crystalCluster(0x6afff0, 3), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x0a5a6a }), 160, 9.5, 45, zc, total, 0.6, 1.8);
    scatter(g, S.crystalCluster(0xc08aff, 8), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x3a1a7a }), 140, 10, 45, zc, total, 0.5, 1.5);
    const stal = new THREE.ConeGeometry(0.8, 4, 6); stal.translate(0, 2, 0);
    scatter(g, stal, lam(0x3a3456, { flatShading: true }), 160, 11, 40, zc, total, 0.6, 1.8);
    const ceil = new THREE.ConeGeometry(0.7, 5, 6); ceil.rotateX(Math.PI); ceil.translate(0, 18, 0);
    scatter(g, ceil, lam(0x2a2440, { flatShading: true }), 120, 3, 40, zc, total, 0.6, 1.8, 0, false);
    sideStrips(g, zc, total, 0x6afff0, 0.2, 9.4, 0.8);
  },
  volcano(g, zc, total) {
    sideStrips(g, zc, total, 0xff5a1a, 1, 12.5, 5);
    sideStrips(g, zc, total, 0xff8a2a, 0.25, 12.5, 9);
    scatter(g, S.rockCluster(0x2a1a14, 9, { accent: 0xff7a1a, accentDepth: .9 }), vc(false), 260, 9, 50, zc, total, 0.7, 1.6, 0, false);
    for (let k = 0; k < 4; k++) {
      const sx = k % 2 ? 1 : -1, z = zc - total / 2 + 40 + k * (total / 4);
      const v = new THREE.Mesh(new THREE.ConeGeometry(16, 24, 12, 1, true), lam(0x3a2018, { flatShading: true }));
      far(g, v, sx * (50 + k * 6), 12, z);
      far(g, new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 1, 12), glow(0xff6a1a)), sx * (50 + k * 6), 23.8, z);
    }
  },
  tomb(g, zc, total) {
    for (let k = 0; k < 6; k++) {
      const sx = k % 2 ? 1 : -1, s = 10 + Math.random() * 10;
      const p = new THREE.Mesh(new THREE.ConeGeometry(s, s * 0.9, 4), lam(0xe0b060, { flatShading: true }));
      p.rotation.y = Math.PI / 4;
      far(g, p, sx * (30 + Math.random() * 30), s * 0.45, zc - total / 2 + 30 + k * (total / 6));
    }
    scatter(g, S.obelisk(), vc(false), 40, 9.6, 2, zc, total, 0.8, 1.3);
    scatter(g, S.palm({ height: 4.2, lean: .6, leaf: 0x4ab04a, leaf2: 0x3a9a3a }), vc(false), 70, 12, 30, zc, total, 0.8, 1.3);
    const dune = new THREE.SphereGeometry(4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); dune.scale(1.8, 0.35, 1);
    scatter(g, dune, lam(0xe8c080), 50, 16, 60, zc, total, 0.8, 2.2, -0.1, false);
  },
  storm(g, zc, total) {
    scatter(g, S.mountain(), vc(false), 120, 12, 50, zc, total, 0.6, 1.6);
    scatter(g, S.pine(false, 0x2a4a3a, 0x355a48), vc(false), 220, 9, 40, zc, total, 0.5, 1.0, 0, false);
    const puff = [];
    for (let k = 0; k < 4; k++) { const s = paint(new THREE.SphereGeometry(2.4 - k * 0.3, 10, 8), 0x3a4048); s.translate((k - 1.5) * 2.2, (k % 2) * 0.8, (k % 2) * 1.0); puff.push(s); }
    // Keep the entire cloud geometry outside the road's camera corridor, including the intro swoop.
    const clouds = scatter(g, merge(puff), vc(false), 28, 34, 34, zc, total, .9, 1.7, 34, false);
    clouds.name = 'storm-cloud-banks';
  },
  blackhole(g, zc, total) {
    stars(g, zc, 900, 0xffffff, 0);
    scatter(g, S.asteroid(5, 0x4a3f52), vc(false), 140, 10, 50, zc, total, 0.4, 2.4, 2.5, false);
    scatter(g, S.asteroid(11, 0x342a3c), vc(false), 140, 10, 50, zc, total, 0.4, 1.8, 7, false);
    const disk = new THREE.Mesh(new THREE.RingGeometry(26, 70, 64), new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }));
    disk.rotation.x = -Math.PI / 2 + 0.3;
    far(g, disk, 0, 60, zc - 200);
    far(g, new THREE.Mesh(new THREE.SphereGeometry(24, 32, 20), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })), 0, 60, zc - 200);
    sideStrips(g, zc, total, 0xff9a3a, 0.2, 9.4, 0.8);
  },
};

export function decorate(theme, g, len) {
  const total = len + 160, zc = -len / 2 + 30;
  DECOR[theme]?.(g, zc, total);
}
