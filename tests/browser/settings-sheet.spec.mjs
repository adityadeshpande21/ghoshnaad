// The settings sheet (gear): instruments, पट्टी, सांतर / निरंतर, कण स्वर, language. v2 only (the same buttons existed in v1.1.0; the values they save are compared with it
// in migration.spec.mjs: the storage keys are v1.1.0's).
import { test, expect } from '@playwright/test';

const isLegacy = (process.env.GHOSH_TARGET || 'legacy') === 'legacy';
test.skip(isLegacy, 'new in v2');

async function open(page) {
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); localStorage.setItem('ghosh.lang', '"en"'); localStorage.setItem('ghosh.installSeen', '1'); localStorage.setItem('ghosh.seenVersion', '"x"'); });
  await page.goto('./');
  await page.waitForSelector('#rows .row', { state: 'attached', timeout: 20_000 });
  await page.locator('#instBtn2').click();
  await expect(page.locator('#sheet')).toBeVisible();
}
const stored = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem('ghosh.' + k)), key);
const pressed = (page, sel) => page.locator(sel).getAttribute('aria-pressed');

test('instruments: a melody part keeps at least one, the choice is saved, and drums may all be off', async ({ page }) => {
  await open(page);
  await expect(page.locator('[data-g="shankh"][data-i="bugle"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-g="shankh"][data-i="bugle"]').click();                       // the only one: refused
  await expect(page.locator('[data-g="shankh"][data-i="bugle"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await stored(page, 'inst')).toBeNull();                                          // nothing was saved for a refused change
  await page.locator('[data-g="shankh"][data-i="trumpet"]').click();                      // add one
  expect((await stored(page, 'inst')).shankh).toEqual(['bugle', 'trumpet']);
  await page.locator('[data-g="shankh"][data-i="bugle"]').click();                        // now the bugle may go
  expect((await stored(page, 'inst')).shankh).toEqual(['trumpet']);
  await page.locator('[data-g="anak"][data-i="side"]').click();                           // a drum can be switched off altogether
  expect((await stored(page, 'inst')).anak).toEqual([]);
  await page.reload(); await page.waitForSelector('#rows .row', { state: 'attached' }); await page.locator('#instBtn2').click();
  await expect(page.locator('[data-g="shankh"][data-i="trumpet"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-g="anak"][data-i="side"]')).toHaveAttribute('aria-pressed', 'false');
});

test('पट्टी, सांतर / निरंतर and कण स्वर are saved under the keys v1.1.0 used and shown as chosen', async ({ page }) => {
  await open(page);
  await page.locator('[data-sa="vanshi:8"]').click();
  expect((await stored(page, 'saKeys')).vanshi).toBe(8);
  expect(await pressed(page, '[data-sa="vanshi:8"]')).toBe('true'); expect(await pressed(page, '[data-sa="vanshi:6"]')).toBe('false');
  await page.locator('[data-art="nirantar"]').click();
  expect(await stored(page, 'artic')).toBe('nirantar'); expect(await pressed(page, '[data-art="nirantar"]')).toBe('true');
  await page.locator('[data-kan="100"]').click();
  expect(await stored(page, 'kanMs')).toBe(100); expect(await pressed(page, '[data-kan="100"]')).toBe('true');
  // the engine reads the same values
  expect(await page.evaluate(() => [AppEnv.settings.artic, AppEnv.settings.kanMs, AppEnv.settings.saKeys.vanshi])).toEqual(['nirantar', 100, 8]);
  await page.reload(); await page.waitForSelector('#rows .row', { state: 'attached' }); await page.locator('#instBtn2').click();
  expect(await pressed(page, '[data-art="nirantar"]')).toBe('true'); expect(await pressed(page, '[data-sa="vanshi:8"]')).toBe('true');
});

test('the language buttons switch the language of the page; the sheet closes with its button, the backdrop and Escape', async ({ page }) => {
  await open(page);
  await page.locator('.lang[data-lang="hi"]').click();
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('hi'); expect(await stored(page, 'lang')).toBe('hi');
  await expect(page.locator('.lang[data-lang="hi"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#sheetX').click(); await expect(page.locator('#sheet')).toBeHidden();
  await page.locator('#instBtn2').click(); await expect(page.locator('#sheet')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#sheet')).toBeHidden();
  await page.locator('#instBtn2').click();
  await page.evaluate(() => document.querySelector('#sheet').click());                 // a click on the backdrop itself
  await expect(page.locator('#sheet')).toBeHidden();
});
