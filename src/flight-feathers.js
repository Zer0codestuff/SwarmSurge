import * as THREE from 'three';

// A flight feather is a cambered vane with an asymmetric leading edge and
// raised rachis. Cross-sections close around the shaft on the underside.
export function flightFeather(path, breadth, direction, base, tip, shaft, steps = 12) {
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(...p)));
  const across = new THREE.Vector3(...direction).normalize();
  const root = new THREE.Color(base), end = new THREE.Color(tip), quill = new THREE.Color(shaft);
  const p = [], c = [], indices = [];
  const section = [[-1,0],[-.55,.09],[-.07,.12],[0,.23],[.07,.12],[.6,.06],[1,-.03],[.45,-.05],[0,-.09],[-.5,-.04]];
  for (let j=0;j<=steps;j++) {
    const t=j/steps, center=curve.getPoint(t), tangent=curve.getTangent(t);
    const side=across.clone().addScaledVector(tangent,-across.dot(tangent)).normalize();
    const normal=new THREE.Vector3().crossVectors(tangent,side).normalize();
    const width=breadth*(.015+.985*Math.sin(Math.PI*t**.81)**.7);
    section.forEach(([u,h],k)=>{
      const barbs = Math.abs(u)>.9 && j%4===1 ? .86 : 1;
      const v=center.clone().addScaledVector(side,width*u*(u<0?.75:1)*barbs)
        .addScaledVector(normal,h*width).addScaledVector(tangent,.3*width*Math.abs(u));
      p.push(v.x,v.y,v.z);
      const tint=root.clone().lerp(end,Math.min(1,t*t*.95 + (j%5===1?.18:0)*Math.abs(u)));
      if (k===3) tint.lerp(quill,.85);
      tint.multiplyScalar(k>6?.72:.94+.06*(1-Math.abs(u))); c.push(tint.r,tint.g,tint.b);
      if (j<steps) {
        const a=j*section.length+k,b=j*section.length+(k+1)%section.length;
        indices.push(a,a+section.length,b,b,a+section.length,b+section.length);
      }
    });
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}
