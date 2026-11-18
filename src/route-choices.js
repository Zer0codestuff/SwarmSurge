// Coordinates are authored against the finished stage, after vaults, portals and Sunforges.
// Only the listed lane changes. The ordinary multiplier is the cold face of a redline gate.
const redlines = {
  '3.1': [3.3, 24], '6.1': [4.6, 19], '8.3': [3.3, 8.5], '11.2': [0, 30],
  '20.2': [3.3, 21], '22.1': [4.8, 24], '23.1': [-3.3, 9], '23.2': [-4.6, 26],
  '24.2': [-4.4, 21], '28.2': [-3.3, 12], '30.1': [4.4, 30], '39.2': [2.2, 26],
  '43.1': [3.6, 15], '45.1': [-3.3, 9], '48.1': [0, 31],
};

// The second bay offers a different permanent build at a different entry price.
// Both may receive deposits. Finishing one withdraws the other from this stage.
const armories = {
  '5.2': ['squad', .68, 'Take the right air wing for bombing runs or the cheaper left escort for mirrored fire and two armor.'],
  '13.2': ['siege', 1.35, 'Take the right Hover fortress for an early armored push. The pricier left Siege kit fits two extra guns and a rapid drive for the Kraken.', { drive: 'rapid', name: 'SIEGE + RAPID' }],
  '16.2': ['spider', .85, 'The right Hover fortress carries an extra armor plate. The cheaper left Spider mech mixes scatterguns with frost.'],
  '18.2': ['rockets', .72, 'Right-side frost sets up shatter hits with the Rail fortress. The cheaper left rockets clear the packs at the tomb entrances.'],
  '21.1': ['squad', 1.3, 'Buy blasters on the left to shoot while troops bounce. Save for the armored right escort to widen your stream at the bumpers.'],
  '22.2': ['rapid', 1.25, 'The right escort adds armor and a second stream for the ramps. Left rapid fire concentrates twice as many volleys on the fence.'],
  '24.1': ['barrel', 1.35, 'Left rockets deal splash damage through the bumper field. The pricier right bay adds two barrels to every cannon.'],
  '29.2': ['twin', 1.18, 'The right Siege crawler adds guns and armor. Save for the left twin with a rapid drive to play opposite slot lanes twice as fast.', { drive: 'rapid', name: 'TWIN + RAPID' }],
  '38.2': ['air', .72, 'Buy railguns on the right to pierce the column, or call the cheaper air wing on the left while your harvest grows.'],
  '41.2': ['rapid', 1.25, 'The right tank bay fits armor and guns. The left engine kit gives triple shot power and double rate if you can spare the extra troops.', { drive: 'power', name: 'RAPID + POWER' }],
  '45.2': ['power', 1.2, 'Take the armored Hover fortress on the right, or buy triple shot power on the left for a bigger Sunforge burst.'],
};

// [source, source lane, receiver lane, receiver distance, bonus, window, feed seconds].
// Feed seconds cap a hypno startup cost or set a bank's required deposit. They are priced
// once against the main cannon at entry, before any equipment on this stage is claimed.
const links = {
  '26.1': ['hypno', -3.3, 3.3, 18, 6, 7, 3],
  '26.2': ['hypno', 0, 4.4, 24, 64, 7, 7],
  '27.2': ['hypno', 0, 4.45, 16, 10, 7, 3],
  '30.2': ['hypno', -3.3, 3.3, 10, 12, 7, 3],
  '31.1': ['cart', -4.6, 1.5, 16, 6, 7],
  '33.1': ['cart', 4.6, -2.4, 24, 8, 7],
  '35.1': ['cart', 3.3, -3.3, 16, 8, 6],
  '36.1': ['bank', -3.3, 3.3, 17, 8, 6, 1.5],
  '37.1': ['bank', 3.3, -3.3, 15.4, 6, 6, 2],
  '38.1': ['bank', -4.6, 4.6, 18, 10, 6, 2],
  '39.1': ['hypno', 3.3, -3.3, 19, 8, 8, 3],
  '40.2': ['bank', -3.3, 3.3, 12.5, 8, 7, 3],
  '41.1': ['egg', -3.3, 3.3, 14, 6, 6],
  '42.1': ['egg', 3.6, -1.6, 22, 8, 7],
  '42.2': ['egg', -4.6, 4.6, 14, 12, 7],
  '43.2': ['egg', -2, 4.8, 32, 12, 7],
  '44.1': ['egg', -4.6, 1.4, 15, 6, 6],
  '44.2': ['egg', -3.3, 3.3, 14, 10, 7],
  '50.2': ['fusion', 0, 4.6, 37, 32, 8],
};

// A cart's old fort-HP-based cost could take longer than the whole stage in an
// unmultiplied siding. One load buys a fixed share of the fort, then the track is clear.
// [lane, maximum seconds of entry cannon power, fraction of target HP]
const freight = {
  '31.1': [[-4.6, 3.6, .30]],
  '31.2': [[-5, 3.6, .18], [5, 8, .42]],
  '32.1': [[4.2, 8, .38]], '32.2': [[0, 14, .40]],
  '33.1': [[4.6, 7, .32]], '34.1': [[-4.8, 6, .38]],
  '34.2': [[-4.6, 9, .22], [4.6, 18, .46]],
  '35.1': [[3.3, 9, .34]], '35.2': [[-4.45, 10, .20], [4.45, 21, .50]],
  '44.1': [[-4.6, 6, .36]], '44.2': [[3.3, 42, .35]],
};

// [lane, ripening time, payout]. Short fields release their troops while the other lane grows.
const fields = {
  '36.1': [[-3.3, 4, 10]], '36.2': [[-3.3, 3, 4], [3.3, 7, 36]],
  '37.1': [[3.3, 4.5, 12]], '37.2': [[-4.45, 3, 4], [4.45, 7, 24]],
  '38.1': [[-4.6, 4, 12]], '38.2': [[4.5, 6.5, 80]],
  '39.1': [[-3.3, 4, 7]], '40.1': [[-4.9, 3, 5], [4.9, 7, 36]],
  '40.2': [[-3.3, 4.5, 10]],
};

// The siding gates in the ice levels are upstream of their prizes.
const iceCosts = { '34.2': 5, '47.2': 6 };
const coreLoads = {
  '46.2': { feedCap: 9, hold: 6, v: 12, dmg: .22 },
  '47.2': { feedCap: 8, hold: 6, v: 24, dmg: .27 },
  '48.1': { feedCap: 4.5, hold: 7, v: 12, dmg: .22 },
  '50.2': { feedCap: 125, hold: 6, v: 12, dmg: .18 },
};
// Leave the outer hangar open in the Factory and keep the approach to a cart,
// receiver or paired core clear where a supply bay would otherwise absorb the stream.
const supplyBays = { '11.2': [2.1, 3], '31.1': [0, 3.3], '40.2': [0, 3.3], '44.2': [0, 3.3], '48.1': [0, 3.3] };
const sourceNames = { hypno: 'hypno gate', bank: 'field', cart: 'cart', egg: 'egg' };
const linkAction = { hypno: 'Charge', bank: 'Harvest a full deposit from', cart: 'Load', egg: 'Break' };
const lane = x => x < -1 ? 'left' : x > 1 ? 'right' : 'middle';

export function addRouteChoices(s, world, stage) {
  const key = world + '.' + stage, notes = [];
  const at = (items, predicate) => {
    const item = items?.find(predicate);
    if (!item) throw new Error('Missing route landmark in stage ' + key);
    return item;
  };
  const multiplier = (x, d) => at(s.gates, g => g.t === 'mul' && g.x === x && g.d === d && !g.phase && !g.sunforge && !g.requires);

  if (supplyBays[key]) {
    const [x, w] = supplyBays[key];
    Object.assign(s.gates[0], { x, w });
  }

  if (redlines[key]) {
    const g = multiplier(...redlines[key]);
    g.redline = true;
    notes.push(`Feed the ${lane(g.x)} redline gate to climb from ×${g.v} to ×${g.v * 6}. Switch lanes to cool the dial. At full heat it divides by three for four seconds.`);
  }
  if (armories[key]) {
    const [up, price, choice, kit] = armories[key], first = s.gates[0];
    first.fieldChoice = true;
    s.gates.push({ t: 'upgrade', up, kit, fieldChoice: true, price, need: Math.ceil(first.need * price), x: -first.x, d: first.d, w: first.w });
    notes.push(`${choice} Completing one bay closes its partner and spends any troops already paid into it.`);
  }
  if (freight[key]) {
    for (const [x, feedCap, dmg] of freight[key]) {
      const c = at(s.carts, c => c.x === x);
      Object.assign(c, { feedCap, dmg, uses: 1 });
    }
    const loads = freight[key].map(([x, , dmg]) => `the ${lane(x)} cart deals ${Math.round(dmg * 100)}%`).join(' and ');
    notes.push(`Against the fort, ${loads} of its maximum health. Each cart carries one payload. Once its fuse lights, aim elsewhere while it rolls.`);
  }
  if (fields[key]) {
    for (const [x, ripe, max] of fields[key]) Object.assign(at(s.gates, g => g.t === 'bank' && g.x === x), { ripe, max });
    if (fields[key].length === 2) {
      const [quick, slow] = fields[key];
      notes.push(`The ${lane(quick[0])} field pays ×${quick[2]} in ${quick[1]}s. The ${lane(slow[0])} holds your troops for ${slow[1]}s and pays ×${slow[2]}.`);
    }
  }
  if (iceCosts[key]) for (const g of s.gates) if (g.t === 'ice' && !g.vault) g.feedCap = iceCosts[key];
  if (coreLoads[key]) {
    const core = at(s.fusion, () => true);
    Object.assign(core, coreLoads[key]);
    notes.push(`Fill both side cores within ${core.hold}s of each other for a ×${core.v} beam and ${Math.round(core.dmg * 100)}% target damage.`);
  }
  if (links[key]) {
    const [kind, sx, tx, d, bonus, seconds, feed] = links[key];
    const props = { egg: s.eggs, cart: s.carts, fusion: s.fusion };
    const source = props[kind] ? at(props[kind], p => (p.x ?? (p.x1 + p.x2) / 2) === sx) : at(s.gates, g => g.t === kind && g.x === sx);
    const receiver = multiplier(tx, d);
    source.linkArrow = tx < -1 ? '←' : tx > 1 ? '→' : '↑';
    if (kind === 'bank') source.depositSeconds = feed;
    if (kind === 'hypno') source.feedCap = feed;
    const objective = kind === 'fusion' ? 'Pair both cores' : `${linkAction[kind]} the ${lane(sx)} ${sourceNames[kind]}`;
    receiver.link = { bonus, seconds, lane: lane(tx), objective };
    notes.push(`${objective} to light the ${lane(tx)} gate at ×${receiver.v * bonus} for ${seconds}s. This link fires once.`);
  }
  if (notes.length) s.routeNote = notes.join(' ');
}
