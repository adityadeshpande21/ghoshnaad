// Moved from v1.1.0 (app.js). Checked by tsc as plain JavaScript (tsconfig.loose.json: wrong names, properties and argument types fail; implicit any is allowed).
// The rachana list: the search box, the section / instrument / source filters, the rows, and the recently opened.
// The person's own folder rachanas (keys "f~<id>") are listed next to the book ones.

import { clicked } from '../../ui/dom.js';
/** @param {import('../../ui/env.d.ts').AppEnv} env */
export function createList(env) {
const { q: $, i18n, esc, dv, mmss, secName, talaName, ragaName, store, openPiece, PART, PART_C, SEC_K } = env;
const RAGA_ROM = env.settings.RAGA_ROM, TALA_ROM = env.TALA_ROM;
let LIST=[], BOOK=[], LIBROWS=[], secF=store.get('sec','all'), insF=store.get('insF',null), srcF=null;
// रचना फोल्डर: the person's own files are listed next to the book rachanas (keys "f~<id>")
function setLibRows(rows){LIBROWS=rows||[];window.LIBROWS=LIBROWS;LIST=BOOK.concat(LIBROWS);if(!LIBROWS.length)srcF=null;
  if(window.ComposerUI&&window.ComposerUI.tabs)window.ComposerUI.tabs();if(!$('#list').hidden)renderList()}
const INS_K=['shankh','vanshi','anak'];if(!INS_K.includes(insF))insF=null;
const inSec=r=>secF==='all'||r.sec.startsWith(secF), inIns=r=>!insF||r.parts.includes(insF), inSrc=r=>!srcF||(srcF==='lib'?!!r.lib:!r.lib);
const norm=s=>String(s||'').toLowerCase().normalize('NFC');
function rowMeta(r){return [secName(r.sec),r.talas.map(talaName).join('·')+' '+dv(r.laya),r.raga&&(i18n.t('player.raga')+' '+ragaName(r.raga)),mmss(r.sec_s)].filter(Boolean).join(' · ')}
const titleMain=r=>i18n.name(r.dev,r.rom), titleSub=r=>i18n.romanNames?r.dev:r.rom;      // the name in the language's script; under it the roman name (the Devanagari one in English)
function badges(r){return r.parts.map(k=>`<span class="bd ${k}">${PART[k].dv}</span>`).join('')}
// the names in the language's own script, besides the Devanagari and the roman ones: a person can type any of the three
const haystackNames=r=>i18n.script==='Deva'||i18n.romanNames?'':[titleMain(r),...r.alt.map(a=>i18n.name(a)),r.raga&&ragaName(r.raga),...r.talas.map(talaName)].filter(Boolean).join(' ');
function renderList(){
  const q=norm($('#q').value.trim());
  const rows=LIST.filter(r=>inSec(r)&&inIns(r)&&inSrc(r)&&(!q||norm([r.dev,r.rom,r.alt.join(' '),r.raga,RAGA_ROM[r.raga]||'',r.talas.join(' '),r.talas.map(x=>TALA_ROM[x]||'').join(' '),secName(r.sec),haystackNames(r)].join(' ')).includes(q)));
  $('#rowsLbl').textContent=q?i18n.t('list.found', { count: dv(rows.length) }):[secF==='all'&&!insF?i18n.t('list.allR'):secF==='all'||!i18n.has('list.'+secF)?'':i18n.t('list.'+secF),insF?i18n.t('common.parts.' + insF):''].filter(Boolean).join(' · ');
  $('#rows').innerHTML=rows.length?rows.map(r=>`<button class="row" data-id="${r.id}"><span class="t"><span class="n"><b>${esc(titleMain(r))}</b><i>${esc(titleSub(r))}</i>${r.lib?`<i class="tag fx${r.lib==='pending'?' pend':''}">${esc(i18n.t(r.lib==='pending'?'library.tagPending':'library.tagFolder'))}</i>`:''}</span><span class="m num">${esc(rowMeta(r))}</span></span><span class="badges">${badges(r)}</span></button>`).join('')
    :`<p class="empty">${esc(i18n.t('list.none', { query: $('#q').value }))}</p>`;
  $('#secs').innerHTML=SEC_K.map(k=>{const l=i18n.t('list.'+k);const n=LIST.filter(r=>inIns(r)&&inSrc(r)&&(k==='all'||r.sec.startsWith(k))).length;return `<button class="chip" data-s="${k}" aria-pressed="${secF===k}">${l} <span class="num">${dv(n)}</span></button>`}).join('');
  $('#insts').innerHTML=INS_K.map(k=>`<button class="chip" data-ins="${k}" aria-pressed="${insF===k}"><span class="dot" style="background:${PART_C[k]}"></span>${i18n.t('common.parts.' + k)} <span class="num">${dv(LIST.filter(r=>inSec(r)&&inSrc(r)&&r.parts.includes(k)).length)}</span></button>`).join('');
  $('#srcs').hidden=!LIBROWS.length;
  $('#srcs').innerHTML=LIBROWS.length?[['book',i18n.t('library.srcBook'),BOOK.length],['lib',i18n.t('library.srcLib'),LIBROWS.length]].map(([k,l,n])=>`<button class="chip" data-src="${k}" aria-pressed="${srcF===k}">${esc(l)} <span class="num">${dv(n)}</span></button>`).join(''):'';
  const rec=store.get('recent',[]).map(id=>LIST.find(r=>r.id===id)).filter(Boolean);
  $('#recentWrap').hidden=!rec.length||!!q;
  $('#recent').innerHTML=rec.map(r=>`<button data-id="${r.id}"><b>${esc(titleMain(r))}</b><small>${esc(r.talas.map(talaName).join('·'))} · ${mmss(r.sec_s)}</small></button>`).join('');
}
$('#q').addEventListener('input',renderList);
$('#srcs').addEventListener('click',e=>{const b=clicked(e, '[data-src]');if(!b)return;srcF=srcF===b.dataset.src?null:b.dataset.src;renderList()});
$('#insts').addEventListener('click',e=>{const b=clicked(e, '[data-ins]');if(!b)return;insF=insF===b.dataset.ins?null:b.dataset.ins;store.set('insF',insF);renderList()});
$('#secs').addEventListener('click',e=>{const b=clicked(e, '[data-s]');if(!b)return;secF=b.dataset.s;store.set('sec',secF);renderList()});
document.addEventListener('click',e=>{const b=clicked(e, '#rows [data-id],#recent [data-id]');if(b)openPiece(b.dataset.id,true)});

return { renderList, setLibRows,
  /** the language changed: the rows, the chips and the count are drawn again */
  onLang() { renderList(); $('#count1').textContent = i18n.t('list.count', { count: dv(LIST.length) }); },
  get LIST() { return LIST; }, set LIST(v) { LIST = v; },
  get BOOK() { return BOOK; }, set BOOK(v) { BOOK = v; },
  get LIBROWS() { return LIBROWS; } };
}
