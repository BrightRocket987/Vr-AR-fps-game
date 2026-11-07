import { AudioListener, Color, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GeoBuilder } from './Geo';
import { ROAD_Y } from './Cockpit';
import { LANE_WIDTH } from './Steering';
import type { GremlinWorld } from '../ai/Gremlin';
import { JinglesArm, JinglesCone } from './CarGremlins';
import type { Road } from './Road';

/** A tiny-speaker four-note jingle and warning beeps, synthesised locally with WebAudio oscillators. */
export class Synth {
  private readonly ctx: AudioContext;
  private readonly out: GainNode;

  constructor(listener: AudioListener) {
    this.ctx = listener.context;
    this.out = this.ctx.createGain();
    this.out.gain.value = 0.5;
    this.out.connect(listener.getInput());
  }

  private note(freq: number, start: number, dur: number, vol: number, type: OscillatorType, bandpass = 0): void {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    if (bandpass > 0) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = bandpass;
      f.Q.value = 1.4;
      o.connect(f);
      f.connect(g);
    } else o.connect(g);
    g.connect(this.out);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  /** The four notes, `rate` 1 = normal, `shift` in semitones. */
  jingle(vol: number, rate = 1, shift = 0): void {
    if (this.ctx.state !== 'running' || vol <= 0.001) return;
    const k = Math.pow(2, shift / 12);
    const notes = [784, 659, 523, 698];
    const step = 0.2 / rate;
    const t0 = this.ctx.currentTime + 0.02;
    notes.forEach((f, i) => this.note(f * k, t0 + i * step, step * 0.9, vol * 0.35, 'square', 1700));
  }

  /** Hazard tell: two short beeps. */
  beep(vol = 0.25): void {
    if (this.ctx.state !== 'running') return;
    const t0 = this.ctx.currentTime + 0.01;
    this.note(988, t0, 0.09, vol, 'sine');
    this.note(988, t0 + 0.13, 0.09, vol, 'sine');
  }

  dispose(): void {
    try {
      this.out.disconnect();
    } catch {
      /* ignore */
    }
  }
}

export type BossPhase = 'idle' | 'reveal' | 'cones' | 'flank' | 'overdrive' | 'swerve' | 'gone';

export interface BossHooks {
  say(id: string): void;
  sfx(name: string, volume?: number): void;
  hint(title: string, sub: string, seconds: number): void;
  damage(amount: number, source: string): void;
  confetti(at: Vector3, big: boolean): void;
  /** Register a new shootable enemy with the chapter. */
  adopt(g: JinglesArm | JinglesCone): void;
  carX(): number;
}

/**
 * Mr. Jingles, simplified: a driverless pastel ice cream truck. Reveal from behind, then it pulls ahead and lobs cones
 * into your lane (dodge), drops back alongside with gremlin arms waving from the serving window (shoot them), then
 * reverses at you with its giant roof cone exposed (40 hits). Cracked, it swerves into the hedge in a burst of confetti.
 */
export class MrJingles {
  readonly group = new Group();
  phase: BossPhase = 'idle';
  phaseTime = 0;
  total = 0;
  cone: JinglesCone | null = null;
  cracked = false;
  armsPopped = 0;
  private arms: JinglesArm[] = [];
  private armsSpawned = 0;
  private jingleTimer = 0;
  private throwTimer = 0;
  private bumpCooldown = 0;
  private x = -LANE_WIDTH;
  private z = 30;
  private vz = 0;
  private readonly mat: MeshStandardMaterial;
  private spin = 0;

  constructor(private readonly road: Road, private readonly w: GremlinWorld, private readonly synth: Synth, private readonly hooks: BossHooks) {
    const b = new GeoBuilder();
    b.box(2.3, 2.3, 4.2, 0xffc6dd, [0, ROAD_Y + 1.65, 0.6]);
    b.box(2.2, 1.5, 1.7, 0xbff0e0, [0, ROAD_Y + 1.15, -2.3]);
    b.box(2.0, 0.6, 0.05, 0x1b2230, [0, ROAD_Y + 1.6, -3.16]); // windshield: nobody at the wheel
    b.box(2.32, 0.25, 4.22, 0x7fd1b9, [0, ROAD_Y + 2.45, 0.6]);
    for (let i = 0; i < 6; i++) b.box(0.02, 0.35, 0.6, i % 2 ? 0xffffff : 0xff6fae, [1.16, ROAD_Y + 2.15, -1.2 + i * 0.6]);
    b.box(0.03, 0.9, 1.6, 0x1b1420, [1.16, ROAD_Y + 1.6, 0.4]); // the serving window (on its right side)
    b.box(0.03, 0.9, 1.6, 0x1b1420, [-1.16, ROAD_Y + 1.6, 0.4]);
    for (const wx of [-1.05, 1.05]) for (const wz of [-2.2, 1.9]) b.cyl(0.42, 0.42, 0.3, 0x111111, [wx, ROAD_Y + 0.42, wz], [0, 0, Math.PI / 2], 12);
    b.box(0.5, 0.18, 0.05, 0xffe066, [0, ROAD_Y + 0.75, -3.17]);
    b.cyl(0.08, 0.2, 0.3, 0xf4efe6, [0.6, ROAD_Y + 2.75, -1.5], [Math.PI / 2, 0, 0], 10); // the speaker horn
    this.mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: new Color(0x221018) });
    const body = new Mesh(b.build(), this.mat);
    this.group.add(body);
    this.group.visible = false;
    road.road.add(this.group);
  }

  get active(): boolean {
    return this.phase !== 'idle' && this.phase !== 'gone';
  }

  get done(): boolean {
    return this.phase === 'gone';
  }

  start(): void {
    if (this.phase !== 'idle') return;
    this.setPhase('reveal');
    this.group.visible = true;
    this.x = -LANE_WIDTH;
    this.z = 34;
    this.hooks.say('drive_jingles_ice_cream');
    this.hooks.hint('Mr. Jingles', 'A driverless ice cream truck followed you from the bar.', 3);
  }

  private setPhase(p: BossPhase): void {
    this.phase = p;
    this.phaseTime = 0;
  }

  /** Road-space position of the serving window / roof, for arms and the cone. */
  private anchorPoint(dx: number, dy: number, dz: number, out = new Vector3()): Vector3 {
    return out.set(this.x + dx, ROAD_Y + dy, this.z + dz);
  }

  update(dt: number, speed: number): void {
    if (!this.active) return;
    this.phaseTime += dt;
    this.total += dt;
    this.bumpCooldown = Math.max(0, this.bumpCooldown - dt);
    const carX = this.hooks.carX();
    // The jingle: louder when close, faster in overdrive.
    this.jingleTimer -= dt;
    if (this.jingleTimer <= 0) {
      const over = this.phase === 'overdrive';
      this.jingleTimer = over ? 1.3 : 2.4;
      const dist = Math.hypot(this.x - carX, this.z);
      this.synth.jingle(Math.max(0.15, Math.min(1, 12 / Math.max(4, dist))), over ? 2 : 1, over ? 5 : 0);
    }
    switch (this.phase) {
      case 'reveal': {
        // Creep up from behind in the left lane, overtake, settle 26 m ahead in the centre lane.
        this.z += (-1.9 - 0.25 * this.phaseTime) * dt * 4;
        if (this.z < -8) this.x += (0 - this.x) * Math.min(1, dt * 0.8);
        if (this.phaseTime > 2 && this.phaseTime - dt <= 2) this.hooks.say('drive_pickle_no_head');
        if (this.z <= -26) {
          this.z = -26;
          this.setPhase('cones');
          this.hooks.say('drive_jingles_hard_feelings');
          this.hooks.hint('Dodge the cones!', 'Mr. Jingles is throwing them into your lane.', 2.5);
          this.throwTimer = 1;
        }
        break;
      }
      case 'cones': {
        this.z = -26 + Math.sin(this.phaseTime * 0.7) * 2;
        this.x += (Math.sin(this.phaseTime * 0.4) * LANE_WIDTH - this.x) * Math.min(1, dt);
        this.throwTimer -= dt;
        if (this.throwTimer <= 0) {
          this.throwTimer = 3.6;
          const lane = Math.max(-1, Math.min(1, Math.round(carX / LANE_WIDTH)));
          this.road.throwCone(this.anchorPoint(0, 2.8, 0.5), lane, speed);
          this.hooks.sfx('thwip', 1);
        }
        if (this.phaseTime > 22) {
          this.setPhase('flank');
          this.hooks.say('drive_jingles_sprinkles');
          this.hooks.hint('Arms in the window!', 'Shoot the gremlin arms before they throw popsicles.', 3);
        }
        break;
      }
      case 'flank': {
        // Drop back alongside, one lane to the left of you (right if you hug the left edge).
        const side = carX < -LANE_WIDTH * 0.5 ? 1 : -1;
        const tx = carX + side * LANE_WIDTH;
        this.x += (tx - this.x) * Math.min(1, dt * 0.9);
        this.z += (-3.2 - this.z) * Math.min(1, dt * 0.6);
        this.group.rotation.y = side > 0 ? Math.PI : 0;
        this.arms = this.arms.filter((a) => a.alive);
        if (this.z > -9 && this.arms.length < 2 && this.armsSpawned < 6 && this.phaseTime > 2) {
          const arm = new JinglesArm(this.w, this.road.road);
          this.armsSpawned++;
          this.arms.push(arm);
          this.hooks.adopt(arm);
          if (this.armsSpawned === 1) this.hooks.say('drive_bean_hi');
        }
        for (let i = 0; i < this.arms.length; i++) {
          const a = this.arms[i];
          // The serving window faces the car.
          a.local.copy(this.anchorPoint(-side * 1.25, 1.9, -0.2 + i * 0.7));
          a.localYaw = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        }
        if ((this.armsSpawned >= 6 && this.arms.length === 0) || this.phaseTime > 30) {
          for (const a of this.arms) if (a.alive) a.dispose();
          this.arms = [];
          this.group.rotation.y = 0;
          this.setPhase('overdrive');
          this.cone = new JinglesCone(this.w, this.road.road);
          this.hooks.adopt(this.cone);
          this.hooks.say('drive_jingles_come_back');
          this.hooks.hint('Shoot the roof cone!', 'It takes 40 hits. The truck is reversing at you.', 3.5);
          this.vz = 0;
        }
        break;
      }
      case 'overdrive': {
        // Pull 30 m ahead, then reverse toward you weaving, until the cone cracks.
        const cone = this.cone;
        if (cone) {
          cone.local.copy(this.anchorPoint(0, 2.6, 0.6));
          if (!cone.alive) {
            this.cracked = true;
            this.cone = null;
            this.setPhase('swerve');
            this.hooks.say('drive_jingles_nice_night');
            this.hooks.sfx('confetti', 1);
            break;
          }
        }
        const cycle = this.phaseTime % 11;
        if (cycle < 3) this.vz = -6;
        else this.vz = 4.5;
        this.z = Math.max(-34, Math.min(-6, this.z + this.vz * dt));
        this.x += (carX + Math.sin(this.phaseTime * 1.3) * 1.2 - this.x) * Math.min(1, dt * 0.8);
        if (this.z >= -6.01 && this.bumpCooldown <= 0 && Math.abs(this.x - carX) < 2.2) {
          this.bumpCooldown = 4;
          this.hooks.damage(10, 'ice cream truck');
          this.hooks.sfx('door_kick', 1);
          this.z = -12;
        }
        if (this.phaseTime > 45) {
          // Out of jingle: it gives up anyway so the drive always ends.
          this.cone?.dispose();
          this.cone = null;
          this.setPhase('swerve');
          this.hooks.say('drive_jingles_nice_night');
        }
        break;
      }
      case 'swerve': {
        // Into the hedge on the left, spinning, confetti everywhere.
        this.x += -6 * dt;
        this.z += speed * dt * 0.6;
        this.spin += dt * 4;
        this.group.rotation.y = this.spin;
        if (this.phaseTime < 1.6 && Math.floor(this.phaseTime * 5) !== Math.floor((this.phaseTime - dt) * 5)) {
          this.hooks.confetti(this.road.roadToWorld(this.anchorPoint(0, 2, 0)), true);
        }
        if (this.phaseTime > 1.4 && this.phaseTime - dt <= 1.4) this.hooks.say('drive_pickle_didnt_want');
        if (this.phaseTime > 3) {
          this.group.visible = false;
          this.setPhase('gone');
        }
        break;
      }
    }
    this.group.position.set(this.x, 0, this.z);
  }

  /** Remove targets (debug finish, dispose). */
  clear(): void {
    for (const a of this.arms) if (a.alive) a.dispose();
    this.arms = [];
    if (this.cone?.alive) this.cone.dispose();
    this.cone = null;
  }

  dispose(): void {
    this.clear();
    this.group.removeFromParent();
    this.mat.dispose();
    for (const c of this.group.children) if (c instanceof Mesh) c.geometry.dispose();
  }
}
