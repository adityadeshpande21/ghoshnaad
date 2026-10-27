// @ts-nocheck — moved from v1.1.0 (app.js) unchanged except for being a function of the store; not fully typed yet.
// भाषा / language: the three language tables (Marathi, Hindi, English), the helpers that read them, and the static page text.
// Other screens add their own texts to the same tables at start-up (Object.assign(I18N[l], …)).

/** @param {{ get: (k: string, d?: any) => any }} store */
export function createI18n(store) {
// Notation (swaras, bols, ऽ –, ending/yati numbers) always stays as printed in the books.
const I18N={
 mr:{lang:'मराठी',brand:'घोषनाद',tagline:'घोष रचना · वादन · लेखन',count:n=>`${n} रचना`,search:'रचना, राग किंवा ताल शोधा',searchA:'रचना शोधा',instF:'वाद्यानुसार',secA:'विभाग',listA:'रचना यादी',
  all:'सर्व',prachalan:'प्रचलन',mand:'मंद गति',naimittik:'नैमित्तिक',recent:'अलीकडे',allR:'सर्व रचना',found:n=>`सापडल्या: ${n}`,
  none:q=>`"${q}" साठी काही सापडले नाही. नाव, राग किंवा ताल वापरून पहा.`,raga:'राग',openErr:'ही रचना उघडता आली नाही. इंटरनेट तपासून पुन्हा प्रयत्न करा.',listErr:'यादी उघडता आली नाही. पान पुन्हा उघडा.',
  playerA:'वादन',back:'यादीकडे परत',settings:'सेटिंग्ज',theme:'रंग: उजळ / गडद',chipsA:'कोणती वाद्ये ऐकायची',hint:'टॅप = फक्त ते वाद्य · दाबून ठेवा = जोडा / काढा',
  blocksA:'चरणावर जा',goTo:x=>`${x} वर जा`,modesA:'वादन प्रकार',perf:'पूर्ण वादन',printed:'ग्रंथ क्रम',once:'एकदाच',anagat:'अनागत',playL:'वादन',pitchL:'वादनाची पट्टी (सा)',pitchN:'सर्व रचनांसाठी. सांतर/निरंतर आणि कण स्वरही इथेच.',artL:'सांतर / निरंतर',santar:'सांतर',santarS:'प्रत्येक सूर किंचित आधी थांबतो',nirantar:'निरंतर',nirantarS:'पूर्ण कालांश वाजतो',kanL:'कण स्वर (उदा. म्ग मधील म)',ms:n=>`${n} मि.से.`,onceA:'प्रत्येक चरण एकदाच',loop:'चरण',loopA:'हाच चरण पुन्हा पुन्हा',laya:'लय',slower:'लय कमी',faster:'लय जास्त',
  march:'संचलन',marchA:'संचलन सराव',play:'वाजवा',stop:'थांबवा',marchClose:'संचलन बंद',left:'डावा',right:'उजवा',sam:'सम',step:n=>`पाऊल ${n}`,stepSnd:'पाऊल<br>आवाज',stepSndA:'पावलांचा आवाज',
  mandchal:'मंदचाल',prev:'मागे',now:'आता',next:'पुढे',done:'पूर्ण',close:'बंद',
  ranan:'रणन',prarambhik:'प्रारंभिक',setu:'सेतु',charan:n=>`चरण ${n}`,twice:'दोनदा',times:n=>`${n} वेळा`,tail:x=>`शेवटी ${x} पुन्हा, दोनदा`,rananAnak:'रणन · आनक',
  bR:'र',bPr:'प्रा',bSe:'से',countIn:null,
  parts:{shankh:'शंख',vanshi:'वंशी',anak:'आनक',panav:'पणव',jhallari:'झल्लरी',tribhuj:'त्रिभुज',steps:'पाऊल'},
  groups:{shankh:'शंख भाग',vanshi:'वंशी भाग',anak:'आनक भाग',tal:'ताल वाद्य'},needOne:'किमान एक वाद्य निवडलेले असावे',
  sheetP:'प्रत्येक भाग कोणती वाद्ये वाजवतील ते निवडा. सर्व रचनांसाठी लागू.',langL:'भाषा',instL:'वाद्य निवड',
  latinDigits:false,romanNames:false},
 hi:{lang:'हिंदी',brand:'घोषनाद',tagline:'घोष रचना · वादन · लेखन',count:n=>`${n} रचनाएँ`,search:'रचना, राग या ताल खोजें',searchA:'रचना खोजें',instF:'वाद्य के अनुसार',secA:'विभाग',listA:'रचना सूची',
  all:'सभी',prachalan:'प्रचलन',mand:'मंद गति',naimittik:'नैमित्तिक',recent:'हाल में',allR:'सभी रचनाएँ',found:n=>`मिलीं: ${n}`,
  none:q=>`"${q}" के लिए कुछ नहीं मिला। नाम, राग या ताल से खोजें।`,raga:'राग',openErr:'यह रचना खुल नहीं सकी। इंटरनेट जाँचकर फिर कोशिश करें।',listErr:'सूची खुल नहीं सकी। पेज फिर से खोलें।',
  playerA:'वादन',back:'सूची पर वापस',settings:'सेटिंग्स',theme:'रंग: हल्का / गहरा',chipsA:'कौन से वाद्य सुनें',hint:'टैप = केवल वह वाद्य · दबाकर रखें = जोड़ें / हटाएँ',
  blocksA:'चरण पर जाएँ',goTo:x=>`${x} पर जाएँ`,modesA:'वादन क्रम',perf:'पूर्ण वादन',printed:'पुस्तक क्रम',once:'एक बार',anagat:'अनागत',playL:'वादन',pitchL:'वादन की पट्टी (सा)',pitchN:'सभी रचनाओं के लिए।',artL:'सांतर / निरंतर',santar:'सांतर',santarS:'हर स्वर थोड़ा पहले रुकता है',nirantar:'निरंतर',nirantarS:'पूरा कालांश बजता है',kanL:'कण स्वर (जैसे म्ग में म)',ms:n=>`${n} मि.से.`,onceA:'हर चरण एक बार',loop:'चरण',loopA:'यही चरण बार-बार',laya:'लय',slower:'लय कम',faster:'लय ज़्यादा',
  march:'संचलन',marchA:'संचलन अभ्यास',play:'बजाएँ',stop:'रोकें',marchClose:'संचलन बंद करें',left:'बायाँ',right:'दायाँ',sam:'सम',step:n=>`कदम ${n}`,stepSnd:'कदम<br>ध्वनि',stepSndA:'कदमों की आवाज़',
  mandchal:'मंद चाल',prev:'पिछला',now:'अभी',next:'अगला',done:'पूर्ण',close:'बंद करें',
  ranan:'रणन',prarambhik:'प्रारंभिक',setu:'सेतु',charan:n=>`चरण ${n}`,twice:'दो बार',times:n=>`${n} बार`,tail:x=>`अंत में ${x} फिर से, दो बार`,rananAnak:'रणन · आनक',
  bR:'र',bPr:'प्रा',bSe:'से',countIn:null,
  parts:{shankh:'शंख',vanshi:'वंशी',anak:'आनक',panav:'पणव',jhallari:'झल्लरी',tribhuj:'त्रिभुज',steps:'कदम'},
  groups:{shankh:'शंख भाग',vanshi:'वंशी भाग',anak:'आनक भाग',tal:'ताल वाद्य'},needOne:'कम से कम एक वाद्य चुना होना चाहिए',
  sheetP:'हर भाग कौन से वाद्य बजाएँगे, चुनें। सभी रचनाओं पर लागू।',langL:'भाषा',instL:'वाद्य चयन',
  latinDigits:true,romanNames:false},
 en:{lang:'English',brand:'Ghoshnaad',tagline:'Ghosh rachanas · play · write',count:n=>`${n} rachanas`,search:'Search rachana, raga or tala',searchA:'Search rachanas',instF:'Instrument',secA:'Section',listA:'Rachana list',
  all:'All',prachalan:'Prachalan',mand:'Mand gati',naimittik:'Naimittik',recent:'Recent',allR:'All rachanas',found:n=>`Found: ${n}`,
  none:q=>`Nothing found for "${q}". Try a name, raga or tala.`,raga:'Raga',openErr:"Couldn't open this rachana. Check your connection and try again.",listErr:"Couldn't load the list. Reopen the page.",
  playerA:'Player',back:'Back to list',settings:'Settings',theme:'Theme: light / dark',chipsA:'Instruments to hear',hint:'Tap = only that instrument · Hold = add / remove',
  blocksA:'Jump to charan',goTo:x=>`Go to ${x}`,modesA:'Play order',perf:'Performance',printed:'Book order',once:'Once',anagat:'Pickup (anagat)',playL:'Playing',pitchL:'Key (Sa)',pitchN:'For all rachanas.',artL:'Santar / Nirantar',santar:'Santar',santarS:'Each note stops a little early',nirantar:'Nirantar',nirantarS:'Each note plays its full length',kanL:'Grace note (e.g. म in म्ग)',ms:n=>`${n} ms`,onceA:'Each charan once',loop:'Loop',loopA:'Repeat this charan',laya:'Tempo',slower:'Slower',faster:'Faster',
  march:'March',marchA:'March practice',play:'Play',stop:'Stop',marchClose:'Close march practice',left:'Left',right:'Right',sam:'Sam',step:n=>`Step ${n}`,stepSnd:'Step<br>sound',stepSndA:'Step sound',
  mandchal:'slow march',prev:'Previous',now:'Now',next:'Next',done:'Done',close:'Close',
  ranan:'Ranan',prarambhik:'Prarambhik',setu:'Setu',charan:n=>`Charan ${n}`,twice:'twice',times:n=>`${n}×`,tail:x=>`At the end, ${x} again, twice`,rananAnak:'Ranan · Anak',
  bR:'R',bPr:'Pr',bSe:'Se',countIn:null,countWord:w=>({'एक':'1','दो':'2','तीन':'3'})[w]||w,
  parts:{shankh:'Shankh',vanshi:'Vanshi',anak:'Anak',panav:'Panav',jhallari:'Jhallari',tribhuj:'Tribhuj',steps:'Steps'},
  groups:{shankh:'Shankh part',vanshi:'Vanshi part',anak:'Anak part',tal:'Tal vadya'},needOne:'Keep at least one instrument',
  sheetP:'Choose which instruments play each part. Applies to every rachana.',langL:'Language',instL:'Instruments',
  latinDigits:true,romanNames:true}};
const TALA_ROM={'केरवा':'Kerva','खेमटा':'Khemta','दादरा':'Dadra','एकताल':'Ektal','त्रिताल':'Tritaal','झपताल':'Jhaptal','रूपक':'Rupak'};
const RAGA_ROM={'आसावरी':'Asavari','कलावती':'Kalavati','कलिंगड़ा':'Kalingada','कल्याण':'Kalyan','केदार':'Kedar','खमाज':'Khamaj','गौडमल्हार':'Gaud Malhar','तिलंग':'Tilang','तिलक श्याम':'Tilak Shyam','तिलककामोद':'Tilak Kamod','तोड़ी':'Todi','दुर्गा':'Durga','देश':'Desh','देशकार':'Deshkar','धानी':'Dhani','पहाड़ी':'Pahadi','पिलू':'Pilu','बहार':'Bahar','बागेश्री':'Bageshri','बागेश्री-२':'Bageshri-2','बिलावल':'Bilawal','भिन्नषड्ज':'Bhinna Shadja','भीमपलास':'Bhimpalas','भूप':'Bhoop','भैरवी':'Bhairavi','मांड':'Maand','मारवा':'Marwa','मिश्र काफी':'Mishra Kafi','मेचकल्याणी':'Mechakalyani','रंजनी':'Ranjani','रागेश्री':'Rageshri','रेवति':'Revati','शंकरा':'Shankara','शिवरंजनी':'Shivranjani','श्यामकल्याण':'Shyam Kalyan','सारंग':'Sarang','हंसध्वनि':'Hamsadhvani'};
const INST_NAMES={bugle:['शंख','Bugle'],trumpet:['तूर्य','Trumpet'],flute:['वंशी','Flute'],venu:['वेणु','Bamboo flute'],clarinet:['स्वरद','Clarinet'],sax:['नागांग','Saxophone'],melodica:['मधुरिका','Melodica'],side:['आनक','Side drum'],bass:['पणव','Bass drum'],cym:['झल्लरी (झांज)','Cymbals'],tri:['त्रिभुज','Triangle']};
let LANG=(()=>{const s=store.get('lang',null);if(s&&I18N[s])return s;const ls=(navigator.languages||[navigator.language||'']).map(x=>String(x).toLowerCase());
  for(const l of ls){if(l.startsWith('mr'))return 'mr';if(l.startsWith('hi'))return 'hi'}return 'mr'})();
const L=()=>I18N[LANG];
function tx(k,...a){const v=L()[k];return typeof v==='function'?v(...a):v}
const talaName=d=>L().romanNames?(TALA_ROM[d]||d):d;
const ragaName=d=>L().romanNames?(RAGA_ROM[d]||d):d;
function applyStatic(){document.documentElement.lang=LANG;
  document.querySelectorAll('[data-t]').forEach(e=>{e.innerHTML=tx(e.dataset.t)});
  document.querySelectorAll('[data-ta]').forEach(e=>e.setAttribute('aria-label',tx(e.dataset.ta)));
  document.querySelectorAll('[data-tp]').forEach(e=>e.setAttribute('placeholder',tx(e.dataset.tp)))}

const secName=k=>{if(k==='naimittik')return tx('naimittik');const [a,b]=k.split('-');return tx(a)+' · '+tx('parts')[b]};
return { I18N, TALA_ROM, RAGA_ROM, INST_NAMES, L, tx, talaName, ragaName, applyStatic, secName,
  get LANG() { return LANG; }, setLang(l) { LANG = l; } };
}
