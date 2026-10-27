// @ts-nocheck — moved from v1.1.0 (app.js); not fully typed yet.
// The rachana list: the search box, the section / instrument / source filters, the rows, and the recently opened.
// The person's own folder rachanas (keys "f~<id>") are listed next to the book ones.

/** @param {import('../../ui/env.d.ts').AppEnv} env */
export function createList(env) {
const { q: $, tx, esc, dv, L, mmss, secName, talaName, ragaName, store, openPiece, PART, PART_C, SEC_K } = env;
const RAGA_ROM = env.settings.RAGA_ROM, TALA_ROM = env.TALA_ROM;
let LIST=[], BOOK=[], LIBROWS=[], secF=store.get('sec','all'), insF=store.get('insF',null), srcF=null;
// रचना फोल्डर: the person's own files are listed next to the book rachanas (keys "f~<id>")
function setLibRows(rows){LIBROWS=rows||[];window.LIBROWS=LIBROWS;LIST=BOOK.concat(LIBROWS);if(!LIBROWS.length)srcF=null;
  if(window.ComposerUI&&window.ComposerUI.tabs)window.ComposerUI.tabs();if(!$('#list').hidden)renderList()}
const INS_K=['shankh','vanshi','anak'];if(!INS_K.includes(insF))insF=null;
const inSec=r=>secF==='all'||r.sec.startsWith(secF), inIns=r=>!insF||r.parts.includes(insF), inSrc=r=>!srcF||(srcF==='lib'?!!r.lib:!r.lib);
const norm=s=>String(s||'').toLowerCase().normalize('NFC');
function rowMeta(r){return [secName(r.sec),r.talas.map(talaName).join('·')+' '+dv(r.laya),r.raga&&(tx('raga')+' '+ragaName(r.raga)),mmss(r.sec_s)].filter(Boolean).join(' · ')}
const titleMain=r=>L().romanNames?r.rom:r.dev, titleSub=r=>L().romanNames?r.dev:r.rom;
function badges(r){return r.parts.map(k=>`<span class="bd ${k}">${PART[k].dv}</span>`).join('')}
function renderList(){
  const q=norm($('#q').value.trim());
  const rows=LIST.filter(r=>inSec(r)&&inIns(r)&&inSrc(r)&&(!q||norm([r.dev,r.rom,r.alt.join(' '),r.raga,RAGA_ROM[r.raga]||'',r.talas.join(' '),r.talas.map(x=>TALA_ROM[x]||'').join(' '),secName(r.sec)].join(' ')).includes(q)));
  $('#rowsLbl').textContent=q?tx('found',dv(rows.length)):[secF==='all'&&!insF?tx('allR'):secF==='all'?'':tx(secF),insF?tx('parts')[insF]:''].filter(Boolean).join(' · ');
  $('#rows').innerHTML=rows.length?rows.map(r=>`<button class="row" data-id="${r.id}"><span class="t"><span class="n"><b>${esc(titleMain(r))}</b><i>${esc(titleSub(r))}</i>${r.lib?`<i class="tag fx${r.lib==='pending'?' pend':''}">${esc(tx(r.lib==='pending'?'l_tagPending':'l_tagFolder'))}</i>`:''}</span><span class="m num">${esc(rowMeta(r))}</span></span><span class="badges">${badges(r)}</span></button>`).join('')
    :`<p class="empty">${esc(tx('none',$('#q').value))}</p>`;
  $('#secs').innerHTML=SEC_K.map(k=>{const l=tx(k);const n=LIST.filter(r=>inIns(r)&&inSrc(r)&&(k==='all'||r.sec.startsWith(k))).length;return `<button class="chip" data-s="${k}" aria-pressed="${secF===k}">${l} <span class="num">${dv(n)}</span></button>`}).join('');
  $('#insts').innerHTML=INS_K.map(k=>`<button class="chip" data-ins="${k}" aria-pressed="${insF===k}"><span class="dot" style="background:${PART_C[k]}"></span>${tx('parts')[k]} <span class="num">${dv(LIST.filter(r=>inSec(r)&&inSrc(r)&&r.parts.includes(k)).length)}</span></button>`).join('');
  $('#srcs').hidden=!LIBROWS.length;
  $('#srcs').innerHTML=LIBROWS.length?[['book',tx('l_srcBook'),BOOK.length],['lib',tx('l_srcLib'),LIBROWS.length]].map(([k,l,n])=>`<button class="chip" data-src="${k}" aria-pressed="${srcF===k}">${esc(l)} <span class="num">${dv(n)}</span></button>`).join(''):'';
  const rec=store.get('recent',[]).map(id=>LIST.find(r=>r.id===id)).filter(Boolean);
  $('#recentWrap').hidden=!rec.length||!!q;
  $('#recent').innerHTML=rec.map(r=>`<button data-id="${r.id}"><b>${esc(titleMain(r))}</b><small>${esc(r.talas.map(talaName).join('·'))} · ${mmss(r.sec_s)}</small></button>`).join('');
}
$('#q').addEventListener('input',renderList);
$('#srcs').addEventListener('click',e=>{const b=e.target.closest('[data-src]');if(!b)return;srcF=srcF===b.dataset.src?null:b.dataset.src;renderList()});
$('#insts').addEventListener('click',e=>{const b=e.target.closest('[data-ins]');if(!b)return;insF=insF===b.dataset.ins?null:b.dataset.ins;store.set('insF',insF);renderList()});
$('#secs').addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(!b)return;secF=b.dataset.s;store.set('sec',secF);renderList()});
document.addEventListener('click',e=>{const b=e.target.closest('#rows [data-id],#recent [data-id]');if(b)openPiece(b.dataset.id,true)});

return { renderList, setLibRows,
  get LIST() { return LIST; }, set LIST(v) { LIST = v; },
  get BOOK() { return BOOK; }, set BOOK(v) { BOOK = v; },
  get LIBROWS() { return LIBROWS; } };
}
