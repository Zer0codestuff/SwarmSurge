import * as THREE from 'three';
import { sculptIceWall, sculptFence, sculptStatue, sculptSaw, sculptPortal, sculptPortalExit } from './obstacle-assets.js';
import { mergeIndexed } from './geo-merge.js';
import { assetBatch, assetGlow } from './asset-kit.js';
import { THEMES } from './levels.js';
import { LATE_GLOW_ROAD, LATE_POSTS } from './biomes-late.js';
import { buildRoadside } from './road-assets.js';
import { addLavaRivers } from './lava-rivers.js';
import { fortFamily } from './fort-assets.js';
import * as S from './scenery-assets.js';
import { raiderGeometry } from './troop-forms.js';
import { buildSculptedCore } from './boss-sculpted-core.js';
import { buildSculptedRoyal } from './boss-sculpted-royal.js';
import {
  toonGradient, lam, mesh, paint, merge, troopWeaponGeo,
  makeCanvasLabel, drawLabel, textPlane, buildCannon, shineTexture, buildGate, buildSunforge,
} from './title-kit.js';
export {
  toonGradient, lam, mesh, paint, merge, troopWeaponGeo,
  makeCanvasLabel, drawLabel, textPlane, buildCannon, shineTexture, buildGate, buildSunforge,
};
export { buildBattleTower as buildTower, buildBattleTurret as buildTurret, buildBattleSpawner as buildSpawner, buildBattleWall as buildWall, buildBattleCrusher as buildCrusher } from './battlefield-assets.js';

// ---------- units (instanced; instance color multiplies the baked vertex colors) ----------
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

// The dial sits on the outer pylon, leaving the multiplier and the next gate visible.
export function buildRedlineGate(w, mega, side) {
  const gate = buildGate(w, 0x2997aa, mega);
  const dial = new THREE.Group();
  dial.position.set(side * (w / 2 - .22), mega ? 2.95 : 2.45, .09);
  dial.rotation.x = -.30;
  gate.group.add(dial);
  const casing = assetBatch().cylinder(.5, .18, 0, 0, 0, 0x324452, 'z', .48, 20)
    .cylinder(.44, .04, 0, 0, .1, 0x162f3e, 'z', .44, 20)
    .ring(.46, .045, 0, 0, .13, 0xedbb79, 'z');
  for (let i = 0; i <= 10; i++) {
    const a = 1.95 - i * .39;
    casing.box(.054, .12, .034, -.36 * Math.sin(a), .36 * Math.cos(a), .14, i < 3 ? 0x87e6d3 : i < 7 ? 0xffce61 : 0xff624c, 0, 0, a);
  }
  casing.finish(dial, 'pressure-dial').castShadow = false;
  gate.needle = assetBatch().beam([0, -.09, .19], [0, .33, .19], .05, .035, 0xffefbb)
    .cylinder(.072, .04, 0, 0, .21, 0xffb244, 'z').finish(dial, 'pressure-needle', assetGlow);
  gate.needle.rotation.z = 1.95;
  return gate;
}

export function buildLinkGate(w, mega) {
  const gate = buildGate(w, 0x288a98, mega);
  const links = assetBatch();
  links.ring(.23, .062, -.15, .02, 0, 0xd8fff1, 'z')
    .ring(.23, .062, .15, .02, .05, 0x70deb9, 'z')
    .beam([-.34, -.13, 0], [-.45, -.42, 0], .08, .08, 0x62a4ab)
    .beam([.34, -.13, 0], [.45, -.42, 0], .08, .08, 0x62a4ab);
  const badge = links.finish(gate.group, 'gate-link', assetGlow);
  badge.position.y = mega ? 2.92 : 2.42;
  return gate;
}

export function buildIceWall(w) {
  const g = new THREE.Group();
  const iceMat = sculptIceWall(g, w);
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
  sculptFence(g, w, H);
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
  sculptStatue(g, w, small);
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
  const panelMat = new THREE.MeshBasicMaterial({ color: inner, transparent: true, opacity: 0.6, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r - 0.08, 32), panelMat);
  disc.position.y = r + 0.25; g.add(disc);
  const swirl = sculptPortal(g, w, r, color);
  const label = makeCanvasLabel();
  const text = textPlane(label, 3, 1.5, false);
  text.position.set(0, 2 * r + 0.9, 0); text.rotation.x = -0.3; text.renderOrder = 4;
  g.add(text);
  return { group: g, label, text, panelMat, swirl, setColor() {} };
}
// Prism portal: an A-frame of two leaning pylons under a crystal, with a rainbow pane. Each troop
// leaves through every exit pad at once.
export const PRISM_COLORS = [0x65f4ff, 0xff8df0, 0xffbc50];
export function buildPrismPortal(w) {
  const g = new THREE.Group();
  const half = Math.min(w / 2 - 0.15, 2.3), H = Math.min(3.1, half * 1.5 + 0.9);
  const len = Math.hypot(half, H), lean = Math.atan2(half, H);
  const frame = lam(0x3b2a6b), trim = lam(0xf1e9ff);
  const pylon = new THREE.LatheGeometry([[0.001, 0], [0.17, 0], [0.2, 0.07], [0.13, 0.16], [0.1, len - 0.3], [0.15, len - 0.22], [0.15, len - 0.12], [0.07, len - 0.02], [0.001, len]]
    .map(([r, y]) => new THREE.Vector2(r, y)), 10);
  const collar = new THREE.TorusGeometry(0.17, 0.045, 6, 14).rotateX(Math.PI / 2);
  const bead = new THREE.SphereGeometry(0.075, 8, 6);
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.x = s * half; leg.rotation.z = s * lean; g.add(leg);
    leg.add(mesh(pylon, frame), mesh(collar, trim, 0, 0.2, 0, false), mesh(collar, trim, 0, len - 0.36, 0, false));
    PRISM_COLORS.forEach((color, k) => leg.add(new THREE.Mesh(bead, new THREE.MeshBasicMaterial({ color })).translateY(len * (0.3 + k * 0.17)).translateZ(0.1)));
  }
  const pane = new THREE.BufferGeometry();
  pane.setAttribute('position', new THREE.Float32BufferAttribute([-half + 0.14, 0.1, 0, half - 0.14, 0.1, 0, 0, H - 0.2, 0], 3));
  pane.setAttribute('color', new THREE.Float32BufferAttribute(PRISM_COLORS.flatMap((c) => new THREE.Color(c).toArray()), 3));
  const panelMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false });
  g.add(new THREE.Mesh(pane, panelMat));
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0).scale(1, 1.5, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  gem.position.y = H + 0.28; g.add(gem);
  const swirl = new THREE.Group(); swirl.position.y = H + 0.28; g.add(swirl);
  PRISM_COLORS.forEach((color, k) => {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0).scale(1, 1.8, 1), new THREE.MeshBasicMaterial({ color }));
    shard.position.set(Math.cos(k * 2.094) * 0.56, 0, Math.sin(k * 2.094) * 0.56); swirl.add(shard);
  });
  g.add(mesh(new THREE.BoxGeometry(half * 2 + 0.5, 0.1, 0.34), frame, 0, 0.05, 0, false));
  const label = makeCanvasLabel();
  const text = textPlane(label, 3.2, 1.6, false);
  text.position.set(0, H + 1.45, 0); text.rotation.x = -0.3; text.renderOrder = 4;
  g.add(text);
  return { group: g, label, text, panelMat, swirl, gem, setColor() {} };
}
// Mirror gate: a silver frame with a low arch and a pale glass pane crossed by two glints.
export function buildMirrorGate(w) {
  const g = new THREE.Group();
  const half = w / 2 - 0.12, H = 2.3;
  const silver = lam(0xcfd8e6), dark = lam(0x51607a);
  const pylon = new THREE.LatheGeometry([[0.001, 0], [0.2, 0], [0.22, 0.08], [0.13, 0.18], [0.11, H - 0.2], [0.16, H - 0.12], [0.16, H], [0.001, H + 0.02]]
    .map(([r, y]) => new THREE.Vector2(r, y)), 10);
  for (const s of [-1, 1]) {
    g.add(mesh(pylon, silver, s * half, 0, 0));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xe6fbff })).translateX(s * half).translateY(H + 0.14));
  }
  const rise = Math.min(0.9, half * 0.4);
  const arch = new THREE.TorusGeometry(half, 0.1, 8, 28, Math.PI).scale(1, rise / half, 1);
  g.add(mesh(arch, silver, 0, H, 0));
  g.add(mesh(new THREE.BoxGeometry(half * 2, 0.1, 0.3), dark, 0, 0.05, 0, false));
  const pane = new THREE.Shape();
  pane.moveTo(-half, 0.1); pane.lineTo(half, 0.1); pane.lineTo(half, H);
  pane.absellipse(0, H, half, rise, 0, Math.PI, false); pane.lineTo(-half, 0.1);
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false });
  g.add(new THREE.Mesh(new THREE.ShapeGeometry(pane, 14), panelMat));
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false });
  for (const [x, wide] of [[-half * 0.35, 0.34], [half * 0.1, 0.14]]) {
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(wide, H * 0.9), glintMat);
    glint.position.set(x, H * 0.52, 0.02); glint.rotation.z = -0.5; g.add(glint);
  }
  const label = makeCanvasLabel();
  const tw = Math.min(w, 3.6);
  const text = textPlane(label, tw, tw / 2, false);
  text.position.set(0, H + rise + 0.95, 0); text.rotation.x = -0.3; text.renderOrder = 4;
  g.add(text);
  return { group: g, label, text, panelMat, setColor() {} };
}
export function buildPortalExit() {
  const g = new THREE.Group();
  const ring = sculptPortalExit(g).finish(g, 'exit-ring', new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ color: 0xc040ff, transparent: true, opacity: 0.4, depthWrite: false }));
  inner.rotation.x = -Math.PI / 2; inner.position.y = 0.035; g.add(inner);
  return { group: g, ring };
}

// ---------- obstacles ----------
export function buildSaw(r) {
  const g = new THREE.Group();
  return { group: g, blade: sculptSaw(g, r) };
}
// ---------- bosses ----------
export function buildBoss(type) {
  const model = buildSculptedRoyal(type) ?? buildSculptedCore(type) ?? buildSculptedCore('robot');
  model.normalizedAttack = true;
  return model;
}
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
  // Large sunlit surfaces need headroom for snow crests, gates and white lettering.
  const groundColor = new THREE.Color(T.ground);
  const luminance = .2126 * groundColor.r + .7152 * groundColor.g + .0722 * groundColor.b;
  if (luminance > .38) groundColor.multiplyScalar((.38 + .28 * (luminance - .38)) / luminance);
  // Extend past the roadside so the last boss sees a fully fogged horizon.
  const ground = mesh(new THREE.PlaneGeometry(800, total + 320), lam(groundColor.getHex()), 0, -0.04, zc, false);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  // Shade the road first so the covered ground pixels fail depth testing.
  ground.renderOrder = 1;
  g.add(ground);
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
  // The road recedes at a grazing angle; anisotropic sampling keeps its print sharp to the horizon.
  roadTexture.anisotropy = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 4 : 8;
  road.material = new THREE.MeshLambertMaterial({ map: roadTexture, color: 0xf6f6f6 });
  const count = Math.ceil(total / 5), matrix = new THREE.Matrix4();
  const markings = new THREE.InstancedMesh(new THREE.PlaneGeometry(.07, 1.1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .17 }), count * 2);
  for (let i = 0; i < count; i++) for (let side = 0; side < 2; side++) {
    matrix.makeRotationX(-Math.PI / 2); matrix.setPosition(side ? 2.2 : -2.2, .015, zc - total / 2 + i * 5);
    markings.setMatrixAt(i * 2 + side, matrix);
  }
  g.add(markings);
  const glowRoad = ['neon', 'void', 'casino', 'crystal', 'blackhole'].includes(theme) || LATE_GLOW_ROAD.has(theme);
  const lineMat = new THREE.MeshBasicMaterial({ color: glowRoad ? T.rail : 0xf4f4f4 });
  const laneLeft = new THREE.PlaneGeometry(0.2, total).rotateX(-Math.PI / 2).translate(-6.7, 0.01, zc);
  const laneRight = new THREE.PlaneGeometry(0.2, total).rotateX(-Math.PI / 2).translate(6.7, 0.01, zc);
  const laneGeo = mergeIndexed([laneLeft, laneRight]); laneLeft.dispose(); laneRight.dispose();
  g.add(new THREE.Mesh(laneGeo, lineMat));
  // rails + posts on both sides
  // Keep the thin lane stripe luminous. The kerb below the fence is painted concrete.
  const kerbColor = glowRoad ? new THREE.Color(T.road).lerp(new THREE.Color(T.rail), .12).getHex() : T.rail;
  const railMat = lam(kerbColor);
  const postColor = LATE_POSTS[theme] ?? (theme === 'mob' ? 0x8a8f99 : theme === 'candy' ? 0xff6ab0 : theme === 'sky' ? 0xe0c070 : 0x8a6a4a);
  g.add(buildRoadside(fortFamily(theme), total, zc, { post: postColor, accent: T.roof, stone: T.tower, light: glowRoad ? T.rail : T.roof }, railMat));

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
    addLavaRivers(g, zc, total);
  } else if (theme === 'frost') {
    scatter(g, S.pine(true), vc(false), 200, 11, 55, zc, total, 0.7, 1.4);
    scatter(g, S.crystalCluster(0x9fe6ff, 2, 0xdfe9f5), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x123a52 }), 120, 9.5, 40, zc, total, 0.4, 0.9, 0, false);
  } else if (theme === 'jungle') {
    scatter(g, S.palm({ trunk: 0x7a5a32, leaf: 0x3fb84a, leaf2: 0x2f9a3a }), vc(false), 170, 11, 55, zc, total, 0.7, 1.3);
    scatter(g, S.bush(), vc(false), 200, 9, 50, zc, total, 0.6, 1.4, 0, false);
  } else if (theme === 'neon') {
    const bld = paint(new THREE.BoxGeometry(3, 1, 3), 0x33314c); bld.translate(0, 0.5, 0);
    const inst = scatter(g, bld, vc(), 120, 12, 45, zc, total, 1, 1, 0, false);
    const win = new THREE.InstancedMesh(new THREE.BoxGeometry(3.05, 0.25, 3.05), new THREE.MeshBasicMaterial({ color: 0xffffff }), 120 * 3);
    const mm = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    const cols = [0xe664b3, 0x6bd6d4, 0x927ed6, 0x57a7c2].map(c => new THREE.Color(c));
    const windowColor = new THREE.Color();
    for (let i = 0; i < 120; i++) {
      inst.getMatrixAt(i, mm); mm.decompose(p, q, s);
      const h = 4 + Math.random() * 18;
      s.set(1, h, 1); mm.compose(p, q, s); inst.setMatrixAt(i, mm);
      for (let k = 0; k < 3; k++) {
        const y = h * (0.3 + k * 0.25);
        mm.compose(new THREE.Vector3(p.x, y, p.z), q, new THREE.Vector3(1, 1, 1));
        win.setMatrixAt(i * 3 + k, mm);
        // Each facade has one sign colour and subdued window bands below it.
        win.setColorAt(i * 3 + k, windowColor.copy(cols[i % cols.length]).multiplyScalar(k === 2 ? .84 : .23));
      }
    }
    g.add(win);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x64afbf });
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
    scatter(g, S.crater(0x656878), vc(false), 120, 10, 55, zc, total, 0.6, 2.4, 0, false);
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
