import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// The browser sources are ES modules without a root package.json.
const source = await readFile(new URL('../src/tutorials.js', import.meta.url), 'utf8');
const { createTutorials, TUTORIAL_STORAGE_KEY } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    values, writes,
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { values.set(key, value); writes.push(key); },
  };
}

const supply = { t: 'upgrade', up: 'blaster' };
const chain = [{ t: 'mul', v: 2 }, { t: 'mul', v: 3 }];
const firstStage = { gates: [supply, ...chain] };
const select = (tutorials, levelIndex, stageIndex, stage = firstStage, options = {}) =>
  tutorials.stageTip({ stage, levelIndex, stageIndex, ...options });
let passed = 0;
function check(name, run) {
  run(); passed++;
  console.log(`PASS ${name}`);
}

check('Aiming is selected once and leaves other lessons unseen', () => {
  const storage = fakeStorage(), tutorials = createTutorials(storage);
  assert.equal(select(tutorials, 0, 0)?.id, 'aim');
  assert.equal(tutorials.hasSeen('aim'), true);
  for (const id of ['chain', 'equipment', 'movement']) assert.equal(tutorials.hasSeen(id), false);
  assert.equal(select(tutorials, 0, 0), null);
  assert.equal(select(createTutorials(storage), 0, 0), null);
});

check('One lesson per stage survives retries and replays', () => {
  const storage = fakeStorage(), tutorials = createTutorials(storage);
  assert.equal(select(tutorials, 0, 0)?.id, 'aim');
  assert.equal(select(tutorials, 0, 1)?.id, 'chain');
  assert.equal(select(tutorials, 0, 1), null);
  assert.equal(tutorials.hasSeen('equipment'), false);
  assert.equal(select(tutorials, 0, 2)?.id, 'equipment');
  const reloaded = createTutorials(storage);
  for (let stage = 0; stage < 3; stage++) assert.equal(select(reloaded, 0, stage), null);
});

check('Saved progress skips basic onboarding and remains unchanged', () => {
  const progress = JSON.stringify({ stars: [3, 2] });
  const storage = fakeStorage({ 'swarm-progress': progress, 'swarm-muted': 'true' });
  const tutorials = createTutorials(storage);
  for (let stage = 0; stage < 3; stage++) assert.equal(select(tutorials, 0, stage), null);
  assert.equal(select(tutorials, 2, 0), null);
  assert.equal(storage.values.get('swarm-progress'), progress);
  assert.equal(storage.values.get('swarm-muted'), 'true');
  assert.deepEqual(storage.writes, []);
  assert.equal(tutorials.hasSeen('aim'), false);
});

check('Explicit progress overrides a stale stored save', () => {
  const storage = fakeStorage({ 'swarm-progress': JSON.stringify({ stars: [3] }) });
  const tutorials = createTutorials(storage);
  assert.equal(select(tutorials, 0, 0, firstStage, { progress: { stars: [] } })?.id, 'aim');
});

check('Advanced equipment does not restart basic lessons', () => {
  const tutorials = createTutorials(fakeStorage());
  for (const up of ['blaster', 'rockets', 'arc', 'scatter', 'rail', 'flame', 'frost', 'plasma', 'tank', 'air'])
    assert.equal(select(tutorials, 10, 0, { gates: [{ t: 'upgrade', up }, ...chain] }), null);
  assert.equal(tutorials.hasSeen('equipment'), false);
});

check('Movement gate variants share one short lesson', () => {
  const storage = fakeStorage(), tutorials = createTutorials(storage);
  const tip = select(tutorials, 6, 0, { gates: [{ t: 'portal' }] });
  assert.equal(tip?.id, 'movement');
  assert.match(tip.text, /Portals/);
  assert.equal(select(tutorials, 6, 0, { gates: [{ t: 'portal' }] }), null);
  assert.equal(select(tutorials, 12, 0, { gates: [{ t: 'jump' }] }), null);
  assert.equal(select(createTutorials(storage), 16, 0, { gates: [{ t: 'loop' }] }), null);
});

check('Unshown movement stays available after a higher priority lesson', () => {
  const tutorials = createTutorials(fakeStorage());
  const stage = { gates: [...firstStage.gates, { t: 'portal' }] };
  assert.equal(select(tutorials, 0, 0, stage)?.id, 'aim');
  assert.equal(tutorials.hasSeen('movement'), false);
  assert.equal(select(tutorials, 0, 0, stage), null);
  assert.equal(select(tutorials, 6, 0, { gates: [{ t: 'portal' }] })?.id, 'movement');
});

check('Old saves past movement gates do not receive that lesson again', () => {
  for (const stars of [[0, 0, 0, 0, 0, 0, 3], [...Array(19).fill(0), 1]]) {
    const tutorials = createTutorials(fakeStorage());
    assert.equal(select(tutorials, 12, 0, { gates: [{ t: 'jump' }] }, { progress: { stars } }), null);
    assert.equal(tutorials.hasSeen('movement'), false);
  }
});

check('Late mechanics each teach one lesson at their first appearance', () => {
  const storage = fakeStorage(), tutorials = createTutorials(storage);
  const stages = [
    [20, 'bumper', { bumpers: [{ x: 0, d: 15 }], gates: [] }],
    [25, 'hypno', { gates: [{ t: 'hypno' }] }],
    [30, 'cart', { carts: [{ x: 0, d1: 10, d2: 30 }], gates: [] }],
    [35, 'bank', { gates: [{ t: 'bank' }] }],
    [40, 'egg', { eggs: [{ x: 0, d: 20 }], gates: [] }],
    [45, 'fusion', { fusion: [{ d: 20, x1: -3, x2: 3 }], gates: [] }],
  ];
  for (const [level, id, stage] of stages) {
    assert.equal(select(tutorials, level, 0, stage)?.id, id);
    assert.equal(select(tutorials, level, 1, stage), null);
  }
  const reloaded = createTutorials(storage);
  for (const [level, , stage] of stages) assert.equal(select(reloaded, level + 1, 0, stage), null);
});

check('Saves past a late mechanic skip its lesson but keep later ones', () => {
  const tutorials = createTutorials(fakeStorage());
  const progress = { stars: [...Array(21).fill(3)] };
  assert.equal(select(tutorials, 21, 0, { bumpers: [{ x: 0, d: 15 }], gates: [] }, { progress }), null);
  assert.equal(tutorials.hasSeen('bumper'), false);
  assert.equal(select(tutorials, 25, 0, { gates: [{ t: 'hypno' }] }, { progress })?.id, 'hypno');
});

check('Debug stage selection neither shows nor consumes a tutorial', () => {
  const storage = fakeStorage(), tutorials = createTutorials(storage);
  assert.equal(select(tutorials, 0, 0, firstStage, { debug: true }), null);
  assert.equal(select(tutorials, 16, 0, { gates: [{ t: 'loop' }] }, { debug: true }), null);
  assert.deepEqual(storage.writes, []);
  assert.equal(select(tutorials, 0, 0)?.id, 'aim');
});

check('Malformed tutorial and progress saves do not block first launch', () => {
  for (const value of ['{', 'null', '[]', '{"version":1,"seen":{},"stages":true}', '{"version":99,"seen":["aim"]}']) {
    const storage = fakeStorage({ [TUTORIAL_STORAGE_KEY]: value, 'swarm-progress': '{' });
    assert.equal(select(createTutorials(storage), 0, 0)?.id, 'aim');
  }
});

check('Only recognized lessons and valid stage records are loaded', () => {
  const storage = fakeStorage({ [TUTORIAL_STORAGE_KEY]: JSON.stringify({
    version: 1, seen: ['unknown', null, 'aim'], stages: [false, {}, 'bad', '0:1'],
  }) });
  const tutorials = createTutorials(storage);
  assert.equal(tutorials.hasSeen('unknown'), false);
  assert.equal(tutorials.hasSeen('aim'), true);
  assert.equal(select(tutorials, 0, 1), null);
  assert.equal(select(tutorials, 0, 2)?.id, 'chain');
});

check('Unavailable storage preserves the policy in memory', () => {
  for (const storage of [null, {}, {
    getItem() { throw new Error('Storage blocked'); },
    setItem() { throw new Error('Storage blocked'); },
  }]) {
    const tutorials = createTutorials(storage);
    assert.equal(select(tutorials, 0, 0)?.id, 'aim');
    assert.equal(select(tutorials, 0, 0), null);
    assert.equal(select(tutorials, 0, 1)?.id, 'chain');
  }
});

check('A blocked localStorage getter is safe', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Access denied'); } });
    assert.equal(select(createTutorials(), 0, 0)?.id, 'aim');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});

check('Dismissed lessons persist without consuming other lessons', () => {
  const storage = fakeStorage(), tutorials = createTutorials(storage);
  assert.equal(tutorials.dismiss({ id: 'aim' }), true);
  assert.equal(tutorials.markSeen('unknown'), false);
  const reloaded = createTutorials(storage);
  assert.equal(reloaded.hasSeen('aim'), true);
  assert.equal(reloaded.hasSeen('equipment'), false);
  assert.equal(select(reloaded, 0, 0)?.id, 'chain');
  assert.ok(storage.writes.every(key => key === TUTORIAL_STORAGE_KEY));
});

check('Built stages use their stage index and invalid requests are ignored', () => {
  const tutorials = createTutorials(fakeStorage());
  assert.equal(tutorials.stageTip(), null);
  assert.equal(select(tutorials, -1, 0), null);
  assert.equal(select(tutorials, 0, 0.5), null);
  assert.equal(tutorials.stageTip({ stage: { i: 1, def: firstStage }, levelIndex: 0 })?.id, 'chain');
});

console.log(`${passed} tutorial policy checks passed.`);
