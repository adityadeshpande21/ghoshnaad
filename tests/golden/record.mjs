// Record golden fingerprints from the current source. Run only when a behaviour change is approved:
//   npm run golden:record
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, bookIds, fingerprint, TEMPOS, ORDERS } from './lib.mjs';

const rachanas = {};
for (const f of bookIds()) { const fp = fingerprint(f); rachanas[fp.id] = { file: f, ...fp, id: undefined }; }
const out = { note: 'Fingerprints (sha256 of sorted JSON) of compile3 + buildTimeline3 output. Recorded from v1.1.0 sources, with the corrections of tests/fixtures/book-corrections.json applied.', tempos: TEMPOS, orders: ORDERS, count: Object.keys(rachanas).length, rachanas };
fs.writeFileSync(path.join(ROOT, 'tests/golden/golden.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`recorded ${out.count} rachanas`);
