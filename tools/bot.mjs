import puppeteer from 'puppeteer-core';
const [,, level, policy='smart', speed='5', maxSec='150'] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 640 });
const logs = [];
page.on('pageerror', e => logs.push('PAGEERROR: '+e.message));
page.on('console', m => { if (m.type()==='error') logs.push(m.text()); });
await page.goto(`http://127.0.0.1:8765/index.html?level=${level}&speed=${speed}`, { waitUntil: 'load' });
await page.evaluate((policy) => {
  setInterval(() => {
    const g = window.__game; if (!g) return;
    if (policy === 'dumb') { g.aim(0); return; }
    if (policy === 'left') { g.aim(-4); return; }
    if (policy === 'right') { g.aim(4.6); return; }
    const gates = g.gates();
    const up = gates.find(x => x.t === 'upgrade');
    if (up) return g.aim(up.x);
    const bar = gates.find(x => x.t === 'barrier' || x.t === 'ice');
    if (bar) return g.aim(bar.x);
    let bx = 0, bv = -1;
    for (let x = -6; x <= 6; x += 0.25) {
      let v = 1;
      for (const q of gates) if (Math.abs(x - q.x) < q.w / 2 - 0.3) v *= q.t === 'mul' ? q.v : q.t === 'add' ? q.v + 1 : q.t === 'div' ? 0.5 : 1;
      if (v > bv + 0.01) { bv = v; bx = x; }
    }
    g.aim(bx);
  }, 120);
}, policy);
const t0 = Date.now(); let last = '';
while ((Date.now() - t0) / 1000 < +maxSec) {
  await new Promise(r => setTimeout(r, 3000));
  const s = await page.evaluate(() => window.__game.state);
  const line = `t=${s.time} st=${s.stage} ph=${s.phase} blue=${s.blueUnits} army=${s.army} red=${s.redUnits} lives=${s.lives} tower=${s.towerHp} boss=${s.bossHp} guns=${s.guns} rate=${s.rate.toFixed(2)} fps=${s.fps}`;
  console.log(line);
  if (s.phase === 'won' || s.phase === 'lost') break;
}
console.log(logs.join('\n') || 'no errors');
await browser.close();
