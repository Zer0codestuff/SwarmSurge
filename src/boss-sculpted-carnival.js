import * as THREE from 'three';
import { assetBatch, assetGlow, attackPose } from './asset-kit.js';
import { loftGeometry, headGeometry, sweepGeometry, patchGeometry, clothGeometry, crownGeometry, fitBoss, bossSkin, bossMetal, bossCloth, bossShell } from './boss-shapes.js';

// Sculpted carnival bosses for worlds 22 to 36: jack, flipper, ringmaster, mesmer, locomotive and scarecrow.
// Same contract as boss-sculpted-late.js: buildSculptedCarnival(type) returns fitBoss(group, pose, radius, height, animate) or null.

const C={ink:0x181c30,gold:0xdba94b,ivory:0xffe7bd};
const TAU=Math.PI*2;
function node(parent,name,x=0,y=0,z=0){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
function rig(name){const group=new THREE.Group();group.name=name;return{group,pose:node(group,name+'-pose')};}
function stride(t,state){return state.moving===false||state.stunned?0:Math.sin(t*3.3);}
function hit(pose,t,state){pose.rotation.z=Math.sin(t*31)*Math.min(1,state.hit||0)*.035;pose.position.z=-(state.hit||0)*.1;}
function loft(batch,sections,color,x=0,y=0,z=0,options={}){return batch.add(loftGeometry(sections,{segments:24,steps:22,...options}),color,x,y,z);}
function tube(batch,points,radii,color,options={}){return batch.add(sweepGeometry(points,radii,{segments:10,steps:18,...options}),color);}
function panel(batch,outline,color,x=0,y=0,z=0,bulge=.2,depth=.12,rx=0,ry=0,rz=0){return batch.add(patchGeometry(outline,depth,bulge,{segments:24,rings:5}),color,x,y,z,rx,ry,rz);}
function chip(batch,outline,color,x=0,y=0,z=0,bulge=.08,depth=.05,rx=0,ry=0,rz=0){return batch.add(patchGeometry(outline,depth,bulge,{segments:14,rings:3}),color,x,y,z,rx,ry,rz);}
function bulb(batch,w,h,d,color,x=0,y=0,z=0,options={}){
  return loft(batch,[[-h*.5,.01,.01],[-h*.4,w*.3,d*.3],[-h*.15,w*.49,d*.48],[h*.18,w*.47,d*.5],[h*.4,w*.28,d*.32],[h*.5,.01,.01]],color,x,y,z,options);
}
function eye(surface,glow,x,y,z,size=.55,color=0xffe1a0,tilt=0){
  panel(surface,[[-size*.7,0],[-size*.4,size*.42],[size*.25,size*.38],[size*.7,-size*.07],[size*.3,-size*.3],[-size*.35,-size*.26]],C.ink,x,y,z,.08,.06,0,0,tilt);
  bulb(surface,size*.82,size*.6,.12,C.ivory,x,y,z+.1,{segments:16,steps:10});
  bulb(surface,size*.32,size*.49,.1,C.ink,x,y-.01,z+.18,{segments:12,steps:10});
  bulb(glow,size*.1,size*.17,.05,color,x-size*.065,y+size*.1,z+.24,{segments:8,steps:6});
  tube(surface,[[x-size*.66,y+size*.02,z+.11],[x-size*.35,y+size*.37,z+.12],[x+size*.25,y+size*.33,z+.12],[x+size*.65,y-size*.04,z+.1]],[.1,.12,.1,.06],0x33243b,{segments:8,steps:12});
}
function fingerHand(batch,x,y,z,size,color){
  bulb(batch,size,size*1.05,size*.75,color,x,y,z,{segments:14,steps:12});
  for(let k=0;k<3;k++)tube(batch,[[x+(k-1)*size*.26,y-size*.2,z+size*.24],[x+(k-1)*size*.32,y-size*.57,z+size*.36],[x+(k-1)*size*.28,y-size*.7,z+size*.55]],[size*.16,size*.15,.025],color,{segments:8,steps:10});
  tube(batch,[[x-size*.36,y+size*.05,z],[x-size*.65,y-size*.13,z+size*.27],[x-size*.5,y-size*.4,z+size*.41]],[size*.19,size*.16,.025],color,{segments:8,steps:10});
}
function striped(g,a,b,period=.38){
  const p=g.attributes.position,colors=[],ca=new THREE.Color(a),cb=new THREE.Color(b);
  for(let i=0;i<p.count;i++){const c=Math.floor((p.getY(i)+20)/period)%2?ca:cb;colors.push(c.r,c.g,c.b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;
}
function loopPath(radius,y,n=14,w=1){const p=[];for(let k=0;k<=n;k++){const a=k/n*TAU;p.push([Math.sin(a)*radius,y,Math.cos(a)*radius*w]);}return p;}

// World 22 Toy Town: a porcelain jester popping from a crank toy box on a coiled spring.
function buildJack(){
  const RED=0xc23848,BLUE=0x2e4f9e,CREAM=0xf3e3bd;
  const {group,pose}=rig('sculpted-jack');
  const box=node(pose,'jack-toy-box',0,0,0),wood=assetBatch(),trim=assetBatch();
  loft(wood,[[.05,1.46,1.3,0,0,.44],[.5,1.54,1.38,0,0,.44],[1.3,1.56,1.4,0,0,.44],[1.62,1.44,1.28,0,0,.44]],CREAM,0,0,0,{segments:28,steps:10});
  tube(trim,[[-1.52,1.64,-1.3],[-1.54,1.7,0],[-1.52,1.64,1.3],[0,1.7,1.48],[1.52,1.64,1.3],[1.54,1.7,0],[1.52,1.64,-1.3],[0,1.7,-1.48],[-1.52,1.64,-1.3]],[.14,.14],RED,{segments:8,steps:44});
  tube(trim,[[-1.54,.18,-1.32],[-1.56,.22,0],[-1.54,.18,1.32],[0,.22,1.5],[1.54,.18,1.32],[1.56,.22,0],[1.54,.18,-1.32],[0,.22,-1.5],[-1.54,.18,-1.32]],[.12,.12],BLUE,{segments:8,steps:44});
  const star=[];for(let k=0;k<10;k++){const r=k%2?.2:.46,a=k/10*TAU-Math.PI/2;star.push([Math.sin(a)*r,Math.cos(a)*r]);}
  chip(trim,star,C.gold,0,.85,1.42,.09,.04);
  for(const s of[-1,1]){
    const flap=patchGeometry([[0,-.05],[1.32,-.05],[1.32,-1.55],[.6,-1.72],[0,-1.78]],.09,.14,{segments:16,rings:4});
    trim.add(flap,s>0?RED:BLUE,0,1.7,-1.34,-Math.PI/2,0,s*-.22);
  }
  wood.finish(box,'jack-lacquered-crate',bossShell);trim.finish(box,'jack-crate-trim',bossMetal);
  const crank=node(box,'jack-crank',1.76,.9,0),cb=assetBatch();
  cb.cylinder(.19,.5,0,0,0,BLUE,'x',.19,10);
  tube(cb,[[0,0,0],[.4,0,0],[.4,0,.32],[.4,.36,.34]],[.12,.12,.1,.1],C.gold,{segments:8,steps:12});
  bulb(cb,.34,.4,.34,0x7a5230,.4,.42,.34,{segments:10,steps:8});
  cb.finish(crank,'jack-winding-crank',bossMetal);
  const popper=node(pose,'jack-popper',0,1.55,0),spring=assetBatch();
  const pts=[],rr=[];for(let j=0;j<=52;j++){const v=j/52,a=v*TAU*4.4;pts.push([Math.cos(a)*.6,v*2.5,Math.sin(a)*.6]);rr.push(.14);}
  tube(spring,pts,rr,RED,{segments:10,steps:66});
  spring.finish(popper,'jack-coil-spring',bossMetal);
  const torso=node(popper,'jack-harlequin-torso',0,2.5,0),suit=assetBatch(),garnish=assetBatch();
  loft(suit,[[-.4,.5,.44,0,0],[.4,.76,.66,0,0],[1.3,.8,.68,0,0],[1.95,.62,.54,0,0],[2.4,.34,.3,0,0]],BLUE,0,0,0,{segments:24,steps:18});
  panel(garnish,[[0,.6],[.36,.06],[0,-.52],[-.36,.06]],RED,0,1.35,.6,.2,.08);
  panel(garnish,[[0,.6],[.36,.06],[0,-.52],[-.36,.06]],RED,0,1.35,-.62,.16,.08,0,Math.PI);
  suit.ring(.82,.07,0,.9,0,C.gold);
  suit.finish(torso,'jack-harlequin-bodice',bossCloth);garnish.finish(torso,'jack-painted-diamonds',bossShell);
  const ruff=assetBatch();
  loft(ruff,[[0,.7,.68,0,0],[.14,1.06,1.04,0,0],[.3,.74,.72,0,0]],RED,0,2.12,0,{segments:36,steps:5,warp(x,y,z,u,v,a){const s=.68+.62*Math.max(0,Math.cos(a*6))**3;return[x*s,y,z*s];}});
  loft(ruff,[[0,.6,.58,0,0],[.12,.9,.88,0,0],[.24,.62,.6,0,0]],BLUE,0,2.36,0,{segments:36,steps:5,warp(x,y,z,u,v,a){const s=.66+.58*Math.max(0,Math.cos(a*6+Math.PI))**3;return[x*s,y,z*s];}});
  ruff.finish(torso,'jack-scalloped-ruff',bossCloth);
  const head=node(torso,'jack-jester-head',0,2.72,.04),face=assetBatch(),paint=assetBatch(),gleam=assetBatch();
  face.add(headGeometry(1.66,1.58,1.46,{snout:.28,brow:.08,cheeks:.24,jaw:.88}),CREAM);
  eye(face,gleam,-.44,.14,.68,.4,0xffd76b,.1);eye(face,gleam,.44,.14,.68,.4,0xffd76b,-.1);
  for(const s of[-1,1])chip(paint,[[-.2,0],[0,.17],[.2,0],[0,-.17]],0xd96a5a,s*.6,-.18,.7,.1,.05,0,0,s*-.22);
  panel(paint,[[-.6,.02],[-.28,.15],[.28,.15],[.6,.02],[.46,-.11],[.26,-.19],[0,-.21],[-.26,-.19],[-.46,-.11]],0x7e2735,0,-.42,.74,.07,.05);
  panel(paint,[[-.46,-.03],[-.2,.08],[.2,.08],[.46,-.03],[.28,-.09],[-.28,-.09]],CREAM,0,-.35,.8,.03,.03);
  face.finish(head,'jack-porcelain-face',bossSkin);paint.finish(head,'jack-painted-grin',bossShell);gleam.finish(head,'jack-eye-glints',assetGlow);
  const hat=assetBatch(),bells=assetBatch();
  for(let k=0;k<3;k++){
    const a=(k-1)*1.05,bx=Math.sin(a),bz=Math.cos(a);
    tube(hat,[[bx*.5,.55,bz*.46],[bx*1.02,1.14,bz*.9],[bx*1.5,1.46,bz*1.28],[bx*1.7,1.24,bz*1.5]],[.3,.24,.15,.06],k===1?C.gold:(k<1?RED:BLUE),{segments:10,steps:16});
    bulb(bells,.34,.4,.34,k===1?C.gold:(k<1?RED:BLUE),bx*1.74,1.02,bz*1.54,{segments:12,steps:10});
    bells.ring(.13,.05,bx*1.74,1.26,bz*1.54,C.gold);
  }
  tube(hat,loopPath(.64,.5,16),[.1,.1],C.gold,{segments:8,steps:20});
  hat.finish(head,'jack-flopped-jester-hat',bossCloth);bells.finish(head,'jack-hat-bells',bossMetal);
  const arms=[];
  for(const s of[-1,1]){
    const arm=node(torso,'jack-long-arm-'+s,s*.98,1.7,0),b=assetBatch();
    tube(b,[[0,0,0],[s*.28,-1.3,.08],[s*.42,-2.5,.3]],[.32,.28,.2],s>0?BLUE:RED,{segments:12,steps:18});
    b.ring(.3,.09,s*.4,-2.35,.26,C.gold);
    bulb(b,.6,.78,.52,s>0?BLUE:RED,s*.46,-2.95,.34,{segments:14,steps:12});
    tube(b,[[s*.42,-2.7,.5],[s*.58,-2.5,.74]],[.15,.09],CREAM,{segments:8,steps:8});
    b.finish(arm,'jack-cloth-arm-'+s,bossCloth);arms.push({arm,s});
  }
  return fitBoss(group,pose,2.8,9.4,(t,progress,state={})=>{
    const a=attackPose(progress),rock=stride(t,state);hit(pose,t,state);
    box.rotation.z=Math.sin(t*1.1)*.02+rock*.03;box.rotation.x=-a*.05+rock*.02;
    crank.rotation.x=state.moving===false||state.stunned?0:t*3;
    popper.scale.y=1+a*.09;popper.position.z=a*1.35;popper.rotation.x=a*.09;
    torso.rotation.y=Math.sin(t*.7)*.05;
    head.rotation.x=-a*.22+Math.sin(t*.9)*.03;head.rotation.y=Math.sin(t*.66)*.08;
    for(const l of arms){l.arm.rotation.z=-l.s*(.14+a*.85);l.arm.rotation.x=-a*.25-rock*.06;}
  });
}

// World 25 Tilt Palace: chrome pinball automaton with flipper paddle arms and score lights.
function buildFlipper(){
  const CHROME=0xb9c6cf,PLATE=0x55407e,DEEP=0x2c2350,CYAN=0x6ae8e2;
  const {group,pose}=rig('sculpted-pinball-wizard');
  const legs=[];
  for(const s of[-1,1]){
    const leg=node(pose,'flipper-strut-leg-'+s,s*1.12,2.25,0),b=assetBatch();
    loft(b,[[-1.05,.95,1.1,0,.5],[-.7,1.0,1.15,0,.5],[.3,.86,.98,0,.6],[.95,.6,.68,0,.6]],PLATE,0,0,0,{segments:20,steps:12});
    loft(b,[[-1.05,.34,.4],[-.6,.3,.36],[.3,.26,.3],[.9,.2,.24]],CHROME,0,-.85,.12,{segments:16,steps:10});
    loft(b,[[-.6,.5,.9,0,.55],[-.3,.62,1.0,0,.5],[.3,.6,1.0,0,.5],[.62,.4,.68,0,.5],[.7,.1,.14,0,.5]],DEEP,0,-1.84,.3,{segments:18,steps:10});
    b.ring(.42,.1,0,-.82,.12,C.gold);
    b.finish(leg,'flipper-piston-leg-'+s,bossMetal);legs.push({leg,s});
  }
  const hips=node(pose,'flipper-gimbal-pelvis',0,2.3,0),hb=assetBatch();
  loft(hb,[[-.6,.95,.85,0,0,.6],[.1,1.05,.95,0,0,.6],[.8,.9,.8,0,0,.6],[1.1,.5,.45,0,0,.6]],DEEP,0,0,0,{segments:22,steps:10});
  hb.ring(1.02,.09,0,1.0,0,C.gold);
  hb.finish(hips,'flipper-gimbal-pelvis',bossMetal);
  const torso=node(pose,'flipper-barrel-chest',0,3.3,0),chest=assetBatch(),trim=assetBatch(),lamp=assetBatch();
  loft(chest,[[-.4,1.0,.9,0,0],[.3,1.24,1.1,0,0],[1.1,1.3,1.16,0,0],[1.9,1.22,1.1,0,0],[2.5,1.0,.92,0,0],[2.9,.62,.55,0,0],[3.05,.06,.06,0,0]],CHROME,0,0,0,{segments:32,steps:22,warp(x,y,z,u,v,a){return[x,y,z+.06*Math.sin(v*Math.PI)*Math.max(0,Math.cos(a))**4];}});
  for(const y of[.5,1.35,2.2])chest.ring(1.2-.07*Math.abs(y-1.35),.075,0,y,0,PLATE);
  panel(trim,[[0,.8],[.85,.55],[1.0,0],[.68,-.62],[0,-.72],[-.68,-.62],[-1.0,0],[-.85,.55]],PLATE,0,1.5,1.0,.24,.1);
  panel(trim,[[0,.5],[.95,.34],[1.15,-.06],[.76,-.5],[0,-.6],[-.76,-.5],[-1.15,-.06],[-.95,.34]],DEEP,0,1.52,1.18,.12,.07);
  for(let k=0;k<4;k++)bulb(lamp,.24,.24,.12,k%2?CYAN:C.gold,-.54+k*.36,1.72,1.26,{segments:8,steps:6});
  for(let k=0;k<3;k++)bulb(lamp,.24,.24,.12,C.gold,-.36+k*.36,1.44,1.28,{segments:8,steps:6});
  bulb(lamp,.34,.46,.14,CYAN,0,1.08,1.22,{segments:8,steps:6});
  for(const s of[-1,1]){
    bulb(trim,.72,.5,.72,PLATE,s*1.16,2.62,-.12,{segments:16,steps:10});
    trim.ring(.4,.09,s*1.16,2.76,-.12,C.gold);
    bulb(lamp,.3,.2,.3,CYAN,s*1.16,2.88,-.12,{segments:10,steps:8});
  }
  chest.finish(torso,'flipper-chromed-barrel',bossMetal);trim.finish(torso,'flipper-bumpers-and-plate',bossMetal);
  const lampMesh=lamp.finish(torso,'flipper-score-lights',assetGlow);
  const head=node(torso,'flipper-visor-head',0,3.42,.05),dome=assetBatch(),visor=assetBatch(),gleam=assetBatch();
  bulb(dome,.55,.5,.55,PLATE,0,-.18,0,{segments:14,steps:8});
  loft(dome,[[-.1,.6,.56,0,0],[.3,.94,.88,0,0],[.8,1.08,.98,0,0],[1.25,.96,.86,0,0],[1.55,.58,.52,0,0],[1.72,.1,.1,0,0]],CHROME,0,0,-.05,{segments:28,steps:16});
  panel(visor,[[-.85,.14],[-.52,.66],[.52,.66],[.85,.14],[.5,-.32],[-.5,-.32]],DEEP,0,.5,.94,.18,.09);
  for(const s of[-1,1]){
    bulb(gleam,.38,.3,.12,CYAN,s*.34,.52,1.1,{segments:10,steps:8});
    tube(visor,[[s*.6,.2,1.0],[s*.42,.7,1.02],[s*.12,.76,.98]],[.06,.075,.04],C.gold,{segments:6,steps:10});
  }
  tube(dome,[[0,1.28,-.34],[0,1.74,-.12],[0,1.94,.3]],[.16,.2,.06],C.gold,{segments:8,steps:12});
  dome.finish(head,'flipper-dome-crown',bossMetal);visor.finish(head,'flipper-visor-face',bossShell);gleam.finish(head,'flipper-visor-eyes',assetGlow);
  const pack=node(torso,'flipper-power-pack',0,1.7,-1.15),pb=assetBatch(),pg=assetBatch();
  loft(pb,[[-.7,.3,.5,0,0,.6],[.2,.6,.8,0,0,.6],[.9,.5,.7,0,0,.6],[1.3,.2,.3,0,0,.6]],PLATE,0,0,0,{segments:18,steps:10});
  pg.ring(.34,.06,0,.62,-.1,CYAN);pg.ring(.26,.05,0,.26,-.15,CYAN);
  pb.finish(pack,'flipper-power-pack',bossMetal);pg.finish(pack,'flipper-pack-coils',assetGlow);
  const arms=[];
  for(const s of[-1,1]){
    const arm=node(torso,'flipper-paddle-arm-'+s,s*1.55,2.5,0),b=assetBatch();
    bulb(b,.55,.55,.55,CHROME,0,0,0,{segments:14,steps:12});
    tube(b,[[0,0,0],[s*.12,-.5,.1],[s*.15,-1.0,.15]],[.3,.26,.22],PLATE,{segments:12,steps:10});
    const pad=loftGeometry([[.1,.24,.6],[-.5,.36,.98],[-1.4,.34,.92],[-2.2,.22,.6],[-2.62,.05,.14]],{segments:20,steps:16});
    b.add(pad,(x,y)=>y<-2.05?DEEP:CHROME,s*.15,-1.0,.18);
    b.ring(.3,.08,s*.15,-1.0,.18,C.gold);
    b.finish(arm,'flipper-paddle-arm-'+s,bossMetal);arms.push({arm,s});
  }
  return fitBoss(group,pose,3.1,9.7,(t,progress,state={})=>{
    const a=attackPose(progress),rock=stride(t,state);hit(pose,t,state);
    torso.position.y=3.3+Math.abs(rock)*.05-a*.15;torso.rotation.x=-a*.1;torso.rotation.y=Math.sin(t*.6)*.03;
    for(const l of legs)l.leg.rotation.x=l.s*rock*.05;
    for(const l of arms){l.arm.rotation.x=-.5-a*1.6+rock*.04;l.arm.rotation.z=l.s*(.5-a*.42);}
    head.rotation.x=-a*.12+Math.sin(t*.8)*.04;
    lampMesh.scale.setScalar(1+a*.25+Math.sin(t*3)*.03);
  });
}

// World 27 Big Top Circus: tailcoated ringmaster with a whip, megaphone and silk top hat.
function buildRingmaster(){
  const CRIMSON=0xa62c3e,BLACK=0x211c26,WHITE=0xf3e9d6,SKIN=0xc98d68;
  const {group,pose}=rig('sculpted-ringmaster');
  const legs=[],tails=[];
  for(const s of[-1,1]){
    const leg=node(pose,'ringmaster-striped-leg-'+s,s*.78,3.05,0),b=assetBatch();
    const thigh=loftGeometry([[-.6,.4,.46,0,.3],[-1.1,.48,.54,0,.2],[-1.7,.42,.48,0,.1],[-2.2,.46,.52,0,0]],{segments:20,steps:14});
    b.add(striped(thigh,CRIMSON,BLACK,.34),0xffffff);
    loft(b,[[-2.05,.36,.44,0,.1],[-2.4,.42,.52,0,.14],[-2.7,.46,.62,0,.24],[-2.9,.4,.66,0,.34],[-2.98,.2,.5,0,.44]],BLACK,0,0,0,{segments:18,steps:10});
    b.finish(leg,'ringmaster-trouser-and-boot-'+s,bossCloth);legs.push({leg,s});
  }
  const torso=node(pose,'ringmaster-tailcoat',0,3.0,0),coat=assetBatch(),trim=assetBatch();
  loft(coat,[[-.6,.62,.58,0,0],[.3,.8,.72,0,0],[1.3,.96,.84,0,0],[2.2,1.0,.86,0,0],[2.9,.92,.8,0,0],[3.4,1.06,.96,0,0],[3.62,1.0,.92,0,0]],CRIMSON,0,0,0,{segments:26,steps:22});
  panel(coat,[[0,.9],[.3,.5],[.2,0],[0,-.3],[-.2,0],[-.3,.5]],WHITE,0,2.1,.9,.12,.06);
  for(let k=0;k<3;k++)bulb(trim,.11,.11,.07,C.gold,0,1.9-k*.42,1.02,{segments:8,steps:6});
  for(const s of[-1,1]){
    panel(trim,[[-.3,.5],[.1,.44],[.2,-.3],[.3,-.6],[-.3,-.4]],BLACK,s*.42,2.3,.88,.14,.05,0,0,s*.3);
    bulb(trim,.44,.26,.5,C.gold,s*1.08,3.3,0,{segments:12,steps:8});
    for(let k=0;k<4;k++)tube(trim,[[s*1.08+(k-1.5)*.14,3.2,.16],[s*1.08+(k-1.5)*.17,2.9,.3]],[.05,.02],C.gold,{segments:6,steps:8});
  }
  tube(trim,loopPath(.86,.28,16),[.07,.07],C.gold,{segments:8,steps:20});
  coat.finish(torso,'ringmaster-crimson-tailcoat',bossCloth);trim.finish(torso,'ringmaster-braided-trim',bossMetal);
  for(const s of[-1,1]){
    const tail=node(torso,'ringmaster-coat-tail-'+s,s*.52,1.1,-.8),tb=assetBatch();
    tb.add(clothGeometry(1.0,2.9,{folds:4,flare:.3,depth:.14,segments:16,steps:16}),CRIMSON,0,0,0,0,Math.PI);
    tb.finish(tail,'ringmaster-folded-tail-'+s,bossCloth);tails.push(tail);
  }
  const head=node(torso,'ringmaster-head',0,4.05,.06),face=assetBatch(),hair=assetBatch(),gleam=assetBatch();
  face.add(headGeometry(1.7,1.9,1.6,{snout:.2,brow:.14,cheeks:.1,jaw:.7}),SKIN);
  eye(face,gleam,-.42,.16,.76,.4,0xffdcb0,.12);eye(face,gleam,.42,.16,.76,.4,0xffdcb0,-.12);
  for(const s of[-1,1]){
    tube(hair,[[s*.1,-.36,.86],[s*.5,-.3,.98],[s*.86,-.1,.88],[s*1.02,.14,.66]],[.11,.14,.11,.04],BLACK,{segments:10,steps:16});
    tube(hair,[[s*.2,.44,.84],[s*.5,.52,.86],[s*.72,.42,.78]],[.05,.07,.03],BLACK,{segments:6,steps:10});
  }
  face.finish(head,'ringmaster-face',bossSkin);hair.finish(head,'ringmaster-mustache-and-brows',bossShell);gleam.finish(head,'ringmaster-eye-glints',assetGlow);
  const hat=node(head,'ringmaster-top-hat',0,.92,0),hatb=assetBatch(),band=assetBatch();
  const brim=loftGeometry([[-.06,1.2,1.2],[0,1.26,1.26],[.07,1.16,1.16]],{segments:30,steps:4,warp(x,y,z){const r=Math.hypot(x/1.26,z/1.26);return[x,y-.16*r*r,z];}});
  hatb.add(brim,BLACK,0,.02,0);
  loft(hatb,[[.08,.7,.7],[.6,.66,.66],[1.12,.62,.62],[1.34,.4,.4],[1.44,.06,.06]],BLACK,0,0,0,{segments:26,steps:12});
  tube(band,loopPath(.7,.24,16),[.08,.08],CRIMSON,{segments:8,steps:20});
  panel(band,[[0,.15],[.2,.1],[.16,-.07],[0,-.13],[-.16,-.07],[-.2,.1]],C.gold,0,.24,.66,.05,.03);
  hatb.finish(hat,'ringmaster-silky-top-hat',bossCloth);band.finish(hat,'ringmaster-hat-band',bossShell);
  const arms=[];
  for(const s of[-1,1]){
    const arm=node(torso,'ringmaster-coat-arm-'+s,s*1.35,2.75,0),b=assetBatch();
    loft(b,[[-2.3,.26,.3,0,.3],[-1.9,.36,.4,0,.24],[-1.2,.34,.38,0,.14],[-.5,.42,.46,0,.05],[.2,.46,.5,0,0]],CRIMSON,0,0,0,{segments:18,steps:16});
    b.ring(.34,.08,0,-2.1,.05,WHITE);
    fingerHand(b,0,-2.5,.14,.5,WHITE);
    b.finish(arm,'ringmaster-sleeve-and-glove-'+s,bossCloth);arms.push({arm,s});
  }
  const whip=node(arms[1].arm,'ringmaster-whip',0,-2.45,.2),wb=assetBatch();
  tube(wb,[[0,0,0],[0,.12,.06]],[.09,.08],0x4a3527,{segments:8,steps:6});
  wb.ring(.12,.035,0,.18,.06,C.gold);
  tube(wb,[[0,.1,.06],[.16,-.7,.2],[.1,-1.7,.3],[.3,-2.6,.1],[.75,-3.0,-.35]],[.06,.05,.035,.02,.006],0x5a4130,{segments:8,steps:30});
  wb.finish(whip,'ringmaster-ring-whip',bossCloth);
  const mega=node(arms[0].arm,'ringmaster-megaphone',0,-2.55,.22),mb=assetBatch();
  const horn=loftGeometry([[0,.1,.1],[.4,.14,.14],[.9,.3,.3],[1.3,.5,.5],[1.44,.56,.56]],{segments:18,steps:12});
  horn.rotateX(Math.PI/2);mb.add(horn,C.gold,0,0,0);
  mb.ring(.52,.06,0,0,1.34,CRIMSON);
  mb.cylinder(.09,.4,0,-.08,-.2,CRIMSON,'z',.09,10);
  mb.finish(mega,'ringmaster-brass-megaphone',bossMetal);
  mega.rotation.x=-.85;
  return fitBoss(group,pose,3.0,10.6,(t,progress,state={})=>{
    const a=attackPose(progress),step=stride(t,state);hit(pose,t,state);
    torso.position.y=3.0+Math.abs(step)*.045;torso.rotation.y=a*.16+Math.sin(t*.5)*.03;
    for(const l of legs)l.leg.rotation.x=l.s*step*.09;
    arms[0].arm.rotation.x=-a*1.05-step*.05;arms[0].arm.rotation.z=.12+a*.1;
    arms[1].arm.rotation.x=-a*2.25;arms[1].arm.rotation.z=-.12-a*.22;arms[1].arm.rotation.y=a*.3;
    head.rotation.y=Math.sin(t*.55)*.07-a*.1;head.rotation.x=a*.06;
    for(const tail of tails)tail.rotation.x=.14+a*.3+Math.sin(t*1.4)*.04;
  });
}

// World 30 Hypno Palace: hooded hypno-cobra rising from one continuous coil.
function buildMesmer(){
  const VIOLET=0x5d3a94,MAGENTA=0xb8438f,CYAN=0x6ff0e4,GOLD=0xe0b054,INK=0x2a1c3a;
  const {group,pose}=rig('sculpted-hypno-cobra');
  const coils=assetBatch();
  const cpts=[],crads=[];
  for(let j=0;j<=30;j++){const v=j/30,a=-v*TAU*1.85,r=2.5-v*1.4;cpts.push([Math.sin(a)*r,.98+v*1.28,Math.cos(a)*r*.9]);crads.push(1.06-v*.26);}
  tube(coils,cpts,crads,VIOLET,{segments:18,steps:60});
  const belly=assetBatch();
  for(let k=0;k<3;k++)chip(belly,[[0,.4],[.5,.26],[.56,-.1],[0,-.34],[-.56,-.1],[-.5,.26]],0xcbb492,0,.72+k*.28,3.24+k*.06,.1,.05,0,0,0);
  belly.finish(pose,'mesmer-coil-belly-scales',bossShell);
  coils.finish(pose,'mesmer-continuous-coils',bossShell);
  const ENDX=Math.sin(-TAU*1.85)*1.1,ENDZ=Math.cos(-TAU*1.85)*.99;
  const strike=node(pose,'mesmer-strike',0,2.2,0),neck=assetBatch(),bands=assetBatch();
  const npts=[],nrads=[];
  for(let j=0;j<=16;j++){const v=j/16;npts.push([ENDX*(1-v*.55)+Math.sin(v*2.2)*.3,.06+v*6.55,ENDZ*(1-v*.55)+v*v*1.3]);nrads.push(.8-v*.06);}
  tube(neck,npts,nrads,VIOLET,{segments:16,steps:30});
  neck.finish(strike,'mesmer-rising-neck',bossShell);
  for(const v of[.5,.78]){const p=npts[Math.round(v*16)];bands.ring(.92-v*.1,.06,p[0],p[1],p[2],GOLD);}
  bands.finish(strike,'mesmer-gold-collars',bossMetal);
  const head=node(strike,'mesmer-head',npts[16][0],npts[16][1],npts[16][2]),face=assetBatch(),gleam=assetBatch(),crown=assetBatch();
  face.add(headGeometry(1.95,1.75,2.2,{snout:.38,brow:.12,cheeks:.08,jaw:.72}),VIOLET);
  eye(face,gleam,-.5,.16,1.0,.52,CYAN,-.14);eye(face,gleam,.5,.16,1.0,.52,CYAN,.14);
  for(const s of[-1,1])tube(face,[[s*.5,-.5,1.12],[s*.56,-.85,1.18],[s*.52,-1.05,1.08]],[.09,.07,.012],0xf1e6c8,{segments:8,steps:10});
  face.finish(head,'mesmer-serpent-face',bossSkin);gleam.finish(head,'mesmer-eye-hypnosis',assetGlow);
  const hoodN=node(head,'mesmer-hood',0,-.3,-.7),hood=assetBatch(),spirals=assetBatch();
  loft(hood,[[0,.5,.36],[-.4,1.8,.52],[-1.0,2.6,.62],[-1.7,2.3,.56],[-2.3,1.4,.46],[-2.7,.5,.3],[-2.9,.12,.12]],0x7a4ab8,0,0,0,{segments:30,steps:20,warp(x,y,z,u,v,a){const f=1+.05*Math.sin(a*5+y*2);return[x*f,y,z*f];}});
  for(const s of[-1,1])for(let k=0;k<9;k++){
    const t2=k/8,ang=t2*4.6+(s>0?0:2.1),r=.22+t2*1.02;
    bulb(spirals,.3,.3,.16,k%3===2?CYAN:MAGENTA,s*(.26+r*Math.cos(ang)),-1.4+r*Math.sin(ang)*.86,.56,{segments:8,steps:6});
  }
  hoodN.rotation.x=-.22;
  hood.finish(hoodN,'mesmer-flared-hood',bossShell);
  const inner=assetBatch();
  loft(inner,[[.2,.34,.26],[-.3,1.3,.4],[-.9,2.1,.5],[-1.5,1.9,.46],[-2.0,1.1,.38],[-2.35,.3,.2]],0x8a55c8,0,0,.28,{segments:24,steps:14});
  inner.finish(hoodN,'mesmer-hood-inner-layer',bossShell);
  const trim2=assetBatch();
  tube(trim2,[[0,.45,.06],[.95,-.15,.06],[1.9,-.75,.06],[2.5,-1.4,.06],[2.2,-2.1,.06],[1.3,-2.6,.06],[0,-2.82,.06],[-1.3,-2.6,.06],[-2.2,-2.1,.06],[-2.5,-1.4,.06],[-1.9,-.75,.06],[-.95,-.15,.06]],[.07,.07],GOLD,{segments:6,steps:34});
  trim2.finish(hoodN,'mesmer-hood-gold-trim',bossMetal);
  const spiralMesh=spirals.finish(hoodN,'mesmer-hypno-spirals',assetGlow);
  crown.add(crownGeometry(.8,.7,5),GOLD,0,.9,-.05);
  for(const s of[-1,1])chip(crown,[[0,.14],[.14,.04],[0,-.12],[-.14,.04]],CYAN,s*.36,1.06,.42,.05,.03,0,0,s*.4);
  crown.finish(head,'mesmer-jeweled-crown',bossMetal);
  const tongue=node(head,'mesmer-tongue',0,-.62,1.05),tb=assetBatch();
  tube(tb,[[0,0,0],[0,-.1,.4],[0,-.05,.9]],[.07,.05,.02],MAGENTA,{segments:6,steps:12});
  for(const s of[-1,1])tube(tb,[[0,-.05,.9],[s*.12,-.02,1.15]],[.02,.006],MAGENTA,{segments:6,steps:6});
  tb.finish(tongue,'mesmer-forked-tongue',bossSkin);
  return fitBoss(group,pose,3.5,11.4,(t,progress,state={})=>{
    const a=attackPose(progress),live=!state.stunned;hit(pose,t,state);
    strike.rotation.x=a*.5;strike.position.z=a*1.15;
    strike.position.y=2.2+(live?Math.sin(t*1.6)*.06:0);
    head.rotation.x=.12+a*.3;head.rotation.y=Math.sin(t*.5)*.06;
    hoodN.scale.set(1+a*.3,1+a*.08,1+a*.3);
    spiralMesh.scale.setScalar(1+Math.sin(t*2.2)*.06+a*.15);
    tongue.scale.z=live?1+Math.max(0,Math.sin(t*2.4))*.8:1;
  });
}

// World 35 Dynamite Ridge: a standing steam engine with piston fists and red drive wheels.
function buildLocomotive(){
  const IRON=0x2b2e35,BRASS=0xc2913f,RED=0xa8353f,STEEL=0x8b939e;
  const {group,pose}=rig('sculpted-iron-horse');
  const chassis=node(pose,'loco-chassis',0,0,0),frame=assetBatch();
  loft(frame,[[-.5,1.25,2.3,0,0,.55],[0,1.35,2.4,0,0,.55],[.9,1.3,2.35,0,0,.55],[1.35,1.1,2.0,0,0,.55]],IRON,0,1.45,-.15,{segments:22,steps:8});
  for(const s of[-1,1])loft(frame,[[-.05,.5,2.3],[0,.52,2.35],[.05,.5,2.3]],IRON,s*1.6,2.05,-.1,{segments:14,steps:5});
  const cow=assetBatch();
  for(let k=0;k<7;k++){
    const x=(k-3)*.42;
    tube(cow,[[x,2.1,1.9],[x*.8,1.2,2.5],[x*.55,.25,3.0]],[.11,.1,.07],IRON,{segments:8,steps:10});
  }
  tube(cow,[[-1.5,2.2,1.85],[0,2.35,2.05],[1.5,2.2,1.85]],[.12,.14,.12],BRASS,{segments:8,steps:12});
  frame.finish(chassis,'loco-iron-frame',bossMetal);cow.finish(chassis,'loco-cowcatcher-jaw',bossMetal);
  const wheels=[];
  for(const s of[-1,1]){
    const wheel=node(chassis,'loco-drive-wheel-'+s,s*1.95,1.55,.15),wb=assetBatch(),spokes=assetBatch(),hub=assetBatch();
    const disc=loftGeometry([[-.13,1.5,1.5,0,0,.5],[0,1.56,1.56,0,0,.5],[.13,1.5,1.5,0,0,.5]],{segments:26,steps:4});
    disc.rotateZ(Math.PI/2);wb.add(disc,(x,y,z)=>Math.hypot(y,z)>1.26?RED:IRON);
    for(let k=0;k<8;k++){
      const a2=k*TAU/8;
      tube(spokes,[[s*.22,Math.cos(a2)*.28,Math.sin(a2)*.28],[s*.2,Math.cos(a2)*.85,Math.sin(a2)*.85],[s*.24,Math.cos(a2)*1.34,Math.sin(a2)*1.34]],[.13,.11,.09],BRASS,{segments:8,steps:10});
    }
    bulb(hub,.5,.7,.7,BRASS,s*.24,0,0,{segments:14,steps:10});
    bulb(hub,.28,.34,.34,STEEL,s*.36,.85,0,{segments:10,steps:8});
    wb.finish(wheel,'loco-red-driver-'+s,bossMetal);spokes.finish(wheel,'loco-brass-spokes-'+s,bossMetal);hub.finish(wheel,'loco-hub-and-crank-'+s,bossMetal);
    wheels.push({wheel,s});
  }
  const boiler=node(pose,'loco-boiler',0,2.6,-.2),drum=assetBatch(),fit=assetBatch(),lamp=assetBatch();
  loft(drum,[[0,.95,1.15,0,0],[.5,1.1,1.3,0,0],[1.5,1.18,1.36,0,0],[2.6,1.2,1.38,0,0],[3.5,1.12,1.28,0,0],[4.2,.9,1.05,0,0],[4.55,.5,.6,0,0],[4.7,.06,.06,0,0]],IRON,0,0,0,{segments:34,steps:24,warp(x,y,z,u,v,a){return[x,y,z+.08*Math.sin(v*Math.PI)*Math.max(0,Math.cos(a))**4];}});
  for(const y of[.9,1.9,2.9])fit.ring(1.26,.09,0,y,0,BRASS);
  bulb(fit,1.0,.8,1.0,BRASS,0,4.15,.1,{segments:16,steps:12});
  fit.cylinder(.12,.7,.5,4.75,.3,BRASS,'y',.12,8);
  for(const s of[-1,1]){
    fit.cylinder(.42,.3,s*.62,3.3,1.42,BRASS,'z',.42,14);
    fit.ring(.44,.07,s*.62,3.3,1.56,STEEL,'z');
    bulb(lamp,.56,.56,.16,0xffd98a,s*.62,3.3,1.6,{segments:12,steps:10});
    tube(fit,[[s*1.2,1.0,1.0],[s*1.3,2.4,1.15],[s*1.26,3.8,1.0]],[.045,.045,.045],BRASS,{segments:6,steps:12});
  }
  panel(fit,[[0,.5],[.7,.36],[.9,0],[.6,-.42],[0,-.52],[-.6,-.42],[-.9,0],[-.7,.36]],0x1c1a20,0,1.15,1.26,.12,.08);
  panel(lamp,[[0,.4],[.55,.28],[.72,0],[.46,-.34],[0,-.42],[-.46,-.34],[-.72,0],[-.55,.28]],0xff9a4a,0,1.15,1.38,.05,.04);
  for(let k=0;k<3;k++)tube(fit,[[-.6,1.0+k*.22,1.34],[.6,1.0+k*.22,1.34]],[.05,.05],BRASS,{segments:6,steps:8});
  drum.finish(boiler,'loco-riveted-boiler',bossMetal);fit.finish(boiler,'loco-brass-fittings',bossMetal);
  const lampMesh=lamp.finish(boiler,'loco-firebox-embers',assetGlow);
  const stackN=node(boiler,'loco-smokestack',0,4.55,-.55),sb=assetBatch();
  loft(sb,[[-.2,.34,.34],[.3,.4,.4],[1.0,.46,.46],[1.3,.62,.62],[1.5,.78,.78]],IRON,0,0,0,{segments:18,steps:10});
  sb.ring(.8,.1,0,1.5,0,BRASS);
  sb.finish(stackN,'loco-flared-stack',bossMetal);
  const puff=assetBatch();
  bulb(puff,1.0,.9,1.0,0x3a3d44,0,0,0,{segments:12,steps:10});
  const puffMesh=puff.finish(stackN,'loco-stack-belch',bossCloth);
  puffMesh.position.y=1.9;
  const arms=[];
  for(const s of[-1,1]){
    const arm=node(boiler,'loco-piston-arm-'+s,s*1.45,2.9,0),b=assetBatch();
    b.cylinder(.3,.5,0,0,0,BRASS,'x',.3,12);
    loft(b,[[-1.7,.4,.5],[-1.1,.46,.56],[-.3,.4,.5],[.4,.3,.38]],IRON,0,0,0,{segments:16,steps:12});
    tube(b,[[0,-.9,.1],[0,-1.9,.15]],[.16,.16],STEEL,{segments:8,steps:8});
    bulb(b,.78,.7,.78,IRON,0,-2.3,.2,{segments:16,steps:12});
    b.ring(.42,.09,0,-2.0,.2,BRASS);
    b.finish(arm,'loco-piston-fist-'+s,bossMetal);arms.push({arm,s});
  }
  return fitBoss(group,pose,3.4,10.2,(t,progress,state={})=>{
    const a=attackPose(progress),chuff=stride(t,state);hit(pose,t,state);
    for(const w of wheels)w.wheel.rotation.x=(state.moving===false||state.stunned)?0:t*2.6;
    boiler.position.y=2.6+Math.abs(chuff)*.06-a*.1;boiler.rotation.x=a*.07;boiler.rotation.z=Math.sin(t*.9)*.018;
    for(const l of arms){l.arm.rotation.x=-.15-a*.95;l.arm.position.z=a*.55;}
    puffMesh.scale.set(.38+a*.95,.34+a*.8,.38+a*.95);puffMesh.position.y=1.9+a*.5;puffMesh.rotation.y=t*.5;
    lampMesh.scale.setScalar(1+Math.sin(t*5)*.03);
  });
}

// World 36 Harvest Fields: patched scarecrow with a sack head, straw hat and curved scythe.
function buildScarecrow(){
  const BURLAP=0xc09a66,STRAW=0xdfba6e,REDF=0x9e4f46,BLUEF=0x4d6699,IRON=0x3d4148,WOOD=0x77552f,ROPE=0x9a8563;
  const {group,pose}=rig('sculpted-scarecrow');
  const frameB=assetBatch();
  tube(frameB,[[0,0,-.9],[0,3.2,-.88],[0,5.4,-.8],[0,7.5,-.72]],[.16,.15,.14,.12],WOOD,{segments:8,steps:16});
  tube(frameB,[[-2.3,5.3,-.78],[0,5.35,-.78],[2.3,5.3,-.78]],[.13,.13,.13],WOOD,{segments:8,steps:14});
  for(const s of[-1,1])frameB.ring(.2,.05,s*1.9,5.3,-.76,ROPE);
  frameB.finish(pose,'scarecrow-weathered-frame',bossShell);
  const legs=[];
  for(const s of[-1,1]){
    const leg=node(pose,'scarecrow-stick-leg-'+s,s*.55,2.4,0),b=assetBatch();
    tube(b,[[0,0,0],[s*.1,-1.0,.05],[s*.22,-2.25,.15]],[.2,.17,.13],WOOD,{segments:8,steps:14});
    for(let k=0;k<4;k++)tube(b,[[s*.2,-2.15+k*.04,.12],[s*(.3+k*.05),-2.4+k*.05,.3+k*.05]],[.09,.03],STRAW,{segments:6,steps:8});
    loft(b,[[-.5,.3,.4,0,.15],[-.25,.38,.5,0,.2],[.2,.4,.52,0,.25],[.45,.3,.44,0,.4],[.52,.1,.24,0,.5]],0x4a3a30,0,-2.12,.1,{segments:16,steps:10});
    b.finish(leg,'scarecrow-stick-leg-'+s,bossShell);legs.push({leg,s});
  }
  const torso=node(pose,'scarecrow-patched-coat',0,2.4,0),coat=assetBatch(),patch=assetBatch(),straw=assetBatch();
  loft(coat,[[-.2,.5,.44,0,0],[.5,.8,.68,0,0],[1.4,1.0,.82,0,0],[2.3,1.08,.88,0,0],[3.0,1.2,1.0,0,0],[3.5,1.3,1.1,0,0]],BURLAP,0,0,0,{segments:26,steps:20,warp(x,y,z,u,v,a){const f=1+.03*Math.sin(a*6+y*3);return[x*f,y,z*f];}});
  coat.ring(1.04,.07,0,.9,0,ROPE);
  panel(patch,[[-.3,.26],[.28,.3],[.34,-.2],[-.24,-.26]],REDF,-.55,1.5,.72,.1,.05,-.15,.2,0);
  panel(patch,[[-.26,.24],[.3,.28],[.24,-.22],[-.3,-.2]],BLUEF,.62,2.3,.68,.1,.05,.12,-.18,0);
  panel(patch,[[-.28,.26],[.28,.24],[.3,-.24],[-.26,-.22]],REDF,.7,3.0,.7,.1,.05,-.1,.15,0);
  panel(patch,[[-.3,.24],[.3,.26],[.26,-.22],[-.3,-.24]],BLUEF,-.68,2.5,-.72,.1,.05,.15,-.2,Math.PI);
  for(let k=0;k<8;k++){
    const a2=k*TAU/8;
    tube(straw,[[Math.sin(a2)*.55,2.35,Math.cos(a2)*.5],[Math.sin(a2)*.85,2.75,Math.cos(a2)*.75]],[.09,.02],STRAW,{segments:6,steps:8});
  }
  coat.finish(torso,'scarecrow-burlap-coat',bossCloth);patch.finish(torso,'scarecrow-faded-patches',bossShell);straw.finish(torso,'scarecrow-straw-tufts',bossSkin);
  const arms=[];
  for(const s of[-1,1]){
    const arm=node(torso,'scarecrow-slack-arm-'+s,s*1.15,2.8,0),b=assetBatch();
    tube(b,[[0,0,0],[s*.5,-.9,.1],[s*.75,-1.8,.3]],[.28,.24,.18],BURLAP,{segments:10,steps:14});
    for(let k=0;k<5;k++)tube(b,[[s*.72,-1.7,.28],[s*(.85+(k%3)*.1),-2.15-(k%2)*.15,.4+(k%3)*.08]],[.08,.02],STRAW,{segments:6,steps:8});
    bulb(b,.42,.5,.4,STRAW,s*.8,-2.3,.35,{segments:12,steps:10});
    b.finish(arm,'scarecrow-slack-arm-'+s,bossCloth);arms.push({arm,s});
  }
  const scythe=node(arms[1].arm,'scarecrow-scythe',.8,-2.3,.35),sb2=assetBatch();
  scythe.rotation.set(0,-.4,-.28);
  tube(sb2,[[0,0,0],[.3,1.6,.1],[.45,3.2,.2]],[.09,.08,.07],WOOD,{segments:8,steps:14});
  const bladePts=[];for(let j=0;j<=10;j++){const v=j/10;bladePts.push([.45+v*1.9,3.2+Math.sin(v*1.9)*1.1,.2+Math.sin(v*1.9)*.35]);}
  tube(sb2,bladePts,Array.from({length:11},(_,j)=>.3*(1-j/10*.92)),IRON,{segments:6,steps:14,flatten:.25});
  sb2.finish(scythe,'scarecrow-curved-scythe',bossMetal);
  const head=node(torso,'scarecrow-sack-head',0,3.75,.05),sack=assetBatch(),stitch=assetBatch(),gleam=assetBatch();
  const sackG=loftGeometry([[.95,.5,.42,0,0],[.55,.98,.9,0,0],[.05,1.12,1.05,0,0],[-.45,1.0,.94,0,0],[-.85,.6,.52,0,0]],{segments:26,steps:18,warp(x,y,z,u,v,a){const f=1+.035*Math.sin(a*7+y*6);return[x*f,y,z*f];}});
  sack.add(sackG,BURLAP);
  sack.ring(.52,.06,0,.88,0,ROPE);
  for(const s of[-1,1]){
    bulb(sack,.36,.36,.12,0x3a3026,s*.42,.12,.95,{segments:10,steps:8});
    bulb(gleam,.15,.21,.06,0xffc46a,s*.42,.12,1.03,{segments:8,steps:6});
  }
  panel(stitch,[[-.55,0],[-.25,.1],[.25,.1],[.55,0],[.4,-.12],[0,-.16],[-.4,-.12]],0x4a3020,0,-.42,.95,.05,.04);
  for(let k=0;k<4;k++)tube(stitch,[[-.36+k*.24,-.3,1.0],[-.3+k*.24,-.54,.98]],[.03,.03],0xe8d9b0,{segments:6,steps:6});
  panel(stitch,[[0,.14],[.16,.08],[.12,-.1],[-.12,-.1],[-.16,.08]],REDF,0,-.08,1.02,.06,.04);
  sack.finish(head,'scarecrow-burlap-sack',bossCloth);stitch.finish(head,'scarecrow-stitched-grin',bossShell);gleam.finish(head,'scarecrow-ember-eyes',assetGlow);
  const hat=node(head,'scarecrow-straw-hat',0,.95,-.05),hatb=assetBatch();
  const brim=loftGeometry([[-.05,1.7,1.55],[0,1.78,1.62],[.06,1.66,1.5]],{segments:30,steps:4,warp(x,y,z){const r=Math.hypot(x/1.78,z/1.62);return[x,y-.16*r*r,z];}});
  hatb.add(brim,0xe3c37a,0,.02,0);
  loft(hatb,[[.02,.62,.56],[.4,.6,.54],[.85,.52,.48],[1.0,.3,.28],[1.05,.05,.05]],0xe3c37a,0,0,0,{segments:24,steps:12});
  tube(hatb,loopPath(.66,.3,16),[.09,.09],REDF,{segments:8,steps:20});
  hatb.finish(hat,'scarecrow-limp-straw-hat',bossCloth);
  const crow=node(pose,'scarecrow-hitched-crow',1.35,5.4,-.55),cb=assetBatch();
  bulb(cb,.5,.44,.62,0x23262e,0,0,0,{segments:12,steps:10});
  bulb(cb,.34,.32,.34,0x23262e,.14,.3,.22,{segments:10,steps:8});
  tube(cb,[[.28,.3,.38],[.46,.26,.56]],[.05,.01],0x9a8a5a,{segments:6,steps:6});
  for(let k=0;k<3;k++)tube(cb,[[-.2-k*.06,.05,-.3],[-.42-k*.08,-.02-k*.03,-.62-k*.05]],[.06,.01],0x1d1f26,{segments:6,steps:6});
  bulb(cb,.14,.09,.4,0x2c2f38,-.26,.06,-.05,{segments:8,steps:6});
  bulb(cb,.14,.09,.4,0x2c2f38,.26,.06,-.05,{segments:8,steps:6});
  cb.finish(crow,'scarecrow-hitched-crow',bossShell);
  return fitBoss(group,pose,3.0,9.6,(t,progress,state={})=>{
    const a=attackPose(progress),step=stride(t,state);hit(pose,t,state);
    torso.rotation.y=a*.2+Math.sin(t*.5)*.03;torso.rotation.x=a*.06;torso.position.y=2.4+Math.abs(step)*.04;
    for(const l of legs)l.leg.rotation.x=l.s*step*.07;
    arms[1].arm.rotation.x=-a*1.25;arms[1].arm.rotation.z=-.15-a*.5;
    arms[0].arm.rotation.x=-a*.3+Math.sin(t*1.1)*.04;arms[0].arm.rotation.z=.18+a*.3;
    head.rotation.z=Math.sin(t*.7)*.04-a*.08;head.rotation.x=a*.05;
    hat.rotation.z=.06-a*.05;
    crow.rotation.x=Math.sin(t*1.3)*.06;crow.rotation.y=Math.sin(t*.9)*.08;
  });
}

export function buildSculptedCarnival(type){
  switch(type){
    case 'jack':return buildJack();
    case 'flipper':return buildFlipper();
    case 'ringmaster':return buildRingmaster();
    case 'mesmer':return buildMesmer();
    case 'locomotive':return buildLocomotive();
    case 'scarecrow':return buildScarecrow();
    default:return null;
  }
}
