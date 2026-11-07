import { Color } from 'three';
import type { AvatarFactory } from './Avatar';
import type { Director } from './Director';
import type { GremlinWorld } from './Gremlin';
import type { Door } from '../room/RoomModel';
import { Scamp } from './Scamp';
import { Breacher } from './Breacher';
import { Stinky } from './Stinky';
import { CouchPotato } from './CouchPotato';
import { Clinger } from './Clinger';
import { Siren } from './Siren';
import { TabletZombie } from './TabletZombie';
import { Crawler } from './Crawler';

/** Blue-grey tint for the Tablet Zombies (zombie-kid grey with screen glow). */
export const ZOMBIE_TINT = new Color(0.62, 0.82, 1.35);

export interface RosterDeps {
  director: Director;
  world: GremlinWorld;
  avatars: AvatarFactory;
  /** A new avatar variant index (cycles characters and palettes). */
  nextVariant: () => number;
  /** The door a boss is wedged in, if any: Breachers never knock on it. */
  bossDoorId: () => string | null;
}

/**
 * Registers every gremlin type the chapter 3 director (and the practice range) can spawn. Bosses are registered by
 * the chapter itself. Types listed in a wave's weights but not registered here are skipped by the director, so wave
 * tables may name types before they exist.
 */
export function registerRoster(d: RosterDeps): void {
  // world.room is re-pointed when the chapter adopts a scanned room, so read it lazily (never capture it).
  const { director, world, avatars } = d;
  director.register('scamp', { cost: 1, create: () => new Scamp(world, avatars.create(d.nextVariant(), 0.6)) });
  director.register('potato', { cost: 3, sources: ['couch', 'door', 'crack'], create: () => new CouchPotato(world, avatars.create(d.nextVariant(), 0.65)) });
  director.register('clinger', { cost: 2, sources: ['window', 'couch', 'door', 'crack'], create: () => new Clinger(world, avatars.create(d.nextVariant(), 0.5)) });
  director.register('siren', { cost: 3, sources: ['door', 'crack'], create: () => new Siren(world, avatars.create(d.nextVariant(), 0.7)) });
  director.register('stinky', { cost: 2, sources: ['crack', 'door'], create: () => new Stinky(world, avatars.create(d.nextVariant(), 0.5)) });
  director.register('breacher', {
    cost: 5,
    sources: ['door'],
    create: () => {
      // Never knock on the door a boss is wedged in.
      const boss = d.bossDoorId();
      const open = world.openDoors().filter((door) => door.id !== boss);
      const fallback: Door | undefined = world.room.portalDoors.find((door) => door.id !== boss) ?? world.room.largestDoor() ?? undefined;
      const door = open.length ? open[Math.floor(Math.random() * open.length)] : fallback;
      return new Breacher(world, avatars.create(d.nextVariant(), 0.75), door);
    },
  });
  director.register('zombie', { cost: 3, sources: ['door'], create: () => new TabletZombie(world, avatars.create(d.nextVariant(), 0.6, ZOMBIE_TINT)) });
  director.register('crawler', { cost: 1, sources: ['crack', 'door'], create: () => new Crawler(world, avatars.create(d.nextVariant(), 0.35)) });
}
