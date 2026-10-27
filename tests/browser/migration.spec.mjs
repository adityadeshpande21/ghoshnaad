// A person's saved work from v1.1.0 must open unchanged in the new version, and stay unchanged until they edit it.
// The fixture was recorded from the released v1.1.0 app (tests/fixtures/make-v1-storage.mjs). Runs against both targets.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const FIXTURE = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../fixtures/v1.1.0-storage.json'), 'utf8')).entries;

async function openWithOldData(page, mode, testInfo) {
  await page.addInitScript(entries => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
  }, FIXTURE);
  if (mode === 'file') {
    const file = testInfo.config.metadata.file;
    test.skip(!fs.existsSync(file), 'no file build');
    await page.context().route(/^https?:\/\//, r => r.abort());
    await page.goto('file://' + file);
  } else await page.goto('./');
  await page.waitForSelector('#rows .row', { state: 'attached', timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => !!window.LIBROWS && !!window.Library), { timeout: 10_000 }).toBeTruthy();
}

for (const mode of ['site', 'file']) {
  test.describe(`v1.1.0 data, opened as ${mode}`, () => {
    test('settings are applied', async ({ page }, testInfo) => {
      await openWithOldData(page, mode, testInfo);
      const s = await page.evaluate(() => ({ lang: (typeof i18n !== 'undefined' ? i18n.LANG : LANG), theme: document.documentElement.dataset.theme, artic, kanMs, saKeys, htmlLang: document.documentElement.lang, xstyle: store.get('xstyle', null) }));
      expect(s).toMatchObject({ lang: 'hi', theme: 'dark', artic: 'nirantar', kanMs: 80, saKeys: { shankh: 9, vanshi: 7 }, xstyle: 'plain' });
    });

    test('both compositions are there, with their text intact', async ({ page }, testInfo) => {
      await openWithOldData(page, mode, testInfo);
      const names = await page.evaluate(() => ComposerUI.all().map(r => r.name));
      expect(names).toEqual(['माझी पहिली रचना', 'दुसरी — शंख']);
      const mine = JSON.parse(FIXTURE['ghosh.mine']);
      expect(await page.evaluate(() => ComposerUI.all())).toEqual(mine);
    });

    test('the corrected rachana is listed as corrected, with the person\'s text', async ({ page }, testInfo) => {
      await openWithOldData(page, mode, testInfo);
      // v1.1.0 lists a correction as its own row next to the book rachana
      const rows = await page.evaluate(() => (window.ScreenApp ? ScreenApp.get('list').LIST : LIST).filter(x => /श्रीराम/.test(x.dev)).map(r => ({ id: r.id, dev: r.dev, lib: r.lib || null })));
      expect(rows).toEqual([{ id: 'shriram', dev: 'श्रीराम', lib: null }, { id: 'f~shriram', dev: 'श्रीराम (दुरुस्त)', lib: 'pending' }]);
    });

    test('a corrected rachana opens and plays with the correction', async ({ page }, testInfo) => {
      await openWithOldData(page, mode, testInfo);
      await page.evaluate(() => openPiece('f~shriram', true));
      await expect(page.locator('#player')).toBeVisible();
      await expect(page.locator('#ptitle')).toContainText('दुरुस्त');
      await expect.poll(() => page.locator('#tnow').textContent(), { timeout: 10_000 }).not.toBe('०:००');
    });

    test('a composition plays', async ({ page }, testInfo) => {
      await openWithOldData(page, mode, testInfo);
      const ok = await page.evaluate(() => { const r = ComposerUI.all()[0]; const { piece, warnings } = GhoshCompile.compile3(Composer.toSource(r)); return !!piece && Object.keys(piece.parts).length > 0; });
      expect(ok).toBe(true);
    });

    test('nothing is rewritten just by opening and using the app', async ({ page }, testInfo) => {
      await openWithOldData(page, mode, testInfo);
      await page.evaluate(() => openPiece('bhoop', true));
      await page.waitForTimeout(1500);
      const now = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
      for (const k of ['ghosh.mine', 'ghosh.fix', 'ghosh.lang', 'ghosh.theme', 'ghosh.artic', 'ghosh.kanMs', 'ghosh.saKeys', 'ghosh.inst', 'ghosh.skView', 'ghosh.xstyle', 'ghosh.lib', 'ghosh.sec'])
        expect(now[k], k).toBe(FIXTURE[k]);
    });
  });
}
