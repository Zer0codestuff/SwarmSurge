// Worlds 21-35: pinball and toys, charm and circus, frontier rails.
// Each entry: palette (THEMES colors), lights [hemi sky, hemi ground, hemi intensity, sun color, sun intensity],
// ambient particles (fx.js AMBIENT schema), fort { family, trim, light }, glowRoad, post (rail post color),
// flank (red unit kind for announced flanks) and art(colors) returning the SVG scenery for the map tile.
const amb = (color, color2, extra = {}) => ({ n: 200, color, color2, size: 0.24, vel: [0.3, 0.8, 0.2], sway: 0.8, opacity: 0.8, add: true, ...extra });
const hex = n => '#' + n.toString(16).padStart(6, '0');
// chunky map-art helpers, same flat style as map.js scenery()
const dot = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const ring = (x, y, r, c, w = 4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
const star = (x, y, r, fill) => {
  let d = '';
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * .45 : r; d += `${k ? 'L' : 'M'}${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`; }
  return `<path d="${d}z" fill="${fill}"/>`;
};
const flagpole = (x, y, h, c) => `<path d="M${x} ${y}V${y - h}" stroke="#6c5143" stroke-width="3"/><path d="M${x} ${y - h}l11 3-11 3z" fill="${c}"/>`;
const pebbleHill = (x, y, s, c) => `<ellipse cx="${x}" cy="${y}" rx="${18 * s}" ry="${7 * s}" fill="${c}"/>`;

export const BIOMES = {
  // ---- arc 1: pinball bumpers and toys ----
  pinball: { palette: { sky: 0x140a30, fog: 0x1e1046, ground: 0x241a52, road: 0x3a3260, rail: 0x3affd0, tower: 0x5a2a9a, roof: 0xffd21a },
    lights: [0xc4b2ff, 0x2c1c56, 1.5, 0xffe2ff, 1.85], ambient: amb(0x3affd0, 0xff4fd8, { n: 260, vel: [0, 1.3, 0.2], sway: 0.5, opacity: 0.95, twinkle: 1 }), fort: { family: 'casino', trim: 0x3affd0, light: 0xff4fd8 }, glowRoad: true, post: 0x4a3a7a, flank: 7,
    art: () => ring(58, 34, 13, '#3affd0') + dot(58, 34, 5, '#ff4fd8') + ring(97, 26, 9, '#ff4fd8') + dot(97, 26, 3.5, '#3affd0') + dot(86, 52, 6, '#e8ecf8') + `<path d="M46 63l17-7 4 7-17 7zM114 63l-17-7-4 7 17 7z" fill="#ffd21a"/>` },
  toybox: { palette: { sky: 0xaadfff, fog: 0xeaf4ff, ground: 0xf2d8a0, road: 0xa8b4cc, rail: 0xff5a4a, tower: 0x2a7aff, roof: 0xffd21a },
    lights: [0xffffff, 0xb2a68a, 1.75, 0xfff4e2, 2.2], ambient: amb(0xffd21a, 0xff6a8a, { n: 240, add: false, vel: [0.3, -1.2, 0.2], sway: 1.6, opacity: 0.9, twinkle: 0.3 }), fort: { family: 'crown', trim: 0xffe9a0, light: 0xffe27a }, post: 0xd84a3a, flank: 4,
    art: () => `<rect x="48" y="24" width="30" height="30" rx="5" fill="#ff6a4a"/><path d="M56 46l7-13 7 13m-10-4h6" stroke="#fff4e0" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="88" y="36" width="22" height="18" rx="4" fill="#2a7aff"/><circle cx="99" cy="45" r="3" fill="#fff4e0"/><path d="M84 62l22-6" stroke="#ff5a4a" stroke-width="5" stroke-linecap="round"/><circle cx="112" cy="55" r="6" fill="#ffd21a"/>` },
  bubble: { palette: { sky: 0xc4f2ff, fog: 0xe6faff, ground: 0xb8e4e0, road: 0x8fb6c8, rail: 0xff8ad8, tower: 0x3ab4e8, roof: 0xff6ac0 },
    lights: [0xf4ffff, 0x8cbad6, 1.75, 0xffffff, 2.1], ambient: amb(0xffffff, 0x8af0ff, { n: 240, vel: [0, 1.1, 0.2], size: 0.3, sway: 0.7, opacity: 0.7 }), fort: { family: 'reef', trim: 0xffe4f6, light: 0x8af0ff }, post: 0x7ab0c8, flank: 6,
    art: () => `<circle cx="62" cy="55" r="12" fill="#ffd21a"/><circle cx="72" cy="42" r="7" fill="#ffd21a"/><path d="M78 41l9 2-9 3z" fill="#ff8a2a"/>` + dot(70, 47, 1.6, '#222a3a') + ring(97, 28, 9, '#ffffff', 3) + ring(110, 46, 5, '#ffffff', 2.5) + ring(88, 50, 4, '#ffffff', 2) + `<path d="M92 24a9 9 0 0 1 8 5" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round"/>` },
  bouncy: { palette: { sky: 0x9ad8ff, fog: 0xe2f2ff, ground: 0x7ac866, road: 0xa4aac0, rail: 0xffd21a, tower: 0xff4a6a, roof: 0x3a6aff },
    lights: [0xffffff, 0x96ae7a, 1.75, 0xfff8e2, 2.2], ambient: amb(0xffd21a, 0x3a9aff, { n: 220, add: false, vel: [0.3, -1.1, 0.2], sway: 1.5, opacity: 0.85 }), fort: { family: 'crown', trim: 0xffd21a, light: 0xfff0a0 }, post: 0xd83a5a, flank: 4,
    art: () => `<ellipse cx="58" cy="26" rx="10" ry="12" fill="#ff4a6a"/><path d="M58 38q-2 10 2 18M86 30q-2 12 3 20M106 40q-2 8 2 14" stroke="#8a6a4a" stroke-width="2" fill="none"/><ellipse cx="86" cy="20" rx="9" ry="11" fill="#2a7aff"/><ellipse cx="106" cy="30" rx="8" ry="10" fill="#ffd21a"/><path d="M42 56q20 10 38 0t38 0" stroke="#6e4a2a" stroke-width="2.5" fill="none"/><path d="M50 59l6 1-3 6zM76 58l6 1-3 6zM102 58l6 1-3 6z" fill="#ff4a6a"/>` },
  tilt: { palette: { sky: 0x0d0724, fog: 0x1c0f3e, ground: 0x1a1240, road: 0x2e2656, rail: 0xffd21a, tower: 0x8a1a5e, roof: 0x3afff0 },
    lights: [0xb8a2ff, 0x2c1c50, 1.5, 0xffe2c4, 1.85], ambient: amb(0xffd21a, 0x3afff0, { n: 280, vel: [0, 1.2, 0.3], sway: 0.6, opacity: 0.95, twinkle: 1 }), fort: { family: 'casino', trim: 0xffd21a, light: 0x3afff0 }, glowRoad: true, post: 0x8a6a1a, flank: 12,
    art: () => star(80, 22, 11, '#ffd21a') + `<path d="M44 62l20-9 5 8-20 9zM116 62l-20-9-5 8 20 9z" fill="#d8203c"/><path d="M49 55a42 30 0 0 1 62 0" stroke="#ffd21a" stroke-width="3" fill="none"/>` + dot(62, 42, 3, '#fff0a0') + dot(80, 36, 3, '#fff0a0') + dot(98, 42, 3, '#fff0a0') },
  // ---- arc 2: charm totems, dreams and circus ----
  mushroom: { palette: { sky: 0x9ee0ca, fog: 0xd0f2de, ground: 0x4e8c4e, road: 0x8c8272, rail: 0xff6a5a, tower: 0x8a3a6a, roof: 0xff4a4a },
    lights: [0xf2ffea, 0x4c6c3e, 1.6, 0xfff2d4, 2.1], ambient: amb(0xd0ff8a, 0x8a5aff, { n: 200, vel: [0.2, 0.35, 0.2], size: 0.2, sway: 1.3, opacity: 0.95, twinkle: 1 }), fort: { family: 'temple', trim: 0xd8c8a0, light: 0xd0ff8a }, post: 0x5a3a2a, flank: 6,
    art: () => `<path d="M80 22q-24 2-28 18h56q-4-16-28-18z" fill="#ff4a4a"/>` + dot(66, 32, 3.5, '#fff4e0') + dot(88, 30, 4, '#fff4e0') + dot(80, 37, 2.5, '#fff4e0') + `<rect x="75" y="40" width="10" height="22" rx="4" fill="#f0e8d8"/><path d="M50 62q-9-1-10-10 8 0 10 10z" fill="#ff8a5a"/><rect x="47" y="58" width="5" height="7" rx="2" fill="#f0e8d8"/><path d="M104 62v-8m0 0q-8 1-6-7 8-1 6 7zm0 0q8 1 6-7-8-1-6 7z" stroke="#4e8a3e" stroke-width="2.5" fill="none" stroke-linecap="round"/>` },
  circus: { palette: { sky: 0xffdcae, fog: 0xffecd0, ground: 0xdca662, road: 0x9c8c82, rail: 0xd8203c, tower: 0xd8203c, roof: 0xffd21a },
    lights: [0xffffff, 0xb28660, 1.75, 0xfff2d4, 2.2], ambient: amb(0xff3a5a, 0xffd21a, { n: 240, add: false, vel: [0.3, -1.3, 0.2], sway: 1.5, opacity: 0.9 }), fort: { family: 'casino', trim: 0xfff2d2, light: 0xffe27a }, post: 0x8a4a2a, flank: 4,
    art: () => flagpole(80, 16, 7, '#ffd21a') + `<path d="M80 16q-30 4-32 28h64q-2-24-32-28z" fill="#d8203c"/><path d="M80 16q-12 6-13 28h8q1-22 5-28zm0 0q12 6 13 28h-8q-1-22-5-28z" fill="#fff4e0"/><path d="M50 44h60v14H50z" fill="#fff4e0"/><path d="M58 44h9v14h-9zm17 0h9v14h-9zm17 0h9v14h-9z" fill="#d8203c"/><rect x="72" y="46" width="16" height="12" rx="6" fill="#1a1214"/>` },
  dream: { palette: { sky: 0xdbcaff, fog: 0xf2eaff, ground: 0xf8f2ff, road: 0xbab2dc, rail: 0xffb2e2, tower: 0x8a7aff, roof: 0xffd2f2 },
    lights: [0xfff8ff, 0xae9ecc, 1.8, 0xfff2ff, 2.0], ambient: amb(0xffffff, 0xffb0e0, { n: 200, vel: [0.5, 0.25, 0.3], sway: 1.0, opacity: 0.8, twinkle: 1 }), fort: { family: 'crown', trim: 0xffeaff, light: 0xffd2f2 }, post: 0x9a8ac8, flank: 9,
    art: () => `<path d="M92 12a17 17 0 1 0 13 28 15 15 0 0 1-13-28z" fill="#ffd86a"/>` + star(56, 22, 5, '#ffb2e2') + star(70, 38, 3.5, '#ffd86a') + star(114, 20, 4, '#ffb2e2') + `<ellipse cx="58" cy="58" rx="18" ry="8" fill="#ffffff"/><ellipse cx="82" cy="54" rx="14" ry="7" fill="#f4ecff"/><ellipse cx="103" cy="59" rx="15" ry="7" fill="#ffffff"/>` },
  bazaar: { palette: { sky: 0xffca92, fog: 0xfadcaa, ground: 0xe2ac64, road: 0xac8e6c, rail: 0x2ab4a4, tower: 0xcc4c2e, roof: 0x2ab4a4 },
    lights: [0xfff2dc, 0xb28660, 1.75, 0xffeac2, 2.3], ambient: amb(0xfff0c8, 0xe0b070, { n: 180, add: false, vel: [2.0, 0.05, 0.6], size: 0.18, opacity: 0.55 }), fort: { family: 'temple', trim: 0xffe2a2, light: 0x2ab4a4 }, post: 0x7a5a3a, flank: 10,
    art: () => `<path d="M46 34h44v7H46z" fill="#d8443a"/><path d="M46 41a5 5 0 0 0 11 0 5 5 0 0 0 11 0 5 5 0 0 0 11 0 5 5 0 0 0 11 0z" fill="#d8443a"/><path d="M52 34v-2h32v2" stroke="#7a5232" stroke-width="3" fill="none"/><rect x="50" y="48" width="36" height="12" fill="#9a6a3e"/><rect x="60" y="30" width="16" height="6" fill="#e8c888"/><path d="M112 56a11 11 0 0 0-22 0z" fill="#2ab4a4"/><path d="M101 44l4-6 3 6z" fill="#ffd21a"/>` },
  hypno: { palette: { sky: 0x2c0c3e, fog: 0x3c1254, ground: 0x2c1244, road: 0x3e2e5c, rail: 0xff4fd8, tower: 0x5c1c7e, roof: 0x3affd0 },
    lights: [0xd2a2ff, 0x341446, 1.5, 0xffb2f2, 1.8], ambient: amb(0xff4fd8, 0x3affd0, { n: 240, vel: [0, 0.7, 0.2], sway: 1.8, opacity: 0.9, twinkle: 1 }), fort: { family: 'gothic', trim: 0xffb2f2, light: 0xff4fd8 }, glowRoad: true, post: 0x5a2a7a, flank: 9,
    art: () => `<path d="M80 40a6 6 0 0 1 6 6 8 8 0 0 1-8 8 11 11 0 0 1-11-11 14 14 0 0 1 14-14 18 18 0 0 1 18 18 22 22 0 0 1-22 22" fill="none" stroke="#ff4fd8" stroke-width="5" stroke-linecap="round"/><path d="M46 62q0-16 8-22t10-14q2 8 10 14t8 22z" fill="#5e4a7e"/>` + dot(60, 30, 2.5, '#ff4fd8') + dot(66, 34, 2.5, '#ff4fd8') },
  // ---- arc 3: payload carts and frontier rails ----
  mine: { palette: { sky: 0x5e4e3e, fog: 0x6e5e4a, ground: 0x5c4c3a, road: 0x6e645a, rail: 0xffb41e, tower: 0x6c4c2c, roof: 0xffca4e },
    lights: [0xffeaca, 0x5e4434, 1.55, 0xffdaa2, 2.0], ambient: amb(0xffd080, 0x8a7060, { n: 200, add: false, vel: [0.3, 0.5, 0.2], size: 0.2, sway: 0.5, opacity: 0.6 }), fort: { family: 'station', trim: 0xc2a282, light: 0xffb41e }, post: 0x5a4430, flank: 8,
    art: () => `<path d="M50 62V36M76 62V36M46 36h34" stroke="#6e4a2a" stroke-width="6" fill="none"/><path d="M50 40l26 18M76 40l-26 18" stroke="#5a3a22" stroke-width="3"/><rect x="88" y="46" width="26" height="13" rx="2" fill="#8a3a2e"/><circle cx="94" cy="61" r="4" fill="#3a3230"/><circle cx="108" cy="61" r="4" fill="#3a3230"/><path d="M90 46q11-8 22 0z" fill="#ffd84a"/>` },
  canyon: { palette: { sky: 0xffbc84, fog: 0xf2bc8c, ground: 0xcc6440, road: 0x9e7464, rail: 0xffe2a2, tower: 0xac3c1e, roof: 0x5c2e1e },
    lights: [0xfff2e2, 0xa66640, 1.75, 0xffe2c2, 2.3], ambient: amb(0xffd8a8, 0xc8603a, { n: 200, add: false, vel: [2.2, 0.05, 0.6], size: 0.2, opacity: 0.55 }), fort: { family: 'bastion', trim: 0xf2ca92, light: 0xffc262 }, post: 0x6a3a2a, flank: 4,
    art: () => `<path d="M52 62V40h18l5-9h12l5 9v22z" fill="#b85a34"/><path d="M52 47h40M57 55h30" stroke="#8a3a1e" stroke-width="3"/><path d="M104 62v-9m0 0h-6v-7h6m0 7h6v7" fill="none" stroke="#4e9a3c" stroke-width="5" stroke-linecap="round"/><circle cx="104" cy="42" r="2.5" fill="#ff7aa8"/>` },
  ghosttown: { palette: { sky: 0x4c3c5e, fog: 0x5e4e5e, ground: 0x7e6e54, road: 0x6c625a, rail: 0x9edaa2, tower: 0x4c3e3e, roof: 0x9edaa2 },
    lights: [0xcac2e2, 0x444044, 1.45, 0xe2daff, 1.8], ambient: amb(0x9affb0, 0x6a5aff, { n: 200, vel: [0.4, 0.3, 0.2], size: 0.2, sway: 1.2, opacity: 0.8, twinkle: 1 }), fort: { family: 'gothic', trim: 0xc2baa2, light: 0x9affb2 }, post: 0x4a4038, flank: 9,
    art: () => `<rect x="46" y="30" width="40" height="9" fill="#8a6a4e"/><rect x="48" y="39" width="36" height="23" fill="#a8825a"/><rect x="54" y="46" width="9" height="16" fill="#3a2e26"/><rect x="70" y="45" width="8" height="7" fill="#262a36"/><circle cx="108" cy="34" r="9" fill="#7a5a3a"/><path d="M104 43v14M112 43v14M108 25v9" stroke="#5e4430" stroke-width="3"/><path d="M104 25h8v-4h-8z" fill="#7a5a3a"/><path d="M96 62a5 5 0 1 1 5-5" stroke="#a8845e" stroke-width="2.5" fill="none"/>` },
  glacier: { palette: { sky: 0xbce2ff, fog: 0xe2f2ff, ground: 0xeaf6ff, road: 0x8ea4bc, rail: 0x3e8eff, tower: 0x3e5e8e, roof: 0xd2eaff },
    lights: [0xecf8ff, 0xa4b6ce, 1.6, 0xffffff, 2.1], ambient: amb(0xffffff, 0xd8ecff, { n: 460, add: false, vel: [0.6, -1.8, 0.4], size: 0.26, sway: 1.0, opacity: 0.9 }), fort: { family: 'crown', trim: 0xeaf6ff, light: 0xc2f4ff }, post: 0x7a8a9a, flank: 3,
    art: () => `<path d="M56 64l14-30 15 30z" fill="#9fc8e8"/><path d="M70 34l7 15-7-3-7 3z" fill="#f4faff"/>` + `<path d="M98 64V44m-6 20l6-6 6 6" stroke="#2e3238" stroke-width="3" fill="none"/>` + dot(104, 42, 3.5, '#ff5a4a') + `<path d="M112 64l6-14 6 14z" fill="#4a7a5a"/>` + pebbleHill(108, 64, .5, '#e4f2fc') },
  dynamite: { palette: { sky: 0xec945e, fog: 0xda8c64, ground: 0x8e4c2e, road: 0x7e6454, rail: 0xff3e1e, tower: 0x7e2e1e, roof: 0xffd21a },
    lights: [0xffdaba, 0x6e3424, 1.6, 0xffc292, 2.1], ambient: amb(0xffc060, 0xff3a0a, { n: 240, vel: [0.4, 1.8, 0.2], size: 0.26, sway: 0.7, opacity: 0.95, twinkle: 1 }), fort: { family: 'station', trim: 0xc29472, light: 0xff6e1e }, post: 0x5a2a1a, flank: 2,
    art: () => `<path d="M50 62V38h20v24z" fill="#c86838"/><path d="M50 45h20M50 53h20" stroke="#a04828" stroke-width="3"/><rect x="88" y="42" width="24" height="17" rx="3" fill="#d8382e"/><rect x="88" y="48" width="24" height="6" fill="#fff4e0"/><path d="M100 42q0-6 6-7" stroke="#bfa878" stroke-width="2.5" fill="none"/>` + dot(114, 60, 4, '#8a5a2e') },
};
