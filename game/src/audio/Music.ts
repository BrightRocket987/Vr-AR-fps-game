/**
 * Procedural background music: tiny Web Audio synths driven by a look-ahead step sequencer.
 * No assets, a handful of oscillators per beat (cheap on Quest), original tunes only.
 *
 * Tracks: 'bar' (honky-tonk shuffle), 'drive' (night synthwave), 'house' (toy-box bedtime),
 * 'boss' (faster, heavier toy-box), 'end' (music-box lullaby).
 */
export type TrackName = 'bar' | 'drive' | 'house' | 'boss' | 'end';

interface Track {
  bpm: number;
  /** 0 = straight 16ths, 0.33 = triplet-ish shuffle. */
  swing: number;
  /** Bars in one loop. */
  bars: number;
  /** Called for every 16th-note step; `step` counts from 0 to bars*16-1. */
  play: (synth: Synth, step: number, time: number) => void;
}

/** Note name → frequency. 'A4' = 440. Supports sharps (C#4). */
export function noteFreq(note: string): number {
  const m = /^([A-G])(#?)(-?\d)$/.exec(note);
  if (!m) return 440;
  const base: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const semis = base[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}

/** Small instrument set on one AudioContext. */
class Synth {
  private noise: AudioBuffer;
  constructor(readonly ctx: AudioContext, readonly out: AudioNode) {
    const len = Math.floor(ctx.sampleRate * 0.5);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  private env(time: number, attack: number, decay: number, peak: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
    g.connect(this.out);
    return g;
  }

  tone(freq: number, time: number, decay: number, type: OscillatorType, gain: number, attack = 0.005, detune = 0): void {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, time);
    if (detune) o.detune.setValueAtTime(detune, time);
    const g = this.env(time, attack, decay, gain);
    o.connect(g);
    o.start(time);
    o.stop(time + attack + decay + 0.05);
  }

  /** Music-box: sine + a quiet 3rd partial with a bell decay. */
  bell(freq: number, time: number, gain = 0.18, decay = 0.9): void {
    this.tone(freq, time, decay, 'sine', gain);
    this.tone(freq * 3, time, decay * 0.4, 'sine', gain * 0.18);
  }

  /** Filtered saw for bass/arps. */
  saw(freq: number, time: number, decay: number, gain: number, cutoff: number): void {
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, time);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, time);
    f.Q.value = 4;
    const g = this.env(time, 0.005, decay, gain);
    o.connect(f).connect(g);
    o.start(time);
    o.stop(time + decay + 0.1);
  }

  /** Soft pad chord (two detuned triangles per note, slow attack). */
  pad(freqs: number[], time: number, dur: number, gain = 0.05): void {
    for (const fq of freqs) {
      this.tone(fq, time, dur, 'triangle', gain, 0.25, -6);
      this.tone(fq, time, dur, 'triangle', gain, 0.25, 6);
    }
  }

  kick(time: number, gain = 0.5): void {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, time);
    o.frequency.exponentialRampToValueAtTime(42, time + 0.18);
    const g = this.env(time, 0.003, 0.25, gain);
    o.connect(g);
    o.start(time);
    o.stop(time + 0.32);
  }

  private noiseHit(time: number, decay: number, gain: number, type: BiquadFilterType, freq: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.env(time, 0.002, decay, gain);
    src.connect(f).connect(g);
    src.start(time);
    src.stop(time + decay + 0.05);
  }

  snare(time: number, gain = 0.18): void {
    this.noiseHit(time, 0.16, gain, 'bandpass', 1800);
    this.tone(190, time, 0.08, 'triangle', gain * 0.5);
  }

  hat(time: number, gain = 0.06): void {
    this.noiseHit(time, 0.035, gain, 'highpass', 7000);
  }

  /** Brushed snare for the bar. */
  brush(time: number, gain = 0.07): void {
    this.noiseHit(time, 0.12, gain, 'highpass', 2500);
  }
}

const n = noteFreq;

/** Chord tones from a list of note names. */
const chord = (...names: string[]): number[] => names.map(n);

const TRACKS: Record<TrackName, Track> = {
  // Honky-tonk shuffle, I-IV-V-I in C with a walking bass and a little piano riff.
  bar: {
    bpm: 126,
    swing: 0.3,
    bars: 4,
    play: (s, step, t) => {
      const bar = Math.floor(step / 16);
      const pos = step % 16;
      const roots = ['C2', 'F2', 'G2', 'C2'];
      const chords = [chord('E4', 'G4', 'C5'), chord('F4', 'A4', 'C5'), chord('D4', 'G4', 'B4'), chord('E4', 'G4', 'C5')];
      const walk = [[0, 4, 7, 9], [0, 4, 7, 9], [0, 4, 7, 5], [0, 7, 4, 2]][bar];
      if (pos % 4 === 0) {
        const semis = walk[pos / 4];
        s.tone(n(roots[bar]) * Math.pow(2, semis / 12), t, 0.28, 'triangle', 0.22);
      }
      if (pos === 4 || pos === 12) for (const f of chords[bar]) s.tone(f, t, 0.18, 'triangle', 0.06, 0.003, 4);
      if (pos % 2 === 0) s.hat(t, 0.035);
      if (pos === 4 || pos === 12) s.brush(t);
      // Riff on bars 2 and 4.
      const riff: Record<number, string> = { 0: 'G5', 2: 'A5', 3: 'C6', 6: 'A5', 8: 'G5', 11: 'E5' };
      if ((bar === 1 || bar === 3) && riff[pos]) s.tone(n(riff[pos]), t, 0.22, 'square', 0.025);
    },
  },
  // Night drive: Am-F-C-G, saw arpeggio, pad, four-on-the-floor-ish.
  drive: {
    bpm: 96,
    swing: 0,
    bars: 4,
    play: (s, step, t) => {
      const bar = Math.floor(step / 16);
      const pos = step % 16;
      const arps = [
        ['A2', 'E3', 'A3', 'C4'],
        ['F2', 'C3', 'F3', 'A3'],
        ['C3', 'G3', 'C4', 'E4'],
        ['G2', 'D3', 'G3', 'B3'],
      ][bar];
      if (pos % 2 === 0) s.saw(n(arps[(pos / 2) % 4]), t, 0.22, 0.07, 900 + 500 * Math.sin((step / 64) * Math.PI * 2));
      if (pos === 0) s.pad(arps.slice(1).map(n), t, 2.4, 0.03);
      if (pos === 0 || pos === 8) s.kick(t, 0.35);
      if (pos === 4 || pos === 12) s.snare(t, 0.1);
      if (pos % 4 === 2) s.hat(t, 0.04);
    },
  },
  // Toy-box bedtime in A minor: music-box melody, plucked bass, soft ticks.
  house: {
    bpm: 92,
    swing: 0.12,
    bars: 4,
    play: (s, step, t) => {
      const bar = Math.floor(step / 16);
      const pos = step % 16;
      const bass = ['A2', 'D3', 'E2', 'A2'][bar];
      if (pos === 0 || pos === 8) s.tone(n(bass), t, 0.5, 'triangle', 0.16);
      const mel = [
        ['A5', null, 'C6', 'E6', null, 'D6', 'C6', null],
        ['D6', null, 'F6', 'A5', null, 'C6', 'B5', null],
        ['E6', null, 'G#5', 'B5', null, 'D6', 'C6', 'B5'],
        ['A5', null, 'E5', null, 'A5', null, null, null],
      ][bar];
      if (pos % 2 === 0) {
        const note = mel[pos / 2];
        if (note) s.bell(n(note), t, 0.12, 0.8);
      }
      if (pos % 4 === 2) s.hat(t, 0.025);
    },
  },
  // Big Bean: same key, faster, a kick on every beat and a nagging two-note motif.
  boss: {
    bpm: 132,
    swing: 0,
    bars: 2,
    play: (s, step, t) => {
      const bar = Math.floor(step / 16);
      const pos = step % 16;
      if (pos % 4 === 0) s.kick(t, 0.4);
      if (pos === 4 || pos === 12) s.snare(t, 0.14);
      if (pos % 2 === 0) s.hat(t, 0.04);
      if (pos % 2 === 0) s.saw(n(bar === 0 ? 'A2' : 'G#2'), t, 0.15, 0.06, 700);
      if (pos === 0 || pos === 6 || pos === 8 || pos === 14) s.bell(n(pos < 8 ? 'E6' : 'F6'), t, 0.1, 0.4);
    },
  },
  // Lullaby for the end card.
  end: {
    bpm: 72,
    swing: 0,
    bars: 4,
    play: (s, step, t) => {
      const bar = Math.floor(step / 16);
      const pos = step % 16;
      const mel = [
        ['G5', 'E5', 'G5', 'C6'],
        ['B5', 'G5', 'A5', 'F5'],
        ['E5', 'G5', 'D5', 'F5'],
        ['E5', 'D5', 'C5', null],
      ][bar];
      if (pos % 4 === 0) {
        const note = mel[pos / 4];
        if (note) s.bell(n(note), t, 0.14, 1.4);
      }
      if (pos === 0) s.pad(chord(['C4', 'E4', 'G4'][0], 'E4', 'G4'), t, 3, 0.02);
    },
  },
};

/** Look-ahead sequencer (setInterval wakes it; Web Audio time schedules the notes). */
export class Music {
  private readonly synth: Synth;
  private readonly gain: GainNode;
  private track: Track | null = null;
  private trackName: TrackName | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private volume = 0.5;

  constructor(private readonly ctx: AudioContext, destination: AudioNode) {
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(destination);
    this.synth = new Synth(ctx, this.gain);
  }

  get current(): TrackName | null {
    return this.trackName;
  }

  /** Switch tracks with a short crossfade (null = silence). */
  play(name: TrackName | null): void {
    if (name === this.trackName) return;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0, now + 0.4);
    this.trackName = name;
    if (!name) {
      setTimeout(() => {
        if (!this.trackName) this.halt();
      }, 450);
      return;
    }
    setTimeout(() => {
      if (this.trackName !== name) return;
      this.track = TRACKS[name];
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.1;
      const t = this.ctx.currentTime;
      this.gain.gain.cancelScheduledValues(t);
      this.gain.gain.setValueAtTime(0, t);
      this.gain.gain.linearRampToValueAtTime(this.volume, t + 1.2);
      if (!this.timer) this.timer = setInterval(() => this.schedule(), 25);
    }, 420);
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.trackName) this.gain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.2);
  }

  private schedule(): void {
    const tr = this.track;
    if (!tr || this.ctx.state !== 'running') return;
    const sixteenth = 60 / tr.bpm / 4;
    // Never fall far behind (e.g. after the tab was suspended).
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const swingOffset = this.step % 2 === 1 ? tr.swing * sixteenth : 0;
      try {
        tr.play(this.synth, this.step % (tr.bars * 16), this.nextTime + swingOffset);
      } catch {
        /* a bad note must never stop the game */
      }
      this.nextTime += sixteenth;
      this.step++;
    }
  }

  private halt(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  stop(): void {
    this.play(null);
  }
}

/** Which track a chapter plays. */
export function trackForChapter(name: string): TrackName | null {
  if (name === 'bar' || name === 'range') return 'bar';
  if (name === 'drive') return 'drive';
  if (name === 'house') return 'house';
  if (name === 'end') return 'end';
  return null;
}
