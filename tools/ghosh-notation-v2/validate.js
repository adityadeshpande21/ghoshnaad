#!/usr/bin/env node
// Usage: node src/validate.js examples/*.ghosh.json [--out out/]
'use strict';
const fs = require('fs'), path = require('path');
const { parsePiece } = require('./parser');
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out'); const outDir = outIdx >= 0 ? args.splice(outIdx, 2)[1] : null;
let bad = 0;
for (const f of args) {
  try {
    const piece = parsePiece(JSON.parse(fs.readFileSync(f, 'utf8')));
    const parts = Object.entries(piece.parts).map(([k, p]) =>
      `${k}: ${p.charans.length} charans, ${p.events.length} events, ${p.timeline.totalMatras} matras, ${p.timeline.totalSeconds}s`).join(' | ');
    console.log(`${piece.warnings.length ? '⚠' : '✓'} ${path.basename(f)}  ${parts}`);
    piece.warnings.forEach(w => console.log(`    [${w.part}] line ${w.line ?? '-'}: ${w.msg}`));
    if (piece.warnings.length) bad++;
    if (outDir) { fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, path.basename(f).replace('.ghosh.json', '.expanded.json')), JSON.stringify(piece, null, 1)); }
  } catch (e) { bad++; console.log(`✗ ${path.basename(f)}\n    ${e.message}`); }
}
process.exitCode = bad ? 1 : 0;
