# Swarm Surge

A mobile-first 3D crowd shooter that runs in the browser. Drag to aim your cannon, fire a stream of blue units through multiplier gates, and let the swarm grow from a handful to billions before it crashes into the enemy fort or boss.

- 20 levels, 3 stages each, across 20 themed worlds
- Gates (`+`, `x`, `÷`, flip, slot machine, phasing), barriers, ice vaults, portals, jump pads, loops and conveyor belts
- Upgrades you charge with your own units: extra guns, rapid fire, POWER x2, twin gun, SQUAD side cannons, NUKE, hearts and tesla coils
- Enemy gates, rival cannons, tornadoes, black holes (feed them for a SUPERNOVA), rolling swarm balls, toppling pillars and meteors
- 20 procedurally built bosses: every model is generated in code, with no asset files

Difficulty: levels 1–3 very easy, 4–10 moderately easy, 11–15 medium-hard, 16–20 hard.

## Run it

No build step. Serve the folder with any static server and open it:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Useful URL parameters: `?level=12&stage=2` jumps straight to a stage, `speed=2` runs the game faster, `turbo=1` runs it as fast as possible (for bots).

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

Balance targets: `naive` wins levels 1–3; `smart` wins 4–15 comfortably; 16–20 are close fights where `smart` sometimes loses.

## Tech

Plain ES modules plus [three.js](https://threejs.org) (vendored, MIT). Units live in struct-of-arrays pools with a spatial grid for combat, so tens of thousands of units stay smooth on a phone.
