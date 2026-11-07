/**
 * Pure rules for Chapter 1 · The Tipsy Goose (no three.js, no DOM): the fight's escalating patron groups, Gus's
 * stagger counter and arrival pacing, the scripted claw machine, the rank, and the subtitle speaker labels.
 * Unit-tested in tests/unit/bar.test.ts.
 */

export type PatronKind = 'trucker' | 'jersey';

/** Fourteen hostile patrons in four escalating groups (Brad comes first, so Tier 1 lands with the last one). */
export const FIGHT_GROUPS: readonly PatronKind[][] = [
  ['trucker', 'jersey'],
  ['jersey', 'trucker', 'jersey'],
  ['trucker', 'jersey', 'jersey', 'trucker'],
  ['jersey', 'trucker', 'jersey', 'jersey', 'trucker'],
];
export const TOTAL_PATRONS = FIGHT_GROUPS.reduce((n, g) => n + g.length, 0);
/** Patrons standing (or still on the floor with stars) at once: keeps skinned characters <= 10 with the fixed cast. */
export const ALIVE_CAP = 4;
export const SPAWN_STAGGER_S = 1.6;
export const GROUP_GAP_S = 2.5;
/** A slow player still sees the next group: it starts early when one patron is left and the group is this old. */
export const GROUP_OVERLAP_S = 22;

/**
 * Hands out patron spawns: a group's patrons arrive SPAWN_STAGGER_S apart while fewer than ALIVE_CAP are present; the
 * next group starts GROUP_GAP_S after the floor is clear (or early, see GROUP_OVERLAP_S). `done` once all are out.
 */
export class FightDirector {
  group = -1;
  private queue: PatronKind[] = [];
  private timer = 0;
  private groupTime = 0;
  spawned = 0;
  done = false;

  /** Start (or restart after "You lost it") at group `index`. */
  startGroup(index: number): void {
    this.group = index;
    this.queue = FIGHT_GROUPS[index] ? FIGHT_GROUPS[index].slice() : [];
    this.timer = 0.6;
    this.groupTime = 0;
    this.done = index >= FIGHT_GROUPS.length;
  }

  /** Patrons of the current group not yet spawned. */
  get pending(): number {
    return this.queue.length;
  }

  /** Advance; returns a patron kind to spawn now, or null. `present` counts standing plus knocked-out-but-visible patrons. */
  update(dt: number, present: number, standing: number): PatronKind | null {
    if (this.done || this.group < 0) return null;
    this.timer -= dt;
    this.groupTime += dt;
    if (this.queue.length > 0) {
      if (this.timer <= 0 && present < ALIVE_CAP) {
        this.timer = SPAWN_STAGGER_S;
        this.spawned++;
        return this.queue.shift() ?? null;
      }
      return null;
    }
    const last = this.group >= FIGHT_GROUPS.length - 1;
    if (standing === 0 && present === 0) {
      if (last) {
        this.done = true;
        return null;
      }
      if (this.timer <= -GROUP_GAP_S) this.startGroup(this.group + 1);
      return null;
    }
    if (!last && standing <= 1 && this.groupTime > GROUP_OVERLAP_S) this.startGroup(this.group + 1);
    else this.timer = 0; // the gap to the next group counts from the moment the floor is clear
    return null;
  }
}

/** Gus can't be beaten: darts count 1, head hits 3; every 10 counts staggers him (capped at 10 staggers). */
export class GusCounter {
  static readonly PER_STAGGER = 10;
  static readonly MAX_STAGGERS = 10;
  hits = 0;
  staggers = 0;

  /** Count one dart; returns true when it causes a stagger. */
  add(headshot: boolean): boolean {
    this.hits += headshot ? 3 : 1;
    const due = Math.min(GusCounter.MAX_STAGGERS, Math.floor(this.hits / GusCounter.PER_STAGGER));
    if (due > this.staggers) {
      this.staggers++;
      return true;
    }
    return false;
  }
}

/** Gus's walk: about GUS_WALK_S seconds whatever happens (staggers pause him; the speed makes up the time). */
export const GUS_WALK_S = 45;
export function gusSpeed(remainingPathM: number, remainingTimeS: number, min = 0.15, max = 0.9): number {
  if (remainingPathM <= 0) return 0;
  const v = remainingPathM / Math.max(0.5, remainingTimeS);
  return Math.min(max, Math.max(min, v));
}

/** Claw machine: attempts 1 and 2 drop the prize, attempt 3 (and any later) wins the Dreamgate. */
export function clawOutcome(attempt: number): 'drop' | 'win' {
  return attempt >= 3 ? 'win' : 'drop';
}

/** Goose tutorial: hits needed. */
export const GOOSE_HITS = 5;

/** Brad: forehead hits to knock him out (body hits bounce). A debug/overkill hit of this much damage always lands. */
export const BRAD_FOREHEAD_HITS = 6;
export const OVERKILL_DAMAGE = 50;

/**
 * Rank from what the player did: their own knockouts, Gus staggers (worth two each) and "You lost it" restarts.
 * S >= 27 (all fifteen plus six staggers), A >= 21, B >= 15, else C.
 */
export function rankFor(playerKOs: number, staggers: number, downs: number): 'S' | 'A' | 'B' | 'C' {
  const points = playerKOs + staggers * 2 - downs * 4;
  if (points >= 27) return 'S';
  if (points >= 21) return 'A';
  if (points >= 15) return 'B';
  return 'C';
}

export interface FamilyNames {
  parent: string;
  kid1: string;
  kid2: string;
}

/** On-screen speaker for a bar_ line id: the kids show the Family Sheet names (TTS never says them). */
export function speakerLabel(id: string, fam: FamilyNames): string {
  const who = id.split('_')[1] ?? '';
  const map: Record<string, string> = {
    marlene: 'Marlene',
    pickle: fam.kid1 || 'Pickle',
    bean: fam.kid2 || 'Bean',
    kayden: 'Kayden',
    brad: 'Brad',
    trucker: 'Trucker Hat',
    jersey: 'Jersey Guy',
    lady: 'Book Club Lady',
    gus: 'Gus',
    parent: fam.parent && fam.parent !== 'Hey' ? `${fam.parent} (you)` : 'You',
  };
  return map[who] ?? who;
}

/** Fallback labels for lines played by speaker (not id), e.g. shared gremlin barks. */
export function labelForSpeaker(speaker: string, fam: FamilyNames): string {
  const map: Record<string, string> = {
    marlene: 'Marlene',
    pickle: fam.kid1 || 'Pickle',
    bean: fam.kid2 || 'Bean',
    kayden: 'Kayden',
    brad: 'Brad',
    patron: 'Patron',
    grandma: 'Book Club Lady',
    gus: 'Gus',
    parent: 'You',
    narrator: 'The Dreamgate',
  };
  return map[speaker] ?? speaker;
}
