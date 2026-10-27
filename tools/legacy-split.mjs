#!/usr/bin/env node
// Split a v1 single-file HTML into readable parts and rebuild it byte-for-byte.
//   node tools/legacy-split.mjs split  <html> <outDir>   write parts + manifest.json
//   node tools/legacy-split.mjs verify <html> <outDir>   rebuild from parts, fail on any byte difference
//
// Three blocks are generated in v2 and are not kept as parts: the rachana pack, fflate and the compiler bundle.
// They stay in the manifest as {gen: name}; `verify` takes their text from the original file to prove the split is lossless.
import fs from 'node:fs';
import path from 'node:path';

const GEN = [
  [/^\s*window\.GHOSH_PACK=/, 'pack'],
  [/^\s*\/\* fflate /, 'fflate'],
  [/window\.GhoshCompile=\{/, 'compiler'],
  [/window\.GhoshAudio=/, 'audio'],
  [/window\.GhoshPlatform=/, 'platformlib'],
  [/window\.Composer=/, 'composercore'],
  [/window\.ScoreView=/, 'scoreview'],
  [/window\.I18n=/, 'i18n'],
  [/window\.buildTimeline3=/, 'timeline'],
  [/ScreenApp:[\w$]+,Sanket:/, 'screens'],
];

function segments(html) {
  const out = []; let i = 0;
  const open = /<(script|style)>/g;
  while (i < html.length) {
    open.lastIndex = i;
    const m = open.exec(html);
    if (!m) { out.push({ kind: 'raw', text: html.slice(i) }); break; }
    if (m.index > i) out.push({ kind: 'raw', text: html.slice(i, m.index) });
    const bodyStart = m.index + m[0].length;
    const end = html.indexOf(`</${m[1]}>`, bodyStart);
    if (end < 0) throw new Error(`unclosed <${m[1]}> at ${m.index}`);
    out.push({ kind: m[1], text: html.slice(bodyStart, end) });
    i = end + m[1].length + 3;
  }
  return out;
}

function partName(seg, used) {
  const head = seg.text.slice(0, 600);
  const c = head.match(/^\s*\/\*\s*(?:\*\s*)?([\w-]+)\.js\b/);       // "/* composer.js — ..."
  let n = c ? c[1]
    : seg.kind === 'style' ? (seg.text.length < 200 ? 'reset' : 'app')
    : /^\s*'use strict';\s*const \$=/.test(head) ? 'app'
    : /घोषदंड संकेत/.test(head) ? 'sanket'
    : 'part';
  let name = n, k = 2; while (used.has(name + '.' + ext(seg))) name = `${n}-${k++}`;
  return name + '.' + ext(seg);
}
const ext = s => (s.kind === 'style' ? 'css' : s.kind === 'script' ? 'js' : 'html');

export function split(htmlPath, outDir) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const used = new Set(), manifest = []; let raw = 0;
  for (const s of segments(html)) {
    const gen = s.kind === 'script' && GEN.find(([re]) => re.test(s.text));
    if (gen) { manifest.push({ kind: 'script', gen: gen[1] }); continue; }
    const file = s.kind === 'raw' ? `raw-${String(raw++).padStart(2, '0')}.html` : partName(s, used);
    used.add(file);
    fs.writeFileSync(path.join(outDir, file), s.text);
    manifest.push({ kind: s.kind, file });
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  return manifest;
}

export function assemble(outDir, genText = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'));
  return manifest.map(m => {
    const text = m.gen ? genText[m.gen] : fs.readFileSync(path.join(outDir, m.file), 'utf8');
    if (text === undefined) throw new Error(`no text for generated block "${m.gen}"`);
    return m.kind === 'raw' ? text : `<${m.kind}>${text}</${m.kind}>`;
  }).join('');
}

function main() {
  const [cmd, htmlPath, outDir] = process.argv.slice(2);
  if (!['split', 'verify'].includes(cmd) || !htmlPath || !outDir) { console.error('usage: legacy-split.mjs split|verify <html> <outDir>'); process.exit(2); }
  if (cmd === 'split') {
    const m = split(htmlPath, outDir);
    console.log(`${htmlPath}: ${m.length} segments -> ${outDir}`);
    m.forEach(x => console.log('  ', x.kind.padEnd(6), x.gen ? `[generated: ${x.gen}]` : x.file));
    return;
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const genText = {};
  for (const s of segments(html)) { const g = s.kind === 'script' && GEN.find(([re]) => re.test(s.text)); if (g) genText[g[1]] = s.text; }
  const rebuilt = assemble(outDir, genText);
  if (rebuilt === html) { console.log(`✓ ${htmlPath}: rebuilt from ${outDir}, byte-identical (${html.length} chars)`); return; }
  let d = 0; while (rebuilt[d] === html[d]) d++;
  console.error(`✗ ${htmlPath}: differs at char ${d}\n  original: ${JSON.stringify(html.slice(d, d + 60))}\n  rebuilt:  ${JSON.stringify(rebuilt.slice(d, d + 60))}`);
  process.exit(1);
}
if (import.meta.url === `file://${process.argv[1]}`) main();
