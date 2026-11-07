import { Color, DoubleSide, Mesh, MeshBasicMaterial, RingGeometry, Vector3 } from 'three';
import { Gremlin, type GremlinWorld } from './Gremlin';
import type { Avatar } from './Avatar';

export const SIREN_COLOR = 0xff7ab6;

// Pooled: one ring geometry for every Siren; each instance clones only the (cheap) material for its fade.
const RING_GEO = new RingGeometry(0.9, 1.0, 40);
const RING_MAT = new MeshBasicMaterial({ color: SIREN_COLOR, transparent: true, opacity: 0.5, side: DoubleSide, depthWrite: false });

const UP = new Vector3(0, 1, 0);
const APPROACH_RANGE = 3.0;
const INHALE_TIME = 2.5;
const SCREAM_TIME = 1.5;
const SCREAM_RADIUS = 5;
const EXHAUSTED_TIME = 3.0;
const EXHAUSTED_DAMAGE_MULT = 3;
const SHUSH_DIST = 0.15;
const SHUSH_TIME = 1.0;
const SHUSH_RANGE = 3.0; // headset shush works within this distance of the Siren
const RING_LEAD = 0.5; // the scream ring shows this long before the sound
const MIN_APPROACH = 1.0; // catches its breath before the next inhale

const tmp = new Vector3();
const tmp2 = new Vector3();
const tmp3 = new Vector3();

/**
 * Siren: walks to 3 m (a corner or beside a table if one is handy), inhales for 2.5 s while its chest
 * grows, then screams (5 m ring; the chapter buffs the crowd and shakes the reticle) and is exhausted
 * for 3 s at triple damage. Shush it mid-inhale with the empty off hand to skip the scream.
 * HP 3, 0.9 m/s, 0.7 m, xp 20 (+25 Shushed), cost 3.
 */
export class Siren extends Gremlin {
  readonly type = 'siren';
  readonly speaker = 'siren';
  private readonly perch = new Vector3();
  private perchIsTable = false;
  private repick = 0;
  private shushTimer = 0;
  private popping = false;
  private readonly ring: Mesh;
  private readonly ringMat: MeshBasicMaterial;

  constructor(w: GremlinWorld, avatar: Avatar) {
    super(w, avatar, { hp: 3, speed: 0.9, height: 0.7, color: new Color(SIREN_COLOR), xp: 20, radius: 0.24 });
    this.ringMat = RING_MAT.clone();
    this.ring = new Mesh(RING_GEO, this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.02;
    this.ring.visible = false;
    this.ring.frustumCulled = false;
    this.root.add(this.ring);
  }

  /** Cumulative seconds the off hand has been shushing this inhale (for tests/HUD). */
  get shushProgress(): number {
    return this.shushTimer;
  }
  get perchPoint(): Vector3 {
    return this.perch;
  }

  protected override onState(s: string): void {
    switch (s) {
      case 'spawn':
        this.avatar.play('walk');
        break;
      case 'approach':
        this.avatar.play('walk');
        this.avatar.setStretch(1);
        this.ring.visible = false;
        this.pickPerch();
        this.repick = 0;
        break;
      case 'inhale':
        this.avatar.play('idle', 0.1);
        this.shushTimer = 0;
        this.ring.visible = false;
        this.w.bus.emit('siren:inhale', { id: this.id });
        this.say('whine', 0); // "I... I... I..."
        this.w.fx.text(this.headPosition(tmp), '...', '#ffffff');
        break;
      case 'scream':
        this.avatar.play('emote', 0.05);
        this.w.bus.emit('siren:scream', { id: this.id, position: this.root.position.clone(), radius: SCREAM_RADIUS });
        this.w.voice.sfx('scream_siren', this.root, 1);
        this.say('scream', 0); // "AAAAAAA"
        this.ring.visible = true;
        break;
      case 'exhausted':
        this.avatar.play('crouch', 0.1);
        this.avatar.setStretch(1);
        this.ring.visible = false;
        break;
    }
  }

  protected tick(dt: number): void {
    const d = this.distToPlayer();
    switch (this.state) {
      case 'spawn': {
        const fwd = this.facing(tmp);
        this.root.position.addScaledVector(fwd, this.speed * 0.8 * dt);
        if (this.stateTime > 0.8) this.setState('approach');
        break;
      }
      case 'approach': {
        this.repick += dt;
        if (this.repick > 2.5 && d > APPROACH_RANGE + 2) {
          // The player wandered off: find a new perch.
          this.pickPerch();
          this.repick = 0;
        }
        const left = this.moveToward(this.perch, this.speed, dt, 0.15);
        if (left < 0.3) this.facePlayer(dt);
        const settled = left < 0.3 && this.stateTime > MIN_APPROACH;
        if ((settled && d <= APPROACH_RANGE + 1.5) || (this.stateTime > 12 && d < 6)) this.setState('inhale');
        break;
      }
      case 'inhale': {
        this.facePlayer(dt);
        const t = Math.min(1, this.stateTime / INHALE_TIME);
        this.avatar.setStretch(1 + 0.5 * t);
        // Scream ring: appears 0.5 s before the sound.
        if (this.stateTime >= INHALE_TIME - RING_LEAD) {
          const k = (this.stateTime - (INHALE_TIME - RING_LEAD)) / RING_LEAD;
          this.ring.visible = true;
          this.ring.scale.setScalar(0.3 + 0.7 * Math.min(1, k));
          this.ringMat.opacity = 0.5;
        }
        if (this.shushing()) {
          this.shushTimer += dt;
          if (this.shushTimer >= SHUSH_TIME) {
            this.shushed();
            break;
          }
        }
        if (this.stateTime >= INHALE_TIME) this.setState('scream');
        break;
      }
      case 'scream': {
        const t = Math.min(1, this.stateTime / SCREAM_TIME);
        this.avatar.setStretch(1.5 - 0.5 * t);
        this.ring.scale.setScalar(1 + (SCREAM_RADIUS - 1) * t);
        this.ringMat.opacity = 0.6 * (1 - t);
        if (this.stateTime >= SCREAM_TIME) this.setState('exhausted');
        break;
      }
      case 'exhausted': {
        if (this.stateTime >= EXHAUSTED_TIME) this.setState('approach');
        break;
      }
    }
  }

  override update(dt: number): void {
    const wasAlive = this.alive;
    super.update(dt);
    if (wasAlive && !this.alive && this.popping) {
      // Pops into "AAA" letters.
      const centre = this.root.position.clone().add(tmp.set(0, this.height * 0.6, 0));
      for (const dx of [-0.18, 0, 0.18]) this.w.fx.text(tmp2.copy(centre).add(tmp3.set(dx, Math.abs(dx) * 0.5, 0)), 'A', '#ff7ab6');
    }
  }

  override hit(damage: number, headshot: boolean, style: string[] = []): boolean {
    if (!this.alive) return false;
    const dmg = this.state === 'exhausted' ? damage * EXHAUSTED_DAMAGE_MULT : damage;
    let s = style;
    if (this.state === 'inhale' && this.hp - dmg * (headshot ? 2 : 1) <= 0) {
      s = [...style, 'SHUSHED'];
      this.w.fx.text(this.headPosition(tmp), 'SHUSHED!', '#ff7ab6');
    }
    return super.hit(dmg, headshot, s);
  }

  override pop(headshot = false, style: string[] = []): void {
    if (!this.alive) return;
    this.popping = true;
    this.ring.visible = false;
    super.pop(headshot, style);
  }

  override dispose(): void {
    this.ringMat.dispose(); // the clone only; the geometry is pooled
    super.dispose();
  }

  // ---- helpers ------------------------------------------------------------------------------------

  /**
   * The empty off hand within 0.15 m of the Siren's head, or (the `01` version) within 0.15 m of the
   * player's own headset while the Siren is within 3 m. Both feed the same cumulative 1 s timer.
   */
  private shushing(): boolean {
    const off = this.w.offHand();
    if (!off.connected) return false;
    if (off.position.distanceTo(this.headPosition(tmp)) <= SHUSH_DIST) return true;
    const head = this.w.player.position(tmp2);
    return off.position.distanceTo(head) <= SHUSH_DIST && this.distToPlayer() <= SHUSH_RANGE;
  }

  private shushed(): void {
    this.w.bus.emit('siren:shushed', { id: this.id });
    this.w.fx.text(this.headPosition(tmp), 'SHH', '#ffffff');
    this.say('whine', 0); // "I wasn't even screaming."
    this.w.offHand().pulse(0.4, 80);
    this.setState('exhausted');
  }

  /**
   * Prefer standing beside a table or in a corner about 3 m from the player; otherwise stop on the line
   * to the player at 3 m (or stay put when already within range).
   */
  private pickPerch(): void {
    const room = this.w.room;
    const p = this.w.player.position(tmp2);
    const me = this.root.position;
    const best: { v: { x: number; z: number; score: number; table: boolean } | null } = { v: null };
    const consider = (x: number, z: number, table: boolean): void => {
      if (!room.contains(x, z) || room.blockedAt(x, z, this.radius)) return;
      const dp = Math.hypot(x - p.x, z - p.z);
      if (dp < 1.5 || dp > 4.5) return;
      const score = Math.abs(dp - APPROACH_RANGE) + 0.4 * Math.hypot(x - me.x, z - me.z) - (table ? 0.6 : 0);
      if (!best.v || score < best.v.score) best.v = { x, z, score, table };
    };
    for (const v of room.tables) {
      const right = tmp.set(Math.cos(v.yaw), 0, -Math.sin(v.yaw));
      const fwd = tmp3.crossVectors(UP, right).normalize();
      const rx = v.size.x / 2 + this.radius + 0.15, rz = v.size.z / 2 + this.radius + 0.15;
      consider(v.center.x + right.x * rx, v.center.z + right.z * rx, true);
      consider(v.center.x - right.x * rx, v.center.z - right.z * rx, true);
      consider(v.center.x + fwd.x * rz, v.center.z + fwd.z * rz, true);
      consider(v.center.x - fwd.x * rz, v.center.z - fwd.z * rz, true);
    }
    const c = room.center();
    for (const b of room.bounds) {
      const dx = c.x - b.x, dz = c.z - b.y;
      const l = Math.hypot(dx, dz) || 1;
      consider(b.x + (dx / l) * 0.45, b.y + (dz / l) * 0.45, false);
    }
    const chosen = best.v;
    if (chosen) {
      this.perch.set(chosen.x, room.floorY, chosen.z);
      this.perchIsTable = chosen.table;
      return;
    }
    this.perchIsTable = false;
    const toMe = tmp.set(me.x - p.x, 0, me.z - p.z);
    const dist = toMe.length();
    if (dist <= APPROACH_RANGE + 0.2 && dist >= 1.0) {
      this.perch.copy(me);
      return;
    }
    if (dist < 1e-3) toMe.set(0, 0, 1);
    else toMe.divideScalar(dist);
    const x = p.x + toMe.x * APPROACH_RANGE, z = p.z + toMe.z * APPROACH_RANGE;
    if (room.contains(x, z) && !room.blockedAt(x, z, this.radius)) this.perch.set(x, room.floorY, z);
    else this.perch.copy(this.pickPoint(p, APPROACH_RANGE, 1.5));
  }

  /** True when the chosen perch is beside a table (for tests/debug). */
  get onTablePerch(): boolean {
    return this.perchIsTable;
  }
}
