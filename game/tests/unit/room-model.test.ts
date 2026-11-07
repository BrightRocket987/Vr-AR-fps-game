import { describe, expect, it } from 'vitest';
import { Vector2, Vector3 } from 'three';
import { RoomModel } from '../../src/room/RoomModel';
import { tierForPops, TIERS } from '../../src/combat/Progression';
import { normaliseLabel } from '../../src/xr/webxr-extras';

describe('RoomModel', () => {
  it('virtual room has one door 2.5 m ahead facing the player', () => {
    const m = RoomModel.virtual(new Vector3(0, 1.6, 0), new Vector3(0, 0, -1));
    expect(m.doors).toHaveLength(1);
    const d = m.doors[0];
    expect(d.center.z).toBeCloseTo(-2.5, 3);
    expect(d.normal.z).toBeCloseTo(1, 3); // points back toward the player
    expect(m.contains(0, 0)).toBe(true);
    expect(m.contains(10, 10)).toBe(false);
    expect(m.sizeClass()).toBe('large');
  });

  it('seats one gremlin per 0.6 m along the couch front edge, facing the room', () => {
    const m = new RoomModel();
    m.bounds = [new Vector2(-3, -3), new Vector2(3, -3), new Vector2(3, 3), new Vector2(-3, 3)];
    m.addVolume('couch', new Vector3(0, 0.4, 2.5), new Vector3(1.8, 0.8, 0.9), 0, 'manual');
    const seats = m.seats();
    expect(seats).toHaveLength(3);
    for (const s of seats) {
      expect(s.position.y).toBeCloseTo(0.8, 3);
      expect(s.facing.z).toBeLessThan(0); // faces the room centre at z=0
    }
  });

  it('detects blockers and keeps doors oriented into the room', () => {
    const m = new RoomModel();
    m.bounds = [new Vector2(-2, -2), new Vector2(2, -2), new Vector2(2, 2), new Vector2(-2, 2)];
    m.addVolume('table', new Vector3(1, 0.375, 1), new Vector3(1, 0.75, 0.6), 0, 'manual');
    expect(m.blockedAt(1, 1)).not.toBeNull();
    expect(m.blockedAt(-1, -1)).toBeNull();
    const d = m.addDoor(new Vector3(0, 1, -2), new Vector3(1, 0, 0), 0.9, 2, 'manual');
    expect(d.normal.z).toBeGreaterThan(0);
    const json = m.toJSON();
    const back = RoomModel.fromJSON(json);
    expect(back.doors[0].normal.z).toBeGreaterThan(0);
    expect(back.volumes).toHaveLength(1);
  });
});

describe('Progression tiers', () => {
  it('unlocks tiers at the designed thresholds', () => {
    expect(tierForPops(0).tier).toBe(0);
    expect(tierForPops(14).tier).toBe(0);
    expect(tierForPops(15).tier).toBe(1);
    expect(tierForPops(40).tier).toBe(2);
    expect(tierForPops(90).tier).toBe(3);
    expect(tierForPops(1000).tier).toBe(TIERS.length - 1);
  });
});

describe('semantic labels', () => {
  it('normalises Meta spellings to the game vocabulary', () => {
    expect(normaliseLabel('DOOR_FRAME')).toBe('door');
    expect(normaliseLabel('wall face')).toBe('wall');
    expect(normaliseLabel('desk')).toBe('table');
    expect(normaliseLabel(undefined)).toBe('other');
  });
});
