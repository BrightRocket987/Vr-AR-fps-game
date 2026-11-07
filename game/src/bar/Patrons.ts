import { BoxGeometry, CanvasTexture, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, SphereGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Gremlin, type GremlinOpts, type GremlinWorld } from '../ai/Gremlin';
import type { AnimName, Avatar } from '../ai/Avatar';
import type { HumanAvatar } from './Humans';
import type { ProjectilePool, StarPool } from './BarFx';
import { BRAD_FOREHEAD_HITS, GUS_WALK_S, GusCounter, OVERKILL_DAMAGE, gusSpeed } from './BarLogic';

/** What the bar's humans need from the chapter beyond the GremlinWorld. */
export interface BarHooks {
  /** Play a bar_ voice line (subtitle labelled by the chapter); `cooldown` seconds per id. */
  line(id: string, at: Object3D | null, cooldown?: number): void;
  stars: StarPool;
  peanuts: ProjectilePool;
  /** Called once when a human is knocked out (after enemy:popped was emitted). */
  onKO(h: BarHuman): void;
  /** Enemy time scale (the Tier 1 promotion slows patrons to 30% for 1.5 s; never the camera). */
  timeScale(): number;
}

const tmp = new Vector3();
const tmp2 = new Vector3();
/**
 * How close an adult comes. Kenney Mini Characters have heads about 0.55 x 0.6 x 0.6 of their height, so a 1.75 m
 * patron's face is ~0.5 m in front of his feet: stopping at 1.1 m keeps every face out of the player's head.
 */
export const MELEE_M = 1.1;
const WHITE = new Color(2.5, 2.5, 2.5);

/**
 * Base for every adult in the fight. Hits go through Gremlin.hit (HP, headshot x2); at 0 HP the adult is KNOCKED OUT
 * instead of popping: the same `enemy:popped` event (so lifetime pops and the BINKY tier advance), cartoon stars, a fall,
 * then a fade. Knocked-out humans are no longer targets.
 */
export abstract class BarHuman extends Gremlin {
  knockedOut = false;
  /** False when the Book Club Lady's hardback landed the knockout. */
  koByPlayer = true;
  protected byPlayer = true;
  protected readonly human: HumanAvatar;
  private flashT = 0;

  constructor(w: GremlinWorld, avatar: HumanAvatar, opts: GremlinOpts, protected readonly hooks: BarHooks) {
    super(w, avatar, opts);
    this.human = avatar;
  }

  /** On its feet and shootable. */
  get standing(): boolean {
    return this.alive && !this.knockedOut;
  }

  override update(dt: number): void {
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.human.setTint(null);
    }
    super.update(this.knockedOut ? dt : dt * this.hooks.timeScale());
  }

  protected flashHit(): void {
    this.human.setTint(WHITE);
    this.flashT = 0.08;
  }

  override hit(damage: number, headshot: boolean, style: string[] = []): boolean {
    if (!this.standing) return false;
    this.onHit(headshot);
    return super.hit(damage, headshot, style);
  }

  /** The Book Club Lady's hardback (2 damage, not the player's). */
  bookHit(): void {
    if (!this.standing) return;
    this.byPlayer = false;
    this.w.fx.text(this.headPosition(tmp), 'WHAP', '#ff9ad5');
    super.hit(2, false, ['HARDBACK']);
    this.byPlayer = true;
  }

  protected onHit(_headshot: boolean): void {}

  override pop(headshot = false, style: string[] = []): void {
    if (this.knockedOut || !this.alive) return;
    this.knockedOut = true;
    this.koByPlayer = this.byPlayer;
    this.hp = 0;
    this.setState('ko');
    this.human.play('die', 0.1, true);
    this.hooks.stars.attach(this.root, this.height * 0.42);
    const centre = this.root.position.clone().add(tmp.set(0, this.height * 0.5, 0));
    this.w.fx.pop(centre, this.color, 18);
    this.w.fx.text(this.headPosition(tmp2), headshot ? 'BONK' : 'KO!', headshot ? '#ffffff' : '#ffcc33');
    this.w.voice.sfx('pop', this.root, 0.9);
    this.w.bus.emit('enemy:popped', { id: this.id, type: this.type, position: centre, headshot, style });
    this.onKnockedOut();
    this.hooks.onKO(this);
  }

  protected onKnockedOut(): void {}

  /** Lie there with stars, then fade away. */
  protected tickKO(): void {
    if (this.stateTime > 2.4) this.human.setOpacity(Math.max(0, 1 - (this.stateTime - 2.4) / 0.8));
    if (this.stateTime > 3.2) this.dispose();
  }

  override dispose(): void {
    this.hooks.stars.release(this.root);
    super.dispose();
  }
}

/** Shared accessory materials (one per look). */
const accessoryMats = new Map<number, MeshStandardMaterial>();
function accMat(color: number): MeshStandardMaterial {
  let m = accessoryMats.get(color);
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness: 0.7 });
    accessoryMats.set(color, m);
  }
  return m;
}

/** Trucker cap (crown + brim, one mesh) sized for a character of height h. */
function makeCap(h: number, color: number): Mesh {
  const crown = new CylinderGeometry(h * 0.27, h * 0.3, h * 0.13, 12);
  crown.translate(0, h * 0.065, 0);
  const brim = new BoxGeometry(h * 0.42, h * 0.015, h * 0.22);
  brim.translate(0, h * 0.01, h * 0.3);
  const crownN = crown.toNonIndexed();
  const brimN = brim.toNonIndexed();
  crown.dispose();
  brim.dispose();
  const g = mergeGeometries([crownN, brimN], false);
  return new Mesh(g ?? crownN, accMat(color));
}

/** Big foam "#1" finger. */
function makeFoamFinger(h: number, color: number): Mesh {
  const hand = new BoxGeometry(h * 0.1, h * 0.13, h * 0.05);
  const finger = new BoxGeometry(h * 0.035, h * 0.13, h * 0.035);
  finger.translate(0, h * 0.13, 0);
  const g = mergeGeometries([hand.toNonIndexed(), finger.toNonIndexed()], false);
  hand.dispose();
  finger.dispose();
  return new Mesh(g ?? new BoxGeometry(0.1, 0.1, 0.1), accMat(color));
}

/** A hardback ("Raising Spirited Children"). */
export function makeBook(h: number): Mesh {
  return new Mesh(new BoxGeometry(h * 0.1, h * 0.13, h * 0.03), accMat(0x2a5aa8));
}

/**
 * Trucker Hat: a sniper. Walks to a spot about 4 m out, reaches into his pocket (0.8 s tell), lobs a slow visible
 * peanut at your head (2 Patience; lean to dodge). A headshot knocks his cap off. HP 3.
 */
export class TruckerHat extends BarHuman {
  readonly type = 'trucker';
  readonly speaker = 'patron';
  private cap: Mesh | null;
  private capFlight: { mesh: Mesh; vel: Vector3; spin: number; life: number } | null = null;
  private readonly spot = new Vector3();
  private throws = 0;

  constructor(w: GremlinWorld, avatar: HumanAvatar, hooks: BarHooks, private readonly spots: Vector3[], capColor: number) {
    super(w, avatar, { hp: 3, speed: 0.9, height: avatar.height, color: new Color(0xff9a3a), xp: 30, radius: 0.3 }, hooks);
    this.cap = makeCap(avatar.height, capColor);
    avatar.attachAt('head', this.cap, new Vector3(0, avatar.height * 0.9, 0.02));
  }

  protected override onState(s: string): void {
    const anims: Record<string, AnimName> = { spawn: 'walk', approach: 'walk', wait: 'idle' };
    if (anims[s]) this.human.play(anims[s]);
    if (s === 'aim') this.human.playClip('interact-right', 0.1, true);
    if (s === 'throw') this.human.play('attack', 0.05, true);
    if (s === 'approach') this.pickSpot();
  }

  private pickSpot(): void {
    const p = this.w.player.position(tmp);
    const free = this.spots.filter((s) => !this.w.gremlins().some((g) => g !== this && g instanceof TruckerHat && g.spot.distanceTo(s) < 0.5));
    const list = free.length ? free : this.spots;
    const pick = list[Math.floor(Math.random() * list.length)];
    this.spot.copy(pick ?? p);
  }

  protected tick(dt: number): void {
    this.updateCap(dt);
    switch (this.state) {
      case 'ko':
        this.tickKO();
        break;
      case 'spawn':
        this.root.position.addScaledVector(this.facing(tmp), this.speed * dt);
        if (this.stateTime > 1.0) this.setState('approach');
        break;
      case 'approach': {
        const left = this.moveToward(this.spot, this.speed, dt, 0.15);
        if (left < 0.25 || this.stateTime > 9) this.setState('aim');
        break;
      }
      case 'aim':
        this.facePlayer(dt);
        if (this.stateTime > 0.8) this.setState('throw');
        break;
      case 'throw':
        this.facePlayer(dt);
        if (this.stateTime > 0.22 && this.stateTime - dt <= 0.22) this.throwPeanut();
        if (this.stateTime > 0.7) this.setState('wait');
        break;
      case 'wait':
        this.facePlayer(dt);
        if (this.stateTime > 2.0) this.setState(this.throws % 3 === 2 ? 'approach' : 'aim');
        break;
    }
  }

  private throwPeanut(): void {
    this.throws++;
    const from = this.root.position.clone().addScaledVector(this.facing(tmp), 0.35);
    from.y += this.height * 0.55;
    const head = this.w.player.position(tmp2).clone();
    head.x += (Math.random() - 0.5) * 0.1;
    head.y += (Math.random() - 0.5) * 0.1;
    const dist = from.distanceTo(head);
    this.hooks.peanuts.launch(from, head, dist / 4.2, null, dist / 4.2 + 0.8);
    this.w.voice.sfx('thwip', this.root, 0.5);
    if (this.throws === 1) this.hooks.line('bar_trucker_who_threw', this.root, 20);
  }

  protected override onHit(headshot: boolean): void {
    if (headshot && this.cap) {
      this.knockCap();
      this.hooks.line('bar_trucker_not_hat', this.root, 6);
    } else this.hooks.line('bar_trucker_nerf', this.root, 12);
  }

  private knockCap(): void {
    if (!this.cap) return;
    const cap = this.cap;
    this.cap = null;
    const wp = cap.getWorldPosition(new Vector3());
    cap.removeFromParent();
    cap.position.copy(wp);
    cap.rotation.set(0, this.yaw, 0);
    cap.scale.setScalar(1);
    this.w.world.add(cap);
    const away = this.facing(tmp).negate();
    this.capFlight = { mesh: cap, vel: new Vector3(away.x * 0.8 + (Math.random() - 0.5), 3.0, away.z * 0.8), spin: 9, life: 1.6 };
    this.w.fx.text(wp, 'BONK', '#ffffff');
  }

  private updateCap(dt: number): void {
    const f = this.capFlight;
    if (!f) return;
    f.life -= dt;
    f.vel.y -= 9 * dt;
    f.mesh.position.addScaledVector(f.vel, dt);
    if (f.mesh.position.y < 0.03) {
      f.mesh.position.y = 0.03;
      f.vel.set(0, 0, 0);
      f.spin = 0;
    }
    f.mesh.rotation.x += f.spin * dt;
    if (f.life <= 0 && this.state !== 'ko') {
      f.mesh.removeFromParent();
      f.mesh.geometry.dispose();
      this.capFlight = null;
    }
  }

  protected override onKnockedOut(): void {
    this.hooks.line('bar_trucker_bowl', this.root, 10);
  }

  override dispose(): void {
    if (this.capFlight) {
      this.capFlight.mesh.removeFromParent();
      this.capFlight.mesh.geometry.dispose();
      this.capFlight = null;
    }
    this.cap?.geometry.dispose();
    super.dispose();
  }
}

/**
 * Jersey Guy: a rusher. Walks in, claps twice and yells (1 s tell), rushes and chest-bumps (6 Patience), backs off,
 * repeats. HP 4.
 */
export class JerseyGuy extends BarHuman {
  readonly type = 'jersey';
  readonly speaker = 'patron';
  private readonly finger: Mesh;

  constructor(w: GremlinWorld, avatar: HumanAvatar, hooks: BarHooks, teamColor: number) {
    super(w, avatar, { hp: 4, speed: 1.1, height: avatar.height, color: new Color(0x3fd6c8), xp: 30, radius: 0.32 }, hooks);
    this.finger = makeFoamFinger(avatar.height, teamColor);
    avatar.attachAt('arm-right', this.finger, new Vector3(-avatar.height * 0.47, avatar.height * 0.44, 0.05));
  }

  protected override onState(s: string): void {
    switch (s) {
      case 'spawn':
      case 'approach':
        this.human.play('walk');
        if (s === 'spawn') this.hooks.line('bar_jersey_team_play', this.root, 20);
        break;
      case 'tell':
        this.human.playClip('interact-left', 0.08, true);
        this.hooks.line('bar_jersey_defence', this.root, 5);
        break;
      case 'rush':
        this.human.play('run');
        break;
      case 'bump':
        this.human.play('attack', 0.05, true);
        break;
      case 'recover':
        this.human.play('walk');
        break;
    }
  }

  protected tick(dt: number): void {
    const d = this.distToPlayer();
    switch (this.state) {
      case 'ko':
        this.tickKO();
        break;
      case 'spawn':
        this.root.position.addScaledVector(this.facing(tmp), this.speed * dt);
        if (this.stateTime > 1.0) this.setState('approach');
        break;
      case 'approach':
        this.moveToward(this.w.player.position(tmp), this.speed, dt, MELEE_M);
        if (d < 2.8 && this.stateTime > 0.5) this.setState('tell');
        break;
      case 'tell': {
        this.facePlayer(dt);
        // two claps you can hear
        const t = this.stateTime;
        if ((t > 0.2 && t - dt <= 0.2) || (t > 0.6 && t - dt <= 0.6)) {
          this.w.voice.sfx('knock', this.root, 0.9);
          if (t > 0.5) this.human.playClip('interact-right', 0.05, true);
        }
        if (t > 1.0) this.setState('rush');
        break;
      }
      case 'rush':
        this.moveToward(this.w.player.position(tmp), 3.0, dt, MELEE_M);
        if (d < MELEE_M + 0.08 || this.stateTime > 1.6) this.setState('bump');
        break;
      case 'bump':
        this.facePlayer(dt);
        if (this.stateTime > 0.18 && this.stateTime - dt <= 0.18 && d < MELEE_M + 0.4) {
          this.w.player.damage(6, 'Jersey Guy');
          this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: 6 });
          this.hooks.line('bar_jersey_foam', this.root, 10);
        }
        if (this.stateTime > 0.6) this.setState('recover');
        break;
      case 'recover': {
        const p = this.w.player.position(tmp);
        const away = tmp2.copy(this.root.position).sub(p).setY(0).normalize().multiplyScalar(2.4).add(p);
        this.moveToward(away, 0.9, dt, 0.1);
        if (this.stateTime > 1.6) this.setState('approach');
        break;
      }
    }
  }

  protected override onHit(): void {
    this.hooks.line('bar_jersey_ref', this.root, 6);
  }

  protected override onKnockedOut(): void {
    this.hooks.line('bar_jersey_tuesday', this.root, 8);
  }

  override dispose(): void {
    this.finger.geometry.dispose();
    super.dispose();
  }
}

/**
 * Brad, the rival parent. Sits at Booth 8 until the Nacho Avalanche, then walks over, adjusts his quarter-zip (1 s) and
 * shoves (5). Forehead-only hitbox: body darts bounce ("Woah woah woah, buddy"); six forehead darts knock him out.
 */
export class Brad extends BarHuman {
  readonly type = 'brad';
  readonly speaker = 'brad';
  foreheadHits = 0;
  /** Fallback for a player who can't find the forehead: after a while body darts count too. */
  softHitbox = false;

  constructor(w: GremlinWorld, avatar: HumanAvatar, hooks: BarHooks) {
    super(w, avatar, { hp: BRAD_FOREHEAD_HITS, speed: 0.9, height: avatar.height, color: new Color(0x9ad94a), xp: 100, radius: 0.32 }, hooks);
  }

  get seated(): boolean {
    return this.state === 'seated';
  }

  stand(): void {
    if (this.state === 'seated') this.setState('stand');
  }

  protected override onState(s: string): void {
    switch (s) {
      case 'seated':
        this.human.play('sit', 0.2);
        break;
      case 'stand':
        this.human.play('idle', 0.3);
        this.hooks.line('bar_brad_calm', this.root, 30);
        break;
      case 'approach':
        this.human.play('walk');
        break;
      case 'tell':
        this.human.playClip('interact-right', 0.1, true);
        break;
      case 'shove':
        this.human.play('attack', 0.05, true);
        break;
      case 'sneeze':
        this.human.play('crouch', 0.08);
        break;
      case 'recover':
        this.human.play('idle');
        break;
    }
  }

  override hit(damage: number, headshot: boolean, style: string[] = []): boolean {
    if (!this.standing || this.state === 'seated') return false;
    if (damage >= OVERKILL_DAMAGE) {
      this.pop(headshot, style);
      return true;
    }
    if (!headshot && !this.softHitbox) {
      this.w.fx.text(this.root.position.clone().add(tmp.set(0, this.height * 0.45, 0)), 'BOING', '#9ad9ff');
      this.w.voice.sfx('squeak_inflate', this.root, 0.4);
      this.hooks.line('bar_brad_woah', this.root, 4);
      return false;
    }
    this.foreheadHits++;
    this.hp--;
    this.flashHit();
    this.w.voice.sfx('squeak_hit', this.root, 0.6);
    if (this.foreheadHits === 1) this.hooks.line('bar_brad_trophy', this.root, 60);
    if (this.hp <= 0) {
      this.pop(true, ['BONK', ...style]);
      return true;
    }
    if (this.state !== 'sneeze') this.setState('sneeze');
    return false;
  }

  protected tick(dt: number): void {
    const d = this.distToPlayer();
    switch (this.state) {
      case 'ko':
        this.tickKO();
        break;
      case 'seated':
        break;
      case 'stand':
        this.facePlayer(dt);
        if (this.stateTime > 1.2) this.setState('approach');
        break;
      case 'approach':
        this.moveToward(this.w.player.position(tmp), this.speed, dt, MELEE_M);
        if (d < MELEE_M + 0.15) this.setState('tell');
        if (this.stateTime > 3 && this.stateTime - dt <= 3) this.hooks.line('bar_brad_kayden_look', this.root, 30);
        break;
      case 'tell':
        this.facePlayer(dt);
        if (this.stateTime > 1.0) this.setState('shove');
        break;
      case 'shove':
        if (this.stateTime > 0.2 && this.stateTime - dt <= 0.2 && d < MELEE_M + 0.45) {
          this.w.player.damage(5, 'Brad');
          this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: 5 });
        }
        if (this.stateTime > 0.6) this.setState('recover');
        break;
      case 'sneeze':
        if (this.stateTime > 0.9) this.setState('recover');
        break;
      case 'recover': {
        if (d < MELEE_M + 0.4) {
          const p = this.w.player.position(tmp);
          const away = tmp2.copy(this.root.position).sub(p).setY(0).normalize().multiplyScalar(MELEE_M + 0.6).add(p);
          this.moveToward(away, 0.7, dt, 0.1);
        } else this.facePlayer(dt);
        if (this.stateTime > 1.4) this.setState('approach');
        break;
      }
    }
  }

  protected override onKnockedOut(): void {
    this.hooks.line('bar_brad_lawyer', this.root, 60);
  }
}

/**
 * Gus the bouncer (2.1 m): unbeatable, scored on style. Walks a fixed path to the booth in about GUS_WALK_S seconds
 * whatever you do; every 10 counts (head hits 3) staggers him 2 s ("Please don't.") and counts as a pop.
 */
export class Gus extends BarHuman {
  readonly type = 'gus';
  readonly speaker = 'gus';
  readonly counter = new GusCounter();
  private seg = 0;
  walkTime = 0;
  arrived = false;
  onArrive: (() => void) | null = null;

  constructor(w: GremlinWorld, avatar: HumanAvatar, hooks: BarHooks, private readonly path: Vector3[]) {
    super(w, avatar, { hp: 9999, speed: 0.35, height: avatar.height, color: new Color(0x222233), xp: 50, radius: 0.4 }, hooks);
    const sign = makeSecuritySign(avatar.height);
    avatar.attachAt('torso', sign, new Vector3(0, avatar.height * 0.3, avatar.height * 0.165));
  }

  protected override onState(s: string): void {
    if (s === 'enter') this.human.play('idle');
    if (s === 'walk') {
      this.human.play('walk', 0.3);
      this.human.setTimeScale(0.5);
    } else this.human.setTimeScale(1);
    if (s === 'stagger') this.human.playClip('emote-no', 0.1, true);
    if (s === 'arrive') this.human.playClip('interact-right', 0.2, true);
  }

  override hit(_damage: number, headshot: boolean): boolean {
    if (this.arrived || !this.alive) return false;
    this.flashHit();
    this.w.voice.sfx('squeak_hit', this.root, 0.4);
    if (headshot) this.w.fx.text(this.headPosition(tmp), 'NOSTRIL x3', '#ff9ad5');
    if (this.counter.add(headshot)) {
      this.setState('stagger');
      this.hooks.stars.attach(this.root, this.height * 1.05);
      this.hooks.line(this.counter.staggers === 3 ? 'bar_gus_done' : 'bar_gus_please', this.root, 2.5);
      const centre = this.root.position.clone().add(tmp2.set(0, this.height * 0.6, 0));
      this.w.fx.pop(centre, new Color(0xffe14d), 20);
      this.w.fx.text(centre, `STAGGER ${this.counter.staggers}`, '#ffe14d');
      this.w.bus.emit('enemy:popped', { id: this.id, type: 'gus', position: centre, headshot, style: ['STAGGER'] });
    }
    return false;
  }

  override pop(): void {
    // Gus cannot be knocked out.
  }

  private remaining(): number {
    let len = 0;
    let from = this.root.position;
    for (let i = this.seg; i < this.path.length; i++) {
      len += Math.hypot(this.path[i].x - from.x, this.path[i].z - from.z);
      from = this.path[i];
    }
    return len;
  }

  protected tick(dt: number): void {
    if (this.arrived) return;
    if (this.state !== 'enter') this.walkTime += dt;
    switch (this.state) {
      case 'enter':
        this.facePlayer(dt);
        if (this.stateTime > 1.6) this.setState('walk');
        break;
      case 'stagger':
        if (this.stateTime > 2.0) {
          this.hooks.stars.release(this.root);
          this.setState('walk');
        }
        break;
      case 'walk': {
        const v = gusSpeed(this.remaining(), GUS_WALK_S - this.walkTime, 0.2, 1.0);
        const target = this.path[this.seg];
        if (!target) break;
        const pos = this.root.position;
        const dx = target.x - pos.x, dz = target.z - pos.z;
        const dist = Math.hypot(dx, dz);
        const step = v * dt;
        if (dist <= step) {
          pos.x = target.x;
          pos.z = target.z;
          this.seg++;
        } else {
          pos.x += (dx / dist) * step;
          pos.z += (dz / dist) * step;
          this.face(tmp.set(dx, 0, dz), dt, 4);
        }
        if (this.seg >= this.path.length || this.distToPlayer() < MELEE_M + 0.35) this.arrive();
        break;
      }
    }
    if (this.walkTime > GUS_WALK_S + 6) this.arrive();
  }

  arrive(): void {
    if (this.arrived) return;
    this.arrived = true;
    this.hooks.stars.release(this.root);
    this.setState('arrive');
    this.onArrive?.();
  }
}

function makeSecuritySign(h: number): Mesh {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#111';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#f4f4f0';
    g.font = 'bold 44px "Trebuchet MS", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('SECURITY', 128, 34);
  }
  return new Mesh(new PlaneGeometry(h * 0.34, h * 0.085), new MeshBasicMaterial({ map: new CanvasTexture(c) }));
}

/** An invisible avatar for props the BINKY can hit (the goose, the claw machine's big button). */
class PropAvatar implements Avatar {
  readonly root = new Group();
  readonly kind = 'procedural' as const;
  constructor(readonly height: number) {}
  play(): void {}
  update(): void {}
  setTint(): void {}
  setStretch(): void {}
  dispose(): void {}
}

/** A shootable prop: never pops, just reports hits. Placed by setting `position` (never spawned: no enemy event). */
export class ShootTarget extends Gremlin {
  readonly type = 'prop';
  readonly speaker = 'narrator';
  onShot: ((headshot: boolean, point: Vector3) => void) | null = null;

  constructor(w: GremlinWorld, height: number, radius: number) {
    super(w, new PropAvatar(height), { hp: 1, speed: 0, height, color: new Color(0xffffff), xp: 0, radius });
    this.state = 'idle';
  }

  override hit(_damage: number, headshot: boolean): boolean {
    if (!this.alive) return false;
    this.onShot?.(headshot, this.root.position.clone().add(tmp.set(0, this.height * 0.5, 0)));
    return false;
  }

  override pop(): void {}

  protected tick(): void {}
}

/** A non-target character (the kids, Kayden, Marlene, the Book Club Lady): an avatar placed in the scene. */
export class Npc {
  readonly root = new Group();
  private t = Math.random() * 10;
  bob = 0;

  constructor(readonly avatar: HumanAvatar, parent: Object3D, position: Vector3, facing: Vector3) {
    this.root.add(avatar.root);
    this.root.position.copy(position);
    this.root.rotation.y = Math.atan2(facing.x, facing.z);
    parent.add(this.root);
  }

  /** Turn toward a world point (XZ) at `rate`. */
  faceToward(p: Vector3, dt: number, rate = 4): void {
    const target = Math.atan2(p.x - this.root.position.x, p.z - this.root.position.z);
    let d = target - this.root.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.root.rotation.y += d * Math.min(1, rate * dt);
  }

  update(dt: number): void {
    this.t += dt;
    this.avatar.update(dt);
    if (this.bob > 0) this.avatar.root.position.y = Math.abs(Math.sin(this.t * 7)) * this.bob;
    else this.avatar.root.position.y = 0;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.avatar.dispose();
  }
}

/** Mister Hop: a grey stuffed rabbit with one ear down (one mesh). */
export function makeRabbit(s: number): Mesh {
  const parts = [
    new SphereGeometry(0.06 * s, 8, 6).scale(1, 1.15, 0.9),
    new SphereGeometry(0.045 * s, 8, 6).translate(0, 0.085 * s, 0),
    new SphereGeometry(0.014 * s, 6, 4).scale(1, 3.2, 1).translate(-0.018 * s, 0.15 * s, 0),
    new SphereGeometry(0.014 * s, 6, 4).scale(3.2, 1, 1).translate(0.045 * s, 0.11 * s, 0),
  ].map((g) => g.toNonIndexed());
  const g = mergeGeometries(parts, false);
  return new Mesh(g ?? parts[0], accMat(0x9a9aa6));
}

/** Pickle's red cape. */
export function makeCape(h: number): Mesh {
  // wider than the body so it peeks out at the sides when she faces you
  const g = new BoxGeometry(h * 0.72, h * 0.42, h * 0.02);
  return new Mesh(g, accMat(0xd92a2a));
}
