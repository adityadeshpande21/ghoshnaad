import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryKv, getJSON, setJSON } from '../../src/data/kv.ts';
import { Settings } from '../../src/data/settings.ts';
import { UserLibrary } from '../../src/data/userLibrary.ts';
import { sanitizeTalaPage, readTalaPage } from '../../src/data/talaPage.ts';
import { createBackup, parseBackup, planRestore, applyRestore, planIsEmpty, backupFileName, olderCopiesFile } from '../../src/data/backup.ts';

// content differs per id (the `tag`), as real compositions do; pass { tag } to make two share their content
const comp = (id, name, updated = '2026-10-01T10:00:00.000Z', extra = {}) => ({ v: 1, id, name, instr: 'vanshi', tala: 'kerva', laya: 120, raga: null, blocks: [{ type: 'charan', repeat: 2, lines: [], tag: extra.tag ?? id }], ignore: [], created: updated, updated });
const fix = (id, at, tag = 'x') => ({ src: { format: 'ghosh-notation/1', id, title: { dev: tag }, parts: {}, updated: at }, at });
const okChecks = { composition: () => null, correction: () => null };
const opts = { copyLabel: '(backup)', makeId: (() => { let n = 0; return () => 'copy' + ++n; })() };

function device() {
  const kv = new MemoryKv(), lib = new UserLibrary(kv);
  lib.saveCompositions([comp('m1', 'एक'), comp('m2', 'दोन')]);
  lib.saveCorrections({ shriram: fix('shriram', '2026-10-02T00:00:00.000Z', 'mine') });
  setJSON(kv, 'lang', 'hi'); setJSON(kv, 'artic', 'nirantar'); setJSON(kv, 'kanMs', 80);
  return kv;
}

test('storage: values survive a round trip, refused writes are reported', () => {
  const kv = new MemoryKv();
  assert.equal(setJSON(kv, 'a', { x: 1 }), true);
  assert.deepEqual(getJSON(kv, 'a', null), { x: 1 });
  kv.set('bad', '{not json'); assert.equal(getJSON(kv, 'bad', 'fallback'), 'fallback');
  kv.failWrites = true; assert.equal(setJSON(kv, 'b', 1), false);
});

test('settings: damaged values fall back to the default; v1.1.0 bare-word skView is read', () => {
  const kv = new MemoryKv(), s = new Settings(kv);
  kv.set('artic', '"sideways"'); kv.set('kanMs', '5'); kv.set('lang', '"mr"'); kv.set('skView', 'back');
  assert.equal(s.get('artic', 'santar'), 'santar');
  assert.equal(s.get('kanMs', 60), 60);
  assert.equal(s.get('lang', 'en'), 'mr');
  assert.equal(s.get('skView', 'front'), 'back');
  assert.equal(s.set('artic', 'nope'), false);
  assert.equal(s.set('artic', 'nirantar'), true);
});

test('user library: reads what v1.1.0 wrote and ignores damaged entries', () => {
  const kv = new MemoryKv();
  kv.set('mine', JSON.stringify([comp('a', 'ok'), { id: 'no-blocks' }, null, 'x']));
  kv.set('fix', JSON.stringify({ good: fix('good', 't'), bad: { nothing: 1 } }));
  const lib = new UserLibrary(kv);
  assert.deepEqual(lib.compositions().map(r => r.id), ['a']);
  assert.deepEqual(Object.keys(lib.corrections()), ['good']);
  kv.set('mine', '{broken'); assert.deepEqual(lib.compositions(), []);
});

test('backup: contains the work and the settings, in the formats the app already reads', () => {
  const b = createBackup(device(), { app: 'Ghoshnaad 2.0.0', now: new Date('2026-10-27T08:00:00Z') });
  assert.equal(b.format, 'ghoshnaad-backup/1');
  assert.equal(b.mine.length, 2); assert.deepEqual(Object.keys(b.fixes), ['shriram']);
  assert.deepEqual(b.settings, { lang: 'hi', artic: 'nirantar', kanMs: 80 });
  assert.equal(backupFileName(new Date('2026-10-27T23:59:00Z')), 'ghoshnaad-backup-2026-10-27.json');
});

test('parse: only a ghoshnaad backup is accepted', () => {
  const good = JSON.stringify(createBackup(device(), { app: 'x' }));
  assert.equal(parseBackup(good).ok, true);
  assert.equal(parseBackup('hello').error, 'not-json');
  assert.equal(parseBackup('[]').error, 'not-a-backup');
  assert.equal(parseBackup('{"format":"ghosh/3"}').error, 'not-a-backup');
  assert.equal(parseBackup('{"format":"ghoshnaad-backup/2","mine":[1]}').error, 'newer-format');
  assert.equal(parseBackup('{"format":"ghoshnaad-backup/1"}').error, 'empty');
});

test('restore onto an empty device brings everything back', () => {
  const backup = parseBackup(JSON.stringify(createBackup(device(), { app: 'x' }))).backup;
  const fresh = new MemoryKv();
  const plan = planRestore(fresh, backup, okChecks, opts);
  assert.equal(plan.compositions.add.length, 2); assert.equal(Object.keys(plan.corrections.add).length, 1);
  assert.deepEqual(plan.settings.add, { lang: 'hi', artic: 'nirantar', kanMs: 80 });
  assert.equal(applyRestore(fresh, plan), true);
  assert.deepEqual(new UserLibrary(fresh).compositions().map(r => r.name), ['एक', 'दोन']);
  assert.equal(new Settings(fresh).get('lang', 'mr'), 'hi');
});

test('planning writes nothing', () => {
  const backup = parseBackup(JSON.stringify(createBackup(device(), { app: 'x' }))).backup;
  const fresh = new MemoryKv();
  planRestore(fresh, backup, okChecks, opts);
  assert.deepEqual(fresh.keys(), []);
});

test('restoring the same backup twice changes nothing the second time', () => {
  const backup = parseBackup(JSON.stringify(createBackup(device(), { app: 'x' }))).backup;
  const fresh = new MemoryKv();
  applyRestore(fresh, planRestore(fresh, backup, okChecks, opts));
  const again = planRestore(fresh, backup, okChecks, opts);
  assert.equal(planIsEmpty(again), true);
  assert.equal(again.compositions.same, 2); assert.equal(again.corrections.same, 1);
});

test('a composition that differs is kept as a separate copy; nothing is overwritten', () => {
  const backup = parseBackup(JSON.stringify(createBackup(device(), { app: 'x' }))).backup;
  const other = device();
  const lib = new UserLibrary(other);
  lib.saveCompositions([comp('m1', 'एक — बदललेली', '2026-10-20T00:00:00.000Z'), comp('m2', 'दोन')]);
  const plan = planRestore(other, backup, okChecks, { copyLabel: '(बॅकअप)', makeId: () => 'copyX' });
  assert.equal(plan.compositions.same, 1); assert.equal(plan.compositions.copies.length, 1);
  assert.equal(plan.compositions.copies[0].name, 'एक (बॅकअप)'); assert.equal(plan.compositions.copies[0].id, 'copyX');
  applyRestore(other, plan);
  const names = lib.compositions().map(r => r.name);
  assert.deepEqual(names.sort(), ['एक (बॅकअप)', 'एक — बदललेली', 'दोन'].sort());
});

test('a copy never takes an id that is already used', () => {
  const backup = parseBackup(JSON.stringify(createBackup(device(), { app: 'x' }))).backup;
  const other = device(); new UserLibrary(other).saveCompositions([comp('m1', 'changed', '2026-10-30T00:00:00.000Z'), comp('m2', 'दोन'), comp('taken', 'x')]);
  const ids = ['taken', 'taken', 'fresh'];
  const plan = planRestore(other, backup, okChecks, { copyLabel: 'c', makeId: () => ids.shift() });
  assert.equal(plan.compositions.copies[0].id, 'fresh');
});

test('corrections: the newer one stays active, the older is kept and can be saved out', () => {
  const dev = device();
  const backup = { ...createBackup(dev, { app: 'x' }), fixes: { shriram: fix('shriram', '2026-10-25T00:00:00.000Z', 'newer') } };
  const plan = planRestore(dev, parseBackup(JSON.stringify(backup)).backup, okChecks, opts);
  assert.deepEqual(Object.keys(plan.corrections.newer), ['shriram']);
  assert.equal(plan.corrections.older.length, 1);
  applyRestore(dev, plan);
  const lib = new UserLibrary(dev);
  assert.equal(lib.corrections().shriram.src.title.dev, 'newer');
  assert.equal(lib.olderCorrections()[0].src.title.dev, 'mine');
  const file = olderCopiesFile(dev, 'x');
  assert.equal(file.format, 'ghosh-fixes/1'); assert.equal(file.fixes.shriram.src.title.dev, 'mine');
});

test('corrections: an older backup copy does not replace a newer local one but is kept', () => {
  const dev = device();
  const backup = { ...createBackup(dev, { app: 'x' }), fixes: { shriram: fix('shriram', '2026-09-01T00:00:00.000Z', 'old') } };
  const plan = planRestore(dev, parseBackup(JSON.stringify(backup)).backup, okChecks, opts);
  assert.deepEqual(Object.keys(plan.corrections.newer), []);
  assert.equal(plan.corrections.older[0].src.title.dev, 'old');
});

test('settings already chosen on this device are kept', () => {
  const dev = device(); setJSON(dev, 'lang', 'en');
  const backup = { ...createBackup(device(), { app: 'x' }) };
  const plan = planRestore(dev, parseBackup(JSON.stringify(backup)).backup, okChecks, opts);
  assert.equal('lang' in plan.settings.add, false); assert.ok(plan.settings.kept >= 1);
});

test('things that do not compile are reported and skipped, the rest still restores', () => {
  const backup = parseBackup(JSON.stringify({ ...createBackup(device(), { app: 'x' }), mine: [comp('good', 'g'), comp('broken', 'b'), { id: 'x' }] })).backup;
  const checks = { composition: r => (r.id === 'broken' ? 'line 1 is wrong' : null), correction: () => null };
  const plan = planRestore(new MemoryKv(), backup, checks, opts);
  assert.deepEqual(plan.compositions.add.map(r => r.id), ['good']);
  assert.deepEqual(plan.problems.map(p => p.id).sort(), ['broken', 'x']);
});

test('text from a backup stays text: a script in a name is kept verbatim as data', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const kv = new MemoryKv();
  const backup = parseBackup(JSON.stringify({ ...createBackup(device(), { app: 'x' }), mine: [comp('e', evil)] })).backup;
  applyRestore(kv, planRestore(kv, backup, okChecks, opts));
  assert.equal(new UserLibrary(kv).compositions()[0].name, evil);
});

test('a browser that refuses to store tells the caller', () => {
  const kv = new MemoryKv(); kv.failWrites = true;
  const backup = parseBackup(JSON.stringify(createBackup(device(), { app: 'x' }))).backup;
  assert.equal(applyRestore(kv, planRestore(kv, backup, okChecks, opts)), false);
});

test('restoring the same backup again and again adds one copy, not one more each time', () => {
  const backup = parseBackup(JSON.stringify(createBackup(device(), { app: 'x' }))).backup;
  const other = device();
  new UserLibrary(other).saveCompositions([comp('m1', 'changed here', '2026-10-20T00:00:00.000Z'), comp('m2', 'दोन')]);
  let n = 0; const o = { copyLabel: '(backup)', makeId: () => 'c' + ++n };
  for (let i = 0; i < 3; i++) applyRestore(other, planRestore(other, backup, okChecks, o));
  const names = new UserLibrary(other).compositions().map(r => r.name).sort();
  assert.deepEqual(names, ['changed here', 'एक (backup)', 'दोन'].sort());
});

/* ---------- the tala page's choices (tala.v3, outside the key prefix) ---------- */
const raw = (o = {}) => { const m = { ...o }; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, dump: () => m }; };
const TALA = { chal: 'mand', win: 12, speed: 0.5, dhv: true, snd: { num: false, step: true }, talas: { kerva: true, khemta: false } };

test('tala page: only what the page can have written is kept', () => {
  assert.deepEqual(sanitizeTalaPage(TALA), TALA);
  assert.deepEqual(sanitizeTalaPage({ ...TALA, chal: 'nope', win: 99, speed: 7, dhv: 'yes', evil: '<script>', snd: { num: true, hack: true }, talas: { 'a b': true, kerva: 'x' } }), { snd: { num: true } });
  assert.equal(sanitizeTalaPage('x'), null); assert.equal(sanitizeTalaPage([]), null); assert.equal(sanitizeTalaPage({ junk: 1 }), null);
  assert.deepEqual(readTalaPage(raw({ 'tala.v3': JSON.stringify(TALA) })), TALA);
  assert.equal(readTalaPage(raw({ 'tala.v3': '{broken' })), null); assert.equal(readTalaPage(raw()), null);
});
test('tala page: it travels in a backup and is restored only where the device has no choices of its own', () => {
  const dev = device(), backup = parseBackup(JSON.stringify(createBackup(dev, { app: 'x', tala: TALA }))).backup;
  assert.deepEqual(backup.tala, TALA);
  const fresh = new MemoryKv(), r1 = raw();
  const plan = planRestore(fresh, backup, okChecks, { ...opts, haveTala: false });
  assert.deepEqual(plan.tala, { add: TALA, kept: false }); assert.equal(planIsEmpty(plan), false);
  assert.equal(applyRestore(fresh, plan, r1), true);
  assert.deepEqual(JSON.parse(r1.dump()['tala.v3']), TALA);
  const kept = planRestore(new MemoryKv(), backup, okChecks, { ...opts, haveTala: true });
  assert.deepEqual(kept.tala, { add: null, kept: true });
  const r2 = raw({ 'tala.v3': '{"chal":"sthir"}' }); applyRestore(new MemoryKv(), kept, r2);
  assert.equal(r2.dump()['tala.v3'], '{"chal":"sthir"}');                      // the device's own choice is not replaced
  assert.equal(applyRestore(new MemoryKv(), plan), true);                      // no raw storage given: the tala part is left out, the rest still works
});
test('tala page: a backup from before it was added restores as before; a backup of only tala choices is not empty; damaged choices are dropped', () => {
  const old = JSON.parse(JSON.stringify(createBackup(device(), { app: 'x' }))); assert.equal('tala' in old, false);
  const p = planRestore(new MemoryKv(), parseBackup(JSON.stringify(old)).backup, okChecks, opts); assert.deepEqual(p.tala, { add: null, kept: false });
  const only = parseBackup(JSON.stringify({ format: 'ghoshnaad-backup/1', app: 'x', created: '', mine: [], fixes: {}, settings: {}, tala: TALA }));
  assert.equal(only.ok, true);
  assert.equal(parseBackup(JSON.stringify({ format: 'ghoshnaad-backup/1', mine: [], fixes: {}, settings: {}, tala: { junk: 1 } })).ok, false);
});
