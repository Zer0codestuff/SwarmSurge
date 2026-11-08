// Worlds 21-50. Same format as levels.js and levels2.js, plus the late mechanics documented in main.js:
//   bumpers, hypno gates, mine carts, harvest banks, dinosaur eggs and fusion cores.
// Costs and toughness written as fractions (needF, hpF) are resolved against the stage target HP in
// campaign.js, so they stay proportional when the target HP is recalibrated. HP lives in the HP table below.
import { ladder, stack } from './levelkit.js';

const M = (v) => ({ t: 'mul', v });
const D = (v) => ({ t: 'div', v });
const flip = (a, b, period, x, d, w) => ({ t: 'flip', a: M(a), b: D(b), period, x, d, w });
const ghost = (g, on, period, off = 0) => ({ ...g, phase: { on, period, off } });

const WORLDS = [
  // ------------------------------------------------------------------ 21
  {
    name: 'Pinball Plaza', theme: 'pinball', threat: 3.60, route: ['rifle', 'tank', 'rapid'],
    feature: 'Pinball bumpers',
    blurb: 'Bumpers double every troop that touches them, then bounce it into a new lane. Aim for the side you want!',
    enemy: 'Runners: fast and fragile',
    stages: [
      {
        tip: 'Hit a bumper on its left to bounce left, on its right to bounce right.',
        waves: { every: 3.0, swarm: 9, runner: 1, ramp: 0.4 },
        bumpers: [{ x: 0, d: 15 }, { x: -3.3, d: 22 }, { x: 3.3, d: 22 }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          ...ladder(0, 28, 3, 5, 4, 4.4),
          { t: 'div', v: 2, x: -5.7, d: 30, w: 1.5 }, { t: 'div', v: 2, x: 5.7, d: 30, w: 1.5 },
        ],
      },
      {
        tip: 'The bumpers slide. Ride them into the big centre bumper.',
        waves: { every: 3.0, swarm: 10, runner: 2, ramp: 0.42 },
        walls: [{ x: 0, d1: 12, d2: 25 }],
        bumpers: [
          { x: -3.3, d: 16, slide: { amp: 1.6, speed: 0.9 } }, { x: 3.3, d: 16, slide: { amp: 1.6, speed: 0.9, ph: 3.14 } },
          { x: 0, d: 30, r: 1.15, v: 3, color: 0xffc21a },
        ],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 10, w: 5.6 }, { t: 'mul', v: 2, x: 3.3, d: 10, w: 5.6 },
          ...ladder(-5.2, 20, 3, 4, 4, 2.4), ...ladder(5.2, 20, 3, 4, 4, 2.4),
          ...ladder(-3.3, 34, 2, 3, 4, 3.2), ...ladder(3.3, 34, 2, 3, 4, 3.2),
        ],
        spawners: [{ x: 0, d: 50, hpF: 0.02, every: 2.8, n: 2, kind: 4, unitHp: 2, style: 'dome' }],
      },
      {
        tip: 'THE PINBALL ROBOT! Keep the stream inside the bumper field.',
        boss: { type: 'robot', speed: 0.5 },
        waves: { every: 3.0, swarm: 10, runner: 2, ramp: 0.45 },
        bumpers: [{ x: -4, d: 24 }, { x: 0, d: 24, v: 3, r: 1.0, color: 0xffc21a }, { x: 4, d: 24 }],
        gates: [
          ...ladder(0, 11, 2, 5, 2.4, 12.9),
          { t: 'mul', v: 3, x: -4.45, d: 32, w: 4.1 }, { t: 'mul', v: 5, x: 0, d: 32, w: 3.9, mega: true }, { t: 'mul', v: 3, x: 4.45, d: 32, w: 4.1 },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 22
  {
    name: 'Toy Town', theme: 'toybox', threat: 3.62, route: ['scatter', 'squad', 'tank'],
    feature: 'Bumpers + toy jump pads',
    blurb: 'Bounce off the bumpers onto jump pads and fly into the toy chest lanes.',
    enemy: 'Splitters: burst into three',
    stages: [
      {
        tip: 'The jump pad sends troops over the wall into the hidden lane.',
        waves: { every: 3.0, swarm: 9, splitter: 1, ramp: 0.4 },
        walls: [{ x: 3.0, d1: 14, d2: 40 }],
        bumpers: [{ x: -1.6, d: 15 }, { x: -4.6, d: 22 }],
        gates: [
          { t: 'mul', v: 3, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 2, x: 3.3, d: 9, w: 5.6 },
          { t: 'jump', x: 1.2, d: 26, w: 2.6, to: { x: 4.8, d: 20 } },
          ...ladder(4.8, 24, 3, 6, 3.5, 3.0),
          ...ladder(-2.6, 30, 2, 4, 4, 5.4),
        ],
      },
      {
        tip: 'A toy fort guards the centre. Bounce around it or smash through.',
        waves: { every: 2.9, swarm: 10, splitter: 2, ramp: 0.42 },
        bumpers: [{ x: -4.6, d: 18 }, { x: 4.6, d: 18 }, { x: 0, d: 33, v: 3, r: 1.0, color: 0xffc21a }],
        gates: [
          { t: 'mul', v: 2, x: 0, d: 10, w: 12.9 },
          { t: 'fence', hpF: 0.004, x: 0, d: 16, w: 3.4 },
          { t: 'mul', v: 6, x: 0, d: 22, w: 3.4, mega: true },
          ...ladder(-1.5, 24, 2, 3, 4, 2.2), ...ladder(1.5, 24, 2, 3, 4, 2.2),
          { t: 'jump', x: -5.4, d: 26, w: 1.9, to: { x: 0, d: 29 } }, { t: 'jump', x: 5.4, d: 26, w: 1.9, to: { x: 0, d: 29 } },
          ...ladder(0, 38, 2, 4, 2.4, 6),
        ],
        turrets: [{ x: -5, d: 46, hpF: 0.01, every: 1.6 }, { x: 5, d: 46, hpF: 0.01, every: 1.6 }],
      },
      {
        tip: 'JACK IN THE BOX! Dodge the springing toys.',
        boss: { type: 'jack', speed: 0.5 },
        waves: { every: 2.9, swarm: 11, splitter: 2, ramp: 0.45 },
        bumpers: [{ x: -2.4, d: 19 }, { x: 2.4, d: 19 }, { x: 0, d: 27, v: 3, color: 0xffc21a }],
        gates: [
          ...ladder(-3.3, 10, 2, 3, 3, 5.6), ...ladder(3.3, 10, 2, 3, 3, 5.6),
          { t: 'jump', x: -5.4, d: 22, w: 1.9, to: { x: 0, d: 24 } }, { t: 'jump', x: 5.4, d: 22, w: 1.9, to: { x: 0, d: 24 } },
          ...ladder(0, 31, 3, 5, 2.4, 12.9),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 23
  {
    name: 'Bubble Bath', theme: 'bubble', threat: 3.64, route: ['frost', 'hover', 'air'],
    feature: 'Soap slides + bubble bumpers',
    blurb: 'Slippery soap belts carry your army into the bumpers. Pop the bubble balls before they roll in!',
    enemy: 'Drones: fly over walls',
    stages: [
      {
        tip: 'The soap slide drifts your army right, straight into the bumpers.',
        waves: { every: 3.0, swarm: 9, drone: 1, ramp: 0.4 },
        belts: [{ x: 0, w: 12.9, v: 3, d1: 12, d2: 18 }],
        bumpers: [{ x: 1.5, d: 22, color: 0x6ad8ff }, { x: 4.8, d: 22, color: 0x6ad8ff }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 2, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-1.8, 27, 3, 5, 4, 3.6), ...ladder(3.2, 28, 2, 3, 4, 3.4),
        ],
        balls: [{ x: 0, d: 50, hpF: 0.03, r: 2.2, speed: 1.4, delay: 12, dmg: 2 }],
      },
      {
        tip: 'Belts push both ways. Catch the bumpers in the middle.',
        waves: { every: 2.9, swarm: 10, drone: 2, ramp: 0.42 },
        belts: [{ x: -3.3, w: 5.6, v: 3.5, d1: 13, d2: 19 }, { x: 3.3, w: 5.6, v: -3.5, d1: 13, d2: 19 }],
        bumpers: [{ x: -1.3, d: 23, color: 0x6ad8ff }, { x: 1.3, d: 23, color: 0x6ad8ff }, { x: 0, d: 32, r: 1.1, v: 3, color: 0xffc21a }],
        gates: [
          { t: 'upgrade', up: 'barrel', need: 60, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-4.6, 26, 3, 4, 4, 3.4), ...ladder(4.6, 26, 3, 4, 4, 3.4),
          { t: 'mul', v: 4, x: 0, d: 37, w: 5 },
        ],
        balls: [{ x: -3, d: 52, hpF: 0.03, r: 2.2, speed: 1.4, delay: 9, dmg: 2 }, { x: 3, d: 52, hpF: 0.03, r: 2.2, speed: 1.4, delay: 18, dmg: 2 }],
      },
      {
        tip: 'THE BUBBLE JELLY! Slam waves and bouncing blobs.',
        boss: { type: 'jelly', speed: 0.5 },
        waves: { every: 2.9, swarm: 11, drone: 2, ramp: 0.45 },
        belts: [{ x: 0, w: 12.9, v: -2.6, d1: 16, d2: 21 }],
        bumpers: [{ x: -4.4, d: 25, color: 0x6ad8ff }, { x: -1.2, d: 25, color: 0x6ad8ff }, { x: 2.2, d: 25, color: 0x6ad8ff }],
        gates: [
          ...ladder(0, 10, 2, 4, 2.4, 12.9),
          ...ladder(-3.3, 30, 3, 5, 2.6, 5.6), ...ladder(3.3, 30, 2, 4, 2.6, 5.6),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 24
  {
    name: 'Bounce Castle', theme: 'bouncy', threat: 3.66, route: ['rockets', 'siege', 'squad'],
    feature: 'Bumper gauntlets + ice keeps',
    blurb: 'A whole field of bumpers. Every bounce doubles the troop, so a long ricochet is worth a fortune.',
    enemy: 'Brutes: slow and heavy',
    stages: [
      {
        tip: 'Zig-zag through the bumper field. Each one doubles a troop once.',
        waves: { every: 3.0, swarm: 9, ramp: 0.4, brute: { every: 3, hp: 14 } },
        bumpers: [{ x: -3.3, d: 13 }, { x: 0, d: 18 }, { x: 3.3, d: 23 }, { x: 0, d: 28 }, { x: -3.3, d: 33 }],
        gates: [
          { t: 'mul', v: 2, x: 3.3, d: 9, w: 5.6 },
          { t: 'div', v: 2, x: -5.8, d: 25, w: 1.3 }, { t: 'div', v: 2, x: 5.8, d: 35, w: 1.3 },
          ...ladder(0, 38, 2, 3, 3, 12.9),
        ],
      },
      {
        tip: 'Smash the ice keep. A bumper inside doubles everything that gets in.',
        waves: { every: 2.9, swarm: 10, ramp: 0.42, brute: { every: 3, hp: 16 } },
        walls: [{ x: -2.2, d1: 18, d2: 36 }, { x: 2.2, d1: 18, d2: 36 }],
        bumpers: [{ x: 0, d: 25, v: 3, r: 0.8, color: 0xffc21a }, { x: -4.4, d: 14 }, { x: 4.4, d: 14 }],
        gates: [
          { t: 'mul', v: 3, x: 0, d: 10, w: 3.6 },
          { t: 'ice', hpF: 0.005, x: 0, d: 19, w: 4.2 },
          { t: 'mul', v: 5, x: 0, d: 31, w: 4.2, mega: true },
          ...ladder(-4.4, 21, 2, 4, 4, 4.0), ...ladder(4.4, 21, 2, 4, 4, 4.0),
          { t: 'mul', v: 2, x: 0, d: 40, w: 12.9 },
        ],
        spawners: [{ x: -4.6, d: 49, hpF: 0.015, every: 3, n: 2, kind: 1, unitHp: 8 }, { x: 4.6, d: 49, hpF: 0.015, every: 3, n: 2, kind: 1, unitHp: 8 }],
      },
      {
        tip: 'THE BOUNCY KING! His slams shake the castle.',
        boss: { type: 'king', speed: 0.5 },
        waves: { every: 2.9, swarm: 11, ramp: 0.45, brute: { every: 2, hp: 18 } },
        bumpers: [{ x: -3.3, d: 16 }, { x: 3.3, d: 16 }, { x: 0, d: 22 }, { x: -3.3, d: 28 }, { x: 3.3, d: 28 }],
        gates: [
          { t: 'mul', v: 2, x: 0, d: 10, w: 12.9 },
          ...ladder(0, 33, 2, 5, 2.2, 12.9),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 25
  {
    name: 'Tilt Palace', theme: 'tilt', threat: 3.68, route: ['arc', 'spider', 'air'],
    feature: 'Sliding bumpers + flip gates',
    blurb: 'Bumpers glide and flip gates swing between great and terrible. Time your bounce!',
    enemy: 'Shielders: armored',
    stages: [
      {
        tip: 'Bounce on the sliding bumper while the flip gate shows its multiplier.',
        waves: { every: 3.0, swarm: 9, shielder: 1, ramp: 0.4 },
        bumpers: [{ x: 0, d: 16, slide: { amp: 4.2, speed: 0.7 } }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 2, x: 3.3, d: 9, w: 5.6 },
          flip(5, 2, 1.8, -3.3, 24, 5.6), flip(4, 2, 1.5, 3.3, 24, 5.6),
          ...ladder(0, 30, 2, 4, 4, 12.9),
        ],
      },
      {
        tip: 'Two bumpers slide in opposite directions. Find the gap.',
        waves: { every: 2.9, swarm: 10, shielder: 2, ramp: 0.42 },
        bumpers: [{ x: -2, d: 15, slide: { amp: 3.5, speed: 0.9 } }, { x: 2, d: 22, slide: { amp: 3.5, speed: 0.9, ph: 3.14 } }],
        gates: [
          { t: 'mul', v: 3, x: 0, d: 10, w: 5 },
          flip(6, 3, 2.0, 0, 28, 4.4),
          ...ladder(-4.6, 26, 2, 4, 3.5, 3.6), ...ladder(4.6, 26, 2, 4, 3.5, 3.6),
          { t: 'mul', v: 3, x: 0, d: 36, w: 12.9 },
        ],
        spawners: [{ x: 0, d: 50, hpF: 0.02, every: 2.6, n: 2, kind: 3, unitHp: 4, style: 'dome' }],
      },
      {
        tip: 'THE FLIPPER KNIGHT tilts the whole table. Steer back to the bumpers!',
        boss: { type: 'flipper', speed: 0.5 },
        waves: { every: 2.9, swarm: 11, shielder: 2, ramp: 0.45 },
        bumpers: [{ x: 0, d: 20, slide: { amp: 4.5, speed: 0.8 } }, { x: -3.5, d: 27 }, { x: 3.5, d: 27 }],
        gates: [
          ...ladder(0, 10, 2, 4, 3, 12.9),
          flip(8, 2, 1.6, 0, 31, 3.6),
          ...ladder(-4.6, 32, 3, 4, 3, 3.4), ...ladder(4.6, 32, 3, 4, 3, 3.4),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 26
  {
    name: 'Mushroom Grove', theme: 'mushroom', threat: 3.70, route: ['rifle', 'tank', 'plasma'],
    feature: 'Hypno gates',
    blurb: 'Fill a hypno gate and every enemy marching through it turns around and fights for you.',
    enemy: 'Shielders and swarms',
    stages: [
      {
        tip: 'Charge the hypno gate. Enemies walking through it join your army, and they still pass your gates.',
        waves: { every: 2.8, swarm: 11, shielder: 1, ramp: 0.45 },
        gates: [
          { t: 'mul', v: 2, x: 3.3, d: 10, w: 5.6 },
          { t: 'hypno', needF: 0.006, dur: 6, x: -3.3, d: 14, w: 5.6 },
          ...ladder(-3.3, 22, 2, 4, 4, 5.6), ...ladder(3.3, 18, 2, 5, 4, 5.6),
        ],
      },
      {
        tip: 'The hypno gate sits in front of the ladder. Turned enemies climb it too.',
        waves: { every: 2.7, swarm: 12, shielder: 2, ramp: 0.45 },
        walls: [{ x: -2.2, d1: 20, d2: 42 }, { x: 2.2, d1: 20, d2: 42 }],
        gates: [
          { t: 'mul', v: 3, x: 0, d: 10, w: 12.9 },
          { t: 'hypno', needF: 0.008, dur: 6, x: 0, d: 17, w: 4.4 },
          ...ladder(0, 23, 2, 6, 3.4, 4.2),
          ...ladder(-4.4, 24, 3, 4, 6, 4.1), ...ladder(4.4, 24, 3, 4, 6, 4.1),
        ],
      },
      {
        tip: 'THE SPORE GOLEM! Hypnotize its minions and send them back.',
        boss: { type: 'golem', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, shielder: 2, ramp: 0.45 },
        gates: [
          { t: 'hypno', needF: 0.003, dur: 6, x: -4.45, d: 12, w: 4.1 },
          { t: 'mul', v: 3, x: 0, d: 12, w: 3.9 },
          { t: 'hypno', needF: 0.003, dur: 6, x: 4.45, d: 12, w: 4.1 },
          ...ladder(0, 18, 2, 7, 2.4, 12.9),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 27
  {
    name: 'Big Top Circus', theme: 'circus', threat: 3.72, route: ['squad', 'rockets', 'air'],
    feature: 'Hypno rings + circus bumpers',
    blurb: 'Hypno hoops turn the clowns, bumpers juggle your troops and charge gates grow with every act.',
    enemy: 'Splitters and runners',
    stages: [
      {
        tip: 'Feed the charge gate, bounce the bumper, then hypnotize the clowns.',
        waves: { every: 2.8, swarm: 10, splitter: 1, runner: 1, ramp: 0.45 },
        bumpers: [{ x: 3.3, d: 20, color: 0xffd23a }],
        gates: [
          { t: 'charge', v: 1, max: 12, per: 30, x: 3.3, d: 12, w: 5.6 },
          { t: 'hypno', needF: 0.006, dur: 6, x: -3.3, d: 13, w: 5.6 },
          ...ladder(-3.3, 22, 2, 4, 4, 5.6), ...ladder(0.6, 26, 3, 4, 4, 3.4),
          { t: 'mul', v: 3, x: 5.4, d: 28, w: 2.0 },
        ],
      },
      {
        tip: 'Three rings: the hypno ring in the middle feeds both ladders.',
        waves: { every: 2.7, swarm: 11, splitter: 2, runner: 1, ramp: 0.45 },
        bumpers: [{ x: -1.7, d: 26, color: 0xffd23a }, { x: 1.7, d: 26, color: 0xffd23a }],
        gates: [
          { t: 'mul', v: 2, x: -4.45, d: 10, w: 4.1 }, { t: 'hypno', needF: 0.008, dur: 7, x: 0, d: 12, w: 3.9 }, { t: 'mul', v: 2, x: 4.45, d: 10, w: 4.1 },
          ...ladder(-4.45, 16, 2, 4, 4, 4.1), ...ladder(4.45, 16, 2, 4, 4, 4.1),
          { t: 'charge', v: 2, max: 16, per: 40, x: 0, d: 19, w: 3.9 },
          ...ladder(0, 32, 2, 3, 4, 12.9),
        ],
        spawners: [{ x: -4.6, d: 49, hpF: 0.015, every: 2.6, n: 2, kind: 6, unitHp: 3, style: 'dome' }, { x: 4.6, d: 49, hpF: 0.015, every: 2.6, n: 2, kind: 6, unitHp: 3, style: 'dome' }],
      },
      {
        tip: 'THE RINGMASTER! Fire hoops roll in. Hypnotize his troupe!',
        boss: { type: 'ringmaster', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, splitter: 2, runner: 2, ramp: 0.45 },
        bumpers: [{ x: 0, d: 24, v: 3, r: 1.0, color: 0xffd23a }],
        gates: [
          { t: 'hypno', needF: 0.003, dur: 6, x: -3.3, d: 11, w: 5.6 },
          { t: 'charge', v: 2, max: 20, per: 60, x: 3.3, d: 11, w: 5.6 },
          ...ladder(-3.3, 17, 2, 4, 2.6, 5.6), ...ladder(3.3, 17, 2, 3, 2.6, 5.6),
          ...ladder(0, 30, 3, 5, 2.4, 12.9),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 28
  {
    name: 'Dream Clouds', theme: 'dream', threat: 3.74, route: ['frost', 'hover', 'arc'],
    feature: 'Hypno gates + dream gates + whirlwinds',
    blurb: 'Dream gates fade in and out, whirlwinds fling your army forward and hypno clouds turn the ghosts.',
    enemy: 'Ghosts: walk through walls',
    stages: [
      {
        tip: 'Dream gates only exist part of the time. Wait for them to glow.',
        waves: { every: 2.8, swarm: 10, ghost: 2, ramp: 0.45 },
        tornados: [{ x: 0, d: 32, r: 1.5, speed: 0.6, amp: 4 }],
        gates: [
          { t: 'mul', v: 2, x: 3.3, d: 10, w: 5.6 },
          { t: 'hypno', needF: 0.006, dur: 6, x: -3.3, d: 14, w: 5.6 },
          ghost({ t: 'mul', v: 6, x: 3.3, d: 19, w: 5.6 }, 1.5, 2.6),
          ghost({ t: 'mul', v: 6, x: -3.3, d: 22, w: 5.6 }, 1.5, 2.6, 1.3),
          ...ladder(0, 38, 2, 4, 2.6, 12.9),
        ],
      },
      {
        tip: 'Whirlwinds throw troops past the walls. Hypnotize the ghost packs.',
        waves: { every: 2.7, swarm: 11, ghost: 3, ramp: 0.45 },
        walls: [{ x: 0, d1: 12, d2: 34 }],
        tornados: [{ x: -3.3, d: 30, r: 1.4, speed: 0.9, amp: 2.4 }],
        gates: [
          { t: 'hypno', needF: 0.008, dur: 7, x: 3.3, d: 12, w: 5.6 },
          ...ladder(-3.3, 12, 2, 4, 4, 5.6),
          ghost({ t: 'mul', v: 8, x: 3.3, d: 22, w: 5.6, mega: true }, 1.4, 2.4),
          ...ladder(3.3, 26, 2, 3, 4, 5.6),
          { t: 'mul', v: 3, x: 0, d: 40, w: 12.9 },
        ],
      },
      {
        tip: 'THE STORM DREAMER! Ride the whirlwind into its heart.',
        boss: { type: 'storm', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, ghost: 3, ramp: 0.45 },
        tornados: [{ x: 0, d: 30, r: 1.5, speed: 0.8, amp: 4.6 }],
        gates: [
          { t: 'hypno', needF: 0.003, dur: 6, x: 0, d: 11, w: 4.6 },
          ...ladder(-4.6, 11, 2, 3, 3, 3.6), ...ladder(4.6, 11, 2, 3, 3, 3.6),
          ghost({ t: 'mul', v: 10, x: 0, d: 20, w: 12.9, mega: true }, 1.6, 2.6),
          ...ladder(0, 24, 2, 4, 2.2, 12.9),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 29
  {
    name: 'Snake Bazaar', theme: 'bazaar', threat: 3.76, route: ['scatter', 'siege', 'flame'],
    feature: 'Hypno charmers + slot stalls',
    blurb: 'Slot stalls spin random prices and red gates breed mummies. Charm them with the hypno gate first.',
    enemy: 'Mummies: rise again once',
    stages: [
      {
        tip: 'Red gates multiply enemies. A hypno gate behind them turns the whole pack.',
        waves: { every: 3.0, swarm: 9, mummy: 1, ramp: 0.4 },
        gates: [
          { t: 'mul', v: 2, x: 3.3, d: 9, w: 5.6 },
          { t: 'slot', opts: [M(2), M(4), D(2), M(6)], period: 1.2, x: 3.3, d: 18, w: 5.6 },
          { t: 'hypno', needF: 0.006, dur: 6, x: -3.3, d: 13, w: 5.6 },
          { t: 'redmul', v: 2, hpF: 0.002, x: -3.3, d: 30, w: 5.6 },
          ...ladder(-3.3, 18, 2, 3, 4, 5.6), ...ladder(3.3, 26, 2, 4, 4, 5.6),
        ],
      },
      {
        tip: 'Spin three stalls at once. Charm the mummies before they rise.',
        waves: { every: 2.7, swarm: 11, mummy: 2, ramp: 0.45 },
        gates: [
          { t: 'hypno', needF: 0.008, dur: 7, x: 0, d: 10, w: 3.9 },
          { t: 'mul', v: 2, x: -4.45, d: 10, w: 4.1 }, { t: 'mul', v: 2, x: 4.45, d: 10, w: 4.1 },
          { t: 'slot', opts: [M(2), M(3), M(5)], period: 1.2, x: -4.45, d: 18, w: 4.1 },
          { t: 'slot', opts: [M(3), M(8), D(3)], period: 0.9, x: 0, d: 18, w: 3.9 },
          { t: 'slot', opts: [M(2), M(3), M(5)], period: 1.3, x: 4.45, d: 18, w: 4.1 },
          ...ladder(0, 25, 2, 6, 2.6, 12.9),
          { t: 'redadd', v: 3, hpF: 0.003, x: -4.45, d: 44, w: 4.1 }, { t: 'redadd', v: 3, hpF: 0.003, x: 4.45, d: 44, w: 4.1 },
        ],
      },
      {
        tip: 'THE SERPENT PHARAOH! Charm his mummies and rush the throne.',
        boss: { type: 'pharaoh', speed: 0.55 },
        waves: { every: 2.7, swarm: 12, mummy: 3, ramp: 0.45 },
        walls: [{ x: 0, d1: 16, d2: 30, slide: { amp: 3.6, speed: 0.7 } }],
        gates: [
          { t: 'hypno', needF: 0.003, dur: 6, x: -3.3, d: 10, w: 5.6 },
          { t: 'slot', opts: [M(3), M(5), D(2), M(9)], period: 1.0, x: 3.3, d: 10, w: 5.6 },
          ...ladder(-4.9, 18, 3, 5, 3.6, 3.0), ...ladder(4.9, 18, 3, 5, 3.6, 3.0),
          ...ladder(0, 32, 2, 4, 2.6, 12.9),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 30
  {
    name: 'Hypno Palace', theme: 'hypno', threat: 3.78, route: ['rail', 'hover', 'plasma'],
    feature: 'Hypno halls + portals + loops',
    blurb: 'Mirror portals, looping halls and hypno gates everywhere. The Mesmer turns your own troops!',
    enemy: 'Ghosts and imps',
    stages: [
      {
        tip: 'Portals warp troops behind the hypno gate. Turned enemies climb the hidden ladder.',
        waves: { every: 2.8, swarm: 10, ghost: 1, imp: 1, ramp: 0.45 },
        walls: [{ x: 2.2, d1: 12, d2: 40 }],
        gates: [
          { t: 'mul', v: 3, x: -2.2, d: 9, w: 8.4 },
          { t: 'portal', x: -4.6, d: 16, w: 3.4, to: { x: 4.4, d: 18 } },
          { t: 'hypno', needF: 0.006, dur: 6, x: 4.4, d: 26, w: 4.0 },
          ...ladder(4.4, 21, 3, 4, 2.4, 4.0), ...ladder(4.4, 30, 5, 7, 3, 4.0),
          ...ladder(-0.6, 18, 2, 4, 5, 4.6),
        ],
      },
      {
        tip: 'The loop sends troops back through the hall, multipliers and all.',
        waves: { every: 2.7, swarm: 11, ghost: 2, imp: 1, ramp: 0.45 },
        gates: [
          { t: 'hypno', needF: 0.007, dur: 7, x: -3.3, d: 10, w: 5.6 },
          { t: 'mul', v: 2, x: 3.3, d: 10, w: 5.6 },
          ...ladder(0, 16, 2, 5, 3, 12.9),
          { t: 'loop', x: 0, d: 30, w: 3.6, to: { x: 0, d: 14 }, max: 1 },
          { t: 'mul', v: 3, x: -4.6, d: 30, w: 3.6 }, { t: 'mul', v: 3, x: 4.6, d: 30, w: 3.6 },
        ],
        spawners: [{ x: -4.6, d: 49, hpF: 0.02, every: 2.6, n: 2, kind: 9, unitHp: 3, style: 'dome' }, { x: 4.6, d: 49, hpF: 0.02, every: 2.6, n: 2, kind: 12, unitHp: 2, style: 'dome' }],
      },
      {
        tip: 'THE MESMER hypnotizes your troops. Keep the stream moving out of the purple bands!',
        boss: { type: 'mesmer', speed: 0.55 },
        waves: { every: 2.7, swarm: 12, ghost: 2, imp: 2, ramp: 0.45 },
        gates: [
          { t: 'hypno', needF: 0.003, dur: 6, x: -4.45, d: 10, w: 4.1 },
          { t: 'mul', v: 3, x: 0, d: 10, w: 3.9 },
          { t: 'hypno', needF: 0.003, dur: 6, x: 4.45, d: 10, w: 4.1 },
          ...ladder(0, 15, 2, 7, 2, 12.9),
          { t: 'loop', x: 0, d: 30, w: 3.4, to: { x: 0, d: 13 }, max: 1 },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 31
  {
    name: 'Gold Rush Mine', theme: 'mine', threat: 3.80, route: ['rifle', 'siege', 'rockets'],
    feature: 'Dynamite carts',
    blurb: 'Push a dynamite cart up its rail with troops. When it reaches the fort: KABOOM!',
    enemy: 'Crabs: armored',
    stages: [
      {
        tip: 'Troops that touch the cart push it. Fill the bar and it rolls into the fort.',
        waves: { every: 2.8, swarm: 10, crab: 1, ramp: 0.45 },
        carts: [{ x: -4.6, d1: 12, d2: 54, needF: 0.05, dmg: 0.18 }],
        gates: [
          { t: 'mul', v: 3, x: 1.5, d: 9, w: 7.6 },
          ...ladder(1.5, 16, 2, 5, 4.4, 7.6),
        ],
      },
      {
        tip: 'Two carts. Multiply first, then push both into the fort.',
        waves: { every: 2.7, swarm: 11, crab: 2, ramp: 0.45 },
        walls: [{ x: -3.3, d1: 10, d2: 44 }, { x: 3.3, d1: 10, d2: 44 }],
        carts: [{ x: -5, d1: 22, d2: 54, needF: 0.04, dmg: 0.15 }, { x: 5, d1: 22, d2: 54, needF: 0.04, dmg: 0.15 }],
        gates: [
          { t: 'mul', v: 2, x: -5, d: 12, w: 2.8 }, { t: 'mul', v: 2, x: 5, d: 12, w: 2.8 },
          ...ladder(0, 12, 2, 6, 4.4, 6.2),
          { t: 'mul', v: 3, x: 0, d: 47, w: 12.9 },
        ],
      },
      {
        tip: 'THE DRILL MECH! Blow it up with the mine carts.',
        boss: { type: 'drill', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, crab: 2, ramp: 0.45 },
        carts: [{ x: 0, d1: 26, d2: 56, needF: 0.03, dmg: 0.12 }],
        belts: [{ x: 0, w: 12.9, v: 2.6, d1: 18, d2: 22 }],
        saws: [{ x: 0, d: 15, r: 1.0, slide: { amp: 5, speed: 0.8 } }],
        gates: [
          ...ladder(-3.3, 9, 2, 3, 3, 5.6), ...ladder(3.3, 9, 2, 3, 3, 5.6),
          { t: 'mul', v: 4, x: -4.45, d: 26, w: 4.0 }, { t: 'mul', v: 4, x: 4.45, d: 26, w: 4.0 },
          ...ladder(-4.45, 30, 2, 4, 3, 4.0), ...ladder(4.45, 30, 2, 4, 3, 4.0),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 32
  {
    name: 'Red Rock Canyon', theme: 'canyon', threat: 3.82, route: ['spider', 'rail', 'squad'],
    feature: 'Canyon carts + toppling rock pillars',
    blurb: 'Narrow canyon rails, toppling sandstone pillars and a cart full of dynamite at every fork.',
    enemy: 'Runners in canyon packs',
    stages: [
      {
        tip: 'Topple the pillar onto the pack, then send the cart down the open rail.',
        waves: { every: 2.8, swarm: 10, runner: 2, ramp: 0.45 },
        walls: [{ x: 1.8, d1: 14, d2: 38 }],
        carts: [{ x: 4.2, d1: 16, d2: 54, needF: 0.05, dmg: 0.18 }],
        pillars: [{ x: -5.6, d: 46, hpF: 0.006 }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 2, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-2.4, 16, 2, 5, 4.6, 7.8),
        ],
      },
      {
        tip: 'The jump pad lands right behind the cart. Give it a shove!',
        waves: { every: 2.7, swarm: 11, runner: 3, ramp: 0.45 },
        walls: [{ x: -2.2, d1: 16, d2: 40 }, { x: 2.2, d1: 16, d2: 40 }],
        carts: [{ x: 0, d1: 24, d2: 54, needF: 0.04, dmg: 0.16 }],
        pillars: [{ x: -5.6, d: 47, hpF: 0.005 }, { x: 5.6, d: 47, hpF: 0.005 }],
        gates: [
          { t: 'mul', v: 3, x: 0, d: 10, w: 12.9 },
          { t: 'jump', x: -4.4, d: 18, w: 3.8, to: { x: 0, d: 20 } },
          ...ladder(4.4, 18, 2, 5, 4.4, 3.8),
          { t: 'mul', v: 2, x: 0, d: 17, w: 4 },
        ],
      },
      {
        tip: 'THE CANYON COMMANDER! His squads march in columns. Blast them with carts.',
        boss: { type: 'commander', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, runner: 3, ramp: 0.45 },
        carts: [{ x: -4.8, d1: 22, d2: 56, needF: 0.025, dmg: 0.1 }, { x: 4.8, d1: 22, d2: 56, needF: 0.025, dmg: 0.1 }],
        pillars: [{ x: -5.6, d: 44, hpF: 0.003 }, { x: 5.6, d: 44, hpF: 0.003 }],
        gates: [
          ...ladder(0, 10, 2, 5, 2.6, 12.9),
          ...ladder(0, 24, 3, 5, 3, 6.6),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 33
  {
    name: 'Ghost Town', theme: 'ghosttown', threat: 3.84, route: ['flame', 'hover', 'arc'],
    feature: 'Ghost carts + fading gates',
    blurb: 'Spectral gates fade in and out over the old rails. Ghosts walk right through the walls.',
    enemy: 'Ghosts: phase through walls',
    stages: [
      {
        tip: 'The fading x8 only exists while it glows. Push the cart in between.',
        waves: { every: 2.8, swarm: 10, ghost: 2, ramp: 0.45 },
        carts: [{ x: 4.6, d1: 14, d2: 54, needF: 0.05, dmg: 0.18 }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 },
          ghost({ t: 'mul', v: 8, x: -2.4, d: 18, w: 7.4, mega: true }, 1.4, 2.6),
          ...ladder(-2.4, 24, 2, 4, 4.2, 7.4),
          { t: 'mul', v: 2, x: 4.6, d: 9, w: 3.4 },
        ],
      },
      {
        tip: 'Fade gates on every lane. Spook the cart into the saloon.',
        waves: { every: 2.7, swarm: 11, ghost: 3, ramp: 0.45 },
        walls: [{ x: 0, d1: 12, d2: 40 }],
        carts: [{ x: -3.3, d1: 30, d2: 54, needF: 0.04, dmg: 0.16 }],
        gates: [
          ghost({ t: 'mul', v: 5, x: -3.3, d: 14, w: 5.6 }, 1.5, 2.5),
          ghost({ t: 'mul', v: 5, x: 3.3, d: 14, w: 5.6 }, 1.5, 2.5, 1.25),
          ...ladder(-3.3, 19, 2, 3, 4, 5.6), ...ladder(3.3, 19, 2, 4, 4, 5.6),
          ghost({ t: 'mul', v: 10, x: 3.3, d: 36, w: 5.6, mega: true }, 1.2, 2.6),
        ],
        turrets: [{ x: 0, d: 47, hpF: 0.015, every: 1.4 }],
      },
      {
        tip: 'THE SKELETON SHERIFF! Bone bands sweep the street. Light the cart!',
        boss: { type: 'skeleton', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, ghost: 3, ramp: 0.45 },
        carts: [{ x: 0, d1: 24, d2: 56, needF: 0.03, dmg: 0.12 }],
        gates: [
          ...ladder(0, 9, 2, 4, 2.6, 12.9),
          ghost({ t: 'mul', v: 6, x: -4.45, d: 22, w: 4.1 }, 1.6, 2.4), ghost({ t: 'mul', v: 6, x: 4.45, d: 22, w: 4.1 }, 1.6, 2.4, 1.2),
          ...ladder(-4.45, 27, 2, 4, 2.6, 4.1), ...ladder(4.45, 27, 2, 4, 2.6, 4.1),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 34
  {
    name: 'Glacier Express', theme: 'glacier', threat: 3.86, route: ['frost', 'rail', 'squad'],
    feature: 'Ice carts + glacier slides',
    blurb: 'Glacier slides carry your army toward the rails. Smash the ice to free the carts.',
    enemy: 'Brutes and shielders',
    stages: [
      {
        tip: 'The slide drifts left onto the rail. Let it carry the stream into the cart.',
        waves: { every: 2.8, swarm: 10, shielder: 1, ramp: 0.45, brute: { every: 4, hp: 14 } },
        belts: [{ x: 0, w: 12.9, v: -2.8, d1: 14, d2: 20 }],
        carts: [{ x: -4.8, d1: 24, d2: 54, needF: 0.05, dmg: 0.18 }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          ...ladder(1.2, 23, 2, 5, 4, 7.4),
        ],
      },
      {
        tip: 'The carts are frozen behind ice. Break it to roll them out.',
        waves: { every: 2.7, swarm: 11, shielder: 2, ramp: 0.45, brute: { every: 3, hp: 16 } },
        walls: [{ x: -2.4, d1: 14, d2: 42 }, { x: 2.4, d1: 14, d2: 42 }],
        carts: [{ x: -4.6, d1: 24, d2: 54, needF: 0.04, dmg: 0.15 }, { x: 4.6, d1: 24, d2: 54, needF: 0.04, dmg: 0.15 }],
        gates: [
          { t: 'mul', v: 3, x: 0, d: 10, w: 12.9 },
          { t: 'ice', hpF: 0.004, x: -4.6, d: 17, w: 3.6 }, { t: 'ice', hpF: 0.004, x: 4.6, d: 17, w: 3.6 },
          ...ladder(0, 16, 2, 6, 4.2, 4.6),
        ],
      },
      {
        tip: 'THE GLACIER BRUTE! Its shockwaves crack the ice. Ram it with carts!',
        boss: { type: 'brute', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, shielder: 2, ramp: 0.45, brute: { every: 3, hp: 18 } },
        belts: [{ x: -3.3, w: 5.6, v: 3, d1: 18, d2: 22 }, { x: 3.3, w: 5.6, v: -3, d1: 18, d2: 22 }],
        carts: [{ x: 0, d1: 26, d2: 56, needF: 0.03, dmg: 0.12 }],
        gates: [
          ...ladder(-3.3, 9, 2, 4, 2.8, 5.6), ...ladder(3.3, 9, 2, 4, 2.8, 5.6),
          ...ladder(-4.6, 26, 3, 5, 3, 3.4), ...ladder(4.6, 26, 3, 5, 3, 3.4),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 35
  {
    name: 'Dynamite Ridge', theme: 'dynamite', threat: 3.88, route: ['rockets', 'titan', 'air'],
    feature: 'Cart races + crushers + rockfall',
    blurb: 'Crushers slam the rails, rocks rain from the cliffs and the Locomotive is coming. Light every fuse!',
    enemy: 'Imps: fast little bombs',
    stages: [
      {
        tip: 'Push the cart between crusher slams.',
        waves: { every: 2.8, swarm: 10, imp: 2, ramp: 0.45 },
        crushers: [{ x: 3.3, d: 22, w: 5.6, period: 2.4 }],
        carts: [{ x: 3.3, d1: 14, d2: 54, needF: 0.05, dmg: 0.2 }],
        gates: [
          { t: 'mul', v: 3, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 2, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-3.3, 16, 2, 5, 4.2, 5.6),
        ],
        meteors: { every: 4.0, r: 2.0 },
      },
      {
        tip: 'Two carts, two crushers. Time the gaps!',
        waves: { every: 2.7, swarm: 11, imp: 2, ramp: 0.45 },
        crushers: [{ x: -4.45, d: 30, w: 4.1, period: 2.2 }, { x: 4.45, d: 30, w: 4.1, period: 2.2, offset: 1.1 }],
        carts: [{ x: -4.45, d1: 22, d2: 54, needF: 0.04, dmg: 0.16 }, { x: 4.45, d1: 22, d2: 54, needF: 0.04, dmg: 0.16 }],
        gates: [
          { t: 'mul', v: 2, x: 0, d: 10, w: 12.9 },
          ...ladder(0, 15, 2, 6, 4.4, 4.0),
          { t: 'mul', v: 2, x: -4.45, d: 15, w: 4.1 }, { t: 'mul', v: 2, x: 4.45, d: 15, w: 4.1 },
        ],
        meteors: { every: 3.4, r: 2.0 },
      },
      {
        tip: 'THE LOCOMOTIVE! It charges down a lane. Derail it with dynamite!',
        boss: { type: 'locomotive', speed: 0.55 },
        waves: { every: 2.7, swarm: 12, imp: 3, ramp: 0.45 },
        crushers: [{ x: 0, d: 20, w: 3.6, period: 2.0 }],
        carts: [{ x: -4.8, d1: 24, d2: 56, needF: 0.025, dmg: 0.1 }, { x: 4.8, d1: 24, d2: 56, needF: 0.025, dmg: 0.1 }],
        gates: [
          ...ladder(-3.3, 9, 2, 4, 3, 5.6), ...ladder(3.3, 9, 2, 4, 3, 5.6),
          ...ladder(0, 26, 3, 6, 2.4, 6.4),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 36
  {
    name: 'Harvest Fields', theme: 'farm', threat: 3.90, route: ['rifle', 'tank', 'rapid'],
    feature: 'Harvest banks',
    blurb: 'Plant troops in a harvest bank. A few seconds later it returns everything inside, multiplied!',
    enemy: 'Drones: crows over the fields',
    stages: [
      {
        tip: 'Troops planted in the bank come back x5 when the timer runs out. Keep planting!',
        waves: { every: 2.8, swarm: 10, drone: 1, ramp: 0.45 },
        gates: [
          { t: 'mul', v: 2, x: 3.3, d: 10, w: 5.6 },
          { t: 'bank', max: 5, ripe: 7, cool: 2.5, x: -3.3, d: 16, w: 5.6 },
          ...ladder(-3.3, 22, 2, 3, 5, 5.6), ...ladder(3.3, 17, 2, 5, 4.6, 5.6),
        ],
      },
      {
        tip: 'Two fields. Plant one, multiply the other, then switch.',
        waves: { every: 2.7, swarm: 11, drone: 2, ramp: 0.45 },
        walls: [{ x: 0, d1: 12, d2: 40 }],
        gates: [
          { t: 'mul', v: 3, x: 0, d: 9, w: 12.9 },
          { t: 'bank', max: 4, ripe: 6, cool: 2, x: -3.3, d: 15, w: 5.6 },
          { t: 'bank', max: 6, ripe: 9, cool: 2, x: 3.3, d: 15, w: 5.6 },
          ...ladder(-3.3, 21, 2, 4, 4, 5.6), ...ladder(3.3, 21, 2, 3, 5, 5.6),
        ],
        spawners: [{ x: 0, d: 50, hpF: 0.02, every: 2.6, n: 3, kind: 7, unitHp: 2, style: 'dome' }],
      },
      {
        tip: 'THE SCARECROW! Crows everywhere. Bank your army and harvest the boss.',
        boss: { type: 'scarecrow', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, drone: 2, ramp: 0.45 },
        gates: [
          ...ladder(0, 9, 2, 4, 2.6, 12.9),
          { t: 'bank', max: 6, ripe: 7, cool: 2.5, x: 0, d: 18, w: 4.6 },
          ...ladder(-4.6, 18, 3, 4, 3.4, 3.6), ...ladder(4.6, 18, 3, 4, 3.4, 3.6),
          ...ladder(0, 26, 2, 4, 2.4, 12.9),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 37
  {
    name: 'Orchard Hills', theme: 'orchard', threat: 3.92, route: ['scatter', 'squad', 'plasma'],
    feature: 'Orchard banks + growing charge gates + rolling apples',
    blurb: 'Charge gates grow with every troop, harvest banks multiply the crop and giant apples roll downhill.',
    enemy: 'Splitters: burst into three',
    stages: [
      {
        tip: 'Feed the charge gate, then plant the crop. Smash the rolling apple!',
        waves: { every: 2.8, swarm: 10, splitter: 1, ramp: 0.45 },
        gates: [
          { t: 'charge', v: 1, max: 10, per: 30, x: 3.3, d: 11, w: 5.6 },
          { t: 'bank', max: 5, ripe: 7, cool: 2.5, x: 3.3, d: 20, w: 5.6 },
          ...ladder(-3.3, 11, 2, 5, 4.4, 5.6),
          { t: 'mul', v: 2, x: 3.3, d: 27, w: 5.6 },
        ],
        balls: [{ x: 0, d: 52, hpF: 0.03, r: 2.2, speed: 1.4, delay: 14, dmg: 2 }],
      },
      {
        tip: 'Three rows of trees. Banks on the sides, charge in the middle.',
        waves: { every: 2.7, swarm: 11, splitter: 2, ramp: 0.45 },
        gates: [
          { t: 'mul', v: 2, x: 0, d: 9, w: 12.9 },
          { t: 'bank', max: 5, ripe: 7, cool: 2, x: -4.45, d: 16, w: 4.1 },
          { t: 'charge', v: 2, max: 16, per: 40, x: 0, d: 16, w: 3.9 },
          { t: 'bank', max: 5, ripe: 7, cool: 2, x: 4.45, d: 16, w: 4.1 },
          ...ladder(0, 23, 2, 6, 2.8, 12.9),
        ],
        balls: [{ x: -3, d: 52, hpF: 0.025, r: 2.2, speed: 1.4, delay: 10, dmg: 2 }, { x: 3, d: 52, hpF: 0.025, r: 2.2, speed: 1.4, delay: 20, dmg: 2 }],
      },
      {
        tip: 'THE PUMPKIN KING returns to the orchard. Harvest everything!',
        boss: { type: 'pumpkin', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, splitter: 2, ramp: 0.45 },
        gates: [
          { t: 'charge', v: 2, max: 20, per: 60, x: -3.3, d: 10, w: 5.6 },
          { t: 'mul', v: 3, x: 3.3, d: 10, w: 5.6 },
          { t: 'bank', max: 6, ripe: 7, cool: 2.5, x: 3.3, d: 18, w: 5.6 },
          ...ladder(-3.3, 17, 2, 4, 2.6, 5.6),
          ...ladder(0, 30, 2, 4, 2.6, 12.9),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 38
  {
    name: 'Bamboo Gardens', theme: 'bamboo', threat: 3.94, route: ['spider', 'rail', 'air'],
    feature: 'Garden banks + sliding bamboo walls + jump pads',
    blurb: 'Bamboo screens slide across the lanes. Jump the walls into the hidden garden banks.',
    enemy: 'Crabs: armored',
    stages: [
      {
        tip: 'The bamboo wall slides. Slip through to the garden bank.',
        waves: { every: 2.8, swarm: 10, crab: 1, ramp: 0.45 },
        walls: [{ x: 0, d1: 14, d2: 36, slide: { amp: 3, speed: 0.8 } }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          { t: 'bank', max: 5, ripe: 7, cool: 2.5, x: -4.6, d: 20, w: 3.4 },
          ...ladder(4.6, 18, 2, 5, 4, 3.4),
          ...ladder(0, 40, 2, 3, 3, 12.9),
        ],
      },
      {
        tip: 'Jump the wall into the walled garden. Its bank pays x8.',
        waves: { every: 2.7, swarm: 11, crab: 2, ramp: 0.45 },
        walls: [{ x: 2.4, d1: 12, d2: 42 }],
        gates: [
          { t: 'mul', v: 3, x: -2, d: 9, w: 8.8 },
          { t: 'jump', x: -4.6, d: 17, w: 3.4, to: { x: 4.5, d: 19 } },
          { t: 'bank', max: 8, ripe: 9, cool: 2.5, x: 4.5, d: 26, w: 3.6 },
          ...ladder(4.5, 31, 2, 3, 4, 3.6),
          ...ladder(-0.6, 17, 2, 6, 4, 5.4),
        ],
        spawners: [{ x: 0, d: 50, hpF: 0.02, every: 2.6, n: 2, kind: 8, unitHp: 6, style: 'dome' }],
      },
      {
        tip: 'THE BAMBOO PANDA! Watch for falling bamboo and bank the boss!',
        boss: { type: 'panda', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, crab: 2, ramp: 0.45 },
        walls: [{ x: -2.2, d1: 16, d2: 30, slide: { amp: 1.5, speed: 0.9 } }, { x: 2.2, d1: 16, d2: 30, slide: { amp: 1.5, speed: 0.9, ph: 3.14 } }],
        gates: [
          ...ladder(0, 9, 2, 4, 2.4, 12.9),
          { t: 'bank', max: 6, ripe: 7, cool: 2.5, x: 0, d: 22, w: 3.4 },
          ...ladder(-4.6, 19, 2, 4, 3.6, 3.4), ...ladder(4.6, 19, 2, 4, 3.6, 3.4),
          { t: 'mul', v: 4, x: 0, d: 33, w: 12.9 },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 39
  {
    name: 'Autumn Woods', theme: 'autumn', threat: 3.96, route: ['flame', 'hover', 'arc'],
    feature: 'Banks + hypno + leaf whirlwinds',
    blurb: 'Leaf whirlwinds toss troops into the harvest banks, and hypno trees turn the spider swarm.',
    enemy: 'Shielders and splitters',
    stages: [
      {
        tip: 'Plant the bank, then hypnotize the pack while it ripens.',
        waves: { every: 2.8, swarm: 11, shielder: 1, splitter: 1, ramp: 0.45 },
        tornados: [{ x: 0, d: 30, r: 1.4, speed: 0.6, amp: 3.6 }],
        gates: [
          { t: 'bank', max: 5, ripe: 7, cool: 2.5, x: -3.3, d: 13, w: 5.6 },
          { t: 'hypno', needF: 0.006, dur: 6, x: 3.3, d: 13, w: 5.6 },
          ...ladder(-3.3, 19, 2, 4, 3.6, 5.6), ...ladder(3.3, 19, 2, 4, 3.6, 5.6),
          { t: 'mul', v: 3, x: 0, d: 40, w: 12.9 },
        ],
      },
      {
        tip: 'The whirlwind flings troops past the hedge into the hidden bank.',
        waves: { every: 2.7, swarm: 12, shielder: 2, splitter: 1, ramp: 0.45 },
        walls: [{ x: -2.2, d1: 12, d2: 40 }],
        tornados: [{ x: 1.8, d: 18, r: 1.4, speed: 0.8, amp: 2.4 }],
        gates: [
          { t: 'mul', v: 3, x: 2.2, d: 9, w: 8.4 },
          { t: 'bank', max: 7, ripe: 8, cool: 2.5, x: -4.4, d: 26, w: 4.0 },
          ...ladder(-4.4, 14, 2, 3, 5, 4.0),
          ...ladder(2.2, 26, 2, 5, 3.2, 8.4),
          { t: 'hypno', needF: 0.008, dur: 6, x: 2.2, d: 16, w: 4 },
        ],
      },
      {
        tip: 'THE AUTUMN SPIDER! Webs slow your stream. Hypnotize its brood!',
        boss: { type: 'spider', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, shielder: 2, splitter: 2, ramp: 0.45 },
        tornados: [{ x: 0, d: 34, r: 1.5, speed: 0.8, amp: 4.4 }],
        gates: [
          { t: 'hypno', needF: 0.003, dur: 6, x: -3.3, d: 10, w: 5.6 },
          { t: 'bank', max: 6, ripe: 7, cool: 2.5, x: 3.3, d: 10, w: 5.6 },
          ...ladder(0, 16, 2, 6, 2.4, 12.9),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 40
  {
    name: 'Sakura Castle', theme: 'sakura', threat: 3.98, route: ['rail', 'railfort', 'squad'],
    feature: 'Blossom banks + temple bumpers + star gates',
    blurb: 'Temple bells bounce your troops, blossom banks multiply them and the star gate doubles every gate.',
    enemy: 'Shielders: armored samurai',
    stages: [
      {
        tip: 'Ring the temple bells, then plant the blossoms.',
        waves: { every: 2.8, swarm: 11, shielder: 2, ramp: 0.45 },
        bumpers: [{ x: -1.6, d: 14, color: 0xff8ac8 }, { x: 1.6, d: 14, color: 0xff8ac8 }],
        gates: [
          { t: 'mul', v: 2, x: -4.6, d: 9, w: 3.6 }, { t: 'mul', v: 2, x: 4.6, d: 9, w: 3.6 },
          { t: 'bank', max: 5, ripe: 7, cool: 2.5, x: -4.9, d: 20, w: 3.0 },
          { t: 'bank', max: 5, ripe: 7, cool: 2.5, x: 4.9, d: 20, w: 3.0 },
          ...ladder(0, 22, 2, 5, 4, 6.4),
        ],
      },
      {
        tip: 'Feed the star once the bank pays out. Every gate doubles.',
        waves: { every: 2.7, swarm: 12, shielder: 2, ramp: 0.45 },
        gates: [
          { t: 'mul', v: 3, x: 0, d: 9, w: 12.9 },
          { t: 'bank', max: 6, ripe: 8, cool: 2, x: -3.3, d: 15, w: 5.6 },
          { t: 'star', needF: 0.01, x: 3.3, d: 15, w: 5.6 },
          ...ladder(-3.3, 21, 2, 4, 4, 5.6), ...ladder(3.3, 21, 2, 4, 4, 5.6),
          { t: 'mul', v: 2, x: 0, d: 38, w: 12.9 },
        ],
        spawners: [{ x: -4.6, d: 50, hpF: 0.015, every: 2.6, n: 2, kind: 3, unitHp: 5, style: 'dome' }, { x: 4.6, d: 50, hpF: 0.015, every: 2.6, n: 2, kind: 3, unitHp: 5, style: 'dome' }],
      },
      {
        tip: 'THE SHOGUN! Twin blade sweeps. Ring every bell!',
        boss: { type: 'shogun', speed: 0.55 },
        waves: { every: 2.7, swarm: 12, shielder: 3, ramp: 0.45 },
        bumpers: [{ x: -3.3, d: 20, color: 0xff8ac8 }, { x: 3.3, d: 20, color: 0xff8ac8 }, { x: 0, d: 26, v: 3, color: 0xffc21a }],
        gates: [
          ...ladder(0, 9, 2, 4, 2.4, 12.9),
          { t: 'bank', max: 6, ripe: 7, cool: 2.5, x: 0, d: 16, w: 3.6 },
          { t: 'star', needF: 0.002, x: -4.6, d: 16, w: 3.4 },
          ...ladder(0, 30, 2, 4, 2.4, 12.9),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 41
  {
    name: 'Dino Valley', theme: 'dino', threat: 4.00, route: ['rifle', 'tank', 'rockets'],
    feature: 'Dinosaur eggs',
    blurb: 'Eggs hatch into raging brutes when their timer runs out. Smash them first and the hatchlings join you!',
    enemy: 'Brutes: hatchling dinos',
    stages: [
      {
        tip: 'Smash the egg before it hatches. The hatchlings join your army.',
        waves: { every: 2.8, swarm: 10, ramp: 0.45, brute: { every: 4, hp: 14 } },
        eggs: [{ x: -3.3, d: 22, hpF: 0.003, hatch: 12, n: 4 }, { x: 3.3, d: 30, hpF: 0.004, hatch: 18, n: 4 }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-3.3, 14, 2, 3, 4, 5.6), ...ladder(3.3, 14, 2, 4, 4, 5.6),
          ...ladder(0, 36, 2, 3, 4, 12.9),
        ],
      },
      {
        tip: 'A nest in every lane. Clear them in order of their timers.',
        waves: { every: 2.7, swarm: 11, ramp: 0.45, brute: { every: 3, hp: 16 } },
        walls: [{ x: -2.2, d1: 14, d2: 38 }, { x: 2.2, d1: 14, d2: 38 }],
        eggs: [
          { x: -4.4, d: 26, hpF: 0.003, hatch: 11, n: 3 }, { x: 0, d: 30, hpF: 0.004, hatch: 16, n: 4 }, { x: 4.4, d: 26, hpF: 0.003, hatch: 21, n: 3 },
        ],
        gates: [
          { t: 'mul', v: 3, x: 0, d: 9, w: 12.9 },
          ...ladder(-4.4, 15, 2, 3, 4, 4.0), ...ladder(4.4, 15, 2, 3, 4, 4.0),
          ...ladder(0, 15, 2, 4, 4, 4.2),
          { t: 'mul', v: 3, x: 0, d: 41, w: 12.9 },
        ],
      },
      {
        tip: 'THE T-REX! It lays eggs as it stomps. Crack them all!',
        boss: { type: 'trex', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, ramp: 0.45, brute: { every: 3, hp: 18 } },
        eggs: [{ x: -4, d: 28, hpF: 0.0015, hatch: 14, n: 3 }, { x: 4, d: 28, hpF: 0.0015, hatch: 20, n: 3 }],
        gates: [
          ...ladder(-3.3, 9, 2, 4, 3, 5.6), ...ladder(3.3, 9, 2, 4, 3, 5.6),
          ...ladder(0, 21, 2, 5, 2.2, 12.9),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 42
  {
    name: 'Misty Swamp', theme: 'swamp', threat: 4.02, route: ['frost', 'hover', 'plasma'],
    feature: 'Swamp nests + currents + sinkholes',
    blurb: 'Currents drag the army past floating nests, and a sinkhole swallows everything nearby.',
    enemy: 'Crabs and swarms',
    stages: [
      {
        tip: 'The current drifts right. Let it carry the stream into the nest.',
        waves: { every: 2.8, swarm: 11, crab: 1, ramp: 0.45 },
        belts: [{ x: 0, w: 12.9, v: 2.6, d1: 12, d2: 18 }],
        eggs: [{ x: 3.6, d: 24, hpF: 0.003, hatch: 18, n: 4, spots: 0x4a8a6a }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 2, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-1.6, 22, 2, 5, 4, 7.0),
          { t: 'mul', v: 3, x: 4.6, d: 32, w: 3.4 },
        ],
      },
      {
        tip: 'Feed the sinkhole for a SUPERNOVA, or smash the nests around it.',
        waves: { every: 2.7, swarm: 12, crab: 2, ramp: 0.45 },
        holes: [{ x: 0, d: 32, r: 1.3, needF: 0.05, mult: 3, dmg: 0.3 }],
        eggs: [{ x: -4.6, d: 24, hpF: 0.003, hatch: 12, n: 3, spots: 0x4a8a6a }, { x: 4.6, d: 24, hpF: 0.003, hatch: 18, n: 3, spots: 0x4a8a6a }],
        gates: [
          { t: 'mul', v: 3, x: 0, d: 9, w: 12.9 },
          ...ladder(-4.6, 14, 2, 3, 4, 3.6), ...ladder(4.6, 14, 2, 3, 4, 3.6),
          ...ladder(0, 14, 2, 4, 4, 3.6),
          { t: 'mul', v: 2, x: -4.6, d: 40, w: 3.6 }, { t: 'mul', v: 2, x: 4.6, d: 40, w: 3.6 },
        ],
      },
      {
        tip: 'THE SWAMP KRAKEN! Tentacles sweep the lanes. Keep the nests clear!',
        boss: { type: 'kraken', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, crab: 2, ramp: 0.45 },
        belts: [{ x: -3.3, w: 5.6, v: 2.6, d1: 18, d2: 22 }, { x: 3.3, w: 5.6, v: -2.6, d1: 18, d2: 22 }],
        eggs: [{ x: 0, d: 26, hpF: 0.0015, hatch: 15, n: 4, spots: 0x4a8a6a, relay: 10 }],
        gates: [
          ...ladder(0, 9, 2, 5, 2.2, 12.9),
          ...ladder(-4.6, 28, 3, 5, 2.6, 3.6), ...ladder(4.6, 28, 3, 5, 2.6, 3.6),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 43
  {
    name: 'Tar Pits', theme: 'tarpit', threat: 4.04, route: ['scatter', 'siege', 'flame'],
    feature: 'Tar nests + bubbling meteors',
    blurb: 'Eggs sink in the tar while burning rocks rain down. Crack them before they hatch.',
    enemy: 'Imps: fast little bombs',
    stages: [
      {
        tip: 'Rocks rain on both armies. Keep the stream on the eggs.',
        waves: { every: 2.8, swarm: 10, imp: 2, ramp: 0.45 },
        meteors: { every: 3.6, r: 2.0 },
        eggs: [{ x: 0, d: 20, hpF: 0.003, hatch: 11, n: 4, spots: 0x2a2a2a }, { x: -4.4, d: 32, hpF: 0.004, hatch: 17, n: 4, spots: 0x2a2a2a }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          ...ladder(3.6, 15, 2, 5, 4, 5),
          ...ladder(-3.6, 15, 2, 3, 4.6, 5),
        ],
      },
      {
        tip: 'Turrets guard the nests. Topple them with the pillars!',
        waves: { every: 2.7, swarm: 11, imp: 3, ramp: 0.45 },
        meteors: { every: 3.2, r: 2.0 },
        pillars: [{ x: -5.6, d: 40, hpF: 0.004 }, { x: 5.6, d: 40, hpF: 0.004 }],
        eggs: [{ x: -2, d: 26, hpF: 0.003, hatch: 12, n: 4, spots: 0x2a2a2a }, { x: 2, d: 26, hpF: 0.003, hatch: 19, n: 4, spots: 0x2a2a2a }],
        gates: [
          { t: 'mul', v: 3, x: 0, d: 9, w: 12.9 },
          ...ladder(0, 14, 2, 5, 2.4, 12.9),
          { t: 'mul', v: 4, x: -4.8, d: 32, w: 3 }, { t: 'mul', v: 4, x: 4.8, d: 32, w: 3 },
        ],
        turrets: [{ x: -4, d: 46, hpF: 0.012, every: 1.5 }, { x: 4, d: 46, hpF: 0.012, every: 1.5 }],
      },
      {
        tip: 'THE MAGMA BEHEMOTH! Fire breath and meteors. Do not let the eggs hatch!',
        boss: { type: 'magma', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, imp: 3, ramp: 0.45 },
        eggs: [{ x: -3.6, d: 24, hpF: 0.0015, hatch: 13, n: 4, spots: 0x2a2a2a, relay: 12 }, { x: 3.6, d: 24, hpF: 0.0015, hatch: 19, n: 4, spots: 0x2a2a2a, relay: 12 }],
        gates: [
          ...ladder(0, 9, 2, 5, 2.4, 12.9),
          ...ladder(0, 28, 3, 5, 2.6, 6),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 44
  {
    name: 'Amber Caves', theme: 'amber', threat: 4.06, route: ['rail', 'railfort', 'air'],
    feature: 'Amber eggs + cave carts',
    blurb: 'Fossil eggs sit beside old mine rails. Crack the eggs, then roll the carts into the cave fort.',
    enemy: 'Crabs: armored',
    stages: [
      {
        tip: 'The egg blocks the rail. Smash it, then push the cart.',
        waves: { every: 2.8, swarm: 11, crab: 1, ramp: 0.45 },
        eggs: [{ x: -4.6, d: 16, hpF: 0.003, hatch: 14, n: 4, spots: 0xd08a2a }],
        carts: [{ x: -4.6, d1: 22, d2: 54, needF: 0.05, dmg: 0.18 }],
        gates: [
          { t: 'mul', v: 3, x: 1.4, d: 9, w: 7.8 },
          ...ladder(1.4, 15, 2, 5, 4.4, 7.8),
        ],
      },
      {
        tip: 'Two nests, one cart, a crystal pillar. Pick your order.',
        waves: { every: 2.7, swarm: 12, crab: 2, ramp: 0.45 },
        walls: [{ x: 0, d1: 14, d2: 42 }],
        eggs: [{ x: -3.3, d: 22, hpF: 0.003, hatch: 12, n: 4, spots: 0xd08a2a }, { x: 3.3, d: 30, hpF: 0.004, hatch: 18, n: 4, spots: 0xd08a2a }],
        carts: [{ x: 3.3, d1: 34, d2: 54, needF: 0.04, dmg: 0.16 }],
        pillars: [{ x: -5.6, d: 46, hpF: 0.004 }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-3.3, 27, 2, 4, 4, 5.6), ...ladder(3.3, 14, 2, 4, 4.4, 5.6),
        ],
      },
      {
        tip: 'THE AMBER TITAN! Everything it has. Carts and eggs together!',
        boss: { type: 'titan', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, crab: 2, ramp: 0.45 },
        eggs: [{ x: 0, d: 20, hpF: 0.0015, hatch: 12, n: 4, spots: 0xd08a2a, relay: 12 }],
        carts: [{ x: -4.8, d1: 26, d2: 56, needF: 0.025, dmg: 0.1 }, { x: 4.8, d1: 26, d2: 56, needF: 0.025, dmg: 0.1 }],
        gates: [
          ...ladder(-3.3, 9, 2, 4, 2.6, 5.6), ...ladder(3.3, 9, 2, 4, 2.6, 5.6),
          ...ladder(0, 25, 3, 5, 2.6, 6.6),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 45
  {
    name: 'Sky Nest', theme: 'nest', threat: 4.08, route: ['spider', 'hover', 'titan'],
    feature: 'Cliff nests that lay again + updrafts',
    blurb: 'Nests lay new eggs after a hatch or a smash. Updrafts and jump pads carry troops between ledges.',
    enemy: 'Drones and runners',
    stages: [
      {
        tip: 'This nest lays again. Keep cracking it for more hatchlings.',
        waves: { every: 2.8, swarm: 10, drone: 2, runner: 1, ramp: 0.45 },
        eggs: [{ x: 3.3, d: 22, hpF: 0.002, hatch: 10, n: 3, relay: 6, spots: 0x8a6ad0 }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          { t: 'jump', x: -3.3, d: 16, w: 5.6, to: { x: 3.3, d: 26 } },
          ...ladder(3.3, 30, 2, 5, 3.4, 5.6),
          ...ladder(-3.3, 26, 3, 4, 5, 5.6),
        ],
      },
      {
        tip: 'The updraft flings troops over the ledge into the nest lane.',
        waves: { every: 2.7, swarm: 11, drone: 2, runner: 2, ramp: 0.45 },
        walls: [{ x: 2.2, d1: 12, d2: 40 }],
        tornados: [{ x: -2, d: 20, r: 1.4, speed: 0.7, amp: 2.6 }],
        eggs: [{ x: 4.4, d: 28, hpF: 0.003, hatch: 12, n: 4, relay: 8, spots: 0x8a6ad0 }, { x: -2, d: 34, hpF: 0.003, hatch: 18, n: 3, spots: 0x8a6ad0 }],
        gates: [
          { t: 'mul', v: 3, x: -2.1, d: 9, w: 8.6 },
          { t: 'jump', x: -5.4, d: 15, w: 2, to: { x: 4.4, d: 18 } },
          ...ladder(4.4, 20, 3, 5, 3.4, 4),
          ...ladder(-2.1, 25, 2, 4, 3, 8.6),
        ],
      },
      {
        tip: 'THE GREAT ROC! It drops eggs from the sky. Crack them as they land!',
        boss: { type: 'roc', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, drone: 3, runner: 2, ramp: 0.45 },
        tornados: [{ x: 0, d: 34, r: 1.5, speed: 0.8, amp: 4.4 }],
        gates: [
          ...ladder(-3.3, 9, 2, 4, 3, 5.6), ...ladder(3.3, 9, 2, 4, 3, 5.6),
          { t: 'jump', x: 0, d: 20, w: 3, to: { x: 0, d: 28 } },
          ...ladder(-4.6, 20, 2, 4, 3, 3.6), ...ladder(4.6, 20, 2, 4, 3, 3.6),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 46
  {
    name: 'Prism Labs', theme: 'prismlab', threat: 4.10, route: ['rifle', 'titan', 'plasma'],
    feature: 'Fusion cores',
    blurb: 'Charge both cores of a pair within a few seconds and a fusion beam multiplies everything crossing it.',
    enemy: 'Shielders and drones',
    stages: [
      {
        tip: 'Charge one core, then swing to the other before it fades. FUSION!',
        waves: { every: 2.8, swarm: 11, shielder: 1, drone: 1, ramp: 0.45 },
        fusion: [{ d: 26, x1: -4.8, x2: 4.8, needF: 0.01, hold: 6, dur: 6, v: 3, dmg: 0.1 }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-3.3, 14, 2, 3, 4.4, 5.6), ...ladder(3.3, 14, 2, 3, 4.4, 5.6),
          ...ladder(0, 31, 2, 5, 3.4, 7.2),
        ],
      },
      {
        tip: 'Walls split the cores. Use the portal to reach the far one.',
        waves: { every: 2.7, swarm: 12, shielder: 2, drone: 1, ramp: 0.45 },
        walls: [{ x: 0, d1: 12, d2: 30 }],
        fusion: [{ d: 24, x1: -5, x2: 5, needF: 0.01, hold: 6, dur: 6, v: 4, dmg: 0.1 }],
        gates: [
          { t: 'mul', v: 3, x: -3.3, d: 10, w: 5.6 }, { t: 'mul', v: 2, x: 3.3, d: 10, w: 5.6 },
          { t: 'portal', x: -1.5, d: 16, w: 2.6, to: { x: 4.4, d: 18 } },
          ...ladder(-3.5, 18, 2, 3, 3, 3.6), ...ladder(2.2, 15, 2, 3, 3, 4),
          ...ladder(0, 32, 2, 5, 3, 12.9),
        ],
        turrets: [{ x: 0, d: 48, hpF: 0.015, every: 1.4 }],
      },
      {
        tip: 'THE LUNAR LAB GUARDIAN! Fuse the cores while it bombards the labs.',
        boss: { type: 'moon', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, shielder: 2, drone: 2, ramp: 0.45 },
        fusion: [{ d: 24, x1: -4.6, x2: 4.6, needF: 0.003, hold: 6, dur: 6, v: 3, dmg: 0.08 }],
        gates: [
          ...ladder(0, 9, 2, 5, 2.4, 12.9),
          ...ladder(0, 29, 2, 4, 2.6, 7.4),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 47
  {
    name: 'Aurora Tundra', theme: 'aurora', threat: 4.12, route: ['frost', 'railfort', 'air'],
    feature: 'Aurora cores + ice slides',
    blurb: 'Ice slides push the army across the cores. Fuse them for a beam of northern light.',
    enemy: 'Ghosts and brutes',
    stages: [
      {
        tip: 'The slide carries troops across both cores. Ride it at the right moment.',
        waves: { every: 2.8, swarm: 11, ghost: 1, ramp: 0.45, brute: { every: 4, hp: 14 } },
        belts: [{ x: 0, w: 12.9, v: 3.2, d1: 18, d2: 24 }],
        fusion: [{ d: 28, x1: -4.6, x2: 4.6, needF: 0.01, hold: 6, dur: 6, v: 3, dmg: 0.1 }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          ...ladder(0, 13, 2, 3, 3.6, 12.9),
          ...ladder(0, 33, 2, 4, 3.4, 7),
        ],
      },
      {
        tip: 'Ice blocks guard the cores. Break them, then fuse!',
        waves: { every: 2.7, swarm: 12, ghost: 2, ramp: 0.45, brute: { every: 3, hp: 16 } },
        fusion: [{ d: 30, x1: -5, x2: 5, needF: 0.01, hold: 5, dur: 6, v: 4, dmg: 0.1 }],
        gates: [
          { t: 'mul', v: 3, x: 0, d: 9, w: 12.9 },
          { t: 'ice', hpF: 0.003, x: -5, d: 22, w: 2.8 }, { t: 'ice', hpF: 0.003, x: 5, d: 22, w: 2.8 },
          ...ladder(0, 14, 2, 6, 3, 5.6),
          { t: 'mul', v: 2, x: 0, d: 36, w: 12.9 },
        ],
      },
      {
        tip: 'THE AURORA DRAGON! Frost breath across the tundra. FUSE!',
        boss: { type: 'dragon', speed: 0.5 },
        waves: { every: 2.7, swarm: 12, ghost: 2, ramp: 0.45, brute: { every: 3, hp: 18 } },
        belts: [{ x: 0, w: 12.9, v: -2.8, d1: 14, d2: 18 }],
        fusion: [{ d: 24, x1: -4.8, x2: 4.8, needF: 0.003, hold: 6, dur: 6, v: 3, dmg: 0.08 }],
        gates: [
          ...ladder(-3.3, 9, 2, 3, 2.4, 5.6), ...ladder(3.3, 9, 2, 3, 2.4, 5.6),
          ...ladder(0, 29, 2, 5, 2.4, 7.2),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 48
  {
    name: 'Chrono Clockworks', theme: 'chrono', threat: 4.14, route: ['arc', 'spider', 'titan'],
    feature: 'Clock cores + crushers + flip gates',
    blurb: 'Crushers tick like clockwork and flip gates swing on the beat. Fuse the cores between the slams.',
    enemy: 'Crabs and shielders',
    stages: [
      {
        tip: 'Charge the cores between crusher slams.',
        waves: { every: 2.8, swarm: 11, crab: 1, ramp: 0.45 },
        crushers: [{ x: -4.6, d: 20, w: 3.4, period: 2.4 }, { x: 4.6, d: 20, w: 3.4, period: 2.4, offset: 1.2 }],
        fusion: [{ d: 26, x1: -4.6, x2: 4.6, needF: 0.01, hold: 6, dur: 6, v: 3, dmg: 0.1 }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          flip(4, 2, 1.6, 0, 16, 5.4),
          ...ladder(0, 31, 2, 5, 3.4, 7),
        ],
      },
      {
        tip: 'Two pairs of cores. Each fusion beam stacks with the next.',
        waves: { every: 2.7, swarm: 12, crab: 2, shielder: 1, ramp: 0.45 },
        crushers: [{ x: 0, d: 14, w: 4, period: 2.2 }],
        fusion: [
          { d: 20, x1: -4.8, x2: 4.8, needF: 0.006, hold: 6, dur: 6, v: 2, dmg: 0.06 },
          { d: 34, x1: -4.8, x2: 4.8, needF: 0.012, hold: 6, dur: 6, v: 4, dmg: 0.1 },
        ],
        gates: [
          { t: 'mul', v: 3, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          flip(5, 2, 1.8, -2.2, 26, 3.6), flip(5, 2, 1.8, 2.2, 26, 3.6),
          ...ladder(0, 39, 2, 3, 3, 12.9),
        ],
      },
      {
        tip: 'THE CLOCKWORK COLOSSUS! It slows time with golden fields. Fuse faster!',
        boss: { type: 'clockwork', speed: 0.55 },
        waves: { every: 2.7, swarm: 12, crab: 2, shielder: 2, ramp: 0.45 },
        crushers: [{ x: 0, d: 18, w: 3.6, period: 2.0 }],
        fusion: [{ d: 26, x1: -4.8, x2: 4.8, needF: 0.003, hold: 6, dur: 6, v: 3, dmg: 0.08 }],
        gates: [
          ...ladder(-3.3, 9, 2, 4, 2.4, 5.6), ...ladder(3.3, 9, 2, 4, 2.4, 5.6),
          flip(10, 2, 1.5, 0, 31, 4.4, ),
          ...ladder(-4.6, 30, 2, 3, 3, 3.4), ...ladder(4.6, 30, 2, 3, 3, 3.4),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 49
  {
    name: 'Nebula Reef', theme: 'nebula', threat: 4.16, route: ['plasma', 'hover', 'air'],
    feature: 'Star cores + nebula bumpers + black holes',
    blurb: 'Nebula bumpers bounce troops between the cores while a black hole waits to go SUPERNOVA.',
    enemy: 'Imps and ghosts',
    stages: [
      {
        tip: 'Bounce off the nebula bumpers to reach both cores.',
        waves: { every: 2.8, swarm: 11, imp: 1, ghost: 1, ramp: 0.45 },
        bumpers: [{ x: 0, d: 16, color: 0x8a6aff }],
        fusion: [{ d: 26, x1: -4.4, x2: 4.4, needF: 0.01, hold: 6, dur: 6, v: 3, dmg: 0.1 }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-3.3, 20, 2, 3, 3, 3.4), ...ladder(3.3, 20, 2, 3, 3, 3.4),
          ...ladder(0, 31, 2, 5, 3.4, 7),
        ],
      },
      {
        tip: 'The fusion beam feeds the black hole. Then: SUPERNOVA.',
        waves: { every: 2.7, swarm: 12, imp: 2, ghost: 2, ramp: 0.45 },
        bumpers: [{ x: -3.3, d: 14, color: 0x8a6aff }, { x: 3.3, d: 14, color: 0x8a6aff }],
        fusion: [{ d: 22, x1: -5, x2: 5, needF: 0.008, hold: 6, dur: 6, v: 3, dmg: 0.08 }],
        holes: [{ x: 0, d: 36, r: 1.3, needF: 0.05, mult: 3, dmg: 0.3 }],
        gates: [
          { t: 'mul', v: 3, x: 0, d: 9, w: 3.6 },
          ...ladder(-4.6, 26, 2, 4, 3, 3.4), ...ladder(4.6, 26, 2, 4, 3, 3.4),
          { t: 'mul', v: 2, x: 0, d: 28, w: 4 },
        ],
      },
      {
        tip: 'THE NEBULA THUNDER GOD! Lightning everywhere. Fuse and bounce!',
        boss: { type: 'thunder', speed: 0.55 },
        waves: { every: 2.7, swarm: 12, imp: 2, ghost: 2, ramp: 0.45 },
        bumpers: [{ x: -2.4, d: 15, color: 0x8a6aff }, { x: 2.4, d: 15, color: 0x8a6aff }],
        fusion: [{ d: 24, x1: -4.8, x2: 4.8, needF: 0.003, hold: 6, dur: 6, v: 3, dmg: 0.08 }],
        holes: [{ x: 0, d: 40, r: 1.4, needF: 0.08, mult: 3, dmg: 0.2 }],
        gates: [
          ...ladder(0, 9, 2, 3, 2.4, 12.9),
          ...ladder(0, 28, 2, 4, 2.4, 7),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 50
  {
    name: 'Singularity Throne', theme: 'throne', threat: 4.18, route: ['siege', 'titan', 'air'],
    feature: 'Every late mechanic at once',
    blurb: 'Bumpers, hypno gates, carts, banks, eggs and fusion cores guard the throne of the Overlord.',
    enemy: 'Every enemy, the Overlord',
    stages: [
      {
        tip: 'Bounce, hypnotize, plant and push. Every trick you have learned.',
        waves: { every: 2.8, swarm: 11, runner: 1, ghost: 1, imp: 1, ramp: 0.45 },
        bumpers: [{ x: -1.6, d: 14, color: 0xb07aff }, { x: 1.6, d: 14, color: 0xb07aff }],
        carts: [{ x: 5.2, d1: 26, d2: 54, needF: 0.04, dmg: 0.15 }],
        gates: [
          { t: 'mul', v: 2, x: -4.6, d: 9, w: 3.6 }, { t: 'mul', v: 2, x: 4.6, d: 9, w: 3.6 },
          { t: 'hypno', needF: 0.006, dur: 6, x: -4.6, d: 19, w: 3.4 },
          { t: 'bank', max: 5, ripe: 7, cool: 2.5, x: 4.6, d: 19, w: 3.4 },
          ...ladder(0, 21, 2, 5, 3.4, 5.2),
        ],
      },
      {
        tip: 'Nests, cores and a star. Build the biggest army in history.',
        waves: { every: 2.7, swarm: 12, runner: 2, ghost: 2, imp: 1, ramp: 0.45 },
        eggs: [{ x: 0, d: 16, hpF: 0.003, hatch: 12, n: 4, spots: 0xb07aff }],
        fusion: [{ d: 30, x1: -5, x2: 5, needF: 0.01, hold: 6, dur: 6, v: 4, dmg: 0.1 }],
        gates: [
          { t: 'mul', v: 3, x: -3.3, d: 9, w: 5.6 }, { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-3.6, 20, 2, 4, 3, 4.6), ...ladder(3.6, 20, 2, 4, 3, 4.6),
          { t: 'star', needF: 0.008, x: 0, d: 36, w: 3.6 },
          { t: 'mul', v: 3, x: -4.6, d: 37, w: 3.4 }, { t: 'mul', v: 3, x: 4.6, d: 37, w: 3.4 },
        ],
      },
      {
        tip: 'THE OVERLORD! Every attack from every world. End it!',
        boss: { type: 'overlord', speed: 0.55 },
        waves: { every: 2.7, swarm: 12, runner: 2, ghost: 2, imp: 2, ramp: 0.45 },
        bumpers: [{ x: 0, d: 22, v: 3, r: 1.0, color: 0xffc21a }],
        carts: [{ x: -5.2, d1: 24, d2: 56, needF: 0.02, dmg: 0.08 }],
        fusion: [{ d: 30, x1: -3.6, x2: 5, needF: 0.003, hold: 6, dur: 6, v: 3, dmg: 0.06 }],
        gates: [
          { t: 'hypno', needF: 0.002, dur: 6, x: -4.45, d: 9, w: 4.1 },
          { t: 'mul', v: 3, x: 0, d: 9, w: 3.9 },
          { t: 'bank', max: 6, ripe: 7, cool: 2.5, x: 4.45, d: 9, w: 4.1 },
          ...ladder(0, 13, 2, 5, 2, 12.9),
          ...ladder(0.7, 36, 2, 4, 2.4, 8.6),
        ],
      },
    ],
  },
];

// Fort and boss HP per stage, calibrated with the seed-42 smart bot (tools/calibrate-late.mjs).
const HP = [
  [6.65e3, 2.72e3, 6.76e5], // 21
  [1.08e5, 1.2e5, 5.65e5], // 22
  [2e3, 3.8e4, 3.22e6], // 23
  [9.32e3, 3.73e4, 1.13e6], // 24
  [9.79e3, 4.62e4, 1.62e5], // 25
  [5.19e3, 1.5e4, 6.48e6], // 26
  [2e3, 7.14e4, 1.89e5], // 27
  [1.14e4, 2.89e4, 7.93e5], // 28
  [2e3, 7e5, 1.18e6], // 29
  [2.75e4, 3.2e6, 2.91e10], // 30
  [7.5e3, 8.35e4, 1.11e5], // 31
  [1.07e5, 2.67e5, 1.88e6], // 32
  [1.25e4, 2e3, 2.5e5], // 33
  [3.53e4, 1.5e5, 1.4e5], // 34
  [2.78e4, 5e4, 8.67e6], // 35
  [9.98e3, 3.86e4, 4.32e6], // 36
  [1.38e4, 4.41e5, 1.36e5], // 37
  [7.92e5, 5.89e5, 1.57e6], // 38
  [1.2e4, 9.49e3, 2.67e6], // 39
  [1.91e4, 5.02e5, 6e6], // 40
  [8.37e3, 9.83e3, 1e6], // 41
  [1e4, 2.23e4, 4.13e6], // 42
  [9.09e3, 1.7e5, 9.82e5], // 43
  [1.51e4, 3.44e4, 2.54e5], // 44
  [1.28e5, 1.92e5, 4.35e6], // 45
  [2.09e4, 2.88e5, 4.51e6], // 46
  [9.07e3, 1.12e6, 1.96e5], // 47
  [3.42e4, 2.18e4, 1.33e6], // 48
  [4.14e4, 9.81e3, 3.09e5], // 49
  [2.75e4, 1.42e6, 1.06e8], // 50
];

export const LATE_LEVELS = WORLDS.map((world, k) => ({
  ...world,
  calibrated: true,
  stages: world.stages.map((stage, si) => (stage.boss
    ? { ...stage, boss: { ...stage.boss, hp: HP[k][si] } }
    : { ...stage, tower: HP[k][si] })),
}));
