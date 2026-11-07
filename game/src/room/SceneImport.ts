import { BufferAttribute, BufferGeometry, Matrix4, Mesh, NotEqualStencilFunc, Quaternion, ShaderMaterial, Vector2, Vector3 } from 'three';
import { RoomModel } from './RoomModel';
import { normaliseLabel, sceneFrame, type XRMeshLike, type XRPlaneLike } from '../xr/webxr-extras';

interface PlaneRecord {
  plane: XRPlaneLike;
  label: string;
  orientation: 'horizontal' | 'vertical';
  worldPoints: Vector3[];
  xAxis: Vector3; // world direction of the plane's local +X
  normal: Vector3; // world direction of the plane's local +Y
  changed: number;
}

interface MeshRecord {
  label: string;
  matrix: Matrix4;
  mesh: XRMeshLike;
  changed: number;
  bbMin: Vector3;
  bbMax: Vector3;
}

const UP = new Vector3(0, 1, 0);
/** How far the scan occluder is pushed behind real surfaces (m). */
export const OCCLUDER_PUSH_M = 0.05;

/**
 * Reads WebXR plane-detection / mesh-detection every frame and turns the result into a RoomModel.
 * Planes carry the gameplay (doors, couches, tables, walls, floor); meshes feed the depth-only
 * occluder and fill in volumes when a label only exists as a mesh.
 */
export class SceneImport {
  private planes = new Map<XRPlaneLike, PlaneRecord>();
  private meshes = new Map<XRMeshLike, MeshRecord>();
  private lastChangeAt = -1;
  private firstSeenAt = -1;
  private occluder: Mesh | null = null;
  private occluderStamp = -1;
  readonly labelsSeen = new Set<string>();

  get planeCount(): number {
    return this.planes.size;
  }
  get meshCount(): number {
    return this.meshes.size;
  }
  get hasData(): boolean {
    return this.planes.size > 0 || this.meshes.size > 0;
  }
  /** ms since the plane set last changed, or -1 when nothing has arrived. */
  stableFor(nowMs: number): number {
    return this.lastChangeAt < 0 ? -1 : nowMs - this.lastChangeAt;
  }
  firstSeen(): number {
    return this.firstSeenAt;
  }

  update(frame: XRFrame, refSpace: XRReferenceSpace, nowMs: number): void {
    const f = sceneFrame(frame);
    const planes = f.detectedPlanes;
    if (planes) {
      let changed = false;
      for (const rec of Array.from(this.planes.keys())) if (!planes.has(rec)) { this.planes.delete(rec); changed = true; }
      for (const plane of planes) {
        const existing = this.planes.get(plane);
        if (existing && existing.changed === plane.lastChangedTime) continue;
        const pose = frame.getPose(plane.planeSpace, refSpace);
        if (!pose) continue;
        const m = new Matrix4().fromArray(pose.transform.matrix);
        const worldPoints = plane.polygon.map((p) => new Vector3(p.x, p.y, p.z).applyMatrix4(m));
        const q = new Quaternion().setFromRotationMatrix(m);
        const rec: PlaneRecord = {
          plane,
          label: normaliseLabel(plane.semanticLabel),
          orientation: plane.orientation,
          worldPoints,
          xAxis: new Vector3(1, 0, 0).applyQuaternion(q).normalize(),
          normal: new Vector3(0, 1, 0).applyQuaternion(q).normalize(),
          changed: plane.lastChangedTime,
        };
        this.planes.set(plane, rec);
        this.labelsSeen.add(rec.label);
        changed = true;
      }
      if (changed) {
        this.lastChangeAt = nowMs;
        if (this.firstSeenAt < 0) this.firstSeenAt = nowMs;
      }
    }
    const meshes = f.detectedMeshes;
    if (meshes) {
      for (const rec of Array.from(this.meshes.keys())) if (!meshes.has(rec)) this.meshes.delete(rec);
      for (const mesh of meshes) {
        const existing = this.meshes.get(mesh);
        if (existing && existing.changed === mesh.lastChangedTime) continue;
        const pose = frame.getPose(mesh.meshSpace, refSpace);
        if (!pose) continue;
        const matrix = new Matrix4().fromArray(pose.transform.matrix);
        const bbMin = new Vector3(Infinity, Infinity, Infinity);
        const bbMax = new Vector3(-Infinity, -Infinity, -Infinity);
        const v = new Vector3();
        const verts = mesh.vertices;
        for (let i = 0; i + 2 < verts.length; i += 3) {
          v.set(verts[i], verts[i + 1], verts[i + 2]).applyMatrix4(matrix);
          bbMin.min(v);
          bbMax.max(v);
        }
        const label = normaliseLabel(mesh.semanticLabel);
        this.meshes.set(mesh, { label, matrix, mesh, changed: mesh.lastChangedTime, bbMin, bbMax });
        this.labelsSeen.add(label);
        if (this.firstSeenAt < 0) this.firstSeenAt = nowMs;
        this.lastChangeAt = nowMs;
      }
    }
  }

  /** Build the RoomModel from what has been seen. `reference` (the player's head) orients door normals when no floor is known. */
  build(reference: Vector3): RoomModel | null {
    if (!this.hasData) return null;
    const model = new RoomModel();
    model.source = 'scene';
    const recs = Array.from(this.planes.values());

    // Floor: labelled floor, else the lowest large horizontal plane.
    const floors = recs.filter((r) => r.orientation === 'horizontal' && r.label === 'floor');
    let floor = floors.sort((a, b) => polygonArea(b.worldPoints) - polygonArea(a.worldPoints))[0];
    if (!floor) {
      const horizontals = recs.filter((r) => r.orientation === 'horizontal' && polygonArea(r.worldPoints) > 2);
      floor = horizontals.sort((a, b) => avgY(a.worldPoints) - avgY(b.worldPoints))[0];
    }
    if (floor) {
      model.floorY = avgY(floor.worldPoints);
      model.bounds = floor.worldPoints.map((p) => new Vector2(p.x, p.z));
    } else {
      model.floorY = 0;
      const half = 2.5;
      model.bounds = [new Vector2(reference.x - half, reference.z - half), new Vector2(reference.x + half, reference.z - half), new Vector2(reference.x + half, reference.z + half), new Vector2(reference.x - half, reference.z + half)];
    }

    for (const r of recs) {
      if (r === floor || r.label === 'ceiling' || r.label === 'floor') continue;
      if (r.orientation === 'vertical') {
        const { center, right, width, height } = verticalRect(r);
        if (r.label === 'door') {
          model.doors.push({ id: `door-${model.doors.length + 1}`, center, normal: r.normal.clone().setY(0).normalize(), right, width, height, kidsRoom: false, source: 'scene' });
        } else {
          const yaw = Math.atan2(-right.z, right.x);
          const label = r.label === 'wall' || r.label === 'window' || r.label === 'wall art' ? r.label : 'wall';
          model.volumes.push({ id: `${label}-${model.volumes.length + 1}`, label, center, size: new Vector3(width, height, 0.1), yaw, source: 'scene' });
        }
      } else {
        // Horizontal furniture top: make a volume from the top plane down to the floor.
        const { center, right, width, depth } = horizontalRect(r);
        const top = avgY(r.worldPoints);
        const h = Math.max(0.1, top - model.floorY);
        const yaw = Math.atan2(-right.z, right.x);
        const label = r.label === 'other' ? 'storage' : r.label;
        model.volumes.push({ id: `${label}-${model.volumes.length + 1}`, label, center: new Vector3(center.x, model.floorY + h / 2, center.z), size: new Vector3(width, h, depth), yaw, source: 'scene' });
      }
    }

    // Meshes: add volumes for labelled furniture that has no plane, from their world AABB.
    for (const m of this.meshes.values()) {
      if (m.label === 'global mesh' || m.label === 'other' || m.label === 'wall' || m.label === 'floor' || m.label === 'ceiling') continue;
      const alreadyFromPlane = model.volumes.some((v) => v.label === m.label && v.center.distanceTo(m.bbMin.clone().add(m.bbMax).multiplyScalar(0.5)) < 0.6);
      if (alreadyFromPlane) continue;
      if (m.label === 'door') continue; // doors come from planes (2D)
      const center = m.bbMin.clone().add(m.bbMax).multiplyScalar(0.5);
      const size = m.bbMax.clone().sub(m.bbMin);
      model.volumes.push({ id: `${m.label}-${model.volumes.length + 1}`, label: m.label, center, size, yaw: 0, source: 'scene' });
    }

    model.orientDoors(model.bounds.length >= 3 ? undefined : reference);
    return model;
  }

  /**
   * Depth-only occluder built from the room meshes (Quest 3 global mesh). Rendered with colorWrite=false
   * so gremlins behind real furniture are hidden and shots stop at real walls.
   */
  updateOccluder(): Mesh | null {
    let stamp = 0;
    for (const m of this.meshes.values()) stamp = Math.max(stamp, m.changed);
    if (this.meshes.size === 0) return this.occluder;
    if (this.occluder && stamp === this.occluderStamp) return this.occluder;
    const positions: number[] = [];
    const indices: number[] = [];
    const v = new Vector3();
    for (const m of this.meshes.values()) {
      if (m.label !== 'global mesh' && m.label !== 'wall') continue;
      const base = positions.length / 3;
      const verts = m.mesh.vertices;
      for (let i = 0; i + 2 < verts.length; i += 3) {
        v.set(verts[i], verts[i + 1], verts[i + 2]).applyMatrix4(m.matrix);
        positions.push(v.x, v.y, v.z);
      }
      for (let i = 0; i < m.mesh.indices.length; i++) indices.push(base + m.mesh.indices[i]);
    }
    if (positions.length === 0) return this.occluder;
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geo.setIndex(indices);
    if (this.occluder) {
      this.occluder.geometry.dispose();
      this.occluder.geometry = geo;
    } else {
      // Depth-only, pushed 5 cm away from the eye: scanned meshes sit a few cm off the detected planes, and without
      // the push they would swallow floor cracks, seat markers, door frames and gremlin feet that sit on real surfaces.
      const mat = new ShaderMaterial({
        vertexShader: `void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float d = length(mv.xyz);
          mv.xyz *= (d + ${OCCLUDER_PUSH_M.toFixed(3)}) / max(d, 1e-4);
          gl_Position = projectionMatrix * mv;
        }`,
        fragmentShader: `void main() { gl_FragColor = vec4(0.0); }`,
        colorWrite: false,
        depthWrite: true,
      });
      mat.stencilWrite = true;
      mat.stencilFunc = NotEqualStencilFunc; // never write depth inside portal masks (stencil ref 1)
      mat.stencilRef = 1;
      this.occluder = new Mesh(geo, mat);
      this.occluder.name = 'room-occluder';
      this.occluder.renderOrder = -20;
      this.occluder.frustumCulled = false;
    }
    this.occluderStamp = stamp;
    return this.occluder;
  }

  summary(): string {
    const counts: Record<string, number> = {};
    for (const r of this.planes.values()) counts[`plane:${r.label}`] = (counts[`plane:${r.label}`] ?? 0) + 1;
    for (const m of this.meshes.values()) counts[`mesh:${m.label}`] = (counts[`mesh:${m.label}`] ?? 0) + 1;
    return Object.entries(counts).map(([k, n]) => `${k}×${n}`).join(', ');
  }
}

function avgY(points: Vector3[]): number {
  if (points.length === 0) return 0;
  return points.reduce((s, p) => s + p.y, 0) / points.length;
}

function polygonArea(points: Vector3[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length];
    a += p.x * q.z - q.x * p.z;
  }
  return Math.abs(a) / 2;
}

function verticalRect(r: PlaneRecord): { center: Vector3; right: Vector3; width: number; height: number } {
  const center = new Vector3();
  for (const p of r.worldPoints) center.add(p);
  center.divideScalar(Math.max(1, r.worldPoints.length));
  // Horizontal axis of the plane: the plane's local axis that is most horizontal.
  let right = r.xAxis.clone().setY(0);
  if (right.lengthSq() < 0.25) right = new Vector3().crossVectors(r.normal, UP);
  right.normalize();
  let minR = Infinity, maxR = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of r.worldPoints) {
    const d = p.clone().sub(center).dot(right);
    minR = Math.min(minR, d);
    maxR = Math.max(maxR, d);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { center, right, width: Math.max(0.3, maxR - minR), height: Math.max(0.3, maxY - minY) };
}

function horizontalRect(r: PlaneRecord): { center: Vector3; right: Vector3; width: number; depth: number } {
  const center = new Vector3();
  for (const p of r.worldPoints) center.add(p);
  center.divideScalar(Math.max(1, r.worldPoints.length));
  const right = r.xAxis.clone().setY(0).normalize();
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  const fwd = new Vector3().crossVectors(UP, right).normalize();
  let minR = Infinity, maxR = -Infinity, minF = Infinity, maxF = -Infinity;
  for (const p of r.worldPoints) {
    const d = p.clone().sub(center);
    const a = d.dot(right), b = d.dot(fwd);
    minR = Math.min(minR, a); maxR = Math.max(maxR, a);
    minF = Math.min(minF, b); maxF = Math.max(maxF, b);
  }
  return { center, right, width: Math.max(0.3, maxR - minR), depth: Math.max(0.3, maxF - minF) };
}
