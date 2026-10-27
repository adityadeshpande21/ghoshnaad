#!/usr/bin/env node
// Fails if the HTML needs anything outside itself: a linked script or stylesheet, an import, a font or image URL,
// or any http(s) address. The only allowed head links are the install links of index.html (the browser reads them
// for "Add to Home Screen"; the app itself does not need them).
//   node build/check-single-file.mjs dist/Ghoshnaad.html [dist/index.html ...]
import fs from 'node:fs';
import path from 'node:path';

const INSTALL_LINKS = [/^<link rel="manifest" href="manifest\.webmanifest">$/, /^<link rel="apple-touch-icon" href="icons\/apple-touch-icon\.png">$/];
const NAMESPACES = ['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink', 'http://www.w3.org/1999/xhtml'];

// `shownAddresses`: web addresses that appear only as text for the person to read (the app's own website), never fetched.
export function checkSingleFile(html, { allowInstallLinks = false, shownAddresses = [] } = {}) {
  const problems = [];
  // Embedded data (images, fonts, the rachana pack) is not code: blank it so only real references are scanned.
  const code = html
    .replace(/data:[a-z0-9.+\/-]+(;[a-z0-9=-]+)*;base64,[A-Za-z0-9+\/=]+/gi, 'data:BLOB')
    .replace(/window\.GHOSH_PACK="[^"]*"/, 'window.GHOSH_PACK=PACK');
  for (const m of code.matchAll(/<script\b[^>]*\bsrc\s*=/gi)) problems.push(`external script: ${m[0]}`);
  for (const m of code.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (/rel="icon"[^>]*href="data:/.test(tag)) continue;
    if (allowInstallLinks && INSTALL_LINKS.some(re => re.test(tag))) continue;
    problems.push(`linked file: ${tag}`);
  }
  for (const m of code.matchAll(/@import\b[^;]*;/g)) problems.push(`css import: ${m[0]}`);
  for (const m of code.matchAll(/url\(\s*(?!["']?(data:|#))([^)]*)\)/g)) problems.push(`css url: ${m[0]}`);
  for (const m of code.matchAll(/(?<![\w-])(?:src|href|poster|action)\s*=\s*["'](?!data:|#|blob:|javascript:)([^"']+)["']/gi))
    if (!/^<link/.test(code.slice(Math.max(0, m.index - 6), m.index)) && !allowInstallLinks) problems.push(`reference: ${m[0]}`);
  for (const m of code.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) if (!NAMESPACES.includes(m[0]) && !shownAddresses.includes(m[0])) problems.push(`address: ${m[0]}`);
  // A worker made from a Blob (the app's inline timer) is self-contained; any other worker or import is not.
  for (const m of code.matchAll(/\b(?:importScripts|new\s+Worker|new\s+SharedWorker)\s*\((?![^;]{0,80}createObjectURL)/g)) problems.push(`worker/import: ${m[0]}`);
  return [...new Set(problems)];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('usage: check-single-file.mjs <html>...'); process.exit(2); }
  let bad = 0;
  const shownAddresses = [JSON.parse(fs.readFileSync(new URL('../release.json', import.meta.url), 'utf8')).site].filter(Boolean);
  for (const f of files) {
    const p = checkSingleFile(fs.readFileSync(f, 'utf8'), { allowInstallLinks: path.basename(f) === 'index.html', shownAddresses });
    console.log(`${p.length ? '✗' : '✓'} ${f}${p.length ? '' : ' is self-contained'}`);
    p.forEach(x => console.log('    ' + x));
    if (p.length) bad++;
  }
  process.exit(bad ? 1 : 0);
}
