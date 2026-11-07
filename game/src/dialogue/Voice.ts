import { Audio, AudioListener, AudioLoader, Object3D, PositionalAudio } from 'three';
import type { EventBus } from '../core/EventBus';
import type { VoiceLike } from '../ai/Gremlin';

export interface LineDef {
  file: string;
  speaker: string;
  text: string;
  emotion?: string;
  trigger?: string;
  cooldown_s?: number;
  duration_s?: number;
  takes?: string[];
}

interface VoiceManifest {
  lines: Record<string, LineDef>;
}

interface SfxManifest {
  [name: string]: { file: string; duration_s?: number; loop?: boolean };
}

/**
 * Plays generated voice lines and SFX. Positional lines use HRTF only for the nearest few emitters
 * (a pool of 6); the rest are plain `Audio`. Missing manifests degrade to subtitles only.
 */
export class Voice implements VoiceLike {
  private lines: Record<string, LineDef> = {};
  private sfxDefs: SfxManifest = {};
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private readonly loader = new AudioLoader();
  private readonly pool: PositionalAudio[] = [];
  private readonly flat: Audio[] = [];
  private lastLine = new Map<string, number>();
  private lastSpeaker = new Map<string, number>();
  onSubtitle: ((text: string, speaker: string) => void) | null = null;
  muted = false;
  private readonly baseUrl: string;

  constructor(private readonly listener: AudioListener, private readonly bus: EventBus, baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    for (let i = 0; i < 6; i++) {
      const p = new PositionalAudio(listener);
      p.setRefDistance(0.6);
      p.setRolloffFactor(1.2);
      p.setMaxDistance(10);
      this.pool.push(p);
    }
    for (let i = 0; i < 6; i++) this.flat.push(new Audio(listener));
  }

  async load(): Promise<void> {
    try {
      const r = await fetch(`${this.baseUrl}/voice/manifest.json`);
      if (r.ok) this.lines = ((await r.json()) as VoiceManifest).lines ?? {};
    } catch {
      /* no voices yet */
    }
    try {
      const r = await fetch(`${this.baseUrl}/sfx/manifest.json`);
      if (r.ok) this.sfxDefs = (await r.json()) as SfxManifest;
    } catch {
      /* no sfx yet */
    }
    this.bus.emit('log', { text: `voice manifest: ${Object.keys(this.lines).length} lines, ${Object.keys(this.sfxDefs).length} sfx` });
    // Preload the most common SFX.
    for (const n of ['pop', 'thwip', 'squeak_inflate', 'knock', 'tier_up']) void this.buffer(this.sfxPath(n));
  }

  get lineCount(): number {
    return Object.keys(this.lines).length;
  }

  private sfxPath(name: string): string | null {
    const d = this.sfxDefs[name];
    return d ? `${this.baseUrl}/sfx/${d.file.replace(/^.*\//, '')}` : null;
  }

  private buffer(path: string | null): Promise<AudioBuffer | null> {
    if (!path) return Promise.resolve(null);
    const have = this.buffers.get(path);
    if (have) return Promise.resolve(have);
    let p = this.loading.get(path);
    if (!p) {
      p = this.loader
        .loadAsync(path)
        .then((b) => {
          this.buffers.set(path, b);
          return b;
        })
        .catch(() => null);
      this.loading.set(path, p);
    }
    return p;
  }

  /** Pick a line for a speaker (and optional emotion), honouring cooldowns, and play it from `at`. */
  say(speaker: string, emotion: string | undefined, at: Object3D | null): void {
    const now = performance.now() / 1000;
    if (now - (this.lastSpeaker.get(speaker) ?? -10) < 1.2) return;
    let candidates = Object.entries(this.lines).filter(([, l]) => l.speaker === speaker && now - (this.lastLine.get(l.file) ?? -100) > (l.cooldown_s ?? 20));
    if (emotion) {
      const e = candidates.filter(([, l]) => l.emotion === emotion);
      if (e.length) candidates = e;
    }
    if (candidates.length === 0) return;
    const [id, line] = candidates[Math.floor(Math.random() * candidates.length)];
    this.sayLine(id, line, at);
  }

  sayId(id: string, at: Object3D | null): void {
    const line = this.lines[id];
    if (line) this.sayLine(id, line, at);
  }

  private sayLine(id: string, line: LineDef, at: Object3D | null): void {
    const now = performance.now() / 1000;
    this.lastLine.set(line.file, now);
    this.lastSpeaker.set(line.speaker, now);
    this.onSubtitle?.(line.text, line.speaker);
    this.bus.emit('voice:line', { id, speaker: line.speaker });
    if (this.muted) return;
    const takes = line.takes && line.takes.length ? line.takes : [line.file];
    const file = takes[Math.floor(Math.random() * takes.length)];
    const path = `${this.baseUrl}/voice/${file.replace(/^.*\//, '')}`;
    void this.buffer(path).then((buf) => {
      if (!buf) return;
      this.play(buf, at, 1);
    });
  }

  sfx(name: string, at: Object3D | null, volume = 1): void {
    if (this.muted) return;
    const path = this.sfxPath(name) ?? this.sfxPath(FALLBACK_SFX[name] ?? '') ?? null;
    if (!path) return;
    void this.buffer(path).then((buf) => {
      if (buf) this.play(buf, at, volume);
    });
  }

  private play(buf: AudioBuffer, at: Object3D | null, volume: number): void {
    if (this.listener.context.state === 'suspended') void this.listener.context.resume();
    if (at) {
      const free = this.pool.find((p) => !p.isPlaying) ?? this.pool[0];
      if (free.isPlaying) free.stop();
      if (free.parent !== at) {
        free.parent?.remove(free);
        at.add(free);
      }
      free.setBuffer(buf);
      free.setVolume(volume);
      free.play();
    } else {
      const free = this.flat.find((p) => !p.isPlaying) ?? this.flat[0];
      if (free.isPlaying) free.stop();
      free.setBuffer(buf);
      free.setVolume(volume);
      free.play();
    }
  }
}

/** When a specific SFX is missing, reuse a sibling. */
const FALLBACK_SFX: Record<string, string> = {
  squeak_hit: 'squeak_inflate',
  thwip_fast: 'thwip',
  reload: 'ui_click',
  glug: 'ui_click',
  door_kick: 'knock',
};
