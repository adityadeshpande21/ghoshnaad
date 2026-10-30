// The person's own folder of rachana files (a directory the browser let the app read and, in Chrome / Edge / Android Chrome, write).
// This class knows the folder and nothing else: what is in it, what kind of file each one is, and how to write a file without losing the
// person's own changes. What waits in the browser, what the screen shows and what the list does with the result stay with the library screen.
//
//   mode  'none'  no folder · 'rw' can read and write · 'ro' was read through a plain file input, cannot write · 'perm' remembered, needs a tap to reconnect
//
// A file the person changed outside the app since it was read is never overwritten: the save goes to a new name (`conflict: true`).

export type FolderMode = 'none' | 'rw' | 'ro' | 'perm';

/** The parts of the File System Access API this class uses (a real handle has more; tests use a small fake). */
export interface FileLike { lastModified: number; text(): Promise<string> }
export interface WritableLike { write(data: string): Promise<void>; close(): Promise<void> }
export interface FileHandleLike { kind: 'file'; name: string; getFile(): Promise<FileLike>; createWritable(): Promise<WritableLike> }
export interface DirHandleLike {
  kind: 'directory';
  name: string;
  values(): AsyncIterable<FileHandleLike | DirHandleLike>;
  getFileHandle(name: string, o?: { create?: boolean }): Promise<FileHandleLike>;
  removeEntry(name: string): Promise<void>;
  queryPermission?(o: { mode: string }): Promise<string>;
  requestPermission?(o: { mode: string }): Promise<string>;
}

/** A file found in the folder (or chosen through a file input, which has no handle). */
export interface Listed { name: string; path: string; fh: FileHandleLike | null; file: FileLike }
export type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export interface Entry {
  id: string;
  file: string;
  path: string;
  fh: FileHandleLike | null;
  mod: number;
  updated: string;
  /** a book-notation source, or a compiled piece, or (when `bundle`) one rachana taken out of a corrections file */
  src?: Json;
  piece?: Json;
  bundle?: boolean;
}
export interface MineEntry { r: Json; file: string; path: string; fh: FileHandleLike | null; mod: number }
export type Kind = 'mine' | 'src' | 'piece' | 'fixes';
export interface Written { fh: FileHandleLike; mod: number; name: string; conflict: boolean }

export function classify(o: unknown): Kind | null {
  if (!o || typeof o !== 'object') return null;
  const j = o as Json;
  if (j.composer && Array.isArray(j.composer.blocks)) return 'mine';
  if (j.format === 'ghosh-notation/1' && j.parts) return 'src';
  if (j.format === 'ghosh/3' && j.parts && j.rhythm) return 'piece';
  if (j.format === 'ghosh-fixes/1' && j.fixes) return 'fixes';
  return null;
}

export async function permissionOf(h: DirHandleLike, ask: boolean): Promise<string> {
  try {
    const o = { mode: 'readwrite' };
    let p = await h.queryPermission!(o);
    if (p !== 'granted' && ask) p = await h.requestPermission!(o);
    return p;
  } catch { return 'denied'; }
}

export class FolderSync {
  mode: FolderMode = 'none';
  dir: DirHandleLike | null = null;
  dirName = '';
  scannedAt: Date | null = null;
  skipped: string[] = [];
  /** rachana id -> the newest file that holds it */
  files = new Map<string, Entry>();
  /** own composition id -> the newest file that holds it */
  mine = new Map<string, MineEntry>();
  private now: () => string;

  constructor(o: { now?: () => string } = {}) { this.now = o.now ?? (() => new Date().toISOString()); }

  /** A folder the browser lets us write to (or one remembered from an earlier visit, `mode` 'perm'). */
  attach(dir: DirHandleLike, mode: FolderMode = 'rw'): void { this.dir = dir; this.dirName = dir.name; this.mode = mode; }
  /** Files chosen through a plain input: readable, not writable, no handle. */
  attachReadOnly(name: string): void { this.dir = null; this.mode = 'ro'; this.dirName = name; }
  detach(): void { this.dir = null; this.mode = 'none'; this.dirName = ''; this.files = new Map(); this.mine = new Map(); this.skipped = []; }

  /** Every .json file under the folder, four levels deep, leaving out hidden entries and node_modules. Throws when the folder cannot be read. */
  async list(dir: DirHandleLike = this.dir!): Promise<Listed[]> {
    const out: Listed[] = [];
    const walk = async (h: DirHandleLike, path: string, depth: number): Promise<void> => {
      for await (const e of h.values()) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        if (e.kind === 'directory') { if (depth < 4) await walk(e, path + e.name + '/', depth + 1); }
        else if (/\.json$/i.test(e.name)) { try { const f = await e.getFile(); out.push({ name: e.name, path: path + e.name, fh: e, file: f }); } catch { /* unreadable: left out */ } }
      }
    };
    await walk(dir, '', 0);
    return out;
  }

  /**
   * Read the listed files. Replaces `files`, `mine` and `skipped`; for one id the newest file wins.
   * `deletedMine`: ids of own compositions deleted here while the folder could not be written, so a file still lying there is not brought back.
   */
  async read(list: Listed[], o: { deletedMine?: readonly string[] } = {}): Promise<{ n: number; m: number }> {
    const files = new Map<string, Entry>(), mine = new Map<string, MineEntry>(), skipped: string[] = [];
    const deleted = o.deletedMine ?? [];
    const put = (id: string, ent: Entry): void => { const old = files.get(id); if (!old || String(ent.updated) > String(old.updated)) files.set(id, ent); };
    for (const it of list) {
      let j: Json;
      try { j = JSON.parse(await it.file.text()); } catch { skipped.push(it.path); continue; }
      const k = classify(j), base = { file: it.name, path: it.path, fh: it.fh || null, mod: it.file.lastModified };
      const stamp = new Date(it.file.lastModified).toISOString();
      if (k === 'src' && j.id) put(j.id, { ...base, id: j.id, src: j, updated: j.updated || stamp });
      else if (k === 'piece' && j.id) put(j.id, { ...base, id: j.id, piece: j, updated: (j.generated && j.generated.at) || stamp });
      else if (k === 'fixes') Object.entries<Json>(j.fixes).forEach(([id, v]) => { if (v && v.src) put(id, { ...base, id, src: v.src, updated: v.at || j.exported || '', bundle: true }); });
      else if (k === 'mine') {
        const r = j.composer as Json;
        if (deleted.includes(r.id)) continue;
        const p = mine.get(r.id);
        if (!p || String(r.updated) > String(p.r.updated)) mine.set(r.id, { ...base, r });
      } else skipped.push(it.path);
    }
    this.files = files; this.mine = mine; this.skipped = skipped; this.scannedAt = new Date();
    return { n: files.size, m: mine.size };
  }

  /** Write a file (a new one, or through the handle of an existing one). */
  async writeFile(name: string, text: string, fh?: FileHandleLike | null): Promise<{ fh: FileHandleLike; mod: number; name: string }> {
    const h = fh || await this.dir!.getFileHandle(name, { create: true });
    const w = await h.createWritable();
    await w.write(text); await w.close();
    const f = await h.getFile();
    return { fh: h, mod: f.lastModified, name: h.name };
  }

  /** A file name no other rachana or composition of the folder's top level uses: `base`, then `base (2).ghosh.json`, `base (3).ghosh.json` … */
  freeName(base: string, ownId: string): string {
    let n = base, i = 2;
    const taken = (nm: string): boolean =>
      [...this.files.values()].some(f => f.file === nm && f.id !== ownId && !f.path.includes('/')) || [...this.mine.values()].some(m => m.file === nm && m.r.id !== ownId);
    while (taken(n)) n = base.replace(/(\.ghosh)?\.json$/i, '') + ' (' + i++ + ').ghosh.json';
    return n;
  }

  /**
   * Save `text` as the file `ent` was read from. If the person changed that file outside the app since it was read, it is left alone and the text goes to
   * a new name with the time in it (`conflict`). With no `ent`, to a free name derived from `wanted`.
   */
  async safeWrite(ent: { fh: FileHandleLike | null; file: string; mod: number } | null, wanted: string, text: string, ownId: string): Promise<Written> {
    if (ent && ent.fh) {
      let changed = false;
      try { const f = await ent.fh.getFile(); changed = f.lastModified > ent.mod + 1; } catch { changed = true; }
      if (!changed) return { ...(await this.writeFile(ent.file, text, ent.fh)), conflict: false };
      const n = this.freeName(wanted.replace(/\.ghosh\.json$/i, '') + ' ' + this.now().slice(0, 16).replace(/[:T]/g, '-') + '.ghosh.json', ownId);
      return { ...(await this.writeFile(n, text)), conflict: true };
    }
    return { ...(await this.writeFile(this.freeName(wanted, ownId), text)), conflict: false };
  }

  /** Delete a file of the folder's top level; false when the browser refuses (the person must delete it). */
  async remove(name: string): Promise<boolean> {
    try { await this.dir!.removeEntry(name); return true; } catch { return false; }
  }
}
