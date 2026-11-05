export const TUTORIAL_STORAGE_KEY = 'swarm-tutorials';

const TIPS = {
  aim: 'Drag or use A/D to aim. Firing is automatic.',
  chain: 'Line up gates in a row to multiply their numbers.',
  equipment: 'Fill a supply crate to equip your army for this level.',
};
const IDS = new Set([...Object.keys(TIPS), 'movement']);
const MOVEMENT = {
  portal: 'Portals send troops to the lane marked by their exit.',
  jump: 'Jump pads carry troops over walls into another lane.',
  loop: 'Loop gates send troops back through the same multipliers.',
};

function defaultStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

function read(storage, key) {
  try { return JSON.parse(storage?.getItem(key) ?? 'null'); } catch { return null; }
}

// Selection consumes only the returned lesson. A stage record prevents a retry
// from selecting another lesson that lost priority on the first visit.
export function createTutorials(storage = defaultStorage()) {
  const saved = read(storage, TUTORIAL_STORAGE_KEY);
  const valid = saved?.version === 1;
  const seen = new Set(valid && Array.isArray(saved.seen) ? saved.seen.filter(id => IDS.has(id)) : []);
  const stages = new Set(valid && Array.isArray(saved.stages)
    ? saved.stages.filter(key => typeof key === 'string' && /^\d+:\d+$/.test(key)) : []);

  function save() {
    try {
      storage?.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({ version: 1, seen: [...seen], stages: [...stages] }));
    } catch {}
  }

  function hasSeen(id) { return seen.has(id); }

  function markSeen(tip) {
    const id = typeof tip === 'string' ? tip : tip?.id;
    if (!IDS.has(id)) return false;
    if (!seen.has(id)) { seen.add(id); save(); }
    return true;
  }

  function stageTip({ stage, levelIndex = 0, stageIndex = stage?.i ?? 0, progress, debug = false } = {}) {
    if (debug || !stage || !Number.isInteger(levelIndex) || levelIndex < 0
      || !Number.isInteger(stageIndex) || stageIndex < 0) return null;
    const key = `${levelIndex}:${stageIndex}`;
    if (stages.has(key)) return null;

    const stars = (progress ?? read(storage, 'swarm-progress'))?.stars;
    const wins = Array.isArray(stars) ? stars : [];
    const progressed = wins.some(value => Number(value) > 0);
    if (Number(wins[levelIndex]) > 0) return null;

    const def = stage.def ?? stage;
    const gates = Array.isArray(def.gates) ? def.gates : [];
    let tip = null;
    // Returning players and direct late-world starts do not receive onboarding.
    if (levelIndex === 0 && !progressed) {
      if (stageIndex === 0 && !seen.has('aim')) tip = { id: 'aim', text: TIPS.aim };
      else if (!seen.has('chain') && gates.filter(gate => gate?.t === 'mul' || gate?.t === 'add').length > 1)
        tip = { id: 'chain', text: TIPS.chain };
      else if (!seen.has('equipment') && gates.some(gate => gate?.t === 'upgrade' || gate?.t === 'hangar'))
        tip = { id: 'equipment', text: TIPS.equipment };
    }

    // The first portal appears in world seven. Old saves past it have already
    // encountered movement gates. Later gate variants share this single lesson.
    if (!tip && !seen.has('movement') && !wins.slice(6).some(value => Number(value) > 0)) {
      const movement = gates.find(gate => MOVEMENT[gate?.t]);
      if (movement) tip = { id: 'movement', text: MOVEMENT[movement.t] };
    }
    if (!tip) return null;
    seen.add(tip.id);
    stages.add(key);
    save();
    return tip;
  }

  return { stageTip, hasSeen, markSeen, dismiss: markSeen };
}
