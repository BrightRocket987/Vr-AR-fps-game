import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NotEqualStencilFunc,
  Quaternion,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
} from 'three';
import type { Save } from '../core/Save';
import { RoomModel, type Door, type RoomModelJSON, type Volume } from './RoomModel';
import type { HandState, Input } from '../xr/Input';

/*
 * Blueprint mode: draw your real room with the controllers (Quest 2 default, EDIT mode everywhere).
 *
 * Off hand = pointer. A ray from its grip hits the floor plane (y = room.floorY); a ring cursor and a ghost of
 * the selected tool sit there, facing the player. Thumbstick left/right cycles the tool, trigger places,
 * squeeze + stick scales / rotates the nearest object, two squeezing hands scale by hand distance.
 *
 * Draw-call budget (Quest 2): all proxies are ONE LineSegments + ONE fill Mesh (pooled vertex buffers with
 * per-vertex colour), plus ghost edges + ghost fill, highlight, cursor ring, wall-start ring and one label
 * sprite = 8 draw calls while active, 2 while fading out after exit, 0 afterwards. `applyPlayMaterials`
 * returns one merged depth-only mesh (1 draw call) for the manual volumes during play.
 *
 * Everything that touches the RoomModel is a pure exported function so it can be unit-tested in node.
 */

// ---------------------------------------------------------------------------------------------------------------
// Tools, sizes, colours
// ---------------------------------------------------------------------------------------------------------------

export type ToolId = 'door' | 'couch' | 'table' | 'wall' | 'window' | 'kids' | 'delete';

export const TOOLS: readonly ToolId[] = ['door', 'couch', 'table', 'wall', 'window', 'kids', 'delete'];

export const TOOL_NAMES: Readonly<Record<ToolId, string>> = {
  door: 'Door',
  couch: 'Couch',
  table: 'Table',
  wall: 'Wall',
  window: 'Window',
  kids: 'Kids Room',
  delete: 'Delete',
};

/** Default sizes in RoomModel convention: x = width along the right axis, y = height, z = depth. */
export const TOOL_SIZES: Readonly<Record<'door' | 'couch' | 'table' | 'wall' | 'window', Vector3>> = {
  door: new Vector3(0.9, 2.0, 0.06),
  couch: new Vector3(1.8, 0.8, 0.9),
  table: new Vector3(1.2, 0.75, 0.8),
  wall: new Vector3(0, 2.4, 0.1), // x = segment length, set per placement
  window: new Vector3(1.2, 1.2, 0.06),
};

/** Bottom edge of a window above the floor. */
export const WINDOW_SILL = 1.0;
/** Shortest wall segment accepted (m). */
export const MIN_WALL_LENGTH = 0.3;
/** Pick radius for kids-room tagging, delete and grab (m). */
export const PICK_RADIUS = 0.6;
/** Depth used when a door is drawn / picked as a box. */
export const DOOR_DEPTH = 0.06;
const DOOR_PICK_DEPTH = 0.3;

export const SCALE_MIN = 0.5;
export const SCALE_MAX = 2.0;
export const SCALE_STEP = 1.1;
export const ROTATE_STEP = (15 * Math.PI) / 180;
/** Seconds the proxies stay visible after leaving Blueprint. */
export const FADE_SECONDS = 3;
const AUTOSAVE_SECONDS = 1;
const FILL_OPACITY = 0.15;
const MAX_PROXIES = 96;
const ROOM_KEY = 'default';

/** Colour per label; `kids` is a door tagged kidsRoom, `other` is any unknown (scan) label. */
export const PROXY_COLORS: Readonly<Record<string, number>> = {
  door: 0x3fd6c8, // teal
  couch: 0xffcc33, // yellow
  table: 0xff8c28, // orange
  wall: 0xffffff, // white
  window: 0x5da9e9, // blue
  kids: 0xf25ca2, // pink
  delete: 0xff5a5a,
  other: 0x9aa3ad,
};

/** Volumes that are never drawn or picked as proxies (whole-room boxes from a scan). */
const HIDDEN_LABELS = new Set(['floor', 'ceiling', 'global mesh']);

const UP = new Vector3(0, 1, 0);

// ---------------------------------------------------------------------------------------------------------------
// Pure helpers: pointing
// ---------------------------------------------------------------------------------------------------------------

/** Intersect a ray with the floor plane. Null when the ray points up/level or hits outside [0.2, maxDist] m. */
export function floorHit(origin: Vector3, dir: Vector3, floorY: number, maxDist = 8, out = new Vector3()): Vector3 | null {
  if (dir.y > -0.05) return null;
  const t = (floorY - origin.y) / dir.y;
  if (t < 0.2 || t > maxDist) return null;
  return out.copy(origin).addScaledVector(dir, t);
}

/**
 * The cursor point for a hand ray: the floor hit, or (fallback) the point 1 m ahead projected onto the floor.
 * Returns true when it was a real floor hit. `out` is always filled.
 */
export function cursorPoint(origin: Vector3, dir: Vector3, floorY: number, out: Vector3, maxDist = 8): boolean {
  if (floorHit(origin, dir, floorY, maxDist, out)) return true;
  out.copy(origin).addScaledVector(dir, 1);
  out.y = floorY;
  return false;
}

/** Wrap-around tool cycling. */
export function cycleTool(index: number, delta: number, count = TOOLS.length): number {
  if (count <= 0) return 0;
  return (((index + delta) % count) + count) % count;
}

/**
 * Debounced thumbstick axis: one step per flick past `threshold`; re-arms once the stick returns under
 * `release`. With `repeatSeconds` > 0 a held stick fires again every `repeatSeconds`.
 */
export class StickStepper {
  private armed = true;
  private cooldown = 0;

  constructor(
    private readonly threshold = 0.6,
    private readonly release = 0.3,
    private readonly repeatSeconds = 0,
  ) {}

  /** -1, 0 or +1 for this frame. */
  step(value: number, dt: number): number {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const a = Math.abs(value);
    if (a < this.release) {
      this.armed = true;
      this.cooldown = 0;
      return 0;
    }
    if (a < this.threshold) return 0;
    if (this.armed || (this.repeatSeconds > 0 && this.cooldown <= 0)) {
      this.armed = false;
      this.cooldown = this.repeatSeconds > 0 ? this.repeatSeconds : Number.POSITIVE_INFINITY;
      return value > 0 ? 1 : -1;
    }
    return 0;
  }

  reset(): void {
    this.armed = true;
    this.cooldown = 0;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Pure helpers: frames and footprints
// ---------------------------------------------------------------------------------------------------------------

export interface Frame {
  normal: Vector3; // horizontal unit, toward the player
  right: Vector3; // horizontal unit, cross(normal, UP) (RoomModel.fromJSON convention)
  yaw: number; // RoomModel yaw: right = (cos yaw, 0, -sin yaw)
}

/** Orientation of a thing at `point` that faces the player's head (like House.placeDoorAt). */
export function facingFrame(point: Vector3, head: Vector3): Frame {
  const normal = head.clone().sub(point).setY(0);
  if (normal.lengthSq() < 1e-6) normal.set(0, 0, 1);
  normal.normalize();
  const right = new Vector3().crossVectors(normal, UP).normalize();
  return { normal, right, yaw: yawOfRight(right) };
}

export function yawOfRight(right: Vector3): number {
  return Math.atan2(-right.z, right.x);
}

export function rightOfYaw(yaw: number, out = new Vector3()): Vector3 {
  return out.set(Math.cos(yaw), 0, -Math.sin(yaw));
}

/** Distance in XZ from a point to a yaw-rotated box footprint (0 inside). */
export function footprintDistance(x: number, z: number, center: Vector3, size: Vector3, yaw: number): number {
  const dx = x - center.x, dz = z - center.z;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  // World offset expressed in the box's local axes (local +x is the `right` axis (cos yaw, 0, -sin yaw)).
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  const ox = Math.max(0, Math.abs(lx) - size.x / 2);
  const oz = Math.max(0, Math.abs(lz) - size.z / 2);
  return Math.hypot(ox, oz);
}

export type Pick = { kind: 'door'; door: Door } | { kind: 'volume'; volume: Volume };

export interface BoxFrame {
  center: Vector3;
  size: Vector3;
  yaw: number;
}

/** The box a pick occupies (doors become thin boxes). */
export function pickFrame(pick: Pick, doorDepth = DOOR_DEPTH): BoxFrame {
  if (pick.kind === 'door') {
    const d = pick.door;
    return { center: d.center.clone(), size: new Vector3(d.width, d.height, doorDepth), yaw: yawOfRight(d.right) };
  }
  return { center: pick.volume.center.clone(), size: pick.volume.size.clone(), yaw: pick.volume.yaw };
}

export function pickId(pick: Pick): string {
  return pick.kind === 'door' ? pick.door.id : pick.volume.id;
}

/** Every pickable thing in the room: all doors, all volumes except whole-room labels. */
export function allPicks(room: RoomModel): Pick[] {
  const out: Pick[] = [];
  for (const door of room.doors) out.push({ kind: 'door', door });
  for (const volume of room.volumes) if (!HIDDEN_LABELS.has(volume.label)) out.push({ kind: 'volume', volume });
  return out;
}

/** Nearest pick whose footprint is within `maxDist` of (x, z), optionally filtered. */
export function nearestPick(room: RoomModel, x: number, z: number, maxDist: number, filter?: (p: Pick) => boolean): Pick | null {
  let best: Pick | null = null;
  let bestD = maxDist;
  for (const p of allPicks(room)) {
    if (filter && !filter(p)) continue;
    const f = pickFrame(p, DOOR_PICK_DEPTH);
    const d = footprintDistance(x, z, f.center, f.size, f.yaw);
    if (d <= bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/**
 * Where the ghost of `tool` sits for a cursor at `point`. Null for tools that do not place (kids, delete).
 * Walls: a thin post before the first press, the live segment start→point after it.
 */
export function toolFrame(tool: ToolId, point: Vector3, head: Vector3, wallStart: Vector3 | null, floorY: number): BoxFrame | null {
  switch (tool) {
    case 'door': {
      const f = facingFrame(point, head);
      return { center: new Vector3(point.x, floorY + TOOL_SIZES.door.y / 2, point.z), size: TOOL_SIZES.door.clone(), yaw: f.yaw };
    }
    case 'couch':
    case 'table': {
      const f = facingFrame(point, head);
      const s = TOOL_SIZES[tool];
      return { center: new Vector3(point.x, floorY + s.y / 2, point.z), size: s.clone(), yaw: f.yaw };
    }
    case 'window': {
      const f = facingFrame(point, head);
      return { center: new Vector3(point.x, floorY + WINDOW_SILL + TOOL_SIZES.window.y / 2, point.z), size: TOOL_SIZES.window.clone(), yaw: f.yaw };
    }
    case 'wall': {
      if (!wallStart) return { center: new Vector3(point.x, floorY + TOOL_SIZES.wall.y / 2, point.z), size: new Vector3(0.1, TOOL_SIZES.wall.y, TOOL_SIZES.wall.z), yaw: 0 };
      const w = wallFrame(wallStart, point, floorY);
      if (w.size.x < 0.05) w.size.x = 0.05;
      return w;
    }
    default:
      return null;
  }
}

/** The wall box between two floor points: length along x, 2.4 m high, standing on the floor. */
export function wallFrame(a: Vector3, b: Vector3, floorY: number): BoxFrame {
  const dir = new Vector3(b.x - a.x, 0, b.z - a.z);
  const len = dir.length();
  const right = len > 1e-6 ? dir.divideScalar(len) : new Vector3(1, 0, 0);
  const center = new Vector3((a.x + b.x) / 2, floorY + TOOL_SIZES.wall.y / 2, (a.z + b.z) / 2);
  return { center, size: new Vector3(len, TOOL_SIZES.wall.y, TOOL_SIZES.wall.z), yaw: yawOfRight(right) };
}

// ---------------------------------------------------------------------------------------------------------------
// Pure helpers: editing the RoomModel
// ---------------------------------------------------------------------------------------------------------------

/** RoomModel ids are `${label}-${count}-${source}`, which can collide after a delete; make them unique. */
export function ensureUniqueId(room: RoomModel, obj: { id: string }): void {
  const taken = new Set<string>();
  for (const d of room.doors) if (d !== obj) taken.add(d.id);
  for (const v of room.volumes) if (v !== obj) taken.add(v.id);
  if (!taken.has(obj.id)) return;
  let n = 2;
  while (taken.has(`${obj.id}~${n}`)) n++;
  obj.id = `${obj.id}~${n}`;
}

/** A hand-edited room is 'manual' (was virtual) or 'mixed' (had scan data). */
export function markManual(room: RoomModel): void {
  if (room.source === 'virtual') room.source = 'manual';
  else if (room.source === 'scene') room.source = 'mixed';
}

/**
 * Grow the floor polygon so it contains every point (plus `pad`), as an axis-aligned rectangle over the old
 * bounds. Returns true when the bounds changed. With no bounds yet, starts from a 4.4 m square around the first point.
 */
export function ensureBoundsContain(room: RoomModel, points: Vector3[], pad = 0.5): boolean {
  if (points.length === 0) return false;
  if (room.bounds.length >= 3 && points.every((p) => room.contains(p.x, p.z))) return false;
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  if (room.bounds.length >= 3) {
    for (const b of room.bounds) {
      minX = Math.min(minX, b.x);
      maxX = Math.max(maxX, b.x);
      minZ = Math.min(minZ, b.y);
      maxZ = Math.max(maxZ, b.y);
    }
  } else {
    const p = points[0];
    minX = p.x - 2.2;
    maxX = p.x + 2.2;
    minZ = p.z - 2.2;
    maxZ = p.z + 2.2;
  }
  for (const p of points) {
    minX = Math.min(minX, p.x - pad);
    maxX = Math.max(maxX, p.x + pad);
    minZ = Math.min(minZ, p.z - pad);
    maxZ = Math.max(maxZ, p.z + pad);
  }
  room.bounds = [new Vector2(minX, minZ), new Vector2(maxX, minZ), new Vector2(maxX, maxZ), new Vector2(minX, maxZ)];
  return true;
}

/** Place a manual door standing on the floor at `point`, facing the player. Replaces any virtual door. */
export function placeDoor(room: RoomModel, point: Vector3, head: Vector3, width = TOOL_SIZES.door.x, height = TOOL_SIZES.door.y): Door {
  const f = facingFrame(point, head);
  room.doors = room.doors.filter((d) => d.source !== 'virtual');
  const center = new Vector3(point.x, room.floorY + height / 2, point.z);
  const d = room.addDoor(center, f.right, width, height, 'manual');
  d.normal.copy(f.normal);
  d.right.copy(f.right);
  ensureUniqueId(room, d);
  ensureBoundsContain(room, [point, head]);
  markManual(room);
  return d;
}

/** Place a couch or table standing on the floor at `point`, long side facing the player. */
export function placeFurniture(room: RoomModel, label: 'couch' | 'table', point: Vector3, head: Vector3): Volume {
  const f = facingFrame(point, head);
  const s = TOOL_SIZES[label];
  const v = room.addVolume(label, new Vector3(point.x, room.floorY + s.y / 2, point.z), s, f.yaw, 'manual');
  ensureUniqueId(room, v);
  ensureBoundsContain(room, [point, head]);
  markManual(room);
  return v;
}

/** Place a 1.2 x 1.2 m window whose sill is 1.0 m above the floor, facing the player. */
export function placeWindow(room: RoomModel, point: Vector3, head: Vector3): Volume {
  const f = facingFrame(point, head);
  const s = TOOL_SIZES.window;
  const v = room.addVolume('window', new Vector3(point.x, room.floorY + WINDOW_SILL + s.y / 2, point.z), s, f.yaw, 'manual');
  ensureUniqueId(room, v);
  markManual(room);
  return v;
}

/** Place a 2.4 m wall between two floor points; null when shorter than MIN_WALL_LENGTH. */
export function placeWall(room: RoomModel, a: Vector3, b: Vector3): Volume | null {
  const w = wallFrame(a, b, room.floorY);
  if (w.size.x < MIN_WALL_LENGTH) return null;
  const v = room.addVolume('wall', w.center, w.size, w.yaw, 'manual');
  ensureUniqueId(room, v);
  ensureBoundsContain(room, [a, b]);
  markManual(room);
  return v;
}

/** Tag one door as the kids' room (never a portal); tagging a second untags the first. */
export function markKidsRoom(room: RoomModel, door: Door): void {
  for (const d of room.doors) d.kidsRoom = d === door;
  markManual(room);
}

export function removePick(room: RoomModel, pick: Pick): boolean {
  const before = room.doors.length + room.volumes.length;
  if (pick.kind === 'door') room.doors = room.doors.filter((d) => d !== pick.door);
  else room.volumes = room.volumes.filter((v) => v !== pick.volume);
  const removed = room.doors.length + room.volumes.length < before;
  if (removed) markManual(room);
  return removed;
}

/** Rotate about Y by `radians` (doors: normal + right; volumes: yaw). */
export function rotatePick(pick: Pick, radians: number): void {
  if (pick.kind === 'door') {
    pick.door.normal.applyAxisAngle(UP, radians).setY(0).normalize();
    pick.door.right.applyAxisAngle(UP, radians).setY(0).normalize();
  } else {
    pick.volume.yaw += radians;
  }
}

/** Current size of a pick as a Vector3 (doors: width, height, 0). */
export function pickSize(pick: Pick, out = new Vector3()): Vector3 {
  return pick.kind === 'door' ? out.set(pick.door.width, pick.door.height, 0) : out.copy(pick.volume.size);
}

/** Scale factor relative to a base size, read from the x extent. */
export function scaleFactorOf(pick: Pick, base: Vector3): number {
  const x = pick.kind === 'door' ? pick.door.width : pick.volume.size.x;
  return base.x > 1e-6 ? x / base.x : 1;
}

/** One stick step up (+1) or down (-1) from factor `f`, clamped to [SCALE_MIN, SCALE_MAX]. */
export function stepScaleFactor(f: number, dir: number): number {
  const nf = dir > 0 ? f * SCALE_STEP : f / SCALE_STEP;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, nf));
}

/**
 * Set a pick's size to `base * factor` (clamped 0.5x..2x). Doors scale width only, walls length only, other
 * volumes uniformly while keeping their bottom edge where it was. Returns true when something changed.
 */
export function applyScale(pick: Pick, base: Vector3, factor: number): boolean {
  const f = Math.min(SCALE_MAX, Math.max(SCALE_MIN, factor));
  if (pick.kind === 'door') {
    const w = base.x * f;
    if (Math.abs(w - pick.door.width) < 1e-4) return false;
    pick.door.width = w;
    return true;
  }
  const v = pick.volume;
  if (v.label === 'wall' || v.label === 'window') {
    const len = base.x * f;
    if (Math.abs(len - v.size.x) < 1e-4) return false;
    v.size.x = len;
    return true;
  }
  const bottom = v.center.y - v.size.y / 2;
  const next = base.clone().multiplyScalar(f);
  if (next.distanceTo(v.size) < 1e-4) return false;
  v.size.copy(next);
  v.center.y = bottom + next.y / 2;
  return true;
}

// ---------------------------------------------------------------------------------------------------------------
// Pure helpers: save / load through Save.data.rooms['default']
// ---------------------------------------------------------------------------------------------------------------

function isNumArray(x: unknown, n: number): x is number[] {
  return Array.isArray(x) && x.length === n && x.every((v) => typeof v === 'number' && Number.isFinite(v));
}

/** Defensive shape check for whatever is in storage. */
export function isRoomModelJSON(x: unknown): x is RoomModelJSON {
  if (!x || typeof x !== 'object') return false;
  const j = x as Record<string, unknown>;
  if (typeof j.floorY !== 'number' || !Number.isFinite(j.floorY)) return false;
  if (!Array.isArray(j.bounds) || !j.bounds.every((b) => isNumArray(b, 2))) return false;
  if (!Array.isArray(j.doors) || !Array.isArray(j.volumes)) return false;
  if (typeof j.source !== 'string') return false;
  for (const d of j.doors as unknown[]) {
    if (!d || typeof d !== 'object') return false;
    const o = d as Record<string, unknown>;
    if (typeof o.id !== 'string' || !isNumArray(o.center, 3) || !isNumArray(o.normal, 3)) return false;
    if (typeof o.width !== 'number' || typeof o.height !== 'number' || typeof o.kidsRoom !== 'boolean' || typeof o.source !== 'string') return false;
  }
  for (const v of j.volumes as unknown[]) {
    if (!v || typeof v !== 'object') return false;
    const o = v as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.label !== 'string' || !isNumArray(o.center, 3) || !isNumArray(o.size, 3)) return false;
    if (typeof o.yaw !== 'number' || typeof o.source !== 'string') return false;
  }
  return true;
}

/** Write the room into the save and persist it. */
export function saveRoom(save: Save, room: RoomModel, key = ROOM_KEY, now = Date.now()): void {
  save.data.rooms[key] = { model: room.toJSON(), savedAt: now };
  save.persist();
}

/** Read a saved room back, or null when there is none / it is malformed / it is empty. */
export function loadSavedRoom(save: Save, key = ROOM_KEY): RoomModel | null {
  const rec = save.data.rooms[key];
  if (!rec || !isRoomModelJSON(rec.model)) return null;
  const m = RoomModel.fromJSON(rec.model);
  if (m.doors.length === 0 && m.volumes.length === 0) return null;
  return m;
}

// ---------------------------------------------------------------------------------------------------------------
// Play-mode occluder: one depth-only mesh for all manual volumes
// ---------------------------------------------------------------------------------------------------------------

/**
 * Depth-only boxes for every manual volume (couches, tables, walls, windows): invisible but they occlude, so a
 * gremlin behind your placed couch is hidden by the real couch it traces. One merged mesh = one draw call.
 * Uses the same stencil rule as SceneImport's occluder so it never writes depth inside an open portal mask.
 * Call again after the room changes and swap the returned group for the old one (dispose the old).
 */
export function applyPlayMaterials(room: RoomModel): Group {
  const group = new Group();
  group.name = 'blueprint-occluders';
  const unit = new BoxGeometry(1, 1, 1).toNonIndexed();
  const unitPos = unit.getAttribute('position').array;
  const vols = room.volumes.filter((v) => v.source === 'manual' && !HIDDEN_LABELS.has(v.label));
  if (vols.length === 0) {
    unit.dispose();
    return group;
  }
  const pos = new Float32Array(vols.length * unitPos.length);
  const m = new Matrix4(), q = new Quaternion(), v = new Vector3();
  vols.forEach((vol, i) => {
    q.setFromAxisAngle(UP, vol.yaw);
    m.compose(vol.center, q, vol.size);
    writeTransformed(unitPos, pos, i * unitPos.length, m, v);
  });
  unit.dispose();
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  const mat = new MeshBasicMaterial({ colorWrite: false, depthWrite: true });
  mat.stencilWrite = true;
  mat.stencilFunc = NotEqualStencilFunc;
  mat.stencilRef = 1;
  const mesh = new Mesh(geo, mat);
  mesh.name = 'blueprint-occluder';
  mesh.renderOrder = -20;
  mesh.frustumCulled = false;
  group.add(mesh);
  return group;
}

/** Dispose a group returned by applyPlayMaterials. */
export function disposePlayMaterials(group: Group): void {
  for (const child of group.children) {
    if (child instanceof Mesh) {
      child.geometry.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) for (const mm of mat) mm.dispose();
      else mat.dispose();
    }
  }
  group.clear();
}

function writeTransformed(src: ArrayLike<number>, dst: Float32Array, offset: number, m: Matrix4, tmp: Vector3): void {
  for (let i = 0; i + 2 < src.length; i += 3) {
    tmp.set(src[i], src[i + 1], src[i + 2]).applyMatrix4(m);
    dst[offset + i] = tmp.x;
    dst[offset + i + 1] = tmp.y;
    dst[offset + i + 2] = tmp.z;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Pooled proxy batch: all wireframes in one LineSegments, all fills in one Mesh
// ---------------------------------------------------------------------------------------------------------------

class ProxyBatch {
  readonly edges: LineSegments<BufferGeometry, LineBasicMaterial>;
  readonly fill: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly unitEdges: Float32Array;
  private readonly unitFill: Float32Array;
  private readonly edgePos: Float32Array;
  private readonly edgeCol: Float32Array;
  private readonly fillPos: Float32Array;
  private readonly fillCol: Float32Array;
  private count = 0;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly v = new Vector3();

  constructor() {
    const box = new BoxGeometry(1, 1, 1);
    const edgesGeo = new EdgesGeometry(box);
    this.unitEdges = Float32Array.from(edgesGeo.getAttribute('position').array as ArrayLike<number>);
    const nonIndexed = box.toNonIndexed();
    this.unitFill = Float32Array.from(nonIndexed.getAttribute('position').array as ArrayLike<number>);
    edgesGeo.dispose();
    nonIndexed.dispose();
    box.dispose();

    this.edgePos = new Float32Array(MAX_PROXIES * this.unitEdges.length);
    this.edgeCol = new Float32Array(MAX_PROXIES * this.unitEdges.length);
    this.fillPos = new Float32Array(MAX_PROXIES * this.unitFill.length);
    this.fillCol = new Float32Array(MAX_PROXIES * this.unitFill.length);

    const eg = new BufferGeometry();
    eg.setAttribute('position', new BufferAttribute(this.edgePos, 3).setUsage(DynamicDrawUsage));
    eg.setAttribute('color', new BufferAttribute(this.edgeCol, 3).setUsage(DynamicDrawUsage));
    eg.setDrawRange(0, 0);
    this.edges = new LineSegments(eg, new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1 }));
    this.edges.name = 'blueprint-edges';
    this.edges.frustumCulled = false;
    this.edges.renderOrder = 11;

    const fg = new BufferGeometry();
    fg.setAttribute('position', new BufferAttribute(this.fillPos, 3).setUsage(DynamicDrawUsage));
    fg.setAttribute('color', new BufferAttribute(this.fillCol, 3).setUsage(DynamicDrawUsage));
    fg.setDrawRange(0, 0);
    this.fill = new Mesh(fg, new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: FILL_OPACITY, side: DoubleSide, depthWrite: false }));
    this.fill.name = 'blueprint-fill';
    this.fill.frustumCulled = false;
    this.fill.renderOrder = 10;
  }

  get size(): number {
    return this.count;
  }

  begin(): void {
    this.count = 0;
  }

  push(center: Vector3, yaw: number, size: Vector3, color: Color): void {
    if (this.count >= MAX_PROXIES) return;
    this.q.setFromAxisAngle(UP, yaw);
    this.m.compose(center, this.q, size);
    const eo = this.count * this.unitEdges.length;
    writeTransformed(this.unitEdges, this.edgePos, eo, this.m, this.v);
    fillColor(this.edgeCol, eo, this.unitEdges.length, color);
    const fo = this.count * this.unitFill.length;
    writeTransformed(this.unitFill, this.fillPos, fo, this.m, this.v);
    fillColor(this.fillCol, fo, this.unitFill.length, color);
    this.count++;
  }

  end(): void {
    const eg = this.edges.geometry, fg = this.fill.geometry;
    eg.setDrawRange(0, (this.count * this.unitEdges.length) / 3);
    fg.setDrawRange(0, (this.count * this.unitFill.length) / 3);
    (eg.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (eg.getAttribute('color') as BufferAttribute).needsUpdate = true;
    (fg.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (fg.getAttribute('color') as BufferAttribute).needsUpdate = true;
  }

  setOpacity(f: number): void {
    this.edges.material.opacity = f;
    this.fill.material.opacity = FILL_OPACITY * f;
  }

  dispose(): void {
    this.edges.geometry.dispose();
    this.edges.material.dispose();
    this.fill.geometry.dispose();
    this.fill.material.dispose();
  }
}

function fillColor(dst: Float32Array, offset: number, n: number, color: Color): void {
  for (let i = 0; i < n; i += 3) {
    dst[offset + i] = color.r;
    dst[offset + i + 1] = color.g;
    dst[offset + i + 2] = color.b;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The mode
// ---------------------------------------------------------------------------------------------------------------

export interface BlueprintDeps {
  input: Input;
  room: RoomModel;
  /** Where the Blueprint group is added (e.g. the House room group or ctx.world). */
  parent: Group;
  headPosition: (out?: Vector3) => Vector3;
  say: (title: string, sub: string, seconds: number) => void;
  /** Called after every committed change (the lead rebuilds visuals / nav / seats). */
  onChange: () => void;
  save: Save;
}

export class Blueprint {
  readonly group = new Group();
  /** Optional: told when the player leaves the mode (B button or exit()). */
  onExit: (() => void) | null = null;
  readonly stats = { placed: 0, deleted: 0, edits: 0, saves: 0 };

  private room: RoomModel;
  private _active = false;
  private toolIndex = 0;
  private wallStart: Vector3 | null = null;
  private selected: Pick | null = null;
  private pendingChange = false;
  private dirty = false;
  private saveTimer = 0;
  private sinceExit = Number.POSITIVE_INFINITY;
  private twoHand: { startDist: number; startFactor: number } | null = null;
  private readonly stepX = new StickStepper(0.6, 0.3, 0);
  private readonly stepY = new StickStepper(0.6, 0.3, 0.25);
  private readonly baseSizes = new Map<string, Vector3>();

  private readonly batch = new ProxyBatch();
  private readonly unitBox: BoxGeometry;
  private readonly unitEdges: EdgesGeometry;
  private readonly ringGeo: RingGeometry;
  private readonly ghostEdges: LineSegments<EdgesGeometry, LineBasicMaterial>;
  private readonly ghostFill: Mesh<BoxGeometry, MeshBasicMaterial>;
  private readonly highlight: LineSegments<EdgesGeometry, LineBasicMaterial>;
  private readonly cursor: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly wallMarker: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly label: Sprite;
  private readonly labelCanvas: HTMLCanvasElement;
  private readonly labelTex: CanvasTexture;
  private labelText = '';

  private readonly tmpHead = new Vector3();
  private readonly tmpDir = new Vector3();
  private readonly tmpHit = new Vector3();
  private readonly tmpSize = new Vector3();
  private readonly tmpQ = new Quaternion();
  private readonly tmpColor = new Color();

  constructor(private readonly deps: BlueprintDeps) {
    this.room = deps.room;
    this.group.name = 'blueprint';
    this.group.add(this.batch.edges, this.batch.fill);

    this.unitBox = new BoxGeometry(1, 1, 1);
    this.unitEdges = new EdgesGeometry(this.unitBox);
    this.ghostEdges = new LineSegments(this.unitEdges, new LineBasicMaterial({ color: PROXY_COLORS.door, transparent: true, opacity: 0.9 }));
    this.ghostEdges.renderOrder = 13;
    this.ghostFill = new Mesh(this.unitBox, new MeshBasicMaterial({ color: PROXY_COLORS.door, transparent: true, opacity: FILL_OPACITY, side: DoubleSide, depthWrite: false }));
    this.ghostFill.renderOrder = 12;
    this.highlight = new LineSegments(this.unitEdges, new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false }));
    this.highlight.renderOrder = 14;

    this.ringGeo = new RingGeometry(0.08, 0.1, 24);
    this.cursor = new Mesh(this.ringGeo, new MeshBasicMaterial({ color: 0xffcc33, side: DoubleSide, depthTest: false }));
    this.cursor.rotation.x = -Math.PI / 2;
    this.cursor.renderOrder = 15;
    this.wallMarker = new Mesh(this.ringGeo, new MeshBasicMaterial({ color: 0xffffff, side: DoubleSide, depthTest: false }));
    this.wallMarker.rotation.x = -Math.PI / 2;
    this.wallMarker.renderOrder = 15;

    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 256;
    this.labelCanvas.height = 64;
    this.labelTex = new CanvasTexture(this.labelCanvas);
    this.label = new Sprite(new SpriteMaterial({ map: this.labelTex, transparent: true, depthTest: false }));
    this.label.scale.set(0.32, 0.08, 1);
    this.label.renderOrder = 55;

    this.group.add(this.ghostEdges, this.ghostFill, this.highlight, this.cursor, this.wallMarker, this.label);
    this.setPointerVisible(false);
    this.group.visible = false;
    deps.parent.add(this.group);
    this.rebuildProxies();
  }

  get active(): boolean {
    return this._active;
  }

  get tool(): ToolId {
    return TOOLS[this.toolIndex];
  }

  /** Public so a wrist menu (or hands without a thumbstick) can drive it. */
  cycleTool(delta: number): void {
    this.toolIndex = cycleTool(this.toolIndex, delta);
    this.wallStart = null;
    this.deps.input.offHand.pulse(0.3, 20);
  }

  enter(): void {
    if (this._active) return;
    this._active = true;
    this.sinceExit = Number.POSITIVE_INFINITY;
    this.wallStart = null;
    this.selected = null;
    this.twoHand = null;
    this.stepX.reset();
    this.stepY.reset();
    this.batch.setOpacity(1);
    this.group.visible = true;
    this.rebuildProxies();
    this.deps.say('Draw your room', 'Thumbstick: choose tool. Trigger: place. Squeeze+stick: size/turn. B: done.', 0);
    this.deps.input.offHand.pulse(0.4, 40);
  }

  exit(): void {
    if (!this._active) return;
    this._active = false;
    this.sinceExit = 0;
    this.wallStart = null;
    this.selected = null;
    this.twoHand = null;
    this.setPointerVisible(false);
    if (this.pendingChange) this.commitChange();
    if (this.dirty) this.saveNow();
    this.deps.say('Room saved', 'Press B to edit again.', 2.5);
    this.onExit?.();
  }

  /** Swap the model being edited (House adopts the scan / virtual room after construction). */
  setRoom(room: RoomModel): void {
    this.room = room;
    this.selected = null;
    this.wallStart = null;
    this.twoHand = null;
    this.baseSizes.clear();
    this.rebuildProxies();
  }

  static loadSaved(save: Save): RoomModel | null {
    return loadSavedRoom(save);
  }

  /** Same as the module function; here so the lead has one import. */
  static applyPlayMaterials(room: RoomModel): Group {
    return applyPlayMaterials(room);
  }

  saveNow(): void {
    saveRoom(this.deps.save, this.room);
    this.dirty = false;
    this.saveTimer = 0;
    this.stats.saves++;
  }

  update(dt: number): void {
    // Debounced autosave runs whether or not the mode is open.
    if (this.dirty) {
      this.saveTimer -= dt;
      if (this.saveTimer <= 0) this.saveNow();
    }
    if (!this._active) {
      this.updateFade(dt);
      return;
    }
    const input = this.deps.input;
    const off = input.offHand;
    const main = input.weaponHand;
    if (off.buttonBJustPressed) {
      this.exit();
      return;
    }
    if (!off.connected) {
      this.setPointerVisible(false);
      return;
    }
    const head = this.deps.headPosition(this.tmpHead);
    off.forward(this.tmpDir);
    const realHit = cursorPoint(off.position, this.tmpDir, this.room.floorY, this.tmpHit);
    const hit = this.tmpHit;

    // Thumbstick: tool cycle, or (while squeezing) rotate / scale the grabbed object.
    const sx = this.stepX.step(off.thumbstick.x, dt);
    const sy = this.stepY.step(-off.thumbstick.y, dt); // stick up = scale up
    if (off.squeeze) {
      if (this.selected) {
        if (sx !== 0) {
          rotatePick(this.selected, sx * ROTATE_STEP);
          this.afterEdit();
        }
        if (sy !== 0) {
          const base = this.baseOf(this.selected);
          if (applyScale(this.selected, base, stepScaleFactor(scaleFactorOf(this.selected, base), sy))) this.afterEdit();
        }
      }
    } else if (sx !== 0) {
      this.cycleTool(sx);
    }
    // Hands have no thumbstick: the other hand's pinch cycles the tool.
    if (off.isHand && main.connected && main.triggerJustPressed && !off.squeeze) this.cycleTool(1);

    // Squeeze = grab the nearest object under the cursor; release commits the edit.
    if (off.squeezeJustPressed) {
      this.selected = nearestPick(this.room, hit.x, hit.z, PICK_RADIUS);
      this.twoHand = null;
      if (this.selected) off.pulse(0.3, 30);
    }
    if (off.squeezeJustReleased) {
      this.selected = null;
      this.twoHand = null;
      if (this.pendingChange) this.commitChange();
    }
    this.updateTwoHand(off, main);

    // Trigger: the tool acts at the cursor (ignored while grabbing).
    if (off.triggerJustPressed && !off.squeeze) this.applyTool(hit, head);

    this.updatePointer(hit, realHit, head);
  }

  dispose(): void {
    if (this.pendingChange) this.commitChange();
    if (this.dirty) this.saveNow();
    this._active = false;
    this.deps.parent.remove(this.group);
    this.batch.dispose();
    this.ghostEdges.material.dispose();
    this.ghostFill.material.dispose();
    this.highlight.material.dispose();
    this.cursor.material.dispose();
    this.wallMarker.material.dispose();
    this.unitEdges.dispose();
    this.unitBox.dispose();
    this.ringGeo.dispose();
    this.label.material.dispose();
    this.labelTex.dispose();
  }

  /** For diagnostics exports. */
  snapshot(): Record<string, unknown> {
    return { active: this._active, tool: this.tool, proxies: this.batch.size, doors: this.room.doors.length, volumes: this.room.volumes.length, ...this.stats };
  }

  // ----------------------------------------------------------------------------------------------------------- //

  private applyTool(hit: Vector3, head: Vector3): void {
    const off = this.deps.input.offHand;
    switch (this.tool) {
      case 'door':
        placeDoor(this.room, hit, head);
        this.stats.placed++;
        this.commitChange();
        off.pulse(0.6, 60);
        break;
      case 'couch':
      case 'table':
        placeFurniture(this.room, this.tool, hit, head);
        this.stats.placed++;
        this.commitChange();
        off.pulse(0.6, 60);
        break;
      case 'window':
        placeWindow(this.room, hit, head);
        this.stats.placed++;
        this.commitChange();
        off.pulse(0.6, 60);
        break;
      case 'wall':
        if (!this.wallStart) {
          this.wallStart = hit.clone();
          this.deps.say('Wall started', 'Point at the end. Pull again.', 3);
          off.pulse(0.4, 40);
        } else {
          const v = placeWall(this.room, this.wallStart, hit);
          if (!v) {
            this.deps.say('Too short', 'Walls need 0.3 m. Try again.', 2);
            off.pulse(0.2, 80);
          } else {
            this.stats.placed++;
            this.commitChange();
            off.pulse(0.6, 60);
          }
          this.wallStart = null;
        }
        break;
      case 'kids': {
        const p = nearestPick(this.room, hit.x, hit.z, PICK_RADIUS, (q) => q.kind === 'door');
        if (p && p.kind === 'door') {
          markKidsRoom(this.room, p.door);
          this.stats.edits++;
          this.commitChange();
          this.deps.say('Kids room marked', 'Never a portal. Shh.', 2.5);
          off.pulse(0.6, 60);
        } else {
          this.deps.say('No door there', 'Point at a door, then pull.', 2);
          off.pulse(0.2, 80);
        }
        break;
      }
      case 'delete': {
        const p = nearestPick(this.room, hit.x, hit.z, PICK_RADIUS);
        if (p && removePick(this.room, p)) {
          this.baseSizes.delete(pickId(p));
          if (this.selected && pickId(this.selected) === pickId(p)) this.selected = null;
          this.stats.deleted++;
          this.commitChange();
          off.pulse(0.8, 80);
        } else {
          this.deps.say('Nothing there', 'Point closer to an object.', 2);
          off.pulse(0.2, 80);
        }
        break;
      }
    }
  }

  /** Two squeezing hands on a grabbed object: scale by hand distance. */
  private updateTwoHand(off: HandState, main: HandState): void {
    const both = this._active && off.squeeze && main.connected && main.squeeze && !!this.selected;
    if (!both || !this.selected) {
      this.twoHand = null;
      return;
    }
    const dist = Math.max(0.05, off.position.distanceTo(main.position));
    const base = this.baseOf(this.selected);
    if (!this.twoHand) {
      this.twoHand = { startDist: dist, startFactor: scaleFactorOf(this.selected, base) };
      return;
    }
    const factor = this.twoHand.startFactor * (dist / this.twoHand.startDist);
    if (applyScale(this.selected, base, factor)) this.afterEdit();
  }

  /** An in-progress edit (grab): redraw now, tell the lead on release. */
  private afterEdit(): void {
    this.stats.edits++;
    this.pendingChange = true;
    this.rebuildProxies();
  }

  /** A committed change: redraw, notify, schedule the autosave. */
  private commitChange(): void {
    this.pendingChange = false;
    this.rebuildProxies();
    this.dirty = true;
    this.saveTimer = AUTOSAVE_SECONDS;
    this.deps.onChange();
  }

  private baseOf(pick: Pick): Vector3 {
    const id = pickId(pick);
    let base = this.baseSizes.get(id);
    if (!base) {
      base = pickSize(pick, new Vector3());
      this.baseSizes.set(id, base);
    }
    return base;
  }

  private rebuildProxies(): void {
    this.batch.begin();
    for (const d of this.room.doors) {
      this.tmpColor.setHex(d.kidsRoom ? PROXY_COLORS.kids : PROXY_COLORS.door);
      this.batch.push(d.center, yawOfRight(d.right), this.tmpSize.set(d.width, d.height, DOOR_DEPTH), this.tmpColor);
    }
    for (const v of this.room.volumes) {
      if (HIDDEN_LABELS.has(v.label)) continue;
      this.tmpColor.setHex(PROXY_COLORS[v.label] ?? PROXY_COLORS.other);
      this.batch.push(v.center, v.yaw, v.size, this.tmpColor);
    }
    this.batch.end();
  }

  private updateFade(dt: number): void {
    if (this.sinceExit >= FADE_SECONDS) return;
    this.sinceExit += dt;
    if (this.sinceExit >= FADE_SECONDS) {
      this.group.visible = false;
      this.batch.setOpacity(1);
      return;
    }
    this.batch.setOpacity(Math.max(0, 1 - this.sinceExit / FADE_SECONDS));
  }

  private setPointerVisible(v: boolean): void {
    this.cursor.visible = v;
    this.ghostEdges.visible = v;
    this.ghostFill.visible = v;
    this.highlight.visible = v;
    this.wallMarker.visible = v;
    this.label.visible = v;
  }

  private updatePointer(hit: Vector3, realHit: boolean, head: Vector3): void {
    const off = this.deps.input.offHand;
    const tool = this.tool;
    this.cursor.visible = true;
    this.cursor.position.set(hit.x, hit.y + 0.01, hit.z);
    this.cursor.material.color.setHex(realHit ? PROXY_COLORS[tool] ?? 0xffcc33 : 0xff5a5a);

    // Ghost of the tool (hidden while grabbing or for kids/delete).
    const frame = off.squeeze ? null : toolFrame(tool, hit, head, this.wallStart, this.room.floorY);
    this.ghostEdges.visible = this.ghostFill.visible = !!frame;
    if (frame) {
      this.tmpQ.setFromAxisAngle(UP, frame.yaw);
      this.ghostEdges.position.copy(frame.center);
      this.ghostEdges.quaternion.copy(this.tmpQ);
      this.ghostEdges.scale.copy(frame.size);
      this.ghostFill.position.copy(frame.center);
      this.ghostFill.quaternion.copy(this.tmpQ);
      this.ghostFill.scale.copy(frame.size);
      const c = PROXY_COLORS[tool] ?? PROXY_COLORS.other;
      this.ghostEdges.material.color.setHex(c);
      this.ghostFill.material.color.setHex(c);
    }

    // Wall start marker.
    this.wallMarker.visible = !!this.wallStart;
    if (this.wallStart) this.wallMarker.position.set(this.wallStart.x, this.wallStart.y + 0.01, this.wallStart.z);

    // Highlight: the grabbed object, else the nearest thing the current tool would act on.
    let target: Pick | null = this.selected;
    if (!target && (tool === 'kids' || tool === 'delete' || !frame)) target = nearestPick(this.room, hit.x, hit.z, PICK_RADIUS, tool === 'kids' ? (p) => p.kind === 'door' : undefined);
    if (!target && !off.squeeze) target = nearestPick(this.room, hit.x, hit.z, PICK_RADIUS * 0.5);
    this.highlight.visible = !!target;
    if (target) {
      const f = pickFrame(target);
      this.tmpQ.setFromAxisAngle(UP, f.yaw);
      this.highlight.position.copy(f.center);
      this.highlight.quaternion.copy(this.tmpQ);
      this.highlight.scale.copy(f.size).multiplyScalar(1.03);
      this.highlight.material.color.setHex(tool === 'delete' ? PROXY_COLORS.delete : tool === 'kids' ? PROXY_COLORS.kids : 0xffffff);
    }

    // Label above the cursor.
    this.label.visible = true;
    this.label.position.set(hit.x, hit.y + 0.45, hit.z);
    let text = TOOL_NAMES[tool];
    if (tool === 'wall' && this.wallStart) text = 'Wall: end point';
    else if (this.selected && off.squeeze) text = `Edit: ${this.selected.kind === 'door' ? (this.selected.door.kidsRoom ? 'Kids door' : 'Door') : capitalise(this.selected.volume.label)}`;
    this.setLabel(text, PROXY_COLORS[tool] ?? PROXY_COLORS.other);
  }

  private setLabel(text: string, color: number): void {
    if (text === this.labelText) return;
    this.labelText = text;
    const g = this.labelCanvas.getContext('2d');
    if (!g) return;
    const W = this.labelCanvas.width, H = this.labelCanvas.height;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(20,18,28,0.82)';
    g.beginPath();
    g.roundRect(0, 0, W, H, 18);
    g.fill();
    g.fillStyle = '#' + color.toString(16).padStart(6, '0');
    g.font = 'bold 36px "Trebuchet MS", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, W / 2, H / 2 + 2);
    this.labelTex.needsUpdate = true;
  }
}

function capitalise(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
