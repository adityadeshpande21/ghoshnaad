// One-file backup and restore of the person's work.
//
//   { format: 'ghoshnaad-backup/1', app, created, mine: [composer records], fixes: { <id>: { src, at } }, settings: {…}, tala?: {…} }
//
// `mine` and `fixes` hold the formats the app already reads (composer files, ghosh-fixes/1 entries), unchanged.
// Restoring has four rules:
//   1. The file is checked first: format, size, and every rachana must compile. Nothing is written if it is not a backup.
//   2. The person sees what will change before anything is written (`planRestore` writes nothing).
//   3. Nothing is overwritten silently: a composition that differs from the local one is added as a separate copy;
//      a differing correction keeps the newer as the active one and the older is kept, not deleted.
//   4. Everything in the file is data. Names and text are never treated as HTML.
import { PREFIX } from './kv.ts';
import type { Kv } from './kv.ts';
import { BACKUP_FORMAT, BACKUP_MAX_BYTES, isSettingKey } from './schema.ts';
import { Settings } from './settings.ts';
import { UserLibrary, isComposition } from './userLibrary.ts';
import type { Composition, Corrections } from './userLibrary.ts';
import { sanitizeTalaPage, writeTalaPage } from './talaPage.ts';
import type { RawStorage } from './talaPage.ts';

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  app: string;
  created: string;
  mine: Composition[];
  fixes: Corrections;
  settings: Record<string, unknown>;
  /** the choices of the tala timeline page (kept outside the app's key prefix; see talaPage.ts). Optional: backups made before it was added have none. */
  tala?: Record<string, unknown>;
}

export const backupFileName = (d: Date): string => `ghoshnaad-backup-${d.toISOString().slice(0, 10)}.json`;

/** `o.tala`: the tala page's saved choices, which the caller reads from raw storage (readTalaPage). */
export function createBackup(kv: Kv, o: { app: string; now?: Date; tala?: Record<string, unknown> | null }): BackupFile {
  const lib = new UserLibrary(kv);
  const tala = sanitizeTalaPage(o.tala);
  return {
    format: BACKUP_FORMAT,
    app: o.app,
    created: (o.now ?? new Date()).toISOString(),
    mine: lib.compositions(),
    fixes: lib.corrections(),
    settings: new Settings(kv).all(),
    ...(tala ? { tala } : {}),
  };
}

export type ParseError = 'not-json' | 'not-a-backup' | 'newer-format' | 'too-big' | 'empty';
export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: ParseError };

export function parseBackup(text: string): ParseResult {
  if (text.length > BACKUP_MAX_BYTES) return { ok: false, error: 'too-big' };
  let o: unknown;
  try { o = JSON.parse(text); } catch { return { ok: false, error: 'not-json' }; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, error: 'not-a-backup' };
  const b = o as Record<string, unknown>;
  const fmt = typeof b.format === 'string' ? b.format : '';
  const m = /^ghoshnaad-backup\/(\d+)$/.exec(fmt);
  if (!m) return { ok: false, error: 'not-a-backup' };
  if (+m[1] > 1) return { ok: false, error: 'newer-format' };
  const mine = Array.isArray(b.mine) ? (b.mine as unknown[]) : [];
  const fixes = b.fixes && typeof b.fixes === 'object' && !Array.isArray(b.fixes) ? (b.fixes as Record<string, unknown>) : {};
  const settings = b.settings && typeof b.settings === 'object' && !Array.isArray(b.settings) ? (b.settings as Record<string, unknown>) : {};
  const tala = sanitizeTalaPage(b.tala);
  if (!mine.length && !Object.keys(fixes).length && !Object.keys(settings).length && !tala) return { ok: false, error: 'empty' };
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      app: typeof b.app === 'string' ? b.app : '',
      created: typeof b.created === 'string' ? b.created : '',
      mine: mine as Composition[],
      fixes: fixes as Corrections,
      settings,
      ...(tala ? { tala } : {}),
    },
  };
}

/** Checks that a thing compiles. Returns an error message, or null when it is fine. Supplied by the app (the compiler lives there). */
export interface Checks {
  composition(r: Composition): string | null;
  correction(id: string, src: Record<string, unknown>): string | null;
}

export interface RestorePlan {
  compositions: { add: Composition[]; same: number; copies: Composition[] };
  corrections: { add: Corrections; same: number; newer: Corrections; older: { id: string; src: Record<string, unknown>; at?: string }[] };
  settings: { add: Record<string, unknown>; kept: number };
  /** the tala page's choices: added only when this device has none of its own */
  tala: { add: Record<string, unknown> | null; kept: boolean };
  problems: { kind: 'composition' | 'correction'; id: string; message: string }[];
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
/** A composition without its identity: two with the same content are the same work, whatever they are called or numbered. */
const canon = (v: unknown): unknown => Array.isArray(v) ? v.map(canon)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon((v as Record<string, unknown>)[k])])) : v;
const contentKey = (r: Composition): string => { const { id, name, ...rest } = r; return JSON.stringify(canon(rest)); };
const newId = (): string => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Work out what restoring would do. Writes nothing. */
/** `o.haveTala`: this device already has choices on the tala page (the caller reads them from raw storage). */
export function planRestore(kv: Kv, backup: BackupFile, checks: Checks, o: { copyLabel: string; makeId?: () => string; haveTala?: boolean }): RestorePlan {
  const lib = new UserLibrary(kv), makeId = o.makeId ?? newId;
  const plan: RestorePlan = {
    compositions: { add: [], same: 0, copies: [] },
    corrections: { add: {}, same: 0, newer: {}, older: [] },
    settings: { add: {}, kept: 0 },
    tala: { add: null, kept: false },
    problems: [],
  };

  const have = new Map(lib.compositions().map(r => [r.id, r]));
  const takenIds = new Set(have.keys());
  const seen = new Set([...have.values()].map(contentKey));            // content already here, under any id or name
  for (const r of backup.mine) {
    if (!isComposition(r)) { plan.problems.push({ kind: 'composition', id: String((r as { id?: unknown } | null)?.id ?? '?'), message: 'not a composition' }); continue; }
    const bad = checks.composition(r);
    if (bad) { plan.problems.push({ kind: 'composition', id: r.id, message: bad }); continue; }
    const local = have.get(r.id);
    if (!local) { plan.compositions.add.push(r); takenIds.add(r.id); seen.add(contentKey(r)); }
    else if (same(local, r) || seen.has(contentKey(r))) plan.compositions.same++;   // already here, or already kept as a copy by an earlier restore
    else {
      let id = makeId(); while (takenIds.has(id)) id = makeId();
      takenIds.add(id); seen.add(contentKey(r));
      plan.compositions.copies.push({ ...r, id, name: `${r.name} ${o.copyLabel}` });
    }
  }

  const fixes = lib.corrections();
  for (const [id, c] of Object.entries(backup.fixes)) {
    if (!c || typeof c !== 'object' || !c.src || typeof c.src !== 'object') { plan.problems.push({ kind: 'correction', id, message: 'not a correction' }); continue; }
    const bad = checks.correction(id, c.src);
    if (bad) { plan.problems.push({ kind: 'correction', id, message: bad }); continue; }
    const local = fixes[id];
    if (!local) plan.corrections.add[id] = c;
    else if (same(local.src, c.src)) plan.corrections.same++;
    else if (String(c.at ?? '') > String(local.at ?? '')) { plan.corrections.newer[id] = c; plan.corrections.older.push({ id, src: local.src, at: local.at }); }
    else plan.corrections.older.push({ id, src: c.src, at: c.at });
  }

  const settings = new Settings(kv);
  const missing = new Set(settings.missingFrom(backup.settings));
  for (const k of Object.keys(backup.settings)) {
    if (!isSettingKey(k)) continue;
    if (missing.has(k)) plan.settings.add[k] = backup.settings[k]; else plan.settings.kept++;
  }
  const tala = sanitizeTalaPage(backup.tala);
  if (tala) { if (o.haveTala) plan.tala.kept = true; else plan.tala.add = tala; }
  return plan;
}

export const planIsEmpty = (p: RestorePlan): boolean =>
  !p.compositions.add.length && !p.compositions.copies.length && !Object.keys(p.corrections.add).length &&
  !Object.keys(p.corrections.newer).length && !p.corrections.older.length && !Object.keys(p.settings.add).length && !p.tala.add;

/** Write the plan. Returns false (having changed nothing that was not already written) if the browser refuses; the caller says so. */
/** `raw`: raw storage, to write the tala page's choices (without it they are left out). */
export function applyRestore(kv: Kv, plan: RestorePlan, raw?: Pick<RawStorage, 'setItem'>): boolean {
  const lib = new UserLibrary(kv);
  const compositions = [...lib.compositions(), ...plan.compositions.add, ...plan.compositions.copies];
  const corrections: Corrections = { ...lib.corrections(), ...plan.corrections.add, ...plan.corrections.newer };
  const older = [...lib.olderCorrections(), ...plan.corrections.older];
  let ok = true;
  if (plan.compositions.add.length || plan.compositions.copies.length) ok = lib.saveCompositions(compositions) && ok;
  if (Object.keys(plan.corrections.add).length || Object.keys(plan.corrections.newer).length) ok = lib.saveCorrections(corrections) && ok;
  if (plan.corrections.older.length) ok = lib.saveOlderCorrections(older) && ok;
  const settings = new Settings(kv);
  for (const [k, v] of Object.entries(plan.settings.add)) if (isSettingKey(k)) ok = settings.set(k, v) && ok;
  if (plan.tala.add && raw) ok = writeTalaPage(raw, plan.tala.add) && ok;
  return ok;
}

/**
 * The corrections that lost to a newer copy, as a ghosh-fixes/1 file (so the app's own import can read it) so they can be
 * saved out and never lost. `fixes` holds the newest of the older copies per rachana; `copies` lists every one.
 */
export function olderCopiesFile(kv: Kv, app: string, now = new Date()) {
  const all = new UserLibrary(kv).olderCorrections();
  const fixes: Record<string, { src: Record<string, unknown>; at?: string }> = {};
  for (const c of all) if (!fixes[c.id] || String(c.at ?? '') > String(fixes[c.id].at ?? '')) fixes[c.id] = { src: c.src, at: c.at };
  return { format: 'ghosh-fixes/1' as const, app, created: now.toISOString(), fixes, copies: all };
}

/** Keys of a localStorage-like dump that belong to this app, for the tests and for diagnostics. */
export const ownKeys = (dump: Record<string, string>): string[] => Object.keys(dump).filter(k => k.startsWith(PREFIX));
