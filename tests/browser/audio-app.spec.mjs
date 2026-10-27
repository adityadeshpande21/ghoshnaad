// Behaviour of the sound in the running app: interruptions, resume, iPhone unlock. v2 only (v1.1.0 had none of this).
import { test, expect } from '@playwright/test';

const isLegacy = (process.env.GHOSH_TARGET || 'legacy') === 'legacy';
test.skip(isLegacy, 'new in v2');

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function openAndPlay(page) {
  await page.goto('./');
  await expect(page.locator('#rows .row')).toHaveCount(120, { timeout: 20_000 });
  await page.locator('#rows .row[data-id="shriram"]').click();       // a tap: starts playing
  await expect(page.locator('#player')).toBeVisible();
  await expect.poll(() => page.locator('#tnow').textContent(), { timeout: 10_000 }).not.toBe('०:००');
}

test('an interrupted audio context pauses playback; tapping play resumes from the same place', async ({ page }) => {
  await openAndPlay(page);
  const playingLabel = await page.locator('#play').getAttribute('aria-label');
  await page.evaluate(() => ctx.suspend());                          // what a phone call or the lock screen does
  await expect.poll(() => page.locator('#play').getAttribute('aria-label')).not.toBe(playingLabel);
  const at = await page.locator('#tnow').textContent();
  await page.waitForTimeout(1200);
  expect(await page.locator('#tnow').textContent()).toBe(at);        // it did not run on without sound
  await page.locator('#play').click();                               // resume
  await expect.poll(() => page.locator('#play').getAttribute('aria-label')).toBe(playingLabel);
  await expect.poll(() => page.locator('#tnow').textContent(), { timeout: 8_000 }).not.toBe(at);
  expect(await page.evaluate(() => ctx.state)).toBe('running');
});

test('after an interruption the position is where it stopped, not the start', async ({ page }) => {
  await openAndPlay(page);
  await expect.poll(() => page.evaluate(() => TR.position()), { timeout: 10_000 }).toBeGreaterThan(2);
  await page.evaluate(() => ctx.suspend());
  await expect.poll(() => page.evaluate(() => S.playing)).toBe(false);
  const pos = await page.evaluate(() => S.pos);
  expect(pos).toBeGreaterThan(1.5);
  await page.locator('#play').click();
  await expect.poll(() => page.evaluate(() => S.playing)).toBe(true);
  const start = await page.evaluate(() => S.off);
  expect(Math.abs(start - pos)).toBeLessThan(0.05);                  // resumed from the interruption point
});

test.describe('iPhone', () => {
  test.use({ userAgent: IPHONE_UA });
  test('the first tap starts a silent audio element so the silent switch does not mute the app', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('#rows .row')).toHaveCount(120, { timeout: 20_000 });
    expect(await page.locator('audio').count()).toBe(0);              // nothing before the first tap
    await page.locator('#rows .row[data-id="shriram"]').click();
    await expect(page.locator('audio')).toHaveCount(1);
    expect(await page.locator('audio').getAttribute('src')).toMatch(/^blob:/);
  });
});

test.describe('other devices', () => {
  test('no hidden audio element (it could show lock-screen controls)', async ({ page }) => {
    await openAndPlay(page);
    expect(await page.locator('audio').count()).toBe(0);
  });
});

test.describe('घोषदंड संकेत page uses the same transport', () => {
  async function openFullCycle(page) {
    await page.goto('./');
    await expect(page.locator('#rows .row')).toHaveCount(120, { timeout: 20_000 });
    await page.evaluate(() => SanketUI.open());
    await page.locator('#sk button', { hasText: 'पूर्ण आवर्तन' }).first().click();
  }
  test('a full cycle plays, advances, pauses on interruption and resumes', async ({ page }) => {
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await openFullCycle(page);
    const pp = page.locator('#sk .sk-pp');
    await pp.click();                                                  // play
    await expect.poll(() => page.evaluate(() => SanketUI._E.playing)).toBe(true);
    await expect.poll(() => page.evaluate(() => SanketUI._E.items.length)).toBeGreaterThan(5);
    await page.waitForTimeout(1500);
    await expect.poll(() => page.evaluate(() => ctx.state)).toBe('running');
    await page.evaluate(() => ctx.suspend());
    await expect.poll(() => page.evaluate(() => SanketUI._E.playing)).toBe(false);
    const pos = await page.evaluate(() => SanketUI._E.pos);
    expect(pos).toBeGreaterThan(0.5);
    await pp.click();                                                  // resume
    await expect.poll(() => page.evaluate(() => SanketUI._E.playing)).toBe(true);
    expect(errors).toEqual([]);
  });
});
