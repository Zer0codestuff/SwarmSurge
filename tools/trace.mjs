import puppeteer from 'puppeteer-core';
import fs from 'fs';
const [,, level, stage, policy, until] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:8000/index.html?turbo=1&level=${level}&stage=${stage}`, { waitUntil: 'load' });
await page.evaluate(fs.readFileSync('/tmp/gametools/policies.js', 'utf8'));
await page.evaluate((p) => {
  const g = window.__game; window.__trace = []; let k = 0;
  g.setBot(() => { window.__policies[p](g); if (++k % 20 === 0 && g.state.phase === 'play') { const s = g.state; window.__trace.push(`t=${s.stageTime} lives=${s.lives} red=${s.redUnits} blue=${s.blueUnits} army=${s.army.toExponential(1)} boss=${(s.bossHp||0).toExponential(2)} guns=${s.guns} rate=${s.rate} ph=${s.phase}`); } });
}, policy);
const t0 = Date.now();
while (Date.now() - t0 < 60000) {
  await new Promise((r) => setTimeout(r, 500));
  const s = await page.evaluate(() => window.__game.state);
  if (s.phase !== 'play' && s.phase !== 'intro' || s.stageTime > +until) break;
}
console.log((await page.evaluate(() => window.__trace)).join('\n'));
await browser.close();
