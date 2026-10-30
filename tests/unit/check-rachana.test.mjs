import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { checkRachana, allIds, context } from '../../tools/check-rachana.mts';
import { compile3 } from '../../src/core/index.ts';
import { ROOT, talas } from '../golden/lib.mjs';

const ctx = context();
const book = id => JSON.parse(fs.readFileSync(path.join(ROOT, 'books', `${id}.ghosh.json`), 'utf8'));
const lineOf = (l) => (typeof l === 'string' ? l : l.t);
const setLine = (src, part, i, text) => { const l = src.parts[part].lines[i]; src.parts[part].lines[i] = typeof l === 'string' ? text : { ...l, t: text }; };

test('every book passes: source and compiled output equal the bundle and v1.1.0 (but for declared corrections), symbols round-trip, matras fit, parts end together', () => {
  const failed = allIds().map(id => checkRachana(id, ctx)).filter(r => r.failures.length).map(r => `${r.id}: ${r.failures.join('; ')}`);
  assert.deepEqual(failed, []);
  assert.equal(allIds().length, 120);
});
test('a changed source is caught: not the bundle\'s, not v1.1.0\'s', () => {
  const src = book('shriram'); setLine(src, 'shankh', 0, lineOf(src.parts.shankh.lines[0]).replace('[प.ऽप.प.]', '[प.प.प.ऽ]'));
  const r = checkRachana('shriram', ctx, { src });
  assert.ok(r.failures.some(f => /differs from the bundle's source/.test(f)), r.failures.join('\n'));
  assert.ok(r.failures.some(f => /differs from v1.1.0's source/.test(f)));
});
test('a lost symbol and a गण with the wrong matra count are caught, with the line', () => {
  const src = book('shriram'); setLine(src, 'shankh', 1, lineOf(src.parts.shankh.lines[1]).replace('[प.प.] [सग]', '[प.प.]'));
  const r = checkRachana('shriram', ctx, { src });
  assert.ok(r.failures.some(f => /shankh line 2, c\d\.b\.0: 1 matras, केरवा asks for 2 per गण/.test(f)), r.failures.join('\n'));
});
test('a crash is a failure, never a pass', () => {
  const src = book('shriram'); setLine(src, 'shankh', 0, '॥ॐ॥ स. [प.ऽऽप. | ?? ');
  const r = checkRachana('shriram', ctx, { src });
  assert.ok(r.failures.some(f => /^crashed: /.test(f)) || r.failures.length > 0, 'nothing failed');
  const none = checkRachana('shriram', ctx, { src: { format: 'x' } });
  assert.ok(none.failures.some(f => /^crashed: |differs/.test(f)));
  assert.ok(checkRachana('no-such-book', ctx).failures.some(f => /^crashed: /.test(f)));
});
test('a text cue counts the matras it spans, not one', () => {
  const withCue = allIds().find(id => JSON.stringify(book(id)).includes('"ॐ\\":') || /"ॐ":\d/.test(JSON.stringify(book(id)).replace(/\\"/g, '"')));
  assert.ok(withCue, 'no book has a text cue');
  assert.deepEqual(checkRachana(withCue, ctx).failures, []);
});
test('a declared correction is accepted: source = v1.1.0 + the correction, compiled output must change, bundle must agree', () => {
  const id = 'shriram', part = 'shankh', before = '| स [ऽग] |', after = '| स [गग] |';
  const src = book(id); setLine(src, part, 1, lineOf(src.parts[part].lines[1]).replace(before, after));
  const { piece } = compile3(src, { talas });
  const bundle = { ...ctx.bundle, [`data/src/${id}.json`]: src, [`data/r/${id}.json`]: piece };
  const fix = { fix: 'T1', id, part, line: 2, before, after, reason: 'test' };
  const ok = checkRachana(id, { ...ctx, bundle, corrections: [fix] }, { src });
  assert.deepEqual(ok.failures, []); assert.match(ok.notes.join(), /corrected on purpose: T1/);
  const undeclared = checkRachana(id, { ...ctx, bundle, corrections: [] }, { src });
  assert.ok(undeclared.failures.some(f => /differs from v1.1.0's source/.test(f)) && undeclared.failures.some(f => /compiled output differs from v1.1.0/.test(f)));
  const wrong = checkRachana(id, { ...ctx, bundle, corrections: [{ ...fix, after: '| स [गस] |' }] }, { src });
  assert.ok(wrong.failures.some(f => /not v1.1.0's with the declared corrections/.test(f)));
  const twice = checkRachana(id, { ...ctx, corrections: [{ ...fix, before: '[प.प.]' }] });
  assert.ok(twice.failures.some(f => /must occur exactly once .* occurs 3 times/.test(f)), twice.failures.join('\n'));
  const idle = checkRachana(id, { ...ctx, corrections: [{ ...fix, after: fix.before }] });
  assert.ok(idle.failures.some(f => /change nothing/.test(f)));
});
