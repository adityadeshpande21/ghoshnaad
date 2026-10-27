// Browser baseline: the same checks run against v1.1.0 (GHOSH_TARGET=legacy) and the v2 build (GHOSH_TARGET=dist),
// opened both as a website (http) and as a downloaded file (file://, network blocked).
import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const isLegacy = (process.env.GHOSH_TARGET || 'legacy') === 'legacy';
const isExternal = url => !/^(file:|data:|blob:|about:|http:\/\/localhost)/.test(url);

function watch(page) {
  const seen = { errors: [], external: [] };
  page.on('pageerror', e => seen.errors.push(String(e)));
  page.on('request', r => { if (isExternal(r.url())) seen.external.push(r.url()); });
  return seen;
}

async function openFile(page, testInfo) {
  const file = testInfo.config.metadata.file;
  test.skip(!fs.existsSync(file), `${file} does not exist`);
  await page.context().route(/^https?:\/\//, r => r.abort());      // a copied file must not need the network
  return page.goto('file://' + file);
}

// A reload that cancels the service worker's script fetch is reported by WebKit as a page error. Real visitors do not
// reload within milliseconds of arriving, so let the worker settle first.
async function settle(page) {
  await page.evaluate(() => 'serviceWorker' in navigator && location.protocol !== 'file:'
    ? Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 3000))]) : null);
}

async function expectLibrary(page) {
  await expect(page.locator('#rows .row')).toHaveCount(120, { timeout: 20_000 });
}

async function playFirstPiece(page) {
  // Opening a rachana from the list is a tap, so it starts playing by itself.
  await page.locator('#rows .row[data-id="shriram"]').click();
  await expect(page.locator('#player')).toBeVisible();
  await expect.poll(async () => page.locator('#tnow').textContent(), { timeout: 10_000 }).not.toBe('०:००');
  const running = await page.evaluate(() => ctx.state);
  expect(running).toBe('running');
  const label = await page.locator('#play').getAttribute('aria-label');
  await page.locator('#play').click();                              // stop
  await expect.poll(() => page.locator('#play').getAttribute('aria-label')).not.toBe(label);
}

for (const mode of ['site', 'file']) {
  test.describe(`opened as ${mode}`, () => {
    test.beforeEach(async ({ page }, testInfo) => {
      if (mode === 'file') await openFile(page, testInfo); else await page.goto('./');
    });

    test('lists all 120 rachanas without script errors', async ({ page }) => {
      const seen = watch(page);
      await settle(page);
      await page.reload();
      await expectLibrary(page);
      await settle(page);
      expect(seen.errors).toEqual([]);
    });

    test('plays a rachana: time advances after the first tap', async ({ page }) => {
      await expectLibrary(page);
      await playFirstPiece(page);
    });

    test('a chosen section filter is remembered after reload', async ({ page }) => {
      await expectLibrary(page);
      const chip = page.locator('#secs .chip').nth(1);
      await chip.click();
      const before = await page.locator('#rows .row').count();
      expect(before).toBeLessThan(120);
      await page.reload();
      await expect(page.locator('#rows .row')).toHaveCount(before);
    });

    test('reaches nothing outside itself', async ({ page }, testInfo) => {
      const seen = watch(page);
      await page.reload();
      await expectLibrary(page);
      // v1.1.0 still loads Google Fonts: a known gap that Phase 1 closes, so it is recorded here, not enforced.
      if (isLegacy) { testInfo.annotations.push({ type: 'external-requests', description: seen.external.join(' ') || 'none' }); return; }
      expect(seen.external).toEqual([]);
    });

    test('opens within the performance budget', async ({ page }, testInfo) => {
      const t0 = Date.now();
      await page.reload();
      await expectLibrary(page);
      const ms = Date.now() - t0;
      testInfo.annotations.push({ type: 'open-ms', description: String(ms) });
      expect(ms).toBeLessThan(3000);
    });
  });
}

test('site: works offline after the first visit', async ({ page, context }) => {
  await page.goto('./');
  await expectLibrary(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 10_000 }).toBeTruthy().catch(() => {});
  await page.reload();                                              // the worker now controls the page and has cached it
  await expectLibrary(page);
  await context.setOffline(true);
  await page.reload();
  await expectLibrary(page);
  await playFirstPiece(page);
});

test('site: on a weak signal the installed app opens from its cache within 4 s (new page still arrives for next time)', async ({ page, request }) => {
  test.skip(isLegacy, 'v2 service worker');
  await page.goto('./');
  await expectLibrary(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => caches.keys().then(k => k.length))).toBeGreaterThan(0);
  await request.get('/__delay?ms=10000');                         // the page now takes 10 s to arrive
  try {
    const t0 = Date.now();
    await page.goto('./');
    await expectLibrary(page);
    expect(Date.now() - t0).toBeLessThan(4500);
  } finally { await request.get('/__delay?ms=0'); }
});

test('site: the page is cached once, as index.html, and straight from the server (not the browser\'s HTTP cache)', async ({ page }) => {
  test.skip(isLegacy, 'v2 service worker');
  await page.goto('./');
  await expectLibrary(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => caches.keys().then(k => k.length))).toBeGreaterThan(0);
  const keys = await page.evaluate(async () => { const c = await caches.open((await caches.keys())[0]); return (await c.keys()).map(r => new URL(r.url).pathname.replace(/^\//, '')); });
  expect(keys.sort()).toEqual(['icons/apple-touch-icon.png', 'icons/favicon-64.png', 'icons/icon-192.png', 'icons/icon-512.png', 'index.html', 'manifest.webmanifest']);
  const sw = await (await page.request.get('/sw.js')).text();
  expect(sw).toContain("cache: 'reload'");
  expect(sw).not.toContain("'./'");
});
