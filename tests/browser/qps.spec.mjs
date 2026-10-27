// The whole app in a pseudo-language (every message in [brackets] and 40 % longer), 360 px wide.
// Text on a screen without brackets is written into the code instead of the translation files; text that no longer fits is a layout that only suits short words.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pseudoMessages, PSEUDO_LANGUAGE } from '../support/pseudo.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DIST = path.join(ROOT, 'dist/Ghoshnaad.html');
const EN = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/en.json'), 'utf8'));
const ENTRIES = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/v1.1.0-storage.json'), 'utf8')).entries;

// What is allowed to show without brackets: names that come from the data (rachanas, ragas, talas, instruments), notation, version numbers,
// the names of languages (each in its own script), the long content of src/content (the guide, the घोषदंड signal words: whole files, not messages),
// the export sheet (the rachana itself) and the release notes (they come from release.json, with the next version).
const DATA = [
  // names from the data: rachanas, ragas, talas, instruments, the person's own compositions
  '.row .t .n', '#recent', '#ptitle', '#mtitle', '#cTitle', '#cSub', '#cchkSub', '#cTala', '[data-i]', '#pchips', '[data-open] b', '.cname',
  '.tl .who b', '.tl [data-t]', '.tl svg[role=img]',      // (inside the tala page's shadow root, where `closest` stops at the root)
  // notation and the version
  '.gd-n', '.gd-t', '.lab-chips', '.lab-keys', '.lab-kb', '.sheet', '.num', '.ver', '#appVer', '#pfVersion', '#langs',
  // long content from src/content, and release notes
  '.sk-sig', '.sk-cap', '.sk-rules', '#gdBody', '#gdToc', '#gdT', '#pfNew',
];

/** In the page: the visible text and attributes without brackets, and the elements that cut their text off. */
const SCAN = ([ignore, pitchSource]) => {
  const pitch = new RegExp(pitchSource);
  const letters = /\p{L}/u, inline = new Set(['B', 'CODE', 'I', 'EM', 'STRONG', 'SMALL']);
  const out = { hard: [], clipped: [], pageWidth: document.documentElement.scrollWidth, viewport: innerWidth };
  const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const where = el => { const p = []; for (let e = el; e && p.length < 4; e = e.parentElement) p.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : '')); return p.join(' < '); };
  const bracketed = s => s.includes('[') || s.includes(']');
  const walk = root => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) walk(el.shadowRoot);
      if (!visible(el) || ['SCRIPT', 'STYLE', 'OPTION', 'TITLE'].includes(el.tagName) || el.closest('svg') && el.tagName !== 'svg' && !el.closest('#talaHost')) continue;
      const skip = ignore.some(s => { try { return el.closest(s); } catch { return false; } });
      let own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean);
      if (!skip) {
        let box = el; while (inline.has(box.tagName) && box.parentElement) box = box.parentElement;
        const boxText = [...box.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
        for (const t of own) if (letters.test(t) && !bracketed(t) && !bracketed(boxText) && !pitch.test(t) && [...new Intl.Segmenter().segment(t)].length > 2) out.hard.push(`${JSON.stringify(t.slice(0, 50))}  ${where(el)}`);
        for (const a of ['aria-label', 'placeholder', 'title']) { const v = el.getAttribute(a); if (v && letters.test(v) && !bracketed(v) && [...new Intl.Segmenter().segment(v)].length > 2) out.hard.push(`${a}=${JSON.stringify(v.slice(0, 50))}  ${where(el)}`); }
      }
      if (own.some(t => letters.test(t))) {
        const cs = getComputedStyle(el);
        const cut = (over, scroll, client) => ['hidden', 'clip'].includes(over) && scroll > client + 1;
        if ((cut(cs.overflowX, el.scrollWidth, el.clientWidth) && cs.textOverflow !== 'ellipsis') || (cut(cs.overflowY, el.scrollHeight - 2, el.clientHeight) && cs.whiteSpace !== 'nowrap' && el.clientHeight > 0)) out.clipped.push(`${JSON.stringify(own[0].slice(0, 40))}  ${where(el)}`);
      }
    }
  };
  walk(document);
  return out;
};

async function start(browser) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } }), page = await ctx.newPage();
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.addInitScript(e => { if (sessionStorage.seeded) return; sessionStorage.seeded = 1; for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v); }, ENTRIES);
  await page.goto('file://' + DIST);
  await page.waitForSelector('#rows .row', { state: 'attached' });
  await expect.poll(() => page.evaluate(() => !!window.ComposerUI && !!window.Library && !!window.FixerUI && !!window.Swarlipi)).toBeTruthy();
  // the pseudo-language is added to the running app: it is test data, not a product language
  await page.evaluate(({ lang, msgs }) => { i18n.core.languages.push(lang); i18n.core.messages[lang.code] = msgs; setLang(lang.code); }, { lang: PSEUDO_LANGUAGE, msgs: pseudoMessages(EN) });
  expect(await page.evaluate(() => i18n.LANG)).toBe('qps');
  return { ctx, page };
}
// the tests read text; a click is made in the page, so a bar covering a button at 360 px does not stop them
const click = (page, sel) => page.evaluate(s => document.querySelector(s).click(), sel);
const scan = (page) => page.evaluate(SCAN, [DATA, PITCH.source]);
const problems = [];
const PITCH = /^[A-G][♯♭]?\d?$/;                   // names of pitches: C, E♭, G4 — the same in every language

async function check(page, what) {
  if (process.env.QPS_TRACE) console.log('  …', what);
  const r = await scan(page);
  for (const h of [...new Set(r.hard)]) problems.push(`${what}: not translated: ${h}`);
  for (const c of r.clipped) problems.push(`${what}: text cut off: ${c}`);
  if (r.pageWidth > r.viewport + 1) problems.push(`${what}: the page is ${r.pageWidth}px wide in a ${r.viewport}px window`);
}

test.describe('pseudo-language at 360 px', () => {
  test.skip(() => !fs.existsSync(DIST), 'no dist build');
  test.setTimeout(120_000);

  test('the screens show only translated text and nothing is cut off', async ({ browser }) => {
    const { ctx, page } = await start(browser);
    problems.length = 0;
    await check(page, 'list');
    await click(page, '#instBtn2'); await check(page, 'settings sheet'); await page.evaluate(() => { document.querySelector('#sheet').hidden = true; });
    await page.evaluate(() => openPiece('shriram', false)); await page.waitForTimeout(300); await check(page, 'player');
    await click(page, '#instBtn'); await check(page, 'player settings'); await page.evaluate(() => { document.querySelector('#sheet').hidden = true; });
    await page.evaluate(() => { document.querySelector('#player').hidden = true; });
    await page.evaluate(() => { store.set('lib', 'mine'); ComposerUI.init(); }); await check(page, 'composer list');
    await click(page, '#mNew'); await page.waitForTimeout(300); await check(page, 'composer new');
    await click(page, '#cnewBack');
    await click(page, '#mineWrap [data-open]'); await page.waitForTimeout(300); await check(page, 'composer editor');
    await click(page, '#cCheckBtn'); await page.waitForTimeout(300); await check(page, 'composer checks');
    await page.evaluate(async () => { await FixerUI.open('shriram'); }); await check(page, 'correction');
    await page.evaluate(async () => { document.querySelector('#fixer').hidden = true; const p = await loadJSON('data/r/shriram.json'); Swarlipi.open(p); }); await check(page, 'export');
    await ctx.close();
    if (process.env.QPS_DUMP) fs.appendFileSync(process.env.QPS_DUMP, [...new Set(problems)].join('\n') + '\n');
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('sound check, घोषदंड, tala and the guide', async ({ browser }) => {
    const { ctx, page } = await start(browser);
    problems.length = 0;
    await page.evaluate(() => ScreenApp.get('soundcheck').open());
    for (let i = 0; i < 5; i++) { await click(page, `[data-ltab="${i}"]`); await check(page, `sound check tab ${i}`); }
    await page.evaluate(() => { ScreenApp.get('soundcheck').close(); SanketUI.open(); }); await page.waitForTimeout(300); await check(page, 'ghoshdand learn');
    await click(page, '[data-sktab="1"]'); await page.waitForTimeout(500); await check(page, 'ghoshdand cycle');
    await page.evaluate(() => { SanketUI.close(); ScreenApp.get('tala').open(); }); await page.waitForTimeout(300); await check(page, 'tala');
    await page.evaluate(() => { ScreenApp.get('tala').close(); ScreenApp.get('guide').open(); }); await check(page, 'guide');
    await ctx.close();
    if (process.env.QPS_DUMP) fs.appendFileSync(process.env.QPS_DUMP, [...new Set(problems)].join('\n') + '\n');
    expect(problems, problems.join('\n')).toEqual([]);
  });
});
