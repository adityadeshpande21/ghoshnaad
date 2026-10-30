import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, bookIds, compileBook, fingerprint, legacyPack, stable, withoutStamp, loadCorrections, applyCorrections } from './lib.mjs';

const golden = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/golden/golden.json'), 'utf8'));
const files = bookIds();

test('the book list matches the golden record', () => {
  assert.equal(files.length, 120);
  assert.deepEqual(files, Object.values(golden.rachanas).map(r => r.file).sort());
});

for (const f of files) {
  test(`golden: ${f}`, () => {
    const fp = fingerprint(f), want = golden.rachanas[fp.id];
    assert.ok(want, `${fp.id} is not in golden.json`);
    assert.equal(fp.compiled, want.compiled, 'compiled output changed');
    assert.equal(fp.warnings, want.warnings, 'warning count changed');
    assert.deepEqual(fp.timelines, want.timelines, 'a timeline changed');
  });
}

// While the released v1.1.0 HTML is in the repo, the books must still compile to exactly what it shipped, except the corrections declared in
// tests/fixtures/book-corrections.json: those books are v1.1.0's source with exactly the declared changes, and they must compile differently.
test('books compile to what v1.1.0 shipped, except the declared corrections', { skip: !fs.existsSync(path.join(ROOT, 'legacy/v1.1.0/index.html')) }, () => {
  const pack = legacyPack(), fixes = loadCorrections();
  for (const f of files) {
    const { src, piece } = compileBook(f), mine = stable(withoutStamp(piece)), theirs = stable(withoutStamp(pack[`data/r/${piece.id}.json`]));
    const own = fixes.filter(c => c.id === piece.id);
    if (!own.length) {
      assert.equal(mine, theirs, `${piece.id}: compiled differs from v1.1.0`);
      assert.equal(stable(src), stable(pack[`data/src/${piece.id}.json`]), `${piece.id}: source differs from v1.1.0`);
    } else {
      const { src: expected, problems } = applyCorrections(pack[`data/src/${piece.id}.json`], own);
      assert.deepEqual(problems, []);
      assert.equal(stable(src), stable(expected), `${piece.id}: the source is not v1.1.0's with the declared corrections`);
      assert.notEqual(mine, theirs, `${piece.id}: the declared corrections change nothing`);
    }
  }
});
test('every declared correction names a book of the list', () => {
  const ids = new Set(files.map(f => f.replace('.ghosh.json', '')));
  for (const c of loadCorrections()) assert.ok(ids.has(c.id), `${c.fix}: no book ${c.id}`);
});
