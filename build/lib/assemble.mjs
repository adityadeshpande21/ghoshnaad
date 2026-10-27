// Stitch the single HTML file from the legacy parts (legacy/src/app) plus the generated blocks.
// Parts stay untouched; every change the build makes to them is a named transform that must match exactly once.
import fs from 'node:fs';
import path from 'node:path';

const rel = {
  googleFonts: /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\n<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2[^"]*">\n/,
  installLinks: /<link rel="manifest" href="manifest\.webmanifest">\n<link rel="apple-touch-icon" href="apple-touch-icon\.png">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="घोषनाद">\n/,
  title: /<title>घोषनाद v[^<]*<\/title>/,
  appObject: /const APP=\{name:'Ghoshnaad',version:'[^']*',date:'[^']*'\};/,
  appVer: /<span class="sh-ver" id="appVer">[^<]*<\/span>/,
  headerVer: /<span class="ver">v[^<]*<\/span>/,
};

function once(text, re, to, what) {
  const n = (text.match(new RegExp(re.source, 'g')) || []).length;
  if (n !== 1) throw new Error(`transform "${what}" matched ${n} times (expected 1)`);
  return text.replace(re, () => to);
}

// variant: 'site' (index.html: installable) | 'file' (Ghoshnaad.html: no install links)
export function assemble({ partsDir, generated, release, fontCss, variant }) {
  const manifest = JSON.parse(fs.readFileSync(path.join(partsDir, 'manifest.json'), 'utf8'));
  const out = manifest.map(m => {
    let text = m.gen ? generated[m.gen] : fs.readFileSync(path.join(partsDir, m.file), 'utf8');
    if (text === undefined) throw new Error(`no generated text for "${m.gen}"`);
    if (m.file === 'raw-01.html') {
      text = once(text, rel.googleFonts, '', 'drop Google Fonts');
      text = once(text, rel.title, `<title>घोषनाद v${release.version}</title>`, 'title');
      text = once(text, rel.installLinks, variant === 'site'
        ? '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="घोषनाद">\n'
        : '', 'install links');
      text = text.replace('</head>', `<style id="fonts">${fontCss}</style>\n</head>`);
    }
    if (m.file === 'raw-02.html') text = once(text, rel.headerVer, `<span class="ver">v${release.version}</span>`, 'header version');
    if (m.file === 'raw-02.html') text = once(text, rel.appVer, `<span class="sh-ver" id="appVer">घोषनाद v${release.version} · ${release.date}</span>`, 'version label');
    if (m.file === 'app.js') {
      text = once(text, rel.appObject, `const APP={name:'Ghoshnaad',version:'${release.version}',date:'${release.date}',variant:'${variant}',site:${JSON.stringify(release.site)},whatsNew:${JSON.stringify(release.whatsNew)}};`, 'APP object');
    }
    return m.kind === 'raw' ? text : `<${m.kind}>${text}</${m.kind}>`;
  }).join('');
  return out;
}
