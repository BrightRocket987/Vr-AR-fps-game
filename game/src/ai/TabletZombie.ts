import { BoxGeometry, Color, Mesh, MeshBasicMaterial, type Object3D, Vector3 } from 'three';
import { Gremlin, type GremlinWorld, type VoiceLike } from './Gremlin';
import type { Avatar } from './Avatar';
import type { Door } from '../room/RoomModel';

/** Shuffle speed (m/s): slow, straight, oblivious. */
export const ZOMBIE_SPEED = 0.5;
/** After the tablet breaks it chases like a Scamp at this speed. */
export const ZOMBIE_CHASE_SPEED = 1.2;
export const ZOMBIE_HP = 5;
/** The tablet is a frontal shield with its own hit points. */
export const TABLET_HP = 3;
/** Shots from within ±60° of where it faces hit the tablet (cos 60° = 0.5). */
export const SHIELD_COS = 0.5;
/** It bumps into you politely from this close (the 0.6 m bubble keeps it just outside). */
export const BUMP_RANGE = 0.8;
/** One bump a second, 2 damage each ("'scuse me"). */
export const BUMP_DAMAGE = 2;
export const BUMP_INTERVAL = 1;
/** "My tablet broke!": runs in circles this long, taking double damage. */
export const PANIC_SECONDS = 3;
export const PANIC_DAMAGE_MULT = 2;
export const PANIC_SPEED = 1.6;
/** Standing within this depth of a door plane (and inside its width) it holds that portal open. */
export const DOOR_HOLD_DEPTH = 0.6;
/** Seconds a loitering zombie stands in the frame looking for WiFi. */
export const LOITER_SECONDS = 3;

const ZOMBIE_BLUE = new Color(0x5da9e9);
const SPARK_BLUE = new Color(0x9ad5ff);
// Pooled: every zombie shares the tablet geometry and its glowing material (one draw call each).
const TABLET_GEO = new BoxGeometry(0.17, 0.12, 0.015);
const TABLET_MAT = new MeshBasicMaterial({ color: 0xbfe6ff });

const tmp = new Vector3();
const tmp2 = new Vector3();

/** Does a shot fired from `shooter` hit the tablet of a zombie at `pos` facing `facing` (horizontal)? */
export function isFrontal(pos: Vector3, facing: Vector3, shooter: Vector3, cos = SHIELD_COS): boolean {
  const dx = shooter.x - pos.x;
  const dz = shooter.z - pos.z;
  const len = Math.hypot(dx, dz);
  const fl = Math.hypot(facing.x, facing.z);
  if (len < 1e-6 || fl < 1e-6) return true;
  return (dx * facing.x + dz * facing.z) / (len * fl) >= cos;
}

/** Is a floor point standing in a door frame: within `depth` in front of the plane (or just behind it) and inside the width? */
export function inDoorFrame(p: Vector3, door: Pick<Door, 'center' | 'normal' | 'width'>, depth = DOOR_HOLD_DEPTH): boolean {
  const dx = p.x - door.center.x;
  const dz = p.z - door.center.z;
  const along = dx * door.normal.x + dz * door.normal.z;
  const lateral = dx * door.normal.z - dz * door.normal.x;
  return along > -0.3 && along < depth && Math.abs(lateral) <= door.width / 2;
}

/** Split a hit between the tablet and the body: the tablet absorbs up to its HP, the rest carries through. */
export function splitShieldDamage(damage: number, tabletHp: number): { tablet: number; body: number } {
  const tablet = Math.max(0, Math.min(tabletHp, damage));
  return { tablet, body: Math.max(0, damage - tablet) };
}

type SayIdVoice = VoiceLike & { sayId?: (id: string, at: Object3D | null) => void };

/**
 * Tablet Zombie (roster #7). HP 5 + a 3 HP tablet, 0.5 m/s, 0.6 m. SHUFFLEs out of an open portal in a straight
 * line at your feet, its face lit blue by the tablet it holds at face height. The tablet is a FRONTAL shield:
 * shots from its front spark off it ("BLOCK"); side and back shots hit the body. In reach it BUMPs you politely
 * (2 a second, "'scuse me."). Break the tablet and it PANICs ("My tablet broke!"): three seconds of running in
 * circles at double damage, then it chases like a Scamp. Standing in a door frame it holds that portal open:
 * anything that closes it is undone ("Where's the WiFi."). One extra draw call (the tablet).
 */
export class TabletZombie extends Gremlin {
  readonly type = 'zombie';
  readonly speaker = 'zombie';
  tabletHp = TABLET_HP;
  /** The door whose portal this zombie is holding open (standing in its frame), or null. */
  holdingDoorId: string | null = null;
  private readonly tablet: Mesh;
  private sinceBump = 0;
  private barkTimer = 4 + Math.random() * 4;
  private panicCentre = new Vector3();
  private panicAngle = 0;
  private loiter = false;
  private saidWifi = false;
  private blockFlash = 0;
  private shuffleT = 0;

  constructor(w: GremlinWorld, avatar: Avatar, opts: { loiter?: boolean } = {}) {
    super(w, avatar, { hp: ZOMBIE_HP, speed: ZOMBIE_SPEED, height: 0.6, color: ZOMBIE_BLUE.clone(), xp: 25, radius: 0.22 });
    this.tablet = new Mesh(TABLET_GEO, TABLET_MAT);
    // Held at face height, a hand-span in front of the face, screen toward the face.
    this.tablet.position.set(0, this.height * 0.78, 0.17);
    this.tablet.rotation.x = -0.15;
    this.root.add(this.tablet);
    this.loiter = opts.loiter ?? Math.random() < 0.35;
  }

  get hasTablet(): boolean {
    return this.tabletHp > 0;
  }

  protected override onState(s: string): void {
    switch (s) {
      case 'spawn':
        this.avatar.play('walk');
        break;
      case 'loiter':
        this.avatar.play('idle');
        break;
      case 'shuffle':
        this.avatar.play('walk');
        break;
      case 'bump':
        this.avatar.play('idle');
        this.sinceBump = BUMP_INTERVAL * 0.6;
        break;
      case 'panic':
        this.avatar.play('run');
        this.panicCentre.copy(this.root.position);
        this.panicAngle = this.yaw;
        this.sayLine('zombie_tablet_broke', 'scream');
        break;
      case 'chase':
        this.avatar.play('run');
        break;
    }
  }

  protected tick(dt: number): void {
    const d = this.distToPlayer();
    this.updateDoorHold();
    if (this.blockFlash > 0) {
      this.blockFlash -= dt;
      const s = 1 + Math.max(0, this.blockFlash) * 2;
      this.tablet.scale.set(s, s, 1);
    }
    switch (this.state) {
      case 'spawn': {
        // A loiterer stops in the frame; everyone else shuffles 0.6 m straight out of it.
        if (this.loiter && this.holdingDoorId && this.stateTime > 0.3) {
          this.setState('loiter');
          break;
        }
        this.root.position.addScaledVector(this.facing(tmp), ZOMBIE_SPEED * dt);
        if (this.stateTime > 1.2) this.setState('shuffle');
        break;
      }
      case 'loiter': {
        // Stands in the doorway holding the portal open, looking for WiFi.
        this.avatar.root.rotation.y = Math.sin(this.stateTime * 2) * 0.5;
        if (!this.saidWifi) {
          this.saidWifi = true;
          this.sayLine('zombie_wheres_wifi', 'monotone');
        }
        if (this.stateTime > LOITER_SECONDS) {
          this.avatar.root.rotation.y = 0;
          this.setState('shuffle');
        }
        break;
      }
      case 'shuffle': {
        this.shuffleT += dt;
        // A stiff side-to-side lurch so the silhouette reads as a zombie shuffle.
        this.avatar.root.rotation.z = Math.sin(this.shuffleT * 5) * 0.06;
        if (d <= BUMP_RANGE) {
          this.setState('bump');
          break;
        }
        this.moveToward(this.w.player.position(tmp), ZOMBIE_SPEED, dt, BUMP_RANGE - 0.1);
        this.barkTimer -= dt;
        if (this.barkTimer <= 0) {
          this.barkTimer = 7 + Math.random() * 6;
          this.say('monotone', 6);
        }
        break;
      }
      case 'bump': {
        this.facePlayer(dt);
        this.sinceBump += dt;
        if (this.sinceBump >= BUMP_INTERVAL && d <= BUMP_RANGE + 0.1) {
          this.sinceBump = 0;
          this.avatar.play('attack', 0.05, true);
          this.w.player.damage(BUMP_DAMAGE, this.type);
          this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: BUMP_DAMAGE });
          this.sayLine('zombie_scuse_me', 'monotone');
        }
        if (d > BUMP_RANGE + 0.3) this.setState(this.hasTablet ? 'shuffle' : 'chase');
        break;
      }
      case 'panic': {
        // Tight circles around where the tablet broke.
        this.panicAngle += 3.2 * dt;
        const target = tmp.set(this.panicCentre.x + Math.sin(this.panicAngle) * 0.6, this.w.room.floorY, this.panicCentre.z + Math.cos(this.panicAngle) * 0.6);
        this.moveToward(target, PANIC_SPEED, dt, 0.02);
        this.avatar.root.rotation.z = Math.sin(this.stateTime * 14) * 0.15;
        if (this.stateTime >= PANIC_SECONDS) {
          this.avatar.root.rotation.z = 0;
          this.setState('chase');
        }
        break;
      }
      case 'chase': {
        if (d <= BUMP_RANGE) {
          this.setState('bump');
          break;
        }
        this.moveToward(this.w.player.position(tmp), ZOMBIE_CHASE_SPEED, dt, BUMP_RANGE - 0.1);
        break;
      }
    }
  }

  /** Frontal shots hit the tablet (spark + BLOCK); side/back shots hit the body; panic doubles damage. */
  override hit(damage: number, headshot: boolean, style: string[] = []): boolean {
    if (!this.alive) return false;
    if (this.hasTablet && isFrontal(this.root.position, this.facing(tmp2), this.w.player.position(tmp))) {
      const split = splitShieldDamage(damage, this.tabletHp);
      this.tabletHp -= split.tablet;
      const at = this.tablet.getWorldPosition(new Vector3());
      this.w.fx.pop(at, SPARK_BLUE, 6);
      this.w.fx.text(at, 'BLOCK', '#9ad5ff');
      this.w.voice.sfx('ui_click', this.root, 0.7);
      this.blockFlash = 0.12;
      if (this.tabletHp <= 0) this.breakTablet();
      if (split.body <= 0) return false;
      return super.hit(split.body, false, style);
    }
    const mult = this.state === 'panic' ? PANIC_DAMAGE_MULT : 1;
    return super.hit(damage * mult, headshot, style);
  }

  private breakTablet(): void {
    this.tabletHp = 0;
    this.tablet.visible = false;
    const at = this.tablet.getWorldPosition(new Vector3());
    this.w.fx.pop(at, SPARK_BLUE, 14);
    this.w.fx.text(at, 'CRACK', '#9ad5ff');
    this.w.voice.sfx('pop', this.root, 0.6);
    if (this.alive && this.state !== 'init') this.setState('panic');
  }

  /** Standing in a door frame keeps that portal open: undo any close while it is there. */
  private updateDoorHold(): void {
    let holding: string | null = null;
    for (const door of this.w.room.portalDoors) {
      if (inDoorFrame(this.root.position, door)) {
        holding = door.id;
        break;
      }
    }
    this.holdingDoorId = holding;
    if (!holding) return;
    const open = this.w.openDoors();
    if (!open.some((d) => d.id === holding)) this.w.setDoorOpen(holding, true);
  }

  override dispose(): void {
    this.holdingDoorId = null;
    super.dispose();
  }

  /** A specific line when the voice supports ids, else a random line of that emotion. */
  private sayLine(id: string, emotion: string): void {
    const v = this.w.voice as SayIdVoice;
    if (typeof v.sayId === 'function') v.sayId(id, this.root);
    else v.say(this.speaker, emotion, this.root);
  }
}
