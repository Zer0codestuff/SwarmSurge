// Live playable-ad title screen demo: a single moving blue player cannon makes
// real-time gate choices across paired multiplier & trap rows, deliberately
// falling for suboptimal/bad paths while clashing against Red Raiders and the
// Ember Drake on a sunlit coastal causeway. Zero main.js/levels.js imports.
import * as THREE from 'three';
import {
  buildCannon,
  buildGate,
  buildSunforge,
  drawLabel,
  makeCanvasLabel,
  shineTexture,
  textPlane,
  troopWeaponGeo,
} from './title-kit.js';
import { buildSculptedCore } from './boss-sculpted-core.js';
import { SUNWING_FORM, troopFormGeometry, raiderGeometry } from './troop-forms.js';
import { installTroopMotion } from './unit-assets.js';
import { createSupportAircraft } from './air-assets.js';
import { buildTitleCoast } from './title-islands.js';

const CANNON_Z = 9.05;
const MUZZLE_Z = 7.55;
const ROAD_HALF = 3.72;
const BOSS_Z = -10.8;
const LOOP_DUR = 18.0;
const WARMUP_TIME = 2.05; // Frame 0 / reduced-motion starts mid-action with full swarm & jet
const FIXED_DT = 1 / 60;

const MAX_BLUE = 148;
const MAX_RED = 34;
const MAX_TRACERS = 22;
const MAX_RINGS = 16;
const MAX_SPARKS = 54;
const MOTE_CAP = 24;

const mod = THREE.MathUtils.euclideanModulo;
const clamp = THREE.MathUtils.clamp;
const smoothstep = THREE.MathUtils.smoothstep;

// Choreographed 18-second "bad mobile-ad player" steering timeline [time, targetX].
// Optimal lane is LEFT (x = -2.1: x4 -> x3 Sunforge -> x5).
// The AI repeatedly drifts or fake-out swerves into RIGHT (+2 -> -8 -> ÷2)!
const AI_KEYS = [
  [0.0, -2.12],  // Starts strong on LEFT (x4 -> x3)
  [2.5, -2.12],
  [3.6, 2.08],   // Randomly drifts RIGHT into +2 / -8 / ÷2!
  [6.9, 2.12],   // Stubbornly feeds the red trap lane while Raiders push forward
  [8.1, -1.72],  // Classic rage-bait FAKE-OUT: slides toward x4...
  [8.8, -1.65],  // ...hesitates for a split second...
  [9.8, 2.10],   // ...then SWERVES right back into -8 and ÷2!
  [11.3, 2.05],
  [12.0, -0.55], // Panic zig-zag near the center line as Raiders close in
  [12.6, 1.25],
  [13.3, -2.15], // Heroic rally on LEFT (x4 -> x3 Sunforge -> Sunwings + Strike Jet!)
  [15.8, -2.15], // Gets Ember Drake down to low HP...
  [16.6, 1.95],  // ...then inexplicable last-second swerve back into -8 / ÷2!
  [17.3, 1.85],
  [18.0, -2.12], // Seamless wrap back to start
];

function sampleAdCannonX(t) {
  const u = mod(t, LOOP_DUR);
  for (let i = 0; i < AI_KEYS.length - 1; i++) {
    const [t0, x0] = AI_KEYS[i];
    const [t1, x1] = AI_KEYS[i + 1];
    if (u <= t1) {
      const p = smoothstep((u - t0) / Math.max(0.001, t1 - t0), 0, 1);
      // Slight human hand micro-sway so the cannon feels live-steered.
      const micro = Math.sin(t * 2.7) * 0.08 + Math.sin(t * 5.1) * 0.04;
      return THREE.MathUtils.lerp(x0, x1, p) + micro;
    }
  }
  return -2.12;
}

// Smooth dwell wave for Row 3 sliding pair: pauses on each side so lanes read clearly,
// then glides across so the bad AI frequently mis-times x5 vs ÷2.
function sampleRow3Shift(t) {
  const s = Math.sin((t - 2.05) * (Math.PI * 2 / 11.5));
  const shaped = Math.sign(s) * Math.pow(Math.abs(s), 0.65);
  return shaped * 2.1; // -2.1 -> +2.1 swap
}

function frameGameplayCamera(camera, aspect, camLag) {
  const wide = aspect >= 1.14;
  camera.aspect = aspect;
  camera.fov = wide ? 44 : clamp(56 + (0.62 - aspect) * 26, 52, 64);
  camera.updateProjectionMatrix();
  if (wide) {
    // Shift camera slightly left so the single gameplay road sits cleanly in the
    // right ~60% of the viewport, leaving calm sunlit ocean behind the title & CTA.
    const cx = -3.4 + camLag * 0.14;
    camera.position.set(cx, 13.8, 19.2);
    camera.lookAt(-3.0 + camLag * 0.08, 0.75, -1.75);
  } else {
    // Portrait mobile: frame the entire road cleanly in the central vertical band
    // below the top title mark and above the bottom PLAY / Settings controls.
    const cx = camLag * 0.10;
    camera.position.set(cx, 23.2, 26.8);
    camera.lookAt(camLag * 0.05, 0.1, 0.45);
  }
}

function instances(scene, geometry, material, capacity, withColor = false) {
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (withColor) {
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3).fill(1), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  }
  scene.add(mesh);
  return mesh;
}

export function buildTitleBattle() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x427587);
  scene.add(new THREE.HemisphereLight(0xfff1d6, 0x7ba8c7, 1.72));
  const sun = new THREE.DirectionalLight(0xffdfb6, 2.38);
  sun.position.set(-7, 14, 9);
  scene.add(sun);
  const emberLight = new THREE.PointLight(0xff7433, 2.6, 18, 1.5);
  emberLight.position.set(0, 2.4, -10.0);
  scene.add(emberLight);

  const tide = buildTitleCoast(scene);

  // Single authentic blue player cannon that actively slides left & right.
  const cannon = buildCannon(0x278ac4);
  cannon.setChassis(1);
  cannon.setBarrels(2);
  cannon.group.scale.setScalar(1.12);
  cannon.group.position.set(-2.12, 0, CANNON_Z);
  scene.add(cannon.group);

  // Subtle translucent aim lane strip on the deck that follows the cannon's aim
  // and turns crimson-amber when aimed into the trap lane.
  const aimStripMat = new THREE.MeshBasicMaterial({
    color: 0x5fe8ff,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const aimStrip = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 13.6), aimStripMat);
  aimStrip.rotation.x = -Math.PI / 2;
  aimStrip.position.set(-2.12, 0.022, 1.45);
  scene.add(aimStrip);

  // 3 rows of classic paired choice gates: Left optimal chain vs Right red traps,
  // with Row 3 smoothly sliding back and forth to trigger classic mis-timed choices!
  const gateShine = shineTexture();
  function makeChoiceGate(w, hex, text, x, z, kind, mega = false, sunforge = false) {
    const g = sunforge ? buildSunforge(w, mega) : buildGate(w, hex, mega);
    drawLabel(g.label, text, '', -1, kind === 'bad' ? '#ffe4e4' : '#ffffff');
    g.text.scale.setScalar(1.18);
    g.group.position.set(x, 0, z);
    scene.add(g.group);
    return { gate: g, x, baseX: x, z, w, kind, hex, flash: 0, sunforge, text };
  }

  const rows = [
    {
      z: 4.35,
      sliding: false,
      gates: [
        makeChoiceGate(3.75, 0x2fd0dc, '\u00d74', -2.12, 4.35, 'mul4', true),
        makeChoiceGate(3.75, 0x3a84c8, '+2', 2.12, 4.35, 'add2', false),
      ],
    },
    {
      z: -0.65,
      sliding: false,
      gates: [
        makeChoiceGate(3.75, 0xffa631, '\u00d73', -2.12, -0.65, 'sunforge', true, true),
        makeChoiceGate(3.75, 0xe83b4a, '\u22128', 2.12, -0.65, 'bad', false),
      ],
    },
    {
      z: -5.35,
      sliding: true,
      gates: [
        makeChoiceGate(3.65, 0x1ee0c8, '\u00d75', -2.12, -5.35, 'mul5', true),
        makeChoiceGate(3.65, 0xe83b4a, '\u00f72', 2.12, -5.35, 'bad', false),
      ],
    },
  ];
  const allGates = rows.flatMap((r) => r.gates);

  // Boss: sculpted Ember Drake guarding the volcanic bastion + live 3D HP plate!
  const dragon = buildSculptedCore('dragon');
  dragon.group.position.set(0, 0, BOSS_Z);
  dragon.group.scale.setScalar(0.66);
  scene.add(dragon.group);

  const bossLabel = makeCanvasLabel(512, 192);
  const bossPlate = textPlane(bossLabel, 4.5, 1.68, false);
  bossPlate.position.set(0, 4.95, BOSS_Z + 0.45);
  bossPlate.renderOrder = 6;
  scene.add(bossPlate);

  // Air support: sculpted Strike Jet banking overhead on the golden rally pass.
  const jet = createSupportAircraft(2);
  jet.group.scale.setScalar(1.16);
  jet.group.visible = false;
  scene.add(jet.group);

  // Allied & enemy instanced squads (zero GC, GPU vertex-animated stride).
  function createSquad(geometry, color, capacity) {
    const material = installTroopMotion(new THREE.MeshLambertMaterial({ color, vertexColors: true }));
    const body = instances(scene, geometry, material, capacity);
    const gait = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2);
    gait.setUsage(THREE.DynamicDrawUsage);
    body.geometry.setAttribute('unitMotion', gait);
    return { body, gait };
  }
  const troopers = createSquad(troopFormGeometry(1, 'low'), 0x4bc3ff, MAX_BLUE);
  const paladins = createSquad(troopFormGeometry(2, 'low'), 0x7ae2ff, MAX_BLUE);
  const sunwings = createSquad(troopFormGeometry(SUNWING_FORM, 'low'), 0xffd77e, 48);
  const raiders = createSquad(raiderGeometry('low'), 0xff424c, MAX_RED);

  const guns = instances(
    scene,
    troopWeaponGeo(1, 'low'),
    new THREE.MeshLambertMaterial({ vertexColors: true }),
    MAX_BLUE,
  );
  const shade = instances(
    scene,
    new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x13283d, transparent: true, opacity: 0.3, depthWrite: false }),
    MAX_BLUE + MAX_RED + 6,
  );

  // Combat VFX: muzzle flash, cyan/gold tracers, shockwave rings, sparks, bombs & motes.
  const flashes = instances(scene, new THREE.OctahedronGeometry(1), new THREE.MeshBasicMaterial({ color: 0xffffff }), 2, true);
  const tracerMesh = instances(
    scene,
    new THREE.CylinderGeometry(0.06, 0.035, 1, 5),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    MAX_TRACERS,
    true,
  );
  const sparkMesh = instances(scene, new THREE.OctahedronGeometry(1), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_SPARKS, true);
  const ringMesh = instances(
    scene,
    new THREE.RingGeometry(0.75, 1.0, 22).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false }),
    MAX_RINGS,
    true,
  );
  const bombMesh = instances(
    scene,
    new THREE.ConeGeometry(0.14, 0.46, 6).rotateX(Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xffd066 }),
    3,
  );
  const motes = instances(
    scene,
    new THREE.OctahedronGeometry(0.085, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }),
    MOTE_CAP,
    true,
  );
  // Piercing Prism/Railgun beam during the golden Sunwing rally.
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x9df7ff, transparent: true, opacity: 0.9, depthWrite: false });
  const beamCore = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1, 6), beamMat);
  const beamGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd268, transparent: true, opacity: 0.45, depthWrite: false });
  const beamHalo = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1, 6), beamGlowMat);
  beamCore.visible = beamHalo.visible = false;
  scene.add(beamCore, beamHalo);

  const cTmp = new THREE.Color();
  const moteSeeds = Array.from({ length: MOTE_CAP }, (_, i) => {
    const ember = i < 14;
    cTmp.setHex(ember ? (i % 2 ? 0xff9b42 : 0xffdf7a) : (i % 2 ? 0xb4fff6 : 0xfff4c2));
    motes.setColorAt(i, cTmp);
    return {
      ember,
      x: ember ? ((i * 1.91) % 10.5) - 5.25 : ((i * 2.73) % 14) - 7.0,
      z: ember ? -8.0 - ((i * 1.37) % 5.4) : 7.0 - ((i * 2.13) % 14.5),
      speed: ember ? 0.32 + (i % 5) * 0.06 : 0.22 + (i % 4) * 0.05,
      phase: i * 1.43,
      size: ember ? 0.75 + (i % 3) * 0.35 : 0.6 + (i % 3) * 0.25,
    };
  });
  motes.instanceColor.needsUpdate = true;

  // Deterministic LCG so the playable-ad loop behaves identically on every load.
  let rng = 133742;
  function rand() {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return rng / 4294967296;
  }

  // Fixed-size simulation entity pools (zero per-frame allocations).
  const blues = Array.from({ length: MAX_BLUE }, () => ({
    alive: false, x: 0, z: 0, vx: 0, vz: -4.8, tier: 0, mask: 0, age: 0, phase: 0, hp: 1, shotT: 0,
  }));
  const redPool = Array.from({ length: MAX_RED }, () => ({
    alive: false, x: 0, z: 0, vz: 2.35, hp: 2, phase: 0, age: 0,
  }));
  const tracerPool = Array.from({ length: MAX_TRACERS }, () => ({
    alive: false, x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0, t: 0, dur: 0.22, hex: 0x9cfaff,
  }));
  const ringPool = Array.from({ length: MAX_RINGS }, () => ({
    alive: false, x: 0, z: 0, t: 0, dur: 0.45, maxR: 2.0, ellipZ: 1.0, hex: 0x7ef8ff,
  }));
  const sparkPool = Array.from({ length: MAX_SPARKS }, () => ({
    alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, dur: 0.5, size: 0.14, hex: 0xffe07a,
  }));

  let simT = 0;
  let cannonX = -2.12;
  let cannonVx = 0;
  let camLag = -2.12;
  let fireAcc = 0;
  let redAcc = 0;
  let volleyCount = 0;
  let recoil = 0;
  let flashT = 0;
  let bossHp = 0.88;
  let bossHit = 0;
  let bossRoar = 0;
  let beamT = 0;
  let jetBombsDropped = 0;
  let lastJetCycle = -1;

  function spawnRing(x, z, maxR, hex, dur = 0.44, ellipZ = 1.0) {
    let slot = ringPool.find((r) => !r.alive) || ringPool[0];
    slot.alive = true; slot.x = x; slot.z = z; slot.t = 0; slot.dur = dur;
    slot.maxR = maxR; slot.ellipZ = ellipZ; slot.hex = hex;
  }
  function spawnSparks(x, y, z, hex, count, spd = 4.0, size = 0.14) {
    let spawned = 0;
    for (let i = 0; i < sparkPool.length && spawned < count; i++) {
      const sp = sparkPool[i];
      if (sp.alive) continue;
      const a = rand() * Math.PI * 2;
      const s = spd * (0.45 + rand() * 0.75);
      sp.alive = true; sp.x = x; sp.y = y; sp.z = z;
      sp.vx = Math.cos(a) * s; sp.vy = spd * (0.55 + rand() * 0.65); sp.vz = Math.sin(a) * s;
      sp.t = 0; sp.dur = 0.34 + rand() * 0.24; sp.size = size * (0.75 + rand() * 0.55); sp.hex = hex;
      spawned++;
    }
  }
  function spawnTracer(x0, y0, z0, x1, y1, z1, hex, dur = 0.20) {
    let slot = tracerPool.find((tr) => !tr.alive);
    if (!slot) return;
    slot.alive = true; slot.x0 = x0; slot.y0 = y0; slot.z0 = z0;
    slot.x1 = x1; slot.y1 = y1; slot.z1 = z1; slot.t = 0; slot.dur = dur; slot.hex = hex;
  }
  function spawnBlue(x, z, tier, mask, spreadVx = 0) {
    let slot = blues.find((u) => !u.alive);
    if (!slot) return null;
    slot.alive = true;
    slot.x = clamp(x, -ROAD_HALF, ROAD_HALF);
    slot.z = z;
    slot.vx = spreadVx;
    slot.vz = -(4.65 + rand() * 0.45 + (tier === 2 ? 0.5 : 0));
    slot.tier = tier;
    slot.mask = mask;
    slot.age = 0;
    slot.phase = rand() * 12;
    slot.hp = tier === 2 ? 3.2 : tier === 1 ? 2.1 : 1.1;
    slot.shotT = 0.1 + rand() * 0.25;
    return slot;
  }
  function spawnRed(x, z) {
    let slot = redPool.find((r) => !r.alive);
    if (!slot) return;
    slot.alive = true;
    slot.x = clamp(x, -ROAD_HALF + 0.25, ROAD_HALF - 0.25);
    slot.z = z;
    slot.vz = 2.15 + rand() * 0.55;
    slot.hp = 1.65;
    slot.phase = rand() * 12;
    slot.age = 0;
  }

  function sampleJet(u, out) {
    const x = THREE.MathUtils.lerp(15.5, -15.5, u);
    const z = THREE.MathUtils.lerp(3.5, -11.5, u) + Math.sin(u * Math.PI) * -2.2;
    const y = 6.3 - Math.sin(u * Math.PI) * 1.15;
    return out.set(x, y, z);
  }

  const tmpStart = new THREE.Vector3();
  const tmpEnd = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();
  const jetPos = new THREE.Vector3();
  const jetAhead = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const pose = new THREE.Object3D();

  function stepSim(dt) {
    simT += dt;
    const loopU = mod(simT, LOOP_DUR);

    // 1. Steer the single cannon along the bad-choice trajectory.
    const nextX = sampleAdCannonX(simT);
    cannonVx = (nextX - cannonX) / Math.max(0.0001, dt);
    cannonX = nextX;
    camLag += (cannonX - camLag) * Math.min(1, dt * 4.5);

    // 2. Slide Row 3 gates smoothly (x5 <-> ÷2).
    const shift3 = sampleRow3Shift(simT);
    rows[2].gates[0].x = -shift3;
    rows[2].gates[1].x = shift3;
    rows[2].gates[0].gate.group.position.x = rows[2].gates[0].x;
    rows[2].gates[1].gate.group.position.x = rows[2].gates[1].x;

    // Decay gate flashes and combat timers.
    for (const g of allGates) g.flash = Math.max(0, g.flash - dt * 3.8);
    recoil = Math.max(0, recoil - dt * 7.5);
    flashT = Math.max(0, flashT - dt);
    bossHit = Math.max(0, bossHit - dt * 4.2);
    bossRoar = Math.max(0, bossRoar - dt * 1.4);
    beamT = Math.max(0, beamT - dt);

    // 3. Fire blue troopers from the cannon's actual x position!
    fireAcc += dt;
    if (fireAcc >= 0.42) {
      fireAcc -= 0.42;
      volleyCount++;
      recoil = 1.0;
      flashT = 0.11;
      const rally = loopU >= 13.3 && loopU <= 15.9;
      const isSunwingVolley = rally && volleyCount % 2 === 0;
      const tier = isSunwingVolley ? 2 : 0;
      spawnBlue(cannonX - 0.24, MUZZLE_Z, tier, 0, -0.18 + rand() * 0.12);
      spawnBlue(cannonX + 0.24, MUZZLE_Z, tier, 0, 0.18 - rand() * 0.12);
    }

    // 4. Spawn Red Raiders from the volcanic bastion (heavier pressure when player hits traps).
    const onBadSide = cannonX > 0.3;
    redAcc += dt * (onBadSide ? 1.25 : 0.92);
    if (redAcc >= 0.46) {
      redAcc -= 0.46;
      const laneBias = onBadSide ? (rand() < 0.65 ? 1 : -1) : (rand() < 0.5 ? -1 : 1);
      const rx = laneBias * (0.9 + rand() * 2.25);
      spawnRed(rx, -9.2);
    }

    // 5. Periodic Strike Jet pass synced to Frame 0 (~2.05s) and the heroic rally (~14.2s).
    const jetPassDur = 2.4;
    const jetWindowA = loopU >= 0.85 && loopU < 0.85 + jetPassDur;
    const jetWindowB = loopU >= 13.8 && loopU < 13.8 + jetPassDur;
    const activeCycle = jetWindowA ? 0 : jetWindowB ? 1 : -1;
    if (activeCycle !== lastJetCycle) {
      lastJetCycle = activeCycle;
      jetBombsDropped = 0;
    }
    if (activeCycle >= 0) {
      const startT = activeCycle === 0 ? 0.85 : 13.8;
      const u = (loopU - startT) / jetPassDur;
      if (u > 0.42 && jetBombsDropped === 0) {
        jetBombsDropped = 1;
        spawnRing(0.8, -6.6, 2.5, 0xffc858, 0.45);
        spawnSparks(0.8, 0.4, -6.6, 0xffaa44, 8, 4.8, 0.15);
        for (const r of redPool) if (r.alive && Math.hypot(r.x - 0.8, r.z + 6.6) < 2.9) r.alive = false;
      }
      if (u > 0.56 && jetBombsDropped === 1) {
        jetBombsDropped = 2;
        spawnRing(-1.2, -7.8, 2.7, 0xff9338, 0.48);
        spawnSparks(-1.2, 0.4, -7.8, 0xffe07a, 9, 5.0, 0.16);
        for (const r of redPool) if (r.alive && Math.hypot(r.x + 1.2, r.z + 7.8) < 3.0) r.alive = false;
        bossHp = Math.max(0.16, bossHp - 0.08);
        bossHit = 1.0;
        beamT = 0.42;
      }
    }

    // 6. Update blue units: move, cross gates (ACTUALLY multiply or get shredded!), shoot & clash!
    let liveBlues = 0;
    for (let i = 0; i < MAX_BLUE; i++) if (blues[i].alive) liveBlues++;

    for (let i = 0; i < MAX_BLUE; i++) {
      const u = blues[i];
      if (!u.alive) continue;
      u.age += dt;
      u.phase += dt * 12.5;
      u.x = clamp(u.x + u.vx * dt, -ROAD_HALF, ROAD_HALF);
      u.vx *= Math.pow(0.08, dt);
      u.z += u.vz * dt;

      // Check gate row crossings.
      for (let ri = 0; ri < rows.length; ri++) {
        const bit = 1 << ri;
        if (u.mask & bit) continue;
        const row = rows[ri];
        if (u.z <= row.z) {
          u.mask |= bit;
          // Find which gate in this row the unit passed through.
          let hit = null;
          for (const g of row.gates) {
            if (Math.abs(u.x - g.x) <= g.w * 0.54) { hit = g; break; }
          }
          if (!hit) continue;
          hit.flash = 1.0;
          if (hit.kind === 'bad') {
            // BAD GATE (-8 or ÷2): unmistakable crimson flash, shockwave & sparks as squad shrinks!
            spawnRing(hit.x, row.z, 2.25, 0xff384c, 0.42, 0.48);
            spawnSparks(u.x, 0.85, row.z, 0xff4052, 6, 4.8, 0.16);
            const killChance = hit.text === '\u22128' ? 0.72 : 0.58;
            if (rand() < killChance) {
              u.alive = false;
              liveBlues--;
              break;
            }
          } else {
            // GOOD GATE (x4, +2, x3 Sunforge, x5): multiply & upgrade!
            const ringHex = hit.sunforge ? 0xffd066 : hit.kind === 'add2' ? 0x6cb8ff : 0x7ef8ff;
            if (rand() < 0.45) spawnRing(hit.x, row.z, 2.05, ringHex, 0.42, 0.42);
            if (rand() < 0.4) spawnSparks(u.x, 0.85, row.z, ringHex, 3, 3.6, 0.12);
            if (hit.sunforge && u.tier === 0) u.tier = 1; // Promote to armored Paladin!
            let extras = 0;
            if (hit.kind === 'mul4') extras = liveBlues < 72 ? 2 : 1;
            else if (hit.kind === 'sunforge') extras = liveBlues < 95 ? 2 : 1;
            else if (hit.kind === 'mul5') extras = liveBlues < 115 ? 2 : 1;
            else if (hit.kind === 'add2') extras = rand() < 0.32 ? 1 : 0; // Visibly weak!
            for (let k = 0; k < extras && liveBlues < MAX_BLUE - 4; k++) {
              const offset = (k - (extras - 1) * 0.5) * 0.65 + (rand() - 0.5) * 0.35;
              const clone = spawnBlue(u.x + offset, u.z + 0.15 + rand() * 0.35, u.tier, u.mask, offset * 1.4);
              if (clone) liveBlues++;
            }
          }
        }
      }
      if (!u.alive) continue;

      // Shoot nearest Red Raider or the Ember Drake.
      u.shotT -= dt;
      if (u.shotT <= 0 && u.z < 1.2) {
        u.shotT = 0.52 + rand() * 0.35;
        let targetR = null, bestD = 4.6;
        for (let r = 0; r < MAX_RED; r++) {
          const rd = redPool[r];
          if (!rd.alive) continue;
          const d = Math.hypot(rd.x - u.x, rd.z - u.z);
          if (d < bestD && rd.z < u.z + 0.6) { bestD = d; targetR = rd; }
        }
        if (targetR) {
          spawnTracer(u.x, 0.68, u.z, targetR.x, 0.55, targetR.z, u.tier === 2 ? 0xffd268 : 0x9cfaff, 0.18);
          targetR.hp -= u.tier === 2 ? 1.4 : u.tier === 1 ? 0.9 : 0.55;
          if (targetR.hp <= 0) {
            targetR.alive = false;
            spawnSparks(targetR.x, 0.5, targetR.z, 0xff6e48, 4, 3.6, 0.12);
            spawnRing(targetR.x, targetR.z, 0.9, 0xff7b48, 0.28);
          }
        } else if (u.z < -4.2) {
          const bx = clamp(u.x * 0.35, -1.2, 1.2);
          spawnTracer(u.x, 0.72, u.z, bx, 1.9 + rand() * 0.7, BOSS_Z + 1.0, u.tier >= 1 ? 0xffd268 : 0x9cfaff, 0.22);
          bossHp = Math.max(0.15, bossHp - (u.tier === 2 ? 0.011 : u.tier === 1 ? 0.006 : 0.003));
          bossHit = Math.min(1, bossHit + 0.38);
          if (rand() < 0.35) spawnSparks(bx, 1.9, BOSS_Z + 1.1, u.tier >= 1 ? 0xffe07a : 0x9bf8ff, 3, 4.2, 0.13);
        }
      }

      // Impact directly on Ember Drake at front line.
      if (u.z <= -8.55) {
        u.alive = false;
        bossHp = Math.max(0.15, bossHp - (u.tier === 2 ? 0.022 : u.tier === 1 ? 0.012 : 0.006));
        bossHit = 1.0;
        spawnSparks(clamp(u.x * 0.4, -1.4, 1.4), 1.7, BOSS_Z + 1.2, 0xffe07a, 4, 4.5, 0.14);
        if (rand() < 0.35) spawnRing(clamp(u.x * 0.4, -1.2, 1.2), -9.3, 1.85, 0xffc65c, 0.38);
      }
    }

    // 7. Update Red Raiders & melee clashes.
    for (let i = 0; i < MAX_RED; i++) {
      const r = redPool[i];
      if (!r.alive) continue;
      r.age += dt;
      r.phase += dt * 13.0;
      r.z += r.vz * dt;
      // Melee collision against nearby blue troops.
      for (let j = 0; j < MAX_BLUE; j++) {
        const u = blues[j];
        if (!u.alive) continue;
        if (Math.abs(u.z - r.z) < 0.72 && Math.abs(u.x - r.x) < 0.72) {
          const dmg = Math.min(u.hp, r.hp);
          u.hp -= dmg;
          r.hp -= dmg;
          if (u.hp <= 0) u.alive = false;
          if (r.hp <= 0) {
            r.alive = false;
            spawnSparks(r.x, 0.5, r.z, 0xff7040, 3, 3.5, 0.12);
            break;
          }
        }
      }
      if (!r.alive) continue;
      // If Raiders reach the defense hazard bar (because the player fed -8 / ÷2!), pop with warning flash!
      if (r.z >= 7.35) {
        r.alive = false;
        spawnRing(r.x, 7.35, 1.35, 0xff3b4a, 0.35);
        spawnSparks(r.x, 0.5, 7.35, 0xff4555, 5, 4.2, 0.13);
      }
    }

    // 8. Boss slowly regens & roars while player is failing on the trap side so the loop stays spicy.
    if (onBadSide || loopU > 16.5) {
      const prev = bossHp;
      bossHp = Math.min(0.96, bossHp + dt * (loopU > 16.5 ? 0.32 : 0.085));
      if (prev < 0.45 && bossHp >= 0.45) bossRoar = 1.0;
    }

    // 9. Advance tracers, rings & sparks.
    for (const tr of tracerPool) {
      if (!tr.alive) continue;
      tr.t += dt;
      if (tr.t >= tr.dur) tr.alive = false;
    }
    for (const rg of ringPool) {
      if (!rg.alive) continue;
      rg.t += dt;
      if (rg.t >= rg.dur) rg.alive = false;
    }
    for (const sp of sparkPool) {
      if (!sp.alive) continue;
      sp.t += dt;
      if (sp.t >= sp.dur) { sp.alive = false; continue; }
      sp.vy -= 14.5 * dt;
      sp.x += sp.vx * dt; sp.y = Math.max(0.08, sp.y + sp.vy * dt); sp.z += sp.vz * dt;
    }
  }

  // Warm up to a vibrant mid-action Frame 0 snapshot.
  const warmupSteps = Math.round(WARMUP_TIME / FIXED_DT);
  for (let i = 0; i < warmupSteps; i++) stepSim(FIXED_DT);

  const camera = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, 0.5, 220);

  function place(mesh, i, x, y, z, sx, sy, sz, yaw = 0) {
    pose.position.set(x, y, z);
    pose.rotation.set(0, yaw, 0);
    pose.scale.set(sx, sy, sz);
    pose.updateMatrix();
    mesh.setMatrixAt(i, pose.matrix);
  }
  function setSlotColor(mesh, i, hex) {
    cTmp.setHex(hex);
    mesh.setColorAt(i, cTmp);
  }

  let lastTime = 0;
  let simAcc = 0;

  function render(draw, time) {
    // Advance simulation smoothly when moving (capped at 4 sub-steps for tab-return safety).
    if (time > lastTime) {
      simAcc += Math.min(time - lastTime, 0.067);
      let steps = 0;
      while (simAcc >= FIXED_DT && steps < 4) {
        stepSim(FIXED_DT);
        simAcc -= FIXED_DT;
        steps++;
      }
      if (steps >= 4) simAcc = 0;
    }
    lastTime = time;

    const aspect = innerWidth / innerHeight;
    frameGameplayCamera(camera, aspect, camLag);

    tide.value = simT;
    emberLight.intensity = 2.4 + 0.5 * Math.sin(simT * 4.2) + 0.25 * Math.cos(simT * 6.8);

    // 1. Update cannon lateral position, tilt into turns, recoil & aim lane beam.
    cannon.group.position.x = cannonX;
    cannon.group.rotation.z = clamp(-cannonVx * 0.036, -0.17, 0.17);
    cannon.group.rotation.y = clamp(-cannonVx * 0.025, -0.12, 0.12);
    cannon.animateVehicle(simT, FIXED_DT, recoil, Math.abs(cannonVx) * 0.16, 0);
    cannon.setRecoil(0.22 * recoil);
    const rallyGlow = mod(simT, LOOP_DUR) >= 13.3 && mod(simT, LOOP_DUR) <= 15.9;
    cannon.glow.scale.setScalar(1 + (rallyGlow ? 0.55 : 0.18 * recoil));
    cannon.glowMat.color.setHex(rallyGlow ? 0xffd473 : cannonX > 0.35 ? 0xff8a7a : 0xaef6ff);

    aimStrip.position.x = cannonX;
    const aimingBad = cannonX > 0.35;
    aimStripMat.color.setHex(aimingBad ? 0xff5a66 : rallyGlow ? 0xffd870 : 0x5fe8ff);
    aimStripMat.opacity = aimingBad ? 0.24 + 0.09 * Math.sin(simT * 12) : 0.20;

    // Muzzle flash on active cannon barrel tips.
    flashes.count = 0;
    if (flashT > 0) {
      const f = flashT / 0.11;
      place(flashes, 0, cannonX - 0.24, 1.18, MUZZLE_Z - 0.15, 0.28 * f, 0.26 * f, 0.9 * f);
      setSlotColor(flashes, 0, rallyGlow ? 0xffe48f : 0x9cf7ff);
      place(flashes, 1, cannonX + 0.24, 1.18, MUZZLE_Z - 0.15, 0.28 * f, 0.26 * f, 0.9 * f);
      setSlotColor(flashes, 1, rallyGlow ? 0xffe48f : 0x9cf7ff);
      flashes.count = 2;
    }

    // 2. Animate choice gates (glass shine, spinning Sunforge brass wheel, crossing bounce/glow).
    gateShine.offset.x = (simT * 0.42) % 1;
    for (const g of allGates) {
      if (g.sunforge && g.gate.wheel) g.gate.wheel.rotation.z = -simT * 1.65;
      const baseOp = g.kind === 'bad' ? 0.34 : 0.26;
      g.gate.panelMat.opacity = baseOp + 0.38 * g.flash;
      const bump = 1 + 0.065 * g.flash;
      g.gate.group.scale.set(bump, 1 + 0.045 * g.flash, 1);
    }

    // 3. Render allied squads (Troopers, Paladins, Golden Sunwings) & weapons & shadows.
    troopers.body.count = paladins.body.count = sunwings.body.count = 0;
    let gunCount = 0, shadeCount = 0;
    for (let i = 0; i < MAX_BLUE; i++) {
      const u = blues[i];
      if (!u.alive) continue;
      const squad = u.tier === 2 ? sunwings : u.tier === 1 ? paladins : troopers;
      const pop = smoothstep(u.age / 0.16, 0, 1);
      const y = 0.035 + (u.tier === 2 ? 0.22 : 0) + Math.abs(Math.sin(u.phase)) * 0.07;
      const s = (u.tier === 2 ? 1.08 : u.tier === 1 ? 0.94 : 0.86) * (0.62 + 0.38 * pop);
      const slot = squad.body.count++;
      place(squad.body, slot, u.x, y, u.z, s, s, s, Math.PI);
      if (gunCount < guns.instanceMatrix.count) guns.setMatrixAt(gunCount++, pose.matrix);
      squad.gait.setXY(slot, u.phase, 1);
      if (shadeCount < shade.instanceMatrix.count) place(shade, shadeCount++, u.x, 0.026, u.z, 0.34 * s, 1, 0.42 * s);
    }
    guns.count = gunCount;
    troopers.gait.needsUpdate = paladins.gait.needsUpdate = sunwings.gait.needsUpdate = true;

    // 4. Render Red Raiders.
    raiders.body.count = 0;
    for (let i = 0; i < MAX_RED; i++) {
      const r = redPool[i];
      if (!r.alive) continue;
      const pop = smoothstep(r.age / 0.18, 0, 1);
      const y = 0.035 + Math.abs(Math.sin(r.phase)) * 0.065;
      const s = 0.94 * (0.6 + 0.4 * pop);
      const slot = raiders.body.count++;
      place(raiders.body, slot, r.x, y, r.z, s, s, s, 0);
      raiders.gait.setXY(slot, r.phase, 1);
      if (shadeCount < shade.instanceMatrix.count) place(shade, shadeCount++, r.x, 0.026, r.z, 0.35 * s, 1, 0.43 * s);
    }
    raiders.gait.needsUpdate = true;

    // Contact shadows for cannon & Ember Drake.
    if (shadeCount + 2 < shade.instanceMatrix.count) {
      place(shade, shadeCount++, cannonX, 0.026, CANNON_Z, 1.38, 1, 1.62);
      place(shade, shadeCount++, 0, 0.026, BOSS_Z + 0.05, 2.15, 1, 1.35);
    }

    // 5. Banking Strike Jet & falling bombs during rally passes.
    const loopU = mod(simT, LOOP_DUR);
    const jetPassDur = 2.4;
    const jetStart = loopU >= 0.85 && loopU < 0.85 + jetPassDur ? 0.85 : loopU >= 13.8 && loopU < 13.8 + jetPassDur ? 13.8 : -1;
    bombMesh.count = 0;
    if (jetStart >= 0) {
      const u = (loopU - jetStart) / jetPassDur;
      sampleJet(u, jetPos);
      sampleJet(Math.min(1, u + 0.02), jetAhead);
      jet.group.visible = true;
      jet.group.position.copy(jetPos);
      tmpDir.subVectors(jetAhead, jetPos).normalize();
      jet.group.lookAt(jetPos.x - tmpDir.x, jetPos.y - tmpDir.y, jetPos.z - tmpDir.z);
      jet.group.rotateZ(0.46 * Math.sin(u * Math.PI));
      const flicker = 0.86 + 0.28 * Math.sin(simT * 48);
      for (const flame of jet.engines) flame.scale.set(1, 1, flicker);
      if (Math.abs(jetPos.x) < 4.8 && jetPos.z > -11 && jetPos.z < 11 && shadeCount < shade.instanceMatrix.count) {
        place(shade, shadeCount++, jetPos.x * 0.85, 0.03, jetPos.z, 1.12, 1, 1.42);
      }
      for (let bi = 0; bi < 2; bi++) {
        const dropStart = 0.26 + bi * 0.14, dropDur = 0.16;
        const bt = u - dropStart;
        if (bt >= 0 && bt < dropDur) {
          const bp = bt / dropDur;
          sampleJet(dropStart, tmpStart);
          tmpEnd.set(bi === 0 ? 0.8 : -1.2, 0.15, bi === 0 ? -6.6 : -7.8);
          place(
            bombMesh,
            bombMesh.count++,
            THREE.MathUtils.lerp(tmpStart.x, tmpEnd.x, bp),
            THREE.MathUtils.lerp(tmpStart.y - 0.3, tmpEnd.y, bp * bp),
            THREE.MathUtils.lerp(tmpStart.z, tmpEnd.z, bp),
            1, 1, 1,
          );
        }
      }
    } else {
      jet.group.visible = false;
    }
    shade.count = shadeCount;

    // 6. Render tracers.
    tracerMesh.count = 0;
    for (const tr of tracerPool) {
      if (!tr.alive) continue;
      const p = tr.t / tr.dur;
      tmpStart.set(tr.x0, tr.y0, tr.z0);
      tmpEnd.set(tr.x1, tr.y1, tr.z1);
      tmpDir.subVectors(tmpEnd, tmpStart).normalize();
      pose.position.lerpVectors(tmpStart, tmpEnd, p);
      pose.quaternion.setFromUnitVectors(up, tmpDir);
      pose.scale.set(1, 0.72, 1);
      pose.updateMatrix();
      tracerMesh.setMatrixAt(tracerMesh.count, pose.matrix);
      setSlotColor(tracerMesh, tracerMesh.count++, tr.hex);
    }

    // 7. Piercing Railgun/Prism beam on jet/Sunwing rally climax.
    if (beamT > 0) {
      const fade = Math.sin((beamT / 0.42) * Math.PI);
      tmpStart.set(-1.1, 0.95, -2.2);
      tmpEnd.set(0, 2.2, BOSS_Z + 0.8);
      const len = tmpStart.distanceTo(tmpEnd);
      tmpDir.subVectors(tmpEnd, tmpStart).normalize();
      beamCore.position.lerpVectors(tmpStart, tmpEnd, 0.5);
      beamCore.quaternion.setFromUnitVectors(up, tmpDir);
      beamCore.scale.set(0.6 + 0.8 * fade, len, 0.6 + 0.8 * fade);
      beamHalo.position.copy(beamCore.position);
      beamHalo.quaternion.copy(beamCore.quaternion);
      beamHalo.scale.set(0.7 + 1.05 * fade, len, 0.7 + 1.05 * fade);
      beamMat.opacity = 0.9 * fade;
      beamGlowMat.opacity = 0.45 * fade;
      beamCore.visible = beamHalo.visible = true;
    } else {
      beamCore.visible = beamHalo.visible = false;
    }

    // 8. Render shockwave rings & sparks.
    ringMesh.count = 0;
    for (const rg of ringPool) {
      if (!rg.alive) continue;
      const p = rg.t / rg.dur;
      const r = 0.35 + p * rg.maxR;
      place(ringMesh, ringMesh.count, rg.x, 0.07, rg.z, r, 1, r * rg.ellipZ);
      setSlotColor(ringMesh, ringMesh.count++, rg.hex);
    }

    sparkMesh.count = 0;
    for (const sp of sparkPool) {
      if (!sp.alive) continue;
      const s = sp.size * (1 - sp.t / sp.dur);
      place(sparkMesh, sparkMesh.count, sp.x, sp.y, sp.z, s, s, s, sp.t * 9);
      setSlotColor(sparkMesh, sparkMesh.count++, sp.hex);
    }

    // 9. Ember Drake animation + live 3D overhead HP plate.
    dragon.animate(simT, bossRoar, { moving: false, health: bossHp, hit: Math.min(1, bossHit) });
    bossPlate.quaternion.copy(camera.quaternion);
    const hpColor = bossHp < 0.32 ? '#ffcf54' : '#ff5652';
    drawLabel(bossLabel, 'EMBER DRAKE', `${Math.round(bossHp * 100)}%`, bossHp, hpColor);

    // 10. Ambient embers & coastal spray motes.
    for (let i = 0; i < MOTE_CAP; i++) {
      const m = moteSeeds[i];
      const u = mod(simT * m.speed + m.phase, 1);
      const y = m.ember ? 0.35 + u * 6.5 : 0.45 + u * 4.4;
      const driftX = m.x + Math.sin(simT * 1.4 + m.phase * 3) * (m.ember ? 0.55 : 0.85);
      const driftZ = m.z + Math.cos(simT * 1.1 + m.phase * 2) * 0.45;
      const s = m.size * Math.sin(u * Math.PI);
      place(motes, i, driftX, y, driftZ, s, s * 1.25, s, simT * 2.2 + i);
    }
    motes.count = MOTE_CAP;

    // Mark instanced GPU buffers dirty.
    for (const m of [
      troopers.body,
      paladins.body,
      sunwings.body,
      raiders.body,
      guns,
      shade,
      flashes,
      tracerMesh,
      sparkMesh,
      ringMesh,
      bombMesh,
      motes,
    ]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }

    draw(scene, camera);
  }

  return { render };
}
