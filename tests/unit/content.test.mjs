import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseGuide, cells, cell, signText } from '../../src/content/guide.ts';
import { parseKeyed, textSlots, fillSlots, newSlot } from '../../src/content/keyed.ts';
import { textRoots } from '../../src/screens/ghoshdand/figure.loose.js';

const ROOT = path.resolve(import.meta.dirname, '../..');
const LANGS = fs.readdirSync(path.join(ROOT, 'src/content'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
const read = l => fs.readFileSync(path.join(ROOT, 'src/content', l, 'guide.md'), 'utf8');
const MIN = '---\ntitle: T\nintro: I\nhead: a | b | c | d\n---\n\n## s: S\n';

test('table cells: a bar inside a cell is written \\|', () => {
  assert.deepEqual(cells('| a | b \\| c |  |'), ['a', 'b | c', '']);
  assert.equal(cell('x | y'), 'x \\| y');
  assert.throws(() => cells('a | b'), /starts and ends/);
});
test('signs: N: draws a sample, N(tv): in the tala-instrument colour, T: plain text', () => {
  const md = MIN + '\n| sign | type | name | meaning | plays |\n| --- | --- | --- | --- | --- |\n| N:स – | x | n | m | p |\n| N(tv):त | x | n | m | p |\n| T:\\| | \\| | n | m | p |\n';
  const g = parseGuide(md);
  assert.deepEqual(g.s[0].rows.map(r => r[0]), [{ kind: 'N', src: 'स –', cls: '' }, { kind: 'N', src: 'त', cls: 'tv' }, { kind: 'T', src: '|', cls: '' }]);
  for (const r of g.s[0].rows) assert.equal(signText(r[0]).length > 2, true);
  assert.throws(() => parseGuide(md.replace('N:स –', 'स –')), /N:… or T:…/);
});
test('paragraphs, examples, tables and notes', () => {
  const md = MIN + '\nOne <b>bold</b> line\ncontinued.\n\nTwo.\n\n```example\n॥ॐ॥ स |\ncaption\n```\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n> note one\n> note two\n';
  const s = parseGuide(md).s[0];
  assert.deepEqual(s.p, ['One <b>bold</b> line continued.', 'Two.']);
  assert.deepEqual(s.ex, ['॥ॐ॥ स |', 'caption']);
  assert.deepEqual(s.table, { head: ['A', 'B'], rows: [['1', '2']] });
  assert.equal(s.note, 'note one note two');
});
test('a mistake names the file and the line', () => {
  assert.throws(() => parseGuide('title: x', 'x/guide.md'), /x\/guide.md line 1: starts with ---/);
  assert.throws(() => parseGuide(MIN.replace('head: a | b | c | d', 'head: a | b'), 'g.md'), /head has four names/);
  assert.throws(() => parseGuide(MIN.replace('intro: I\n', ''), 'g.md'), /lacks intro/);
  assert.throws(() => parseGuide(MIN + '\n```example\none line\n```\n', 'g.md'), /g.md line 9: an example is two lines/);
  assert.throws(() => parseGuide(MIN + '\n| A | B |\n| 1 | 2 |\n', 'g.md'), /a table has a header line and a --- line/);
  assert.throws(() => parseGuide(MIN + '\n| A | B |\n| --- | --- |\n| 1 |\n', 'g.md'), /as many cells as the header/);
  assert.throws(() => parseGuide('---\ntitle: T\nintro: I\nhead: a | b | c | d\n---\n\ntext first\n', 'g.md'), /text before the first section/);
  assert.throws(() => parseGuide(MIN.replace('## s: S', '## S'), 'g.md'), /a section is written/);
});
test('every language has the same guide: the same sections, signs and table shapes (only the words differ)', () => {
  assert.deepEqual(LANGS.sort().slice(0, 3), ['en', 'hi', 'mr']);
  const g = Object.fromEntries(LANGS.map(l => [l, parseGuide(read(l), `${l}/guide.md`)]));
  const ref = g.en;
  for (const l of LANGS) {
    assert.deepEqual(g[l].s.map(s => s.id), ref.s.map(s => s.id), l);
    assert.equal(g[l].head.length, 4, l);
    g[l].s.forEach((s, i) => {
      const r = ref.s[i];
      assert.equal(s.p?.length, r.p?.length, `${l}/${s.id}: paragraphs`);
      assert.equal(!!s.ex, !!r.ex, `${l}/${s.id}: example`);
      assert.equal(!!s.note, !!r.note, `${l}/${s.id}: note`);
      assert.equal(s.rows?.length, r.rows?.length, `${l}/${s.id}: sign rows`);
      assert.equal(s.table?.rows.length, r.table?.rows.length, `${l}/${s.id}: table rows`);
      assert.equal(s.table?.head.length, r.table?.head.length, `${l}/${s.id}: table columns`);
      s.rows?.forEach((row, j) => assert.equal(row[0].kind, r.rows[j][0].kind, `${l}/${s.id}/${j}: sign kind`));
    });
  }
});

/* ---------- keyed texts (the signals of the Ghoshdand page) ---------- */

test('keyed texts: groups, keys, the colon inside a text, and mistakes', () => {
  const md = '# Title\n\n## signals.chal\n- name: March: slow\n- steps.0.label: One\n\n## rules\n- 0: First\n';
  assert.deepEqual(parseKeyed(md), { 'signals.chal.name': 'March: slow', 'signals.chal.steps.0.label': 'One', 'rules.0': 'First' });
  assert.throws(() => parseKeyed('- a: b\n', 'k.md'), /k.md line 1: a text before the first group/);
  assert.throws(() => parseKeyed('## g\nnot a text\n', 'k.md'), /k.md line 2: expected/);
  assert.throws(() => parseKeyed('## g\n- a: x\n- a: y\n', 'k.md'), /g.a is written twice/);
  assert.throws(() => parseKeyed('## g\n- a: \n', 'k.md'), /is empty|expected/);
});
test('text slots are named by where they are in the data, and filled by key', () => {
  const data = { rules: [newSlot()], signals: [{ id: 'chal', name: newSlot(), steps: [{ pose: 'x', label: newSlot() }], notes: [[3, newSlot()]] }], plain: { mr: 'not a slot' } };
  const slots = textSlots(data);
  assert.deepEqual(slots.map(s => s[0]), ['rules.0', 'signals.chal.name', 'signals.chal.steps.0.label', 'signals.chal.notes.3']);
  fillSlots(slots, { mr: { 'rules.0': 'R', 'signals.chal.notes.3': 'N' }, gu: { 'rules.0': 'ગુ' } });
  assert.equal(data.rules[0].mr, 'R'); assert.equal(data.rules[0].gu, 'ગુ'); assert.equal(data.signals[0].name.hi, '');
  assert.throws(() => fillSlots(slots, { mr: { 'rules.9': 'x' } }), /names no text of the data/);
});
test('every language has every text of the Ghoshdand signals, and none that the data does not have', () => {
  const keys = textSlots(textRoots()).map(s => s[0]);
  assert.equal(keys.length, 119);
  for (const l of LANGS) {
    const f = path.join(ROOT, 'src/content', l, 'ghoshdand.md');
    if (!fs.existsSync(f)) continue;                                       // a beta language may not have it yet: the reader falls back
    const texts = parseKeyed(fs.readFileSync(f, 'utf8'), `${l}/ghoshdand.md`);
    assert.deepEqual(Object.keys(texts).filter(k => !keys.includes(k)), [], `${l}: texts for nothing`);
    if (['mr', 'hi', 'en'].includes(l)) assert.deepEqual(keys.filter(k => !(k in texts)), [], `${l}: missing texts`);
  }
});
