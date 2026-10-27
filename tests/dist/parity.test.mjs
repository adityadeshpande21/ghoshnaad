// Run after `npm run build`. The built app must equal released v1.1.0 except for the changes the build makes on purpose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT, compileBook, bookIds, stable, withoutStamp } from '../golden/lib.mjs';
import { split } from '../../tools/legacy-split.mjs';

const dist = f => path.join(ROOT, 'dist', f);
const legacyParts = path.join(ROOT, 'legacy/src/app');
const hasBoth = fs.existsSync(dist('Ghoshnaad.html')) && fs.existsSync(legacyParts);

function parts(html) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghosh-parts-'));
  const htmlFile = path.join(tmp, 'in.html'); fs.writeFileSync(htmlFile, html);
  const manifest = split(htmlFile, path.join(tmp, 'p'));
  const read = m => fs.readFileSync(path.join(tmp, 'p', m.file), 'utf8');
  return { manifest, read, dir: path.join(tmp, 'p') };
}

const srcParts = path.join(ROOT, 'src/app');
const readIf = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);

// The page scripts being migrated. Any other script that differs from the released v1.1.0 is a surprise.
// (Update this list when a script is deliberately changed; remove an entry when its screen is rewritten.)
const MIGRATED = {
  changed: ['app.js', 'app.css', 'raw-02.html'],       // sound moved to src/audio; platform hooks; sheet container; version labels
  added: ['platform.js', 'raw-platform.html', 'raw-i18n.html'],
  removed: ['composer-core.js', 'guide.js', 'sanket.js', 'soundlab.js', 'sanketui.js', 'export.js', 'fixer.js', 'library.js', 'composer.js', 'timeline3.js'],                                              // now src/core/composer.ts and src/screens/guide
};

test('the page scripts differ from the released v1.1.0 only where they are being migrated', { skip: !hasBoth }, () => {
  const names = d => fs.readdirSync(d).filter(f => !/manifest\.json$/.test(f));
  const now = names(srcParts), old = names(legacyParts);
  const changed = old.filter(f => now.includes(f) && readIf(path.join(srcParts, f)) !== readIf(path.join(legacyParts, f)));
  assert.deepEqual(changed.sort(), [...MIGRATED.changed].sort());
  assert.deepEqual(now.filter(f => !old.includes(f)).sort(), [...MIGRATED.added].sort());
  assert.deepEqual(old.filter(f => !now.includes(f)).sort(), [...MIGRATED.removed].sort());
});

test('dist is src/app plus the generated blocks, with only the named transforms applied', { skip: !hasBoth }, () => {
  const built = parts(fs.readFileSync(dist('index.html'), 'utf8'));
  const want = JSON.parse(fs.readFileSync(path.join(srcParts, 'manifest.json'), 'utf8'));
  assert.deepEqual(built.manifest.map(m => m.gen || m.kind), want.map(m => m.gen || m.kind), 'same blocks in the same order');
  const differ = [];
  built.manifest.forEach((m, i) => {
    if (m.gen) return;
    const w = want[i];
    if (built.read(m) !== fs.readFileSync(path.join(srcParts, w.file), 'utf8')) differ.push(w.file);
  });
  assert.deepEqual(differ.sort(), ['app.js', 'raw-01.html', 'raw-02.html']);
  // app.js: the APP line only
  const a = fs.readFileSync(path.join(srcParts, 'app.js'), 'utf8').split('\n'), b = built.read(built.manifest.find(m => m.file === 'app.js')).split('\n');
  assert.equal(a.length, b.length);
  assert.deepEqual(a.map((l, i) => l === b[i] ? null : i).filter(i => i !== null), [7]);
  // raw-02: the two visible version labels only
  const strip = t => t.replace(/<span class="sh-ver" id="appVer">[^<]*<\/span>/, '').replace(/<span class="ver">v[^<]*<\/span>/, '');
  const r2 = built.manifest.find(m => m.file && /^raw-/.test(m.file) && /sh-ver/.test(built.read(m)));
  assert.equal(strip(built.read(r2)), strip(fs.readFileSync(path.join(srcParts, 'raw-02.html'), 'utf8')));
});

test('head: no Google Fonts, fonts embedded, same everything else', { skip: !hasBoth }, () => {
  const head = parts(fs.readFileSync(dist('index.html'), 'utf8')).read({ file: 'raw-01.html' });
  assert.doesNotMatch(head, /fonts\.(googleapis|gstatic)\.com/);
  assert.match(head, /<style id="fonts">@font-face\{font-family:'Mukta'/);
  assert.match(head, /<link rel="manifest" href="manifest\.webmanifest">/);
  const file = parts(fs.readFileSync(dist('Ghoshnaad.html'), 'utf8')).read({ file: 'raw-01.html' });
  assert.doesNotMatch(file, /rel="manifest"/);
});

test('the embedded compiler gives the same output as the sources, for all 120 books', { skip: !hasBoth }, () => {
  const html = fs.readFileSync(dist('Ghoshnaad.html'), 'utf8');
  const code = html.split('<script>').map(s => s.split('</script>')[0]).find(s => /GhoshCompile=/.test(s));
  const win = {}; vm.runInNewContext(code, { window: win });
  assert.deepEqual(Object.keys(win.GhoshCompile).sort(), ['compile3', 'talas']);
  for (const f of bookIds()) {
    const { src, piece } = compileBook(f);
    assert.equal(stable(withoutStamp(win.GhoshCompile.compile3(JSON.parse(JSON.stringify(src))).piece)), stable(withoutStamp(piece)), f);
  }
});

test('service worker: filled in, no skipWaiting on install, old caches removed', { skip: !fs.existsSync(dist('sw.js')) }, () => {
  const sw = fs.readFileSync(dist('sw.js'), 'utf8');
  assert.doesNotMatch(sw, /__[A-Z]+__/);
  assert.match(sw, /const VERSION = '[^']+'/);
  assert.doesNotMatch(sw, /addAll\([^)]*\)\)\s*\.then\(\(\) => self\.skipWaiting/);
  assert.match(sw, /caches\.delete/);
});

test('no old version number is left anywhere the person can see it', { skip: !fs.existsSync(dist('index.html')) }, () => {
  const html = fs.readFileSync(dist('index.html'), 'utf8').replace(/data:[a-z/+-]+;base64,[A-Za-z0-9+/=]+/g, '').replace(/window\.GHOSH_PACK="[^"]*"/, '');
  const r = JSON.parse(fs.readFileSync(path.join(ROOT, 'release.json'), 'utf8'));
  assert.deepEqual([...html.matchAll(/v1\.1\.0/g)].length, 0, 'v1.1.0 still appears in the built page');
  assert.match(html, new RegExp(`<span class="ver">v${r.version.replace(/\./g, '\\.')}</span>`));
  assert.match(html, new RegExp(`<title>घोषनाद v${r.version.replace(/\./g, '\\.')}</title>`));
});

test('version.json agrees with release.json and the built file', { skip: !fs.existsSync(dist('version.json')) }, () => {
  const v = JSON.parse(fs.readFileSync(dist('version.json'), 'utf8')), r = JSON.parse(fs.readFileSync(path.join(ROOT, 'release.json'), 'utf8'));
  assert.equal(v.version, r.version);
  assert.equal(v.bytes, fs.statSync(dist('Ghoshnaad.html')).size);
  assert.match(fs.readFileSync(dist('index.html'), 'utf8'), new RegExp(`version:'${r.version.replace(/\./g, '\\.')}'`));
});

test('the built timeline gives the same beats and sounds as v1.1.0\'s timeline3.js, for every part of every book', { skip: !hasBoth }, () => {
  const run = code => { const w = {}; vm.runInNewContext(code, { window: w, module: undefined }); return w; };
  const legacyCode = fs.readFileSync(path.join(legacyParts, 'timeline3.js'), 'utf8') + '\nwindow.buildTimeline3 = buildTimeline3;';
  const builtHtml = fs.readFileSync(dist('Ghoshnaad.html'), 'utf8');
  const builtCode = builtHtml.split('<script>').map(s => s.split('</script>')[0]).find(s => /window\.buildTimeline3=/.test(s) && s.length < 20000);
  assert.ok(builtCode, 'timeline block not found in the built file');
  const oldTl = run(legacyCode).buildTimeline3, newTl = run(builtCode).buildTimeline3;
  for (const f of bookIds()) {
    const { piece } = compileBook(f);
    for (const part of Object.keys(piece.parts)) for (const order of ['printed', 'performance', 'once']) for (const tempo of [0.6, 1, 1.4])
      assert.equal(stable(newTl(piece, part, { tempo, order })), stable(oldTl(piece, part, { tempo, order })), `${f} ${part} ${order} ${tempo}`);
  }
});
