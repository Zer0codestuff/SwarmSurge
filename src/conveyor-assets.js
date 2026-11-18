import * as THREE from 'three';
import { assetBatch } from './asset-kit.js';
import { pod,lathe } from './vehicle-assets.js';

const DARK=0x243644, IRON=0x617b83, AMBER=0xe7a642;
export const TREAD_PITCH = 2.1;
let treadSource;

// One rubber tile spans four shoes. Per-belt textures share the canvas but
// retain their own UV transform for width, direction and travel speed.
function treadTexture() {
  if (!treadSource) {
    const canvas=document.createElement('canvas'); canvas.width=128; canvas.height=96;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#34424b'; ctx.fillRect(0,0,128,96);
    for(let x=0;x<128;x+=32) {
      ctx.fillStyle='#1b2730';ctx.fillRect(x,0,3,96);
      ctx.fillStyle='#667981';ctx.fillRect(x+3,0,2,96);
      for(const y of [8,86]) {ctx.fillStyle='#91a1a4';ctx.fillRect(x+9,y,5,2);}
    }
    ctx.fillStyle='#ffce68';
    ctx.beginPath();ctx.moveTo(27,20);ctx.lineTo(57,20);ctx.lineTo(98,48);
    ctx.lineTo(57,76);ctx.lineTo(27,76);ctx.lineTo(68,48);ctx.closePath();ctx.fill();
    treadSource=canvas;
  }
  const tex=new THREE.CanvasTexture(treadSource);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}
export function buildConveyor(width,length,dir) {
  const group=new THREE.Group(), frame=assetBatch();
  const tex=treadTexture();
  tex.repeat.set(width/TREAD_PITCH,Math.max(1,Math.round(length/2.8)));
  const deck=new THREE.Mesh(new THREE.PlaneGeometry(width,length),
    new THREE.MeshLambertMaterial({map:tex}));
  deck.name='moving-tread';deck.rotation.x=-Math.PI/2;deck.rotation.z=dir>0?0:Math.PI;
  deck.position.y=.085;group.add(deck);
  for(const side of [-1,1]) {
    const x=side*width/2, z=side*length/2;
    frame.add(lathe([[.06,-length/2],[.112,-length/2+.06],[.112,length/2-.06],[.06,length/2]],12),DARK,x,.065,0,Math.PI/2);
    frame.add(pod([[-.14,width*.47,.048,.07],[-.09,width*.5,.084,.092],[.09,width*.5,.084,.092],[.14,width*.47,.048,.07]],12),IRON,0,0,z);
    for(const end of [-1,1]) {
      // Housed bearings and a gold axle cap at each end of the roller.
      frame.add(pod([[-.21,.12,.06,.08],[-.11,.17,.13,.12],[.1,.17,.13,.12],[.19,.12,.06,.08]],10),DARK,x,0,end*length/2);
      frame.cylinder(.105,.055,x,.13,end*(length/2+.16),AMBER,'z');
    }
    for(let k=0;k<5;k++)frame.box(.2,.025,.12,(k-2)*width*.18,.185,z,AMBER,0,.28*side);
  }
  const bed=frame.finish(group,'conveyor-frame');bed.castShadow=false;
  return {group,tex};
}
