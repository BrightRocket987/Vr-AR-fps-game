import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  BIGBEAN_HP,
  BigBean,
  CHANGE_DAMAGE,
  DEMAND_RING,
  DEMAND_STINKYS,
  GRAB_DAMAGE,
  HEAD_R,
  MAX_INTRUSION,
  MAX_POKE,
  MIN_INTRUSION,
  MIN_PLAYER_GAP,
  RING_CLOUD,
  SLAP_DAMAGE,
  STUN_SECONDS,
  allowedArmLength,
  allowedIntrusion,
  doorLocal,
  inSweepZone,
  nextPhase,
  shockHits,
  shockReach,
  stinkySpots,
} from '../../src/ai/BigBean';
import { fakeWorld, type FakeWorld } from './fake-world';

function spawnBean(f: FakeWorld): BigBean {
  const door = f.room.doors[0];
  const b = new BigBean(f.w, door);
  f.gremlins.push(b);
  b.spawnAt(new Vector3(5, 0, 5), new Vector3(1, 0, 0)); // wherever the director says: he wedges into his door
  return b;
}

describe('Big Bean · pure helpers', () => {
  it('door-local coordinates: along the normal into the room, lateral to the right', () => {
    const door = { center: new Vector3(0, 1, -2.5), normal: new Vector3(0, 0, 1) };
    expect(doorLocal(door, new Vector3(1, 1.6, 0))).toEqual({ along: 2.5, lateral: 1 });
  });

  it('pokes at most 0.8 m through the door and keeps his head 1.2 m from yours', () => {
    expect(allowedIntrusion(3, 0)).toBeCloseTo(MAX_INTRUSION, 6);
    expect(MAX_INTRUSION + HEAD_R).toBeCloseTo(MAX_POKE, 6);
    for (const along of [0.3, 1.0, 1.5, 1.8, 2.0, 2.5]) {
      for (const lateral of [0, 0.5, 1.2]) {
        const i = allowedIntrusion(along, lateral);
        if (i > MIN_INTRUSION) expect(Math.hypot(along - i, lateral) - HEAD_R).toBeGreaterThanOrEqual(MIN_PLAYER_GAP - 1e-9);
      }
    }
    expect(allowedIntrusion(0.5, 0)).toBe(MIN_INTRUSION); // you are at his door: he ducks back through it
  });

  it('arms stop 1.2 m (+ the mitten) short of the player', () => {
    expect(allowedArmLength(4, 2)).toBe(2);
    expect(allowedArmLength(2, 2)).toBeCloseTo(2 - MIN_PLAYER_GAP - 0.16, 6);
    expect(allowedArmLength(0.5, 2)).toBe(0.25);
  });

  it('the grabby sweep covers one half of the room plus a sliver past the centre line', () => {
    expect(inSweepZone(2, 1, 1)).toBe(true);
    expect(inSweepZone(2, -1, 1)).toBe(false);
    expect(inSweepZone(2, -0.2, 1)).toBe(true); // 5.7° past the centre: still caught
    expect(inSweepZone(2, -0.6, 1)).toBe(false);
    expect(inSweepZone(2, -1, -1)).toBe(true);
    expect(inSweepZone(4, 0.5, 1)).toBe(false); // beyond the reach
    expect(inSweepZone(-0.5, 1, 1)).toBe(false); // behind the door plane
  });

  it('the shockwave reaches 2.5 m, less in a shallow room, and hits as its front passes you', () => {
    expect(shockReach(6)).toBe(2.5);
    expect(shockReach(2.6)).toBeCloseTo(1.8, 6);
    expect(shockReach(1)).toBe(1.4);
    expect(shockHits(1.9, 2.1, 2.0, 2.5)).toBe(true);
    expect(shockHits(2.1, 2.3, 2.0, 2.5)).toBe(false);
    expect(shockHits(2.4, 2.5, 2.7, 2.5)).toBe(false);
  });

  it('phases: Grabby → Demand at 110, Demand → Tantrum at 60 or when the ring resolves', () => {
    expect(nextPhase('grabby', 120, false)).toBe('grabby');
    expect(nextPhase('grabby', 110, false)).toBe('demand');
    expect(nextPhase('demand', 80, false)).toBe('demand');
    expect(nextPhase('demand', 80, true)).toBe('tantrum');
    expect(nextPhase('demand', 60, false)).toBe('tantrum');
    expect(nextPhase('tantrum', 1, true)).toBe('tantrum');
    expect(nextPhase('tantrum', 0, true)).toBe('defeated');
    expect(nextPhase('grabby', 0, false)).toBe('defeated');
  });

  it('Demand Stinkys spawn in front of the door, in the room, at least 1 m from the player', () => {
    const f = fakeWorld();
    f.player.pos.set(0, 1.6, -1.2);
    const spots = stinkySpots(f.room, f.room.doors[0], f.player.pos);
    expect(spots).toHaveLength(DEMAND_STINKYS);
    for (const p of spots) {
      expect(f.room.contains(p.x, p.z)).toBe(true);
      expect(Math.hypot(p.x - f.player.pos.x, p.z - f.player.pos.z)).toBeGreaterThanOrEqual(1.0);
    }
  });
});

describe('Big Bean · the fight', () => {
  it('wedges into his door, facing the room, and squeezes through without crossing the limits', () => {
    const f = fakeWorld();
    const b = spawnBean(f);
    expect(b.position.x).toBeCloseTo(0, 6);
    expect(b.position.z).toBeCloseTo(-2.5, 6);
    expect(f.of('enemy:spawned')[0].type).toBe('bigbean');
    f.step(3);
    const head = b.headPosition(new Vector3());
    const along = head.z - -2.5;
    expect(along + HEAD_R).toBeLessThanOrEqual(MAX_POKE + 1e-6);
    expect(along).toBeGreaterThan(0.2);
    // Walk up to his door: he ducks back so his head stays 1.2 m from yours.
    f.player.pos.set(0, 1.6, -1.0);
    f.step(1.5);
    b.headPosition(head);
    expect(Math.hypot(head.x - f.player.pos.x, head.z - f.player.pos.z) - HEAD_R).toBeGreaterThanOrEqual(MIN_PLAYER_GAP - 1e-6);
  });

  it('the head (pacifier) takes triple damage', () => {
    const f = fakeWorld();
    const b = spawnBean(f);
    b.hit(2, false);
    expect(b.hp).toBe(BIGBEAN_HP - 2);
    b.hit(2, true);
    expect(b.hp).toBe(BIGBEAN_HP - 8);
  });

  it('Grabby: a 2.5 s tell, then the sweep hits 8 if you stay on that side, nothing if you step across', () => {
    const f = fakeWorld();
    f.player.pos.set(1.0, 1.6, 0); // the right half of the room
    const b = spawnBean(f);
    let t = 0;
    while (b.beat !== 'tell' && t < 6) {
      f.step(0.05);
      t += 0.05;
    }
    expect(b.beat).toBe('tell');
    expect(b.sweepSide).toBe(1);
    f.step(3.2);
    expect(f.player.damage).toContainEqual({ amount: GRAB_DAMAGE, source: 'bigbean' });
    // Next sweep: step to the other half during the tell.
    f.player.damage.length = 0;
    t = 0;
    while (b.beat !== 'tell' && t < 6) {
      f.step(0.05);
      t += 0.05;
    }
    expect(b.sweepSide).toBe(1);
    f.player.pos.set(-1.0, 1.6, 0);
    f.step(3.2);
    expect(f.player.damage).toHaveLength(0);
  });

  it('Demand: four Stinkys, each change cuts the ring 5 s and deals 10; four changes stun him (3x), then Tantrum', () => {
    const f = fakeWorld();
    const b = spawnBean(f);
    b.hit(BIGBEAN_HP - 110, false);
    expect(b.phase).toBe('demand');
    expect(b.ringActive).toBe(true);
    f.step(4.5);
    const req = f.of('spawn:request');
    expect(req).toHaveLength(DEMAND_STINKYS);
    expect(req.every((r) => r.type === 'stinky')).toBe(true);
    const ring = b.ringLeft;
    f.bus.emit('diaper:changed', { id: 1 });
    expect(b.ringLeft).toBeCloseTo(ring - 5, 3);
    expect(b.hp).toBe(110 - CHANGE_DAMAGE);
    for (let i = 2; i <= 4; i++) f.bus.emit('diaper:changed', { id: i });
    expect(b.hp).toBe(110 - 4 * CHANGE_DAMAGE);
    expect(b.stunned).toBe(true);
    expect(b.phase).toBe('demand');
    b.hit(1, false);
    expect(b.hp).toBe(110 - 4 * CHANGE_DAMAGE - 3);
    f.step(STUN_SECONDS + 0.1);
    expect(b.phase).toBe('tantrum');
    expect(b.stunned).toBe(false);
  });

  it('Demand: an expired ring fogs the room green, then Tantrum', () => {
    const f = fakeWorld();
    const b = spawnBean(f);
    b.hit(50, false);
    f.step(DEMAND_RING + 0.2);
    const clouds = f.of('stinky:cloud');
    expect(clouds).toHaveLength(1);
    expect(clouds[0].radius).toBe(RING_CLOUD.radius);
    expect(clouds[0].seconds).toBe(RING_CLOUD.seconds);
    expect(b.phase).toBe('tantrum');
  });

  it('Tantrum: the floor slap hits 10 within 2.5 m of the door and misses beyond it', () => {
    const f = fakeWorld();
    f.player.pos.set(0, 1.6, -0.2); // 2.0 m from the slap point
    const b = spawnBean(f);
    b.hit(BIGBEAN_HP - 55, false);
    expect(b.phase).toBe('tantrum');
    f.step(4.2);
    expect(f.player.damage).toContainEqual({ amount: SLAP_DAMAGE, source: 'bigbean' });
    f.player.damage.length = 0;
    f.player.pos.set(0, 1.6, 0.6); // 2.8 m: safe
    f.step(6);
    expect(f.player.damage.filter((d) => d.amount === SLAP_DAMAGE)).toHaveLength(0);
  });

  it('defeat: "Night night.", big confetti, then one pop event of type bigbean', () => {
    const f = fakeWorld();
    const b = spawnBean(f);
    expect(b.hit(99, false)).toBe(false);
    expect(b.hit(99, false)).toBe(true);
    expect(b.phase).toBe('defeated');
    expect(b.hit(99, false)).toBe(false);
    f.step(1.5);
    expect(b.alive).toBe(true);
    expect(f.fx.pop.mock.calls.length).toBeGreaterThanOrEqual(4);
    f.step(1.5);
    expect(b.alive).toBe(false);
    const pops = f.of('enemy:popped');
    expect(pops).toHaveLength(1);
    expect(pops[0].type).toBe('bigbean');
    expect(f.voice.said).toContainEqual({ speaker: 'bigbean', emotion: 'sleepy' });
  });
});
