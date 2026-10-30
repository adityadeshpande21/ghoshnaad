import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaitingWork } from '../../src/data/waitingWork.ts';
import { UserLibrary } from '../../src/data/userLibrary.ts';
import { MemoryKv } from '../../src/data/kv.ts';

const src = id => ({ format: 'ghosh-notation/1', id, parts: {} });

test('corrections that wait in the browser: hold, release, and they are the same store as UserLibrary.corrections', () => {
  const kv = new MemoryKv(), w = new WaitingWork(kv);
  w.hold('shriram', src('shriram'), '2026-10-30T08:00:00Z');
  assert.deepEqual(w.waitingIds(), ['shriram']); assert.equal(w.waiting('shriram').at, '2026-10-30T08:00:00Z');
  assert.deepEqual(Object.keys(new UserLibrary(kv).corrections()), ['shriram']);          // what a backup would take
  assert.equal(w.release('shriram').src.id, 'shriram'); assert.equal(w.release('shriram'), undefined);
  assert.deepEqual(new UserLibrary(kv).corrections(), {});
});
test('a new WaitingWork reads what an earlier one saved; damaged entries are dropped', () => {
  const kv = new MemoryKv();
  kv.set('fix', JSON.stringify({ good: { src: src('good'), at: 't', dl: true }, bad: { nothing: 1 } }));
  kv.set('filed', JSON.stringify({ 'm:a': { at: '1', file: 'a.ghosh.json' }, 'm:b': 'x', 'm:c': { at: '1' } }));
  kv.set('mineDel', JSON.stringify(['x', 3, null]));
  const w = new WaitingWork(kv);
  assert.deepEqual(w.waitingIds(), ['good']); assert.equal(w.waiting('good').dl, true);
  assert.deepEqual(w.filedFor('a'), { at: '1', file: 'a.ghosh.json' }); assert.equal(w.filedFor('b'), undefined); assert.equal(w.filedFor('c'), undefined);
  assert.deepEqual(w.deletedMine(), ['x']);
  kv.set('filed', '{broken'); kv.set('mineDel', '"x"'); assert.equal(new WaitingWork(kv).filedFor('a'), undefined); assert.deepEqual(new WaitingWork(kv).deletedMine(), []);
});
test('a waiting copy the folder now has, the same or newer, stops waiting; an older one in the folder does not', () => {
  const w = new WaitingWork(new MemoryKv());
  w.hold('same', src('same'), '2026-10-01'); w.hold('newer', src('newer'), '2026-10-01'); w.hold('older', src('older'), '2026-10-05'); w.hold('piece', src('piece'), '2026-10-01'); w.hold('none', src('none'), '2026-10-01');
  w.releaseSuperseded(new Map([['same', { src: {}, updated: '2026-10-01' }], ['newer', { src: {}, updated: '2026-10-09' }], ['older', { src: {}, updated: '2026-10-02' }], ['piece', { updated: '2026-10-09' }]]));
  assert.deepEqual(w.waitingIds().sort(), ['none', 'older', 'piece']);              // a compiled file (no source) does not replace a waiting source
});
test('downloaded: one or all; they still wait but are no longer counted', () => {
  const w = new WaitingWork(new MemoryKv());
  w.hold('a', src('a'), '1'); w.hold('b', src('b'), '1');
  assert.equal(w.count([]), 2);
  w.markDownloaded('a'); assert.equal(w.count([]), 1); assert.deepEqual(w.waitingIds().sort(), ['a', 'b']);
  w.markDownloaded(); assert.equal(w.count([]), 0);
  w.markDownloaded('nothing');                                                           // not an error
});
test('own compositions: unsaved until written or downloaded at their current state; deleting remembers once', () => {
  const kv = new MemoryKv(), w = new WaitingWork(kv), mine = [{ id: 'm1', updated: '2' }, { id: 'm2', updated: '5' }, { id: 'm3', updated: '1' }];
  w.file('m1', { at: '2', file: 'one.ghosh.json' }); w.file('m2', { at: '4', file: 'two.ghosh.json' });
  assert.deepEqual(w.unsaved(mine).map(r => r.id), ['m2', 'm3']);                        // m1 is as written; m2 changed since; m3 never written
  assert.equal(w.count(mine), 2);
  w.file('m2', { at: '5', file: 'two.ghosh.json', dl: true }); assert.equal(w.count(mine), 1);
  w.unfile('m1'); assert.equal(w.filedFor('m1'), undefined); assert.equal(w.count(mine), 2);
  w.markDeleted('m9'); w.markDeleted('m9'); assert.deepEqual(w.deletedMine(), ['m9']); assert.deepEqual(JSON.parse(kv.get('mineDel')), ['m9']);
  assert.deepEqual(new WaitingWork(kv).filedFor('m2'), { at: '5', file: 'two.ghosh.json', dl: true });
});
