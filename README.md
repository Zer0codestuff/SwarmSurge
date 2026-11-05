# Swarm Surge

A mobile-first 3D crowd shooter that runs in the browser. Drag to aim your cannon, fire a stream of blue units through multiplier gates, and let the swarm grow from a handful to billions before it crashes into the enemy fort or boss.

- A winding map of 20 biome islands. Clear a world to unlock the next, replay earlier worlds for stars
- 20 levels, 3 stages each, across 20 themed worlds
- Gates (`+`, `x`, `÷`, flip, slot machine, phasing), barriers, ice vaults, portals, jump pads, loops and conveyor belts
- Equipment crates unlock Bulldog and Siege tanks, armor, blasters, splash rockets, chain-lightning rifles and repeated air strikes
- Rapid doubles rate up to x8, Power triples output, and barrel crates add two guns
- 13 troop ranks with distinct colors. Crowded armies fuse power into fewer troops, with extra crowd capacity in surge stages
- Rolling swarms absorb damage even before rolling, shed troops as they shrink, and grant a four-second x2 wreck bonus
- NUKE, gate-boosting stars, hearts and tesla coils
- Enemy gates, rival cannons, tornadoes, black holes (feed them for a SUPERNOVA), rolling swarm balls, toppling pillars and meteors
- 20 procedurally built bosses: every model is generated in code, with no asset files

Equipment persists through the three stages of each level, including stage retries. Longer fights gradually expose the fort or boss armor for up to x4 hit damage. The campaign favors short rounds and large power spikes.

## Run it

No build step. Serve the folder with any static server and open it:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Useful URL parameters: `?level=12&stage=2` jumps straight to a stage, `speed=2` runs the game faster, `turbo=1` runs it as fast as possible (for bots).

## Focused checks

Serve the game, install the optional tools with `cd tools && npm ci`, then run:

```sh
CHROME_PATH=/path/to/chrome node check-game.mjs
CHROME_PATH=/path/to/chrome node check-game.mjs --campaign
```

The first command checks ball collision, airborne immunity, weapon line of sight, power conservation, armor, Rapid, retry state, map locks, legacy progress and immediate victory saves. The second also simulates all 20 campaigns with the smart policy and seed 42. JSON results go to `tools/out/campaign.json`. Chrome is discovered in standard application and Linux locations; set `CHROME_PATH` for a cached headless browser. `GAME_URL` overrides the default server URL.

## Bot harness (`tools/`)

Headless Chromium bots play the game to check balance. They need `npm install` in `tools/`, a Chromium binary at `/usr/bin/chromium`, and the static server on port 8000.

```sh
cd tools && npm install
node run.mjs 4 smart          # play level 4 with the "smart" policy
./batch.sh "1 2 3" "smart naive"  # several levels and policies in parallel
node smoke.mjs 20             # load all 20 levels (60 stages) and report runtime errors
node peek.mjs 13 3 smart l13s3  # screenshots of a stage while a bot plays it
node probe.mjs 17 3 smart "0" "G.army" 20 1   # sample any engine expression every game second
python3 tune.py 3 --full 16:3 17:3  # rescale tower/boss HP toward a target clear time
```

`smart` plans the best route through the gates, defends against packs near the cannon and skips slow upgrades; `naive` plays like a casual player who chases the biggest number on screen.

The current seed-42 smart-policy run clears all 20 worlds. Bot timings guide pacing; human feedback is still needed for difficulty and long-session balance.

## Tech

Plain ES modules plus [three.js](https://threejs.org) (vendored, MIT). Units live in struct-of-arrays pools with a spatial grid for combat, so tens of thousands of units stay smooth on a phone.
