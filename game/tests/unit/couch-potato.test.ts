import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { CouchPotato } from '../../src/ai/CouchPotato';
import { Scamp } from '../../src/ai/Scamp';
import { clock, makeWorld, record, step, stepUntil, StubAvatar } from './pack2-fakes';

/** Player stands in the -x/-z quarter looking at the couch; the Potato spawns on the +x side. */
function seatedPotato() {
  const w = makeWorld({ couch: true, head: new Vector3(-1.5, 1.6, -1.0), forward: new Vector3(0, 0, 1) });
  const potato = new CouchPotato(w, new StubAvatar(0.65));
  w.living.push(potato);
  potato.spawnAt(new Vector3(1.5, 0, 0), new Vector3(0, 0, 1));
  const t = stepUntil(potato, () => potato.state === 'sit', 12);
  return { w, potato, walkTime: t };
}

describe('CouchPotato', () => {
  it('walks to a reserved seat, snaps onto it and sits', () => {
    const { w, potato, walkTime } = seatedPotato();
    expect(potato.state).toBe('sit');
    expect(walkTime).toBeLessThan(6);
    expect(potato.seat).not.toBeNull();
    expect(w.seats.seatedCount()).toBe(1);
    const seat = w.room.seats().find((s) => s.id === potato.seat?.id);
    expect(seat).toBeDefined();
    expect(potato.position.distanceTo(seat!.position)).toBeLessThan(0.08);
  });

  it('sits on the floor at the room centre when there is no couch', () => {
    const w = makeWorld({ head: new Vector3(-2, 1.6, -2) });
    const potato = new CouchPotato(w, new StubAvatar(0.65));
    potato.spawnAt(new Vector3(2, 0, 2), new Vector3(0, 0, -1));
    stepUntil(potato, () => potato.state === 'sit', 12);
    expect(potato.state).toBe('sit');
    expect(potato.seat).toBeNull();
    expect(Math.hypot(potato.position.x, potato.position.z)).toBeLessThan(0.4);
    expect(potato.position.y).toBeCloseTo(w.room.floorY, 3);
  });

  it('throws popcorn every 4 s and a cushion on every third throw, with the tell 0.5 s before', () => {
    const { w, potato } = seatedPotato();
    const cushions = record(w.bus, 'potato:cushion');
    const attacks = record(w.bus, 'enemy:attack');
    const neutralLines = () => w.lines.filter((l) => l.speaker === 'potato' && l.emotion === 'neutral').length;
    const c = clock(potato);

    c.to(3.9);
    expect(potato.throwsMade).toBe(0);
    expect(w.damage).toHaveLength(0);
    c.to(4.1);
    expect(potato.throwsMade).toBe(1);
    expect(potato.pool.inFlight).toBe(1);
    // The arc lands on the head position captured at throw time (the head has not moved).
    c.to(5.3);
    expect(w.damage).toEqual([{ amount: 2, source: 'potato' }]);
    expect(attacks[0]).toMatchObject({ type: 'potato', damage: 2 });
    expect(cushions).toHaveLength(0);

    c.to(7.9);
    expect(potato.throwsMade).toBe(1);
    c.to(8.1);
    expect(potato.throwsMade).toBe(2);
    c.to(9.3);
    expect(w.damage).toHaveLength(2);

    // Third throw: tell at 11.5 s, cushion at 12 s.
    const linesBeforeTell = neutralLines();
    c.to(11.35);
    expect(neutralLines()).toBe(linesBeforeTell);
    c.to(11.6);
    expect(neutralLines()).toBe(linesBeforeTell + 1);
    expect((potato.avatar as StubAvatar).plays.includes('pickup')).toBe(true);
    expect(potato.throwsMade).toBe(2);
    c.to(12.1);
    expect(potato.throwsMade).toBe(3);
    expect(potato.pool.cushion.visible).toBe(true);
    c.to(13.4);
    expect(cushions).toHaveLength(1);
    expect(cushions[0]).toMatchObject({ id: potato.id, seconds: 1 });
    expect(w.damage[2]).toEqual({ amount: 6, source: 'potato' });
    expect(potato.pool.cushion.visible).toBe(false);
    // Fourth and fifth are popcorn again.
    c.to(16.1);
    expect(potato.throwsMade).toBe(4);
    c.to(20.1);
    expect(potato.throwsMade).toBe(5);
    expect(cushions).toHaveLength(1);
  });

  it('pelts the player immediately when they come within 1 m of the couch', () => {
    const { w, potato } = seatedPotato();
    step(potato, 0.6);
    expect(potato.pool.inFlight).toBe(0);
    w.head.set(potato.position.x + 0.7, 1.6, potato.position.z - 0.6);
    step(potato, 0.05);
    expect(potato.pool.inFlight).toBe(1);
    // Not spammed every frame.
    step(potato, 0.5);
    expect(potato.pool.inFlight).toBeLessThanOrEqual(1);
  });

  it('is invulnerable for the first 0.5 s of sitting, then takes dart damage normally', () => {
    const { potato } = seatedPotato();
    step(potato, 0.2);
    expect(potato.hit(10, false)).toBe(false);
    expect(potato.hp).toBe(4);
    step(potato, 0.4);
    expect(potato.hit(1, false)).toBe(false);
    expect(potato.hp).toBe(3);
  });

  it('is evicted by three Wipe slaps (not damaged by them) and roams at Scamp speed', () => {
    const { w, potato } = seatedPotato();
    const evicted = record(w.bus, 'potato:evicted');
    step(potato, 0.6);
    potato.hit(2, false, ['SLAP']);
    potato.hit(2, false, ['SLAP']);
    expect(potato.state).toBe('sit');
    expect(potato.hp).toBe(4);
    expect(potato.slapCount).toBe(2);
    potato.hit(2, false, ['SLAP']);
    expect(potato.wasEvicted).toBe(true);
    expect(potato.state).toBe('roam');
    expect(potato.seat).toBeNull();
    expect(w.seats.seatedCount()).toBe(0);
    expect(potato.speed).toBe(1.6);
    expect(evicted).toEqual([{ id: potato.id }]);
    // Standing clear of the couch footprint so it can path again.
    expect(w.room.blockedAt(potato.position.x, potato.position.z, potato.radius)).toBeNull();
    // It then chases and throws popcorn from range.
    step(potato, 6);
    expect(potato.throwsMade).toBeGreaterThan(0);
  });

  it('evicts a sitting Scamp within 0.8 m when it arrives: seat released, shoved 1 m, event emitted', () => {
    const w = makeWorld({ couch: true, head: new Vector3(-1.5, 1.6, -1.0), forward: new Vector3(0, 0, 1) });
    const scamp = new Scamp(w, new StubAvatar(0.6));
    const middle = w.room.seats()[1];
    scamp.spawnAt(new Vector3(0, 0, 1), new Vector3(0, 0, 1));
    scamp.seat = w.seats.reserve(scamp.id, middle.position);
    expect(scamp.seat?.id).toBe(middle.id);
    scamp.root.position.copy(middle.position);
    scamp.setState('sit');
    const potato = new CouchPotato(w, new StubAvatar(0.65));
    w.living.push(scamp, potato);
    const evicted = record(w.bus, 'potato:evicted');
    potato.spawnAt(new Vector3(1.5, 0, 0), new Vector3(0, 0, 1));
    stepUntil([potato], () => potato.state === 'sit', 12);
    expect(potato.state).toBe('sit');
    expect(scamp.state).toBe('roam');
    expect(scamp.seat).toBeNull();
    expect(w.seats.seatedCount()).toBe(1);
    expect(evicted).toEqual([{ id: scamp.id }]);
    // The shove slides the Scamp off the cushion over 0.3 s.
    step([potato, scamp], 0.4);
    const moved = Math.hypot(scamp.position.x - middle.position.x, scamp.position.z - middle.position.z);
    expect(moved).toBeGreaterThan(0.6);
    expect(scamp.position.y).toBeCloseTo(w.room.floorY, 3);
  });

  it('pops into popcorn confetti and removes its projectile meshes', () => {
    const { w, potato } = seatedPotato();
    step(potato, 0.6);
    const popped = record(w.bus, 'enemy:popped');
    expect(w.world.children).toContain(potato.pool.popcorn);
    potato.hit(99, false);
    step(potato, 0.2);
    expect(potato.alive).toBe(false);
    expect(popped).toHaveLength(1);
    expect(w.fxCalls.filter((c) => c === 'pop').length).toBeGreaterThanOrEqual(2); // body + popcorn
    expect(w.world.children).not.toContain(potato.pool.popcorn);
    expect(w.world.children).not.toContain(potato.pool.cushion);
    expect(w.seats.seatedCount()).toBe(0);
  });
});
