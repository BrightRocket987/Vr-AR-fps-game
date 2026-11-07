import { AudioListener, BackSide, Clock, Group, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Scene, SphereGeometry, Vector3, WebGLRenderer } from 'three';
import { EventBus } from '../core/EventBus';
import { Save } from '../core/Save';
import { Input } from '../xr/Input';
import { sessionExtras } from '../xr/webxr-extras';

export type XRMode = 'immersive-ar' | 'immersive-vr';

/** What a chapter must implement to be driven by the app. */
export interface Chapter {
  readonly name: string;
  start(ctx: AppContext): Promise<void> | void;
  update(dt: number, frame: XRFrame | undefined, nowMs: number): void;
  dispose(): void;
}

/** What a chapter reports when it finishes (shown on the end card). */
export interface ChapterResult {
  chapter?: string;
  title?: string;
  pops?: number;
  rank?: string;
  lines?: string[];
}

/** Optional hooks chapters may implement for diagnostics and the headless tests. */
export interface DebugChapter {
  snapshot?(): Record<string, unknown>;
  roomJSON?(): unknown;
  /** Pop (or knock out) the nearest enemy as if shot. Returns false if there is none. */
  debugShootNearest?(): boolean;
  /** Skip any "pull the trigger to begin" gate. */
  debugBegin?(): void;
  /** Jump straight to the chapter's end (tests the transition to the next chapter). */
  debugFinish?(): void;
}

export interface AppContext {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  /** Parent for everything a chapter adds; cleared on dispose. */
  world: Group;
  input: Input;
  bus: EventBus;
  save: Save;
  listener: AudioListener;
  mode: XRMode;
  refSpace: () => XRReferenceSpace | null;
  session: () => XRSession | null;
  isQuest2: boolean;
  headPosition: (out?: Vector3) => Vector3;
  headForward: (out?: Vector3) => Vector3;
  log: (text: string) => void;
  /** Fade the whole view to black (1) or back to clear (0) over `seconds`. */
  fade: (to: number, seconds: number) => Promise<void>;
  /** The chapter is finished: the app fades out, disposes it and starts the next chapter of the campaign. */
  complete: (result?: ChapterResult) => void;
  /** Results of the chapters finished so far in this session. */
  results: () => ChapterResult[];
  /** Name of the chapter that follows this one in the campaign, or null if this is the last. */
  nextChapter: () => string | null;
  /** Start the campaign again from its first chapter (end card). */
  restart: () => void;
}

export interface Diagnostics {
  version: string;
  ua: string;
  mode: XRMode | 'none';
  enabledFeatures: string[];
  frameRate: number | undefined;
  blend: string | undefined;
  fps: number;
  frames: number;
  drawCalls: number;
  triangles: number;
  events: string[];
  extra: Record<string, unknown>;
}

/**
 * Owns the renderer, the single XR session and the frame loop. Chapters plug in as `Chapter`s.
 * The whole game runs in one `immersive-ar` session when the device supports it: VR chapters draw an
 * opaque world over the passthrough; the house chapter leaves it transparent.
 */
export class XRApp {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly world = new Group();
  readonly bus = new EventBus();
  readonly save = new Save();
  readonly listener = new AudioListener();
  readonly input: Input;
  readonly isQuest2: boolean;
  version = 'dev';
  mode: XRMode | 'none' = 'none';
  private session: XRSession | null = null;
  private refSpace: XRReferenceSpace | null = null;
  private chapter: Chapter | null = null;
  private readonly clock = new Clock(false);
  private frames = 0;
  private fpsWindowStart = 0;
  private fpsWindowFrames = 0;
  fps = 0;
  readonly extraDiagnostics: Record<string, unknown> = {};
  onSessionEnd: (() => void) | null = null;
  /** Called whenever a new chapter becomes current (for diagnostics and the debug API). */
  onChapterChange: ((chapter: Chapter) => void) | null = null;
  /** Builds a chapter by name ('bar', 'drive', 'house', 'range', 'end'). */
  chapterFactory: ((name: string) => Chapter | null) | null = null;
  private sequence: string[] = [];
  private seqIndex = 0;
  private transitioning = false;
  private chapterReady = false;
  /** The chapter being faded out (its repeated complete() calls are ignored). */
  private outgoing: Chapter | null = null;
  /** A completion requested by the incoming chapter while the transition was still running. */
  private pending: { result?: ChapterResult; restart: boolean } | null = null;
  private readonly finished: ChapterResult[] = [];
  private readonly fadeMesh: Mesh;
  private fadeFrom = 0;
  private fadeTo = 0;
  private fadeT = 1;
  private fadeDur = 0;
  private fadeResolve: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, stencil: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');
    container.appendChild(this.renderer.domElement);
    this.camera = new PerspectiveCamera(70, 1, 0.02, 60);
    this.camera.add(this.listener);
    this.scene.add(this.camera);
    this.scene.add(this.world);
    this.scene.add(new HemisphereLight(0xffffff, 0x334455, 1.2));
    this.input = new Input(this.renderer, this.scene);
    this.isQuest2 = /Quest 2/i.test(navigator.userAgent);
    // A black sphere around the head for chapter transitions (children of the camera follow the headset).
    const fadeMat = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, side: BackSide, depthTest: false, depthWrite: false });
    this.fadeMesh = new Mesh(new SphereGeometry(0.3, 16, 12), fadeMat);
    this.fadeMesh.renderOrder = 10000;
    this.fadeMesh.frustumCulled = false;
    this.fadeMesh.visible = false;
    this.camera.add(this.fadeMesh);
  }

  /** Animate the transition sphere; resolves when the target opacity is reached. */
  fade(to: number, seconds: number): Promise<void> {
    const mat = this.fadeMesh.material as MeshBasicMaterial;
    this.fadeResolve?.();
    this.fadeFrom = mat.opacity;
    this.fadeTo = Math.max(0, Math.min(1, to));
    this.fadeDur = Math.max(0, seconds);
    this.fadeT = 0;
    if (this.fadeDur === 0 || !this.renderer.xr.isPresenting) {
      mat.opacity = this.fadeTo;
      this.fadeMesh.visible = this.fadeTo > 0.001;
      this.fadeT = 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.fadeResolve = resolve;
    });
  }

  private updateFade(dt: number): void {
    if (this.fadeT >= 1) return;
    this.fadeT = Math.min(1, this.fadeT + dt / this.fadeDur);
    const k = this.fadeT * this.fadeT * (3 - 2 * this.fadeT);
    const mat = this.fadeMesh.material as MeshBasicMaterial;
    mat.opacity = this.fadeFrom + (this.fadeTo - this.fadeFrom) * k;
    this.fadeMesh.visible = mat.opacity > 0.001;
    if (this.fadeT >= 1) {
      const r = this.fadeResolve;
      this.fadeResolve = null;
      r?.();
    }
  }

  /** Current chapter (for the debug API). */
  get currentChapter(): Chapter | null {
    return this.chapter;
  }

  /** Finish the current chapter and start the next one in the sequence (or the end card). */
  private async advance(result?: ChapterResult, restart = false): Promise<void> {
    if (this.transitioning) {
      // Only the incoming chapter may queue the next step; the outgoing one already completed.
      if (this.chapter && this.chapter !== this.outgoing) this.pending = { result, restart };
      return;
    }
    this.transitioning = true;
    this.outgoing = this.chapter;
    try {
      const name = this.chapter?.name ?? this.sequence[this.seqIndex] ?? 'unknown';
      if (restart) {
        this.finished.length = 0;
        this.seqIndex = -1;
      } else this.finished.push({ chapter: name, ...result });
      this.bus.emit('log', { text: restart ? 'campaign restart' : `chapter complete: ${name}` });
      await this.fade(1, 0.8);
      this.chapterReady = false;
      try {
        this.chapter?.dispose();
      } catch (e) {
        this.reportError(e);
      }
      this.chapter = null;
      this.outgoing = null;
      this.world.clear();
      this.seqIndex++;
      const nextName = this.sequence[this.seqIndex] ?? 'end';
      const next = this.chapterFactory?.(nextName) ?? null;
      if (next) {
        this.chapter = next;
        this.onChapterChange?.(next);
        try {
          await next.start(this.context);
          this.chapterReady = true;
        } catch (e) {
          this.reportError(e);
        }
      }
      await this.fade(0, 0.8);
    } finally {
      this.transitioning = false;
      this.outgoing = null;
      const p = this.pending;
      this.pending = null;
      if (p && this.session) void this.advance(p.result, p.restart);
    }
  }

  /** Restart the campaign from its first chapter (used by the end card). */
  restart(): void {
    void this.advance(undefined, true);
  }

  private ctx: AppContext | null = null;

  get context(): AppContext {
    if (this.ctx) return this.ctx;
    const head = new Vector3();
    const q = new Quaternion();
    const activeCamera = () => (this.renderer.xr.isPresenting ? this.renderer.xr.getCamera() : this.camera);
    const self = this;
    this.ctx = {
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      world: this.world,
      input: this.input,
      bus: this.bus,
      save: this.save,
      listener: this.listener,
      get mode(): XRMode {
        return self.mode === 'none' ? 'immersive-ar' : self.mode;
      },
      refSpace: () => this.refSpace,
      session: () => this.session,
      isQuest2: this.isQuest2,
      headPosition: (out = head) => activeCamera().getWorldPosition(out),
      headForward: (out = new Vector3()) => {
        activeCamera().getWorldQuaternion(q);
        return out.set(0, 0, -1).applyQuaternion(q).normalize();
      },
      log: (text) => this.bus.emit('log', { text }),
      fade: (to, seconds) => this.fade(to, seconds),
      complete: (result) => {
        void this.advance(result);
      },
      results: () => this.finished.slice(),
      nextChapter: () => this.sequence[this.seqIndex + 1] ?? null,
      restart: () => this.restart(),
    };
    return this.ctx;
  }

  static async supported(): Promise<{ ar: boolean; vr: boolean }> {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr) return { ar: false, vr: false };
    const [ar, vr] = await Promise.all([
      xr.isSessionSupported('immersive-ar').catch(() => false),
      xr.isSessionSupported('immersive-vr').catch(() => false),
    ]);
    return { ar, vr };
  }

  /**
   * Must be called from a user gesture. `requestSession` is the very first await so the click's transient
   * activation is still valid on the headset. `sequence` is the list of chapter names to play in order.
   */
  async enter(mode: XRMode, sequence: string[]): Promise<XRMode> {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr) throw new Error('WebXR is not available in this browser.');
    if (!this.chapterFactory) throw new Error('No chapter factory set.');
    const optionalFeatures = ['hand-tracking', 'plane-detection', 'mesh-detection', 'hit-test', 'anchors', 'local-floor', 'bounded-floor'];
    const session = await xr.requestSession(mode, { requiredFeatures: ['local'], optionalFeatures });
    this.session = session;
    this.mode = mode;
    // Audio unlock in the same gesture.
    try {
      const ctx = this.listener.context;
      if (ctx.state === 'suspended') void ctx.resume();
    } catch {
      /* ignore */
    }
    session.addEventListener('end', () => {
      this.renderer.setAnimationLoop(null);
      this.session = null;
      this.refSpace = null;
      this.mode = 'none';
      this.chapterReady = false;
      try {
        this.chapter?.dispose();
      } catch {
        /* ignore */
      }
      this.chapter = null;
      this.world.clear();
      const mat = this.fadeMesh.material as MeshBasicMaterial;
      mat.opacity = 0;
      this.fadeMesh.visible = false;
      this.fadeT = 1;
      this.fadeResolve?.();
      this.fadeResolve = null;
      this.transitioning = false;
      this.onSessionEnd?.();
    });
    await this.renderer.xr.setSession(session);
    this.refSpace = this.renderer.xr.getReferenceSpace();
    const extras = sessionExtras(session);
    try {
      if (extras.updateTargetFrameRate) await extras.updateTargetFrameRate(this.isQuest2 ? 72 : 90);
    } catch {
      /* some runtimes refuse: fine */
    }
    try {
      this.renderer.xr.setFoveation(1);
    } catch {
      /* ignore */
    }
    this.input.setDominant(this.save.data.family.weaponHand);
    this.sequence = sequence.length ? sequence.slice() : ['house'];
    this.seqIndex = 0;
    this.finished.length = 0;
    const first = this.chapterFactory(this.sequence[0]);
    if (!first) throw new Error(`Unknown chapter: ${this.sequence[0]}`);
    this.chapter = first;
    this.onChapterChange?.(first);
    this.clock.start();
    this.fpsWindowStart = performance.now();
    this.chapterReady = false;
    this.renderer.setAnimationLoop((t, frame) => this.tick(t, frame));
    await first.start(this.context);
    this.chapterReady = true;
    this.bus.emit('log', { text: `session ${mode} features=${(extras.enabledFeatures ?? []).join(',')} sequence=${this.sequence.join('>')}` });
    return mode;
  }

  private tick(_t: number, frame: XRFrame | undefined): void {
    const dt = Math.min(0.1, this.clock.getDelta());
    const now = performance.now();
    this.frames++;
    this.fpsWindowFrames++;
    if (now - this.fpsWindowStart > 1000) {
      this.fps = (this.fpsWindowFrames * 1000) / (now - this.fpsWindowStart);
      this.fpsWindowStart = now;
      this.fpsWindowFrames = 0;
    }
    // three.js requests the next XR frame only after this callback returns, so an exception here would freeze the
    // headset view. Everything is guarded; errors are logged (console.error is what the headless tests watch).
    try {
      this.input.update(dt, now);
      if (this.chapter && this.chapterReady) this.chapter.update(dt, frame, now);
    } catch (e) {
      this.reportError(e);
    }
    this.updateFade(dt);
    try {
      this.renderer.render(this.scene, this.camera);
    } catch (e) {
      this.reportError(e);
    }
    this.input.endFrame();
  }

  private errorCount = 0;
  private lastErrorAt = 0;
  private reportError(e: unknown): void {
    this.errorCount++;
    const now = performance.now();
    if (now - this.lastErrorAt < 2000) return;
    this.lastErrorAt = now;
    const msg = e instanceof Error ? `${e.message} @ ${(e.stack ?? '').split('\n')[1]?.trim() ?? ''}` : String(e);
    console.error('[frame]', msg);
    this.bus.emit('log', { text: `ERROR x${this.errorCount}: ${msg}` });
    this.extraDiagnostics.lastError = msg;
    this.extraDiagnostics.errorCount = this.errorCount;
  }

  async exit(): Promise<void> {
    await this.session?.end().catch(() => undefined);
  }

  diagnostics(): Diagnostics {
    const extras = this.session ? sessionExtras(this.session) : undefined;
    return {
      version: this.version,
      ua: navigator.userAgent,
      mode: this.mode,
      enabledFeatures: extras?.enabledFeatures ? Array.from(extras.enabledFeatures) : [],
      frameRate: extras?.frameRate,
      blend: extras?.environmentBlendMode,
      fps: Math.round(this.fps),
      frames: this.frames,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      events: this.bus.recent().slice(-40),
      extra: this.extraDiagnostics,
    };
  }
}
