import {
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  Plane,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Gremlin, type GremlinWorld, type VoiceLike } from './Gremlin';
import type { AnimName, Avatar } from './Avatar';
import type { Door, RoomModel } from '../room/RoomModel';

// ---- tuning (docs/04 §13, docs/01 Boss C) ---------------------------------------------------------------
export const BIGBEAN_HP = 160;
/** Grabby ends at this HP (50 HP of arm sweeps). */
export const GRABBY_END_HP = 110;
/** Demand ends at this HP, or when its ring resolves (stun over, or expired). */
export const DEMAND_END_HP = 60;
export const GRAB_TELL = 2.5;
export const GRAB_SWEEP = 0.7;
export const GRAB_DAMAGE = 8;
export const GRAB_COOLDOWN = 2.2;
/** The sweep covers one half of the room plus this much (rad) past the door's centre line. */
export const SWEEP_OVERLAP = (10 * Math.PI) / 180;
export const SWEEP_REACH = 3.5;
export const DEMAND_RING = 20;
export const DEMAND_STINKYS = 4;
export const CHANGE_RING_CUT = 5;
export const CHANGE_DAMAGE = 10;
export const STUN_SECONDS = 6;
export const RING_CLOUD = { radius: 2.4, seconds: 6, fireRatePenalty: 0.3 } as const;
export const SLAP_TELL = 1.5;
export const SLAP_DAMAGE = 10;
/** Stand farther than this from the slap point and the shockwave cannot reach you. */
export const SLAP_SAFE_DIST = 2.5;
export const SHOCK_SPEED = 3;
export const TANTRUM_COOLDOWN = 2.6;
/** Weak point (head and pacifier), and every hit while he is stunned. */
export const WEAK_MULT = 3;
/** Nothing of him comes farther than this through the door plane (front of the head). */
export const MAX_POKE = 0.8;
/** No part of him ever comes closer than this to the player's head (horizontal). */
export const MIN_PLAYER_GAP = 1.2;
export const HEAD_R = 0.42;
export const HEAD_Y = 1.3;
export const BIGBEAN_HEIGHT = 2.4;
/** Head-centre intrusion range: fully behind the plane (hidden) .. the 0.8 m poke limit. */
export const MIN_INTRUSION = -(HEAD_R + 0.15);
export const MAX_INTRUSION = MAX_POKE - HEAD_R;

export type BossPhase = 'grabby' | 'demand' | 'tantrum' | 'defeated';
type Move = 'emerge' | 'idle' | 'tell' | 'sweep' | 'slaptell' | 'slap' | 'stun';

// ---- pure helpers (unit-tested) ----------------------------------------------------------------------------

export interface DoorLocal {
  /** Metres in front of the door plane (into the room). */
  along: number;
  /** Metres to the right of the door centre, as seen from inside the room facing the door (= up × normal). */
  lateral: number;
}

export function doorLocal(door: Pick<Door, 'center' | 'normal'>, p: Vector3, out: DoorLocal = { along: 0, lateral: 0 }): DoorLocal {
  const dx = p.x - door.center.x;
  const dz = p.z - door.center.z;
  out.along = dx * door.normal.x + dz * door.normal.z;
  out.lateral = dx * door.normal.z - dz * door.normal.x;
  return out;
}

/** How far the head centre may come through the plane so his head stays MIN_PLAYER_GAP from the player's. */
export function allowedIntrusion(along: number, lateral: number): number {
  const need = MIN_PLAYER_GAP + HEAD_R;
  const room = along - Math.sqrt(Math.max(0, need * need - lateral * lateral));
  return Math.max(MIN_INTRUSION, Math.min(MAX_INTRUSION, room));
}

/** Arm length that keeps the hand MIN_PLAYER_GAP (+ hand radius) from the player. */
export function allowedArmLength(shoulderToPlayer: number, wanted: number): number {
  return Math.max(0.25, Math.min(wanted, shoulderToPlayer - MIN_PLAYER_GAP - 0.16));
}

/** Is a door-local point inside the Grabby sweep on `side` (+1 = lateral > 0 half of the room)? */
export function inSweepZone(along: number, lateral: number, side: 1 | -1, reach = SWEEP_REACH): boolean {
  if (along <= 0) return false;
  if (Math.hypot(along, lateral) > reach) return false;
  return Math.atan2(lateral, along) * side >= -SWEEP_OVERLAP;
}

/** The shockwave's reach: 2.5 m, less in a shallow room so there is always somewhere safe to stand. */
export function shockReach(farthestFloor: number): number {
  return Math.max(1.4, Math.min(SLAP_SAFE_DIST, farthestFloor - 0.8));
}

/** Did the ring front pass the player this frame (and the player is inside its reach)? */
export function shockHits(radiusBefore: number, radiusAfter: number, playerDist: number, reach: number): boolean {
  return playerDist <= reach && playerDist > radiusBefore && playerDist <= radiusAfter;
}

/** Phase after damage / ring events. Applied repeatedly so a huge hit can skip a phase. */
export function nextPhase(phase: BossPhase, hp: number, demandResolved: boolean): BossPhase {
  if (phase === 'defeated' || hp <= 0) return 'defeated';
  if (phase === 'grabby' && hp <= GRABBY_END_HP) return 'demand';
  if (phase === 'demand' && (hp <= DEMAND_END_HP || demandResolved)) return 'tantrum';
  return phase;
}

/** Floor points for the Demand Stinkys: spread across the front of the door, ≥ 1 m from the player, in open floor. */
export function stinkySpots(room: RoomModel, door: Pick<Door, 'center' | 'normal'>, player: Vector3, count = DEMAND_STINKYS): Vector3[] {
  const right = new Vector3(door.normal.z, 0, -door.normal.x);
  const out: Vector3[] = [];
  const laterals = [-0.9, 0.9, -0.35, 0.35, -1.4, 1.4];
  for (const along of [0.9, 1.3, 0.6, 1.7]) {
    for (const lat of laterals) {
      if (out.length >= count) return out;
      const p = new Vector3(door.center.x, room.floorY, door.center.z).addScaledVector(door.normal, along).addScaledVector(right, lat);
      if (!room.contains(p.x, p.z) || room.blockedAt(p.x, p.z, 0.2)) continue;
      if (Math.hypot(p.x - player.x, p.z - player.z) < 1.0) continue;
      if (out.some((q) => q.distanceTo(p) < 0.45)) continue;
      out.push(p);
    }
  }
  while (out.length < count) out.push(new Vector3(door.center.x, room.floorY, door.center.z).addScaledVector(door.normal, 0.5));
  return out;
}

// ---- the body (a procedural Avatar: everything clipped at the door plane) -----------------------------------

const SKIN = new Color(0xf2c6a0);
const ONESIE = new Color(0x7fd1b9);
const tmp = new Vector3();
const tmp2 = new Vector3();
const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpS = new Vector3();
const Y = new Vector3(0, 1, 0);

function colored(g: BufferGeometry, color: Color): BufferGeometry {
  const n = g.getAttribute('position').count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = color.r;
    a[i * 3 + 1] = color.g;
    a[i * 3 + 2] = color.b;
  }
  g.setAttribute('color', new Float32BufferAttribute(a, 3));
  return g;
}

function sphere(r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, seg = 12): BufferGeometry {
  return new SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.75))).scale(sx, sy, sz).translate(x, y, z);
}

/**
 * Big Bean's body. Local frame = the door's: +x lateral (right as seen from the room), +y up from the floor, +z into
 * the room. One clip plane at the door hides everything behind it, so only what pokes through is drawn: the head
 * (skin + face: 2 draw calls), the wedged shoulders (1) and two arms (2 instanced meshes). Unlit face details.
 */
class BigBeanBody implements Avatar {
  readonly root = new Group();
  readonly height = BIGBEAN_HEIGHT;
  readonly kind = 'procedural' as const;
  readonly head = new Group();
  readonly clip: Plane;
  /** Head-centre distance in front of the door plane (smoothed). */
  intrusion = MIN_INTRUSION;
  private readonly skinMat: MeshStandardMaterial;
  private readonly onesieMat: MeshStandardMaterial;
  private readonly faceMat: MeshBasicMaterial;
  private readonly torso: Mesh;
  private readonly faceAwake: Mesh;
  private readonly faceAsleep: Mesh;
  readonly arms: InstancedMesh;
  readonly hands: InstancedMesh;
  private readonly geos: BufferGeometry[] = [];
  private t = 0;
  private stretch = 1;
  breath = 1;

  constructor(door: Door) {
    // Clip on the room side of the door plane (1 cm proud so the frame's shimmer never z-fights the cut).
    this.clip = new Plane().setFromNormalAndCoplanarPoint(door.normal.clone().setY(0).normalize(), door.center.clone().addScaledVector(door.normal, 0.01));
    const clipping = [this.clip];
    this.skinMat = new MeshStandardMaterial({ color: SKIN, roughness: 0.75, clippingPlanes: clipping });
    this.onesieMat = new MeshStandardMaterial({ color: ONESIE, roughness: 0.9, side: DoubleSide, clippingPlanes: clipping });
    this.faceMat = new MeshBasicMaterial({ vertexColors: true, clippingPlanes: clipping });

    // Head: skull, ears, a curl of hair.
    const headGeo = mergeGeometries([
      sphere(HEAD_R, 0, 0, 0, 1, 0.95, 1, 22),
      sphere(0.1, -0.41, 0.02, -0.03, 0.55, 1, 1),
      sphere(0.1, 0.41, 0.02, -0.03, 0.55, 1, 1),
      sphere(0.07, 0, 0.41, 0.06),
      sphere(0.055, 0.07, 0.44, 0.01),
    ]);
    const headMesh = new Mesh(headGeo, this.skinMat);
    // Face: eyes, pupils, cheeks, the pacifier (his weak point).
    const white = new Color(0xffffff), dark = new Color(0x1c1830), pink = new Color(0xff8fa8), teal = new Color(0x3fd6c8), tealDark = new Color(0x1f8f86);
    const pacifier = [
      colored(new CylinderGeometry(0.13, 0.13, 0.035, 18).rotateX(Math.PI / 2).translate(0, -0.17, 0.41), teal),
      colored(new TorusGeometry(0.065, 0.022, 8, 16).translate(0, -0.17, 0.45), tealDark),
    ];
    const awakeGeo = mergeGeometries([
      colored(sphere(0.085, -0.15, 0.09, 0.355, 1, 1, 0.55), white),
      colored(sphere(0.085, 0.15, 0.09, 0.355, 1, 1, 0.55), white),
      colored(sphere(0.045, -0.15, 0.09, 0.4, 1, 1, 0.6), dark),
      colored(sphere(0.045, 0.15, 0.09, 0.4, 1, 1, 0.6), dark),
      colored(sphere(0.07, -0.26, -0.08, 0.31, 1, 0.7, 0.35), pink),
      colored(sphere(0.07, 0.26, -0.08, 0.31, 1, 0.7, 0.35), pink),
      ...pacifier,
    ]);
    const asleepGeo = mergeGeometries([
      colored(sphere(0.08, -0.15, 0.08, 0.37, 1, 0.18, 0.5), dark),
      colored(sphere(0.08, 0.15, 0.08, 0.37, 1, 0.18, 0.5), dark),
      colored(sphere(0.07, -0.26, -0.08, 0.31, 1, 0.7, 0.35), pink),
      colored(sphere(0.07, 0.26, -0.08, 0.31, 1, 0.7, 0.35), pink),
      ...pacifier.map((g) => g.clone()),
    ]);
    this.faceAwake = new Mesh(awakeGeo, this.faceMat);
    this.faceAsleep = new Mesh(asleepGeo, this.faceMat);
    this.faceAsleep.visible = false;
    this.head.add(headMesh, this.faceAwake, this.faceAsleep);
    this.head.position.set(0, HEAD_Y, this.intrusion);

    // Shoulders wider than the frame (that is why he is stuck): the front cap pokes 18 cm through the plane and its
    // cut outline is ~1.6x the door width, so the onesie visibly bulges past both jambs.
    const half = Math.max(0.6, door.width * 0.8);
    const torsoGeo = sphere(1, 0, 0, 0, half / 0.9, 0.62, 0.3, 24);
    this.torso = new Mesh(torsoGeo, this.onesieMat);
    this.torso.position.set(0, 0.86, -0.12);

    // Arms and mitten hands, one instance per side (0 = -x, 1 = +x).
    const armGeo = new CylinderGeometry(0.1, 0.13, 1, 10).translate(0, 0.5, 0);
    this.arms = new InstancedMesh(armGeo, this.skinMat, 2);
    const handGeo = new SphereGeometry(0.16, 12, 9);
    this.hands = new InstancedMesh(handGeo, this.skinMat, 2);
    this.arms.frustumCulled = false;
    this.hands.frustumCulled = false;
    for (const m of [headMesh, this.faceAwake, this.faceAsleep, this.torso]) m.frustumCulled = false;
    this.geos.push(headGeo, awakeGeo, asleepGeo, torsoGeo, armGeo, handGeo);
    this.root.add(this.head, this.torso, this.arms, this.hands);
    this.shoulderX = half - 0.05;
    for (let i = 0; i < 2; i++) this.setArm(i, tmp.set(i === 0 ? -0.3 : 0.3, -0.6, 0.75).normalize(), 0.55);
  }

  readonly shoulderX: number;

  /** Local shoulder position of arm i. */
  shoulder(i: number, out: Vector3): Vector3 {
    return out.set(i === 0 ? -this.shoulderX : this.shoulderX, 1.0, 0.02);
  }

  /** Point arm i along a local direction with a length (the hand sits at the end). */
  setArm(i: number, dirLocal: Vector3, length: number): void {
    const s = this.shoulder(i, tmp2);
    tmpQ.setFromUnitVectors(Y, dirLocal);
    tmpS.set(1, Math.max(0.05, length), 1);
    tmpM.compose(s, tmpQ, tmpS);
    this.arms.setMatrixAt(i, tmpM);
    tmpS.set(1, 1, 1);
    tmpM.compose(s.addScaledVector(dirLocal, length), tmpQ, tmpS);
    this.hands.setMatrixAt(i, tmpM);
    this.arms.instanceMatrix.needsUpdate = true;
    this.hands.instanceMatrix.needsUpdate = true;
  }

  setArmsVisible(v: boolean): void {
    this.arms.visible = v;
    this.hands.visible = v;
  }

  setAsleep(v: boolean): void {
    this.faceAwake.visible = !v;
    this.faceAsleep.visible = v;
  }

  /** World centre of the head. */
  headWorld(out: Vector3): Vector3 {
    return this.head.getWorldPosition(out);
  }

  play(_name: AnimName): void {
    /* poses are driven by BigBean */
  }

  update(dt: number): void {
    this.t += dt;
    this.breath = 1 + Math.sin(this.t * 1.6) * 0.025;
    this.torso.scale.set(1, this.breath, 1);
    this.head.position.z = this.intrusion;
    this.head.scale.set(1, this.stretch, 1);
  }

  setTint(color: Color | null): void {
    this.skinMat.color.copy(SKIN);
    this.onesieMat.color.copy(ONESIE);
    if (color) {
      this.skinMat.color.multiply(color);
      this.onesieMat.color.multiply(color);
    }
  }

  setStretch(s: number): void {
    this.stretch = s;
    this.head.scale.set(s, s, s);
  }

  dispose(): void {
    for (const g of this.geos) g.dispose();
    this.skinMat.dispose();
    this.onesieMat.dispose();
    this.faceMat.dispose();
    this.arms.dispose();
    this.hands.dispose();
  }
}

type SayIdVoice = VoiceLike & { sayId?: (id: string, at: Object3D | null) => void };

const RING_SEGMENTS = 48;
const RING_GEO = new RingGeometry(0.2, 0.27, RING_SEGMENTS);
const RING_BG_GEO = new RingGeometry(0.185, 0.285, RING_SEGMENTS);
const BAR_GEO = new PlaneGeometry(1, 1).translate(0.5, 0, 0);
const BAR_W = 1.1;

/**
 * Boss C · Big Bean, "Big {KID2}". A 2.4 m Bean wedged in the largest open portal door: only his head, the
 * shoulders that do not fit and his arms come through (everything behind the door plane is clipped). HP 160.
 *  GRABBY  (160→110): a 2.5 s tell ("GIMME.") lights the half of the room he will sweep; the arm swings across at
 *          1 m; 8 if your head is in it. Step sideways to the other half.
 *  DEMAND  (110→60): "CHANGE. MY. DIAPER." A shared 20 s ring over his head; four Stinkys waddle in. Every Stinky
 *          changed with the Wipe cuts the ring by 5 s and deals him 10; all four stun him 6 s (every hit counts 3x);
 *          an expired ring fogs the room green for 6 s.
 *  TANTRUM (60→0): floor slaps (1.5 s tell, arms up, the safe line glows); a shockwave rolls along the floor and
 *          hits for 10 unless you stand more than 2.5 m from the door. The chapter adds Breacher knocks.
 * The head (and its pacifier) is the weak point (3x). He keeps his head 1.2 m from yours (ducks back through the
 * door when you come close) and never pokes more than 0.8 m into the room. At 0 HP: "Night night.", the biggest
 * confetti in the game, he slides back through the door, then a normal pop event (type 'bigbean').
 *
 * Needs `renderer.localClippingEnabled = true` (the chapter sets it). About 9 draw calls (11 with ring + telegraph).
 */
export class BigBean extends Gremlin {
  readonly type = 'bigbean';
  readonly speaker = 'bigbean';
  readonly door: Door;
  phase: BossPhase = 'grabby';
  /** Shared diaper ring (s) while `ringActive`. */
  ringLeft = DEMAND_RING;
  ringActive = false;
  /** Stinkys changed during this Demand. */
  changed = 0;
  stunned = false;
  /** The grabby sweep's side (+1/-1) while telling or sweeping. */
  sweepSide: 1 | -1 = 1;
  /** Damage dealt to the player (tests + stats). */
  dealt = 0;
  private readonly body: BigBeanBody;
  private move: Move = 'emerge';
  private moveT = 0;
  private moveTimer = 0;
  private swept = false;
  private demandResolved = false;
  private toSpawn: Vector3[] = [];
  private spawnTimer = 0;
  private shockR = 0;
  private readonly reach: number;
  private flashT = 0;
  private defeatT = 0;
  private confettiT = 0;
  private finalPopped = false;
  private sayCycle = 0;
  private starT = 0;
  private readonly unsub: Array<() => void> = [];
  private readonly local: DoorLocal = { along: 0, lateral: 0 };
  // Overlays (not clipped): sweep telegraph, shockwave, diaper ring, HP bar.
  private readonly sweepMesh: Mesh;
  private readonly sweepGeos: [CircleGeometry, CircleGeometry];
  private readonly sweepMat: MeshBasicMaterial;
  private readonly shockMesh: Mesh;
  private readonly shockGeo: RingGeometry;
  private readonly shockMat: MeshBasicMaterial;
  private readonly ringGroup = new Group();
  private readonly ringMesh: Mesh;
  private readonly ringMat: MeshBasicMaterial;
  private readonly ringBgMat: MeshBasicMaterial;
  private readonly bar = new Group();
  private readonly barFill: Mesh;
  private readonly barMats: MeshBasicMaterial[];

  constructor(w: GremlinWorld, door: Door) {
    super(w, new BigBeanBody(door), { hp: BIGBEAN_HP, speed: 0, height: BIGBEAN_HEIGHT, color: ONESIE.clone(), xp: 300, radius: 0.6 });
    this.body = this.avatar as BigBeanBody;
    this.door = door;
    let far = 0;
    const floor = new Vector3(door.center.x, w.room.floorY, door.center.z);
    for (const b of w.room.bounds) far = Math.max(far, Math.hypot(b.x - floor.x, b.y - floor.z));
    this.reach = shockReach(far > 0 ? far : 4);

    // Sweep telegraph: a floor sector per side (local XZ; circle +x = lateral, -y → +z after the -90° X turn).
    const span = Math.PI / 2 + SWEEP_OVERLAP;
    this.sweepGeos = [
      new CircleGeometry(SWEEP_REACH, 28, Math.PI, span).rotateX(-Math.PI / 2), // side -1
      new CircleGeometry(SWEEP_REACH, 28, (3 * Math.PI) / 2 - SWEEP_OVERLAP, span).rotateX(-Math.PI / 2), // side +1
    ];
    this.sweepMat = new MeshBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide });
    this.sweepMesh = new Mesh(this.sweepGeos[1], this.sweepMat);
    this.sweepMesh.position.y = 0.02;
    this.sweepMesh.visible = false;
    // Shockwave: a half ring on the room side, scaled to its radius.
    this.shockGeo = new RingGeometry(0.9, 1, 48, 1, Math.PI, Math.PI).rotateX(-Math.PI / 2);
    this.shockMat = new MeshBasicMaterial({ color: 0xffa04a, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide });
    this.shockMesh = new Mesh(this.shockGeo, this.shockMat);
    this.shockMesh.position.set(0, 0.025, 0.3);
    this.shockMesh.visible = false;
    // Diaper ring over his head: the arc shrinks (drawRange) from green to red.
    this.ringBgMat = new MeshBasicMaterial({ color: 0x1c1830, transparent: true, opacity: 0.7, side: DoubleSide, depthWrite: false });
    this.ringMat = new MeshBasicMaterial({ color: 0x9bd770, side: DoubleSide, transparent: true, opacity: 0.95, depthWrite: false });
    this.ringMesh = new Mesh(RING_GEO, this.ringMat);
    this.ringMesh.renderOrder = 2;
    this.ringGroup.add(new Mesh(RING_BG_GEO, this.ringBgMat), this.ringMesh);
    this.ringGroup.visible = false;
    // HP bar above the door frame.
    const bg = new MeshBasicMaterial({ color: 0x1c1830, transparent: true, opacity: 0.75, depthWrite: false });
    const fill = new MeshBasicMaterial({ color: 0xff9ad5, transparent: true, opacity: 0.95, depthWrite: false });
    this.barMats = [bg, fill];
    const back = new Mesh(BAR_GEO, bg);
    back.scale.set(BAR_W + 0.04, 0.09, 1);
    back.position.set(-(BAR_W + 0.04) / 2, 0, -0.002);
    this.barFill = new Mesh(BAR_GEO, fill);
    this.barFill.scale.set(BAR_W, 0.06, 1);
    this.barFill.position.set(-BAR_W / 2, 0, 0);
    this.barFill.renderOrder = 1;
    this.bar.add(back, this.barFill);
    const top = door.center.y - w.room.floorY + door.height / 2;
    // Above the frame and above the diaper ring (ring top ≈ 2.27 m).
    this.bar.position.set(0, Math.max(2.38, Math.min(2.6, top + 0.2)), 0.12);
    this.root.add(this.sweepMesh, this.shockMesh, this.ringGroup, this.bar);
    this.unsub.push(w.bus.on('diaper:changed', () => this.onDiaperChanged()));
  }

  /** Current attack beat (for tests and diagnostics). */
  get beat(): string {
    return this.move;
  }

  /** Wedge into the door whatever source the director picked. */
  override spawnAt(_position: Vector3, _facing: Vector3): void {
    const d = this.door;
    super.spawnAt(new Vector3(d.center.x, this.w.room.floorY, d.center.z), d.normal.clone().setY(0).normalize());
    this.setState('boss');
    this.move = 'emerge';
    this.moveT = 0;
    this.sayLine('boss_bigbean_hi', 'neutral');
  }

  override headPosition(out = new Vector3()): Vector3 {
    return this.body.headWorld(out);
  }

  /** Body hits 1x; the head/pacifier and every hit while stunned 3x. Returns true on the defeating hit. */
  override hit(damage: number, headshot: boolean, _style: string[] = []): boolean {
    if (!this.alive || this.defeated) return false;
    const weak = headshot || this.stunned;
    this.applyDamage(damage * (weak ? WEAK_MULT : 1));
    this.flashT = 0.08;
    this.body.setTint(new Color(2.2, 2.2, 2.2));
    this.w.voice.sfx('squeak_hit', this.root, 0.8);
    if (weak && !this.defeated) this.w.fx.text(this.headPosition(tmp).add(tmp2.set(0, 0.35, 0)), 'x3', '#ffcc33');
    return this.defeated;
  }

  /** True from the defeating hit on (the slide-out and final pop follow). */
  get defeated(): boolean {
    return this.phase === 'defeated';
  }

  /** Damage from any source (shots, changed diapers); runs the phase machine. */
  applyDamage(amount: number): void {
    if (this.phase === 'defeated' || amount <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.advancePhase();
  }

  private advancePhase(): void {
    for (let i = 0; i < 4; i++) {
      const next = nextPhase(this.phase, this.hp, this.demandResolved);
      if (next === this.phase) return;
      this.enterPhase(next);
    }
  }

  private enterPhase(p: BossPhase): void {
    const prev = this.phase;
    this.phase = p;
    this.stunned = false;
    this.sweepMesh.visible = false;
    this.shockMesh.visible = false;
    if (prev === 'demand' && p !== 'demand') {
      this.ringActive = false;
      this.ringGroup.visible = false;
      this.toSpawn.length = 0;
    }
    switch (p) {
      case 'demand':
        this.setMove('idle', 1);
        this.ringLeft = DEMAND_RING;
        this.ringActive = true;
        this.ringGroup.visible = true;
        this.changed = 0;
        this.demandResolved = false;
        this.toSpawn = stinkySpots(this.w.room, this.door, this.w.player.position(tmp));
        this.spawnTimer = 0.6;
        this.sayLine('bigbean_change_my_diaper', 'scream');
        this.w.bus.emit('hint', { text: 'CHANGE. MY. DIAPER.', sub: 'Change the Stinkys with your WIPE hand: each one shrinks his ring 5 s and hurts him.', seconds: 4 });
        break;
      case 'tantrum':
        this.setMove('idle', 1.4);
        this.sayLine('bigbean_no_fit', 'scream');
        this.w.bus.emit('hint', { text: 'TANTRUM!', sub: `Floor slaps! Stand more than ${this.reach.toFixed(1)} m from his door.`, seconds: 3.5 });
        break;
      case 'defeated':
        this.defeatT = 0;
        this.confettiT = 0;
        this.body.setAsleep(true);
        this.body.setTint(null);
        this.sayLine('bigbean_night_night', 'sleepy');
        break;
      case 'grabby':
        break;
    }
  }

  private setMove(m: Move, timer = 0): void {
    this.move = m;
    this.moveT = 0;
    this.moveTimer = timer;
  }

  protected tick(dt: number): void {
    this.root.updateMatrixWorld();
    this.moveT += dt;
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0 && this.phase !== 'defeated') this.body.setTint(this.stunned ? new Color(1.3, 1.1, 0.6) : null);
    }
    // Keep the head 1.2 m from the player's; duck back through the door when they come close.
    const head = this.w.player.position(tmp);
    doorLocal(this.door, head, this.local);
    let target = allowedIntrusion(this.local.along, this.local.lateral);
    if (this.move === 'emerge') target = Math.min(target, MIN_INTRUSION + (MAX_INTRUSION - MIN_INTRUSION) * Math.min(1, this.moveT / 1.6));
    if (this.phase === 'defeated' && this.defeatT > 1.4) target = MIN_INTRUSION;
    const b = this.body;
    b.intrusion += Math.max(-1.2 * dt, Math.min(0.8 * dt, target - b.intrusion));
    const shy = target < -0.1;
    b.setArmsVisible(!shy || this.move === 'sweep');
    this.updateOverlays(dt);
    switch (this.phase) {
      case 'grabby':
        this.tickGrabby(dt, shy);
        break;
      case 'demand':
        this.tickDemand(dt);
        break;
      case 'tantrum':
        this.tickTantrum(dt, shy);
        break;
      case 'defeated':
        this.tickDefeated(dt);
        break;
    }
  }

  // ---- phases ---------------------------------------------------------------------------------------------

  private tickGrabby(dt: number, shy: boolean): void {
    switch (this.move) {
      case 'emerge':
        this.restArms(dt);
        if (this.moveT > 1.6) this.setMove('idle', 1.2);
        break;
      case 'idle':
        this.restArms(dt);
        if (!shy) this.moveTimer -= dt;
        if (this.moveTimer <= 0) {
          const lat = this.local.lateral;
          this.sweepSide = Math.abs(lat) < 0.15 ? (Math.random() < 0.5 ? -1 : 1) : lat > 0 ? 1 : -1;
          this.sweepMesh.geometry = this.sweepGeos[this.sweepSide > 0 ? 1 : 0];
          this.sweepMesh.visible = true;
          this.setMove('tell');
          if (this.sayCycle++ % 3 === 2) this.sayLine('boss_bigbean_mine', 'scream');
          else this.sayLine('bigbean_gimme', 'scream');
        }
        break;
      case 'tell': {
        // Wind-up: the sweeping arm pulls back past the outer side, raised; the other arm waves.
        const k = Math.min(1, this.moveT / GRAB_TELL);
        this.poseSweepArm(this.sweepSide * (1.75 + 0.15 * k), 0.25 + 0.2 * k);
        this.waveArm(this.sweepSide > 0 ? 0 : 1, dt);
        this.sweepMat.opacity = 0.14 + 0.16 * (0.5 + 0.5 * Math.sin(this.moveT * (6 + 10 * k)));
        if (this.moveT >= GRAB_TELL) {
          this.setMove('sweep');
          this.swept = false;
          this.w.voice.sfx('door_kick', this.root, 0.5);
        }
        break;
      }
      case 'sweep': {
        const k = Math.min(1, this.moveT / GRAB_SWEEP);
        const angle = this.sweepSide * (1.9 - (1.9 + SWEEP_OVERLAP + 0.1) * k);
        this.poseSweepArm(angle, 0.45 - 0.45 * k);
        this.sweepMat.opacity = 0.45 * (1 - k);
        if (!this.swept && k >= 0.5) {
          this.swept = true;
          if (inSweepZone(this.local.along, this.local.lateral, this.sweepSide)) {
            this.w.player.damage(GRAB_DAMAGE, this.type);
            this.dealt += GRAB_DAMAGE;
            this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: GRAB_DAMAGE });
            this.w.fx.text(this.w.player.position(tmp2).addScaledVector(this.door.normal, -1.3).add(tmp.set(0, -0.35, 0)), 'GRAB!', '#ff5a5a');
          } else this.w.fx.text(this.headPosition(tmp2).add(tmp.set(0, 0.5, 0)), 'MISSED', '#3fd6c8');
        }
        if (k >= 1) {
          this.sweepMesh.visible = false;
          this.setMove('idle', GRAB_COOLDOWN);
        }
        break;
      }
      default:
        this.setMove('idle', 1);
    }
  }

  private tickDemand(dt: number): void {
    if (this.toSpawn.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = 1.2;
        const p = this.toSpawn.shift() as Vector3;
        const facing = this.w.player.position(tmp).sub(p).setY(0);
        if (facing.lengthSq() < 1e-6) facing.copy(this.door.normal);
        this.w.bus.emit('spawn:request', { type: 'stinky', position: p, facing: facing.normalize() });
      }
    }
    if (this.move === 'stun') {
      this.stunned = true;
      this.body.head.rotation.z = Math.sin(this.moveT * 7) * 0.18;
      this.restArms(dt, 0.2);
      this.starT -= dt;
      if (this.starT <= 0) {
        this.starT = 0.9;
        this.w.fx.text(this.headPosition(tmp).add(tmp2.set(0, 0.55, 0)), '★ DIZZY ★', '#ffcc33');
      }
      if (this.moveT >= STUN_SECONDS) {
        this.stunned = false;
        this.body.head.rotation.z = 0;
        this.body.setTint(null);
        this.demandResolved = true;
        this.advancePhase();
      }
      return;
    }
    // Grabby hands: both arms open and close at you.
    const t = this.moveT;
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1;
      const dir = tmp.set(s * (0.35 + 0.1 * Math.sin(t * 5 + i)), 0.15 + 0.12 * Math.sin(t * 6 + i * 2), 0.9).normalize();
      this.body.setArm(i, dir, this.armLength(i, 0.75));
    }
    this.body.head.rotation.z = Math.sin(t * 3) * 0.08;
    if (this.ringActive) {
      this.ringLeft -= dt;
      if (this.ringLeft <= 0) this.expireRing();
    }
  }

  private tickTantrum(dt: number, shy: boolean): void {
    switch (this.move) {
      case 'idle':
        this.restArms(dt);
        this.shockMesh.visible = false;
        if (!shy) this.moveTimer -= dt;
        if (this.moveTimer <= 0) {
          this.setMove('slaptell');
          const lines = ['bigbean_no_fit', 'boss_bigbean_no_bed', 'boss_bigbean_up_up'];
          this.sayLine(lines[this.sayCycle++ % lines.length], 'scream');
        }
        break;
      case 'slaptell': {
        // Both arms up; the shockwave's reach glows on the floor: stand outside it.
        const k = Math.min(1, this.moveT / SLAP_TELL);
        for (let i = 0; i < 2; i++) {
          const s = i === 0 ? -1 : 1;
          this.body.setArm(i, tmp.set(s * 0.35, 0.75 + 0.15 * Math.sin(this.moveT * 18 + i), 0.45).normalize(), this.armLength(i, 0.7));
        }
        this.shockMesh.visible = true;
        this.shockMesh.scale.setScalar(this.reach);
        this.shockMat.opacity = 0.18 + 0.2 * (0.5 + 0.5 * Math.sin(this.moveT * (8 + 10 * k)));
        if (this.moveT >= SLAP_TELL) {
          this.setMove('slap');
          this.shockR = 0.05;
          this.w.voice.sfx('door_kick', this.root, 1);
          this.w.fx.text(this.root.position.clone().addScaledVector(this.door.normal, 0.5).add(tmp.set(0, 0.3, 0)), 'SLAP!', '#ffa04a');
        }
        break;
      }
      case 'slap': {
        // Arms slam down onto the floor in front of the door; the ring rolls out.
        for (let i = 0; i < 2; i++) {
          const s = i === 0 ? -1 : 1;
          this.body.setArm(i, tmp.set(s * 0.25, -0.75, 0.6).normalize(), this.armLength(i, 0.95));
        }
        const before = this.shockR;
        this.shockR = Math.min(this.reach, this.shockR + SHOCK_SPEED * dt);
        this.shockMesh.visible = true;
        this.shockMesh.scale.setScalar(Math.max(0.05, this.shockR));
        this.shockMat.opacity = 0.75 * (1 - this.shockR / this.reach) + 0.15;
        const p = this.w.player.position(tmp);
        const origin = tmp2.set(this.door.center.x, 0, this.door.center.z).addScaledVector(this.door.normal, 0.3);
        const dist = Math.hypot(p.x - origin.x, p.z - origin.z);
        if (shockHits(before, this.shockR, dist, this.reach)) {
          this.w.player.damage(SLAP_DAMAGE, this.type);
          this.dealt += SLAP_DAMAGE;
          this.w.bus.emit('enemy:attack', { id: this.id, type: this.type, damage: SLAP_DAMAGE });
        }
        if (this.shockR >= this.reach) {
          this.shockMesh.visible = false;
          this.setMove('idle', TANTRUM_COOLDOWN);
        }
        break;
      }
      default:
        this.setMove('idle', 1);
    }
  }

  private tickDefeated(dt: number): void {
    this.defeatT += dt;
    this.ringGroup.visible = false;
    this.sweepMesh.visible = false;
    this.shockMesh.visible = false;
    this.body.head.rotation.z = Math.min(0.35, this.defeatT * 0.4);
    for (let i = 0; i < 2; i++) this.body.setArm(i, tmp.set(i === 0 ? -0.2 : 0.2, -0.9, 0.35).normalize(), 0.5);
    // The biggest confetti in the game: bursts all over his head while he yawns.
    this.confettiT -= dt;
    if (this.confettiT <= 0 && this.defeatT < 2.2) {
      this.confettiT = 0.28;
      const c = this.headPosition(tmp).add(tmp2.set((Math.random() - 0.5) * 0.9, Math.random() * 0.6, 0.25));
      this.w.fx.pop(c, new Color().setHSL(Math.random(), 0.85, 0.6), this.w.reducedFlash ? 30 : 60);
      this.w.voice.sfx('confetti', this.root, 0.7);
    }
    if (!this.finalPopped && this.defeatT >= 2.6) {
      this.finalPopped = true;
      this.w.fx.ghost(this.headPosition(tmp));
      super.pop(false, ['NIGHT NIGHT']);
    }
  }

  // ---- events ---------------------------------------------------------------------------------------------

  private onDiaperChanged(): void {
    if (!this.alive || this.phase !== 'demand' || !this.ringActive) return;
    this.changed++;
    this.ringLeft = Math.max(0, this.ringLeft - CHANGE_RING_CUT);
    this.w.fx.text(this.headPosition(tmp).add(tmp2.set(0, 0.7, 0)), '-5 s', '#3fd6c8');
    if (this.changed >= DEMAND_STINKYS) {
      this.ringActive = false;
      this.ringGroup.visible = false;
      this.setMove('stun');
      this.stunned = true;
      this.starT = 0;
      this.body.setTint(new Color(1.3, 1.1, 0.6));
      this.sayLine('boss_bigbean_uh_oh', 'neutral');
      this.w.bus.emit('hint', { text: 'All changed! He is dizzy.', sub: 'Every hit counts triple for 6 seconds.', seconds: 3 });
    }
    this.applyDamage(CHANGE_DAMAGE);
  }

  private expireRing(): void {
    this.ringActive = false;
    this.ringGroup.visible = false;
    const p = this.w.player.position(tmp);
    const centre = new Vector3(this.door.center.x, this.w.room.floorY, this.door.center.z).lerp(new Vector3(p.x, this.w.room.floorY, p.z), 0.7);
    this.w.bus.emit('stinky:cloud', { position: centre, ...RING_CLOUD });
    this.w.voice.sfx('stink_cloud', this.root, 1);
    this.w.fx.text(this.headPosition(tmp2).add(tmp.set(0, 0.6, 0)), 'PEE-YEW', '#9bd770');
    this.sayLine('boss_bigbean_stinky', 'giggle');
    this.demandResolved = true;
    this.advancePhase();
  }

  // ---- poses and overlays -----------------------------------------------------------------------------------

  /** Longest arm that keeps the hand 1.2 m from the player's head. */
  private armLength(i: number, wanted: number): number {
    const s = this.root.localToWorld(this.body.shoulder(i, tmp2));
    const p = this.w.player.position(new Vector3());
    return allowedArmLength(Math.hypot(p.x - s.x, p.z - s.z), wanted);
  }

  private restArms(_dt: number, droop = 0): void {
    const t = this.moveT;
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1;
      const dir = tmp.set(s * 0.3, -0.55 - droop + 0.06 * Math.sin(t * 2 + i), 0.75).normalize();
      this.body.setArm(i, dir, this.armLength(i, 0.6));
    }
  }

  private waveArm(i: number, _dt: number): void {
    const s = i === 0 ? -1 : 1;
    this.body.setArm(i, tmp.set(s * 0.4, 0.6 + 0.2 * Math.sin(this.moveT * 9), 0.5).normalize(), this.armLength(i, 0.55));
  }

  /** The sweeping arm at a horizontal angle (0 = straight out of the door, +π/2 = lateral +x), raised by `lift`. */
  private poseSweepArm(angle: number, lift: number): void {
    const i = this.sweepSide > 0 ? 1 : 0;
    const dir = tmp.set(Math.sin(angle), lift, Math.cos(angle)).normalize();
    this.body.setArm(i, dir, this.armLength(i, SWEEP_REACH * 0.6));
  }

  private updateOverlays(_dt: number): void {
    const p = this.w.player.position(tmp);
    // HP bar and ring face the player (yaw only).
    this.bar.lookAt(p.x, this.bar.getWorldPosition(tmp2).y, p.z);
    this.barFill.scale.x = Math.max(0.0001, BAR_W * (this.hp / BIGBEAN_HP));
    this.barMats[1].color.set(this.stunned ? 0xffcc33 : 0xff9ad5);
    this.bar.visible = this.phase !== 'defeated';
    if (this.ringGroup.visible) {
      // Same plane as the HP bar so perspective never stacks one over the other.
      this.ringGroup.position.set(0, HEAD_Y + HEAD_R + 0.27, 0.12);
      this.ringGroup.lookAt(p);
      const frac = Math.max(0, this.ringLeft) / DEMAND_RING;
      this.ringMesh.geometry.setDrawRange(0, 6 * Math.max(1, Math.round(RING_SEGMENTS * frac)));
      this.ringMat.color.setHSL(0.33 * frac, 0.9, 0.5);
    }
  }

  override dispose(): void {
    for (const u of this.unsub) u();
    this.unsub.length = 0;
    this.sweepGeos[0].dispose();
    this.sweepGeos[1].dispose();
    this.shockGeo.dispose();
    this.sweepMat.dispose();
    this.shockMat.dispose();
    this.ringMat.dispose();
    this.ringBgMat.dispose();
    for (const m of this.barMats) m.dispose();
    super.dispose();
  }

  private sayLine(id: string, emotion: string): void {
    const v = this.w.voice as SayIdVoice;
    if (typeof v.sayId === 'function') v.sayId(id, this.root);
    else v.say(this.speaker, emotion, this.root);
  }
}
