import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { compile3, compilePiece, tokenize, NotationError, findTala, talaInfo, tableOf, buildTimeline3 } from '../../src/core/index.ts';
import { ROOT, talas, bookIds, compileBook } from '../golden/lib.mjs';

const table = tableOf(talas);

test('tala lookup by key, alias and Devanagari name', () => {
  assert.equal(findTala(table, 'kerva')?.name.dev, 'केरवा');
  assert.equal(findTala(table, 'Keherwa')?.name.dev, 'केरवा');
  assert.equal(findTala(table, 'teental')?.name.dev, 'त्रिताल');
  assert.equal(findTala(table, 'झपताल')?.name.rom, 'Jhaptal');
  assert.equal(findTala(table, 'nonesuch'), undefined);
});

test('tala info carries size, gat split and step length, with Devanagari digits for laya', () => {
  assert.deepEqual(talaInfo(table, 'झपताल', '१२०'), { name: 'झपताल', key: 'jhaptal', laya: 120, cycle: 10, ganSize: 5, gats: [2, 3], stepMatras: null });
  assert.deepEqual(talaInfo(table, 'kerva', 100), { name: 'केरवा', key: 'kerva', laya: 100, cycle: 4, ganSize: 2, gats: null, stepMatras: 1 });
  assert.throws(() => talaInfo(table, 'nonesuch', 100), /Unknown tala/);
});

test('every tala the old hardcoded table knew is in the library with the same sizes', () => {
  const old = { kerva: [4, 2, 1], khemta: [12, 6, 3], dadra: [6, 3, 3], jhaptal: [10, 5, null], rupak: [7, 7, null], ektal: [12, 2, 1], tritaal: [16, 4, 2] };
  for (const [k, [cycle, gan, step]] of Object.entries(old)) {
    const t = table[k]; assert.ok(t, k);
    assert.deepEqual([t.cycle, t.ganSize, t.steps ? t.steps.matrasPerStep : null], [cycle, gan, step], k);
  }
});

test('tokenizer: notes, strokes, bars, groups, directives', () => {
  const kinds = s => tokenize(s, 0).map(t => t.t);
  assert.deepEqual(kinds('॥ॐ॥ स री | ग म :॥'), ['start', 'sym', 'sym', 'gan', 'sym', 'sym', 'repeat']);
  assert.deepEqual(kinds('[त–तत] @laya=100 "ॐ":4 #ध्रुवपद {1 }'), ['gopen', 'sym', 'sym', 'sym', 'sym', 'gclose', 'dir', 'cue', 'label', 'endOpen', 'endClose']);
  const [sa] = tokenize("प.'", 0); assert.equal(sa.sym.oct, 0);   // one dot below, one tick above cancel
  const [kb] = tokenize('री_', 0); assert.equal(kb.sym.vikrit, true);
  const [rep] = tokenize(':॥x3', 0); assert.equal(rep.times, 3);
  const [roll] = tokenize('त्र', 0); assert.equal(roll.sym.stroke, 'roll');   // not त followed by something else
});

test('tokenizer: mistakes are reported with line and column', () => {
  assert.throws(() => tokenize('स री ?? Z', 4), e => e instanceof NotationError && e.line === 4 && /Unknown symbol/.test(e.message));
  assert.throws(() => tokenize('@bad', 0), /Directive must look like/);
  assert.throws(() => tokenize('{3', 0), /Ending must be/);
  assert.throws(() => tokenize('"ॐ"', 0), /Cue must look like/);
  assert.throws(() => tokenize('#', 0), /label needs a name/);
});

test('compile warns when a gan has the wrong number of matras', () => {
  const piece = { id: 't', title: { dev: 'क' }, section: 'naimittik', parts: { anak: { tala: 'केरवा', laya: 120, lines: ['॥ त त | त ॥'] } } };
  const { warnings } = compilePiece(piece, table);
  assert.ok(warnings.some(w => /गण has 1 matras; केरवा expects 2/.test(w.msg)), JSON.stringify(warnings));
});

test('compile3 refuses to run without the tala library', () => {
  assert.throws(() => compile3({ id: 'x', title: { dev: 'x' }, parts: {} }, {}), /tala library/);
});

test('a better tempo plays faster: total time scales with 1 / tempo', () => {
  const { piece } = compileBook('ajey.ghosh.json');
  const a = buildTimeline3(piece, 'anak', { tempo: 1 }), b = buildTimeline3(piece, 'anak', { tempo: 2 });
  assert.ok(Math.abs(a.total / b.total - 2) < 1e-9);
});

test('the two books kept out of the catalog still compile cleanly', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'books-unshipped')).filter(f => f.endsWith('.json'))) {
    const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'books-unshipped', f), 'utf8'));
    const { piece, warnings } = compile3(src, { talas, now: 'x' });
    assert.ok(piece.id); assert.deepEqual(warnings, [], f);
  }
});

// The schema and cross checks that the old validate3.js ran by hand, now part of the test run.
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/schema/ghosh-3.schema.json'), 'utf8')));
for (const f of bookIds()) {
  test(`schema and cross-checks: ${f}`, () => {
    const { piece: p } = compileBook(f);
    assert.ok(validate(p), JSON.stringify((validate.errors || []).slice(0, 3)));
    const span = k => { const t = buildTimeline3(p, k), m = {}; t.beats.filter(b => b.pass > 0).forEach(b => { const key = `${b.charan}/${b.pass}`; m[key] = (m[key] || 0) + b.dur; }); return { m, total: t.total }; };
    const ref = span(p.layout.lead);
    for (const k of Object.keys(p.parts)) {
      if (k === p.layout.lead) continue;
      const s = span(k);
      assert.ok(Math.abs(s.total - ref.total) < 1e-6, `${k} lasts ${s.total.toFixed(2)}s, ${p.layout.lead} ${ref.total.toFixed(2)}s`);
      for (const key of Object.keys(ref.m)) assert.ok(Math.abs((s.m[key] || 0) - ref.m[key]) < 1e-6, `${k}: charan/pass ${key}`);
    }
    for (const [k, l] of Object.entries(p.layout.parts))
      assert.equal(l.lines.flatMap(x => x.gans).join(), p.parts[k].gans.map(g => g.addr).join(), `layout of ${k} lists every gan in order`);
    for (const id of p.rhythm.form) assert.ok(p.rhythm.charans.some(c => c.id === id), `form refers to missing ${id}`);
  });
}
