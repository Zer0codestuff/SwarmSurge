import * as THREE from 'three';
import { assetBatch } from './asset-kit.js';
import { lathe } from './vehicle-assets.js';
import { sweepGeometry } from './boss-shapes.js';

const TAU = Math.PI*2, templates = new Map();
function frost(b) {
  for (const [x,z,tilt,size] of [[0,0,.1,1],[-.32,.03,.71,.66],[.26,.22,-.62,.77],[.21,-.19,-.35,.58]]) {
    const prism=lathe([[.015,-.76],[.32,-.43],[.29,.48],[.012,.94]],6);
    prism.scale(size,size,size);
    b.add(prism, x===0 ? 0xabeaff : 0x4fbddd,x,0,z,0,x*2,tilt);
  }
}
function voidShard(b) {
  b.add(new THREE.OctahedronGeometry(.59).scale(.7,1.3,.77),0xe367fe);
  // Broken arcs of a gold cage hang away from the crystalline heart.
  for(let k=0;k<3;k++) {
    const a=k*TAU/3;
    b.add(new THREE.TorusGeometry(.64,.048,5,12,1.48).rotateZ(a).rotateX(.82),0xd4a354);
    const blade=lathe([[.012,-.66],[.19,-.18],[.16,.26],[.008,.52]],4);
    b.add(blade.rotateZ(-.3).rotateY(a),0x6751ba,Math.cos(a)*.5,Math.sin(a)*.19,Math.sin(a)*.5);
  }
}
function moonstone(b) {
  const stone=new THREE.SphereGeometry(.79,32,20), p=stone.attributes.position;
  const pits=[[.1,.92,.39,.31],[-.61,.35,.71,.29],[.75,.5,-.43,.39],[-.13,-.73,-.67,.35],[.9,-.33,.26,.24]];
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i)/.79,y=p.getY(i)/.79,z=p.getZ(i)/.79;
    let h=.79+.034*Math.sin(x*5+y*3)*Math.cos(z*6);
    for(const [cx,cy,cz,r] of pits) {
      const d=Math.hypot(x-cx,y-cy,z-cz)/r;
      if(d<1.4) h+=.068*Math.exp(-30*(d-.93)**2)-.15*Math.max(0,1-d*d);
    }
    p.setXYZ(i,x*h,y*h*.94,z*h);
  }
  stone.computeVertexNormals();
  b.add(stone,(x,y,z)=>Math.hypot(x,y/.94,z)<.75 ? 0x675f78 : 0xbab4c1);
}
function die(b) {
  b.box(1.22,1.22,1.22,0,0,0,0xffeacc);
  const face=(number,rx,ry)=>{
    const pip=new THREE.CircleGeometry(.086,10);
    const points=[];
    if(number%2) points.push([0,0]);
    if(number>1) points.push([-.29,-.29],[.29,.29]);
    if(number>=4) points.push([-.29,.29],[.29,-.29]);
    if(number===6) points.push([-.29,0],[.29,0]);
    for(const [x,y] of points)b.add(pip.clone().translate(x,y,.614).rotateX(rx).rotateY(ry),number===1?0xc03542:0x45334a);
    pip.dispose();
  };
  face(1,0,0);face(6,0,Math.PI);face(2,0,Math.PI/2);face(5,0,-Math.PI/2);
  face(3,-Math.PI/2,0);face(4,Math.PI/2,0);
}
function pumpkin(b) {
  const skin=new THREE.SphereGeometry(.72,32,14), p=skin.attributes.position;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i), a=Math.atan2(z,x);
    const lobe=1+.09*Math.cos(8*a);
    p.setXYZ(i,x*lobe,y*.81,z*lobe);
  }
  skin.computeVertexNormals(); b.add(skin,0xf9822b);
  b.add(sweepGeometry([[0,.51,0],[.06,.68,0],[.01,.85,.04],[-.12,.91,.055]],[.14,.1,.085,.055],
    {segments:8,steps:8,flutes:.08}),0x587143);
  for (const s of [-1,1]) b.add(new THREE.ConeGeometry(.16,.2,3).scale(1,1,.4),0xffdf63,s*.25,.15,.66,0,s*.32,-s*.3);
  const grin=new THREE.Shape();
  grin.moveTo(-.34,-.015);grin.lineTo(-.21,-.11);grin.lineTo(-.14,-.065);grin.lineTo(-.10,-.13);
  grin.lineTo(.09,-.14);grin.lineTo(.15,-.075);grin.lineTo(.2,-.105);grin.lineTo(.34,-.01);
  grin.quadraticCurveTo(.18,-.31,-.03,-.25);grin.quadraticCurveTo(-.22,-.24,-.34,-.015);
  const mouth=new THREE.ShapeGeometry(grin,6), coords=mouth.attributes.position;
  for(let i=0;i<coords.count;i++) {
    const x=coords.getX(i),y=coords.getY(i);
    coords.setZ(i,Math.sqrt(Math.max(0,.72**2-x*x-(y/.81)**2))+.025);
  }
  mouth.computeVertexNormals();b.add(mouth,0xffc04e);
}
function jester(b) {
  for(let k=0;k<8;k++) b.add(new THREE.SphereGeometry(.72,5,10,k*TAU/8,TAU/8),k%2?0xd93778:0xffedc1);
  b.ring(.718,.036,0,0,0,0xe7a734);
  for(const sign of [-1,1]) b.sphere(.17,0,sign*.75,0,0xffbf48);
}
function flywheel(b) {
  b.add(new THREE.TorusGeometry(.64,.14,6,24),0x354252);
  b.add(new THREE.TorusGeometry(.7,.042,5,24),0xef9044,0,0,.1);
  for(let k=0;k<5;k++) {
    const a=k*TAU/5;
    b.beam([0,0,0],[Math.sin(a)*.61,Math.cos(a)*.61,0],.13,.13,0x99a3a2);
  }
  b.cylinder(.21,.4,0,0,0,0xffb457,'z');
}
function bamboo(b) {
  for (const [x,z,y] of [[-.19,.09,.08],[.17,.12,-.06],[0,-.18,0]]) {
    b.add(lathe([[.16,-.72],[.18,-.68],[.15,-.48],[.145,.22],[.16,.26],[.15,.3],[.15,.75],[.115,.75],[.115,.65]],10),0x7eb44a,x,y,z);
    b.cylinder(.105,.015,x,.65+y,z,0xffe5a1);
  }
  for(const y of [-.35,.36]) {b.ring(.33,.048,0,y,0,0xcd9d55); b.ring(.33,.03,0,y+.062,0,0xffcf84);}
}
function meteor(b) {
  // Each face of the outer crust withdraws toward its own center. The hot
  // inner stone is visible through the resulting branching seams.
  function distort(geo) {
    const p=geo.attributes.position;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const scale=1+.13*Math.sin(5*x+3*z)*Math.cos(3*y-2*z);
      p.setXYZ(i,scale*x*1.18,scale*y*.89,scale*z);
    }
    geo.computeVertexNormals(); return geo;
  }
  b.add(distort(new THREE.IcosahedronGeometry(.73,1)),0xff8a26);
  const crust=new THREE.IcosahedronGeometry(.79,1), pos=crust.attributes.position;
  const center=new THREE.Vector3(), v=new THREE.Vector3();
  for(let i=0;i<pos.count;i+=3) {
    center.set(0,0,0);
    for(let j=i;j<i+3;j++) center.add(v.fromBufferAttribute(pos,j));
    center.multiplyScalar(1/3);
    for(let j=i;j<i+3;j++) {
      v.fromBufferAttribute(pos,j).lerp(center,.14).multiplyScalar(1+.048*Math.sin(i));
      pos.setXYZ(j,v.x,v.y,v.z);
    }
  }
  b.add(distort(crust),(x,y,z)=>x+y*.4+z*.3>.15 ? 0x76514a : 0x453139);
}
const designs={golem:frost,moon:moonstone,dice:die,pumpkin,jack:jester,locomotive:flywheel,panda:bamboo,meteor,
  void:voidShard};
export function bossProjectile(type) {
  const key=Object.hasOwn(designs,type) ? type : 'void';
  if(!templates.has(key)) {
    const b=assetBatch(); designs[key](b);
    const mesh=b.finish(new THREE.Group(),'projectile-'+key);
    mesh.geometry.userData.shared=true;
    templates.set(key,mesh);
  }
  return templates.get(key).clone();
}
