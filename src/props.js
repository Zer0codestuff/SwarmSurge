// Models for the level 11-20 mechanics: belts, jump pads, hangars, tesla coils, pillars, tornadoes,
// black holes, rolling swarm balls, the rival cannon and spider webs.
import * as THREE from 'three';
import { lam, mesh, makeCanvasLabel, textPlane, buildCannon, troopWeaponGeo } from './models.js';
export { buildConveyor as buildBelt } from './conveyor-assets.js';
import { swarmBallShell } from './swarm-ball-assets.js';
import { sculptLoadingBay, drivePayload } from './supply-assets.js';
import { WEAPON_IDS, CHASSIS_IDS } from './arsenal.js';
import { vehicleDisplay } from './vehicle-assets.js';
import { createSupportAircraft } from './air-assets.js';
import { sculptJumpPad, sculptHangar, sculptTesla } from './obstacle-assets.js';
export { buildBattlePillar as buildPillar } from './battlefield-assets.js';

function label(g, w, y, z = 0.2) {
  const L = makeCanvasLabel();
  const tw = Math.min(w, 3.8);
  const text = textPlane(L, tw, tw / 2, false);
  text.position.set(0, y, z); text.rotation.x = -0.3; text.renderOrder = 4;
  g.add(text);
  return { label: L, text };
}

// trampoline: launches units in an arc over walls and gates
export function buildJumpPad(w) {
  const g = new THREE.Group();
  const r = Math.min(w / 2 - 0.1, 1.5);
  sculptJumpPad(g, r);
  const panelMat = new THREE.MeshBasicMaterial({ color: 0x3affd0, transparent: true, opacity: 0.85 });
  const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.82, 28), panelMat);
  top.rotation.x = -Math.PI / 2; top.position.y = 0.39; g.add(top);
  const arrow = new THREE.Shape();
  arrow.moveTo(0, 0.7); arrow.lineTo(0.5, 0.05); arrow.lineTo(0.2, 0.05); arrow.lineTo(0.2, -0.6); arrow.lineTo(-0.2, -0.6); arrow.lineTo(-0.2, 0.05); arrow.lineTo(-0.5, 0.05);
  const ar = new THREE.Mesh(new THREE.ShapeGeometry(arrow), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  ar.rotation.x = -Math.PI / 2; ar.position.y = 0.41; ar.scale.setScalar(r * 0.9); g.add(ar);
  const L = label(g, w, 1.6, 0);
  return { group: g, panelMat, ...L, top, setColor() {} };
}

export function buildSupportPlane(tier = 1) {
  return createSupportAircraft(tier);
}

export function buildArmory(w, upgrade) {
  const group = new THREE.Group(), icon = new THREE.Group();
  const jaws = sculptLoadingBay(group,w);
  const vehicle = upgrade === 'tank' || !!CHASSIS_IDS[upgrade];
  const stand = new THREE.Group(); icon.add(stand); group.add(icon);
  let displayedTier = 0;
  function mount(reward) {
    // Fit around the local origin first, independent of an animated parent's
    // world transform. Weapon geometry includes the troop's hand offset.
    const bounds = new THREE.Box3().setFromObject(reward);
    const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
    const scale = Math.min(1.75,w*.66)/Math.max(size.x,size.y,size.z);
    stand.position.copy(center).multiplyScalar(-scale);
    stand.scale.setScalar(scale);
    stand.add(reward);
  }
  function setTier(tier) {
    if (displayedTier === tier) return;
    displayedTier = tier;
    stand.traverse(part => { if (part.isInstancedMesh) part.dispose(); });
    stand.clear();
    mount(vehicle ? vehicleDisplay(tier) : buildSupportPlane(tier).group);
  }
  if (vehicle || upgrade === 'air') setTier(CHASSIS_IDS[upgrade] || 1);
  else if (WEAPON_IDS[upgrade]) {
    const gun = new THREE.Mesh(troopWeaponGeo(WEAPON_IDS[upgrade], 'low'),lam(0xffffff,{vertexColors:true}));
    gun.rotation.y = Math.PI / 2; mount(gun);
  } else mount(drivePayload(upgrade));
  const display = label(group,Math.min(w*.92,3.7),1.04,.62);
  function pose(progress,time,release=0) {
    const open = .13 + progress*.38 + release*.44;
    jaws[0].rotation.z = open; jaws[1].rotation.z = -open;
    icon.position.set(0,2.06 + .35*progress + .075*Math.sin(2*time) + .9*release,-.16);
    icon.rotation.y = .58 + .48*Math.sin(time*1.4);
  }
  pose(0,0);
  return {group, icon, pose, setTier: vehicle || upgrade === 'air' ? setTier : null, ...display};
}

// Fill the hangar to unlock repeated bombing runs.
export function buildHangar(w) {
  const g = new THREE.Group();
  sculptHangar(g, w);
  const plane = buildSupportPlane().group; plane.position.set(0, 2.2, 0); g.add(plane);
  plane.scale.setScalar(Math.min(.75, w / 5));
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xffc21a, transparent: true, opacity: 0.0 });
  const L = label(g, w, 3.6, 0.6);
  return { group: g, plane, panelMat, ...L, setColor() {} };
}

// tesla coil gate: feed it and it becomes an allied lightning tower
export function buildTesla(w) {
  const g = new THREE.Group();
  const H = 2.2;
  const panelMat = new THREE.MeshBasicMaterial({ color: 0x3ad0ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, H - 0.1), panelMat); panel.position.y = H / 2; g.add(panel);
  const coil = sculptTesla(g, w, H);
  const orbMat = new THREE.MeshBasicMaterial({ color: 0x6af0ff });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), orbMat); orb.position.y = 1.9; coil.add(orb);
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
    new THREE.MeshBasicMaterial({ color: 0xcfd8e4, transparent: true, opacity: .035, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false }));
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
  const diskMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const disk = new THREE.Mesh(new THREE.RingGeometry(r * 1.15, r * 2.6, 48, 3), diskMat);
  disk.rotation.x = -Math.PI / 2 + 0.35; disk.position.y = r + 0.2; g.add(disk);
  const halo = new THREE.Mesh(new THREE.RingGeometry(r * 1.02, r * 1.3, 48), new THREE.MeshBasicMaterial({ color: 0xffd0a0, transparent: true, opacity: 0.9, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.y = r + 0.2; g.add(halo);
  const pull = new THREE.Mesh(new THREE.RingGeometry(r * 3.0, r * 3.2, 48), new THREE.MeshBasicMaterial({ color: 0x9a3aff, transparent: true, opacity: 0.35, depthWrite: false }));
  pull.rotation.x = -Math.PI / 2; pull.position.y = 0.05; g.add(pull);
  const L = label(g, 4, r * 2 + 1.8, 0);
  return { group: g, core, disk, diskMat, halo, pull, ...L };
}

// rolling ball made of hundreds of red units (reference frame "999")
export function buildSwarmBall(r) {
  const material = new THREE.MeshToonMaterial({color:0xffe1d7, emissive:0x230403, vertexColors:true});
  const {inst,fill,count} = swarmBallShell(material);
  const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
  spin.add(fill, inst);
  spin.scale.setScalar(r);
  const warning = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40), new THREE.MeshBasicMaterial({ color: 0xff6644, transparent: true, opacity: 0.45, depthWrite: false }));
  warning.rotation.x = -Math.PI / 2; g.add(warning);
  return { group: g, spin, inst, material, warning, count };
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
