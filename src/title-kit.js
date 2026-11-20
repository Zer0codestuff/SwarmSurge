// Lightweight cannon, gate, label and helper builders shared by the title screen
// and the full engine so the title screen never imports campaign or biome modules.
import * as THREE from 'three';
import { mergeIndexed } from './geo-merge.js';
import { assetBatch } from './asset-kit.js';
import { loftGeometry } from './boss-shapes.js';
import { fittingCollar } from './supply-assets.js';
import { sculptedWeaponGeometry } from './weapon-assets.js';
import { createVehicleRig, cannonBarrelGeometry, buildCarriage, orbSocketGeometry } from './vehicle-assets.js';

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
  for (const g of parts) {
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  }
  return mergeIndexed(parts);
}

// Separate instanced overlays keep weapons visible without adding a draw call per troop.
export function troopWeaponGeo(kind, detail = 'high') {
  const geometry = sculptedWeaponGeometry(kind, detail);
  geometry.userData.shared = false;
  return geometry;
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
const mergedBarrelCache = new Map();
function mergedBarrelGeometry(tint, n) {
  const key = `${tint}:${n}`;
  if (!mergedBarrelCache.has(key)) {
    const baseGeo = cannonBarrelGeometry(tint), sp = n > 4 ? 0.3 : 0.42, sc = n > 4 ? 0.76 : 1;
    const parts = [];
    for (let i = 0; i < n; i++) {
      const part = baseGeo.clone();
      if (sc !== 1) part.scale(sc, sc, sc);
      part.translate((i - (n - 1) / 2) * sp, 0, 0);
      parts.push(part);
    }
    const merged = mergeIndexed(parts, false);
    parts.forEach(p => p.dispose());
    merged.computeBoundingSphere();
    merged.userData.shared = true;
    mergedBarrelCache.set(key, merged);
  }
  return mergedBarrelCache.get(key);
}
export function buildCannon(tint = 0x2f8bff) {
  const g = new THREE.Group();
  const base = new THREE.Group(); base.name = 'base-cannon'; g.add(base);
  const carriage = buildCarriage(tint); base.add(carriage.group);
  const body = carriage.body, wheels = carriage.wheels;
  const barrels = new THREE.Group(); barrels.position.set(0, 1.1, -0.2); g.add(barrels);
  const barrelMaterial = lam(0xffffff, { vertexColors: true });
  const barrelHolder = new THREE.Group(); barrelHolder.position.copy(barrels.position); g.add(barrelHolder);
  const barrelMesh = mesh(mergedBarrelGeometry(tint, 1), barrelMaterial); barrelHolder.add(barrelMesh);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xbff3ff, transparent: true, opacity: 0.55, emissive: 0x3aa0c0 }));
  dome.position.set(0, 1.55, 0.2); base.add(dome);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xaef6ff });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), glowMat);
  glow.position.set(0, 1.6, 0.2); g.add(glow);
  const socket = new THREE.Mesh(orbSocketGeometry(), body.material); socket.visible = false; g.add(socket);
  const rig = createVehicleRig(tint); g.add(rig.group);
  const collar = fittingCollar(); g.add(collar);
  let fittingAt = null;
  function fittingPose(time) {
    const p = Math.max(0, Math.min(1, (time - fittingAt) / .78));
    const spread = Math.min(1, p / .52), rise = Math.min(1, Math.max(0, (p - .18) / .68));
    const folded = (1 - spread) ** 2, lowered = (1 - rise) ** 2;
    rig.group.scale.set(1 - .49 * folded, 1 - .61 * lowered, 1 - .18 * folded);
    barrels.position.copy(rig.barrelAnchor);
    barrelHolder.position.copy(barrels.position); barrelHolder.rotation.copy(barrels.rotation); barrels.position.y *= 1 - .59 * lowered;
    barrels.rotation.x = .7 * folded;
    barrelHolder.position.copy(barrels.position); barrelHolder.rotation.copy(barrels.rotation);
    glow.position.copy(rig.glowAnchor); glow.position.y *= 1 - .61 * lowered;
    socket.position.copy(glow.position); socket.position.y -= .2;
    collar.visible = p < 1; collar.position.y = .1 + p * (rig.glowAnchor.y + .2);
    collar.scale.setScalar(.9 + .36 * Math.sin(Math.PI * p) - .72 * p ** 5);
    collar.rotation.y = p * 1.4;
    if (p === 1) fittingAt = null;
  }
  function setChassis(tier, time = null) {
    if (fittingAt !== null) fittingPose(fittingAt + 1);
    const changed = tier !== rig.formId;
    rig.setForm(tier);
    base.visible = rig.formId === 0;
    body.visible = dome.visible = base.visible;
    wheels.forEach(w => { w.visible = base.visible; });
    barrels.position.copy(rig.barrelAnchor);
    barrelHolder.position.copy(barrels.position);
    glow.position.copy(rig.glowAnchor);
    socket.visible = !base.visible;
    socket.position.copy(rig.glowAnchor); socket.position.y -= 0.2;
    if (changed && tier && time !== null) { fittingAt = time; fittingPose(time); }
  }
  function animateVehicle(time, dt, recoil, speed, charge) {
    rig.animate(time, dt, recoil, speed, charge);
    if (fittingAt !== null) fittingPose(time);
  }
  function setBarrels(n) {
    barrels.clear();
    const sp = n > 4 ? 0.3 : 0.42, sc = n > 4 ? .76 : 1;
    for (let i = 0; i < n; i++) {
      const anchor = new THREE.Object3D();
      anchor.position.x = (i - (n - 1) / 2) * sp;
      anchor.scale.setScalar(sc);
      barrels.add(anchor);
    }
    barrelMesh.geometry = mergedBarrelGeometry(tint, n);
  }
  function setRecoil(z) {
    barrelMesh.position.z = z;
    for (const anchor of barrels.children) anchor.position.z = z;
  }
  setBarrels(1);
  return { group: g, setBarrels, setRecoil, setChassis, animateVehicle, rig, barrels, glow, glowMat, bodyMat: body.material, wheels };
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
  shineTex.userData.shared = true;
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
  // The pressed side pillars turn into the swept shoulders of the overhead casting.
  const frameMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(hex).multiplyScalar(0.55), vertexColors: true });
  const capMat = new THREE.MeshBasicMaterial({ color: hex });
  const parts = [], trim = [], caps = [];
  for (const sx of [-1, 1]) {
    const post = gateLathe([[.27, 0], [.27, .12], [.2, .2], [.15, .34], [.14, H * .55], [.13, H - .3], [.19, H - .22], [.21, H - .04], [.13, H + .02], [.001, H + .03]]);
    parts.push(gateShade(post, (x, y) => (y < .22 || y > H - .24 ? 1.45 : .9 + .25 * y / H)).translate(sx * w / 2, 0, 0));
    for (const y of [.24, H - .27]) trim.push(new THREE.TorusGeometry(.155, .035, 5, 14).rotateX(Math.PI / 2).translate(sx * w / 2, y, 0));
    // The lens sits in a rolled socket with its luminous end exposed.
    caps.push(gateLathe([[.12, -.10], [.153, -.055], [.148, .022], [.106, .083], [.045, .113], [.001, .12]], 14)
      .translate(sx * w / 2, H + .05, 0));
    caps.push(new THREE.BoxGeometry(.05, H * .5, .06).translate(sx * w / 2, H * .5, .14));
  }
  // One continuous bridge casting with haunches deepening as they enter
  // each post. Rotating the loft makes its section axis run across the road.
  const beam = loftGeometry([
    [-.50 * w, .095, .11], [-.475 * w, .155, .135], [-.425 * w, .115, .114], [-.34 * w, .070, .09],
    [0, .072, .087], [.34 * w, .070, .09], [.425 * w, .115, .114], [.475 * w, .155, .135], [.50 * w, .095, .11],
  ], { segments: 8, steps: 20, warp(x, y, z) {
    const end = Math.abs(2 * y / w);
    return [x + .17 * end ** 6, y, z];
  } }).rotateZ(-Math.PI / 2).translate(0, H + .025, 0);
  parts.push(gateShade(beam, (x, y) => y > H + .04 ? 1.46 : y < H - .09 ? .69 : 1.12));
  const sill = new THREE.CylinderGeometry(.16, .16, w + .2, 10, 1, false, Math.PI, Math.PI); sill.rotateZ(Math.PI / 2); sill.scale(1, .45, 1.6);
  parts.push(gateShade(sill.translate(0, .005, 0), () => 1.1));
  for (let i = 0; i < 3; i++) {
    const chevron = new THREE.Shape([[-.22, .05], [0, -.12], [.22, .05], [.22, .14], [0, -.03], [-.22, .14]].map(([x, y]) => new THREE.Vector2(x, y)));
    caps.push(new THREE.ShapeGeometry(chevron).rotateX(-Math.PI / 2).translate((i - 1) * Math.min(.9, w * .28), .085, .02));
  }
  for (const list of [parts, trim, caps]) for (const geo of list) geo.deleteAttribute('uv');
  const frame = mesh(mergeIndexed(parts), frameMat);
  const trimMesh = mesh(mergeIndexed(trim), gateTrim, 0, 0, 0, false);
  const capMesh = new THREE.Mesh(mergeIndexed(caps), capMat);
  for (const list of [parts, trim, caps]) for (const geo of list) geo.dispose();
  g.add(frame, trimMesh, capMesh);
  // Combine translucent gate tint and shared animated shine texture into one pass to halve gate draw calls and overdraw.
  const panelMat = new THREE.MeshBasicMaterial({ color: hex, map: shineTexture(), transparent: true, opacity: 0.55, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false });
  const shineStrength = mega ? 0.55 : 0.4;
  panelMat.onBeforeCompile = (shader) => {
    shader.uniforms.uShineStrength = { value: shineStrength };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform mediump float uShineStrength;')
      .replace('#include <map_fragment>', 'mediump float gateShineAlpha = texture2D( map, vMapUv ).a;')
      .replace('#include <opaque_fragment>', `
        outgoingLight += vec3((gateShineAlpha * uShineStrength) / max(diffuseColor.a, 0.02));
        #include <opaque_fragment>`);
  };
  panelMat.customProgramCacheKey = () => 'gate-glass-shine-v2';
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w - .12, H - 0.16), panelMat);
  panel.position.y = (H - 0.16) / 2 + 0.06;
  g.add(panel);
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

// A cast brass sun wheel above the existing multiplier. The swept vanes,
// copper rim and ceramic hub rotate together in a single draw.
export function buildSunforge(w, mega) {
  const gate = buildGate(w, 0xffa631, mega);
  const wheel = assetBatch().ring(.4, .055, 0, 0, 0, 0xf9ac49, 'z')
    .cylinder(.2, .16, 0, 0, 0, 0x85441d, 'z').sphere(.14, 0, 0, .09, 0xfff3ab, 1, 1, .55);
  for (let n = 0; n < 8; n++) {
    const angle = n * Math.PI / 4;
    const shape = new THREE.Shape();
    shape.moveTo(-.06, .18); shape.quadraticCurveTo(-.1, .48, .14, .65);
    shape.quadraticCurveTo(.06, .4, .1, .2); shape.closePath();
    const vane = new THREE.ExtrudeGeometry(shape, { depth: .04, bevelEnabled: false, curveSegments: 4 });
    wheel.add(vane, n % 2 ? 0xffdb7a : 0xe99343, 0, 0, 0, 0, 0, angle);
  }
  gate.wheel = wheel.finish(gate.group, 'sunforge-wheel');
  gate.wheel.position.y = mega ? 3.22 : 2.72;
  return gate;
}
