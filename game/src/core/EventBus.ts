import type { Vector3 } from 'three';

/** Typed game events. Systems communicate only through these so chapters compose from reusable parts. */
export interface GameEvents {
  'enemy:spawned': { id: number; type: string };
  'enemy:popped': { id: number; type: string; position: Vector3; headshot: boolean; style: string[] };
  'enemy:attack': { id: number; type: string; damage: number };
  'player:damaged': { amount: number; patience: number };
  'player:down': Record<string, never>;
  'weapon:fired': { tier: number };
  'weapon:reloaded': { tier: number };
  'weapon:tier': { tier: number; name: string };
  'door:knock': { doorId: string; count: number };
  'door:breached': { doorId: string };
  'door:slammed': { doorId: string };
  'wave:start': { index: number; name: string };
  'wave:clear': { index: number };
  'room:ready': { source: string; doors: number; couches: number };
  'diaper:ring': { id: number; seconds: number };
  'diaper:changed': { id: number };
  'diaper:detonated': { id: number; position: Vector3 };
  'diaper:popped': { id: number; position: Vector3 };
  'stinky:cloud': { position: Vector3; radius: number; seconds: number; fireRatePenalty: number };
  'clinger:attached': { id: number };
  'clinger:detached': { id: number; reason: string };
  'potato:cushion': { id: number; seconds: number };
  'potato:evicted': { id: number };
  'siren:inhale': { id: number };
  'siren:scream': { id: number; position: Vector3; radius: number };
  'siren:shushed': { id: number };
  'wipe:slap': { targetId: number };
  'wipe:slam': { doorId: string };
  'portal:open': { doorId: string };
  'portal:close': { doorId: string };
  'spawn:request': { type: string; position: Vector3; facing: Vector3 };
  'hint': { text: string; sub: string; seconds: number };
  'voice:line': { id: string; speaker: string };
  'log': { text: string };
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<Handler<unknown>>>();
  private readonly history: string[] = [];

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    return () => set?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(event);
    if (set) for (const h of Array.from(set)) h(payload);
    if (this.history.length > 200) this.history.shift();
    this.history.push(`${(performance.now() / 1000).toFixed(1)} ${event}${event === 'log' ? ' ' + (payload as { text: string }).text : ''}`);
  }

  /** The last events, for diagnostics exports. */
  recent(): string[] {
    return this.history.slice();
  }
}
