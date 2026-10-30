// The choices of the tala timeline page (which talas, which layers, speed, window …). They are kept under the key `tala.v3`, outside the "ghosh."
// prefix, because the standalone page of v1.1.0 used that key and the person's choices must survive the move into the app.
// Only what the page can have written is kept: a damaged or hand-edited value never reaches the screen.
import { TALA_PAGE_KEY } from './schema.ts';

export { TALA_PAGE_KEY };

const bool = (v: unknown): v is boolean => typeof v === 'boolean';
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const CHAL = ['all', 'prachal', 'mand', 'sthir'];
const SPEEDS = [1, 0.75, 0.5, 0.25], WINS = [4, 8, 12], ZOOMS = [70, 100, 150];

/** The valid part of a saved page state, or null when nothing in it is usable. */
export function sanitizeTalaPage(v: unknown): Record<string, unknown> | null {
  if (!record(v)) return null;
  const out: Record<string, unknown> = {};
  if (typeof v.chal === 'string' && CHAL.includes(v.chal)) out.chal = v.chal;
  for (const k of ['dhv', 'tr', 'step', 'rep']) if (bool(v[k])) out[k] = v[k];
  if (typeof v.win === 'number' && WINS.includes(v.win)) out.win = v.win;
  if (typeof v.pps === 'number' && ZOOMS.includes(v.pps)) out.pps = v.pps;
  if (typeof v.speed === 'number' && SPEEDS.includes(v.speed)) out.speed = v.speed;
  if (record(v.talas)) { const t = Object.fromEntries(Object.entries(v.talas).filter(([k, x]) => /^[a-z]{2,12}$/.test(k) && bool(x))); if (Object.keys(t).length) out.talas = t; }
  if (record(v.snd)) { const s = Object.fromEntries(Object.entries(v.snd).filter(([k, x]) => ['num', 'dhv', 'step'].includes(k) && bool(x))); if (Object.keys(s).length) out.snd = s; }
  return Object.keys(out).length ? out : null;
}

/** What `localStorage`-like storage offers, without the app's prefix. */
export interface RawStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }

export function readTalaPage(raw: Pick<RawStorage, 'getItem'>): Record<string, unknown> | null {
  try { const s = raw.getItem(TALA_PAGE_KEY); return s ? sanitizeTalaPage(JSON.parse(s)) : null; } catch { return null; }
}
export function writeTalaPage(raw: Pick<RawStorage, 'setItem'>, value: Record<string, unknown>): boolean {
  try { raw.setItem(TALA_PAGE_KEY, JSON.stringify(value)); return true; } catch { return false; }
}
