// @ts-check
// ताल वेळरेषा screen: the tala timeline page, as a screen of the app. Its content lives in a shadow root (styles and ids of its
// own), is drawn by tala.loose.js, and sounds through the app's audio engine.
import { Screen } from '../../ui/screen.js';
import { createTalaTimeline } from './tala.loose.js';
import css from './tala.css';
import html from './tala.html';

/** @type {Record<string, string>} */
const NAMES = { mr: 'ताल वेळरेषा', hi: 'ताल समयरेखा', en: 'Tala timeline' };

export class TalaTimelineScreen extends Screen {
  /** @param {import('../../ui/env.d.ts').AppEnv} env */
  constructor(env) {
    super(env, '#tala');
    for (const l in NAMES) if (env.I18N[l]) env.I18N[l].tl_open = NAMES[l];
    env.applyStatic();
    /** @type {any} */
    this.page = null;
    this.shadow = env.$('#talaHost').attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `<style>${css}</style>${html}`;
    // the page's palette follows the app's light / dark choice
    const sync = () => {
      const t = document.documentElement.dataset.theme;
      const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
      const root = this.shadow.querySelector('.tl'); if (root) root.toggleAttribute('data-dark', dark);
    };
    this.syncTheme = sync;
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sync);
    sync();
    this.listen(env.$('#talaBack'), 'click', () => this.close());
    this.listen(document, 'keydown', e => { if (/** @type {KeyboardEvent} */ (e).key === 'Escape' && this.isOpen) this.close(); });
    this.listen(document, 'click', e => {
      const b = /** @type {HTMLElement} */ (e.target).closest('[data-talaopen]');
      if (b) { e.preventDefault(); this.open(); }
    });
  }

  open() {
    const $ = this.env.$;
    if (!$('#sheet').hidden) $('#sheet').hidden = true;
    this.syncTheme();
    if (!this.page) this.page = createTalaTimeline(this.shadow, this.env);
    super.open();
  }
  close() { this.stopPlaying(); super.close(); }
  stopPlaying() { if (this.page) this.page.stopPlay(); }
  onStopAll() { this.stopPlaying(); }
  onLang() { /* the page's own text is Marathi for now */ }
}
