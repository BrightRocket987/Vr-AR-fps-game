import type { Vector3 } from 'three';
import type { RoomModel } from './RoomModel';

/**
 * Navigation contract. Gremlin.moveToward asks `next()` for the immediate waypoint toward a target;
 * a null answer means "go straight". The default implementation is straight-line with local
 * obstacle sliding (inside Gremlin); GridNav (A* over the floor polygon minus blockers) plugs in here.
 */
export interface Nav {
  /** Next waypoint on the way from `from` to `target` for an agent of `radius`, or null to go straight. */
  next(from: Vector3, target: Vector3, radius: number): Vector3 | null;
  /** A random walkable point within `radius` of `near`, or null if none. */
  randomPoint(near: Vector3, radius: number, agentRadius: number): Vector3 | null;
  /** Rebuild internal data after the room changes. */
  rebuild(room: RoomModel): void;
}
