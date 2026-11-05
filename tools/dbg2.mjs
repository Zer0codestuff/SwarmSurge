import puppeteer from 'puppeteer-core';
import fs from 'fs';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:8000/index.html?turbo=1&level=9&stage=1`, { waitUntil: 'load' });
await page.evaluate(fs.readFileSync('/tmp/gametools/policies.js', 'utf8'));
await page.evaluate(() => { const g = window.__game; g.setBot(() => window.__policies.naive(g)); });
while (true) { await new Promise((r) => setTimeout(r, 300)); const s = await page.evaluate(() => window.__game.state); if (s.stage === 2 && s.stageTime > 40) break; }
console.log(JSON.stringify(await page.evaluate(() => ({ st: window.__game.state, u: window.__game.units(), gates: window.__game.gates().map(q => [q.t, q.v, q.boost, q.x, q.d, q.passes, q.prog]) }))));
await browser.close();
