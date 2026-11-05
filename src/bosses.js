// Bosses for levels 11-20. Each returns { group, radius, height, animate(t, attack01) }.
import * as THREE from 'three';
import { lam, mesh, buildKing, buildGolem, buildDragon } from './models.js';

function wrap(inner, scale, radius, height, extra) {
  const g = new THREE.Group();
  g.add(inner.group);
  g.scale.setScalar(scale);
  return {
    group: g, radius: radius ?? inner.radius * scale, height: height ?? inner.height * scale,
    animate(t, atk) { inner.animate(t, atk); extra?.(t, atk); },
  };
}

// 11 Drill Mech: brass walker with two spinning drills
function buildDrill() {
  const g = new THREE.Group();
  const brass = lam(0xc8963a, { flatShading: true }), steel = lam(0x7a808c, { flatShading: true }), dark = lam(0x2a2d34);
  const eye = new THREE.MeshBasicMaterial({ color: 0xffd23a });
  for (const sx of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(1.2, 1.0, 3.2), dark, sx * 1.5, 0.5, 0));
    for (let k = 0; k < 4; k++) g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.25, 10).rotateZ(Math.PI / 2), steel, sx * 1.5, 0.45, -1.2 + k * 0.8, false));
  }
  const torso = new THREE.Group(); torso.position.y = 1.2; g.add(torso);
  torso.add(mesh(new THREE.CylinderGeometry(1.7, 2.0, 2.6, 8), brass, 0, 1.3, 0));
  torso.add(mesh(new THREE.TorusGeometry(1.75, 0.15, 6, 16).rotateX(Math.PI / 2), dark, 0, 2.5, 0, false));
  const head = new THREE.Group(); head.position.y = 3.0; torso.add(head);
  head.add(mesh(new THREE.SphereGeometry(1.0, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), steel));
  head.add(mesh(new THREE.BoxGeometry(1.4, 0.3, 0.2), eye, 0, 0.35, 0.85, false));
  const stack = mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.4, 8), dark, -0.8, 1.0, -0.4); head.add(stack);
  const drills = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sx * 2.1, 2.0, 0.3); torso.add(arm);
    arm.add(mesh(new THREE.SphereGeometry(0.65, 10, 8), steel));
    arm.add(mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.6, 8).rotateX(Math.PI / 2), brass, 0, 0, 0.9));
    const drill = new THREE.Group(); drill.position.set(0, 0, 1.8); arm.add(drill);
    const cone = new THREE.ConeGeometry(0.7, 2.4, 10); cone.rotateX(Math.PI / 2); cone.translate(0, 0, 1.2);
    drill.add(mesh(cone, steel));
    for (let k = 0; k < 3; k++) drill.add(mesh(new THREE.TorusGeometry(0.62 - k * 0.17, 0.06, 4, 12), brass, 0, 0, 0.4 + k * 0.6, false));
    drills.push({ arm, drill, sx });
  }
  g.scale.setScalar(1.45);
  return {
    group: g, radius: 3.4, height: 9.0,
    animate(t, atk) {
      for (const d of drills) { d.drill.rotation.z += 0.3 + atk * 0.6; d.arm.rotation.x = Math.sin(t * 2 + d.sx) * 0.2 - atk * 0.6; }
      torso.rotation.y = Math.sin(t * 0.9) * 0.15;
      stack.scale.y = 1 + Math.sin(t * 8) * 0.08;
    },
  };
}

// 12 Dice Lord: a giant die with a crown, juggling dice
function buildDice() {
  const g = new THREE.Group();
  const white = lam(0xfafafa), pip = lam(0x1a1a24), red = lam(0xe8263a), gold = lam(0xffd84d, { emissive: 0x553300 });
  const body = new THREE.Group(); body.position.y = 3.2; g.add(body);
  body.add(mesh(new THREE.BoxGeometry(4, 4, 4), white));
  const pips = (face, n) => {
    const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, 1], [-1, 1], [1, -1]], 5: [[-1, -1], [1, 1], [-1, 1], [1, -1], [0, 0]], 6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]] }[n];
    for (const [a, b] of P) {
      const m = mesh(new THREE.SphereGeometry(0.32, 10, 8), pip, 0, 0, 0, false);
      if (face === 'top') m.position.set(a * 1.1, 2.0, b * 1.1);
      else if (face === 'left') m.position.set(-2.0, a * 1.1, b * 1.1);
      else m.position.set(2.0, a * 1.1, b * 1.1);
      body.add(m);
    }
  };
  pips('top', 5); pips('left', 3); pips('right', 4);
  for (const sx of [-1, 1]) {
    body.add(mesh(new THREE.SphereGeometry(0.42, 12, 10), white, sx * 0.85, 0.5, 2.0));
    body.add(mesh(new THREE.SphereGeometry(0.24, 10, 8), pip, sx * 0.85, 0.5, 2.3));
    const brow = mesh(new THREE.BoxGeometry(0.8, 0.16, 0.12), pip, sx * 0.85, 1.15, 2.05); brow.rotation.z = sx * -0.35; body.add(brow);
  }
  body.add(mesh(new THREE.BoxGeometry(1.6, 0.25, 0.1), red, 0, -0.6, 2.02));
  body.add(mesh(new THREE.CylinderGeometry(1.1, 1.25, 0.6, 10), gold, 0, 2.3, 0));
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; body.add(mesh(new THREE.ConeGeometry(0.2, 0.6, 6), gold, Math.cos(a) * 1.0, 2.85, Math.sin(a) * 1.0)); }
  const juggle = [];
  for (let k = 0; k < 3; k++) {
    const d = mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), k === 1 ? red : white);
    g.add(d); juggle.push(d);
  }
  for (const sx of [-1, 1]) g.add(mesh(new THREE.CapsuleGeometry(0.45, 0.6, 4, 8), red, sx * 1.1, 0.6, 0));
  g.scale.setScalar(1.35);
  return {
    group: g, radius: 3.2, height: 9.5,
    animate(t, atk) {
      body.rotation.y = Math.sin(t * 1.1) * 0.25;
      body.position.y = 3.2 + Math.abs(Math.sin(t * 3)) * 0.25 + atk * 0.8;
      juggle.forEach((d, k) => {
        const a = t * 3 + k * 2.1;
        d.position.set(Math.cos(a) * 3.2, 6.5 + Math.sin(a * 2) * 1.2, Math.sin(a) * 1.2 + 1.5);
        d.rotation.set(a * 2, a, 0);
      });
    },
  };
}

// 13 Kraken: a huge squid with waving tentacles
function buildKraken() {
  const g = new THREE.Group();
  const skin = lam(0xd23a6a), spot = lam(0xff8ab0), white = lam(0xffffff), black = lam(0x1a0510);
  const head = new THREE.Group(); head.position.y = 4.2; g.add(head);
  const mantle = mesh(new THREE.SphereGeometry(2.0, 20, 16), skin); mantle.scale.set(1, 1.5, 1); head.add(mantle);
  for (let k = 0; k < 7; k++) head.add(mesh(new THREE.SphereGeometry(0.3 + (k % 3) * 0.1, 8, 6), spot, Math.cos(k * 2) * 1.3, 0.8 + (k % 4) * 0.5, -1.2 + (k % 2) * 0.3, false));
  for (const sx of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(0.62, 14, 10), white, sx * 0.9, -0.6, 1.55));
    head.add(mesh(new THREE.SphereGeometry(0.32, 10, 8), black, sx * 0.9, -0.6, 2.05));
  }
  const tents = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const root = new THREE.Group(); root.position.set(Math.cos(a) * 1.4, 1.6, Math.sin(a) * 1.4 + 0.4); g.add(root);
    const segs = [];
    let parent = root;
    for (let s = 0; s < 6; s++) {
      const seg = new THREE.Group(); seg.position.set(0, s ? -0.75 : 0, 0); parent.add(seg);
      seg.add(mesh(new THREE.SphereGeometry(0.48 - s * 0.06, 10, 8), s % 2 ? spot : skin, 0, -0.35, 0));
      segs.push(seg); parent = seg;
    }
    root.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
    tents.push({ root, segs, a });
  }
  g.scale.setScalar(1.3);
  return {
    group: g, radius: 3.3, height: 10,
    animate(t, atk) {
      mantle.scale.y = 1.5 + Math.sin(t * 2) * 0.06;
      head.rotation.x = -atk * 0.3;
      for (const tn of tents) tn.segs.forEach((s, k) => { s.rotation.x = Math.sin(t * 2.4 + tn.a * 2 + k * 0.6) * 0.35 - atk * 0.3; s.rotation.z = Math.cos(t * 1.8 + tn.a + k * 0.5) * 0.25; });
    },
  };
}

// 14 Pumpkin King: carved glowing pumpkin head on a cloak
function buildPumpkin() {
  const g = new THREE.Group();
  const orange = lam(0xff8a1a), cloak = lam(0x3a1a5a), stem = lam(0x3a6a2a), gold = lam(0xffd84d, { emissive: 0x553300 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffe04a });
  g.add(mesh(new THREE.ConeGeometry(2.4, 5.2, 14, 1, true), cloak, 0, 2.6, 0));
  const head = new THREE.Group(); head.position.y = 6.2; g.add(head);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const r = mesh(new THREE.SphereGeometry(1.2, 14, 10), orange, Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75); r.scale.set(0.75, 1, 0.75); head.add(r); }
  head.add(mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.8, 6), stem, 0, 1.4, 0));
  const tri = (x, y, s, rot = 0) => { const sh = new THREE.Shape(); sh.moveTo(0, s); sh.lineTo(s * 0.9, -s * 0.6); sh.lineTo(-s * 0.9, -s * 0.6); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), glow); m.position.set(x, y, 1.62); m.rotation.z = rot; head.add(m); };
  tri(-0.55, 0.35, 0.32); tri(0.55, 0.35, 0.32); tri(0, -0.05, 0.18);
  const mouth = new THREE.Shape(); mouth.moveTo(-0.9, -0.4); for (let k = 0; k <= 6; k++) mouth.lineTo(-0.9 + k * 0.3, k % 2 ? -0.55 : -0.75); mouth.lineTo(0.9, -0.4); mouth.lineTo(0.6, -1.0); mouth.lineTo(-0.6, -1.0);
  const mm = new THREE.Mesh(new THREE.ShapeGeometry(mouth), glow); mm.position.set(0, 0, 1.6); head.add(mm);
  head.add(mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.45, 10), gold, 0, 1.2, 0));
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; head.add(mesh(new THREE.ConeGeometry(0.16, 0.5, 5), gold, Math.cos(a) * 0.8, 1.6, Math.sin(a) * 0.8)); }
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sx * 1.8, 4.2, 0); g.add(arm);
    arm.add(mesh(new THREE.CapsuleGeometry(0.35, 1.8, 4, 8), cloak, 0, -1.0, 0));
    arm.add(mesh(new THREE.SphereGeometry(0.42, 10, 8), lam(0x6ab04a), 0, -2.2, 0));
    arm.rotation.z = sx * 0.4; arms.push(arm);
  }
  const light = new THREE.PointLight(0xffa01a, 26, 14, 1.6); light.position.set(0, 6, 3); g.add(light);
  g.scale.setScalar(1.3);
  return {
    group: g, radius: 3.0, height: 11,
    animate(t, atk) {
      head.rotation.z = Math.sin(t * 1.6) * 0.12;
      head.rotation.x = -atk * 0.3;
      glow.color.setHSL(0.12, 1, 0.55 + Math.sin(t * 12) * 0.08 + atk * 0.2);
      arms[0].rotation.x = Math.sin(t * 2) * 0.3 - atk * 1.6; arms[1].rotation.x = -Math.sin(t * 2) * 0.3 - atk * 1.6;
      light.intensity = 22 + Math.sin(t * 10) * 5 + atk * 30;
    },
  };
}

// 15 Red Commander: an officer giant with a shoulder cannon
function buildCommander() {
  const g = new THREE.Group();
  const red = lam(0xd8202a), dark = lam(0x2a1216), gold = lam(0xffd84d, { emissive: 0x553300 }), skin = lam(0xff5a4a), white = lam(0xffffff), black = lam(0x140404);
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(1.0, 2.4, 1.1), dark, sx * 0.8, 1.2, 0));
  const torso = new THREE.Group(); torso.position.y = 2.4; g.add(torso);
  torso.add(mesh(new THREE.BoxGeometry(3.4, 3.0, 1.9), red, 0, 1.5, 0));
  torso.add(mesh(new THREE.BoxGeometry(3.5, 0.35, 2.0), dark, 0, 0.3, 0));
  for (let k = 0; k < 3; k++) torso.add(mesh(new THREE.SphereGeometry(0.15, 8, 6), gold, 0, 0.9 + k * 0.7, 1.0, false));
  for (const sx of [-1, 1]) torso.add(mesh(new THREE.BoxGeometry(1.1, 0.3, 1.2), gold, sx * 1.9, 3.0, 0));
  const head = new THREE.Group(); head.position.y = 3.9; torso.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.95, 16, 12), skin));
  for (const sx of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), white, sx * 0.35, 0.1, 0.8));
    head.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), black, sx * 0.35, 0.08, 0.98));
    const brow = mesh(new THREE.BoxGeometry(0.45, 0.12, 0.12), black, sx * 0.35, 0.42, 0.85); brow.rotation.z = sx * -0.5; head.add(brow);
  }
  head.add(mesh(new THREE.CylinderGeometry(1.15, 1.0, 0.55, 16), red, 0, 0.85, 0));
  head.add(mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.12, 16), dark, 0, 0.6, 0.2));
  head.add(mesh(new THREE.SphereGeometry(0.22, 8, 6), gold, 0, 0.95, 1.05));
  const gun = new THREE.Group(); gun.position.set(1.6, 3.4, -0.2); torso.add(gun);
  const barrel = new THREE.CylinderGeometry(0.45, 0.55, 3.2, 12); barrel.rotateX(Math.PI / 2); barrel.translate(0, 0, 1.0);
  gun.add(mesh(barrel, dark), mesh(new THREE.TorusGeometry(0.5, 0.1, 6, 14), gold, 0, 0, 2.6));
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sx * 2.1, 2.5, 0); torso.add(arm);
    arm.add(mesh(new THREE.CapsuleGeometry(0.45, 1.4, 4, 8), red, 0, -1.0, 0));
    arm.add(mesh(new THREE.SphereGeometry(0.5, 10, 8), skin, 0, -2.0, 0.1));
    arms.push(arm);
  }
  g.scale.setScalar(1.4);
  return {
    group: g, radius: 3.0, height: 10.4,
    animate(t, atk) {
      torso.rotation.y = Math.sin(t * 0.8) * 0.15;
      gun.rotation.x = -0.1 - atk * 0.4;
      arms[0].rotation.x = Math.sin(t * 2.2) * 0.3; arms[1].rotation.x = -Math.sin(t * 2.2) * 0.3 - atk * 1.4;
      g.position.y = Math.abs(Math.sin(t * 2.2)) * 0.1;
    },
  };
}

// 16 Crystal Spider: eight legs and a back full of glowing crystals
function buildSpider() {
  const g = new THREE.Group();
  const shell = lam(0x3a2a5a, { flatShading: true }), leg = lam(0x2a1a40, { flatShading: true });
  const crystal = lam(0x7af0ff, { flatShading: true, emissive: 0x2a8aa0 });
  const eye = new THREE.MeshBasicMaterial({ color: 0xff3af0 });
  const body = new THREE.Group(); body.position.y = 3.0; g.add(body);
  const abd = mesh(new THREE.SphereGeometry(2.0, 16, 12), shell, 0, 0.4, -1.8); abd.scale.set(1.1, 0.9, 1.3); body.add(abd);
  body.add(mesh(new THREE.SphereGeometry(1.2, 14, 10), shell, 0, 0, 0.8));
  for (let k = 0; k < 6; k++) {
    const c = mesh(new THREE.OctahedronGeometry(0.55), crystal, Math.cos(k * 1.7) * 1.0, 1.8 + (k % 2) * 0.3, -1.8 + Math.sin(k * 1.7) * 1.0);
    c.scale.y = 2.2; c.rotation.z = Math.cos(k) * 0.4; body.add(c);
  }
  for (let k = 0; k < 6; k++) body.add(mesh(new THREE.SphereGeometry(k < 2 ? 0.22 : 0.13, 8, 6), eye, (k % 2 ? 1 : -1) * (k < 2 ? 0.35 : 0.65), 0.3 + (k >> 1) * 0.12, 1.85, false));
  for (const sx of [-1, 1]) { const f = mesh(new THREE.ConeGeometry(0.15, 0.7, 6), crystal, sx * 0.3, -0.7, 1.8, false); f.rotation.x = Math.PI; body.add(f); }
  const legs = [];
  for (let k = 0; k < 8; k++) {
    const sx = k < 4 ? -1 : 1, i = k % 4;
    const hip = new THREE.Group(); hip.position.set(sx * 0.9, 0, 1.2 - i * 0.8); body.add(hip);
    const up = new THREE.CylinderGeometry(0.16, 0.2, 2.6, 6); up.translate(0, 1.3, 0);
    const knee = new THREE.Group(); knee.position.y = 2.6; hip.add(knee);
    hip.add(mesh(up, leg));
    const low = new THREE.CylinderGeometry(0.06, 0.14, 3.4, 6); low.translate(0, -1.7, 0);
    knee.add(mesh(low, leg), mesh(new THREE.SphereGeometry(0.22, 8, 6), crystal));
    hip.rotation.z = -sx * 0.9; hip.rotation.y = sx * (0.6 - i * 0.4); knee.rotation.z = sx * 1.9;
    legs.push({ hip, knee, sx, i });
  }
  g.scale.setScalar(1.3);
  return {
    group: g, radius: 3.6, height: 8.5,
    animate(t, atk) {
      body.position.y = 3.0 + Math.sin(t * 6) * 0.08 - atk * 0.5;
      for (const l of legs) l.hip.rotation.x = Math.sin(t * 6 + l.i * 1.3 + (l.sx > 0 ? Math.PI : 0)) * 0.22;
      abd.rotation.x = -atk * 0.4;
    },
  };
}

// 18 Pharaoh: wrapped mummy giant with a gold mask and striped headdress
function buildPharaoh() {
  const g = new THREE.Group();
  const wrapM = lam(0xe8dcc0), wrapD = lam(0xc8b890), gold = lam(0xffc21a, { emissive: 0x553300 }), blue = lam(0x2a4ad0), black = lam(0x140a04);
  const eye = new THREE.MeshBasicMaterial({ color: 0x6affd0 });
  for (const sx of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.55, 0.45, 2.6, 8), wrapM, sx * 0.75, 1.3, 0));
  const torso = new THREE.Group(); torso.position.y = 2.6; g.add(torso);
  torso.add(mesh(new THREE.CylinderGeometry(1.5, 1.2, 3.0, 10), wrapM, 0, 1.5, 0));
  for (let k = 0; k < 5; k++) { const b = mesh(new THREE.TorusGeometry(1.35 - k * 0.04, 0.09, 5, 16), wrapD, 0, 0.3 + k * 0.6, 0, false); b.rotation.x = Math.PI / 2 + (k % 2 ? 0.15 : -0.15); torso.add(b); }
  torso.add(mesh(new THREE.TorusGeometry(1.25, 0.25, 6, 16, Math.PI), gold, 0, 2.6, 0.2).rotateX(-0.4));
  const head = new THREE.Group(); head.position.y = 3.9; torso.add(head);
  head.add(mesh(new THREE.BoxGeometry(1.4, 1.6, 1.3), gold));
  for (const sx of [-1, 1]) {
    head.add(mesh(new THREE.BoxGeometry(0.35, 0.14, 0.1), black, sx * 0.33, 0.2, 0.68, false));
    head.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), eye, sx * 0.33, 0.2, 0.74, false));
    for (let k = 0; k < 4; k++) head.add(mesh(new THREE.BoxGeometry(0.55, 0.4, 0.9), k % 2 ? blue : gold, sx * 0.95, 0.5 - k * 0.42, -0.1));
  }
  head.add(mesh(new THREE.BoxGeometry(1.9, 0.45, 1.5), blue, 0, 0.95, -0.1));
  head.add(mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), gold, 0, -1.1, 0.5));
  head.add(mesh(new THREE.ConeGeometry(0.18, 0.5, 6), gold, 0, 1.4, 0.55));
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sx * 1.8, 2.6, 0); torso.add(arm);
    arm.add(mesh(new THREE.CapsuleGeometry(0.38, 1.8, 4, 8), wrapM, 0, -1.1, 0));
    arms.push(arm);
  }
  const staff = new THREE.Group(); arms[1].add(staff); staff.position.set(0, -2.2, 0.3);
  staff.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 6), gold, 0, 1.2, 0));
  staff.add(mesh(new THREE.TorusGeometry(0.45, 0.1, 6, 14), blue, 0, 3.9, 0));
  const light = new THREE.PointLight(0x6affd0, 18, 12, 1.6); light.position.set(0, 7, 2); g.add(light);
  g.scale.setScalar(1.4);
  return {
    group: g, radius: 2.9, height: 10.6,
    animate(t, atk) {
      torso.rotation.z = Math.sin(t * 1.3) * 0.05;
      arms[0].rotation.x = Math.sin(t * 1.5) * 0.4 - 0.8 - atk * 0.6; arms[1].rotation.x = -0.3 - atk * 1.4;
      head.rotation.y = Math.sin(t * 0.7) * 0.2;
      eye.color.setHSL(0.45, 1, 0.55 + atk * 0.3);
    },
  };
}

export function buildBoss2(type) {
  switch (type) {
    case 'drill': return buildDrill();
    case 'dice': return buildDice();
    case 'kraken': return buildKraken();
    case 'pumpkin': return buildPumpkin();
    case 'commander': return buildCommander();
    case 'spider': return buildSpider();
    case 'magma': return wrap(buildDragon({ body: 0x2a1414, belly: 0xff6a1a, wing: 0xc0300a, horn: 0xffd23a, eye: 0xffffff, light: 0xff5a1a }), 1.25);
    case 'pharaoh': return buildPharaoh();
    case 'thunder': {
      const inner = buildGolem({ rock: 0x5a6a8a, dark: 0x3a4460, crystal: 0xfff04d, cEm: 0x8a7a0a, eye: 0xfff04d });
      const light = new THREE.PointLight(0xfff06a, 0, 16, 1.6); light.position.set(0, 9, 2); inner.group.add(light);
      return wrap(inner, 1.3, null, null, (t, atk) => { light.intensity = Math.random() < 0.08 ? 60 : 8 + atk * 50; });
    }
    case 'emperor': {
      const inner = buildKing({ body: 0x7a1aa8, belly: 0xffc21a, crown: 0xfff04d, horn: 0xff3af0, emissive: 0x3a0a5a });
      const halo = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.16, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffe04a }));
      halo.position.set(0, 7.4, -0.6); inner.group.add(halo);
      const cape = mesh(new THREE.PlaneGeometry(4.2, 5.4), new THREE.MeshLambertMaterial({ color: 0xc81a3a, side: THREE.DoubleSide }), 0, 3.0, -1.4);
      inner.group.add(cape);
      return wrap(inner, 1.45, null, null, (t) => { halo.rotation.z = t; cape.rotation.x = 0.15 + Math.sin(t * 2) * 0.05; });
    }
    default: return null;
  }
}
