import * as THREE from 'three';
import { buildCannon, buildGate, drawLabel, troopWeaponGeo } from './models.js';
import { buildSculptedCore } from './boss-sculpted-core.js';
import { SUNWING_FORM, troopFormGeometry } from './troop-forms.js';
import { installTroopMotion } from './unit-assets.js';
import { buildTitleCoast } from './title-islands.js';

const BEAT = .76, SPEED = 3.9, WAVES = 7, FIRST = 3.8, SECOND = -1.15, FRONT = -7.35;
const mod = THREE.MathUtils.euclideanModulo;
const ease = (t) => THREE.MathUtils.smoothstep(t, 0, 1);

function frameCauseway(camera, aspect) {
  const wide = aspect >= 1.14;
  camera.position.set(wide ? 19 : 5.8, wide ? 17 : 24, wide ? 20 : 26);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const bounds = new THREE.Box2(), point = new THREE.Vector3();
  for (const z of [-12, 12]) {
    for (const x of [-3.85, 3.85]) {
      point.set(x, -.5, z).applyMatrix4(camera.matrixWorldInverse);
      bounds.expandByPoint(point);
    }
  }
  for (const x of [-2.8, 2.8]) {
    point.set(x, 6.6, -9.7).applyMatrix4(camera.matrixWorldInverse);
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

function instances(scene, geometry, material, capacity) {
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  return mesh;
}

// Absolute wave ages let a still frame show the complete chain and make resuming seamless.
export function buildTitleBattle() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x467887);
  scene.add(new THREE.HemisphereLight(0xfff0d5, 0x83afca, 1.7));
  const sun = new THREE.DirectionalLight(0xffdeb5, 2.35);
  sun.position.set(-7, 14, 9);
  scene.add(sun);
  const tide = buildTitleCoast(scene);
  const cannon = buildCannon(0x278ac4);
  cannon.setChassis(1);
  cannon.group.scale.setScalar(1.32);
  cannon.group.position.z = 9.4;
  scene.add(cannon.group);
  const muzzle = cannon.barrels.children[0].localToWorld(new THREE.Vector3(0, 0, -1.235));
  const origin = muzzle.z, span = (origin - FRONT) / SPEED;
  const gates = [[FIRST, 0x30c9ce, '×3'], [SECOND, 0xf6a448, '×4']].map(([z, color, label]) => {
    const gate = buildGate(5.8, color, true);
    drawLabel(gate.label, label);
    gate.text.scale.setScalar(1.32);
    gate.group.position.z = z;
    scene.add(gate.group);
    return gate;
  });
  const dragon = buildSculptedCore('dragon');
  dragon.group.position.set(0, 0, -10);
  dragon.group.scale.setScalar(.62);
  scene.add(dragon.group);
  function createSquad(form, color, capacity) {
    const material = installTroopMotion(new THREE.MeshLambertMaterial({ color, vertexColors: true }));
    const body = instances(scene, troopFormGeometry(form, 'low'), material, capacity);
    const gait = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2);
    gait.setUsage(THREE.DynamicDrawUsage);
    body.geometry.setAttribute('unitMotion', gait);
    return { body, gait };
  }
  const infantry = createSquad(1, 0x48b5fa, WAVES * 12), sunwings = createSquad(SUNWING_FORM, 0xffd27c, 12);
  const guns = instances(
    scene,
    troopWeaponGeo(1, 'low'),
    new THREE.MeshLambertMaterial({ vertexColors: true }),
    WAVES * 12,
  );
  const shade = instances(
    scene,
    new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x162c42, transparent: true, opacity: .30, depthWrite: false }),
    WAVES * 12 + 2,
  );
  const glow = new THREE.MeshBasicMaterial({ color: 0xffdc87 });
  const sparks = instances(scene, new THREE.OctahedronGeometry(1), glow, 18);
  const flash = new THREE.Mesh(new THREE.OctahedronGeometry(1), glow);
  scene.add(flash);
  const tracers = instances(
    scene,
    new THREE.CylinderGeometry(.055, .035, 1, 5),
    new THREE.MeshBasicMaterial({ color: 0xbcffff }),
    4,
  );
  const start = new THREE.Vector3(),
    end = new THREE.Vector3(),
    direction = new THREE.Vector3(),
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
  function render(draw, time) {
    const aspect = innerWidth / innerHeight;
    if (aspect !== lastAspect) {
      frameCauseway(camera, aspect);
      cameraHome.copy(camera.position);
      lastAspect = aspect;
    }
    camera.position.copy(cameraHome).applyAxisAngle(up, .046 * Math.sin(time * .39));
    camera.lookAt(0, 0, 0);
    const t = time + 1.97, fire = mod(t, BEAT), recoil = Math.exp(-fire * 15);
    tide.value = t;
    cannon.animateVehicle(t, 0, recoil, 0, 0);
    cannon.barrels.children[0].position.z = .21 * recoil;
    flash.visible = fire < .13;
    flash.position.copy(muzzle);
    flash.position.z -= .36;
    flash.scale.set(.32 * recoil, .32 * recoil, 1.05 * recoil);
    for (const gate of gates) {
      const crossing = mod(t - (origin - gate.group.position.z) / SPEED, BEAT);
      gate.panelMat.opacity = .23 + .28 * Math.exp(-crossing * 10);
    }
    const cycle = mod(t, WAVES * BEAT);
    const charge = ease((cycle - (WAVES - 1) * BEAT) / BEAT);
    cannon.glow.scale.setScalar(1 + charge * .7);
    cannon.glowMat.color.setHex(charge > .42 || cycle < .15 ? 0xffd473 : 0xaef6ff);
    infantry.body.count = sunwings.body.count = 0;
    let n = 0;
    for (let wave = 0; wave < WAVES; wave++) {
      const age = mod(t - wave * BEAT, WAVES * BEAT);
      const squad = wave === 0 ? sunwings : infantry;
      if (age > span) continue;
      const z = origin - age * SPEED;
      const first = ease((FIRST - z) / 1.65), second = ease((SECOND - z) / 1.8);
      const count = z > FIRST ? 1 : z > SECOND ? 3 : 12;
      for (let i = 0; i < count; i++) {
        const branch = i % 3, child = Math.floor(i / 3);
        const x = (branch - 1) * 1.45 * first + (child - 1.5) * .53 * second;
        const zz = z + second * ((child % 2) * .65 + branch * .11);
        const phase = t * 12 + wave * 2.4 + i * 1.86;
        const launch = 1 - ease(age / .36);
        const y = .035 + (wave === 0 ? .20 : 0) + launch * (muzzle.y - .48) + Math.abs(Math.sin(phase)) * .07;
        const size = (wave === 0 ? 1.07 : .87) * (.65 + .35 * ease(age / .16)) * (1 - ease((age - span + .20) / .20));
        const slot = squad.body.count++;
        place(squad.body, slot, x, y, zz, size, size, size, Math.PI);
        guns.setMatrixAt(n, pose.matrix);
        squad.gait.setXY(slot, phase, 1 - launch);
        place(shade, n, x, .027, zz, .34 * size, 1, .43 * size);
        n++;
      }
    }
    guns.count = n;
    infantry.gait.needsUpdate = sunwings.gait.needsUpdate = true;
    place(shade, n, 0, .026, 9.4, 1.44, 1, 1.68);
    place(shade, n + 1, 0, .026, -9.9, 1.98, 1, 1.24);
    shade.count = n + 2;
    // Four front rifles fire in sequence. Their bolts meet the dragon at the impact beat.
    tracers.count = 0;
    for (let i = 0; i < 4; i++) {
      const travel = .32, delay = i * .047;
      const shot = mod(t - span + travel - delay, BEAT) / travel;
      if (shot >= 1) continue;
      const side = i % 2 ? 1 : -1;
      start.set(side * (i < 2 ? 2.1 : .75), .7, FRONT + travel * SPEED);
      end.set(side * .52, 2.05 + (i % 3) * .22, -9.2);
      direction.subVectors(end, start).normalize();
      pose.position.lerpVectors(start, end, shot);
      pose.quaternion.setFromUnitVectors(up, direction);
      pose.scale.set(1, .68, 1);
      pose.updateMatrix();
      tracers.setMatrixAt(tracers.count++, pose.matrix);
    }
    const hit = mod(t - span, BEAT);
    dragon.animate(t, Math.max(0, 1 - mod(t, 5.4) / 1.25), { moving: false, health: 1, hit: Math.exp(-hit * 13) });
    for (let i = 0; i < 18; i++) {
      const p = hit / .6, a = i * 2.4 + Math.floor((t - span) / BEAT) * .73;
      const s = .105 * (1 - ease(p));
      place(
        sparks,
        i,
        Math.cos(a) * p * (1.2 + i % 3 * .4),
        2.15 + p * (2 + i % 4) - p * p * 3.3,
        -9.15 + Math.sin(a) * p,
        s,
        s * 1.7,
        s,
      );
    }
    for (const mesh of [infantry.body, sunwings.body, guns, shade, sparks, tracers]) {
      mesh.instanceMatrix.needsUpdate = true;
    }
    draw(scene, camera);
  }
  return { render };
}
