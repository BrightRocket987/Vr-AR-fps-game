import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  BEHIND_SECONDS,
  Breacher,
  DIZZY_SECONDS,
  KICK_AT,
  KICK_SECONDS,
  KNOCK_INTERVAL,
  LEAF_REST_ANGLE,
  SLAMMED_SECONDS,
  TADA_SECONDS,
} from '../../src/ai/Breacher';
import { fakeWorld, stubAvatar, type FakeWorld } from './fake-world';

/** Spawn a Breacher at the virtual door (centre (0, 1, -2.5), normal +z, right -x, 0.9 x 2.0). */
function spawnBreacher(f: FakeWorld): Breacher {
  const door = f.room.doors[0];
  const av = stubAvatar(0.75);
  const b = new Breacher(f.w, av, door);
  f.gremlins.push(b);
  b.spawnAt(f.room.doorFloorPoint(door).addScaledVector(door.normal, 0.3), door.normal.clone());
  return b;
}

/** Step until the Breacher reaches `state` (or fail after `max` seconds); returns the game time. */
function stepUntil(f: FakeWorld, b: Breacher, state: string, max = 10): number {
  const dt = 1 / 72;
  const start = f.clock.t;
  while (b.state !== state && f.clock.t - start < max) f.step(dt, undefined, dt);
  expect(b.state).toBe(state);
  return f.clock.t;
}

describe('Breacher · knock timing', () => {
  it('waits behind the door, knocks three times 0.8 s apart with rising haptics, then kicks', () => {
    const f = fakeWorld();
    const b = spawnBreacher(f);
    const door = f.room.doors[0];
    expect(b.avatar.root.visible).toBe(false);
    // Spawned behind the door plane along -normal.
    expect(b.position.z).toBeCloseTo(door.center.z - 0.4, 3);
    expect(b.position.y).toBeCloseTo(f.room.floorY, 6);
    const dt = 1 / 72;
    f.step(dt, undefined, dt);
    expect(b.state).toBe('behind');
    expect(b.leaf.visible).toBe(true);
    expect(b.swing).toBeCloseTo(LEAF_REST_ANGLE, 6);

    const knockTimes: number[] = [];
    f.bus.on('door:knock', () => knockTimes.push(f.clock.t));
    const tKnock = stepUntil(f, b, 'knock');
    expect(tKnock).toBeGreaterThanOrEqual(BEHIND_SECONDS - dt);
    const tKick = stepUntil(f, b, 'kick');
    expect(knockTimes).toHaveLength(3);
    expect(knockTimes[1] - knockTimes[0]).toBeCloseTo(KNOCK_INTERVAL, 1);
    expect(knockTimes[2] - knockTimes[1]).toBeCloseTo(KNOCK_INTERVAL, 1);
    expect(tKick - knockTimes[0]).toBeCloseTo(KICK_AT, 1);
    const knocks = f.of('door:knock');
    expect(knocks.map((k) => k.count)).toEqual([1, 2, 3]);
    expect(knocks.every((k) => k.doorId === door.id)).toBe(true);
    // Both hands pulsed 0.5, 0.7, 1.0.
    expect(f.weapon.pulses.map((p) => p.intensity)).toEqual([0.5, 0.7, 1.0]);
    expect(f.off.pulses.map((p) => p.intensity)).toEqual([0.5, 0.7, 1.0]);
    expect(f.voice.sfx.filter((s) => s === 'knock')).toHaveLength(3);
    expect(f.voice.said.some((s) => s.speaker === 'breacher' && s.emotion === 'scream')).toBe(true);
  });

  it('the kick swings the leaf to 90°, hurts a player standing in the doorway, opens the portal and poses', () => {
    const f = fakeWorld();
    const b = spawnBreacher(f);
    const door = f.room.doors[0];
    f.player.pos.set(0.2, 1.6, -1.9); // 0.6 m in front of the door, inside the 1 m kick arc
    stepUntil(f, b, 'kick');
    expect(f.voice.sfx).toContain('door_kick');
    const tTada = stepUntil(f, b, 'tada');
    expect(b.swing).toBeCloseTo(Math.PI / 2, 2);
    expect(f.player.damage).toEqual([{ amount: 10, source: 'breacher' }]);
    expect(f.doorOps).toEqual([{ id: door.id, open: true }]);
    expect(f.of('door:breached')).toEqual([{ doorId: door.id }]);
    expect(b.avatar.root.visible).toBe(true);
    // At the threshold, just inside the room, never inside the player's bubble.
    expect(b.position.z).toBeGreaterThan(door.center.z);
    expect(Math.hypot(b.position.x - 0.2, b.position.z + 1.9)).toBeGreaterThanOrEqual(0.6);
    // TA-DA takes double damage for 1.2 s.
    b.hit(1, false);
    expect(b.hp).toBe(6);
    const tRush = stepUntil(f, b, 'rush');
    expect(tRush - tTada).toBeCloseTo(TADA_SECONDS, 1);
    b.hit(1, false);
    expect(b.hp).toBe(5);
    void KICK_SECONDS;
  });

  it('rushes the player, telegraphs a headbutt for 0.5 s, lands 8, then is dizzy for 2 s and rushes again', () => {
    const f = fakeWorld();
    const b = spawnBreacher(f);
    stepUntil(f, b, 'rush');
    const tHeadbutt = stepUntil(f, b, 'headbutt', 5);
    // Closed to 0.9 m at 2 m/s from ~2.15 m away.
    expect(f.player.damage).toHaveLength(0);
    const tDizzy = stepUntil(f, b, 'dizzy', 2);
    expect(tDizzy - tHeadbutt).toBeCloseTo(0.5, 1);
    expect(f.player.damage).toEqual([{ amount: 8, source: 'breacher' }]);
    expect(f.fx.text).toHaveBeenCalledWith(expect.anything(), 'DIZZY', '#ffffff');
    const tRush = stepUntil(f, b, 'rush', 3);
    expect(tRush - tDizzy).toBeCloseTo(DIZZY_SECONDS, 1);
    // Behind the player it slows to the 1 m/s rear cap: turn the player round and watch the step size.
    f.player.fwd.set(0, 0, 1);
    f.player.pos.set(0, 1.6, 2.0);
    b.position.set(0, 0, -1.0);
    const before = b.position.z;
    f.step(0.5);
    expect(b.position.z - before).toBeLessThanOrEqual(0.5 + 0.02);
    expect(b.position.z - before).toBeGreaterThan(0.4);
  });

  it('cannot be shot while hidden behind the door', () => {
    const f = fakeWorld();
    const b = spawnBreacher(f);
    f.step(0.5);
    expect(b.state).toBe('behind');
    expect(b.hit(5, false)).toBe(false);
    expect(b.hp).toBe(8);
  });
});

describe('Breacher · door slam', () => {
  it('the off hand pushing the leaf toward the frame during KNOCK slams it: 5 damage, dizzy entrance, "Ow my whole face"', () => {
    const f = fakeWorld();
    const b = spawnBreacher(f);
    const door = f.room.doors[0];
    stepUntil(f, b, 'knock');
    f.step(0.3);
    // Leaf rests at 60°: hinge at x = -0.45, free edge near (0, 1, -1.72), 0.78 m in front of the real door.
    const edge = b.freeEdge(new Vector3());
    expect(edge.z - door.center.z).toBeGreaterThan(0.45);
    const hand = edge.clone().add(new Vector3(0.1, 0, 0.12));
    expect(b.distanceToLeaf(hand)).toBeLessThan(0.3);
    expect(b.clearanceFromRealDoor(hand)).toBeGreaterThan(0.25);
    f.off.set(hand, new Vector3(0, 0, -1.5)); // 1.5 m/s into the door (along -normal)
    const dt = 1 / 72;
    f.step(dt, undefined, dt);
    expect(b.state).toBe('slammed');
    expect(b.hp).toBe(3);
    expect(f.of('door:slammed')).toEqual([{ doorId: door.id }]);
    expect(f.of('wipe:slam')).toEqual([{ doorId: door.id }]);
    expect(b.avatar.root.visible).toBe(false);
    expect(b.hit(5, false)).toBe(false); // squashed behind the door, unreachable
    // Leaf snaps shut.
    f.step(0.3);
    expect(b.swing).toBeCloseTo(0, 2);
    expect(f.of('door:knock')).toHaveLength(1); // no more knocks after the slam
    // Two seconds later it stumbles in dizzy with the line, and the door is open.
    const tSlam = f.clock.t - 0.3 - dt;
    const tDizzy = stepUntil(f, b, 'dizzy', 3);
    expect(tDizzy - tSlam).toBeCloseTo(SLAMMED_SECONDS, 1);
    expect(b.avatar.root.visible).toBe(true);
    expect(f.voice.said.some((s) => s.speaker === 'breacher' && s.emotion === 'whine')).toBe(true);
    expect(f.doorOps).toEqual([{ id: door.id, open: true }]);
    expect(f.of('door:breached')).toHaveLength(1);
    expect(b.slammedEntrance).toBe(true);
    // Pops while dizzy after a slam carry the DOOR SLAM tag for the chapter's ×2.
    f.step(0.2);
    expect(b.hit(3, false)).toBe(true);
    f.step(0.2);
    const popped = f.of('enemy:popped');
    expect(popped).toHaveLength(1);
    expect(popped[0].style).toContain('DOOR SLAM');
    expect(b.alive).toBe(false);
    expect(f.w.world.children).not.toContain(b.leaf);
  });

  it('a grip held on the leaf for 0.2 s also slams; a brush of a held grip does not', () => {
    const f = fakeWorld();
    const b = spawnBreacher(f);
    stepUntil(f, b, 'knock');
    const hand = b.freeEdge(new Vector3()).add(new Vector3(0.05, 0, 0.1));
    f.off.squeeze = true;
    f.off.set(hand, new Vector3(0, 0, -0.2));
    const dt = 1 / 72;
    f.step(dt * 5, undefined, dt);
    expect(b.state).toBe('knock');
    f.step(0.3, undefined, dt);
    expect(b.state).toBe('slammed');
  });

  it('never registers a slam with the hand inside 0.25 m of the real door plane: it buzzes and asks for "stop"', () => {
    const f = fakeWorld();
    const b = spawnBreacher(f);
    const door = f.room.doors[0];
    stepUntil(f, b, 'knock');
    // Near the hinge, 0.2 m in front of the real door and touching the leaf.
    const hand = new Vector3(-0.3, 1.0, door.center.z + 0.2);
    expect(b.distanceToLeaf(hand)).toBeLessThan(0.3);
    f.off.set(hand, new Vector3(0, 0, -2));
    f.step(0.5);
    expect(b.state).not.toBe('slammed');
    expect(f.of('door:slammed')).toHaveLength(0);
    expect(f.off.pulses.some((p) => p.intensity === 0.5 && p.ms === 100)).toBe(true);
    expect(f.of('hint').some((h) => h.text === 'STOP')).toBe(true);
    // Only one STOP hint per second.
    expect(f.of('hint').filter((h) => h.text === 'STOP')).toHaveLength(1);
  });

  it('a hand far from the leaf, or moving away from the door, does nothing', () => {
    const f = fakeWorld();
    const b = spawnBreacher(f);
    stepUntil(f, b, 'knock');
    const edge = b.freeEdge(new Vector3());
    f.off.set(edge.clone().add(new Vector3(0, 0, 0.5)), new Vector3(0, 0, -3));
    f.step(0.3);
    expect(b.state).toBe('knock');
    f.off.set(edge.clone().add(new Vector3(0.1, 0, 0.1)), new Vector3(0, 0, 3)); // pulling it open, not shut
    f.step(0.3);
    expect(b.state).toBe('knock');
  });

  it('with no door given it picks the nearest open portal at spawn', () => {
    const f = fakeWorld();
    const b = new Breacher(f.w, stubAvatar(0.75));
    f.gremlins.push(b);
    b.spawnAt(new Vector3(0, 0, -2.2), new Vector3(0, 0, 1));
    expect(b.door?.id).toBe(f.room.doors[0].id);
  });
});
