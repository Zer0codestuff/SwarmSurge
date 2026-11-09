import * as THREE from 'three';

// Full-frame finishing: glow around bright pixels, a soft vignette and a short lens punch
// on heavy impacts. The scene keeps its own tone mapping and color encoding, so the look of
// every material is unchanged; the passes below only work on the finished image.
const VERT = `varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const PREFILTER = `
  varying vec2 vUv; uniform sampler2D tMap; uniform vec2 uTexel; uniform float uThreshold; uniform float uKnee;
  void main() {
    vec3 c = (texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, -1.0)).rgb
      + texture2D(tMap, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, 1.0)).rgb) * 0.25;
    float peak = max(c.r, max(c.g, c.b));
    float soft = clamp(peak - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 1e-4);
    gl_FragColor = vec4(c * max(soft, peak - uThreshold) / max(peak, 1e-4), 1.0);
  }`;
const DOWN = `
  varying vec2 vUv; uniform sampler2D tMap; uniform vec2 uTexel;
  void main() {
    vec3 c = texture2D(tMap, vUv).rgb * 4.0;
    c += texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, -1.0)).rgb;
    c += texture2D(tMap, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, 1.0)).rgb;
    gl_FragColor = vec4(c / 8.0, 1.0);
  }`;
const UP = `
  varying vec2 vUv; uniform sampler2D tMap; uniform vec2 uTexel; uniform float uWeight;
  void main() {
    vec3 c = (texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, -1.0)).rgb
      + texture2D(tMap, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, 1.0)).rgb) * 2.0;
    c += texture2D(tMap, vUv + uTexel * vec2(-2.0, 0.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(2.0, 0.0)).rgb;
    c += texture2D(tMap, vUv + uTexel * vec2(0.0, -2.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(0.0, 2.0)).rgb;
    gl_FragColor = vec4(c / 12.0 * uWeight, 1.0);
  }`;
const COMPOSITE = `
  varying vec2 vUv; uniform sampler2D tScene; uniform sampler2D tBloom;
  uniform float uBloom; uniform float uVignette; uniform float uPunch; uniform vec3 uFlash;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 d = vUv - 0.5;
    vec3 c;
    if (uPunch > 0.002) {
      // Split the color channels toward the corners for a few frames after a heavy hit.
      vec2 o = d * dot(d, d) * uPunch * 0.11;
      c = vec3(texture2D(tScene, vUv + o).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv - o).b);
    } else c = texture2D(tScene, vUv).rgb;
    // Screen blending keeps bright scenes from clipping to white.
    c = 1.0 - (1.0 - c) * (1.0 - min(vec3(1.0), texture2D(tBloom, vUv).rgb * uBloom));
    float edge = smoothstep(0.32, 0.86, length(d * vec2(1.0, 0.92)));
    c *= 1.0 - uVignette * edge;
    c += uFlash * edge;
    c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(c, 1.0);
  }`;

export function createPostFX(renderer) {
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quad = new THREE.Mesh(geometry); quad.frustumCulled = false; scene.add(quad);
  const pass = (fragmentShader, uniforms, extra = {}) => new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false, ...extra,
  });
  const texel = () => ({ value: new THREE.Vector2() });
  const prefilter = pass(PREFILTER, { tMap: { value: null }, uTexel: texel(), uThreshold: { value: 0.7 }, uKnee: { value: 0.18 } });
  const down = pass(DOWN, { tMap: { value: null }, uTexel: texel() });
  const up = pass(UP, { tMap: { value: null }, uTexel: texel(), uWeight: { value: 1 } }, {
    transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
  });
  const composite = pass(COMPOSITE, {
    tScene: { value: null }, tBloom: { value: null }, uBloom: { value: 0 }, uVignette: { value: 0.22 },
    uPunch: { value: 0 }, uFlash: { value: new THREE.Color(0, 0, 0) },
  });
  // The scene target reports itself as a display surface so three.js applies the same tone
  // mapping and sRGB encoding it uses for the canvas (render targets normally skip both).
  const sceneTarget = new THREE.WebGLRenderTarget(4, 4, {
    samples: Math.min(4, renderer.capabilities.maxSamples), depthBuffer: true, colorSpace: THREE.SRGBColorSpace,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false,
  });
  sceneTarget.isXRRenderTarget = true;
  // Store the encoded bytes as they are; an sRGB attachment would encode them a second time.
  sceneTarget.texture.internalFormat = 'RGBA8';
  const LEVELS = 5;
  const mips = Array.from({ length: LEVELS }, () => new THREE.WebGLRenderTarget(2, 2, {
    depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false,
  }));
  const size = new THREE.Vector2();
  let levels = LEVELS;
  const state = { glow: true, strength: 0.5, punch: 0 };
  function draw(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
  }
  function setSize() {
    renderer.getDrawingBufferSize(size);
    const w = Math.max(4, size.x), h = Math.max(4, size.y);
    if (sceneTarget.width === w && sceneTarget.height === h) return;
    sceneTarget.setSize(w, h);
    levels = 0;
    for (let i = 0, mw = w, mh = h; i < LEVELS; i++) {
      mw = Math.max(2, mw >> 1); mh = Math.max(2, mh >> 1);
      mips[i].setSize(mw, mh);
      if (Math.min(mw, mh) >= 8) levels = i + 1;
    }
  }
  function render(world, view) {
    setSize();
    const clear = renderer.autoClear;
    renderer.setRenderTarget(sceneTarget);
    renderer.render(world, view);
    const bloom = state.glow && state.strength > 0.01 && levels > 1;
    if (bloom) {
      renderer.autoClear = false;
      prefilter.uniforms.tMap.value = sceneTarget.texture;
      prefilter.uniforms.uTexel.value.set(0.5 / sceneTarget.width, 0.5 / sceneTarget.height);
      draw(prefilter, mips[0]);
      for (let i = 1; i < levels; i++) {
        down.uniforms.tMap.value = mips[i - 1].texture;
        down.uniforms.uTexel.value.set(1 / mips[i - 1].width, 1 / mips[i - 1].height);
        draw(down, mips[i]);
      }
      // Wider levels carry more weight so the glow reads as a soft halo, not a thin outline.
      for (let i = levels - 1; i > 0; i--) {
        up.uniforms.tMap.value = mips[i].texture;
        up.uniforms.uTexel.value.set(0.5 / mips[i].width, 0.5 / mips[i].height);
        up.uniforms.uWeight.value = 1.15;
        draw(up, mips[i - 1]);
      }
      renderer.autoClear = clear;
    }
    composite.uniforms.tScene.value = sceneTarget.texture;
    composite.uniforms.tBloom.value = mips[0].texture;
    composite.uniforms.uBloom.value = bloom ? state.strength : 0;
    composite.uniforms.uPunch.value = state.punch;
    draw(composite, null);
  }
  return {
    render, setSize, state,
    /** Bright biomes need a high threshold or the whole road would glow. */
    setLook(luminance) {
      const t = Math.min(1, Math.max(0, (luminance - 0.22) / 0.5)), k = t * t * (3 - 2 * t);
      state.strength = 0.95 + (0.2 - 0.95) * k;
      prefilter.uniforms.uThreshold.value = 0.5 + 0.34 * k;
      composite.uniforms.uVignette.value = 0.3 - 0.12 * k;
    },
    flash: composite.uniforms.uFlash.value,
  };
}
