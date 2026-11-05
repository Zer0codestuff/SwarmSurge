import puppeteer from 'puppeteer-core';
import fs from 'fs';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
await page.goto(`http://127.0.0.1:8000/index.html?level=2&stage=3&speed=2`, { waitUntil: 'load' });
await page.evaluate(fs.readFileSync('/tmp/gametools/policies.js', 'utf8'));
await page.evaluate(() => { const g = window.__game; g.setBot(() => window.__policies.smart(g)); });
let n = 0;
const t0 = Date.now();
while (n < 2 && Date.now() - t0 < 150000) {
  await new Promise((r) => setTimeout(r, 80));
  const th = await page.evaluate(() => window.__game.threats());
  if (th.length && th[0].t < 0.7) { await page.screenshot({ path: `/tmp/tele_${n++}.png` }); await new Promise((r) => setTimeout(r, 4000)); }
}
await browser.close();
