#!/usr/bin/env node
// npm run i18n:check — the translation files against the code and against each other (part of `npm run verify`).
//   Fail:  a key used in code is missing from en.json · a translation's blanks or select branches differ from English
//          · a value that is not a plain message (function, object, HTML other than <b> / <code>, a parse error) · invalid JSON
//          · a language in languages.json without its file, fonts or fallback · a message file for no language · a key not in English
//   Warn:  a key in en.json that no code uses · a text longer than its `max` in context.json · a key without context
//   Report: coverage per language.
import fs from 'node:fs';
import path from 'node:path';
import { parse, shape } from '../src/i18n/format.ts';

const ROOT = process.env.I18N_CHECK_ROOT ? path.resolve(process.env.I18N_CHECK_ROOT) : path.resolve(import.meta.dirname, '..');   // the tests point it at a made-up tree
const I18N = path.join(ROOT, 'src/i18n');
const fails = [], warns = [];
const fail = m => fails.push(m), warn = m => warns.push(m);

/* ---------- the files ---------- */
const readJSON = (f, what = path.relative(ROOT, f)) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { fail(`${what}: ${e.message}`); return null; }
};
const languages = readJSON(path.join(I18N, 'languages.json')) ?? [];
const codes = languages.map(l => l.code);
const messages = {};
for (const l of languages) {
  for (const field of ['name', 'script', 'digits', 'fonts', 'status']) if (!l[field]) fail(`languages.json: ${l.code} has no ${field}`);
  if (!['native', 'roman'].includes(l.names)) fail(`languages.json: ${l.code} needs names: "native" or "roman"`);
  if (!Array.isArray(l.fallback)) fail(`languages.json: ${l.code} has no fallback list`);
  else for (const f of l.fallback) if (!codes.includes(f)) fail(`languages.json: ${l.code} falls back to ${f}, which is not a language`);
  const file = path.join(I18N, `${l.code}.json`);
  if (!fs.existsSync(file)) { fail(`languages.json: ${l.code} has no file src/i18n/${l.code}.json`); continue; }
  messages[l.code] = readJSON(file) ?? {};
}
for (const f of fs.readdirSync(I18N)) {
  const m = /^([a-z]{2,3})\.json$/.exec(f);
  if (m && !codes.includes(m[1])) fail(`src/i18n/${f} belongs to no language of languages.json`);
}
const en = messages.en;
if (!en) { fail('there is no English reference file (en.json): every key lives there first'); report(); }
const context = readJSON(path.join(I18N, 'context.json')) ?? {};

/* ---------- every message is a plain message ---------- */
const parsed = {};
for (const [code, msgs] of Object.entries(messages)) {
  parsed[code] = {};
  for (const [key, text] of Object.entries(msgs)) {
    if (typeof text !== 'string') { fail(`${code}.json: ${key} is not a text (a message is a plain string: no function, array or object)`); continue; }
    try { parsed[code][key] = parse(text); } catch (e) { fail(`${code}.json: ${key}: ${e.message}`); }
  }
}

/* ---------- a translation has the shape of English ---------- */
for (const code of codes.filter(c => c !== 'en')) {
  for (const key of Object.keys(messages[code] ?? {})) {
    if (!(key in en)) { fail(`${code}.json: ${key} is not in en.json`); continue; }
    const a = parsed.en[key], b = parsed[code][key];
    if (!a || !b) continue;
    const sa = shape(a).join(' '), sb = shape(b).join(' ');
    if (sa !== sb) fail(`${code}.json: ${key} differs from English in its blanks or branches\n      en: ${sa || '(none)'}\n      ${code}: ${sb || '(none)'}`);
  }
}

/* ---------- the keys the code uses ---------- */
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (p !== I18N) walk(p); } else if (/\.(js|ts|html)$/.test(e.name) && !e.name.endsWith('.d.ts')) files.push(p);
  }
})(path.join(ROOT, 'src'));

// A screen may wrap i18n.t in a helper that adds its prefix: tala.loose.js `tt('x')` is 'tala.x', ghoshdand.loose.js `tk('x')` is 'ghoshdand.x',
// composer.loose.js `chk(k, i)` builds 'composer.check.<k>.<i>' (found as a prefix).
const WRAPPERS = { 'src/screens/tala/tala.loose.js': [['tt', 'tala.']], 'src/screens/ghoshdand/ghoshdand.loose.js': [['tk', 'ghoshdand.']] };
const used = new Set(), prefixes = new Set(), where = new Map();
const use = (key, file) => { used.add(key); if (!where.has(key)) where.set(key, file); };
const call = (src, fn, prefix, file) => {
  // fn('literal'), fn('literal' + …), fn(`literal${…}`)
  for (const m of src.matchAll(new RegExp(`(?<![\\w$])(?<!(?<!\\.)\\.)${fn.replace('.', '\\.')}\\(\\s*(['"\`])([^'"\`]*?)(\\$\\{|\\1)(\\s*\\+)?`, 'g'))) {
    const text = prefix + m[2];
    if (m[3] === '${' || m[4]) prefixes.add(text); else use(text, file);
  }
};
const code = f => fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1').replace(/<!--[\s\S]*?-->/g, '');   // comments mention keys as examples
for (const f of files) {
  const rel = path.relative(ROOT, f).split(path.sep).join('/'), src = code(f);
  for (const fn of ['i18n.t', 'i18n.tb', 'i18n.tIn', 'i18n.tbIn', 'core.t', 'core.tb']) call(src, fn, '', rel);
  for (const [fn, prefix] of WRAPPERS[rel] ?? []) call(src, fn, prefix, rel);
  for (const m of src.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) use(m[1], rel);
  for (const m of src.matchAll(/data-i18n-attr="([^"]+)"/g)) for (const pair of m[1].split(';')) { const k = pair.split(':')[1]?.trim(); if (k) use(k, rel); }
}
for (const key of used) if (!(key in en)) fail(`${where.get(key)}: uses the key ${key}, which is not in en.json`);
// "unused" also counts a key written as a plain string anywhere in the code (lists of keys, a key chosen by a condition) or reached by a prefix
const literals = new Set();
for (const f of files) for (const m of code(f).matchAll(/(['"`])([A-Za-z][\w.-]*)\1/g)) literals.add(m[2]);
const dataKeys = Object.keys(en).filter(k => !used.has(k) && !literals.has(k) && ![...prefixes].some(p => k.startsWith(p)));
for (const k of dataKeys) warn(`en.json: ${k} is used by no code`);
// notes and tales of the data: keys the code builds from words (tala notes, platform steps) are covered by their prefixes above

/* ---------- context.json ---------- */
for (const k of Object.keys(en)) if (!context[k]) warn(`context.json: ${k} has no entry`);
for (const k of Object.keys(context)) if (!(k in en)) warn(`context.json: ${k} is not a key of en.json`);
for (const [code, msgs] of Object.entries(messages))
  for (const [key, text] of Object.entries(msgs)) {
    const max = context[key]?.max;
    if (max && typeof text === 'string' && [...text].length > max) warn(`${code}.json: ${key} has ${[...text].length} characters; the most is ${max}`);
  }

/* ---------- the report ---------- */
function report() {
  const total = en ? Object.keys(en).length : 0;
  if (en) {
    console.log(`i18n: ${total} keys in en.json, ${files.length} files read, ${used.size} keys found in code (+ ${prefixes.size} built from a prefix)`);
    for (const l of languages) {
      const have = Object.keys(messages[l.code] ?? {}).filter(k => k in en).length;
      console.log(`  ${l.code.padEnd(4)} ${String(have).padStart(4)} / ${total}  ${((100 * have) / (total || 1)).toFixed(1).padStart(5)} %  ${l.status ?? ''}`);
    }
  }
  for (const w of warns) console.log(`  warn  ${w}`);
  for (const f of fails) console.log(`  FAIL  ${f}`);
  console.log(fails.length ? `✗ i18n:check: ${fails.length} problem${fails.length > 1 ? 's' : ''}` : `✓ i18n:check passed${warns.length ? ` (${warns.length} warning${warns.length > 1 ? 's' : ''})` : ''}`);
  process.exit(fails.length ? 1 : 0);
}
report();
