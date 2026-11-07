import { describe, expect, it } from 'vitest';
import barManifest from '../../public/assets/voice/manifest-bar.json';
import { Group, Vector3 } from 'three';
import {
  ALIVE_CAP,
  BRAD_FOREHEAD_HITS,
  FIGHT_GROUPS,
  FightDirector,
  GusCounter,
  TOTAL_PATRONS,
  clawOutcome,
  gusSpeed,
  labelForSpeaker,
  rankFor,
  speakerLabel,
  type PatronKind,
} from '../../src/bar/BarLogic';
import { Brad, JerseyGuy, MELEE_M, type BarHooks } from '../../src/bar/Patrons';
import type { HumanAvatar } from '../../src/bar/Humans';
import type { ProjectilePool, StarPool } from '../../src/bar/BarFx';
import { fakeWorld } from './fake-world';

const FAM = { parent: 'Mum', kid1: 'Zoe', kid2: 'Max' };

/** Run the director with every spawned patron knocked out `koAfter` seconds later; returns spawn times per kind. */
function simulate(koAfter: number, seconds = 400, dt = 0.1): { spawns: Array<{ t: number; kind: PatronKind; group: number }>; maxPresent: number; doneAt: number } {
  const d = new FightDirector();
  d.startGroup(0);
  const alive: Array<{ t: number; kind: PatronKind }> = [];
  const spawns: Array<{ t: number; kind: PatronKind; group: number }> = [];
  let maxPresent = 0;
  let doneAt = -1;
  for (let t = 0; t < seconds; t += dt) {
    for (let i = alive.length - 1; i >= 0; i--) if (t - alive[i].t >= koAfter) alive.splice(i, 1);
    const k = d.update(dt, alive.length, alive.length);
    if (k) {
      alive.push({ t, kind: k });
      spawns.push({ t, kind: k, group: d.group });
    }
    maxPresent = Math.max(maxPresent, alive.length);
    if (d.done && doneAt < 0) doneAt = t;
  }
  return { spawns, maxPresent, doneAt };
}

describe('bar · fight director', () => {
  it('spawns exactly the fourteen patrons of the four groups, in order', () => {
    expect(TOTAL_PATRONS).toBe(14);
    const r = simulate(3);
    expect(r.spawns.map((s) => s.kind)).toEqual(FIGHT_GROUPS.flat());
    expect(r.doneAt).toBeGreaterThan(0);
  });

  it('never has more than ALIVE_CAP patrons present, even when nobody gets knocked out quickly', () => {
    const slow = simulate(40, 600);
    expect(slow.maxPresent).toBeLessThanOrEqual(ALIVE_CAP);
    expect(slow.spawns.length).toBe(TOTAL_PATRONS);
  });

  it('waits for the floor to clear (or the overlap timer) before the next group', () => {
    const r = simulate(2);
    const firstOfGroup1 = r.spawns.find((s) => s.group === 1);
    const lastOfGroup0 = r.spawns.filter((s) => s.group === 0).pop();
    expect(firstOfGroup1 && lastOfGroup0).toBeTruthy();
    // last group-0 patron is knocked out 2 s after spawning, then the 2.5 s gap
    expect((firstOfGroup1?.t ?? 0) - (lastOfGroup0?.t ?? 0)).toBeGreaterThanOrEqual(4.4);
  });

  it('restarts a group from the beginning after "You lost it"', () => {
    const d = new FightDirector();
    d.startGroup(2);
    expect(d.pending).toBe(FIGHT_GROUPS[2].length);
    d.update(1, 0, 0);
    expect(d.pending).toBe(FIGHT_GROUPS[2].length - 1);
    d.startGroup(2);
    expect(d.pending).toBe(FIGHT_GROUPS[2].length);
  });

  it('Brad plus fourteen patrons is exactly the 15 pops of Tier 1 on a fresh save', () => {
    expect(1 + TOTAL_PATRONS).toBe(15);
  });
});

describe('bar · Gus', () => {
  it('staggers every 10 counts, head hits count triple, capped at 10 staggers', () => {
    const g = new GusCounter();
    let staggers = 0;
    for (let i = 0; i < 9; i++) if (g.add(false)) staggers++;
    expect(staggers).toBe(0);
    expect(g.add(false)).toBe(true);
    expect(g.staggers).toBe(1);
    // three head hits = 9 counts, the fourth crosses 20
    expect(g.add(true)).toBe(false);
    expect(g.add(true)).toBe(false);
    expect(g.add(true)).toBe(false);
    expect(g.add(true)).toBe(true);
    for (let i = 0; i < 200; i++) g.add(true);
    expect(g.staggers).toBe(GusCounter.MAX_STAGGERS);
  });

  it('walks at the speed that makes the remaining path in the remaining time, clamped', () => {
    expect(gusSpeed(10, 40)).toBeCloseTo(0.25);
    expect(gusSpeed(10, 1, 0.15, 0.9)).toBe(0.9);
    expect(gusSpeed(1, 100, 0.15, 0.9)).toBe(0.15);
    expect(gusSpeed(0, 10)).toBe(0);
  });
});

describe('bar · claw, rank, labels', () => {
  it('the claw drops the prize twice, then wins the Dreamgate', () => {
    expect([1, 2, 3, 4].map(clawOutcome)).toEqual(['drop', 'drop', 'win', 'win']);
  });

  it('ranks on knockouts, Gus staggers and restarts', () => {
    expect(rankFor(15, 6, 0)).toBe('S');
    expect(rankFor(15, 3, 0)).toBe('A');
    expect(rankFor(15, 0, 0)).toBe('B');
    expect(rankFor(10, 0, 1)).toBe('C');
    expect(rankFor(15, 6, 1)).toBe('A');
  });

  it('labels subtitles with the Family Sheet names (the voices never say them)', () => {
    expect(speakerLabel('bar_pickle_moon', FAM)).toBe('Zoe');
    expect(speakerLabel('bar_bean_moon', FAM)).toBe('Max');
    expect(speakerLabel('bar_trucker_not_hat', FAM)).toBe('Trucker Hat');
    expect(speakerLabel('bar_jersey_ref', FAM)).toBe('Jersey Guy');
    expect(speakerLabel('bar_lady_duck', FAM)).toBe('Book Club Lady');
    expect(speakerLabel('bar_parent_no', FAM)).toBe('Mum (you)');
    expect(speakerLabel('bar_parent_no', { ...FAM, parent: 'Hey' })).toBe('You');
    expect(labelForSpeaker('grandma', FAM)).toBe('Book Club Lady');
  });
});

/** Sources that may play bar_ lines (read as text by Vite's ?raw glob). */
const SOURCES = import.meta.glob(['../../src/bar/*.ts', '../../src/chapters/Bar.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('bar · voice lines (manifest-bar.json, generated from assets-src/dialogue/lines-bar.yaml)', () => {
  const lines = (barManifest as { lines: Record<string, { text: string; file: string; speaker: string }> }).lines;
  const ids = Object.keys(lines);
  const texts = ids.map((id) => lines[id].text);

  it('every line is prefixed bar_, unique and at most 12 words', () => {
    expect(ids.length).toBeGreaterThanOrEqual(40);
    expect(ids.length).toBe(texts.length);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^bar_[a-z0-9_]+$/);
    for (const t of texts) expect(t.split(/\s+/).length).toBeLessThanOrEqual(12);
  });

  it('every bar_ id the code plays exists in the YAML', () => {
    const used = new Set<string>();
    expect(Object.keys(SOURCES).length).toBeGreaterThanOrEqual(5);
    for (const text of Object.values(SOURCES)) for (const m of text.matchAll(/'(bar_[a-z0-9_]+)'/g)) used.add(m[1]);
    expect(used.size).toBeGreaterThan(30);
    for (const id of used) expect(ids).toContain(id);
  });
});

/** A HumanAvatar that records clips and ignores attachments. */
function stubHuman(height: number): HumanAvatar {
  return {
    root: new Group(),
    height,
    kind: 'procedural',
    play() {},
    playClip() {},
    update() {},
    setTint() {},
    setStretch() {},
    setOpacity() {},
    setTimeScale() {},
    attachAt() {},
    attachNear() {},
    dispose() {},
  };
}

function hooks(): BarHooks & { lines: string[] } {
  const lines: string[] = [];
  const stars = { attach() {}, release() {}, update() {} } as unknown as StarPool;
  const peanuts = { launch() {} } as unknown as ProjectilePool;
  return { lines, line: (id) => lines.push(id), stars, peanuts, onKO: () => undefined, timeScale: () => 1 };
}

describe('bar · Brad and the patrons', () => {
  it('Brad: body darts bounce, six forehead darts knock him out with one enemy:popped', () => {
    const f = fakeWorld();
    const h = hooks();
    const brad = new Brad(f.w, stubHuman(1.78), h);
    brad.spawnAt(new Vector3(0, 0, -2), new Vector3(0, 0, 1));
    brad.stand();
    for (let i = 0; i < 10; i++) expect(brad.hit(1, false)).toBe(false);
    expect(brad.hp).toBe(BRAD_FOREHEAD_HITS);
    expect(h.lines).toContain('bar_brad_woah');
    for (let i = 0; i < BRAD_FOREHEAD_HITS - 1; i++) expect(brad.hit(1, true)).toBe(false);
    expect(brad.hit(1, true)).toBe(true);
    expect(brad.knockedOut).toBe(true);
    expect(brad.hit(1, true)).toBe(false);
    expect(f.of('enemy:popped').length).toBe(1);
    expect(h.lines).toContain('bar_brad_lawyer');
  });

  it('Brad: a debug/overkill hit knocks him out even on the body', () => {
    const f = fakeWorld();
    const brad = new Brad(f.w, stubHuman(1.78), hooks());
    brad.spawnAt(new Vector3(0, 0, -2), new Vector3(0, 0, 1));
    brad.stand();
    expect(brad.hit(99, false)).toBe(true);
    expect(f.of('enemy:popped').length).toBe(1);
  });

  it('Jersey Guy: claps, rushes, bumps for 6 from outside the player head, and is knocked out (not deleted) at 0 HP', () => {
    const f = fakeWorld();
    const h = hooks();
    const j = new JerseyGuy(f.w, stubHuman(1.75), h, 0x2a8a3a);
    f.gremlins.push(j);
    j.spawnAt(new Vector3(0, 0, -1.9), new Vector3(0, 0, 1));
    f.step(8);
    expect(h.lines).toContain('bar_jersey_defence');
    expect(f.player.damage.some((d) => d.amount === 6)).toBe(true);
    expect(Math.hypot(j.position.x, j.position.z)).toBeGreaterThanOrEqual(MELEE_M - 0.05);
    j.hit(1, true);
    j.hit(1, true);
    expect(j.knockedOut).toBe(true);
    expect(j.alive).toBe(true);
    expect(f.of('enemy:popped').length).toBe(1);
    f.step(4);
    expect(j.alive).toBe(false);
  });
});
