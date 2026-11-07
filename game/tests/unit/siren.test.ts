import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { Siren } from '../../src/ai/Siren';
import { clock, makeWorld, record, step, stepUntil, StubAvatar } from './pack2-fakes';

function inhaling() {
  const w = makeWorld();
  const avatar = new StubAvatar(0.7);
  const siren = new Siren(w, avatar);
  w.living.push(siren);
  siren.spawnAt(new Vector3(0, 0, -2.8), new Vector3(0, 0, 1));
  const inhales = record(w.bus, 'siren:inhale');
  const screams = record(w.bus, 'siren:scream');
  const shushes = record(w.bus, 'siren:shushed');
  // Off hand well away from the Siren's head.
  w.off.position.set(-0.3, 1.1, -0.3);
  siren.setState('inhale');
  return { w, siren, avatar, inhales, screams, shushes };
}

describe('Siren', () => {
  it('inhales for 2.5 s (chest 1.0 -> 1.5), screams for 1.5 s with a 5 m ring, then is exhausted 3 s', () => {
    const { w, siren, avatar, inhales, screams } = inhaling();
    expect(inhales).toEqual([{ id: siren.id }]);
    expect(w.lines.at(-1)).toEqual({ speaker: 'siren', emotion: 'whine' });
    const c = clock(siren);
    c.to(1.25);
    expect(siren.state).toBe('inhale');
    expect(avatar.stretch).toBeCloseTo(1.25, 1);
    c.to(2.45);
    expect(siren.state).toBe('inhale');
    expect(avatar.stretch).toBeCloseTo(1.49, 1);
    expect(screams).toHaveLength(0);
    c.to(2.55);
    expect(siren.state).toBe('scream');
    expect(screams).toHaveLength(1);
    expect(screams[0]).toMatchObject({ id: siren.id, radius: 5 });
    expect(screams[0].position.distanceTo(siren.position)).toBeLessThan(1e-6);
    expect(w.sfx).toContain('scream_siren');
    expect(w.lines.at(-1)).toEqual({ speaker: 'siren', emotion: 'scream' });
    c.to(3.95);
    expect(siren.state).toBe('scream');
    c.to(4.1);
    expect(siren.state).toBe('exhausted');
    expect(avatar.plays.at(-1)).toBe('crouch');
    expect(avatar.stretch).toBe(1);
    c.to(6.9);
    expect(siren.state).toBe('exhausted');
    c.to(7.1);
    expect(siren.state).toBe('approach');
  });

  it('takes triple damage while exhausted', () => {
    const { siren } = inhaling();
    step(siren, 2.6 + 1.6);
    expect(siren.state).toBe('exhausted');
    expect(siren.hp).toBe(3);
    expect(siren.hit(1, false)).toBe(true); // 1 x 3 = 3 -> pop
  });

  it('is shushed by the off hand held at its head for a cumulative 1.0 s during the inhale', () => {
    const { w, siren, screams, shushes } = inhaling();
    const head = siren.headPosition();
    // 0.5 s of contact, a 0.3 s gap, then 0.5 s more: cumulative, not continuous.
    w.off.position.copy(head).add(new Vector3(0.1, 0, 0));
    step(siren, 0.5);
    expect(siren.shushProgress).toBeCloseTo(0.5, 1);
    expect(siren.state).toBe('inhale');
    expect(shushes).toHaveLength(0);
    w.off.position.set(-0.3, 1.1, -0.3);
    step(siren, 0.3);
    expect(siren.shushProgress).toBeCloseTo(0.5, 1);
    w.off.position.copy(head).add(new Vector3(0, 0.1, 0));
    step(siren, 0.55);
    expect(shushes).toEqual([{ id: siren.id }]);
    expect(siren.state).toBe('exhausted');
    step(siren, 3.5);
    expect(screams).toHaveLength(0);
    expect(w.fxCalls).toContain('text:SHH');
  });

  it('a touch shorter than 1 s does not stop the scream', () => {
    const { w, siren, screams, shushes } = inhaling();
    w.off.position.copy(siren.headPosition());
    step(siren, 0.9);
    w.off.position.set(-0.3, 1.1, -0.3);
    step(siren, 1.7);
    expect(shushes).toHaveLength(0);
    expect(screams).toHaveLength(1);
  });

  it('ignores a disconnected off hand and a hand farther than 0.15 m', () => {
    const { w, siren, shushes } = inhaling();
    w.off.position.copy(siren.headPosition()).add(new Vector3(0.2, 0, 0));
    step(siren, 1.2);
    expect(siren.shushProgress).toBe(0);
    w.off.position.copy(siren.headPosition());
    w.off.connected = false;
    step(siren, 1.2);
    expect(siren.shushProgress).toBe(0);
    expect(shushes).toHaveLength(0);
  });

  it('also accepts the empty off hand at the headset (the design-doc shush) within 3 m', () => {
    const { w, siren, shushes } = inhaling();
    w.off.position.copy(w.head).add(new Vector3(0.05, -0.05, 0.05));
    step(siren, 1.05);
    expect(shushes).toHaveLength(1);
  });

  it('popping it mid-inhale adds the SHUSHED style and text', () => {
    const { w, siren } = inhaling();
    const popped = record(w.bus, 'enemy:popped');
    step(siren, 1.0);
    expect(siren.hit(3, false)).toBe(true);
    step(siren, 0.2);
    expect(popped).toHaveLength(1);
    expect(popped[0].style).toContain('SHUSHED');
    expect(w.fxCalls).toContain('text:SHUSHED!');
    expect(w.fxCalls.filter((c) => c === 'text:A')).toHaveLength(3);
  });

  it('a non-lethal hit during the inhale is not SHUSHED', () => {
    const { w, siren } = inhaling();
    step(siren, 1.0);
    expect(siren.hit(1, false)).toBe(false);
    expect(w.fxCalls).not.toContain('text:SHUSHED!');
    expect(siren.state).toBe('inhale');
  });

  it('approaches to about 3 m and prefers to stand beside a table', () => {
    const w = makeWorld({ table: true, head: new Vector3(-2, 1.6, 0), forward: new Vector3(1, 0, 0) });
    const siren = new Siren(w, new StubAvatar(0.7));
    siren.spawnAt(new Vector3(2.5, 0, -2.5), new Vector3(0, 0, 1));
    const t = stepUntil(siren, () => siren.state === 'inhale', 20);
    expect(siren.state).toBe('inhale');
    expect(t).toBeLessThan(15);
    expect(siren.onTablePerch).toBe(true);
    const table = w.room.tables[0];
    expect(Math.hypot(siren.position.x - table.center.x, siren.position.z - table.center.z)).toBeLessThan(1.2);
    const d = Math.hypot(siren.position.x - w.head.x, siren.position.z - w.head.z);
    expect(d).toBeGreaterThan(1.5);
    expect(d).toBeLessThan(4.5);
  });

  it('with no furniture it stops on the way in at about 3 m', () => {
    const w = makeWorld({ head: new Vector3(0, 1.6, 0) });
    const siren = new Siren(w, new StubAvatar(0.7));
    siren.spawnAt(new Vector3(0, 0, 2.9), new Vector3(0, 0, -1));
    stepUntil(siren, () => siren.state === 'inhale', 20);
    expect(siren.state).toBe('inhale');
    const d = Math.hypot(siren.position.x, siren.position.z);
    expect(d).toBeGreaterThan(1.5);
    expect(d).toBeLessThan(4.5);
  });
});
