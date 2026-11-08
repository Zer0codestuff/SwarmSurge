// Worlds 21-50. Placeholder layouts, replaced world by world.
import { ladder } from './levelkit.js';

const WORLDS = [
  ['Pinball Plaza', 'pinball', 'robot'], ['Toy Town', 'toybox', 'jack'], ['Bubble Bath', 'bubble', 'jelly'], ['Bounce Castle', 'bouncy', 'king'], ['Tilt Palace', 'tilt', 'flipper'],
  ['Mushroom Grove', 'mushroom', 'golem'], ['Big Top Circus', 'circus', 'ringmaster'], ['Dream Clouds', 'dream', 'storm'], ['Snake Bazaar', 'bazaar', 'pharaoh'], ['Hypno Palace', 'hypno', 'mesmer'],
  ['Gold Rush Mine', 'mine', 'drill'], ['Red Rock Canyon', 'canyon', 'commander'], ['Ghost Town', 'ghosttown', 'skeleton'], ['Glacier Express', 'glacier', 'brute'], ['Dynamite Ridge', 'dynamite', 'locomotive'],
  ['Harvest Fields', 'farm', 'scarecrow'], ['Orchard Hills', 'orchard', 'pumpkin'], ['Bamboo Gardens', 'bamboo', 'panda'], ['Autumn Woods', 'autumn', 'spider'], ['Sakura Castle', 'sakura', 'shogun'],
  ['Dino Valley', 'dino', 'trex'], ['Misty Swamp', 'swamp', 'kraken'], ['Tar Pits', 'tarpit', 'magma'], ['Amber Caves', 'amber', 'titan'], ['Sky Nest', 'nest', 'roc'],
  ['Prism Labs', 'prismlab', 'moon'], ['Aurora Tundra', 'aurora', 'dragon'], ['Chrono Clockworks', 'chrono', 'clockwork'], ['Nebula Reef', 'nebula', 'thunder'], ['Singularity Throne', 'throne', 'overlord'],
];

export const LATE_LEVELS = WORLDS.map(([name, theme, boss], k) => ({
  name, theme, threat: 3.8 + k * 0.1, feature: '', blurb: '', enemy: '', route: ['rifle', 'tank', 'air', 1],
  stages: [
    { tip: '', tower: 4000, waves: { every: 3.0, swarm: 9, ramp: 0.4 }, gates: [...ladder(-3.3, 10, 2, 5, 5, 5.6), ...ladder(3.3, 12, 2, 4, 6, 5.6)] },
    { tip: '', tower: 20000, waves: { every: 3.0, swarm: 10, ramp: 0.4 }, gates: [...ladder(0, 10, 2, 6, 4, 12.9)] },
    { tip: '', boss: { type: boss, hp: 50000, speed: 0.5 }, waves: { every: 3.0, swarm: 10, ramp: 0.4 }, gates: [...ladder(0, 10, 2, 7, 3.5, 12.9)] },
  ],
}));
