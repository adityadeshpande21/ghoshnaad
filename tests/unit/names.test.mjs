import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { transliterate, nameIn, TRANSLITERATED_SCRIPTS } from '../../src/i18n/names.ts';
import { buildPack } from '../../build/lib/pack.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');

test('a Devanagari name becomes the same name in each script, letter for letter', () => {
  assert.equal(transliterate('केरवा', 'Gujr'), 'કેરવા');
  assert.equal(transliterate('खेमटा', 'Gujr'), 'ખેમટા');
  assert.equal(transliterate('श्रीराम', 'Gujr'), 'શ્રીરામ');
  assert.equal(transliterate('केदार', 'Beng'), 'কেদার');
  assert.equal(transliterate('केदार', 'Guru'), 'ਕੇਦਾਰ');
  assert.equal(transliterate('केदार', 'Orya'), 'କେଦାର');
  assert.equal(transliterate('केदार', 'Knda'), 'ಕೇದಾರ');
  assert.equal(transliterate('केदार', 'Telu'), 'కేదార');
  assert.equal(transliterate('केदार', 'Mlym'), 'കേദാര');
  assert.equal(transliterate('तिलक श्याम', 'Gujr'), 'તિલક શ્યામ');            // spaces stay
  assert.equal(transliterate('Kerva ॥', 'Gujr'), 'Kerva ॥');                  // Latin text and the danda stay
});
test('letters a script lacks fall to the nearest one: ळ, व in Bengali, the nukta', () => {
  assert.equal(transliterate('गौडमल्हार', 'Beng'), 'গৌডমল্হার');
  assert.equal(transliterate('वंशी', 'Beng'), 'বংশী');                         // Bengali has no separate व: ব
  assert.equal(transliterate('कलिंगड़ा', 'Gujr'), 'કલિંગડ઼ા');                   // ड़ is ड + nukta, which Gujarati has
  assert.equal(transliterate('कलिंगड़ा', 'Telu'), 'కలింగడ఼ా');                    // Telugu has a nukta in current Unicode
  assert.equal(transliterate('कलिंगड़ा', 'Taml'), 'கலிஂகடா');                    // Tamil has none: dropped
  assert.deepEqual([...transliterate('षड्ज', 'Guru')].map(c => c.codePointAt(0)), [0xa36, 0xa21, 0xa4d, 0xa1c]);   // Gurmukhi has no ष: ਸ਼ (U+0A36)
});
test('Tamil: aspirated and voiced stops fold to the plain letter; Grantha letters for ज श ष स ह', () => {
  assert.equal(transliterate('खेमटा', 'Taml'), 'கேமடா');
  assert.equal(transliterate('भूप', 'Taml'), 'பூப');
  assert.equal(transliterate('झपताल', 'Taml'), 'சபதால');
  assert.equal(transliterate('शंख', 'Taml'), 'ஶஂக');
  assert.equal(transliterate('ज', 'Taml'), 'ஜ');
});
test('digits, other scripts and unknown scripts', () => {
  assert.equal(transliterate('१२०', 'Gujr'), '૧૨૦');
  assert.equal(transliterate('केरवा', 'Latn'), 'केरवा');                       // not a script we transliterate to: unchanged
  assert.deepEqual([...TRANSLITERATED_SCRIPTS].sort(), ['Beng', 'Gujr', 'Guru', 'Knda', 'Mlym', 'Orya', 'Taml', 'Telu']);
});
test('nameIn: native Devanagari as printed, roman as roman letters, another script transliterated, with corrections', () => {
  assert.equal(nameIn({ script: 'Deva', names: 'native' }, 'केरवा', 'Kerva'), 'केरवा');
  assert.equal(nameIn({ script: 'Latn', names: 'roman' }, 'केरवा', 'Kerva'), 'Kerva');
  assert.equal(nameIn({ script: 'Latn', names: 'roman' }, 'केरवा'), 'केरवा');                 // no roman name in the data: the Devanagari one
  assert.equal(nameIn({ script: 'Gujr', names: 'native' }, 'केरवा', 'Kerva'), 'કેરવા');
  assert.equal(nameIn({ script: 'Gujr', names: 'native' }, 'केरवा', 'Kerva', { 'केरवा': 'કહરવા' }), 'કહરવા');   // the override wins
});
test('every name of the data can be written in every script: no Devanagari letter is left behind', () => {
  const { pack } = buildPack(ROOT, { stamp: '2026-01-01T00:00:00.000Z' });
  const names = new Set();
  for (const r of pack['data/index.json']) { names.add(r.dev); (r.alt ?? []).forEach(a => names.add(a)); if (r.raga) names.add(r.raga); r.talas.forEach(t => names.add(t)); }
  for (const r of pack['data/composer.json'].ragas ?? []) names.add(r.name);
  assert.ok(names.size > 100);
  const left = [];
  for (const script of TRANSLITERATED_SCRIPTS) for (const n of names) {
    const out = transliterate(n, script);
    if (/[ऀ-ॣ०-ॿ]/.test(out)) left.push(`${script}: ${n} -> ${out}`);
    if (/\p{Cn}/u.test(out)) left.push(`${script}: ${n} has an unassigned code point`);
  }
  assert.deepEqual(left, []);
});
