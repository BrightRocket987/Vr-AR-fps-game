import { Vector3 } from 'three';
import type { EventBus } from '../core/EventBus';
import type { RoomModel } from '../room/RoomModel';
import type { Gremlin } from './Gremlin';

export interface SpawnSource {
  kind: 'door' | 'crack' | 'window' | 'couch';
  position: Vector3; // floor point
  facing: Vector3; // into the room
  doorId?: string;
}

export interface WaveDef {
  name: string;
  /** Seconds the wave lasts before the next one (after a short relax). */
  duration: number;
  /** Credits per second spent on spawns. */
  rate: number;
  maxAlive: number;
  /** Type weights for this wave. Types not registered are skipped. */
  weights: Record<string, number>;
  /** Scripted spawns at wave start: type names. */
  opening?: string[];
  /**
   * A boss wave: the chapter stages the boss (type name) itself; the director only keeps the wave's light trickle
   * going. A boss wave's duration is Infinity: it ends when the chapter says so (the boss pops), never by time.
   */
  boss?: string;
}

export interface TypeDef {
  cost: number;
  create: () => Gremlin;
  /** Optional source preference. */
  sources?: Array<SpawnSource['kind']>;
}

/**
 * Chapter 3's waves: five timed waves (about 9 minutes with the relaxes) then Big Bean's boss wave (about 2). The
 * practice range plays ENDLESS_WAVES (no boss) and loops the last one with rising intensity.
 */
export const WAVES: WaveDef[] = [
  { name: 'A Scamp Appears', duration: 60, rate: 0.35, maxAlive: 4, weights: { scamp: 1 }, opening: ['scamp'] },
  { name: 'Couch Party', duration: 90, rate: 0.6, maxAlive: 7, weights: { scamp: 3, potato: 1, clinger: 1 }, opening: ['potato'] },
  { name: 'Knock Knock', duration: 100, rate: 0.8, maxAlive: 9, weights: { scamp: 3, potato: 1, breacher: 1, clinger: 1, crawler: 1 }, opening: ['breacher', 'crawler'] },
  { name: 'Code Brown', duration: 110, rate: 1.0, maxAlive: 11, weights: { scamp: 3, stinky: 2, potato: 1, breacher: 1, siren: 1, zombie: 1, crawler: 1 }, opening: ['stinky', 'stinky', 'zombie'] },
  { name: 'Everyone Is Awake', duration: 140, rate: 1.4, maxAlive: 14, weights: { scamp: 4, stinky: 2, potato: 1, breacher: 2, clinger: 2, siren: 1, zombie: 2, crawler: 1 }, opening: ['breacher', 'siren', 'zombie'] },
  { name: 'Big Bean', duration: Infinity, rate: 0.3, maxAlive: 4, weights: { scamp: 1 }, boss: 'bigbean' },
];

/** The waves without bosses (the practice range: endless, no boss). */
export const ENDLESS_WAVES: WaveDef[] = WAVES.filter((w) => !w.boss);

/**
 * Threat-budget spawn director. Spends credits at the wave's rate on random registered types, spawns at
 * doors first, floor cracks as the universal fallback, respects alive caps per headset and fires the
 * "three on the couch summons a Couch Potato" comedy trigger.
 */
export class Director {
  private readonly types = new Map<string, TypeDef>();
  private credits = 0;
  private waveIndex = -1;
  private waveTime = 0;
  private relaxing = false;
  private relaxTime = 0;
  private endless = 0;
  readonly alive: Gremlin[] = [];
  private spawnedTotal = 0;
  private lastPotatoTrigger = -30;
  paused = false;

  constructor(
    private readonly room: RoomModel,
    private readonly bus: EventBus,
    private readonly sources: () => SpawnSource[],
    private readonly player: () => Vector3,
    private readonly capScale: number, // 1 on Quest 3, 14/20 on Quest 2
    /** The wave table this director plays (ENDLESS_WAVES for the practice range). */
    readonly waves: WaveDef[] = WAVES,
  ) {}

  register(type: string, def: TypeDef): void {
    this.types.set(type, def);
  }

  get wave(): WaveDef | null {
    return this.waveIndex >= 0 && this.waves.length ? this.waves[Math.min(this.waveIndex, this.waves.length - 1)] : null;
  }
  /** Index of the first boss wave in this director's table, or -1. */
  get bossWaveIndex(): number {
    return this.waves.findIndex((w) => !!w.boss);
  }
  get waveNumber(): number {
    return this.waveIndex + 1;
  }
  get total(): number {
    return this.spawnedTotal;
  }

  /** Start the first wave, or wave `fromWave` (0-based: tests and the ?boss=1 shortcut). */
  start(fromWave = 0): void {
    this.jumpTo(fromWave);
  }

  /** Abandon the current wave and start wave `index` now (living gremlins stay). */
  jumpTo(index: number): void {
    this.waveIndex = Math.max(0, Math.min(Math.floor(index), this.waves.length - 1)) - 1;
    this.endless = 0;
    this.nextWave();
  }

  private nextWave(): void {
    this.waveIndex++;
    this.waveTime = 0;
    this.relaxing = false;
    const w = this.wave;
    if (!w) return;
    if (this.waveIndex >= this.waves.length) this.endless = this.waveIndex - this.waves.length + 1;
    this.credits = 2;
    this.bus.emit('wave:start', { index: this.waveIndex, name: w.name + (this.endless ? ` +${this.endless}` : '') });
    for (const t of w.opening ?? []) this.spawn(t);
  }

  update(dt: number): void {
    // Cull dead.
    for (let i = this.alive.length - 1; i >= 0; i--) if (!this.alive[i].alive) this.alive.splice(i, 1);
    if (this.paused) return;
    const w = this.wave;
    if (!w) return;
    if (this.relaxing) {
      this.relaxTime += dt;
      if (this.relaxTime > 10 || (this.alive.length === 0 && this.relaxTime > 3)) this.nextWave();
      return;
    }
    this.waveTime += dt;
    const rate = w.rate * (1 + this.endless * 0.25);
    const maxAlive = Math.max(2, Math.round(w.maxAlive * this.capScale * (1 + this.endless * 0.1)));
    this.credits += rate * dt;
    if (this.alive.length < maxAlive && this.credits >= 1) {
      const type = this.pickType(w);
      if (type) {
        const cost = this.types.get(type)?.cost ?? 1;
        if (this.credits >= cost) {
          this.credits -= cost;
          this.spawn(type);
        }
      }
    }
    // Comedy trigger: three sitters summon a Couch Potato to evict them.
    const seated = this.alive.filter((g) => g.state === 'sit').length;
    if (seated >= 3 && this.types.has('potato') && this.waveTime - this.lastPotatoTrigger > 30 && this.alive.length < maxAlive + 1) {
      this.lastPotatoTrigger = this.waveTime;
      this.spawn('potato');
      this.bus.emit('log', { text: 'comedy trigger: couch party → Couch Potato' });
    }
    if (this.waveTime >= w.duration) {
      this.relaxing = true;
      this.relaxTime = 0;
      this.bus.emit('wave:clear', { index: this.waveIndex });
    }
  }

  private pickType(w: WaveDef): string | null {
    const entries = Object.entries(w.weights).filter(([t]) => this.types.has(t));
    if (entries.length === 0) return null;
    // Breachers and Stinkies are capped.
    const count = (t: string) => this.alive.filter((g) => g.type === t).length;
    const filtered = entries.filter(([t]) => !(t === 'breacher' && count(t) >= 2) && !(t === 'potato' && count(t) >= 1) && !(t === 'siren' && count(t) >= 3));
    const pool = filtered.length ? filtered : entries;
    const total = pool.reduce((s, [, wgt]) => s + wgt, 0);
    let r = Math.random() * total;
    for (const [t, wgt] of pool) {
      r -= wgt;
      if (r <= 0) return t;
    }
    return pool[pool.length - 1][0];
  }

  /** Spawn a type at the best available source. Returns the gremlin or null. */
  spawn(type: string, preferred?: SpawnSource): Gremlin | null {
    const def = this.types.get(type);
    if (!def) return null;
    const src = preferred ?? this.chooseSource(def);
    if (!src) return null;
    const g = def.create();
    const pos = src.position.clone().addScaledVector(src.facing, 0.3);
    pos.y = this.room.floorY;
    g.spawnAt(pos, src.facing);
    this.alive.push(g);
    this.spawnedTotal++;
    return g;
  }

  private chooseSource(def: TypeDef): SpawnSource | null {
    const all = this.sources();
    const p = this.player();
    const ok = all.filter((s) => Math.hypot(s.position.x - p.x, s.position.z - p.z) >= 0.8);
    if (ok.length === 0) return all[0] ?? null;
    const prefs = def.sources ?? ['door', 'crack', 'window', 'couch'];
    for (const kind of prefs) {
      const c = ok.filter((s) => s.kind === kind);
      if (c.length) return c[Math.floor(Math.random() * c.length)];
    }
    return ok[Math.floor(Math.random() * ok.length)];
  }

  /** Spend-free scripted spawn (e.g. a tutorial Scamp). */
  forceSpawn(type: string, at?: SpawnSource): Gremlin | null {
    return this.spawn(type, at);
  }

  clear(): void {
    for (const g of this.alive) g.dispose();
    this.alive.length = 0;
  }
}
