import puppeteer from 'puppeteer-core';
import fs from 'fs';
const [,, level, stage, policy, secs] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:8000/index.html?turbo=1&level=${level}&stage=${stage}`, { waitUntil: 'load' });
await page.evaluate(fs.readFileSync('/tmp/gametools/policies.js', 'utf8'));
await page.evaluate((p) => { const g = window.__game; g.setBot(() => window.__policies[p](g)); }, policy);
for (let k = 0; k < 12; k++) {
  await new Promise((r) => setTimeout(r, (+secs * 1000) / 12));
  const r = await page.evaluate(() => { const g = window.__game, s = g.state; return { t: s.stageTime, ph: s.phase, army: s.army.toExponential(1), tower: s.towerHp?.toExponential(1), boss: s.bossHp?.toExponential(1), lives: s.lives, gates: g.gates().map((q) => `${q.t}${q.v ?? ''}${q.boost > 1 ? '(b' + q.boost + ')' : ''}${q.need ? '[' + Math.round(q.prog) + '/' + q.need + ']' : ''}${q.hp ? '{' + Math.round(q.hp) + '}' : ''}@${q.x}`).join(' ') }; });
  console.log(JSON.stringify(r));
  if (r.ph === 'won' || r.ph === 'lost' || r.ph === 'clear') break;
}
await browser.close();
