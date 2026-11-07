import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  Quaternion,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomModel } from '../room/RoomModel';

/**
 * The Tipsy Goose: a fully enclosed VR bar drawn over the passthrough. Everything static is ONE merged mesh with baked
 * vertex lighting (one MeshBasicMaterial), every sign is ONE merged mesh on a shared canvas atlas, so the whole room costs
 * two draw calls. Moving props (goose, claw, button, Dreamgate) are separate small meshes. Built in a local frame (player
 * at the origin, facing -Z, the bar ahead) and placed at the player's floor position and heading.
 */

export interface BarSpots {
  /** World positions/headings for the cast (feet). */
  pickle: Vector3;
  bean: Vector3;
  kidsFacing: Vector3;
  brad: Vector3;
  kayden: Vector3;
  bradFacing: Vector3;
  marlene: Vector3;
  marleneFacing: Vector3;
  lady: Vector3;
  /** Patron entrances (feet) and the direction they walk in. */
  entrances: Array<{ position: Vector3; facing: Vector3 }>;
  /** Where Trucker Hats like to stand and throw from. */
  throwSpots: Vector3[];
  /** Gus's walk from the front door to the booth (feet). */
  gusPath: Vector3[];
  /** The player's booth table top centre (chips fly from here). */
  boothTable: Vector3;
  /** The claw machine's chute (prize drop). */
  clawChute: Vector3;
}

export interface BarSceneParts {
  group: Group;
  room: RoomModel;
  spots: BarSpots;
  goose: Group;
  /** Claw machine moving parts: the claw (moves in the cabinet's local frame), the big button, the prize. */
  claw: Group;
  clawFrame: Group;
  button: Mesh;
  dreamgate: Group;
  dreamGlow: Sprite;
  /** Atlas canvas texture (redraw the placemat when the Family Sheet changes). */
  atlas: CanvasTexture;
  neonMat: MeshBasicMaterial;
  lights: PointLight[];
  dispose(): void;
}

export interface FamilyText {
  kid1: string;
  kid2: string;
  parent: string;
}

// Local-frame layout (metres): x right, z toward the player's back; the bar counter is ahead at z = -5.2.
const ROOM = { minX: -5, maxX: 5, minZ: -8, maxZ: 2.6, h: 3.2 };
const COUNTER = { x0: -3.4, x1: 2.4, z: -5.2, d: 0.7, h: 1.1 };
const CLAW = { x: 3.4, z: -2.0 };

interface Light {
  p: Vector3;
  c: Color;
  i: number;
  r: number;
}

/** Baked lighting: a warm key over the floor, a pink neon wash at the sign, a teal spill at the claw machine. */
const BAKE_LIGHTS: Light[] = [
  { p: new Vector3(0, 2.9, -2.2), c: new Color(1.0, 0.82, 0.6), i: 0.75, r: 4.2 },
  { p: new Vector3(-0.5, 2.6, -7.2), c: new Color(1.0, 0.45, 0.75), i: 0.6, r: 2.6 },
  { p: new Vector3(3.2, 1.6, -2.0), c: new Color(0.45, 0.95, 0.9), i: 0.45, r: 1.8 },
  { p: new Vector3(-1.2, 2.4, 0.0), c: new Color(1.0, 0.85, 0.65), i: 0.5, r: 2.5 },
];

class Builder {
  private readonly parts: BufferGeometry[] = [];
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly s = new Vector3(1, 1, 1);
  private readonly up = new Vector3(0, 1, 0);

  add(geo: BufferGeometry, x: number, y: number, z: number, color: number | Color, rotY = 0, glow = false, rotX = 0): void {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    g.deleteAttribute('uv');
    this.q.setFromAxisAngle(this.up, rotY);
    if (rotX) this.q.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), rotX));
    this.m.compose(new Vector3(x, y, z), this.q, this.s);
    g.applyMatrix4(this.m);
    const base = color instanceof Color ? color : new Color(color);
    const pos = g.getAttribute('position') as BufferAttribute;
    const nor = g.getAttribute('normal') as BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const p = new Vector3();
    const n = new Vector3();
    const d = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      n.fromBufferAttribute(nor, i);
      let r = base.r, gg = base.g, b = base.b;
      if (!glow) {
        let lr = 0.34 + 0.12 * n.y, lg = lr, lb = lr + 0.03;
        // darker toward the floor, like light falling off under tables
        const floorShade = 0.75 + 0.25 * Math.min(1, p.y / 1.2);
        for (const L of BAKE_LIGHTS) {
          d.copy(L.p).sub(p);
          const dist = d.length();
          const facing = 0.35 + 0.65 * Math.max(0, n.dot(d.divideScalar(Math.max(1e-4, dist))));
          const a = (L.i * facing) / (1 + (dist / L.r) * (dist / L.r));
          lr += a * L.c.r;
          lg += a * L.c.g;
          lb += a * L.c.b;
        }
        r *= lr * floorShade;
        gg *= lg * floorShade;
        b *= lb * floorShade;
      }
      col[i * 3] = r;
      col[i * 3 + 1] = gg;
      col[i * 3 + 2] = b;
    }
    g.setAttribute('color', new BufferAttribute(col, 3));
    this.parts.push(g);
  }

  box(w: number, h: number, d: number, x: number, y: number, z: number, color: number | Color, rotY = 0, glow = false): void {
    this.add(new BoxGeometry(w, h, d), x, y, z, color, rotY, glow);
  }

  cyl(rt: number, rb: number, h: number, x: number, y: number, z: number, color: number | Color, seg = 12, glow = false): void {
    this.add(new CylinderGeometry(rt, rb, h, seg), x, y, z, color, 0, glow);
  }

  sphere(r: number, x: number, y: number, z: number, color: number | Color, glow = false, sy = 1): void {
    const g = new SphereGeometry(r, 10, 8);
    if (sy !== 1) g.scale(1, sy, 1);
    this.add(g, x, y, z, color, 0, glow);
  }

  build(name: string, transparent = false): Mesh {
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts.length = 0;
    const mesh = new Mesh(merged ?? new BufferGeometry(), new MeshBasicMaterial({ vertexColors: true, transparent }));
    mesh.name = name;
    mesh.matrixAutoUpdate = false;
    return mesh;
  }
}

/** Canvas atlas: 2048 x 1024, regions in pixels. */
const ATLAS_W = 2048, ATLAS_H = 1024;
const REGIONS = {
  neon: { x: 0, y: 0, w: 1024, h: 256 },
  chalk: { x: 1024, y: 0, w: 1024, h: 256 },
  placemat: { x: 0, y: 256, w: 512, h: 384 },
  tv: { x: 512, y: 256, w: 512, h: 288 },
  exit: { x: 1024, y: 256, w: 512, h: 160 },
  claw: { x: 1536, y: 256, w: 512, h: 160 },
  kitchen: { x: 1024, y: 416, w: 512, h: 128 },
  booth: { x: 1536, y: 416, w: 512, h: 128 },
} as const;
type RegionName = keyof typeof REGIONS;

function drawAtlas(g: CanvasRenderingContext2D, fam: FamilyText): void {
  g.clearRect(0, 0, ATLAS_W, ATLAS_H);
  const font = (px: number, bold = true) => `${bold ? 'bold ' : ''}${px}px "Trebuchet MS", "Comic Sans MS", sans-serif`;
  // Neon sign
  {
    const r = REGIONS.neon;
    g.fillStyle = '#1b0f1f';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = font(120);
    g.shadowColor = '#ff4fb4';
    g.shadowBlur = 30;
    g.fillStyle = '#ffd1ef';
    g.fillText('THE TIPSY GOOSE', r.x + r.w / 2, r.y + r.h / 2 + 6);
    g.shadowBlur = 0;
    g.lineWidth = 6;
    g.strokeStyle = '#ff4fb4';
    g.strokeRect(r.x + 14, r.y + 14, r.w - 28, r.h - 28);
  }
  // Chalkboard
  {
    const r = REGIONS.chalk;
    g.fillStyle = '#20302a';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = '#7a5a3a';
    g.lineWidth = 18;
    g.strokeRect(r.x + 9, r.y + 9, r.w - 18, r.h - 18);
    g.fillStyle = '#f2f2e6';
    g.textAlign = 'center';
    g.font = font(64);
    g.fillText('TUESDAY: KIDS EAT FREE', r.x + r.w / 2, r.y + 100);
    g.font = font(44, false);
    g.fillStyle = '#ffcc33';
    g.fillText('(regret extra)', r.x + r.w / 2, r.y + 175);
  }
  // Kids' crayon placemat with the Family Sheet names
  {
    const r = REGIONS.placemat;
    g.fillStyle = '#fbf7ec';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.textAlign = 'center';
    g.font = font(52);
    g.fillStyle = '#e8402a';
    g.fillText(`${fam.kid1.toUpperCase()} & ${fam.kid2.toUpperCase()}`.slice(0, 22), r.x + r.w / 2, r.y + 70);
    // stick family drawing
    g.strokeStyle = '#2a62d6';
    g.lineWidth = 7;
    const fig = (cx: number, h: number) => {
      g.beginPath();
      g.arc(cx, r.y + 300 - h, h * 0.22, 0, Math.PI * 2);
      g.moveTo(cx, r.y + 300 - h * 0.78);
      g.lineTo(cx, r.y + 300 - h * 0.3);
      g.lineTo(cx - h * 0.2, r.y + 300);
      g.moveTo(cx, r.y + 300 - h * 0.3);
      g.lineTo(cx + h * 0.2, r.y + 300);
      g.moveTo(cx - h * 0.25, r.y + 300 - h * 0.6);
      g.lineTo(cx + h * 0.25, r.y + 300 - h * 0.6);
      g.stroke();
    };
    fig(r.x + 150, 170);
    fig(r.x + 300, 110);
    fig(r.x + 400, 85);
    // angry eyebrows on the big one
    g.strokeStyle = '#e8402a';
    g.beginPath();
    g.moveTo(r.x + 125, r.y + 112);
    g.lineTo(r.x + 145, r.y + 122);
    g.moveTo(r.x + 175, r.y + 112);
    g.lineTo(r.x + 155, r.y + 122);
    g.stroke();
    g.fillStyle = '#2a8a3a';
    g.font = font(40);
    const who = fam.parent && fam.parent !== 'Hey' ? fam.parent.toUpperCase() : 'YOU';
    g.fillText(`${who} IN A FITE`, r.x + r.w / 2, r.y + 355);
  }
  // TV: goose hockey
  {
    const r = REGIONS.tv;
    const grd = g.createLinearGradient(0, r.y, 0, r.y + r.h);
    grd.addColorStop(0, '#5fb4ff');
    grd.addColorStop(1, '#d8f0ff');
    g.fillStyle = grd;
    g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = '#ffffff';
    g.fillRect(r.x, r.y + 190, r.w, 98);
    g.fillStyle = '#ff3355';
    g.fillRect(r.x + r.w / 2 - 4, r.y + 190, 8, 98);
    // goose with a stick
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(r.x + 220, r.y + 170, 70, 45, 0, 0, Math.PI * 2);
    g.fill();
    g.fillRect(r.x + 255, r.y + 70, 22, 100);
    g.beginPath();
    g.arc(r.x + 270, r.y + 70, 26, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ff9a1a';
    g.beginPath();
    g.moveTo(r.x + 292, r.y + 62);
    g.lineTo(r.x + 330, r.y + 72);
    g.lineTo(r.x + 292, r.y + 82);
    g.fill();
    g.fillStyle = '#111';
    g.beginPath();
    g.arc(r.x + 276, r.y + 62, 5, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#6b3d1a';
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(r.x + 180, r.y + 160);
    g.lineTo(r.x + 330, r.y + 250);
    g.lineTo(r.x + 380, r.y + 250);
    g.stroke();
    g.fillStyle = '#111';
    g.fillRect(r.x + 400, r.y + 244, 28, 12);
    g.fillStyle = '#ffcc33';
    g.font = font(40);
    g.textAlign = 'left';
    g.fillText('GOOSE HOCKEY  2 - 1', r.x + 20, r.y + 40);
    g.textAlign = 'center';
  }
  // EXIT
  {
    const r = REGIONS.exit;
    g.fillStyle = '#0f6a2a';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = '#d9ffe0';
    g.font = font(110);
    g.fillText('EXIT', r.x + r.w / 2, r.y + r.h / 2 + 8);
  }
  // Claw machine marquee
  {
    const r = REGIONS.claw;
    g.fillStyle = '#3a1a6a';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = '#ffe14d';
    g.font = font(72);
    g.fillText('LUCKY GRAB', r.x + r.w / 2, r.y + 70);
    g.fillStyle = '#7ef9ff';
    g.font = font(34, false);
    g.fillText('every prize a winner*', r.x + r.w / 2, r.y + 125);
  }
  // Kitchen door
  {
    const r = REGIONS.kitchen;
    g.fillStyle = '#3a2a1a';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = '#ffcc33';
    g.font = font(70);
    g.fillText('KITCHEN', r.x + r.w / 2, r.y + r.h / 2 + 4);
  }
  // Booth 7 plaque
  {
    const r = REGIONS.booth;
    g.fillStyle = '#2a1a12';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = '#f2d9a6';
    g.font = font(64);
    g.fillText('BOOTH 7', r.x + r.w / 2, r.y + r.h / 2 + 4);
  }
}

/** A quad mapped to an atlas region. */
function signQuad(region: RegionName, w: number, h: number, x: number, y: number, z: number, rotY: number, rotX = 0): BufferGeometry {
  const r = REGIONS[region];
  const g = new PlaneGeometry(w, h);
  const uv = g.getAttribute('uv') as BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    uv.setXY(i, (r.x + u * r.w) / ATLAS_W, 1 - (r.y + (1 - v) * r.h) / ATLAS_H);
  }
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotY);
  if (rotX) q.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), rotX));
  g.applyMatrix4(new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(1, 1, 1)));
  return g.index ? g.toNonIndexed() : g;
}

export function buildBarScene(parent: Group, origin: Vector3, yaw: number, fam: FamilyText): BarSceneParts {
  const group = new Group();
  group.name = 'tipsy-goose';
  group.position.set(origin.x, 0, origin.z);
  group.rotation.y = yaw;
  parent.add(group);
  group.updateMatrixWorld(true);
  const W = (x: number, y: number, z: number) => group.localToWorld(new Vector3(x, y, z));
  const D = (x: number, z: number) => new Vector3(x, 0, z).applyAxisAngle(new Vector3(0, 1, 0), yaw).normalize();

  const b = new Builder();
  const { minX, maxX, minZ, maxZ, h } = ROOM;
  const RW = maxX - minX, RD = maxZ - minZ, CX = (minX + maxX) / 2, CZ = (minZ + maxZ) / 2;
  // Shell: floor, ceiling, four thick walls overlapping at the corners so nothing of the real room shows through.
  b.box(RW + 0.4, 0.1, RD + 0.4, CX, -0.05, CZ, 0x5a3a26);
  b.box(RW + 0.4, 0.1, RD + 0.4, CX, h + 0.05, CZ, 0x2a1f2a);
  b.box(RW + 0.4, h + 0.2, 0.2, CX, h / 2, minZ - 0.1, 0x6a3a40);
  b.box(RW + 0.4, h + 0.2, 0.2, CX, h / 2, maxZ + 0.1, 0x6a3a40);
  b.box(0.2, h + 0.2, RD + 0.4, minX - 0.1, h / 2, CZ, 0x5d3a46);
  b.box(0.2, h + 0.2, RD + 0.4, maxX + 0.1, h / 2, CZ, 0x5d3a46);
  // wainscot (lower wall panels) and a floor stripe pattern
  b.box(RW, 1.0, 0.04, CX, 0.5, minZ + 0.02, 0x7a4a2a);
  b.box(RW, 1.0, 0.04, CX, 0.5, maxZ - 0.02, 0x7a4a2a);
  b.box(0.04, 1.0, RD, minX + 0.02, 0.5, CZ, 0x7a4a2a);
  b.box(0.04, 1.0, RD, maxX - 0.02, 0.5, CZ, 0x7a4a2a);
  for (let i = 0; i < 10; i++) b.box(0.04, 0.005, RD, minX + 0.5 + i, 0.003, CZ, 0x4a2e1e);
  // ceiling beams
  for (let i = 0; i < 4; i++) b.box(RW, 0.18, 0.25, CX, h - 0.09, minZ + 1.5 + i * 2.8, 0x3a261a);

  // Bar counter with brass rail and foot rail; back bar with shelves, bottles and taps.
  const cx = (COUNTER.x0 + COUNTER.x1) / 2, cw = COUNTER.x1 - COUNTER.x0;
  b.box(cw, COUNTER.h, COUNTER.d, cx, COUNTER.h / 2, COUNTER.z, 0x7b4a28);
  b.box(cw + 0.12, 0.06, COUNTER.d + 0.16, cx, COUNTER.h + 0.03, COUNTER.z, 0x4a2a14);
  b.box(cw, 0.04, 0.04, cx, 0.22, COUNTER.z + COUNTER.d / 2 + 0.12, 0xd9a43a, 0, true);
  b.box(cw, 0.06, 0.02, cx, 0.95, COUNTER.z + COUNTER.d / 2 + 0.01, 0xd9a43a);
  // stools
  for (let i = 0; i < 6; i++) {
    const sx = COUNTER.x0 + 0.5 + i * 0.95, sz = COUNTER.z + 0.85;
    b.cyl(0.2, 0.2, 0.08, sx, 0.74, sz, 0xc8323a, 14);
    b.cyl(0.035, 0.035, 0.7, sx, 0.36, sz, 0x9a9aa6, 6);
    b.cyl(0.18, 0.2, 0.03, sx, 0.015, sz, 0x6a6a76, 10);
  }
  // back bar
  b.box(cw + 0.6, 1.0, 0.5, cx, 0.5, minZ + 0.27, 0x6a3c20);
  for (let s = 0; s < 2; s++) b.box(cw + 0.4, 0.04, 0.3, cx, 1.45 + s * 0.45, minZ + 0.17, 0x4a2a14);
  const bottleColors = [0x3a8a4a, 0x9a3a2a, 0xd9a43a, 0x5a7ad9, 0xe6e6d9, 0x7a2a6a, 0x2a6a6a];
  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < 16; i++) {
      const bx = COUNTER.x0 + 0.1 + i * 0.37 + (s ? 0.18 : 0);
      if (s === 1 && Math.abs(bx - -0.5) < 0.9) continue; // gap under the goose
      b.cyl(0.04, 0.045, 0.24, bx, 1.59 + s * 0.45, minZ + 0.17, bottleColors[(i + s * 3) % bottleColors.length], 6);
    }
  }
  for (let i = 0; i < 4; i++) {
    b.box(0.05, 0.3, 0.05, -1.5 + i * 0.35, COUNTER.h + 0.2, COUNTER.z - 0.15, 0xc0c0c8);
    b.box(0.07, 0.16, 0.07, -1.5 + i * 0.35, COUNTER.h + 0.42, COUNTER.z - 0.15, [0xff6a3a, 0x3ad6ff, 0xffd13a, 0x9a3aff][i], 0, true);
  }
  // goose pole (the goose itself is a separate, spinning mesh)
  b.cyl(0.025, 0.025, 0.9, -0.5, 2.15, minZ + 0.35, 0x9a9aa6, 6);
  // neon frame tubes around the sign
  b.box(3.3, 0.04, 0.04, -0.5, 2.88, minZ + 0.06, 0xff4fb4, 0, true);
  b.box(3.3, 0.04, 0.04, -0.5, 2.82 - 0.9, minZ + 0.06, 0xff4fb4, 0, true);

  // Booth 7 (the player's, to the left) and Booth 8 (Brad's, to the right).
  const booth = (tx: number, tz: number, benchX: number, side: 1 | -1, color: number) => {
    b.box(0.85, 0.05, 1.4, tx, 0.75, tz, 0xc9b28a); // laminate top
    b.box(0.12, 0.72, 0.12, tx, 0.36, tz, 0x3a2a20);
    b.box(0.5, 0.03, 0.5, tx, 0.015, tz, 0x3a2a20);
    b.box(0.5, 0.45, 1.7, benchX, 0.225, tz, color); // seat
    b.box(0.14, 0.75, 1.7, benchX + side * 0.3, 0.75, tz, color); // backrest
    b.box(0.5, 0.06, 1.7, benchX, 0.47, tz, 0x7a1a24);
  };
  booth(-1.05, -0.55, -1.75, -1, 0xa8323e);
  booth(1.95, -0.6, 2.65, 1, 0xa8323e);
  // the Plate (burger with a bite), the drink, the crayon box on Booth 7's table
  b.cyl(0.13, 0.12, 0.02, -0.85, 0.785, -0.2, 0xf4f4f0, 16);
  b.cyl(0.08, 0.08, 0.035, -0.85, 0.815, -0.2, 0xd9a050, 12);
  b.cyl(0.085, 0.085, 0.025, -0.85, 0.845, -0.2, 0x6a3a1a, 12);
  b.sphere(0.08, -0.85, 0.87, -0.2, 0xe0a050, false, 0.5);
  b.cyl(0.04, 0.035, 0.15, -0.75, 0.85, -0.55, 0xe8b04a, 10);
  b.box(0.1, 0.02, 0.06, -1.2, 0.79, -0.95, 0xf2d13a);
  for (let i = 0; i < 4; i++) b.box(0.012, 0.012, 0.08, -1.23 + i * 0.02, 0.81, -0.95, [0x2a62d6, 0xe8402a, 0x2a8a3a, 0x2a4ab6][i]);
  // Brad's booth: green smoothie, Kayden's immaculate broccoli plate
  b.cyl(0.04, 0.035, 0.18, 1.85, 0.86, -0.95, 0x6ad64a, 10);
  b.cyl(0.12, 0.11, 0.02, 1.8, 0.785, -0.25, 0xf4f4f0, 16);
  for (let i = 0; i < 5; i++) b.sphere(0.03, 1.75 + (i % 3) * 0.04, 0.81, -0.28 + Math.floor(i / 3) * 0.05, 0x3a9a3a);
  // more booths along the back wall for depth (empty)
  for (let i = 0; i < 3; i++) booth(-3.6 + i * 2.6, 1.9, -3.6 + i * 2.6 - 0.7, -1, 0x8a2a36);

  // High-top tables
  const highTop = (x: number, z: number) => {
    b.cyl(0.38, 0.38, 0.04, x, 1.05, z, 0x7b4a28, 16);
    b.cyl(0.04, 0.04, 1.03, x, 0.52, z, 0x2a2a30, 6);
    b.cyl(0.25, 0.28, 0.03, x, 0.015, z, 0x2a2a30, 12);
  };
  highTop(-2.4, -2.9);
  highTop(1.2, -3.3);
  highTop(-3.9, -0.6);

  // Claw machine (cabinet static; glass, claw, button and prize are separate).
  const clawYaw = Math.atan2(-CLAW.x, -CLAW.z); // front faces the player
  const clawFrame = new Group();
  clawFrame.position.set(CLAW.x, 0, CLAW.z);
  clawFrame.rotation.y = clawYaw;
  group.add(clawFrame);
  clawFrame.updateMatrixWorld(true);
  const CL = (x: number, y: number, z: number) => new Vector3(x, y, z).applyAxisAngle(new Vector3(0, 1, 0), clawYaw).add(new Vector3(CLAW.x, 0, CLAW.z));
  {
    const base = CL(0, 0.45, 0);
    b.box(0.9, 0.9, 0.9, base.x, base.y, base.z, 0xd93a8a, clawYaw);
    const top = CL(0, 1.95, 0);
    b.box(0.92, 0.25, 0.92, top.x, top.y, top.z, 0xd93a8a, clawYaw);
    for (const [px, pz] of [[-0.43, -0.43], [0.43, -0.43], [-0.43, 0.43], [0.43, 0.43]]) {
      const p = CL(px, 1.38, pz);
      b.box(0.05, 0.96, 0.05, p.x, p.y, p.z, 0xffe14d, clawYaw, true);
    }
    // plush pile inside
    const plush = [0xff7a9a, 0x7ad9ff, 0xffe14d, 0x9aff7a, 0xc89aff, 0xff9a3a];
    for (let i = 0; i < 14; i++) {
      const p = CL(-0.3 + (i % 5) * 0.15, 0.97 + Math.floor(i / 5) * 0.08, -0.25 + ((i * 37) % 5) * 0.1);
      b.sphere(0.085, p.x, p.y, p.z, plush[i % plush.length]);
    }
    // chute
    const ch = CL(0.3, 0.75, 0.46);
    b.box(0.25, 0.25, 0.04, ch.x, ch.y, ch.z, 0x1a1a1a, clawYaw);
    // control panel ledge
    const panel = CL(0, 0.95, 0.52);
    b.box(0.9, 0.1, 0.18, panel.x, panel.y, panel.z, 0x3a1a6a, clawYaw);
    const stick = CL(-0.2, 1.06, 0.52);
    b.cyl(0.012, 0.012, 0.12, stick.x, stick.y, stick.z, 0x222222, 6);
    b.sphere(0.03, stick.x, stick.y + 0.07, stick.z, 0xff3355);
  }

  // Exit door (west wall), kitchen door (north wall, east end), corridor (north-west).
  b.box(0.08, 2.2, 1.6, minX + 0.05, 1.1, -2.5, 0x3a2a3a);
  b.box(0.1, 0.1, 1.8, minX + 0.06, 2.25, -2.5, 0x8a8a96);
  b.box(0.06, 2.1, 0.04, minX + 0.1, 1.05, -2.5, 0x111111);
  b.box(0.04, 0.05, 0.4, minX + 0.11, 1.05, -2.2, 0xc0c0c8);
  b.box(0.04, 0.05, 0.4, minX + 0.11, 1.05, -2.8, 0xc0c0c8);
  b.box(1.0, 2.1, 0.08, 3.9, 1.05, minZ + 0.05, 0x8a6a4a);
  b.box(0.3, 0.3, 0.02, 3.9, 1.5, minZ + 0.1, 0xb8d8e8);
  b.box(0.06, 2.2, 1.0, minX + 0.04, 1.1, -6.4, 0x1a1418);
  // Jukebox (glowing) and a wet-floor cone
  b.box(0.7, 1.4, 0.5, 4.5, 0.7, -5.2, 0x7a2a6a, -Math.PI / 2);
  b.box(0.5, 0.5, 0.02, 4.24, 1.0, -5.2, 0x3ad6ff, Math.PI / 2, true);
  b.add(new ConeGeometry(0.15, 0.5, 8), -2.2, 0.25, -4.0, 0xffd13a);
  // TV backs and ceiling lamps (glowing shades)
  for (const [x, z] of [[-2.5, -2.0], [1.8, -2.4], [-0.8, 0.2]]) {
    b.cyl(0.02, 0.02, 0.5, x, h - 0.25, z, 0x2a2a2a, 4);
    b.add(new ConeGeometry(0.28, 0.25, 12, 1, true), x, h - 0.55, z, 0xffd9a0, 0, true);
  }
  b.box(1.3, 0.78, 0.06, maxX - 0.05, 2.25, -3.2, 0x111111, Math.PI / 2);
  b.box(1.3, 0.78, 0.06, minX + 0.05, 2.25, -4.4, 0x111111, Math.PI / 2);
  b.box(1.3, 0.78, 0.06, 2.6, 2.3, minZ + 0.05, 0x111111);
  // Dart board and trophy case on the walls
  b.add(new CylinderGeometry(0.3, 0.3, 0.04, 20), minX + 0.04, 1.7, 0.6, 0x2a2a2a, Math.PI / 2, false, Math.PI / 2);
  b.add(new CylinderGeometry(0.22, 0.22, 0.045, 20), minX + 0.05, 1.7, 0.6, 0xd9c08a, Math.PI / 2, false, Math.PI / 2);
  b.box(0.4, 1.6, 0.9, maxX - 0.25, 0.8, 0.8, 0x4a3020);

  const shell = b.build('bar-shell');
  shell.matrix.identity();
  group.add(shell);

  // Signs: one mesh on the atlas.
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_W;
  canvas.height = ATLAS_H;
  const ctx2d = canvas.getContext('2d');
  if (ctx2d) drawAtlas(ctx2d, fam);
  const atlas = new CanvasTexture(canvas);
  atlas.colorSpace = SRGBColorSpace;
  const signs = mergeGeometries([
    signQuad('neon', 3.0, 0.75, -0.5, 2.38, minZ + 0.09, 0),
    signQuad('chalk', 1.6, 0.4, 2.0, 1.65, minZ + 0.03, 0),
    signQuad('placemat', 0.36, 0.27, -1.05, 0.778, -0.6, -Math.PI / 2, -Math.PI / 2),
    signQuad('tv', 1.2, 0.68, maxX - 0.09, 2.25, -3.2, -Math.PI / 2),
    signQuad('tv', 1.2, 0.68, minX + 0.09, 2.25, -4.4, Math.PI / 2),
    signQuad('tv', 1.2, 0.68, 2.6, 2.3, minZ + 0.09, 0),
    signQuad('exit', 0.7, 0.22, minX + 0.08, 2.5, -2.5, Math.PI / 2),
    signQuad('kitchen', 0.8, 0.2, 3.9, 2.25, minZ + 0.1, 0),
    signQuad('booth', 0.5, 0.125, -2.04, 1.0, -0.55, Math.PI / 2),
    (() => {
      const p = CL(0, 1.95, 0.465);
      return signQuad('claw', 0.86, 0.24, p.x, p.y, p.z, clawYaw);
    })(),
  ], false);
  const neonMat = new MeshBasicMaterial({ map: atlas, side: DoubleSide });
  const signMesh = new Mesh(signs ?? new BufferGeometry(), neonMat);
  signMesh.name = 'bar-signs';
  group.add(signMesh);

  // Claw machine glass (one transparent box) and moving parts.
  const glass = new Mesh(new BoxGeometry(0.86, 0.93, 0.86), new MeshBasicMaterial({ color: 0x9ad9ff, transparent: true, opacity: 0.14, depthWrite: false }));
  glass.position.set(0, 1.38, 0);
  clawFrame.add(glass);
  const claw = new Group();
  {
    const cb = new Builder();
    cb.cyl(0.006, 0.006, 0.5, 0, 0.25, 0, 0xc0c0c8, 4, true);
    cb.cyl(0.05, 0.05, 0.06, 0, 0, 0, 0xc0c0c8, 10, true);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      cb.box(0.012, 0.12, 0.012, Math.cos(a) * 0.05, -0.07, Math.sin(a) * 0.05, 0xe0e0e8, 0, true);
    }
    const m = cb.build('claw');
    m.matrixAutoUpdate = true;
    claw.add(m);
  }
  claw.position.set(0, 1.7, 0);
  clawFrame.add(claw);
  const button = new Mesh(new SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new MeshBasicMaterial({ color: 0xff2a3a }));
  button.position.set(0.18, 1.0, 0.54);
  button.rotation.x = Math.PI / 2;
  clawFrame.add(button);

  // The Dreamgate: a smiling crescent-moon night-light with a teal glow.
  const dreamgate = new Group();
  const moon = new Mesh(new TorusGeometry(0.07, 0.028, 8, 20, Math.PI * 1.25), new MeshBasicMaterial({ color: 0xfff1a8 }));
  moon.rotation.z = Math.PI * 0.4;
  dreamgate.add(moon);
  const dreamGlow = new Sprite(new SpriteMaterial({ map: glowTexture(), color: 0x3fd6c8, transparent: true, opacity: 0.5, depthWrite: false, blending: AdditiveBlending }));
  dreamGlow.scale.setScalar(0.35);
  dreamgate.add(dreamGlow);
  dreamgate.position.set(0.1, 1.05, 0.05);
  clawFrame.add(dreamgate);

  // The goose: white decoy on a pole above the taps (spins when hit).
  const goose = new Group();
  {
    const gb = new Builder();
    gb.sphere(0.2, 0, 0.16, 0, 0xf4f4f0, true, 0.62);
    gb.add(new SphereGeometry(0.14, 10, 8).scale(0.8, 0.5, 1.2), 0, 0.2, -0.16, 0xe6e6e0, 0, true);
    gb.cyl(0.045, 0.06, 0.32, 0, 0.36, 0.14, 0x222222, 8, true);
    gb.sphere(0.075, 0, 0.53, 0.16, 0x222222, true);
    gb.add(new ConeGeometry(0.035, 0.12, 6), 0, 0.52, 0.27, 0xff9a1a, 0, true, Math.PI / 2);
    gb.sphere(0.015, 0.05, 0.56, 0.2, 0xffffff, true);
    gb.sphere(0.015, -0.05, 0.56, 0.2, 0xffffff, true);
    gb.box(0.03, 0.05, 0.02, 0, 0.04, 0, 0x777777, 0, true);
    const gm = gb.build('goose');
    gm.matrixAutoUpdate = true;
    goose.add(gm);
  }
  goose.position.set(-0.5, 2.6, minZ + 0.35);
  group.add(goose);

  // Two real lights for the characters (the room itself is baked).
  const key = new PointLight(0xffd9a8, 9, 10, 1.5);
  key.position.set(0, 2.8, -2.4);
  const neon = new PointLight(0xff6ac8, 4, 6, 1.6);
  neon.position.set(-0.5, 2.2, -6.6);
  group.add(key, neon);

  // ---------------------------------------------------------------- RoomModel (world coordinates)
  const room = new RoomModel();
  room.source = 'manual';
  room.floorY = 0;
  const inset = 0.25;
  room.bounds = [
    [minX + inset, minZ + inset], [maxX - inset, minZ + inset], [maxX - inset, maxZ - inset], [minX + inset, maxZ - inset],
  ].map(([x, z]) => {
    const p = W(x, 0, z);
    return new Vector2(p.x, p.z);
  });
  const vol = (label: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, ly = 0) => {
    room.addVolume(label, W(x, y, z), new Vector3(sx, sy, sz), yaw + ly, 'manual');
  };
  vol('storage', cx, 0.55, COUNTER.z, cw + 0.1, 1.1, COUNTER.d + 0.1); // counter
  vol('storage', cx, 0.5, minZ + 0.6, cw + 0.6, 1.0, 1.2); // behind the bar (Marlene's side)
  vol('table', -1.05, 0.4, -0.55, 0.85, 0.8, 1.4); // booth 7 table
  vol('storage', -1.75, 0.4, -0.55, 0.65, 0.8, 1.7); // booth 7 bench
  vol('table', 1.95, 0.4, -0.6, 0.85, 0.8, 1.4); // booth 8
  vol('storage', 2.65, 0.4, -0.6, 0.65, 0.8, 1.7);
  vol('table', -2.4, 0.5, -2.9, 0.5, 1.05, 0.5);
  vol('table', 1.2, 0.5, -3.3, 0.5, 1.05, 0.5);
  vol('table', -3.9, 0.5, -0.6, 0.5, 1.05, 0.5);
  vol('storage', CLAW.x, 1.0, CLAW.z, 1.0, 2.0, 1.0, clawYaw);
  vol('storage', 4.5, 0.7, -5.2, 0.6, 1.4, 0.8);
  for (let i = 0; i < 3; i++) vol('storage', -3.6 + i * 2.6 - 0.3, 0.4, 1.9, 1.6, 0.8, 1.8);
  vol('storage', maxX - 0.25, 0.8, 0.8, 0.5, 1.6, 0.9);

  const spots: BarSpots = {
    pickle: W(-1.72, 0.0, -0.95),
    bean: W(-1.72, 0.0, -0.2),
    kidsFacing: D(1, 0),
    brad: W(2.6, 0, -0.95),
    kayden: W(2.6, 0, -0.25),
    bradFacing: D(-1, 0),
    marlene: W(0.6, 0, -6.1),
    marleneFacing: D(0, 1),
    lady: W(-3.9, 0, -1.25),
    entrances: [
      { position: W(3.9, 0, -7.2), facing: D(0, 1) }, // kitchen door
      { position: W(-4.3, 0, -2.5), facing: D(1, 0) }, // front door
      { position: W(-4.3, 0, -6.4), facing: D(1, 0.2) }, // corridor
      { position: W(4.3, 0, -6.6), facing: D(-0.3, 1) }, // kitchen, east side
    ],
    throwSpots: [W(-1.2, 0, -3.9), W(0.4, 0, -4.1), W(2.6, 0, -3.8), W(-3.0, 0, -3.8), W(3.6, 0, -4.3)],
    gusPath: [
      W(-4.3, 0, -2.5), W(-3.2, 0, -3.8), W(-1.0, 0, -4.2), W(0.6, 0, -4.1), W(2.0, 0, -3.9), W(2.1, 0, -2.4), W(0.7, 0, -1.9), W(0.0, 0, -1.0),
    ],
    boothTable: W(-1.05, 0.8, -0.55),
    clawChute: clawFrame.localToWorld(new Vector3(0.3, 0.75, 0.5)),
  };

  return {
    group,
    room,
    spots,
    goose,
    claw,
    clawFrame,
    button,
    dreamgate,
    dreamGlow,
    atlas,
    neonMat,
    lights: [key, neon],
    dispose() {
      group.traverse((o) => {
        const m = o as Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) mat.dispose();
        }
      });
      atlas.dispose();
      parent.remove(group);
    },
  };
}

let glowTex: CanvasTexture | null = null;
/** Soft round glow (shared). */
export function glowTexture(): CanvasTexture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
  }
  glowTex = new CanvasTexture(c);
  return glowTex;
}
