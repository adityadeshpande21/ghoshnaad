// The one place that knows the current language. Screens ask it for text, numbers and durations, and learn of a switch through onChange;
// none of them compares the language code. Adding a language is a languages.json entry plus translation files, no code.
import { parse, format, toText, toHTML } from './format.ts';
import type { Node, Params } from './format.ts';
import type { Kv } from '../data/kv.ts';
import { getJSON, setJSON } from '../data/kv.ts';
import { nameIn } from './names.ts';

export interface Language {
  code: string;
  name: string;
  /** ISO 15924 script, e.g. Deva, Gujr, Latn */
  script: string;
  /** numbering system: latn, deva, gujr, beng, guru, orya, knda, telu, mlym, tamldec */
  digits: string;
  /** how the names of rachanas, ragas and talas are shown: in the language's own script, or as roman letters */
  names: 'native' | 'roman';
  /** languages to try, in order, for a key this one does not have; English always ends the chain */
  fallback: string[];
  fonts: string;
  status: 'complete' | 'beta' | 'hidden';
}

export type Messages = Record<string, string>;

/** Code point of the digit zero of each numbering system. */
const ZERO: Record<string, number> = { deva: 0x966, beng: 0x9E6, guru: 0xA66, gujr: 0xAE6, orya: 0xB66, tamldec: 0xBE6, telu: 0xC66, knda: 0xCE6, mlym: 0xD66 };

export interface I18nOptions {
  languages: Language[];
  /** translations by language code; each is a flat object of key -> message */
  messages: Record<string, Messages>;
  /** development builds show ⟦key⟧ for a missing key; release builds fall back silently */
  dev?: boolean;
  /** where the choice is kept ("ghosh.lang", as in v1.1.0) */
  store?: Kv;
  /** the document to keep in step (lang attribute, font stack); omitted in tests */
  document?: { documentElement: { lang: string; style: { setProperty(k: string, v: string): void } } };
  /** the browser's preferred languages, most wanted first */
  preferred?: readonly string[];
  /** the language used when nothing is stored and no preferred language matches */
  defaultLanguage?: string;
  /** corrections to transliterated names: script (ISO 15924) -> Devanagari name -> the name in that script (rules/names/<script>.json) */
  nameOverrides?: Record<string, Record<string, string>>;
  warn?: (msg: string) => void;
}

interface DomLike {
  querySelectorAll(sel: string): ArrayLike<ElementLike>;
}
interface ElementLike {
  getAttribute(n: string): string | null;
  setAttribute(n: string, v: string): void;
  textContent: string | null;
  innerHTML: string;
}

export class I18n {
  readonly languages: Language[];
  private messages: Record<string, Messages>;
  private dev: boolean;
  private store?: Kv;
  private doc?: I18nOptions['document'];
  private warn: (m: string) => void;
  private cache = new Map<string, Node[] | Error>();
  private warned = new Set<string>();
  private listeners = new Set<(code: string) => void>();
  private _code: string;
  private plural: Intl.PluralRules;
  private chains = new Map<string, string[]>();
  private nameOverrides: Record<string, Record<string, string>>;

  constructor(o: I18nOptions) {
    this.nameOverrides = o.nameOverrides ?? {};
    this.languages = o.languages; this.messages = o.messages; this.dev = !!o.dev; this.store = o.store; this.doc = o.document;
    this.warn = o.warn ?? (m => console.warn(m));
    const def = o.defaultLanguage ?? this.languages[0].code;
    const stored = this.store ? getJSON<string | null>(this.store, 'lang', null) : null;
    const byPreference = (o.preferred ?? []).map(p => String(p).toLowerCase()).map(p => this.languages.find(l => p === l.code || p.startsWith(l.code + '-'))?.code).find(Boolean);
    this._code = stored && this.find(stored) ? stored : byPreference ?? def;
    this.plural = this.pluralFor(this._code);
  }

  get code(): string { return this._code; }
  get language(): Language { return this.find(this._code)!; }
  find(code: string): Language | undefined { return this.languages.find(l => l.code === code); }
  /** Languages offered to the person: complete ones, and beta ones (the caller marks them); hidden ones are built but not listed. */
  listed(): Language[] { return this.languages.filter(l => l.status !== 'hidden'); }

  private pluralFor(code: string): Intl.PluralRules { try { return new Intl.PluralRules(code); } catch { return new Intl.PluralRules('en'); } }
  /** The languages to try for a key, in order: the language itself, its fallbacks, English. */
  chainOf(code: string): string[] {
    let c = this.chains.get(code);
    if (!c) { const l = this.find(code); c = [...new Set([code, ...(l ? l.fallback : []), 'en'])].filter(x => this.messages[x]); this.chains.set(code, c); }
    return c;
  }

  /** Switch language: sets <html lang> and the font stack, keeps the choice, and tells every listener. */
  setLocale(code: string): boolean {
    const l = this.find(code);
    if (!l) return false;
    if (code === this._code) return true;
    this._code = code; this.plural = this.pluralFor(code);
    this.syncDocument();
    if (this.store) setJSON(this.store, 'lang', code);
    this.listeners.forEach(f => f(code));
    return true;
  }
  /** Put the current language on the document (call once at start-up). */
  syncDocument(): void {
    if (!this.doc) return;
    this.doc.documentElement.lang = this._code;
    this.doc.documentElement.style.setProperty('--f-lang', this.language.fonts);
  }
  onChange(cb: (code: string) => void): () => void { this.listeners.add(cb); return () => this.listeners.delete(cb); }

  /* ---------------------------------------------------------------- text */

  private lookup(key: string, lang: string): { nodes: Node[]; code: string } | null {
    for (const code of this.chainOf(lang)) {
      const raw = this.messages[code][key];
      if (raw === undefined) continue;
      const id = `${code}\u0000${key}`;
      let p = this.cache.get(id);
      if (!p) { try { p = parse(raw); } catch (e) { p = e as Error; } this.cache.set(id, p); }
      if (p instanceof Error) { this.once(`bad:${id}`, `i18n: ${code}.${key}: ${p.message}`); continue; }
      return { nodes: p, code };
    }
    return null;
  }
  private once(id: string, msg: string): void { if (!this.warned.has(id)) { this.warned.add(id); this.warn(msg); } }
  /** The language, then the languages it falls back to: the order in which anything written per language (a text, a content file) is looked for. */
  chain(code = this._code): string[] { return this.chainOf(code); }
  /**
   * A rachana, raga or tala name in the script of the language: as printed (Devanagari), as roman letters (English), or the Devanagari name
   * written in another Indic script (with the corrections of rules/names/<script>.json).
   * @param dev the name as the books print it @param rom its roman-letter name, if the data has one
   */
  name(dev: string, rom?: string, code = this._code): string {
    const l = this.find(code)!;
    return nameIn(l, dev, rom, this.nameOverrides[l.script]);
  }
  has(key: string): boolean { return this.chainOf(this._code).some(c => this.messages[c][key] !== undefined); }

  private run(key: string, params: Params | undefined, lang = this._code): { segs: ReturnType<typeof format>; found: boolean } {
    const hit = this.lookup(key, lang);
    if (!hit) {
      if (this.dev) this.once(`missing:${key}`, `i18n: missing key ${key}`);
      return { segs: [{ text: this.dev ? `⟦${key}⟧` : key, bold: false, code: false }], found: false };
    }
    // numbers and plurals follow the language of the text that was found, as the digits of the screen do
    return { segs: format(hit.nodes, params ?? {}, { num: n => this.num(n, lang), plural: n => (lang === this._code ? this.plural : this.pluralFor(lang)).select(n) }), found: true };
  }
  /** Plain text in the current language (through the fallback chain). */
  t(key: string, params?: Params): string { return toText(this.run(key, params).segs); }
  /** HTML in which the only tags are <b>, <code> and <br>; everything else, parameters included, is escaped. */
  tb(key: string, params?: Params): string { return toHTML(this.run(key, params).segs); }
  /** The same, in another language than the current one (for tables of every language, and for tests). */
  tIn(lang: string, key: string, params?: Params): string { return toText(this.run(key, params, lang).segs); }
  tbIn(lang: string, key: string, params?: Params): string { return toHTML(this.run(key, params, lang).segs); }

  /* ---------------------------------------------------------- numbers etc. */

  /** Replace the digits 0–9 of a string with the language's digits. */
  digits(s: string, lang = this._code): string {
    const zero = ZERO[this.find(lang)!.digits];
    return zero === undefined ? s : s.replace(/\d/g, d => String.fromCodePoint(zero + +d));
  }
  num(n: number, lang = this._code): string {
    return this.digits(Number.isInteger(n) ? String(n) : new Intl.NumberFormat('en', { useGrouping: false, maximumFractionDigits: 3 }).format(n), lang);
  }
  /** A duration in seconds as m:ss, in the language's digits. */
  time(seconds: number): string {
    const t = Math.max(0, Math.round(seconds));
    return this.digits(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
  }
  list(items: string[]): string {
    try { return new Intl.ListFormat(this._code, { style: 'long', type: 'conjunction' }).format(items); } catch { return items.join(', '); }
  }

  /* -------------------------------------------------------------- the page */

  /** Fill every data-i18n="key" (text) and data-i18n-html="key" (<b> allowed) and data-i18n-attr="aria-label:key;placeholder:key" under root. */
  apply(root: DomLike): void {
    for (const el of Array.from(root.querySelectorAll('[data-i18n]'))) el.textContent = this.t(el.getAttribute('data-i18n')!);
    for (const el of Array.from(root.querySelectorAll('[data-i18n-html]'))) el.innerHTML = this.tb(el.getAttribute('data-i18n-html')!);
    for (const el of Array.from(root.querySelectorAll('[data-i18n-attr]')))
      for (const pair of el.getAttribute('data-i18n-attr')!.split(';')) { const [attr, key] = pair.split(':').map(x => x.trim()); if (attr && key) el.setAttribute(attr, this.t(key)); }
  }
}
