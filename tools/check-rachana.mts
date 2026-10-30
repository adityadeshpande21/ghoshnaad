// Checks of the book rachanas (books/<id>.ghosh.json): a changed rachana is checked against everything that should still hold.
//   node tools/check-rachana.mts <id> [<id> …]      one or more (the id is the file name without .ghosh.json)
//   node tools/check-rachana.mts all                every book
//   --dist                                          take the "bundle" from dist/Ghoshnaad.html instead of building the pack
// Per rachana:
//   source     the source equals the bundle's source, and v1.1.0's (except what tests/fixtures/book-corrections.json declares)
//   compiled   the compiled output equals the bundle's compiled file, and v1.1.0's (except the declared corrections: those must differ)
//   symbols    the printed symbols of the source lines, read by the tokenizer, are the symbols of the compiled printed parts (round trip)
//   matras     every गण of a printed part has the matras its tala asks for (a text cue such as "ॐ":4 counts its span, not one)
//   end        all parts end together
// A crash is a failure, never a pass. Exit code 1 when anything fails.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { compile3, buildTimeline3, tokenize } from '../src/core/index.ts';
import { buildPack } from '../build/lib/pack.mjs';
import { legacyPack, stable, withoutStamp, talas, loadCorrections, applyCorrections } from '../tests/golden/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** One declared change to a book, in tests/fixtures/book-corrections.json. */
export interface Correction { fix: string; id: string; part: string; line: number; before: string; after: string; reason: string }
export interface Context { bundle: Record<string, any>; legacy: Record<string, any>; corrections: Correction[] }
export interface Result { id: string; failures: string[]; notes: string[] }

/** The pack the build embeds; or the one inside dist/Ghoshnaad.html. */
export function loadBundle(fromDist = false): Record<string, any> {
  if (!fromDist) return buildPack(ROOT, { stamp: '2026-01-01T00:00:00.000Z' }).pack;
  const html = fs.readFileSync(path.join(ROOT, 'dist/Ghoshnaad.html'), 'utf8');
  const m = html.match(/window\.GHOSH_PACK="([^"]+)"/);
  if (!m) throw new Error('dist/Ghoshnaad.html has no pack');
  return JSON.parse(zlib.gunzipSync(Buffer.from(m[1]!, 'base64')).toString('utf8'));
}
export const context = (fromDist = false): Context => ({ bundle: loadBundle(fromDist), legacy: legacyPack(), corrections: loadCorrections() as Correction[] });

const lineText = (l: any): string => (typeof l === 'string' ? l : String(l?.t ?? ''));
const same = (a: unknown, b: unknown): boolean => stable(a) === stable(b);

/** One printed symbol in a canonical form, from the tokenizer's reading or from a compiled slot. */
const mods = (m: any): string => [m?.accent ? 'a' : '', m?.fermata ? 'f' : '', m?.swell ?? '', m?.uncertain ? 'u' : ''].join('');
const fromSym = (s: any): string => (s.kind === 'note' ? `n:${s.dev}:${s.oct ?? 0}:${s.vikrit ? 1 : 0}:${mods(s.mods)}` : s.kind === 'stroke' ? `s:${s.stroke ?? s.dev}:${mods(s.mods)}` : `${s.kind}:${mods(s.mods)}`);
const fromSlot = (s: any): string => (s.type === 'note' ? `n:${s.dev}:${s.octave ?? 0}:${s.vikrit ? 1 : 0}:${mods(s)}` : s.type === 'stroke' ? `s:${s.stroke ?? s.dev}:${mods(s)}` : `${s.type}:${mods(s)}`);

function sourceSymbols(lines: any[]): string[] {
  const out: string[] = [];
  lines.forEach((l, i) => {
    // labels (#…), directives (@…) and quoted cues are tokens of their own, not symbols; the tokenizer reads them and we skip them
    let open = -1;
    for (const t of tokenize(lineText(l), i) as any[]) {
      if (t.t === 'gopen') open = out.length;
      else if (t.t === 'gclose') {
        // [ … ]!< : the marks after a group close belong to every symbol in the group
        const group = out.splice(open < 0 ? out.length : open);
        for (const s of group as any[]) out.push({ ...s, sym: { ...s.sym, mods: { ...s.sym.mods, ...t.mods } } } as any);
        open = -1;
      } else if (t.t === 'sym' || t.t === 'grace') out.push({ sym: t.sym } as any);
    }
  });
  return out.map((s: any) => fromSym(s.sym));
}
function compiledSymbols(part: any): string[] {
  const out: string[] = [];
  const slots = (matras: any[]) => (matras ?? []).forEach(m => (m.slots ?? []).forEach((s: any) => { out.push(fromSlot(s)); (s.grace ?? []).forEach((g: any) => out.push(fromSlot(g))); }));
  (part.pickups ?? []).forEach((p: any) => slots(p.matras));
  (part.gans ?? []).forEach((g: any) => (g.gats ?? []).forEach((t: any) => slots(t.matras)));
  return out;
}
const span = (m: any): number => m.span ?? 1;             // a text cue holds several matras

export function checkRachana(id: string, ctx: Context, opts: { src?: any } = {}): Result {
  const r: Result = { id, failures: [], notes: [] };
  const fail = (m: string) => r.failures.push(m);
  try {
    const file = path.join(ROOT, 'books', `${id}.ghosh.json`);
    const src = opts.src ?? JSON.parse(fs.readFileSync(file, 'utf8'));
    const fixes = ctx.corrections.filter(c => c.id === id);

    // source: bundle, and v1.1.0 with the declared corrections applied
    const bundleSrc = ctx.bundle[`data/src/${id}.json`], legacySrc = ctx.legacy[`data/src/${id}.json`];
    if (!bundleSrc) fail('the bundle has no source for this rachana');
    else if (!same(src, bundleSrc)) fail('the source differs from the bundle\'s source');
    if (!legacySrc) fail('v1.1.0 has no source for this rachana');
    else {
      const { src: expected, problems } = applyCorrections(legacySrc, fixes);
      problems.forEach(fail);
      if (!same(src, expected)) fail(fixes.length ? `the source is not v1.1.0's with the declared corrections (${fixes.map(c => c.fix).join(', ')}) applied` : 'the source differs from v1.1.0\'s source');
      else if (fixes.length) r.notes.push(`corrected on purpose: ${fixes.map(c => c.fix).join(', ')}`);
    }

    // compiled
    const { piece, warnings } = compile3(src, { talas });
    const bundleC = ctx.bundle[`data/r/${id}.json`], legacyC = ctx.legacy[`data/r/${id}.json`];
    if (!bundleC) fail('the bundle has no compiled file for this rachana');
    else if (!same(withoutStamp(piece), withoutStamp(bundleC))) fail('the compiled output differs from the bundle\'s compiled file');
    if (!legacyC) fail('v1.1.0 has no compiled file for this rachana');
    else {
      const equal = same(withoutStamp(piece), withoutStamp(legacyC));
      if (fixes.length && equal) fail('the declared corrections change nothing in the compiled output');
      else if (!fixes.length && !equal) fail('the compiled output differs from v1.1.0\'s');
    }
    if (warnings.length) r.notes.push(`${warnings.length} compile warning${warnings.length > 1 ? 's' : ''}: ${warnings.slice(0, 3).map((w: any) => w.message ?? JSON.stringify(w)).join(' | ')}`);

    // symbols: the round trip of every printed part
    for (const [name, part] of Object.entries<any>(piece.parts)) {
      if (part.kind !== 'printed') continue;
      const srcLines = src.parts?.[name]?.lines;
      if (!Array.isArray(srcLines)) { fail(`${name}: the source has no lines`); continue; }
      const a = sourceSymbols(srcLines).sort(), b = compiledSymbols(part).sort();
      if (a.length !== b.length) fail(`${name}: ${a.length} printed symbols in the source, ${b.length} in the compiled part`);
      else { const at = a.findIndex((x, i) => x !== b[i]); if (at >= 0) fail(`${name}: the symbols differ (source ${a[at]}, compiled ${b[at]})`); }
    }

    // matras: every गण has what its tala asks for
    const charans = new Map<string, any>((piece.rhythm?.charans ?? []).map((c: any) => [c.id, c]));
    for (const [name, part] of Object.entries<any>(piece.parts)) {
      if (part.kind !== 'printed') continue;
      for (const g of part.gans ?? []) {
        const c = charans.get(g.charan), tala = c && piece.rhythm?.talas?.[c.tala];
        if (!tala) { fail(`${name} ${g.addr}: no tala for charan ${g.charan}`); continue; }
        if (g.short) continue;                                              // a short गण (॥ स ऽ – ॥, "partial" in the source) is short on purpose
        if (g.yati) { if (g.span !== g.yati * tala.ganSize) fail(`${name} line ${g.line}, ${g.addr}: a pause of ${g.yati} गण spans ${g.span} matras, ${tala.name?.dev ?? c.tala} has ${tala.ganSize} per गण`); continue; }   // @yati=n: n गण of silence
        const got = (g.gats ?? []).reduce((n: number, t: any) => n + (t.matras ?? []).reduce((m: number, x: any) => m + span(x), 0), 0);
        if (got !== tala.ganSize) fail(`${name} line ${g.line}, ${g.addr}: ${got} matras, ${tala.name?.dev ?? c.tala} asks for ${tala.ganSize} per गण`);
      }
    }

    // end: all parts together
    const totals = Object.keys(piece.parts).map(p => [p, (buildTimeline3 as any)(piece, p, { tempo: 1, order: 'printed' }).total] as const);
    const first = totals[0]?.[1] ?? 0;
    const off = totals.filter(([, t]) => Math.abs(t - first) > 1e-6);
    if (off.length) fail(`the parts do not end together: ${totals.map(([p, t]) => `${p} ${t.toFixed(3)}`).join(', ')}`);
    else r.notes.push(`${first.toFixed(1)} s`);
    // a corrected rachana: does it still last as long as in v1.1.0, in every play order? (a note, not a failure: a fix may change the length on purpose)
    if (fixes.length && legacyC) {
      const len = (p: any, order: string) => Object.keys(p.parts).map(n => (buildTimeline3 as any)(p, n, { tempo: 1, order }).total);
      const moved = ['printed', 'performance', 'once'].filter(o => !same(len(piece, o).map(x => +x.toFixed(6)), len(legacyC, o).map(x => +x.toFixed(6))));
      r.notes.push(moved.length ? `length changed in: ${moved.join(', ')}` : 'length unchanged in every order');
    }
  } catch (e) {
    fail(`crashed: ${(e as Error).message.split('\n')[0]}`);                 // a crash is a failure, never a pass
  }
  return r;
}

export const allIds = (): string[] => fs.readdirSync(path.join(ROOT, 'books')).filter(f => f.endsWith('.ghosh.json')).map(f => f.slice(0, -'.ghosh.json'.length)).sort();

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2), dist = args.includes('--dist'), ids = args.filter(a => !a.startsWith('--'));
  if (!ids.length) { console.error('usage: node tools/check-rachana.mts <id>… | all  [--dist]'); process.exit(2); }
  const ctx = context(dist);
  let bad = 0;
  for (const id of ids[0] === 'all' ? allIds() : ids) {
    const r = checkRachana(id, ctx);
    if (r.failures.length) bad++;
    if (r.failures.length || ids[0] !== 'all') console.log(`${r.failures.length ? '✗' : '✓'} ${id}${r.notes.length ? '  (' + r.notes.join('; ') + ')' : ''}`);
    for (const f of r.failures) console.log(`    ${f}`);
  }
  console.log(bad ? `✗ ${bad} rachana${bad > 1 ? 's' : ''} failed` : '✓ every rachana passed');
  process.exit(bad ? 1 : 0);
}
