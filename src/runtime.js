// Shared WebGL renderer, post-processing, render-scale governor and audio runtime.
// Loaded first by boot.js so the animated title screen paints immediately while the
// campaign engine loads in the background.
import * as THREE from 'three';
import { Sound } from './sound.js';
import { createPostFX } from './postfx.js';
import { createRenderScale, createGpuTimer } from './render-scale.js';
import { useCompactShadowFilter } from './shadow-filter.js';
import { prefs } from './settings.js';

export const params = new URLSearchParams(location.search);
export const TURBO = params.has('turbo');
export const canvas = document.getElementById('c');
export const isTouch = matchMedia('(pointer: coarse)').matches;
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const RENDER_SCALE_KEY = 'swarm-render-scale';

// Only the multisampled scene target needs depth. The canvas is a fullscreen composite.
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, depth: false, powerPreference: 'high-performance' });
export let renderScale;
export function createScaleGovernor() {
  let initial = 0;
  try {
    const stored = JSON.parse(localStorage.getItem(RENDER_SCALE_KEY));
    if (stored?.dpr === devicePixelRatio) initial = +stored.ratio || 0;
  } catch {}
  const native = Math.min(devicePixelRatio, 3);
  renderScale = createRenderScale({ floor: Math.min(native, isTouch ? 1.75 : 2), ceiling: native, initial });
  renderScale.dpr = devicePixelRatio;
  return renderScale;
}
createScaleGovernor();
renderer.setPixelRatio(renderScale.ratio);
// Reading a link log forces the driver to finish every new program synchronously, which
// shows up as a hitch the first time an effect appears. `?shaderdebug=1` restores the check.
renderer.debug.checkShaderErrors = params.has('shaderdebug');
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
useCompactShadowFilter();
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.info.autoReset = false; // one frame spans several passes

export const post = createPostFX(renderer, { compactBloom: isTouch });
export const gpuTimer = renderScale.adaptive && !TURBO ? createGpuTimer(renderer.getContext()) : null;
export const sound = new Sound();
prefs.watch('glow', (on) => { post.state.glow = on; });

let scaleHook = null;
export function setScaleHook(fn) { scaleHook = fn; }

export function applyRenderScale(ratio) {
  // From 2.5x the pixels are fine enough that two samples smooth edges as four did at 1.75x,
  // which halves the multisampled memory. Below native density the composite sharpens what
  // the browser will stretch to the screen.
  post.state.samples = ratio >= (isTouch ? 2 : 2.5) ? 2 : 4;
  post.state.sharpen = Math.min(0.6, Math.max(0, 1 - ratio / devicePixelRatio) * 1.4);
  renderer.setPixelRatio(ratio);
  scaleHook?.();
}

applyRenderScale(renderScale.ratio);
renderer.setSize(innerWidth, innerHeight, false);
