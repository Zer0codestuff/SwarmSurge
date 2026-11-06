# Swarm Surge

## Purpose and architecture
Browser crowd shooter with 20 worlds and three stages per world. Plain JavaScript ES modules and vendored Three.js, with no build step or backend.
- `index.html`: UI, styles and import map.
- `src/main.js`: rendering, simulation, input, saved progress and debug hooks.
- `src/levels.js`, `src/levels2.js`, `src/campaign.js`: stage definitions, equipment routes, pacing and announced flanks.
- `src/arsenal.js`: thirteen troop ranks, eight weapons, six vehicle forms, three aircraft grades and swept circle collision.
- `src/troop-forms.js`: sculpted allied rank forms, the enemy raider and enemy gear overlays. `src/weapon-assets.js`: the eight sculpted troop weapons.
- `src/unit-assets.js`: troop geometry builder, ghost overlay and stride shaders. `src/vehicle-assets.js`: lofted vehicle hulls, the starting carriage, the lathe barrel and the charge-orb socket. `src/air-assets.js`: lofted aircraft with airfoil wings, canopies and lathe nacelles.
- `src/asset-kit.js`, `src/boss-shapes.js`: batched surfaces, continuous anatomical lofts, swept forms, domed armor and folded cloth.
- `src/boss-sculpted-core.js`, `src/boss-sculpted-late.js`, `src/boss-sculpted-royal.js`: the full sculpted boss roster. `src/bosses.js` adapts the late builders.
- `src/fort-assets.js`: sculpted biome forts (curved curtain wall, pillowed stone courses, arched gatehouse, one tower design per family). `src/battlefield-assets.js` re-exports it and builds the lathe-and-loft turret, vaulted igloo and ribbed dome bunkers, jersey-barrier divider, toothed hydraulic crusher and fluted falling pillar.
- `src/scenery-assets.js`: sculpted roadside props (saguaros, rock clusters, pines, palms, coral, lollipops, columns, gears, crates, mountains, crystals and more) used by `models.buildWorld` and `src/worlds.js`.
- `src/map.js`, `src/map.css`: biome island map and progressive unlocks.
- `src/tutorials.js`: persisted first-introduction lessons. Other modules build worlds, props, bosses, pooled effects and synthesized audio.

## Run and verification
- Railway deployment uses the root Dockerfile and Caddyfile to serve only index.html, src and vendor. Caddy listens on Railway's PORT, defaulting to 8080. No application build step is required.
- Railway project: SwarmSurge (85f13dc6-b388-49b6-8958-ac97f96b5d56), production environment e72c5f09-fe4f-4302-b2d0-a32eb632bbe8. Deploy the GitHub main branch through the connected Railway service.
- Serve from the root: `python3 -m http.server 8000 --bind 127.0.0.1`. Open `http://localhost:8000/index.html`.
- Drag horizontally, use arrow keys or A/D to aim. Firing is automatic. Pause with the HUD button, Escape or P.
- `?level=12&stage=2` starts a selected stage. `speed=2` accelerates simulation; `turbo=1` skips rendering for bots.
- Debug through `window.__game.state` and `window.__game.dbg(source)`. Inspect desktop and mobile bounds when changing UI.
- Install check dependencies with `cd tools && npm ci`. Run `CHROME_PATH=/path/to/chrome node check-game.mjs`. Add `--campaign` for all 20 worlds with the smart policy and seed 42, or `--levels=8,19` for selected worlds. Reports are ignored under `tools/out/`; selected runs preserve the full campaign report.
- Run tutorial policy checks with `node tools/tutorial-checks.mjs` from the root. Run mobile resolution checks with `CHROME_PATH=/path/to/chrome node tools/mobile-quality-checks.mjs`. No test script is configured in package.json.
- Run `CHROME_PATH=/path/to/chrome node tools/asset-checks.mjs` for boss geometry, deterministic poses, collision metadata, fort bounds and defense model contracts.
- Older optional bots hardcode `/usr/bin/chromium`; older screenshot tools assume `/tmp/ss`. Adapt them before use on macOS. The main checker polls readiness on a timer because background headless tabs can throttle animation frames.

## Current behavior
- Balls absorb contact and ranged damage during deployment and rolling, including continuous collision against fast troops. Overkill preserves unused troop power and grants four seconds of x2 cannon output. Frost and impact timers expire during deployment too. Charged giants preserve their output when the troop pool is full.
- Rapid doubles rate up to x8; Power triples output. Levels accumulate a mixed arsenal through crates, with multiplication copies retaining their weapon. Equipment persists across stages and stage retries. Escorts mirror cannon volleys and reinforce armor.
- Weapons have separate ranges, cooldowns and effects: blasters, rocket splash, chain lightning, scatter cones, piercing railguns, burning flames, frost slow and plasma splash. Spatial targeting respects cover and reserves firing capacity for troops with actual targets.
- Mixed arsenals can trigger Shatter and Ignition. Railguns consume frost for x1.6 hit damage; plasma consumes burning for x1.4 damage. Reaction feedback is limited to once per second and does not create troops. Worlds 10 and 16 supply frost plus rail; Factory and the finale supply flame plus plasma.
- Bulldog, Siege, Spider, Hover, Rail and Titan forms have animated shells, specialist equipment and armor. Transformations never downgrade a stronger form. Grounded treads and feet stop at zero speed; breathing and hover idle motion remain. Barrels have recessed bores and coolant ports, with flashes at the actual muzzle. Hulls, turrets, fenders, limbs and wheels are lofts, lathes and sweeps (cast turrets, rocket pods, a curved dozer blade, ducted fans, domed pauldrons); node names, pivots and mount anchors are unchanged. The starting carriage is a rounded mortar housing on four spoked wheels; vehicle forms seat the charge orb on a pedestal.
- Air upgrades progress through Scout interceptor, Strike jet and Stealth bomber. Higher grades strike more frequently, deal more damage and cover a wider lane. Each pass keeps its captured grade until it finishes. Models are cached lazily; hangars use the same aircraft assets. Fuselages, wings, fins, canopies and nacelles are lofts and lathes; color zones are separate pieces with shared joins because per-vertex bands blur on coarse lofts. They cost 3.5k to 5.2k triangles (previously 0.8k to 1.3k), with one aircraft visible at a time.
- Armor absorbs each cannon hit before hearts. Full blocks use a shield response without false heart-loss feedback. Only overflow damages hearts, including when healing occurs in the same update.
- Heart pickups can raise lives to fifteen. Results show the remaining total rather than dividing bonus hearts by the ten starting lives.
- Destroyed bunkers are removed before their reinforcement timer is handled, preventing a final wave after a lethal hit.
- All 60 stages have equipment routes and revised pacing. Normal late stages have limited, announced biome flanks; surge routes retain their overpowered rhythm. Long fights expose armor up to x4 hit damage. Moon Base and the stationary Neon Nights opening were shortened after balance measurements.
- World 2 stage 1's divider starts at distance 14.5, meeting the fence at distance 15. Keep this junction closed so troops must break the fence before entering the multiplier ladder.
- The island map unlocks worlds progressively and preserves legacy saves. Victories save before result animation. The map can retain one exact in-memory battle until another world starts or the page reloads.
- Basic tutorials appear only on first introductions in world one. Movement gate variants share one lesson. Replays, retries, existing wins and debug starts skip repeated prose. Opening the map does not consume a lesson.
- A drag stays attached to its first pointer until release, cancellation, lost capture or pause. Mouse aiming starts only with the primary button. Focus loss clears held input and pauses simulation, audio, HUD animation and rendering. Resize redraws a frozen scene once. Progress, mute and tutorials use separate localStorage keys. Blocked or full storage does not prevent startup or mute changes; unavailable persistence falls back to session memory.
- New runs clear smoothed army counters, popups, recoil, camera kick and damage or nuke flashes. Resuming the in-memory battle retains its simulation state.

## Visuals and resource ownership
- Allied troops change body form with rank: Surge bot (ranks 1 to 3), Trooper (4 to 6), Paladin (7 to 9) and Ascended (10 to 13). Each form has near and far instanced meshes; empty meshes are hidden. All forms share the hip pivot, hand anchors and footprint, so weapons, stride and collision are unchanged. Enemies use a horned raider with sculpted bomb, shield, tank helmet, drone jetpack and crab carapace overlays.
- Troops use instanced stride animation with matching shadow shaders. Projected-size detail selection preserves colors, weapon placement and motion phase. Sleeping, flying and airborne units stop walking. Rolling balls use the lighter troop geometry.
- Drones have jetpacks and winglets, crabs have shell plates and claws, and ghosts have halos and wisps. Floating bodies and weapon aim heights agree; special lights share a twelve-point budget.
- All twenty bosses have native rigs with separate silhouettes and equipment, including the lunar explorer, candy sovereign, articulated Kraken, lantern Pumpkin King, the world 10 void colossus Titan (slit helm, spiked gauntlets, pulsing core, floating shard halo; no longer a recolored skeleton), coil-backed Thunder guardian and armored royal Emperor. Their root transforms stay under engine control; attack poses use the full 1.25-second cycle, and stationary or stunned legs stop walking. Rendering preserves authored boss scale. Boss rig geometry belongs to the level; the asset kit materials are shared. The old primitive boss builders have been removed.
- All twenty bosses use continuous shaped anatomy, carved faces, curved shells, domed armor and folded cloth. Skin, forged metal and cloth use separate shared materials. The user rejected the previous stacked block construction; both obsolete block-model modules have been removed. Asset batches preserve authored vertex shades. The boss triangle budget is 40,000 per rig, with one boss visible at a time.
- Boss camera framing fits a conservative upper corner below the HUD, widening only when needed. Both desktop and portrait boss openings were checked for obstruction.
- Primary boss and fort health stays in the fixed target bar. Damage numbers alternate beside the target with one active number per flank, expire cleanly and hide when no side space remains. Decorative forts carry no misleading HP label. HUD size observation and a reserved target text row keep framing current as content changes.
- Forts use eight architecture families across twenty biome palettes: bastion (machicolated round towers, conical roofs), temple (stepped tiers, shrine, carved mask), crown (onion domes with icicles, clouds or candy bands), station (modules with observatory, mast or chimneys), gothic (buttressed spires, lancet windows), reef (turret-shell spire, coral), prism (hex column, crystal cluster) and casino (gold dome, chip, marquee bulbs). The curtain wall bends back toward the towers; stone courses frame windows and the gate. Banner and gate groups keep their names and animation. Turrets aim and recoil with beams starting at their muzzle. Bunker doors respond to reinforcement spawns; crusher rods follow the moving ram. Props retain their collision dimensions and add no lights or raster textures.
- Gates use lathe pylons with trim collars, glowing caps and side strips, a rounded lintel, a ramped sill and floor chevrons. Caps and frame follow `setColor`; the collar trim material is shared.
- Storm Peaks clouds stay in lateral banks. Open wind spirals leave gate labels visible through tornadoes. HUD panels exclude world health labels; the fixed target bar shows remaining HP and percentage. Future-stage geometry is hidden.
- On touch devices, sustained slow frame timing can lower the rendering pixel ratio in steps and restore it after recovery. Stable 30 Hz cadence and long interruptions do not trigger a reduction; glow sizing follows resolution changes. Text shadows avoid duplicated letter silhouettes. Landscape phone layouts place the target bar below the level name and lower banners clear of it.
- Tracers use 128 reusable slots; splash rings use 64. Halo and combo effects are capped. Shared geometry/material templates live for the module lifetime. Level cleanup releases instance buffers without disposing borrowed templates, including grouped effects.

## Latest evidence and next steps
- Mobile text shadows, landscape HUD overlap and multitouch aiming were corrected; portrait, narrow, landscape and desktop layouts were inspected. The full seed-42 bot campaign cleared 20 worlds and 60 stages; 56 gameplay, 15 tutorial and all boss, fort and defense asset checks passed. Mobile emulation does not measure physical-device performance.
- World 2's fence bypass was reproduced and fixed by extending the divider. Focused engine checks confirm the side route stays blocked and the broken fence opens the ladder. Desktop and 390 x 844 views were inspected; the seed-42 smart bot clears all three world 2 stages with ten hearts.
- Fifty-six focused gameplay checks and fifteen tutorial policy checks pass. The latest full seed-42 smart-bot run clears all 20 worlds and 60 stages. Bot success does not replace human balance feedback.
- All twenty sculpted bosses were inspected in contact sheets, including a royal before/after under identical lighting and camera. They use 7 to 23 meshes and 8,454 to 37,280 triangles. Asset contracts pass. Sculpted forts keep seven meshes and use 5,480 to 12,264 triangles (previously 3,260 to 5,308).
- The refreshed seed-42 bot run clears all twenty worlds and sixty stages with the sculpted roster. All twenty rendered defeats complete, desktop and portrait opening silhouettes clear the HUD, and eight finale restarts after warmup hold at 189 geometries, 24 textures and 32 shader programs. These counts do not establish physical mobile frame rate.
- Sculpted scenery replaced the primitive props in all twenty biomes with the same scatter placement. Opening scenes measured +37k to +140k rendered triangles (for example world 4 128k to 225k, world 19 104k to 244k) with unchanged draw calls; small props no longer cast shadows.
- Desktop and 390 x 844 scenes were inspected for Storm Peaks, mixed troops, vehicles and aircraft. A short Terra 6.1 medium review identified the tornado obstruction, which was corrected.
- A rendered 800-troop, two-ball comparison reduced total triangles from 3,624,204 to 1,693,964. Each ball dropped from 276,480 to 92,160 triangles. Six cannons with six barrels each dropped from 441 to 369 draw calls including shadows. These measure workload, not physical mobile frame rate.
- Ten rendered Coral Coast restarts after aircraft warmup held at 139 geometries, 18 textures and 31 shader programs. A 1,000-impact stress run stayed within 64 rings. All eight weapon sounds produced finite nonzero offline audio.
- Rank forms and sculpted weapons cost +2% to +7% rendered triangles against the box-built troops in the same seeded scenes (for example 1.21M to 1.29M at world 20 stage 2). Draw calls rose by at most six.
- Sculpted vehicles cost 8.7k to 13.5k triangles per cannon with one barrel (previously 2.3k to 6.2k). Same seeded scenes: world 1 opening 216k to 227k rendered triangles, world 16 with two Titans and eight barrels 403k to 455k; draw calls within two.
- Sculpted defenses: turret 5.3k, igloo 3.4k, dome 4.7k, crusher 3.2k, pillar 4.4k and a 12-unit divider 1.0k triangles (previously 0.7k to 2.4k). `assetBatch().add` accepts a color function of the placed vertex.
- Storm still reuses the dragon rig with sky wings; it is the next candidate for a separate silhouette.
- Physical mobile devices, sustained hardware performance and human difficulty remain unvalidated. Keep further checks focused.

## Preferences and do not
- Keep artifacts in English and never use em dashes. Preserve the game's visual identity, biome map, localStorage progress, intermediate ranks and deliberately overpowered routes.
- Make frequent logical commits. Push each change on its own branch, then use a PR and `gh pr merge --squash --delete-branch` immediately. The user authorized this workflow without another confirmation. Keep Zer0codestuff as sole author.
- Do not push directly to main, add agent signatures or include unrelated user changes.
- Do not introduce a build system, backend or external asset dependency just to serve the game.
- Do not restore the flat level grid, erase legacy progress, collapse troop ranks or remove the overpowered multiplier routes.
- Do not repeat tutorial prose on every stage or place storm clouds above the road.
- Do not return forts to one recolored box template or scenery to bare cones, cylinders and floating primitives.
- Do not build boss anatomy from stacked boxes or replace the sculpted forms with slightly rounded primitives.
- Do not return troops, enemies, weapons or vehicles to box-built models. The user asked for troops that transform with rank (bot, then soldier, then stronger forms).
- Do not spend excessive time on UI testing or commit screenshots, node_modules or generated reports.
