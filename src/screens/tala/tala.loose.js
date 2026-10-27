// @ts-nocheck — moved from v1.1.0's tala page (the content and drawing are unchanged); not fully typed yet.
// ताल वेळरेषा: every ताल on one time line, so the आवर्तन, the steps, the ध्वंकार and the आनक's hands can be seen to line up (घोष परिचय pp. 47, 49–53).
// It draws into a shadow root (its own styles, its own element ids) and uses the app's one audio engine and Transport.
import { Transport } from '../../audio/transport.ts';
import { tick as talaTick, levelOf as talaLevelOf, panavStroke as talaPanav, footfall as talaFoot } from '../../audio/tala.ts';

/** @param {ShadowRoot} root @param {import('../../ui/env.d.ts').AppEnv} env */
export function createTalaTimeline(root, env) {
const A = env.audio;

const DEV='०१२३४५६७८९', d=x=>String(x).replace(/\d/g,c=>DEV[c]);
const sec=x=>{const r=Math.round(x*1000)/1000;const s=Math.abs(x*1000-Math.round(x*1000))<1e-6?String(r):x.toFixed(2);return d(s)};
const K=[[1,1],[1,1]];
// ताल रचना: name, लय, गण (गट lengths), ध्वंकार, मात्रा per पाऊल (0 = स्थिर), चाल, roll per matra, note
const ROWS=[
 {id:'kerva',name:'केरवा',laya:120,gans:K,dhv:[1,2,3,4],mps:1,chal:'prachal',note:'प्रचलन रचना'},
 {id:'khemta',name:'खेमटा',laya:360,gans:[[3,3],[3,3]],dhv:[1,4,7,10],mps:3,chal:'prachal',note:'प्रचलन रचना',tri:1},
 {id:'ektal',name:'एकताल',laya:120,gans:Array(6).fill([1,1]),dhv:[1,2,3,4,5,6,7,8,9,10,11,12],mps:1,chal:'prachal',note:'वीरश्री · पावले गृहीत'},
 {id:'dadra',name:'दादरा',laya:180,gans:[[1,1,1],[1,1,1]],dhv:[1,4],mps:3,chal:'mand',note:'मंदचल'},
 {id:'dadra',name:'दादरा',laya:120,gans:[[1,1,1],[1,1,1]],dhv:[1,4],mps:3,chal:'mand',note:'मंदचल'},
 {id:'tritaal',name:'त्रिताल',laya:120,gans:Array(4).fill([1,1,1,1]),dhv:[1,3,5,7,9,11,13,15],mps:2,chal:'mand',note:'आरुणी · पावले गृहीत'},
 {id:'jhaptal',name:'झपताल',laya:240,gans:[[2,3],[2,3]],dhv:[1,3,6,8],mps:0,chal:'sthir',note:'आद्य सरसंघचालक प्रणाम'},
 {id:'jhaptal',name:'झपताल',laya:120,gans:[[2,3],[2,3]],dhv:[1,3,6,8],mps:0,chal:'sthir',note:'उद्घोष'},
 {id:'jhaptal',name:'झपताल',laya:100,gans:[[2,3],[2,3]],dhv:[1,3,6,8],mps:0,chal:'sthir',note:'उद्घोष'},
 {id:'rupak',name:'रूपक',laya:120,gans:[[3,2,2],[3,2,2]],dhv:[1,4,6,8,11,13],mps:0,chal:'sthir',note:'स्वागत प्रणाम · १४ अंक'},
 {id:'kerva',name:'केरवा',laya:100,gans:K,dhv:[1,2,3,4],mps:0,chal:'sthir',note:'उद्घोष'},
 {id:'kerva',name:'केरवा',laya:160,gans:K,dhv:[1,2,3,4],mps:0,chal:'sthir',note:''},
];
const TALAS=[['kerva','केरवा'],['khemta','खेमटा'],['dadra','दादरा'],['jhaptal','झपताल'],['rupak','रूपक'],['ektal','एकताल'],['tritaal','त्रिताल']];
const CHAL=[['all','सर्व'],['prachal','प्रचल'],['mand','मंदचल'],['sthir','स्थिर']];
const CHALNAME={prachal:'संचलन — प्रचल',mand:'मंदचल',sthir:'स्थिर — प्रणाम, उद्घोष'};
const LAYERS=[['dhv','ध्वंकार','i-drum','c-dh'],['tr','आनक त्र व हात','i-stick','c-hand'],['step','पाऊल','i-foot','c-step'],['rep','पुढची आवर्तने','i-rep','c-st']];
const SOUNDS=[['num','ठेका'],['dhv','ध्वंकार'],['step','पाऊल']],SPEEDS=[1,.75,.5,.25];
const WINS=[4,8,12], ZOOMS=[['70','लहान'],['100','मध्यम'],['150','मोठा']];
const ic=(id,cls)=>`<svg class="ic ${cls||''}" aria-hidden="true"><use href="#${id}"/></svg>`;
let st={talas:Object.fromEntries(TALAS.map(t=>[t[0],true])),chal:'all',dhv:true,tr:false,step:true,rep:true,win:8,pps:100,snd:{num:true,dhv:true,step:false},speed:1};
try{const s=JSON.parse(localStorage.getItem('tala.v3')||'null');if(s)st=Object.assign(st,s,{talas:Object.assign(st.talas,s.talas||{}),snd:Object.assign(st.snd,s.snd||{})})}catch(e){}
const save=()=>{try{localStorage.setItem('tala.v3',JSON.stringify(st))}catch(e){}};

function filters(){
  const b=(attr,val,on,label)=>`<button data-${attr}="${val}" aria-pressed="${on}">${label}</button>`;
  root.getElementById('filters').innerHTML=
   `<div class="fr0"><span class="fl0">ताल</span><div class="chips">${TALAS.map(t=>b('t',t[0],st.talas[t[0]],t[1])).join('')}</div></div>`+
   `<div class="fr0"><span class="fl0">चाल</span><div class="chips">${CHAL.map(c=>b('c',c[0],st.chal===c[0],c[1])).join('')}</div></div>`+
   `<div class="fr0"><span class="fl0">दाखवा</span><div class="chips">${LAYERS.map(l=>b('l',l[0],st[l[0]],ic(l[2],st[l[0]]?'':l[3])+l[1])).join('')}</div></div>`+
   `<div class="fr0"><span class="fl0">ध्वनी</span><div class="chips">${SOUNDS.map(l=>b('s',l[0],st.snd[l[0]],l[1])).join('')}</div><span class="sep"></span><span class="fl0">लय</span><div class="chips">${SPEEDS.map(v=>b('v',v,st.speed===v,d(Math.round(v*100))+'%')).join('')}</div></div>`+
   `<div class="fr0"><span class="fl0">वेळ</span><div class="chips">${WINS.map(w=>b('w',w,st.win===w,d(w)+' से.')).join('')}</div><span class="sep"></span><span class="fl0">आकार</span><div class="chips">${ZOOMS.map(z=>b('z',z[0],st.pps===+z[0],z[1])).join('')}</div></div>`;
}
function legend(){
  const L=[`<span><i style="width:22px;height:12px;background:var(--g0);border-radius:3px"></i><i style="width:22px;height:12px;background:var(--g1);border-radius:3px;margin-left:-3px"></i>गण</span>`,
   `<span><i style="height:14px;border-left:1.5px dashed var(--mut)"></i>गट</span>`,`<span><i style="height:16px;border-left:3px solid var(--fg)"></i>आवर्तन सुरू (॥)</span>`];
  if(st.dhv)L.push(`<span>${ic('i-drum','c-dh')} नारिंगी अंक व बिंदू = ध्वंकार</span>`);
  if(st.tr)L.push(`<span>${ic('i-stick','c-hand')} उंच रेघ = तंकार, लहान = अनुतंकार; <b style="color:var(--hand)">उ / डा</b> = हात</span>`);
  if(st.step)L.push(`<span>${ic('i-foot','c-step')} <b style="color:var(--fl)">डावा</b> / <b style="color:var(--fr)">उजवा</b> = पाऊल</span>`);
  root.getElementById('legend').innerHTML=L.join('');
}
// row geometry: count band, then optional sub-rows
function layout(){const y={band:[4,38]};let h=42;if(st.dhv){y.dot=h+5;h+=12}if(st.tr){y.tr=[h+2,h+16];y.hand=h+25;h+=29}if(st.step){y.step=h+12;h+=18}return {y,h:h+4}}
function rowSVG(r,W,P,G){
  const md=60/r.laya,N=r.gans.flat().reduce((a,b)=>a+b,0),cyc=N*md,WIDTH=W*P,{y,h}=G;const out=[];
  let t=0,rep=0;
  while(t<W-1e-9){
    if(rep>0&&!st.rep)break;
    const el=[];let k=0,tg=t;
    r.gans.forEach((g,gi)=>{const glen=g.reduce((a,b)=>a+b,0)*md,x=tg*P;
      if(x<WIDTH)el.push(`<rect class="gan g${gi%2}" x="${(x+1).toFixed(1)}" y="${y.band[0]}" width="${Math.max(0,Math.min(glen*P,WIDTH-x)-2).toFixed(1)}" height="${y.band[1]-y.band[0]}" rx="5"/>`);
      let tm=tg;
      g.forEach((gl,ti)=>{
        if(ti>0&&tm*P<WIDTH)el.push(`<line class="gat" x1="${(tm*P).toFixed(1)}" y1="${y.band[0]+3}" x2="${(tm*P).toFixed(1)}" y2="${y.band[1]-3}"/>`);
        for(let q=0;q<gl;q++){k++;const x=tm*P,w=md*P;
          if(x<WIDTH-.5){
            const dh=st.dhv&&r.dhv.includes(k),fs=w>=16?13:w>=11?10.5:9;
            el.push(`<g data-c="${rep}-${k}"><title>${r.name} ${d(r.laya)} · अंक ${d(k)} · ${sec(tm-t)} से. (आवर्तन ${d(rep+1)})</title><rect class="hit" x="${x.toFixed(1)}" y="${y.band[0]}" width="${w.toFixed(1)}" height="${y.band[1]-y.band[0]}"/><text class="n${dh?' dh':''}" x="${(x+w/2).toFixed(1)}" y="${y.band[0]+22}" font-size="${fs}">${d(k)}</text></g>`);
            if(dh)el.push(`<circle class="dot" cx="${(x+3).toFixed(1)}" cy="${y.dot}" r="3.2"/>`);
            if(st.tr){const per=r.tri?3:4;
              for(let j=0;j<per;j++){const sx=x+j*w/per;if(sx>=WIDTH)break;
                if(r.tri){const big=j===0,acc=big&&(k-1)%3===0;
                  el.push(`<line class="${big?'tk':'atk'}${acc?' ac':''}" x1="${sx.toFixed(1)}" y1="${big?y.tr[0]:y.tr[0]+6}" x2="${sx.toFixed(1)}" y2="${y.tr[1]}"/>`);
                  if(big&&w>=16)el.push(`<text class="hd" x="${sx.toFixed(1)}" y="${y.hand}">${(rep*N+k-1)%2?'डा':'उ'}</text>`)}
                else{el.push(`<line class="tk" x1="${sx.toFixed(1)}" y1="${y.tr[0]}" x2="${sx.toFixed(1)}" y2="${y.tr[1]}"/><line class="atk" x1="${(sx+w/per/2).toFixed(1)}" y1="${y.tr[0]+6}" x2="${(sx+w/per/2).toFixed(1)}" y2="${y.tr[1]}"/>`);
                  if(w/per>=16)el.push(`<text class="hd" x="${sx.toFixed(1)}" y="${y.hand}">${j%2?'डा':'उ'}</text>`)}}}
            if(st.step&&r.mps&&(k-1)%r.mps===0){const s=Math.floor((rep*N+k-1)/r.mps),L=s%2===0;el.push(`<text class="ft ${L?'L':'R'}" x="${(x+1).toFixed(1)}" y="${y.step}">${L?'डावा':'उजवा'}</text>`)}
          }
          tm+=md}});
      tg+=glen});
    if(t*P<WIDTH)el.push(`<line class="cyc" x1="${(t*P).toFixed(1)}" y1="0" x2="${(t*P).toFixed(1)}" y2="${y.band[1]+4}"/>`);
    out.push(`<g${rep?' class="rep"':''}>${el.join('')}</g>`);t+=cyc;rep++}
  let grid='';for(let i=0;i<=W*4;i++){const s=i/4,c=i%4===0?'gm':i%2===0?'gh':'gq';grid+=`<line class="${c}" x1="${(s*P).toFixed(1)}" y1="0" x2="${(s*P).toFixed(1)}" y2="${h}"/>`}
  return {svg:`<svg viewBox="0 0 ${WIDTH} ${h}" width="${WIDTH}" height="${h}" role="img" aria-label="${r.name} ${d(r.laya)}">${grid}${out.join('')}</svg>`,N,cyc};
}
function axis(W,P){let s='';for(let i=0;i<=W;i++)s+=`<text class="ax" x="${(i*P+(i===0?3:0)).toFixed(1)}" y="15" text-anchor="${i===0?'start':i===W?'end':'middle'}">${d(i)} से.</text>`;
  if(P>=80)for(let i=0;i<W;i++)s+=`<text class="axh" x="${((i+.5)*P).toFixed(1)}" y="15" text-anchor="middle">${d(i)}.५</text>`;
  return `<svg viewBox="0 0 ${W*P} 20" width="${W*P}" height="20" aria-hidden="true">${s}</svg>`}
function render(){
  filters();legend();
  const W=st.win,P=st.pps,G=layout(),grid=root.getElementById('grid');
  grid.style.gridTemplateColumns=`var(--lw) ${W*P}px`;
  const rows=ROWS.filter(r=>st.talas[r.id]&&(st.chal==='all'||st.chal===r.chal));
  if(!rows.length){grid.style.gridTemplateColumns='1fr';grid.innerHTML='<div class="empty">या निवडीत एकही ताल नाही. वरच्या पर्यायांतून ताल किंवा चाल निवडा.</div>';return}
  let h='',last=null;
  rows.forEach(r=>{
    if(r.chal!==last){last=r.chal;h+=`<div class="grp"><div class="lab"><div class="who" style="padding-top:12px"><small style="font-weight:700;color:var(--fg);font-size:13px">${CHALNAME[r.chal]}</small></div><span></span></div><div class="axc">${axis(W,P)}</div></div>`}
    const {svg,N,cyc}=rowSVG(r,W,P,G);
    const icons=[st.dhv?`<svg class="c-dh" style="top:${G.y.dot-8}px" aria-label="ध्वंकार"><use href="#i-drum"/></svg>`:'',
      st.tr?`<svg class="c-hand" style="top:${G.y.tr[0]}px" aria-label="आनक हात"><use href="#i-stick"/></svg>`:'',
      st.step&&r.mps?`<svg class="c-step" style="top:${G.y.step-12}px" aria-label="पाऊल"><use href="#i-foot"/></svg>`:''].join('');
    const ri=ROWS.indexOf(r),pl=PLAY&&PLAY.ri===ri;
    h+=`<div class="row"><div class="lab"><div class="who"><span class="top"><button class="pb" data-play="${ri}" aria-pressed="${pl}" aria-label="${r.name} ${d(r.laya)} ${pl?'थांबवा':'वाजवा'}">${pl?STOPI:PLAYI}</button><b>${r.name} <span class="lay">${d(r.laya)}</span></b><span class="now" id="now${ri}"></span></span><small>${d(N)} अंक · गण ${r.gans[0].map(d).join('+')} · आवर्तन ${sec(cyc)} से.</small>${r.note?`<small>${r.note}</small>`:''}</div><div class="icons" style="height:${G.h}px">${icons}</div></div><div class="cell${pl?' playing':''}" id="cell${ri}">${svg}<div class="ph"></div></div></div>`;
  });
  grid.innerHTML=h;
}

/* ---------- playing: the shared audio engine, scheduled by the shared Transport ---------- */
const PLAYI='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',STOPI='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
let PLAY=null,bus=null;
const rig=()=>A.engine.rig();
const TR=new Transport(A.engine,{
  dispatch:(it,at)=>{if(!PLAY)return;const r=PLAY.r,k=it.k,i=it.i;
    if(st.snd.dhv&&r.dhv.includes(k))talaPanav(rig(),at,k===1,bus);
    if(st.snd.step&&r.mps&&(i%PLAY.N)%r.mps===0)talaFoot(rig(),at,bus);
    if(st.snd.num)talaTick(rig(),at,talaLevelOf(r.gans,k),bus)},
  onEnd:()=>{},
  onInterrupt:()=>stopPlay()});
function stopPlay(){if(!PLAY)return;TR.halt();cancelAnimationFrame(PLAY.raf);
  if(bus){const o=bus;bus=null;o.gain.setTargetAtTime(0,A.engine.currentTime,.015);setTimeout(()=>{try{o.disconnect()}catch(e){}},300)}
  const c=root.getElementById('cell'+PLAY.ri);if(c){c.classList.remove('playing');c.querySelectorAll('g.on').forEach(g=>g.classList.remove('on'))}
  const n=root.getElementById('now'+PLAY.ri);if(n)n.textContent='';const b=root.querySelector(`[data-play="${PLAY.ri}"]`);if(b){b.innerHTML=PLAYI;b.setAttribute('aria-pressed','false')}PLAY=null}
function startPlay(ri){
  stopPlay();A.announce();A.unlock();
  const r=ROWS[ri],N=r.gans.flat().reduce((a,b)=>a+b,0),md=60/r.laya,cyc=N*md,sp=st.speed;
  const reps=Math.max(1,Math.floor((st.win+1e-6)/cyc)),loop=reps*cyc;           // chart seconds per loop
  const ctx=A.engine.ctx;bus=ctx.createGain();bus.gain.value=1;bus.connect(ctx.destination);
  PLAY={ri,r,N,md,cyc,sp,loop,lastC:''};
  const items=[];for(let i=0;i<reps*N;i++)items.push({t:i*md/sp,k:i%N+1,i});
  TR.load(items,loop/sp);TR.start({from:0,window:{s:0,e:loop/sp},lead:.12});
  const b=root.querySelector(`[data-play="${ri}"]`);if(b){b.innerHTML=STOPI;b.setAttribute('aria-pressed','true')}
  root.getElementById('cell'+ri).classList.add('playing');
  const frame=()=>{if(!PLAY)return;const P=PLAY,tc=Math.max(0,TR.position()*P.sp),inLoop=tc%P.loop,rep=Math.floor(inLoop/P.cyc),k=Math.floor((inLoop-rep*P.cyc)/P.md+1e-6)+1;
    const c=root.getElementById('cell'+P.ri);if(c){c.querySelector('.ph').style.left=(inLoop*st.pps)+'px';const id=rep+'-'+k;
      if(id!==P.lastC){const o=c.querySelector(`g[data-c="${P.lastC}"]`);if(o)o.classList.remove('on');const g=c.querySelector(`g[data-c="${id}"]`);if(g)g.classList.add('on');P.lastC=id;
        const n=root.getElementById('now'+P.ri);if(n)n.textContent=d(k)}}
    P.raf=requestAnimationFrame(frame)};
  frame();
}
root.getElementById('grid').addEventListener('click',e=>{const b=e.target.closest('[data-play]');if(!b)return;const ri=+b.dataset.play;if(PLAY&&PLAY.ri===ri)stopPlay();else startPlay(ri)});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlay()});
root.getElementById('filters').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const ds=b.dataset;
  const was=PLAY&&PLAY.ri;stopPlay();
  if(ds.s){st.snd[ds.s]=!st.snd[ds.s]}else if(ds.v){st.speed=+ds.v}else if(ds.t){st.talas[ds.t]=!st.talas[ds.t]}else if(ds.c){st.chal=ds.c}else if(ds.l){st[ds.l]=!st[ds.l]}else if(ds.w){st.win=+ds.w}else if(ds.z){st.pps=+ds.z}
  save();render();if(was!=null&&(ds.s||ds.v||ds.l||ds.w||ds.z)&&root.getElementById('cell'+was))startPlay(was)});
render();
return { render, stopPlay, state: () => st, isPlaying: () => !!PLAY };
}
