import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';
import { THEMES } from './levels.js';
import { LATE_GLOW_ROAD, LATE_POSTS } from './biomes-late.js';
import * as S from './scenery-assets.js';
import { raiderGeometry } from './troop-forms.js';
import { sculptedWeaponGeometry } from './weapon-assets.js';
import { createVehicleRig, cannonBarrelGeometry, buildCarriage, orbSocketGeometry } from './vehicle-assets.js';
import { buildSculptedCore } from './boss-sculpted-core.js';
import { buildSculptedRoyal } from './boss-sculpted-royal.js';
export { buildBattleTower as buildTower, buildBattleTurret as buildTurret, buildBattleSpawner as buildSpawner, buildBattleWall as buildWall, buildBattleCrusher as buildCrusher } from './battlefield-assets.js';

// ---------- helpers ----------
const matCache = new Map();
// cartoon shading: three soft light bands
let toonRamp = null;
export function toonGradient() {
  if (!toonRamp) {
    toonRamp = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1);
    toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter;
    toonRamp.needsUpdate = true;
  }
  return toonRamp;
}
export function lam(hex, opts = {}) {
  const key = hex + JSON.stringify(opts);
  if (!matCache.has(key)) {
    const { flatShading, ...rest } = opts;
    const material = new THREE.MeshToonMaterial({ color: hex, gradientMap: toonGradient(), ...rest });
    material.userData.shared = true;
    matCache.set(key, material);
  }
  return matCache.get(key);
}
export function mesh(geo, mat, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  return m;
}
// Bake a solid vertex color into a geometry so merged meshes can have several colors.
export function paint(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
export function merge(parts) {
  const clean = parts.map((g) => {
    const ng = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'color'].includes(k)) ng.deleteAttribute(k);
    return ng;
  });
  return mergeGeometries(clean);
}

// ---------- units (instanced; instance color multiplies the baked vertex colors) ----------

// Separate instanced overlays keep weapons visible without adding a draw call per troop.
export function troopWeaponGeo(kind, detail = 'high') {
  const geometry = sculptedWeaponGeometry(kind, detail);
  geometry.userData.shared = false;
  return geometry;
}
export function redUnitGeo(detail = 'high') {
  return raiderGeometry(detail);
}
// Splitter spikes ride on top of the red body.
export function spikesGeo() {
  const parts = [];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const c = new THREE.ConeGeometry(0.08, 0.3, 5);
    c.rotateZ(Math.cos(a) * 0.9); c.rotateX(Math.sin(a) * 0.9);
    c.translate(Math.cos(a) * 0.18, 1.0, Math.sin(a) * 0.18);
    parts.push(paint(c, 0xffe0ff));
  }
  return merge(parts);
}

// ---------- text on canvas (gate numbers etc.) ----------
const FONT = '"Arial Black","Segoe UI Black","Helvetica Neue",Impact,system-ui,sans-serif';
export function makeCanvasLabel(w = 512, h = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas, ctx, tex, key: '' };
}
export function drawLabel(L, main, sub = '', prog = -1, color = '#ffffff') {
  const key = main + '|' + sub + '|' + (prog < 0 ? -1 : Math.round(prog * 60)) + color;
  if (L.key === key) return;
  L.key = key;
  const { ctx, canvas } = L;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  let size = sub ? 116 : 168;
  ctx.font = `900 ${size}px ${FONT}`;
  const mw = ctx.measureText(main).width;
  if (mw > W * 0.9) { size = Math.floor(size * (W * 0.9) / mw); ctx.font = `900 ${size}px ${FONT}`; }
  const my = sub ? H * 0.36 : H * 0.53;
  ctx.lineWidth = Math.max(10, size * 0.17);
  ctx.strokeStyle = 'rgba(24,10,44,0.92)';
  ctx.strokeText(main, W / 2, my);
  ctx.fillStyle = color;
  ctx.fillText(main, W / 2, my);
  if (sub) {
    let ss = 62;
    ctx.font = `900 ${ss}px ${FONT}`;
    const sw = ctx.measureText(sub).width;
    if (sw > W * 0.92) { ss = Math.floor(ss * (W * 0.92) / sw); ctx.font = `900 ${ss}px ${FONT}`; }
    ctx.lineWidth = 12;
    ctx.strokeText(sub, W / 2, H * 0.73);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, W / 2, H * 0.73);
  }
  if (prog >= 0) {
    const x0 = 60, x1 = W - 60, y = H - 30, h = 20;
    ctx.fillStyle = 'rgba(24,10,44,0.85)';
    ctx.fillRect(x0 - 5, y - 5, x1 - x0 + 10, h + 10);
    ctx.fillStyle = color;
    ctx.fillRect(x0, y, (x1 - x0) * Math.min(1, prog), h);
  }
  L.tex.needsUpdate = true;
}
export function textPlane(L, w, h, depthTest = true) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: L.tex, transparent: true, depthWrite: false, depthTest }));
}

// ---------- cannon ----------
export function buildCannon(tint = 0x2f8bff) {
  const g = new THREE.Group();
  const base = new THREE.Group(); base.name = 'base-cannon'; g.add(base);
  const carriage = buildCarriage(tint); base.add(carriage.group);
  const body = carriage.body, wheels = carriage.wheels;
  const barrels = new THREE.Group(); barrels.position.set(0, 1.1, -0.2); g.add(barrels);
  const barrelGeo = cannonBarrelGeometry(tint), barrelMaterial = lam(0xffffff, { vertexColors: true });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xbff3ff, transparent: true, opacity: 0.55, emissive: 0x3aa0c0 }));
  dome.position.set(0, 1.55, 0.2); base.add(dome);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xaef6ff });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), glowMat);
  glow.position.set(0, 1.6, 0.2); g.add(glow);
  const socket = new THREE.Mesh(orbSocketGeometry(), body.material); socket.visible = false; g.add(socket);
  const rig = createVehicleRig(tint); g.add(rig.group);
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhongMaterial({ color: 0x75ebff, emissive: 0x124762, transparent: true, opacity: 0.1, depthWrite: false, shininess: 90 }));
  shield.visible = false; g.add(shield);
  function setChassis(tier) {
    rig.setForm(tier);
    base.visible = rig.formId === 0;
    body.visible = dome.visible = base.visible;
    wheels.forEach(w => { w.visible = base.visible; });
    barrels.position.copy(rig.barrelAnchor);
    glow.position.copy(rig.glowAnchor);
    socket.visible = !base.visible;
    socket.position.copy(rig.glowAnchor); socket.position.y -= 0.2;
  }
  function animateVehicle(time, dt, recoil, speed, charge) {
    rig.animate(time, dt, recoil, speed, charge);
  }
  function setBarrels(n) {
    barrels.clear();
    const sp = n > 4 ? 0.3 : 0.42;
    for (let i = 0; i < n; i++) {
      const b = mesh(barrelGeo, barrelMaterial);
      b.position.x = (i - (n - 1) / 2) * sp;
      b.scale.setScalar(n > 4 ? .76 : 1);
      barrels.add(b);
    }
  }
  setBarrels(1);
  return { group: g, setBarrels, setChassis, animateVehicle, rig, barrels, glow, glowMat, bodyMat: body.material, wheels, shield };
}

// ---------- gates ----------
let shineTex = null;
export function shineTexture() {
  if (shineTex) return shineTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  const gr = ctx.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.42, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)');
  gr.addColorStop(0.56, 'rgba(255,255,255,0)'); gr.addColorStop(0.64, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.68, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 256, 64);
  shineTex = new THREE.CanvasTexture(c);
  shineTex.wrapS = THREE.RepeatWrapping;
  shineTex.repeat.set(0.5, 1);
  return shineTex;
}
const gateTrim = new THREE.MeshLambertMaterial({ color: 0x27313f }); gateTrim.userData.shared = true;
function gateLathe(profile, sides = 12) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(.001, r), y)), sides);
}
// Vertex shades let one tinted material read as pale collars over a deeper shaft.
function gateShade(geo, fn) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const v = fn(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
export function buildGate(w, hex, mega = false) {
  const g = new THREE.Group();
  const H = mega ? 2.5 : 2.0;
  // Sculpted pylons, a rounded lintel and a ramped sill share one tinted mesh.
  const frameMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(hex).multiplyScalar(0.55), vertexColors: true });
  const capMat = new THREE.MeshBasicMaterial({ color: hex });
  const parts = [], trim = [], caps = [];
  for (const sx of [-1, 1]) {
    const post = gateLathe([[.27, 0], [.27, .12], [.2, .2], [.15, .34], [.14, H * .55], [.13, H - .3], [.19, H - .22], [.21, H - .04], [.13, H + .02], [.001, H + .03]]);
    parts.push(gateShade(post, (x, y) => (y < .22 || y > H - .24 ? 1.45 : .9 + .25 * y / H)).translate(sx * w / 2, 0, 0));
    for (const y of [.24, H - .27]) trim.push(new THREE.TorusGeometry(.155, .035, 5, 14).rotateX(Math.PI / 2).translate(sx * w / 2, y, 0));
    caps.push(new THREE.SphereGeometry(mega ? .2 : .16, 12, 8).translate(sx * w / 2, H + .2, 0));
    caps.push(new THREE.BoxGeometry(.05, H * .5, .06).translate(sx * w / 2, H * .5, .14));
  }
  parts.push(gateShade(new THREE.CylinderGeometry(.1, .1, w, 10, 1).rotateZ(Math.PI / 2).translate(0, H - .02, 0), () => 1.25));
  const sill = new THREE.CylinderGeometry(.16, .16, w + .2, 10, 1, false, Math.PI, Math.PI); sill.rotateZ(Math.PI / 2); sill.scale(1, .45, 1.6);
  parts.push(gateShade(sill.translate(0, .005, 0), () => 1.1));
  for (let i = 0; i < 3; i++) {
    const chevron = new THREE.Shape([[-.22, .05], [0, -.12], [.22, .05], [.22, .14], [0, -.03], [-.22, .14]].map(([x, y]) => new THREE.Vector2(x, y)));
    caps.push(new THREE.ShapeGeometry(chevron).rotateX(-Math.PI / 2).translate((i - 1) * Math.min(.9, w * .28), .085, .02));
  }
  const frame = mesh(mergeGeometries(parts.map(geo => { const n = geo.index ? geo.toNonIndexed() : geo; n.deleteAttribute('uv'); return n; })), frameMat);
  const trimMesh = mesh(mergeGeometries(trim.map(geo => { const n = geo.toNonIndexed(); n.deleteAttribute('uv'); return n; })), gateTrim, 0, 0, 0, false);
  const capMesh = new THREE.Mesh(mergeGeometries(caps.map(geo => { const n = geo.index ? geo.toNonIndexed() : geo; n.deleteAttribute('uv'); return n; })), capMat);
  g.add(frame, trimMesh, capMesh);
  const panelMat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.55, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w - .12, H - 0.16), panelMat);
  panel.position.y = (H - 0.16) / 2 + 0.06;
  g.add(panel);
  // moving shine stripe (one shared texture animates every gate)
  const shine = new THREE.Mesh(panel.geometry, new THREE.MeshBasicMaterial({ map: shineTexture(), transparent: true, opacity: mega ? 0.55 : 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true }));
  shine.position.copy(panel.position); shine.position.z = 0.01;
  g.add(shine);
  const label = makeCanvasLabel();
  const tw = Math.min(w * 0.98, mega ? 4.6 : 3.7);
  const text = textPlane(label, tw, tw / 2);
  text.position.set(0, H * 0.56, 0.08);
  text.rotation.x = -0.3;
  text.renderOrder = 3;
  g.add(text);
  return {
    group: g, panel, panelMat, frameMat, label, text,
    setColor(c) { panelMat.color.set(c); capMat.color.set(c); frameMat.color.set(c).multiplyScalar(0.55); },
  };
}

export function buildIceWall(w) {
  const g = new THREE.Group();
  const iceMat = new THREE.MeshLambertMaterial({ color: 0xa8ecff, transparent: true, opacity: 0.82, emissive: 0x1b5f80 });
  const box = mesh(new THREE.BoxGeometry(w, 1.9, 0.9), iceMat, 0, 0.95, 0);
  g.add(box);
  const chunkGeo = new THREE.OctahedronGeometry(0.45);
  for (let i = 0; i < 4; i++) {
    const c = mesh(chunkGeo, iceMat, (i / 3 - 0.5) * (w - 0.6), 2.0, (i % 2) * 0.2 - 0.1);
    c.rotation.set(i, i * 2, 0); c.scale.y = 1.5;
    g.add(c);
  }
  const label = makeCanvasLabel();
  const tw = Math.min(w * 1.05, 4.2);
  const text = textPlane(label, tw, tw / 2, false);
  text.position.set(0, 1.2, 0.6); text.rotation.x = -0.3; text.renderOrder = 4;
  g.add(text);
  return { group: g, label, text, panelMat: iceMat, setColor() {} };
}

// chain-link fence (reference screenshot 1)
let chainTex = null;
function chainTexture() {
  if (chainTex) return chainTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = 'rgba(225,230,240,0.95)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(32, 0); ctx.lineTo(64, 32); ctx.lineTo(32, 64); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0); ctx.stroke();
  chainTex = new THREE.CanvasTexture(c);
  chainTex.wrapS = chainTex.wrapT = THREE.RepeatWrapping;
  chainTex.colorSpace = THREE.SRGBColorSpace;
  return chainTex;
}
export function buildFence(w) {
  const g = new THREE.Group();
  const H = 2.6;
  const metal = lam(0x9aa2ae), dark = lam(0x5a616c);
  const postGeo = new THREE.CylinderGeometry(0.1, 0.1, H, 8);
  for (const x of [-w / 2, 0, w / 2]) g.add(mesh(postGeo, metal, x, H / 2, 0));
  const bar = new THREE.CylinderGeometry(0.07, 0.07, w, 8); bar.rotateZ(Math.PI / 2);
  g.add(mesh(bar, dark, 0, H - 0.05, 0), mesh(bar, dark, 0, 0.1, 0));
  const tex = chainTexture().clone(); tex.needsUpdate = true;
  tex.repeat.set(w * 2.2, H * 2.2);
  const panelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false, color: 0xdde4ee });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, H - 0.15), panelMat);
  panel.position.y = H / 2;
  g.add(panel);
  const label = makeCanvasLabel();
  const tw = Math.min(w, 3.6);
  const text = textPlane(label, tw, tw / 2, false);
  text.position.set(0, H + 0.9, 0.2); text.rotation.x = -0.3; text.renderOrder = 4;
  g.add(text);
  return { group: g, label, text, panelMat, setColor() {}, baseOpacity: 0.9 };
}

// sand golem statue on a pedestal (reference screenshot 3)
export function buildStatue(w, small) {
  const g = new THREE.Group();
  const sand = lam(0xd9b27a, { flatShading: true }), sandDark = lam(0xb98d55, { flatShading: true });
  if (small) {
    g.add(mesh(new THREE.BoxGeometry(w, 1.0, 1.6), sandDark, 0, 0.5, 0));
    g.add(mesh(new THREE.BoxGeometry(w * 0.8, 0.5, 1.2), sand, 0, 1.25, 0));
  } else {
    g.add(mesh(new THREE.BoxGeometry(w, 0.7, 2.0), sandDark, 0, 0.35, 0));
    const s = new THREE.Group(); s.position.y = 0.7; g.add(s);
    const body = mesh(new THREE.DodecahedronGeometry(0.95), sand, 0, 1.7, 0); body.scale.set(1.25, 1.05, 0.9); s.add(body);
    s.add(mesh(new THREE.DodecahedronGeometry(0.55), sand, 0, 3.0, 0.15));
    for (const sx of [-1, 1]) {
      s.add(mesh(new THREE.DodecahedronGeometry(0.5), sandDark, sx * 1.25, 2.2, 0));
      s.add(mesh(new THREE.DodecahedronGeometry(0.55), sand, sx * 1.35, 1.05, 0.25));
      s.add(mesh(new THREE.DodecahedronGeometry(0.45), sandDark, sx * 0.55, 0.45, 0));
    }
  }
  const label = makeCanvasLabel();
  const tw = Math.min(w * 1.05, 3.6);
  const text = textPlane(label, tw, tw / 2, false);
  text.position.set(0, small ? 1.6 : 2.6, 1.1); text.rotation.x = -0.3; text.renderOrder = 4;
  g.add(text);
  return { group: g, label, text, panelMat: { opacity: 1 }, setColor() {} };
}

// portal: glowing ring you shoot through; exit pad on the ground
export function buildPortal(w, color = 0xff4fd8, inner = 0xc040ff) {
  const g = new THREE.Group();
  const r = Math.min(1.25, w / 2 - 0.1);
  const ringMat = new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.55) });
  const ring = mesh(new THREE.TorusGeometry(r, 0.16, 10, 32), ringMat, 0, r + 0.25, 0);
  g.add(ring);
  const panelMat = new THREE.MeshBasicMaterial({ color: inner, transparent: true, opacity: 0.6, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r - 0.08, 32), panelMat);
  disc.position.y = r + 0.25; g.add(disc);
  const swirl = new THREE.Mesh(new THREE.RingGeometry(r * 0.25, r * 0.75, 3, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false }));
  swirl.position.set(0, r + 0.25, 0.02); g.add(swirl);
  g.add(mesh(new THREE.BoxGeometry(w, 0.1, 0.3), lam(0x5a1a6a), 0, 0.05, 0, false));
  const label = makeCanvasLabel();
  const text = textPlane(label, 3, 1.5, false);
  text.position.set(0, 2 * r + 0.9, 0); text.rotation.x = -0.3; text.renderOrder = 4;
  g.add(text);
  return { group: g, label, text, panelMat, swirl, setColor() {} };
}
export function buildPortalExit() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 32), new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ color: 0xc040ff, transparent: true, opacity: 0.4, depthWrite: false }));
  inner.rotation.x = -Math.PI / 2; inner.position.y = 0.035; g.add(inner);
  return { group: g, ring };
}

// ---------- obstacles ----------
export function buildSaw(r) {
  const g = new THREE.Group();
  const blade = new THREE.Group();
  const metal = lam(0xd5dbe4), red = lam(0xe8333a);
  const disc = new THREE.CylinderGeometry(r, r, 0.1, 28); disc.rotateX(Math.PI / 2);
  blade.add(mesh(disc, metal));
  const toothGeo = new THREE.ConeGeometry(0.13, 0.32, 4);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const t = mesh(toothGeo, metal, Math.cos(a) * (r + 0.1), Math.sin(a) * (r + 0.1), 0);
    t.rotation.z = a - Math.PI / 2;
    blade.add(t);
  }
  const hub = new THREE.CylinderGeometry(r * 0.32, r * 0.32, 0.16, 14); hub.rotateX(Math.PI / 2);
  blade.add(mesh(hub, red));
  blade.position.y = r * 0.75;
  g.add(blade);
  g.add(mesh(new THREE.BoxGeometry(r * 2.4, 0.1, 0.5), lam(0x333333), 0, 0.03, 0, false));
  return { group: g, blade };
}
// ---------- bosses ----------
export function buildBoss(type) {
  const model = buildSculptedRoyal(type) ?? buildSculptedCore(type) ?? buildSculptedCore('robot');
  model.normalizedAttack = true;
  return model;
}
export function boulderGeo() { return new THREE.DodecahedronGeometry(0.75); }
// nuke mushroom cloud (unit size, scaled up by the effect)
export function buildMushroom() {
  const g = new THREE.Group();
  const mk = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, depthWrite: false });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 12), mk(0xffd05a)); cap.position.y = 1.0; cap.scale.set(1.3, 0.75, 1.3); g.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.18, 10, 24), mk(0xff7a2a)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.9; g.add(ring);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 1.0, 14), mk(0xfff0c0)); stem.position.y = 0.5; g.add(stem);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.12, 24), mk(0xffa040)); base.position.y = 0.06; g.add(base);
  return g;
}

// ---------- environment ----------
export function scatter(g, geo, mat, n, minX, spreadX, zc, total, sMin = 0.7, sMax = 1.6, y = 0, cast = true) {
  const inst = new THREE.InstancedMesh(geo, mat, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    p.set(side * (minX + Math.random() ** 1.5 * spreadX), y, zc - total / 2 + Math.random() * total);
    q.setFromAxisAngle(up, Math.random() * 6.28);
    const s = sMin + Math.random() * (sMax - sMin); sc.set(s, s, s);
    m.compose(p, q, sc); inst.setMatrixAt(i, m);
  }
  inst.castShadow = cast;
  g.add(inst);
  return inst;
}
export function buildWorld(theme, len) {
  const T = THEMES[theme];
  const g = new THREE.Group();
  const total = len + 160;
  const zc = -len / 2 + 30;
  const ground = mesh(new THREE.PlaneGeometry(300, total), lam(T.ground), 0, -0.04, zc, false);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
  const road = mesh(new THREE.PlaneGeometry(15, total), lam(T.road), 0, 0, zc, false);
  road.rotation.x = -Math.PI / 2; road.receiveShadow = true; g.add(road);
  // A printed road surface gives the arena scale without another asset request.
  const surface = document.createElement('canvas'); surface.width = surface.height = 128;
  const ink = surface.getContext('2d');
  ink.fillStyle = '#' + T.road.toString(16).padStart(6, '0'); ink.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1500; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    ink.fillStyle = `rgba(${v},${v},${v},.045)`; ink.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
  }
  ink.strokeStyle = '#ffffff12'; ink.lineWidth = 1; ink.strokeRect(1, 1, 126, 126);
  const roadTexture = new THREE.CanvasTexture(surface); roadTexture.colorSpace = THREE.SRGBColorSpace;
  roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping; roadTexture.repeat.set(3, total / 5);
  road.material = new THREE.MeshStandardMaterial({ map: roadTexture, roughness: .88, metalness: .08 });
  const count = Math.ceil(total / 5), matrix = new THREE.Matrix4();
  const markings = new THREE.InstancedMesh(new THREE.PlaneGeometry(.07, 1.1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .17 }), count * 2);
  for (let i = 0; i < count; i++) for (let side = 0; side < 2; side++) {
    matrix.makeRotationX(-Math.PI / 2); matrix.setPosition(side ? 2.2 : -2.2, .015, zc - total / 2 + i * 5);
    markings.setMatrixAt(i * 2 + side, matrix);
  }
  g.add(markings);
  const glowRoad = ['neon', 'void', 'casino', 'crystal', 'blackhole'].includes(theme) || LATE_GLOW_ROAD.has(theme);
  const lineMat = new THREE.MeshBasicMaterial({ color: glowRoad ? T.rail : 0xf4f4f4 });
  for (const x of [-6.7, 6.7]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.2, total), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.01, zc); g.add(l);
  }
  // rails + posts on both sides
  const railMat = glowRoad ? new THREE.MeshBasicMaterial({ color: T.rail }) : lam(T.rail);
  const postColor = LATE_POSTS[theme] ?? (theme === 'mob' ? 0x8a8f99 : theme === 'candy' ? 0xff6ab0 : theme === 'sky' ? 0xe0c070 : 0x8a6a4a);
  for (const sx of [-1, 1]) {
    const r = mesh(new THREE.BoxGeometry(0.4, 0.75, total), railMat, sx * 7.6, 0.37, zc); r.receiveShadow = true; g.add(r);
    g.add(mesh(new THREE.BoxGeometry(0.14, 0.14, total), lam(postColor), sx * 8.2, 1.0, zc, false));
  }
  const nPost = Math.floor(total / 2.5);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), lam(postColor), nPost * 2);
  const m = new THREE.Matrix4();
  for (let i = 0; i < nPost; i++) for (let s = 0; s < 2; s++) {
    m.makeTranslation(s ? 8.2 : -8.2, 0.55, zc - total / 2 + i * 2.5);
    posts.setMatrixAt(i * 2 + s, m);
  }
  g.add(posts);

  const vc = (flat = true) => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat });
  if (theme === 'desert') {
    scatter(g, S.saguaro(), vc(false), 160, 11, 55, zc, total, 0.8, 1.5);
    scatter(g, S.rockCluster(0xc9a06a, 2), vc(false), 50, 13, 55, zc, total, 0.8, 2.2, 0, false);
    scatter(g, S.pebble(3, 0x9a8a5a), vc(false), 400, 9, 60, zc, total, 0.25, 0.5, 0, false);
  } else if (theme === 'mob') {
    // dry desert like the reference shots: tumbleweeds, dunes, dead trees
    scatter(g, S.pebble(5, 0x8a7a4a), vc(false), 700, 9, 70, zc, total, 0.5, 1.3, 0.1, false);
    const dune = new THREE.SphereGeometry(4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); dune.scale(1.8, 0.35, 1);
    scatter(g, dune, lam(0xe2c193), 50, 16, 70, zc, total, 0.8, 2.2, -0.1, false);
    scatter(g, S.deadTree(0x5a4030, .85), vc(false), 40, 10, 40, zc, total, 0.8, 1.6);
  } else if (theme === 'lava') {
    scatter(g, S.rockCluster(0x2b2025, 4, { accent: 0xff6a1a, accentDepth: .9 }), vc(false), 260, 11, 55, zc, total, 0.6, 1.5, 0, false);
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff5a1a });
    for (const sx of [-1, 1]) {
      const lv = new THREE.Mesh(new THREE.PlaneGeometry(5, total), lavaMat); lv.rotation.x = -Math.PI / 2; lv.position.set(sx * 12.5, 0.0, zc); g.add(lv);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, total), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.25, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2; glow.position.set(sx * 12.5, 0.02, zc); g.add(glow);
    }
  } else if (theme === 'frost') {
    scatter(g, S.pine(true), vc(false), 200, 11, 55, zc, total, 0.7, 1.4);
    scatter(g, S.crystalCluster(0x9fe6ff, 2, 0xdfe9f5), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x123a52 }), 120, 9.5, 40, zc, total, 0.4, 0.9, 0, false);
  } else if (theme === 'jungle') {
    scatter(g, S.palm({ trunk: 0x7a5a32, leaf: 0x3fb84a, leaf2: 0x2f9a3a }), vc(false), 170, 11, 55, zc, total, 0.7, 1.3);
    scatter(g, S.bush(), vc(false), 200, 9, 50, zc, total, 0.6, 1.4, 0, false);
  } else if (theme === 'neon') {
    const bld = paint(new THREE.BoxGeometry(3, 1, 3), 0x1a1a3a); bld.translate(0, 0.5, 0);
    const inst = scatter(g, bld, vc(), 120, 12, 45, zc, total, 1, 1, 0, false);
    const win = new THREE.InstancedMesh(new THREE.BoxGeometry(3.05, 0.25, 3.05), new THREE.MeshBasicMaterial({ color: 0xffffff }), 120 * 3);
    const mm = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    const cols = [0xff2fd0, 0x3afff0, 0xffe03a, 0x8a5aff].map((c) => new THREE.Color(c));
    for (let i = 0; i < 120; i++) {
      inst.getMatrixAt(i, mm); mm.decompose(p, q, s);
      const h = 4 + Math.random() * 18;
      s.set(1, h, 1); mm.compose(p, q, s); inst.setMatrixAt(i, mm);
      for (let k = 0; k < 3; k++) {
        const y = h * (0.3 + k * 0.25);
        mm.compose(new THREE.Vector3(p.x, y, p.z), q, new THREE.Vector3(1, 1, 1));
        win.setMatrixAt(i * 3 + k, mm);
        win.setColorAt(i * 3 + k, cols[(i + k) % 4]);
      }
    }
    g.add(win);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x3afff0 });
    const lamp = new THREE.CylinderGeometry(0.08, 0.08, 4, 6); lamp.translate(0, 2, 0);
    const lamps = new THREE.InstancedMesh(lamp, lampMat, 60);
    for (let i = 0; i < 60; i++) { mm.makeTranslation(i % 2 ? 9 : -9, 0, zc - total / 2 + (i >> 1) * (total / 30)); lamps.setMatrixAt(i, mm); }
    g.add(lamps);
  } else if (theme === 'candy') {
    scatter(g, S.lollipop(0xff4f9a), vc(false), 80, 11, 50, zc, total, 0.8, 1.8);
    scatter(g, S.lollipop(0x8a5aff), vc(false), 60, 11, 50, zc, total, 0.8, 1.6);
    scatter(g, S.candyCane(), vc(false), 60, 10, 45, zc, total, 0.8, 1.4);
    [0x3ad0ff, 0xffe03a, 0x7aff5a, 0xb06aff].forEach(c => scatter(g, S.gumdrop(c), vc(false), 70, 9, 55, zc, total, 0.6, 1.4, 0, false));
  } else if (theme === 'moon') {
    scatter(g, S.crater(), vc(false), 120, 10, 55, zc, total, 0.6, 2.4, 0, false);
    scatter(g, S.rockCluster(0x6a6a7a, 6), vc(false), 180, 9, 55, zc, total, 0.3, 1.0, 0, false);
    const starGeo = new THREE.BufferGeometry();
    const pts = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) { pts[i * 3] = (Math.random() - 0.5) * 400; pts[i * 3 + 1] = 30 + Math.random() * 120; pts[i * 3 + 2] = zc - 60 - Math.random() * 200; }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    g.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, fog: false })));
    const earth = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 16), new THREE.MeshBasicMaterial({ color: 0x3a8aff, fog: false }));
    earth.position.set(-45, 55, zc - 160); g.add(earth);
    const land = new THREE.Mesh(new THREE.SphereGeometry(14.2, 12, 8, 0, 2, 0.6, 1.2), new THREE.MeshBasicMaterial({ color: 0x4ad06a, fog: false }));
    land.position.copy(earth.position); g.add(land);
  } else if (theme === 'sky') {
    const puff = [];
    for (let k = 0; k < 4; k++) { const s = paint(new THREE.SphereGeometry(1.2 - k * 0.15, 10, 8), 0xffffff); s.translate((k - 1.5) * 1.1, 0.3 + (k % 2) * 0.4, (k % 2) * 0.5); puff.push(s); }
    scatter(g, merge(puff), vc(false), 160, 10, 60, zc, total, 1, 2.6, -0.4, false);
    scatter(g, S.column(), vc(false), 40, 9.5, 8, zc, total, 0.9, 1.1);
  } else if (theme === 'void') {
    scatter(g, S.crystalCluster(0xb04aff, 7, 0x2a0a3a), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x3a0a6a }), 200, 9.5, 55, zc, total, 0.5, 1.4);
    scatter(g, S.floatingShard(0xff3a8a), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x5a0a3a }), 120, 12, 55, zc, total, 0.5, 1.8, 3.5, false);
    const starGeo = new THREE.BufferGeometry();
    const pts = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) { pts[i * 3] = (Math.random() - 0.5) * 400; pts[i * 3 + 1] = 20 + Math.random() * 120; pts[i * 3 + 2] = zc - 60 - Math.random() * 200; }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    g.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xff9af0, size: 0.9, fog: false })));
  }
  return g;
}

export function buildStartLine() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 16;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#1b1b1b' : '#ffcc1a'; ctx.beginPath(); ctx.moveTo(i * 16, 16); ctx.lineTo(i * 16 + 8, 0); ctx.lineTo(i * 16 + 24, 0); ctx.lineTo(i * 16 + 16, 16); ctx.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(14.8, 0.6), new THREE.MeshBasicMaterial({ map: tex }));
  m.rotation.x = -Math.PI / 2;
  return m;
}
