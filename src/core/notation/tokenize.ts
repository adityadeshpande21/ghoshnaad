// One line of book notation -> tokens.
import type { Swara, SwellKind } from '../types.ts';
import { HOLD, REST, STROKE, SWARA, SWARA_ALIAS, SYMBOLS } from './symbols.ts';

export interface Mods { accent?: boolean; fermata?: boolean; swell?: SwellKind; uncertain?: boolean }

export interface Sym {
  raw: string;
  kind: 'note' | 'stroke' | 'hold' | 'rest';
  dev: string;
  swara?: Swara;
  oct?: number;
  vikrit?: boolean;
  stroke?: string;
  mods?: Mods;
}

export type Token =
  | { t: 'start'; col: number }
  | { t: 'repeat'; col: number; times?: number }
  | { t: 'charan' | 'gan' | 'gat' | 'gopen' | 'slurOpen' | 'slurClose' | 'endClose' | 'footnoteMark'; col: number }
  | { t: 'gclose'; col: number; mods: Mods }
  | { t: 'endOpen'; col: number; n: 1 | 2 }
  | { t: 'label'; col: number; v: string }
  | { t: 'dir'; col: number; k: string; v: string }
  | { t: 'cue'; col: number; text: string; matras: number }
  | { t: 'grace'; col: number; sym: Sym }
  | { t: 'sym'; col: number; sym: Sym };

export class NotationError extends Error {
  line: number;
  col: number;
  constructor(msg: string, line: number, col: number, src: string) {
    super(`line ${line + 1}, col ${col + 1}: ${msg}\n  ${src}\n  ${' '.repeat(col)}^`);
    this.line = line;
    this.col = col;
  }
}

export function tokenize(src: string, lineNo: number): Token[] {
  const out: Token[] = [];
  let i = 0;
  const err = (msg: string): never => { throw new NotationError(msg, lineNo, i, src); };
  const peek = (s: string) => src.startsWith(s, i);
  const rest = () => src.slice(i);

  function readEventMods(): Mods {
    const mods: Mods = {};
    for (;;) {
      if (src.startsWith('<>', i)) { mods.swell = 'swell'; i += 2; continue; }
      const c = src[i];
      if (c === '^') { mods.accent = true; i++; continue; }
      if (c === '!') { mods.fermata = true; i++; continue; }
      if (c === '<') { mods.swell = 'grow'; i++; continue; }
      if (c === '>') { mods.swell = 'fade'; i++; continue; }
      if (c === '?') { mods.uncertain = true; i++; continue; }
      break;
    }
    return mods;
  }

  function readSymbol(): Sym | null {
    for (const s of SYMBOLS) {
      if (!src.startsWith(s, i)) continue;
      i += s.length;
      const base = SWARA_ALIAS[s] || s;
      if (SWARA[base]) {
        const sym: Sym = { raw: s, kind: 'note', swara: SWARA[base], dev: base, oct: 0, vikrit: false };
        while (i < src.length && /[.'_]/.test(src[i])) {
          if (src[i] === '.') sym.oct! -= 1; else if (src[i] === "'") sym.oct! += 1; else sym.vikrit = true;
          i++;
        }
        return sym;
      }
      if (STROKE[base]) return { raw: s, kind: 'stroke', stroke: STROKE[base], dev: base };
      if (HOLD.includes(base)) return { raw: s, kind: 'hold', dev: 'ऽ' };
      if (REST.includes(base)) return { raw: s, kind: 'rest', dev: '–' };
      return null;
    }
    return null;
  }

  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    const col = i;
    // bar lines (longest first)
    if (peek('॥ॐ॥') || peek('||om||')) { out.push({ t: 'start', col }); i += peek('॥ॐ॥') ? 3 : 6; continue; }
    if (peek(':॥') || peek(':||')) {
      const tk: Token = { t: 'repeat', col };
      out.push(tk); i += peek(':॥') ? 2 : 3;
      const m = /^x(\d+)/.exec(rest()); if (m) { tk.times = +m[1]; i += m[0].length; }
      continue;
    }
    if (peek('॥') || peek('||')) { out.push({ t: 'charan', col }); i += peek('॥') ? 1 : 2; continue; }
    if (ch === '|') { out.push({ t: 'gan', col }); i++; continue; }
    if (ch === ',') { out.push({ t: 'gat', col }); i++; continue; }
    if (ch === '[') { out.push({ t: 'gopen', col }); i++; continue; }
    if (ch === ']') { i++; out.push({ t: 'gclose', col, mods: readEventMods() }); continue; }
    if (ch === '(') { out.push({ t: 'slurOpen', col }); i++; continue; }
    if (ch === ')') { out.push({ t: 'slurClose', col }); i++; continue; }
    if (ch === '{') {
      const m = /^\{([12])/.exec(rest()); if (!m) return err('Ending must be {1 or {2');
      out.push({ t: 'endOpen', n: +m[1] as 1 | 2, col }); i += m[0].length; continue;
    }
    if (ch === '}') { out.push({ t: 'endClose', col }); i++; continue; }
    if (ch === '*') { out.push({ t: 'footnoteMark', col }); i++; continue; }
    if (ch === '#') {
      const m = /^#(\S+)/.exec(rest()); if (!m) return err('A label needs a name after #');
      out.push({ t: 'label', v: m[1], col }); i += m[0].length; continue;
    }
    if (ch === '@') {
      const m = /^@(\w+)=(\S+)/.exec(rest()); if (!m) return err('Directive must look like @laya=100, @tala=केरवा-१२० or @yati=8');
      out.push({ t: 'dir', k: m[1], v: m[2], col }); i += m[0].length; continue;
    }
    if (ch === '"') {
      const m = /^"([^"]+)":(\d+)/.exec(rest()); if (!m) return err('Cue must look like "ॐ":4 (text and matras)');
      out.push({ t: 'cue', text: m[1], matras: +m[2], col }); i += m[0].length; continue;
    }
    if (ch === '`') {
      i++; const sym = readSymbol(); if (!sym) return err('Grace mark ` must be followed by a swara or stroke');
      out.push({ t: 'grace', sym, col }); continue;
    }
    const sym = readSymbol();
    if (sym) { sym.mods = readEventMods(); out.push({ t: 'sym', sym, col }); continue; }
    return err(`Unknown symbol "${src.slice(i, i + 3)}"`);
  }
  return out;
}
