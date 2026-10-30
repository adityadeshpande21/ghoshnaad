import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FolderSync, classify } from '../../src/data/folderSync.ts';
import { FakeDir, clock } from '../support/fake-folder.mjs';

const src = (id, updated) => ({ format: 'ghosh-notation/1', id, parts: { shankh: { lines: [] } }, ...(updated ? { updated } : {}) });
const piece = (id, at) => ({ format: 'ghosh/3', id, parts: {}, rhythm: {}, ...(at ? { generated: { at } } : {}) });
const mineOf = (id, updated) => ({ composer: { id, name: id, blocks: [], updated } });
const fixes = (o, exported) => ({ format: 'ghosh-fixes/1', fixes: o, ...(exported ? { exported } : {}) });
const make = () => { const dir = new FakeDir('rachana'), s = new FolderSync({ now: () => '2026-10-30T09:05:00.000Z' }); s.attach(dir); return { dir, s }; };

test('what kind of file is this', () => {
  assert.equal(classify(src('a')), 'src'); assert.equal(classify(piece('a')), 'piece'); assert.equal(classify(mineOf('a')), 'mine');
  assert.equal(classify(fixes({ a: { src: {} } })), 'fixes');
  for (const bad of [null, 'x', 3, {}, { format: 'ghosh-notation/1' }, { format: 'ghosh/3', parts: {} }, { composer: {} }, { format: 'ghosh-fixes/1' }]) assert.equal(classify(bad), null);
});
test('list: json files four levels deep, not hidden entries, not node_modules, not other files', async () => {
  const { dir, s } = make();
  dir.put('a.json', '{}'); dir.put('b.txt', 'x'); dir.put('.hidden.json', '{}'); dir.put('node_modules/c.json', '{}'); dir.put('.git/d.json', '{}');
  dir.put('one/two/three/four/ok.json', '{}'); dir.put('one/two/three/four/five/too-deep.json', '{}'); dir.put('upper/X.JSON', '{}');
  const paths = (await s.list()).map(f => f.path).sort();
  assert.deepEqual(paths, ['a.json', 'one/two/three/four/ok.json', 'upper/X.JSON']);
});
test('read: every kind, the newest file wins, bundles give their rachanas, broken and unknown files are skipped with their path', async () => {
  const { dir, s } = make();
  dir.put('shriram.ghosh.json', src('shriram', '2026-10-01T00:00:00Z'));
  dir.put('copy/shriram old.json', src('shriram', '2026-09-01T00:00:00Z'));            // older: loses
  dir.put('bhoop.json', piece('bhoop', '2026-08-01T00:00:00Z'));
  dir.put('fixes.json', fixes({ uday: { src: src('uday'), at: '2026-10-15T00:00:00Z' }, bad: { nothing: 1 } }, '2026-10-16'));
  dir.put('mine/one.json', mineOf('m1', '2026-10-02')); dir.put('mine/one newer.json', mineOf('m1', '2026-10-09')); dir.put('mine/two.json', mineOf('m2', '2026-10-03'));
  dir.put('broken.json', '{not json'); dir.put('other.json', { format: 'something/else' }); dir.put('noid.json', { format: 'ghosh-notation/1', parts: { a: 1 } });
  const r = await s.read(await s.list(), {});
  assert.deepEqual(r, { n: 3, m: 2 });
  assert.equal(s.files.get('shriram').path, 'shriram.ghosh.json');
  assert.equal(s.files.get('bhoop').piece.id, 'bhoop');
  assert.equal(s.files.get('uday').bundle, true); assert.equal(s.files.get('uday').updated, '2026-10-15T00:00:00Z');
  assert.equal(s.mine.get('m1').file, 'one newer.json');
  assert.deepEqual([...s.skipped].sort(), ['broken.json', 'noid.json', 'other.json']);
  assert.ok(s.scannedAt instanceof Date);
  // a file without a date is dated by the file's own time
  dir.put('nodate.json', src('nodate'), Date.UTC(2026, 0, 2));
  await s.read(await s.list(), {}); assert.equal(s.files.get('nodate').updated, '2026-01-02T00:00:00.000Z');
});
test('read: an own composition deleted here while the folder could not be written is not brought back', async () => {
  const { dir, s } = make(); dir.put('m.json', mineOf('gone', '1')); dir.put('k.json', mineOf('kept', '1'));
  const r = await s.read(await s.list(), { deletedMine: ['gone'] });
  assert.deepEqual([...s.mine.keys()], ['kept']); assert.equal(r.m, 1); assert.deepEqual(s.skipped, []);
});
test('freeName: the base name, then (2), (3) …; a name of the same id or inside a subfolder is not taken', async () => {
  const { dir, s } = make();
  dir.put('a.ghosh.json', src('a')); dir.put('a (2).ghosh.json', src('b')); dir.put('sub/c.ghosh.json', src('c')); dir.put('m.ghosh.json', mineOf('m1', '1'));
  await s.read(await s.list(), {});
  assert.equal(s.freeName('a.ghosh.json', 'new'), 'a (3).ghosh.json');
  assert.equal(s.freeName('a.ghosh.json', 'a'), 'a.ghosh.json');
  assert.equal(s.freeName('c.ghosh.json', 'x'), 'c.ghosh.json');                                  // inside a subfolder: not in the way
  assert.equal(s.freeName('m.ghosh.json', 'm2'), 'm (2).ghosh.json'); assert.equal(s.freeName('m.ghosh.json', 'm1'), 'm.ghosh.json');
});
test('safeWrite: a new file gets a free name; an unchanged file is written through its handle; a file changed outside the app is left alone', async () => {
  const { dir, s } = make();
  dir.put('rama.ghosh.json', src('rama')); await s.read(await s.list(), {});
  const ent = s.files.get('rama');
  // 1. a new rachana: free name, nothing overwritten
  const created = await s.safeWrite(null, 'rama.ghosh.json', 'NEW', 'other');
  assert.equal(created.name, 'rama (2).ghosh.json'); assert.equal(created.conflict, false); assert.equal(dir.entries.get('rama (2).ghosh.json').text, 'NEW');
  // 2. unchanged since it was read: written in place
  const same = await s.safeWrite(ent, 'rama.ghosh.json', 'V2', 'rama');
  assert.equal(same.name, 'rama.ghosh.json'); assert.equal(same.conflict, false); assert.equal(dir.entries.get('rama.ghosh.json').text, 'V2');
  // 3. the person edited it outside the app: the original stays, the save goes to a dated name
  const ent2 = { ...ent, mod: dir.entries.get('rama.ghosh.json').modified };
  dir.touch('rama.ghosh.json', 'THEIR EDIT');
  const kept = await s.safeWrite(ent2, 'rama.ghosh.json', 'V3', 'rama');
  assert.equal(kept.conflict, true); assert.equal(kept.name, 'rama 2026-10-30-09-05.ghosh.json');
  assert.equal(dir.entries.get('rama.ghosh.json').text, 'THEIR EDIT'); assert.equal(dir.entries.get(kept.name).text, 'V3');
  // 4. the file cannot be read any more: treated as changed
  const h = dir.entries.get('rama (2).ghosh.json'); h.unreadable = true;
  const lost = await s.safeWrite({ fh: h, file: h.name, mod: h.modified }, 'rama.ghosh.json', 'V4', 'zzz');
  assert.equal(lost.conflict, true);
});
test('remove says whether the browser let it; attach, read-only and detach move between the modes', async () => {
  const { dir, s } = make(); dir.put('x.json', src('x'));
  assert.equal(s.mode, 'rw'); assert.equal(await s.remove('x.json'), true); assert.equal(dir.entries.has('x.json'), false);
  assert.equal(await s.remove('x.json'), false);
  const refuse = new FolderSync(); refuse.attach(new FakeDir('d', true)); assert.equal(await refuse.remove('a'), false);
  s.attachReadOnly('chosen'); assert.deepEqual([s.mode, s.dir, s.dirName], ['ro', null, 'chosen']);
  s.attach(dir, 'perm'); assert.equal(s.mode, 'perm');
  await s.read(await s.list(), {}); s.detach(); assert.deepEqual([s.mode, s.dirName, s.files.size, s.mine.size, s.skipped.length], ['none', '', 0, 0, 0]);
  assert.ok(clock.t > 0);
});
