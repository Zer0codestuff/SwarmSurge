# Swarm Surge

## Purpose and architecture
Browser crowd shooter with 20 levels and three stages per level. Plain JavaScript ES modules and vendored Three.js, with no build step or backend. `index.html` contains the UI and import map. `src/main.js` owns rendering, simulation, input, and debug hooks. Level definitions are in `src/levels.js` and `src/levels2.js`; `src/campaign.js` applies equipment routes and pacing. `src/arsenal.js` defines 13 troop ranks and continuous circle collision. `src/map.js` and `src/map.css` render the biome island map and derive unlocks from saved stars. The other modules generate models, worlds, effects, props, bosses, and audio.

## Run and verification
- From the project root: `python3 -m http.server 8000 --bind 127.0.0.1`.
- Open `http://localhost:8000/index.html`. Drag horizontally or use the arrow keys or A/D to aim. Firing is automatic.
- `?level=12&stage=2` selects a stage; `speed=2` accelerates simulation and `turbo=1` skips rendering for bots.
- Inspect the browser console and `window.__game.state` for focused checks. Check desktop and mobile viewports when changing UI.
- Focused regressions: `cd tools && npm ci`, then `CHROME_PATH=/path/to/chrome node check-game.mjs`. Add `--campaign` to simulate all 20 campaigns with the smart policy and seed 42. Reports go to ignored `tools/out/`.
- Use `--levels=8` or a comma-separated world list for focused balance runs. These write separate reports so the full-campaign report is preserved.
- Optional older bot tools require `npm install` in `tools/`. Their Chromium path is currently hardcoded to `/usr/bin/chromium`, and screenshot tools assume `/tmp/ss` exists. Adapt these prerequisites before running them on macOS. No automated test script is configured in package.json.

## Current status and recent changes
- `src/unit-assets.js` builds beveled armored troops and eight distinct weapon meshes. Instanced leg motion uses simulation time and matching depth and distance shaders, so animation and shadows freeze together when paused. Enemy equipment overlays fit the taller helmets.
- Troops choose high or low geometry by projected size with hysteresis, retaining their colors, weapon positions and per-unit stride phase. Sleeping and airborne troops stop the walking stride. Rolling balls use the matching low detail bodies. A rendered comparison with 400 allies, 400 enemies and two balls reduced total triangles from 3,624,204 to 1,693,964; each ball dropped from 276,480 to 92,160 triangles. This measures draw workload, not physical mobile frame rate.
- Eight troop weapons now have distinct combat: blasters, rocket splash, chain lightning, scatter cones, piercing railguns, burning flame cones, temporary frost slow and wide plasma splash. Campaign crates introduce them across the biomes. Each level accumulates an arsenal and spawns a mixed army. Weapon unlocks survive stage retries; multiplication copies keep their weapon.
- `src/vehicle-assets.js` supplies six lazily cached animated forms: Bulldog, Siege, Spider, Hover, Rail and Titan. Biome crates preview their actual shells. Specialist forms grant weapons, armor, firing upgrades and Titan air support. Form selection never downgrades the vehicle and retries retain it. Level cleanup releases instance buffers while preserving shared template geometry.
- Storm Peaks clouds now form lateral banks outside the camera corridor, including the opening swoop. Twenty-seven focused checks include transformed cloud bounds; the focused world-19 campaign still clears.
- Storm vortices use three open animated wind spirals, a faint core and a ground footprint instead of opaque stacked hoops. Multiplier labels remain visible through the funnel in desktop and portrait views. Tornado paths and collisions are unchanged. A short Terra 6.1 medium visual review identified this remaining obstruction; the map fit the desktop viewport and the road cloud obstruction was absent.
- `src/tutorials.js` persists first-introduction lessons in `swarm-tutorials`. Basic lessons are limited to world one; movement gates share one lesson. Replays, retries, returning players and debug runs skip repeat prose. Opening the map does not consume a lesson. Policy checks run with `node tools/tutorial-checks.mjs`.
- Balls absorb continuous contact and ranged damage even during deployment, preserve unused troop power and grant a four-second x2 wreck bonus. Charged giants preserve output in a full pool and receive that multiplier too.
- Rapid doubles rate to x8; Power triples output. Bulldog and Siege tanks add armor. Weapons, escort cannons and repeated air strikes persist through stages and retries. Escorts appear in worlds 8, 12 and 14.
- Weapons select visible targets through the spatial grid and spend firing capacity only on actual shots. Idle back-line troops cannot starve the front line.
- Weapon muzzle flashes and traces follow the held gun, with distinct trace widths and eight throttled synthesized sounds. Frozen balls show cyan armor and ground warnings. Splash rings use a reusable 64-slot instanced pool with one draw call; a 1,000-impact stress run retained 64 rings and no ring entries in the scene-effect list. Offline audio renders produced finite, nonzero output for all eight weapons.
- All 60 stages have equipment routes and revised pacing. Later normal stages have limited, announced biome flanks. Tutorials and surge stages keep their rhythm. Long fights expose armor up to x4 hit damage. Moon Base's first stage was shortened after focused balance runs.
- Thirteen troop colors, smaller units, capped halos and combo messages, instanced weapons, textured roads, animated tanks and aircraft reduce clutter. A reusable 128-slot tracer pool adds one draw call for simultaneous shots. Future-stage geometry is hidden.
- The 20-island biome map has progressive unlocks, replayable worlds, stars and legacy-save support. Victories persist before the result animation.
- World health labels hide when they would cross the top HUD or bottom equipment panel. The fixed target bar includes remaining HP and percentage, so distant forts remain readable without overlapping the level name or army counter. Boss labels use a smaller responsive size.
- Pause with the HUD button, Escape or P. Losing focus clears held input and pauses simulation, sound, HUD animation and rendering. The map retains one exact battle in memory until another world starts or the page reloads. Resize redraws a frozen scene once.
- Restart cleanup handles grouped nuke effects. Forty focused regressions cover weapons, statuses, cover, all six transformations, equipment retries, pooled impacts, detail packing and HUD label clearance. The latest full seed-42 smart-bot run with the expanded arsenal and vehicles cleared all 20 worlds and 60 stages. Desktop and 390 x 844 scenes with the new troops, Titan and Storm Peaks opening were inspected. Ten rendered world-20 restarts held at 188 geometries, 24 textures and 30 shader programs before the additional detail meshes and ring pool.

## Constraints and next steps
- Keep project artifacts in English and do not use em dashes.
- Preserve the existing visual identity and mechanics unless a change is requested.
- Progress and mute settings use browser localStorage.
- Campaign checks use a bot and do not replace human balance feedback. Sustained performance and physical mobile devices remain unvalidated.
- User requests frequent logical commits followed immediately by merging to main through a PR with `gh pr merge --squash --delete-branch`. Do not ask for another confirmation. Keep the biome map and progressive unlocks; preserve existing localStorage progress.
- Overnight work is active: improve native 3D troop and weapon assets, add multiple distinct vehicle transformations, and limit tutorials to first introductions. A morning report is scheduled for 2026-11-06 at 09:00 Europe/Rome. Delegate work by file ownership and integrate through separate verified PRs.

## Do not
- Do not introduce a build system, backend, or external asset dependency just to serve the game.
- Do not restore the flat level-card grid or erase legacy progress when changing unlock rules.
- Do not remove the deliberately overpowered multiplier routes or collapse the intermediate troop ranks.
- Do not spend excessive time on UI testing; keep browser checks focused.
- Do not place storm clouds above the playable road or repeat tutorial prose on every stage.
- Do not commit generated screenshots, node_modules, or unrelated user changes.
- Do not push directly to the default branch or add agent commit signatures.
