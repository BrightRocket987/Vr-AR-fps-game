import { DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';
import type { Gremlin, GremlinWorld, HandLike } from './Gremlin';

/** Hand speed that turns a touch into a SLAP (m/s). */
export const SLAP_SPEED = 2.5;
export const SLAP_DAMAGE = 2;
/** A slapped gremlin is shoved this far, over this long. */
export const SLAP_KNOCKBACK_M = 1.0;
export const SLAP_KNOCKBACK_S = 0.3;
/** One gremlin cannot be slapped again for this long (one swing, one slap). */
export const SLAP_COOLDOWN_S = 0.5;
/** Wipe sweep: grip held, hand moving down faster than this, within this radius of the body centre. */
export const SWEEP_DOWN_SPEED = 0.6;
export const SWEEP_RADIUS = 0.5;
/** Cumulative contact needed to change a diaper. */
export const SWEEP_SECONDS = 1.5;
/** Progress bleeds away at this rate while the hand is off the Stinky (so a short break is not a restart). */
export const SWEEP_DECAY = 0.5;
/** §6 rule 2: nothing is ever pushed inside this distance of the player. */
export const PLAYER_BUBBLE = 0.6;

/**
 * Something the Wipe can change: a Stinky now, Big Bean later. Structural (not a class) so other packs
 * and tests can implement it without importing Stinky.
 */
export interface DiaperTarget {
  /** True while a Wipe sweep may change this gremlin (e.g. a Stinky in WADDLE or DEMAND). */
  readonly changeable: boolean;
  /** 0..1 sweep progress, written by the Wipe so the target can draw a progress ring. */
  changeProgress: number;
  changeDiaper(): void;
}

export function isDiaperTarget(g: Gremlin): g is Gremlin & DiaperTarget {
  const c = g as Partial<DiaperTarget>;
  return typeof c.changeDiaper === 'function' && typeof c.changeable === 'boolean';
}

/** Body sphere shared with the gun: centre at 45% height, radius max(0.22, 0.3·height). Returns the radius. */
export function bodySphere(g: Gremlin, centre: Vector3): number {
  centre.copy(g.position);
  centre.y += g.height * 0.45;
  return Math.max(0.22, g.height * 0.3);
}

/** Signed hand speed along a unit direction (m/s); positive means moving that way. */
export function handSpeedAlong(hand: HandLike, dir: Vector3): number {
  return hand.velocity.dot(dir);
}

/** Is the hand within `radius` of a world point? */
export function handWithin(hand: HandLike, point: Vector3, radius: number): boolean {
  return hand.connected && hand.position.distanceToSquared(point) <= radius * radius;
}

/** Does the segment a→b pass within `r` of `centre`? (A point test when a === b.) */
export function segmentHitsSphere(a: Vector3, b: Vector3, centre: Vector3, r: number): boolean {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz;
  let t = 0;
  if (len2 > 1e-9) {
    t = ((centre.x - a.x) * abx + (centre.y - a.y) * aby + (centre.z - a.z) * abz) / len2;
    t = Math.max(0, Math.min(1, t));
  }
  const px = a.x + abx * t - centre.x, py = a.y + aby * t - centre.y, pz = a.z + abz * t - centre.z;
  return px * px + py * py + pz * pz <= r * r;
}

interface Knockback {
  g: Gremlin;
  dir: Vector3;
  remaining: number;
}

// Pooled: one quad for every Wipe ever made. Pivot at the top edge so the cloth sways from the hand.
const CLOTH_GEO = new PlaneGeometry(0.12, 0.16).translate(0, -0.08, 0);

const tmp = new Vector3();
const tmp2 = new Vector3();
const tmp3 = new Vector3();

/**
 * THE WIPE: the off-hand tool. Constructed once by the chapter and updated every frame. Detects SLAPS
 * (fast hand through a body), WIPE SWEEPS (grip held, hand sweeping down over a Stinky) and draws a small
 * wet-wipe quad hanging from the off hand (1 draw call). Door SLAMS live in the Breacher, which uses the
 * hand helpers exported above.
 */
export class Wipe {
  /** Follows the off hand; the cloth quad hangs from it. */
  readonly root = new Group();
  private readonly cloth: Mesh;
  private readonly mat: MeshBasicMaterial;
  private readonly prevHand = new Vector3();
  private hasPrev = false;
  private readonly knockbacks: Knockback[] = [];
  private readonly slapCooldown = new Map<number, number>();
  private readonly sweeps = new Map<number, number>();
  private t = 0;
  private tiltX = 0;
  private tiltZ = 0;
  /** Gremlins slapped during the last update (for tests and the chapter's style tags). */
  readonly slappedThisFrame: Gremlin[] = [];
  /** The diaper target being swept during the last update, if any. */
  sweepingThisFrame: (Gremlin & DiaperTarget) | null = null;
  /** Lifetime counters (achievements: World's Okayest Parent). */
  slaps = 0;
  changes = 0;

  constructor(private readonly w: GremlinWorld) {
    this.mat = new MeshBasicMaterial({ color: 0xbdf3ea, side: DoubleSide, transparent: true, opacity: 0.92, depthWrite: false });
    this.cloth = new Mesh(CLOTH_GEO, this.mat);
    this.cloth.frustumCulled = false;
    this.root.add(this.cloth);
    this.root.visible = false;
    w.world.add(this.root);
  }

  update(dt: number): void {
    this.t += dt;
    this.slappedThisFrame.length = 0;
    this.sweepingThisFrame = null;
    this.updateKnockbacks(dt);
    for (const [id, left] of this.slapCooldown) {
      if (left - dt <= 0) this.slapCooldown.delete(id);
      else this.slapCooldown.set(id, left - dt);
    }
    const hand = this.w.offHand();
    this.root.visible = hand.connected;
    if (!hand.connected) {
      this.hasPrev = false;
      this.decaySweeps(dt, null);
      return;
    }
    this.updateGlove(hand, dt);
    const gremlins = this.w.gremlins();
    this.detectSlaps(hand, gremlins);
    const swept = this.detectSweeps(hand, gremlins, dt);
    this.decaySweeps(dt, swept);
    this.prevHand.copy(hand.position);
    this.hasPrev = true;
  }

  /** Progress (0..1) of the sweep on a given gremlin, for HUD rings. */
  sweepProgress(g: Gremlin): number {
    return Math.min(1, (this.sweeps.get(g.id) ?? 0) / SWEEP_SECONDS);
  }

  dispose(): void {
    this.w.world.remove(this.root);
    this.mat.dispose();
    this.knockbacks.length = 0;
    this.sweeps.clear();
  }

  // ---- slap ----------------------------------------------------------------------------------------

  private detectSlaps(hand: HandLike, gremlins: Gremlin[]): void {
    if (hand.speed <= SLAP_SPEED) return;
    const from = this.hasPrev ? this.prevHand : hand.position;
    for (const g of gremlins) {
      if (!g.alive || !g.avatar.root.visible || this.slapCooldown.has(g.id)) continue;
      const r = bodySphere(g, tmp);
      if (!segmentHitsSphere(from, hand.position, tmp, r)) continue;
      this.slap(hand, g);
    }
  }

  private slap(hand: HandLike, g: Gremlin): void {
    this.slapCooldown.set(g.id, SLAP_COOLDOWN_S);
    // Shove away from the hand; when the hand is dead-centre, along the swing instead.
    const dir = tmp2.set(g.position.x - hand.position.x, 0, g.position.z - hand.position.z);
    if (dir.lengthSq() < 1e-4) dir.set(hand.velocity.x, 0, hand.velocity.z);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();
    const popped = g.hit(SLAP_DAMAGE, false, ['SLAP']);
    this.slaps++;
    this.slappedThisFrame.push(g);
    this.w.bus.emit('wipe:slap', { targetId: g.id });
    this.w.voice.sfx('thwip', g.root, 0.9);
    hand.pulse(0.7, 60);
    if (!popped && g.alive) {
      g.say('whine', 1);
      // Sitters stay put (eviction is their own business); everyone else flies 1 m.
      if (!g.seat) this.knockbacks.push({ g, dir: dir.clone(), remaining: SLAP_KNOCKBACK_S });
    }
  }

  private updateKnockbacks(dt: number): void {
    for (let i = this.knockbacks.length - 1; i >= 0; i--) {
      const kb = this.knockbacks[i];
      if (!kb.g.alive || kb.remaining <= 0) {
        this.knockbacks.splice(i, 1);
        continue;
      }
      const step = Math.min(dt, kb.remaining) * (SLAP_KNOCKBACK_M / SLAP_KNOCKBACK_S);
      kb.remaining -= dt;
      const pos = kb.g.position;
      let nx = pos.x + kb.dir.x * step, nz = pos.z + kb.dir.z * step;
      const room = this.w.room;
      if (!room.contains(nx, nz) || room.blockedAt(nx, nz, kb.g.radius)) {
        this.knockbacks.splice(i, 1);
        continue;
      }
      // Never shove anything into the player's bubble.
      const p = this.w.player.position(tmp3);
      const dp = Math.hypot(nx - p.x, nz - p.z);
      if (dp < PLAYER_BUBBLE) {
        const away = tmp2.set(nx - p.x, 0, nz - p.z).normalize();
        nx = p.x + away.x * PLAYER_BUBBLE;
        nz = p.z + away.z * PLAYER_BUBBLE;
      }
      pos.x = nx;
      pos.z = nz;
      pos.y = room.floorY;
    }
  }

  // ---- wipe sweep ----------------------------------------------------------------------------------

  private detectSweeps(hand: HandLike, gremlins: Gremlin[], dt: number): (Gremlin & DiaperTarget) | null {
    if (!hand.squeeze || hand.velocity.y >= -SWEEP_DOWN_SPEED) return null;
    let best: (Gremlin & DiaperTarget) | null = null;
    let bestD = Infinity;
    for (const g of gremlins) {
      if (!g.alive || !isDiaperTarget(g) || !g.changeable) continue;
      bodySphere(g, tmp);
      const d = hand.position.distanceTo(tmp);
      if (d <= SWEEP_RADIUS && d < bestD) {
        best = g;
        bestD = d;
      }
    }
    if (!best) return null;
    const acc = (this.sweeps.get(best.id) ?? 0) + dt;
    this.sweeps.set(best.id, acc);
    best.changeProgress = Math.min(1, acc / SWEEP_SECONDS);
    this.sweepingThisFrame = best;
    hand.pulse(0.3, 40);
    if (acc >= SWEEP_SECONDS) {
      this.sweeps.delete(best.id);
      best.changeProgress = 1;
      best.changeDiaper();
      this.changes++;
      hand.pulse(0.9, 120);
    }
    return best;
  }

  private decaySweeps(dt: number, active: Gremlin | null): void {
    if (this.sweeps.size === 0) return;
    const alive = new Map<number, Gremlin>();
    for (const g of this.w.gremlins()) if (g.alive) alive.set(g.id, g);
    for (const [id, acc] of this.sweeps) {
      if (active && id === active.id) continue;
      const g = alive.get(id);
      const next = acc - dt * SWEEP_DECAY;
      if (!g || next <= 0) {
        this.sweeps.delete(id);
        if (g && isDiaperTarget(g)) g.changeProgress = 0;
        continue;
      }
      this.sweeps.set(id, next);
      if (isDiaperTarget(g)) g.changeProgress = Math.min(1, next / SWEEP_SECONDS);
    }
  }

  // ---- glove ---------------------------------------------------------------------------------------

  private updateGlove(hand: HandLike, dt: number): void {
    this.root.position.copy(hand.position);
    const f = hand.forward(tmp).setY(0);
    if (f.lengthSq() > 1e-6) this.root.rotation.y = Math.atan2(f.x, f.z);
    // Cloth lags behind the motion and flutters a little.
    const yaw = this.root.rotation.y;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const vFwd = hand.velocity.x * fx + hand.velocity.z * fz;
    const vRight = hand.velocity.x * fz - hand.velocity.z * fx;
    const k = Math.min(1, 10 * dt);
    this.tiltX += (clamp(vFwd * 0.25, -0.7, 0.7) - this.tiltX) * k;
    this.tiltZ += (clamp(-vRight * 0.25, -0.7, 0.7) - this.tiltZ) * k;
    this.cloth.rotation.x = this.tiltX + Math.sin(this.t * 5) * 0.05;
    this.cloth.rotation.z = this.tiltZ + Math.sin(this.t * 3.3) * 0.04;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
