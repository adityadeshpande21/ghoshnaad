import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildRows, planImport } from '../../tools/lib/i18n-sheet.mjs';
import { writeXlsx, readXlsx } from '../../tools/lib/xlsx.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const LANGS = [
  { code: 'en', name: 'English', script: 'Latn', digits: 'latn', names: 'roman', fallback: [], fonts: 'x', status: 'complete' },
  { code: 'mr', name: 'मराठी', script: 'Deva', digits: 'deva', names: 'native', fallback: ['en'], fonts: 'x', status: 'complete' },
  { code: 'gu', name: 'ગુજરાતી', script: 'Gujr', digits: 'gujr', names: 'native', fallback: ['hi', 'en'].filter(c => c !== 'hi'), fonts: 'x', status: 'beta' },
];
const EN = { 'a.hello': 'Hello', 'a.days': 'Backed up {days} days ago', 'a.count': '{n, plural, one {# rachana} other {# rachanas}}', 'a.sp': ' (again)' };
const MR = { 'a.hello': 'नमस्कार', 'a.days': '{days} दिवसांपूर्वी', 'a.count': '{n, plural, other {# रचना}}', 'a.sp': ' (पुन्हा)' };
const CTX = { 'a.days': { screen: 'platform', params: { days: 'number of days' }, max: 40 }, 'a.hello': { screen: 'list', note: 'a greeting' } };
const world = (gu = {}) => ({ languages: LANGS, messages: { en: EN, mr: MR, gu }, context: CTX });

test('the sheet: header, one row per English key, references, blanks and where it appears', () => {
  const rows = buildRows({ ...world({ 'a.hello': 'નમસ્તે' }), lang: 'gu' });
  assert.deepEqual(rows[0], ['key', 'where it appears', 'blanks', 'max length', 'en (English)', 'mr (मराठी)', 'gu (ગુજરાતી)']);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[1], ['a.hello', 'list — a greeting', '', '', 'Hello', 'नमस्कार', 'નમસ્તે']);
  assert.deepEqual(rows[2].slice(0, 5), ['a.days', 'platform', '{days}: number of days', '40', 'Backed up {days} days ago']);
  assert.equal(rows[3][2], '{n}');                                       // no context: the blank is named from the message
  assert.throws(() => buildRows({ ...world(), lang: 'zz' }), /not in languages.json/);
  assert.deepEqual(buildRows({ ...world(), lang: 'mr' })[0].slice(4), ['en (English)', 'hi (hi)', 'mr (मराठी)']);   // Marathi is the target: Hindi is the second reference
});
test('import: valid rows are accepted, empty rows left, everything else refused with its row', () => {
  const rows = buildRows({ ...world(), lang: 'gu' });
  const col = rows[0].length - 1;
  rows[1][col] = 'નમસ્તે';                                               // fine
  rows[2][col] = '{d} દિવસ પહેલાં';                                        // other blank than English
  rows[3][col] = '{n, plural, one {# રચના} other {# રચનાઓ}}';           // fine: plural categories may differ
  rows[4][col] = '<a href="x">ફરી</a>';                                  // HTML
  rows.push(['a.nothere', '', '', '', '', '', 'x'], ['a.hello', '', '', '', '', '', 'again']);
  const plan = planImport({ ...world(), rows, lang: '' });
  assert.equal(plan.lang, 'gu');
  assert.deepEqual(Object.keys(plan.accepted), ['a.hello', 'a.count']);
  assert.deepEqual(plan.added, ['a.hello', 'a.count']);
  assert.equal(plan.errors.length, 4);
  assert.match(plan.errors.join('\n'), /row 3: a.days: the blanks or branches differ/);
  assert.match(plan.errors.join('\n'), /row 5: a.sp: only <b> and <code> are allowed/);
  assert.match(plan.errors.join('\n'), /row 6: a.nothere is not a key of en.json/);
  assert.match(plan.errors.join('\n'), /row 7: a.hello appears twice/);
});
test('import: a text is kept exactly (a leading space can be on purpose), a change is counted, a long text warns', () => {
  const rows = buildRows({ ...world({ 'a.hello': 'નમસ્તે', 'a.sp': ' (ફરી)' }), lang: 'gu' });
  const col = rows[0].length - 1;
  const same = planImport({ ...world({ 'a.hello': 'નમસ્તે', 'a.sp': ' (ફરી)' }), rows, lang: 'gu' });
  assert.equal(same.unchanged, 2); assert.deepEqual(Object.keys(same.accepted), []);
  rows[1][col] = 'નમસ્કાર'; rows[2][col] = 'x'.repeat(41) + ' {days}';
  const plan = planImport({ ...world({ 'a.hello': 'નમસ્તે', 'a.sp': ' (ફરી)' }), rows, lang: 'gu' });
  assert.deepEqual(plan.changed, ['a.hello']); assert.deepEqual(plan.added, ['a.days']);
  assert.match(plan.warnings.join('\n'), /a.days has 48 characters; the most is 40/);
  rows[4][col] = '(ફરી)';
  assert.match(planImport({ ...world(), rows, lang: 'gu' }).warnings.join('\n'), /a.sp has spaces at the start or end/);
});
test('import refuses a sheet that is not ours, and a language that is not set up', () => {
  assert.match(planImport({ ...world(), rows: [['a', 'b']], lang: '' }).errors[0], /no "key" column/);
  assert.match(planImport({ ...world(), rows: [], lang: '' }).errors[0], /empty/);
  const rows = buildRows({ ...world(), lang: 'gu' }); rows[0][6] = 'zz (Zulu)';
  assert.match(planImport({ ...world(), rows, lang: '' }).errors[0], /zz is not in languages.json/);
  assert.match(planImport({ ...world(), rows: buildRows({ ...world(), lang: 'gu' }), lang: 'ta' }).errors[0], /no column for ta/);
});

/* ---------- the command line, on a made-up tree ---------- */
function tree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-sheet-'));
  fs.mkdirSync(path.join(dir, 'src/i18n'), { recursive: true });
  const w = (f, d) => fs.writeFileSync(path.join(dir, 'src/i18n', f), JSON.stringify(d, null, 2) + '\n');
  w('languages.json', LANGS); w('en.json', EN); w('mr.json', MR); w('gu.json', {}); w('context.json', CTX);
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true }); fs.writeFileSync(path.join(dir, 'src/screen.js'), "i18n.t('a.hello'); i18n.t('a.days'); i18n.t('a.count'); i18n.t('a.sp');\n");
  return dir;
}
const cli = (dir, ...args) => spawnSync(process.execPath, [path.join(ROOT, 'tools/i18n-xlsx.mjs'), ...args], { cwd: dir, env: { ...process.env, I18N_CHECK_ROOT: dir }, encoding: 'utf8' });
test('export, fill in a few cells, import: the language file is written in the order of en.json and the checks run', () => {
  const dir = tree();
  const out = path.join(dir, 'gu.xlsx');
  const e = cli(dir, 'export', '--lang', 'gu', '--out', out);
  assert.equal(e.status, 0, e.stderr); assert.match(e.stdout, /4 texts, 0 already in gu, 4 to do/);
  const rows = readXlsx(new Uint8Array(fs.readFileSync(out)));
  rows[4][6] = ' (ફરી)'; rows[1][6] = 'નમસ્તે'; rows[2][6] = '{days} દિવસ પહેલાં';
  fs.writeFileSync(out, writeXlsx(rows));
  const dry = cli(dir, 'import', out, '--dry-run');
  assert.match(dry.stdout, /3 added/); assert.equal(fs.readFileSync(path.join(dir, 'src/i18n/gu.json'), 'utf8').trim(), '{}');
  const i = cli(dir, 'import', out);
  assert.equal(i.status, 0, i.stdout + i.stderr); assert.match(i.stdout, /gu: 3 added, 0 changed/); assert.match(i.stdout, /✓ i18n:check passed/);
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(dir, 'src/i18n/gu.json'), 'utf8'))), ['a.hello', 'a.days', 'a.sp']);
  rows[3][6] = '{n, plural, other {# x} ';                                // a broken plural: refused, exit code 1, the rest is still applied
  fs.writeFileSync(out, writeXlsx(rows));
  const bad = cli(dir, 'import', out);
  assert.equal(bad.status, 1); assert.match(bad.stdout, /REFUSED  row 4: a.count/);
  fs.rmSync(dir, { recursive: true, force: true });
});
test('the commands explain themselves', () => {
  const dir = tree();
  assert.match(cli(dir, 'export').stderr, /usage/); assert.match(cli(dir, 'import').stderr, /usage/);
  assert.match(cli(dir, 'export', '--lang', 'zz').stderr, /not in languages.json/);
  fs.rmSync(dir, { recursive: true, force: true });
});
