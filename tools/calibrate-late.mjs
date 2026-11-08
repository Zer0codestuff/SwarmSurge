// Measures late-world (21-50) target damage curves with the smart bot and proposes stage HP.
// Each stage target absorbs damage without dying until a time cap, so one run gives the whole curve.
// Usage: CHROME_PATH=... GAME_URL=http://127.0.0.1:8000 node tools/calibrate-late.mjs --levels=21,22 [--write]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const option = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const levels = option('levels', Array.from({ length: 30 }, (_, i) => i + 21).join(',')).split(',').map(Number);
const seed = Number(option('seed', '42'));
const jobs = Number(option('jobs', '5'));
// Seconds of smart-bot damage after the army first reaches the target: two normal stages, then the boss.
// Openings vary with layout, so the window starts at first contact rather than at stage start.
const WINDOW = [8, 8, 16], CAP = [40, 40, 50];
const targetTime = (c) => { const first = c.pts.find(q => q[1] > 0); return Math.min(CAP[c.stage - 1] - 1, (first ? first[0] : CAP[c.stage - 1]) + WINDOW[c.stage - 1]); };
const executablePath = process.env.CHROME_PATH;
if (!executablePath) throw new Error('Set CHROME_PATH.');
const gameUrl = process.env.GAME_URL || 'http://127.0.0.1:8000';
const policySource = fs.readFileSync(new URL('./policies.js', import.meta.url), 'utf8');
const levelsFile = new URL('../src/levels3.js', import.meta.url);

async function worker(list) {
  const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 900000, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = [];
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', r => errors.push('request failed ' + r.url()));
    // The Python static server drops some connections when several browsers load at once.
    for (let attempt = 0; ; attempt++) {
      try { await page.goto(`${gameUrl}/index.html?turbo=1`, { waitUntil: 'domcontentloaded' }); break; }
      catch (error) { if (attempt >= 4) throw error; await new Promise(r => setTimeout(r, 500 + attempt * 700)); }
    }
    try { await page.waitForFunction(() => window.__game, { polling: 100, timeout: 60000 }); }
    catch (error) { error.message += '\n' + errors.join('\n'); throw error; }
    for (const level of list) {
      await page.evaluate(s => { let v = s >>> 0; Math.random = () => { v = (Math.imul(v, 1664525) + 1013904223) >>> 0; return v / 4294967296; }; }, seed);
      await page.addScriptTag({ content: policySource });
      const run = await page.evaluate(({ level, CAP }) => {
        const g = window.__game;
        g.start(level); g.pause(); g.setBot(() => window.__policies.smart(g));
        return g.dbg(`(() => {
          const CAP = ${JSON.stringify(CAP)}, curves = [];
          let stage = -1, acc = 0, T = null, curve = null, lost = 0, prevLives = G.lives;
          // Lethal hits before the cap are banked and refilled, so huge single blasts are measured too.
          const clear = stageCleared, defeat = bossDefeated;
          const bank = (S, T, end) => { if (S.time < CAP[S.i]) { acc += T.max - T.hp; T.hp = T.max; return true; } return false; };
          stageCleared = (S) => { if (!bank(S, S.tower)) clear(S); };
          bossDefeated = (S) => { if (!bank(S, S.boss)) defeat(S); };
          G.bot();
          for (let steps = 0; steps < 30000 && !['won', 'lost'].includes(G.phase); steps++) {
            step(STEP);
            if (G.lives < prevLives) lost += prevLives - G.lives;
            G.lives = Math.max(G.lives, 10); prevLives = G.lives;
            const S = G.stage;
            if (G.phase !== 'play') continue;
            if (S.i !== stage) {
              stage = S.i; T = S.tower || S.boss; acc = 0; lost = 0;
              curve = { stage: S.i + 1, nominal: T.max, pts: [] }; curves.push(curve);
            }
            if (!T.alive) continue;
            if (T.hp < T.max * 0.5) { acc += T.max - T.hp; T.hp = T.max; }
            if (steps % 30 === 0) curve.pts.push([+S.time.toFixed(2), acc + T.max - T.hp, G.army, lost]);
            curve.lost = lost;
            if (S.time >= CAP[S.i]) { curve.pts.push([+S.time.toFixed(2), acc + T.max - T.hp, G.army, lost]); T.hp = 0; }
          }
          return { phase: G.phase, curves };
        })()`);
      }, { level, CAP });
      if (errors.length) run.errors = errors.splice(0);
      out.push({ level, ...run });
      const s = run.curves.map(c => {
        const t = targetTime(c), p = c.pts.find(q => q[0] >= t) || c.pts[c.pts.length - 1];
        return `s${c.stage} t=${t.toFixed(1)} hp=${c.nominal.toExponential(2)} d=${p[1].toExponential(2)} lost=${p[3]}`;
      }).join(' | ');
      console.log(`L${level} ${run.phase} ${s}${run.errors ? ' ERR ' + run.errors.join('; ') : ''}`);
    }
  } finally { await browser.close(); }
  return out;
}

const chunks = Array.from({ length: Math.min(jobs, levels.length) }, () => []);
levels.forEach((l, i) => chunks[i % chunks.length].push(l));
const results = (await Promise.all(chunks.map(worker))).flat().sort((a, b) => a.level - b.level);
fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL(`./out/calibrate-late-${seed}.json`, import.meta.url), JSON.stringify(results));

const round3 = (v) => Number(v.toPrecision(3));
const proposals = {};
for (const r of results) {
  proposals[r.level] = r.curves.map((c) => {
    const t = targetTime(c), p = c.pts.find(q => q[0] >= t) || c.pts[c.pts.length - 1];
    // Geometric damping: obstacle costs follow the HP, so undamped updates can oscillate.
    const damp = Number(option('damp', '0.5'));
    return round3(Math.max(c.stage === 3 ? 20000 : 2000, c.nominal ** damp * Math.max(1, p[1]) ** (1 - damp)));
  });
}
console.log(JSON.stringify(proposals));
if (process.argv.includes('--write')) {
  let src = fs.readFileSync(levelsFile, 'utf8');
  const m = src.match(/const HP = \[\n([\s\S]*?)\n\];/);
  const rows = m[1].split('\n').flatMap(line => [...line.matchAll(/\[([^\]]+)\]/g)].map(x => x[1].split(',').map(Number)));
  for (const [level, hp] of Object.entries(proposals)) if (hp.length === 3) rows[level - 21] = hp;
  const fmt = (v) => v.toExponential(2).replace(/\.?0+e/, 'e').replace('e+', 'e');
  const body = rows.map((r, i) => `  [${r.map(fmt).join(', ')}], // ${i + 21}`).join('\n');
  src = src.replace(m[0], `const HP = [\n${body}\n];`);
  fs.writeFileSync(levelsFile, src);
  console.log('Wrote HP table');
}
