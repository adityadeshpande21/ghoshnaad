// Finds marks of the score that collide on a phone: runs inside the page and looks at every note drawn by slotHTML / ganHTML.
//
// The marks are boxes. Dots are ::before / ::after of a note, so their geometry is read from the computed style of the pseudo-element; the accent, the
// grace notes, the ending number are elements; the slur (a line along the top of the note), the komal underline and the bracket of a group `[ … ]`
// are lines, modelled from the note's box. Two marks of different kinds that overlap by more than a hair collide; a mark that lands on the glyph of
// another note collides too; two glyphs that overlap, or a note that sticks out of its गण, are reported as well.
//
// Returns [{ kind, what, text }] for the page as drawn now.
export function scanMarks(opts) {
  const MIN_AREA = opts.minArea ?? 0.6;                                      // px²: touching edges are not a collision
  const out = [];
  const R = r => ({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  const area = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const px = v => parseFloat(v) || 0;
  const roots = [...document.querySelectorAll(opts.selector)];
  const label = s => (s.textContent || '').replace(/[ \s]+/g, '').slice(0, 6);
  const glyphBox = s => {                                                      // the note's own text, without accent and grace
    const tn = [...s.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).pop();
    if (!tn) return null;
    const rg = document.createRange(); rg.selectNodeContents(tn);
    const r = rg.getBoundingClientRect();
    if (!r.width) return null;
    // left and right from the text; top and bottom from the note's line box (inside its padding): a text range is as tall as the font's whole content area
    const b = s.getBoundingClientRect(), cs = getComputedStyle(s);
    return { l: r.left, r: r.right, t: b.top + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop), b: b.bottom - parseFloat(cs.paddingBottom) };
  };
  const marksOf = s => {
    const m = [], sb = s.getBoundingClientRect(), cs = getComputedStyle(s), g = glyphBox(s);
    const fs = px(cs.fontSize);
    const dot = (pseudo, kind) => {
      const p = getComputedStyle(s, pseudo);
      if (p.content === 'none' || p.position !== 'absolute') return;
      const w = px(p.width), h = px(p.height), left = px(p.left) + px(p.marginLeft);
      const y = pseudo === '::before' ? sb.top + px(cs.borderTopWidth) + px(p.top) : sb.bottom - px(cs.borderBottomWidth) - px(p.bottom) - h;       // from the padding edge, inside the borders
      m.push({ kind, box: { l: sb.left + left, t: y, r: sb.left + left + w, b: y + h } });
    };
    if (s.classList.contains('dot-t')) dot('::before', 'dot-top');
    if (s.classList.contains('dot-b')) dot('::after', 'dot-bottom');
    if (s.classList.contains('vk') && g) {                                      // text-decoration underline: below the baseline by the offset
      const off = px(cs.textUnderlineOffset) || fs * 0.1, th = px(cs.textDecorationThickness) || 1.5;
      m.push({ kind: 'underline', box: { l: g.l, r: g.r, t: sb.bottom - 1 + (off - 4), b: sb.bottom - 1 + (off - 4) + th + 1 } });
    }
    if (/\b(sls|slm|sle)\b/.test(s.className)) m.push({ kind: 'slur', box: { l: sb.left, r: sb.right, t: sb.top, b: sb.top + 1.5 } });
    // an accent's box is the note's width, but its text may be wider: measure the ink of the text itself
    // (left and right from the text; top and bottom from the mark's own line box, as a text range is as tall as the font's whole content area)
    const ink = el => { const rg = document.createRange(); rg.selectNodeContents(el); const t = rg.getBoundingClientRect(), b = el.getBoundingClientRect(); return { l: t.left, r: t.right, t: b.top, b: b.bottom }; };
    const ac = s.querySelector(':scope > .ac'); if (ac) m.push({ kind: 'accent', box: ink(ac) });
    s.querySelectorAll(':scope > .gr').forEach(gr => m.push({ kind: 'grace', box: R(gr.getBoundingClientRect()) }));
    return { marks: m, glyph: g, box: R(sb) };
  };
  for (const root of roots) {
    for (const gan of root.querySelectorAll('.g')) {
      const gb = gan.getBoundingClientRect();
      const slots = [...gan.querySelectorAll('.s')].map(s => ({ s, ...marksOf(s) }));
      const endNum = gan.querySelector(':scope > .end');
      const brackets = [...gan.querySelectorAll('.mt.grp')].map(mt => { const b = mt.getBoundingClientRect(); return { kind: 'bracket', box: { l: b.left, r: b.right, t: b.bottom - 3, b: b.bottom } }; });
      let extra = endNum ? [{ kind: 'ending-number', box: R(endNum.getBoundingClientRect()) }] : [];
      // the marks of a whole group, drawn once over it (each symbol measured on its own)
      for (const mk of gan.querySelectorAll('.mk')) { const cell = mk.getBoundingClientRect(); for (const i of mk.querySelectorAll('i')) { const rg = document.createRange(); rg.selectNodeContents(i); const t = rg.getBoundingClientRect(); extra.push({ kind: 'accent', box: { l: t.left, r: t.right, t: cell.top, b: cell.bottom } }); } }
      // marks against marks of other kinds, and against the glyph of any note but their own
      const all = [...slots.flatMap(x => x.marks.map(m => ({ ...m, owner: x }))), ...brackets.map(m => ({ ...m, owner: null })), ...extra.map(m => ({ ...m, owner: null }))];
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        if (a.kind === b.kind && a.kind !== 'accent' && a.kind !== 'dot-top' && a.kind !== 'dot-bottom') continue;          // slurs of neighbours touch on purpose
        if (area(a.box, b.box) > MIN_AREA) out.push({ kind: 'marks', what: `${a.kind} × ${b.kind}`, text: (a.owner || b.owner) ? label((a.owner || b.owner).s) : label(gan) });
      }
      for (const m of all) for (const x of slots) if (x !== m.owner && x.glyph && m.kind !== 'slur' && m.kind !== 'bracket' && area(m.box, x.glyph) > MIN_AREA * 2)
        out.push({ kind: 'mark-on-glyph', what: `${m.kind} on the ${label(x.s)} next to it`, text: label(m.owner ? m.owner.s : gan) });
      // glyphs against glyphs
      for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i].glyph, b = slots[j].glyph;
        if (a && b && Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 3) out.push({ kind: 'glyphs', what: `${label(slots[i].s)} overlaps ${label(slots[j].s)}`, text: label(gan) });
      }
      // notes that stick out of their गण
      for (const x of slots) if (x.box.l < gb.left - 1.5 || x.box.r > gb.right + 1.5) out.push({ kind: 'overflow', what: `${label(x.s)} sticks out of its गण by ${Math.round(Math.max(gb.left - x.box.l, x.box.r - gb.right))}px`, text: label(gan) });
    }
  }
  return out;
}
