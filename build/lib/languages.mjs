// The languages of languages.json, as modules the bundles can import, so that adding a language is adding files, not editing code:
//   virtual:languages/messages   { code: { key: message } }            from src/i18n/<code>.json
//   virtual:languages/names      { script: { devanagariName: name } }   from rules/names/<script>.json (only the scripts of the languages, and only if the file exists)
//   virtual:languages/content    { name: { code: markdown text } }      from src/content/<code>/<name>.md
import fs from 'node:fs';
import path from 'node:path';

const NS = 'ghosh-languages';

export function languagesPlugin(root) {
  const languages = () => JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/languages.json'), 'utf8'));
  const id = (s, i) => `${s}_${i}`;
  const load = part => {
    const langs = languages(), lines = [];
    if (part === 'messages') {
      langs.forEach((l, i) => {
        const f = path.join(root, `src/i18n/${l.code}.json`);
        if (!fs.existsSync(f)) throw new Error(`languages.json lists ${l.code}, but ${path.relative(root, f)} does not exist`);
        lines.push(`import ${id('m', i)} from ${JSON.stringify(f)};`);
      });
      lines.push(`export default { ${langs.map((l, i) => `${JSON.stringify(l.code)}: ${id('m', i)}`).join(', ')} };`);
    } else if (part === 'names') {
      const scripts = [...new Set(langs.map(l => l.script))].filter(s => fs.existsSync(path.join(root, `rules/names/${s}.json`)));
      scripts.forEach((s, i) => lines.push(`import ${id('n', i)} from ${JSON.stringify(path.join(root, `rules/names/${s}.json`))};`));
      lines.push(`export default { ${scripts.map((s, i) => `${JSON.stringify(s)}: ${id('n', i)}`).join(', ')} };`);
    } else if (part === 'content') {
      const byName = {};
      langs.forEach(l => {
        const dir = path.join(root, 'src/content', l.code);
        if (!fs.existsSync(dir)) return;
        for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()) (byName[f.slice(0, -3)] ??= []).push([l.code, path.join(dir, f)]);
      });
      let n = 0;
      const parts = Object.entries(byName).map(([name, files]) => `${JSON.stringify(name)}: { ${files.map(([code, f]) => { const v = id('c', n++); lines.push(`import ${v} from ${JSON.stringify(f)};`); return `${JSON.stringify(code)}: ${v}`; }).join(', ')} }`);
      lines.push(`export default { ${parts.join(', ')} };`);
    } else throw new Error(`unknown part virtual:languages/${part}`);
    return lines.join('\n');
  };
  return {
    name: NS,
    setup(build) {
      build.onResolve({ filter: /^virtual:languages\// }, a => ({ path: a.path.slice('virtual:languages/'.length), namespace: NS }));
      build.onLoad({ filter: /.*/, namespace: NS }, a => ({ contents: load(a.path), loader: 'js', resolveDir: root }));
    },
  };
}
