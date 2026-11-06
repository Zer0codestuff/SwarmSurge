// Tiny synthesized sound effects (no audio files). Throttled so swarms don't get noisy.
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('swarm-muted') === '1';
    this.last = {};
    this.paused = false;
  }
  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.paused ? 0 : 0.3;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 0.4;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  setPaused(paused) {
    this.paused = paused;
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(paused ? 0 : .3, this.ctx.currentTime, .025);
  }
  toggle() {
    this.muted = !this.muted;
    localStorage.setItem('swarm-muted', this.muted ? '1' : '0');
    return this.muted;
  }
  tone(freq, dur, type, vol, slide = 0, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  burst(dur, vol, freq = 800) {
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur);
  }
  play(name, p = 1) {
    if (this.muted || this.paused || !this.ctx) return;
    const now = performance.now();
    const gap = { pop: 45, shoot: 90, weapon: 110, shield: 110, flyby: 800, gate: 70, hit: 150, boom: 120, warp: 90, zap: 80, crush: 150, combo: 120 }[name] || 0;
    if (now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    switch (name) {
      case 'shoot': this.tone(180, 0.05, 'sine', 0.08, -60); break;
      case 'weapon':
        switch (p) {
          case 1: this.tone(830,.035,'triangle',.03,-360); break;
          case 2: this.tone(120,.07,'sawtooth',.04,60); this.burst(.04,.05,900); break;
          case 3: this.tone(1200,.06,'sine',.025,-850); break;
          case 4: this.burst(.055,.065,1800); this.tone(150,.035,'triangle',.025,-80); break;
          case 5: this.tone(540,.1,'square',.025,1500); this.tone(170,.06,'sine',.02,-80); break;
          case 6: this.burst(.06,.04,600); break;
          case 7: this.tone(1350,.08,'triangle',.03,450); this.tone(2200,.06,'sine',.012,-500,.02); break;
          case 8: this.tone(200,.11,'sine',.045,350); this.tone(600,.05,'triangle',.018,-400); break;
        }
        break;
      case 'heavy': this.tone(110,.09,'sine',.13,-45); break;
      case 'shield': this.tone(950,.08,'triangle',.07,550); this.tone(470,.05,'sine',.05); break;
      case 'flyby': this.burst(.4,.09,1000); this.tone(160+p*20,.32,'sine',.04,180); break;
      case 'pop': this.tone(420 + Math.random() * 380, 0.06, 'triangle', 0.09, -200); break;
      case 'gate': this.tone(700 + Math.random() * 200, 0.08, 'square', 0.04, 500); break;
      case 'hit': this.tone(140, 0.25, 'sawtooth', 0.2, -80); break;
      case 'boom': this.burst(0.35, 0.5, 600); this.tone(90, 0.3, 'sine', 0.35, -50); break;
      case 'upgrade': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.15, 'square', 0.06, 0, i * 0.08)); break;
      case 'clear': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.15, 0, i * 0.1)); break;
      case 'win': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.16, 0, i * 0.12)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.1, 0, i * 0.18)); break;
      case 'warn': this.tone(300, 0.2, 'square', 0.06, 200); break;
      case 'combo': [0, 4, 7, 12].slice(0, 1 + p).forEach((s, i) => this.tone(523 * 2 ** ((s + p * 2) / 12), 0.12, 'square', 0.05, 0, i * 0.05)); break;
      case 'nuke': this.burst(1.2, 0.8, 300); this.tone(60, 1.0, 'sine', 0.5, -30); this.tone(900, 0.5, 'sawtooth', 0.06, -800); break;
      case 'star': [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.1, 0, i * 0.05)); break;
      case 'warp': this.tone(300, 0.15, 'sine', 0.08, 900); break;
      case 'zap': this.tone(1400, 0.08, 'sawtooth', 0.04, -1100); break;
      case 'crush': this.burst(0.3, 0.45, 400); this.tone(70, 0.25, 'square', 0.15, -30); break;
    }
  }
}
