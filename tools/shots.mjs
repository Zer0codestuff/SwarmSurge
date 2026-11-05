// usage: node shots.mjs <level> <stage> <prefix> <times comma sep, game seconds> [speed]
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const [,, level, stage, prefix, times, speed = '2'] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto(`http://127.0.0.1:8000/index.html?level=${level}&stage=${stage}&speed=${speed}`, { waitUntil: 'load' });
await page.evaluate(fs.readFileSync('/tmp/gametools/policies.js', 'utf8'));
await page.evaluate(() => { const g = window.__game; g.setBot(() => window.__policies.smart(g)); });
const T = times.split(',').map(Number);
let k = 0;
const t0 = Date.now();
while (k < T.length && Date.now() - t0 < 200000) {
  await new Promise((r) => setTimeout(r, 150));
  const s = await page.evaluate(() => window.__game.state);
  if (s.time >= T[k] || s.phase === 'won' || s.phase === 'lost') {
    await page.screenshot({ path: `/tmp/${prefix}_${k}.png` });
    console.log(k, `t=${s.time} st=${s.stage} ph=${s.phase} army=${s.army.toExponential(2)} fps=${s.fps} blue=${s.blueUnits} red=${s.redUnits}`);
    k++;
    if (s.phase === 'won' || s.phase === 'lost') break;
  }
}
console.log(logs.join('\n') || 'no errors');
await browser.close();
