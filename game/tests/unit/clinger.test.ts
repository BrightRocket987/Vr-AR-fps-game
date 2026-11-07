import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { Clinger } from '../../src/ai/Clinger';
import { makeWorld, record, step, stepUntil, StubAvatar } from './pack2-fakes';

/** A Clinger already on the weapon hand (driven through LEAP so the attach path is exercised). */
function clinging() {
  const w = makeWorld();
  const clinger = new Clinger(w, new StubAvatar(0.5));
  w.living.push(clinger);
  clinger.spawnAt(new Vector3(1.0, 0, -1.0), new Vector3(-1, 0, 0));
  const attached = record(w.bus, 'clinger:attached');
  const detached = record(w.bus, 'clinger:detached');
  clinger.setState('leap');
  step(clinger, 0.65);
  return { w, clinger, attached, detached };
}

describe('Clinger', () => {
  it('leaps onto the weapon hand in 0.6 s, hangs below it and emits clinger:attached once', () => {
    const { w, clinger, attached } = clinging();
    expect(clinger.state).toBe('cling');
    expect(attached).toEqual([{ id: clinger.id }]);
    const expected = w.weapon.position.clone().add(new Vector3(0, -(clinger.height + 0.1), 0));
    expect(clinger.position.distanceTo(expected)).toBeLessThan(1e-6);
    // Follows the hand every frame.
    w.weapon.position.set(0.1, 1.4, -0.5);
    step(clinger, 1 / 60);
    expect(clinger.position.y).toBeCloseTo(1.4 - 0.6, 6);
    expect(clinger.position.x).toBeCloseTo(0.1, 6);
    step(clinger, 2);
    expect(attached).toHaveLength(1);
  });

  it('bites for 1 damage every second while clinging', () => {
    const { w, clinger } = clinging();
    step(clinger, 3.05);
    expect(w.damage).toHaveLength(3);
    expect(w.damage.every((d) => d.amount === 1 && d.source === 'clinger')).toBe(true);
  });

  it('is shaken off by three fast direction reversals within 2 s', () => {
    const { w, clinger, detached } = clinging();
    // Swing 1: +x at 4 m/s.
    w.weapon.move(4, 0, 0);
    step(clinger, 0.1);
    expect(clinger.swingCount).toBe(1);
    expect(clinger.state).toBe('cling');
    // Swing 2: reversal to -x.
    w.weapon.move(-4, 0, 0);
    step(clinger, 0.1);
    expect(clinger.swingCount).toBe(2);
    expect(clinger.state).toBe('cling');
    // Swing 3: back to +x -> off.
    w.weapon.move(4, 0, 0);
    step(clinger, 1 / 60);
    expect(detached).toHaveLength(1);
    expect(detached[0]).toMatchObject({ id: clinger.id, reason: 'shake' });
    expect(clinger.state).toBe('shaken');
    w.weapon.move(0, 0, 0);
    // Flies off, lands outside the player's 0.8 m bubble, then is dizzy for 2 s.
    step(clinger, 0.4);
    expect(clinger.state).toBe('dizzy');
    expect(clinger.position.y).toBeCloseTo(w.room.floorY, 3);
    expect(Math.hypot(clinger.position.x - w.head.x, clinger.position.z - w.head.z)).toBeGreaterThanOrEqual(0.8);
    step(clinger, 2.05);
    expect(clinger.state).toBe('stalk');
  });

  it('does not count repeated fast swings in the same direction', () => {
    const { w, clinger } = clinging();
    for (let i = 0; i < 4; i++) {
      w.weapon.move(4, 0, 0);
      step(clinger, 0.1);
      w.weapon.move(0, 0, 0);
      step(clinger, 0.1);
    }
    expect(clinger.swingCount).toBe(1);
    expect(clinger.state).toBe('cling');
  });

  it('forgets reversals older than 2 s', () => {
    const { w, clinger } = clinging();
    w.weapon.move(4, 0, 0);
    step(clinger, 0.05);
    w.weapon.move(0, 0, 0);
    step(clinger, 1.2);
    w.weapon.move(-4, 0, 0);
    step(clinger, 0.05);
    w.weapon.move(0, 0, 0);
    step(clinger, 1.2); // first swing now > 2 s old
    expect(clinger.swingCount).toBe(1);
    w.weapon.move(4, 0, 0);
    step(clinger, 0.05);
    expect(clinger.swingCount).toBe(2);
    expect(clinger.state).toBe('cling');
  });

  it('slow waving never shakes it off', () => {
    const { w, clinger } = clinging();
    for (let i = 0; i < 10; i++) {
      w.weapon.move(i % 2 ? 2.5 : -2.5, 0, 0);
      step(clinger, 0.1);
    }
    expect(clinger.swingCount).toBe(0);
    expect(clinger.state).toBe('cling');
  });

  it('a Wipe slap flings it (no damage) with reason slap', () => {
    const { clinger, detached } = clinging();
    expect(clinger.hit(2, false, ['SLAP'])).toBe(false);
    expect(clinger.hp).toBe(2);
    expect(detached).toEqual([{ id: clinger.id, reason: 'slap' }]);
    expect(clinger.state).toBe('shaken');
  });

  it('popping it on the hand emits clinger:detached with reason popped', () => {
    const { clinger, detached } = clinging();
    const popped = clinger.hit(2, false);
    expect(popped).toBe(true);
    expect(detached).toEqual([{ id: clinger.id, reason: 'popped' }]);
    step(clinger, 0.2);
    expect(clinger.alive).toBe(false);
  });

  it('drops off when the weapon hand disconnects', () => {
    const { w, clinger, detached } = clinging();
    w.weapon.connected = false;
    step(clinger, 1 / 60);
    expect(detached[0]).toMatchObject({ reason: 'disconnected' });
  });

  it('stalks to a flank point about 1.5 m away, outside the frontal 60-degree cone, then tells and leaps', () => {
    const w = makeWorld();
    const clinger = new Clinger(w, new StubAvatar(0.5));
    clinger.spawnAt(new Vector3(0, 0, -2.6), new Vector3(0, 0, 1)); // straight ahead of the player
    const t = stepUntil(clinger, () => clinger.state === 'tell', 15);
    expect(clinger.state).toBe('tell');
    expect(t).toBeLessThan(15);
    const toMe = clinger.position.clone().sub(w.head).setY(0);
    const dist = toMe.length();
    expect(dist).toBeGreaterThan(1.1);
    expect(dist).toBeLessThan(2.0);
    const angle = Math.acos(toMe.normalize().dot(w.fwd)) / (Math.PI / 180);
    expect(angle).toBeGreaterThan(30); // outside the central 60 degrees
    expect(angle).toBeLessThan(90); // but still from the front
    step(clinger, 0.75);
    expect(clinger.state).toBe('leap');
  });

  it('approaches at no more than 1 m/s while in the player\'s rear hemisphere', () => {
    const w = makeWorld();
    const clinger = new Clinger(w, new StubAvatar(0.5));
    clinger.spawnAt(new Vector3(0, 0, 2.8), new Vector3(0, 0, -1)); // behind the player
    step(clinger, 0.85); // out of spawn
    let maxSpeed = 0;
    const prev = clinger.position.clone();
    for (let i = 0; i < 60; i++) {
      step(clinger, 1 / 60);
      const behind = clinger.position.z - w.head.z > 0;
      const v = clinger.position.distanceTo(prev) * 60;
      if (behind) maxSpeed = Math.max(maxSpeed, v);
      prev.copy(clinger.position);
    }
    expect(maxSpeed).toBeLessThanOrEqual(1.0 + 1e-6);
  });
});
