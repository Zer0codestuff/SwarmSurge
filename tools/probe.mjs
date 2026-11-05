// usage: node probe.mjs <level> <stage> <policy> <setup js> <sample js> [samples] [every game-sec]
// Runs a stage in turbo, applies `setup` inside the engine, prints `sample` every few game seconds.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const [,, level, stage, policy, setup = '0', sample = 'G.army', n = '20', every = '3'] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
page.on('pageerror', (e) => console.log('PAGEERROR: ' + e.message));
await page.goto(`http://127.0.0.1:8000/index.html?turbo=1&level=${level}&stage=${stage}`, { waitUntil: 'load' });
await page.evaluate(fs.readFileSync(new URL('./policies.js', import.meta.url), 'utf8'));
await page.evaluate((src) => window.__game.dbg(src), setup);
if (policy !== 'none') await page.evaluate((p) => { const g = window.__game; g.setBot(() => window.__policies[p](g)); }, policy);
let next = +every;
for (let k = 0; k < +n;) {
  const s = await page.evaluate(() => window.__game.state);
  if (s.phase === "lost" || s.phase === "won") { console.log("phase", s.phase, "stage", s.stage, JSON.stringify(await page.evaluate((src) => window.__game.dbg(src), sample))); break; }
  if (s.time >= next) {
    next += +every; k++;
    console.log(`T=${s.time} S${s.stage} t=${s.stageTime}`, JSON.stringify(await page.evaluate((src) => window.__game.dbg(src), sample)));
  }
  await new Promise((r) => setTimeout(r, 50));
}
await browser.close();
