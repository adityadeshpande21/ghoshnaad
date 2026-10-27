// The TypeScript composer model must behave exactly like the released v1.1.0 composer-core.js, on real and on random input.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import * as C from '../../src/core/composer.ts';
import { tableOf, compile3 } from '../../src/core/index.ts';
import { ROOT, talas } from '../golden/lib.mjs';

const legacy = (() => {
  const code = fs.readFileSync(path.join(ROOT, 'legacy/src/app/composer-core.js'), 'utf8');
  const sandbox = { module: { exports: {} }, window: undefined };
  vm.runInNewContext(code, sandbox);
  return sandbox.module.exports;
})();
// the old module runs in its own realm, so compare by value (JSON) rather than by prototype
const j = x => JSON.parse(JSON.stringify(x, (k, v) => (Object.prototype.toString.call(v) === '[object Set]' ? [...v].sort() : v)));
const same = (a, b, msg) => assert.deepEqual(j(a), j(b), msg);
const composerData = JSON.parse(fs.readFileSync(path.join(ROOT, 'rules/composer.json'), 'utf8'));
const fixture = JSON.parse(JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/v1.1.0-storage.json'), 'utf8')).entries['ghosh.mine']);

// a small deterministic random generator
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const NOTES = ['स', 'री', 'ग', 'म', 'प', 'ध', 'नि'], MODS = ['', '', '', '.', "'", '_', "'_", '..'], BOLS = ['त', 'त्र', 'थ', 'थ्र', '+'], OTHER = ['ऽ', '–'];
function randomRachana(r, tala, instr, seed) {
  const R = rng(seed), pick = a => a[Math.floor(R() * a.length)];
  const tok = row => R() < .15 ? pick(OTHER) : row === 'mel' ? pick(NOTES) + pick(MODS) : (R() < .08 ? pick(NOTES) + pick(MODS) : pick(BOLS));
  const matra = row => { const n = 1 + Math.floor(R() * 4), fill = Math.floor(R() * (n + 1)); return { n, s: Array.from({ length: fill }, () => tok(row)) }; };
  const line = () => { const k = C.TALA_INFO[tala].gan * 4; return { mel: Array.from({ length: k }, () => matra('mel')), anak: Array.from({ length: k }, () => (R() < .3 ? { n: 1, s: [] } : matra('anak'))) }; };
  const ragas = composerData.ragas;
  return { v: 1, id: 'r' + seed, name: 'नमुना ' + seed, instr, tala, laya: C.TALA_INFO[tala].laya, raga: R() < .5 ? pick(ragas) : null,
    blocks: Array.from({ length: 1 + Math.floor(R() * 3) }, () => ({ type: pick(['charan', 'prarambhik', 'setu']), repeat: pick([1, 2]), lines: Array.from({ length: Math.floor(R() * 3) }, line) })),
    ignore: R() < .3 ? ['endSa'] : [], created: '2026-01-01', updated: '2026-01-02' };
}

const TALAS = Object.keys(C.TALA_INFO);
const samples = [...fixture, ...TALAS.flatMap(t => ['shankh', 'vanshi'].flatMap(i => Array.from({ length: 12 }, (_, k) => randomRachana(null, t, i, 1000 + k * 7 + t.length))))];

test('the talas it knows are the talas of the tala library, with the same sizes', () => {
  const T = tableOf(talas);
  for (const [k, info] of Object.entries(C.TALA_INFO)) {
    assert.equal(info.gan, T[k].ganSize, k); assert.deepEqual(info.gats, T[k].gats && T[k].gats.length ? T[k].gats : null, k); assert.equal(info.dev, T[k].name.dev, k);
  }
});

test(`toSource and check agree with v1.1.0 on ${samples.length} compositions`, () => {
  for (const r of samples) {
    same(C.toSource(structuredClone(r)), legacy.toSource(structuredClone(r)), r.id);
    same(C.check(structuredClone(r)), legacy.check(structuredClone(r)), r.id);
  }
});

test('lines of text: writing and reading them agree with v1.1.0', () => {
  for (const r of samples) for (const b of r.blocks) for (const l of b.lines) for (const row of ['mel', 'anak']) {
    const t = C.lineText(l[row], r.tala);
    assert.equal(t, legacy.lineText(l[row], r.tala));
    same(C.parseLineText(t, r.tala), legacy.parseLineText(t, r.tala), t);
    // damaged text gives the same errors
    for (const bad of [t.replace(/\|/, ''), t + ' | स', '', t.replace(/[^\s|]/, '?')]) same(C.parseLineText(bad, r.tala), legacy.parseLineText(bad, r.tala), bad);
  }
});

test('tokens agree with v1.1.0, including odd input', () => {
  const R = rng(5), alphabet = [...NOTES, ...BOLS, ...OTHER, '.', "'", '_', ' ', '-', 'रे', 'x', '[', ']', ','];
  for (let i = 0; i < 400; i++) {
    const s = Array.from({ length: 1 + Math.floor(R() * 12) }, () => alphabet[Math.floor(R() * alphabet.length)]).join('');
    same(C.tokenize(s), legacy.tokenize(s), s);
    for (const t of C.tokenize(s)) same(C.parseToken(t), legacy.parseToken(t), t);
  }
  assert.equal(C.noteToken('ग', -2, true), legacy.noteToken('ग', -2, true));
  assert.equal(C.noteToken('ग', 2, false), legacy.noteToken('ग', 2, false));
});

test('raga note sets and the आनक suggestions agree with v1.1.0', () => {
  for (const raga of [null, {}, ...composerData.ragas]) same(C.ragaSet(raga), legacy.ragaSet(raga));
  for (const tala of TALAS) for (const group of Object.values(composerData.anak[tala] || {})) for (const p of group)
    same(C.patternRow(p.p, tala), legacy.patternRow(p.p, tala), p.p);
});

test('a new rachana has the same shape as v1.1.0\'s', () => {
  const strip = r => ({ ...r, id: 'x', created: 'x', updated: 'x' });
  for (const t of TALAS) for (const instr of ['shankh', 'vanshi']) same(strip(C.newRachana({ name: 'क', instr, tala: t })), strip(legacy.newRachana({ name: 'क', instr, tala: t })));
  same(strip(C.newRachana({})), strip(legacy.newRachana({})));
});

test('compositions made with it still compile to playable rachanas', () => {
  for (const r of samples.slice(0, 20)) {
    const src = C.toSource(r);
    const { piece } = compile3(src, { talas });
    assert.ok(Object.keys(piece.parts).length > 0);
  }
});
