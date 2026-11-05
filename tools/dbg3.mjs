import puppeteer from 'puppeteer-core';
import fs from 'fs';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:8000/index.html?turbo=1&level=2&stage=3`, { waitUntil: 'load' });
await page.evaluate(fs.readFileSync('/tmp/gametools/policies.js', 'utf8'));
await page.evaluate(() => { const g = window.__game; window.__aims = []; let k = 0; g.setBot(() => { window.__policies.smart(g); if (++k % 10 === 0) window.__aims.push(g.state.stageTime + ':' + g.aimX.toFixed(2) + ':' + JSON.stringify(g.state.bossZ)); }); });
while (true) { await new Promise((r) => setTimeout(r, 300)); const s = await page.evaluate(() => window.__game.state); if (s.stageTime > 75 || s.phase !== 'play' && s.phase !== 'intro') break; }
const r = await page.evaluate(() => ({ gates: window.__game.gates().map(q => [q.t, q.v, q.x, q.d, q.passes, Math.round(q.prog), q.hp]), aims: window.__aims.slice(-30) }));
r.gates.forEach(g => console.log(JSON.stringify(g)));
console.log(r.aims.join('\n'));
await browser.close();
