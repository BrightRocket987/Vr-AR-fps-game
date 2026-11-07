import { beforeEach, describe, expect, it } from 'vitest';
import { Mesh, Vector2, Vector3 } from 'three';
import { RoomModel } from '../../src/room/RoomModel';
import {
  applyPlayMaterials,
  applyScale,
  cursorPoint,
  cycleTool,
  ensureBoundsContain,
  ensureUniqueId,
  facingFrame,
  floorHit,
  footprintDistance,
  isRoomModelJSON,
  loadSavedRoom,
  markKidsRoom,
  nearestPick,
  placeDoor,
  placeFurniture,
  placeWall,
  placeWindow,
  removePick,
  rotatePick,
  saveRoom,
  scaleFactorOf,
  stepScaleFactor,
  StickStepper,
  TOOL_SIZES,
  TOOLS,
  toolFrame,
  wallFrame,
  yawOfRight,
} from '../../src/room/Blueprint';

// A tiny in-memory localStorage so Save works in node (Save wraps every access in try/catch anyway).
const store = new Map<string, string>();
const memoryStorage = {
  getItem: (k: string): string | null => store.get(k) ?? null,
  setItem: (k: string, v: string): void => {
    store.set(k, String(v));
  },
  removeItem: (k: string): void => {
    store.delete(k);
  },
  clear: (): void => store.clear(),
  key: (i: number): string | null => Array.from(store.keys())[i] ?? null,
  get length(): number {
    return store.size;
  },
};
Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true, writable: true });

// Save is imported after the mock is installed (ESM hoists imports, but Save.load only runs in the constructor).
import { Save } from '../../src/core/Save';

const HEAD = new Vector3(0, 1.6, 0);

function squareRoom(half = 3): RoomModel {
  const m = new RoomModel();
  m.source = 'manual';
  m.bounds = [new Vector2(-half, -half), new Vector2(half, -half), new Vector2(half, half), new Vector2(-half, half)];
  return m;
}

describe('Blueprint pointing', () => {
  it('floorHit intersects a downward ray with the floor plane', () => {
    const origin = new Vector3(0, 1.2, 0);
    const dir = new Vector3(0, -1, -1).normalize();
    const hit = floorHit(origin, dir, 0);
    expect(hit).not.toBeNull();
    expect(hit!.y).toBeCloseTo(0, 6);
    expect(hit!.z).toBeCloseTo(-1.2, 6);
    expect(hit!.x).toBeCloseTo(0, 6);
  });

  it('floorHit respects the floor height and the 8 m limit', () => {
    const origin = new Vector3(0, 1.0, 0);
    const shallow = new Vector3(0, -0.05, -1).normalize(); // hits ~20 m away
    expect(floorHit(origin, shallow, -0.2)).toBeNull();
    expect(floorHit(origin, new Vector3(0, 0.1, -1).normalize(), 0)).toBeNull(); // pointing up
    const hit = floorHit(origin, new Vector3(0, -1, 0), -0.3);
    expect(hit!.y).toBeCloseTo(-0.3, 6);
  });

  it('cursorPoint falls back to 1 m ahead on the floor when the ray misses', () => {
    const out = new Vector3();
    const origin = new Vector3(1, 1.0, 1);
    const level = new Vector3(0, 0, -1);
    expect(cursorPoint(origin, level, 0, out)).toBe(false);
    expect(out.x).toBeCloseTo(1, 6);
    expect(out.y).toBeCloseTo(0, 6);
    expect(out.z).toBeCloseTo(0, 6);
    const down = new Vector3(0, -1, -1).normalize();
    expect(cursorPoint(origin, down, 0, out)).toBe(true);
    expect(out.z).toBeCloseTo(0, 6);
  });
});

describe('Blueprint tool cycling', () => {
  it('wraps both ways over the seven tools', () => {
    expect(TOOLS).toEqual(['door', 'couch', 'table', 'wall', 'window', 'kids', 'delete']);
    expect(cycleTool(0, 1)).toBe(1);
    expect(cycleTool(6, 1)).toBe(0);
    expect(cycleTool(0, -1)).toBe(6);
    expect(cycleTool(3, -10)).toBe(cycleTool(3, 4));
  });

  it('StickStepper fires once per flick and re-arms at centre', () => {
    const s = new StickStepper(0.6, 0.3, 0);
    expect(s.step(0.9, 1 / 72)).toBe(1);
    expect(s.step(0.9, 1 / 72)).toBe(0); // held: no repeat
    expect(s.step(1.0, 2)).toBe(0); // even after a long hold
    expect(s.step(0.4, 1 / 72)).toBe(0); // between release and threshold: nothing
    expect(s.step(0.0, 1 / 72)).toBe(0); // centre re-arms
    expect(s.step(-0.8, 1 / 72)).toBe(-1);
  });

  it('StickStepper auto-repeats when asked', () => {
    const s = new StickStepper(0.6, 0.3, 0.25);
    expect(s.step(-1, 0.01)).toBe(-1);
    expect(s.step(-1, 0.1)).toBe(0);
    expect(s.step(-1, 0.2)).toBe(-1); // 0.3 s held
    expect(s.step(-1, 0.1)).toBe(0);
  });
});

describe('Blueprint placement', () => {
  let room: RoomModel;
  beforeEach(() => {
    room = squareRoom();
  });

  it('facingFrame yields a horizontal normal toward the head and a consistent right axis', () => {
    const f = facingFrame(new Vector3(0, 0, -2), HEAD);
    expect(f.normal.x).toBeCloseTo(0, 6);
    expect(f.normal.y).toBe(0);
    expect(f.normal.z).toBeCloseTo(1, 6);
    // right = cross(normal, UP), the RoomModel.fromJSON convention: for a normal of +z that is -x.
    expect(f.right.x).toBeCloseTo(-1, 6);
    expect(f.right.z).toBeCloseTo(0, 6);
    expect(f.right.dot(f.normal)).toBeCloseTo(0, 9);
    expect(f.yaw).toBeCloseTo(yawOfRight(f.right), 9);
    expect(Math.cos(f.yaw)).toBeCloseTo(f.right.x, 9);
    expect(-Math.sin(f.yaw)).toBeCloseTo(f.right.z, 9);
    // Degenerate: the point under the head still gets a frame.
    const g = facingFrame(new Vector3(0, 0, 0), HEAD);
    expect(g.normal.length()).toBeCloseTo(1, 6);
  });

  it('places a door standing on the floor, facing the player, replacing the virtual door', () => {
    const virtual = RoomModel.virtual(HEAD, new Vector3(0, 0, -1));
    const point = new Vector3(0, 0, -2.5);
    const d = placeDoor(virtual, point, HEAD);
    expect(virtual.doors).toHaveLength(1);
    expect(d.source).toBe('manual');
    expect(d.center.y).toBeCloseTo(1.0, 6);
    expect(d.width).toBe(0.9);
    expect(d.height).toBe(2.0);
    expect(d.normal.z).toBeGreaterThan(0.99); // toward the player
    expect(virtual.source).toBe('manual');
  });

  it('places couch / table / window with the designed sizes and heights', () => {
    const couch = placeFurniture(room, 'couch', new Vector3(0, 0, -2), HEAD);
    expect(couch.size.toArray()).toEqual([1.8, 0.8, 0.9]);
    expect(couch.center.y).toBeCloseTo(0.4, 6);
    const table = placeFurniture(room, 'table', new Vector3(1, 0, -1), HEAD);
    expect(table.size.toArray()).toEqual([1.2, 0.75, 0.8]);
    expect(table.center.y).toBeCloseTo(0.375, 6);
    const win = placeWindow(room, new Vector3(-1, 0, -2.5), HEAD);
    expect(win.size.toArray()).toEqual([1.2, 1.2, 0.06]);
    expect(win.center.y).toBeCloseTo(1.6, 6); // sill at 1.0 m
    expect(room.seats()).toHaveLength(3); // the couch seats three
    // A table rotated to face the player at (1,0,-1) has yaw != 0.
    expect(Math.abs(table.yaw)).toBeGreaterThan(0.1);
  });

  it('builds a 2.4 m wall between two floor points and refuses short ones', () => {
    const a = new Vector3(-1, 0, -2), b = new Vector3(1, 0, -2);
    const f = wallFrame(a, b, 0);
    expect(f.size.x).toBeCloseTo(2, 6);
    expect(f.size.y).toBe(2.4);
    expect(f.center.y).toBeCloseTo(1.2, 6);
    expect(f.center.x).toBeCloseTo(0, 6);
    expect(f.yaw).toBeCloseTo(0, 6);
    const w = placeWall(room, a, b);
    expect(w).not.toBeNull();
    expect(w!.label).toBe('wall');
    expect(room.walls).toHaveLength(1);
    expect(placeWall(room, a, new Vector3(-0.9, 0, -2))).toBeNull();
    // Diagonal wall: yaw follows the segment direction (right axis = (cos yaw, 0, -sin yaw)).
    const diag = wallFrame(new Vector3(0, 0, 0), new Vector3(1, 0, -1), 0);
    expect(Math.cos(diag.yaw)).toBeCloseTo(Math.SQRT1_2, 6);
    expect(-Math.sin(diag.yaw)).toBeCloseTo(-Math.SQRT1_2, 6);
  });

  it('toolFrame previews each placing tool and nothing for kids/delete', () => {
    const p = new Vector3(0, 0, -2);
    expect(toolFrame('door', p, HEAD, null, 0)!.center.y).toBeCloseTo(1.0, 6);
    expect(toolFrame('couch', p, HEAD, null, 0)!.size.y).toBe(TOOL_SIZES.couch.y);
    expect(toolFrame('window', p, HEAD, null, 0)!.center.y).toBeCloseTo(1.6, 6);
    expect(toolFrame('wall', p, HEAD, null, 0)!.size.x).toBeCloseTo(0.1, 6);
    expect(toolFrame('wall', p, HEAD, new Vector3(-2, 0, -2), 0)!.size.x).toBeCloseTo(2, 6);
    expect(toolFrame('kids', p, HEAD, null, 0)).toBeNull();
    expect(toolFrame('delete', p, HEAD, null, 0)).toBeNull();
  });

  it('marks exactly one kids-room door and the portal set follows', () => {
    const d1 = placeDoor(room, new Vector3(0, 0, -3), HEAD);
    const d2 = placeDoor(room, new Vector3(3, 0, 0), HEAD);
    markKidsRoom(room, d1);
    expect(d1.kidsRoom).toBe(true);
    expect(room.portalDoors).toEqual([d2]);
    markKidsRoom(room, d2);
    expect(d1.kidsRoom).toBe(false);
    expect(d2.kidsRoom).toBe(true);
  });

  it('extends the bounds when something is placed outside them', () => {
    const changed = ensureBoundsContain(room, [new Vector3(5, 0, 0)]);
    expect(changed).toBe(true);
    expect(room.contains(5, 0)).toBe(true);
    expect(room.contains(0, 0)).toBe(true);
    expect(ensureBoundsContain(room, [new Vector3(0, 0, 0)])).toBe(false);
    const empty = new RoomModel();
    expect(ensureBoundsContain(empty, [new Vector3(1, 0, 1)])).toBe(true);
    expect(empty.bounds).toHaveLength(4);
  });

  it('keeps ids unique after a delete', () => {
    const a = room.addVolume('couch', new Vector3(), new Vector3(1, 1, 1), 0, 'manual');
    const b = room.addVolume('couch', new Vector3(), new Vector3(1, 1, 1), 0, 'manual');
    removePick(room, { kind: 'volume', volume: a });
    const c = room.addVolume('couch', new Vector3(), new Vector3(1, 1, 1), 0, 'manual');
    expect(c.id).toBe(b.id); // RoomModel's counter collides...
    ensureUniqueId(room, c);
    expect(c.id).not.toBe(b.id); // ...and Blueprint fixes it.
  });
});

describe('Blueprint picking and editing', () => {
  it('footprintDistance is 0 inside a rotated box and grows outside', () => {
    const c = new Vector3(0, 0, 0), s = new Vector3(2, 1, 0.5);
    expect(footprintDistance(0.9, 0, c, s, 0)).toBe(0);
    expect(footprintDistance(1.5, 0, c, s, 0)).toBeCloseTo(0.5, 6);
    expect(footprintDistance(0, 0.75, c, s, 0)).toBeCloseTo(0.5, 6);
    // Rotate 90 degrees: the long side now runs along -z (right axis = (0,0,-1)).
    const yaw = Math.PI / 2;
    expect(footprintDistance(0, 0.9, c, s, yaw)).toBe(0);
    expect(footprintDistance(0.9, 0, c, s, yaw)).toBeCloseTo(0.65, 6);
    // 45 degrees: a point along the right axis stays inside.
    const yaw45 = Math.PI / 4;
    const px = 0.9 * Math.cos(yaw45), pz = -0.9 * Math.sin(yaw45);
    expect(footprintDistance(px, pz, c, s, yaw45)).toBe(0);
  });

  it('nearestPick finds the closest object within 0.6 m and honours a filter', () => {
    const room = squareRoom();
    const door = placeDoor(room, new Vector3(0, 0, -3), HEAD);
    const couch = placeFurniture(room, 'couch', new Vector3(2, 0, 0), HEAD);
    const near = nearestPick(room, 2.3, 0, 0.6);
    expect(near?.kind).toBe('volume');
    expect(near && near.kind === 'volume' ? near.volume : null).toBe(couch);
    expect(nearestPick(room, 0, -2.6, 0.6)?.kind).toBe('door');
    expect(nearestPick(room, -2.5, 2.5, 0.6)).toBeNull();
    // A thin wall inside the couch footprint wins the tie (smaller footprint).
    const wall = placeWall(room, new Vector3(1.5, 0, -0.3), new Vector3(2.5, 0, -0.3))!;
    const inside = nearestPick(room, 2, -0.3, 0.6);
    expect(inside && inside.kind === 'volume' ? inside.volume : null).toBe(wall);
    expect(nearestPick(room, 2, 0.3, 0.6)?.kind === 'volume' && (nearestPick(room, 2, 0.3, 0.6) as { volume: { label: string } }).volume.label).toBe('couch');
    const onlyDoors = nearestPick(room, 2.3, 0, 0.6, (p) => p.kind === 'door');
    expect(onlyDoors).toBeNull();
    expect(nearestPick(room, 0, -2.6, 0.6, (p) => p.kind === 'door' && p.door === door)).not.toBeNull();
  });

  it('scales in 1.1x steps clamped to 0.5x..2x, keeping the bottom on the floor', () => {
    const room = squareRoom();
    const couch = placeFurniture(room, 'couch', new Vector3(0, 0, -2), HEAD);
    const pick = { kind: 'volume' as const, volume: couch };
    const base = couch.size.clone();
    let f = scaleFactorOf(pick, base);
    expect(f).toBeCloseTo(1, 9);
    for (let i = 0; i < 20; i++) {
      f = stepScaleFactor(f, 1);
      applyScale(pick, base, f);
    }
    expect(f).toBeCloseTo(2, 9);
    expect(couch.size.x).toBeCloseTo(3.6, 6);
    expect(couch.center.y - couch.size.y / 2).toBeCloseTo(0, 6); // bottom still on the floor
    for (let i = 0; i < 40; i++) {
      f = stepScaleFactor(f, -1);
      applyScale(pick, base, f);
    }
    expect(f).toBeCloseTo(0.5, 9);
    expect(couch.size.x).toBeCloseTo(0.9, 6);
    expect(applyScale(pick, base, 0.5)).toBe(false); // no change reports false
  });

  it('doors scale width only, walls length only', () => {
    const room = squareRoom();
    const door = placeDoor(room, new Vector3(0, 0, -3), HEAD);
    const dp = { kind: 'door' as const, door };
    applyScale(dp, new Vector3(door.width, door.height, 0), 1.5);
    expect(door.width).toBeCloseTo(1.35, 6);
    expect(door.height).toBe(2.0);
    const wall = placeWall(room, new Vector3(-1, 0, -3), new Vector3(1, 0, -3))!;
    applyScale({ kind: 'volume', volume: wall }, wall.size.clone(), 2);
    expect(wall.size.x).toBeCloseTo(4, 6);
    expect(wall.size.y).toBe(2.4);
  });

  it('rotates volumes by yaw and doors by their frame, in 15 degree steps', () => {
    const room = squareRoom();
    const table = placeFurniture(room, 'table', new Vector3(0, 0, -2), HEAD);
    const yaw0 = table.yaw;
    rotatePick({ kind: 'volume', volume: table }, (15 * Math.PI) / 180);
    expect(table.yaw - yaw0).toBeCloseTo((15 * Math.PI) / 180, 9);
    const door = placeDoor(room, new Vector3(0, 0, -3), HEAD);
    const n0 = door.normal.clone();
    for (let i = 0; i < 6; i++) rotatePick({ kind: 'door', door }, (15 * Math.PI) / 180);
    expect(door.normal.angleTo(n0)).toBeCloseTo(Math.PI / 2, 6);
    expect(door.normal.y).toBe(0);
    expect(door.normal.length()).toBeCloseTo(1, 6);
    expect(door.right.dot(door.normal)).toBeCloseTo(0, 6);
  });

  it('removePick deletes doors and volumes', () => {
    const room = squareRoom();
    const door = placeDoor(room, new Vector3(0, 0, -3), HEAD);
    const couch = placeFurniture(room, 'couch', new Vector3(2, 0, 0), HEAD);
    expect(removePick(room, { kind: 'door', door })).toBe(true);
    expect(room.doors).toHaveLength(0);
    expect(removePick(room, { kind: 'volume', volume: couch })).toBe(true);
    expect(room.volumes).toHaveLength(0);
    expect(removePick(room, { kind: 'volume', volume: couch })).toBe(false);
  });
});

describe('Blueprint save / load', () => {
  beforeEach(() => {
    store.clear();
  });

  it('round-trips a RoomModel through Save.data.rooms["default"] and localStorage', () => {
    const room = squareRoom();
    const door = placeDoor(room, new Vector3(0, 0, -3), HEAD);
    const kids = placeDoor(room, new Vector3(3, 0, 0), HEAD);
    markKidsRoom(room, kids);
    placeFurniture(room, 'couch', new Vector3(0, 0, 2), HEAD);
    placeWall(room, new Vector3(-3, 0, -3), new Vector3(3, 0, -3));
    placeWindow(room, new Vector3(-3, 0, 0), HEAD);
    room.floorY = -0.05;

    const save = new Save();
    saveRoom(save, room, 'default', 1234);
    expect(save.data.rooms['default'].savedAt).toBe(1234);
    expect(store.get('gotobed.save.v1')).toBeTypeOf('string');

    // A fresh Save instance reads storage again, like a relaunch.
    const again = new Save();
    const back = loadSavedRoom(again);
    expect(back).not.toBeNull();
    expect(back!.floorY).toBeCloseTo(-0.05, 9);
    expect(back!.source).toBe('manual');
    expect(back!.doors).toHaveLength(2);
    expect(back!.doors.find((d) => d.id === kids.id)?.kidsRoom).toBe(true);
    expect(back!.doors.find((d) => d.id === door.id)?.kidsRoom).toBe(false);
    expect(back!.portalDoors).toHaveLength(1);
    expect(back!.couches).toHaveLength(1);
    expect(back!.walls).toHaveLength(1);
    expect(back!.windows).toHaveLength(1);
    expect(back!.bounds).toHaveLength(4);
    const d0 = back!.doors.find((d) => d.id === door.id)!;
    expect(d0.normal.z).toBeCloseTo(door.normal.z, 6);
    expect(d0.right.dot(d0.normal)).toBeCloseTo(0, 6);
    // Compare through the same JSON path storage uses (JSON has no -0).
    expect(JSON.parse(JSON.stringify(back!.toJSON()))).toEqual(JSON.parse(JSON.stringify(room.toJSON())));
  });

  it('returns null for a missing, malformed or empty saved room', () => {
    const save = new Save();
    expect(loadSavedRoom(save)).toBeNull();
    save.data.rooms['default'] = { model: { floorY: 'nope' }, savedAt: 1 };
    expect(loadSavedRoom(save)).toBeNull();
    save.data.rooms['default'] = { model: new RoomModel().toJSON(), savedAt: 1 };
    expect(loadSavedRoom(save)).toBeNull(); // no doors, no volumes
    expect(isRoomModelJSON(null)).toBe(false);
    expect(isRoomModelJSON({ floorY: 0, bounds: [[0, 0]], doors: [{ id: 'x', center: [0, 0], normal: [0, 0, 1], width: 1, height: 2, kidsRoom: false, source: 'manual' }], volumes: [], source: 'manual' })).toBe(false);
    expect(isRoomModelJSON(squareRoom().toJSON())).toBe(true);
  });

  it('survives storage that throws', () => {
    const broken = { getItem: (): never => { throw new Error('denied'); }, setItem: (): never => { throw new Error('denied'); }, removeItem: (): void => undefined };
    Object.defineProperty(globalThis, 'localStorage', { value: broken, configurable: true, writable: true });
    try {
      const save = new Save();
      const room = squareRoom();
      placeDoor(room, new Vector3(0, 0, -3), HEAD);
      expect(() => saveRoom(save, room)).not.toThrow();
      expect(loadSavedRoom(save)?.doors).toHaveLength(1); // still in memory for this session
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true, writable: true });
    }
  });
});

describe('Blueprint play materials', () => {
  it('merges every manual volume into one depth-only mesh', () => {
    const room = squareRoom();
    placeFurniture(room, 'couch', new Vector3(0, 0, -2), HEAD);
    placeWall(room, new Vector3(-2, 0, -3), new Vector3(2, 0, -3));
    room.addVolume('table', new Vector3(1, 0.4, 1), new Vector3(1, 0.8, 1), 0, 'scene'); // not manual: excluded
    room.addVolume('floor', new Vector3(), new Vector3(6, 0.01, 6), 0, 'manual'); // hidden label: excluded
    const g = applyPlayMaterials(room);
    expect(g.children).toHaveLength(1);
    const mesh = g.children[0] as Mesh;
    expect(mesh).toBeInstanceOf(Mesh);
    expect(mesh.geometry.getAttribute('position').count).toBe(2 * 36);
    const mat = mesh.material as { colorWrite: boolean; depthWrite: boolean };
    expect(mat.colorWrite).toBe(false);
    expect(mat.depthWrite).toBe(true);
    // The wall's top edge sits at 2.4 m.
    const pos = mesh.geometry.getAttribute('position');
    let maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) maxY = Math.max(maxY, pos.getY(i));
    expect(maxY).toBeCloseTo(2.4, 6);
    expect(applyPlayMaterials(new RoomModel()).children).toHaveLength(0);
  });
});
