// Screens migrated to the Screen / App structure. Each must draw exactly what the v1.1.0 page drew, and behave the same.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { stripI18n } from '../support/strip-i18n.mjs';
import { I18n } from '../../src/i18n/i18n.ts';
import { legacyTables } from '../support/legacy-tables.ts';
import { buildPack } from '../../build/lib/pack.mjs';
import { loadCorrections } from '../golden/lib.mjs';
import { undoMarkCells } from '../support/legacy-marks.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const LEGACY = path.join(ROOT, 'legacy/v1.1.0/Ghoshnaad.html');
const DIST = path.join(ROOT, 'dist/Ghoshnaad.html');
const LANGS = ['mr', 'hi', 'en'];
// The drawing code is what these tests compare, so both pages must draw the same data. The rachanas whose notation was corrected after v1.1.0
// (tests/fixtures/book-corrections.json) are therefore handed to both pages as the current compiled piece, instead of each page's own copy.
const CORRECTED = (() => {
  const ids = new Set(loadCorrections().map(c => c.id)), pack = buildPack(ROOT, { stamp: '2026-01-01T00:00:00.000Z' }).pack;
  return Object.fromEntries([...ids].map(id => [id, pack[`data/r/${id}.json`]]));
})();

async function openFile(page, file) {
  await page.context().route(/^https?:\/\//, r => r.abort());
  await page.goto('file://' + file);
  await page.waitForSelector('#rows .row', { state: 'attached' });
}

test.describe('composer screens', () => {
  test('draw what v1.1.0 drew: the list, the new-rachana form, the editor and the checks, in every language', async ({ browser }) => {
    test.skip(!fs.existsSync(DIST), 'no dist build');
    const entries = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/v1.1.0-storage.json'), 'utf8')).entries;
    const grab = async file => {
      const ctx = await browser.newContext(), page = await ctx.newPage();
      await ctx.route(/^https?:\/\//, r => r.abort());
      await page.addInitScript(e => { if (sessionStorage.seeded) return; sessionStorage.seeded = 1; for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v); }, entries);
      await page.goto('file://' + file);
      await page.waitForSelector('#rows .row', { state: 'attached' });
      await expect.poll(() => page.evaluate(() => !!window.ComposerUI && !!window.Library)).toBeTruthy();
      const out = {};
      for (const l of LANGS) {
        await page.evaluate(lang => { setLang(lang); store.set('lib', 'mine'); ComposerUI.init(); }, l);
        out[`${l}/list`] = await page.evaluate(() => ({ mine: document.querySelector('#mineWrap').innerHTML, tabs: document.querySelector('#libbar').innerHTML }));
      }
      await page.locator('#mineWrap [data-open]').first().click();
      await page.waitForTimeout(300);
      for (const l of LANGS) {
        await page.evaluate(lang => setLang(lang), l);
        out[`${l}/editor`] = await page.evaluate(() => document.querySelector('#ceditor').innerHTML);
      }
      await page.locator('#cCheckBtn').click();
      await page.waitForTimeout(300);
      for (const l of LANGS) {
        await page.evaluate(lang => setLang(lang), l);
        out[`${l}/check`] = await page.evaluate(() => document.querySelector('#ccheck').innerHTML);
      }
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(LEGACY), await grab(DIST)].map(stripI18n);
    for (const k of Object.keys(was)) { expect(JSON.stringify(now[k]).length, k).toBeGreaterThan(300); expect(now[k], k).toEqual(was[k]); }
  });
});

test.describe('composer behaviour', () => {
  test.skip(() => (process.env.GHOSH_TARGET || 'legacy') === 'legacy', 'v2 structure');
  test('create a rachana, it is saved and counted as an edit; open it, check it, play it as a whole', async ({ page }) => {
    await page.addInitScript(() => { if (!sessionStorage.s) { sessionStorage.s = 1; localStorage['ghosh.lang'] = '"en"'; localStorage['ghosh.lib'] = '"mine"'; localStorage['ghosh.installSeen'] = '1'; } });
    await page.goto('./'); await page.waitForSelector('#rows .row', { state: 'attached' });
    await expect.poll(() => page.evaluate(() => !!window.ComposerUI)).toBeTruthy();
    await page.locator('#mNew').click();
    await page.locator('#cName').fill('Test rachana');
    await page.locator('#cStart').click();
    await expect(page.locator('#ceditor')).toBeVisible();
    await expect.poll(() => page.evaluate(() => (JSON.parse(localStorage['ghosh.mine'] || '[]')[0] || {}).name)).toBe('Test rachana');
    expect(await page.evaluate(() => PlatformUI._guard.state().edits)).toBeGreaterThan(0);        // counted for the backup reminder
    expect(await page.evaluate(() => ComposerUI.unsaved())).toBe(false);
    await page.locator('#cCheckBtn').click();
    await expect(page.locator('#ccheck')).toBeVisible();
    await page.locator('#cchkBack').click();
    // fill the first line from text and play the whole rachana
    await page.evaluate(() => { const r = ComposerUI.all()[0]; const row = Composer.parseLineText('स री | ग म | प ध | नि स\'', r.tala).row; r.blocks[0].lines[0].mel = row; });
    await page.locator('#cPlayAll').click();
    await expect.poll(() => page.evaluate(() => S.playing), { timeout: 8000 }).toBe(true);
  });
});

test.describe('export screen', () => {
  test('draws exactly what the v1.1.0 export drew (sheet, text, every layout), for rachanas of every tala, in every language', async ({ browser }) => {
    test.skip(!fs.existsSync(DIST), 'no dist build');
    const grab = async file => {
      const ctx = await browser.newContext(), page = await ctx.newPage();
      await openFile(page, file);
      const out = await page.evaluate(async ({ langs, corrected, undo }) => {
        const old = eval('(' + undo + ')');
        const idx = await loadJSON('data/index.json'), res = {}, seen = new Set();
        const picks = idx.filter(r => { const k = r.talas.join() + r.parts.join(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
        for (const l of langs) {
          setLang(l);
          for (const r of picks) {
            const piece = corrected[r.id] ?? await loadJSON('data/r/' + r.id + '.json');
            for (const [st, lay] of [['rich', 'score'], ['plain', 'pages']]) {
              store.set('xstyle', st); store.set('xlay', lay);
              Swarlipi.open(piece);
              const keys = Object.keys(piece.parts).filter(k => ['shankh', 'vanshi', 'anak'].includes(k));
              res[`${l}/${r.id}/${st}/${lay}`] = { dom: old(document.querySelector('#xexport').innerHTML), sheet: old(Swarlipi.sheet(piece, keys)), text: Swarlipi.text(piece, keys) };
            }
          }
        }
        return res;
      }, { langs: LANGS, corrected: CORRECTED, undo: undoMarkCells.toString() });
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(LEGACY), await grab(DIST)].map(stripI18n);
    const keys = Object.keys(was);
    expect(keys.length).toBeGreaterThan(40);
    for (const k of keys) { expect(now[k].text.length, k).toBeGreaterThan(50); expect(now[k], k).toEqual(was[k]); }
  });
});

test.describe('busy', () => {
  test.skip(() => (process.env.GHOSH_TARGET || 'legacy') === 'legacy', 'v2 structure');
  test('the App says busy while the player, tala page, Ghoshdand page or sound check plays, and not otherwise', async ({ page }) => {
    await page.goto('./'); await page.waitForSelector('#rows .row', { state: 'attached' });
    await expect.poll(() => page.evaluate(() => !!window.ScreenApp)).toBeTruthy();
    const busy = () => page.evaluate(() => ScreenApp.isBusy());
    expect(await busy()).toBe(false);
    // player
    await page.evaluate(() => openPiece('shriram', true));
    await expect.poll(busy).toBe(true);
    await page.evaluate(() => stop());
    await expect.poll(busy).toBe(false);
    await page.locator('#back').click();                                   // back to the list, so later screens are not under the player
    // tala page
    await page.evaluate(() => ScreenApp.get('tala').open());
    await page.locator('#talaHost [data-play]').first().click();
    await expect.poll(busy).toBe(true);
    await page.evaluate(() => ScreenApp.get('tala').close());
    await expect.poll(busy).toBe(false);
    // Ghoshdand page, full cycle
    await page.evaluate(() => SanketUI.open());
    await page.locator('#sk button', { hasText: 'पूर्ण आवर्तन' }).first().click();
    await page.locator('#sk .sk-pp').click();
    await expect.poll(busy).toBe(true);
    await page.evaluate(() => { ScreenApp.stopAll(); SanketUI.close(); });
    await expect.poll(busy).toBe(false);
    // sound check, whole-rachana mix
    await page.evaluate(() => SoundLab.open(4));
    await page.locator('#lab [data-lmixplay]').click();
    await expect.poll(busy, { timeout: 8000 }).toBe(true);
    await page.evaluate(() => SoundLab.close());
    await expect.poll(busy).toBe(false);
  });
});

test.describe('export behaviour', () => {
  test.skip(() => (process.env.GHOSH_TARGET || 'legacy') === 'legacy', 'v2 structure');
  test('opens from the player, offers the text as a file, closes', async ({ page }) => {
    await page.goto('./'); await page.waitForSelector('#rows .row', { state: 'attached' });
    await page.evaluate(() => openPiece('shriram', true));
    await expect(page.locator('#player')).toBeVisible();
    await page.locator('#xBtn').click();
    await expect(page.locator('#xexport')).toBeVisible();
    if (test.info().project.name === 'webkit') await page.locator('#xTxt').click();      // WebKit shares files instead of downloading, as v1.1.0 did
    else {
      const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#xTxt').click()]);
      expect(dl.suggestedFilename()).toBe('Shriram - swarlipi.txt');
      expect(fs.readFileSync(await dl.path(), 'utf8').length).toBeGreaterThan(100);
    }
    await page.locator('#xX').click();
    await expect(page.locator('#xexport')).toBeHidden();
  });
});

test.describe('rachana list', () => {
  test('draws what v1.1.0 drew through search and every filter, in every language, with a folder rachana in it', async ({ browser }) => {
    test.skip(!fs.existsSync(DIST), 'no dist build');
    const entries = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/v1.1.0-storage.json'), 'utf8')).entries;
    entries['ghosh.lib'] = '"book"';
    const grab = async file => {
      const ctx = await browser.newContext(), page = await ctx.newPage();
      await ctx.route(/^https?:\/\//, r => r.abort());
      await page.addInitScript(e => { if (sessionStorage.seeded) return; sessionStorage.seeded = 1; for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v); }, entries);
      await page.goto('file://' + file);
      await page.waitForSelector('#rows .row', { state: 'attached' });
      await expect.poll(() => page.evaluate(() => !!window.Library && (window.LIBROWS || []).length > 0)).toBeTruthy();
      const out = {}, snap = () => page.evaluate(() => ['rowsLbl', 'rows', 'secs', 'insts', 'srcs', 'recentWrap', 'recent'].map(id => document.getElementById(id).innerHTML + '|' + document.getElementById(id).hidden).join('\n'));
      const actions = ['', '[data-s="prachalan"]', '[data-s="mand"]', '[data-s="naimittik"]', '[data-s="all"]', '[data-ins="anak"]', '[data-ins="vanshi"]', '[data-ins="vanshi"]', '[data-src="lib"]', '[data-src="book"]', '[data-src="book"]', 'SEARCH:भूप', 'SEARCH:kerva', 'SEARCH:zzzz', 'SEARCH:'];
      for (const l of LANGS) {
        await page.evaluate(lang => setLang(lang), l);
        for (const [i, a] of actions.entries()) {
          if (a.startsWith('SEARCH:')) await page.evaluate(q => { const i = document.getElementById('q'); i.value = q; i.dispatchEvent(new Event('input')); }, a.slice(7));
          else if (a) await page.evaluate(sel => document.querySelector(sel).click(), a);
          out[`${l}/${i}/${a || 'start'}`] = await snap();
        }
      }
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(LEGACY), await grab(DIST)].map(stripI18n);
    expect(Object.keys(now).length).toBe(45);
    for (const k of Object.keys(was)) { expect(now[k].length, k).toBeGreaterThan(200); expect(now[k], k).toBe(was[k]); }
  });
});

test.describe('services', () => {
  test('every service a screen asks the page for is really offered', async ({ page }) => {
    test.skip(!fs.existsSync(DIST), 'no dist build');
    // names pulled out of `env` at the top of each screen: const { a, b: c } = env;   and the nested ones (audio: A, player: PL, settings: ST)
    const files = []; const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.js$/.test(e.name)) files.push(p); });
    walk(path.join(ROOT, 'src/screens')); walk(path.join(ROOT, 'src/ui'));
    const asked = [];
    for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/const \{([^}]*)\} = env;/g))
      for (const part of m[1].split(',').map(x => x.trim()).filter(Boolean)) asked.push([path.relative(ROOT, f), part.split(':')[0].trim()]);
    expect(asked.length).toBeGreaterThan(30);
    await openFile(page, DIST);
    const missing = await page.evaluate(names => names.filter(([, n]) => !(n in AppEnv)), asked);
    expect(missing).toEqual([]);
    // and the members of the nested services that the screens use
    const KIND = { A: 'audio', PL: 'player', ST: 'settings', 'env.audio': 'audio', 'env.player': 'player', 'env.settings': 'settings' };
    const nested = [...new Set(files.flatMap(f => {
      const text = fs.readFileSync(f, 'utf8'), alias = { env: true };
      if (/audio: A\b/.test(text)) alias.A = 'audio'; if (/player: PL\b/.test(text)) alias.PL = 'player'; if (/settings: ST\b/.test(text)) alias.ST = 'settings';
      return [...text.matchAll(/(?<![.\w])(A|PL|ST|env\.audio|env\.player|env\.settings)\.([A-Za-z_]+)/g)].filter(m => KIND[m[1]] && (m[1].startsWith('env.') || alias[m[1]])).map(m => KIND[m[1]] + '.' + m[2]);
    }))];
    const bad = await page.evaluate(list => list.filter(x => { const [k, n] = x.split('.'); return !(n in AppEnv[k]); }), nested);
    expect(bad).toEqual([]);
  });
});

test.describe('language core', () => {
  // v1.1.0 kept its texts in tables (I18N[lang][key], some of them functions). The new app keeps them in src/i18n/*.json under new keys;
  // tests/fixtures/legacy-keys.json says where each old key went, and tests/support/legacy-tables.ts rebuilds the old table shape from the new messages.
  const readJSON = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const RETIRED = new Set(readJSON('tests/fixtures/retired-texts.json').retired.map(r => r.old));        // v1.1.0 texts that were never shown (and are not in the app any more)
  const digitsOf = (l, n) => (l === 'mr' ? String(n).replace(/\d/g, d => '०१२३४५६७८९'[d]) : String(n));   // what dv() gives in that language
  // the screens hand these functions every argument, already in the language's digits; a short list would only show "undefined" against "{blank}"
  const argSets = l => [[3, 12, 5, 7, 2].map(n => digitsOf(l, n)), [1, 0, 2, 4, 9].map(n => digitsOf(l, n)), ['x', 'y', 'z', 'w', 'v'], [{ dev: 'क', rom: 'k' }, digitsOf(l, 2), digitsOf(l, 3), digitsOf(l, 4)]];
  const call = (f, sets) => sets.map(a => { try { return String(f(...a)); } catch (e) { return 'threw'; } });
  const dump = (o, sets) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'function' ? { fn: call(v, sets) } : v)));

  test('every text of every language is what v1.1.0 had', async ({ browser }) => {
    const core = new I18n({ languages: readJSON('src/i18n/languages.json'), messages: { mr: readJSON('src/i18n/mr.json'), hi: readJSON('src/i18n/hi.json'), en: readJSON('src/i18n/en.json') }, defaultLanguage: 'mr', warn: () => {} });
    const now = legacyTables(core, readJSON('tests/fixtures/legacy-keys.json'));
    const ctx = await browser.newContext(), page = await ctx.newPage();
    await openFile(page, LEGACY);
    const was = await page.evaluate(sets => {
      const call = (f, a) => a.map(x => { try { return String(f(...x)); } catch (e) { return 'threw'; } });
      const out = {};
      for (const l of Object.keys(I18N)) out[l] = JSON.parse(JSON.stringify(I18N[l], (k, v) => (typeof v === 'function' ? { fn: call(v, sets[l]) } : v)));
      return out;
    }, Object.fromEntries(LANGS.map(l => [l, argSets(l)])));
    await ctx.close();
    expect(Object.keys(was).sort()).toEqual(['en', 'hi', 'mr']);
    for (const l of LANGS) {
      const n = stripI18n(dump(now[l], argSets(l)));          // the deliberate differences are undone (tests/support/strip-i18n.mjs)
      // the legend's link is a text of its own now (a message may not hold an <a>); the screen puts it back, so together they are the old text
      n.f_legend = `${n.f_legend} · <a href="#" data-guide="swar">${n.f_legendGuide}</a>`;
      for (const k of Object.keys(was[l])) if (!RETIRED.has(k)) expect(n[k], `${l}.${k}`).toEqual(was[l][k]);
    }
  });

  test('the helpers and the static page text are what v1.1.0 had', async ({ browser }) => {
    test.skip(!fs.existsSync(DIST), 'no dist build');
    const grab = async file => {
      const ctx = await browser.newContext(), page = await ctx.newPage();
      await openFile(page, file);
      const out = await page.evaluate(async langs => {
        const fresh = typeof i18n !== 'undefined';           // the new page has the language core; v1.1.0 has the tables
        const count = n => (fresh ? i18n.t('list.count', { count: dv(n) }) : tx('count', dv(n)));
        const parts = () => (fresh ? Object.fromEntries(['shankh', 'vanshi', 'anak', 'panav', 'jhallari', 'tribhuj', 'steps'].map(k => [k, i18n.t('common.parts.' + k)])) : tx('parts'));
        const sorted = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]]));
        const pageTexts = () => fresh
          ? [...document.querySelectorAll('[data-i18n]')].map(e => e.innerHTML).concat([...document.querySelectorAll('[data-i18n-html]')].map(e => e.innerHTML),
              [...document.querySelectorAll('[data-i18n-attr]')].flatMap(e => e.getAttribute('data-i18n-attr').split(';').map(p => e.getAttribute(p.split(':')[0].trim()))))
          : [...document.querySelectorAll('[data-t]')].map(e => e.innerHTML).concat([...document.querySelectorAll('[data-ta]')].map(e => e.getAttribute('aria-label')), [...document.querySelectorAll('[data-tp]')].map(e => e.getAttribute('placeholder')));
        const res = { helpers: {}, page: {} };
        const idx = await loadJSON('data/index.json');
        for (const l of langs) {
          setLang(l);
          res.helpers[l] = { sec: [...new Set(idx.map(r => r.sec))].map(secName), tala: [...new Set(idx.flatMap(r => r.talas))].map(talaName), raga: [...new Set(idx.map(r => r.raga).filter(Boolean))].map(ragaName),
            dv: [dv(7), dv(120), mmss(95)], count: count(idx.length), parts: sorted(parts()), htmlLang: document.documentElement.lang };
          res.page[l] = pageTexts();
        }
        return res;
      }, LANGS);
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(LEGACY), await grab(DIST)];
    for (const l of LANGS) {
      expect(now.helpers[l], l).toEqual(was.helpers[l]);
      expect(now.page[l].length, l).toBeGreaterThan(40);
      for (const t of was.page[l]) expect(now.page[l], `${l}: static text ${t}`).toContain(t);          // every static text v1.1.0 showed is still shown
    }
  });
});

test.describe('score drawing', () => {
  test('draws every गण of all 120 rachanas exactly as v1.1.0 did', async ({ browser }) => {
    test.skip(!fs.existsSync(DIST), 'no dist build');
    const grab = async file => {
      const ctx = await browser.newContext(), page = await ctx.newPage();
      await openFile(page, file);
      const out = await page.evaluate(async ({ corrected, undo }) => {
        const old = eval('(' + undo + ')');            // the marks of a group back as v1.1.0 drew them (tests/support/legacy-marks.mjs)
        const idx = await loadJSON('data/index.json'); let n = 0, hash = 0, sample = '';
        for (const r of idx) {
          const p = corrected[r.id] ?? await loadJSON('data/r/' + r.id + '.json');
          for (const part of Object.values(p.parts)) for (const g of part.gans) {
            const h = old(ganHTML(g, part.instrument)); n++;
            for (let i = 0; i < h.length; i++) hash = (Math.imul(hash, 31) + h.charCodeAt(i)) | 0;
            if (n === 500) sample = h;
          }
        }
        return { n, hash, sample, slot: slotHTML({ type: 'note', dev: 'ग', octave: -1, vikrit: true, accent: true, slur: 'start', grace: [{ dev: 'म' }] }), cue: matraHTML({ cue: 'ॐ' }) };
      }, { corrected: CORRECTED, undo: undoMarkCells.toString() });
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(LEGACY), await grab(DIST)].map(stripI18n);
    expect(now.n).toBeGreaterThan(20000);
    expect(now).toEqual(was);
  });
});

test.describe('guide screen', () => {
  test('draws exactly what the v1.1.0 guide drew, in every language', async ({ browser }) => {
    test.skip(!fs.existsSync(DIST), 'no dist build');
    const grab = async file => {
      const ctx = await browser.newContext(), page = await ctx.newPage();
      await openFile(page, file);
      const out = {};
      for (const l of LANGS) out[l] = await page.evaluate(lang => { setLang(lang); Guide.open(); return { title: $('#gdT').textContent, toc: $('#gdToc').innerHTML, body: $('#gdBody').innerHTML, open: !$('#guide').hidden }; }, l);
      // the samples other pages draw with the guide's renderer
      out.sample = await page.evaluate(() => ['स री ग म', '[ऽरी] | ग_ ग_', '`म ग', '(प ध नि) त्र', '[तत] त्र ऽ –'].map(s => Guide.sample(s)));
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(LEGACY), await grab(DIST)].map(stripI18n);
    for (const l of LANGS) {
      expect(now[l].open, l).toBe(true);
      expect(now[l].title, l).toBe(was[l].title);
      expect(now[l].toc, l).toBe(was[l].toc);
      expect(now[l].body, l).toBe(was[l].body);
      expect(now[l].body.length, l).toBeGreaterThan(5000);
    }
    expect(now.sample).toEqual(was.sample);
  });
});

test.describe('sound check screen', () => {
  test('draws exactly what the v1.1.0 sound check drew, in every language and on every tab', async ({ browser }) => {
    test.skip(!fs.existsSync(DIST), 'no dist build');
    const grab = async file => {
      const ctx = await browser.newContext(), page = await ctx.newPage();
      await openFile(page, file);
      const out = {};
      for (const l of LANGS) for (let tab = 0; tab < 5; tab++) {
        out[`${l}/${tab}`] = await page.evaluate(async ({ l, tab }) => { setLang(l); await SoundLab.open(tab); const d = { title: $('#labT').textContent, sub: $('#labSub').textContent, tabs: $('#labTabs').innerHTML, body: $('#labBody').innerHTML }; SoundLab.close(); return d; }, { l, tab });
      }
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(LEGACY), await grab(DIST)].map(stripI18n);
    for (const k of Object.keys(was)) {
      expect(now[k].title, k).toBe(was[k].title);
      expect(now[k].tabs, k).toBe(was[k].tabs);
      expect(now[k].body, k).toBe(was[k].body);
      expect(now[k].body.length, k).toBeGreaterThan(200);
    }
  });
});

test.describe('Ghoshdand screen', () => {
  test('draws exactly what the v1.1.0 page drew, in every language, on both tabs and in every view', async ({ browser }) => {
    test.skip(!fs.existsSync(DIST), 'no dist build');
    const grab = async file => {
      const ctx = await browser.newContext(), page = await ctx.newPage();
      await openFile(page, file);
      const out = {};
      for (const l of LANGS) {
        await page.evaluate(lang => { setLang(lang); SanketUI.open(); }, l);
        for (let tab = 0; tab < 2; tab++) {
          await page.locator('#sk .sk-tabs button, #sk [role="tab"], #sk .tabs button').nth(tab).click().catch(() => {});
          await page.waitForTimeout(250);
          for (const view of ['front', 'back']) {
            await page.evaluate(v => { const b = document.querySelector(`#sk [data-skv="${v}"]`); if (b) b.click(); }, view);
            await page.waitForTimeout(150);
            out[`${l}/${tab}/${view}`] = await page.evaluate(() => $('#sk').innerHTML);
          }
        }
        await page.evaluate(() => SanketUI.close());
      }
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(LEGACY), await grab(DIST)].map(stripI18n);
    for (const k of Object.keys(was)) { expect(now[k].length, k).toBeGreaterThan(1000); expect(now[k], k).toBe(was[k]); }
    // the two tabs are really different pages
    expect(was['en/0/front']).not.toBe(was['en/1/front']);
  });
});

test.describe('sound check behaviour', () => {
  test.skip(() => (process.env.GHOSH_TARGET || 'legacy') === 'legacy', 'v2 structure');
  const open = async page => { await page.goto('./'); await page.waitForSelector('#rows .row', { state: 'attached' }); await expect.poll(() => page.evaluate(() => !!window.ScreenApp)).toBeTruthy(); };

  test('opens from the guide link, plays a drum tile, stops', async ({ page }) => {
    await open(page);
    await page.evaluate(() => Guide.open());
    await page.locator('#guide [data-labopen="1"]').first().click();
    await expect(page.locator('#lab')).toBeVisible();
    await expect(page.locator('#guide')).toBeVisible();                         // the guide stays under it, as in v1.1.0
    await page.locator('#lab [data-lbol]').first().click();
    await expect.poll(() => page.evaluate(() => ctx.state)).toBe('running');
    await expect(page.locator('#lab .lab-on').first()).toBeVisible({ timeout: 3000 });
    await page.locator('#labStop').click();
    await expect(page.locator('#lab .lab-on')).toHaveCount(0);
    await page.locator('#labBack').click();
    await expect(page.locator('#lab')).toBeHidden();
  });

  test('the together tab plays a whole rachana through the player, and closing gives the player back', async ({ page }) => {
    await open(page);
    await page.evaluate(() => SoundLab.open(4));
    await page.locator('#lab [data-lmixplay]').click();
    await expect.poll(() => page.evaluate(() => S.playing), { timeout: 8000 }).toBe(true);
    await page.evaluate(() => SoundLab.close());
    await expect.poll(() => page.evaluate(() => S.playing)).toBe(false);
    await expect(page.locator('#lab')).toBeHidden();
  });

  test('another copy of the app starting to play stops the sound check', async ({ page }) => {
    await open(page);
    await page.evaluate(() => SoundLab.open(1));
    await page.locator('#lab [data-lbol]').first().click();
    await page.evaluate(() => otherPlays('some-other-copy'));
    await expect(page.locator('#lab .lab-on')).toHaveCount(0);
  });

  test('a language change redraws it while open', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { setLang('en'); SoundLab.open(0); });
    const en = await page.locator('#labT').textContent();
    await page.evaluate(() => setLang('hi'));
    expect(await page.locator('#labT').textContent()).not.toBe(en);
  });
});

test.describe('guide screen behaviour', () => {
  test.skip(() => (process.env.GHOSH_TARGET || 'legacy') === 'legacy', 'v2 structure');

  const open = async page => { await page.goto('./'); await page.waitForSelector('#rows .row', { state: 'attached' }); await expect.poll(() => page.evaluate(() => !!window.ScreenApp)).toBeTruthy(); };

  test('opens from the guide button in settings, closes with the back button and with Escape', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { renderSheet(); $('#sheet').hidden = false; });
    await page.locator('#sheet [data-guide]').first().click();
    await expect(page.locator('#guide')).toBeVisible();
    await expect(page.locator('#sheet')).toBeHidden();
    await page.locator('#gdBack').click();
    await expect(page.locator('#guide')).toBeHidden();
    await page.evaluate(() => Guide.open());
    await expect(page.locator('#guide')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#guide')).toBeHidden();
  });

  test('a contents button scrolls to its section, and opening at a section jumps there', async ({ page }) => {
    await open(page);
    await page.evaluate(() => Guide.open());
    const second = page.locator('#gdToc button').nth(3);
    const id = await second.getAttribute('data-gd');
    await second.click();
    await expect.poll(() => page.evaluate(() => document.querySelector('#gdBody').scrollTop)).toBeGreaterThan(50);
    await page.evaluate(() => Guide.close());
    await page.evaluate(id => Guide.open(id), id);
    await expect.poll(() => page.evaluate(() => document.querySelector('#gdBody').scrollTop)).toBeGreaterThan(50);
  });

  test('changing the language while it is open redraws it in the new language; closed, it stays closed', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { setLang('en'); Guide.open(); });
    const en = await page.locator('#gdT').textContent();
    await page.evaluate(() => setLang('hi'));
    expect(await page.locator('#gdT').textContent()).not.toBe(en);
    await page.evaluate(() => Guide.close());
    await page.evaluate(() => setLang('mr'));
    await expect(page.locator('#guide')).toBeHidden();
  });

  test('the sound-check links appear only for the sections that have one', async ({ page }) => {
    await open(page);
    const counts = await page.evaluate(() => { Guide.open(); return [...document.querySelectorAll('.gd-sec')].map(s => [s.id, s.querySelectorAll('[data-labopen]').length]); });
    expect(counts.filter(([, n]) => n).map(([id]) => id)).toEqual(['gd-swar', 'gd-anak', 'gd-tal', 'gd-steps']);
  });

  test('screens are registered with the app', async ({ page }) => {
    await open(page);
    expect((await page.evaluate(() => [...ScreenApp.screens.keys()])).sort()).toEqual(['composer', 'correction', 'export', 'ghoshdand', 'guide', 'library', 'list', 'platform', 'player', 'soundcheck', 'tala']);
  });

  test('a change made on the language core alone reaches the page, the list, the settings sheet and the stored choice', async ({ page }) => {
    await open(page);
    await page.evaluate(() => i18n.setLang('en'));                // not the page's setLang(): the core tells the app
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
    expect(await page.evaluate(() => document.querySelector('#count1').textContent)).toMatch(/rachanas/);
    expect(await page.evaluate(() => document.querySelector('#secs .chip').textContent)).toContain('All');
    expect(await page.evaluate(() => localStorage.getItem('ghosh.lang'))).toBe('"en"');
    await page.locator('#instBtn2').click();
    await expect(page.locator('#sheet')).toContainText('Download backup');                           // the platform group of the sheet is in English too
    await page.evaluate(() => i18n.setLang('mr'));
    expect(await page.evaluate(() => document.querySelector('#count1').textContent)).toMatch(/रचना/);
  });
});
