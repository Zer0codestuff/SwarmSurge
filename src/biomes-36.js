// Worlds 36-50: harvest country, the prehistoric wilds and the cosmic finale.
// Same schema as biomes-21.js: palette (THEMES colors), lights [hemi sky, hemi ground, hemi intensity,
// sun color, sun intensity], ambient particles (fx.js AMBIENT schema), fort { family, trim, light },
// glowRoad, post (rail post color), flank (red unit kind for announced flanks) and art(colors)
// returning the SVG scenery for the 160x104 campaign map tile.
const amb = (color, color2, extra = {}) => ({ n: 200, color, color2, size: 0.24, vel: [0.3, 0.8, 0.2], sway: 0.8, opacity: 0.8, add: true, ...extra });

// Flat chunky map helpers in the style of map.js scenery().
const pine = (x, y, color) => `<path d="M${x - 2} ${y}v-6h4v6z" fill="#6c5143"/><path d="M${x - 8} ${y - 4}l8 -16 8 16z" fill="${color}"/><path d="M${x - 5.5} ${y - 9}l5.5 -11 5.5 11z" fill="${color}"/>`;

export const BIOMES = {
  // 36 Harvest Fields: wheat fringes, hay bales, fence lines, red barns and a windmill.
  farm: { palette: { sky: 0xa8d8ff, fog: 0xf0e8c8, ground: 0xd8c060, road: 0x9a8a70, rail: 0xc84a2a, tower: 0xb83a2a, roof: 0x5a3a2a },
    lights: [0xffffff, 0xb09a5a, 1.75, 0xfff4d8, 2.3],
    ambient: amb(0xf0d878, 0xc8a040, { n: 160, add: false, vel: [1.6, .1, .5], sway: .5, opacity: .5, size: .2 }),
    fort: { family: 'bastion', trim: 0xf0e0b0, light: 0xffd060 }, flank: 4,
    art: () => `<path d="M48 63V44l8-6 8 6v19z" fill="#b8402e"/><path d="M45 46l11-10 11 10-3 4-8-6-8 6z" fill="#7c4228"/><rect x="54" y="52" width="8" height="11" fill="#6a4a2e"/><path d="M55 56l6 6m0-6-6 6" stroke="#f0e8dc" stroke-width="1.6"/><rect x="55" y="45" width="6" height="5" fill="#5a3a24"/><path d="M96 63l3-23 2-2 2 2 3 23z" fill="#b0a08a"/><circle cx="101" cy="39" r="3" fill="#6a5a48"/><path d="M101 39l13-6M101 39l-2 15M101 39l-13 4M101 39l7-13" stroke="#5a4a38" stroke-width="2.6"/><g stroke="#e8c25a" stroke-width="3" fill="none" stroke-linecap="round"><path d="M36 62v-7m7 7v-9m7 9v-7m72 7v-9m7 9v-7m7 7v-9"/></g><circle cx="86" cy="58" r="6" fill="#d8b45a"/><circle cx="86" cy="58" r="3" fill="#c8a040"/>` },

  // 37 Orchard Hills: apple rows on mounds, baskets, ladders, dropped fruit.
  orchard: { palette: { sky: 0xb0e0ff, fog: 0xe0f0d0, ground: 0x6ab84a, road: 0x9a9080, rail: 0xd84a3a, tower: 0x8a4a2a, roof: 0xd84a3a },
    lights: [0xf8ffe8, 0x6a8a4a, 1.7, 0xfff4d8, 2.3],
    ambient: amb(0xffffff, 0xffb0c8, { n: 220, add: false, vel: [.5, -.9, .3], sway: 1.5, opacity: .85 }),
    fort: { family: 'temple', trim: 0xf0d8a0, light: 0xffc060 }, flank: 2,
    art: () => `<path d="M52 63v-9m50 9v-9" stroke="#7a5238" stroke-width="5"/><circle cx="49" cy="45" r="11" fill="#3f9a3a"/><circle cx="60" cy="48" r="9" fill="#2f8a30"/><circle cx="46" cy="43" r="2.4" fill="#d83a2a"/><circle cx="57" cy="46" r="2.4" fill="#d83a2a"/><circle cx="52" cy="50" r="2.4" fill="#d83a2a"/><circle cx="97" cy="49" r="10" fill="#4aa84a"/><circle cx="106" cy="52" r="7" fill="#3a9840"/><circle cx="95" cy="47" r="2.2" fill="#ff8a2a"/><circle cx="102" cy="50" r="2.2" fill="#ff8a2a"/><path d="M68 63l3-13m12 13-3-13M70 58h10m-9-5h8" stroke="#b08a52" stroke-width="2.6" fill="none"/><path d="M114 63l2-6h8l2 6z" fill="#c09a52"/><path d="M116 57q3-4 6 0" stroke="#a0803e" stroke-width="2" fill="none"/>` },

  // 38 Bamboo Gardens: stalk rows and groves, lanterns, koi ponds with arched bridges.
  bamboo: { palette: { sky: 0xc8f0d0, fog: 0xd8f0d8, ground: 0x5a9a4a, road: 0x8a8a78, rail: 0x2a6a3a, tower: 0x3a5a3a, roof: 0xc83a2a },
    lights: [0xf0fff0, 0x4a7a4a, 1.6, 0xfff8e0, 2.1],
    ambient: amb(0xd0ff9a, 0x4ac040, { n: 160, add: false, vel: [.7, -.7, .3], sway: 1.6, opacity: .7 }),
    fort: { family: 'temple', trim: 0xe0d0a0, light: 0xff8a4a }, flank: 4, post: 0x6a5a44,
    art: () => `<path d="M50 64V32m12 32V26m12 38V36" stroke="#7ab84a" stroke-width="5"/><path d="M47 44h6m-6 8h6m9-14h6m-6 10h6m9-6h6" stroke="#4a7a2a" stroke-width="2"/><path d="M62 26l9-5m-9 15 8 3M50 32l-8-4" stroke="#8ac85a" stroke-width="3" fill="none"/><rect x="76" y="52" width="8" height="8" fill="#f2de9e"/><path d="M74 52l6-5 6 5z" fill="#6e7466"/><rect x="77.5" y="55.5" width="5" height="3.6" fill="#2a241c"/><rect x="78" y="60" width="4" height="4" fill="#a8ae9e"/><ellipse cx="106" cy="63" rx="17" ry="3.5" fill="#2a6a5a"/><path d="M92 61q14-12 28 0" stroke="#8a6238" stroke-width="4" fill="none"/><path d="M92 61h28" stroke="#b08a52" stroke-width="3"/>` },

  // 39 Autumn Woods: maples in three hues, leaf drifts, fallen logs, mushrooms.
  autumn: { palette: { sky: 0xf0c890, fog: 0xf0d0a8, ground: 0xb8702a, road: 0x8a7a68, rail: 0x8a3a1a, tower: 0x7a3a1a, roof: 0xd86a1a },
    lights: [0xfff0d8, 0x8a5a2a, 1.7, 0xffd8a0, 2.2],
    ambient: amb(0xff8a2a, 0xc8422a, { n: 240, add: false, vel: [1.1, -1.2, .4], sway: 2.0, opacity: .9, size: .3 }),
    fort: { family: 'gothic', trim: 0xe0b080, light: 0xffa040 }, flank: 6,
    art: () => `<path d="M66 64V52" stroke="#6a4a2e" stroke-width="6"/><circle cx="58" cy="42" r="11" fill="#d8721e"/><circle cx="76" cy="40" r="12" fill="#c8422a"/><circle cx="67" cy="30" r="9" fill="#e0a82a"/><circle cx="88" cy="44" r="2.5" fill="#d8721e"/><circle cx="94" cy="52" r="2.5" fill="#e0a82a"/><circle cx="84" cy="56" r="2" fill="#c8422a"/><path d="M96 62h20" stroke="#6a4a2e" stroke-width="7" stroke-linecap="round"/><circle cx="116" cy="62" r="3" fill="#d8c49a"/><circle cx="46" cy="58" r="3.4" fill="#c85a2a"/><rect x="45" y="60" width="2" height="3" fill="#e8e0d0"/>` },

  // 40 Sakura Castle: blossom trees, petal drifts, lanterns, torii gates and a far pagoda.
  sakura: { palette: { sky: 0xffd8e8, fog: 0xfff0f4, ground: 0xb8e0a0, road: 0xa8a0a8, rail: 0xd83a4a, tower: 0xe8e0d8, roof: 0x3a3a5a },
    lights: [0xfff8fc, 0xb09aa8, 1.75, 0xfff0f4, 2.2],
    ambient: amb(0xffd0e0, 0xff9ab8, { n: 280, add: false, vel: [.8, -1.0, .4], sway: 1.8, opacity: .9, size: .28 }),
    fort: { family: 'crown', trim: 0xffe0e8, light: 0xffb0c8 }, flank: 7, post: 0x8a7078,
    art: () => `<rect x="58" y="56" width="12" height="7" fill="#e8e0d0"/><path d="M52 56q12-6 24 0l-3-4H55z" fill="#8a4a3a"/><rect x="60" y="48" width="8" height="6" fill="#e8e0d0"/><path d="M55 48q9-5 18 0l-3-4h-12z" fill="#8a4a3a"/><rect x="61.5" y="41" width="5" height="5" fill="#e8e0d0"/><path d="M57 41q7-5 14 0l-2-4h-10z" fill="#8a4a3a"/><circle cx="64" cy="35" r="1.8" fill="#ffc84a"/><path d="M95 64V52" stroke="#503238" stroke-width="5"/><circle cx="90" cy="46" r="10" fill="#ffb8cc"/><circle cx="102" cy="44" r="8" fill="#ff9ab8"/><circle cx="87" cy="52" r="1.8" fill="#ffd0dc"/><circle cx="105" cy="49" r="1.6" fill="#ffd0dc"/><path d="M39 64V52m14 12V52" stroke="#d8382a" stroke-width="4"/><path d="M35 52q11-5 22 0" stroke="#d8382a" stroke-width="4" fill="none"/><path d="M38 57h16" stroke="#d8382a" stroke-width="3"/><circle cx="52" cy="30" r="1.8" fill="#ffb8cc"/><circle cx="44" cy="24" r="1.5" fill="#ffb8cc"/>` },

  // 41 Dino Valley: ferns and cycads, nests with eggs, rib cages, smoking volcanoes.
  dino: { palette: { sky: 0xa0e0d0, fog: 0xd0f0c8, ground: 0x6aa83a, road: 0x8a8070, rail: 0x7a5a3a, tower: 0x5a6a2a, roof: 0xd8902a },
    lights: [0xf8ffe0, 0x5a7a3a, 1.65, 0xfff0c8, 2.3],
    ambient: amb(0xd8ff9a, 0x6ac040, { n: 140, add: false, vel: [.4, -.3, .3], sway: 1.2, opacity: .6 }),
    fort: { family: 'temple', trim: 0xd8c08a, light: 0xffc060 }, flank: 5,
    art: () => `<circle cx="66" cy="28" r="5" fill="#7a6a60"/><circle cx="73" cy="22" r="3.5" fill="#7a6a60"/><path d="M46 64l12-24 12 24z" fill="#5a443c"/><ellipse cx="58" cy="40" rx="4" ry="1.8" fill="#ff6a1a"/><path d="M40 62q-6-8-2-13m2 13q6-8 2-13" stroke="#3a8a3a" stroke-width="2.5" fill="none"/><path d="M94 58h18" stroke="#e8e0cc" stroke-width="2.5"/><path d="M96 62q7-14 14 0" stroke="#e8e0cc" stroke-width="3" fill="none"/><path d="M74 58q7 6 14 0l-2 5H76z" fill="#9a7a4a"/><circle cx="79" cy="56" r="2.6" fill="#f2ecdc"/><circle cx="85" cy="56" r="2.6" fill="#e4ecd6"/>` },

  // 42 Misty Swamp: murky water strips, cypress with hanging moss, lily pads, reeds.
  swamp: { palette: { sky: 0x7a9a7a, fog: 0x8aa88a, ground: 0x3a5a3a, road: 0x76806a, rail: 0x9ad83a, tower: 0x3a4a2a, roof: 0x9ad83a },
    lights: [0xd8f0d0, 0x3a4a30, 1.55, 0xe8f0c8, 1.9],
    ambient: amb(0xc8ff6a, 0x6a9a3a, { twinkle: 1, vel: [.2, .35, .2], sway: 1.2 }),
    fort: { family: 'reef', trim: 0xb0c890, light: 0xc8ff6a }, flank: 8, post: 0x4a5a44,
    art: () => `<path d="M58 64l1-14h4l1 14z" fill="#655743"/><circle cx="60" cy="42" r="10" fill="#4a7038"/><circle cx="60" cy="33" r="7" fill="#54783c"/><path d="M52 46v6m16-6v7m-8 6v5" stroke="#7e8f56" stroke-width="2"/><ellipse cx="98" cy="60" rx="24" ry="4.5" fill="#27402e"/><ellipse cx="90" cy="59" rx="4" ry="1.8" fill="#3f8a3a"/><ellipse cx="102" cy="61" rx="4.5" ry="2" fill="#3f8a3a"/><circle cx="102" cy="58.5" r="1.6" fill="#ffb0c8"/><path d="M84 63V52m5 11V54m5 9v-9" stroke="#5f8a3a" stroke-width="2"/><circle cx="84" cy="51" r="1.6" fill="#8a5a2a"/><circle cx="94" cy="53" r="1.4" fill="#8a5a2a"/>` },

  // 43 Tar Pits: glossy pools with bubbles, bones, dead trees, steam vents and glowing seams.
  tarpit: { palette: { sky: 0x6a4a3a, fog: 0x6a5040, ground: 0x2a2018, road: 0x5a4c3e, rail: 0xffa040, tower: 0x3a2a1a, roof: 0xffa040 },
    lights: [0xffe0c0, 0x402818, 1.5, 0xffc890, 2.0],
    ambient: amb(0xffb060, 0xff4a08, { n: 220, twinkle: 1, vel: [.2, 1.4, .2] }),
    fort: { family: 'gothic', trim: 0x8a6a4a, light: 0xffa040 }, flank: 12, post: 0x5a4030,
    art: () => `<ellipse cx="70" cy="58" rx="24" ry="7" fill="#14141a"/><path d="M52 57q18 5 36 0" stroke="#3a3a4a" stroke-width="2" fill="none"/><circle cx="62" cy="56" r="2" fill="#2a2a36"/><circle cx="76" cy="60" r="1.6" fill="#2a2a36"/><circle cx="70" cy="54.5" r="1.2" fill="#2a2a36"/><path d="M96 58h14" stroke="#e8e0cc" stroke-width="3" stroke-linecap="round"/><circle cx="96" cy="57" r="2" fill="#e8e0cc"/><circle cx="110" cy="59" r="2" fill="#e8e0cc"/><path d="M42 62V44m0 6 6-4m-6 10-5-4" stroke="#3a2e22" stroke-width="3" fill="none"/><circle cx="88" cy="63" r="2" fill="#ff6a1a"/><circle cx="100" cy="30" r="1.6" fill="#ffb060" opacity=".8"/>` },

  // 44 Amber Caves: glowing amber clusters and spikes, insect nodules, hanging stalactites.
  amber: { palette: { sky: 0x3a2010, fog: 0x5a3018, ground: 0x4a2a14, road: 0x5a4030, rail: 0xffb02a, tower: 0x6a3a10, roof: 0xffc84a },
    lights: [0xffd8a0, 0x402010, 1.5, 0xffc060, 1.9],
    ambient: amb(0xffd87a, 0xff8a1a, { n: 200, twinkle: .8, vel: [.1, .35, .1] }),
    fort: { family: 'prism', trim: 0xffd890, light: 0xffb02a }, glowRoad: true, flank: 3, post: 0x6a4a2a,
    art: () => `<path d="M56 64l-6-16 8-12 8 13-4 15z" fill="#e8940f"/><path d="M74 64l8-24 8 10-6 14z" fill="#c87a0a"/><path d="M96 64l-3-10 6-8 5 9-3 9z" fill="#ffb02a"/><path d="M58 44l-2 20m24-28-6 24" stroke="#a86408" stroke-width="1.5"/><ellipse cx="66" cy="48" rx="2.6" ry="1.6" fill="#241408"/><circle cx="69" cy="47" r="1" fill="#241408"/><circle cx="46" cy="58" r="2" fill="#ffb02a" opacity=".8"/><circle cx="110" cy="56" r="1.6" fill="#ffb02a" opacity=".8"/>` },

  // 45 Sky Nest: giant twig nests with eggs, rock spires, a cloud sea below the edges.
  nest: { palette: { sky: 0x8ad0ff, fog: 0xd8f0ff, ground: 0xc8a878, road: 0x9a9a90, rail: 0xfff0c0, tower: 0x8a6a4a, roof: 0x3a8ad8 },
    lights: [0xffffff, 0xa0b0c0, 1.8, 0xfff8e0, 2.2],
    ambient: amb(0xffffff, 0xd8f0ff, { n: 140, add: false, vel: [2.2, .1, .6], sway: .6, opacity: .5, size: .32 }),
    fort: { family: 'crown', trim: 0xfff0d0, light: 0xffe7a0 }, flank: 7,
    art: () => `<circle cx="46" cy="62" r="8" fill="#fff" opacity=".9"/><circle cx="60" cy="65" r="6" fill="#fff" opacity=".8"/><circle cx="106" cy="63" r="9" fill="#fff" opacity=".9"/><path d="M40 58l5-16 5 16z" fill="#b09a78"/><path d="M118 60l4-12 4 12z" fill="#a08a68"/><path d="M62 38q18 14 36 0l-4 10H66z" fill="#9a7a4a"/><path d="M66 42q14 8 28 0" stroke="#7a5a32" stroke-width="2" fill="none"/><ellipse cx="74" cy="42" rx="4" ry="5" fill="#f2ecdc"/><ellipse cx="84" cy="41" rx="4" ry="5" fill="#e4ecd6"/>` },

  // 46 Prism Labs: glass prisms on pedestals, emitter posts, tech panels, rainbow strips.
  prismlab: { palette: { sky: 0xe8f0ff, fog: 0xe6edfa, ground: 0xc6d0e2, road: 0x8a96b0, rail: 0x3ad0ff, tower: 0x5a6a9a, roof: 0xff4fd8 },
    lights: [0xffffff, 0x9aa8c0, 1.75, 0xffffff, 2.1],
    ambient: amb(0x3ad0ff, 0xff4fd8, { n: 180, twinkle: 1, vel: [0, .6, 0], sway: .4 }),
    fort: { family: 'station', trim: 0xd8e0f0, light: 0x3ad0ff }, flank: 7, post: 0x8a94a8,
    art: () => `<path d="M62 30l10 18H52z" fill="#dff4ff" opacity=".9"/><path d="M62 30v18" stroke="#9adfff" stroke-width="1.5"/><rect x="56" y="48" width="12" height="15" fill="#f0f2f6"/><rect x="54" y="60" width="16" height="4" fill="#dfe4ee"/><rect x="96" y="40" width="3" height="16" fill="#e8ecf4"/><circle cx="97.5" cy="38" r="3" fill="#8af0ff"/><rect x="42" y="56" width="14" height="8" rx="1.5" fill="#e8ecf2"/><rect x="44" y="58" width="3" height="4" fill="#3ad0ff"/><rect x="49" y="58" width="3" height="4" fill="#ff4fd8"/><g><rect x="88" y="58" width="6" height="4" fill="#ff4a4a"/><rect x="94" y="58" width="6" height="4" fill="#ffa020"/><rect x="100" y="58" width="6" height="4" fill="#ffe020"/><rect x="106" y="58" width="6" height="4" fill="#40c040"/><rect x="112" y="58" width="6" height="4" fill="#3060ff"/><rect x="118" y="58" width="6" height="4" fill="#a030ff"/></g>` },

  // 47 Aurora Tundra: snowy pines, ice crystal spires, and aurora curtains far over the snow.
  aurora: { palette: { sky: 0x0a1a3a, fog: 0x1a2a4a, ground: 0xd8e8f8, road: 0x6a7a98, rail: 0x3affa0, tower: 0x2a4a6a, roof: 0x3affa0 },
    lights: [0xc0e0ff, 0x405068, 1.5, 0xd0fff0, 1.9],
    ambient: amb(0xffffff, 0xcfffe8, { n: 420, add: false, vel: [.5, -1.6, .4], sway: 1.0, opacity: .9 }),
    fort: { family: 'crown', trim: 0xe8f4ff, light: 0x3affa0 }, glowRoad: true, flank: 3, post: 0x7a8aa0,
    art: () => `<circle cx="50" cy="16" r="1.3" fill="#fff"/><circle cx="86" cy="10" r="1.1" fill="#fff"/><circle cx="118" cy="20" r="1.4" fill="#fff"/><path d="M38 28q20-16 42-6t42-10" stroke="#3affa0" stroke-width="5" fill="none" opacity=".85"/><path d="M42 38q20-12 38-4t38-8" stroke="#6affd8" stroke-width="4" fill="none" opacity=".7"/><ellipse cx="60" cy="63" rx="20" ry="5" fill="#eef6ff"/>${pine(102, 64, '#2a4a44')}${pine(116, 66, '#35605a')}` },

  // 48 Chrono Clockworks: brass clock towers, standing gears, pendulums and hourglasses.
  chrono: { palette: { sky: 0x3a2a1a, fog: 0x4a3a28, ground: 0x453a2c, road: 0x6a6056, rail: 0xffc84a, tower: 0x6a4a2a, roof: 0xffc84a },
    lights: [0xffe8c8, 0x403020, 1.55, 0xffe0a0, 2.0],
    ambient: amb(0xffd86a, 0xb08a3a, { n: 180, twinkle: .8, vel: [.2, .4, .1], sway: .5 }),
    fort: { family: 'station', trim: 0xd0b080, light: 0xffc84a }, flank: 10, post: 0xb08a4a,
    art: () => `<rect x="54" y="26" width="16" height="38" fill="#b08a3a"/><path d="M52 26l10-9 10 9z" fill="#6a4a1a"/><circle cx="62" cy="42" r="7" fill="#f5efdc"/><path d="M62 42V37m0 5 4 3" stroke="#6a4a1a" stroke-width="1.6" fill="none"/><circle cx="92" cy="54" r="10" fill="none" stroke="#c8982a" stroke-width="4" stroke-dasharray="4 3"/><circle cx="92" cy="54" r="6" fill="#c8982a"/><circle cx="92" cy="54" r="2" fill="#8a6a2a"/><circle cx="108" cy="42" r="8" fill="none" stroke="#c8982a" stroke-width="3.4" stroke-dasharray="3.4 2.6"/><circle cx="108" cy="42" r="4.6" fill="#c8982a"/><path d="M113 50h8l-3 6 3 6h-8l3-6z" fill="#dceef2"/><rect x="112" y="48" width="10" height="2.4" fill="#9a7a2a"/><rect x="112" y="61.6" width="10" height="2.4" fill="#9a7a2a"/>` },

  // 49 Nebula Reef: glowing space coral, drifting jellies, asteroid reefs under a nebula sky.
  nebula: { palette: { sky: 0x0a0624, fog: 0x1a0a3a, ground: 0x14102e, road: 0x2a2054, rail: 0x6af0ff, tower: 0x3a1a6a, roof: 0xff6ad0 },
    lights: [0xb0c0ff, 0x201040, 1.45, 0xd0b0ff, 1.8],
    ambient: amb(0x8af0ff, 0xff6ad0, { n: 300, twinkle: 1, vel: [.6, .2, 1.0], sway: .4 }),
    fort: { family: 'reef', trim: 0xb0c8ff, light: 0x6af0ff }, glowRoad: true, flank: 9, post: 0x3a2a5a,
    art: () => `<circle cx="48" cy="20" r="1.4" fill="#fff"/><circle cx="70" cy="12" r="1.2" fill="#fff"/><circle cx="96" cy="18" r="1.6" fill="#fff"/><circle cx="120" cy="26" r="1.2" fill="#fff"/><circle cx="52" cy="34" r="5" fill="#3a2f4a"/><circle cx="112" cy="34" r="4" fill="#3a2f4a"/><path d="M60 64V44m0 10-9-8m9 4 10-8" stroke="#ff6ad0" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M100 64V48m0 8 8-7m-8 2-8-6" stroke="#6af0ff" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M74 30a8 7 0 0 1 16 0z" fill="#ff9ae0" opacity=".85"/><path d="M76 30q0 6 2 8m6-8q0 6-1 9m6-9q0 5-2 7" stroke="#ffb0e8" stroke-width="2" fill="none"/>` },

  // 50 Singularity Throne: golden pillar avenue, floating crowns and orbs under a far portal ring.
  throne: { palette: { sky: 0x05020e, fog: 0x120628, ground: 0x0e0818, road: 0x1c1430, rail: 0xffd86a, tower: 0x1a0a2a, roof: 0xffd86a },
    lights: [0xd8c0ff, 0x1a0a28, 1.45, 0xffe0b0, 1.9],
    ambient: amb(0xffd86a, 0xb04aff, { n: 260, twinkle: 1, vel: [.1, .9, .4], sway: .6 }),
    fort: { family: 'gothic', trim: 0xffe0a0, light: 0xffd86a }, glowRoad: true, flank: 12, post: 0x3a2a5a,
    art: () => `<circle cx="50" cy="18" r="1.3" fill="#ffe8c0"/><circle cx="112" cy="14" r="1.2" fill="#ffe8c0"/><circle cx="122" cy="30" r="1.4" fill="#ffe8c0"/><circle cx="80" cy="32" r="17" fill="none" stroke="#ffd86a" stroke-width="4"/><circle cx="80" cy="32" r="12" fill="#2a1444" opacity=".85"/><circle cx="80" cy="32" r="7" fill="#6a3aff" opacity=".5"/><path d="M70 64h20l-3-6H73z" fill="#241430"/><rect x="76" y="52" width="8" height="6" fill="#140a20"/><path d="M46 64V38h4v26M110 64V38h4v26" fill="#d8a838"/><rect x="44" y="35" width="8" height="3" fill="#ffd86a"/><rect x="108" y="35" width="8" height="3" fill="#ffd86a"/><path d="M74 20l2 5h8l2-5-3 3-3-4-3 4z" fill="#ffd86a"/>` },
};
