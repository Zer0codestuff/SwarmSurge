// Worlds 36-50: harvest country, the prehistoric wilds and the cosmic finale.
// Same schema as biomes-21.js.
const amb = (color, color2, extra = {}) => ({ n: 200, color, color2, size: 0.24, vel: [0.3, 0.8, 0.2], sway: 0.8, opacity: 0.8, add: true, ...extra });
const hill = (x, y, color) => `<path d="M${x-18} ${y}q18-30 36 0z" fill="${color}"/>`;

export const BIOMES = {
  farm: { palette: { sky: 0xa8d8ff, fog: 0xf0e8c8, ground: 0xd8c060, road: 0x9a8a70, rail: 0xc84a2a, tower: 0xb83a2a, roof: 0x5a3a2a },
    lights: [0xffffff, 0xb09a5a, 1.75, 0xfff4d8, 2.3], ambient: amb(0xfff0a0, 0xd8c060, { add: false, vel: [1.2, 0.1, 0.4], opacity: 0.55 }), fort: { family: 'bastion', trim: 0xf0e0b0, light: 0xffd060 }, flank: 4, art: () => hill(80, 64, '#d8c060') },
  orchard: { palette: { sky: 0xb0e0ff, fog: 0xe0f0d0, ground: 0x6ab84a, road: 0x9a9080, rail: 0xd84a3a, tower: 0x8a4a2a, roof: 0xd84a3a },
    lights: [0xf8ffe8, 0x6a8a4a, 1.7, 0xfff4d8, 2.3], ambient: amb(0xffffff, 0xff8ab0, { add: false, vel: [0.6, -0.8, 0.3], sway: 1.4, opacity: 0.7 }), fort: { family: 'temple', trim: 0xf0d8a0, light: 0xffc060 }, flank: 2, art: () => hill(80, 64, '#6ab84a') },
  bamboo: { palette: { sky: 0xc8f0d0, fog: 0xd8f0d8, ground: 0x5a9a4a, road: 0x8a8a78, rail: 0x2a6a3a, tower: 0x3a5a3a, roof: 0xc83a2a },
    lights: [0xf0fff0, 0x4a7a4a, 1.6, 0xfff8e0, 2.1], ambient: amb(0xd0ff9a, 0x4ac040, { add: false, vel: [0.8, -0.6, 0.3], sway: 1.6, opacity: 0.8 }), fort: { family: 'temple', trim: 0xe0d0a0, light: 0xff8a4a }, flank: 4, art: () => hill(80, 64, '#5a9a4a') },
  autumn: { palette: { sky: 0xf0c890, fog: 0xf0d0a8, ground: 0xb8702a, road: 0x8a7a68, rail: 0x8a3a1a, tower: 0x7a3a1a, roof: 0xd86a1a },
    lights: [0xfff0d8, 0x8a5a2a, 1.7, 0xffd8a0, 2.2], ambient: amb(0xff8a2a, 0xd84a1a, { add: false, vel: [1.0, -1.0, 0.4], sway: 1.8, opacity: 0.85 }), fort: { family: 'gothic', trim: 0xe0b080, light: 0xffa040 }, flank: 6, art: () => hill(80, 64, '#d86a1a') },
  sakura: { palette: { sky: 0xffd8e8, fog: 0xfff0f4, ground: 0xb8e0a0, road: 0xa8a0a8, rail: 0xd83a4a, tower: 0xe8e0d8, roof: 0x3a3a5a },
    lights: [0xfff8fc, 0xb09aa8, 1.75, 0xfff0f4, 2.2], ambient: amb(0xffd0e0, 0xff8ab0, { add: false, vel: [0.8, -0.9, 0.4], sway: 1.8, opacity: 0.9 }), fort: { family: 'crown', trim: 0xffe0e8, light: 0xffb0c8 }, flank: 7, art: () => hill(80, 64, '#ff8ab0') },
  dino: { palette: { sky: 0xa0e0d0, fog: 0xd0f0c8, ground: 0x6aa83a, road: 0x8a8070, rail: 0x7a5a3a, tower: 0x5a6a2a, roof: 0xd8902a },
    lights: [0xf8ffe0, 0x5a7a3a, 1.65, 0xfff0c8, 2.3], ambient: amb(0xd8ff8a, 0x6ac040, { add: false, vel: [0.6, -0.4, 0.3], sway: 1.4, opacity: 0.7 }), fort: { family: 'temple', trim: 0xd8c08a, light: 0xffc060 }, flank: 5, art: () => hill(80, 64, '#6aa83a') },
  swamp: { palette: { sky: 0x7a9a7a, fog: 0x8aa88a, ground: 0x3a5a3a, road: 0x5a6058, rail: 0x9ad83a, tower: 0x3a4a2a, roof: 0x9ad83a },
    lights: [0xd8f0d0, 0x3a4a30, 1.5, 0xe8f0c8, 1.9], ambient: amb(0xc8ff6a, 0x6a9a3a, { twinkle: 1, vel: [0.2, 0.3, 0.2], sway: 1.2 }), fort: { family: 'reef', trim: 0xb0c890, light: 0xc8ff6a }, flank: 8, art: () => hill(80, 64, '#3a5a3a') },
  tarpit: { palette: { sky: 0x6a4a3a, fog: 0x6a5040, ground: 0x2a2018, road: 0x4a4038, rail: 0xffa040, tower: 0x3a2a1a, roof: 0xffa040 },
    lights: [0xffe0c0, 0x402818, 1.5, 0xffc890, 2.0], ambient: amb(0xffb060, 0x5a3a2a, { twinkle: 0.6, vel: [0.2, 1.2, 0.2] }), fort: { family: 'gothic', trim: 0x8a6a4a, light: 0xffa040 }, flank: 1, art: () => hill(80, 64, '#2a2018') },
  amber: { palette: { sky: 0x3a2010, fog: 0x5a3018, ground: 0x4a2a14, road: 0x5a4030, rail: 0xffb02a, tower: 0x6a3a10, roof: 0xffc84a },
    lights: [0xffd8a0, 0x402010, 1.5, 0xffc060, 1.9], ambient: amb(0xffc84a, 0xff8a1a, { twinkle: 1, vel: [0, 0.4, 0] }), fort: { family: 'prism', trim: 0xffd890, light: 0xffb02a }, glowRoad: true, flank: 3, art: () => hill(80, 64, '#ffb02a') },
  nest: { palette: { sky: 0x8ad0ff, fog: 0xd8f0ff, ground: 0xc8a878, road: 0x9a9a90, rail: 0xfff0c0, tower: 0x8a6a4a, roof: 0x3a8ad8 },
    lights: [0xffffff, 0xa0b0c0, 1.8, 0xfff8e0, 2.2], ambient: amb(0xffffff, 0xcfe8ff, { add: false, vel: [1.4, 0.1, 0.5], size: 0.35, opacity: 0.6 }), fort: { family: 'crown', trim: 0xfff0d0, light: 0xffe7a0 }, flank: 7, art: () => hill(80, 64, '#c8a878') },
  prismlab: { palette: { sky: 0xe8f0ff, fog: 0xf0f4ff, ground: 0xd8e0f0, road: 0x9aa8c0, rail: 0x3ad0ff, tower: 0x5a6a9a, roof: 0xff4fd8 },
    lights: [0xffffff, 0x9aa8c0, 1.75, 0xffffff, 2.1], ambient: amb(0x3ad0ff, 0xff4fd8, { twinkle: 1, vel: [0, 0.5, 0] }), fort: { family: 'station', trim: 0xd8e0f0, light: 0x3ad0ff }, flank: 7, art: () => hill(80, 64, '#3ad0ff') },
  aurora: { palette: { sky: 0x0a1a3a, fog: 0x1a2a4a, ground: 0xd8e8f8, road: 0x6a7a98, rail: 0x3affa0, tower: 0x2a4a6a, roof: 0x3affa0 },
    lights: [0xc0e0ff, 0x405068, 1.5, 0xd0fff0, 1.9], ambient: amb(0xffffff, 0x9affd0, { add: false, vel: [0.4, -1.4, 0.4], sway: 1.0 }), fort: { family: 'crown', trim: 0xe8f4ff, light: 0x3affa0 }, glowRoad: true, flank: 3, art: () => hill(80, 64, '#3affa0') },
  chrono: { palette: { sky: 0x3a2a1a, fog: 0x4a3a28, ground: 0x3a3028, road: 0x5a5048, rail: 0xffc84a, tower: 0x6a4a2a, roof: 0xffc84a },
    lights: [0xffe8c8, 0x403020, 1.55, 0xffe0a0, 2.0], ambient: amb(0xffc84a, 0xb08a4a, { twinkle: 1, vel: [0, 0.3, 0] }), fort: { family: 'station', trim: 0xd0b080, light: 0xffc84a }, flank: 10, art: () => hill(80, 64, '#ffc84a') },
  nebula: { palette: { sky: 0x0a0624, fog: 0x1a0a3a, ground: 0x14102e, road: 0x241a44, rail: 0x6af0ff, tower: 0x3a1a6a, roof: 0xff6ad0 },
    lights: [0xb0c0ff, 0x201040, 1.45, 0xd0b0ff, 1.8], ambient: amb(0x6af0ff, 0xff6ad0, { twinkle: 1, vel: [0, 0.2, 1.2] }), fort: { family: 'reef', trim: 0xb0c8ff, light: 0x6af0ff }, glowRoad: true, flank: 9, art: () => hill(80, 64, '#6af0ff') },
  throne: { palette: { sky: 0x05020e, fog: 0x120628, ground: 0x0e0818, road: 0x1c1430, rail: 0xffd86a, tower: 0x1a0a2a, roof: 0xffd86a },
    lights: [0xd8c0ff, 0x1a0a28, 1.45, 0xffe0b0, 1.9], ambient: amb(0xffd86a, 0xb04aff, { twinkle: 1, vel: [0, 0.8, 0.6] }), fort: { family: 'gothic', trim: 0xffe0a0, light: 0xffd86a }, glowRoad: true, flank: 12, art: () => hill(80, 64, '#ffd86a') },
};
