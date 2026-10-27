#!/usr/bin/env node
// node src/build.js examples/*.ghosh.json  -> out/v2/<id>.json  (+ prints validation and timeline summary)
'use strict';
const fs = require('fs'), path = require('path');
const { compilePiece } = require('./compile');
const { buildTimeline } = require('./timeline');
fs.mkdirSync('out/v2', { recursive: true });
let bad = 0;
for (const f of process.argv.slice(2)) {
  try {
    const { piece, warnings } = compilePiece(JSON.parse(fs.readFileSync(f, 'utf8')));
    const lens = Object.entries(piece.parts).map(([k, p]) => { const tl = buildTimeline(p); return [k, tl.beats.length, (tl.total - tl.lead).toFixed(1), tl.sounds.length]; });
    if (lens.length > 1 && new Set(lens.map(x => x[2])).size > 1) warnings.push({ part: '*', msg: `parts differ in length: ${lens.map(x => x[0] + ' ' + x[2] + 's').join(', ')}` });
    console.log(`${warnings.length ? '⚠' : '✓'} ${piece.id.padEnd(20)} ${lens.map(([k, b, s, n]) => `${k}: ${b} matras, ${n} sounds, ${s}s`).join(' | ')}`);
    warnings.forEach(w => console.log(`    [${w.part}] line ${w.line}: ${w.msg}`));
    if (warnings.length) bad++;
    fs.writeFileSync(`out/v2/${piece.id}.json`, JSON.stringify(piece, null, 1));
  } catch (e) { bad++; console.log(`✗ ${path.basename(f)}: ${e.message}`); }
}
process.exitCode = bad ? 1 : 0;
