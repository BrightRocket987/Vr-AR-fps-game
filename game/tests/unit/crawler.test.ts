import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { BITE_DAMAGE, BITE_RANGE, CRAWLER_REAR_SPEED, Crawler, hidingSpots, inFront } from '../../src/ai/Crawler';
import { fakeWorld, stubAvatar, type FakeWorld } from './fake-world';

function withTable(f: FakeWorld): void {
  f.room.addVolume('table', new Vector3(1.0, 0.37, -1.0), new Vector3(1.0, 0.74, 0.6), 0, 'manual');
}

function spawnCrawler(f: FakeWorld, at = new Vector3(0, 0, -2.0)): Crawler {
  const c = new Crawler(f.w, stubAvatar(0.35));
  f.gremlins.push(c);
  c.spawnAt(at, new Vector3(0, 0, 1));
  return c;
}

function stepUntil(f: FakeWorld, c: Crawler, state: string, max = 20): void {
  const start = f.clock.t;
  while (c.state !== state && c.alive && f.clock.t - start < max) f.step(1 / 72, undefined, 1 / 72);
  expect(c.state).toBe(state);
}

describe('Crawler · hiding spots', () => {
  it('hides under a table from the side away from the player, in open floor', () => {
    const f = fakeWorld();
    withTable(f);
    const spots = hidingSpots(f.room, f.player.pos);
    expect(spots.length).toBeGreaterThan(0);
    const s = spots[0];
    expect(s.under).not.toBeNull();
    expect(s.under?.x).toBeCloseTo(1.0, 5);
    expect(f.room.contains(s.edge.x, s.edge.z)).toBe(true);
    expect(f.room.blockedAt(s.edge.x, s.edge.z, 0.18)).toBeNull();
    // Farther from the player than the table centre: it is behind the table.
    expect(Math.hypot(s.edge.x, s.edge.z)).toBeGreaterThan(Math.hypot(1.0, -1.0));
  });

  it('with no furniture it uses the room corners farthest from the player', () => {
    const f = fakeWorld();
    const spots = hidingSpots(f.room, new Vector3(1.5, 1.6, 1.5));
    expect(spots.length).toBe(4);
    for (const s of spots) expect(f.room.contains(s.edge.x, s.edge.z)).toBe(true);
    // Best spot is the corner opposite the player.
    expect(spots[0].edge.x).toBeLessThan(0);
    expect(spots[0].edge.z).toBeLessThan(0);
  });

  it('knows the player front from the back', () => {
    const p = new Vector3(0, 1.6, 0);
    const fwd = new Vector3(0, 0, -1);
    expect(inFront(p, fwd, new Vector3(0, 0, -2))).toBe(true);
    expect(inFront(p, fwd, new Vector3(0, 0, 2))).toBe(false);
  });
});

describe('Crawler · behaviour', () => {
  it('sneaks to the table, tucks under, peeks, comes out into open floor and bites the ankle', () => {
    const f = fakeWorld();
    withTable(f);
    const c = spawnCrawler(f);
    stepUntil(f, c, 'hide', 12);
    // Under the table (inside its footprint) while hiding.
    expect(f.room.blockedAt(c.position.x, c.position.z, 0)).not.toBeNull();
    expect(f.voice.said).toContainEqual({ speaker: 'crawler', emotion: 'giggle' });
    stepUntil(f, c, 'scuttle', 8);
    // It attacks only from open floor: out of the footprint when it starts the run.
    expect(f.room.blockedAt(c.position.x, c.position.z, 0.05)).toBeNull();
    stepUntil(f, c, 'bite', 8);
    expect(Math.hypot(c.position.x, c.position.z)).toBeLessThanOrEqual(BITE_RANGE + 0.01);
    f.step(0.3);
    expect(f.player.damage).toContainEqual({ amount: BITE_DAMAGE, source: 'crawler' });
    stepUntil(f, c, 'retreat', 3);
    expect(c.hideSpot).not.toBeNull();
  });

  it('never approaches from behind faster than 1 m/s', () => {
    const f = fakeWorld();
    const c = spawnCrawler(f, new Vector3(0, 0, 2.0)); // behind the player (who faces -z)
    stepUntil(f, c, 'scuttle', 15);
    const max = { v: 0 };
    let last = c.position.clone();
    const dt = 1 / 72;
    for (let i = 0; i < 72 && c.state === 'scuttle'; i++) {
      f.step(dt, undefined, dt);
      const behind = c.position.z > 0;
      if (behind) max.v = Math.max(max.v, c.position.distanceTo(last) / dt);
      last = c.position.clone();
    }
    expect(max.v).toBeLessThanOrEqual(CRAWLER_REAR_SPEED + 1e-6);
  });

  it('a non-lethal hit makes it whine, two pop it', () => {
    const f = fakeWorld();
    const c = spawnCrawler(f);
    expect(c.hit(1, false)).toBe(false);
    expect(f.voice.said).toContainEqual({ speaker: 'crawler', emotion: 'whine' });
    expect(c.hit(1, false)).toBe(true);
  });
});
