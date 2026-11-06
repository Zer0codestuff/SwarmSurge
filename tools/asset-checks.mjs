// Focused geometry and animation contracts for the procedural battlefield assets.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const executablePath = process.env.CHROME_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/chromium',
].find(path => fs.existsSync(path));
if (!executablePath) throw new Error('Set CHROME_PATH to a Chrome or Chromium executable.');
const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${process.env.GAME_URL || 'http://127.0.0.1:8000'}/index.html?turbo=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game, { polling: 100 });
  const report = await page.evaluate(async () => {
    const M = await import('/src/models.js'), L = await import('/src/bosses.js');
    const P = await import('/src/props.js'), THREE = await import('three');
    const { THEMES } = await import('/src/levels.js');
    const contracts = [
      ['king',2.8,8.8],['skeleton',2.7,10.5],['dragon',2.9,10.4],['golem',3,9.2],['brute',3.2,9.4],
      ['robot',3,9.8],['jelly',2.8,8.8],['moon',3,9.2],['storm',2.9,10.4],['titan',3.4,13.5],
      ['drill',3.4,9],['dice',3.2,9.5],['kraken',3.3,10],['pumpkin',3,11],['commander',3,10.4],
      ['spider',3.6,8.5],['magma',3.625,13],['pharaoh',2.9,10.6],['thunder',3.9,11.96],['emperor',4.06,12.76],
    ];
    const pose = group => {
      group.updateMatrixWorld(true);
      const values = []; group.traverse(o => values.push(...o.matrix.elements)); return values;
    };
    const different = (a, b) => a.some((v, i) => Math.abs(v - b[i]) > 1e-8);
    const inspect = group => {
      const stats = { meshes: 0, triangles: 0, lights: 0, finite: true, sharedMaterials: true };
      group.traverse(o => {
        if (o.isLight) stats.lights++;
        if (!o.isMesh) return;
        stats.meshes++; stats.triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
        for (const attribute of Object.values(o.geometry.attributes)) {
          if (!attribute.array.every(Number.isFinite)) stats.finite = false;
        }
        for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
          if (!material.transparent && !material.userData.shared) stats.sharedMaterials = false;
        }
      });
      return stats;
    };
    const dispose = group => {
      const geometries = new Set(), materials = new Set();
      group.traverse(o => {
        if (o.geometry && !o.geometry.userData.shared) geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) if (!m.userData.shared) materials.add(m);
      });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    };
    const bosses = contracts.map(([type,radius,height]) => {
      const m = L.buildBoss2(type) ?? M.buildBoss(type);
      const state = { moving: false, health: 1, hit: 0, stunned: false };
      m.animate(2,0,state);
      const neutral = pose(m.group), bounds = new THREE.Box3().setFromObject(m.group);
      const metadata = Math.abs(m.radius-radius)<1e-8 && Math.abs(m.height-height)<1e-8;
      m.animate(2,.45,{...state,moving:true,health:.3,hit:.4}); const attack = pose(m.group);
      m.animate(2,.45,{...state,moving:true,health:.3,hit:.4}); const repeated = pose(m.group);
      m.animate(7,.9,{...state,stunned:true}); const stunned = pose(m.group);
      const stats = inspect(m.group);
      const rootStable = m.group.position.length()===0 && m.group.rotation.x===0 && m.group.rotation.y===0 && m.group.rotation.z===0 && m.group.scale.equals(new THREE.Vector3(1,1,1));
      const pass = metadata && rootStable && stats.finite && stats.lights===0 && stats.meshes<=50 && stats.triangles<=18000 && neutral.every(Number.isFinite) && stunned.every(Number.isFinite) && !different(attack,repeated) && different(neutral,attack) && bounds.min.y>-.3 && bounds.max.y>height*.75 && bounds.max.y<height*1.15;
      dispose(m.group);
      return { type, pass, ...stats, bottom: bounds.min.y, top: bounds.max.y, height, metadata, rootStable, deterministic: !different(attack,repeated) };
    });
    const forts = Object.keys(THEMES).map(theme => {
      const m = M.buildTower(theme); m.animate?.(2,{health:.5,hit:.4});
      const bounds = new THREE.Box3().setFromObject(m.group), size = bounds.getSize(new THREE.Vector3()), stats = inspect(m.group);
      const pass = stats.finite && stats.lights===0 && size.x<=18.2 && bounds.min.y>=-.15 && bounds.max.y<9.1;
      dispose(m.group); return {theme,pass,...stats,size:size.toArray()};
    });
    const turret=M.buildTurret(), spawner=M.buildSpawner('igloo'), dome=M.buildSpawner('dome'), wall=M.buildWall(12), crusher=M.buildCrusher(4), pillar=P.buildPillar();
    const props = [turret.group,spawner.group,dome.group,wall,crusher.group,pillar.group].map(inspect);
    turret.head.rotation.y=.6; turret.animate?.(2,{fire01:1,health:.4,hit:.5});
    const turretYaw = turret.head.rotation.y===.6;
    const muzzle = turret.muzzle?.getWorldPosition(new THREE.Vector3());
    const propPass = props.every(x=>x.finite && x.lights===0) && turretYaw && muzzle?.toArray().every(Number.isFinite) && pillar.height===10 && crusher.shadow.material.transparent;
    [turret.group,spawner.group,dome.group,wall,crusher.group,pillar.group].forEach(dispose);
    return {bosses,forts,props,propPass};
  });
  for (const boss of report.bosses) console.log(`${boss.pass?'PASS':'FAIL'} ${boss.type}: ${boss.meshes} meshes, ${boss.triangles} triangles, top ${boss.top.toFixed(2)}/${boss.height}`);
  console.log(`${report.forts.every(f=>f.pass)?'PASS':'FAIL'} all twenty biome fort bounds`);
  console.log(`${report.propPass?'PASS':'FAIL'} defense and obstacle contracts`);
  fs.mkdirSync(new URL('./out/',import.meta.url),{recursive:true});
  fs.writeFileSync(new URL('./out/asset-checks.json',import.meta.url),JSON.stringify({...report,errors},null,2));
  if (errors.length || report.bosses.some(b=>!b.pass) || report.forts.some(f=>!f.pass) || !report.propPass) { console.error(errors.join('\n')); process.exitCode=1; }
} finally { await browser.close(); }
