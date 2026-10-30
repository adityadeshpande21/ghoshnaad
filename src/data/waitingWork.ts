// What the library screen keeps in the browser about work that is not yet (or not only) a file in the person's folder:
//   fix      corrections to book rachanas that wait in the browser: { <id>: { src, at, dl? } }   (the same store as UserLibrary.corrections; `dl`: already downloaded)
//   filed    own compositions already written to the folder or downloaded: { 'm:<id>': { at, file, dl? } }
//   mineDel  own compositions deleted here while the folder could not be written (so a file still lying there is not brought back)
// `fix` travels in a backup; `filed` and `mineDel` are about this device only (see schema.ts). Values are checked on the way in.
import { getJSON, setJSON } from './kv.ts';
import type { Kv } from './kv.ts';
import { UserLibrary } from './userLibrary.ts';
import type { Correction, Corrections } from './userLibrary.ts';

export interface Filed { at?: string; file: string; dl?: boolean }
/** What the work needs of an own composition. */
export interface MineStamp { id: string; updated?: string }

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export class WaitingWork {
  private kv: Kv;
  private lib: UserLibrary;
  private pend: Corrections;
  private filed: Record<string, Filed>;
  private deleted: string[];

  constructor(kv: Kv) {
    this.kv = kv; this.lib = new UserLibrary(kv);
    this.pend = this.lib.corrections();
    const f = getJSON<unknown>(kv, 'filed', {});
    this.filed = record(f) ? Object.fromEntries(Object.entries(f).filter(([, v]) => record(v) && typeof v.file === 'string')) as Record<string, Filed> : {};
    const d = getJSON<unknown>(kv, 'mineDel', []);
    this.deleted = Array.isArray(d) ? d.filter((x): x is string => typeof x === 'string') : [];
  }

  /* ---------- corrections waiting in the browser ---------- */
  waiting(id: string): Correction | undefined { return this.pend[id]; }
  waitingIds(): string[] { return Object.keys(this.pend); }
  waitingAll(): Correction[] { return Object.values(this.pend); }
  /** Keep a correction in the browser (the folder could not take it). */
  hold(id: string, src: Record<string, unknown>, at: string): void { this.pend[id] = { src, at }; this.savePend(); }
  /** It is a file now, or it was thrown away. Returns what was waiting. */
  release(id: string): Correction | undefined { const had = this.pend[id]; delete this.pend[id]; this.savePend(); return had; }
  /** A waiting copy that the folder now has, the same or newer, is no longer waiting. */
  releaseSuperseded(files: ReadonlyMap<string, { src?: unknown; updated: string }>): void {
    for (const [id, p] of Object.entries(this.pend)) { const f = files.get(id); if (f && f.src && String(f.updated) >= String(p.at)) delete this.pend[id]; }
    this.savePend();
  }
  /** Mark one waiting correction (or all of them) as downloaded: it still waits, but is no longer counted. */
  markDownloaded(id?: string): void {
    if (id === undefined) Object.values(this.pend).forEach(p => { p.dl = true; });
    else if (this.pend[id]) this.pend[id].dl = true;
    this.savePend();
  }

  /* ---------- own compositions already written or downloaded ---------- */
  filedFor(id: string): Filed | undefined { return this.filed['m:' + id]; }
  file(id: string, entry: Filed): void { this.filed['m:' + id] = entry; this.saveFiled(); }
  unfile(id: string): void { delete this.filed['m:' + id]; this.saveFiled(); }
  /** Own compositions changed since they were last written or downloaded. */
  unsaved<T extends MineStamp>(all: readonly T[]): T[] { return all.filter(r => { const f = this.filedFor(r.id); return !f || f.at !== r.updated; }); }

  /* ---------- own compositions deleted while the folder could not be written ---------- */
  deletedMine(): readonly string[] { return this.deleted; }
  markDeleted(id: string): void { if (!this.deleted.includes(id)) { this.deleted.push(id); setJSON(this.kv, 'mineDel', this.deleted); } }

  /** How many things wait to become files: corrections not yet downloaded, and own compositions changed and not yet downloaded or written. */
  count(allMine: readonly MineStamp[]): number {
    // (an own composition that was downloaded at its current state is not "unsaved", so it is not counted here either)
    return this.waitingAll().filter(p => !p.dl).length + this.unsaved(allMine).length;
  }

  private savePend(): void { this.lib.saveCorrections(this.pend); }
  private saveFiled(): void { setJSON(this.kv, 'filed', this.filed); }
}
