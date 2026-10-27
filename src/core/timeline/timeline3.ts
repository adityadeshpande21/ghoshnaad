/*
 * One part of a ghosh/3 piece -> timed beats and sounds. No DOM, no audio, no dependencies.
 *
 *   const tl = buildTimeline3(piece, 'anak', { tempo: 1 });
 *   tl.beats  : one per matra  { t, dur, key, beat, sam, ganStart, gatStart, charan, pass, tala, yati?, cue?, lyric? }
 *   tl.sounds : one per sounding slot { t, dur, type, swara, octave, vikrit, stroke, foot, accent, slur, grace, swell, key }
 *   tl.total  : seconds; tl.origin: time of the first सम (pickups play before it)
 *
 * Every part shares the same origin, so parts line up without any shifting: the first सम is at
 * the length of the longest first-charan pickup in the piece. A pickup of a later charan overlaps
 * the end of the charan before it (sounds only, no beats).
 * key = "<gan address>.<matra index>" (or "<charan>.p.<at>" for pickups; the गण address for a दीर्घ यति),
 * the same in every part, so a UI can light the whole column.
 */
import type { Beat, Gan3, Matra, Part3, PlayedGan3, Piece3, Slot, Sound, Timeline, TimelineOptions } from '../types.ts';
import { isYati } from '../model.ts';

/** The charan being played: a real one, or the रणन prelude. */
interface Playing { n: number; tala: string; laya: number }
interface MatraCtx { ganStart: boolean; gatStart: boolean; pass: number }

const SOUND_FIELDS = ['swara', 'octave', 'vikrit', 'stroke', 'foot', 'accent', 'fermata', 'swell', 'slur', 'grace', 'hand', 'dev', 'loud'] as const;

export function buildTimeline3(piece: Piece3, partKey: string, opts: TimelineOptions = {}): Timeline {
  const tempo = opts.tempo || 1;
  const R = piece.rhythm, part = piece.parts[partKey];
  const ch = Object.fromEntries(R.charans.map(c => [c.id, c]));
  const segGans: Record<string, Gan3[]> = {};
  part.gans.forEach(g => (segGans[`${g.charan}.${g.seg}`] = segGans[`${g.charan}.${g.seg}`] || []).push(g));
  const pickupOf = (p: Part3, cid: string) => (p.pickups || []).find(x => x.charan === cid);
  const matraSec = (c: Playing) => 60 / c.laya / tempo;
  const pickLen = (p: Part3, cid: string) => { const pk = pickupOf(p, cid); return pk ? pk.matras.reduce((a, m) => a + (m.span || 1), 0) : 0; };

  const firstC = (opts.order === 'performance' && R.performance && R.performance[0].id === 'r') ? null : ch[R.form[0]];
  const origin = firstC ? Math.max(0, ...Object.values(piece.parts).map(p => pickLen(p, firstC.id))) * matraSec(firstC) : 0;
  const beats: Beat[] = [], sounds: Sound[] = [];
  let t = origin, last: Sound | null = null;

  const playMatra = (m: Matra, c: Playing, key: string, ctx: MatraCtx, emitBeat = true) => {
    const tala = R.talas[c.tala], md = matraSec(c), span = m.span || 1, dur = span * md, b = m.beat || 1;
    if (emitBeat) beats.push({ t, dur, key, beat: m.beat || null, sam: b === 1, ganStart: ctx.ganStart, gatStart: ctx.gatStart,
      charan: c.n, pass: ctx.pass, tala: c.tala, ...(m.cue ? { cue: m.cue } : {}), ...(m.lyric ? { lyric: m.lyric } : {}), ...(m.step ? { step: m.step.foot } : {}) });
    if (m.cue) { last = null; t += dur; return; }
    const w = m.slots.map(s => s.w || 1), W = w.reduce((a, x) => a + x, 0) || 1;
    m.slots.forEach((s, k) => {
      const sd = dur * w[k] / W;
      if (s.type === 'hold') { if (last) last.dur += sd; }
      else if (s.type === 'rest') last = null;
      else {
        const snd: Sound = { t, dur: sd, type: s.type, tala: c.tala, matraDur: md, key: `${key}.${k}` };
        for (const f of SOUND_FIELDS) if (s[f] !== undefined) (snd as unknown as Record<string, unknown>)[f] = s[f];
        if (s.type === 'stroke' && tala && tala.roll) snd.rollPerMatra = tala.roll.strokesPerMatra;
        if (k === 0 && m.beat) snd.beat = m.beat;   // where in the tala the sound starts (खेमटा: गट-start accents)
        sounds.push(snd); last = snd;
      }
      t += sd;
    });
  };
  const playGans = (gs: Gan3[], c: Playing, pass: number) => gs.forEach(g => {
    if (isYati(g)) {
      const d = g.span * matraSec(c);
      beats.push({ t, dur: d, key: g.addr, yati: g.yati, span: g.span, charan: c.n, pass, tala: c.tala });
      last = null; t += d; return;
    }
    let mi = 0;
    g.gats.forEach((gt, ti) => gt.matras.forEach((m, j) => playMatra(m, c, `${g.addr}.${mi++}`, { ganStart: ti === 0 && j === 0, gatStart: j === 0, pass })));
  });

  // order: 'printed' (default) plays rhythm.form with each charan's printed repeat;
  // 'performance' plays rhythm.performance: रणन → प्रारंभिक → charans → first charan twice.
  // 'once' plays every charan of rhythm.form one time (no रणन, no closing repeat), except a charan
  // with endings १/२, which still plays twice.
  const usePerf = opts.order === 'performance' && R.performance;
  const order = usePerf ? R.performance!.map(x => ({ ...x }))
    : opts.order === 'once' ? R.form.map(id => ({ id, times: ch[id] && ch[id].segments.length > 1 ? ((ch[id].repeat) || 1) : 1 }))
    : R.form.map(id => ({ id, times: (ch[id] && ch[id].repeat) || 1 }));
  const P = R.prelude;
  const played = new Set<string>();
  order.forEach((step, fi) => {
    const cid = step.id;
    if (cid === 'r' && P) {
      const c: Playing = { n: 0, tala: P.tala, laya: P.laya };
      const silent = (gs: PlayedGan3[]): PlayedGan3[] => gs.map(g => ({ ...g, gats: g.gats.map(x => ({ matras: x.matras.map(m => ({ ...m, slots: m.slots.map((): Slot => ({ type: 'rest' })) })) })) }));
      const pg = (P.parts[partKey] && P.parts[partKey].gans) || silent(P.parts.anak.gans);
      for (let pass = 1; pass <= (step.times || 1); pass++) playGans(pg, c, pass);
      return;
    }
    const c = ch[cid]; if (!c) return;
    const pk = pickupOf(part, cid);
    // a lead-in of the derived parts (ताल वाद्य, कदम) would double the end of what played before it,
    // so it sounds only when nothing comes before it
    if (pk && !played.has(cid) && (part.kind !== 'derived' || fi === 0)) {
      const len = pk.matras.reduce((a, m) => a + (m.span || 1), 0) * matraSec(c);
      const save = t; t -= len; last = null;
      pk.matras.forEach(m => playMatra(m, c, `${cid}.p.${m.at}`, { ganStart: false, gatStart: false, pass: 0 }, fi === 0));
      t = save;
    }
    played.add(cid);
    for (let pass = 1; pass <= (step.times || 1); pass++) {
      playGans(segGans[`${cid}.b`] || [], c, pass);
      const ends = c.segments.filter(s => s !== 'b');
      if (ends.length) { const e = ends.includes(`e${pass}`) ? `e${pass}` : ends[ends.length - 1]; playGans(segGans[`${cid}.${e}`] || [], c, pass); }
    }
  });
  beats.sort((a, b) => a.t - b.t); sounds.sort((a, b) => a.t - b.t);
  // लयभंग (→ / !): the swara is held longer than written — into the silence after it (up to its own length,
  // at most 2 matras, leaving a quarter matra before the next sound), so every part stays on the same clock.
  sounds.forEach((s, i) => {
    if (!s.fermata || s.type !== 'note') return;
    const next = sounds.slice(i + 1).find(x => x.t > s.t + 1e-6), md = s.matraDur;
    const room = next ? next.t - (s.t + s.dur) - 0.25 * md : 2 * md;
    const extra = Math.min(s.dur, 2 * md, room);
    if (extra > 0) { s.dur += extra; s.held = extra; }
  });
  return { beats, sounds, total: t, origin };
}
