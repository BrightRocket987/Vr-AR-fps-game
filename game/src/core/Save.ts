/** Persistent state in localStorage. Versioned; every read is defensive because browser storage can be empty or throw. */

export interface FamilySheet {
  parent: string;
  kid1: string;
  kid2: string;
  weaponHand: 'left' | 'right';
  comfort: 'standing' | 'seated';
}

export interface RoomLayoutSave {
  /** Serialised RoomModel (see room/RoomModel.ts toJSON). */
  model: unknown;
  savedAt: number;
}

export interface SaveData {
  version: 1;
  lifetimePops: number;
  bestWave: number;
  family: FamilySheet;
  rooms: Record<string, RoomLayoutSave>;
  options: { vignette: boolean; reducedFlash: boolean; subtitles: boolean; music: boolean };
}

const KEY = 'gotobed.save.v1';

export const DEFAULT_SAVE: SaveData = {
  version: 1,
  lifetimePops: 0,
  bestWave: 0,
  family: { parent: 'Hey', kid1: 'Pickle', kid2: 'Bean', weaponHand: 'right', comfort: 'standing' },
  rooms: {},
  options: { vignette: false, reducedFlash: false, subtitles: true, music: true },
};

export class Save {
  data: SaveData;

  constructor() {
    this.data = Save.load();
  }

  static load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT_SAVE);
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (parsed.version !== 1) return structuredClone(DEFAULT_SAVE);
      return { ...structuredClone(DEFAULT_SAVE), ...parsed, family: { ...DEFAULT_SAVE.family, ...(parsed.family ?? {}) }, options: { ...DEFAULT_SAVE.options, ...(parsed.options ?? {}) } };
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }

  persist(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage unavailable: play on without persistence */
    }
  }

  reset(): void {
    this.data = structuredClone(DEFAULT_SAVE);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }

  export(): string {
    return btoa(unescape(encodeURIComponent(JSON.stringify(this.data))));
  }
}
