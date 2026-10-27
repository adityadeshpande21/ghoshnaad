// Tolerance: float rounding in mixing order may differ by a few millionths; anything audible (a different drum pick,
// a missing or shifted sound) is thousands of times larger. Pass = peak difference under -80 dB and RMS difference under -100 dB.
const MAX_DIFF = 1e-4, RMS_DIFF = 1e-5;
// Differential audio test: the original v1.1.0 sound code and the new TypeScript engine render the same events
// offline, with the same random seed, and the samples are compared. Runs inside the v1.1.0 page, which provides the reference.
import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const LEGACY = path.join(ROOT, 'legacy/v1.1.0/Ghoshnaad.html');
let bundle = '';
test.beforeAll(async () => {
  const r = await build({ entryPoints: [path.join(ROOT, 'src/browser/entry-audio.ts')], bundle: true, format: 'iife', target: 'es2020', write: false });
  bundle = r.outputFiles[0].text;
});

// Everything below runs in the page. `reference` uses the v1.1.0 globals, `subject` the new engine.
async function setup(page) {
  await page.goto('file://' + LEGACY);
  await page.waitForSelector('#rows .row');
  await page.addScriptTag({ content: bundle });
}

const IN_PAGE = `
window.__seedRandom = seed => { let a = seed >>> 0; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
window.__dispatch = (F, it, at, out) => {
  const e = it.s, v = e.loud ? 1.75 : e.accent ? 1 : .72;
  if (e.type === 'step') F.footfall(at, e.foot, out);
  else if (e.stroke === 'dhvam' || e.stroke === 'jham' || e.stroke === 'tam') { const ml = e.dur ? Math.max(.2, e.dur * 1.5) : 0; (e.stroke === 'dhvam' ? F.panav : e.stroke === 'jham' ? F.jhal : F.trib)(at, v, out, ml); }
  else if (e.type === 'stroke') F.playStroke(e, at, out);
  else if (e.type === 'note') F.voices(it.k).forEach(vc => F.playNote({ ...e, pk: it.k }, at, out, vc));
};
window.__compare = (a, b) => { let max = 0, at = -1, sa = 0, sb = 0, sd = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > max) { max = d; at = i; } sa += a[i] * a[i]; sb += b[i] * b[i]; sd += d * d; } return { maxDiff: max, at, rmsA: Math.sqrt(sa / a.length), rmsB: Math.sqrt(sb / b.length), rmsDiff: Math.sqrt(sd / a.length), n: a.length }; };
// v1.1.0 keeps each clip's variants in the order their renders happened to finish; the new engine keeps draw order.
// A stroke picks a variant at random, so the order is not audible. Sort both by content to compare like with like.
window.__sig = b => { const d = b.getChannelData(0); let s = 0; for (let i = 0; i < Math.min(d.length, 4000); i++) s += d[i] * (i % 7 + 1); return s; };
window.__canon = clips => { for (const k in clips) clips[k].sort((a, b) => __sig(a) - __sig(b)); };
window.__settings = { saKeys: { shankh: 10, vanshi: 6 }, artic: 'santar', kanMs: 60 };

// ---- reference: the v1.1.0 code, on its own globals ----
window.__legacyRender = async (seconds, seed, play) => {
  __seedRandom(seed);
  if (typeof ctx === 'undefined' || !ctx) { audio(); }
  for (let i = 0; i < 100 && !(CLIP.hit && CLIP.hit.length === 4 && CLIP.footR && CLIP.footR.length === 2 && CLIP.trib && CLIP.panav && CLIP.panav.length === 2 && CLIP.jhal && CLIP.jhal.length === 3 && CLIP.stick && CLIP.stick.length === 3 && CLIP.click && CLIP.click.length === 2 && CLIP.footL && CLIP.footL.length === 2); i++) await new Promise(r => setTimeout(r, 50));
  __canon(CLIP);
  const sr = ctx.sampleRate, off = new OfflineAudioContext(1, Math.ceil(sr * seconds), sr);
  const live = ctx; ctx = off;
  const comp = off.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(off.destination);
  master = off.createGain(); master.gain.value = .85; master.connect(comp);
  const parts = {}; const outFor = k => parts[k] || (parts[k] = (() => { const g = off.createGain(); g.gain.value = 1; g.connect(master); return g; })());
  artic = __settings.artic; kanMs = __settings.kanMs; saKeys = { ...__settings.saKeys };
  const F = { footfall, panav, jhal, trib, playStroke, playNote, voices: k => [k === 'shankh' ? 'shankh' : 'vanshi'] };
  __seedRandom(seed + 1);
  play(F, outFor, off);
  const buf = await off.startRendering();
  ctx = live;
  return buf.getChannelData(0).slice();
};

// ---- subject: the new engine ----
window.__engineRender = async (seconds, seed, play) => {
  __seedRandom(seed);
  const eng = new GhoshAudio.AudioEngine({ settings: () => ({ ...__settings, saKeys: { ...__settings.saKeys } }) });
  eng.unlock(); await eng.whenReady();
  __canon(eng.drums.clips);
  const sr = eng.ctx.sampleRate, off = new OfflineAudioContext(1, Math.ceil(sr * seconds), sr);
  eng.useContext(off);
  const F = { footfall: (t, f, o) => eng.drums.footfall(t, f, o), panav: (t, v, o, m) => eng.drums.panav(t, v, o, m), jhal: (t, v, o, m) => eng.drums.jhal(t, v, o, m),
    trib: (t, v, o, m) => eng.drums.trib(t, v, o, m), playStroke: (e, t, o) => eng.drums.playStroke(e, t, o), playNote: (e, t, o, vc) => eng.note(e, t, o, vc), voices: k => [k === 'shankh' ? 'shankh' : 'vanshi'] };
  __seedRandom(seed + 1);
  play(F, k => eng.partOutput(k, 1), off);
  const buf = await off.startRendering();
  return buf.getChannelData(0).slice();
};
`;

// piece: first N seconds of every part, all together
const PIECE_PLAY = `(async (id, seconds, tempo) => {
  const piece = await loadJSON('data/r/' + id + '.json');
  const items = []; Object.keys(piece.parts).forEach(k => buildTimeline3(piece, k, { tempo, order: 'performance' }).sounds.forEach(s => items.push({ t: s.t, k, s })));
  items.sort((a, b) => a.t - b.t);
  return items.filter(i => i.t < seconds - 1);
})`;

const TALAS = ['केरवा', 'खेमटा', 'दादरा', 'झपताल', 'रूपक', 'एकताल', 'त्रिताल'];

test.describe('new audio engine sounds the same as v1.1.0', () => {
  test.describe.configure({ mode: 'serial' });

  for (const tala of TALAS) {
    test(`a rachana in ${tala}: every part, 20 s`, async ({ page }) => {
      await setup(page); await page.evaluate(IN_PAGE);
      const res = await page.evaluate(async ({ tala, playSrc }) => {
        const idx = await loadJSON('data/index.json');
        const row = idx.find(r => r.talas[0] === tala && r.parts.includes('anak')) || idx.find(r => r.talas.includes(tala));
        if (!row) return { skipped: true };
        const items = await eval(playSrc)(row.id, 20, 1);
        const play = (F, outFor) => items.forEach(it => __dispatch(F, it, .1 + it.t, outFor(it.k)));
        const a = await __legacyRender(21, 7, play), b = await __engineRender(21, 7, play);
        return { id: row.id, items: items.length, ...__compare(a, b) };
      }, { tala, playSrc: PIECE_PLAY });
      test.skip(res.skipped, `no rachana in ${tala}`);
      console.log(`${tala}: ${res.id}, ${res.items} sounds, max diff ${res.maxDiff.toExponential(2)}, rms diff ${res.rmsDiff.toExponential(2)}, level ${res.rmsA.toFixed(4)}`);
      expect(res.rmsA).toBeGreaterThan(0.001);                       // it really made sound
      expect(res.maxDiff).toBeLessThan(MAX_DIFF); expect(res.rmsDiff).toBeLessThan(RMS_DIFF);
    });
  }

  test('every melody voice, with accents, swells, slurs, grace notes, komal/tivra, octaves and both articulations', async ({ page }) => {
    await setup(page); await page.evaluate(IN_PAGE);
    const res = await page.evaluate(async () => {
      const voices = Object.keys(GhoshAudio.VOICES), out = {};
      const notes = [
        { swara: 'S' }, { swara: 'R', vikrit: true, accent: true }, { swara: 'G', swell: 'grow' }, { swara: 'M', vikrit: true, swell: 'fade' },
        { swara: 'P', slur: 'start' }, { swara: 'D', slur: 'mid' }, { swara: 'N', vikrit: true, slur: 'end' }, { swara: 'S', octave: 1, accent: true, slur: 'single' },
        { swara: 'P', octave: -1 }, { swara: 'G', grace: [{ type: 'note', swara: 'M' }] }, { swara: 'D', accent: true, grace: [{ type: 'note', swara: 'P' }, { type: 'note', swara: 'N' }] },
      ];
      for (const voice of voices) for (const [artic, kan] of [['santar', 60], ['nirantar', 120]]) {
        __settings.artic = artic; __settings.kanMs = kan;
        const play = (F, outFor) => notes.forEach((n, i) => F.playNote({ type: 'note', dur: 0.4 + (i % 3) * 0.15, ...n, pk: voice === 'shankh' ? 'shankh' : 'vanshi' }, .1 + i * .7, outFor('m'), voice));
        const a = await __legacyRender(9, 11, play), b = await __engineRender(9, 11, play);
        out[`${voice}/${artic}`] = __compare(a, b);
      }
      return out;
    });
    for (const [k, r] of Object.entries(res)) { console.log(`${k}: max diff ${r.maxDiff.toExponential(2)}, rms ${r.rmsA.toFixed(4)}`); expect(r.rmsA, k).toBeGreaterThan(0.0005); expect(r.maxDiff, k).toBeLessThan(MAX_DIFF); expect(r.rmsDiff, k).toBeLessThan(RMS_DIFF); }
  });

  test('every drum stroke and ताल वाद्य, with grace strokes, in केरवा and खेमटा rolls', async ({ page }) => {
    await setup(page); await page.evaluate(IN_PAGE);
    const res = await page.evaluate(async () => {
      const strokes = [
        { type: 'stroke', stroke: 'ta' }, { type: 'stroke', stroke: 'ta', accent: true }, { type: 'stroke', stroke: 'tha' }, { type: 'stroke', stroke: 'thra' }, { type: 'stroke', stroke: 'click' },
        { type: 'stroke', stroke: 'ta', grace: [{ stroke: 'ta' }] }, { type: 'stroke', stroke: 'ta', grace: [{ stroke: 'roll' }] },
        { type: 'stroke', stroke: 'roll', tala: 'kerva', rollPerMatra: 4, beat: 1 }, { type: 'stroke', stroke: 'roll', tala: 'khemta', rollPerMatra: 3, beat: 4 },
        { type: 'stroke', stroke: 'roll', tala: 'khemta', beat: 1, accent: true },
        { type: 'stroke', stroke: 'dhvam', dur: .5 }, { type: 'stroke', stroke: 'dhvam', dur: .1, loud: true }, { type: 'stroke', stroke: 'jham', dur: .4 }, { type: 'stroke', stroke: 'tam', dur: .3, accent: true },
        { type: 'step', foot: 'L' }, { type: 'step', foot: 'R' },
      ];
      const play = (F, outFor) => strokes.forEach((s, i) => __dispatch(F, { k: 'anak', s: { dur: .5, matraDur: .5, ...s } }, .1 + i * .8, outFor('d')));
      const a = await __legacyRender(15, 5, play), b = await __engineRender(15, 5, play);
      return __compare(a, b);
    });
    console.log(`drums: max diff ${res.maxDiff.toExponential(2)}, rms ${res.rmsA.toFixed(4)}`);
    expect(res.rmsA).toBeGreaterThan(0.001);
    expect(res.maxDiff).toBeLessThan(MAX_DIFF); expect(res.rmsDiff).toBeLessThan(RMS_DIFF);
  });
});
