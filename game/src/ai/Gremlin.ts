import { Color, Group, Object3D, Vector3 } from 'three';
import type { EventBus } from '../core/EventBus';
import type { PopFx } from '../combat/PopFx';
import type { RoomModel, Seat } from '../room/RoomModel';
import type { Avatar } from './Avatar';

export interface PlayerLike {
  position(out?: Vector3): Vector3;
  forward(out?: Vector3): Vector3;
  damage(amount: number, source: string): void;
}

export interface VoiceLike {
  /** Play a random line for a speaker (optionally filtered by emotion) from a world object. */
  say(speaker: string, emotion: string | undefined, at: Object3D | null): void;
  sfx(name: string, at: Object3D | null, volume?: number): void;
}

/** Hands out couch seats so two gremlins never share a cushion. */
export class SeatManager {
  private taken = new Map<string, number>();
  constructor(private readonly room: RoomModel) {}

  reserve(gremlinId: number, near: Vector3): Seat | null {
    const seats = this.room.seats().filter((s) => !this.taken.has(s.id));
    if (seats.length === 0) return null;
    seats.sort((a, b) => a.position.distanceToSquared(near) - b.position.distanceToSquared(near));
    this.taken.set(seats[0].id, gremlinId);
    return seats[0];
  }

  release(seat: Seat | null): void {
    if (seat) this.taken.delete(seat.id);
  }

  seatedCount(): number {
    return this.taken.size;
  }

  total(): number {
    return this.room.seats().length;
  }
}

export interface GremlinWorld {
  room: RoomModel;
  bus: EventBus;
  fx: PopFx;
  voice: VoiceLike;
  world: Group;
  player: PlayerLike;
  seats: SeatManager;
  /** All living gremlins (for crowd behaviours). */
  gremlins: () => Gremlin[];
  reducedFlash: boolean;
}

export interface GremlinOpts {
  hp: number;
  speed: number;
  height: number;
  color: Color;
  xp: number;
  radius?: number;
}

const UP = new Vector3(0, 1, 0);
const tmp = new Vector3();
const tmp2 = new Vector3();

/**
 * Base class for every enemy: position, HP, a tiny state machine, movement with blocker avoidance,
 * damage/pop handling and voice. Subclasses implement `tick`.
 */
export abstract class Gremlin {
  private static nextId = 1;
  readonly id = Gremlin.nextId++;
  abstract readonly type: string;
  abstract readonly speaker: string;
  readonly root = new Group();
  hp: number;
  readonly maxHp: number;
  speed: number;
  readonly height: number;
  readonly radius: number;
  readonly color: Color;
  readonly xp: number;
  alive = true;
  state = 'spawn';
  stateTime = 0;
  seat: Seat | null = null;
  protected yaw = 0;
  private flash = 0;
  private inflate = 0;
  private lastSay = -10;
  private readonly target = new Vector3();

  constructor(protected readonly w: GremlinWorld, readonly avatar: Avatar, opts: GremlinOpts) {
    this.hp = opts.hp;
    this.maxHp = opts.hp;
    this.speed = opts.speed;
    this.height = opts.height;
    this.radius = opts.radius ?? 0.22;
    this.color = opts.color;
    this.xp = opts.xp;
    this.root.add(avatar.root);
    w.world.add(this.root);
  }

  get position(): Vector3 {
    return this.root.position;
  }

  /** World-space centre of the head, for headshots. */
  headPosition(out = new Vector3()): Vector3 {
    return out.copy(this.root.position).add(tmp.set(0, this.height * 0.8, 0));
  }

  spawnAt(position: Vector3, facing: Vector3): void {
    this.root.position.copy(position);
    this.yaw = Math.atan2(facing.x, facing.z);
    this.root.rotation.y = this.yaw;
    this.setState('spawn');
    this.w.bus.emit('enemy:spawned', { id: this.id, type: this.type });
  }

  setState(s: string): void {
    if (this.state === s) return;
    this.state = s;
    this.stateTime = 0;
    this.onState(s);
  }

  protected onState(_s: string): void {}

  update(dt: number): void {
    if (!this.alive) return;
    this.stateTime += dt;
    this.avatar.update(dt);
    if (this.flash > 0) {
      this.flash -= dt;
      if (this.flash <= 0) this.avatar.setTint(null);
    }
    if (this.inflate > 0) {
      this.inflate -= dt;
      const s = 1 + 0.3 * (1 - Math.max(0, this.inflate) / 0.12);
      this.avatar.setStretch(s);
      if (this.inflate <= 0) this.finishPop();
      return;
    }
    this.tick(dt);
  }

  protected abstract tick(dt: number): void;

  protected distToPlayer(): number {
    const p = this.w.player.position(tmp);
    return Math.hypot(p.x - this.root.position.x, p.z - this.root.position.z);
  }

  protected playerVisibleToPlayer(): boolean {
    const p = this.w.player.position(tmp);
    const f = this.w.player.forward(tmp2).setY(0).normalize();
    const to = this.root.position.clone().sub(p).setY(0).normalize();
    return f.dot(to) > 0.3;
  }

  /** Face a world direction (XZ) smoothly. */
  protected face(dir: Vector3, dt: number, rate = 10): void {
    if (dir.lengthSq() < 1e-6) return;
    const targetYaw = Math.atan2(dir.x, dir.z);
    let d = targetYaw - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, rate * dt);
    this.root.rotation.y = this.yaw;
  }

  protected facePlayer(dt: number): void {
    const p = this.w.player.position(tmp);
    this.face(tmp2.copy(p).sub(this.root.position).setY(0), dt);
  }

  /**
   * Move toward `target` on the floor at `speed`, sliding around blockers and staying in bounds.
   * Returns the remaining horizontal distance.
   */
  protected moveToward(target: Vector3, speed: number, dt: number, stopAt = 0.05): number {
    const pos = this.root.position;
    const dir = tmp.set(target.x - pos.x, 0, target.z - pos.z);
    const dist = dir.length();
    if (dist <= stopAt) return dist;
    dir.divideScalar(dist);
    const step = Math.min(dist, speed * dt);
    let nx = pos.x + dir.x * step, nz = pos.z + dir.z * step;
    const room = this.w.room;
    if (room.blockedAt(nx, nz, this.radius) || !room.contains(nx, nz)) {
      // Try sliding left/right around the obstacle.
      let moved = false;
      for (const a of [Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2, (2 * Math.PI) / 3, (-2 * Math.PI) / 3]) {
        const c = Math.cos(a), s = Math.sin(a);
        const dx = dir.x * c - dir.z * s, dz = dir.x * s + dir.z * c;
        const tx = pos.x + dx * step, tz = pos.z + dz * step;
        if (!room.blockedAt(tx, tz, this.radius) && room.contains(tx, tz)) {
          nx = tx; nz = tz; moved = true;
          dir.set(dx, 0, dz);
          break;
        }
      }
      if (!moved) return dist;
    }
    // Keep a 0.6 m bubble around the player.
    const p = this.w.player.position(tmp2);
    const dp = Math.hypot(nx - p.x, nz - p.z);
    if (dp < 0.6) {
      const away = tmp2.set(nx - p.x, 0, nz - p.z).normalize();
      nx = p.x + away.x * 0.6;
      nz = p.z + away.z * 0.6;
    }
    pos.x = nx;
    pos.z = nz;
    pos.y = this.w.room.floorY;
    this.face(dir, dt);
    return Math.hypot(target.x - pos.x, target.z - pos.z);
  }

  /** Random reachable floor point within `radius` of `around`, at least `minFromPlayer` from the player. */
  protected pickPoint(around: Vector3, radius: number, minFromPlayer = 1.0): Vector3 {
    const p = this.w.player.position(tmp2);
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = radius * (0.4 + 0.6 * Math.random());
      const x = around.x + Math.cos(a) * r, z = around.z + Math.sin(a) * r;
      if (!this.w.room.contains(x, z) || this.w.room.blockedAt(x, z, this.radius)) continue;
      if (Math.hypot(x - p.x, z - p.z) < minFromPlayer) continue;
      return this.target.set(x, this.w.room.floorY, z);
    }
    return this.target.copy(around);
  }

  /** Apply damage. Returns true if this hit popped the gremlin. */
  hit(damage: number, headshot: boolean, style: string[] = []): boolean {
    if (!this.alive || this.inflate > 0) return false;
    this.hp -= damage * (headshot ? 2 : 1);
    this.avatar.setTint(new Color(2.5, 2.5, 2.5));
    this.flash = 0.08;
    this.w.voice.sfx('squeak_hit', this.root, 0.6);
    if (this.hp <= 0) {
      this.pop(headshot, style);
      return true;
    }
    return false;
  }

  /** Start the inflate-then-pop sequence. */
  pop(headshot = false, style: string[] = []): void {
    if (!this.alive || this.inflate > 0) return;
    this.inflate = 0.12;
    this.pendingPop = { headshot, style };
    this.w.voice.sfx('squeak_inflate', this.root, 0.8);
    this.w.seats.release(this.seat);
    this.seat = null;
  }

  private pendingPop: { headshot: boolean; style: string[] } | null = null;

  private finishPop(): void {
    const info = this.pendingPop ?? { headshot: false, style: [] };
    this.alive = false;
    const centre = this.root.position.clone().add(new Vector3(0, this.height * 0.5, 0));
    this.w.fx.pop(centre, this.color, 24);
    this.w.fx.ghost(centre);
    this.w.fx.text(centre, info.headshot ? 'BONK' : 'POP', info.headshot ? '#ffffff' : '#ffcc33');
    this.w.voice.sfx('pop', this.root, 1);
    this.w.voice.say('ghost', undefined, this.root);
    this.w.bus.emit('enemy:popped', { id: this.id, type: this.type, position: centre, headshot: info.headshot, style: info.style });
    this.dispose();
  }

  /** Despawn without a pop (cleanup, chapter end). */
  dispose(): void {
    this.alive = false;
    this.w.seats.release(this.seat);
    this.seat = null;
    this.w.world.remove(this.root);
    this.avatar.dispose();
  }

  /** Voice line with a per-gremlin cooldown. */
  say(emotion?: string, cooldown = 4): void {
    const now = performance.now() / 1000;
    if (now - this.lastSay < cooldown) return;
    this.lastSay = now;
    this.w.voice.say(this.speaker, emotion, this.root);
  }

  protected facing(out = new Vector3()): Vector3 {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  protected get up(): Vector3 {
    return UP;
  }
}
