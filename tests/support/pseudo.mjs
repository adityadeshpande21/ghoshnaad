// A pseudo-language for testing the layout: every message wrapped in [ ] and made about 40 % longer.
// Any text on a screen without brackets was not translated through the language core (it is written into the code);
// any text that no longer fits is a layout that only works for short words.
import { parse } from '../../src/i18n/format.ts';

const esc = s => s.replace(/[\\{}]/g, c => '\\' + c);
const letters = /\p{L}/u;
/** Longer by about 40 %: vowels doubled, then padded with dots. Chunks with no letters (separators, numbers) stay. */
function grow(s) {
  if (!letters.test(s)) return s;
  const target = Math.ceil([...s].length * 1.4);
  const o = s.replace(/[aeiouAEIOU]/g, v => v + v);
  const n = [...o].length;
  return n < target ? o + '·'.repeat(target - n) : o;
}
function unparse(nodes) {
  return nodes.map(n => {
    if (typeof n === 'string') return esc(grow(n));
    switch (n.kind) {
      case 'blank': return `{${n.arg}}`;
      case 'number': return `{${n.arg}, number}`;
      case 'hash': return '#';
      case 'tag': return `<${n.tag}>${unparse(n.children)}</${n.tag}>`;
      case 'plural': return `{${n.arg}, plural,${n.offset ? ` offset:${n.offset}` : ''} ${Object.entries(n.cases).map(([k, v]) => `${k} {${unparse(v)}}`).join(' ')}}`;
      case 'select': return `{${n.arg}, select, ${Object.entries(n.cases).map(([k, v]) => `${k} {${unparse(v)}}`).join(' ')}}`;
      default: throw new Error('unknown node ' + JSON.stringify(n));
    }
  }).join('');
}
export const pseudo = text => `[${unparse(parse(text))}]`;
export const pseudoMessages = en => Object.fromEntries(Object.entries(en).map(([k, v]) => [k, pseudo(v)]));
export const PSEUDO_LANGUAGE = { code: 'qps', name: 'qps', script: 'Latn', digits: 'latn', names: 'roman', fallback: ['en'], fonts: 'sans-serif', status: 'hidden' };
