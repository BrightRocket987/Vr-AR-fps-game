import { Color, type Object3D, Vector3 } from 'three';
import { Gremlin, type GremlinWorld, type VoiceLike } from './Gremlin';
import type { Avatar } from './Avatar';
import type { RoomModel, Volume } from '../room/RoomModel';

/** Scuttle speed at your feet (m/s). */
export const CRAWLER_SPEED = 1.4;
/** §6 rule 3: nothing approaches from behind faster than this. */
export const CRAWLER_REAR_SPEED = 1.0;
export const CRAWLER_HP = 2;
/** It bites from this close (outside the 0.6 m bubble). */
export const BITE_RANGE = 0.75;
export const BITE_DAMAGE = 3;
/** Latched on the ankle this long after the bite, then it retreats. */
export const LATCH_SECONDS = 1;
/** Hide this long (s) before peeking, and peek this long before scuttling out. */
export const HIDE_MIN = 2;
export const HIDE_MAX = 3.5;
export const PEEK_SECONDS = 1.2;
/** A hiding spot sits this far outside the furniture footprint. */
export const HIDE_MARGIN = 0.3;

const BEAN_MINT = new Color(0x7fd1b9);
const tmp = new Vector3();
const tmp2 = new Vector3();

export interface HideSpot {
  /** Open floor at the furniture's edge (where it peeks from and scuttles out of). */
  edge: Vector3;
  /** Under the furniture (tables only): where it tucks in. Null = it crouches behind at `edge`. */
  under: Vector3 | null;
  volumeId: string | null;
}

/**
 * Hiding spots, best first: under each table/desk (tucked in from the side away from the player), behind each
 * couch/bed (the side away from the player), else behind the nearest blockers; with no furniture at all, the
 * room corners farthest from the player. Every `edge` is open floor inside the room, so a Crawler is never only
 * reachable under furniture (§6 rule 5: nothing requires crouching).
 */
export function hidingSpots(room: RoomModel, player: Vector3, radius = 0.18): HideSpot[] {
  const out: Array<HideSpot & { score: number }> = [];
  const tables = room.tables;
  const couches = room.couches;
  let vols: Volume[] = [...tables, ...couches];
  if (vols.length === 0) vols = room.blockers.slice().sort((a, b) => a.center.distanceToSquared(player) - b.center.distanceToSquared(player)).slice(0, 4);
  for (const v of vols) {
    const c = Math.cos(v.yaw), s = Math.sin(v.yaw);
    // Local axes (see RoomModel.blockedAt): right = (cos, 0, -sin), depth = (sin, 0, cos).
    const right = new Vector3(c, 0, -s);
    const depth = new Vector3(s, 0, c);
    const sides: Array<[Vector3, number]> = [
      [right, v.size.x / 2],
      [right.clone().negate(), v.size.x / 2],
      [depth, v.size.z / 2],
      [depth.clone().negate(), v.size.z / 2],
    ];
    let best: { p: Vector3; d: number } | null = null;
    for (const [dir, half] of sides) {
      const p = new Vector3(v.center.x, room.floorY, v.center.z).addScaledVector(dir, half + HIDE_MARGIN + radius);
      if (!room.contains(p.x, p.z) || room.blockedAt(p.x, p.z, radius)) continue;
      const d = Math.hypot(p.x - player.x, p.z - player.z);
      if (!best || d > best.d) best = { p, d };
    }
    if (!best) continue;
    const isTable = v.label === 'table' || v.label === 'desk';
    out.push({ edge: best.p, under: isTable ? new Vector3(v.center.x, room.floorY, v.center.z) : null, volumeId: v.id, score: best.d + (isTable ? 1 : 0) });
  }
  if (out.length === 0 && room.bounds.length >= 3) {
    const centre = room.center();
    for (const b of room.bounds) {
      const p = new Vector3(b.x, room.floorY, b.y);
      p.lerp(new Vector3(centre.x, room.floorY, centre.z), Math.min(0.9, 0.6 / Math.max(0.6, p.distanceTo(centre))));
      if (!room.contains(p.x, p.z) || room.blockedAt(p.x, p.z, radius)) continue;
      out.push({ edge: p, under: null, volumeId: null, score: Math.hypot(p.x - player.x, p.z - player.z) });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.map(({ edge, under, volumeId }) => ({ edge, under, volumeId }));
}

/** Is `point` in the player's frontal hemisphere (horizontal)? */
export function inFront(player: Vector3, forward: Vector3, point: Vector3): boolean {
  return (point.x - player.x) * forward.x + (point.z - player.z) * forward.z >= 0;
}

type SayIdVoice = VoiceLike & { sayId?: (id: string, at: Object3D | null) => void };

/**
 * Crawler (roster #8): Bean on all fours in a footed onesie. HP 2, 1.4 m/s, 0.35 m. SNEAKs to a hiding spot (under
 * a table, behind a couch), HIDEs giggling, PEEKs out ("Peekaboo."), SCUTTLEs low across open floor at your feet,
 * ANKLE_BITEs (3, "Woof.") and latches 1 s, then RETREATs to a different spot and starts again. It always comes out
 * into open floor to attack; from behind it never moves faster than 1 m/s and giggles when it crosses 2 m.
 */
export class Crawler extends Gremlin {
  readonly type = 'crawler';
  readonly speaker = 'crawler';
  private spot: HideSpot | null = null;
  private lastSpotId: string | null = null;
  private hideFor = HIDE_MIN;
  private bitten = false;
  private warnedBehind = false;
  private tilt = 0;
  private giggleTimer = 1;

  constructor(w: GremlinWorld, avatar: Avatar) {
    super(w, avatar, { hp: CRAWLER_HP, speed: CRAWLER_SPEED, height: 0.35, color: BEAN_MINT.clone(), xp: 10, radius: 0.18 });
  }

  /** The current hiding spot (for tests and diagnostics). */
  get hideSpot(): HideSpot | null {
    return this.spot;
  }

  protected override onState(s: string): void {
    switch (s) {
      case 'spawn':
        this.avatar.play('walk');
        break;
      case 'sneak':
      case 'retreat':
        this.avatar.play('run');
        this.chooseSpot();
        break;
      case 'tuck':
        this.avatar.play('crouch', 0.2);
        break;
      case 'hide':
        this.avatar.play('crouch', 0.2);
        this.hideFor = HIDE_MIN + Math.random() * (HIDE_MAX - HIDE_MIN);
        this.sayLine('crawler_hee_hee', 'giggle');
        break;
      case 'peek':
        this.avatar.play('emote', 0.1, true);
        this.sayLine('crawler_peekaboo', 'giggle');
        break;
      case 'scuttle':
        this.avatar.play('run');
        this.bitten = false;
        this.warnedBehind = false;
        this.sayLine('crawler_doggy', 'giggle');
        break;
      case 'bite':
        this.avatar.play('attack', 0.05, true);
        break;
    }
  }

  protected tick(dt: number): void {
    const d = this.distToPlayer();
    // Low to the ground: lean the whole body forward while crawling, flatter while hiding, up while peeking.
    const wantTilt = this.state === 'peek' ? 0.35 : this.state === 'hide' || this.state === 'tuck' ? 0.95 : this.state === 'spawn' ? 0.5 : 0.8;
    this.tilt += (wantTilt - this.tilt) * Math.min(1, 8 * dt);
    this.avatar.root.rotation.x = this.tilt;
    switch (this.state) {
      case 'spawn': {
        this.root.position.addScaledVector(this.facing(tmp), CRAWLER_SPEED * 0.6 * dt);
        if (this.stateTime > 0.5) this.setState('sneak');
        break;
      }
      case 'sneak':
      case 'retreat': {
        const spot = this.spot;
        if (!spot) {
          this.setState('scuttle');
          break;
        }
        const left = this.moveToward(spot.edge, this.state === 'retreat' ? CRAWLER_SPEED : CRAWLER_REAR_SPEED, dt, 0.1);
        if (left < 0.15 || this.stateTime > 8) this.setState(spot.under ? 'tuck' : 'hide');
        break;
      }
      case 'tuck': {
        // Slide from the edge to just under the table (ignoring the footprint: it is a hiding spot, not a path).
        const spot = this.spot;
        if (spot?.under) this.slide(spot.under, 0.7, dt);
        if (this.stateTime > 0.6) this.setState('hide');
        break;
      }
      case 'hide': {
        this.giggleTimer -= dt;
        if (this.giggleTimer <= 0) {
          this.giggleTimer = 2.5 + Math.random() * 2;
          this.say('giggle', 2);
        }
        if (this.stateTime >= this.hideFor) this.setState('peek');
        break;
      }
      case 'peek': {
        // Back out to the open-floor edge (never attack from under the furniture).
        const spot = this.spot;
        if (spot) this.slide(spot.edge, 1.0, dt);
        this.facePlayer(dt);
        if (this.stateTime >= PEEK_SECONDS) {
          if (spot) this.root.position.set(spot.edge.x, this.w.room.floorY, spot.edge.z);
          this.setState('scuttle');
        }
        break;
      }
      case 'scuttle': {
        if (d <= BITE_RANGE) {
          this.setState('bite');
          break;
        }
        const p = this.w.player.position(tmp);
        const behind = !inFront(p, this.w.player.forward(tmp2), this.root.position);
        if (behind && d < 2 && !this.warnedBehind) {
          this.warnedBehind = true;
          this.sayLine('crawler_hee_hee', 'giggle');
        }
        this.moveToward(tmp.set(p.x, this.w.room.floorY, p.z), behind ? CRAWLER_REAR_SPEED : CRAWLER_SPEED, dt, BITE_RANGE - 0.1);
        if (this.stateTime > 10) this.setState('retreat');
        break;
      }
      case 'bite': {
        this.facePlayer(dt);
        if (!this.bitten && this.stateTime >= 0.15) {
          this.bitten = true;
          if (d <= BITE_RANGE + 0.15) {
            this.w.player.damage(BITE_DAMAGE, this.type);
            this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: BITE_DAMAGE });
            this.sayLine('crawler_woof', 'neutral');
            this.weaponHand.pulse(0.4, 60);
          }
        }
        if (this.stateTime >= 0.15 + LATCH_SECONDS) this.setState('retreat');
        break;
      }
    }
  }

  /** First hit that does not pop it: "No no no no." */
  override hit(damage: number, headshot: boolean, style: string[] = []): boolean {
    const popped = super.hit(damage, headshot, style);
    if (!popped && this.alive) this.say('whine', 3);
    return popped;
  }

  /** Pick a hiding spot different from the last one (falls back to scuttling straight at you). */
  private chooseSpot(): void {
    const spots = hidingSpots(this.w.room, this.w.player.position(tmp), this.radius);
    const key = (s: HideSpot) => s.volumeId ?? `${s.edge.x.toFixed(1)},${s.edge.z.toFixed(1)}`;
    const fresh = spots.filter((s) => key(s) !== this.lastSpotId);
    const pool = (fresh.length ? fresh : spots).slice(0, 3);
    this.spot = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    this.lastSpotId = this.spot ? key(this.spot) : null;
  }

  /** Straight slide toward a point at `speed`, ignoring blockers (tucking under / backing out of a table). */
  private slide(target: Vector3, speed: number, dt: number): void {
    const pos = this.root.position;
    const dx = target.x - pos.x, dz = target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-3) return;
    const step = Math.min(dist, speed * dt);
    pos.x += (dx / dist) * step;
    pos.z += (dz / dist) * step;
    pos.y = this.w.room.floorY;
  }

  private sayLine(id: string, emotion: string): void {
    const v = this.w.voice as SayIdVoice;
    if (typeof v.sayId === 'function') v.sayId(id, this.root);
    else v.say(this.speaker, emotion, this.root);
  }
}
