import * as THREE from 'three';
import { assetBatch, assetSurface } from './asset-kit.js';
import { loftGeometry } from './boss-shapes.js';

const STEEL = 0x483740, RED = 0xdd352f, DARK = 0x402434, BRASS = 0xffa154;
let riderGeometry, coreGeometry;

// These raiders cling to the outside of the ball. Their bent limbs, broad
// backs, swept horns and eye slit need to read from above at a few pixels.
function rider() {
  const b=assetBatch();
  const body=(rows,col,x=0,y=0,z=0,segments=5,steps=2)=>b.add(loftGeometry(rows,{segments,steps}),col,x,y,z);
  body([[.12,.11,.12],[.21,.17,.17],[.49,.21,.14],[.56,.13,.1]],RED);
  body([[.48,.11,.13],[.55,.22,.19],[.7,.2,.16],[.79,.07,.09]],0xff6946,0,0,.035);
  b.add(new THREE.OctahedronGeometry(.14).scale(1.05,1.25,.6),DARK,0,.35,-.13);
  for (const s of [-1,1]) {
    // One tapered bent surface for each arm and leg, braced against the core.
    body([[.06,.055,.07,.035*s,.14],[.12,.067,.07,.025*s,.12],[.25,.065,.065,.045*s,0],[.43,.085,.08,0,-.01]],STEEL,s*.19,0,0,4,1);
    body([[.01,.07,.12,0,-.08],[.11,.077,.1,.02*s,-.09],[.21,.075,.085,.045*s,.055],[.28,.08,.09,0,0]],DARK,s*.1,0,0,4,1);
    b.add(new THREE.ConeGeometry(.05,.25,4).rotateZ(-s*.62),BRASS,s*.198,.74,-.015);
    b.add(new THREE.OctahedronGeometry(.065).scale(1,.36,.5),0xffffaf,s*.088,.625,.19);
  }
  const geo=b.finish(new THREE.Group(),'clinging-raider').geometry;
  geo.userData.shared=true;
  return geo;
}
function core() {
  const b=assetBatch();
  b.add(new THREE.IcosahedronGeometry(.89,1),0x85282b);
  for (let k=0;k<3;k++) {
    const angle=k*Math.PI/3;
    b.add(new THREE.TorusGeometry(.895,.033,4,24).rotateY(angle),STEEL);
    for (let j=0;j<8;j++) {
      const a=(j+.5)*Math.PI/4, x=Math.cos(a)*.905;
      b.add(new THREE.OctahedronGeometry(.047),BRASS,x*Math.cos(angle),Math.sin(a)*.905,-x*Math.sin(angle));
    }
  }
  const geo=b.finish(new THREE.Group(),'swarm-cage').geometry;
  geo.userData.shared=true;
  return geo;
}
export function swarmBallShell(material) {
  riderGeometry ??= rider(); coreGeometry ??= core();
  const count=144, inst=new THREE.InstancedMesh(riderGeometry,material,count);
  const pose=new THREE.Object3D(), direction=new THREE.Vector3(), up=new THREE.Vector3(0,1,0);
  for (let i=0;i<count;i++) {
    // A prefix still covers both hemispheres as riders are knocked away.
    const slot=i*61%count, y=1-2*(slot+.5)/count, radial=Math.sqrt(1-y*y), a=slot*2.399963;
    direction.set(radial*Math.cos(a),y,radial*Math.sin(a));
    pose.position.copy(direction).multiplyScalar(.855);
    pose.quaternion.setFromUnitVectors(up,direction);
    pose.rotateY(slot*1.37); pose.scale.setScalar(.42+.055*((slot*73)%61)/60);
    pose.updateMatrix(); inst.setMatrixAt(i,pose.matrix);
  }
  return {inst, fill:new THREE.Mesh(coreGeometry,assetSurface), count};
}
