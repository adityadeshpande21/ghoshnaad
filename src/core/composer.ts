// The composer's model of a rachana, and its conversion to the book notation (ghosh-notation/1) that the same compiler as the
// 120 book rachanas turns into a playable file. Pure: no screen, no sound, no storage.
//
//   { v:1, id, name, instr:'shankh'|'vanshi', tala:'kerva'|…, laya, raga:{name,aroha,avaroha}|null,
//     blocks:[{ type:'prarambhik'|'charan'|'setu', repeat:1|2, lines:[{ mel:[matra…], anak:[matra…] }] }],
//     ignore:[checkKey…], created, updated }
//   matra = { n: 1..4 (slots it is split into), s: [token…] }   token = 'स' 'प.' "स'" 'ग_' 'ऽ' '–' 'त' 'त्र' '+' …
// A line is always 4 गण of the tala's ganSize matras.
import type { SourcePart, SourcePiece } from './types.ts';

export type TalaKey = 'kerva' | 'khemta' | 'dadra' | 'rupak' | 'jhaptal';
export interface TalaInfo { dev: string; rom: string; gan: number; gats: number[] | null; laya: number; section: 'prachalan' | 'mand' | 'naimittik' }
export const TALA_INFO: Record<TalaKey, TalaInfo> = {
  kerva:   { dev: 'केरवा', rom: 'Kerva',   gan: 2, gats: null,      laya: 120, section: 'prachalan' },
  khemta:  { dev: 'खेमटा', rom: 'Khemta',  gan: 6, gats: [3, 3],    laya: 360, section: 'prachalan' },
  dadra:   { dev: 'दादरा', rom: 'Dadra',   gan: 3, gats: null,      laya: 120, section: 'mand' },
  rupak:   { dev: 'रूपक',  rom: 'Rupak',   gan: 7, gats: [3, 2, 2], laya: 210, section: 'naimittik' },
  jhaptal: { dev: 'झपताल', rom: 'Jhaptal', gan: 5, gats: [2, 3],    laya: 240, section: 'naimittik' },
};
export const GANS_PER_LINE = 4;
export const SWARAS = ['स', 'री', 'ग', 'म', 'प', 'ध', 'नि'];
const SW_CODE: Record<string, string> = { 'स': 'S', 'री': 'R', 'रे': 'R', 'ग': 'G', 'म': 'M', 'प': 'P', 'ध': 'D', 'नि': 'N' };
export const BOLS = ['त', 'त्र', 'थ', 'थ्र', '+'];
const TOKEN_RE = /(त्र|थ्र|री|रे|नि|[सगमपधतथ])([.'_]*)|ऽ|–|-|\+/g;

export interface Matra { n: number; s: string[] }
export interface Row { mel: Matra[]; anak: Matra[] }
export interface Block { type: 'prarambhik' | 'charan' | 'setu'; repeat: number; lines: Row[] }
export interface Raga { name?: string; aroha?: string; avaroha?: string }
export interface Rachana {
  v: number; id: string; name: string; instr: 'shankh' | 'vanshi'; tala: TalaKey; laya: number; raga: Raga | null;
  blocks: Block[]; ignore: string[]; created: string; updated: string;
}

export const emptyMatra = (): Matra => ({ n: 1, s: [] });
export const emptyLine = (tala: TalaKey): Row => {
  const k = TALA_INFO[tala].gan * GANS_PER_LINE;
  return { mel: Array.from({ length: k }, emptyMatra), anak: Array.from({ length: k }, emptyMatra) };
};

export function newRachana(o: { name?: string; instr?: 'shankh' | 'vanshi'; tala?: TalaKey; laya?: number; raga?: Raga | null }): Rachana {
  const now = new Date().toISOString();
  return {
    v: 1, id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: o.name || 'नवी रचना', instr: o.instr || 'vanshi',
    tala: o.tala || 'kerva', laya: o.laya || TALA_INFO[o.tala || 'kerva'].laya, raga: o.raga || null,
    blocks: [{ type: 'charan', repeat: 2, lines: [emptyLine(o.tala || 'kerva')] }], ignore: [], created: now, updated: now,
  };
}

/* tokens ------------------------------------------------------------------ */
export function tokenize(text: unknown): string[] {
  const out: string[] = [];
  TOKEN_RE.lastIndex = 0;
  const s = String(text || '').replace(/\s+/g, '');
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(s))) out.push(m[0] === '-' ? '–' : m[0]);
  return out;
}

export type ParsedToken =
  | { kind: 'hold' } | { kind: 'rest' } | { kind: 'bol'; bol: string }
  | { kind: 'note'; base: string; swara: string; oct: number; vikrit: boolean };

export function parseToken(t: string): ParsedToken | null {
  if (t === 'ऽ') return { kind: 'hold' };
  if (t === '–') return { kind: 'rest' };
  if (t === '+' || /^(त्र|थ्र|त|थ)$/.test(t)) return { kind: 'bol', bol: t };
  const m = /^(री|रे|नि|[सगमपध])([.'_]*)$/.exec(t);
  if (!m) return null;
  const mods = m[2];
  return {
    kind: 'note', base: m[1] === 'रे' ? 'री' : m[1], swara: SW_CODE[m[1]],
    oct: (mods.match(/'/g) || []).length - (mods.match(/\./g) || []).length, vikrit: mods.includes('_'),
  };
}
export const noteToken = (base: string, oct: number, vikrit: boolean): string =>
  base + (oct < 0 ? '.'.repeat(-oct) : "'".repeat(Math.max(0, oct))) + (vikrit ? '_' : '');

/* model -> book text ----------------------------------------------------- */
export function matraText(m: Matra): string {
  const s = m.s.length ? m.s : ['–'];
  return s.length === 1 ? s[0] : '[' + s.join('') + ']';
}
function ganText(matras: Matra[], gats: number[] | null): string {
  if (!gats) return matras.map(matraText).join(' ');
  const out: string[] = []; let i = 0;
  gats.forEach(n => { out.push(matras.slice(i, i + n).map(matraText).join(' ')); i += n; });
  return out.join(' , ');
}
export function lineText(row: Matra[], tala: TalaKey): string {
  const T = TALA_INFO[tala], g: string[] = [];
  for (let k = 0; k < GANS_PER_LINE; k++) g.push(ganText(row.slice(k * T.gan, (k + 1) * T.gan), T.gats));
  return g.join(' | ');
}
function partLines(r: Rachana, row: 'mel' | 'anak'): string[] {
  const out: string[] = [];
  r.blocks.forEach((b, bi) => {
    const n = b.lines.length;
    b.lines.forEach((l, li) => {
      const open = li === 0 ? (bi === 0 ? '॥ॐ॥ ' : '॥ ') : '| ';
      const close = li === n - 1 ? (b.repeat > 1 ? ' :॥' : ' ॥') : ' |';
      out.push(open + lineText(l[row], r.tala) + close);
    });
  });
  return out;
}
export function toSource(r: Rachana): SourcePiece {
  const T = TALA_INFO[r.tala];
  const part = (row: 'mel' | 'anak'): SourcePart => ({ source: { book: 'composed', note: 'Composed in the app' }, tala: T.dev, laya: r.laya, status: 'draft', lines: partLines(r, row) });
  const src: SourcePiece = {
    format: 'ghosh-notation/1', id: 'mine-' + r.id, kind: 'rachana', title: { dev: r.name, rom: r.name },
    section: T.section === 'naimittik' ? 'naimittik' : T.section + '-' + r.instr, parts: {},
  };
  if (r.raga && (r.raga.aroha || r.raga.name)) {
    src.raga = { ...(r.raga.name ? { name: r.raga.name } : {}), ...(r.raga.aroha ? { aroha: r.raga.aroha } : {}), ...(r.raga.avaroha ? { avaroha: r.raga.avaroha } : {}) };
  }
  src.parts[r.instr] = part('mel');
  if (r.blocks.some(b => b.lines.some(l => l.anak.some(m => m.s.length)))) src.parts.anak = part('anak');
  return src;
}

/* book text -> one line of the model (text mode) ---------------------------- */
export type LineParse =
  | { row: Matra[]; error?: undefined }
  | { row?: undefined; error: { k: 'gans'; n: number } | { k: 'matras'; n: number; want: number } };

/** Split one ग aṇ's text into matras: `[…]` is one matra shared by its notes, anything else is one matra per sign. */
function matrasOfGan(g: string): Matra[] {
  const parts: Matra[] = [];
  const re = /\[([^\]]*)\]|([^\s[\],]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(g.replace(/,/g, ' ')))) {
    if (m[1] != null) { const s = tokenize(m[1]); parts.push({ n: Math.min(4, Math.max(1, s.length)), s: s.slice(0, 4) }); }
    else tokenize(m[2]).forEach(t => parts.push({ n: 1, s: [t] }));
  }
  return parts;
}
export function parseLineText(text: unknown, tala: TalaKey): LineParse {
  const T = TALA_INFO[tala];
  const clean = String(text || '').replace(/॥ॐ॥|:॥|॥/g, '').trim().replace(/^\||\|$/g, '');
  const gans = clean.split('|').map(s => s.trim()).filter(Boolean);
  if (gans.length !== GANS_PER_LINE) return { error: { k: 'gans', n: gans.length } };
  const row: Matra[] = [];
  for (const g of gans) {
    const parts = matrasOfGan(g);
    if (parts.length !== T.gan) return { error: { k: 'matras', n: parts.length, want: T.gan } };
    row.push(...parts);
  }
  return { row };
}

/* raga -------------------------------------------------------------------- */
export function ragaSet(raga: Raga | null | undefined): Set<string> | null {
  if (!raga || !(raga.aroha || raga.avaroha)) return null;
  const set = new Set<string>();
  tokenize((raga.aroha || '') + ' ' + (raga.avaroha || '')).forEach(t => { const p = parseToken(t); if (p && p.kind === 'note') set.add(p.base + (p.vikrit ? '_' : '')); });
  return set.size ? set : null;
}
export const SHANKH_OK = new Set(['प.', 'स', 'ग', 'प']);

/* checks ------------------------------------------------------------------ */
export interface CheckItem { sev: 'fix' | 'tip'; k: string; at: { bi: number; li: number; row: 'mel' | 'anak'; i: number }; n?: number; t?: string; key?: string }

export function check(r: Rachana): CheckItem[] {
  const out: CheckItem[] = [], rs = ragaSet(r.raga);
  const at = (bi: number, li: number, row: 'mel' | 'anak', i: number) => ({ bi, li, row, i });
  const unfilled = (ms: Matra[]) => ms.map((m, i) => (m.s.length < m.n ? i : -1)).filter(i => i >= 0);
  r.blocks.forEach((b, bi) => {
    if (!b.lines.length) out.push({ sev: 'fix', k: 'emptyBlock', at: at(bi, 0, 'mel', 0) });
    b.lines.forEach((l, li) => {
      const partial = unfilled(l.mel);
      if (partial.length) out.push({ sev: 'fix', k: 'melPartial', n: partial.length, at: at(bi, li, 'mel', partial[0]) });
      const anakFilled = l.anak.some(m => m.s.length);
      if (!anakFilled) out.push({ sev: 'fix', k: 'anakEmpty', at: at(bi, li, 'anak', 0) });
      else { const p = unfilled(l.anak); if (p.length) out.push({ sev: 'fix', k: 'anakPartial', n: p.length, at: at(bi, li, 'anak', p[0]) }); }
      l.mel.forEach((m, i) => m.s.forEach(t => {
        const p = parseToken(t); if (!p) return;
        if (p.kind === 'bol') out.push({ sev: 'fix', k: 'bolInMel', t, at: at(bi, li, 'mel', i) });
        if (p.kind !== 'note') return;
        if (r.instr === 'shankh' && !SHANKH_OK.has(noteToken(p.base, p.oct, p.vikrit))) out.push({ sev: 'fix', k: 'shankhRange', t, at: at(bi, li, 'mel', i) });
        else if (rs && !rs.has(p.base + (p.vikrit ? '_' : ''))) {
          const key = `raga:${bi}.${li}.${i}.${t}`;
          if (!(r.ignore || []).includes(key)) out.push({ sev: 'fix', k: 'outOfRaga', t, key, at: at(bi, li, 'mel', i) });
        }
      }));
      l.anak.forEach((m, i) => m.s.forEach(t => { const p = parseToken(t); if (p && p.kind === 'note') out.push({ sev: 'fix', k: 'noteInAnak', t, at: at(bi, li, 'anak', i) }); }));
    });
    const first = b.lines[0] && b.lines[0].mel[0];
    if (first && first.s[0] === 'ऽ') out.push({ sev: 'tip', k: 'startsHold', at: at(bi, 0, 'mel', 0) });
  });
  const lastB = r.blocks[r.blocks.length - 1], lastL = lastB && lastB.lines[lastB.lines.length - 1];
  if (lastL) {
    const notes = lastL.mel.flatMap(m => m.s).map(parseToken).filter((p): p is Extract<ParsedToken, { kind: 'note' }> => !!p && p.kind === 'note');
    const ln = notes[notes.length - 1];
    if (ln && !(ln.base === 'स' && !ln.vikrit)) {
      const key = 'endSa';
      if (!(r.ignore || []).includes(key)) out.push({ sev: 'tip', k: 'endNotSa', key, at: at(r.blocks.length - 1, lastB.lines.length - 1, 'mel', lastL.mel.length - 1) });
    }
  }
  return out;
}

/* आनक suggestions: 2-गण patterns from the book rachanas */
export function patternRow(pattern: string, tala: TalaKey): Matra[] | null {
  const T = TALA_INFO[tala], row: Matra[] = [];
  for (const g of pattern.split('|').map(s => s.trim())) {
    const parts = matrasOfGan(g);
    if (parts.length !== T.gan) return null;
    row.push(...parts);
  }
  return row;
}
