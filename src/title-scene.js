import * as THREE from 'three';
import { troopFormGeometry } from './troop-forms.js';
import { buildCannon, troopWeaponGeo } from './models.js';
import { pine, crate } from './scenery-assets.js';
import { prefs } from './settings.js';

// A separate, bounded diorama. It never advances the campaign simulation.
function buildCamp() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8bc9e7);
  scene.fog = new THREE.Fog(0x8bc9e7, 35, 85);
  scene.add(new THREE.HemisphereLight(0xe9faff, 0x756a4c, 2.5));
  const sun = new THREE.DirectionalLight(0xffe6b2, 3); sun.position.set(-8, 16, 8); scene.add(sun);
  const camp = new THREE.Group(); scene.add(camp);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshLambertMaterial({ color: 0x8bb69b }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.04; scene.add(ground);
  const path = new THREE.Mesh(new THREE.RingGeometry(4.7, 6.8, 64), new THREE.MeshLambertMaterial({ color: 0xd4c6a2 }));
  path.rotation.x = -Math.PI / 2; path.scale.set(1.35, .75, 1); camp.add(path);
  const propMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  for (let i = 0; i < 15; i++) {
    const angle = i / 15 * Math.PI * 2;
    const tree = new THREE.Mesh(pine(), propMat);
    tree.position.set(Math.cos(angle) * (11 + i % 3), 0, Math.sin(angle) * (9 + i % 2));
    tree.scale.setScalar(1.2 + (i % 3) * .35); camp.add(tree);
  }
  for (let i = 0; i < 5; i++) {
    const box = new THREE.Mesh(crate(), propMat); box.position.set(3 + i % 3 * .9, Math.floor(i / 3) * .8, -3 - Math.floor(i / 3)); camp.add(box);
  }
  const tank = buildCannon(0x428fff); tank.setChassis(1); tank.setBarrels(2);
  tank.group.position.set(4, 0, -.5); tank.group.rotation.y = -.7; camp.add(tank.group);

  // Split the authored stride regions into jointed legs while retaining every sculpted surface.
  const forms = [0, 1, 2].map(form => {
    const source = troopFormGeometry(form), regions = [[], [], []];
    const stride = source.getAttribute('unitStride');
    for (let i = 0; i < source.attributes.position.count; i += 3) {
      const leg = stride.getX(i), region = leg === 0 ? 0 : leg > 0 ? 1 : 2;
      regions[region].push(i, i + 1, i + 2);
    }
    const parts = regions.map(indices => {
      const geometry = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'color']) {
        const attr = source.getAttribute(name), values = [];
        for (const i of indices) for (let c = 0; c < 3; c++) values.push(attr.array[i * 3 + c]);
        geometry.setAttribute(name, new THREE.Float32BufferAttribute(values, 3));
      }
      return geometry;
    });
    parts.slice(1).forEach(g => g.translate(0, -.33, 0)); source.dispose(); return parts;
  });
  const weapons = [troopWeaponGeo(1), troopWeaponGeo(3)];
  const soldiers = [];
  function soldier(form, color, role, index) {
    const group = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color, vertexColors: true });
    const body = new THREE.Mesh(forms[form][0], mat); group.add(body);
    const legs = forms[form].slice(1).map(geo => { const leg = new THREE.Mesh(geo, mat); leg.position.y = .33; group.add(leg); return leg; });
    const gun = new THREE.Mesh(weapons[form % 2], propMat); group.add(gun);
    camp.add(group); soldiers.push({ group, legs, role, index, body, gun }); return group;
  }
  for (let i = 0; i < 10; i++) soldier(i % 2, i % 2 ? 0x55cde8 : 0x429cff, 'patrol', i);
  for (let i = 0; i < 3; i++) {
    const unit = soldier(1, 0x7ed9c3, 'training', i); unit.position.set(-4.5 + i * 1.35, 0, -.5); unit.rotation.y = Math.PI;
  }
  const mechanic = soldier(0, 0x51b9ff, 'mechanic', 0); mechanic.position.set(2.1, 0, .4); mechanic.rotation.y = 1.3;
  const commander = soldier(2, 0xffd16e, 'commander', 0); commander.position.set(-1, 0, 2.3); commander.rotation.y = -.5;
  const targets = [];
  const shots = [];
  for (let i = 0; i < 3; i++) {
    const target = new THREE.Group();
    const face = new THREE.Mesh(new THREE.TorusGeometry(.4, .09, 6, 20), new THREE.MeshLambertMaterial({ color: 0xffbd59 })); face.position.y = .95; target.add(face);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1, 6), new THREE.MeshLambertMaterial({ color: 0x314a5b })); post.position.y = .5; target.add(post);
    target.position.set(-4.5 + i * 1.35, 0, -3.7); camp.add(target); targets.push(target);
    const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-4.5 + i * 1.35, .68, -1.2), new THREE.Vector3(-4.5 + i * 1.35, .95, -3.7),
    ]), new THREE.LineBasicMaterial({ color: 0xbafaff }));
    beam.visible = false; camp.add(beam); shots.push(beam);
  }
  const clouds = [];
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xf1faff });
  const cloudGeo = new THREE.SphereGeometry(1, 12, 8);
  for (let i = 0; i < 8; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 3; j++) { const puff = new THREE.Mesh(cloudGeo, cloudMat); puff.position.x = j * 1.4; puff.scale.set(1.6, .65 + j % 2 * .35, .8); cloud.add(puff); }
    cloud.position.set(i * 8 - 30, 10 + i % 3, -12 - i % 2 * 10); scene.add(cloud); clouds.push(cloud);
  }
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 120);
  function render(draw, time) {
    const portrait = innerWidth < innerHeight;
    camera.aspect = innerWidth / innerHeight;
    camera.position.set(portrait ? 16 : 14, portrait ? 23 : 17, portrait ? 34 : 25);
    camera.lookAt(0, portrait ? 5.8 : 4.8, 0); camera.updateProjectionMatrix();
    soldiers.forEach(({ group, legs, role, index, body, gun }) => {
      const phase = time * 5 + index * .7;
      if (role === 'patrol') {
        const angle = time * .12 + index * .16;
        group.position.set(Math.cos(angle) * 7.4, .025 + Math.abs(Math.sin(phase)) * .035, Math.sin(angle) * 4.2);
        group.rotation.y = Math.atan2(-Math.sin(angle) * 7.4, Math.cos(angle) * 4.2);
        legs.forEach((leg, i) => { leg.rotation.x = Math.sin(phase + i * Math.PI) * .55; });
      } else if (role === 'training') {
        body.rotation.x = Math.sin(time * 2.2 + index) * .045;
        gun.position.z = Math.max(0, Math.sin(time * 4 - index * 2)) ** 16 * -.12;
        targets[index].rotation.x = Math.max(0, Math.sin(time * 4 - index * 2 - .5)) ** 12 * -.25;
      } else if (role === 'mechanic') { group.rotation.z = Math.sin(time * 1.8) * .12; group.position.y = Math.sin(time * 1.8) * .06; }
      else { group.rotation.y = -.5 + Math.sin(time * .65) * .5; body.position.y = Math.sin(time * 2) * .025; }
    });
    tank.animateVehicle(time, 0, 0, 0, 0); tank.barrels.rotation.y = Math.sin(time * .3) * .18;
    shots.forEach((beam, i) => { beam.visible = (time * 4 - i * 2 + Math.PI * 8) % (Math.PI * 2) < .3 && time > .1; });
    clouds.forEach((cloud, i) => { cloud.position.x = ((i * 8 + time * .24) % 64) - 32; });
    draw(scene, camera);
  }
  return { render };
}

export function createTitleScreen(sound, draw) {
  const root = document.getElementById('welcome'), settings = document.getElementById('settings');
  const motion = document.getElementById('setting-motion'), audio = document.getElementById('setting-audio'), glow = document.getElementById('setting-glow'), music = document.getElementById('setting-music');
  let camp, visible = false, time = 0, elapsed = 0, dirty = true, focused = document.hasFocus();
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let animated = !preference.matches;
  try { const stored = localStorage.getItem('swarm-menu-motion'); if (stored !== null) animated = stored === '1'; } catch {}
  glow.onchange = () => { prefs.set('glow', glow.checked); dirty = true; };
  music.onchange = () => prefs.set('music', music.checked);
  function sync() { motion.checked = animated; audio.checked = !sound.muted; glow.checked = prefs.get('glow'); music.checked = prefs.get('music'); root.classList.toggle('still', !animated || preference.matches); document.body.classList.toggle('menu-still', !animated); }
  document.getElementById('welcome-settings').onclick = () => { sync(); settings.showModal(); };
  document.getElementById('settings-close').onclick = () => settings.close();
  audio.onchange = () => { if (audio.checked === sound.muted) sound.toggle(); document.getElementById('mute').textContent = sound.muted ? '🔇' : '🔊'; };
  motion.onchange = () => { animated = motion.checked; try { localStorage.setItem('swarm-menu-motion', animated ? '1' : '0'); } catch {} sync(); dirty = true; };
  preference.addEventListener('change', () => { sync(); dirty = true; });
  addEventListener('resize', () => { dirty = true; });
  addEventListener('blur', () => { focused = false; root.classList.add('unfocused'); });
  addEventListener('focus', () => { focused = true; dirty = true; root.classList.remove('unfocused'); });
  sync();
  return {
    get visible() { return visible; },
    show() { visible = true; dirty = true; root.classList.remove('hidden'); document.getElementById('menu').classList.add('hidden'); sync(); document.getElementById('welcome-play').focus({ preventScroll: true }); },
    hide() { visible = false; root.classList.add('hidden'); if (settings.open) settings.close(); },
    render(dt) {
      if (document.hidden || !focused) return;
      elapsed += dt;
      const moving = animated && !preference.matches;
      if (!dirty && (!moving || elapsed < 1 / 30)) return;
      camp ||= buildCamp();
      if (moving) time += Math.min(elapsed, .1);
      elapsed = 0; dirty = false; camp.render(draw, moving ? time : 0);
    },
  };
}
