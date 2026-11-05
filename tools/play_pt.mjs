import puppeteer from 'puppeteer-core';
// usage: node play.mjs <level> <bot: smart|center|none> [turbo|render] [w h]
const [,, level, botMode='smart', mode='turbo', w='390', h='844'] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1, isMobile: +w < +h, hasTouch: +w < +h });
const errs = [];
page.on('console', m => { if (['error'].includes(m.type())) errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
const q = `level=${level}&stage=1${mode === 'turbo' ? '&turbo' : '&speed=4'}`;
await page.goto('http://127.0.0.1:8000/index.html?' + q, { waitUntil: 'load' });
await page.evaluate((botMode) => {
  const G = window.__game;
  G.setBot(() => {
    if (botMode === 'none') return;
    if (botMode === 'center') { G.aim(0); return; }
    const gs = G.gates().filter(g => g.d > -2 && g.d < 40);
    let best = null, bs = -Infinity;
    for (const g of gs) {
      let s = 0;
      if (g.t === 'mul') s = g.v * 6;
      else if (g.t === 'add') s = g.v;
      else if (g.t === 'div') s = -g.v * 4;
      else if (g.t === 'sub') s = -50;
      else s = g.v * 0.5;
      s -= g.d * 0.05;
      if (g.hp > 0 && g.t !== 'mul' && g.t !== 'add') s -= 0; // breakable gates still fine
      if (s > bs) { bs = s; best = g; }
    }
    if (best) G.aim(best.x); else G.aim(0);
  });
}, botMode);
const start = Date.now();
let st, lastShot = 0, i = 0;
const limit = mode === 'turbo' ? 120000 : 200000;
while (Date.now() - start < limit) {
  await new Promise(r => setTimeout(r, mode === 'turbo' ? 500 : 3000));
  st = await page.evaluate(() => window.__game.state);
  if (mode !== 'turbo' && Date.now() - lastShot > 15000) { await page.screenshot({ path: `/tmp/ss/gametools/pt/L${level}_${botMode}_${i++}.png` }); lastShot = Date.now(); }
  if (st.phase === 'won' || st.phase === 'lost' || st.phase === 'menu') break;
  if (st.phase === 'clear' || st.phase === 'move') { /* stage transition */ }
}
await new Promise(r => setTimeout(r, 3500));
const res = await page.evaluate(() => ({ st: window.__game.state, shown: !document.getElementById('result').classList.contains('hidden') ? document.getElementById('rmsg').innerText : null, title: document.getElementById('rtitle')?.textContent }));
await page.screenshot({ path: `/tmp/ss/gametools/pt/L${level}_${botMode}_${mode}_end.png` });
console.log(JSON.stringify({ level, botMode, mode, phase: res.st.phase, stage: res.st.stage, lives: res.st.lives, maxArmy: Math.round(res.st.maxArmy), combo: res.st.bestCombo, guns: res.st.guns, power: res.st.power, twin: res.st.twin, bossHp: res.st.bossHp, time: res.st.time, title: res.title, msg: res.shown && res.shown.replace(/\n+/g,' | ').slice(0,300), log: res.st.log.map(l=>`s${l.stage}:${l.result}@${l.t}s lives${l.lives} army${Math.round(l.maxArmy)}`) }));
console.log(errs.slice(0,5).join('\n') || 'no console errors');
await browser.close();
