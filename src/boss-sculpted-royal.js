import * as THREE from 'three';
import { assetBatch, assetGlow, attackPose } from './asset-kit.js';
import { loftGeometry, headGeometry, sweepGeometry, patchGeometry, clothGeometry, crownGeometry, fitBoss, bossSkin, bossMetal, bossCloth } from './boss-shapes.js';

const GOLD=0xd9a644, PALE=0xffdf91, INK=0x211b34, IVORY=0xffecc9;
const patchOptions={segments:18,rings:4};
function node(parent,name,x=0,y=0,z=0){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
function sweep(batch,points,radii,color,x=0,y=0,z=0,options={}){
  return batch.add(sweepGeometry(points,radii,{segments:10,steps:18,...options}),color,x,y,z);
}
function plate(batch,outline,color,x=0,y=0,z=0,bulge=.18,rx=0,ry=0,rz=0){
  return batch.add(patchGeometry(outline,.12,bulge,patchOptions),color,x,y,z,rx,ry,rz);
}
function seam(batch,points,color,radius=.045){return sweep(batch,points,[radius,radius],color,0,0,0,{segments:6,steps:20});}

function royalLeg(parent,s,emperor){
  const y=emperor?3.5:2.65,g=node(parent,`royal-leg-${s}`,s*(emperor?1.02:.88),y);
  const skin=assetBatch(), armor=assetBatch();
  skin.add(loftGeometry([
    [-y+.3,.35,.4,0,.2],[-y+.75,.43,.43,0,0],[-y+1.3,.35,.38,0,-.08],
    [-.85,.46,.48,0,-.05],[-.35,.57,.56,0,0],[.13,.38,.41,0,0],
  ],{segments:24,steps:22}),emperor?0x3d3158:0x803d4c);
  armor.add(loftGeometry([
    [-y+.04,.39,.5,0,.36],[-y+.15,.63,.95,0,.35],[-y+.4,.62,.95,0,.37],
    [-y+.65,.49,.69,0,.15],[-y+1,.38,.42,0,.01],
  ],{segments:28,steps:18}),emperor?0x3d3156:0x593d4b);
  plate(armor,[[-.42,.45],[0,.65],[.45,.35],[.36,-.4],[0,-.6],[-.36,-.35]],emperor?0x86618a:GOLD,0,-1.35,.46,.2);
  plate(armor,[[-.43,.33],[.4,.31],[.52,-.13],[0,-.25],[-.5,-.1]],GOLD,0,-y+.48,1.03,.08,-.28);
  seam(armor,[[-.53,-y+.24,.86],[0,-y+.3,1.23],[.53,-y+.24,.86]],PALE,.04);
  skin.finish(g,'woven-leg',bossCloth);armor.finish(g,'curved-sabatons',bossMetal);
  return{g,s,y};
}

function royalArm(parent,s,emperor){
  const g=node(parent,`royal-arm-${s}`,s*(emperor?2.08:1.85),emperor?6.25:5.32);
  const skin=assetBatch(),armor=assetBatch(),len=emperor?3.25:2.75;
  skin.add(loftGeometry([
    [-len-.2,.18,.24,0,.27],[-len,.43,.5,0,.25],[-len+.45,.49,.49,0,.05],
    [-len+.95,.54,.52,0,0],[-1.15,.38,.42,0,-.04],[-.6,.56,.57,0,0],[.12,.5,.5,0,0],
  ],{segments:24,steps:24}),emperor?0x473454:0xa84751);
  for(let k=0;k<4;k++){
    const x=-.29+k*.19;
    sweep(skin,[[x,-len+.05,.47],[x,-len-.2,.52],[x,-len-.34,.36]],[.12,.13,.09],emperor?0x463452:0xb6535a,0,0,0,{segments:8,steps:10});
  }
  sweep(skin,[[s*.34,-len+.46,.28],[s*.55,-len+.15,.57],[s*.39,-len-.02,.63]],[.17,.19,.12],emperor?0x463452:0xb6535a);
  armor.add(loftGeometry([[-len+.16,.45,.5,0,.1],[-len+.35,.61,.65,0,.05],[-len+1,.57,.62,0,0],[-len+1.2,.42,.45,0,0]],{segments:24,steps:14}),emperor?0x77517e:GOLD);
  plate(armor,[[-.73,.22],[-.48,.67],[.16,.85],[.79,.4],[.74,-.18],[.2,-.46],[-.56,-.32]],emperor?0x75517e:0xd0a155,0,.02,.04,.72,.08,0,s*-.22);
  seam(armor,[[-.64,.27,.47],[0,.63,.78],[.64,.23,.5]],PALE,.065);
  plate(armor,[[-.38,.42],[0,.57],[.37,.3],[.25,-.36],[0,-.52],[-.28,-.31]],emperor?0xb99059:0xf1c46a,0,-len+.69,.57,.1);
  skin.finish(g,'sculpted-hand-and-arm',bossSkin);armor.finish(g,'forged-pauldron-and-gauntlet',bossMetal);
  return{g,s,len};
}

function face(head,emperor){
  const dark=assetBatch(),skin=assetBatch(),eyes=assetBatch(),gold=assetBatch();
  const faceZ=emperor?.84:.96, spacing=emperor?.42:.52;
  for(const s of[-1,1]){
    const outline=[[-.38,0],[-.2,.18],[.19,.16],[.37,-.015],[.16,-.14],[-.2,-.13]];
    plate(dark,outline,INK,s*spacing,.16,faceZ,.08,0,s*.12,-s*.18);
    plate(eyes,outline.map(([x,y])=>[x*.7,y*.6]),emperor?0xffd788:0xffdca2,s*spacing,.15,faceZ+.1,.07,0,s*.12,-s*.18);
    if(!emperor)plate(dark,[[-.08,0],[-.05,.12],[.05,.12],[.09,0],[.04,-.12],[-.05,-.12]],0x312237,s*spacing,.15,faceZ+.22,.025);
    sweep(skin,[[s*spacing-.4,.26,faceZ+.03],[s*spacing-.08,.43,faceZ+.06],[s*spacing+.34,.3,faceZ-.03]],[.07,.13,.07],emperor?GOLD:0xb24b52);
    if(!emperor){
      sweep(skin,[[s*.78,-.2,1.03],[s*.63,-.38,1.35],[s*.2,-.46,1.4]],[.12,.17,.12],0xb9555a);
      sweep(gold,[[s*.57,-.58,1.19],[s*.59,-.3,1.4],[s*.48,-.08,1.39]],[.16,.13,.006],IVORY,0,0,0,{segments:10,steps:16});
    }
  }
  plate(dark,[[-.5,.07],[-.12,.11],[.16,.08],[.48,.04],[.25,-.17],[-.26,-.16]],INK,0,-.46,emperor?1.03:1.32,.04);
  if(emperor){
    sweep(gold,[[0,.7,.79],[0,.22,1.01],[0,-.3,1.16],[0,-.58,1.02]],[.13,.17,.15,.06],GOLD);
    for(const s of[-1,1])seam(gold,[[s*.25,-.29,1.03],[s*.6,-.45,.97],[s*.76,-.05,.82]],PALE,.04);
  }else{
    plate(skin,[[-.23,.21],[.05,.23],[.24,.08],[.17,-.13],[-.13,-.12]],0xc76a65,0,-.08,1.31,.16);
    for(const s of[-1,1])plate(dark,[[-.07,.025],[0,.06],[.07,0],[0,-.04]],0x612537,s*.12,-.14,1.49,.015);
  }
  dark.finish(head,'carved-almond-sockets-and-mouth',emperor?bossMetal:bossSkin);
  skin.finish(head,'sculpted-brows-and-muzzle',emperor?bossMetal:bossSkin);
  eyes.finish(head,'royal-eyes',assetGlow);gold.finish(head,'face-relief',bossMetal);
}

export function buildSculptedRoyal(type){
  if(type!=='king'&&type!=='emperor')return null;
  const emperor=type==='emperor',group=new THREE.Group(),pose=node(group,'royal-sculpt');
  const legs=[-1,1].map(s=>royalLeg(pose,s,emperor));
  const torso=node(pose,'royal-bust',0,emperor?3.45:2.65),skin=assetBatch(),armor=assetBatch();
  const h=emperor?3.6:2.95;
  skin.add(loftGeometry([[0,1.02,.68],[.45,1.4,.95],[1.2,1.71,1.15],[h*.68,1.9,1.11],[h*.86,1.71,.95],[h,.62,.58]],{segments:36,steps:30}),emperor?0x4d365f:0xa83c4d);
  skin.add(loftGeometry([[h-.22,.59,.5],[h+.08,.49,.43],[h+.48,.46,.42],[h+.63,.37,.38]],{segments:24,steps:10}),emperor?0x4d365f:0xa83c4d);
  const breast=[[-1.49,1.15],[-.82,1.5],[0,1.3],[.82,1.5],[1.49,1.15],[1.24,-.55],[0,-1.16],[-1.24,-.55]];
  plate(armor,breast,emperor?0x755280:0xc2934c,0,h*.52,1.02,.38);
  seam(armor,[[-1.3,h*.52+1.05,1.25],[-.78,h*.52+1.28,1.33],[0,h*.52+1.06,1.55],[.78,h*.52+1.28,1.33],[1.3,h*.52+1.05,1.25]],PALE,.065);
  seam(armor,[[0,.56,1.34],[0,1.1,1.56],[0,1.95,1.55],[0,2.6,1.35]],GOLD,.085);
  const belt=loftGeometry([[.1,1.03,.74],[.25,1.42,.98],[.52,1.45,1],[.64,1.27,.9]],{segments:36,steps:12});armor.add(belt,emperor?0x33253d:0x714450);
  plate(armor,[[-.4,.25],[0,.4],[.4,.25],[.37,-.22],[0,-.37],[-.37,-.22]],GOLD,0,.39,1.05,.13);
  skin.finish(torso,'continuous-royal-tunic',bossCloth);armor.finish(torso,'domed-cuirass-and-engraved-trim',bossMetal);
  const jewel=assetBatch();plate(jewel,[[-.2,0],[0,.32],[.21,0],[0,-.3]],emperor?0xc99ae5:0x79d7bc,0,h*.67,1.58,.15);jewel.finish(torso,'chest-stone',assetGlow);
  const arms=[-1,1].map(s=>royalArm(pose,s,emperor));
  const head=node(pose,'royal-head',0,emperor?8.2:6.8,.02);
  const shell=assetBatch();
  shell.add(headGeometry(emperor?2.05:2.38,emperor?2.5:2.16,emperor?1.7:1.9,{snout:emperor?.05:.19,brow:emperor?.04:.15,cheeks:emperor?.02:.14,jaw:emperor?.66:.84}),emperor?0x9d7756:0xab424e);
  if(emperor){
    for(const s of[-1,1]){
      sweep(shell,[[s*.76,-.75,.18],[s*1.1,.05,-.04],[s*.96,1.03,-.22],[s*.63,1.33,-.23]],[.24,.34,.3,.16],0x4c355e);
      sweep(shell,[[s*.81,.73,-.35],[s*1.3,1.48,-.22],[s*1.42,2.25,-.03],[s*1.13,2.68,.15]],[.27,.22,.12,.008],GOLD);
    }
  }
  shell.finish(head,emperor?'sculpted-imperial-helm':'continuous-monarch-head',emperor?bossMetal:bossSkin);
  face(head,emperor);
  const crown=assetBatch();crown.add(crownGeometry(emperor?1.04:.99,emperor?.88:.85,emperor?7:5),GOLD,0,emperor?1.12:1.02,-.04);
  for(let k=0;k<(emperor?7:5);k++){
    const a=k*Math.PI*2/(emperor?7:5),x=Math.sin(a)*1.025,z=Math.cos(a)*1.025-.04;
    plate(crown,[[-.1,0],[0,.18],[.1,0],[0,-.16]],emperor?0xd6a1e6:0x8b394d,x,emperor?1.39:1.27,z,.05,0,a);
  }
  crown.finish(head,'continuous-cast-crown',bossMetal);
  const cape=node(torso,'folded-royal-cape',0,h*.91,-.85),fabric=assetBatch();
  fabric.add(clothGeometry(emperor?3.65:2.85,emperor?5.7:4.6,{folds:8,flare:.28,depth:.17}),emperor?0x5a2a56:0x752947,0,0,0,0,Math.PI);
  fabric.finish(cape,'woven-folds-and-scalloped-hem',bossCloth);
  let halo,shield,scepter;
  if(emperor){
    halo=node(pose,'imperial-orbit',0,8.55,-1.25);const orbit=assetBatch();
    const points=Array.from({length:49},(_,i)=>{const a=i/48*Math.PI*2;return[Math.sin(a)*2.17,Math.cos(a)*2.17,0];});
    sweep(orbit,points,[.065,.065],GOLD,0,0,0,{segments:8,steps:72});
    for(let k=0;k<7;k++){const a=k/7*Math.PI*2;sweep(orbit,[[Math.sin(a)*2.06,Math.cos(a)*2.06,0],[Math.sin(a)*2.4,Math.cos(a)*2.4,.06],[Math.sin(a)*2.58,Math.cos(a)*2.58,0]],[.06,.12,.008],PALE,0,0,0,{segments:6,steps:9});}
    orbit.finish(halo,'forged-regalia-orbit',bossMetal);
    shield=node(arms[0].g,'imperial-shield',-.22,-2.35,.95);const metal=assetBatch(),inset=assetBatch();
    const contour=[[-1.07,1.2],[0,1.57],[1.07,1.2],[1.02,-.45],[.45,-1.38],[0,-1.67],[-.45,-1.38],[-1.02,-.45]];
    plate(metal,contour,GOLD,0,0,0,.36);
    plate(metal,contour.map(([x,y])=>[x*.83,y*.83]),0x54365f,0,0,.23,.29);
    for(const s of[-1,1])seam(metal,[[s*.12,.85,.53],[s*.56,.35,.58],[s*.22,-.55,.55]],PALE,.06);
    plate(inset,[[-.23,0],[0,.48],[.23,0],[0,-.48]],0xd6ace8,0,.12,.63,.12);
    metal.finish(shield,'domed-heraldic-shield',bossMetal);inset.finish(shield,'shield-stone',assetGlow);
    scepter=node(arms[1].g,'imperial-scepter',.1,-3.1,.58);const blade=assetBatch(),edge=assetBatch();
    sweep(blade,[[0,-1.4,0],[0,.15,0],[0,1.45,.05]],[.12,.14,.1],GOLD);
    sweep(blade,[[-.68,.9,.03],[0,1.05,.03],[.68,.9,.03]],[.06,.14,.06],GOLD);
    blade.add(loftGeometry([[1.08,.12,.08],[1.65,.33,.1],[2.45,.4,.08,0,.08],[3.17,.22,.06,0,.11],[3.65,.004,.004,0,.1]],{segments:12,steps:24}),GOLD);
    sweep(edge,[[0,1.4,.13],[0,2.2,.19],[0,3.1,.2],[0,3.5,.16]],[.045,.07,.04,.002],0xcd9fea);
    blade.finish(scepter,'leaf-shaped-scepter-blade',bossMetal);edge.finish(scepter,'scepter-inlay',assetGlow);
  }
  const animate=(t,progress,state={})=>{
    const a=attackPose(progress),walk=state.moving===false||state.stunned?0:Math.sin(t*(emperor?2.6:3));
    const hit=Math.min(1,state.hit||0);
    pose.rotation.z=Math.sin(t*24)*hit*.035;pose.position.z=-hit*.1;
    torso.rotation.y=Math.sin(t*.6)*.045;torso.position.y=(emperor?3.45:2.65)+Math.abs(walk)*.055;
    for(const {g,s,y}of legs){g.rotation.x=s*walk*.12;g.position.y=y+Math.max(0,s*walk)*.07;}
    for(const {g,s}of arms){g.rotation.x=-a*(emperor?(s>0?.95:.4):1.25)-s*walk*.09;g.rotation.z=-s*.08+s*a*.12;}
    head.rotation.y=Math.sin(t*.63)*.1;head.rotation.x=a*.07;
    cape.rotation.x=.1+Math.sin(t*1.5)*.035+a*.12;cape.rotation.y=Math.sin(t*.7)*.04;
    if(halo){halo.rotation.z=t*.11;halo.rotation.y=Math.sin(t*.55)*.06;}
  };
  return fitBoss(group,pose,emperor?4.06:2.8,emperor?12.76:8.8,animate);
}
