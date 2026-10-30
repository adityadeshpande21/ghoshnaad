// @ts-check
// The settings sheet (the gear on the list and in the player): which instruments play each part, the पट्टी of each melody part, सांतर / निरंतर, the कण स्वर length,
// the folder library and the "your work / version / install" group, and the language. It draws the sheet and handles its buttons; what a change does to sound or
// to the rachana on screen is the player's business, so it is called back (`onSa`, `onKan`, `onInstruments`). The values themselves are `SoundSettings`.
import { clicked } from '../../ui/dom.js';
import { INSTRUMENT_OPTIONS } from '../../audio/soundSettings.ts';

export class SettingsSheet {
  /**
   * @param {{
   *   $: (selector: string) => HTMLElement,
   *   i18n: import('../../ui/env.d.ts').AppEnv['i18n'],
   *   dv: (n: number | string) => string,
   *   settings: import('../../audio/soundSettings.ts').SoundSettings,
   *   instrumentNames: Record<string, string[]>,
   *   saKeys: string[], saDefaults: Record<string, { key: number, oct: number }>,
   *   setLang: (code: string) => void,
   *   library: () => { sheetHTML(): string } | undefined,
   *   platform: () => { render(): void } | undefined,
   *   onSa: (part: string) => void, onKan: () => void, onInstruments: () => void,
   * }} deps
   */
  constructor(deps) { this.d = deps; }

  /** Draw every group of the sheet. */
  render() {
    const { $, i18n, dv, settings: SS, instrumentNames: INST_NAMES, saKeys: SA_KEYS, saDefaults: SA_DEF } = this.d;
  $('#sheetBody').innerHTML=Object.entries(INSTRUMENT_OPTIONS).map(([g,opts])=>{
    const need=(g==='shankh'||g==='vanshi');
    const en=i18n.romanNames;
    return `<div class="igrp"><b>${i18n.t('common.groups.' + g)}</b><div class="opts">${opts.map(id=>{const [d,e]=INST_NAMES[id];return `<button class="opt" data-g="${g}" data-i="${id}" aria-pressed="${SS.inst[g].includes(id)}"><span>${i18n.name(d,e)}</span><small>${en?d:e}</small></button>`}).join('')}</div>${need?`<span class="note">${i18n.t('settings.needOne')}</span>`:''}</div>`}).join('');
  const sel=(/** @type {boolean} */ on)=>`aria-pressed="${on}"`;
  $('#playOpts').innerHTML=`<div class="igrp"><b>${i18n.t('settings.pitchL')}</b>${['shankh','vanshi'].map(pk=>`<span class="note">${i18n.t('common.groups.' + pk)} · ${SA_KEYS[SS.saKeys[pk]]}${SA_DEF[pk].oct}</span><div class="opts keys">${SA_KEYS.map((k,i)=>`<button class="opt key" data-sa="${pk}:${i}" ${sel(i===SS.saKeys[pk])}><span>${k}</span></button>`).join('')}</div>`).join('')}</div>
  <div class="igrp"><b>${i18n.t('settings.artL')}</b><div class="opts">${['santar','nirantar'].map(a=>`<button class="opt" data-art="${a}" ${sel(a===SS.artic)}><span>${i18n.t('settings.'+a)}</span><small>${i18n.t('settings.'+a+'S')}</small></button>`).join('')}</div></div>
  <div class="igrp"><b>${i18n.t('settings.kanL')}</b><div class="opts">${[30,45,60,80,100,130].map(m=>`<button class="opt key" data-kan="${m}" ${sel(m===SS.kanMs)}><span>${dv(m)}</span></button>`).join('')}</div><span class="note">${i18n.t('settings.ms', { ms: '' })}</span></div>`;
  const lib=this.d.library(),pf=this.d.platform();
  $('#libOpts').innerHTML=lib?lib.sheetHTML():'';
  if(pf)pf.render();
  $('#langs').innerHTML=i18n.languages.map(l=>`<button class="opt lang" data-lang="${l.code}" aria-pressed="${l.code===i18n.LANG}" lang="${l.code}"><span>${l.name}</span></button>`).join('');
  }

  /** Show the sheet. */
  open() { this.render(); this.d.$('#sheet').hidden = false; }
  close() { this.d.$('#sheet').hidden = true; }

  /** Attach the buttons and the keys. */
  bind() {
    const { $, settings: SS } = this.d;
    $('#instBtn').onclick = $('#instBtn2').onclick = () => this.open();
    $('#sheetX').onclick = () => this.close();
    $('#sheet').addEventListener('click', e => {
      if (/** @type {HTMLElement} */ (e.target).id === 'sheet') { this.close(); return; }
      if (clicked(e, '[data-fx]')) return;
      const lb = clicked(e, '[data-lang]'); if (lb) { this.d.setLang(/** @type {string} */ (lb.dataset.lang)); return; }
      const sb = clicked(e, '[data-sa]'); if (sb) { const [pk, k] = /** @type {string} */ (sb.dataset.sa).split(':'); SS.setSaKey(/** @type {string} */ (pk), +(/** @type {string} */ (k))); this.render(); this.d.onSa(/** @type {string} */ (pk)); return; }
      const ab = clicked(e, '[data-art]'); if (ab) { SS.setArtic(/** @type {'santar' | 'nirantar'} */ (ab.dataset.art)); this.render(); return; }
      const kb = clicked(e, '[data-kan]'); if (kb) { SS.setKanMs(+(/** @type {string} */ (kb.dataset.kan))); this.render(); this.d.onKan(); return; }
      const b = clicked(e, '.opt'); if (!b) return;
      if (!SS.toggleInstrument(/** @type {string} */ (b.dataset.g), /** @type {string} */ (b.dataset.i))) return;          // a melody part keeps at least one instrument
      this.render(); this.d.onInstruments();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) this.close(); });
  }
}
