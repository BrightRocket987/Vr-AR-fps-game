import { describe, expect, it } from 'vitest';
import { Vector2, Vector3 } from 'three';
import { Director, ENDLESS_WAVES, WAVES, type SpawnSource } from '../../src/ai/Director';
import { EventBus } from '../../src/core/EventBus';
import { RoomModel } from '../../src/room/RoomModel';
import type { Gremlin } from '../../src/ai/Gremlin';

function stub(type: string): Gremlin {
  const s = {
    alive: true,
    state: 'roam',
    type,
    position: new Vector3(),
    spawnAt(p: Vector3) {
      s.position.copy(p);
    },
    dispose() {
      s.alive = false;
    },
  };
  return s as unknown as Gremlin;
}

function director(waves = WAVES): { d: Director; bus: EventBus; spawned: string[] } {
  const room = new RoomModel();
  room.bounds = [new Vector2(-3, -3), new Vector2(3, -3), new Vector2(3, 3), new Vector2(-3, 3)];
  const bus = new EventBus();
  const sources: SpawnSource[] = [{ kind: 'door', position: new Vector3(0, 0, -2.9), facing: new Vector3(0, 0, 1), doorId: 'd1' }];
  const d = new Director(room, bus, () => sources, () => new Vector3(0, 1.6, 2), 1, waves);
  const spawned: string[] = [];
  for (const t of ['scamp', 'potato', 'clinger', 'breacher', 'stinky', 'siren', 'zombie', 'crawler', 'bigbean']) {
    d.register(t, { cost: t === 'bigbean' ? 0 : 1, create: () => { spawned.push(t); return stub(t); } });
  }
  return { d, bus, spawned };
}

describe('Finale · wave table', () => {
  it('five timed waves, then Big Bean: a boss wave that never ends by time', () => {
    expect(WAVES).toHaveLength(6);
    const boss = WAVES[WAVES.length - 1];
    expect(boss.boss).toBe('bigbean');
    expect(boss.name).toMatch(/bean/i); // the app switches to the boss track on this name
    expect(boss.duration).toBe(Infinity);
    expect(Object.keys(boss.weights)).toEqual(['scamp']); // a light trickle during the fight
    expect(WAVES.slice(0, 5).every((w) => !w.boss && Number.isFinite(w.duration))).toBe(true);
  });

  it('Crawlers and Tablet Zombies join waves 3-5', () => {
    for (const w of WAVES.slice(2, 5)) expect(w.weights.crawler).toBeGreaterThan(0);
    for (const w of WAVES.slice(3, 5)) expect(w.weights.zombie).toBeGreaterThan(0);
    expect(WAVES[0].weights.crawler ?? 0).toBe(0);
    expect(WAVES[1].weights.zombie ?? 0).toBe(0);
  });

  it('the whole chapter runs about 12 minutes (waves + relaxes + a ~2 min boss + set-up)', () => {
    const timed = WAVES.filter((w) => Number.isFinite(w.duration)).reduce((s, w) => s + w.duration, 0);
    const total = timed + 4 * 10 + 120 + 60;
    expect(total).toBeGreaterThan(10.5 * 60);
    expect(total).toBeLessThan(13.5 * 60);
  });

  it('the practice range table has no boss', () => {
    expect(ENDLESS_WAVES.some((w) => w.boss)).toBe(false);
    expect(ENDLESS_WAVES).toHaveLength(5);
  });
});

describe('Finale · director', () => {
  it('can start straight at the boss wave (the ?boss=1 shortcut) and keeps it running', () => {
    const { d, bus, spawned } = director();
    const names: string[] = [];
    bus.on('wave:start', (e) => names.push(e.name));
    d.start(d.bossWaveIndex);
    expect(d.bossWaveIndex).toBe(5);
    expect(names).toEqual(['Big Bean']);
    expect(d.wave?.boss).toBe('bigbean');
    expect(spawned).not.toContain('bigbean'); // the chapter stages the boss itself
    for (let i = 0; i < 3000; i++) d.update(0.1); // five minutes
    expect(d.waveNumber).toBe(6);
    expect(new Set(spawned)).toEqual(new Set(['scamp']));
    expect(d.alive.length).toBeLessThanOrEqual(4);
  });

  it('jumpTo abandons the current wave for the boss', () => {
    const { d, bus } = director();
    const names: string[] = [];
    bus.on('wave:start', (e) => names.push(e.name));
    d.start();
    d.jumpTo(d.bossWaveIndex);
    expect(names).toEqual([WAVES[0].name, 'Big Bean']);
  });

  it('the range director loops its last wave endlessly and never reaches a boss', () => {
    const { d, bus } = director(ENDLESS_WAVES);
    const names: string[] = [];
    bus.on('wave:start', (e) => names.push(e.name));
    expect(d.bossWaveIndex).toBe(-1);
    d.start();
    const total = ENDLESS_WAVES.reduce((s, w) => s + w.duration + 10, 0) + 400;
    for (let i = 0; i < total * 10; i++) {
      d.update(0.1);
      for (const g of d.alive) g.dispose(); // keep the caps from mattering
    }
    expect(names.some((n) => /bean/i.test(n))).toBe(false);
    expect(names[names.length - 1]).toMatch(/Everyone Is Awake \+\d/);
  });
});
