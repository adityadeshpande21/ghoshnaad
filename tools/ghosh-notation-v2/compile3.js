/*
 * compile3.js — authoring file (ghosh-notation/1) -> standalone ghosh/3 file.
 *
 *   const { compile3 } = require('./compile3');
 *   const { piece, warnings } = compile3(sourceJson, { talas });   // talas = data/talas.json
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
'use strict';
const { compilePiece } = require('./compile');

const MELODY = ['shankh', 'vanshi'];
const TAL_VADYA = { panav: { stroke: 'dhvam', dev: 'ध्व' }, jhallari: { stroke: 'jham', dev: 'झ' }, tribhuj: { stroke: 'tam', dev: 'ट' } };
const clone = o => JSON.parse(JSON.stringify(o));

function compile3(src, { talas, now = new Date().toISOString() } = {}) {
  if (!talas) throw new Error('compile3 needs the tala library (data/talas.json)');
  const { piece: v2, warnings } = compilePiece(src);
  const T = talas.talas || talas;
  const opts = src.options || {};
  const printed = Object.keys(v2.parts);
  const lead = MELODY.find(k => v2.parts[k]) || printed[0];
  const L = v2.parts[lead];
  const warn = (part, msg) => warnings.push({ part, msg });

  /* ---------- rhythm: charans shared by all parts ---------- */
  const used = new Set();
  const charans = L.charans.map(c => {
    const t = c.tala || L.tala; used.add(t.key);
    const o = { id: `c${c.n}`, n: c.n };
    if (c.label) o.label = c.label;
    if (c.type) o.type = c.type;
    o.repeat = c.repeat;
    o.tala = t.key;
    o.laya = c.laya || t.laya || L.tala.laya;
    if (c.players) o.players = c.players;
    if (c.notes) o.notes = c.notes;
    // endings: union over every printed part (a part may print क्रमभेद endings the lead does not)
    const ens = new Set();
    printed.forEach(k => { const pc = v2.parts[k].charans.find(x => x.n === c.n); Object.keys((pc && pc.endings) || {}).forEach(n => ens.add(+n)); });
    o.segments = ['b', ...[...ens].sort((a, b) => a - b).map(n => `e${n}`)];
    return o;
  });
  // प्रारंभिक: the single opening line printed before the first charan (॥ॐ॥ … ॥, no repeat) is not a
  // charan. Every printed part must open with one line, and the rachana must have more after it.
  // In प्रचलन and मंद गति rachanas any opening block printed once (no :॥, no endings) is the प्रारंभिक;
  // in नैमित्तिक pieces only a single printed line counts.
  const isRachana = /^(prachalan|mand)-/.test(src.section || '');
  const onceOnly = c => c && c.repeat === 1 && !Object.keys(c.endings || {}).length;
  const oneLine = c => onceOnly(c) && (isRachana || new Set((c.lines || []).map(l => l.line)).size === 1);
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
  const form = L.form ? L.form.map(x => byLabel[String(x)] || (L.charans[+x - 1] ? `c${+x}` : null)).filter(Boolean) : charans.map(c => c.id);
  const talaDefs = {};
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
  const perfMode = { mode: standing ? 'standing' : first.steps.gait };
  // अंक-ताल before playing (घोष परिचय p. 26): "एक दो, एक दो" for केरवा / खेमटा (one count per step),
  // "एक दो तीन, एक दो तीन" for दादरा (one count per matra); the रणन then starts in that tempo.
  const dadraStart = first && first.steps && first.steps.gait === 'mandchal' && first.steps.matrasPerStep === 3;
  const countIn = dadraStart
    ? { count: 6, words: ['एक', 'दो', 'तीन', 'एक', 'दो', 'तीन'], matras: 1, on: 'count', note: 'अंक-ताल (घोष परिचय p. 26)' }
    : { count: 4, words: ['एक', 'दो', 'एक', 'दो'], matras: (first && first.steps && !src.standing ? first.steps.matrasPerStep : 2), on: 'count', note: 'अंक-ताल (घोष परिचय p. 26)' };

  /* ---------- printed parts ---------- */
  const parts = {}, layout = { lead, header: { left: 'instruments', center: 'title', right: 'tala' }, pickupPlacement: 'above-line-end', parts: {} };
  printed.forEach(k => {
    const p = v2.parts[k], gans = [], pickups = [], lines = [];
    let cur = null;
    p.charans.forEach((c, ci) => {
      const cid = `c${ci + 1}`;
      if (c.pickup) {
        const tot = c.pickup.reduce((a, m) => a + (m.span || 1), 0); let at = -tot;
        pickups.push({ charan: cid, matras: c.pickup.map(m => { const o = { at, ...clone(m) }; at += m.span || 1; return o; }) });
        lines.push(cur = { pickup: cid, gans: [] }); cur = null;
      }
      const segs = [['b', c.lines], ...Object.entries(c.endings || {}).map(([n, e]) => [`e${n}`, e.lines])];
      segs.forEach(([seg, ls]) => {
        let idx = 0;
        ls.forEach(line => line.gans.forEach(g => {
          const addr = `${cid}.${seg}.${idx++}`;
          const o = { addr, charan: cid, seg, line: line.line };
          if (g.yati) { o.yati = g.yati; o.span = g.span; } else { if (g.short) o.short = true; o.gats = clone(g.gats); }
          gans.push(o);
          // book lines: same printed line stays together; a short closing tag joins the line before it
          const join = cur && (o.short || cur.line === line.line);
          if (!join) lines.push(cur = { line: line.line, gans: [], src: [] });
          cur.gans.push(addr);
          if (line.src && !cur.src.includes(line.src)) cur.src.push(line.src);
        }));
      });
    });
    lines.forEach(l => { if (l.src) l.src = l.src.join('  '); delete l.line; });
    parts[k] = { instrument: k, role: MELODY.includes(k) ? 'melody' : 'anak', kind: 'printed', ...(pickups.length ? { pickups } : {}), gans };
    layout.parts[k] = { lines };
  });

  /* ---------- derived parts: ताल वाद्य and कदम, written out from the lead's grid ---------- */
  const leadP = parts[lead];
  const cById = Object.fromEntries(charans.map(c => [c.id, c]));
  // grid of the lead: for each गण the list of beat numbers (yati gans get theirs from the previous beat)
  let prevBeat = 0;
  const grid = leadP.gans.map(g => {
    const t = talaDefs[cById[g.charan].tala];
    if (g.yati) { const beats = []; for (let j = 0; j < g.span; j++) beats.push(((prevBeat + j) % t.cycle) + 1); prevBeat = beats[beats.length - 1]; return { g, t, beats, spans: beats.map(() => 1) }; }
    const ms = g.gats.flatMap(x => x.matras); const beats = ms.map(m => m.beat); if (beats.length) prevBeat = beats[beats.length - 1];
    return { g, t, beats, spans: ms.map(m => m.span || 1) };
  });
  // pickups: the longest one any printed part has, per charan
  const pick = {};
  Object.values(parts).forEach(p => (p.pickups || []).forEach(pk => { if (!pick[pk.charan] || pk.matras.length > pick[pk.charan].length) pick[pk.charan] = pk.matras.map(m => ({ at: m.at, beat: m.beat, span: m.span || 1 })); }));

  const variantBeats = t => new Set(t.talVadya.variants[t.talVadya.use].beats);
  // ताल वाद्य are silent on a beat where the आनक has – (rest) or + : the matra starts with one of them
  // (or, with no आनक, where the lead starts the matra with a rest).
  const quietP = parts.anak || leadP, quietGan = {}, quietPick = {};
  quietP.gans.forEach(g => { if (!g.yati) quietGan[g.addr] = g.gats.flatMap(x => x.matras); });
  (quietP.pickups || []).forEach(pk => { quietPick[pk.charan] = Object.fromEntries(pk.matras.map(m => [m.at, m])); });
  // पणव (and with it झल्लरी, त्रिभुज) plays on every step — also where the आनक rests or has a यती — but not on आनक +
  const isQuiet = m => { const s = m && !m.cue && m.slots && m.slots[0]; return !!s && s.type === 'stroke' && s.stroke === 'click'; };
  const tvMatra = (t, beat, span, inst, qm) => {
    if (isQuiet(qm)) return { beat, ...(span > 1 ? { span } : {}), slots: [{ type: 'rest' }] };
    const on = beat && variantBeats(t).has(beat);
    const m = { beat, ...(span > 1 ? { span } : {}), slots: [on ? { type: 'stroke', stroke: TAL_VADYA[inst].stroke, dev: TAL_VADYA[inst].dev, ...(beat === 1 ? { accent: true } : {}) } : { type: 'hold' }] };
    return m;
  };
  const stepMatra = (t, beat, span, remaining) => {
    const sm = t.steps && t.steps.matrasPerStep;
    if (sm && beat && (beat - 1) % sm === 0) { const foot = ((beat - 1) / sm) % 2 ? 'R' : 'L'; return { beat, ...(span > 1 ? { span } : {}), step: { foot, matras: Math.min(sm, remaining) }, slots: [{ type: 'step', foot }] }; }
    return { beat, ...(span > 1 ? { span } : {}), slots: [{ type: 'hold' }] };
  };
  const derive = (inst, kind) => {
    const gans = grid.map(({ g, t, beats, spans }) => {
      const qms = quietGan[g.addr] || [];
      const ms = beats.map((b, i) => kind === 'step' ? stepMatra(t, b, spans[i], beats.length - i) : tvMatra(t, b, spans[i], inst, qms[i]));
      const o = { addr: g.addr, charan: g.charan, seg: g.seg, line: g.line, gats: [{ matras: ms }] };
      if (g.short) o.short = true;
      return o;
    });
    const pickups = Object.entries(pick).map(([cid, ms]) => {
      const t = talaDefs[cById[cid].tala];
      return { charan: cid, matras: ms.map((m, i) => ({ at: m.at, ...(kind === 'step' ? stepMatra(t, m.beat, m.span, ms.length - i) : tvMatra(t, m.beat, m.span, inst, (quietPick[cid] || {})[m.at])) })) };
    });
    return { gans, pickups };
  };
  const ruleOf = () => Object.fromEntries(Object.entries(talaDefs).map(([k, t]) => [k, { variant: t.talVadya.use, beats: t.talVadya.variants[t.talVadya.use].beats, confidence: t.talVadya.variants[t.talVadya.use].confidence }]));
  // चरणाचा शेवट: on the last step of every charan (each ending of a charan with endings) the पणव is silent,
  // and झल्लरी + त्रिभुज play loud instead.
  const endStroke = inst => inst === 'panav' ? { type: 'rest' } : { type: 'stroke', stroke: TAL_VADYA[inst].stroke, dev: TAL_VADYA[inst].dev, accent: true, loud: true };
  const markCharanEnds = (inst, gans) => charans.forEach(c => {
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
    parts[inst] = { instrument: inst, role: 'tal-vadya', kind: 'derived', rule: { from: 'tala.talVadya', talas: ruleOf(), silentOn: { part: parts.anak ? 'anak' : lead, when: parts.anak ? ['+'] : [], confidence: 'confirmed' }, charanEnd: { panav: 'silent', others: 'loud', on: 'last step of each charan' } }, ...(d.pickups.length ? { pickups: d.pickups } : {}), gans: d.gans };
  });
  if (!standing) {
    const d = derive('steps', 'step');
    parts.steps = { instrument: 'steps', role: 'steps', kind: 'derived',
      rule: { from: 'tala.steps', talas: Object.fromEntries(Object.entries(talaDefs).filter(([, t]) => t.steps).map(([k, t]) => [k, t.steps])), start: { foot: 'L', on: 'सम', confidence: 'assumed' } },
      ...(d.pickups.length ? { pickups: d.pickups } : {}), gans: d.gans };
  }

  // band score: the lead's printed lines, with a pickup line before any charan that some part picks up into
  const leadLines = layout.parts[lead].lines.map(l => ({ ...l, gans: [...l.gans] }));
  const band = [];
  leadLines.forEach(l => {
    const firstC = l.gans.length && l.gans.find(a => /\.b\.0$/.test(a));
    const cid = firstC && firstC.split('.')[0];
    if (cid && pick[cid] && !band.some(x => x.pickup === cid)) band.push({ pickup: cid, gans: [] });
    if (!(l.pickup && band.some(x => x.pickup === l.pickup))) band.push(l);
  });
  layout.band = { lines: band };

  /* ---------- रणन and the full-performance order ---------- */
  // पूर्ण रचना वादन: रणन (आनक, one line = 8 steps) → प्रारंभिक (if any) → every charan as printed
  // (:॥ = twice) → the first charan again, twice. रणन for दादरा / मंदचाल is not known yet (none).
  // रणन is always in केरवा (also before a खेमटा rachana), at the rachana's step speed.
  const RANAN = {
    kerva:  { line: '॥ त्र ऽ | त – | त्र ऽ | त – ॥', note: 'त्रऽऽ, ऽऽऽ, त – (दोनदा) — एक ओळ, आठ पावले', confirmed: true },
  };
  let prelude = null;
  const t0 = charans[0] && charans[0].tala;
  if (isRachana && t0 && talaDefs[t0] && ['kerva', 'khemta'].includes(t0) && T.kerva) {
    if (!talaDefs.kerva) { const d = clone(T.kerva); d.talVadya.use = d.talVadya.default; talaDefs.kerva = d; }
    const td = talaDefs.kerva, tf = talaDefs[t0];
    const rLaya = Math.round(charans[0].laya * td.steps.matrasPerStep / tf.steps.matrasPerStep);
    const mini = compilePiece({ format: 'ghosh-notation/1', id: 'ranan', kind: 'rachana', title: { dev: 'रणन' }, section: src.section,
      parts: { anak: { tala: 'केरवा', laya: rLaya, lines: [RANAN.kerva.line] } } });
    const mc = mini.piece.parts.anak.charans[0];
    let idx = 0; const ag = [];
    mc.lines.forEach(line => line.gans.forEach(g => ag.push({ addr: `r.b.${idx++}`, charan: 'r', seg: 'b', gats: clone(g.gats) })));
    const pparts = { anak: { gans: ag } };
    // ताल वाद्य in रणन: on every step except the 4th and 8th (the – of त –), where all ताल वाद्ये rest.
    Object.keys(TAL_VADYA).forEach(inst => {
      let step = 0;
      pparts[inst] = { gans: ag.map(g => ({ addr: g.addr, charan: 'r', seg: 'b', gats: [{ matras: g.gats.flatMap(x => x.matras).map(m => {
        const span = m.span || 1, o = { beat: m.beat, ...(span > 1 ? { span } : {}) };
        if (!(m.beat && variantBeats(td).has(m.beat))) return { ...o, slots: [{ type: 'hold' }] };
        step++;
        if (step % 4 === 0) return { ...o, slots: [{ type: 'rest' }] };
        return { ...o, slots: [{ type: 'stroke', stroke: TAL_VADYA[inst].stroke, dev: TAL_VADYA[inst].dev, ...(m.beat === 1 ? { accent: true } : {}) }] };
      }) }] })) };
    });
    if (parts.steps) {
      pparts.steps = { gans: ag.map(g => { const ms = g.gats.flatMap(x => x.matras);
        return { addr: g.addr, charan: 'r', seg: 'b', gats: [{ matras: ms.map((m, i) => stepMatra(td, m.beat, m.span || 1, ms.length - i)) }] }; }) };
    }
    prelude = { id: 'r', label: 'रणन', type: 'ranan', tala: 'kerva', laya: rLaya, source: RANAN.kerva.line, note: RANAN.kerva.note, confidence: 'confirmed', parts: pparts };
  }
  const performance = [];
  if (isRachana) {
    if (prelude) performance.push({ id: 'r', times: 1 });
    form.forEach(id => performance.push({ id, times: cById[id].repeat }));
    const firstNo = charans.find(c => c.no === 1);
    if (firstNo) performance.push({ id: firstNo.id, times: 2, closing: true });
  }

  /* ---------- assemble ---------- */
  const meta = { title: v2.title, kind: v2.kind, section: v2.section };
  if (v2.complete === false) meta.complete = false;
  if (v2.raga) meta.raga = v2.raga;
  meta.verse = v2.text || [];
  meta.usage = v2.usage || [];
  meta.performance = perfMode;
  if (v2.tags) meta.tags = v2.tags;
  if (v2.notes) meta.notes = v2.notes;
  const provenance = Object.fromEntries(printed.map(k => {
    const p = v2.parts[k]; const o = { ...(p.source || {}), status: p.status || 'draft' };
    const s = src.parts[k]; if (s.transcribedBy) o.transcribedBy = s.transcribedBy; if (s.checkedBy) o.checkedBy = s.checkedBy; if (p.headingTala) o.headingTala = p.headingTala;
    return [k, o];
  }));
  provenance.derived = { rules: 'घोष परिचय p. 50–54 (steps, पणव); assumed where marked', compiledFrom: 'ghosh-notation/1' };

  const piece = {
    format: 'ghosh/3', id: v2.id, generated: { by: 'compile3', at: now },
    meta,
    rhythm: { talas: talaDefs, tala: L.tala.key, laya: L.tala.laya, charans, form, ...(performance.length ? { performance } : {}), ...(prelude ? { prelude } : {}), countIn },
    parts, layout, provenance,
    ...(v2.media ? { media: v2.media } : {}),
    ...(v2.tuning ? { tuning: v2.tuning } : {}),
  };
  return { piece, warnings };
}

module.exports = { compile3 };
