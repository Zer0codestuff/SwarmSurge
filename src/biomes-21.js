// Worlds 21-35: pinball and toys, dreams and circus, frontier rails.
// Each entry: palette (THEMES colors), lights [hemi sky, hemi ground, hemi intensity, sun color, sun intensity],
// ambient particles (fx.js AMBIENT schema), fort { family, trim, light }, glowRoad, post (rail post color),
// flank (red unit kind for announced flanks) and art(colors) returning the SVG scenery for the map tile.
const amb = (color, color2, extra = {}) => ({ n: 200, color, color2, size: 0.24, vel: [0.3, 0.8, 0.2], sway: 0.8, opacity: 0.8, add: true, ...extra });
const hill = (x, y, color) => `<path d="M${x-18} ${y}q18-30 36 0z" fill="${color}"/>`;

export const BIOMES = {
  pinball: { palette: { sky: 0x1a1240, fog: 0x2a1a5a, ground: 0x241a4a, road: 0x34305a, rail: 0x3affd0, tower: 0x6a2aa0, roof: 0xffd21a },
    lights: [0xc0b0ff, 0x302050, 1.5, 0xffe0ff, 1.8], ambient: amb(0x3affd0, 0xff4fd8, { twinkle: 1 }), fort: { family: 'casino', trim: 0x3affd0, light: 0xff4fd8 }, glowRoad: true, flank: 7, art: () => hill(80, 64, '#7a5aff') },
  toybox: { palette: { sky: 0xa8dcff, fog: 0xe8f2ff, ground: 0xf2d29a, road: 0x9aa6c0, rail: 0xff5a4a, tower: 0x2a7aff, roof: 0xffd21a },
    lights: [0xffffff, 0xb0a080, 1.75, 0xfff4e0, 2.2], ambient: amb(0xffffff, 0xffd21a, { add: false, opacity: 0.6 }), fort: { family: 'crown', trim: 0xffe9a0, light: 0xffe27a }, flank: 4, art: () => hill(80, 64, '#ff7a6a') },
  bubble: { palette: { sky: 0xbff0ff, fog: 0xe0f8ff, ground: 0xd8f4ff, road: 0x9ac0d8, rail: 0xff8ad8, tower: 0x3ab0e0, roof: 0xff6ac0 },
    lights: [0xf0ffff, 0x8ab8d0, 1.75, 0xffffff, 2.1], ambient: amb(0xffffff, 0x8af0ff, { vel: [0, 1.1, 0], size: 0.34 }), fort: { family: 'reef', trim: 0xffe0f4, light: 0x8af0ff }, flank: 6, art: () => hill(80, 64, '#8ad8ff') },
  bouncy: { palette: { sky: 0x9ad8ff, fog: 0xdff0ff, ground: 0x7ad06a, road: 0xa0a8c0, rail: 0xffd21a, tower: 0xff4a6a, roof: 0x3a6aff },
    lights: [0xffffff, 0x9ab07a, 1.75, 0xfff8e0, 2.2], ambient: amb(0xffd21a, 0xff6a8a, { add: false, opacity: 0.6 }), fort: { family: 'crown', trim: 0xffd21a, light: 0xfff0a0 }, flank: 4, art: () => hill(80, 64, '#ff6a8a') },
  tilt: { palette: { sky: 0x0e0826, fog: 0x1e1040, ground: 0x18123a, road: 0x2a2450, rail: 0xffd21a, tower: 0x8a1a5a, roof: 0x3afff0 },
    lights: [0xb09aff, 0x2a1a48, 1.5, 0xffe0c0, 1.8], ambient: amb(0xffd21a, 0x3afff0, { twinkle: 1 }), fort: { family: 'casino', trim: 0xffd21a, light: 0x3afff0 }, glowRoad: true, flank: 12, art: () => hill(80, 64, '#ffd21a') },
  mushroom: { palette: { sky: 0x9ae0c8, fog: 0xc8f0d8, ground: 0x4a8a4a, road: 0x8a8070, rail: 0xff6a5a, tower: 0x8a3a6a, roof: 0xff4a4a },
    lights: [0xf0ffe8, 0x4a6a3a, 1.6, 0xfff0d0, 2.1], ambient: amb(0xd0ff8a, 0x8a5aff, { twinkle: 0.8 }), fort: { family: 'temple', trim: 0xffe0c0, light: 0xd0ff8a }, flank: 6, art: () => hill(80, 64, '#ff6a5a') },
  circus: { palette: { sky: 0xffd8a8, fog: 0xffe8c8, ground: 0xd8a05a, road: 0x9a8a80, rail: 0xd81a3a, tower: 0xd81a3a, roof: 0xffd21a },
    lights: [0xffffff, 0xb0805a, 1.75, 0xfff0d0, 2.2], ambient: amb(0xff3a5a, 0xffd21a, { add: false, vel: [0.3, -1.2, 0.2], sway: 1.4 }), fort: { family: 'casino', trim: 0xfff0d0, light: 0xffe27a }, flank: 4, art: () => hill(80, 64, '#d81a3a') },
  dream: { palette: { sky: 0xd8c8ff, fog: 0xf0e8ff, ground: 0xf8f0ff, road: 0xb8b0d8, rail: 0xffb0e0, tower: 0x8a7aff, roof: 0xffd0f0 },
    lights: [0xfff8ff, 0xa898c8, 1.8, 0xfff0ff, 2.0], ambient: amb(0xffffff, 0xffb0e0, { twinkle: 1, vel: [0.6, 0.2, 0.3] }), fort: { family: 'crown', trim: 0xffe8ff, light: 0xffd0f0 }, flank: 9, art: () => hill(80, 64, '#d8c8ff') },
  bazaar: { palette: { sky: 0xffc890, fog: 0xf8d8a8, ground: 0xe0a860, road: 0xa88a68, rail: 0x2ab0a0, tower: 0xc84a2a, roof: 0x2ab0a0 },
    lights: [0xfff0d8, 0xb0805a, 1.75, 0xffe8c0, 2.3], ambient: amb(0xfff0c8, 0xe0a860, { add: false, vel: [2.0, 0.05, 0.6], opacity: 0.55 }), fort: { family: 'temple', trim: 0xffe0a0, light: 0x2ab0a0 }, flank: 10, art: () => hill(80, 64, '#2ab0a0') },
  hypno: { palette: { sky: 0x2a0a3a, fog: 0x3a1050, ground: 0x2a1040, road: 0x3a2a58, rail: 0xff4fd8, tower: 0x5a1a7a, roof: 0x3affd0 },
    lights: [0xd0a0ff, 0x301040, 1.5, 0xffb0f0, 1.8], ambient: amb(0xff4fd8, 0x3affd0, { twinkle: 1, vel: [0, 0.6, 0], sway: 1.6 }), fort: { family: 'gothic', trim: 0xffb0f0, light: 0xff4fd8 }, glowRoad: true, flank: 9, art: () => hill(80, 64, '#ff4fd8') },
  mine: { palette: { sky: 0x5a4a3a, fog: 0x6a5a48, ground: 0x5a4a38, road: 0x6a6058, rail: 0xffb21a, tower: 0x6a4a2a, roof: 0xffc84a },
    lights: [0xffe8c8, 0x5a4030, 1.55, 0xffd8a0, 2.0], ambient: amb(0xffd080, 0x8a7060, { add: false, vel: [0.2, 0.4, 0], opacity: 0.6 }), fort: { family: 'station', trim: 0xc0a080, light: 0xffb21a }, flank: 8, art: () => hill(80, 64, '#8a6a4a') },
  canyon: { palette: { sky: 0xffb880, fog: 0xf0b888, ground: 0xc8603a, road: 0x9a7060, rail: 0xffe0a0, tower: 0xa83a1a, roof: 0x5a2a1a },
    lights: [0xfff0e0, 0xa0603a, 1.75, 0xffe0c0, 2.3], ambient: amb(0xffd8a8, 0xc8603a, { add: false, vel: [2.2, 0.05, 0.6], opacity: 0.55 }), fort: { family: 'bastion', trim: 0xf0c890, light: 0xffc060 }, flank: 4, art: () => hill(80, 64, '#c8603a') },
  ghosttown: { palette: { sky: 0x4a3a5a, fog: 0x5a4a5a, ground: 0x7a6a50, road: 0x6a6058, rail: 0x9ad8a0, tower: 0x4a3a3a, roof: 0x9ad8a0 },
    lights: [0xc8c0e0, 0x403840, 1.45, 0xe0d8ff, 1.8], ambient: amb(0x9affb0, 0x6a5aff, { twinkle: 1, vel: [0.4, 0.3, 0.2] }), fort: { family: 'gothic', trim: 0xc0b8a0, light: 0x9affb0 }, flank: 9, art: () => hill(80, 64, '#7a6a50') },
  glacier: { palette: { sky: 0xb8e0ff, fog: 0xe0f0ff, ground: 0xe8f4ff, road: 0x8aa0b8, rail: 0x3a8aff, tower: 0x3a5a8a, roof: 0xd0e8ff },
    lights: [0xeaf6ff, 0x9fb0c8, 1.6, 0xffffff, 2.1], ambient: amb(0xffffff, 0xd8ecff, { add: false, vel: [0.6, -1.6, 0.4], sway: 1.0 }), fort: { family: 'crown', trim: 0xe8f4ff, light: 0xbff4ff }, flank: 3, art: () => hill(80, 64, '#a6dbe8') },
  dynamite: { palette: { sky: 0xe8905a, fog: 0xd88860, ground: 0x8a4a2a, road: 0x7a6050, rail: 0xff3a1a, tower: 0x7a2a1a, roof: 0xffd21a },
    lights: [0xffd8b8, 0x6a3020, 1.6, 0xffc090, 2.1], ambient: amb(0xffc060, 0xff3a0a, { twinkle: 1, vel: [0.4, 1.6, 0.2] }), fort: { family: 'station', trim: 0xc09070, light: 0xff6a1a }, flank: 2, art: () => hill(80, 64, '#ff3a1a') },
};
