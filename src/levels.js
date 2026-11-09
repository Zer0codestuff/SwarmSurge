// Level data. Distances `d` are measured forward from the cannon (0) toward the enemy fort (58).
// Road usable width is x in [-6.45, 6.45].
//
// Every unit carries POWER (its hp). Gates multiply power, so gates stacked in a row multiply
// each other: x2 then x3 then x4 = x24. When too many units are on screen the extra power is
// folded into existing units, which grow bigger and glow (gold, then pink).
//
// Gate types:
//   mul  xN   – power x N (spawns copies)             add  +N  – power x (N+1) (one +N per unit)
//   div  ÷N   – bad gate                              flip     – alternates gate `a` / `b` every `period` s
//   charge    – starts at x`v`, grows +1 for every `per` power fed through it, up to x`max`
//   barrier / ice / fence / statue – blockers: absorb `hp` power, then break
//   upgrade   – absorbs `need` power, then upgrades the cannon for the rest of the level
//               (`up`: barrel = +1 gun, rapid = faster fire, power = shots x3, twin = mirrored twin cannon)
//   nuke      – absorbs `need` power, then wipes every red unit and blasts `dmg` of the fort/boss max hp
//   star      – absorbs `need` power, then DOUBLES every multiplier gate of the stage (and the army on
//               screen). Refillable, but each refill costs 3x more
//   portal    – teleports units to `to: { x, d }`
// Other stage parts: walls, saws, crushers, turrets, spawners, horde (sleeping red army), boss/tower.

import { prepareCampaign } from './campaign.js';
import { ladder, stack } from './levelkit.js';
import { MORE_LEVELS } from './levels2.js';
import { LATE_LEVELS } from './levels3.js';
import { LATE_PALETTES } from './biomes-late.js';

export const LEVELS = prepareCampaign([
  // ------------------------------------------------------------------ 1
  {
    name: 'Sunny Speedway',
    theme: 'desert',
    threat: 0.7,
    feature: 'Sliding gates',
    blurb: 'Gates glide across the road. Chain x3 into the tiny gold x5 for a x15 combo!',
    enemy: 'Brutes: big yellow bruisers',
    stages: [
      {
        tip: 'Drag to aim. Shoot through gates in a row: their numbers multiply!',
        tower: 450,
        waves: { every: 3.0, swarm: 6, ramp: 0.4, brute: { every: 4, hp: 10 } },
        gates: [
          { t: 'mul', v: 2, x: -3.4, d: 15, w: 5.2 },
          { t: 'mul', v: 3, x: 3.6, d: 15, w: 3.4 },
          { t: 'mul', v: 2, x: 0, d: 27, w: 3.4, slide: { amp: 4.2, speed: 0.9 } },
          { t: 'mul', v: 5, x: 5.55, d: 35, w: 1.7, color: 'gold' },
        ],
      },
      {
        tip: 'Gold gates eat units but upgrade your cannon for the whole level.',
        tower: 2000,
        waves: { every: 3.0, swarm: 7, ramp: 0.4, brute: { every: 3, hp: 16 } },
        walls: [{ x: 0, d1: 10, d2: 36 }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 15, w: 5.6 },
          { t: 'mul', v: 3, x: -3.3, d: 27, w: 2.6, slide: { amp: 2.3, speed: 1.1 } },
          { t: 'upgrade', up: 'barrel', need: 25, x: 3.3, d: 13, w: 5.6 },
          { t: 'mul', v: 2, x: 3.3, d: 22, w: 5.6 },
          { t: 'mul', v: 3, x: 3.3, d: 30, w: 5.6 },
          { t: 'mul', v: 4, x: 3.3, d: 34.5, w: 2.0, color: 'gold', slide: { amp: 1.7, speed: 1.3 } },
        ],
      },
      {
        tip: 'Crack the red barrier to open the x10 gate behind it!',
        boss: { type: 'king', hp: 4000, speed: 0.4 },
        waves: { every: 3.4, swarm: 7, ramp: 0.35, brute: { every: 3, hp: 10 } },
        gates: [
          { t: 'mul', v: 2, x: -4.6, d: 14, w: 3.6 },
          { t: 'upgrade', up: 'rapid', need: 30, x: 0, d: 11, w: 2.8 },
          { t: 'add', v: 2, x: 4.6, d: 14, w: 3.6 },
          { t: 'barrier', hp: 40, x: 0, d: 17, w: 3.2 },
          { t: 'mul', v: 10, x: 0, d: 22, w: 3.2, mega: true },
          { t: 'mul', v: 3, x: 0, d: 27, w: 3.2 },
          { t: 'mul', v: 2, x: 0, d: 33, w: 3.0, slide: { amp: 4.6, speed: 0.8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 2 (recreates the reference screenshots)
  {
    name: 'Mob Rush',
    theme: 'mob',
    threat: 0.9,
    feature: 'Multiplier ladders & the x100 gate',
    blurb: 'Smash the chain fence and climb a ladder from x5 to x22. Line up the +1 column with x100!',
    enemy: 'Mega brutes (500 / 600 / 1500) and a red sea',
    stages: [
      {
        tip: 'Go through x2 x3 x4 AND hit the fence at the same time, then climb the ladder!',
        tower: 60000,
        waves: { every: 3.6, swarm: 5, ramp: 0.3 },
        walls: [{ x: 1.75, d1: 14.5, d2: 52 }],
        gates: [
          ...stack('add', 1, -5.25, 8, 8, 1.7, 2.2),
          { t: 'mul', v: 2, x: 0, d: 9, w: 5.6 },
          { t: 'mul', v: 3, x: 0, d: 10.7, w: 5.6 },
          { t: 'mul', v: 4, x: 0, d: 12.4, w: 5.6 },
          { t: 'fence', hp: 500, x: 4.2, d: 15, w: 4.4 },
          ...ladder(4.2, 18.5, 5, 22, 1.55, 4.3),
        ],
        horde: [{ x: -2.3, w: 7.4, d1: 27, d2: 54, n: 220, brutes: [{ x: -2.6, d: 31, hp: 500 }, { x: -3.2, d: 40, hp: 600 }, { x: -2.0, d: 50, hp: 1500 }] }],
      },
      {
        tip: 'The +1 column stacks to x1024. Line it up with the giant x100!',
        tower: 1500000,
        waves: { every: 3.2, swarm: 8, ramp: 0.4 },
        walls: [{ x: 2.95, d1: 10, d2: 40 }],
        gates: [
          ...stack('add', 1, -5.3, 6, 10, 1.5, 2.1),
          { t: 'mul', v: 3, x: -0.6, d: 14, w: 4.4 },
          { t: 'mul', v: 4, x: -0.6, d: 18, w: 4.4 },
          { t: 'mul', v: 100, x: -1.7, d: 27, w: 9.2, mega: true },
          { t: 'statue', hp: 99, x: 4.7, d: 13, w: 3.1, small: true },
          { t: 'statue', hp: 599, x: 4.7, d: 18.5, w: 3.1 },
          { t: 'mul', v: 9, x: 4.7, d: 26, w: 3.1, color: 'gold' },
          { t: 'mul', v: 9, x: 4.7, d: 29.5, w: 3.1, color: 'gold' },
        ],
        horde: [
          { x: -1.7, w: 8.6, d1: 21, d2: 25, n: 70 },
          { x: 0, w: 12.4, d1: 33, d2: 54, n: 380, hp: 2 },
        ],
        spawners: [
          { x: 4.6, d: 46, hp: 500, every: 3.0, n: 4, style: 'dome' },
          { x: 1.0, d: 50, hp: 500, every: 3.0, n: 4, style: 'dome' },
        ],
      },
      {
        tip: 'BOSS! Chase the x3 into the fence for the x4..x10 ladder. DODGE the fire!',
        boss: { type: 'skeleton', hp: 300e6, speed: 0.38, every: 3.4, sweep: true },
        fort: 9999,
        waves: { every: 4.2, swarm: 4, ramp: 0.25 },
        walls: [{ x: -1.9, d1: 18, d2: 40 }, { x: 3.2, d1: 18, d2: 40 }],
        gates: [
          { t: 'upgrade', up: 'rapid', need: 25, x: -4.6, d: 10, w: 3.2 },
          { t: 'upgrade', up: 'barrel', need: 30, x: 4.8, d: 10, w: 3.0 },
          { t: 'mul', v: 3, x: 0.65, d: 14, w: 3.2, slide: { amp: 2.2, speed: 0.7 } },
          // middle lane: chain fence, then the ladder
          { t: 'fence', hp: 300, x: 0.65, d: 20, w: 4.9 },
          ...ladder(0.65, 23, 4, 10, 2, 4.9),
          // left lane: charge gate behind a swinging saw
          { t: 'charge', v: 2, max: 30, per: 40, x: -4.2, d: 26, w: 4.3 },
          { t: 'mul', v: 2, x: -4.2, d: 32, w: 4.3 },
          // right lane: double gold x10 inside the marching red column
          { t: 'mul', v: 10, x: 4.85, d: 24, w: 3.1, color: 'gold' },
          { t: 'mul', v: 10, x: 4.85, d: 32, w: 3.1, color: 'gold' },
        ],
        saws: [{ x: -4.2, d: 22, r: 1.0, slide: { amp: 1.5, speed: 1.6 } }],
        horde: [{ x: 4.9, w: 2.6, d1: 22, d2: 78, n: 160, march: true, rate: 1.0 }],
      },
    ],
  },
  // ------------------------------------------------------------------ 3
  {
    name: 'Lava Gorge',
    theme: 'lava',
    threat: 1.0,
    feature: 'Saws, barriers & POWER x3',
    blurb: 'Spinning saws shred units. Grab POWER x3 early: every shot after it counts triple!',
    enemy: 'Bombers: explode when they die',
    stages: [
      {
        tip: 'POWER x3 triples every unit you fire for the rest of the level!',
        tower: 3000,
        waves: { every: 3.0, swarm: 7, bomber: 2, ramp: 0.4 },
        walls: [{ x: 0, d1: 10, d2: 38 }],
        gates: [
          { t: 'upgrade', up: 'power', need: 40, x: -3.3, d: 12, w: 5.6 },
          { t: 'add', v: 1, x: -3.3, d: 22, w: 5.6 },
          { t: 'mul', v: 2, x: -3.3, d: 29, w: 5.6 },
          { t: 'mul', v: 3, x: -3.3, d: 35, w: 5.6, color: 'gold' },
          { t: 'mul', v: 3, x: 3.3, d: 24, w: 5.6 },
          { t: 'mul', v: 3, x: 3.3, d: 31, w: 5.6 },
        ],
        saws: [{ x: 3.3, d: 17, r: 1.1, slide: { amp: 2.2, speed: 1.4 } }],
      },
      {
        tip: 'Barriers hide huge gates. Break them with a multiplied stream!',
        tower: 15000,
        waves: { every: 3.2, swarm: 8, bomber: 2, ramp: 0.4, brute: { every: 3, hp: 20 } },
        walls: [{ x: -2.2, d1: 10, d2: 38 }, { x: 2.2, d1: 10, d2: 38 }],
        gates: [
          { t: 'barrier', hp: 70, x: -4.45, d: 13, w: 4.1 },
          { t: 'mul', v: 5, x: -4.45, d: 21, w: 4.1 },
          { t: 'mul', v: 3, x: -4.45, d: 27, w: 4.1 },
          { t: 'barrier', hp: 300, x: -4.45, d: 31, w: 4.1 },
          { t: 'mul', v: 10, x: -4.45, d: 35.5, w: 4.1, mega: true },
          { t: 'mul', v: 2, x: 0, d: 15, w: 3.9 },
          { t: 'mul', v: 4, x: 0, d: 29, w: 3.9 },
          { t: 'upgrade', up: 'barrel', need: 40, x: 4.45, d: 14, w: 4.1 },
          { t: 'mul', v: 2, x: 4.45, d: 24, w: 4.1 },
          { t: 'mul', v: 2, x: 4.45, d: 30, w: 4.1 },
        ],
        saws: [{ x: 0, d: 22, r: 0.95, slide: { amp: 0.9, speed: 2.0 } }],
      },
      {
        tip: 'Lava Dragon! Barrier, x6, x2..x5, then dodge the saw into x20!',
        boss: { type: 'dragon', hp: 1500000, speed: 0.48 },
        waves: { every: 3.2, swarm: 10, bomber: 3, ramp: 0.4 },
        gates: [
          { t: 'upgrade', up: 'rapid', need: 40, x: -4.6, d: 10, w: 3.4 },
          { t: 'mul', v: 2, x: -4.6, d: 18, w: 3.4 },
          { t: 'barrier', hp: 150, x: 0, d: 12, w: 4.4 },
          { t: 'mul', v: 6, x: 0, d: 18, w: 4.4, mega: true },
          ...ladder(0, 22.5, 2, 5, 1.5, 4.4),
          { t: 'barrier', hp: 4000, x: 0, d: 29.5, w: 4.4 },
          { t: 'mul', v: 20, x: 0, d: 35, w: 4.4, mega: true },
          { t: 'mul', v: 3, x: 4.6, d: 16, w: 3.4 },
        ],
        saws: [{ x: 0, d: 32, r: 1.2, slide: { amp: 5.4, speed: 0.7 } }],
      },
    ],
  },
  // ------------------------------------------------------------------ 4
  {
    name: 'Frost Fortress',
    theme: 'frost',
    threat: 1.25,
    feature: 'Flip gates & ice vaults',
    blurb: 'Flip gates swap between great and terrible. Smash ice vaults to unlock mega gates!',
    enemy: 'Shielders and igloo spawners',
    stages: [
      {
        tip: 'Flip gates switch between x4 and ÷2. Time your stream!',
        tower: 4000,
        waves: { every: 3.0, swarm: 8, shielder: 1, ramp: 0.4 },
        gates: [
          { t: 'mul', v: 2, x: -4.6, d: 17, w: 3.4 },
          { t: 'flip', a: { t: 'mul', v: 4 }, b: { t: 'div', v: 2 }, period: 2.0, x: 0, d: 17, w: 3.4 },
          { t: 'ice', hp: 60, x: 4.6, d: 12, w: 3.4 },
          { t: 'mul', v: 10, x: 4.6, d: 19, w: 3.4, mega: true },
          { t: 'flip', a: { t: 'mul', v: 3 }, b: { t: 'div', v: 2 }, period: 1.6, x: 4.6, d: 27, w: 3.4 },
        ],
      },
      {
        tip: 'An ice vault guards a x20 gate. Feed it a big stream!',
        tower: 20000,
        waves: { every: 3.0, swarm: 9, shielder: 2, ramp: 0.45 },
        walls: [{ x: 0, d1: 10, d2: 36 }],
        gates: [
          { t: 'upgrade', up: 'barrel', need: 40, x: -3.3, d: 13, w: 5.6 },
          { t: 'mul', v: 3, x: -3.3, d: 22, w: 5.6 },
          { t: 'mul', v: 2, x: -3.3, d: 30, w: 5.6 },
          { t: 'flip', a: { t: 'mul', v: 5 }, b: { t: 'div', v: 2 }, period: 1.8, x: 3.3, d: 15, w: 5.6 },
          { t: 'ice', hp: 180, x: 3.3, d: 22, w: 5.6 },
          { t: 'mul', v: 20, x: 3.3, d: 29, w: 5.6, mega: true },
        ],
        spawners: [
          { x: -4.4, d: 43, hp: 300, every: 2.6, n: 3 },
          { x: 4.4, d: 43, hp: 300, every: 2.6, n: 3 },
        ],
      },
      {
        tip: 'Ice Golem! POWER x3, smash the ice for x10 x5... and x25 deeper!',
        boss: { type: 'golem', hp: 400000, speed: 0.5 },
        waves: { every: 3.2, swarm: 10, shielder: 3, ramp: 0.4 },
        gates: [
          { t: 'upgrade', up: 'power', need: 50, x: -4.7, d: 11, w: 3.2 },
          { t: 'mul', v: 2, x: -4.7, d: 18, w: 3.2 },
          { t: 'upgrade', up: 'rapid', need: 120, x: -4.7, d: 26, w: 3.2 },
          { t: 'ice', hp: 300, x: 0, d: 13, w: 4.6 },
          { t: 'mul', v: 10, x: 0, d: 19, w: 4.6, mega: true },
          { t: 'mul', v: 5, x: 0, d: 24, w: 4.6, color: 'gold' },
          { t: 'flip', a: { t: 'mul', v: 4 }, b: { t: 'div', v: 2 }, period: 1.5, x: 0, d: 28, w: 4.6 },
          { t: 'ice', hp: 3000, x: 0, d: 32, w: 4.6 },
          { t: 'mul', v: 25, x: 0, d: 37, w: 4.6, mega: true },
          { t: 'flip', a: { t: 'mul', v: 3 }, b: { t: 'div', v: 2 }, period: 2.0, x: 4.7, d: 16, w: 3.2 },
          { t: 'mul', v: 3, x: 4.7, d: 24, w: 3.2 },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 5
  {
    name: 'Jungle Stampede',
    theme: 'jungle',
    threat: 1.45,
    feature: 'Charge gates',
    blurb: 'Green charge gates start weak but grow +1 for every unit you feed them. Invest early!',
    enemy: 'Runners: fast orange sprinters',
    stages: [
      {
        tip: 'Feed the green CHARGE gate: it grows from x1 up to x10!',
        tower: 3500,
        waves: { every: 3.0, swarm: 6, runner: 4, ramp: 0.4 },
        gates: [
          { t: 'mul', v: 2, x: -4.6, d: 15, w: 3.2 },
          { t: 'charge', v: 1, max: 10, per: 12, x: 0, d: 17, w: 4.0 },
          { t: 'add', v: 3, x: 4.6, d: 15, w: 3.2 },
          { t: 'mul', v: 2, x: 0, d: 28, w: 4.0 },
        ],
      },
      {
        tip: 'Two charge gates in one lane = a monster combo. Be patient!',
        tower: 50000,
        waves: { every: 3.0, swarm: 8, runner: 6, ramp: 0.45, brute: { every: 4, hp: 40 } },
        walls: [{ x: 0, d1: 10, d2: 38 }],
        gates: [
          { t: 'charge', v: 1, max: 20, per: 20, x: -3.3, d: 14, w: 5.6 },
          { t: 'mul', v: 2, x: -3.3, d: 23, w: 5.6 },
          { t: 'charge', v: 1, max: 8, per: 60, x: -3.3, d: 31, w: 5.6 },
          { t: 'upgrade', up: 'barrel', need: 40, x: 3.3, d: 13, w: 5.6 },
          { t: 'mul', v: 3, x: 3.3, d: 23, w: 5.6 },
          { t: 'mul', v: 2, x: 3.3, d: 30, w: 5.6 },
        ],
      },
      {
        tip: 'The Mega Brute! POWER x3 + charge gates = unstoppable!',
        boss: { type: 'brute', hp: 3000000, speed: 0.5 },
        waves: { every: 3.0, swarm: 10, runner: 8, ramp: 0.4, brute: { every: 3, hp: 60 } },
        gates: [
          { t: 'upgrade', up: 'power', need: 50, x: -4.6, d: 11, w: 3.4 },
          { t: 'mul', v: 2, x: -4.6, d: 19, w: 3.4 },
          { t: 'charge', v: 2, max: 25, per: 40, x: 0, d: 14, w: 4.4 },
          { t: 'charge', v: 1, max: 12, per: 200, x: 0, d: 22, w: 4.4 },
          { t: 'mul', v: 3, x: 0, d: 28, w: 4.4 },
          { t: 'fence', hp: 15000, x: 0, d: 32, w: 4.4 },
          { t: 'mul', v: 30, x: 0, d: 37, w: 4.4, mega: true },
          { t: 'mul', v: 2, x: 4.6, d: 15, w: 3.4 },
          { t: 'upgrade', up: 'rapid', need: 80, x: 4.6, d: 24, w: 3.4 },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 6
  {
    name: 'Neon Nights',
    theme: 'neon',
    threat: 1.6,
    feature: 'Nuke gates & laser turrets',
    blurb: 'Fill a NUKE gate to wipe every enemy on screen. Laser turrets snipe your units!',
    enemy: 'Tanks: slow, armored, hit hard',
    stages: [
      {
        tip: 'Fill the NUKE gate to wipe the screen and blast the fort!',
        tower: 4200,
        waves: { every: 3.0, swarm: 8, tank: { every: 3, hp: 30 }, ramp: 0.4 },
        gates: [
          { t: 'mul', v: 2, x: -4.6, d: 14, w: 3.4 },
          { t: 'mul', v: 3, x: -4.6, d: 24, w: 3.4 },
          { t: 'nuke', need: 60, dmg: 0.45, x: 0, d: 16, w: 3.6 },
          ...ladder(4.6, 19, 2, 4, 2.2, 3.4),
        ],
        turrets: [{ x: 4.6, d: 32, hp: 120, every: 0.9 }],
      },
      {
        tip: 'Destroy the turret guarding the x2..x6 ladder!',
        tower: 300000,
        waves: { every: 3.0, swarm: 10, tank: { every: 2, hp: 40 }, ramp: 0.45 },
        walls: [{ x: -2.2, d1: 10, d2: 40 }, { x: 2.2, d1: 10, d2: 40 }],
        gates: [
          { t: 'upgrade', up: 'barrel', need: 50, x: -4.45, d: 13, w: 4.1 },
          { t: 'mul', v: 3, x: -4.45, d: 22, w: 4.1 },
          { t: 'mul', v: 3, x: -4.45, d: 29, w: 4.1 },
          { t: 'nuke', need: 150, dmg: 0.4, x: 0, d: 14, w: 3.9 },
          { t: 'mul', v: 2, x: 0, d: 24, w: 3.9 },
          ...ladder(4.45, 17, 2, 6, 2.6, 4.1),
        ],
        turrets: [
          { x: 4.45, d: 13, hp: 200, every: 0.7 },
          { x: -4.45, d: 35, hp: 200, every: 0.9 },
        ],
      },
      {
        tip: 'MECHA BOSS! Nukes hurt it too. Stack everything!',
        boss: { type: 'robot', hp: 2500000, speed: 0.5 },
        waves: { every: 3.0, swarm: 12, tank: { every: 2, hp: 60 }, ramp: 0.4 },
        gates: [
          { t: 'upgrade', up: 'power', need: 60, x: -4.6, d: 11, w: 3.4 },
          { t: 'upgrade', up: 'rapid', need: 150, x: -4.6, d: 20, w: 3.4 },
          { t: 'mul', v: 3, x: -4.6, d: 28, w: 3.4 },
          { t: 'nuke', need: 200, dmg: 0.3, x: 0, d: 13, w: 3.6 },
          { t: 'mul', v: 5, x: 0, d: 21, w: 3.6, mega: true },
          { t: 'mul', v: 4, x: 0, d: 27, w: 3.6 },
          ...ladder(4.6, 15, 2, 6, 2.6, 3.4),
          { t: 'fence', hp: 20000, x: 4.6, d: 32.5, w: 3.4 },
          { t: 'mul', v: 25, x: 4.6, d: 37, w: 3.4, mega: true },
        ],
        turrets: [
          { x: 4.6, d: 29, hp: 400, every: 0.8 },
          { x: -4.6, d: 33, hp: 400, every: 0.8 },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 7
  {
    name: 'Candy Chaos',
    theme: 'candy',
    threat: 1.75,
    feature: 'Portals',
    blurb: 'Portals warp your units past walls into secret lanes full of multipliers!',
    enemy: 'Splitters: pop into 3 more when killed',
    stages: [
      {
        tip: 'The pink PORTAL warps units into the sealed x2..x7 lane!',
        tower: 400000,
        waves: { every: 3.0, swarm: 8, splitter: 2, ramp: 0.4 },
        walls: [{ x: 2.2, d1: 6, d2: 50 }],
        gates: [
          { t: 'portal', x: -4.6, d: 12, w: 2.6, to: { x: 4.3, d: 17 } },
          { t: 'mul', v: 2, x: -1.0, d: 16, w: 5.6 },
          { t: 'mul', v: 3, x: -1.0, d: 28, w: 5.6 },
          { t: 'barrier', hp: 4000, x: 4.3, d: 10, w: 4.1 },
          ...ladder(4.3, 20, 2, 7, 3, 4.0),
        ],
      },
      {
        tip: 'Portal first, then the POWER gate waiting inside!',
        tower: 5000000,
        waves: { every: 3.0, swarm: 10, splitter: 3, ramp: 0.45, brute: { every: 4, hp: 50 } },
        walls: [{ x: -2.2, d1: 6, d2: 46 }, { x: 2.2, d1: 6, d2: 46 }],
        gates: [
          { t: 'mul', v: 2, x: 0, d: 12, w: 3.9 },
          { t: 'portal', x: 0, d: 18, w: 3.9, to: { x: -4.45, d: 14 } },
          { t: 'barrier', hp: 5000, x: -4.45, d: 9, w: 4.1 },
          { t: 'upgrade', up: 'power', need: 40, x: -4.45, d: 17, w: 4.1 },
          ...ladder(-4.45, 22, 3, 8, 3.2, 4.1),
          { t: 'mul', v: 3, x: 4.45, d: 15, w: 4.1 },
          { t: 'mul', v: 3, x: 4.45, d: 27, w: 4.1 },
        ],
      },
      {
        tip: 'JELLY KING! Two portals, two secret lanes. Find the best route!',
        boss: { type: 'jelly', hp: 150000000, speed: 0.5 },
        waves: { every: 3.0, swarm: 12, splitter: 4, ramp: 0.4 },
        walls: [{ x: -2.2, d1: 6, d2: 34 }, { x: 2.2, d1: 6, d2: 34 }],
        gates: [
          { t: 'upgrade', up: 'rapid', need: 50, x: 0, d: 10, w: 3.9 },
          { t: 'portal', x: 0, d: 15, w: 3.9, to: { x: 4.45, d: 12 } },
          { t: 'barrier', hp: 8000, x: 4.45, d: 8, w: 4.1 },
          ...ladder(4.45, 15, 2, 7, 3, 4.1),
          { t: 'barrier', hp: 8000, x: -4.45, d: 8, w: 4.1 },
          { t: 'portal', x: 4.45, d: 33, w: 4.1, to: { x: -4.45, d: 12 } },
          { t: 'mul', v: 10, x: -4.45, d: 18, w: 4.1, mega: true },
          { t: 'mul', v: 10, x: -4.45, d: 26, w: 4.1, mega: true },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 8
  {
    name: 'Moon Base',
    theme: 'moon',
    threat: 1.9,
    feature: 'Crushers & TWIN cannon',
    blurb: 'Steel crushers slam the best lanes. The TWIN upgrade adds a mirrored second cannon!',
    enemy: 'Tanks and runners together',
    stages: [
      {
        tip: 'TWIN CANNON mirrors your aim: cover two lanes at once!',
        tower: 42000,
        waves: { every: 3.0, swarm: 8, runner: 4, tank: { every: 3, hp: 40 }, ramp: 0.4 },
        walls: [{ x: 0, d1: 9, d2: 40 }],
        gates: [
          { t: 'upgrade', up: 'twin', need: 60, x: -3.3, d: 12, w: 5.6 },
          { t: 'mul', v: 3, x: -3.3, d: 22, w: 5.6 },
          { t: 'mul', v: 2, x: -3.3, d: 31, w: 5.6 },
          ...ladder(3.3, 14, 2, 6, 3.4, 5.6),
        ],
        crushers: [{ x: 3.3, d: 27.5, w: 5.4, period: 2.2 }],
      },
      {
        tip: 'Time your stream between crusher slams!',
        tower: 3000000,
        waves: { every: 3.0, swarm: 10, runner: 6, tank: { every: 2, hp: 50 }, ramp: 0.45 },
        walls: [{ x: -2.2, d1: 9, d2: 42 }, { x: 2.2, d1: 9, d2: 42 }],
        gates: [
          { t: 'upgrade', up: 'barrel', need: 60, x: -4.45, d: 12, w: 4.1 },
          { t: 'mul', v: 4, x: -4.45, d: 22, w: 4.1 },
          { t: 'mul', v: 3, x: -4.45, d: 32, w: 4.1 },
          ...ladder(0, 13, 4, 9, 3.4, 3.9),
          { t: 'upgrade', up: 'power', need: 80, x: 4.45, d: 12, w: 4.1 },
          { t: 'mul', v: 5, x: 4.45, d: 24, w: 4.1 },
          { t: 'mul', v: 5, x: 4.45, d: 33, w: 4.1 },
        ],
        crushers: [
          { x: 0, d: 18.5, w: 3.7, period: 1.8 },
          { x: 0, d: 29, w: 3.7, period: 2.4, offset: 0.9 },
        ],
      },
      {
        tip: 'MOON GOLEM! Twin cannon + power + crusher ladder!',
        boss: { type: 'moon', hp: 6000000, speed: 0.5 },
        waves: { every: 3.0, swarm: 12, runner: 8, tank: { every: 2, hp: 70 }, ramp: 0.4 },
        walls: [{ x: 0, d1: 9, d2: 36 }],
        gates: [
          { t: 'upgrade', up: 'twin', need: 80, x: -3.3, d: 11, w: 5.6 },
          { t: 'upgrade', up: 'power', need: 120, x: 3.3, d: 11, w: 5.6 },
          ...ladder(-3.3, 16, 3, 7, 3.6, 5.6),
          ...ladder(3.3, 16, 3, 7, 3.6, 5.6),
        ],
        crushers: [
          { x: -3.3, d: 22, w: 5.4, period: 2.0 },
          { x: 3.3, d: 22, w: 5.4, period: 2.0, offset: 1.0 },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 9
  {
    name: 'Sky Citadel',
    theme: 'sky',
    threat: 2.1,
    feature: 'Star gates: ALL GATES x2',
    blurb: 'Fill a rainbow STAR gate and EVERY gate on the stage doubles. x2 becomes x4, then x8, then x16...',
    enemy: 'Bombers, shielders and splitters',
    stages: [
      {
        tip: 'STAR gate: fill it and every gate doubles. Refill it again and again!',
        tower: 60000,
        waves: { every: 3.0, swarm: 9, bomber: 2, shielder: 1, ramp: 0.4 },
        gates: [
          { t: 'mul', v: 3, x: -4.6, d: 14, w: 3.4 },
          { t: 'mul', v: 3, x: -4.6, d: 24, w: 3.4 },
          { t: 'mul', v: 3, x: 0, d: 11, w: 3.6 },
          { t: 'star', need: 60, x: 0, d: 19, w: 3.6 },
          ...ladder(4.6, 14, 2, 5, 3, 3.4),
        ],
      },
      {
        tip: 'Two stars = gates x4. Feed them, then blast through the ladder!',
        tower: 4000000,
        waves: { every: 3.4, swarm: 7, bomber: 1, shielder: 1, splitter: 1, ramp: 0.4 },
        walls: [{ x: -2.2, d1: 9, d2: 30 }, { x: 2.2, d1: 9, d2: 30 }],
        gates: [
          { t: 'upgrade', up: 'barrel', need: 60, x: -4.45, d: 12, w: 4.1 },
          ...ladder(-4.45, 18, 3, 6, 3, 4.1),
          { t: 'mul', v: 3, x: 0, d: 11, w: 3.9 },
          { t: 'star', need: 150, x: 0, d: 16, w: 3.9 },
          { t: 'mul', v: 2, x: 0, d: 21, w: 3.9 },
          { t: 'star', need: 500, x: 0, d: 26, w: 3.9 },
          { t: 'upgrade', up: 'power', need: 80, x: 4.45, d: 12, w: 4.1 },
          { t: 'mul', v: 4, x: 4.45, d: 21, w: 4.1 },
          { t: 'mul', v: 4, x: 4.45, d: 27, w: 4.1 },
        ],
      },
      {
        tip: 'TEMPEST DJINN! Ladder, then stars. Go absolutely crazy!',
        boss: { type: 'storm', hp: 2000000000, speed: 0.5 },
        waves: { every: 3.0, swarm: 12, bomber: 3, shielder: 3, splitter: 3, ramp: 0.4 },
        gates: [
          { t: 'upgrade', up: 'power', need: 60, x: -4.7, d: 10, w: 3.2 },
          { t: 'upgrade', up: 'rapid', need: 200, x: 4.7, d: 10, w: 3.2 },
          ...ladder(0, 12, 2, 8, 2.2, 4.6),
          { t: 'star', need: 1000, x: -4.7, d: 22, w: 3.2 },
          { t: 'star', need: 1000, x: 4.7, d: 22, w: 3.2 },
        ],
        saws: [{ x: 0, d: 30, r: 1.2, slide: { amp: 5.2, speed: 0.9 } }],
      },
    ],
  },
  // ------------------------------------------------------------------ 10
  {
    name: 'Swarm Apocalypse',
    theme: 'void',
    threat: 2.4,
    feature: 'EVERYTHING at once',
    blurb: 'Every gate, every trap, every enemy. Build the most ridiculous army in history!',
    enemy: 'All enemy types + the Titan',
    stages: [
      {
        tip: 'Final level! Portal, power, charge... find the mega route!',
        tower: 50000000,
        waves: { every: 3.2, swarm: 9, runner: 3, tank: { every: 4, hp: 40 }, bomber: 1, ramp: 0.4 },
        walls: [{ x: -2.2, d1: 8, d2: 44 }, { x: 2.2, d1: 8, d2: 44 }],
        gates: [
          { t: 'upgrade', up: 'power', need: 60, x: 0, d: 10, w: 3.9 },
          { t: 'charge', v: 2, max: 30, per: 60, x: 0, d: 17, w: 3.9 },
          { t: 'portal', x: 0, d: 24, w: 3.9, to: { x: 4.45, d: 14 } },
          { t: 'fence', hp: 20000, x: 4.45, d: 10, w: 4.1 },
          ...ladder(4.45, 17, 5, 12, 3, 4.1),
          { t: 'mul', v: 3, x: -4.45, d: 14, w: 4.1 },
          { t: 'flip', a: { t: 'mul', v: 6 }, b: { t: 'div', v: 3 }, period: 1.6, x: -4.45, d: 24, w: 4.1 },
          { t: 'mul', v: 2, x: -4.45, d: 33, w: 4.1 },
        ],
        turrets: [{ x: -4.45, d: 40, hp: 500, every: 0.8 }],
      },
      {
        tip: 'Nuke + star + ladder. Crushers guard the ladder!',
        tower: 5000000000,
        waves: { every: 2.8, swarm: 14, runner: 6, tank: { every: 2, hp: 80 }, splitter: 3, shielder: 2, ramp: 0.45 },
        walls: [{ x: 0, d1: 8, d2: 42 }],
        gates: [
          { t: 'upgrade', up: 'twin', need: 80, x: -3.3, d: 11, w: 5.6 },
          { t: 'star', need: 300, x: -3.3, d: 20, w: 5.6 },
          { t: 'nuke', need: 400, dmg: 0.35, x: -3.3, d: 30, w: 5.6 },
          ...ladder(3.3, 12, 3, 12, 2.6, 5.6),
        ],
        crushers: [
          { x: 3.3, d: 20.5, w: 5.4, period: 2.0 },
          { x: 3.3, d: 33.5, w: 5.4, period: 2.6, offset: 1.1 },
        ],
        spawners: [
          { x: -4.6, d: 47, hp: 5000, every: 2.4, n: 4, style: 'dome' },
          { x: 4.6, d: 47, hp: 5000, every: 2.4, n: 4, style: 'dome' },
        ],
      },
      {
        tip: 'THE TITAN. Ladder x2 to x16, stars, everything. GO!',
        boss: { type: 'titan', hp: 2e13, speed: 0.52 },
        waves: { every: 2.8, swarm: 14, runner: 6, tank: { every: 2, hp: 100 }, bomber: 3, splitter: 3, ramp: 0.45 },
        walls: [{ x: -1.9, d1: 8, d2: 26 }, { x: 1.9, d1: 8, d2: 26 }],
        gates: [
          { t: 'upgrade', up: 'power', need: 80, x: -4.3, d: 10, w: 4.2 },
          { t: 'upgrade', up: 'rapid', need: 200, x: -4.3, d: 18, w: 4.2 },
          { t: 'star', need: 2000, x: -4.3, d: 24, w: 4.2 },
          { t: 'fence', hp: 300, x: 0, d: 9, w: 3.5 },
          ...ladder(0, 11, 2, 16, 1.0, 3.5),
          { t: 'upgrade', up: 'twin', need: 120, x: 4.3, d: 10, w: 4.2 },
          { t: 'charge', v: 2, max: 50, per: 500, x: 4.3, d: 18, w: 4.2 },
          { t: 'star', need: 2000, x: 4.3, d: 24, w: 4.2 },
        ],
        saws: [{ x: 0, d: 32, r: 1.3, slide: { amp: 5.2, speed: 1.0 } }],
      },
    ],
  },
  ...MORE_LEVELS,
  ...LATE_LEVELS,
]);

export const THEMES = {
  desert: { sky: 0x9fd8ff, fog: 0xf3dcb0, ground: 0xe9c88f, road: 0x8e939d, rail: 0xb9bec7, tower: 0xd23b30, roof: 0x7a1d1d },
  mob: { sky: 0xbfe2f5, fog: 0xead6b0, ground: 0xdcb98a, road: 0x8f8f96, rail: 0x9a9ea8, tower: 0xd23b30, roof: 0x7a1d1d },
  lava: { sky: 0x2b1426, fog: 0x3a1a22, ground: 0x4a3234, road: 0x5d5964, rail: 0x77707a, tower: 0x6b1f2b, roof: 0x2a0e14 },
  frost: { sky: 0xcfe9ff, fog: 0xe6f3ff, ground: 0xf4f9ff, road: 0x98a5b8, rail: 0xd8e2ee, tower: 0x4f6797, roof: 0x22355e },
  jungle: { sky: 0x8fe0ff, fog: 0xbfe8c8, ground: 0x5cae4a, road: 0x8f8a7e, rail: 0x7a5a3a, tower: 0x9a3a1a, roof: 0x4a1a0a },
  neon: { sky: 0x0a0a26, fog: 0x1a1240, ground: 0x15152e, road: 0x2c2c48, rail: 0xff2fd0, tower: 0x3a1a6a, roof: 0xff2fd0 },
  candy: { sky: 0xffd6f0, fog: 0xffe6f6, ground: 0xff9fd0, road: 0xc9b6e0, rail: 0xffffff, tower: 0xff4f9a, roof: 0x8a2a5a },
  moon: { sky: 0x05051a, fog: 0x1a1a3a, ground: 0x8a8a9a, road: 0x5a5a6a, rail: 0xaab0c0, tower: 0x5a6a8a, roof: 0x2a3050 },
  sky: { sky: 0x7fc8ff, fog: 0xdff2ff, ground: 0xffffff, road: 0xa9bad6, rail: 0xffe7a0, tower: 0xf0f0ff, roof: 0x3a6ad0 },
  void: { sky: 0x12002a, fog: 0x22053a, ground: 0x1a0830, road: 0x3a2a5a, rail: 0x9a3aff, tower: 0x2a0a3a, roof: 0xff3a8a },
  factory: { sky: 0xd8c9a8, fog: 0xc9b89a, ground: 0x6a6258, road: 0x55565e, rail: 0xffb21a, tower: 0x8a3a1a, roof: 0x3a3a40 },
  casino: { sky: 0x1a0612, fog: 0x2a0a1a, ground: 0x0e5a2e, road: 0x2a1a22, rail: 0xffd21a, tower: 0xb01030, roof: 0xffd21a },
  coral: { sky: 0x7fe6ff, fog: 0xbff4ff, ground: 0xf7e0a8, road: 0x9fb8c0, rail: 0xff8a6a, tower: 0x2a8ab0, roof: 0x0a4a6a },
  spooky: { sky: 0x2a1a3a, fog: 0x3a2a4a, ground: 0x2a3020, road: 0x4a4450, rail: 0x6a5a4a, tower: 0x3a2a4a, roof: 0xff7a1a },
  arena: { sky: 0xffd8a0, fog: 0xf0c890, ground: 0xd8b07a, road: 0x9a8a7a, rail: 0xc0302a, tower: 0xb03030, roof: 0x5a1a1a },
  crystal: { sky: 0x140a2a, fog: 0x2a1a4a, ground: 0x2a2440, road: 0x3a3456, rail: 0x6afff0, tower: 0x4a3a8a, roof: 0x6afff0 },
  volcano: { sky: 0x3a1a10, fog: 0x5a2a18, ground: 0x2a1a14, road: 0x4a3a36, rail: 0xff6a1a, tower: 0x5a1a10, roof: 0xff3a0a },
  tomb: { sky: 0xffc880, fog: 0xf0c080, ground: 0xe0b070, road: 0xb09060, rail: 0xd8a040, tower: 0xc89a50, roof: 0x2a5aa0 },
  storm: { sky: 0x3a4a5a, fog: 0x5a6a7a, ground: 0x5a6a5a, road: 0x5a5e66, rail: 0xfff06a, tower: 0x3a4a6a, roof: 0xfff06a },
  blackhole: { sky: 0x02010a, fog: 0x0a0520, ground: 0x100818, road: 0x1a1430, rail: 0xff9a3a, tower: 0x1a0a2a, roof: 0xff9a3a },
  ...LATE_PALETTES,
};
