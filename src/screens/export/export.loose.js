// @ts-nocheck — moved from v1.1.0 with its shared names replaced by the services below; not fully typed yet.
// स्वरलिपी export: the rachana in the book's notation, for the instruments the user picks.
// Two outputs: a printable sheet (print / save as PDF) and plain text exactly as the books write it.
import { Screen } from '../../ui/screen.js';
import * as Composer from '../../core/composer.ts';
import { buildTimeline3 } from '../../core/timeline/timeline3.ts';

/** @param {import('../../ui/env.d.ts').AppEnv} env */
function createExport(env) {
const { i18n, esc, dv, dvN, mmss, secName, applyStatic, fitRows, slotHTML, store } = env;
const $ = env.q;   // like v1.1.0: null when the element is absent

/* ---------- what can be exported ---------- */
let XP = null, xsel = null, xranan = true, xstyle = 'rich', xlay = 'score';
try { xstyle = store.get('xstyle', 'rich') === 'plain' ? 'plain' : 'rich'; xlay = store.get('xlay', 'score') === 'pages' ? 'pages' : 'score'; } catch (e) {}
const MEL = ['shankh', 'vanshi'];
function options(piece) {
  const o = [];
  Object.keys(piece.parts).forEach(k => { if (MEL.includes(k) || k === 'anak') o.push(k); });
  if (piece.parts.panav) o.push('tal');
  if (piece.parts.steps) o.push('steps');
  return o;
}
const partKey = k => (k === 'tal' ? 'panav' : k);
// ताल वाद्य row = पणव; where the पणव is silent at a चरण end, the loud झल्लरी + त्रिभुज stroke (झ) is shown
function partGans(piece, k) {
  const gs = piece.parts[k].gans; if (k !== 'panav' || !piece.parts.jhallari) return gs;
  const J = Object.fromEntries(piece.parts.jhallari.gans.map(g => [g.addr, g]));
  return gs.map(g => { const jg = J[g.addr]; if (!jg || !g.gats) return g; const jm = jg.gats.flatMap(x => x.matras); let i = 0;
    return { ...g, gats: g.gats.map(gt => ({ ...gt, matras: gt.matras.map(m => { const j = jm[i++]; return m.charanEnd && j ? j : m; }) })) }; });
}
const optName = k => (k === 'tal' ? i18n.t('export.tal') : k === 'steps' ? i18n.t('export.steps') : i18n.t('common.parts.' + k));
const rowName = k => (k === 'tal' ? i18n.t('common.groups.tal') : i18n.t('common.parts.' + k));

/* ---------- book layout helpers ---------- */
// The books print each instrument on its own page: "instrument | title | tala-laya", आरोहण/अवरोहण for वंशी,
// then the lines with ॥ … | … :॥ bars, ॥ॐ॥ at the start, lead-ins right-aligned, * for सेतु. No charan labels.
const BOOK_NAME = { shankh: 'शंख', vanshi: 'वंशी', anak: 'आनक', tal: 'ताल वाद्य', steps: 'कदम' };
const SETU_NOTE = 'यह चरण सेतुपद है। इसे सभी वादक एक साथ बजाना चाहिए।';
function linesBy(piece, pk) {          // charan id -> [layout line]
  const lay = piece.layout.parts[MEL.includes(pk) || pk === 'anak' ? pk : piece.layout.lead], out = {};
  ((lay && lay.lines) || []).forEach(l => { if (l.pickup || !l.gans || !l.gans.length) return; const cid = l.gans[0].split('.')[0]; (out[cid] = out[cid] || []).push(l); });
  return out;
}
function talaLaya(piece) {
  const R = piece.rhythm, seen = []; R.charans.forEach(c => { const t = R.talas[c.tala].name.dev + '-' + dvN(c.laya); if (!seen.includes(t)) seen.push(t); });
  return seen.join(' ');
}
function lineInfo(piece, pk) {          // [{c, l, open, close, first, setu}] in book order
  const R = piece.rhythm, L = linesBy(piece, pk), part = piece.parts[pk], out = [];
  R.charans.forEach((c, ci) => {
    const ls = L[c.id] || []; if (!ls.length) return;
    const e1 = part.gans.filter(g => g.charan === c.id && g.seg === 'e1'), lastE1 = e1.length ? e1[e1.length - 1].addr : null, hasEnd = !!e1.length;
    ls.forEach((l, i) => {
      const last = i === ls.length - 1, endsE1 = lastE1 && l.gans[l.gans.length - 1] === lastE1;
      out.push({ c, l, ci, i, open: i === 0 ? '॥' : '|', close: endsE1 ? ':॥' : last ? (c.repeat > 1 && !hasEnd ? ':॥' : '॥') : '|', setu: c.type === 'setu' && i === 0 });
    });
  });
  return out;
}
const pickupOf = (piece, pk, cid) => (piece.parts[pk].pickups || []).find(x => x.charan === cid);

/* ---------- text, as the books write it ---------- */
function matraTok(m) {
  if (m.cue) return m.cue;
  const s = (m.slots || []).map(x => {
    if (x.type === 'note') return (x.dev || '') + (x.octave < 0 ? '.'.repeat(-x.octave) : x.octave > 0 ? "'".repeat(x.octave) : '') + (x.vikrit ? '_' : '') + (x.accent ? '^' : '');
    if (x.type === 'hold') return 'ऽ'; if (x.type === 'rest') return '–'; if (x.type === 'step') return x.foot === 'L' ? 'बा' : 'दा';
    return (x.dev || '') + (x.accent ? '^' : '');
  });
  return s.length > 1 ? '[' + s.join('') + ']' : (s[0] || '–');
}
function ganTok(g, gats) {
  if (g.yati) return 'यति ' + dvN(g.yati);
  let gs = g.gats;
  if (gs.length === 1 && gats && gats.length > 1) { const ms = gs[0].matras; gs = []; let i = 0; gats.forEach(n => { gs.push({ matras: ms.slice(i, i + n) }); i += n; }); }
  return gs.map(gt => gt.matras.map(matraTok).join(gs.length > 1 ? '' : ' ')).join(' , ');
}
const cleanSrc = s => s.replace(/@\S+\s*/g, '').replace(/#\S+/g, '').replace(/\s+/g, ' ').trim();
function partText(piece, k) {
  const pk = partKey(k), gans = {}, out = [], derived = !(MEL.includes(pk) || pk === 'anak');
  partGans(piece, pk).forEach(g => gans[g.addr] = g);
  const lead = piece.layout.lead, leadFirst = ((piece.layout.parts[lead] || {}).lines || []).find(l => l.src);
  const om = !!(leadFirst && /॥ॐ॥/.test(leadFirst.src)) || !!pickupOf(piece, lead, piece.rhythm.charans[0].id);
  let setu = false;
  out.push(`${BOOK_NAME[k]}      ${piece.meta.title.dev}      ${talaLaya(piece)}`);
  const rg = piece.meta.raga; if (MEL.includes(pk) && rg && rg.aroha) out.push(`आरोहण - ${rg.aroha}   अवरोहण - ${rg.avaroha || ''}`);
  if (k === 'anak' && xranan && piece.rhythm.prelude) { const P0 = piece.rhythm.prelude, pg = (piece.rhythm.talas[P0.tala] || {}).gats; out.push('रणन  ॥ ' + P0.parts.anak.gans.map(g => ganTok(g, pg)).join(' | ') + ' ॥'); }
  lineInfo(piece, pk).forEach(x => {
    const pu = x.i === 0 ? pickupOf(piece, pk, x.c.id) : null;
    const tg = (piece.rhythm.talas[x.c.tala] || {}).gats;
    if (pu) out.push((x.ci === 0 && om ? '॥ॐ॥' : '') + ' '.repeat(40) + (tg ? ', ' : '') + pu.matras.map(matraTok).join('') + ' ॥');
    let t;
    if (!derived && x.l.src && !/@yati/.test(x.l.src)) t = cleanSrc(x.l.src);
    else t = x.open + ' ' + x.l.gans.map(a => gans[a] ? ganTok(gans[a], tg) : '').join(' | ') + ' ' + x.close;
    if (derived && x.ci === 0 && x.i === 0 && om && !pickupOf(piece, lead, x.c.id)) t = '॥ॐ॥' + t.slice(1);
    if (x.setu && !t.startsWith('*')) t = '* ' + t;
    if (x.setu) setu = true;
    out.push(t);
  });
  if (setu) out.push('* ' + SETU_NOTE);
  return out;
}
function fullText(piece, sel) {
  const out = [];
  sel.forEach((k, i) => { if (i) out.push('', '────────────────────────', ''); out.push(...partText(piece, k)); });
  out.push('', '', i18n.t('export.legend'));
  return out.join('\n');
}

/* ---------- printable sheet, laid out like the book page ---------- */
function noteSpan(t) {
  const p = Composer.parseToken(t);
  if (!p || p.kind !== 'note') return esc(t);
  let c = 's'; if (p.oct < 0) c += ' dot-b'; if (p.oct > 0) c += ' dot-t'; if (p.vikrit) c += ' vk';
  return `<span class="${c}">${esc(p.base)}</span>`;
}
function bookMatra(m) {
  if (m.cue) return `<span class="bcue">${esc(m.cue)}</span>`;
  const grp = (m.slots || []).length > 1 || m.group;
  return `<span class="bmt${grp ? ' grp' : ''}">${(m.slots || []).map(x => (x.type === 'step' ? `<span class="s">${x.foot === 'L' ? 'बा' : 'दा'}</span>` : slotHTML(x))).join('')}</span>`;
}
const BAR = t => String(t).replace(/॥/g, '‖');
function bookGan(g, gats) {
  const end = g.seg && g.seg[0] === 'e' && /\.0$/.test(g.addr) ? `<sup class="bend">${dvN(g.seg.slice(1))}</sup>` : '';
  if (g.yati) return `<span class="bg">${end}<span class="bcue">यति ${dvN(g.yati)}</span></span>`;
  let gs = g.gats;
  if (gs.length === 1 && gats && gats.length > 1) { const ms = gs[0].matras; gs = []; let i = 0; gats.forEach(n => { gs.push({ matras: ms.slice(i, i + n) }); i += n; }); }
  if (gs.length > 1) return `<span class="bg gat">${end}${gs.map(gt => `<span class="bgat">${gt.matras.map(bookMatra).join('')}</span>`).join('<span class="bcomma">,</span>')}</span>`;
  return `<span class="bg">${end}${g.gats[0].matras.map(bookMatra).join('')}</span>`;
}
function bookSection(piece, k) {
  const pk = partKey(k), G = {}, lead = piece.layout.lead;
  partGans(piece, pk).forEach(g => G[g.addr] = g);
  const leadFirst = ((piece.layout.parts[lead] || {}).lines || []).find(l => l.src);
  const om = !!(leadFirst && /॥ॐ॥/.test(leadFirst.src)) || !!pickupOf(piece, lead, piece.rhythm.charans[0].id);
  const rg = piece.meta.raga;
  let h = `<section class="bpage r-${pk}"><div class="bhead"><span>${BOOK_NAME[k]}</span><b>${esc(piece.meta.title.dev)}</b><span>${esc(talaLaya(piece))}</span></div>`;
  if (MEL.includes(pk) && rg && rg.aroha) {
    const sc = str => Composer.tokenize(str).map(noteSpan).join(' ');
    h += `<div class="braga"><b>आरोहण</b> - ${sc(rg.aroha)} &nbsp;&nbsp; <b>अवरोहण</b> - ${sc(rg.avaroha || '')}</div>`;
  }
  const row = (margin, open, gans, close, cls = '') => `<div class="bl ${cls}"><span class="bmar">${BAR(margin)}</span><span class="bbar">${BAR(open)}</span>${gans.map((g, i) => (i ? '<span class="bbar">|</span>' : '') + g).join('')}<span class="bbar">${BAR(close)}</span></div>`;
  const gatsOf = c => (piece.rhythm.talas[c.tala] || {}).gats;
  if (k === 'anak' && xranan && piece.rhythm.prelude) { const P0 = piece.rhythm.prelude; h += row('रणन', '॥', P0.parts.anak.gans.map(g => bookGan(g, (piece.rhythm.talas[P0.tala] || {}).gats)), '॥', 'bran'); }
  let setu = false;
  lineInfo(piece, pk).forEach(x => {
    const pu = x.i === 0 ? pickupOf(piece, pk, x.c.id) : null;
    const omHere = x.ci === 0 && x.i === 0 && om;
    if (pu) h += `<div class="bpick"><span class="bmar">${omHere ? '‖ॐ‖' : ''}</span><span class="bpu">${gatsOf(x.c) ? ', ' : ''}${pu.matras.map(bookMatra).join('')} &nbsp;‖</span></div>`;
    const margin = (x.setu ? '*' : '') + (omHere && !pu ? '॥ॐ॥' : '');
    if (x.setu) setu = true;
    h += row(margin, omHere && !pu ? '' : x.open, x.l.gans.map(a => (G[a] ? bookGan(G[a], gatsOf(x.c)) : '<span class="bg"></span>')), x.close);
  });
  if (setu) h += `<p class="bnote">* ${SETU_NOTE}</p>`;
  return h + '</section>';
}
function sheetHTML(piece, sel) {
  if (xstyle === 'plain') return `<div class="sheet">${sel.map(k => bookSection(piece, k)).join('')}</div>`;
  if (xlay === 'pages' || sel.length === 1) return `<div class="rsheet">${sel.map(k => richDoc(piece, [k])).join('')}</div>`;
  return `<div class="rsheet">${richDoc(piece, sel)}</div>`;
}

/* ---------- enhanced sheet: same structure as the book, laid out as a score ---------- */
const SHORT = { shankh: 'शंख', vanshi: 'वंशी', anak: 'आनक', tal: 'ताल', steps: 'कदम' };
function ganCols(n, gats) { return gats && gats.length > 1 ? gats.map(g => `repeat(${g},minmax(0,1fr))`).join(' 10px ') : `repeat(${n},minmax(0,1fr))`; }
function richGan(g, gats, n) {
  const end = g.seg && g.seg[0] === 'e' && /\.0$/.test(g.addr) ? `<sup class="rend">${dvN(g.seg.slice(1))}</sup>` : '';
  if (g.yati) return `<span class="rg" style="grid-template-columns:1fr">${end}<span class="bcue">यति ${dvN(g.yati)}</span></span>`;
  const ms = g.gats.flatMap(gt => gt.matras), cells = [];
  let k = 0; (gats && gats.length > 1 ? gats : [ms.length]).forEach((cnt, gi) => { if (gi) cells.push('<span class="rcomma">,</span>'); for (let j = 0; j < cnt; j++, k++) cells.push(ms[k] ? `<span class="rc">${bookMatra(ms[k])}</span>` : '<span class="rc"></span>'); });
  return `<span class="rg" style="grid-template-columns:${ganCols(ms.length, gats)}">${end}${cells.join('')}</span>`;
}
function rulerGan(g, gats) {
  if (!g || g.yati) return '<span class="rg"></span>';
  const ms = g.gats.flatMap(gt => gt.matras), cells = []; let k = 0;
  (gats && gats.length > 1 ? gats : [ms.length]).forEach((cnt, gi) => { if (gi) cells.push('<span></span>'); for (let j = 0; j < cnt; j++, k++) { const b = ms[k] && ms[k].beat; cells.push(`<span class="rn${b === 1 ? ' sam' : ''}">${b ? dvN(b) : ''}</span>`); } });
  return `<span class="rg rul" style="grid-template-columns:${ganCols(ms.length, gats)}">${cells.join('')}</span>`;
}
function perfStrip(piece) {
  const R = piece.rhythm; if (!R.performance) return '';
  const chip = st => { if (st.id === 'r') return `<span class="pc r">${esc(i18n.t('player.ranan'))}</span>`; const c = R.charans.find(x => x.id === st.id);
    const lab = c.type === 'prarambhik' ? i18n.t('player.bPr') : c.type === 'setu' ? i18n.t('player.setu') : (c.no ? dvN(c.no) : '·');
    return `<span class="pc${st.closing ? ' cl' : ''}">${esc(lab)}${st.times > 1 ? `<small>×${dvN(st.times)}</small>` : ''}</span>`; };
  return `<div class="rperf"><span class="rlab">${esc(i18n.t('export.order'))}</span>${R.performance.map(chip).join('<span class="par">→</span>')}</div>`;
}
function richHeader(piece, keys) {
  const m = piece.meta, R = piece.rhythm, rg = m.raga;
  let dur = '';
  try { const lead = piece.layout.lead, t = buildTimeline3(piece, lead, { order: R.performance ? 'performance' : 'printed' }); dur = i18n.t('export.about') + ' ' + mmss(t.total - t.origin); } catch (e) {}
  const sc = str => Composer.tokenize(str).map(noteSpan).join(' ');
  return `<header class="rhead"><div class="rh1"><h1>${esc(m.title.dev)}</h1><div class="rparts">${keys.map(k => `<span class="rp p-${partKey(k)}">${BOOK_NAME[k]}</span>`).join('')}</div></div>
    <div class="rmeta"><span>${esc(secName(m.section))}</span><span>${esc(talaLaya(piece))}</span>${dur ? `<span>${esc(dur)}</span>` : ''}</div>
    ${rg && rg.aroha ? `<div class="rraga"><span><b>${esc(i18n.t('player.raga'))} ${esc(rg.name || '')}</b></span><span><i>आरोहण</i> ${sc(rg.aroha)}</span><span><i>अवरोहण</i> ${sc(rg.avaroha || '')}</span></div>` : ''}
    ${perfStrip(piece)}</header>`;
}
function richDoc(piece, sel) {
  const R = piece.rhythm, keys = sel.map(partKey), lead = MEL.find(k => keys.includes(k)) || keys[0];
  const G = {}, L = {}; keys.forEach(k => { G[k] = {}; partGans(piece, k).forEach(g => G[k][g.addr] = g); L[k] = linesBy(piece, k); });
  const info = lineInfo(piece, lead), leadFirst = ((piece.layout.parts[piece.layout.lead] || {}).lines || []).find(l => l.src);
  const om = !!(leadFirst && /॥ॐ॥/.test(leadFirst.src)) || !!pickupOf(piece, piece.layout.lead, R.charans[0].id);
  const multi = keys.length > 1, gatsOf = c => (R.talas[c.tala] || {}).gats;
  const row = (k, open, cells, close, cls = '') => `<div class="rrow ${cls} p-${k}"><span class="rlbl">${multi ? SHORT[k === 'panav' ? 'tal' : k] : ''}</span><span class="rbar">${BAR(open)}</span>${cells.map((c, i) => (i ? '<span class="rbar">|</span>' : '') + c).join('')}<span class="rbar">${BAR(close)}</span></div>`;
  let h = richHeader(piece, sel), setu = false;
  if (keys.includes('anak') && xranan && R.prelude) {
    const P0 = R.prelude, pg = (R.talas[P0.tala] || {}).gats;
    h += `<section class="rblk ranan"><div class="rbadge"><b>${esc(i18n.t('player.ranan'))}</b></div><div class="rlines"><div class="rline">${row('anak', '॥', P0.parts.anak.gans.map(g => richGan(g, pg)), '॥')}</div></div></section>`;
  }
  let ci = -1, blk = null;
  const byC = {}; info.forEach(x => (byC[x.c.id] = byC[x.c.id] || []).push(x));
  R.charans.forEach((c, cidx) => {
    const xs = byC[c.id]; if (!xs) return; ci++;
    const lab = c.type === 'prarambhik' ? i18n.t('player.bPr') : c.type === 'setu' ? i18n.t('player.setu') : (c.no ? dvN(c.no) : '');
    if (c.type === 'setu') setu = true;
    h += `<section class="rblk${ci % 2 ? ' alt' : ''}"><div class="rbadge"><b>${esc(lab)}</b>${c.repeat > 1 ? `<small>×${dvN(c.repeat)}</small>` : ''}${c.type === 'setu' ? '<small>*</small>' : ''}</div><div class="rlines">`;
    const gats = gatsOf(c);
    const pus = keys.map(k => [k, pickupOf(piece, k, c.id)]).filter(x => x[1]);
    if (pus.length || (cidx === 0 && om)) h += `<div class="rpick"><span class="rom">${cidx === 0 && om ? '‖ॐ‖' : ''}</span><span class="rpus">${pus.map(([k, p]) => `<span class="p-${k}">${multi ? `<em>${SHORT[k === 'panav' ? 'tal' : k]}</em>` : ''}${gats ? ', ' : ''}${p.matras.map(bookMatra).join('')} ‖</span>`).join('')}</span></div>`;
    xs.forEach((x, i) => {
      h += '<div class="rline">';
      if (i === 0) h += `<div class="rrow rruler"><span class="rlbl">${esc(i18n.t('composer.split'))}</span><span class="rbar"></span>${x.l.gans.map((a, j) => (j ? '<span class="rbar"></span>' : '') + rulerGan(G[lead][a], gats)).join('')}<span class="rbar"></span></div>`;
      keys.forEach(k => { const l = k === lead ? x.l : (L[k][c.id] || [])[i]; if (!l) return;
        h += row(k, x.open, l.gans.map(a => (G[k][a] ? richGan(G[k][a], gats) : '<span class="rg"></span>')), x.close); });
      h += '</div>';
    });
    h += '</div></section>';
  });
  if (setu) h += `<p class="rnote">* ${SETU_NOTE}</p>`;
  const lg = [['<span class="s dot-b">प</span>', 'export.lowO'], ['<span class="s dot-t">स</span>', 'export.highO'], ['<span class="s vk">ग</span>', 'export.vk'], ['ऽ', 'export.holdL'], ['–', 'export.restL'], ['<span class="bmt grp">सग</span>', 'export.grpL'], [':‖', 'export.twiceL'], ['<sup>१</sup> <sup>२</sup>', 'export.endL'], ['<b class="rsam">१</b>', 'export.samL']];
  h += `<footer class="rleg"><b>${esc(i18n.t('export.marks'))}</b>${lg.map(([g, k]) => `<span><i>${g}</i>${esc(i18n.t(k))}</span>`).join('')}</footer>`;
  return `<article class="rdoc">${h}</article>`;
}
const RICH_CSS = `.rsheet{font-family:"Mukta","Noto Sans Devanagari",system-ui,sans-serif;color:#17191E;background:#fff;max-width:900px;margin:0 auto;padding:10px 8px}
.rdoc+.rdoc{margin-top:22px;border-top:2px dashed #C9CCD3;padding-top:16px}
.rhead{border:1.5px solid #17191E;border-radius:12px;padding:12px 14px 10px;display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
.rh1{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}.rh1 h1{margin:0;font-size:30px;line-height:1.1}
.rparts{display:flex;gap:6px;flex-wrap:wrap}.rp{font-size:13px;font-weight:700;padding:1px 10px;border-radius:10px;border:1.5px solid currentColor}
.rmeta{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:14px;color:#3A3F4A}.rmeta span+span::before{content:"·";margin-right:14px;color:#9AA0AC}
.rraga{display:flex;flex-wrap:wrap;gap:4px 18px;font-size:15px}.rraga i{font-style:normal;color:#585E6C;font-size:12px;margin-right:6px}.rraga .s{font-weight:600}
.rperf{display:flex;flex-wrap:wrap;align-items:center;gap:4px;font-size:13px}.rlab{color:#585E6C;font-size:12px;margin-right:4px}
.pc{display:inline-flex;align-items:baseline;gap:2px;padding:1px 8px;border-radius:8px;background:#F1F2F4;font-weight:700}.pc.r{background:#E6EEF8;color:#1D5BA3}.pc.cl{background:#FFF1E2}.pc small{font-size:10px;font-weight:600;color:#585E6C}.par{color:#9AA0AC}
.rblk{display:grid;grid-template-columns:34px minmax(0,1fr);gap:6px;padding:8px 6px 6px 4px;border-radius:10px;margin-bottom:4px}
.rblk.alt{background:#F7F7F5}.rblk.ranan{background:#EEF3FA}
.rbadge{display:flex;flex-direction:column;align-items:center;gap:2px;padding-top:2px}
.rbadge b{width:30px;height:30px;border-radius:15px;background:#17191E;color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center}.ranan .rbadge b{width:auto;height:auto;padding:2px 6px;border-radius:8px;font-size:11px;background:#1D5BA3}
.rbadge small{font-size:12px;font-weight:700;color:#3A3F4A}
.rlines{display:flex;flex-direction:column;gap:6px;min-width:0}
.rline{display:flex;flex-direction:column;border-bottom:1px solid #E3E5EA;padding-bottom:4px;break-inside:avoid}.rline:last-child{border-bottom:0}
.rrow{display:grid;grid-template-columns:30px 16px minmax(0,1fr) 16px minmax(0,1fr) 16px minmax(0,1fr) 16px minmax(0,1fr) 24px;align-items:center;min-height:32px}
.rlbl{font-size:10px;font-weight:700;color:#585E6C;letter-spacing:.2px}
.rbar{text-align:center;font-family:"Times New Roman",serif;font-weight:700;font-size:20px;color:#17191E}
.rg{display:grid;align-items:center;justify-items:center;position:relative;min-width:0}
.rc{display:flex;justify-content:center;min-width:0}.rcomma{text-align:center;font-weight:700;color:#585E6C}
.rend{position:absolute;left:-2px;top:-6px;font-size:10px;font-weight:700}
.rrow.p-shankh,.rrow.p-vanshi{font-size:20px;font-weight:600}.rrow.p-anak{font-size:16px;font-weight:500}.rrow.p-panav{font-size:13px;min-height:24px}.rrow.p-steps{font-size:12px;min-height:22px}
.p-shankh{color:#7A3A00}.p-vanshi{color:#0B5A4E}.p-anak{color:#164C8A}.p-panav{color:#4E3E78}.p-steps{color:#3A3F4A}
.rrow.p-shankh .rlbl,.rrow.p-vanshi .rlbl,.rrow.p-anak .rlbl,.rrow.p-panav .rlbl{color:inherit}
.rrow .s.hold,.rrow .s.rest{color:#8A909C}
.rruler{min-height:14px}.rn{font-size:10px;color:#9AA0AC;line-height:1}.rn.sam{color:#B35A00;font-weight:800}.rruler .rlbl{font-size:9px;color:#B35A00}
.rpick{display:flex;align-items:center;justify-content:space-between;font-size:18px;font-weight:600;min-height:26px}.rom{font-family:"Times New Roman",serif;font-weight:700}
.rpus{display:flex;flex-direction:column;align-items:flex-end;gap:2px}.rpus em{font-style:normal;font-size:10px;margin-right:6px;color:#585E6C}
.rnote{font-size:12px;margin:6px 0 0 40px}
.rleg{margin-top:12px;border-top:1px solid #C9CCD3;padding-top:8px;display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:#3A3F4A}
.rleg b{color:#17191E}.rleg i{font-style:normal;font-weight:700;font-size:15px;margin-right:4px;color:#17191E}.rleg .rsam{color:#B35A00}`;
const SHEET_CSS = RICH_CSS + `.sheet{font-family:"Mukta","Noto Sans Devanagari",system-ui,sans-serif;color:#111;background:#fff;padding:8px 6px;max-width:900px;margin:0 auto}
.bpage{padding:14px 6px 18px}.bpage+.bpage{border-top:2px dashed #bbb;margin-top:6px}
.bhead{display:grid;grid-template-columns:1fr auto 1fr;align-items:baseline;gap:12px;margin:0 0 6px;font-size:17px}
.bhead b{font-size:22px;text-align:center}.bhead span:last-child{text-align:right}
.braga{text-align:center;font-size:14px;margin:0 0 8px}.braga .s{font-weight:600}
.bl{display:grid;grid-template-columns:44px 16px minmax(0,1fr) 16px minmax(0,1fr) 16px minmax(0,1fr) 16px minmax(0,1fr) 24px;align-items:center;min-height:40px;font-size:18px;font-weight:600}
.bl.bran{font-size:15px;color:#333}.bl.bran .bmar{font-size:12px;font-weight:600}
.bmar{font-size:15px;white-space:nowrap}
.bbar{text-align:center;font-weight:700;font-family:"Times New Roman",serif;font-size:1.15em}
.bg{display:flex;justify-content:space-around;align-items:center;position:relative;min-width:0}
.bg.gat{justify-content:center;gap:4px}
.bgat{display:inline-flex;gap:0}.bg.gat .bmt{padding-left:1px;padding-right:1px}.bcomma{margin:0 4px;font-weight:700}
.bmt{display:inline-flex;align-items:center;position:relative;padding:0 2px 4px}
.bmt.grp::after{content:"";position:absolute;left:1px;right:1px;bottom:0;height:4px;border:1.6px solid #111;border-top:0}
.bend{position:absolute;left:0;top:-4px;font-size:10px}
.bcue{font-size:14px;font-weight:700}
.bpick{display:grid;grid-template-columns:44px 1fr;align-items:center;min-height:30px;font-size:18px;font-weight:600}.bpu{text-align:right;padding-right:6px}
.bnote{font-size:12px;margin:10px 0 0}
.sheet .s.hold,.sheet .s.rest{color:#111}
.sheet .s .ac{font-size:.6em}`;

/* ---------- dialog ---------- */
function openExport2(piece) {
  XP = piece; const opts = options(piece);
  const role = k => (MEL.includes(k) ? 'mel' : k);
  let prev = null; try { prev = store.get('xsel2', null); } catch (e) {}
  xsel = opts.filter(k => (Array.isArray(prev) ? prev.includes(role(k)) : k !== 'steps'));
  if (!xsel.length) xsel = opts.filter(k => k !== 'steps');
  $('#xexport').hidden = false; renderX();
}
function renderX() {
  const opts = options(XP);
  $('#xParts').innerHTML = opts.map(k => `<button class="opt" data-xk="${k}" aria-pressed="${xsel.includes(k)}"><span>${esc(optName(k))}</span></button>`).join('') +
    (XP.rhythm.prelude && xsel.includes('anak') ? `<button class="opt" data-xr="1" aria-pressed="${xranan}"><span>${esc(i18n.t('export.ranan'))}</span></button>` : '');
  const none = !xsel.length;
  $('#xStyle').innerHTML = [['rich', 'export.rich'], ['plain', 'export.plain']].map(([v, k]) => `<button class="opt" data-xs="${v}" aria-pressed="${xstyle === v}"><span>${esc(i18n.t(k))}</span></button>`).join('');
  $('#xLayW').hidden = xstyle !== 'rich' || xsel.length < 2;
  $('#xLay').innerHTML = [['score', 'export.score'], ['pages', 'export.pages']].map(([v, k]) => `<button class="opt" data-xl="${v}" aria-pressed="${xlay === v}"><span>${esc(i18n.t(k))}</span></button>`).join('');
  $('#xNeed').hidden = !none;
  ['#xPrint', '#xCopy', '#xTxt', '#xHtml'].forEach(id => { $(id).disabled = none; });
  const order = opts.filter(k => xsel.includes(k));
  const box = $('#xPrev');
  box.innerHTML = none ? '' : `<div class="xscale">${sheetHTML(XP, order)}</div>`;
  if (!none) {
    const inner = box.firstChild, W = 760; inner.style.width = W + 'px';
    if (typeof fitRows === 'function') fitRows(inner);
    const sc = Math.min(1, (box.clientWidth - 2) / W); inner.style.transform = `scale(${sc})`; inner.style.transformOrigin = 'top left';
    box.style.height = Math.min(inner.scrollHeight * sc + 4, window.innerHeight * 0.46) + 'px';
    box.firstChild._sc = sc;
  }
}
function chosen() { return options(XP).filter(k => xsel.includes(k)); }
// plain ASCII: some browsers turn a file name with "—" into "download"
function fname(ext) { return (XP.meta.title.rom || XP.meta.title.dev || 'rachana').replace(/[\\/:*?"<>|]+/g, ' ').trim() + ' - swarlipi.' + ext; }
async function saveFile(text, name, type) {
  try { const f = new File([text], name, { type }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); } catch (e) {}
}
function toastX(m) { const t = $('#cToast'); if (!t) return; t.textContent = m; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, 2000); }
$('#xexport').addEventListener('click', async e => {
  if (e.target.id === 'xexport') { $('#xexport').hidden = true; return; }
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.xk) { const k = b.dataset.xk; xsel = xsel.includes(k) ? xsel.filter(x => x !== k) : [...xsel, k]; try { store.set('xsel2', xsel.map(x => (MEL.includes(x) ? 'mel' : x))); } catch (er) {} renderX(); return; }
  if (b.dataset.xr) { xranan = !xranan; renderX(); return; }
  if (b.dataset.xs) { xstyle = b.dataset.xs; try { store.set('xstyle', xstyle); } catch (er) {} renderX(); return; }
  if (b.dataset.xl) { xlay = b.dataset.xl; try { store.set('xlay', xlay); } catch (er) {} renderX(); return; }
  if (b.id === 'xX') { $('#xexport').hidden = true; return; }
  const sel = chosen(); if (!sel.length) return;
  if (b.id === 'xPrint') {
    $('#printArea').innerHTML = sheetHTML(XP, sel); if (typeof fitRows === 'function') fitRows($('#printArea'));
    document.title = (XP.meta.title.dev || '') + ' — स्वरलिपी';
    setTimeout(() => { try { window.print(); } catch (er) {} }, 50); return;
  }
  if (b.id === 'xCopy') { const t = fullText(XP, sel); try { await navigator.clipboard.writeText(t); toastX(i18n.t('export.copied')); } catch (er) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toastX(i18n.t('export.copied')); } catch (x) {} ta.remove(); } return; }
  if (b.id === 'xTxt') { saveFile(fullText(XP, sel), fname('txt'), 'text/plain'); return; }
  if (b.id === 'xHtml') {
    const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
    const doc = `<!doctype html><html lang="${env.lang()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(XP.meta.title.dev)} — स्वरलिपी</title><style>${css}\nbody{background:#fff;margin:0;padding:16px}${SHEET_CSS}</style></head><body>${sheetHTML(XP, sel)}</body></html>`;
    saveFile(doc, fname('html'), 'text/html'); return;
  }
});
window.addEventListener('afterprint', () => { $('#printArea').innerHTML = ''; document.title = 'घोष रचना वादक'; });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#xexport').hidden) $('#xexport').hidden = true; });
const st = document.createElement('style'); st.textContent = SHEET_CSS + `
#xexport{position:fixed;inset:0;background:rgba(0,0,0,.4);background:color-mix(in srgb,var(--fg) 35%,transparent);display:flex;align-items:flex-end;justify-content:center;z-index:26}
#xexport .sh-in{display:flex;flex-direction:column;gap:10px;max-width:760px}
#xParts{display:flex;flex-wrap:wrap;gap:8px}
#xPrev{border:1px solid var(--line);border-radius:12px;overflow-y:auto;overflow-x:hidden;background:#fff;flex:none}
.xscale{background:#fff}
.xbtns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.xbtns button:disabled{opacity:.4}
#printArea{display:none}
@media print{body>*:not(#printArea){display:none!important}#printArea{display:block!important}#printArea .sheet{max-width:none;padding:0}#printArea .rdoc+.rdoc{break-before:page;border-top:0;margin-top:0;padding-top:0}#printArea .rsheet{max-width:none;padding:0}#printArea .rblk.alt{-webkit-print-color-adjust:exact;print-color-adjust:exact}#printArea .bpage{break-after:page;border-top:0;margin:0}#printArea .bpage:last-child{break-after:auto}#printArea .bl{font-size:16px;min-height:36px}@page{margin:12mm}}`;
document.head.appendChild(st);


try { applyStatic(); } catch (e) {}
return { open: openExport2, text: fullText, sheet: sheetHTML, lang() { if (!$('#xexport').hidden) renderX(); } };
}

export class ExportScreen extends Screen {
  /** @param {import('../../ui/env.d.ts').AppEnv} env */
  constructor(env) { super(env, '#xexport'); this.x = createExport(env); }
  open(piece) { return this.x.open(piece); }
  close() { this.root.hidden = true; }
  onLang() { this.x.lang(); }
}
