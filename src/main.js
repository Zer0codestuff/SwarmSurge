import * as THREE from 'three';
import { LEVELS, THEMES } from './levels.js';
import * as M from './models.js';
import { Sound } from './sound.js';
import * as FX from './fx.js';
import * as P from './props.js';
import { buildBoss2 } from './bosses.js';
import * as W from './worlds.js';
import { RANKS, rankOf, WEAPONS, WEAPON_SPECS, WEAPON_IDS, CHASSIS, CHASSIS_SPECS, CHASSIS_IDS, AIRCRAFT_SPECS, sweptCircle } from './arsenal.js';
import { campaignProgress, renderCampaignMap } from './map.js';
import { createTutorials } from './tutorials.js';
import { installTroopMotion, updateTroopMotion, enemyKitGeometry } from './unit-assets.js';

// ---------------------------------------------------------------- constants
const params = new URLSearchParams(location.search);
const SPEED = Math.min(50, Math.max(1, Number(params.get('speed')) || 1)); // test helper: fast-forward
const TURBO = params.has('turbo'); // test helper: no rendering, simulate as fast as possible
const STEP = 1 / 60;
const STAGE_GAP = 80, TOWER_D = 58, SPAWN_D = 55, XLIM = 6.45, BASE_LIVES = 10;
const MAX_BLUE = 1000, MAX_RED = 900, MAX_PART = 1800;
const MAX_POWER = 1e30; // per unit: keeps Float32 math far away from Infinity
const RESERVE = 80; // blue slots only the cannon may use, so the stream never starves
const BLUE_SPEED = 9, GIANT_SPEED = 6.2, GIANT_HP = 15, CHARGE_MAX = 30, BASE_INTERVAL = 0.15, SPLIT_MAX = 3;
// atk: how much blue power it costs to kill one point of its hp; armor: fraction of damage it actually takes
const RED_TYPES = [
  { speed: 3.4, r: 0.32, hp: 1, dmg: 1, atk: 1.5, scale: 1, color: 0xff2a2a },                        // 0 swarm
  { speed: 2.3, r: 0.8, hp: 12, dmg: 3, atk: 2, scale: 2.3, color: 0xffc21a, big: true },           // 1 brute
  { speed: 3.9, r: 0.34, hp: 1, dmg: 1, atk: 1, scale: 1.08, color: 0xa80c24, boom: true },         // 2 bomber
  { speed: 2.1, r: 0.45, hp: 6, dmg: 2, atk: 1.5, scale: 1.35, color: 0xff6a7a, armor: 0.6 },         // 3 shielder
  { speed: 6.2, r: 0.28, hp: 1, dmg: 1, atk: 1.5, scale: 0.85, color: 0xff8a1a },                     // 4 runner
  { speed: 1.6, r: 0.85, hp: 40, dmg: 3, atk: 2, scale: 2.0, color: 0x9a1424, big: true },          // 5 tank
  { speed: 3.0, r: 0.4, hp: 4, dmg: 1, atk: 1.5, scale: 1.3, color: 0xd0208a, split: true },          // 6 splitter
  { speed: 4.4, r: 0.36, hp: 2, dmg: 1, atk: 1.5, scale: 1.0, color: 0xd8463a, fly: true },           // 7 drone: flies over walls
  { speed: 1.9, r: 0.62, hp: 10, dmg: 2, atk: 2, scale: 1.5, color: 0xff5a2a, armor: 0.35 },        // 8 crab: armored
  { speed: 3.8, r: 0.36, hp: 3, dmg: 1, atk: 1.5, scale: 1.1, color: 0xdfe6ff, ghost: true },         // 9 ghost: phases through walls
  { speed: 2.6, r: 0.38, hp: 5, dmg: 1, atk: 1.5, scale: 1.15, color: 0xe8d6a0, revive: true },       // 10 mummy: gets back up once
  { speed: 3.0, r: 0.38, hp: 5, dmg: 1, atk: 1.5, scale: 1.15, color: 0xa89668 },                     // 11 risen mummy
  { speed: 5.6, r: 0.3, hp: 2, dmg: 1, atk: 1.5, scale: 0.9, color: 0xff3a00, boom: true },           // 12 imp: explodes
];
const WAVE_KINDS = { bomber: 2, shielder: 3, runner: 4, splitter: 6, drone: 7, crab: 8, ghost: 9, mummy: 10, imp: 12 };
const GATE_COLORS = {
  mul: 0xa13cff, add: 0x22a6ff, div: 0xff2a3a, barrier: 0xe0202c, upgrade: 0xffc21a, mega: 0xff9a1a,
  charge: 0x18c87a, nuke: 0x3a3f4a, star: 0xff3fd0, gold: 0xffc21a, blue: 0x22a6ff,
  heart: 0xff3a7a, redmul: 0xffd21a, redadd: 0xffd21a,
};
const BLOCKERS = new Set(['barrier', 'ice', 'fence', 'statue']);
const ABSORBERS = new Set(['upgrade', 'nuke', 'star', 'heart', 'hangar', 'tesla']);
const REDGATES = new Set(['redmul', 'redadd']); // enemy gates: multiply red units, blue units smash them
const SQUAD_OFF = [-1.8, 1.8, -3.6, 3.6];
const MAX_LIVES = 15;
const rgb = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const RED_RGB = RED_TYPES.map((t) => rgb(t.color));
const TIER_RGB = RANKS.map(r => rgb(r.color));
const WEAPON_RGB = WEAPON_SPECS.map(spec => spec ? rgb(spec.color) : null);
const GIANT_RGB = rgb(0x2266ff);
const RAINBOW = Array.from({ length: 32 }, (_, k) => { const c = new THREE.Color().setHSL(k / 32, 1, 0.6); return [c.r, c.g, c.b]; });
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);

// big number formatting: 999, 1.23K, 45.6M, 789B, 1.00T, ... (the army can get absurd)
const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
function fmt(n) {
  n = Math.max(0, n);
  if (n < 1000) return String(Math.round(n));
  let k = 0;
  while (n >= 1000 && k < SUF.length - 1) { n /= 1000; k++; }
  if (n >= 1000) return (n * 1000 ** k).toExponential(1);
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : String(Math.floor(n))) + SUF[k];
}
const fmtHp = (n) => (n < 100000 ? String(Math.max(0, Math.ceil(n))) : fmt(n));

// ---------------------------------------------------------------- renderer / scene
const canvas = document.getElementById('c');
const isTouch = matchMedia('(pointer: coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.75 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.5, 400);
const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8a9a, 1.7);
const sun = new THREE.DirectionalLight(0xffffff, 2.3);
sun.castShadow = true;
sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 42, bottom: -42, near: 1, far: 140 });
sun.shadow.bias = -0.0008;
scene.add(hemi, sun, sun.target);
const sky = FX.buildSky();
scene.add(sky);
const sparks = new FX.Sparks(scene);
const halos = new FX.Halos(scene);
const debris = new FX.Debris(scene);
const ambient = new FX.Ambient(scene);
const tracers = new FX.Tracers(scene);
const impactRings = new FX.Rings(scene);
let sceneReady = false;
let labelBoundsDirty = true, labelTop = 110, labelBottom = innerHeight - 75;

function resize() {
  labelBoundsDirty = true;
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (sceneReady && G.paused && G.phase !== 'menu') { renderWorld(0); renderer.render(scene,camera); }
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- instanced unit meshes
function instanced(geo, mat, n, shadow = true) {
  const m = new THREE.InstancedMesh(geo, mat, n);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
  m.instanceColor.setUsage(THREE.DynamicDrawUsage);
  m.castShadow = shadow;
  m.frustumCulled = false;
  m.count = 0;
  scene.add(m);
  return m;
}
const unitMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const blueMesh = instanced(M.blueUnitGeo().scale(1.2, 1.2, 1.2), new THREE.MeshToonMaterial({ vertexColors: true, emissive: 0x0c3060, gradientMap: M.toonGradient() }), MAX_BLUE);
const redMesh = instanced(M.redUnitGeo().scale(1.2, 1.2, 1.2), new THREE.MeshToonMaterial({ vertexColors: true, emissive: 0x400808, gradientMap: M.toonGradient() }), MAX_RED);
const blueFarMesh = instanced(M.blueUnitGeo('low').scale(1.2, 1.2, 1.2), blueMesh.material, MAX_BLUE);
const redFarMesh = instanced(M.redUnitGeo('low').scale(1.2, 1.2, 1.2), redMesh.material, MAX_RED);
const troopMeshes = [blueMesh, redMesh, blueFarMesh, redFarMesh];
for (const mesh of troopMeshes) {
  mesh.geometry.setAttribute('unitMotion', new THREE.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count * 2), 2).setUsage(THREE.DynamicDrawUsage));
  installTroopMotion(mesh.material);
  mesh.customDepthMaterial = mesh.material.userData.troopMotion.depthMaterial;
  mesh.customDistanceMaterial = mesh.material.userData.troopMotion.distanceMaterial;
}
const overlays = {
  2: instanced(M.bombGeo().scale(1.2, 1.2, 1.2), unitMat, MAX_RED, false),
  3: instanced(M.shieldGeo().scale(1.2, 1.2, 1.2), unitMat, MAX_RED, false),
  5: instanced(M.helmetGeo().scale(1.2, 1.2, 1.2), unitMat, MAX_RED, false),
  6: instanced(M.spikesGeo().scale(1.2, 1.2, 1.2), unitMat, MAX_RED, false),
  7: instanced(enemyKitGeometry(7).scale(1.2, 1.2, 1.2), unitMat, MAX_RED, false),
  8: instanced(enemyKitGeometry(8).scale(1.2, 1.2, 1.2), unitMat, MAX_RED, false),
  9: instanced(enemyKitGeometry(9).scale(1.2, 1.2, 1.2), unitMat, MAX_RED, false),
};
const partMesh = instanced(new THREE.BoxGeometry(0.16, 0.16, 0.16), new THREE.MeshBasicMaterial(), MAX_PART, false);
partMesh.count = MAX_PART;

// ---------------------------------------------------------------- unit pools (struct of arrays)
function makePool(N) {
  const P = { n: 0, N };
  for (const k of ['x', 'z', 'px', 'pz', 'vx', 'vz', 'hp', 'phase', 'flash', 'cm', 'sc', 'rad', 'wake', 'age', 'mx', 'stk', 'air', 'adur', 'ax0', 'az0', 'ax1', 'az1', 'shot', 'burn', 'burnDamage', 'chill']) P[k] = new Float32Array(N);
  P.mask = new Uint32Array(N);
  P.mask2 = new Uint32Array(N);
  P.kind = new Uint8Array(N);
  P.st = new Uint8Array(N);
  P.weapon = new Uint8Array(N);
  P.detail = new Uint8Array(N);
  P.arrs = [P.x, P.z, P.px, P.pz, P.vx, P.vz, P.hp, P.phase, P.flash, P.cm, P.sc, P.rad, P.wake, P.age, P.mx, P.stk, P.air, P.adur, P.ax0, P.az0, P.ax1, P.az1, P.mask, P.mask2, P.kind, P.st, P.shot, P.weapon, P.burn, P.burnDamage, P.chill, P.detail];
  return P;
}
const B = makePool(MAX_BLUE), R = makePool(MAX_RED);
function nextTroopWeapon() {
  if (!G.weaponMask) return G.weapon;
  for (let k = 0; k < WEAPONS.length - 1; k++) {
    const id = 1 + (G.equipCursor++ % (WEAPONS.length - 1));
    if (G.weaponMask & (1 << id)) return id;
  }
  return G.weapon;
}
function spawn(P, x, z, hp, kind, mask = 0, mask2 = 0) {
  if (P.n >= P.N) return -1;
  const i = P.n++;
  P.x[i] = P.px[i] = x; P.z[i] = P.pz[i] = z;
  P.vx[i] = P.vz[i] = 0; P.hp[i] = hp; P.kind[i] = kind; P.mask[i] = mask; P.mask2[i] = mask2;
  P.phase[i] = Math.random() * 6.28; P.flash[i] = 0; P.cm[i] = 1; P.sc[i] = 1; P.rad[i] = 0.3; P.st[i] = 0; P.wake[i] = 0; P.age[i] = 0; P.mx[i] = hp; P.stk[i] = 0; P.air[i] = 0; P.adur[i] = 0; P.shot[i] = Math.random() * 0.9; P.weapon[i] = P === B ? nextTroopWeapon() : 0;
  P.burn[i] = P.burnDamage[i] = P.chill[i] = 0;
  P.detail[i] = 0;
  return i;
}
function compact(P) {
  let w = 0;
  for (let r = 0; r < P.n; r++) {
    if (P.hp[r] > 0) {
      if (w !== r) for (const a of P.arrs) a[w] = a[r];
      w++;
    }
  }
  P.n = w;
}

// ---------------------------------------------------------------- spatial grids
const GC = 1.4, GCOLS = 12, GROWS = 58;
function makeGrid(N) { return { head: new Int32Array(GCOLS * GROWS), next: new Int32Array(N) }; }
const gB = makeGrid(MAX_BLUE), gR = makeGrid(MAX_RED);
const cellX = (x) => clamp(((x + 8.4) / GC) | 0, 0, GCOLS - 1);
const cellZ = (z) => clamp(((G.z0 - z + 6) / GC) | 0, 0, GROWS - 1);
function buildGrid(g, P) {
  g.head.fill(-1);
  for (let i = 0; i < P.n; i++) {
    if (P.hp[i] <= 0) continue;
    const c = cellZ(P.z[i]) * GCOLS + cellX(P.x[i]);
    g.next[i] = g.head[c]; g.head[c] = i;
  }
}
// coarse grid: used for "where is the nearest group of enemies" steering
const CC = 4, CCOLS = 5, CROWS = 21;
function makeCoarse() { return { cnt: new Float32Array(CCOLS * CROWS), sx: new Float32Array(CCOLS * CROWS), sz: new Float32Array(CCOLS * CROWS) }; }
const cB = makeCoarse(), cR = makeCoarse();
const ccX = (x) => clamp(((x + 10) / CC) | 0, 0, CCOLS - 1);
const ccZ = (z) => clamp(((G.z0 - z + 8) / CC) | 0, 0, CROWS - 1);
function buildCoarse(C, P) {
  C.cnt.fill(0); C.sx.fill(0); C.sz.fill(0);
  for (let i = 0; i < P.n; i++) {
    if (P.hp[i] <= 0) continue;
    const c = ccZ(P.z[i]) * CCOLS + ccX(P.x[i]);
    C.cnt[c]++; C.sx[c] += P.x[i]; C.sz[c] += P.z[i];
  }
}
let TX = 0, TZ = 0;
function seek(C, x, z, maxD, dir) {
  const cx = ccX(x), cz = ccZ(z);
  let best = maxD * maxD, found = false;
  for (let gz = cz - 2; gz <= cz + 2; gz++) {
    if (gz < 0 || gz >= CROWS) continue;
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      if (gx < 0 || gx >= CCOLS) continue;
      const c = gz * CCOLS + gx, n = C.cnt[c];
      if (!n) continue;
      const mx = C.sx[c] / n, mz = C.sz[c] / n;
      if (dir < 0 ? mz > z + 1 : mz < z - 1) continue;
      const d2 = (mx - x) ** 2 + (mz - z) ** 2;
      if (d2 < best) { best = d2; TX = mx; TZ = mz; found = true; }
    }
  }
  return found;
}

// ---------------------------------------------------------------- particles
const PT = {
  x: new Float32Array(MAX_PART), y: new Float32Array(MAX_PART), z: new Float32Array(MAX_PART),
  vx: new Float32Array(MAX_PART), vy: new Float32Array(MAX_PART), vz: new Float32Array(MAX_PART),
  life: new Float32Array(MAX_PART), max: new Float32Array(MAX_PART), head: 0,
};
function burst(x, y, z, col, n, spd = 4, size = 1) {
  if (TURBO) return;
  const c = partMesh.instanceColor.array;
  for (let k = 0; k < n; k++) {
    const i = PT.head; PT.head = (PT.head + 1) % MAX_PART;
    PT.x[i] = x; PT.y[i] = y; PT.z[i] = z;
    const a = Math.random() * 6.28, s = spd * (0.4 + Math.random() * 0.8);
    PT.vx[i] = Math.cos(a) * s; PT.vz[i] = Math.sin(a) * s; PT.vy[i] = spd * (0.6 + Math.random());
    PT.max[i] = PT.life[i] = (0.45 + Math.random() * 0.4) * size;
    c[i * 3] = col[0]; c[i * 3 + 1] = col[1]; c[i * 3 + 2] = col[2];
  }
}
function spark(x, y, z, col, n, speed = 4, size = 0.8, life = 0.5, grav = -6) {
  if (!TURBO) sparks.emit(x, y, z, col, n, speed, size, life, grav);
}
function updateParticles(dt) {
  const m = partMesh.instanceMatrix.array;
  for (let i = 0; i < MAX_PART; i++) {
    let s = 0;
    if (PT.life[i] > 0) {
      PT.life[i] -= dt;
      PT.vy[i] -= 20 * dt;
      PT.x[i] += PT.vx[i] * dt; PT.y[i] += PT.vy[i] * dt; PT.z[i] += PT.vz[i] * dt;
      if (PT.y[i] < 0.08) { PT.y[i] = 0.08; PT.vy[i] *= -0.4; PT.vx[i] *= 0.7; PT.vz[i] *= 0.7; }
      s = Math.max(0, PT.life[i] / PT.max[i]) * 1.4;
    }
    const o = i * 16;
    m[o] = s; m[o + 5] = s; m[o + 10] = s; m[o + 15] = 1;
    m[o + 12] = PT.x[i]; m[o + 13] = PT.y[i]; m[o + 14] = PT.z[i];
  }
  partMesh.instanceMatrix.needsUpdate = true;
  partMesh.instanceColor.needsUpdate = true;
}
const PCOL = {
  blue: rgb(0x55b8ff), red: rgb(0xff3030), gold: rgb(0xffcc22), orange: rgb(0xff7a1a), white: rgb(0xffffff), ice: rgb(0xb8f0ff),
  purple: rgb(0xb060ff), dust: rgb(0xc9b28a), pink: rgb(0xff4fd8), green: rgb(0x5aff6a), sand: rgb(0xd9b27a), metal: rgb(0xb0b8c8),
};

// ---------------------------------------------------------------- DOM labels, popups & HUD
const $ = (id) => document.getElementById(id);
const labelLayer = $('labels');
const tmpV = new THREE.Vector3();
function makeLabel(cls) {
  const el = document.createElement('div');
  el.className = 'lbl ' + cls;
  el.style.display = 'none';
  labelLayer.appendChild(el);
  return { el, cls, text: null, vis: false };
}
function project(x, y, z) {
  tmpV.set(x, y, z).project(camera);
  if (tmpV.z > 1 || tmpV.z < -1) return false;
  tmpV.x = (tmpV.x * 0.5 + 0.5) * innerWidth; tmpV.y = (-tmpV.y * 0.5 + 0.5) * innerHeight;
  return true;
}
function placeLabel(L, x, y, z, text) {
  if (!project(x, y, z)) { hideLabel(L); return; }
  const height = L.cls === 'boss' ? 64 : 40;
  if (tmpV.y - height < labelTop || tmpV.y > labelBottom || tmpV.x < -40 || tmpV.x > innerWidth + 40) { hideLabel(L); return; }
  L.el.style.transform = `translate(${clamp(tmpV.x, 60, innerWidth - 60).toFixed(1)}px,${tmpV.y.toFixed(1)}px) translate(-50%,-100%)`;
  if (L.text !== text) { L.el.textContent = text; L.text = text; }
  if (!L.vis) { L.el.style.display = ''; L.vis = true; }
}
function hideLabel(L) { if (L.vis) { L.el.style.display = 'none'; L.vis = false; } }
const bruteLabels = Array.from({ length: 20 }, () => makeLabel('brute'));

// floating world popups (combo counters, damage numbers)
const popups = Array.from({ length: 18 }, () => {
  const el = document.createElement('div');
  el.className = 'pop';
  const inner = document.createElement('span');
  el.appendChild(inner);
  el.style.display = 'none';
  labelLayer.appendChild(el);
  return { el, inner, life: 0, x: 0, y: 0, z: 0, dy: 0, combo: false };
});
let popHead = 0;
let popSerial = 0;
function popup(text, cls, x, y, z, life = 1.3) {
  if (TURBO) return;
  const p = popups[popHead]; popHead = (popHead + 1) % popups.length;
  p.x = x; p.y = y; p.z = z; p.life = life;
  // stack combo popups that are still fresh so they don't overlap
  p.combo = cls.startsWith('combo');
  p.serial = ++popSerial;
  if (p.combo) {
    const previous = popups.filter(q => q !== p && q.combo && q.life > 0).sort((a,b) => b.serial - a.serial);
    for (const q of previous.slice(1)) { q.life = 0; q.el.style.display = 'none'; }
  }
  p.dy = 0;
  if (p.combo) for (const q of popups) if (q !== p && q.combo && q.life > 0.6) p.dy = Math.min(p.dy, q.dy - 1);
  p.inner.textContent = text;
  p.inner.className = '';
  void p.inner.offsetWidth;
  p.inner.className = cls;
  p.el.style.display = '';
}
function updatePopups(dt) {
  for (const p of popups) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0 || !project(p.x, p.y, p.z)) { p.el.style.display = 'none'; p.life = 0; continue; }
    let sx = tmpV.x, sy = tmpV.y;
    if (p.combo) { sx = clamp(sx, innerWidth * 0.3, innerWidth * 0.7); sy = Math.max(innerHeight * 0.2, sy) + p.dy * 40; }
    p.el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
  }
}

const hud = {
  root: $('hud'), army: $('army'), armybox: $('armybox'), lives: $('lives'), level: $('lvlname'), pips: $('pips'),
  charge: $('chargefill'), ups: $('ups'), banner: $('banner'), tip: $('tip'), hint: $('hint'), flash: $('flash'), white: $('white'),
};
let bannerTimer = 0, tipTimer = 0;
function banner(text, cls = '', dur = 1.6) {
  if (TURBO) return;
  hud.banner.className = '';
  void hud.banner.offsetWidth;
  hud.banner.textContent = text;
  hud.banner.className = 'show ' + cls;
  bannerTimer = dur;
}
function showTip(text) {
  tipTimer = 0; hud.tip.className = 'stroke'; hud.tip.textContent = '';
  if (TURBO || !text) return;
  hud.tip.textContent = text;
  hud.tip.className = 'show stroke';
  tipTimer = 5.5;
}
function whiteFlash() {
  if (TURBO) return;
  hud.white.classList.remove('on'); void hud.white.offsetWidth; hud.white.classList.add('on');
}
const hudCache = {};
function setHud(key, el, val, prop = 'textContent') {
  if (hudCache[key] === val) return;
  hudCache[key] = val;
  if (prop === 'width') el.style.width = val; else el[prop] = val;
}

// ---------------------------------------------------------------- game state
const sound = new Sound();
const G = {
  phase: 'menu', phaseT: 0, t: 0, levelIdx: 0, stageIdx: 0, stages: [], stage: null, root: null,
  z0: 0, cannonZ: 0, camZ: 0, aim: 0, cx: 0, lives: BASE_LIVES, barrels: 1, rate: 1, power: 1, twin: false, fireT: 0, charge: 0,
  shake: 0, recoil: 0, kills: 0, time: 0, explosions: [], splits: [], revives: [], effects: [], army: 0, maxArmy: 0, bestCombo: 1, fps: 60,
  moveFrom: 0, moveTo: 0, slow: 0, dmgAcc: 0, dmgT: 0, dmgTotal: 0, armyPrev: 0, pumpT: 0,
  squad: 0, rad: 0, zones: [], nextMile: 1000, armyAvg: 0,
  chassis: 0, weapon: 0, weaponMask: 0, equipCursor: 0, aircraft: 0, airT: 2, airPass: 0, airTier: 0, airHit: false, shield: 0, guardFlash: 0, armorPopupT: 0, overdrive: 0, rank: 0,
};
const cannon = M.buildCannon();
const twinCannon = M.buildCannon(0xff4fd8);
const squadCannons = SQUAD_OFF.map(() => { const c = M.buildCannon(0x22b8ff); c.group.scale.setScalar(0.85); c.group.visible = false; scene.add(c.group); return c; });
const airWings = new Map();
function supportAircraft(tier) {
  if (!airWings.has(tier)) {
    const model = P.buildSupportPlane(tier); model.group.visible = false;
    airWings.set(tier, model); scene.add(model.group);
  }
  return airWings.get(tier);
}
scene.add(cannon.group, twinCannon.group);
const weaponMeshes = [null, ...WEAPON_SPECS.slice(1).map((_, k) => instanced(M.troopWeaponGeo(k + 1), unitMat, MAX_BLUE, false))];
const weaponCounts = new Uint16Array(WEAPONS.length);
const cannonMuzzle = new THREE.Vector3();
cannon.group.visible = twinCannon.group.visible = false;
const squadX = (k) => clamp(G.cx + SQUAD_OFF[k], -XLIM + 0.3, XLIM - 0.3);
const buzz = (p) => { if (!TURBO && isTouch && navigator.vibrate) try { navigator.vibrate(p); } catch {} };

function loadProgress() {
  try { const p = JSON.parse(localStorage.getItem('swarm-progress')); if (p && Array.isArray(p.stars)) return p; } catch {}
  return { stars: [] };
}
let progress = loadProgress();
const tutorials = createTutorials();
function recordVictory() {
  const stars = G.lives >= 8 ? 3 : G.lives >= 4 ? 2 : 1;
  if (stars <= (progress.stars[G.levelIdx] || 0)) return;
  progress.stars[G.levelIdx] = stars;
  try { localStorage.setItem('swarm-progress', JSON.stringify(progress)); } catch {}
}

// ---------------------------------------------------------------- level construction
function gateColor(def, cur) {
  if (def.mega) return GATE_COLORS.mega;
  if (def.color && def.t !== 'flip') return GATE_COLORS[def.color];
  return GATE_COLORS[cur.t] ?? GATE_COLORS.mul;
}
const UP_NAMES = { barrel: '+2 GUNS', rapid: 'RAPID x2', power: 'POWER x3', twin: 'TWIN GUN', squad: 'ESCORT +1', tank: 'EVOLVE TANK', air: 'AIR WING', ...Object.fromEntries([...WEAPON_SPECS.slice(1), ...CHASSIS_SPECS.slice(1)].map(spec => [spec.key, spec.name.toUpperCase()])) };
const SLOT_FACES = ['x100', '÷3', 'x7', '÷2', 'x50', 'x3', '777'];
const opText = (c, boost = 1) => (c.t === 'mul' ? 'x' + fmt(c.v * boost) : c.t === 'add' ? '+' + fmt(c.v * boost) : '÷' + c.v);
function refreshGate(g) {
  const c = g.cur, L = g.model.label, t = g.def.t;
  g.dirty = false;
  if (t === 'flip') {
    const p = Math.ceil((1 - g.flipT / g.def.period) * 8) / 8;
    M.drawLabel(L, c.t === 'mul' ? 'x' + fmt(c.v * g.boost) : '÷' + c.v, '', p, c.t === 'mul' ? '#ffffff' : '#ffd9d9');
  } else if (t === 'mul') M.drawLabel(L, 'x' + fmt(c.v * g.boost), '', -1, g.boost > 1 ? '#ffe9ff' : '#ffffff');
  else if (t === 'add') M.drawLabel(L, '+' + fmt(c.v * g.boost));
  else if (t === 'div') M.drawLabel(L, '÷' + c.v, '', -1, '#ffd9d9');
  else if (t === 'barrier') M.drawLabel(L, '−' + fmtHp(g.hp));
  else if (t === 'ice' || t === 'fence') M.drawLabel(L, fmtHp(g.hp), 'SMASH!');
  else if (t === 'statue') M.drawLabel(L, fmtHp(g.hp));
  else if (t === 'upgrade') M.drawLabel(L, UP_NAMES[c.up], `${fmt(g.prog)}/${fmt(g.need)}`, g.prog / g.need, '#ffe680');
  else if (t === 'nuke') M.drawLabel(L, 'NUKE', `${fmt(g.prog)}/${fmt(g.need)}`, g.prog / g.need, '#9aff5a');
  else if (t === 'star') M.drawLabel(L, 'GATES x2', `${fmt(g.prog)}/${fmt(g.need)}`, g.prog / g.need, '#ffd0ff');
  else if (t === 'charge') {
    const atMax = g.val >= c.max;
    const prog = atMax ? 1 : (g.fed % c.per) / c.per;
    M.drawLabel(L, 'x' + fmt(g.val * g.boost), atMax ? 'MAX!' : `CHARGE ▲ x${fmt(c.max * g.boost)}`, prog, atMax ? '#fff35a' : '#bfffd8');
  } else if (t === 'portal') M.drawLabel(L, 'WARP', '', -1, '#ffd0ff');
  else if (t === 'loop') M.drawLabel(L, 'LOOP', 'ALL GATES AGAIN', -1, '#b8ffd8');
  else if (t === 'jump') M.drawLabel(L, 'JUMP!', '', -1, '#bffff0');
  else if (t === 'slot') {
    if (g.spin > 0) M.drawLabel(L, SLOT_FACES[(Math.random() * SLOT_FACES.length) | 0], 'SLOT', -1, '#fff4a0');
    else M.drawLabel(L, opText(c, c.t === 'div' ? 1 : g.boost), 'SLOT', -1, c.t === 'div' ? '#ffd9d9' : '#ffffff');
  } else if (t === 'heart') M.drawLabel(L, '+' + (g.def.v ?? 1) + ' ♥', `${fmt(g.prog)}/${fmt(g.need)}`, g.prog / g.need, '#ffd0e0');
  else if (t === 'hangar') M.drawLabel(L, 'AIR WING', `${fmt(g.prog)}/${fmt(g.need)}`, g.prog / g.need, '#ffe680');
  else if (t === 'tesla') M.drawLabel(L, g.active ? 'ZAP!' : 'TESLA', g.active ? 'ONLINE' : `${fmt(g.prog)}/${fmt(g.need)}`, g.active ? 1 : g.prog / g.need, '#bff6ff');
  else if (REDGATES.has(t)) M.drawLabel(L, (t === 'redmul' ? 'x' : '+') + g.def.v, 'SMASH ' + fmtHp(g.hp), -1, '#c81020');
}
function buildGateModel(gd, cur) {
  if (gd.t === 'upgrade') return P.buildArmory(gd.w, gd.up);
  if (gd.t === 'ice') return M.buildIceWall(gd.w);
  if (gd.t === 'fence') return M.buildFence(gd.w);
  if (gd.t === 'statue') return M.buildStatue(gd.w, gd.small);
  if (gd.t === 'portal') return M.buildPortal(gd.w);
  if (gd.t === 'loop') return M.buildPortal(gd.w, 0x2aff8a, 0x10a060);
  if (gd.t === 'jump') return P.buildJumpPad(gd.w);
  if (gd.t === 'hangar') return P.buildHangar(gd.w);
  if (gd.t === 'tesla') return P.buildTesla(gd.w);
  return M.buildGate(gd.w, gateColor(gd, cur), gd.mega);
}
function buildStage(sd, i, root, theme) {
  const group = new THREE.Group(); root.add(group); root = group;
  const z0 = -i * STAGE_GAP;
  const st = {
    def: sd, i, z0, group, gates: [], walls: [], saws: [], spawners: [], crushers: [], turrets: [], exits: [],
    belts: [], pillars: [], tornados: [], holes: [], balls: [], metT: sd.meteors?.every ?? 0,
    tower: null, boss: null, fort: null, waveT: 2.0, waveN: 0, flankT: sd.flanks?.start ?? Infinity, flankN: 0, time: 0, enraged: false, comboNext: 10,
  };
  sd.gates?.forEach((gd, k) => {
    const cur = gd.t === 'flip' ? gd.a : gd.t === 'slot' ? gd.opts[0] : gd;
    const model = buildGateModel(gd, cur);
    const g = {
      def: gd, cur, bit: (1 << (k & 31)) >>> 0, hi: k >= 32, baseX: gd.x, x: gd.x, z: z0 - gd.d, w: gd.w, alive: true,
      hp: gd.hp || 0, prog: 0, need: gd.need || 0, val: gd.v || 1, fed: 0, flipT: 0, flipIdx: 0, flash: 0, model,
      ph: Math.random() * 6.28, dying: 0, dirty: true, refT: 0, boost: 1, on: true, spin: 0, active: false, zapT: 0,
    };
    model.group.position.set(g.x, 0, g.z);
    root.add(model.group);
    refreshGate(g);
    st.gates.push(g);
    if (gd.t === 'portal' || gd.t === 'loop' || gd.t === 'jump') {
      const ex = M.buildPortalExit();
      if (gd.t !== 'portal') ex.ring.material.color.set(gd.t === 'loop' ? 0x2aff8a : 0x3affd0);
      ex.group.position.set(gd.to.x, 0, z0 - gd.to.d);
      root.add(ex.group);
      st.exits.push(ex);
    }
  });
  sd.walls?.forEach((wd) => {
    const m = M.buildWall(wd.d2 - wd.d1);
    m.position.set(wd.x, 0, z0 - (wd.d1 + wd.d2) / 2);
    root.add(m);
    st.walls.push({ def: wd, x: wd.x, zTop: z0 - wd.d2, zBot: z0 - wd.d1, model: m, ph: wd.slide?.ph ?? 0 });
  });
  sd.belts?.forEach((bd) => {
    const m = P.buildBelt(bd.w, bd.d2 - bd.d1, bd.v);
    m.group.position.set(bd.x, 0, z0 - (bd.d1 + bd.d2) / 2);
    root.add(m.group);
    st.belts.push({ x: bd.x, w: bd.w, v: bd.v, zTop: z0 - bd.d2, zBot: z0 - bd.d1, model: m });
  });
  sd.pillars?.forEach((pd) => {
    const m = P.buildPillar();
    m.group.position.set(pd.x, 0, z0 - pd.d);
    root.add(m.group);
    st.pillars.push({ def: pd, x: pd.x, z: z0 - pd.d, hp: pd.hp, max: pd.hp, alive: true, fall: 0, dir: pd.fall ?? (pd.x > 0 ? -1 : 1), model: m, label: makeLabel('pillar'), flash: 0 });
  });
  sd.tornados?.forEach((td) => {
    const m = P.buildTornado(td.r);
    m.group.position.set(td.x, 0, z0 - td.d);
    root.add(m.group);
    st.tornados.push({ def: td, x: td.x, z: z0 - td.d, r: td.r, ph: Math.random() * 6.28, model: m });
  });
  sd.holes?.forEach((hd) => {
    const m = P.buildBlackHole(hd.r);
    m.group.position.set(hd.x, 0, z0 - hd.d);
    root.add(m.group);
    st.holes.push({ def: hd, x: hd.x, z: z0 - hd.d, r: hd.r, prog: 0, need: hd.need, alive: true, model: m, dying: 0 });
  });
  sd.balls?.forEach((bd) => addBall(st, root, bd.x, z0 - bd.d, bd.hp, bd.r ?? 2.4, bd.speed ?? 1.6, bd));
  sd.saws?.forEach((sw) => {
    const m = M.buildSaw(sw.r);
    m.group.position.set(sw.x, 0, z0 - sw.d);
    root.add(m.group);
    st.saws.push({ def: sw, x: sw.x, z: z0 - sw.d, r: sw.r, model: m, ph: Math.random() * 6.28 });
  });
  sd.crushers?.forEach((cd) => {
    const m = M.buildCrusher(cd.w);
    m.group.position.set(cd.x, 0, z0 - cd.d);
    root.add(m.group);
    st.crushers.push({ def: cd, x: cd.x, z: z0 - cd.d, w: cd.w, model: m, y: 4, down: false, slammed: false });
  });
  sd.turrets?.forEach((td) => {
    const m = M.buildTurret();
    m.group.position.set(td.x, 0, z0 - td.d);
    root.add(m.group);
    st.turrets.push({ def: td, x: td.x, z: z0 - td.d, hp: td.hp, max: td.hp, timer: td.every, model: m, alive: true, label: makeLabel('spawner'), flash: 0 });
  });
  sd.spawners?.forEach((sp) => {
    const m = sp.style === 'rival' ? P.buildRival() : M.buildSpawner(sp.style);
    m.group.position.set(sp.x, 0, z0 - sp.d);
    root.add(m.group);
    st.spawners.push({ def: sp, x: sp.x, z: z0 - sp.d, hp: sp.hp, max: sp.hp, timer: sp.every * 0.5, model: m, alive: true, label: makeLabel('spawner'), flash: 0 });
  });
  if (sd.boss) {
    const m = buildBoss2(sd.boss.type) ?? M.buildBoss(sd.boss.type);
    const every = {
      king: 5.2, jelly: 4.6, skeleton: 4.6, titan: 3.3, golem: 3.8, moon: 3.4, dragon: 4.2, storm: 3.8, brute: 4.4, robot: 4.0,
      drill: 4.2, dice: 4.4, kraken: 4.0, pumpkin: 4.2, commander: 3.8, spider: 4.0, magma: 3.8, pharaoh: 4.0, thunder: 3.4, emperor: 3.2,
    }[sd.boss.type];
    const b = {
      type: sd.boss.type, hp: sd.boss.hp, max: sd.boss.hp, speed: sd.boss.speed, push: sd.boss.push ?? 40, startZ: z0 - 60, x: 0, z: z0 - 60,
      model: m, alive: true, every: sd.boss.every ?? every, sweep: !!sd.boss.sweep, atkT: 4, atk: 0, atkN: 0, label: makeLabel('boss'), flash: 0, dead: 0,
    };
    m.group.position.set(0, 0, b.z);
    root.add(m.group);
    st.boss = b;
    if (sd.fort) {
      const f = M.buildTower(theme);
      // distant enemy fort off to the left, like in the reference shot
      f.group.position.set(-21, 0, z0 - 92);
      f.group.rotation.y = 0.35;
      f.group.scale.setScalar(0.8);
      root.add(f.group);
      st.fort = { hp: sd.fort, x: -21, z: z0 - 92, label: makeLabel('tower') };
    }
  } else {
    const m = M.buildTower(theme);
    m.group.position.set(0, 0, z0 - TOWER_D - 0.9);
    root.add(m.group);
    st.tower = { hp: sd.tower, max: sd.tower, z: z0 - TOWER_D, model: m, alive: true, label: makeLabel('tower'), flash: 0, sink: 0 };
  }
  const line = M.buildStartLine();
  line.position.set(0, 0.015, z0 - 2.2);
  root.add(line);
  return st;
}

function disposeLevel() {
  if (!G.root) return;
  scene.remove(G.root);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  G.root.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
    if (o.geometry && !o.geometry.userData.shared) geometries.add(o.geometry);
    for (const material of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
      if (material.map && material.map !== M.shineTexture()) textures.add(material.map);
      if (!material.userData.shared) materials.add(material);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  G.root = null;
  for (const st of G.stages) {
    for (const s of [...st.spawners, ...st.turrets, ...st.pillars, ...st.balls]) s.label.el.remove();
    if (st.tower) st.tower.label.el.remove();
    if (st.boss) st.boss.label.el.remove();
    if (st.fort) st.fort.label.el.remove();
  }
  G.stages = [];
}

const LIGHTS = {
  desert: [0xffffff, 0xb09a7a, 1.7, 0xfff4e0, 2.3],
  mob: [0xffffff, 0xb09a7a, 1.75, 0xfff4e0, 2.3],
  lava: [0xffd0b0, 0x502020, 1.5, 0xffc090, 2.0],
  frost: [0xeaf6ff, 0x9fb0c8, 1.6, 0xffffff, 2.1],
  jungle: [0xf0ffe0, 0x5a7a3a, 1.6, 0xfff0c0, 2.3],
  neon: [0x9a8aff, 0x302050, 1.5, 0xff9af0, 1.6],
  candy: [0xfff0fa, 0xc08ab0, 1.75, 0xffffff, 2.1],
  moon: [0xb0b8ff, 0x404058, 1.4, 0xffffff, 2.2],
  sky: [0xffffff, 0xa0c0e0, 1.8, 0xfff8e0, 2.2],
  void: [0xc08aff, 0x301040, 1.5, 0xff9af0, 1.8],
  factory: [0xfff0d8, 0x6a5a4a, 1.6, 0xffe0b0, 2.2],
  casino: [0xffd0e0, 0x402030, 1.5, 0xffe0a0, 1.9],
  coral: [0xf0ffff, 0x6ab0c0, 1.75, 0xfff8e0, 2.3],
  spooky: [0xb0a0ff, 0x302838, 1.45, 0xe0d0ff, 1.8],
  arena: [0xffffff, 0xb08a5a, 1.75, 0xfff0d0, 2.3],
  crystal: [0x9af0ff, 0x302850, 1.5, 0xd0b0ff, 1.9],
  volcano: [0xffc0a0, 0x502018, 1.5, 0xffb080, 2.0],
  tomb: [0xffffff, 0xb08a5a, 1.75, 0xfff0c8, 2.3],
  storm: [0xd0e0ff, 0x404a50, 1.5, 0xe0e8ff, 1.9],
  blackhole: [0xd0b0ff, 0x201030, 1.45, 0xffd0a0, 1.9],
};
function applyTheme(theme) {
  const T = THEMES[theme];
  scene.background = new THREE.Color(T.sky);
  scene.fog = new THREE.Fog(T.fog, 70, 170);
  const su = sky.material.uniforms;
  su.uTop.value.set(T.sky).offsetHSL(0, 0.08, -0.08); su.uMid.value.set(T.fog); su.uBottom.value.set(T.fog);
  ambient.setTheme(theme);
  const L = LIGHTS[theme];
  hemi.color.set(L[0]); hemi.groundColor.set(L[1]); hemi.intensity = L[2]; sun.color.set(L[3]); sun.intensity = L[4];
}

function startLevel(idx, stageIdx = 0) {
  if ($('pause').open) $('pause').close();
  document.body.classList.remove('game-paused');
  resetInput(); sound.setPaused(false);
  disposeLevel();
  const def = LEVELS[idx];
  G.levelIdx = idx;
  G.root = new THREE.Group();
  scene.add(G.root);
  applyTheme(def.theme);
  const world = M.buildWorld(def.theme, def.stages.length * STAGE_GAP);
  W.decorate(def.theme, world, def.stages.length * STAGE_GAP);
  G.root.add(world);
  G.stages = def.stages.map((sd, i) => buildStage(sd, i, G.root, def.theme));
  for (let i = 0; i < stageIdx; i++) if (G.stages[i].tower) { G.stages[i].tower.alive = false; G.stages[i].tower.model.group.visible = false; }
  B.n = R.n = 0;
  PT.life.fill(0);
  sparks.clear(); debris.clear(); tracers.clear(); impactRings.clear(); G.shatters = [];
  G.explosions.length = 0;
  G.splits.length = 0;
  G.revives = [];
  // disposeLevel traverses effects too, including mushroom clouds made of nested groups.
  G.effects.length = 0;
  Object.assign(G, {
    paused: false, resumePhase: null, weaponCursor: 0, t: 0,
    log: [], lives: BASE_LIVES, barrels: 1, rate: 1, power: 1, twin: false, fireT: 0, charge: 0, kills: 0, time: 0, aim: 0, cx: 0, shake: 0,
    maxArmy: 0, bestCombo: 1, slow: 0, dmgAcc: 0, dmgTotal: 0, army: 0, squad: 0, nextMile: 1000, armyAvg: 0,
    chassis: 0, weapon: 0, weaponMask: 0, equipCursor: 0, aircraft: 0, airT: 2, airPass: 0, airTier: 0, airHit: false, shield: 0, guardFlash: 0, armorPopupT: 0, overdrive: 0, rank: 0,
  });
  setBarrels(1);
  cannon.setChassis(0); twinCannon.setChassis(0);
  cannon.group.visible = true;
  twinCannon.group.visible = false;
  enterStage(stageIdx);
  hud.root.classList.remove('hidden');
  $('menu').classList.add('hidden');
  $('result').classList.add('hidden');
  setHud('lvl', hud.level, `LEVEL ${idx + 1} · ${def.name.toUpperCase()}`);
  renderUps();
  canvas.focus({ preventScroll: true });
}
function setBarrels(n) {
  cannon.setBarrels(n); twinCannon.setBarrels(n);
  for (const c of squadCannons) c.setBarrels(n);
}
function addBall(S, root, x, z, hp, r, speed, def = {}) {
  const m = P.buildSwarmBall(r);
  m.group.position.set(x, r, z);
  root.add(m.group);
  const b = { def, x, z, px: x, pz: z, impact: 0, r0: r, r, hp, max: hp, speed, alive: true, model: m, label: makeLabel('ball'), delay: def.delay ?? 0, flash: 0 };
  S.balls.push(b);
  return b;
}
function enterStage(i) {
  G.snap = { stage: i, barrels: G.barrels, rate: G.rate, power: G.power, twin: G.twin, squad: G.squad, lives: G.lives, chassis: G.chassis, weapon: G.weapon, weaponMask: G.weaponMask, aircraft: G.aircraft, shield: G.shield };
  G.rad = 0; G.armyAvg = 0; G.overdrive = 0; G.airPass = 0; G.airTier = 0; G.airT = 2;
  for (const zn of G.zones) if (zn.mesh) { G.root.remove(zn.mesh); zn.mesh.geometry.dispose(); }
  G.zones.length = 0;
  G.stageIdx = i;
  G.stage = G.stages[i];
  G.shown = false;
  G.z0 = G.cannonZ = G.camZ = G.stage.z0;
  G.camLag = G.cx; G.prevCx = G.cx;
  G.phase = 'intro';
  G.phaseT = 0;
  const isBoss = !!G.stage.boss;
  banner(isBoss ? 'BOSS FIGHT!' : `STAGE ${i + 1}`, isBoss ? 'boss' : '', 1.5);
  const tip = tutorials.stageTip({ stage:G.stage,levelIndex:G.levelIdx,stageIndex:i,progress,debug:TURBO || params.has('level') || params.has('stage') });
  showTip(tip?.text);
  hud.hint.classList.toggle('hidden',tip?.id!=='aim');
  if (isBoss) sound.play('warn');
  spawnHordes(G.stage);
  renderPips();
}
function renderPips() {
  const n = G.stages.length;
  let html = '';
  for (let i = 0; i < n; i++) {
    const boss = !!G.stages[i].boss;
    const cls = i < G.stageIdx ? 'done' : i === G.stageIdx ? 'cur' : '';
    html += `<span class="pip ${cls} ${boss ? 'skull' : ''}">${boss ? '☠' : i + 1}</span>`;
  }
  hud.pips.innerHTML = html;
}
function renderUps() {
  labelBoundsDirty = true;
  let html = '';
  if (G.barrels > 1) html += `<span class="up">GUNS ×${G.barrels}</span>`;
  if (G.rate > 1) html += `<span class="up">RAPID ×${G.rate.toFixed(1)}</span>`;
  if (G.power > 1) html += `<span class="up pw">POWER ×${G.power}</span>`;
  if (G.twin) html += `<span class="up tw">TWIN</span>`;
  if (G.squad) html += `<span class="up sq">ESCORT ×${G.squad}</span>`;
  if (G.chassis) html += `<span class="up pw">${CHASSIS[G.chassis]}</span>`;
  if (G.weapon) {
    const count = WEAPON_SPECS.slice(1).filter((_, i) => G.weaponMask & (1 << (i + 1))).length;
    html += `<span class="up tw">${count > 1 ? 'ARSENAL ×' + count : WEAPONS[G.weapon]}</span>`;
  }
  if (G.aircraft) html += `<span class="up sq">${AIRCRAFT_SPECS[G.aircraft].label}</span>`;
  hud.ups.innerHTML = html;
}

// ---------------------------------------------------------------- simulation
function twinX() {
  let tx = -G.cx;
  if (Math.abs(tx - G.cx) < 1.7) tx = G.cx + (G.cx >= 0 ? -1.7 : 1.7);
  return clamp(tx, -XLIM + 0.2, XLIM - 0.2);
}
function cannonUnit(x, power, kind = 0) {
  const i = spawn(B,x,G.z0-(kind?1.9:1.7),power,kind);
  if (i >= 0) return i;
  let best = -1, dist = Infinity;
  for (let j = 0; j < B.n; j++) if (B.hp[j] > 0) {
    const d = Math.abs(B.x[j]-x)+Math.abs(B.z[j]-G.z0);
    if (d < dist) { dist = d; best = j; }
  }
  if (best >= 0) {
    B.hp[best] = Math.min(MAX_POWER,B.hp[best]+power);
    B.kind[best] = Math.max(B.kind[best],kind); B.flash[best] = .7;
  }
  return -1;
}
function fireFrom(cx, actor = cannon) {
  const sp = G.barrels > 4 ? 0.3 : 0.42;
  for (let b = 0; b < G.barrels; b++) {
    const off = (b - (G.barrels - 1) / 2) * sp;
    const power = G.power * (G.overdrive > 0 ? 2 : 1);
    const i = cannonUnit(clamp(cx+off+rand(-.06,.06),-XLIM,XLIM),power);
    if (i >= 0) { B.vz[i] = -BLUE_SPEED; B.flash[i] = 0.7; }
    if (!TURBO) {
      const barrel = actor.barrels.children[b];
      barrel.localToWorld(cannonMuzzle.set(0, 0, -1.245));
      cannonMuzzle.x += cx - actor.group.position.x;
      spark(cannonMuzzle.x, cannonMuzzle.y, cannonMuzzle.z, G.power >= 2 ? PCOL.gold : PCOL.ice, 1, 2.5, 1.3, .12, 0);
    }
  }
}
function fireCannon(dt) {
  G.fireT -= dt;
  const interval = BASE_INTERVAL / G.rate;
  while (G.fireT <= 0) {
    G.fireT += interval;
    fireFrom(G.cx);
    if (G.twin) fireFrom(twinX(), twinCannon);
    for (let k = 0; k < G.squad; k++) fireFrom(squadX(k), squadCannons[k]);
    G.charge++;
    if (G.charge >= CHARGE_MAX) {
      G.charge = 0;
      const i = cannonUnit(G.cx,GIANT_HP*G.power*(G.overdrive>0?2:1),1);
      if (i >= 0) { B.vz[i] = -GIANT_SPEED; B.flash[i] = 1; }
      burst(G.cx, 1.5, G.z0 - 1.5, PCOL.blue, 12, 5);
      sound.play('heavy');
    }
    G.recoil = 1;
    sound.play('shoot');
  }
}

function shotBlocked(S, x, z, tx, tz) {
  for (const g of S.gates) {
    if (!g.alive || g.on === false || !(BLOCKERS.has(g.def.t) || REDGATES.has(g.def.t)) || g.z <= Math.min(z, tz) || g.z >= Math.max(z, tz)) continue;
    const at = x + (tx - x) * ((g.z - z) / (tz - z));
    if (Math.abs(at - g.x) < g.w / 2) return true;
  }
  for (const w of S.walls) {
    if ((x - w.x) * (tx - w.x) >= 0) continue;
    const at = z + (tz - z) * ((w.x - x) / (tx - x));
    if (at < w.zBot && at > w.zTop) return true;
  }
  return false;
}
function rangedHit(target, damage) {
  if (!target || !target.alive || target.hp <= 0) return;
  const d = Math.min(target.hp, damage);
  target.hp -= d; target.flash = 1; G.dmgTotal += d;
  if (target === G.stage.tower || target === G.stage.boss) G.dmgAcc += d;
}
function nearestVisibleRed(S, x, z, range, excluded = null, forwardOnly = true) {
  let best = range * range, index = -1;
  const left = cellX(x - range), right = cellX(x + range);
  const front = cellZ(z + range), back = cellZ(z - range);
  for (let row = front; row <= back; row++) for (let col = left; col <= right; col++) {
    for (let j = gR.head[row * GCOLS + col]; j !== -1; j = gR.next[j]) {
      if (R.hp[j] <= 0 || excluded?.has(j) || forwardOnly && R.z[j] >= z) continue;
      const d2 = (R.x[j] - x) ** 2 + (R.z[j] - z) ** 2;
      if (d2 < best && !shotBlocked(S, x, z, R.x[j], R.z[j])) { best = d2; index = j; }
    }
  }
  return index;
}
function hitArmedRed(j, damage, spec, troopPower) {
  if (R.hp[j] <= 0) return;
  R.hp[j] -= damage; R.flash[j] = 1; R.st[j] = 0;
  if (R.hp[j] <= 0) { killRed(j); return; }
  if (spec.burn) {
    R.burn[j] = spec.burn;
    R.burnDamage[j] = Math.max(R.burnDamage[j], troopPower * .09);
  }
  if (spec.chill) R.chill[j] = spec.chill;
}
function redLift(i) {
  const type = RED_TYPES[R.kind[i]], phase = R.phase[i];
  if (type.fly) return (.8 + Math.sin(phase * .45) * .12) * R.sc[i];
  if (type.ghost) return (.22 + Math.sin(phase * .5) * .05) * R.sc[i];
  return 0;
}
function redAimY(i) { return redLift(i) + .7 * R.sc[i]; }
function updateArsenal(S, dt) {
  let budget = 5, searches = 0;
  for (let i = 0; i < B.n; i++) B.shot[i] -= dt;
  const cursor = (G.weaponCursor || 0) % Math.max(1, B.n);
  for (let offset = 0; offset < B.n && budget > 0; offset++) {
    const i = (cursor + offset) % B.n;
    G.weaponCursor = i + 1;
    if (B.hp[i] <= 0 || !B.weapon[i] || B.adur[i] > 0 || B.shot[i] > 0) continue;
    if (searches++ >= 48) break;
    const x = B.x[i], z = B.z[i], spec = WEAPON_SPECS[B.weapon[i]];
    if (!spec) continue;
    const { range, color } = spec, damage = B.hp[i] * spec.damage;
    // Balls intercept direct fire, including shots fired before they start rolling.
    const ball = S.balls.find(b => b.alive && b.hp > 0 && b.z < z && Math.hypot(b.x - x, b.z - z) < range + b.r && !shotBlocked(S, x, z, b.x, b.z));
    let j = ball ? -1 : nearestVisibleRed(S, x, z, range);
    const target = !ball && j < 0 ? [S.tower, S.boss, ...S.spawners, ...S.turrets].find(t => t?.alive && t.hp > 0 && t.z < z && Math.hypot((t.x ?? 0) - x, t.z - z) < range + 2 && !shotBlocked(S, x, z, t.x ?? 0, t.z)) : null;
    if (!ball && j < 0 && !target) { B.shot[i] = .12; continue; }
    B.shot[i] = spec.cooldown; budget--;
    B.flash[i] = Math.max(B.flash[i], .25);
    const angle = Math.atan2(B.vx[i], B.vz[i]), scale = B.sc[i];
    const sx = x + (.35 * Math.cos(angle) + .72 * Math.sin(angle)) * scale;
    const sz = z + (-.35 * Math.sin(angle) + .72 * Math.cos(angle)) * scale, sy = .68 * scale;
    const width = spec.burn ? .18 : spec.pierce ? .045 : spec.key === 'plasma' ? .14 : .08;
    spark(sx, sy, sz, WEAPON_RGB[B.weapon[i]], 1, .4, spec.burn ? .5 : .3, .09, 0);
    if (!TURBO) sound.play('weapon', B.weapon[i]);
    if (ball) {
      rangedHit(ball, damage); ball.impact = .15;
      if (spec.chill) ball.chill = spec.chill;
      addBeam(sx, sy, sz, ball.x, ball.r, ball.z, color, .09, width);
      if (ball.hp <= 0) ballDies(S, ball, false);
      continue;
    }
    if (j < 0) {
      rangedHit(target, damage * (S.breach || 1));
      addBeam(sx, sy, sz, target.x ?? 0, 2, target.z, color, .08, width);
      continue;
    }
    const tx = R.x[j], tz = R.z[j], ty = redAimY(j), primary = j;
    addBeam(sx, sy, sz, tx, ty, tz, color, .09, width);
    hitArmedRed(j, damage, spec, B.hp[i]);
    if (spec.splash) {
      addRing(tx, tz, spec.splash, color, .2);
      for (let k = 0; k < R.n; k++) if (k !== primary && R.hp[k] > 0 && (R.x[k] - tx) ** 2 + (R.z[k] - tz) ** 2 < spec.splash ** 2 && !shotBlocked(S, tx, tz + .01, R.x[k], R.z[k])) {
        hitArmedRed(k, damage * .65, spec, B.hp[i]);
      }
    } else if (spec.chain) {
      const visited = new Set([j]);
      let fromX = tx, fromY = ty, fromZ = tz;
      for (let chain = 0; chain < spec.chain; chain++) {
        j = nearestVisibleRed(S, fromX, fromZ, 3.5, visited, false);
        if (j < 0) break;
        visited.add(j);
        addBeam(fromX, fromY, fromZ, R.x[j], redAimY(j), R.z[j], color, .12);
        hitArmedRed(j, damage * .7, spec, B.hp[i]);
        fromX = R.x[j]; fromY = redAimY(j); fromZ = R.z[j];
      }
    } else if (spec.cone || spec.pierce) {
      const distance = Math.hypot(tx - x, tz - z), dx = (tx - x) / distance, dz = (tz - z) / distance;
      const candidates = [];
      for (let k = 0; k < R.n; k++) {
        if (k === primary || R.hp[k] <= 0) continue;
        const rx = R.x[k] - x, rz = R.z[k] - z;
        const along = rx * dx + rz * dz, side = Math.abs(rx * dz - rz * dx);
        const d = Math.hypot(rx, rz);
        const inside = spec.pierce ? along > distance && along < range && side < .55 : along > 0 && d < range && along / d > spec.cone;
        if (inside && !shotBlocked(S, x, z, R.x[k], R.z[k])) candidates.push({ k, distance: d });
      }
      candidates.sort((a, b) => a.distance - b.distance);
      const count = (spec.targets || spec.pierce) - 1;
      for (const { k } of candidates.slice(0, count)) {
        hitArmedRed(k, damage * (spec.pierce ? .8 : .75), spec, B.hp[i]);
        addBeam(sx, sy, sz, R.x[k], redAimY(k), R.z[k], color, spec.burn ? .16 : .09, width);
      }
    }
  }
  if (!G.aircraft) return;
  G.airT -= dt;
  if (G.airT <= 0 && G.airPass <= 0) {
    G.airTier = G.aircraft;
    G.airT = 7 / Math.sqrt(G.airTier); G.airPass = 2.2; G.airHit = false; G.airX = G.cx;
    popup(AIRCRAFT_SPECS[G.airTier].label.toUpperCase(), 'combo c1', G.cx, 4, G.z0 - 12, .9);
    if (!TURBO) sound.play('flyby', G.airTier);
  }
  if (G.airPass <= 0) return;
  G.airPass -= dt;
  if (G.airPass < 0.85 && !G.airHit) {
    G.airHit = true;
    const spec = AIRCRAFT_SPECS[G.airTier || G.aircraft];
    const damage = Math.max(20 * G.power, G.armyAvg * .16) * spec.damage;
    for (let j = 0; j < R.n; j++) if (R.hp[j] > 0 && Math.abs(R.x[j] - G.airX) < spec.width) {
      R.hp[j] -= damage; if (R.hp[j] <= 0) killRed(j); else R.flash[j] = 1;
    }
    for (const ball of S.balls) if (ball.alive && Math.abs(ball.x - G.airX) < ball.r + spec.width - 1) {
      rangedHit(ball, damage * 2); if (ball.hp <= 0) ballDies(S, ball, false);
    }
    const target = S.tower?.alive ? S.tower : S.boss;
    if (target?.alive) rangedHit(target, Math.min(target.max * spec.fortCap, damage * 2));
    for (const t of [...S.spawners, ...S.turrets]) if (Math.abs(t.x - G.airX) < spec.width) rangedHit(t, damage);
    for (let k = 0; k < 5; k++) {
      const z = G.z0 - 17 - k * 8;
      addBeam(G.airX, 7, z, G.airX, 0.3, z, 0xffcf65, 0.16);
      addRing(G.airX, z, spec.radius, 0xffb34a, .45);
      burst(G.airX, 0.5, z, PCOL.orange, 12, 4);
    }
    G.shake = Math.max(G.shake, 0.2); sound.play('boom');
  }
}

function wallClamp(S, px, x, z) {
  for (const w of S.walls) {
    if (z < w.zTop - 0.4 || z > w.zBot + 0.4) continue;
    const side = px >= w.x ? 1 : -1;
    if ((x - w.x) * side < 0.32) x = w.x + side * 0.32;
  }
  return x;
}
function sawHit(S, x, z) {
  for (const s of S.saws) if (Math.abs(z - s.z) < 0.45 && Math.abs(x - s.x) < s.r + 0.2) return s;
  return null;
}

function killBlue(i, fx = true) {
  if (fx) burst(B.x[i], 0.5, B.z[i], PCOL.blue, B.kind[i] || B.hp[i] > 30 ? 10 : 3, 3.5);
  B.hp[i] = 0;
}
// damage that scales with unit power: big units survive, but traps still bite
function hurt(i, flat, frac) {
  B.hp[i] -= flat + B.hp[i] * frac;
  if (B.hp[i] <= 0) killBlue(i);
}
function killRed(i) {
  const k = R.kind[i], T = RED_TYPES[k];
  const big = !!T.big;
  burst(R.x[i], 0.5, R.z[i], k === 1 ? PCOL.gold : k === 6 ? PCOL.pink : k === 9 ? PCOL.white : k === 10 ? PCOL.sand : PCOL.red, big ? 14 : 3, big ? 5 : 3.5);
  R.hp[i] = 0;
  G.kills++;
  if (big) spark(R.x[i], 1.2, R.z[i], PCOL.gold, 10, 6, 1, 0.5);
  if (T.boom) G.explosions.push(R.x[i], R.z[i], R.mx[i]);
  if (T.split) G.splits.push(R.x[i], R.z[i], R.mx[i]);
  if (T.revive) G.revives.push({ x: R.x[i], z: R.z[i], hp: R.mx[i], t: 1.3 });
  sound.play('pop');
}

function comboCheck(S, i, gx, gz) {
  const cm = B.cm[i];
  if (cm > G.bestCombo) G.bestCombo = cm;
  if (cm < S.comboNext) return;
  S.comboNext = 10 ** (Math.floor(Math.log10(cm)) + 1);
  const tier = cm >= 1e9 ? 4 : cm >= 1e6 ? 3 : cm >= 1000 ? 2 : 1;
  popup(`COMBO x${fmt(cm)}!`, 'combo c' + tier, gx, 3.2, gz, 1.4);
  sound.play('combo', tier);
  if (tier >= 2) G.shake = Math.max(G.shake, 0.25 * tier);
  spark(gx, 2.2, gz, tier >= 4 ? PCOL.pink : tier >= 3 ? PCOL.gold : PCOL.purple, 8 + tier * 8, 6 + tier * 2, 1 + tier * 0.25, 0.7);
  G.kick = Math.max(G.kick || 0, 0.25 * tier);
  if (tier >= 3) { burst(gx, 2, gz, tier >= 4 ? PCOL.pink : PCOL.gold, 30, 8); }
}
function applyGate(S, g, i) {
  const c = g.cur;
  if (g.flash < 0.5) spark(B.x[i], 1.2, g.z, c.t === 'div' ? PCOL.red : PCOL.white, 3, 3, 0.7, 0.35, -4);
  g.flash = 1;
  g.passes = (g.passes || 0) + 1;
  sound.play('gate');
  let f;
  if (c.t === 'div') {
    if (B.hp[i] > 1.5) B.hp[i] /= c.v; else if (Math.random() < 1 - 1 / c.v) killBlue(i);
    return;
  }
  if (c.t === 'mul') f = c.v * g.boost;
  else if (c.t === 'add') f = c.v * g.boost + 1;
  else if (c.t === 'charge') {
    f = g.val * g.boost;
    g.fed += B.hp[i];
    const nv = Math.min(c.max, c.v + Math.floor(g.fed / c.per));
    if (nv !== g.val) { g.val = nv; burst(g.x, 2.2, g.z, PCOL.green, 6, 4); }
    g.dirty = true;
  } else return;
  if (f <= 1) return;
  const total = B.hp[i] * f;
  const cm = Math.min(1e37, B.cm[i] * f);
  // keep RESERVE slots free for the cannon: past that, power is folded into bigger units instead
  const n = Math.max(0, Math.min(Math.round(f) - 1, (S.def.surge ? 620 : 420) - B.n, B.N - RESERVE - B.n, SPLIT_MAX));
  const share = Math.min(MAX_POWER, total / (n + 1));
  B.hp[i] = share; B.cm[i] = cm; B.flash[i] = 1;
  const lo = g.x - g.w / 2 + 0.25, hi = g.x + g.w / 2 - 0.25;
  for (let k = 0; k < n; k++) {
    const j = spawn(B, clamp(B.x[i] + rand(-0.6, 0.6), lo, hi), B.z[i] - Math.random() * 0.8, share, B.kind[i], B.mask[i], B.mask2[i]);
    // copies inherit the loop counter too, or they could loop forever
    B.vx[j] = B.vx[i] + rand(-1.5, 1.5); B.vz[j] = B.vz[i]; B.flash[j] = 1; B.cm[j] = cm; B.stk[j] = B.stk[i]; B.weapon[j] = B.weapon[i];
  }
  comboCheck(S, i, g.x, g.z);
}
function unlockWeapon(weapon) {
  G.weapon = weapon; G.weaponMask |= 1 << weapon;
  for (let i = 0; i < B.n; i++) B.weapon[i] = nextTroopWeapon();
}
function upgradeCannon(up) {
  if (up === 'barrel') { G.barrels = Math.min(6, G.barrels + 2); setBarrels(G.barrels); banner('+2 GUNS!', 'gold'); }
  else if (up === 'squad') { G.squad = Math.min(SQUAD_OFF.length, G.squad + 1); G.shield = Math.min(6, G.shield + 2); banner('ESCORT ONLINE!', 'gold'); buzz(80); }
  else if (up === 'rapid') { G.rate = Math.min(8, G.rate * 2); banner(`RAPID x${G.rate}!`, 'gold'); }
  else if (up === 'power') { G.power = Math.min(243, G.power * 3); banner(`POWER x${G.power}!`, 'gold'); }
  else if (up === 'twin') { G.twin = true; twinCannon.group.visible = true; G.shield = Math.min(6, G.shield + 1); banner('TWIN CANNON!', 'gold'); }
  else if (up === 'tank' || CHASSIS_IDS[up]) {
    G.chassis = Math.min(CHASSIS.length - 1, Math.max(G.chassis, up === 'tank' ? G.chassis + 1 : CHASSIS_IDS[up]));
    const spec = CHASSIS_SPECS[G.chassis];
    G.power = Math.min(243, G.power * spec.power);
    G.barrels = Math.min(6, G.barrels + spec.guns); G.shield = Math.min(6, G.shield + spec.armor);
    G.rate = Math.max(G.rate, spec.rate || 1);
    if (spec.weapon) unlockWeapon(spec.weapon);
    if (spec.aircraft) { G.aircraft = Math.min(3, G.aircraft + spec.aircraft); G.airT = .2; }
    setBarrels(G.barrels); cannon.setChassis(G.chassis); twinCannon.setChassis(G.chassis);
    addRing(G.cx, G.cannonZ, 3.5, 0x8beaff, .5);
    burst(G.cx, .6, G.cannonZ, PCOL.gold, 16, 3);
    banner(CHASSIS[G.chassis].toUpperCase() + '!', 'gold');
  } else if (up === 'air') { G.aircraft = Math.min(3, G.aircraft + 1); G.airT = .2; banner(AIRCRAFT_SPECS[G.aircraft].label.toUpperCase() + ' ONLINE!', 'gold'); }
  else {
    const weapon = WEAPON_IDS[up];
    if (!weapon) return;
    unlockWeapon(weapon);
    banner(WEAPONS[G.weapon].toUpperCase() + ' ONLINE!', 'gold');
  }
  G.cannonPulse = 1; renderUps();
}
// NUKE: wipes every enemy (and irradiates the field so new ones melt for a few seconds), flattens turrets, spawners,
// enemy gates and swarm balls, blasts half the fort/boss, stuns the boss and pumps your army x5
function detonateNuke(S, g, mult = 5, label = 'NUKE! ARMY x5') {
  whiteFlash();
  buzz([120, 60, 220]);
  for (let i = 0; i < R.n; i++) if (R.hp[i] > 0) { burst(R.x[i], 0.6, R.z[i], PCOL.orange, 2, 6); R.hp[i] = 0; G.kills++; }
  G.explosions.length = 0; G.splits.length = 0; G.revives.length = 0;
  G.rad = 4;
  for (const s of [...S.spawners, ...S.turrets]) if (s.alive) { s.hp = 0; s.flash = 1; }
  for (const q of S.gates) if (q.alive && REDGATES.has(q.def.t)) { q.alive = false; q.dying = 1; burst(q.x, 1, q.z, PCOL.gold, 20, 6); }
  for (const b of S.balls) if (b.alive) b.hp = 0;
  for (const e of G.effects) if (e.kind === 'tele') { e.life = Math.min(e.life, 0.01); e.onHit = () => {}; }
  const T = S.tower && S.tower.alive ? S.tower : S.boss && S.boss.alive ? S.boss : null;
  // only the first blast of each nuke hits the fort/boss (refills still pump the army and clear the field)
  if (T && g && !g.blasts) {
    const d = T.max * (g.def.dmg ?? 0.5);
    T.hp -= d; T.flash = 1; G.dmgAcc += d; G.dmgTotal += d;
    if (T === S.boss) { T.z = T.startZ; T.stun = 6; T.atkT = Math.max(T.atkT, 6.5); }
    burst(T.x ?? 0, 4, T.z, PCOL.orange, 60, 12, 1.6);
    popup('-' + fmt(d) + '!', 'combo c4', T.x ?? 0, 7, T.z, 1.8);
  }
  for (let i = 0; i < B.n; i++) if (B.hp[i] > 0) { B.hp[i] = Math.min(MAX_POWER, B.hp[i] * mult); B.cm[i] = Math.min(1e37, B.cm[i] * mult); B.flash[i] = 1; }
  if (!TURBO) {
    addRing(0, G.z0 - 30, 40, 0x9aff5a, 0.9);
    addRing(0, G.z0 - 30, 25, 0xffffff, 0.6);
    debris.burst(0, 1, G.z0 - 30, [PCOL.green, PCOL.orange, PCOL.white], 30, 12, 2, 12, 0.5);
    G.effects.push({ kind: 'mush', mesh: M.buildMushroom(), life: 2.2, max: 2.2, z: G.z0 - 30 });
    G.root.add(G.effects[G.effects.length - 1].mesh);
  }
  for (let k = 0; k < 8; k++) burst(rand(-6, 6), 1, G.z0 - rand(10, 50), PCOL.green, 14, 9, 1.4);
  G.shake = 1.4; G.kick = 1;
  for (let k = 0; k < 6; k++) spark(rand(-6, 6), 1, G.z0 - rand(8, 55), PCOL.green, 20, 9, 1.4, 0.9);
  banner(label, 'gold', 1.6);
  sound.play('nuke');
  // a nuke recharges for 6 s and burns out after 3 blasts, so the x5 can't chain into infinity
  if (g) {
    g.need = Math.round(g.need * 6); g.prog = 0; g.blasts = (g.blasts || 0) + 1; g.coolUntil = S.time + 6;
    if (g.blasts >= 3) { g.alive = false; g.dying = 1; }
  }
}
function starPower(S, g) {
  for (const q of S.gates) {
    const t = q.def.t;
    // each gate tops out at x8 (three stars), so stars stay explosive without running off to infinity
    if (!q.alive || !(t === 'mul' || t === 'add' || t === 'charge' || t === 'flip') || q.boost >= 8) continue;
    q.boost *= 2; q.dirty = true; q.flash = 1;
    burst(q.x, 2, q.z, PCOL.pink, 10, 5);
    spark(q.x, 1.5, q.z, PCOL.pink, 14, 6, 1.1, 0.7);
    popup('x2!', 'combo c2', q.x, 2.6, q.z, 1.0);
  }
  for (let i = 0; i < B.n; i++) {
    if (B.hp[i] <= 0) continue;
    B.hp[i] = Math.min(MAX_POWER, B.hp[i] * 2); B.cm[i] = Math.min(1e37, B.cm[i] * 2); B.flash[i] = 1;
    if (i % 4 === 0) burst(B.x[i], 1, B.z[i], PCOL.pink, 2, 4);
  }
  G.shake = Math.max(G.shake, 0.6);
  banner('ALL GATES x2!', 'pink', 1.4);
  sound.play('star');
  g.need = Math.round(g.need * 3);
  g.prog = 0;
  // a star burns out after three uses
  g.uses = (g.uses || 0) + 1;
  if (g.uses >= 3) { g.alive = false; g.dying = 1; burst(g.x, 1.5, g.z, PCOL.pink, 40, 7); }
}
// blockers soak up power and break; absorbers fill up and trigger an effect
function absorb(S, g, i) {
  const t = g.def.t;
  g.flash = 1;
  g.dirty = true;
  if (ABSORBERS.has(t)) {
    if (t === 'nuke' && g.coolUntil > S.time) return; // recharging: units walk straight through
    const d = Math.min(B.hp[i], g.need - g.prog);
    B.hp[i] -= d; g.prog += d;
    if (B.hp[i] <= 0) burst(B.x[i], 0.8, B.z[i], t === 'star' ? PCOL.pink : t === 'nuke' ? PCOL.green : PCOL.gold, 2, 2.5);
    if (g.prog >= g.need) {
      burst(g.x, 1.5, g.z, t === 'star' ? PCOL.pink : t === 'nuke' ? PCOL.green : PCOL.gold, 40, 7);
      if (t === 'upgrade' || t === 'hangar') {
        g.alive = false; g.dying = 1;
        upgradeCannon(t === 'hangar' ? 'air' : g.cur.up);
        burst(G.cx, 1.5, G.z0, PCOL.gold, 30, 6);
        if (!TURBO) sparks.stream(g.x, 1.5, g.z, G.cx, 1.4, G.cannonZ, PCOL.gold, 60, 0.5, 1.2);
        G.cannonPulse = 1;
        sound.play('upgrade');
      } else if (t === 'nuke') detonateNuke(S, g);
      else if (t === 'heart') {
        const v = g.def.v ?? 1;
        G.lives = Math.min(MAX_LIVES, G.lives + v);
        banner(`+${v} ♥`, 'pink', 1.2);
        popup(`+${v} ♥`, 'combo c3', G.cx, 2.5, G.cannonZ - 2, 1.2);
        if (!TURBO) { sparks.stream(g.x, 1.5, g.z, G.cx, 1.4, G.cannonZ, PCOL.pink, 50, 0.5, 1.2); hud.lives.classList.remove('hit'); void hud.lives.offsetWidth; hud.lives.classList.add('hit'); }
        sound.play('upgrade');
        g.need = Math.round(g.need * 2.5); g.prog = 0;
      } else if (t === 'tesla') {
        g.active = true; g.zapT = 0.2;
        banner('TESLA ONLINE!', 'gold', 1.2);
        if (!TURBO) g.model.setColor(0x9af6ff);
        sound.play('upgrade');
      } else starPower(S, g);
    }
    return;
  }
  const d = Math.min(B.hp[i], g.hp);
  B.hp[i] -= d; g.hp -= d;
  const col = t === 'ice' ? PCOL.ice : t === 'fence' ? PCOL.metal : t === 'statue' ? PCOL.sand : REDGATES.has(t) ? PCOL.gold : PCOL.red;
  if (B.hp[i] <= 0) burst(B.x[i], 0.8, B.z[i], col, 2, 2.5);
  if (g.hp <= 0) {
    g.alive = false; g.dying = 1;
    burst(g.x, 1, g.z, col, 60, 8);
    if (!TURBO) debris.burst(g.x, 0.5, g.z, [col, col, PCOL.white], 18, g.w, 1.8, 7, 0.35);
    spark(g.x, 1.2, g.z, col, 20, 7, 1, 0.6);
    sound.play('boom');
    G.shake = Math.max(G.shake, 0.4);
    popup('BROKEN!', 'combo c1', g.x, 2.5, g.z, 1.0);
  }
}
// trampoline: fly over walls, gates and traps, land in another lane
function launch(i, tx, tz, dur) {
  B.ax0[i] = B.x[i]; B.az0[i] = B.z[i]; B.ax1[i] = clamp(tx, -XLIM, XLIM); B.az1[i] = tz; B.air[i] = 0; B.adur[i] = dur;
}
function jump(S, g, i) {
  const to = g.def.to, tz = S.z0 - to.d + rand(-0.6, 0.6);
  launch(i, to.x + rand(-0.8, 0.8), tz, clamp(Math.hypot(to.x - B.x[i], tz - B.z[i]) / 12, 0.6, 1.4));
  if (g.flash < 0.5) { spark(g.x, 0.6, g.z, PCOL.ice, 4, 4, 1, 0.4, 2); sound.play('warp'); }
  g.flash = 1;
}
// loop: warp back to the start with every gate "unused" again, so the whole road multiplies twice
function loop(S, g, i) {
  if (B.stk[i] >= (g.def.max ?? 1)) return false;
  B.stk[i]++;
  B.mask[i] = 0; B.mask2[i] = 0;
  teleport(S, g, i);
  return true;
}
function teleport(S, g, i) {
  const to = g.def.to;
  const x = clamp(to.x + rand(-0.7, 0.7), -XLIM, XLIM), z = S.z0 - to.d;
  burst(B.x[i], 1, B.z[i], PCOL.pink, 1, 3);
  B.x[i] = B.px[i] = x; B.z[i] = B.pz[i] = z;
  B.vx[i] = 0; B.flash[i] = 1;
  burst(x, 0.6, z, PCOL.pink, 1, 3);
  if (g.flash < 0.5) { spark(g.x, 1.3, g.z, PCOL.pink, 4, 3, 1, 0.4, 0); spark(x, 0.8, z, PCOL.pink, 4, 3, 1, 0.4, 2); }
  g.flash = 1;
  sound.play('warp');
}

function damageTarget(t, i, col) {
  const d = B.hp[i] * ((t === G.stage.tower || t === G.stage.boss) ? G.stage.breach || 1 : 1);
  t.hp -= d;
  t.flash = 1;
  G.dmgAcc += d; G.dmgTotal += d;
  burst(B.x[i], 1, B.z[i], col, B.kind[i] || d > 30 ? 8 : 2, 3);
  if (Math.random() < 0.35 || d > 1000) spark(B.x[i], 1.2 + Math.random() * 2, B.z[i] + 0.4, d > 1000 ? PCOL.gold : PCOL.white, d > 1000 ? 5 : 2, 5, 0.9, 0.35);
  B.hp[i] = 0;
}

// Spend only the power absorbed by a pillar or ball. Surviving troops keep the remainder.
function hitThing(t, i, col) {
  const damage = Math.min(t.hp, B.hp[i]);
  if (damage <= 0) return;
  t.hp -= damage; B.hp[i] -= damage; t.flash = 1;
  G.dmgTotal += damage;
  burst(B.x[i], 1, B.z[i], col, B.kind[i] || damage > 30 ? 6 : 2, 3);
}
function collideBalls(S, i) {
  for (const ball of S.balls) {
    if (!ball.alive || ball.hp <= 0) continue;
    if (!sweptCircle(B.px[i], B.pz[i], B.x[i], B.z[i], ball.px, ball.pz, ball.x, ball.z, ball.r + B.rad[i])) continue;
    hitThing(ball, i, PCOL.red); ball.impact = 0.22;
    if (ball.hp <= 0) ballDies(S, ball, false);
    if (B.hp[i] <= 0) return;
  }
}
function moveBlue(S, dt) {
  const boss = S.boss && S.boss.alive ? S.boss : null;
  const tower = S.tower && S.tower.alive ? S.tower : null;
  const k = Math.min(1, dt * 5);
  for (let i = 0; i < B.n; i++) {
    if (B.hp[i] <= 0) continue;
    if (B.adur[i] > 0) {
      // airborne: follow the arc, ignore everything until landing
      B.air[i] += dt;
      const p = Math.min(1, B.air[i] / B.adur[i]);
      B.x[i] = B.px[i] = B.ax0[i] + (B.ax1[i] - B.ax0[i]) * p;
      B.z[i] = B.pz[i] = B.az0[i] + (B.az1[i] - B.az0[i]) * p;
      B.phase[i] += dt * 20;
      if (p >= 1) { B.adur[i] = 0; B.vx[i] = 0; B.vz[i] = -BLUE_SPEED; if (i % 3 === 0) burst(B.x[i], 0.3, B.z[i], PCOL.ice, 2, 2.5); }
      continue;
    }
    const giant = B.kind[i] === 1;
    let sp = giant ? GIANT_SPEED : BLUE_SPEED;
    let x = B.x[i], z = B.z[i];
    for (const zn of G.zones) if (Math.abs(x - zn.x) < zn.w / 2 && Math.abs(z - zn.z) < zn.d / 2) sp *= 0.3;
    let dx = 0, dz = -1;
    if (seek(cR, x, z, 9, -1)) {
      const tx = TX - x, tz = TZ - z, d = Math.hypot(tx, tz) || 1;
      dx = tx / d; dz = Math.min(tz / d, -0.35);
    } else if (boss && z < G.z0 - 34) {
      // past the gates: home in on the boss (never pull units out of their lane before the gates)
      dx = clamp((boss.x - x) * 0.1, -0.6, 0.6);
    }
    const n = Math.hypot(dx, dz);
    B.vx[i] += (dx / n * sp - B.vx[i]) * k;
    B.vz[i] += (dz / n * sp - B.vz[i]) * k;
    // separation from neighbours
    let pxs = 0, pzs = 0;
    const cx = cellX(x), cz = cellZ(z), ri = B.rad[i];
    for (let gz = cz - 1; gz <= cz + 1; gz++) {
      if (gz < 0 || gz >= GROWS) continue;
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        if (gx < 0 || gx >= GCOLS) continue;
        let j = gB.head[gz * GCOLS + gx];
        while (j !== -1) {
          if (j !== i) {
            const ddx = x - B.x[j], ddz = z - B.z[j], d2 = ddx * ddx + ddz * ddz;
            const md = Math.min(1.4, (ri + B.rad[j]) * 0.85);
            if (d2 < md * md && d2 > 1e-6) { const d = Math.sqrt(d2), f = (md - d) / d * 0.3; pxs += ddx * f; pzs += ddz * f; }
          }
          j = gB.next[j];
        }
      }
    }
    B.px[i] = x; B.pz[i] = z;
    x += B.vx[i] * dt + clamp(pxs, -0.12, 0.12);
    z += B.vz[i] * dt + clamp(pzs, -0.08, 0.08);
    for (const bt of S.belts) if (z > bt.zTop && z < bt.zBot && Math.abs(x - bt.x) < bt.w / 2) x += bt.v * dt;
    x = wallClamp(S, B.px[i], clamp(x, -XLIM, XLIM), z);
    B.x[i] = x; B.z[i] = z;
    B.phase[i] += dt * (giant ? 9 : 15);
    if (B.flash[i] > 0) B.flash[i] -= dt * 2.5;

    // Balls intercept troops before gates, combat and the fort, including during deployment delay.
    collideBalls(S, i);
    if (B.hp[i] <= 0) continue;
    // gates
    const pz = B.pz[i];
    for (const g of S.gates) {
      if (!g.alive || !g.on || !(pz > g.z && z <= g.z) || Math.abs(x - g.x) > g.w / 2 + 0.05) continue;
      const t = g.def.t;
      if (t === 'tesla' && g.active) continue;
      if (BLOCKERS.has(t) || ABSORBERS.has(t) || REDGATES.has(t)) { absorb(S, g, i); if (B.hp[i] <= 0) break; continue; }
      if (t === 'portal') { teleport(S, g, i); break; }
      if (t === 'loop') { if (loop(S, g, i)) break; continue; }
      if (t === 'jump') { jump(S, g, i); break; }
      if (g.hi ? B.mask2[i] & g.bit : B.mask[i] & g.bit) continue;
      if (g.hi) B.mask2[i] |= g.bit; else B.mask[i] |= g.bit;
      applyGate(S, g, i);
      if (B.hp[i] <= 0) break;
    }
    if (B.hp[i] <= 0 || B.adur[i] > 0) continue;
    x = B.x[i]; z = B.z[i];
    if (S.saws.length && sawHit(S, x, z)) { hurt(i, 4, 0.12); if (B.hp[i] <= 0) continue; }
    for (const p of S.pillars) if (p.alive && Math.abs(x - p.x) < 1.05 && Math.abs(z - p.z) < 1.05) { hitThing(p, i, PCOL.sand); break; }
    if (B.hp[i] <= 0) continue;
    // targets
    if (tower && z <= tower.z + 1.1) { damageTarget(tower, i, PCOL.red); continue; }
    for (const s of S.spawners) {
      if (s.alive && Math.abs(x - s.x) < 1.6 && Math.abs(z - s.z) < 1.6) { damageTarget(s, i, PCOL.ice); break; }
    }
    if (B.hp[i] <= 0) continue;
    for (const s of S.turrets) {
      if (s.alive && Math.abs(x - s.x) < 1.3 && Math.abs(z - s.z) < 1.3) { damageTarget(s, i, PCOL.metal); break; }
    }
    if (B.hp[i] <= 0) continue;
    if (boss) {
      const R0 = boss.model.radius;
      if (Math.abs(x - boss.x) < R0 * 1.15 && z < boss.z + R0 * 0.8) {
        // every hit knocks the boss back a little: a strong army holds it off
        boss.z = Math.max(boss.startZ, boss.z - Math.min(2, (B.hp[i] / boss.max) * boss.push));
        damageTarget(boss, i, PCOL.orange);
        continue;
      }
    }
    if (z < G.z0 - 75) B.hp[i] = 0;
  }
}

function moveRed(S, dt) {
  const k = Math.min(1, dt * 4);
  for (let i = 0; i < R.n; i++) {
    if (R.hp[i] <= 0) continue;
    if (R.burn[i] > 0) {
      R.hp[i] -= R.burnDamage[i] * Math.min(dt, R.burn[i]);
      R.burn[i] = Math.max(0, R.burn[i] - dt);
      if (R.burn[i] === 0) R.burnDamage[i] = 0;
      if (R.hp[i] <= 0) { killRed(i); continue; }
    }
    const slow = R.chill[i] > 0 ? .42 : 1;
    R.chill[i] = Math.max(0, R.chill[i] - dt);
    const T = RED_TYPES[R.kind[i]];
    let x = R.x[i], z = R.z[i];
    R.age[i] += dt;
    if (R.st[i]) {
      // sleeping horde: wakes up when blue units come close, when hit, or on its timer
      R.phase[i] += dt * 2;
      if (R.flash[i] > 0) R.flash[i] -= dt * 4;
      if ((R.wake[i] > 0 && S.time >= R.wake[i]) || R.flash[i] > 0 || seek(cB, x, z, 6.5, 1)) R.st[i] = 0;
      else continue;
    }
    let dx = 0, dz = 1;
    if (seek(cB, x, z, 8, 1)) {
      const tx = TX - x, tz = TZ - z, d = Math.hypot(tx, tz) || 1;
      dx = tx / d; dz = Math.max(tz / d, 0.35);
    }
    const n = Math.hypot(dx, dz);
    R.vx[i] += (dx / n * T.speed * slow - R.vx[i]) * k;
    R.vz[i] += (dz / n * T.speed * slow - R.vz[i]) * k;
    let pxs = 0, pzs = 0;
    const cx = cellX(x), cz = cellZ(z), ri = R.rad[i];
    for (let gz = cz - 1; gz <= cz + 1; gz++) {
      if (gz < 0 || gz >= GROWS) continue;
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        if (gx < 0 || gx >= GCOLS) continue;
        let j = gR.head[gz * GCOLS + gx];
        while (j !== -1) {
          if (j !== i) {
            const ddx = x - R.x[j], ddz = z - R.z[j], d2 = ddx * ddx + ddz * ddz;
            const md = ri + R.rad[j] + 0.05;
            if (d2 < md * md && d2 > 1e-6) { const d = Math.sqrt(d2), f = (md - d) / d * 0.3; pxs += ddx * f; pzs += ddz * f; }
          }
          j = gR.next[j];
        }
      }
    }
    R.px[i] = x; R.pz[i] = z;
    x += R.vx[i] * dt + clamp(pxs, -0.1, 0.1);
    z += R.vz[i] * dt + clamp(pzs, -0.06, 0.06);
    if (!T.fly) for (const bt of S.belts) if (z > bt.zTop && z < bt.zBot && Math.abs(x - bt.x) < bt.w / 2) x += bt.v * dt;
    x = clamp(x, -XLIM, XLIM);
    for (const g of S.gates) {
      if (!g.alive || !g.on || !REDGATES.has(g.def.t) || !(R.pz[i] < g.z && z >= g.z) || Math.abs(x - g.x) > g.w / 2) continue;
      const m = g.hi ? R.mask2 : R.mask;
      if (m[i] & g.bit) continue;
      m[i] |= g.bit;
      redGate(g, i, x, z);
    }
    for (const p of S.pillars) {
      if (!p.alive || Math.abs(z - p.z) > 1.0) continue;
      const hw = 0.95 + R.rad[i];
      if (Math.abs(x - p.x) < hw) x = p.x + (R.px[i] >= p.x ? hw : -hw);
    }
    if (!T.fly && !T.ghost) {
      x = wallClamp(S, R.px[i], x, z);
      // blockers (fences, ice, barriers, statues) stop red units too: they walk around or wait behind
      let blocked = false;
      for (const g of S.gates) {
        if (!g.alive || !g.on || !BLOCKERS.has(g.def.t)) continue;
        const hw = g.w / 2 + R.rad[i], zf = g.z - 0.3, zb = g.z + 0.35 + R.rad[i];
        if (Math.abs(x - g.x) >= hw || z <= zf || z >= zb) continue;
        // solid box: from the front they get stopped, from the side they get pushed back out
        const dir = x >= g.x ? 1 : -1;
        if (R.pz[i] <= zf) {
          z = zf;
          x = wallClamp(S, R.px[i], clamp(x + dir * T.speed * dt, -XLIM, XLIM), z);
          blocked = true;
        } else {
          const pdir = R.px[i] >= g.x ? 1 : -1;
          x = g.x + pdir * hw;
          if (Math.abs(x) > XLIM) { x = clamp(x, -XLIM, XLIM); z = zf; blocked = true; }
        }
      }
      if (blocked) { R.stk[i] += dt; if (R.stk[i] > 6) { R.hp[i] = 0; burst(x, 0.5, z, PCOL.red, 3, 3); continue; } }
      else R.stk[i] = 0;
    }
    R.x[i] = x; R.z[i] = z;
    R.phase[i] += dt * (R.kind[i] === 1 || R.kind[i] === 5 ? 8 : 13);
    if (R.flash[i] > 0) R.flash[i] -= dt * 4;
    if (!T.ghost && !T.fly && S.saws.length && sawHit(S, x, z)) { R.hp[i] -= 4 + R.mx[i] * 0.05; if (R.hp[i] <= 0) { killRed(i); continue; } }
    if (z >= G.z0 - 0.9 && G.phase === 'play') {
      damageCannon(T.dmg);
      R.hp[i] = 0;
      burst(x, 0.8, z, PCOL.red, 12, 5);
      G.shake = 0.6;
    }
  }
}

function combat() {
  for (let i = 0; i < B.n; i++) {
    if (B.hp[i] <= 0 || B.adur[i] > 0) continue;
    const x = B.x[i], z = B.z[i], rb = B.rad[i];
    const cx = cellX(x), cz = cellZ(z);
    outer: for (let gz = cz - 1; gz <= cz + 1; gz++) {
      if (gz < 0 || gz >= GROWS) continue;
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        if (gx < 0 || gx >= GCOLS) continue;
        let j = gR.head[gz * GCOLS + gx];
        while (j !== -1) {
          if (R.hp[j] > 0) {
            const rs = rb + R.rad[j], ddx = x - R.x[j], ddz = z - R.z[j];
            if (ddx * ddx + ddz * ddz < rs * rs) {
              // reds hit back hard: killing one costs atk/armor times its hp
              const T = RED_TYPES[R.kind[j]], k = T.atk / (T.armor || 1);
              const cost = R.hp[j] * k;
              if (B.hp[i] >= cost) { B.hp[i] -= cost; R.hp[j] = 0; killRed(j); }
              else { R.hp[j] -= B.hp[i] / k; B.hp[i] = 0; R.flash[j] = 1; R.st[j] = 0; }
              if (B.hp[i] <= 0) { killBlue(i); break outer; }
            }
          }
          j = gR.next[j];
        }
      }
    }
  }
  // bomber explosions
  const E = G.explosions;
  for (let e = 0; e < E.length; e += 3) {
    const ex = E[e], ez = E[e + 1], eh = E[e + 2];
    burst(ex, 0.6, ez, PCOL.orange, 18, 7);
    spark(ex, 0.8, ez, PCOL.orange, 6, 5, 1.2, 0.4);
    addRing(ex, ez, 1.7, 0xff8a1a, 0.35);
    for (let i = 0; i < B.n; i++) {
      if (B.hp[i] > 0 && (B.x[i] - ex) ** 2 + (B.z[i] - ez) ** 2 < 2.9) hurt(i, 4 + eh * 6, 0.2);
    }
    sound.play('boom');
  }
  E.length = 0;
  // splitters burst into three smaller red units
  const Sp = G.splits;
  for (let e = 0; e < Sp.length; e += 3) for (let k = 0; k < 3; k++) spawnRed(Sp[e] + rand(-0.5, 0.5), Sp[e + 1] - rand(0, 0.6), 0, Math.max(1, Sp[e + 2] * 0.4));
  Sp.length = 0;
}

function setRedHp(i, hp) {
  const T = RED_TYPES[R.kind[i]];
  R.hp[i] = R.mx[i] = hp;
  R.sc[i] = redScale(R.kind[i], hp);
  R.rad[i] = T.r * (R.sc[i] / T.scale);
}
// enemy gate: the red unit's hp is multiplied, split over a few copies
function redGate(g, i, x, z) {
  const f = g.def.t === 'redmul' ? g.def.v : g.def.v + 1;
  const total = R.hp[i] * f;
  const n = Math.max(0, Math.min(Math.round(f) - 1, 3, R.N - R.n - 30));
  const share = total / (n + 1);
  setRedHp(i, share);
  R.flash[i] = 1;
  for (let k = 0; k < n; k++) {
    const j = spawnRed(x + rand(-0.6, 0.6), z + rand(0, 0.8), R.kind[i], share);
    if (j >= 0) { R.mask[j] = R.mask[i]; R.mask2[j] = R.mask2[i]; R.flash[j] = 1; R.pz[j] = R.z[j]; }
  }
  if (g.flash < 0.5) spark(g.x, 1.4, g.z, PCOL.red, 4, 3, 0.8, 0.35, -4);
  g.flash = 1;
}
function redScale(kind, hp) {
  const T = RED_TYPES[kind];
  if (T.big) return T.scale * (1 + clamp(Math.log10(hp / T.hp) * 0.22, 0, 0.75));
  if (hp > T.hp * 1.5) return T.scale * (1 + Math.min(0.7, Math.log10(hp / T.hp) * 0.3));
  return T.scale;
}
function spawnRed(x, z, kind, hp) {
  const T = RED_TYPES[kind];
  hp = hp ?? T.hp;
  if (G.rad > 0 && G.phase === 'play') { burst(x, 0.6, z, PCOL.green, 2, 3); return -1; }
  const i = spawn(R, clamp(x, -XLIM, XLIM), z, hp, kind);
  if (i >= 0) {
    R.vz[i] = T.speed;
    R.sc[i] = redScale(kind, hp);
    R.rad[i] = T.r * (R.sc[i] / T.scale);
  }
  return i;
}
function spawnHordes(S) {
  for (const h of S.def.horde || []) {
    const rate = h.rate ?? 1.4;
    for (let k = 0; k < h.n; k++) {
      const d = rand(h.d1, h.d2);
      const i = spawnRed(h.x + rand(-h.w / 2, h.w / 2), S.z0 - d, 0, h.hp || 1);
      if (i < 0) break;
      R.st[i] = 1; R.vz[i] = 0;
      if (h.march) R.wake[i] = 1.5 + (d - h.d1) / rate;
    }
    for (const b of h.brutes || []) {
      const i = spawnRed(b.x, S.z0 - b.d, 1, b.hp);
      if (i >= 0) { R.st[i] = 1; R.vz[i] = 0; }
    }
  }
}
// enemies get stronger the longer a stage lasts (x2 every 25 s), scaled by the level's threat
function threat(S) {
  // red units start soft and harden over the first ~16 s of a stage, then keep doubling every 25 s
  const soft = Math.min(1, 0.35 + S.time / 25);
  return (LEVELS[G.levelIdx].threat ?? 1) * soft * 2 ** (S.time / 25) * (S.enraged ? 2 : 1);
}
// boss minions are elite: each one carries a few % of your recent army (capped by a slice of the boss's hp)
function summon(b, kind, n, frac = 0.0012, spread = 3) {
  const hp = Math.max(RED_TYPES[kind].hp * threat(G.stage), Math.min(b.max * frac, G.armyAvg * frac * 30));
  for (let k = 0; k < n; k++) {
    const i = spawnRed(b.x + rand(-spread, spread), b.z + 3 + rand(0, 1.5), kind, hp);
    if (i >= 0) { R.vz[i] *= 1.2; spark(R.x[i], 1, R.z[i], PCOL.red, 3, 3, 1, 0.4); }
  }
}
function spawnWave(S) {
  const w = S.def.waves;
  S.waveN++;
  const m = threat(S);
  // warm-up: the first waves of a stage are lighter, so there is time to invest in upgrades
  const warm = Math.min(1, 0.45 + S.time / 45);
  const n = Math.round((w.swarm + Math.floor(S.waveN * (w.ramp || 0))) * warm);
  const zb = S.boss ? S.boss.z + 3.5 : S.z0 - SPAWN_D;
  const cx = clamp(G.cx + rand(-2.5, 2.5), -3.5, 3.5); // the horde hunts your stream
  for (let k = 0; k < n; k++) spawnRed(cx + rand(-2.6, 2.6), zb - rand(0, 3), 0, (w.hp || 1) * m);
  if (w.brute && S.waveN % w.brute.every === 0) spawnRed(rand(-4, 4), zb - 1, 1, w.brute.hp * m);
  if (w.tank && S.waveN % w.tank.every === 0) spawnRed(rand(-4.5, 4.5), zb - 1, 5, w.tank.hp * m);
  for (const key in WAVE_KINDS) {
    const kind = WAVE_KINDS[key], cnt = Math.round((w[key] || 0) * (0.5 + warm * 0.5));
    for (let k = 0; k < cnt; k++) spawnRed(rand(-5.5, 5.5), zb - rand(0, 3), kind, RED_TYPES[kind].hp * m);
  }
}
function scheduleFlank(S, def = S.def.flanks) {
  if (!def) return;
  const x = (S.flankN + def.firstSide) % 2 ? -4.5 : 4.5, z = S.z0 - 14;
  S.flankN++;
  popup('FLANK INCOMING', 'combo c1', x, 2, z, 1.1);
  sound.play('warn');
  addTelegraph('circle',x,z,1.6,0,def.warning,() => {
    if (S !== G.stage || G.phase !== 'play') return;
    const hp = RED_TYPES[def.kind].hp * threat(S);
    for (let k = 0; k < def.count; k++) {
      spawnRed(x + (k-(def.count-1)/2)*.4,z-(k%2)*.55,def.kind,hp);
    }
    burst(x,.3,z,PCOL.red,12,3); addRing(x,z,1.8,0xff6854,.35);
  });
}

// boss attacks + telegraph effects
function addRing(x, z, r, color, life) {
  if (TURBO) return;
  impactRings.emit(x, z, r, color, life);
}
function addBeam(x1, y1, z1, x2, y2, z2, color, life = 0.14, width = .08) {
  if (TURBO) return;
  tracers.emit(x1,y1,z1,x2,y2,z2,color,life,width);
}
function addTelegraph(shape, x, z, a, b, time, onHit, cannon = false) {
  let outer = null, inner = null;
  if (!TURBO) {
    const geo = shape === 'circle' ? new THREE.CircleGeometry(1, 40) : new THREE.PlaneGeometry(1, 1);
    outer = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.22, depthWrite: false }));
    inner = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.45, depthWrite: false }));
    for (const m of [outer, inner]) { m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, z); G.root.add(m); }
    inner.position.y = 0.05;
    if (shape === 'circle') outer.scale.set(a, a, 1); else outer.scale.set(a, b, 1);
  }
  G.effects.push({ kind: 'tele', shape, outer, inner, x, z, a, b, life: time, max: time, onHit, cannon });
}
function blueInCircle(x, z, r) {
  const r2 = r * r;
  for (let i = 0; i < B.n; i++) if (B.hp[i] > 0 && (B.x[i] - x) ** 2 + (B.z[i] - z) ** 2 < r2) hurt(i, 8, 0.5);
}
function blueInRect(x, z, w, d) {
  for (let i = 0; i < B.n; i++) if (B.hp[i] > 0 && Math.abs(B.x[i] - x) < w / 2 && Math.abs(B.z[i] - z) < d / 2) hurt(i, 8, 0.5);
}
function randomBlueAhead(minZ, maxZ) {
  for (let tries = 0; tries < 14 && B.n; tries++) {
    const i = (Math.random() * B.n) | 0;
    if (B.hp[i] > 0 && B.z[i] > minZ && B.z[i] < maxZ) return i;
  }
  return -1;
}
function attackSlam(b, spawnBrutes) {
  const x = b.x, z = b.z + 3.4;
  addTelegraph('circle', x, z, 3.8, 0, 1.0, () => {
    blueInCircle(x, z, 3.8);
    burst(x, 0.3, z, PCOL.dust, 40, 8);
    addRing(x, z, 4.2, 0xffffff, 0.4);
    G.shake = 0.8; sound.play('boom');
    if (spawnBrutes && b.atkN % 2 === 0) summon(b, 1, 2, 0.004);
  });
}
function attackBand(b, x, len, color, spawnKind) {
  const z1 = b.z + 2;
  addTelegraph('band', x, z1 + len / 2, 3.4, len, 1.1, () => {
    blueInRect(x, z1 + len / 2, 3.4, len);
    for (let k = 0; k < 14; k++) burst(x + rand(-1.5, 1.5), 0.5, z1 + (k / 14) * len, color, 3, 4);
    G.shake = 0.5; sound.play('boom');
    if (spawnKind >= 0) summon(b, spawnKind, 3);
  });
}
function attackBoulders(b, n, col) {
  for (let k = 0; k < n; k++) {
    const i = randomBlueAhead(b.z + 4, G.z0 - 6);
    const tx = clamp(i >= 0 ? B.x[i] : rand(-5, 5), -6, 6), tz = i >= 0 ? B.z[i] : b.z + rand(10, 30);
    let rock = null;
    if (!TURBO) {
      rock = new THREE.Mesh(M.boulderGeo(), M.lam(col, { flatShading: true }));
      rock.castShadow = true;
      G.root.add(rock);
    }
    addTelegraph('circle', tx, tz, 2.3, 0, 1.25, () => {
      blueInCircle(tx, tz, 2.3);
      burst(tx, 0.4, tz, PCOL.ice, 28, 7);
      addRing(tx, tz, 2.6, 0xffffff, 0.35);
      G.shake = 0.5; sound.play('boom');
    });
    if (rock) G.effects.push({ kind: 'rock', mesh: rock, fx: b.x + 2.6, fz: b.z, tx, tz, life: 1.25, max: 1.25, shared: true });
  }
}
function attackBreath(b, color) {
  // fire breath: three blasts marching toward the target
  const i = randomBlueAhead(b.z + 6, G.z0 - 4);
  const tx = clamp(i >= 0 ? B.x[i] : rand(-4, 4), -5.5, 5.5), tz = i >= 0 ? B.z[i] : b.z + 20;
  for (let k = 0; k < 3; k++) {
    const p = (k + 1) / 3;
    const x = b.x + (tx - b.x) * p, z = b.z + 4 + (tz - b.z - 4) * p;
    addTelegraph('circle', x, z, 2.3, 0, 0.9 + k * 0.25, () => {
      blueInCircle(x, z, 2.3);
      burst(x, 0.5, z, color, 26, 7);
      addRing(x, z, 2.6, 0xffcc44, 0.35);
      G.shake = 0.45; sound.play('boom');
    });
  }
}
function attackShockwave(b) {
  const i = randomBlueAhead(b.z + 5, G.z0 - 5);
  const z = i >= 0 ? B.z[i] : b.z + rand(10, 25);
  addTelegraph('band', 0, z, 13, 2.6, 1.15, () => {
    blueInRect(0, z, 13, 2.6);
    for (let k = 0; k < 16; k++) burst(-6 + k * 0.8, 0.3, z, PCOL.dust, 3, 5);
    G.shake = 0.7; sound.play('boom');
  });
}
// fire column aimed at the cannon itself: dodge it or lose a heart (and burn the units in it)
function attackSweep(b) {
  const x = clamp(G.aim, -5.4, 5.4), z1 = b.z + 3, z2 = G.z0 + 1, len = z2 - z1;
  popup('⚠ FIRE! MOVE!', 'combo c2', x, 2.5, G.z0 - 7, 1.1);
  sound.play('warn');
  addTelegraph('band', x, z1 + len / 2, 3.2, len, 1.25, () => {
    blueInRect(x, z1 + len / 2, 3.2, len);
    for (let k = 0; k < 24; k++) burst(x + rand(-1.4, 1.4), 0.5, z1 + (k / 24) * len, PCOL.orange, 3, 4);
    for (let k = 0; k < 10; k++) spark(x + rand(-1.4, 1.4), 1, z1 + (k / 10) * len, PCOL.orange, 3, 4, 1.2, 0.6);
    G.shake = 0.7; sound.play('boom');
    if (Math.abs(G.cx - x) < 1.9) {
      const damage = damageCannon(1);
      burst(G.cx, 1.2, G.cannonZ, PCOL.orange, 30, 7);
      if (damage) popup('BURNED! -1 ❤', 'combo c1', G.cx, 2.5, G.cannonZ - 2, 1.0);
    } else popup('DODGED!', 'combo c1', G.cx, 2.5, G.cannonZ - 2, 0.9);
  }, true);
}
// spider web: a sticky band where your units crawl at 30% speed
function attackWeb(b, x) {
  const z1 = b.z + 3, len = 18;
  addTelegraph('band', x, z1 + len / 2, 3.6, len, 1.0, () => {
    let mesh = null;
    if (!TURBO) {
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, len), P.webMaterial());
      mesh.material.map.repeat.set(1, len / 3.6);
      mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.06, z1 + len / 2);
      G.root.add(mesh);
    }
    G.zones.push({ x, z: z1 + len / 2, w: 3.6, d: len, life: 5, mesh });
    sound.play('warp');
  });
}
// lightning: fast strikes on your biggest clusters
function attackLightning(b, n) {
  for (let k = 0; k < n; k++) {
    const i = randomBlueAhead(b.z + 3, G.z0 - 4);
    const tx = clamp(i >= 0 ? B.x[i] : rand(-5, 5), -6, 6), tz = i >= 0 ? B.z[i] : b.z + rand(8, 30);
    addTelegraph('circle', tx, tz, 1.9, 0, 0.75 + k * 0.12, () => {
      blueInCircle(tx, tz, 1.9);
      addBeam(tx, 18, tz, tx, 0, tz, 0xfff06a, 0.18);
      addBeam(tx + 0.3, 18, tz, tx - 0.2, 0, tz + 0.2, 0xffffff, 0.12);
      burst(tx, 0.5, tz, PCOL.gold, 18, 7);
      G.shake = Math.max(G.shake, 0.35); sound.play('zap');
    });
  }
}
function attackBall(S, b, frac, r = 2.2) {
  // like minions, a thrown ball is sized to your recent army (a few seconds of focused fire), capped by the boss's hp
  const hp = Math.max(20 * threat(S), Math.min(b.max * frac, G.armyAvg * 0.6));
  const ball = addBall(S, G.root, clamp(b.x + rand(-2, 2), -4, 4), b.z + b.model.radius + r, hp, r, 2.2, { dmg: 2, home: 0.5 });
  popup('INCOMING!', 'combo c2', ball.x, 4, ball.z, 1.0);
  sound.play('warn');
}
function rerollSlots(S) {
  for (const g of S.gates) if (g.alive && g.def.t === 'slot') g.flipT = g.def.period;
  popup('RE-ROLL!', 'combo c2', 0, 3, G.z0 - 20, 1.0);
}
function bossAttack(S, b) {
  b.atkN++;
  b.atk = 0.001;
  if (b.sweep && b.atkN % 2 === 1) { attackSweep(b); return; }
  const pickX = () => { const i = randomBlueAhead(b.z + 2, b.z + 24); return clamp(i >= 0 ? B.x[i] : G.cx, -5, 5); };
  switch (b.type) {
    case 'king': attackSlam(b, true); break;
    case 'jelly': attackSlam(b, false); summon(b, 6, 4); break;
    case 'skeleton': attackBand(b, pickX(), 20, PCOL.orange, 2); break;
    case 'golem': attackBoulders(b, 2, 0x7f9fc0); summon(b, 3, 3); break;
    case 'moon': attackBoulders(b, 3, 0x8a8aa0); summon(b, 5, 1, 0.003); break;
    case 'dragon': attackBreath(b, PCOL.orange); summon(b, 2, 3); break;
    case 'storm': attackBreath(b, PCOL.ice); summon(b, 6, 3); break;
    case 'brute': attackShockwave(b); if (b.atkN % 2 === 0) summon(b, 1, 2, 0.004); break;
    case 'robot': attackBand(b, pickX(), 24, PCOL.pink, -1); attackBand(b, rand(-5, 5), 24, PCOL.pink, 5); break;
    case 'drill': attackBand(b, pickX(), 22, PCOL.metal, 7); if (b.atkN % 3 === 0) attackBand(b, rand(-5, 5), 22, PCOL.metal, -1); break;
    case 'dice': attackBoulders(b, 3, 0xffffff); summon(b, 12, 4); if (b.atkN % 3 === 0) rerollSlots(S); break;
    case 'kraken': attackBand(b, pickX(), 20, PCOL.pink, 8); attackBand(b, rand(-5, 5), 20, PCOL.pink, -1); break;
    case 'pumpkin': attackBoulders(b, 3, 0xff8a1a); summon(b, 9, 4); if (b.atkN % 3 === 0) attackBall(S, b, 0.01); break;
    case 'commander': summon(b, 4, 8, 0.0008, 4.5); attackBand(b, pickX(), 22, PCOL.red, -1); break;
    case 'spider': attackWeb(b, pickX()); summon(b, 4, 6, 0.0008); break;
    case 'magma': attackBreath(b, PCOL.orange); for (let k = 0; k < 2; k++) meteorStrike(S, 2.2, b); break;
    case 'pharaoh': attackBand(b, pickX(), 22, PCOL.sand, 10); summon(b, 10, 3); break;
    case 'thunder': attackLightning(b, 5); if (b.atkN % 2 === 0) summon(b, 7, 4); break;
    case 'emperor': {
      const m = b.atkN % 6;
      if (m === 0) attackBand(b, pickX(), 22, PCOL.purple, 6);
      else if (m === 1) { attackBoulders(b, 3, 0x9a6aff); summon(b, 9, 3); }
      else if (m === 2) attackBall(S, b, 0.006);
      else if (m === 3) attackLightning(b, 6);
      else if (m === 4) attackWeb(b, pickX());
      else { attackBreath(b, PCOL.pink); summon(b, 12, 4); }
      break;
    }
    default: { // titan: cycles through everything
      const m = b.atkN % 4;
      if (m === 0) attackBand(b, pickX(), 22, PCOL.purple, 6);
      else if (m === 1) attackBoulders(b, 3, 0x9a6aff);
      else if (m === 2) attackShockwave(b);
      else attackBreath(b, PCOL.pink);
    }
  }
}
function updateBoss(S, dt) {
  const b = S.boss;
  if (!b.alive) return;
  if (b.stun > 0) {
    // stunned by a nuke: no moving, no attacks, dizzy sparks
    b.stun -= dt;
    if (Math.random() < 0.3) spark(b.x + Math.cos(G.t * 6) * 2, b.model.height + 0.5, b.z + Math.sin(G.t * 6) * 2, PCOL.gold, 1, 0.5, 1.2, 0.5, 0);
  } else if (G.phase === 'play') {
    b.z += b.speed * dt;
    b.atkT -= dt;
    if (b.atkT <= 0) { b.atkT = b.every; bossAttack(S, b); }
    if (b.z > G.z0 - 4.5) lose('The boss crushed your cannon!');
  }
  if (b.atk > 0) { b.atk += dt; if (b.atk > 1.25) b.atk = 0; }
}
function updateEffects(dt) {
  const E = G.effects;
  for (let k = E.length - 1; k >= 0; k--) {
    const e = E[k];
    e.life -= dt;
    const p = 1 - Math.max(0, e.life) / e.max;
    if (e.kind === 'tele') {
      if (e.inner) {
        if (e.shape === 'circle') e.inner.scale.set(e.a * p, e.a * p, 1);
        else { e.inner.scale.set(e.a, e.b * p, 1); e.inner.position.z = e.z + e.b / 2 - (e.b * p) / 2; }
        e.outer.material.opacity = 0.2 + Math.sin(G.t * 20) * 0.08;
      }
      if (e.life <= 0 && G.phase === 'play') e.onHit();
    } else if (e.kind === 'mush') {
      e.mesh.position.set(0, 0, e.z);
      e.mesh.scale.setScalar(2 + p * 16);
      e.mesh.children.forEach((c) => { c.material.opacity = 0.9 * (1 - p); });
    } else if (e.kind === 'rock') {
      e.mesh.position.set(e.fx + (e.tx - e.fx) * p, e.high ? e.high * (1 - p) + 0.6 : 7 + Math.sin(p * Math.PI) * 6 - p * 7, e.fz + (e.tz - e.fz) * p);
      e.mesh.rotation.set(p * 8, p * 5, 0);
    }
    if (e.life <= 0) {
      for (const m of [e.mesh, e.outer, e.inner]) if (m) {
        G.root.remove(m);
        m.traverse((o) => { if (o.geometry) { o.geometry.dispose(); if (!e.shared) o.material.dispose(); } });
      }
      E.splice(k, 1);
    }
  }
}

function updateObstacles(S, dt) {
  for (const St of G.stages) {
    for (const g of St.gates) {
      if (g.def.slide) g.x = g.baseX + Math.sin(G.t * g.def.slide.speed + g.ph) * g.def.slide.amp;
      if (g.def.t === 'flip' && g.alive) {
        g.flipT += dt;
        if (g.flipT >= g.def.period) {
          g.flipT = 0; g.flipIdx ^= 1;
          g.cur = g.flipIdx ? g.def.b : g.def.a;
          if (!TURBO) g.model.setColor(gateColor(g.def, g.cur));
          g.flash = 1;
        }
        g.dirty = true;
      }
      if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 4);
    }
    for (const s of St.saws) if (s.def.slide) s.x = s.def.x + Math.sin(G.t * s.def.slide.speed + s.ph) * s.def.slide.amp;
  }
  // crushers: up, warn, SLAM, rise
  for (const c of S.crushers) {
    const P = c.def.period, t = (G.t + (c.def.offset || 0)) % P;
    const warnAt = P - 0.6, slamAt = P - 0.22;
    let y;
    if (t < 0.35) y = (t / 0.35) * 4;          // rising after the slam
    else if (t < warnAt) y = 4;
    else if (t < slamAt) y = 4 + Math.sin(t * 60) * 0.06;
    else y = Math.max(0, 4 * (1 - (t - slamAt) / 0.08));
    c.warn = t >= warnAt ? (t - warnAt) / (P - warnAt) : 0;
    const down = y < 0.6;
    if (down && !c.down) {
      // slam!
      G.shake = Math.max(G.shake, 0.35);
      burst(c.x, 0.3, c.z, PCOL.dust, 16, 6);
      sound.play('crush');
    }
    c.down = down; c.y = y;
    const hit = down || t < 0.12;
    if (hit) {
      const hw = c.w / 2;
      for (let i = 0; i < B.n; i++) if (B.hp[i] > 0 && Math.abs(B.x[i] - c.x) < hw && Math.abs(B.z[i] - c.z) < 0.9) hurt(i, 6, 0.3);
      for (let i = 0; i < R.n; i++) if (R.hp[i] > 0 && Math.abs(R.x[i] - c.x) < hw && Math.abs(R.z[i] - c.z) < 0.9) killRed(i);
    }
  }
  // laser turrets
  for (const tr of S.turrets) {
    if (!tr.alive) continue;
    if (tr.hp <= 0) {
      tr.alive = false; tr.model.group.visible = false; hideLabel(tr.label);
      burst(tr.x, 1, tr.z, PCOL.metal, 40, 7); sound.play('boom');
      popup('TURRET DOWN!', 'combo c1', tr.x, 2.5, tr.z, 1.0);
      continue;
    }
    if (G.phase !== 'play') continue;
    tr.timer -= dt;
    let target = -1;
    for (let tries = 0; tries < 10 && B.n; tries++) {
      const i = (Math.random() * B.n) | 0;
      if (B.hp[i] > 0 && B.z[i] > tr.z && B.z[i] < tr.z + 20 && Math.abs(B.x[i] - tr.x) < 9) { target = i; break; }
    }
    if (target >= 0) tr.aim = Math.atan2(B.x[target] - tr.x, B.z[target] - tr.z);
    if (tr.timer <= 0 && target >= 0) {
      tr.timer = tr.def.every;
      addBeam(tr.x, 1.3, tr.z, B.x[target], 0.6, B.z[target], 0xff2a3a);
      burst(B.x[target], 0.6, B.z[target], PCOL.red, 6, 4);
      hurt(target, 3, 0.35);
      sound.play('zap');
    }
  }
}

// ---------------------------------------------------------------- level 11-20 mechanics
function nearestRed(x, z, range, excluded = null) {
  let best = range * range, bi = -1;
  for (let j = 0; j < R.n; j++) {
    if (R.hp[j] <= 0 || excluded?.has(j)) continue;
    const d2 = (R.x[j] - x) ** 2 + (R.z[j] - z) ** 2;
    if (d2 < best) { best = d2; bi = j; }
  }
  return bi;
}
function supernova(S, h) {
  h.alive = false; h.dying = 1;
  const T = S.tower && S.tower.alive ? S.tower : S.boss && S.boss.alive ? S.boss : null;
  if (T) { const d = T.max * (h.def.dmg ?? 0.3); T.hp -= d; T.flash = 1; G.dmgAcc += d; G.dmgTotal += d; popup('-' + fmt(d) + '!', 'combo c4', T.x ?? 0, 7, T.z, 1.8); }
  detonateNuke(S, null, h.def.mult ?? 3, `SUPERNOVA! ARMY x${h.def.mult ?? 3}`);
  if (!TURBO) { addRing(h.x, h.z, 30, 0xff9a3a, 1.0); addRing(h.x, h.z, 18, 0xffffff, 0.7); }
}
function crashPillar(S, p) {
  const x0 = Math.min(p.x, p.x + p.dir * 11.5), x1 = Math.max(p.x, p.x + p.dir * 11.5);
  let n = 0;
  for (let j = 0; j < R.n; j++) if (R.hp[j] > 0 && R.x[j] > x0 && R.x[j] < x1 && Math.abs(R.z[j] - p.z) < 1.7) { killRed(j); n++; }
  for (let i = 0; i < B.n; i++) if (B.hp[i] > 0 && B.adur[i] <= 0 && B.x[i] > x0 && B.x[i] < x1 && Math.abs(B.z[i] - p.z) < 1.7) hurt(i, 10, 0.4);
  const b = S.boss;
  if (b && b.alive && Math.abs(b.z - p.z) < b.model.radius + 1.5) { const d = b.max * 0.12; b.hp -= d; b.flash = 1; G.dmgAcc += d; G.dmgTotal += d; }
  G.shake = Math.max(G.shake, 1.0); G.kick = Math.max(G.kick || 0, 0.6);
  for (let k = 0; k < 10; k++) burst(x0 + (x1 - x0) * (k / 9), 0.4, p.z, PCOL.dust, 8, 6);
  if (!TURBO) debris.burst((x0 + x1) / 2, 0.5, p.z, [PCOL.sand, PCOL.dust, PCOL.white], 30, 11, 1.5, 9, 0.45);
  popup(n > 5 ? `CRUSHED ${n}!` : 'TIMBER!', 'combo c3', (x0 + x1) / 2, 3, p.z, 1.3);
  sound.play('crush'); sound.play('boom');
  buzz(90);
}
function ballDies(S, b, crashed) {
  b.alive = false; hideLabel(b.label);
  b.model.group.visible = false;
  for (let j = 0; j < R.n; j++) if (R.hp[j] > 0 && (R.x[j] - b.x) ** 2 + (R.z[j] - b.z) ** 2 < (b.r + 2) ** 2) killRed(j);
  for (let k = 0; k < 6; k++) burst(b.x + rand(-b.r, b.r), b.r, b.z + rand(-b.r, b.r), PCOL.red, 20, 8, 1.3);
  if (!TURBO) debris.burst(b.x, b.r, b.z, [PCOL.red, PCOL.red, PCOL.gold], 30, b.r * 2, 2, 9, 0.4);
  G.shake = Math.max(G.shake, 0.8);
  sound.play('boom');
  if (crashed) {
    const damage = damageCannon(b.def.dmg ?? 3);
    if (damage) popup(`-${damage} ♥`, 'combo c2', G.cx, 2.5, G.cannonZ - 2, 1.0);
  } else {
    G.overdrive = Math.max(G.overdrive, 4);
    popup('WRECK BONUS x2!', 'combo c3', b.x, 3, b.z, 1.2);
    addRing(b.x, b.z, b.r * 2.5, 0xffce55, 0.6);
  }
}
function damageCannon(amount) {
  const blocked = Math.min(G.shield, amount), damage = amount - blocked;
  if (blocked > 0) {
    G.shield -= blocked; G.guardFlash = 1; G.cannonPulse = .45;
    if (G.t >= G.armorPopupT) {
      G.armorPopupT = G.t + .4;
      popup('ARMOR BLOCK', 'combo c1', G.cx, 2.5, G.cannonZ - 2, .8);
      addRing(G.cx, G.cannonZ, 1.8, 0x9aeaff, .3);
      sound.play('shield'); buzz(25);
    }
  }
  if (damage > 0) { G.lives -= damage; hurtFlash(); }
  return damage;
}
function hurtFlash() {
  buzz(70);
  if (TURBO) return;
  hud.flash.classList.remove('on'); void hud.flash.offsetWidth; hud.flash.classList.add('on');
  hud.lives.classList.remove('hit'); void hud.lives.offsetWidth; hud.lives.classList.add('hit');
  sound.play('hit');
}
function meteorStrike(S, r, from) {
  const i = randomBlueAhead(G.z0 - 48, G.z0 - 5);
  const tx = clamp(i >= 0 && Math.random() < 0.7 ? B.x[i] : rand(-5.5, 5.5), -5.8, 5.8);
  const tz = i >= 0 ? B.z[i] - rand(0, 2) : G.z0 - rand(10, 40);
  let rock = null;
  if (!TURBO) {
    rock = new THREE.Mesh(M.boulderGeo(), M.lam(0x3a2020, { emissive: 0xff3a0a }));
    rock.scale.setScalar(1.3);
    G.root.add(rock);
    G.effects.push({ kind: 'rock', mesh: rock, fx: from ? from.x : tx + 10, fz: from ? from.z : tz - 26, tx, tz, life: 1.3, max: 1.3, shared: true, high: 14 });
  }
  addTelegraph('circle', tx, tz, r, 0, 1.3, () => {
    blueInCircle(tx, tz, r);
    for (let j = 0; j < R.n; j++) if (R.hp[j] > 0 && (R.x[j] - tx) ** 2 + (R.z[j] - tz) ** 2 < r * r) killRed(j);
    burst(tx, 0.5, tz, PCOL.orange, 30, 8);
    spark(tx, 0.8, tz, PCOL.orange, 10, 6, 1.3, 0.5);
    addRing(tx, tz, r + 0.6, 0xff8a1a, 0.4);
    G.shake = Math.max(G.shake, 0.5); sound.play('boom');
  });
}
function updateMechanics(S, dt) {
  if (G.rad > 0) G.rad -= dt;
  for (const g of S.gates) {
    if (!g.alive) continue;
    const d = g.def;
    if (d.phase) {
      const was = g.on;
      g.on = ((G.t + (d.phase.off ?? 0)) % d.phase.period) < d.phase.on;
      if (was !== g.on && !TURBO) spark(g.x, 1.2, g.z, PCOL.white, 6, 3, 0.9, 0.4, 0);
    }
    if (d.t === 'slot') {
      g.flipT += dt;
      if (g.spin > 0) { g.spin -= dt; g.dirty = true; if (g.spin <= 0) { g.flash = 1; if (!TURBO) g.model.setColor(gateColor(d, g.cur)); } }
      if (g.flipT >= d.period) {
        g.flipT = 0; g.spin = 0.35;
        let k = (Math.random() * d.opts.length) | 0;
        if (d.opts[k] === g.cur) k = (k + 1) % d.opts.length;
        g.cur = d.opts[k];
      }
    }
    if (d.t === 'tesla' && g.active && G.phase === 'play') {
      g.zapT -= dt;
      if (g.zapT <= 0) {
        g.zapT = d.every ?? 0.35;
        const cx = g.x + g.w / 2, cy = 4.1, cz = g.z;
        let hit = 0;
        for (let k = 0; k < (d.zaps ?? 3); k++) {
          const j = nearestRed(cx, cz - 6, d.range ?? 14);
          if (j < 0) break;
          addBeam(cx, cy, cz, R.x[j], redAimY(j), R.z[j], 0x9af6ff, 0.12);
          killRed(j); hit++;
        }
        if (!hit) {
          const T = S.tower && S.tower.alive ? S.tower : S.boss && S.boss.alive ? S.boss : null;
          if (T) {
            const dmg = T.max * (d.dmg ?? 0.004);
            T.hp -= dmg; T.flash = 1; G.dmgAcc += dmg; G.dmgTotal += dmg;
            addBeam(cx, cy, cz, T.x ?? 0, 3, T.z + 1, 0x9af6ff, 0.12);
          }
        }
        if (hit || Math.random() < 0.5) sound.play('zap');
        spark(cx, cy, cz, PCOL.ice, 3, 4, 0.9, 0.3, 0);
      }
    }
  }
  for (const w of S.walls) {
    const sl = w.def.slide;
    if (!sl) continue;
    w.x = w.def.x + Math.sin(G.t * sl.speed + w.ph) * sl.amp;
    w.model.position.x = w.x;
  }
  for (const s of S.spawners) {
    if (s.def.slide) { s.x = s.def.x + Math.sin(G.t * s.def.slide.speed) * s.def.slide.amp; s.model.group.position.x = s.x; }
  }
  for (const tn of S.tornados) {
    tn.x = tn.def.x + Math.sin(G.t * (tn.def.speed ?? 0.6) + tn.ph) * (tn.def.amp ?? 4);
    if (G.phase !== 'play') continue;
    const r2 = tn.r * tn.r;
    for (let i = 0; i < B.n; i++) {
      if (B.hp[i] <= 0 || B.adur[i] > 0) continue;
      if ((B.x[i] - tn.x) ** 2 + (B.z[i] - tn.z) ** 2 < r2) launch(i, rand(-6, 6), B.z[i] - rand(4, 10), rand(0.6, 0.9));
    }
    for (let j = 0; j < R.n; j++) if (R.hp[j] > 0 && (R.x[j] - tn.x) ** 2 + (R.z[j] - tn.z) ** 2 < r2) killRed(j);
  }
  for (const h of S.holes) {
    if (!h.alive || G.phase !== 'play') continue;
    const pr = h.r * 3.2, cr = h.r + 0.25;
    for (const [Pp, blue] of [[B, true], [R, false]]) {
      for (let i = 0; i < Pp.n; i++) {
        if (Pp.hp[i] <= 0 || (blue && Pp.adur[i] > 0) || (!blue && Pp.st[i])) continue;
        const dx = h.x - Pp.x[i], dz = h.z - Pp.z[i], d = Math.hypot(dx, dz);
        if (d > pr) continue;
        if (d < cr) {
          if (blue) { h.prog += Pp.hp[i]; Pp.hp[i] = 0; if (i % 3 === 0) burst(h.x, 0.8, h.z, PCOL.purple, 2, 3); }
          else { Pp.hp[i] = 0; G.kills++; }
          continue;
        }
        const f = (1 - d / pr) * 9 * dt;
        Pp.x[i] += (dx / d) * f; Pp.z[i] += (dz / d) * f * 0.6;
      }
    }
    if (h.prog >= h.need) supernova(S, h);
  }
  for (const b of S.balls) {
    if (!b.alive) continue;
    b.px = b.x; b.pz = b.z;
    if (b.hp <= 0) { ballDies(S, b, false); continue; }
    b.r = b.r0 * Math.max(0.4, Math.cbrt(b.hp / b.max));
    if (G.phase !== 'play') continue;
    const impact = b.impact > 0 ? .45 : 1, chill = b.chill > 0 ? .55 : 1;
    b.chill = Math.max(0, (b.chill || 0) - dt);
    b.impact = Math.max(0, b.impact - dt);
    if (b.delay > 0) { b.delay = Math.max(0, b.delay - dt); continue; }
    const sp = b.speed * (S.enraged ? 1.6 : 1) * impact * chill;
    b.z += sp * dt;
    b.x = clamp(b.x + clamp(G.cx - b.x, -1, 1) * (b.def.home ?? 0.25) * dt, -XLIM + b.r * 0.6, XLIM - b.r * 0.6);
    b.model.spin.rotation.x += (sp * dt) / b.r;
    if (b.z > G.z0 - 1.5) ballDies(S, b, true);
  }
  for (const p of S.pillars) {
    if (p.alive && p.hp <= 0) {
      p.alive = false; p.fall = 0.001; hideLabel(p.label);
      popup('TIMBER!', 'combo c2', p.x, 6, p.z, 1.0);
      sound.play('crush');
    }
    if (p.fall > 0 && p.fall < 1) {
      p.fall = Math.min(1, p.fall + dt / 0.75);
      p.model.body.rotation.z = -p.dir * (Math.PI / 2) * p.fall * p.fall;
      if (p.fall >= 1) crashPillar(S, p);
    }
  }
  if (S.def.meteors && G.phase === 'play') {
    S.metT -= dt;
    if (S.metT <= 0) { S.metT = S.def.meteors.every * (S.enraged ? 0.6 : 1); for (let k = 0; k < (S.def.meteors.n ?? 1); k++) meteorStrike(S, S.def.meteors.r ?? 2.2); }
  }
  for (let k = G.zones.length - 1; k >= 0; k--) {
    const zn = G.zones[k];
    zn.life -= dt;
    if (zn.mesh) zn.mesh.material.opacity = Math.min(0.85, zn.life);
    if (zn.life <= 0) { if (zn.mesh) { G.root.remove(zn.mesh); zn.mesh.geometry.dispose(); zn.mesh.material.dispose(); } G.zones.splice(k, 1); }
  }
}

function step(dt) {
  G.t += dt;
  G.phaseT += dt;
  const S = G.stage;
  G.guardFlash = Math.max(0, G.guardFlash - dt * 3);
  G.overdrive = Math.max(0, G.overdrive - dt);
  G.cx += (G.aim - G.cx) * Math.min(1, dt * 14);
  if (G.phase === 'intro' && G.phaseT > 1.2) { G.phase = 'play'; G.phaseT = 0; G.fireT = 0; }
  if (G.phase === 'play') { G.time += dt; fireCannon(dt); }
  updateObstacles(S, dt);
  updateMechanics(S, dt);
  if (G.phase === 'play') {
    S.time += dt;
    S.breach = Math.min(4, 1 + Math.max(0, S.time - S.def.targetTime) / 7);
    if (S.breach >= 2 && !S.breachShown) { S.breachShown = true; banner('ARMOR BREACHED!', 'gold'); }
    if (S.time > 80 && !S.enraged) { S.enraged = true; banner('ENEMY RAGE!', 'red', 1.8); sound.play('warn'); }
    S.waveT -= dt;
    if (S.waveT <= 0) { S.waveT = S.def.waves.every * (S.enraged ? 0.55 : 1); spawnWave(S); }
    if (S.def.flanks && S.flankN < S.def.flanks.limit) {
      S.flankT -= dt;
      if (S.flankT <= 0) { scheduleFlank(S); S.flankT = S.def.flanks.every; }
    }
    for (const s of S.spawners) {
      if (!s.alive) continue;
      s.timer -= dt;
      // spawners wake up after a few seconds and ramp up, like the waves, so you can get your stream going
      if (s.timer <= 0 && S.time > 4) {
        s.timer = s.def.every;
        const hp = (s.def.unitHp ?? 3) * threat(S);
        const n = Math.max(1, Math.round(s.def.n * Math.min(1, 0.35 + S.time / 35)));
        for (let k = 0; k < n; k++) {
          const j = spawnRed(s.x + rand(-1, 1), s.z + 1.6 + rand(0, 1), s.def.kind ?? 0, hp);
          if (j >= 0 && s.def.style === 'rival') R.vz[j] *= 1.5;
        }
        spark(s.x, 1.5, s.z + 1.2, PCOL.red, 4, 3, 1, 0.4);
        if (s.def.style === 'rival') { s.flash = 1; sound.play('shoot'); }
      }
      if (s.hp <= 0) {
        s.alive = false; burst(s.x, 1, s.z, s.def.style === 'dome' ? PCOL.gold : PCOL.ice, 40, 7); s.model.group.visible = false; hideLabel(s.label); sound.play('boom');
      }
    }
  }
  if (S.boss) updateBoss(S, dt);
  for (let k = G.revives.length - 1; k >= 0; k--) {
    const r = G.revives[k];
    r.t -= dt;
    if (r.t <= 0) {
      G.revives.splice(k, 1);
      if (G.phase !== 'play') continue;
      spawnRed(r.x, r.z, 11, r.hp * 1.5);
      burst(r.x, 0.6, r.z, PCOL.sand, 12, 4);
      spark(r.x, 1, r.z, PCOL.gold, 6, 3, 1, 0.5);
    }
  }
  updateEffects(dt);
  buildCoarse(cB, B); buildCoarse(cR, R);
  buildGrid(gB, B); buildGrid(gR, R);
  moveBlue(S, dt);
  moveRed(S, dt);
  buildGrid(gR, R);
  combat();
  if (G.phase === 'play') updateArsenal(S, dt);
  compact(B); compact(R);
  let army = 0;
  for (let i = 0; i < B.n; i++) {
    const hp = B.hp[i];
    army += hp;
    B.age[i] += dt;
    // unit size follows its power (cheap version of the render-time scale, used for collisions)
    const s = B.kind[i] ? Math.max(1.9, 1 + Math.min(0.85, Math.log10(hp) * 0.13)) : hp > 1.5 ? 1 + Math.min(0.85, Math.log10(hp) * 0.13) : 1;
    B.sc[i] = s; B.rad[i] = 0.28 * s;
  }
  G.army = army;
  G.rank = 0;
  for (let i = 0; i < B.n; i++) G.rank = Math.max(G.rank, rankOf(B.hp[i]));
  G.armyAvg += (army - G.armyAvg) * Math.min(1, dt / 3);
  if (army > G.maxArmy) G.maxArmy = army;
  if (army >= G.nextMile && G.phase === 'play') {
    const m = G.nextMile;
    G.nextMile = m * 1000;
    popup(`ARMY ${fmt(m)}!!`, 'combo c4', G.cx, 3.5, G.z0 - 6, 1.6);
    sound.play('star');
    G.kick = Math.max(G.kick || 0, 0.6);
    for (let k = 0; k < 6; k++) spark(G.cx + rand(-4, 4), 1.5, G.z0 - rand(3, 12), k % 2 ? PCOL.gold : PCOL.pink, 10, 7, 1.2, 0.8);
    buzz(40);
  }
  if (G.bot && ((G.t * 60) | 0) % 6 === 0) G.bot();

  if (G.phase === 'play') {
    if (G.lives <= 0) { G.lives = 0; lose('The red army broke through!'); }
    else if (S.tower && S.tower.alive && S.tower.hp <= 0) stageCleared(S);
    else if (S.boss && S.boss.alive && S.boss.hp <= 0) bossDefeated(S);
  } else if (G.phase === 'clear') {
    if (G.phaseT > 1.6) {
      for (let i = 0; i < B.n; i++) if (i % 2 === 0) burst(B.x[i], 0.5, B.z[i], PCOL.blue, 1, 3);
      B.n = 0;
      G.phase = 'move'; G.phaseT = 0;
      G.moveFrom = G.cannonZ; G.moveTo = G.stages[G.stageIdx + 1].z0;
      banner('ADVANCE!', '', 1.2);
    }
  } else if (G.phase === 'move') {
    const p = Math.min(1, G.phaseT / 2.2), e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    G.cannonZ = G.camZ = G.moveFrom + (G.moveTo - G.moveFrom) * e;
    if (p >= 1) enterStage(G.stageIdx + 1);
  } else if (G.phase === 'won' && G.phaseT > 2.6 && !G.shown) { G.shown = true; showResult(true); }
  else if (G.phase === 'lost' && G.phaseT > 1.4 && !G.shown) { G.shown = true; showResult(false); }
}

function popAllRed() {
  for (let i = 0; i < R.n; i++) if (R.hp[i] > 0) { burst(R.x[i], 0.5, R.z[i], PCOL.red, 2, 4); R.hp[i] = 0; }
  R.n = 0;
  G.explosions.length = 0; G.splits.length = 0; G.revives.length = 0;
}
function logStage(S, result) {
  G.log.push({ stage: S.i + 1, result, t: +S.time.toFixed(1), lives: G.lives, maxArmy: G.maxArmy, combo: G.bestCombo, guns: G.barrels, power: G.power, twin: G.twin });
}
function stageCleared(S) {
  logStage(S, 'clear');
  const T = S.tower;
  T.alive = false;
  const overkill = -T.hp;
  T.hp = 0;
  hideLabel(T.label);
  for (const s of [...S.spawners, ...S.turrets]) if (s.alive) { s.alive = false; s.model.group.visible = false; hideLabel(s.label); }
  burst(0, 2, T.z, PCOL.red, 80, 10, 1.5);
  burst(0, 2, T.z, PCOL.gold, 40, 9, 1.5);
  if (!TURBO) {
    G.shatters.push({ parts: FX.shatter(T.model.group, G.root, 0, T.z, 10), t: 0 });
    const tc = rgb(THEMES[LEVELS[G.levelIdx].theme].tower);
    debris.burst(0, 1, T.z, [tc, tc, PCOL.gold, PCOL.white], 40, 13, 3, 10, 0.5);
    for (let k = 0; k < 5; k++) spark(rand(-6, 6), rand(1, 4), T.z, k % 2 ? PCOL.gold : PCOL.orange, 16, 9, 1.4, 0.8);
  }
  G.kick = 0.8;
  popAllRed();
  G.phase = 'clear'; G.phaseT = 0; G.shake = 0.8;
  banner('STAGE CLEAR!', 'gold', 1.6);
  if (overkill > T.max) popup(`OVERKILL x${fmt(1 + overkill / T.max)}!`, 'combo c3', 0, 6, T.z, 1.8);
  sound.play('clear');
}
function bossDefeated(S) {
  logStage(S, 'won');
  recordVictory();
  const b = S.boss;
  b.alive = false;
  const overkill = -b.hp;
  b.hp = 0; b.dead = 0.001;
  hideLabel(b.label);
  for (let k = 0; k < 8; k++) burst(b.x + rand(-2, 2), rand(1, 7), b.z, k % 2 ? PCOL.orange : PCOL.gold, 30, 10, 1.6);
  if (!TURBO) {
    G.shatters.push({ parts: FX.shatter(b.model.group, G.root, b.x, b.z, 9), t: 0 });
    for (let k = 0; k < 8; k++) spark(b.x + rand(-3, 3), rand(1, 9), b.z, k % 2 ? PCOL.gold : PCOL.white, 20, 10, 1.6, 1.0);
  }
  G.kick = 1.2;
  popAllRed();
  for (const e of G.effects) if (e.kind === 'tele') { e.life = Math.min(e.life, 0.01); e.onHit = () => {}; }
  G.phase = 'won'; G.phaseT = 0; G.shake = 1.4; G.shown = false; G.slow = 1.3;
  whiteFlash();
  banner('VICTORY!', 'gold', 2.6);
  if (overkill > b.max * 0.5) popup(`OVERKILL x${fmt(1 + overkill / b.max)}!`, 'combo c3', b.x, 8, b.z, 2.2);
  sound.play('win');
}
function lose(msg) {
  if (G.phase === 'lost' || G.phase === 'won') return;
  G.phase = 'lost'; G.phaseT = 0; G.shown = false; G.loseMsg = msg;
  logStage(G.stage, 'lost');
  banner('DEFEAT', 'red', 1.6);
  sound.play('lose');
}

// ---------------------------------------------------------------- rendering
let troopPixelScale = 1;
function troopInstance(P, i, near, far) {
  const distance = Math.hypot(P.x[i] - camera.position.x, camera.position.y, P.z[i] - camera.position.z);
  const pixels = P.sc[i] * troopPixelScale / Math.max(1, distance);
  P.detail[i] = pixels > (P.detail[i] ? 20 : 24) ? 1 : 0;
  const mesh = P.detail[i] ? near : far, at = mesh.count++;
  const motion = mesh.geometry.attributes.unitMotion.array;
  motion[at * 2] = P.phase[i];
  const floating = P === R && (RED_TYPES[P.kind[i]].fly || RED_TYPES[P.kind[i]].ghost);
  motion[at * 2 + 1] = P.st[i] || P.adur[i] > 0 || floating ? 0 : Math.min(1, Math.hypot(P.vx[i], P.vz[i]) / 6);
  return mesh;
}
function finishTroopMeshes(near, far) {
  for (const mesh of [near, far]) {
    mesh.instanceMatrix.needsUpdate = mesh.instanceColor.needsUpdate = true;
    mesh.geometry.attributes.unitMotion.needsUpdate = true;
  }
}
function writeBlue() {
  blueMesh.count = blueFarMesh.count = 0;
  const counts = weaponCounts; counts.fill(0);
  const rb = ((G.t * 5) | 0) % 32;
  let haloCount = 0, topRank = 0;
  for (let i = 0; i < B.n; i++) {
    const hp = B.hp[i], s = B.sc[i], tier = rankOf(hp);
    topRank = Math.max(topRank, tier);
    const col = tier === RANKS.length - 1 ? RAINBOW[(rb + i) & 31] : B.kind[i] && tier < 2 ? GIANT_RGB : TIER_RGB[tier];
    const body = troopInstance(B, i, blueMesh, blueFarMesh), index = body.count - 1;
    const m = body.instanceMatrix.array, c = body.instanceColor.array;
    writeMatrix(m, i, B, s, 1, index);
    if (tier >= 5 && haloCount < 24 && i % 7 === 0) {
      halos.add(B.x[i], 0.3, B.z[i], col, 1.45 * s, 0.19); haloCount++;
    }
    const weapon = B.weapon[i];
    if (weapon) {
      const mesh = weaponMeshes[weapon], at = counts[weapon]++;
      mesh.instanceMatrix.array.set(m.subarray(index * 16, index * 16 + 16), at * 16);
    }
    const f = Math.max(0, B.flash[i]) * 0.45;
    c[index * 3] = col[0] + (1 - col[0]) * f; c[index * 3 + 1] = col[1] + (1 - col[1]) * f; c[index * 3 + 2] = col[2] + (1 - col[2]) * f;
  }
  G.rank = topRank;
  for (let k = 1; k < weaponMeshes.length; k++) { weaponMeshes[k].count = counts[k]; weaponMeshes[k].instanceMatrix.needsUpdate = true; }
  finishTroopMeshes(blueMesh, blueFarMesh);
}
// unit matrix: heading + forward lean while running, squash & stretch on each step, pop-in when spawned
function writeMatrix(m, i, P, s, lean, instance = i) {
  const vx = P.vx[i], vz = P.vz[i];
  const ang = Math.atan2(vx, vz);
  const c = Math.cos(ang), si = Math.sin(ang);
  const run = Math.min(1, Math.hypot(vx, vz) / 6) * lean;
  const pitch = 0.22 * run, cp = Math.cos(pitch), sp = Math.sin(pitch);
  const ph = P.phase[i];
  const age = P.age[i];
  const pop = age < 0.2 ? 1 + 2.70158 * (age / 0.2 - 1) ** 3 + 1.70158 * (age / 0.2 - 1) ** 2 : 1; // easeOutBack
  const st = Math.sin(ph * 2) * 0.07 * (0.4 + run);
  const sy = s * pop * (1 + st), sxz = s * pop * (1 - st * 0.5);
  let y = Math.abs(Math.sin(ph)) * 0.14 * s * (0.3 + run);
  if (P === R && (RED_TYPES[P.kind[i]].fly || RED_TYPES[P.kind[i]].ghost)) y = redLift(i);
  if (P.adur[i] > 0) { const p = P.air[i] / P.adur[i]; y += Math.sin(Math.PI * Math.min(1, p)) * (2.5 + P.adur[i] * 4); }
  const o = instance * 16;
  m[o] = c * sxz; m[o + 1] = 0; m[o + 2] = -si * sxz; m[o + 3] = 0;
  m[o + 4] = si * sp * sy; m[o + 5] = cp * sy; m[o + 6] = c * sp * sy; m[o + 7] = 0;
  m[o + 8] = si * cp * sxz; m[o + 9] = -sp * sxz; m[o + 10] = c * cp * sxz; m[o + 11] = 0;
  m[o + 12] = P.x[i]; m[o + 13] = y; m[o + 14] = P.z[i]; m[o + 15] = 1;
}
const ovCount = Object.fromEntries(Object.keys(overlays).map(kind => [kind, 0]));
function addUnitGlow(matrix, index, x, y, z, color, size, alpha) {
  const o = index * 16;
  halos.add(
    matrix[o]*x + matrix[o+4]*y + matrix[o+8]*z + matrix[o+12],
    matrix[o+1]*x + matrix[o+5]*y + matrix[o+9]*z + matrix[o+13],
    matrix[o+2]*x + matrix[o+6]*y + matrix[o+10]*z + matrix[o+14],
    color, size, alpha,
  );
}
function writeRed() {
  redMesh.count = redFarMesh.count = 0;
  for (const k in ovCount) ovCount[k] = 0;
  let labels = 0, specialGlow = 0;
  for (let i = 0; i < R.n; i++) {
    const kind = R.kind[i], col = R.chill[i] > 0 ? TIER_RGB[1] : R.burn[i] > 0 ? TIER_RGB[6] : RED_RGB[kind];
    if (R.st[i]) { R.vx[i] = 0; R.vz[i] = 0.01; }
    const body = troopInstance(R, i, redMesh, redFarMesh), index = body.count - 1;
    const m = body.instanceMatrix.array, c = body.instanceColor.array;
    writeMatrix(m, i, R, R.sc[i], R.st[i] ? 0 : 0.8, index);
    const f = Math.max(0, R.flash[i]) * 0.75;
    c[index * 3] = col[0] + (1 - col[0]) * f; c[index * 3 + 1] = col[1] + (1 - col[1]) * f; c[index * 3 + 2] = col[2] + (1 - col[2]) * f;
    const ov = overlays[kind];
    if (ov) { ov.instanceMatrix.array.set(m.subarray(index * 16, index * 16 + 16), ovCount[kind] * 16); ovCount[kind]++; }
    if (body === redMesh && specialGlow < 12) {
      if (kind === 7 && specialGlow <= 10) {
        for (const side of [-1, 1]) {
          addUnitGlow(m, index, side * .184 * 1.2, .29 * 1.2, -.269 * 1.2, PCOL.ice, .55 * R.sc[i], .4);
        }
        specialGlow += 2;
      } else if (kind === 9) {
        halos.add(R.x[i], m[index * 16 + 13] + .7 * R.sc[i], R.z[i], PCOL.purple, 1.4 * R.sc[i], .12);
        specialGlow++;
      }
    }
    if ((kind === 1 || kind === 5) && labels < bruteLabels.length) placeLabel(bruteLabels[labels++], R.x[i], 1.2 + R.sc[i] * 0.9, R.z[i], fmtHp(R.hp[i]));
  }
  finishTroopMeshes(redMesh, redFarMesh);
  for (const k in overlays) { overlays[k].count = ovCount[k]; overlays[k].instanceMatrix.needsUpdate = true; }
  for (let k = labels; k < bruteLabels.length; k++) hideLabel(bruteLabels[k]);
}
function renderWorld(dt) {
  updateTroopMotion(G.t);
  labelLayer.style.visibility = G.phase === 'menu' || G.shown ? 'hidden' : 'visible';
  if (labelBoundsDirty && G.phase !== 'menu') {
    labelTop = Math.max($('topbar').getBoundingClientRect().bottom, $('target').getBoundingClientRect().bottom) + 8;
    labelBottom = $('bottom').getBoundingClientRect().top - 8;
    labelBoundsDirty = false;
  }
  // camera framing adapts to portrait (phones) and landscape (desktop)
  const aspect = innerWidth / innerHeight;
  const t = clamp((aspect - 0.5) / 0.5, 0, 1);
  const vf = clamp(2 * Math.atan(Math.tan((46 * Math.PI) / 360) / aspect) * (180 / Math.PI), 50, 80);
  G.kick = Math.max(0, (G.kick || 0) - dt * 2.5);
  const fov = vf + (reducedMotion ? 0 : G.kick * 2);
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov; camera.updateProjectionMatrix();
    FX.setGlowScale((innerHeight * renderer.getPixelRatio()) / (2 * Math.tan((fov * Math.PI) / 360)));
  }
  G.shake = Math.max(0, G.shake - dt * 2.2);
  const sh = reducedMotion ? 0 : Math.min(0.22, G.shake * 0.22);
  // swoop in at the start of every stage, push toward the boss after a win
  const intro = !reducedMotion && G.phase === 'intro' ? 1 - Math.min(1, G.phaseT / 1.2) : 0;
  const swoop = intro * intro * (3 - 2 * intro);
  const win = !reducedMotion && G.phase === 'won' ? Math.min(1, G.phaseT / 2.2) : 0;
  const push = win * win * (3 - 2 * win) * 16;
  G.camLag = (G.camLag ?? G.cx) + (G.cx - (G.camLag ?? G.cx)) * Math.min(1, dt * 4);
  camera.position.set(G.camLag * 0.22 + rand(-sh, sh), 18 + t * 4 + swoop * 9 - push * 0.25 + rand(-sh, sh), G.camZ + 13.5 + t * 6.5 + swoop * 10 - push);
  camera.lookAt(G.camLag * 0.12, 0, G.camZ - 23 + t * 1 - push);
  sky.position.copy(camera.position);
  ambient.update(G.t, G.camZ);
  sun.position.set(12, 34, G.camZ + 4);
  sun.target.position.set(0, 0, G.camZ - 26);

  // cannons
  G.recoil = Math.max(0, G.recoil - dt * 9);
  const vel = dt > 0 ? (G.cx - (G.prevCx ?? G.cx)) / dt : 0;
  G.prevCx = G.cx;
  G.cannonPulse = Math.max(0, (G.cannonPulse || 0) - dt * 2.5);
  cannon.group.position.set(G.cx, 0, G.cannonZ + G.recoil * 0.12);
  cannon.group.rotation.y = (G.cx - G.aim) * 0.08;
  cannon.group.rotation.z = clamp(-vel * 0.012, -0.18, 0.18);
  cannon.shield.visible = (G.shield > 0 || G.guardFlash > 0) && G.phase !== 'menu';
  cannon.shield.rotation.y += dt * 0.3;
  cannon.shield.material.opacity = .06 + G.cannonPulse * .25 + G.guardFlash * .35;
  cannon.shield.material.color.setHex(G.guardFlash > 0 ? 0xd4fbff : 0x75ebff);
  cannon.group.scale.setScalar((G.chassis ? 1.12 : 1) + G.cannonPulse * 0.25 + G.recoil * 0.03);
  const roll = dt * (G.phase === 'move' ? 14 : 0) + Math.abs(vel) * dt * 1.5;
  const drive = Math.abs(vel) + (G.phase === 'move' ? 10 : 0);
  cannon.animateVehicle(G.t, dt, G.recoil, drive, G.charge / CHARGE_MAX);
  for (const w of cannon.wheels) w.rotation.x -= roll;
  for (const w of twinCannon.wheels) w.rotation.x -= roll;
  if (Math.abs(vel) > 6 && Math.random() < 0.5) spark(G.cx, 0.2, G.cannonZ + 0.8, PCOL.dust, 1, 1.5, 0.9, 0.4, 1);
  cannon.barrels.children.forEach((b, k) => { b.position.z = -Math.max(0, G.recoil - k * 0.15) * 0.25; });
  cannon.glow.scale.setScalar(0.8 + (G.charge / CHARGE_MAX) * 0.9);
  cannon.glowMat.color.set(G.power >= 8 ? 0xff6af0 : G.power >= 2 ? 0xffd23a : 0xaef6ff);
  squadCannons.forEach((c, k) => {
    c.group.visible = k < G.squad && G.phase !== 'menu';
    if (!c.group.visible) return;
    c.group.position.set(squadX(k), 0, G.cannonZ + 1.1 + Math.abs(SQUAD_OFF[k]) * 0.12 + G.recoil * 0.1);
    c.group.rotation.z = cannon.group.rotation.z;
    c.glowMat.color.copy(cannon.glowMat.color);
    for (const w of c.wheels) w.rotation.x -= roll;
    c.barrels.children.forEach((b, j) => { b.position.z = -Math.max(0, G.recoil - j * 0.15) * 0.25; });
  });
  if (G.twin) {
    twinCannon.animateVehicle(G.t, dt, G.recoil, drive, G.charge / CHARGE_MAX);
    twinCannon.group.position.set(twinX(), 0, G.cannonZ + G.recoil * 0.12);
    twinCannon.group.rotation.z = -cannon.group.rotation.z;
    twinCannon.group.scale.copy(cannon.group.scale);
    twinCannon.glowMat.color.copy(cannon.glowMat.color);
  }

  for (const model of airWings.values()) model.group.visible = false;
  if (G.airPass > 0 && G.aircraft && G.phase !== 'menu') {
    const airWing = supportAircraft(G.airTier || G.aircraft);
    airWing.group.visible = true;
    const p = 1 - G.airPass / 2.2;
    airWing.group.position.set((G.airX ?? 0) + Math.sin(p * Math.PI * 2) * 1.1, 6.5 + Math.sin(p * Math.PI) * 2, G.cannonZ + 5 - p * 79);
    airWing.group.rotation.z = Math.sin(p * Math.PI * 2) * 0.25;
    airWing.engines.forEach(e => e.scale.set(1, 1, .8 + Math.sin(G.t * 40) * .2));
  }
  // stage objects
  for (const S of G.stages) {
    const cur = S === G.stage;
    S.group.visible = cur || G.phase === 'move' && S.i === G.stageIdx + 1;
    for (const g of S.gates) {
      const grp = g.model.group;
      if (!g.alive) {
        if (g.dying > 0) { g.dying = Math.max(0, g.dying - dt * 3); grp.scale.setScalar(Math.max(0.01, g.dying)); }
        if (g.dying <= 0) grp.visible = false;
        continue;
      }
      grp.position.x = g.x;
      if (g.dirty && G.t - g.refT > 0.08) { g.refT = G.t; refreshGate(g); }
      const t = g.def.t;
      if (g.model.icon) { g.model.icon.rotation.y = Math.sin(G.t * 1.5 + g.ph) * .35; g.model.icon.position.y = 2.8 + Math.sin(G.t * 2 + g.ph) * .12; }
      if (g.def.phase) {
        const P2 = g.def.phase, ph = (G.t + (P2.off ?? 0)) % P2.period, edge = g.on ? P2.on - ph : P2.period - ph;
        const blink = edge < 0.5 && Math.sin(G.t * 40) > 0;
        grp.visible = g.on ? edge >= 0.5 || blink : blink;
      }
      if (!BLOCKERS.has(t) && t !== 'jump') grp.scale.set(1 + g.flash * 0.05, 1 + g.flash * 0.09, 1);
      if (g.model.text) g.model.text.scale.setScalar(1 + g.flash * 0.14 + (g.def.mega ? Math.sin(G.t * 5) * 0.04 : 0) + (g.spin > 0 ? 0.08 : 0));
      if (t === 'portal' || t === 'loop') { g.model.swirl.rotation.z -= dt * (t === 'loop' ? -7 : 5); g.model.panelMat.opacity = 0.55 + g.flash * 0.35; }
      else if (t === 'jump') { grp.scale.set(1, 1 - g.flash * 0.35, 1); }
      else if (t === 'hangar') { g.model.plane.position.y = 2.2 + Math.sin(G.t * 2 + g.ph) * 0.15; g.model.plane.rotation.z = Math.sin(G.t * 1.3 + g.ph) * 0.1; }
      else if (t === 'tesla') { g.model.orb.scale.setScalar(g.active ? 1 + Math.sin(G.t * 30) * 0.15 + (g.zapT < 0.1 ? 0.4 : 0) : 0.7 + g.prog / g.need * 0.4); g.model.panelMat.opacity = (g.active ? 0.2 : 0.45) + g.flash * 0.3; }
      else if (t === 'nuke' && g.coolUntil > S.time) g.model.panelMat.opacity = 0.12 + Math.abs(Math.sin(G.t * 4)) * 0.2;
      else if (t !== 'statue') g.model.panelMat.opacity = (t === 'ice' ? 0.82 : t === 'fence' ? 0.9 : 0.55) + g.flash * 0.35;
      if (BLOCKERS.has(t) || REDGATES.has(t)) grp.position.x = g.x + Math.sin(G.t * 60) * g.flash * 0.08;
      if (t === 'star') g.model.setColor(new THREE.Color().setHSL((G.t * 0.4) % 1, 1, 0.6));
    }
    for (const ex of S.exits) ex.ring.rotation.z += dt * 2;
    for (const bt of S.belts) bt.model.tex.offset.x -= dt * 0.9;
    for (const tn of S.tornados) {
      tn.model.group.position.x = tn.x;
      tn.model.strands.forEach((strand, k) => {
        strand.rotation.y += dt * (3.2 + k * .5);
        strand.position.x = Math.sin(G.t * 3 + k * .6) * .07 * k;
      });
      tn.model.core.rotation.y += dt * 4;
    }
    for (const h of S.holes) {
      const m = h.model;
      if (!h.alive) { h.dying = Math.max(0, h.dying - dt * 2); m.group.scale.setScalar(Math.max(0.001, h.dying)); if (h.dying <= 0) m.group.visible = false; continue; }
      m.disk.rotation.z += dt * 2.5;
      m.halo.lookAt(camera.position);
      m.group.scale.setScalar(1 + (h.prog / h.need) * 0.35 + Math.sin(G.t * 4) * 0.03);
      if (h.shown !== h.prog) { h.shown = h.prog; M.drawLabel(m.label, 'SUPERNOVA', `${fmt(h.prog)}/${fmt(h.need)}`, h.prog / h.need, '#ffb070'); }
    }
    for (const b of S.balls) {
      if (!b.alive) continue;
      b.flash = Math.max(0, b.flash - dt * 5);
      b.model.group.position.set(b.x, b.r, b.z);
      b.model.spin.scale.setScalar(b.r * (1 + b.flash * 0.05));
      b.model.inst.count = Math.max(12, Math.ceil(b.model.count * Math.max(0, b.hp / b.max)));
      b.model.material.color.set(b.flash > 0.1 ? 0xffc7a0 : b.chill > 0 ? 0x93e7ff : 0xe8222a);
      b.model.warning.material.color.setHex(b.chill > 0 ? 0x80eaff : 0xff6644);
      b.model.warning.position.y = -b.r + 0.035;
      b.model.warning.scale.setScalar(b.r + 0.5);
      b.model.warning.material.opacity = b.delay > 0 ? 0.18 + Math.sin(G.t * 6) * 0.08 : 0.32;
      b.label.el.style.setProperty('--health', `${Math.max(0, b.hp / b.max) * 100}%`);
      if (cur) placeLabel(b.label, b.x, b.r * 2 + 0.8, b.z, `${fmtHp(b.hp)}${b.delay > 0 ? ' / ' + Math.ceil(b.delay) + 's' : ''}`); else hideLabel(b.label);
    }
    for (const p of S.pillars) {
      if (!p.alive) continue;
      p.flash = Math.max(0, p.flash - dt * 5);
      p.model.group.position.x = p.x + Math.sin(G.t * 60) * p.flash * 0.06;
      if (cur && (p.hp < p.max || Math.abs(p.x - G.cx) < 1.5)) placeLabel(p.label, p.x, 10.8, p.z, fmtHp(p.hp)); else hideLabel(p.label);
    }
    for (const s of S.saws) {
      s.model.group.position.x = s.x;
      s.model.blade.rotation.z -= dt * 14;
    }
    for (const c of S.crushers) {
      c.model.block.position.y = c.y ?? 4;
      c.model.shadow.material.opacity = (c.warn || 0) * 0.5 + (c.down ? 0.3 : 0);
    }
    for (const s of [...S.spawners, ...S.turrets]) {
      if (!s.alive) continue;
      s.flash = Math.max(0, s.flash - dt * 4);
      s.model.group.scale.setScalar(1 + s.flash * 0.08);
      if (s.model.head && s.aim !== undefined) s.model.head.rotation.y = s.aim;
      if (cur) placeLabel(s.label, s.x, s.model.head ? 2.8 : 3.2, s.z, fmtHp(s.hp));
      else hideLabel(s.label);
    }
    if (S.tower) {
      const T = S.tower;
      T.flash = Math.max(0, T.flash - dt * 5);
      if (T.alive) {
        T.model.group.position.x = Math.sin(G.t * 70) * T.flash * 0.06;
        T.model.group.scale.set(1 + T.flash * 0.015, 1 - T.flash * 0.035, 1);
        if (cur) placeLabel(T.label, 0, 9.4, T.z - 0.5, fmtHp(T.hp));
        else hideLabel(T.label);
      } else hideLabel(T.label);
    }
    if (S.fort) { if (cur) placeLabel(S.fort.label, S.fort.x, 5.5, S.fort.z, fmtHp(S.fort.hp)); else hideLabel(S.fort.label); }
    if (S.boss) {
      const b = S.boss, grp = b.model.group;
      b.flash = Math.max(0, b.flash - dt * 5);
      grp.position.set(b.x, 0, b.z);
      if (b.dead > 0) {
        b.dead += dt;
      } else {
        b.model.animate(G.t, b.atk > 0 ? Math.min(1, b.atk) : 0);
        grp.scale.setScalar(1 + b.flash * 0.025);
        if (cur) placeLabel(b.label, b.x, b.model.height + 1.6, b.z, fmtHp(b.hp));
        else hideLabel(b.label);
      }
    }
  }

  troopPixelScale = innerHeight * 1.2 / (2 * Math.tan(camera.fov * Math.PI / 360));
  halos.begin();
  writeBlue();
  writeRed();
  halos.end();
  updateParticles(dt);
  updatePopups(dt);
  sparks.update(dt);
  tracers.update(dt);
  impactRings.update(dt);
  debris.update(dt);
  M.shineTexture().offset.x = (G.t * 0.45) % 1;
  for (let k = G.shatters.length - 1; k >= 0; k--) {
    const sh = G.shatters[k];
    sh.t += dt;
    if (!FX.updateShatter(sh.parts, dt, sh.t)) { for (const p of sh.parts) p.m.visible = false; G.shatters.splice(k, 1); }
  }

  // damage numbers over the current target
  G.dmgT += dt;
  if (G.dmgT > 0.35) {
    G.dmgT = 0;
    const S = G.stage;
    const T = S.tower && S.tower.alive ? S.tower : S.boss && S.boss.alive ? S.boss : null;
    if (T && G.dmgAcc >= 1) popup('-' + fmt(G.dmgAcc), G.dmgAcc >= T.max * 0.05 ? 'dmg big' : 'dmg', (T.x ?? 0) + rand(-4, 4), T.model.height ? T.model.height * 0.45 : 3, T.z + 2);
    G.dmgAcc = 0;
  }

  // HUD
  G.armyShown = Math.expm1(Math.log1p(G.armyShown || 0) + (Math.log1p(G.army) - Math.log1p(G.armyShown || 0)) * Math.min(1, dt * 10));
  setHud('army', hud.army, fmt(Math.abs(G.armyShown - G.army) < 0.5 ? G.army : G.armyShown));
  G.pumpT -= dt;
  if (G.army > G.armyPrev * 1.6 && G.army > 20 && G.pumpT <= 0) {
    G.pumpT = 0.35;
    hud.armybox.classList.remove('pump'); void hud.armybox.offsetWidth; hud.armybox.classList.add('pump');
  }
  G.armyPrev = G.armyPrev * 0.9 + G.army * 0.1;
  setHud('armyTier', hud.army, G.army >= 1e9 ? 't4' : G.army >= 1e6 ? 't3' : G.army >= 1000 ? 't2' : '', 'className');
  setHud('lives', hud.lives, `<span class="heart">❤</span>${Math.max(0, G.lives)}`, 'innerHTML');
  if (hudCache.livesLow !== G.lives <= 3) { hudCache.livesLow = G.lives <= 3; hud.lives.classList.toggle('low', G.lives <= 3); }
  const rank = RANKS[G.rank];
  setHud('rank', $('rankname'), rank.name);
  $('rankdot').style.backgroundColor = '#' + rank.color.toString(16).padStart(6, '0');
  const target = G.stage?.tower?.alive ? G.stage.tower : G.stage?.boss;
  const health = target ? Math.max(0, target.hp / target.max) : 0;
  setHud('targetHealth', $('targetfill'), `${health * 100}%`, 'width');
  setHud('targetText', $('targetname'), `${G.stage?.boss ? 'Boss' : 'Fort'} ${fmtHp(Math.max(0, target?.hp || 0))} · ${Math.ceil(health * 100)}%`);
  setHud('shield', $('shieldcount'), G.shield > 0 ? `Armor ${G.shield}` : '');
  setHud('surge', $('surge'), G.overdrive > 0 ? `Wreck bonus x2 / ${Math.ceil(G.overdrive)}s` : G.stage?.breach >= 2 ? `Breach x${G.stage.breach.toFixed(1)}` : '');
  setHud('charge', hud.charge, ((G.charge / CHARGE_MAX) * 100).toFixed(0) + '%', 'width');
  if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) hud.banner.className = ''; }
  if (tipTimer > 0) { tipTimer -= dt; if (tipTimer <= 0) hud.tip.className = 'stroke'; }
}

// ---------------------------------------------------------------- menus
function starsHtml(n) { return [0, 1, 2].map((i) => `<span class="${i < n ? 'on' : ''}">★</span>`).join(''); }
function showMenu(preserveRun = false) {
  if (preserveRun === true && ['intro','play','clear','move'].includes(G.phase)) G.resumePhase = G.phase;
  else G.resumePhase = null;
  if ($('pause').open) $('pause').close();
  document.body.classList.remove('game-paused');
  resetInput(); sound.setPaused(true);
  G.phase = 'menu';
  hud.root.classList.add('hidden');
  $('result').classList.add('hidden');
  const status = renderCampaignMap($('levels'), LEVELS, THEMES, progress, index => { sound.unlock(); if (G.resumePhase && index === G.levelIdx) resumeRun(); else startLevel(index); });
  $('mapcount').textContent = `${status.cleared} / ${LEVELS.length} worlds cleared`;
  $('mapresume').textContent = G.resumePhase ? `Resume / ${G.levelIdx+1}.${G.stageIdx+1}` : status.complete ? 'Replay the finale' : `${status.unlocked ? 'Continue' : 'Play'} / ${status.unlocked + 1}`;
  $('mapresume').onclick = () => { sound.unlock(); if (G.resumePhase) resumeRun(); else startLevel(status.unlocked); };
  $('menu').classList.remove('hidden');
  requestAnimationFrame(() => {
    if (G.phase !== 'menu') return;
    const focusLevel = G.resumePhase ? G.levelIdx : status.unlocked;
    if (innerWidth <= 600 && focusLevel >= 6) $('levels').querySelector(`[data-level="${focusLevel}"]`)?.scrollIntoView({ block: 'center', behavior: 'instant' });
    else $('menu').scrollTop = 0;
  });
  for (const L of bruteLabels) hideLabel(L);
  for (const p of popups) { p.life = 0; p.el.style.display = 'none'; }
  for (const S of G.stages) {
    if (S.tower) hideLabel(S.tower.label);
    if (S.boss) hideLabel(S.boss.label);
    if (S.fort) hideLabel(S.fort.label);
    for (const s of [...S.spawners, ...S.turrets, ...S.pillars, ...S.balls]) hideLabel(s.label);
  }
}
function showResult(win) {
  const stars = win ? (G.lives >= 8 ? 3 : G.lives >= 4 ? 2 : 1) : 0;
  if (win) recordVictory();
  $('rtitle').textContent = win ? 'LEVEL COMPLETE!' : 'DEFEATED';
  $('rtitle').className = win ? 'win' : 'lose';
  $('rstars').innerHTML = win ? starsHtml(stars) : '';
  const last = G.levelIdx >= LEVELS.length - 1;
  const bossLoss = !!G.stage.boss;
  const tip = bossLoss
    ? 'Tip: chain gates in a row and grab POWER/upgrades first. A huge army pushes the boss back!'
    : 'Tip: gates in a row multiply each other. Break fences, ice and barriers to reach the big ones!';
  const stats = `<div class="stats"><span>MAX ARMY<b data-v="${G.maxArmy}">0</b></span><span>BEST COMBO<b data-v="${G.bestCombo}" data-p="x">x1</b></span><span>CRUSHED<b data-v="${G.kills}">0</b></span></div>`;
  $('rmsg').innerHTML = win
    ? stats + `Hearts left: ${G.lives}/${BASE_LIVES}<br><small>★★★ = 8+ hearts · ★★ = 4+ hearts</small>` +
      (last ? `<br><b class="champ">ALL ${LEVELS.length} LEVELS CLEARED! You are the Swarm Master!</b>` : '')
    : stats + `${G.loseMsg}<br><small>${tip}</small>`;
  $('rretry').classList.toggle('hidden', win);
  $('rrestart').textContent = win ? 'REPLAY' : 'RESTART LEVEL';
  $('rnext').classList.toggle('hidden', !win || last);
  $('result').classList.remove('hidden');
  countUp();
  if (win) for (let k = 0; k < stars; k++) setTimeout(() => sound.play('combo', k + 1), 380 + k * 250);
}
// result numbers roll up (log scale, so 1e20 counts as nicely as 200)
function countUp() {
  const els = [...document.querySelectorAll('#rmsg b[data-v]')];
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / 1100), e = 1 - (1 - p) ** 3;
    for (const el of els) {
      const v = +el.dataset.v, shown = Math.expm1(Math.log1p(v) * e);
      el.textContent = (el.dataset.p || '') + fmt(p >= 1 ? v : shown);
    }
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
$('rnext').addEventListener('click', () => startLevel(G.levelIdx + 1));
$('rretry').addEventListener('click', () => {
  const snap = G.snap;
  startLevel(G.levelIdx, snap.stage);
  Object.assign(G, { barrels: snap.barrels, rate: snap.rate, power: snap.power, twin: snap.twin, squad: snap.squad, chassis: snap.chassis, weapon: snap.weapon, weaponMask: snap.weaponMask, aircraft: snap.aircraft, shield: snap.shield, lives: Math.max(snap.lives, 5) });
  setBarrels(G.barrels);
  cannon.setChassis(G.chassis); twinCannon.setChassis(G.chassis);
  twinCannon.group.visible = G.twin;
  renderUps();
  G.snap = { ...snap, lives: G.lives };
});
$('rrestart').addEventListener('click', () => startLevel(G.levelIdx));
$('rmenu').addEventListener('click', showMenu);
$('menubtn').addEventListener('click', () => { if (!pauseGame() && ['won','lost'].includes(G.phase)) showMenu(); });
const muteBtn = $('mute');
muteBtn.textContent = sound.muted ? '🔇' : '🔊';
muteBtn.addEventListener('click', () => { sound.unlock(); muteBtn.textContent = sound.toggle() ? '🔇' : '🔊'; });

// ---------------------------------------------------------------- input
let drag = null;
const keys = { left: false, right: false };
function resetInput() { drag = null; keys.left = keys.right = false; }
function pauseGame() {
  if ($('pause').open || !['intro','play','clear','move'].includes(G.phase)) return false;
  resetInput(); G.paused = true; acc = 0; sound.setPaused(true);
  document.body.classList.add('game-paused');
  $('pausewhere').textContent = `${LEVELS[G.levelIdx].name} / Stage ${G.stageIdx+1}`;
  $('pause').showModal();
  return true;
}
function resumeGame() {
  if (!$('pause').open) return;
  $('pause').close(); G.paused = false; resetInput(); acc = 0; last = performance.now();
  document.body.classList.remove('game-paused');
  if (!TURBO) sound.unlock(); sound.setPaused(false);
  canvas.focus({ preventScroll: true });
}
function resumeRun() {
  if (!G.resumePhase) return;
  G.phase = G.resumePhase; G.resumePhase = null; G.paused = false;
  $('menu').classList.add('hidden'); hud.root.classList.remove('hidden');
  labelBoundsDirty = true;
  resetInput(); acc = 0; last = performance.now(); sound.setPaused(false);
  canvas.focus({ preventScroll: true });
}
$('resume').addEventListener('click', resumeGame);
$('pauseretry').addEventListener('click', () => $('rretry').click());
$('pausemap').addEventListener('click', () => showMenu(true));
$('pause').addEventListener('cancel', event => { event.preventDefault(); resumeGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
addEventListener('blur', () => { resetInput(); pauseGame(); });
canvas.addEventListener('pointerdown', (e) => {
  if (G.paused || !['intro','play'].includes(G.phase)) return;
  sound.unlock();
  drag = { id: e.pointerId, x: e.clientX, aim: G.aim };
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  hud.hint.classList.add('hidden');
});
addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const ref = Math.min(innerWidth, innerHeight * 0.75);
  G.aim = clamp(drag.aim + ((e.clientX - drag.x) / ref) * 15, -XLIM + 0.2, XLIM - 0.2);
});
const endDrag = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
addEventListener('pointerup', endDrag);
addEventListener('pointercancel', endDrag);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('pause').open) { if (pauseGame()) e.preventDefault(); return; }
  if ((e.key === 'p' || e.key === 'P') && !e.repeat) { e.preventDefault(); if ($('pause').open) resumeGame(); else pauseGame(); return; }
  if (G.paused || G.phase === 'menu' || G.shown) return;
  if (['ArrowLeft','ArrowRight','a','A','d','D'].includes(e.key)) e.preventDefault();
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  if (keys.left || keys.right) hud.hint.classList.add('hidden');
});
addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------------------------------------------------------------- main loop
let last = performance.now(), acc = 0, fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) { G.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  // The map is opaque, so rendering the battlefield behind it only spends GPU time.
  if (G.phase === 'menu') { acc = 0; return; }
  if (G.paused) { acc = 0; return; }
  if (TURBO) {
    // headless balance testing: burn ~30ms of CPU per frame on simulation, render nothing
    const t0 = performance.now();
    while (G.phase !== 'menu' && performance.now() - t0 < 30) step(STEP);
    return;
  }
  if (G.phase !== 'menu') {
    if (keys.left) G.aim = Math.max(-XLIM + 0.2, G.aim - 11 * dt);
    if (keys.right) G.aim = Math.min(XLIM - 0.2, G.aim + 11 * dt);
    const slow = G.slow > 0 ? 0.3 : 1;
    if (G.slow > 0) G.slow -= dt;
    acc += dt * SPEED * slow;
    let n = 0;
    while (acc >= STEP && n < 6 * SPEED) { step(STEP); acc -= STEP; n++; }
    if (n >= 6 * SPEED) acc = 0;
    renderWorld(dt * SPEED * slow);
  }
  renderer.render(scene, camera);
}

// Build the battlefield only when a run starts. Opening the map must not consume onboarding.
showMenu();
const startParam = params.get('level');
if (startParam) startLevel(clamp((+startParam || 1) - 1, 0, LEVELS.length - 1), clamp((+params.get('stage') || 1) - 1, 0, 2));
requestAnimationFrame(frame);
sceneReady = true;

// test / debug hooks
window.__game = {
  get state() {
    const S = G.stage;
    return {
      phase: G.phase, level: G.levelIdx + 1, stage: G.stageIdx + 1, blueUnits: B.n, redUnits: R.n, army: G.army, maxArmy: G.maxArmy,
      bestCombo: G.bestCombo, lives: G.lives, towerHp: S?.tower ? S.tower.hp : null, bossHp: S?.boss ? S.boss.hp : null,
      bossZ: S?.boss ? +(G.z0 - S.boss.z).toFixed(1) : null, guns: G.barrels, rate: G.rate, power: G.power, twin: G.twin, chassis: G.chassis, weapon: G.weapon, aircraft: G.aircraft, shield: G.shield, rank: G.rank,
      log: G.log, fps: G.fps, time: +G.time.toFixed(1), stageTime: +(S?.time ?? 0).toFixed(1), dmgTotal: G.dmgTotal, kills: G.kills,
    };
  },
  gates() {
    return G.stage.gates.filter((g) => g.alive).map((g) => ({
      t: g.def.t === 'flip' || g.def.t === 'slot' ? g.cur.t : g.def.t, flip: g.def.t === 'flip', slot: g.def.t === 'slot', opts: g.def.opts,
      boost: g.boost, v: (g.def.t === 'charge' ? g.val : g.cur.v) * (g.cur.t === 'div' ? 1 : g.boost), max: g.def.max,
      x: +g.x.toFixed(2), d: +(G.z0 - g.z).toFixed(1), w: g.w, hp: g.hp, need: g.need, prog: g.prog, up: g.cur.up, to: g.def.to,
      slide: !!g.def.slide, fa: g.def.a, fb: g.def.b, passes: g.passes || 0, on: g.on, active: g.active, phase: g.def.phase, loopMax: g.def.max,
    }));
  },
  hazards() {
    const S = G.stage;
    return {
      walls: S.def.walls || [], saws: S.saws.map((s) => ({ x: s.x, d: G.z0 - s.z, r: s.r })), crushers: S.crushers.map((c) => ({ x: c.x, d: G.z0 - c.z, w: c.w })),
      turrets: S.turrets.filter((t) => t.alive).map((t) => ({ x: t.x, d: G.z0 - t.z, hp: t.hp })),
      balls: S.balls.filter((b) => b.alive).map((b) => ({ x: b.x, d: G.z0 - b.z, r: b.r, hp: b.hp, max: b.max, delay: b.delay })),
      holes: S.holes.filter((h) => h.alive).map((h) => ({ x: h.x, d: G.z0 - h.z, r: h.r, need: h.need, prog: h.prog })),
      tornados: S.tornados.map((t) => ({ x: t.x, d: G.z0 - t.z, r: t.r })),
      belts: S.belts.map((b) => ({ x: b.x, w: b.w, v: b.v, d1: G.z0 - b.zBot, d2: G.z0 - b.zTop })),
      pillars: S.pillars.filter((p) => p.alive).map((p) => ({ x: p.x, d: G.z0 - p.z, hp: p.hp })),
      zones: G.zones.map((z) => ({ x: z.x, d: G.z0 - z.z, w: z.w, len: z.d })),
      spawners: S.spawners.filter((t) => t.alive).map((t) => ({ x: t.x, d: G.z0 - t.z, hp: t.hp })),
    };
  },
  aim(x) { G.aim = clamp(x, -XLIM + 0.2, XLIM - 0.2); },
  get aimX() { return G.aim; },
  threats() { return G.effects.filter((e) => e.kind === 'tele' && e.cannon).map((e) => ({ x: e.x, w: e.a, t: e.life })); },
  start(level, stage = 1) { startLevel(level - 1, stage - 1); },
  setBot(fn) { G.bot = fn; },
  pause(value = true) { G.paused = value; },
  // red units closer than maxD to the cannon: [x, d, hp]
  reds(maxD = 16) { const out = []; for (let i = 0; i < R.n; i++) { const d = G.z0 - R.z[i]; if (R.hp[i] > 0 && d < maxD) out.push([R.x[i], d, R.hp[i]]); } return out; },
  // debug only: evaluate an expression inside the engine module (tools/peek, tools/probe)
  dbg(src) { return eval(src); },
  units() { const out = []; for (let i = 0; i < B.n; i += 25) out.push([+B.x[i].toFixed(1), +(G.z0 - B.z[i]).toFixed(1), +B.hp[i].toPrecision(2), +B.vx[i].toFixed(1), +B.vz[i].toFixed(1)]); return { n: B.n, z0: G.z0, towerZ: G.stage.tower?.z, alive: G.stage.tower?.alive, out }; },
  snapshot() { return { flux: G.barrels * G.rate * G.power / BASE_INTERVAL * ((G.twin ? 2 : 1) + G.squad) }; },
  leaks() {
    let n = 0;
    for (const g of G.stage.gates) {
      if (!g.alive || !BLOCKERS.has(g.def.t)) continue;
      for (let i = 0; i < R.n; i++) {
        if (R.hp[i] <= 0 || RED_TYPES[R.kind[i]].fly || RED_TYPES[R.kind[i]].ghost) continue;
        if (Math.abs(R.x[i] - g.x) < g.w / 2 - 0.05 && R.z[i] > g.z - 0.25 && R.z[i] < g.z + 0.3) n++;
      }
    }
    return n;
  },
};
