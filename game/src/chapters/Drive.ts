import { Color, Fog, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3, type Scene } from 'three';
import type { AppContext, Chapter, DebugChapter } from '../app/XRApp';
import type { Gremlin, GremlinWorld } from '../ai/Gremlin';
import { RoomModel } from '../room/RoomModel';
import type { HandState } from '../xr/Input';
import { Kit } from './Kit';
import { BARRIER_POINT, BEAN_SEAT, Cockpit, PICKLE_SEAT, radialTexture, type GrabItem } from '../drive/Cockpit';
import { Road, type Hazard } from '../drive/Road';
import { DeerGremlin, WindowClinger, SPOTS } from '../drive/CarGremlins';
import { MrJingles, Synth } from '../drive/Jingles';
import { KidSeat } from '../drive/Kids';
import { NeedSystem, PeeMeter, driveRank, driveScore, type Need, type NeedKind, type NeedStage } from '../drive/Needs';
import { LANE_WIDTH, SteeringModel, angleDelta, type SteerInput } from '../drive/Steering';
import { BOSS_AT, BOSS_GIVE_UP, Timeline, cruiseSpeed, type DriveEvent, type SpotName } from '../drive/Timeline';

type Phase = 'calibrate' | 'intro' | 'drive' | 'boss' | 'home' | 'arrived' | 'done';

const TITLE = 'Chapter 2 · Are We Home Yet?';
const SPOT_ORDER: SpotName[] = ['hood', 'shieldL', 'shieldR', 'left', 'right'];
const tmpV = new Vector3();
const tmpV2 = new Vector3();

/**
 * Chapter 2 · Are We Home Yet? The VR drive home at night, compressed to about 4:30.
 * The minivan cockpit is fixed around the player's starting head pose and the camera never moves: the road scrolls toward
 * the player and slides sideways opposite the steering. Steer by gripping the wheel rim (or the off-hand stick), shoot
 * gremlins off the hood and windows, hand the tablet and the snack back over your shoulder, hold your arm between the seats,
 * dodge eight hazards, beat Mr. Jingles' roof cone, and pull into the driveway before anybody pees.
 */
export class Drive implements Chapter, DebugChapter {
  readonly name = 'drive';
  private ctx!: AppContext;
  private kit!: Kit;
  private readonly rig = new Group();
  private cockpit: Cockpit | null = null;
  private road: Road | null = null;
  private boss: MrJingles | null = null;
  private synth: Synth | null = null;
  private gw: GremlinWorld | null = null;
  private readonly kids: KidSeat[] = [];
  private enemies: Gremlin[] = [];
  private readonly deer: Array<{ hazard: Hazard; g: DeerGremlin }> = [];
  private readonly steering = new SteeringModel();
  private readonly needs = new NeedSystem();
  private readonly pee = new PeeMeter();
  private readonly timeline = new Timeline();
  private readonly grips = new Map<HandState, { angle: number; wheel: number }>();
  private readonly heldItems = new Map<HandState, GrabItem>();
  private readonly lineQueue: Array<{ at: number; id: string }> = [];
  private readonly unsub: Array<() => void> = [];
  private readonly firsts = new Set<string>();
  private phase: Phase = 'calibrate';
  private phaseTime = 0;
  private driveTime = 0;
  private speed = 0;
  private t = 0;
  private barrierHold = 0;
  private rumbleAcc = 0;
  private bumpTimer = 0;
  private muteUntil = 0;
  private cardBusyUntil = 0;
  private lastTick = 0;
  private wheelJitter = 0;
  private beganAtMs = 0;
  /** Seconds until Patience refills after it hit 0 (the drive never fails: the parent just needs a minute). */
  private downTimer = 0;
  private downs = 0;
  private noHintUntil = 0;
  private completed = false;
  private fogBefore: Scene['fog'] = null;
  private vignette: Mesh | null = null;
  private tabletAgain = false;
  readonly stats = { spawned: 0, popped: 0, dodges: 0, dents: 0, hazards: 0, phews: 0 };

  start(ctx: AppContext): void {
    this.ctx = ctx;
    this.kit = new Kit(ctx, () => this.enemies);
    this.kit.voice.onSubtitle = (text, speaker) => this.subtitle(text, speaker);
    void this.kit.load(6).then(() => ctx.log(`drive assets: characters=${this.kit.avatars.characterCount} lines=${this.kit.voice.lineCount}`));
    this.rig.name = 'drive-rig';
    ctx.world.add(this.rig);
    this.fogBefore = ctx.scene.fog;
    ctx.scene.fog = new Fog(0x1d2547, 16, 52);
    this.unsub.push(
      ctx.bus.on('enemy:spawned', () => {
        this.stats.spawned++;
      }),
      ctx.bus.on('enemy:popped', ({ type }) => {
        this.stats.popped++;
        if (this.stats.popped === 1) this.queueLine('drive_pickle_gooey', 1.2);
        if (type === 'jingles-arm' && this.boss) this.boss.armsPopped++;
      }),
    );
    this.needs.onStage = (n, s) => this.onNeedStage(n, s);
    this.kit.onDown = () => {
      this.downs++;
      this.downTimer = 3;
      this.card('I need a minute.', 'Deep breath. Count to three. Keep driving.', 3);
      this.queueLine('drive_parent_pull_over', 0.3);
    };
    this.kit.hud.say(TITLE, 'Grab the steering wheel (grip button) to drive home. Pull the blaster trigger to start.', 0);
    this.kit.status = 'Parked';
  }

  // ------------------------------------------------------------------------------------------------ setup

  /** Capture the head pose once and build the car around it. */
  private build(): void {
    if (this.cockpit) return;
    const head = this.ctx.headPosition(new Vector3());
    const f = this.ctx.headForward(new Vector3()).setY(0);
    if (f.lengthSq() < 1e-6 || !Number.isFinite(f.x)) f.set(0, 0, -1);
    f.normalize();
    if (!Number.isFinite(head.x) || !Number.isFinite(head.y)) head.set(0, 1.4, 0);
    this.rig.position.copy(head);
    this.rig.rotation.set(0, Math.atan2(-f.x, -f.z), 0);
    this.rig.updateMatrixWorld(true);
    const fam = this.ctx.save.data.family;
    this.cockpit = new Cockpit({ kid1: fam.kid1, kid2: fam.kid2 });
    this.road = new Road();
    this.rig.add(this.road.root, this.cockpit.group);
    const base = `${import.meta.env.BASE_URL}assets/kenney/mini-characters`;
    const pickle = new KidSeat('pickle', fam.kid1, 0.8, PICKLE_SEAT.clone().add(new Vector3(0, -0.12, -0.05)));
    const bean = new KidSeat('bean', fam.kid2, 0.65, BEAN_SEAT.clone().add(new Vector3(0, -0.08, -0.05)));
    this.kids.push(pickle, bean);
    this.cockpit.group.add(pickle.root, bean.root);
    void pickle.load(`${base}/character-female-a.glb`);
    void bean.load(`${base}/character-male-f.glb`);
    this.gw = this.kit.makeWorld(new RoomModel(), () => this.enemies, { nav: false });
    this.synth = new Synth(this.ctx.listener);
    const gw = this.gw;
    this.boss = new MrJingles(this.road, gw, this.synth, {
      say: (id) => this.kit.voice.sayId(id, null),
      sfx: (name, volume) => this.kit.voice.sfx(name, null, volume ?? 1),
      hint: (title, sub, seconds) => this.card(title, sub, seconds),
      damage: (amount, source) => this.hitCar(amount, source, true),
      confetti: (at, big) => {
        for (let i = 0; i < (big ? 3 : 1); i++) this.kit.fx.pop(at.clone().add(new Vector3((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2)), new Color().setHSL(Math.random(), 0.8, 0.7), 60);
      },
      adopt: (g) => {
        g.begin();
        this.enemies.push(g);
      },
      carX: () => this.steering.offset,
    });
    if (this.ctx.save.data.options.vignette) this.makeVignette();
    this.ctx.log(`drive: cockpit built at head ${head.x.toFixed(2)},${head.y.toFixed(2)},${head.z.toFixed(2)}`);
  }

  private makeVignette(): void {
    const tex = radialTexture('rgba(0,0,0,0)');
    // Inverted radial: transparent centre, black rim.
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    if (g) {
      const grad = g.createRadialGradient(64, 64, 20, 64, 64, 64);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      tex.image = c;
      tex.needsUpdate = true;
    }
    const mat = new MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false });
    this.vignette = new Mesh(new PlaneGeometry(0.5, 0.5), mat);
    this.vignette.position.set(0, 0, -0.15);
    this.vignette.renderOrder = 9000;
    this.vignette.frustumCulled = false;
    this.ctx.camera.add(this.vignette);
  }

  private startDrive(): void {
    if (this.phase !== 'intro' && this.phase !== 'calibrate') return;
    this.build();
    this.setPhase('drive');
    this.driveTime = 0;
    this.beganAtMs = performance.now();
    this.card('Drive home', `It is 7:02 pm. ${this.ctx.save.data.family.kid1} and ${this.ctx.save.data.family.kid2} are in the back. Grip the wheel rim to steer.`, 4);
    this.kit.voice.sfx('tier_up', null, 0.4);
    this.kit.status = 'Drive home';
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseTime = 0;
  }

  // ------------------------------------------------------------------------------------------------ frame

  update(dt: number, _frame: XRFrame | undefined, nowMs: number): void {
    this.t += dt;
    this.phaseTime += dt;
    this.kit.update(dt, nowMs);
    if (this.downTimer > 0) {
      this.downTimer -= dt;
      if (this.downTimer <= 0) this.kit.resetPatience();
    }
    if (this.phase === 'calibrate') {
      if (this.phaseTime > 0.4) {
        this.build();
        this.setPhase('intro');
      }
      return;
    }
    const cockpit = this.cockpit, road = this.road;
    if (!cockpit || !road) return;
    if (this.phase === 'intro') {
      const input = this.steerInput(dt);
      if (input.held || this.ctx.input.weaponHand.triggerJustPressed || this.phaseTime > 25) this.startDrive();
    }
    if (this.phase === 'drive' || this.phase === 'boss' || this.phase === 'home') this.driveTime += dt;
    if (this.muteUntil > 0 && this.t > this.muteUntil) {
      this.muteUntil = 0;
      this.kit.voice.muted = false;
    }

    // Steering (wheel, stick or autopilot) → lateral offset of the world.
    const input = this.phase === 'arrived' || this.phase === 'done' ? { held: false } : this.steerInput(dt);
    const before = this.steering.drifting;
    if (this.phase === 'drive' || this.phase === 'boss' || this.phase === 'home') this.steering.update(dt, input);
    if (!before && this.steering.drifting && this.phase !== 'home') {
      this.queueLine('drive_pickle_sideways', 0.5);
      if (!this.firsts.has('drift')) {
        this.firsts.add('drift');
        this.card('Hands on the wheel!', 'With no hand on the wheel for 2 s the car drifts toward the edge.', 3);
      }
    }
    // A kid kicking the seat rattles the wheel (visual and haptic only: the view never shakes).
    const kick = this.kids.some((k) => k.stage === 'cry' || k.stage === 'meltdown') ? 4 : this.kids.some((k) => k.stage === 'whine') ? 2 : 0;
    this.wheelJitter = kick * Math.sin(this.t * 17);
    cockpit.setWheel(this.steering.wheelDeg + this.wheelJitter);

    // Speed.
    if (this.phase === 'drive' || this.phase === 'boss') this.speed = cruiseSpeed(this.driveTime);
    else if (this.phase === 'home') this.speed = this.homeSpeed();
    else this.speed = 0;
    road.update(dt, this.speed, this.steering.offset, this.t);

    // Hazards.
    for (const o of road.updateHazards(dt, this.speed, this.steering.offset, this.t)) this.onHazardPassed(o.hazard, o.hit, o.close);
    for (const h of road.hazards) {
      if (h.told && !h.done && h.t > 0 && !h.cancelled && h.marker.visible && !h.group.userData.beeped) {
        h.group.userData.beeped = true;
        this.synth?.beep(0.3);
        if (!this.firsts.has(`tell-${h.kind}`)) {
          this.firsts.add(`tell-${h.kind}`);
          this.card(h.def.label, 'Steer into another lane!', 1.6);
        }
      }
    }
    this.updateDeer();

    // Schedule. On a very slow device (frames clamped at 0.1 s) the first gremlin still arrives within 6 s of real time.
    if (this.phase === 'drive') for (const ev of this.timeline.due(this.driveTime)) this.onEvent(ev);
    if (this.phase === 'drive' && this.stats.spawned === 0 && performance.now() - this.beganAtMs > 6000) this.spawnClinger('hood');
    for (let i = this.lineQueue.length - 1; i >= 0; i--) {
      if (this.driveTime >= this.lineQueue[i].at || this.phase === 'intro') {
        const id = this.lineQueue[i].id;
        this.lineQueue.splice(i, 1);
        this.kit.voice.sayId(id, null);
      }
    }

    // Back seat.
    if (this.phase === 'drive' || this.phase === 'boss' || this.phase === 'home') {
      this.needs.update(dt);
      const lvl = this.pee.update(dt);
      if (lvl) this.onPeeLevel(lvl);
    }
    this.updateItems();
    this.updateBarrier(dt);
    this.updateKids(dt);

    // Enemies.
    for (const g of this.enemies) g.update(dt);
    this.enemies = this.enemies.filter((g) => g.alive);

    // Boss and the ride home.
    if (this.boss) {
      this.boss.update(dt, this.speed);
      if (this.phase === 'boss' && (this.boss.done || this.driveTime > BOSS_AT + BOSS_GIVE_UP)) this.beginHome();
    }
    if (this.phase === 'home' && road.home && this.homeRemaining() <= 0.15) this.arrive();
    if (this.phase === 'arrived') this.updateArrived();

    // Rumble strip.
    if (this.steering.onRumble && this.speed > 3) {
      this.rumbleAcc += dt;
      this.bumpTimer -= dt;
      if (this.rumbleAcc >= 1) {
        // Comedy, not punishment: no Patience loss (a red flash every second would be miserable).
        this.rumbleAcc = 0;
        this.pulseBoth(0.25, 40);
      }
      if (this.bumpTimer <= 0) {
        this.bumpTimer = 2;
        this.kit.voice.sayId('drive_bean_bump', null);
        this.pulseBoth(0.3, 60);
      }
    }
    this.cockpit?.update(dt);
    const fill = (this.needs.fill('pickle') + this.needs.fill('bean')) / 2;
    cockpit.setDreamgate(this.phase === 'arrived' ? 1.6 : 0.3 + 0.7 * fill, this.t);
    cockpit.drawMirror({ pickle: this.needs.stageOf('pickle'), bean: this.needs.stageOf('bean'), pickleFill: this.needs.fill('pickle'), beanFill: this.needs.fill('bean'), pee: this.pee.level });
    if (this.vignette) {
      const k = this.ctx.save.data.options.vignette ? Math.min(0.65, (Math.abs(this.steering.velocity) / 1.5) * 0.65) : 0;
      (this.vignette.material as MeshBasicMaterial).opacity += (k - (this.vignette.material as MeshBasicMaterial).opacity) * Math.min(1, dt / 0.3);
    }
  }

  // ------------------------------------------------------------------------------------------------ input

  private hands(): HandState[] {
    const w = this.ctx.input.weaponHand, o = this.ctx.input.offHand;
    return w === o ? [w] : [o, w];
  }

  private grabPressed(h: HandState): boolean {
    return h.squeezeJustPressed || (h.isHand && h.triggerJustPressed);
  }

  private grabHeld(h: HandState): boolean {
    return h.squeeze || (h.isHand && h.trigger);
  }

  private steerInput(dt: number): SteerInput {
    const cockpit = this.cockpit;
    if (!cockpit) return { held: false };
    for (const h of this.hands()) {
      if (!h.connected) {
        this.grips.delete(h);
        continue;
      }
      if (!this.grips.has(h) && !this.heldItems.has(h) && this.grabPressed(h)) {
        const info = cockpit.rimInfo(h.position);
        if (info.dist < 0.15) {
          this.grips.set(h, { angle: info.angle, wheel: this.steering.wheelDeg });
          h.pulse(0.4, 30);
          if (!this.firsts.has('grab')) {
            this.firsts.add('grab');
            this.card('Steering', 'Turn the wheel to change lanes. Let go for 2 s and the car drifts.', 3);
          }
        }
      }
      if (this.grips.has(h) && !this.grabHeld(h)) this.grips.delete(h);
    }
    if (this.grips.size > 0) {
      let sum = 0;
      for (const [h, g] of this.grips) sum += g.wheel - (angleDelta(cockpit.rimInfo(h.position).angle, g.angle) * 180) / Math.PI;
      const wheelDeg = sum / this.grips.size;
      if (Math.floor(wheelDeg / 10) !== Math.floor(this.steering.wheelDeg / 10)) for (const h of this.grips.keys()) h.pulse(0.15, 10);
      return { held: true, wheelDeg, twoHands: this.grips.size >= 2 };
    }
    // Fallback: the off-hand thumbstick turns the wheel.
    const sx = this.ctx.input.offHand.thumbstick.x;
    if (Math.abs(sx) > 0.2) return { held: true, wheelDeg: this.steering.wheelDeg + sx * 80 * dt };
    return { held: false };
  }

  /** Grab the tablet / snack bag; hand it back behind the seat plane to the kid who asked. */
  private updateItems(): void {
    const cockpit = this.cockpit;
    if (!cockpit) return;
    let showFor: NeedKind | null = null;
    for (const h of this.hands()) {
      if (!h.connected) continue;
      let item = this.heldItems.get(h);
      if (!item && !this.grips.has(h) && this.grabPressed(h)) {
        let best: GrabItem | null = null, bestD = 0.14;
        for (const it of cockpit.items) {
          if (it.away > 0 || [...this.heldItems.values()].includes(it)) continue;
          const d = it.mesh.getWorldPosition(tmpV).distanceTo(h.position);
          if (d < bestD) {
            best = it;
            bestD = d;
          }
        }
        if (best) {
          item = best;
          this.heldItems.set(h, best);
          h.pulse(0.5, 40);
          this.kit.voice.sfx('ui_click', null, 0.6);
        }
      }
      if (!item) continue;
      const local = cockpit.toLocal(h.position, tmpV2);
      item.mesh.position.copy(local);
      item.mesh.rotation.set(0, 0, 0);
      const kind: NeedKind = item.kind === 'tablet' ? 'tablet' : 'hungry';
      if (this.needs.activeOf(kind)) showFor = kind;
      if (local.z > 0.06 && local.y > -0.75) {
        if (this.deliver(item, h)) {
          this.heldItems.delete(h);
          continue;
        }
      }
      if (!this.grabHeld(h)) {
        this.heldItems.delete(h);
        cockpit.returnItem(item, 0);
      }
    }
    cockpit.handoffMarker.visible = !!showFor;
    if (showFor) {
      const seat = showFor === 'tablet' ? PICKLE_SEAT : BEAN_SEAT;
      cockpit.handoffMarker.position.set(seat.x * 0.8 + (showFor === 'tablet' ? -0.15 : 0.05), -0.25, 0.25);
      cockpit.handoffMarker.lookAt(cockpit.group.localToWorld(tmpV.set(0, 0, 0)));
    }
  }

  private deliver(item: GrabItem, h: HandState): boolean {
    const kind: NeedKind = item.kind === 'tablet' ? 'tablet' : 'hungry';
    const r = this.needs.resolve(kind);
    if (!r) {
      if (this.t > this.noHintUntil) {
        this.noHintUntil = this.t + 6;
        this.card('Nobody asked for that', 'Yet.', 1.5);
      }
      return false;
    }
    this.cockpit?.returnItem(item, item.kind === 'tablet' ? 4 : 8);
    h.pulse(0.8, 80);
    this.kit.voice.sfx('confetti', null, 0.5);
    this.kit.voice.sayId(kind === 'tablet' ? 'drive_pickle_tablet_thanks' : 'drive_bean_yum', null);
    const kid = this.kids.find((k) => k.kid === r.need.kid);
    if (kid) kid.happy = 2.5;
    const at = h.position.clone();
    this.kit.fx.text(at, r.quick ? 'PARENT OF THE YEAR' : 'NEED MET', r.quick ? '#3fd6c8' : '#ffcc33');
    this.kit.fx.pop(at, new Color(0x3fd6c8), 16);
    return true;
  }

  /** Touching: hold a hand between the front seats for 2 s. */
  private updateBarrier(dt: number): void {
    const cockpit = this.cockpit;
    if (!cockpit) return;
    const need = this.needs.activeOf('touching');
    cockpit.barrierMarker.visible = !!need;
    if (!need) {
      this.barrierHold = 0;
      return;
    }
    let inside = false;
    for (const h of this.hands()) if (h.connected && cockpit.toLocal(h.position, tmpV).distanceTo(BARRIER_POINT) < 0.22) inside = true;
    this.barrierHold = inside ? this.barrierHold + dt : Math.max(0, this.barrierHold - dt * 2);
    const s = 1 + this.barrierHold * 0.6;
    cockpit.barrierMarker.scale.setScalar(s);
    if (inside && Math.floor(this.barrierHold * 4) !== Math.floor((this.barrierHold - dt) * 4)) for (const h of this.hands()) h.pulse(0.2, 15);
    if (this.barrierHold >= 2) {
      const r = this.needs.resolve('touching');
      this.barrierHold = 0;
      if (r) {
        this.card('Hmph.', 'Both kids go quiet.', 1.5);
        this.kit.fx.text(cockpit.group.localToWorld(BARRIER_POINT.clone()), r.quick ? 'PARENT OF THE YEAR' : 'ARM BARRIER', '#3fd6c8');
        for (const k of this.kids) k.happy = 1.5;
      }
    }
  }

  // ------------------------------------------------------------------------------------------------ events

  private onEvent(ev: DriveEvent): void {
    switch (ev.type) {
      case 'hazard': {
        const road = this.road;
        if (!road) return;
        this.stats.hazards++;
        const h = road.spawnHazard(ev.hazard, this.steering.offset, Math.max(6, this.speed));
        if (ev.hazard === 'pickup') {
          this.queueLine('drive_bean_truck', 0.8);
          this.queueLine('drive_pickle_brad', 3.2);
        }
        if (ev.hazard === 'deer' && this.gw) {
          const g = new DeerGremlin(this.gw, this.kit.avatars.create(this.kit.nextVariant(), 0.75), road.road);
          g.local.set(h.x, -1.38, h.z);
          g.begin();
          this.enemies.push(g);
          this.deer.push({ hazard: h, g });
        }
        break;
      }
      case 'clinger':
        for (const s of ev.spots) this.spawnClinger(s);
        if (!this.firsts.has('clinger')) {
          this.firsts.add('clinger');
          this.card('Gremlin on the hood!', 'Shoot it through the glass: the Dreamgate turned the windows to jelly.', 3.5);
        }
        break;
      case 'need': {
        if (ev.again) this.tabletAgain = true;
        const n = this.needs.start(ev.need);
        if (n && !this.firsts.has(`need-${ev.need}`)) {
          this.firsts.add(`need-${ev.need}`);
          const fam = this.ctx.save.data.family;
          if (ev.need === 'hungry') this.card(`${fam.kid2} is hungry`, 'Grab the snack bag from the cup holder and pass it back over your shoulder.', 5);
          if (ev.need === 'tablet') this.card(`${fam.kid1}'s tablet broke`, 'The spare is in the open glove box. Hand it back over your right shoulder.', 5);
          if (ev.need === 'touching') this.card(`${fam.kid2} is touching ${fam.kid1}`, 'Hold your arm between the front seats (teal ring) for 2 s.', 5);
        }
        break;
      }
      case 'pee':
        this.pee.start();
        this.onPeeLevel(1);
        break;
      case 'line':
        ev.ids.forEach((id, i) => this.queueLine(id, i * 2.6));
        break;
      case 'grandma':
        this.card('Grandma is calling', 'On speakerphone. Of course.', 2.5);
        this.queueLine('drive_pickle_hi_grandma', 0.5);
        this.queueLine('drive_grandma_bar', 3);
        this.queueLine('drive_parent_driving', 6.5);
        this.queueLine('drive_grandma_hands', 9);
        this.queueLine('drive_grandma_bye', 13);
        break;
      case 'boss':
        this.setPhase('boss');
        this.kit.status = 'Mr. Jingles';
        this.boss?.start();
        this.queueLine('drive_bean_truck', 2.5);
        this.queueLine('drive_pickle_ice_cream', 9);
        this.queueLine('drive_parent_no', 11.5);
        this.queueLine('drive_pickle_ice_cream', 30);
        break;
    }
  }

  private spawnClinger(spot: SpotName): void {
    const cockpit = this.cockpit, gw = this.gw;
    if (!cockpit || !gw) return;
    const clingers = this.enemies.filter((g): g is WindowClinger => g instanceof WindowClinger && g.alive);
    if (clingers.length >= 4) return;
    const taken = new Set(clingers.map((c) => c.spot));
    let s = spot;
    if (taken.has(s)) s = SPOT_ORDER.find((x) => !taken.has(x)) ?? spot;
    if (taken.has(s) && s !== 'dash') return;
    const c = new WindowClinger(gw, this.kit.avatars.create(this.kit.nextVariant(), SPOTS[s].height), cockpit.group, s);
    c.begin();
    this.enemies.push(c);
    if (s === 'dash') this.queueLine('drive_scamp_live_here', 1.2);
    else this.kit.voice.sayId('drive_clinger_let_me_in', c.root);
    if (Math.random() < 0.5) this.queueLine('drive_bean_hi', 2);
  }

  private updateDeer(): void {
    for (let i = this.deer.length - 1; i >= 0; i--) {
      const d = this.deer[i];
      if (d.g.alive && d.g.state !== 'boing') {
        d.g.local.set(d.hazard.x, -1.38, d.hazard.z - 0.3);
        d.g.place();
      }
      if (!d.g.alive && !d.hazard.done) {
        // Popped before it reached you.
        d.hazard.cancelled = true;
        d.hazard.done = true;
        this.stats.dodges++;
        this.queueLine('drive_pickle_deer', 1.5);
      }
      if (d.hazard.done || !d.g.alive) this.deer.splice(i, 1);
    }
  }

  private onHazardPassed(h: Hazard, hit: boolean, close: boolean): void {
    const cockpit = this.cockpit;
    if (!cockpit) return;
    const front = cockpit.group.localToWorld(tmpV.set(0.4, -0.1, -1.3));
    if (hit) {
      if (h.kind === 'deer') {
        const d = this.deer.find((x) => x.hazard === h);
        d?.g.boing();
        this.queueLine('drive_pickle_deer', 2);
      }
      this.hitCar(h.def.cost, h.def.label, h.kind !== 'potholes');
      this.kit.fx.text(front, h.kind === 'potholes' ? 'BUMP' : h.kind === 'mattress' ? 'FLOMP' : 'CLANG', '#ff9a3a');
      if (h.kind === 'potholes') this.kit.voice.sayId('drive_bean_bump', null);
      else this.queueLine(this.stats.dents % 2 ? 'drive_pickle_grandma_nicer' : 'drive_bean_uh_oh', 0.4);
    } else {
      this.stats.dodges++;
      if (close) this.stats.phews++;
      this.kit.fx.text(front, close ? 'PHEW +50' : '+50', '#3fd6c8');
    }
  }

  /** A hit on the car: patience, a crack, a haptic jolt. Never camera motion. */
  private hitCar(amount: number, source: string, crack: boolean): void {
    this.kit.damage(amount, source);
    this.stats.dents++;
    if (crack) this.cockpit?.addCrack();
    this.pulseBoth(0.9, 150);
    this.kit.voice.sfx('door_kick', null, 0.8);
  }

  private pulseBoth(intensity: number, ms: number): void {
    for (const h of this.hands()) h.pulse(intensity, ms);
  }

  private onNeedStage(n: Need, stage: NeedStage): void {
    const kid = this.kids.find((k) => k.kid === n.kid);
    const lines: Record<NeedKind, Partial<Record<NeedStage, string>>> = {
      tablet: { ask: this.tabletAgain ? 'drive_pickle_tablet_again' : 'drive_pickle_tablet_broke', whine: 'drive_pickle_tablet_whine', cry: 'drive_pickle_tablet_cry' },
      hungry: { ask: 'drive_bean_nack', whine: 'drive_bean_nack_whine', cry: 'drive_bean_hop_hurt' },
      touching: { ask: 'drive_pickle_touching', whine: 'drive_pickle_touching', cry: 'drive_pickle_touching_cry' },
    };
    const id = lines[n.kind][stage];
    if (id) this.kit.voice.sayId(id, kid?.root ?? null);
    if (stage === 'meltdown') this.meltdown(n);
    if (stage === 'resolved' || stage === 'failed') kid?.setNeed(this.pee.started && n.kid === 'pickle' ? 'pee' : null, null, 0);
  }

  /** 20 s ignored: both kids scream, audio is masked, a gremlin climbs over the seat onto the dashboard. */
  private meltdown(n: Need): void {
    this.kit.voice.sayId(n.kid === 'pickle' ? 'drive_pickle_waah' : 'drive_bean_waah', null);
    this.kit.voice.sayId(n.kid === 'pickle' ? 'drive_bean_waah' : 'drive_pickle_waah', null);
    this.kit.voice.muted = true;
    this.muteUntil = this.t + 5;
    this.queueLine('drive_parent_pull_over', 6.5);
    this.card('MELTDOWN', 'Something climbs out of the Dreamgate…', 2.5);
    this.spawnClinger('dash');
  }

  private onPeeLevel(level: number): void {
    const ids = ['drive_pickle_pee', 'drive_pickle_pee_bad', 'drive_pickle_pee_cry', 'drive_pickle_pee_frantic'];
    this.kit.voice.sayId(ids[Math.min(ids.length - 1, level - 1)], this.kids[0]?.root ?? null);
    if (level === 1) this.card(`${this.ctx.save.data.family.kid1} has to pee`, 'Nothing you can do from the driver’s seat. Just get home.', 4);
  }

  private queueLine(id: string, delay: number): void {
    this.lineQueue.push({ at: this.driveTime + delay, id });
  }

  private updateKids(dt: number): void {
    for (const k of this.kids) {
      const live = this.needs.live.find((n) => n.kid === k.kid);
      if (live) k.setNeed(live.kind, live.stage, live.fill);
      else if (k.kid === 'pickle' && this.pee.started && this.phase !== 'arrived') k.setNeed('pee', null, Math.min(1, this.pee.level / 4));
      else k.setNeed(null, null, 0);
      k.update(dt);
    }
  }

  // ------------------------------------------------------------------------------------------------ ending

  private beginHome(): void {
    if (this.phase === 'home' || this.phase === 'arrived' || this.phase === 'done') return;
    this.boss?.clear();
    this.setPhase('home');
    this.kit.status = 'Almost home';
    this.road?.spawnHome(58);
    this.steering.autopilot = LANE_WIDTH;
    this.card('Home street', 'The car knows the way. Hold on.', 3);
    this.queueLine('drive_parent_almost', 1);
    this.queueLine('drive_pickle_pee_frantic', 4);
  }

  /** Metres the home's driveway still has to come toward the car. */
  private homeRemaining(): number {
    const road = this.road;
    if (!road?.home) return Infinity;
    return -2 - road.homeZ();
  }

  private homeSpeed(): number {
    const rem = this.homeRemaining();
    if (!Number.isFinite(rem)) return 10;
    if (rem <= 0.15) return 0;
    return Math.max(0.8, Math.min(cruiseSpeed(this.driveTime), Math.sqrt(2 * 1.4 * rem)));
  }

  private arrive(): void {
    this.setPhase('arrived');
    this.speed = 0;
    this.steering.autopilot = null;
    this.needs.clear();
    for (const k of this.kids) k.sleep();
    this.kit.status = 'Home';
    this.card('Home.', `${this.ctx.save.data.family.kid2} plugged the Dreamgate into the car's USB port. It is glowing.`, 4.5);
  }

  private updateArrived(): void {
    if (this.phaseTime > 1 && this.phaseTime - this.lastTick <= 1 && !this.firsts.has('take-me')) {
      this.firsts.add('take-me');
      this.kit.voice.sayId('drive_narrator_take_me', this.cockpit?.dreamgate ?? null);
    }
    if (this.phaseTime > 3.5 && !this.firsts.has('home-bean')) {
      this.firsts.add('home-bean');
      this.kit.voice.sayId('drive_bean_home', null);
    }
    this.lastTick = this.phaseTime;
    if (this.phaseTime > 6) this.finish();
  }

  private finish(extra = false): void {
    if (this.completed) return;
    this.completed = true;
    this.setPhase('done');
    this.needs.clear();
    for (const g of this.enemies) if (g.alive) g.dispose();
    this.enemies = [];
    this.boss?.clear();
    const score = driveScore({
      pops: this.stats.popped,
      needsMet: this.needs.met,
      quickNeeds: this.needs.quick,
      meltdowns: this.needs.meltdowns,
      dodges: this.stats.dodges,
      dents: this.stats.dents,
      bossCracked: this.boss?.cracked ?? false,
    });
    this.ctx.complete({
      title: TITLE,
      pops: this.kit.progression.sessionPops,
      rank: driveRank(score),
      lines: [`Needs met: ${this.needs.met} of ${this.needs.total}`, `Dents: ${this.stats.dents}`, extra ? 'Nobody peed. Yet. (skipped)' : 'Nobody peed. Yet.'],
    });
  }

  // ------------------------------------------------------------------------------------------------ subtitles

  private card(title: string, sub: string, seconds: number): void {
    this.kit.hud.say(title, sub, seconds);
    this.cardBusyUntil = performance.now() + seconds * 800;
  }

  /** Voice subtitles with the Family Sheet names (TTS speaks generic lines). */
  private subtitle(text: string, speaker: string): void {
    if (speaker === 'ghost') return;
    const fam = this.ctx.save.data.family;
    const labels: Record<string, string> = {
      pickle: fam.kid1,
      bean: fam.kid2,
      parent: fam.parent === 'Hey' ? 'You (muttering)' : `${fam.parent} (muttering)`,
      grandma: 'Grandma (speakerphone)',
      jingles: 'Mr. Jingles',
      narrator: 'The Dreamgate',
      clinger: 'Window Clinger',
      scamp: 'Scamp',
    };
    // Back-seat chatter goes in the small strip low in the view, never the centre card over the road.
    this.kit.hud.subtitle(text, labels[speaker] ?? speaker);
  }

  // ------------------------------------------------------------------------------------------------ debug

  snapshot(): Record<string, unknown> {
    const anyNaN =
      !Number.isFinite(this.steering.offset) ||
      !Number.isFinite(this.road?.distance ?? 0) ||
      this.enemies.some((g) => !Number.isFinite(g.position.x) || !Number.isFinite(g.position.y) || !Number.isFinite(g.position.z));
    return {
      phase: this.phase,
      driveTime: Number(this.driveTime.toFixed(1)),
      speed: Number(this.speed.toFixed(1)),
      offset: Number(this.steering.offset.toFixed(2)),
      wheelDeg: Number(this.steering.wheelDeg.toFixed(1)),
      drifting: this.steering.drifting,
      enemiesSpawned: this.stats.spawned,
      enemiesPopped: this.stats.popped,
      alive: this.enemies.length,
      hazards: { spawned: this.stats.hazards, dodged: this.stats.dodges, dents: this.stats.dents, live: this.road?.hazards.length ?? 0 },
      needs: { met: this.needs.met, total: this.needs.total, meltdowns: this.needs.meltdowns, live: this.needs.live.map((n) => `${n.kind}:${n.stage}`) },
      pee: this.pee.level,
      boss: this.boss?.phase ?? 'none',
      patience: Math.round(this.kit?.patience ?? 0),
      cracks: this.cockpit?.cracks ?? 0,
      downs: this.downs,
      kids: this.kids.length,
      anyNaN,
    };
  }

  debugBegin(): void {
    if (this.phase === 'calibrate' || this.phase === 'intro') this.startDrive();
  }

  debugShootNearest(): boolean {
    const p = this.ctx.headPosition(new Vector3());
    const alive = this.enemies.filter((g) => g.alive);
    alive.sort((a, b) => a.position.distanceToSquared(p) - b.position.distanceToSquared(p));
    const g = alive[0];
    if (!g) return false;
    g.hit(99, false);
    return true;
  }

  debugFinish(): void {
    if (this.completed) return;
    this.timeline.skipAll();
    this.finish(true);
  }

  dispose(): void {
    for (const u of this.unsub) u();
    this.unsub.length = 0;
    for (const g of this.enemies) if (g.alive) g.dispose();
    this.enemies = [];
    this.boss?.dispose();
    this.synth?.dispose();
    for (const k of this.kids) k.dispose();
    this.kids.length = 0;
    this.road?.dispose();
    this.cockpit?.dispose();
    if (this.vignette) {
      this.ctx.camera.remove(this.vignette);
      (this.vignette.material as MeshBasicMaterial).map?.dispose();
      (this.vignette.material as MeshBasicMaterial).dispose();
      this.vignette.geometry.dispose();
      this.vignette = null;
    }
    if (this.ctx) {
      this.ctx.scene.fog = this.fogBefore;
      this.ctx.world.remove(this.rig);
    }
    if (this.kit) {
      this.kit.voice.muted = false;
      this.kit.dispose();
    }
  }
}
