#!/usr/bin/env node
// node src/build3.js examples/*.ghosh.json -> out/v3/<id>.json (standalone ghosh/3 files)
'use strict';
const fs = require('fs'), path = require('path');
const { compile3 } = require('./compile3');
const { buildTimeline3 } = require('./timeline3');
const talas = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/talas.json'), 'utf8'));
fs.mkdirSync('out/v3', { recursive: true });
let bad = 0;
for (const f of process.argv.slice(2)) {
  try {
    const { piece, warnings } = compile3(JSON.parse(fs.readFileSync(f, 'utf8')), { talas });
    const sum = Object.keys(piece.parts).map(k => { const tl = buildTimeline3(piece, k); return `${k} ${tl.sounds.length}`; }).join(', ');
    const tl = buildTimeline3(piece, piece.layout.lead);
    console.log(`${warnings.length ? '⚠' : '✓'} ${piece.id.padEnd(26)} ${(tl.total - tl.origin).toFixed(1)}s · ${sum}`);
    warnings.forEach(w => console.log(`    [${w.part}] ${w.line ? 'line ' + w.line + ': ' : ''}${w.msg}`));
    fs.writeFileSync(`out/v3/${piece.id}.json`, JSON.stringify(piece, null, 1));
  } catch (e) { bad++; console.log(`✗ ${path.basename(f)}: ${e.stack}`); }
}
process.exitCode = bad ? 1 : 0;
