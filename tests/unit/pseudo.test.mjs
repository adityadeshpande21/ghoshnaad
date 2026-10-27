import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pseudo } from '../support/pseudo.mjs';
import { parse, format, toText } from '../../src/i18n/format.ts';

const run = (src, params = {}) => toText(format(parse(src), params, { num: n => String(n), plural: n => (n === 1 ? 'one' : 'other') }));
test('the pseudo-language wraps in brackets, lengthens, and keeps blanks, plurals, selects and bold working', () => {
  assert.match(pseudo('Play'), /^\[.+\]$/);
  assert.ok([...pseudo('Backed up {days} days ago')].length > [...'Backed up {days} days ago'].length * 1.3);
  assert.match(run(pseudo('Backed up {days} days ago'), { days: 3 }), /^\[.*3.*\]$/);
  assert.match(run(pseudo('{n, plural, =1 {one rachana} other {# rachanas}}'), { n: 1 }), /raachaanaa/);
  assert.match(run(pseudo('{n, plural, =1 {one rachana} other {# rachanas}}'), { n: 5 }), /^\[5 /);
  assert.match(run(pseudo('{f, select, L {Left} other {Right}}'), { f: 'L' }), /^\[Leeft/);
  assert.equal(parse(pseudo('Press <b>Play</b> \\{now\\}')).length > 0, true);
  assert.equal(run(pseudo('1 – 2'), {}), '[1 – 2]');                      // no letters: nothing to lengthen
});
