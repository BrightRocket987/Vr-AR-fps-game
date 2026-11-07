import { BoxGeometry, Color, Group, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { Gremlin, type GremlinWorld, type HandLike } from './Gremlin';
import type { Avatar } from './Avatar';
import type { Door } from '../room/RoomModel';
import { handSpeedAlong } from './Wipe';

export const BEHIND_SECONDS = 1.5;
export const KNOCK_COUNT = 3;
export const KNOCK_INTERVAL = 0.8;
/** The kick lands this long after KNOCK starts (three knocks at 0, 0.8, 1.6; the slam window is [0, 2.4)). */
export const KICK_AT = KNOCK_COUNT * KNOCK_INTERVAL;
export const KICK_SECONDS = 0.3;
export const KICK_DAMAGE = 10;
export const KICK_RANGE = 1.0;
export const TADA_SECONDS = 1.2;
export const RUSH_SPEED = 2.0;
/** §6 rule 3: anything approaching from behind the player moves at most this fast. */
export const REAR_SPEED_CAP = 1.0;
export const HEADBUTT_RANGE = 0.9;
export const HEADBUTT_TELL = 0.5;
export const HEADBUTT_DAMAGE = 8;
export const DIZZY_SECONDS = 2.0;
export const SLAM_HAND_RANGE = 0.3;
export const SLAM_SPEED = 1.0;
/** A grip held on the leaf for this long also slams it (a held wipe-grip brushing past does not). */
export const SLAM_SQUEEZE_HOLD = 0.2;
export const SLAM_DAMAGE = 5;
export const SLAMMED_SECONDS = 2.0;
/** §6 rule 7: no slam registers with the hand inside this distance of the real door plane. */
export const REAL_DOOR_CLEARANCE = 0.25;
/** The leaf hangs this far into the room during KNOCK, so its free edge is well clear of the real door. */
export const LEAF_REST_ANGLE = Math.PI / 3;
export const LEAF_OPEN_ANGLE = Math.PI / 2;
export const LEAF_THICKNESS = 0.04;

// Pooled unit box, scaled per door. The material is cloned per Breacher so each leaf can fade in on its own.
const LEAF_GEO = new BoxGeometry(1, 1, 1);
const LEAF_MAT = new MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.85, metalness: 0, transparent: true, opacity: 0 });
const UP = new Vector3(0, 1, 0);
const Y_AXIS = new Vector3(0, 1, 0);

const tmp = new Vector3();
const tmp2 = new Vector3();
const tmp3 = new Vector3();
const tmpQ = new Quaternion();
const tmpM = new Matrix4();

/**
 * The door kicker. HP 8, 1.0 m/s (2.0 rush), 0.75 m. Waits BEHIND a door, KNOCKs three times (the slam
 * window), KICKs the leaf open (10 within 1 m), poses (TA-DA, 2× damage), RUSHes, HEADBUTTs (8) and gets
 * DIZZY. Slamming the leaf with the Wipe hand during KNOCK squashes it for 5 and it arrives dizzy
 * ("Ow my whole face."). The leaf is this enemy's only extra mesh (1 draw call).
 */
export class Breacher extends Gremlin {
  readonly type = 'breacher';
  readonly speaker = 'breacher';
  door: Door | null;
  /** Hinged leaf: the Group sits on the hinge, the mesh is offset by width/2 so it swings like a door. */
  readonly leaf = new Group();
  private readonly leafMesh: Mesh;
  private readonly leafMat: MeshStandardMaterial;
  private readonly baseQuat = new Quaternion();
  private readonly hinge = new Vector3();
  /** Current swing angle (0 = flush with the frame, π/2 = fully open into the room). */
  swing = 0;
  private swingFrom = 0;
  private swingTo = 0;
  private swingT = 1;
  private swingDur = 0.3;
  private shake = 0;
  private fade = 0;
  knocks = 0;
  private kickDamageDone = false;
  private headbuttDone = false;
  private squeezeHold = 0;
  private stopHintCooldown = 0;
  private dizzyText = 0;
  /** Set when the entrance was a slam: pops while dizzy carry the 'DOOR SLAM' style tag (×2 score). */
  slammedEntrance = false;

  constructor(w: GremlinWorld, avatar: Avatar, door?: Door) {
    super(w, avatar, { hp: 8, speed: 1.0, height: 0.75, color: new Color(0xff9f1c), xp: 30, radius: 0.26 });
    this.door = door ?? null;
    this.leafMat = LEAF_MAT.clone();
    this.leafMesh = new Mesh(LEAF_GEO, this.leafMat);
    this.leafMesh.frustumCulled = false;
    this.leaf.add(this.leafMesh);
    this.leaf.visible = false;
    w.world.add(this.leaf);
    this.avatar.root.visible = false;
  }

  /** Resolve the door (nearest open portal, else the largest, else a stand-in at the spawn point), then spawn behind it. */
  override spawnAt(position: Vector3, facing: Vector3): void {
    if (!this.door) this.door = this.resolveDoor(position, facing);
    const d = this.door;
    this.hinge.copy(d.center).addScaledVector(d.right, d.width / 2);
    this.hinge.y = d.center.y;
    // Leaf basis: local X runs along the leaf from the hinge toward the latch, local Z is the door normal.
    tmpM.makeBasis(tmp.copy(d.right).negate(), UP, tmp2.copy(d.normal));
    this.baseQuat.setFromRotationMatrix(tmpM);
    this.leaf.position.copy(this.hinge);
    this.leafMesh.scale.set(d.width, d.height, LEAF_THICKNESS);
    this.leafMesh.position.set(d.width / 2, 0, 0);
    this.setSwing(LEAF_REST_ANGLE);
    super.spawnAt(position, facing);
    // A fresh gremlin is already in 'spawn', so onState('spawn') does not fire: place it here.
    this.avatar.root.visible = false;
    this.placeBehindDoor();
  }

  private resolveDoor(position: Vector3, facing: Vector3): Door {
    const open = this.w.openDoors();
    let best: Door | null = null;
    let bestD = Infinity;
    for (const d of open) {
      const dist = Math.hypot(d.center.x - position.x, d.center.z - position.z);
      if (dist < bestD) {
        best = d;
        bestD = dist;
      }
    }
    if (best) return best;
    const largest = this.w.room.largestDoor();
    if (largest) return largest;
    const normal = facing.clone().setY(0).normalize();
    if (normal.lengthSq() < 1e-6) normal.set(0, 0, 1);
    return {
      id: `breach-${this.id}`,
      center: position.clone().setY(this.w.room.floorY + 1.0),
      normal,
      right: new Vector3().crossVectors(normal, UP).normalize(),
      width: 0.9,
      height: 2.0,
      kidsRoom: false,
      source: 'virtual',
    };
  }

  protected override onState(s: string): void {
    const d = this.door;
    switch (s) {
      case 'spawn':
        this.avatar.root.visible = false;
        if (d) this.placeBehindDoor();
        break;
      case 'behind':
        this.leaf.visible = true;
        this.avatar.play('idle');
        this.w.bus.emit('log', { text: `breacher ${this.id} behind ${d?.id ?? '?'}` });
        break;
      case 'knock':
        this.knocks = 0;
        this.squeezeHold = 0;
        this.avatar.root.visible = true; // faces peek between knocks; the real door occludes the rest
        this.avatar.play('attack');
        break;
      case 'slammed':
        this.avatar.root.visible = false;
        this.animateSwing(0, 0.12);
        this.shake = 0.4;
        this.w.voice.sfx('knock', this.leaf, 1);
        this.w.voice.sfx('door_kick', this.leaf, 0.5);
        break;
      case 'kick':
        this.kickDamageDone = false;
        this.animateSwing(LEAF_OPEN_ANGLE, KICK_SECONDS);
        this.w.voice.sfx('door_kick', this.leaf, 1);
        this.avatar.play('attack', 0.05, true);
        break;
      case 'tada':
        this.placeAtThreshold();
        this.avatar.root.visible = true;
        this.avatar.play('emote', 0.05, true);
        this.say('giggle', 0);
        this.w.fx.text(this.headPosition(tmp), 'TA-DA!', '#ff9f1c');
        break;
      case 'rush':
        this.avatar.play('run');
        this.say('scream');
        break;
      case 'headbutt':
        this.headbuttDone = false;
        this.avatar.play('attack', 0.05, true);
        this.say('neutral', 1);
        break;
      case 'dizzy':
        this.dizzyText = 0;
        this.avatar.play('idle');
        this.w.fx.text(this.headPosition(tmp), 'DIZZY', '#ffffff');
        break;
    }
  }

  protected tick(dt: number): void {
    this.updateLeaf(dt);
    const d = this.distToPlayer();
    switch (this.state) {
      case 'spawn':
        this.setState('behind');
        break;
      case 'behind':
        if (this.stateTime >= BEHIND_SECONDS) this.setState('knock');
        break;
      case 'knock': {
        while (this.knocks < KNOCK_COUNT && this.stateTime >= this.knocks * KNOCK_INTERVAL) this.knock();
        this.peek();
        if (!this.doorHeldOpen() && this.checkSlam(this.offHand, dt)) {
          this.slammed();
          break;
        }
        if (this.stateTime >= KICK_AT) this.setState('kick');
        break;
      }
      case 'slammed':
        if (this.stateTime >= SLAMMED_SECONDS) this.enterDizzy();
        break;
      case 'kick': {
        if (!this.kickDamageDone && this.stateTime >= KICK_SECONDS / 2) {
          this.kickDamageDone = true;
          this.kickDamage();
        }
        if (this.stateTime >= KICK_SECONDS) {
          this.breach();
          this.setState('tada');
        }
        break;
      }
      case 'tada':
        this.facePlayer(dt);
        if (this.stateTime >= TADA_SECONDS) this.setState('rush');
        break;
      case 'rush': {
        if (d <= HEADBUTT_RANGE) {
          this.setState('headbutt');
          break;
        }
        const speed = this.playerVisibleToPlayer() ? RUSH_SPEED : Math.min(RUSH_SPEED, REAR_SPEED_CAP);
        this.moveToward(this.w.player.position(tmp), speed, dt, HEADBUTT_RANGE - 0.05);
        break;
      }
      case 'headbutt': {
        this.facePlayer(dt);
        if (!this.headbuttDone && this.stateTime >= HEADBUTT_TELL) {
          this.headbuttDone = true;
          if (d < HEADBUTT_RANGE + 0.25) {
            this.w.player.damage(HEADBUTT_DAMAGE, this.type);
            this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: HEADBUTT_DAMAGE });
          }
          this.setState('dizzy');
        }
        break;
      }
      case 'dizzy': {
        // Stars: wobble on the spot and re-stamp the text every second.
        this.root.rotation.y = this.yaw + Math.sin(this.stateTime * 9) * 0.3;
        this.dizzyText += dt;
        if (this.dizzyText >= 1) {
          this.dizzyText = 0;
          this.w.fx.text(this.headPosition(tmp), 'DIZZY', '#ffffff');
        }
        if (this.stateTime >= DIZZY_SECONDS) {
          this.root.rotation.y = this.yaw;
          this.setState('rush');
        }
        break;
      }
    }
  }

  /** Unreachable behind the door; 2× while posing; pops while dizzy after a slam carry the DOOR SLAM tag. */
  override hit(damage: number, headshot: boolean, style: string[] = []): boolean {
    if (this.state === 'behind' || this.state === 'slammed' || this.state === 'spawn') return false;
    const mult = this.state === 'tada' ? 2 : 1;
    const tags = this.state === 'dizzy' && this.slammedEntrance ? [...style, 'DOOR SLAM'] : style;
    return super.hit(damage * mult, headshot, tags);
  }

  override dispose(): void {
    this.w.world.remove(this.leaf);
    this.leafMat.dispose();
    super.dispose();
  }

  // ---- geometry helpers (exported behaviour, used by tests) ----------------------------------------

  /** Unit direction along the leaf from the hinge to its free edge for a swing angle. */
  leafDirection(out: Vector3, swing = this.swing): Vector3 {
    const d = this.door;
    if (!d) return out.set(1, 0, 0);
    return out.copy(d.right).multiplyScalar(-Math.cos(swing)).addScaledVector(d.normal, Math.sin(swing));
  }

  /** World position of the leaf's free (latch) edge at mid-height. */
  freeEdge(out: Vector3): Vector3 {
    const d = this.door;
    if (!d) return out.copy(this.hinge);
    return this.leafDirection(out).multiplyScalar(d.width).add(this.hinge);
  }

  /** Shortest distance from a world point to the leaf rectangle (ignoring its thickness). */
  distanceToLeaf(p: Vector3): number {
    const d = this.door;
    if (!d) return Infinity;
    const dir = this.leafDirection(tmp2);
    const n = tmp3.crossVectors(dir, UP);
    const rel = tmp.copy(p).sub(this.hinge);
    const u = rel.dot(dir);
    const v = rel.y;
    const w = rel.dot(n);
    const du = Math.max(0, -u, u - d.width);
    const dv = Math.max(0, Math.abs(v) - d.height / 2);
    return Math.hypot(du, dv, w);
  }

  /** Signed distance of a point in front of the real door plane (positive = inside the room). */
  clearanceFromRealDoor(p: Vector3): number {
    const d = this.door;
    if (!d) return Infinity;
    return tmp.copy(p).sub(d.center).dot(d.normal);
  }

  /**
   * Door Slam test for one frame: hand within 0.3 m of the leaf and (pushing into the door faster than
   * 1 m/s, or gripping it for 0.2 s). Never with the hand inside 0.25 m of the real door plane (§6 rule 7):
   * that buzzes the controller and asks for a "stop" hint instead.
   */
  checkSlam(hand: HandLike, dt: number): boolean {
    this.stopHintCooldown = Math.max(0, this.stopHintCooldown - dt);
    const d = this.door;
    if (!d || !hand.connected) {
      this.squeezeHold = 0;
      return false;
    }
    const near = this.distanceToLeaf(hand.position) <= SLAM_HAND_RANGE;
    const clearance = this.clearanceFromRealDoor(hand.position);
    const nearRealDoor = clearance < REAL_DOOR_CLEARANCE && Math.hypot(hand.position.x - d.center.x, hand.position.z - d.center.z) < d.width;
    if (nearRealDoor) {
      this.squeezeHold = 0;
      if (this.stopHintCooldown <= 0) {
        this.stopHintCooldown = 1;
        hand.pulse(0.5, 100);
        this.w.bus.emit('hint', { text: 'STOP', sub: 'Push the floating door, not the real one.', seconds: 1 });
      }
      return false;
    }
    if (!near) {
      this.squeezeHold = 0;
      return false;
    }
    const into = handSpeedAlong(hand, tmp.copy(d.normal).negate());
    if (into > SLAM_SPEED) return true;
    this.squeezeHold = hand.squeeze ? this.squeezeHold + dt : 0;
    return this.squeezeHold >= SLAM_SQUEEZE_HOLD;
  }

  // ---- internals -----------------------------------------------------------------------------------

  private placeBehindDoor(): void {
    const d = this.door;
    if (!d) return;
    this.root.position.copy(d.center).addScaledVector(d.normal, -0.4);
    this.root.position.y = this.w.room.floorY;
    this.yaw = Math.atan2(d.normal.x, d.normal.z);
    this.root.rotation.y = this.yaw;
  }

  private placeAtThreshold(): void {
    const d = this.door;
    if (!d) return;
    const p = this.w.player.position(tmp);
    const base = tmp2.copy(d.center).addScaledVector(d.normal, 0.35);
    base.y = this.w.room.floorY;
    this.root.position.copy(base);
    // Never materialise inside the player's bubble (they may be standing in the doorway): step sideways
    // along the frame, staying in front of the real door plane and inside the room.
    if (Math.hypot(base.x - p.x, base.z - p.z) < 0.8) {
      for (const k of [0.4, -0.4, 0.7, -0.7, 1.0, -1.0, 1.3, -1.3]) {
        const c = tmp3.copy(base).addScaledVector(d.right, k);
        if (Math.hypot(c.x - p.x, c.z - p.z) >= 0.8 && this.w.room.contains(c.x, c.z)) {
          this.root.position.copy(c);
          break;
        }
      }
    }
    this.yaw = Math.atan2(d.normal.x, d.normal.z);
    this.root.rotation.y = this.yaw;
  }

  private knock(): void {
    const d = this.door;
    this.knocks++;
    const n = this.knocks;
    const intensity = n === 1 ? 0.5 : n === 2 ? 0.7 : 1.0;
    this.w.bus.emit('door:knock', { doorId: d?.id ?? '', count: n });
    this.w.voice.sfx('knock', this.leaf, 0.6 + 0.2 * (n - 1));
    this.w.weaponHand().pulse(intensity, 80);
    this.w.offHand().pulse(intensity, 80);
    this.shake = 0.25;
    this.avatar.play('attack', 0.05, true);
    if (n === 1) {
      this.say('scream', 0);
      this.w.bus.emit('hint', { text: 'Knock knock', sub: 'Push the door shut with your WIPE hand.', seconds: 2 });
    }
  }

  /** Between knocks the face peeks round the latch edge for 0.4 s, then ducks back. */
  private peek(): void {
    const d = this.door;
    if (!d) return;
    const phase = this.stateTime % KNOCK_INTERVAL;
    const out = phase > 0.3 && phase < 0.7 ? 1 : 0;
    const side = tmp.copy(d.right).multiplyScalar(-(d.width / 2 - 0.15) * out);
    this.root.position.copy(d.center).addScaledVector(d.normal, -0.4 + 0.3 * out).add(side);
    this.root.position.y = this.w.room.floorY;
  }

  private slammed(): void {
    const d = this.door;
    this.slammedEntrance = true;
    this.hp -= SLAM_DAMAGE;
    this.avatar.setTint(new Color(2.5, 2.5, 2.5));
    this.w.voice.sfx('squeak_hit', this.root, 0.8);
    this.w.bus.emit('door:slammed', { doorId: d?.id ?? '' });
    this.w.bus.emit('wipe:slam', { doorId: d?.id ?? '' });
    this.w.fx.text(this.freeEdge(tmp).add(tmp2.set(0, 0.2, 0)), 'SLAM!', '#ffffff');
    this.offHand.pulse(1, 120);
    if (this.hp <= 0) {
      // Squashed outright: a pop at the threshold with the slam tag.
      this.placeAtThreshold();
      this.avatar.root.visible = true;
      this.setState('dizzy');
      this.pop(false, ['DOOR SLAM']);
      return;
    }
    this.setState('slammed');
  }

  /** A Tablet Zombie standing in this frame keeps the portal open: the door cannot be slammed (docs/01 door rules). */
  private doorHeldOpen(): boolean {
    const id = this.door?.id;
    if (!id) return false;
    return this.w.gremlins().some((g) => g.alive && g.type === 'zombie' && (g as unknown as { holdingDoorId?: string | null }).holdingDoorId === id);
  }

  /** After a slam: the leaf swings open anyway and the Breacher stumbles in dizzy. */
  private enterDizzy(): void {
    this.animateSwing(LEAF_OPEN_ANGLE, 0.5);
    this.breach();
    this.placeAtThreshold();
    this.avatar.root.visible = true;
    this.avatar.setTint(null);
    this.say('whine', 0);
    this.setState('dizzy');
  }

  private breach(): void {
    const d = this.door;
    if (!d) return;
    this.w.setDoorOpen(d.id, true);
    this.w.bus.emit('door:breached', { doorId: d.id });
  }

  private kickDamage(): void {
    const d = this.door;
    if (!d) return;
    const p = this.w.player.position(tmp);
    const dist = Math.hypot(p.x - d.center.x, p.z - d.center.z);
    const inFront = tmp2.copy(p).sub(d.center).dot(d.normal) >= 0;
    if (dist <= KICK_RANGE && inFront) {
      this.w.player.damage(KICK_DAMAGE, this.type);
      this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: KICK_DAMAGE });
    }
  }

  private animateSwing(to: number, seconds: number): void {
    this.swingFrom = this.swing;
    this.swingTo = to;
    this.swingDur = Math.max(1e-3, seconds);
    this.swingT = 0;
  }

  private setSwing(angle: number): void {
    this.swing = angle;
    this.swingFrom = angle;
    this.swingTo = angle;
    this.swingT = 1;
    this.applyLeafTransform();
  }

  private updateLeaf(dt: number): void {
    if (this.swingT < 1) {
      this.swingT = Math.min(1, this.swingT + dt / this.swingDur);
      const e = 1 - (1 - this.swingT) * (1 - this.swingT); // ease out
      this.swing = this.swingFrom + (this.swingTo - this.swingFrom) * e;
    }
    if (this.fade < 1 && this.leaf.visible) {
      this.fade = Math.min(1, this.fade + dt * 2);
      this.leafMat.opacity = this.fade;
      if (this.fade >= 1) this.leafMat.transparent = false; // opaque from here on: no transparent-pass sorting
    }
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      // 2 cm along the leaf normal, dying out.
      this.leafMesh.position.z = Math.sin(this.shake * 60) * 0.02 * (this.shake / 0.25);
    } else this.leafMesh.position.z = 0;
    this.applyLeafTransform();
  }

  private applyLeafTransform(): void {
    tmpQ.setFromAxisAngle(Y_AXIS, -this.swing);
    this.leaf.quaternion.copy(this.baseQuat).multiply(tmpQ);
  }
}
