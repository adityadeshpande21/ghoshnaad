// @ts-nocheck — moved from v1.1.0 (app.js) unchanged except that it receives esc / dvN / $; not fully typed yet.
// Drawing the score: one slot, one matra, one गण as HTML, and fitting a row of गण into the width available.
// Pure apart from fitRows, which measures the page. Every screen that shows notation draws it with these.

/** @param {{ esc: (s: unknown) => string, dvN: (n: number | string) => string, $: (sel: string) => Element }} deps */
export function makeScoreView({ esc, dvN, $ }) {
function slotHTML(s){
  let cls='s',inner=s.dev||(s.type==='hold'?'ऽ':s.type==='rest'?'–':'');
  if(s.type==='hold')cls+=' hold';if(s.type==='rest')cls+=' rest';
  if(s.type==='note'){if(s.octave<0)cls+=' dot-b';if(s.octave>0)cls+=' dot-t';if(s.vikrit)cls+=' vk'}
  if(s.slur==='start')cls+=' sls';else if(s.slur==='mid')cls+=' slm';else if(s.slur==='end')cls+=' sle';
  const pre=s.grace?s.grace.map(g=>`<span class="gr">${esc(g.dev)}</span>`).join(''):'';
  const mk=[];if(s.accent)mk.push('^');if(s.fermata)mk.push('→');if(s.swell==='grow')mk.push('<');if(s.swell==='fade')mk.push('>');
  return `<span class="${cls}">${mk.length?`<span class="ac">${mk.join('')}</span>`:''}${pre}${esc(inner)}</span>`}
function matraHTML(m){if(m.cue)return `<span class="cue">${esc(m.cue)}</span>`;
  const grp=m.group||(m.slots&&m.slots.length>1);return `<span class="mt${grp?' grp':''}">${(m.slots||[]).map(slotHTML).join('')}</span>`}
function ganHTML(g,k){
  // पहिला / दुसरा अंत: a bracket over the ending's गण, its number at the start
  const ve=g.seg&&g.seg[0]==='e',ve0=ve&&/\.0$/.test(g.addr),endMark=ve0?`<span class="end">${dvN(g.seg.slice(1))}</span>`:'';
  const vc=ve?` ve${ve0?' ve0':''}`:'';
  if(g.yati)return `<span class="g${vc}" data-a="${g.addr}">${endMark}<span class="yati">यति ${dvN(g.yati)}</span></span>`;
  return `<span class="g${vc}" data-a="${g.addr}">${endMark}${g.gats.map(gt=>`<span class="gat">${gt.matras.map(matraHTML).join('')}</span>`).join('')}</span>`}
function fitRows(root){(root||$('#score')).querySelectorAll('.pr').forEach(p=>{p.style.fontSize='';
  let size=parseFloat(getComputedStyle(p).fontSize);const over=()=>p.scrollWidth>p.clientWidth+1||[...p.children].some(g=>g.scrollWidth>g.clientWidth+1);
  while(size>9&&over()){size-=1;p.style.fontSize=size+'px'}})}
return { slotHTML, matraHTML, ganHTML, fitRows };
}
