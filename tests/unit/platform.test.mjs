import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryKv } from '../../src/data/kv.ts';
import { StorageGuard } from '../../src/platform/storageGuard.ts';
import { detectInstall } from '../../src/platform/installGuide.ts';
import { UpdateManager, compareVersions } from '../../src/platform/updateManager.ts';

/* ---------- StorageGuard ---------- */
function guard(startIso = '2026-10-01T00:00:00Z') {
  let t = new Date(startIso);
  const kv = new MemoryKv(), g = new StorageGuard(kv, { now: () => t });
  return { g, kv, at: iso => { t = new Date(iso); } };
}
test('backup reminder: nothing to remind about until something has been edited', () => {
  const { g, at } = guard(); at('2027-01-01T00:00:00Z');
  assert.equal(g.due().due, false);
});
test('backup reminder: ten edits since the last backup', () => {
  const { g } = guard();
  for (let i = 0; i < 9; i++) g.noteEdit();
  assert.equal(g.due().due, false);
  g.noteEdit();
  assert.deepEqual([g.due().due, g.due().reason], [true, 'edits']);
});
test('backup reminder: seven days after the last backup, once there is an edit', () => {
  const { g, at } = guard();
  g.noteBackup(); at('2026-10-05T00:00:00Z'); g.noteEdit();
  assert.equal(g.due().due, false);
  at('2026-10-08T00:00:01Z');
  assert.deepEqual([g.due().due, g.due().reason], [true, 'days']);
});
test('backup reminder: with no backup ever, the seven days count from the first edit', () => {
  const { g, at } = guard('2026-10-01T00:00:00Z');
  g.noteEdit(); at('2026-10-07T00:00:00Z'); assert.equal(g.due().due, false);
  at('2026-10-08T00:00:00Z'); assert.equal(g.due().due, true);
});
test('a backup clears the reminder and the counters', () => {
  const { g } = guard(); for (let i = 0; i < 12; i++) g.noteEdit();
  assert.equal(g.due().due, true);
  g.noteBackup();
  assert.deepEqual(g.state().edits, 0); assert.equal(g.due().due, false); assert.equal(g.daysSinceBackup(), 0);
});
test('persistence: asks once, reports honestly, tolerates browsers without the API', async () => {
  let asked = 0;
  const g = new StorageGuard(new MemoryKv(), { storage: { persisted: async () => false, persist: async () => { asked++; return true; }, estimate: async () => ({ usage: 10, quota: 100 }) } });
  assert.equal(await g.persist(), true); assert.equal(asked, 1);
  assert.deepEqual(await g.status(), { persisted: false, usage: 10, quota: 100 });
  const none = new StorageGuard(new MemoryKv());
  assert.equal(await none.persist(), false); assert.deepEqual(await none.status(), { persisted: null, usage: null, quota: null });
  const already = new StorageGuard(new MemoryKv(), { storage: { persisted: async () => true, persist: async () => { throw new Error('should not ask'); } } });
  assert.equal(await already.persist(), true);
});

/* ---------- InstallGuide ---------- */
const UA = {
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1',
  ipadOs: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0',
  winChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  winEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  linuxFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
};
const web = (ua, extra = {}) => detectInstall({ userAgent: ua, standalone: false, protocol: 'https:', ...extra });
test('install guide: the right steps for each device and browser', () => {
  const want = [
    [UA.iosSafari, 'ios', 'safari', 'ios-safari'], [UA.iosChrome, 'ios', 'chrome', 'ios-other'],
    [UA.androidChrome, 'android', 'chrome', 'android-chrome'], [UA.samsung, 'android', 'samsung', 'android-samsung'], [UA.androidFirefox, 'android', 'firefox', 'android-firefox'],
    [UA.winChrome, 'desktop', 'chrome', 'desktop-chromium'], [UA.winEdge, 'desktop', 'edge', 'desktop-chromium'], [UA.macSafari, 'desktop', 'safari', 'desktop-safari'], [UA.linuxFirefox, 'desktop', 'firefox', 'desktop-other'],
  ];
  for (const [ua, os, browser, steps] of want) { const a = web(ua); assert.deepEqual([a.os, a.browser, a.steps, a.where], [os, browser, steps, 'website'], ua.slice(0, 60)); }
});
test('install guide: an iPad that says it is a Mac is still an iPad', () => {
  assert.equal(web(UA.ipadOs, { platform: 'MacIntel', maxTouchPoints: 5 }).os, 'ios');
  assert.equal(web(UA.macSafari, { platform: 'MacIntel', maxTouchPoints: 0 }).os, 'desktop');
});
test('install guide: already installed needs no steps; the downloaded file says how to get the website', () => {
  assert.deepEqual([web(UA.iosSafari, { standalone: true }).where, web(UA.iosSafari, { standalone: true }).steps], ['installed', null]);
  const f = web(UA.winChrome, { protocol: 'file:' }); assert.deepEqual([f.where, f.steps], ['file', 'file']);
});
test('install guide: the browser prompt is offered only on the website', () => {
  assert.equal(web(UA.androidChrome, { canPrompt: true }).canPrompt, true);
  assert.equal(web(UA.androidChrome, { canPrompt: true, standalone: true }).canPrompt, false);
});

/* ---------- UpdateManager ---------- */
test('versions compare like semver, a release being newer than its pre-releases', () => {
  const v = (a, b) => compareVersions(a, b);
  assert.equal(v('2.0.0', '1.1.0'), 1); assert.equal(v('1.1.0', '1.1.0'), 0); assert.equal(v('1.0.9', '1.1.0'), -1);
  assert.equal(v('2.0.0-alpha.1', '2.0.0'), -1); assert.equal(v('2.0.0', '2.0.0-alpha.1'), 1);
  assert.equal(v('2.0.0-alpha.2', '2.0.0-alpha.10'), -1); assert.equal(v('2.0.0-beta.1', '2.0.0-alpha.9'), 1);
  assert.equal(v('2.0.1', '2.0.0-alpha.1'), 1); assert.equal(v('10.0.0', '9.9.9'), 1);
});

function fakeSw({ waiting = false } = {}) {
  const swListeners = {}, regListeners = {}, posted = [];
  const reg = { waiting: waiting ? { state: 'installed', postMessage: m => posted.push(m), addEventListener() {} } : null, installing: null, updates: 0,
    addEventListener(t, f) { regListeners[t] = f; }, async update() { this.updates++; } };
  const sw = { controller: {}, async register() { return reg; }, addEventListener(t, f) { swListeners[t] = f; } };
  return { sw, reg, posted, swListeners };
}
function manager({ version = '1.1.0', remote, busy = false, waiting = false } = {}) {
  const f = fakeSw({ waiting }), env = { reloaded: 0, busy };
  const m = new UpdateManager({ appVersion: version, fetchVersion: async () => remote ?? null, sw: f.sw, reload: () => { env.reloaded++; }, busy: () => env.busy });
  return { m, f, env };
}

test('update: nothing newer means nothing to offer', async () => {
  const { m } = manager({ version: '2.0.0', remote: { version: '2.0.0' } }); await m.start();
  assert.equal(m.state.kind, 'none');
});
test('update: a newer version is offered with its notes, and listeners hear about it once', async () => {
  const { m } = manager({ remote: { version: '2.0.0', whatsNew: { en: ['New'] } } });
  const heard = []; m.onChange(s => heard.push(s.kind));
  await m.start(); await m.check();
  assert.equal(m.state.kind, 'available'); assert.deepEqual(m.state.info.whatsNew, { en: ['New'] }); assert.deepEqual(heard, ['available']);
});
test('update: it will not switch while something is playing or unsaved, and does once that is over', async () => {
  const { m, env, f } = manager({ remote: { version: '2.0.0' }, waiting: true }); await m.start();
  assert.equal(m.state.kind, 'ready');
  env.busy = true; assert.equal(m.apply(), false); assert.deepEqual(f.posted, []); assert.equal(env.reloaded, 0);
  env.busy = false; assert.equal(m.apply(), true); assert.deepEqual(f.posted, ['skip-waiting']);
  f.swListeners.controllerchange(); assert.equal(env.reloaded, 1);
});
test('update: with no worker waiting, applying simply reloads to fetch the new page', async () => {
  const { m, env } = manager({ remote: { version: '2.0.0' } }); await m.start();
  assert.equal(m.apply(), true); assert.equal(env.reloaded, 1);
});
test('update: offline or failing checks are quiet', async () => {
  const f = fakeSw(); let n = 0;
  const m = new UpdateManager({ appVersion: '1.0.0', fetchVersion: async () => { n++; throw new Error('offline'); }, sw: f.sw, reload() {}, busy: () => false });
  await m.start(); assert.equal(n, 1); assert.equal(m.state.kind, 'none');
});
test('update: the downloaded file (no worker) can still be told about a version', async () => {
  const m = new UpdateManager({ appVersion: '1.0.0', fetchVersion: async () => null, reload() {}, busy: () => false });
  await m.start(); assert.equal(m.state.kind, 'none');
});
