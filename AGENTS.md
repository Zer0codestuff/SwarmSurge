# Swarm Surge

## Purpose and architecture
Browser crowd shooter with 20 worlds and three stages per world. Plain JavaScript ES modules and vendored Three.js, with no build step or backend.
- `index.html`: UI, styles and import map.
- `src/main.js`: rendering, simulation, input, saved progress and debug hooks.
- `src/levels.js`, `src/levels2.js`, `src/campaign.js`: stage definitions, equipment routes, pacing and announced flanks.
- `src/arsenal.js`: thirteen troop ranks, eight weapons, six vehicle forms, three aircraft grades and swept circle collision.
- `src/unit-assets.js`, `src/vehicle-assets.js`, `src/air-assets.js`: native procedural models and troop motion shaders.
- `src/asset-kit.js`, `src/boss-shapes.js`: batched surfaces, continuous anatomical lofts, swept forms, domed armor and folded cloth.
- `src/boss-sculpted-core.js`, `src/boss-sculpted-late.js`, `src/boss-sculpted-royal.js`: the full sculpted boss roster. `src/bosses.js` adapts the late builders.
- `src/battlefield-assets.js`: biome fort architecture, turret, bunker, divider, hydraulic crusher and falling pillar models.
- `src/map.js`, `src/map.css`: biome island map and progressive unlocks.
- `src/tutorials.js`: persisted first-introduction lessons. Other modules build worlds, props, bosses, pooled effects and synthesized audio.

## Run and verification
- Serve from the root: `python3 -m http.server 8000 --bind 127.0.0.1`. Open `http://localhost:8000/index.html`.
- Drag horizontally, use arrow keys or A/D to aim. Firing is automatic. Pause with the HUD button, Escape or P.
- `?level=12&stage=2` starts a selected stage. `speed=2` accelerates simulation; `turbo=1` skips rendering for bots.
- Debug through `window.__game.state` and `window.__game.dbg(source)`. Inspect desktop and mobile bounds when changing UI.
- Install check dependencies with `cd tools && npm ci`. Run `CHROME_PATH=/path/to/chrome node check-game.mjs`. Add `--campaign` for all 20 worlds with the smart policy and seed 42, or `--levels=8,19` for selected worlds. Reports are ignored under `tools/out/`; selected runs preserve the full campaign report.
- Run tutorial policy checks with `node tools/tutorial-checks.mjs` from the root. No test script is configured in package.json.
- Run `CHROME_PATH=/path/to/chrome node tools/asset-checks.mjs` for boss geometry, deterministic poses, collision metadata, fort bounds and defense model contracts.
- Older optional bots hardcode `/usr/bin/chromium`; older screenshot tools assume `/tmp/ss`. Adapt them before use on macOS. The main checker polls readiness on a timer because background headless tabs can throttle animation frames.

## Current behavior
- Balls absorb contact and ranged damage during deployment and rolling, including continuous collision against fast troops. Overkill preserves unused troop power and grants four seconds of x2 cannon output. Frost and impact timers expire during deployment too. Charged giants preserve their output when the troop pool is full.
- Rapid doubles rate up to x8; Power triples output. Levels accumulate a mixed arsenal through crates, with multiplication copies retaining their weapon. Equipment persists across stages and stage retries. Escorts mirror cannon volleys and reinforce armor.
- Weapons have separate ranges, cooldowns and effects: blasters, rocket splash, chain lightning, scatter cones, piercing railguns, burning flames, frost slow and plasma splash. Spatial targeting respects cover and reserves firing capacity for troops with actual targets.
- Mixed arsenals can trigger Shatter and Ignition. Railguns consume frost for x1.6 hit damage; plasma consumes burning for x1.4 damage. Reaction feedback is limited to once per second and does not create troops. Worlds 10 and 16 supply frost plus rail; Factory and the finale supply flame plus plasma.
- Bulldog, Siege, Spider, Hover, Rail and Titan forms have animated shells, specialist equipment and armor. Transformations never downgrade a stronger form. Grounded treads and feet stop at zero speed; breathing and hover idle motion remain. Barrels have recessed bores and coolant ports, with flashes at the actual muzzle.
- Air upgrades progress through Scout interceptor, Strike jet and Stealth bomber. Higher grades strike more frequently, deal more damage and cover a wider lane. Each pass keeps its captured grade until it finishes. Models are cached lazily; hangars use the same aircraft assets.
- Armor absorbs each cannon hit before hearts. Full blocks use a shield response without false heart-loss feedback. Only overflow damages hearts, including when healing occurs in the same update.
- Heart pickups can raise lives to fifteen. Results show the remaining total rather than dividing bonus hearts by the ten starting lives.
- All 60 stages have equipment routes and revised pacing. Normal late stages have limited, announced biome flanks; surge routes retain their overpowered rhythm. Long fights expose armor up to x4 hit damage. Moon Base and the stationary Neon Nights opening were shortened after balance measurements.
- The island map unlocks worlds progressively and preserves legacy saves. Victories save before result animation. The map can retain one exact in-memory battle until another world starts or the page reloads.
- Basic tutorials appear only on first introductions in world one. Movement gate variants share one lesson. Replays, retries, existing wins and debug starts skip repeated prose. Opening the map does not consume a lesson.
- Focus loss clears held input and pauses simulation, audio, HUD animation and rendering. Resize redraws a frozen scene once. Progress, mute and tutorials use separate localStorage keys. Blocked or full storage does not prevent startup or mute changes; unavailable persistence falls back to session memory.
- New runs clear smoothed army counters, popups, recoil, camera kick and damage or nuke flashes. Resuming the in-memory battle retains its simulation state.

## Visuals and resource ownership
- Beveled troops use instanced stride animation with matching shadow shaders. Projected-size detail selection preserves colors, weapon placement and motion phase. Sleeping, flying and airborne units stop walking. Rolling balls use the lighter troop geometry.
- Drones have jetpacks and winglets, crabs have shell plates and claws, and ghosts have halos and wisps. Floating bodies and weapon aim heights agree; special lights share a twelve-point budget.
- All twenty bosses have native rigs with separate silhouettes and equipment, including the lunar explorer, candy sovereign, articulated Kraken, lantern Pumpkin King, coil-backed Thunder guardian and armored royal Emperor. Their root transforms stay under engine control; attack poses use the full 1.25-second cycle, and stationary or stunned legs stop walking. Rendering preserves authored boss scale. Boss rig geometry belongs to the level; the asset kit materials are shared. The old primitive boss builders have been removed.
- All twenty bosses use continuous shaped anatomy, carved faces, curved shells, domed armor and folded cloth. Skin, forged metal and cloth use separate shared materials. The user rejected the previous stacked block construction; both obsolete block-model modules have been removed. Asset batches preserve authored vertex shades. The boss triangle budget is 40,000 per rig, with one boss visible at a time.
- Boss camera framing fits a conservative upper corner below the HUD, widening only when needed. Both desktop and portrait boss openings were checked for obstruction.
- Primary boss and fort health stays in the fixed target bar. Damage numbers alternate beside the target with one active number per flank, expire cleanly and hide when no side space remains. Decorative forts carry no misleading HP label. HUD size observation and a reserved target text row keep framing current as content changes.
- Forts use eight architecture families across twenty biome palettes. Turrets aim and recoil with beams starting at their muzzle. Bunker doors respond to reinforcement spawns; crusher rods follow the moving ram. Props retain their collision dimensions and add no lights or raster textures.
- Storm Peaks clouds stay in lateral banks. Open wind spirals leave gate labels visible through tornadoes. HUD panels exclude world health labels; the fixed target bar shows remaining HP and percentage. Future-stage geometry is hidden.
- Tracers use 128 reusable slots; splash rings use 64. Halo and combo effects are capped. Shared geometry/material templates live for the module lifetime. Level cleanup releases instance buffers without disposing borrowed templates, including grouped effects.

## Latest evidence and next steps
- Fifty-five focused gameplay checks and fifteen tutorial policy checks pass. The latest full seed-42 smart-bot run clears all 20 worlds and 60 stages. Bot success does not replace human balance feedback.
- All twenty sculpted bosses were inspected in contact sheets, including a royal before/after under identical lighting and camera. They use 7 to 23 meshes and 8,454 to 37,280 triangles. Asset contracts pass. Forts retain seven meshes and 3,260 to 5,308 triangles.
- The refreshed seed-42 bot run clears all twenty worlds and sixty stages with the sculpted roster. All twenty rendered defeats complete, desktop and portrait opening silhouettes clear the HUD, and eight finale restarts after warmup hold at 189 geometries, 24 textures and 32 shader programs. These counts do not establish physical mobile frame rate.
- Desktop and 390 x 844 scenes were inspected for Storm Peaks, mixed troops, vehicles and aircraft. A short Terra 6.1 medium review identified the tornado obstruction, which was corrected.
- A rendered 800-troop, two-ball comparison reduced total triangles from 3,624,204 to 1,693,964. Each ball dropped from 276,480 to 92,160 triangles. Six cannons with six barrels each dropped from 441 to 369 draw calls including shadows. These measure workload, not physical mobile frame rate.
- Ten rendered Coral Coast restarts after aircraft warmup held at 139 geometries, 18 textures and 31 shader programs. A 1,000-impact stress run stayed within 64 rings. All eight weapon sounds produced finite nonzero offline audio.
- Physical mobile devices, sustained hardware performance and human difficulty remain unvalidated. Keep further checks focused.

## Preferences and do not
- Keep artifacts in English and never use em dashes. Preserve the game's visual identity, biome map, localStorage progress, intermediate ranks and deliberately overpowered routes.
- Make frequent logical commits. Push each change on its own branch, then use a PR and `gh pr merge --squash --delete-branch` immediately. The user authorized this workflow without another confirmation. Keep Zer0codestuff as sole author.
- Do not push directly to main, add agent signatures or include unrelated user changes.
- Do not introduce a build system, backend or external asset dependency just to serve the game.
- Do not restore the flat level grid, erase legacy progress, collapse troop ranks or remove the overpowered multiplier routes.
- Do not repeat tutorial prose on every stage or place storm clouds above the road.
- Do not build boss anatomy from stacked boxes or replace the sculpted forms with slightly rounded primitives.
- Do not spend excessive time on UI testing or commit screenshots, node_modules or generated reports.
