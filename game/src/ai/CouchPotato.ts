import { BoxGeometry, Color, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Object3D, SphereGeometry, Vector3 } from 'three';
import { Gremlin, type GremlinWorld } from './Gremlin';
import type { Avatar } from './Avatar';
import type { Seat, Volume } from '../room/RoomModel';

/** Popcorn-coloured confetti for the pop and the floor splats. */
export const POPCORN_COLOR = new Color(0xfff1b8);
export const POTATO_COLOR = 0xf4d35e;

// Pooled geometry/materials: allocated once per page load and shared by every Potato that ever spawns.
const POPCORN_GEO = new SphereGeometry(0.045, 8, 6);
const POPCORN_MAT = new MeshStandardMaterial({ color: 0xfff1b8, roughness: 0.9 });
const CUSHION_GEO = new BoxGeometry(0.36, 0.12, 0.36);
const CUSHION_MAT = new MeshStandardMaterial({ color: 0x8e7cc3, roughness: 1 });
const HIDDEN = new Matrix4().makeTranslation(0, -100, 0);

const POPCORN_SLOTS = 6;
const GRAVITY = -5; // cartoon gravity so the arc reads
const THROW_SPEED = 6; // m/s along the arc
const HIT_RADIUS = 0.45; // arrival test against the player's current head
const THROW_PERIOD = 4;
const BOUNCE_PERIOD = 2;
const TELL_LEAD = 0.5;
const SIT_INVULNERABLE = 0.5;
const EVICT_RADIUS = 0.8;
const SHOVE_DISTANCE = 1.0;
const SHOVE_TIME = 0.3;
const SLAPS_TO_EVICT = 3;
const CLOSE_THROW_RANGE = 1.0;

const tmp = new Vector3();
const tmp2 = new Vector3();
const tmp3 = new Vector3();

interface Shot {
  active: boolean;
  cushion: boolean;
  damage: number;
  age: number;
  spin: number;
  readonly pos: Vector3;
  readonly vel: Vector3;
}

/**
 * Kinematic popcorn (one InstancedMesh) and one cushion (one Mesh): two draw calls for everything a
 * Potato ever throws. Arcs are solved so the shot lands on the aim point after `dist / THROW_SPEED` s.
 */
export class PopcornPool {
  readonly popcorn: InstancedMesh;
  readonly cushion: Mesh;
  private readonly shots: Shot[] = [];
  private readonly dummy = new Object3D();
  private parent: Group | null;

  constructor(parent: Group) {
    this.parent = parent;
    this.popcorn = new InstancedMesh(POPCORN_GEO, POPCORN_MAT, POPCORN_SLOTS);
    this.popcorn.frustumCulled = false;
    for (let i = 0; i < POPCORN_SLOTS; i++) {
      this.popcorn.setMatrixAt(i, HIDDEN);
      this.shots.push({ active: false, cushion: false, damage: 0, age: 0, spin: 0, pos: new Vector3(), vel: new Vector3() });
    }
    this.popcorn.instanceMatrix.needsUpdate = true;
    this.cushion = new Mesh(CUSHION_GEO, CUSHION_MAT);
    this.cushion.visible = false;
    this.cushion.frustumCulled = false;
    this.shots.push({ active: false, cushion: true, damage: 0, age: 0, spin: 0, pos: new Vector3(), vel: new Vector3() });
    parent.add(this.popcorn, this.cushion);
  }

  get inFlight(): number {
    return this.shots.filter((s) => s.active).length;
  }

  /** Launch toward `to`. Returns false when the pool is full (cushion already flying / six popcorns out). */
  throw(from: Vector3, to: Vector3, cushion: boolean, damage: number): boolean {
    const s = cushion ? this.shots[POPCORN_SLOTS] : this.shots.find((x, i) => i < POPCORN_SLOTS && !x.active);
    if (!s || s.active) return false;
    const dist = Math.max(0.2, from.distanceTo(to));
    const t = Math.min(1.6, Math.max(0.35, dist / THROW_SPEED));
    s.vel.copy(to).sub(from).divideScalar(t);
    s.vel.y -= 0.5 * GRAVITY * t;
    s.pos.copy(from);
    s.active = true;
    s.age = 0;
    s.damage = damage;
    s.spin = (Math.random() - 0.5) * 12;
    if (cushion) this.cushion.visible = true;
    return true;
  }

  /** Integrate; `onHit` fires when a shot reaches the head, `onFloor` when it lands or times out. */
  update(dt: number, head: Vector3, floorY: number, onHit: (s: Shot) => void, onFloor: (s: Shot) => void): void {
    let any = false;
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      if (!s.active) continue;
      any = true;
      s.age += dt;
      s.vel.y += GRAVITY * dt;
      s.pos.addScaledVector(s.vel, dt);
      if (s.pos.distanceTo(head) <= HIT_RADIUS) {
        s.active = false;
        onHit(s);
      } else if (s.pos.y < floorY || s.age > 3) {
        s.active = false;
        onFloor(s);
      }
      if (s.cushion) {
        this.cushion.visible = s.active;
        if (s.active) {
          this.cushion.position.copy(s.pos);
          this.cushion.rotation.x += s.spin * dt;
          this.cushion.rotation.z += s.spin * 0.5 * dt;
        }
      } else if (s.active) {
        this.dummy.position.copy(s.pos);
        this.dummy.rotation.set(s.spin * s.age, s.spin * 0.7 * s.age, 0);
        this.dummy.updateMatrix();
        this.popcorn.setMatrixAt(i, this.dummy.matrix);
      } else {
        this.popcorn.setMatrixAt(i, HIDDEN);
      }
    }
    if (any) this.popcorn.instanceMatrix.needsUpdate = true;
  }

  /** Remove the meshes from the scene. Geometry and materials are pooled, so they are not disposed. */
  dispose(): void {
    if (!this.parent) return;
    this.parent.remove(this.popcorn, this.cushion);
    this.parent = null;
  }
}

interface Shove {
  g: Gremlin;
  dir: Vector3;
  left: number;
}

/**
 * Couch Potato: walks to the couch, evicts whoever is sitting there, sits (briefly invulnerable), bounces
 * every 2 s and throws popcorn every 4 s (every third throw a view-blocking cushion, with a tell).
 * Three Wipe slaps evict it; then it roams like a Scamp and throws popcorn from range.
 * HP 4, 1.2 m/s (1.6 once evicted), 0.65 m, xp 20, cost 3.
 */
export class CouchPotato extends Gremlin {
  readonly type = 'potato';
  readonly speaker = 'potato';
  readonly pool: PopcornPool;
  private readonly dest = new Vector3();
  private readonly roamTarget = new Vector3();
  private floorSit = false;
  private seatVolume: Volume | null = null;
  private evicted = false;
  private slaps = 0;
  private bounceTimer = 0;
  private hopT = 1;
  private throwTimer = 0;
  private throwCount = 0;
  private toldCushion = false;
  private closeThrowCooldown = 0;
  private reseat = 0;
  private lastLeft = Infinity;
  private stall = 0;
  private restY = 0;
  private popping = false;
  private readonly shoves: Shove[] = [];

  constructor(w: GremlinWorld, avatar: Avatar) {
    super(w, avatar, { hp: 4, speed: 1.2, height: 0.65, color: new Color(POTATO_COLOR), xp: 20, radius: 0.24 });
    this.pool = new PopcornPool(w.world);
  }

  /** Popcorn thrown so far (seated cadence + roaming throws). */
  get throwsMade(): number {
    return this.throwCount;
  }
  get slapCount(): number {
    return this.slaps;
  }
  get wasEvicted(): boolean {
    return this.evicted;
  }

  protected override onState(s: string): void {
    switch (s) {
      case 'spawn':
        this.avatar.play('walk');
        break;
      case 'gotocouch':
        this.avatar.play('walk');
        this.chooseDestination();
        this.lastLeft = Infinity;
        this.stall = 0;
        break;
      case 'sit':
        this.avatar.play('sit', 0.2);
        this.say('neutral', 2);
        this.bounceTimer = 0;
        this.throwTimer = 0;
        this.toldCushion = false;
        this.hopT = 1;
        this.restY = this.root.position.y;
        break;
      case 'roam':
        this.avatar.play('walk');
        this.roamTarget.copy(this.pickPoint(this.w.player.position(tmp), 2.5, 1.0));
        break;
      case 'chase':
        this.avatar.play('run');
        break;
      case 'windup':
        this.avatar.play('emote');
        this.say('whine');
        break;
      case 'throw':
        this.avatar.play('attack', 0.05, true);
        break;
      case 'recover':
        this.avatar.play('idle');
        break;
    }
  }

  protected tick(dt: number): void {
    this.updateShoves(dt);
    if (this.closeThrowCooldown > 0) this.closeThrowCooldown -= dt;
    const d = this.distToPlayer();
    switch (this.state) {
      case 'spawn': {
        const fwd = this.facing(tmp);
        this.root.position.addScaledVector(fwd, this.speed * 0.8 * dt);
        if (this.stateTime > 0.8) this.setState('gotocouch');
        break;
      }
      case 'gotocouch': {
        const spd = this.cappedSpeed(this.speed);
        const left = this.moveToward(this.dest, spd, dt, 0.1);
        if (left < this.lastLeft - 0.01) {
          this.lastLeft = left;
          this.stall = 0;
        } else {
          this.stall += dt;
        }
        // A seat sits inside the couch footprint (a blocker), so "arrived" is reaching the front edge.
        const reach = this.floorSit ? 0.25 : 0.65;
        if (left < reach || (this.stall > 0.6 && left < 1.3)) this.arrive();
        else if (this.stateTime > 12) this.giveUpAndSitHere();
        break;
      }
      case 'sit': {
        this.bounceTimer += dt;
        this.throwTimer += dt;
        this.hopT += dt;
        if (this.reseat > 0) {
          this.reseat -= dt;
          if (this.reseat <= 0) this.avatar.play('sit', 0.1, true);
        }
        if (this.bounceTimer >= BOUNCE_PERIOD) {
          this.bounceTimer -= BOUNCE_PERIOD;
          this.hopT = 0;
          this.avatar.play('sit', 0.05, true);
          this.say('giggle', 6);
        }
        this.root.position.y = this.restY + (this.hopT < 0.4 ? Math.sin((this.hopT / 0.4) * Math.PI) * 0.05 : 0);
        const cushionNext = this.throwCount % 3 === 2;
        if (cushionNext && !this.toldCushion && this.throwTimer >= THROW_PERIOD - TELL_LEAD) {
          // Tell: raises the remote. "Shh, this is the good part."
          this.toldCushion = true;
          this.say('neutral', 0);
          this.avatar.play('pickup', 0.1, true);
          this.reseat = TELL_LEAD + 0.6;
        }
        if (this.throwTimer >= THROW_PERIOD) {
          this.throwTimer -= THROW_PERIOD;
          this.throwAt(cushionNext);
          this.throwCount++;
          this.toldCushion = false;
        } else if (d < CLOSE_THROW_RANGE && this.closeThrowCooldown <= 0) {
          // Too close to the screen: pelt immediately (popcorn only; cushions always get their tell).
          this.throwAt(false);
          this.closeThrowCooldown = 1.5;
        }
        break;
      }
      case 'roam': {
        const spd = this.cappedSpeed(this.speed * 0.8);
        const left = this.moveToward(this.roamTarget, spd, dt, 0.15);
        if (d < 4) this.setState('chase');
        else if (left < 0.2 || this.stateTime > 4) this.setState('roam');
        break;
      }
      case 'chase': {
        if (d > 2.0) {
          const spd = this.cappedSpeed(this.speed);
          this.moveToward(this.w.player.position(tmp), spd, dt, 1.8);
        } else {
          this.setState('windup');
        }
        if (d > 7) this.setState('roam');
        break;
      }
      case 'windup': {
        this.facePlayer(dt);
        if (this.stateTime > 0.4) this.setState(d < 3.5 ? 'throw' : 'chase');
        break;
      }
      case 'throw': {
        this.facePlayer(dt);
        if (this.stateTime > 0.15 && this.stateTime - dt <= 0.15) {
          this.throwAt(false);
          this.throwCount++;
        }
        if (this.stateTime > 0.5) this.setState('recover');
        break;
      }
      case 'recover': {
        if (this.stateTime > 0.8) this.setState('chase');
        break;
      }
    }
  }

  override update(dt: number): void {
    if (this.alive) {
      // Shots keep flying while the Potato itself inflates.
      const head = this.w.player.position(tmp3);
      this.pool.update(dt, head, this.w.room.floorY, (s) => this.onShotHit(s), (s) => this.onShotFloor(s));
    }
    const wasAlive = this.alive;
    super.update(dt);
    if (wasAlive && !this.alive && this.popping) {
      // Pops into popcorn.
      const centre = this.root.position.clone().add(tmp.set(0, this.height * 0.5, 0));
      this.w.fx.pop(centre, POPCORN_COLOR, 20);
      this.w.voice.sfx('confetti', null, 0.6);
    }
  }

  override hit(damage: number, headshot: boolean, style: string[] = []): boolean {
    if (!this.alive) return false;
    if (this.state === 'sit') {
      if (this.stateTime < SIT_INVULNERABLE) return false; // settling onto the cushion: untouchable
      if (style.includes('SLAP')) {
        // Slaps shove rather than hurt a sitter: three of them evict.
        this.slaps++;
        this.hopT = 0;
        this.w.voice.sfx('knock', this.root, 0.4);
        if (this.slaps >= SLAPS_TO_EVICT) this.evictSelf();
        else this.say('whine', 1);
        return false;
      }
    }
    return super.hit(damage, headshot, style);
  }

  override pop(headshot = false, style: string[] = []): void {
    if (!this.alive) return;
    this.popping = true;
    super.pop(headshot, style);
  }

  override dispose(): void {
    this.pool.dispose();
    this.shoves.length = 0;
    super.dispose();
  }

  // ---- destinations -------------------------------------------------------------------------------

  /** Reserve the nearest free seat that is not on top of the player; otherwise the room centre. */
  private chooseDestination(): void {
    const p = this.w.player.position(tmp2);
    const rejected: Seat[] = [];
    let seat: Seat | null = null;
    for (let i = 0; i < 4; i++) {
      const s = this.w.seats.reserve(this.id, this.root.position);
      if (!s) break;
      if (Math.hypot(s.position.x - p.x, s.position.z - p.z) >= 0.8) {
        seat = s;
        break;
      }
      rejected.push(s);
    }
    for (const r of rejected) this.w.seats.release(r);
    if (seat) {
      this.seat = seat;
      this.seatVolume = this.w.room.volumes.find((v) => v.id === seat.volumeId) ?? null;
      this.floorSit = false;
      this.dest.copy(seat.position);
      return;
    }
    // No couch (or every seat is under the player): sit cross-legged in the room centre.
    this.floorSit = true;
    this.seatVolume = null;
    const c = this.w.room.center();
    if (Math.hypot(c.x - p.x, c.z - p.z) < 1.0) {
      this.dest.copy(this.pickPoint(c, 1.5, 1.0));
    } else {
      this.dest.copy(c);
    }
    this.dest.y = this.w.room.floorY;
  }

  private arrive(): void {
    if (!this.floorSit && this.seat) {
      this.evictNear(this.seat.position);
      this.root.position.copy(this.seat.position);
      this.face(this.seat.facing, 1, 100);
    } else {
      this.root.position.y = this.w.room.floorY;
    }
    this.setState('sit');
  }

  private giveUpAndSitHere(): void {
    this.w.seats.release(this.seat);
    this.seat = null;
    this.seatVolume = null;
    this.floorSit = true;
    this.root.position.y = this.w.room.floorY;
    this.setState('sit');
  }

  /** Shove every other sitter within 0.8 m off the couch: "Scoot." */
  private evictNear(at: Vector3): void {
    for (const other of this.w.gremlins()) {
      if (other.id === this.id || !other.alive || other.state !== 'sit') continue;
      if (Math.hypot(other.position.x - at.x, other.position.z - at.z) > EVICT_RADIUS) continue;
      const facing = other.seat?.facing ?? this.seat?.facing ?? null;
      this.w.seats.release(other.seat);
      other.seat = null;
      // Mostly forward off the cushion (so it clears the couch footprint), a little away from us.
      const dir = tmp.set(other.position.x - at.x, 0, other.position.z - at.z);
      if (dir.lengthSq() < 1e-6) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      dir.normalize().multiplyScalar(0.6);
      if (facing) dir.addScaledVector(facing, 1.0);
      dir.setY(0).normalize();
      const shoveDir = dir.clone(); // before setState: another Potato's onState reuses this module's temps
      other.root.position.y = this.w.room.floorY;
      other.setState('roam');
      this.shoves.push({ g: other, dir: shoveDir, left: SHOVE_DISTANCE });
      this.w.bus.emit('potato:evicted', { id: other.id });
    }
    if (this.shoves.length) {
      this.say('neutral', 0);
      this.w.voice.sfx('knock', this.root, 0.5);
    }
  }

  /** Slide shoved gremlins 1 m over 0.3 s, staying in bounds and outside the player's 0.6 m bubble. */
  private updateShoves(dt: number): void {
    if (this.shoves.length === 0) return;
    const p = this.w.player.position(tmp2);
    const room = this.w.room;
    for (let i = this.shoves.length - 1; i >= 0; i--) {
      const s = this.shoves[i];
      if (!s.g.alive || s.left <= 0) {
        this.shoves.splice(i, 1);
        continue;
      }
      const step = Math.min(s.left, (SHOVE_DISTANCE / SHOVE_TIME) * dt);
      const pos = s.g.root.position;
      const nx = pos.x + s.dir.x * step, nz = pos.z + s.dir.z * step;
      if (!room.contains(nx, nz) || Math.hypot(nx - p.x, nz - p.z) < 0.6) {
        this.shoves.splice(i, 1);
        continue;
      }
      pos.x = nx;
      pos.z = nz;
      s.left -= step;
      if (s.left <= 0) this.shoves.splice(i, 1);
    }
  }

  /** Three slaps: off the couch and into a sulk. "I was WATCHING that!" */
  private evictSelf(): void {
    this.standUp();
    this.evicted = true;
    this.slaps = 0;
    this.speed = 1.6; // roams at Scamp speed
    this.say('whine', 0);
    this.w.bus.emit('potato:evicted', { id: this.id });
    this.setState('roam');
  }

  /** Leave the seat and step clear of the couch footprint so pathing is not stuck inside a blocker. */
  private standUp(): void {
    const seat = this.seat;
    const v = this.seatVolume;
    this.w.seats.release(seat);
    this.seat = null;
    this.seatVolume = null;
    this.floorSit = false;
    if (seat && v) {
      const clear = v.size.z / 2 - v.size.z * 0.15 + this.radius + 0.1;
      const p = this.w.player.position(tmp2);
      const x = seat.position.x + seat.facing.x * clear, z = seat.position.z + seat.facing.z * clear;
      if (this.w.room.contains(x, z) && Math.hypot(x - p.x, z - p.z) >= 0.6) {
        this.root.position.set(x, this.w.room.floorY, z);
      } else {
        this.root.position.copy(this.pickPoint(seat.position, 1.2, 0.8));
      }
    }
    this.root.position.y = this.w.room.floorY;
    this.avatar.setStretch(1);
  }

  // ---- throwing -----------------------------------------------------------------------------------

  private throwAt(cushion: boolean): void {
    const from = tmp.copy(this.root.position);
    from.y += this.height * 0.75;
    from.addScaledVector(this.facing(tmp2), 0.2);
    const to = this.w.player.position(tmp2);
    let ok = this.pool.throw(from, to, cushion, cushion ? 6 : 2);
    if (!ok && cushion) ok = this.pool.throw(from, to, false, 2);
    if (!ok) return;
    this.w.voice.sfx('thwip', this.root, cushion ? 0.6 : 0.35);
    if (this.state === 'sit') {
      this.avatar.play('attack', 0.05, true);
      this.reseat = 0.5;
    }
  }

  private onShotHit(s: Shot): void {
    this.w.player.damage(s.damage, this.type);
    this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: s.damage });
    if (s.cushion) {
      this.w.bus.emit('potato:cushion', { id: this.id, seconds: 1 });
      this.w.voice.sfx('diaper_plap', null, 0.7);
      this.say('giggle', 2);
    } else {
      this.w.voice.sfx('ui_click', null, 0.4);
    }
  }

  private onShotFloor(s: Shot): void {
    if (!s.cushion) this.w.fx.pop(s.pos, POPCORN_COLOR, 3);
  }

  /** Safety rule 3: anything in the player's rear hemisphere moves at <= 1.0 m/s. */
  private cappedSpeed(speed: number): number {
    const p = this.w.player.position(tmp2);
    const f = this.w.player.forward(tmp3).setY(0);
    const toMe = tmp.set(this.root.position.x - p.x, 0, this.root.position.z - p.z);
    return f.dot(toMe) < 0 ? Math.min(speed, 1.0) : speed;
  }
}
