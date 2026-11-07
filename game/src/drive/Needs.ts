/**
 * The back-seat need system (docs/03 §8), as pure logic. Each kid has one need slot. A need runs a 20 s clock:
 * Ask (0-8 s) → Whine (8-14 s) → Cry (14-20 s) → Meltdown (6 s of screaming, then the slot clears unresolved).
 * "I have to pee" is separate: it can never be resolved from the driver's seat and escalates every 30 s.
 */
export type Kid = 'pickle' | 'bean';
export type NeedKind = 'tablet' | 'hungry' | 'touching';
export type NeedStage = 'ask' | 'whine' | 'cry' | 'meltdown' | 'resolved' | 'failed';

export const WHINE_AT = 8;
export const CRY_AT = 14;
export const MELTDOWN_AT = 20;
export const MELTDOWN_S = 6;
/** Resolving before the whine is "Parent of the Year". */
export const QUICK_S = WHINE_AT;

export const NEED_OWNER: Record<NeedKind, Kid> = { tablet: 'pickle', hungry: 'bean', touching: 'pickle' };

export class Need {
  t = 0;
  stage: NeedStage = 'ask';
  constructor(readonly kind: NeedKind, readonly kid: Kid) {}

  get active(): boolean {
    return this.stage === 'ask' || this.stage === 'whine' || this.stage === 'cry';
  }

  /** 0..1 over the 20 s clock (1 during a meltdown). */
  get fill(): number {
    if (this.stage === 'meltdown') return 1;
    if (!this.active) return 0;
    return Math.min(1, this.t / MELTDOWN_AT);
  }

  /** Advance the clock; returns the new stage when it changed this step. */
  update(dt: number): NeedStage | null {
    if (this.stage === 'resolved' || this.stage === 'failed') return null;
    this.t += dt;
    const next: NeedStage =
      this.t >= MELTDOWN_AT + MELTDOWN_S ? 'failed' : this.t >= MELTDOWN_AT ? 'meltdown' : this.t >= CRY_AT ? 'cry' : this.t >= WHINE_AT ? 'whine' : 'ask';
    if (next !== this.stage) {
      // Never skip the meltdown beat even on a huge dt.
      this.stage = this.stage !== 'meltdown' && next === 'failed' ? 'meltdown' : next;
      return this.stage;
    }
    return null;
  }
}

export interface NeedResolution {
  need: Need;
  quick: boolean;
  seconds: number;
}

export class NeedSystem {
  readonly needs: Need[] = [];
  met = 0;
  quick = 0;
  meltdowns = 0;
  /** Stage changes (including 'meltdown' and 'failed'). */
  onStage: ((need: Need, stage: NeedStage) => void) | null = null;

  /** Needs that still count (asking, whining, crying or melting down). */
  get live(): Need[] {
    return this.needs.filter((n) => n.active || n.stage === 'meltdown');
  }

  get total(): number {
    return this.needs.length;
  }

  slotBusy(kid: Kid): boolean {
    return this.live.some((n) => n.kid === kid);
  }

  /** Start a need; null if that kid's slot is busy. */
  start(kind: NeedKind, kid: Kid = NEED_OWNER[kind]): Need | null {
    if (this.slotBusy(kid)) return null;
    const n = new Need(kind, kid);
    this.needs.push(n);
    this.onStage?.(n, 'ask');
    return n;
  }

  activeOf(kind: NeedKind): Need | null {
    return this.needs.find((n) => n.kind === kind && n.active) ?? null;
  }

  /** Resolve the active need of this kind (only Ask/Whine/Cry can be resolved). */
  resolve(kind: NeedKind): NeedResolution | null {
    const n = this.activeOf(kind);
    if (!n) return null;
    const seconds = n.t;
    n.stage = 'resolved';
    this.met++;
    const quick = seconds < QUICK_S;
    if (quick) this.quick++;
    this.onStage?.(n, 'resolved');
    return { need: n, quick, seconds };
  }

  update(dt: number): void {
    for (const n of this.needs) {
      const s = n.update(dt);
      if (!s) continue;
      if (s === 'meltdown') this.meltdowns++;
      this.onStage?.(n, s);
    }
  }

  /** Highest fill among a kid's live needs, 0..1 (drives the bubbles and the Dreamgate glow). */
  fill(kid: Kid): number {
    let f = 0;
    for (const n of this.live) if (n.kid === kid) f = Math.max(f, n.fill);
    return f;
  }

  stageOf(kid: Kid): NeedStage | null {
    const n = this.live.find((x) => x.kid === kid);
    return n ? n.stage : null;
  }

  /** Remove every live need without scoring (chapter end, debug finish). */
  clear(): void {
    for (const n of this.needs) if (n.active || n.stage === 'meltdown') n.stage = 'failed';
  }
}

/** "I have to pee": unsolvable, one level up every 30 s after it starts. */
export class PeeMeter {
  static readonly STEP_S = 30;
  level = 0;
  t = 0;
  started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    this.level = 1;
    this.t = 0;
  }

  /** Returns the new level when it escalated this step. */
  update(dt: number): number | null {
    if (!this.started) return null;
    this.t += dt;
    const lvl = 1 + Math.floor(this.t / PeeMeter.STEP_S);
    if (lvl !== this.level) {
      this.level = lvl;
      return lvl;
    }
    return null;
  }
}

export interface DriveScoreInput {
  pops: number;
  needsMet: number;
  quickNeeds: number;
  meltdowns: number;
  dodges: number;
  dents: number;
  bossCracked: boolean;
}

export function driveScore(s: DriveScoreInput): number {
  return Math.max(0, s.pops * 100 + s.needsMet * 200 + s.quickNeeds * 250 + s.dodges * 50 - s.dents * 100 - s.meltdowns * 150 + (s.bossCracked ? 500 : 0));
}

export function driveRank(score: number): string {
  if (score >= 4000) return 'S';
  if (score >= 3000) return 'A';
  if (score >= 2000) return 'B';
  if (score >= 1000) return 'C';
  return 'Tired';
}
