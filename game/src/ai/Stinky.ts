import { Color, DoubleSide, Group, Mesh, MeshBasicMaterial, RingGeometry, Vector3 } from 'three';
import { Gremlin, type GremlinWorld } from './Gremlin';
import type { Avatar } from './Avatar';
import type { DiaperTarget } from './Wipe';

export const RING_SECONDS = 10;
/** The ring's second line ("Change my diaper!") fires with this much left. */
export const RING_SCREAM_AT = 5;
export const DEMAND_DISTANCE = 1.5;
export const DETONATE_DAMAGE = 15;
export const DETONATE_RADIUS = 3;
export const CLOUD_POPPED = { radius: 1.5, seconds: 3, fireRatePenalty: 0.2 } as const;
export const CLOUD_DETONATE = { radius: 3, seconds: 5, fireRatePenalty: 0.3 } as const;
/** Scamps that waddle out of a detonation ("Ew."). */
export const DETONATE_SPAWNS = 2;
/** The friendly pop comes this long after "Thank you." */
export const CHANGED_POP_DELAY = 0.7;
/** §6 rule 1: nothing is asked to spawn inside this distance of the player. */
export const SPAWN_CLEARANCE = 1.0;

// Pooled ring geometry: the countdown ring and the smaller change-progress ring.
const RING_GEO = new RingGeometry(0.12, 0.15, 24);
const PROGRESS_GEO = new RingGeometry(0.07, 0.1, 24);
const PROGRESS_MAT = new MeshBasicMaterial({ color: 0x3fd6c8, side: DoubleSide, transparent: true, opacity: 0.95, depthWrite: false });
const GREEN = new Color(0x9bd770);
const RED_FACE = new Color(1.5, 0.75, 0.75);
const Z_AXIS = new Vector3(0, 0, 1);

const tmp = new Vector3();
const tmp2 = new Vector3();
const tmp3 = new Vector3();

/**
 * The diaper bomber. HP 3, 0.8 m/s, 0.5 m. WADDLEs to 1.5 m, squats and DEMANDs a change with a 10 s ring
 * over its head. Three ends: CHANGED by a Wipe sweep (friendly pop, +50), POPPED by the gun (small stink
 * cloud) or DETONATE when the ring runs out (big cloud, 15 damage within 3 m, two Scamps). Clouds and the
 * fire-rate penalty are the chapter's: this class only emits `stinky:cloud`. Two extra draw calls (rings).
 */
export class Stinky extends Gremlin implements DiaperTarget {
  readonly type = 'stinky';
  readonly speaker = 'stinky';
  /** Seconds left on the ring while in DEMAND (RING_SECONDS before it starts). */
  ringLeft = RING_SECONDS;
  /** 0..1, written by the Wipe while it sweeps. */
  changeProgress = 0;
  private readonly rings = new Group();
  private readonly ring: Mesh;
  private readonly ringMat: MeshBasicMaterial;
  private readonly progress: Mesh;
  private screamed = false;
  private saidNear = false;
  private tintTimer = 0;
  private waddleT = 0;

  constructor(w: GremlinWorld, avatar: Avatar) {
    super(w, avatar, { hp: 3, speed: 0.8, height: 0.5, color: GREEN.clone(), xp: 15, radius: 0.2 });
    this.ringMat = new MeshBasicMaterial({ color: 0xffcc33, side: DoubleSide, transparent: true, opacity: 0.9, depthWrite: false });
    this.ring = new Mesh(RING_GEO, this.ringMat);
    this.progress = new Mesh(PROGRESS_GEO, PROGRESS_MAT);
    this.progress.scale.x = 0;
    this.rings.add(this.ring, this.progress);
    this.rings.position.y = this.height + 0.25;
    this.rings.visible = false;
    this.root.add(this.rings);
  }

  /** A Wipe sweep can change it while it is waddling or demanding. */
  get changeable(): boolean {
    return this.alive && (this.state === 'waddle' || this.state === 'demand' || this.state === 'spawn');
  }

  /** Called by the Wipe after 1.5 s of cumulative sweep. */
  changeDiaper(): void {
    if (!this.changeable) return;
    this.setState('changed');
  }

  protected override onState(s: string): void {
    switch (s) {
      case 'spawn':
        this.avatar.play('walk');
        break;
      case 'waddle':
        this.avatar.play('walk');
        break;
      case 'demand': {
        this.avatar.play('crouch', 0.2);
        this.ringLeft = RING_SECONDS;
        this.screamed = false;
        this.rings.visible = true;
        this.ring.scale.x = 1;
        this.applyTint();
        this.say('whine', 0);
        this.w.bus.emit('diaper:ring', { id: this.id, seconds: RING_SECONDS });
        break;
      }
      case 'changed': {
        this.rings.visible = false;
        this.avatar.setTint(null);
        this.avatar.root.rotation.z = 0;
        this.avatar.play('emote', 0.1, true);
        this.say('sleepy', 0);
        const centre = this.centre(tmp);
        this.w.fx.text(centre, '+50 CHANGED', '#3fd6c8');
        this.w.voice.sfx('diaper_plap', this.root, 1);
        this.offHand.pulse(0.6, 100);
        this.w.bus.emit('diaper:changed', { id: this.id });
        break;
      }
    }
  }

  protected tick(dt: number): void {
    const d = this.distToPlayer();
    switch (this.state) {
      case 'spawn': {
        const fwd = this.facing(tmp);
        this.root.position.addScaledVector(fwd, this.speed * 0.8 * dt);
        this.waddle(dt);
        if (this.stateTime > 0.5) this.setState('waddle');
        break;
      }
      case 'waddle': {
        this.waddle(dt);
        if (d <= DEMAND_DISTANCE) {
          this.setState('demand');
          break;
        }
        if (d < 2 && !this.saidNear) {
          this.saidNear = true;
          this.say('giggle', 2);
        }
        this.moveToward(this.w.player.position(tmp), this.speed, dt, DEMAND_DISTANCE - 0.1);
        break;
      }
      case 'demand': {
        this.facePlayer(dt);
        this.ringLeft -= dt;
        this.updateRing();
        if (!this.screamed && this.ringLeft <= RING_SCREAM_AT) {
          this.screamed = true;
          this.say('scream', 0);
        } else if (this.stateTime > 2.5 && this.playerVisibleToPlayer()) {
          this.say('whine', 6);
        }
        this.tintTimer += dt;
        if (this.tintTimer > 0.25) {
          this.tintTimer = 0;
          this.applyTint();
        }
        if (this.ringLeft <= 0) this.detonate();
        break;
      }
      case 'changed':
        if (this.stateTime >= CHANGED_POP_DELAY) this.pop(false, ['CHANGED']);
        break;
    }
  }

  /** Popped (by the gun or a slap) while still a threat: a small cloud. Friendly and detonation pops skip it. */
  override pop(headshot = false, style: string[] = []): void {
    if (this.alive && this.state !== 'changed' && this.state !== 'detonate') {
      const centre = this.centre(new Vector3());
      this.rings.visible = false;
      this.w.bus.emit('diaper:popped', { id: this.id, position: centre });
      this.w.bus.emit('stinky:cloud', { position: centre.clone(), ...CLOUD_POPPED });
      this.w.voice.sfx('stink_cloud', this.root, 0.7);
    }
    super.pop(headshot, style);
  }

  override dispose(): void {
    this.ringMat.dispose();
    super.dispose();
  }

  // ---- internals -----------------------------------------------------------------------------------

  private centre(out: Vector3): Vector3 {
    return out.copy(this.root.position).add(tmp3.set(0, this.height * 0.5, 0));
  }

  /** Side-to-side waddle on the avatar (the root keeps its heading for movement). */
  private waddle(dt: number): void {
    this.waddleT += dt;
    this.avatar.root.rotation.z = Math.sin(this.waddleT * 8) * 0.1;
  }

  private applyTint(): void {
    this.avatar.setTint(RED_FACE);
  }

  /** Ring: a thin yellow ring whose x-scale shrinks linearly, drifting green → red; billboarded to the player. */
  private updateRing(): void {
    const left = Math.max(0, this.ringLeft) / RING_SECONDS;
    this.ring.scale.x = left;
    this.ringMat.color.setHSL(0.33 * left, 0.9, 0.5);
    this.progress.scale.x = this.changeProgress;
    const p = this.w.player.position(tmp);
    // Face the player: rotate the ring's +Z toward the player in root space (the root is yawed about Y).
    const local = tmp2.copy(p).sub(this.root.position);
    const c = Math.cos(-this.yaw), s = Math.sin(-this.yaw);
    local.set(local.x * c + local.z * s, local.y - this.rings.position.y, -local.x * s + local.z * c);
    if (local.lengthSq() > 1e-6) this.rings.quaternion.setFromUnitVectors(Z_AXIS, local.normalize());
  }

  private detonate(): void {
    this.setState('detonate');
    this.rings.visible = false;
    const centre = this.centre(new Vector3());
    const d = this.distToPlayer();
    this.w.bus.emit('stinky:cloud', { position: centre.clone(), ...CLOUD_DETONATE });
    this.w.bus.emit('diaper:detonated', { id: this.id, position: centre.clone() });
    if (d <= DETONATE_RADIUS) {
      this.w.player.damage(DETONATE_DAMAGE, this.type);
      this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: DETONATE_DAMAGE });
    }
    // Two Scamps waddle out of the cloud, side by side, facing the player, never inside the spawn clearance.
    const p = this.w.player.position(tmp);
    const toPlayer = tmp2.set(p.x - this.root.position.x, 0, p.z - this.root.position.z);
    if (toPlayer.lengthSq() < 1e-6) toPlayer.copy(this.facing(tmp3));
    toPlayer.normalize();
    const side = new Vector3(toPlayer.z, 0, -toPlayer.x);
    for (let i = 0; i < DETONATE_SPAWNS; i++) {
      const pos = this.root.position.clone().addScaledVector(side, i === 0 ? -0.35 : 0.35);
      pos.y = this.w.room.floorY;
      const dp = Math.hypot(pos.x - p.x, pos.z - p.z);
      if (dp < SPAWN_CLEARANCE) {
        const away = new Vector3(pos.x - p.x, 0, pos.z - p.z);
        if (away.lengthSq() < 1e-6) away.copy(toPlayer).negate();
        away.normalize();
        pos.x = p.x + away.x * SPAWN_CLEARANCE;
        pos.z = p.z + away.z * SPAWN_CLEARANCE;
      }
      if (!this.w.room.contains(pos.x, pos.z)) pos.set(this.root.position.x, this.w.room.floorY, this.root.position.z);
      this.w.bus.emit('spawn:request', { type: 'scamp', position: pos, facing: toPlayer.clone() });
    }
    this.w.fx.pop(centre, GREEN, this.w.reducedFlash ? 20 : 40);
    this.w.fx.text(centre, 'EW', '#9bd770');
    this.w.voice.sfx('stink_cloud', this.root, 1);
    this.say('neutral', 0);
    this.dispose();
  }
}
