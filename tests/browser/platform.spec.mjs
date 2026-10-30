// Backup and restore, updates, reminders and install steps, in the running app. v2 only.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const isLegacy = (process.env.GHOSH_TARGET || 'legacy') === 'legacy';
test.skip(isLegacy, 'new in v2');

const FIXTURE = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../fixtures/v1.1.0-storage.json'), 'utf8')).entries;
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function seed(page, entries) {
  await page.addInitScript(e => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v);
  }, entries);
}
const VERSION = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../release.json'), 'utf8')).version;
// English, and the install hint already dismissed, unless a test says otherwise
const BASE = { 'ghosh.lang': '"en"', 'ghosh.installSeen': '1' };
const SEEN = { 'ghosh.seenVersion': VERSION };
async function boot(page, { entries = {}, url = './' } = {}) {
  await seed(page, { ...BASE, ...entries });
  await page.goto(url);
  await page.waitForSelector('#rows .row', { state: 'attached', timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => !!window.PlatformUI && !!window.Library && !!window.ComposerUI)).toBeTruthy();
}
// the "what's new" notice shows to people upgrading from v1.1.0; most tests are about something else, so they have seen it
const settled = { ...FIXTURE, ...SEEN, 'ghosh.lang': '"en"' };
const openSheet = async page => { await page.evaluate(() => { renderSheet(); $('#sheet').hidden = false; }); await expect(page.locator('#pfWork')).toBeVisible(); };

test('the sheet shows what is saved, and when it was last backed up', async ({ page }) => {
  await boot(page, { entries: settled });
  await openSheet(page);
  await expect(page.locator('#pfWork')).toContainText('Saved on this device');
  await expect(page.locator('#pfWork')).toContainText('2 own rachanas · 1 corrections');
  await expect(page.locator('#pfWork')).toContainText('Not backed up yet');
});

test('a backup downloads with the work in it, and clears the reminder', async ({ page }) => {
  await boot(page, { entries: { ...settled, 'ghosh.backup': JSON.stringify({ at: null, edits: 12, firstEdit: '2026-10-01T00:00:00Z' }) } });
  await expect(page.locator('#pfBar')).toContainText('many changes');
  await openSheet(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-pf="backup"]').click()]);
  expect(dl.suggestedFilename()).toMatch(/^ghoshnaad-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const b = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  expect(b.format).toBe('ghoshnaad-backup/1');
  expect(b.mine.map(r => r.name)).toEqual(['माझी पहिली रचना', 'दुसरी — शंख']);
  expect(Object.keys(b.fixes)).toEqual(['shriram']);
  expect(b.settings).toMatchObject({ lang: 'en', artic: 'nirantar', kanMs: 80 });
  await expect(page.locator('#pfWork')).toContainText('Backed up today');
  await page.evaluate(() => { $('#sheet').hidden = true; });
  await expect(page.locator('#pfBar')).toBeHidden();
});

async function backupOf(browser, entries) {
  const ctx = await browser.newContext({ baseURL: 'http://localhost:4173/' }), page = await ctx.newPage();
  await boot(page, { entries });
  const file = await page.evaluate(() => JSON.stringify(GhoshPlatform.createBackup(new GhoshPlatform.LocalKv(), { app: 'test' })));
  await ctx.close();
  return file;
}
async function restoreInto(page, text, name = 'backup.json') {
  await openSheet(page);
  await page.evaluate(() => navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : null);
  await page.waitForTimeout(250);                      // the sheet redraws once when the storage status arrives; let that finish first
  await page.locator('[data-pf-file]').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
}

test('restoring a backup on a clean device brings back everything', async ({ page, browser }) => {
  const backup = await backupOf(browser, settled);
  await boot(page);                                        // an empty device
  await restoreInto(page, backup);
  const box = page.locator('[data-pf-box]');
  await expect(box).toContainText('New rachanas: 2');
  await expect(box).toContainText('New corrections: 1');
  expect(await page.evaluate(() => ComposerUI.all().length)).toBe(0);      // nothing written until confirmed
  await Promise.all([page.waitForEvent('load'), page.locator('[data-pf="restore-go"]').click()]);
  await page.waitForSelector('#rows .row', { state: 'attached' });
  const got = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  expect(JSON.parse(got['ghosh.mine'])).toEqual(JSON.parse(FIXTURE['ghosh.mine']));
  expect(JSON.parse(got['ghosh.fix'])).toEqual(JSON.parse(FIXTURE['ghosh.fix']));
  expect(await page.evaluate(() => ComposerUI.all().map(r => r.name))).toEqual(['माझी पहिली रचना', 'दुसरी — शंख']);
  expect(await page.evaluate(() => ScreenApp.get('list').LIST.some(r => r.id === 'f~shriram'))).toBe(true);
});

test("the tala page's choices (tala.v3) go into the backup the button makes, and come back on a clean device but never replace a device's own", async ({ page, browser, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit shares the file instead of downloading it');
  const TALA = { chal: 'mand', win: 12, speed: 0.5, snd: { num: false } };
  const ctx = await browser.newContext({ baseURL: 'http://localhost:4173/' }), src = await ctx.newPage();
  await boot(src, { entries: { ...settled, 'tala.v3': JSON.stringify(TALA) } });
  await openSheet(src);
  await src.waitForTimeout(250);
  const [download] = await Promise.all([src.waitForEvent('download'), src.locator('[data-pf="backup"]').click()]);
  const file = fs.readFileSync(await download.path(), 'utf8');
  await ctx.close();
  expect(JSON.parse(file).tala).toEqual(TALA);
  // a clean device gets them
  await boot(page);
  await restoreInto(page, file);
  await expect(page.locator('[data-pf-box]')).toContainText('Settings');
  await Promise.all([page.waitForEvent('load'), page.locator('[data-pf="restore-go"]').click()]);
  await page.waitForSelector('#rows .row', { state: 'attached' });
  expect(JSON.parse(await page.evaluate(() => localStorage['tala.v3']))).toEqual(TALA);
  // a device with its own choices keeps them
  const ctx2 = await browser.newContext({ baseURL: 'http://localhost:4173/' }), other = await ctx2.newPage();
  await boot(other, { entries: { 'tala.v3': JSON.stringify({ chal: 'sthir' }) } });
  await restoreInto(other, file);
  await Promise.all([other.waitForEvent('load'), other.locator('[data-pf="restore-go"]').click()]);
  await other.waitForSelector('#rows .row', { state: 'attached' });
  expect(JSON.parse(await other.evaluate(() => localStorage['tala.v3']))).toEqual({ chal: 'sthir' });
  await ctx2.close();
});

test('restoring onto a device with different work keeps both, and says so first', async ({ page, browser }) => {
  const backup = await backupOf(browser, settled);
  const mine = JSON.parse(FIXTURE['ghosh.mine']);
  mine[0] = { ...mine[0], name: 'बदललेली', updated: '2026-12-01T00:00:00.000Z' };
  await boot(page, { entries: { ...settled, 'ghosh.mine': JSON.stringify(mine) } });
  await restoreInto(page, backup);
  const box = page.locator('[data-pf-box]');
  await expect(box).toContainText('separate copy: 1');
  await expect(box).toContainText('unchanged: 2');                       // the second composition and the correction
  await Promise.all([page.waitForEvent('load'), page.locator('[data-pf="restore-go"]').click()]);
  await page.waitForSelector('#rows .row', { state: 'attached' });
  const names = await page.evaluate(() => ComposerUI.all().map(r => r.name));
  expect(names).toEqual(['बदललेली', 'दुसरी — शंख', 'माझी पहिली रचना (backup)']);
});

test('a file that is not a backup is refused and nothing changes', async ({ page }) => {
  await boot(page, { entries: settled });
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  await restoreInto(page, '{"hello":"world"}');
  await expect(page.locator('#pfWork')).toContainText('not a Ghoshnaad backup');
  await restoreInto(page, 'plain text');
  await expect(page.locator('#pfWork')).toContainText('not a backup');
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))).toBe(before);
});

test('text inside a backup is shown as text, never run', async ({ page, browser }) => {
  const backup = JSON.parse(await backupOf(browser, settled));
  backup.mine[0].name = '<img src=x onerror="window.__pwned=1">';
  backup.fixes = {};
  await boot(page);
  await restoreInto(page, JSON.stringify(backup));
  await expect(page.locator('[data-pf-box]')).toBeVisible();
  await Promise.all([page.waitForEvent('load'), page.locator('[data-pf="restore-go"]').click()]);
  await page.waitForSelector('#rows .row', { state: 'attached' });
  await page.evaluate(() => { store.set('lib', 'mine'); ComposerUI.init(); });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  expect(await page.evaluate(() => document.querySelectorAll('img[src="x"]').length)).toBe(0);
});

test('a rachana that does not compile is skipped, the rest still restores', async ({ page, browser }) => {
  const backup = JSON.parse(await backupOf(browser, settled));
  backup.mine[1] = { ...backup.mine[1], tala: 'nonesuch' };
  await boot(page);
  await restoreInto(page, JSON.stringify(backup));
  const box = page.locator('[data-pf-box]');
  await expect(box).toContainText('New rachanas: 1');
  await expect(box).toContainText('Skipped, could not be read: 1');
});

test.describe('updates', () => {
  const serve = (page, version) => page.route('**/version.json*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ version, date: '2027-01-01', whatsNew: { en: ['Brand new thing'] } }) }));

  test('a newer version is offered; it is refused while a rachana plays, accepted when stopped', async ({ page }) => {
    await serve(page, '9.9.9');
    await boot(page, { entries: settled });
    await expect(page.locator('#pfBar')).toContainText('New version available: 9.9.9');
    await page.evaluate(() => openPiece('shriram', true));                  // starts playing, like a tap on its row
    await expect.poll(() => page.evaluate(() => S.playing)).toBe(true);
    await page.evaluate(() => { PlatformUI._update().apply(); });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__reloaded === undefined && S.playing)).toBe(true);   // still playing, page not reloaded
    await page.evaluate(() => stop());
    // applying reloads the page; start it from a timer so the evaluate call itself returns first
    await Promise.all([page.waitForEvent('load', { timeout: 10_000 }), page.evaluate(() => { setTimeout(() => PlatformUI._update().apply(), 0); })]);
  });

  test('it is refused while a correction draft is unsaved, while the sound check plays, and for a restore too', async ({ page }) => {
    await serve(page, '9.9.9');
    await boot(page, { entries: settled });
    const tryApply = () => page.evaluate(() => PlatformUI._update().apply());
    expect(await page.evaluate(() => ScreenApp.isBusy())).toBe(false);
    // a correction draft with a change that is not saved
    await page.evaluate(async () => { await FixerUI.open('shriram'); const ta = document.querySelector('#fxText'); ta.value = ta.value + ' '; ta.dispatchEvent(new Event('input')); });
    expect(await page.evaluate(() => ScreenApp.get('correction').isBusy())).toBe(true);
    expect(await tryApply()).toBe(false);
    await page.evaluate(() => { document.querySelector('#fixer').hidden = true; });
    expect(await tryApply()).toBe(false);                                         // closed but still unsaved
    // restore is refused for the same reason, with a message
    await page.evaluate(() => { renderSheet(); $('#sheet').hidden = false; });
    const backup = JSON.stringify({ format: 'ghoshnaad-backup/1', app: 't', created: '', mine: [], fixes: {}, settings: { xlay: 'pages' } });          // a setting this device has not chosen yet, so there is something to restore
    await page.waitForTimeout(250);
    await page.locator('[data-pf-file]').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
    await page.locator('[data-pf="restore-go"]').click();
    await expect(page.locator('#pfWork')).toContainText('Stop the playback or save');
  });

  test('the same or an older version offers nothing', async ({ page }) => {
    await serve(page, '1.0.0');
    await boot(page, { entries: settled });
    await page.waitForTimeout(500);
    await expect(page.locator('#pfBar')).toBeHidden();
  });
});

test.describe('first start', () => {
  test('people upgrading from v1.1.0 are told what is new, once', async ({ page }) => {
    await boot(page, { entries: { ...FIXTURE, 'ghosh.lang': '"en"' } });
    await expect(page.locator('#pfNew')).toContainText("What's new", { timeout: 5000 });
    await expect(page.locator('#pfNew')).toContainText('silent switch');
    await page.locator('[data-pf="new-ok"]').click();
    await page.reload(); await page.waitForSelector('#rows .row', { state: 'attached' });
    await page.waitForTimeout(1200);
    await expect(page.locator('#pfNew')).toBeHidden();
  });

  test('an empty device is asked once whether there is a backup to restore', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#pfBar')).toContainText('backup from an earlier copy');
    await page.locator('#pfBar [data-pf="bar-x"]').click();
    await page.reload(); await page.waitForSelector('#rows .row', { state: 'attached' });
    await expect(page.locator('#pfBar')).toBeHidden();
  });
});

test('the browser is asked to keep the storage once the person saves something', async ({ page }) => {
  await page.addInitScript(() => { window.__persistAsked = 0; const proto = window.StorageManager && StorageManager.prototype; if (proto) { Object.defineProperty(proto, 'persist', { configurable: true, value: async () => { window.__persistAsked++; return true; } }); Object.defineProperty(proto, 'persisted', { configurable: true, value: async () => false }); } });
  await boot(page, { entries: settled });
  expect(await page.evaluate(() => window.__persistAsked)).toBe(0);
  await page.evaluate(() => PlatformUI.edit());
  await expect.poll(() => page.evaluate(() => window.__persistAsked)).toBe(1);
});

test.describe('install steps', () => {
  test.describe('iPhone', () => {
    test.use({ userAgent: IPHONE_UA });
    test('Safari: Share, then Add to Home Screen', async ({ page }) => {
      await boot(page, { entries: settled });
      await openSheet(page);
      await expect(page.locator('#pfInstall')).toContainText('Add to Home Screen');
      await expect(page.locator('#pfInstall li').first()).toContainText('Share');
    });
  });
  test('the downloaded file says to open the website, and does not look for updates', async ({ page }, testInfo) => {
    const file = testInfo.config.metadata.file;
    test.skip(!fs.existsSync(file), 'no file build');
    await seed(page, { ...BASE, ...SEEN });
    let asked = false; page.on('request', r => { if (/version\.json/.test(r.url())) asked = true; });
    await page.context().route(/^https?:\/\//, r => { asked = true; return r.abort(); });
    await page.goto('file://' + file);
    await page.waitForSelector('#rows .row', { state: 'attached' });
    await expect.poll(() => page.evaluate(() => !!window.PlatformUI)).toBeTruthy();
    await openSheet(page);
    await expect(page.locator('#pfWork')).toContainText('Saved on this device (file)');
    await expect(page.locator('#pfInstall')).toContainText('https://adityadeshpande21.github.io/ghoshnaad/');
    await expect(page.locator('#pfVersion')).toContainText('replace Ghoshnaad.html');
    await page.waitForTimeout(500);
    expect(asked).toBe(false);
  });
});
