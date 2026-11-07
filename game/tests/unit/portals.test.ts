import { describe, expect, it } from 'vitest';
import { AlwaysDepth, Box3, EqualStencilFunc, Mesh, MeshBasicMaterial, ReplaceStencilOp, Vector3 } from 'three';
import type { Door } from '../../src/room/RoomModel';
import { NapDimension } from '../../src/portals/NapDimension';
import { MAX_PORTAL_SLOTS, PortalDoor, applyPortalStencil, doorBasis, nearPlane, portalMaskOrder, portalSceneOrder, portalStencilRef } from '../../src/portals/PortalDoor';

/** A 0.9 x 2.0 m door at z = -2.5 whose normal faces +z (the room is on the +z side). */
function makeDoor(over: Partial<Door> = {}): Door {
  const normal = new Vector3(0, 0, 1);
  return {
    id: 'test-door',
    center: new Vector3(0, 1, -2.5),
    normal,
    right: new Vector3().crossVectors(normal, new Vector3(0, 1, 0)).normalize(),
    width: 0.9,
    height: 2.0,
    kidsRoom: false,
    source: 'virtual',
    ...over,
  };
}

describe('doorBasis', () => {
  it('is a right-handed frame with +x = the player right hand when facing the door and back = -normal', () => {
    const d = makeDoor();
    const b = doorBasis(d);
    expect(b.origin.toArray()).toEqual([0, 1, -2.5]);
    expect(b.right.toArray().map((v) => Math.round(v * 1e6) / 1e6)).toEqual([1, 0, 0]);
    expect(b.up.toArray()).toEqual([0, 1, 0]);
    expect(b.back.toArray().map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 0, -1]);
    // right x up = normal (right-handed), and RoomModel's Door.right is the opposite sign.
    const cross = new Vector3().crossVectors(b.right, b.up);
    expect(cross.distanceTo(d.normal)).toBeLessThan(1e-6);
    expect(b.right.dot(d.right)).toBeCloseTo(-1, 6);
  });

  it('stays orthonormal for a rotated door and ignores a tilted normal', () => {
    const normal = new Vector3(1, 0.2, 1);
    const b = doorBasis({ center: new Vector3(3, 1, 4), normal });
    expect(b.right.length()).toBeCloseTo(1, 6);
    expect(b.back.length()).toBeCloseTo(1, 6);
    expect(b.back.y).toBe(0);
    expect(b.right.dot(b.back)).toBeCloseTo(0, 6);
    expect(b.right.dot(b.up)).toBeCloseTo(0, 6);
    expect(b.back.x).toBeCloseTo(-Math.SQRT1_2, 6);
  });
});

describe('nearPlane', () => {
  const d = makeDoor();
  it('is false two metres into the room and true 0.3 m in front of the centre', () => {
    expect(nearPlane(new Vector3(0, 1.6, -0.5), d)).toBe(false);
    expect(nearPlane(new Vector3(0, 1.6, -2.2), d)).toBe(true);
  });
  it('uses the rect footprint plus the margin, not the whole plane', () => {
    // half width 0.45 + margin 0.3 = 0.75
    expect(nearPlane(new Vector3(0.6, 1.6, -2.2), d)).toBe(true);
    expect(nearPlane(new Vector3(0.8, 1.6, -2.2), d)).toBe(false);
    expect(nearPlane(new Vector3(-1.5, 1.6, -2.2), d)).toBe(false);
  });
  it('ignores height and treats a crossed plane as near', () => {
    expect(nearPlane(new Vector3(0, 0.3, -2.2), d)).toBe(true);
    expect(nearPlane(new Vector3(0, 2.4, -2.2), d)).toBe(true);
    expect(nearPlane(new Vector3(0, 1.6, -2.7), d)).toBe(true);
  });
  it('is strict at the distance threshold and honours custom thresholds', () => {
    expect(nearPlane(new Vector3(0, 1.6, -2.0), d)).toBe(false); // exactly 0.5 m
    expect(nearPlane(new Vector3(0, 1.6, -2.0), d, 0.65)).toBe(true);
    expect(nearPlane(new Vector3(0.8, 1.6, -2.2), d, 0.5, 0.45)).toBe(true);
  });
  it('works for a door facing -x', () => {
    const side = makeDoor({ center: new Vector3(2, 1, 0), normal: new Vector3(-1, 0, 0) });
    expect(nearPlane(new Vector3(1.7, 1.6, 0.2), side)).toBe(true);
    expect(nearPlane(new Vector3(1.7, 1.6, 1.0), side)).toBe(false);
    expect(nearPlane(new Vector3(0.5, 1.6, 0), side)).toBe(false);
  });
});

describe('stencil contract', () => {
  it('gives every slot a unique ref and keeps all masks before all sub-scenes, all below the room', () => {
    const refs = new Set<number>();
    for (let s = 0; s < 7; s++) refs.add(portalStencilRef(s));
    expect(refs.size).toBe(7);
    expect(portalStencilRef(0)).toBe(1);
    const maxMask = Math.max(...Array.from({ length: 7 }, (_, s) => portalMaskOrder(s)));
    const minScene = Math.min(...Array.from({ length: 7 }, (_, s) => portalSceneOrder(s)));
    expect(maxMask).toBeLessThan(minScene);
    expect(portalSceneOrder(MAX_PORTAL_SLOTS + 2)).toBeLessThan(0);
    expect(portalSceneOrder(MAX_PORTAL_SLOTS + 2) + 0.5).toBeLessThan(0); // the moon glow offset
    expect(portalMaskOrder(1)).toBe(portalMaskOrder(0) + 1);
  });

  it('applyPortalStencil tests EQUAL ref and never writes the stencil', () => {
    const m = applyPortalStencil(new MeshBasicMaterial(), 2);
    expect(m.stencilWrite).toBe(true);
    expect(m.stencilFunc).toBe(EqualStencilFunc);
    expect(m.stencilRef).toBe(2);
    expect(m.stencilWriteMask).toBe(0);
  });
});

describe('NapDimension', () => {
  it('builds a 4-draw-call view entirely behind the door plane, stencil-tested on its slot ref', () => {
    const nap = new NapDimension();
    const door = makeDoor();
    const view = nap.createView(door);
    expect(view.slot).toBe(0);
    expect(view.ref).toBe(1);
    expect(view.drawCalls).toBe(4);
    const meshes = view.group.children.filter((c): c is Mesh => (c as Mesh).isMesh);
    expect(meshes).toHaveLength(4);
    view.group.updateMatrixWorld(true);
    const box = new Box3().setFromObject(view.group);
    expect(box.max.z).toBeLessThan(0); // nothing in the room-side half-space
    expect(box.min.z).toBeLessThan(-5.5); // a 6 m corridor
    expect(box.min.y).toBeGreaterThan(-door.height / 2 - 0.01); // floor at the door's bottom edge; kids stay on it
    expect(box.min.y).toBeLessThan(-door.height / 2 + 0.05);
    for (const m of meshes) {
      const mat = m.material as MeshBasicMaterial;
      expect(mat.stencilFunc).toBe(EqualStencilFunc);
      expect(mat.stencilRef).toBe(view.ref);
      expect(m.renderOrder).toBeGreaterThanOrEqual(portalSceneOrder(0));
      expect(m.renderOrder).toBeLessThan(0);
    }
    view.update(0.016);
    view.setFade(0);
    expect(view.group.visible).toBe(false);
    view.setFade(0.5);
    expect(view.group.visible).toBe(true);
    expect((meshes[0].material as MeshBasicMaterial).opacity).toBeCloseTo(0.5, 6);
    view.dispose();
    nap.dispose();
  });

  it('allocates distinct slots and recycles them', () => {
    const nap = new NapDimension({ kids: 6, length: 4 });
    const a = nap.createView(makeDoor());
    const b = nap.createView(makeDoor({ id: 'b' }));
    expect(a.slot).toBe(0);
    expect(b.slot).toBe(1);
    expect(b.ref).toBe(2);
    expect(nap.live).toBe(2);
    a.dispose();
    const c = nap.createView(makeDoor({ id: 'c' }));
    expect(c.slot).toBe(0);
    expect(nap.live).toBe(2);
    c.dispose();
    b.dispose();
    expect(nap.live).toBe(0);
    nap.dispose();
  });
});

describe('PortalDoor', () => {
  const far = new Vector3(0, 1.6, 0.5); // 3 m into the room
  const close = new Vector3(0, 1.6, -2.2); // 0.3 m from the plane

  function tick(p: PortalDoor, seconds: number, head: Vector3): void {
    const steps = Math.round(seconds / 0.01);
    for (let i = 0; i < steps; i++) p.update(0.01, head);
  }

  it('starts closed with 2 draw calls and no stencil work', () => {
    const nap = new NapDimension();
    const p = new PortalDoor(makeDoor(), nap);
    p.update(0.016, far);
    expect(p.open).toBe(false);
    expect(p.revealed).toBe(0);
    expect(p.drawCalls).toBe(2);
    const mask = p.group.getObjectByName('portal-mask') as Mesh;
    expect(mask.visible).toBe(false);
    expect(mask.renderOrder).toBe(portalMaskOrder(0));
    p.dispose();
    nap.dispose();
  });

  it('reveals over 0.6 s when opened, fades to passthrough within 0.3 s when the head is near, and comes back', () => {
    const nap = new NapDimension();
    const p = new PortalDoor(makeDoor(), nap, { reducedFlash: true });
    p.setOpen(true);
    tick(p, 0.3, far);
    expect(p.revealed).toBeGreaterThan(0.4);
    expect(p.revealed).toBeLessThan(0.6);
    tick(p, 0.4, far);
    expect(p.revealed).toBe(1);
    expect(p.nearPlayer).toBe(false);
    expect(p.drawCalls).toBe(6);
    tick(p, 0.35, close);
    expect(p.nearPlayer).toBe(true);
    expect(p.revealed).toBe(0);
    expect((p.group.getObjectByName('portal-mask') as Mesh).visible).toBe(false);
    tick(p, 1, far);
    expect(p.nearPlayer).toBe(false);
    expect(p.revealed).toBe(1);
    p.setOpen(false);
    tick(p, 0.35, far);
    expect(p.revealed).toBe(0);
    p.dispose();
    nap.dispose();
  });

  it('gives two portals distinct stencil refs and render orders, and its mask resets depth', () => {
    const nap = new NapDimension();
    const a = new PortalDoor(makeDoor(), nap);
    const b = new PortalDoor(makeDoor({ id: 'b', center: new Vector3(3, 1, 0), normal: new Vector3(-1, 0, 0) }), nap);
    expect(a.stencilRef).toBe(1);
    expect(b.stencilRef).toBe(2);
    const maskA = a.group.getObjectByName('portal-mask') as Mesh;
    const maskB = b.group.getObjectByName('portal-mask') as Mesh;
    expect(maskA.renderOrder).not.toBe(maskB.renderOrder);
    const mat = maskA.material as MeshBasicMaterial;
    expect(mat.colorWrite).toBe(false);
    expect(mat.depthWrite).toBe(true);
    expect(mat.depthTest).toBe(true);
    expect(mat.depthFunc).toBe(AlwaysDepth);
    expect(mat.stencilZPass).toBe(ReplaceStencilOp);
    expect(mat.stencilRef).toBe(1);
    // The group frame: local +z is the door normal.
    const z = new Vector3(0, 0, 1).applyQuaternion(b.group.quaternion);
    expect(z.distanceTo(b.door.normal)).toBeLessThan(1e-6);
    a.dispose();
    expect(nap.live).toBe(1);
    b.dispose();
    nap.dispose();
  });
});
