// Books -> the pack that is embedded in the HTML: gzip of one JSON object, base64.
// Layout (same as v1.1.0): data/index.json, data/composer.json, data/r/<id>.json (compiled), data/src/<id>.json (book source).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { compile3 } from '../../src/core/index.ts';
import { catalogEntry } from './catalog.mjs';
const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));

export function buildPack(root, { stamp }) {
  const talas = readJSON(path.join(root, 'rules/talas.json'));
  const composer = readJSON(path.join(root, 'rules/composer.json'));
  const order = readJSON(path.join(root, 'rules/catalog-order.json')).ids;
  const books = {}, compiled = {}, warnings = [];
  for (const f of fs.readdirSync(path.join(root, 'books')).filter(f => f.endsWith('.ghosh.json')).sort()) {
    const src = readJSON(path.join(root, 'books', f));
    const r = compile3(src, { talas, now: stamp });
    books[r.piece.id] = src; compiled[r.piece.id] = r.piece;
    r.warnings.forEach(w => warnings.push(`${r.piece.id} [${w.part}] ${w.msg}`));
  }
  const ids = Object.keys(compiled);
  const missing = order.filter(id => !compiled[id]), extra = ids.filter(id => !order.includes(id));
  if (missing.length || extra.length) throw new Error(`rules/catalog-order.json and books/ disagree. Missing books: ${missing}; not in order list: ${extra}`);

  const pack = { 'data/index.json': order.map(id => catalogEntry(compiled[id])), 'data/composer.json': composer };
  for (const id of [...ids].sort()) pack[`data/r/${id}.json`] = compiled[id];
  for (const id of [...ids].sort()) pack[`data/src/${id}.json`] = books[id];
  const json = JSON.stringify(pack);
  const gz = zlib.gzipSync(Buffer.from(json), { level: 9 });
  return { base64: gz.toString('base64'), count: ids.length, jsonBytes: json.length, gzBytes: gz.length, warnings, pack };
}
