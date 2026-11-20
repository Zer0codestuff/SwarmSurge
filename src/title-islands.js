// A cutaway coastal archipelago and causeway. Shore strata, volcanic boss isle,
// distant campaign citadels, bridge deck and luminous accents are static batches.
import * as THREE from 'three';
import { assetBatch, assetGlow } from './asset-kit.js';
import { bush, palm, rockCluster } from './scenery-assets.js';

function island(batch, breakers, x, z, rx, rz, top, seed, volcanic = false) {
  const segments = 18, points = [], colors = [];
  const rim = Array.from({ length: segments }, (_, i) => {
    const a = i * 2 * Math.PI / segments;
    const r = 1 + .10 * Math.sin(3 * a + seed) + .08 * Math.cos(5 * a - seed);
    return [rx * r * Math.cos(a), rz * r * Math.sin(a)];
  });
  const layers = volcanic
    ? [
        [-3.25, 1.24, 0x355d6e],
        [-2.82, 1.18, 0x625055],
        [-2.42, 1.06, 0x4b3b42],
        [top - .56, 1.00, 0x5c464a],
        [top - .18, .94, 0x73524d],
        [top, .88, 0x4b3e47],
      ]
    : [
        [-3.25, 1.24, 0x3d8896],
        [-2.82, 1.20, 0xf2bc85],
        [-2.42, 1.06, 0xa86653],
        [top - .56, 1.01, 0xdd9168],
        [top - .18, .95, 0xe7c987],
        [top, .88, 0x72b698],
      ];
  const capColor = volcanic ? 0x4a3d46 : 0x72b698;
  const color = new THREE.Color();
  function triangle(a, b, c, hex, tone) {
    points.push(...a, ...b, ...c);
    color.setHex(hex).multiplyScalar(tone);
    for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
  }
  const vertex = (i, [y, s]) => [x + rim[i][0] * s, y, z + rim[i][1] * s];
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    if ((i + seed) % 4 !== 0) {
      const strip = new THREE.BufferGeometry();
      const surf = (t, scale) => [
        x + THREE.MathUtils.lerp(rim[i][0], rim[j][0], t) * scale,
        -2.98,
        z + THREE.MathUtils.lerp(rim[i][1], rim[j][1], t) * scale,
      ];
      const a = surf(.06, 1.255), b = surf(.92, 1.255);
      const c = surf(.16, 1.292), d = surf(.80, 1.298);
      strip.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...c, ...b, ...d], 3));
      strip.computeVertexNormals();
      breakers.add(strip, volcanic ? 0x73bcc0 : 0x99e8e0);
    }
    for (let k = 1; k < layers.length; k++) {
      const a = vertex(i, layers[k - 1]), b = vertex(j, layers[k - 1]);
      const c = vertex(i, layers[k]), d = vertex(j, layers[k]);
      const tone = .91 + .09 * Math.cos(i * 4 + seed);
      triangle(a, c, b, layers[k][2], tone);
      triangle(c, d, b, layers[k][2], tone);
    }
    triangle([x, top, z], vertex(j, layers.at(-1)), vertex(i, layers.at(-1)), capColor, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  batch.add(g, 0xffffff);
}

function addDistantCitadel(batch, glow, x, y, z, scale = 1) {
  batch.cylinder(.95 * scale, 1.8 * scale, x, y + .9 * scale, z, 0x5c6f82, 'y', 1.15 * scale, 8);
  batch.cylinder(.68 * scale, 2.5 * scale, x, y + 2.8 * scale, z, 0x7a8fa3, 'y', .82 * scale, 8);
  batch.cylinder(.96 * scale, .42 * scale, x, y + 4.15 * scale, z, 0xd8c9ae, 'y', .82 * scale, 8);
  batch.cylinder(.08 * scale, 1.1 * scale, x, y + 4.9 * scale, z, 0xe8b56b, 'y', .65 * scale, 6);
  glow.sphere(.30 * scale, x, y + 4.55 * scale, z, 0xffdf8c, 1, 1.25, 1);
}

export function buildTitleCoast(scene) {
  const shore = assetBatch(), deck = assetBatch(), breakers = assetBatch(), glow = assetBatch();
  const islands = [
    [0, 9.2, 6.2, 4.9, -.38],
    [0, -9.8, 6.8, 5.5, -.42],
    [-9.6, -1.6, 3.3, 2.9, -1.15],
    [8.4, -12.6, 3.3, 2.8, -.82],
    [-20, -17, 7, 5, -1],
    [-19, 15, 5, 3, -.6],
    [14, 20, 4, 3, -1],
  ];
  for (const [i, [x, z, rx, rz, top]] of islands.entries()) {
    const volcanic = i === 1;
    island(shore, breakers, x, z, rx, rz, top, i + 1, volcanic);
    const side = i % 2 ? -1 : 1;
    const px = x + side * rx * .66;
    if (volcanic) {
      // Scorched basalt spires and magma cracks frame the Ember Drake's bastion.
      for (const s of [-1, 1]) {
        shore.add(rockCluster(0x463943, i + (s > 0 ? 7 : 3)).scale(1.15, 1.55, 1.1), 0xffffff, s * 4.35, top, z - .95);
        shore.add(rockCluster(0x5a4448, i + (s > 0 ? 11 : 9)).scale(.85, 1.1, .85), 0xffffff, s * 3.1, top, z - 3.05);
        glow.beam([s * 1.15, top + .05, z + 1.25], [s * 3.2, top + .04, z - .6], .16, .06, 0xff7b34);
        glow.beam([s * 1.5, top + .05, z - .4], [s * 2.55, top + .04, z - 2.3], .12, .05, 0xffa642);
      }
      glow.ring(2.25, .075, 0, top + .06, z - .15, 0xff7c35, 'y');
      glow.sphere(.34, 0, top + .02, z - .15, 0xff9f45, 2.4, .18, 2.4);
      continue;
    }
    if (i === 2) {
      // Left coastal watchtower beacon visible in both desktop and portrait mobile frames.
      addDistantCitadel(shore, glow, x - .35, top, z - .4, .74);
      shore.add(rockCluster(0x708d90, 7).scale(1.1, 1.5, 1.05), 0xffffff, x + 1.05, top, z + .55);
      shore.add(bush(0x458878), 0xffffff, x + .45, top, z + .95);
      continue;
    }
    if (i === 3) {
      // Far horizon campaign fortress spire hinting at the 50 worlds ahead.
      addDistantCitadel(shore, glow, x + .15, top, z - .2, .86);
      shore.add(rockCluster(0x6e858c, 12).scale(.95, 1.3, .95), 0xffffff, x - 1.4, top, z + .85);
      continue;
    }
    if (i > 1 && i % 2 === 0) {
      shore.add(rockCluster(0x708d90, i + 5).scale(1.4, 2.4, 1.25), 0xffffff, x, top, z);
      shore.add(bush(0x458878), 0xffffff, x + 1, top, z + .65);
      continue;
    }
    shore.add(
      palm({ height: i % 2 ? 3.7 : 3.25, lean: .65, leaf: 0x359a86, leaf2: 0x1f7e70 }),
      0xffffff,
      px,
      top,
      z + .7,
      0,
      i * 1.9,
    );
    shore.add(rockCluster(0x8a7874, i + 3), 0xffffff, px, top, z - 1.1);
    shore.add(bush(0x398877, 0xff8867), 0xffffff, px - .65, top, z + .35);
    if (i === 0) {
      shore.add(palm({ height: 2.85, lean: .55, leaf: 0x3da28e, leaf2: 0x248272 }), 0xffffff, -rx * .74, top, z + 1.0, 0, 2.6);
      shore.add(bush(0x3d8e7b, 0xffbe5c), 0xffffff, -rx * .62, top, z + .35);
    }
  }

  // Main causeway deck, armor curbs, steel piers & launchpad striping.
  deck.box(7.65, .49, 24.4, 0, -.26, 0, 0x2e4552);
  deck.box(7.25, .12, 24.2, 0, -.065, 0, 0x4c5f74);
  for (const side of [-1, 1]) {
    deck.box(.23, .25, 24.3, side * 3.74, .05, 0, 0xe8ddc1);
    deck.box(.09, .05, 23.7, side * 3.42, .011, 0, 0xf5be69);
    for (let z = -11; z <= 11; z += 2) {
      deck.box(.36, .31, .43, side * 3.74, .13, z, 0x30485e);
      const lampHex = z < -4 ? 0xff9a54 : z > 5 ? 0xffd778 : 0x86f4ee;
      glow.box(.27, .055, .25, side * 3.74, .30, z, lampHex);
    }
    for (const z of [-5, 0, 5]) {
      deck.box(.74, 3.25, .86, side * 2.75, -1.8, z, 0x46586b);
      deck.beam([side * 2.75, -1.75, z], [side * 3.55, -.4, z + 1], .25, .3, 0xb88964);
    }
  }
  for (let z = -10; z <= 10; z += 2) for (const x of [-1.25, 1.25]) deck.box(.055, .025, .66, x, .006, z, 0xa8bcc4);
  for (const z of [6.0, 1.5, -3.5, -6.2]) {
    const cHex = z < -2 ? 0xffcc6a : 0x7ef3ef;
    glow.beam([-.72, .018, z + .38], [0, .018, z - .26], .11, .02, cHex);
    glow.beam([.72, .018, z + .38], [0, .018, z - .26], .11, .02, cHex);
  }
  for (let i = 0; i < 14; i++) deck.box(.48, .04, .34, (i - 6.5) * .49, .014, 7.55, i % 2 ? 0xffc85f : 0x263545);
  for (const z of [-8, -3, 2, 7]) {
    deck.box(7.15, .012, .045, 0, .006, z, 0x3b4d5e);
    for (const x of [-3.15, 3.15]) deck.cylinder(.067, .022, x, .02, z, 0xbac6c1);
  }

  const surface = new THREE.MeshLambertMaterial({ vertexColors: true });
  breakers.finish(scene, 'tidal-foam', new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  shore.finish(scene, 'tidal-islands', surface);
  deck.finish(scene, 'multiplier-causeway', surface);
  glow.finish(scene, 'causeway-lights', assetGlow);

  // Single-draw coastal ocean shader: analytical shoal turquoise halos around every
  // island and bridge pier, layered rolling swells, animated surf pulse and sun glints.
  const water = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader:
      `varying vec2 ocean;
       void main(){
         vec4 p = modelMatrix * vec4(position, 1.0);
         ocean = p.xz;
         gl_Position = projectionMatrix * viewMatrix * p;
       }`,
    fragmentShader:
      `uniform float time;
       varying vec2 ocean;
       float iso(vec2 p, vec2 c, vec2 r){ return length((p - c) / r); }
       void main(){
         vec2 p = ocean;
         float sw1 = sin(p.y * 0.58 + p.x * 0.17 + time * 0.62);
         float sw2 = sin(p.x * 0.64 - p.y * 0.34 + time * 0.41);
         float sw3 = sin((p.x + p.y) * 1.15 - time * 0.92);
         float sw = sw1 * 0.68 + sw2 * 0.36 + sw3 * 0.14;

         // Nearest island normalized radial distance for glowing tropical shallows.
         float d = iso(p, vec2(0.0, 9.2), vec2(6.2, 4.9));
         d = min(d, iso(p, vec2(0.0, -9.8), vec2(6.8, 5.5)));
         d = min(d, iso(p, vec2(-9.6, -1.6), vec2(3.3, 2.9)));
         d = min(d, iso(p, vec2(8.4, -12.6), vec2(3.3, 2.8)));
         d = min(d, iso(p, vec2(-20.0, -17.0), vec2(7.0, 5.0)));
         d = min(d, iso(p, vec2(-19.0, 15.0), vec2(5.0, 3.0)));
         d = min(d, iso(p, vec2(14.0, 20.0), vec2(4.0, 3.0)));
         float pier = length(max(abs(p - vec2(0.0, 0.0)) - vec2(3.8, 9.5), 0.0)) * 0.32 + 1.18;
         d = min(d, pier);

         float shoal = 1.0 - smoothstep(1.16, 1.88, d + 0.04 * sw1);
         float foamPulse = sin(d * 19.0 - time * 2.15 + sw2 * 1.4);
         float shoreFoam = (1.0 - smoothstep(1.18, 1.42, d)) * smoothstep(0.55, 0.96, foamPulse);

         float grad = smoothstep(-22.0, 22.0, p.y * 0.42 - p.x * 0.78 + 2.2 * sw);
         vec3 deepSea = vec3(0.032, 0.138, 0.235);
         vec3 midSea  = vec3(0.088, 0.355, 0.445);
         vec3 shallow = vec3(0.165, 0.585, 0.595);
         vec3 c = mix(deepSea, midSea, grad);
         c = mix(c, shallow, shoal * 0.78);

         float ripple = smoothstep(0.76, 0.88, sw) * (1.0 - smoothstep(0.88, 0.98, sw));
         float crestMask = smoothstep(0.10, 0.92, sin(p.x * 0.74 + p.y * 0.68) * sin(p.y * 0.43));
         c += vec3(0.065, 0.125, 0.13) * ripple * crestMask;

         float glintWave = sin(p.x * 2.1 - p.y * 1.7 + time * 1.65) * sin(p.x * 1.4 + p.y * 2.3 - time * 1.15);
         float sunBand = exp(-pow((p.x + p.y * 0.35 - 4.0) * 0.055, 2.0));
         float sparkle = smoothstep(0.86, 0.99, glintWave) * sunBand;
         c += vec3(0.32, 0.28, 0.18) * sparkle;

         c = mix(c, vec3(0.68, 0.94, 0.93), shoreFoam * 0.46);

         float horizon = smoothstep(26.0, 68.0, length(p));
         c = mix(c, vec3(0.18, 0.39, 0.49), horizon * 0.52);

         gl_FragColor = vec4(c, 1.0);
         #include <colorspace_fragment>
       }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), water);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -3.03;
  scene.add(sea);
  return water.uniforms.time;
}
