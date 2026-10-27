import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { Catalog } from '../../src/data/catalog.ts';
import { ROOT, legacyPack } from '../golden/lib.mjs';

const html = fs.readFileSync(path.join(ROOT, 'legacy/v1.1.0/index.html'), 'utf8');
const base64 = html.match(/window\.GHOSH_PACK="([^"]+)"/)[1];
const make = () => new Catalog(base64, b => new Uint8Array(zlib.gunzipSync(b)));

test('every file of the released pack comes out the same', async () => {
  const c = make(), pack = legacyPack();
  for (const k of Object.keys(pack)) assert.deepEqual(await c.load(k), pack[k], k);
});
test('the helpers load the library list, a compiled rachana and its book source', async () => {
  const c = make();
  assert.equal((await c.index()).length, 120);
  assert.equal((await c.rachana('ajey')).format, 'ghosh/3');
  assert.equal((await c.source('ajey')).format, 'ghosh-notation/1');
});
test('a file that is not in the pack rejects, saying which', async () => {
  await assert.rejects(make().load('data/r/nonesuch.json'), /missing data\/r\/nonesuch\.json/);
});
test('it unpacks once', async () => {
  let n = 0; const c = new Catalog(base64, b => { n++; return new Uint8Array(zlib.gunzipSync(b)); });
  await c.index(); await c.rachana('ajey'); await c.source('ajey');
  assert.equal(n, 1);
});
