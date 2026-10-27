// Screens migrated to the Screen / App structure. Each must draw exactly what the v1.1.0 page drew, and behave the same.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const LEGACY = path.join(ROOT, 'legacy/v1.1.0/Ghoshnaad.html');
const DIST = path.join(ROOT, 'dist/Ghoshnaad.html');
const LANGS = ['mr', 'hi', 'en'];

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
    const [was, now] = [await grab(LEGACY), await grab(DIST)];
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
      const out = await page.evaluate(async langs => {
        const idx = await loadJSON('data/index.json'), res = {}, seen = new Set();
        const picks = idx.filter(r => { const k = r.talas.join() + r.parts.join(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
        for (const l of langs) {
          setLang(l);
          for (const r of picks) {
            const piece = await loadJSON('data/r/' + r.id + '.json');
            for (const [st, lay] of [['rich', 'score'], ['plain', 'pages']]) {
              store.set('xstyle', st); store.set('xlay', lay);
              Swarlipi.open(piece);
              const keys = Object.keys(piece.parts).filter(k => ['shankh', 'vanshi', 'anak'].includes(k));
              res[`${l}/${r.id}/${st}/${lay}`] = { dom: document.querySelector('#xexport').innerHTML, sheet: Swarlipi.sheet(piece, keys), text: Swarlipi.text(piece, keys) };
            }
          }
        }
        return res;
      }, LANGS);
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(LEGACY), await grab(DIST)];
    const keys = Object.keys(was);
    expect(keys.length).toBeGreaterThan(40);
    for (const k of keys) { expect(now[k].text.length, k).toBeGreaterThan(50); expect(now[k], k).toEqual(was[k]); }
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
      expect(dl.suggestedFilename()).toMatch(/\.txt$/);
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
    const [was, now] = [await grab(LEGACY), await grab(DIST)];
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
  test('every text of every language, the helpers, and the static page text are what v1.1.0 had', async ({ browser }) => {
    test.skip(!fs.existsSync(DIST), 'no dist build');
    const grab = async file => {
      const ctx = await browser.newContext(), page = await ctx.newPage();
      await openFile(page, file);
      const out = await page.evaluate(async langs => {
        // functions are compared by what they return, not by their (minified) source
        const call = f => { const r = []; for (const a of [[3], [12, 5], ['x', 'y'], [{ dev: 'क', rom: 'k' }]]) { try { r.push(JSON.stringify(f(...a))); } catch (e) { r.push('threw'); } } return r; };
        const dump = o => JSON.stringify(o, (k, v) => (typeof v === 'function' ? { fn: call(v) } : v), 1);
        const res = { tables: {}, helpers: {}, page: {} };
        for (const l of Object.keys(I18N)) res.tables[l] = dump(I18N[l]);
        const idx = await loadJSON('data/index.json');
        for (const l of langs) {
          setLang(l);
          res.helpers[l] = { sec: [...new Set(idx.map(r => r.sec))].map(secName), tala: [...new Set(idx.flatMap(r => r.talas))].map(talaName), raga: [...new Set(idx.map(r => r.raga).filter(Boolean))].map(ragaName),
            dv: [dv(7), dv(120), mmss(95)], count: tx('count', dv(idx.length)), parts: tx('parts'), htmlLang: document.documentElement.lang };
          res.page[l] = [...document.querySelectorAll('[data-t]')].map(e => e.innerHTML).concat([...document.querySelectorAll('[data-ta]')].map(e => e.getAttribute('aria-label')), [...document.querySelectorAll('[data-tp]')].map(e => e.getAttribute('placeholder')));
        }
        return res;
      }, LANGS);
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(LEGACY), await grab(DIST)];
    expect(Object.keys(now.tables).sort()).toEqual(['en', 'hi', 'mr']);
    for (const l of LANGS) {
      // the new version has more texts (data, platform and tala screens add theirs); everything v1.1.0 had must be unchanged
      const w = JSON.parse(was.tables[l]), n = JSON.parse(now.tables[l]);
      for (const k of Object.keys(w)) expect(n[k], `${l}.${k}`).toEqual(w[k]);
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
      const out = await page.evaluate(async () => {
        const idx = await loadJSON('data/index.json'); let n = 0, hash = 0, sample = '';
        for (const r of idx) {
          const p = await loadJSON('data/r/' + r.id + '.json');
          for (const part of Object.values(p.parts)) for (const g of part.gans) {
            const h = ganHTML(g, part.instrument); n++;
            for (let i = 0; i < h.length; i++) hash = (Math.imul(hash, 31) + h.charCodeAt(i)) | 0;
            if (n === 500) sample = h;
          }
        }
        return { n, hash, sample, slot: slotHTML({ type: 'note', dev: 'ग', octave: -1, vikrit: true, accent: true, slur: 'start', grace: [{ dev: 'म' }] }), cue: matraHTML({ cue: 'ॐ' }) };
      });
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(LEGACY), await grab(DIST)];
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
    const [was, now] = [await grab(LEGACY), await grab(DIST)];
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
    const [was, now] = [await grab(LEGACY), await grab(DIST)];
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
    const [was, now] = [await grab(LEGACY), await grab(DIST)];
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
    expect((await page.evaluate(() => [...ScreenApp.screens.keys()])).sort()).toEqual(['composer', 'correction', 'export', 'ghoshdand', 'guide', 'library', 'list', 'player', 'soundcheck', 'tala']);
  });
});
