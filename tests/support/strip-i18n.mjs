// v1.1.0 marked the texts of the page with data-t / data-ta / data-tp; the new page uses data-i18n / data-i18n-html / data-i18n-attr.
// The markers are bookkeeping, not what the person sees, so comparisons of a drawn screen leave them out (the texts themselves are compared,
// and the language-core test checks that every static text is still tagged).
const MARKER = / data-(?:t|ta|tp|i18n|i18n-html|i18n-attr)=\\"[^"\\]*\\"/g;
// v1.1.0 wrote these spoken labels in English or Marathi only (aria-label="stop", "notation", "file", "संपादक"); they follow the language now,
// so the label of exactly these elements is left out of the comparison.
const SPOKEN = /<[^<>]*\bid=\\"(?:skStop|labStop|fxText|cexpText|ceditor)\\"[^<>]*>/g;
export const stripI18n = snapshot => JSON.parse(JSON.stringify(snapshot).replace(MARKER, '').replace(SPOKEN, tag => tag.replace(/ aria-label=\\"[^"\\]*\\"/, '')));
