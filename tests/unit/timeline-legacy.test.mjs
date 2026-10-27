// The TypeScript timeline must equal v1.1.0's own timeline3.js on every book, part, play order and tempo.
// (The golden fingerprints were recorded from the earlier JS; this runs the released code itself, so the two cannot drift apart.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { buildTimeline3 } from '../../src/core/index.ts';
import { ROOT, bookIds, compileBook, ORDERS, TEMPOS } from '../golden/lib.mjs';

const legacy = (() => {
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'legacy/src/app/timeline3.js'), 'utf8') + '\nthis.buildTimeline3 = buildTimeline3;', sandbox);
  return sandbox.buildTimeline3;
})();
const j = x => JSON.stringify(x);

test('every book, part, order and tempo gives the same timeline as v1.1.0 (beats, sounds, total, origin)', () => {
  let n = 0;
  for (const f of bookIds()) {
    const { piece } = compileBook(f);
    for (const part of Object.keys(piece.parts)) for (const order of ORDERS) for (const tempo of TEMPOS) {
      const was = legacy(JSON.parse(j(piece)), part, { tempo, order }), now = buildTimeline3(piece, part, { tempo, order });
      assert.equal(j(now), j(was), `${f} ${part} ${order} ${tempo}`);
      n++;
    }
  }
  assert.ok(n > 5000, `only ${n} timelines compared`);
});
