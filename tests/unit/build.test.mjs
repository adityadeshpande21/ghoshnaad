import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, legacyPack, stable, withoutStamp } from '../golden/lib.mjs';
import { buildPack } from '../../build/lib/pack.mjs';
import { checkSingleFile } from '../../build/check-single-file.mjs';

const hasLegacy = fs.existsSync(path.join(ROOT, 'legacy/v1.1.0/index.html'));

test('the pack holds the 120 books, compiled and as written, plus the catalog', () => {
  const { pack, count, warnings } = buildPack(ROOT, { stamp: '2026-01-01T00:00:00.000Z' });
  assert.equal(count, 120);
  assert.deepEqual(warnings, []);
  assert.equal(pack['data/index.json'].length, 120);
  assert.equal(Object.keys(pack).filter(k => k.startsWith('data/r/')).length, 120);
  assert.equal(Object.keys(pack).filter(k => k.startsWith('data/src/')).length, 120);
});

test('the pack is identical to the one v1.1.0 shipped', { skip: !hasLegacy }, () => {
  const mine = buildPack(ROOT, { stamp: '2026-01-01T00:00:00.000Z' }).pack, theirs = legacyPack();
  assert.deepEqual(Object.keys(mine).sort(), Object.keys(theirs).sort());
  for (const k of Object.keys(theirs)) {
    const strip = k.startsWith('data/r/') ? withoutStamp : x => x;
    assert.equal(stable(strip(mine[k])), stable(strip(theirs[k])), k);
  }
  assert.deepEqual(mine['data/index.json'], theirs['data/index.json'], 'catalog rows and their order');
});

test('the build is repeatable: same inputs, same pack', () => {
  const a = buildPack(ROOT, { stamp: '2026-01-01T00:00:00.000Z' }), b = buildPack(ROOT, { stamp: '2026-01-01T00:00:00.000Z' });
  assert.equal(a.base64, b.base64);
});

test('single-file check accepts a self-contained page', () => {
  const html = '<!doctype html><html><head><style>@font-face{src:url(data:font/woff2;base64,AAAA)}</style></head><body><svg xmlns="http://www.w3.org/2000/svg"></svg><script>const w=new Worker(URL.createObjectURL(new Blob([""])));</script></body></html>';
  assert.deepEqual(checkSingleFile(html), []);
});

test('single-file check rejects every way of reaching outside', () => {
  const bad = {
    'linked script': '<script src="app.js"></script>',
    'stylesheet': '<link rel="stylesheet" href="app.css">',
    'google fonts': '<link href="https://fonts.googleapis.com/css2?family=Mukta">',
    'css import': '<style>@import "x.css";</style>',
    'css url': '<style>a{background:url(img.png)}</style>',
    'image': '<img src="logo.png">',
    'address in code': '<script>fetch("https://example.com/a")</script>',
    'worker file': '<script>new Worker("w.js")</script>',
  };
  for (const [what, html] of Object.entries(bad)) assert.notDeepEqual(checkSingleFile(html), [], what);
});

test('a listed website address may appear as text, any other address may not', () => {
  const html = '<p>https://example.org/app/</p>';
  assert.deepEqual(checkSingleFile(html, { shownAddresses: ['https://example.org/app/'] }), []);
  assert.notDeepEqual(checkSingleFile(html), []);
  assert.notDeepEqual(checkSingleFile('<p>https://evil.example/</p>', { shownAddresses: ['https://example.org/app/'] }), []);
});

test('index.html gets no exemption except the two install links', () => {
  const links = '<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png">';
  assert.deepEqual(checkSingleFile(`<head>${links}</head><body></body>`, { allowInstallLinks: true }), []);
  assert.notDeepEqual(checkSingleFile(`<head>${links}</head><img src="x.png">`, { allowInstallLinks: true }), []);
  assert.notDeepEqual(checkSingleFile(`<head>${links}</head><a href="page.html">x</a>`, { allowInstallLinks: true }), []);
  assert.notDeepEqual(checkSingleFile(`<head>${links}<link rel="stylesheet" href="a.css"></head>`, { allowInstallLinks: true }), []);
  assert.notDeepEqual(checkSingleFile(`<head><link rel="manifest" href="other.webmanifest"></head>`, { allowInstallLinks: true }), []);
  assert.notDeepEqual(checkSingleFile(`<head><script src="a.js"></script></head>`, { allowInstallLinks: true }), []);
});

test('only index.html may carry the install links', () => {
  const html = '<head><link rel="manifest" href="manifest.webmanifest"></head>';
  assert.deepEqual(checkSingleFile(html, { allowInstallLinks: true }), []);
  assert.notDeepEqual(checkSingleFile(html), []);
});
