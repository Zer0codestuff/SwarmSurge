import { sculptSupplyDrop } from './supply-assets.js';

const DESCENT = 2.4, PICKUP_TIME = 1.6, RADIUS = 1.05;
export function createSupplyDrop(visual) {
  return {phase:'packed', x:0, time:0, remaining:0, model:visual ? sculptSupplyDrop() : null};
}
export function callSupplyDrop(drop, cannonX) {
  if (!drop || drop.phase !== 'packed') return false;
  drop.x = cannonX >= 0 ? -4.5 : 4.5;
  drop.phase = 'incoming'; drop.time = 0;
  return true;
}
// Returns discrete events once. The stage owns the timer, including while a
// player visits the map. Steering into the ring before touchdown is allowed.
export function stepSupplyDrop(drop, x, dt, diverting) {
  if (drop.phase === 'incoming') {
    drop.time += dt;
    if (drop.time < DESCENT) return;
    if (drop.time >= DESCENT + PICKUP_TIME) { drop.phase = 'missed'; return 'miss'; }
    if (Math.abs(x-drop.x) <= RADIUS) {
      drop.phase = 'loaded'; drop.remaining = 3; drop.time = 1;
      return 'catch';
    }
  } else if (drop.phase === 'loaded' && !diverting) {
    drop.time -= dt;
    if (drop.time <= 0) {
      drop.remaining--;
      if (!drop.remaining) drop.phase = 'spent';
      else drop.time += .45;
      return 'fire';
    }
  }
}
export function supplyMessage(drop,x) {
  if (drop?.phase === 'loaded') return `Aim your reserves · ${drop.remaining} giants`;
  if (drop?.phase !== 'incoming') return '';
  const offset = drop.x-x;
  const guide = Math.abs(offset) <= RADIUS ? 'Hold here' : offset > 0 ? 'Move right →' : '← Move left';
  return `${guide} · Supply drop · ${Math.ceil(DESCENT+PICKUP_TIME-drop.time)}s`;
}
export function poseSupplyDrop(drop,z,playing,still) {
  const m=drop.model;
  m.group.visible = playing && drop.phase === 'incoming';
  if (!m.group.visible) return;
  const p = Math.min(1,drop.time/DESCENT), fall = 1-p;
  m.group.position.set(drop.x,0,z-1.35);
  m.payload.position.set(still ? 0 : Math.sin(p*7)*.62*fall, .08 + 5.6*fall, -4*fall);
  m.payload.rotation.z = still ? 0 : Math.sin(p*9)*.12*fall;
  const collapse = Math.max(0,1-(drop.time-DESCENT)*3);
  m.rigging.visible = collapse>0;
  m.rigging.scale.y = Math.min(1,collapse);
  m.marker.scale.setScalar(still ? 1 : 1+.08*Math.sin(drop.time*6));
}
