import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';
import { THEMES } from './levels.js';
import { troopGeometry, weaponGeometry } from './unit-assets.js';
import { createVehicleRig, cannonBarrelGeometry } from './vehicle-assets.js';
import { buildCoreBoss } from './boss-assets-core.js';

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
export function blueUnitGeo(detail = 'high') {
  return troopGeometry(false, detail);
}

// Separate instanced overlays keep weapons visible without adding a draw call per troop.
export function troopWeaponGeo(kind) {
  const geometry = weaponGeometry(kind);
  geometry.userData.shared = false;
  return geometry;
}
export function redUnitGeo(detail = 'high') {
  return troopGeometry(true, detail);
}
export function bombGeo() {
  const b = new THREE.SphereGeometry(0.2, 10, 8); b.translate(0, 1.18, 0); paint(b, 0x222222);
  const f = new THREE.CylinderGeometry(0.03, 0.03, 0.18, 5); f.translate(0, 1.44, 0); paint(f, 0xffaa22);
  const s = new THREE.SphereGeometry(0.06, 6, 4); s.translate(0, 1.55, 0); paint(s, 0xffee55);
  return merge([b, f, s]);
}
export function shieldGeo() {
  const s = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 14); s.rotateX(Math.PI / 2); s.translate(0, 0.48, 0.36); paint(s, 0xc9d3e0);
  const r = new THREE.TorusGeometry(0.42, 0.05, 6, 16); r.translate(0, 0.48, 0.4); paint(r, 0x8a6a2a);
  const b = new THREE.SphereGeometry(0.1, 8, 6); b.translate(0, 0.48, 0.42); paint(b, 0xffcc33);
  return merge([s, r, b]);
}
// tank helmet / splitter spikes ride on top of the red body like the bomb does
export function helmetGeo() {
  const h = new THREE.SphereGeometry(0.33, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); h.translate(0, 0.84, 0); paint(h, 0x4a4f5a);
  const v = new THREE.BoxGeometry(0.5, 0.08, 0.12); v.translate(0, 0.84, 0.27); paint(v, 0x22252c);
  const s = new THREE.ConeGeometry(0.07, 0.25, 6); s.translate(0, 1.22, 0); paint(s, 0x9aa0aa);
  return merge([h, v, s]);
}
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
  const dark = lam(0x2b2f3a), blue = lam(tint), black = lam(0x15161a), red = lam(0xe8333a);
  base.add(mesh(new THREE.BoxGeometry(1.5, 0.38, 1.7), dark, 0, 0.42, 0));
  base.add(mesh(new THREE.BoxGeometry(1.56, 0.12, 1.76), red, 0, 0.6, 0));
  const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.3, 12); wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.BoxGeometry(0.32, 0.5, 0.12);
  const wheels = [];
  for (const x of [-0.82, 0.82]) for (const z of [-0.55, 0.55]) {
    const w = mesh(wheelGeo, black, x, 0.33, z);
    w.add(mesh(hubGeo, red, 0, 0, 0, false));
    base.add(w); wheels.push(w);
  }
  const body = mesh(new THREE.SphereGeometry(0.66, 20, 14), blue, 0, 1.1, 0.1);
  body.scale.set(1, 0.9, 1.05);
  base.add(body);
  const barrels = new THREE.Group(); barrels.position.set(0, 1.1, -0.2); g.add(barrels);
  const barrelGeo = cannonBarrelGeometry(tint), barrelMaterial = lam(0xffffff, { vertexColors: true });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xbff3ff, transparent: true, opacity: 0.55, emissive: 0x3aa0c0 }));
  dome.position.set(0, 1.55, 0.2); base.add(dome);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xaef6ff });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), glowMat);
  glow.position.set(0, 1.6, 0.2); g.add(glow);
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
  return { group: g, setBarrels, setChassis, animateVehicle, rig, barrels, glow, glowMat, bodyMat: blue, wheels, shield };
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
export function buildGate(w, hex, mega = false) {
  const g = new THREE.Group();
  const H = mega ? 2.5 : 2.0;
  const frameMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(hex).multiplyScalar(0.55) });
  const postGeo = new THREE.BoxGeometry(0.26, H, 0.26);
  g.add(mesh(postGeo, frameMat, -w / 2, H / 2, 0), mesh(postGeo, frameMat, w / 2, H / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(w + 0.26, 0.26, 0.26), frameMat, 0, H, 0));
  g.add(mesh(new THREE.BoxGeometry(w + 0.26, 0.1, 0.26), frameMat, 0, 0.05, 0, false));
  const panelMat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, H - 0.13), panelMat);
  panel.position.y = (H - 0.13) / 2 + 0.05;
  g.add(panel);
  // moving shine stripe (one shared texture animates every gate)
  const shine = new THREE.Mesh(panel.geometry, new THREE.MeshBasicMaterial({ map: shineTexture(), transparent: true, opacity: mega ? 0.55 : 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
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
    setColor(c) { panelMat.color.set(c); frameMat.color.set(c).multiplyScalar(0.55); },
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
  const panelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, color: 0xdde4ee });
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
  const panelMat = new THREE.MeshBasicMaterial({ color: inner, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r - 0.08, 32), panelMat);
  disc.position.y = r + 0.25; g.add(disc);
  const swirl = new THREE.Mesh(new THREE.RingGeometry(r * 0.25, r * 0.75, 3, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
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
export function buildWall(len) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.34, 0.9, len), lam(0xe4e8ee), 0, 0.45, 0));
  g.add(mesh(new THREE.BoxGeometry(0.38, 0.14, len), lam(0xffc61a), 0, 0.92, 0, false));
  return g;
}
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
export function buildSpawner(style = 'igloo') {
  const g = new THREE.Group();
  if (style === 'dome') {
    const gold = lam(0xffc21a, { emissive: 0x442800 }), red = lam(0xe8263a);
    g.add(mesh(new THREE.SphereGeometry(1.6, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), gold, 0, 0, 0));
    { const _m = mesh(new THREE.TorusGeometry(1.6, 0.14, 8, 28), red, 0, 0.05, 0); _m.rotation.x = Math.PI / 2; g.add(_m); }
    const star = new THREE.Shape();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? 0.28 : 0.62;
      if (k) star.lineTo(Math.cos(a) * rr, -Math.sin(a) * rr); else star.moveTo(Math.cos(a) * rr, -Math.sin(a) * rr);
    }
    const st = mesh(new THREE.ShapeGeometry(star), red, 0, 0.95, 1.31, false);
    st.rotation.x = -0.65; g.add(st);
    return { group: g };
  }
  const dome = mesh(new THREE.SphereGeometry(1.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), lam(0xe9f3ff), 0, 0, 0);
  g.add(dome);
  const door = mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.2, 12, 1, false, 0, Math.PI), lam(0xc0283a), 0, 0.5, 1.2);
  door.rotation.y = -Math.PI / 2;
  g.add(door);
  g.add(mesh(new THREE.ConeGeometry(0.25, 0.8, 4), lam(0xc0283a), 0, 1.8, 0));
  return { group: g };
}
export function buildTurret() {
  const g = new THREE.Group();
  const dark = lam(0x2a2d38), red = lam(0xe8263a), metal = lam(0x8a90a0);
  g.add(mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.8, 12), dark, 0, 0.4, 0));
  const head = new THREE.Group(); head.position.y = 1.2; g.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.7, 14, 10), metal));
  const barrel = new THREE.CylinderGeometry(0.14, 0.18, 1.3, 10); barrel.rotateX(Math.PI / 2); barrel.translate(0, 0, 0.75);
  head.add(mesh(barrel, dark));
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2a3a }));
  eye.position.set(0, 0.25, 0.55); head.add(eye);
  { const _m = mesh(new THREE.TorusGeometry(1.05, 0.08, 6, 20), red, 0, 0.82, 0); _m.rotation.x = Math.PI / 2; g.add(_m); }
  return { group: g, head, eye };
}
export function buildCrusher(w) {
  const g = new THREE.Group();
  const metal = lam(0x6a707c), dark = lam(0x2a2d34);
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.4, 5.2, 0.6), metal, sx * (w / 2 + 0.2), 2.6, 0));
  g.add(mesh(new THREE.BoxGeometry(w + 0.8, 0.4, 0.7), dark, 0, 5.2, 0));
  const block = new THREE.Group(); g.add(block);
  block.add(mesh(new THREE.BoxGeometry(w - 0.1, 1.4, 1.6), metal, 0, 0.7, 0));
  // hazard stripes
  const c = document.createElement('canvas'); c.width = 128; c.height = 16;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#1b1b1b' : '#ffcc1a'; ctx.beginPath(); ctx.moveTo(i * 16, 16); ctx.lineTo(i * 16 + 8, 0); ctx.lineTo(i * 16 + 24, 0); ctx.lineTo(i * 16 + 16, 16); ctx.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, 0.35), new THREE.MeshBasicMaterial({ map: tex }));
  stripe.position.set(0, 0.25, 0.81); block.add(stripe);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.6), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.0, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.04; g.add(shadow);
  return { group: g, block, shadow };
}

// ---------- enemy fort ----------
export function buildTower(theme) {
  const T = THEMES[theme];
  const g = new THREE.Group();
  const wall = lam(T.tower), roof = lam(T.roof), dark = lam(0x2a0d10), flag = lam(0xff2a3a);
  g.add(mesh(new THREE.BoxGeometry(14.6, 2.6, 1.8), wall, 0, 1.3, 0));
  const cren = new THREE.BoxGeometry(0.7, 0.55, 1.8);
  for (let x = -6.6; x <= 6.61; x += 1.2) g.add(mesh(cren, wall, x, 2.85, 0));
  g.add(mesh(new THREE.BoxGeometry(3.2, 1.9, 1.9), dark, 0, 0.95, 0.02, false));
  for (const sx of [-1, 1]) {
    g.add(mesh(new THREE.CylinderGeometry(1.3, 1.5, 5, 10), wall, sx * 7.0, 2.5, -0.3));
    g.add(mesh(new THREE.ConeGeometry(1.7, 2.0, 10), roof, sx * 7.0, 6.0, -0.3));
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5), dark, sx * 7.0, 7.6, -0.3));
    const f = mesh(new THREE.BoxGeometry(0.9, 0.55, 0.04), flag, sx * 7.0 + 0.45, 8.1, -0.3);
    g.add(f);
  }
  const em = mesh(new THREE.CircleGeometry(0.75, 20), lam(0xffc21a), 0, 2.35, 0.92, false);
  g.add(em);
  return { group: g };
}

// ---------- bosses ----------
export function buildBoss(type) {
  const model = buildCoreBoss(type);
  if (model) { model.normalizedAttack = true; return model; }
  switch (type) {
    case 'king': return buildKing({});
    case 'jelly': return buildKing({ body: 0xff4fb0, belly: 0x7af0ff, crown: 0xfff04d, horn: 0x7af0ff, emissive: 0x5a0a3a });
    case 'skeleton': return buildSkeleton({});
    case 'titan': return buildSkeleton({ bone: 0xe0d0ff, emissive: 0x9a2aff, eye: 0xff3af0, light: 0xb04aff, crown: true, scale: 1.75, height: 13.5, radius: 3.4 });
    case 'golem': return buildGolem({});
    case 'moon': return buildGolem({ rock: 0xa0a0b4, dark: 0x6a6a80, crystal: 0xe08aff, cEm: 0x6a1a9a, eye: 0xff5af0 });
    case 'dragon': return buildDragon({});
    case 'storm': return buildDragon({ body: 0x2f6aff, belly: 0xbfe8ff, wing: 0x1a3aa0, horn: 0xffffff, eye: 0xfff04d, light: 0x6ad0ff });
    case 'brute': return buildBruteBoss();
    default: return buildRobot();
  }
}
export function buildKing(o) {
  const g = new THREE.Group();
  const red = lam(o.body ?? 0xe8262b, o.emissive ? { emissive: o.emissive } : {}), yellow = lam(o.belly ?? 0xffc21a), gold = lam(o.crown ?? 0xffd84d, { emissive: 0x553300 });
  const hornMat = lam(o.horn ?? 0xffc21a), white = lam(0xffffff), black = lam(0x140404);
  const body = mesh(new THREE.CapsuleGeometry(1.5, 1.4, 6, 16), red, 0, 2.5, 0); g.add(body);
  const belly = mesh(new THREE.SphereGeometry(1.15, 16, 12), yellow, 0, 2.2, 0.75); belly.scale.z = 0.55; g.add(belly);
  const head = new THREE.Group(); head.position.y = 4.55; g.add(head);
  head.add(mesh(new THREE.SphereGeometry(1.05, 18, 14), red));
  for (const sx of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(0.26, 10, 8), white, sx * 0.38, 0.12, 0.88));
    head.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), black, sx * 0.38, 0.1, 1.1));
    const brow = mesh(new THREE.BoxGeometry(0.5, 0.12, 0.12), black, sx * 0.38, 0.45, 0.95); brow.rotation.z = sx * -0.45; head.add(brow);
    const horn = mesh(new THREE.ConeGeometry(0.2, 0.7, 8), hornMat, sx * 0.75, 0.75, 0); horn.rotation.z = -sx * 0.6; head.add(horn);
  }
  head.add(mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.45, 10), gold, 0, 1.05, 0));
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; head.add(mesh(new THREE.ConeGeometry(0.15, 0.45, 6), gold, Math.cos(a) * 0.55, 1.45, Math.sin(a) * 0.55)); }
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sx * 1.75, 3.4, 0); g.add(arm);
    arm.add(mesh(new THREE.CapsuleGeometry(0.48, 1.2, 4, 10), red, 0, -0.9, 0));
    arm.add(mesh(new THREE.SphereGeometry(0.72, 12, 10), yellow, 0, -2.0, 0.1));
    arm.rotation.z = sx * 0.35;
    arms.push(arm);
  }
  for (const sx of [-1, 1]) g.add(mesh(new THREE.CapsuleGeometry(0.55, 0.6, 4, 10), red, sx * 0.75, 0.6, 0));
  g.scale.setScalar(1.35);
  return {
    group: g, radius: 2.8, height: 8.8,
    animate(t, atk) {
      body.scale.y = 1 + Math.sin(t * 3) * 0.03;
      arms[0].rotation.x = Math.sin(t * 2.5) * 0.5 - atk * 1.8;
      arms[1].rotation.x = -Math.sin(t * 2.5) * 0.5 - atk * 1.8;
      g.position.y = Math.sin(Math.min(1, atk) * Math.PI) * 2.6;
    },
  };
}
export function buildSkeleton(o) {
  const g = new THREE.Group();
  const bone = new THREE.MeshLambertMaterial({ color: o.bone ?? 0xffe2b8, emissive: o.emissive ?? 0xff5a00, emissiveIntensity: 0.55 });
  const black = lam(0x120400);
  const eye = new THREE.MeshBasicMaterial({ color: o.eye ?? 0xffd23a });
  for (let i = 0; i < 9; i++) g.add(mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.45, 8), bone, 0, 0.3 + i * 0.55, -0.4));
  for (let k = 0; k < 6; k++) {
    const r = 1.55 - Math.abs(k - 2) * 0.12;
    const rib = mesh(new THREE.TorusGeometry(r, 0.13, 6, 18, Math.PI * 1.5), bone, 0, 2.2 + k * 0.48, 0.25);
    rib.rotation.x = Math.PI / 2; rib.rotation.z = -Math.PI * 0.25 + Math.PI;
    rib.scale.set(1, 0.75, 1);
    g.add(rib);
  }
  const head = new THREE.Group(); head.position.set(0, 6.2, 0); g.add(head);
  const skull = mesh(new THREE.SphereGeometry(1.15, 18, 14), bone); skull.scale.set(1, 1.1, 1); head.add(skull);
  const jaw = mesh(new THREE.BoxGeometry(1.2, 0.4, 1.0), bone, 0, -1.05, 0.35); head.add(jaw);
  for (const sx of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(0.33, 10, 8), black, sx * 0.42, 0.05, 0.86));
    head.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), eye, sx * 0.42, 0.05, 1.08, false));
  }
  head.add(mesh(new THREE.ConeGeometry(0.16, 0.3, 3), black, 0, -0.42, 1.05));
  if (o.crown) {
    const gold = lam(0xffd84d, { emissive: 0x6a3a00 });
    head.add(mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.5, 12), gold, 0, 1.15, 0));
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; head.add(mesh(new THREE.ConeGeometry(0.17, 0.7, 6), gold, Math.cos(a) * 0.75, 1.7, Math.sin(a) * 0.75)); }
  }
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 1.7, 4.9, -0.2); g.add(sh);
    sh.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.6, 8), bone, 0, 1.3, 0));
    const el = new THREE.Group(); el.position.y = 2.6; sh.add(el);
    el.add(mesh(new THREE.SphereGeometry(0.28, 8, 6), bone));
    el.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.4, 8), bone, 0, 1.2, 0));
    for (let f = -1; f <= 1; f++) el.add(mesh(new THREE.ConeGeometry(0.1, 0.6, 5), bone, f * 0.18, 2.6, 0));
    sh.rotation.z = -sx * 0.55; el.rotation.z = sx * 0.7;
    arms.push({ sh, el, sx });
  }
  const light = new THREE.PointLight(o.light ?? 0xff6a1a, 30, 14, 1.6); light.position.set(0, 4, 2); g.add(light);
  g.scale.setScalar(o.scale ?? 1.35);
  return {
    group: g, radius: o.radius ?? 2.7, height: o.height ?? 10.5,
    animate(t, atk) {
      bone.emissiveIntensity = 0.45 + Math.sin(t * 13) * 0.12 + Math.sin(t * 7.3) * 0.1 + atk * 0.6;
      head.rotation.x = -atk * 0.5 + Math.sin(t * 1.7) * 0.05;
      jaw.position.y = -1.05 - atk * 0.35;
      for (const a of arms) a.sh.rotation.x = Math.sin(t * 1.4 + a.sx) * 0.15 - atk * 0.9;
      light.intensity = 25 + Math.sin(t * 11) * 6 + atk * 30;
    },
  };
}
export function buildGolem(o) {
  const g = new THREE.Group();
  const rock = lam(o.rock ?? 0x8fb4d6, { flatShading: true }), rockDark = lam(o.dark ?? 0x6a8db4, { flatShading: true });
  const ice = lam(o.crystal ?? 0xc8f2ff, { flatShading: true, emissive: o.cEm ?? 0x2a6a90 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: o.eye ?? 0x6af6ff });
  const body = mesh(new THREE.DodecahedronGeometry(1.9), rock, 0, 3.3, 0); body.scale.set(1.25, 1.05, 0.95); g.add(body);
  g.add(mesh(new THREE.DodecahedronGeometry(1.0), rockDark, 0, 1.6, 0.2));
  const head = new THREE.Group(); head.position.set(0, 5.6, 0.4); g.add(head);
  head.add(mesh(new THREE.DodecahedronGeometry(0.95), rock));
  for (const sx of [-1, 1]) head.add(mesh(new THREE.BoxGeometry(0.32, 0.14, 0.1), eyeMat, sx * 0.35, 0.05, 0.85, false));
  for (let k = 0; k < 5; k++) { const c = mesh(new THREE.OctahedronGeometry(0.45), ice, (k - 2) * 0.7, 4.9 + Math.abs(k - 2) * -0.2, -0.9); c.scale.y = 2; c.rotation.z = (k - 2) * 0.25; g.add(c); }
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sx * 2.4, 4.3, 0); g.add(arm);
    arm.add(mesh(new THREE.DodecahedronGeometry(0.85), rockDark, 0, 0, 0));
    arm.add(mesh(new THREE.DodecahedronGeometry(0.7), rock, 0, -1.3, 0.1));
    arm.add(mesh(new THREE.DodecahedronGeometry(0.9), rockDark, 0, -2.5, 0.2));
    arms.push(arm);
  }
  for (const sx of [-1, 1]) g.add(mesh(new THREE.DodecahedronGeometry(0.9), rockDark, sx * 1.1, 0.8, 0));
  g.scale.setScalar(1.3);
  return {
    group: g, radius: 3.0, height: 9.2,
    animate(t, atk) {
      body.rotation.y = Math.sin(t * 1.2) * 0.08;
      arms[0].rotation.x = Math.sin(t * 2) * 0.3;
      arms[1].rotation.x = -Math.sin(t * 2) * 0.3 - atk * 2.6;
      head.rotation.y = Math.sin(t * 0.9) * 0.2;
    },
  };
}
export function buildDragon(o) {
  const g = new THREE.Group();
  const body = lam(o.body ?? 0xc8202a, { flatShading: true }), belly = lam(o.belly ?? 0xffb23a), wingMat = new THREE.MeshLambertMaterial({ color: o.wing ?? 0x7a0d1a, side: THREE.DoubleSide });
  const horn = lam(o.horn ?? 0x2a1a1a), eye = new THREE.MeshBasicMaterial({ color: o.eye ?? 0xfff04d });
  const torso = mesh(new THREE.SphereGeometry(1.7, 16, 12), body, 0, 2.6, 0); torso.scale.set(1, 1.2, 1); g.add(torso);
  const bel = mesh(new THREE.SphereGeometry(1.25, 14, 10), belly, 0, 2.4, 0.75); bel.scale.set(0.95, 1.2, 0.6); g.add(bel);
  for (const sx of [-1, 1]) {
    g.add(mesh(new THREE.CapsuleGeometry(0.5, 0.8, 4, 10), body, sx * 1.0, 0.8, 0.2));
    { const _m = mesh(new THREE.ConeGeometry(0.18, 0.5, 6), horn, sx * 1.0, 0.1, 0.75); _m.rotation.x = Math.PI / 2; g.add(_m); }
  }
  const neck = new THREE.Group(); neck.position.set(0, 4.0, 0.2); g.add(neck);
  for (let k = 0; k < 4; k++) neck.add(mesh(new THREE.SphereGeometry(0.62 - k * 0.04, 12, 10), k % 2 ? belly : body, 0, k * 0.55, k * 0.18));
  const head = new THREE.Group(); head.position.set(0, 2.5, 0.75); neck.add(head);
  head.add(mesh(new THREE.BoxGeometry(1.3, 0.95, 1.3), body));
  const snout = mesh(new THREE.BoxGeometry(0.95, 0.55, 1.1), body, 0, -0.15, 1.0); head.add(snout);
  const jaw = mesh(new THREE.BoxGeometry(0.9, 0.22, 1.0), belly, 0, -0.5, 0.95); head.add(jaw);
  for (const sx of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), eye, sx * 0.42, 0.22, 0.62, false));
    const h = mesh(new THREE.ConeGeometry(0.16, 0.9, 6), horn, sx * 0.4, 0.75, -0.35); h.rotation.x = -0.7; head.add(h);
  }
  const wings = [];
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.lineTo(3.8, 1.8); wingShape.lineTo(3.4, -0.6); wingShape.lineTo(2.4, -0.2); wingShape.lineTo(1.8, -1.2); wingShape.lineTo(0.9, -0.5); wingShape.lineTo(0, -1.4);
  const wingGeo = new THREE.ShapeGeometry(wingShape);
  for (const sx of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sx * 1.2, 3.6, -0.5); g.add(w);
    const m = new THREE.Mesh(wingGeo, wingMat); m.castShadow = true; m.scale.x = sx; w.add(m);
    wings.push({ w, sx });
  }
  const tail = new THREE.Group(); tail.position.set(0, 1.2, -1.2); g.add(tail);
  for (let k = 0; k < 5; k++) tail.add(mesh(new THREE.SphereGeometry(0.5 - k * 0.08, 10, 8), body, Math.sin(k) * 0.3, 0, -k * 0.6));
  const light = new THREE.PointLight(o.light ?? 0xff7a1a, 25, 14, 1.6); light.position.set(0, 5, 2.5); g.add(light);
  g.scale.setScalar(1.45);
  return {
    group: g, radius: 2.9, height: 10.4,
    animate(t, atk) {
      for (const w of wings) w.w.rotation.y = w.sx * (Math.sin(t * 3) * 0.35 - 0.2);
      for (const w of wings) w.w.rotation.z = w.sx * (Math.sin(t * 3) * 0.25);
      neck.rotation.x = Math.sin(t * 1.3) * 0.08 + atk * 0.5;
      jaw.position.y = -0.5 - atk * 0.35;
      tail.rotation.y = Math.sin(t * 2) * 0.5;
      light.intensity = 18 + atk * 50 + Math.sin(t * 9) * 4;
    },
  };
}
function buildBruteBoss() {
  const g = new THREE.Group();
  const yellow = lam(0xffc21a), red = lam(0xe8262b), dark = lam(0x2a1206), white = lam(0xffffff);
  const torso = mesh(new THREE.SphereGeometry(2.0, 18, 14), yellow, 0, 3.0, 0); torso.scale.set(1.25, 1, 0.9); g.add(torso);
  { const _m = mesh(new THREE.SphereGeometry(1.2, 14, 10), red, 0, 3.4, 1.05); _m.scale.set(1.3, 0.8, 0.5); g.add(_m); }
  const head = new THREE.Group(); head.position.set(0, 5.0, 0.6); g.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.9, 16, 12), yellow));
  head.add(mesh(new THREE.BoxGeometry(1.7, 0.25, 0.3), red, 0, 0.35, 0.72));
  for (const sx of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(0.2, 8, 6), white, sx * 0.33, 0.05, 0.78));
    head.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), dark, sx * 0.33, 0.05, 0.95));
  }
  head.add(mesh(new THREE.BoxGeometry(0.7, 0.18, 0.2), dark, 0, -0.38, 0.8));
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sx * 2.4, 4.0, 0); g.add(arm);
    arm.add(mesh(new THREE.SphereGeometry(1.0, 14, 10), yellow, 0, 0, 0));
    arm.add(mesh(new THREE.CapsuleGeometry(0.7, 1.4, 4, 10), yellow, sx * 0.3, -1.4, 0.2));
    arm.add(mesh(new THREE.SphereGeometry(1.1, 14, 10), red, sx * 0.4, -2.9, 0.4));
    arms.push(arm);
  }
  for (const sx of [-1, 1]) g.add(mesh(new THREE.CapsuleGeometry(0.75, 0.7, 4, 10), yellow, sx * 1.0, 0.9, 0));
  g.scale.setScalar(1.4);
  return {
    group: g, radius: 3.2, height: 9.4,
    animate(t, atk) {
      torso.scale.y = 1 + Math.sin(t * 4) * 0.04;
      arms[0].rotation.x = Math.sin(t * 3) * 0.3 - atk * 2.2;
      arms[1].rotation.x = -Math.sin(t * 3) * 0.3 - atk * 2.2;
      head.rotation.z = Math.sin(t * 2) * 0.1;
      g.position.y = Math.sin(Math.min(1, atk) * Math.PI) * 1.5;
    },
  };
}
function buildRobot() {
  const g = new THREE.Group();
  const steel = lam(0x8a94a8, { flatShading: true }), dark = lam(0x2a2f3a), pink = lam(0xff2fd0, { emissive: 0x7a0a5a });
  const visor = new THREE.MeshBasicMaterial({ color: 0x3afff0 });
  for (const sx of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(0.9, 2.2, 1.1), dark, sx * 1.0, 1.1, 0));
    g.add(mesh(new THREE.BoxGeometry(1.2, 0.5, 1.6), steel, sx * 1.0, 0.25, 0.2));
  }
  const torso = new THREE.Group(); torso.position.y = 2.2; g.add(torso);
  torso.add(mesh(new THREE.BoxGeometry(3.4, 2.6, 2.0), steel, 0, 1.3, 0));
  torso.add(mesh(new THREE.BoxGeometry(2.0, 1.0, 0.2), pink, 0, 1.4, 1.05));
  const head = new THREE.Group(); head.position.y = 3.1; torso.add(head);
  head.add(mesh(new THREE.BoxGeometry(1.5, 1.0, 1.3), steel));
  head.add(mesh(new THREE.BoxGeometry(1.2, 0.3, 0.1), visor, 0, 0.05, 0.68, false));
  head.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 5), dark, 0.5, 0.9, 0));
  head.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), pink, 0.5, 1.35, 0));
  const guns = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 2.2, 2.2, 0); torso.add(sh);
    sh.add(mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), dark));
    const barrel = new THREE.CylinderGeometry(0.28, 0.35, 2.0, 10); barrel.rotateX(Math.PI / 2); barrel.translate(0, 0, 1.0);
    sh.add(mesh(barrel, steel));
    sh.add(mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 14), pink, 0, 0, 2.0));
    const arm = mesh(new THREE.BoxGeometry(0.7, 2.0, 0.7), steel, sx * 0.1, -1.5, 0.2); sh.add(arm);
    guns.push(sh);
  }
  const light = new THREE.PointLight(0x3afff0, 18, 12, 1.6); light.position.set(0, 5, 2); g.add(light);
  g.scale.setScalar(1.45);
  return {
    group: g, radius: 3.0, height: 9.8,
    animate(t, atk) {
      torso.position.y = 2.2 + Math.abs(Math.sin(t * 3)) * 0.12;
      torso.rotation.y = Math.sin(t * 0.8) * 0.15;
      for (const s of guns) s.rotation.x = -0.15 - atk * 0.35 + Math.sin(t * 2) * 0.05;
      head.rotation.y = Math.sin(t * 1.4) * 0.3;
      visor.color.setHSL(0.48 + atk * 0.5, 1, 0.55);
    },
  };
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
  const glowRoad = ['neon', 'void', 'casino', 'crystal', 'blackhole'].includes(theme);
  const lineMat = new THREE.MeshBasicMaterial({ color: glowRoad ? T.rail : 0xf4f4f4 });
  for (const x of [-6.7, 6.7]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.2, total), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.01, zc); g.add(l);
  }
  // rails + posts on both sides
  const railMat = glowRoad ? new THREE.MeshBasicMaterial({ color: T.rail }) : lam(T.rail);
  const postColor = theme === 'mob' ? 0x8a8f99 : theme === 'candy' ? 0xff6ab0 : theme === 'sky' ? 0xe0c070 : 0x8a6a4a;
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
    const trunk = paint(new THREE.CylinderGeometry(0.35, 0.4, 2.4, 8), 0x4f9a3a); trunk.translate(0, 1.2, 0);
    const a1 = paint(new THREE.CylinderGeometry(0.22, 0.22, 1.0, 6), 0x5aa844); a1.translate(0.55, 1.5, 0);
    const a2 = paint(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 6), 0x5aa844); a2.translate(-0.5, 1.2, 0);
    const c1 = paint(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 6), 0x5aa844); c1.rotateZ(Math.PI / 2); c1.translate(0.3, 1.0, 0);
    scatter(g, merge([trunk, a1, a2, c1]), vc(false), 260, 11, 55, zc, total);
    scatter(g, new THREE.IcosahedronGeometry(0.35, 0), lam(0x9a8a4a, { flatShading: true }), 400, 9, 60, zc, total, 0.6, 1.4, 0.1, false);
  } else if (theme === 'mob') {
    // dry desert like the reference shots: tumbleweeds, dunes, dead trees
    scatter(g, new THREE.IcosahedronGeometry(0.3, 0), lam(0x8a7a4a, { flatShading: true }), 700, 9, 70, zc, total, 0.5, 1.3, 0.1, false);
    const dune = new THREE.SphereGeometry(4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); dune.scale(1.8, 0.35, 1);
    scatter(g, dune, lam(0xe2c193), 50, 16, 70, zc, total, 0.8, 2.2, -0.1, false);
    const tr = paint(new THREE.CylinderGeometry(0.08, 0.12, 1.6, 5), 0x5a4030); tr.translate(0, 0.8, 0);
    const b1 = paint(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 4), 0x5a4030); b1.rotateZ(0.8); b1.translate(0.3, 1.3, 0);
    const b2 = paint(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 4), 0x5a4030); b2.rotateZ(-0.7); b2.translate(-0.28, 1.1, 0);
    scatter(g, merge([tr, b1, b2]), vc(), 40, 10, 40, zc, total, 0.8, 1.6);
  } else if (theme === 'lava') {
    const r1 = paint(new THREE.DodecahedronGeometry(1.0), 0x2b2025); r1.scale(1, 0.7, 1); r1.translate(0, 0.4, 0);
    const s1 = paint(new THREE.ConeGeometry(0.35, 1.8, 5), 0x1a1216); s1.translate(0.6, 1.1, 0.2);
    const g1 = paint(new THREE.OctahedronGeometry(0.25), 0xff7a2a); g1.translate(-0.4, 0.9, 0.3);
    scatter(g, merge([r1, s1, g1]), vc(), 260, 11, 55, zc, total);
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff5a1a });
    for (const sx of [-1, 1]) {
      const lv = new THREE.Mesh(new THREE.PlaneGeometry(5, total), lavaMat); lv.rotation.x = -Math.PI / 2; lv.position.set(sx * 12.5, 0.0, zc); g.add(lv);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, total), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.25, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2; glow.position.set(sx * 12.5, 0.02, zc); g.add(glow);
    }
  } else if (theme === 'frost') {
    const t1 = paint(new THREE.ConeGeometry(1.0, 1.6, 8), 0x2f6b4f); t1.translate(0, 1.4, 0);
    const t2 = paint(new THREE.ConeGeometry(0.75, 1.3, 8), 0x3b7d5d); t2.translate(0, 2.3, 0);
    const sn = paint(new THREE.ConeGeometry(0.45, 0.7, 8), 0xffffff); sn.translate(0, 3.0, 0);
    const tr = paint(new THREE.CylinderGeometry(0.15, 0.15, 0.7, 6), 0x6a4a2a); tr.translate(0, 0.35, 0);
    scatter(g, merge([t1, t2, sn, tr]), vc(), 260, 11, 55, zc, total);
    const cr = new THREE.OctahedronGeometry(0.6); cr.scale(1, 1.8, 1);
    scatter(g, cr, lam(0x9fe6ff, { flatShading: true, emissive: 0x1d5878 }), 160, 9.5, 40, zc, total, 0.6, 1.6, 0.5);
  } else if (theme === 'jungle') {
    const trunk = paint(new THREE.CylinderGeometry(0.2, 0.3, 4.2, 7), 0x7a5a32); trunk.translate(0, 2.1, 0);
    const leaves = [];
    for (let k = 0; k < 6; k++) {
      const l = paint(new THREE.ConeGeometry(0.5, 2.6, 4), k % 2 ? 0x2f9a3a : 0x3fb84a);
      l.rotateZ(Math.PI / 2 + 0.35); l.translate(1.2, 4.0, 0); l.rotateY((k / 6) * Math.PI * 2);
      leaves.push(l);
    }
    scatter(g, merge([trunk, ...leaves]), vc(), 220, 11, 55, zc, total, 0.7, 1.4);
    const bush = paint(new THREE.IcosahedronGeometry(0.9, 0), 0x2f8a35); bush.scale(1.3, 0.8, 1.2); bush.translate(0, 0.4, 0);
    const fl = paint(new THREE.SphereGeometry(0.2, 6, 4), 0xff4f9a); fl.translate(0.5, 0.9, 0.3);
    scatter(g, merge([bush, fl]), vc(), 260, 9, 50, zc, total, 0.6, 1.5);
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
    const stick = paint(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), 0xffffff); stick.translate(0, 1.2, 0);
    const disc = paint(new THREE.CylinderGeometry(0.9, 0.9, 0.25, 16), 0xff4f9a); disc.rotateX(Math.PI / 2); disc.translate(0, 2.6, 0);
    const swirl = paint(new THREE.TorusGeometry(0.55, 0.12, 6, 16), 0xffffff); swirl.translate(0, 2.6, 0.13);
    scatter(g, merge([stick, disc, swirl]), vc(false), 140, 11, 50, zc, total, 0.8, 1.8);
    const cols = [0x3ad0ff, 0xffe03a, 0x7aff5a, 0xb06aff];
    for (let k = 0; k < 4; k++) {
      const gd = paint(new THREE.SphereGeometry(0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), cols[k]); gd.scale(1, 1.3, 1);
      scatter(g, gd, vc(false), 70, 9, 55, zc, total, 0.6, 1.5);
    }
  } else if (theme === 'moon') {
    const crater = paint(new THREE.TorusGeometry(1.4, 0.35, 6, 18), 0x7a7a8a); crater.rotateX(Math.PI / 2); crater.scale(1, 0.5, 1);
    scatter(g, crater, vc(), 120, 10, 55, zc, total, 0.6, 2.4, 0, false);
    scatter(g, new THREE.DodecahedronGeometry(0.7), lam(0x6a6a7a, { flatShading: true }), 180, 9, 55, zc, total, 0.4, 1.4, 0.2);
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
    const col = paint(new THREE.CylinderGeometry(0.5, 0.6, 6, 10), 0xfff6e0); col.translate(0, 3, 0);
    const cap = paint(new THREE.BoxGeometry(1.5, 0.4, 1.5), 0xffe7a0); cap.translate(0, 6.2, 0);
    scatter(g, merge([col, cap]), vc(false), 40, 9.5, 8, zc, total, 0.9, 1.1);
  } else if (theme === 'void') {
    const cr = new THREE.OctahedronGeometry(0.8); cr.scale(1, 2.4, 1);
    scatter(g, cr, lam(0xb04aff, { flatShading: true, emissive: 0x5a0a9a }), 200, 9.5, 55, zc, total, 0.5, 2.0, 0.6);
    scatter(g, new THREE.TetrahedronGeometry(0.8), lam(0xff3a8a, { flatShading: true, emissive: 0x6a0a3a }), 120, 12, 55, zc, total, 0.5, 1.8, 3.5, false);
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
