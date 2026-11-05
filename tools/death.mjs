import puppeteer from 'puppeteer-core';
import fs from 'fs';
const [,, level, stage, prefix, speed = '3', phaseWanted = 'won'] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await page.goto(`http://127.0.0.1:8000/index.html?level=${level}&stage=${stage}&speed=${speed}`, { waitUntil: 'load' });
await page.evaluate(fs.readFileSync('/tmp/gametools/policies.js', 'utf8'));
await page.evaluate(() => { const g = window.__game; g.setBot(() => window.__policies.smart(g)); });
const t0 = Date.now();
while (Date.now() - t0 < 200000) {
  await new Promise((r) => setTimeout(r, 100));
  const s = await page.evaluate(() => window.__game.state);
  if (s.phase === phaseWanted) break;
}
for (let k = 0; k < 3; k++) { await page.screenshot({ path: `/tmp/${prefix}_${k}.png` }); await new Promise((r) => setTimeout(r, 450)); }
console.log(logs.join('\n') || 'no errors');
await browser.close();
