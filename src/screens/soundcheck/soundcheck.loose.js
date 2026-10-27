// @ts-nocheck — moved from v1.1.0; not fully typed yet. `npm run typecheck` still fails on any unresolved shared name (tools/check-names.mjs).
// ध्वनी तपासणी: listen to every sound of the app, through the same engine the rachanas use.
// Melody instruments in every पट्टी, सप्तक and राग, with each variation; आनक bols; ताल वाद्ये; steps; a mix check.
// Nothing here changes the app's settings, except "keep this पट्टी" which the person taps on purpose.
import { Screen } from '../../ui/screen.js';
import { VOICES } from '../../audio/melodic.ts';
import * as Composer from '../../core/composer.ts';
import talasJson from '../../../rules/talas.json';

/** @param {import('../../ui/env.d.ts').AppEnv} env */
function createSoundCheck(env) {
const { tx, esc, dv, L, I18N, slotHTML, loadJSON, talaName, audio: A, player: PL, settings: ST } = env;
const $ = env.q;   // like v1.1.0: null when the element is absent
const LS = {
 mr: { s_open: 'ध्वनी तपासणी', s_title: 'ध्वनी तपासणी', s_stop: 'थांबवा', s_loop: '⟲ पुन्हा पुन्हा', s_laya: 'लय',
  s_tabs: ['स्वर वाद्ये', 'आनक', 'ताल वाद्ये', 'पावले', 'एकत्र'], s_inst: 'वाद्य', s_key: p => `पट्टी (सा) — ${p}`, s_keep: 'हीच पट्टी ठेवा', s_kept: 'सेटिंग्जमध्ये ठेवली',
  s_oct: ['मंद्र सप्तक', 'मध्य सप्तक', 'तार सप्तक'], s_shankhNote: 'शंख (बिगुल) फक्त ठळक स्वर वाजवतो; इतर स्वर तुलनेसाठी.', s_var: 'प्रकार', s_art: ['सांतर', 'निरंतर'], s_acc: '^ आघात', s_join: '( ) निरंतर',
  s_kan: 'कण स्वर', s_kanO: ['नाही', 'वरचा स्वर', 'खालचा स्वर'], s_swell: 'आवाज', s_swellO: ['सम', '< वाढ', '> घट'], s_len: 'लांबी', s_lenO: n => `${n} मात्रा`, s_ms: n => `${n} मि.से.`,
  s_seq: 'क्रम', s_saptak: 'सप्तक चढ-उतार', s_three: 'तीनही सप्तक', s_raga: 'राग: आरोह-अवरोह', s_ragaPick: 'राग निवडा', s_ab: 'तुलना (A → B)', s_none: 'नाही',
  s_tala: 'ताल', s_x4: '×४', s_ranan: 'रणन (८ पावले)', s_bols: { ta: 'तंकार', acc: 'आघात', flam: 'पूर्व-आघात', roll: 'त्र — रोल', trt: 'त्र + त', tha: 'दोन काठ्या', thra: 'दोन काठ्या + उसळी', click: 'काठी-ठोका' },
  s_tv: { pan: 'पणव', panS: 'पणव — सम', jh: 'झल्लरी', jhL: 'झल्लरी — मोठी', tr: 'त्रिभुज', trL: 'त्रिभुज — मोठा', count: 'अंक-ताल मोजणी', end: 'चरण-शेवट' },
  s_cycle: 'तालाचे आवर्तन', s_cycleP: 'दोन आवर्तने; खालील वाद्ये चालू / बंद करा.', s_steps: 'पावले', s_left: 'डावा', s_right: 'उजवा', s_march: 'संचलन (८ पावले)',
  s_mixP: 'एखादी रचना निवडून सर्व भाग एकत्र ऐका आणि भागांचा आवाज कमी-जास्त करून तोल तपासा. हे फक्त तपासणीसाठी — रचनांच्या वादनात बदल होत नाही.', s_mixPlay: 'रचना वाजवा ▶', s_mel: 'शंख / वंशी',
  s_parts: { anak: 'आनक', panav: 'पणव', jhallari: 'झल्लरी', tribhuj: 'त्रिभुज', steps: 'पावले' }, s_ios: 'आवाज येत नसल्यास फोनचा silent (मूक) मोड बंद करा.', s_dev: (k, l, n) => `ध्वनी यंत्र: ${k} kHz · स्पीकर विलंब ${l} मि.से. · उशिरा म्हणून सोडलेले आवाज: ${n}` },
 hi: { s_open: 'ध्वनि जाँच', s_title: 'ध्वनि जाँच', s_stop: 'रोकें', s_loop: '⟲ बार-बार', s_laya: 'लय',
  s_tabs: ['स्वर वाद्य', 'आनक', 'ताल वाद्य', 'कदम', 'एक साथ'], s_inst: 'वाद्य', s_key: p => `पट्टी (सा) — ${p}`, s_keep: 'यही पट्टी रखें', s_kept: 'सेटिंग्स में रखी',
  s_oct: ['मंद्र सप्तक', 'मध्य सप्तक', 'तार सप्तक'], s_shankhNote: 'शंख (बिगुल) केवल गाढ़े स्वर बजाता है; अन्य स्वर तुलना के लिए।', s_var: 'प्रकार', s_art: ['सांतर', 'निरंतर'], s_acc: '^ आघात', s_join: '( ) निरंतर',
  s_kan: 'कण स्वर', s_kanO: ['नहीं', 'ऊपर का स्वर', 'नीचे का स्वर'], s_swell: 'आवाज़', s_swellO: ['सम', '< बढ़ना', '> घटना'], s_len: 'लंबाई', s_lenO: n => `${n} मात्रा`, s_ms: n => `${n} मि.से.`,
  s_seq: 'क्रम', s_saptak: 'सप्तक आरोह-अवरोह', s_three: 'तीनों सप्तक', s_raga: 'राग: आरोह-अवरोह', s_ragaPick: 'राग चुनें', s_ab: 'तुलना (A → B)', s_none: 'नहीं',
  s_tala: 'ताल', s_x4: '×4', s_ranan: 'रणन (8 कदम)', s_bols: { ta: 'तंकार', acc: 'आघात', flam: 'पूर्व-आघात', roll: 'त्र — रोल', trt: 'त्र + त', tha: 'दो छड़ियाँ', thra: 'दो छड़ियाँ + उछाल', click: 'छड़ी-ठोका' },
  s_tv: { pan: 'पणव', panS: 'पणव — सम', jh: 'झल्लरी', jhL: 'झल्लरी — ज़ोर से', tr: 'त्रिभुज', trL: 'त्रिभुज — ज़ोर से', count: 'अंक-ताल गिनती', end: 'चरण-अंत' },
  s_cycle: 'ताल का आवर्तन', s_cycleP: 'दो आवर्तन; नीचे वाद्य चालू / बंद करें।', s_steps: 'कदम', s_left: 'बायाँ', s_right: 'दायाँ', s_march: 'संचलन (8 कदम)',
  s_mixP: 'कोई रचना चुनकर सभी भाग एक साथ सुनें और भागों की आवाज़ घटा-बढ़ाकर संतुलन जाँचें। यह केवल जाँच के लिए है — रचनाओं के वादन में बदलाव नहीं होता।', s_mixPlay: 'रचना बजाएँ ▶', s_mel: 'शंख / वंशी',
  s_parts: { anak: 'आनक', panav: 'पणव', jhallari: 'झल्लरी', tribhuj: 'त्रिभुज', steps: 'कदम' }, s_ios: 'आवाज़ न आए तो फ़ोन का silent मोड बंद करें।', s_dev: (k, l, n) => `ध्वनि यंत्र: ${k} kHz · स्पीकर विलंब ${l} मि.से. · देर से होने के कारण छोड़ी आवाज़ें: ${n}` },
 en: { s_open: 'Sound check', s_title: 'Sound check', s_stop: 'Stop', s_loop: '⟲ Loop', s_laya: 'tempo',
  s_tabs: ['Melody', 'आनक', 'Tala instruments', 'Steps', 'Together'], s_inst: 'Instrument', s_key: p => `Key (Sa) — ${p}`, s_keep: 'Keep this key', s_kept: 'Saved in settings',
  s_oct: ['Lower octave', 'Middle octave', 'Upper octave'], s_shankhNote: 'The शंख (bugle) plays only the bold swaras; the rest are for comparison.', s_var: 'Variations', s_art: ['Santar', 'Nirantar'], s_acc: '^ Accent', s_join: '( ) Nirantar',
  s_kan: 'Grace note', s_kanO: ['None', 'Swara above', 'Swara below'], s_swell: 'Volume', s_swellO: ['Even', '< Grow', '> Fade'], s_len: 'Length', s_lenO: n => `${n} matra`, s_ms: n => `${n} ms`,
  s_seq: 'Sequences', s_saptak: 'Up and down the saptak', s_three: 'All three octaves', s_raga: 'Raga: aroha-avaroha', s_ragaPick: 'Choose a raga', s_ab: 'Compare (A → B)', s_none: 'None',
  s_tala: 'Tala', s_x4: '×4', s_ranan: 'Ranan (8 steps)', s_bols: { ta: 'Tankar', acc: 'Accent', flam: 'Flam', roll: 'त्र — roll', trt: 'त्र + त', tha: 'Both sticks', thra: 'Both sticks + rebound', click: 'Stick click' },
  s_tv: { pan: 'पणव', panS: 'पणव — sam', jh: 'झल्लरी', jhL: 'झल्लरी — loud', tr: 'त्रिभुज', trL: 'त्रिभुज — loud', count: 'Count-in (अंक-ताल)', end: 'Charan end' },
  s_cycle: 'One tala cycle', s_cycleP: 'Two cycles; switch instruments on / off below.', s_steps: 'Steps', s_left: 'Left', s_right: 'Right', s_march: 'March (8 steps)',
  s_mixP: 'Pick a rachana, hear all parts together and move each part\'s volume to check the balance. For testing only — rachana playback is not changed.', s_mixPlay: 'Play rachana ▶', s_mel: 'शंख / वंशी',
  s_parts: { anak: 'आनक', panav: 'पणव', jhallari: 'झल्लरी', tribhuj: 'त्रिभुज', steps: 'Steps' }, s_ios: 'No sound? Turn off the phone\'s silent mode.', s_dev: (k, l, n) => `Audio device: ${k} kHz · speaker delay ${l} ms · sounds skipped as late: ${n}` }
};
for (const l in LS) Object.assign(I18N[l], LS[l]);

/* ---------- state ---------- */
const MEL_INST = { shankh: ['bugle', 'trumpet', 'melodica'], vanshi: ['flute', 'venu', 'clarinet', 'sax', 'melodica'] };
const KB = [['S', 0, 'स'], ['R', 1, 'री'], ['R', 0, 'री'], ['G', 1, 'ग'], ['G', 0, 'ग'], ['M', 0, 'म'], ['M', 1, 'म'], ['P', 0, 'प'], ['D', 1, 'ध'], ['D', 0, 'ध'], ['N', 1, 'नि'], ['N', 0, 'नि']];
const SHANKH_OK = new Set(['-1:S:0', '-1:P:0', '0:S:0', '0:G:0', '0:P:0', '0:N:1', '1:S:0']);
const ORDER = ['S', 'R', 'G', 'M', 'P', 'D', 'N'];
const st = { tab: 0, pk: 'vanshi', inst: 'flute', instB: null, keys: null, art: 'santar', acc: false, join: false, kan: 0, kanMs: 60, swell: 0, len: 1,
  tala: 'kerva', cyc: 'kerva', mute: {}, raga: '', mixId: 'shriram', mix: { mel: 1, anak: 1, panav: 1, jhallari: 1, tribhuj: 1, steps: 1 } };
let laya = 120, loopOn = false, ragas = null, saveArt = null, saveKan = null, ens = null, prev = null;
const md = () => 60 / laya;

/* ---------- playing ---------- */
let bus = null, timers = [], loopT = null;
function out() { A.unlock(); if (!bus) { bus = A.ctx.createGain(); bus.gain.value = 1; bus.connect(A.master); } return bus; }
function stopAll() {
  timers.forEach(clearTimeout); timers = []; clearTimeout(loopT); loopT = null;
  if (bus && A.ctx) { const o = bus; bus = null; o.gain.setTargetAtTime(0, A.ctx.currentTime, .015); setTimeout(() => { try { o.disconnect(); } catch (e) {} }, 300); }
  document.querySelectorAll('#lab .lab-on, #lab .foot.on').forEach(e => e.classList.remove('lab-on', 'on'));
  if (ens) { PL.stop(true); ens = null; }
}
// evs: [{ t: seconds from start, fn(at, out), el?, dur?, cls? }]
function run(evs, total, again) {
  A.announce();
  const o = out(), t0 = A.ctx.currentTime + .06, lat = (A.ctx.outputLatency || 0) + (A.ctx.baseLatency || 0);
  evs.forEach(e => {
    e.fn(t0 + e.t, o);
    if (e.el) { const c = e.cls || 'lab-on';
      timers.push(setTimeout(() => e.el.classList.add(c), (e.t + .06 + lat) * 1000));
      timers.push(setTimeout(() => e.el.classList.remove(c), (e.t + .06 + lat + Math.max(.12, e.dur || .2)) * 1000)); }
  });
  if (again && loopOn) loopT = setTimeout(() => { if (loopOn && !$('#lab').hidden) again(); }, total * 1000);
}

/* melody */
const keyHz = (pk, k) => { const d = ST.SA_DEF[pk]; return 440 * Math.pow(2, (k - 9) / 12 + (d.oct - 4)); };
const labSa = () => keyHz(st.pk, st.keys[st.pk]);
const voice = inst => ST.VOICE_OF[inst] || inst;
function noteObj(sw, vk, oct, dur, extra = {}) {
  const e = { swara: sw, vikrit: !!vk, octave: oct, dur, pk: st.pk, saHz: labSa(), accent: st.acc, ...extra };
  if (st.join) e.slur = 'mid';
  if (st.swell === 1) e.swell = 'grow'; else if (st.swell === 2) e.swell = 'fade';
  if (st.kan) { const i = ORDER.indexOf(sw), up = st.kan === 1; const j = up ? i + 1 : i - 1;
    e.grace = [{ type: 'note', swara: ORDER[(j + 7) % 7], octave: oct + (up && j > 6 ? 1 : !up && j < 0 ? -1 : 0) }]; }
  return e;
}
function withLab(fn) { ST.artic = st.art; ST.kanMs = st.kanMs; fn(); }
const keyEl = (oct, sw, vk) => document.querySelector(`#lab [data-k="${oct}:${sw}:${vk ? 1 : 0}"]`);
function tapKey(oct, sw, vk) {
  withLab(() => run([{ t: 0, dur: md() * st.len, el: keyEl(oct, sw, vk), fn: (at, o) => A.playNote(noteObj(sw, vk, oct, md() * st.len), at, o, voice(st.inst)) }], md() * st.len));
}
function playSeq(notes) {   // notes: [[sw, vk, oct, matras]]
  stopAll();
  const go = () => withLab(() => {
    const evs = []; let t = 0;
    const one = inst => notes.forEach(([sw, vk, oct, m]) => { const d = md() * m, tt = t;
      evs.push({ t: tt, dur: d, el: keyEl(oct, sw, vk), fn: (at, o) => A.playNote(noteObj(sw, vk, oct, d), at, o, voice(inst)) }); t += d; });
    one(st.inst); if (st.instB) { t += md() * 2; one(st.instB); }
    run(evs, t + md(), go);
  });
  go();
}
const saptak = () => { const up = ORDER.map(s => [s, 0, 0, 1]).concat([['S', 0, 1, 2]]); return up.concat(up.slice(0, -1).reverse().map((x, i) => [...x.slice(0, 3), i === 6 ? 2 : 1])); };
const three = () => { const up = []; [-1, 0].forEach(o => ORDER.forEach(s => up.push([s, 0, o, 1]))); ORDER.forEach(s => up.push([s, 0, 1, 1])); up.push(['S', 0, 2, 2]);
  return up.concat(up.slice(0, -1).reverse().map((x, i, a) => [...x.slice(0, 3), i === a.length - 1 ? 2 : 1])); };
function ragaSeq(name) {
  const r = (ragas || []).find(x => x.name === name); if (!r) return [];
  const toks = s => Composer.tokenize(s).map(Composer.parseToken).filter(p => p && p.kind === 'note').map(p => [p.swara, p.vikrit ? 1 : 0, p.oct, 1]);
  const a = toks(r.aroha), b = toks(r.avaroha); if (a.length) a[a.length - 1][3] = 2; if (b.length) b[b.length - 1][3] = 2;
  return a.concat(b);
}

/* आनक, ताल वाद्ये, steps */
const strokeObj = (stroke, extra = {}) => ({ type: 'stroke', stroke, dur: md(), matraDur: md(), tala: st.tala, ...extra });
const ANAK = [
  ['ta', 'त', () => strokeObj('ta')], ['acc', 'त^', () => strokeObj('ta', { accent: true })], ['flam', '`तत', () => strokeObj('ta', { grace: [{ type: 'stroke', stroke: 'ta' }] })],
  ['roll', 'त्र', () => strokeObj('roll')], ['trt', '`त्रत', () => strokeObj('ta', { grace: [{ type: 'stroke', stroke: 'roll' }] })],
  ['tha', 'थ', () => strokeObj('tha')], ['thra', 'थ्र', () => strokeObj('thra')], ['click', '+', () => strokeObj('click')]];
function tile(id, el, times) {
  const a = ANAK.find(x => x[0] === id); stopAll();
  const go = () => { const evs = []; for (let i = 0; i < times; i++) evs.push({ t: i * md(), dur: md() * .9, el, fn: (at, o) => A.playStroke(a[2](), at, o) }); run(evs, times * md(), go); };
  go();
}
function rananSeq(el) {
  stopAll();
  const go = () => { const m = md(), evs = [];
    // त्र ऽ | त – | त्र ऽ | त –  — with ताल वाद्ये (none on steps 4 and 8, the –) and steps
    [0, 4].forEach(b => { evs.push({ t: b * m, dur: 2 * m, el, fn: (at, o) => A.playStroke({ type: 'stroke', stroke: 'roll', dur: 2 * m, matraDur: m, tala: 'kerva' }, at, o) });
      evs.push({ t: (b + 2) * m, fn: (at, o) => A.playStroke({ type: 'stroke', stroke: 'ta', dur: m, matraDur: m, tala: 'kerva' }, at, o) }); });
    for (let s = 0; s < 8; s++) { const loud = s % 4 === 3, acc = s % 4 === 0;
      evs.push({ t: s * m, fn: (at, o) => { if (!loud) { A.panav(at, acc ? 1 : .72, o); A.jhal(at, acc ? 1 : .72, o); A.trib(at, acc ? 1 : .72, o); } A.footfall(at, s % 2 ? 'R' : 'L', o); } }); }
    run(evs, 8 * m, go); };
  go();
}
const TV = {
  pan: (at, o) => A.panav(at, .72, o), panS: (at, o) => A.panav(at, 1, o), jh: (at, o) => A.jhal(at, .72, o), jhL: (at, o) => A.jhal(at, 1.75, o),
  tr: (at, o) => A.trib(at, .72, o), trL: (at, o) => A.trib(at, 1.75, o) };
function tvTile(id, el) {
  stopAll(); const m = md();
  if (id === 'count') { const three = st.tala === 'dadra', n = three ? 6 : 4, cd = Math.min(1.4, Math.max(.4, m * (three ? 1 : 2))); run(Array.from({ length: n }, (_, k) => ({ t: k * cd, dur: cd * .8, el, fn: (at, o) => A.click(at, k % (three ? 3 : 2) ? .6 : 1, o) })), n * cd); return; }
  if (id === 'end') { const go = () => { const evs = []; for (let s = 0; s < 4; s++) { const last = s === 3;
      evs.push({ t: s * m, dur: m * .9, el, fn: (at, o) => { if (!last) A.panav(at, s ? .72 : 1, o); A.jhal(at, last ? 1.75 : s ? .72 : 1, o); A.trib(at, last ? 1.75 : s ? .72 : 1, o); A.footfall(at, s % 2 ? 'R' : 'L', o); } }); }
    run(evs, 4 * m, go); }; go(); return; }
  const go = () => run([{ t: 0, dur: .5, el, fn: TV[id] }], Math.max(.8, m * 2), go); go();
}
function talaDef(k) { return talasJson.talas[k] || null; }
const TALA_LAYA = { kerva: 120, khemta: 360, dadra: 120, jhaptal: 240, rupak: 210, ektal: 120, tritaal: 240 };
function cycle() {
  stopAll(); const T = talaDef(st.cyc); if (!T) return;
  const beats = new Set(T.talVadya.variants[T.talVadya.default].beats), sm = T.steps && T.steps.matrasPerStep;
  const go = () => { const m = md(), evs = []; let step = 0;
    for (let c = 0; c < 2; c++) for (let b = 1; b <= T.cycle; b++) {
      const t = ((c * T.cycle) + b - 1) * m, cell = document.querySelector(`#lab [data-beat="${b}"]`), acc = b === 1;
      evs.push({ t, dur: m * .9, el: cell, fn: (at, o) => {
        if (beats.has(b)) { const v = acc ? 1 : .72; if (!st.mute.panav) A.panav(at, v, o); if (!st.mute.jhallari) A.jhal(at, v, o); if (!st.mute.tribhuj) A.trib(at, v, o); }
        if (sm && (b - 1) % sm === 0 && !st.mute.steps) A.footfall(at, (step++) % 2 ? 'R' : 'L', o);
      } });
    }
    run(evs, 2 * T.cycle * m, go); };
  go();
}
function march() {
  stopAll();
  const go = () => { const m = md(), evs = [];
    for (let s = 0; s < 8; s++) { const f = s % 2 ? 'R' : 'L'; evs.push({ t: s * m, dur: m * .8, el: document.querySelector('#labF' + f), cls: 'on', fn: (at, o) => A.footfall(at, f, o) }); }
    run(evs, 8 * m, go); };
  go();
}

/* एकत्र: a real rachana through the player engine, with per-part volume for testing */
async function playMix() {
  stopAll();
  let piece; try { piece = await loadJSON('data/r/' + st.mixId + '.json'); } catch (e) { return; }
  if (!prev) prev = { P: PL.P, key: PL.curKey, show: !$('#player').hidden };
  PL.loadPiece(piece); PL.SEL = new Set(Object.keys(piece.parts)); applyMix(); PL.build(); PL.start(0, false); ens = true;
}
function applyMix() {
  PL.MIX = {}; ['shankh', 'vanshi'].forEach(k => PL.MIX[k] = st.mix.mel); ['anak', 'panav', 'jhallari', 'tribhuj', 'steps'].forEach(k => PL.MIX[k] = st.mix[k]);
  if (A.ctx) Object.entries(A.gains).forEach(([k, g]) => g.gain.setTargetAtTime(A.on(k) ? A.mixOf(k) : 0, A.ctx.currentTime, .03));
}

/* ---------- view ---------- */
const NOTE = (dev, oct, vk) => `<span class="gd-n">${slotHTML({ type: 'note', dev, octave: oct, vikrit: !!vk })}</span>`;
const SM = src => `<span class="gd-n">${env.sample(src)}</span>`;
function westName(f) { const m = 69 + 12 * Math.log2(f / 440), r = Math.round(m); return ST.SA_KEYS[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1); }
const chips = (items, cur, attr) => `<div class="lab-chips">${items.map(([v, l]) => `<button data-${attr}="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join('')}</div>`;
function render() {
  $('#labT').textContent = tx('s_title'); $('#labStopT').textContent = tx('s_stop'); $('#labLayaL').textContent = tx('s_laya');
  $('#labLoop').textContent = tx('s_loop'); $('#labLoop').setAttribute('aria-pressed', loopOn); $('#labLaya').textContent = dv(laya);
  $('#labTabs').innerHTML = L().s_tabs.map((t, i) => `<button role="tab" data-ltab="${i}" aria-selected="${st.tab === i}">${esc(t)}</button>`).join('');
  $('#labSub').textContent = st.tab === 0 ? `${tx('groups')[st.pk]} · ${ST.SA_KEYS[st.keys[st.pk]]}${ST.SA_DEF[st.pk].oct}` : '';
  $('#labBody').innerHTML = [melody, anak, talv, steps, mix][st.tab]();
  devLine();
}
function melody() {
  const nm = id => ST.INST_NAMES[id][L().romanNames ? 1 : 0];
  const instChips = ['shankh', 'vanshi'].map(pk => `<span class="note">${esc(tx('groups')[pk])}</span>` + chips(MEL_INST[pk].map(id => [pk + ':' + id, esc(nm(id))]), st.pk + ':' + st.inst, 'linst')).join('');
  const saHz = labSa();
  const kb = [-1, 0, 1].map((oct, oi) => `<div class="lab-oct"><span>${esc(L().s_oct[oi])}</span><div class="lab-kb ${st.pk}">${KB.map(([sw, vk, dev]) => {
    const f = A.hz({ swara: sw, vikrit: !!vk, octave: oct, saHz }) * Math.pow(2, (VOICES[voice(st.inst)] || {}).oct || 0), k = `${oct}:${sw}:${vk}`;
    const cls = [vk ? 'vk' : '', st.pk === 'shankh' ? (SHANKH_OK.has(k) ? 'ok' : 'dim') : ''].join(' ');
    return `<button class="${cls}" data-k="${k}">${NOTE(dev, oct, vk)}<small>${westName(f)}</small><small>${Math.round(f)}</small></button>`; }).join('')}</div></div>`).join('');
  const rg = (ragas || []).map(r => `<option value="${esc(r.name)}" ${r.name === st.raga ? 'selected' : ''}>${esc(L().romanNames ? (ST.RAGA_ROM[r.name] || r.name) : r.name)}</option>`).join('');
  return `<div class="lab-grp"><b>${esc(tx('s_inst'))}</b>${instChips}</div>
  <div class="lab-grp"><b>${esc(tx('s_key', tx('groups')[st.pk]))}</b><div class="lab-keys">${ST.SA_KEYS.map((k, i) => `<button data-lkey="${i}" aria-pressed="${i === st.keys[st.pk]}">${k}</button>`).join('')}</div>
    ${st.keys[st.pk] !== ST.saKeys[st.pk] ? `<div class="lab-row"><button class="lb-btn main" id="labKeep">${esc(tx('s_keep'))}</button></div>` : ''}</div>
  ${kb}
  ${st.pk === 'shankh' ? `<span class="lab-hint">${esc(tx('s_shankhNote'))}</span>` : ''}
  <div class="lab-grp"><b>${esc(tx('s_var'))}</b>
    ${chips([['santar', esc(L().s_art[0])], ['nirantar', esc(L().s_art[1])]], st.art, 'lart')}
    <div class="lab-chips"><button data-ltog="acc" aria-pressed="${st.acc}">${esc(tx('s_acc'))}</button><button data-ltog="join" aria-pressed="${st.join}">${esc(tx('s_join'))}</button></div>
    <span class="note">${esc(tx('s_kan'))}</span>${chips(L().s_kanO.map((l, i) => [i, esc(l)]), st.kan, 'lkan')}
    <div class="lab-row"><input type="range" id="labKanMs" min="20" max="160" step="5" value="${st.kanMs}" aria-label="${esc(tx('s_kan'))}"><span class="num" id="labKanV">${esc(tx('s_ms', dv(st.kanMs)))}</span></div>
    <span class="note">${esc(tx('s_swell'))}</span>${chips(L().s_swellO.map((l, i) => [i, esc(l)]), st.swell, 'lsw')}
    <span class="note">${esc(tx('s_len'))}</span>${chips([1, 2, 4].map(n => [n, esc(tx('s_lenO', dv(n)))]), st.len, 'llen')}</div>
  <div class="lab-grp"><b>${esc(tx('s_seq'))}</b>
    <div class="lab-seq"><button class="cbig sm" data-lseq="saptak">${esc(tx('s_saptak'))}</button><button class="cbig sm alt" data-lseq="three">${esc(tx('s_three'))}</button></div>
    <div class="lab-row"><select id="labRaga" aria-label="${esc(tx('s_ragaPick'))}"><option value="">${esc(tx('s_ragaPick'))}</option>${rg}</select><button class="cbig sm alt" data-lseq="raga" ${st.raga ? '' : 'disabled'}>${esc(tx('s_raga'))}</button></div>
    <span class="note">${esc(tx('s_ab'))}</span>${chips([['', esc(tx('s_none'))]].concat(MEL_INST[st.pk].filter(i => i !== st.inst).map(id => [id, 'B: ' + esc(nm(id))])), st.instB || '', 'lab')}</div>
  <span class="lab-hint">${esc(tx('s_ios'))}</span>`;
}
function anak() {
  const T = id => { const a = ANAK.find(x => x[0] === id); return `<div class="lab-tile" role="button" tabindex="0" data-lbol="${id}">${SM(a[1])}<small>${esc(L().s_bols[id])}</small><button class="x4" data-lx4="${id}">${esc(tx('s_x4'))}</button></div>`; };
  return `<div class="lab-grp"><b>${esc(tx('s_tala'))}</b>${chips([['kerva', 'केरवा'], ['khemta', 'खेमटा']], st.tala, 'ltala')}</div>
  <div class="lab-tiles">${ANAK.map(a => T(a[0])).join('')}<div class="lab-tile" role="button" tabindex="0" data-lranan="1">${SM('त्र ऽ त –')}<small>${esc(tx('s_ranan'))}</small></div></div>`;
}
function talv() {
  const T = talaDef(st.cyc), TT = (id, sym) => `<div class="lab-tile" role="button" tabindex="0" data-ltv="${id}">${sym}<small>${esc(L().s_tv[id])}</small></div>`;
  const tv = s => `<span class="gd-n tv">${env.sample(s)}</span>`;
  const talas = ['kerva', 'khemta', 'dadra', 'jhaptal', 'rupak', 'ektal', 'tritaal'].filter(talaDef).map(k => [k, esc(talaName(talaDef(k).name.dev))]);
  const beats = T ? new Set(T.talVadya.variants[T.talVadya.default].beats) : new Set();
  return `<div class="lab-tiles">${TT('pan', tv('ध्व'))}${TT('panS', tv('ध्व^'))}${TT('jh', tv('झ'))}${TT('jhL', tv('झ^'))}${TT('tr', tv('ट'))}${TT('trL', tv('ट^'))}${TT('count', `<span class="gd-t">${st.tala === 'dadra' ? 'एक दो तीन · एक दो तीन' : 'एक दो · एक दो'}</span>`)}${TT('end', tv('ध्व ध्व ध्व झ^'))}</div>
  <div class="lab-grp"><b>${esc(tx('s_cycle'))}</b><span class="note">${esc(tx('s_cycleP'))}</span>${chips(talas, st.cyc, 'lcyc')}
    ${T ? `<div class="lab-kb" style="grid-template-columns:repeat(${Math.min(T.cycle, 12)},minmax(0,1fr))">${Array.from({ length: T.cycle }, (_, i) => `<button data-beat="${i + 1}" style="min-height:44px;color:var(--tv)">${beats.has(i + 1) ? tv(i === 0 ? 'ध्व^' : 'ध्व') : `<span class="gd-n" style="color:var(--dim)">ऽ</span>`}<small>${dv(i + 1)}</small></button>`).join('')}</div>` : ''}
    <div class="lab-chips">${['panav', 'jhallari', 'tribhuj', 'steps'].map(k => `<button data-lmute="${k}" aria-pressed="${!st.mute[k]}">${esc(L().s_parts[k])}</button>`).join('')}</div>
    <div class="lab-seq"><button class="cbig sm" data-lcycplay="1">▶ ${esc(tx('s_cycle'))}</button></div></div>`;
}
function steps() {
  return `<div class="lab-feet"><div class="foot" id="labFL">${esc(tx('s_left'))}</div><div class="foot" id="labFR">${esc(tx('s_right'))}</div></div>
  <div class="lab-tiles"><div class="lab-tile" role="button" tabindex="0" data-lfoot="L"><span class="gd-t">${esc(tx('s_left'))}</span></div><div class="lab-tile" role="button" tabindex="0" data-lfoot="R"><span class="gd-t">${esc(tx('s_right'))}</span></div>
  <div class="lab-tile" role="button" tabindex="0" data-lmarch="1"><span class="gd-t">${esc(tx('s_march'))}</span></div></div>`;
}
function mix() {
  const opts = (PL.BOOK || []).map(r => `<option value="${r.id}" ${r.id === st.mixId ? 'selected' : ''}>${esc(L().romanNames ? r.rom : r.dev)}</option>`).join('');
  const row = (k, l) => `<span>${esc(l)}</span><input type="range" min="0" max="1.5" step="0.05" value="${st.mix[k]}" data-lmix="${k}"><span class="num" id="labMix_${k}">${Math.round(st.mix[k] * 100)}%</span>`;
  return `<p class="lab-hint">${esc(tx('s_mixP'))}</p>
  <div class="lab-row"><select id="labMixR">${opts}</select><button class="cbig sm" data-lmixplay="1">${esc(tx('s_mixPlay'))}</button></div>
  <div class="lab-mix">${row('mel', tx('s_mel'))}${['anak', 'panav', 'jhallari', 'tribhuj', 'steps'].map(k => row(k, L().s_parts[k])).join('')}</div>`;
}

/* device check: sample rate, the speaker's delay, and sounds skipped because they would have been late */
let devT = null;
function devLine() {
  const el = $('#labDev'); if (!el) return;
  if (!A.ctx) { el.textContent = ''; return; }
  const lat = Math.round(((A.ctx.outputLatency || 0) + (A.ctx.baseLatency || 0)) * 1000);
  el.textContent = tx('s_dev', dv(Math.round(A.ctx.sampleRate / 100) / 10), dv(lat), dv(PL.LATE));
}

/* ---------- events ---------- */
$('#labTabs').addEventListener('click', e => { const b = e.target.closest('[data-ltab]'); if (!b) return; stopAll(); st.tab = +b.dataset.ltab; render(); });
$('#labStop').onclick = stopAll;
$('#labLoop').onclick = () => { loopOn = !loopOn; if (!loopOn) clearTimeout(loopT); $('#labLoop').setAttribute('aria-pressed', loopOn); };
function setLaya(d) { laya = Math.max(40, Math.min(600, laya + d * (laya >= 300 ? 15 : 5))); $('#labLaya').textContent = dv(laya); }
$('#labLd').onclick = () => setLaya(-1); $('#labLu').onclick = () => setLaya(1);
$('#labBody').addEventListener('input', e => {
  if (e.target.id === 'labKanMs') { st.kanMs = +e.target.value; $('#labKanV').textContent = tx('s_ms', dv(st.kanMs)); }
  if (e.target.dataset.lmix) { const k = e.target.dataset.lmix; st.mix[k] = +e.target.value; $('#labMix_' + k).textContent = Math.round(st.mix[k] * 100) + '%'; if (ens) applyMix(); }
});
$('#labBody').addEventListener('change', e => {
  if (e.target.id === 'labRaga') { st.raga = e.target.value; render(); }
  if (e.target.id === 'labMixR') st.mixId = e.target.value;
});
$('#labBody').addEventListener('click', e => {
  const t = e.target.closest('[data-k],[data-linst],[data-lkey],[data-lart],[data-ltog],[data-lkan],[data-lsw],[data-llen],[data-lseq],[data-lab],[data-ltala],[data-lbol],[data-lx4],[data-lranan],[data-ltv],[data-lcyc],[data-lmute],[data-lcycplay],[data-lfoot],[data-lmarch],[data-lmixplay],#labKeep');
  if (!t) return; const d = t.dataset;
  if (t.id === 'labKeep') { ST.setSaKey(st.pk, st.keys[st.pk]); render(); return; }
  if (d.k) { const [o, sw, vk] = d.k.split(':'); tapKey(+o, sw, +vk); return; }
  if (d.linst) { const [pk, id] = d.linst.split(':'); st.pk = pk; st.inst = id; if (st.instB && !MEL_INST[pk].includes(st.instB)) st.instB = null; render(); return; }
  if (d.lkey) { st.keys[st.pk] = +d.lkey; render(); withLab(() => run(['S', 'G', 'P'].map((s, i) => ({ t: i * .3, fn: (at, o) => A.playNote(noteObj(s, 0, 0, .28), at, o, voice(st.inst)) })).concat([{ t: .9, fn: (at, o) => A.playNote(noteObj('S', 0, 1, .5), at, o, voice(st.inst)) }]), 1.4)); return; }
  if (d.lart) { st.art = d.lart; render(); return; }
  if (d.ltog) { st[d.ltog] = !st[d.ltog]; render(); return; }
  if (d.lkan) { st.kan = +d.lkan; render(); return; }
  if (d.lsw) { st.swell = +d.lsw; render(); return; }
  if (d.llen) { st.len = +d.llen; render(); return; }
  if (d.lab !== undefined) { st.instB = d.lab || null; render(); return; }
  if (d.lseq) { playSeq(d.lseq === 'saptak' ? saptak() : d.lseq === 'three' ? three() : ragaSeq(st.raga)); return; }
  if (d.ltala) { st.tala = d.ltala; render(); return; }
  if (d.lx4) { e.stopPropagation(); tile(d.lx4, t.closest('.lab-tile'), 4); return; }
  if (d.lbol) { tile(d.lbol, t, 1); return; }
  if (d.lranan) { rananSeq(t); return; }
  if (d.ltv) { tvTile(d.ltv, t); return; }
  if (d.lcyc) { st.cyc = d.lcyc; laya = TALA_LAYA[d.lcyc] || 120; stopAll(); render(); return; }
  if (d.lmute) { st.mute[d.lmute] = !st.mute[d.lmute]; render(); return; }
  if (d.lcycplay) { cycle(); return; }
  if (d.lfoot) { run([{ t: 0, dur: .3, el: document.querySelector('#labF' + d.lfoot), cls: 'on', fn: (at, o) => A.footfall(at, d.lfoot, o) }], .4); return; }
  if (d.lmarch) { march(); return; }
  if (d.lmixplay) { playMix(); return; }
});

/* ---------- open / close ---------- */
async function open(tab) {
  if (PL.S.playing) PL.stop(true);
  if (!st.keys) st.keys = { ...ST.saKeys };
  if (!ragas) { try { ragas = (await loadJSON('data/composer.json')).ragas || []; } catch (e) { ragas = []; } }
  saveArt = ST.artic; saveKan = ST.kanMs; st.art = ST.artic; st.kanMs = ST.kanMs;
  if (tab != null) st.tab = tab;
  if (!$('#sheet').hidden) $('#sheet').hidden = true;
  $('#lab').hidden = false; A.unlock(); render(); clearInterval(devT); devT = setInterval(devLine, 1000);
}
function close() {
  clearInterval(devT); stopAll(); PL.MIX = {}; if (saveArt) ST.artic = saveArt; if (saveKan) ST.kanMs = saveKan;
  if (prev) { const p = prev; prev = null; if (p.P && p.show) PL.showPiece(p.P, { key: p.key }); else if (p.P) PL.loadPiece(p.P); else PL.P = null; }
  $('#lab').hidden = true;
}
$('#labBack').onclick = close;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#lab').hidden) close(); });
document.addEventListener('click', e => { const b = e.target.closest('[data-labopen]'); if (b) { e.preventDefault(); open(b.dataset.labopen === '' ? null : +b.dataset.labopen); } });

return { open, close, stopAll, lang() { if (!$('#lab').hidden) render(); } };
}

export class SoundCheckScreen extends Screen {
  /** @param {import('../../ui/env.d.ts').AppEnv} env */
  constructor(env) { super(env, '#lab'); this.lab = createSoundCheck(env); }
  open(tab) { return this.lab.open(tab); }
  close() { this.lab.close(); }
  onLang() { this.lab.lang(); }
  onStopAll() { this.lab.stopAll(); }
}
