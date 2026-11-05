// Roadside decor for the level 11-20 themes (the first 10 live in models.buildWorld).
import * as THREE from 'three';
import { lam, paint, merge, scatter } from './models.js';

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
    const stack = paint(new THREE.CylinderGeometry(0.7, 0.9, 9, 10), 0x8a8a92); stack.translate(0, 4.5, 0);
    const band1 = paint(new THREE.CylinderGeometry(0.74, 0.74, 0.8, 10), 0xd23b30); band1.translate(0, 7.6, 0);
    const band2 = paint(new THREE.CylinderGeometry(0.8, 0.8, 0.8, 10), 0xf4f4f4); band2.translate(0, 6.2, 0);
    const base = paint(new THREE.BoxGeometry(3.2, 2.2, 3.2), 0x5a5a62); base.translate(0, 1.1, 0);
    scatter(g, merge([stack, band1, band2, base]), vc(false), 50, 12, 40, zc, total, 0.8, 1.4);
    const gear = new THREE.CylinderGeometry(1.2, 1.2, 0.35, 12); gear.rotateX(Math.PI / 2); gear.translate(0, 1.4, 0);
    scatter(g, gear, lam(0xd0a040, { flatShading: true }), 80, 9, 30, zc, total, 0.6, 1.4);
    const crate = paint(new THREE.BoxGeometry(1.1, 1.1, 1.1), 0xb07a3a); crate.translate(0, 0.55, 0);
    const lid = paint(new THREE.BoxGeometry(1.15, 0.12, 1.15), 0x7a4a1a); lid.translate(0, 1.1, 0);
    scatter(g, merge([crate, lid]), vc(), 220, 9, 45, zc, total, 0.6, 1.3);
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
    cols.forEach((c, k) => {
      const parts = [];
      const trunk = paint(new THREE.CylinderGeometry(0.18, 0.28, 1.6, 6), c); trunk.translate(0, 0.8, 0); parts.push(trunk);
      for (let b = 0; b < 4; b++) {
        const br = paint(new THREE.CylinderGeometry(0.1, 0.16, 1.2, 5), c);
        br.rotateZ(0.6); br.translate(0.4, 1.7, 0); br.rotateY(b * 1.6 + k); parts.push(br);
        const tip = paint(new THREE.SphereGeometry(0.17, 6, 4), 0xffffff); tip.translate(0.75, 2.2, 0); tip.rotateY(b * 1.6 + k); parts.push(tip);
      }
      scatter(g, merge(parts), vc(), 70, 8.8, 4, zc, total, 0.7, 1.5);
    });
    const shell = new THREE.SphereGeometry(0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2); shell.scale(1, 0.6, 1.2);
    scatter(g, shell, lam(0xffd0c0), 200, 9, 3, zc, total, 0.5, 1.2, 0, false);
    const trunk = paint(new THREE.CylinderGeometry(0.2, 0.32, 5, 7), 0x9a6a3a); trunk.rotateZ(0.15); trunk.translate(0.3, 2.5, 0);
    const leaves = [];
    for (let k = 0; k < 6; k++) { const l = paint(new THREE.ConeGeometry(0.4, 2.8, 4), 0x3ac04a); l.rotateZ(Math.PI / 2 + 0.5); l.translate(1.4, 5.0, 0); l.rotateY((k / 6) * Math.PI * 2); leaves.push(l); }
    scatter(g, merge([trunk, ...leaves]), vc(), 60, 20, 30, zc, total, 0.8, 1.4);
  },
  spooky(g, zc, total) {
    const tr = paint(new THREE.CylinderGeometry(0.14, 0.3, 3.6, 5), 0x2a2020); tr.translate(0, 1.8, 0);
    const b1 = paint(new THREE.CylinderGeometry(0.06, 0.1, 1.6, 4), 0x2a2020); b1.rotateZ(0.9); b1.translate(0.6, 3.0, 0);
    const b2 = paint(new THREE.CylinderGeometry(0.06, 0.1, 1.3, 4), 0x2a2020); b2.rotateZ(-0.8); b2.translate(-0.5, 2.6, 0);
    const b3 = paint(new THREE.CylinderGeometry(0.05, 0.08, 1.0, 4), 0x2a2020); b3.rotateX(0.9); b3.translate(0, 3.3, 0.4);
    scatter(g, merge([tr, b1, b2, b3]), vc(), 120, 11, 45, zc, total, 0.8, 1.6);
    const stone = paint(new THREE.BoxGeometry(0.9, 1.2, 0.25), 0x8a8a96); stone.translate(0, 0.6, 0);
    const top = paint(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 10, 1, false, 0, Math.PI), 0x8a8a96); top.rotateX(Math.PI / 2); top.rotateZ(Math.PI / 2); top.rotateY(Math.PI / 2); top.translate(0, 1.2, 0);
    scatter(g, merge([stone, top]), vc(), 200, 9, 25, zc, total, 0.7, 1.3);
    const pk = paint(new THREE.SphereGeometry(0.55, 10, 8), 0xff7a1a); pk.scale(1.2, 0.85, 1.2); pk.translate(0, 0.45, 0);
    const st = paint(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 5), 0x3a6a2a); st.translate(0, 0.98, 0);
    scatter(g, merge([pk, st]), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x5a1a00 }), 140, 8.8, 14, zc, total, 0.6, 1.4);
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
    const col = paint(new THREE.CylinderGeometry(0.45, 0.55, 7, 12), 0xf0e0c0); col.translate(0, 3.5, 0);
    const cap = paint(new THREE.BoxGeometry(1.4, 0.4, 1.4), 0xe0c890); cap.translate(0, 7.2, 0);
    const banner = paint(new THREE.BoxGeometry(1.0, 2.6, 0.06), 0xc0302a); banner.translate(0, 5.2, 0.55);
    scatter(g, merge([col, cap, banner]), vc(false), 40, 9.6, 0.5, zc, total, 1, 1);
  },
  crystal(g, zc, total) {
    const cr = new THREE.OctahedronGeometry(0.8); cr.scale(1, 2.6, 1);
    scatter(g, cr, lam(0x6afff0, { flatShading: true, emissive: 0x0a6a7a }), 160, 9.5, 45, zc, total, 0.6, 2.4, 0.8);
    scatter(g, cr, lam(0xc08aff, { flatShading: true, emissive: 0x4a1a8a }), 140, 10, 45, zc, total, 0.5, 2.0, 0.6);
    const stal = new THREE.ConeGeometry(0.8, 4, 6); stal.translate(0, 2, 0);
    scatter(g, stal, lam(0x3a3456, { flatShading: true }), 160, 11, 40, zc, total, 0.6, 1.8);
    const ceil = new THREE.ConeGeometry(0.7, 5, 6); ceil.rotateX(Math.PI); ceil.translate(0, 18, 0);
    scatter(g, ceil, lam(0x2a2440, { flatShading: true }), 120, 3, 40, zc, total, 0.6, 1.8, 0, false);
    sideStrips(g, zc, total, 0x6afff0, 0.2, 9.4, 0.8);
  },
  volcano(g, zc, total) {
    sideStrips(g, zc, total, 0xff5a1a, 1, 12.5, 5);
    sideStrips(g, zc, total, 0xff8a2a, 0.25, 12.5, 9);
    const r1 = paint(new THREE.DodecahedronGeometry(1.0), 0x2a1a14); r1.scale(1, 0.7, 1); r1.translate(0, 0.4, 0);
    const s1 = paint(new THREE.ConeGeometry(0.4, 2.2, 5), 0x1a100c); s1.translate(0.6, 1.1, 0.2);
    scatter(g, merge([r1, s1]), vc(), 260, 9, 50, zc, total);
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
    const ob = paint(new THREE.BoxGeometry(0.8, 6, 0.8), 0xd8b070); ob.translate(0, 3, 0);
    const tip = paint(new THREE.ConeGeometry(0.58, 1, 4), 0xffd040); tip.rotateY(Math.PI / 4); tip.translate(0, 6.5, 0);
    scatter(g, merge([ob, tip]), vc(), 40, 9.6, 2, zc, total, 0.8, 1.3);
    const trunk = paint(new THREE.CylinderGeometry(0.2, 0.3, 4.2, 7), 0x9a6a3a); trunk.translate(0, 2.1, 0);
    const leaves = [];
    for (let k = 0; k < 6; k++) { const l = paint(new THREE.ConeGeometry(0.4, 2.4, 4), 0x4ab04a); l.rotateZ(Math.PI / 2 + 0.4); l.translate(1.2, 4.2, 0); l.rotateY((k / 6) * Math.PI * 2); leaves.push(l); }
    scatter(g, merge([trunk, ...leaves]), vc(), 70, 12, 30, zc, total, 0.8, 1.3);
    const dune = new THREE.SphereGeometry(4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); dune.scale(1.8, 0.35, 1);
    scatter(g, dune, lam(0xe8c080), 50, 16, 60, zc, total, 0.8, 2.2, -0.1, false);
  },
  storm(g, zc, total) {
    const peak = new THREE.ConeGeometry(2.4, 7, 5); peak.translate(0, 3.5, 0);
    scatter(g, peak, lam(0x4a5058, { flatShading: true }), 120, 12, 50, zc, total, 0.6, 2.2);
    const snow = new THREE.ConeGeometry(1.0, 2.2, 5); snow.translate(0, 6.0, 0);
    scatter(g, snow, lam(0xe8eef8, { flatShading: true }), 40, 12, 50, zc, total, 0.6, 2.2);
    const t1 = paint(new THREE.ConeGeometry(0.9, 2.4, 7), 0x2a4a3a); t1.translate(0, 1.8, 0);
    const tr = paint(new THREE.CylinderGeometry(0.12, 0.14, 0.7, 5), 0x4a3a2a); tr.translate(0, 0.35, 0);
    scatter(g, merge([t1, tr]), vc(), 220, 9, 40, zc, total, 0.7, 1.5);
    const puff = [];
    for (let k = 0; k < 4; k++) { const s = paint(new THREE.SphereGeometry(2.4 - k * 0.3, 10, 8), 0x3a4048); s.translate((k - 1.5) * 2.2, (k % 2) * 0.8, (k % 2) * 1.0); puff.push(s); }
    // Keep the entire cloud geometry outside the road's camera corridor, including the intro swoop.
    const clouds = scatter(g, merge(puff), vc(false), 28, 34, 34, zc, total, .9, 1.7, 34, false);
    clouds.name = 'storm-cloud-banks';
  },
  blackhole(g, zc, total) {
    stars(g, zc, 900, 0xffffff, 0);
    const rock = new THREE.DodecahedronGeometry(1.0);
    scatter(g, rock, lam(0x3a3040, { flatShading: true }), 140, 10, 50, zc, total, 0.4, 2.4, 2.5, false);
    scatter(g, rock, lam(0x2a2030, { flatShading: true }), 140, 10, 50, zc, total, 0.4, 1.8, 7, false);
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
