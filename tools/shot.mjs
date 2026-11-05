import puppeteer from 'puppeteer-core';
const [,, url, out, w='390', h='844', wait='3000', script=''] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new',
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1, isMobile: +w < +h, hasTouch: +w < +h });
const logs = [];
page.on('console', m => { if (['error','warning'].includes(m.type())) logs.push(m.type()+': '+m.text()); });
page.on('pageerror', e => logs.push('PAGEERROR: '+e.message));
await page.goto(url, { waitUntil: 'load' });
if (script) { const r = await page.evaluate(script); if (r !== undefined) console.log('EVAL:', JSON.stringify(r)); }
await new Promise(r => setTimeout(r, +wait));
await page.screenshot({ path: out });
const st = await page.evaluate(() => window.__game && window.__game.state);
console.log('STATE:', JSON.stringify(st));
console.log(logs.slice(0, 20).join('\n') || 'no errors');
await browser.close();
