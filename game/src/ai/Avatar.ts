import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Box3,
  CapsuleGeometry,
  Color,
  Group,
  LoopOnce,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  NearestMipmapNearestFilter,
  Object3D,
  SRGBColorSpace,
  SphereGeometry,
  Texture,
  TextureLoader,
  Vector3,
} from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export type AnimName = 'idle' | 'walk' | 'run' | 'sit' | 'attack' | 'die' | 'jump' | 'fall' | 'pickup' | 'emote' | 'static' | 'crouch';

/** Kenney Mini Characters clip names (CC0), by semantic name, first match wins. */
const KENNEY_CLIPS: Record<AnimName, string[]> = {
  idle: ['idle'],
  walk: ['walk'],
  run: ['sprint', 'walk'],
  sit: ['sit'],
  attack: ['attack-melee-right', 'attack-melee-left', 'attack-kick-right'],
  die: ['die'],
  jump: ['jump'],
  fall: ['fall'],
  pickup: ['pick-up'],
  emote: ['emote-yes', 'emote-no'],
  static: ['static'],
  crouch: ['crouch'],
};

export const CHARACTER_FILES = [
  'character-male-a.glb', 'character-female-a.glb', 'character-male-b.glb', 'character-female-b.glb',
  'character-male-c.glb', 'character-female-c.glb', 'character-male-d.glb', 'character-female-d.glb',
  'character-male-e.glb', 'character-female-e.glb', 'character-male-f.glb', 'character-female-f.glb',
];
export const PALETTE_FILES = ['Textures/colormap-goblin-0.png', 'Textures/colormap-goblin-1.png', 'Textures/colormap-goblin-2.png', 'Textures/colormap-goblin-3.png', 'Textures/colormap-goblin-4.png', 'Textures/colormap-goblin-5.png'];

export interface Avatar {
  readonly root: Group;
  /** Height in metres after scaling. */
  readonly height: number;
  readonly kind: 'gltf' | 'procedural';
  play(name: AnimName, fadeS?: number, once?: boolean): void;
  update(dt: number): void;
  /** Multiply the body colour (used for hit flashes and variants). */
  setTint(color: Color | null): void;
  /** Squash/stretch for the inflate-before-pop gag. */
  setStretch(s: number): void;
  dispose(): void;
}

/**
 * Loads the character GLBs once and hands out cheap clones. Falls back to a procedural goblin when the
 * assets are missing, so the game (and tests) run before the asset pipeline has produced anything.
 */
export class AvatarFactory {
  private gltfs: GLTF[] = [];
  private palettes: Texture[] = [];
  loaded = false;
  failed = false;
  private readonly loader = new GLTFLoader();
  private readonly texLoader = new TextureLoader();

  constructor(private readonly baseUrl: string) {}

  async load(maxCharacters = 6): Promise<void> {
    const files = CHARACTER_FILES.slice(0, maxCharacters);
    const results = await Promise.allSettled(files.map((f) => this.loader.loadAsync(`${this.baseUrl}/mini-characters/${f}`)));
    for (const r of results) if (r.status === 'fulfilled') this.gltfs.push(r.value);
    const tex = await Promise.allSettled(PALETTE_FILES.map((f) => this.texLoader.loadAsync(`${this.baseUrl}/mini-characters/${f}`)));
    for (const t of tex) {
      if (t.status === 'fulfilled') {
        t.value.flipY = false;
        t.value.colorSpace = SRGBColorSpace;
        t.value.magFilter = NearestFilter;
        t.value.minFilter = NearestMipmapNearestFilter;
        t.value.needsUpdate = true;
        this.palettes.push(t.value);
      }
    }
    this.loaded = this.gltfs.length > 0;
    this.failed = !this.loaded;
  }

  get characterCount(): number {
    return this.gltfs.length;
  }

  create(variant: number, heightM: number, tint: Color | null = null): Avatar {
    if (!this.loaded) return new ProceduralAvatar(heightM, tint ?? new Color().setHSL((variant * 0.17) % 1, 0.6, 0.45));
    const gltf = this.gltfs[variant % this.gltfs.length];
    const palette = this.palettes.length ? this.palettes[variant % this.palettes.length] : null;
    return new GltfAvatar(gltf, palette, heightM, tint);
  }
}

class GltfAvatar implements Avatar {
  readonly root = new Group();
  readonly height: number;
  readonly kind = 'gltf' as const;
  private readonly model: Object3D;
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<string, AnimationAction>();
  private current: AnimationAction | null = null;
  private readonly materials: MeshStandardMaterial[] = [];
  private readonly baseColors: Color[] = [];
  private readonly clips: AnimationClip[];

  constructor(gltf: GLTF, palette: Texture | null, heightM: number, tint: Color | null) {
    this.model = skeletonClone(gltf.scene);
    this.clips = gltf.animations;
    const box = new Box3().setFromObject(this.model);
    const h = Math.max(0.01, box.max.y - box.min.y);
    const s = heightM / h;
    this.model.scale.setScalar(s);
    this.model.position.y = -box.min.y * s;
    this.height = heightM;
    this.model.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const cloned = mats.map((m) => {
        const c = (m as MeshStandardMaterial).clone();
        if (palette && 'map' in c) c.map = palette;
        c.needsUpdate = true;
        this.materials.push(c);
        this.baseColors.push(c.color.clone());
        return c;
      });
      mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
    });
    this.root.add(this.model);
    this.mixer = new AnimationMixer(this.model);
    if (tint) this.setTint(tint);
    this.play('idle');
  }

  private clipFor(name: AnimName): AnimationClip | null {
    for (const n of KENNEY_CLIPS[name]) {
      const c = this.clips.find((x) => x.name === n);
      if (c) return c;
    }
    return this.clips.find((x) => x.name === 'idle') ?? this.clips[0] ?? null;
  }

  play(name: AnimName, fadeS = 0.15, once = false): void {
    const clip = this.clipFor(name);
    if (!clip) return;
    let action = this.actions.get(clip.name);
    if (!action) {
      action = this.mixer.clipAction(clip, this.model);
      this.actions.set(clip.name, action);
    }
    if (this.current === action && !once) return;
    // Kenney's held poses (sit, crouch, holding-*) are 0.17 s clips: play them once and clamp, or they snap.
    const isPose = clip.duration < 0.4 && !['idle', 'walk', 'sprint'].includes(clip.name);
    const clamp = once || isPose;
    action.reset();
    action.setLoop(clamp ? LoopOnce : LoopRepeat, Infinity);
    action.clampWhenFinished = clamp;
    action.enabled = true;
    action.setEffectiveWeight(1);
    if (this.current && this.current !== action) this.current.crossFadeTo(action, fadeS, false);
    action.play();
    this.current = action;
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }

  setTint(color: Color | null): void {
    this.materials.forEach((m, i) => {
      m.color.copy(this.baseColors[i]);
      if (color) m.color.multiply(color);
    });
  }

  setStretch(s: number): void {
    this.model.scale.set(this.model.scale.x, this.model.scale.x * s, this.model.scale.x);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    for (const m of this.materials) m.dispose();
  }
}

/** Capsule-and-sphere goblin used when the GLBs are unavailable. Animations are code-driven bobs. */
class ProceduralAvatar implements Avatar {
  readonly root = new Group();
  readonly height: number;
  readonly kind = 'procedural' as const;
  private mode: AnimName = 'idle';
  private t = 0;
  private readonly body: Mesh;
  private readonly head: Mesh;
  private readonly mat: MeshStandardMaterial;
  private readonly base: Color;

  constructor(heightM: number, color: Color) {
    this.height = heightM;
    this.base = color.clone();
    this.mat = new MeshStandardMaterial({ color, roughness: 0.8 });
    const bodyH = heightM * 0.5;
    this.body = new Mesh(new CapsuleGeometry(heightM * 0.16, bodyH - heightM * 0.32, 4, 8), this.mat);
    this.body.position.y = bodyH / 2 + heightM * 0.02;
    this.head = new Mesh(new SphereGeometry(heightM * 0.22, 12, 10), this.mat);
    this.head.position.y = bodyH + heightM * 0.22;
    const eyeMat = new MeshStandardMaterial({ color: 0xffee55, emissive: 0xffee55, emissiveIntensity: 1.2 });
    for (const sx of [-1, 1]) {
      const eye = new Mesh(new SphereGeometry(heightM * 0.04, 8, 6), eyeMat);
      eye.position.set(sx * heightM * 0.08, heightM * 0.04, -heightM * 0.19);
      this.head.add(eye);
    }
    this.root.add(this.body, this.head);
  }

  play(name: AnimName): void {
    this.mode = name;
  }

  update(dt: number): void {
    this.t += dt;
    const bob = this.mode === 'run' ? Math.sin(this.t * 16) * 0.03 : this.mode === 'walk' ? Math.sin(this.t * 9) * 0.02 : Math.sin(this.t * 2) * 0.005;
    this.body.position.y = this.height * 0.27 + bob;
    this.head.position.y = this.height * 0.72 + bob * 1.3;
    this.head.rotation.z = this.mode === 'attack' ? Math.sin(this.t * 20) * 0.3 : 0;
    this.body.rotation.x = this.mode === 'sit' ? -0.6 : 0;
  }

  setTint(color: Color | null): void {
    this.mat.color.copy(this.base);
    if (color) this.mat.color.multiply(color);
  }

  setStretch(s: number): void {
    this.root.scale.set(1, s, 1);
  }

  dispose(): void {
    this.mat.dispose();
    this.body.geometry.dispose();
    this.head.geometry.dispose();
  }
}

export const _vec = new Vector3();
