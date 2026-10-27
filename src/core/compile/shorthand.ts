// Line shorthand (ghosh-notation/1 source) -> the structured tree (ghosh-notation/2):
//   part.charans[] -> lines[] -> gans[] -> gats[] -> matras[] -> slots[]
// Every matra carries its beat number in the tala cycle; every slot is one note, stroke, hold or rest.
import type {
  Gat, Matra, RagaNote, Slot, SourcePart, SourcePiece, SourceLine, TalaInfo, TalaLibrary, TalaTable,
  TreeCharan, TreeGan, TreeLine, TreePart, TreePiece, Warning,
} from '../types.ts';
import { tokenize } from '../notation/tokenize.ts';
import type { Mods, Sym } from '../notation/tokenize.ts';
import { talaInfo, tableOf, toLatinDigits } from '../tala.ts';

const SOUNDING = new Set(['note', 'stroke', 'hold']);

function toSlot(sym: Sym, mods?: Mods): Slot {
  const m: Mods = Object.assign({}, mods || {}, sym.mods || {});
  const ev: Slot = { type: sym.kind, dev: sym.dev };
  if (sym.kind === 'note') { ev.swara = sym.swara; ev.octave = sym.oct; if (sym.vikrit) ev.vikrit = true; }
  if (sym.kind === 'stroke') ev.stroke = sym.stroke;
  if (m.accent) ev.accent = true;
  if (m.fermata) ev.fermata = true;
  if (m.swell) ev.swell = m.swell;
  if (m.uncertain) ev.uncertain = true;
  return ev;
}

function graceOf(sym: Sym): Slot {
  const g: Slot = { type: sym.kind, dev: sym.dev };
  if (sym.kind === 'note') { g.swara = sym.swara; g.octave = sym.oct; if (sym.vikrit) g.vikrit = true; }
  if (sym.kind === 'stroke') g.stroke = sym.stroke;
  return g;
}

/* Working shapes while a part is being read; none of them leave this file. */
interface Box { lines: TreeLine[]; count: number }
interface WorkGan extends TreeGan { partial?: boolean }
interface WorkCharan {
  n: number; label: string | null; repeat: number; pickup: Matra[]; body: Box; endings: Record<string, Box>;
  tala?: TalaInfo; laya?: number; players?: string; notes?: string[]; type?: string; _await2?: boolean; _endStart?: number;
}
interface GroupSlot { sym: Sym; graces?: Slot[] | null; openBefore?: boolean; closeAfter?: boolean }
interface Group { slots: GroupSlot[]; g?: Slot[] | null; openNext?: boolean }

export function compilePart(src: SourcePart, instKey: string, table: TalaTable): { part: TreePart; warnings: Warning[] } {
  const warnings: Warning[] = [];
  const warn = (line: number, msg: string) => warnings.push({ line, msg });
  const baseTala = talaInfo(table, src.tala, src.laya);
  let runTala = baseTala;

  const charans: WorkCharan[] = [];
  let ch: WorkCharan | null = null, lastClosed: WorkCharan | null = null;
  let box: Box | null = null;                    // current container: the body or an ending
  let gan: WorkGan | null = null, gat: Gat | null = null;   // open gan / gat
  let ending = 0;
  let slurOpen = false, slurNext = false, graces: Slot[] = [], group: Group | null = null;
  let pendingPickup: Matra[] = [];
  let lastSounding: Slot | null = null;

  const hasContent = (c: WorkCharan | null): boolean => !!c && (c.body.count > 0 || Object.keys(c.endings).length > 0);
  const openCharan = () => {
    const c: WorkCharan = { n: charans.length + 1, label: null, repeat: 1, pickup: pendingPickup, body: { lines: [], count: 0 }, endings: {} };
    if (runTala !== baseTala) c.tala = runTala;
    ch = c; pendingPickup = []; charans.push(c); box = c.body; gan = null; gat = null;
  };
  const talaOf = (c: WorkCharan | null): TalaInfo => (c && c.tala) || runTala;
  const finishGan = (ln: number) => {
    if (!gan) return;
    const T = talaOf(ch);
    const size = gan.gats.reduce((a, g) => a + g.matras.reduce((b, m) => b + (m.span || 1), 0), 0);
    if (gan.partial) { delete gan.partial; gan.short = true; gan = null; gat = null; return; }
    if (size !== T.ganSize) warn(ln, `गण has ${size} matras; ${T.name} expects ${T.ganSize}`);
    else if (T.gats && gan.gats.length > 1) {
      const split = gan.gats.map(g => g.matras.reduce((b, m) => b + (m.span || 1), 0));
      if (split.join('+') !== T.gats.join('+')) warn(ln, `गट split ${split.join('+')}; ${T.name} expects ${T.gats.join('+')}`);
    }
    gan = null; gat = null;
  };
  const finishCharan = (ln: number) => {
    if (!ch) return;
    finishGan(ln);
    if (ch.pickup === pendingPickup) pendingPickup = [];   // the pickup now belongs to this charan; don't hand it on
    if (!hasContent(ch) && !ch.pickup.length) charans.pop(); else lastClosed = ch;
    ch = null; box = null; ending = 0;
  };
  const lineObj = (ln: number, srcText: string): TreeLine => {
    const L = box!.lines[box!.lines.length - 1];
    if (L && L.line === ln) return L;
    const nl: TreeLine = { line: ln, src: srcText, gans: [] }; box!.lines.push(nl); return nl;
  };
  let linePartial = false;
  const ensure = (ln: number, srcText: string) => {
    if (!ch) openCharan();
    if (!gan) {
      const g: WorkGan = { gats: [{ matras: [] }] };
      if (linePartial) g.partial = true;
      gan = g; gat = g.gats[0]; lineObj(ln, srcText).gans.push(g);
    }
  };

  const decorate = (ev: Slot): Slot => {
    if (graces.length) { ev.grace = graces; graces = []; }
    if (SOUNDING.has(ev.type)) {
      if (slurNext) { ev.slur = 'start'; slurNext = false; }
      else if (slurOpen) ev.slur = 'mid';
      lastSounding = ev;
    }
    return ev;
  };
  const closeSlurOn = (ev: Slot | null) => { if (ev) ev.slur = ev.slur === 'start' ? 'single' : 'end'; slurOpen = false; };
  const placeMatra = (m: Matra, ln: number, srcText: string, isPickup: boolean) => {
    if (isPickup) { pendingPickup.push(m); if (ch && !hasContent(ch)) { ch.pickup = pendingPickup; } return; }
    ensure(ln, srcText);
    const T = talaOf(ch);
    m.beat = (box!.count % T.cycle) + 1;
    box!.count += m.span || 1;
    gat!.matras.push(m);
  };

  src.lines.forEach((raw, li) => {
    const L: SourceLine = typeof raw === 'string' ? { t: raw } : raw;
    const ln = li + 1, isPickup = !!L.pickup;
    linePartial = !!L.partial;
    const lineMatras: Matra[] = [];
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
        case 'gat': if (gan) { gat = { matras: [] }; (gan as WorkGan).gats.push(gat); } break;
        case 'endOpen':
          finishGan(ln);
          if (tk.n === 1) {
            if (!ch) openCharan();
            const c = ch as unknown as WorkCharan;
            c._endStart = c.body.count; c.endings['1'] = { lines: [], count: c.body.count }; box = c.endings['1'];
          } else {
            if (!ch && lastClosed && lastClosed._await2) { ch = lastClosed; if (!charans.includes(ch)) charans.push(ch); }
            if (!ch || !(ch as WorkCharan)._await2) { warn(ln, '{2 without {1 … :॥'); break; }
            const c = ch as WorkCharan;
            c.endings['2'] = { lines: [], count: c._endStart! }; box = c.endings['2'];
          }
          ending = tk.n; break;
        case 'endClose':
          if (ending === 2) { delete ch!._await2; finishCharan(ln); } else { finishGan(ln); ending = 0; }
          break;
        case 'label': { const c = hasContent(ch) ? ch : (lastClosed || ch); if (c) c.label = tk.v; break; }
        case 'footnoteMark': break;
        case 'dir':
          if (tk.k === 'laya') { if (!ch) openCharan(); (ch as unknown as WorkCharan).laya = +toLatinDigits(tk.v); }
          else if (tk.k === 'tala') {
            const [t, l] = tk.v.split('-');
            runTala = talaInfo(table, t, l || runTala.laya);
            if (ch && !hasContent(ch)) (ch as WorkCharan).tala = runTala;
          } else if (tk.k === 'yati') {
            if (!ch) openCharan();
            finishGan(ln);
            const n = +toLatinDigits(tk.v), T = talaOf(ch);
            lineObj(ln, L.t).gans.push({ yati: n, span: n * T.ganSize } as TreeGan);
            box!.count += n * T.ganSize;
          } else warn(ln, `Unknown directive @${tk.k}`);
          break;
        case 'cue': { const m: Matra = { cue: tk.text, span: tk.matras, slots: [] }; placeMatra(m, ln, L.t, isPickup); lineMatras.push(m); break; }
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
          const m: Matra = { group: true, slots: [] };
          g.slots.forEach(s => {
            if (s.openBefore) { slurOpen = true; slurNext = true; }
            graces = s.graces || [];
            const ev = decorate(toSlot(s.sym, tk.mods));
            m.slots.push(ev);
            if (s.closeAfter) closeSlurOn(ev);
          });
          placeMatra(m, ln, L.t, isPickup); lineMatras.push(m);
          break;
        }
        case 'sym':
          if (group) { group.slots.push({ sym: tk.sym, graces: group.g, openBefore: group.openNext }); group.g = null; group.openNext = false; break; }
          { const m: Matra = { slots: [decorate(toSlot(tk.sym))] }; placeMatra(m, ln, L.t, isPickup); lineMatras.push(m); }
          break;
      }
    }
    // per-line extras
    const nonPick = isPickup ? [] : lineMatras;
    if (L.lyrics) {
      if (L.lyrics.length !== nonPick.length) warn(ln, `lyrics: ${L.lyrics.length} entries for ${nonPick.length} matras`);
      nonPick.forEach((m, k) => { if (L.lyrics![k]) m.lyric = L.lyrics![k]; });
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
  const out = charans.map((c, k): TreeCharan => {
    const T = c.tala || baseTala;
    if (c.pickup.length) {
      const tot = c.pickup.reduce((a, m) => a + (m.span || 1), 0); let b = T.cycle - tot;
      c.pickup.forEach(m => { m.beat = (b % T.cycle) + 1; b += m.span || 1; });
    }
    const o: TreeCharan = { n: k + 1, repeat: 0, lines: [] };
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
  const part: TreePart = { instrument: instKey, source: src.source || null, status: src.status || 'draft', tala: baseTala, charans: out };
  if (src.headingTala) part.headingTala = src.headingTala;
  if (src.form) part.form = src.form;
  return { part, warnings };
}

export function compilePiece(src: SourcePiece, lib: TalaLibrary | TalaTable): { piece: TreePiece; warnings: Warning[] } {
  const table = tableOf(lib);
  const out: TreePiece = { format: 'ghosh-notation/2', id: src.id, kind: src.kind || 'rachana', title: src.title, section: src.section, parts: {} };
  for (const k of ['complete', 'raga', 'text', 'usage', 'standing', 'notes', 'tags', 'tuning', 'media'] as const)
    if (src[k] !== undefined) (out as unknown as Record<string, unknown>)[k] = src[k];
  if (out.raga) {
    const notes = (s: string): RagaNote[] => tokenize(s, 0).flatMap(t => t.t === 'sym' && t.sym.kind === 'note'
      ? [{ swara: t.sym.swara!, octave: t.sym.oct!, ...(t.sym.vikrit ? { vikrit: true } : {}), dev: t.sym.dev }] : []);
    out.raga = { ...out.raga, ...(out.raga.aroha ? { arohaNotes: notes(out.raga.aroha) } : {}), ...(out.raga.avaroha ? { avarohaNotes: notes(out.raga.avaroha) } : {}) };
  }
  const warnings: Warning[] = [];
  for (const [k, p] of Object.entries(src.parts)) {
    const r = compilePart(p, k, table);
    out.parts[k] = r.part;
    r.warnings.forEach(w => warnings.push({ part: k, ...w }));
  }
  return { piece: out, warnings };
}
