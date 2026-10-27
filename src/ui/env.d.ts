// What the page gives each screen: its services, instead of loose globals.
export interface AppEnv {
  /** querySelector on the page; throws if the element is missing, so a typo is found at once */
  $(selector: string): HTMLElement;
  /** the language core: `i18n.t('screen.key', { name: value })` is a text in the current language, `tb` the same as HTML (<b>, <code> only) */
  i18n: {
    t(key: string, params?: Record<string, string | number | undefined>): string;
    tb(key: string, params?: Record<string, string | number | undefined>): string;
    has(key: string): boolean;
    /** `cb` is called after every change of language; returns the way to stop listening */
    onChange(cb: (code: string) => void): () => void;
    /** fill every data-i18n / data-i18n-html / data-i18n-attr below `root` (the page, or a shadow root) */
    apply(root: ParentNode): void;
    /** names of rachanas, ragas and talas are shown as roman letters (English) */
    readonly romanNames: boolean;
    readonly latinDigits: boolean;
    /** ISO 15924 script of the language: Deva, Latn, Gujr … */
    readonly script: string;
    /** a rachana, raga or tala name in the script of the language (Devanagari as printed, roman letters, or transliterated) */
    name(dev: string, rom?: string): string;
    /** the language and the ones it falls back to */
    chain(): string[];
    readonly languages: { code: string; name: string }[];
    readonly LANG: string;
  };
  esc(s: unknown): string;
  /** a number as shown in the current language (Devanagari digits, or Latin) */
  dv(n: number | string): string;
  lang(): string;
  /** the player's own drawing of one matra, so samples look exactly like the score */
  matraHTML(m: object): string;
  /** is the sound-check page available (the guide links to it) */
  hasSoundLab(): boolean;
  /** draw a notation sample (the guide's renderer) */
  sample(src: string): string;
  [service: string]: any;
}
