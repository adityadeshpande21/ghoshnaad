/*
 * timeline.js — ghosh-notation/2 part -> timed list for an audio engine.
 *
 *   const tl = buildTimeline(piece.parts.anak, { tempo: 1 });
 *   tl.beats  : one entry per matra played  { t, dur, beat, sam, ganStart, gatStart, step, path }
 *   tl.sounds : one entry per sounding slot  { t, dur, type, swara, octave, vikrit, stroke, accent, slur, grace, tala, path }
 *   tl.total  : seconds
 *
 * Holds (ऽ) lengthen the previous sound; rests end it. Repeats, endings, pickups,
 * per-charan laya/tala and part.form are resolved here, so the player only schedules.
 */
'use strict';

function buildTimeline(part, opts = {}) {
  const tempo = opts.tempo || 1;
  const beats = [], sounds = [];
  let t = 0, last = null;
  const byLabel = Object.fromEntries(part.charans.filter(c => c.label).map(c => [String(c.label), c]));
  const order = part.form ? part.form.map(x => byLabel[String(x)] || part.charans[+x - 1]).filter(Boolean) : part.charans;
  const pickedUp = new Set();
  let leadStart = 0;

  const playMatra = (m, ctx, path) => {
    const tala = ctx.tala;
    const span = m.span || 1;
    const mdur = (60 / ctx.laya) / tempo;
    const dur = span * mdur;
    const b = m.beat || 1;
    beats.push({ t, dur, beat: b, sam: b === 1, ganStart: ctx.ganStart, gatStart: ctx.gatStart,
      step: tala.stepMatras ? ((b - 1) % tala.stepMatras === 0 ? (((b - 1) / tala.stepMatras) % 2 === 0 ? 'L' : 'R') : null) : null,
      path, charan: ctx.charan, pass: ctx.pass, cue: m.cue || null, lyric: m.lyric || null, tala });
    if (m.cue) { last = null; t += dur; return; }
    const weights = m.slots.map(s => s.w || 1), W = weights.reduce((a, b) => a + b, 0);
    m.slots.forEach((s, k) => {
      const sd = dur * weights[k] / W;
      const sp = `${path}.${k}`;
      if (s.type === 'hold') { if (last) { last.dur += sd; last.holds.push(sp); } }
      else if (s.type === 'rest') { last = null; }
      else {
        const snd = { t, dur: sd, type: s.type, tala: tala.key, matraDur: mdur, path: sp, holds: [] };
        for (const k2 of ['swara', 'octave', 'vikrit', 'stroke', 'accent', 'fermata', 'swell', 'slur', 'grace', 'hand', 'dev'])
          if (s[k2] !== undefined) snd[k2] = s[k2];
        sounds.push(snd); last = snd;
      }
      t += sd;
    });
  };
  const playLines = (lines, ctx, prefix) => {
    lines.forEach((L, li) => L.gans.forEach((g, gi) => {
      if (g.yati) { const d = g.span * (60 / ctx.laya) / tempo;
        beats.push({ t, dur: d, yati: g.yati, path: `${prefix}.${li}.${gi}`, charan: ctx.charan, pass: ctx.pass }); last = null; t += d; return; }
      g.gats.forEach((gt, ti) => gt.matras.forEach((m, mi) => {
        ctx.ganStart = ti === 0 && mi === 0; ctx.gatStart = mi === 0;
        playMatra(m, ctx, `${prefix}.${li}.${gi}.${ti}.${mi}`);
      }));
    }));
  };

  for (const c of order) {
    const tala = c.tala || part.tala;
    const ctx = { tala, laya: c.laya || tala.laya || part.tala.laya, charan: c.n };
    if (c.pickup && !pickedUp.has(c.n)) {
      if (c === order[0]) leadStart = t;
      pickedUp.add(c.n); ctx.pass = 0;
      c.pickup.forEach((m, mi) => { ctx.ganStart = false; ctx.gatStart = false; playMatra(m, ctx, `${c.n}.p.${mi}`); });
    }
    for (let pass = 1; pass <= (c.repeat || 1); pass++) {
      ctx.pass = pass;
      playLines(c.lines, ctx, `${c.n}.b`);
      const e = c.endings && (c.endings[String(pass)] || c.endings[String(Math.min(pass, 2))]);
      if (e) playLines(e.lines, ctx, `${c.n}.e${c.endings[String(pass)] ? pass : 2}`);
    }
  }
  // lead = time before the first downbeat (pickup of the first charan). Players align parts on
  // the first downbeat by delaying each part by (max lead - own lead).
  const lead = order[0] && order[0].pickup ? order[0].pickup.reduce((a, m) => a + (m.span || 1), 0) * (60 / ((order[0].tala || part.tala).laya || part.tala.laya)) / tempo * 1 : 0;
  return { beats, sounds, total: t, lead };
}

if (typeof module !== 'undefined') module.exports = { buildTimeline };
