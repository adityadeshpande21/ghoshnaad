// @ts-nocheck — moved from v1.1.0 (app.js) unchanged except for its inputs and outputs; not fully typed yet.
// The player: the sound and instrument choices, the rachana on screen (score, chips, blocks, position), the transport, the march
// view, and the settings sheet. One closure, as before: the pieces share their state.
import * as GhoshAudio from '../../audio/index.ts';
import { buildTimeline3 } from '../../core/timeline/timeline3.ts';
import { makeScoreView } from '../../ui/scoreview.loose.js';

/** @param {any} env */
export function createPlayer(env) {
const { q: $, esc, dv, dvN, mmss, secName, talaName, ragaName, store, APP, INST_NAMES, PART, PART_C, PRINTED, applyStatic, loadJSON, i18n } = env;
const LSV = () => env.list();
const ScoreView = { makeScoreView };
/* ================= audio ================= */
// The sound itself lives in src/audio (AudioEngine, Drums, melodic voices, Transport). These names stay because the
// sound-check, Ghoshdand and composer pages call them.
let ctx=null,master=null,gains={},noiseBuf=null;
// वादनाची पट्टी, per part: शंख Sa = B♭4 (466 Hz), वंशी Sa = F♯5 (740 Hz). Each can be moved to any of the 12 notes;
// the octave stays (शंख: 4th octave, वंशी: 5th). Any other melody instrument chosen for a part plays at that part's Sa.
const SA_KEYS=GhoshAudio.SA_KEYS,SA_DEF=GhoshAudio.SA_DEF;
let saKeys=(()=>{const v=store.get('saKeys',null)||{};const o={};for(const k in SA_DEF){const x=v[k];o[k]=Number.isInteger(x)&&x>=0&&x<12?x:SA_DEF[k].key}return o})();
const saHzOf=pk=>{const d=SA_DEF[pk]||SA_DEF.vanshi;return 440*Math.pow(2,((saKeys[pk in SA_DEF?pk:'vanshi'])-9)/12+(d.oct-4))};
function setSaKey(pk,k){saKeys[pk]=k;store.set('saKeys',saKeys)}
// सांतर (default): each note stops a little before its time is up; निरंतर: full length.
let artic=store.get('artic','santar')==='nirantar'?'nirantar':'santar';
// कण स्वर (म in म्ग): sounds on the beat for this long, then the main note
let kanMs=(()=>{const v=+store.get('kanMs',60);return v>=20&&v<=200?v:60})();
const ENG=new GhoshAudio.AudioEngine({settings:()=>({saKeys,artic,kanMs})});
function syncAudio(){ctx=ENG.ctx;master=ENG.master;gains=ENG.parts;noiseBuf=ENG.noise}
ENG.onContext(syncAudio);
function audio(){ENG.unlock();syncAudio();return ctx}
let MIX={};   // per-part volume, only while testing in ध्वनी तपासणी
const mixOf=k=>MIX[k]==null?1:MIX[k];
function gainFor(k){const g=ENG.partOutput(k,on(k)?mixOf(k):0);gains=ENG.parts;return g}
const hit=(t,v,o)=>ENG.drums.hit(t,v,o),click=(t,v,o)=>ENG.drums.click(t,v,o),stick=(t,v,o)=>ENG.drums.stick(t,v,o);
const roll=(t,dur,md,triple,v,out,beat)=>ENG.drums.roll(t,dur,md,triple,v,out,beat);
const playStroke=(e,t,out)=>ENG.drums.playStroke(e,t,out);
// ताल वाद्ये: maxLen shortens the ring at a fast लय, so one stroke does not ring into the next
const panav=(t,v,o,maxLen)=>ENG.drums.panav(t,v,o,maxLen),jhal=(t,v,o,maxLen)=>ENG.drums.jhal(t,v,o,maxLen),trib=(t,v,o,maxLen)=>ENG.drums.trib(t,v,o,maxLen);
const footfall=(t,foot,out)=>ENG.drums.footfall(t,foot,out);
const VOICES=GhoshAudio.VOICES;
/* वाद्य निवड: which real instruments play each part (saved per viewer) */
const INSTR={
  shankh:{dv:'शंख भाग',opts:[['bugle','शंख','Bugle'],['trumpet','तूर्य','Trumpet'],['melodica','मधुरिका','Melodica']]},
  vanshi:{dv:'वंशी भाग',opts:[['flute','वंशी','Flute'],['venu','वेणु','Bamboo flute'],['clarinet','स्वरद','Clarinet'],['sax','नागांग','Saxophone'],['melodica','मधुरिका','Melodica']]},
  anak:{dv:'आनक भाग',opts:[['side','आनक','Side drum']]},
  tal:{dv:'ताल वाद्य',opts:[['bass','पणव','Bass drum'],['cym','झल्लरी (झांज)','Cymbals'],['tri','त्रिभुज','Triangle']]}};
const INST_DEF={shankh:['bugle'],vanshi:['flute'],anak:['side'],tal:['bass','cym','tri']};
let INST=(()=>{const v=store.get('inst',null);const o={};for(const g in INST_DEF){const ok=v&&Array.isArray(v[g])?v[g].filter(x=>INSTR[g].opts.some(o=>o[0]===x)):null;o[g]=ok&&(ok.length||g==='anak'||g==='tal')?ok:INST_DEF[g].slice()}return o})();
const VOICE_OF={bugle:'shankh',trumpet:'trumpet',flute:'vanshi',venu:'venu',clarinet:'clarinet',sax:'sax',melodica:'melodica'};
const PART_INST={anak:['anak','side'],panav:['tal','bass'],jhallari:['tal','cym'],tribhuj:['tal','tri']};
function enabled(k){const m=PART_INST[k];return !m||INST[m[0]].includes(m[1])}
function voicesFor(k){return (INST[k]||[k]).map(x=>VOICE_OF[x]||x)}
const hz=s=>ENG.hz(s);
const playNote=(e,t,out,part)=>ENG.note(e,t,out,part);

/* ================= player state ================= */
let P=null, R=null, KEYS=[], LEAD=null, SEL=new Set(), tempo=1, loop=false, perf=true, mode='perf', marchOn=false, stepSnd=true;
let TL={}, EV=null, STEPS=[];
const TR=new GhoshAudio.Transport(ENG,{
  // sound one item of the timeline at engine time `at`
  dispatch:(it,at)=>{if(!on(it.k))return;const out=gainFor(it.k),e=it.s,v=e.loud?1.75:e.accent?1:.72;
    if(e.type==='step')footfall(at,e.foot,out);
    else if(e.stroke==='dhvam'||e.stroke==='jham'||e.stroke==='tam'){const ml=e.dur?Math.max(.2,e.dur*1.5):0;(e.stroke==='dhvam'?panav:e.stroke==='jham'?jhal:trib)(at,v,out,ml)}
    else if(e.type==='stroke')playStroke(e,at,out);else if(e.type==='note'){const vs=voicesFor(it.k);vs.forEach(v=>playNote({...e,accent:e.accent,pk:it.k},at,out,v))}},
  onEnd:()=>{stop(true);S.pos=0;paintAt(0);$('#tnow').textContent=i18n.t('player.done')},
  onLate:()=>{LATE++},
  // a call, the lock screen or a tab switch took the sound: pause where it was; the next tap on play resumes from there
  onInterrupt:()=>{stop(true)}});
const S=TR.state;
const EPS=1e-6;
const on=k=>SEL.has(k)&&enabled(k);
const printedIn=()=>KEYS.filter(k=>PRINTED.includes(k));
const MEL=['shankh','vanshi'];
function defaultSel(){const all=KEYS.filter(k=>k!=='steps');const pref=store.get('sel2',null);
  if(pref&&pref.length){const s=pref.flatMap(k=>k==='mel'?KEYS.filter(x=>MEL.includes(x)):[k]).filter(k=>KEYS.includes(k));if(s.length)return new Set(s)}return new Set(all)}
// ताल वाद्य row: पणव, झल्लरी and त्रिभुज play the same beats, so one row shows all three
function tvRow(){return P&&P.parts.panav?'panav':null}
// ताल वाद्य row: पणव, but where the पणव is silent at a चरण end it shows the loud झल्लरी + त्रिभुज stroke
function tvGan(g,jg){if(!jg||!g.gats)return g;const jm=jg.gats.flatMap(x=>x.matras);let i=0;
  return {...g,gats:g.gats.map(gt=>({...gt,matras:gt.matras.map(m=>{const j=jm[i++];return m.charanEnd&&j?{...j,dev:'झ'}:m})}))}}
function visibleParts(){const pr=printedIn().filter(k=>SEL.has(k));return pr.length?pr:printedIn()}

async function openPiece(id,user){
  if(user)audio();             // unlock sound inside the tap
  let piece;
  try{piece=id.startsWith('f~')?window.Library.pieceOf(id.slice(2)):await loadJSON('data/r/'+id+'.json')}
  catch(e){alert1(i18n.t('list.openErr'));return}
  const rec=[id,...store.get('recent',[]).filter(x=>x!==id)].slice(0,6);store.set('recent',rec);
  try{if(location.hash!=='#'+id)history.pushState({id},'', '#'+id)}catch(e){}
  showPiece(piece,{play:user,key:id});
}
// load a piece into the engine without showing the player (the composer plays lines this way)
function loadPiece(piece,order){stop(true);S.custom=null;P=piece;R=P.rhythm;KEYS=Object.keys(P.parts);LEAD=P.layout.lead;tempo=1;loop=false;
  mode=order||(R.performance?'perf':'printed');perf=mode==='perf';SEL=defaultSel()}
let returnTo=null;   // 'composer' when the player was opened from the composer
let curKey=null;   // the list row now in the player (book id, or f~<id> for a folder rachana)
function showPiece(piece,o={}){loadPiece(piece);returnTo=o.returnTo||null;curKey=o.key||null;
  $('#list').hidden=true;document.querySelectorAll('.cview').forEach(v=>v.hidden=true);$('#player').hidden=false;$('#march').hidden=true;marchOn=false;
  renderPlayer();build();wake(true);
  if(o.play)start(0);if(o.march)$('#marchBtn').click()}
$('#xBtn').onclick=()=>{if(P&&window.Swarlipi)window.Swarlipi.open(P)};
// दुरुस्ती: open the source of this rachana at the line now playing
$('#fixBtn').onclick=()=>{if(!P||!window.FixerUI)return;if(returnTo==='fixer'){closePlayer();return}
  const id=P.id,k=lastKey[LEAD]?LEAD:visibleParts()[0],a=lastKey[k];let n=null;if(a){const g=P.parts[k].gans.find(x=>x.addr===a);if(g&&g.line)n=g.line}
  stop(true);window.FixerUI.open(curKey||id,{part:k,n})};
function closePlayer(){stop(true);wake(false);$('#player').hidden=true;P=null;
  if(returnTo==='composer'&&window.ComposerUI){returnTo=null;window.ComposerUI.back();return}
  if(returnTo==='fixer'&&window.FixerUI){returnTo=null;window.FixerUI.back();return}
  $('#list').hidden=false;LSV().renderList()}
$('#back').onclick=()=>{if(returnTo){closePlayer();return}try{if(history.state&&history.state.id){history.back();return}}catch(e){}closePlayer()};
addEventListener('popstate',()=>{const id=decodeURIComponent(location.hash.slice(1));if(id&&LSV().LIST.some(r=>r.id===id))openPiece(id,false);else if(P)closePlayer()});
function alert1(msg){$('#rows').insertAdjacentHTML('afterbegin',`<p class="empty" role="alert">${esc(msg)}</p>`)}

/* ---------- notation ---------- */
const {slotHTML,matraHTML,ganHTML,fitRows}=ScoreView.makeScoreView({esc,dvN,$});
function charanLabel(c){
  if(c.type==='ranan')return i18n.t('player.ranan');
  if(c.type==='prarambhik')return i18n.t('player.prarambhik');
  if(c.type==='setu')return i18n.t('player.setu');
  if(c.label&&!c.no)return c.label;
  const base=c.no?i18n.t('player.charan', { n: dv(c.no) }):(c.label||'');
  return base+(c.repeat>1?' · '+i18n.t('player.twice'):'');
}
let CELL={};  // part -> addr -> element
function renderPlayer(){
  const T0=R.talas[(R.charans.find(c=>c.type!=='prarambhik')||R.charans[0]).tala];
  const ttl=i18n.name(P.meta.title.dev,P.meta.title.rom);$('#ptitle').textContent=ttl;$('#mtitle').textContent=ttl;
  const talas=[...new Set(R.charans.map(c=>talaName(R.talas[c.tala].name.dev)+' '+dv(c.laya)))].join(' → ');
  $('#psub').textContent=[secName(P.meta.section),talas,P.meta.raga&&P.meta.raga.name&&(i18n.t('player.raga')+' '+ragaName(P.meta.raga.name)),returnTo==='fixer'&&i18n.t('correction.draft'),curKey&&curKey.startsWith('f~')&&i18n.t('library.tagFolder')].filter(Boolean).join(' · ');
  $('#fixBtn').hidden=!(window.FixerUI&&(returnTo==='fixer'||(curKey&&LSV().LIST.some(r=>r.id===curKey))));
  renderModes();
  $('#marchBtn').disabled=!P.parts.steps;$('#marchBtn').style.opacity=P.parts.steps?1:.4;
  renderChips();renderScore();
}
function renderModes(){$('#modes [data-m="perf"]').hidden=!R.performance;
  $('#modes').querySelectorAll('[data-m]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===mode));
}
const instName=id=>i18n.name(...INST_NAMES[id]);
function chipName(k){if(k==='shankh'||k==='vanshi')return INST[k].map(instName).join(' + ');return PART[k].dv}
function renderChips(){
  const keys=KEYS.filter(k=>PART[k]&&enabled(k));
  const all=keys.filter(k=>k!=='steps').every(on)&&!on('steps');
  $('#pchips').innerHTML=`<button class="chip" data-k="all" aria-pressed="${all}">${i18n.t('list.all')}</button>`+
    keys.map(k=>`<button class="chip" data-k="${k}" aria-pressed="${on(k)&&!all}"><span class="dot" style="background:${PART[k].c}"></span>${chipName(k)}</button>`).join('');
}
let fitT=null;addEventListener('resize',()=>{clearTimeout(fitT);fitT=setTimeout(()=>{if(P&&!$('#player').hidden){fitRows();if(marchOn)paintMarchLines()}},150)});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(P)fitRows()});
function renderScore(){
  const vis=visibleParts(),TV=tvRow(),rows=TV?[...vis,TV]:vis;CELL={};rows.forEach(k=>CELL[k]={});
  const lines={};rows.forEach(k=>{lines[k]={};(P.layout.parts[k===TV?LEAD:k].lines||[]).forEach(l=>{if(l.pickup||!l.gans.length)return;const cid=l.gans[0].split('.')[0];(lines[k][cid]=lines[k][cid]||[]).push(l)})});
  const gan={};rows.forEach(k=>{gan[k]={};const J=k===TV&&P.parts.jhallari?Object.fromEntries(P.parts.jhallari.gans.map(g=>[g.addr,g])):null;P.parts[k].gans.forEach(g=>gan[k][g.addr]=J?tvGan(g,J[g.addr]):g)});
  // columns: every line of every part uses the same number of गण cells, so the columns line up;
  // a second (third …) ending starts in the column where the first ending started
  const C=Math.min(8,Math.max(1,...rows.flatMap(k=>Object.values(lines[k]).flat().map(l=>l.gans.length))));
  const colOf={};rows.forEach(k=>{colOf[k]={};Object.values(lines[k]).flat().forEach(l=>l.gans.forEach((a,i)=>colOf[k][a]=i))});
  const pad=n=>'<span class="gp"></span>'.repeat(Math.max(0,n));
  const lineCells=(k,l)=>{const m=/^(c\d+)\.e(\d+)\.(\d+)$/.exec(l.gans[0]);let pre=0;
    if(m&&+m[2]>1){const c1=colOf[k][`${m[1]}.e1.${m[3]}`];if(c1!=null&&c1+l.gans.length<=C)pre=c1}
    return pad(pre)+l.gans.map(a=>gan[k][a]?ganHTML(gan[k][a],k):'<span class="gp"></span>').join('')+pad(C-pre-l.gans.length)};
  // अनागत: matras played just before सम (printed as a short line before the charan), shown right-aligned
  const pickRow=c=>{const ps=vis.map(k=>[k,(P.parts[k].pickups||[]).find(x=>x.charan===c.id)]).filter(x=>x[1]);if(!ps.length)return '';
    return `<div class="ln pk" data-first="${c.id}.p.${ps[0][1].matras[0].at}">`+ps.map(([k,pk],i)=>`<div class="pr r-${k} pkrow ${vis.indexOf(k)===0?'lead':'sec'}">${i===0?`<span class="pkl">↪ ${esc(i18n.t('player.anagat'))}</span>`:'<span class="pkl"></span>'}${pk.matras.map(m=>`<span class="g pkm" data-a="${c.id}.p.${m.at}">${matraHTML(m)}</span>`).join('')}<span class="pkbar">॥</span></div>`).join('')+'</div>'};
  let h='';
  if(perf&&R.prelude){
    h+=`<div class="cb" data-c="r"><button class="chh" data-jump="r">${i18n.t('player.rananAnak')}</button><div class="ln" data-first="r.b.0">`+
      `<div class="pr r-anak lead pre">${(R.prelude.parts.anak||{gans:[]}).gans.map(g=>ganHTML(g,'anak')).join('')}</div>`+
      (TV&&R.prelude.parts[TV]?`<div class="pr r-${TV} tal">${R.prelude.parts[TV].gans.map((g,i)=>ganHTML(tvGan(g,(R.prelude.parts.jhallari||{gans:[]}).gans[i]),TV)).join('')}</div>`:'')+`</div></div>`;
  }
  R.charans.forEach(c=>{
    const n=Math.max(...vis.map(k=>(lines[k][c.id]||[]).length));if(!n)return;
    h+=`<div class="cb" data-c="${c.id}"><button class="chh" data-jump="${c.id}">${esc(charanLabel(mode==='once'&&c.segments.length<2?{...c,repeat:1}:c))}</button>`+pickRow(c);
    for(let i=0;i<n;i++){
      const first=(lines[vis[0]][c.id]||[])[i];
      h+=`<div class="ln" data-first="${first?first.gans[0]:''}">`+rows.map((k,vi)=>{const l=(lines[k][c.id]||[])[i];if(!l)return '';
        return `<div class="pr r-${k} ${k===TV?'tal':vi===0?'lead':'sec'}">${lineCells(k,l)}</div>`}).join('')+`</div>`}
    h+=`</div>`});
  if(perf&&R.performance){const cl=R.performance.find(x=>x.closing);if(cl){const c=R.charans.find(x=>x.id===cl.id);h+=`<p class="tail">${esc(i18n.t('player.tail', { part: charanLabel({...c,repeat:1}) }))}</p>`}}
  $('#score').innerHTML=h;fitRows();
  $('#score').querySelectorAll('.g').forEach(el=>{const pr=el.closest('.pr');if(pr.classList.contains('pre')){vis.forEach(k=>CELL[k][el.dataset.a]=el);return}
    const k=[...pr.classList].find(x=>x.startsWith('r-')).slice(2);(CELL[k]||(CELL[k]={}))[el.dataset.a]=el});
  lastKey={};lastLine=null;
}

/* ---------- chips: tap = only this, long press = add / remove ---------- */
let pressT=null,longDone=false;
function applySel(){store.set('sel2',[...new Set([...SEL].map(k=>MEL.includes(k)?'mel':k))]);if(ctx)KEYS.forEach(k=>{if(gains[k])gains[k].gain.setTargetAtTime(on(k)?mixOf(k):0,ctx.currentTime,.02)});
  const was=S.playing,pos=curPos();renderChips();renderModes();renderScore();if(was){restart(pos)}else paintAt(S.pos)}
function chipTap(k){if(k==='all'){SEL=new Set(KEYS.filter(x=>x!=='steps'));if(marchOn&&stepSnd)SEL.add('steps')}
  else if(SEL.size===1&&on(k)){SEL=new Set(KEYS.filter(x=>x!=='steps'))}else SEL=new Set([k]);
  if(marchOn&&stepSnd&&P.parts.steps)SEL.add('steps');applySel()}
function chipLong(k){if(k==='all')return;if(on(k))SEL.delete(k);else SEL.add(k);if(!SEL.size)SEL=new Set(KEYS.filter(x=>x!=='steps'));applySel();if(navigator.vibrate)try{navigator.vibrate(15)}catch(e){}}
$('#pchips').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-k]');if(!b)return;longDone=false;clearTimeout(pressT);pressT=setTimeout(()=>{longDone=true;chipLong(b.dataset.k)},480)});
['pointerup','pointercancel','pointerleave'].forEach(t=>$('#pchips').addEventListener(t,()=>clearTimeout(pressT)));
$('#pchips').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;if(longDone){longDone=false;return}chipTap(b.dataset.k)});
$('#pchips').addEventListener('contextmenu',e=>e.preventDefault());

/* ---------- timeline + transport ---------- */
function build(){
  const order=perf&&R.performance?'performance':mode==='once'?'once':'printed';
  TL={};KEYS.forEach(k=>TL[k]=buildTimeline3(P,k,{tempo,order}));
  const items=[];KEYS.forEach(k=>TL[k].sounds.forEach(s=>items.push({t:s.t,k,s})));
  items.sort((a,b)=>a.t-b.t);
  const hl={};[...visibleParts(),tvRow()].filter(Boolean).forEach(k=>hl[k]=TL[k].beats.filter(b=>b.key));
  STEPS=TL.steps?TL.steps.beats.filter(b=>b.step).map(b=>({t:b.t,foot:b.step})):[];
  // play-order blocks from the lead's beats
  const lb=TL[LEAD].beats.filter(b=>b.pass>0).sort((a,b)=>a.t-b.t);const blocks=[];let prev=null;
  lb.forEach(b=>{if(!prev||b.charan!==prev.charan||b.pass<prev.pass)blocks.push({charan:b.charan,s:b.t,e:b.t+b.dur,passes:b.pass});else{const B=blocks[blocks.length-1];B.e=b.t+b.dur;B.passes=Math.max(B.passes,b.pass)}prev=b});
  const end=Math.max(...KEYS.map(k=>TL[k].total));
  EV={items,hl,blocks,end,origin:TL[LEAD].origin};
  renderBlocks();$('#tend').textContent=mmss(end);
  const base=(R.charans.find(c=>c.type!=='prarambhik')||R.charans[0]).laya;$('#tval').textContent=$('#mtval').textContent=dv(Math.round(base*tempo));
}
function blockLabel(b,i){if(b.charan===0)return i18n.t('player.bR');const c=R.charans.find(x=>x.n===b.charan);if(!c)return '';
  if(c.type==='prarambhik')return i18n.t('player.bPr');if(c.type==='setu')return i18n.t('player.bSe');if(c.role==='closing-tag')return '·';return c.no?dv(c.no):''}
function renderBlocks(){const B=EV.blocks;const lastI=B.length-1;const cl=perf&&R.performance&&R.performance[R.performance.length-1].closing;
  $('#blocks').innerHTML=B.map((b,i)=>`<button data-b="${i}" class="${cl&&i===lastI?'cl':''}" style="flex-grow:${Math.max(.6,b.e-b.s)}" aria-label="${esc(i18n.t('player.goTo', { target: blockLabel(b,i) }))}"><i></i><span>${blockLabel(b,i)}${cl&&i===lastI?' ⟲':''}</span></button>`).join('')}
$('#blocks').addEventListener('click',e=>{const b=e.target.closest('[data-b]');if(!b)return;const B=EV.blocks[+b.dataset.b];seek(B.s)});
function idxAt(arr,t){let lo=0,hi=arr.length-1,a=-1;while(lo<=hi){const m=(lo+hi)>>1;if(arr[m].t<=t+EPS){a=m;lo=m+1}else hi=m-1}return a}
function curPos(){return TR.position()}
function blockAt(t){const B=EV.blocks;let i=B.findIndex(b=>t>=b.s-EPS&&t<b.e-EPS);if(i<0)i=t<(B[0]?B[0].s:0)?0:B.length-1;return i}
/* Only one copy of the app plays at a time: when this one starts, any other open copy (tab, window, home-screen app) stops. */
const COPY_ID=Math.random().toString(36).slice(2);let chan=null;try{chan=new BroadcastChannel('ghoshnaad')}catch(e){}
function announce(){try{const tl=window.ScreenApp&&window.ScreenApp.get('tala');if(tl)tl.onStopAll()}catch(e){}try{chan&&chan.postMessage({play:COPY_ID})}catch(e){}try{localStorage.setItem('ghosh.playing',COPY_ID+':'+Date.now())}catch(e){}}
function otherPlays(id){if(!id||id===COPY_ID)return;if(S.playing)stop();if(window.ScreenApp)window.ScreenApp.stopAll()}
if(chan)chan.onmessage=e=>{if(e.data&&e.data.play)otherPlays(e.data.play)};
addEventListener('storage',e=>{if(e.key==='ghosh.playing'&&e.newValue)otherPlays(e.newValue.split(':')[0])});
function start(from=0,countIn=marchOn){
  if(!P)return;if(S.playing)stop(true);audio();announce();if(!EV)build();
  const win=S.custom?{s:S.custom.s,e:S.custom.e}:loop?(()=>{const B=EV.blocks[blockAt(from)];return B?{s:B.s,e:B.e}:null})():null;
  let lead=.12;
  if(countIn&&R.countIn){const md=60/((R.charans.find(c=>c.type!=='prarambhik')||R.charans[0]).laya*tempo);const cd=Math.min(1.4,Math.max(.4,md*(R.countIn.matras||2)));const now=ctx.currentTime+.12;
    // अंक-ताल: "एक दो, एक दो" (दादरा: "एक दो तीन, एक दो तीन"), a soft click on each count, the रणन follows in that tempo
    const raw=R.countIn.words||['एक','दो','एक','दो'],words=raw.map(w=>i18n.t('player.countWord',{word:w}));words.forEach((w,k)=>{click(now+k*cd,w===words[0]||raw[k]==='एक'?1:.6,master);S.cnt.push(setTimeout(()=>{$('#count').textContent=w;$('#count').hidden=false},(.12+k*cd+outLat())*1000))});
    S.cnt.push(setTimeout(()=>{$('#count').hidden=true},(.12+words.length*cd+outLat())*1000));lead=.12+words.length*cd}
  TR.load(EV.items,EV.end);TR.start({from,window:win,lead});
  setPlayIcon(true);S.raf=requestAnimationFrame(frame);wake(true)}
function stop(silent){const pos=curPos();TR.halt();cancelAnimationFrame(S.raf);S.cnt.forEach(clearTimeout);S.cnt=[];$('#count').hidden=true;
  ENG.fadeOutParts();gains=ENG.parts;
  if(!silent)S.pos=pos;setPlayIcon(false)}
function setPlayIcon(p){const d=p?'M7 5h4v14H7zM13 5h4v14h-4z':'M8 5v14l11-7z';$('#pi').setAttribute('d',d);$('#mpi').setAttribute('d',d);
  $('#play').setAttribute('aria-label',p?i18n.t('player.stop'):i18n.t('player.play'));$('#mplay').setAttribute('aria-label',p?i18n.t('player.stop'):i18n.t('player.play'))}
function restart(pos){stop(true);build();start(pos,false)}
function seek(t){S.pos=t;if(S.playing){restart(t)}else{paintAt(t)}}
let LATE=0;   // sounds skipped because they would have come late (shown in ध्वनी तपासणी)
function outLat(){return ENG.outputLatency()}
function frame(){if(!S.playing)return;const t=ctx.currentTime-outLat()-S.t0+S.off;if(t>=0){paintAt(t);if(window.onEnginePaint)window.onEnginePaint(t)}S.raf=requestAnimationFrame(frame)}

/* ---------- painting the position ---------- */
let lastKey={},lastLine=null,lastBlock=-1,lastStep=-1,stepCount=0;
function paintAt(t){
  if(!EV)return;
  Object.entries(EV.hl).forEach(([k,arr])=>{const i=idxAt(arr,t);const b=i>=0?arr[i]:null;
    let addr=b?(b.yati?b.key:b.key.replace(/\.\d+$/,'')):null;if(b&&t>b.t+b.dur+.05)addr=null;
    if(addr!==lastKey[k]){const o=CELL[k]&&CELL[k][lastKey[k]];if(o)o.classList.remove('now');lastKey[k]=addr;const el=CELL[k]&&CELL[k][addr];if(el)el.classList.add('now');
      if(k===visibleParts()[0]){const ln=el&&el.closest('.ln');if(ln!==lastLine){if(lastLine)lastLine.classList.remove('cur');lastLine=ln;if(ln){ln.classList.add('cur');if(!marchOn)scrollToLine(ln);
        $('#score').querySelectorAll('.cb.on').forEach(x=>x.classList.remove('on'));ln.closest('.cb').classList.add('on')}if(marchOn)paintMarchLines()}
        if(marchOn){const ml=$('#mlines');ml.querySelectorAll('.g.now').forEach(x=>x.classList.remove('now'));const mm=addr&&ml.querySelector('.g[data-a="'+addr+'"]');if(mm)mm.classList.add('now')}}}});
  const bi=blockAt(t);const B=EV.blocks;
  $('#blocks').querySelectorAll('button').forEach((el,i)=>{const b=B[i];const f=t>=b.e?1:t<=b.s?0:(t-b.s)/(b.e-b.s);el.firstChild.style.width=(f*100)+'%'});
  $('#tnow').textContent=mmss(t);
  if(marchOn){const j=idxAt(STEPS,t);if(j!==lastStep){lastStep=j;const st=STEPS[j];
      $('#fL').classList.toggle('on',!!st&&st.foot==='L');$('#fR').classList.toggle('on',!!st&&st.foot==='R');
      $('#mstep').textContent=i18n.t('player.step', { n: dv(Math.max(0,j+1)) });
      if(st&&S.playing&&navigator.vibrate)try{navigator.vibrate(18)}catch(e){}}
    const lb=EV.hl[LEAD]||Object.values(EV.hl)[0];const i=idxAt(lb,t);const b=i>=0?lb[i]:null;$('#msam').classList.toggle('on',!!b&&b.sam);
    if(bi!==lastBlock){lastBlock=bi;const bb=B[bi];$('#mpos').textContent=bb?(bb.charan===0?i18n.t('player.ranan'):blockName(bb)):'—'}}
}
function blockName(b){const c=R.charans.find(x=>x.n===b.charan);if(!c)return '';return charanLabel({...c,repeat:1})+(b.passes>1?' · '+i18n.t('player.times', { n: dv(2) }):'')}
function scrollToLine(ln){const sc=$('#score');const r=ln.getBoundingClientRect(),sr=sc.getBoundingClientRect();
  const want=sr.top+sr.height*.18;if(r.top<sr.top+4||r.top>sr.top+sr.height*.45)sc.scrollTop+=r.top-want}
$('#score').addEventListener('click',e=>{
  const j=e.target.closest('[data-jump]');
  if(j){const cid=j.dataset.jump;const B=EV.blocks.find(b=>cid==='r'?b.charan===0:(R.charans.find(c=>c.id===cid)||{}).n===b.charan);if(B)seek(B.s);return}
  const ln=e.target.closest('.ln[data-first]');if(!ln||!ln.dataset.first)return;
  const a=ln.dataset.first,lb=EV.hl[visibleParts()[0]];const now=curPos();
  const hits=lb.filter(b=>b.key===a||b.key.startsWith(a+'.'));if(!hits.length)return;
  const h=hits.find(b=>b.t>=now-0.05)||hits[0];seek(h.t)});

/* ---------- controls ---------- */
$('#play').onclick=$('#mplay').onclick=async()=>{audio();if(S.playing)stop();else{const p=S.pos>=EV.end-.05?0:S.pos;start(p)}};
function setTempo(d){const base=(R.charans.find(c=>c.type!=='prarambhik')||R.charans[0]).laya;const cur=Math.round(base*tempo);
  const step=base>=300?15:5;const nv=Math.min(base*1.6,Math.max(base*.5,cur+d*step));const pos=curPos()*tempo;tempo=nv/base;const np=pos/tempo;
  if(S.playing)restart(np);else{S.pos=np;build();paintAt(np)}}
$('#tup').onclick=$('#mtup').onclick=()=>setTempo(1);$('#tdown').onclick=$('#mtdown').onclick=()=>setTempo(-1);
$('#loop').onclick=()=>{loop=!loop;$('#loop').setAttribute('aria-pressed',loop);if(S.playing)restart(curPos())};
async function setMode(m){if(m===mode)return;stop(true);S.pos=0;mode=m;perf=m==='perf';
  renderModes();renderChips();renderScore();build();paintAt(0);renderModes()}
$('#modes').addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(b)setMode(b.dataset.m)});
$('#marchBtn').onclick=async()=>{if(!P.parts.steps)return;marchOn=true;$('#march').hidden=false;
  $('#msub').textContent=i18n.t('player.marchA')+' · '+(P.meta.performance.mode==='mandchal'?i18n.t('player.mandchal'):i18n.t('list.prachalan'));if(stepSnd)SEL.add('steps');applySel();lastStep=-1;lastBlock=-1;paintMarchLines();
  if(!S.playing){audio();start(S.pos>=EV.end-.05?0:S.pos,true)}};
$('#mclose').onclick=()=>{marchOn=false;$('#march').hidden=true;SEL.delete('steps');if(!SEL.size)SEL=new Set(KEYS.filter(x=>x!=='steps'));applySel()};
$('#mstepSnd').onclick=()=>{stepSnd=!stepSnd;$('#mstepSnd').setAttribute('aria-pressed',stepSnd);if(stepSnd)SEL.add('steps');else SEL.delete('steps');if(!SEL.size)SEL=new Set(['steps']);applySel()};
function paintMarchLines(){const cur=lastLine||$('#score .ln');if(!cur){$('#mlines').innerHTML='';return}
  const all=[...$('#score').querySelectorAll('.ln')],i=all.indexOf(cur),pv=all[i-1],nx=all[i+1];
  const row=(tag,el,cls)=>`<div class="mrow ${cls}"><span class="tag">${tag}</span>${el?el.outerHTML.replace(' cur',''):'<div class="ln ln-empty"></div>'}</div>`;
  $('#mlines').innerHTML=row(i18n.t('player.prev'),pv,'m-prev')+row(i18n.t('player.now'),cur,'m-now')+row(i18n.t('player.next'),nx,'m-next');fitRows($('#mlines'));
  const n=$('#mlines .m-now .ln');if(n)n.classList.add('cur')}

/* ---------- वाद्य निवड ---------- */
function renderSheet(){
  $('#sheetBody').innerHTML=Object.entries(INSTR).map(([g,G])=>{
    const need=(g==='shankh'||g==='vanshi');
    const en=i18n.romanNames;
    return `<div class="igrp"><b>${i18n.t('common.groups.' + g)}</b><div class="opts">${G.opts.map(([id])=>{const [d,e]=INST_NAMES[id];return `<button class="opt" data-g="${g}" data-i="${id}" aria-pressed="${INST[g].includes(id)}"><span>${i18n.name(d,e)}</span><small>${en?d:e}</small></button>`}).join('')}</div>${need?`<span class="note">${i18n.t('settings.needOne')}</span>`:''}</div>`}).join('');
  const sel=(on)=>`aria-pressed="${on}"`;
  $('#playOpts').innerHTML=`<div class="igrp"><b>${i18n.t('settings.pitchL')}</b>${['shankh','vanshi'].map(pk=>`<span class="note">${i18n.t('common.groups.' + pk)} · ${SA_KEYS[saKeys[pk]]}${SA_DEF[pk].oct}</span><div class="opts keys">${SA_KEYS.map((k,i)=>`<button class="opt key" data-sa="${pk}:${i}" ${sel(i===saKeys[pk])}><span>${k}</span></button>`).join('')}</div>`).join('')}</div>
  <div class="igrp"><b>${i18n.t('settings.artL')}</b><div class="opts">${['santar','nirantar'].map(a=>`<button class="opt" data-art="${a}" ${sel(a===artic)}><span>${i18n.t('settings.'+a)}</span><small>${i18n.t('settings.'+a+'S')}</small></button>`).join('')}</div></div>
  <div class="igrp"><b>${i18n.t('settings.kanL')}</b><div class="opts">${[30,45,60,80,100,130].map(m=>`<button class="opt key" data-kan="${m}" ${sel(m===kanMs)}><span>${dv(m)}</span></button>`).join('')}</div><span class="note">${i18n.t('settings.ms', { ms: '' })}</span></div>`;
  $('#libOpts').innerHTML=window.Library?window.Library.sheetHTML():'';
  if(window.PlatformUI)window.PlatformUI.render();
  $('#langs').innerHTML=i18n.languages.map(l=>`<button class="opt lang" data-lang="${l.code}" aria-pressed="${l.code===i18n.LANG}" lang="${l.code}"><span>${l.name}</span></button>`).join('')}
$('#instBtn').onclick=$('#instBtn2').onclick=()=>{renderSheet();$('#sheet').hidden=false};
$('#sheetX').onclick=()=>{$('#sheet').hidden=true};
$('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet'){$('#sheet').hidden=true;return}
  if(e.target.closest('[data-fx]'))return;
  const lb=e.target.closest('[data-lang]');if(lb){env.setLang(lb.dataset.lang);return}
  const sb=e.target.closest('[data-sa]');if(sb){const [pk,k]=sb.dataset.sa.split(':');setSaKey(pk,+k);renderSheet();previewSa(pk);return}
  const ab=e.target.closest('[data-art]');if(ab){artic=ab.dataset.art;store.set('artic',artic);renderSheet();return}
  const kb=e.target.closest('[data-kan]');if(kb){kanMs=+kb.dataset.kan;store.set('kanMs',kanMs);renderSheet();previewKan();return}
  const b=e.target.closest('.opt');if(!b)return;const g=b.dataset.g,i=b.dataset.i,cur=INST[g];
  if(cur.includes(i)){if((g==='shankh'||g==='vanshi')&&cur.length===1)return;INST[g]=cur.filter(x=>x!==i)}else INST[g]=[...cur,i];
  store.set('inst',INST);renderSheet();if(P&&!$('#player').hidden)applySel()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#sheet').hidden)$('#sheet').hidden=true});
// short previews when a setting changes (not while a rachana is playing)
function previewSa(pk){if(S.playing)return;audio();const t=ctx.currentTime+.05,v=voicesFor(pk)[0];
  [['S',0],['G',0],['P',0],['S',1]].forEach(([sw,o],i)=>playNote({swara:sw,octave:o,dur:.32,pk},t+i*.34,master,v))}
function previewKan(){if(S.playing)return;audio();const t=ctx.currentTime+.05,v=voicesFor('vanshi')[0];
  playNote({swara:'G',octave:0,dur:.5,grace:[{type:'note',swara:'M',octave:0}]},t,master,v);playNote({swara:'R',octave:0,dur:.5},t+.5,master,v)}

// the services the migrated screens (src/screens) receive instead of reaching for globals
/* ---------- keep the screen on ---------- */
let lock=null;
async function wake(want){try{if(want&&!lock&&'wakeLock' in navigator&&document.visibilityState==='visible'){lock=await navigator.wakeLock.request('screen');lock.addEventListener('release',()=>{lock=null})}
  else if(!want&&lock){await lock.release();lock=null}}catch(e){lock=null}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&P)wake(true)});
document.addEventListener('keydown',e=>{if(!P||e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||document.querySelector('.cview:not([hidden])'))return;if(e.code==='Space'){e.preventDefault();$('#play').click()}});

const services = {
  matraHTML, slotHTML, fitRows, renderPlayer: () => renderPlayer(), openPiece, wake: v => wake(v), 
  audio: { get engine() { return ENG; }, unlock: () => audio(), announce: () => announce(), outLat: () => outLat(), get ctx() { return ctx; }, get master() { return master; }, get gains() { return gains; },
    hz: s => hz(s), playNote: (e, t, o, v) => playNote(e, t, o, v), playStroke: (e, t, o) => playStroke(e, t, o), footfall: (t, f, o) => footfall(t, f, o),
    panav: (t, v, o, m) => panav(t, v, o, m), jhal: (t, v, o, m) => jhal(t, v, o, m), trib: (t, v, o, m) => trib(t, v, o, m), click: (t, v, o) => click(t, v, o),
    mixOf: k => mixOf(k), on: k => on(k), voicesFor: k => voicesFor(k) },
  // the player, which the sound check borrows to listen to a whole rachana
  player: { get LATE() { return LATE; }, get LIST() { return LSV().LIST; }, get LEAD() { return LEAD; }, get TL() { return TL; }, get P() { return P; }, set P(v) { P = v; }, S, get curKey() { return curKey; },
    get BOOK() { return LSV().BOOK; }, get SEL() { return SEL; }, set SEL(v) { SEL = v; }, get MIX() { return MIX; }, set MIX(v) { MIX = v; },
    loadPiece: (p, o) => loadPiece(p, o), build: () => build(), start: (a, b) => start(a, b), stop: s => stop(s), showPiece: (p, o) => showPiece(p, o) },
  settings: { get artic() { return artic; }, set artic(v) { artic = v; }, get kanMs() { return kanMs; }, set kanMs(v) { kanMs = v; }, get saKeys() { return saKeys; }, setSaKey: (k, v) => setSaKey(k, v),
    SA_KEYS, SA_DEF, VOICE_OF, INST_NAMES, RAGA_ROM: env.RAGA_ROM },
};
// what the page does after the language changed: redraw the rachana on screen, if one is open
function rerender() {
  if (P) { renderPlayer(); renderBlocks(); $('#tend').textContent = mmss(EV.end); const base = (R.charans.find(c => c.type !== 'prarambhik') || R.charans[0]).laya; $('#tval').textContent = $('#mtval').textContent = dv(Math.round(base * tempo));
    lastBlock = -1; lastStep = -2; setPlayIcon(S.playing); if (marchOn) { $('#msub').textContent = i18n.t('player.marchA') + ' · ' + (P.meta.performance.mode === 'mandchal' ? i18n.t('player.mandchal') : i18n.t('list.prachalan')); paintMarchLines(); } paintAt(curPos()); }
}
// Handles other page scripts and the tests use by name (platform.js is not migrated yet); the screens use env instead.
Object.assign(window, { openPiece, renderSheet, announce, otherPlays, stop, S, TR, ganHTML, slotHTML, matraHTML });
for (const [n, get] of Object.entries({ ctx: () => ctx, artic: () => artic, kanMs: () => kanMs, saKeys: () => saKeys })) Object.defineProperty(window, n, { get, configurable: true });
return { services, rerender, openPiece, renderSheet, isBusy: () => S.playing,
  /** the language changed: the settings sheet, and the rachana on screen if one is open */
  onLang() { renderSheet(); rerender(); } };
}
