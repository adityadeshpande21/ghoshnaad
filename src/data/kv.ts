// Where the app keeps what the person makes: the browser's localStorage under one fixed prefix.
// Every key the app writes starts with "ghosh." so that other apps on the same address (every repository under
// <user>.github.io shares one storage area) never collide with it, and so that v1.1.0's keys are read unchanged.

export const PREFIX = 'ghosh.';

export interface Kv {
  get(key: string): string | null;
  /** Returns false when the browser refused (full, blocked, private window): the caller must not claim "saved". */
  set(key: string, value: string): boolean;
  remove(key: string): void;
  /** All keys, without the prefix. */
  keys(): string[];
}

export class LocalKv implements Kv {
  private storage: Storage | null;
  constructor(storage?: Storage) {
    try { this.storage = storage ?? localStorage; } catch { this.storage = null; }
  }
  get(key: string): string | null { try { return this.storage ? this.storage.getItem(PREFIX + key) : null; } catch { return null; } }
  set(key: string, value: string): boolean { try { if (!this.storage) return false; this.storage.setItem(PREFIX + key, value); return true; } catch { return false; } }
  remove(key: string): void { try { this.storage?.removeItem(PREFIX + key); } catch { /* nothing to do */ } }
  keys(): string[] {
    try {
      const s = this.storage; if (!s) return [];
      const out: string[] = [];
      for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length)); }
      return out;
    } catch { return []; }
  }
}

/** In memory: for tests, and for a browser that has no storage at all. */
export class MemoryKv implements Kv {
  private m = new Map<string, string>();
  failWrites = false;
  get(key: string): string | null { return this.m.has(key) ? this.m.get(key)! : null; }
  set(key: string, value: string): boolean { if (this.failWrites) return false; this.m.set(key, value); return true; }
  remove(key: string): void { this.m.delete(key); }
  keys(): string[] { return [...this.m.keys()]; }
}

export function getJSON<T>(kv: Kv, key: string, fallback: T): T {
  const raw = kv.get(key);
  if (raw == null) return fallback;
  try { const v = JSON.parse(raw); return v == null ? fallback : (v as T); } catch { return fallback; }
}
export const setJSON = (kv: Kv, key: string, value: unknown): boolean => kv.set(key, JSON.stringify(value));
