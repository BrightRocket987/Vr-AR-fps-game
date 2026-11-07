import { BoxGeometry, BufferGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Door } from '../room/RoomModel';
import type { NapDimension, NapView } from './NapDimension';
import { nearPlane, portalMaskMaterialFor, portalMaskOrder, PORTAL_NEAR_DISTANCE, PORTAL_NEAR_MARGIN } from './PortalStencil';

export { applyPortalStencil, doorBasis, nearPlane, portalMaskMaterialFor, portalMaskOrder, portalSceneOrder, portalStencilRef, MAX_PORTAL_SLOTS, PORTAL_MASK_ORDER, PORTAL_SCENE_ORDER, type DoorBasis } from './PortalStencil';

export interface PortalDoorOptions {
  /** Accessibility: no shimmer pulse, no frame pulse. */
  reducedFlash?: boolean;
}

/** Seconds for the portal to reveal (open or step back) and to hide (close or step too close). */
const REVEAL_SECONDS = 0.6;
const HIDE_SECONDS = 0.3;
const FRAME_THICKNESS = 0.04;

/**
 * One door of the real room, as a portal. Drop-in for House.ts's DoorVisual (same public surface plus
 * `nearPlayer`).
 *
 * Closed: a teal frame (one merged mesh) and a faint shimmer plane; nothing touches the stencil.
 * Open: a stencil mask the size of the door rect (renderOrder -10 + slot, ref slot + 1) writes the stencil and
 * resets depth inside the rect, then the NapDimension view (renderOrder -5 + slot, stencil EQUAL ref) draws the
 * Land of No Bedtime in world space behind the plane. Draw calls: closed 2, open 6 (frame, mask, 4 sub-scene).
 *
 * Safety: within PORTAL_NEAR_DISTANCE of the plane (inside the rect's footprint + margin) the view fades to
 * passthrough over 0.3 s and the shimmer frosts the frame; it fades back when the player steps away. The frame
 * and shimmer are the only things in front of the plane, 1-2 cm proud of it like every surface overlay in the
 * chapter (the 2 cm stand-off rule); the sub-scene is strictly behind it.
 *
 * Group frame: positioned at the door centre with `lookAt(center + normal)` so local +z = normal (into the
 * room), +x = the player's right when facing the door, matching `doorBasis`.
 */
export class PortalDoor {
  readonly group = new Group();
  readonly door: Door;
  private readonly view: NapView;
  private readonly frameMat: MeshStandardMaterial;
  private readonly frameGeo: BufferGeometry;
  private readonly shimmerMat: MeshBasicMaterial;
  private readonly shimmerGeo: PlaneGeometry;
  private readonly mask: Mesh;
  private readonly maskMat: ShaderMaterial;
  private readonly maskGeo: PlaneGeometry;
  private readonly reducedFlash: boolean;
  private _open = false;
  private _near = false;
  private fade = 0;
  private t = 0;
  private disposed = false;

  constructor(door: Door, world: NapDimension, opts: PortalDoorOptions = {}) {
    this.door = door;
    this.reducedFlash = opts.reducedFlash ?? false;
    const { center, normal, width, height } = door;
    this.group.name = `portal-${door.id}`;
    this.group.position.copy(center);
    this.group.lookAt(center.clone().add(normal));

    // Frame: the DoorVisual look (teal, emissive 0x1a6f68), three boxes merged into one draw call.
    const t = FRAME_THICKNESS;
    const posts = [new BoxGeometry(t, height, t).translate(-width / 2, 0, 0.01), new BoxGeometry(t, height, t).translate(width / 2, 0, 0.01), new BoxGeometry(width + t, t, t).translate(0, height / 2, 0.01)];
    const merged = mergeGeometries(posts, false);
    if (!merged) throw new Error('PortalDoor: could not merge the frame');
    for (const p of posts) p.dispose();
    this.frameGeo = merged;
    this.frameMat = new MeshStandardMaterial({ color: 0x3fd6c8, emissive: 0x1a6f68, emissiveIntensity: 0.6, roughness: 0.6 });
    const frame = new Mesh(this.frameGeo, this.frameMat);
    frame.name = 'portal-frame';

    // Shimmer: a faint teal veil over the real door while closed; frosts the opening when the player is too close.
    this.shimmerGeo = new PlaneGeometry(width - t, height - t);
    this.shimmerMat = new MeshBasicMaterial({ color: 0x3fd6c8, transparent: true, opacity: 0, depthWrite: false });
    const shimmer = new Mesh(this.shimmerGeo, this.shimmerMat);
    shimmer.name = 'portal-shimmer';
    shimmer.position.z = 0.02;

    // Stencil mask + the view behind the plane. Both hidden until the portal opens.
    this.view = world.createView(door);
    this.maskGeo = new PlaneGeometry(width, height);
    this.maskMat = portalMaskMaterialFor(this.view.ref);
    this.mask = new Mesh(this.maskGeo, this.maskMat);
    this.mask.name = 'portal-mask';
    this.mask.renderOrder = portalMaskOrder(this.view.slot);
    this.mask.visible = false;
    this.view.setFade(0);

    this.group.add(frame, shimmer, this.mask, this.view.group);
  }

  get open(): boolean {
    return this._open;
  }

  setOpen(v: boolean): void {
    this._open = v;
  }

  /** True while the head is within 0.5 m of the plane inside the rect footprint: the portal is faded out. */
  get nearPlayer(): boolean {
    return this._near;
  }

  /** 0 = passthrough, 1 = fully revealed. Exposed for tests and diagnostics. */
  get revealed(): number {
    return this.fade;
  }

  /** Stencil reference value this portal uses (slot + 1). */
  get stencilRef(): number {
    return this.view.ref;
  }

  /** Draw calls this portal costs right now. */
  get drawCalls(): number {
    return 1 + (this.shimmerMat.opacity > 0.002 ? 1 : 0) + (this.mask.visible ? 1 + this.view.drawCalls : 0);
  }

  update(dt: number, headPosition: Vector3): void {
    if (this.disposed) return;
    this.t += dt;
    // Hysteresis so a head hovering at the threshold does not flicker the portal.
    const dist = this._near ? PORTAL_NEAR_DISTANCE + 0.15 : PORTAL_NEAR_DISTANCE;
    const margin = this._near ? PORTAL_NEAR_MARGIN + 0.15 : PORTAL_NEAR_MARGIN;
    this._near = nearPlane(headPosition, this.door, dist, margin);

    const target = this._open && !this._near ? 1 : 0;
    const rate = target > this.fade ? 1 / REVEAL_SECONDS : 1 / HIDE_SECONDS;
    const step = rate * dt;
    this.fade = this.fade < target ? Math.min(target, this.fade + step) : Math.max(target, this.fade - step);
    const live = this.fade > 0.001;
    this.mask.visible = live;
    this.view.setFade(this.fade);
    if (live) this.view.update(dt);

    // Frame glow: brighter while revealed, with a slow pulse unless reduced flash is on.
    const pulse = this.reducedFlash ? 0 : 0.12 * Math.sin(this.t * 2.5);
    this.frameMat.emissiveIntensity = 0.6 + 0.6 * this.fade + pulse * this.fade;

    // Shimmer: faint while closed, a frosted veil while the player stands too close, gone while revealed.
    const shimmerTarget = !this._open ? 0.07 + (this.reducedFlash ? 0 : 0.03 * Math.sin(this.t * 1.3)) : this._near ? 0.14 : 0;
    this.shimmerMat.opacity += (shimmerTarget - this.shimmerMat.opacity) * Math.min(1, 6 * dt);
    if (this.shimmerMat.opacity < 0.002) this.shimmerMat.opacity = 0;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.view.dispose();
    this.group.removeFromParent();
    this.group.clear();
    this.frameGeo.dispose();
    this.frameMat.dispose();
    this.shimmerGeo.dispose();
    this.shimmerMat.dispose();
    this.maskGeo.dispose();
    this.maskMat.dispose();
  }
}
