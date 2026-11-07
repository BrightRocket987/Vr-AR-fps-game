import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  DoubleSide,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  TorusGeometry,
  Vector3,
} from 'three';
import { GeoBuilder } from './Geo';
import type { Kid, NeedStage } from './Needs';

/** Rig-local layout, metres from the captured head position (+X right, +Y up, −Z forward). */
export const CAR_CX = 0.4; // the driver sits left of the car's centreline
export const FLOOR_Y = -1.12;
export const ROOF_Y = 0.42;
export const ROAD_Y = -1.38;
export const WHEEL_CENTER = new Vector3(0, -0.3, -0.45);
export const WHEEL_TILT = -0.44; // ~25°: the rim faces up and back toward the driver
export const WHEEL_R = 0.18;
export const GLOVEBOX_ITEM = new Vector3(0.44, -0.27, -0.53);
export const CUPHOLDER_ITEM = new Vector3(0.36, -0.52, -0.1);
export const BARRIER_POINT = new Vector3(0.3, -0.3, 0.12);
export const BEAN_SEAT = new Vector3(0.0, -0.66, 0.92);
export const PICKLE_SEAT = new Vector3(0.82, -0.66, 0.92);
export const DREAMGATE_POS = new Vector3(-0.5, -0.18, 0.2);
export const PAINT = 0xc8b48a; // "regret beige"

export type ItemKind = 'tablet' | 'snack';

export interface GrabItem {
  kind: ItemKind;
  mesh: Mesh;
  home: Vector3;
  homeRotX: number;
  /** Seconds until it reappears at home after being handed back. */
  away: number;
}

const tmp = new Vector3();

/**
 * The minivan interior, built once around the captured head pose: one merged lit mesh (dash, doors, pillars, roof,
 * seats, car seats, hood), one merged unlit mesh (gauges, displays), the steering wheel, the painted rear-view mirror
 * (the back seat's need bubbles), a windshield crack overlay, the Dreamgate in the USB port, headlight beams and two
 * grabbable items. Everything is a child of `group`, which the chapter keeps fixed in the world.
 */
export class Cockpit {
  readonly group = new Group();
  readonly wheelPivot = new Group();
  readonly wheelSpin = new Group();
  readonly items: GrabItem[] = [];
  readonly barrierMarker: Mesh;
  readonly handoffMarker: Mesh;
  readonly dreamgate: Mesh;
  private readonly dreamGlow: Sprite;
  private readonly dreamMat: MeshBasicMaterial;
  private readonly mirrorCanvas = document.createElement('canvas');
  private readonly mirrorTex: CanvasTexture;
  private readonly crackCanvas = document.createElement('canvas');
  private readonly crackTex: CanvasTexture;
  private readonly crackMesh: Mesh;
  private readonly disposables: Array<BufferGeometry | Material | Texture> = [];
  private mirrorKey = '';
  cracks = 0;

  constructor(private readonly names: { kid1: string; kid2: string }) {
    this.group.name = 'drive-cockpit';
    const lit = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
    const unlit = new MeshBasicMaterial({ vertexColors: true });
    this.disposables.push(lit, unlit);

    const b = new GeoBuilder();
    const cx = CAR_CX;
    // Floor, roof and dash.
    b.box(2.0, 0.04, 3.5, 0x2a2622, [cx, FLOOR_Y, 0.55]);
    b.box(2.0, 0.05, 2.75, 0x8a8274, [cx, ROOF_Y + 0.03, 0.92]);
    b.box(1.95, 0.3, 0.5, 0x2b2b31, [cx, -0.36, -0.82]);
    b.box(1.95, 0.04, 0.34, 0x36363d, [cx, -0.21, -0.74]);
    b.box(0.44, 0.1, 0.18, 0x1e1e22, [0, -0.17, -0.62]);
    b.box(1.95, 0.5, 0.4, 0x26262b, [cx, -0.82, -0.96]);
    // Centre console with two cup holders.
    b.box(0.26, 0.5, 0.86, 0x3a3a40, [cx, -0.86, -0.28]);
    b.cyl(0.045, 0.045, 0.02, 0x101012, [cx - 0.05, -0.6, -0.1]);
    b.cyl(0.045, 0.045, 0.02, 0x101012, [cx + 0.07, -0.6, -0.1]);
    // Glove box hanging open.
    b.box(0.34, 0.03, 0.18, 0x45454c, [0.44, -0.4, -0.5], [0.3, 0, 0]);
    b.box(0.34, 0.14, 0.02, 0x17171a, [0.44, -0.33, -0.575]);
    // Steering column.
    b.beam([0, -0.37, -0.5], [0, -0.44, -0.68], 0.06, 0x222226);
    // Front seats: the driver's back is low so turning around never puts the head inside it.
    b.box(0.5, 0.12, 0.5, 0x4a3f55, [0, -0.8, -0.05]);
    b.box(0.52, 0.5, 0.12, 0x4a3f55, [0, -0.62, 0.27]);
    b.box(0.5, 0.12, 0.5, 0x4a3f55, [0.82, -0.8, -0.05]);
    b.box(0.52, 0.78, 0.12, 0x4a3f55, [0.82, -0.36, 0.27]);
    b.box(0.26, 0.18, 0.1, 0x4a3f55, [0.82, 0.12, 0.28]);
    // Rear bench and the two car seats (Bean blue on the left, Pickle pink on the right).
    b.box(1.85, 0.14, 0.55, 0x403648, [cx, -0.74, 0.98]);
    b.box(1.85, 0.72, 0.14, 0x403648, [cx, -0.36, 1.28]);
    for (const [seat, col] of [[BEAN_SEAT, 0x5aa7d8], [PICKLE_SEAT, 0xf28cb8]] as Array<[Vector3, number]>) {
      b.box(0.44, 0.06, 0.42, col, [seat.x, seat.y + 0.02, seat.z]);
      b.box(0.44, 0.62, 0.06, col, [seat.x, seat.y + 0.3, seat.z + 0.22]);
      b.box(0.05, 0.34, 0.42, col, [seat.x - 0.22, seat.y + 0.17, seat.z]);
      b.box(0.05, 0.34, 0.42, col, [seat.x + 0.22, seat.y + 0.17, seat.z]);
    }
    // Doors (below the window line), pillars, headers, tailgate.
    b.box(0.06, 0.95, 2.75, 0x5b5148, [-0.56, -0.62, 0.6]);
    b.box(0.06, 0.95, 2.75, 0x5b5148, [1.36, -0.62, 0.6]);
    b.box(0.1, 0.04, 2.6, 0x6b6158, [-0.53, -0.15, 0.62]);
    b.box(0.1, 0.04, 2.6, 0x6b6158, [1.33, -0.15, 0.62]);
    b.beam([-0.53, -0.18, -0.86], [-0.48, ROOF_Y, -0.43], 0.07, 0x3b3833);
    b.beam([1.33, -0.18, -0.86], [1.28, ROOF_Y, -0.43], 0.07, 0x3b3833);
    for (const z of [0.36, 1.6, 2.22]) {
      b.beam([-0.55, -0.16, z], [-0.53, ROOF_Y, z], z > 2 ? 0.12 : 0.08, 0x3b3833);
      b.beam([1.35, -0.16, z], [1.33, ROOF_Y, z], z > 2 ? 0.12 : 0.08, 0x3b3833);
    }
    b.box(1.9, 0.08, 0.08, 0x3b3833, [cx, 0.4, -0.45]);
    b.box(1.9, 0.04, 0.06, 0x2a2a2e, [cx, -0.19, -0.87]);
    b.box(1.95, 0.75, 0.06, 0x5b5148, [cx, -0.78, 2.26]);
    b.box(1.95, 0.08, 0.08, 0x3b3833, [cx, ROOF_Y, 2.24]);
    // Rear-view mirror frame and stalk.
    b.beam([0.3, ROOF_Y, -0.43], [0.3, 0.34, -0.44], 0.02, 0x111114);
    b.box(0.28, 0.1, 0.025, 0x111114, [0.3, 0.29, -0.445]);
    // Hood, fenders and side mirrors (exterior paint).
    b.box(1.9, 0.08, 1.5, PAINT, [cx, -0.44, -1.66], [0.07, 0, 0]);
    b.box(0.08, 0.3, 1.5, PAINT, [-0.54, -0.6, -1.66]);
    b.box(0.08, 0.3, 1.5, PAINT, [1.34, -0.6, -1.66]);
    b.box(1.9, 0.3, 0.08, 0x8f8062, [cx, -0.62, -2.42]);
    b.box(0.06, 0.13, 0.2, PAINT, [-0.66, -0.08, -0.62]);
    b.box(0.06, 0.13, 0.2, PAINT, [1.46, -0.08, -0.62]);
    // Pickle's drawing taped to the passenger seat back ("PARENT IN A FITE") stays a pink rectangle here.
    b.box(0.2, 0.26, 0.005, 0xfff4d6, [0.82, -0.3, 0.205]);
    const interior = new Mesh(b.build(), lit);
    interior.name = 'cockpit-interior';
    this.disposables.push(interior.geometry);

    const u = new GeoBuilder();
    u.cyl(0.05, 0.05, 0.01, 0xffb347, [-0.09, -0.16, -0.525], [Math.PI / 2 - 0.2, 0, 0], 16);
    u.cyl(0.05, 0.05, 0.01, 0xffb347, [0.09, -0.16, -0.525], [Math.PI / 2 - 0.2, 0, 0], 16);
    u.box(0.004, 0.045, 0.004, 0xff3b3b, [-0.09, -0.145, -0.518], [0, 0, -0.7]);
    u.box(0.004, 0.045, 0.004, 0xff3b3b, [0.09, -0.145, -0.518], [0, 0, 0.9]);
    u.box(0.18, 0.06, 0.01, 0x3fd6c8, [cx, -0.3, -0.566]);
    u.box(0.03, 0.02, 0.01, 0xff5a5a, [-0.2, -0.17, -0.53]); // check engine, always on
    u.box(0.3, 0.07, 0.02, 0xfff4c0, [-0.25, -0.58, -2.45]);
    u.box(0.3, 0.07, 0.02, 0xfff4c0, [1.05, -0.58, -2.45]);
    u.box(0.01, 0.1, 0.16, 0x556677, [-0.7, -0.08, -0.62]);
    u.box(0.01, 0.1, 0.16, 0x556677, [1.5, -0.08, -0.62]);
    const glow = new Mesh(u.build(), unlit);
    glow.name = 'cockpit-glow';
    this.disposables.push(glow.geometry);

    // Steering wheel (fuzzy pink cover, three spokes, horn hub).
    const w = new GeoBuilder();
    w.torus(WHEEL_R, 0.019, 0xd86aa8, [0, 0, 0]);
    w.box(0.34, 0.03, 0.02, 0x2a2a30, [0, -0.01, 0.005]);
    w.box(0.03, 0.17, 0.02, 0x2a2a30, [0, -0.09, 0.005]);
    w.cyl(0.055, 0.055, 0.05, 0x1e1e24, [0, 0, 0.01], [Math.PI / 2, 0, 0], 16);
    w.cyl(0.02, 0.02, 0.052, 0xffcc33, [0, 0.025, 0.012], [Math.PI / 2, 0, 0], 8);
    const wheelMesh = new Mesh(w.build(), lit);
    this.disposables.push(wheelMesh.geometry);
    this.wheelPivot.position.copy(WHEEL_CENTER);
    this.wheelPivot.rotation.x = WHEEL_TILT;
    this.wheelSpin.add(wheelMesh);
    this.wheelPivot.add(this.wheelSpin);

    // Headlight beams and the pool of light on the road (additive, one draw call).
    const beams = new GeoBuilder();
    // Cone tip (+Y) rotated to +Z: the narrow end sits at the headlight, the wide end 26 m ahead.
    for (const x of [-0.25, 1.05]) beams.add(new ConeGeometry(2.2, 26, 12, 1, true), 0xfff1c0, [x, ROAD_Y + 0.75, -15.5], [Math.PI / 2 + 0.02, 0, 0]);
    beams.add(new PlaneGeometry(7, 22), 0xffe7a8, [cx, ROAD_Y + 0.03, -14], [-Math.PI / 2, 0, 0]);
    const beamMat = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.07, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
    const beamMesh = new Mesh(beams.build(), beamMat);
    beamMesh.renderOrder = 5;
    this.disposables.push(beamMat, beamMesh.geometry);

    // The painted rear-view mirror: shows both kids and their need bubbles (Quest 2 friendly, one draw call).
    this.mirrorCanvas.width = 256;
    this.mirrorCanvas.height = 88;
    this.mirrorTex = new CanvasTexture(this.mirrorCanvas);
    const mirrorMat = new MeshBasicMaterial({ map: this.mirrorTex });
    const mirror = new Mesh(new PlaneGeometry(0.26, 0.085), mirrorMat);
    mirror.position.set(0.3, 0.29, -0.43);
    mirror.lookAt(0, 0, 0);
    this.disposables.push(mirrorMat, mirror.geometry, this.mirrorTex);
    this.drawMirror({ pickle: null, bean: null, pickleFill: 0, beanFill: 0, pee: 0 });

    // Windshield crack overlay (drawn into a canvas on each hit; invisible until the first crack).
    this.crackCanvas.width = 1024;
    this.crackCanvas.height = 420;
    this.crackTex = new CanvasTexture(this.crackCanvas);
    const crackMat = new MeshBasicMaterial({ map: this.crackTex, transparent: true, depthWrite: false });
    this.crackMesh = new Mesh(new PlaneGeometry(1.8, 0.72), crackMat);
    this.crackMesh.position.set(cx, 0.105, -0.655);
    this.crackMesh.rotation.x = 0.62;
    this.crackMesh.visible = false;
    this.crackMesh.renderOrder = 20;
    this.disposables.push(crackMat, this.crackMesh.geometry, this.crackTex);

    // The Dreamgate night-light in the B-pillar USB port, beside Bean's seat.
    this.dreamMat = new MeshBasicMaterial({ color: 0x1d5e5c });
    this.dreamgate = new Mesh(new TorusGeometry(0.045, 0.014, 8, 20, Math.PI * 1.25), this.dreamMat);
    this.dreamgate.position.copy(DREAMGATE_POS);
    this.dreamgate.rotation.set(0, Math.PI / 2, 0.6);
    const glowTex = radialTexture('rgba(110,255,245,1)');
    const glowMat = new SpriteMaterial({ map: glowTex, color: 0x3ec9c4, transparent: true, opacity: 0.3, blending: AdditiveBlending, depthWrite: false });
    this.dreamGlow = new Sprite(glowMat);
    this.dreamGlow.scale.setScalar(0.25);
    this.dreamGlow.position.copy(DREAMGATE_POS);
    this.disposables.push(this.dreamMat, this.dreamgate.geometry, glowTex, glowMat);

    // Markers: where to hold your arm (Touching) and where to hand an item back.
    const markMat = new MeshBasicMaterial({ color: 0x3fd6c8, transparent: true, opacity: 0.7, side: DoubleSide, depthWrite: false });
    this.barrierMarker = new Mesh(new RingGeometry(0.12, 0.15, 24), markMat);
    this.barrierMarker.position.copy(BARRIER_POINT);
    this.barrierMarker.rotation.x = -Math.PI / 2;
    this.barrierMarker.visible = false;
    const handMat = new MeshBasicMaterial({ color: 0xffcc33, transparent: true, opacity: 0.7, side: DoubleSide, depthWrite: false });
    this.handoffMarker = new Mesh(new RingGeometry(0.1, 0.13, 24), handMat);
    this.handoffMarker.visible = false;
    this.disposables.push(markMat, handMat, this.barrierMarker.geometry, this.handoffMarker.geometry);

    // Grabbable items: the spare tablet in the glove box and the snack bag in the cup holder.
    const tb = new GeoBuilder();
    tb.box(0.2, 0.14, 0.016, 0xff6fae, [0, 0, 0]);
    tb.box(0.17, 0.11, 0.004, 0x3fd6c8, [0, 0, 0.009]);
    const tablet = new Mesh(tb.build(), lit);
    const sb = new GeoBuilder();
    sb.box(0.12, 0.16, 0.05, 0xffcc33, [0, 0, 0]);
    sb.box(0.122, 0.04, 0.052, 0xe5443a, [0, 0.03, 0]);
    sb.box(0.1, 0.02, 0.03, 0xf4efe6, [0, 0.09, 0]);
    const snack = new Mesh(sb.build(), lit);
    this.disposables.push(tablet.geometry, snack.geometry);
    this.items.push({ kind: 'tablet', mesh: tablet, home: GLOVEBOX_ITEM.clone(), homeRotX: -0.9, away: 0 });
    this.items.push({ kind: 'snack', mesh: snack, home: CUPHOLDER_ITEM.clone(), homeRotX: 0, away: 0 });
    for (const it of this.items) {
      it.mesh.position.copy(it.home);
      it.mesh.rotation.set(it.homeRotX, 0, 0);
    }

    this.group.add(interior, glow, this.wheelPivot, beamMesh, mirror, this.crackMesh, this.dreamgate, this.dreamGlow, this.barrierMarker, this.handoffMarker, tablet, snack);
  }

  /** Wheel visual: + = clockwise from the driver's view. */
  setWheel(deg: number): void {
    this.wheelSpin.rotation.z = (-deg * Math.PI) / 180;
  }

  /** Distance from a world point to the rim, and its angle about the hub in the wheel plane. */
  rimInfo(world: Vector3): { dist: number; angle: number } {
    const p = this.wheelPivot.worldToLocal(tmp.copy(world));
    const r = Math.hypot(p.x, p.y);
    return { dist: Math.hypot(r - WHEEL_R, p.z), angle: Math.atan2(p.y, p.x) };
  }

  /** Rig-local position of a world point. */
  toLocal(world: Vector3, out = new Vector3()): Vector3 {
    return this.group.worldToLocal(out.copy(world));
  }

  /** Add a crack decal (up to 4). */
  addCrack(): void {
    if (this.cracks >= 4) return;
    this.cracks++;
    const g = this.crackCanvas.getContext('2d');
    if (!g) return;
    const W = this.crackCanvas.width, H = this.crackCanvas.height;
    const cxp = W * (0.2 + Math.random() * 0.6), cyp = H * (0.25 + Math.random() * 0.5);
    g.strokeStyle = 'rgba(235,245,255,0.85)';
    g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      let x = cxp, y = cyp;
      const a0 = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
      const len = 60 + Math.random() * 120;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        const a = a0 + (Math.random() - 0.5) * 0.6;
        x += Math.cos(a) * (len / 4);
        y += Math.sin(a) * (len / 4);
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cxp, cyp, 18 + Math.random() * 10, 0, Math.PI * 2);
    g.stroke();
    this.crackTex.needsUpdate = true;
    this.crackMesh.visible = true;
  }

  /** Dreamgate glow, 0..1 (+ the brightness of the end beat above 1). */
  setDreamgate(level: number, t: number): void {
    const k = Math.max(0, Math.min(1.6, level));
    const pulse = 0.85 + 0.15 * Math.sin(t * 3);
    this.dreamMat.color.setRGB(0.11 + 0.45 * k * pulse, 0.37 + 0.6 * k * pulse, 0.36 + 0.6 * k * pulse);
    (this.dreamGlow.material as SpriteMaterial).opacity = Math.min(1, 0.15 + 0.6 * k * pulse);
    this.dreamGlow.scale.setScalar(0.18 + 0.25 * k);
  }

  /** Repaint the mirror (only when the state changed). */
  drawMirror(s: { pickle: NeedStage | null; bean: NeedStage | null; pickleFill: number; beanFill: number; pee: number }): void {
    const key = `${s.pickle}|${s.bean}|${Math.round(s.pickleFill * 10)}|${Math.round(s.beanFill * 10)}|${s.pee}`;
    if (key === this.mirrorKey) return;
    this.mirrorKey = key;
    const g = this.mirrorCanvas.getContext('2d');
    if (!g) return;
    const W = this.mirrorCanvas.width, H = this.mirrorCanvas.height;
    g.fillStyle = '#1d2433';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#2c3548';
    g.fillRect(0, H * 0.62, W, H * 0.38);
    // The mirror is a reflection: Pickle (right rear) appears on the left.
    this.drawKidFace(g, 64, 44, this.names.kid1, s.pickle, s.pickleFill, '#f28cb8', s.pee);
    this.drawKidFace(g, 192, 44, this.names.kid2, s.bean, s.beanFill, '#7fd1b9', 0);
    this.mirrorTex.needsUpdate = true;
  }

  private drawKidFace(g: CanvasRenderingContext2D, x: number, y: number, name: string, stage: NeedStage | null, fill: number, color: string, pee: number): void {
    const ring = stage === 'meltdown' ? '#ff2020' : stage === 'cry' ? '#ff5a5a' : stage === 'whine' ? '#ff9a3a' : stage === 'ask' ? '#ffcc33' : '#3fd6c8';
    g.lineWidth = 6;
    g.strokeStyle = '#3a3344';
    g.beginPath();
    g.arc(x, y, 26, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = ring;
    g.beginPath();
    g.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (stage ? Math.max(0.08, fill) : 1));
    g.stroke();
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, 20, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1a1200';
    const sad = stage === 'cry' || stage === 'meltdown';
    g.fillRect(x - 8, y - 5, 4, 4);
    g.fillRect(x + 4, y - 5, 4, 4);
    g.beginPath();
    if (sad) g.arc(x, y + 12, 7, Math.PI, 0);
    else g.arc(x, y + 4, 7, 0, Math.PI);
    g.lineWidth = 2;
    g.strokeStyle = '#1a1200';
    g.stroke();
    g.font = 'bold 14px "Trebuchet MS", sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#f4efe6';
    g.fillText(name.slice(0, 10), x, H_LABEL);
    if (pee > 0) {
      g.fillStyle = '#ffe066';
      g.font = 'bold 16px "Trebuchet MS", sans-serif';
      g.fillText('!'.repeat(Math.min(4, pee)), x + 38, y - 10);
    }
  }

  /** Put an item back home (with its homecoming delay). */
  returnItem(it: GrabItem, after = 0): void {
    it.away = after;
    it.mesh.visible = after <= 0;
    it.mesh.position.copy(it.home);
    it.mesh.rotation.set(it.homeRotX, 0, 0);
  }

  update(dt: number): void {
    for (const it of this.items) {
      if (it.away > 0) {
        it.away -= dt;
        if (it.away <= 0) this.returnItem(it, 0);
      }
    }
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    this.group.removeFromParent();
  }
}

const H_LABEL = 84;

/** A soft round glow for sprites. */
export function radialTexture(inner: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, inner);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(c);
}

/** For tests: every interaction point the hands must reach (rig-local). */
export const REACH_POINTS: Record<string, Vector3> = {
  wheelTop: WHEEL_CENTER.clone().add(new Vector3(0, WHEEL_R * Math.cos(WHEEL_TILT), -WHEEL_R * Math.sin(-WHEEL_TILT))),
  glovebox: GLOVEBOX_ITEM,
  cupholder: CUPHOLDER_ITEM,
  barrier: BARRIER_POINT,
};

export function makeBox(w: number, h: number, d: number, color: number): Mesh {
  return new Mesh(new BoxGeometry(w, h, d), new MeshStandardMaterial({ color: new Color(color), roughness: 0.8 }));
}
