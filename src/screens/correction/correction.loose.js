// Moved from v1.1.0 with its shared names replaced by the services below. Checked by tsc as plain JavaScript (tsconfig.loose.json: wrong names, properties and argument types fail; implicit any is allowed).
// दुरुस्ती: correct a book rachana by hand. Edits the book source (ghosh-notation/1), compiles it with the same compiler as the
// 120 book files, plays it, and keeps the corrected version on this device. Corrections can be exported as files and imported.
import { Screen } from '../../ui/screen.js';
import { compile3 } from '../../core/compile/ghosh3.ts';
import { buildTimeline3 } from '../../core/timeline/timeline3.ts';
import talasJson from '../../../rules/talas.json';
import { clicked, qsa } from '../../ui/dom.js';

/** @param {import('../../ui/env.d.ts').AppEnv} env */
function createCorrection(env) {
const { i18n, esc, dv, dvN, applyStatic, loadJSON, openPiece, player: PL } = env;
const $ = env.q;   // like v1.1.0: null when the element is absent
const Library = { saveSource: (...a) => window.Library.saveSource(...a), removeSource: (...a) => window.Library.removeSource(...a), downloadSource: (...a) => window.Library.downloadSource(...a), isLib: id => window.Library.isLib(id), sourceOf: id => window.Library.sourceOf(id), rows: () => window.Library.rows(), pieceOf: id => window.Library.pieceOf(id), mode: () => window.Library.mode() };
const GhoshCompile = { compile3: src => compile3(src, { talas: talasJson }) };

const clone = o => JSON.parse(JSON.stringify(o));
// the compiler speaks English; the common messages are given in मराठी / हिंदी too
/** @type {[RegExp, Record<string, string>][]} */
const TR = [
  [/^गण has (\d+) matras; (\S+) expects (\d+)/, { mr: 'गणात $1 मात्रा आहेत; $2 मध्ये $3 हव्यात', hi: 'गण में $1 मात्राएँ हैं; $2 में $3 चाहिए' }],
  [/^गट split (\S+); (\S+) expects (\S+)/, { mr: 'गटांची विभागणी $1; $2 मध्ये $3 हवी', hi: 'गटों का विभाजन $1; $2 में $3 चाहिए' }],
  [/^Unknown symbol "([^"]*)"/, { mr: 'अनोळखी चिन्ह "$1"', hi: 'अज्ञात चिह्न "$1"' }],
  [/^Charan (\d+): \{1 has no \{2/, { mr: 'चरण $1: {1 आहे पण {2 नाही', hi: 'चरण $1: {1 है पर {2 नहीं' }],
  [/^charan (\d+) repeats (\d+)×, (\S+) (\d+)×/, { mr: 'चरण $1 इथे $2 वेळा, $3 मध्ये $4 वेळा', hi: 'चरण $1 यहाँ $2 बार, $3 में $4 बार' }],
  [/^has (\d+) charans, (\S+) has (\d+)/, { mr: 'इथे $1 चरण, $2 मध्ये $3', hi: 'यहाँ $1 चरण, $2 में $3' }],
  [/^Unknown tala (.*)/, { mr: 'अनोळखी ताल $1', hi: 'अज्ञात ताल $1' }],
  [/^Swara (\S+) is outside the usual (\S+) range/, { mr: 'स्वर $1 नेहमीच्या $2 पल्ल्याबाहेर', hi: 'स्वर $1 सामान्य $2 सीमा से बाहर' }],
  [/^Stroke (\S+) in a melodic part/, { mr: 'स्वर भागात आनक बोल $1', hi: 'स्वर भाग में आनक बोल $1' }],
  [/^Swara (\S+) in a percussion part/, { mr: 'आनक भागात स्वर $1', hi: 'आनक भाग में स्वर $1' }],
  [/^Ending must be \{1 or \{2/, { mr: 'शेवट {1 किंवा {2 असा लिहा', hi: 'अंत {1 या {2 लिखें' }],
  [/^Parts unroll to different lengths: (.*)/, { mr: 'भागांची लांबी वेगळी: $1 मात्रा', hi: 'भागों की लंबाई अलग: $1 मात्राएँ' }]
];
function trMsg(m) {
  const t = TR.find(([re]) => re.test(m)); if (!t || !t[1][env.lang()]) return m;
  const [first, ...rest] = m.split('\n'); return [first.replace(t[0], t[1][env.lang()]).replace(/\d+/g, x => dv(x)), ...rest].join('\n');
}
const MEL = ['shankh', 'vanshi'];
const lineT = l => (typeof l === 'string' ? l : (l && l.t) || '');

/* corrections are kept by the रचना फोल्डर library (library.js): written to the folder, or waiting in the browser */
const compile = src => GhoshCompile.compile3(src);

/* ---------- editor state ---------- */
let cur = null;   // { id, orig, draft, tab, dirty, res }
const partKeys = d => Object.keys(d.parts || {}).sort((a, b) => (Number(MEL.includes(b)) - Number(MEL.includes(a))));
const partName = k => (i18n.has('common.parts.' + k) ? i18n.t('common.parts.' + k) : k);

function check(d) {
  const msgs = []; let piece = null;
  try { const r = compile(d); piece = r.piece; r.warnings.forEach(w => msgs.push({ sev: 'w', part: w.part, line: w.line, msg: trMsg(w.msg) })); }
  catch (e) {
    // find which part fails, so the message can point at its line
    let part = null;
    for (const k of partKeys(d)) { try { compile({ ...d, parts: { [k]: d.parts[k] } }); } catch (x) { part = k; break; } }
    const m = /^line (\d+)(?:, col \d+)?:\s*([\s\S]*)$/.exec(String(e.message || e));
    msgs.push({ sev: 'e', part, line: m ? +m[1] : null, msg: trMsg(m ? m[2] : String(e.message || e)) });
  }
  if (piece) {
    try {
      /** @type {[string, number][]} */
      const tot = Object.keys(piece.parts).filter(k => MEL.includes(k) || k === 'anak').map(k => [k, buildTimeline3(piece, k).total]);
      if (tot.length > 1 && Math.max(...tot.map(x => x[1])) - Math.min(...tot.map(x => x[1])) > 0.05)
        msgs.push({ sev: 'w', part: null, msg: i18n.t('correction.len', { parts: tot.map(([k, t]) => `${partName(k)} ${t.toFixed(1)} s`).join(', ') }) });
    } catch (e) {}
  }
  return { piece, msgs };
}

/* lines text <-> source lines, keeping each line's extra fields (pickup, note …) where the line is still there */
function mergeLines(old, texts) {
  const a = old.map(lineT), n = a.length, m = texts.length;
  const L = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === texts[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0, gi = [], gj = [];
  const flush = () => { gj.forEach((t, k) => { const o = gi[k] !== undefined ? old[gi[k]] : null; out.push(o && typeof o === 'object' ? { ...o, t } : t); }); gi = []; gj = []; };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === texts[j]) { flush(); out.push(old[i]); i++; j++; }
    else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { gj.push(texts[j]); j++; }
    else { gi.push(i); i++; }
  }
  flush();
  return out;
}

/* ---------- view ---------- */
function show() {
  $('#list').hidden = true; $('#player').hidden = true;
  qsa('.cview').forEach(v => { v.hidden = v.id !== 'fixer'; });
}
async function open(key, line) {
  const id = String(key).replace(/^f~/, ''), isBook = PL.BOOK.some(r => r.id === id);
  let book = null; if (isBook) { try { book = await loadJSON('data/src/' + id + '.json'); } catch (e) {} }
  const lib = window.Library ? Library.sourceOf(id) : null;
  const orig = lib || book; if (!orig) { toast(i18n.t('correction.noSrc')); return; }
  const keep = cur && cur.id === id && cur.dirty;
  if (!keep) cur = { id, book, orig, draft: clone(orig), fromLib: !!lib, tab: partKeys(orig)[0], dirty: false };
  if (line && line.part && cur.draft.parts[line.part]) cur.tab = line.part;
  show(); render(); recheck();
  if (line && line.n) selectLine(line.n);
}
function changedLines() {
  let n = 0;
  partKeys(cur.draft).forEach(k => {
    const a = (((cur.book || cur.orig).parts[k] || {}).lines || []).map(lineT), b = cur.draft.parts[k].lines.map(lineT);
    const len = Math.max(a.length, b.length); for (let i = 0; i < len; i++) if (a[i] !== b[i]) n++;
  });
  return n;
}
function renderHead() {
  const t = cur.draft.title || cur.orig.title || {};
  $('#fxT').textContent = i18n.t('correction.title', { name: t.dev ? i18n.name(t.dev, t.rom) : cur.id });
  const n = changedLines();
  $('#fxSub').textContent = [cur.dirty ? i18n.t('correction.dirty') : cur.fromLib ? i18n.t('correction.fromLib') : i18n.t('correction.orig'), n ? i18n.t('correction.changed', { n }) : ''].filter(Boolean).join(' · ');
  $('#fxRevert').hidden = !cur.book || !(cur.fromLib || cur.dirty); $('#fxDelete').hidden = !(window.Library && Library.isLib(cur.id));
}
function render() {
  renderHead();
  const errs = k => (cur.res ? cur.res.msgs.filter(m => m.sev === 'e' && m.part === k).length : 0);
  $('#fxTabs').innerHTML = partKeys(cur.draft).map(k => `<button role="tab" data-fx-tab="${k}" aria-selected="${cur.tab === k}">${esc(partName(k))}${errs(k) ? `<span class="bad">!</span>` : ''}</button>`).join('') +
    `<button role="tab" data-fx-tab="_json" aria-selected="${cur.tab === '_json'}">${esc(i18n.t('correction.file'))}</button>`;
  const json = cur.tab === '_json', ta = $('#fxText');
  $('#fxTala').parentNode.hidden = $('#fxLaya').parentNode.hidden = json;
  ta.classList.toggle('json', json);
  if (json) ta.value = JSON.stringify(cur.draft, null, 1);
  else { const p = cur.draft.parts[cur.tab]; ta.value = p.lines.map(lineT).join('\n'); $('#fxTala').value = p.tala || ''; $('#fxLaya').value = p.laya || ''; }
  $('#fxLegend').innerHTML = i18n.tb('correction.legend') + ' · <a href="#" data-guide="swar">' + esc(i18n.t('correction.legendGuide')) + '</a>';
  renderGutter(); renderMsgs();
}
function renderGutter() {
  const json = cur.tab === '_json', n = $('#fxText').value.split('\n').length;
  if (json) { $('#fxGut').innerHTML = ''; $('#fxGut').style.display = 'none'; return; }
  $('#fxGut').style.display = '';
  const p = cur.draft.parts[cur.tab], mark = {};
  (cur.res ? cur.res.msgs : []).forEach(m => { if (m.part === cur.tab && m.line) mark[m.line] = mark[m.line] === 'e' ? 'e' : m.sev; });
  const ln = curLine();
  let h = ''; for (let i = 1; i <= n; i++) { const o = p.lines[i - 1]; const pk = o && typeof o === 'object' && o.pickup;
    h += `<div class="${mark[i] || ''}${i === ln ? ' cur' : ''}" ${pk ? `title="${esc(i18n.t('correction.pickup'))}"` : ''}>${pk ? '↪ ' : ''}${dvN(i)}</div>`; }
  $('#fxGut').innerHTML = h; $('#fxGut').scrollTop = $('#fxText').scrollTop;
}
function renderMsgs() {
  const ms = cur.res ? cur.res.msgs : [];
  $('#fxMsgs').innerHTML = (cur.jsonErr ? `<button class="e"><i>${esc(i18n.t('correction.err'))}</i><span>${esc(i18n.t('correction.jsonErr') + cur.jsonErr)}</span></button>` : '') +
    (ms.length ? ms.map((m, i) => `<button class="${m.sev}" data-fx-msg="${i}"><i>${esc(m.sev === 'e' ? i18n.t('correction.err') : i18n.t('correction.warn'))}</i><span>${m.part && m.part !== '*' ? esc(m.line ? i18n.t('correction.line', { part: partName(m.part), line: dvN(m.line) }) : partName(m.part)) + ': ' : ''}${esc(m.msg.split('\n')[0])}</span></button>`).join('')
      : (cur.jsonErr ? '' : `<button class="ok"><i>✓</i><span>${esc(i18n.t('correction.ok'))}</span></button>`));
}
let ckT = null;
function recheck(now) { clearTimeout(ckT); const go = () => { if (!cur) return; cur.res = check(cur.draft); render2(); }; if (now) go(); else ckT = setTimeout(go, 350); }
function render2() {   // after a check: refresh marks without touching the text the person is typing in
  renderHead(); renderGutter(); renderMsgs();
  const errs = k => cur.res.msgs.filter(m => m.sev === 'e' && m.part === k).length;
  qsa('#fxTabs [data-fx-tab]').forEach(b => { const k = b.dataset.fxTab; if (k === '_json') return; b.innerHTML = esc(partName(k)) + (errs(k) ? '<span class="bad">!</span>' : ''); });
}
function curLine() { const ta = $('#fxText'); return ta.value.slice(0, ta.selectionStart).split('\n').length; }
function selectLine(n) {
  const ta = $('#fxText'), ls = ta.value.split('\n'); if (n < 1 || n > ls.length) return;
  let s = 0; for (let i = 0; i < n - 1; i++) s += ls[i].length + 1;
  ta.focus({ preventScroll: true }); ta.setSelectionRange(s, s + ls[n - 1].length);
  ta.scrollTop = Math.max(0, (n - 3) * 30); renderGutter();
}

/* ---------- editing ---------- */
$('#fxText').addEventListener('input', () => {
  const v = $('#fxText').value;
  if (cur.tab === '_json') {
    try { const o = JSON.parse(v); if (!o || !o.parts) throw new Error('parts'); cur.draft = o; cur.jsonErr = null; } catch (e) { cur.jsonErr = e.message; renderMsgs(); return; }
  } else {
    const texts = v.split('\n'); while (texts.length && !texts[texts.length - 1].trim()) texts.pop();
    const p = cur.draft.parts[cur.tab]; p.lines = mergeLines(p.lines, texts);
  }
  cur.dirty = true; renderGutter(); renderHead(); recheck();
});
['keyup', 'click', 'select'].forEach(t => $('#fxText').addEventListener(t, () => { if (cur.tab !== '_json') renderGutter(); }));
$('#fxText').addEventListener('scroll', () => { $('#fxGut').scrollTop = $('#fxText').scrollTop; });
$('#fxTala').addEventListener('input', () => { cur.draft.parts[cur.tab].tala = $('#fxTala').value.trim(); cur.dirty = true; renderHead(); recheck(); });
$('#fxLaya').addEventListener('input', () => { const v = +$('#fxLaya').value; if (v > 0) { cur.draft.parts[cur.tab].laya = v; cur.dirty = true; renderHead(); recheck(); } });
$('#fxTabs').addEventListener('click', e => {
  const b = clicked(e, '[data-fx-tab]'); if (!b || b.dataset.fxTab === cur.tab) return;
  if (cur.tab === '_json' && cur.jsonErr) return;   // keep the person in the file until it reads again
  cur.tab = b.dataset.fxTab; render();
});
$('#fxMsgs').addEventListener('click', e => {
  const b = clicked(e, '[data-fx-msg]'); if (!b) return; const m = cur.res.msgs[+b.dataset.fxMsg];
  if (m.part && cur.draft.parts[m.part]) { if (cur.tab !== m.part) { cur.tab = m.part; render(); } if (m.line) selectLine(m.line); }
});

/* ---------- actions ---------- */
function toast(msg) { const t = $('#fxToast'); t.textContent = msg; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, 2400); }
function ask(q, btns) {
  $('#fxAskT').textContent = q;
  $('#fxAskB').innerHTML = btns.map((b, i) => `<button data-i="${i}" class="${b.danger ? 'd' : ''}">${esc(b.label)}</button>`).join('');
  $('#fxAsk').hidden = false;
  $('#fxAskB').onclick = e => { const x = clicked(e, '[data-i]'); if (!x) return; $('#fxAsk').hidden = true; const f = btns[+x.dataset.i].go; if (f) f(); };
}
async function save() {
  cur.res = check(cur.draft);
  if (cur.jsonErr || cur.res.msgs.some(m => m.sev === 'e')) { render2(); toast(i18n.t('correction.bad')); return false; }
  const r = await Library.saveSource(cur.draft);
  cur.orig = clone(cur.draft); cur.fromLib = true; cur.dirty = false; render2();
  if (r.written) toast(r.conflict ? i18n.t('library.conflict', { name: r.file }) : i18n.t('library.savedFolder', { name: r.file }));
  else ask(i18n.t('library.savedLocal'), [{ label: i18n.t('library.download'), go: () => Library.downloadSource(cur.draft) }, { label: i18n.t('correction.later') }]);
  return true;
}
$('#fxSave').onclick = save;
$('#fxPlay').onclick = () => {
  if (cur.jsonErr) { toast(i18n.t('correction.bad')); return; }
  cur.res = check(cur.draft); render2();
  if (!cur.res.piece) { toast(i18n.t('correction.bad')); return; }
  env.audio.unlock(); PL.showPiece(cur.res.piece, { play: true, returnTo: 'fixer' });
};
// back to the book text (as an unsaved change; saving it updates the folder copy)
$('#fxRevert').onclick = () => ask(i18n.t('correction.revertQ'), [
  { label: i18n.t('correction.yes'), danger: true, go: () => { cur.draft = clone(cur.book); cur.dirty = true; cur.jsonErr = null; if (!cur.draft.parts[cur.tab] && cur.tab !== '_json') cur.tab = partKeys(cur.draft)[0]; render(); recheck(true); } },
  { label: i18n.t('correction.no') }]);
// remove the folder / browser copy of this rachana
$('#fxDelete').onclick = () => ask(i18n.t('correction.delQ'), [
  { label: i18n.t('correction.delete'), danger: true, go: async () => { const r = await Library.removeSource(cur.id); if (r.msg) toast(r.msg);
    if (cur.book) { cur.draft = clone(cur.book); cur.orig = clone(cur.book); cur.fromLib = false; cur.dirty = false; render(); recheck(true); } else { cur.dirty = false; leave(); } } },
  { label: i18n.t('correction.no') }]);
function leave() {
  $('#fxAsk').hidden = true;
  qsa('.cview').forEach(v => { if (v.id === 'fixer') v.hidden = true; });
  const id = cur.id; if (!cur.dirty) cur = null;
  const key = window.Library && Library.isLib(id) ? 'f~' + id : PL.BOOK.some(r => r.id === id) ? id : null;
  if (key) openPiece(key, false); else { $('#list').hidden = false; env.renderList(); }
}
$('#fxBack').onclick = () => {
  if (!cur.dirty) { leave(); return; }
  ask(i18n.t('correction.leaveQ'), [{ label: i18n.t('correction.save'), go: async () => { if (await save()) leave(); } }, { label: i18n.t('correction.discard'), danger: true, go: () => { cur.dirty = false; leave(); } }, { label: i18n.t('correction.cancel') }]);
};

/* download this rachana as a file */
$('#fxExport').onclick = () => Library.downloadSource(cur.draft);
/* import a rachana file or a corrections bundle: it joins the folder library */
$('#fxImport').addEventListener('change', () => {
  const f = $('#fxImport').files[0]; if (!f) return; $('#fxImport').value = '';
  const rd = new FileReader();
  rd.onload = async () => {
    let n = 0;
    try {
      const o = JSON.parse(String(rd.result)), list = [];
      if (o.format === 'ghosh-fixes/1' && o.fixes) Object.entries(o.fixes).forEach(([id, v]) => { if (v && v.src) list.push({ ...v.src, id }); });
      else if (o.format === 'ghosh-notation/1' && o.parts && !o.composer) list.push(o);
      else throw new Error('format');
      for (const src of list) { try { compile(clone(src)); await Library.saveSource(src); n++; } catch (e) {} }
      msg(i18n.t('correction.imported', { n }));
    } catch (e) { msg(i18n.t('correction.importErr')); }
  };
  rd.readAsText(f);
});
function msg(t) { toast(t); }
document.addEventListener('click', e => { const b = clicked(e, '[data-fx]'); if (!b) return; if (b.dataset.fx === 'import') $('#fxImport').click(); });


try { applyStatic(); } catch (e) {}
return { open, back() { show(); render(); }, editing: () => cur && cur.id, busy: () => !!(cur && cur.dirty), lang() { if (cur && !$('#fixer').hidden) render(); } };
}

export class CorrectionScreen extends Screen {
  /** @param {import('../../ui/env.d.ts').AppEnv} env */
  constructor(env) { super(env, '#fixer'); this.fx = createCorrection(env); }
  open(arg) { return this.fx.open(arg); }
  close() { this.root.hidden = true; }
  onLang() { this.fx.lang(); }
  isBusy() { return this.fx.busy(); }
}
