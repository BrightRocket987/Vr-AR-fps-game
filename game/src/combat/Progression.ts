import type { EventBus } from '../core/EventBus';
import type { Save } from '../core/Save';

export interface TierDef {
  tier: number;
  name: string;
  unlock: number; // lifetime pops
  fireMode: 'single' | 'auto';
  rate: number; // shots per second
  damage: number;
  pellets: number;
  spreadDeg: number;
  mag: number;
  color: number;
  reload: 'pump' | 'shake' | 'twist';
}

/** The BINKY's tiers (01-game-design.md). v1 implements tiers 0-3 with distinct feel; 4-6 reuse tier 3 stats. */
export const TIERS: TierDef[] = [
  { tier: 0, name: 'Foam Dart Popper', unlock: 0, fireMode: 'single', rate: 1.0, damage: 1, pellets: 1, spreadDeg: 0, mag: 6, color: 0xff7a1a, reload: 'pump' },
  { tier: 1, name: 'Double Binky', unlock: 15, fireMode: 'single', rate: 2.5, damage: 1, pellets: 1, spreadDeg: 0, mag: 12, color: 0x3fd6c8, reload: 'pump' },
  { tier: 2, name: 'Juicebox Pumper', unlock: 40, fireMode: 'single', rate: 1.2, damage: 1, pellets: 5, spreadDeg: 8, mag: 8, color: 0x9b5de5, reload: 'shake' },
  { tier: 3, name: 'Sippy SMG', unlock: 90, fireMode: 'auto', rate: 9, damage: 1, pellets: 1, spreadDeg: 2, mag: 40, color: 0xf7f3e9, reload: 'twist' },
  { tier: 4, name: 'Diaper Cannon', unlock: 160, fireMode: 'single', rate: 0.66, damage: 6, pellets: 1, spreadDeg: 0, mag: 4, color: 0xfff1b8, reload: 'pump' },
  { tier: 5, name: 'Lullaby Laser', unlock: 250, fireMode: 'auto', rate: 12, damage: 1, pellets: 1, spreadDeg: 0, mag: 100, color: 0xff9ad5, reload: 'twist' },
  { tier: 6, name: 'Bedtime Bazooka', unlock: 400, fireMode: 'single', rate: 0.33, damage: 25, pellets: 1, spreadDeg: 0, mag: 1, color: 0xffffff, reload: 'pump' },
];

export function tierForPops(pops: number): TierDef {
  let t = TIERS[0];
  for (const d of TIERS) if (pops >= d.unlock) t = d;
  return t;
}

/** Lifetime pops → weapon tier. Persists after every pop. */
export class Progression {
  pops: number;
  tier: TierDef;
  sessionPops = 0;
  onTierChange: ((t: TierDef) => void) | null = null;

  constructor(private readonly save: Save, private readonly bus: EventBus) {
    this.pops = save.data.lifetimePops;
    this.tier = tierForPops(this.pops);
  }

  addPop(): void {
    this.pops++;
    this.sessionPops++;
    this.save.data.lifetimePops = this.pops;
    this.save.persist();
    const t = tierForPops(this.pops);
    if (t.tier !== this.tier.tier) {
      this.tier = t;
      this.bus.emit('weapon:tier', { tier: t.tier, name: t.name });
      this.onTierChange?.(t);
    }
  }

  /** Pops until the next tier, or 0 at the cap. */
  toNext(): number {
    const next = TIERS.find((d) => d.unlock > this.pops);
    return next ? next.unlock - this.pops : 0;
  }
}
