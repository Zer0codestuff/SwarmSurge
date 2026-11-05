// Levels 11-20. Same format as levels.js, plus the new parts:
//   belts:     { x, w, v, d1, d2 }            conveyor: pushes everything on it sideways at v units/s
//   slot:      gate { opts: [gate, ...], period } rolls a random face every `period` s
//   jump:      gate { to: { x, d } }           trampoline: units fly over everything and land at `to`
//   loop:      gate { to: { x, d }, max }      sends units back down the road with every gate fresh again
//   phase:     on any gate { on, period, off } the gate only exists `on` s out of every `period`
//   heart:     absorber { need, v }            +v lives (refillable, 2.5x the price each time)
//   hangar:    absorber { need }               +1 squad cannon for the rest of the level
//   tesla:     absorber { need, every, zaps, range, dmg } once charged it zaps red units nearby forever
//   redmul / redadd: red gates { v, hp }       multiply RED units walking through; break them with `hp` power
//   pillars:   { x, d, hp, fall }              smash one and it topples across the road, crushing reds
//   tornados:  { x, d, r, speed, amp }         flings your units forward, shreds red units
//   holes:     { x, d, r, need, mult, dmg }    black hole: eats everything; feed it `need` power -> SUPERNOVA
//   balls:     { x, d, hp, r, speed, delay, dmg } a rolling ball of red units: smash it or lose `dmg` lives
//   meteors:   stage { every, r, n }           rocks rain on your army (and on theirs)
//   walls:     { slide: { amp, speed, ph } }   sliding walls
//   spawners:  { style: 'rival', slide }       the rival cannon: fires fast red units at you
import { ladder, stack } from './levelkit.js';

const M = (v) => ({ t: 'mul', v });
const D = (v) => ({ t: 'div', v });

export const MORE_LEVELS = [
  // ------------------------------------------------------------------ 11
  {
    name: 'Clockwork Factory',
    theme: 'factory',
    threat: 1.9,
    feature: 'Conveyor belts + squad hangar',
    blurb: 'Belts drag your army sideways: aim ahead! Fill the hangar to deploy extra cannons.',
    enemy: 'Drones: fly straight over walls',
    stages: [
      {
        tip: 'The belt drags your army LEFT. Aim right to land in the gold x10!',
        tower: 15000,
        waves: { every: 3.0, swarm: 7, drone: 1, ramp: 0.4 },
        belts: [{ x: 0, w: 12.9, v: -3.4, d1: 13, d2: 21 }],
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 },
          { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          { t: 'mul', v: 3, x: -4.45, d: 25, w: 4.1 },
          { t: 'mul', v: 2, x: 0, d: 25, w: 3.9 },
          { t: 'mul', v: 10, x: 5.0, d: 25, w: 2.9, color: 'gold' },
          { t: 'hangar', need: 60, x: -3.3, d: 33, w: 5.6 },
          ...ladder(3.3, 31, 2, 4, 4, 5.6),
        ],
      },
      {
        tip: 'Both belts push into the middle: the narrow ladder catches EVERYTHING.',
        tower: 85000,
        waves: { every: 3.0, swarm: 9, drone: 2, ramp: 0.45 },
        walls: [{ x: -2.2, d1: 8, d2: 16 }, { x: 2.2, d1: 8, d2: 16 }],
        belts: [{ x: -4.3, w: 4.3, v: 4, d1: 19, d2: 27 }, { x: 4.3, w: 4.3, v: -4, d1: 19, d2: 27 }],
        gates: [
          { t: 'upgrade', up: 'barrel', need: 50, x: -4.45, d: 11, w: 4.1 },
          { t: 'mul', v: 3, x: 0, d: 11, w: 3.9 },
          { t: 'hangar', need: 300, x: 4.45, d: 11, w: 4.1 },
          ...ladder(0, 30, 2, 6, 3, 4.2),
          { t: 'div', v: 3, x: -4.6, d: 34, w: 3.6 },
          { t: 'div', v: 3, x: 4.6, d: 34, w: 3.6 },
        ],
        spawners: [{ x: 0, d: 50, hp: 4000, every: 2.6, n: 3, kind: 7, style: 'dome' }],
      },
      {
        tip: 'DRILL MECH! It bores trenches through your army. Squad up and melt it!',
        boss: { type: 'drill', hp: 3.6e6, speed: 0.5 },
        waves: { every: 3.0, swarm: 10, drone: 3, ramp: 0.45 },
        belts: [{ x: 0, w: 12.9, v: 3.2, d1: 20, d2: 26 }],
        gates: [
          { t: 'upgrade', up: 'power', need: 60, x: -3.3, d: 9, w: 5.6 },
          { t: 'hangar', need: 400, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-3.3, 14, 2, 3, 3, 5.6),
          { t: 'mul', v: 3, x: 3.3, d: 15, w: 5.6 },
          { t: 'mul', v: 2, x: -3.3, d: 30, w: 5.6 },
          { t: 'mul', v: 8, x: 4.9, d: 30, w: 2.9, mega: true },
          { t: 'mul', v: 4, x: 1.5, d: 30, w: 3.4 },
          ...ladder(0, 35, 5, 7, 2.2, 12.9),
        ],
        saws: [{ x: 0, d: 22.5, r: 1.1, slide: { amp: 5.2, speed: 0.8 } }],
      },
    ],
  },
  // ------------------------------------------------------------------ 12
  {
    name: 'Lucky Casino',
    theme: 'casino',
    threat: 2.0,
    feature: 'Slot-machine gates',
    blurb: 'Slot gates spin to a random face every second. Time your shots on the JACKPOT!',
    enemy: 'Imps: fast little bombs',
    stages: [
      {
        tip: 'Slot gates re-roll all the time. Hit them on x10, dodge the ÷!',
        tower: 30000,
        waves: { every: 3.0, swarm: 8, imp: 1, ramp: 0.4 },
        gates: [
          { t: 'mul', v: 2, x: -3.3, d: 9, w: 5.6 },
          { t: 'mul', v: 2, x: 3.3, d: 9, w: 5.6 },
          { t: 'slot', opts: [M(2), M(3), D(2), M(7)], period: 1.3, x: -3.3, d: 19, w: 5.6 },
          { t: 'slot', opts: [M(3), M(4), D(3), M(10)], period: 1.1, x: 3.3, d: 19, w: 5.6 },
          { t: 'mul', v: 3, x: 0, d: 29, w: 5 },
          { t: 'slot', opts: [M(2), M(25), D(5)], period: 0.9, x: 0, d: 38, w: 3, mega: true },
        ],
      },
      {
        tip: 'Feed the STAR: it doubles every face of every slot!',
        tower: 37000,
        waves: { every: 3.0, swarm: 9, imp: 2, ramp: 0.45 },
        walls: [{ x: 0, d1: 8, d2: 40 }],
        gates: [
          { t: 'upgrade', up: 'rapid', need: 80, x: -3.3, d: 10, w: 5.6 },
          { t: 'star', need: 400, x: -3.3, d: 18, w: 5.6 },
          { t: 'slot', opts: [M(3), M(5), D(2), M(8)], period: 1.2, x: -3.3, d: 27, w: 5.6 },
          { t: 'slot', opts: [M(2), M(4), D(4), M(12)], period: 1.0, x: -3.3, d: 35, w: 5.6 },
          ...stack('slot', 0, 3.3, 12, 5, 5, 5.6).map((g, k) => ({ ...g, opts: [M(2 + k), M(3 + k), D(2)], period: 1.0 + k * 0.15 })),
        ],
        spawners: [
          { x: -4.6, d: 48, hp: 3000, every: 3.0, n: 2, kind: 12, unitHp: 2, style: 'dome' },
          { x: 4.6, d: 48, hp: 3000, every: 3.0, n: 2, kind: 12, unitHp: 2, style: 'dome' },
        ],
      },
      {
        tip: 'THE HIGH ROLLER rerolls your slots and throws dice. Beat the house!',
        boss: { type: 'dice', hp: 2e6, speed: 0.5 },
        waves: { every: 3.0, swarm: 10, imp: 3, ramp: 0.45 },
        gates: [
          { t: 'upgrade', up: 'twin', need: 80, x: -3.3, d: 9, w: 5.6 },
          { t: 'upgrade', up: 'power', need: 100, x: 3.3, d: 9, w: 5.6 },
          { t: 'slot', opts: [M(2), M(3), M(5)], period: 1.2, x: -4.45, d: 17, w: 4.1 },
          { t: 'slot', opts: [M(3), M(6), D(3)], period: 0.9, x: 0, d: 17, w: 3.9 },
          { t: 'slot', opts: [M(2), M(3), M(5)], period: 1.3, x: 4.45, d: 17, w: 4.1 },
          ...ladder(0, 24, 2, 6, 2.5, 12.9),
          { t: 'slot', opts: [M(5), M(50), D(10)], period: 0.8, x: 0, d: 38, w: 3.4, mega: true },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 13
  {
    name: 'Coral Coast',
    theme: 'coral',
    threat: 2.1,
    feature: 'Jump pads + rolling swarm balls',
    blurb: 'Bounce pads fling your army over walls into secret lanes. Smash the rolling balls of 999!',
    enemy: 'Crabs: armored, hard to kill',
    stages: [
      {
        tip: 'JUMP PAD! Your army flies over the wall into the gold lane.',
        tower: 100000,
        waves: { every: 3.0, swarm: 8, crab: 1, ramp: 0.4 },
        walls: [{ x: 2.2, d1: 8, d2: 46 }],
        gates: [
          { t: 'mul', v: 2, x: -2.1, d: 9, w: 8.6 },
          { t: 'jump', x: -2.1, d: 16, w: 3.2, to: { x: 4.4, d: 24 } },
          { t: 'mul', v: 3, x: -5.2, d: 22, w: 2.4 },
          { t: 'mul', v: 2, x: 1.0, d: 22, w: 2.4 },
          { t: 'mul', v: 2, x: -2.1, d: 30, w: 8.6 },
          ...ladder(4.4, 28, 3, 6, 4, 4.0, { color: 'gold' }),
        ],
        balls: [{ x: -2.0, d: 50, hp: 300, r: 2.0, speed: 1.4, delay: 8, dmg: 2 }],
      },
      {
        tip: 'Two pads, two secret lanes. And the balls keep rolling...',
        tower: 680000,
        waves: { every: 3.0, swarm: 9, crab: 2, ramp: 0.45 },
        walls: [{ x: -2.2, d1: 8, d2: 44 }, { x: 2.2, d1: 8, d2: 44 }],
        gates: [
          { t: 'upgrade', up: 'barrel', need: 60, x: 0, d: 9, w: 3.9 },
          { t: 'mul', v: 3, x: 0, d: 14, w: 3.9 },
          { t: 'jump', x: -0.95, d: 20, w: 1.9, to: { x: -4.45, d: 16 } },
          { t: 'jump', x: 0.95, d: 20, w: 1.9, to: { x: 4.45, d: 16 } },
          { t: 'mul', v: 2, x: 0, d: 27, w: 3.9 },
          { t: 'fence', hp: 400, x: -4.45, d: 10, w: 4.1 },
          ...ladder(-4.45, 19, 2, 6, 3.6, 4.1),
          { t: 'fence', hp: 400, x: 4.45, d: 10, w: 4.1 },
          { t: 'mul', v: 5, x: 4.45, d: 20, w: 4.1 },
          { t: 'nuke', need: 600, dmg: 0.3, x: 4.45, d: 28, w: 4.1 },
          { t: 'mul', v: 6, x: 4.45, d: 36, w: 4.1 },
        ],
        balls: [
          { x: 0, d: 50, hp: 20000, r: 2.2, speed: 1.5, delay: 10, dmg: 2 },
          { x: 0, d: 50, hp: 60000, r: 2.6, speed: 1.5, delay: 32, dmg: 3 },
        ],
      },
      {
        tip: 'THE KRAKEN! Tentacles slam the road. Jump past them and go wild!',
        boss: { type: 'kraken', hp: 2.5e7, speed: 0.5 },
        waves: { every: 3.0, swarm: 10, crab: 3, ramp: 0.45 },
        walls: [{ x: 0, d1: 8, d2: 22 }],
        gates: [
          { t: 'upgrade', up: 'power', need: 80, x: -3.3, d: 9, w: 5.6 },
          { t: 'hangar', need: 500, x: 3.3, d: 9, w: 5.6 },
          { t: 'mul', v: 3, x: -3.3, d: 15, w: 5.6 },
          { t: 'jump', x: 3.3, d: 15, w: 5.6, to: { x: 0, d: 27 } },
          ...ladder(0, 27, 2, 8, 2, 6.4),
          { t: 'mul', v: 2, x: -5.2, d: 30, w: 2.4 },
          { t: 'mul', v: 2, x: 5.2, d: 30, w: 2.4 },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 14
  {
    name: 'Spooky Hollow',
    theme: 'spooky',
    threat: 2.2,
    feature: 'Ghost gates fade in and out',
    blurb: 'Ghost gates only exist part of the time. Shoot while they glow, then watch the numbers EXPLODE.',
    enemy: 'Ghosts: drift straight through barriers',
    stages: [
      {
        tip: 'Ghost gates blink out. Hit them while they are solid!',
        tower: 50000,
        waves: { every: 3.0, swarm: 8, ghost: 1, ramp: 0.45 },
        gates: [
          { t: 'mul', v: 3, x: -3.3, d: 9, w: 5.6 },
          { t: 'mul', v: 2, x: 3.3, d: 9, w: 5.6 },
          { t: 'mul', v: 10, x: -3.3, d: 19, w: 5.6, phase: { on: 1.4, period: 3, off: 0 } },
          { t: 'mul', v: 10, x: 3.3, d: 19, w: 5.6, phase: { on: 1.4, period: 3, off: 1.5 } },
          { t: 'fence', hp: 300, x: 0, d: 27, w: 12.9, phase: { on: 2, period: 4, off: 0 } },
          ...ladder(0, 32, 2, 4, 4, 6.4),
        ],
      },
      {
        tip: 'Pumpkin balls roll in! Smash them before they reach your cannon.',
        tower: 5000,
        waves: { every: 3.0, swarm: 10, ghost: 3, ramp: 0.45 },
        walls: [{ x: -2.2, d1: 8, d2: 40 }, { x: 2.2, d1: 8, d2: 40 }],
        gates: [
          { t: 'upgrade', up: 'rapid', need: 80, x: -4.45, d: 10, w: 4.1 },
          { t: 'heart', need: 300, v: 2, x: 4.45, d: 10, w: 4.1 },
          ...ladder(0, 10, 2, 5, 3, 3.9, { phase: { on: 1.6, period: 2.6, off: 0 } }),
          { t: 'mul', v: 4, x: -4.45, d: 19, w: 4.1 },
          { t: 'mul', v: 25, x: -4.45, d: 28, w: 4.1, mega: true, phase: { on: 1.0, period: 3.2, off: 0.6 } },
          { t: 'mul', v: 5, x: 4.45, d: 19, w: 4.1, phase: { on: 2.0, period: 3, off: 1 } },
          { t: 'mul', v: 5, x: 4.45, d: 28, w: 4.1, phase: { on: 2.0, period: 3, off: 2 } },
        ],
        balls: [
          { x: 0, d: 50, hp: 1500, r: 2.2, speed: 1.6, delay: 12, dmg: 2 },
          { x: 0, d: 50, hp: 5000, r: 2.6, speed: 1.6, delay: 36, dmg: 3 },
        ],
      },
      {
        tip: 'THE PUMPKIN KING! Ghost ladders, giant x50... and balls of doom!',
        boss: { type: 'pumpkin', hp: 770000, speed: 0.5 },
        waves: { every: 3.0, swarm: 10, ghost: 3, ramp: 0.45 },
        gates: [
          { t: 'upgrade', up: 'twin', need: 100, x: -3.3, d: 9, w: 5.6 },
          { t: 'upgrade', up: 'power', need: 120, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-3.3, 15, 2, 6, 3, 5.6, { phase: { on: 2.2, period: 3, off: 0 } }),
          ...ladder(3.3, 15, 2, 6, 3, 5.6, { phase: { on: 2.2, period: 3, off: 1.5 } }),
          { t: 'mul', v: 50, x: 0, d: 32, w: 3.2, mega: true, phase: { on: 0.8, period: 2.4, off: 0 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 15
  {
    name: 'Mirror Arena',
    theme: 'arena',
    threat: 2.3,
    feature: 'The RIVAL cannon + red gates',
    blurb: 'A red cannon shoots back! Its army multiplies through red gates. Smash them first!',
    enemy: 'Rival cannon: fast red troopers',
    stages: [
      {
        tip: 'RED GATES multiply THEIR army. Break them, then take the road!',
        tower: 50000,
        waves: { every: 3.4, swarm: 6, ramp: 0.4 },
        gates: [
          { t: 'mul', v: 3, x: -3.3, d: 9, w: 5.6 },
          { t: 'mul', v: 3, x: 3.3, d: 9, w: 5.6 },
          { t: 'redmul', v: 3, hp: 200, x: -3.3, d: 17, w: 5.6 },
          { t: 'redmul', v: 3, hp: 200, x: 3.3, d: 17, w: 5.6 },
          ...ladder(0, 24, 2, 5, 3.5, 12.9),
        ],
        spawners: [{ x: 0, d: 47, hp: 3000, every: 2.0, n: 2, kind: 4, unitHp: 1, style: 'rival', slide: { amp: 4, speed: 0.7 } }],
      },
      {
        tip: 'Hit the rival hard: the hangar gives you your own squad!',
        tower: 670000,
        waves: { every: 3.4, swarm: 7, shielder: 1, ramp: 0.4 },
        walls: [{ x: 0, d1: 8, d2: 36 }],
        gates: [
          { t: 'hangar', need: 120, x: -3.3, d: 10, w: 5.6 },
          { t: 'mul', v: 4, x: -3.3, d: 18, w: 5.6 },
          { t: 'redadd', v: 2, hp: 500, x: -3.3, d: 27, w: 5.6 },
          { t: 'upgrade', up: 'barrel', need: 100, x: 4.75, d: 10, w: 2.7 },
          ...ladder(3.3, 16, 2, 7, 3.3, 5.6),
          { t: 'redmul', v: 2, hp: 600, x: 3.3, d: 41, w: 5.6 },
        ],
        spawners: [
          { x: -3.3, d: 48, hp: 8000, every: 2.6, n: 1, kind: 4, unitHp: 2, style: 'rival', slide: { amp: 2.5, speed: 0.9 } },
          { x: 3.3, d: 48, hp: 8000, every: 2.6, n: 1, kind: 4, unitHp: 2, style: 'rival', slide: { amp: 2.5, speed: 1.1 } },
        ],
      },
      {
        tip: 'THE COMMANDER and his rivals. Squad, twin, ladder: all-in!',
        boss: { type: 'commander', hp: 5e6, speed: 0.5 },
        waves: { every: 3.2, swarm: 9, shielder: 1, runner: 1, ramp: 0.4 },
        gates: [
          { t: 'hangar', need: 300, x: -4.45, d: 9, w: 4.1 },
          { t: 'upgrade', up: 'twin', need: 60, x: 0, d: 9, w: 3.9 },
          { t: 'hangar', need: 900, x: 4.45, d: 9, w: 4.1 },
          { t: 'redmul', v: 2, hp: 1200, x: -4.2, d: 16, w: 3.8 },
          { t: 'redmul', v: 2, hp: 1200, x: 4.2, d: 16, w: 3.8 },
          ...ladder(0, 21, 2, 9, 2.2, 12.9),
        ],
        spawners: [{ x: 0, d: 42, hp: 30000, every: 3.2, n: 2, kind: 4, unitHp: 2, style: 'rival', slide: { amp: 5, speed: 0.6 } }],
      },
    ],
  },
  // ------------------------------------------------------------------ 16
  {
    name: 'Crystal Caverns',
    theme: 'crystal',
    threat: 3.12,
    feature: 'Tesla coils, heart gates, toppling pillars',
    blurb: 'Charge a tesla coil and it fries everything forever. Topple crystal pillars onto the horde!',
    enemy: 'Shielders + splitters, and a web-spitting spider',
    stages: [
      {
        tip: 'Charge the TESLA COIL: it zaps red units for the whole stage!',
        tower: 42000,
        waves: { every: 3.0, swarm: 9, shielder: 1, splitter: 1, ramp: 0.45 },
        gates: [
          { t: 'tesla', need: 40, every: 0.3, zaps: 3, range: 16, x: -3.3, d: 10, w: 5.6 },
          { t: 'mul', v: 3, x: 3.3, d: 10, w: 5.6 },
          { t: 'heart', need: 400, v: 2, x: 3.3, d: 17, w: 5.6 },
          ...ladder(-3.3, 18, 2, 5, 3.5, 5.6),
          { t: 'mul', v: 4, x: 3.3, d: 26, w: 5.6 },
          { t: 'mul', v: 3, x: 3.3, d: 33, w: 5.6 },
        ],
        pillars: [{ x: -5.6, d: 47, hp: 150 }, { x: 5.6, d: 44, hp: 150 }],
      },
      {
        tip: 'Pillars fall across the road. Time them for the biggest crowd!',
        tower: 100000,
        waves: { every: 3.0, swarm: 10, shielder: 2, splitter: 1, ramp: 0.45 },
        walls: [{ x: -2.2, d1: 8, d2: 38 }, { x: 2.2, d1: 8, d2: 38 }],
        gates: [
          { t: 'upgrade', up: 'barrel', need: 80, x: -4.45, d: 10, w: 4.1 },
          { t: 'mul', v: 3, x: 0, d: 10, w: 3.9 },
          { t: 'upgrade', up: 'rapid', need: 150, x: 4.45, d: 10, w: 4.1 },
          ...ladder(-4.45, 17, 2, 6, 3.5, 4.1),
          { t: 'tesla', need: 300, every: 0.25, zaps: 4, range: 18, x: 0, d: 18, w: 3.9 },
          { t: 'star', need: 3000, x: 0, d: 26, w: 3.9 },
          ...ladder(4.45, 17, 3, 7, 3.5, 4.1),
        ],
        pillars: [{ x: -5.6, d: 42, hp: 2000 }, { x: 5.6, d: 46, hp: 2000 }, { x: -5.6, d: 52, hp: 4000 }],
        spawners: [{ x: 0, d: 50, hp: 8000, every: 2.6, n: 2, kind: 3, unitHp: 2, style: 'dome' }],
      },
      {
        tip: 'CRYSTAL SPIDER! Webs slow your army to a crawl. Burn through!',
        boss: { type: 'spider', hp: 1.5e18, speed: 0.55 },
        waves: { every: 2.8, swarm: 11, shielder: 2, splitter: 2, ramp: 0.45 },
        gates: [
          { t: 'tesla', need: 400, every: 0.2, zaps: 5, range: 18, x: -4.45, d: 9, w: 4.1 },
          { t: 'upgrade', up: 'power', need: 120, x: 0, d: 9, w: 2.2 },
          { t: 'heart', need: 800, v: 3, x: 4.45, d: 9, w: 4.1 },
          ...ladder(0, 15, 2, 10, 2, 12.9),
          { t: 'star', need: 8000, x: -4.45, d: 35, w: 4.1 },
          { t: 'star', need: 8000, x: 4.45, d: 35, w: 4.1 },
        ],
        pillars: [{ x: -5.6, d: 52, hp: 20000 }, { x: 5.6, d: 52, hp: 20000 }],
      },
    ],
  },
  // ------------------------------------------------------------------ 17
  {
    name: 'Volcano Rush',
    theme: 'volcano',
    threat: 3.25,
    feature: 'LOOP gates + meteor rain',
    blurb: 'Loop gates send your army back to the start to multiply all over again. x100 becomes x10,000!',
    enemy: 'Imps + bombers, and fire from the sky',
    stages: [
      {
        tip: 'LOOP GATE! Your units run the whole road AGAIN. Squared numbers!',
        tower: 1500000,
        waves: { every: 3.0, swarm: 9, imp: 1, bomber: 1, ramp: 0.45 },
        meteors: { every: 3.5, r: 2.0 },
        walls: [{ x: 0, d1: 8, d2: 40 }],
        gates: [
          ...ladder(-3.3, 10, 2, 5, 6, 5.6),
          { t: 'loop', x: -3.3, d: 36, w: 5.6, to: { x: -3.3, d: 6 }, max: 1 },
          { t: 'mul', v: 3, x: 3.3, d: 10, w: 5.6 },
          { t: 'upgrade', up: 'barrel', need: 80, x: 3.3, d: 18, w: 5.6 },
          { t: 'mul', v: 5, x: 3.3, d: 27, w: 5.6 },
        ],
      },
      {
        tip: 'Loop TWICE through the ladder. The meteors hit them too!',
        tower: 7e10,
        waves: { every: 2.8, swarm: 11, imp: 2, bomber: 1, ramp: 0.45 },
        meteors: { every: 2.8, r: 2.2 },
        walls: [{ x: -2.2, d1: 8, d2: 42 }, { x: 2.2, d1: 8, d2: 42 }],
        gates: [
          { t: 'upgrade', up: 'power', need: 100, x: -4.45, d: 10, w: 4.1 },
          { t: 'heart', need: 500, v: 2, x: -4.45, d: 20, w: 4.1 },
          { t: 'mul', v: 4, x: -4.45, d: 30, w: 4.1 },
          ...ladder(0, 10, 2, 6, 5, 3.9),
          { t: 'loop', x: 0, d: 38, w: 3.9, to: { x: 0, d: 6 }, max: 2 },
          { t: 'hangar', need: 400, x: 4.45, d: 10, w: 4.1 },
          { t: 'mul', v: 6, x: 4.45, d: 24, w: 4.1 },
        ],
        spawners: [{ x: 0, d: 50, hp: 200000, every: 2.6, n: 3, kind: 12, unitHp: 2, style: 'dome' }],
      },
      {
        tip: 'MAGMA DRAGON! Breathes fire, rains meteors. Loop the ladder to x1,000,000!',
        boss: { type: 'magma', hp: 2e17, speed: 0.55 },
        waves: { every: 2.8, swarm: 12, imp: 3, bomber: 2, ramp: 0.45 },
        meteors: { every: 3.2, r: 2.2 },
        gates: [
          { t: 'upgrade', up: 'twin', need: 120, x: -3.3, d: 8, w: 5.6 },
          { t: 'upgrade', up: 'power', need: 150, x: 3.3, d: 8, w: 5.6 },
          ...ladder(0, 12, 2, 8, 2.6, 12.9),
          { t: 'loop', x: -3.3, d: 32, w: 5.6, to: { x: 0, d: 10 }, max: 2 },
          { t: 'nuke', need: 3000, dmg: 0.25, x: 3.3, d: 32, w: 5.6 },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 18
  {
    name: "Pharaoh's Tomb",
    theme: 'tomb',
    threat: 3.38,
    feature: 'Sliding walls + cursed mummies',
    blurb: 'The tomb walls slide back and forth, opening and closing the lanes. Mummies get back up!',
    enemy: 'Mummies: rise again once',
    stages: [
      {
        tip: 'The walls slide! Wait for the lane to open, then pour in.',
        tower: 320000,
        waves: { every: 3.0, swarm: 9, mummy: 2, ramp: 0.45 },
        walls: [{ x: 0, d1: 14, d2: 40, slide: { amp: 3.2, speed: 0.9, ph: 0 } }],
        gates: [
          { t: 'mul', v: 3, x: 0, d: 9, w: 12.9 },
          ...ladder(-4.9, 17, 3, 6, 5, 3.0),
          ...ladder(4.9, 17, 3, 6, 5, 3.0),
          { t: 'upgrade', up: 'barrel', need: 60, x: 0, d: 45, w: 5 },
        ],
      },
      {
        tip: 'Three sliding walls, statues full of treasure. Break in!',
        tower: 300000,
        waves: { every: 2.8, swarm: 11, mummy: 2, ramp: 0.45 },
        walls: [
          { x: -2.2, d1: 14, d2: 38, slide: { amp: 1.6, speed: 1.0, ph: 0 } },
          { x: 2.2, d1: 14, d2: 38, slide: { amp: 1.6, speed: 1.0, ph: 3.14 } },
        ],
        gates: [
          { t: 'upgrade', up: 'power', need: 100, x: -3.3, d: 9, w: 5.6 },
          { t: 'hangar', need: 400, x: 3.3, d: 9, w: 5.6 },
          { t: 'statue', hp: 1500, x: 0, d: 16, w: 2.4 },
          { t: 'mul', v: 30, x: 0, d: 24, w: 2.4, mega: true },
          { t: 'mul', v: 10, x: 0, d: 32, w: 2.4, mega: true },
          ...ladder(-5.2, 18, 2, 5, 5, 2.4),
          ...ladder(5.2, 18, 2, 5, 5, 2.4),
          { t: 'mul', v: 4, x: 0, d: 42, w: 12.9 },
        ],
        spawners: [
          { x: -4.6, d: 50, hp: 20000, every: 2.8, n: 2, kind: 10, unitHp: 2, style: 'dome' },
          { x: 4.6, d: 50, hp: 20000, every: 2.8, n: 2, kind: 10, unitHp: 2, style: 'dome' },
        ],
      },
      {
        tip: 'THE PHARAOH! Sandstorms, mummies, curses. Show no mercy!',
        boss: { type: 'pharaoh', hp: 1.2e20, speed: 0.55 },
        waves: { every: 2.8, swarm: 12, mummy: 3, ramp: 0.45 },
        walls: [{ x: 0, d1: 18, d2: 34, slide: { amp: 4, speed: 0.7, ph: 0 } }],
        gates: [
          { t: 'upgrade', up: 'twin', need: 150, x: -4.45, d: 9, w: 4.1 },
          { t: 'upgrade', up: 'power', need: 150, x: 0, d: 9, w: 3.9 },
          { t: 'hangar', need: 600, x: 4.45, d: 9, w: 4.1 },
          ...ladder(0, 14, 2, 3, 2, 12.9),
          ...ladder(-4.9, 20, 4, 7, 3.6, 3.0),
          ...ladder(4.9, 20, 4, 7, 3.6, 3.0),
          { t: 'loop', x: 0, d: 40, w: 4, to: { x: 0, d: 12 }, max: 1 },
          { t: 'star', need: 20000, x: -4.6, d: 40, w: 3.6 },
          { t: 'star', need: 20000, x: 4.6, d: 40, w: 3.6 },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 19
  {
    name: 'Storm Peaks',
    theme: 'storm',
    threat: 3.5,
    feature: 'Tornados fling everything',
    blurb: 'Tornados throw your army up the road and shred the red horde. Ride the storm!',
    enemy: 'Drones + runners, lightning from above',
    stages: [
      {
        tip: 'Tornados toss your units forward... and tear the red army apart!',
        tower: 150000,
        waves: { every: 3.0, swarm: 10, drone: 2, runner: 2, ramp: 0.45 },
        tornados: [{ x: 0, d: 30, r: 1.8, speed: 0.7, amp: 4.5 }],
        gates: [
          { t: 'mul', v: 3, x: -3.3, d: 9, w: 5.6 },
          { t: 'upgrade', up: 'barrel', need: 80, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-3.3, 15, 2, 4, 4, 5.6),
          ...ladder(3.3, 15, 3, 5, 4, 5.6),
          { t: 'mul', v: 4, x: 0, d: 40, w: 12.9 },
          { t: 'mul', v: 2, x: 0, d: 44, w: 12.9 },
        ],
        pillars: [{ x: -5.6, d: 50, hp: 300 }, { x: 5.6, d: 50, hp: 300 }],
      },
      {
        tip: 'Two tornados guard the mega lane. Squeeze between them!',
        tower: 2e8,
        waves: { every: 2.8, swarm: 11, drone: 2, runner: 2, ramp: 0.45 },
        tornados: [
          { x: -2.5, d: 24, r: 1.6, speed: 0.9, amp: 3.5 },
          { x: 2.5, d: 34, r: 1.6, speed: 1.1, amp: 3.5 },
        ],
        gates: [
          { t: 'upgrade', up: 'power', need: 100, x: -4.45, d: 9, w: 4.1 },
          { t: 'tesla', need: 1200, every: 0.2, zaps: 5, range: 18, x: 0, d: 9, w: 3.9 },
          { t: 'hangar', need: 500, x: 4.45, d: 9, w: 4.1 },
          ...ladder(0, 14, 2, 6, 1.6, 12.9),
          { t: 'mul', v: 20, x: 0, d: 29, w: 3.2, mega: true },
          { t: 'mul', v: 10, x: 0, d: 40, w: 3.2, mega: true },
          { t: 'star', need: 20000, x: -4.6, d: 40, w: 3.4 },
          { t: 'star', need: 20000, x: 4.6, d: 40, w: 3.4 },
        ],
        pillars: [{ x: -5.6, d: 52, hp: 2.5e7 }, { x: 5.6, d: 49, hp: 2.5e7 }],
      },
      {
        tip: 'THE THUNDER GOD! Lightning everywhere. Make it rain units!',
        boss: { type: 'thunder', hp: 7.2e23, speed: 0.55 },
        waves: { every: 2.8, swarm: 12, drone: 3, runner: 3, ramp: 0.45 },
        tornados: [{ x: 0, d: 36, r: 1.7, speed: 0.8, amp: 5 }],
        gates: [
          { t: 'upgrade', up: 'twin', need: 150, x: -4.45, d: 8, w: 4.1 },
          { t: 'upgrade', up: 'power', need: 200, x: 0, d: 8, w: 3.9 },
          { t: 'hangar', need: 800, x: 4.45, d: 8, w: 4.1 },
          ...ladder(0, 13, 2, 9, 2, 12.9),
          { t: 'loop', x: 0, d: 29, w: 4.2, to: { x: 0, d: 11 }, max: 1 },
          { t: 'star', need: 1e5, x: -4.6, d: 29, w: 3.6 },
          { t: 'star', need: 1e5, x: 4.6, d: 29, w: 3.6 },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 20
  {
    name: 'Black Hole',
    theme: 'blackhole',
    threat: 3.75,
    feature: 'SUPERNOVA black holes + everything',
    blurb: 'Black holes swallow both armies. Feed one enough power and it goes SUPERNOVA. The final test!',
    enemy: 'Every enemy, every trap, the Emperor',
    stages: [
      {
        tip: 'Feed the BLACK HOLE. When it is full: SUPERNOVA!',
        tower: 1.5e6,
        waves: { every: 3.0, swarm: 10, runner: 2, splitter: 1, ghost: 1, ramp: 0.45 },
        holes: [{ x: 0, d: 30, r: 1.4, need: 3e4, mult: 3, dmg: 0.4 }],
        gates: [
          { t: 'upgrade', up: 'barrel', need: 80, x: -3.3, d: 9, w: 5.6 },
          { t: 'upgrade', up: 'power', need: 100, x: 3.3, d: 9, w: 5.6 },
          ...ladder(-4.45, 14, 2, 6, 3, 4.1),
          ...ladder(4.45, 14, 2, 6, 3, 4.1),
          { t: 'mul', v: 3, x: 0, d: 16, w: 3.6 },
          { t: 'mul', v: 2, x: 0, d: 40, w: 12.9 },
        ],
      },
      {
        tip: 'Belts, slots, jump pads, ghost gates... ALL of it. Then: SUPERNOVA.',
        tower: 3.1e7,
        waves: { every: 2.8, swarm: 11, runner: 2, splitter: 1, ghost: 2, imp: 1, ramp: 0.45 },
        belts: [{ x: 0, w: 12.9, v: 3.2, d1: 12, d2: 17 }],
        holes: [{ x: -3.0, d: 44, r: 1.3, need: 1e5, mult: 3, dmg: 0.3 }],
        walls: [{ x: 0, d1: 20, d2: 38 }],
        gates: [
          { t: 'hangar', need: 400, x: -3.3, d: 9, w: 5.6 },
          { t: 'upgrade', up: 'rapid', need: 200, x: 3.3, d: 9, w: 5.6 },
          { t: 'slot', opts: [M(3), M(6), D(3), M(12)], period: 1.0, x: -3.3, d: 22, w: 5.6 },
          { t: 'mul', v: 5, x: -3.3, d: 29, w: 5.6, phase: { on: 1.6, period: 2.6, off: 0 } },
          { t: 'jump', x: -3.3, d: 35, w: 5.6, to: { x: 3.3, d: 24 } },
          ...ladder(3.3, 21, 2, 7, 3, 5.6),
        ],
        balls: [{ x: 0, d: 50, hp: 50000, r: 2.6, speed: 1.6, delay: 20, dmg: 3 }],
      },
      {
        tip: 'THE VOID EMPEROR. Everything you have learned. BURN THE OCEAN!',
        boss: { type: 'emperor', hp: 1.4e33, speed: 0.55 },
        waves: { every: 2.8, swarm: 12, runner: 3, splitter: 2, ghost: 2, imp: 2, ramp: 0.45 },
        holes: [{ x: 0, d: 40, r: 1.5, need: 5e14, mult: 5, dmg: 0.25 }],
        gates: [
          { t: 'upgrade', up: 'twin', need: 150, x: -4.45, d: 8, w: 4.1 },
          { t: 'upgrade', up: 'power', need: 200, x: 0, d: 8, w: 3.9 },
          { t: 'hangar', need: 800, x: 4.45, d: 8, w: 4.1 },
          ...ladder(0, 12, 2, 10, 1.9, 12.9),
          { t: 'loop', x: -4.45, d: 30, w: 4.1, to: { x: 0, d: 10 }, max: 1 },
          { t: 'star', need: 1e6, x: 4.45, d: 30, w: 4.1 },
          { t: 'heart', need: 5e4, v: 3, x: 0, d: 30, w: 3.6 },
        ],
        pillars: [{ x: -5.6, d: 50, hp: 1e14 }, { x: 5.6, d: 50, hp: 1e14 }],
      },
    ],
  },
];
