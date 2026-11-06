import * as THREE from 'three';
import { assetBatch, assetGlow, attackPose } from './asset-kit.js';
import {
  loftGeometry, headGeometry, sweepGeometry, patchGeometry, clothGeometry,
  crownGeometry, fitBoss, bossSkin, bossMetal, bossCloth, bossShell,
} from './boss-shapes.js';

const C = { ink: 0x182336, bone: 0xece2cb, steel: 0x7793ac, ivory: 0xf5ead1, cyan: 0x7ce7f4, gold: 0xe5bb66 };
const TAU = Math.PI * 2;
const LOW = { segments: 20, steps: 16 };
const DETAIL = { segments: 20, rings: 4 };

function node(parent, name, x = 0, y = 0, z = 0) {
  const group = new THREE.Group(); group.name = name; group.position.set(x,y,z); parent.add(group); return group;
}
function rig(name) { const group = new THREE.Group(); group.name = name; return { group, pose: node(group,`${name}-pose`) }; }
function loft(batch, sections, color, options = LOW, x = 0, y = 0, z = 0) {
  return batch.add(loftGeometry(sections,options),color,x,y,z);
}
function path(batch, points, radii, color, options = {}) {
  return batch.add(sweepGeometry(points,radii,{ segments: 8, steps: 14, ...options }),color);
}
function shell(batch, outline, color, x = 0, y = 0, z = 0, depth = .12, bulge = .18, rx = 0, ry = 0, rz = 0) {
  return batch.add(patchGeometry(outline,depth,bulge,DETAIL),color,x,y,z,rx,ry,rz);
}
function pebble(batch, w, h, d, color, x = 0, y = 0, z = 0) {
  return loft(batch,[[-h*.5,.025,.025],[-h*.36,w*.42,d*.4],[0,w*.5,d*.5],[h*.35,w*.38,d*.38],[h*.5,.02,.02]],color,{segments:16,steps:12},x,y,z);
}
function eyePair(parent, { y = .18, z = 1, spacing = .53, width = .48, iris = 0xffdb79, skin = 0x7793ac, sockets = false } = {}) {
  const eyes = assetBatch(), lids = assetBatch(), glow = assetBatch();
  for (const s of [-1,1]) {
    const x=s*spacing;
    const shape=[[-width,-.015],[-width*.48,width*.42],[width*.35,width*.35],[width,.02],[width*.45,-width*.32],[-width*.4,-width*.34]];
    shell(eyes,shape,sockets?C.ink:0xffedce,x,y,z,.08,.08);
    shell(glow,[[-width*.2,-width*.2],[0,width*.24],[width*.2,-width*.2]],iris,x,y,z+.13,.06,.04);
    path(lids,[[x-width,y+.02,z+.03],[x-width*.45,y+width*.46,z+.11],[x+width*.45,y+width*.38,z+.09],[x+width,y+.02,z]],[.09,.12,.095,.04],skin,{steps:10,segments:8});
  }
  eyes.finish(parent,'sculpted-eye-sockets',bossSkin); lids.finish(parent,'sculpted-brow-ridges',bossSkin); glow.finish(parent,'shaped-irises',assetGlow);
}
function walking(t,state,speed=3) { return state.moving===false || state.stunned ? 0 : Math.sin(t*speed); }
function hitPose(pose,t,state) {
  const hit=Math.min(1,state.hit||0); pose.rotation.z=Math.sin(t*29)*hit*.035; pose.position.z=-hit*.1;
}
function leg(parent,s,{x=1,y=2.8,color=C.steel,foot=C.ink,width=.7,bone=false}={}) {
  const g=node(parent,`anatomical-leg-${s}`,s*x,y,0), b=assetBatch();
  if(bone) {
    for(const sign of [-1,1]) path(b,[[sign*.15,0,0],[sign*.2,-y*.32,.1],[sign*.17,-y*.72,-.02],[sign*.12,-y+.42,.08]],[.22,.17,.15,.21],color);
    pebble(b,.7,.62,.7,color,0,-y*.48,.12);
  } else loft(b,[[-y+.2,.3,.38,0,.1],[-y*.72,width*.58,width*.65,0,.05],[-y*.48,width*.72,width*.75,0,.18],[-y*.32,width*.8,width*.7,0,-.03],[-.15,width*.85,width*.8,0,-.12],[.08,width*.42,width*.43]],color);
  loft(b,[[-y+.06,.22,.4,0,.2],[-y+.16,width,.92,0,.35],[-y+.48,width*.94,.87,0,.25],[-y+.68,width*.53,.51,0,.02]],foot,{segments:20,steps:12});
  b.finish(g,bone?'tibia-and-sculpted-foot':'calf-and-contoured-boot',bone?bossSkin:bossShell);
  return { g,s,y };
}
function arm(parent,s,{x=2,y=5.7,length=2.8,width=.75,color=C.steel,hand=color,bone=false,bulky=false}={}) {
  const g=node(parent,`continuous-arm-${s}`,s*x,y,0), b=assetBatch();
  if(bone) {
    path(b,[[0,0,0],[s*.08,-length*.35,.02],[s*.03,-length*.65,.07],[0,-length*.84,.18]],[width*.4,width*.3,width*.22,width*.28],color);
    for(const sign of [-1,1]) path(b,[[sign*.14,-length*.49,.08],[sign*.17,-length*.68,.1],[sign*.12,-length*.9,.15]],[.14,.105,.14],color,{steps:10});
  } else loft(b,[[-length*.87,width*.4,width*.43,0,.22],[-length*.72,width*(bulky?1.05:.78),width*.8,0,.16],[-length*.46,width*.62,width*.64,0,.04],[-length*.25,width*.78,width*.72,s*.06,-.03],[0,width*.98,width*.9,s*.09,0],[.22,width*.5,width*.5]],color);
  loft(b,[[-length-.43,width*.4,width*.37,0,.34],[-length-.27,width*.91,width*.72,0,.3],[-length+.12,width*.94,width*.8,0,.24],[-length+.3,width*.56,width*.49,0,.19]],hand,{segments:20,steps:14});
  for(let k=0;k<3;k++) path(b,[[-width*.55+k*width*.55,-length-.05,width*.73+.25],[-width*.56+k*width*.55,-length-.31,width*.77+.2],[-width*.56+k*width*.55,-length-.4,width*.48+.2]],[width*.18,width*.17,width*.13],hand,{segments:6,steps:6});
  b.finish(g,bone?'sculpted-arm-bones':'continuous-muscle-and-knuckles',bone?bossSkin:bossShell);
  return { g,s,length };
}

function skeleton(titan=false) {
  const {group,pose}=rig(titan?'ossuary-titan':'bone-regent');
  const bone=titan?0xd7d8eb:C.bone, armor=titan?0x4c3b70:0x3e6588, accent=titan?0xe2acff:C.cyan;
  const legs=[-1,1].map(s=>leg(pose,s,{x:.85,y:3.5,color:bone,foot:bone,width:.56,bone:true}));
  const torso=node(pose,'open-rib-cage',0,3.45), b=assetBatch();
  loft(b,[[-.2,.82,.52],[.15,1.2,.7],[.42,1.08,.56],[.66,.5,.38]],bone);
  path(b,[[0,.4,-.46],[0,1.5,-.67],[0,2.8,-.48],[0,3.7,-.2]],[.27,.2,.25,.36],bone,{steps:20});
  for(let k=0;k<5;k++)for(const s of [-1,1]) {
    const y=.8+k*.55,w=1.18+Math.sin(k*.62)*.22;
    path(b,[[0,y+.18,-.53],[s*w*.8,y+.26,-.25],[s*w,y+.06,.43],[s*w*.63,y-.14,.8],[s*.1,y-.08,.89]],[.16,.16,.14,.12,.12],bone,{segments:8,steps:16});
  }
  path(b,[[-1.8,3.3,-.08],[-1,3.65,.1],[0,3.48,.18],[1,3.65,.1],[1.8,3.3,-.08]],[.21,.24,.18,.24,.21],bone,{steps:22});
  b.finish(torso,'continuous-ribs-spine-and-pelvis',bossSkin);
  const arms=[-1,1].map(s=>arm(pose,s,{x:1.9,y:6.7,length:3.15,width:.72,color:bone,hand:bone,bone:true}));
  const head=node(pose,'carved-cranium',0,8.35,.02), h=assetBatch();
  h.add(headGeometry(2.45,2.25,1.9,{snout:.05,brow:.17,cheeks:.19,jaw:.66,skull:true}),bone);
  shell(h,[[-.19,.3],[.15,.28],[.27,-.25],[0,-.42],[-.27,-.25]],C.ink,0,-.14,1.02,.07,.025);
  loft(h,[[-1.08,.42,.32,0,.17],[-.96,.82,.56,0,.2],[-.75,.92,.57,0,.22],[-.61,.64,.38,0,.25]],bone,{segments:24,steps:10});
  for(let k=0;k<6;k++) loft(h,[[-.96,.045,.06],[-.87,.085,.1],[-.62,.085,.09],[-.56,.045,.06]],bone,{segments:8,steps:5},-.66+k*.265,0,.83);
  h.finish(head,'sculpted-skull-and-mandible',bossSkin);
  eyePair(head,{y:.24,z:.96,spacing:.59,width:.49,iris:accent,skin:bone,sockets:true});
  const armorBatch=assetBatch();
  for(const s of [-1,1]) shell(armorBatch,[[-.82,.14],[-.65,.68],[.15,.86],[.86,.37],[.73,-.39],[-.31,-.5]],armor,s*1.78,6.62,-.02,.28,.34,0,-s*.28,s*.12);
  armorBatch.finish(pose,'forged-shoulder-shells',bossMetal);
  const regalia=assetBatch();
  if(titan)for(const s of [-1,1]) path(regalia,[[s*.85,.85,-.15],[s*1.36,1.7,-.25],[s*1.15,2.43,-.14],[s*.82,2.64,.1]],[.27,.23,.13,.015],armor,{segments:10,steps:18});
  else regalia.add(crownGeometry(1.03,.77,5),armor,0,1.01,0);
  regalia.finish(head,'forged-bone-regalia',bossMetal);
  const seal=node(torso,'sternum-seal',0,1.9,.91), sealBatch=assetBatch();
  shell(sealBatch,[[-.29,0],[0,.5],[.29,0],[0,-.5]],accent,0,0,0,.08,.08);sealBatch.finish(seal,'sternum-soul',assetGlow);
  const cloak=node(torso,'torn-shroud',0,3.28,-.73);
  assetBatch().add(clothGeometry(2.3,4.6,{folds:5,flare:.25,depth:.16,segments:18,steps:16}),armor).finish(cloak,'folded-shroud',bossCloth);
  return fitBoss(group,pose,titan?3.4:2.7,titan?13.5:10.5,(t,p,state={})=>{
    const a=attackPose(p),walk=walking(t,state,2.8);hitPose(pose,t,state);
    legs.forEach(l=>{l.g.rotation.x=l.s*walk*.18;l.g.position.y=l.y+Math.max(0,l.s*walk)*.07;});
    arms.forEach(({g,s})=>{g.rotation.x=-a*(s<0?1.3:.78)-s*walk*.09;g.rotation.z=-s*(.1+a*.09);});
    head.rotation.y=Math.sin(t*.65)*.09;head.rotation.x=a*.12;torso.rotation.y=Math.sin(t*.5)*.035;
    cloak.rotation.x=.12+Math.sin(t*1.5)*.05+a*.12;seal.rotation.z=-t*.25;
  });
}

function golem() {
  const {group,pose}=rig('carved-glacier');
  const ice=0x83bfd8,pale=0xcbe8ef,dark=0x36627d;
  const legs=[-1,1].map(s=>leg(pose,s,{x:1.08,y:2.65,width:.8,color:ice,foot:dark}));
  const body=node(pose,'ice-torso',0,3.1), b=assetBatch();
  loft(b,[[0,1.12,.9],[.5,1.5,1.12],[1.4,1.9,1.37],[2.8,2.13,1.25],[3.55,1.67,1],[3.9,1.02,.75]],ice,{segments:28,steps:26,warp(x,y,z,u,v,a){const r=1+.045*Math.sin(a*5+v*10)+.022*Math.cos(a*11-v*7);return[x*r,y,z*r];}});
  for(const s of [-1,1]) {
    shell(b,[[-.95,.05],[-.72,.67],[.24,.92],[1.08,.27],[.66,-.48],[-.37,-.64]],pale,s*1.5,2.75,.28,.28,.43,0,-s*.36,-s*.12);
    path(b,[[s*1.32,3.32,-.4],[s*1.59,4.17,-.63],[s*1.27,4.9,-.48]],[.37,.27,.015],pale,{segments:7,steps:10});
  }
  b.finish(body,'wind-carved-ice-mass',bossShell);
  const arms=[-1,1].map(s=>arm(pose,s,{x:2.07,y:5.7,length:2.75,width:.91,color:ice,hand:pale,bulky:true}));
  const head=node(pose,'glacier-visage',0,7.3,.12), h=assetBatch();
  h.add(headGeometry(2.18,2.04,1.63,{snout:.09,brow:.24,cheeks:.17,jaw:.88}),ice);
  path(h,[[-1.03,.6,.52],[-.57,.88,.94],[0,.66,1.02],[.59,.84,.94],[1.05,.57,.53]],[.18,.23,.19,.23,.18],pale,{steps:18,segments:8});
  for(const s of [-1,1])path(h,[[s*.44,.78,-.18],[s*.61,1.39,-.28],[s*.39,1.84,-.12]],[.27,.19,.015],pale,{segments:6,steps:9});
  h.finish(head,'sculpted-ice-face',bossShell);eyePair(head,{y:.16,z:.85,spacing:.5,width:.43,iris:C.cyan,skin:dark,sockets:true});
  const cracks=assetBatch();
  for(const s of [-1,1]) {
    path(cracks,[[s*.09,5.88,1.15],[s*.65,5.46,1.32],[s*.34,4.78,1.45],[s*.8,4.12,1.32]],[.035,.045,.034,.02],C.cyan,{segments:5,steps:14});
    path(cracks,[[s*.38,5.48,1.38],[s*1.1,5.66,1.17],[s*1.48,5.4,.92]],[.028,.033,.018],C.cyan,{segments:5,steps:9});
  }
  shell(cracks,[[-.25,0],[0,.48],[.25,0],[0,-.46]],0xbcffff,0,4.85,1.57,.12,.14);cracks.finish(pose,'subsurface-ice-fissures',assetGlow);
  return fitBoss(group,pose,3,9.2,(t,p,state={})=>{const a=attackPose(p),walk=walking(t,state,2.2);hitPose(pose,t,state);
    legs.forEach(l=>{l.g.rotation.x=l.s*walk*.1;l.g.position.y=l.y+Math.max(0,l.s*walk)*.05;});
    arms.forEach(({g,s})=>{g.rotation.x=-a*1.48-s*walk*.07;g.rotation.z=-s*(.08+a*.08);});head.rotation.x=-a*.1;body.rotation.z=Math.sin(t*.8)*.018;
  });
}

function brute() {
  const {group,pose}=rig('verdant-gorilla');
  const skin=0x668b4f,muzzle=0xa1b779,dark=0x304d38,wood=0x826a46;
  const legs=[-1,1].map(s=>leg(pose,s,{x:1,y:2.35,color:skin,foot:dark,width:.8}));
  const torso=node(pose,'gorilla-anatomy',0,2.9), b=assetBatch();
  loft(b,[[0,1.12,.94,0,.08],[.62,1.42,1.14,0,.03],[1.55,1.68,1.33,0,-.09],[2.6,2.12,1.45,0,-.28],[3.45,1.92,1.32,0,-.38],[3.88,.95,.9,0,-.29]],skin,{segments:32,steps:28,warp(x,y,z,u,v,a){const front=Math.max(0,Math.cos(a))**4;return[x,y,z+front*(.17*Math.exp(-(((y-2.7)/.55)**2))*Math.cos(x*1.9)-.08*Math.exp(-(((y-1.5)/.32)**2)))];}});
  shell(b,[[-1.15,.65],[-.45,1],[0,.85],[.45,1],[1.15,.65],[.93,-.8],[0,-1.05],[-.93,-.8]],muzzle,0,1.98,1.13,.08,.29);
  b.finish(torso,'sculpted-pectorals-and-hunched-back',bossSkin);
  const arms=[-1,1].map(s=>arm(pose,s,{x:2.05,y:5.85,length:3.55,width:1.03,color:skin,hand:dark,bulky:true}));
  const bracelets=assetBatch();
  for(const {g}of arms) {
    const band=assetBatch();loft(band,[[-3.15,.81,.83,0,.2],[-2.96,1.01,.99,0,.17],[-2.45,1.03,.97,0,.14],[-2.3,.84,.81,0,.12]],wood,{segments:18,steps:12});
    for(let k=0;k<3;k++)path(band,[[-.7+k*.7,-2.54,.91],[-.7+k*.7,-2.3,1.11],[-.7+k*.7,-2.13,1.02]],[.1,.12,.02],C.ivory,{segments:6,steps:7});
    band.finish(g,'carved-bark-wrist-guard',bossShell);
  }
  const head=node(pose,'gorilla-visage',0,7.5,.21), h=assetBatch();
  h.add(headGeometry(2.45,2.45,1.95,{snout:.29,brow:.24,cheeks:.2,jaw:.92}),skin);
  shell(h,[[-.92,.2],[-.61,.54],[0,.57],[.61,.54],[.92,.2],[.7,-.45],[0,-.64],[-.7,-.45]],muzzle,0,-.45,1.17,.12,.3);
  shell(h,[[-.59,.08],[0,.18],[.59,.08],[.42,-.13],[0,-.19],[-.42,-.13]],dark,0,-.51,1.55,.06,.015);
  for(const s of [-1,1])path(h,[[s*.67,-.7,1.4],[s*.85,-.23,1.59],[s*.75,.17,1.55],[s*.56,.29,1.38]],[.16,.14,.08,.012],C.ivory,{segments:9,steps:14});
  for(let k=-2;k<=2;k++)path(h,[[k*.21,.74,-.31],[k*.23,1.39,-.17],[k*.21,1.56,.05]],[.19,.12,.012],dark,{segments:6,steps:7});
  h.finish(head,'organic-brow-muzzle-and-tusks',bossSkin);eyePair(head,{y:.28,z:1.1,spacing:.59,width:.4,iris:0xffcf77,skin:dark});
  for(const s of [-1,1]) shell(bracelets,[[-.8,.2],[-.45,.65],[.25,.7],[.89,.14],[.64,-.45],[-.57,-.49]],wood,s*1.79,6.25,-.2,.18,.26,0,-s*.3,-s*.25);
  bracelets.finish(pose,'shoulder-bark',bossShell);
  return fitBoss(group,pose,3.2,9.4,(t,p,state={})=>{const a=attackPose(p),walk=walking(t,state,2.5);hitPose(pose,t,state);
    torso.rotation.x=.1+a*.12;head.rotation.x=-a*.17;head.rotation.y=Math.sin(t*.52)*.07;
    legs.forEach(l=>{l.g.rotation.x=l.s*walk*.17;l.g.position.y=l.y+Math.max(0,l.s*walk)*.06;});
    arms.forEach(({g,s})=>{g.rotation.x=-a*1.52-s*walk*.14;g.rotation.z=-s*.1;});
  });
}

function jelly() {
  const {group,pose}=rig('rippled-candy-sovereign');
  const pink=0xe987bf,dark=0x9e4589,cream=0xffe6d7;
  const body=node(pose,'liquid-mantle',0,1.15), b=assetBatch();
  loft(b,[[0,1.8,1.5],[.4,2.45,1.96],[1.12,2.57,2.06],[2.45,2.32,1.91],[3.85,1.83,1.55],[5.08,1.2,1.04],[5.7,.28,.28],[5.79,.02,.02]],pink,{segments:40,steps:32,warp(x,y,z,u,v,a){const scallop=1+.035*Math.cos(a*7)*(1-v);return[x*scallop,y+.15*Math.cos(a*7)*(1-v)**5,z*scallop];}});
  shell(b,[[-1.13,.7],[-.77,1.12],[.05,1.14],[.9,.66],[1.12,-.15],[.48,-.92],[-.48,-1.02],[-1.08,-.35]],cream,0,1.97,1.93,.08,.27);
  b.finish(body,'continuous-scalloped-jelly',bossShell);
  const frill=node(pose,'liquid-frill',0,.22), f=assetBatch();
  loft(f,[[0,1.87,1.51],[.22,2.45,1.96],[.52,2.51,2.03],[.9,1.93,1.59]],dark,{segments:42,steps:12,warp(x,y,z,u,v,a){const wave=1+.1*Math.cos(a*7);return[x*wave,y+.13*Math.cos(a*7),z*wave];}});
  f.finish(frill,'flowing-seven-lobed-skirt',bossShell);
  const face=node(body,'candy-face',0,3.18,1.61);eyePair(face,{y:.1,z:.13,spacing:.63,width:.44,iris:0xfff4b8,skin:dark});
  const smile=assetBatch();path(smile,[[-.58,-.45,.42],[-.26,-.64,.53],[.13,-.66,.54],[.52,-.42,.4]],[.055,.06,.055,.025],dark,{segments:7,steps:14});
  for(const s of [-1,1])shell(smile,[[-.24,0],[0,.13],[.24,0],[0,-.13]],0xd363a5,s*.96,-.27,.22,.04,.035);
  smile.finish(face,'curved-candy-smile',bossSkin);
  const crown=node(body,'floating-confection-crown',0,5.95), c=assetBatch();c.add(crownGeometry(1.02,.96,6),C.gold);c.finish(crown,'continuous-crown',bossMetal);
  const arms=[-1,1].map(s=>{const g=node(body,`jelly-flipper-${s}`,s*2.13,1.9,.15),a=assetBatch();
    path(a,[[0,0,0],[s*.58,-.26,.1],[s*.67,-1.01,.17],[s*.28,-1.45,.3]],[.53,.58,.39,.08],dark,{segments:14,steps:18,flatten:.8});a.finish(g,'soft-curled-flipper',bossShell);return{g,s};});
  return fitBoss(group,pose,2.8,8.8,(t,p,state={})=>{const a=attackPose(p),wave=Math.sin(t*2.2);hitPose(pose,t,state);
    body.scale.set(1+wave*.021+a*.065,1-wave*.02-a*.055,1+wave*.02);body.position.y=1.15+wave*.06;frill.rotation.y=Math.sin(t*.9)*.08;
    arms.forEach(({g,s})=>{g.rotation.z=-s*(a*.58+.06*Math.sin(t*1.6));g.rotation.x=-a*.4;});crown.rotation.y=Math.sin(t*.7)*.1;
  });
}

function robot() {
  const {group,pose}=rig('cast-neon-sentinel');
  const steel=0x7d97be,dark=0x34476a,trim=0xabbcd2,neon=0xeea3ff;
  const legs=[-1,1].map(s=>leg(pose,s,{x:1.04,y:2.9,width:.75,color:dark,foot:trim}));
  const torso=node(pose,'cast-reactor-housing',0,3.3), b=assetBatch();
  loft(b,[[0,1.13,.87],[.5,1.48,1.06],[1.4,1.76,1.2],[2.5,1.9,1.03],[3.1,1.46,.9],[3.35,.74,.61]],steel,{segments:32,steps:24});
  for(const s of [-1,1])shell(b,[[-.55,.71],[.4,.8],[.69,.34],[.42,-.77],[-.6,-.55]],dark,s*1.07,1.3,1.08,.14,.22,0,-s*.3,-s*.13);
  b.ring(.91,.16,0,1.56,1.19,C.ink,'z').ring(.72,.09,0,1.56,1.28,trim,'z');b.finish(torso,'forged-reactor-shell',bossMetal);
  const core=node(torso,'neon-reactor',0,1.56,1.4), glow=assetBatch();
  for(let i=0;i<3;i++) {const a=i*TAU/3;path(glow,[[Math.sin(a)*.48,Math.cos(a)*.48,0],[Math.sin(a+.5)*.3,Math.cos(a+.5)*.3,.05],[0,0,.14]],[.08,.085,.12],neon,{segments:7,steps:9});}
  glow.finish(core,'three-lobed-reactor',assetGlow);
  const arms=[-1,1].map(s=>arm(pose,s,{x:2.0,y:5.9,length:2.7,width:.8,color:steel,hand:dark}));
  const armor=assetBatch();
  for(const s of [-1,1])shell(armor,[[-.9,.1],[-.45,.72],[.44,.76],[.98,.07],[.54,-.56],[-.56,-.5]],dark,s*1.9,6.11,-.12,.28,.46,0,-s*.25,-s*.1);
  armor.finish(pose,'cast-shoulder-cowlings',bossMetal);
  const head=node(pose,'tapered-sensor-helm',0,7.6,.02), h=assetBatch();
  h.add(headGeometry(2.15,1.95,1.86,{snout:.05,brow:.07,cheeks:.07,jaw:.67}),trim);
  shell(h,[[-.91,.25],[-.6,.55],[.53,.54],[.94,.18],[.61,-.24],[-.62,-.26]],C.ink,0,.12,.94,.12,.18);
  path(h,[[-.73,.81,-.18],[-.83,1.44,-.27],[-.56,1.83,-.15]],[.1,.08,.035],dark,{segments:7,steps:12});
  h.finish(head,'flow-formed-sensor-head',bossMetal);
  const visor=assetBatch();path(visor,[[-.7,.24,1.15],[-.34,.31,1.22],[.25,.3,1.22],[.68,.22,1.14]],[.065,.075,.075,.045],neon,{segments:7,steps:14});visor.finish(head,'curved-sensor-slit',assetGlow);
  const gun=node(arms[1].g,'sculpted-arm-caster',0,-2.22,.34), g=assetBatch();
  loft(g,[[-.62,.26,.22],[-.5,.47,.4],[.32,.49,.44],[.65,.32,.29]],dark,{segments:20,steps:14},0,0,.65);
  g.ring(.4,.1,0,.03,1.37,trim,'z').cylinder(.29,.07,0,.03,1.37,C.ink,'z');g.finish(gun,'cast-cannon-shroud',bossMetal);
  return fitBoss(group,pose,3,9.8,(t,p,state={})=>{const a=attackPose(p),walk=walking(t,state,3.1);hitPose(pose,t,state);
    legs.forEach(l=>{l.g.rotation.x=l.s*walk*.15;l.g.position.y=l.y+Math.max(0,l.s*walk)*.06;});arms.forEach(({g,s})=>{g.rotation.x=-a*(s>0?1.1:.55)-s*walk*.07;});
    head.rotation.y=Math.sin(t*.65)*.14;core.rotation.z=-t*.5;gun.position.z=.34-a*.16;
  });
}

function moon() {
  const {group,pose}=rig('padded-lunar-explorer');
  const suit=0xd1e1e5,trim=0x5c7f9c,dark=0x29425d,blue=0x598bb1;
  const legs=[-1,1].map(s=>leg(pose,s,{x:1,y:2.7,color:suit,foot:trim,width:.75}));
  const torso=node(pose,'pressure-suit',0,3.0),b=assetBatch();
  loft(b,[[0,1.07,.93],[.4,1.46,1.11],[1.5,1.69,1.32],[2.5,1.68,1.12],[3.2,1.27,.86],[3.45,.86,.68]],suit,{segments:30,steps:24});
  shell(b,[[-.82,.59],[-.45,.8],[.58,.72],[.9,.32],[.66,-.62],[-.64,-.64]],trim,0,1.48,1.24,.12,.18);
  for(const s of [-1,1]) {
    path(b,[[s*.8,.64,-.85],[s*1.07,1.66,-1.03],[s*.86,2.61,-.85]],[.38,.44,.3],dark,{segments:12,steps:16});
    path(b,[[s*.68,1.02,1.3],[s*1.13,1.03,1.11],[s*1.32,1.5,.94]],[.09,.09,.08],blue,{segments:7,steps:14,flutes:.12});
  }
  b.cylinder(.24,.1,-.35,1.35,1.51,C.gold,'z').cylinder(.24,.1,.35,1.35,1.51,blue,'z');b.finish(torso,'tailored-pressure-shell-and-life-support',bossShell);
  const arms=[-1,1].map(s=>arm(pose,s,{x:1.95,y:5.5,length:2.45,width:.75,color:suit,hand:trim}));
  for(const {g}of arms) {
    const seams=assetBatch();for(let k=0;k<4;k++)seams.ring(.65-k*.026,.055,0,-.85-k*.25,.03,trim);seams.finish(g,'suit-flexion-seams',bossCloth);
  }
  const head=node(pose,'helmet-assembly',0,7.13,.03),h=assetBatch();
  loft(h,[[-1.13,.76,.72],[-.72,1.1,.98],[.03,1.3,1.15],[.78,1.07,.98],[1.2,.55,.53],[1.32,.02,.02]],suit,{segments:36,steps:24});
  shell(h,[[-1,.13],[-.72,.73],[.02,.98],[.76,.66],[1.05,.08],[.81,-.62],[0,-.89],[-.82,-.59]],dark,0,.03,.91,.16,.33);
  path(h,[[-.9,.69,.98],[-.37,1.02,1.13],[.28,.98,1.16],[.77,.67,1.06]],[.07,.075,.07,.04],0xa6d8e8,{segments:6,steps:16});
  h.finish(head,'continuous-helmet-and-curved-visor',bossShell);
  const antenna=node(torso,'radio-mast',.9,3.27,-.6),a=assetBatch();
  path(a,[[0,0,0],[.05,.8,-.1],[.4,1.3,-.13]],[.07,.06,.04],trim,{segments:7,steps:14});
  shell(a,[[-.52,0],[-.32,.43],[.18,.48],[.55,.05],[.2,-.4],[-.28,-.42]],suit,.42,1.36,-.13,.08,.22,-.4,0,.2);a.finish(antenna,'formed-radio-dish',bossMetal);
  const panels=[-1,1].map(s=>{const g=node(torso,`solar-wing-${s}`,s*1.4,2.4,-.95),p=assetBatch();
    shell(p,[[-.1,-.62],[s*.84,-.74],[s*1.14,.42],[s*.16,.64]],dark,0,0,0,.1,.06);
    for(let k=0;k<3;k++)shell(p,[[-.13,-.48],[.13,-.48],[.13,.46],[-.13,.46]],blue,s*(.25+k*.29),-.03,.1,.03,.025);
    p.finish(g,'curved-solar-cells',bossMetal);return{g,s};});
  return fitBoss(group,pose,3,9.2,(t,p,state={})=>{const a=attackPose(p),walk=walking(t,state,2);hitPose(pose,t,state);
    legs.forEach(l=>{l.g.rotation.x=l.s*walk*.14;l.g.position.y=l.y+Math.max(0,l.s*walk)*.06;});arms.forEach(({g,s})=>{g.rotation.x=-a*1.08-s*walk*.06;g.rotation.z=-s*.08;});
    head.rotation.y=Math.sin(t*.52)*.14;antenna.rotation.y=Math.sin(t*.34)*.35;panels.forEach(({g,s})=>{g.rotation.y=s*(.2+Math.sin(t*.54)*.09);});
  });
}

function dragonWing(parent,s,sky) {
  const g=node(parent,`curved-wing-${s}`,s*1.2,5.65,-.61),b=assetBatch(),membrane=assetBatch();
  const outline=sky?[[0,0],[s*.86,1.55],[s*3.5,2.48],[s*3.05,1.15],[s*2.51,.26],[s*1.78,-.56],[s*.74,-.7]]:
    [[0,0],[s*.74,1.68],[s*3.27,2.54],[s*2.82,1.02],[s*3.15,.18],[s*2.02,.41],[s*1.47,-.76],[s*.62,-.16]];
  shell(membrane,outline,sky?0xa8cede:0x95434a,0,0,0,.065,.18);
  membrane.finish(g,sky?'curved-feather-web':'swept-bat-membrane',bossCloth);
  path(b,[[0,0,.04],[s*.77,1.57,.12],[s*2.08,2.24,.06],[s*3.26,2.52,0]],[.23,.19,.11,.025],sky?0xe1f1ed:0xd8a36e,{segments:8,steps:20});
  if(sky)for(let k=0;k<5;k++) {
    const x=s*(.68+k*.44), y=.54+k*.25;
    shell(b,[[0,0],[s*.37,.11],[s*.64,-.81],[s*.15,-1.17],[-s*.11,-.43]],k%2?0xd4e8ed:0x8eb6ce,x,y,.11,.08,.12,0,0,-s*.08);
  } else for(const end of [[2.83,1.03],[3.12,.2],[1.48,-.72]])path(b,[[s*.76,1.56,.12],[s*1.36,.84,.19],[s*end[0],end[1],.04]],[.13,.085,.018],0xd8a36e,{segments:7,steps:14});
  b.finish(g,sky?'layered-swept-feathers':'curved-wing-fingers',bossShell);return{g,s};
}
function dragon(sky=false) {
  const {group,pose}=rig(sky?'cloud-feather-wyvern':'ember-drake');
  const skin=sky?0x719eb8:0x9f4c45,belly=sky?0xe1eeee:0xe2ad78,horn=sky?0xeaf4e8:0xf0c581,dark=sky?0x335973:0x57303a;
  const legs=[-1,1].map(s=>leg(pose,s,{x:1.05,y:2.45,width:.77,color:skin,foot:dark}));
  const torso=node(pose,'drake-body',0,2.7),b=assetBatch();
  loft(b,[[0,.98,.83,0,-.1],[.5,1.43,1.13,0,-.17],[1.55,1.77,1.42,0,-.34],[2.65,1.78,1.34,0,-.5],[3.6,1.19,.91,0,-.39],[4.2,.72,.66,0,-.16]],skin,{segments:32,steps:26});
  shell(b,[[-.87,1.22],[-.49,1.65],[.32,1.58],[.91,.97],[.82,-1.3],[0,-1.7],[-.82,-1.2]],belly,0,1.7,1.04,.08,.28);
  for(let k=0;k<5;k++)path(b,[[-.74,1+k*.47,1.18],[0,.91+k*.47,1.36],[.74,1+k*.47,1.18]],[.045,.05,.045],dark,{segments:6,steps:11});
  b.finish(torso,'continuous-scaled-drake-torso',bossSkin);
  const arms=[-1,1].map(s=>arm(pose,s,{x:1.7,y:5.45,length:1.95,width:.53,color:skin,hand:skin}));
  for(const {g}of arms){const claws=assetBatch();for(let k=0;k<3;k++)path(claws,[[-.39+k*.39,-2.07,.69],[-.39+k*.39,-2.35,.78],[-.39+k*.39,-2.53,.58]],[.105,.075,.008],horn,{segments:6,steps:8});claws.finish(g,'swept-claws',bossShell);}
  const neck=node(pose,'serpentine-neck',0,5.58,-.07),n=assetBatch();
  path(n,[[0,-.48,-.18],[0,.6,-.22],[0,1.58,.15],[0,2.24,.65]],[.84,.74,.7,.76],skin,{segments:24,steps:26,flatten:.88});
  n.finish(neck,'flowing-dragon-neck',bossSkin);
  const head=node(neck,'dragon-visage',0,2.13,.64),h=assetBatch();
  h.add(headGeometry(2.12,1.84,2.05,{snout:.4,brow:.25,cheeks:.13,jaw:.82}),skin);
  shell(h,[[-.78,.28],[-.34,.52],[.53,.47],[.84,.17],[.65,-.32],[-.59,-.37]],skin,0,-.3,1.23,.22,.32);
  for(const s of [-1,1]) {
    path(h,[[s*.75,.55,-.42],[s*1.01,1.16,-.66],[s*.9,1.77,-.86],[s*.58,1.98,-.82]],[.27,.22,.12,.009],horn,{segments:10,steps:18});
    shell(h,[[-.1,0],[.09,.11],[.18,.02],[.04,-.08]],dark,s*.48,-.17,1.61,.05,.01,0,0,s*.1);
  }
  h.finish(head,'sculpted-snout-horns-and-nostrils',bossSkin);
  eyePair(head,{y:.27,z:1.01,spacing:.62,width:.4,iris:sky?0x9af3f4:0xffd778,skin:dark});
  const jaw=node(head,'articulated-lower-jaw',0,-.63,.62),j=assetBatch();
  loft(j,[[-.38,.36,.41,0,.36],[-.25,.76,.94,0,.44],[.02,.85,1.03,0,.46],[.16,.59,.73,0,.4]],belly,{segments:24,steps:12});
  for(const s of [-1,1])for(let k=0;k<3;k++)path(j,[[s*.67,.03,.03+k*.5],[s*.69,.3,.03+k*.5],[s*.65,.4,.03+k*.5]],[.08,.06,.007],horn,{segments:6,steps:6});j.finish(jaw,'contoured-jaw-and-teeth',bossSkin);
  const wings=[-1,1].map(s=>dragonWing(pose,s,sky)),tail=node(pose,'serpentine-tail',0,2.28,-1.22),tb=assetBatch();
  path(tb,[[0,0,0],[0,-.18,-1.43],[.16,.18,-2.84],[.48,.86,-3.81],[.6,1.27,-4.08]],[.7,.5,.29,.15,.008],skin,{segments:12,steps:26});tb.finish(tail,'continuous-tapered-tail',bossSkin);
  const crest=assetBatch();for(let k=0;k<4;k++)path(crest,[[0,5.82-k*.59,-1.08],[0,6.55-k*.59,-1.59],[0,6.72-k*.59,-1.82]],[.22,.13,.009],horn,{segments:7,steps:8});crest.finish(pose,'swept-dorsal-spines',bossShell);
  return fitBoss(group,pose,2.9,10.4,(t,p,state={})=>{const a=attackPose(p),walk=walking(t,state,2.7);hitPose(pose,t,state);
    legs.forEach(l=>{l.g.rotation.x=l.s*walk*.14;l.g.position.y=l.y+Math.max(0,l.s*walk)*.06;});arms.forEach(({g,s})=>{g.rotation.x=-.17-a*.7-s*walk*.06;});
    neck.rotation.x=-a*.19;head.rotation.y=Math.sin(t*.47)*.07;jaw.rotation.x=a*.48;
    wings.forEach(({g,s})=>{g.rotation.z=s*(.1+Math.sin(t*(sky?2.1:1.5))*.1+a*.2);g.rotation.y=-s*.12;});tail.rotation.y=Math.sin(t*1.3)*.24;
  });
}

export function buildSculptedCore(type) {
  switch(type) {
    case 'skeleton': return skeleton();
    case 'titan': return skeleton(true);
    case 'golem': return golem();
    case 'brute': return brute();
    case 'jelly': return jelly();
    case 'robot': return robot();
    case 'moon': return moon();
    case 'dragon': return dragon();
    case 'storm': return dragon(true);
    default: return null;
  }
}
