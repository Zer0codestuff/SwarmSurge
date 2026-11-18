// Shaped and painted hide, fabric and plate. The markings are sampled on the
// actual surface rings, so an underbelly, lapel or mantle follows the body as
// it turns. Vertex pigments carry broad markings beneath the fine atlas detail.
import * as THREE from 'three';
import { wrapInk } from './character-ink.js';
import { loftGeometry, smoothRingSeams } from './boss-shapes.js';

const PI = Math.PI, TAU = PI * 2;
const sat = x => Math.max(0, Math.min(1, x));
const ease = (a,b,x) => { const t = sat((x-a)/(b-a)); return t*t*(3-2*t); };
const frac = x => x - Math.floor(x);
const crest = (x,w) => 1 - ease(0,w,Math.abs(x));

// Shadow, body, contrasting field, edge. Width and frequency belong to the
// character, rather than to a material shared by all members of a family.
const surfaces = {
  dragon:    ['scales', 0x652f38,0xb84e3b,0xeab274,0xffcf82, 7, 8],
  magma:     ['scales', 0x302a38,0x6b3834,0xdf6133,0xffb34e, 6, 9],
  trex:      ['hide',   0x283f30,0x6e833e,0xe6c588,0xabb370, 6, 8],
  mesmer:    ['scales', 0x332454,0x8950bd,0xdd78bb,0xf7c371, 6, 6],
  spider:    ['chitin', 0x322a50,0x694677,0xb499df,0xf3aadc, 5, 6],
  kraken:    ['mantle', 0x623454,0xb65078,0xe98e86,0xffcd8c, 4, 8],
  jelly:     ['mantle', 0xab457e,0xe873ad,0xf6b99d,0xffe5bf, 3, 6],
  roc:       ['feathers',0x583628,0x985831,0xf3dcaf,0xffba69, 6, 9],
  brute:     ['pelt',   0x314936,0x60814a,0xa4b878,0xb4c48b, 5, 8],
  panda:     ['panda',  0x272833,0x3b3940,0xf3e6ce,0xfff1dc, 5, 8],
  golem:     ['strata', 0x385e7e,0x85bcd4,0xb8e7e6,0xe1ffff, 4, 5],
  thunder:   ['strata', 0x394358,0x6e8398,0x88b3c5,0xfcd976, 4, 4],
  storm:     ['swirl',  0x526f9b,0x8fb8c5,0xd0dce3,0xf2dfae, 3, 4],
  skeleton:  ['bone',   0x877969,0xe1cfae,0xf1e3c4,0xffebd2, 3, 5],
  king:      ['brocade',0x733245,0xa64655,0xe29764,0xffdf90, 3, 6],
  emperor:   ['brocade',0x382645,0x694476,0xbd846d,0xffdd93, 4, 8],
  commander: ['coat',   0x65283d,0xb23747,0xe38d55,0xffce83, 3, 6],
  pumpkin:   ['coat',   0x31253e,0x56364e,0xa15a45,0xe7b66e, 3, 7],
  ringmaster:['coat',   0x70263e,0xc53b48,0xf4e2bd,0xeeb65c, 3, 6],
  scarecrow: ['burlap', 0x634e39,0xae884f,0xd5ad71,0xf7dbaa, 4, 6],
  pharaoh:   ['linen',  0x947957,0xdfc89b,0xf0d9b4,0xffedc8, 7, 3],
  jack:      ['motley', 0x443254,0x316da1,0xc93d59,0xeab664, 3, 8],
  dice:      ['inlay',  0xa8917d,0xebd8b9,0xffecd3,0xd39958, 2, 4],
  robot:     ['plate',  0x223244,0x4e667d,0x7892a4,0x76ded8, 4, 6],
  moon:      ['suit',   0x697e94,0xd9dfda,0x9cb6c4,0xf1a95e, 5, 6],
  titan:     ['chitin', 0x292237,0x4d3a61,0x8d688e,0xcb96dc, 4, 8],
  drill:     ['plate',  0x654735,0xb18142,0xe4ad55,0xffdd8c, 4, 6],
  flipper:   ['plate',  0x38425c,0x8a9bab,0xc6d9e5,0xfa7fb6, 3, 7],
  locomotive:['plate',  0x242f36,0x475469,0x94664f,0xf6b859, 4, 6],
  shogun:    ['lamellar',0x52293d,0xb14243,0xd88963,0xffca80, 6, 8],
  clockwork: ['plate',  0x644334,0xb2864d,0xd9ae72,0x81ded6, 4, 8],
  overlord:  ['brocade',0x32213e,0x583360,0x985787,0xe4b774, 4, 7],
};

function relief(kind,v,a,rows,flutes) {
  const front = Math.cos(a), side = Math.sin(a), wave = Math.cos(flutes*a);
  const bib = ease(.20,.82,front-.25*Math.cos(v*TAU));
  let depth=0, dark=0, field=0, edge=0;
  switch (kind) {
    case 'scales': case 'chitin': case 'feathers': {
      const plume = kind==='feathers', shell = kind==='chitin';
      const lobe = .5+.5*Math.cos(a*flutes + (Math.floor(v*rows)%2)*PI);
      const pitch = frac(v*rows + (shell?.28:.46)*lobe + .18*front);
      const plate = ease(0,.24,pitch)*(1-ease(.75,1,pitch));
      depth=(plate-.35)*(plume?.080:.055) + .035*bib;
      dark=(1-plate)*.70;
      field=plume ? bib*(.76+.24*plate) : shell ? .58*lobe*plate : bib*(.60+.30*plate);
      edge=crest(pitch-.77,.17)*(plume?.47:.32);
      break;
    }
    case 'hide': case 'pelt': case 'panda': {
      const stripe=.5+.5*Math.cos(a*flutes*.5+v*11+.9*Math.sin(v*8));
      const tufts=Math.cos(flutes*a+.7*Math.sin(v*13))*Math.sin(v*23);
      depth=.023*tufts+.055*bib;
      dark=kind==='hide' ? .85*ease(.42,.87,stripe)*(1-.8*bib) : .24*(1-tufts);
      field=kind==='panda' ? 1-ease(.43,.60,v-.13*front+.055*Math.cos(4*a)) : bib*(.84+.13*tufts);
      edge=.09*ease(.2,.85,tufts); break;
    }
    case 'mantle': case 'swirl': {
      const ribs=.5+.5*Math.cos(flutes*a+(kind==='swirl'?v*8:1.4*Math.sin(v*PI)));
      depth=(ribs-.4)*(.08+.04*v);
      dark=.65*(1-ribs)**2;field=.65*ribs*ease(.12,.84,v)+.17*bib;
      edge=.56*crest(v-.20-.085*Math.cos(a*flutes),.055); break;
    }
    case 'strata': case 'bone': {
      const fault=frac(v*rows+.29*Math.sin(3*a+v*6)+.15*Math.abs(Math.sin(flutes*a)));
      depth=.082*(fault-.44)*Math.sin(PI*v);dark=.69*(1-ease(0,.27,fault));
      field=.62*ease(.24,.81,fault)*(.6+.4*Math.cos(a+v*3));edge=crest(fault-.83,.09)*.56; break;
    }
    case 'motley': case 'brocade': case 'coat': case 'burlap': {
      const fold=.5+.5*Math.cos(flutes*a+.65*Math.sin(a*2+v*7));
      const diamonds=Math.cos(flutes*a)+Math.cos(v*rows*TAU);
      const lapel=v-.34-.43*(1-Math.max(0,front));
      depth=(fold-.45)*(.11-.06*v)+.025*ease(-.025,.025,lapel);
      dark=.54*(1-fold)**2;
      field=kind==='motley'?ease(-.18,.18,diamonds): kind==='coat'? .85*ease(.01,.08,lapel)*bib : kind==='burlap'? .3*fold:.38*ease(.3,1,diamonds);
      edge=Math.max(crest(lapel,.034)*bib,crest(v-.13-.025*wave,.04))*.9;
      break;
    }
    case 'linen': case 'suit': {
      const seam=frac(v*rows+.24*Math.sin(a*2)+.17*side);
      depth=.057*(ease(.01,.32,seam)-.46);dark=.66*crest(seam-.09,.17);
      field=.46*ease(.32,.7,seam);edge=kind==='suit'?.8*crest(v-.29-.065*front,.055):.18*field;break;
    }
    default: {
      const arc=frac(v*rows+.30*Math.abs(side)+.20*front);
      const bevel=ease(.03,.24,arc)*(1-ease(.80,1,arc));
      depth=(bevel-.35)*(kind==='lamellar'?.095:.052);
      dark=.72*(1-bevel);field=.36*bevel*(.55+.45*wave);
      edge=crest(arc-.76,.11)*(.4+.6*ease(.55,.93,wave));break;
    }
  }
  return [depth,dark,field,edge];
}

export function characterLoft(batch, sections, name, x=0,y=0,z=0, options={}) {
  const [kind,shadow,body,field,edge,rows,flutes]=surfaces[name];
  const segments=options.segments??32, steps=options.steps??28;
  const g=loftGeometry(sections,{...options,segments,steps});
  const {position,normal,color}=g.attributes;
  const palette=[shadow,body,field,edge].map(hex=>new THREE.Color(hex));
  const paint=new THREE.Color();
  const radius=Math.max(...sections.map(r=>Math.min(r[1],r[2])));
  for(let j=0;j<=steps;j++)for(let k=0;k<=segments;k++) {
    const i=j*(segments+1)+k, v=j/steps,a=k*TAU/segments;
    const [offset,shade,mark,rim]=relief(kind,v,a,rows,flutes);
    const d=radius*offset*Math.sin(v*PI);
    position.setXYZ(i,position.getX(i)+normal.getX(i)*d,position.getY(i)+normal.getY(i)*d,position.getZ(i)+normal.getZ(i)*d);
    paint.copy(palette[1]).lerp(palette[0],sat(shade)).lerp(palette[2],sat(mark)).lerp(palette[3],sat(rim));
    color.setXYZ(i,paint.r,paint.g,paint.b);
  }
  for(let i=position.count-2;i<position.count;i++)color.setXYZ(i,palette[1].r,palette[1].g,palette[1].b);
  g.computeVertexNormals();smoothRingSeams(g,segments,steps+1);
  wrapInk(g,name==='mesmer'?'cobra':kind,segments,steps);
  return batch.add(g,0xffffff,x,y,z);
}
