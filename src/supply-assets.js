import * as THREE from 'three';
import { assetBatch, assetGlow } from './asset-kit.js';
import { loftGeometry, sweepGeometry } from './boss-shapes.js';
import { lathe, pod } from './vehicle-assets.js';

const BLUE = 0x176ba4, INK = 0x16324a, STEEL = 0x7796a8, BRASS = 0xffad3d;
const CREAM = 0xffeac0, MINT = 0x72ffdf;
const TAU = Math.PI * 2;
function shell(rows) { return loftGeometry(rows, {segments: 16, steps: 8}); }
function hose(points, radius) {
  return sweepGeometry(points, points.map(() => radius), {segments: 5, steps: 12});
}

// The bed is a single casting. Two hinged jaws frame the equipment and
// open as the bay fills, so its state can be read through a crowd.
export function sculptLoadingBay(group, width) {
  const half = width / 2;
  const bed = assetBatch(), lamps = assetBatch();
  bed.add(shell([[.04,half-.16,.49,0,0,.38],[.12,half,.62,0,0,.38],
    [.32,half,.58,0,0,.4],[.49,half-.14,.46,0,-.05,.42]]), INK);
  bed.add(shell([[.4,half-.12,.5,0,-.02,.42],[.62,half-.14,.55,0,-.03,.42],
    [.8,half-.28,.41,0,-.12,.42]]), BLUE);
  bed.add(lathe([[.48,.8],[.54,.84],[.54,.91],[.42,.98],[.38,.99]],20), BRASS,0,0,-.12);
  bed.add(lathe([[.38,.98],[.4,1.02],[.38,1.08],[.03,1.08]],20), STEEL,0,0,-.12);
  lamps.ring(.31,.034,0,1.085,-.12,MINT);
  const jaws = [];
  for (const side of [-1,1]) {
    const x = side*(half-.24);
    bed.add(pod([[-.59,.13,.12,.22],[-.38,.23,.21,.25],[.38,.24,.2,.25],[.66,.14,.12,.2]],10), BRASS,x);
    bed.cylinder(.2,.13,x,.78,.28,STEEL,'z').cylinder(.115,.15,x,.78,.31,BRASS,'z');
    lamps.sphere(.09,x,.38,.6,MINT,1,.65,.5);
    const jaw = new THREE.Group(); jaw.position.set(x,.78,-.08); group.add(jaw);
    const arm = assetBatch();
    arm.add(shell([[0,.13,.22],[.22,.17,.24],[.58,.16,.19],[.87,.13,.16],[1.02,.08,.13]]),BRASS);
    arm.add(hose([[0,.12,.19],[side*.13,.37,.19],[side*.12,.72,.15],[0,.91,.13]],.034),INK);
    arm.add(pod([[-.24,.12,.07,.95],[-.1,.18,.14,1],[.13,.15,.1,1],[.24,.08,.06,.96]],10),CREAM);
    arm.finish(jaw,'loading-jaw'); jaws.push(jaw);
  }
  bed.finish(group,'loading-bed'); lamps.finish(group,'projector-lamps',assetGlow);
  return jaws;
}

// Five pickups used to share either a flat bolt or a pair of box silhouettes.
// Build the actual mechanism as a single colored miniature.
export function drivePayload(up) {
  const group = new THREE.Group(), b = assetBatch();
  if (up === 'rapid') {
    b.cylinder(.22,.32,0,0,0,STEEL,'z').ring(.38,.055,0,0,0,BRASS,'z');
    for (let k=0;k<6;k++) {
      const a=k*TAU/6;
      b.add(pod([[-.09,.07,.04,0],[0,.12,.06,0],[.27,.05,.035,0]],8)
        .rotateX(-1.1).rotateZ(a-.5),CREAM,-Math.sin(a)*.3,Math.cos(a)*.3,0);
    }
  } else if (up === 'power') {
    b.add(lathe([[.12,-.48],[.26,-.36],[.27,-.27],[.16,-.19],[.16,.19],[.27,.27],[.26,.36],[.12,.48]],12),STEEL);
    b.sphere(.24,0,0,0,MINT,.8,1.45,.8);
    for (const y of [-.31,.31]) b.ring(.24,.053,0,y,0,BRASS);
    for (let k=0;k<3;k++) {
      const a=k*TAU/3;
      b.add(hose([[.2,-.26,0],[.29,0,0],[.2,.26,0]],.032).rotateY(a),CREAM);
    }
  } else if (up === 'barrel') {
    for (const side of [-1,1]) {
      b.add(lathe([[.14,-.48],[.18,-.4],[.15,-.25],[.11,.22],[.15,.25],[.15,.45],[.09,.45],[.09,.32]],12),CREAM,side*.19,0,0,-1.12);
      b.ring(.15,.037,side*.19,.11,-.21,BRASS,'z');
    }
    b.box(.62,.19,.28,0,-.09,.18,BLUE);
  } else {
    // Escort projects a triangular formation; Twin projects two side by side.
    const offsets = up === 'squad' ? [[0,-.28],[-.34,.26],[.34,.26]] : [[-.28,0],[.28,0]];
    for (const [x,z] of offsets) {
      b.add(pod([[-.35,.07,.07,.02],[-.15,.19,.13,.07],[.2,.18,.13,.06],[.32,.1,.09,.03]],10),BLUE,x,0,z);
      b.sphere(.13,x,.17,z,CREAM,1,.8,1.1);
      b.cylinder(.052,.32,x,.17,z-.19,BRASS,'z');
    }
  }
  b.finish(group,'equipment-miniature');
  return group;
}

export function sculptSupplyDrop() {
  const group = new THREE.Group(), payload = new THREE.Group(), rigging = new THREE.Group();
  group.add(payload); payload.add(rigging);
  const podBody = assetBatch(), chute = assetBatch(), beacon = assetBatch();
  podBody.add(shell([[0,.32,.23],[.12,.47,.35],[.54,.46,.35],[.66,.35,.26]]),BLUE);
  podBody.add(shell([[.53,.46,.35],[.6,.49,.37],[.72,.39,.3],[.76,.28,.21]]),BRASS);
  for (const side of [-1,1]) {
    podBody.box(.09,.55,.69,side*.27,.31,0,CREAM);
    podBody.box(.15,.09,.81,side*.31,.05,0,INK);
  }
  podBody.box(.36,.12,.035,0,.37,.36,CREAM).box(.12,.35,.04,0,.37,.36,CREAM);
  podBody.finish(payload,'resupply-capsule');
  // Eight sewn gores share a scalloped hem. Bridle lines meet its seam endpoints.
  for (let k=0;k<8;k++) {
    const a=k*TAU/8;
    const panel = new THREE.SphereGeometry(1,6,6,a,TAU/8,0,1.38);
    const p = panel.attributes.position;
    for (let i=0;i<p.count;i++) {
      const y=p.getY(i), bulge=Math.sin(Math.PI*(i%7)/6)*(1-y);
      p.setXYZ(i,p.getX(i)*(1+.08*bulge),y*.58-.1*bulge,p.getZ(i)*(1+.08*bulge));
    }
    panel.computeVertexNormals();
    chute.add(panel,k%2 ? CREAM : 0xff9134,0,1.96,0);
    const x=-Math.cos(a), z=Math.sin(a);
    chute.add(hose([[x*.28,.71,z*.22],[x*.66,1.36,z*.66],[x*.982,2.07,z*.982]],.015),INK);
  }
  chute.finish(rigging,'recovery-chute');
  beacon.ring(1.05,.047,0,.04,0,MINT);
  for (let k=0;k<4;k++) {
    const a=k*Math.PI/2;
    beacon.add(new THREE.ConeGeometry(.13,.32,3).rotateX(Math.PI/2).rotateY(a),CREAM,-Math.sin(a)*1.22,.05,-Math.cos(a)*1.22);
  }
  const marker = beacon.finish(group,'pickup-marker',assetGlow);
  return {group, payload, rigging, marker};
}

// A travelling collar traces the hull while the suspension and barrel cradle unfold.
// Cannon instances borrow the same geometry for their entire lifetime.
let collarGeometry;
export function fittingCollar() {
  if (!collarGeometry) {
    const b = assetBatch();
    for (let k=0;k<8;k++) {
      const angle=k*TAU/8;
      b.add(new THREE.TorusGeometry(1.35,.038,4,12,.58).rotateZ(angle).rotateX(Math.PI/2),MINT);
      b.add(pod([[-.16,.05,.025,0],[-.06,.1,.04,0],[.13,.07,.03,0]],8)
        .rotateY(-angle),BRASS,Math.cos(angle)*1.35,0,Math.sin(angle)*1.35);
    }
    collarGeometry=b.finish(new THREE.Group(),'fitting-collar',assetGlow).geometry;
    collarGeometry.userData.shared=true;
  }
  const collar=new THREE.Mesh(collarGeometry,assetGlow);
  collar.name='fitting-collar'; collar.visible=false;
  return collar;
}
