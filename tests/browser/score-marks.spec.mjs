// E1: the marks of the score must not collide on a phone. The detector (tests/support/score-marks.mjs) models every mark as a box and reports pairs
// that overlap; this spec runs it over the score at common phone widths. Layout rules (src/app/app.css, "marks of the score") keep each kind of mark in a band
// of its own; a change that breaks one shows up here, with the rachana, the width and the pair of marks.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { scanMarks } from '../support/score-marks.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DIST = path.join(ROOT, 'dist/Ghoshnaad.html');
const WIDTHS = [360, 390, 430];
// rachanas that use every mark: slurs across bar lines, komal with मंद, accents with तार, endings, grace notes, groups
const DENSE = ['ganesh', 'aruni', 'shriram', 'trihut', 'parijatam', 'vandemataram', 'uday', 'deepnirvan-suchana'];
const SCAN = `(${scanMarks.toString()})({ selector: '#score .pr:not(.tal)' })`;

async function open(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 } }), page = await ctx.newPage();
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.goto('file://' + DIST);
  await page.waitForSelector('#rows .row', { state: 'attached' });
  return { ctx, page };
}
const describe = hits => { const by = {}; for (const h of hits) { const k = `${h.kind}: ${h.what}`; by[k] = (by[k] || 0) + 1; } return Object.entries(by).map(([k, n]) => `${n} × ${k}`).join('; '); };

test.describe('marks of the score at phone widths', () => {
  test.skip(() => !fs.existsSync(DIST), 'no dist build');
  test.setTimeout(120_000);

  test('the dense rachanas have no colliding marks at 360, 390 and 430 px', async ({ browser }) => {
    const bad = [];
    for (const w of WIDTHS) {
      const { ctx, page } = await open(browser, w);
      for (const id of DENSE) {
        await page.evaluate(i => openPiece(i, false), id); await page.waitForTimeout(150);
        const hits = await page.evaluate(SCAN);
        if (hits.length) bad.push(`${id} at ${w}px: ${describe(hits)}`);
      }
      await ctx.close();
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  test('every rachana of the book at 360 px (Chromium: the slowest, the narrowest)', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'the geometry is the same in every engine; one engine is enough for all 120');
    const { ctx, page } = await open(browser, 360);
    const ids = await page.evaluate(() => loadJSON('data/index.json').then(i => i.map(r => r.id)));
    expect(ids.length).toBe(120);
    const bad = []; let smallest = 99;
    for (const id of ids) {
      await page.evaluate(i => openPiece(i, false), id); await page.waitForTimeout(60);
      const r = await page.evaluate(`(() => ({ hits: ${SCAN}, min: Math.min(...[...document.querySelectorAll('#score .pr.lead,#score .pr.sec')].map(r => parseFloat(getComputedStyle(r).fontSize))) }))()`);
      if (r.hits.length) bad.push(`${id}: ${describe(r.hits)}`);
      smallest = Math.min(smallest, r.min);
    }
    await ctx.close();
    expect(bad, bad.join('\n')).toEqual([]);
    expect(smallest, 'a row was shrunk below 10px').toBeGreaterThanOrEqual(10);       // the floor today; the wish is to raise it (a row that wraps at a गण boundary instead)
  });

  test('the detector is not blind: the old rules, put back on a made-up row, collide', async ({ browser }) => {
    const { ctx, page } = await open(browser, 360);
    const row = `<div class="pr r-vanshi lead" id="probe" style="font-size:13px"><div class="g ve ve0"><span class="end">१</span><span class="gat">
      <span class="mt grp"><span class="s vk dot-b">नि</span><span class="s dot-b">प</span></span>
      <span class="mt"><span class="s dot-t sls"><span class="ac">^</span>स</span><span class="s sle">ग</span></span></span></div></div>`;
    await page.evaluate(h => { const d = document.createElement('div'); d.id = 'probeRoot'; d.innerHTML = h; document.body.prepend(d); Object.assign(d.style, { position: 'fixed', top: '0', left: '0', width: '360px', background: '#fff', zIndex: 99999 }); }, row);
    const scan = `(${scanMarks.toString()})({ selector: '#probeRoot .pr' })`;
    expect(await page.evaluate(scan), 'the band rules should keep these apart').toEqual([]);
    // v1.1.0's rules: dots and accents at fixed offsets, a 3px bracket, no reserved bands
    await page.addStyleTag({ content: `#probeRoot .pr .s{padding-top:0!important}#probeRoot .pr .s.dot-t::before{top:-2px!important}#probeRoot .pr .s .ac{top:-.75em!important}
      #probeRoot .pr .s.dot-b::after,#probeRoot .pr .s.vk.dot-b::after{bottom:-3px!important}#probeRoot .pr .mt{padding-bottom:3px!important}#probeRoot .pr .g{padding-top:6px!important}` });
    const kinds = new Set((await page.evaluate(scan)).map(h => h.what));
    expect([...kinds].join('; ')).toMatch(/dot-bottom × bracket/);
    expect([...kinds].join('; ')).toMatch(/dot-top × slur/);
    await ctx.close();
  });
});
