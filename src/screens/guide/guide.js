// @ts-check
// स्वरलिपी मार्गदर्शक: every notation sign and marking used in the app, for all instruments, with the sign drawn exactly
// as the player draws it, how it is typed (editor / files), and how the app plays it.
import { Screen } from '../../ui/screen.js';
import { makeSample } from './sample.loose.js';
import { parseGuide } from '../../content/guide.ts';
import content from 'virtual:languages/content';     // src/content/<lang>/guide.md for every language that has one

/** @typedef {{ id: string, t: string, p?: string[], ex?: string[], rows?: string[][], table?: { head: string[], rows: string[][] }, note?: string }} GuideSection */
/** @typedef {{ title: string, intro: string, head: string[], s: GuideSection[] }} GuideText the guide as it is drawn: the sign of each row is already HTML */

export class GuideScreen extends Screen {
  /** @param {import('../../ui/env.d.ts').AppEnv} env */
  constructor(env) {
    super(env, '#guide');
    const { esc } = env;
    /** @type {(src: string) => string} */
    this.sample = /** @type {any} */ (makeSample(env.matraHTML));   // draw a sample in the book notation
    const N = (/** @type {string} */ src, cls = '') => `<span class="gd-n ${cls}">${this.sample(src)}</span>`;
    const T = (/** @type {string} */ s) => `<span class="gd-t">${esc(s)}</span>`;   // a sign shown as plain text (bar lines, cues …)
    /** the guide of each language, from src/content/<lang>/guide.md
     * @type {Record<string, GuideText>} */
    this.content = Object.fromEntries(Object.entries(content.guide).map(([lang, md]) => {
      const g = parseGuide(md, `${lang}/guide.md`);
      return [lang, { ...g, s: g.s.map(({ rows, ex, ...s }) => ({ ...s, ...(ex ? { ex } : {}), ...(rows ? { rows: rows.map(([g, ...r]) => [g.kind === 'T' ? T(g.src) : N(g.src, g.cls), ...r]) } : {}) })) }];
    }));

    const $ = env.$;
    this.listen($('#gdBack'), 'click', () => this.close());
    this.listen($('#gdToc'), 'click', (/** @type {Event} */ e) => { const b = /** @type {HTMLElement} */ (e.target).closest('[data-gd]'); if (b) this.go(/** @type {HTMLElement} */ (b).dataset.gd); });
    this.listen(document, 'keydown', (/** @type {Event} */ e) => { if (/** @type {KeyboardEvent} */ (e).key === 'Escape' && this.isOpen) this.close(); });
    // any element marked data-guide opens the guide, at the section it names
    this.listen(document, 'click', (/** @type {Event} */ e) => {
      const b = /** @type {HTMLElement} */ (e.target).closest('[data-guide]');
      if (b) { e.preventDefault(); this.open(/** @type {HTMLElement} */ (b).dataset.guide || null); }
    });
  }

  /** the guide in the language, or in the first language of its fallback chain that has one */
  get text() { const c = this.env.i18n.chain().find(l => this.content[l]); return this.content[c || 'mr']; }

  /** @param {string | null} [section] a section id to jump to */
  open(section) {
    const $ = this.env.$;
    if (!$('#sheet').hidden) $('#sheet').hidden = true;
    super.open(section);
    if (!section) $('#gdBody').scrollTop = 0;
  }

  /** @param {string | null} [jump] */
  render(jump) {
    const { $, esc, i18n } = this.env, G = this.text;
    $('#gdT').textContent = G.title;
    $('#gdToc').innerHTML = G.s.map(s => `<button data-gd="${s.id}">${esc(s.t)}</button>`).join('');
    let h = `<p class="gd-intro">${esc(G.intro)}</p>`;
    G.s.forEach(s => {
      h += `<section class="gd-sec" id="gd-${s.id}"><h3>${esc(s.t)}</h3>`;
      (s.p || []).forEach(p => { h += `<p>${p}</p>`; });
      if (s.ex) h += `<div class="gd-ex"><span class="gd-n big r-vanshi">${this.sample(s.ex[0].replace(/॥ॐ॥/, ''))}</span><small>${esc(s.ex[1])}</small></div>`;
      if (s.rows) h += `<div class="gd-rows">${s.rows.map(r => this.rowHTML(r)).join('')}</div>`;
      if (s.table) h += `<div class="gd-tw"><table class="gd-tab"><thead><tr>${s.table.head.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${s.table.rows.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      if (s.note) h += `<p class="gd-note">${s.note}</p>`;
      const lab = /** @type {Record<string, number>} */ ({ swar: 0, anak: 1, tal: 2, steps: 3 })[s.id];
      if (lab != null && this.env.hasSoundLab()) h += `<p><button class="lb-btn main" data-labopen="${lab}">▶ ${esc(i18n.t('soundcheck.open'))}</button></p>`;
      h += '</section>';
    });
    $('#gdBody').innerHTML = h;
    if (jump) setTimeout(() => this.go(jump), 30);
  }

  /** @param {string[]} r [drawn sign, how it is written, name, meaning, how the app plays it] */
  rowHTML(r) {
    const { esc } = this.env;
    return `<div class="gd-row"><div class="gd-sym">${r[0]}</div><div class="gd-txt"><b>${esc(r[2])}</b>${r[1] && r[1] !== '—' ? ` <code>${esc(r[1])}</code>` : ''}<span>${esc(r[3])}</span>${r[4] && r[4] !== '—' ? `<em>▶ ${esc(r[4])}</em>` : ''}</div></div>`;
  }

  /** @param {string | undefined} id */
  go(id) {
    const el = document.getElementById('gd-' + id), body = this.env.$('#gdBody');
    if (el) body.scrollTop = el.offsetTop - body.offsetTop - 6;
  }
}
