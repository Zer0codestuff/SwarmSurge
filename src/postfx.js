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
    // The scene is display encoded. A saturated midtone can have a full red or blue
    // channel without being bright enough to cast a halo.
    float brightness = mix(dot(c, vec3(0.2126, 0.7152, 0.0722)), max(c.r, max(c.g, c.b)), 0.55);
    float soft = clamp(brightness - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 1e-4);
    gl_FragColor = vec4(c * max(soft, brightness - uThreshold) / max(brightness, 1e-4), 1.0);
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
  varying vec2 vUv; uniform sampler2D tMap; uniform vec2 uTexel;
  void main() {
    vec3 c = (texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, -1.0)).rgb
      + texture2D(tMap, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, 1.0)).rgb) * 2.0;
    c += texture2D(tMap, vUv + uTexel * vec2(-2.0, 0.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(2.0, 0.0)).rgb;
    c += texture2D(tMap, vUv + uTexel * vec2(0.0, -2.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(0.0, 2.0)).rgb;
    gl_FragColor = vec4(c / 12.0, 0.62);
  }`;
const COMPOSITE = `
  varying vec2 vUv; uniform sampler2D tScene; uniform sampler2D tBloom; uniform vec2 uTexel;
  uniform float uBloom; uniform float uVignette; uniform float uPunch; uniform vec3 uFlash; uniform float uSharpen;
  float dither(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
  void main() {
    vec2 d = vUv - 0.5;
    vec3 c;
    if (uPunch > 0.002) {
      // Split the color channels toward the corners for a few frames after a heavy hit.
      vec2 o = d * dot(d, d) * uPunch * 0.11;
      c = vec3(texture2D(tScene, vUv + o).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv - o).b);
    } else {
      c = texture2D(tScene, vUv).rgb;
      if (uSharpen > 0.0) {
        // Contrast adaptive sharpening (after AMD CAS): the cross of neighbours sets how much
        // headroom the pixel has, so flat areas and strong edges are not pushed into halos.
        vec3 n = texture2D(tScene, vUv + vec2(0.0, uTexel.y)).rgb, s = texture2D(tScene, vUv - vec2(0.0, uTexel.y)).rgb;
        vec3 e = texture2D(tScene, vUv + vec2(uTexel.x, 0.0)).rgb, w = texture2D(tScene, vUv - vec2(uTexel.x, 0.0)).rgb;
        vec3 lo = min(c, min(min(n, s), min(e, w))), hi = max(c, max(max(n, s), max(e, w)));
        vec3 amp = sqrt(clamp(min(lo, 1.0 - hi) / max(hi, vec3(1e-4)), 0.0, 1.0));
        vec3 k = -amp / mix(8.0, 5.0, uSharpen);
        c = clamp((c + (n + s + e + w) * k) / (1.0 + 4.0 * k), 0.0, 1.0);
      }
    }
    // Screen blending keeps bright scenes from clipping to white.
    if (uBloom > 0.0) c += (1.0 - c) * min(vec3(1.0), texture2D(tBloom, vUv).rgb * uBloom);
    float edge = smoothstep(0.32, 0.86, length(d * vec2(1.0, 0.92)));
    c *= 1.0 - uVignette * edge;
    c += uFlash * edge;
    c += (dither(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(c, 1.0);
  }`;

export function createPostFX(renderer, { compactBloom = false } = {}) {
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quad = new THREE.Mesh(geometry); quad.frustumCulled = false; scene.add(quad);
  const pass = (fragmentShader, uniforms, extra = {}) => new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false, ...extra,
  });
  const texel = () => ({ value: new THREE.Vector2() });
  const prefilter = pass(PREFILTER, { tMap: { value: null }, uTexel: texel(), uThreshold: { value: 0.76 }, uKnee: { value: 0.09 } });
  const down = pass(DOWN, { tMap: { value: null }, uTexel: texel() });
  const up = pass(UP, { tMap: { value: null }, uTexel: texel() }, {
    transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
  });
  const composite = pass(COMPOSITE, {
    tScene: { value: null }, tBloom: { value: null }, uTexel: texel(), uBloom: { value: 0 }, uVignette: { value: 0.22 },
    uPunch: { value: 0 }, uFlash: { value: new THREE.Color(0, 0, 0) }, uSharpen: { value: 0 },
  });
  // The scene target reports itself as a display surface so three.js applies the same tone
  // mapping and sRGB encoding it uses for the canvas (render targets normally skip both).
  const sceneTarget = new THREE.WebGLRenderTarget(4, 4, {
    samples: Math.min(4, renderer.capabilities.maxSamples), depthBuffer: true, colorSpace: THREE.SRGBColorSpace,
    // The composite only samples color. Discard MSAA depth after the scene pass.
    resolveDepthBuffer: false, storeMultisampledDepthBuffer: false,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false,
  });
  sceneTarget.isXRRenderTarget = true;
  // Store the encoded bytes as they are; an sRGB attachment would encode them a second time.
  sceneTarget.texture.internalFormat = 'RGBA8';
  const LEVELS = compactBloom ? 4 : 5;
  const mips = Array.from({ length: LEVELS }, () => new THREE.WebGLRenderTarget(2, 2, {
    depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false,
  }));
  const size = new THREE.Vector2();
  let levels = 0;
  // `samples` is the scene MSAA count and `sharpen` the composite sharpening (0 to 1).
  const state = { glow: true, strength: 0.5, punch: 0, samples: sceneTarget.samples, sharpen: 0 };
  function draw(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
  }
  function setSize() {
    renderer.getDrawingBufferSize(size);
    const w = Math.max(1, size.x), h = Math.max(1, size.y);
    const samples = Math.min(state.samples, renderer.capabilities.maxSamples);
    if (sceneTarget.width === w && sceneTarget.height === h && sceneTarget.samples === samples) return;
    if (sceneTarget.samples !== samples) { sceneTarget.samples = samples; sceneTarget.dispose(); }
    sceneTarget.setSize(w, h);
    levels = 0;
    // Skip the largest blur surface on touch screens. The scene stays at
    // drawing-buffer size and the smallest mip covers the same halo radius.
    const shift = compactBloom ? 1 : 0;
    for (let i = 0, mw = w >> shift, mh = h >> shift; i < LEVELS; i++) {
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
    // Every post pass overwrites its viewport, except the upsample which blends
    // over an existing mip. The canvas also needs no separate clear.
    renderer.autoClear = false;
    if (bloom) {
      prefilter.uniforms.tMap.value = sceneTarget.texture;
      const footprint = compactBloom ? 1 : 0.5;
      prefilter.uniforms.uTexel.value.set(footprint / sceneTarget.width, footprint / sceneTarget.height);
      draw(prefilter, mips[0]);
      for (let i = 1; i < levels; i++) {
        down.uniforms.tMap.value = mips[i - 1].texture;
        down.uniforms.uTexel.value.set(1 / mips[i - 1].width, 1 / mips[i - 1].height);
        draw(down, mips[i]);
      }
      // Crossfade the wide halo with the finer level already in the target. Their
      // weights sum to one, so a large bright surface has the same gain at every size.
      for (let i = levels - 1; i > 0; i--) {
        up.uniforms.tMap.value = mips[i].texture;
        up.uniforms.uTexel.value.set(0.5 / mips[i].width, 0.5 / mips[i].height);
        draw(up, mips[i - 1]);
      }
    }
    composite.uniforms.tScene.value = sceneTarget.texture;
    composite.uniforms.uTexel.value.set(1 / sceneTarget.width, 1 / sceneTarget.height);
    composite.uniforms.uSharpen.value = state.sharpen;
    composite.uniforms.tBloom.value = mips[0].texture;
    composite.uniforms.uBloom.value = bloom ? state.strength : 0;
    composite.uniforms.uPunch.value = state.punch;
    draw(composite, null);
    renderer.autoClear = clear;
  }
  return {
    render, setSize, state,
    /**
     * Only lights should glow: below ~0.75 the threshold catches lava fields, road lines and
     * lit armor, which washes dark biomes out. Dark biomes get a slightly lower threshold and
     * more strength so their neon still reads; bright biomes need the highest threshold.
     */
    setLook(luminance) {
      const t = Math.min(1, Math.max(0, (luminance - 0.22) / 0.5)), k = t * t * (3 - 2 * t);
      state.strength = 0.45 + (0.2 - 0.45) * k;
      prefilter.uniforms.uThreshold.value = 0.76 + 0.08 * k;
      composite.uniforms.uVignette.value = 0.3 - 0.12 * k;
    },
    flash: composite.uniforms.uFlash.value,
  };
}
