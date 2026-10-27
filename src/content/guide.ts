// The notation guide, written as one Markdown file per language (src/content/<lang>/guide.md), read into the structure the guide screen draws.
//
//   ---
//   title: the heading                      front matter: title, intro (one line), head (the four column names of a sign, split by " | ")
//   intro: …
//   head: Sign | Type | Meaning | How the app plays it
//   ---
//
//   ## read: How to read the notation        a section: its id (what links point at), a colon, its title
//
//   A paragraph. <b>Bold</b> is the only markup.    paragraphs, separated by a blank line
//
//   ```example                               a sample drawn like the player draws it: the notation, then its caption
//   ॥ॐ॥ स [ऽरी] | ग_ ग_ |
//   Shivranjani, vanshi — first line
//   ```
//
//   | sign | type | name | meaning | plays |     the signs: five columns, the first is how to draw the sign
//   | --- | --- | --- | --- | --- |              N:notation draws it as the player does (N(tv):… for the tala-instrument colour),
//   | N:स – | – or - | Hold | … | … |             T:text shows it as plain text. A | inside a cell is written \|
//
//   | Tala | Matras | … |                      any other table is shown as it is (the table of talas)
//   | --- | --- | … |
//
//   > A note under the section. <b>Bold</b> allowed.
//
// The sign column is the same in every language; the other columns are translated. Nothing here is code: a translator edits text only.

export interface GuideSign { kind: 'N' | 'T'; src: string; cls: string }
export type GuideRow = [sign: GuideSign, type: string, name: string, meaning: string, plays: string];
export interface GuideSection {
  id: string;
  t: string;
  p?: string[];
  ex?: [source: string, caption: string];
  rows?: GuideRow[];
  table?: { head: string[]; rows: string[][] };
  note?: string;
}
export interface GuideText { title: string; intro: string; head: string[]; s: GuideSection[] }

const SIGNS_HEADER = ['sign', 'type', 'name', 'meaning', 'plays'];

/** The cells of one table line; `\|` is a bar inside a cell. */
export function cells(line: string): string[] {
  let s = line.trim();
  if (!s.startsWith('|') || !s.endsWith('|') || s.length < 2) throw new Error('a table line starts and ends with |');
  s = s.slice(1, -1);
  const out: string[] = []; let cur = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i++; }
    else if (s[i] === '|') { out.push(cur.trim()); cur = ''; }
    else cur += s[i];
  }
  out.push(cur.trim());
  return out;
}
/** A cell written for a table line: the inverse of `cells`. */
export const cell = (text: string): string => text.replace(/\|/g, '\\|');

function sign(text: string): GuideSign {
  const n = /^N(?:\((\w+)\))?:\s?([\s\S]*)$/.exec(text);
  if (n) return { kind: 'N', src: n[2]!, cls: n[1] ?? '' };
  const t = /^T:\s?([\s\S]*)$/.exec(text);
  if (t) return { kind: 'T', src: t[1]!, cls: '' };
  throw new Error(`a sign is written N:… or T:…, not "${text}"`);
}
export const signText = (g: GuideSign): string => (g.kind === 'T' ? `T:${g.src}` : `N${g.cls ? `(${g.cls})` : ''}:${g.src}`);

export function parseGuide(md: string, name = 'guide.md'): GuideText {
  const lines = md.replace(/\r/g, '').split('\n');
  let at = 0;
  const fail = (m: string, line = at): never => { throw new Error(`${name} line ${line + 1}: ${m}`); };
  if (lines[0] !== '---') fail('starts with ---', 0);
  const front: Record<string, string> = {};
  for (at = 1; at < lines.length && lines[at] !== '---'; at++) {
    const m = /^(\w+): ?(.*)$/.exec(lines[at]!);
    if (!m) fail('expected key: value');
    else front[m[1]!] = m[2]!;
  }
  if (at >= lines.length) fail('the front matter is not closed with ---');
  for (const k of ['title', 'intro', 'head']) if (front[k] === undefined) fail(`front matter lacks ${k}`, 0);
  const head = front.head!.split(' | ');
  if (head.length !== 4) fail('head has four names split by " | "', 0);
  const out: GuideText = { title: front.title!, intro: front.intro!, head, s: [] };
  let sec: GuideSection | null = null;
  for (at++; at < lines.length; at++) {
    const line = lines[at]!;
    if (!line.trim()) continue;
    const h = /^## ([A-Za-z0-9_-]+): (.+)$/.exec(line);
    if (h) { sec = { id: h[1]!, t: h[2]! }; out.s.push(sec); continue; }
    if (line.startsWith('#')) fail('a section is written "## id: title"');
    if (!sec) fail('text before the first section');
    const s = sec!;
    if (line === '```example') {
      const body: string[] = [], start = at;
      for (at++; at < lines.length && lines[at] !== '```'; at++) body.push(lines[at]!);
      if (at >= lines.length) fail('the example is not closed with ```', start);
      if (body.length !== 2) fail('an example is two lines: the notation and its caption', start);
      s.ex = [body[0]!, body[1]!];
    } else if (line.startsWith('|')) {
      const start = at, tbl: string[][] = [];
      try { for (; at < lines.length && lines[at]!.startsWith('|'); at++) tbl.push(cells(lines[at]!)); } catch (e) { fail((e as Error).message); }
      at--;
      if (tbl.length < 2 || !tbl[1]!.every(c => /^:?-{3,}:?$/.test(c))) fail('a table has a header line and a --- line', start);
      const [header, , ...body] = tbl;
      if (body.some(r => r.length !== header!.length)) fail('every table line has as many cells as the header', start);
      if (header!.join('|') === SIGNS_HEADER.join('|')) {
        try { s.rows = body.map(r => [sign(r[0]!), r[1]!, r[2]!, r[3]!, r[4]!] as GuideRow); } catch (e) { fail((e as Error).message, start); }
      } else s.table = { head: header!, rows: body };
    } else if (line.startsWith('>')) {
      const note: string[] = [];
      for (; at < lines.length && lines[at]!.startsWith('>'); at++) note.push(lines[at]!.replace(/^> ?/, ''));
      at--; s.note = note.join(' ');
    } else {
      const para: string[] = [];
      for (; at < lines.length && lines[at]!.trim() && !/^(```|\||>|#)/.test(lines[at]!); at++) para.push(lines[at]!.trim());
      at--; (s.p ??= []).push(para.join(' '));
    }
  }
  if (!out.s.length) fail('no sections', 0);
  return out;
}
