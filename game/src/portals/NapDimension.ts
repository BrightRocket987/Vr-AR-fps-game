import { AdditiveBlending, BoxGeometry, BufferGeometry, CapsuleGeometry, Color, DynamicDrawUsage, Euler, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, OctahedronGeometry, PlaneGeometry, Quaternion, SphereGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Door } from '../room/RoomModel';
import { applyPortalStencil, portalSceneOrder, portalStencilRef } from './PortalStencil';

/**
 * The Land of No Bedtime as seen through a door: a 6 m corridor of oversized crib bars under a dark lilac
 * fog, a slowly turning star mobile, a handful of idle zombie-kid silhouettes and a moon glow at the far end.
 *
 * One NapDimension owns the geometry (built once, merged per material); `createView(door)` hands out a
 * per-portal view whose meshes reference that geometry with their own stencil-tested materials. A view is
 * 4 draw calls: static shell + bars, mobile, kids (one InstancedMesh), moon glow. Everything is unlit
 * `MeshBasicMaterial` with vertex colours and fog baked into those colours, because `scene.fog` would also
 * tint the passthrough room. All geometry lives strictly behind the door plane (view-local z < 0).
 *
 * View-local frame: origin at the door-rect centre, +x = player's right when facing the door, +y up,
 * +z toward the room (so the corridor extends along -z). Matches PortalDoor.group / `doorBasis`.
 */

export interface NapDimensionOptions {
  /** Idle zombie-kids per view, clamped to 4..6. Default 5. */
  kids?: number;
  /** Corridor length in metres. Default 6. */
  length?: number;
  /** Accessibility: no breathing moon, slower mobile. */
  reducedFlash?: boolean;
}

export interface NapView {
  /** Add this under the portal's door-aligned group. Visibility and opacity are driven by `setFade`. */
  readonly group: Group;
  /** 0-based portal slot (unique while live). */
  readonly slot: number;
  /** Stencil reference this view's materials test for. */
  readonly ref: number;
  /** renderOrder of the sub-scene meshes (the moon glow uses +0.5 so it draws after the far wall). */
  readonly renderOrder: number;
  /** Draw calls this view costs while visible. */
  readonly drawCalls: number;
  /** 0 = passthrough (hidden), 1 = fully visible. */
  setFade(fade: number): void;
  /** Gentle idle animation. Skip when the view is hidden. */
  update(dt: number): void;
  /** Frees the slot and the per-view materials. The shared geometry stays with the NapDimension. */
  dispose(): void;
}

/** Fog colour and density (baked). */
export const NAP_FOG_COLOR = 0x2a1f3d;
const FOG_DENSITY = 0.33;
const CORRIDOR_WIDTH = 3.2;
const CORRIDOR_HEIGHT = 3.0;
/** Gap between the door plane and the first corridor surface: nothing may touch z = 0. */
const PLANE_GAP = 0.05;
const BAR_STEP = 0.45;

/** Deterministic layout of up to six kids: [x, z, yaw, scale]. z is depth behind the plane (negative). */
const KID_LAYOUT: ReadonlyArray<readonly [number, number, number, number]> = [
  [-0.9, -1.6, 0.25, 1.0],
  [0.8, -2.3, -0.2, 1.1],
  [-0.3, -3.4, 0.1, 0.95],
  [1.1, -4.2, -0.35, 1.15],
  [-1.0, -4.9, 0.3, 1.05],
  [0.35, -5.3, 0.0, 1.0],
];

interface SharedGeometry {
  shell: BufferGeometry;
  mobile: BufferGeometry;
  kid: BufferGeometry;
  moon: BufferGeometry;
}

const _fog = new Color(NAP_FOG_COLOR);
const _c = new Color();

function fogAt(depth: number): number {
  return 1 - Math.exp(-FOG_DENSITY * Math.max(0, depth));
}

/** Give `geo` a per-vertex colour: `base` mixed toward the fog colour by how far behind the plane the vertex is. */
function paint(geo: BufferGeometry, base: number, fog = true): BufferGeometry {
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const b = new Color(base);
  for (let i = 0; i < pos.count; i++) {
    _c.copy(b);
    if (fog) _c.lerp(_fog, fogAt(-pos.getZ(i)));
    colors[i * 3] = _c.r;
    colors[i * 3 + 1] = _c.g;
    colors[i * 3 + 2] = _c.b;
  }
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geo;
}

function merge(parts: BufferGeometry[], name: string): BufferGeometry {
  // mergeGeometries refuses a mix of indexed and non-indexed inputs (PolyhedronGeometry is non-indexed).
  const allIndexed = parts.every((p) => p.index !== null);
  const inputs = allIndexed ? parts : parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const merged = mergeGeometries(inputs, false);
  if (!merged) throw new Error(`NapDimension: could not merge ${name}`);
  for (const p of parts) p.dispose();
  if (!allIndexed) for (const p of inputs) p.dispose();
  merged.name = name;
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, color: number): BufferGeometry {
  return paint(new BoxGeometry(w, h, d).translate(x, y, z), color);
}

/** Corridor shell (floor tiles, walls, ceiling, far wall) plus the crib bars and rails: one geometry. */
function buildShell(length: number, floorY: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const W = CORRIDOR_WIDTH, H = CORRIDOR_HEIGHT, L = length;
  const z0 = -PLANE_GAP; // nearest surface
  const zFar = z0 - L;
  // Floor tiles: checkerboard of two lilacs, 6 columns x 0.5 m rows.
  const cols = 6, tile = W / cols, rows = Math.ceil(L / 0.5);
  for (let r = 0; r < rows; r++) {
    const depth = Math.min(0.5, L - r * 0.5);
    for (let c = 0; c < cols; c++) {
      const g = new PlaneGeometry(tile, depth).rotateX(-Math.PI / 2);
      g.translate(-W / 2 + tile * (c + 0.5), floorY, z0 - r * 0.5 - depth / 2);
      parts.push(paint(g, (r + c) % 2 === 0 ? 0x6b5a8e : 0x4a3b6e));
    }
  }
  // Side walls, ceiling and the far wall (far wall is pure fog so the corridor dissolves).
  const segs = Math.max(2, Math.round(L / 0.5));
  for (const side of [-1, 1]) {
    const g = new PlaneGeometry(L, H, segs, 1).rotateY(side > 0 ? -Math.PI / 2 : Math.PI / 2);
    g.translate((side * W) / 2, floorY + H / 2, z0 - L / 2);
    parts.push(paint(g, 0x3b2d58));
  }
  const ceil = new PlaneGeometry(W, L, 1, segs).rotateX(Math.PI / 2);
  ceil.translate(0, floorY + H, z0 - L / 2);
  parts.push(paint(ceil, 0x2f2347));
  const far = new PlaneGeometry(W, H);
  far.translate(0, floorY + H / 2, zFar);
  parts.push(paint(far, NAP_FOG_COLOR, false));
  // Oversized crib bars along both walls with a top and a bottom rail.
  const barH = H * 0.82;
  const barX = W / 2 - 0.22;
  const cream = 0xd9c8b4;
  for (const side of [-1, 1]) {
    for (let z = z0 - 0.35; z > zFar + 0.1; z -= BAR_STEP) parts.push(box(0.11, barH, 0.11, side * barX, floorY + barH / 2, z, cream));
    parts.push(box(0.16, 0.16, L - 0.3, side * barX, floorY + barH, z0 - L / 2, cream));
    parts.push(box(0.14, 0.14, L - 0.3, side * barX, floorY + 0.28, z0 - L / 2, cream));
  }
  return merge(parts, 'nap-shell');
}

/** A star mobile: hub, four arms, hanging stars. Built around its own origin; placed and rotated per view. */
function buildMobile(depth: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const fogZ = -depth; // bake the fog of the depth it hangs at
  const hub = new SphereGeometry(0.09, 8, 6);
  hub.translate(0, 0, fogZ);
  parts.push(paint(hub, 0x8b7aa8));
  const arms = 4;
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI;
    const arm = new BoxGeometry(1.3, 0.03, 0.03).rotateY(a);
    arm.translate(0, 0, fogZ);
    parts.push(paint(arm, 0x4a3b63));
    for (const s of [-1, 1]) {
      const x = Math.cos(a) * 0.62 * s, z = -Math.sin(a) * 0.62 * s;
      const string = new BoxGeometry(0.01, 0.32, 0.01);
      string.translate(x, -0.16, z + fogZ);
      parts.push(paint(string, 0x4a3b63));
      const star = new OctahedronGeometry(0.15, 0).scale(1, 1.35, 0.4).rotateY(a + s * 0.4);
      star.translate(x, -0.36, z + fogZ);
      parts.push(paint(star, i % 2 === 0 ? 0xffe8a3 : 0xdcc8ff));
    }
  }
  const g = merge(parts, 'nap-mobile');
  g.translate(0, 0, depth); // back to the mobile's own origin; colours keep the baked fog
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

/** One zombie-kid silhouette: capsule body, sphere head, two forward arms, glowing eyes. Feet at y = 0, faces +z. */
function buildKid(): BufferGeometry {
  // Silhouettes stand in the fog band: mix the dark body toward the fog once, here, instead of per instance.
  const body = new Color(0x1a1326).lerp(_fog, 0.45).getHex();
  const parts: BufferGeometry[] = [];
  const torso = new CapsuleGeometry(0.17, 0.42, 3, 8);
  torso.translate(0, 0.38, 0);
  parts.push(paint(torso, body, false));
  const head = new SphereGeometry(0.21, 10, 7);
  head.translate(0, 0.95, 0);
  parts.push(paint(head, body, false));
  for (const s of [-1, 1]) {
    const arm = new CapsuleGeometry(0.045, 0.3, 2, 6).rotateX(Math.PI / 2);
    arm.translate(s * 0.2, 0.62, 0.18);
    parts.push(paint(arm, body, false));
    const eye = new SphereGeometry(0.035, 6, 4);
    eye.translate(s * 0.075, 0.98, 0.18);
    parts.push(paint(eye, 0xfff0a0, false));
  }
  return merge(parts, 'nap-kid');
}

/**
 * A radial glow disc with vertex alpha (RGBA colour attribute): bright core, halo fading to zero. Drawn
 * additively so it reads as light on the fog wall without a texture or a custom shader.
 */
function buildMoon(coreRadius: number, haloRadius: number, segments = 28): BufferGeometry {
  const positions: number[] = [0, 0, 0];
  const colors: number[] = [];
  const normals: number[] = [0, 0, 1];
  const uvs: number[] = [0.5, 0.5];
  const core = new Color(0xfff4c8), rim = new Color(0x8f7ad1);
  colors.push(core.r, core.g, core.b, 1);
  for (let ring = 0; ring < 2; ring++) {
    const r = ring === 0 ? coreRadius : haloRadius;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      positions.push(Math.cos(a) * r, Math.sin(a) * r, 0);
      normals.push(0, 0, 1);
      uvs.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
      if (ring === 0) colors.push(core.r, core.g, core.b, 0.9);
      else colors.push(rim.r, rim.g, rim.b, 0);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = 1 + i, b = 1 + ((i + 1) % segments);
    index.push(0, a, b);
    const c = 1 + segments + i, d = 1 + segments + ((i + 1) % segments);
    index.push(a, c, d, a, d, b);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  g.setAttribute('color', new Float32BufferAttribute(colors, 4));
  g.setIndex(index);
  g.name = 'nap-moon';
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

class View implements NapView {
  readonly group = new Group();
  readonly ref: number;
  readonly renderOrder: number;
  readonly drawCalls = 4;
  private readonly worldMat: MeshBasicMaterial;
  private readonly moonMat: MeshBasicMaterial;
  private readonly mobile: Mesh;
  private readonly kids: InstancedMesh;
  private readonly moon: Mesh;
  private readonly kidCount: number;
  private readonly phase: number;
  private t = 0;
  private fade = 1;
  private disposed = false;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly e = new Euler();
  private readonly p = new Vector3();
  private readonly s = new Vector3();

  constructor(
    readonly slot: number,
    door: Door,
    geo: SharedGeometry,
    private readonly opts: Required<NapDimensionOptions>,
    private readonly onDispose: (slot: number) => void,
  ) {
    this.ref = portalStencilRef(slot);
    this.renderOrder = portalSceneOrder(slot);
    this.phase = slot * 1.7;
    this.kidCount = Math.min(KID_LAYOUT.length, this.opts.kids);
    this.group.name = `nap-view-${slot}`;
    // The door-rect centre is the view origin; the corridor floor sits at the door's bottom edge.
    const floorY = -door.height / 2;
    this.worldMat = applyPortalStencil(new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1 }), this.ref);
    this.worldMat.name = `nap-world-${slot}`;
    this.moonMat = applyPortalStencil(new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: AdditiveBlending, depthWrite: false }), this.ref);
    this.moonMat.name = `nap-moon-${slot}`;
    this.moonMat.toneMapped = false;

    const shell = new Mesh(geo.shell, this.worldMat);
    shell.name = 'nap-shell';
    shell.position.y = floorY;
    shell.renderOrder = this.renderOrder;

    this.mobile = new Mesh(geo.mobile, this.worldMat);
    this.mobile.name = 'nap-mobile';
    // Hub just above the door's top edge so the stars (0.36 m below) hang in view through the opening.
    this.mobile.position.set(0, floorY + Math.min(CORRIDOR_HEIGHT - 0.45, door.height + 0.25), -2.2);
    this.mobile.renderOrder = this.renderOrder;

    this.kids = new InstancedMesh(geo.kid, this.worldMat, this.kidCount);
    this.kids.name = 'nap-kids';
    this.kids.instanceMatrix.setUsage(DynamicDrawUsage);
    this.kids.position.y = floorY;
    this.kids.renderOrder = this.renderOrder;
    this.kids.frustumCulled = false; // bobbing instances; one draw either way
    this.poseKids();
    this.kids.computeBoundingBox();
    this.kids.computeBoundingSphere();

    this.moon = new Mesh(geo.moon, this.moonMat);
    this.moon.name = 'nap-moon';
    this.moon.position.set(0, floorY + CORRIDOR_HEIGHT * 0.66, -PLANE_GAP - this.opts.length + 0.03);
    this.moon.renderOrder = this.renderOrder + 0.5; // after the far wall it hangs on (no depth write)

    this.group.add(shell, this.mobile, this.kids, this.moon);
    this.group.visible = true;
  }

  private poseKids(): void {
    for (let i = 0; i < this.kidCount; i++) {
      const [x, z, yaw, scale] = KID_LAYOUT[i];
      const ph = this.phase + i * 1.3;
      const bob = 0.02 + 0.02 * Math.sin(this.t * 1.6 + ph); // never below the floor
      const sway = 0.06 * Math.sin(this.t * 0.9 + ph);
      this.p.set(x, bob, z);
      this.e.set(0, yaw + sway, 0.04 * Math.sin(this.t * 1.1 + ph));
      this.q.setFromEuler(this.e);
      this.s.setScalar(scale);
      this.m.compose(this.p, this.q, this.s);
      this.kids.setMatrixAt(i, this.m);
    }
    this.kids.instanceMatrix.needsUpdate = true;
  }

  setFade(fade: number): void {
    const f = Math.max(0, Math.min(1, fade));
    if (f === this.fade && this.group.visible === (f > 0.001)) return;
    this.fade = f;
    this.worldMat.opacity = f;
    this.moonMat.opacity = f;
    this.group.visible = f > 0.001;
  }

  update(dt: number): void {
    if (this.disposed || !this.group.visible) return;
    this.t += dt;
    this.mobile.rotation.y += (this.opts.reducedFlash ? 0.12 : 0.25) * dt;
    this.poseKids();
    // The moon breathes 1.00-1.03 at 0.25 Hz, like the portal in the design doc; off for reduced flash.
    if (!this.opts.reducedFlash) this.moon.scale.setScalar(1 + 0.03 * Math.sin(this.t * Math.PI * 0.5));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.group.removeFromParent();
    this.group.clear();
    this.kids.dispose();
    this.worldMat.dispose();
    this.moonMat.dispose();
    this.onDispose(this.slot);
  }
}

export class NapDimension {
  private readonly opts: Required<NapDimensionOptions>;
  private geo: SharedGeometry | null = null;
  private readonly slots = new Set<number>();

  constructor(opts: NapDimensionOptions = {}) {
    this.opts = {
      kids: Math.max(4, Math.min(6, Math.round(opts.kids ?? 5))),
      length: Math.max(3, Math.min(10, opts.length ?? 6)),
      reducedFlash: opts.reducedFlash ?? false,
    };
  }

  /** Number of views currently live (each holds a stencil slot). */
  get live(): number {
    return this.slots.size;
  }

  /** Corridor length in metres (behind the door plane). */
  get length(): number {
    return this.opts.length;
  }

  private shared(): SharedGeometry {
    if (!this.geo) {
      this.geo = {
        shell: buildShell(this.opts.length, 0),
        mobile: buildMobile(2.2),
        kid: buildKid(),
        moon: buildMoon(0.45, 1.7),
      };
    }
    return this.geo;
  }

  private allocSlot(): number {
    let slot = 0;
    while (this.slots.has(slot)) slot++;
    this.slots.add(slot);
    return slot;
  }

  /** One view per portal. Add `view.group` under a group oriented like `doorBasis(door)` (see PortalDoor). */
  createView(door: Door): NapView {
    const slot = this.allocSlot();
    return new View(slot, door, this.shared(), this.opts, (s) => this.slots.delete(s));
  }

  /** Dispose the shared geometry. Dispose live views first (PortalDoor.dispose does). */
  dispose(): void {
    if (this.geo) {
      this.geo.shell.dispose();
      this.geo.mobile.dispose();
      this.geo.kid.dispose();
      this.geo.moon.dispose();
      this.geo = null;
    }
    this.slots.clear();
  }
}
