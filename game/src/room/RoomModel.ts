import { Vector2, Vector3 } from 'three';

/** One real door (or a hand-placed proxy). `normal` points INTO the room. */
export interface Door {
  id: string;
  center: Vector3; // centre of the door rectangle (world, metres)
  normal: Vector3; // unit, horizontal, pointing into the room
  right: Vector3; // unit, along the door width
  width: number;
  height: number;
  kidsRoom: boolean; // the one door that is never a portal
  source: 'scene' | 'manual' | 'virtual';
}

/** A labelled box in the room (couch, table, storage, wall segment, window...). */
export interface Volume {
  id: string;
  label: string;
  center: Vector3; // world
  size: Vector3; // full extents (x along `yaw` right axis, y up, z depth)
  yaw: number; // rotation about Y in radians
  source: 'scene' | 'manual' | 'virtual';
}

/** A spot a gremlin can sit on: feet-origin position on the seat top, facing out. */
export interface Seat {
  id: string;
  position: Vector3;
  facing: Vector3;
  volumeId: string;
}

export type RoomSource = 'scene' | 'manual' | 'mixed' | 'virtual';

export interface RoomModelJSON {
  floorY: number;
  bounds: [number, number][];
  doors: Array<{ id: string; center: number[]; normal: number[]; width: number; height: number; kidsRoom: boolean; source: Door['source'] }>;
  volumes: Array<{ id: string; label: string; center: number[]; size: number[]; yaw: number; source: Volume['source'] }>;
  source: RoomSource;
}

const UP = new Vector3(0, 1, 0);

/**
 * One normalised description of the play space, whatever produced it (Scene API planes/meshes, the
 * Blueprint hand-placement tool, or the virtual fallback room). Everything in chapter 3 reads this.
 */
export class RoomModel {
  floorY = 0;
  /** Floor polygon in XZ (world). Closed implicitly. */
  bounds: Vector2[] = [];
  doors: Door[] = [];
  volumes: Volume[] = [];
  source: RoomSource = 'virtual';

  get couches(): Volume[] {
    return this.volumes.filter((v) => v.label === 'couch' || v.label === 'bed');
  }
  get tables(): Volume[] {
    return this.volumes.filter((v) => v.label === 'table' || v.label === 'desk');
  }
  get walls(): Volume[] {
    return this.volumes.filter((v) => v.label === 'wall');
  }
  get windows(): Volume[] {
    return this.volumes.filter((v) => v.label === 'window');
  }
  /** Things gremlins must path around (everything that is not floor/wall/window/door). */
  get blockers(): Volume[] {
    return this.volumes.filter((v) => !['wall', 'window', 'floor', 'ceiling', 'door', 'wall art'].includes(v.label));
  }

  /** Doors that may become portals. */
  get portalDoors(): Door[] {
    return this.doors.filter((d) => !d.kidsRoom);
  }

  /** Centroid of the floor polygon (or origin). */
  center(): Vector3 {
    if (this.bounds.length === 0) return new Vector3(0, this.floorY, 0);
    const c = new Vector2();
    for (const p of this.bounds) c.add(p);
    c.divideScalar(this.bounds.length);
    return new Vector3(c.x, this.floorY, c.y);
  }

  /** Approximate walkable area in m² (shoelace on the bounds). */
  area(): number {
    const b = this.bounds;
    if (b.length < 3) return 0;
    let a = 0;
    for (let i = 0; i < b.length; i++) {
      const p = b[i];
      const q = b[(i + 1) % b.length];
      a += p.x * q.y - q.x * p.y;
    }
    return Math.abs(a) / 2;
  }

  sizeClass(): 'small' | 'medium' | 'large' {
    const a = this.area();
    if (a < 6) return 'small';
    if (a <= 15) return 'medium';
    return 'large';
  }

  /** Point-in-polygon test on the floor bounds (XZ). True when there are no bounds. */
  contains(x: number, z: number): boolean {
    const b = this.bounds;
    if (b.length < 3) return true;
    let inside = false;
    for (let i = 0, j = b.length - 1; i < b.length; j = i++) {
      const xi = b[i].x, zi = b[i].y, xj = b[j].x, zj = b[j].y;
      const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /** Is the point inside any blocker volume footprint (with margin)? */
  blockedAt(x: number, z: number, margin = 0.1): Volume | null {
    for (const v of this.blockers) {
      const dx = x - v.center.x, dz = z - v.center.z;
      const c = Math.cos(-v.yaw), s = Math.sin(-v.yaw);
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) <= v.size.x / 2 + margin && Math.abs(lz) <= v.size.z / 2 + margin) return v;
    }
    return null;
  }

  /** Seat slots: one per 0.6 m along the front edge of every couch, on its top surface. */
  seats(): Seat[] {
    const out: Seat[] = [];
    const roomCenter = this.center();
    for (const v of this.couches) {
      const right = new Vector3(Math.cos(v.yaw), 0, -Math.sin(v.yaw));
      const fwd = new Vector3().crossVectors(UP, right).normalize(); // local +z direction (depth axis)
      // Front edge faces the room centre.
      const toCenter = roomCenter.clone().sub(v.center).setY(0);
      if (toCenter.dot(fwd) < 0) fwd.negate();
      const slots = Math.max(1, Math.floor(v.size.x / 0.6));
      const top = v.center.y + v.size.y / 2;
      for (let i = 0; i < slots; i++) {
        const t = slots === 1 ? 0 : (i / (slots - 1) - 0.5) * (v.size.x - 0.5);
        const p = v.center.clone().add(right.clone().multiplyScalar(t)).add(fwd.clone().multiplyScalar(v.size.z * 0.15));
        p.y = top;
        out.push({ id: `${v.id}:seat${i}`, position: p, facing: fwd.clone(), volumeId: v.id });
      }
    }
    return out;
  }

  /** Door frame bottom-centre on the floor. */
  doorFloorPoint(d: Door): Vector3 {
    return new Vector3(d.center.x, this.floorY, d.center.z);
  }

  /** Pick the largest non-kids door, or null. */
  largestDoor(): Door | null {
    const ds = this.portalDoors;
    if (ds.length === 0) return null;
    return ds.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b));
  }

  /** Orient every door's normal toward the room centre (or a reference point). */
  orientDoors(reference?: Vector3): void {
    const ref = reference ?? this.center();
    for (const d of this.doors) {
      const toRef = ref.clone().sub(d.center).setY(0);
      if (toRef.dot(d.normal) < 0) {
        d.normal.negate();
        d.right.negate();
      }
    }
  }

  toJSON(): RoomModelJSON {
    return {
      floorY: this.floorY,
      bounds: this.bounds.map((p) => [p.x, p.y]),
      doors: this.doors.map((d) => ({ id: d.id, center: d.center.toArray(), normal: d.normal.toArray(), width: d.width, height: d.height, kidsRoom: d.kidsRoom, source: d.source })),
      volumes: this.volumes.map((v) => ({ id: v.id, label: v.label, center: v.center.toArray(), size: v.size.toArray(), yaw: v.yaw, source: v.source })),
      source: this.source,
    };
  }

  static fromJSON(j: RoomModelJSON): RoomModel {
    const m = new RoomModel();
    m.floorY = j.floorY;
    m.bounds = j.bounds.map(([x, z]) => new Vector2(x, z));
    m.doors = j.doors.map((d) => {
      const normal = new Vector3().fromArray(d.normal).setY(0).normalize();
      return { id: d.id, center: new Vector3().fromArray(d.center), normal, right: new Vector3().crossVectors(normal, UP).normalize(), width: d.width, height: d.height, kidsRoom: d.kidsRoom, source: d.source };
    });
    m.volumes = j.volumes.map((v) => ({ id: v.id, label: v.label, center: new Vector3().fromArray(v.center), size: new Vector3().fromArray(v.size), yaw: v.yaw, source: v.source }));
    m.source = j.source;
    return m;
  }

  /**
   * The fallback room when nothing is known: a 4 x 4 m floor around `origin` with one virtual door
   * 2.5 m ahead along `forward`. Chapter 3 is complete at this minimum.
   */
  static virtual(origin: Vector3, forward: Vector3): RoomModel {
    const m = new RoomModel();
    m.source = 'virtual';
    m.floorY = 0;
    const f = forward.clone().setY(0).normalize();
    if (f.lengthSq() < 1e-6) f.set(0, 0, -1);
    const half = 2.2;
    m.bounds = [new Vector2(origin.x - half, origin.z - half), new Vector2(origin.x + half, origin.z - half), new Vector2(origin.x + half, origin.z + half), new Vector2(origin.x - half, origin.z + half)];
    const center = origin.clone().setY(1.0).add(f.clone().multiplyScalar(2.5));
    const normal = f.clone().negate();
    m.doors = [{ id: 'virtual-door', center, normal, right: new Vector3().crossVectors(normal, UP).normalize(), width: 0.9, height: 2.0, kidsRoom: false, source: 'virtual' }];
    return m;
  }

  /** Append a door (used by Blueprint and door painting). Normal is oriented toward the room centre afterwards. */
  addDoor(center: Vector3, right: Vector3, width: number, height: number, source: Door['source'], kidsRoom = false): Door {
    const r = right.clone().setY(0).normalize();
    const normal = new Vector3().crossVectors(UP, r).normalize();
    const d: Door = { id: `door-${this.doors.length + 1}-${source}`, center: center.clone(), normal, right: r, width, height, kidsRoom, source };
    this.doors.push(d);
    this.orientDoors();
    return d;
  }

  addVolume(label: string, center: Vector3, size: Vector3, yaw: number, source: Volume['source']): Volume {
    const v: Volume = { id: `${label}-${this.volumes.length + 1}-${source}`, label, center: center.clone(), size: size.clone(), yaw, source };
    this.volumes.push(v);
    return v;
  }
}
