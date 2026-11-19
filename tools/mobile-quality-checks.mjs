// Serve the project first. CHROME_PATH overrides platform discovery.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const executablePath = process.env.CHROME_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(path => fs.existsSync(path));
if (!executablePath) throw new Error('Set CHROME_PATH to a Chrome or Chromium executable.');

const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /THREE\.|WebGL/.test(message.text())) errors.push(message.text());
  });
  // The test supplies the frame clock and avoids scheduling real animation in parallel.
  await page.evaluateOnNewDocument(() => { window.requestAnimationFrame = () => 0; });
  await page.goto(`${process.env.GAME_URL || 'http://127.0.0.1:8000'}/index.html?level=1&shaderdebug=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game, { polling: 100 });
  const result = await page.evaluate(() => {
    return window.__game.dbg(`(() => {
      const render = renderer.render;
      const dims = () => [canvas.width, canvas.height, renderer.getPixelRatio()].join(',');
      const initial = dims();
      let shadowUpdates = 0, scenePasses = 0, fullscreenPasses = 0, bloomPixels = 0;
      let fixedBuffers = true, noDepthResolve = true;
      renderer.render = (world, view) => {
        const target = renderer.getRenderTarget();
        if (world === scene) {
          scenePasses++;
          fixedBuffers &&= target.width === canvas.width && target.height === canvas.height;
          noDepthResolve &&= !target.resolveDepthBuffer && !target.storeMultisampledDepthBuffer;
          if (sun.shadow.needsUpdate) { shadowUpdates++; sun.shadow.needsUpdate = false; }
        } else if (target) {
          fullscreenPasses++;
          bloomPixels = Math.max(bloomPixels,target.width * target.height);
        }
      };
      const feed = (interval, count) => {
        for (let i = 0; i < count; i++) frame(last + interval);
      };
      try {
        feed(1000 / 60, 3);
        shadowUpdates = scenePasses = 0;
        feed(1000 / 60, 60);
        const cadence = [shadowUpdates,scenePasses];
        feed(1000 / 30, 90);
        const steady = dims();
        feed(5000, 1);
        const resumed = dims();
        feed(50, 220);
        const stressed = dims(), glowEnabled = post.state.glow;
        const glowLimit = (canvas.width >> 2) * (canvas.height >> 2);
        prefs.set('glow',false);
        fullscreenPasses = 0;
        feed(50, 3);
        const withoutGlow = fullscreenPasses === 0 && dims() === initial && !post.state.glow;
        prefs.set('glow',true);
        // The next stage forces a fresh shadow even within the cooldown.
        drawBattlefield(last + 34);
        shadowUpdates = 0;
        enterStage(1);
        drawBattlefield(last + 35);
        const freshStage = shadowUpdates === 1;
        const { phase, phaseT, shown } = G;
        Object.assign(G,{ phase:'won',phaseT:11,shown:true });
        scenePasses = 0;
        feed(1000 / 60, 10);
        const idleResults = scenePasses === 0;
        Object.assign(G,{ phase,phaseT,shown });
        return {initial, steady, resumed, stressed, cadence, fixedBuffers, noDepthResolve,
          glowEnabled, glowLimit, bloomPixels, withoutGlow, freshStage, idleResults};
      } finally { renderer.render = render; }
    })()`);
  });

  // Verify the real shader and resolve path still produces a frame, then rotate.
  await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.waitForFunction(() => document.querySelector('canvas#c').width === 1477, { polling: 100 });
  const rotated = await page.evaluate(() => window.__game.dbg(`(() => {
    renderWorld(0);
    drawBattlefield(performance.now(),true);
    const gl = renderer.getContext(), rgba = new Uint8Array(4);
    gl.readPixels(canvas.width >> 1,canvas.height >> 1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
    return {width:canvas.width,height:canvas.height,ratio:renderer.getPixelRatio(),
      visible:rgba[0]+rgba[1]+rgba[2]>0, error:gl.getError()};
  })()`));
  const culling = await page.evaluate(async () => {
    const THREE = await import('three'), { chunkScenery } = await import('/src/scenery-batches.js');
    const root = new THREE.Group(), geometry = new THREE.SphereGeometry(1,12,12), material = new THREE.MeshLambertMaterial();
    const source = new THREE.InstancedMesh(geometry,material,30);
    const matrix = new THREE.Matrix4(), tint = new THREE.Color(0x80ff00);
    source.castShadow = true;
    for (let i = 0; i < source.count; i++) {
      source.setMatrixAt(i,matrix.makeTranslation(0,0,i < 15 ? -10 : -200));
      source.setColorAt(i,tint);
    }
    root.add(source);
    chunkScenery(root);
    const view = new THREE.PerspectiveCamera(60,1,.5,50);
    view.updateMatrixWorld();
    const frustum = new THREE.Frustum().setFromProjectionMatrix(view.projectionMatrix);
    const scenery = root.children.length === 2
      && root.children.reduce((count,batch) => count + batch.count,0) === 30
      && root.children.every(batch => batch.castShadow && batch.geometry === geometry)
      && root.children.filter(batch => batch.intersectsFrustum(frustum)).length === 1;
    for (const batch of root.children) batch.dispose();
    material.dispose(); geometry.dispose();
    const troops = window.__game.dbg(`(() => {
      B.n = 0;
      const batches = blueForms.flatMap(form => [form.near,form.far]);
      spawn(B,0,0,1,0); spawn(B,0,1000,1e26,0);
      const view = new THREE.PerspectiveCamera(60,1,.5,80);
      view.position.set(0,2,10); view.lookAt(0,0,0); view.updateMatrixWorld();
      const projection = new THREE.Matrix4().multiplyMatrices(view.projectionMatrix,view.matrixWorldInverse);
      writeBlue(new THREE.Frustum().setFromProjectionMatrix(projection));
      return B.n === 2 && G.rank === RANKS.length-1 && batches.reduce((count,mesh) => count + mesh.count,0) === 1;
    })()`);
    return { scenery, troops };
  });
  if (process.env.VERBOSE) console.log(JSON.stringify({ result, rotated, culling }));
  const checks = [
    ['Touch resolution keeps its configured 1.75 pixel ratio', result.initial === '682,1477,1.75'],
    ['Steady 30 Hz and a long interruption preserve the drawing buffer', result.steady === result.initial && result.resumed === result.initial],
    ['Sustained 20 Hz frames preserve full scene resolution and the glow preference', result.stressed === result.initial && result.fixedBuffers && result.glowEnabled],
    ['Only the blur targets are quarter-size and Glow off skips their draws', result.bloomPixels === result.glowLimit && result.withoutGlow],
    ['Shadows update every other 60 Hz frame and refresh at a stage change', result.cadence[0] === 30 && result.cadence[1] === 60 && result.freshStage],
    ['The composite does not resolve or retain multisampled depth', result.noDepthResolve],
    ['Static chunks keep the same instances and skip batches outside the frustum', culling.scenery],
    ['Troop culling skips draw instances while keeping simulation and army rank', culling.troops],
    ['Settled results stop redrawing the battlefield', result.idleResults],
    ['Landscape rotation preserves pixel density and renders a visible frame', rotated.width === 1477 && rotated.height === 682 && rotated.ratio === 1.75 && rotated.visible && rotated.error === 0],
  ];
  for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  if (errors.length) console.error(errors.join('\n'));
  if (checks.some(([, pass]) => !pass) || errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
