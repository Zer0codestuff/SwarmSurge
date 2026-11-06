import * as THREE from 'three';
import { assetBatch, assetGlow, attackPose } from './asset-kit.js';

const C = {
  ink: 0x192537, joint: 0x34455a, steel: 0x7d99ae, ivory: 0xfff2d5,
  gold: 0xffc65b, red: 0xc53b49, cyan: 0x75e9fb, white: 0xe6f1ff,
};
const TAU = Math.PI * 2;

function node(parent, name, x = 0, y = 0, z = 0) {
  const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g;
}
function crystal(batch, x, y, z, length, color, tilt = 0, width = .35) {
  const g = new THREE.OctahedronGeometry(1); g.scale(width, length / 2, width);
  batch.add(g, color, x, y, z, 0, 0, tilt);
}
function crown(parent, radius, y, color, tips = 5, tall = .8) {
  const b = assetBatch().cylinder(radius, .33, 0, y, 0, color, 'y', radius * 1.05, 10);
  for (let i = 0; i < tips; i++) {
    const a = i / tips * TAU;
    b.add(new THREE.ConeGeometry(.22, tall, 5), color, Math.sin(a) * radius * .83, y + tall * .48, Math.cos(a) * radius * .83);
    b.sphere(.12, Math.sin(a) * radius * .83, y + tall * .98, Math.cos(a) * radius * .83, 0xffe9a3);
  }
  return b.finish(parent, 'crown');
}
function eyes(parent, y, z, spacing = .48, color = C.cyan, angry = true, size = .43) {
  const b = assetBatch(), glow = assetBatch();
  for (const s of [-1, 1]) {
    b.box(size * 1.6, size * .95, .16, s * spacing, y, z, C.ink);
    glow.box(size, size * .42, .19, s * spacing, y, z + .04, color);
    if (angry) b.box(size * 1.6, .17, .21, s * spacing, y + size * .48, z + .03, C.ink, 0, 0, -s * .22);
  }
  b.finish(parent, 'eye-sockets'); glow.finish(parent, 'eyes', assetGlow);
}
function legs(parent, { y = 2.6, x = .9, color = C.ink, trim = C.steel, wide = 1.3, depth = 1.6, bone = false } = {}) {
  return [-1, 1].map(s => {
    const g = node(parent, `leg-${s}`, s * x, y, 0);
    const b = assetBatch();
    if (bone) {
      b.cylinder(.25, y * .7, -.17, -y * .4, 0, color).cylinder(.25, y * .7, .17, -y * .4, 0, color);
      b.sphere(.4, 0, -y * .62, .1, trim).box(wide, .58, depth, 0, -y + .29, .26, color);
    } else {
      b.box(wide * .8, y * .68, depth * .66, 0, -y * .36, 0, color);
      b.box(wide * .88, .54, depth * .77, 0, -y * .52, .18, trim);
      b.box(wide, .68, depth, 0, -y + .34, .26, color);
      b.box(wide * .75, .16, depth * .65, 0, -y + .73, .4, trim);
    }
    b.finish(g, 'leg-armor'); return { g, s, y };
  });
}
function arms(parent, { x = 2, y = 5.4, length = 2.4, width = 1, color = C.red, trim = C.gold, fist = color, bone = false } = {}) {
  return [-1, 1].map(s => {
    const g = node(parent, `arm-${s}`, s * x, y, 0), b = assetBatch();
    b.sphere(width * .6, 0, -.08, 0, C.joint);
    b.box(width * 1.32, .66, width * 1.35, s * .1, .05, 0, trim, 0, 0, s * .13);
    if (bone) {
      b.cylinder(width * .19, length * .64, 0, -length * .41, 0, color);
      b.sphere(width * .3, 0, -length * .7, 0, trim);
    } else {
      b.box(width, length * .7, width * .9, 0, -length * .43, 0, color);
      b.box(width * 1.15, .48, width * 1.08, 0, -length * .74, .08, trim);
    }
    b.box(width * 1.15, .85, width * 1.12, 0, -length + .22, .18, fist);
    b.finish(g, 'arm-armor'); return { g, s, length };
  });
}
function gait(legsRig, t, state, amplitude = .2, speed = 3.1) {
  const moving = state.moving !== false && !state.stunned;
  for (const l of legsRig) {
    const p = moving ? t * speed + (l.s > 0 ? Math.PI : 0) : 0;
    l.g.rotation.x = Math.sin(p) * amplitude;
    l.g.position.y = l.y + (moving ? Math.max(0, Math.cos(p)) * .1 : 0);
  }
}
function react(pose, t, state, atk, bob = .06, floating = false) {
  const hit = Math.min(1, state.hit || 0);
  pose.position.y = floating || (state.moving !== false && !state.stunned) ? Math.sin(t * 2.2) * bob : 0;
  pose.rotation.z = Math.sin(t * 18) * hit * .045;
  pose.rotation.x = -atk * .05 + hit * .04;
}

function king() {
  const group = new THREE.Group(), pose = node(group, 'royal-rig');
  const feet = legs(pose, { y: 2.5, color: C.ink, trim: C.gold, wide: 1.35 });
  const body = node(pose, 'torso', 0, 2.4);
  const b = assetBatch();
  b.box(3.25, 2.7, 2.1, 0, 1.5, 0, C.red);
  b.box(3.45, .4, 2.25, 0, .45, 0, C.ink);
  b.box(2.25, 2.15, .25, 0, 1.6, 1.12, 0xe2a858);
  b.box(.25, 1.9, .14, 0, 1.6, 1.32, C.ivory);
  for (const s of [-1, 1]) b.box(.35, 2.5, .2, s * 1.22, 1.6, 1.2, C.gold, 0, 0, -s * .13);
  b.ring(.48, .13, 0, 1.75, 1.4, C.gold, 'z').sphere(.24, 0, 1.75, 1.42, 0x6ff2c9);
  b.finish(body, 'royal-breastplate');
  const hands = arms(pose, { x: 2, y: 5.1, length: 2.4, width: .95, color: C.red, trim: C.gold, fist: C.ink });
  const head = node(pose, 'head', 0, 6.65, .07);
  assetBatch().box(2.05, 1.65, 1.7, 0, 0, 0, C.red)
    .box(1.65, .48, .35, 0, -.55, .9, C.ivory)
    .box(2.4, .35, 1.9, 0, -.9, 0, C.gold).finish(head, 'royal-helmet');
  eyes(head, .12, .89, .5, 0xffedb1);
  crown(head, 1.12, 1.05, C.gold, 5, .85);
  const cape = node(body, 'cape', 0, 2.4, -1.05);
  const capeShape = new THREE.Shape();
  capeShape.moveTo(-1.45, 0); capeShape.lineTo(1.45, 0); capeShape.lineTo(1.95, -4.1);
  capeShape.lineTo(.7, -3.8); capeShape.lineTo(0, -4.2); capeShape.lineTo(-.7, -3.8); capeShape.lineTo(-1.95, -4.1); capeShape.closePath();
  assetBatch().add(new THREE.ExtrudeGeometry(capeShape, { depth: .12, bevelEnabled: false }), 0x712b45).finish(cape, 'royal-cape');
  return { group, radius: 2.8, height: 8.8, animate(t, progress, state = {}) {
    const a = attackPose(progress); gait(feet, t, state, .13); react(pose, t, state, a);
    body.rotation.y = Math.sin(t * .8) * .07;
    hands.forEach(({ g, s }) => { g.rotation.x = -a * 1.25 + Math.sin(t * 2 + s) * .06; g.rotation.z = -s * (.12 + a * .1); });
    head.rotation.y = Math.sin(t * .7) * .12; cape.rotation.x = .12 + Math.sin(t * 2) * .045 + a * .18;
  } };
}

function skeleton(titan = false) {
  const group = new THREE.Group(), pose = node(group, 'bone-rig');
  const bone = titan ? 0xd3d5ef : 0xf4ead0, armor = titan ? 0x493469 : 0x375d84;
  const accent = titan ? 0xe29bff : 0x6fe8fb;
  const feet = legs(pose, { y: 3.4, x: .82, color: bone, trim: armor, wide: 1.25, bone: true });
  const torso = node(pose, 'ribcage', 0, 3.4);
  const b = assetBatch().cylinder(.32, 3.1, 0, 1.4, -.45, bone);
  for (let i = 0; i < 4; i++) {
    const w = 2.5 - i * .23, y = .6 + i * .63;
    b.box(w, .22, .35, 0, y, .7, bone).beam([-w / 2, y, .65], [-w / 2 - .08, y + .1, -.5], .22, .22, bone)
      .beam([w / 2, y, .65], [w / 2 + .08, y + .1, -.5], .22, .22, bone);
  }
  b.box(2.1, .75, 1.3, 0, .1, 0, armor).box(.55, 2.8, .25, 0, 1.5, .89, armor);
  b.box(2.8, .45, 1.35, 0, 3, 0, armor).finish(torso, 'ribcage-bones');
  const hands = arms(pose, { x: 1.9, y: 6.5, length: 3.1, width: .8, color: bone, trim: armor, fist: bone, bone: true });
  const head = node(pose, 'skull', 0, 8.05, .03);
  const skull = assetBatch().box(2.55, 1.7, 1.95, 0, .22, 0, bone)
    .box(1.85, .55, 1.3, 0, -.7, .25, bone)
    .box(.46, .7, .35, 0, -.14, 1.03, C.ink);
  for (const s of [-1, 1]) skull.box(.9, .72, .24, s * .66, .17, 1.03, C.ink);
  for (let i = 0; i < 5; i++) skull.box(.17, .36, .22, -.63 + i * .315, -.78, 1, C.ink);
  skull.box(2.65, .25, 1.95, 0, 1.18, 0, armor).finish(head, 'skull-plates');
  assetBatch().box(.53, .2, .28, -.66, .2, 1.09, accent).box(.53, .2, .28, .66, .2, 1.09, accent).finish(head, 'skull-eyes', assetGlow);
  if (titan) {
    const horns = assetBatch();
    for (const s of [-1, 1]) {
      horns.beam([s * .95, .8, -.2], [s * 1.7, 2.05, -.3], .35, .4, armor);
      horns.beam([s * 1.7, 2.05, -.3], [s * 1.45, 2.65, -.15], .24, .3, bone);
      crystal(horns, s * 2.15, 6.8 - 8.05, .15, 1.6, accent, s * .3, .42);
    }
    horns.finish(head, 'titan-antlers');
  } else crown(head, 1.05, 1.48, armor, 4, .8);
  const rune = node(torso, 'heart-seal', 0, 1.9, 1.03);
  assetBatch().ring(.48, .09, 0, 0, 0, accent, 'z').box(.16, .68, .12, 0, 0, .02, accent).finish(rune, 'heart-rune', assetGlow);
  const halo = titan ? node(pose, 'titan-halo', 0, 7.8, -.7) : null;
  if (halo) assetBatch().ring(2.45, .11, 0, 0, 0, accent, 'z').finish(halo, 'broken-orbit', assetGlow);
  const scale = titan ? 1.25 : 1;
  pose.scale.setScalar(scale);
  return { group, radius: titan ? 3.4 : 2.7, height: titan ? 13.5 : 10.5, animate(t, progress, state = {}) {
    const a = attackPose(progress); gait(feet, t, state, .18); react(pose, t, state, a, .025);
    hands.forEach(({ g, s }) => { g.rotation.x = -a * (s < 0 ? 1.3 : .75); g.rotation.z = -s * (.12 + a * .17); });
    torso.rotation.y = Math.sin(t * .7) * .06; head.rotation.x = a * .12;
    rune.rotation.z = -t * .35; if (halo) { halo.rotation.z = t * .16; halo.rotation.y = Math.sin(t * .8) * .08; }
  } };
}

function golem() {
  const group = new THREE.Group(), pose = node(group, 'glacier-rig');
  const ice = 0x82bcd6, pale = 0xcceafa, deep = 0x385e7a;
  const feet = legs(pose, { y: 2.7, x: 1.08, color: deep, trim: pale, wide: 1.65, depth: 1.8 });
  const body = node(pose, 'glacier-body', 0, 4.5);
  const b = assetBatch();
  b.add(new THREE.IcosahedronGeometry(1, 0).scale(2.05, 2.1, 1.45), ice);
  b.box(2.2, 1.35, .32, 0, -.12, 1.28, deep).box(1.6, .9, .24, 0, -.12, 1.51, pale);
  for (const s of [-1, 1]) {
    b.box(1.6, .85, 1.9, s * 1.5, 1.45, -.1, pale, 0, 0, s * -.18);
    crystal(b, s * 1.6, 2.1, -.4, 1.8, pale, -s * .24, .4);
  }
  b.finish(body, 'glacier-slab');
  const hands = arms(pose, { x: 2.15, y: 5.7, length: 2.9, width: 1.22, color: ice, trim: deep, fist: pale });
  const head = node(pose, 'glacier-head', 0, 7.25);
  assetBatch().box(2.1, 1.9, 1.55, 0, 0, 0, deep).box(2.35, .55, 1.75, 0, .65, -.02, pale)
    .box(1.8, .45, 1.75, 0, -.75, .05, ice).finish(head, 'ice-mask');
  eyes(head, .02, .82, .5, C.cyan);
  const spikes = assetBatch();
  crystal(spikes, -.4, 1.2, -.12, 1.3, pale, -.2, .38); crystal(spikes, .5, 1.05, -.15, 1.1, ice, .24, .33);
  spikes.finish(head, 'ice-crest');
  const heart = assetBatch(); crystal(heart, 0, 4.45, 1.72, .75, 0x9fffff, 0, .34); heart.finish(pose, 'glacier-heart', assetGlow);
  return { group, radius: 3, height: 9.2, animate(t, progress, state = {}) {
    const a = attackPose(progress); gait(feet, t, state, .11, 2.3); react(pose, t, state, a, .025);
    hands.forEach(({ g, s }) => { g.rotation.x = -a * 1.5; g.rotation.z = -s * (.16 + a * .13); });
    body.rotation.z = Math.sin(t * 1.1) * .025; head.rotation.x = a * -.1;
  } };
}

function brute() {
  const group = new THREE.Group(), pose = node(group, 'jungle-rig');
  const green = 0x537a47, skin = 0x9db66b, dark = 0x2d4b38, wood = 0x866b41;
  const feet = legs(pose, { y: 2.3, x: 1.05, color: dark, trim: wood, wide: 1.6, depth: 1.85 });
  const torso = node(pose, 'gorilla-chest', 0, 4.7);
  const b = assetBatch().sphere(1, 0, 0, -.15, green, 2.15, 2.35, 1.5)
    .box(2.3, 2.1, .25, 0, -.15, 1.25, skin).box(3.15, .5, 2.25, 0, -1.75, 0, wood);
  for (const s of [-1, 1]) {
    b.box(1.6, .75, 1.9, s * 1.75, 1.15, 0, wood, 0, 0, -s * .2);
    b.add(new THREE.ConeGeometry(.3, .8, 5), C.ivory, s * 2.06, 1.78, .25, 0, 0, -s * .3);
    b.beam([s * .8, .9, 1.42], [s * 1.35, -.9, 1.46], .2, .16, dark);
  }
  b.finish(torso, 'jungle-hide');
  const hands = arms(pose, { x: 2.25, y: 5.75, length: 3.4, width: 1.25, color: green, trim: wood, fist: dark });
  for (const { g } of hands) {
    const b = assetBatch();
    for (let i = 0; i < 3; i++) b.box(.22, .3, .24, -.43 + i * .43, -3.35, .86, C.ivory);
    b.box(1.55, .85, 1.5, 0, -2.75, .05, wood).finish(g, 'wood-gauntlet');
  }
  const head = node(pose, 'brute-head', 0, 7.6, .18);
  assetBatch().box(2.2, 1.8, 1.65, 0, 0, 0, green).box(1.8, .7, .65, 0, -.45, .88, skin)
    .box(2.4, .3, 1.8, 0, .78, 0, wood).box(.8, .7, 1.2, 0, 1.14, -.25, dark)
    .box(1.4, .2, .12, 0, -.36, 1.25, dark).finish(head, 'brute-mask');
  eyes(head, .12, .88, .52, 0xffcd73, true, .4);
  const teeth = assetBatch();
  for (const s of [-1, 1]) teeth.add(new THREE.ConeGeometry(.2, .65, 5), C.ivory, s * .63, -.16, 1.15);
  teeth.finish(head, 'tusks');
  return { group, radius: 3.2, height: 9.4, animate(t, progress, state = {}) {
    const a = attackPose(progress); gait(feet, t, state, .2, 2.6); react(pose, t, state, a, .06);
    torso.rotation.x = .08 + a * .14;
    hands.forEach(({ g, s }) => { g.rotation.x = -a * 1.6 + (state.moving !== false && !state.stunned ? Math.sin(t * 2.6 + s) * .12 : 0); g.rotation.z = -s * .11; });
    head.rotation.x = -a * .2;
  } };
}

function robot() {
  const group = new THREE.Group(), pose = node(group, 'neon-rig');
  const shell = 0x465c87, armor = 0x879bd0, neon = 0xf78bff;
  const feet = legs(pose, { y: 3, x: 1.05, color: C.ink, trim: shell, wide: 1.6, depth: 2 });
  const body = node(pose, 'reactor-chest', 0, 4.9);
  assetBatch().box(3.15, 2.7, 2.1, 0, 0, 0, shell).box(3.45, .48, 2.25, 0, -.95, 0, C.ink)
    .box(2.6, .4, 2.3, 0, 1.15, .08, armor).ring(.85, .18, 0, .08, 1.13, C.ink, 'z')
    .cylinder(.62, .2, 0, .08, 1.16, C.ink, 'z').finish(body, 'reactor-armor');
  const core = node(body, 'reactor-core', 0, .08, 1.3);
  assetBatch().ring(.55, .1, 0, 0, 0, neon, 'z').box(.18, .65, .08, 0, 0, .04, C.cyan).finish(core, 'reactor', assetGlow);
  const hands = arms(pose, { x: 2.05, y: 5.9, length: 2.7, width: 1.05, color: shell, trim: armor, fist: C.ink });
  const gun = node(hands[1].g, 'arm-cannon', 0, -2.4, .4);
  assetBatch().cylinder(.46, 1.8, 0, 0, .55, C.ink, 'z').ring(.47, .09, 0, 0, 1.48, armor, 'z')
    .cylinder(.3, .08, 0, 0, 1.5, 0x0c1523, 'z').finish(gun, 'cannon');
  const head = node(pose, 'sensor-head', 0, 7.55);
  assetBatch().box(2.1, 1.75, 1.65, 0, 0, 0, armor).box(1.75, .75, .18, 0, .12, .9, C.ink)
    .box(2.35, .4, 1.9, 0, .75, 0, shell).box(1.4, .35, .3, 0, -.75, .89, C.ink)
    .cylinder(.12, 1.15, -.7, 1.42, -.2, C.steel).sphere(.23, -.7, 2.03, -.2, neon).finish(head, 'sensor-helmet');
  assetBatch().box(1.32, .16, .2, 0, .14, .97, neon).finish(head, 'visor', assetGlow);
  const pods = [];
  for (const s of [-1, 1]) {
    const p = node(pose, `missile-pod-${s}`, s * 1.95, 6.55, -.25);
    const b = assetBatch().box(1.15, .95, 1.6, 0, 0, 0, C.ink);
    for (let i = 0; i < 3; i++) b.cylinder(.15, .12, -.34 + i * .34, .04, .85, neon, 'z');
    b.finish(p, 'missile-pack'); pods.push(p);
  }
  return { group, radius: 3, height: 9.8, animate(t, progress, state = {}) {
    const a = attackPose(progress); gait(feet, t, state, .15, 3.6); react(pose, t, state, a, .02);
    core.rotation.z = -t * .65; head.rotation.y = Math.sin(t * .7) * .16;
    hands[0].g.rotation.x = -a * .6; hands[1].g.rotation.x = -.25 - a * 1.15;
    gun.position.z = .4 - a * .2; pods.forEach(p => { p.rotation.x = -a * .16; });
  } };
}

function jelly() {
  const group = new THREE.Group(), pose = node(group, 'candy-rig');
  const body = node(pose, 'jelly-body', 0, 4.05);
  const pink = 0xe676b7, edge = 0xa13d87, cream = 0xffe4db;
  assetBatch().sphere(1, 0, .05, 0, pink, 2.55, 3.4, 2.15)
    .sphere(1, 0, -.7, 1.65, cream, 1.6, 1.45, .48).finish(body, 'jelly-mantle');
  const skirt = node(pose, 'candy-frill', 0, .7);
  const b = assetBatch();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    b.sphere(.75, Math.sin(a) * 1.9, .22, Math.cos(a) * 1.65, i % 2 ? edge : pink, 1, .6, 1);
  }
  b.ring(1.85, .19, 0, .7, 0, cream).finish(skirt, 'scalloped-frill');
  const face = node(body, 'jelly-face', 0, .6, 1.95);
  eyes(face, 0, .08, .64, 0xfff5c6, false, .48);
  assetBatch().box(.8, .2, .15, 0, -.65, .13, edge).sphere(.28, -.95, -.35, .05, edge, 1.3, .6, .4)
    .sphere(.28, .95, -.35, .05, edge, 1.3, .6, .4).finish(face, 'jelly-smile');
  crown(body, 1.12, 3.65, C.gold, 5, .9);
  const hands = [-1, 1].map(s => {
    const g = node(body, `jelly-hand-${s}`, s * 2.45, -.3, .3);
    assetBatch().sphere(.75, 0, -.25, 0, edge, .75, 1.3, .75).ring(.54, .12, 0, .05, 0, cream).finish(g, 'candy-hand');
    return { g, s };
  });
  const sweets = [];
  for (let i = 0; i < 3; i++) {
    const g = node(pose, `orbit-sweet-${i}`);
    assetBatch().add(new THREE.OctahedronGeometry(.32), i === 1 ? 0xb9f6d6 : cream).finish(g, 'sugar-crystal'); sweets.push(g);
  }
  return { group, radius: 2.8, height: 8.8, animate(t, progress, state = {}) {
    const a = attackPose(progress), wave = Math.sin(t * 2.3); react(pose, t, state, a, .07, true);
    body.scale.set(1 + wave * .025 + a * .06, 1 - wave * .025 - a * .06, 1 + wave * .02);
    body.position.y = 4.05 + wave * .08; skirt.rotation.y = Math.sin(t * 1.3) * .1;
    hands.forEach(({ g, s }) => { g.rotation.z = -s * (.25 + a * .65); g.rotation.x = -a * .6; });
    sweets.forEach((g, i) => { const p = t * .7 + i * TAU / 3; g.position.set(Math.cos(p) * 2.7, 6.1 + Math.sin(p * 2) * .3, Math.sin(p) * 1.8); g.rotation.set(p, p * .7, p); });
  } };
}

function moon() {
  const group = new THREE.Group(), pose = node(group, 'lunar-rig');
  const shell = 0xd9e6ec, dark = 0x44566d, blue = 0x649ec5;
  const feet = legs(pose, { y: 2.7, x: 1.08, color: shell, trim: dark, wide: 1.45, depth: 1.9 });
  const torso = node(pose, 'pressure-suit', 0, 4.5);
  const b = assetBatch().box(3.15, 2.7, 2.4, 0, 0, 0, shell)
    .box(1.9, 1.4, .45, 0, -.1, 1.35, dark).box(1.4, .4, .12, 0, .1, 1.62, blue)
    .cylinder(.3, .16, -.4, -.45, 1.63, C.gold, 'z').cylinder(.3, .16, .4, -.45, 1.63, blue, 'z');
  for (const s of [-1, 1]) b.cylinder(.52, 2.6, s * .8, 0, -1.6, dark).ring(.54, .13, s * .8, -.9, -1.6, blue);
  b.finish(torso, 'life-support');
  const hands = arms(pose, { x: 2, y: 5.65, length: 2.45, width: .94, color: shell, trim: dark, fist: dark });
  const head = node(pose, 'lunar-helmet', 0, 7.05);
  assetBatch().sphere(1.23, 0, 0, 0, shell, 1.1, 1, 1).sphere(1, 0, .02, .75, 0x18394e, 1.05, .76, .5)
    .box(2.4, .28, 1.6, 0, -.9, 0, dark).ring(1.17, .13, 0, .02, .49, blue, 'z')
    .box(.85, .14, .06, -.2, .35, 1.26, 0xb8edfa, 0, 0, -.2).finish(head, 'lunar-visor');
  const dish = node(torso, 'radio-dish', .9, 3.5, -.9);
  const dishGeo = new THREE.SphereGeometry(.8, 10, 5, 0, TAU, 0, Math.PI / 2); dishGeo.scale(1, .35, 1);
  assetBatch().cylinder(.1, 1.2, 0, -.45, 0, dark).add(dishGeo, shell, 0, .3, 0, -.45)
    .cylinder(.07, .65, 0, .55, 0, blue).sphere(.12, 0, .92, 0, C.gold).finish(dish, 'antenna');
  const panels = [-1, 1].map(s => {
    const g = node(torso, `solar-panel-${s}`, s * 1.8, 1.5, -1.2);
    const b = assetBatch().box(1.45, 1.2, .15, s * .35, 0, 0, dark);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) b.box(.38, .42, .05, s * .35 - .43 + i * .43, -.25 + j * .5, .1, 0x3e74a0);
    b.finish(g, 'solar-cells'); return { g, s };
  });
  return { group, radius: 3, height: 9.2, animate(t, progress, state = {}) {
    const a = attackPose(progress); gait(feet, t, state, .16, 2); react(pose, t, state, a, .06);
    hands.forEach(({ g, s }) => { g.rotation.x = -a * 1.15; g.rotation.z = -s * .12; });
    head.rotation.y = Math.sin(t * .55) * .18; dish.rotation.y = Math.sin(t * .3) * .5;
    panels.forEach(({ g, s }) => { g.rotation.y = s * (.22 + Math.sin(t * .65) * .1); });
  } };
}

function wing(parent, s, sky) {
  const g = node(parent, `wing-${s}`, s * 1.35, 6.1, -.45), b = assetBatch();
  if (sky) {
    b.beam([0, 0, 0], [s * 2.7, 1.65, -.25], .3, .3, 0xbcd8e9);
    for (let i = 0; i < 5; i++) {
      const shape = new THREE.Shape(), x = s * (.55 + i * .48), y = .45 + i * .25;
      shape.moveTo(x, y); shape.lineTo(x + s * .55, y + .3); shape.lineTo(x + s * 1.05, y - 1.25 + i * .13); shape.lineTo(x + s * .1, y - .8); shape.closePath();
      b.add(new THREE.ExtrudeGeometry(shape, { depth: .13, bevelEnabled: false }), i % 2 ? 0xdcefff : 0x9ac8e0);
    }
  } else {
    const shape = new THREE.Shape();
    const points = [[0, 0], [.7, 1.35], [2.8, 2.35], [2.4, .9], [3, .25], [1.8, .45], [1.3, -.7], [.5, -.15]];
    points.forEach(([x, y], i) => { if (!i) shape.moveTo(s * x, y); else shape.lineTo(s * x, y); }); shape.closePath();
    b.add(new THREE.ExtrudeGeometry(shape, { depth: .13, bevelEnabled: false }), 0x9b3c42);
    b.beam([0, 0, .04], [s * .7, 1.35, .04], .22, .24, 0xe89562)
      .beam([s * .7, 1.35, .04], [s * 2.8, 2.35, .04], .2, .2, 0xe89562)
      .beam([s * .7, 1.35, .04], [s * 2.4, .9, .04], .14, .18, 0xe89562)
      .beam([s * .7, 1.35, .04], [s * 1.3, -.7, .04], .12, .16, 0xe89562);
  }
  b.finish(g, sky ? 'feather-fan' : 'wing-membrane'); return { g, s };
}

function dragon(sky = false) {
  const group = new THREE.Group(), pose = node(group, sky ? 'sky-wyvern' : 'ember-dragon');
  const skin = sky ? 0x719fbf : 0xa74743, belly = sky ? 0xdcefff : 0xeeb077;
  const dark = sky ? 0x315978 : 0x592e3b, horn = sky ? 0xedfaff : 0xffd28a;
  const feet = legs(pose, { y: 2.85, x: 1.05, color: skin, trim: dark, wide: 1.5, depth: 2.05 });
  const body = node(pose, 'dragon-body', 0, 4.55);
  const b = assetBatch().sphere(1, 0, .1, -.3, skin, 1.85, 2.2, 1.48);
  for (let i = 0; i < 4; i++) b.box(2.1 - i * .17, .43, .24, 0, -1.1 + i * .62, 1.1 + (i === 0 ? -.05 : 0), belly);
  for (let i = 0; i < 4; i++) crystal(b, 0, 1.15 - i * .65, -1.45, .9, horn, -.2, .28);
  b.finish(body, 'dragon-scales');
  const hands = arms(pose, { x: 1.8, y: 5.8, length: 2, width: .7, color: skin, trim: dark, fist: skin });
  hands.forEach(({ g }) => {
    const b = assetBatch();
    for (let i = 0; i < 3; i++) b.add(new THREE.ConeGeometry(.12, .4, 5), horn, -.27 + i * .27, -2.18, .53, Math.PI);
    b.finish(g, 'claws');
  });
  const neck = node(pose, 'dragon-neck', 0, 6.5, .05);
  assetBatch().sphere(1, 0, .25, 0, skin, 1.05, 1.25, .95).box(1.3, 1.3, .22, 0, .05, .89, belly).finish(neck, 'neck-scales');
  const head = node(neck, 'dragon-head', 0, 1.5, .4);
  const h = assetBatch().box(2.1, 1.5, 1.9, 0, 0, 0, skin).box(1.75, .8, 1.35, 0, -.27, 1.02, skin)
    .box(1.7, .12, .7, 0, -.67, 1.42, dark);
  for (const s of [-1, 1]) {
    h.add(new THREE.ConeGeometry(.29, 1.5, 6), horn, s * .8, 1.16, -.37, -.24, 0, -s * .25);
    h.box(.34, .16, .14, s * .51, -.08, 1.72, dark);
  }
  if (sky) {
    for (let i = 0; i < 3; i++) crystal(h, 0, 1.1 + i * .2, -.3 - i * .34, 1.35 - i * .2, horn, -.3, .27);
    h.box(2.6, .35, .8, 0, .3, -.7, belly);
  }
  h.finish(head, 'dragon-mask');
  eyes(head, .23, 1.02, .61, sky ? 0x9cfbff : 0xffdf7c, true, .4);
  const jaw = node(head, 'jaw', 0, -.65, .65);
  const j = assetBatch().box(1.65, .34, 1.9, 0, -.17, .27, belly);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) j.add(new THREE.ConeGeometry(.09, .28, 4), horn, s * .65, .07, -.15 + i * .55);
  j.finish(jaw, 'lower-jaw');
  const wings = [-1, 1].map(s => wing(pose, s, sky));
  const tail = node(pose, 'tail-base', 0, 2.8, -1.45);
  assetBatch().beam([0, 0, 0], [0, -.45, -2.4], .65, .7, skin).finish(tail, 'tail');
  const tip = node(tail, 'tail-tip', 0, -.45, -2.4);
  const tb = assetBatch().beam([0, 0, 0], [0, .45, -1.7], .32, .38, skin);
  if (sky) crystal(tb, 0, .43, -1.6, .9, horn, 0, .4);
  else tb.add(new THREE.ConeGeometry(.45, 1.05, 5), horn, 0, .3, -1.5, -Math.PI / 2);
  tb.finish(tip, 'tail-fin');
  return { group, radius: 2.9, height: 10.4, animate(t, progress, state = {}) {
    const a = attackPose(progress); gait(feet, t, state, .16, 2.8); react(pose, t, state, a, sky ? .1 : .05);
    neck.rotation.x = -a * .25; jaw.rotation.x = a * .5;
    wings.forEach(({ g, s }) => { g.rotation.z = s * (.15 + Math.sin(t * (sky ? 2.2 : 1.5)) * .12 + a * .24); g.rotation.y = -s * .12; });
    hands.forEach(({ g, s }) => { g.rotation.x = -.2 - a * .85; g.rotation.z = -s * .17; });
    tail.rotation.y = Math.sin(t * 1.4) * .22; tip.rotation.y = Math.sin(t * 1.4 - .7) * .28;
  } };
}

export function buildCoreBoss(type) {
  switch (type) {
    case 'king': return king();
    case 'skeleton': return skeleton();
    case 'dragon': return dragon();
    case 'golem': return golem();
    case 'brute': return brute();
    case 'robot': return robot();
    case 'jelly': return jelly();
    case 'moon': return moon();
    case 'storm': return dragon(true);
    case 'titan': return skeleton(true);
    default: return null;
  }
}
