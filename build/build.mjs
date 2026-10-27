#!/usr/bin/env node
// Build dist/: the one-file app (index.html = Ghoshnaad.html plus install links), service worker, manifest, icons, version.json.
//   node build/build.mjs          -> dist/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';
import { buildPack } from './lib/pack.mjs';
import { fontCss } from './lib/fonts.mjs';
import { assemble } from './lib/assemble.mjs';
import { checkSingleFile } from './check-single-file.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const release = JSON.parse(fs.readFileSync(path.join(ROOT, 'release.json'), 'utf8'));
const kb = n => (n / 1024).toFixed(0) + ' KB';
const safe = (text, what) => { if (/<\/script/i.test(text)) throw new Error(`${what} contains "</script"`); return text; };

const t0 = Date.now();
const pack = buildPack(ROOT, { stamp: `${release.date}T00:00:00.000Z` });
if (pack.warnings.length) console.warn(`${pack.warnings.length} compile warnings:\n  ` + pack.warnings.join('\n  '));

// The browser bundles come from the TypeScript core: one global each (GhoshCompile, buildTimeline3).
const bundle = async entry => (await esbuild({
  entryPoints: [path.join(ROOT, entry)], bundle: true, minify: true, format: 'iife',
  target: 'es2020', platform: 'browser', write: false, legalComments: 'none', charset: 'ascii',
})).outputFiles[0].text;
const [compiler, timeline, audio] = await Promise.all([bundle('src/browser/entry-compiler.ts'), bundle('src/browser/entry-timeline.ts'), bundle('src/browser/entry-audio.ts')]);
const fflate = fs.readFileSync(path.join(ROOT, 'node_modules/fflate/umd/index.js'), 'utf8');
const generated = {
  pack: safe(`window.GHOSH_PACK="${pack.base64}";`, 'pack'),
  fflate: safe(`/* fflate 0.8.2, MIT License, (c) 2023 Arjun Barrett */\n${fflate}\n`, 'fflate'),
  compiler: safe('\n' + compiler, 'compiler'),
  timeline: safe('\n' + timeline, 'timeline'),
  audio: safe('\n' + audio, 'audio'),
};
const fonts = await fontCss(ROOT);

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'icons'), { recursive: true });
const partsDir = path.join(ROOT, 'src/app');
const file = assemble({ partsDir, generated, release, fontCss: fonts, variant: 'file' });
const site = assemble({ partsDir, generated, release, fontCss: fonts, variant: 'site' });
fs.writeFileSync(path.join(DIST, 'Ghoshnaad.html'), file);
fs.writeFileSync(path.join(DIST, 'index.html'), site);

for (const f of fs.readdirSync(path.join(ROOT, 'web/icons'))) fs.copyFileSync(path.join(ROOT, 'web/icons', f), path.join(DIST, 'icons', f));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/manifest.webmanifest'), 'utf8'));
fs.writeFileSync(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest) + '\n');
const precache = ['./', 'index.html', 'manifest.webmanifest', ...fs.readdirSync(path.join(DIST, 'icons')).map(f => 'icons/' + f)];
const sw = fs.readFileSync(path.join(ROOT, 'web/sw.template.js'), 'utf8')
  .replaceAll('__VERSION__', release.version).replaceAll('__FILES__', JSON.stringify(precache));
if (/__[A-Z]+__/.test(sw)) throw new Error('sw.js still has an unfilled placeholder');
new Function(sw);                                               // syntax check: a broken worker fails silently in the app
fs.writeFileSync(path.join(DIST, 'sw.js'), sw);
fs.writeFileSync(path.join(DIST, 'version.json'), JSON.stringify({ version: release.version, date: release.date, whatsNew: release.whatsNew, bytes: Buffer.byteLength(file) }, null, 1) + '\n');
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

let bad = 0;
for (const [name, html, allowInstallLinks] of [['Ghoshnaad.html', file, false], ['index.html', site, true]]) {
  const problems = checkSingleFile(html, { allowInstallLinks });
  if (problems.length) { bad++; console.error(`✗ ${name} is not self-contained:\n  ` + problems.join('\n  ')); }
}
console.log(`built v${release.version}: ${pack.count} rachanas, pack ${kb(pack.gzBytes)} gz, fonts ${kb(fonts.length)}, Ghoshnaad.html ${kb(Buffer.byteLength(file))}, index.html ${kb(Buffer.byteLength(site))} (${Date.now() - t0} ms)`);
if (bad) process.exit(1);
