import { describe, expect, it } from 'vitest';
import {
  DRIFT_DELAY_S,
  LANE_WIDTH,
  MAX_LATERAL_SPEED,
  MAX_OFFSET,
  SteeringModel,
  angleDelta,
  offsetToWheel,
  smoothDamp,
  wheelToOffset,
} from '../../src/drive/Steering';
import { CRY_AT, MELTDOWN_AT, MELTDOWN_S, NeedSystem, PeeMeter, WHINE_AT, driveRank, driveScore, type NeedStage } from '../../src/drive/Needs';
import { BOSS_AT, HAZARDS, SCHEDULE, Timeline, arrivalIn, cruiseSpeed, hazardHits } from '../../src/drive/Timeline';

describe('drive steering', () => {
  it('maps ±60° of wheel to ±1.2 lanes and back', () => {
    expect(wheelToOffset(0)).toBe(0);
    expect(wheelToOffset(60)).toBeCloseTo(1.2 * LANE_WIDTH);
    expect(wheelToOffset(-90)).toBeCloseTo(-MAX_OFFSET);
    expect(offsetToWheel(wheelToOffset(23))).toBeCloseTo(23);
  });

  it('wraps angle deltas across ±π', () => {
    expect(angleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(-0.2);
    expect(angleDelta(0.3, 0.1)).toBeCloseTo(0.2);
  });

  it('never exceeds 1.5 m/s lateral speed (10,000-step fuzz)', () => {
    const s = new SteeringModel();
    let seed = 1;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let wheel = 0;
    for (let i = 0; i < 10000; i++) {
      const dt = 0.005 + rnd() * 0.095;
      if (rnd() < 0.05) wheel = (rnd() * 2 - 1) * 80;
      const before = s.offset;
      s.update(dt, { held: rnd() < 0.8, wheelDeg: wheel, twoHands: rnd() < 0.3 });
      expect(Math.abs(s.offset - before) / dt).toBeLessThanOrEqual(MAX_LATERAL_SPEED + 1e-9);
      expect(Math.abs(s.offset)).toBeLessThanOrEqual(MAX_OFFSET + 1e-9);
      expect(Number.isFinite(s.offset)).toBe(true);
    }
  });

  it('settles on the target lane with a ~0.4 s spring under the cap', () => {
    const s = new SteeringModel();
    const target = offsetToWheel(LANE_WIDTH);
    let t = 0;
    while (t < 6) {
      s.update(1 / 72, { held: true, wheelDeg: target });
      t += 1 / 72;
    }
    expect(s.offset).toBeCloseTo(LANE_WIDTH, 2);
    expect(s.lane()).toBe(2);
  });

  it('drifts toward the edge only after 2 s without a hand on the wheel', () => {
    const s = new SteeringModel();
    for (let i = 0; i < 72 * DRIFT_DELAY_S - 2; i++) s.update(1 / 72, { held: false });
    expect(s.drifting).toBe(false);
    expect(s.wheelDeg).toBe(0);
    for (let i = 0; i < 72 * 10; i++) s.update(1 / 72, { held: false });
    expect(s.drifting).toBe(true);
    expect(s.offset).toBeGreaterThan(2);
    // Grabbing again stops the drift at once.
    s.update(1 / 72, { held: true, wheelDeg: 0 });
    expect(s.drifting).toBe(false);
  });

  it('smoothDamp does not overshoot', () => {
    let v = 0, x = 0;
    for (let i = 0; i < 400; i++) {
      const r = smoothDamp(x, 2, v, 0.4, 1.5, 1 / 90);
      x = r.value;
      v = r.velocity;
      expect(x).toBeLessThanOrEqual(2 + 1e-9);
    }
  });
});

describe('drive back-seat needs', () => {
  it('runs Ask → Whine → Cry → Meltdown → failed on the 8/14/20 s clock', () => {
    const sys = new NeedSystem();
    const seen: Array<[NeedStage, number]> = [];
    let t = 0;
    sys.onStage = (_n, s) => seen.push([s, t]);
    sys.start('hungry');
    while (t < MELTDOWN_AT + MELTDOWN_S + 1) {
      sys.update(0.05);
      t += 0.05;
    }
    expect(seen.map((x) => x[0])).toEqual(['ask', 'whine', 'cry', 'meltdown', 'failed']);
    expect(seen[1][1]).toBeCloseTo(WHINE_AT, 0);
    expect(seen[2][1]).toBeCloseTo(CRY_AT, 0);
    expect(seen[3][1]).toBeCloseTo(MELTDOWN_AT, 0);
    expect(sys.meltdowns).toBe(1);
    expect(sys.live.length).toBe(0);
  });

  it('scores a quick resolution as Parent of the Year and keeps one slot per kid', () => {
    const sys = new NeedSystem();
    expect(sys.start('tablet')).not.toBeNull();
    expect(sys.start('touching')).toBeNull(); // Pickle's slot is busy
    expect(sys.start('hungry')).not.toBeNull(); // Bean's is free
    sys.update(3);
    const r = sys.resolve('tablet');
    expect(r?.quick).toBe(true);
    sys.update(10);
    const r2 = sys.resolve('hungry');
    expect(r2?.quick).toBe(false);
    expect(sys.met).toBe(2);
    expect(sys.quick).toBe(1);
    expect(sys.resolve('hungry')).toBeNull();
  });

  it('cannot resolve a need once it melted down', () => {
    const sys = new NeedSystem();
    sys.start('hungry');
    sys.update(MELTDOWN_AT + 0.5);
    expect(sys.resolve('hungry')).toBeNull();
    expect(sys.fill('bean')).toBe(1);
  });

  it('"I have to pee" escalates every 30 s and never resolves', () => {
    const p = new PeeMeter();
    expect(p.update(100)).toBeNull();
    p.start();
    const levels: number[] = [];
    for (let i = 0; i < 95 * 10; i++) {
      const l = p.update(0.1);
      if (l) levels.push(l);
    }
    expect(levels).toEqual([2, 3, 4]);
  });

  it('ranks scores', () => {
    expect(driveRank(driveScore({ pops: 30, needsMet: 5, quickNeeds: 3, meltdowns: 0, dodges: 9, dents: 0, bossCracked: true }))).toBe('S');
    expect(driveRank(driveScore({ pops: 0, needsMet: 0, quickNeeds: 0, meltdowns: 4, dodges: 0, dents: 9, bossCracked: false }))).toBe('Tired');
  });
});

describe('drive timeline and hazards', () => {
  it('is sorted, puts a gremlin on the car within 10 s and has 8-10 hazards before the boss', () => {
    for (let i = 1; i < SCHEDULE.length; i++) expect(SCHEDULE[i].at).toBeGreaterThanOrEqual(SCHEDULE[i - 1].at);
    const firstClinger = SCHEDULE.find((e) => e.type === 'clinger');
    expect(firstClinger?.at).toBeLessThanOrEqual(10);
    const hazards = SCHEDULE.filter((e) => e.type === 'hazard');
    expect(hazards.length).toBeGreaterThanOrEqual(8);
    expect(hazards.length).toBeLessThanOrEqual(10);
    expect(SCHEDULE.some((e) => e.type === 'pee')).toBe(true);
    expect(SCHEDULE[SCHEDULE.length - 1]).toMatchObject({ type: 'boss', at: BOSS_AT });
    // Every hazard gives at least 1.5 s of warning.
    for (const def of Object.values(HAZARDS)) expect(def.tell).toBeGreaterThanOrEqual(1.5);
  });

  it('fires each event once, in order', () => {
    const tl = new Timeline();
    expect(tl.due(0).length).toBe(0);
    const a = tl.due(20);
    expect(a.every((e) => e.at <= 20)).toBe(true);
    expect(tl.due(20).length).toBe(0);
    tl.due(10000);
    expect(tl.done).toBe(true);
  });

  it('judges hits by lateral overlap with the car', () => {
    expect(hazardHits(0, 0, 0.5)).toBe(true);
    expect(hazardHits(LANE_WIDTH, 0, 0.5)).toBe(false);
    // The mattress covers two lanes and leaves the third free.
    expect(hazardHits(0, LANE_WIDTH / 2, HAZARDS.mattress.halfWidth)).toBe(true);
    expect(hazardHits(-LANE_WIDTH, LANE_WIDTH / 2, HAZARDS.mattress.halfWidth)).toBe(false);
    expect(arrivalIn(-30, 14, -2)).toBeCloseTo(2);
    expect(arrivalIn(-30, 0)).toBe(Infinity);
  });

  it('eases the cruise speed up without jumps', () => {
    let prev = 0;
    for (let t = 0; t < 12; t += 0.05) {
      const v = cruiseSpeed(t);
      expect(v - prev).toBeLessThan(0.2);
      prev = v;
    }
    expect(cruiseSpeed(20)).toBe(14);
  });
});
