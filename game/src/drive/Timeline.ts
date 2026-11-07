import type { NeedKind } from './Needs';

/**
 * The compressed v1 drive (about 4:30): when hazards, window gremlins, back-seat needs and the boss happen, in seconds
 * after the engine starts. Pure data plus the hazard maths, so it is unit-tested.
 */
export type HazardKind = 'cart' | 'potholes' | 'mattress' | 'cones' | 'pickup' | 'deer' | 'jcone';
export type SpotName = 'hood' | 'shieldL' | 'shieldR' | 'left' | 'right' | 'dash';

export type DriveEvent =
  | { at: number; type: 'hazard'; hazard: HazardKind }
  | { at: number; type: 'clinger'; spots: SpotName[] }
  | { at: number; type: 'need'; need: NeedKind; again?: boolean }
  | { at: number; type: 'pee' }
  | { at: number; type: 'line'; ids: string[] }
  | { at: number; type: 'grandma' }
  | { at: number; type: 'boss' };

export interface HazardDef {
  /** Half width across the road, metres. */
  halfWidth: number;
  /** Patience cost when hit. */
  cost: number;
  /** Seconds of visible + audible warning before it reaches the car. */
  tell: number;
  label: string;
}

export const HAZARDS: Record<HazardKind, HazardDef> = {
  cart: { halfWidth: 0.45, cost: 5, tell: 2.0, label: 'Shopping cart!' },
  potholes: { halfWidth: 1.2, cost: 3, tell: 1.5, label: 'Potholes!' },
  mattress: { halfWidth: 3.4, cost: 8, tell: 3.0, label: 'Mattress!' },
  cones: { halfWidth: 1.5, cost: 6, tell: 1.5, label: 'Lane closed!' },
  pickup: { halfWidth: 1.0, cost: 10, tell: 1.6, label: 'Brake lights!' },
  deer: { halfWidth: 0.6, cost: 4, tell: 1.5, label: 'Deer!' },
  jcone: { halfWidth: 0.5, cost: 3, tell: 1.5, label: 'Incoming cone!' },
};

/** Half width of the minivan, metres. */
export const CAR_HALF_WIDTH = 0.95;

/** True when a hazard at road x `hazardX` overlaps the car at road x `carX` as it passes. */
export function hazardHits(carX: number, hazardX: number, halfWidth: number, carHalf = CAR_HALF_WIDTH): boolean {
  return Math.abs(carX - hazardX) < carHalf + halfWidth;
}

/** Seconds until something at distance `z` ahead (negative z) reaches the car's bumper at `bumperZ`. */
export function arrivalIn(z: number, closingSpeed: number, bumperZ = -2): number {
  if (closingSpeed <= 1e-3) return Infinity;
  return Math.max(0, (bumperZ - z) / closingSpeed);
}

/** Cruise speed (m/s) at drive time `t`: 0 → 14 m/s over the first 8 s, eased. */
export function cruiseSpeed(t: number, top = 14): number {
  if (t <= 0) return 0;
  if (t >= 8) return top;
  const k = t / 8;
  return top * k * k * (3 - 2 * k);
}

export const BOSS_AT = 180;
/** If the boss has not ended by then the truck gives up (the chapter must always finish). */
export const BOSS_GIVE_UP = 100;
/** Home stretch length after the boss, seconds. */
export const HOME_STRETCH_S = 22;

export const SCHEDULE: DriveEvent[] = [
  { at: 3, type: 'line', ids: ['drive_pickle_moon', 'drive_bean_moon'] },
  { at: 5, type: 'clinger', spots: ['hood'] },
  { at: 18, type: 'need', need: 'hungry' },
  { at: 24, type: 'clinger', spots: ['left'] },
  { at: 32, type: 'hazard', hazard: 'cart' },
  { at: 40, type: 'need', need: 'tablet' },
  { at: 46, type: 'clinger', spots: ['shieldR'] },
  { at: 55, type: 'hazard', hazard: 'potholes' },
  { at: 62, type: 'line', ids: ['drive_pickle_there_yet', 'drive_parent_almost'] },
  { at: 68, type: 'clinger', spots: ['hood', 'right'] },
  { at: 76, type: 'hazard', hazard: 'pickup' },
  { at: 84, type: 'hazard', hazard: 'cart' },
  { at: 90, type: 'pee' },
  { at: 97, type: 'hazard', hazard: 'mattress' },
  { at: 104, type: 'clinger', spots: ['left', 'shieldL'] },
  { at: 112, type: 'need', need: 'touching' },
  { at: 123, type: 'hazard', hazard: 'cones' },
  { at: 132, type: 'clinger', spots: ['hood', 'shieldR'] },
  { at: 141, type: 'hazard', hazard: 'deer' },
  { at: 150, type: 'grandma' },
  { at: 158, type: 'need', need: 'tablet', again: true },
  { at: 166, type: 'hazard', hazard: 'potholes' },
  { at: 170, type: 'clinger', spots: ['right'] },
  { at: 175, type: 'line', ids: ['drive_pickle_there_yet_now'] },
  { at: BOSS_AT, type: 'boss' },
];

/** Fires schedule entries in order as the clock passes them. */
export class Timeline {
  private index = 0;
  constructor(private readonly events: readonly DriveEvent[] = SCHEDULE) {}

  /** Events whose time is <= t that have not fired yet. */
  due(t: number): DriveEvent[] {
    const out: DriveEvent[] = [];
    while (this.index < this.events.length && this.events[this.index].at <= t) out.push(this.events[this.index++]);
    return out;
  }

  get done(): boolean {
    return this.index >= this.events.length;
  }

  /** Skip everything (debug finish). */
  skipAll(): void {
    this.index = this.events.length;
  }
}
