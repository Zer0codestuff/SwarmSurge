// usage: node run.mjs <level> <policy> [stage] [maxGameSec]
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const [,, level, policy = 'smart', stage = '1', maxSec = '400'] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 640 });
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto(`http://127.0.0.1:8000/index.html?turbo=1&level=${level}&stage=${stage}`, { waitUntil: 'load' });
await page.evaluate(fs.readFileSync(new URL('./policies.js', import.meta.url), 'utf8'));
await page.evaluate((p) => { const g = window.__game; g.setBot(() => window.__policies[p](g)); }, policy);
let lastStage = -1, t0 = Date.now(), last = null;
const fmt = (n) => n == null ? '-' : n >= 1e4 ? n.toExponential(2) : Math.round(n);
while (true) {
  await new Promise((r) => setTimeout(r, 400));
  const s = await page.evaluate(() => window.__game.state);
  last = s;
  if (process.env.TRACE && s.phase === 'play') console.log(`t=${s.stageTime} S${s.stage} lives=${s.lives} army=${fmt(s.army)} red=${s.redUnits} blue=${s.blueUnits} tower=${fmt(s.towerHp)} boss=${fmt(s.bossHp)} bossZ=${s.bossZ} leaks=${await page.evaluate(() => window.__game.leaks())}`);
  if (s.phase === 'won' || s.phase === 'lost' || s.time > +maxSec || Date.now() - t0 > 240000) {
    for (const e of s.log) console.log(`  L${level} ${policy} S${e.stage} ${e.result} ${e.t}s lives=${e.lives} army=${fmt(e.maxArmy)} combo=${fmt(e.combo)} guns=${e.guns} pow=${e.power} twin=${e.twin}`);
    console.log(`L${level} ${policy}: ${s.phase.toUpperCase()} stage=${s.stage} t=${s.time} st=${s.stageTime} lives=${s.lives} maxArmy=${fmt(s.maxArmy)} combo=${fmt(s.bestCombo)} guns=${s.guns} rate=${s.rate.toFixed(2)} pow=${s.power} twin=${s.twin} tower=${fmt(s.towerHp)} boss=${fmt(s.bossHp)} bossZ=${s.bossZ}`);
    break;
  }
}
if (logs.length) console.log(logs.slice(0, 10).join('\n'));
await browser.close();
