// Moved from v1.1.0 (app.js). Checked by tsc as plain JavaScript (tsconfig.loose.json: wrong names, properties and argument types fail; implicit any is allowed).
// भाषा / language: the I18n class over the translation files in src/i18n, and the small helpers the screens share.
// Screens write `i18n.t('screen.key', { name: value })`; names of talas and ragas are data, not texts.
import { I18n } from '../i18n/i18n.ts';
import { LocalKv } from '../data/kv.ts';
import languages from '../i18n/languages.json';
import messages from 'virtual:languages/messages';     // every language of languages.json (build/lib/languages.mjs)
import nameOverrides from 'virtual:languages/names';   // rules/names/<script>.json

export function createI18n() {
// names of talas, ragas and instruments (data, not screen text: they move with the name transliteration)
const TALA_ROM={'केरवा':'Kerva','खेमटा':'Khemta','दादरा':'Dadra','एकताल':'Ektal','त्रिताल':'Tritaal','झपताल':'Jhaptal','रूपक':'Rupak'};
const RAGA_ROM={'आसावरी':'Asavari','कलावती':'Kalavati','कलिंगड़ा':'Kalingada','कल्याण':'Kalyan','केदार':'Kedar','खमाज':'Khamaj','गौडमल्हार':'Gaud Malhar','तिलंग':'Tilang','तिलक श्याम':'Tilak Shyam','तिलककामोद':'Tilak Kamod','तोड़ी':'Todi','दुर्गा':'Durga','देश':'Desh','देशकार':'Deshkar','धानी':'Dhani','पहाड़ी':'Pahadi','पिलू':'Pilu','बहार':'Bahar','बागेश्री':'Bageshri','बागेश्री-२':'Bageshri-2','बिलावल':'Bilawal','भिन्नषड्ज':'Bhinna Shadja','भीमपलास':'Bhimpalas','भूप':'Bhoop','भैरवी':'Bhairavi','मांड':'Maand','मारवा':'Marwa','मिश्र काफी':'Mishra Kafi','मेचकल्याणी':'Mechakalyani','रंजनी':'Ranjani','रागेश्री':'Rageshri','रेवति':'Revati','शंकरा':'Shankara','शिवरंजनी':'Shivranjani','श्यामकल्याण':'Shyam Kalyan','सारंग':'Sarang','हंसध्वनि':'Hamsadhvani'};
const INST_NAMES={bugle:['शंख','Bugle'],trumpet:['तूर्य','Trumpet'],flute:['वंशी','Flute'],venu:['वेणु','Bamboo flute'],clarinet:['स्वरद','Clarinet'],sax:['नागांग','Saxophone'],melodica:['मधुरिका','Melodica'],side:['आनक','Side drum'],bass:['पणव','Bass drum'],cym:['झल्लरी (झांज)','Cymbals'],tri:['त्रिभुज','Triangle']};
// v1.1.0 chose Marathi, or Hindi when the browser prefers it, and Marathi for everything else (English included)
const preferred = (navigator.languages || [navigator.language || '']).filter(l => /^(mr|hi)/i.test(String(l)));
const core = new I18n({ languages: /** @type {any} */ (languages), messages, nameOverrides, store: new LocalKv(), preferred, defaultLanguage: 'mr', document });
const talaName = d => core.name(d, TALA_ROM[d]);
const ragaName = d => core.name(d, RAGA_ROM[d]);
function applyStatic() { document.documentElement.lang = core.code; core.apply(document); }   // data-i18n, data-i18n-html, data-i18n-attr
const secName=k=>{if(k==='naimittik')return core.t('list.naimittik');const [a,b]=k.split('-');return core.t('list.'+a)+' · '+core.t('common.parts.'+b)};
return { core, TALA_ROM, RAGA_ROM, INST_NAMES, talaName, ragaName, applyStatic, secName,
  t: (k, p) => core.t(k, p), name: (dev, rom) => core.name(dev, rom), chain: () => core.chain(), tb: (k, p) => core.tb(k, p), has: k => core.has(k), apply: root => core.apply(root), onChange: cb => core.onChange(cb),
  get script() { return core.language.script; }, get romanNames() { return core.language.names === 'roman'; }, get latinDigits() { return core.language.digits === 'latn'; },
  get languages() { return core.languages; }, hasLanguage: l => core.languages.some(x => x.code === l),
  get LANG() { return core.code; }, setLang(l) { core.setLocale(l); } };
}
