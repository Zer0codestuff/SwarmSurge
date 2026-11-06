// Serve the project first. CHROME_PATH overrides platform discovery.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const levelSelection = process.argv.find(arg => arg.startsWith('--levels='));
const campaignLevels = levelSelection ? [...new Set(levelSelection.slice(9).split(',').map(Number))] : Array.from({length:20},(_,i)=>i+1);
if (!campaignLevels.length || campaignLevels.some(level => !Number.isInteger(level) || level < 1 || level > 20)) throw new Error('--levels must contain world numbers from 1 to 20.');
const executablePath = process.env.CHROME_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(path => fs.existsSync(path));
if (!executablePath) throw new Error('Set CHROME_PATH to a Chrome or Chromium executable.');
const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${process.env.GAME_URL || 'http://127.0.0.1:8000'}/index.html?turbo=1`, { waitUntil: 'domcontentloaded' });
  // Engine readiness is independent of animation-frame scheduling and later page loads.
  try { await page.waitForFunction(() => window.__game, { polling: 100 }); }
  catch (error) { if (errors.length) error.message += '\n' + errors.join('\n'); throw error; }
  await page.addScriptTag({ content: fs.readFileSync(new URL('./checks.js', import.meta.url), 'utf8') });
  const results = await page.evaluate(() => window.runGameChecks(window.__game));
  for (const result of results) console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}${result.pass ? '' : ' ' + JSON.stringify(result)}`);
  if (errors.length) console.error(errors.join('\n'));
  if (results.some(result => !result.pass) || errors.length) process.exitCode = 1;
  if (process.argv.includes('--campaign') || levelSelection) {
    await page.addScriptTag({ content: fs.readFileSync(new URL('./policies.js', import.meta.url), 'utf8') });
    const campaign = await page.evaluate((levels) => {
      const g = window.__game, runs = [];
      let seed = 42;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      for (const level of levels) {
        g.start(level); g.pause(); g.setBot(() => window.__policies.smart(g));
        g.dbg('G.bot(); for(let i=0;i<9000 && !["won","lost"].includes(G.phase);i++) step(STEP)');
        const s = g.state;
        runs.push({ level, result: s.phase, times: s.log.map(x => x.t), lives: s.lives, maxArmy: s.maxArmy, blue: s.blueUnits });
      }
      return runs;
    },campaignLevels);
    for (const run of campaign) console.log(`L${run.level} ${run.result} stages=${run.times.join('/')}s hearts=${run.lives}`);
    fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
    const report = campaignLevels.length === 20 && campaignLevels.every((level,i)=>level===i+1) ? 'campaign.json' : `campaign-${campaignLevels.join('-')}.json`;
    fs.writeFileSync(new URL('./out/'+report, import.meta.url), JSON.stringify(campaign, null, 2));
    if (campaign.some(run => run.result !== 'won') || errors.length) process.exitCode = 1;
  }
} finally { await browser.close(); }
