// The message format: a small subset of ICU MessageFormat, written in house. A translation is a plain string:
//
//   "Backed up {d} days ago"                                   a blank
//   "{n, plural, one {# रचना} other {# रचना}}"                a plural; # is the number, in the language's digits
//   "{foot, select, L {डावा} R {उजवा} other {}}"              a choice
//   "{n, number}"                                              a number in the language's digits
//   "Press <b>Play</b>"                                        bold; <code>…</code> for a sign of the notation: the only markup allowed
//   "\{ and \}"                                                a literal brace; "\\" a backslash
//
// Parsing and formatting never produce HTML by themselves: formatting returns segments (text, bold), and the caller chooses
// plain text or escaped HTML, so a translation can never inject markup.

export type Node =
  | string
  | { arg: string; kind: 'blank' }
  | { arg: string; kind: 'number' }
  | { arg: string; kind: 'plural'; cases: Record<string, Node[]>; offset: number }
  | { arg: string; kind: 'select'; cases: Record<string, Node[]> }
  | { kind: 'tag'; tag: 'b' | 'code'; children: Node[] }
  | { kind: 'hash' };

export class MessageError extends Error {
  pos: number;
  source: string;
  constructor(msg: string, pos: number, source: string) { super(`${msg} at ${pos} in "${source}"`); this.pos = pos; this.source = source; }
}

export function parse(source: string): Node[] {
  let i = 0;
  const err = (m: string): never => { throw new MessageError(m, i, source); };

  function nodes(stop: 'end' | '}' | '</b>' | '</code>', inPlural: boolean): Node[] {
    const out: Node[] = []; let text = '';
    const flush = () => { if (text) { out.push(text); text = ''; } };
    while (i < source.length) {
      const c = source[i];
      if (stop === '}' && c === '}') break;
      if ((stop === '</b>' || stop === '</code>') && source.startsWith(stop, i)) break;
      if (c === '\\') { const n = source[i + 1]; if (n === undefined) err('dangling backslash'); text += n; i += 2; continue; }
      if (c === '{') { flush(); i++; out.push(argument(inPlural)); continue; }
      if (c === '}') err('unmatched }');
      if (c === '#' && inPlural) { flush(); out.push({ kind: 'hash' }); i++; continue; }
      const open = /^<(b|code)>/.exec(source.slice(i, i + 7));
      if (open) { flush(); const tag = open[1] as 'b' | 'code'; i += open[0].length; const inner = nodes(tag === 'b' ? '</b>' : '</code>', inPlural); const close = `</${tag}>`; if (!source.startsWith(close, i)) err(`missing ${close}`); i += close.length; out.push({ kind: 'tag', tag, children: inner }); continue; }
      if (c === '<' && /^<\/?[a-zA-Z!]/.test(source.slice(i, i + 3))) err('only <b> and <code> are allowed');
      text += c; i++;
    }
    flush();
    if (stop === '}' && source[i] !== '}') err('missing }');
    if ((stop === '</b>' || stop === '</code>') && !source.startsWith(stop, i)) err(`missing ${stop}`);
    return out;
  }

  function ws() { while (i < source.length && /\s/.test(source[i])) i++; }
  function word(): string { ws(); const m = /^[A-Za-z0-9_.=-]+/.exec(source.slice(i)); if (!m) err('a name is expected'); i += m![0].length; return m![0]; }

  // case names may be in any script (a select on a Devanagari word)
  function caseName(): string { ws(); const m = /^[^\s{},]+/.exec(source.slice(i)); if (!m) err('a case name is expected'); i += m![0].length; return m![0]; }

  function argument(inPlural: boolean): Node {
    const arg = word(); ws();
    if (source[i] === '}') { i++; return { arg, kind: 'blank' }; }
    if (source[i] !== ',') err('"," or "}" expected');
    i++;
    const type = word(); ws();
    if (type === 'number') { if (source[i] !== '}') err('} expected'); i++; return { arg, kind: 'number' }; }
    if (type !== 'plural' && type !== 'select') err(`unknown type "${type}"`);
    if (source[i] !== ',') err('"," expected'); i++;
    let offset = 0;
    ws(); if (type === 'plural' && source.startsWith('offset:', i)) { i += 7; ws(); const m = /^\d+/.exec(source.slice(i)); if (!m) err('offset number expected'); offset = +m![0]; i += m![0].length; }
    const cases: Record<string, Node[]> = {};
    for (;;) {
      ws(); if (source[i] === '}') { i++; break; }
      const key = caseName(); ws();
      if (source[i] !== '{') err('{ expected after a case name'); i++;
      cases[key] = nodes('}', type === 'plural' || inPlural && false); i++;
    }
    if (!cases.other) err('"other" case is required');
    return type === 'plural' ? { arg, kind: 'plural', cases, offset } : { arg, kind: 'select', cases };
  }

  const out = nodes('end', false);
  if (i < source.length) err('unexpected text');
  return out;
}

export interface FormatContext {
  /** a number in the language's digits */
  num: (n: number) => string;
  /** plural category of a number in the language: zero | one | two | few | many | other */
  plural: (n: number) => string;
}
export interface Segment { text: string; bold: boolean; code: boolean }
export type Params = Record<string, string | number | undefined>;

export interface Style { bold: boolean; code: boolean }
const PLAIN: Style = { bold: false, code: false };

export function format(nodes: Node[], params: Params, ctx: FormatContext, hash?: string, style: Style = PLAIN): Segment[] {
  const out: Segment[] = [];
  const push = (text: string, st: Style) => { if (!text) return; const last = out[out.length - 1]; if (last && last.bold === st.bold && last.code === st.code) last.text += text; else out.push({ text, bold: st.bold, code: st.code }); };
  for (const n of nodes) {
    if (typeof n === 'string') push(n, style);
    else if (n.kind === 'hash') push(hash ?? '#', style);
    else if (n.kind === 'tag') format(n.children, params, ctx, hash, { ...style, [n.tag === 'b' ? 'bold' : 'code']: true }).forEach(sg => push(sg.text, sg));
    else if (n.kind === 'blank') push(params[n.arg] === undefined ? `{${n.arg}}` : String(params[n.arg]), style);
    else if (n.kind === 'number') push(typeof params[n.arg] === 'number' ? ctx.num(params[n.arg] as number) : String(params[n.arg] ?? ''), style);
    else if (n.kind === 'plural') {
      const v = Number(params[n.arg]), shown = Number.isNaN(v) ? String(params[n.arg] ?? '') : ctx.num(v - n.offset);   // not a number: show it as it came
      const exact = n.cases[`=${v}`];
      const branch = exact ?? n.cases[ctx.plural(v - n.offset)] ?? n.cases.other;
      format(branch, params, ctx, shown, style).forEach(sg => push(sg.text, sg));
    } else {
      const branch = n.cases[String(params[n.arg])] ?? n.cases.other;
      format(branch, params, ctx, hash, style).forEach(sg => push(sg.text, sg));
    }
  }
  return out;
}

export const toText = (segs: Segment[]): string => segs.map(s => s.text).join('');
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
/** Escaped HTML in which the only tags are <b>, <code> and <br> (from a line break): safe to put in innerHTML whatever the translation or the parameters contain. */
export const toHTML = (segs: Segment[]): string => segs.map(sg => {
  let h = escapeHtml(sg.text).replace(/\n/g, '<br>');
  if (sg.code) h = `<code>${h}</code>`;
  return sg.bold ? `<b>${h}</b>` : h;
}).join('');

/** The shape of a message: its blanks, and the branches of its plurals and selects. Two translations must have the same shape as English. */
export function shape(nodes: Node[]): string[] {
  const out: string[] = [];
  const walk = (ns: Node[], path: string) => {
    for (const n of ns) {
      if (typeof n === 'string' || n.kind === 'hash') continue;
      if (n.kind === 'tag') { out.push(`${path}<${n.tag}>`); walk(n.children, path); continue; }
      if (n.kind === 'blank' || n.kind === 'number') { out.push(`${path}{${n.arg}}`); continue; }
      out.push(`${path}{${n.arg},${n.kind}}`);
      // the plural categories a language needs differ; "other" always exists, so only the arguments and nested blanks are compared
      for (const [k, v] of Object.entries(n.cases)) if (n.kind === 'select' || k === 'other') walk(v, `${path}${n.arg}.${k}/`); else walk(v, `${path}${n.arg}.*/`);
    }
  };
  walk(nodes, '');
  return [...new Set(out)].sort();
}
