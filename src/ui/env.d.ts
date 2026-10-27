// What the page gives each screen: its services, instead of loose globals.
export interface AppEnv {
  /** querySelector on the page; throws if the element is missing, so a typo is found at once */
  $(selector: string): HTMLElement;
  /** a text in the current language (functions in the language tables are called with `args`) */
  tx(key: string, ...args: unknown[]): any;
  esc(s: unknown): string;
  /** a number as shown in the current language (Devanagari digits, or Latin) */
  dv(n: number | string): string;
  I18N: Record<string, Record<string, any>>;
  lang(): string;
  /** the player's own drawing of one matra, so samples look exactly like the score */
  matraHTML(m: object): string;
  /** is the sound-check page available (the guide links to it) */
  hasSoundLab(): boolean;
  /** draw a notation sample (the guide's renderer) */
  sample(src: string): string;
  [service: string]: any;
}
