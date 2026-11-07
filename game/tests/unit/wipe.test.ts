import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { Wipe, SLAP_KNOCKBACK_S, SWEEP_SECONDS, segmentHitsSphere } from '../../src/ai/Wipe';
import { Stinky } from '../../src/ai/Stinky';
import { Dummy, fakeWorld, stubAvatar } from './fake-world';

describe('Wipe · slap', () => {
  it('a fast hand through a body sphere deals 2, emits wipe:slap and shoves the target 1 m over 0.3 s', () => {
    const f = fakeWorld();
    const wipe = new Wipe(f.w);
    const g = new Dummy(f.w, stubAvatar(0.6));
    g.spawnAt(new Vector3(0, 0, -1.2), new Vector3(0, 0, 1));
    f.gremlins.push(g);
    // Frame 1: hand to the right of the goblin, swinging left at 3 m/s. Frame 2: it has passed just left of centre.
    f.off.set(new Vector3(0.5, 0.27, -1.2), new Vector3(-3, 0, 0));
    wipe.update(1 / 72);
    f.off.set(new Vector3(-0.1, 0.27, -1.2), new Vector3(-3, 0, 0));
    wipe.update(1 / 72);
    expect(g.hp).toBe(8);
    expect(wipe.slappedThisFrame).toContain(g);
    expect(f.of('wipe:slap')).toEqual([{ targetId: g.id }]);
    expect(f.voice.sfx).toContain('thwip');
    expect(f.off.pulses.length).toBeGreaterThan(0);
    // One swing, one slap: the hand lingering in the sphere does not hit again.
    f.off.set(new Vector3(-0.05, 0.27, -1.2), new Vector3(-3, 0, 0));
    wipe.update(1 / 72);
    expect(g.hp).toBe(8);
    // Knockback away from the hand (+x), 1 m over 0.3 s, then it stops.
    f.off.set(new Vector3(-2, 0.27, -1.2), new Vector3());
    const dt = 1 / 72;
    for (let t = 0; t < SLAP_KNOCKBACK_S / 2; t += dt) wipe.update(dt);
    expect(g.position.x).toBeGreaterThan(0.3);
    expect(g.position.x).toBeLessThan(0.7);
    for (let t = 0; t < 1; t += dt) wipe.update(dt);
    expect(g.position.x).toBeCloseTo(1.0, 1);
    expect(g.position.z).toBeCloseTo(-1.2, 3);
  });

  it('a slow hand never slaps, and nothing is shoved inside the 0.6 m player bubble', () => {
    const f = fakeWorld();
    const wipe = new Wipe(f.w);
    const g = new Dummy(f.w, stubAvatar(0.6));
    g.spawnAt(new Vector3(0, 0, -0.9), new Vector3(0, 0, 1));
    f.gremlins.push(g);
    f.off.set(new Vector3(0.3, 0.27, -0.9), new Vector3(-1, 0, 0));
    wipe.update(1 / 72);
    f.off.set(new Vector3(0, 0.27, -0.9), new Vector3(-1, 0, 0));
    wipe.update(1 / 72);
    expect(g.hp).toBe(10);
    expect(f.of('wipe:slap')).toHaveLength(0);
    // Now a real slap from behind the goblin (hand at z = -1.3), shoving it toward the player at the origin.
    f.off.set(new Vector3(0, 0.27, -1.4), new Vector3(0, 0, 4));
    wipe.update(1 / 72);
    f.off.set(new Vector3(0, 0.27, -0.95), new Vector3(0, 0, 4));
    wipe.update(1 / 72);
    expect(g.hp).toBe(8);
    f.off.set(new Vector3(2, 0.27, 2), new Vector3());
    for (let i = 0; i < 72; i++) wipe.update(1 / 72);
    expect(Math.hypot(g.position.x, g.position.z)).toBeGreaterThanOrEqual(0.6 - 1e-6);
  });

  it('segment-sphere test catches a fast hand that tunnels through the body in one frame', () => {
    const c = new Vector3(0, 0.27, -1);
    expect(segmentHitsSphere(new Vector3(-1, 0.27, -1), new Vector3(1, 0.27, -1), c, 0.22)).toBe(true);
    expect(segmentHitsSphere(new Vector3(-1, 0.27, -0.5), new Vector3(1, 0.27, -0.5), c, 0.22)).toBe(false);
    expect(segmentHitsSphere(c, c, c, 0.22)).toBe(true);
  });
});

describe('Wipe · sweep', () => {
  it('grip held and sweeping down over a demanding Stinky for 1.5 s cumulative changes its diaper', () => {
    const f = fakeWorld();
    const wipe = new Wipe(f.w);
    const s = new Stinky(f.w, stubAvatar(0.5));
    s.spawnAt(new Vector3(0, 0, -1.5), new Vector3(0, 0, 1));
    f.gremlins.push(s);
    s.setState('demand');
    expect(s.changeable).toBe(true);
    // Hand 0.2 m beside the body centre, grip held, sweeping down at 1 m/s.
    f.off.squeeze = true;
    f.off.set(new Vector3(0.2, 0.3, -1.5), new Vector3(0, -1, 0));
    const dt = 1 / 72;
    f.step(SWEEP_SECONDS / 2, () => wipe.update(dt), dt);
    expect(s.state).toBe('demand');
    expect(s.changeProgress).toBeGreaterThan(0.4);
    expect(s.changeProgress).toBeLessThan(0.6);
    expect(wipe.sweepingThisFrame).toBe(s);
    // Lifting the grip pauses progress (it bleeds slowly, it does not reset).
    f.off.squeeze = false;
    f.step(0.2, () => wipe.update(dt), dt);
    expect(s.state).toBe('demand');
    expect(s.changeProgress).toBeGreaterThan(0.3);
    f.off.squeeze = true;
    f.step(SWEEP_SECONDS, () => wipe.update(dt), dt);
    expect(s.state).toBe('changed');
    expect(f.of('diaper:changed')).toEqual([{ id: s.id }]);
    expect(wipe.changes).toBe(1);
    expect(f.voice.sfx).toContain('diaper_plap');
  });

  it('ignores upward or slow hands and hands without the grip', () => {
    const f = fakeWorld();
    const wipe = new Wipe(f.w);
    const s = new Stinky(f.w, stubAvatar(0.5));
    s.spawnAt(new Vector3(0, 0, -1.5), new Vector3(0, 0, 1));
    f.gremlins.push(s);
    s.setState('demand');
    const dt = 1 / 72;
    f.off.squeeze = false;
    f.off.set(new Vector3(0.1, 0.3, -1.5), new Vector3(0, -1, 0));
    f.step(2, () => wipe.update(dt), dt);
    expect(s.state).toBe('demand');
    f.off.squeeze = true;
    f.off.set(new Vector3(0.1, 0.3, -1.5), new Vector3(0, -0.3, 0));
    f.step(2, () => wipe.update(dt), dt);
    expect(s.state).toBe('demand');
    expect(s.changeProgress).toBe(0);
  });
});
