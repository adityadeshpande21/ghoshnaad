// The translation spreadsheet: what a translator gets (`buildRows`) and what is accepted back (`planImport`). Pure functions; the CLI does the files.
import { parse, shape } from '../../src/i18n/format.ts';

const HEADER = { key: 'key', where: 'where it appears', blanks: 'blanks', max: 'max length' };
const label = (languages, code) => `${code} (${languages.find(l => l.code === code)?.name ?? code})`;
const blanksOf = text => { try { return [...new Set(shape(parse(text)).map(s => /\{(\w+)/.exec(s)?.[1]).filter(Boolean))]; } catch { return []; } };

/** The reference languages shown next to the one being translated: English, and Marathi (Hindi when Marathi is the target). */
export const referencesFor = lang => ['en', 'mr', 'hi'].filter(c => c !== lang).slice(0, lang === 'en' ? 2 : 2).sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : 0));

/**
 * @param {{ languages: any[], messages: Record<string, Record<string, string>>, context: Record<string, any>, lang: string }} o
 * @returns {string[][]} header row, then one row per key of en.json
 */
export function buildRows({ languages, messages, context, lang }) {
  if (!languages.some(l => l.code === lang)) throw new Error(`${lang} is not in languages.json: add its entry first`);
  const refs = referencesFor(lang), own = messages[lang] ?? {};
  const rows = [[HEADER.key, HEADER.where, HEADER.blanks, HEADER.max, ...refs.map(c => label(languages, c)), label(languages, lang)]];
  for (const [key, en] of Object.entries(messages.en)) {
    const c = context[key] ?? {};
    const blanks = Object.entries(c.params ?? {}).map(([n, d]) => `{${n}}: ${d}`);
    for (const n of blanksOf(en)) if (!(c.params && n in c.params)) blanks.push(`{${n}}`);
    rows.push([key, [c.screen, c.note].filter(Boolean).join(' — '), blanks.join('\n'), c.max ? String(c.max) : '', ...refs.map(r => messages[r]?.[key] ?? ''), own[key] ?? '']);
  }
  return rows;
}

/**
 * Read a translated sheet.
 * @returns {{ lang: string, accepted: Record<string, string>, added: string[], changed: string[], unchanged: number, empty: number, errors: string[], warnings: string[] }}
 */
export function planImport({ languages, messages, context, rows, lang }) {
  const out = { lang: '', accepted: {}, added: [], changed: [], unchanged: 0, empty: 0, errors: [], warnings: [] };
  if (!rows.length) { out.errors.push('the sheet is empty'); return out; }
  const header = rows[0].map(h => String(h ?? '').trim());
  const keyCol = header.indexOf(HEADER.key);
  if (keyCol < 0) { out.errors.push(`the first row has no "${HEADER.key}" column: this is not a sheet written by i18n:export`); return out; }
  const langCols = header.map((h, i) => ({ h, i, code: /^([a-z]{2,3}) \(/.exec(h)?.[1] })).filter(c => c.code);
  const target = lang ? langCols.find(c => c.code === lang) : langCols[langCols.length - 1];
  if (!target) { out.errors.push(lang ? `no column for ${lang} in the sheet (columns: ${langCols.map(c => c.code).join(', ')})` : 'the sheet has no language column'); return out; }
  out.lang = target.code;
  if (!languages.some(l => l.code === out.lang)) { out.errors.push(`${out.lang} is not in languages.json: add its entry first`); return out; }
  const en = messages.en, own = messages[out.lang] ?? {};
  const seen = new Set();
  rows.slice(1).forEach((row, n) => {
    const at = `row ${n + 2}`, key = String(row[keyCol] ?? '').trim();
    if (!key) return;
    if (!(key in en)) { out.errors.push(`${at}: ${key} is not a key of en.json (was the key column edited?)`); return; }
    if (seen.has(key)) { out.errors.push(`${at}: ${key} appears twice`); return; }
    seen.add(key);
    const text = String(row[target.i] ?? '');                       // kept exactly: a few texts begin with a space on purpose
    if (!text.trim()) { out.empty++; return; }
    const edge = t => [/^\s/.test(t), /\s$/.test(t)].join();
    if (edge(text) !== edge(en[key])) out.warnings.push(`${at}: ${key} has spaces at the start or end that English does not have (or the other way round)`);
    let nodes;
    try { nodes = parse(text); } catch (e) { out.errors.push(`${at}: ${key}: ${e.message}`); return; }
    const want = shape(parse(en[key])).join(' '), got = shape(nodes).join(' ');
    if (want !== got) { out.errors.push(`${at}: ${key}: the blanks or branches differ from English (English has ${want || 'none'}; this has ${got || 'none'})`); return; }
    const max = context[key]?.max;
    if (max && [...text].length > max) out.warnings.push(`${at}: ${key} has ${[...text].length} characters; the most is ${max}`);
    if (own[key] === text) { out.unchanged++; return; }
    (own[key] === undefined ? out.added : out.changed).push(key);
    out.accepted[key] = text;
  });
  return out;
}
