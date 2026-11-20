import * as THREE from 'three';

// Closed continuous surfaces for boss anatomy, forged armor and folded cloth.
// Callers own geometry. Materials are shared for the module lifetime.
export const bossSkin = new THREE.MeshPhongMaterial({ vertexColors: true, specular: 0x202226, shininess: 18 });
export const bossMetal = new THREE.MeshPhongMaterial({ vertexColors: true, color: 0xbdbdbd, specular: 0x7a828c, shininess: 72 });
export const bossCloth = new THREE.MeshLambertMaterial({ vertexColors: true });
export const bossShell = new THREE.MeshPhongMaterial({ vertexColors: true, color: 0xf1f1f1, specular: 0x484d54, shininess: 48 });
for (const m of [bossSkin,bossMetal,bossCloth,bossShell]) m.userData.shared = true;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const signedPower = (v, p) => Math.sign(v) * Math.abs(v) ** p;
const gauss = (v, center, width) => Math.exp(-Math.pow((v-center)/width,2));
const cubic = (a,b,c,d,t) => .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);

function surface(positions, indices, shades) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setIndex(indices); g.computeVertexNormals();
  if (shades) g.setAttribute('color',new THREE.Float32BufferAttribute(shades,3));
  g.computeBoundingSphere();
  return g;
}

export function loftGeometry(sections, { segments = 32, steps = 28, warp, shade = true } = {}) {
  const vertices=[], indices=[], colors=[];
  for(let j=0;j<=steps;j++) {
    const v=j/steps, f=v*(sections.length-1), i=Math.min(sections.length-2,Math.floor(f)), t=f-i;
    const p=[];
    for(let k=0;k<6;k++) {
      const get=n=>sections[clamp(n,0,sections.length-1)][k]??(k===5?1:0);
      p.push(cubic(get(i-1),get(i),get(i+1),get(i+2),t));
    }
    for(let k=0;k<=segments;k++) {
      const a=k/segments*TAU;
      let x=p[3]+Math.max(.002,p[1])*signedPower(Math.sin(a),clamp(p[5],.35,2));
      let y=p[0], z=p[4]+Math.max(.002,p[2])*signedPower(Math.cos(a),clamp(p[5],.35,2));
      if(warp) [x,y,z]=warp(x,y,z,k/segments,v,a,p);
      vertices.push(x,y,z);
      const tone=shade ? .87+.13*Math.sin(Math.PI*v)+.025*Math.cos(a*2) : 1;
      colors.push(tone,tone,tone);
      if(j<steps && k<segments) {
        const n=j*(segments+1)+k;
        indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);
      }
    }
  }
  for(const [row,flip] of [[0,true],[steps,false]]) {
    const start=vertices.length/3;
    const offset=row*(segments+1)*3;
    let x=0,y=0,z=0;
    for(let k=0;k<segments;k++){x+=vertices[offset+k*3];y+=vertices[offset+k*3+1];z+=vertices[offset+k*3+2];}
    vertices.push(x/segments,y/segments,z/segments);colors.push(.86,.86,.86);
    for(let k=0;k<segments;k++) {
      const a=row*(segments+1)+k;
      indices.push(...(flip?[start,a+1,a]:[start,a,a+1]));
    }
  }
  // Some sculptors trace a profile from the crown down to the base.
  if (sections[0][0] > sections[sections.length-1][0]) {
    for (let i=0;i<indices.length;i+=3) [indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  }
  return smoothRingSeams(surface(vertices,indices,colors), segments, steps + 1);
}

// Indexed rings duplicate the closing vertex. Give both copies the same normal
// so a travelling highlight crosses the join on armor, horns and tentacles.
export function smoothRingSeams(geometry, segments, rows) {
  const normals = geometry.attributes.normal;
  const normal = new THREE.Vector3(), other = new THREE.Vector3();
  for (let row = 0; row < rows; row++) {
    const first = row * (segments + 1), last = first + segments;
    normal.fromBufferAttribute(normals, first)
      .add(other.fromBufferAttribute(normals, last)).normalize();
    normals.setXYZ(first, normal.x, normal.y, normal.z);
    normals.setXYZ(last, normal.x, normal.y, normal.z);
  }
  return geometry;
}

export function headGeometry(w,h,d,{ snout=.23, brow=.12, cheeks=.1, jaw=.76, skull=false }={}) {
  return loftGeometry([
    [-h*.5,w*.21,d*.23,0,d*.04],[-h*.4,w*jaw*.48,d*.39,0,d*.08],
    [-h*.13,w*.49,d*.47,0,0],[h*.12,w*.5,d*.5,0,-d*.02],
    [h*.35,w*.43,d*.44,0,-d*.04],[h*.49,w*.2,d*.22,0,-d*.05],
    [h*.51,.015,.015,0,-d*.05],
  ],{segments:40,steps:28,warp(x,y,z,u,v,a){
    const front=Math.max(0,Math.cos(a))**4;
    const eye=gauss(Math.abs(x),w*.24,w*.13)*gauss(y,h*.08,h*.14);
    z+=front*(snout*d*gauss(y,-h*.16,h*.17)+brow*d*gauss(y,h*.25,h*.075)-eye*d*(skull?.28:.11));
    // A nasal bridge separates the sockets and a recessed crease frames the mouth.
    const bridge=gauss(x,0,w*.095)*gauss(y,h*.065,h*.17);
    const mouth=gauss(x,0,w*.26)*gauss(y,-h*.27,h*.045);
    z+=front*d*((skull?.095:.065)*bridge-.055*mouth);
    z+=front*cheeks*d*gauss(Math.abs(x),w*.32,w*.16)*gauss(y,-h*.1,h*.17);
    return [x,y,z];
  }});
}

export function sweepGeometry(points,radii,{segments=12,steps=24,flutes=0,flatten=1}={}) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const frames=curve.computeFrenetFrames(steps,false), positions=[],indices=[],colors=[];
  for(let j=0;j<=steps;j++) {
    const t=j/steps, at=curve.getUtoTmapping(t), p=curve.getPoint(at), f=at*(radii.length-1), i=Math.min(radii.length-2,Math.floor(f)), a=f-i;
    const r=Math.max(.003,cubic(radii[Math.max(0,i-1)],radii[i],radii[i+1],radii[Math.min(radii.length-1,i+2)],a));
    for(let k=0;k<=segments;k++) {
      const theta=k/segments*TAU, radius=r*(1+flutes*Math.cos(theta*5));
      const q=p.clone().addScaledVector(frames.normals[j],Math.cos(theta)*radius).addScaledVector(frames.binormals[j],Math.sin(theta)*radius*flatten);
      positions.push(q.x,q.y,q.z);const c=.91+.09*Math.sin(t*Math.PI);colors.push(c,c,c);
      if(j<steps&&k<segments){const n=j*(segments+1)+k;indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}
    }
  }
  for(const [row,flip]of[[0,true],[steps,false]]){
    const p=curve.getPoint(row/steps), n=positions.length/3;positions.push(p.x,p.y,p.z);colors.push(.9,.9,.9);
    for(let k=0;k<segments;k++){const a=row*(segments+1)+k;indices.push(...(flip?[n,a+1,a]:[n,a,a+1]));}
  }
  return smoothRingSeams(surface(positions,indices,colors), segments, steps + 1);
}

export function patchGeometry(outline,depth=.18,bulge=.25,{segments=40,rings=7}={}) {
  outline=outline.map(p=>[...p]);
  const area=outline.reduce((a,p,i)=>{const q=outline[(i+1)%outline.length];return a+p[0]*q[1]-q[0]*p[1];},0);
  if(area<0)outline.reverse();
  const curve=new THREE.CatmullRomCurve3(outline.map(p=>new THREE.Vector3(p[0],p[1],0)),true,'centripetal');
  const boundary=curve.getPoints(segments).slice(0,-1), center=new THREE.Vector3();
  boundary.forEach(p=>center.add(p));center.multiplyScalar(1/boundary.length);
  const positions=[],indices=[],colors=[];
  for(let side=0;side<2;side++)for(let j=0;j<=rings;j++)for(let k=0;k<=segments;k++){
    const r=Math.max(.001,j/rings), p=boundary[k%segments];
    positions.push(center.x+(p.x-center.x)*r,center.y+(p.y-center.y)*r,(side?-depth/2:depth/2)+(!side?bulge*(1-r*r):0));
    const shade=side ? .78 : 1-.14*r*r;
    colors.push(shade,shade,shade);
    if(j<rings&&k<segments){const n=side*(rings+1)*(segments+1)+j*(segments+1)+k;
      indices.push(...(side?[n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1]:[n,n+segments+1,n+1,n+1,n+segments+1,n+segments+2]));}
  }
  const back=(rings+1)*(segments+1), edge=rings*(segments+1);
  for(let k=0;k<segments;k++){const n=edge+k;indices.push(n,n+back,n+1,n+1,n+back,n+back+1);}
  return smoothRingSeams(surface(positions,indices,colors), segments, 2 * (rings + 1));
}

export function clothGeometry(width,length,{folds=6,flare=.35,depth=.2,segments=28,steps=24}={}) {
  const p=[],indices=[],colors=[],count=(segments+1)*(steps+1);
  for(let side=0;side<2;side++)for(let j=0;j<=steps;j++)for(let k=0;k<=segments;k++){
    const u=k/segments,v=j/steps,x=(u-.5)*width*(1+flare*v);
    const y=-v*length+.13*length*Math.sin(u*Math.PI*folds)**2*v**8;
    const z=Math.sin(u*Math.PI*folds)*depth*(.3+.7*v)+.65*v*v+(side?-.06:0);
    p.push(x,y,z);const c=.86+.14*(.5+.5*Math.cos(u*Math.PI*folds));colors.push(c,c,c);
    if(j<steps&&k<segments){const n=side*count+j*(segments+1)+k;indices.push(...(side?[n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1]:[n,n+segments+1,n+1,n+1,n+segments+1,n+segments+2]));}
  }
  const join=(a,b)=>indices.push(a,b,a+count,b,b+count,a+count);
  for(let k=0;k<segments;k++){join(k,k+1);join(steps*(segments+1)+k+1,steps*(segments+1)+k);}
  for(let j=0;j<steps;j++){join((j+1)*(segments+1),j*(segments+1));join(j*(segments+1)+segments,(j+1)*(segments+1)+segments);}
  return surface(p,indices,colors);
}

export function crownGeometry(radius,height,points=7) {
  const positions = [], indices = [], shades = [];
  const segments = points * 16;
  // A rolled base rail, recessed chased fillet and flared leaf points form
  // one closed gold band. The inner return is visible from above.
  const profile = [
    [-.025, .01, 0, .64], [.032, .05, 0, .95], [.048, .14, 0, 1.0],
    [.008, .18, 0, .61], [.024, .24, .04, .94], [.017, .29, .27, .78],
    [.045, .32, .68, 1.0], [-.045, .32, .68, .85], [-.11, .22, .17, .55],
    [-.11, .05, 0, .68], [-.08, .01, 0, .76],
  ];
  for (const [offset, band, relief, brightness] of profile) {
    for (let k = 0; k <= segments; k++) {
      const a = k * TAU / segments, petal = (.5 + .5 * Math.cos(a * points)) ** 2.25;
      const radiusAtAngle = radius + offset + relief * (.08 * petal + .04 * petal**8);
      positions.push(Math.sin(a) * radiusAtAngle, height * (band + relief * petal), Math.cos(a) * radiusAtAngle);
      const tint = brightness + .10 * relief * petal;
      shades.push(tint, tint, tint);
    }
  }
  for (let j = 0; j < profile.length; j++) for (let k = 0; k < segments; k++) {
    const a = j * (segments+1) + k, b = ((j+1) % profile.length) * (segments+1) + k;
    indices.push(a, a+1, b, a+1, b+1, b);
  }
  const geometry = surface(positions, indices, shades);
  smoothRingSeams(geometry, segments, profile.length);
  return geometry;
}

export function fitBoss(group,pose,radius,height,animate) {
  animate(0,0,{moving:false,health:1,hit:0,stunned:false});
  const bounds=new THREE.Box3().setFromObject(pose);
  pose.scale.setScalar(height/bounds.max.y);
  return {group,radius,height,animate};
}

// An open mantle cut around the shoulders. Its collar, lining, turned edge
// and hanging hem form one garment, including the surfaces visible from below.
export function mantleGeometry(width, length, { outer, lining, braid, folds=7, split=.74, ragged=.12 }) {
  const p=[],colors=[],indices=[], cols=36, rows=14, layer=(cols+1)*(rows+1);
  const coat=new THREE.Color(outer),inside=new THREE.Color(lining),trim=new THREE.Color(braid),c=new THREE.Color();
  for(let face=0;face<2;face++)for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++) {
    const v=j/rows,u=k/cols,angle=split+u*(TAU-2*split);
    const back=(1-Math.cos(angle))*.5, edge=Math.sin(u*Math.PI);
    const pleat=Math.cos(angle*folds+.85*Math.sin(2*angle+v*3.2));
    const shoulder=1-Math.exp(-v*10);
    const span=.37+.64*shoulder+.12*v;
    const billow=span+v*(.058*pleat-.055*face);
    const drop=(.29+.71*back)*length;
    const hem=ragged*length*(.5+.5*Math.cos(angle*folds+.5))*(.3+.7*edge)*v**5;
    p.push(width*Math.sin(angle)*billow,-v*drop+hem+.09*length*back*(1-v),
      width*(.64*Math.cos(angle)*billow-.34*v*v-.1*back));
    c.copy(face?inside:coat).multiplyScalar(.75+.25*(.5+.5*pleat));
    if(j===rows-1 || k===1 || k===cols-1)c.lerp(trim,.88);
    colors.push(c.r,c.g,c.b);
    if(j===rows||k===cols)continue;
    const n=face*layer+j*(cols+1)+k,b=n+cols+1;
    indices.push(...(face?[n,n+1,b,n+1,b+1,b]:[n,b,n+1,n+1,b,b+1]));
  }
  const join=(a,b)=>indices.push(a,b,a+layer,b,b+layer,a+layer);
  for(let k=0;k<cols;k++){join(k+1,k);join(rows*(cols+1)+k,rows*(cols+1)+k+1);}
  for(let j=0;j<rows;j++){join(j*(cols+1),(j+1)*(cols+1));join((j+1)*(cols+1)+cols,j*(cols+1)+cols);}
  return surface(p,indices,colors);
}
