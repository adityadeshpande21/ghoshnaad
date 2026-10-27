// The person's own work, as v1.1.0 stored it:
//   mine  — compositions written in the composer (an array of composer records)
//   fix   — corrections to book rachanas: { <rachana id>: { src: ghosh-notation/1, at } }
// This class reads and writes exactly those shapes, so v1.1.0 data opens unchanged and v1.1.0 can still read what v2 writes.
import { getJSON, setJSON } from './kv.ts';
import type { Kv } from './kv.ts';

export interface Composition {
  id: string;
  name: string;
  blocks: unknown[];
  updated?: string;
  created?: string;
  [more: string]: unknown;
}
export interface Correction { src: Record<string, unknown>; at?: string; dl?: boolean }
export type Corrections = Record<string, Correction>;

export const isComposition = (r: unknown): r is Composition =>
  !!r && typeof r === 'object' && typeof (r as Composition).id === 'string' && Array.isArray((r as Composition).blocks);

export class UserLibrary {
  private kv: Kv;
  constructor(kv: Kv) { this.kv = kv; }

  compositions(): Composition[] {
    const v = getJSON<unknown>(this.kv, 'mine', []);
    return Array.isArray(v) ? v.filter(isComposition) : [];
  }
  /** False if the browser could not store it. */
  saveCompositions(list: Composition[]): boolean { return setJSON(this.kv, 'mine', list); }

  corrections(): Corrections {
    const v = getJSON<unknown>(this.kv, 'fix', {});
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v as Record<string, Correction>).filter(([, c]) => c && typeof c === 'object' && c.src && typeof c.src === 'object'));
  }
  saveCorrections(c: Corrections): boolean { return setJSON(this.kv, 'fix', c); }

  /** Corrections that lost to a newer copy when a backup was restored: kept, never deleted. */
  olderCorrections(): { id: string; src: Record<string, unknown>; at?: string }[] {
    const v = getJSON<unknown>(this.kv, 'fixOld', []);
    return Array.isArray(v) ? v.filter(x => x && typeof x.id === 'string' && x.src) : [];
  }
  saveOlderCorrections(list: { id: string; src: Record<string, unknown>; at?: string }[]): boolean { return setJSON(this.kv, 'fixOld', list); }

  counts(): { compositions: number; corrections: number; olderCopies: number } {
    return { compositions: this.compositions().length, corrections: Object.keys(this.corrections()).length, olderCopies: this.olderCorrections().length };
  }
  isEmpty(): boolean { const c = this.counts(); return c.compositions + c.corrections + c.olderCopies === 0; }
}
