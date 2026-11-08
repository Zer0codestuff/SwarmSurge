// Models for the world 21-50 mechanics: pinball bumpers, hypno gates, mine carts on rails,
// harvest banks, dinosaur eggs and paired fusion cores. Lathe and swept forms, toon materials,
// no lights and no raster textures beyond the shared canvas labels.
import * as THREE from 'three';
import { lam, mesh, makeCanvasLabel, textPlane, buildGate } from './models.js';

const V2 = (r, y) => new THREE.Vector2(Math.max(0.001, r), y);
const lathe = (profile, sides = 20) => new THREE.LatheGeometry(profile.map(([r, y]) => V2(r, y)), sides);
const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

function floatingLabel(group, w, y, z = 0) {
  const label = makeCanvasLabel();
  const tw = Math.min(w, 3.8);
  const text = textPlane(label, tw, tw / 2, false);
  text.position.set(0, y, z); text.rotation.x = -0.3; text.renderOrder = 4;
  group.add(text);
  return { label, text };
}

// Pinball bumper: skirted base, lit drum, rubber ring and a domed cap that flashes on contact.
export function buildBumper(r = 0.9, color = 0xff3fae) {
  const g = new THREE.Group();
  const base = mesh(lathe([[r * 1.12, 0], [r * 1.12, 0.08], [r * 0.98, 0.16], [r * 0.82, 0.2], [0, 0.21]], 28), lam(0x2a2140), 0, 0, 0, false);
  const drum = mesh(lathe([[r * 0.8, 0.18], [r * 0.84, 0.3], [r * 0.84, 0.72], [r * 0.78, 0.8], [r * 0.4, 0.82], [0, 0.82]], 28), lam(0xf4f0ff), 0, 0, 0, false);
  const ringMat = new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.35) });
  const ring = mesh(new THREE.TorusGeometry(r * 0.93, r * 0.13, 10, 36).rotateX(Math.PI / 2), ringMat, 0, 0.5, 0);
  const capMat = glow(color);
  const cap = mesh(lathe([[r * 0.86, 0], [r * 0.9, 0.06], [r * 0.82, 0.2], [r * 0.6, 0.34], [r * 0.3, 0.42], [0, 0.44]], 28), capMat, 0, 0.82, 0, false);
  const lights = new THREE.Group();
  const bulb = new THREE.SphereGeometry(r * 0.07, 8, 6), bulbMat = glow(0xfff2a0);
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2;
    lights.add(mesh(bulb, bulbMat, Math.cos(a) * r * 0.86, 0.3, Math.sin(a) * r * 0.86, false));
  }
  const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.26, 20), glow(0xffffff));
  top.rotation.x = -Math.PI / 2; top.position.y = 1.27;
  g.add(base, drum, ring, cap, lights, top);
  const L = floatingLabel(g, 2.6, 2.3);
  return { group: g, ring, ringMat, cap, capMat, lights, ...L };
}

// Two-armed spiral band for the hypno gate disc.
function spiralGeometry(radius, turns = 2.2, arms = 2) {
  const shapes = [];
  for (let a = 0; a < arms; a++) {
    const shape = new THREE.Shape(), outer = [], inner = [];
    const N = 70, off = a / arms * Math.PI * 2;
    for (let i = 0; i <= N; i++) {
      const t = i / N, ang = off + t * turns * Math.PI * 2, rr = radius * (0.06 + t * 0.94);
      const width = radius * 0.2 * (0.25 + t);
      outer.push(new THREE.Vector2(Math.cos(ang) * rr, Math.sin(ang) * rr));
      inner.push(new THREE.Vector2(Math.cos(ang) * Math.max(0, rr - width), Math.sin(ang) * Math.max(0, rr - width)));
    }
    shape.moveTo(outer[0].x, outer[0].y);
    for (const p of outer) shape.lineTo(p.x, p.y);
    for (let i = inner.length - 1; i >= 0; i--) shape.lineTo(inner[i].x, inner[i].y);
    shapes.push(shape);
  }
  return new THREE.ShapeGeometry(shapes, 1);
}

// Hypno gate: a standard gate frame holding a slow spiral. Charged, it turns marching enemies into troops.
export function buildHypnoGate(w) {
  const model = buildGate(w, 0x9a3aff);
  const r = Math.min(0.95, w * 0.2);
  const spiral = new THREE.Group(); spiral.position.set(0, 1.05, 0.05);
  const discMat = glow(0x2a0a4a, 0.75);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 1.06, 36), discMat);
  const armMat = glow(0x6affd0, 0.95);
  const arms = new THREE.Mesh(spiralGeometry(r), armMat); arms.position.z = 0.01;
  const eye = new THREE.Mesh(new THREE.CircleGeometry(r * 0.16, 20), glow(0xffffff)); eye.position.z = 0.02;
  spiral.add(disc, arms, eye);
  // Twin spirals face both directions so the effect reads from the cannon and the fort side.
  const back = spiral.clone(); back.rotation.y = Math.PI; back.position.z = -0.05;
  model.group.add(spiral, back);
  model.spirals = [arms, back.children[1]];
  model.armMat = armMat;
  model.text.position.y = 2.75;
  return model;
}

// Mine cart rails: sleepers and two swept rails from d1 to d2 (local z runs toward the fort).
export function buildRails(len) {
  const g = new THREE.Group();
  const wood = lam(0x6b4a2c), steel = lam(0x9aa4b2);
  const sleeper = new THREE.BoxGeometry(1.7, 0.1, 0.28);
  const n = Math.max(2, Math.round(len / 1.1));
  for (let k = 0; k <= n; k++) g.add(mesh(sleeper, wood, 0, 0.05, -k * len / n, false));
  const rail = new THREE.BoxGeometry(0.1, 0.12, len);
  for (const sx of [-0.55, 0.55]) g.add(mesh(rail, steel, sx, 0.16, -len / 2, false));
  const bumper = mesh(lathe([[0.18, 0], [0.18, 0.4], [0.26, 0.48], [0, 0.5]], 10), lam(0xe8333a), 0, 0.1, -len - 0.3, false);
  g.add(bumper);
  return g;
}

// Ore cart loaded with dynamite. Rounded tub, spoked wheels and a lit fuse.
export function buildCart() {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const tub = new THREE.LatheGeometry([V2(0.55, 0), V2(0.7, 0.1), V2(0.85, 0.6), V2(0.92, 0.72), V2(0.86, 0.76)], 4);
  tub.rotateY(Math.PI / 4); tub.scale(1, 1, 1.3);
  const iron = lam(0x58606e), rust = lam(0xb5653a), red = lam(0xd8263a), tan = lam(0xe8d6a0);
  body.add(mesh(tub, rust, 0, 0.42, 0));
  const lip = new THREE.TorusGeometry(0.9, 0.06, 6, 4).rotateX(Math.PI / 2).rotateY(Math.PI / 4); lip.scale(1, 1, 1.3);
  body.add(mesh(lip, iron, 0, 1.17, 0, false));
  const stick = new THREE.CylinderGeometry(0.11, 0.11, 0.7, 10);
  for (let k = 0; k < 5; k++) {
    const m = mesh(stick, red, -0.36 + k * 0.18, 1.2, (k % 2 ? 0.16 : -0.14), false);
    m.rotation.z = (k - 2) * 0.12; body.add(m);
  }
  body.add(mesh(new THREE.BoxGeometry(0.9, 0.14, 0.12), tan, 0, 1.25, 0, false));
  const fuse = mesh(new THREE.SphereGeometry(0.12, 8, 6), glow(0xffd23a), 0.1, 1.7, 0, false);
  body.add(fuse);
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 14).rotateZ(Math.PI / 2);
  const wheels = [];
  for (const sx of [-0.62, 0.62]) for (const sz of [-0.55, 0.55]) {
    const wgrp = new THREE.Group(); wgrp.position.set(sx, 0.3, sz);
    wgrp.add(mesh(wheelGeo, iron, 0, 0, 0, false));
    wgrp.add(mesh(new THREE.BoxGeometry(0.13, 0.5, 0.06), lam(0x2a2f38), 0, 0, 0, false));
    body.add(wgrp); wheels.push(wgrp);
  }
  const L = floatingLabel(g, 3.2, 2.6);
  return { group: g, body, wheels, fuse, ...L };
}

// Harvest bank: a gate frame with a seed mound and a sprout that ripens with the stored deposit.
export function buildBank(w) {
  const model = buildGate(w, 0xffb02a);
  const crop = new THREE.Group(); crop.position.set(0, 0, -0.9);
  const soil = lam(0x6a4428), leaf = lam(0x6ad04a), grain = lam(0xffd04a);
  crop.add(mesh(lathe([[Math.min(1.4, w * 0.3), 0], [Math.min(1.2, w * 0.26), 0.18], [0.6, 0.3], [0, 0.34]], 18), soil, 0, 0, 0, false));
  const sprout = new THREE.Group(); sprout.position.y = 0.3; crop.add(sprout);
  const stalk = mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.2, 8), leaf, 0, 0.6, 0, false);
  sprout.add(stalk);
  const blade = lathe([[0, 0], [0.12, 0.2], [0.1, 0.55], [0, 0.8]], 6); blade.scale(1, 1, 0.25);
  for (const sx of [-1, 1]) { const b = mesh(blade, leaf, sx * 0.08, 0.3, 0, false); b.rotation.z = -sx * 0.7; sprout.add(b); }
  const head = mesh(lathe([[0, 0], [0.17, 0.12], [0.2, 0.35], [0.12, 0.55], [0, 0.62]], 10), grain, 0, 1.15, 0, false);
  sprout.add(head);
  model.group.add(crop);
  Object.assign(model, { crop, sprout, head });
  return model;
}

// Dinosaur egg in a straw nest. The shell cracks as the hatch timer runs down.
export function buildEgg(scale = 1, spots = 0x7ab84a) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const nest = new THREE.TorusGeometry(0.95, 0.28, 8, 22).rotateX(Math.PI / 2); nest.scale(1, 0.6, 1);
  g.add(mesh(nest, lam(0xb08a4a), 0, 0.14, 0, false));
  const shellMat = new THREE.MeshLambertMaterial({ color: 0xf2ead2 });
  const shell = lathe([[0, 0], [0.42, 0.06], [0.72, 0.4], [0.8, 0.85], [0.66, 1.4], [0.38, 1.78], [0, 1.9]], 24);
  body.add(mesh(shell, shellMat, 0, 0.12, 0));
  const spotGeo = new THREE.SphereGeometry(0.13, 8, 6), spotMat = lam(spots);
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4, y = 0.35 + (k % 4) * 0.33, rr = 0.78 - Math.abs(y - 0.85) * 0.28;
    const s = mesh(spotGeo, spotMat, Math.cos(a) * rr, y + 0.12, Math.sin(a) * rr, false);
    s.scale.set(1, 1.2, 0.35); s.lookAt(0, y + 0.12, 0); body.add(s);
  }
  const crackMat = new THREE.LineBasicMaterial({ color: 0x3a2a1a, transparent: true, opacity: 0 });
  const pts = [];
  for (let k = 0; k <= 8; k++) { const a = -0.9 + k * 0.22, y = 1.15 + (k % 2 ? 0.14 : -0.1); pts.push(new THREE.Vector3(Math.sin(a) * 0.74, y, Math.cos(a) * 0.74)); }
  body.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), crackMat));
  g.scale.setScalar(scale);
  const L = floatingLabel(g, 3, 3.1 / scale);
  return { group: g, body, shellMat, crackMat, ...L };
}

// Fusion core pylon: a lathe tower with floating rings around a glowing charge column.
export function buildFusionCore() {
  const g = new THREE.Group();
  const metal = lam(0x404a62), trim = lam(0xc9d4ff);
  g.add(mesh(lathe([[0.95, 0], [0.95, 0.18], [0.7, 0.32], [0.5, 0.5], [0.42, 2.6], [0.6, 2.8], [0.6, 2.95], [0, 3.0]], 16), metal));
  const columnMat = glow(0x48e8ff, 0.9);
  const column = mesh(new THREE.CylinderGeometry(0.22, 0.22, 1, 14), columnMat, 0, 0.55, 0.38, false);
  column.scale.y = 0.05; g.add(column);
  const rings = [];
  for (let k = 0; k < 3; k++) {
    const ring = mesh(new THREE.TorusGeometry(0.72 - k * 0.08, 0.06, 8, 26).rotateX(Math.PI / 2), trim, 0, 0.9 + k * 0.7, 0, false);
    g.add(ring); rings.push(ring);
  }
  const orbMat = glow(0x9af6ff);
  const orb = mesh(new THREE.SphereGeometry(0.34, 16, 12), orbMat, 0, 3.35, 0, false);
  g.add(orb);
  const L = floatingLabel(g, 3, 4.6);
  return { group: g, column, columnMat, rings, orb, orbMat, ...L };
}

// Fusion beam between two cores. Scaled along x by the engine, so it is built one unit wide.
export function buildFusionBeam() {
  const g = new THREE.Group();
  const outerMat = new THREE.MeshBasicMaterial({ color: 0x48e8ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
  const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const outer = mesh(new THREE.CylinderGeometry(0.42, 0.42, 1, 16, 1, true).rotateZ(Math.PI / 2), outerMat, 0, 2.2, 0, false);
  const inner = mesh(new THREE.CylinderGeometry(0.13, 0.13, 1, 10).rotateZ(Math.PI / 2), innerMat, 0, 2.2, 0, false);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.4), new THREE.MeshBasicMaterial({ color: 0x48e8ff, transparent: true, opacity: 0.25, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.05;
  g.add(outer, inner, floor);
  g.visible = false;
  const L = floatingLabel(g, 3.6, 3.6);
  return { group: g, outer, inner, floor, outerMat, innerMat, ...L };
}
