/**
 * Chapter 2 steering, as pure maths (no three.js): the wheel angle maps to a target lateral offset across three lanes,
 * the car's actual offset follows it on a critically damped spring (0.4 s, 0.25 s with two hands) with a hard 1.5 m/s cap,
 * and after 2 s with no hand on the wheel the wheel creeps toward the nearest road edge (the kids notice).
 * The offset moves the WORLD sideways; the camera never moves.
 */
export const LANE_WIDTH = 3.5;
/** Lane centres in road metres (left, centre, right). */
export const LANES = [-LANE_WIDTH, 0, LANE_WIDTH] as const;
export const MAX_WHEEL_DEG = 60;
/** ±1.2 lanes: reaches the shoulders. */
export const MAX_OFFSET = 1.2 * LANE_WIDTH;
export const MAX_LATERAL_SPEED = 1.5;
export const SMOOTH_TIME = 0.4;
export const SMOOTH_TIME_TWO_HANDS = 0.25;
export const DRIFT_DELAY_S = 2;
/** Drift speed of the target, m/s (0.15 lanes/s). */
export const DRIFT_SPEED = 0.15 * LANE_WIDTH;
/** Beyond this offset the tyres are on the rumble strip. */
export const RUMBLE_OFFSET = 1.05 * LANE_WIDTH;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function wheelToOffset(wheelDeg: number): number {
  return (clamp(wheelDeg, -MAX_WHEEL_DEG, MAX_WHEEL_DEG) / MAX_WHEEL_DEG) * MAX_OFFSET;
}

export function offsetToWheel(offset: number): number {
  return (clamp(offset, -MAX_OFFSET, MAX_OFFSET) / MAX_OFFSET) * MAX_WHEEL_DEG;
}

/** Signed smallest difference between two angles in radians, in (-π, π]. */
export function angleDelta(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

export interface Damped {
  value: number;
  velocity: number;
}

/**
 * Critically damped follow (Unity's SmoothDamp) plus a hard speed cap, so |Δvalue| ≤ maxSpeed·dt on every step.
 */
export function smoothDamp(current: number, target: number, velocity: number, smoothTime: number, maxSpeed: number, dt: number): Damped {
  if (dt <= 0) return { value: current, velocity };
  const st = Math.max(1e-4, smoothTime);
  const omega = 2 / st;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const maxChange = maxSpeed * st;
  const change = clamp(current - target, -maxChange, maxChange);
  const t = current - change;
  const temp = (velocity + omega * change) * dt;
  let v = (velocity - omega * temp) * exp;
  let out = t + (change + temp) * exp;
  // No overshoot.
  if (target - current > 0 === out > target) {
    out = target;
    v = 0;
  }
  // Hard cap: never faster than maxSpeed.
  const step = clamp(out - current, -maxSpeed * dt, maxSpeed * dt);
  out = current + step;
  v = clamp(v, -maxSpeed, maxSpeed);
  if (!Number.isFinite(out)) return { value: current, velocity: 0 };
  return { value: out, velocity: v };
}

export interface SteerInput {
  /** True while at least one hand grips the rim (or the thumbstick is deflected). */
  held: boolean;
  /** Wheel angle the hands dictate this frame (degrees, + = clockwise = right). Ignored when not held. */
  wheelDeg?: number;
  twoHands?: boolean;
}

export class SteeringModel {
  /** Wheel angle in degrees (+ = clockwise = right). */
  wheelDeg = 0;
  /** Car offset from the centre lane, metres (+ = right). */
  offset = 0;
  velocity = 0;
  handsOffFor = 0;
  drifting = false;
  driftDir = 1;
  /** Extra target nudge (kid kicking the seat), metres. */
  jitter = 0;
  /** When set, the car steers itself toward this offset (pulling into the driveway). */
  autopilot: number | null = null;

  get target(): number {
    return clamp(wheelToOffset(this.wheelDeg) + this.jitter, -MAX_OFFSET, MAX_OFFSET);
  }

  get onRumble(): boolean {
    return Math.abs(this.offset) > RUMBLE_OFFSET;
  }

  update(dt: number, input: SteerInput): void {
    if (this.autopilot !== null) {
      // Ease the wheel toward the autopilot's offset.
      const want = offsetToWheel(this.autopilot);
      this.wheelDeg += clamp(want - this.wheelDeg, -40 * dt, 40 * dt);
      this.handsOffFor = 0;
      this.drifting = false;
    } else if (input.held) {
      this.wheelDeg = clamp(input.wheelDeg ?? this.wheelDeg, -MAX_WHEEL_DEG, MAX_WHEEL_DEG);
      this.handsOffFor = 0;
      this.drifting = false;
    } else {
      this.handsOffFor += dt;
      if (this.handsOffFor > DRIFT_DELAY_S) {
        if (!this.drifting) {
          this.drifting = true;
          this.driftDir = this.offset >= 0 ? 1 : -1;
        }
        const degPerS = (DRIFT_SPEED / MAX_OFFSET) * MAX_WHEEL_DEG;
        this.wheelDeg = clamp(this.wheelDeg + this.driftDir * degPerS * dt, -MAX_WHEEL_DEG, MAX_WHEEL_DEG);
      }
    }
    const st = input.twoHands ? SMOOTH_TIME_TWO_HANDS : SMOOTH_TIME;
    const r = smoothDamp(this.offset, this.target, this.velocity, st, MAX_LATERAL_SPEED, dt);
    this.offset = r.value;
    this.velocity = r.velocity;
  }

  /** Index of the lane the car is mostly in (0 left, 1 centre, 2 right). */
  lane(): number {
    return clamp(Math.round(this.offset / LANE_WIDTH) + 1, 0, 2);
  }
}
