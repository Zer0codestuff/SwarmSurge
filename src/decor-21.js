// Roadside decor for the worlds 21-35 biomes. Each entry is (group, zCenter, totalLength) => void,
// matching DECOR in worlds.js. Props come from scenery-assets.js and scenery-21.js.
import * as THREE from 'three';
import { lam, scatter } from './models.js';
import * as S from './scenery-assets.js';
import * as P from './scenery-21.js';

const vc = (flat = true) => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat });
// warm emissive lift so lanterns, mushrooms and lenses feel lit at night
const emis = (hex) => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: hex });
const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
const bubbleMat = new THREE.MeshPhongMaterial({ color: 0xd8f2ff, transparent: true, opacity: .34, shininess: 90, specular: 0x9ad8ff, depthWrite: false });

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

// Scatter a body prop plus a matching glowing detail using identical instance matrices.
function duo(g, body, lens, mat, glowMat, n, minX, spreadX, zc, total, sMin = .8, sMax = 1.4, y = 0, cast = true) {
  const inst = scatter(g, body, mat, n, minX, spreadX, zc, total, sMin, sMax, y, cast);
  const m = new THREE.Matrix4();
  const gm = new THREE.InstancedMesh(lens, glowMat, n);
  for (let i = 0; i < n; i++) { inst.getMatrixAt(i, m); gm.setMatrixAt(i, m); }
  gm.castShadow = false;
  g.add(gm);
}

export const DECOR = {
  // ---- arc 1: pinball bumpers and toys ----
  pinball(g, zc, total) {
    duo(g, P.bumper(0x35e0ff, 0xff4fd8), P.bumperCap(0xffd21a), emis(0x1a0a3e), glow(0xffe27a), 60, 10, 34, zc, total, .8, 1.5);
    duo(g, P.bumper(0xff4fd8, 0x35e0ff), P.bumperCap(0x3affd0), emis(0x1a0a3e), glow(0x7affde), 45, 11, 42, zc, total, .7, 1.4);
    duo(g, P.rollover(0x3affd0), P.rolloverLens(), vc(), glow(0x7affde), 90, 9.2, 26, zc, total, .8, 1.3, 0, false);
    scatter(g, P.steelBall(), vc(false), 45, 10, 30, zc, total, .8, 1.5);
    scatter(g, P.laneGuide(0x3affd0), glow(0x3affd0), 46, 9.6, 12, zc, total, .8, 1.4, 0, false);
    sideStrips(g, zc, total, 0xff4fd8, .16, 9.6, .7);
    stars(g, zc, 340, 0x9ad8ff, 24);
  },
  toybox(g, zc, total) {
    scatter(g, P.toyBlock(0xff6a4a, 0), vc(), 55, 10, 34, zc, total, .8, 1.5);
    scatter(g, P.toyBlock(0x2a7aff, 1), vc(), 45, 10.5, 40, zc, total, .7, 1.4);
    scatter(g, P.toyBlock(0x3ab44a, 2), vc(), 35, 11, 44, zc, total, .7, 1.3);
    scatter(g, P.spinningTop(0xff5a4a), vc(false), 55, 9.2, 30, zc, total, .7, 1.2, 0, false);
    scatter(g, P.crayon(0x2a7aff), vc(false), 40, 9, 24, zc, total, .7, 1.2, 0, false);
    scatter(g, P.crayon(0xff5a4a), vc(false), 40, 9.4, 28, zc, total, .7, 1.2, 0, false);
    scatter(g, P.trainTrack(), vc(), 60, 9.6, 26, zc, total, .8, 1.4, 0, false);
    scatter(g, P.toyRocket(), vc(), 12, 14, 34, zc, total, .9, 1.5);
  },
  bubble(g, zc, total) {
    scatter(g, P.foamHill(), vc(false), 90, 9, 45, zc, total, .7, 1.8, 0, false);
    scatter(g, P.duck(0xffd21a), vc(false), 55, 9.4, 28, zc, total, .7, 1.3, 0, false);
    scatter(g, P.soapBar(0xfff0f8), vc(false), 45, 9, 26, zc, total, .7, 1.3, 0, false);
    scatter(g, P.soapBar(0xd8f0ff), vc(false), 40, 9.4, 30, zc, total, .7, 1.2, 0, false);
    scatter(g, P.tileSheet(), vc(false), 70, 9, 40, zc, total, .8, 1.6, 0, false);
    scatter(g, P.bubbleCluster(), bubbleMat, 110, 9, 42, zc, total, .6, 1.5, 0, false);
    sideStrips(g, zc, total, 0x8af0ff, .3, 12, 7);
  },
  bouncy(g, zc, total) {
    scatter(g, P.inflatableTurret(0xff4a6a), vc(), 40, 10, 30, zc, total, .8, 1.5);
    scatter(g, P.inflatableTurret(0x2a7aff), vc(), 30, 11, 36, zc, total, .8, 1.4);
    scatter(g, P.inflatablePillar(0xffd21a, 0xffffff), vc(), 50, 9.2, 24, zc, total, .7, 1.3, 0, false);
    scatter(g, P.balloon(0xff4a6a), vc(false), 40, 9, 22, zc, total, .8, 1.3, 0, false);
    scatter(g, P.balloon(0x2a7aff), vc(false), 40, 9.4, 26, zc, total, .8, 1.3, 0, false);
    scatter(g, P.balloon(0xffd21a), vc(false), 40, 9.2, 24, zc, total, .8, 1.3, 0, false);
    scatter(g, P.bunting(), vc(), 55, 9.4, 20, zc, total, .8, 1.3, 0, false);
    scatter(g, S.bush(0x3a9a3a, 0xffd21a), vc(false), 80, 9, 40, zc, total, .6, 1.3, 0, false);
  },
  tilt(g, zc, total) {
    duo(g, P.marqueeArch(0xffd21a), P.archBulbs(0xfff0a0), vc(), glow(0xffe27a), 60, 10, 30, zc, total, .9, 1.6);
    scatter(g, P.flipperStatue(0xd8203c), vc(), 30, 12, 36, zc, total, .8, 1.4);
    scatter(g, P.starPost(0xffd21a), vc(), 70, 9.2, 26, zc, total, .8, 1.3, 0, false);
    scatter(g, P.steelBall(), vc(false), 30, 12, 30, zc, total, .8, 1.5);
    sideStrips(g, zc, total, 0xffd21a, .2, 9.6, .7);
    stars(g, zc, 420, 0xfff0c0, 22);
  },
  // ---- arc 2: charm totems, dreams and circus ----
  mushroom(g, zc, total) {
    scatter(g, P.giantMushroom(0xff4a4a), emis(0x30100a), 55, 10, 40, zc, total, .8, 1.6);
    scatter(g, P.giantMushroom(0x2ab0a0, .8), emis(0x0a3a34), 40, 10.5, 44, zc, total, .7, 1.4);
    scatter(g, S.mushroom(0x9a7aff), emis(0x2a1060), 90, 9, 26, zc, total, .6, 1.4, 0, false);
    scatter(g, P.fern(), vc(false), 130, 9, 44, zc, total, .6, 1.5, 0, false);
    scatter(g, P.mossRock(), vc(false), 60, 10, 40, zc, total, .7, 1.7);
  },
  circus(g, zc, total) {
    scatter(g, P.bigTop(0xd8203c), vc(), 35, 12, 34, zc, total, .8, 1.5);
    scatter(g, P.bigTop(0x2a7aff, .8), vc(), 25, 13, 40, zc, total, .8, 1.4);
    scatter(g, P.podium(0xd8203c), vc(), 40, 9.5, 26, zc, total, .7, 1.3, 0, false);
    scatter(g, P.popcornCart(), vc(), 22, 10, 30, zc, total, .8, 1.2);
    scatter(g, P.flagPole(0xd8203c), vc(), 40, 9.3, 24, zc, total, .8, 1.3, 0, false);
    scatter(g, P.bunting(0xffd21a, 0x2a7aff), vc(), 50, 9.4, 22, zc, total, .8, 1.3, 0, false);
    for (let k = 0; k < 3; k++) {
      const sx = k % 2 ? 1 : -1;
      far(g, new THREE.Mesh(P.bigTop(k % 2 ? 0xd8203c : 0x2a7aff, 4), vc()), sx * (42 + k * 7), 0, zc - total / 2 + 60 + k * (total / 3));
    }
  },
  dream(g, zc, total) {
    scatter(g, P.cloudPuff(0xffffff), vc(false), 80, 10, 55, zc, total, 1.0, 2.4, -.3, false);
    scatter(g, P.cloudPuff(0xffd8f0), vc(false), 50, 12, 55, zc, total, .8, 2.0, .4, false);
    scatter(g, P.cloudPuff(0xd8d0ff), vc(false), 40, 14, 55, zc, total, .8, 1.8, 1.4, false);
    scatter(g, P.moonOnPole(0xffd86a), vc(), 30, 9.5, 26, zc, total, .8, 1.3, 0, false);
    scatter(g, P.starFloat(0xffe27a), glow(0xffe27a), 60, 9.5, 40, zc, total, .7, 1.3, 3.5, false);
    scatter(g, P.pillow(0xffd2f2), vc(false), 45, 9.5, 35, zc, total, .8, 1.6, 0, false);
    stars(g, zc, 260, 0xfff0ff, 26);
  },
  bazaar(g, zc, total) {
    scatter(g, P.marketStall(0xd8443a), vc(), 35, 10, 30, zc, total, .8, 1.4);
    scatter(g, P.marketStall(0x2ab4a4), vc(), 25, 10.5, 36, zc, total, .8, 1.3);
    scatter(g, P.clayPot(0xc86a3a), vc(false), 110, 9, 30, zc, total, .6, 1.4, 0, false);
    scatter(g, P.carpetRoll(), vc(false), 60, 9.3, 26, zc, total, .7, 1.3, 0, false);
    scatter(g, S.palm({ height: 5, lean: .8, leaf: 0x3ac04a, leaf2: 0x2fa63e }), vc(false), 60, 12, 35, zc, total, .8, 1.4);
    duo(g, P.lanternPost(), P.lanternGlow(0xffb84a), vc(), glow(0xffc86a), 70, 9.2, 24, zc, total, .8, 1.3, 0, false);
    for (let k = 0; k < 4; k++) {
      const sx = k % 2 ? 1 : -1, z = zc - total / 2 + 50 + k * (total / 4);
      far(g, new THREE.Mesh(new THREE.SphereGeometry(7, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), lam(0x2ab4a4)), sx * (34 + (k % 3) * 8), 0, z);
      far(g, new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 16, 10), lam(0xe8c888)), sx * (52 + k * 5), 8, z - 30);
      far(g, new THREE.Mesh(new THREE.ConeGeometry(1.3, 3, 10), lam(0x2ab4a4)), sx * (52 + k * 5), 17.5, z - 30);
    }
  },
  hypno(g, zc, total) {
    scatter(g, P.spiralDisc(0xff4fd8), vc(false), 70, 9.5, 30, zc, total, .8, 1.4, 0, false);
    scatter(g, P.spiralDisc(0x3affd0), vc(false), 45, 10, 36, zc, total, .7, 1.3, 0, false);
    duo(g, P.cobraStatue(), P.cobraEyes(0xff4fd8), vc(), glow(0xff8ae0), 40, 10, 32, zc, total, .9, 1.5);
    duo(g, P.lanternPost(), P.lanternGlow(0xff4fd8), vc(), glow(0xff8ae0), 60, 9.2, 24, zc, total, .8, 1.3, 0, false);
    sideStrips(g, zc, total, 0xff4fd8, .18, 9.6, .7);
    stars(g, zc, 300, 0xd0a0ff, 22);
  },
  // ---- arc 3: payload carts and frontier rails ----
  mine(g, zc, total) {
    scatter(g, P.mineFrame(), vc(), 40, 9.6, 8, zc, total, .9, 1.4);
    scatter(g, P.oreCart(), vc(), 45, 10, 28, zc, total, .8, 1.4);
    scatter(g, P.goldPile(), vc(false), 60, 9.4, 30, zc, total, .6, 1.3, 0, false);
    duo(g, P.lanternPost(), P.lanternGlow(0xffb84a), vc(), glow(0xffc86a), 60, 9, 20, zc, total, .8, 1.3, 0, false);
    scatter(g, S.rockCluster(0x6a5a48, 3), vc(), 120, 11, 40, zc, total, .8, 1.8);
    scatter(g, S.pebble(3, 0x8a7a5a), vc(false), 300, 9, 45, zc, total, .25, .5, 0, false);
  },
  canyon(g, zc, total) {
    scatter(g, P.mesa(0xb85a34, 2), vc(), 45, 16, 40, zc, total, .7, 1.6);
    scatter(g, P.mesa(0xa84a2a, 5, { h: 9, r: 1.7, band: 0xd88a4e }), vc(), 30, 26, 40, zc, total, .7, 1.5);
    scatter(g, S.saguaro(), vc(), 120, 10, 40, zc, total, .8, 1.5);
    scatter(g, P.wagonWheel(), vc(), 50, 9.5, 25, zc, total, .7, 1.3, 0, false);
    scatter(g, S.rockCluster(0xc07048, 7), vc(), 90, 11, 40, zc, total, .8, 1.8);
    for (let k = 0; k < 2; k++) far(g, new THREE.Mesh(P.rockArch(), vc()), (k ? 1 : -1) * 48, 0, zc - total / 2 + 80 + k * (total / 2));
  },
  ghosttown(g, zc, total) {
    scatter(g, P.falseFront(0xa8825a), vc(), 30, 10, 26, zc, total, .8, 1.3);
    scatter(g, P.falseFront(0x8a6a4e), vc(), 20, 10.5, 30, zc, total, .8, 1.2);
    scatter(g, P.waterTower(), vc(), 14, 12, 30, zc, total, .8, 1.2);
    scatter(g, P.tumbleweed(), vc(false), 90, 9, 30, zc, total, .6, 1.4, 0, false);
    scatter(g, S.deadTree(0x6a5240, .9), vc(), 50, 10, 34, zc, total, .8, 1.4);
    scatter(g, new THREE.SphereGeometry(.22, 8, 6), glow(0x9affb2, .9), 80, 9, 30, zc, total, .7, 1.3, 1.1, false);
    stars(g, zc, 200, 0xb0a8c8, 26);
  },
  glacier(g, zc, total) {
    scatter(g, P.iceCliff(), vc(), 50, 12, 40, zc, total, .7, 1.6);
    scatter(g, S.pine(true), vc(), 160, 10, 50, zc, total, .7, 1.4);
    scatter(g, P.snowDrift(), vc(false), 90, 9, 45, zc, total, .7, 1.8, -.05, false);
    duo(g, P.signalLamp(0xff5a4a), P.signalLens(0xff5a4a), vc(), glow(0xff7a6a), 60, 9.2, 22, zc, total, .8, 1.3, 0, false);
    scatter(g, S.crystalCluster(0x9fe6ff, 2, 0xdfe9f5), emis(0x123a52), 80, 9.5, 40, zc, total, .4, .9, 0, false);
  },
  dynamite(g, zc, total) {
    scatter(g, P.tntCrate(), vc(false), 60, 9.4, 26, zc, total, .7, 1.3, 0, false);
    scatter(g, P.powderBarrel(), vc(), 70, 9.5, 30, zc, total, .7, 1.4);
    scatter(g, P.mineShaft(), vc(), 20, 14, 34, zc, total, .9, 1.5);
    scatter(g, P.mesa(0xc86838, 8, { h: 8, r: 1.9, band: 0xe8925a }), vc(), 40, 18, 44, zc, total, .7, 1.5);
    scatter(g, P.smokeColumn(), vc(false), 24, 16, 40, zc, total, .8, 1.5, 0, false);
    scatter(g, S.rockCluster(0x7a4a34, 4), vc(), 110, 10, 40, zc, total, .8, 1.8);
  },
};
