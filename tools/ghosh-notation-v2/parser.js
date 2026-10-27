/*
 * Ghosh notation parser — source format (ghosh-notation/1) -> expanded model.
 * Plain JavaScript, no dependencies; works in Node, browsers and React Native.
 *
 *   const { parsePiece, unroll } = require('./parser');
 *   const piece = parsePiece(json);            // expanded model + warnings
 *   const timeline = unroll(piece.parts.anak); // playback order with times
 */
'use strict';

/* ------------------------------------------------------------------ */
/* Reference tables                                                    */
/* ------------------------------------------------------------------ */

// Tala: matras per cycle, matras per gan, optional gat pattern inside a gan.
const TALAS = {
  'केरवा':  { key: 'kerva',   cycle: 4,  gan: 2, gats: null,      march: { matrasPerStep: 1 } },
  'खेमटा':  { key: 'khemta',  cycle: 12, gan: 6, gats: [3, 3],    march: { matrasPerStep: 3 } },
  'दादरा':  { key: 'dadra',   cycle: 6,  gan: 3, gats: null,      march: { matrasPerStep: 3, gait: 'mandchal' } },  // GP p.50-51: one step per गण
  'झपताल': { key: 'jhaptal', cycle: 10, gan: 5, gats: [2, 3],    march: null },
  'रूपक':   { key: 'rupak',   cycle: 7,  gan: 7, gats: [3, 2, 2], march: null },
  'एकताल': { key: 'ektal',   cycle: 12, gan: 2, gats: null,      march: { matrasPerStep: 1 } },
  'त्रिताल': { key: 'tritaal', cycle: 16, gan: 4, gats: null,      march: { matrasPerStep: 2, gait: 'mandchal' } },  // assumed (आरुणी), see docs/marching-steps.md
};
const TALA_ALIAS = { kerva: 'केरवा', keherwa: 'केरवा', khemta: 'खेमटा', dadra: 'दादरा', jhaptal: 'झपताल',
  rupak: 'रूपक', ektal: 'एकताल', tritaal: 'त्रिताल', teental: 'त्रिताल' };

// Swaras. `vikrit` (book: small underline) = komal for री ग ध नि, tivra for म.
const SWARA = { 'स': 'S', 'री': 'R', 'ग': 'G', 'म': 'M', 'प': 'P', 'ध': 'D', 'नि': 'N' };
const SWARA_ALIAS = { 'सा': 'स', 'रे': 'री', 'रि': 'री', 'गा': 'ग', 'मा': 'म', 'पा': 'प', 'धा': 'ध', 'नी': 'नि' };
// Percussion syllables (ध्वन्याक्षर).
const STROKE = {
  'त': 'ta',        // आनक: one stick
  'थ': 'tha',       // both sticks together
  'थ्र': 'thra',    // both sticks together with rebound
  'त्र': 'roll',    // रणन — realisation depends on tala (see README)
  '+': 'click',     // sticks struck together
  'ध्वं': 'dhvam',  // पणव
  'धं': 'dham',     // खर्जानक
  'टं': 'tam',      // त्रिभुज
  'झं': 'jham',     // झल्लरी
};
const HOLD = ['ऽ', 'S'];
const REST = ['–', '-', '—'];

// Instruments and the swaras each may use (warnings only).
const INSTRUMENTS = {
  shankh: { kind: 'melodic', allowed: ['S-1', 'P-1', 'S0', 'G0', 'P0', 'N0v', 'S1'] },
  vanshi: { kind: 'melodic', allowed: null },
  anak:   { kind: 'percussion' },
  panav: { kind: 'percussion' }, kharjanak: { kind: 'percussion' }, tribhuj: { kind: 'percussion' }, jhallari: { kind: 'percussion' },
};

const DEV_DIGITS = '०१२३४५६७८९';
const toLatinDigits = s => String(s).replace(/[०-९]/g, d => DEV_DIGITS.indexOf(d));

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function resolveTala(name) {
  if (!name) return null;
  const n = TALA_ALIAS[String(name).toLowerCase()] || name;
  return TALAS[n] ? { name: n, ...TALAS[n] } : null;
}
// Parse "केरवा-१२०" or "kerva-120" into { tala, laya }.
function parseTalaLaya(s) {
  const [t, l] = String(s).split('-');
  return { tala: resolveTala(t.trim()), laya: l ? +toLatinDigits(l.trim()) : null };
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const frac = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };
const fadd = (a, b) => frac(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const fnum = f => f[0] / f[1];

/* ------------------------------------------------------------------ */
/* Tokenizer — one line string -> tokens                               */
/* ------------------------------------------------------------------ */

const SYMBOLS = [
  ...Object.keys(STROKE), ...Object.keys(SWARA), ...Object.keys(SWARA_ALIAS), ...HOLD, ...REST,
].sort((a, b) => b.length - a.length);

function tokenize(src, lineNo) {
  const out = [];
  let i = 0;
  const err = (msg) => { throw new NotationError(msg, lineNo, i, src); };
  const peek = (s) => src.startsWith(s, i);
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    const col = i;
    // bar lines (longest first)
    if (peek('॥ॐ॥') || peek('||om||')) { out.push({ t: 'start', col }); i += peek('॥ॐ॥') ? 3 : 6; continue; }
    if (peek(':॥') || peek(':||')) { out.push({ t: 'repeat', col }); i += peek(':॥') ? 2 : 3;
      const m = /^x(\d+)/.exec(src.slice(i)); if (m) { out[out.length - 1].times = +m[1]; i += m[0].length; }
      continue; }
    if (peek('॥') || peek('||')) { out.push({ t: 'charan', col }); i += peek('॥') ? 1 : 2; continue; }
    if (ch === '|') { out.push({ t: 'gan', col }); i++; continue; }
    if (ch === ',') { out.push({ t: 'gat', col }); i++; continue; }
    if (ch === '[') { out.push({ t: 'gopen', col }); i++; continue; }
    if (ch === ']') { i++; out.push({ t: 'gclose', col, mods: readEventMods() }); continue; }
    if (ch === '(') { out.push({ t: 'slurOpen', col }); i++; continue; }
    if (ch === ')') { out.push({ t: 'slurClose', col }); i++; continue; }
    if (ch === '{') { const m = /^\{([12])/.exec(src.slice(i)); if (!m) err('Ending must be {1 or {2');
      out.push({ t: 'endOpen', n: +m[1], col }); i += m[0].length; continue; }
    if (ch === '}') { out.push({ t: 'endClose', col }); i++; continue; }
    if (ch === '*') { out.push({ t: 'footnoteMark', col }); i++; continue; }
    if (ch === '#') { const m = /^#(\S+)/.exec(src.slice(i)); out.push({ t: 'label', v: m[1], col }); i += m[0].length; continue; }
    if (ch === '@') {
      const m = /^@(\w+)=(\S+)/.exec(src.slice(i)); if (!m) err('Directive must look like @laya=100, @tala=केरवा-१२० or @yati=8');
      out.push({ t: 'dir', k: m[1], v: m[2], col }); i += m[0].length; continue; }
    if (ch === '"') {
      const m = /^"([^"]+)":(\d+)/.exec(src.slice(i)); if (!m) err('Cue must look like "ॐ":4 (text and matras)');
      out.push({ t: 'cue', text: m[1], matras: +m[2], col }); i += m[0].length; continue; }
    if (ch === '`') { i++; const sym = readSymbol(); if (!sym) err('Grace mark ` must be followed by a swara or stroke');
      out.push({ t: 'grace', sym, col }); continue; }
    const sym = readSymbol();
    if (sym) { sym.mods = readEventMods(); out.push({ t: 'sym', sym, col }); continue; }
    err(`Unknown symbol "${src.slice(i, i + 3)}"`);
  }
  return out;

  function readSymbol() {
    for (const s of SYMBOLS) {
      if (src.startsWith(s, i)) {
        // don't let "ध" swallow the start of "ध्वं"/"धं" etc. (SYMBOLS is longest-first already)
        i += s.length;
        const base = SWARA_ALIAS[s] || s;
        const sym = { raw: s };
        if (SWARA[base]) {
          sym.kind = 'note'; sym.swara = SWARA[base]; sym.dev = base; sym.oct = 0; sym.vikrit = false;
          while (i < src.length && /[.'_]/.test(src[i])) {
            if (src[i] === '.') sym.oct -= 1; else if (src[i] === "'") sym.oct += 1; else sym.vikrit = true;
            i++;
          }
        } else if (STROKE[base]) { sym.kind = 'stroke'; sym.stroke = STROKE[base]; sym.dev = base; }
        else if (HOLD.includes(base)) { sym.kind = 'hold'; sym.dev = 'ऽ'; }
        else if (REST.includes(base)) { sym.kind = 'rest'; sym.dev = '–'; }
        return sym;
      }
    }
    return null;
  }
  function readEventMods() {
    const mods = {};
    for (;;) {
      if (src.startsWith('<>', i)) { mods.swell = 'swell'; i += 2; continue; }
      const c = src[i];
      if (c === '^') { mods.accent = true; i++; continue; }
      if (c === '!') { mods.fermata = true; i++; continue; }
      if (c === '<') { mods.swell = 'grow'; i++; continue; }
      if (c === '>') { mods.swell = 'fade'; i++; continue; }
      if (c === '?') { mods.uncertain = true; i++; continue; }
      break;
    }
    return mods;
  }
}

class NotationError extends Error {
  constructor(msg, line, col, src) { super(`line ${line + 1}, col ${col + 1}: ${msg}\n  ${src}\n  ${' '.repeat(col)}^`); this.line = line; this.col = col; }
}

/* ------------------------------------------------------------------ */
/* Part parser                                                         */
/* ------------------------------------------------------------------ */

function parsePart(part, instKey) {
  const warnings = [];
  const warn = (line, msg) => warnings.push({ line: line + 1, msg });
  const base = parseTalaLaya(`${part.tala}-${part.laya}`);
  if (!base.tala) throw new Error(`Unknown tala "${part.tala}"`);

  const events = [], charans = [];
  const lines = part.lines.map(l => (typeof l === 'string' ? { t: l } : l));

  let tala = base.tala, talaLaya = base.laya;   // running tala (changed by @tala)
  let ch = null, lastClosed = null, gan = null;
  let ending = 0;                                // 0 = body, 1 / 2 = क्रमभेद bracket
  let slurOpen = false, slurStartNext = false;
  let graces = [], group = null, pendingPickup = [];

  const hasContent = c => c && (c.body.length || Object.keys(c.endings).length);
  const openGan = () => { gan = { matras: 0, gats: [0] }; };
  const openCharan = (li) => {
    ch = { n: charans.length + 1, label: null, tala: tala.name, laya: talaLaya, repeat: 1, lines: [li + 1],
      pickup: pendingPickup, body: [], endings: {}, gans: 0 };
    pendingPickup = []; charans.push(ch); openGan();
  };
  const ensureCharan = (li) => { if (!ch) openCharan(li); if (!ch.lines.includes(li + 1)) ch.lines.push(li + 1); };
  const closeGan = (li) => {
    if (!gan || gan.matras === 0) { openGan(); return; }
    const T = TALAS[ch ? ch.tala : tala.name];
    if (gan.matras !== T.gan) warn(li, `गण has ${gan.matras} matras; ${ch.tala} expects ${T.gan}`);
    else if (T.gats && gan.gats.length > 1 && gan.gats.join('+') !== T.gats.join('+'))
      warn(li, `गट split ${gan.gats.join('+')}; ${ch.tala} expects ${T.gats.join('+')}`);
    ch.gans += 1; openGan();
  };
  const finishCharan = (li) => {
    if (!ch) return;
    closeGan(li);
    if (ending === 2) delete ch.awaitEnding2;
    if (!hasContent(ch) && !ch.pickup.length) charans.pop();
    else lastClosed = ch;
    ch = null; ending = 0;
  };
  const addMatras = (n) => { gan.matras += n; gan.gats[gan.gats.length - 1] += n; };

  const pushEvent = (ev, li, isPickup) => {
    ev.i = events.length; ev.line = li + 1;
    if (graces.length) { ev.grace = graces; graces = []; }
    const sounding = ev.kind === 'note' || ev.kind === 'stroke' || ev.kind === 'hold';
    if (slurStartNext && sounding) { ev.slur = 'start'; slurStartNext = false; }
    else if (slurOpen && sounding) ev.slur = 'mid';
    events.push(ev);
    if (isPickup) {
      ev.pickup = true;
      if (ch && !hasContent(ch)) ch.pickup.push(ev.i); else pendingPickup.push(ev.i);
      return;
    }
    ensureCharan(li);
    ev.charan = ch.n; ev.gan = ch.gans; ev.matraInGan = gan.matras;
    if (ending) { ev.ending = ending; (ch.endings[ending] = ch.endings[ending] || []).push(ev.i); }
    else ch.body.push(ev.i);
  };
  const closeSlurOn = (ev) => { if (!ev) return; ev.slur = ev.slur === 'start' ? 'single' : 'end'; slurOpen = false; };

  const makeEvent = (sym, slot, slots, mods) => {
    const ev = { kind: sym.kind, sym: sym.dev, dur: frac(1, slots) };
    if (slots > 1) ev.slot = [slot, slots];
    if (sym.kind === 'note') {
      ev.swara = sym.swara; ev.oct = sym.oct; if (sym.vikrit) ev.vikrit = true;
      ev.name = sym.swara + (sym.vikrit ? (sym.swara === 'M' ? '#' : 'b') : '') + (sym.oct > 0 ? "'".repeat(sym.oct) : '.'.repeat(-sym.oct));
    }
    if (sym.kind === 'stroke') ev.stroke = sym.stroke;
    Object.assign(ev, mods || {}, sym.mods || {});
    return ev;
  };
  const checkInstrument = (ev, li) => {
    const inst = INSTRUMENTS[instKey]; if (!inst) return;
    if (inst.kind === 'percussion' && ev.kind === 'note') warn(li, `Swara ${ev.sym} in a percussion part`);
    if (inst.kind === 'melodic' && ev.kind === 'stroke') warn(li, `Stroke ${ev.sym} in a melodic part`);
    if (inst.allowed && ev.kind === 'note') {
      const code = ev.swara + ev.oct + (ev.vikrit ? 'v' : '');
      if (!inst.allowed.includes(code)) warn(li, `Swara ${ev.name} is outside the usual ${instKey} range`);
    }
  };

  lines.forEach((ln, li) => {
    const isPickup = !!ln.pickup;
    const firstEv = events.length;
    for (const tk of tokenize(ln.t, li)) {
      if (isPickup && ['start', 'charan', 'repeat', 'gan', 'gat'].includes(tk.t)) continue;
      switch (tk.t) {
        case 'start': case 'charan':
          if (ch && hasContent(ch)) finishCharan(li);
          if (!ch) openCharan(li);
          break;
        case 'repeat':
          if (!ch) { warn(li, ':॥ with no open charan'); break; }
          ch.repeat = tk.times || 2;
          if (ending === 1) { closeGan(li); ch.awaitEnding2 = true; }
          else finishCharan(li);
          break;
        case 'gan': if (ch) closeGan(li); break;
        case 'gat': if (gan) gan.gats.push(0); break;
        case 'endOpen':
          if (tk.n === 2) {
            if (!ch && lastClosed && lastClosed.awaitEnding2) { ch = lastClosed; }
            if (!ch || !ch.awaitEnding2) { warn(li, '{2 without a matching {1 … :॥'); break; }
            openGan();
          } else ensureCharan(li);
          ending = tk.n; break;
        case 'endClose':
          if (ending === 2) { delete ch.awaitEnding2; finishCharan(li); }
          else ending = 0;            // after {1 … :॥ } the charan waits for {2
          break;
        case 'label': {
          const c = hasContent(ch) ? ch : (lastClosed || ch); if (c) c.label = tk.v; break; }
        case 'footnoteMark': break;
        case 'dir':
          if (tk.k === 'laya') { ensureCharan(li); ch.laya = +toLatinDigits(tk.v); }          // this charan only
          else if (tk.k === 'tala') {                                                         // from here on
            const p = parseTalaLaya(tk.v);
            if (!p.tala) { warn(li, `Unknown tala ${tk.v}`); break; }
            tala = p.tala; if (p.laya) talaLaya = p.laya;
            if (ch && !hasContent(ch)) { ch.tala = tala.name; ch.laya = talaLaya; }
          } else if (tk.k === 'yati') {
            ensureCharan(li); closeGan(li);
            const g = +toLatinDigits(tk.v), T = TALAS[ch.tala];
            pushEvent({ kind: 'yati', sym: `दीर्घ यति ${g}`, gans: g, dur: frac(g * T.gan, 1) }, li, false);
            ch.gans += g; openGan();
          } else warn(li, `Unknown directive @${tk.k}`);
          break;
        case 'cue':
          pushEvent({ kind: 'cue', text: tk.text, sym: tk.text, dur: frac(tk.matras, 1) }, li, isPickup);
          if (!isPickup) addMatras(tk.matras);
          break;
        case 'grace':
          graces.push({ kind: tk.sym.kind, sym: tk.sym.dev, swara: tk.sym.swara, oct: tk.sym.oct,
            vikrit: tk.sym.vikrit || undefined, stroke: tk.sym.stroke });
          if (group) { group.pendingGraces = graces; graces = []; }
          break;
        case 'slurOpen':
          if (group) group.openNext = true; else { slurOpen = true; slurStartNext = true; }
          break;
        case 'slurClose':
          if (group) { if (group.slots.length) group.slots[group.slots.length - 1].closeAfter = true; }
          else closeSlurOn([...events].reverse().find(e => e.kind === 'note' || e.kind === 'stroke' || e.kind === 'hold'));
          break;
        case 'gopen': group = { slots: [], openNext: false, pendingGraces: [] }; break;
        case 'gclose': {
          if (!group) { warn(li, '] without ['); break; }
          const g = group; group = null;
          const n = g.slots.length, gid = 'g' + events.length;
          if (!n) { warn(li, 'Empty [ ] group'); break; }
          g.slots.forEach((s, k) => {
            if (s.openBefore) { slurOpen = true; slurStartNext = true; }
            graces = s.graces;
            const ev = makeEvent(s.sym, k, n, tk.mods); ev.group = gid;
            pushEvent(ev, li, isPickup); checkInstrument(ev, li);
            if (s.closeAfter) closeSlurOn(ev);
          });
          if (!isPickup) addMatras(1);
          break; }
        case 'sym': {
          if (group) {
            group.slots.push({ sym: tk.sym, graces: group.pendingGraces, openBefore: group.openNext });
            group.pendingGraces = []; group.openNext = false; break;
          }
          const ev = makeEvent(tk.sym, 0, 1);
          pushEvent(ev, li, isPickup); checkInstrument(ev, li);
          if (!isPickup) addMatras(1);
          break; }
      }
    }
    if (group) warn(li, '[ not closed on this line');
    const lineEvents = events.slice(firstEv).filter(e => !e.pickup);
    if (ln.lyrics) {
      const starts = lineEvents.filter(e => e.kind !== 'yati' && (!e.slot || e.slot[0] === 0));
      if (ln.lyrics.length !== starts.length) warn(li, `lyrics has ${ln.lyrics.length} entries for ${starts.length} matras`);
      starts.forEach((ev, k) => { if (ln.lyrics[k]) ev.lyric = ln.lyrics[k]; });
    }
    if (ln.hands) {
      const hs = ln.hands.trim().split(/\s+/), evs = lineEvents.filter(e => e.kind !== 'cue' && e.kind !== 'yati');
      if (hs.length !== evs.length) warn(li, `hands has ${hs.length} entries for ${evs.length} slots`);
      evs.forEach((ev, k) => { const h = hs[k]; if (h && h !== '.') ev.hand = h; });
    }
    const target = hasContent(ch) ? ch : (lastClosed || ch);
    if (target) {
      if (ln.note) (target.notes = target.notes || []).push(ln.note);
      if (ln.players) target.players = ln.players;
      if (ln.label) target.label = ln.label;
      if (ln.type) target.type = ln.type;
    }
  });
  if (ch) finishCharan(lines.length - 1);
  if (pendingPickup.length) warn(lines.length - 1, 'Pickup line with no following charan');
  if (slurOpen) warn(lines.length - 1, 'Slur ( never closed');
  charans.forEach((c, k) => { c.n = k + 1; if (c.awaitEnding2) { warn(lines.length - 1, `Charan ${c.n}: {1 has no {2`); delete c.awaitEnding2; } });
  events.forEach(e => { if (e.charan) e.charan = charans.findIndex(c => c.body.includes(e.i) || Object.values(c.endings).some(x => x.includes(e.i))) + 1; });

  return {
    instrument: instKey, tala: base.tala.name, laya: base.laya,
    talaInfo: { cycle: base.tala.cycle, gan: base.tala.gan, gats: base.tala.gats, march: base.tala.march },
    source: part.source || null, status: part.status || 'draft', form: part.form || null,
    charans, events, warnings,
  };
}

function matraStarts(evs) {
  return evs.filter(e => !e.slot || e.slot[0] === 0);
}

/* ------------------------------------------------------------------ */
/* Playback: unroll repeats, endings and form into a timeline          */
/* ------------------------------------------------------------------ */

function unroll(part) {
  const byLabel = Object.fromEntries(part.charans.filter(c => c.label).map(c => [String(c.label), c]));
  const order = part.form
    ? part.form.map(x => byLabel[String(x)] || part.charans[+x - 1]).filter(Boolean)
    : part.charans;
  const seq = [];
  let t = [0, 1], sec = 0;
  const seenPickup = new Set();
  const play = (idxs, c, pass) => {
    for (const i of idxs) {
      const e = part.events[i];
      const secPerMatra = 60 / (c.laya || part.laya);
      seq.push({ i, charan: c.n, pass, t: t.slice(), sec: +sec.toFixed(4) });
      t = fadd(t, e.dur); sec += fnum(e.dur) * secPerMatra;
    }
  };
  for (const c of order) {
    if (c.pickup && c.pickup.length && !seenPickup.has(c.n)) { play(c.pickup, c, 0); seenPickup.add(c.n); }
    for (let pass = 1; pass <= c.repeat; pass++) {
      play(c.body, c, pass);
      const e = c.endings[pass] || c.endings[Math.min(pass, 2)] || [];
      play(e, c, pass);
    }
  }
  return { totalMatras: fnum(t), totalSeconds: +sec.toFixed(2), sequence: seq };
}

/* ------------------------------------------------------------------ */
/* Piece                                                               */
/* ------------------------------------------------------------------ */

function parseNoteString(s) {
  // for aroha / avaroha: a plain run of swaras
  const toks = tokenize(s, 0).filter(t => t.t === 'sym' && t.sym.kind === 'note');
  return toks.map(t => t.sym.swara + (t.sym.vikrit ? (t.sym.swara === 'M' ? '#' : 'b') : '') + (t.sym.oct > 0 ? "'" : t.sym.oct < 0 ? '.' : ''));
}

function parsePiece(src) {
  if (src.format !== 'ghosh-notation/1') throw new Error('format must be "ghosh-notation/1"');
  const out = { format: 'ghosh-notation/1-expanded', id: src.id, title: src.title, section: src.section, kind: src.kind || 'rachana',
    raga: src.raga ? { ...src.raga, arohaNotes: src.raga.aroha ? parseNoteString(src.raga.aroha) : undefined,
      avarohaNotes: src.raga.avaroha ? parseNoteString(src.raga.avaroha) : undefined } : null,
    text: src.text || null, notes: src.notes || [], parts: {}, warnings: [] };
  for (const [k, p] of Object.entries(src.parts)) {
    const parsed = parsePart(p, k);
    parsed.timeline = unroll(parsed);
    out.parts[k] = parsed;
    parsed.warnings.forEach(w => out.warnings.push({ part: k, ...w }));
  }
  // band alignment: all parts should unroll to the same length
  const lens = Object.entries(out.parts).map(([k, p]) => [k, p.timeline.totalMatras]);
  if (lens.length > 1 && new Set(lens.map(x => x[1])).size > 1)
    out.warnings.push({ part: '*', msg: `Parts unroll to different lengths: ${lens.map(x => x.join('=')).join(', ')} matras` });
  return out;
}

module.exports = { parsePiece, parsePart, unroll, tokenize, TALAS, STROKE, SWARA, NotationError };
