import { Color, Vector3 } from 'three';
import { Gremlin, type GremlinWorld } from './Gremlin';
import type { Avatar } from './Avatar';

export const CLINGER_COLOR = 0xa0e7e5;

const UP = new Vector3(0, 1, 0);
const DEG = Math.PI / 180;
const STALK_RANGE = 1.5;
const FLANK_ANGLES = [60, 80]; // degrees off the player's forward: outside the 60-degree frontal cone
const TELL_TIME = 0.7;
const LEAP_TIME = 0.6;
const BITE_PERIOD = 1.0;
const SHAKE_SPEED = 3.0; // m/s
const SHAKE_COUNT = 3;
const SHAKE_WINDOW = 2.0; // s
const FLY_TIME = 0.35;
const FLY_DISTANCE = 1.0;
const DIZZY_TIME = 2.0;
const AUTO_SHAKE_DIST = 0.2; // weapon hand this close to the headset...
const AUTO_SHAKE_TIME = 0.3; // ...for this long drops the Clinger (chapter 3 doc, safety rule 2)
const BURST_PERIOD = 0.9;
const BURST_ON = 0.5;

const tmp = new Vector3();
const tmp2 = new Vector3();
const tmp3 = new Vector3();
const tmp4 = new Vector3();

/**
 * Clinger: stalks to 1.5 m on your flank (outside the central 60 degrees), crouches ("Up!"), leaps onto
 * the weapon hand and hangs there biting 1/s until you shake it off (three fast direction reversals of
 * the hand within 2 s) or slap it with the Wipe. Then it is dizzy for 2 s and starts over.
 * HP 2, 2.2 m/s bursts (<= 1.0 m/s from behind), 0.5 m, xp 15, cost 2.
 */
export class Clinger extends Gremlin {
  readonly type = 'clinger';
  readonly speaker = 'clinger';
  private readonly flank = new Vector3();
  private flankAge = 1;
  private burst = 0;
  private spokeBehind = false;
  private readonly leapFrom = new Vector3();
  private readonly flyFrom = new Vector3();
  private readonly flyTo = new Vector3();
  private readonly clingOffset: Vector3;
  private clock = 0;
  private readonly swings: number[] = [];
  private fastDir: Vector3 | null = null;
  private biteTimer = 0;
  private nearFace = 0;
  private attached = false;

  constructor(w: GremlinWorld, avatar: Avatar) {
    super(w, avatar, { hp: 2, speed: 2.2, height: 0.5, color: new Color(CLINGER_COLOR), xp: 15, radius: 0.18 });
    // Hangs below the hand: head top 0.1 m under the grip.
    this.clingOffset = new Vector3(0, -(this.height + 0.1), 0);
  }

  /** Fast direction reversals of the weapon hand counted inside the 2 s window (for tests/HUD). */
  get swingCount(): number {
    return this.swings.length;
  }
  get isClinging(): boolean {
    return this.state === 'cling';
  }

  protected override onState(s: string): void {
    switch (s) {
      case 'spawn':
        this.avatar.play('walk');
        break;
      case 'stalk':
        this.avatar.play('walk');
        this.flankAge = 1;
        this.burst = 0;
        break;
      case 'tell':
        this.avatar.play('crouch', 0.1);
        this.say('giggle', 0.5); // "Up!"
        break;
      case 'leap':
        this.avatar.play('jump', 0.05);
        this.leapFrom.copy(this.root.position);
        this.w.voice.sfx('thwip', this.root, 0.3);
        break;
      case 'cling':
        this.avatar.play('fall', 0.05);
        this.biteTimer = 0;
        this.nearFace = 0;
        this.swings.length = 0;
        this.fastDir = null;
        this.attached = true;
        this.weaponHand.pulse(0.6, 100);
        this.w.bus.emit('clinger:attached', { id: this.id });
        this.say('giggle', 2); // "Mine." / "I hold it."
        break;
      case 'shaken':
        this.avatar.play('fall', 0.05);
        this.w.voice.sfx('thwip', this.root, 0.3);
        break;
      case 'dizzy':
        this.avatar.play('crouch', 0.1);
        this.w.fx.text(this.headPosition(tmp), '* * *', '#ffffff');
        this.say('whine', 1); // "Nooo don't put me down."
        break;
      case 'chase':
        this.avatar.play('run');
        break;
      case 'windup':
        this.avatar.play('emote');
        this.say('whine');
        break;
      case 'bite':
        this.avatar.play('attack', 0.05, true);
        break;
      case 'recover':
        this.avatar.play('idle');
        break;
    }
  }

  protected tick(dt: number): void {
    this.clock += dt;
    const d = this.distToPlayer();
    switch (this.state) {
      case 'spawn': {
        const fwd = this.facing(tmp);
        this.root.position.addScaledVector(fwd, Math.min(1.0, this.speed * 0.5) * dt); // may be behind the player
        if (this.stateTime > 0.8) this.setState('stalk');
        break;
      }
      case 'stalk': {
        this.flankAge += dt;
        if (this.flankAge > 0.5) {
          this.pickFlank();
          this.flankAge = 0;
        }
        this.burst += dt;
        if (this.burst > BURST_PERIOD) this.burst -= BURST_PERIOD;
        const bursting = this.burst < BURST_ON;
        const behind = this.behindPlayer();
        let spd = bursting ? this.speed : 0.7;
        if (behind) spd = Math.min(spd, 1.0); // safety rule 3: no fast approach from behind
        this.avatar.play(bursting && !behind ? 'run' : 'walk');
        const left = this.moveToward(this.flank, spd, dt, 0.1);
        if (behind && d < 2 && !this.spokeBehind) {
          this.spokeBehind = true;
          this.say('giggle', 3); // speaks when it crosses 2 m in the rear hemisphere
        }
        if (d > 2.5) this.spokeBehind = false;
        if (!this.weaponHand.connected) {
          if (d < 3) this.setState('chase');
          break;
        }
        // Leaps only from the front, from about 1.5 m.
        if (!behind && d >= 0.9 && d <= 2.0 && this.stateTime > 0.4 && (left < 0.3 || this.stateTime > 5)) this.setState('tell');
        break;
      }
      case 'tell': {
        this.facePlayer(dt);
        if (this.stateTime > TELL_TIME) {
          if (this.weaponHand.connected && d < 2.3 && !this.behindPlayer()) this.setState('leap');
          else this.setState('stalk');
        }
        break;
      }
      case 'leap': {
        const hand = this.weaponHand;
        if (!hand.connected) {
          this.root.position.y = this.w.room.floorY;
          this.setState('dizzy');
          break;
        }
        const t = Math.min(1, this.stateTime / LEAP_TIME);
        const target = tmp.copy(hand.position).add(this.clingOffset);
        this.root.position.lerpVectors(this.leapFrom, target, t);
        this.root.position.y += Math.sin(t * Math.PI) * 0.4;
        this.facePlayer(dt);
        if (t >= 1) this.setState('cling');
        break;
      }
      case 'cling': {
        const hand = this.weaponHand;
        if (!hand.connected) {
          this.detach('disconnected');
          break;
        }
        this.root.position.copy(hand.position).add(this.clingOffset);
        this.facePlayer(dt);
        // Tiny bites: 1 damage per second.
        this.biteTimer += dt;
        if (this.biteTimer >= BITE_PERIOD) {
          this.biteTimer -= BITE_PERIOD;
          this.w.player.damage(1, this.type);
          this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: 1 });
          hand.pulse(0.3, 60);
        }
        // Shake detection: three fast (> 3 m/s) direction reversals within 2 s.
        if (this.countShake(hand.velocity, hand.speed)) {
          this.detach('shake');
          break;
        }
        // Safety auto-shake: the hand held at the face for 0.3 s never brings a gremlin to the headset.
        const head = this.w.player.position(tmp);
        if (hand.position.distanceTo(head) < AUTO_SHAKE_DIST) {
          this.nearFace += dt;
          if (this.nearFace >= AUTO_SHAKE_TIME) this.detach('autoshake');
        } else {
          this.nearFace = 0;
        }
        break;
      }
      case 'shaken': {
        const t = Math.min(1, this.stateTime / FLY_TIME);
        this.root.position.lerpVectors(this.flyFrom, this.flyTo, t);
        this.root.position.y += Math.sin(t * Math.PI) * 0.3;
        if (t >= 1) {
          this.root.position.copy(this.flyTo);
          this.setState('dizzy');
        }
        break;
      }
      case 'dizzy': {
        if (this.stateTime > DIZZY_TIME) this.setState('stalk');
        break;
      }
      // ---- fallback when there is no weapon hand to cling to: a Scamp-like nip ----
      case 'chase': {
        if (this.weaponHand.connected) {
          this.setState('stalk');
          break;
        }
        if (d > 0.7) {
          const spd = Math.min(this.speed, this.behindPlayer() ? 1.0 : this.speed * 0.8);
          this.moveToward(this.w.player.position(tmp), spd, dt, 0.6);
        } else {
          this.setState('windup');
        }
        if (d > 6) this.setState('stalk');
        break;
      }
      case 'windup': {
        this.facePlayer(dt);
        if (this.stateTime > 0.4) this.setState(d < 0.9 ? 'bite' : 'chase');
        break;
      }
      case 'bite': {
        if (this.stateTime > 0.15 && this.stateTime - dt <= 0.15 && d < 1.0) {
          this.w.player.damage(2, this.type);
          this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: 2 });
        }
        if (this.stateTime > 0.5) this.setState('recover');
        break;
      }
      case 'recover': {
        if (this.stateTime > 0.8) this.setState('stalk');
        break;
      }
    }
  }

  override hit(damage: number, headshot: boolean, style: string[] = []): boolean {
    if (!this.alive) return false;
    if (this.state === 'cling' && style.includes('SLAP')) {
      // The Wipe flings a Clinger rather than hurting it; the free shot comes while it is dizzy.
      this.w.voice.sfx('knock', this.root, 0.5);
      this.detach('slap');
      return false;
    }
    return super.hit(damage, headshot, style);
  }

  override pop(headshot = false, style: string[] = []): void {
    if (!this.alive) return;
    if (this.state === 'cling' || this.state === 'leap') {
      // Popped on the hand: the ghost floats straight up off the gun; the chapter recoils the weapon.
      this.w.bus.emit('clinger:detached', { id: this.id, reason: 'popped' });
      this.attached = false;
      this.weaponHand.pulse(0.5, 80);
    }
    super.pop(headshot, style);
  }

  override dispose(): void {
    if (this.attached && this.alive) {
      this.w.bus.emit('clinger:detached', { id: this.id, reason: 'despawned' });
    }
    this.attached = false;
    super.dispose();
  }

  // ---- helpers ------------------------------------------------------------------------------------

  /**
   * Count a fast swing when the hand exceeds 3 m/s in a direction that reverses the previous fast swing.
   * Returns true once three such swings fall inside the 2 s window.
   */
  private countShake(velocity: Vector3, speed: number): boolean {
    if (speed > SHAKE_SPEED) {
      const dir = tmp2.copy(velocity).divideScalar(speed);
      if (!this.fastDir) {
        this.fastDir = dir.clone();
        this.swings.push(this.clock);
      } else if (dir.dot(this.fastDir) < -0.2) {
        this.fastDir.copy(dir);
        this.swings.push(this.clock);
      }
    }
    while (this.swings.length && this.clock - this.swings[0] > SHAKE_WINDOW) this.swings.shift();
    return this.swings.length >= SHAKE_COUNT;
  }

  /** Let go: fly 1 m off the hand (away from the player), land on the floor, be dizzy. */
  private detach(reason: string): void {
    this.attached = false;
    this.w.bus.emit('clinger:detached', { id: this.id, reason });
    this.say('whine', 0.5);
    const p = this.w.player.position(tmp);
    const from = this.flyFrom.copy(this.root.position);
    const dir = tmp2.set(from.x - p.x, 0, from.z - p.z);
    if (dir.lengthSq() < 1e-4) this.facing(dir).negate();
    dir.normalize();
    const hand = this.weaponHand;
    if (hand.connected && hand.speed > 1) {
      // Flung along the shake, but never toward the player.
      const hv = tmp3.copy(hand.velocity).setY(0).normalize();
      if (hv.dot(dir) > 0) dir.add(hv).normalize();
    }
    const room = this.w.room;
    let landed = false;
    for (const dist of [FLY_DISTANCE, 0.7, 0.4]) {
      const x = from.x + dir.x * dist, z = from.z + dir.z * dist;
      if (room.contains(x, z) && !room.blockedAt(x, z, this.radius) && Math.hypot(x - p.x, z - p.z) >= 0.8) {
        this.flyTo.set(x, room.floorY, z);
        landed = true;
        break;
      }
    }
    if (!landed) this.flyTo.copy(this.pickPoint(p, 1.6, 0.8));
    this.flyTo.y = room.floorY;
    this.setState('shaken');
  }

  private behindPlayer(): boolean {
    const p = this.w.player.position(tmp3);
    const f = this.w.player.forward(tmp4).setY(0);
    const toMe = tmp2.set(this.root.position.x - p.x, 0, this.root.position.z - p.z);
    return f.dot(toMe) < 0;
  }

  /** A point 1.5 m from the player, 60-80 degrees off their forward on our side; falls back to straight in. */
  private pickFlank(): void {
    const room = this.w.room;
    const p = this.w.player.position(tmp3);
    const f = this.w.player.forward(tmp4).setY(0);
    if (f.lengthSq() < 1e-6) f.set(0, 0, -1);
    f.normalize();
    const toMe = tmp2.set(this.root.position.x - p.x, 0, this.root.position.z - p.z);
    let side = Math.sign(f.z * toMe.x - f.x * toMe.z);
    if (side === 0) side = Math.random() < 0.5 ? -1 : 1;
    for (const ang of FLANK_ANGLES) {
      for (const s of [side, -side]) {
        const dir = tmp.copy(f).applyAxisAngle(UP, s * ang * DEG);
        const x = p.x + dir.x * STALK_RANGE, z = p.z + dir.z * STALK_RANGE;
        if (room.contains(x, z) && !room.blockedAt(x, z, this.radius)) {
          this.flank.set(x, room.floorY, z);
          return;
        }
      }
    }
    const l = toMe.length();
    if (l < 1e-3) toMe.set(0, 0, 1);
    else toMe.divideScalar(l);
    this.flank.set(p.x + toMe.x * STALK_RANGE, room.floorY, p.z + toMe.z * STALK_RANGE);
  }
}
