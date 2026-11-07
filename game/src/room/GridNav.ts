import { Vector3 } from 'three';
import type { Nav } from './Nav';
import type { RoomModel } from './RoomModel';

/**
 * A* over a 10 cm grid covering the floor polygon, with blocker footprints (inflated by the agent
 * radius) marked unwalkable. Paths are string-pulled so gremlins walk straight lines between corners.
 * Rebuilt whenever the room changes; ~1 ms for a 6 x 6 m room.
 */
export class GridNav implements Nav {
  readonly cell: number;
  private minX = 0;
  private minZ = 0;
  private cols = 0;
  private rows = 0;
  private walk: Uint8Array = new Uint8Array(0);
  private floorY = 0;
  private room: RoomModel | null = null;
  private readonly cache = new Map<string, { path: Vector3[]; stamp: number }>();
  private stamp = 0;

  constructor(cell = 0.1) {
    this.cell = cell;
  }

  rebuild(room: RoomModel): void {
    this.room = room;
    this.floorY = room.floorY;
    this.cache.clear();
    this.stamp++;
    const b = room.bounds;
    if (b.length < 3) {
      this.cols = this.rows = 0;
      this.walk = new Uint8Array(0);
      return;
    }
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const p of b) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.y); maxZ = Math.max(maxZ, p.y);
    }
    // Also cover doors slightly outside the floor polygon so spawn points are reachable.
    for (const d of room.doors) {
      minX = Math.min(minX, d.center.x - 0.5); maxX = Math.max(maxX, d.center.x + 0.5);
      minZ = Math.min(minZ, d.center.z - 0.5); maxZ = Math.max(maxZ, d.center.z + 0.5);
    }
    const pad = 0.3;
    this.minX = minX - pad;
    this.minZ = minZ - pad;
    this.cols = Math.min(400, Math.ceil((maxX - minX + pad * 2) / this.cell));
    this.rows = Math.min(400, Math.ceil((maxZ - minZ + pad * 2) / this.cell));
    this.walk = new Uint8Array(this.cols * this.rows);
    const agent = 0.18;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = this.minX + (c + 0.5) * this.cell;
        const z = this.minZ + (r + 0.5) * this.cell;
        let ok = room.contains(x, z) && !room.blockedAt(x, z, agent);
        if (!ok) {
          // Door thresholds are walkable even when just outside the polygon.
          for (const d of room.doors) {
            const dx = x - d.center.x, dz = z - d.center.z;
            const along = dx * d.right.x + dz * d.right.z;
            const out = dx * d.normal.x + dz * d.normal.z; // >0 = into room
            if (Math.abs(along) <= d.width / 2 && out >= -0.45 && out <= 0.6) { ok = true; break; }
          }
        }
        this.walk[r * this.cols + c] = ok ? 1 : 0;
      }
    }
  }

  get size(): { cols: number; rows: number } {
    return { cols: this.cols, rows: this.rows };
  }

  private toCell(x: number, z: number): [number, number] {
    return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)];
  }

  private toWorld(c: number, r: number, out = new Vector3()): Vector3 {
    return out.set(this.minX + (c + 0.5) * this.cell, this.floorY, this.minZ + (r + 0.5) * this.cell);
  }

  private walkable(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows && this.walk[r * this.cols + c] === 1;
  }

  /** Nearest walkable cell to (c, r) within a small radius. */
  private nearestWalkable(c: number, r: number): [number, number] | null {
    if (this.walkable(c, r)) return [c, r];
    for (let d = 1; d <= 8; d++) {
      for (let dc = -d; dc <= d; dc++) {
        for (const dr of [-d, d]) if (this.walkable(c + dc, r + dr)) return [c + dc, r + dr];
      }
      for (let dr = -d + 1; dr <= d - 1; dr++) {
        for (const dc of [-d, d]) if (this.walkable(c + dc, r + dr)) return [c + dc, r + dr];
      }
    }
    return null;
  }

  isWalkable(x: number, z: number): boolean {
    const [c, r] = this.toCell(x, z);
    return this.walkable(c, r);
  }

  /** Straight-line visibility on the grid (Bresenham). */
  private lineClear(c0: number, r0: number, c1: number, r1: number): boolean {
    let dc = Math.abs(c1 - c0), dr = -Math.abs(r1 - r0);
    const sc = c0 < c1 ? 1 : -1, sr = r0 < r1 ? 1 : -1;
    let err = dc + dr;
    let c = c0, r = r0;
    for (let guard = 0; guard < 2000; guard++) {
      if (!this.walkable(c, r)) return false;
      if (c === c1 && r === r1) return true;
      const e2 = 2 * err;
      if (e2 >= dr) { err += dr; c += sc; }
      if (e2 <= dc) { err += dc; r += sr; }
    }
    return false;
  }

  /** Full path (world points, excluding the start), or null if unreachable. */
  path(from: Vector3, to: Vector3): Vector3[] | null {
    if (this.cols === 0) return null;
    const s = this.nearestWalkable(...this.toCell(from.x, from.z));
    const g = this.nearestWalkable(...this.toCell(to.x, to.z));
    if (!s || !g) return null;
    const key = `${s[0]},${s[1]}>${g[0]},${g[1]}`;
    const cached = this.cache.get(key);
    if (cached && cached.stamp === this.stamp) return cached.path.map((p) => p.clone());
    if (this.lineClear(s[0], s[1], g[0], g[1])) {
      const p = [to.clone().setY(this.floorY)];
      this.cache.set(key, { path: p, stamp: this.stamp });
      return p.map((q) => q.clone());
    }
    const cells = this.astar(s, g);
    if (!cells) return null;
    // String pulling.
    const pulled: [number, number][] = [];
    let anchor = 0;
    pulled.push(cells[0]);
    for (let i = 2; i < cells.length; i++) {
      if (!this.lineClear(cells[anchor][0], cells[anchor][1], cells[i][0], cells[i][1])) {
        anchor = i - 1;
        pulled.push(cells[anchor]);
      }
    }
    pulled.push(cells[cells.length - 1]);
    const result = pulled.slice(1).map(([c, r]) => this.toWorld(c, r));
    if (result.length) result[result.length - 1].set(to.x, this.floorY, to.z);
    if (this.cache.size > 400) this.cache.clear();
    this.cache.set(key, { path: result, stamp: this.stamp });
    return result.map((p) => p.clone());
  }

  private astar(s: [number, number], g: [number, number]): [number, number][] | null {
    const n = this.cols * this.rows;
    const gScore = new Float32Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const open: number[] = [];
    const f = new Float32Array(n).fill(Infinity);
    const idx = (c: number, r: number) => r * this.cols + c;
    const h = (c: number, r: number) => Math.hypot(c - g[0], r - g[1]);
    const start = idx(s[0], s[1]);
    const goal = idx(g[0], g[1]);
    gScore[start] = 0;
    f[start] = h(s[0], s[1]);
    open.push(start);
    const dirs: [number, number, number][] = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let expansions = 0;
    while (open.length) {
      // Smallest f (linear scan is fine for a few thousand cells).
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
      const cur = open[bi];
      open[bi] = open[open.length - 1];
      open.pop();
      if (cur === goal) {
        const out: [number, number][] = [];
        let k = cur;
        while (k !== -1) {
          out.push([k % this.cols, Math.floor(k / this.cols)]);
          k = came[k];
        }
        return out.reverse();
      }
      closed[cur] = 1;
      if (++expansions > 20000) return null;
      const cc = cur % this.cols, cr = Math.floor(cur / this.cols);
      for (const [dc, dr, cost] of dirs) {
        const nc = cc + dc, nr = cr + dr;
        if (!this.walkable(nc, nr)) continue;
        if (dc !== 0 && dr !== 0 && (!this.walkable(cc + dc, cr) || !this.walkable(cc, cr + dr))) continue; // no corner cutting
        const ni = idx(nc, nr);
        if (closed[ni]) continue;
        const t = gScore[cur] + cost;
        if (t < gScore[ni]) {
          gScore[ni] = t;
          f[ni] = t + h(nc, nr);
          came[ni] = cur;
          if (!open.includes(ni)) open.push(ni);
        }
      }
    }
    return null;
  }

  next(from: Vector3, target: Vector3, _radius: number): Vector3 | null {
    const p = this.path(from, target);
    if (!p || p.length === 0) return null;
    // Skip the first waypoint if we are already on top of it.
    if (p.length > 1 && Math.hypot(p[0].x - from.x, p[0].z - from.z) < this.cell * 1.5) return p[1];
    return p[0];
  }

  randomPoint(near: Vector3, radius: number, _agentRadius: number): Vector3 | null {
    if (this.cols === 0) return null;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = radius * Math.sqrt(Math.random());
      const x = near.x + Math.cos(a) * r, z = near.z + Math.sin(a) * r;
      if (this.isWalkable(x, z)) return new Vector3(x, this.floorY, z);
    }
    return null;
  }

  /** Debug: ASCII map. */
  ascii(): string {
    const rows: string[] = [];
    for (let r = 0; r < this.rows; r++) {
      let s = '';
      for (let c = 0; c < this.cols; c++) s += this.walk[r * this.cols + c] ? '.' : '#';
      rows.push(s);
    }
    return rows.join('\n');
  }

  get roomRef(): RoomModel | null {
    return this.room;
  }
}
