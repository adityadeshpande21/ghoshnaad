// @ts-nocheck — moved from v1.1.0 with its shared names replaced by the services below; not fully typed yet.
// दुरुस्ती: correct a book rachana by hand. Edits the book source (ghosh-notation/1), compiles it with the same compiler as the
// 120 book files, plays it, and keeps the corrected version on this device. Corrections can be exported as files and imported.
import { Screen } from '../../ui/screen.js';
import { compile3 } from '../../core/compile/ghosh3.ts';
import { buildTimeline3 } from '../../core/timeline/timeline3.ts';
import talasJson from '../../../rules/talas.json';

/** @param {import('../../ui/env.d.ts').AppEnv} env */
function createCorrection(env) {
const { tx, esc, dv, dvN, L, I18N, applyStatic, loadJSON, openPiece, player: PL } = env;
const $ = env.q;   // like v1.1.0: null when the element is absent
const Library = { saveSource: (...a) => window.Library.saveSource(...a), removeSource: (...a) => window.Library.removeSource(...a), downloadSource: (...a) => window.Library.downloadSource(...a), isLib: id => window.Library.isLib(id), sourceOf: id => window.Library.sourceOf(id), rows: () => window.Library.rows(), pieceOf: id => window.Library.pieceOf(id), mode: () => window.Library.mode() };
const GhoshCompile = { compile3: src => compile3(src, { talas: talasJson }) };
const FS = {
 mr: { f_draft: 'दुरुस्तीचा मसुदा', f_fromLib: 'तुमच्या फोल्डरमधील प्रत', f_later: 'नंतर', f_delete: 'ही प्रत हटवा', f_delQ: 'तुमची ही प्रत हटवायची? ग्रंथातील मूळ रचना तशीच राहील.', f_btn: 'दुरुस्त करा', f_title: n => `दुरुस्ती · ${n}`, f_orig: 'ग्रंथातील मूळ रचना', f_saved: 'दुरुस्त केलेली · या उपकरणावर जतन', f_dirty: 'जतन न केलेले बदल',
  f_changed: n => n === '१' ? '१ ओळ बदलली' : `${n} ओळी बदलल्या`, f_file: 'पूर्ण फाइल', f_tala: 'ताल', f_laya: 'लय', f_play: 'ऐका ▶', f_save: 'जतन करा', f_export: 'फाइल डाउनलोड',
  f_revert: 'ग्रंथातील मूळ आणा', f_revertQ: 'संपादकात ग्रंथातील मूळ मजकूर परत आणायचा? (जतन केल्यावरच तुमची प्रत बदलेल)', f_yes: 'हो, मूळ आणा', f_no: 'नाही',
  f_leaveQ: 'बदल जतन करायचे?', f_discard: 'टाकून द्या', f_cancel: 'रद्द', f_ok: 'काही त्रुटी नाही', f_line: (p, n) => `${p} · ओळ ${n}`,
  f_err: 'त्रुटी', f_warn: 'सूचना', f_len: (a) => `भागांची लांबी जुळत नाही: ${a}`, f_jsonErr: 'फाइल वाचता आली नाही (JSON): ', f_help: 'चिन्हे',
  f_legend: '<code>॥ॐ॥</code> सुरुवात · <code>|</code> गण · <code>,</code> गट · <code>:॥</code> दोनदा · <code>{1 … }</code> <code>{2 … }</code> पहिला / दुसरा शेवट · <code>[ ]</code> एका मात्रेत · <code>ऽ</code> लांबवा · <code>–</code> विराम · <code>प.</code> मंद्र · <code>स\'</code> तार · <code>ग_</code> कोमल / तीव्र म · <code>^</code> आघात · <code>`म</code> कण स्वर · <code>त त्र थ थ्र +</code> आनक बोल · <a href="#" data-guide="swar">पूर्ण मार्गदर्शक →</a>',
  f_bad: 'आधी त्रुटी दुरुस्त करा', f_savedT: 'जतन केले', f_reverted: 'मूळ रचना परत आणली', f_brokenFix: 'दुरुस्त केलेली रचना चालत नाही; ग्रंथातील मूळ उघडली',
  f_fixes: 'दुरुस्त्या', f_fixCount: n => n ? `${n} रचना या उपकरणावर दुरुस्त केल्या आहेत.` : 'अजून कोणतीही रचना दुरुस्त केलेली नाही.', f_exportAll: 'सर्व दुरुस्त्या निर्यात', f_import: 'फाइल आयात',
  f_imported: n => n === '१' ? '१ दुरुस्ती आयात झाली' : `${n} दुरुस्त्या आयात झाल्या`, f_importErr: 'ही फाइल वाचता आली नाही', f_notBook: 'ही ग्रंथातील रचना नाही — "माझ्या रचना" मध्ये आयात करा',
  f_tag: 'दुरुस्त', f_copy: 'मजकूर कॉपी करा', f_share: 'शेअर / जतन करा', f_copied: 'कॉपी झाले', f_exportP: 'ही फाइल पाठवल्यास इतरांनाही हीच दुरुस्ती वापरता येते: सेटिंग्ज → दुरुस्त्या → दुरुस्ती आयात.',
  f_pickup: 'अनागत (समेच्या आधीच्या मात्रा)', f_noSrc: 'या रचनेची मूळ फाइल सापडली नाही' },
 hi: { f_draft: 'सुधार का प्रारूप', f_fromLib: 'आपके फ़ोल्डर की प्रति', f_later: 'बाद में', f_delete: 'यह प्रति हटाएँ', f_delQ: 'आपकी यह प्रति हटाएँ? पुस्तक की मूल रचना वैसी ही रहेगी।', f_btn: 'सुधारें', f_title: n => `सुधार · ${n}`, f_orig: 'पुस्तक की मूल रचना', f_saved: 'सुधारी हुई · इस उपकरण पर सहेजी', f_dirty: 'बिना सहेजे बदल',
  f_changed: n => n === '१' ? '१ पंक्ति बदली' : `${n} पंक्तियाँ बदलीं`, f_file: 'पूरी फ़ाइल', f_tala: 'ताल', f_laya: 'लय', f_play: 'सुनें ▶', f_save: 'सहेजें', f_export: 'फ़ाइल डाउनलोड',
  f_revert: 'पुस्तक का मूल लाएँ', f_revertQ: 'संपादक में पुस्तक का मूल पाठ वापस लाएँ? (सहेजने पर ही आपकी प्रति बदलेगी)', f_yes: 'हाँ, मूल लाएँ', f_no: 'नहीं',
  f_leaveQ: 'बदल सहेजें?', f_discard: 'छोड़ दें', f_cancel: 'रद्द', f_ok: 'कोई त्रुटि नहीं', f_line: (p, n) => `${p} · पंक्ति ${n}`,
  f_err: 'त्रुटि', f_warn: 'सूचना', f_len: (a) => `भागों की लंबाई मेल नहीं खाती: ${a}`, f_jsonErr: 'फ़ाइल पढ़ी नहीं जा सकी (JSON): ', f_help: 'चिह्न',
  f_legend: '<code>॥ॐ॥</code> आरंभ · <code>|</code> गण · <code>,</code> गट · <code>:॥</code> दो बार · <code>{1 … }</code> <code>{2 … }</code> पहला / दूसरा अंत · <code>[ ]</code> एक मात्रा में · <code>ऽ</code> खींचें · <code>–</code> विराम · <code>प.</code> मंद्र · <code>स\'</code> तार · <code>ग_</code> कोमल / तीव्र म · <code>^</code> आघात · <code>`म</code> कण स्वर · <code>त त्र थ थ्र +</code> आनक बोल · <a href="#" data-guide="swar">पूरी मार्गदर्शिका →</a>',
  f_bad: 'पहले त्रुटियाँ सुधारें', f_savedT: 'सहेजा गया', f_reverted: 'मूल रचना वापस आई', f_brokenFix: 'सुधारी रचना नहीं चल रही; पुस्तक की मूल खोली',
  f_fixes: 'सुधार', f_fixCount: n => n ? `${n} रचनाएँ इस उपकरण पर सुधारी गई हैं।` : 'अभी कोई रचना सुधारी नहीं गई।', f_exportAll: 'सभी सुधार निर्यात', f_import: 'फ़ाइल आयात',
  f_imported: n => `${n} सुधार आयात हुए`, f_importErr: 'यह फ़ाइल पढ़ी नहीं जा सकी', f_notBook: 'यह पुस्तक की रचना नहीं — "मेरी रचनाएँ" में आयात करें',
  f_tag: 'सुधारी', f_copy: 'पाठ कॉपी करें', f_share: 'शेयर / सहेजें', f_copied: 'कॉपी हुआ', f_exportP: 'यह फ़ाइल भेजने पर दूसरे भी यही सुधार उपयोग कर सकते हैं: सेटिंग्स → सुधार → सुधार आयात।',
  f_pickup: 'अनागत (सम से पहले की मात्राएँ)', f_noSrc: 'इस रचना की मूल फ़ाइल नहीं मिली' },
 en: { f_draft: 'correction draft', f_fromLib: 'Your folder copy', f_later: 'Later', f_delete: 'Delete this copy', f_delQ: 'Delete your copy? The book version stays as it is.', f_btn: 'Correct', f_title: n => `Correct · ${n}`, f_orig: 'As in the book', f_saved: 'Corrected · saved on this device', f_dirty: 'Unsaved changes',
  f_changed: n => n === '1' ? '1 line changed' : `${n} lines changed`, f_file: 'Whole file', f_tala: 'Tala', f_laya: 'Tempo', f_play: 'Play ▶', f_save: 'Save', f_export: 'Download file',
  f_revert: 'Book text', f_revertQ: 'Put the book text back in the editor? (Your copy changes only when you save.)', f_yes: 'Yes, restore', f_no: 'No',
  f_leaveQ: 'Save your changes?', f_discard: 'Discard', f_cancel: 'Cancel', f_ok: 'No problems found', f_line: (p, n) => `${p} · line ${n}`,
  f_err: 'Error', f_warn: 'Note', f_len: (a) => `Parts differ in length: ${a}`, f_jsonErr: 'Couldn\'t read the file (JSON): ', f_help: 'Symbols',
  f_legend: '<code>॥ॐ॥</code> start · <code>|</code> gan · <code>,</code> gat · <code>:॥</code> twice · <code>{1 … }</code> <code>{2 … }</code> first / second ending · <code>[ ]</code> in one matra · <code>ऽ</code> hold · <code>–</code> rest · <code>प.</code> lower octave · <code>स\'</code> upper octave · <code>ग_</code> komal / tivra म · <code>^</code> accent · <code>`म</code> grace note · <code>त त्र थ थ्र +</code> anak bols · <a href="#" data-guide="swar">Full guide →</a>',
  f_bad: 'Fix the errors first', f_savedT: 'Saved', f_reverted: 'Book version restored', f_brokenFix: 'The corrected version doesn\'t build; opened the book version',
  f_fixes: 'Corrections', f_fixCount: n => n ? `${n} rachanas corrected on this device.` : 'No rachana has been corrected yet.', f_exportAll: 'Export all corrections', f_import: 'Import file',
  f_imported: n => n === '1' ? '1 correction imported' : `${n} corrections imported`, f_importErr: 'Couldn\'t read this file', f_notBook: 'Not a book rachana — import it under My rachanas',
  f_tag: 'corrected', f_copy: 'Copy text', f_share: 'Share / save', f_copied: 'Copied', f_exportP: 'Send this file and others can use the same correction: Settings → Corrections → Import corrections.',
  f_pickup: 'pickup / anagat (before सम)', f_noSrc: 'The source of this rachana is missing' }
};
for (const l in FS) Object.assign(I18N[l], FS[l]);

const clone = o => JSON.parse(JSON.stringify(o));
// the compiler speaks English; the common messages are given in मराठी / हिंदी too
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
const partKeys = d => Object.keys(d.parts || {}).sort((a, b) => (MEL.includes(b) - MEL.includes(a)));
const partName = k => (tx('parts') || {})[k] || k;

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
      const tot = Object.keys(piece.parts).filter(k => MEL.includes(k) || k === 'anak').map(k => [k, buildTimeline3(piece, k).total]);
      if (tot.length > 1 && Math.max(...tot.map(x => x[1])) - Math.min(...tot.map(x => x[1])) > 0.05)
        msgs.push({ sev: 'w', part: null, msg: tx('f_len', tot.map(([k, t]) => `${partName(k)} ${t.toFixed(1)} s`).join(', ')) });
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
  document.querySelectorAll('.cview').forEach(v => { v.hidden = v.id !== 'fixer'; });
}
async function open(key, line) {
  const id = String(key).replace(/^f~/, ''), isBook = PL.BOOK.some(r => r.id === id);
  let book = null; if (isBook) { try { book = await loadJSON('data/src/' + id + '.json'); } catch (e) {} }
  const lib = window.Library ? Library.sourceOf(id) : null;
  const orig = lib || book; if (!orig) { toast(tx('f_noSrc')); return; }
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
  $('#fxT').textContent = tx('f_title', (L().romanNames && t.rom) || t.dev || cur.id);
  const n = changedLines();
  $('#fxSub').textContent = [cur.dirty ? tx('f_dirty') : cur.fromLib ? tx('f_fromLib') : tx('f_orig'), n ? tx('f_changed', dv(n)) : ''].filter(Boolean).join(' · ');
  $('#fxRevert').hidden = !cur.book || !(cur.fromLib || cur.dirty); $('#fxDelete').hidden = !(window.Library && Library.isLib(cur.id));
}
function render() {
  renderHead();
  const errs = k => (cur.res ? cur.res.msgs.filter(m => m.sev === 'e' && m.part === k).length : 0);
  $('#fxTabs').innerHTML = partKeys(cur.draft).map(k => `<button role="tab" data-fx-tab="${k}" aria-selected="${cur.tab === k}">${esc(partName(k))}${errs(k) ? `<span class="bad">!</span>` : ''}</button>`).join('') +
    `<button role="tab" data-fx-tab="_json" aria-selected="${cur.tab === '_json'}">${esc(tx('f_file'))}</button>`;
  const json = cur.tab === '_json', ta = $('#fxText');
  $('#fxTala').parentNode.hidden = $('#fxLaya').parentNode.hidden = json;
  ta.classList.toggle('json', json);
  if (json) ta.value = JSON.stringify(cur.draft, null, 1);
  else { const p = cur.draft.parts[cur.tab]; ta.value = p.lines.map(lineT).join('\n'); $('#fxTala').value = p.tala || ''; $('#fxLaya').value = p.laya || ''; }
  $('#fxLegend').innerHTML = tx('f_legend');
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
    h += `<div class="${mark[i] || ''}${i === ln ? ' cur' : ''}" ${pk ? `title="${esc(tx('f_pickup'))}"` : ''}>${pk ? '↪ ' : ''}${dvN(i)}</div>`; }
  $('#fxGut').innerHTML = h; $('#fxGut').scrollTop = $('#fxText').scrollTop;
}
function renderMsgs() {
  const ms = cur.res ? cur.res.msgs : [];
  $('#fxMsgs').innerHTML = (cur.jsonErr ? `<button class="e"><i>${esc(tx('f_err'))}</i><span>${esc(tx('f_jsonErr') + cur.jsonErr)}</span></button>` : '') +
    (ms.length ? ms.map((m, i) => `<button class="${m.sev}" data-fx-msg="${i}"><i>${esc(m.sev === 'e' ? tx('f_err') : tx('f_warn'))}</i><span>${m.part && m.part !== '*' ? esc(m.line ? tx('f_line', partName(m.part), dvN(m.line)) : partName(m.part)) + ': ' : ''}${esc(m.msg.split('\n')[0])}</span></button>`).join('')
      : (cur.jsonErr ? '' : `<button class="ok"><i>✓</i><span>${esc(tx('f_ok'))}</span></button>`));
}
let ckT = null;
function recheck(now) { clearTimeout(ckT); const go = () => { if (!cur) return; cur.res = check(cur.draft); render2(); }; if (now) go(); else ckT = setTimeout(go, 350); }
function render2() {   // after a check: refresh marks without touching the text the person is typing in
  renderHead(); renderGutter(); renderMsgs();
  const errs = k => cur.res.msgs.filter(m => m.sev === 'e' && m.part === k).length;
  document.querySelectorAll('#fxTabs [data-fx-tab]').forEach(b => { const k = b.dataset.fxTab; if (k === '_json') return; b.innerHTML = esc(partName(k)) + (errs(k) ? '<span class="bad">!</span>' : ''); });
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
  const b = e.target.closest('[data-fx-tab]'); if (!b || b.dataset.fxTab === cur.tab) return;
  if (cur.tab === '_json' && cur.jsonErr) return;   // keep the person in the file until it reads again
  cur.tab = b.dataset.fxTab; render();
});
$('#fxMsgs').addEventListener('click', e => {
  const b = e.target.closest('[data-fx-msg]'); if (!b) return; const m = cur.res.msgs[+b.dataset.fxMsg];
  if (m.part && cur.draft.parts[m.part]) { if (cur.tab !== m.part) { cur.tab = m.part; render(); } if (m.line) selectLine(m.line); }
});

/* ---------- actions ---------- */
function toast(msg) { const t = $('#fxToast'); t.textContent = msg; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, 2400); }
function ask(q, btns) {
  $('#fxAskT').textContent = q;
  $('#fxAskB').innerHTML = btns.map((b, i) => `<button data-i="${i}" class="${b.danger ? 'd' : ''}">${esc(b.label)}</button>`).join('');
  $('#fxAsk').hidden = false;
  $('#fxAskB').onclick = e => { const x = e.target.closest('[data-i]'); if (!x) return; $('#fxAsk').hidden = true; const f = btns[+x.dataset.i].go; if (f) f(); };
}
async function save() {
  cur.res = check(cur.draft);
  if (cur.jsonErr || cur.res.msgs.some(m => m.sev === 'e')) { render2(); toast(tx('f_bad')); return false; }
  const r = await Library.saveSource(cur.draft);
  cur.orig = clone(cur.draft); cur.fromLib = true; cur.dirty = false; render2();
  if (r.written) toast(r.conflict ? tx('l_conflict', r.file) : tx('l_savedFolder', r.file));
  else ask(tx('l_savedLocal'), [{ label: tx('l_download'), go: () => Library.downloadSource(cur.draft) }, { label: tx('f_later') }]);
  return true;
}
$('#fxSave').onclick = save;
$('#fxPlay').onclick = () => {
  if (cur.jsonErr) { toast(tx('f_bad')); return; }
  cur.res = check(cur.draft); render2();
  if (!cur.res.piece) { toast(tx('f_bad')); return; }
  env.audio.unlock(); PL.showPiece(cur.res.piece, { play: true, returnTo: 'fixer' });
};
// back to the book text (as an unsaved change; saving it updates the folder copy)
$('#fxRevert').onclick = () => ask(tx('f_revertQ'), [
  { label: tx('f_yes'), danger: true, go: () => { cur.draft = clone(cur.book); cur.dirty = true; cur.jsonErr = null; if (!cur.draft.parts[cur.tab] && cur.tab !== '_json') cur.tab = partKeys(cur.draft)[0]; render(); recheck(true); } },
  { label: tx('f_no') }]);
// remove the folder / browser copy of this rachana
$('#fxDelete').onclick = () => ask(tx('f_delQ'), [
  { label: tx('f_delete'), danger: true, go: async () => { const r = await Library.removeSource(cur.id); if (r.msg) toast(r.msg);
    if (cur.book) { cur.draft = clone(cur.book); cur.orig = clone(cur.book); cur.fromLib = false; cur.dirty = false; render(); recheck(true); } else { cur.dirty = false; leave(); } } },
  { label: tx('f_no') }]);
function leave() {
  $('#fxAsk').hidden = true;
  document.querySelectorAll('.cview').forEach(v => { if (v.id === 'fixer') v.hidden = true; });
  const id = cur.id; if (!cur.dirty) cur = null;
  const key = window.Library && Library.isLib(id) ? 'f~' + id : PL.BOOK.some(r => r.id === id) ? id : null;
  if (key) openPiece(key, false); else { $('#list').hidden = false; env.renderList(); }
}
$('#fxBack').onclick = () => {
  if (!cur.dirty) { leave(); return; }
  ask(tx('f_leaveQ'), [{ label: tx('f_save'), go: async () => { if (await save()) leave(); } }, { label: tx('f_discard'), danger: true, go: () => { cur.dirty = false; leave(); } }, { label: tx('f_cancel') }]);
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
      const o = JSON.parse(rd.result), list = [];
      if (o.format === 'ghosh-fixes/1' && o.fixes) Object.entries(o.fixes).forEach(([id, v]) => { if (v && v.src) list.push({ ...v.src, id }); });
      else if (o.format === 'ghosh-notation/1' && o.parts && !o.composer) list.push(o);
      else throw new Error('format');
      for (const src of list) { try { compile(clone(src)); await Library.saveSource(src); n++; } catch (e) {} }
      msg(tx('f_imported', dv(n)));
    } catch (e) { msg(tx('f_importErr')); }
  };
  rd.readAsText(f);
});
function msg(t) { toast(t); }
document.addEventListener('click', e => { const b = e.target.closest('[data-fx]'); if (!b) return; if (b.dataset.fx === 'import') $('#fxImport').click(); });


try { applyStatic(); } catch (e) {}
return { open, back() { show(); render(); }, editing: () => cur && cur.id, lang() { if (cur && !$('#fixer').hidden) render(); } };
}

export class CorrectionScreen extends Screen {
  /** @param {import('../../ui/env.d.ts').AppEnv} env */
  constructor(env) { super(env, '#fixer'); this.fx = createCorrection(env); }
  open(arg) { return this.fx.open(arg); }
  close() { this.root.hidden = true; }
  onLang() { this.fx.lang(); }
}
