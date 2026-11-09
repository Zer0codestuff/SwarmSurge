// Procedural soundtrack: no audio files. Every biome derives its key, mode, chord loop, tempo and
// melody from its name and sky brightness, and the arrangement thickens with the battle.
// The scheduler is driven from the frame loop, so a hidden or paused tab falls silent by itself.

const MODES = {
  bright: [[0, 2, 4, 5, 7, 9, 11], [0, 2, 4, 5, 7, 9, 10]],
  mid: [[0, 2, 3, 5, 7, 9, 10], [0, 2, 3, 5, 7, 8, 10]],
  dark: [[0, 2, 3, 5, 7, 8, 10], [0, 1, 3, 5, 7, 8, 10]],
};
// Chord roots as scale degrees. Each list avoids the diminished triads of its two modes.
const LOOPS = {
  bright: [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 4], [0, 4, 1, 3]],
  mid: [[0, 3, 0, 6], [0, 6, 3, 4], [0, 2, 3, 6]],
  dark: [[0, 5, 2, 6], [0, 5, 3, 6], [0, 3, 5, 6], [0, 6, 5, 6]],
};
// Every boss turns its biome to the parallel minor over a i, VI, VII, i loop.
const BOSS_LOOP = [0, 5, 6, 0], BOSS_SCALE = [0, 2, 3, 5, 7, 8, 10];
const BASS = [
  [1, 0, 0, 1, 0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 0],
  [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 2, 0, 1],
  [1, 0, 0, 0, 1, 0, 2, 0, 1, 0, 0, 0, 1, 0, 2, 1],
];
const ARPS = [[0, 2, 4, 2], [0, 4, 2, 4], [0, 2, 4, 7], [7, 4, 2, 0], [0, 4, 7, 4]];
const RHYTHMS = [
  [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0],
  [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
];
const WAVES = ['triangle', 'square', 'sawtooth'];
const VOLUME = 0.14, AHEAD = 0.2;

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Musical identity of one biome. Pure and deterministic, so it can be checked without audio. */
export function scoreFor(name, sky = 0x80c0ff) {
  const h = hash(name), rnd = seeded(h);
  const lum = (((sky >> 16) & 255) * 0.3 + ((sky >> 8) & 255) * 0.59 + (sky & 255) * 0.11) / 255;
  const mood = lum > 0.55 ? 'bright' : lum > 0.22 ? 'mid' : 'dark';
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const scale = pick(MODES[mood]), loop = pick(LOOPS[mood]);
  // Two bars of melody as scale steps above the chord root; null is a rest.
  const rhythm = [...pick(RHYTHMS), ...pick(RHYTHMS)], steps = [0, 2, 4, 5, 7, 9];
  let at = 2;
  const melody = rhythm.map((hit, i) => {
    if (!hit) return null;
    at = Math.max(0, Math.min(steps.length - 1, at + Math.floor(rnd() * 3) - 1));
    if (i % 16 === 0) at = [0, 2, 4][Math.floor(rnd() * 3)];
    return steps[at];
  });
  return {
    mood, scale, loop, melody,
    root: 43 + (h % 9),
    bpm: 116 + ((h >>> 4) % 5) * 4,
    bass: pick(BASS), arp: pick(ARPS),
    arpWave: WAVES[(h >>> 8) % 3], leadWave: WAVES[(h >>> 11) % 2],
  };
}

const MENU_SCORE = { ...scoreFor('camp', 0xbfe8ff), bpm: 88, scale: [0, 2, 4, 5, 7, 9, 11], loop: [0, 5, 3, 4], arp: [0, 2, 4, 7], arpWave: 'triangle' };

export class Music {
  constructor(sound) {
    this.sound = sound;
    this.enabled = true;
    this.mode = 'off';
    this.boss = false;
    this.intensity = 0; this.level = 0;
    this.score = MENU_SCORE;
    this.step = 0; this.next = 0; this.duckUntil = 0; this.gainNow = -1;
    // Set by the game while it is paused or the window has lost focus.
    this.held = false;
  }
  init() {
    const c = this.sound.ctx;
    if (this.bus || !c) return !!this.bus;
    this.bus = c.createGain(); this.bus.gain.value = 0;
    const squash = c.createDynamicsCompressor();
    squash.threshold.value = -14; squash.ratio.value = 3; squash.attack.value = 0.01; squash.release.value = 0.2;
    this.bus.connect(squash); squash.connect(c.destination);
    // A dotted-eighth echo gives the arpeggio and lead some air.
    this.echo = c.createDelay(1); this.echo.delayTime.value = 0.3;
    const feedback = c.createGain(); feedback.gain.value = 0.32;
    const wet = c.createGain(); wet.gain.value = 0.45;
    this.echo.connect(feedback); feedback.connect(this.echo); this.echo.connect(wet); wet.connect(this.bus);
    return true;
  }
  /** mode: 'off', 'menu' or 'battle'. A battle takes its score from the biome. */
  setMode(mode, name, sky) {
    const score = mode === 'battle' ? scoreFor(name, sky) : MENU_SCORE;
    if (mode !== this.mode || score.root !== this.score.root || score.bpm !== this.score.bpm) { this.step = 0; this.next = 0; this.level = 0; }
    this.mode = mode; this.score = score;
    if (mode !== 'battle') this.boss = false;
  }
  setBoss(boss) { this.boss = boss; }
  setIntensity(value) { this.intensity = Math.max(0, Math.min(1, value)); }
  /** Lower the music for a moment so a fanfare can be heard. */
  duck(seconds) { if (this.sound.ctx) this.duckUntil = this.sound.ctx.currentTime + seconds; }
  hz(degree, octave = 0) {
    const scale = this.boss ? BOSS_SCALE : this.score.scale, root = this.score.root, n = scale.length, wrapped = ((degree % n) + n) % n;
    return 440 * 2 ** ((root + scale[wrapped] + 12 * (Math.floor(degree / n) + octave) - 69) / 12);
  }
  voice(type, freq, t, dur, vol, cutoff = 0, attack = 0.008, echo = false) {
    const c = this.sound.ctx, osc = c.createOscillator(), amp = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(vol, t + attack);
    amp.gain.setValueAtTime(vol, t + Math.max(attack, dur * 0.55));
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = osc;
    if (cutoff) { const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cutoff; osc.connect(filter); out = filter; }
    out.connect(amp); amp.connect(this.bus);
    if (echo) amp.connect(this.echo);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  noise(t, dur, vol, type, freq) {
    const c = this.sound.ctx, src = c.createBufferSource(), filter = c.createBiquadFilter(), amp = c.createGain();
    src.buffer = this.sound.noise;
    filter.type = type; filter.frequency.value = freq;
    amp.gain.setValueAtTime(vol, t); amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(amp); amp.connect(this.bus);
    src.start(t); src.stop(t + dur + 0.02);
  }
  kick(t, vol) {
    const c = this.sound.ctx, osc = c.createOscillator(), amp = c.createGain();
    osc.frequency.setValueAtTime(140, t); osc.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    amp.gain.setValueAtTime(vol, t); amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(amp); amp.connect(this.bus);
    osc.start(t); osc.stop(t + 0.22);
  }
  /** Notes of one sixteenth. Returns what it played so the arrangement can be checked. */
  plan(index, level, mode = this.mode, boss = this.boss) {
    const S = this.score, s = index % 16, bar = Math.floor(index / 16), battle = mode === 'battle';
    const loop = boss ? BOSS_LOOP : S.loop, raw = loop[Math.floor(bar / (battle ? 1 : 2)) % loop.length];
    // High roots drop an octave so the bass and lead stay in range.
    const chord = raw > 4 ? raw - 7 : raw;
    const notes = [];
    if (s === 0 && (battle || bar % 2 === 0)) for (const tone of [0, 2, 4]) notes.push(['pad', chord + tone, battle ? 16 : 32]);
    if (!battle) {
      // The camp: a slow arpeggio over the pad.
      if (s % 4 === 0) notes.push(['arp', chord + S.arp[(index / 4) % S.arp.length | 0], 3]);
      return notes;
    }
    if (level >= 0.2) {
      const hit = boss ? (s % 2 === 0 ? (s % 8 === 6 ? 2 : 1) : 0) : S.bass[s];
      if (hit) notes.push(['bass', chord + (hit === 2 ? 7 : 0), boss ? 1.7 : 1.4]);
    }
    if (level >= 0.1 && (s % 2 === 0 || level >= 0.62)) notes.push(['arp', chord + S.arp[(level >= 0.62 ? index : index >> 1) % S.arp.length], 1.5]);
    if (level >= 0.55) {
      const tone = S.melody[index % S.melody.length];
      if (tone !== null) notes.push(['lead', chord + tone, 2.6]);
    }
    if (level >= 0.25 && s % 4 === 0) notes.push(['kick']);
    if (level >= 0.45 && s % 8 === 4) notes.push(['snare']);
    if (level >= 0.35 && (s % 4 === 2 || level >= 0.8)) notes.push(['hat', s % 4 === 2 ? 1 : 0.55]);
    if (boss && s === 0 && bar % 4 === 0) notes.push(['boom']);
    return notes;
  }
  play(index, t, stepTime) {
    const S = this.score;
    for (const [kind, degree, length] of this.plan(index, this.level)) {
      const dur = length * stepTime;
      if (kind === 'pad') this.voice('sawtooth', this.hz(degree, 1), t, dur * 1.05, 0.03, 950, dur * 0.25);
      else if (kind === 'bass') this.voice(this.boss ? 'sawtooth' : 'square', this.hz(degree, 0), t, dur, 0.1, this.boss ? 620 : 460);
      else if (kind === 'arp') this.voice(S.arpWave, this.hz(degree, 2), t, dur, S.arpWave === 'triangle' ? 0.06 : 0.032, 2600, 0.006, true);
      else if (kind === 'lead') this.voice(S.leadWave, this.hz(degree, 2), t, dur, S.leadWave === 'triangle' ? 0.075 : 0.04, 2200, 0.012, true);
      else if (kind === 'kick') this.kick(t, 0.34);
      else if (kind === 'snare') { this.noise(t, 0.13, 0.12, 'bandpass', 1900); this.voice('triangle', 190, t, 0.09, 0.05); }
      else if (kind === 'hat') this.noise(t, 0.035, 0.05 * degree, 'highpass', 7200);
      else if (kind === 'boom') { this.kick(t, 0.5); this.noise(t, 0.5, 0.08, 'lowpass', 300); }
    }
  }
  /** Call every frame. Schedules a fraction of a second ahead and follows mute, pause and the Music setting. */
  tick() {
    const c = this.sound.ctx;
    if (!c || c.state !== 'running' || !this.init()) return;
    const now = c.currentTime;
    const audible = this.enabled && !this.sound.muted && !this.held && this.mode !== 'off';
    const gain = audible ? VOLUME * (now < this.duckUntil ? 0.3 : 1) : 0;
    if (gain !== this.gainNow) { this.gainNow = gain; this.bus.gain.cancelScheduledValues(now); this.bus.gain.setTargetAtTime(gain, now, gain ? 0.25 : 0.06); }
    if (!audible) { this.next = 0; return; }
    const bpm = this.score.bpm + (this.boss ? 12 : 0), stepTime = 15 / bpm;
    if (this.next < now - 0.25) this.next = now + 0.05;
    this.echo.delayTime.value = stepTime * 3;
    for (let n = 0; n < 6 && this.next < now + AHEAD; n++) {
      this.level += (this.intensity - this.level) * 0.08;
      this.play(this.step, this.next, stepTime);
      this.next += stepTime; this.step++;
    }
  }
}
