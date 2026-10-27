// @ts-check
// A screen is one full-page view with its own element, its own events and its own clean-up.
// The App knows every screen, so a language change or a "stop all sound" reaches them all without each one being named.

/** @typedef {import('./env.d.ts').AppEnv} AppEnv */

export class Screen {
  /**
   * @param {AppEnv} env
   * @param {string} rootSelector the screen's element, e.g. '#guide'; it is hidden while the screen is closed
   */
  constructor(env, rootSelector) {
    this.env = env;
    this.rootSelector = rootSelector;
    /** @type {Array<() => void>} */
    this._undo = [];
  }

  get root() { return this.env.$(this.rootSelector); }
  get isOpen() { return !this.root.hidden; }

  /** Show the screen. `arg` is whatever the screen understands (a section to jump to, a rachana id …).
   *  @param {any} [arg] */
  open(arg) { this.root.hidden = false; this.render(arg); }
  close() { if (!this.isOpen) return; this.root.hidden = true; this.onClose(); }
  /** Draw the screen. Called when it opens and when the language changes while it is open.
   *  @param {any} [_arg] */
  render(_arg) {}
  onClose() {}
  /** The language changed. */
  onLang() { if (this.isOpen) this.render(); }
  /** All sound must stop (another copy of the app started playing, or a different screen took the sound). */
  onStopAll() {}
  /** True while the screen is playing sound or holds work that is not saved yet: the page must not reload now (an update, a restore). */
  isBusy() { return false; }

  /** Add an event listener that is removed again by `dispose()`.
   *  @param {EventTarget} target @param {string} type @param {(e: Event) => void} handler @param {AddEventListenerOptions} [options] */
  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._undo.push(() => target.removeEventListener(type, handler, options));
  }
  dispose() { this._undo.splice(0).forEach(f => f()); }
}

export class App {
  /** @param {AppEnv} env */
  constructor(env) {
    this.env = env;
    /** @type {Map<string, any>} */
    this.screens = new Map();
    // one subscription for the whole app: a language change reaches every screen, in the order they were registered
    this.stopListening = env.i18n.onChange(() => this.setLang());
  }
  /** A screen, or a service with the same hooks (onLang, onStopAll, dispose).
   *  @template {any} S @param {string} name @param {S} screen @returns {S} */
  register(name, screen) { this.screens.set(name, screen); return screen; }
  /** @param {string} name */
  get(name) { return this.screens.get(name); }
  /** Tell every screen the language changed (called by the language core; screens redraw in `onLang`). */
  setLang() { this.screens.forEach(s => s.onLang && s.onLang()); }
  stopAll() { this.screens.forEach(s => s.onStopAll && s.onStopAll()); }
  /** Does any screen, or service with `isBusy`, hold sound or unsaved work? */
  isBusy() { return [...this.screens.values()].some(s => s.isBusy && s.isBusy()); }
  dispose() { this.stopListening(); this.screens.forEach(s => s.dispose && s.dispose()); this.screens.clear(); }
}
