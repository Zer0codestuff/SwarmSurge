// Small, painted wrap maps for the principal character surfaces. A tile is
// one complete turn around a torso, with the front at both horizontal edges.
// Large marks survive the battle camera. Fine lines resolve in the boss intro.
import * as THREE from 'three';

const kinds=['scales','chitin','feathers','hide','pelt','panda','mantle','swirl','strata',
  'bone','motley','brocade','coat','burlap','linen','suit','inlay','plate','lamellar','cobra'];
const width=256,height=128,cols=4,rows=8;
const unpainted=31;
const materials=new WeakMap();
let atlas;

function brush(ctx,stroke,fill,lineWidth=1) {
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.lineWidth=lineWidth;ctx.strokeStyle=stroke;ctx.stroke();}
}
function path(ctx,points,fill,stroke=null,lineWidth=1) {
  ctx.beginPath();ctx.moveTo(...points[0]);
  for(const p of points.slice(1)){
    if(p.length===6)ctx.bezierCurveTo(...p);
    else if(p.length===4)ctx.quadraticCurveTo(...p);
    else ctx.lineTo(...p);
  }
  if(fill)ctx.closePath();
  brush(ctx,stroke,fill,lineWidth);
}

function scales(ctx,kind) {
  const feather=kind==='feathers', shell=kind==='chitin';
  const w=width/(shell?6:feather?11:14), h=shell?28:feather?22:13;
  for(let j=-1;j<height/h+1;j++)for(let i=-2;i<width/w+1;i++){
    const x=(i+(j%2)*.5)*w, y=j*h;
    const flank=Math.sin(x*Math.PI/width)**2;
    ctx.save();ctx.translate(x,y);
    const tip=h*(feather?1.5:1.15), half=w*.48;
    const gradient=ctx.createLinearGradient(0,-4,0,tip);
    gradient.addColorStop(0,'rgba(67,49,75,.24)');gradient.addColorStop(.56,'rgba(255,243,219,.12)');
    gradient.addColorStop(1,'rgba(87,53,64,.22)');
    path(ctx,[[-half,-2],[0,-h*.35,half,-2],[half,tip*.43,w*.25,tip*.82,0,tip],
      [-w*.28,tip*.82,-half,tip*.43,-half,-2]],gradient);
    path(ctx,[[-half*.91,1],[-half*.72,tip*.75,0,tip],[half*.6,tip*.7,half*.86,tip*.22]],null,
      'rgba(63,45,65,'+(.22+flank*.21)+')',shell?2.7:1.5);
    path(ctx,[[0,tip-1],[half*.40,tip*.78,half*.66,tip*.52]],null,'rgba(255,244,214,.74)',1.25);
    if(feather)path(ctx,[[0,1],[w*.09,tip*.35,0,tip*.74]],null,'rgba(98,64,60,.44)',1.5);
    ctx.restore();
  }
}

function animal(ctx,kind) {
  for(let s of [-1,1]){
    ctx.save();ctx.translate(s>0?0:width,0);ctx.scale(s,1);
    for(let j=0;j<7;j++){
      const y=7+17*j, x=38+9*Math.sin(j*1.7);
      if(kind==='hide')path(ctx,[[126,y-10],[88,y+10,80,y-9,x,y+9],
        [x+24,y+7,x+39,y+17],[88,y+9,104,y+15,126,y+1]],'rgba(47,50,48,.56)');
      else for(let k=0;k<5;k++){
        const a=x-19+k*15+(j%2)*5, yy=y+Math.cos(k+j)*5;
        path(ctx,[[a-5,yy-3],[a,yy-1,a+3,yy+6],[a+5,yy,a+6,yy-1]],null,'rgba(65,53,62,.31)',1.4);
      }
    }
    ctx.restore();
  }
}

function mantle(ctx,kind){
  for(let k=-1;k<=9;k++){
    const x=k*32;
    path(ctx,[[x,-5],[x+14,22,x-13,38,x-2,59],[x+11,81,x+20,97,x+3,134]],
      null,'rgba(82,60,95,.30)',kind==='swirl'?4:1.8);
    for(let j=0;j<5;j++){
      const y=17+j*18, xx=x+7*Math.sin(j*1.6+k*.2);
      ctx.beginPath();ctx.ellipse(xx,y,1.3+j*.28,2.2+j*.18,-.36,0,Math.PI*2);
      ctx.fillStyle='rgba(255,242,201,.77)';ctx.fill();
    }
  }
}

function faults(ctx,kind){
  for(let k=0;k<6;k++){
    const x=k*49-8, y=11+(k%3)*20;
    const pts=[[x,-5],[x-8,y],[x+6,y+11],[x-14,y+32],[x-8,y+31],[x-17,y+49]];
    path(ctx,pts,null,kind==='bone'?'rgba(116,91,71,.43)':'rgba(59,66,87,.52)',2.7);
    path(ctx,pts.map(([a,b])=>[a+1.4,b-.6]),null,'rgba(255,247,218,.7)',1);
    path(ctx,[[x+5,y+11],[x+19,y+18],[x+23,y+16]],null,'rgba(93,89,100,.45)',1.5);
  }
}

function embroidery(ctx,kind){
  for(const hem of [12,108]){
    path(ctx,[[-3,hem],[259,hem]],null,'rgba(82,54,69,.51)',5);
    path(ctx,[[-3,hem-1],[259,hem-1]],null,'#f8d9a1',1.8);
    for(let x=-8;x<262;x+=16)path(ctx,[[x,hem+2],[x+8,hem+7],[x+16,hem+2]],null,'rgba(248,212,154,.91)',1.6);
  }
  for(let x=-32;x<=288;x+=32){
    for(let j=0;j<3;j++){
      const y=30+j*24,xx=x+(j%2)*16;
      if(kind==='burlap') {
        path(ctx,[[xx-5,y+2],[xx+5,y-2]],null,'rgba(74,55,51,.38)',1.8);
        path(ctx,[[xx-1,y-3],[xx+1,y+3]],null,'rgba(110,79,55,.38)',1.3);
      } else if(kind==='motley'){
        path(ctx,[[xx,y-10],[xx+13,y],[xx,y+10],[xx-13,y]],null,'rgba(83,42,65,.43)',1.7);
      } else {
        path(ctx,[[xx,y-8],[xx+2,y-2,xx+8,y+1],[xx+3,y+2,xx,y+7],
          [xx-2,y+2,xx-8,y+1],[xx-3,y-2,xx,y-8]],'rgba(253,221,165,.53)');
      }
    }
  }
}

function armor(ctx,kind){
  const bands=kind==='lamellar'?5:kind==='linen'?6:3;
  for(let j=0;j<bands;j++){
    const y=(j+.55)*128/bands;
    for(let i=-1;i<5;i++){
      const x=i*64;
      const pts=[[x,y-5],[x+12,y-5],[x+23,y],[x+45,y],[x+54,y-5],[x+64,y-5]];
      path(ctx,pts,null,'rgba(50,57,74,.49)',3);
      path(ctx,pts.map(([a,b])=>[a,b+2.1]),null,'rgba(252,239,208,.83)',1.2);
      if(kind==='linen')continue;
      for(let k=0;k<3;k++) {
        const xx=x+28+k*6, yy=y-8;
        path(ctx,[[xx,yy+1],[xx+3,yy-3]],null,kind==='suit'?'#be9971':'rgba(45,52,70,.62)',2.1);
      }
    }
  }
}

// The reserved white tile lets unpainted parts share a draw with painted ones.
function texture(){
  if(atlas)return atlas;
  const canvas=document.createElement('canvas');canvas.width=cols*width;canvas.height=rows*height;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  kinds.forEach((kind,i)=>{
    ctx.save();ctx.translate((i%cols)*width,Math.floor(i/cols)*height);
    ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();ctx.lineJoin='round';ctx.lineCap='round';
    if(kind==='cobra'){
      scales(ctx,'chitin');
      for(const x of [36,220]){
        for(const [rx,ry,dy,color] of [[14,20,0,'#4a4058'],[11,16,-1,'#f8d9bc'],[7,11,-2,'#77729b'],[3,5,-4,'#3c3c57']]){
          ctx.beginPath();ctx.ellipse(x,38+dy,rx,ry,x<100?-.32:.32,0,Math.PI*2);
          ctx.fillStyle=color;ctx.fill();
        }
      }
    }else if(['scales','chitin','feathers'].includes(kind))scales(ctx,kind);
    else if(['pelt','panda','hide'].includes(kind))animal(ctx,kind);
    else if(kind==='mantle'||kind==='swirl')mantle(ctx,kind);
    else if(kind==='strata'||kind==='bone')faults(ctx,kind);
    else if(['motley','brocade','coat','burlap'].includes(kind))embroidery(ctx,kind);
    else armor(ctx,kind);
    ctx.restore();
  });
  atlas=new THREE.CanvasTexture(canvas);atlas.colorSpace=THREE.SRGBColorSpace;atlas.userData.shared=true;
  return atlas;
}

export function wrapInk(geometry,kind,segments,steps){
  const tile=kinds.indexOf(kind), uv=new Float32Array(geometry.attributes.position.count*2);
  const x=tile%cols,y=Math.floor(tile/cols);
  for(let j=0;j<=steps;j++)for(let k=0;k<=segments;k++){
    const i=(j*(segments+1)+k)*2;
    uv[i]=(x+(.5+k/segments*(width-1))/width)/cols;
    uv[i+1]=1-(y+(.5+(1-j/steps)*(height-1))/height)/rows;
  }
  for(let i=uv.length-4;i<uv.length;i+=2){uv[i]=(x+.5)/cols;uv[i+1]=1-(y+.5)/rows;}
  geometry.setAttribute('inkUV',new THREE.BufferAttribute(uv,2));
}

export function inkMaterial(material,parts){
  if(!parts.some(p=>p.hasAttribute('inkUV')))return material;
  for(const p of parts){
    let uv=p.attributes.inkUV;
    if(!uv){
      const data=new Float32Array(p.attributes.position.count*2);
      for(let i=0;i<data.length;i+=2){data[i]=((unpainted%cols)+.5)/cols;data[i+1]=1-(Math.floor(unpainted/cols)+.5)/rows;}
      uv=new THREE.BufferAttribute(data,2);
    }
    p.setAttribute('uv',uv);p.deleteAttribute('inkUV');
  }
  if(!materials.has(material)){
    const painted=material.clone();painted.map=texture();painted.userData.shared=true;
    materials.set(material,painted);
  }
  return materials.get(material);
}
