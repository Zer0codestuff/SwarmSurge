import * as THREE from 'three';

/** Upload only the first `count` items of a dynamic attribute: most pools run far below capacity. */
export function uploadUsed(attribute, count) {
  if (count <= 0) return;
  attribute.clearUpdateRanges();
  attribute.addUpdateRange(0, count * attribute.itemSize);
  attribute.needsUpdate = true;
}

// Soft round glowing points (additive). Used for sparks, muzzle flashes, halos and ambient particles.
const glowVert = `
  attribute float size;
  attribute float alpha;
  attribute vec3 color;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uScale;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uScale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const glowFrag = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    a = a * a * (0.6 + 0.4 * smoothstep(0.35, 0.0, d));
    gl_FragColor = vec4(vColor * (1.0 + smoothstep(0.3, 0.0, d)), a * vAlpha);
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
    this.capacity = capacity; this.head = 0;
    for (const key of ['life', 'duration', 'radius', 'x', 'z']) this[key] = new Float32Array(capacity);
    this.colors = new Float32Array(capacity * 3); this.color = new THREE.Color();
    const geometry = new THREE.RingGeometry(.82, 1, 32);
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
  }
  update(dt) {
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
    uploadUsed(this.mesh.instanceMatrix, count); uploadUsed(this.mesh.instanceColor, count);
    uploadUsed(this.mesh.geometry.attributes.ringAlpha, count);
  }
  clear() { this.life.fill(0); this.mesh.count = 0; this.head = 0; }
}

// One reusable draw call for blaster shots, lightning and air-strike trails.
export class Tracers {
  constructor(scene, capacity = 128) {
    this.capacity = capacity; this.head = 0;
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
  }
  update(dt) {
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
    uploadUsed(this.mesh.instanceMatrix, count); uploadUsed(this.mesh.instanceColor, count);
  }
  clear() { this.life.fill(0); this.mesh.count = 0; this.head = 0; }
}

// pool of physics sparks
export class Sparks {
  constructor(scene, N = 1400) {
    this.N = N;
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
    this.geo = g;
    const m = glowMaterial();
    glowMaterials.push(m);
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }
  emit(x, y, z, col, n, speed = 4, size = 0.8, life = 0.5, grav = -6, spread = 1) {
    for (let k = 0; k < n; k++) {
      const i = this.head; this.head = (this.head + 1) % this.N;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      const a = Math.random() * 6.283, u = Math.random() * 2 - 1, s = speed * (0.35 + Math.random() * 0.65);
      const r = Math.sqrt(1 - u * u);
      this.vel[i * 3] = Math.cos(a) * r * s * spread; this.vel[i * 3 + 1] = Math.abs(u) * s; this.vel[i * 3 + 2] = Math.sin(a) * r * s * spread;
      this.col[i * 3] = col[0]; this.col[i * 3 + 1] = col[1]; this.col[i * 3 + 2] = col[2];
      this.size0[i] = size * (0.6 + Math.random() * 0.8);
      this.max[i] = this.life[i] = life * (0.6 + Math.random() * 0.6);
      this.grav[i] = grav;
    }
  }
  // a stream of sparks flying from A to B (upgrade beams, warp trails)
  stream(x1, y1, z1, x2, y2, z2, col, n, time = 0.45, size = 0.9) {
    for (let k = 0; k < n; k++) {
      const i = this.head; this.head = (this.head + 1) % this.N;
      const t = time * (0.7 + Math.random() * 0.5);
      this.pos[i * 3] = x1 + (Math.random() - 0.5) * 0.6; this.pos[i * 3 + 1] = y1; this.pos[i * 3 + 2] = z1 + (Math.random() - 0.5) * 0.6;
      this.vel[i * 3] = (x2 - x1) / t; this.vel[i * 3 + 1] = (y2 - y1) / t; this.vel[i * 3 + 2] = (z2 - z1) / t;
      this.col[i * 3] = col[0]; this.col[i * 3 + 1] = col[1]; this.col[i * 3 + 2] = col[2];
      this.size0[i] = size; this.max[i] = this.life[i] = t; this.grav[i] = 0;
    }
  }
  update(dt) {
    const P = this.pos, V = this.vel;
    let used = 0;
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) { if (this.alpha[i] !== 0) { this.alpha[i] = 0; this.size[i] = 0; } continue; }
      used = i + 1;
      this.life[i] -= dt;
      V[i * 3 + 1] += this.grav[i] * dt;
      const drag = this.grav[i] === 0 ? 1 : 1 - dt * 1.5;
      V[i * 3] *= drag; V[i * 3 + 2] *= drag;
      P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
      if (P[i * 3 + 1] < 0.05) { P[i * 3 + 1] = 0.05; V[i * 3 + 1] *= -0.3; }
      const p = Math.max(0, this.life[i] / this.max[i]);
      this.alpha[i] = Math.min(1, p * 1.6);
      this.size[i] = this.size0[i] * (0.4 + p * 0.6);
    }
    this.geo.setDrawRange(0, used);
    for (const k of ['position', 'color', 'size', 'alpha']) uploadUsed(this.geo.attributes[k], used);
  }
  clear() { this.life.fill(0); }
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
    gl_PointSize = size * uSize * uScale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
    vAlpha = mix(1.0, 0.35 + 0.65 * abs(sin(uTime * 2.5 + seed * 30.0)), uTwinkle);
  }`;
const ambFrag = `
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.2, d);
    gl_FragColor = vec4(mix(uColor2, uColor, smoothstep(0.8, 0.0, d)), a * vAlpha * uOpacity);
  }`;
const AMBIENT = {
  desert: { n: 120, color: 0xfff0c8, color2: 0xe9c88f, size: 0.18, vel: [1.6, 0.05, 0.6], sway: 0.6, opacity: 0.55, add: false },
  mob: { n: 120, color: 0xfff0c8, color2: 0xe9c88f, size: 0.18, vel: [1.8, 0.05, 0.6], sway: 0.6, opacity: 0.5, add: false },
  lava: { n: 260, color: 0xffd060, color2: 0xff4a10, size: 0.3, vel: [0.2, 2.2, 0.4], sway: 0.8, opacity: 0.95, add: true, twinkle: 1 },
  frost: { n: 500, color: 0xffffff, color2: 0xd8ecff, size: 0.28, vel: [0.4, -2.0, 0.6], sway: 1.0, opacity: 0.9, add: false },
  jungle: { n: 160, color: 0xc8ff6a, color2: 0x4ac040, size: 0.3, vel: [0.6, -0.8, 0.4], sway: 1.6, opacity: 0.85, add: false, twinkle: 0.6 },
  neon: { n: 260, color: 0xff6af0, color2: 0x3afff0, size: 0.22, vel: [0, 1.2, 0], sway: 0.4, opacity: 0.9, add: true, twinkle: 1 },
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
  volcano: { n: 360, color: 0xffb040, color2: 0xff3a0a, size: 0.3, vel: [0.6, 2.4, 0.3], sway: 0.9, opacity: 0.95, add: true, twinkle: 1 },
  tomb: { n: 220, color: 0xfff0c8, color2: 0xe0b070, size: 0.18, vel: [2.4, 0.05, 0.6], sway: 0.6, opacity: 0.6, add: false },
  storm: { n: 520, color: 0xd0e8ff, color2: 0x8aa0c0, size: 0.16, vel: [0.8, -7, 0.4], sway: 0.2, opacity: 0.7, add: false },
  blackhole: { n: 360, color: 0xffc08a, color2: 0x9a3aff, size: 0.24, vel: [0, 0, 3], sway: 0.3, opacity: 0.95, add: true, twinkle: 1 },
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
    uniforms: { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() } },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.9999; }`,
    fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom; varying vec3 vDir;
      void main() { float h = vDir.y; vec3 c = h > 0.0 ? mix(uMid, uTop, pow(smoothstep(0.0, 0.6, h), 0.7)) : mix(uMid, uBottom, smoothstep(0.0, -0.2, h)); gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), mat);
  m.frustumCulled = false;
  m.renderOrder = -10;
  return m;
}

// flying debris: chunks of towers, blockers and gates
export class Debris {
  constructor(scene, N = 260) {
    this.N = N; this.head = 0;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), N);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3).fill(1), 3);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.p = new Float32Array(N * 3); this.v = new Float32Array(N * 3); this.r = new Float32Array(N * 3); this.w = new Float32Array(N * 3);
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
      this.life[i] = 2.2 + Math.random();
      const c = colors[k % colors.length];
      this.mesh.instanceColor.setXYZ(i, c[0], c[1], c[2]);
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    let any = false;
    if (!this.mesh.visible && !this.life.some(life => life > 0)) return;
    for (let i = 0; i < this.N; i++) {
      let s = 0;
      if (this.life[i] > 0) {
        any = true;
        this.life[i] -= dt;
        this.v[i * 3 + 1] -= 22 * dt;
        for (let j = 0; j < 3; j++) { this.p[i * 3 + j] += this.v[i * 3 + j] * dt; this.r[i * 3 + j] += this.w[i * 3 + j] * dt; }
        if (this.p[i * 3 + 1] < this.s[i] * 0.5) {
          this.p[i * 3 + 1] = this.s[i] * 0.5; this.v[i * 3 + 1] *= -0.35;
          this.v[i * 3] *= 0.6; this.v[i * 3 + 2] *= 0.6; for (let j = 0; j < 3; j++) this.w[i * 3 + j] *= 0.6;
        }
        s = this.s[i] * Math.min(1, this.life[i] * 1.5);
      }
      this.e.set(this.r[i * 3], this.r[i * 3 + 1], this.r[i * 3 + 2]);
      this.q.setFromEuler(this.e);
      this.m4.compose(this.v3.set(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]), this.q, this.sc.set(s, s, s));
      this.mesh.setMatrixAt(i, this.m4);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = any;
  }
  clear() { this.life.fill(0); }
}

// Break a model into spatial chunks. Asset meshes are batched by material, so moving
// whole meshes would peel one material layer off everything and leave holes. Instead,
// triangles are binned into a coarse grid and every chunk carries all of its materials.
const _rel = new THREE.Matrix4(), _inv = new THREE.Matrix4(), _nm = new THREE.Matrix3(), _v = new THREE.Vector3();
function shown(o, top) {
  for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (p === top) return true; }
  return true;
}
export function shatter(group, root, cx, cz, power = 8, target = 36) {
  // Refresh only this model and the root's own ancestors; the whole level tree is large.
  group.updateWorldMatrix(true, true);
  root.updateWorldMatrix(true, false);
  _inv.copy(root.matrixWorld).invert();
  const sources = [];
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  group.traverse((o) => {
    const g = o.geometry, pos = g?.attributes.position;
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !pos || !o.layers.isEnabled(0) || !shown(o, group)) return;
    _rel.multiplyMatrices(_inv, o.matrixWorld);
    _nm.getNormalMatrix(_rel);
    const wp = new Float32Array(pos.count * 3), nrm = g.attributes.normal, wn = nrm ? new Float32Array(pos.count * 3) : null;
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(_rel).toArray(wp, i * 3);
      if (wn) _v.fromBufferAttribute(nrm, i).applyMatrix3(_nm).normalize().toArray(wn, i * 3);
      for (let a = 0; a < 3; a++) { const c = wp[i * 3 + a]; if (c < lo[a]) lo[a] = c; if (c > hi[a]) hi[a] = c; }
    }
    // Plain float arrays copy directly; anything else goes through the attribute accessors.
    const attrs = Object.entries(g.attributes).map(([name, attr]) => ({
      name, attr, k: attr.itemSize,
      src: name === 'position' ? wp : name === 'normal' ? wn : !attr.isInterleavedBufferAttribute && !attr.normalized ? attr.array : null,
    }));
    sources.push({ o, g, wp, attrs, flip: _rel.determinant() < 0 });
  });
  const parts = [];
  if (!sources.length) { group.visible = false; return parts; }
  const size = hi.map((h, a) => Math.max(h - lo[a], 1e-3));
  const cell = Math.max(Math.cbrt(size[0] * size[1] * size[2] / target), Math.max(...size) / 8);
  // cell -> material slot -> vertex list
  const cells = new Map();
  for (const s of sources) {
    const { o, g, wp } = s, idx = g.index, n = idx ? idx.count : g.attributes.position.count;
    const mats = Array.isArray(o.material) ? o.material : null;
    const groups = mats && g.groups.length ? g.groups : [{ start: 0, count: n, materialIndex: 0 }];
    for (const gr of groups) {
      const material = mats ? mats[gr.materialIndex] : o.material;
      if (!material) continue;
      const end = Math.min(n, gr.start + gr.count);
      for (let t = gr.start; t + 2 < end; t += 3) {
        const a = idx ? idx.getX(t) : t, b = idx ? idx.getX(t + 1) : t + 1, c = idx ? idx.getX(t + 2) : t + 2;
        let key = 0;
        for (let k = 0; k < 3; k++) {
          const m = (wp[a * 3 + k] + wp[b * 3 + k] + wp[c * 3 + k]) / 3;
          key = key * 64 + Math.min(63, Math.floor((m - lo[k]) / cell));
        }
        let slots = cells.get(key);
        if (!slots) cells.set(key, slots = new Map());
        let slot = slots.get(s.o.id * 64 + gr.materialIndex);
        if (!slot) slots.set(s.o.id * 64 + gr.materialIndex, slot = { s, material, v: [] });
        if (s.flip) slot.v.push(a, c, b); else slot.v.push(a, b, c);
      }
    }
  }
  for (const slots of cells.values()) {
    const center = new THREE.Vector3();
    let count = 0;
    for (const { s, v } of slots.values()) for (const i of v) { center.x += s.wp[i * 3]; center.y += s.wp[i * 3 + 1]; center.z += s.wp[i * 3 + 2]; count++; }
    center.divideScalar(count);
    const pivot = new THREE.Group();
    pivot.position.copy(center);
    for (const { s, material, v } of slots.values()) {
      const geo = new THREE.BufferGeometry();
      for (const { name, attr, k, src } of s.attrs) {
        const out = new Float32Array(v.length * k);
        if (src) for (let j = 0; j < v.length; j++) { const i = v[j] * k; for (let c = 0; c < k; c++) out[j * k + c] = src[i + c]; }
        else for (let j = 0; j < v.length; j++) for (let c = 0; c < k; c++) out[j * k + c] = attr.getComponent(v[j], c);
        if (name === 'position') for (let j = 0; j < out.length; j += 3) { out[j] -= center.x; out[j + 1] -= center.y; out[j + 2] -= center.z; }
        geo.setAttribute(name, new THREE.BufferAttribute(out, k));
      }
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = s.o.castShadow; mesh.receiveShadow = s.o.receiveShadow; mesh.renderOrder = s.o.renderOrder;
      pivot.add(mesh);
    }
    root.add(pivot);
    const dx = center.x - cx, dz = center.z - cz, d = Math.hypot(dx, dz) || 1;
    const h = (center.y - lo[1]) / size[1];
    parts.push({
      m: pivot, vx: (dx / d) * power * (0.3 + Math.random() * 0.8), vy: power * (0.35 + h * 0.6 + Math.random() * 0.5),
      vz: (dz / d) * power * (0.3 + Math.random() * 0.8) + power * 0.35,
      wx: (Math.random() - 0.5) * 7, wy: (Math.random() - 0.5) * 7, wz: (Math.random() - 0.5) * 7, s0: pivot.scale.clone(),
    });
  }
  group.visible = false;
  return parts;
}
export function updateShatter(parts, dt, t) {
  const k = Math.max(0, 1 - Math.max(0, t - 1.8) / 1.2);
  for (const p of parts) {
    p.vy -= 22 * dt;
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    if (p.m.position.y < 0.2) { p.m.position.y = 0.2; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; p.wx *= 0.5; p.wy *= 0.5; p.wz *= 0.5; }
    p.m.rotation.x += p.wx * dt; p.m.rotation.y += p.wy * dt; p.m.rotation.z += p.wz * dt;
    p.m.scale.copy(p.s0).multiplyScalar(Math.max(0.001, k));
  }
  return k > 0;
}
/** Remove finished chunks. Their geometry is private; materials still belong to the source model. */
export function disposeShatter(parts) {
  for (const p of parts) { p.m.removeFromParent(); for (const c of p.m.children) c.geometry.dispose(); }
}
export function setGlowScale(v) { for (const m of glowMaterials) m.uniforms.uScale.value = v; }
