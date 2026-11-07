import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';

const CONFETTI_COUNT = 384;
const TRACER_COUNT = 24;
const GHOST_COUNT = 8;
const GRAVITY = -4.5;

/**
 * All the "pop" feedback in one place, pooled and instanced so a hundred pops cost the same draw calls as one:
 * confetti quads, dart tracers, giggling ghosts and floating hit text.
 */
export class PopFx {
  readonly group = new Group();
  private readonly confetti: InstancedMesh;
  private readonly cPos: Float32Array = new Float32Array(CONFETTI_COUNT * 3);
  private readonly cVel: Float32Array = new Float32Array(CONFETTI_COUNT * 3);
  private readonly cLife: Float32Array = new Float32Array(CONFETTI_COUNT);
  private readonly cSpin: Float32Array = new Float32Array(CONFETTI_COUNT);
  private cNext = 0;
  private readonly tracers: LineSegments;
  private readonly tPos: Float32Array = new Float32Array(TRACER_COUNT * 6);
  private readonly tLife: Float32Array = new Float32Array(TRACER_COUNT);
  private tNext = 0;
  private readonly ghosts: { sprite: Sprite; life: number; vy: number }[] = [];
  private readonly texts: { sprite: Sprite; life: number }[] = [];
  private readonly dummy = new Object3D();
  private readonly m = new Matrix4();
  readonly reducedFlash: boolean;

  constructor(reducedFlash = false) {
    this.reducedFlash = reducedFlash;
    const geo = new PlaneGeometry(0.035, 0.05);
    const mat = new MeshBasicMaterial({ side: DoubleSide, vertexColors: false });
    this.confetti = new InstancedMesh(geo, mat, CONFETTI_COUNT);
    this.confetti.frustumCulled = false;
    this.confetti.count = CONFETTI_COUNT;
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      this.cLife[i] = 0;
      this.dummy.position.set(0, -100, 0);
      this.dummy.updateMatrix();
      this.confetti.setMatrixAt(i, this.dummy.matrix);
      this.confetti.setColorAt(i, new Color(1, 1, 1));
    }
    this.confetti.instanceMatrix.needsUpdate = true;
    this.group.add(this.confetti);

    const tg = new BufferGeometry();
    tg.setAttribute('position', new BufferAttribute(this.tPos, 3));
    this.tracers = new LineSegments(tg, new LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }));
    this.tracers.frustumCulled = false;
    this.group.add(this.tracers);

    const ghostTex = makeGhostTexture();
    for (let i = 0; i < GHOST_COUNT; i++) {
      const sprite = new Sprite(new SpriteMaterial({ map: ghostTex, transparent: true, opacity: 0, depthWrite: false }));
      sprite.scale.set(0.3, 0.36, 1);
      sprite.visible = false;
      this.group.add(sprite);
      this.ghosts.push({ sprite, life: 0, vy: 0 });
    }
  }

  /** Confetti burst at a position in a palette colour. */
  pop(position: Vector3, color: Color, count = 24): void {
    const n = this.reducedFlash ? Math.floor(count / 2) : count;
    for (let k = 0; k < n; k++) {
      const i = this.cNext;
      this.cNext = (this.cNext + 1) % CONFETTI_COUNT;
      this.cPos[i * 3] = position.x;
      this.cPos[i * 3 + 1] = position.y;
      this.cPos[i * 3 + 2] = position.z;
      const a = Math.random() * Math.PI * 2;
      const s = 1.2 + Math.random() * 1.8;
      this.cVel[i * 3] = Math.cos(a) * s;
      this.cVel[i * 3 + 1] = 1.5 + Math.random() * 2.5;
      this.cVel[i * 3 + 2] = Math.sin(a) * s;
      this.cLife[i] = 0.9 + Math.random() * 0.5;
      this.cSpin[i] = (Math.random() - 0.5) * 20;
      const c = color.clone().offsetHSL((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.3) * 0.3);
      this.confetti.setColorAt(i, c);
    }
    if (this.confetti.instanceColor) this.confetti.instanceColor.needsUpdate = true;
  }

  tracer(from: Vector3, to: Vector3): void {
    const i = this.tNext;
    this.tNext = (this.tNext + 1) % TRACER_COUNT;
    this.tPos.set([from.x, from.y, from.z, to.x, to.y, to.z], i * 6);
    this.tLife[i] = 0.12;
    (this.tracers.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
  }

  /** A tiny giggling ghost that floats up and fades. */
  ghost(position: Vector3): void {
    const g = this.ghosts.find((x) => x.life <= 0) ?? this.ghosts[0];
    g.sprite.position.copy(position).add(new Vector3(0, 0.2, 0));
    g.sprite.visible = true;
    g.sprite.material.opacity = 1;
    g.life = 0.7;
    g.vy = 1.7;
  }

  /** Floating crayon text ("POW", "BONK", "+50"). */
  text(position: Vector3, text: string, color = '#ffcc33'): void {
    const tex = makeTextTexture(text, color);
    const sprite = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.scale.set(0.35, 0.175, 1);
    sprite.position.copy(position).add(new Vector3((Math.random() - 0.5) * 0.2, 0.25, 0));
    this.group.add(sprite);
    this.texts.push({ sprite, life: 0.8 });
  }

  update(dt: number): void {
    let any = false;
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      if (this.cLife[i] <= 0) continue;
      any = true;
      this.cLife[i] -= dt;
      this.cVel[i * 3 + 1] += GRAVITY * dt;
      this.cVel[i * 3] *= 0.98;
      this.cVel[i * 3 + 2] *= 0.98;
      this.cPos[i * 3] += this.cVel[i * 3] * dt;
      this.cPos[i * 3 + 1] += this.cVel[i * 3 + 1] * dt;
      this.cPos[i * 3 + 2] += this.cVel[i * 3 + 2] * dt;
      this.dummy.position.set(this.cPos[i * 3], this.cPos[i * 3 + 1], this.cPos[i * 3 + 2]);
      this.dummy.rotation.set(this.cSpin[i] * this.cLife[i], this.cSpin[i] * 0.7 * this.cLife[i], 0);
      const s = this.cLife[i] < 0.25 ? Math.max(0, this.cLife[i] / 0.25) : 1;
      this.dummy.scale.setScalar(s);
      if (this.cLife[i] <= 0) this.dummy.position.set(0, -100, 0);
      this.dummy.updateMatrix();
      this.confetti.setMatrixAt(i, this.dummy.matrix);
    }
    if (any) this.confetti.instanceMatrix.needsUpdate = true;

    let tAny = false;
    for (let i = 0; i < TRACER_COUNT; i++) {
      if (this.tLife[i] <= 0) continue;
      this.tLife[i] -= dt;
      if (this.tLife[i] <= 0) {
        this.tPos.fill(0, i * 6, i * 6 + 6);
        tAny = true;
      }
    }
    if (tAny) (this.tracers.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;

    for (const g of this.ghosts) {
      if (g.life <= 0) continue;
      g.life -= dt;
      g.sprite.position.y += g.vy * dt;
      g.sprite.material.opacity = Math.max(0, g.life / 0.7);
      if (g.life <= 0) g.sprite.visible = false;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.sprite.position.y += 0.6 * dt;
      t.sprite.material.opacity = Math.max(0, t.life / 0.8);
      if (t.life <= 0) {
        this.group.remove(t.sprite);
        t.sprite.material.map?.dispose();
        t.sprite.material.dispose();
        this.texts.splice(i, 1);
      }
    }
  }
}

function makeGhostTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath();
  g.arc(64, 60, 50, Math.PI, 0);
  g.lineTo(114, 130);
  for (let i = 0; i < 5; i++) g.arc(114 - 20 - i * 20, 130, 10, 0, Math.PI, i % 2 === 0);
  g.closePath();
  g.fill();
  g.fillStyle = '#222';
  g.beginPath();
  g.ellipse(46, 62, 7, 10, 0, 0, Math.PI * 2);
  g.ellipse(82, 62, 7, 10, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(64, 92, 12, 0, Math.PI);
  g.fill();
  const t = new CanvasTexture(c);
  return t;
}

export function makeTextTexture(text: string, color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.font = 'bold 72px "Comic Sans MS", "Trebuchet MS", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = '#1a1200';
  g.strokeText(text, 128, 64);
  g.fillStyle = color;
  g.fillText(text, 128, 64);
  return new CanvasTexture(c);
}
