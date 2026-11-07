import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { CLOUD_DETONATE, CLOUD_POPPED, DETONATE_DAMAGE, RING_SECONDS, RING_SCREAM_AT, Stinky } from '../../src/ai/Stinky';
import { fakeWorld, stubAvatar, type FakeWorld, type StubAvatar } from './fake-world';

function spawnStinky(f: FakeWorld, at = new Vector3(0, 0, -2.2)): { s: Stinky; av: StubAvatar } {
  const av = stubAvatar(0.5);
  const s = new Stinky(f.w, av);
  f.gremlins.push(s);
  s.spawnAt(at, new Vector3(0, 0, 1));
  return { s, av };
}

function stepUntil(f: FakeWorld, s: Stinky, state: string, max = 10): number {
  const dt = 1 / 72;
  const start = f.clock.t;
  while (s.state !== state && s.alive && f.clock.t - start < max) f.step(dt, undefined, dt);
  expect(s.state).toBe(state);
  return f.clock.t;
}

describe('Stinky · waddle and demand', () => {
  it('waddles toward the player at 0.8 m/s and stops at 1.5 m to demand a change with a 10 s ring', () => {
    const f = fakeWorld();
    const { s, av } = spawnStinky(f);
    const tDemand = stepUntil(f, s, 'demand');
    // 2.2 m away, needs to close 0.7 m: ~0.5 s spawn walk + ~0.6 s waddle.
    expect(tDemand).toBeGreaterThan(0.6);
    expect(tDemand).toBeLessThan(2.5);
    const d = Math.hypot(s.position.x, s.position.z);
    expect(d).toBeLessThanOrEqual(1.5 + 0.05);
    expect(d).toBeGreaterThanOrEqual(1.3);
    expect(av.played).toContain('walk');
    expect(av.played[av.played.length - 1]).toBe('crouch');
    expect(f.of('diaper:ring')).toEqual([{ id: s.id, seconds: RING_SECONDS }]);
    expect(f.voice.said).toContainEqual({ speaker: 'stinky', emotion: 'whine' });
    expect(s.changeable).toBe(true);
  });

  it('the ring shrinks linearly, screams with 5 s left and detonates when it runs out', () => {
    const f = fakeWorld();
    const { s } = spawnStinky(f);
    const tDemand = stepUntil(f, s, 'demand');
    f.step(2);
    expect(s.ringLeft).toBeCloseTo(RING_SECONDS - 2, 1);
    expect(f.voice.said.filter((x) => x.emotion === 'scream')).toHaveLength(0);
    f.step(RING_SECONDS - RING_SCREAM_AT - 2 + 0.1);
    expect(f.voice.said.filter((x) => x.speaker === 'stinky' && x.emotion === 'scream')).toHaveLength(1);
    expect(s.alive).toBe(true);
    const tStart = f.clock.t;
    while (s.alive && f.clock.t - tStart < 6) f.step(1 / 72, undefined, 1 / 72);
    expect(s.alive).toBe(false);
    expect(f.clock.t - tDemand).toBeCloseTo(RING_SECONDS, 1);
    expect(s.state).toBe('detonate');
    // Big cloud, 15 damage (player 1.5 m away), two Scamps requested facing the player, no pop event.
    const clouds = f.of('stinky:cloud');
    expect(clouds).toHaveLength(1);
    expect(clouds[0].radius).toBe(CLOUD_DETONATE.radius);
    expect(clouds[0].seconds).toBe(CLOUD_DETONATE.seconds);
    expect(clouds[0].fireRatePenalty).toBe(CLOUD_DETONATE.fireRatePenalty);
    expect(f.of('diaper:detonated')).toHaveLength(1);
    expect(f.player.damage).toEqual([{ amount: DETONATE_DAMAGE, source: 'stinky' }]);
    const spawns = f.of('spawn:request');
    expect(spawns).toHaveLength(2);
    for (const sp of spawns) {
      expect(sp.type).toBe('scamp');
      expect(Math.hypot(sp.position.x, sp.position.z)).toBeGreaterThanOrEqual(1.0);
      expect(sp.facing.z).toBeGreaterThan(0.9); // toward the player at the origin
      expect(f.room.contains(sp.position.x, sp.position.z)).toBe(true);
    }
    expect(Math.abs(spawns[0].position.x - spawns[1].position.x)).toBeCloseTo(0.7, 1);
    expect(f.of('enemy:popped')).toHaveLength(0);
    expect(f.fx.pop).toHaveBeenCalledTimes(1);
    expect(f.voice.sfx).toContain('stink_cloud');
    expect(f.w.world.children).not.toContain(s.root);
  });

  it('a detonation out of range hurts nobody', () => {
    const f = fakeWorld();
    const { s } = spawnStinky(f, new Vector3(0, 0, -1.6));
    stepUntil(f, s, 'demand');
    f.player.pos.set(0, 1.6, 2.0); // walked 3.6 m away
    f.step(RING_SECONDS + 0.5);
    expect(s.alive).toBe(false);
    expect(f.player.damage).toHaveLength(0);
    expect(f.of('stinky:cloud')).toHaveLength(1);
  });
});

describe('Stinky · branches', () => {
  it('changeDiaper() during DEMAND thanks you, emits diaper:changed and pops friendly with the CHANGED tag and no cloud', () => {
    const f = fakeWorld();
    const { s } = spawnStinky(f);
    stepUntil(f, s, 'demand');
    s.changeDiaper();
    expect(s.state).toBe('changed');
    expect(f.of('diaper:changed')).toEqual([{ id: s.id }]);
    expect(f.voice.said).toContainEqual({ speaker: 'stinky', emotion: 'sleepy' });
    expect(f.fx.text).toHaveBeenCalledWith(expect.anything(), '+50 CHANGED', expect.any(String));
    expect(s.changeable).toBe(false);
    s.changeDiaper(); // idempotent
    expect(f.of('diaper:changed')).toHaveLength(1);
    f.step(1.2);
    const popped = f.of('enemy:popped');
    expect(popped).toHaveLength(1);
    expect(popped[0].style).toContain('CHANGED');
    expect(popped[0].type).toBe('stinky');
    expect(f.of('stinky:cloud')).toHaveLength(0);
    expect(f.of('diaper:popped')).toHaveLength(0);
    expect(s.alive).toBe(false);
  });

  it('shot before the ring ends: diaper:popped plus a small 1.5 m cloud with the -20% penalty', () => {
    const f = fakeWorld();
    const { s } = spawnStinky(f);
    stepUntil(f, s, 'demand');
    f.step(3);
    expect(s.hit(3, false)).toBe(true);
    const popped = f.of('diaper:popped');
    expect(popped).toHaveLength(1);
    expect(popped[0].id).toBe(s.id);
    expect(popped[0].position.y).toBeCloseTo(0.25, 3);
    const clouds = f.of('stinky:cloud');
    expect(clouds).toHaveLength(1);
    expect(clouds[0].radius).toBe(CLOUD_POPPED.radius);
    expect(clouds[0].seconds).toBe(CLOUD_POPPED.seconds);
    expect(clouds[0].fireRatePenalty).toBe(CLOUD_POPPED.fireRatePenalty);
    f.step(0.3);
    expect(f.of('enemy:popped')).toHaveLength(1);
    expect(s.alive).toBe(false);
    expect(f.player.damage).toHaveLength(0);
    expect(f.of('spawn:request')).toHaveLength(0);
    // Once popped the ring never detonates.
    f.step(RING_SECONDS);
    expect(f.of('stinky:cloud')).toHaveLength(1);
  });

  it('a slap while waddling hurts it but does not pop it; a second one does, with the small cloud', () => {
    const f = fakeWorld();
    const { s } = spawnStinky(f);
    f.step(0.6);
    expect(s.state).toBe('waddle');
    expect(s.hit(2, false)).toBe(false);
    expect(s.hp).toBe(1);
    expect(f.of('stinky:cloud')).toHaveLength(0);
    expect(s.hit(2, false)).toBe(true);
    expect(f.of('stinky:cloud')).toHaveLength(1);
    expect(f.of('stinky:cloud')[0].radius).toBe(1.5);
  });
});
