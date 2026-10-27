// The tala timeline, merged into the app. It must draw what the standalone v1.1.0 page drew, sound the same, and behave well as a screen.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const STANDALONE = path.join(ROOT, 'legacy/tala-velresha.html');
const DIST = path.join(ROOT, 'dist/Ghoshnaad.html');
const SCRIPT = fs.readFileSync(path.join(ROOT, 'legacy/src/tala-velresha/tala.js'), 'utf8');
const isLegacy = (process.env.GHOSH_TARGET || 'legacy') === 'legacy';

test.describe('drawing', () => {
  test.skip(() => !fs.existsSync(DIST), 'no dist build');

  // every control the page has, in an order that exercises all of them
  const STEPS = ['[data-c="prachal"]', '[data-c="mand"]', '[data-c="sthir"]', '[data-c="all"]', '[data-t="khemta"]', '[data-t="khemta"]', '[data-l="tr"]', '[data-l="dhv"]', '[data-l="step"]',
    '[data-l="rep"]', '[data-l="rep"]', '[data-w="12"]', '[data-w="4"]', '[data-z="150"]', '[data-z="70"]', '[data-z="100"]', '[data-w="8"]', '[data-l="dhv"]', '[data-l="step"]',
    '[data-t="kerva"]', '[data-t="dadra"]', '[data-t="jhaptal"]', '[data-t="rupak"]', '[data-t="ektal"]', '[data-t="tritaal"]', '[data-t="kerva"]'];

  test('draws exactly what the standalone page drew, through every filter', async ({ browser }) => {
    const grab = async (file, inApp) => {
      const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } }), page = await ctx.newPage();
      await ctx.route(/^https?:\/\//, r => r.abort());
      // the standalone page states no encoding, which WebKit then guesses wrongly; give it the encoding the file really has
      if (inApp) await page.goto('file://' + file); else await page.setContent('<meta charset="utf-8">' + fs.readFileSync(file, 'utf8'));
      if (inApp) {
        await page.waitForSelector('#rows .row', { state: 'attached' });
        await expect.poll(() => page.evaluate(() => !!window.ScreenApp)).toBeTruthy();
        await page.evaluate(() => ScreenApp.get('tala').open());
      }
      const read = () => page.evaluate(inApp => {
        const r = inApp ? document.querySelector('#talaHost').shadowRoot : document;
        return { filters: r.getElementById('filters').innerHTML, legend: r.getElementById('legend').innerHTML, grid: r.getElementById('grid').innerHTML, cols: r.getElementById('grid').style.gridTemplateColumns };
      }, inApp);
      const out = [await read()];
      for (const sel of STEPS) {
        await page.evaluate(({ sel, inApp }) => { const r = inApp ? document.querySelector('#talaHost').shadowRoot : document; r.querySelector(sel).click(); }, { sel, inApp });
        out.push(await read());
      }
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(STANDALONE, false), await grab(DIST, true)];
    expect(now.length).toBe(STEPS.length + 1);
    now.forEach((s, i) => { expect(s.grid.length, `step ${i}`).toBeGreaterThan(100); expect(s, `step ${i} ${STEPS[i - 1] || 'start'}`).toEqual(was[i]); });
  });
});

test.describe('sound', () => {
  test.skip(() => !fs.existsSync(DIST), 'no dist build');
  test('the ठेका, ध्वंकार and footfall are the same sounds as the standalone page made', async ({ page }) => {
    await page.goto('file://' + DIST);
    await page.waitForSelector('#rows .row', { state: 'attached' });
    // the original recipe functions, cut out of the original script
    const recipes = SCRIPT.slice(SCRIPT.indexOf('/* ठेका'), SCRIPT.indexOf('function stopPlay'));
    expect(recipes).toContain('function tick');
    const res = await page.evaluate(async recipes => {
      const seed = n => { let a = n >>> 0; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
      const rows = [{ gans: [[3, 3], [3, 3]], dhv: [1, 4, 7, 10], mps: 3, laya: 360 }, { gans: [[2, 3], [2, 3]], dhv: [1, 3, 6, 8], mps: 0, laya: 120 }, { gans: [[1, 1], [1, 1]], dhv: [1, 2, 3, 4], mps: 1, laya: 120 }];
      const plan = (sched, row) => { const N = row.gans.flat().reduce((a, b) => a + b, 0), md = 60 / row.laya; for (let i = 0; i < N * 2; i++) sched(i * md, i % N + 1, i, N, row); };
      const SR = 44100, secs = 8;
      // reference: the original functions on their own context
      seed(3); const eng0 = new GhoshAudio.AudioEngine({ settings: () => ({ saKeys: {}, artic: 'santar', kanMs: 60 }) });
      const noise0 = (() => { const b = new OfflineAudioContext(1, SR * .3, SR).createBuffer(1, SR * .3, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return d; })();
      const ref = async () => {
        const out = [];
        for (const row of rows) {
          const ctx = new OfflineAudioContext(1, SR * secs, SR), noise = ctx.createBuffer(1, SR * .3, SR); noise.getChannelData(0).set(noise0);
          const fns = new Function('ctx', 'noise', recipes + '; return { tick, levelOf, panav, foot };')(ctx, noise);
          plan((tc, k, i, N, r) => { const at = .1 + tc; if (r.dhv.includes(k)) fns.panav(at, k === 1); if (r.mps && (i % N) % r.mps === 0) fns.foot(at); fns.tick(at, fns.levelOf(r, k)); }, row);
          out.push((await ctx.startRendering()).getChannelData(0).slice());
        }
        return out;
      };
      const sub = async () => {
        const out = [];
        for (const row of rows) {
          seed(3);
          const ctx = new OfflineAudioContext(1, SR * secs, SR), noise = ctx.createBuffer(1, SR * .3, SR), d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          const rig = { c: ctx, noise };
          plan((tc, k, i, N, r) => { const at = .1 + tc; if (r.dhv.includes(k)) GhoshAudio.talaPanav(rig, at, k === 1, ctx.destination); if (r.mps && (i % N) % r.mps === 0) GhoshAudio.talaFoot(rig, at, ctx.destination); GhoshAudio.talaTick(rig, at, GhoshAudio.talaLevelOf(r.gans, k), ctx.destination); }, row);
          out.push((await ctx.startRendering()).getChannelData(0).slice());
        }
        return out;
      };
      const a = await ref(), b = await sub();
      return a.map((x, n) => { let max = 0, e = 0; for (let i = 0; i < x.length; i++) { max = Math.max(max, Math.abs(x[i] - b[n][i])); e += x[i] * x[i]; } return { max, rms: Math.sqrt(e / x.length) }; });
    }, recipes);
    for (const r of res) { expect(r.rms).toBeGreaterThan(0.001); expect(r.max).toBeLessThan(1e-6); }
  });
});

test.describe('as a screen', () => {
  test.skip(() => isLegacy, 'v2 structure');
  const open = async (page, store = {}) => {
    await page.addInitScript(s => { if (sessionStorage.s) return; sessionStorage.s = 1; localStorage['ghosh.lang'] = '"en"'; localStorage['ghosh.installSeen'] = '1'; for (const [k, v] of Object.entries(s)) localStorage[k] = v; }, store);
    await page.goto('./'); await page.waitForSelector('#rows .row', { state: 'attached' });
    await expect.poll(() => page.evaluate(() => !!window.ScreenApp)).toBeTruthy();
  };
  const sh = page => page.locator('#talaHost');

  test('opens from the settings sheet, closes with the back button and with Escape', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { renderSheet(); $('#sheet').hidden = false; });
    await expect(page.locator('#sheet [data-talaopen]')).toContainText('Tala timeline');
    await page.locator('#sheet [data-talaopen]').click();
    await expect(page.locator('#tala')).toBeVisible();
    await expect(page.locator('#sheet')).toBeHidden();
    await expect(page.locator('#talaHost .wrap')).toBeVisible();                 // the page is drawn (shadow DOM is pierced by locators)
    await page.locator('#talaBack').click();
    await expect(page.locator('#tala')).toBeHidden();
    await page.evaluate(() => ScreenApp.get('tala').open());
    await page.keyboard.press('Escape');
    await expect(page.locator('#tala')).toBeHidden();
  });

  test('its styles do not leak into the app, and the app\'s do not reach in', async ({ page }) => {
    await open(page);
    const before = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.brand')); return [c.color, getComputedStyle(document.body).backgroundColor, getComputedStyle(document.documentElement).getPropertyValue('--bg')]; });
    await page.evaluate(() => ScreenApp.get('tala').open());
    await page.locator('#talaBack').click();
    const after = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.brand')); return [c.color, getComputedStyle(document.body).backgroundColor, getComputedStyle(document.documentElement).getPropertyValue('--bg')]; });
    expect(after).toEqual(before);
    await page.evaluate(() => ScreenApp.get('tala').open());
    // the page's own .row, .chips and .empty are not styled by the app's rules of the same names
    const rowDisplay = await page.evaluate(() => getComputedStyle(document.querySelector('#talaHost').shadowRoot.querySelector('.row')).display);
    expect(rowDisplay).toBe('contents');
  });

  test('playing a ताल: the playhead and the count move, the sound runs, a second tap stops it', async ({ page }) => {
    await open(page);
    await page.evaluate(() => ScreenApp.get('tala').open());
    const btn = page.locator('#talaHost [data-play]').first();
    await btn.click();
    await expect(page.locator('#talaHost .cell.playing')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => ctx.state)).toBe('running');
    await expect.poll(() => page.locator('#talaHost .now').first().textContent(), { timeout: 5000 }).not.toBe('');
    await expect.poll(() => page.evaluate(() => parseFloat(document.querySelector('#talaHost').shadowRoot.querySelector('.cell.playing .ph').style.left))).toBeGreaterThan(0);
    await btn.click();
    await expect(page.locator('#talaHost .cell.playing')).toHaveCount(0);
  });

  test('closing, another sound starting, or an interrupted audio context stops it', async ({ page }) => {
    await open(page);
    const playing = () => page.evaluate(() => ScreenApp.get('tala').page.isPlaying());
    await page.evaluate(() => ScreenApp.get('tala').open());
    for (const stop of [() => page.locator('#talaBack').click(), () => page.evaluate(() => announce()), () => page.evaluate(() => ctx.suspend())]) {
      await page.evaluate(() => { if (ScreenApp.get('tala').root.hidden) ScreenApp.get('tala').open(); ctx && ctx.state === 'suspended' && ctx.resume(); });
      await page.locator('#talaHost [data-play]').first().click();
      await expect.poll(playing).toBe(true);
      await stop();
      await expect.poll(playing).toBe(false);
    }
  });

  test('the person\'s choices are kept under the same key as the standalone page used (tala.v3) and restored', async ({ page }) => {
    await open(page, { 'tala.v3': JSON.stringify({ chal: 'mand', win: 12, snd: { num: false } }) });
    await page.evaluate(() => ScreenApp.get('tala').open());
    await expect(page.locator('#talaHost [data-c="mand"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#talaHost [data-w="12"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#talaHost [data-z="150"]').click();
    const saved = JSON.parse(await page.evaluate(() => localStorage['tala.v3']));
    expect(saved).toMatchObject({ chal: 'mand', win: 12, pps: 150 });
    expect(saved.snd.num).toBe(false);
  });

  test('the light / dark choice of the app reaches the page', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; ScreenApp.get('tala').open(); });
    await expect.poll(() => page.evaluate(() => document.querySelector('#talaHost').shadowRoot.querySelector('.tl').hasAttribute('data-dark'))).toBe(true);
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
    await expect.poll(() => page.evaluate(() => document.querySelector('#talaHost').shadowRoot.querySelector('.tl').hasAttribute('data-dark'))).toBe(false);
  });
});
