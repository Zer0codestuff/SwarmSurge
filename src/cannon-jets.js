import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';
import { lathe } from './vehicle-assets.js';
import { uploadUsed } from './fx.js';

// Anchor the white throat in the bore. Five colored gas petals open around
// the central jet. Every barrel in the fleet shares this single draw.
function jetGeometry() {
  const parts = [];
  function add(geo, color) {
    const tint = new THREE.Color(color), count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) tint.toArray(colors, i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(geo);
  }
  add(lathe([[.06,0],[.12,.11],[.16,.25],[.07,.51],[.006,.78]],8).rotateX(-Math.PI/2),0xfff9d9);
  for (let k=0;k<5;k++) {
    const petal = lathe([[.03,0],[.074,.15],[.065,.24],[.004,.47]],5);
    petal.rotateZ(-.47).translate(.064,.04,0).rotateY(k*Math.PI*2/5).rotateX(-Math.PI/2);
    add(petal,0x89cfea);
  }
  const geometry=mergeGeometries(parts);
  for (const part of parts) part.dispose();
  return geometry;
}
export function cannonJets(fleet, maxBarrels) {
  const mesh = new THREE.InstancedMesh(jetGeometry(), new THREE.MeshBasicMaterial({vertexColors:true, toneMapped:false}), fleet.length * maxBarrels);
  const mount = new THREE.Matrix4(), local = new THREE.Object3D(), tint = new THREE.Color();
  mesh.name = 'cannon-jets'; mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, tint);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  function pose(time) {
    mesh.count = 0;
    for (const actor of fleet) {
      if (!actor.group.visible) continue;
      const age = time - actor.firedAt, heavyAge = time - actor.giantAt;
      const heavy = heavyAge >= 0 && heavyAge < .16;
      const fade = heavy ? 1 - heavyAge/.16 : 1 - age/.085;
      if (!(fade > 0 && fade <= 1)) continue;
      actor.barrels.updateWorldMatrix(true,true);
      tint.setHex(heavy ? 0xffd78b : actor.jetColor);
      const girth = (.52 + .48 * fade) * (heavy ? 1.45 : 1);
      local.position.set(0,0,-1.235);
      local.scale.set(girth,girth,(heavy ? 1.65 : 1) * (.16 + fade*.94));
      local.updateMatrix();
      for (const barrel of actor.barrels.children) {
        mount.multiplyMatrices(barrel.matrixWorld, local.matrix);
        mesh.setMatrixAt(mesh.count,mount);
        mesh.setColorAt(mesh.count++,tint);
      }
    }
    mesh.visible = mesh.count > 0;
    if (mesh.visible) {
      uploadUsed(mesh.instanceMatrix, mesh.count);
      uploadUsed(mesh.instanceColor, mesh.count);
    }
  }
  return {mesh, pose};
}
