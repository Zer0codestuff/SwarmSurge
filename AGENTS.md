# Swarm Surge

## Purpose and architecture
Browser crowd shooter with 20 levels and three stages per level. Plain JavaScript ES modules and vendored Three.js, with no build step or backend. `index.html` contains the UI and import map. `src/main.js` owns rendering, simulation, input, and debug hooks. Level definitions are in `src/levels.js` and `src/levels2.js`; `src/campaign.js` applies equipment routes and pacing. `src/arsenal.js` defines 13 troop ranks and continuous circle collision. `src/map.js` and `src/map.css` render the biome island map and derive unlocks from saved stars. The other modules generate models, worlds, effects, props, bosses, and audio.

## Run and verification
- From the project root: `python3 -m http.server 8000 --bind 127.0.0.1`.
- Open `http://localhost:8000/index.html`. Drag horizontally or use the arrow keys or A/D to aim. Firing is automatic.
- `?level=12&stage=2` selects a stage; `speed=2` accelerates simulation and `turbo=1` skips rendering for bots.
- Inspect the browser console and `window.__game.state` for focused checks. Check desktop and mobile viewports when changing UI.
- Focused regressions: `cd tools && npm ci`, then `CHROME_PATH=/path/to/chrome node check-game.mjs`. Add `--campaign` to simulate all 20 campaigns with the smart policy and seed 42. Reports go to ignored `tools/out/`.
- Optional older bot tools require `npm install` in `tools/`. Their Chromium path is currently hardcoded to `/usr/bin/chromium`, and screenshot tools assume `/tmp/ss` exists. Adapt these prerequisites before running them on macOS. No automated test script is configured in package.json.

## Current status and recent changes
- Troop weapons now spend firing capacity only on valid targets, search past enemies behind cover, and reacquire quickly when idle. Front-line troops cannot be starved by idle back-line troops. Eighteen focused regressions pass.
- Beam effects use a reusable 128-slot instanced pool in `src/fx.js`. The isolated 64-trace case needs one extra draw call instead of 64 and stops allocating a geometry per shot. Nineteen focused regressions cover expiry and capacity as well.
- Added continuous ball collision during deployment delays, remaining-power conservation, damage feedback, and a four-second x2 wreck bonus.
- Rapid doubles rate to x8; Power triples output. Added Bulldog and Siege tank transformations with armor, three troop weapons, and repeated air strikes. Equipment persists across stages and retries.
- All 60 stages have equipment routes and revised pacing. Long fights expose armor gradually, increasing hit damage up to x4. Preserved the largest multiplier routes and extra crowd capacity on surge stages.
- Added 13 troop colors, smaller troop scaling, 24-halo limit, weapon instances, procedural armory icons, textured roads, tank animation, and aircraft. Hidden future stage geometry during play.
- Added a winding campaign map with 20 procedural biome dioramas, progressive unlocks, replayable worlds, stars and a continue button. Legacy late-world wins keep earlier worlds accessible. Victory saves immediately before the result animation.
- Limited combo messages to two at once, respected reduced-motion camera preferences, removed the old card-grid styles and stopped battlefield rendering behind the opaque map.
- Fixed restarting during grouped nuke effects. Fifteen focused gameplay and progression regressions cover the new mechanics. Final seed-42 campaign run completed all 20 levels. Desktop and 390 x 844 layouts were inspected with no document overflow.

## Constraints and next steps
- Keep project artifacts in English and do not use em dashes.
- Preserve the existing visual identity and mechanics unless a change is requested.
- Progress and mute settings use browser localStorage.
- Campaign checks use a bot and do not replace human balance feedback. Sustained performance and physical mobile devices remain unvalidated.
- User requests frequent logical commits followed immediately by merging to main through a PR with `gh pr merge --squash --delete-branch`. Do not ask for another confirmation. Keep the biome map and progressive unlocks; preserve existing localStorage progress.

## Do not
- Do not introduce a build system, backend, or external asset dependency just to serve the game.
- Do not restore the flat level-card grid or erase legacy progress when changing unlock rules.
- Do not remove the deliberately overpowered multiplier routes or collapse the intermediate troop ranks.
- Do not spend excessive time on UI testing; keep browser checks focused.
- Do not commit generated screenshots, node_modules, or unrelated user changes.
- Do not push directly to the default branch or add agent commit signatures.
