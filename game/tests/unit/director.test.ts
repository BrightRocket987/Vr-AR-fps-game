import { describe, expect, it } from 'vitest';
import { Vector2, Vector3 } from 'three';
import { Director, WAVES, type SpawnSource } from '../../src/ai/Director';
import { EventBus } from '../../src/core/EventBus';
import { RoomModel } from '../../src/room/RoomModel';
import type { Gremlin } from '../../src/ai/Gremlin';

interface Stub {
  alive: boolean;
  state: string;
  type: string;
  position: Vector3;
  spawnAt(p: Vector3, f: Vector3): void;
  dispose(): void;
}

function stub(type: string, state = 'roam'): Gremlin {
  const s: Stub = {
    alive: true,
    state,
    type,
    position: new Vector3(),
    spawnAt(p) {
      s.position.copy(p);
    },
    dispose() {
      s.alive = false;
    },
  };
  return s as unknown as Gremlin;
}

function setup(): { d: Director; bus: EventBus; spawned: string[]; sources: SpawnSource[] } {
  const room = new RoomModel();
  room.bounds = [new Vector2(-3, -3), new Vector2(3, -3), new Vector2(3, 3), new Vector2(-3, 3)];
  const bus = new EventBus();
  const sources: SpawnSource[] = [{ kind: 'door', position: new Vector3(0, 0, -2.9), facing: new Vector3(0, 0, 1), doorId: 'd1' }];
  const d = new Director(room, bus, () => sources, () => new Vector3(0, 1.6, 2), 1);
  const spawned: string[] = [];
  d.register('scamp', { cost: 1, create: () => { spawned.push('scamp'); return stub('scamp'); } });
  d.register('potato', { cost: 3, create: () => { spawned.push('potato'); return stub('potato'); } });
  return { d, bus, spawned, sources };
}

describe('Director', () => {
  it('spawns the opening gremlin at a door, 0.3 m into the room', () => {
    const { d, spawned } = setup();
    const waves: string[] = [];
    d.start();
    expect(spawned).toEqual(['scamp']);
    expect(d.alive[0].position.z).toBeCloseTo(-2.6, 3);
    expect(waves.length).toBe(0);
  });

  it('respects the alive cap and spends credits at the wave rate', () => {
    const { d } = setup();
    d.start();
    for (let i = 0; i < 600; i++) d.update(0.1); // 60 s of wave 1 (rate 0.35/s, cap 4)
    expect(d.alive.length).toBeLessThanOrEqual(WAVES[0].maxAlive);
    expect(d.total).toBeGreaterThanOrEqual(4);
  });

  it('advances to the next wave after duration + relax and announces it', () => {
    const { d, bus } = setup();
    const names: string[] = [];
    bus.on('wave:start', (e) => names.push(e.name));
    d.start();
    for (let i = 0; i < (WAVES[0].duration + 11) * 10; i++) d.update(0.1);
    expect(names[0]).toBe(WAVES[0].name);
    expect(names[1]).toBe(WAVES[1].name);
    expect(d.waveNumber).toBe(2);
  });

  it('summons a Couch Potato when three gremlins are sitting', () => {
    const { d, spawned } = setup();
    d.start();
    // Force three sitters into the alive list.
    for (let i = 0; i < 3; i++) d.alive.push(stub('scamp', 'sit'));
    d.update(0.1);
    expect(spawned.filter((t) => t === 'potato').length).toBe(1);
  });
});
