
'use strict';
const $=s=>document.querySelector(s);
const DIG='०१२३४५६७८९', dvN=n=>String(n).replace(/\d/g,d=>DIG[d]);   // notation numbers: always as in the books
const dv=n=>i18n.latinDigits?String(n):dvN(n);                                   // UI numbers: per language
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mmss=t=>{t=Math.max(0,Math.round(t));return dv(Math.floor(t/60)+':'+String(t%60).padStart(2,'0'))};
const APP={name:'Ghoshnaad',version:'1.1.0',date:'2026-10-24'};window.APP=APP;
const store={get(k,d){try{const v=localStorage.getItem('ghosh.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('ghosh.'+k,JSON.stringify(v))}catch(e){}}};
const LSV=()=>window.ScreenApp.get('list');   // the rachana list (src/screens/list)
// data: the embedded pack of rachanas (src/data/catalog.ts)
const catalog=new GhoshCatalog.Catalog(window.GHOSH_PACK,window.fflate.gunzipSync);
const loadJSON=path=>catalog.load(path);
/* ================= भाषा / language ================= */
const i18n=I18n.createI18n();
const {TALA_ROM,RAGA_ROM,INST_NAMES,talaName,ragaName,applyStatic,secName}=i18n;
const SEC_K=['all','prachalan','mand','naimittik'];
const PART_C={shankh:'var(--shankh)',vanshi:'var(--mel)',anak:'var(--anak)',panav:'var(--tv)',jhallari:'var(--tv)',tribhuj:'var(--tv)',steps:'var(--dim)'};
const PART=new Proxy({},{get:(o,k)=>PART_C[k]?{dv:i18n.t('common.parts.' + k),c:PART_C[k]}:undefined});
const PRINTED=['shankh','vanshi','anak'];

/* theme toggle (per viewer) */
(function(){const t=store.get('theme',null);if(t)document.documentElement.dataset.theme=t;
  $('#theme').onclick=()=>{const dark=document.documentElement.dataset.theme?document.documentElement.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
    const n=dark?'light':'dark';document.documentElement.dataset.theme=n;store.set('theme',n)}})();

// the services the screens (src/screens) receive instead of reaching for globals; the player adds sound, player and settings
window.AppEnv={q:s=>document.querySelector(s),$:s=>{const e=document.querySelector(s);if(!e)throw new Error('missing element '+s);return e},esc,dv,i18n,lang:()=>i18n.LANG,
  PART,PART_C,PRINTED,SEC_K,TALA_ROM,RAGA_ROM,INST_NAMES,setLibRows:r=>LSV().setLibRows(r),renderList:()=>LSV().renderList(),list:()=>LSV(),hasSoundLab:()=>!!(window.ScreenApp&&ScreenApp.get('soundcheck')),
  app:()=>window.ScreenApp,store,dvN,mmss,secName,applyStatic,APP,ragaName,loadJSON,talaName,setLang:l=>setLang(l),sample:src=>ScreenApp.get('guide').sample(src)};
// a new language: the core stores the choice and tells the app (the static texts here, then every screen through the App)
i18n.onChange(()=>applyStatic());
function setLang(l){if(i18n.hasLanguage(l)&&l!==i18n.LANG)i18n.setLang(l)}

/* ---------- boot ---------- */
(async()=>{
  applyStatic();
  let INDEX;try{INDEX=await loadJSON('data/index.json')}catch(e){$('#rows').innerHTML=`<p class="empty">${esc(i18n.t('list.listErr'))}<br><small>${esc(e&&e.message||e)}</small></p>`;return}
  if(document.readyState==='loading')await new Promise(r=>addEventListener('DOMContentLoaded',r,{once:true}));   // composer, editor and folder scripts come later in the page
  LSV().LIST=INDEX;LSV().BOOK=INDEX;$('#count1').textContent=i18n.t('list.count', { count: dv(LSV().BOOK.length) });LSV().renderList();if(window.ComposerUI)ComposerUI.init();
  if(window.Library)try{await Library.init()}catch(e){}
  const id=decodeURIComponent(location.hash.slice(1));if(id&&LSV().LIST.some(r=>r.id===id))ScreenApp.get('player').openPiece(id,false);
})();
