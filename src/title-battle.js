import * as THREE from 'three';
import { buildCannon, buildGate, buildSunforge, drawLabel, shineTexture, troopWeaponGeo } from './title-kit.js';
import { buildSculptedCore } from './boss-sculpted-core.js';
import { SUNWING_FORM, troopFormGeometry, raiderGeometry } from './troop-forms.js';
import { installTroopMotion } from './unit-assets.js';
import { createSupportAircraft } from './air-assets.js';
import { buildTitleCoast } from './title-islands.js';

const BEAT = .76, SPEED = 3.9, WAVES = 7, FIRST = 3.85, SECOND = -1.1, FRONT = -7.25;
const AIR_CYCLE = 6.2, AIR_PASS = 2.65, RAIDER_COUNT = 10, RING_CAP = 10, MOTE_CAP = 26, SPARK_CAP = 28;
const mod = THREE.MathUtils.euclideanModulo;
const ease = (t) => THREE.MathUtils.smoothstep(t, 0, 1);

function frameCauseway(camera, aspect) {
  const wide = aspect >= 1.14;
  camera.position.set(wide ? 19 : 5.8, wide ? 17 : 24, wide ? 20 : 26);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const bounds = new THREE.Box2(), point = new THREE.Vector3();
  for (const z of [-12, 12]) {
    for (const x of [-3.95, 3.95]) {
      point.set(x, -.5, z).applyMatrix4(camera.matrixWorldInverse);
      bounds.expandByPoint(point);
    }
  }
  for (const x of [-3.0, 3.0]) {
    point.set(x, 6.8, -9.7).applyMatrix4(camera.matrixWorldInverse);
    bounds.expandByPoint(point);
  }
  const size = bounds.getSize(new THREE.Vector2()), center = bounds.getCenter(new THREE.Vector2());
  const h = Math.max(size.x / (aspect * (wide ? .61 : .93)), size.y / (wide ? .80 : .55));
  const w = h * aspect;
  center.x -= wide ? .175 * w : 0;
  center.y += wide ? .005 * h : .033 * h;
  camera.left = center.x - w / 2;
  camera.right = center.x + w / 2;
  camera.bottom = center.y - h / 2;
  camera.top = center.y + h / 2;
  camera.updateProjectionMatrix();
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

// Absolute wave ages let frame 0 / reduced-motion show the complete battle chain seamlessly.
export function buildTitleBattle() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x427587);
  scene.add(new THREE.HemisphereLight(0xfff1d6, 0x7ba8c7, 1.72));
  const sun = new THREE.DirectionalLight(0xffdfb6, 2.38);
  sun.position.set(-7, 14, 9);
  scene.add(sun);
  // Warm volcanic rim-glow on the Ember Drake and clashing front-line raiders.
  const emberLight = new THREE.PointLight(0xff7433, 2.6, 17, 1.5);
  emberLight.position.set(0, 2.4, -9.2);
  scene.add(emberLight);

  const tide = buildTitleCoast(scene);

  // Upgraded multi-barrel Siege hero cannon + flanking Twin (magenta) & Squad (cyan) escorts.
  const cannon = buildCannon(0x278ac4);
  cannon.setChassis(2);
  cannon.setBarrels(3);
  cannon.group.scale.setScalar(1.22);
  cannon.group.position.set(0, 0, 9.25);
  scene.add(cannon.group);

  const twin = buildCannon(0xff4fd8);
  twin.setChassis(1);
  twin.setBarrels(2);
  twin.group.scale.setScalar(.76);
  twin.group.position.set(2.22, 0, 9.8);
  scene.add(twin.group);

  const squad = buildCannon(0x22b8ff);
  squad.setChassis(1);
  squad.setBarrels(2);
  squad.group.scale.setScalar(.76);
  squad.group.position.set(-2.22, 0, 9.8);
  scene.add(squad.group);

  scene.updateMatrixWorld(true);
  const heroMuzzle = cannon.barrels.children[1].localToWorld(new THREE.Vector3(0, 0, -1.25));
  const twinMuzzle = twin.barrels.children[0].localToWorld(new THREE.Vector3(.2, 0, -1.1));
  const squadMuzzle = squad.barrels.children[0].localToWorld(new THREE.Vector3(.2, 0, -1.1));
  const origin = heroMuzzle.z, span = (origin - FRONT) / SPEED;

  // Cyan x3 multiplier gate + iconic spinning Golden Sunforge x4 gate.
  const gate1 = buildGate(5.9, 0x2fd0dc, true);
  drawLabel(gate1.label, '\u00d73');
  gate1.text.scale.setScalar(1.32);
  gate1.group.position.z = FIRST;
  scene.add(gate1.group);

  const gate2 = buildSunforge(5.9, true);
  drawLabel(gate2.label, '\u00d74');
  gate2.text.scale.setScalar(1.32);
  gate2.group.position.z = SECOND;
  scene.add(gate2.group);
  const gates = [gate1, gate2];
  const gateShine = shineTexture();

  // Boss: the sculpted Ember Drake guarding the volcanic island.
  const dragon = buildSculptedCore('dragon');
  dragon.group.position.set(0, 0, -10.0);
  dragon.group.scale.setScalar(.63);
  scene.add(dragon.group);

  // Air support: sculpted Strike Jet banking overhead on periodic bomb runs.
  const jet = createSupportAircraft(2);
  jet.group.scale.setScalar(1.18);
  scene.add(jet.group);

  // Allied armies: Troopers -> Paladins (after Sunforge) + Golden Sunwings surge wave,
  // plus clashing Red Raiders charging out from the volcanic bastion.
  function createSquad(geometry, color, capacity) {
    const material = installTroopMotion(new THREE.MeshLambertMaterial({ color, vertexColors: true }));
    const body = instances(scene, geometry, material, capacity);
    const gait = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2);
    gait.setUsage(THREE.DynamicDrawUsage);
    body.geometry.setAttribute('unitMotion', gait);
    return { body, gait };
  }
  const troopers = createSquad(troopFormGeometry(1, 'low'), 0x4bc3ff, WAVES * 4);
  const paladins = createSquad(troopFormGeometry(2, 'low'), 0x7ae2ff, WAVES * 12);
  const sunwings = createSquad(troopFormGeometry(SUNWING_FORM, 'low'), 0xffd77e, 14);
  const raiders = createSquad(raiderGeometry('low'), 0xff424c, RAIDER_COUNT);

  const guns = instances(
    scene,
    troopWeaponGeo(1, 'low'),
    new THREE.MeshLambertMaterial({ vertexColors: true }),
    WAVES * 12 + 4,
  );
  const shade = instances(
    scene,
    new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x13283d, transparent: true, opacity: .30, depthWrite: false }),
    WAVES * 12 + RAIDER_COUNT + 8,
  );

  // Combat VFX: muzzle cones, mixed cyan/gold weapon tracers, railgun lance, bombs, shockwave rings, sparks & motes.
  const flashes = instances(scene, new THREE.OctahedronGeometry(1), new THREE.MeshBasicMaterial({ color: 0xffffff }), 3, true);
  const tracers = instances(
    scene,
    new THREE.CylinderGeometry(.06, .035, 1, 5),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    10,
    true,
  );
  const sparks = instances(scene, new THREE.OctahedronGeometry(1), new THREE.MeshBasicMaterial({ color: 0xffffff }), SPARK_CAP, true);
  const rings = instances(
    scene,
    new THREE.RingGeometry(.76, 1.0, 22).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .76, side: THREE.DoubleSide, depthWrite: false }),
    RING_CAP,
    true,
  );
  const bombs = instances(
    scene,
    new THREE.ConeGeometry(.14, .46, 6).rotateX(Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xffd066 }),
    2,
  );
  const motes = instances(
    scene,
    new THREE.OctahedronGeometry(.085, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .72, depthWrite: false }),
    MOTE_CAP,
    true,
  );
  // Piercing Prism/Railgun beam that fires on the Sunwing surge beat.
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x9df7ff, transparent: true, opacity: .9, depthWrite: false });
  const beamCore = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 1, 6), beamMat);
  const beamGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd268, transparent: true, opacity: .45, depthWrite: false });
  const beamHalo = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, 1, 6), beamGlowMat);
  beamCore.visible = beamHalo.visible = false;
  scene.add(beamCore, beamHalo);

  // Pre-seed atmospheric ember & sunlit spray motes.
  const cTmp = new THREE.Color();
  const moteSeeds = Array.from({ length: MOTE_CAP }, (_, i) => {
    const ember = i < 16;
    cTmp.setHex(ember ? (i % 2 ? 0xff9b42 : 0xffdf7a) : (i % 2 ? 0xb4fff6 : 0xfff4c2));
    motes.setColorAt(i, cTmp);
    return {
      ember,
      x: ember ? ((i * 1.91) % 10.5) - 5.25 : ((i * 2.73) % 13) - 6.5,
      z: ember ? -7.2 - ((i * 1.37) % 5.4) : 6.5 - ((i * 2.13) % 13.5),
      speed: ember ? .32 + (i % 5) * .06 : .22 + (i % 4) * .05,
      phase: i * 1.43,
      size: ember ? .75 + (i % 3) * .35 : .6 + (i % 3) * .25,
    };
  });
  motes.instanceColor.needsUpdate = true;

  const start = new THREE.Vector3(),
    end = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    jetPos = new THREE.Vector3(),
    jetAhead = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0);
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, .1, 160);
  const pose = new THREE.Object3D();
  const cameraHome = new THREE.Vector3();
  let lastAspect = 0;

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
  function sampleJet(u, out) {
    // Diagonal bank from rear-right across the battlefront toward front-left sky.
    const x = THREE.MathUtils.lerp(15.5, -15.5, u);
    const z = THREE.MathUtils.lerp(4.0, -11.5, u) + Math.sin(u * Math.PI) * -2.2;
    const y = 6.35 - Math.sin(u * Math.PI) * 1.15;
    return out.set(x, y, z);
  }

  function render(draw, time) {
    const aspect = innerWidth / innerHeight;
    if (aspect !== lastAspect) {
      frameCauseway(camera, aspect);
      cameraHome.copy(camera.position);
      lastAspect = aspect;
    }
    camera.position.copy(cameraHome).applyAxisAngle(up, .048 * Math.sin(time * .36));
    camera.lookAt(0, 0, 0);

    // Offset so time=0 (first paint & reduced-motion) captures peak heroic action:
    // Strike Jet banking over the front, Sunwings bursting past the Sunforge, raiders clashing!
    const t = time + 1.24;
    const fire = mod(t, BEAT), recoil = Math.exp(-fire * 15);
    const escortFire = mod(t + BEAT * .48, BEAT), escortRecoil = Math.exp(-escortFire * 14);
    tide.value = t;
    emberLight.intensity = 2.4 + .55 * Math.sin(t * 4.3) + .25 * Math.cos(t * 7.1);

    // Animate fleet cannons & muzzle flashes.
    cannon.animateVehicle(t, 0, recoil, 0, 0);
    cannon.setRecoil(.22 * recoil);
    twin.animateVehicle(t, 0, escortRecoil, 0, 0);
    twin.setRecoil(.16 * escortRecoil);
    squad.animateVehicle(t, 0, escortRecoil, 0, 0);
    squad.setRecoil(.16 * escortRecoil);

    flashes.count = 0;
    if (fire < .14) {
      place(flashes, flashes.count, heroMuzzle.x, heroMuzzle.y, heroMuzzle.z - .34, .36 * recoil, .34 * recoil, 1.1 * recoil);
      setSlotColor(flashes, flashes.count++, 0xffe48f);
    }
    if (escortFire < .12) {
      place(flashes, flashes.count, twinMuzzle.x, twinMuzzle.y, twinMuzzle.z - .26, .24 * escortRecoil, .24 * escortRecoil, .78 * escortRecoil);
      setSlotColor(flashes, flashes.count++, 0xff8df0);
      place(flashes, flashes.count, squadMuzzle.x, squadMuzzle.y, squadMuzzle.z - .26, .24 * escortRecoil, .24 * escortRecoil, .78 * escortRecoil);
      setSlotColor(flashes, flashes.count++, 0x8ef7ff);
    }

    // Animate multiplier gates, Sunforge brass wheel and scrolling glass gloss.
    gateShine.offset.x = (t * .38) % 1;
    gate2.wheel.rotation.z = -t * 1.45;
    rings.count = 0;
    for (let gi = 0; gi < gates.length; gi++) {
      const gate = gates[gi];
      const crossing = mod(t - (origin - gate.group.position.z) / SPEED, BEAT);
      gate.panelMat.opacity = .24 + .30 * Math.exp(-crossing * 10);
      if (crossing < .42 && rings.count < RING_CAP) {
        const p = crossing / .42;
        const r = .55 + p * 2.15;
        place(rings, rings.count, 0, .06, gate.group.position.z - p * .35, r, 1, r * .42);
        setSlotColor(rings, rings.count++, gi === 1 ? 0xffd066 : 0x7ef8ff);
      }
    }

    const cycle = mod(t, WAVES * BEAT);
    const charge = ease((cycle - (WAVES - 1) * BEAT) / BEAT);
    cannon.glow.scale.setScalar(1 + charge * .78);
    cannon.glowMat.color.setHex(charge > .40 || cycle < .18 ? 0xffd473 : 0xaef6ff);

    // Evolving allied waves: Troopers launch -> x3 -> Paladins after Sunforge x4 (+ Golden Sunwing wave!).
    troopers.body.count = paladins.body.count = sunwings.body.count = 0;
    let gunCount = 0, shadeCount = 0;
    for (let wave = 0; wave < WAVES; wave++) {
      const age = mod(t - wave * BEAT, WAVES * BEAT);
      if (age > span) continue;
      const z = origin - age * SPEED;
      const isSunwing = wave === 0;
      const pastSecond = z <= SECOND;
      const squadBatch = isSunwing ? sunwings : pastSecond ? paladins : troopers;
      const first = ease((FIRST - z) / 1.65), second = ease((SECOND - z) / 1.8);
      const count = z > FIRST ? 1 : z > SECOND ? 3 : 12;
      // Escort lane bias before Gate 1 makes it look like the flanking cannons feed the stream too.
      const launchLane = wave % 3 === 1 ? 1.85 : wave % 3 === 2 ? -1.85 : 0;
      const mergeCenter = 1 - ease((origin - z) / 2.2);
      for (let i = 0; i < count; i++) {
        const branch = i % 3, child = Math.floor(i / 3);
        const x = launchLane * mergeCenter * (1 - first) + (branch - 1) * 1.48 * first + (child - 1.5) * .54 * second;
        const zz = z + second * ((child % 2) * .64 + branch * .11);
        const phase = t * 12 + wave * 2.4 + i * 1.86;
        const launch = 1 - ease(age / .36);
        const y = .035 + (isSunwing ? .22 : 0) + launch * (heroMuzzle.y - .46) + Math.abs(Math.sin(phase)) * .07;
        const size = (isSunwing ? 1.09 : pastSecond ? .93 : .86) * (.65 + .35 * ease(age / .16)) * (1 - ease((age - span + .20) / .20));
        const slot = squadBatch.body.count++;
        place(squadBatch.body, slot, x, y, zz, size, size, size, Math.PI);
        if (gunCount < guns.instanceMatrix.count) guns.setMatrixAt(gunCount++, pose.matrix);
        squadBatch.gait.setXY(slot, phase, 1 - launch);
        place(shade, shadeCount++, x, .027, zz, .34 * size, 1, .43 * size);
      }
    }
    guns.count = gunCount;
    troopers.gait.needsUpdate = paladins.gait.needsUpdate = sunwings.gait.needsUpdate = true;

    // Clashing Red Raiders surging out from the volcanic dragon bastion to meet the blue/gold vanguard.
    raiders.body.count = 0;
    const raiderSpan = 1.65;
    for (let i = 0; i < RAIDER_COUNT; i++) {
      const rage = mod(t + i * (raiderSpan / RAIDER_COUNT), raiderSpan);
      const p = rage / raiderSpan;
      const lane = ((i % 5) - 2) * 1.15 + Math.sin(t * 2.2 + i * 1.7) * .22;
      const z = THREE.MathUtils.lerp(-8.75, -5.05, ease(p));
      const pop = (.55 + .45 * ease(p / .16)) * (1 - ease((p - .82) / .18));
      const phase = t * 13.5 + i * 2.1;
      const y = .035 + Math.abs(Math.sin(phase)) * .065;
      const s = .92 * pop;
      const slot = raiders.body.count++;
      place(raiders.body, slot, lane, y, z, s, s, s, 0);
      raiders.gait.setXY(slot, phase, 1);
      place(shade, shadeCount++, lane, .027, z, .34 * s, 1, .43 * s);
      if (p > .84 && rings.count < RING_CAP) {
        const rp = (p - .84) / .16;
        const rr = .25 + rp * .75;
        place(rings, rings.count, lane, .07, z, rr, 1, rr);
        setSlotColor(rings, rings.count++, 0xff7b48);
      }
    }
    raiders.gait.needsUpdate = true;

    // Contact shadows for fleet cannons & Ember Drake.
    place(shade, shadeCount++, 0, .026, 9.25, 1.48, 1, 1.72);
    place(shade, shadeCount++, 2.22, .026, 9.8, .92, 1, 1.12);
    place(shade, shadeCount++, -2.22, .026, 9.8, .92, 1, 1.12);
    place(shade, shadeCount++, 0, .026, -9.95, 2.02, 1, 1.28);

    // Banking Strike Jet air-support pass + bomb drop & shockwave detonations!
    const airT = mod(t, AIR_CYCLE);
    bombs.count = 0;
    if (airT < AIR_PASS) {
      const u = airT / AIR_PASS;
      sampleJet(u, jetPos);
      sampleJet(Math.min(1, u + .02), jetAhead);
      jet.group.visible = true;
      jet.group.position.copy(jetPos);
      direction.subVectors(jetAhead, jetPos).normalize();
      jet.group.lookAt(jetPos.x - direction.x, jetPos.y - direction.y, jetPos.z - direction.z);
      // Graceful wing bank into the dive curve.
      jet.group.rotateZ(.46 * Math.sin(u * Math.PI));
      const flicker = .86 + .28 * Math.sin(t * 48);
      for (const flame of jet.engines) flame.scale.set(1, 1, flicker);
      // Soft moving aircraft shadow on the causeway/sea below.
      if (Math.abs(jetPos.x) < 4.5 && jetPos.z > -11 && jetPos.z < 11) {
        place(shade, shadeCount++, jetPos.x * .85, .03, jetPos.z, 1.15, 1, 1.45);
      }
      // Two precision airstrike bombs drop mid-pass into the Red Raider line.
      for (let bi = 0; bi < 2; bi++) {
        const dropStart = .36 + bi * .11, dropDur = .20, blastDur = .22;
        const bt = u - dropStart;
        const tx = bi === 0 ? 1.1 : -1.25, tz = bi === 0 ? -6.3 : -7.45;
        if (bt >= 0 && bt < dropDur) {
          const bp = bt / dropDur;
          sampleJet(dropStart, start);
          end.set(tx, .15, tz);
          const bx = THREE.MathUtils.lerp(start.x, end.x, bp);
          const bz = THREE.MathUtils.lerp(start.z, end.z, bp);
          const by = THREE.MathUtils.lerp(start.y - .3, end.y, bp * bp);
          place(bombs, bombs.count++, bx, by, bz, 1, 1, 1);
        } else if (bt >= dropDur && bt < dropDur + blastDur && rings.count < RING_CAP) {
          const ep = (bt - dropDur) / blastDur;
          const er = .4 + ep * 2.2;
          place(rings, rings.count, tx, .08, tz, er, 1, er);
          setSlotColor(rings, rings.count++, ep < .4 ? 0xfff0a0 : 0xff9338);
        }
      }
    } else {
      jet.group.visible = false;
    }
    shade.count = shadeCount;

    // Mixed weapon tracers: cyan blasters + warm golden plasma bolts firing at both Raiders & Dragon.
    tracers.count = 0;
    for (let i = 0; i < 6; i++) {
      const travel = .30, delay = i * .042;
      const shot = mod(t - span + travel - delay, BEAT) / travel;
      if (shot >= 1) continue;
      const side = i % 2 ? 1 : -1;
      const aimRaider = i >= 4;
      start.set(side * (i < 2 ? 2.15 : i < 4 ? .78 : 1.45), .72, (aimRaider ? -3.4 : FRONT) + travel * SPEED);
      if (aimRaider) end.set(side * 1.15, .55, -6.2);
      else end.set(side * .54, 2.08 + (i % 3) * .22, -9.2);
      direction.subVectors(end, start).normalize();
      pose.position.lerpVectors(start, end, shot);
      pose.quaternion.setFromUnitVectors(up, direction);
      pose.scale.set(1, .74, 1);
      pose.updateMatrix();
      tracers.setMatrixAt(tracers.count, pose.matrix);
      setSlotColor(tracers, tracers.count++, i % 3 === 0 ? 0xffd268 : 0x9cfaff);
    }

    // Periodic piercing Railgun / Prism Lance beam synchronized with the golden Sunwing surge!
    const railAge = mod(t - (span - .35), WAVES * BEAT);
    const railDur = .48;
    if (railAge < railDur) {
      const rp = railAge / railDur;
      const fade = Math.sin(rp * Math.PI);
      start.set(0, .95, -2.2);
      end.set(0, 2.2, -9.3);
      const len = start.distanceTo(end);
      direction.subVectors(end, start).normalize();
      beamCore.position.lerpVectors(start, end, .5);
      beamCore.quaternion.setFromUnitVectors(up, direction);
      beamCore.scale.set(.6 + .8 * fade, len, .6 + .8 * fade);
      beamHalo.position.copy(beamCore.position);
      beamHalo.quaternion.copy(beamCore.quaternion);
      beamHalo.scale.set(.7 + 1.1 * fade, len, .7 + 1.1 * fade);
      beamMat.opacity = .92 * fade;
      beamGlowMat.opacity = .46 * fade;
      beamCore.visible = beamHalo.visible = true;
    } else {
      beamCore.visible = beamHalo.visible = false;
    }

    // Ember Drake animation & impact spark fountains (gold + crimson + cyan mixed bursts).
    const hit = mod(t - span, BEAT);
    const dragonHit = Math.exp(-hit * 13) + (railAge < railDur ? .45 : 0);
    dragon.animate(t, Math.max(0, 1 - mod(t, 5.4) / 1.25), { moving: false, health: 1, hit: Math.min(1, dragonHit) });
    if (hit < .38 && rings.count < RING_CAP) {
      const hr = .45 + (hit / .38) * 1.4;
      place(rings, rings.count, 0, .08, -9.15, hr, 1, hr);
      setSlotColor(rings, rings.count++, 0xffc663);
    }

    for (let i = 0; i < SPARK_CAP; i++) {
      const isFront = i >= 18;
      const baseHit = isFront ? mod(t + .34, BEAT) : hit;
      const p = baseHit / .58;
      const a = i * 2.4 + Math.floor((t - span) / BEAT) * .73;
      const s = (isFront ? .085 : .11) * (1 - ease(p));
      const cx = isFront ? (i % 2 ? 1.1 : -1.1) : 0;
      const cz = isFront ? -6.15 : -9.15;
      const cy = isFront ? .85 : 2.15;
      place(
        sparks,
        i,
        cx + Math.cos(a) * p * (1.25 + (i % 3) * .42),
        cy + p * (2.0 + (i % 4)) - p * p * 3.3,
        cz + Math.sin(a) * p,
        s,
        s * 1.75,
        s,
      );
      setSlotColor(sparks, i, isFront ? (i % 2 ? 0xff7a4d : 0x9cf8ff) : (i % 3 ? 0xffdc84 : 0xff7c3d));
    }

    // Floating sunlit embers & coastal spray motes.
    for (let i = 0; i < MOTE_CAP; i++) {
      const m = moteSeeds[i];
      const life = mod(t * m.speed + m.phase, 1);
      const y = (m.ember ? .25 : .15) + life * (m.ember ? 5.2 : 3.2);
      const s = m.size * Math.sin(life * Math.PI);
      const sway = Math.sin(t * 1.5 + m.phase) * .35;
      place(motes, i, m.x + sway, y, m.z + Math.cos(t * 1.2 + m.phase) * .25, s, s * 1.4, s, t + m.phase);
    }

    for (const m of [troopers.body, paladins.body, sunwings.body, raiders.body, guns, shade, flashes, tracers, sparks, rings, bombs, motes]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor && m !== motes) m.instanceColor.needsUpdate = true;
    }
    draw(scene, camera);
  }
  return { render };
}
