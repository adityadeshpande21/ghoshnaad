import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '../..');
const LANGS = [
  { code: 'en', name: 'English', script: 'Latn', digits: 'latn', names: 'roman', fallback: [], fonts: 'x', status: 'complete' },
  { code: 'mr', name: 'मराठी', script: 'Deva', digits: 'deva', names: 'native', fallback: ['en'], fonts: 'x', status: 'complete' },
];
const EN = { 'a.hello': 'Hello', 'a.days': 'Backed up {days} days ago', 'a.count': '{n, plural, one {# rachana} other {# rachanas}}', 'a.unused': 'Nobody uses me' };
const MR = { 'a.hello': 'नमस्कार', 'a.days': '{days} दिवसांपूर्वी बॅकअप', 'a.count': '{n, plural, other {# रचना}}', 'a.unused': 'कोणी वापरत नाही' };
const CODE = "i18n.t('a.hello'); i18n.t('a.days', { days: 3 }); i18n.t('a.count', { n: 2 });\n";

/** Make a small tree, change it with `edit`, run the check on it. */
function run(edit = () => {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-check-'));
  const t = { langs: structuredClone(LANGS), en: { ...EN }, mr: { ...MR }, code: CODE, extra: {} };
  edit(t);
  fs.mkdirSync(path.join(dir, 'src/i18n'), { recursive: true });
  const w = (f, data) => fs.writeFileSync(path.join(dir, 'src', f), typeof data === 'string' ? data : JSON.stringify(data));
  w('i18n/languages.json', t.langs); w('i18n/en.json', t.en); w('i18n/mr.json', t.mr); w('i18n/context.json', {}); w('screen.js', t.code);
  for (const [f, data] of Object.entries(t.extra)) w(f, data);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/i18n-check.mjs')], { env: { ...process.env, I18N_CHECK_ROOT: dir }, encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: r.status, out: r.stdout + r.stderr };
}

test('a clean tree passes; a key nobody uses is only a warning, and coverage is reported', () => {
  const r = run();
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /warn  en.json: a.unused is used by no code/);
  assert.match(r.out, /mr\s+4 \/ 4\s+100.0 %/);
});
test('a key used in code but missing from en.json fails', () => {
  const r = run(t => { t.code += "i18n.t('a.nothere');\n"; });
  assert.equal(r.code, 1); assert.match(r.out, /uses the key a.nothere, which is not in en.json/);
});
test('keys built from a prefix, wrappers, attributes and comments are understood', () => {
  const r = run(t => { t.code = "i18n.t('a.' + name); // i18n.t('a.fake')\n/* i18n.t('a.fake2') */\n"; t.extra['page.html'] = '<b data-i18n="a.hello"></b><i data-i18n-attr="aria-label:a.days"></i>'; });
  assert.equal(r.code, 0, r.out); assert.doesNotMatch(r.out, /a.fake/);
});
test("a translation with other blanks than English fails; plural categories may differ", () => {
  const bad = run(t => { t.mr['a.days'] = '{d} दिवस'; });
  assert.equal(bad.code, 1); assert.match(bad.out, /mr.json: a.days differs from English/);
  assert.equal(run().code, 0);                                            // MR has only "other" in a.count: fine
});
test('a value that is not a plain message fails: a function, a number, HTML, a broken plural', () => {
  assert.match(run(t => { t.mr['a.hello'] = ['x']; }).out, /a.hello is not a text/);
  assert.match(run(t => { t.mr['a.hello'] = '<a href="x">नमस्कार</a>'; }).out, /only <b> and <code> are allowed/);
  assert.match(run(t => { t.mr['a.hello'] = '{n, plural, one {x}'; }).out, /mr.json: a.hello/);
  assert.equal(run(t => { t.mr['a.hello'] = 'नमस्कार <b>जी</b>'; t.en['a.hello'] = 'Hello <b>sir</b>'; }).code, 0);
});
test('a key that English lacks fails; a language needs its file, fonts, fallback and a known fallback', () => {
  assert.match(run(t => { t.mr['a.extra'] = 'x'; }).out, /mr.json: a.extra is not in en.json/);
  assert.match(run(t => { delete t.langs[1].fonts; }).out, /mr has no fonts/);
  assert.match(run(t => { t.langs[1].fallback = ['zz']; }).out, /falls back to zz/);
  assert.match(run(t => { t.langs.push({ ...t.langs[1], code: 'gu' }); }).out, /gu has no file src\/i18n\/gu.json/);
});
test('the real translation files pass', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/i18n-check.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout);
});
