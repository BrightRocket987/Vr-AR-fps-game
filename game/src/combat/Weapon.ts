import { BoxGeometry, Color, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Quaternion, Ray, Sphere, Vector3 } from 'three';
import type { EventBus } from '../core/EventBus';
import type { HandState, Input } from '../xr/Input';
import type { Gremlin } from '../ai/Gremlin';
import type { PopFx } from './PopFx';
import type { VoiceLike } from '../ai/Gremlin';
import { TIERS, type TierDef } from './Progression';

export interface HitResult {
  gremlin: Gremlin;
  point: Vector3;
  headshot: boolean;
  distance: number;
}

const tmpRay = new Ray();
const tmpSphere = new Sphere();
const tmpV = new Vector3();
const tmpV2 = new Vector3();
const tmpQ = new Quaternion();

/**
 * The BINKY. Lives in the weapon hand, fires on trigger, reloads with a physical gesture:
 *  - pump: off hand squeezes near the gun and pulls back 8 cm, then releases
 *  - shake: shake the weapon hand up and down three times
 *  - twist: off hand squeezes near the gun and rotates the wrist 70°
 * Accessibility fallback: the weapon hand's A/X button reloads; an empty mag auto-reloads after 4 s.
 */
export class Weapon {
  readonly root = new Group();
  tier: TierDef = TIERS[0];
  ammo: number;
  private cooldown = 0;
  private emptySince = -1;
  private reloading = 0;
  // pump state
  private pumpGrabbed = false;
  private pumpStart = new Vector3();
  private pumpCocked = false;
  // shake state
  private shakeCount = 0;
  private shakeLastSign = 0;
  private shakeWindow = 0;
  // twist state
  private twistStartQ = new Quaternion();
  private twistGrabbed = false;
  private readonly body: Mesh;
  private readonly barrel: Mesh;
  private readonly bodyMat: MeshStandardMaterial;
  private readonly muzzle = new Group();
  private readonly ammoPips: Mesh[] = [];
  hint = '';
  /** 1 = normal. Stink clouds lower it (0.7 = 30 % slower fire). */
  rateMultiplier = 1;
  /** Aim jitter in degrees while a Clinger hangs off the weapon hand. */
  swayDeg = 0;

  constructor(
    private readonly input: Input,
    private readonly bus: EventBus,
    private readonly fx: PopFx,
    private readonly voice: VoiceLike,
    private readonly targets: () => Gremlin[],
  ) {
    this.bodyMat = new MeshStandardMaterial({ color: this.tier.color, roughness: 0.5 });
    this.body = new Mesh(new BoxGeometry(0.05, 0.08, 0.18), this.bodyMat);
    this.body.position.set(0, 0.02, -0.03);
    const grip = new Mesh(new BoxGeometry(0.035, 0.1, 0.05), new MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.8 }));
    grip.position.set(0, -0.06, 0.03);
    grip.rotation.x = 0.25;
    this.barrel = new Mesh(new CylinderGeometry(0.018, 0.022, 0.16, 12), new MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 }));
    this.barrel.rotation.x = Math.PI / 2;
    this.barrel.position.set(0, 0.035, -0.18);
    this.muzzle.position.set(0, 0.035, -0.27);
    this.root.add(this.body, grip, this.barrel, this.muzzle);
    for (let i = 0; i < 6; i++) {
      const pip = new Mesh(new BoxGeometry(0.006, 0.012, 0.006), new MeshStandardMaterial({ color: 0xffee55, emissive: 0xffaa00, emissiveIntensity: 0.6 }));
      pip.position.set(0.03, 0.06, 0.04 - i * 0.014);
      this.root.add(pip);
      this.ammoPips.push(pip);
    }
    this.ammo = this.tier.mag;
    this.root.visible = false;
  }

  setTier(t: TierDef): void {
    this.tier = t;
    this.bodyMat.color.set(t.color);
    this.ammo = t.mag;
    this.reloading = 0;
    this.emptySince = -1;
    const w = t.tier >= 4 ? 0.09 : t.tier >= 2 ? 0.07 : 0.05;
    this.body.scale.set(w / 0.05, 1 + t.tier * 0.05, 1 + t.tier * 0.08);
    this.fx.text(this.muzzle.getWorldPosition(tmpV).add(new Vector3(0, 0.1, 0)), t.name.toUpperCase(), '#3fd6c8');
    this.voice.sfx('tier_up', this.root, 1);
    this.input.weaponHand.pulse(1, 300);
    this.input.offHand.pulse(0.6, 300);
  }

  get hand(): HandState {
    return this.input.weaponHand;
  }

  get isReloading(): boolean {
    return this.reloading > 0;
  }

  update(dt: number, nowMs: number): void {
    const hand = this.input.weaponHand;
    const off = this.input.offHand;
    this.root.visible = hand.connected;
    if (!hand.connected) return;
    // The barrel follows the pointer ray (what the system laser and players expect); the body sits in the hand:
    // at the grip for controllers, just ahead of the pinch point for tracked hands.
    const aimQ = hand.aimQuaternion;
    this.root.quaternion.slerp(aimQ, Math.min(1, 25 * dt));
    if (this.root.quaternion.angleTo(aimQ) > 0.3) this.root.quaternion.copy(aimQ);
    if (hand.isHand) this.root.position.copy(hand.aimPosition).add(tmpV.set(0, -0.03, 0.02).applyQuaternion(this.root.quaternion));
    else this.root.position.copy(hand.position);

    this.cooldown = Math.max(0, this.cooldown - dt);
    for (let i = 0; i < this.ammoPips.length; i++) this.ammoPips[i].visible = i < Math.ceil((this.ammo / this.tier.mag) * this.ammoPips.length);

    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) this.finishReload();
      return;
    }

    // Fire.
    const wantsFire = this.tier.fireMode === 'auto' ? hand.trigger : hand.triggerJustPressed;
    if (wantsFire && this.cooldown <= 0) {
      if (this.ammo > 0) this.fire();
      else {
        this.voice.sfx('ui_click', this.root, 0.5);
        hand.pulse(0.2, 20);
        this.cooldown = 0.25;
        if (this.emptySince < 0) this.emptySince = nowMs;
      }
    }
    if (this.ammo <= 0) {
      if (this.emptySince < 0) this.emptySince = nowMs;
      this.hint = this.tier.reload === 'pump' ? 'Empty! Grab the slide with your other hand and pump it.' : this.tier.reload === 'shake' ? 'Empty! Shake the gun like a juice box.' : 'Empty! Grab the cap with your other hand and twist.';
      if (nowMs - this.emptySince > 4000) this.beginReload(0.6, 'auto');
    } else this.hint = '';

    // Reload gestures (always allowed, even with a partial mag).
    if (hand.buttonAJustPressed && this.ammo < this.tier.mag) this.beginReload(0.5, 'button');
    const nearGun = off.connected && off.position.distanceTo(this.body.getWorldPosition(tmpV2)) < 0.16;
    // Tracked hands have no squeeze or buttons: an off-hand pinch on the blaster reloads any tier.
    if (off.isHand && nearGun && off.triggerJustPressed && this.ammo < this.tier.mag) this.beginReload(0.4, 'pinch');
    switch (this.tier.reload) {
      case 'pump': {
        if (!this.pumpGrabbed && nearGun && off.squeezeJustPressed) {
          this.pumpGrabbed = true;
          this.pumpCocked = false;
          this.pumpStart.copy(off.position);
          off.pulse(0.3, 30);
        }
        if (this.pumpGrabbed) {
          const back = tmpV.copy(off.position).sub(this.pumpStart).dot(this.forward(tmpV2).negate());
          if (!this.pumpCocked && back > 0.08) {
            this.pumpCocked = true;
            off.pulse(0.7, 40);
            this.voice.sfx('ui_click', this.root, 0.8);
          }
          if (!off.squeeze) {
            if (this.pumpCocked) this.beginReload(0.15, 'pump');
            this.pumpGrabbed = false;
          }
        }
        break;
      }
      case 'shake': {
        this.shakeWindow += dt;
        const vy = hand.velocity.y;
        const sign = vy > 1.6 ? 1 : vy < -1.6 ? -1 : 0;
        if (sign !== 0 && sign !== this.shakeLastSign) {
          if (this.shakeWindow > 1.5) this.shakeCount = 0;
          this.shakeWindow = 0;
          this.shakeCount++;
          this.shakeLastSign = sign;
          hand.pulse(0.3 + this.shakeCount * 0.15, 30);
          this.voice.sfx('glug', this.root, 0.6);
          if (this.shakeCount >= 3 && this.ammo < this.tier.mag) {
            this.shakeCount = 0;
            this.beginReload(0.2, 'shake');
          }
        }
        break;
      }
      case 'twist': {
        if (!this.twistGrabbed && nearGun && off.squeezeJustPressed) {
          this.twistGrabbed = true;
          this.twistStartQ.copy(off.quaternion);
          off.pulse(0.3, 30);
        }
        if (this.twistGrabbed) {
          const angle = tmpQ.copy(this.twistStartQ).invert().multiply(off.quaternion).angleTo(new Quaternion());
          if (angle > 1.2 && this.ammo < this.tier.mag) {
            this.twistGrabbed = false;
            this.beginReload(0.3, 'twist');
          }
          if (!off.squeeze) this.twistGrabbed = false;
        }
        break;
      }
    }
  }

  private forward(out: Vector3): Vector3 {
    return out.set(0, 0, -1).applyQuaternion(this.root.quaternion).normalize();
  }

  private beginReload(seconds: number, how: string): void {
    if (this.reloading > 0) return;
    this.reloading = seconds;
    this.hint = '';
    this.bus.emit('log', { text: `reload:${how}` });
  }

  private finishReload(): void {
    this.ammo = this.tier.mag;
    this.emptySince = -1;
    this.voice.sfx('reload', this.root, 0.9);
    this.hand.pulse(0.8, 60);
    this.bus.emit('weapon:reloaded', { tier: this.tier.tier });
  }

  private fire(): void {
    this.ammo--;
    this.cooldown = 1 / (this.tier.rate * Math.max(0.2, this.rateMultiplier));
    const origin = this.muzzle.getWorldPosition(new Vector3());
    const baseDir = this.forward(new Vector3());
    if (this.swayDeg > 0) {
      const a = (Math.random() * this.swayDeg * Math.PI) / 180;
      const r = Math.random() * Math.PI * 2;
      const side = new Vector3().crossVectors(baseDir, new Vector3(0, 1, 0)).normalize();
      const up = new Vector3().crossVectors(side, baseDir).normalize();
      baseDir.addScaledVector(side, Math.sin(a) * Math.cos(r)).addScaledVector(up, Math.sin(a) * Math.sin(r)).normalize();
    }
    const hand = this.input.weaponHand;
    hand.pulse(this.tier.tier >= 4 ? 0.9 : 0.5, this.tier.tier >= 4 ? 120 : 30);
    this.voice.sfx(this.tier.tier >= 3 ? 'thwip_fast' : 'thwip', this.root, 0.8);
    this.bus.emit('weapon:fired', { tier: this.tier.tier });
    for (let p = 0; p < this.tier.pellets; p++) {
      const dir = baseDir.clone();
      if (this.tier.spreadDeg > 0) {
        const a = (Math.random() * this.tier.spreadDeg * Math.PI) / 180;
        const r = Math.random() * Math.PI * 2;
        const side = new Vector3().crossVectors(dir, new Vector3(0, 1, 0)).normalize();
        const up = new Vector3().crossVectors(side, dir).normalize();
        dir.addScaledVector(side, Math.sin(a) * Math.cos(r)).addScaledVector(up, Math.sin(a) * Math.sin(r)).normalize();
      }
      const hit = this.hitTest(origin, dir, 14);
      const end = hit ? hit.point : origin.clone().addScaledVector(dir, 14);
      this.fx.tracer(origin, end);
      if (hit) {
        const popped = hit.gremlin.hit(this.tier.damage, hit.headshot, hit.headshot ? ['BONK'] : []);
        if (!popped) this.fx.text(hit.point, hit.headshot ? 'BONK' : 'POW', hit.headshot ? '#ffffff' : '#ffcc33');
      }
    }
  }

  /** Nearest gremlin whose body sphere the ray hits. */
  hitTest(origin: Vector3, dir: Vector3, maxDist: number): HitResult | null {
    tmpRay.set(origin, dir);
    let best: HitResult | null = null;
    for (const g of this.targets()) {
      if (!g.alive) continue;
      // Body sphere at mid-height, head sphere at 0.8 height.
      const body = tmpSphere.set(tmpV.copy(g.position).add(tmpV2.set(0, g.height * 0.45, 0)), Math.max(g.radius, g.height * 0.3));
      let point = tmpRay.intersectSphere(body, new Vector3());
      let headshot = false;
      const head = new Sphere(g.headPosition(new Vector3()), g.height * 0.2);
      const hp = tmpRay.intersectSphere(head, new Vector3());
      if (hp && (!point || hp.distanceTo(origin) <= point.distanceTo(origin) + 0.02)) {
        point = hp;
        headshot = true;
      }
      if (!point) continue;
      const d = point.distanceTo(origin);
      if (d > maxDist) continue;
      if (!best || d < best.distance) best = { gremlin: g, point, headshot, distance: d };
    }
    return best;
  }
}

export const WEAPON_COLORS = TIERS.map((t) => new Color(t.color));
