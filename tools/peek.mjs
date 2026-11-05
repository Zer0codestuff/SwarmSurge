// usage: node peek.mjs <level> <stage> <policy> <prefix> [speed] [shots] [interval ms]
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const [,, level, stage, policy, prefix, speed = '2', n = '4', every = '2500'] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await page.goto(`http://127.0.0.1:8000/index.html?level=${level}&stage=${stage}&speed=${speed}`, { waitUntil: 'load' });
await page.evaluate(fs.readFileSync(new URL('./policies.js', import.meta.url), 'utf8'));
if (policy !== 'none') await page.evaluate((p) => { const g = window.__game; g.setBot(() => window.__policies[p](g)); }, policy);
for (let k = 0; k < +n; k++) {
  await new Promise((r) => setTimeout(r, +every));
  await page.screenshot({ path: `/tmp/ss/${prefix}_${k}.png` });
  const s = await page.evaluate(() => window.__game.state);
  console.log(k, `t=${s.stageTime} lives=${s.lives} army=${s.army} red=${s.redUnits} boss=${s.bossHp} tower=${s.towerHp} aim=${(await page.evaluate(() => window.__game.aimX)).toFixed(2)}`);
}
console.log(logs.join('\n'));
await browser.close();
