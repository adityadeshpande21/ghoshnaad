#!/usr/bin/env node
// Translators work in a spreadsheet.
//   npm run i18n:export -- --lang gu [--out ghoshnaad-gu.xlsx]   one row per key: where it appears, blanks, max length, English, Marathi, and the language (empty or current)
//   npm run i18n:import -- ghoshnaad-gu.xlsx [--lang gu] [--dry-run]   reads it back: every row is checked against English; valid rows are written to src/i18n/<lang>.json,
//                                                                    the others are listed and left out; then the checks run
// Long content (the guide, the घोषदंड signal words) is not in the sheet: translate the .md files in src/content/<lang>/ themselves.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeXlsx, readXlsx } from './lib/xlsx.mjs';
import { buildRows, planImport } from './lib/i18n-sheet.mjs';

const ROOT = process.env.I18N_CHECK_ROOT ? path.resolve(process.env.I18N_CHECK_ROOT) : path.resolve(import.meta.dirname, '..');
const I18N = path.join(ROOT, 'src/i18n');
const readJSON = f => JSON.parse(fs.readFileSync(path.join(I18N, f), 'utf8'));

const args = process.argv.slice(2), cmd = args.shift();
const opt = name => { const i = args.indexOf(`--${name}`); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const flag = name => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true; };
const die = m => { console.error('✗ ' + m); process.exit(1); };

const languages = readJSON('languages.json');
const messages = Object.fromEntries(languages.filter(l => fs.existsSync(path.join(I18N, `${l.code}.json`))).map(l => [l.code, readJSON(`${l.code}.json`)]));
const context = readJSON('context.json');

if (cmd === 'export') {
  const lang = opt('lang');
  if (!lang) die('usage: npm run i18n:export -- --lang <code> [--out file.xlsx]');
  let rows;
  try { rows = buildRows({ languages, messages, context, lang }); } catch (e) { die(e.message); }
  const out = path.resolve(opt('out') ?? `ghoshnaad-${lang}.xlsx`);
  fs.writeFileSync(out, writeXlsx(rows, { sheet: lang, widths: [26, 28, 30, 10, 48, 48, 48] }));
  const done = rows.slice(1).filter(r => r[r.length - 1]).length;
  console.log(`✓ ${path.relative(process.cwd(), out)}: ${rows.length - 1} texts, ${done} already in ${lang}, ${rows.length - 1 - done} to do`);
  const md = fs.existsSync(path.join(ROOT, 'src/content', lang)) ? '' : ` (there is no src/content/${lang}/ yet)`;
  console.log(`  Long content is not in the sheet: translate src/content/en/*.md into src/content/${lang}/${md}`);
} else if (cmd === 'import') {
  const dry = flag('dry-run'), lang = opt('lang'), file = args[0];
  if (!file) die('usage: npm run i18n:import -- file.xlsx [--lang <code>] [--dry-run]');
  let rows;
  try { rows = readXlsx(new Uint8Array(fs.readFileSync(file))); } catch (e) { die(`${file}: ${e.message}`); }
  const plan = planImport({ languages, messages, context, rows, lang });
  if (!plan.lang) { plan.errors.forEach(e => console.error('  ' + e)); die('nothing imported'); }
  const n = Object.keys(plan.accepted).length;
  if (n && !dry) {
    const f = path.join(I18N, `${plan.lang}.json`), raw = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
    const merged = { ...(messages[plan.lang] ?? {}), ...plan.accepted };
    const ordered = Object.fromEntries(Object.keys(messages.en).filter(k => k in merged).map(k => [k, merged[k]]));     // the order of en.json
    fs.writeFileSync(f, JSON.stringify(ordered, null, raw.startsWith('{\n ') && !raw.startsWith('{\n  ') ? 1 : 2) + '\n');
  }
  console.log(`${dry ? '(dry run, nothing written) ' : ''}${plan.lang}: ${plan.added.length} added, ${plan.changed.length} changed, ${plan.unchanged} unchanged, ${plan.empty} left empty, ${plan.errors.length} refused`);
  for (const k of plan.changed) console.log(`  changed  ${k}`);
  for (const w of plan.warnings) console.log(`  warn     ${w}`);
  for (const e of plan.errors) console.log(`  REFUSED  ${e}`);
  if (!dry) {
    const r = spawnSync(process.execPath, [path.join(import.meta.dirname, 'i18n-check.mjs')], { encoding: 'utf8', env: process.env });
    const lines = r.stdout.trim().split('\n');
    console.log(lines.filter(l => /^\s+(mr|hi|en|[a-z]{2,3})\s+\d+ \/|FAIL|✓|✗/.test(l)).join('\n'));
    if (r.status) process.exit(1);
  }
  process.exit(plan.errors.length ? 1 : 0);
} else die('usage: i18n-xlsx.mjs export --lang <code> | import <file.xlsx> [--lang <code>] [--dry-run]');
