import { AudioListener, Clock, Group, HemisphereLight, PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer } from 'three';
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

  /** Must be called from a user gesture. */
  async enter(preferAR: boolean, chapter: Chapter): Promise<XRMode> {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr) throw new Error('WebXR is not available in this browser.');
    const { ar, vr } = await XRApp.supported();
    const mode: XRMode = preferAR && ar ? 'immersive-ar' : vr ? 'immersive-vr' : 'immersive-ar';
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
      this.chapter?.dispose();
      this.chapter = null;
      this.world.clear();
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
    this.chapter = chapter;
    this.clock.start();
    this.fpsWindowStart = performance.now();
    await chapter.start(this.context);
    this.renderer.setAnimationLoop((t, frame) => this.tick(t, frame));
    this.bus.emit('log', { text: `session ${mode} features=${(extras.enabledFeatures ?? []).join(',')}` });
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
    this.input.update(dt, now);
    if (this.chapter) this.chapter.update(dt, frame, now);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
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
