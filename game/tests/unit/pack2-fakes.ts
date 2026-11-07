import { Group, Vector2, Vector3 } from 'three';
import { EventBus, type GameEvents } from '../../src/core/EventBus';
import type { PopFx } from '../../src/combat/PopFx';
import { RoomModel } from '../../src/room/RoomModel';
import { SeatManager, type Gremlin, type GremlinWorld, type HandLike } from '../../src/ai/Gremlin';
import type { AnimName, Avatar } from '../../src/ai/Avatar';

/** Records clip names instead of animating. */
export class StubAvatar implements Avatar {
  readonly root = new Group();
  readonly kind = 'procedural' as const;
  readonly plays: AnimName[] = [];
  stretch = 1;
  disposed = false;
  constructor(readonly height: number) {}
  play(name: AnimName): void {
    this.plays.push(name);
  }
  update(): void {}
  setTint(): void {}
  setStretch(s: number): void {
    this.stretch = s;
  }
  dispose(): void {
    this.disposed = true;
  }
}

export class StubHand implements HandLike {
  connected = true;
  readonly position = new Vector3();
  readonly velocity = new Vector3();
  speed = 0;
  squeeze = false;
  trigger = false;
  pulses = 0;
  forward(out = new Vector3()): Vector3 {
    return out.set(0, 0, -1);
  }
  pulse(): void {
    this.pulses++;
  }
  /** Set the velocity (and derived speed) the hand reports this frame. */
  move(vx: number, vy: number, vz: number): void {
    this.velocity.set(vx, vy, vz);
    this.speed = this.velocity.length();
  }
}

export interface FakeWorld extends GremlinWorld {
  head: Vector3;
  fwd: Vector3;
  damage: Array<{ amount: number; source: string }>;
  fxCalls: string[];
  sfx: string[];
  lines: Array<{ speaker: string; emotion: string | undefined }>;
  weapon: StubHand;
  off: StubHand;
  living: Gremlin[];
}

export interface FakeWorldOptions {
  /** A 1.8 m couch against the +z wall (three seats facing -z). */
  couch?: boolean;
  /** A 1 x 0.6 m table at (2, 0). */
  table?: boolean;
  head?: Vector3;
  forward?: Vector3;
}

/** A 6 x 6 m room with optional furniture; everything heavy (audio, GPU) is a recorder. */
export function makeWorld(opts: FakeWorldOptions = {}): FakeWorld {
  const room = new RoomModel();
  room.bounds = [new Vector2(-3, -3), new Vector2(3, -3), new Vector2(3, 3), new Vector2(-3, 3)];
  if (opts.couch) room.addVolume('couch', new Vector3(0, 0.4, 2.5), new Vector3(1.8, 0.8, 0.9), 0, 'manual');
  if (opts.table) room.addVolume('table', new Vector3(2, 0.375, 0), new Vector3(1, 0.75, 0.6), 0, 'manual');
  const head = opts.head?.clone() ?? new Vector3(0, 1.6, 0);
  const fwd = opts.forward?.clone() ?? new Vector3(0, 0, -1);
  const fxCalls: string[] = [];
  const fx = {
    group: new Group(),
    reducedFlash: false,
    pop: () => {
      fxCalls.push('pop');
    },
    ghost: () => {
      fxCalls.push('ghost');
    },
    text: (_p: Vector3, text: string) => {
      fxCalls.push(`text:${text}`);
    },
    tracer: () => {
      fxCalls.push('tracer');
    },
    update: () => {},
  } as unknown as PopFx;
  const sfx: string[] = [];
  const lines: FakeWorld['lines'] = [];
  const damage: FakeWorld['damage'] = [];
  const living: Gremlin[] = [];
  const weapon = new StubHand();
  weapon.position.set(0.3, 1.2, -0.4);
  const off = new StubHand();
  off.position.set(-0.3, 1.1, -0.3);
  const w: FakeWorld = {
    room,
    bus: new EventBus(),
    fx,
    voice: {
      say: (speaker, emotion) => {
        lines.push({ speaker, emotion });
      },
      sfx: (name) => {
        sfx.push(name);
      },
    },
    world: new Group(),
    player: {
      position: (out = new Vector3()) => out.copy(head),
      forward: (out = new Vector3()) => out.copy(fwd),
      damage: (amount, source) => {
        damage.push({ amount, source });
      },
    },
    seats: new SeatManager(room),
    gremlins: () => living,
    reducedFlash: false,
    weaponHand: () => weapon,
    offHand: () => off,
    nav: null,
    openDoors: () => [],
    setDoorOpen: () => {},
    head,
    fwd,
    damage,
    fxCalls,
    sfx,
    lines,
    weapon,
    off,
    living,
  };
  return w;
}

/** Advance one or more gremlins by `seconds` in fixed `dt` steps. */
export function step(gs: Gremlin | Gremlin[], seconds: number, dt = 1 / 60): void {
  const list = Array.isArray(gs) ? gs : [gs];
  let t = 0;
  while (t < seconds - 1e-9) {
    const h = Math.min(dt, seconds - t);
    for (const g of list) g.update(h);
    t += h;
  }
}

/** Absolute-time stepping: `to(T)` advances the gremlins to T seconds after the clock was made. */
export function clock(gs: Gremlin | Gremlin[], dt = 1 / 60): { t: number; to: (seconds: number) => void } {
  const c = {
    t: 0,
    to(seconds: number): void {
      if (seconds > c.t) step(gs, seconds - c.t, dt);
      c.t = seconds;
    },
  };
  return c;
}

/** Step until `pred` holds or `maxSeconds` pass; returns the simulated seconds used. */
export function stepUntil(gs: Gremlin | Gremlin[], pred: () => boolean, maxSeconds: number, dt = 1 / 60): number {
  const list = Array.isArray(gs) ? gs : [gs];
  let t = 0;
  while (!pred() && t < maxSeconds) {
    for (const g of list) g.update(dt);
    t += dt;
  }
  return t;
}

/** Collect payloads of one event. */
export function record<K extends keyof GameEvents>(bus: EventBus, event: K): Array<GameEvents[K]> {
  const out: Array<GameEvents[K]> = [];
  bus.on(event, (p) => {
    out.push(p);
  });
  return out;
}
