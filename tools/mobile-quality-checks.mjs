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

  // The governor climbs from the 1.75 floor while frames hold 60 Hz and returns under load.
  const scale = await page.evaluate(async () => {
    const { createRenderScale } = await import('/src/render-scale.js');
    // A failed probe stays out of reach for its backoff even when frames are calm again.
    const policy = createRenderScale({ floor: 1.75, ceiling: 3, initial: 2.25 });
    let t = 0;
    const run = (seconds, interval, cpu = 2) => { for (const end = t + seconds * 1000; t < end; t += interval) policy.frame(t, interval, cpu); };
    run(6, 1000 / 60); const probed = policy.ratio;
    run(4, 24); const failed = policy.ratio;
    run(12, 1000 / 60); const held = policy.ratio;
    run(25, 1000 / 60); const retried = policy.ratio;
    const cpuBound = createRenderScale({ floor: 1.75, ceiling: 3, initial: 2.5 });
    for (let k = 0; k < 600; k++) cpuBound.frame(k * 25, 25, 14);
    const backoff = probed === 2.5 && failed < probed && held < probed && retried > held && cpuBound.ratio === 2.5;
    return window.__game.dbg(`(() => {
      const feed = (interval, count) => { for (let i = 0; i < count; i++) frame(last + interval); };
      const dims = () => [canvas.width, canvas.height, renderer.getPixelRatio()];
      feed(1000 / 60, 420);
      const [width, height, ratio] = dims();
      const stored = JSON.parse(localStorage.getItem(RENDER_SCALE_KEY) || 'null');
      const climbed = ratio > 1.75 && width === Math.floor(390 * ratio) && height === Math.floor(844 * ratio)
        && stored?.ratio === ratio && post.state.sharpen < .58 && post.state.samples === (ratio >= 2 ? 2 : 4);
      feed(50, 400);
      const floor = renderer.getPixelRatio() === 1.75 && canvas.width === 682 && post.state.samples === 4 && Math.abs(post.state.sharpen - .5833) < .01;
      localStorage.removeItem(RENDER_SCALE_KEY);
      return { climbed, floor, backoff: ${backoff}, ratio };
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
      const batches = blueForms.flatMap(form => [form.near,form.mid,form.far]);
      spawn(B,0,0,1,0); spawn(B,0,1000,1e26,0);
      const view = new THREE.PerspectiveCamera(60,1,.5,80);
      view.position.set(0,2,10); view.lookAt(0,0,0); view.updateMatrixWorld();
      const projection = new THREE.Matrix4().multiplyMatrices(view.projectionMatrix,view.matrixWorldInverse);
      writeBlue(new THREE.Frustum().setFromProjectionMatrix(projection));
      return B.n === 2 && G.rank === RANKS.length-1 && batches.reduce((count,mesh) => count + mesh.count,0) === 1;
    })()`);
    const crowded = window.__game.dbg(`(() => {
      const lightShadows = troopMeshes.every(mesh => {
        const proxy = mesh.userData.shadowProxy;
        return !mesh.castShadow && proxy?.instanceMatrix === mesh.instanceMatrix
          && proxy.geometry.attributes.unitMotion === mesh.geometry.attributes.unitMotion
          && proxy.geometry.index.count / 3 <= 160;
      });
      const pool = new FX.Debris(new THREE.Scene(),8);
      pool.burst(0,1,0,[[1,0,0],[0,1,0],[0,0,1]],3);
      pool.life[1] = .01;
      pool.update(.02);
      const liveOnly = pool.mesh.count === 2 && pool.mesh.instanceColor.getZ(1) === 1
        && pool.mesh.instanceMatrix.updateRanges[0]?.count === 32;
      pool.clear();
      const clean = pool.mesh.count === 0 && !pool.mesh.visible;
      pool.mesh.dispose(); pool.mesh.geometry.dispose(); pool.mesh.material.dispose();
      return lightShadows && liveOnly && clean;
    })()`);
    return { scenery, troops, crowded };
  });
  if (process.env.VERBOSE) console.log(JSON.stringify({ result, scale, rotated, culling }));
  const checks = [
    ['Touch resolution starts at the 1.75 pixel ratio floor', result.initial === '682,1477,1.75'],
    ['Steady 30 Hz and a long interruption keep the floor resolution', result.steady === result.initial && result.resumed === result.initial],
    ['Sustained 20 Hz frames never drop below the floor and keep the glow preference', result.stressed === result.initial && result.fixedBuffers && result.glowEnabled],
    ['Calm 60 Hz frames raise and persist the resolution with matching samples and sharpening', scale.climbed],
    ['A heavy load returns the resolution to the 1.75 floor and no lower', scale.floor],
    ['A failed resolution probe backs off, and CPU-bound frames hold the level', scale.backoff],
    ['Only the blur targets are quarter-size and Glow off skips their draws', result.bloomPixels === result.glowLimit && result.withoutGlow],
    ['Shadows update every other 60 Hz frame and refresh at a stage change', result.cadence[0] === 30 && result.cadence[1] === 60 && result.freshStage],
    ['The composite does not resolve or retain multisampled depth', result.noDepthResolve],
    ['Static chunks keep the same instances and skip batches outside the frustum', culling.scenery],
    ['Troop culling skips draw instances while keeping simulation and army rank', culling.troops],
    ['Touch shadow proxies share motion and debris draws only live pieces', culling.crowded],
    ['Settled results stop redrawing the battlefield', result.idleResults],
    ['Landscape rotation preserves pixel density and renders a visible frame', rotated.width === 1477 && rotated.height === 682 && rotated.ratio === 1.75 && rotated.visible && rotated.error === 0],
  ];
  for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  if (errors.length) console.error(errors.join('\n'));
  if (checks.some(([, pass]) => !pass) || errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
