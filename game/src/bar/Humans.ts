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
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AnimName, Avatar } from '../ai/Avatar';

/**
 * Human-coloured Kenney Mini Characters for chapter 1. The shared AvatarFactory swaps in the goblin palettes (green skin),
 * which is right for gremlins and wrong for Marlene, Brad, the patrons and the real kids, so the bar loads the same CC0
 * GLBs with their original colormap. The characters face +Z and stand 0.72 model units tall; heads are about half of that.
 */
export const HUMAN_FILES = [
  'character-male-a.glb', 'character-female-a.glb', 'character-male-b.glb', 'character-female-b.glb',
  'character-male-c.glb', 'character-female-c.glb', 'character-male-d.glb', 'character-female-d.glb',
  'character-male-e.glb', 'character-female-e.glb', 'character-male-f.glb', 'character-female-f.glb',
] as const;
export type HumanFile = (typeof HUMAN_FILES)[number];

const CLIPS: Record<AnimName, string[]> = {
  idle: ['idle'],
  walk: ['walk'],
  run: ['sprint', 'walk'],
  sit: ['sit'],
  attack: ['attack-melee-right', 'attack-melee-left'],
  die: ['die'],
  jump: ['jump'],
  fall: ['fall'],
  pickup: ['pick-up'],
  emote: ['emote-yes', 'emote-no'],
  static: ['static'],
  crouch: ['crouch'],
};

const UP = new Vector3(0, 1, 0);

/** An Avatar with a permanent base tint (hit flashes restore to it), bone attachments and raw clip access. */
export interface HumanAvatar extends Avatar {
  /** Play a Kenney clip by its file name ('interact-right', 'holding-both', 'emote-no'...). */
  playClip(clip: string, fadeS?: number, once?: boolean): void;
  /** Parent `obj` to a bone so it animates with it; `posInRoot` is where it sits (metres, avatar space, rest pose). */
  attachAt(bone: string, obj: Object3D, posInRoot: Vector3, rotY?: number): void;
  /** Fade the whole character (0..1) for the knocked-out exit. */
  setOpacity(a: number): void;
}

export class HumanFactory {
  private gltfs = new Map<string, GLTF>();
  loaded = false;
  private readonly loader = new GLTFLoader();

  constructor(private readonly baseUrl: string) {}

  async load(files: readonly string[] = HUMAN_FILES): Promise<void> {
    const results = await Promise.allSettled(files.map((f) => this.loader.loadAsync(`${this.baseUrl}/mini-characters/${f}`)));
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') this.gltfs.set(files[i], r.value);
    });
    this.loaded = this.gltfs.size > 0;
  }

  get count(): number {
    return this.gltfs.size;
  }

  create(file: string, heightM: number, tint: Color | null = null): HumanAvatar {
    const gltf = this.gltfs.get(file) ?? this.gltfs.values().next().value;
    if (!gltf) return new CapsuleHuman(heightM, tint ?? new Color(0xd9a074));
    return new GltfHuman(gltf, heightM, tint);
  }
}

class GltfHuman implements HumanAvatar {
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
  private readonly scaleXZ: number;

  constructor(gltf: GLTF, heightM: number, tint: Color | null) {
    this.model = skeletonClone(gltf.scene);
    this.clips = gltf.animations;
    const box = new Box3().setFromObject(this.model);
    const h = Math.max(0.01, box.max.y - box.min.y);
    const s = heightM / h;
    this.scaleXZ = s;
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
        if (tint) c.color.multiply(tint);
        c.needsUpdate = true;
        this.materials.push(c);
        this.baseColors.push(c.color.clone());
        return c;
      });
      mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
    });
    this.root.add(this.model);
    this.mixer = new AnimationMixer(this.model);
    this.play('idle');
  }

  private clipNamed(name: string): AnimationClip | null {
    return this.clips.find((x) => x.name === name) ?? null;
  }

  play(name: AnimName, fadeS = 0.15, once = false): void {
    for (const n of CLIPS[name]) {
      if (this.clipNamed(n)) {
        this.playClip(n, fadeS, once);
        return;
      }
    }
    this.playClip('idle', fadeS, once);
  }

  playClip(name: string, fadeS = 0.15, once = false): void {
    const clip = this.clipNamed(name) ?? this.clipNamed('idle');
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
    this.model.scale.set(this.scaleXZ, this.scaleXZ * s, this.scaleXZ);
  }

  setOpacity(a: number): void {
    for (const m of this.materials) {
      const t = a < 0.999;
      if (m.transparent !== t) {
        m.transparent = t;
        m.needsUpdate = true;
      }
      m.opacity = a;
    }
  }

  attachAt(bone: string, obj: Object3D, posInRoot: Vector3, rotY = 0): void {
    const b = this.model.getObjectByName(bone) ?? this.model;
    this.root.updateMatrixWorld(true);
    const rootInv = new Matrix4().copy(this.root.matrixWorld).invert();
    const boneRel = new Matrix4().multiplyMatrices(rootInv, b.matrixWorld);
    const desired = new Matrix4().compose(posInRoot, new Quaternion().setFromAxisAngle(UP, rotY), new Vector3(1, 1, 1));
    const local = new Matrix4().copy(boneRel).invert().multiply(desired);
    local.decompose(obj.position, obj.quaternion, obj.scale);
    b.add(obj);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    for (const m of this.materials) m.dispose();
  }
}

/** Fallback when the GLBs are missing: a skin-coloured capsule with a big round head (code-driven bob). */
class CapsuleHuman implements HumanAvatar {
  readonly root = new Group();
  readonly height: number;
  readonly kind = 'procedural' as const;
  private readonly mat: MeshStandardMaterial;
  private readonly base: Color;
  private readonly body: Mesh;
  private readonly head: Mesh;
  private mode: string = 'idle';
  private t = 0;

  constructor(heightM: number, color: Color) {
    this.height = heightM;
    this.base = color.clone();
    this.mat = new MeshStandardMaterial({ color, roughness: 0.8 });
    this.body = new Mesh(new CapsuleGeometry(heightM * 0.17, heightM * 0.2, 4, 8), this.mat);
    this.body.position.y = heightM * 0.27;
    this.head = new Mesh(new SphereGeometry(heightM * 0.24, 12, 10), this.mat);
    this.head.position.y = heightM * 0.74;
    this.root.add(this.body, this.head);
  }

  play(name: AnimName): void {
    this.mode = name;
  }
  playClip(name: string): void {
    this.mode = name;
  }
  update(dt: number): void {
    this.t += dt;
    const bob = this.mode === 'walk' || this.mode === 'sprint' ? Math.sin(this.t * 9) * 0.02 : Math.sin(this.t * 2) * 0.005;
    this.head.position.y = this.height * 0.74 + bob;
    this.root.rotation.x = this.mode === 'die' ? -1.2 : 0;
  }
  setTint(color: Color | null): void {
    this.mat.color.copy(this.base);
    if (color) this.mat.color.multiply(color);
  }
  setStretch(s: number): void {
    this.root.scale.set(1, s, 1);
  }
  setOpacity(a: number): void {
    this.mat.transparent = a < 0.999;
    this.mat.opacity = a;
  }
  attachAt(_bone: string, obj: Object3D, posInRoot: Vector3, rotY = 0): void {
    obj.position.copy(posInRoot);
    obj.rotation.y = rotY;
    this.root.add(obj);
  }
  dispose(): void {
    this.mat.dispose();
    this.body.geometry.dispose();
    this.head.geometry.dispose();
  }
}
