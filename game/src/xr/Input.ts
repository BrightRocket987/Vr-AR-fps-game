import { Group, Quaternion, Scene, Vector2, Vector3, WebGLRenderer } from 'three';

export type Handedness = 'left' | 'right' | 'none';

/** Per-hand state, identical for controllers and tracked hands. */
export class HandState {
  handedness: Handedness = 'none';
  connected = false;
  isHand = false;
  inputSource: XRInputSource | null = null;
  /** Grip space group (controller) or a synthetic group driven from the wrist joint (hands). */
  readonly grip: Group;
  readonly ray: Group;
  readonly hand: Group;
  readonly position = new Vector3();
  readonly quaternion = new Quaternion();
  readonly velocity = new Vector3();
  readonly angularVelocity = new Vector3();
  speed = 0;
  trigger = false;
  triggerJustPressed = false;
  triggerJustReleased = false;
  triggerValue = 0;
  squeeze = false;
  squeezeJustPressed = false;
  squeezeJustReleased = false;
  readonly thumbstick = new Vector2();
  buttonA = false; // X on left / A on right
  buttonAJustPressed = false;
  buttonB = false; // Y on left / B on right
  buttonBJustPressed = false;
  thumbstickClick = false;
  thumbstickClickJustPressed = false;
  private prevA = false;
  private prevB = false;
  private prevStick = false;
  private lastPos = new Vector3();
  private lastQuat = new Quaternion();
  private hasLast = false;
  /** Recent positions for throw-velocity smoothing. */
  private readonly trail: { t: number; p: Vector3 }[] = [];

  constructor(grip: Group, ray: Group, hand: Group) {
    this.grip = grip;
    this.ray = ray;
    this.hand = hand;
  }

  /** Forward direction of the grip (-Z of the grip space, the usual "barrel" direction). */
  forward(out = new Vector3()): Vector3 {
    return out.set(0, 0, -1).applyQuaternion(this.quaternion).normalize();
  }

  pulse(intensity: number, ms: number): void {
    const gp = this.inputSource?.gamepad as (Gamepad & { hapticActuators?: Array<{ pulse?: (v: number, ms: number) => Promise<unknown> }> }) | undefined;
    const act = gp?.hapticActuators?.[0];
    if (act?.pulse) {
      try {
        void act.pulse(Math.min(1, Math.max(0, intensity)), ms);
      } catch {
        /* ignore */
      }
    }
  }

  /** Average velocity over the last ~100 ms, for throws. */
  smoothedVelocity(out = new Vector3()): Vector3 {
    const n = this.trail.length;
    if (n < 2) return out.copy(this.velocity);
    const a = this.trail[0], b = this.trail[n - 1];
    const dt = Math.max(1e-3, (b.t - a.t) / 1000);
    return out.copy(b.p).sub(a.p).divideScalar(dt);
  }

  /** @internal */
  updateKinematics(dt: number, nowMs: number): void {
    // Pick the best pose source: grip (controllers) or wrist joint (hands).
    let src: Group = this.grip;
    if (this.isHand) {
      const wrist = (this.hand as Group & { joints?: Record<string, Group> }).joints?.['wrist'];
      if (wrist) src = wrist;
    }
    src.getWorldPosition(this.position);
    src.getWorldQuaternion(this.quaternion);
    if (this.hasLast && dt > 0) {
      this.velocity.copy(this.position).sub(this.lastPos).divideScalar(dt);
      this.speed = this.velocity.length();
      const dq = this.lastQuat.clone().invert().multiply(this.quaternion);
      const angle = 2 * Math.acos(Math.min(1, Math.abs(dq.w)));
      const axis = new Vector3(dq.x, dq.y, dq.z);
      if (axis.lengthSq() > 1e-9) axis.normalize().multiplyScalar(angle / dt);
      this.angularVelocity.copy(axis);
    }
    this.lastPos.copy(this.position);
    this.lastQuat.copy(this.quaternion);
    this.hasLast = true;
    this.trail.push({ t: nowMs, p: this.position.clone() });
    while (this.trail.length > 0 && nowMs - this.trail[0].t > 120) this.trail.shift();
  }

  /** @internal */
  pollGamepad(): void {
    const gp = this.inputSource?.gamepad;
    this.buttonAJustPressed = false;
    this.buttonBJustPressed = false;
    this.thumbstickClickJustPressed = false;
    if (!gp) {
      this.triggerValue = this.trigger ? 1 : 0;
      return;
    }
    const b = gp.buttons;
    this.triggerValue = b[0]?.value ?? (this.trigger ? 1 : 0);
    this.thumbstick.set(gp.axes[2] ?? 0, gp.axes[3] ?? 0);
    const stick = !!b[3]?.pressed;
    const a = !!b[4]?.pressed;
    const bb = !!b[5]?.pressed;
    this.thumbstickClickJustPressed = stick && !this.prevStick;
    this.buttonAJustPressed = a && !this.prevA;
    this.buttonBJustPressed = bb && !this.prevB;
    this.thumbstickClick = stick;
    this.buttonA = a;
    this.buttonB = bb;
    this.prevStick = stick;
    this.prevA = a;
    this.prevB = bb;
  }

  /** @internal called at the end of the frame */
  endFrame(): void {
    this.triggerJustPressed = false;
    this.triggerJustReleased = false;
    this.squeezeJustPressed = false;
    this.squeezeJustReleased = false;
  }
}

/**
 * Unified input for two XR input sources. Uses three.js's controller groups (which the WebXRManager
 * updates every frame) plus select/squeeze events, which fire for both controllers and hand pinches.
 */
export class Input {
  readonly slots: HandState[] = [];
  private dominant: Handedness = 'right';

  constructor(private readonly renderer: WebGLRenderer, scene: Scene) {
    for (let i = 0; i < 2; i++) {
      const ray = renderer.xr.getController(i);
      const grip = renderer.xr.getControllerGrip(i);
      const hand = renderer.xr.getHand(i);
      scene.add(ray, grip, hand);
      const state = new HandState(grip, ray, hand);
      this.slots.push(state);
      ray.addEventListener('connected', (e) => {
        const src = (e as unknown as { data: XRInputSource }).data;
        state.inputSource = src;
        state.connected = true;
        state.handedness = (src.handedness as Handedness) ?? 'none';
        state.isHand = !!src.hand;
      });
      ray.addEventListener('disconnected', () => {
        state.connected = false;
        state.inputSource = null;
        state.trigger = false;
        state.squeeze = false;
      });
      ray.addEventListener('selectstart', () => {
        state.trigger = true;
        state.triggerJustPressed = true;
      });
      ray.addEventListener('selectend', () => {
        state.trigger = false;
        state.triggerJustReleased = true;
      });
      ray.addEventListener('squeezestart', () => {
        state.squeeze = true;
        state.squeezeJustPressed = true;
      });
      ray.addEventListener('squeezeend', () => {
        state.squeeze = false;
        state.squeezeJustReleased = true;
      });
    }
  }

  setDominant(h: 'left' | 'right'): void {
    this.dominant = h;
  }

  get weaponHand(): HandState {
    return this.get(this.dominant) ?? this.slots[0];
  }
  get offHand(): HandState {
    return this.get(this.dominant === 'right' ? 'left' : 'right') ?? this.slots[1];
  }

  get(h: Handedness): HandState | undefined {
    return this.slots.find((s) => s.connected && s.handedness === h) ?? this.slots.find((s) => s.handedness === h);
  }

  /** Any connected source at all (used to decide whether to show the "pick up your controllers" hint). */
  get anyConnected(): boolean {
    return this.slots.some((s) => s.connected);
  }

  update(dt: number, nowMs: number): void {
    for (const s of this.slots) {
      s.pollGamepad();
      s.updateKinematics(dt, nowMs);
    }
  }

  endFrame(): void {
    for (const s of this.slots) s.endFrame();
  }

  get isPresenting(): boolean {
    return this.renderer.xr.isPresenting;
  }
}
