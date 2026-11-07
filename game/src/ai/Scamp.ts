import { Color, Vector3 } from 'three';
import { Gremlin, type GremlinWorld } from './Gremlin';
import type { Avatar } from './Avatar';

const tmp = new Vector3();

/**
 * The basic gremlin: roams near you, rushes when close, shin-slaps, taunts when the crowd is big,
 * and sits on your couch if you ignore it. HP 2, 1.6 m/s.
 */
export class Scamp extends Gremlin {
  readonly type = 'scamp';
  readonly speaker = 'scamp';
  private roamTarget = new Vector3();
  private couchTimer = 0;
  private sitBounce = 0;

  constructor(w: GremlinWorld, avatar: Avatar) {
    super(w, avatar, { hp: 2, speed: 1.6, height: 0.6, color: new Color(0xff5a5a), xp: 10 });
  }

  protected override onState(s: string): void {
    switch (s) {
      case 'spawn':
        this.avatar.play('walk');
        break;
      case 'roam':
        this.avatar.play('walk');
        this.roamTarget.copy(this.pickPoint(this.w.player.position(tmp), 2.2, 1.0));
        break;
      case 'chase':
        this.avatar.play('run');
        break;
      case 'windup':
        this.avatar.play('emote');
        this.say('whine');
        break;
      case 'attack':
        this.avatar.play('attack', 0.05, true);
        break;
      case 'recover':
        this.avatar.play('idle');
        break;
      case 'taunt':
        this.avatar.play('emote', 0.1);
        this.say('giggle', 1);
        break;
      case 'gotoseat':
        this.avatar.play('walk');
        break;
      case 'sit':
        this.avatar.play('sit', 0.2);
        this.say(undefined, 2);
        break;
    }
  }

  protected tick(dt: number): void {
    const d = this.distToPlayer();
    switch (this.state) {
      case 'spawn': {
        // Walk 0.8 m straight ahead out of the door, then roam.
        const fwd = this.facing(tmp);
        this.root.position.addScaledVector(fwd, this.speed * 0.8 * dt);
        if (this.stateTime > 0.8) this.setState(d < 3 ? 'chase' : 'roam');
        break;
      }
      case 'roam': {
        const left = this.moveToward(this.roamTarget, this.speed * 0.8, dt, 0.15);
        if (left < 0.2 || this.stateTime > 4) this.setState(d < 3 ? 'chase' : 'roam');
        if (d < 3) this.setState('chase');
        this.considerCouch(dt);
        break;
      }
      case 'chase': {
        if (d > 0.7) this.moveToward(this.w.player.position(tmp), this.speed, dt, 0.6);
        else this.setState('windup');
        if (d > 6) this.setState('roam');
        if (this.stateTime > 2 && this.w.gremlins().length >= 4 && Math.random() < 0.004) this.setState('taunt');
        break;
      }
      case 'windup': {
        this.facePlayer(dt);
        if (this.stateTime > 0.4) this.setState(d < 0.9 ? 'attack' : 'chase');
        break;
      }
      case 'attack': {
        if (this.stateTime > 0.15 && this.stateTime - dt <= 0.15 && d < 1.0) {
          this.w.player.damage(5, this.type);
          this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: 5 });
        }
        if (this.stateTime > 0.5) this.setState('recover');
        break;
      }
      case 'recover': {
        if (this.stateTime > 0.8) this.setState('chase');
        break;
      }
      case 'taunt': {
        this.facePlayer(dt);
        if (this.stateTime > 1.5) this.setState('chase');
        break;
      }
      case 'gotoseat': {
        if (!this.seat) { this.setState('roam'); break; }
        const left = this.moveToward(this.seat.position, this.speed * 0.9, dt, 0.12);
        if (left < 0.2) {
          this.root.position.copy(this.seat.position);
          this.face(this.seat.facing, 1, 100);
          this.setState('sit');
        }
        if (this.stateTime > 8) { this.w.seats.release(this.seat); this.seat = null; this.setState('roam'); }
        break;
      }
      case 'sit': {
        // Bounce on the cushion every 2 s; stand up if the player gets very close.
        this.sitBounce += dt;
        if (this.sitBounce > 2) {
          this.sitBounce = 0;
          this.avatar.play('sit', 0.05, true);
          this.say('giggle', 6);
        }
        if (this.seat) this.root.position.y = this.seat.position.y + Math.max(0, Math.sin(this.sitBounce * Math.PI) * 0.04);
        if (d < 1.0) { this.w.seats.release(this.seat); this.seat = null; this.setState('chase'); }
        break;
      }
    }
  }

  /** If a couch is nearby and the player has not looked at it for a while, go sit on it. */
  private considerCouch(dt: number): void {
    if (this.w.room.couches.length === 0) return;
    if (this.playerVisibleToPlayer()) {
      this.couchTimer = Math.max(0, this.couchTimer - dt);
      return;
    }
    this.couchTimer += dt;
    if (this.couchTimer > 3 + Math.random() * 7) {
      const seat = this.w.seats.reserve(this.id, this.root.position);
      if (seat && seat.position.distanceTo(this.root.position) < 4) {
        this.seat = seat;
        this.setState('gotoseat');
      } else {
        this.w.seats.release(seat);
      }
      this.couchTimer = 0;
    }
  }
}
