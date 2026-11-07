import { AlwaysDepth, AlwaysStencilFunc, EqualStencilFunc, KeepStencilOp, Material, ReplaceStencilOp, ShaderMaterial, Vector3 } from 'three';
import type { Door } from '../room/RoomModel';

/**
 * Pure helpers shared by PortalDoor and NapDimension: the door-local basis, the proximity test and the
 * stencil/render-order contract. No DOM, no renderer, so everything here is unit-testable in node.
 *
 * Render-order contract (three.js renders opaque then transparent, each list sorted by renderOrder):
 *   occluder (-20, NotEqual 1, depth only) → masks (-10 + slot) → sub-scenes (-5 + slot) → room (0).
 * Portal `slot` i uses stencil ref i + 1, so two open portals never fight over stencil values and never
 * need a clearing pass. Orders are clamped at MAX_PORTAL_SLOTS - 1 for the (unlikely) sixth portal: refs
 * stay unique, only the ordering is shared.
 *
 * NOTE on the occluder: it is drawn before any mask, when the stencil is still all zero, so its NotEqual-1
 * test passes everywhere and it DOES write the real door's depth inside every rect. That is why the mask
 * also resets depth to the far plane (see `portalMaskMaterialFor`); the occluder's exemption is harmless.
 */

/** Base renderOrder of the stencil masks. Mask of slot i renders at PORTAL_MASK_ORDER + i. */
export const PORTAL_MASK_ORDER = -10;
/** Base renderOrder of the sub-scene. Sub-scene of slot i renders at PORTAL_SCENE_ORDER + i. */
export const PORTAL_SCENE_ORDER = -5;
/** Slots with a distinct render order. Masks occupy [-10, -6], sub-scenes [-5, -1]. */
export const MAX_PORTAL_SLOTS = 5;
/** Head-to-plane distance (m) below which a portal fades to passthrough. */
export const PORTAL_NEAR_DISTANCE = 0.5;
/** Lateral margin (m) added to the door rect for the proximity test. */
export const PORTAL_NEAR_MARGIN = 0.3;

export interface DoorBasis {
  /** Door-rect centre (world). */
  origin: Vector3;
  /** Unit, horizontal: the player's right hand when standing in the room facing the door (= up × normal). */
  right: Vector3;
  /** World up. */
  up: Vector3;
  /** Unit, horizontal: away from the room, into the Land of No Bedtime (= -normal). */
  back: Vector3;
}

const UP = new Vector3(0, 1, 0);

/**
 * Right-handed basis of a door: `right × up = normal`, `back = -normal`. It matches the local axes of an
 * Object3D placed at the door with `lookAt(center + normal)` (local +x = right, +y = up, +z = normal), which
 * is how PortalDoor orients its group. Note `Door.right` from RoomModel is `normal × up`, i.e. the OPPOSITE
 * sign; only this basis is used for portal geometry so the two never mix.
 */
export function doorBasis(door: Pick<Door, 'center' | 'normal'>): DoorBasis {
  const normal = door.normal.clone().setY(0);
  if (normal.lengthSq() < 1e-9) normal.set(0, 0, 1);
  normal.normalize();
  const right = new Vector3().crossVectors(UP, normal).normalize();
  return { origin: door.center.clone(), right, up: UP.clone(), back: new Vector3(0 - normal.x, 0, 0 - normal.z) };
}

/**
 * Safety test: is the head within `distance` of the door plane (or already past it) AND inside the rect's
 * horizontal footprint widened by `margin`? Height is ignored on purpose: a crouching or tall player is
 * still "at the door". Allocation-free; called once per portal per frame.
 */
export function nearPlane(head: Vector3, door: Pick<Door, 'center' | 'normal' | 'width'>, distance = PORTAL_NEAR_DISTANCE, margin = PORTAL_NEAR_MARGIN): boolean {
  const n = door.normal;
  const c = door.center;
  const dx = head.x - c.x;
  const dy = head.y - c.y;
  const dz = head.z - c.z;
  // Signed distance in front of the plane (normal points into the room). Negative = crossed into the portal.
  const along = dx * n.x + dy * n.y + dz * n.z;
  // Horizontal lateral offset along `right = up × normal = (n.z, 0, -n.x)`.
  const lateral = dx * n.z - dz * n.x;
  return along < distance && Math.abs(lateral) <= door.width / 2 + margin;
}

/** Stencil reference value of a portal slot (1-based so 0 stays "no portal"). */
export function portalStencilRef(slot: number): number {
  return Math.max(1, Math.min(255, Math.floor(slot) + 1));
}

function clampSlot(slot: number): number {
  return Math.max(0, Math.min(MAX_PORTAL_SLOTS - 1, Math.floor(slot)));
}

/** renderOrder of a slot's stencil mask: always below every sub-scene order. */
export function portalMaskOrder(slot: number): number {
  return PORTAL_MASK_ORDER + clampSlot(slot);
}

/** renderOrder of a slot's sub-scene: above every mask, below the room (0). */
export function portalSceneOrder(slot: number): number {
  return PORTAL_SCENE_ORDER + clampSlot(slot);
}

const MASK_VERTEX = /* glsl */ `
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  // Push every mask fragment to (just inside) the far plane: with depthFunc = ALWAYS and depthWrite = true this
  // erases whatever the occluder or the real door wrote inside the rect, so the corridor behind the plane
  // passes the depth test. Assumes the default (non-reversed) depth buffer, which XRApp uses.
  p.z = p.w * 0.999998;
  gl_Position = p;
}`;

const MASK_FRAGMENT = /* glsl */ `
void main() {
  gl_FragColor = vec4(0.0);
}`;

/**
 * The stencil mask material of one portal: writes `ref` into the stencil wherever the door rect is, writes no
 * colour, and resets depth to the far plane inside the rect (see `MASK_VERTEX`). Opaque list, so it sorts by
 * renderOrder before every sub-scene and after the depth-only occluder.
 */
export function portalMaskMaterialFor(ref: number): ShaderMaterial {
  const m = new ShaderMaterial({
    vertexShader: MASK_VERTEX,
    fragmentShader: MASK_FRAGMENT,
    colorWrite: false,
    depthTest: true, // must stay on: WebGL only writes depth while the test is enabled
    depthWrite: true,
    depthFunc: AlwaysDepth,
    stencilWrite: true,
    stencilRef: ref,
    stencilFunc: AlwaysStencilFunc,
    stencilFuncMask: 0xff,
    stencilWriteMask: 0xff,
    stencilFail: ReplaceStencilOp,
    stencilZFail: ReplaceStencilOp,
    stencilZPass: ReplaceStencilOp,
  });
  m.name = `portal-mask-${ref}`;
  m.toneMapped = false;
  return m;
}

/** Make `material` draw only where the stencil equals `ref`, without touching the stencil itself. */
export function applyPortalStencil<T extends Material>(material: T, ref: number): T {
  material.stencilWrite = true; // enables the stencil test in three.js; the write mask below keeps it read-only
  material.stencilRef = ref;
  material.stencilFunc = EqualStencilFunc;
  material.stencilFuncMask = 0xff;
  material.stencilWriteMask = 0x00;
  material.stencilFail = KeepStencilOp;
  material.stencilZFail = KeepStencilOp;
  material.stencilZPass = KeepStencilOp;
  return material;
}
