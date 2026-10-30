// Texts that belong to data (the signals of the Ghoshdand page: names, rules, captions) kept as one Markdown file per language,
// src/content/<lang>/<name>.md. Each text is one line; a group heading names the part of the data it belongs to:
//
//   # Ghoshdand signals                    the title (ignored)
//
//   ## signals.chal                         a group
//   - name: चल — march                      a text: key, a colon and a space, the text. Its full key is "signals.chal.name"
//   - steps.0.label: प्रचल १
//
// The code that owns the data says which keys it needs; the tests check that every language has all of them.

/** Full key -> text. */
export function parseKeyed(md: string, name = 'file.md'): Record<string, string> {
  const out: Record<string, string> = {};
  let group = '';
  md.replace(/\r/g, '').split('\n').forEach((line, i) => {
    const fail = (m: string): never => { throw new Error(`${name} line ${i + 1}: ${m}`); };
    if (!line.trim() || line.startsWith('# ')) return;
    const g = /^## ([A-Za-z0-9_.-]+)$/.exec(line);
    if (g) { group = g[1]!; return; }
    const t = /^- ([A-Za-z0-9_.-]+): (.*)$/.exec(line);
    if (!t) fail('expected "## group" or "- key: text"');
    if (!group) fail('a text before the first group');
    const key = `${group}.${t![1]}`;
    if (key in out) fail(`${key} is written twice`);
    if (!t![2]!.trim()) fail(`${key} is empty`);
    out[key] = t![2]!.trim();
  });
  return out;
}

/** The inverse, for tools: [[full key, text]] in order -> a file's text. The group is the key without its last part (two parts for names that start with a data kind). */
export function writeKeyed(title: string, entries: [string, string][], groupOf: (key: string) => [group: string, rest: string]): string {
  let out = `# ${title}\n`, group = '';
  for (const [key, text] of entries) {
    const [g, rest] = groupOf(key);
    if (g !== group) { out += `\n## ${g}\n`; group = g; }
    out += `- ${rest}: ${text}\n`;
  }
  return out;
}

/* ---------- text slots: the places in a data structure that hold a translated text ---------- */

export const SLOT: unique symbol = Symbol.for('ghoshnaad.text') as never;
/** language code -> text */
export type TextSlot = Record<string, string>;
/** An empty text in the data; `fillSlots` puts the texts of each language into it. The marker is not enumerable, so the slot looks like a plain object. */
export function newSlot(): TextSlot {
  const slot: TextSlot = { mr: '', hi: '', en: '' };
  Object.defineProperty(slot, SLOT, { value: true });
  return slot;
}
const isSlot = (x: unknown): x is TextSlot => !!x && typeof x === 'object' && (x as Record<symbol, unknown>)[SLOT] === true;

/**
 * Every slot below the roots with its key, in data order. A key is the way to the slot: names of properties, the `id` of an object in a list
 * (the position when it has none), and for a note `[count, slot]` the count.
 */
export function textSlots(roots: Record<string, unknown>): [key: string, slot: TextSlot][] {
  const out: [string, TextSlot][] = [];
  const isNote = (e: unknown): e is [number, TextSlot] => Array.isArray(e) && e.length === 2 && typeof e[0] === 'number' && isSlot(e[1]);
  const walk = (x: unknown, path: (string | number)[]): void => {
    if (isSlot(x)) out.push([path.join('.'), x]);
    else if (isNote(x)) out.push([[...path, x[0]].join('.'), x[1]]);
    else if (Array.isArray(x)) x.forEach((e, i) => walk(e, isNote(e) ? path : [...path, e && typeof e === 'object' && typeof (e as { id?: unknown }).id === 'string' ? (e as { id: string }).id : i]));
    else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, [...path, k]);
  };
  for (const [k, v] of Object.entries(roots)) walk(v, [k]);
  return out;
}

/** Put each language's texts into the slots. A key that names no slot is a mistake (a typo or a text left over): it throws. A language may lack a key; the reader falls back. */
export function fillSlots(slots: [string, TextSlot][], texts: Record<string, Record<string, string>>): void {
  const byKey = new Map(slots);
  for (const [lang, map] of Object.entries(texts))
    for (const [key, text] of Object.entries(map)) {
      const slot = byKey.get(key);
      if (!slot) throw new Error(`${lang}: "${key}" names no text of the data`);
      slot[lang] = text;
    }
}
