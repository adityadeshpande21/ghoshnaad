// Moved from v1.1.0 with its shared names replaced by the services below. Checked by tsc as plain JavaScript (tsconfig.loose.json: wrong names, properties and argument types fail; implicit any is allowed).
// Write a new rachana: grid of matras, ghosh keypad, आनक suggestions, checks, play, save on this device.
import { Screen } from '../../ui/screen.js';
import * as C from '../../core/composer.ts';
import { compile3 } from '../../core/compile/ghosh3.ts';
import talasJson from '../../../rules/talas.json';
import { clicked, target, qsa } from '../../ui/dom.js';

/** @param {import('../../ui/env.d.ts').AppEnv} env */
function createComposer(env) {
const { i18n, esc, dv, applyStatic, fitRows, loadJSON, player: PL } = env;
const $ = env.q;   // like v1.1.0: null when the element is absent
const compile3x = src => compile3(src, { talas: talasJson });
const TI = C.TALA_INFO;

/* ---------- strings (मराठी / हिंदी / English) ---------- */
const chk = (k, i, value) => i18n.t(`composer.check.${k}.${i}`, { value });

/* ---------- storage: this device only ---------- */
let MINE = [], saveOk = true, DATA = null;
function loadMine() { try { const v = JSON.parse(localStorage.getItem('ghosh.mine') || '[]'); MINE = Array.isArray(v) ? v.filter(r => r && r.blocks) : []; } catch (e) { MINE = []; } }
let saveT = null, saving = false, frozen = false;
let flushNow = null;
function saveMine(now) {
  clearTimeout(saveT);
  if (frozen) return;                       // a restore is replacing the list: nothing may write the old one over it
  saving = true;
  const go = () => {
    saving = false; flushNow = null;
    if (frozen) return;
    try { localStorage.setItem('ghosh.mine', JSON.stringify(MINE)); saveOk = true; } catch (e) { saveOk = false; }
    if (window.PlatformUI) window.PlatformUI.edit();
    if (!$('#ceditor').hidden) renderHead(); if (window.Library) window.Library.syncMine();
  };
  if (now) go(); else { flushNow = go; saveT = setTimeout(go, 300); }
}
async function data() { if (!DATA) { try { DATA = await loadJSON('data/composer.json'); } catch (e) { DATA = { ragas: [], anak: {} }; } } return DATA; }

/* ---------- views ---------- */
let view = null, lastView = 'ceditor';
function show(id) {
  if (id !== 'ceditor' && PL.S.custom) stopPlay();
  $('#list').hidden = true; $('#player').hidden = true;
  qsa('.cview').forEach(v => { v.hidden = v.id !== id; });
  view = id; if (id === 'ceditor' || id === 'ccheck') lastView = id;
}
function toList() { stopPlay(); qsa('.cview').forEach(v => v.hidden = true); $('#player').hidden = true; $('#list').hidden = false; view = null; setLib('mine'); }

/* ---------- library tabs + my rachanas ---------- */
let lib = 'book', menuFor = null, renaming = null, confirmDel = null;
function setLib(l) {
  lib = l; try { env.store.set('lib', l); } catch (e) {}
  $('#bookWrap').hidden = l !== 'book'; $('#mineWrap').hidden = l !== 'mine';
  qsa('[data-lib]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.lib === l)));
  if (l === 'mine') renderMine();
}
const instrName = k => i18n.t('common.parts.' + k);
const talaLabel = k => i18n.name(TI[k].dev, TI[k].rom);
function metaOf(r) {
  const d = new Date(r.updated || r.created || Date.now()), today = new Date().toDateString() === d.toDateString();
  const when = today ? i18n.t('composer.today') + ' ' + dv(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')) : d.toLocaleDateString(env.lang() === 'en' ? 'en-IN' : (env.lang() === 'hi' ? 'hi-IN' : 'mr-IN'), { day: 'numeric', month: 'short' });
  return [instrName(r.instr), talaLabel(r.tala) + ' ' + dv(r.laya), r.raga && r.raga.name ? i18n.name(r.raga.name, env.settings.RAGA_ROM[r.raga.name]) : '', when].filter(Boolean).join(' · ');
}
const isReady = r => !C.check(r).some(x => x.sev === 'fix');
function renderLibTabs() {
  const nl = (window.LIBROWS || []).length; document.querySelectorAll('[data-lib="book"]').forEach(b => b.textContent = nl ? i18n.t('library.tabAll', { count: dv(PL.LIST.length) }) : i18n.t('composer.book', { name: dv(PL.LIST.length || 120) }));
  document.querySelectorAll('[data-lib="mine"]').forEach(b => b.textContent = i18n.t('composer.mine'));
}
function renderMine() {
  renderLibTabs();
  const rows = MINE.slice().sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
  let h = rows.length ? '' : `<p class="empty">${esc(i18n.t('composer.none'))}</p>`;
  rows.forEach(r => {
    const ready = isReady(r);
    h += `<div class="mrowi"><button class="mo" data-open="${r.id}"><b>${esc(r.name)} <span class="tag ${ready ? 'ok' : 'todo'}">${esc(i18n.t(ready ? 'composer.ready' : 'composer.draft'))}</span></b><small>${esc(metaOf(r))}</small></button>
      <button class="ib" data-play="${r.id}" aria-label="${esc(i18n.t('player.play'))}"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l11-7z"/></svg></button>
      <button class="ib" data-menu="${r.id}" aria-label="${esc(i18n.t('composer.more'))}" aria-expanded="${menuFor === r.id}"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg></button></div>`;
    if (menuFor === r.id) {
      if (renaming === r.id) h += `<div class="mmenu"><input id="mRename" value="${esc(r.name)}" aria-label="${esc(i18n.t('composer.rename'))}" maxlength="60"><button data-act="renameOk" data-id="${r.id}">${esc(i18n.t('composer.apply'))}</button></div>`;
      else if (confirmDel === r.id) h += `<div class="mmenu"><span style="align-self:center;font-weight:600">${esc(i18n.t('composer.sure'))}</span><button class="danger" data-act="delOk" data-id="${r.id}">${esc(i18n.t('composer.yes'))}</button><button data-act="delNo">${esc(i18n.t('composer.no'))}</button></div>`;
      else h += `<div class="mmenu">${[['edit', 'composer.edit'], ['lipi', 'export.mine'], ['export', 'export.app'], ['dup', 'composer.dup'], ['rename', 'composer.rename'], ['player', 'composer.openPlayer']].map(([a, k]) => `<button data-act="${a}" data-id="${r.id}">${esc(i18n.t(k))}</button>`).join('')}<button class="danger" data-act="del" data-id="${r.id}">${esc(i18n.t('composer.delete'))}</button></div>`;
    }
  });
  h += `<div class="mnote"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg><span>${esc(i18n.t('composer.privacy'))}</span></div>
    <div class="mact"><button class="cbig alt" id="mImport">${esc(i18n.t('composer.import'))}</button><button class="cbig" id="mNew"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>${esc(i18n.t('composer.new'))}</button></div>`;
  $('#mineWrap').innerHTML = h;
  const ri = $('#mRename'); if (ri) { ri.focus(); ri.select(); ri.onkeydown = e => { if (e.key === 'Enter') $('[data-act="renameOk"]').click(); }; }
}
function byId(id) { return MINE.find(r => r.id === id); }
function touch(r) { r.updated = new Date().toISOString(); saveMine(); }
function dupOf(r, name) { const c = JSON.parse(JSON.stringify(r)); c.id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); c.name = name || r.name + i18n.t('composer.copySuffix'); c.created = c.updated = new Date().toISOString(); return c; }
document.addEventListener('click', e => {
  const t = clicked(e, '[data-lib],[data-open],[data-play],[data-menu],[data-act],#mNew,#mImport'); if (!t || !t.closest('#list')) return;
  if (t.dataset.lib) { setLib(t.dataset.lib); return; }
  if (t.dataset.open) { openEditor(t.dataset.open); return; }
  if (t.dataset.play) { env.audio.unlock(); playWhole(byId(t.dataset.play), {}); return; }
  if (t.dataset.menu) { menuFor = menuFor === t.dataset.menu ? null : t.dataset.menu; renaming = confirmDel = null; renderMine(); return; }
  if (t.id === 'mNew') { openNew(); return; }
  if (t.id === 'mImport') { $('#cImport').value = ''; $('#cImport').click(); return; }
  const r = byId(t.dataset.id), a = t.dataset.act;
  if (a === 'edit') openEditor(r.id);
  else if (a === 'export') openExport(r);
  else if (a === 'lipi') { const pc = compileCur(r); if (pc) window.Swarlipi.open(pc); }
  else if (a === 'dup') { const c = dupOf(r); MINE.push(c); saveMine(true); menuFor = c.id; renderMine(); }
  else if (a === 'rename') { renaming = r.id; renderMine(); }
  else if (a === 'renameOk') { const v = ($('#mRename').value || '').trim(); if (v) { r.name = v; touch(r); } renaming = null; renderMine(); }
  else if (a === 'player') { env.audio.unlock(); playWhole(r, {}); }
  else if (a === 'del') { confirmDel = r.id; renderMine(); }
  else if (a === 'delOk') { MINE = MINE.filter(x => x.id !== t.dataset.id); saveMine(true); if (window.Library) window.Library.mineDeleted(t.dataset.id); menuFor = confirmDel = null; renderMine(); }
  else if (a === 'delNo') { confirmDel = null; renderMine(); }
});

/* ---------- new rachana ---------- */
let nf = null;
async function openNew() {
  const D = await data();
  nf = { name: i18n.t('composer.defName', { n: dv(MINE.length + 1) }), instr: 'vanshi', tala: 'kerva', laya: TI.kerva.laya, raga: '' };
  $('#cName').value = nf.name; $('#cRaga').value = '';
  $('#cRagaList').innerHTML = D.ragas.map(r => `<option value="${esc(r.name)}">${esc(env.settings.RAGA_ROM[r.name] || '')}</option>`).join('');
  show('cnew'); renderNew();
}
function ragaInfo(name) { const D = DATA || { ragas: [] }; const n = String(name || '').trim(); if (!n) return null;
  return D.ragas.find(r => r.name === n || (env.settings.RAGA_ROM[r.name] || '').toLowerCase() === n.toLowerCase()) || { name: n }; }
function renderNew() {
  $('#cInstr').innerHTML = ['shankh', 'vanshi'].map(k => `<button data-instr="${k}" aria-pressed="${nf.instr === k}"><b>${esc(instrName(k))}</b><small>${esc(i18n.t(k === 'shankh' ? 'composer.shankhSub' : 'composer.vanshiSub'))}</small></button>`).join('');
  $('#cTala').innerHTML = Object.keys(TI).map(k => `<button data-tala="${k}" aria-pressed="${nf.tala === k}">${esc(talaLabel(k))}<small>${esc(i18n.t('composer.matras', { count: dv(TI[k].gan * (k === 'rupak' ? 1 : 2)) }))}</small></button>`).join('');
  $('#cLaya').textContent = dv(nf.laya); $('#cTalaNote').textContent = i18n.t('composer.lineNote', { matras: dv(TI[nf.tala].gan) });
  const ri = ragaInfo($('#cRaga').value), box = $('#cScale');
  if (ri && nf.instr === 'vanshi') {
    box.hidden = false;
    if (ri.aroha) { const set = C.ragaSet(ri), out = C.SWARAS.filter(s => !set.has(s) && !set.has(s + '_'));
      box.innerHTML = `<span>${esc(i18n.t('composer.aroha'))} <b>${esc(ri.aroha)}</b></span><span>${esc(i18n.t('composer.avaroha'))} <b>${esc(ri.avaroha || '')}</b></span>${out.length ? `<span>${esc(i18n.t('composer.dimNote', { keys: out.join(', ') }))}</span>` : ''}`; }
    else box.innerHTML = `<span>${esc(i18n.t('composer.noScale'))}</span>`;
  } else box.hidden = true;
}
$('#cnew').addEventListener('click', e => {
  const b = clicked(e, '[data-instr],[data-tala]'); if (!b) return;
  if (b.dataset.instr) nf.instr = b.dataset.instr;
  if (b.dataset.tala) { nf.tala = b.dataset.tala; nf.laya = TI[nf.tala].laya; }
  renderNew();
});
$('#cRaga').addEventListener('input', () => renderNew());
$('#cName').addEventListener('input', () => { nf.name = $('#cName').value; });
const layaStep = l => (l >= 300 ? 15 : 5);
$('#cLdown').onclick = () => { nf.laya = Math.max(40, nf.laya - layaStep(nf.laya)); renderNew(); };
$('#cLup').onclick = () => { nf.laya = Math.min(600, nf.laya + layaStep(nf.laya)); renderNew(); };
$('#cnewBack').onclick = () => toList();
$('#cStart').onclick = () => {
  const ri = nf.instr === 'vanshi' ? ragaInfo($('#cRaga').value) : null;
  const r = C.newRachana({ name: ($('#cName').value || '').trim() || nf.name, instr: nf.instr, tala: nf.tala, laya: nf.laya, raga: ri ? { name: ri.name, aroha: ri.aroha || '', avaroha: ri.avaroha || '' } : null });
  MINE.push(r); saveMine(true); openEditor(r.id);
};

/* ---------- editor ---------- */
let cur = null, sel = null, mods = { oct: 0, vik: false }, tab = 'swar', hist = [], fut = [], sugOpen = false, sugPos = 'start', delAsk = false, textErr = '';
function openEditor(id, at) {
  cur = byId(id); if (!cur) return;
  hist = []; fut = []; mods = { oct: 0, vik: false }; tab = 'swar'; sugOpen = false; delAsk = false; textErr = '';
  sel = at || { bi: 0, li: 0, row: 'mel', i: 0 };
  data().then(() => { if (view === 'ceditor') renderPad(); });
  show('ceditor'); render();
  if (at) setTimeout(() => { const el = $('#cLines .cc.sel'); if (el) el.scrollIntoView({ block: 'center' }); }, 30);
}
const B = () => cur.blocks[sel.bi], LN = () => B().lines[sel.li], M = () => LN()[sel.row][sel.i];
const lineLen = () => TI[cur.tala].gan * C.GANS_PER_LINE;
function snapshot() { hist.push(JSON.stringify(cur.blocks)); if (hist.length > 200) hist.shift(); fut = []; }
function changed() { touch(cur); render(); }
function blockLabel(bi) {
  const b = cur.blocks[bi]; if (b.type === 'prarambhik') return i18n.t('player.prarambhik');
  let n = 0; for (let k = 0; k <= bi; k++) if (cur.blocks[k].type !== 'prarambhik') n++; return i18n.t('player.charan', { n: dv(n) });
}
function clampSel() {
  sel.bi = Math.min(sel.bi, cur.blocks.length - 1); const b = B();
  if (!b.lines.length) b.lines.push(C.emptyLine(cur.tala));
  sel.li = Math.min(sel.li, b.lines.length - 1); sel.i = Math.min(sel.i, lineLen() - 1);
}
function render() { if (!cur) return; clampSel(); renderHead(); renderBlocks2(); renderBar(); renderLines(); renderPad(); }
function renderHead() {
  if (!cur) return;
  $('#cTitle').textContent = cur.name;
  $('#cSub').textContent = metaOf(cur).split(' · ').slice(0, -1).concat(saveOk ? i18n.t('composer.saved') : i18n.t('composer.notSaved')).join(' · ');
  const n = C.check(cur).filter(x => x.sev === 'fix').length; const bd = $('#cBadge'); bd.hidden = !n; bd.textContent = dv(n);
  $('#cUndo').disabled = !hist.length; $('#cRedo').disabled = !fut.length;
}
function renderBlocks2() {
  let h = cur.blocks.map((b, bi) => `<button role="tab" data-b="${bi}" aria-selected="${bi === sel.bi}">${esc(blockLabel(bi))}<small>${esc(dv(b.lines.length) + ' · ' + (b.repeat > 1 ? ':॥' : i18n.t('composer.once')))}</small></button>`).join('');
  h += `<button class="add" data-addb="charan">${esc(i18n.t('composer.addCharan'))}</button>`;
  if (cur.blocks[0].type !== 'prarambhik') h += `<button class="add" data-addb="prarambhik">${esc(i18n.t('composer.addPra'))}</button>`;
  $('#cBlocks').innerHTML = h;
}
function renderBar() {
  const b = B();
  let h = `<b>${esc(blockLabel(sel.bi))}</b>`;
  if (b.type !== 'prarambhik') h += `<button id="cRep" aria-pressed="${b.repeat > 1}">${esc(i18n.t('composer.twiceT'))}</button>`;
  else h += `<span class="cnote">${esc(i18n.t('composer.once'))}</span>`;
  h += '<span class="sp" style="flex:1"></span>';
  if (cur.blocks.length > 1) h += delAsk ? `<span class="cnote">${esc(i18n.t('composer.sure'))}</span><button class="danger" id="cDelBOk">${esc(i18n.t('composer.yes'))}</button><button id="cDelBNo">${esc(i18n.t('composer.no'))}</button>` : `<button class="danger" id="cDelB">${esc(i18n.t('composer.delBlock'))}</button>`;
  $('#cBar').innerHTML = h;
}
function tokHTML(t, isAnak) {
  const p = C.parseToken(t);
  if (!p) return `<span class="s">${esc(t)}</span>`;
  if (p.kind === 'hold' || p.kind === 'rest') return `<span class="s hold">${t}</span>`;
  if (p.kind === 'bol') return `<span class="s">${esc(p.bol)}</span>`;
  let cls = 's'; if (p.oct < 0) cls += ' dot-b'; if (p.oct > 0) cls += ' dot-t'; if (p.vikrit) cls += ' vk';
  return `<span class="${cls}">${esc(p.base)}</span>`;
}
function talCells(line, blockEnd) {
  const T = talasJson.talas[cur.tala] || null;
  const cyc = T ? T.cycle : TI[cur.tala].gan * 2, beats = T ? new Set(T.talVadya.variants[T.talVadya.default].beats) : null;
  const isStep = i => !beats || beats.has((i % cyc) + 1);
  // पणव on every step (also over आनक rests), not on +; on a चरण's last step: झल्लरी + त्रिभुज loud (झ) instead
  let last = -1; if (blockEnd) for (let i = line.anak.length - 1; i >= 0; i--) if (isStep(i)) { last = i; break; }
  return line.anak.map((m, i) => {
    if (!m.s.length) return '';
    if (i === last) return 'झ';
    if (m.s[0] === '+') return '–';
    return isStep(i) ? 'ध्व' : 'ऽ';
  });
}
function renderLines() {
  const b = B(), g = TI[cur.tala].gan, fixes = C.check(cur);
  const bad = new Set(fixes.filter(x => x.sev === 'fix' && x.at.bi === sel.bi).map(x => `${x.at.li}.${x.at.row}.${x.at.i}`));
  let h = '';
  b.lines.forEach((l, li) => {
    const tal = talCells(l, li === b.lines.length - 1);
    h += `<div class="cline${li === sel.li ? ' on' : ''}"><div class="clh"><span>${esc(i18n.t('composer.line', { n: dv(li + 1) }))}</span><span class="sp"></span>
      <button data-dup="${li}" aria-label="${esc(i18n.t('composer.dupLine'))}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg></button>
      ${b.lines.length > 1 ? `<button data-dell="${li}" aria-label="${esc(i18n.t('composer.delLine'))}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 12a2 2 0 002 2h4a2 2 0 002-2l1-12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button>` : ''}</div><div class="cgans" style="--gpm:${g * 4 <= 8 ? 4 : 2}">`;
    for (let gi = 0; gi < C.GANS_PER_LINE; gi++) {
      h += `<div class="cgan" style="grid-template-columns:repeat(${g},minmax(0,1fr))">`;
      ['mel', 'anak'].forEach(row => {
        for (let k = 0; k < g; k++) {
          const i = gi * g + k, m = l[row][i], on = li === sel.li && row === sel.row && i === sel.i;
          let inner = m.s.map(t => tokHTML(t, row === 'anak')).join('');
          for (let x = m.s.length; x < m.n; x++) inner += '<span class="ph">·</span>';
          const cls = `cc${row === 'anak' ? ' ak' : (cur.instr === 'shankh' ? ' sh' : '')}${m.s.length ? '' : ' empty'}${on ? ' sel' : ''}${bad.has(`${li}.${row}.${i}`) ? ' bad' : ''}`;
          h += `<button class="${cls}" data-l="${li}" data-r="${row}" data-i="${i}" aria-label="${esc(i18n.t('composer.cell', { part: row === 'mel' ? instrName(cur.instr) : instrName('anak'), line: dv(li + 1), matra: dv(i + 1) }))}">${inner}</button>`;
        }
      });
      for (let k = 0; k < g; k++) h += `<span class="ctal">${tal[gi * g + k]}</span>`;
      h += '</div>';
    }
    h += '</div></div>';
  });
  h += `<button class="cadd" id="cAddLine">${esc(i18n.t('composer.addLine'))}</button>`;
  $('#cLines').innerHTML = h;
  if (typeof fitRows === 'function') {}
}
/* keypad */
function renderPad() {
  if (!cur) return;
  const m = M();
  $('#cSplit').innerHTML = [1, 2, 3, 4].map(n => `<button data-split="${n}" aria-pressed="${m.n === n}" aria-label="${esc(i18n.t('composer.splitA', { count: dv(n) }))}">${['१', '½', '⅓', '¼'][n - 1]}</button>`).join('');
  $('#cTabs').innerHTML = [['swar', 'composer.tabSwar'], ['anak', 'composer.tabAnak'], ['text', 'composer.tabText']].map(([id, k]) => `<button role="tab" data-tab="${id}" aria-selected="${tab === id}">${esc(i18n.t(k))}</button>`).join('');
  $('#cTval').textContent = dv(cur.laya);
  $('#cText').hidden = tab !== 'text'; $('#cKeys').hidden = tab === 'text';
  const key = (attrs, label, sub, cls = '', o = {}) => `<button class="ck ${cls}" ${attrs} ${o.dis ? 'disabled' : ''} ${o.pressed != null ? `aria-pressed="${o.pressed}"` : ''} aria-label="${esc(o.aria || label)}">${label}${sub != null ? `<small>${esc(sub)}</small>` : ''}</button>`;
  if (tab === 'swar') {
    const rs = C.ragaSet(cur.raga), sh = cur.instr === 'shankh';
    const r1 = C.SWARAS.map(sw => {
      const dis = sh && !['स', 'ग', 'प'].includes(sw), out = rs && !rs.has(sw) && !rs.has(sw + '_');
      const disp = (mods.oct < 0 ? `<span class="s dot-b">${sw}</span>` : mods.oct > 0 ? `<span class="s dot-t">${sw}</span>` : sw);
      return key(`data-sw="${sw}"`, disp, out ? i18n.t('composer.outRaga') : '', `sw${sh ? ' shk' : ''}${out ? ' dim' : ''}`, { dis, aria: sw });
    }).join('');
    const r2 = key('data-mod="low"', '·', i18n.t('composer.low'), 'sm', { pressed: mods.oct < 0, dis: sh && false }) + key('data-mod="high"', "'", i18n.t('composer.high'), 'sm', { pressed: mods.oct > 0, dis: sh }) +
      key('data-mod="vik"', '_', i18n.t('composer.vik'), 'sm', { pressed: mods.vik, dis: sh }) + key('data-put="ऽ"', 'ऽ', i18n.t('composer.hold')) + key('data-put="–"', '–', i18n.t('composer.rest')) + key('data-k="bk"', '⌫', '', 'sm', { aria: i18n.t('composer.del') });
    $('#cKeys').innerHTML = `<div class="ckrow" style="grid-template-columns:repeat(7,minmax(0,1fr))">${r1}</div><div class="ckrow" style="grid-template-columns:repeat(6,minmax(0,1fr))">${r2}</div>`;
  } else if (tab === 'anak') {
    const r1 = [['त', ''], ['त्र', i18n.t('composer.roll')], ['थ', ''], ['थ्र', ''], ['+', i18n.t('composer.click')], ['ऽ', i18n.t('composer.hold')], ['–', i18n.t('composer.rest')]].map(([t, s]) => key(`data-put="${t}"`, t, s, 'bol')).join('');
    const r2 = key('data-k="sug"', i18n.t('composer.suggest'), '', 'sm', { pressed: sugOpen }) + key('data-k="prev"', '←', '', 'sm', { aria: i18n.t('composer.prevM') }) + key('data-k="next"', '→', '', 'sm', { aria: i18n.t('composer.nextM') }) +
      key('data-k="clr"', i18n.t('composer.clear'), '', 'sm') + key('data-k="bk"', '⌫', '', 'sm', { aria: i18n.t('composer.del') });
    $('#cKeys').innerHTML = `<div class="ckrow" style="grid-template-columns:repeat(7,minmax(0,1fr))">${r1}</div><div class="ckrow" style="grid-template-columns:1.6fr repeat(4,minmax(0,1fr))">${r2}</div>`;
  } else {
    const l = LN();
    $('#cText').innerHTML = `<label for="cTxM">${esc(i18n.t('composer.textMel'))}</label><textarea id="cTxM" rows="2" spellcheck="false">${esc(C.lineText(l.mel, cur.tala))}</textarea>
      <label for="cTxA">${esc(i18n.t('composer.textAnak'))}</label><textarea id="cTxA" rows="2" spellcheck="false">${esc(C.lineText(l.anak, cur.tala))}</textarea>
      ${textErr ? `<span class="err" role="alert">${esc(textErr)}</span>` : ''}<button class="cbig sm" id="cTxApply">${esc(i18n.t('composer.apply'))}</button>`;
  }
  $('#cSug').hidden = !(tab === 'anak' && sugOpen); if (!$('#cSug').hidden) renderSug();
}
function renderSug() {
  const D = DATA || { anak: {} }, P2 = (D.anak[cur.tala] || {})[sugPos] || [];
  const gi = sugPos === 'start' ? 0 : 2;
  const mel = LN().mel.slice(gi * TI[cur.tala].gan, (gi + 2) * TI[cur.tala].gan);
  const longAt0 = mel[1] && mel[1].s[0] === 'ऽ';
  const list = P2.map(x => ({ ...x, score: x.n + (longAt0 && /^त्र\s*ऽ/.test(x.p) ? 50 : 0) })).sort((a, b) => b.score - a.score).slice(0, 8);
  $('#cSug').innerHTML = `<div class="sh-h"><h3>${esc(i18n.t('composer.sugTitle'))}</h3></div><span class="cnote">${esc(i18n.t('composer.sugFrom', { count: dv(P2.length) }))} · ${esc(i18n.t('composer.sugInto', { gan: dv(gi + 1) + '–' + dv(gi + 2) }))}</span>
    <div class="csgrp" role="group">${[['start', 'composer.sugStart'], ['end', 'composer.sugEnd']].map(([k, l]) => `<button data-sugpos="${k}" aria-pressed="${sugPos === k}">${esc(i18n.t(l))}</button>`).join('')}</div>
    ${list.length ? list.map((x, i) => `<div class="csi"><span class="t"><b>${esc(x.p)}</b><small>${esc(i18n.t('player.times', { n: dv(x.n) }))} · ${esc(x.src.join(', '))}</small></span><button class="use" data-use="${i}">${esc(i18n.t('composer.use'))}</button></div>`).join('') : `<span class="cnote">${esc(i18n.t('composer.noSug'))}</span>`}`;
  $('#cSug')._list = list;
}
function applyMods(sw) {
  let t = sw; const vOK = ['री', 'ग', 'म', 'ध', 'नि'].includes(sw);
  if (mods.oct < 0) t += '.'; if (mods.oct > 0) t += "'"; if (mods.vik && vOK) t += '_';
  return t;
}
function advance() {
  if (sel.i < lineLen() - 1) sel.i++;
  else if (sel.li < B().lines.length - 1) { sel.li++; sel.i = 0; }
}
function retreat() { if (sel.i > 0) sel.i--; else if (sel.li > 0) { sel.li--; sel.i = lineLen() - 1; } }
function put(tok) {
  snapshot(); const m = M();
  if (m.s.length >= m.n) m.s = [];
  m.s.push(tok); mods = { oct: 0, vik: false };
  if (m.s.length >= m.n) advance();
  changed(); scrollSel();
}
function backspace() {
  const m = M(); snapshot();
  if (m.s.length) m.s.pop(); else { retreat(); const p = M(); p.s.pop(); }
  changed();
}
function scrollSel() { const el = $('#cLines .cc.sel'); if (el && el.scrollIntoView) { const r = el.getBoundingClientRect(), pr = $('.cmain').getBoundingClientRect(); if (r.top < pr.top || r.bottom > pr.bottom) el.scrollIntoView({ block: 'nearest' }); } }
function toast(msg) { const t = $('#cToast'); t.textContent = msg; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, 2200); }

$('#ceditor').addEventListener('click', e => {
  const t = clicked(e, 'button'); if (!t) return;
  const d = t.dataset;
  if (d.l != null && d.r) { sel = { bi: sel.bi, li: +d.l, row: d.r, i: +d.i }; if (d.r === 'anak' && tab === 'swar') tab = 'anak'; else if (d.r === 'mel' && tab === 'anak') { tab = 'swar'; sugOpen = false; } textErr = ''; render(); return; }
  if (d.b != null) { sel = { bi: +d.b, li: 0, row: sel.row, i: 0 }; delAsk = false; stopPlay(); render(); return; }
  if (d.addb) { snapshot(); const nb = { type: d.addb, repeat: d.addb === 'prarambhik' ? 1 : 2, lines: [C.emptyLine(cur.tala)] };
    if (d.addb === 'prarambhik') { cur.blocks.unshift(nb); sel = { bi: 0, li: 0, row: 'mel', i: 0 }; } else { cur.blocks.push(nb); sel = { bi: cur.blocks.length - 1, li: 0, row: 'mel', i: 0 }; }
    changed(); return; }
  if (t.id === 'cRep') { snapshot(); B().repeat = B().repeat > 1 ? 1 : 2; changed(); return; }
  if (t.id === 'cDelB') { delAsk = true; renderBar(); return; }
  if (t.id === 'cDelBNo') { delAsk = false; renderBar(); return; }
  if (t.id === 'cDelBOk') { snapshot(); cur.blocks.splice(sel.bi, 1); delAsk = false; sel = { bi: Math.max(0, sel.bi - 1), li: 0, row: 'mel', i: 0 }; changed(); return; }
  if (t.id === 'cAddLine') { snapshot(); B().lines.push(C.emptyLine(cur.tala)); sel = { ...sel, li: B().lines.length - 1, i: 0, row: 'mel' }; changed(); scrollSel(); return; }
  if (d.dup != null) { snapshot(); B().lines.splice(+d.dup + 1, 0, JSON.parse(JSON.stringify(B().lines[+d.dup]))); sel = { ...sel, li: +d.dup + 1 }; changed(); return; }
  if (d.dell != null) { snapshot(); B().lines.splice(+d.dell, 1); changed(); return; }
  if (d.split) { snapshot(); const m = M(); m.n = +d.split; m.s = m.s.slice(0, m.n); changed(); return; }
  if (d.tab) { tab = d.tab; textErr = ''; if (tab === 'anak' && sel.row === 'mel') sel.row = 'anak'; if (tab === 'swar' && sel.row === 'anak') sel.row = 'mel'; render(); return; }
  if (d.sw) { if (cur.instr === 'shankh' && mods.oct < 0 && d.sw !== 'प') mods.oct = 0; put(applyMods(d.sw)); return; }
  if (d.mod) { if (d.mod === 'low') mods.oct = mods.oct < 0 ? 0 : -1; if (d.mod === 'high') mods.oct = mods.oct > 0 ? 0 : 1; if (d.mod === 'vik') mods.vik = !mods.vik; renderPad(); return; }
  if (d.put) { put(d.put); return; }
  if (d.k === 'bk') { backspace(); return; }
  if (d.k === 'prev') { retreat(); render(); return; }
  if (d.k === 'next') { advance(); render(); return; }
  if (d.k === 'clr') { snapshot(); const m = M(); m.s = []; changed(); return; }
  if (d.k === 'sug') { sugOpen = !sugOpen; data().then(renderPad); return; }
  if (d.sugpos) { sugPos = d.sugpos; renderSug(); return; }
  if (d.use != null) { const x = $('#cSug')._list[+d.use], row = C.patternRow(x.p, cur.tala); if (!row) return;
    snapshot(); const g = TI[cur.tala].gan, from = (sugPos === 'start' ? 0 : 2) * g; row.forEach((m, k) => { LN().anak[from + k] = m; }); sel = { ...sel, row: 'anak', i: Math.min(lineLen() - 1, from + row.length) % lineLen() }; changed(); return; }
  if (t.id === 'cTxApply') {
    const a = C.parseLineText($('#cTxM').value, cur.tala), b = C.parseLineText($('#cTxA').value, cur.tala);
    const err = a.error || b.error;
    if (err) { textErr = err.k === 'gans' ? i18n.t('composer.errGans', { found: dv(err.n) }) : i18n.t('composer.errMatras', { found: dv(err.n), need: dv(err.want) }); renderPad(); return; }
    snapshot(); LN().mel = a.row; LN().anak = b.row; textErr = ''; changed(); return;
  }
  if (t.id === 'cUndo') { if (!hist.length) return; fut.push(JSON.stringify(cur.blocks)); cur.blocks = JSON.parse(hist.pop()); changed(); return; }
  if (t.id === 'cRedo') { if (!fut.length) return; hist.push(JSON.stringify(cur.blocks)); cur.blocks = JSON.parse(fut.pop()); changed(); return; }
  if (t.id === 'cedBack') { stopPlay(); toList(); return; }
  if (t.id === 'cCheckBtn') { openCheck(); return; }
  if (t.id === 'cTitle') { renameInline(); return; }
  if (t.id === 'cPlayLine') { playScope('line'); return; }
  if (t.id === 'cPlayBlock') { playScope('block'); return; }
  if (t.id === 'cPlayAll') { env.audio.unlock(); playWhole(cur, { returnTo: 'composer' }); return; }
  if (t.id === 'cTdown' || t.id === 'cTup') { snapshot(); cur.laya = Math.max(40, Math.min(600, cur.laya + (t.id === 'cTup' ? 1 : -1) * layaStep(cur.laya))); changed(); if (PL.S.custom) playScope(playing, true); return; }
});
function renameInline() {
  const b = $('#cTitle'); const inp = document.createElement('input'); inp.value = cur.name; inp.maxLength = 60; inp.className = 'ctitle'; inp.setAttribute('aria-label', i18n.t('composer.rename'));
  inp.style.cssText = 'border:1px solid var(--line);border-radius:8px;padding:2px 6px;font:inherit;font-size:18px;background:var(--panel2);color:var(--fg)';
  b.replaceWith(inp); inp.focus(); inp.select();
  const done = () => { const v = inp.value.trim(); if (v) { cur.name = v; touch(cur); } inp.replaceWith(b); renderHead(); };
  inp.onblur = done; inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = cur.name; inp.blur(); } };
}
/* keyboard (laptop) */
const KB = { s: 'स', r: 'री', g: 'ग', m: 'म', p: 'प', d: 'ध', n: 'नि' }, KA = { t: 'त', y: 'त्र', h: 'थ', j: 'थ्र', '+': '+' };
document.addEventListener('keydown', e => {
  if (view !== 'ceditor' || !cur) return;
  const tag = (target(e).tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea') return;
  const k = e.key, mod = e.ctrlKey || e.metaKey;
  if (mod && k.toLowerCase() === 'z') { e.preventDefault(); $(e.shiftKey ? '#cRedo' : '#cUndo').click(); return; }
  if (mod || e.altKey) return;
  if (sel.row === 'mel' && KB[k.toLowerCase()]) { e.preventDefault(); const sw = KB[k.toLowerCase()]; if (cur.instr === 'shankh' && !['स', 'ग', 'प'].includes(sw)) return; put(applyMods(sw)); return; }
  if (sel.row === 'anak' && KA[k]) { e.preventDefault(); put(KA[k]); return; }
  if (k === ',' || k === '.') { e.preventDefault(); mods.oct = mods.oct < 0 ? 0 : -1; renderPad(); return; }
  if (k === "'") { e.preventDefault(); mods.oct = mods.oct > 0 ? 0 : 1; renderPad(); return; }
  if (k === '_') { e.preventDefault(); mods.vik = !mods.vik; renderPad(); return; }
  if (k === '=') { e.preventDefault(); put('ऽ'); return; }
  if (k === '-') { e.preventDefault(); put('–'); return; }
  if (k === 'Backspace') { e.preventDefault(); backspace(); return; }
  if (k === 'ArrowRight') { e.preventDefault(); advance(); render(); return; }
  if (k === 'ArrowLeft') { e.preventDefault(); retreat(); render(); return; }
  if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); sel.row = sel.row === 'mel' ? 'anak' : 'mel'; tab = sel.row === 'anak' ? 'anak' : 'swar'; render(); return; }
  if (/^[1-4]$/.test(k)) { e.preventDefault(); $(`[data-split="${k}"]`).click(); return; }
  if (k === ' ') { e.preventDefault(); playScope('line'); return; }
});

/* ---------- play ---------- */
let playing = null, lastCell = null;
function compileCur(r) {
  if (!r.blocks.some(b => b.lines.some(l => l.mel.some(m => m.s.some(t => t !== 'ऽ' && t !== '–'))))) { toast(i18n.t('composer.fillFirst')); return null; }
  try { const { piece } = compile3x(C.toSource(r)); return piece; }
  catch (e) { toast(i18n.t('composer.compileErr') + ': ' + (e.message || e)); return null; }
}
function stopPlay() { if (PL.S.custom) { PL.stop(true); PL.S.custom = null; } playing = null; if (lastCell) { lastCell.classList.remove('play'); lastCell = null; } setIco(); }
function setIco() { const p = $('#cPlayIco'); if (p) p.setAttribute('d', playing === 'line' ? 'M7 5h4v14H7zM13 5h4v14h-4z' : 'M7 5v14l11-7z'); }
function playScope(scope, restart) {
  if (playing === scope && !restart) { stopPlay(); return; }
  env.audio.unlock(); const piece = compileCur(cur); if (!piece) return;
  PL.loadPiece(piece, 'printed'); env.renderPlayer(); PL.build();
  const cid = 'c' + (sel.bi + 1), lb = PL.TL[PL.LEAD].beats.filter(b => b.key && b.pass === 1 && b.key.startsWith(cid + '.b.'));
  const inScope = b => scope === 'block' || Math.floor(+b.key.split('.')[2] / C.GANS_PER_LINE) === sel.li;
  const bs = lb.filter(inScope); if (!bs.length) return;
  const s = Math.min(...bs.map(b => b.t)), e = Math.max(...bs.map(b => b.t + b.dur));
  PL.S.custom = { s, e }; playing = scope; setIco(); PL.start(s, false);
}
window.onEnginePaint = t => {
  if (view !== 'ceditor' || !PL.S.custom) return;
  const arr = PL.TL[PL.LEAD] && PL.TL[PL.LEAD].beats; if (!arr) return;
  let lo = 0, hi = arr.length - 1, a = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m].t <= t) { a = m; lo = m + 1; } else hi = m - 1; }
  const b = a >= 0 ? arr[a] : null; let el = null;
  if (b && b.key) { const p = b.key.split('.'); const bi = +p[0].slice(1) - 1, gi = +p[2], mi = +p[3];
    if (bi === sel.bi) { const li = Math.floor(gi / C.GANS_PER_LINE), i = (gi % C.GANS_PER_LINE) * TI[cur.tala].gan + mi; el = document.querySelector(`#cLines .cc[data-l="${li}"][data-r="mel"][data-i="${i}"]`); } }
  if (el !== lastCell) { if (lastCell) lastCell.classList.remove('play'); if (el) el.classList.add('play'); lastCell = el; }
};
function playWhole(r, o) { const piece = compileCur(r); if (!piece) return; stopPlay(); PL.showPiece(piece, { play: !o.march, march: o.march, returnTo: view ? 'composer' : null }); }

/* ---------- check ---------- */
function where(at) { return i18n.t('composer.where', { part: blockLabel(at.bi), line: dv(at.li + 1), matra: dv(at.i + 1) }); }
function openCheck() { stopPlay(); show('ccheck'); renderCheck(); }
function renderCheck() {
  const items = C.check(cur); let warn = [];
  try { const src = C.toSource(cur); warn = (compile3x(src).warnings || []).map(w => ({ sev: 'fix', k: 'compile', msg: (w.line ? '#' + w.line + ': ' : '') + w.msg, at: null })); } catch (e) { warn = [{ sev: 'fix', k: 'compile', msg: String(e.message || e), at: null }]; }
  const all = items.concat(warn), fx = all.filter(x => x.sev === 'fix').length, tp = all.length - fx;
  $('#cchkSub').textContent = cur.name + ' · ' + metaOf(cur);
  let h = `<div class="cstat">${fx ? `<span class="f">${esc(i18n.t('composer.fixes', { count: dv(fx) }))}</span>` : ''}${tp ? `<span class="t">${esc(i18n.t('composer.tips', { count: dv(tp) }))}</span>` : ''}${!all.length ? `<span class="o">${esc(i18n.t('composer.allOk'))}</span>` : ''}</div>`;
  all.forEach((x, idx) => {
    const title = chk(x.k, 0, x.t), how = chk(x.k, 1, x.k === 'compile' ? x.msg : (x.n != null ? dv(x.n) : x.t));
    h += `<div class="citem ${x.sev}"><span class="dot" aria-hidden="true">${x.sev === 'fix' ? '!' : 'i'}</span><div class="w">${x.at ? `<small>${esc(where(x.at))}</small>` : ''}<b>${esc(title)}</b><span>${esc(how)}</span>
      <div class="acts">${x.at ? `<button class="go" data-go="${idx}">${esc(i18n.t('composer.go'))}</button>` : ''}${x.key ? `<button data-keep="${esc(x.key)}">${esc(i18n.t('composer.keep'))}</button>` : ''}</div></div></div>`;
  });
  h += `<div class="cok">${[0, 1].map(i => `<span><b aria-hidden="true">✓</b> ${esc(i18n.t('composer.okList.' + i))}</span>`).join('')}</div>`;
  $('#cchkBody').innerHTML = h; $('#cchkBody')._all = all;
}
$('#ccheck').addEventListener('click', e => {
  const t = clicked(e, 'button'); if (!t) return;
  if (t.id === 'cchkBack') { show('ceditor'); render(); return; }
  if (t.dataset.go != null) { const x = $('#cchkBody')._all[+t.dataset.go]; openEditor(cur.id, { ...x.at }); tab = x.at.row === 'anak' ? 'anak' : 'swar'; render(); return; }
  if (t.dataset.keep) { cur.ignore = (cur.ignore || []).concat(t.dataset.keep); touch(cur); renderCheck(); return; }
  if (t.id === 'cchkPlay') { env.audio.unlock(); playWhole(cur, { returnTo: 'composer' }); return; }
  if (t.id === 'cchkMarch') { env.audio.unlock(); playWhole(cur, { march: true, returnTo: 'composer' }); return; }
});

/* ---------- export / import ---------- */
let expR = null;
function fileText(r) { return JSON.stringify({ ...C.toSource(r), composer: r }, null, 1); }
function openExport(r) {
  expR = r; $('#cexpText').value = fileText(r);
  qsa('.cview').forEach(v => { if (v.id === 'cexport') v.hidden = false; });
}
$('#cexpX').onclick = () => { $('#cexport').hidden = true; };
$('#cexport').addEventListener('click', e => { if (e.target.id === 'cexport') $('#cexport').hidden = true; });
$('#cexpCopy').onclick = () => {
  const ta = $('#cexpText'); const ok = () => toast(i18n.t('composer.copied'));
  try { navigator.clipboard.writeText(ta.value).then(ok, () => { ta.select(); try { document.execCommand('copy'); ok(); } catch (e) {} }); }
  catch (e) { ta.select(); try { document.execCommand('copy'); ok(); } catch (x) {} }
};
$('#cexpShare').onclick = async () => {
  const name = (expR.name || 'rachana').replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.ghosh.json', text = $('#cexpText').value;
  try { const f = new File([text], name, { type: 'application/json' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: expR.name }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); } catch (e) {}
};
function fromSource(src) {
  const instr = src.parts && (src.parts.vanshi ? 'vanshi' : src.parts.shankh ? 'shankh' : null); if (!instr) throw new Error('no melody part');
  const tdev = String(src.parts[instr].tala || '').split(/[-\s]/)[0], tala = /** @type {import('../../core/composer.ts').TalaKey} */ (Object.keys(TI).find(k => TI[k].dev === tdev)); if (!tala) throw new Error('tala ' + tdev);
  const ml = src.parts[instr].lines.map(l => (typeof l === 'string' ? l : l.src || '')), al = src.parts.anak ? src.parts.anak.lines.map(l => (typeof l === 'string' ? l : l.src || '')) : [];
  if (ml.some(l => /[{}]/.test(l))) throw new Error('endings {1 2} are not supported yet');
  const r = C.newRachana({ name: (src.title && src.title.dev) || 'Import', instr, tala, laya: src.parts[instr].laya || TI[tala].laya, raga: src.raga ? { name: src.raga.name || '', aroha: src.raga.aroha || '', avaroha: src.raga.avaroha || '' } : null });
  r.blocks = []; let blk = null;
  ml.forEach((l, i) => {
    const t = l.trim(); if (t.startsWith('॥') || !blk) { blk = { type: 'charan', repeat: 1, lines: [] }; r.blocks.push(blk); }
    const a = C.parseLineText(t, tala), b = al[i] ? C.parseLineText(al[i], tala) : { row: C.emptyLine(tala).anak };
    if (a.error || b.error) throw new Error('line ' + (i + 1));
    blk.lines.push({ mel: a.row, anak: b.row });
    if (/:॥\s*$/.test(t)) blk.repeat = 2;
  });
  if (r.blocks.length > 1 && r.blocks[0].repeat === 1 && r.blocks[0].lines.length === 1) r.blocks[0].type = 'prarambhik';
  return r;
}
$('#cImport').addEventListener('change', () => {
  const f = $('#cImport').files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const o = JSON.parse(String(rd.result)); let r;
      if (o.composer && Array.isArray(o.composer.blocks)) r = o.composer; else if (o.format === 'ghosh-notation/1') r = fromSource(o); else throw new Error('format');
      if (byId(r.id)) r = dupOf(r, r.name); r.updated = new Date().toISOString();
      MINE.push(r); saveMine(true); setLib('mine'); toast(i18n.t('composer.imported') + ': ' + r.name);
    } catch (e) { toast(i18n.t('composer.importErr') + ' (' + (e.message || e) + ')'); }
  };
  rd.readAsText(f);
});

/* ---------- hooks into the app ---------- */

try { applyStatic(); } catch (e) {}
return {
  all: () => MINE,
  // true while a change is waiting to be written, or the browser refused to write it
  unsaved: () => saving || !saveOk,
  isBusy: () => saving || !saveOk,
  // write a waiting change now (before a backup is taken)
  flush() { if (flushNow) { clearTimeout(saveT); flushNow(); } },
  freeze() { clearTimeout(saveT); frozen = true; },
  unfreeze() { frozen = false; },
  tabs: () => renderLibTabs(),
  // own compositions read from the रचना फोल्डर: new ones join, newer versions replace
  mergeFolder(arr) {
    let ch = 0;
    (arr || []).forEach(r => { if (!r || !r.id || !Array.isArray(r.blocks)) return; const i = MINE.findIndex(x => x.id === r.id);
      if (i < 0) { MINE.push(r); ch++; } else if (String(r.updated) > String(MINE[i].updated)) { MINE[i] = r; ch++; } });
    if (ch) { try { localStorage.setItem('ghosh.mine', JSON.stringify(MINE)); } catch (e) {} if (lib === 'mine') renderMine(); }
  },
  back() { show(lastView || 'ceditor'); if (lastView === 'ccheck') renderCheck(); else render(); },
  lang() { renderLibTabs(); if (lib === 'mine') renderMine(); if (view === 'ceditor') render(); if (view === 'ccheck') renderCheck(); if (view === 'cnew') renderNew(); },
  init() { loadMine(); applyStatic(); renderLibTabs(); let l = 'book'; try { l = env.store.get('lib', 'book'); } catch (e) {} setLib(l === 'mine' ? 'mine' : 'book'); }
};
}

export class ComposerScreen extends Screen {
  /** @param {import('../../ui/env.d.ts').AppEnv} env */
  constructor(env) { super(env, '#list'); this.ui = createComposer(env); }
  onLang() { this.ui.lang(); }
  isBusy() { return this.ui.isBusy(); }
}
