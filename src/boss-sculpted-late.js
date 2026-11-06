import * as THREE from 'three';
import { assetBatch, assetGlow, attackPose } from './asset-kit.js';
import { loftGeometry, headGeometry, sweepGeometry, patchGeometry, clothGeometry, crownGeometry, fitBoss, bossSkin, bossMetal, bossCloth, bossShell } from './boss-shapes.js';

const C={ink:0x181c30,steel:0x8396a8,gold:0xdba94b,ivory:0xffe7bd,red:0xb9364c,cyan:0x8ee9e9};
const TAU=Math.PI*2;
function node(parent,name,x=0,y=0,z=0){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
function rig(name){const group=new THREE.Group();group.name=name;return{group,pose:node(group,name+'-pose')};}
function walk(t,state){return state.moving===false||state.stunned?0:Math.sin(t*3.3);}
function hit(pose,t,state){pose.rotation.z=Math.sin(t*31)*Math.min(1,state.hit||0)*.035;pose.position.z=-(state.hit||0)*.1;}
function loft(batch,sections,color,x=0,y=0,z=0,options={}){return batch.add(loftGeometry(sections,{segments:24,steps:22,...options}),color,x,y,z);}
function tube(batch,points,radii,color,options={}){return batch.add(sweepGeometry(points,radii,{segments:10,steps:18,...options}),color);}
function panel(batch,outline,color,x=0,y=0,z=0,bulge=.2,depth=.12,rx=0,ry=0,rz=0){return batch.add(patchGeometry(outline,depth,bulge,{segments:24,rings:5}),color,x,y,z,rx,ry,rz);}
function bulb(batch,w,h,d,color,x=0,y=0,z=0,options={}){
  return loft(batch,[[-h*.5,.01,.01],[-h*.4,w*.3,d*.3],[-h*.15,w*.49,d*.48],[h*.18,w*.47,d*.5],[h*.4,w*.28,d*.32],[h*.5,.01,.01]],color,x,y,z,options);
}
function eye(surface,glow,x,y,z,size=.55,color=C.cyan,tilt=0){
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
function shapedLeg(parent,name,s,x,y,color,boot=C.ink,length=y-.06){
  const g=node(parent,name,s*x,y,0),b=assetBatch();
  loft(b,[[-length,.53,.83,0,.38],[-length+.22,.65,.96,0,.34],[-length+.58,.56,.65,0,.16],[-length+.95,.42,.44],[-length*.48,.48,.5,0,.02],[-length*.22,.56,.56,0,-.02],[.14,.45,.47]],color);
  panel(b,[[-.48,.25],[.48,.25],[.57,-.3],[.4,-.52],[-.4,-.52],[-.57,-.3]],boot,0,-length+.57,.75,.16,.08);
  b.finish(g,name+'-sculpt',bossShell);return g;
}
function shapedArm(parent,name,s,x,y,length,color,trim){
  const g=node(parent,name,s*x,y,0),b=assetBatch();
  loft(b,[[-length,.38,.42,0,.3],[-length+.35,.54,.55,0,.22],[-length*.6,.49,.48,0,.12],[-length*.43,.37,.38],[-length*.23,.58,.6,0,-.03],[.16,.51,.54]],color);
  panel(b,[[-.66,.08],[-.45,.55],[.35,.64],[.73,.18],[.48,-.35],[-.39,-.38]],trim,0,-.05,.3,.28,.13);
  fingerHand(b,0,-length-.1,.27,.72,0x3a3444);
  b.finish(g,name+'-sculpt',bossShell);return g;
}
function striped(g,a,b,period=.38){
  const p=g.attributes.position,colors=[],ca=new THREE.Color(a),cb=new THREE.Color(b);
  for(let i=0;i<p.count;i++){const c=Math.floor((p.getY(i)+20)/period)%2?ca:cb;colors.push(c.r,c.g,c.b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;
}

function buildKraken(){
  const {group,pose}=rig('sculpted-kraken'),head=node(pose,'kraken-flowing-mantle',0,5.1,-.25);
  const skin=assetBatch(),face=assetBatch(),gleam=assetBatch();
  loft(skin,[[-1.75,1.25,1.05,0,.3],[-1.25,2.05,1.45,0,.15],[0,2.15,1.64],[1.8,1.84,1.43,0,-.1],[3.55,1.18,.95,0,-.25],[4.55,.22,.25,0,-.4],[4.7,.01,.01,0,-.4]],0xb94c79,0,0,0,{segments:36,steps:32,warp(x,y,z,u,v,a){const f=1+.035*Math.sin(a*7+v*3);return[x*f,y,z*f];}});
  for(const s of[-1,1]){
    panel(skin,[[0,-.5],[s*.55,.25],[s*.97,2.9],[s*.25,3.8],[0,1.2]],0x82436c,s*1.12,.25,-.9,.25,.13,0,s*.22);
    eye(face,gleam,s*.96,-.65,1.54,.96,0xa8ffec,-s*.08);
    tube(skin,[[s*.35,.15,1.62],[s*.72,.32,1.65],[s*1.35,.12,1.4]],[.19,.22,.1],0x87355d,{segments:10,steps:12});
  }
  panel(face,[[-.45,.3],[0,.7],[.45,.3],[.32,-.23],[0,-.61],[-.29,-.2]],0x3d243e,0,-1.35,1.4,.35,.16);
  panel(face,[[-.19,.2],[.18,.15],[.32,-.35],[0,-.62],[-.28,-.25]],0xd5a987,0,-1.61,1.83,.2,.1);
  skin.finish(head,'kraken-sculpted-hide',bossSkin);face.finish(head,'kraken-facial-anatomy',bossSkin);gleam.finish(head,'kraken-eye-catches',assetGlow);
  const limbs=[];
  for(let k=0;k<8;k++){
    const a=k*TAU/8,arm=node(pose,'kraken-arm-'+k,Math.sin(a)*1.25,3.05,Math.cos(a)*1.03);
    arm.rotation.y=a;
    const b=assetBatch();
    tube(b,[[0,0,0],[0,-.18,.65],[0,-.65,1.38],[0,-1.45,2.05]],[.55,.51,.38,.27],k%2?0xcc648b:0xae4772,{segments:12,steps:24,flutes:.035});
    for(let j=0;j<4;j++){
      const z=.42+j*.42,y=-.08-j*.24;
      b.ring(.19-j*.018,.065,0,y-.2,z,0xf2c1ae,'y');
      bulb(b,.2,.05,.2,0x7b3a60,0,y-.22,z,{segments:8,steps:6});
    }
    b.finish(arm,'kraken-tapered-arm-'+k,bossSkin);
    const hook=node(arm,'kraken-curl-'+k,0,-1.45,2.05),tip=assetBatch();
    tube(tip,[[0,0,0],[.08,-.66,.4],[.2,-.99,1.03],[.29,-.62,1.56],[.2,.05,1.45],[.05,.23,1.15]],[.28,.24,.18,.12,.07,.012],0xbf5680,{segments:12,steps:25});
    for(let j=0;j<3;j++)tip.ring(.13-j*.025,.045,.12,-.5-j*.13,.39+j*.35,0xf5c8b4,'y');
    tip.finish(hook,'kraken-sculpted-curl-'+k,bossSkin);limbs.push({arm,hook,a});
  }
  return fitBoss(group,pose,3.3,10,(t,progress,state={})=>{
    const a=attackPose(progress),live=!state.stunned;hit(pose,t,state);
    head.position.y=5.1+Math.sin(t*1.7)*.07-a*.18;head.rotation.x=-a*.12;head.scale.y=1+Math.sin(t*1.7)*.018;
    for(const l of limbs){l.arm.rotation.x=(live?Math.sin(t*1.8+l.a)*.09:0)-a*.22;l.arm.rotation.z=live?Math.cos(t*1.4+l.a)*.07:0;l.hook.rotation.x=(live?Math.sin(t*2+l.a+.7)*.15:0)-a*.18;}
  });
}

function buildPumpkin(){
  const {group,pose}=rig('sculpted-pumpkin'),body=node(pose,'pumpkin-draped-robes');
  const robe=assetBatch();
  loft(robe,[[.14,1.85,1.37],[.7,1.95,1.42],[2.5,1.53,1.2],[4.6,1.18,.86],[5.4,1.55,1.0],[5.8,1.52,.85],[5.95,.7,.55]],0x423350,0,0,0,{segments:40,steps:30,warp(x,y,z,u,v,a){const f=1+.065*Math.cos(a*9)*(1-v*.5);return[x*f,y+.09*Math.sin(a*7)**2*(1-v)**7,z*f];}});
  for(const s of[-1,1])panel(robe,[[0,0],[s*.85,.6],[s*1.4,-.5],[s*.65,-1.8],[s*.1,-1.45]],0x6c4a66,s*.2,5.6,.9,.16,.08,0,s*.2);
  robe.add(clothGeometry(2.8,4.95,{folds:7,flare:.35,depth:.19,segments:24,steps:22}),0x2e2944,0,5.35,-1.1);
  for(let k=0;k<4;k++)robe.ring(.14,.045,0,2.0+k*.78,1.31-k*.06,C.gold,'z');
  robe.finish(body,'pumpkin-continuous-folded-cloak',bossCloth);
  const head=node(pose,'pumpkin-carved-head',0,7.7,.12),rind=assetBatch(),cavity=assetBatch(),glow=assetBatch();
  loft(rind,[[-1.46,.24,.23],[-1.27,1.15,1.05],[-.6,1.74,1.47],[.35,1.76,1.5],[1.1,1.23,1.09],[1.43,.45,.42],[1.48,.08,.08]],0xe88c36,0,0,0,{segments:54,steps:30,warp(x,y,z,u,v,a){const f=1+.075*Math.cos(a*9);return[x*f,y,z*f];}});
  tube(rind,[[0,1.35,0],[.08,1.83,-.05],[.35,2.08,-.2],[.55,2.15,-.33]],[.29,.24,.15,.025],0x5d7644,{segments:12,steps:16,flutes:.05});
  rind.add(crownGeometry(1.0,.9,5),C.gold,0,1.18,-.1);
  for(const s of[-1,1]){
    const outline=[[-.48,-.22],[.03,.34],[.5,-.21],[.1,-.14]];
    panel(cavity,outline,0x3a2534,s*.65,.31,1.48,.04,.1,0,0,-s*.2);
    panel(glow,outline.map(([x,y])=>[x*.72,y*.68]),0xffd76b,s*.65,.31,1.57,.025,.05,0,0,-s*.2);
  }
  panel(cavity,[[-1.08,.18],[-.73,-.18],[-.33,-.02],[0,-.28],[.36,-.04],[.72,-.19],[1.1,.2],[.7,-.62],[0,-.8],[-.69,-.62]],0x362334,0,-.47,1.4,.03,.08);
  panel(glow,[[-.85,-.04],[-.52,-.31],[-.2,-.18],[.1,-.4],[.36,-.2],[.76,-.1],[.56,-.48],[0,-.6],[-.53,-.46]],0xffbc52,0,-.48,1.49,.01,.045);
  rind.finish(head,'pumpkin-lobed-rind',bossSkin);cavity.finish(head,'pumpkin-carved-recesses',bossSkin);glow.finish(head,'pumpkin-inner-lantern',assetGlow);
  const arms=[];
  for(const s of[-1,1]){
    const arm=node(pose,'pumpkin-vine-arm-'+s,s*1.38,5.2,0),b=assetBatch();
    tube(b,[[0,0,0],[s*.55,-.45,.1],[s*.7,-1.15,.12],[s*.8,-1.8,.58]],[.45,.42,.3,.15],0x514054,{segments:12,steps:20,flutes:.05});
    for(let j=0;j<3;j++)tube(b,[[s*.8,-1.8,.58],[s*(.63+j*.19),-2.2,.79],[s*(.48+j*.25),-2.48,1.1],[s*(.47+j*.24),-2.4,1.32]],[.115,.1,.065,.01],0x9a9a67,{segments:8,steps:12});
    b.finish(arm,'pumpkin-sinewed-branch-'+s,bossSkin);arms.push({arm,s});
  }
  const lamp=node(arms[1].arm,'pumpkin-hand-lamp',.8,-2.9,.75),cage=assetBatch(),flame=assetBatch();
  loft(cage,[[-.65,.37,.37],[-.49,.6,.6],[-.37,.5,.5]],C.gold,0,0,0,{segments:12,steps:8});
  loft(cage,[[.43,.5,.5],[.58,.62,.62],[.72,.2,.2]],C.gold,0,0,0,{segments:12,steps:8});
  for(let k=0;k<6;k++){const a=k*TAU/6;tube(cage,[[Math.sin(a)*.48,-.4,Math.cos(a)*.48],[Math.sin(a)*.56,0,Math.cos(a)*.56],[Math.sin(a)*.48,.49,Math.cos(a)*.48]],[.045,.05,.045],0x30293c,{segments:6,steps:8});}
  cage.ring(.3,.06,0,.98,0,C.ink,'z');
  loft(flame,[[-.36,.06,.06],[-.14,.27,.25],[.22,.18,.18],[.5,.015,.015,0,.08]],0xffc35a,0,0,.03,{segments:12,steps:14});
  cage.finish(lamp,'pumpkin-lamp-frame',bossMetal);flame.finish(lamp,'pumpkin-living-flame',assetGlow);
  return fitBoss(group,pose,3,11,(t,progress,state={})=>{
    const a=attackPose(progress);hit(pose,t,state);body.rotation.y=Math.sin(t*.8)*.025;
    head.rotation.set(-a*.15,Math.sin(t*.65)*.06,Math.sin(t*1.2)*.035);
    for(const l of arms){l.arm.rotation.x=-a*(l.s>0?.5:.85)+Math.sin(t*1.3+l.s)*.05;l.arm.rotation.z=l.s*(.08+a*.07);}
    lamp.rotation.x=Math.sin(t*1.6)*.09+a*.2;
  });
}

function buildDrill(){
  const {group,pose}=rig('sculpted-foundry-drill'),base=assetBatch();
  for(const s of[-1,1]){
    loft(base,[[.1,.56,1.54],[.24,.76,1.95],[.75,.8,1.97],[1.15,.67,1.74],[1.28,.47,1.4]],0x29303c,s*1.8,0,-.1,{segments:20,steps:14});
    for(let k=0;k<6;k++)base.cylinder(.4,1.34,s*1.8,.57,-1.55+k*.58,0x8699a3,'x',.4,10);
    for(let k=0;k<9;k++)panel(base,[[-.23,.12],[.23,.12],[.2,-.12],[-.2,-.12]],0x5b6370,s*1.8,.16,-1.5+k*.36,.02,.035,Math.PI/2);
  }
  base.finish(pose,'drill-rounded-tread-pods',bossMetal);
  const cabin=node(pose,'drill-cast-cabin',0,1.35,0),body=assetBatch(),lit=assetBatch();
  loft(body,[[0,1.25,.96],[.3,1.83,1.36],[1.5,1.92,1.6],[3.1,1.75,1.42],[4.13,1.48,1.18],[4.65,.68,.6],[4.7,.08,.08]],0xb7853d,0,0,0,{segments:32,steps:26,warp(x,y,z,u,v,a){return[x,y,z+.1*Math.sin(v*Math.PI)*Math.max(0,Math.cos(a))**4];}});
  panel(body,[[-1.4,.24],[-.8,.55],[.8,.55],[1.4,.24],[1.2,-.32],[-1.2,-.32]],C.ink,0,3.1,1.4,.11,.09);
  panel(lit,[[-1.1,.11],[-.65,.24],[.65,.24],[1.1,.11],[.85,-.08],[-.85,-.08]],0xffd47a,0,3.13,1.56,.05,.04);
  for(const s of[-1,1]){
    panel(body,[[0,.6],[.7,.4],[.66,-.45],[0,-.8],[-.54,-.33],[-.6,.4]],0xd6aa60,s*1.18,1.8,1.12,.18,.09,0,s*.2);
    tube(body,[[s*.8,3.8,-.8],[s*.9,5.0,-.9],[s*1.08,5.95+(s>0?.4:0),-.82]],[.28,.24,.22],C.ink,{segments:12,steps:14});
    body.ring(.29,.085,s*1.08,5.95+(s>0?.4:0),-.82,0xa6aeb0);
  }
  body.finish(cabin,'drill-poured-brass-hull',bossMetal);lit.finish(cabin,'drill-curved-viewport',assetGlow);
  const arms=[];
  for(const s of[-1,1]){
    const arm=node(cabin,'drill-swivel-'+s,s*1.85,2.0,.1),shell=assetBatch();
    loft(shell,[[-.65,.48,.62],[-.25,.75,.93],[.45,.72,.88],[.95,.37,.56],[1.05,.06,.1]],0x977139,0,0,.3,{segments:20,steps:18});
    tube(shell,[[0,0,.4],[s*.1,-.08,1.06],[s*.13,-.05,1.78]],[.5,.49,.45],C.ink,{segments:16,steps:14});
    shell.ring(.53,.13,s*.13,-.05,1.68,C.gold,'z');shell.finish(arm,'drill-contoured-gearcase-'+s,bossMetal);
    const spindle=node(arm,'drill-helical-bit-'+s,s*.13,-.05,1.75),tip=assetBatch();
    const bit=loftGeometry([[0,.56,.56],[.5,.56,.56],[1.3,.4,.4],[2.1,.21,.21],[2.7,.015,.015]],{segments:20,steps:20});bit.rotateX(Math.PI/2);tip.add(bit,0x91a0ad);
    for(let flank=0;flank<2;flank++){
      const points=[];for(let j=0;j<=26;j++){const z=j/26*2.55,a=j/26*TAU*2.2+flank*Math.PI,r=.56*(1-z/2.8);points.push([Math.sin(a)*r,Math.cos(a)*r,z]);}
      tube(tip,points,Array.from({length:points.length},(_,i)=>.105*(1-i/points.length*.75)),0xe2ba64,{segments:6,steps:45});
    }
    tip.finish(spindle,'drill-forged-cutting-flutes-'+s,bossMetal);arms.push({arm,spindle,s});
  }
  return fitBoss(group,pose,3.4,9,(t,progress,state={})=>{
    const a=attackPose(progress),stride=walk(t,state);hit(pose,t,state);cabin.rotation.y=Math.sin(t*.65)*.045;
    cabin.position.y=1.35+Math.abs(stride)*.035;
    for(const l of arms){l.arm.rotation.x=-a*.34+l.s*stride*.025;l.arm.position.z=.1+a*.38;l.spindle.rotation.z=state.stunned?0:t*11+a*3;}
  });
}

function dieShape(size){
  const r=size*.5;return loftGeometry([[-r,.04,.04,0,0,.38],[-r*.92,r*.8,r*.8,0,0,.38],[-r*.69,r,r,0,0,.38],[r*.69,r,r,0,0,.38],[r*.92,r*.8,r*.8,0,0,.38],[r,.04,.04,0,0,.38]],{segments:28,steps:22});
}
function buildDice(){
  const {group,pose}=rig('sculpted-dice-lord'),feet=[];
  for(const s of[-1,1])feet.push({leg:shapedLeg(pose,'dice-silk-spat-'+s,s,1.05,1.45,0xbc3a50,0x772f43,1.39),s});
  const body=node(pose,'dice-carved-body',0,4.05,0),b=assetBatch(),gold=assetBatch(),gleam=assetBatch();
  b.add(dieShape(4.1),0xf6ecd8);
  for(const s of[-1,1]){
    eye(b,gleam,s*.86,.47,2.03,.64,0xffecc5,-s*.08);
    tube(gold,[[s*1.75,-1.68,1.55],[s*1.9,-.7,1.85],[s*1.9,.8,1.85],[s*1.75,1.69,1.55]],[.075,.075,.075,.075],C.gold,{segments:8,steps:18});
    for(const y of[-.7,.1,.9]){
      b.cylinder(.24,.045,s*2.03,y,s*.55,C.ink,'x',.24,14);
      b.ring(.23,.035,s*2.05,y,s*.55,0xab9c88,'x');
    }
  }
  panel(b,[[-.76,.1],[-.4,-.1],[0,-.15],[.42,-.08],[.77,.16],[.48,-.43],[-.4,-.43]],0x5a3342,0,-.62,2.05,.03,.06);
  for(let k=0;k<3;k++)bulb(b,.23,.12,.08,C.gold,-.33+k*.33,-.84,2.13,{segments:8,steps:6});
  gold.add(crownGeometry(1.15,1.05,7),C.gold,0,2.0,-.04);
  b.finish(body,'dice-rounded-carved-ivory',bossShell);gold.finish(body,'dice-rolled-gold-edges',bossMetal);gleam.finish(body,'dice-eye-glints',assetGlow);
  const arms=[];
  for(const s of[-1,1]){
    const arm=node(pose,'dice-dealer-arm-'+s,s*2.1,4.35,0),a=assetBatch();
    tube(a,[[0,0,0],[s*.54,-.38,.1],[s*.63,-1.02,.44]],[.27,.29,.23],0xb43650,{segments:12,steps:16});
    fingerHand(a,s*.65,-1.18,.45,.68,0xe9d7b8);a.ring(.33,.09,s*.61,-.91,.37,C.gold,'y');
    a.finish(arm,'dice-sculpted-glove-'+s,bossSkin);arms.push({arm,s});
  }
  const dice=[];
  for(let k=0;k<3;k++){
    const d=node(pose,'dice-orbit-'+k),db=assetBatch();db.add(dieShape(.75),k===1?0xbb3450:0xe9deca);
    for(const s of[-1,1])for(const y of[-.15,.15])db.cylinder(.066,.02,s*.15,y,.38,k===1?C.ivory:C.ink,'z',.066,8);
    db.cylinder(.07,.02,0,.38,0,C.gold,'y',.07,8);db.finish(d,'dice-orbit-ivory-'+k,bossShell);dice.push(d);
  }
  return fitBoss(group,pose,3.2,9.5,(t,progress,state={})=>{
    const a=attackPose(progress),stride=walk(t,state);hit(pose,t,state);body.rotation.y=Math.sin(t*.9)*.07;body.position.y=4.05+Math.abs(stride)*.065+a*.25;
    for(const l of feet)l.leg.rotation.x=l.s*stride*.12;
    for(const l of arms){l.arm.rotation.x=-a*.65;l.arm.rotation.z=-l.s*(.1+a*.2);}
    dice.forEach((d,k)=>{const p=t*1.5+k*TAU/3;d.position.set(Math.cos(p)*2.1,7.9+Math.sin(p*2)*.65,Math.sin(p)*1.1);d.rotation.set(p,p*.7,p*.3);});
  });
}

function buildCommander(){
  const {group,pose}=rig('sculpted-commander'),legs=[];
  for(const s of[-1,1])legs.push({leg:shapedLeg(pose,'commander-riding-boot-'+s,s,.92,2.9,0x563344,0x292b3a,2.84),s});
  const torso=node(pose,'commander-tailored-body',0,2.9,0),body=assetBatch(),metal=assetBatch();
  loft(body,[[0,1.05,.8],[.52,1.23,.92],[1.5,1.52,1.04],[2.65,1.8,1.09],[3.2,1.59,.9],[3.5,.73,.52]],0xa9364b);
  panel(body,[[-1.2,.9],[-.9,1.3],[.45,1.1],[1.3,.56],[1.12,-.8],[.2,-1.2],[-1.2,-.75]],0xc14a59,0,1.95,.96,.26,.09);
  body.add(clothGeometry(2.3,3.0,{folds:5,flare:.45,depth:.13,segments:18,steps:18}),0x753043,0,2.95,-.95);
  tube(metal,[[-.55,.35,1.01],[-.63,1.4,1.2],[-.9,2.8,1.05]],[.075,.075,.075],C.gold,{segments:8,steps:14});
  for(let k=0;k<3;k++)panel(metal,[[-.26,.07],[.26,.07],[.23,-.07],[-.23,-.07]],k%2?C.ivory:C.gold,.65,2.3-k*.28,1.26,.025,.035);
  body.finish(torso,'commander-fitted-breastcoat',bossCloth);metal.finish(torso,'commander-braided-trim',bossMetal);
  const head=node(torso,'commander-sculpted-face',0,4.12,.05),h=assetBatch(),cap=assetBatch(),shine=assetBatch();
  h.add(headGeometry(1.85,2.05,1.55,{snout:.18,brow:.16,cheeks:.12,jaw:.84}),0xb97964);
  eye(h,shine,-.41,.16,.81,.49,0xffe8b0,.13);eye(h,shine,.41,.16,.81,.49,0xffe8b0,-.13);
  tube(h,[[-.48,-.42,.9],[0,-.51,1.04],[.48,-.42,.9]],[.06,.075,.06],0x5b3c42,{segments:8,steps:12});
  loft(cap,[[.72,.76,.69],[.86,1.13,.89],[1.02,1.08,.87],[1.52,.95,.75,0,-.13],[1.72,.45,.36,0,-.17]],0x9d2f45,0,0,0,{segments:28,steps:16,warp(x,y,z){return[x,y+.1*x,z];}});
  panel(cap,[[-.9,.15],[-.65,.34],[.65,.34],[.9,.15],[.72,-.15],[-.72,-.15]],C.ink,0,.8,.76,.38,.09,.12);
  panel(cap,[[-.19,.2],[.19,.2],[.29,-.07],[0,-.26],[-.29,-.07]],C.gold,0,1.28,.75,.09,.08);
  h.finish(head,'commander-cheeks-and-brow',bossSkin);cap.finish(head,'commander-curved-officer-cap',bossMetal);shine.finish(head,'commander-eye-catches',assetGlow);
  const arms=[];
  for(const s of[-1,1])arms.push({arm:shapedArm(torso,'commander-arm-'+s,s,1.75,2.85,2.45,0xa9364b,C.gold),s});
  const gun=node(torso,'commander-shoulder-artillery',1.55,3.15,-.26),g=assetBatch();
  const housing=loftGeometry([[-1.1,.28,.35],[-.85,.66,.62],[.5,.68,.58],[1.05,.46,.4],[1.18,.24,.25]],{segments:20,steps:16});housing.rotateX(Math.PI/2);g.add(housing,0x344050,0,0,.3);
  for(const s of[-1,1]){g.cylinder(.25,2.1,s*.31,-.03,1.2,C.ink,'z',.3,14);g.ring(.29,.09,s*.31,-.03,2.26,C.gold,'z');g.cylinder(.16,.025,s*.31,-.03,2.29,0x080d16,'z',.16,12);}
  g.finish(gun,'commander-cast-twin-cannon',bossMetal);
  return fitBoss(group,pose,3,10.4,(t,progress,state={})=>{
    const a=attackPose(progress),stride=walk(t,state);hit(pose,t,state);torso.position.y=2.9+Math.abs(stride)*.05;
    for(const l of legs)l.leg.rotation.x=l.s*stride*.11;
    for(const l of arms)l.arm.rotation.x=-l.s*stride*.08-a*(l.s<0?.8:.2);
    head.rotation.y=Math.sin(t*.62)*.07;gun.position.z=-.26-a*.23;gun.rotation.x=-a*.08;
  });
}

function buildSpider(){
  const {group,pose}=rig('sculpted-crystal-spider'),body=node(pose,'spider-continuous-carapace',0,3.35,-.6),chitin=assetBatch(),face=assetBatch(),glow=assetBatch();
  const shell=loftGeometry([[-2.55,.04,.04],[-2.1,1.18,1.05],[-1.2,2.13,1.56],[.0,2.14,1.4],[.9,1.47,.95],[1.6,1.32,.86],[2.15,.97,.64],[2.55,.12,.12]],{segments:36,steps:30,warp(x,y,z,u,v,a){const dorsal=Math.max(0,-Math.cos(a))**3;return[x*(1+.025*Math.sin(y*4)),y,z-dorsal*.13*Math.sin(v*Math.PI*5)**2];}});shell.rotateX(Math.PI/2);chitin.add(shell,0x59416b);
  for(const s of[-1,1]){
    tube(chitin,[[s*.25,1.31,-1.8],[s*1.2,1.35,-1.15],[s*1.65,1.08,-.25],[s*1.0,.76,.85]],[.085,.1,.09,.025],0x9b739d,{segments:8,steps:16});
    eye(face,glow,s*.43,-.06,2.34,.59,0xffc5f0,-s*.16);
    for(let k=0;k<2;k++){
      bulb(face,.3,.31,.15,C.ink,s*(.91+k*.2),.25+k*.24,2.12-k*.23,{segments:10,steps:8});
      bulb(glow,.2,.21,.12,0xf3a1d8,s*(.91+k*.2),.25+k*.24,2.2-k*.23,{segments:10,steps:8});
    }
    tube(chitin,[[s*.43,-.42,2.07],[s*.64,-.78,2.45],[s*.6,-1.16,2.54],[s*.29,-1.32,2.4]],[.22,.21,.12,.01],0xe1d5bd,{segments:10,steps:18});
  }
  const crystals=assetBatch();
  for(let k=0;k<7;k++){
    const a=k*2.4,x=Math.sin(a)*1.03,z=-1.0+Math.cos(a)*.95,h=1.65+(k%3)*.4;
    const shard=loftGeometry([[0,.22,.24],[h*.22,.36,.33],[h*.65,.31,.26],[h,.01,.01]],{segments:6,steps:7});
    crystals.add(shard,k%2?0x85c3d6:0xc0e6e8,x,1.12,z,0,0,-x*.23);
  }
  chitin.finish(body,'spider-sculpted-chitin',bossShell);crystals.finish(body,'spider-grown-crystal-spines',bossMetal);face.finish(body,'spider-eye-sockets',bossSkin);glow.finish(body,'spider-six-living-eyes',assetGlow);
  const legs=[];
  for(const s of[-1,1])for(let k=0;k<4;k++){
    const spread=(1.5-k)*.42,hip=node(pose,'spider-curved-hip-'+s+'-'+k,s*1.15,3.28,.95-k*.95),upper=assetBatch();
    tube(upper,[[0,0,0],[s*.7,.5,spread*.2],[s*1.45,1.0,spread*.65],[s*1.9,.91,spread]],[.29,.34,.28,.18],0x4f3a61,{segments:12,steps:18,flutes:.05});
    tube(upper,[[s*.3,.37,spread*.1],[s*.98,.98,spread*.45],[s*1.67,1.06,spread*.8]],[.12,.15,.025],0x9b77a9,{segments:8,steps:12});
    upper.finish(hip,'spider-curved-thigh-'+s+'-'+k,bossShell);
    const knee=node(hip,'spider-hooked-knee-'+s+'-'+k,s*1.9,.91,spread),lower=assetBatch();
    tube(lower,[[0,0,0],[s*.27,-.82,spread*.08],[s*.51,-2.25,spread*.18],[s*.72,-3.89,spread*.25],[s*.91,-4.01,spread*.25+.05]],[.22,.29,.19,.08,.012],0x342a45,{segments:12,steps:22,flutes:.035});
    tube(lower,[[s*.1,-.25,.07],[s*.29,-1.08,.11],[s*.42,-2.2,.14]],[.09,.13,.025],0x8c72a5,{segments:8,steps:12});
    lower.finish(knee,'spider-curved-shin-'+s+'-'+k,bossShell);legs.push({hip,knee,s,k});
  }
  return fitBoss(group,pose,3.6,8.5,(t,progress,state={})=>{
    const a=attackPose(progress),active=state.moving!==false&&!state.stunned;hit(pose,t,state);body.position.y=3.35+(active?Math.sin(t*5)*.04:0)-a*.22;body.rotation.x=-a*.1;
    for(const l of legs){const p=active?Math.sin(t*4.8+l.k*1.5+(l.s>0?Math.PI:0)):0;l.hip.rotation.x=p*.12;l.hip.rotation.z=l.s*a*.07;l.knee.rotation.z=l.s*Math.max(0,p)*.065-l.s*a*.07;}
  });
}

function buildPharaoh(){
  const {group,pose}=rig('sculpted-pharaoh'),legs=[];
  for(const s of[-1,1])legs.push({leg:shapedLeg(pose,'pharaoh-wrapped-calf-'+s,s,.73,2.9,0xc8b68b,0xbd954c,2.84),s});
  const body=node(pose,'pharaoh-wrapped-anatomy',0,2.85,0),wrap=assetBatch(),regalia=assetBatch();
  const torso=loftGeometry([[0,.94,.74],[.52,1.08,.83],[1.85,1.38,.93],[2.75,1.64,.99],[3.15,1.39,.83],[3.4,.62,.51]],{segments:28,steps:25,warp(x,y,z){const ridge=.035*Math.sin(y*17+x*.6);return[x*(1+ridge),y,z*(1+ridge)];}});
  wrap.add(torso,0xe0cda2);
  regalia.add(striped(clothGeometry(2.35,2.9,{folds:5,flare:.19,depth:.15,segments:22,steps:20}),0xb68f43,0x294d80,.32),0xffffff,0,.58,1.0);
  panel(regalia,[[-1.4,.35],[-.8,.65],[0,.1],[.8,.65],[1.4,.35],[.92,-.5],[0,-.8],[-.92,-.5]],C.gold,0,2.6,.93,.21,.12);
  for(const s of[-1,1])tube(regalia,[[s*.12,2.23,1.26],[s*.6,2.39,1.22],[s*1.18,2.68,.97]],[.075,.1,.035],0x315f92,{segments:8,steps:12});
  panel(regalia,[[-.3,.0],[0,.45],[.3,0],[0,-.5]],0x559aab,0,2.36,1.27,.12,.07);
  wrap.finish(body,'pharaoh-sculpted-linen',bossCloth);regalia.finish(body,'pharaoh-curved-collar-and-kilt',bossMetal);
  const head=node(body,'pharaoh-gold-death-mask',0,4.1,.04),mask=assetBatch(),nemes=assetBatch(),gleam=assetBatch();
  mask.add(headGeometry(1.83,2.25,1.6,{snout:.14,brow:.19,cheeks:.16,jaw:.62}),0xe2b65b);
  for(const s of[-1,1]){
    eye(mask,gleam,s*.41,.17,.86,.48,0x98f6dd,-s*.12);
    tube(mask,[[s*.2,-.36,1.04],[s*.41,-.46,1.0],[s*.61,-.36,.9]],[.035,.045,.02],0x8b6438,{segments:6,steps:10});
    const lobe=patchGeometry([[0,1.18],[s*.73,.9],[s*1.12,-.95],[s*.58,-1.85],[s*.08,-1.48]],.15,.22,{segments:26,rings:6});
    nemes.add(striped(lobe,0xd1a649,0x315783,.31),0xffffff,s*.75,.18,-.05,0,s*.18);
  }
  const cap=loftGeometry([[.76,.84,.68],[1.03,1.03,.8],[1.35,.93,.76],[1.57,.48,.43],[1.68,.025,.025]],{segments:24,steps:14});
  nemes.add(striped(cap,0xd1a649,0x315783,.25),0xffffff,0,0,-.15);
  tube(mask,[[0,-.69,.81],[0,-1.12,.98],[.02,-1.42,1.02]],[.16,.14,.04],0xbe8c40,{segments:10,steps:14,flutes:.04});
  tube(mask,[[0,1.25,.75],[0,1.71,.79],[.04,1.94,.86],[.13,1.77,1.02]],[.12,.1,.065,.015],C.gold,{segments:10,steps:14});
  mask.finish(head,'pharaoh-anatomical-gold-face',bossMetal);nemes.finish(head,'pharaoh-draped-striped-nemes',bossCloth);gleam.finish(head,'pharaoh-eye-catches',assetGlow);
  const arms=[];
  for(const s of[-1,1]){
    const arm=node(body,'pharaoh-arm-'+s,s*1.52,2.78,0),b=assetBatch();
    loft(b,[[-2.3,.28,.31,0,.33],[-1.75,.42,.39,0,.22],[-1.2,.29,.29],[-.55,.43,.4],[.15,.4,.4]],0xd8c39b,0,0,0,{segments:18,steps:20,warp(x,y,z){const f=1+.025*Math.sin(y*18);return[x*f,y,z*f];}});
    fingerHand(b,0,-2.35,.31,.57,0xc1a97b);b.ring(.39,.1,0,-1.77,.2,C.gold);b.finish(arm,'pharaoh-carved-wrap-arm-'+s,bossCloth);arms.push({arm,s});
  }
  const staff=node(arms[1].arm,'pharaoh-crook',.12,-2.4,.5),gold=assetBatch();
  tube(gold,[[0,-1.15,0],[0,1.5,0],[0,3.75,0],[.5,4.25,0],[1.0,4.12,0],[1.1,3.52,0]],[.1,.1,.12,.14,.11,.035],C.gold,{segments:10,steps:32});
  for(let k=0;k<6;k++)gold.ring(.13,.035,0,.5+k*.48,0,0x315783);
  gold.finish(staff,'pharaoh-swept-crook',bossMetal);
  return fitBoss(group,pose,2.9,10.6,(t,progress,state={})=>{
    const a=attackPose(progress),stride=walk(t,state);hit(pose,t,state);body.rotation.z=Math.sin(t*.9)*.025;body.position.y=2.85+Math.abs(stride)*.04;
    for(const l of legs)l.leg.rotation.x=l.s*stride*.09;
    for(const l of arms)l.arm.rotation.x=-a*(l.s>0?.8:.58)-l.s*stride*.06;
    head.rotation.y=Math.sin(t*.55)*.07;
  });
}

function buildThunder(){
  const {group,pose}=rig('sculpted-thunder-guardian'),legs=[];
  for(const s of[-1,1])legs.push({leg:shapedLeg(pose,'thunder-stone-greave-'+s,s,1.14,3.2,0x5f7489,0xa3b7be,3.14),s});
  const chest=node(pose,'thunder-weathered-body',0,3.15,0),stone=assetBatch(),runes=assetBatch();
  loft(stone,[[0,1.28,.94],[.6,1.56,1.14],[1.8,2.05,1.36],[3.1,2.28,1.37],[3.7,1.94,1.15],[4.0,.91,.62]],0x6f8395,0,0,0,{segments:34,steps:28,warp(x,y,z,u,v,a){const f=1+.027*Math.sin(y*4+a*3)+.016*Math.sin(x*8+z*5);return[x*f,y,z*f];}});
  panel(stone,[[-1.65,.7],[-.9,1.15],[0,.65],[.9,1.15],[1.65,.7],[1.3,-.7],[0,-1.3],[-1.3,-.7]],0x9eb5be,0,2.03,1.13,.28,.13);
  panel(runes,[[-.13,.7],[.39,.13],[.04,-.05],[.3,-.68],[-.45,.02],[-.12,.02]],0xffdf81,0,2.0,1.52,.025,.045);
  for(const s of[-1,1])tube(stone,[[s*.3,3.4,1.03],[s*.84,2.95,1.31],[s*1.61,2.83,1.19]],[.085,.105,.045],0x304861,{segments:8,steps:14});
  stone.finish(chest,'thunder-storm-eroded-cuirass',bossShell);runes.finish(chest,'thunder-incised-lightning',assetGlow);
  const head=node(chest,'thunder-carved-visage',0,4.75,.24),h=assetBatch(),light=assetBatch();
  h.add(headGeometry(2.55,2.55,2.0,{snout:.12,brow:.23,cheeks:.13,jaw:.84}),0x8a9da9);
  for(const s of[-1,1]){
    eye(h,light,s*.61,.1,1.08,.67,0xffe395,-s*.18);
    tube(h,[[s*.65,1.0,-.4],[s*1.0,1.63,-.46],[s*.94,2.2,-.4]],[.3,.24,.015],0xc1d1d2,{segments:12,steps:18,flutes:.08});
    tube(h,[[s*.18,-.64,1.1],[s*.54,-.75,.96],[s*.85,-.62,.8]],[.045,.065,.025],0x455c73,{segments:8,steps:12});
  }
  h.finish(head,'thunder-flowing-brow-and-jaw',bossShell);light.finish(head,'thunder-eye-catches',assetGlow);
  const arms=[],coils=[];
  for(const s of[-1,1]){
    const arm=node(chest,'thunder-hammer-arm-'+s,s*2.05,3.0,0),a=assetBatch();
    loft(a,[[-3.1,.67,.72,0,.45],[-2.75,.98,.9,0,.4],[-1.9,.92,.78,0,.3],[-1.35,.55,.55],[-.55,.82,.8],[.3,.79,.72]],0x667e94,0,0,0,{segments:24,steps:24,warp(x,y,z){const f=1+.035*Math.sin(y*5+x*3);return[x*f,y,z*f];}});
    for(let k=0;k<3;k++)tube(a,[[(k-1)*.42,-2.4,1.12],[(k-1)*.49,-2.88,1.13],[(k-1)*.45,-3.15,.91]],[.16,.18,.1],0xa5b8c0,{segments:8,steps:12});
    a.finish(arm,'thunder-sculpted-hammer-fist-'+s,bossShell);arms.push({arm,s});
    const coil=node(chest,'thunder-coil-'+s,s*2.33,3.25,-.5),c=assetBatch(),energy=assetBatch();
    loft(c,[[-.7,.36,.36],[-.52,.48,.48],[1.15,.42,.42],[1.44,.24,.24],[1.56,.03,.03]],C.ink,0,0,0,{segments:16,steps:16});
    for(let k=0;k<5;k++)c.ring(.64-Math.abs(2-k)*.035,.11,0,-.35+k*.34,0,k%2?C.gold:0xb1c4cc);
    bulb(c,.8,.42,.8,0xd4dfdc,0,1.49,0,{segments:16,steps:12});energy.ring(.76,.045,0,.32,0,0xffe795);
    c.finish(coil,'thunder-curved-tesla-stack-'+s,bossMetal);energy.finish(coil,'thunder-coil-field-'+s,assetGlow);coils.push({coil,s});
  }
  return fitBoss(group,pose,3.9,11.96,(t,progress,state={})=>{
    const a=attackPose(progress),stride=walk(t,state);hit(pose,t,state);chest.position.y=3.15+Math.abs(stride)*.05-a*.12;
    for(const l of legs)l.leg.rotation.x=l.s*stride*.09;
    for(const l of arms){l.arm.rotation.x=-a*1.0-l.s*stride*.06;l.arm.rotation.z=-l.s*a*.12;}
    for(const l of coils){l.coil.rotation.y=l.s*t*.4;l.coil.scale.y=1+a*.055;}
    head.rotation.x=a*.08;
  });
}

function buildMagma(){
  const {group,pose}=rig('sculpted-magma-dragon'),torso=node(pose,'magma-fused-basalt-anatomy',0,5.0,-.1),hide=assetBatch(),heat=assetBatch();
  loft(hide,[[-2.1,1.16,1.07,0,-.03],[-1.2,1.78,1.52],[.2,2.22,1.65],[1.65,2.16,1.49],[2.7,1.61,1.21],[3.15,.83,.77]],0x48343b,0,0,0,{segments:36,steps:30,warp(x,y,z,u,v,a){const crease=.035*Math.cos(a*7+v*5)+.02*Math.sin(y*7+z*4);return[x*(1+crease),y,z*(1+crease)];}});
  for(let k=0;k<4;k++){
    const y=1.7-k*.94,w=1.63-Math.abs(k-1.5)*.1,z=1.42-Math.abs(k-1.4)*.13;
    panel(hide,[[-w,.18],[-w*.55,.49],[0,.35],[w*.55,.49],[w,.18],[w*.75,-.35],[0,-.54],[-w*.75,-.35]],k%2?0x785047:0x624148,0,y,z,.19,.12);
    tube(heat,[[-w*.78,y-.32,z+.13],[0,y-.49,z+.25],[w*.78,y-.32,z+.13]],[.035,.05,.035],k%2?0xffaa51:0xff8244,{segments:6,steps:16});
  }
  for(let k=0;k<5;k++){
    const y=-.7+k*.76;
    tube(hide,[[0,y,-1.38],[0,y+.45,-1.96],[.08,y+.76,-2.12]],[.3,.21,.012],0x9c624f,{segments:10,steps:14,flutes:.035});
  }
  hide.finish(torso,'magma-continuous-scale-hide',bossShell);heat.finish(torso,'magma-glowing-chest-fissures',assetGlow);
  const legs=[];
  for(const s of[-1,1]){
    const leg=node(pose,'magma-digitigrade-haunch-'+s,s*1.3,3.48,-.15),b=assetBatch();
    loft(b,[[-3.39,.56,.86,0,.59],[-3.18,.83,1.1,0,.55],[-2.75,.62,.69,0,.2],[-1.9,.49,.56,0,-.23],[-1.05,.84,.83,0,-.13],[-.15,.79,.79],[.2,.36,.43]],0x51383f,0,0,0,{segments:26,steps:25,warp(x,y,z,u,v,a){const f=1+.025*Math.sin(a*6+y*3);return[x*f,y,z*f];}});
    for(let k=0;k<3;k++)tube(b,[[(k-1)*.45,-3.15,1.15],[(k-1)*.49,-3.19,1.68],[(k-1)*.47,-3.32,2.04]],[.18,.15,.012],0xe3bd8e,{segments:10,steps:14,flutes:.02});
    b.finish(leg,'magma-sculpted-hock-and-claws-'+s,bossShell);legs.push({leg,s});
  }
  const arms=[];
  for(const s of[-1,1]){
    const arm=node(torso,'magma-sinewed-forearm-'+s,s*1.94,1.6,.2),b=assetBatch();
    tube(b,[[0,0,0],[s*.51,-.62,.2],[s*.62,-1.35,.49],[s*.72,-2.15,1.0]],[.74,.7,.43,.46],0x513940,{segments:16,steps:24,flutes:.04});
    bulb(b,1.15,.92,1.05,0x624149,s*.72,-2.25,1.02,{segments:20,steps:16});
    for(let k=0;k<3;k++){
      const x=s*.72+(k-1)*.36;
      tube(b,[[x,-2.36,1.38],[x+(k-1)*.06,-2.51,1.81],[x+(k-1)*.08,-2.78,2.09]],[.16,.14,.012],0xefca95,{segments:10,steps:14});
    }
    tube(b,[[s*.72,-.24,-.33],[s*1.1,.3,-.42],[s*1.07,.67,-.46]],[.29,.19,.012],0xb67b5a,{segments:10,steps:14});
    b.finish(arm,'magma-flowing-forearm-and-talons-'+s,bossShell);arms.push({arm,s});
  }
  const neck=node(torso,'magma-sinuous-neck',0,2.35,.0),n=assetBatch();
  tube(n,[[0,0,0],[0,.95,.03],[0,1.68,.44],[0,2.02,.67]],[.91,.86,.82,.7],0x51373f,{segments:24,steps:24,flutes:.025});
  n.finish(neck,'magma-continuous-neck',bossShell);
  const head=node(neck,'magma-sculpted-skull',0,2.12,.66),h=assetBatch(),light=assetBatch();
  h.add(headGeometry(2.66,2.65,2.3,{snout:.53,brow:.25,cheeks:.19,jaw:.85}),0x69453f);
  for(const s of[-1,1]){
    eye(h,light,s*.69,.23,1.2,.69,0xffd896,-s*.2);
    tube(h,[[s*.84,.9,-.25],[s*1.08,1.7,-.43],[s*1.43,2.49,-.68],[s*1.32,2.85,-.89]],[.34,.28,.16,.012],0xcda479,{segments:12,steps:22,flutes:.07});
    tube(h,[[s*1.13,.06,-.35],[s*1.64,.43,-.55],[s*1.96,.53,-.65]],[.25,.17,.012],0x9c6a52,{segments:10,steps:15});
    panel(h,[[-.16,.08],[0,.17],[.19,.02],[.05,-.13],[-.12,-.1]],0x281f2b,s*.48,-.22,2.13,.015,.035,0,0,-s*.25);
    tube(h,[[s*.12,-.6,2.07],[s*.72,-.72,1.8],[s*.98,-.61,1.13]],[.045,.065,.045],0x362431,{segments:8,steps:16});
  }
  h.finish(head,'magma-carved-horned-face',bossShell);light.finish(head,'magma-eye-fire',assetGlow);
  const jaw=node(head,'magma-muscular-jaw',0,-.75,.33),j=assetBatch(),mouth=assetBatch();
  loft(j,[[-.52,.29,.63,0,.55],[-.39,.76,1.13,0,.61],[-.12,.95,1.27,0,.55],[.13,.86,1.2,0,.51],[.22,.45,.63,0,.43]],0x795046,0,0,0,{segments:26,steps:16});
  panel(mouth,[[-.68,.24],[.68,.24],[.8,-.11],[0,-.28],[-.8,-.11]],0xf19a4d,0,.2,1.5,.025,.025,-Math.PI/2);
  for(const s of[-1,1])for(let k=0;k<3;k++)tube(j,[[s*.65,.18,.63+k*.4],[s*.69,.43,.68+k*.4],[s*.66,.53,.73+k*.4]],[.1,.065,.009],C.ivory,{segments:8,steps:10});
  j.finish(jaw,'magma-sculpted-lower-jaw',bossShell);mouth.finish(jaw,'magma-throat-heat',assetGlow);
  const wings=[];
  for(const s of[-1,1]){
    const wing=node(torso,'magma-tensioned-wing-'+s,s*1.33,2.03,-.84),w=assetBatch(),ribs=assetBatch();
    panel(w,[[0,0],[s*1.15,1.95],[s*3.2,2.73],[s*4.5,1.26],[s*3.7,.26],[s*3.22,-.7],[s*2.73,-.18],[s*2.05,-1.14],[s*.92,-.76]],0x974b47,0,0,0,.37,.075);
    tube(ribs,[[0,0,.1],[s*.83,1.27,.1],[s*1.46,2.08,.04],[s*3.2,2.73,0]],[.23,.23,.17,.025],0x4b343b,{segments:12,steps:22});
    for(const [x,y]of[[4.5,1.26],[3.22,-.7],[2.05,-1.14]])tube(ribs,[[s*1.15,1.95,.16],[s*x*.71,y*.53+.85,.38],[s*x,y,.08]],[.12,.1,.025],0xc07b58,{segments:8,steps:18});
    w.finish(wing,'magma-curved-wing-membrane-'+s,bossSkin);ribs.finish(wing,'magma-swept-wing-fingers-'+s,bossShell);wings.push({wing,s});
  }
  const tail=node(pose,'magma-rolling-tail',0,2.23,-1.33),tb=assetBatch();
  tube(tb,[[0,0,0],[0,-.36,-1.4],[.23,-.8,-2.7],[.58,-.77,-3.55]],[.68,.58,.38,.22],0x54373f,{segments:16,steps:24,flutes:.045});
  for(let k=0;k<4;k++)tube(tb,[[k*.06,.14-k*.17,-.45-k*.64],[k*.06,.58-k*.17,-.57-k*.64],[k*.06,.7-k*.17,-.76-k*.64]],[.18,.11,.01],0xad7352,{segments:8,steps:12});
  tb.finish(tail,'magma-continuous-armored-tail',bossShell);
  const tip=node(tail,'magma-tail-tip',.58,-.77,-3.55),tt=assetBatch();
  tube(tt,[[0,0,0],[.6,.05,-.77],[1.0,.4,-1.42],[.94,.78,-1.62]],[.22,.18,.12,.012],0xc28a5d,{segments:12,steps:18});
  tt.finish(tip,'magma-curled-tail-blade',bossShell);
  return fitBoss(group,pose,3.625,13,(t,progress,state={})=>{
    const a=attackPose(progress),stride=walk(t,state);hit(pose,t,state);torso.position.y=5+Math.abs(stride)*.065-a*.12;torso.rotation.x=-a*.07;
    for(const l of legs)l.leg.rotation.x=l.s*stride*.11;
    for(const l of arms)l.arm.rotation.x=-a*.7-l.s*stride*.08;
    neck.rotation.x=-a*.16;head.rotation.x=-a*.12;jaw.rotation.x=a*.42+Math.sin(t*1.1)*.018;
    for(const l of wings){l.wing.rotation.y=l.s*(.28+Math.sin(t*1.05)*.06-a*.3);l.wing.rotation.z=l.s*(.12+a*.13);}
    tail.rotation.y=Math.sin(t*1.15)*.13;tip.rotation.y=Math.sin(t*1.15-.6)*.2;
  });
}

export function buildSculptedLate(type){
  switch(type){
    case 'kraken':return buildKraken();
    case 'pumpkin':return buildPumpkin();
    case 'drill':return buildDrill();
    case 'dice':return buildDice();
    case 'commander':return buildCommander();
    case 'spider':return buildSpider();
    case 'pharaoh':return buildPharaoh();
    case 'thunder':return buildThunder();
    case 'magma':return buildMagma();
    default:return null;
  }
}
