import * as THREE from 'three';
import { LATE_AMBIENT } from './biomes-late.js';

/** Upload only the first `count` items of a dynamic attribute: most pools run far below capacity. */
export function uploadUsed(attribute, count) {
  if (count <= 0) return;
  attribute.clearUpdateRanges();
  attribute.addUpdateRange(0, count * attribute.itemSize);
  attribute.needsUpdate = true;
}

// Soft round glowing points (additive). Clamped point size prevents full-screen fill-rate stalls near the camera.
const glowVert = `
  attribute float size;
  attribute float alpha;
  attribute vec3 color;
  varying mediump vec3 vColor;
  varying mediump float vAlpha;
  uniform float uScale;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(size * uScale / max(1.4, -mv.z), uScale * 0.13);
    gl_Position = projectionMatrix * mv;
  }`;
const glowFrag = `
  varying mediump vec3 vColor;
  varying mediump float vAlpha;
  void main() {
    mediump vec2 p = gl_PointCoord - 0.5;
    mediump float r2 = dot(p, p);
    if (r2 > 0.25) discard;
    mediump float d2 = r2 * 4.0;
    mediump float inv = 1.0 - d2;
    mediump float core = smoothstep(0.14, 0.0, d2);
    mediump float a = inv * inv * (0.62 + 0.38 * core);
    gl_FragColor = vec4(vColor * (1.0 + core), a * vAlpha);
  }`;
function glowMaterial(blending = THREE.AdditiveBlending) {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 400 } },
    vertexShader: glowVert, fragmentShader: glowFrag,
    transparent: true, depthWrite: false, blending,
  });
}
export const glowMaterials = [];

// Reuse impact rings so dense splash weapons do not allocate scene objects per shot.
export class Rings {
  constructor(scene, capacity = 64) {
    this.capacity = capacity; this.head = 0; this.alive = false;
    for (const key of ['life', 'duration', 'radius', 'x', 'z']) this[key] = new Float32Array(capacity);
    this.colors = new Float32Array(capacity * 3); this.color = new THREE.Color();
    const geometry = new THREE.RingGeometry(.82, 1, 20);
    geometry.setAttribute('ringAlpha', new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: `
        attribute float ringAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = instanceColor; vAlpha = ringAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(vColor, vAlpha * .85);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0; scene.add(this.mesh);
  }
  emit(x, z, radius, color, duration) {
    if (!(radius > 0 && duration > 0)) return;
    const i = this.head; this.head = (i + 1) % this.capacity;
    this.x[i] = x; this.z[i] = z; this.radius[i] = radius;
    this.life[i] = this.duration[i] = duration;
    this.color.set(color).toArray(this.colors, i * 3);
    this.alive = true;
  }
  update(dt) {
    if (!this.alive) return;
    let count = 0;
    const matrices = this.mesh.instanceMatrix.array, colors = this.mesh.instanceColor.array;
    const alpha = this.mesh.geometry.attributes.ringAlpha.array;
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] = Math.max(0, this.life[i] - dt);
      if (!this.life[i]) continue;
      const fade = this.life[i] / this.duration[i], radius = this.radius[i] * (.3 + (1 - fade) * .9), o = count * 16;
      matrices[o] = radius; matrices[o + 1] = matrices[o + 2] = matrices[o + 3] = 0;
      matrices[o + 4] = matrices[o + 5] = matrices[o + 7] = matrices[o + 8] = matrices[o + 10] = matrices[o + 11] = 0;
      matrices[o + 6] = -radius; matrices[o + 9] = 1;
      matrices[o + 12] = this.x[i]; matrices[o + 13] = .05; matrices[o + 14] = this.z[i]; matrices[o + 15] = 1;
      for (let k = 0; k < 3; k++) colors[count * 3 + k] = this.colors[i * 3 + k];
      alpha[count] = fade; count++;
    }
    this.mesh.count = count;
    this.alive = count > 0;
    uploadUsed(this.mesh.instanceMatrix, count); uploadUsed(this.mesh.instanceColor, count);
    uploadUsed(this.mesh.geometry.attributes.ringAlpha, count);
  }
  clear() { this.life.fill(0); this.mesh.count = 0; this.head = 0; this.alive = false; }
}

// One reusable draw call for blaster shots, lightning and air-strike trails.
export class Tracers {
  constructor(scene, capacity = 128) {
    this.capacity = capacity; this.head = 0; this.alive = false;
    this.life = new Float32Array(capacity); this.duration = new Float32Array(capacity);
    this.base = new Float32Array(capacity * 16); this.colors = new Float32Array(capacity * 3);
    this.matrix = new THREE.Matrix4(); this.rotation = new THREE.Quaternion();
    this.direction = new THREE.Vector3(); this.position = new THREE.Vector3();
    this.scale = new THREE.Vector3(); this.axis = new THREE.Vector3(0, 0, 1); this.color = new THREE.Color();
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .82, depthWrite: false }), capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    scene.add(this.mesh);
  }
  emit(x1, y1, z1, x2, y2, z2, color, duration = .14, width = .08) {
    this.direction.set(x2-x1,y2-y1,z2-z1);
    const length = this.direction.length();
    if (length < .001 || duration <= 0) return;
    const i = this.head; this.head = (this.head + 1) % this.capacity;
    this.rotation.setFromUnitVectors(this.axis, this.direction.divideScalar(length));
    this.position.set((x1+x2)/2,(y1+y2)/2,(z1+z2)/2); this.scale.set(width,width,length);
    this.matrix.compose(this.position,this.rotation,this.scale).toArray(this.base,i*16);
    this.color.set(color).toArray(this.colors,i*3);
    this.duration[i] = this.life[i] = duration;
    this.alive = true;
  }
  update(dt) {
    if (!this.alive) return;
    let count = 0;
    const matrices = this.mesh.instanceMatrix.array, colors = this.mesh.instanceColor.array;
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] = Math.max(0, this.life[i] - dt);
      if (!this.life[i]) continue;
      const fade = Math.sqrt(this.life[i] / this.duration[i]);
      const src = i*16, dst = count*16;
      for (let k = 0; k < 16; k++) matrices[dst+k] = this.base[src+k];
      for (let axis = 0; axis < 3; axis++) { matrices[dst+axis] *= fade; matrices[dst+4+axis] *= fade; }
      for (let k = 0; k < 3; k++) colors[count*3+k] = this.colors[i*3+k];
      count++;
    }
    this.mesh.count = count;
    this.alive = count > 0;
    uploadUsed(this.mesh.instanceMatrix, count); uploadUsed(this.mesh.instanceColor, count);
  }
  clear() { this.life.fill(0); this.mesh.count = 0; this.head = 0; this.alive = false; }
}

// Densely packed pool of physics sparks (O(1) swap-remove so zero dead slots are ever scanned or uploaded).
export class Sparks {
  constructor(scene, N = 900) {
    this.N = N;
    this.count = 0;
    this.head = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * 3);
    this.col = new Float32Array(N * 3);
    this.size = new Float32Array(N);
    this.alpha = new Float32Array(N);
    this.vel = new Float32Array(N * 3);
    this.life = new Float32Array(N);
    this.max = new Float32Array(N);
    this.size0 = new Float32Array(N);
    this.grav = new Float32Array(N);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.geo = g;
    const m = glowMaterial();
    glowMaterials.push(m);
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }
  get scanEnd() { return this.count; }
  alloc() {
    if (this.count < this.N) return this.count++;
    const i = this.head;
    this.head = (i + 1) % this.N;
    return i;
  }
  emit(x, y, z, col, n, speed = 4, size = 0.8, life = 0.5, grav = -6, spread = 1) {
    // Under heavy load, gently throttle oversized bursts so fill-rate stays locked.
    const load = this.count / this.N;
    const actual = load > 0.7 ? Math.max(1, Math.ceil(n * 0.45)) : load > 0.45 ? Math.max(1, Math.ceil(n * 0.7)) : n;
    for (let k = 0; k < actual; k++) {
      const i = this.alloc(), o = i * 3;
      this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z;
      const a = Math.random() * 6.283, u = Math.random() * 2 - 1, s = speed * (0.35 + Math.random() * 0.65);
      const r = Math.sqrt(1 - u * u);
      this.vel[o] = Math.cos(a) * r * s * spread; this.vel[o + 1] = Math.abs(u) * s; this.vel[o + 2] = Math.sin(a) * r * s * spread;
      this.col[o] = col[0]; this.col[o + 1] = col[1]; this.col[o + 2] = col[2];
      this.size0[i] = this.size[i] = size * (0.6 + Math.random() * 0.8);
      this.max[i] = this.life[i] = life * (0.6 + Math.random() * 0.6);
      this.alpha[i] = 1;
      this.grav[i] = grav;
    }
  }
  // a stream of sparks flying from A to B (upgrade beams, warp trails)
  stream(x1, y1, z1, x2, y2, z2, col, n, time = 0.45, size = 0.9) {
    const actual = this.count > this.N * 0.65 ? Math.max(4, Math.ceil(n * 0.5)) : n;
    for (let k = 0; k < actual; k++) {
      const i = this.alloc(), o = i * 3;
      const t = time * (0.7 + Math.random() * 0.5);
      this.pos[o] = x1 + (Math.random() - 0.5) * 0.6; this.pos[o + 1] = y1; this.pos[o + 2] = z1 + (Math.random() - 0.5) * 0.6;
      this.vel[o] = (x2 - x1) / t; this.vel[o + 1] = (y2 - y1) / t; this.vel[o + 2] = (z2 - z1) / t;
      this.col[o] = col[0]; this.col[o + 1] = col[1]; this.col[o + 2] = col[2];
      this.size0[i] = this.size[i] = size; this.max[i] = this.life[i] = t; this.alpha[i] = 1; this.grav[i] = 0;
    }
  }
  update(dt) {
    let n = this.count;
    if (n === 0) return;
    const P = this.pos, V = this.vel, C = this.col;
    for (let i = 0; i < n; ) {
      const rem = this.life[i] - dt;
      if (rem <= 0) {
        n--;
        if (i < n) {
          const d = i * 3, s = n * 3;
          P[d] = P[s]; P[d + 1] = P[s + 1]; P[d + 2] = P[s + 2];
          V[d] = V[s]; V[d + 1] = V[s + 1]; V[d + 2] = V[s + 2];
          C[d] = C[s]; C[d + 1] = C[s + 1]; C[d + 2] = C[s + 2];
          this.life[i] = this.life[n]; this.max[i] = this.max[n];
          this.size0[i] = this.size0[n]; this.grav[i] = this.grav[n];
          this.size[i] = this.size[n]; this.alpha[i] = this.alpha[n];
        }
        continue;
      }
      this.life[i] = rem;
      const o = i * 3, g = this.grav[i];
      V[o + 1] += g * dt;
      const drag = g === 0 ? 1 : 1 - dt * 1.5;
      V[o] *= drag; V[o + 2] *= drag;
      P[o] += V[o] * dt; P[o + 1] += V[o + 1] * dt; P[o + 2] += V[o + 2] * dt;
      if (P[o + 1] < 0.05) { P[o + 1] = 0.05; V[o + 1] *= -0.3; }
      const p = rem / this.max[i];
      this.alpha[i] = p > 0.625 ? 1 : p * 1.6;
      this.size[i] = this.size0[i] * (0.4 + p * 0.6);
      i++;
    }
    this.count = n;
    this.geo.setDrawRange(0, n);
    if (n > 0) {
      uploadUsed(this.geo.attributes.position, n);
      uploadUsed(this.geo.attributes.color, n);
      uploadUsed(this.geo.attributes.size, n);
      uploadUsed(this.geo.attributes.alpha, n);
    }
  }
  clear() { this.count = 0; this.head = 0; this.geo.setDrawRange(0, 0); }
}

// per-frame glow halos (rebuilt every frame, e.g. around super-powered units)
export class Halos {
  constructor(scene, N = 260) {
    this.N = N; this.n = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3); this.size = new Float32Array(N); this.alpha = new Float32Array(N);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    const m = glowMaterial();
    glowMaterials.push(m);
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    scene.add(this.points);
  }
  begin() { this.n = 0; }
  add(x, y, z, col, size, alpha) {
    if (this.n >= this.N) return;
    const i = this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.col[i * 3] = col[0]; this.col[i * 3 + 1] = col[1]; this.col[i * 3 + 2] = col[2];
    this.size[i] = size; this.alpha[i] = alpha;
  }
  end() {
    this.geo.setDrawRange(0, this.n);
    for (const k of ['position', 'color', 'size', 'alpha']) uploadUsed(this.geo.attributes[k], this.n);
  }
}

// ambient weather: particles drift inside a box that follows the camera, animated fully on the GPU
const ambVert = `
  attribute float size;
  attribute float seed;
  uniform float uTime;
  uniform float uScale;
  uniform vec3 uOrigin;
  uniform vec3 uBox;
  uniform vec3 uVel;
  uniform float uSway;
  uniform float uTwinkle;
  uniform float uSize;
  varying float vAlpha;
  void main() {
    vec3 p = position + uVel * uTime;
    p.x += sin(uTime * 1.3 + seed * 6.28) * uSway;
    p.z += cos(uTime * 0.9 + seed * 4.0) * uSway * 0.5;
    p = mod(p, uBox) - uBox * 0.5;
    p += uOrigin;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = min(size * uSize * uScale / max(6.0, -mv.z), uScale * 0.06);
    gl_Position = projectionMatrix * mv;
    vAlpha = smoothstep(2.0, 7.0, -mv.z) * mix(1.0, 0.35 + 0.65 * abs(sin(uTime * 2.5 + seed * 30.0)), uTwinkle);
  }`;
const ambFrag = `
  uniform mediump vec3 uColor;
  uniform mediump vec3 uColor2;
  uniform mediump float uOpacity;
  varying mediump float vAlpha;
  void main() {
    mediump vec2 p = gl_PointCoord - 0.5;
    mediump float r2 = dot(p, p);
    if (r2 > 0.25) discard;
    mediump float d2 = r2 * 4.0;
    mediump float a = 1.0 - smoothstep(0.05, 1.0, d2);
    gl_FragColor = vec4(mix(uColor, uColor2, smoothstep(0.0, 0.68, d2)), a * vAlpha * uOpacity);
  }`;
const AMBIENT = {
  desert: { n: 120, color: 0xfff0c8, color2: 0xe9c88f, size: 0.18, vel: [1.6, 0.05, 0.6], sway: 0.6, opacity: 0.55, add: false },
  mob: { n: 120, color: 0xfff0c8, color2: 0xe9c88f, size: 0.18, vel: [1.8, 0.05, 0.6], sway: 0.6, opacity: 0.5, add: false },
  lava: { n: 175, color: 0xffc074, color2: 0xd94b24, size: 0.24, vel: [0.2, 2.2, 0.4], sway: 0.8, opacity: 0.78, add: true, twinkle: 1 },
  frost: { n: 500, color: 0xffffff, color2: 0xd8ecff, size: 0.28, vel: [0.4, -2.0, 0.6], sway: 1.0, opacity: 0.9, add: false },
  jungle: { n: 160, color: 0xc8ff6a, color2: 0x4ac040, size: 0.3, vel: [0.6, -0.8, 0.4], sway: 1.6, opacity: 0.85, add: false, twinkle: 0.6 },
  neon: { n: 160, color: 0xe69cd2, color2: 0x68d6d9, size: 0.19, vel: [0, 1.2, 0], sway: 0.4, opacity: 0.72, add: true, twinkle: 1 },
  candy: { n: 260, color: 0xffffff, color2: 0xff6ab8, size: 0.3, vel: [0.3, -1.4, 0.2], sway: 1.4, opacity: 0.9, add: false, twinkle: 0.4 },
  moon: { n: 160, color: 0xc8d0ff, color2: 0x8a90c0, size: 0.16, vel: [0, 0.25, 0], sway: 0.3, opacity: 0.7, add: true, twinkle: 1 },
  sky: { n: 140, color: 0xffffff, color2: 0xcfe8ff, size: 0.35, vel: [1.2, 0.1, 0.5], sway: 0.6, opacity: 0.6, add: false },
  void: { n: 320, color: 0xff9af0, color2: 0x9a3aff, size: 0.26, vel: [0, 1.6, 0], sway: 0.6, opacity: 0.95, add: true, twinkle: 1 },
  factory: { n: 200, color: 0xffb060, color2: 0x8a8a8a, size: 0.22, vel: [0.4, 1.0, 0], sway: 0.5, opacity: 0.7, add: false },
  casino: { n: 260, color: 0xffd21a, color2: 0xff3a5a, size: 0.25, vel: [0.2, -1.2, 0.2], sway: 1.4, opacity: 0.95, add: true, twinkle: 1 },
  coral: { n: 220, color: 0xffffff, color2: 0x8af0ff, size: 0.25, vel: [0, 1.2, 0], sway: 0.8, opacity: 0.7, add: true },
  spooky: { n: 180, color: 0xb0ff6a, color2: 0x6a3aff, size: 0.22, vel: [0.2, 0.3, 0.2], sway: 1.2, opacity: 0.9, add: true, twinkle: 1 },
  arena: { n: 160, color: 0xff6a6a, color2: 0xffd0a0, size: 0.24, vel: [0.8, -0.6, 0.3], sway: 1.4, opacity: 0.85, add: false },
  crystal: { n: 300, color: 0x9afff8, color2: 0xc08aff, size: 0.2, vel: [0, 0.4, 0], sway: 0.4, opacity: 0.95, add: true, twinkle: 1 },
  volcano: { n: 215, color: 0xffb965, color2: 0xe14e21, size: 0.26, vel: [0.6, 2.4, 0.3], sway: 0.9, opacity: 0.82, add: true, twinkle: 1 },
  tomb: { n: 220, color: 0xfff0c8, color2: 0xe0b070, size: 0.18, vel: [2.4, 0.05, 0.6], sway: 0.6, opacity: 0.6, add: false },
  storm: { n: 520, color: 0xd0e8ff, color2: 0x8aa0c0, size: 0.16, vel: [0.8, -7, 0.4], sway: 0.2, opacity: 0.7, add: false },
  blackhole: { n: 360, color: 0xffc08a, color2: 0x9a3aff, size: 0.24, vel: [0, 0, 3], sway: 0.3, opacity: 0.95, add: true, twinkle: 1 },
  ...LATE_AMBIENT,
};
export class Ambient {
  constructor(scene) {
    const N = 520;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), size = new Float32Array(N), seed = new Float32Array(N);
    this.box = new THREE.Vector3(44, 22, 70);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = Math.random() * this.box.x; pos[i * 3 + 1] = Math.random() * this.box.y; pos[i * 3 + 2] = Math.random() * this.box.z;
      size[i] = 0.5 + Math.random(); seed[i] = Math.random();
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uScale: { value: 400 }, uOrigin: { value: new THREE.Vector3() }, uBox: { value: this.box },
        uVel: { value: new THREE.Vector3() }, uSway: { value: 0 }, uTwinkle: { value: 0 }, uColor: { value: new THREE.Color() },
        uColor2: { value: new THREE.Color() }, uOpacity: { value: 1 }, uSize: { value: 0.2 },
      },
      vertexShader: ambVert, fragmentShader: ambFrag, transparent: true, depthWrite: false,
    });
    glowMaterials.push(this.mat);
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  setTheme(theme) {
    const A = AMBIENT[theme] || AMBIENT.desert, u = this.mat.uniforms;
    u.uColor.value.set(A.color); u.uColor2.value.set(A.color2);
    u.uVel.value.set(...A.vel); u.uSway.value = A.sway; u.uTwinkle.value = A.twinkle || 0; u.uOpacity.value = A.opacity;
    this.mat.blending = A.add ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.mat.needsUpdate = true;
    this.geo.setDrawRange(0, A.n);
    u.uSize.value = A.size;
  }
  update(t, camZ) {
    const u = this.mat.uniforms;
    u.uTime.value = t;
    u.uOrigin.value.set(0, 11, camZ - 22);
  }
}

// gradient sky dome
export function buildSky() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() } },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vDir;
      void main() {
        float t = pow(smoothstep(0.0, 0.6, normalize(vDir).y), 0.7);
        gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), mat);
  m.frustumCulled = false;
  // Draw after opaque terrain so depth testing skips the covered sky pixels.
  m.renderOrder = 100;
  return m;
}

// flying debris: chunks of towers, blockers and gates (no shadow pass overhead)
export class Debris {
  constructor(scene, N = 220) {
    this.N = N; this.head = 0; this.alive = false;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), N);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0; this.mesh.visible = false;
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.p = new Float32Array(N * 3); this.v = new Float32Array(N * 3); this.r = new Float32Array(N * 3); this.w = new Float32Array(N * 3);
    this.colors = new Float32Array(N * 3);
    this.s = new Float32Array(N); this.life = new Float32Array(N);
    this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.m4 = new THREE.Matrix4(); this.v3 = new THREE.Vector3(); this.sc = new THREE.Vector3();
  }
  burst(x, y, z, colors, n, w = 2, h = 2, speed = 7, size = 0.45) {
    for (let k = 0; k < n; k++) {
      const i = this.head; this.head = (this.head + 1) % this.N;
      this.p[i * 3] = x + (Math.random() - 0.5) * w; this.p[i * 3 + 1] = y + Math.random() * h; this.p[i * 3 + 2] = z + (Math.random() - 0.5) * 0.8;
      const a = Math.random() * 6.283;
      this.v[i * 3] = Math.cos(a) * speed * Math.random(); this.v[i * 3 + 1] = speed * (0.6 + Math.random() * 0.8); this.v[i * 3 + 2] = Math.sin(a) * speed * Math.random() + speed * 0.3;
      for (let j = 0; j < 3; j++) { this.r[i * 3 + j] = Math.random() * 6; this.w[i * 3 + j] = (Math.random() - 0.5) * 16; }
      this.s[i] = size * (0.5 + Math.random());
      this.life[i] = 2.0 + Math.random() * 0.8;
      const c = colors[k % colors.length];
      this.colors.set(c, i * 3);
    }
    if (n > 0) this.alive = true;
  }
  update(dt) {
    if (!this.alive) return;
    let count = 0;
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= dt) { this.life[i] = 0; continue; }
      this.life[i] -= dt;
      this.v[i * 3 + 1] -= 22 * dt;
      for (let j = 0; j < 3; j++) { this.p[i * 3 + j] += this.v[i * 3 + j] * dt; this.r[i * 3 + j] += this.w[i * 3 + j] * dt; }
      if (this.p[i * 3 + 1] < this.s[i] * 0.5) {
        this.p[i * 3 + 1] = this.s[i] * 0.5; this.v[i * 3 + 1] *= -0.35;
        this.v[i * 3] *= 0.6; this.v[i * 3 + 2] *= 0.6;
        for (let j = 0; j < 3; j++) this.w[i * 3 + j] *= 0.6;
      }
      const s = this.s[i] * Math.min(1, this.life[i] * 1.5);
      this.e.set(this.r[i * 3], this.r[i * 3 + 1], this.r[i * 3 + 2]);
      this.q.setFromEuler(this.e);
      this.m4.compose(this.v3.set(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]), this.q, this.sc.set(s, s, s));
      this.mesh.setMatrixAt(count, this.m4);
      const offset = i * 3;
      this.mesh.instanceColor.setXYZ(count++, this.colors[offset], this.colors[offset + 1], this.colors[offset + 2]);
    }
    uploadUsed(this.mesh.instanceMatrix, count);
    uploadUsed(this.mesh.instanceColor, count);
    this.mesh.count = count; this.mesh.visible = count > 0; this.alive = count > 0;
  }
  clear() { this.life.fill(0); this.mesh.count = 0; this.mesh.visible = false; this.alive = false; }
}

// Single-draw-call instanced shatter: samples the destroyed model's spatial cells and
// surface colors into ~32 solid faceted chunks in <0.5 ms with zero shadow-pass spikes.
const _rel = new THREE.Matrix4(), _inv = new THREE.Matrix4(), _v = new THREE.Vector3(), _c = new THREE.Color();
const _shQ = new THREE.Quaternion(), _shE = new THREE.Euler(), _shM = new THREE.Matrix4(), _shP = new THREE.Vector3(), _shS = new THREE.Vector3();
let _shardGeo = null, _shardMat = null;
function shardResources() {
  if (!_shardGeo) {
    const g = new THREE.IcosahedronGeometry(0.55, 0);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const k = 0.84 + 0.32 * Math.abs(Math.sin(i * 12.9898 + 0.7));
      pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * (0.78 + 0.36 * Math.abs(Math.cos(i * 7.13))), pos.getZ(i) * k);
    }
    g.computeVertexNormals();
    g.userData.shared = true;
    _shardGeo = g;
    _shardMat = new THREE.MeshLambertMaterial();
    _shardMat.userData.shared = true;
  }
  return { geo: _shardGeo, mat: _shardMat };
}
export function warmShatterMesh() {
  const { geo, mat } = shardResources();
  const mesh = new THREE.InstancedMesh(geo, mat, 1);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array([1, 1, 1]), 3);
  mesh.count = 1;
  mesh.castShadow = false;
  return mesh;
}
function shown(o, top) {
  for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (p === top) return true; }
  return true;
}
export function shatter(group, root, cx, cz, power = 8, target = 34) {
  group.updateWorldMatrix(true, true);
  root.updateWorldMatrix(true, false);
  _inv.copy(root.matrixWorld).invert();

  const meshes = [];
  let totalVerts = 0;
  group.traverse((o) => {
    const pos = o.geometry?.attributes?.position;
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !pos || !o.layers.isEnabled(0) || !shown(o, group)) return;
    meshes.push(o);
    totalVerts += pos.count;
  });
  group.visible = false;
  if (!meshes.length || !totalVerts) return { mesh: null, count: 0 };

  const stride = Math.max(1, Math.floor(totalVerts / 420));
  const samples = [];
  let lo0 = Infinity, lo1 = Infinity, lo2 = Infinity, hi0 = -Infinity, hi1 = -Infinity, hi2 = -Infinity;
  for (const o of meshes) {
    const g = o.geometry, pos = g.attributes.position, vcol = g.attributes.color;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const mc = mat?.color ? _c.copy(mat.color) : _c.setHex(0xc84a3c);
    const mr = mc.r, mg = mc.g, mb = mc.b;
    _rel.multiplyMatrices(_inv, o.matrixWorld);
    for (let i = 0; i < pos.count; i += stride) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(_rel);
      const x = _v.x, y = _v.y, z = _v.z;
      if (x < lo0) lo0 = x; if (x > hi0) hi0 = x;
      if (y < lo1) lo1 = y; if (y > hi1) hi1 = y;
      if (z < lo2) lo2 = z; if (z > hi2) hi2 = z;
      let r = mr, gr = mg, b = mb;
      if (vcol) { r *= vcol.getX(i); gr *= vcol.getY(i); b *= vcol.getZ(i); }
      samples.push(x, y, z, r, gr, b);
    }
  }
  const sx = Math.max(hi0 - lo0, 0.5), sy = Math.max(hi1 - lo1, 0.5), sz = Math.max(hi2 - lo2, 0.5);
  const cell = Math.max(Math.cbrt((sx * sy * sz) / target), Math.max(sx, sy, sz) / 6.5);
  const cells = new Map();
  for (let i = 0; i < samples.length; i += 6) {
    const x = samples[i], y = samples[i + 1], z = samples[i + 2];
    const kx = Math.min(31, Math.floor((x - lo0) / cell));
    const ky = Math.min(31, Math.floor((y - lo1) / cell));
    const kz = Math.min(31, Math.floor((z - lo2) / cell));
    const key = (kx << 10) | (ky << 5) | kz;
    let c = cells.get(key);
    if (!c) cells.set(key, c = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, n: 0 });
    c.x += x; c.y += y; c.z += z; c.r += samples[i + 3]; c.g += samples[i + 4]; c.b += samples[i + 5]; c.n++;
  }

  const list = [...cells.values()];
  const count = Math.min(list.length, 38);
  if (!count) return { mesh: null, count: 0 };

  const { geo, mat } = shardResources();
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);

  const p = new Float32Array(count * 3), v = new Float32Array(count * 3);
  const rot = new Float32Array(count * 3), w = new Float32Array(count * 3);
  const sc = new Float32Array(count * 3);
  const step = list.length / count;

  for (let i = 0; i < count; i++) {
    const c = list[Math.floor(i * step)], invN = 1 / c.n, o = i * 3;
    const px = c.x * invN, py = c.y * invN, pz = c.z * invN;
    p[o] = px; p[o + 1] = py; p[o + 2] = pz;
    const dx = px - cx, dz = pz - cz, d = Math.hypot(dx, dz) || 1;
    const h = (py - lo1) / sy;
    v[o] = (dx / d) * power * (0.35 + Math.random() * 0.75);
    v[o + 1] = power * (0.35 + h * 0.55 + Math.random() * 0.45);
    v[o + 2] = (dz / d) * power * (0.35 + Math.random() * 0.75) + power * 0.35;
    rot[o] = Math.random() * 6.28; rot[o + 1] = Math.random() * 6.28; rot[o + 2] = Math.random() * 6.28;
    w[o] = (Math.random() - 0.5) * 9; w[o + 1] = (Math.random() - 0.5) * 9; w[o + 2] = (Math.random() - 0.5) * 9;
    const base = Math.min(2.2, Math.max(0.45, cell * (0.58 + Math.random() * 0.45)));
    sc[o] = base * (0.8 + Math.random() * 0.45);
    sc[o + 1] = base * (0.75 + Math.random() * 0.45);
    sc[o + 2] = base * (0.8 + Math.random() * 0.45);
    mesh.instanceColor.setXYZ(i, Math.min(1, c.r * invN * 1.12), Math.min(1, c.g * invN * 1.12), Math.min(1, c.b * invN * 1.12));
    _shE.set(rot[o], rot[o + 1], rot[o + 2]);
    _shQ.setFromEuler(_shE);
    _shM.compose(_shP.set(px, py, pz), _shQ, _shS.set(sc[o], sc[o + 1], sc[o + 2]));
    mesh.setMatrixAt(i, _shM);
  }
  mesh.instanceColor.needsUpdate = true;
  mesh.instanceMatrix.needsUpdate = true;
  root.add(mesh);
  return { mesh, count, p, v, rot, w, sc };
}
export function updateShatter(sh, dt, t) {
  if (!sh || !sh.mesh || !sh.count) return false;
  const k = Math.max(0, 1 - Math.max(0, t - 1.6) / 1.1);
  if (k <= 0) return false;
  const { mesh, count, p, v, rot, w, sc } = sh;
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    v[o + 1] -= 22 * dt;
    p[o] += v[o] * dt; p[o + 1] += v[o + 1] * dt; p[o + 2] += v[o + 2] * dt;
    if (p[o + 1] < 0.25) {
      p[o + 1] = 0.25; v[o + 1] *= -0.32; v[o] *= 0.62; v[o + 2] *= 0.62;
      w[o] *= 0.55; w[o + 1] *= 0.55; w[o + 2] *= 0.55;
    }
    rot[o] += w[o] * dt; rot[o + 1] += w[o + 1] * dt; rot[o + 2] += w[o + 2] * dt;
    _shE.set(rot[o], rot[o + 1], rot[o + 2]);
    _shQ.setFromEuler(_shE);
    _shM.compose(_shP.set(p[o], p[o + 1], p[o + 2]), _shQ, _shS.set(sc[o] * k, sc[o + 1] * k, sc[o + 2] * k));
    mesh.setMatrixAt(i, _shM);
  }
  uploadUsed(mesh.instanceMatrix, count);
  return true;
}
/** Remove the instanced shatter mesh. Shared shard geometry & material stay alive for reuse. */
export function disposeShatter(sh) {
  if (!sh?.mesh) return;
  sh.mesh.removeFromParent();
  sh.mesh.dispose();
  sh.mesh = null;
}
export function setGlowScale(v) { for (const m of glowMaterials) m.uniforms.uScale.value = v; }
