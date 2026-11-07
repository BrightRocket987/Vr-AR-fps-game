import { Color, Group, Vector3 } from 'three';
import { vi } from 'vitest';
import { EventBus, type GameEvents } from '../../src/core/EventBus';
import { RoomModel } from '../../src/room/RoomModel';
import { Gremlin, SeatManager, type GremlinWorld, type HandLike } from '../../src/ai/Gremlin';
import type { Avatar } from '../../src/ai/Avatar';
import type { PopFx } from '../../src/combat/PopFx';

/** A HandLike the tests drive by hand. */
export class FakeHand implements HandLike {
  connected = true;
  readonly position = new Vector3();
  readonly velocity = new Vector3();
  speed = 0;
  squeeze = false;
  trigger = false;
  readonly pulses: Array<{ intensity: number; ms: number }> = [];
  private readonly fwd = new Vector3(0, 0, -1);

  forward(out = new Vector3()): Vector3 {
    return out.copy(this.fwd);
  }

  pulse(intensity: number, ms: number): void {
    this.pulses.push({ intensity, ms });
  }

  /** Place the hand and set its velocity (speed follows). */
  set(position: Vector3, velocity = new Vector3()): void {
    this.position.copy(position);
    this.velocity.copy(velocity);
    this.speed = velocity.length();
  }
}

export interface StubAvatar extends Avatar {
  played: string[];
}

export function stubAvatar(height: number): StubAvatar {
  const root = new Group();
  const played: string[] = [];
  return {
    root,
    height,
    kind: 'procedural',
    played,
    play(name) {
      played.push(name);
    },
    update() {},
    setTint() {},
    setStretch() {},
    dispose() {},
  };
}

export interface Recorded<K extends keyof GameEvents = keyof GameEvents> {
  name: K;
  payload: GameEvents[K];
}

const RECORDED: Array<keyof GameEvents> = [
  'enemy:spawned', 'enemy:popped', 'enemy:attack', 'door:knock', 'door:breached', 'door:slammed', 'diaper:ring', 'diaper:changed',
  'diaper:detonated', 'diaper:popped', 'stinky:cloud', 'wipe:slap', 'wipe:slam', 'spawn:request', 'hint', 'log',
];

export interface FakeWorld {
  w: GremlinWorld;
  room: RoomModel;
  bus: EventBus;
  events: Recorded[];
  of<K extends keyof GameEvents>(name: K): GameEvents[K][];
  player: { pos: Vector3; fwd: Vector3; damage: Array<{ amount: number; source: string }> };
  voice: { said: Array<{ speaker: string; emotion: string | undefined }>; sfx: string[] };
  fx: { pop: ReturnType<typeof vi.fn>; text: ReturnType<typeof vi.fn>; ghost: ReturnType<typeof vi.fn> };
  gremlins: Gremlin[];
  weapon: FakeHand;
  off: FakeHand;
  doorOps: Array<{ id: string; open: boolean }>;
  /** Game-time clock advanced by step(). */
  clock: { t: number };
  /** Advance `seconds` in fixed steps, updating every live gremlin and any extra per-frame callback. */
  step(seconds: number, extra?: (dt: number) => void, dt?: number): void;
}

/**
 * A GremlinWorld made of plain objects: the virtual 4 x 4 m room (door 2.5 m ahead at z = -2.5 facing +z),
 * a real EventBus with every enemy event recorded, a player at the origin facing -z, and stub hands/fx/voice.
 */
export function fakeWorld(): FakeWorld {
  const room = RoomModel.virtual(new Vector3(0, 1.6, 0), new Vector3(0, 0, -1));
  const bus = new EventBus();
  const events: Recorded[] = [];
  const record = <K extends keyof GameEvents>(name: K): void => {
    bus.on(name, (payload) => events.push({ name, payload }));
  };
  for (const n of RECORDED) record(n);
  const player = { pos: new Vector3(0, 1.6, 0), fwd: new Vector3(0, 0, -1), damage: [] as Array<{ amount: number; source: string }> };
  const voice = { said: [] as Array<{ speaker: string; emotion: string | undefined }>, sfx: [] as string[] };
  const fx = { pop: vi.fn(), text: vi.fn(), ghost: vi.fn(), tracer: vi.fn(), update: vi.fn(), group: new Group(), reducedFlash: false };
  const gremlins: Gremlin[] = [];
  const weapon = new FakeHand();
  const off = new FakeHand();
  const doorOps: Array<{ id: string; open: boolean }> = [];
  const w: GremlinWorld = {
    room,
    bus,
    fx: fx as unknown as PopFx,
    voice: {
      say: (speaker, emotion) => voice.said.push({ speaker, emotion }),
      sfx: (name) => voice.sfx.push(name),
    },
    world: new Group(),
    player: {
      position: (out = new Vector3()) => out.copy(player.pos),
      forward: (out = new Vector3()) => out.copy(player.fwd),
      damage: (amount, source) => player.damage.push({ amount, source }),
    },
    seats: new SeatManager(room),
    gremlins: () => gremlins.filter((g) => g.alive),
    reducedFlash: false,
    weaponHand: () => weapon,
    offHand: () => off,
    nav: null,
    openDoors: () => room.portalDoors,
    setDoorOpen: (id, open) => doorOps.push({ id, open }),
  };
  const clock = { t: 0 };
  const step = (seconds: number, extra?: (dt: number) => void, dt = 1 / 72): void => {
    const n = Math.round(seconds / dt);
    for (let i = 0; i < n; i++) {
      for (const g of gremlins) if (g.alive) g.update(dt);
      extra?.(dt);
      clock.t += dt;
    }
  };
  const of = <K extends keyof GameEvents>(name: K): GameEvents[K][] => events.filter((e) => e.name === name).map((e) => e.payload as GameEvents[K]);
  return { w, room, bus, events, of, player, voice, fx, gremlins, weapon, off, doorOps, clock, step };
}

/** A featureless gremlin for tool tests (HP 10, stands still). */
export class Dummy extends Gremlin {
  readonly type = 'dummy';
  readonly speaker = 'scamp';
  constructor(w: GremlinWorld, avatar: Avatar) {
    super(w, avatar, { hp: 10, speed: 1, height: 0.6, color: new Color(0xff5a5a), xp: 1 });
  }
  protected tick(): void {}
}
