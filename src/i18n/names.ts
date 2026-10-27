// Names of rachanas, ragas and talas in the script of the language shown. The books print them in Devanagari; the Indic scripts follow the same
// order of letters, so a Devanagari name becomes the same name in Gujarati, Bengali, … by moving each letter to its place in the other script's
// Unicode block. Letters a script lacks are replaced by the nearest one it has; Tamil, which has no aspirated or voiced stops, has its own table.
// A name that still comes out wrong is corrected in rules/names/<script>.json (Devanagari name -> the name in that script).
//
// The tables are written as code points, not as letters: several Devanagari letters (U+0958–095F) are canonically a letter plus a nukta,
// and an editor or a tool may merge or split them without anyone noticing.

/** ISO 15924 script -> first code point of its Unicode block (Devanagari starts at U+0900). */
const BLOCK: Record<string, number> = { Beng: 0x980, Guru: 0xa00, Gujr: 0xa80, Orya: 0xb00, Taml: 0xb80, Telu: 0xc00, Knda: 0xc80, Mlym: 0xd00 };
const DEVA = 0x900;
const NUKTA_SIGN = 0x93c, DANDA = 0x964, DOUBLE_DANDA = 0x965;

/** Scripts a Devanagari name can be written in (besides Devanagari itself). */
export const TRANSLITERATED_SCRIPTS = Object.keys(BLOCK);

const str = (...cps: number[]): string => String.fromCodePoint(...cps);
/** [from code point, to code points[]] pairs -> map of strings */
const table = (pairs: [number, number[]][]): Map<number, string> => new Map(pairs.map(([from, to]) => [from, str(...to)]));

// letters written as one code point in Devanagari that are a letter plus a nukta in the others: क़ ख़ ग़ ज़ ड़ ढ़ फ़ य़
const NUKTA = table([[0x958, [0x915, NUKTA_SIGN]], [0x959, [0x916, NUKTA_SIGN]], [0x95a, [0x917, NUKTA_SIGN]], [0x95b, [0x91c, NUKTA_SIGN]],
  [0x95c, [0x921, NUKTA_SIGN]], [0x95d, [0x922, NUKTA_SIGN]], [0x95e, [0x92b, NUKTA_SIGN]], [0x95f, [0x92f, NUKTA_SIGN]]]);
// if a script lacks a letter, the nearest Devanagari letter is tried instead (and again, if that is lacking too)
const NEAREST = table([
  [0x911, [0x913]], [0x949, [0x94b]], [0x90d, [0x90f]], [0x945, [0x947]],   // ऑ ॉ ऍ ॅ (the Marathi / English o and e) -> ओ ो ए े
  [0x929, [0x928]], [0x931, [0x930]], [0x934, [0x933]], [0x933, [0x932]],   // ऩ ऱ ऴ ळ -> न र ळ ल
  [0x937, [0x936]],                                                         // ष -> श (Gurmukhi)
  [0x935, [0x92c]],                                                         // व -> ब (Bengali has one letter for both)
  [NUKTA_SIGN, []],                                                         // a nukta the script does not have is dropped
  [0x90b, [0x930, 0x93f]], [0x960, [0x930, 0x93f]], [0x943, [0x93f]],       // ऋ ॠ ृ -> रि रि ि
  [0x950, [0x913, 0x92e, 0x94d]],                                           // ॐ -> ओम्
]);
// Tamil has one letter for each group of stops: the aspirated and the voiced ones fall to the plain one; Grantha letters for ज श ष स ह
const TAMIL = table([
  ...[0x915, 0x916, 0x917, 0x918].map((c): [number, number[]] => [c, [0xb95]]),   // क ख ग घ -> க
  ...[0x91a, 0x91b, 0x91d].map((c): [number, number[]] => [c, [0xb9a]]),          // च छ झ -> ச
  ...[0x91f, 0x920, 0x921, 0x922].map((c): [number, number[]] => [c, [0xb9f]]),   // ट ठ ड ढ -> ட
  ...[0x924, 0x925, 0x926, 0x927].map((c): [number, number[]] => [c, [0xba4]]),   // त थ द ध -> த
  ...[0x92a, 0x92b, 0x92c, 0x92d].map((c): [number, number[]] => [c, [0xbaa]]),   // प फ ब भ -> ப
  [0x91c, [0xb9c]], [0x936, [0xbb6]], [0x937, [0xbb7]], [0x938, [0xbb8]], [0x939, [0xbb9]],   // ஜ ஶ ஷ ஸ ஹ
  [NUKTA_SIGN, []],
]);

const unassigned = /\p{Cn}/u;
const isDevanagari = (cp: number): boolean => cp >= DEVA && cp <= 0x97f;

function letter(cp: number, script: string, depth = 0): string {
  if (script === 'Taml') { const t = TAMIL.get(cp); if (t !== undefined) return t; }
  const moved = str(cp - DEVA + BLOCK[script]!);
  if (!unassigned.test(moved)) return moved;
  const near = NEAREST.get(cp);
  if (near === undefined || depth > 2) return str(cp);                  // nothing nearer: the Devanagari letter stays, so it can be seen and corrected
  return [...near].map(n => (isDevanagari(n.codePointAt(0)!) ? letter(n.codePointAt(0)!, script, depth + 1) : n)).join('');
}

/** A Devanagari text in another Indic script; anything that is not Devanagari (spaces, Latin letters) is kept, and so are the dandas (shared by the scripts). */
export function transliterate(text: string, script: string): string {
  if (!(script in BLOCK)) return text;
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    for (const c of NUKTA.get(cp) ?? ch) {
      const p = c.codePointAt(0)!;
      out += isDevanagari(p) && p !== DANDA && p !== DOUBLE_DANDA ? letter(p, script) : c;
    }
  }
  return out;
}

/** What names look like in a language: its script, and whether names are written in that script or as roman letters. */
export interface NameStyle { script: string; names: 'native' | 'roman' }

/**
 * A name as the language shows it.
 * @param dev the name as printed in the books (Devanagari)
 * @param rom the roman-letter name, if the data has one
 * @param overrides corrections for this script, by Devanagari name
 */
export function nameIn(style: NameStyle, dev: string, rom?: string, overrides?: Record<string, string>): string {
  if (style.names === 'roman') return rom || dev;
  if (style.script === 'Deva') return dev;
  return overrides?.[dev] ?? transliterate(dev, style.script);
}
