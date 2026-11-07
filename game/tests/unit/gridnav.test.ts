import { describe, expect, it } from 'vitest';
import { Vector2, Vector3 } from 'three';
import { RoomModel } from '../../src/room/RoomModel';
import { GridNav } from '../../src/room/GridNav';

function room(): RoomModel {
  const m = new RoomModel();
  m.bounds = [new Vector2(-3, -3), new Vector2(3, -3), new Vector2(3, 3), new Vector2(-3, 3)];
  // A long table across the middle with a gap on the right.
  m.addVolume('table', new Vector3(-1.0, 0.4, 0), new Vector3(4.2, 0.8, 0.8), 0, 'manual');
  m.addDoor(new Vector3(0, 1, -3), new Vector3(1, 0, 0), 0.9, 2, 'manual');
  return m;
}

describe('GridNav', () => {
  it('marks blockers unwalkable and the floor walkable', () => {
    const nav = new GridNav(0.1);
    nav.rebuild(room());
    expect(nav.isWalkable(-2, 2)).toBe(true);
    expect(nav.isWalkable(-1.0, 0)).toBe(false);
    expect(nav.size.cols).toBeGreaterThan(50);
  });

  it('routes around the table through the gap', () => {
    const nav = new GridNav(0.1);
    nav.rebuild(room());
    const p = nav.path(new Vector3(-2, 0, -2), new Vector3(-2, 0, 2));
    expect(p).not.toBeNull();
    const pts = p!;
    // Every waypoint must be walkable and the route must pass x > 1.0 (the gap) at some point.
    for (const w of pts) expect(nav.isWalkable(w.x, w.z)).toBe(true);
    expect(pts.some((w) => w.x > 1.0)).toBe(true);
    expect(pts[pts.length - 1].distanceTo(new Vector3(-2, 0, 2))).toBeLessThan(0.01);
  });

  it('returns a direct waypoint when the line is clear', () => {
    const nav = new GridNav(0.1);
    nav.rebuild(room());
    const n = nav.next(new Vector3(2, 0, -2), new Vector3(2, 0, 2), 0.2);
    expect(n).not.toBeNull();
    expect(n!.x).toBeCloseTo(2, 1);
    expect(n!.z).toBeCloseTo(2, 1);
  });

  it('treats the door threshold as walkable even outside the polygon', () => {
    const nav = new GridNav(0.1);
    nav.rebuild(room());
    expect(nav.isWalkable(0, -3.3)).toBe(true);
    const p = nav.path(new Vector3(0, 0, -3.3), new Vector3(0, 0, -1));
    expect(p).not.toBeNull();
  });
});
