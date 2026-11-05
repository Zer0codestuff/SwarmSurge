import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
const logs = [];
page.on('console', m => { if (['error','warning'].includes(m.type())) logs.push(m.type()+': '+m.text()); });
page.on('pageerror', e => logs.push('PAGEERROR: '+e.message));
await page.goto('http://localhost:8000/index.html', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/smoke_menu.png' });
for (let L = 1; L <= 10; L++) for (let S = 1; S <= 3; S++) {
  await page.evaluate((L, S) => window.__game.start(L, S), L, S);
  await new Promise(r => setTimeout(r, 700));
  const st = await page.evaluate(() => window.__game.state);
  if (S === 1 || S === 3) await page.screenshot({ path: `/tmp/smoke_L${L}S${S}.png` });
  console.log(L, S, st.phase, 'gates', (await page.evaluate(() => window.__game.gates().length)), 'red', st.redUnits, 'fps', st.fps);
}
console.log(logs.slice(0, 30).join('\n') || 'no errors');
await browser.close();
