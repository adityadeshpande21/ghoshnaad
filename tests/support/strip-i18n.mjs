// v1.1.0 marked the texts of the page with data-t / data-ta / data-tp; the new page uses data-i18n / data-i18n-html / data-i18n-attr.
// The markers are bookkeeping, not what the person sees, so comparisons of a drawn screen leave them out (the texts themselves are compared,
// and the language-core test checks that every static text is still tagged).
const MARKER = / data-(?:t|ta|tp|i18n|i18n-html|i18n-attr)=\\"[^"\\]*\\"/g;
// v1.1.0 wrote these spoken labels in English or Marathi only (aria-label="stop", "notation", "file", "संपादक"); they follow the language now,
// so the label of exactly these elements is left out of the comparison.
const SPOKEN = /<[^<>]*\bid=\\"(?:skStop|labStop|fxText|cexpText|ceditor)\\"[^<>]*>/g;
// Texts that differ from v1.1.0 on purpose, written new -> old, so the rest of a screen is still compared exactly:
//   Fix D2: the shankh may play the mandra स, so the texts that list its notes name it (checker message, guide)
const N = String.fromCodePoint(0x93c), PA = String.fromCodePoint(0x92a), SA = String.fromCodePoint(0x938), GA = String.fromCodePoint(0x917);
const DELIBERATE = [[`${PA}${N} ${SA}${N} ${SA} ${GA} ${PA}`, `${PA}${N} ${SA} ${GA} ${PA}`]];
export const stripI18n = snapshot => {
  let json = JSON.stringify(snapshot).replace(MARKER, '').replace(SPOKEN, tag => tag.replace(/ aria-label=\\"[^"\\]*\\"/, ''));
  for (const [now, was] of DELIBERATE) json = json.replaceAll(now, was);
  return JSON.parse(json);
};
