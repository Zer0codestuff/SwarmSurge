import puppeteer from 'puppeteer-core';
import fs from 'fs';
const [,, level, stage, policy, out, w = '390', h = '844'] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h });
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await page.goto(`http://127.0.0.1:8000/index.html?level=${level}&stage=${stage}&speed=8`, { waitUntil: 'load' });
await page.evaluate(fs.readFileSync(new URL('./policies.js', import.meta.url), 'utf8'));
await page.evaluate((p) => { const g = window.__game; g.setBot(() => window.__policies[p](g)); }, policy);
const t0 = Date.now();
while (Date.now() - t0 < 200000) {
  await new Promise((r) => setTimeout(r, 500));
  const vis = await page.evaluate(() => !document.getElementById('result').classList.contains('hidden'));
  if (vis) break;
}
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: out });
console.log(await page.evaluate(() => document.getElementById('rmsg').innerText), logs.join('\n'));
await browser.close();
