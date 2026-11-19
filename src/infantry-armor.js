// Joined facial and suit panels. Each ring is a design line that can dive
// toward the chin, roll into a brow or cut diagonally across a flight suit.
// Adjacent panels share positions and smooth normals, with crisp paint edges.
import * as THREE from 'three';
import { smoothRingSeams } from './boss-shapes.js';

const TAU=Math.PI*2;
const helmets={
  bot:     {width:.217,depth:.196,top:1.005,peak:.006,snout:.024,sweep:.015,
    paint:[0x274968,0x88bcd5,0xe4eff1,0x214362,0x7de9ed,0xffce68]},
  trooper: {width:.190,depth:.177,top:1.047,peak:.025,snout:.028,sweep:.038,
    paint:[0x2e4253,0x709595,0xb6cec5,0x28394a,0xa9d8d4,0xf4be68]},
  paladin: {width:.177,depth:.183,top:1.016,peak:.031,snout:.055,sweep:.042,
    paint:[0x28344e,0x8291a8,0xffebbd,0x322d40,0x8cf2ee,0xffb851]},
  ascended:{width:.157,depth:.164,top:1.055,peak:.038,snout:.047,sweep:.058,
    paint:[0x343653,0x7ea8be,0xcfecef,0x283246,0x9cfff4,0xffd995]},
  raider:  {width:.195,depth:.183,top:1.007,peak:.032,snout:.062,sweep:.043,
    paint:[0x592e42,0x99614e,0xffbf89,0x371f36,0xffdb72,0xffe2aa]},
  sunwing: {width:.163,depth:.155,top:1.064,peak:.041,snout:.041,sweep:.057,
    paint:[0x633642,0xc26c32,0xffc66d,0x28334b,0x8ffff1,0xffe6a1]},
  aegis:   {width:.172,depth:.169,top:1.027,peak:.028,snout:.050,sweep:.046,
    paint:[0x295052,0x789d95,0xfff0c9,0x28383c,0xabfff4,0xe8b264]},
};

function shell(segments, profile, sample, paint, palette) {
  const rows = profile.length;
  const p=[],idx=[],faceColors=[];
  const rgb=palette.map(hex=>new THREE.Color(hex));
  for(let j=0;j<rows;j++)for(let k=0;k<=segments;k++) {
    const a=k*TAU/segments;
    p.push(...sample(profile[j],a));
    if(j===rows-1 || k===segments)continue;
    const n=j*(segments+1)+k, next=n+segments+1;
    idx.push(n,n+1,next,n+1,next+1,next);
    const zone = paint(profile[j], a + Math.PI / segments);
    faceColors.push(zone, zone);
  }
  // Close both ends. Caps share their perimeter normals with the turning edge.
  for(const j of [0,rows-1]) {
    let x=0,y=0,z=0;
    for(let k=0;k<segments;k++){const n=(j*(segments+1)+k)*3;x+=p[n];y+=p[n+1];z+=p[n+2];}
    const mid=p.length/3;p.push(x/segments,y/segments,z/segments);
    for(let k=0;k<segments;k++){const n=j*(segments+1)+k;idx.push(mid,j?n:n+1,j?n+1:n);faceColors.push(j?2:0);}
  }
  const indexed=new THREE.BufferGeometry();
  indexed.setAttribute('position',new THREE.Float32BufferAttribute(p,3));indexed.setIndex(idx);
  indexed.computeVertexNormals();smoothRingSeams(indexed,segments,rows);
  const geo=indexed.toNonIndexed();indexed.dispose();
  const colors=new Float32Array(faceColors.length*9);
  faceColors.forEach((id,i)=>{const c=rgb[id];for(let k=0;k<3;k++)c.toArray(colors,i*9+k*3);});
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  return geo;
}

export function helmet(k,form) {
  const {width,depth,top,peak,snout,sweep,paint}=helmets[form];
  const knight=form==='paladin'||form==='aegis', beast=form==='raider';
  const profile=[[.675,.40],[.709,.70],[.767,.88],[.793,.94],[.818,.99],
    [.839,.97],[.868,1],[.892,.99],[top-.066,.83],[top-.022,.53],[top,.10]];
  const sample=(j,a)=>{
    const [y,r]=profile[j],cos=Math.cos(a), front=Math.max(0,cos), cheek=Math.abs(Math.sin(a));
    const face= j>=2 && j<=7;
    const slit= j>=3 && j<=6;
    const keel=knight ? front**7 : front**2;
    const offset=face ? -sweep*keel+(beast?-.022:.012)*cheek*front : 0;
    const nose=snout*keel*(j<4?1:j===6?1.15:.5);
    // Profile each skull separately. The bot has a broad, flat sensor pod,
    // the raider an underslung muzzle, and the knight a pinched sallet.
    const crown = Math.max(0,(j-6)/4);
    let rx=width*r, elevation=y, backset=0;
    if (form==='bot') { rx*=1+.13*(1-crown);elevation-=.052*crown; }
    if (form==='trooper') { rx*=j<6?.81:j===6?1.22:1.04;elevation-=.026*crown; }
    if (beast) { rx*=j<4?.85:1.09;backset=.072*front*(1-j/10); }
    if (form==='ascended') { rx*=1-.15*crown;elevation+=.06*crown;backset=-.043*crown; }
    if (knight) { backset=-.045*(1-front)*(1-crown);rx*=1+.055*cheek; }
    if (form==='sunwing') { backset=-.09*crown;rx*=1-.12*crown; }
    return [Math.sin(a)*rx,elevation+offset+(j>7?peak*(1-cheek)*((j-7)/3):0),
      cos*r*depth+backset+nose+(slit?-.010*front:0)-(j>7?.035*(j-7)/3:0)];
  };
  const color=(j,a)=>{
    const f=Math.cos(a),s=Math.abs(Math.sin(a));
    if (form==='trooper' && j<6 && f>.18) return j===5?0:j<=2?1:2;
    if (form==='bot' && j>=3 && j<=5 && f>.02) return 3;
    if (beast && j<4 && f>.15) return j===2?0:1;
    if(j===0)return 0;
    if(j>=3 && j<=5 && f>-.15) {
      if(knight && f>.978)return 5;
      if(j===4 && f>.27 && (s>.19 || form==='sunwing'))return 4;
      return 3;
    }
    if(j===6)return f>-.4?5:1;
    if(j<3 && f>.38)return j===2 && beast ? 5 : s<.30 && knight?5:1;
    if(j>=7 && s<.24)return form==='trooper'||form==='raider'?1:5;
    return f<-.55 && j<8?0:2;
  };
  const silhouette = k.low ? [0, 2, 3, 4, 5, 6, 7, 8, 10] : profile.map((_, j) => j);
  k.b.add(shell(k.low ? 8 : 20, silhouette, sample, color, paint), 0xffffff);
}

export function cuirass(k,form) {
  const {paint}=helmets[form],heavy=form==='paladin'||form==='aegis', tapered=form==='ascended'||form==='sunwing';
  const rows=[[.30,.105,.087],[.347,.153,.117],[.375,.15,.113],[.395,.151,.113],
    [.440,.156,.122],[.49,.18,.133],[.553,.211,.151],[.581,.220,.150],
    [.607,.222,.146],[.64,.172,.123],[.687,.093,.082]];
  const sample=(j,a)=>{
    const [y,w,d]=rows[j],f=Math.cos(a),s=Math.sin(a);
    const chest=Math.max(0,f), panel=(j>=5&&j<=8);
    const seam=tapered ? .038*s : -.034*chest**3;
    return [w*s*(heavy?1.05:tapered?.88:1), y+(panel?seam:0),
      d*f+(panel?.022*chest**3+.014*s*s:0)];
  };
  const color=(j,a)=>{
    const f=Math.cos(a),s=Math.abs(Math.sin(a));
    if(j<2)return 0;if(j===2)return s<.36?5:1;
    if(j===6)return s<.38?4:1;
    if(j>=7&&s>.84)return 1;
    if(j===9)return s<.43?5:0;
    if(f<-.55 && j>3 && s<.41)return j===5?4:0;
    return j<5?1:2;
  };
  const silhouette = k.low ? [0, 2, 4, 6, 7, 9, 10] : rows.map((_, j) => j);
  k.b.add(shell(k.low ? 8 : 14, silhouette, sample, color, paint), 0xffffff);
}
