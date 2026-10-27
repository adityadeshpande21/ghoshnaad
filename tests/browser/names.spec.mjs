// Names in the script of the language: a language that writes Gujarati letters (made up for the test: no Gujarati translation exists yet) must show
// rachana, raga and tala names in Gujarati, find them when typed in Gujarati, Devanagari or roman letters, and fall back to English for the guide.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DIST = path.join(ROOT, 'dist/Ghoshnaad.html');
const EN = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/en.json'), 'utf8'));
const LANG = { code: 'xg', name: 'ગુજરાતી (test)', script: 'Gujr', digits: 'latn', names: 'native', fallback: ['en'], fonts: 'sans-serif', status: 'hidden' };

async function start(browser) {
  const ctx = await browser.newContext(), page = await ctx.newPage();
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.goto('file://' + DIST);
  await page.waitForSelector('#rows .row', { state: 'attached' });
  // the language is added to the running app: its texts are English (the fallback), its names are written in Gujarati
  await page.evaluate(({ lang, en }) => { i18n.core.languages.push(lang); i18n.core.messages[lang.code] = {}; setLang(lang.code); }, { lang: LANG, en: EN });
  expect(await page.evaluate(() => i18n.LANG)).toBe('xg');
  return { ctx, page };
}

test.describe('names in another script', () => {
  test.skip(() => !fs.existsSync(DIST), 'no dist build');

  test('the list shows Gujarati names, with the roman name under them; Devanagari and roman typing still find a rachana', async ({ browser }) => {
    const { ctx, page } = await start(browser);
    const first = await page.evaluate(() => { const r = document.querySelector('#rows .row'); return { title: r.querySelector('.n b').textContent, sub: r.querySelector('.n i').textContent, meta: r.querySelector('.m').textContent }; });
    expect(first.title).toMatch(/^[઀-૿ ]+$/);          // only Gujarati letters
    expect(first.sub).toMatch(/^[A-Za-z .'-]+$/);                // the roman name under it
    expect(first.meta).toMatch(/[઀-૿]/);               // the tala in Gujarati
    const search = async text => { await page.fill('#q', text); return page.evaluate(() => [...document.querySelectorAll('#rows .row')].map(r => r.dataset.id)); };
    const all = (await search('')).length;
    expect(all).toBeGreaterThan(100);
    const gu = await search(first.title.split(' ')[0]);
    const dev = await search(await page.evaluate(() => { const r = LSV().LIST[0]; return r.dev; }));
    const rom = await search(first.sub.toLowerCase());
    expect(gu.length).toBeGreaterThan(0); expect(gu.length).toBeLessThan(all);
    expect(dev.length).toBeGreaterThan(0); expect(rom.length).toBeGreaterThan(0);
    const firstId = await page.evaluate(() => LSV().LIST[0].id);
    for (const hit of [gu, dev, rom]) expect(hit).toContain(firstId);
    await ctx.close();
  });

  test('the player and the tala page show names in Gujarati; the guide falls back to English', async ({ browser }) => {
    const { ctx, page } = await start(browser);
    await page.evaluate(() => openPiece('shriram', false));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.querySelector('#ptitle').textContent)).toMatch(/^[઀-૿ ]+$/);
    expect(await page.evaluate(() => document.querySelector('#psub').textContent)).toMatch(/[઀-૿]/);       // the tala
    await page.evaluate(() => { document.querySelector('#player').hidden = true; ScreenApp.get('tala').open(); });
    const talaNames = await page.evaluate(() => [...document.querySelector('#talaHost').shadowRoot.querySelectorAll('[data-t]')].map(b => b.textContent));
    expect(talaNames.length).toBe(7);
    for (const n of talaNames) expect(n).toMatch(/^[઀-૿]+$/);
    await page.evaluate(() => { ScreenApp.get('tala').close(); ScreenApp.get('guide').open(); });
    expect(await page.evaluate(() => document.querySelector('#gdT').textContent)).toBe('Notation guide');             // the English guide
    await ctx.close();
  });

  test('a person who types the name of a raga in Devanagari finds the rachanas of that raga, in the Marathi page as before', async ({ browser }) => {
    const ctx = await browser.newContext(), page = await ctx.newPage();
    await ctx.route(/^https?:\/\//, r => r.abort());
    await page.goto('file://' + DIST);
    await page.waitForSelector('#rows .row', { state: 'attached' });
    await page.fill('#q', 'भूप');
    expect(await page.evaluate(() => document.querySelectorAll('#rows .row').length)).toBeGreaterThan(0);
    await ctx.close();
  });
});
