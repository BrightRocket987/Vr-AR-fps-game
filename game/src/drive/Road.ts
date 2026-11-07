import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RingGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  Vector3,
} from 'three';
import { GeoBuilder } from './Geo';
import { CAR_CX, ROAD_Y } from './Cockpit';
import { HAZARDS, arrivalIn, hazardHits, type HazardDef, type HazardKind } from './Timeline';
import { LANE_WIDTH } from './Steering';

/** Front bumper of the minivan, rig-local z. Hazards are judged when they cross it. */
export const BUMPER_Z = -2.4;
const SKY_R = 55; // the XR camera's far plane is 60 m: everything must sit inside it

export interface Hazard {
  kind: HazardKind;
  def: HazardDef;
  group: Group;
  /** Road-space x of the hazard's centre (metres, lane 0 = centre). */
  x: number;
  /** Rig-local z of its front edge (negative = ahead). */
  z: number;
  /** Extra closing speed on top of the scroll (Brad braking). */
  closing: number;
  vx: number;
  length: number;
  told: boolean;
  done: boolean;
  hit: boolean;
  marker: Sprite;
  brake: Mesh | null;
  t: number;
  /** For the deer: it ends early when popped. */
  cancelled: boolean;
  /** Airborne time left for thrown cones. */
  air: number;
  airFrom: Vector3 | null;
}

export interface HazardOutcome {
  hazard: Hazard;
  hit: boolean;
  close: boolean;
}

/** Deterministic RNG so the scenery repeats exactly per period. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * The night road. The cockpit never moves; this world scrolls toward the player (+Z) and slides sideways opposite the
 * car's lateral offset. Repeating scenery lives in groups that are translated by `distance mod period`, so streaming costs
 * no matrix updates. An opaque sky sphere and ground disc enclose everything so no passthrough shows.
 */
export class Road {
  readonly root = new Group(); // rig-local, not shifted: sky, stars, ground
  readonly road = new Group(); // shifted sideways by the car offset
  readonly hazards: Hazard[] = [];
  private readonly periodic: Array<{ group: Group; period: number }> = [];
  private readonly disposables: Array<BufferGeometry | Material | Texture> = [];
  private readonly hazardLit = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  private readonly warnTex: CanvasTexture;
  private readonly tmp = new Vector3();
  distance = 0;
  home: Group | null = null;
  private garageMat: MeshBasicMaterial | null = null;

  constructor() {
    this.root.name = 'drive-road';
    this.root.add(this.road);
    this.disposables.push(this.hazardLit);
    this.warnTex = warningTexture();
    this.disposables.push(this.warnTex);
    this.buildSky();
    this.buildStatic();
    this.buildPeriodic();
  }

  private buildSky(): void {
    const geo = new SphereGeometry(SKY_R, 32, 16);
    const pos = geo.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const horizon = new Color(0x1d2547), zenith = new Color(0x04050c), below = new Color(0x0a0f0b), c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / SKY_R;
      if (y >= 0) c.copy(horizon).lerp(zenith, Math.min(1, Math.pow(y, 0.6)));
      else c.copy(horizon).lerp(below, Math.min(1, -y * 6));
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new BufferAttribute(col, 3));
    const mat = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false });
    const sky = new Mesh(geo, mat);
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    sky.position.y = ROAD_Y + 1.4;
    // Stars and the moon.
    const r = rng(7);
    const starPos = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2, e = 0.12 + r() * 1.3;
      const d = SKY_R - 3;
      starPos.set([Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d, Math.sin(a) * Math.cos(e) * d], i * 3);
    }
    const sg = new BufferGeometry();
    sg.setAttribute('position', new BufferAttribute(starPos, 3));
    const sm = new PointsMaterial({ color: 0xdfe6ff, size: 2, sizeAttenuation: false, fog: false, depthWrite: false });
    const stars = new Points(sg, sm);
    stars.renderOrder = -9;
    stars.frustumCulled = false;
    const moonMat = new MeshBasicMaterial({ color: 0xfff3c8, fog: false });
    const moon = new Mesh(new CircleGeometry(2.4, 24), moonMat);
    moon.position.set(-14, 20, -44);
    moon.lookAt(0, 0, 0);
    moon.renderOrder = -8;
    // Ground disc.
    const groundMat = new MeshStandardMaterial({ color: 0x101a12, roughness: 1 });
    const ground = new Mesh(new CircleGeometry(SKY_R - 1, 40), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = ROAD_Y - 0.03;
    this.root.add(sky, stars, moon, ground);
    this.disposables.push(geo, mat, sg, sm, moonMat, moon.geometry, groundMat, ground.geometry);
  }

  /** Asphalt, shoulders, kerbs, sidewalks and edge lines: uniform along Z, so it never needs to scroll. */
  private buildStatic(): void {
    const b = new GeoBuilder();
    const L = 120, z0 = -40;
    b.box(3 * LANE_WIDTH + 2.4, 0.04, L, 0x26272c, [0, ROAD_Y - 0.02, z0]);
    for (const s of [-1, 1]) {
      b.box(0.14, 0.01, L, 0xe8e4d8, [s * (1.5 * LANE_WIDTH + 0.15), ROAD_Y + 0.005, z0]);
      b.box(0.3, 0.16, L, 0x77736a, [s * (1.5 * LANE_WIDTH + 1.35), ROAD_Y + 0.06, z0]);
      b.box(2.6, 0.14, L, 0x4a4844, [s * (1.5 * LANE_WIDTH + 2.8), ROAD_Y + 0.05, z0]);
      b.box(1.6, 0.6, L, 0x163019, [s * (1.5 * LANE_WIDTH + 5.2), ROAD_Y + 0.28, z0]); // hedge rows
    }
    const mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    const mesh = new Mesh(b.build(), mat);
    mesh.frustumCulled = false;
    this.road.add(mesh);
    this.disposables.push(mat, mesh.geometry);
  }

  private addPeriodic(period: number): Group {
    const g = new Group();
    this.road.add(g);
    this.periodic.push({ group: g, period });
    return g;
  }

  private instanced(geo: BufferGeometry, mat: Material, mats: Matrix4[], parent: Group, colors?: Color[]): InstancedMesh {
    const im = new InstancedMesh(geo, mat, mats.length);
    mats.forEach((m, i) => im.setMatrixAt(i, m));
    if (colors) colors.forEach((c, i) => im.setColorAt(i, c));
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    parent.add(im);
    this.disposables.push(geo, mat);
    return im;
  }

  private buildPeriodic(): void {
    const dummy = new Object3D();
    const at = (x: number, y: number, z: number, ry = 0, s = 1): Matrix4 => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, ry, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    };
    // Lane dashes, 3 m every 10 m.
    const dashes = this.addPeriodic(10);
    const dm: Matrix4[] = [];
    for (let k = -2; k < 7; k++) for (const x of [-LANE_WIDTH / 2, LANE_WIDTH / 2]) dm.push(at(x, ROAD_Y + 0.006, -k * 10));
    this.instanced(new BoxGeometry(0.14, 0.01, 3), new MeshBasicMaterial({ color: 0xcfcab8 }), dm, dashes);
    // Streetlights every 30 m, alternating sides, with warm pools of light.
    const lights = this.addPeriodic(30);
    const pole = new GeoBuilder();
    pole.cyl(0.08, 0.11, 6.6, 0x4b4f57, [0, 3.3, 0]);
    pole.box(1.7, 0.08, 0.08, 0x4b4f57, [-0.85, 6.55, 0]);
    const lm: Matrix4[] = [], hm: Matrix4[] = [], pm: Matrix4[] = [];
    const side = 1.5 * LANE_WIDTH + 2.1;
    for (let k = -1; k < 3; k++) {
      for (const s of [-1, 1]) {
        const z = -k * 30 + (s > 0 ? -15 : 0);
        lm.push(at(s * side, ROAD_Y, z, s > 0 ? 0 : Math.PI));
        hm.push(at(s * (side - 1.6), ROAD_Y + 6.45, z));
        pm.push(at(s * (side - 1.9), ROAD_Y + 0.012, z));
      }
    }
    this.instanced(pole.build(), new MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), lm, lights);
    this.instanced(new BoxGeometry(0.55, 0.14, 0.3), new MeshBasicMaterial({ color: 0xffe2a0 }), hm, lights);
    const poolGeo = new CircleGeometry(3.6, 20);
    poolGeo.rotateX(-Math.PI / 2);
    this.instanced(poolGeo, new MeshBasicMaterial({ color: 0xffc977, transparent: true, opacity: 0.16, blending: AdditiveBlending, depthWrite: false }), pm, lights);
    // Trees and houses, 40 m pattern.
    const scenery = this.addPeriodic(40);
    const r = rng(42);
    const tree = new GeoBuilder();
    tree.cyl(0.18, 0.25, 1.6, 0x4a3324, [0, 0.8, 0]);
    tree.cone(1.5, 3.2, 0x1f4a2a, [0, 2.9, 0]);
    tree.cone(1.1, 2.4, 0x2a5e34, [0, 4.1, 0]);
    const tm: Matrix4[] = [];
    const hmats: Matrix4[] = [], hcols: Color[] = [];
    const housePalette = [0xd9c7a7, 0xa7c4d9, 0xd9a7b4, 0xc4d9a7, 0xe6e0d0, 0xb7a7d9];
    const pattern: Array<{ x: number; z: number; s: number; ry: number }> = [];
    for (let i = 0; i < 6; i++) pattern.push({ x: (r() < 0.5 ? -1 : 1) * (10 + r() * 12), z: -r() * 40, s: 0.8 + r() * 0.6, ry: r() * 6 });
    const housePattern: Array<{ x: number; z: number; c: number }> = [];
    for (let i = 0; i < 4; i++) housePattern.push({ x: (i % 2 ? -1 : 1) * (16 + r() * 4), z: -i * 10 - r() * 4, c: housePalette[Math.floor(r() * housePalette.length)] });
    for (let k = -1; k < 3; k++) {
      for (const p of pattern) tm.push(at(p.x, ROAD_Y, p.z - k * 40, p.ry, p.s));
      for (const h of housePattern) {
        hmats.push(at(h.x, ROAD_Y, h.z - k * 40, h.x > 0 ? -Math.PI / 2 : Math.PI / 2));
        hcols.push(new Color(h.c));
      }
    }
    this.instanced(tree.build(), new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), tm, scenery);
    const house = new GeoBuilder();
    house.box(6, 3.6, 7, 0xffffff, [0, 1.8, 0]);
    house.add(new ConeGeometry(5.2, 2.4, 4), 0x8a4a3a, [0, 4.8, 0], [0, Math.PI / 4, 0], [1, 1, 1.3]);
    house.box(1.1, 2.1, 0.1, 0x5a3a2a, [0, 1.05, 3.52]);
    this.instanced(house.build(), new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), hmats, scenery, hcols);
    const win = new GeoBuilder();
    for (const x of [-1.9, 1.9]) win.box(1.0, 0.9, 0.05, 0xffd77a, [x, 1.9, 3.53]);
    win.box(0.8, 0.7, 0.05, 0xffe9a8, [0, 3.0, 3.53]);
    this.instanced(win.build(), new MeshBasicMaterial({ vertexColors: true }), hmats, scenery);
  }

  /** Scroll the world: `speed` m/s toward the player, the car's lateral `offset` in metres. */
  update(dt: number, speed: number, offset: number, t: number): void {
    this.distance += speed * dt;
    this.road.position.x = CAR_CX - offset;
    for (const p of this.periodic) p.group.position.z = this.distance % p.period;
    if (this.home) this.home.position.z += speed * dt;
    if (this.garageMat) this.garageMat.color.setRGB(0.15 + 0.1 * Math.sin(t * 3), 0.75 + 0.15 * Math.sin(t * 3), 0.72);
  }

  /** Move hazards; returns the ones that crossed the bumper this frame (hit or dodged). */
  updateHazards(dt: number, speed: number, carX: number, t: number): HazardOutcome[] {
    const out: HazardOutcome[] = [];
    for (const h of this.hazards) {
      h.t += dt;
      h.z += (speed + h.closing) * dt;
      h.x += h.vx * dt;
      if (h.kind === 'pickup' && !h.told && h.z > -24) {
        h.closing = speed; // brake check: it stops dead in front of you
        if (h.brake) (h.brake.material as MeshBasicMaterial).color.set(0xff2020);
      }
      if (h.air > 0 && h.airFrom) {
        h.air -= dt;
        const k = 1 - Math.max(0, h.air) / 0.9;
        const land = this.tmp.set(h.x, ROAD_Y, h.z);
        const p = h.airFrom.clone().lerp(land, k);
        p.y += Math.sin(k * Math.PI) * 3;
        h.group.position.set(p.x, p.y - ROAD_Y, p.z);
        h.group.rotation.x += dt * 8;
        if (h.air <= 0) h.group.rotation.x = 0;
      } else h.group.position.set(h.x, 0, h.z);
      const closing = speed + h.closing;
      const eta = arrivalIn(h.z, closing, BUMPER_Z);
      if (!h.told && eta <= h.def.tell && !h.cancelled) {
        h.told = true;
        h.marker.visible = true;
      }
      if (h.told && !h.done) h.marker.material.opacity = 0.55 + 0.45 * Math.sign(Math.sin(t * 14));
      // Judge while any part of it overlaps the bumper line.
      if (!h.done && !h.cancelled && h.z >= BUMPER_Z && h.z - h.length <= BUMPER_Z) {
        if (hazardHits(carX, h.x, h.def.halfWidth)) {
          h.done = true;
          h.hit = true;
          h.marker.visible = false;
          out.push({ hazard: h, hit: true, close: false });
        }
      }
      if (!h.done && !h.cancelled && h.z - h.length > BUMPER_Z) {
        h.done = true;
        h.marker.visible = false;
        const close = Math.abs(carX - h.x) < 0.95 + h.def.halfWidth + 0.35;
        out.push({ hazard: h, hit: false, close });
      }
      if (h.cancelled) h.marker.visible = false;
    }
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (h.z - h.length > 6) {
        this.disposeHazard(h);
        this.hazards.splice(i, 1);
      }
    }
    return out;
  }

  /** Spawn a hazard ahead. `carX` is the car's road x (hazards aim at your lane so they matter). */
  spawnHazard(kind: HazardKind, carX: number, speed: number, laneHint?: number): Hazard {
    const def = HAZARDS[kind];
    const lane = laneHint ?? Math.max(-1, Math.min(1, Math.round(carX / LANE_WIDTH)));
    const lx = lane * LANE_WIDTH;
    const g = new Group();
    const b = new GeoBuilder();
    let x = lx, z = -46, vx = 0, length = 0.6, brake: Mesh | null = null, air = 0, airFrom: Vector3 | null = null;
    const y0 = ROAD_Y;
    switch (kind) {
      case 'cart': {
        // Rolls right to left so it crosses your lane as it arrives.
        const eta = arrivalIn(z, Math.max(4, speed), BUMPER_Z);
        vx = -1.1;
        x = carX - vx * eta;
        b.box(0.6, 0.45, 0.9, 0xb8c0c8, [0, y0 + 0.75, 0]);
        b.box(0.62, 0.04, 0.92, 0xe5443a, [0, y0 + 0.98, 0]);
        b.box(0.04, 0.5, 0.04, 0x8a9096, [0.26, y0 + 0.3, 0.4]);
        b.box(0.04, 0.5, 0.04, 0x8a9096, [-0.26, y0 + 0.3, 0.4]);
        b.box(0.04, 0.5, 0.04, 0x8a9096, [0.26, y0 + 0.3, -0.4]);
        b.box(0.04, 0.5, 0.04, 0x8a9096, [-0.26, y0 + 0.3, -0.4]);
        b.box(0.7, 0.05, 0.05, 0xe5443a, [0, y0 + 1.1, 0.5]);
        break;
      }
      case 'potholes': {
        length = 14;
        for (let i = 0; i < 4; i++) {
          b.add(new CylinderGeometry(0.55 + (i % 2) * 0.2, 0.55, 0.03, 14), 0x0b0c0e, [(i % 2 ? -0.5 : 0.5), y0 + 0.012, -i * 4 - 0.5]);
          b.add(new RingGeometry(0.6, 0.72, 16), 0x3fd6c8, [(i % 2 ? -0.5 : 0.5), y0 + 0.02, -i * 4 - 0.5], [-Math.PI / 2, 0, 0]);
        }
        break;
      }
      case 'mattress': {
        // Two lanes wide: yours and the one toward the middle, leaving the far lane open.
        const dir = lane === 0 ? (carX >= 0 ? 1 : -1) : -Math.sign(lane);
        x = lx + (dir * LANE_WIDTH) / 2;
        length = 2.2;
        b.box(6.4, 0.32, 2.0, 0xe9e4f2, [0, y0 + 0.18, -1]);
        for (let i = -3; i <= 3; i++) b.box(0.06, 0.33, 2.02, 0x9ab0e6, [i * 0.9, y0 + 0.18, -1]);
        break;
      }
      case 'cones': {
        length = 26;
        for (let i = 0; i < 7; i++) {
          const cx = (i / 6 - 0.5) * 2.4 * (i % 2 ? 1 : 0.85);
          b.cone(0.22, 0.75, 0xff7a1a, [cx, y0 + 0.375, -i * 4]);
          b.cyl(0.13, 0.17, 0.12, 0xf4efe6, [cx, y0 + 0.4, -i * 4]);
        }
        b.box(2.6, 1.3, 0.1, 0x222222, [0, y0 + 1.3, -length + 0.5]);
        b.box(2.2, 0.25, 0.11, 0xff9a1a, [0, y0 + 1.45, -length + 0.5]);
        break;
      }
      case 'pickup': {
        z = -44;
        length = 5;
        b.box(1.9, 0.9, 5, 0xb5301f, [0, y0 + 0.85, -2.5]);
        b.box(1.8, 0.75, 2.0, 0x8e2618, [0, y0 + 1.6, -3.4]);
        b.box(1.7, 0.4, 0.03, 0x0d0f14, [0, y0 + 1.6, -2.38]);
        for (const wx of [-0.95, 0.95]) for (const wz of [-0.8, -4.1]) b.cyl(0.38, 0.38, 0.28, 0x111111, [wx, y0 + 0.38, wz], [0, 0, Math.PI / 2], 12);
        b.box(0.5, 0.15, 0.02, 0xf4efe6, [0, y0 + 0.62, 0.01]); // the BRAD plate
        const bm = new MeshBasicMaterial({ color: 0x551010 });
        brake = new Mesh(new BoxGeometry(1.9, 0.12, 0.05), bm);
        brake.position.set(0, y0 + 1.05, 0.02);
        g.add(brake);
        this.disposables.push(bm, brake.geometry);
        break;
      }
      case 'deer':
        // The deer itself is a gremlin (shootable); this hazard is only its footprint and tell.
        z = -46;
        break;
      case 'jcone': {
        z = -40;
        air = 0.9;
        b.cone(0.3, 0.9, 0xf7c6a3, [0, y0 + 0.45, 0], [Math.PI, 0, 0]);
        b.sphere(0.32, 0xff9ad5, [0, y0 + 1.0, 0]);
        b.sphere(0.08, 0xe5443a, [0, y0 + 1.35, 0]);
        break;
      }
    }
    if (!b.empty) {
      const m = new Mesh(b.build(), this.hazardLit);
      this.disposables.push(m.geometry);
      g.add(m);
    }
    const marker = new Sprite(new SpriteMaterial({ map: this.warnTex, transparent: true, depthWrite: false, depthTest: false, fog: false }));
    marker.scale.set(1.4, 1.4, 1);
    marker.position.set(0, ROAD_Y + 2.6, 0);
    marker.visible = false;
    marker.renderOrder = 30;
    g.add(marker);
    g.position.set(x, 0, z);
    this.road.add(g);
    const h: Hazard = { kind, def, group: g, x, z, closing: kind === 'pickup' ? 2 : 0, vx, length, told: false, done: false, hit: false, marker, brake, t: 0, cancelled: false, air, airFrom };
    this.hazards.push(h);
    return h;
  }

  /** A cone lobbed from `from` (road space) that lands in a lane. */
  throwCone(from: Vector3, lane: number, speed: number): Hazard {
    const h = this.spawnHazard('jcone', lane * LANE_WIDTH, speed, lane);
    h.airFrom = from.clone();
    return h;
  }

  private disposeHazard(h: Hazard): void {
    h.marker.material.dispose();
    this.road.remove(h.group);
  }

  /** The family home with a glowing garage, placed `ahead` metres up the right side. */
  spawnHome(ahead: number): Group {
    const g = new Group();
    const b = new GeoBuilder();
    const x = 1.5 * LANE_WIDTH + 8;
    b.box(9, 4.2, 8, 0xd9c7a7, [x, ROAD_Y + 2.1, -4]);
    b.add(new ConeGeometry(7.2, 3, 4), 0x7a3f33, [x, ROAD_Y + 5.6, -4], [0, Math.PI / 4, 0], [1, 1, 1.1]);
    b.box(4.4, 0.04, 9, 0x55524c, [x - 3.6, ROAD_Y + 0.02, -4]); // driveway
    b.box(0.6, 0.9, 0.6, 0x3a5a7a, [x - 6.2, ROAD_Y + 0.45, -0.5]); // bins
    b.box(0.6, 0.9, 0.6, 0x3a7a4a, [x - 6.2, ROAD_Y + 0.45, -7.5]);
    for (const wz of [-1.2, -6.8]) b.box(0.05, 1.0, 1.2, 0xffd77a, [x - 4.53, ROAD_Y + 2.6, wz]);
    const m = new Mesh(b.build(), this.hazardLit);
    this.garageMat = new MeshBasicMaterial({ color: 0x3ec9c4 });
    const garage = new Mesh(new PlaneGeometry(3.4, 2.6), this.garageMat);
    garage.position.set(x - 4.52, ROAD_Y + 1.3, -4);
    garage.rotation.y = -Math.PI / 2;
    const leakMat = new MeshBasicMaterial({ color: 0x3ec9c4, transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
    const leak = new Mesh(new PlaneGeometry(3.6, 5), leakMat);
    leak.rotation.x = -Math.PI / 2;
    leak.position.set(x - 7, ROAD_Y + 0.03, -4);
    g.add(m, garage, leak);
    g.position.z = -ahead;
    this.road.add(g);
    this.disposables.push(m.geometry, this.garageMat, garage.geometry, leakMat, leak.geometry);
    this.home = g;
    return g;
  }

  /** Rig-local z of the home's driveway mouth (for the stopping maths). */
  homeZ(): number {
    return this.home ? this.home.position.z - 4 : -Infinity;
  }

  /** Road-space → world position (for gremlins standing on the road). */
  roadToWorld(local: Vector3, out = new Vector3()): Vector3 {
    this.road.updateWorldMatrix(true, false);
    return out.copy(local).applyMatrix4(this.road.matrixWorld);
  }

  dispose(): void {
    for (const h of this.hazards) this.disposeHazard(h);
    this.hazards.length = 0;
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    this.root.removeFromParent();
  }
}

function warningTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#ffcc33';
    g.strokeStyle = '#1a1200';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(64, 10);
    g.lineTo(120, 112);
    g.lineTo(8, 112);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#1a1200';
    g.font = 'bold 72px "Trebuchet MS", sans-serif';
    g.textAlign = 'center';
    g.fillText('!', 64, 100);
  }
  return new CanvasTexture(c);
}
