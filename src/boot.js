// Fast-path entry point: paints Frame 1 of the animated coastal title diorama immediately
// from a tiny module graph, then loads the full campaign engine in the background.
import { params, TURBO, renderer, post, sound, createScaleGovernor, applyRenderScale, renderScale } from './runtime.js';
import { createTitleScreen } from './title-scene.js';

const directBattle = TURBO || params.has('level');
const drawTitle = (titleScene, titleCamera) => {
  renderer.info.reset();
  post.setLook(0.62);
  post.state.punch = 0;
  post.flash.setRGB(0, 0, 0);
  post.render(titleScene, titleCamera);
};

const titleScreen = createTitleScreen(sound, drawTitle);
let bootActive = !directBattle;
let pendingPlay = false;
let bootRaf = 0;
let last = performance.now();

function bootResize() {
  if (!bootActive) return;
  if (renderScale.dpr !== devicePixelRatio) {
    createScaleGovernor();
    applyRenderScale(renderScale.ratio);
  }
  renderer.setSize(innerWidth, innerHeight, false);
}

function bootFrame(now) {
  if (!bootActive) return;
  bootRaf = requestAnimationFrame(bootFrame);
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  titleScreen.render(dt);
}

function stopBootLoop() {
  bootActive = false;
  if (bootRaf) { cancelAnimationFrame(bootRaf); bootRaf = 0; }
  removeEventListener('resize', bootResize);
}

function consumePendingPlay() {
  const was = pendingPlay;
  pendingPlay = false;
  return was;
}

const playBtn = document.getElementById('welcome-play');
if (!directBattle) {
  addEventListener('resize', bootResize);
  playBtn.onclick = () => {
    sound.unlock();
    pendingPlay = true;
    playBtn.disabled = true;
    playBtn.textContent = 'LOADING\u2026';
  };
  titleScreen.show();
  // Paint Frame 1 synchronously right now so the animated diorama appears on screen immediately.
  titleScreen.render(0, true);
  last = performance.now();
  bootRaf = requestAnimationFrame(bootFrame);
}

let engineLoading = false;
function loadEngine() {
  if (engineLoading) return;
  engineLoading = true;
  import('./main.js').then(({ bootEngine }) => {
    playBtn.disabled = false;
    playBtn.textContent = 'PLAY';
    bootEngine({ titleScreen, stopBootLoop, consumePendingPlay });
  });
}

if (directBattle) {
  loadEngine();
} else {
  // Yield one compositor frame so Frame 1 reaches the screen before parsing the full engine;
  // keep a short timer fallback for background tabs or harnesses that stub rAF.
  requestAnimationFrame(() => setTimeout(loadEngine, 0));
  setTimeout(loadEngine, 60);
}
