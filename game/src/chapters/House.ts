import { Color, DoubleSide, FrontSide, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, RingGeometry, SphereGeometry, Vector3 } from 'three';
import type { AppContext, Chapter, DebugChapter } from '../app/XRApp';
import { AvatarFactory } from '../ai/Avatar';
import { Director, ENDLESS_WAVES, WAVES, type SpawnSource } from '../ai/Director';
import { Gremlin, SeatManager, type GremlinWorld, type PlayerLike } from '../ai/Gremlin';
import { Wipe } from '../ai/Wipe';
import { BigBean } from '../ai/BigBean';
import { registerRoster } from '../ai/Roster';
import { PopFx } from '../combat/PopFx';
import { Progression } from '../combat/Progression';
import { Weapon } from '../combat/Weapon';
import { Voice } from '../dialogue/Voice';
import { RoomModel, type Door } from '../room/RoomModel';
import { SceneImport } from '../room/SceneImport';
import { GridNav } from '../room/GridNav';
import { Blueprint, applyPlayMaterials, disposePlayMaterials } from '../room/Blueprint';
import { Hud } from '../ui/Hud';
import { buildBarRange } from './BarRange';
import { NapDimension } from '../portals/NapDimension';
import { PortalDoor } from '../portals/PortalDoor';
import { sessionExtras } from '../xr/webxr-extras';

type Phase = 'waiting' | 'setup' | 'play' | 'down' | 'victory';
type BossStage = 'none' | 'intro' | 'fight' | 'victory';

/** Seconds from the boss announcement to Big Bean squeezing into the door. */
export const BOSS_INTRO_SECONDS = 4;
/** During the Tantrum a Breacher knocks on another door this often. */
export const BOSS_BREACHER_EVERY = 12;
/** Victory beat: one portal clicks shut every PORTAL_CLOSE_EVERY s, one gremlin falls asleep every SLEEP_EVERY s. */
export const PORTAL_CLOSE_EVERY = 0.55;
export const SLEEP_EVERY = 0.3;
/** The chapter completes this long after Big Bean pops. */
export const VICTORY_SECONDS = 10.5;

/** Rank letter for the finale from Patience lost during the whole chapter. */
export function finaleRank(damageTaken: number): string {
  if (damageTaken < 60) return 'S';
  if (damageTaken < 160) return 'A';
  if (damageTaken < 320) return 'B';
  return 'C';
}

const SLEEPY_BLUE = new Color(0x9ad5ff);

/** Tint that turns a Kenney goblin into a blue-faced Tablet Zombie. */

/**
 * Chapter 3 · Bedtime. Finds the room (scan import or virtual fallback, hand-placed door), opens the doors,
 * runs the director, and owns the player's patience. Everything heavy lives in the systems it composes.
 */
export interface HouseOptions {
  /** 'bar' draws an enclosed VR bar over the passthrough (the practice range) instead of using the real room. */
  preset?: 'bar';
}

export class House implements Chapter, DebugChapter {
  readonly name = 'house';
  private readonly preset: HouseOptions['preset'];
  private ctx!: AppContext;
  private phase: Phase = 'waiting';
  private phaseTime = 0;
  private readonly sceneImport = new SceneImport();
  private room = new RoomModel();
  private readonly roomGroup = new Group();
  private readonly fx = new PopFx();
  private voice!: Voice;
  private hud!: Hud;
  private weapon!: Weapon;
  private progression!: Progression;
  private avatars!: AvatarFactory;
  private director!: Director;
  private wipe!: Wipe;
  private seats!: SeatManager;
  private doorVisuals: PortalDoor[] = [];
  private nap!: NapDimension;
  private readonly nearPortal = new Set<string>();
  private cracks: SpawnSource[] = [];
  private occluder: Mesh | null = null;
  private patience = 100;
  private sinceDamage = 10;
  private playTime = 0;
  private readonly head = new Vector3();
  private readonly fwd = new Vector3();
  private readonly unsub: Array<() => void> = [];
  private doorsOpenedForWave = -1;
  private placingDoor = false;
  private blueprint!: Blueprint;
  private blueprintOccluder: Group | null = null;
  private readonly cursor: Mesh;
  private roomStableSince = -1;
  private readonly nav = new GridNav(0.1);
  private clouds: { mesh: Mesh; life: number; radius: number; penalty: number }[] = [];
  readonly stats = { spawned: 0, popped: 0, damageTaken: 0, roomSource: 'none', doors: 0, couches: 0, labels: '', diapersChanged: 0 };
  // ---- Boss C (Big Bean) and the finale ----
  private boss: BigBean | null = null;
  private bossDoorId: string | null = null;
  private bossStage: BossStage = 'none';
  private bossTime = 0;
  private bossBreacherTimer = BOSS_BREACHER_EVERY;
  /** ?boss=1 (or debugBoss()): start straight at the boss wave. */
  private bossShortcut = false;
  private victoryTime = 0;
  private victoryCloseQueue: PortalDoor[] = [];
  private victorySleepers: Gremlin[] = [];
  private victoryNextClose = 0.8;
  private victoryNextSleep = 0.4;
  private victoryCard = false;
  private bossDefeated = false;
  private clippingWas = false;

  constructor(opts: HouseOptions = {}) {
    this.preset = opts.preset;
    this.cursor = new Mesh(new RingGeometry(0.08, 0.1, 24), new MeshBasicMaterial({ color: 0xffcc33, side: DoubleSide }));
    this.cursor.rotation.x = -Math.PI / 2;
    this.cursor.visible = false;
  }

  async start(ctx: AppContext): Promise<void> {
    this.ctx = ctx;
    this.clippingWas = ctx.renderer.localClippingEnabled;
    // Big Bean is clipped at his door plane (only what pokes through is drawn).
    ctx.renderer.localClippingEnabled = true;
    try {
      this.bossShortcut = this.preset !== 'bar' && typeof location !== 'undefined' && new URLSearchParams(location.search).get('boss') === '1';
    } catch {
      this.bossShortcut = false;
    }
    this.nap = new NapDimension({ reducedFlash: ctx.save.data.options.reducedFlash });
    const base = `${import.meta.env.BASE_URL}assets`;
    ctx.world.add(this.roomGroup, this.fx.group, this.cursor);
    this.voice = new Voice(ctx.listener, ctx.bus, base);
    this.hud = new Hud(ctx.input, (o) => ctx.headPosition(o), (o) => ctx.headForward(o));
    ctx.world.add(this.hud.group);
    // TTS cannot say the Family Sheet names: the subtitles carry them instead.
    this.voice.onSubtitle = (t, s) => this.hud.subtitle(t, this.subtitleName(s));
    this.blueprint = new Blueprint({
      input: ctx.input,
      room: this.room,
      parent: this.roomGroup,
      headPosition: (o) => ctx.headPosition(o),
      say: (title, sub, seconds) => this.hud.say(title, sub, seconds),
      onChange: () => this.onRoomEdited(),
      save: ctx.save,
    });
    this.blueprint.onExit = () => {
      if (this.phase === 'play') {
        this.director.paused = false;
        this.openDoorsForWave(this.director.waveNumber - 1);
      }
    };
    this.progression = new Progression(ctx.save, ctx.bus);
    this.avatars = new AvatarFactory(`${base}/kenney`);
    const player: PlayerLike = {
      position: (out = this.head) => ctx.headPosition(out),
      forward: (out = this.fwd) => ctx.headForward(out),
      damage: (amount, source) => this.damage(amount, source),
    };
    this.seats = new SeatManager(this.room);
    const world: GremlinWorld = {
      room: this.room,
      bus: ctx.bus,
      fx: this.fx,
      voice: this.voice,
      world: ctx.world,
      player,
      seats: this.seats,
      gremlins: () => this.director.alive,
      reducedFlash: ctx.save.data.options.reducedFlash,
      weaponHand: () => ctx.input.weaponHand,
      offHand: () => ctx.input.offHand,
      nav: this.nav,
      openDoors: () => this.doorVisuals.filter((d) => d.open && !d.nearPlayer).map((d) => d.door),
      setDoorOpen: (doorId, open) => {
        const dv = this.doorVisuals.find((d) => d.door.id === doorId);
        if (dv && dv.open !== open) {
          dv.setOpen(open);
          ctx.bus.emit(open ? 'portal:open' : 'portal:close', { doorId });
        }
      },
    };
    this.gremlinWorld = world;
    // The practice range is endless with no boss; the chapter ends with Big Bean.
    this.director = new Director(this.room, ctx.bus, () => this.spawnSources(), () => ctx.headPosition(this.head), ctx.isQuest2 ? 14 / 20 : 1, this.preset === 'bar' ? ENDLESS_WAVES : WAVES);
    registerRoster({
      director: this.director,
      world,
      avatars: this.avatars,
      nextVariant: () => this.variant++,
      bossDoorId: () => this.bossDoorId,
    });
    this.wipe = new Wipe(world);
    this.director.register('bigbean', { cost: 0, sources: ['door'], create: () => this.createBigBean() });
    this.weapon = new Weapon(ctx.input, ctx.bus, this.fx, this.voice, () => this.director.alive);
    this.weapon.setTier(this.progression.tier);
    this.weapon.ammo = this.progression.tier.mag;
    ctx.world.add(this.weapon.root);
    this.progression.onTierChange = (t) => {
      this.weapon.setTier(t);
      this.hud.say(`TIER UP: ${t.name}`, 'The Dreamgate hums. Your blaster grows.', 4);
      if (t.tier === 1) this.voice.sayId('narrator_tier_up_double_binky', null);
      if (t.tier === 4) this.voice.sayId('narrator_tier_up_diaper_cannon', null);
    };
    this.unsub.push(
      ctx.bus.on('enemy:popped', ({ style, position, type }) => {
        this.progression.addPop();
        this.stats.popped++;
        if (type === 'bigbean') this.startVictory();
        if (style.includes('CHANGED')) this.fx.text(position, '+50', '#3fd6c8');
        if (style.includes('SHUSHED')) this.fx.text(position, 'SHUSHED +25', '#ff9ad5');
        if (style.includes('DOOR SLAM')) this.fx.text(position, 'DOOR SLAM ×2', '#ff9ad5');
      }),
      ctx.bus.on('door:breached', () => this.hud.damageFlash()),
      ctx.bus.on('enemy:spawned', () => {
        this.stats.spawned++;
      }),
      ctx.bus.on('wave:start', ({ name, index }) => {
        if (this.director.wave?.boss) {
          this.beginBossIntro(index);
          return;
        }
        const fam = ctx.save.data.family;
        const subs = ['', `Copies of ${fam.kid1} and ${fam.kid2} incoming.`, `${fam.kid1} found the couch.`, `${fam.kid2} is at the door.`, `Somebody needs a diaper change.`, `Everyone is awake, ${fam.parent === 'Hey' ? 'friend' : fam.parent}.`];
        this.hud.say(`Wave ${index + 1}: ${name}`, subs[Math.min(index, subs.length - 1)], 3.5);
        if (index + 1 > ctx.save.data.bestWave) {
          ctx.save.data.bestWave = index + 1;
          ctx.save.persist();
        }
        this.voice.sfx('tier_up', null, 0.5);
        if (index === 0) this.voice.sayId('narrator_wave_one', null);
        this.openDoorsForWave(index);
      }),
      ctx.bus.on('wave:clear', () => {
        this.hud.say('Wave clear', 'Breathe. They are regrouping.', 3);
        this.voice.sayId('narrator_wave_clear', null);
      }),
      ctx.bus.on('hint', ({ text, sub, seconds }) => this.hud.say(text, sub, seconds)),
      ctx.bus.on('spawn:request', ({ type, position, facing }) => {
        this.director.spawn(type, { kind: 'crack', position: position.clone(), facing: facing.clone() });
      }),
      ctx.bus.on('stinky:cloud', ({ position, radius, seconds, fireRatePenalty }) => this.addCloud(position, radius, seconds, fireRatePenalty)),
      ctx.bus.on('potato:cushion', ({ seconds }) => this.hud.block(seconds)),
      ctx.bus.on('clinger:attached', () => { this.weapon.swayDeg = 6; }),
      ctx.bus.on('clinger:detached', () => { this.weapon.swayDeg = 0; }),
      ctx.bus.on('siren:inhale', () => this.hud.say('Shush it!', 'Empty off hand at its mouth for 1 s, or pop it.', 2)),
      ctx.bus.on('siren:shushed', () => this.hud.say('Shushed!', 'It looks betrayed.', 1.5)),
      ctx.bus.on('potato:evicted', () => this.hud.say('Scoot!', '', 1)),
      ctx.bus.on('siren:scream', ({ position, radius }) => {
        this.hud.say('AAAAAAAAAA', 'Everyone heard that.', 1.5);
        if (this.phase === 'play') this.director.forceSpawn('scamp');
        for (const g of this.director.alive) {
          if (g.type === 'scamp' && g.position.distanceTo(position) < radius && (g.state === 'roam' || g.state === 'sit')) {
            this.seats.release(g.seat);
            g.seat = null;
            g.setState('chase');
          }
        }
      }),
      ctx.bus.on('diaper:changed', () => {
        this.stats.diapersChanged++;
        this.hud.say('Changed!', '+50. A friendly ghost, a clean start.', 2);
      }),
    );
    // Kick off asset loads without blocking the session.
    void Promise.all([this.voice.load(), this.avatars.load()]).then(() => {
      ctx.log(`assets: characters=${this.avatars.characterCount} lines=${this.voice.lineCount}`);
    });
    this.hud.say('Looking for your room…', 'Stand still for a moment. Run Space Setup in your headset if nothing is found.', 0);
    this.phase = 'waiting';
  }

  private gremlinWorld!: GremlinWorld;
  private variant = 0;

  /** All open doors plus floor cracks. */
  private spawnSources(): SpawnSource[] {
    const out: SpawnSource[] = [];
    for (const dv of this.doorVisuals) if (dv.open && !dv.nearPlayer) out.push({ kind: 'door', position: this.room.doorFloorPoint(dv.door), facing: dv.door.normal.clone(), doorId: dv.door.id });
    for (const c of this.cracks) out.push(c);
    return out;
  }

  update(dt: number, frame: XRFrame | undefined, nowMs: number): void {
    this.phaseTime += dt;
    const ref = this.ctx.refSpace();
    if (frame && ref && this.preset !== 'bar') this.sceneImport.update(frame, ref, nowMs);
    this.fx.update(dt);
    this.hud.update(dt);
    {
      const off = this.ctx.input.offHand;
      const editable = this.phase === 'setup' || this.phase === 'play';
      if (editable && off.buttonBJustPressed && !this.blueprint.active) {
        this.placingDoor = false;
        this.cursor.visible = false;
        if (this.phase === 'play') this.director.paused = true;
        this.blueprint.enter();
      } else {
        this.blueprint.update(dt);
      }
      if (this.blueprintOccluder) this.blueprintOccluder.visible = !this.blueprint.active;
    }

    switch (this.phase) {
      case 'waiting':
        this.updateWaiting(nowMs);
        break;
      case 'setup':
        this.updateSetup(dt);
        break;
      case 'play':
        this.updatePlay(dt, nowMs);
        break;
      case 'down':
        if (this.phaseTime > 3) {
          this.patience = 100;
          this.director.paused = false;
          this.setPhase('play');
          this.hud.say('Again!', 'The gremlins respawn. Your pops are kept.', 3);
          // Checkpoint B: a boss fight restarts from his entrance at full HP.
          if (this.bossStage === 'fight' || this.bossStage === 'intro') {
            this.boss = null;
            this.bossStage = 'intro';
            this.bossTime = BOSS_INTRO_SECONDS - 1.5;
          }
        }
        break;
      case 'victory':
        this.updateVictory(dt, nowMs);
        break;
    }
    if ((this.phase === 'play' || this.phase === 'setup') && this.preset !== 'bar') {
      const occ = this.sceneImport.updateOccluder();
      if (occ && occ !== this.occluder) {
        if (this.occluder) this.roomGroup.remove(this.occluder);
        this.occluder = occ;
        this.roomGroup.add(occ);
      }
    }
    const headNow = this.ctx.headPosition(this.head);
    for (const dv of this.doorVisuals) {
      dv.update(dt, headNow);
      const was = this.nearPortal.has(dv.door.id);
      if (dv.nearPlayer && !was) {
        this.nearPortal.add(dv.door.id);
        this.voice.sfx('ui_click', dv.group, 0.4);
      } else if (!dv.nearPlayer && was) this.nearPortal.delete(dv.door.id);
    }
    this.hud.state = {
      pops: this.progression.pops,
      tierName: this.progression.tier.name,
      toNext: this.progression.toNext(),
      patience: this.patience,
      wave: this.waveLabel(),
      ammo: this.weapon.ammo,
      mag: this.weapon.tier.mag,
      fps: 0,
      hint: this.weapon.hint,
    };
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseTime = 0;
  }

  /** Wait up to 3 s for planes; once they stop changing for 0.8 s (or time runs out) build the room. */
  private updateWaiting(nowMs: number): void {
    if (this.preset === 'bar') {
      if (this.phaseTime < 0.3) return; // wait for a valid head pose
      const head = this.ctx.headPosition(new Vector3());
      const model = buildBarRange(this.roomGroup, new Vector3(head.x, 0, head.z), `${import.meta.env.BASE_URL}assets`);
      this.adoptRoom(model);
      this.hud.say('Practice range', 'A quiet bar. Gremlins come through the kitchen door. Pull the trigger to begin.', 0);
      return;
    }
    const stable = this.sceneImport.stableFor(nowMs);
    const session = this.ctx.session();
    if (this.sceneImport.hasData) {
      if (stable > 800 || this.phaseTime > 6) this.adoptRoom(this.sceneImport.build(this.ctx.headPosition(this.head)));
      return;
    }
    if (this.phaseTime > 3 && this.roomStableSince < 0) {
      this.roomStableSince = nowMs;
      // Ask the system for a room capture once; fall back to a virtual door regardless.
      const extras = session ? sessionExtras(session) : undefined;
      if (extras?.initiateRoomCapture && !this.ctx.isQuest2 && new URLSearchParams(location.search).get('capture') === '1') {
        extras.initiateRoomCapture().catch(() => undefined);
      }
    }
    if (this.phaseTime > 4) {
      const saved = Blueprint.loadSaved(this.ctx.save);
      if (saved) this.stats.roomSource = 'saved';
      this.adoptRoom(saved);
    }
  }

  private adoptRoom(model: RoomModel | null): void {
    const head = this.ctx.headPosition(new Vector3());
    const fwd = this.ctx.headForward(new Vector3());
    let m = model;
    if (!m || (m.doors.length === 0 && m.volumes.length === 0)) {
      m = RoomModel.virtual(head, fwd);
      this.stats.roomSource = model ? 'scene-empty→virtual' : 'virtual';
    } else {
      if (m.doors.length === 0) {
        // Scan without a door: give the player a virtual door to place.
        m.source = 'mixed';
        const v = RoomModel.virtual(head, fwd);
        m.doors.push(v.doors[0]);
        m.orientDoors();
      }
      this.stats.roomSource = m.source;
    }
    this.room = m;
    this.blueprint.setRoom(m);
    this.refreshBlueprintOccluder();
    // Re-point every system at the adopted model.
    this.gremlinWorld.room = m;
    this.seats = new SeatManager(m);
    this.gremlinWorld.seats = this.seats;
    (this.director as unknown as { room: RoomModel }).room = m;
    this.stats.doors = m.doors.length;
    this.stats.couches = m.couches.length;
    this.stats.labels = this.sceneImport.summary();
    this.ctx.log(`room ${m.source}: doors=${m.doors.length} couches=${m.couches.length} volumes=${m.volumes.length} area=${m.area().toFixed(1)} labels=[${this.stats.labels}]`);
    this.buildRoomVisuals();
    this.makeCracks();
    this.nav.rebuild(m);
    const virtual = m.source === 'virtual' || m.doors.some((d) => d.source === 'virtual');
    if (virtual) {
      this.hud.say(m.source === 'virtual' ? 'No room scan found' : 'Scan found, but no door', 'A virtual door is ahead. Point your other hand at the bottom of a real door and pull its trigger to move it, or press B to draw your room. Blaster trigger to begin.', 0);
      this.voice.sayId(m.source === 'virtual' ? 'narrator_no_scan_found' : 'narrator_mark_door', null);
      this.placingDoor = true;
      this.setPhase('setup');
    } else {
      this.hud.say('Room scan found', `${m.doors.length} door${m.doors.length === 1 ? '' : 's'}, ${m.couches.length} couch${m.couches.length === 1 ? '' : 'es'}. Pull the trigger to begin. Shoot the gremlins. Nothing else.`, 0);
      this.voice.sayId('narrator_room_scan_found', null);
      this.setPhase('setup');
    }
  }

  private buildRoomVisuals(): void {
    for (const dv of this.doorVisuals) {
      this.roomGroup.remove(dv.group);
      dv.dispose();
    }
    this.doorVisuals = this.room.portalDoors.map((d) => {
      const dv = new PortalDoor(d, this.nap, { reducedFlash: this.ctx.save.data.options.reducedFlash });
      this.roomGroup.add(dv.group);
      return dv;
    });
    // Couch overlays: a faint cushion plane on each seat so sitting reads even on grayscale passthrough.
    for (const old of this.roomGroup.children.filter((c) => c.name === 'seat-overlay')) this.roomGroup.remove(old);
    for (const s of this.room.seats()) {
      const m = new Mesh(new PlaneGeometry(0.5, 0.45), new MeshBasicMaterial({ color: 0xffcc33, transparent: true, opacity: 0.12, side: DoubleSide }));
      m.name = 'seat-overlay';
      m.position.copy(s.position).add(new Vector3(0, 0.005, 0));
      m.rotation.x = -Math.PI / 2;
      this.roomGroup.add(m);
    }
  }

  /** Floor cracks: the universal spawn fallback, two points in open floor away from the player. */
  private makeCracks(): void {
    this.cracks = [];
    const p = this.ctx.headPosition(new Vector3());
    const c = this.room.center();
    for (let i = 0; i < 40 && this.cracks.length < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.6 + Math.random() * 1.5;
      const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
      if (!this.room.contains(x, z) || this.room.blockedAt(x, z, 0.3)) continue;
      if (Math.hypot(x - p.x, z - p.z) < 1.6) continue;
      const pos = new Vector3(x, this.room.floorY, z);
      const facing = p.clone().sub(pos).setY(0).normalize();
      this.cracks.push({ kind: 'crack', position: pos, facing });
      const crack = new Mesh(new RingGeometry(0.12, 0.2, 5), new MeshBasicMaterial({ color: 0x3fd6c8, transparent: true, opacity: 0.6, side: DoubleSide }));
      crack.rotation.x = -Math.PI / 2;
      crack.position.copy(pos).add(new Vector3(0, 0.005, 0));
      crack.name = 'crack';
      this.roomGroup.add(crack);
    }
    if (this.cracks.length === 0) {
      const pos = c.clone();
      pos.y = this.room.floorY;
      this.cracks.push({ kind: 'crack', position: pos, facing: new Vector3(0, 0, 1) });
    }
  }

  /** Setup: optional door placement, then the trigger starts the invasion. */
  private updateSetup(dt: number): void {
    if (!this.blueprint.active) this.weapon.update(dt, performance.now());
    const off = this.ctx.input.offHand;
    if (this.placingDoor && off.connected && !this.blueprint.active) {
      const hit = this.floorHit(off);
      this.cursor.visible = !!hit;
      if (hit) {
        this.cursor.position.copy(hit).add(new Vector3(0, 0.01, 0));
        if (off.triggerJustPressed) this.placeDoorAt(hit);
      }
    } else this.cursor.visible = false;
    if (this.ctx.input.weaponHand.triggerJustPressed && this.phaseTime > 1 && !this.blueprint.active) this.beginPlay();
  }

  private floorHit(hand: { position: Vector3; forward: (o?: Vector3) => Vector3 }): Vector3 | null {
    const dir = hand.forward(new Vector3());
    if (dir.y > -0.05) return null;
    const t = (this.room.floorY - hand.position.y) / dir.y;
    if (t < 0.2 || t > 8) return null;
    return hand.position.clone().addScaledVector(dir, t);
  }

  private placeDoorAt(floorPoint: Vector3): void {
    const head = this.ctx.headPosition(new Vector3());
    const toPlayer = head.clone().sub(floorPoint).setY(0).normalize();
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), toPlayer).normalize();
    this.room.doors = this.room.doors.filter((d) => d.source !== 'virtual');
    const center = floorPoint.clone().setY(this.room.floorY + 1.0);
    const d = this.room.addDoor(center, right, 0.9, 2.0, 'manual');
    d.normal.copy(toPlayer);
    d.right.copy(right);
    if (!this.room.contains(floorPoint.x, floorPoint.z)) {
      // Extend bounds so paths can reach the door.
      const half = 3;
      this.room.bounds = [
        new Vector2Ctor(Math.min(head.x, floorPoint.x) - half, Math.min(head.z, floorPoint.z) - half),
        new Vector2Ctor(Math.max(head.x, floorPoint.x) + half, Math.min(head.z, floorPoint.z) - half),
        new Vector2Ctor(Math.max(head.x, floorPoint.x) + half, Math.max(head.z, floorPoint.z) + half),
        new Vector2Ctor(Math.min(head.x, floorPoint.x) - half, Math.max(head.z, floorPoint.z) + half),
      ];
    }
    this.room.source = this.room.source === 'virtual' ? 'manual' : 'mixed';
    this.stats.roomSource = this.room.source;
    this.stats.doors = this.room.doors.length;
    this.buildRoomVisuals();
    this.makeCracks();
    this.nav.rebuild(this.room);
    this.voice.sfx('ui_click', null, 0.8);
    this.ctx.input.offHand.pulse(0.6, 60);
    this.hud.say('Door placed', 'Point and pull again to move it. Pull the blaster trigger to begin.', 0);
    this.ctx.log(`door placed at ${floorPoint.x.toFixed(2)},${floorPoint.z.toFixed(2)}`);
  }

  private beginPlay(): void {
    this.placingDoor = false;
    this.cursor.visible = false;
    this.setPhase('play');
    this.hud.say('Bedtime', 'Nobody is going to bed.', 3);
    this.voice.sayId('narrator_go_to_bed', null);
    // ?boss=1 / debugBoss(): straight to Big Bean.
    this.director.start(this.bossShortcut ? Math.max(0, this.director.bossWaveIndex) : 0);
  }

  private openDoorsForWave(index: number): void {
    if (index <= this.doorsOpenedForWave) return;
    this.doorsOpenedForWave = index;
    const sorted = [...this.doorVisuals].sort((a, b) => b.door.width * b.door.height - a.door.width * a.door.height);
    const n = index === 0 ? 1 : index === 1 ? 2 : sorted.length;
    sorted.forEach((dv, i) => {
      if (i < n && !dv.open) {
        dv.setOpen(true);
        this.voice.sfx('portal_hum', dv.group, 0.6);
        this.ctx.bus.emit('portal:open', { doorId: dv.door.id });
      }
    });
  }

  private updatePlay(dt: number, nowMs: number): void {
    this.playTime += dt;
    this.sinceDamage += dt;
    if (this.sinceDamage > 5 && this.patience < 100) this.patience = Math.min(100, this.patience + 4 * dt);
    if (this.blueprint.active) {
      this.updateClouds(dt);
      return;
    }
    this.updateClouds(dt);
    this.weapon.update(dt, nowMs);
    this.director.update(dt);
    for (const g of this.director.alive) g.update(dt);
    this.wipe.update(dt);
    if (this.phase === 'play') this.updateBoss(dt);
    if (this.placingDoor) {
      const off = this.ctx.input.offHand;
      const hit = this.floorHit(off);
      this.cursor.visible = !!hit;
      if (hit) {
        this.cursor.position.copy(hit).add(new Vector3(0, 0.01, 0));
        if (off.triggerJustPressed) {
          this.placeDoorAt(hit);
          this.openDoorsForWave(this.director.waveNumber - 1);
          for (const dv of this.doorVisuals) if (dv.door.source === 'manual') dv.setOpen(true);
        }
      }
    } else this.cursor.visible = false;
  }

  /** Blueprint committed a change: re-point everything at the edited model. */
  private onRoomEdited(): void {
    const m = this.room;
    this.stats.roomSource = m.source;
    this.stats.doors = m.doors.length;
    this.stats.couches = m.couches.length;
    this.seats = new SeatManager(m);
    this.gremlinWorld.seats = this.seats;
    this.buildRoomVisuals();
    this.makeCracks();
    this.nav.rebuild(m);
    this.refreshBlueprintOccluder();
    this.ctx.log(`room edited: doors=${m.doors.length} volumes=${m.volumes.length} kids=${m.doors.filter((d) => d.kidsRoom).length}`);
  }

  /** One merged depth-only mesh for the manual proxies (1 draw call); hidden while Blueprint is open. */
  private refreshBlueprintOccluder(): void {
    if (this.blueprintOccluder) {
      this.roomGroup.remove(this.blueprintOccluder);
      disposePlayMaterials(this.blueprintOccluder);
    }
    this.blueprintOccluder = applyPlayMaterials(this.room);
    this.blueprintOccluder.visible = !this.blueprint.active;
    this.roomGroup.add(this.blueprintOccluder);
  }

  /** Stink clouds: a green fog sphere that slows the weapon while you stand in it. */
  private addCloud(position: Vector3, radius: number, seconds: number, penalty: number): void {
    const big = radius >= 2.2;
    const mesh = new Mesh(new SphereGeometry(radius, 16, 12), new MeshBasicMaterial({ color: 0x7fcf3a, transparent: true, opacity: 0.25, depthWrite: false, side: big ? DoubleSide : FrontSide }));
    mesh.position.copy(position).add(new Vector3(0, radius * 0.6, 0));
    this.roomGroup.add(mesh);
    this.clouds.push({ mesh, life: seconds, radius, penalty });
    this.voice.sfx('stink_cloud', mesh, 0.8);
    if (this.clouds.length > 3) {
      const old = this.clouds.shift()!;
      this.roomGroup.remove(old.mesh);
    }
  }

  private updateClouds(dt: number): void {
    let mult = 1;
    const h = this.ctx.headPosition(new Vector3());
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      c.life -= dt;
      (c.mesh.material as MeshBasicMaterial).opacity = Math.min(0.25, c.life * 0.2);
      if (c.mesh.position.distanceTo(h) < c.radius) mult = Math.min(mult, 1 - c.penalty);
      if (c.life <= 0) {
        this.roomGroup.remove(c.mesh);
        this.clouds.splice(i, 1);
      }
    }
    this.weapon.rateMultiplier = mult;
  }

  private damage(amount: number, source: string): void {
    if (this.phase !== 'play') return;
    this.patience = Math.max(0, this.patience - amount);
    this.sinceDamage = 0;
    this.stats.damageTaken += amount;
    this.hud.damageFlash();
    this.ctx.input.weaponHand.pulse(0.6, 80);
    this.voice.sfx('ouch', null, 0.7);
    this.ctx.bus.emit('player:damaged', { amount, patience: this.patience });
    if (this.patience <= 0) {
      this.ctx.bus.emit('player:down', {});
      this.director.paused = true;
      this.director.clear();
      this.setPhase('down');
      this.hud.say('You lost it.', `A ${source} got you. Deep breath. Count to three.`, 3);
    }
  }

  /** The adopted room, serialised, so a playtester's real room can be replayed in the emulator. */
  roomJSON(): unknown {
    return this.room.toJSON();
  }

  /** For tests and the diagnostics export. */
  snapshot(): Record<string, unknown> {
    return {
      phase: this.phase,
      room: { source: this.room.source, doors: this.room.doors.length, couches: this.room.couches.length, volumes: this.room.volumes.length, area: Number(this.room.area().toFixed(2)), bounds: this.room.bounds.length },
      labels: this.sceneImport.summary(),
      wave: this.director.waveNumber,
      alive: this.director.alive.filter((g) => g.alive).length,
      seated: this.director.alive.filter((g) => g.state === 'sit').length,
      spawned: this.stats.spawned,
      popped: this.stats.popped,
      pops: this.progression.pops,
      tier: this.progression.tier.name,
      patience: Math.round(this.patience),
      avatars: this.avatars.loaded ? 'gltf' : 'procedural',
      lines: this.voice.lineCount,
      doorsOpen: this.doorVisuals.filter((d) => d.open).length,
      portalDraws: this.doorVisuals.reduce((n, d) => n + d.drawCalls, 0),
      portalsNear: this.doorVisuals.filter((d) => d.nearPlayer).length,
      blueprint: this.blueprint?.snapshot(),
      anyNaN: this.director.alive.some((g) => !Number.isFinite(g.position.x) || !Number.isFinite(g.position.z)),
      enemiesSpawned: this.stats.spawned,
      enemiesPopped: this.stats.popped,
      boss: this.boss
        ? { stage: this.bossStage, phase: this.boss.phase, beat: this.boss.beat, hp: Math.ceil(this.boss.hp), alive: this.boss.alive, ring: this.boss.ringActive ? Number(this.boss.ringLeft.toFixed(1)) : null, door: this.bossDoorId }
        : { stage: this.bossStage },
      bossDefeated: this.bossDefeated,
      diapersChanged: this.stats.diapersChanged,
      completed: this.completed,
    };
  }

  // ---- Boss C: Big Bean, and the finale -----------------------------------------------------------------

  /** Subtitle label for a voice line's speaker (Family Sheet names for the family). */
  private subtitleName(speaker: string): string {
    const fam = this.ctx.save.data.family;
    switch (speaker) {
      case 'bigbean':
        return `Big ${fam.kid2}`;
      case 'pickle':
        return fam.kid1;
      case 'bean':
        return fam.kid2;
      case 'parent':
        return 'You';
      default:
        return speaker;
    }
  }

  /** HUD wave line: the boss's HP while he is in the door. */
  private waveLabel(): string {
    const b = this.boss;
    if (this.phase === 'victory') return 'Everyone is asleep';
    if (b && b.alive && this.bossStage === 'fight') return `BIG BEAN ${Math.ceil(b.hp)}/${b.maxHp}${b.ringActive ? ` · ring ${Math.ceil(b.ringLeft)} s` : ''}`;
    if (this.bossStage === 'intro') return 'Something big is coming';
    return this.director?.wave ? `${this.director.waveNumber} ${this.director.wave.name}` : '—';
  }

  /** The door Big Bean is wedged in: the largest portal door (a virtual one if the room has none). */
  private bossDoor(): Door {
    const known = this.bossDoorId ? this.room.portalDoors.find((d) => d.id === this.bossDoorId) : undefined;
    if (known) return known;
    const largest = this.room.largestDoor();
    if (largest) return largest;
    const v = RoomModel.virtual(this.ctx.headPosition(new Vector3()), this.ctx.headForward(new Vector3())).doors[0];
    v.id = 'boss-door';
    this.room.doors.push(v);
    this.buildRoomVisuals();
    return v;
  }

  private openBossDoor(): PortalDoor | undefined {
    const dv = this.doorVisuals.find((d) => d.door.id === this.bossDoorId);
    if (dv && !dv.open) {
      dv.setOpen(true);
      this.ctx.bus.emit('portal:open', { doorId: dv.door.id });
    }
    return dv;
  }

  private createBigBean(): BigBean {
    const door = this.bossDoor();
    this.bossDoorId = door.id;
    this.openBossDoor();
    const bean = new BigBean(this.gremlinWorld, door);
    this.boss = bean;
    return bean;
  }

  /** The boss wave started: announce him, open his door, and give the door a few seconds to rumble. */
  private beginBossIntro(index: number): void {
    if (this.bossStage !== 'none') return;
    this.bossStage = 'intro';
    this.bossTime = 0;
    this.bossDoorId = this.bossDoor().id;
    this.openDoorsForWave(index);
    const dv = this.openBossDoor();
    if (index + 1 > this.ctx.save.data.bestWave) {
      this.ctx.save.data.bestWave = index + 1;
      this.ctx.save.persist();
    }
    const kid2 = this.ctx.save.data.family.kid2;
    this.hud.say(`Big ${kid2}`, 'Something big is stuck in the doorway. Mind the frame.', 4);
    this.voice.sayId('boss_narrator_big_one', null);
    this.voice.sfx('portal_hum', dv?.group ?? null, 1);
    this.ctx.log(`boss intro: Big Bean at ${this.bossDoorId}`);
  }

  private bossLastPhase = '';
  private bossLineAt = 0;
  private bossLine = '';

  private updateBoss(dt: number): void {
    if (this.bossStage === 'none' || this.bossStage === 'victory') return;
    this.bossTime += dt;
    const dv = this.openBossDoor();
    if (this.bossStage === 'intro') {
      // The frame rumbles: knocks and teal sparks, faster and faster.
      const beat = this.bossTime < 2 ? 0.8 : 0.4;
      if (dv && Math.floor(this.bossTime / beat) !== Math.floor((this.bossTime - dt) / beat)) {
        this.voice.sfx('knock', dv.group, 0.8);
        const p = dv.door.center.clone().addScaledVector(dv.door.normal, 0.1).add(new Vector3((Math.random() - 0.5) * dv.door.width, (Math.random() - 0.2) * dv.door.height * 0.5, 0));
        this.fx.pop(p, new Color(0x3fd6c8), 8);
      }
      if (this.bossTime >= BOSS_INTRO_SECONDS) {
        const g = this.director.forceSpawn('bigbean');
        if (g instanceof BigBean) {
          this.boss = g;
          this.bossStage = 'fight';
          this.bossBreacherTimer = BOSS_BREACHER_EVERY / 2;
          this.bossLastPhase = '';
          this.hud.say('Big Bean', 'His head is the weak spot (x3). When an arm winds up, step to the other side.', 4);
          this.queueBossLine('boss_narrator_weak_spot', 2.2);
          this.ctx.log('boss: Big Bean is in the door');
        }
      }
      return;
    }
    const boss = this.boss;
    if (!boss) return;
    if (boss.phase !== this.bossLastPhase) {
      this.bossLastPhase = boss.phase;
      // The parent's one-word reactions, after his line.
      if (boss.phase === 'demand') this.queueBossLine('boss_parent_not_it', 2.4);
      if (boss.phase === 'tantrum') this.queueBossLine('boss_narrator_tantrum', 2.2);
    }
    if (this.bossLine && this.bossTime >= this.bossLineAt) {
      this.voice.sayId(this.bossLine, null);
      this.bossLine = '';
    }
    // Tantrum: Breachers knock on the other doors (never his).
    if (boss.phase === 'tantrum' && boss.alive) {
      this.bossBreacherTimer -= dt;
      if (this.bossBreacherTimer <= 0) {
        this.bossBreacherTimer = BOSS_BREACHER_EVERY;
        const others = this.room.portalDoors.filter((d) => d.id !== this.bossDoorId);
        const breachers = this.director.alive.filter((g) => g.type === 'breacher' && g.alive).length;
        if (others.length > 0 && breachers < 2) this.director.forceSpawn('breacher');
      }
    }
  }

  private queueBossLine(id: string, delay: number): void {
    this.bossLine = id;
    this.bossLineAt = this.bossTime + delay;
  }

  /** Big Bean popped: portals click shut one by one, the stragglers fall asleep, then the chapter ends. */
  private startVictory(): void {
    if (this.bossDefeated || this.preset === 'bar') return;
    this.bossDefeated = true;
    this.bossStage = 'victory';
    this.director.paused = true;
    this.weapon.swayDeg = 0;
    this.setPhase('victory');
    this.victoryTime = 0;
    this.victoryNextClose = 1.2;
    this.victoryNextSleep = 0.6;
    this.victoryCard = false;
    this.victoryBeat = 0;
    this.victoryClosingSaid = false;
    const isBossDoor = (dv: PortalDoor) => (dv.door.id === this.bossDoorId ? 1 : 0);
    this.victoryCloseQueue = this.doorVisuals.filter((d) => d.open).sort((a, b) => isBossDoor(a) - isBossDoor(b));
    this.victorySleepers = this.director.alive.filter((g) => g.alive && g !== this.boss);
    for (const g of this.victorySleepers) g.avatar.play('idle', 0.3);
    this.hud.say('Night night.', 'Big Bean is asleep. So is everyone else, nearly.', 3);
    this.voice.sfx('confetti', null, 1);
    this.ctx.log('boss: Big Bean popped, victory');
  }

  private updateVictory(dt: number, nowMs: number): void {
    this.victoryTime += dt;
    this.updateClouds(dt);
    this.weapon.update(dt, nowMs);
    // A chorus of door clicks: every portal shuts, his door last.
    if (this.victoryTime >= this.victoryNextClose && this.victoryCloseQueue.length > 0) {
      const dv = this.victoryCloseQueue.shift() as PortalDoor;
      this.victoryNextClose = this.victoryTime + PORTAL_CLOSE_EVERY;
      if (dv.open) {
        dv.setOpen(false);
        this.ctx.bus.emit('portal:close', { doorId: dv.door.id });
      }
      this.voice.sfx('ui_click', dv.group, 1);
      this.voice.sfx('knock', dv.group, 0.4);
      this.fx.text(dv.door.center.clone().addScaledVector(dv.door.normal, 0.2), 'click', '#3fd6c8');
    }
    // The director is paused: drop the dead from its list here (the weapon still aims at the living).
    const alive = this.director.alive;
    for (let i = alive.length - 1; i >= 0; i--) if (!alive[i].alive) alive.splice(i, 1);
    // Every gremlin left in the room yawns and pops into Zzz confetti.
    for (const g of this.victorySleepers) {
      if (!g.alive) continue;
      g.avatar.update(dt);
      g.avatar.root.rotation.z = Math.sin(this.victoryTime * 2 + g.id) * 0.12;
    }
    if (this.victoryTime >= this.victoryNextSleep && this.victorySleepers.length > 0) {
      const g = this.victorySleepers.shift() as Gremlin;
      this.victoryNextSleep = this.victoryTime + SLEEP_EVERY;
      if (g.alive) {
        const c = g.position.clone().add(new Vector3(0, g.height * 0.6, 0));
        this.fx.pop(c, SLEEPY_BLUE, 18);
        this.fx.text(c, 'Zzz', '#9ad5ff');
        this.voice.sfx('pop', g.root, 0.5);
        g.dispose();
      }
      if (!this.victoryYawned) {
        this.victoryYawned = true;
        this.voice.sayId('boss_scamp_not_tired', g.root);
      }
    }
    if (!this.victoryCard && this.victoryTime > 3.5 && this.victoryCloseQueue.length === 0 && this.victorySleepers.length === 0) {
      this.victoryCard = true;
      this.hud.say('Everyone is asleep.', 'Even you, almost.', 0);
      this.voice.sayId('boss_narrator_everyone_asleep', null);
      const kids = this.room.doors.find((d) => d.kidsRoom);
      if (kids) {
        const at = new Object3D();
        at.position.copy(kids.center);
        this.roomGroup.add(at);
        this.kidsVoice = at;
      }
    }
    if (!this.victoryClosingSaid && this.victoryTime > 1.0) {
      this.victoryClosingSaid = true;
      this.voice.sayId('boss_narrator_portals_closing', null);
    }
    // The button: the parent sighs, a real kid sleep-talks behind the Kids' Room Door, the parent answers.
    if (this.victoryCard && this.victoryBeat === 0 && this.victoryTime > 6.0) {
      this.victoryBeat = 1;
      this.voice.sayId('boss_parent_finally', null);
    } else if (this.victoryBeat === 1 && this.victoryTime > 7.4) {
      this.victoryBeat = 2;
      this.voice.sayId('boss_pickle_sleep_talk', this.kidsVoice);
    } else if (this.victoryBeat === 2 && this.victoryTime > 8.8) {
      this.victoryBeat = 3;
      this.voice.sayId('boss_parent_go_to_bed', null);
    }
    if (this.victoryTime >= VICTORY_SECONDS) {
      const fam = this.ctx.save.data.family;
      this.finishChapter([`Big ${fam.kid2}: put to bed`, `Diapers changed: ${this.stats.diapersChanged}`, `Patience lost: ${Math.round(this.stats.damageTaken)}`]);
    }
  }

  private victoryYawned = false;
  private victoryClosingSaid = false;
  private victoryBeat = 0;
  private kidsVoice: Object3D | null = null;

  /** Debug/test hook: skip straight to the boss wave (from setup, or mid-game). */
  debugBoss(): void {
    if (this.preset === 'bar') return;
    if (this.phase === 'setup') {
      this.bossShortcut = true;
      this.beginPlay();
      return;
    }
    if (this.phase === 'play' && this.bossStage === 'none' && this.director.bossWaveIndex >= 0) this.director.jumpTo(this.director.bossWaveIndex);
  }

  /** Debug/test hook: hit Big Bean as if shot (headshot = the weak point). False if he is not in the door. */
  debugHitBoss(amount = 99, headshot = false): boolean {
    const b = this.boss;
    if (!b || !b.alive || this.bossStage !== 'fight') return false;
    b.hit(amount, headshot);
    return true;
  }

  /** Debug/test hook: pop the nearest gremlin as if hit twice. */
  debugShootNearest(): boolean {
    const p = this.ctx.headPosition(new Vector3());
    const g = [...this.director.alive].sort((a, b) => a.position.distanceToSquared(p) - b.position.distanceToSquared(p))[0];
    if (!g) return false;
    g.hit(99, false);
    return true;
  }

  /** Debug/test hook: skip setup. */
  debugBegin(): void {
    if (this.phase === 'setup') this.beginPlay();
  }

  private completed = false;

  /** End the chapter and hand over to the next one (the end card in a campaign). */
  protected finishChapter(extraLines: string[] = []): void {
    if (this.completed) return;
    this.completed = true;
    this.director?.clear();
    this.ctx.complete({
      title: 'Chapter 3 · Bedtime',
      pops: this.progression.sessionPops,
      rank: this.bossDefeated ? finaleRank(this.stats.damageTaken) : undefined,
      lines: [...extraLines, `Reached wave ${this.director?.waveNumber ?? 0}`, `Room: ${this.stats.roomSource}`],
    });
  }

  /** Debug/test hook: jump to the end of the chapter. */
  debugFinish(): void {
    this.finishChapter(['(skipped)']);
  }

  dispose(): void {
    if (this.ctx) this.ctx.renderer.localClippingEnabled = this.clippingWas;
    for (const u of this.unsub) u();
    this.wipe?.dispose();
    this.director?.clear();
    for (const dv of this.doorVisuals) dv.dispose();
    this.doorVisuals = [];
    this.nap?.dispose();
    this.blueprint?.dispose();
    if (this.blueprintOccluder) disposePlayMaterials(this.blueprintOccluder);
    this.ctx?.world.remove(this.roomGroup, this.fx.group, this.hud.group, this.weapon.root, this.cursor);
  }
}

import { Vector2 as Vector2Ctor } from 'three';
export { Gremlin };
