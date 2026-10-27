// The correction screen and the library (folder of rachana files, corrections). Each must do what v1.1.0 did.
// The browser's folder picker is replaced by an in-memory folder, so the same steps run against both versions.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const LEGACY = path.join(ROOT, 'legacy/v1.1.0/Ghoshnaad.html');
const DIST = path.join(ROOT, 'dist/Ghoshnaad.html');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/v1.1.0-storage.json'), 'utf8')).entries;
const LANGS = ['mr', 'hi', 'en'];

// an in-memory folder with the parts of the File System Access API the library uses
const FAKE_FOLDER = () => {
  const files = new Map();                                    // name -> { text, mod }
  const fileHandle = name => ({ kind: 'file', name,
    async getFile() { const f = files.get(name); return new File([f.text], name, { lastModified: f.mod }); },
    async createWritable() { let buf = ''; return { async write(t) { buf += typeof t === 'string' ? t : await t.text(); }, async close() { files.set(name, { text: buf, mod: Date.now() }); } }; } });
  const dir = { kind: 'directory', name: 'घोष रचना',
    async *values() { for (const n of [...files.keys()]) yield fileHandle(n); },
    async getFileHandle(n, o) { if (!files.has(n)) { if (!(o && o.create)) throw Object.assign(new Error('nf'), { name: 'NotFoundError' }); files.set(n, { text: '', mod: Date.now() }); } return fileHandle(n); },
    async removeEntry(n) { files.delete(n); },
    async queryPermission() { return 'granted'; }, async requestPermission() { return 'granted'; } };
  window.__folder = files;
  window.showDirectoryPicker = async () => dir;
};

async function open(browser, file, entries) {
  const ctx = await browser.newContext(), page = await ctx.newPage();
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.addInitScript(e => { if (sessionStorage.seeded) return; sessionStorage.seeded = 1; for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v); }, entries);
  await page.addInitScript(FAKE_FOLDER);
  await page.goto('file://' + file);
  await page.waitForSelector('#rows .row', { state: 'attached' });
  await expect.poll(() => page.evaluate(() => !!window.Library && !!window.FixerUI)).toBeTruthy();
  return { ctx, page };
}

test.describe('library and correction screens', () => {
  test.skip(() => !fs.existsSync(DIST), 'no dist build');

  test('the library bar and sheet group are what v1.1.0 drew, in every language', async ({ browser }) => {
    const grab = async file => {
      const { ctx, page } = await open(browser, file, FIXTURE);
      const out = {};
      for (const l of LANGS) out[l] = await page.evaluate(lang => { setLang(lang); return { bar: document.querySelector('#libbar').innerHTML, sheet: Library.sheetHTML(), rows: Library.rows().map(r => [r.id, r.dev, r.lib]) }; }, l);
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(LEGACY), await grab(DIST)];
    expect(now.en.rows.length).toBeGreaterThan(0);
    expect(now).toEqual(was);
  });

  test('the correction screen draws what v1.1.0 drew, in every language, for a book rachana and for a saved correction', async ({ browser }) => {
    const grab = async file => {
      const { ctx, page } = await open(browser, file, FIXTURE);
      const out = {};
      for (const l of LANGS) for (const id of ['shriram', 'f~shriram', 'bhoop']) {
        out[`${l}/${id}`] = await page.evaluate(async ({ l, id }) => { setLang(l); await FixerUI.open(id); const h = document.querySelector('#fixer').innerHTML; document.querySelector('#fixer').hidden = true; return h; }, { l, id });
      }
      await ctx.close();
      return out;
    };
    const [was, now] = [await grab(LEGACY), await grab(DIST)];
    for (const k of Object.keys(was)) { expect(now[k].length, k).toBeGreaterThan(500); expect(now[k], k).toBe(was[k]); }
  });

  test('with a folder: it is read, corrections are written into it as files, and removing the link keeps the files', async ({ browser }) => {
    const run = async file => {
      const { ctx, page } = await open(browser, file, { 'ghosh.lang': '"en"' });
      const res = await page.evaluate(async () => {
        const src = JSON.parse(JSON.stringify(await loadJSON('data/src/ajey.json'))); src.title = { ...src.title, dev: 'अजेय (फोल्डर)' };
        window.__folder.set('ajey-copy.ghosh.json', { text: JSON.stringify(src), mod: Date.now() - 100000 });
        window.__folder.set('notes.txt', { text: 'not a rachana', mod: Date.now() });
        await Library.pick();
        await new Promise(r => setTimeout(r, 400));
        const out = { mode: Library.mode(), rows: Library.rows().map(r => [r.id, r.dev, r.lib]) };
        const fix = JSON.parse(JSON.stringify(await loadJSON('data/src/shriram.json'))); fix.title = { ...fix.title, dev: 'श्रीराम (नवा)' };
        out.saved = await Library.saveSource(fix);
        await new Promise(r => setTimeout(r, 300));
        out.files = [...window.__folder.entries()].map(([n, f]) => { let j = null; try { j = JSON.parse(f.text); } catch (e) {} return [n, j && { id: j.id, title: j.title && j.title.dev, parts: j.parts && Object.keys(j.parts) }]; }).sort();
        out.pend = Object.keys(JSON.parse(localStorage.getItem('ghosh.fix') || '{}'));
        out.rowsAfter = Library.rows().map(r => [r.id, r.dev, r.lib]);
        await Library.removeSource('shriram');
        out.afterRemove = Library.rows().map(r => r[0]);
        return out;
      });
      await ctx.close();
      return res;
    };
    const [was, now] = [await run(LEGACY), await run(DIST)];
    expect(now.mode).toBe('rw');
    expect(now.rows.some(r => r[0] === 'f~ajey')).toBe(true);
    expect(now.saved.written).toBe(true);
    expect(now.files.map(f => f[0])).toContain('shriram.ghosh.json');
    expect(now).toEqual(was);
  });

  test('without a folder, a saved correction waits in the browser and is listed as not yet a file', async ({ browser }) => {
    const { ctx, page } = await open(browser, DIST, { 'ghosh.lang': '"en"' });
    const r = await page.evaluate(async () => {
      const fix = JSON.parse(JSON.stringify(await loadJSON('data/src/shriram.json'))); fix.title = { ...fix.title, dev: 'x' };
      const saved = await Library.saveSource(fix);
      return { saved, pend: Object.keys(JSON.parse(localStorage.getItem('ghosh.fix'))), pending: Library.pendingCount(), isLib: Library.isLib('shriram') };
    });
    expect(r).toEqual({ saved: { written: false }, pend: ['shriram'], pending: 1, isLib: true });
    await ctx.close();
  });
});
