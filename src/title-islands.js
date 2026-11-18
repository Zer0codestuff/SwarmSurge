// A cutaway coastal causeway. The bridge, shore strata and vegetation are static batches.
import * as THREE from 'three';
import { assetBatch } from './asset-kit.js';
import { bush, palm, rockCluster } from './scenery-assets.js';

function island(batch, breakers, x, z, rx, rz, top, seed) {
  const segments = 18, points = [], colors = [];
  const rim = Array.from({ length: segments }, (_, i) => {
    const a = i * 2 * Math.PI / segments;
    const r = 1 + .10 * Math.sin(3 * a + seed) + .08 * Math.cos(5 * a - seed);
    return [rx * r * Math.cos(a), rz * r * Math.sin(a)];
  });
  const layers = [
    [-3.25, 1.24, 0x3e8291],
    [-2.82, 1.20, 0xeeb580],
    [-2.42, 1.06, 0xa56553],
    [top - .56, 1.01, 0xdb906a],
    [top - .18, .95, 0xe3c483],
    [top, .88, 0x76b49a],
  ];
  const color = new THREE.Color();
  function triangle(a, b, c, hex, tone) {
    points.push(...a, ...b, ...c);
    color.setHex(hex).multiplyScalar(tone);
    for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
  }
  const vertex = (i, [y, s]) => [x + rim[i][0] * s, y, z + rim[i][1] * s];
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    // Small broken crests follow the actual shore, including its coves.
    if ((i + seed) % 4 !== 0) {
      const strip = new THREE.BufferGeometry();
      const surf = (t, scale) => [
        x + THREE.MathUtils.lerp(rim[i][0], rim[j][0], t) * scale,
        -2.99,
        z + THREE.MathUtils.lerp(rim[i][1], rim[j][1], t) * scale,
      ];
      const a = surf(.07, 1.255), b = surf(.91, 1.255);
      const c = surf(.17, 1.282), d = surf(.79, 1.288);
      strip.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...c, ...b, ...d], 3));
      strip.computeVertexNormals();
      breakers.add(strip, 0x83cfca);
    }
    for (let k = 1; k < layers.length; k++) {
      const a = vertex(i, layers[k - 1]), b = vertex(j, layers[k - 1]);
      const c = vertex(i, layers[k]), d = vertex(j, layers[k]);
      const tone = .92 + .08 * Math.cos(i * 4 + seed);
      triangle(a, c, b, layers[k][2], tone);
      triangle(c, d, b, layers[k][2], tone);
    }
    triangle([x, top, z], vertex(j, layers.at(-1)), vertex(i, layers.at(-1)), 0x76b49a, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  batch.add(g, 0xffffff);
}

export function buildTitleCoast(scene) {
  const shore = assetBatch(), deck = assetBatch(), breakers = assetBatch();
  const islands = [
    [0, 9, 6, 4.7, -.38],
    [0, -9.8, 6.7, 5.4, -.42],
    [-10, -1, 3.4, 3, -1.2],
    [12, -18, 4.6, 4, -.7],
    [-20, -17, 7, 5, -1],
    [-19, 15, 5, 3, -.6],
    [14, 20, 4, 3, -1],
  ];
  for (const [i, [x, z, rx, rz, top]] of islands.entries()) {
    island(shore, breakers, x, z, rx, rz, top, i + 1);
    const side = i % 2 ? -1 : 1;
    const px = x + side * rx * .66;
    if (i > 1 && i % 2 === 0) {
      shore.add(rockCluster(0x708d90, i + 5).scale(1.4, 2.4, 1.25), 0xffffff, x, top, z);
      shore.add(bush(0x458878), 0xffffff, x + 1, top, z + .65);
      continue;
    }
    shore.add(
      palm({ height: i % 2 ? 3.7 : 3.1, lean: .65, leaf: 0x379584, leaf2: 0x217e70 }),
      0xffffff,
      px,
      top,
      z + .7,
      0,
      i * 1.9,
    );
    shore.add(rockCluster(0x8a7874, i + 3), 0xffffff, px, top, z - 1.1);
    shore.add(bush(0x398877, 0xff8867), 0xffffff, px - .65, top, z + .35);
  }
  deck.box(7.6, .49, 24.4, 0, -.26, 0, 0x334954);
  deck.box(7.25, .12, 24.2, 0, -.065, 0, 0x536378);
  for (const side of [-1, 1]) {
    deck.box(.22, .24, 24.3, side * 3.73, .05, 0, 0xe4d8bc);
    deck.box(.09, .05, 23.7, side * 3.42, .011, 0, 0xf3ba68);
    for (let z = -11; z <= 11; z += 2) {
      deck.box(.35, .30, .42, side * 3.73, .13, z, 0x344c61);
      deck.box(.27, .04, .25, side * 3.73, .29, z, 0x78deda);
    }
    for (const z of [-5, 0, 5]) {
      deck.box(.72, 3.2, .84, side * 2.75, -1.8, z, 0x49596b);
      deck.beam([side * 2.75, -1.75, z], [side * 3.55, -.4, z + 1], .25, .3, 0xb38461);
    }
  }
  for (let z = -10; z <= 10; z += 2) for (const x of [-1.2, 1.2]) deck.box(.055, .025, .66, x, .006, z, 0xa6b5bb);
  for (let i = 0; i < 14; i++) deck.box(.48, .04, .34, (i - 6.5) * .49, .014, 7.6, i % 2 ? 0xffc55f : 0x283747);
  for (const z of [-8, -3, 2, 7]) {
    deck.box(7.15, .012, .045, 0, .006, z, 0x3f5061);
    for (const x of [-3.15, 3.15]) deck.cylinder(.067, .022, x, .02, z, 0xbac6c1);
  }
  const surface = new THREE.MeshLambertMaterial({ vertexColors: true });
  breakers.finish(scene, 'tidal-foam', new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  shore.finish(scene, 'tidal-islands', surface);
  deck.finish(scene, 'multiplier-causeway', surface);
  const water = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader:
      `varying vec2 ocean; void main(){vec4 p=modelMatrix*vec4(position,1.); ocean=p.xz; gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `uniform float time; varying vec2 ocean;
      void main(){
        vec2 p=ocean; float sw=sin(p.y*.65+p.x*.16+time*.48)+.35*sin(p.x*.67-p.y*.36+time*.26);
        float ripple=smoothstep(.94,1.02,sw)*(1.-smoothstep(1.02,1.09,sw));
        float crestMask=smoothstep(.15,.94,sin(p.x*.77+p.y*.73)*sin(p.y*.45));
        float depth=smoothstep(-19.,20.,p.y*.4-p.x*.85+2.4*sw);
        vec3 c=mix(vec3(.035,.15,.23),vec3(.10,.39,.43),depth);
        c+=vec3(.055,.10,.10)*ripple*crestMask;
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), water);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -3.03;
  scene.add(sea);
  return water.uniforms.time;
}
