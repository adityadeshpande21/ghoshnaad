#!/usr/bin/env node
// node src/validate3.js out/v3/*.json — schema + cross checks (addresses line up, layout covers every गण)
'use strict';
const fs = require('fs'), path = require('path');
const { buildTimeline3 } = require('./timeline3');
const Ajv = require('/home/claude/node_modules/ajv/dist/2020').default;
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(JSON.parse(fs.readFileSync(path.join(__dirname, '../schema/ghosh-3.schema.json'), 'utf8')));
let bad = 0;
for (const f of process.argv.slice(2)) {
  const p = JSON.parse(fs.readFileSync(f, 'utf8')); const errs = [];
  if (!validate(p)) validate.errors.slice(0, 5).forEach(e => errs.push(`${e.instancePath} ${e.message}`));
  // Parts may split a charan's endings differently (as the book sometimes does), so instead of
  // requiring identical गण addresses we require every charan pass to last the same time in every part.
  const span = k => { const t = buildTimeline3(p, k), m = {};
    t.beats.filter(b => b.pass > 0).forEach(b => { const key = `${b.charan}/${b.pass}`; m[key] = (m[key] || 0) + b.dur; }); return { m, total: t.total }; };
  const ref = span(p.layout.lead);
  Object.keys(p.parts).forEach(k => { if (k === p.layout.lead) return; const s = span(k);
    if (Math.abs(s.total - ref.total) > 1e-6) errs.push(`${k} lasts ${s.total.toFixed(2)}s, ${p.layout.lead} ${ref.total.toFixed(2)}s`);
    Object.keys(ref.m).forEach(key => { if (Math.abs((s.m[key] || 0) - ref.m[key]) > 1e-6) errs.push(`${k}: charan/pass ${key} lasts ${(s.m[key] || 0).toFixed(2)}s, ${p.layout.lead} ${ref.m[key].toFixed(2)}s`); }); });
  Object.entries(p.layout.parts).forEach(([k, l]) => { const inL = l.lines.flatMap(x => x.gans); const all = p.parts[k].gans.map(g => g.addr);
    if (inL.join() !== all.join()) errs.push(`layout of ${k} does not list every गण in order`); });
  p.rhythm.form.forEach(id => { if (!p.rhythm.charans.some(c => c.id === id)) errs.push(`form refers to missing ${id}`); });
  console.log(`${errs.length ? '✗' : '✓'} ${path.basename(f)}`); errs.forEach(e => console.log('    ' + e)); if (errs.length) bad++;
}
process.exitCode = bad ? 1 : 0;
