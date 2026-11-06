// Serve the game first. Reports compare policies without requiring every policy to win.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const option = (name, fallback) => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const levels = [...new Set(option('levels', Array.from({ length: 20 }, (_, i) => i + 1).join(',')).split(',').map(Number))];
const policies = [...new Set(option('policies', 'smart,naive,center').split(','))];
const seeds = [...new Set(option('seeds', '42').split(',').map(Number))];
if (!levels.length || levels.some(level => !Number.isInteger(level) || level < 1 || level > 20)) throw new Error('--levels must contain world numbers from 1 to 20.');
if (!policies.length || policies.some(policy => !['smart', 'naive', 'random', 'center'].includes(policy))) throw new Error('--policies must contain smart, naive, random or center.');
if (!seeds.length || seeds.some(seed => !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)) throw new Error('--seeds must contain unsigned 32-bit integers.');
const outDir = path.join(toolsDir, 'out');
const reportOption = option('report', 'out/balance.json');
const reportPath = path.resolve(reportOption.startsWith('tools/') ? path.dirname(toolsDir) : toolsDir, reportOption);
if (!reportPath.startsWith(outDir + path.sep) || !reportPath.endsWith('.json')) throw new Error('--report must be a JSON path inside tools/out.');
const executablePath = process.env.CHROME_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('Set CHROME_PATH to a Chrome or Chromium executable.');
const gameUrl = process.env.GAME_URL || 'http://127.0.0.1:8001';
const policySource = fs.readFileSync(path.join(toolsDir, 'policies.js'), 'utf8');
const report = {
  gameUrl, levels, policies, seeds,
  maxSimulatedSeconds: 180, aimSampleSeconds: 0.1, aimLaneWidth: 1,
  runs: [], errors: [],
};
const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 300000 });
try {
  const page = await browser.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(`${gameUrl}/index.html?turbo=1`, { waitUntil: 'domcontentloaded' });
  try { await page.waitForFunction(() => window.__game, { polling: 100 }); }
  catch (error) { if (report.errors.length) error.message += '\n' + report.errors.join('\n'); throw error; }
  for (const seed of seeds) for (const policy of policies) for (const level of levels) {
    await page.evaluate(seed => {
      let state = seed >>> 0;
      Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    }, seed);
    // Reinstall to reset policy hysteresis and timers for every independently seeded world.
    await page.addScriptTag({ content: policySource });
    const run = await page.evaluate(({ level, policy, seed }) => {
      const g = window.__game;
      g.start(level); g.pause(); g.setBot(() => window.__policies[policy](g));
      const measurement = g.dbg(`(() => {
        const stages = [], originalDamageCannon = damageCannon;
        let cannonDamageAttempted = 0, maxRedCount = R.n, longestAimHold = 0, steps = 0;
        let sampleStage = -1, lastLane = null, hold = 0;
        const stageStats = () => stages[G.stageIdx] ||= {
          stage: G.stageIdx + 1, bossAttacks: 0, maxRedCount: 0,
          cannonDamageAttempted: 0, longestAimHold: 0,
        };
        damageCannon = amount => {
          cannonDamageAttempted += amount;
          stageStats().cannonDamageAttempted += amount;
          return originalDamageCannon(amount);
        };
        try {
          G.bot();
          for (; steps < 10800 && !['won', 'lost'].includes(G.phase); steps++) {
            const before = G.stage, beforeIndex = G.stageIdx;
            step(STEP);
            const stats = stages[beforeIndex] ||= { stage: beforeIndex + 1, bossAttacks: 0, maxRedCount: 0, cannonDamageAttempted: 0, longestAimHold: 0 };
            stats.bossAttacks = Math.max(stats.bossAttacks, before.boss?.atkN || 0);
            if (G.stage === before) {
              stats.maxRedCount = Math.max(stats.maxRedCount, R.n);
              maxRedCount = Math.max(maxRedCount, R.n);
            }
            if ((steps + 1) % 6 !== 0) continue;
            if (G.phase !== 'play') { sampleStage = -1; lastLane = null; hold = 0; continue; }
            const lane = Math.round(G.aim);
            if (sampleStage !== G.stageIdx || lane !== lastLane) hold = 0;
            sampleStage = G.stageIdx; lastLane = lane; hold += 0.1;
            const current = stageStats();
            current.longestAimHold = Math.max(current.longestAimHold, hold);
            longestAimHold = Math.max(longestAimHold, hold);
          }
          return {
            result: ['won', 'lost'].includes(G.phase) ? G.phase : 'timeout',
            log: G.log.map(entry => ({ ...entry })), finalHearts: G.lives,
            finalStage: G.stageIdx + 1, finalStageTime: +G.stage.time.toFixed(1),
            simulatedSeconds: +(steps * STEP).toFixed(1),
            cannonDamageAttempted, maxRedCount, longestAimHold: +longestAimHold.toFixed(1),
            stages: stages.filter(Boolean).map(stage => ({ ...stage, longestAimHold: +stage.longestAimHold.toFixed(1) })),
          };
        } finally { damageCannon = originalDamageCannon; }
      })()`);
      return { level, policy, seed, ...measurement };
    }, { level, policy, seed });
    report.runs.push(run);
    console.log(`L${level} ${policy} seed=${seed} ${run.result} stages=${run.log.map(stage => stage.t).join('/')}s hearts=${run.finalHearts} attempted=${run.cannonDamageAttempted} bossAttacks=${run.stages.reduce((sum, stage) => sum + stage.bossAttacks, 0)} hold=${run.longestAimHold}s`);
    if (report.errors.length) throw new Error(report.errors.join('\n'));
  }
} catch (error) {
  report.errors.push(error.message);
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  console.log(`Report: ${reportPath}`);
}
