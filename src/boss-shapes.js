import * as THREE from 'three';

// Closed continuous surfaces for boss anatomy, forged armor and folded cloth.
// Callers own geometry. Materials are shared for the module lifetime.
export const bossSkin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .64, metalness: .02 });
export const bossMetal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .31, metalness: .48 });
export const bossCloth = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .94, metalness: 0 });
export const bossShell = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .39, metalness: .12 });
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
      if(warp) [x,y,z]=warp(x,y,z,k/segments,v,a);
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
  const g=surface(vertices,indices,colors), n=g.attributes.normal;
  for(let j=0;j<=steps;j++) {
    const a=j*(segments+1), b=a+segments;
    const normal=new THREE.Vector3(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();
    n.setXYZ(a,normal.x,normal.y,normal.z);n.setXYZ(b,normal.x,normal.y,normal.z);
  }
  return g;
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
    z+=front*cheeks*d*gauss(Math.abs(x),w*.32,w*.16)*gauss(y,-h*.1,h*.17);
    return [x,y,z];
  }});
}

export function sweepGeometry(points,radii,{segments=12,steps=24,flutes=0,flatten=1}={}) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const frames=curve.computeFrenetFrames(steps,false), positions=[],indices=[],colors=[];
  for(let j=0;j<=steps;j++) {
    const t=j/steps, p=curve.getPoint(t), f=t*(radii.length-1), i=Math.min(radii.length-2,Math.floor(f)), a=f-i;
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
  return surface(positions,indices,colors);
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
    const shade=.94+.06*(1-r);colors.push(shade,shade,shade);
    if(j<rings&&k<segments){const n=side*(rings+1)*(segments+1)+j*(segments+1)+k;
      indices.push(...(side?[n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1]:[n,n+segments+1,n+1,n+1,n+segments+1,n+segments+2]));}
  }
  const back=(rings+1)*(segments+1), edge=rings*(segments+1);
  for(let k=0;k<segments;k++){const n=edge+k;indices.push(n,n+back,n+1,n+1,n+back,n+back+1);}
  return surface(positions,indices,colors);
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
  const p=[],indices=[],steps=points*12;
  for(let ring=0;ring<4;ring++)for(let k=0;k<=steps;k++){
    const a=k/steps*TAU,inner=ring>=2,top=ring===1||ring===2;
    const r=radius-(inner?.13:0)+(top?.04:0),wave=Math.max(0,Math.cos(a*points))**5;
    p.push(Math.sin(a)*r,top?height*(.3+.7*wave):0,Math.cos(a)*r);
  }
  for(let ring=0;ring<4;ring++)for(let k=0;k<steps;k++){
    const a=ring*(steps+1)+k,b=((ring+1)%4)*(steps+1)+k;
    indices.push(a,a+1,b,a+1,b+1,b);
  }
  return surface(p,indices);
}

export function fitBoss(group,pose,radius,height,animate) {
  animate(0,0,{moving:false,health:1,hit:0,stunned:false});
  const bounds=new THREE.Box3().setFromObject(pose);
  pose.scale.setScalar(height/bounds.max.y);
  return {group,radius,height,animate};
}
