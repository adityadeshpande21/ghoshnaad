/*
 * compile.js — line shorthand (ghosh-notation/1 source) -> ghosh-notation/2 tree.
 *
 * v2 is the canonical, fully structured format:
 *   part.charans[] -> lines[] -> gans[] -> gats[] -> matras[] -> slots[] (events)
 * Every matra carries its beat number in the tala cycle, every slot is one
 * note / stroke / hold / rest object. The audio engine (timeline.js) walks it.
 */
'use strict';
const { tokenize, TALAS } = require('./parser');

const DEV_DIGITS = '०१२३४५६७८९';
const toLat = s => String(s).replace(/[०-९]/g, d => DEV_DIGITS.indexOf(d));
const TALA_ALIAS = { kerva: 'केरवा', keherwa: 'केरवा', khemta: 'खेमटा', dadra: 'दादरा', jhaptal: 'झपताल',
  rupak: 'रूपक', ektal: 'एकताल', tritaal: 'त्रिताल', teental: 'त्रिताल' };
function talaObj(name, laya) {
  const n = TALA_ALIAS[String(name).toLowerCase()] || name, T = TALAS[n];
  if (!T) throw new Error(`Unknown tala ${name}`);
  return { name: n, key: T.key, laya: +toLat(laya), cycle: T.cycle, ganSize: T.gan, gats: T.gats,
    stepMatras: T.march ? T.march.matrasPerStep : null };
}
const SOUNDING = new Set(['note', 'stroke', 'hold']);

function toSlot(sym, mods) {
  const m = Object.assign({}, mods || {}, sym.mods || {});
  const ev = { type: sym.kind, dev: sym.dev };
  if (sym.kind === 'note') { ev.swara = sym.swara; ev.octave = sym.oct; if (sym.vikrit) ev.vikrit = true; }
  if (sym.kind === 'stroke') ev.stroke = sym.stroke;
  if (m.accent) ev.accent = true;
  if (m.fermata) ev.fermata = true;
  if (m.swell) ev.swell = m.swell;
  if (m.uncertain) ev.uncertain = true;
  return ev;
}
function graceOf(sym) {
  const g = { type: sym.kind, dev: sym.dev };
  if (sym.kind === 'note') { g.swara = sym.swara; g.octave = sym.oct; if (sym.vikrit) g.vikrit = true; }
  if (sym.kind === 'stroke') g.stroke = sym.stroke;
  return g;
}

function compilePart(src, instKey) {
  const warnings = [];
  const warn = (line, msg) => warnings.push({ line, msg });
  const baseTala = talaObj(src.tala, src.laya);
  let runTala = baseTala;

  const charans = [];
  let ch = null, lastClosed = null;
  let box = null;               // current container: { lines, count } (body or an ending)
  let gan = null, gat = null;   // open gan / gat
  let ending = 0;
  let slurOpen = false, slurNext = false, graces = [], group = null;
  let pendingPickup = [];
  let lastSounding = null;

  const hasContent = c => c && (c.body.count > 0 || Object.keys(c.endings).length > 0);
  const openCharan = () => {
    ch = { n: charans.length + 1, label: null, repeat: 1, pickup: pendingPickup, body: { lines: [], count: 0 }, endings: {} };
    if (runTala !== baseTala) ch.tala = runTala;
    pendingPickup = []; charans.push(ch); box = ch.body; gan = null; gat = null;
  };
  const talaOf = c => (c && c.tala) || runTala;
  const finishGan = (ln) => {
    if (!gan) return;
    const T = talaOf(ch);
    const size = gan.gats.reduce((a, g) => a + g.matras.reduce((b, m) => b + (m.span || 1), 0), 0);
    if (gan.partial) { gan.partial = undefined; delete gan.partial; gan.short = true; gan = null; gat = null; return; }
    if (size !== T.ganSize) warn(ln, `गण has ${size} matras; ${T.name} expects ${T.ganSize}`);
    else if (T.gats && gan.gats.length > 1) {
      const split = gan.gats.map(g => g.matras.reduce((b, m) => b + (m.span || 1), 0));
      if (split.join('+') !== T.gats.join('+')) warn(ln, `गट split ${split.join('+')}; ${T.name} expects ${T.gats.join('+')}`);
    }
    gan = null; gat = null;
  };
  const finishCharan = (ln) => {
    if (!ch) return;
    finishGan(ln);
    if (ch.pickup === pendingPickup) pendingPickup = [];   // the pickup now belongs to this charan; don't hand it on
    if (!hasContent(ch) && !ch.pickup.length) charans.pop(); else lastClosed = ch;
    ch = null; box = null; ending = 0;
  };
  const lineObj = (ln, srcText) => {
    const L = box.lines[box.lines.length - 1];
    if (L && L.line === ln) return L;
    const nl = { line: ln, src: srcText, gans: [] }; box.lines.push(nl); return nl;
  };
  let linePartial = false;
  const ensure = (ln, srcText) => { if (!ch) openCharan(); if (!gan) { gan = { gats: [{ matras: [] }] }; if (linePartial) gan.partial = true; gat = gan.gats[0]; lineObj(ln, srcText).gans.push(gan); } };

  const decorate = (ev) => {
    if (graces.length) { ev.grace = graces; graces = []; }
    if (SOUNDING.has(ev.type)) {
      if (slurNext) { ev.slur = 'start'; slurNext = false; }
      else if (slurOpen) ev.slur = 'mid';
      lastSounding = ev;
    }
    return ev;
  };
  const closeSlurOn = (ev) => { if (ev) ev.slur = ev.slur === 'start' ? 'single' : 'end'; slurOpen = false; };
  const placeMatra = (m, ln, srcText, isPickup) => {
    if (isPickup) { pendingPickup.push(m); if (ch && !hasContent(ch)) { ch.pickup = pendingPickup; } return; }
    ensure(ln, srcText);
    const T = talaOf(ch);
    m.beat = (box.count % T.cycle) + 1;
    box.count += m.span || 1;
    gat.matras.push(m);
  };

  src.lines.forEach((raw, li) => {
    const L = typeof raw === 'string' ? { t: raw } : raw;
    const ln = li + 1, isPickup = !!L.pickup;
    linePartial = !!L.partial;
    const lineMatras = [];
    for (const tk of tokenize(L.t, li)) {
      if (isPickup && ['start', 'charan', 'repeat', 'gan', 'gat'].includes(tk.t)) continue;
      switch (tk.t) {
        case 'start': case 'charan':
          if (ch && hasContent(ch)) finishCharan(ln);
          if (!ch) openCharan();
          break;
        case 'repeat':
          if (!ch) { warn(ln, ':॥ with no open charan'); break; }
          ch.repeat = tk.times || 2;
          if (ending === 1) { finishGan(ln); ch._await2 = true; } else finishCharan(ln);
          break;
        case 'gan': finishGan(ln); break;
        case 'gat': if (gan) { gat = { matras: [] }; gan.gats.push(gat); } break;
        case 'endOpen':
          finishGan(ln);
          if (tk.n === 1) { if (!ch) openCharan(); ch._endStart = ch.body.count; ch.endings['1'] = { lines: [], count: ch.body.count }; box = ch.endings['1']; }
          else {
            if (!ch && lastClosed && lastClosed._await2) { ch = lastClosed; charans.includes(ch) || charans.push(ch); }
            if (!ch || !ch._await2) { warn(ln, '{2 without {1 … :॥'); break; }
            ch.endings['2'] = { lines: [], count: ch._endStart }; box = ch.endings['2'];
          }
          ending = tk.n; break;
        case 'endClose':
          if (ending === 2) { delete ch._await2; finishCharan(ln); } else { finishGan(ln); ending = 0; }
          break;
        case 'label': { const c = hasContent(ch) ? ch : (lastClosed || ch); if (c) c.label = tk.v; break; }
        case 'footnoteMark': break;
        case 'dir':
          if (tk.k === 'laya') { if (!ch) openCharan(); ch.laya = +toLat(tk.v); }
          else if (tk.k === 'tala') { const [t, l] = tk.v.split('-'); runTala = talaObj(t, l || runTala.laya); if (ch && !hasContent(ch)) ch.tala = runTala; }
          else if (tk.k === 'yati') {
            if (!ch) openCharan(); finishGan(ln);
            const n = +toLat(tk.v), T = talaOf(ch);
            lineObj(ln, L.t).gans.push({ yati: n, span: n * T.ganSize });
            box.count += n * T.ganSize;
          } else warn(ln, `Unknown directive @${tk.k}`);
          break;
        case 'cue': { const m = { cue: tk.text, span: tk.matras, slots: [] }; placeMatra(m, ln, L.t, isPickup); lineMatras.push(m); break; }
        case 'grace': (group ? (group.g = group.g || []) : graces).push(graceOf(tk.sym)); break;
        case 'slurOpen': if (group) group.openNext = true; else { slurOpen = true; slurNext = true; } break;
        case 'slurClose':
          if (group) { if (group.slots.length) group.slots[group.slots.length - 1].closeAfter = true; }
          else closeSlurOn(lastSounding);
          break;
        case 'gopen': group = { slots: [] }; break;
        case 'gclose': {
          const g = group; group = null;
          if (!g || !g.slots.length) { warn(ln, 'Empty or unopened [ ]'); break; }
          const m = { group: true, slots: [] };
          g.slots.forEach(s => {
            if (s.openBefore) { slurOpen = true; slurNext = true; }
            graces = s.graces || [];
            const ev = decorate(toSlot(s.sym, tk.mods));
            m.slots.push(ev);
            if (s.closeAfter) closeSlurOn(ev);
          });
          placeMatra(m, ln, L.t, isPickup); lineMatras.push(m);
          break; }
        case 'sym':
          if (group) { group.slots.push({ sym: tk.sym, graces: group.g, openBefore: group.openNext }); group.g = null; group.openNext = false; break; }
          { const m = { slots: [decorate(toSlot(tk.sym))] }; placeMatra(m, ln, L.t, isPickup); lineMatras.push(m); }
          break;
      }
    }
    // per-line extras
    const nonPick = isPickup ? [] : lineMatras;
    if (L.lyrics) {
      if (L.lyrics.length !== nonPick.length) warn(ln, `lyrics: ${L.lyrics.length} entries for ${nonPick.length} matras`);
      nonPick.forEach((m, k) => { if (L.lyrics[k]) m.lyric = L.lyrics[k]; });
    }
    if (L.hands) {
      const hs = L.hands.trim().split(/\s+/), slots = nonPick.flatMap(m => m.slots);
      if (hs.length !== slots.length) warn(ln, `hands: ${hs.length} entries for ${slots.length} slots`);
      slots.forEach((s, k) => { if (hs[k] && hs[k] !== '.') s.hand = hs[k]; });
    }
    const target = hasContent(ch) ? ch : (lastClosed || ch);
    if (target) {
      if (L.note) (target.notes = target.notes || []).push(L.note);
      if (L.players) target.players = L.players;
      if (L.label) target.label = L.label;
      if (L.type) target.type = L.type;
    }
  });
  if (ch) finishCharan(src.lines.length);
  if (pendingPickup.length) warn(src.lines.length, 'Pickup with no following charan');
  if (slurOpen) warn(src.lines.length, 'Slur never closed');

  // tidy: number charans, beats for pickups, drop helpers
  const out = charans.map((c, k) => {
    const T = c.tala || baseTala;
    if (c.pickup.length) { const tot = c.pickup.reduce((a, m) => a + (m.span || 1), 0); let b = T.cycle - tot;
      c.pickup.forEach(m => { m.beat = (b % T.cycle) + 1; b += m.span || 1; }); }
    const o = { n: k + 1 };
    if (c.label) o.label = c.label;
    if (c.type) o.type = c.type;
    o.repeat = c.repeat;
    if (c.tala && c.tala !== baseTala) o.tala = c.tala;
    if (c.laya) o.laya = c.laya;
    if (c.players) o.players = c.players;
    if (c.notes) o.notes = c.notes;
    if (c.pickup.length) o.pickup = c.pickup;
    o.lines = c.body.lines;
    if (Object.keys(c.endings).length) o.endings = Object.fromEntries(Object.entries(c.endings).map(([n, e]) => [n, { lines: e.lines }]));
    return o;
  });
  const part = { instrument: instKey, source: src.source || null, status: src.status || 'draft', tala: baseTala };
  if (src.headingTala) part.headingTala = src.headingTala;
  if (src.form) part.form = src.form;
  part.charans = out;
  return { part, warnings };
}

function compilePiece(src) {
  const out = { format: 'ghosh-notation/2', id: src.id, kind: src.kind || 'rachana', title: src.title, section: src.section };
  for (const k of ['complete', 'raga', 'text', 'usage', 'standing', 'notes', 'tags', 'tuning', 'media']) if (src[k] !== undefined) out[k] = src[k];
  if (out.raga) {
    const notes = s => tokenize(s, 0).filter(t => t.t === 'sym' && t.sym.kind === 'note')
      .map(t => ({ swara: t.sym.swara, octave: t.sym.oct, ...(t.sym.vikrit ? { vikrit: true } : {}), dev: t.sym.dev }));
    out.raga = { ...out.raga, ...(out.raga.aroha ? { arohaNotes: notes(out.raga.aroha) } : {}), ...(out.raga.avaroha ? { avarohaNotes: notes(out.raga.avaroha) } : {}) };
  }
  out.parts = {};
  const warnings = [];
  for (const [k, p] of Object.entries(src.parts)) {
    const r = compilePart(p, k); out.parts[k] = r.part; r.warnings.forEach(w => warnings.push({ part: k, ...w }));
  }
  return { piece: out, warnings };
}

module.exports = { compilePiece, compilePart, talaObj };
