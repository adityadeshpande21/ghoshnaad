// @ts-nocheck — moved from v1.1.0 with its shared names replaced by the services below; not fully typed yet.
// घोषदंड संकेत page: learn the 8 signals (शिका) and watch a full cycle with real sound (पूर्ण आवर्तन).
// The figure is src/screens/ghoshdand/figure; every sound comes from the app's engine, scheduled by the shared Transport.
import { Screen } from '../../ui/screen.js';
import { Transport } from '../../audio/transport.ts';
import { buildTimeline3 } from '../../core/timeline/timeline3.ts';
import { Figure } from './figure.loose.js';
import './texts.js';                      // the words of the signals, from src/content

/** @param {import('../../ui/env.d.ts').AppEnv} env */
function createGhoshdand(env) {
const { esc, dv, loadJSON, audio: A, player: PL } = env;
const $ = env.q;   // like v1.1.0: null when the element is absent
const SK = Figure;
const tk = (k, params) => env.i18n.t('ghoshdand.' + k, params);
const T = x => SK.T(x, env.i18n.chain());
const n = x => dv(x);
let tab = 0, view = 'front';
try { const v = localStorage.getItem('ghosh.skView'); if (v) view = v; } catch (e) {}

/* ---------- the engine: a list of timed sounds + a frame function, one at a time; the shared Transport does the scheduling ---------- */
const E = { items: [], end: 0, playing: false, pos: 0, raf: 0, bus: null, frame: null, speed: 1 };
const TR2 = new Transport(A.engine, {
  dispatch: (it, at) => { try { it.fn(at, bus()); } catch (e) {} },
  onEnd: () => { E.pos = E.end; halt(true); paint(); setBtn(); },
  onInterrupt: () => { halt(true); setBtn(); },          // a call or the lock screen took the sound: pause here
});
function bus() { A.unlock(); if (!E.bus) { E.bus = A.ctx.createGain(); E.bus.gain.value = 1; E.bus.connect(A.master); } return E.bus; }
function lat() { return A.outLat(); }
function now() { return E.playing ? Math.max(0, TR2.position() - lat()) : E.pos; }
function play(from = 0) {
  halt(true); A.unlock();
  A.announce();
  if (PL.S.playing) PL.stop();
  env.app().get('soundcheck').onStopAll();
  TR2.load(E.items, E.end); TR2.start({ from, lead: .1 });
  E.playing = true; E.raf = requestAnimationFrame(loop); env.wake(true);
  setBtn();
}
function loop() { if (!E.playing) return; paint(); E.raf = requestAnimationFrame(loop); }
function halt(keep) {
  if (E.playing) E.pos = now();
  E.playing = false; TR2.halt(); cancelAnimationFrame(E.raf);
  if (E.bus && A.ctx) { const o = E.bus; E.bus = null; o.gain.setTargetAtTime(0, A.ctx.currentTime, .015); setTimeout(() => { try { o.disconnect(); } catch (e) {} }, 300); }
  if (!keep) E.pos = 0;
}
function paint() { if (E.frame) E.frame(Math.min(now(), E.end)); }
function setBtn() { const b = document.querySelector('#sk .sk-pp'); if (b) b.textContent = E.playing ? tk('play') : tk('resume'); }
function stopAll() { halt(true); setBtn(); }

/* app sounds */
const tv = (at, o, v = .72) => { A.panav(at, v, o, .5); A.jhal(at, v, o, .5); A.trib(at, v, o, .5); };
const dd = (at, o, d) => { A.panav(at, 1, o, .3); A.panav(at + Math.max(.16, d * .45), 1, o, .3); };

/* ---------- shared bits ---------- */
const fig = (pose, label) => {
  if (!pose) return '';
  return SK.svg(pose, { view: view === 'front' ? 'front' : 'pramukh', label }) + SK.svg(pose, { view: 'side', label }).replace('<svg ', '<svg class="side" ');
};
const draw = st => SK.draw(st, { view: view === 'front' ? 'front' : 'pramukh' }) + SK.draw(st, { view: 'side' }).replace('<svg ', '<svg class="side" ');
function card(st, code, full = true) {
  const ph = st.ph || 'base';
  return `<article class="sk-card"><div class="sk-stage"><span class="sk-tag">${code}</span>${fig(st.pose, T(st.label) || T(SK.PH[ph]))}</div>
  <div class="sk-cb"><div class="sk-top2"><span class="sk-ph ph-${ph}">${esc(T(SK.PH[ph]))}</span>${st.label ? `<b>${esc(T(st.label))}</b>` : ''}${st.count ? `<span class="sk-cnt">${st.count}</span>` : ''}</div>
  ${full && st.book ? `<p class="sk-book" lang="hi">${esc(st.book)}</p>` : ''}${full && SK.FLAGS[st.pose] && st.pose !== 'daksh' ? `<div class="sk-flag">${esc(T(SK.FLAGS[st.pose]))}</div>` : ''}</div></article>`;
}

/* ---------- शिका: the 8 signals ---------- */
let cur = null;   // { id, i } — the signal animation showing
function renderLearn() {
  const L = [...tk('letters')];            // the letters that label the steps
  let h = `<div class="sk-rules"><b>${esc(tk('rules'))}</b><ol>${SK.RULES.map(r => `<li>${esc(T(r))}</li>`).join('')}</ol></div>`;
  SK.SIGNALS.forEach(sg => {
    const num = sg.n ? n(sg.n) : n(0);
    let inner;
    if (sg.seq) inner = `<div class="sk-seq">${sg.seq.map((st, i) => st.pose ? card(st, num + L[i], false) : `<div class="sk-gap"><span class="sk-cnt">${st.count}</span>${esc(T(st.label))}</div>`).join('')}</div>`;
    else inner = `<div class="sk-cards">${sg.steps.map((st, i) => card(st, sg.n ? num + L[i] : num)).join('')}</div>`;
    const meta = [sg.when ? `<span><b>${esc(tk('when'))}:</b> ${esc(T(sg.when))}</span>` : '', sg.does ? `<span><b>${esc(tk('does'))}:</b> ${esc(T(sg.does))}</span>` : ''].join('');
    const plays = sg.anim ? `<div class="sk-plays">${sg.anim.map((a, i) => `<button class="lb-btn" data-skp="${sg.id}:${i}" aria-pressed="false">▶ ${esc(T(a.label))}</button>`).join('')}</div><div data-skslot="${sg.id}"></div>` : '';
    h += `<section class="sk-sig" id="sk-${sg.id}"><div class="sk-sh"><span class="sk-num">${num}</span><h3>${esc(T(sg.name))}</h3><span class="sk-pg">${esc(tk('page', { page: n(sg.page) }))}</span></div>${meta ? `<div class="sk-meta">${meta}</div>` : ''}${plays}${inner}</section>`;
  });
  $('#skBody').innerHTML = h;
  if (cur) openSignal(cur.id, cur.i, true);
}
function playerHTML(strip, extra = '') {
  return `<div class="sk-player"><div class="sk-pst"><div class="sk-bubble" hidden></div><div class="sk-f"></div><div class="sk-s"></div></div>
   <div class="sk-pin"><div class="sk-now"><span class="sk-big">${n(0)}</span><span class="sk-foot">—</span><span class="sk-blk"></span><span class="sk-mus"></span></div>
   <div class="sk-cap" aria-live="polite"></div>${extra}<div class="sk-strip">${strip}</div><div class="sk-key">${esc(tk('key'))}</div>
   <div class="sk-ctl"><button class="lb-btn sk-pp">${esc(tk('play'))}</button><button class="lb-btn sk-rp">${esc(tk('again'))}</button><button class="lb-btn sk-sp" aria-pressed="${E.speed < 1}">${esc(tk('slow'))}</button>${tab === 0 ? `<button class="lb-btn sk-cl">${esc(tk('close'))}</button>` : ''}</div></div></div>`;
}
function scaleTL(tl, f) { return { T: tl.T.map(x => x == null ? x : x / f), D: tl.D.map(x => x == null ? x : x / f), end: tl.end / f }; }
function openSignal(id, i, keepTime) {
  const was = keepTime ? now() : 0; halt();
  document.querySelectorAll('#skBody [data-skslot]').forEach(s => s.innerHTML = '');
  const sg = SK.SIGNALS.find(x => x.id === id), a = sg.anim[i], tl = scaleTL(SK.timeline(a), E.speed), m = a.march || [0, -1];
  cur = { id, i };
  const sigC = new Set(a.pose.slice(1).map(x => x[0]));
  const strip = Array.from({ length: a.n }, (_, j) => { const k = j + 1, mm = k >= m[0] && k <= m[1]; return `<span data-k="${k}" class="${mm ? 'm' : ''}${sigC.has(k) ? ' sig' : ''}">${n(k)}<small>${mm ? (k % 2 ? tk('L') : tk('R')) : '·'}</small></span>`; }).join('');
  const slot = document.querySelector(`[data-skslot="${id}"]`); slot.innerHTML = playerHTML(strip);
  document.querySelectorAll('#skBody [data-skp]').forEach(b => b.setAttribute('aria-pressed', b.dataset.skp === id + ':' + i));
  // sounds: a footfall on every step, the ताल वाद्ये while वादन is on, ध्वंकार-द्वय where the signal calls for it, a soft count when standing
  const items = [];
  for (let k = 1; k <= a.n; k++) {
    const at = tl.T[k], mm = k >= m[0] && k <= m[1], mus = a.music && k >= a.music[0] && k <= a.music[1];
    if (mm) items.push({ t: at, fn: (x, o) => A.footfall(x, k % 2 ? 'L' : 'R', o) });
    else items.push({ t: at, fn: (x, o) => A.click(x, .25, o) });
    if (mus) items.push({ t: at, fn: (x, o) => tv(x, o, k % 2 ? .85 : .65) });
    if (a.dd && a.dd.includes(k)) items.push({ t: at + .001, fn: (x, o) => dd(x, o, tl.D[k]) });
  }
  E.items = items.sort((p, q) => p.t - q.t); E.end = tl.end;
  let last = -1;
  E.frame = t => {
    const f = SK.frameAt(a, tl, t), q = c => slot.querySelector(c);
    q('.sk-f').innerHTML = SK.draw(f.state, { view: view === 'front' ? 'front' : 'pramukh' });
    q('.sk-s').innerHTML = SK.draw(f.state, { view: 'side' });
    if (f.count === last) return; last = f.count;
    q('.sk-big').textContent = n(f.count);
    const ft = q('.sk-foot'); ft.className = 'sk-foot' + (f.marching ? (f.count % 2 ? ' L' : ' R') : ''); ft.textContent = f.count ? (f.marching ? (f.count % 2 ? tk('left') : tk('right')) : tk('still')) : '—';
    q('.sk-mus').className = 'sk-mus sk-band'; q('.sk-mus').innerHTML = f.music == null ? '' : `<span class="${f.music ? 'k-play' : ''}">${esc(f.music ? tk('music') : tk('silent'))}</span>`;
    q('.sk-cap').textContent = f.note ? T(f.note[1]) : '';
    slot.querySelectorAll('.sk-strip span').forEach(s => s.classList.toggle('on', +s.dataset.k === f.count));
  };
  wire(slot, () => openSignal(id, i));
  E.pos = was; paint();
  if (!keepTime) play(0); else setBtn();
}
function wire(root, rebuild) {
  const q = c => root.querySelector(c);
  q('.sk-pp').onclick = () => { if (E.playing) { halt(true); setBtn(); } else play(E.pos >= E.end - .05 ? 0 : E.pos); };
  q('.sk-rp').onclick = () => play(0);
  q('.sk-sp').onclick = e => { E.speed = E.speed < 1 ? 1 : .5; rebuild(); };
  const cl = q('.sk-cl'); if (cl) cl.onclick = () => { halt(); cur = null; root.innerHTML = ''; document.querySelectorAll('#skBody [data-skp]').forEach(b => b.setAttribute('aria-pressed', 'false')); };
}

/* ---------- पूर्ण आवर्तन: स्थिर → प्रचल → रणन + श्रीराम → रचना बदल → रणन + केदार → स्तभ् → वादनान्त ---------- */
let CY = null;   // built cycle
const PARTS = ['shankh', 'vanshi', 'anak', 'panav', 'jhallari', 'tribhuj', 'steps'];
function soundOf(k, e) {
  if (e.type === 'rest' || e.type === 'hold') return null;
  if (e.type === 'step') return (x, o) => A.footfall(x, e.foot, o);
  const v = e.loud ? 1.75 : e.accent ? 1 : .72;
  if (e.stroke === 'dhvam' || e.stroke === 'jham' || e.stroke === 'tam') { const ml = e.dur ? Math.max(.2, e.dur * 1.5) : 0; const f = e.stroke === 'dhvam' ? A.panav : e.stroke === 'jham' ? A.jhal : A.trib; return (x, o) => f(x, v, o, ml); }
  if (e.type === 'stroke') return (x, o) => A.playStroke(e, x, o);
  if (e.type === 'note') { const vs = A.voicesFor(k); return (x, o) => vs.forEach(vc => A.playNote({ ...e, pk: k }, x, o, vc)); }
  return null;
}
function withOrder(p, perf) { return { ...p, rhythm: { ...p.rhythm, performance: perf } }; }
async function buildCycle(speed) {
  const [pS0, pK0] = await Promise.all([loadJSON('data/r/shriram.json'), loadJSON('data/r/kedar.json')]);
  const pS = withOrder(pS0, [{ id: 'r', times: 1 }, { id: 'c1', times: 1 }, { id: 'c2', times: 2 }]);
  const pK = withOrder(pK0, [{ id: 'r', times: 1 }, { id: 'c1', times: 2 }]);
  const tlOf = (p, k) => p.parts[k] ? buildTimeline3(p, k, { tempo: speed, order: 'performance' }) : null;
  const TS = {}, TK = {}; PARTS.forEach(k => { TS[k] = tlOf(pS, k); TK[k] = tlOf(pK, k); });
  const md = 60 / (120 * speed);                       // one step
  const stepsOf = (tl, off) => tl.beats.filter(b => b.step).map(b => ({ t: off + b.t, foot: b.step, charan: b.charan, pass: b.pass, key: b.key }));
  const verbal = [.25, 1.9].map(x => x / speed);       // spoken commands before the counts
  const c1 = 4 / speed;                                 // first standing count
  const t0S = c1 + 6 * md, t0K = t0S + TS.steps.total;
  const stS = stepsOf(TS.steps, t0S), stK = stepsOf(TK.steps, t0K);
  // counts: 6 standing (the प्रमुख's own count), every step of both rachanas, then two standing counts at the end
  const Tm = [null], D = [null];
  for (let i = 0; i < 6; i++) Tm.push(c1 + i * md);
  const steps = [...stS, ...stK]; steps.forEach(s => Tm.push(s.t));
  const endMusic = t0K + TK.steps.total;
  Tm.push(endMusic); Tm.push(endMusic + md);
  for (let k = 1; k < Tm.length; k++) D[k] = k > 1 ? Tm[k] - Tm[k - 1] : md;
  const N = Tm.length - 1, idxAtT = t => { let best = 1; for (let k = 1; k <= N; k++) if (Math.abs(Tm[k] - t) < Math.abs(Tm[best] - t)) best = k; return best; };
  const MARCH0 = 7;
  // where each charan pass starts, from the lead part's beats
  const passStart = (tl, off, ch, pass) => { const b = tl.beats.find(x => x.charan === ch && x.pass === pass); return b ? off + b.t : null; };
  const lastGan = (tl, off, ch, pass) => {   // start of the last गण of a pass
    const bs = tl.beats.filter(x => x.charan === ch && x.pass === pass && x.key); if (!bs.length) return null;
    const ganOf = b => b.key.split('.').slice(0, 3).join('.'); const g = ganOf(bs[bs.length - 1]); return off + bs.find(b => ganOf(b) === g).t;
  };
  const cS = pS.rhythm.charans, cK = pK.rhythm.charans;
  const nS = id => cS.find(c => c.id === id).n, nK = id => cK.find(c => c.id === id).n;
  const sPr = passStart(TS.shankh, t0S, nS('c1'), 1), sC1 = passStart(TS.shankh, t0S, nS('c2'), 1), sC2 = passStart(TS.shankh, t0S, nS('c2'), 2);
  const lgS = lastGan(TS.shankh, t0S, nS('c2'), 2);
  const kC1 = passStart(TK.vanshi, t0K, nK('c1'), 1), kC2 = passStart(TK.vanshi, t0K, nK('c1'), 2), lgK = lastGan(TK.vanshi, t0K, nK('c1'), 2);
  // वाद्यनिर्देश सहित वादनान्त: 16 counts, count 15 on the start of the last गण
  const A15 = idxAtT(lgS), A1 = A15 - 14;
  // स्तभ्: notice on the 7th step of केदार's first pass, execute on a right foot after ≥4 counts, then left, right joins
  const B0 = idxAtT(kC1) + 6; let B1 = B0 + 5; if (B1 % 2) B1++; const HALT = B1 + 2;
  // वादनान्त while standing: execute on the last गण of the second pass, notice 6 counts before
  const C1 = idxAtT(lgK), C0 = C1 - 6;
  const pose = [[1, 'daksh'], [2, 'prachal1', .6], [6, 'prachal2'], [8, 'carry', .7],
    [A1, 'vanshi', .6], [A1 + 10, 'vadananta1', 2], [A1 + 14, 'vadananta2'], [A1 + 16, 'carry', .7],
    [B0, 'stambh1'], [B1, 'stambh2'], [HALT + 1, 'daksh', .7],
    [C0, 'vadananta1'], [C1, 'vadananta2'], [N, 'daksh', .7]];
  const sigCounts = new Set([2, 6, A1, A1 + 10, A1 + 14, B0, B1, C0, C1]);
  const ddAt = [A1 - 1, B0 - 1, C0 - 1];
  const tr = (mr, hi, en) => ({ mr, hi, en });
  const sK = idxAtT(t0K);
  const ranS4 = MARCH0 + 3, ranK4 = sK + 3;
  const caps = [
    [0, tr('घोष स्थिर, दक्ष', 'घोष स्थिर, दक्ष', 'The band stands at दक्ष')],
    [verbal[0], tr('मौखिक आज्ञा: «घोष सिद्ध» — ताल वाद्ये सिद्ध', 'मौखिक आज्ञा: «घोष सिद्ध» — ताल वाद्य सिद्ध', 'Spoken: «घोष सिद्ध» — drums ready'), 'pramukh', '«घोष सिद्ध»'],
    [verbal[1], tr('«शंख-दल, रचना श्रीराम»', '«शंख-दल, रचना श्रीराम»', '«शंख-दल, रचना श्रीराम»'), 'pramukh', '«शंख-दल, रचना श्रीराम»'],
    [Tm[1], tr('आता घोषदंडाने — मौखिक आज्ञा संपल्या', 'अब घोषदंड से — मौखिक आज्ञाएँ समाप्त', 'From here on, only the staff')],
    [Tm[2], tr('प्रचल पूर्वसूचना — किमान ४ अंक', 'प्रचल पूर्वसूचना — कम से कम ४ अंक', 'प्रचल: advance notice — at least 4 counts')],
    [Tm[6], tr('पालनार्थ — उजव्या अंकावर', 'पालनार्थ — दाहिने अंक पर', 'Execute — on a right count')],
    [Tm[MARCH0], tr('डाव्या पायाने प्रचल; रणन सुरू — शंख-वादक सिद्ध', 'बाएं पैर से प्रचल; रणन आरंभ — शंख-वादक सिद्ध', 'Step off with the left; the रणन starts — शंख players ready')],
    [Tm[ranS4], tr('दोन रणनांमधील यतीत दल प्रमुख: «श्रीराम»', 'दो रणनों के बीच की यति में दल प्रमुख: «श्रीराम»', 'In the rest between the two रणन: «श्रीराम»'), 'dal', '«श्रीराम»'],
    [sPr, tr('श्रीराम — प्रारंभिक', 'श्रीराम — प्रारंभिक', 'श्रीराम — प्रारंभिक')],
    [sC1, tr('श्रीराम — चरण १', 'श्रीराम — चरण १', 'श्रीराम — charan 1')],
    [Tm[A1 - 1], tr('पणवावर ध्वंकार-द्वय — प्रमुखाकडे पाहा', 'पणव पर ध्वंकार-द्वय — प्रमुख की ओर देखें', 'पणव double stroke — look at the प्रमुख')],
    [Tm[A1], tr('१–८: वाद्यनिर्देश — वंशी', '१–८: वाद्यनिर्देश — वंशी', '1–8: instrument — वंशी')],
    [Tm[A1 + 8], tr('९–१०: हात बदलणे', '९–१०: हाथ बदलना', '9–10: change hands')],
    [Tm[A1 + 10], tr('११–१४: वादनान्त सूचना', '११–१४: वादनान्त सूचना', '11–14: stop — notice')],
    [Tm[A1 + 14], tr('१५: पालनार्थ — शेवटच्या गणाच्या सुरुवातीला', '१५: पालनार्थ — अंतिम गण के आरंभ में', '15: execute — at the start of the last gan')],
    [Tm[A1 + 15], tr('१६: अंतर — शंख चरणाच्या शेवटी थांबतो', '१६: अंतर — शंख चरण के अंत पर रुकता है', '16: gap — the शंख stops at the charan end')],
    [t0K, tr('रणन — वंशी-वादक सिद्ध', 'रणन — वंशी-वादक सिद्ध', 'रणन — वंशी players ready')],
    [Tm[ranK4], tr('यतीत दल प्रमुख: «केदार»', 'यति में दल प्रमुख: «केदार»', 'In the rest: «केदार»'), 'dal', '«केदार»'],
    [kC1, tr('केदार — चरण १', 'केदार — चरण १', 'केदार — charan 1')],
    [Tm[B0 - 1], tr('ध्वंकार-द्वय', 'ध्वंकार-द्वय', 'पणव double stroke')],
    [Tm[B0], tr('स्तभ् सूचना — किमान ४ अंक', 'स्तभ् सूचना — कम से कम ४ अंक', 'Halt: notice — at least 4 counts')],
    [Tm[B1], tr('पालनार्थ — उजवा पाय पुढे येताना', 'पालनार्थ — दाहिना पैर आगे आते समय', 'Execute — as the right foot comes forward')],
    [Tm[B1 + 1], tr('डावा पाय पुढे', 'बायां पैर आगे', 'Left foot forward')],
    [Tm[HALT], tr('उजवा जोडला — स्तभ्. वादन चालूच', 'दाहिना मिलाया — स्तभ्। वादन जारी', 'Right joins — halted. Playing goes on')],
    [Tm[C0 - 1], tr('ध्वंकार-द्वय', 'ध्वंकार-द्वय', 'पणव double stroke')],
    [Tm[C0], tr('वादनान्त सूचना (स्थिर) — किमान ४ अंक', 'वादनान्त सूचना (स्थिर) — कम से कम ४ अंक', 'Stop: notice (standing) — at least 4 counts')],
    [Tm[C1], tr('पालनार्थ — शेवटच्या गणाच्या सुरुवातीला', 'पालनार्थ — अंतिम गण के आरंभ में', 'Execute — at the start of the last gan')],
    [endMusic, tr('चरण संपला: वादन थांबले. घोष स्थिर', 'चरण समाप्त: वादन रुका। घोष स्थिर', 'Charan ends: playing stops. The band stands still')],
  ].sort((a, b) => a[0] - b[0]);
  const chap = [0, Tm[1], t0S, sPr, Tm[A1 - 1], t0K, kC1, Tm[C0 - 1]];
  // sounds
  const items = [];
  PARTS.forEach(k => {
    [[TS[k], t0S], [TK[k], t0K]].forEach(([tl, off]) => { if (!tl) return;
      tl.sounds.forEach(e => { const t = off + e.t; if (k === 'steps' && t > Tm[HALT] + .01) return; const fn = soundOf(k, e); if (fn) items.push({ t, fn }); }); });
  });
  for (let k = 1; k < MARCH0; k++) items.push({ t: Tm[k], fn: (x, o) => A.click(x, .22, o) });
  for (let k = HALT + 1; k <= N; k++) if (Tm[k] > endMusic - .01) items.push({ t: Tm[k], fn: (x, o) => A.click(x, .22, o) });
  ddAt.forEach(k => items.push({ t: Tm[k] + .002, fn: (x, o) => dd(x, o, md) }));
  items.sort((a, b) => a.t - b.t);
  // what the big number shows for each count
  const info = [null];
  for (let k = 1; k <= N; k++) {
    let blk = 'count', no = k, pass = 1;
    if (k >= MARCH0 && k - MARCH0 < steps.length) { const s = steps[k - MARCH0], own = steps.filter(x => x.t <= s.t + 1e-6 && x.t >= (k - MARCH0 < stS.length ? t0S : t0K) - 1e-6);
      const ch = s.charan, ps = s.pass; const same = own.filter(x => x.charan === ch && x.pass === ps); no = same.length; pass = ps;
      const cid = (k - MARCH0 < stS.length ? cS : cK).find(c => c.n === ch); blk = ch === 0 ? 'ranan' : cid && cid.type === 'prarambhik' ? 'pr' : 'ch'; }
    else if (k > MARCH0) { blk = 'end'; no = k - (MARCH0 + steps.length) + 1; }
    const sig = k >= A1 && k <= A1 + 15 ? k - A1 + 1 : null;
    info.push({ blk, no, pass, sig });
  }
  const a = { n: N, march: [MARCH0, HALT], pose };
  return { a, tl: { T: Tm, D, end: Tm[N] + md + .6 / speed }, items, caps, chap, info, sigCounts, MARCH0, HALT, t0S, t0K, sPr, kC1, endMusic, endS: t0K, A1, B1, C1, lgS, lgK, speed };
}
function bandHTML(c, t) {
  const st = (a, b, c2, d) => t >= c2 && t < d ? 'k-play' : t >= a && t < b ? 'k-ready' : '';
  const anak = st(CY.caps[1][0], CY.t0S, CY.t0S, CY.endMusic), shankh = st(CY.t0S, CY.sPr, CY.sPr, CY.endS), vanshi = st(CY.t0K, CY.kC1, CY.kC1, CY.endMusic);
  const mv = t >= CY.tl.T[CY.MARCH0] - .05 && t < CY.tl.T[CY.HALT] + .05;
  const B = new Proxy({}, { get: (_, k) => tk('band.' + k) }), R = ` · ${tk('ready')}`;
  const chip = (k, s) => `<span class="${s}">${esc(B[k])}${s === 'k-ready' ? esc(R) : ''}</span>`;
  return chip('anak', anak) + chip('shankh', shankh) + chip('vanshi', vanshi) + chip('tal', anak) + `<span class="${mv ? 'k-mv' : ''}">${esc(mv ? B.march : B.stand)}</span>`;
}
async function renderCycle() {
  halt(); cur = null;
  $('#skBody').innerHTML = `<p class="sk-intro">${esc(tk('cycIntro'))}</p><div id="skCyc"><p class="sk-intro">${esc(tk('loading'))}</p></div>`;
  try { CY = await buildCycle(E.speed); } catch (e) { $('#skCyc').innerHTML = `<p class="sk-intro">${esc(tk('err'))}</p>`; return; }
  const ch = new Proxy({}, { get: (_, i) => tk('chap.' + i) });
  const chapH = `<div class="sk-chap">${CY.chap.map((t, i) => `<button data-skc="${i}"><i></i>${esc(ch[i])}</button>`).join('')}</div>`;
  $('#skCyc').innerHTML = playerHTML('', `<div class="sk-band"></div>${chapH}`);
  const root = $('#skCyc'), q = c => root.querySelector(c);
  q('.sk-strip').remove(); q('.sk-key').remove();
  E.items = CY.items; E.end = CY.tl.end;
  let lastK = -1, lastCap = -1;
  E.frame = t => {
    const f = SK.frameAt(CY.a, CY.tl, t);
    q('.sk-f').innerHTML = SK.draw(f.state, { view: view === 'front' ? 'front' : 'pramukh' });
    q('.sk-s').innerHTML = SK.draw(f.state, { view: 'side' });
    let ci = -1; CY.caps.forEach((c, i) => { if (t >= c[0] - .01) ci = i; });
    if (ci !== lastCap) { lastCap = ci; const c = CY.caps[ci] || CY.caps[0];
      q('.sk-cap').textContent = T(c[1]);
      const bb = q('.sk-bubble'); if (c[2]) { bb.hidden = false; bb.innerHTML = `<span><small>${esc(c[2] === 'dal' ? tk('dal') : tk('pramukh'))}</small>${esc(c[3])}</span>`; } else bb.hidden = true; }
    q('.sk-band').innerHTML = bandHTML(CY, t);
    CY.chap.forEach((c0, i) => { const c1 = i + 1 < CY.chap.length ? CY.chap[i + 1] : CY.tl.end; const b = root.querySelector(`[data-skc="${i}"]`); const p = Math.max(0, Math.min(1, (t - c0) / (c1 - c0)));
      b.classList.toggle('on', t >= c0 && t < c1); b.firstChild.style.width = (p * 100).toFixed(1) + '%'; });
    if (f.count === lastK) return; lastK = f.count;
    const inf = CY.info[f.count] || { blk: 'count', no: 0 };
    q('.sk-big').textContent = n(inf.no || 0);
    const ft = q('.sk-foot'); ft.className = 'sk-foot' + (f.marching ? (f.count % 2 ? ' L' : ' R') : ''); ft.textContent = f.count ? (f.marching ? (f.count % 2 ? tk('left') : tk('right')) : tk('still')) : '—';
    const BL = new Proxy({}, { get: (_, k) => tk('blk.' + k) });
    q('.sk-blk').innerHTML = f.count ? `<b>${esc(BL[inf.blk])}${esc((inf.pass > 1 ? tk('pass') : ''))}</b>${inf.sig ? `<span class="sk-sigc">${esc(tk('sig', { n: n(inf.sig), total: n(16) }))}</span>` : ''}` : '';
  };
  wire(root, () => renderCycle());
  root.querySelector('.sk-chap').onclick = e => { const b = e.target.closest('[data-skc]'); if (b) play(CY.chap[+b.dataset.skc]); };
  E.pos = 0; paint(); setBtn(); q('.sk-pp').textContent = tk('resume');
}

/* ---------- page ---------- */
function renderTop() {
  $('#skT').textContent = tk('title'); $('#skStopT').textContent = tk('stop');
  $('#skTabs').innerHTML = [0, 1].map(i => tk('tabs.' + i)).map((x, i) => `<button role="tab" data-sktab="${i}" aria-selected="${i === tab}">${esc(x)}</button>`).join('');
  $('#skView').innerHTML = [0, 1].map(i => tk('views.' + i)).map((x, i) => `<button data-skv="${i ? 'back' : 'front'}" aria-pressed="${(i ? 'back' : 'front') === view}">${esc(x)}</button>`).join('');
}
function render() { renderTop(); if (tab === 0) renderLearn(); else renderCycle(); }
let from = null;
function open(t) {
  from = !$('#player').hidden ? 'player' : 'list';
  if (!$('#sheet').hidden) $('#sheet').hidden = true;
  if (PL.S.playing) PL.stop();
  if (t != null) tab = +t;
  $('#sk').hidden = false; render(); $('#skBody').scrollTop = 0;
}
function close() { halt(); cur = null; $('#sk').hidden = true; }
$('#skBack').onclick = close;
$('#skStop').onclick = () => { halt(true); setBtn(); };
$('#skTabs').addEventListener('click', e => { const b = e.target.closest('[data-sktab]'); if (!b) return; halt(); cur = null; tab = +b.dataset.sktab; render(); $('#skBody').scrollTop = 0; });
$('#skView').addEventListener('click', e => { const b = e.target.closest('[data-skv]'); if (!b) return; view = b.dataset.skv; try { localStorage.setItem('ghosh.skView', view); } catch (x) {}
  renderTop(); if (tab === 0) { const keep = cur; const pos = now(), was = E.playing; renderLearn(); if (keep && was) play(pos); } else { paint(); } });
$('#skBody').addEventListener('click', e => { const b = e.target.closest('[data-skp]'); if (!b) return; const [id, i] = b.dataset.skp.split(':'); E.speed = E.speed || 1; openSignal(id, +i); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sk').hidden) close(); });
document.addEventListener('click', e => { const b = e.target.closest('[data-sanket]'); if (b) { e.preventDefault(); open(b.dataset.sanket || null); } });

return { open, close, stopAll, busy: () => E.playing, lang() { if (!$('#sk').hidden) { const p = E.playing; halt(true); render(); } }, _cycle: () => CY, _E: E };
}

export class GhoshdandScreen extends Screen {
  /** @param {import('../../ui/env.d.ts').AppEnv} env */
  constructor(env) { super(env, '#sk'); this.page = createGhoshdand(env); }
  open(arg) { return this.page.open(arg); }
  close() { this.page.close(); }
  onLang() { this.page.lang(); }
  onStopAll() { this.page.stopAll(); }
  isBusy() { return this.page.busy(); }
}
