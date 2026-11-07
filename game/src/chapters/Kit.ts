import { Vector3 } from 'three';
import type { AppContext } from '../app/XRApp';
import { AvatarFactory } from '../ai/Avatar';
import { SeatManager, type Gremlin, type GremlinWorld, type PlayerLike } from '../ai/Gremlin';
import { PopFx } from '../combat/PopFx';
import { Progression } from '../combat/Progression';
import { Weapon } from '../combat/Weapon';
import { Voice } from '../dialogue/Voice';
import type { Door, RoomModel } from '../room/RoomModel';
import { GridNav } from '../room/GridNav';
import { Hud } from '../ui/Hud';

export interface KitWorldOptions {
  /** Doors whose portals are open (spawn points). Default: none. */
  openDoors?: () => Door[];
  setDoorOpen?: (doorId: string, open: boolean) => void;
  /** Build an A* grid over the room (default true). */
  nav?: boolean;
}

/**
 * Everything a chapter needs to be a shooter, in one object: the BINKY weapon (with lifetime-pop tiers),
 * pooled pop VFX, the wrist HUD + hint card, generated voices/SFX, Kenney avatars, and the player's
 * Patience (HP). Chapter 3 (House.ts) predates this and wires the same parts by hand; new chapters use Kit.
 *
 * Usage in a chapter:
 *   start(ctx)  { this.kit = new Kit(ctx, () => this.enemies); await this.kit.load(); const w = this.kit.makeWorld(room, () => this.enemies); ... }
 *   update(dt)  { this.kit.update(dt, nowMs); ...enemies.update(dt)... }
 *   dispose()   { this.kit.dispose(); }
 */
export class Kit {
  readonly fx: PopFx;
  readonly voice: Voice;
  readonly hud: Hud;
  readonly progression: Progression;
  readonly avatars: AvatarFactory;
  readonly weapon: Weapon;
  readonly player: PlayerLike;
  /** Player HP. Regenerates 4/s after 5 s without damage. */
  patience = 100;
  /** False disables damage (tutorial windows, cutscenes). */
  damageEnabled = true;
  /** False hides and freezes the weapon (cutscenes, driving with both hands). */
  weaponEnabled = true;
  /** Called once when patience reaches 0 (the chapter decides what happens). */
  onDown: ((source: string) => void) | null = null;
  /** Extra text shown on the wrist panel's wave line. */
  status = '';
  private sinceDamage = 10;
  private readonly unsub: Array<() => void> = [];
  private readonly baseUrl: string;
  private variantCounter = 0;
  private readonly tmpHead = new Vector3();
  private readonly tmpFwd = new Vector3();

  constructor(private readonly ctx: AppContext, targets: () => Gremlin[]) {
    this.baseUrl = `${import.meta.env.BASE_URL}assets`;
    this.fx = new PopFx(ctx.save.data.options.reducedFlash);
    this.voice = new Voice(ctx.listener, ctx.bus, this.baseUrl);
    this.hud = new Hud(ctx.input, (o) => ctx.headPosition(o), (o) => ctx.headForward(o));
    this.voice.onSubtitle = (t, s) => this.hud.subtitle(t, s);
    this.hud.subtitlesEnabled = ctx.save.data.options.subtitles;
    this.progression = new Progression(ctx.save, ctx.bus);
    this.avatars = new AvatarFactory(`${this.baseUrl}/kenney`);
    this.weapon = new Weapon(ctx.input, ctx.bus, this.fx, this.voice, targets);
    this.weapon.setTier(this.progression.tier);
    this.weapon.ammo = this.progression.tier.mag;
    ctx.world.add(this.fx.group, this.hud.group, this.weapon.root);
    this.player = {
      position: (out = this.tmpHead) => ctx.headPosition(out),
      forward: (out = this.tmpFwd) => ctx.headForward(out),
      damage: (amount, source) => this.damage(amount, source),
    };
    this.progression.onTierChange = (t) => {
      this.weapon.setTier(t);
      this.hud.say(`TIER UP: ${t.name}`, 'The Dreamgate hums. Your blaster grows.', 4);
    };
    this.unsub.push(
      ctx.bus.on('enemy:popped', () => this.progression.addPop()),
      ctx.bus.on('hint', ({ text, sub, seconds }) => this.hud.say(text, sub, seconds)),
    );
  }

  /** Load voices and character models (failures degrade to subtitles / procedural goblins). */
  async load(maxCharacters = 12): Promise<void> {
    await Promise.all([this.voice.load(), this.avatars.load(maxCharacters)]);
  }

  /** A new variant index for AvatarFactory.create, cycling through characters and palettes. */
  nextVariant(): number {
    return this.variantCounter++;
  }

  /** The GremlinWorld every enemy needs. Builds an A* grid over `room` unless opts.nav === false. */
  makeWorld(room: RoomModel, gremlins: () => Gremlin[], opts: KitWorldOptions = {}): GremlinWorld {
    let nav: GridNav | null = null;
    if (opts.nav !== false) {
      nav = new GridNav(0.1);
      nav.rebuild(room);
    }
    return {
      room,
      bus: this.ctx.bus,
      fx: this.fx,
      voice: this.voice,
      world: this.ctx.world,
      player: this.player,
      seats: new SeatManager(room),
      gremlins,
      reducedFlash: this.ctx.save.data.options.reducedFlash,
      weaponHand: () => this.ctx.input.weaponHand,
      offHand: () => this.ctx.input.offHand,
      nav,
      openDoors: opts.openDoors ?? (() => []),
      setDoorOpen: opts.setDoorOpen ?? (() => undefined),
    };
  }

  /** `flash = false` for small continuous damage (rumble strips, bites) that should not flash the whole view. */
  damage(amount: number, source: string, flash = true): void {
    if (!this.damageEnabled || this.patience <= 0) return;
    this.patience = Math.max(0, this.patience - amount);
    this.sinceDamage = 0;
    if (flash) this.hud.damageFlash();
    this.ctx.input.weaponHand.pulse(flash ? 0.6 : 0.25, flash ? 80 : 30);
    this.ctx.bus.emit('player:damaged', { amount, patience: this.patience });
    if (this.patience <= 0) {
      this.ctx.bus.emit('player:down', {});
      if (this.onDown) this.onDown(source);
      else {
        // Default "you lost it": a short breather, then Patience refills (chapters can override via onDown).
        this.hud.say('You lost it.', 'Deep breath. Count to three.', 3);
        this.downTimer = 3;
      }
    }
  }

  private downTimer = -1;

  /** Per-frame: weapon, VFX, HUD, patience regeneration. */
  update(dt: number, nowMs: number): void {
    if (this.downTimer > 0) {
      this.downTimer -= dt;
      if (this.downTimer <= 0) this.resetPatience();
    }
    this.sinceDamage += dt;
    if (this.sinceDamage > 5 && this.patience > 0 && this.patience < 100) this.patience = Math.min(100, this.patience + 4 * dt);
    if (this.weaponEnabled) this.weapon.update(dt, nowMs);
    else this.weapon.root.visible = false;
    this.fx.update(dt);
    this.hud.state = {
      pops: this.progression.pops,
      tierName: this.progression.tier.name,
      toNext: this.progression.toNext(),
      patience: this.patience,
      wave: this.status || '—',
      ammo: this.weapon.ammo,
      mag: this.weapon.tier.mag,
      fps: 0,
      hint: this.weaponEnabled ? this.weapon.hint : '',
    };
    this.hud.update(dt);
  }

  /** Restore patience (after a "you lost it" restart). */
  resetPatience(): void {
    this.patience = 100;
    this.sinceDamage = 10;
  }

  dispose(): void {
    for (const u of this.unsub) u();
    this.unsub.length = 0;
    this.ctx.world.remove(this.fx.group, this.hud.group, this.weapon.root);
  }
}
