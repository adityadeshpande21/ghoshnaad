// Shared by the golden recorder and its test: compile every book rachana and fingerprint the results.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const TEMPOS = [0.6, 1, 1.4];
export const ORDERS = ['printed', 'performance', 'once'];

import { compile3, buildTimeline3 } from '../../src/core/index.ts';

export const talas = JSON.parse(fs.readFileSync(path.join(ROOT, 'rules/talas.json'), 'utf8'));

// Key order and the build timestamp must not matter, so fingerprint a sorted, timestamp-free form.
const canon = v => Array.isArray(v) ? v.map(canon)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
export const stable = v => JSON.stringify(canon(v));
export const sha = s => crypto.createHash('sha256').update(s).digest('hex');
export const withoutStamp = piece => { const { generated, ...rest } = piece; return rest; };

export function bookIds() {
  return fs.readdirSync(path.join(ROOT, 'books')).filter(f => f.endsWith('.ghosh.json')).sort();
}

export function compileBook(file) {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'books', file), 'utf8'));
  const { piece, warnings } = compile3(src, { talas });
  return { src, piece, warnings };
}

export function fingerprint(file) {
  const { piece, warnings } = compileBook(file);
  const timelines = {};
  for (const part of Object.keys(piece.parts))
    for (const order of ORDERS)
      for (const tempo of TEMPOS)
        timelines[`${part}|${order}|${tempo}`] = sha(stable(buildTimeline3(piece, part, { tempo, order })));
  return { id: piece.id, compiled: sha(stable(withoutStamp(piece))), warnings: warnings.length, timelines };
}

// The 120 compiled rachanas that v1.1.0 shipped, read straight from the released HTML.
export function legacyPack() {
  const html = fs.readFileSync(path.join(ROOT, 'legacy/v1.1.0/index.html'), 'utf8');
  const m = html.match(/window\.GHOSH_PACK="([^"]+)"/);
  return JSON.parse(zlib.gunzipSync(Buffer.from(m[1], 'base64')).toString('utf8'));
}
