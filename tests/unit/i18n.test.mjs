import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, format, toText, toHTML, shape, MessageError } from '../../src/i18n/format.ts';
import { I18n } from '../../src/i18n/i18n.ts';
import { MemoryKv } from '../../src/data/kv.ts';

const LANGS = [
  { code: 'mr', name: 'मराठी', script: 'Deva', digits: 'deva', names: 'native', fallback: ['hi', 'en'], fonts: 'F-mr', status: 'complete' },
  { code: 'hi', name: 'हिन्दी', script: 'Deva', digits: 'deva', names: 'native', fallback: ['mr', 'en'], fonts: 'F-hi', status: 'complete' },
  { code: 'en', name: 'English', script: 'Latn', digits: 'latn', names: 'roman', fallback: [], fonts: 'F-en', status: 'complete' },
  { code: 'gu', name: 'ગુજરાતી', script: 'Gujr', digits: 'gujr', names: 'native', fallback: ['hi', 'en'], fonts: 'F-gu', status: 'beta' },
  { code: 'ta', name: 'தமிழ்', script: 'Taml', digits: 'tamldec', names: 'native', fallback: ['en'], fonts: 'F-ta', status: 'hidden' },
  { code: 'bn', name: 'বাংলা', script: 'Beng', digits: 'beng', names: 'native', fallback: ['en'], fonts: 'F-bn', status: 'beta' },
];
const MSG = {
  en: { hello: 'Hello', count: '{n, plural, one {# rachana} other {# rachanas}}', days: 'Backed up {d} days ago', foot: '{f, select, L {Left} R {Right} other {}}', bold: 'Press <b>Play</b> now', hash: 'x \\{ y \\} \\\\ z', only_en: 'Only English', multi: 'a\nb', ago: '{n, number} min' },
  mr: { hello: 'नमस्कार', count: '{n, plural, one {# रचना} other {# रचना}}', days: '{d} दिवसांपूर्वी बॅकअप' },
  hi: { hello: 'नमस्ते', only_hi: 'सिर्फ हिन्दी' },
  gu: { count: '{n, plural, one {# રચના} other {# રચનાઓ}}' },
  ta: { count: '{n, plural, one {# இசை} other {# இசைகள்}}' },
};
const make = (o = {}) => new I18n({ languages: LANGS, messages: MSG, defaultLanguage: 'mr', warn: () => {}, ...o });

/* ---------- format ---------- */
const fmt = (src, params = {}, lang = 'en') => { const i = make(); i.setLocale(lang); return toText(format(parse(src), params, { num: n => i.num(n), plural: n => new Intl.PluralRules(lang).select(n) })); };

test('blanks, numbers, escapes and line breaks', () => {
  assert.equal(fmt('Backed up {d} days ago', { d: 3 }), 'Backed up 3 days ago');
  assert.equal(fmt('{n, number} min', { n: 12 }, 'mr'), '१२ min');
  assert.equal(fmt('x \\{ y \\} \\\\ z'), 'x { y } \\ z');
  assert.equal(fmt('a\nb'), 'a\nb');
  assert.equal(fmt('{missing}'), '{missing}');                       // a blank without a value stays visible
});
test('plurals follow the language: mr, hi, en, gu, ta', () => {
  const m = '{n, plural, one {ONE #} other {MANY #}}';
  for (const lang of ['mr', 'en', 'gu', 'ta']) { assert.equal(fmt(m, { n: 1 }, lang).startsWith('ONE'), true, lang); assert.equal(fmt(m, { n: 2 }, lang).startsWith('MANY'), true, lang); }
  assert.equal(fmt(m, { n: 0 }, 'en').startsWith('MANY'), true);
  // Hindi and Gujarati count 0 and 1 as "one"; English and Marathi count only 1
  assert.equal(fmt(m, { n: 0 }, 'hi').startsWith('ONE'), true);
  assert.equal(fmt(m, { n: 0 }, 'gu').startsWith('ONE'), true);
  assert.equal(fmt(m, { n: 0 }, 'mr').startsWith('MANY'), true);
});
test('plural: exact matches, offset, and # in the language\'s digits', () => {
  assert.equal(fmt('{n, plural, =0 {none} one {# item} other {# items}}', { n: 0 }), 'none');
  assert.equal(fmt('{n, plural, =0 {none} one {# item} other {# items}}', { n: 5 }, 'gu'), '૫ items');
  assert.equal(fmt('{n, plural, one {# रचना} other {# रचना}}', { n: 12 }, 'mr'), '१२ रचना');
  assert.equal(fmt('{n, plural, offset:1 =1 {just you} one {you and # other} other {you and # others}}', { n: 3 }), 'you and 2 others');
});
test('select', () => {
  const m = '{f, select, L {Left} R {Right} other {-}}';
  assert.deepEqual(['L', 'R', 'X', undefined].map(f => fmt(m, { f })), ['Left', 'Right', '-', '-']);
});
test('bold is the only markup, and everything else is escaped', () => {
  const segs = format(parse('Press <b>Play</b> {x}'), { x: '<img src=x onerror=1> & "q"' }, { num: String, plural: () => 'other' });
  assert.equal(toHTML(segs), 'Press <b>Play</b> &lt;img src=x onerror=1&gt; &amp; &quot;q&quot;');
  assert.equal(toHTML(format(parse('<b>{x}</b>'), { x: '<i>' }, { num: String, plural: () => 'other' })), '<b>&lt;i&gt;</b>');
  for (const bad of ['<img src=x>', '<script>x</script>', '<b>unclosed', 'a {b', 'a } b', '{n, plural, one {x}}', '{n, wat, other {x}}', 'trailing \\']) assert.throws(() => parse(bad), MessageError, bad);
});
test('<code> is allowed too, a line break becomes <br> in HTML, braces can be escaped, select cases may be in any script', () => {
  const ctx = { num: String, plural: () => 'other' };
  assert.equal(toHTML(format(parse('<code>॥ॐ॥</code> start\n<b>x</b> \\{1 … \\}'), {}, ctx)), '<code>॥ॐ॥</code> start<br><b>x</b> {1 … }');
  assert.equal(toText(format(parse('{w, select, एक {1} दो {2} other {{w}}}'), { w: 'दो' }, ctx)), '2');
  assert.equal(toText(format(parse('{w, select, एक {1} दो {2} other {{w}}}'), { w: 'चार' }, ctx)), 'चार');
  assert.throws(() => parse('<code>open'), MessageError);
});
test('shape: blanks and branches, to compare a translation with English', () => {
  assert.deepEqual(shape(parse('{n, plural, one {# a} other {# b}} {d}')), shape(parse('{d} {n, plural, other {# x}}')));
  assert.notDeepEqual(shape(parse('{d}')), shape(parse('{e}')));
  assert.notDeepEqual(shape(parse('<b>x</b>')), shape(parse('x')));
});

/* ---------- the class ---------- */
test('digits in each script, and durations', () => {
  const want = { mr: '१२३', hi: '१२३', en: '123', gu: '૧૨૩', bn: '১২৩', ta: '௧௨௩' };
  for (const [code, d] of Object.entries(want)) { const i = make(); i.setLocale(code); assert.equal(i.num(123), d, code); }
  const g = make(); g.setLocale('gu');
  assert.equal(g.time(95), '૧:૩૫'); assert.equal(g.time(5), '૦:૦૫'); assert.equal(g.num(2.5), '૨.૫');
  const e = make(); e.setLocale('en'); assert.equal(e.time(600), '10:00');
});
test('fallback chain: own language, then its fallbacks, then English', () => {
  const i = make(); i.setLocale('gu');                               // gu has only "count"; falls back to hi, then en
  assert.equal(i.t('hello'), 'नमस्ते');                                // from hi
  assert.equal(i.t('only_en'), 'Only English');                       // from en
  assert.equal(i.t('count', { n: 2 }), '૨ રચનાઓ');                    // its own, with gu digits and plural
  i.setLocale('mr'); assert.equal(i.t('only_hi'), 'सिर्फ हिन्दी');     // mr -> hi
});
test('a missing key: ⟦key⟧ in development, the key itself (silently) in a release', () => {
  const warnings = []; const dev = make({ dev: true, warn: m => warnings.push(m) });
  assert.equal(dev.t('nope'), '⟦nope⟧'); dev.t('nope'); assert.equal(warnings.length, 1);          // logged once
  const rel = make({ dev: false, warn: m => warnings.push(m) }); assert.equal(rel.t('nope'), 'nope'); assert.equal(warnings.length, 1);
});
test('a broken translation is skipped in favour of the next language, and reported once', () => {
  const w = []; const i = new I18n({ languages: LANGS, messages: { ...MSG, mr: { ...MSG.mr, hello: 'broken {' } }, defaultLanguage: 'mr', warn: m => w.push(m) });
  assert.equal(i.t('hello'), 'नमस्ते'); i.t('hello'); assert.equal(w.length, 1);
});
test('the first language: stored choice, then the browser\'s preference, then the default', () => {
  assert.equal(make().code, 'mr');
  assert.equal(make({ preferred: ['gu-IN', 'en'] }).code, 'gu');
  assert.equal(make({ preferred: ['fr-FR', 'hi'] }).code, 'hi');
  const store = new MemoryKv(); store.set('lang', '"en"');
  assert.equal(make({ store, preferred: ['hi'] }).code, 'en');       // v1.1.0 stored the choice as JSON under ghosh.lang
  store.set('lang', '"xx"'); assert.equal(make({ store }).code, 'mr'); // an unknown stored code is ignored
});
test('setLocale: keeps the choice, updates the document, tells listeners once, refuses unknown codes', () => {
  const store = new MemoryKv(), props = {}; const doc = { documentElement: { lang: '', style: { setProperty: (k, v) => { props[k] = v; } } } };
  const i = make({ store, document: doc }); const heard = []; const off = i.onChange(c => heard.push(c));
  assert.equal(i.setLocale('xx'), false); assert.deepEqual(heard, []);
  assert.equal(i.setLocale('gu'), true); i.setLocale('gu');
  assert.deepEqual(heard, ['gu']); assert.equal(store.get('lang'), '"gu"'); assert.equal(doc.documentElement.lang, 'gu'); assert.equal(props['--f-lang'], 'F-gu');
  off(); i.setLocale('en'); assert.deepEqual(heard, ['gu']);
});
test('hidden languages are built but not listed', () => {
  assert.deepEqual(make().listed().map(l => l.code), ['mr', 'hi', 'en', 'gu', 'bn']);
});
test('tb gives safe HTML with <b>; t gives plain text', () => {
  const i = make(); i.setLocale('en');
  assert.equal(i.tb('bold'), 'Press <b>Play</b> now'); assert.equal(i.t('bold'), 'Press Play now');
});
test('apply fills text, <b> html and attributes under a root', () => {
  const el = (attrs) => ({ attrs: { ...attrs }, textContent: '', innerHTML: '', getAttribute(n) { return this.attrs[n] ?? null; }, setAttribute(n, v) { this.attrs[n] = v; } });
  const a = el({ 'data-i18n': 'hello' }), b = el({ 'data-i18n-html': 'bold' }), c = el({ 'data-i18n-attr': 'aria-label:hello;placeholder:only_en' });
  const root = { querySelectorAll: sel => ({ '[data-i18n]': [a], '[data-i18n-html]': [b], '[data-i18n-attr]': [c] }[sel] ?? []) };
  const i = make(); i.setLocale('en'); i.apply(root);
  assert.equal(a.textContent, 'Hello'); assert.equal(b.innerHTML, 'Press <b>Play</b> now'); assert.deepEqual([c.attrs['aria-label'], c.attrs.placeholder], ['Hello', 'Only English']);
});

test('name(): as printed, as roman letters, or written in the script of the language, with corrections', () => {
  const i = new I18n({ languages: LANGS, messages: MSG, defaultLanguage: 'mr', warn: () => {}, nameOverrides: { Gujr: { 'केदार': 'કેદાર!' } } });
  assert.equal(i.name('केरवा', 'Kerva'), 'केरवा');                         // Marathi: Devanagari as printed
  i.setLocale('en'); assert.equal(i.name('केरवा', 'Kerva'), 'Kerva');
  i.setLocale('gu'); assert.equal(i.name('केरवा', 'Kerva'), 'કેરવા');
  assert.equal(i.name('केदार', 'Kedar'), 'કેદાર!');                         // a correction wins
  assert.equal(i.name('केरवा', 'Kerva', 'hi'), 'केरवा');                   // another language's view, for tests and tables
});
test('chain(): the language, its fallbacks, then English, only languages that have texts', () => {
  const i = make();
  assert.deepEqual(i.chain('mr'), ['mr', 'hi', 'en']);
  assert.deepEqual(i.chain('hi'), ['hi', 'mr', 'en']);
  assert.deepEqual(i.chain('en'), ['en']);
});
