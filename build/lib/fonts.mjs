// Embedded fonts (both SIL OFL, from the @fontsource packages): Mukta for text, Yatra One for the brand mark only.
// The app no longer asks Google Fonts for anything, so a copied file looks the same offline.
import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';

const MUKTA_WEIGHTS = [400, 600, 700];                  // 500 and 800 are used rarely and fall back to the nearest weight
const BRAND_TEXT = 'घोषनाद Ghoshnaad';
const RANGES = {
  devanagari: 'U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF,U+11B00-11B09',
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
};
const b64 = buf => Buffer.from(buf).toString('base64');

export async function fontCss(root) {
  const fs_ = name => path.join(root, 'node_modules/@fontsource', name, 'files');
  const face = (family, weight, range, data) =>
    `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64(data)}) format('woff2');unicode-range:${range}}`;
  const faces = [];
  for (const w of MUKTA_WEIGHTS) for (const script of ['devanagari', 'latin'])
    faces.push(face('Mukta', w, RANGES[script], fs.readFileSync(path.join(fs_('mukta'), `mukta-${script}-${w}-normal.woff2`))));
  const yatra = await subsetFont(fs.readFileSync(path.join(fs_('yatra-one'), 'yatra-one-devanagari-400-normal.woff2')), BRAND_TEXT, { targetFormat: 'woff2' });
  const yatraLatin = await subsetFont(fs.readFileSync(path.join(fs_('yatra-one'), 'yatra-one-latin-400-normal.woff2')), BRAND_TEXT, { targetFormat: 'woff2' });
  faces.push(face('Yatra One', 400, RANGES.devanagari, yatra), face('Yatra One', 400, RANGES.latin, yatraLatin));
  return faces.join('\n');
}
