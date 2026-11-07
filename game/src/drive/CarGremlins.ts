import {
  BufferGeometry,
  Color,
  Euler,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import { Gremlin, type GremlinOpts, type GremlinWorld } from '../ai/Gremlin';
import type { AnimName, Avatar } from '../ai/Avatar';
import { GeoBuilder } from './Geo';
import { ROAD_Y } from './Cockpit';
import type { SpotName } from './Timeline';

const q = new Quaternion();
const e = new Euler();

/**
 * A gremlin that lives on the moving car or the scrolling road. Its logical position is `local` in the frame of
 * `anchor` (the cockpit or the road group); every tick it is converted to world space, because the weapon hit-tests
 * against `root.position` in world coordinates.
 */
export abstract class CarGremlin extends Gremlin {
  readonly local = new Vector3();
  localYaw = 0;

  constructor(w: GremlinWorld, avatar: Avatar, opts: GremlinOpts, protected anchor: Object3D) {
    super(w, avatar, opts);
  }

  place(): void {
    this.anchor.updateWorldMatrix(true, false);
    this.root.position.copy(this.local).applyMatrix4(this.anchor.matrixWorld);
    this.anchor.getWorldQuaternion(q);
    e.setFromQuaternion(q, 'YXZ');
    this.yaw = e.y + this.localYaw;
    this.root.rotation.y = this.yaw;
  }

  /** Called by the chapter right after construction. */
  begin(): void {
    this.place();
    this.setState('spawn');
    this.w.bus.emit('enemy:spawned', { id: this.id, type: this.type });
  }
}

export interface Spot {
  pos: Vector3;
  yaw: number;
  from: Vector3;
  height: number;
}

/** Where window gremlins land (cockpit frame) and where they leap from. */
export const SPOTS: Record<SpotName, Spot> = {
  hood: { pos: new Vector3(0.45, -0.55, -1.65), yaw: 0, from: new Vector3(0.9, ROAD_Y, -7), height: 0.55 },
  shieldL: { pos: new Vector3(-0.15, -0.52, -1.05), yaw: 0, from: new Vector3(-1.4, ROAD_Y, -6), height: 0.5 },
  shieldR: { pos: new Vector3(0.85, -0.52, -1.05), yaw: 0, from: new Vector3(2.4, ROAD_Y, -6), height: 0.5 },
  left: { pos: new Vector3(-0.72, -0.5, -0.12), yaw: Math.PI / 2, from: new Vector3(-3, ROAD_Y, -4), height: 0.5 },
  right: { pos: new Vector3(1.52, -0.5, -0.15), yaw: -Math.PI / 2, from: new Vector3(3.8, ROAD_Y, -4), height: 0.5 },
  dash: { pos: new Vector3(0.3, -0.29, -0.74), yaw: 0, from: new Vector3(0.9, -0.4, 0.95), height: 0.4 },
};

/**
 * Window Clinger: leaps from the road onto the hood or a window (or, after a meltdown, over the back seat onto the
 * dashboard), presses its face to the glass, then pounds it every 1.6 s (2 Patience) until it is popped.
 */
export class WindowClinger extends CarGremlin {
  readonly type = 'window-clinger';
  readonly speaker: string;
  private readonly from = new Vector3();
  private poundTimer = 0;

  constructor(w: GremlinWorld, avatar: Avatar, anchor: Object3D, readonly spot: SpotName) {
    super(w, avatar, { hp: 2, speed: 0, height: SPOTS[spot].height, color: new Color(spot === 'dash' ? 0xe5443a : 0x7fd1b9), xp: 10, radius: 0.2 }, anchor);
    this.speaker = spot === 'dash' ? 'scamp' : 'clinger';
    const s = SPOTS[spot];
    this.from.copy(s.from);
    this.local.copy(s.from);
    this.localYaw = s.yaw;
  }

  get onGlass(): boolean {
    return this.state === 'cling' || this.state === 'pound';
  }

  protected override onState(s: string): void {
    switch (s) {
      case 'spawn':
        this.avatar.play('jump', 0.05);
        break;
      case 'cling':
        this.avatar.play('idle');
        this.w.voice.sfx('knock', this.root, 0.7);
        break;
      case 'pound':
        this.avatar.play('attack', 0.05, true);
        break;
    }
  }

  protected tick(dt: number): void {
    const s = SPOTS[this.spot];
    switch (this.state) {
      case 'spawn': {
        const k = Math.min(1, this.stateTime / 0.9);
        this.local.lerpVectors(this.from, s.pos, k);
        this.local.y += Math.sin(k * Math.PI) * (this.spot === 'dash' ? 0.45 : 1.1);
        if (k >= 1) this.setState('cling');
        break;
      }
      case 'cling': {
        this.local.copy(s.pos);
        this.local.y += Math.abs(Math.sin(this.stateTime * 5)) * 0.02;
        if (this.stateTime > 2.5) this.setState('pound');
        break;
      }
      case 'pound': {
        this.local.copy(s.pos);
        this.poundTimer -= dt;
        if (this.poundTimer <= 0) {
          this.poundTimer = 1.6;
          this.avatar.play('attack', 0.05, true);
          this.w.voice.sfx('knock', this.root, 1);
          this.w.player.damage(2, this.type);
          this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: 2 });
          if (Math.random() < 0.3) this.say(undefined, 6);
        }
        break;
      }
    }
    this.place();
  }
}

/** A deer-shaped gremlin (antlers, a little cape) frozen in the headlights. Pop it, or swerve; hit it and it boings over the car. */
export class DeerGremlin extends CarGremlin {
  readonly type = 'deer';
  readonly speaker = 'scamp';
  private readonly extras: Mesh;
  private boingFrom = new Vector3();

  constructor(w: GremlinWorld, avatar: Avatar, roadGroup: Object3D) {
    super(w, avatar, { hp: 2, speed: 0, height: 0.75, color: new Color(0xc98a4b), xp: 15, radius: 0.25 }, roadGroup);
    const b = new GeoBuilder();
    for (const s of [-1, 1]) {
      b.beam([s * 0.06, 0.7, 0], [s * 0.2, 0.92, 0], 0.025, 0x8a5a2b);
      b.beam([s * 0.15, 0.84, 0], [s * 0.26, 0.86, 0.05], 0.02, 0x8a5a2b);
      b.beam([s * 0.18, 0.88, 0], [s * 0.16, 1.0, -0.02], 0.02, 0x8a5a2b);
    }
    b.box(0.32, 0.36, 0.03, 0xe5443a, [0, 0.36, -0.12], [0.15, 0, 0]);
    b.sphere(0.03, 0xffee55, [-0.06, 0.62, 0.15]);
    b.sphere(0.03, 0xffee55, [0.06, 0.62, 0.15]);
    this.extras = new Mesh(b.build(), new MeshStandardMaterial({ vertexColors: true, roughness: 0.7, emissive: 0x332200 }));
    avatar.root.add(this.extras);
  }

  protected override onState(s: string): void {
    if (s === 'spawn') this.avatar.play('idle');
    if (s === 'boing') this.avatar.play('jump', 0.05, true);
  }

  boing(): void {
    if (this.state === 'boing' || !this.alive) return;
    this.boingFrom.copy(this.local);
    this.setState('boing');
    this.w.voice.sfx('squeak_inflate', this.root, 1);
  }

  protected tick(_dt: number): void {
    if (this.state === 'boing') {
      // Jump over the car (a 2.5 m arc), then trot off into the night.
      const k = Math.min(1, this.stateTime / 1.1);
      this.local.copy(this.boingFrom);
      this.local.y += Math.sin(k * Math.PI) * 2.6;
      this.local.x += k * 4;
      if (k >= 1) this.dispose();
    }
    if (this.alive) this.place();
  }

  override dispose(): void {
    super.dispose();
    this.extras.geometry.dispose();
    (this.extras.material as Material).dispose();
  }
}

/** A gremlin arm waving out of Mr. Jingles' serving window; throws a popsicle after 4 s if nobody pops it. */
export class JinglesArm extends CarGremlin {
  readonly type = 'jingles-arm';
  readonly speaker = 'clinger';
  thrown = false;

  constructor(w: GremlinWorld, roadGroup: Object3D) {
    super(w, new SimpleAvatar(armGeometry(), 0.6), { hp: 2, speed: 0, height: 0.6, color: new Color(0xa6d96a), xp: 10, radius: 0.22 }, roadGroup);
  }

  protected override onState(_s: string): void {}

  protected tick(dt: number): void {
    // Wave.
    this.avatar.root.rotation.z = Math.sin(this.stateTime * 7) * 0.45;
    const grow = Math.min(1, this.stateTime / 0.3);
    this.avatar.root.scale.setScalar(Math.max(0.05, grow));
    if (!this.thrown && this.stateTime > 4) {
      this.thrown = true;
      this.w.voice.sfx('diaper_plap', this.root, 1);
      this.w.player.damage(2, 'popsicle');
      this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: 2 });
    }
    if (this.stateTime > 4.6) this.dispose();
    if (this.alive) this.place();
    void dt;
  }
}

/** The giant roof cone: 40 hits. Headshots count once (no double damage) so it is always 40 darts. */
export class JinglesCone extends CarGremlin {
  readonly type = 'jingles-cone';
  readonly speaker = 'ghost';

  constructor(w: GremlinWorld, roadGroup: Object3D) {
    super(w, new SimpleAvatar(coneGeometry(), 1.6), { hp: 40, speed: 0, height: 1.6, color: new Color(0xff9ad5), xp: 500, radius: 0.55 }, roadGroup);
  }

  override hit(damage: number, _headshot: boolean, style: string[] = []): boolean {
    return super.hit(damage, false, style);
  }

  protected override onState(_s: string): void {}

  protected tick(_dt: number): void {
    // Wobble harder as it cracks.
    const hurt = 1 - this.hp / this.maxHp;
    this.avatar.root.rotation.z = Math.sin(this.stateTime * (3 + hurt * 10)) * (0.05 + hurt * 0.15);
    this.place();
  }
}

/** A one-mesh, vertex-coloured, animation-less Avatar for props that are targets. */
export class SimpleAvatar implements Avatar {
  readonly root = new Group();
  readonly kind = 'procedural' as const;
  private readonly mat: MeshStandardMaterial;
  private readonly mesh: Mesh;

  constructor(geo: BufferGeometry, readonly height: number) {
    this.mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
    this.mesh = new Mesh(geo, this.mat);
    this.root.add(this.mesh);
  }

  play(_name: AnimName): void {}
  update(_dt: number): void {}

  setTint(color: Color | null): void {
    this.mat.color.set(0xffffff);
    if (color) this.mat.color.multiply(color);
  }

  setStretch(s: number): void {
    this.mesh.scale.set(1, s, 1);
  }

  dispose(): void {
    this.mat.dispose();
    this.mesh.geometry.dispose();
  }
}

function armGeometry(): BufferGeometry {
  const b = new GeoBuilder();
  b.cyl(0.05, 0.065, 0.45, 0xa6d96a, [0, 0.22, 0]);
  b.sphere(0.09, 0xa6d96a, [0, 0.5, 0]);
  for (const a of [-0.5, 0, 0.5]) b.cyl(0.018, 0.018, 0.1, 0x8cc04f, [Math.sin(a) * 0.08, 0.6, 0], [0, 0, -a]);
  b.box(0.06, 0.16, 0.03, 0xff5ab0, [0.09, 0.56, 0]); // the popsicle
  b.box(0.012, 0.07, 0.012, 0xe6d3a3, [0.09, 0.45, 0]);
  return b.build();
}

function coneGeometry(): BufferGeometry {
  const b = new GeoBuilder();
  b.cone(0.42, 1.0, 0xd9a05b, [0, 0.5, 0], [Math.PI, 0, 0], 14);
  b.sphere(0.5, 0xfff1f5, [0, 1.05, 0], [1, 0.75, 1], 14);
  b.sphere(0.38, 0xff9ad5, [0, 1.32, 0], [1, 0.8, 1], 12);
  b.cone(0.2, 0.3, 0xffd1e6, [0, 1.58, 0], [0, 0, 0], 10);
  b.sphere(0.08, 0xe5443a, [0, 1.76, 0]);
  return b.build();
}
