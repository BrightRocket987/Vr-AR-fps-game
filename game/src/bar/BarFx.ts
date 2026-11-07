import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';

const GRAVITY = -3.0;

interface Shot {
  active: boolean;
  pos: Vector3;
  vel: Vector3;
  spin: Vector3;
  rot: Vector3;
  age: number;
  life: number;
  /** Called once when the projectile reaches its target time (books) or passes close to the head (peanuts). */
  onArrive: (() => void) | null;
  arriveAt: number;
}

/**
 * Pooled ballistic projectiles drawn as ONE InstancedMesh per kind (peanuts, hardbacks, nacho chips). A shot flies
 * on a gravity arc chosen so it arrives at its target point after `time` seconds; `onArrive` fires once at that time.
 */
export class ProjectilePool {
  readonly mesh: InstancedMesh;
  private readonly shots: Shot[] = [];
  private readonly dummy = new Object3D();
  private readonly hidden = new Matrix4().makeScale(0, 0, 0);
  private dirty = true;

  constructor(geometry: BufferGeometry, color: number, count: number, private readonly gravity = GRAVITY) {
    this.mesh = new InstancedMesh(geometry, new MeshBasicMaterial({ color }), count);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < count; i++) {
      this.mesh.setMatrixAt(i, this.hidden);
      this.shots.push({ active: false, pos: new Vector3(), vel: new Vector3(), spin: new Vector3(), rot: new Vector3(), age: 0, life: 0, onArrive: null, arriveAt: 0 });
    }
  }

  get activeCount(): number {
    return this.shots.filter((s) => s.active).length;
  }

  /** Launch from `from` so it reaches `to` after `time` s. `life` (>= time) keeps it flying past the target. */
  launch(from: Vector3, to: Vector3, time: number, onArrive: (() => void) | null = null, life = time + 0.6, color?: Color): void {
    const i = this.shots.findIndex((s) => !s.active);
    const idx = i >= 0 ? i : 0;
    const s = this.shots[idx];
    const t = Math.max(0.05, time);
    s.active = true;
    s.pos.copy(from);
    s.vel.copy(to).sub(from).divideScalar(t);
    s.vel.y -= 0.5 * this.gravity * t;
    s.spin.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
    s.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    s.age = 0;
    s.life = Math.max(t, life);
    s.onArrive = onArrive;
    s.arriveAt = t;
    if (color) {
      this.mesh.setColorAt(idx, color);
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }

  /** Current position of every live shot (for proximity tests). */
  forEachActive(fn: (pos: Vector3, kill: () => void) => void): void {
    for (const s of this.shots) {
      if (!s.active) continue;
      fn(s.pos, () => {
        s.active = false;
        s.onArrive = null;
        this.dirty = true;
      });
    }
  }

  update(dt: number): void {
    let any = this.dirty;
    this.dirty = false;
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      if (!s.active) continue;
      any = true;
      s.age += dt;
      s.vel.y += this.gravity * dt;
      s.pos.addScaledVector(s.vel, dt);
      s.rot.addScaledVector(s.spin, dt);
      if (s.onArrive && s.age >= s.arriveAt) {
        const cb = s.onArrive;
        s.onArrive = null;
        cb();
      }
      if (s.age >= s.life || s.pos.y < -0.2) s.active = false;
      if (!s.active) {
        this.mesh.setMatrixAt(i, this.hidden);
        continue;
      }
      this.dummy.position.copy(s.pos);
      this.dummy.rotation.set(s.rot.x, s.rot.y, s.rot.z);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    for (let i = 0; i < this.shots.length; i++) {
      this.shots[i].active = false;
      this.shots[i].onArrive = null;
      this.mesh.setMatrixAt(i, this.hidden);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
    this.mesh.dispose();
  }
}

export function peanutGeometry(): BufferGeometry {
  return new SphereGeometry(0.03, 6, 4).scale(1, 0.7, 1.6);
}
export function bookGeometry(): BufferGeometry {
  return new BoxGeometry(0.16, 0.04, 0.22);
}
export function chipGeometry(): BufferGeometry {
  return new ConeGeometry(0.06, 0.012, 3);
}

/** Cartoon KO stars: a sprite ring that circles above a knocked-out head (pooled, shared spinning material). */
export class StarPool {
  readonly group = new Group();
  private readonly mat: SpriteMaterial;
  private readonly sprites: Array<{ sprite: Sprite; follow: Object3D | null; height: number }> = [];
  private t = 0;

  constructor(count = 6) {
    this.mat = new SpriteMaterial({ map: starTexture(), transparent: true, depthWrite: false });
    for (let i = 0; i < count; i++) {
      const sprite = new Sprite(this.mat);
      sprite.scale.set(0.55, 0.3, 1);
      sprite.visible = false;
      this.group.add(sprite);
      this.sprites.push({ sprite, follow: null, height: 1 });
    }
  }

  /** Show stars over `follow` (its world position + `height`) until released. */
  attach(follow: Object3D, height: number): void {
    const s = this.sprites.find((x) => !x.follow) ?? this.sprites[0];
    s.follow = follow;
    s.height = height;
    s.sprite.visible = true;
  }

  release(follow: Object3D): void {
    for (const s of this.sprites) {
      if (s.follow === follow) {
        s.follow = null;
        s.sprite.visible = false;
      }
    }
  }

  get visibleCount(): number {
    return this.sprites.filter((s) => s.follow).length;
  }

  update(dt: number): void {
    this.t += dt;
    this.mat.rotation = Math.sin(this.t * 3) * 0.35;
    for (const s of this.sprites) {
      if (!s.follow) continue;
      s.follow.getWorldPosition(s.sprite.position);
      s.sprite.position.y += s.height + Math.sin(this.t * 5) * 0.03;
    }
  }

  dispose(): void {
    this.mat.map?.dispose();
    this.mat.dispose();
  }
}

function starTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    const star = (x: number, y: number, r: number) => {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r : r * 0.45;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
      g.stroke();
    };
    g.fillStyle = '#ffe14d';
    g.strokeStyle = '#7a5200';
    g.lineWidth = 4;
    const pts: Array<[number, number, number]> = [[40, 70, 26], [100, 40, 22], [160, 45, 24], [215, 72, 26], [128, 95, 20]];
    for (const [x, y, r] of pts) star(x, y, r);
  }
  return new CanvasTexture(c);
}
