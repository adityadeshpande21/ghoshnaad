
/* guide.js — स्वरलिपी मार्गदर्शक: every notation sign and marking used in the app, for all instruments,
 * with the sign drawn exactly as the player draws it, how it is typed (editor / files), and how the app plays it. */
(function () {
'use strict';

/* ---------- a tiny renderer for samples: uses the player's own slot / matra drawing ---------- */
const STROKES = { 'त्र': 'roll', 'थ्र': 'thra', 'त': 'ta', 'थ': 'tha', '+': 'click', 'ध्व': 'dhvam', 'झ': 'jham', 'ट': 'tam' };
const SW = { 'स': 'S', 'री': 'R', 'ग': 'G', 'म': 'M', 'प': 'P', 'ध': 'D', 'नि': 'N' };
const SYMS = ['ध्व', 'त्र', 'थ्र', 'री', 'नि', 'स', 'ग', 'म', 'प', 'ध', 'त', 'थ', 'झ', 'ट', '+', 'ऽ', '–'];
function readSym(s, i) {
  for (const k of SYMS) if (s.startsWith(k, i)) {
    i += k.length; let o;
    if (SW[k]) { o = { type: 'note', dev: k, swara: SW[k], octave: 0 }; while (/[.'_]/.test(s[i] || '')) { if (s[i] === '.') o.octave--; else if (s[i] === "'") o.octave++; else o.vikrit = true; i++; } }
    else if (k === 'ऽ') o = { type: 'hold' }; else if (k === '–') o = { type: 'rest' };
    else o = { type: 'stroke', dev: k, stroke: STROKES[k] };
    for (;;) { const c = s[i]; if (c === '^') o.accent = true; else if (c === '!') o.fermata = true; else if (c === '<') o.swell = 'grow'; else if (c === '>') o.swell = 'fade'; else break; i++; }
    return [o, i];
  }
  return [null, i + 1];
}
function sample(src) {
  const out = []; let i = 0, slurOn = false, lastSlot = null, group = null, grace = null;
  const add = sl => { if (grace) { sl.grace = grace; grace = null; } if (slurOn) { sl.slur = lastSlot && lastSlot.slur ? 'mid' : 'start'; } lastSlot = sl; if (group) group.push(sl); else out.push({ m: { slots: [sl] } }); };
  while (i < src.length) {
    const c = src[i];
    if (c === ' ') { i++; continue; }
    if (c === '[') { group = []; i++; continue; }
    if (c === ']') { out.push({ m: { slots: group, group: true } }); group = null; i++; continue; }
    if (c === '(') { slurOn = true; lastSlot = null; i++; continue; }
    if (c === ')') { if (lastSlot) lastSlot.slur = 'end'; slurOn = false; i++; continue; }
    if (c === '|' || c === ',') { out.push({ bar: c }); i++; continue; }
    if (c === '`') { const [o, j] = readSym(src, i + 1); grace = [o]; i = j; continue; }
    const [o, j] = readSym(src, i); if (o) add(o); i = j;
  }
  return out.map(x => x.bar ? `<span class="gd-bar">${x.bar}</span>` : matraHTML(x.m)).join('');
}
const N = (src, cls = '') => `<span class="gd-n ${cls}">${sample(src)}</span>`;
const T = s => `<span class="gd-t">${esc(s)}</span>`;          // a sign shown as plain text (bar lines, cues …)

/* ---------- content ----------
 * rows: [drawn sign (HTML), how it is written in files / editor, name, meaning, how the app plays it] */
const C = {
 mr: {
  title: 'स्वरलिपी मार्गदर्शक', intro: 'घोष ग्रंथांतील स्वरलिपीचे प्रत्येक चिन्ह — ते ॲपमध्ये कसे दिसते, संपादकात कसे लिहायचे आणि ॲप ते कसे वाजवते.',
  head: ['चिन्ह', 'लिहा', 'अर्थ', 'ॲप कसे वाजवते'],
  s: [
   { id: 'read', t: 'स्वरलिपी कशी वाचावी', p: ['प्रत्येक भागाची (शंख / वंशी / आनक) वेगळी ओळ असते; ॲपमध्ये एकाच चरणाच्या ओळी एकाखाली एक दिसतात आणि त्याखाली ताल वाद्यांची लहान ओळ.',
     '<b>मात्रा</b> = तालाचे एक एकक (एक ठोका). <b>गण</b> = काही मात्रांचा गट (केरवा: २ मात्रा). <b>गट</b> = गणाचा उपविभाग (खेमटा: ३ + ३). <b>लय</b> = एका मिनिटातील मात्रा (केरवा १२० = प्रत्येक मात्रा अर्धा सेकंद).',
     'वाजत असलेला गण रंगीत दिसतो; ओळीवर टॅप केल्यास तिथून वादन सुरू होते.'],
     ex: ['॥ॐ॥ स [ऽरी] | ग_ ग_ | प [ऽध] | [पग_] [रीस] |', 'शिवरंजनी, वंशी — पहिली ओळ: ४ गण × २ मात्रा'] },
   { id: 'form', t: 'रचनेचा आराखडा', rows: [
     [T('॥ॐ॥'), '॥ॐ॥', 'आरंभ', 'रचनेची सुरुवात.', '—'],
     [T('॥ … ॥'), '॥', 'चरण', 'दोन ॥ मधील भाग म्हणजे एक चरण.', 'चरणाच्या शेवटच्या पावलावर पणव थांबतो, झल्लरी-त्रिभुज मोठ्याने.'],
     [T('|'), '|', 'गण', 'गणांमधील रेषा.', '—'],
     [T(','), ',', 'गट', 'गणातील गटांमधील विभागणी (खेमटा, झपताल, रूपक).', '—'],
     [T(':॥'), ':॥', 'पुनरावृत्ती', 'चरण दोनदा वाजवा.', 'पूर्ण वादनात दोनदा; "एकदाच" मध्ये एकदा.'],
     [T('↪ अनागत'), '॥ॐ॥ , ––प. ॥', 'अनागत', 'समेच्या आधी वाजणाऱ्या मात्रा — चरणापूर्वी वेगळ्या लहान ओळीत छापलेल्या (उदा. स्वागत प्रणाम, चेतक).', 'चरणाच्या अगदी आधी; पूर्ण वादनात रणनाच्या शेवटच्या शांत पावलावर. ॲपमध्ये चरणाच्या वर उजवीकडे दिसते.'],
     [T('¹ … ²'), '{1 … } {2 … }', 'पहिला / दुसरा अंत', 'पहिल्या वेळी ¹ चा भाग, दुसऱ्या वेळी ² चा. ॲपमध्ये दोन्ही अंत एकाच स्तंभात, वर रेषेसह दिसतात.', 'असे चरण "एकदाच" मध्येही दोनदा वाजतात.'],
     [T('यति ४'), '@yati=4', 'दीर्घ यति', 'इतके गण सर्व भाग थांबतात.', 'मौन; पणव मात्र पावलांवर चालू.'],
     [T('ॐ'), '"ॐ":4', 'उच्चार', 'ॐ / मंत्र इत्यादी — लिहिलेल्या मात्रांइतका.', 'मौन (उच्चार तुम्ही करायचा).'],
     [T('प्रारंभिक'), '—', 'प्रारंभिक', 'पहिल्या चरणाआधीची एकच ओळ, एकदाच.', 'एकदा.'],
     [T('सेतु / ध्रुवपद'), '#…', 'नाव', 'चरणाचे नाव (सेतु = जोडणारा भाग).', '—'],
     [T('रणन'), '—', 'रणन', 'रचनेपूर्वी आनकाची एक ओळ, आठ पावले: त्रऽऽ ऽऽऽ त – (दोनदा). खेमटा रचनांपूर्वीही केरव्यात.', 'पूर्ण वादनात सुरुवातीला; ४ थ्या व ८ व्या पावलावर पणव नाही.'],
     [T('* ?'), '* ?', 'टीप / शंका', '* = ग्रंथातील तळटीप; ? = वाचन अनिश्चित.', '—']],
     note: '<b>पूर्ण वादन</b>: रणन → प्रारंभिक → सर्व चरण (:॥ असल्यास दोनदा) → पहिला चरण पुन्हा दोनदा. <b>ग्रंथ क्रम</b>: छापल्याप्रमाणे. <b>एकदाच</b>: प्रत्येक चरण एकदा (¹/² असलेले दोनदा), रणन नाही.' },
   { id: 'swar', t: 'स्वर — शंख, वंशी आणि इतर स्वर वाद्ये', rows: [
     [N('स री ग म प ध नि'), 'स री ग म प ध नि', 'सात स्वर', 'मध्य सप्तक.', 'शंख भाग: सा = B♭4; वंशी भाग: सा = F♯5 (सेटिंग्जमध्ये बदलता येते).'],
     [N('प.'), 'प.', 'मंद्र', 'खाली बिंदू = खालचे सप्तक.', 'एक सप्तक खाली.'],
     [N("स'"), "स'", 'तार', 'वर बिंदू = वरचे सप्तक.', 'एक सप्तक वर.'],
     [N('ग_ नि_'), 'ग_ नि_', 'कोमल', 'खाली रेषा: री ग ध नि कोमल.', 'अर्धा स्वर खाली.'],
     [N('म_'), 'म_', 'तीव्र म', 'म खाली रेषा = तीव्र म.', 'अर्धा स्वर वर.'],
     [N('स ऽ'), 'ऽ', 'स्वर चालू', 'आधीचा स्वर या मात्रेतही.', 'स्वर लांबवला जातो.'],
     [N('स –'), '– किंवा -', 'विराम', 'शांत.', 'मौन.'],
     [N('[सरी]'), '[सरी]', 'एका मात्रेत', 'खाली कंस = हे स्वर एकाच मात्रेत (समान वाटून).', '२ स्वर = अर्धी-अर्धी मात्रा, ४ = पाव-पाव.'],
     [N('(स री ग)'), '( … )', 'निरंतर (वर रेषा)', 'वर रेषा असलेले स्वर — उदा. सरीग जोडून — न तोडता सलग वाजवा.', 'स्वरांमध्ये अंतर नाही, स्वर एकमेकांत मिसळतात; गटाचा शेवटचा स्वरच सांतर नियमाने थांबतो.'],
     [N('`मग'), '`मग', 'कण स्वर', 'लहान स्वर मुख्य स्वराच्या सुरुवातीला अगदी थोडा.', 'ठोक्यावर म ~६० मि.से., मग ग (लांबी सेटिंग्जमध्ये).'],
     [N('ग^'), 'ग^', 'आघात', 'जोर देऊन वाजवा.', 'तीक्ष्ण सुरुवात, थोडा मोठा.'],
     [N('स!'), 'स!', 'लयभंग', 'लयभंग: स्वर लिहिलेल्यापेक्षा जास्त वेळ वाजवा (विशेषतः शेवटचा).', 'पुढच्या विरामात लांबवला जातो — स्वत:च्या लांबीइतका, जास्तीत जास्त २ मात्रा.'],
     [N('प< ग>'), '< >', 'आवाज वाढ / घट', 'स्वराचा आवाज वाढवत / कमी करत.', 'आवाज हळूहळू वाढतो / कमी होतो.']],
     note: '<b>शंख</b> (बिगुल) फक्त <b>प़ स ग प</b> (आणि क्वचित नि_ स\') वाजवू शकतो; संपादक इतर स्वरांवर सूचना देतो. <b>सांतर</b> (मूळ): प्रत्येक स्वर कालांशापेक्षा किंचित आधी थांबतो; <b>निरंतर</b>: पूर्ण कालांश. वंशी भागासाठी वंशी, वेणु, स्वरद (clarinet), नागांग (sax), मधुरिका; शंख भागासाठी शंख, तूर्य, मधुरिका निवडता येतात.' },
   { id: 'anak', t: 'आनक (साइड ड्रम) — बोल', rows: [
     [N('त'), 'त', 'तंकार', 'एका काठीचा एक आघात.', 'एक आघात.'],
     [N('त्र'), 'त्र', 'रणन (रोल)', 'एक मात्रा सतत आघात.', 'केरवा (आणि इतर ताल): प्रत्येक मात्रेत ४ तंकार, प्रत्येकानंतर एक अनुतंकार. खेमटा: प्रत्येक मात्रेत १ तंकार + २ अनुतंकार, गटाच्या पहिल्या मात्रेवर हलका आघात.'],
     [N('`त्रत'), 'त्र्त  (`त्रत)', 'त्र्त', 'मुख्य तंकाराच्या किंचित आधी दुसऱ्या शारिकेने अनुतंकारासह तंकार (घोष परिचय पृ. ४६).', 'ठोक्याच्या अगदी आधी त + अनुतंकार, मग ठोक्यावर त.'],
     [N('थ'), 'थ', 'दोन काठ्या', 'दोन्ही काठ्या एकत्र.', 'जोरदार दुहेरी आघात.'],
     [N('थ्र'), 'थ्र', 'दोन काठ्या + उसळी', 'दोन्ही काठ्या एकत्र, मग उसळता आघात.', 'जोरदार आघात व लहान रोल.'],
     [N('+'), '+', 'काठी-ठोका', 'काठ्या एकमेकांवर.', 'खटका; या ठोक्यावर ताल वाद्ये वाजत नाहीत.'],
     [N('[तत] [–त]'), '[तत] [–त]', 'मात्रेत विभाग', 'एका मात्रेत दोन आघात / आधी विराम मग आघात.', 'अर्धी-अर्धी मात्रा.'],
     [N('त ऽ –'), 'ऽ –', 'चालू / विराम', 'ऽ = आघाताचा आवाज चालू; – = शांत.', '—'],
     [N('`तत'), '`तत', 'पूर्व-आघात', 'मुख्य आघाताआधी अगदी लहान आघात.', 'ठोक्याच्या किंचित आधी हलका आघात.'],
     [N('त^'), 'त^', 'आघात', 'जोर देऊन.', 'मोठा आघात.']] },
   { id: 'tal', t: 'ताल वाद्ये — पणव, झल्लरी, त्रिभुज', p: ['ही ग्रंथात छापलेली नसतात; ॲप तालावरून ती लिहिते. ॲपमध्ये प्रत्येक चरणाखाली "ताल वाद्ये" अशी लहान ओळ दिसते.'], rows: [
     [N('ध्व', 'tv'), '—', 'पणव (बेस ड्रम) — ध्वंकार', 'प्रत्येक पावलावर (आनक विराम / यती असला तरी).', 'खोल धुमधुम.'],
     [N('ध्व^', 'tv'), '—', 'सम', 'तालाची पहिली मात्रा.', 'थोडा जोरात.'],
     [N('–', 'tv'), '—', 'पणव नाही', 'आनकावर + असेल तेव्हा; चरणाच्या शेवटच्या पावलावर; रणनात ४ थ्या व ८ व्या पावलावर (तिथे झल्लरी-त्रिभुजही नाहीत).', 'पणव शांत.'],
     [N('झ^', 'tv'), '—', 'झल्लरी + त्रिभुज मोठ्याने', 'चरणाच्या शेवटच्या पावलावर, जिथे पणव शांत असतो.', 'झांज आणि त्रिभुज जोरात.'],
     [N('ध्व ऽ ऽ', 'tv'), '—', 'पावलांमधील मात्रा', 'खेमटा / दादरा: एका पावलात ३ मात्रा.', '—']],
     note: 'झल्लरी (झांज) आणि त्रिभुज प्रत्येक ध्वंकारासोबत वाजतात. फक्त शंखाच्या रचनांना (उदा. संघोष) ताल वाद्ये नसतात. वादनापूर्वी अंक-ताल: "एक दो, एक दो" (दादरा: "एक दो तीन, एक दो तीन"); त्याच लयीत रणन सुरू होते. पणवाचे ध्वंकार-द्वय संकेतांसाठी असतात.' },
   { id: 'steps', t: 'पावले — संचलन', p: ['संचलन पानावर डावे / उजवे पाऊल प्रकाशित होते आणि मागे / आता / पुढे अशा तीन ओळी दिसतात. डाव्या पायाने सुरुवात, समेवर.',
     '<b>प्रचलन</b> (केरवा, खेमटा): जलद संचलन. <b>मंदचाल</b> (दादरा): सावकाश. झपताल आणि रूपक रचना उभ्याने वाजवल्या जातात — पावले नाहीत.'] },
   { id: 'talas', t: 'ताल', table: { head: ['ताल', 'मात्रा', 'गण × मात्रा', 'गट', 'एक पाऊल', 'ताल वाद्ये'], rows: [
     ['केरवा', '४', '२ × २', '—', '१ मात्रा', 'प्रत्येक पावलावर'], ['खेमटा', '१२', '२ × ६', '३ + ३', '३ मात्रा', 'प्रत्येक गटावर (पावलावर)'],
     ['दादरा', '६', '२ × ३', '—', '३ मात्रा (मंदचाल)', 'प्रत्येक गणावर'], ['झपताल', '१०', '२ × ५', '२ + ३', 'उभे', 'प्रत्येक गटावर'],
     ['रूपक', '७', '१ × ७', '३ + २ + २', 'उभे', 'प्रत्येक गटावर'], ['एकताल', '१२', '६ × २', '—', '१ मात्रा', 'प्रत्येक पावलावर'], ['त्रिताल', '१६', '४ × ४', '—', '२ मात्रा (मंदचाल)', 'प्रत्येक पावलावर']] },
     note: 'लय = एका मिनिटातील मात्रा. केरवा १२० आणि खेमटा ३६० — दोन्हीत मिनिटाला १२० पावले.' },
   { id: 'play', t: 'वादनाचे पर्याय', rows: [
     [T('पूर्ण वादन'), '—', 'प्रत्यक्ष क्रम', 'रणन → प्रारंभिक → चरण → पहिला चरण दोनदा.', '—'],
     [T('ग्रंथ क्रम'), '—', 'छापल्याप्रमाणे', 'रणन व शेवटची पुनरावृत्ती नाही.', '—'],
     [T('एकदाच'), '—', 'झटपट ऐकणे', 'प्रत्येक चरण एकदा; ¹/² असलेले दोनदा.', '—'],
     [T('चरण ⟲'), '—', 'चरणाचा सराव', 'चालू चरण पुन्हा पुन्हा.', '—'],
     [T('सांतर / निरंतर'), '—', 'स्वरांची लांबी', 'सांतर: स्वरांमध्ये किंचित अंतर; निरंतर: पूर्ण.', '—'],
     [T('B♭ … F♯'), '—', 'वादनाची पट्टी', 'शंख व वंशी भागांचा सा स्वतंत्र.', '—']] }
  ] },
 hi: {
  title: 'स्वरलिपि मार्गदर्शिका', intro: 'घोष पुस्तकों की स्वरलिपि का हर चिह्न — ऐप में कैसा दिखता है, संपादक में कैसे लिखें और ऐप उसे कैसे बजाता है।',
  head: ['चिह्न', 'लिखें', 'अर्थ', 'ऐप कैसे बजाता है'],
  s: [
   { id: 'read', t: 'स्वरलिपि कैसे पढ़ें', p: ['हर भाग (शंख / वंशी / आनक) की अलग पंक्ति होती है; ऐप में एक चरण की पंक्तियाँ एक के नीचे एक दिखती हैं और नीचे ताल वाद्यों की छोटी पंक्ति।',
     '<b>मात्रा</b> = ताल की एक इकाई (एक ठोका)। <b>गण</b> = कुछ मात्राओं का समूह (केरवा: २ मात्राएँ)। <b>गट</b> = गण का उपविभाग (खेमटा: ३ + ३)। <b>लय</b> = एक मिनट में मात्राएँ (केरवा १२० = हर मात्रा आधा सेकंड)।',
     'बज रहा गण रंगीन दिखता है; पंक्ति पर टैप करने से वहीं से वादन शुरू होता है।'],
     ex: ['॥ॐ॥ स [ऽरी] | ग_ ग_ | प [ऽध] | [पग_] [रीस] |', 'शिवरंजनी, वंशी — पहली पंक्ति: ४ गण × २ मात्राएँ'] },
   { id: 'form', t: 'रचना का ढाँचा', rows: [
     [T('॥ॐ॥'), '॥ॐ॥', 'आरंभ', 'रचना की शुरुआत।', '—'],
     [T('॥ … ॥'), '॥', 'चरण', 'दो ॥ के बीच का भाग एक चरण है।', 'चरण के अंतिम कदम पर पणव रुकता है, झल्लरी-त्रिभुज ज़ोर से।'],
     [T('|'), '|', 'गण', 'गणों के बीच की रेखा।', '—'],
     [T(','), ',', 'गट', 'गण के गटों का विभाजन (खेमटा, झपताल, रूपक)।', '—'],
     [T(':॥'), ':॥', 'आवृत्ति', 'चरण दो बार बजाएँ।', 'पूर्ण वादन में दो बार; "एक बार" में एक बार।'],
     [T('↪ अनागत'), '॥ॐ॥ , ––प. ॥', 'अनागत', 'सम से पहले बजने वाली मात्राएँ — चरण से पहले अलग छोटी पंक्ति में छपी (जैसे स्वागत प्रणाम, चेतक)।', 'चरण से ठीक पहले; पूर्ण वादन में रणन के अंतिम शांत कदम पर। ऐप में चरण के ऊपर दाईं ओर दिखता है।'],
     [T('¹ … ²'), '{1 … } {2 … }', 'पहला / दूसरा अंत', 'पहली बार ¹ वाला भाग, दूसरी बार ² वाला। ऐप में दोनों अंत एक ही स्तंभ में, ऊपर रेखा के साथ दिखते हैं।', 'ऐसे चरण "एक बार" में भी दो बार बजते हैं।'],
     [T('यति ४'), '@yati=4', 'दीर्घ यति', 'इतने गण सभी भाग रुकते हैं।', 'मौन; पणव कदमों पर चलता रहता है।'],
     [T('ॐ'), '"ॐ":4', 'उच्चार', 'ॐ / मंत्र आदि — लिखी मात्राओं जितना।', 'मौन (उच्चार आप करें)।'],
     [T('प्रारंभिक'), '—', 'प्रारंभिक', 'पहले चरण से पहले की एक पंक्ति, एक बार।', 'एक बार।'],
     [T('सेतु / ध्रुवपद'), '#…', 'नाम', 'चरण का नाम (सेतु = जोड़ने वाला भाग)।', '—'],
     [T('रणन'), '—', 'रणन', 'रचना से पहले आनक की एक पंक्ति, आठ कदम: त्रऽऽ ऽऽऽ त – (दो बार)। खेमटा रचनाओं से पहले भी केरवा में।', 'पूर्ण वादन में शुरुआत में; ४ थे और ८ वें कदम पर पणव नहीं।'],
     [T('* ?'), '* ?', 'टिप्पणी / संदेह', '* = पुस्तक की पाद-टिप्पणी; ? = पाठ अनिश्चित।', '—']],
     note: '<b>पूर्ण वादन</b>: रणन → प्रारंभिक → सभी चरण (:॥ हो तो दो बार) → पहला चरण फिर दो बार। <b>पुस्तक क्रम</b>: छपे अनुसार। <b>एक बार</b>: हर चरण एक बार (¹/² वाले दो बार), रणन नहीं।' },
   { id: 'swar', t: 'स्वर — शंख, वंशी और अन्य स्वर वाद्य', rows: [
     [N('स री ग म प ध नि'), 'स री ग म प ध नि', 'सात स्वर', 'मध्य सप्तक।', 'शंख भाग: सा = B♭4; वंशी भाग: सा = F♯5 (सेटिंग्स में बदल सकते हैं)।'],
     [N('प.'), 'प.', 'मंद्र', 'नीचे बिंदु = नीचे का सप्तक।', 'एक सप्तक नीचे।'],
     [N("स'"), "स'", 'तार', 'ऊपर बिंदु = ऊपर का सप्तक।', 'एक सप्तक ऊपर।'],
     [N('ग_ नि_'), 'ग_ नि_', 'कोमल', 'नीचे रेखा: री ग ध नि कोमल।', 'आधा स्वर नीचे।'],
     [N('म_'), 'म_', 'तीव्र म', 'म के नीचे रेखा = तीव्र म।', 'आधा स्वर ऊपर।'],
     [N('स ऽ'), 'ऽ', 'स्वर जारी', 'पिछला स्वर इस मात्रा में भी।', 'स्वर लंबा होता है।'],
     [N('स –'), '– या -', 'विराम', 'शांत।', 'मौन।'],
     [N('[सरी]'), '[सरी]', 'एक मात्रा में', 'नीचे कोष्ठक = ये स्वर एक ही मात्रा में (बराबर बँटे)।', '२ स्वर = आधी-आधी मात्रा, ४ = चौथाई।'],
     [N('(स री ग)'), '( … )', 'निरंतर (ऊपर रेखा)', 'ऊपर रेखा वाले स्वर — जैसे सरीग जुड़े — बिना तोड़े लगातार बजाएँ।', 'स्वरों में अंतर नहीं; समूह का अंतिम स्वर ही सांतर नियम से रुकता है।'],
     [N('`मग'), '`मग', 'कण स्वर', 'छोटा स्वर मुख्य स्वर की शुरुआत में बहुत थोड़ा।', 'ठोके पर म ~६० मि.से., फिर ग (लंबाई सेटिंग्स में)।'],
     [N('ग^'), 'ग^', 'आघात', 'ज़ोर देकर बजाएँ।', 'तीखी शुरुआत, थोड़ा ऊँचा।'],
     [N('स!'), 'स!', 'ठहराव', 'लयभंग: स्वर लिखे से अधिक समय बजाएँ (विशेषकर अंतिम)।', 'आगे के विराम में लंबा होता है — अपनी लंबाई जितना, अधिकतम २ मात्रा।'],
     [N('प< ग>'), '< >', 'आवाज़ बढ़ाना / घटाना', 'स्वर की आवाज़ बढ़ाते / घटाते हुए।', 'आवाज़ धीरे-धीरे बढ़ती / घटती है।']],
     note: '<b>शंख</b> (बिगुल) केवल <b>प़ स ग प</b> (और कभी नि_ स\') बजा सकता है; संपादक अन्य स्वरों पर सूचना देता है। <b>सांतर</b> (मूल): हर स्वर कालांश से थोड़ा पहले रुकता है; <b>निरंतर</b>: पूरा कालांश। वंशी भाग के लिए वंशी, वेणु, स्वरद (clarinet), नागांग (sax), मधुरिका; शंख भाग के लिए शंख, तूर्य, मधुरिका चुन सकते हैं।' },
   { id: 'anak', t: 'आनक (साइड ड्रम) — बोल', rows: [
     [N('त'), 'त', 'तंकार', 'एक छड़ी का एक आघात।', 'एक आघात।'],
     [N('त्र'), 'त्र', 'रणन (रोल)', 'एक मात्रा लगातार आघात।', 'केरवा (और अन्य ताल): हर मात्रा में ४ तंकार, हर एक के बाद एक अनुतंकार। खेमटा: हर मात्रा में १ तंकार + २ अनुतंकार, गट की पहली मात्रा पर हल्का आघात।'],
     [N('`त्रत'), 'त्र्त  (`त्रत)', 'त्र्त', 'मुख्य तंकार से ज़रा पहले दूसरी शारिका से अनुतंकार सहित तंकार (घोष परिचय पृ. ४६)।', 'ठोके से ठीक पहले त + अनुतंकार, फिर ठोके पर त।'],
     [N('थ'), 'थ', 'दो छड़ियाँ', 'दोनों छड़ियाँ साथ।', 'ज़ोरदार दोहरा आघात।'],
     [N('थ्र'), 'थ्र', 'दो छड़ियाँ + उछाल', 'दोनों छड़ियाँ साथ, फिर उछलता आघात।', 'ज़ोरदार आघात और छोटा रोल।'],
     [N('+'), '+', 'छड़ी-ठोका', 'छड़ियाँ आपस में।', 'खटका; इस ठोके पर ताल वाद्य नहीं बजते।'],
     [N('[तत] [–त]'), '[तत] [–त]', 'मात्रा में विभाग', 'एक मात्रा में दो आघात / पहले विराम फिर आघात।', 'आधी-आधी मात्रा।'],
     [N('त ऽ –'), 'ऽ –', 'जारी / विराम', 'ऽ = आघात की ध्वनि जारी; – = शांत।', '—'],
     [N('`तत'), '`तत', 'पूर्व-आघात', 'मुख्य आघात से पहले बहुत छोटा आघात।', 'ठोके से ज़रा पहले हल्का आघात।'],
     [N('त^'), 'त^', 'आघात', 'ज़ोर देकर।', 'ऊँचा आघात।']] },
   { id: 'tal', t: 'ताल वाद्य — पणव, झल्लरी, त्रिभुज', p: ['ये पुस्तक में छपे नहीं होते; ऐप ताल से इन्हें लिखता है। ऐप में हर चरण के नीचे "ताल वाद्य" की छोटी पंक्ति दिखती है।'], rows: [
     [N('ध्व', 'tv'), '—', 'पणव (बेस ड्रम) — ध्वंकार', 'हर कदम पर (आनक में विराम / यति हो तब भी)।', 'गहरी धमक।'],
     [N('ध्व^', 'tv'), '—', 'सम', 'ताल की पहली मात्रा।', 'थोड़ा ज़ोर से।'],
     [N('–', 'tv'), '—', 'पणव नहीं', 'आनक में + हो तब; चरण के अंतिम कदम पर; रणन में ४ थे और ८ वें कदम पर (वहाँ झल्लरी-त्रिभुज भी नहीं)।', 'पणव शांत।'],
     [N('झ^', 'tv'), '—', 'झल्लरी + त्रिभुज ज़ोर से', 'चरण के अंतिम कदम पर, जहाँ पणव शांत रहता है।', 'झांझ और त्रिभुज ज़ोर से।'],
     [N('ध्व ऽ ऽ', 'tv'), '—', 'कदमों के बीच की मात्राएँ', 'खेमटा / दादरा: एक कदम में ३ मात्राएँ।', '—']],
     note: 'झल्लरी (झांझ) और त्रिभुज हर ध्वंकार के साथ बजते हैं। केवल शंख की रचनाओं (जैसे संघोष) में ताल वाद्य नहीं होते। वादन से पहले अंक-ताल: "एक दो, एक दो" (दादरा: "एक दो तीन, एक दो तीन"); उसी लय में रणन शुरू होता है। पणव का ध्वंकार-द्वय संकेतों के लिए है।' },
   { id: 'steps', t: 'कदम — संचलन', p: ['संचलन पृष्ठ पर बायाँ / दायाँ पैर प्रकाशित होता है और पीछे / अभी / आगे की तीन पंक्तियाँ दिखती हैं। बाएँ पैर से शुरुआत, सम पर।',
     '<b>प्रचलन</b> (केरवा, खेमटा): तेज़ संचलन। <b>मंदचाल</b> (दादरा): धीमा। झपताल और रूपक रचनाएँ खड़े होकर बजाई जाती हैं — कदम नहीं।'] },
   { id: 'talas', t: 'ताल', table: { head: ['ताल', 'मात्राएँ', 'गण × मात्रा', 'गट', 'एक कदम', 'ताल वाद्य'], rows: [
     ['केरवा', '4', '2 × 2', '—', '1 मात्रा', 'हर कदम पर'], ['खेमटा', '12', '2 × 6', '3 + 3', '3 मात्राएँ', 'हर गट पर (कदम पर)'],
     ['दादरा', '6', '2 × 3', '—', '3 मात्राएँ (मंदचाल)', 'हर गण पर'], ['झपताल', '10', '2 × 5', '2 + 3', 'खड़े', 'हर गट पर'],
     ['रूपक', '7', '1 × 7', '3 + 2 + 2', 'खड़े', 'हर गट पर'], ['एकताल', '12', '6 × 2', '—', '1 मात्रा', 'हर कदम पर'], ['त्रिताल', '16', '4 × 4', '—', '2 मात्राएँ (मंदचाल)', 'हर कदम पर']] },
     note: 'लय = एक मिनट में मात्राएँ। केरवा 120 और खेमटा 360 — दोनों में मिनट में 120 कदम।' },
   { id: 'play', t: 'वादन के विकल्प', rows: [
     [T('पूर्ण वादन'), '—', 'वास्तविक क्रम', 'रणन → प्रारंभिक → चरण → पहला चरण दो बार।', '—'],
     [T('पुस्तक क्रम'), '—', 'छपे अनुसार', 'रणन और अंतिम आवृत्ति नहीं।', '—'],
     [T('एक बार'), '—', 'जल्दी सुनना', 'हर चरण एक बार; ¹/² वाले दो बार।', '—'],
     [T('चरण ⟲'), '—', 'चरण का अभ्यास', 'चालू चरण बार-बार।', '—'],
     [T('सांतर / निरंतर'), '—', 'स्वरों की लंबाई', 'सांतर: स्वरों में थोड़ा अंतर; निरंतर: पूरा।', '—'],
     [T('B♭ … F♯'), '—', 'वादन की पट्टी', 'शंख और वंशी भागों का सा अलग-अलग।', '—']] }
  ] },
 en: {
  title: 'Notation guide', intro: 'Every sign in the ghosh books\' notation — how it looks in the app, how to type it in the editor, and how the app plays it.',
  head: ['Sign', 'Type', 'Meaning', 'How the app plays it'],
  s: [
   { id: 'read', t: 'Reading the notation', p: ['Each part (शंख / वंशी / आनक) has its own line; in the app the lines of one charan sit one under another, with a small line for the tala instruments below.',
     '<b>Matra</b> = one unit of the tala (one beat). <b>Gan</b> = a group of matras (केरवा: 2). <b>Gat</b> = a sub-group inside a gan (खेमटा: 3 + 3). <b>Laya</b> = matras per minute (केरवा 120 = half a second per matra).',
     'The gan being played lights up; tap a line to play from there.'],
     ex: ['॥ॐ॥ स [ऽरी] | ग_ ग_ | प [ऽध] | [पग_] [रीस] |', 'Shivranjani, vanshi — first line: 4 gans × 2 matras'] },
   { id: 'form', t: 'Structure of a rachana', rows: [
     [T('॥ॐ॥'), '॥ॐ॥', 'Start', 'Beginning of the rachana.', '—'],
     [T('॥ … ॥'), '॥', 'Charan', 'The part between two ॥ is one charan.', 'On a charan\'s last step the पणव rests; झल्लरी and त्रिभुज play loud.'],
     [T('|'), '|', 'Gan', 'Line between gans.', '—'],
     [T(','), ',', 'Gat', 'Division inside a gan (खेमटा, झपताल, रूपक).', '—'],
     [T(':॥'), ':॥', 'Repeat', 'Play the charan twice.', 'Twice in Performance; once in "Once".'],
     [T('↪ अनागत'), '॥ॐ॥ , ––प. ॥', 'Pickup (अनागत)', 'Matras played just before the सम, printed as a short separate line before the charan (e.g. स्वागत प्रणाम, चेतक).', 'Right before the charan; in a Performance, on the last silent step of the रणन. Shown right-aligned above the charan.'],
     [T('¹ … ²'), '{1 … } {2 … }', 'First / second ending', 'First time the ¹ part, second time the ². Both endings are shown in the same columns, with a bracket above.', 'Such charans play twice even in "Once".'],
     [T('यति ४'), '@yati=4', 'Long pause', 'All parts rest for this many gans.', 'Silence; the पणव keeps the steps.'],
     [T('ॐ'), '"ॐ":4', 'Spoken cue', 'ॐ / मंत्र etc. — for the matras written.', 'Silence (you say it).'],
     [T('प्रारंभिक'), '—', 'Opening', 'One line before the first charan, played once.', 'Once.'],
     [T('सेतु / ध्रुवपद'), '#…', 'Name', 'Name of a charan (सेतु = a bridge).', '—'],
     [T('रणन'), '—', 'Ranan', 'One line of आनक before the rachana, eight steps: त्रऽऽ ऽऽऽ त – (twice). Also in केरवा before खेमटा rachanas.', 'At the start of a Performance; no पणव on steps 4 and 8.'],
     [T('* ?'), '* ?', 'Note / doubt', '* = footnote in the book; ? = uncertain reading.', '—']],
     note: '<b>Performance</b>: रणन → opening → every charan (twice where :॥) → the first charan twice again. <b>Book order</b>: as printed. <b>Once</b>: each charan once (twice if it has ¹/²), no रणन.' },
   { id: 'swar', t: 'Swaras — शंख, वंशी and other melody instruments', rows: [
     [N('स री ग म प ध नि'), 'स री ग म प ध नि', 'Seven swaras', 'Middle octave.', 'शंख part: Sa = B♭4; वंशी part: Sa = F♯5 (change in Settings).'],
     [N('प.'), 'प.', 'Lower octave', 'Dot below.', 'One octave down.'],
     [N("स'"), "स'", 'Upper octave', 'Dot above.', 'One octave up.'],
     [N('ग_ नि_'), 'ग_ नि_', 'Komal', 'Line below: komal री ग ध नि.', 'A semitone lower.'],
     [N('म_'), 'म_', 'Tivra म', 'Line below म = tivra.', 'A semitone higher.'],
     [N('स ऽ'), 'ऽ', 'Hold', 'The previous swara continues.', 'Held on.'],
     [N('स –'), '– or -', 'Rest', 'Silence.', 'Silence.'],
     [N('[सरी]'), '[सरी]', 'In one matra', 'Bracket below = these swaras share one matra equally.', '2 swaras = half a matra each, 4 = a quarter.'],
     [N('(स री ग)'), '( … )', 'Nirantar (line above)', 'Swaras under a line above — e.g. सरीग joined — are played continuously, without a break.', 'No gap: each swara flows into the next; only the last one stops by the santar rule.'],
     [N('`मग'), '`मग', 'Grace note', 'A small swara very briefly at the start of the main one.', 'म on the beat for ~60 ms, then ग (length in Settings).'],
     [N('ग^'), 'ग^', 'Accent (आघात)', 'Play with stress.', 'Sharper start, a little louder.'],
     [N('स!'), 'स!', 'Hold (लयभंग)', 'लयभंग: hold the swara longer than written (often the last one).', 'Held into the silence after it — up to its own length, at most 2 matras.'],
     [N('प< ग>'), '< >', 'Grow / fade', 'Swell or fade the swara.', 'Volume rises / falls.']],
     note: 'The <b>शंख</b> (bugle) can only play <b>प़ स ग प</b> (and rarely नि_ स\'); the editor warns on other swaras. <b>Santar</b> (default): each swara stops a little before its time; <b>Nirantar</b>: full length. For the वंशी part: flute, venu, clarinet, sax, melodica; for the शंख part: bugle, trumpet, melodica.' },
   { id: 'anak', t: 'आनक (side drum) — bols', rows: [
     [N('त'), 'त', 'Tankar', 'One stroke of one stick.', 'One stroke.'],
     [N('त्र'), 'त्र', 'Roll', 'Continuous strokes for one matra.', 'केरवा (and every other tala): 4 strokes per matra, each followed by a softer one. खेमटा: per matra 1 stroke + 2 softer, a light accent on the first matra of each gat.'],
     [N('`त्रत'), 'त्र्त  (`त्रत)', 'त्र्त', 'Just before the main stroke, the other stick plays a stroke with its rebound (घोष परिचय p. 46).', 'त + rebound just before the beat, then त on the beat.'],
     [N('थ'), 'थ', 'Both sticks', 'Both sticks together.', 'Strong double stroke.'],
     [N('थ्र'), 'थ्र', 'Both sticks + rebound', 'Both sticks, then a bounce.', 'Strong stroke and a short roll.'],
     [N('+'), '+', 'Stick click', 'Sticks struck together.', 'A click; the tala instruments rest on it.'],
     [N('[तत] [–त]'), '[तत] [–त]', 'Split matra', 'Two strokes in one matra / rest then stroke.', 'Half a matra each.'],
     [N('त ऽ –'), 'ऽ –', 'Hold / rest', 'ऽ = the stroke rings on; – = silence.', '—'],
     [N('`तत'), '`तत', 'Flam', 'A tiny stroke just before the main one.', 'A light stroke just before the beat.'],
     [N('त^'), 'त^', 'Accent', 'With stress.', 'Louder stroke.']] },
   { id: 'tal', t: 'Tala instruments — पणव, झल्लरी, त्रिभुज', p: ['These are not printed in the books; the app writes them from the tala. In the app each charan has a small "tala instruments" line below it.'], rows: [
     [N('ध्व', 'tv'), '—', 'पणव (bass drum) — ध्वंकार', 'On every step (also over आनक rests / यती).', 'Deep boom.'],
     [N('ध्व^', 'tv'), '—', 'Sam', 'First matra of the tala.', 'A little louder.'],
     [N('–', 'tv'), '—', 'No पणव', 'Where the आनक has +; on a charan\'s last step; on रणन steps 4 and 8 (no झल्लरी or त्रिभुज there either).', 'पणव silent.'],
     [N('झ^', 'tv'), '—', 'झल्लरी + त्रिभुज loud', 'On a charan\'s last step, where the पणव is silent.', 'Cymbals and triangle loud.'],
     [N('ध्व ऽ ऽ', 'tv'), '—', 'Matras between steps', 'खेमटा / दादरा: 3 matras per step.', '—']],
     note: 'झल्लरी (cymbals) and त्रिभुज play with every ध्वंकार. Shankh-only pieces (e.g. संघोष) have no ताल वाद्ये. Before playing comes the count "एक दो, एक दो" (दादरा: "एक दो तीन, एक दो तीन"); the रणन starts in that tempo. The two पणव strokes (ध्वंकार-द्वय) are for signals.' },
   { id: 'steps', t: 'Steps — संचलन', p: ['The संचलन page lights the left / right foot and shows three lines: previous / now / next. Left foot first, on the सम.',
     '<b>प्रचलन</b> (केरवा, खेमटा): march. <b>मंदचाल</b> (दादरा): slow march. झपताल and रूपक rachanas are played standing — no steps.'] },
   { id: 'talas', t: 'Talas', table: { head: ['Tala', 'Matras', 'Gans × matras', 'Gats', 'One step', 'Tala instruments'], rows: [
     ['केरवा', '4', '2 × 2', '—', '1 matra', 'every step'], ['खेमटा', '12', '2 × 6', '3 + 3', '3 matras', 'every gat (step)'],
     ['दादरा', '6', '2 × 3', '—', '3 matras (slow)', 'every gan'], ['झपताल', '10', '2 × 5', '2 + 3', 'standing', 'every gat'],
     ['रूपक', '7', '1 × 7', '3 + 2 + 2', 'standing', 'every gat'], ['एकताल', '12', '6 × 2', '—', '1 matra', 'every step'], ['त्रिताल', '16', '4 × 4', '—', '2 matras (slow)', 'every step']] },
     note: 'Laya = matras per minute. केरवा 120 and खेमटा 360 both give 120 steps a minute.' },
   { id: 'play', t: 'Playing options', rows: [
     [T('Performance'), '—', 'Real order', 'रणन → opening → charans → first charan twice.', '—'],
     [T('Book order'), '—', 'As printed', 'No रणन, no closing repeat.', '—'],
     [T('Once'), '—', 'Quick listen', 'Each charan once; twice if it has ¹/².', '—'],
     [T('Loop ⟲'), '—', 'Practise a charan', 'The current charan again and again.', '—'],
     [T('Santar / Nirantar'), '—', 'Note length', 'Santar: a small gap between swaras; Nirantar: full.', '—'],
     [T('B♭ … F♯'), '—', 'Key', 'Sa for the शंख and वंशी parts set separately.', '—']] }
  ] }
};

for (const l in C) if (I18N[l]) I18N[l].g_open = C[l].title;

/* ---------- view ---------- */
const g = () => C[LANG] || C.mr;
function render(jump) {
  const G = g();
  $('#gdT').textContent = G.title;
  $('#gdToc').innerHTML = G.s.map(s => `<button data-gd="${s.id}">${esc(s.t)}</button>`).join('');
  let h = `<p class="gd-intro">${esc(G.intro)}</p>`;
  G.s.forEach(s => {
    h += `<section class="gd-sec" id="gd-${s.id}"><h3>${esc(s.t)}</h3>`;
    (s.p || []).forEach(p => { h += `<p>${p}</p>`; });
    if (s.ex) h += `<div class="gd-ex"><span class="gd-n big r-vanshi">${sample(s.ex[0].replace(/॥ॐ॥/, ''))}</span><small>${esc(s.ex[1])}</small></div>`;
    if (s.rows) h += `<div class="gd-rows">${s.rows.map(r => `<div class="gd-row"><div class="gd-sym">${r[0]}</div><div class="gd-txt"><b>${esc(r[2])}</b>${r[1] && r[1] !== '—' ? ` <code>${esc(r[1])}</code>` : ''}<span>${esc(r[3])}</span>${r[4] && r[4] !== '—' ? `<em>▶ ${esc(r[4])}</em>` : ''}</div></div>`).join('')}</div>`;
    if (s.table) h += `<div class="gd-tw"><table class="gd-tab"><thead><tr>${s.table.head.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${s.table.rows.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (s.note) h += `<p class="gd-note">${s.note}</p>`;
    const lab = { swar: 0, anak: 1, tal: 2, steps: 3 }[s.id];
    if (lab != null && window.SoundLab) h += `<p><button class="lb-btn main" data-labopen="${lab}">▶ ${esc(tx('s_open'))}</button></p>`;
    h += '</section>';
  });
  $('#gdBody').innerHTML = h;
  if (jump) setTimeout(() => go(jump), 30);
}
function go(id) { const el = $('#gd-' + id); if (el) $('#gdBody').scrollTop = el.offsetTop - $('#gdBody').offsetTop - 6; }
let from = null;
function open(section) {
  from = !$('#player').hidden ? 'player' : !$('#fixer').hidden ? 'fixer' : 'list';
  if (!$('#sheet').hidden) $('#sheet').hidden = true;
  $('#guide').hidden = false; render(section); if (!section) $('#gdBody').scrollTop = 0;
}
function close() { $('#guide').hidden = true; }
$('#gdBack').onclick = close;
$('#gdToc').addEventListener('click', e => { const b = e.target.closest('[data-gd]'); if (b) go(b.dataset.gd); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#guide').hidden) close(); });
document.addEventListener('click', e => { const b = e.target.closest('[data-guide]'); if (b) { e.preventDefault(); open(b.dataset.guide || null); } });
window.Guide = { open, close, sample, lang() { if (!$('#guide').hidden) render(); } };
})();

