// Records a realistic v1.1.0 storage dump by driving the released app's own code.
//   node tests/fixtures/make-v1-storage.mjs      -> tests/fixtures/v1.1.0-storage.json
// Run it only to re-record; the result is committed and the migration tests depend on it staying put.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('file://' + path.join(ROOT, 'legacy/v1.1.0/Ghoshnaad.html'));
await page.waitForSelector('#rows .row');

const dump = await page.evaluate(async () => {
  // settings, through the app's own store
  store.set('lang', 'hi'); store.set('theme', 'dark'); store.set('artic', 'nirantar'); store.set('kanMs', 80);
  store.set('saKeys', { shankh: 9, vanshi: 7 }); store.set('sec', 'prachalan-shankh'); store.set('recent', ['shriram', 'bhoop']);
  store.set('inst', { shankh: ['trumpet'], vanshi: ['flute', 'venu'], anak: ['side'], tal: ['bass', 'cym'] });
  store.set('xstyle', 'plain'); store.set('lib', 'mine');
  localStorage.setItem('ghosh.skView', 'back');

  // two compositions, built with the composer's own model and merged in the way the composer saves them
  const C = window.Composer;
  const make = (name, instr, tala, laya, mel, anak) => {
    const r = C.newRachana({ name, instr, tala, laya });
    const line = r.blocks[0].lines[0];
    mel.forEach((s, i) => { line.mel[i] = { n: 1, s: [s] }; });
    anak.forEach((s, i) => { line.anak[i] = { n: 1, s: [s] }; });
    return r;
  };
  const a = make('माझी पहिली रचना', 'vanshi', 'kerva', 120, ['स', 'री', 'ग', 'म', 'प', 'ध', 'नि', "स'"], ['त', 'त', 'त', 'त', 'त', 'त', 'त', 'त']);
  const b = make('दुसरी — शंख', 'shankh', 'kerva', 120, ['स', 'ऽ', 'प', 'ऽ', 'स', 'ऽ', 'प', 'ऽ'], ['त', '–', 'त', '–', 'त', '–', 'त', '–']);
  ComposerUI.mergeFolder([a, b]);

  // one correction to a book rachana, saved the way the corrector saves it
  const src = JSON.parse(JSON.stringify(await loadJSON('data/src/shriram.json')));
  src.title = { ...src.title, dev: 'श्रीराम (दुरुस्त)' };
  await Library.saveSource(src);

  const out = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out[k] = localStorage.getItem(k); }
  return out;
});
await browser.close();
if (errors.length) { console.error('page errors:', errors); process.exit(1); }
delete dump['ghosh.playing'];
fs.writeFileSync(path.join(ROOT, 'tests/fixtures/v1.1.0-storage.json'), JSON.stringify({
  note: 'localStorage of the released v1.1.0 app after: language, theme, sound settings, two compositions, one corrected rachana. Recorded by make-v1-storage.mjs.',
  entries: dump,
}, null, 1) + '\n');
console.log('recorded keys:', Object.keys(dump).sort().join(', '));
