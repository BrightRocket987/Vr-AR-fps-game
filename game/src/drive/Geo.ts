import { BoxGeometry, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Euler, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpE = new Euler();
const tmpS = new Vector3(1, 1, 1);
const tmpP = new Vector3();
const tmpC = new Color();

/**
 * Builds one merged, vertex-coloured BufferGeometry from primitives, so a whole cockpit or prop is a single draw call
 * with one material (MeshStandardMaterial/MeshBasicMaterial with vertexColors: true).
 */
export class GeoBuilder {
  private readonly parts: BufferGeometry[] = [];

  add(geo: BufferGeometry, color: number | Color, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scale?: [number, number, number]): this {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    tmpC.set(color);
    const n = g.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = tmpC.r;
      col[i * 3 + 1] = tmpC.g;
      col[i * 3 + 2] = tmpC.b;
    }
    g.setAttribute('color', new BufferAttribute(col, 3));
    tmpE.set(rot[0], rot[1], rot[2]);
    tmpQ.setFromEuler(tmpE);
    tmpS.set(scale?.[0] ?? 1, scale?.[1] ?? 1, scale?.[2] ?? 1);
    tmpM.compose(tmpP.set(pos[0], pos[1], pos[2]), tmpQ, tmpS);
    g.applyMatrix4(tmpM);
    this.parts.push(g);
    return this;
  }

  box(w: number, h: number, d: number, color: number | Color, pos: [number, number, number], rot?: [number, number, number]): this {
    return this.add(new BoxGeometry(w, h, d), color, pos, rot);
  }

  cyl(rTop: number, rBot: number, h: number, color: number | Color, pos: [number, number, number], rot?: [number, number, number], seg = 10): this {
    return this.add(new CylinderGeometry(rTop, rBot, h, seg), color, pos, rot);
  }

  cone(r: number, h: number, color: number | Color, pos: [number, number, number], rot?: [number, number, number], seg = 10): this {
    return this.add(new ConeGeometry(r, h, seg), color, pos, rot);
  }

  sphere(r: number, color: number | Color, pos: [number, number, number], scale?: [number, number, number], seg = 10): this {
    return this.add(new SphereGeometry(r, seg, Math.max(6, Math.floor(seg * 0.7))), color, pos, [0, 0, 0], scale);
  }

  torus(r: number, tube: number, color: number | Color, pos: [number, number, number], rot?: [number, number, number], arc = Math.PI * 2): this {
    return this.add(new TorusGeometry(r, tube, 8, 28, arc), color, pos, rot);
  }

  /** A box from point a to point b (a beam/pillar) with a square cross-section. */
  beam(a: [number, number, number], b: [number, number, number], thick: number, color: number | Color): this {
    const va = new Vector3(...a), vb = new Vector3(...b);
    const len = va.distanceTo(vb);
    const g = new BoxGeometry(thick, len, thick);
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const dir = vb.clone().sub(va).normalize();
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
    const e = new Euler().setFromQuaternion(q);
    return this.add(g, color, [mid.x, mid.y, mid.z], [e.x, e.y, e.z]);
  }

  get empty(): boolean {
    return this.parts.length === 0;
  }

  build(): BufferGeometry {
    const merged = mergeGeometries(this.parts, false) ?? new BufferGeometry();
    for (const p of this.parts) p.dispose();
    this.parts.length = 0;
    merged.computeBoundingSphere();
    return merged;
  }
}
