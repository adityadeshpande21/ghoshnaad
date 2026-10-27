// @ts-nocheck — moved from v1.1.0; not fully typed yet. `npm run typecheck` still fails on any unresolved shared name (tools/check-names.mjs).
// A tiny renderer for notation samples: it parses a few signs and draws them with the player's own matra drawing.

const STROKES = { 'त्र': 'roll', 'थ्र': 'thra', 'त': 'ta', 'थ': 'tha', '+': 'click', 'ध्व': 'dhvam', 'झ': 'jham', 'ट': 'tam' };
const SW = { 'स': 'S', 'री': 'R', 'ग': 'G', 'म': 'M', 'प': 'P', 'ध': 'D', 'नि': 'N' };
const SYMS = ['ध्व', 'त्र', 'थ्र', 'री', 'नि', 'स', 'ग', 'म', 'प', 'ध', 'त', 'थ', 'झ', 'ट', '+', 'ऽ', '–'];
function readSym(s, i) {
  for (const k of SYMS) if (s.startsWith(k, i)) {
    i += k.length; let o;
    if (SW[k]) { o = { type: 'note', dev: k, swara: SW[k], octave: 0 }; while (/[.'_]/.test(s[i] || '')) { if (s[i] === '.') o.octave--; else if (s[i] === "'") o.octave++; else o.vikrit = true; i++; } }
    else if (k === 'ऽ') o = { type: 'hold' }; else if (k === '–') o = { type: 'rest' };
    else o = { type: 'stroke', dev: k, stroke: STROKES[k] };
    for (;;) { const c = s[i]; if (c === '^') o.accent = true; else if (c === '!') o.fermata = true; else if (c === '<') o.swell = 'grow'; else if (c === '>') o.swell = 'fade'; else break; i++; }
    return [o, i];
  }
  return [null, i + 1];
}
/** Draw a sample in the book notation as the player draws it. @param {string} src */
export const makeSample = (matraHTML) => function sample(src) {
  const out = []; let i = 0, slurOn = false, lastSlot = null, group = null, grace = null;
  const add = sl => { if (grace) { sl.grace = grace; grace = null; } if (slurOn) { sl.slur = lastSlot && lastSlot.slur ? 'mid' : 'start'; } lastSlot = sl; if (group) group.push(sl); else out.push({ m: { slots: [sl] } }); };
  while (i < src.length) {
    const c = src[i];
    if (c === ' ') { i++; continue; }
    if (c === '[') { group = []; i++; continue; }
    if (c === ']') { out.push({ m: { slots: group, group: true } }); group = null; i++; continue; }
    if (c === '(') { slurOn = true; lastSlot = null; i++; continue; }
    if (c === ')') { if (lastSlot) lastSlot.slur = 'end'; slurOn = false; i++; continue; }
    if (c === '|' || c === ',') { out.push({ bar: c }); i++; continue; }
    if (c === '`') { const [o, j] = readSym(src, i + 1); grace = [o]; i = j; continue; }
    const [o, j] = readSym(src, i); if (o) add(o); i = j;
  }
  return out.map(x => x.bar ? `<span class="gd-bar">${x.bar}</span>` : matraHTML(x.m)).join('');
};
