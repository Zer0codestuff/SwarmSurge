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
  await page.goto(`${process.env.GAME_URL || 'http://127.0.0.1:8000'}/index.html?level=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game, { polling: 100 });
  const result = await page.evaluate(() => {
    const game = window.__game;
    game.pause();
    return game.dbg(`(() => {
      resetQualitySample(); qualityGoodWindows = 0;
      const ratio = () => renderer.getPixelRatio();
      const feed = (dt, count) => { for (let i = 0; i < count; i++) updateMobileQuality(dt); };
      const initial = ratio();
      feed(1 / 30, 200);
      const stableThirty = ratio();
      updateMobileQuality(5);
      const afterSuspension = ratio();
      feed(1 / 20, 130);
      const underLoad = ratio();
      const loadedPixels = canvas.width * canvas.height;
      feed(1 / 30, 1000);
      const recoveredThirty = ratio();
      feed(1 / 20, 130);
      feed(1 / 60, 1800);
      const recoveredSixty = ratio();
      return { initial, stableThirty, afterSuspension, underLoad, loadedPixels, recoveredThirty, recoveredSixty };
    })()`);
  });
  const checks = [
    ['Touch devices start at the configured resolution', result.initial === 1.75],
    ['A stable 30 Hz cadence keeps its resolution', result.stableThirty === result.initial],
    ['A long suspension does not reduce resolution', result.afterSuspension === result.initial],
    ['Sustained slow frames lower the pixel count', result.underLoad === 1.25 && result.loadedPixels === 487 * 1055],
    ['Stable 30 Hz restores resolution', result.recoveredThirty === result.initial],
    ['Stable 60 Hz restores resolution', result.recoveredSixty === result.initial],
  ];
  for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  if (errors.length) console.error(errors.join('\n'));
  if (checks.some(([, pass]) => !pass) || errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
