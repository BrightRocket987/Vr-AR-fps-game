import { Color, Object3D, Vector3 } from 'three';
import type { AppContext, Chapter, DebugChapter } from '../app/XRApp';
import { SeatManager, type Gremlin, type GremlinWorld } from '../ai/Gremlin';
import { GridNav } from '../room/GridNav';
import { Kit } from './Kit';
import { buildBarScene, type BarSceneParts } from '../bar/BarScene';
import { HumanFactory, type HumanAvatar } from '../bar/Humans';
import { ProjectilePool, StarPool, bookGeometry, chipGeometry, peanutGeometry } from '../bar/BarFx';
import { BarHuman, Brad, Gus, JerseyGuy, Npc, ShootTarget, TruckerHat, makeBook, makeCape, makeRabbit, type BarHooks } from '../bar/Patrons';
import { FIGHT_GROUPS, FightDirector, GOOSE_HITS, TOTAL_PATRONS, clawOutcome, labelForSpeaker, rankFor, speakerLabel, type PatronKind } from '../bar/BarLogic';

type Phase = 'loading' | 'intro' | 'goose' | 'reload' | 'claw' | 'nacho' | 'brad' | 'fight' | 'gus' | 'montage' | 'done';

const TITLE = 'Chapter 1 · The Tipsy Goose';
const tmp = new Vector3();
const tmp2 = new Vector3();

/** Cast → Kenney Mini Character file. Patrons cycle through the rest. */
const CAST = {
  pickle: 'character-female-c.glb',
  bean: 'character-male-b.glb',
  kayden: 'character-male-e.glb',
  marlene: 'character-female-d.glb',
  brad: 'character-male-a.glb',
  lady: 'character-female-f.glb',
  gus: 'character-male-d.glb',
};
const PATRON_FILES = ['character-male-c.glb', 'character-male-f.glb', 'character-female-b.glb', 'character-female-e.glb', 'character-male-e.glb', 'character-female-a.glb'];
const CAP_COLORS = [0xd92a2a, 0x2a5ad9, 0x2a8a3a, 0xe8b04a];
const TEAM_COLORS = [0x2a8a3a, 0xffd13a, 0x2a5ad9, 0xd92a2a];

interface ClawRun {
  attempt: number;
  t: number;
  outcome: 'drop' | 'win';
  dropped: boolean;
}

/**
 * Chapter 1 · The Tipsy Goose (v1, about 7 minutes, the player stays at Booth 7). Beats: settle in and shoot the plastic
 * goose (aim + pump reload) → the claw machine (two drops, then the Dreamgate, which the little one holds and which glows as
 * the fight grows) → the Nacho Avalanche → Brad (forehead only) → fourteen patrons in four groups with the Book Club Lady on
 * your side (Tier 1 lands with the last one on a fresh save) → Gus walks you out ("Watch the door.") → a sound montage on
 * black → the result. Everything comes to the player; the camera never moves.
 */
export class Bar implements Chapter, DebugChapter {
  readonly name = 'bar';
  private ctx!: AppContext;
  private kit!: Kit;
  private humans!: HumanFactory;
  private scene: BarSceneParts | null = null;
  private world!: GremlinWorld;
  private phase: Phase = 'loading';
  private phaseTime = 0;
  private time = 0;
  private enemies: BarHuman[] = [];
  private brad: Brad | null = null;
  private gus: Gus | null = null;
  private goose: ShootTarget | null = null;
  private button: ShootTarget | null = null;
  private npcs: Npc[] = [];
  private pickle: Npc | null = null;
  private bean: Npc | null = null;
  private kayden: Npc | null = null;
  private marlene: Npc | null = null;
  private lady: Npc | null = null;
  private ladyTimer = 4;
  private ladyThrowAt = -1;
  private ladyTarget: BarHuman | null = null;
  private readonly stars = new StarPool(6);
  private readonly peanuts = new ProjectilePool(peanutGeometry(), 0xc89a5a, 20);
  private readonly books = new ProjectilePool(bookGeometry(), 0x2a5aa8, 4, -6);
  private readonly chips = new ProjectilePool(chipGeometry(), 0xffc94a, 60, -6);
  private readonly fight = new FightDirector();
  private readonly unsub: Array<() => void> = [];
  private readonly lastLine = new Map<string, number>();
  private pendingLabel: string | null = null;
  private variant = 0;
  private entranceIdx = 0;
  private gooseHits = 0;
  private gooseSpin = 0;
  private gooseYaw = 0;
  private claw: ClawRun | null = null;
  private clawAttempts = 0;
  private dreamFlight: { t: number; from: Vector3 } | null = null;
  private dreamWon = false;
  private reloaded = false;
  private slowUntil = -1;
  private downAt = -1;
  private bradSince = 0;
  private completed = false;
  private chipTimer = 0;
  readonly stats = { spawned: 0, kos: 0, playerKOs: 0, downs: 0, staggers: 0, peanutsDodged: 0 };

  async start(ctx: AppContext): Promise<void> {
    this.ctx = ctx;
    this.kit = new Kit(ctx, () => this.targets());
    this.kit.damageEnabled = false;
    this.kit.onDown = (src) => this.onDown(src);
    const fam = ctx.save.data.family;
    this.kit.voice.onSubtitle = (text, speaker) => this.kit.hud.subtitle(text, this.pendingLabel ?? labelForSpeaker(speaker, fam));
    this.humans = new HumanFactory(`${import.meta.env.BASE_URL}assets/kenney`);
    ctx.world.add(this.stars.group, this.peanuts.mesh, this.books.mesh, this.chips.mesh);
    this.unsub.push(
      ctx.bus.on('weapon:reloaded', () => {
        this.reloaded = true;
      }),
      ctx.bus.on('weapon:tier', ({ tier }) => {
        this.slowUntil = this.time + 1.5;
        if (tier === 1) this.line('bar_bean_double_binky', this.bean?.root ?? null);
      }),
    );
    const used = new Set<string>([...Object.values(CAST), ...PATRON_FILES]);
    await Promise.all([this.kit.voice.load(), this.humans.load([...used])]);
    ctx.log(`bar: humans=${this.humans.count} lines=${this.kit.voice.lineCount}`);
  }

  // ------------------------------------------------------------------ helpers

  private get family() {
    return this.ctx.save.data.family;
  }

  /** Voice line by id with a per-id cooldown; the subtitle shows the on-screen speaker (Family Sheet names for the kids). */
  line(id: string, at: Object3D | null, cooldown = 0): void {
    const last = this.lastLine.get(id);
    if (last !== undefined && this.time - last < cooldown) return;
    this.lastLine.set(id, this.time);
    this.pendingLabel = speakerLabel(id, this.family);
    this.kit.voice.sayId(id, at);
    this.pendingLabel = null;
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseTime = 0;
    this.ctx.log(`bar phase: ${p}`);
  }

  /** Crossed `t` seconds into the current phase this frame. */
  private at(t: number, dt: number): boolean {
    return this.phaseTime >= t && this.phaseTime - dt < t;
  }

  private targets(): Gremlin[] {
    const out: Gremlin[] = [];
    if (this.phase === 'goose' && this.goose) out.push(this.goose);
    if (this.phase === 'claw' && this.button && !this.claw && !this.dreamWon) out.push(this.button);
    for (const e of this.enemies) if (e.standing && !(e instanceof Brad && e.seated)) out.push(e);
    return out;
  }

  private standingPatrons(): BarHuman[] {
    return this.enemies.filter((e) => e.standing && (e instanceof TruckerHat || e instanceof JerseyGuy));
  }

  private presentPatrons(): number {
    return this.enemies.filter((e) => e.alive && (e instanceof TruckerHat || e instanceof JerseyGuy)).length;
  }

  private readonly hooks: BarHooks = {
    line: (id, at, cooldown) => this.line(id, at, cooldown ?? 0),
    stars: this.stars,
    peanuts: this.peanuts,
    onKO: (h) => this.onKO(h),
    timeScale: () => (this.time < this.slowUntil ? 0.3 : 1),
  };

  private avatar(file: string, height: number, tint: Color | null = null): HumanAvatar {
    return this.humans.create(file, height, tint);
  }

  // ------------------------------------------------------------------ build

  private build(): void {
    const ctx = this.ctx;
    const head = ctx.headPosition(new Vector3());
    const fwd = ctx.headForward(new Vector3()).setY(0);
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    fwd.normalize();
    const yaw = Math.atan2(-fwd.x, -fwd.z);
    const fam = this.family;
    const scene = buildBarScene(ctx.world, new Vector3(head.x, 0, head.z), yaw, { kid1: fam.kid1, kid2: fam.kid2, parent: fam.parent });
    this.scene = scene;
    const nav = new GridNav(0.2);
    nav.rebuild(scene.room);
    this.world = {
      room: scene.room,
      bus: ctx.bus,
      fx: this.kit.fx,
      voice: this.kit.voice,
      world: ctx.world,
      player: this.kit.player,
      seats: new SeatManager(scene.room),
      gremlins: () => this.enemies.filter((e) => e.alive),
      reducedFlash: ctx.save.data.options.reducedFlash,
      weaponHand: () => ctx.input.weaponHand,
      offHand: () => ctx.input.offHand,
      nav,
      openDoors: () => [],
      setDoorOpen: () => undefined,
    };
    const s = scene.spots;
    // The kids at Booth 7 (never targets): the big one with a red cape, the little one hugging Mister Hop.
    this.pickle = this.addNpc(CAST.pickle, 0.95, s.pickle.clone().setY(0.47), s.kidsFacing, 'sit');
    this.pickle.avatar.attachNear('torso', makeCape(0.95), new Vector3(0, 0.12, -0.19));
    this.bean = this.addNpc(CAST.bean, 0.75, s.bean.clone().setY(0.47), s.kidsFacing, 'sit');
    this.bean.avatar.attachNear('torso', makeRabbit(1.5), new Vector3(0.16, 0.3, 0.1));
    this.kayden = this.addNpc(CAST.kayden, 0.95, s.kayden.clone().setY(0.47), s.bradFacing, 'sit');
    this.marlene = this.addNpc(CAST.marlene, 1.7, s.marlene, s.marleneFacing, 'idle');
    // Brad waits at Booth 8.
    const brad = new Brad(this.world, this.avatar(CAST.brad, 1.78), this.hooks);
    brad.spawnAt(s.brad.clone().setY(0.47), s.bradFacing.clone());
    brad.setState('seated');
    this.brad = brad;
    this.enemies.push(brad);
    // Shootable props for the tutorial.
    const gp = scene.goose.getWorldPosition(new Vector3());
    this.goose = new ShootTarget(this.world, 0.95, 0.4);
    this.goose.root.position.copy(gp).add(tmp.set(0, -0.06, 0));
    this.goose.onShot = (_h, p) => this.onGooseShot(p);
    const bp = scene.button.getWorldPosition(new Vector3());
    this.button = new ShootTarget(this.world, 0.5, 0.2);
    this.button.root.position.copy(bp).add(tmp.set(0, -0.22, 0));
    this.button.onShot = () => this.onButtonShot();
  }

  private addNpc(file: string, height: number, pos: Vector3, facing: Vector3, pose: 'sit' | 'idle'): Npc {
    const av = this.avatar(file, height);
    av.play(pose, 0);
    av.update(0.3);
    const n = new Npc(av, this.ctx.world, pos, facing);
    this.npcs.push(n);
    return n;
  }

  // ------------------------------------------------------------------ frame

  update(dt: number, _frame: XRFrame | undefined, nowMs: number): void {
    this.time += dt;
    this.phaseTime += dt;
    if (this.phase === 'loading') {
      const head = this.ctx.headPosition(tmp);
      if (this.phaseTime > 0.25 && (head.y > 0.3 || this.phaseTime > 1.0)) {
        this.build();
        this.setPhase('intro');
      }
      return;
    }
    this.kit.update(dt, nowMs);
    this.kit.status = this.statusText();
    for (const n of this.npcs) n.update(dt);
    const frozen = this.downAt >= 0;
    if (!frozen) for (const e of this.enemies) e.update(dt);
    this.enemies = this.enemies.filter((e) => e.alive || e === this.gus);
    this.stars.update(dt);
    this.updateProps(dt);
    this.updateProjectiles(dt);
    this.updateKids(dt);
    switch (this.phase) {
      case 'intro':
        this.updateIntro(dt);
        break;
      case 'goose':
        this.updateGoose(dt);
        break;
      case 'reload':
        this.updateReload(dt);
        break;
      case 'claw':
        this.updateClaw(dt);
        break;
      case 'nacho':
        this.updateNacho(dt);
        break;
      case 'brad':
        this.updateBrad(dt);
        break;
      case 'fight':
        this.updateFight(dt);
        break;
      case 'gus':
        this.updateGus(dt);
        break;
      case 'montage':
        this.updateMontage(dt);
        break;
      case 'done':
        break;
    }
  }

  private statusText(): string {
    switch (this.phase) {
      case 'goose':
        return `Goose ${this.gooseHits}/${GOOSE_HITS}`;
      case 'claw':
        return `Claw try ${this.clawAttempts}`;
      case 'brad':
        return 'Brad (forehead!)';
      case 'fight':
        return `Patrons ${this.patronKOs}/${TOTAL_PATRONS}`;
      case 'gus':
        return `Gus: ${this.gus?.counter.staggers ?? 0} staggers`;
      default:
        return 'Booth 7';
    }
  }

  // ------------------------------------------------------------------ beats

  private updateIntro(dt: number): void {
    const fam = this.family;
    if (this.at(0.4, dt)) this.kit.hud.say(TITLE, `Family night. Booth 7. ${fam.kid1} and ${fam.kid2} are with you.`, 4.5);
    if (this.at(1.0, dt)) this.line('bar_parent_go_to_bed', null);
    if (this.at(2.6, dt)) this.line('bar_marlene_hi', this.marlene?.root ?? null);
    if (this.at(5.2, dt)) this.line('bar_pickle_drawing', this.pickle?.root ?? null);
    if (this.phaseTime > 8) this.beginGoose();
  }

  private beginGoose(): void {
    this.setPhase('goose');
    this.line('bar_pickle_shoot_goose', this.pickle?.root ?? null);
    this.kit.hud.say('Shoot the goose!', 'Point your blaster at the plastic goose over the bar and pull the trigger. Five hits.', 6);
  }

  private onGooseShot(p: Vector3): void {
    if (this.phase !== 'goose') return;
    this.gooseHits++;
    this.gooseSpin += Math.PI * 0.6;
    this.kit.fx.text(p, 'HONK', '#ffffff');
    this.kit.voice.sfx('squeak_inflate', this.scene?.goose ?? null, 1);
    if (this.gooseHits >= GOOSE_HITS) this.finishGoose();
  }

  private finishGoose(): void {
    if (this.scene) {
      const p = this.scene.goose.getWorldPosition(new Vector3());
      this.kit.fx.pop(p, new Color(0xffe14d), 40);
      this.kit.fx.text(p, 'NICE', '#3fd6c8');
    }
    // two full victory spins that end facing the player again
    const TAU = Math.PI * 2;
    this.gooseSpin = (Math.ceil((this.gooseYaw + this.gooseSpin) / TAU) + 2) * TAU - this.gooseYaw;
    this.kit.voice.sfx('confetti', null, 0.8);
    this.line('bar_bean_again', this.bean?.root ?? null);
    this.setPhase('reload');
  }

  private updateGoose(dt: number): void {
    if (this.at(16, dt) && this.gooseHits < GOOSE_HITS) {
      this.line('bar_marlene_higher', this.marlene?.root ?? null);
      this.kit.hud.say('Little higher', 'The goose is on the pole above the taps, past the bar.', 5);
    }
    if (this.phaseTime > 40) {
      this.gooseHits = GOOSE_HITS;
      this.finishGoose();
    }
  }

  private updateReload(dt: number): void {
    const w = this.kit.weapon;
    if (this.at(0.6, dt)) {
      if (w.ammo >= w.tier.mag && !w.isReloading) {
        this.beginClaw();
        return;
      }
      this.reloaded = false;
      this.kit.hud.say('Reload', 'Grab the slide with your other hand (grip) and pump it back. Or press A.', 7);
      this.line('bar_marlene_pump', this.marlene?.root ?? null);
    }
    if (this.phaseTime > 0.6 && (this.reloaded || this.phaseTime > 14)) this.beginClaw();
  }

  private beginClaw(): void {
    this.setPhase('claw');
    this.line('bar_pickle_moon', this.pickle?.root ?? null);
    this.kit.hud.say('The claw machine', `${this.family.kid1} wants the moon one. Shoot the big red button.`, 6);
  }

  private onButtonShot(): void {
    if (this.phase !== 'claw' || this.claw || this.dreamWon) return;
    this.clawAttempts++;
    this.claw = { attempt: this.clawAttempts, t: 0, outcome: clawOutcome(this.clawAttempts), dropped: false };
    this.kit.voice.sfx('ui_click', this.scene?.button ?? null, 1);
    if (this.scene) this.scene.button.material.color.set(0xffffff);
  }

  private updateClaw(dt: number): void {
    if (this.at(16, dt) && this.clawAttempts === 0) {
      this.line('bar_marlene_laser', this.marlene?.root ?? null);
      this.kit.hud.say('Point and shoot', 'The big red button on the claw machine, to your right.', 5);
    }
    if (!this.claw && !this.dreamWon && this.phaseTime > 34 && this.phaseTime - this.lastClawEnd > 3) this.onButtonShot();
    if (this.dreamWon && this.dreamFlight === null && this.phaseTime - this.wonAt > 5.5) this.beginNacho();
  }

  private lastClawEnd = 0;
  private wonAt = 0;

  /** Claw choreography in the cabinet's frame: over the prize, down, grab, up, (drop | to the chute). */
  private updateClawRun(dt: number): void {
    const run = this.claw;
    const sc = this.scene;
    if (!run || !sc) return;
    run.t += dt;
    const t = run.t;
    const claw = sc.claw.position;
    const prize = sc.dreamgate;
    const home = tmp.set(0, 1.7, 0);
    const over = tmp2.set(0.1, 1.7, 0.05);
    const lerp = (a: Vector3, b: Vector3, k: number) => claw.copy(a).lerp(b, Math.min(1, Math.max(0, k)));
    if (t < 0.6) lerp(home, over, t / 0.6);
    else if (t < 1.3) lerp(over, new Vector3(0.1, 1.22, 0.05), (t - 0.6) / 0.7);
    else if (t < 1.6) {
      /* grab */
    } else if (t < 2.3) {
      lerp(new Vector3(0.1, 1.22, 0.05), over, (t - 1.6) / 0.7);
      const fall = run.outcome === 'drop' && t > 1.95;
      if (!fall) prize.position.set(claw.x, claw.y - 0.17, claw.z);
      else if (!run.dropped) {
        run.dropped = true;
        this.line('bar_pickle_aww', this.pickle?.root ?? null, 3);
        this.kit.voice.sfx('diaper_plap', prize, 0.8);
      }
    } else if (run.outcome === 'drop') {
      if (prize.position.y > 1.05) prize.position.y = Math.max(1.05, prize.position.y - dt * 3);
      lerp(over, home, (t - 2.3) / 0.6);
      if (t > 3.0) this.endClawRun();
    } else {
      const chuteTop = new Vector3(0.3, 1.7, 0.3);
      if (t < 2.9) {
        lerp(over, chuteTop, (t - 2.3) / 0.6);
        prize.position.set(claw.x, claw.y - 0.17, claw.z);
      } else if (t < 3.3) {
        prize.position.lerp(new Vector3(0.3, 0.8, 0.42), Math.min(1, dt * 8));
        if (this.at3(t, dt, 2.9)) {
          this.kit.voice.sfx('portal_hum', prize, 0.9);
          this.line('bar_bean_moon', this.bean?.root ?? null);
        }
      } else {
        lerp(chuteTop, home, (t - 3.3) / 0.6);
        if (t > 3.3 && !this.dreamWon) this.winDreamgate();
        if (t > 4.0) this.endClawRun();
      }
    }
    // light chase on the button while the claw runs
    sc.button.material.color.setHSL((t * 2) % 1, 0.9, 0.55);
  }

  private at3(t: number, dt: number, mark: number): boolean {
    return t >= mark && t - dt < mark;
  }

  private endClawRun(): void {
    this.claw = null;
    this.lastClawEnd = this.phaseTime;
    if (this.scene) this.scene.button.material.color.set(this.dreamWon ? 0x552222 : 0xff2a3a);
  }

  private winDreamgate(): void {
    const sc = this.scene;
    if (!sc) return;
    this.dreamWon = true;
    this.wonAt = this.phaseTime;
    const from = sc.dreamgate.getWorldPosition(new Vector3());
    this.ctx.world.attach(sc.dreamgate);
    this.dreamFlight = { t: 0, from };
    this.kit.hud.say('The Dreamgate', '"Makes bedtime disappear!" says the box. Nobody reads the box.', 4);
    this.kit.fx.pop(from, new Color(0x3fd6c8), 30);
  }

  private updateDreamFlight(dt: number): void {
    const f = this.dreamFlight;
    const sc = this.scene;
    if (!f || !sc || !this.bean) return;
    f.t += dt;
    const k = Math.min(1, f.t / 1.4);
    const target = this.bean.root.localToWorld(new Vector3(0.0, 0.42, 0.2));
    const p = f.from.clone().lerp(target, k);
    p.y += Math.sin(k * Math.PI) * 0.6;
    sc.dreamgate.position.copy(p);
    if (k >= 1) {
      this.dreamFlight = null;
      this.bean.root.attach(sc.dreamgate);
      sc.dreamgate.position.set(0, 0.42, 0.2);
      this.line('bar_kayden_mine', this.kayden?.root ?? null);
    }
  }

  private beginNacho(): void {
    this.setPhase('nacho');
    this.line('bar_marlene_kids_eat_free', this.marlene?.root ?? null);
  }

  private updateNacho(dt: number): void {
    const sc = this.scene;
    if (!sc || !this.kayden || !this.pickle) return;
    if (this.at(2.6, dt)) {
      // Kayden throws exactly one chip, at the big kid.
      const from = this.kayden.root.position.clone().add(tmp.set(0, 0.8, 0));
      this.chips.launch(from, this.pickle.root.position.clone().add(tmp2.set(0, 0.7, 0)), 0.9);
      this.line('bar_kayden_nachos', this.kayden.root);
    }
    if (this.at(4.2, dt)) {
      const from = this.pickle.root.position.clone().add(tmp.set(0, 0.7, 0));
      this.chips.launch(from, this.kayden.root.position.clone().add(tmp2.set(0, 0.8, 0)), 0.9);
      this.line('bar_pickle_sharing', this.pickle.root);
    }
    if (this.at(5.6, dt)) {
      this.kit.hud.say('NACHO AVALANCHE', 'The whole bar is throwing food. Brad is standing up.', 4);
      this.line('bar_trucker_who_threw', null);
    }
    if (this.phaseTime > 5.6 && this.phaseTime < 13) {
      this.chipTimer -= dt;
      if (this.chipTimer <= 0) {
        this.chipTimer = 0.18;
        this.throwChip();
      }
    }
    if (this.at(7.5, dt)) this.line('bar_bean_cheese', this.bean?.root ?? null);
    if (this.at(9, dt)) this.standBrad();
    if (this.phaseTime > 11) this.beginBrad();
  }

  /** One chip on an arc across the room (never at the head). */
  private throwChip(): void {
    const sc = this.scene;
    if (!sc) return;
    const sources = [sc.spots.boothTable, ...sc.spots.throwSpots, sc.spots.brad];
    const a = sources[Math.floor(Math.random() * sources.length)].clone();
    a.y = 0.9 + Math.random() * 0.4;
    const b = sources[Math.floor(Math.random() * sources.length)].clone();
    b.y = 0.2 + Math.random() * 0.8;
    if (a.distanceTo(b) < 1) b.add(tmp.set(1.5, 0, -1.5));
    this.chips.launch(a, b, 0.7 + Math.random() * 0.6);
  }

  private bradDownAt = -1;

  private beginBrad(): void {
    this.setPhase('brad');
    this.bradDownAt = -1;
    this.bradSince = 0;
    this.kit.damageEnabled = true;
    this.kit.hud.say('Brad', 'Body darts bounce off his quarter-zip. Forehead only.', 5);
    this.standBrad();
  }

  /** Brad steps out of Booth 8 into the aisle and stands up (counts as a spawn once). */
  private standBrad(): void {
    const brad = this.brad;
    if (!brad || !brad.seated || !this.scene) return;
    brad.position.copy(this.scene.spots.bradAisle);
    brad.stand();
    this.stats.spawned++;
  }

  private updateBrad(dt: number): void {
    this.bradSince += dt;
    const brad = this.brad;
    if (this.at(25, dt) && brad?.standing) this.kit.hud.say('Aim higher', 'The forehead. Right between the eyebrows.', 4);
    if (brad && this.bradSince > 45 && !brad.softHitbox) {
      brad.softHitbox = true;
      this.line('bar_marlene_higher', this.marlene?.root ?? null);
    }
    if (!brad || !brad.standing) {
      if (this.bradDownAt < 0) this.bradDownAt = this.phaseTime;
      if (this.phaseTime - this.bradDownAt > 2.6 || !brad) this.beginFight();
    }
  }

  private beginFight(): void {
    this.setPhase('fight');
    this.fight.startGroup(0);
    this.kit.hud.say('Here they come', 'Patrons from the kitchen and the front door. Trucker Hats throw peanuts: lean!', 5);
  }

  private updateFight(dt: number): void {
    const kind = this.fight.update(dt, this.presentPatrons(), this.standingPatrons().length);
    if (kind) this.spawnPatron(kind);
    if (this.fight.group === 1 && !this.lady) this.ladyJoins();
    if (this.fight.group >= 2 && !this.lastLine.has('bar_marlene_darts')) this.line('bar_marlene_darts', this.marlene?.root ?? null);
    this.updateLady(dt);
    if (this.kit.patience < 35) this.line('bar_lady_duck', this.lady?.root ?? null, 30);
    if (this.fight.done && this.presentPatrons() === 0) this.beginGus();
  }

  private spawnPatron(kind: PatronKind): void {
    const sc = this.scene;
    if (!sc) return;
    const file = PATRON_FILES[this.variant % PATRON_FILES.length];
    const height = 1.7 + (this.variant % 3) * 0.05;
    const av = this.avatar(file, height);
    const p: BarHuman =
      kind === 'trucker'
        ? new TruckerHat(this.world, av, this.hooks, sc.spots.throwSpots, CAP_COLORS[this.variant % CAP_COLORS.length])
        : new JerseyGuy(this.world, av, this.hooks, TEAM_COLORS[this.variant % TEAM_COLORS.length]);
    this.variant++;
    const e = sc.spots.entrances[this.entranceIdx++ % sc.spots.entrances.length];
    p.spawnAt(e.position.clone(), e.facing.clone());
    this.enemies.push(p);
    this.stats.spawned++;
  }

  private ladyJoins(): void {
    const sc = this.scene;
    if (!sc) return;
    this.lady = this.addNpc(CAST.lady, 1.7, sc.spots.lady, new Vector3(1, 0, 0), 'idle');
    this.lady.avatar.attachNear('arm-left', makeBook(1.7), new Vector3(0.05, -0.05, 0.08));
    this.line('bar_lady_book', this.lady.root);
  }

  /** The Book Club Lady (ally): every few seconds reads the title aloud (1.2 s) and throws a hardback at a patron. */
  private updateLady(dt: number): void {
    const lady = this.lady;
    if (!lady) return;
    const patrons = this.standingPatrons();
    if (this.ladyThrowAt < 0) {
      this.ladyTimer -= dt;
      if (this.ladyTimer <= 0 && patrons.length) {
        const target = patrons.sort((a, b) => a.position.distanceToSquared(lady.root.position) - b.position.distanceToSquared(lady.root.position))[0];
        this.ladyTarget = target;
        this.ladyThrowAt = 1.2;
        lady.avatar.playClip('interact-right', 0.1, true);
        this.line('bar_lady_boundaries', lady.root, 8);
      }
    } else {
      const target = this.ladyTarget;
      if (target) lady.faceToward(target.position, dt);
      this.ladyThrowAt -= dt;
      if (this.ladyThrowAt <= 0) {
        this.ladyThrowAt = -1;
        this.ladyTimer = 5 + Math.random() * 2;
        lady.avatar.play('attack', 0.05, true);
        if (target && target.standing) {
          const from = lady.root.position.clone().add(tmp.set(0, 1.0, 0));
          const to = target.headPosition(new Vector3());
          this.books.launch(from, to, 0.8, () => {
            if (target.standing) target.bookHit();
          });
        }
        this.ladyTarget = null;
      }
    }
  }

  private beginGus(): void {
    const sc = this.scene;
    if (!sc) return;
    this.setPhase('gus');
    this.kit.damageEnabled = false;
    this.peanuts.clear();
    const gus = new Gus(this.world, this.avatar(CAST.gus, 2.1), this.hooks, sc.spots.gusPath.slice(1));
    gus.spawnAt(sc.spots.gusPath[0].clone(), sc.spots.entrances[1].facing.clone());
    gus.setState('enter');
    gus.onArrive = () => this.beginMontage();
    this.gus = gus;
    this.enemies.push(gus);
    this.stats.spawned++;
    this.kit.voice.sfx('door_kick', gus.root, 1);
    this.line('bar_gus_entrance', gus.root);
    this.kit.hud.say('Gus', 'The bouncer. He cannot be beaten. Make it count: every 10 darts staggers him, head hits triple.', 6);
  }

  private updateGus(dt: number): void {
    const gus = this.gus;
    if (!gus) return;
    this.stats.staggers = gus.counter.staggers;
    if (this.at(10, dt)) this.line('bar_marlene_gus_kids', this.marlene?.root ?? null);
    if (this.at(13, dt)) this.line('bar_gus_college', gus.root);
    // the neon flickers while he walks
    if (this.scene) this.scene.lights[1].intensity = 4 * (Math.sin(this.time * 23) > -0.6 ? 1 : 0.2);
  }

  private beginMontage(): void {
    if (this.phase === 'montage' || this.phase === 'done') return;
    this.setPhase('montage');
    this.stats.staggers = this.gus?.counter.staggers ?? this.stats.staggers;
    this.line('bar_gus_watch_door', this.gus?.root ?? null);
  }

  private updateMontage(dt: number): void {
    if (this.at(1.4, dt)) {
      this.kit.weaponEnabled = false;
      void this.ctx.fade(1, 0.4);
    }
    if (this.at(1.9, dt)) this.kit.voice.sfx('door_kick', null, 1);
    if (this.at(2.4, dt)) this.line('bar_pickle_laugh', null);
    if (this.at(3.6, dt)) this.line('bar_bean_again', null, 0);
    if (this.at(4.6, dt)) this.line('bar_gus_plate', null);
    if (this.at(6.8, dt)) this.line('bar_pickle_best_night', null);
    if (this.at(8.4, dt)) this.line('bar_marlene_tab', null);
    if (this.phaseTime > 9.6) this.finish([]);
  }

  // ------------------------------------------------------------------ systems

  private updateProps(dt: number): void {
    const sc = this.scene;
    if (!sc) return;
    // goose spin (eases out)
    if (this.gooseSpin > 0) {
      const step = Math.min(this.gooseSpin, Math.max(1.5, this.gooseSpin * 4) * dt);
      this.gooseSpin -= step;
      this.gooseYaw += step;
      sc.goose.rotation.y = this.gooseYaw;
    }
    if (this.claw) this.updateClawRun(dt);
    this.updateDreamFlight(dt);
    // the Dreamgate glows brighter as the fight escalates
    const escalation = this.phase === 'fight' ? 0.3 + 0.18 * Math.max(0, this.fight.group) : this.phase === 'gus' || this.phase === 'montage' ? 1.2 : this.phase === 'brad' ? 0.3 : 0;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * (3 + escalation * 4));
    sc.dreamGlow.material.opacity = Math.min(1, 0.35 + escalation * 0.35 + pulse * 0.15);
    sc.dreamGlow.scale.setScalar(0.3 + escalation * 0.35 + pulse * 0.05);
  }

  private updateProjectiles(dt: number): void {
    this.peanuts.update(dt);
    this.books.update(dt);
    this.chips.update(dt);
    const head = this.ctx.headPosition(tmp);
    this.peanuts.forEachActive((pos, kill) => {
      if (pos.distanceTo(head) < 0.27) {
        kill();
        this.kit.damage(2, 'peanut');
        this.kit.fx.text(pos, 'PLINK', '#c89a5a');
      }
    });
  }

  /** The big kid stands on the bench and cheers during the fight; the little one bounces with the Dreamgate. */
  private updateKids(dt: number): void {
    const head = this.ctx.headPosition(tmp2);
    for (const k of [this.pickle, this.bean, this.kayden]) k?.faceToward(head, dt, 1.5);
    if (this.pickle) this.pickle.bob = this.phase === 'fight' || this.phase === 'brad' ? 0.06 : 0;
    if (this.bean) this.bean.bob = this.dreamWon && (this.phase === 'fight' || this.phase === 'gus') ? 0.03 : 0;
  }

  private patronKOs = 0;

  private onKO(h: BarHuman): void {
    this.stats.kos++;
    if (h instanceof TruckerHat || h instanceof JerseyGuy) this.patronKOs++;
    if (h.koByPlayer) this.stats.playerKOs++;
    else this.line('bar_lady_hardback', this.lady?.root ?? null, 12);
    if (h instanceof Brad) {
      this.line('bar_pickle_friend', this.pickle?.root ?? null);
      this.line('bar_kayden_dad', this.kayden?.root ?? null);
    } else if (this.bean && h.position.distanceTo(this.bean.root.position) < 3) this.line('bar_bean_uh_oh', this.bean.root, 8);
    if (this.fight.group >= 1 && this.stats.kos === 6) this.line('bar_bean_hop', this.bean?.root ?? null);
  }

  /** Patience hit 0: "You lost it." Fade, clear the current fight beat, restore Patience, restart the beat (pops kept). */
  private onDown(source: string): void {
    if (this.downAt >= 0 || this.phase === 'montage' || this.phase === 'done') return;
    this.downAt = this.time;
    this.stats.downs++;
    this.kit.damageEnabled = false;
    this.kit.hud.say('You lost it.', `${source} got you. Deep breath. Count to three.`, 3);
    this.line('bar_parent_need_minute', null);
    this.peanuts.clear();
    void this.ctx.fade(1, 0.5).then(() => {
      if (this.completed) return;
      if (this.phase === 'brad' && this.brad) {
        this.brad.dispose();
        this.enemies = this.enemies.filter((e) => e !== this.brad);
        this.respawnBrad();
      } else if (this.phase === 'fight') {
        for (const e of this.enemies) if (e instanceof TruckerHat || e instanceof JerseyGuy) e.dispose();
        this.enemies = this.enemies.filter((e) => e.alive);
        this.fight.startGroup(Math.max(0, this.fight.group));
      }
      this.kit.resetPatience();
      this.downAt = -1;
      this.kit.damageEnabled = this.phase === 'brad' || this.phase === 'fight';
      this.kit.hud.say('Again!', 'Same fight, fresh Patience. Your pops are kept.', 3);
      void this.ctx.fade(0, 0.6);
    });
  }

  private respawnBrad(): void {
    const sc = this.scene;
    if (!sc) return;
    const brad = new Brad(this.world, this.avatar(CAST.brad, 1.78), this.hooks);
    brad.spawnAt(sc.spots.bradAisle.clone(), sc.spots.bradFacing.clone());
    brad.setState('stand');
    this.brad = brad;
    this.enemies.push(brad);
  }

  // ------------------------------------------------------------------ end

  private finish(extra: string[]): void {
    if (this.completed) return;
    this.completed = true;
    this.setPhase('done');
    const staggers = this.gus?.counter.staggers ?? this.stats.staggers;
    const rank = rankFor(this.stats.playerKOs, staggers, this.stats.downs);
    this.ctx.complete({
      title: TITLE,
      pops: this.kit.progression.sessionPops,
      rank,
      lines: [`Gus staggered ${staggers} time${staggers === 1 ? '' : 's'}`, 'Kicked out. Plate still in hand.', ...extra],
    });
  }

  // ------------------------------------------------------------------ debug hooks

  snapshot(): Record<string, unknown> {
    const standing = this.enemies.filter((e) => e.standing && !(e instanceof Brad && e.seated));
    return {
      phase: this.phase,
      enemiesSpawned: this.stats.spawned,
      enemiesPopped: this.stats.kos,
      playerKOs: this.stats.playerKOs,
      alive: standing.length,
      fightGroup: this.fight.group,
      patronsLeft: TOTAL_PATRONS - this.fight.spawned + this.presentPatrons(),
      groups: FIGHT_GROUPS.length,
      gooseHits: this.gooseHits,
      clawAttempts: this.clawAttempts,
      dreamgate: this.dreamWon,
      gusStaggers: this.gus?.counter.staggers ?? 0,
      downs: this.stats.downs,
      pops: this.kit?.progression.pops ?? 0,
      sessionPops: this.kit?.progression.sessionPops ?? 0,
      tier: this.kit?.progression.tier.name ?? '',
      patience: Math.round(this.kit?.patience ?? 0),
      humans: this.humans?.count ?? 0,
      lines: this.kit?.voice.lineCount ?? 0,
      skinned: this.npcs.length + this.enemies.filter((e) => e.alive).length,
      anyNaN: [...this.enemies.map((e) => e.position), ...this.npcs.map((n) => n.root.position)].some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)),
    };
  }

  /** Skip the tutorial beats straight to the fight (Brad stands up; shootable at once). */
  debugBegin(): void {
    if (this.phase === 'loading') {
      this.build();
      this.setPhase('intro');
    }
    if (['intro', 'goose', 'reload', 'claw', 'nacho'].includes(this.phase)) {
      this.claw = null;
      this.dreamFlight = null;
      if (!this.dreamWon && this.scene && this.bean) {
        this.dreamWon = true;
        this.bean.root.attach(this.scene.dreamgate);
        this.scene.dreamgate.position.set(0, 0.42, 0.2);
      }
      this.beginBrad();
    }
  }

  debugShootNearest(): boolean {
    const p = this.ctx.headPosition(new Vector3());
    const list = this.enemies.filter((e) => e.standing && !(e instanceof Brad && e.seated) && !(e instanceof Gus && e.arrived));
    const g = list.sort((a, b) => a.position.distanceToSquared(p) - b.position.distanceToSquared(p))[0];
    if (!g) return false;
    g.hit(99, false);
    return true;
  }

  debugFinish(): void {
    this.finish(['(skipped)']);
  }

  dispose(): void {
    for (const u of this.unsub) u();
    this.unsub.length = 0;
    for (const e of this.enemies) if (e.alive) e.dispose();
    this.enemies = [];
    this.goose?.dispose();
    this.button?.dispose();
    for (const n of this.npcs) n.dispose();
    this.npcs = [];
    this.scene?.dreamgate.removeFromParent();
    this.scene?.dispose();
    this.scene = null;
    this.ctx?.world.remove(this.stars.group, this.peanuts.mesh, this.books.mesh, this.chips.mesh);
    this.peanuts.dispose();
    this.books.dispose();
    this.chips.dispose();
    this.stars.dispose();
    this.kit?.dispose();
  }
}
