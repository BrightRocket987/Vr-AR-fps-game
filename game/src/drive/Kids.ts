import {
  AnimationAction,
  AnimationMixer,
  Box3,
  CanvasTexture,
  CapsuleGeometry,
  Group,
  LoopOnce,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Kid, NeedKind, NeedStage } from './Needs';

/**
 * Pickle and Bean in their car seats: Kenney Mini Characters with the stock (human) colour map, never the goblin
 * palettes, never in any target list. Seated pose, a bounce when they whine, a shake when they cry, a thought bubble.
 */
export class KidSeat {
  readonly root = new Group();
  private mixer: AnimationMixer | null = null;
  private actions = new Map<string, AnimationAction>();
  private model: Object3D | null = null;
  private readonly bubble: Sprite;
  private readonly bubbleCanvas = document.createElement('canvas');
  private readonly bubbleTex: CanvasTexture;
  private bubbleKey = '';
  private t = 0;
  stage: NeedStage | null = null;
  kind: NeedKind | 'pee' | null = null;
  fill = 0;
  /** Seconds of a happy bounce after a resolved need. */
  happy = 0;
  asleep = false;
  private fallback: Mesh | null = null;

  constructor(readonly kid: Kid, readonly label: string, readonly heightM: number, seat: Vector3) {
    this.root.position.copy(seat);
    this.root.rotation.y = Math.PI; // facing forward like the player
    this.bubbleCanvas.width = 256;
    this.bubbleCanvas.height = 160;
    this.bubbleTex = new CanvasTexture(this.bubbleCanvas);
    this.bubbleTex.colorSpace = SRGBColorSpace;
    this.bubble = new Sprite(new SpriteMaterial({ map: this.bubbleTex, transparent: true, depthWrite: false }));
    this.bubble.scale.set(0.32, 0.2, 1);
    this.bubble.position.set(0, heightM * 0.8 + 0.18, 0);
    this.bubble.visible = false;
    this.root.add(this.bubble);
  }

  async load(url: string): Promise<void> {
    try {
      const gltf = await new GLTFLoader().loadAsync(url);
      const model = gltf.scene;
      const box = new Box3().setFromObject(model);
      const h = Math.max(0.01, box.max.y - box.min.y);
      const s = this.heightM / h;
      model.scale.setScalar(s);
      model.position.y = -box.min.y * s;
      model.traverse((o) => {
        const m = o as Mesh;
        if (m.isMesh) m.frustumCulled = false;
      });
      this.model = model;
      this.root.add(model);
      this.mixer = new AnimationMixer(model);
      for (const clip of gltf.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
      this.pose('sit');
    } catch {
      // Offline: a simple capsule kid so the back seat is never empty.
      const mat = new MeshStandardMaterial({ color: this.kid === 'pickle' ? 0xf28cb8 : 0x7fd1b9, roughness: 0.8 });
      this.fallback = new Mesh(new CapsuleGeometry(this.heightM * 0.18, this.heightM * 0.35, 4, 8), mat);
      this.fallback.position.y = this.heightM * 0.35;
      this.root.add(this.fallback);
    }
  }

  private current: AnimationAction | null = null;

  private pose(name: string, loop = false): void {
    const a = this.actions.get(name) ?? this.actions.get('sit') ?? null;
    if (!a || a === this.current) return;
    a.reset();
    a.setLoop(loop ? LoopRepeat : LoopOnce, Infinity);
    a.clampWhenFinished = !loop;
    a.enabled = true;
    if (this.current) this.current.crossFadeTo(a, 0.2, false);
    a.play();
    this.current = a;
  }

  setNeed(kind: NeedKind | 'pee' | null, stage: NeedStage | null, fill: number): void {
    this.kind = kind;
    this.stage = stage;
    this.fill = fill;
  }

  update(dt: number): void {
    this.t += dt;
    this.mixer?.update(dt);
    // Bounce (whine), thrash (cry/meltdown), wiggle (happy), still (asleep).
    const target = this.model ?? this.fallback;
    if (target) {
      let y = 0, rz = 0;
      if (this.asleep) rz = 0.25;
      else if (this.stage === 'meltdown') { y = Math.abs(Math.sin(this.t * 14)) * 0.05; rz = Math.sin(this.t * 18) * 0.2; }
      else if (this.stage === 'cry') { y = Math.abs(Math.sin(this.t * 10)) * 0.04; rz = Math.sin(this.t * 12) * 0.12; }
      else if (this.stage === 'whine' || this.kind === 'pee') y = Math.abs(Math.sin(this.t * 6)) * 0.03;
      else if (this.happy > 0) { this.happy -= dt; y = Math.abs(Math.sin(this.t * 8)) * 0.03; }
      target.position.y = (this.fallback ? this.heightM * 0.35 : target.position.y - (target.userData.bob ?? 0)) + y;
      target.userData.bob = y;
      target.rotation.z = rz;
    }
    // The thought bubble.
    const show = !!this.stage && this.stage !== 'resolved' && this.stage !== 'failed';
    this.bubble.visible = show || this.kind === 'pee';
    if (this.bubble.visible) this.drawBubble();
  }

  private drawBubble(): void {
    const key = `${this.kind}|${this.stage}|${Math.round(this.fill * 12)}|${Math.floor(this.t * 2) % 2}`;
    if (key === this.bubbleKey) return;
    this.bubbleKey = key;
    const g = this.bubbleCanvas.getContext('2d');
    if (!g) return;
    const W = 256, H = 160;
    g.clearRect(0, 0, W, H);
    const col = this.stage === 'meltdown' ? '#ff2020' : this.stage === 'cry' ? '#ff5a5a' : this.stage === 'whine' ? '#ff9a3a' : '#ffcc33';
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath();
    g.ellipse(W / 2, 70, 110, 62, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(W / 2 - 40, 140, 10, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = col;
    g.beginPath();
    g.ellipse(W / 2, 70, 104, 56, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.05, this.fill));
    g.stroke();
    g.fillStyle = '#1a1200';
    g.textAlign = 'center';
    g.font = 'bold 40px "Trebuchet MS", sans-serif';
    const label = this.stage === 'meltdown' ? 'WAAAH!' : this.kind === 'tablet' ? 'TABLET' : this.kind === 'hungry' ? 'SNACK' : this.kind === 'touching' ? 'HANDS!' : this.kind === 'pee' ? 'PEE!!' : '?';
    g.fillText(label, W / 2, 84);
    this.bubbleTex.needsUpdate = true;
  }

  /** Engine off: both kids fall asleep at once. */
  sleep(): void {
    this.asleep = true;
    this.stage = null;
    this.kind = null;
    this.bubble.visible = false;
  }

  dispose(): void {
    this.mixer?.stopAllAction();
    this.bubbleTex.dispose();
    this.bubble.material.dispose();
    if (this.fallback) {
      this.fallback.geometry.dispose();
      (this.fallback.material as MeshStandardMaterial).dispose();
    }
    this.model?.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mm of mats) mm.dispose();
      }
    });
    this.root.removeFromParent();
  }
}
