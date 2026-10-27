// Tala lookups. The only source of tala facts is rules/talas.json; nothing is repeated here.
import type { TalaDef, TalaInfo, TalaLibrary, TalaTable } from './types.ts';

/** Latin spellings other than the library keys that transcribers have used. */
const ALIASES: Record<string, string> = { keherwa: 'kerva', teental: 'tritaal' };

export const DEV_DIGITS = '०१२३४५६७८९';
export const toLatinDigits = (s: unknown): string => String(s).replace(/[०-९]/g, d => String(DEV_DIGITS.indexOf(d)));

/** The library file ({ talas: {...} }) or the bare table of talas. */
export const tableOf = (lib: TalaLibrary | TalaTable): TalaTable => (lib as TalaLibrary).talas ?? (lib as TalaTable);

/** Find a tala by library key ("kerva"), alias ("keherwa") or Devanagari name ("केरवा"). */
export function findTala(table: TalaTable, name: string): TalaDef | undefined {
  const n = String(name), lower = n.toLowerCase();
  return table[ALIASES[lower] ?? lower] ?? Object.values(table).find(t => t.name.dev === n);
}

/** A tala at a speed: what the first compile step records on each part and charan. */
export function talaInfo(table: TalaTable, name: string, laya: number | string): TalaInfo {
  const def = findTala(table, name);
  if (!def) throw new Error(`Unknown tala ${name}`);
  const key = Object.keys(table).find(k => table[k] === def)!;
  return {
    name: def.name.dev,
    key,
    laya: +toLatinDigits(laya),
    cycle: def.cycle,
    ganSize: def.ganSize,
    gats: def.gats && def.gats.length ? [...def.gats] : null,
    stepMatras: def.steps ? def.steps.matrasPerStep : null,
  };
}
