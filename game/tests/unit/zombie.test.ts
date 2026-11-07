import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { BUMP_DAMAGE, PANIC_SECONDS, TABLET_HP, TabletZombie, ZOMBIE_HP, inDoorFrame, isFrontal, splitShieldDamage } from '../../src/ai/TabletZombie';
import { fakeWorld, stubAvatar, type FakeWorld } from './fake-world';

function spawnZombie(f: FakeWorld, at = new Vector3(0, 0, -1.8), facing = new Vector3(0, 0, 1), loiter = false): TabletZombie {
  const z = new TabletZombie(f.w, stubAvatar(0.6), { loiter });
  f.gremlins.push(z);
  z.spawnAt(at, facing);
  return z;
}

describe('Tablet Zombie · pure helpers', () => {
  it('a shot from within ±60° of where it faces is frontal', () => {
    const pos = new Vector3(0, 0, 0);
    const facing = new Vector3(0, 0, 1);
    expect(isFrontal(pos, facing, new Vector3(0, 1.6, 3))).toBe(true);
    expect(isFrontal(pos, facing, new Vector3(1.5, 1.6, 3))).toBe(true); // ~27°
    expect(isFrontal(pos, facing, new Vector3(3, 1.6, 0.5))).toBe(false); // ~80°: the side
    expect(isFrontal(pos, facing, new Vector3(0, 1.6, -3))).toBe(false); // behind
  });

  it('the tablet absorbs up to its HP; the rest carries through to the body', () => {
    expect(splitShieldDamage(1, 3)).toEqual({ tablet: 1, body: 0 });
    expect(splitShieldDamage(6, 3)).toEqual({ tablet: 3, body: 3 });
    expect(splitShieldDamage(2, 0)).toEqual({ tablet: 0, body: 2 });
  });

  it('knows when it stands in a door frame', () => {
    const door = { center: new Vector3(0, 1, -2.5), normal: new Vector3(0, 0, 1), width: 0.9 };
    expect(inDoorFrame(new Vector3(0, 0, -2.2), door)).toBe(true);
    expect(inDoorFrame(new Vector3(0.3, 0, -2.4), door)).toBe(true);
    expect(inDoorFrame(new Vector3(0, 0, -1.5), door)).toBe(false); // 1 m into the room
    expect(inDoorFrame(new Vector3(0.8, 0, -2.3), door)).toBe(false); // beside the frame
  });
});

describe('Tablet Zombie · behaviour', () => {
  it('frontal shots spark off the tablet (BLOCK) until it breaks, then it panics', () => {
    const f = fakeWorld();
    const z = spawnZombie(f);
    for (let i = 0; i < TABLET_HP - 1; i++) expect(z.hit(1, false)).toBe(false);
    expect(z.hp).toBe(ZOMBIE_HP);
    expect(z.tabletHp).toBe(1);
    expect(f.fx.text).toHaveBeenCalledWith(expect.any(Vector3), 'BLOCK', '#9ad5ff');
    z.hit(1, true); // a frontal headshot still hits the tablet
    expect(z.tabletHp).toBe(0);
    expect(z.hp).toBe(ZOMBIE_HP);
    expect(z.state).toBe('panic');
    expect(f.voice.said).toContainEqual({ speaker: 'zombie', emotion: 'scream' }); // "My tablet broke!"
  });

  it('side shots bypass the tablet; panic doubles damage; then it chases', () => {
    const f = fakeWorld();
    const z = spawnZombie(f, new Vector3(0, 0, -1.8), new Vector3(1, 0, 0));
    z.hit(1, false);
    expect(z.tabletHp).toBe(TABLET_HP);
    expect(z.hp).toBe(ZOMBIE_HP - 1);
    // Break the tablet from the front, then a panicking body hit counts double.
    const g = spawnZombie(f);
    g.hit(TABLET_HP, false);
    expect(g.state).toBe('panic');
    g.hit(1, false);
    expect(g.hp).toBe(ZOMBIE_HP - 2);
    f.step(PANIC_SECONDS + 0.1);
    expect(g.state === 'chase' || g.state === 'bump').toBe(true);
  });

  it('a big frontal hit breaks the tablet and the overflow pops it (debug shot)', () => {
    const f = fakeWorld();
    const z = spawnZombie(f);
    expect(z.hit(99, false)).toBe(true);
    f.step(0.3);
    expect(z.alive).toBe(false);
    expect(f.of('enemy:popped')[0].type).toBe('zombie');
  });

  it('shuffles at 0.5 m/s and bumps politely for 2 damage a second', () => {
    const f = fakeWorld();
    const z = spawnZombie(f, new Vector3(0, 0, -2.2));
    const start = z.position.z;
    f.step(2);
    const moved = z.position.z - start;
    expect(moved).toBeGreaterThan(0.6);
    expect(moved).toBeLessThan(1.15);
    let t = 0;
    while (z.state !== 'bump' && t < 10) {
      f.step(0.1);
      t += 0.1;
    }
    expect(z.state).toBe('bump');
    expect(Math.hypot(z.position.x, z.position.z)).toBeGreaterThanOrEqual(0.6 - 1e-6);
    f.step(3.05);
    const bumps = f.player.damage.filter((d) => d.source === 'zombie');
    expect(bumps.length).toBeGreaterThanOrEqual(3);
    expect(bumps.length).toBeLessThanOrEqual(4);
    expect(bumps.every((d) => d.amount === BUMP_DAMAGE)).toBe(true);
    expect(f.voice.said.some((s) => s.speaker === 'zombie' && s.emotion === 'monotone')).toBe(true); // "'scuse me."
  });

  it('standing in a door frame it keeps that portal open', () => {
    const f = fakeWorld();
    f.w.openDoors = () => []; // somebody closed every portal
    const z = spawnZombie(f, new Vector3(0, 0, -2.3), new Vector3(0, 0, 1), true);
    f.step(0.5);
    expect(z.holdingDoorId).toBe('virtual-door');
    expect(f.doorOps).toContainEqual({ id: 'virtual-door', open: true });
    expect(z.state).toBe('loiter');
    f.step(4.5);
    expect(z.state).not.toBe('loiter');
    expect(z.holdingDoorId).toBeNull();
  });
});
