// Models for the level 11-20 mechanics: belts, jump pads, hangars, tesla coils, pillars, tornadoes,
// black holes, rolling swarm balls, the rival cannon and spider webs.
import * as THREE from 'three';
import { lam, mesh, makeCanvasLabel, textPlane, redUnitGeo, buildCannon, buildGate, troopWeaponGeo } from './models.js';
import { WEAPON_IDS, CHASSIS_IDS } from './arsenal.js';
import { createVehicleRig } from './vehicle-assets.js';
import { createSupportAircraft } from './air-assets.js';
export { buildBattlePillar as buildPillar } from './battlefield-assets.js';

function stripeTexture(a, b, n = 8, w = 128, h = 32) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = a; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = b;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * w;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w / n / 2, h / 2); ctx.lineTo(x, h); ctx.lineTo(x + w / n / 4, h / 2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function label(g, w, y, z = 0.2) {
  const L = makeCanvasLabel();
  const tw = Math.min(w, 3.8);
  const text = textPlane(L, tw, tw / 2, false);
  text.position.set(0, y, z); text.rotation.x = -0.3; text.renderOrder = 4;
  g.add(text);
  return { label: L, text };
}

// conveyor belt: arrows scroll in the push direction (texture offset animated by the game)
export function buildBelt(w, len, dir) {
  const g = new THREE.Group();
  const tex = stripeTexture('#2b2f3a', '#ffcc1a', 6);
  tex.repeat.set(w / 2.2, len / 2.2);
  const belt = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshBasicMaterial({ map: tex }));
  belt.rotation.x = -Math.PI / 2;
  belt.rotation.z = dir > 0 ? 0 : Math.PI;
  belt.position.y = 0.02;
  g.add(belt);
  const rollerMat = lam(0x8a90a0);
  const roller = new THREE.CylinderGeometry(0.16, 0.16, len, 10); roller.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) g.add(mesh(roller, rollerMat, sx * (w / 2 + 0.1), 0.16, 0, false));
  return { group: g, tex };
}

// trampoline: launches units in an arc over walls and gates
export function buildJumpPad(w) {
  const g = new THREE.Group();
  const r = Math.min(w / 2 - 0.1, 1.5);
  const frame = lam(0x2a6aff);
  const pad = mesh(new THREE.CylinderGeometry(r, r * 1.05, 0.35, 28), frame, 0, 0.18, 0, false);
  g.add(pad);
  const panelMat = new THREE.MeshBasicMaterial({ color: 0x3affd0, transparent: true, opacity: 0.85 });
  const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.82, 28), panelMat);
  top.rotation.x = -Math.PI / 2; top.position.y = 0.37; g.add(top);
  const springGeo = new THREE.TorusGeometry(r * 0.95, 0.07, 6, 28); springGeo.rotateX(Math.PI / 2);
  const springs = new THREE.Group(); g.add(springs);
  for (let k = 0; k < 3; k++) springs.add(mesh(springGeo, lam(0xffcc1a), 0, 0.08 + k * 0.1, 0, false));
  const arrow = new THREE.Shape();
  arrow.moveTo(0, 0.7); arrow.lineTo(0.5, 0.05); arrow.lineTo(0.2, 0.05); arrow.lineTo(0.2, -0.6); arrow.lineTo(-0.2, -0.6); arrow.lineTo(-0.2, 0.05); arrow.lineTo(-0.5, 0.05);
  const ar = new THREE.Mesh(new THREE.ShapeGeometry(arrow), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  ar.rotation.x = -Math.PI / 2; ar.position.y = 0.39; ar.scale.setScalar(r * 0.9); g.add(ar);
  const L = label(g, w, 1.6, 0);
  return { group: g, panelMat, ...L, top, setColor() {} };
}

export function buildSupportPlane(tier = 1) {
  return createSupportAircraft(tier);
}

export function buildArmory(w, upgrade) {
  const model = buildGate(w, 0xffc54a);
  const icon = new THREE.Group(); icon.position.y = 2.8; model.group.add(icon);
  const metal = lam(0x28496b), gold = lam(0xffd571), light = lam(0xe1faff);
  if (upgrade === 'tank' || CHASSIS_IDS[upgrade]) {
    const rig = createVehicleRig(); rig.setForm(CHASSIS_IDS[upgrade] || 1);
    rig.group.scale.setScalar(.58); rig.group.position.y = -.55;
    rig.group.rotation.y = Math.PI / 5; icon.add(rig.group);
  } else if (upgrade === 'squad') {
    for (const side of [-1,1]) {
      icon.add(mesh(new THREE.BoxGeometry(.58,.18,.7),metal,side*.4,-.1,0));
      icon.add(mesh(new THREE.SphereGeometry(.26,8,6),gold,side*.4,.15,0));
      icon.add(mesh(new THREE.CylinderGeometry(.09,.11,.55,8).rotateX(Math.PI/2),light,side*.4,.15,-.35));
    }
  } else if (WEAPON_IDS[upgrade]) {
    const gun = new THREE.Mesh(troopWeaponGeo(WEAPON_IDS[upgrade]), new THREE.MeshToonMaterial({ vertexColors: true }));
    gun.scale.setScalar(2); gun.position.set(-.65, -.9, -.7); gun.rotation.y = Math.PI / 2; icon.add(gun);
  } else if (upgrade === 'air') {
    const plane = buildSupportPlane(); plane.group.scale.setScalar(.5); icon.add(plane.group);
  } else {
    const bolt = new THREE.Shape(); bolt.moveTo(.12, .75); bolt.lineTo(-.4, -.05); bolt.lineTo(0, -.05); bolt.lineTo(-.12, -.7); bolt.lineTo(.45, .15); bolt.lineTo(.05, .15);
    const geo = new THREE.ExtrudeGeometry(bolt, { depth: .12, bevelEnabled: false });
    icon.add(mesh(geo, light));
  }
  model.icon = icon;
  return model;
}

// Fill the hangar to unlock repeated bombing runs.
export function buildHangar(w) {
  const g = new THREE.Group();
  const crate = lam(0x2a4aa8), crateDark = lam(0x1a2a6a);
  g.add(mesh(new THREE.BoxGeometry(w, 1.5, 1.8), crate, 0, 0.75, 0));
  for (const x of [-w / 2 + 0.25, w / 2 - 0.25]) g.add(mesh(new THREE.BoxGeometry(0.2, 1.55, 1.85), crateDark, x, 0.77, 0, false));
  g.add(mesh(new THREE.BoxGeometry(w + 0.1, 0.2, 1.9), crateDark, 0, 1.55, 0, false));
  const plane = buildSupportPlane().group; plane.position.set(0, 2.2, 0); g.add(plane);
  plane.scale.setScalar(Math.min(.75, w / 5));
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xffc21a, transparent: true, opacity: 0.0 });
  const L = label(g, w, 3.6, 0.6);
  return { group: g, plane, panelMat, ...L, setColor() {} };
}

// tesla coil gate: feed it and it becomes an allied lightning tower
export function buildTesla(w) {
  const g = new THREE.Group();
  const metal = lam(0x5a6070), copper = lam(0xd07a3a);
  const H = 2.2;
  const postGeo = new THREE.BoxGeometry(0.26, H, 0.26);
  g.add(mesh(postGeo, metal, -w / 2, H / 2, 0), mesh(postGeo, metal, w / 2, H / 2, 0));
  const panelMat = new THREE.MeshBasicMaterial({ color: 0x3ad0ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, H - 0.1), panelMat); panel.position.y = H / 2; g.add(panel);
  const coil = new THREE.Group(); coil.position.set(w / 2, H, 0); g.add(coil);
  coil.add(mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.6, 10), copper, 0, 0.8, 0));
  for (let k = 0; k < 4; k++) coil.add(mesh(new THREE.TorusGeometry(0.34 - k * 0.03, 0.06, 6, 16), metal, 0, 0.3 + k * 0.35, 0, false).rotateX(Math.PI / 2));
  const orbMat = new THREE.MeshBasicMaterial({ color: 0x6af0ff });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), orbMat); orb.position.y = 1.9; coil.add(orb);
  g.add(mesh(new THREE.BoxGeometry(w + 0.26, 0.2, 0.26), metal, 0, H, 0));
  const L = label(g, w, H * 0.56, 0.1);
  return { group: g, panelMat, ...L, coil, orb, orbMat, setColor(c) { panelMat.color.set(c); } };
}

// stone pillar: shoot it down and it topples across the road, crushing the horde
// Open wind spirals leave the route visible through the moving funnel.
export function buildTornado(r) {
  const g = new THREE.Group();
  const strands = [];
  for (let k = 0; k < 3; k++) {
    const points = [];
    for (let j = 0; j <= 60; j++) {
      const t = j / 60, angle = t * Math.PI * 5.2 + k * Math.PI * 2 / 3;
      const radius = r * (.18 + t * .92);
      points.push(new THREE.Vector3(Math.cos(angle) * radius, .2 + t * 5.4, Math.sin(angle) * radius));
    }
    const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 84, .045 + k * .009, 4, false);
    const strand = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: k % 2 ? 0xe2f6ff : 0xb4d2e4, transparent: true, opacity: .34, depthWrite: false }));
    g.add(strand); strands.push(strand);
  }
  const core = new THREE.Mesh(new THREE.ConeGeometry(r * 1.1, 5.4, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xcfd8e4, transparent: true, opacity: .035, side: THREE.DoubleSide, depthWrite: false }));
  core.rotation.x = Math.PI; core.position.y = 2.9; g.add(core);
  const footprint = new THREE.Mesh(new THREE.RingGeometry(r * .84, r, 40),
    new THREE.MeshBasicMaterial({ color: 0xbce5ff, transparent: true, opacity: .18, depthWrite: false }));
  footprint.rotation.x = -Math.PI / 2; footprint.position.y = .06; g.add(footprint);
  return { group: g, strands, core, footprint };
}

// black hole: pulls everything in; feed it enough power and it goes SUPERNOVA
export function buildBlackHole(r) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  core.position.y = r + 0.2; g.add(core);
  const diskMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const disk = new THREE.Mesh(new THREE.RingGeometry(r * 1.15, r * 2.6, 48, 3), diskMat);
  disk.rotation.x = -Math.PI / 2 + 0.35; disk.position.y = r + 0.2; g.add(disk);
  const halo = new THREE.Mesh(new THREE.RingGeometry(r * 1.02, r * 1.3, 48), new THREE.MeshBasicMaterial({ color: 0xffd0a0, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.y = r + 0.2; g.add(halo);
  const pull = new THREE.Mesh(new THREE.RingGeometry(r * 3.0, r * 3.2, 48), new THREE.MeshBasicMaterial({ color: 0x9a3aff, transparent: true, opacity: 0.35, depthWrite: false }));
  pull.rotation.x = -Math.PI / 2; pull.position.y = 0.05; g.add(pull);
  const L = label(g, 4, r * 2 + 1.8, 0);
  return { group: g, core, disk, diskMat, halo, pull, ...L };
}

// rolling ball made of hundreds of red units (reference frame "999")
let ballUnit = null;
export function buildSwarmBall(r) {
  if (!ballUnit) ballUnit = redUnitGeo('low').scale(1.25, 1.25, 1.25);
  const n = 144;
  const material = new THREE.MeshToonMaterial({ color: 0xe8222a, emissive: 0x3a0505, vertexColors: true });
  const inst = new THREE.InstancedMesh(ballUnit, material, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
    p.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
    q.setFromUnitVectors(up, p);
    m.compose(p.clone().multiplyScalar(0.92), q, s.setScalar(0.3 + Math.random() * 0.06));
    inst.setMatrixAt(i, m);
  }
  inst.castShadow = false;
  const g = new THREE.Group();
  const spin = new THREE.Group(); g.add(spin);
  const fill = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), lam(0xa8141c));
  spin.add(fill, inst);
  spin.scale.setScalar(r);
  const warning = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40), new THREE.MeshBasicMaterial({ color: 0xff6644, transparent: true, opacity: 0.45, depthWrite: false }));
  warning.rotation.x = -Math.PI / 2; g.add(warning);
  return { group: g, spin, inst, material, warning, count: n };
}

// the rival: a red cannon at the top of the road, firing enemies down at you
export function buildRival() {
  const c = buildCannon(0xe8263a);
  c.group.rotation.y = Math.PI;
  c.group.scale.setScalar(1.7);
  c.setBarrels(2);
  const g = new THREE.Group();
  g.add(c.group);
  g.add(mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.4, 16), lam(0x3a1016), 0, 0.2, 0, false));
  return { group: g, cannon: c };
}

// sticky web zone left by the spider boss
let webTex = null;
export function webMaterial() {
  if (!webTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5;
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.cos(a) * 64, 64 + Math.sin(a) * 64); ctx.stroke(); }
    for (let r = 10; r < 64; r += 12) { ctx.beginPath(); ctx.arc(64, 64, r, 0, Math.PI * 2); ctx.stroke(); }
    webTex = new THREE.CanvasTexture(c);
    webTex.wrapS = webTex.wrapT = THREE.RepeatWrapping;
  }
  return new THREE.MeshBasicMaterial({ map: webTex, transparent: true, opacity: 0.85, depthWrite: false });
}
