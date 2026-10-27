/*
 * Authoring file (ghosh-notation/1) -> standalone ghosh/3 file.
 *
 *   const { piece, warnings } = compile3(sourceJson, { talas });   // talas = rules/talas.json
 *
 * The output needs nothing else: the talas it uses, the ताल वाद्य and कदम parts (written out
 * note by note from the tala rules), the book layout and the provenance are all inside it.
 *
 * Layers:
 *   meta        what it is (names, raga, verse, usage, performance)
 *   rhythm      shared by every part: talas, charans (ids c1, c2 …), play order, count-in
 *   parts       printed parts (शंख/वंशी/आनक) and derived parts (पणव, झल्लरी, त्रिभुज, कदम);
 *               every गण has an address "<charan>.<b|e1|e2>.<index>" that is the same in every part,
 *               so parts line up by address, not by time
 *   layout      the book's printed lines, as lists of addresses, per part
 *   provenance  book, page, status (kept for checking, not for display)
 *   media       reference recordings
 */
import type {
  Charan3, Gan3, PlayedGan3, Gat, LayoutLine, Matra, Part3, PerformanceStep, Pickup, Piece3, Prelude, Slot, SourcePiece,
  TalaDef, TalaLibrary, TalaTable, Warning,
} from '../types.ts';
import { compilePiece } from './shorthand.ts';
import { tableOf } from '../tala.ts';
import { isYati } from '../model.ts';

const MELODY = ['shankh', 'vanshi'];
const TAL_VADYA: Record<string, { stroke: string; dev: string }> = {
  panav: { stroke: 'dhvam', dev: 'ध्व' }, jhallari: { stroke: 'jham', dev: 'झ' }, tribhuj: { stroke: 'tam', dev: 'ट' },
};
const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));

/** One गण of the lead part with the beat number and length of each of its matras. */
interface GridGan { g: Gan3; t: TalaDef; beats: number[]; spans: number[] }
interface PickMatra { at: number; beat: number; span: number }
type DeriveKind = 'tv' | 'step';

export interface Compile3Options { talas: TalaLibrary | TalaTable; now?: string }

export function compile3(src: SourcePiece, { talas, now = new Date().toISOString() }: Compile3Options): { piece: Piece3; warnings: Warning[] } {
  if (!talas) throw new Error('compile3 needs the tala library (rules/talas.json)');
  const T = tableOf(talas);
  const { piece: v2, warnings } = compilePiece(src, T);
  const opts = src.options || {};
  const printed = Object.keys(v2.parts);
  const lead = MELODY.find(k => v2.parts[k]) || printed[0];
  const L = v2.parts[lead];
  const warn = (part: string, msg: string) => warnings.push({ part, msg });

  /* ---------- rhythm: charans shared by all parts ---------- */
  const used = new Set<string>();
  const charans: Charan3[] = L.charans.map(c => {
    const t = c.tala || L.tala; used.add(t.key);
    const o: Charan3 = { id: `c${c.n}`, n: c.n, repeat: 0, tala: '', laya: 0, segments: [] };
    if (c.label) o.label = c.label;
    if (c.type) o.type = c.type;
    o.repeat = c.repeat;
    o.tala = t.key;
    o.laya = c.laya || t.laya || L.tala.laya;
    if (c.players) o.players = c.players;
    if (c.notes) o.notes = c.notes;
    // endings: union over every printed part (a part may print क्रमभेद endings the lead does not)
    const ens = new Set<number>();
    printed.forEach(k => { const pc = v2.parts[k].charans.find(x => x.n === c.n); Object.keys((pc && pc.endings) || {}).forEach(n => ens.add(+n)); });
    o.segments = ['b', ...[...ens].sort((a, b) => a - b).map(n => `e${n}`)];
    return o;
  });
  // प्रारंभिक: the single opening line printed before the first charan (॥ॐ॥ … ॥, no repeat) is not a
  // charan. Every printed part must open with one line, and the rachana must have more after it.
  // In प्रचलन and मंद गति rachanas any opening block printed once (no :॥, no endings) is the प्रारंभिक;
  // in नैमित्तिक pieces only a single printed line counts.
  const isRachana = /^(prachalan|mand)-/.test(src.section || '');
  const onceOnly = (c: (typeof L.charans)[number] | undefined) => !!c && c.repeat === 1 && !Object.keys(c.endings || {}).length;
  const oneLine = (c: (typeof L.charans)[number] | undefined) => onceOnly(c) && (isRachana || new Set((c!.lines || []).map(l => l.line)).size === 1);
  if (charans.length > 1 && !charans[0].type && printed.every(k => oneLine(v2.parts[k].charans[0]))) {
    charans[0].type = 'prarambhik'; if (!charans[0].label) charans[0].label = 'प्रारंभिक';
  }
  // a charan that is only a short closing गण (॥ स ऽ – ॥) is a closing tag
  L.charans.forEach((c, i) => { const gs = (c.lines || []).flatMap(l => l.gans); if (gs.length && gs.every(g => g.short)) charans[i].role = 'closing-tag'; });
  { let no = 0; charans.forEach(c => { if (!c.type || c.type === 'normal' || c.type === 'dhruv') { if (c.role !== 'closing-tag') c.no = ++no; } }); }
  printed.forEach(k => {
    const p = v2.parts[k];
    if (p.charans.length !== L.charans.length) warn(k, `has ${p.charans.length} charans, ${lead} has ${L.charans.length}; parts are matched by charan number`);
    p.charans.forEach((c, i) => { const lc = L.charans[i]; if (lc && c.repeat !== lc.repeat) warn(k, `charan ${c.n} repeats ${c.repeat}×, ${lead} ${lc.repeat}×`); });
  });
  const byLabel = Object.fromEntries(L.charans.filter(c => c.label).map(c => [String(c.label), `c${c.n}`]));
  const form: string[] = L.form
    ? L.form.map(x => byLabel[String(x)] || (L.charans[+x - 1] ? `c${+x}` : null)).filter((x): x is string => !!x)
    : charans.map(c => c.id);
  const talaDefs: TalaTable = {};
  [...used].forEach(k => {
    if (!T[k]) { warn('*', `tala ${k} is missing from the library`); return; }
    const d = clone(T[k]);
    const v = (opts.talVadya && opts.talVadya[k]) || d.talVadya.default;
    if (!d.talVadya.variants[v]) warn('*', `ताल वाद्य variant ${v} not defined for ${k}`);
    d.talVadya.use = v;
    talaDefs[k] = d;
  });
  const first = charans[0] ? talaDefs[charans[0].tala] : null;
  const standing = !!src.standing || !first || !first.steps;
  const perfMode = { mode: standing ? 'standing' : first!.steps!.gait };
  // अंक-ताल before playing (घोष परिचय p. 26): "एक दो, एक दो" for केरवा / खेमटा (one count per step),
  // "एक दो तीन, एक दो तीन" for दादरा (one count per matra); the रणन then starts in that tempo.
  const dadraStart = !!first && !!first.steps && first.steps.gait === 'mandchal' && first.steps.matrasPerStep === 3;
  const countIn = dadraStart
    ? { count: 6, words: ['एक', 'दो', 'तीन', 'एक', 'दो', 'तीन'], matras: 1, on: 'count', note: 'अंक-ताल (घोष परिचय p. 26)' }
    : { count: 4, words: ['एक', 'दो', 'एक', 'दो'], matras: (first && first.steps && !src.standing ? first.steps.matrasPerStep : 2), on: 'count', note: 'अंक-ताल (घोष परिचय p. 26)' };

  /* ---------- printed parts ---------- */
  const parts: Record<string, Part3> = {};
  const layout: Piece3['layout'] = { lead, header: { left: 'instruments', center: 'title', right: 'tala' }, pickupPlacement: 'above-line-end', parts: {} };
  printed.forEach(k => {
    const p = v2.parts[k], gans: Gan3[] = [], pickups: Pickup[] = [], lines: LayoutLine[] = [];
    let cur: LayoutLine | null = null;
    p.charans.forEach((c, ci) => {
      const cid = `c${ci + 1}`;
      if (c.pickup) {
        const tot = c.pickup.reduce((a, m) => a + (m.span || 1), 0); let at = -tot;
        pickups.push({ charan: cid, matras: c.pickup.map(m => { const o: Matra = { at, ...clone(m) }; at += m.span || 1; return o; }) });
        lines.push({ pickup: cid, gans: [] }); cur = null;
      }
      const segs: [string, (typeof c.lines)][] = [['b', c.lines], ...Object.entries(c.endings || {}).map(([n, e]): [string, typeof c.lines] => [`e${n}`, e.lines])];
      segs.forEach(([seg, ls]) => {
        let idx = 0;
        ls.forEach(line => line.gans.forEach(g => {
          const addr = `${cid}.${seg}.${idx++}`;
          const at = { addr, charan: cid, seg, line: line.line };
          const o: Gan3 = g.yati ? { ...at, yati: g.yati, span: g.span! } : { ...at, ...(g.short ? { short: true } : {}), gats: clone(g.gats) };
          gans.push(o);
          // book lines: same printed line stays together; a short closing tag joins the line before it
          const join = cur && (g.short || cur.line === line.line);
          if (!join) { cur = { line: line.line, gans: [], src: [] }; lines.push(cur); }
          cur!.gans.push(addr);
          const srcs = cur!.src as string[];
          if (line.src && !srcs.includes(line.src)) srcs.push(line.src);
        }));
      });
    });
    lines.forEach(l => { if (l.src) l.src = (l.src as string[]).join('  '); delete l.line; });
    parts[k] = { instrument: k, role: MELODY.includes(k) ? 'melody' : 'anak', kind: 'printed', ...(pickups.length ? { pickups } : {}), gans };
    layout.parts[k] = { lines };
  });

  /* ---------- derived parts: ताल वाद्य and कदम, written out from the lead's grid ---------- */
  const leadP = parts[lead];
  const cById = Object.fromEntries(charans.map(c => [c.id, c]));
  // grid of the lead: for each गण the list of beat numbers (yati gans get theirs from the previous beat)
  let prevBeat = 0;
  const grid: GridGan[] = leadP.gans.map(g => {
    const t = talaDefs[cById[g.charan].tala];
    if (isYati(g)) {
      const beats: number[] = [];
      for (let j = 0; j < g.span!; j++) beats.push(((prevBeat + j) % t.cycle) + 1);
      prevBeat = beats[beats.length - 1];
      return { g, t, beats, spans: beats.map(() => 1) };
    }
    const ms = g.gats.flatMap(x => x.matras); const beats = ms.map(m => m.beat!); if (beats.length) prevBeat = beats[beats.length - 1];
    return { g, t, beats, spans: ms.map(m => m.span || 1) };
  });
  // pickups: the longest one any printed part has, per charan
  const pick: Record<string, PickMatra[]> = {};
  Object.values(parts).forEach(p => (p.pickups || []).forEach(pk => {
    if (!pick[pk.charan] || pk.matras.length > pick[pk.charan].length) pick[pk.charan] = pk.matras.map(m => ({ at: m.at!, beat: m.beat!, span: m.span || 1 }));
  }));

  const variantBeats = (t: TalaDef) => new Set(t.talVadya.variants[t.talVadya.use!].beats);
  // ताल वाद्य are silent on a beat where the आनक has – (rest) or + : the matra starts with one of them
  // (or, with no आनक, where the lead starts the matra with a rest).
  const quietP = parts.anak || leadP;
  const quietGan: Record<string, Matra[]> = {}, quietPick: Record<string, Record<number, Matra>> = {};
  quietP.gans.forEach(g => { if (!isYati(g)) quietGan[g.addr] = g.gats.flatMap(x => x.matras); });
  (quietP.pickups || []).forEach(pk => { quietPick[pk.charan] = Object.fromEntries(pk.matras.map(m => [m.at!, m])); });
  // पणव (and with it झल्लरी, त्रिभुज) plays on every step — also where the आनक rests or has a यती — but not on आनक +
  const isQuiet = (m: Matra | undefined) => { const s = m && !m.cue && m.slots && m.slots[0]; return !!s && s.type === 'stroke' && s.stroke === 'click'; };
  const spanOf = (span: number) => (span > 1 ? { span } : {});
  const tvMatra = (t: TalaDef, beat: number, span: number, inst: string, qm: Matra | undefined): Matra => {
    if (isQuiet(qm)) return { beat, ...spanOf(span), slots: [{ type: 'rest' }] };
    const on = beat && variantBeats(t).has(beat);
    return { beat, ...spanOf(span), slots: [on ? { type: 'stroke', stroke: TAL_VADYA[inst].stroke, dev: TAL_VADYA[inst].dev, ...(beat === 1 ? { accent: true } : {}) } : { type: 'hold' }] };
  };
  const stepMatra = (t: TalaDef, beat: number, span: number, remaining: number): Matra => {
    const sm = t.steps && t.steps.matrasPerStep;
    if (sm && beat && (beat - 1) % sm === 0) {
      const foot = ((beat - 1) / sm) % 2 ? 'R' : 'L';
      return { beat, ...spanOf(span), step: { foot, matras: Math.min(sm, remaining) }, slots: [{ type: 'step', foot }] };
    }
    return { beat, ...spanOf(span), slots: [{ type: 'hold' }] };
  };
  const derive = (inst: string, kind: DeriveKind) => {
    const gans: PlayedGan3[] = grid.map(({ g, t, beats, spans }) => {
      const qms = quietGan[g.addr] || [];
      const ms = beats.map((b, i) => kind === 'step' ? stepMatra(t, b, spans[i], beats.length - i) : tvMatra(t, b, spans[i], inst, qms[i]));
      const o: PlayedGan3 = { addr: g.addr, charan: g.charan, seg: g.seg, line: g.line, gats: [{ matras: ms }] };
      if (!isYati(g) && g.short) o.short = true;
      return o;
    });
    const pickups: Pickup[] = Object.entries(pick).map(([cid, ms]) => {
      const t = talaDefs[cById[cid].tala];
      return { charan: cid, matras: ms.map((m, i): Matra => ({ at: m.at, ...(kind === 'step' ? stepMatra(t, m.beat, m.span, ms.length - i) : tvMatra(t, m.beat, m.span, inst, (quietPick[cid] || {})[m.at])) })) };
    });
    return { gans, pickups };
  };
  const ruleOf = () => Object.fromEntries(Object.entries(talaDefs).map(([k, t]) => [k, { variant: t.talVadya.use, beats: t.talVadya.variants[t.talVadya.use!].beats, confidence: t.talVadya.variants[t.talVadya.use!].confidence }]));
  // चरणाचा शेवट: on the last step of every charan (each ending of a charan with endings) the पणव is silent,
  // and झल्लरी + त्रिभुज play loud instead.
  const endStroke = (inst: string): Slot => inst === 'panav' ? { type: 'rest' } : { type: 'stroke', stroke: TAL_VADYA[inst].stroke, dev: TAL_VADYA[inst].dev, accent: true, loud: true };
  const markCharanEnds = (inst: string, gans: PlayedGan3[]) => charans.forEach(c => {
    const t = talaDefs[c.tala]; if (!t) return;
    const ends = c.segments.length > 1 ? c.segments.filter(s => s !== 'b') : ['b'];
    ends.forEach(seg => {
      const g = [...gans].reverse().find(x => x.charan === c.id && x.seg === seg); if (!g) return;
      const ms = g.gats.flatMap(x => x.matras);
      const m = [...ms].reverse().find(x => x.beat && variantBeats(t).has(x.beat)); if (!m) return;
      m.slots = [endStroke(inst)]; m.charanEnd = true;
    });
  });
  // ताल वाद्ये go with the आनक: a piece with only शंख (or वंशी), e.g. संघोष, has none.
  if (parts.anak) Object.keys(TAL_VADYA).forEach(inst => {
    const d = derive(inst, 'tv');
    markCharanEnds(inst, d.gans);
    parts[inst] = {
      instrument: inst, role: 'tal-vadya', kind: 'derived',
      rule: { from: 'tala.talVadya', talas: ruleOf(), silentOn: { part: parts.anak ? 'anak' : lead, when: parts.anak ? ['+'] : [], confidence: 'confirmed' }, charanEnd: { panav: 'silent', others: 'loud', on: 'last step of each charan' } },
      ...(d.pickups.length ? { pickups: d.pickups } : {}), gans: d.gans,
    };
  });
  if (!standing) {
    const d = derive('steps', 'step');
    parts.steps = {
      instrument: 'steps', role: 'steps', kind: 'derived',
      rule: { from: 'tala.steps', talas: Object.fromEntries(Object.entries(talaDefs).filter(([, t]) => t.steps).map(([k, t]) => [k, t.steps])), start: { foot: 'L', on: 'सम', confidence: 'assumed' } },
      ...(d.pickups.length ? { pickups: d.pickups } : {}), gans: d.gans,
    };
  }

  // band score: the lead's printed lines, with a pickup line before any charan that some part picks up into
  const leadLines = layout.parts[lead].lines.map(l => ({ ...l, gans: [...l.gans] }));
  const band: LayoutLine[] = [];
  leadLines.forEach(l => {
    const firstC = l.gans.length ? l.gans.find(a => /\.b\.0$/.test(a)) : undefined;
    const cid = firstC && firstC.split('.')[0];
    if (cid && pick[cid] && !band.some(x => x.pickup === cid)) band.push({ pickup: cid, gans: [] });
    if (!(l.pickup && band.some(x => x.pickup === l.pickup))) band.push(l);
  });
  layout.band = { lines: band };

  /* ---------- रणन and the full-performance order ---------- */
  // पूर्ण रचना वादन: रणन (आनक, one line = 8 steps) → प्रारंभिक (if any) → every charan as printed
  // (:॥ = twice) → the first charan again, twice. रणन for दादरा / मंदचाल is not known yet (none).
  // रणन is always in केरवा (also before a खेमटा rachana), at the rachana's step speed.
  const RANAN = { line: '॥ त्र ऽ | त – | त्र ऽ | त – ॥', note: 'त्रऽऽ, ऽऽऽ, त – (दोनदा) — एक ओळ, आठ पावले' };
  let prelude: Prelude | null = null;
  const t0 = charans[0] && charans[0].tala;
  if (isRachana && t0 && talaDefs[t0] && ['kerva', 'khemta'].includes(t0) && T.kerva) {
    if (!talaDefs.kerva) { const d = clone(T.kerva); d.talVadya.use = d.talVadya.default; talaDefs.kerva = d; }
    const td = talaDefs.kerva, tf = talaDefs[t0];
    const rLaya = Math.round(charans[0].laya * td.steps!.matrasPerStep / tf.steps!.matrasPerStep);
    const mini = compilePiece({ format: 'ghosh-notation/1', id: 'ranan', kind: 'rachana', title: { dev: 'रणन' }, section: src.section,
      parts: { anak: { tala: 'केरवा', laya: rLaya, lines: [RANAN.line] } } }, T);
    const mc = mini.piece.parts.anak.charans[0];
    let idx = 0; const ag: PlayedGan3[] = [];
    mc.lines.forEach(line => line.gans.forEach(g => ag.push({ addr: `r.b.${idx++}`, charan: 'r', seg: 'b', gats: clone(g.gats) })));
    const pparts: Prelude['parts'] = { anak: { gans: ag } };
    // ताल वाद्य in रणन: on every step except the 4th and 8th (the – of त –), where all ताल वाद्ये rest.
    Object.keys(TAL_VADYA).forEach(inst => {
      let step = 0;
      pparts[inst] = { gans: ag.map((g): PlayedGan3 => ({ addr: g.addr, charan: 'r', seg: 'b', gats: [{ matras: g.gats.flatMap(x => x.matras).map((m): Matra => {
        const span = m.span || 1, o = { beat: m.beat, ...spanOf(span) };
        if (!(m.beat && variantBeats(td).has(m.beat))) return { ...o, slots: [{ type: 'hold' }] };
        step++;
        if (step % 4 === 0) return { ...o, slots: [{ type: 'rest' }] };
        return { ...o, slots: [{ type: 'stroke', stroke: TAL_VADYA[inst].stroke, dev: TAL_VADYA[inst].dev, ...(m.beat === 1 ? { accent: true } : {}) }] };
      }) }] })) };
    });
    if (parts.steps) {
      pparts.steps = { gans: ag.map((g): PlayedGan3 => {
        const ms = g.gats.flatMap(x => x.matras);
        return { addr: g.addr, charan: 'r', seg: 'b', gats: [{ matras: ms.map((m, i) => stepMatra(td, m.beat!, m.span || 1, ms.length - i)) } as Gat] };
      }) };
    }
    prelude = { id: 'r', label: 'रणन', type: 'ranan', tala: 'kerva', laya: rLaya, source: RANAN.line, note: RANAN.note, confidence: 'confirmed', parts: pparts };
  }
  const performance: PerformanceStep[] = [];
  if (isRachana) {
    if (prelude) performance.push({ id: 'r', times: 1 });
    form.forEach(id => performance.push({ id, times: cById[id].repeat }));
    const firstNo = charans.find(c => c.no === 1);
    if (firstNo) performance.push({ id: firstNo.id, times: 2, closing: true });
  }

  /* ---------- assemble ---------- */
  // key order as the files have always had it: title, kind, section, [complete], [raga], verse, usage, performance, …
  const meta: Record<string, unknown> = { title: v2.title, kind: v2.kind, section: v2.section };
  if (v2.complete === false) meta.complete = false;
  if (v2.raga) meta.raga = v2.raga;
  meta.verse = v2.text || [];
  meta.usage = v2.usage || [];
  meta.performance = perfMode;
  if (v2.tags) meta.tags = v2.tags;
  if (v2.notes) meta.notes = v2.notes;
  const provenance: Piece3['provenance'] = Object.fromEntries(printed.map(k => {
    const p = v2.parts[k]; const o: Record<string, unknown> = { ...(p.source || {}), status: p.status || 'draft' };
    const s = src.parts[k]; if (s.transcribedBy) o.transcribedBy = s.transcribedBy; if (s.checkedBy) o.checkedBy = s.checkedBy; if (p.headingTala) o.headingTala = p.headingTala;
    return [k, o];
  }));
  provenance.derived = { rules: 'घोष परिचय p. 50–54 (steps, पणव); assumed where marked', compiledFrom: 'ghosh-notation/1' };

  const piece: Piece3 = {
    format: 'ghosh/3', id: v2.id, generated: { by: 'compile3', at: now },
    meta: meta as Piece3['meta'],
    rhythm: { talas: talaDefs, tala: L.tala.key, laya: L.tala.laya, charans, form, ...(performance.length ? { performance } : {}), ...(prelude ? { prelude } : {}), countIn },
    parts, layout, provenance,
    ...(v2.media ? { media: v2.media } : {}),
    ...(v2.tuning ? { tuning: v2.tuning } : {}),
  };
  return { piece, warnings };
}
