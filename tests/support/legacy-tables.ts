// The old table shape, rebuilt from the translation files, so screens that still read I18N[lang][oldKey] keep working unchanged
// while they are moved to i18n.t(newKey) one at a time. legacy-keys.json says where each old key went:
//   "key.path"                                a plain text
//   null                                      the old table had a null there (kept, so the tables stay what they were)
//   { fn: "key", params: ["n"], numeric?: [] } a function (positional arguments -> named blanks)
//   { key: "key", html: true }                 text with markup (<br>, <code>) for innerHTML
//   [ … ]  /  { name: … }                      an array or an object of the above
import type { I18n } from '../../src/i18n/i18n.ts';

export type Spec = null | string | Spec[] | { fn: string; params: string[]; numeric?: string[] } | { key: string; html: true } | { [name: string]: Spec };

/** Code point of the digit zero of each numbering system. */
const ZEROES = [0x30, 0x966, 0x9E6, 0xA66, 0xAE6, 0xB66, 0xBE6, 0xC66, 0xCE6, 0xD66];
/** "१२", "12" or "૧૨" as a number; anything else is returned unchanged (the old functions were handed already-formatted text). */
function toNumber(v: unknown): unknown {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string' || !v) return v;
  let n = '';
  for (const ch of v) {
    const cp = ch.codePointAt(0)!, z = ZEROES.find(zero => cp >= zero && cp <= zero + 9);
    if (z === undefined) return v;
    n += String(cp - z);
  }
  return Number(n);
}

const isFn = (s: Spec): s is { fn: string; params: string[]; numeric?: string[] } => s !== null && typeof s === 'object' && !Array.isArray(s) && typeof (s as { fn?: unknown }).fn === 'string';
const isHtml = (s: Spec): s is { key: string; html: true } => s !== null && typeof s === 'object' && !Array.isArray(s) && (s as { html?: unknown }).html === true && typeof (s as { key?: unknown }).key === 'string';

export function legacyTables(i18n: I18n, spec: Record<string, Spec>): Record<string, Record<string, unknown>> {
  const build = (code: string, s: Spec): unknown => {
    if (s === null) return null;
    if (typeof s === 'string') return i18n.tIn(code, s);
    if (Array.isArray(s)) return s.map(x => build(code, x));
    if (isFn(s)) {
      const numeric = new Set(s.numeric ?? []);
      return (...args: unknown[]) => i18n.tIn(code, s.fn, Object.fromEntries(s.params.map((p, i) => [p, numeric.has(p) ? toNumber(args[i]) : args[i]])) as Record<string, string | number | undefined>);
    }
    if (isHtml(s)) return i18n.tbIn(code, s.key);
    return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, build(code, v as Spec)]));
  };
  const tables: Record<string, Record<string, unknown>> = {};
  for (const lang of i18n.languages) {
    const flags: Record<string, unknown> = { lang: lang.name, latinDigits: lang.digits === 'latn', romanNames: lang.names === 'roman' };
    const extra: Record<string, unknown> = {};           // what screens that are not moved yet add with Object.assign(I18N[l], …)
    const cache = new Map<string, unknown>();
    const get = (k: string): unknown => {
      if (k in extra) return extra[k];
      if (k in flags) return flags[k];
      if (!(k in spec)) return undefined;
      if (!cache.has(k)) cache.set(k, build(lang.code, spec[k]));
      return cache.get(k);
    };
    const keys = () => [...Object.keys(spec), ...Object.keys(flags), ...Object.keys(extra).filter(k => !(k in spec) && !(k in flags))];
    tables[lang.code] = new Proxy(extra, {
      get: (_t, k) => (typeof k === 'string' ? get(k) : undefined),
      set: (t, k, v) => { if (typeof k === 'string') t[k] = v; return true; },
      has: (_t, k) => typeof k === 'string' && (k in extra || k in flags || k in spec),
      ownKeys: () => keys(),
      getOwnPropertyDescriptor: (_t, k) => (typeof k === 'string' && (k in extra || k in flags || k in spec) ? { enumerable: true, configurable: true, writable: true, value: get(k) } : undefined),
    });
  }
  return tables;
}
