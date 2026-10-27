import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { languagesPlugin } from '../../build/lib/languages.mjs';

/** A made-up tree with two languages; the bundle of `entry` is run and its default exports returned. */
async function run(setup, entry) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'languages-'));
  const w = (f, d) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), typeof d === 'string' ? d : JSON.stringify(d)); };
  w('src/i18n/languages.json', [{ code: 'en', script: 'Latn' }, { code: 'gu', script: 'Gujr' }]);
  w('src/i18n/en.json', { a: 'A' }); w('src/i18n/gu.json', { a: 'અ' });
  setup(w);
  w('entry.js', entry);
  try {
    const r = await build({ entryPoints: [path.join(dir, 'entry.js')], bundle: true, format: 'cjs', write: false, loader: { '.md': 'text' }, plugins: [languagesPlugin(dir)], logLevel: 'silent' });
    const m = { exports: {} }; new Function('module', 'exports', r.outputFiles[0].text)(m, m.exports);
    return m.exports;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('messages: one object per language of languages.json', async () => {
  const x = await run(() => {}, "module.exports = require('virtual:languages/messages').default || require('virtual:languages/messages');");
  assert.deepEqual(x, { en: { a: 'A' }, gu: { a: 'અ' } });
});
test('a language without its file stops the build, and says which', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'languages-'));
  fs.mkdirSync(path.join(dir, 'src/i18n'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/i18n/languages.json'), JSON.stringify([{ code: 'zz', script: 'Latn' }]));
  fs.writeFileSync(path.join(dir, 'e.js'), "import m from 'virtual:languages/messages'; console.log(m);");
  await assert.rejects(() => build({ entryPoints: [path.join(dir, 'e.js')], bundle: true, write: false, plugins: [languagesPlugin(dir)], logLevel: 'silent' }), /zz, but src\/i18n\/zz.json does not exist/);
  fs.rmSync(dir, { recursive: true, force: true });
});
test('name corrections: only the scripts of the languages, only where the file exists', async () => {
  const x = await run(w => { w('rules/names/Gujr.json', { 'केरवा': 'કહરવા' }); w('rules/names/Beng.json', { x: 'y' }); }, "import n from 'virtual:languages/names'; module.exports = n;");
  assert.deepEqual(x, { Gujr: { 'केरवा': 'કહરવા' } });          // Bengali is no language here
  assert.deepEqual(await run(() => {}, "import n from 'virtual:languages/names'; module.exports = n;"), {});
});
test('content: each markdown file of each language, by file name', async () => {
  const x = await run(w => { w('src/content/en/guide.md', '# en guide'); w('src/content/gu/guide.md', '# gu guide'); w('src/content/en/ghoshdand.md', '# en gd'); }, "import c from 'virtual:languages/content'; module.exports = c;");
  assert.deepEqual(x, { ghoshdand: { en: '# en gd' }, guide: { en: '# en guide', gu: '# gu guide' } });
});
