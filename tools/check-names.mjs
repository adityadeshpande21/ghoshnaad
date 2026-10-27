#!/usr/bin/env node
// Files marked *.loose.js were moved from v1.1.0 and are not fully typed yet (they start with // @ts-nocheck). Their one real
// risk is a leftover reference to a shared global that no longer exists, so this checks a temporary copy with the marker removed
// and fails on any "cannot find name", ignoring other type noise.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghosh-names-'));
for (const d of ['src', 'rules']) fs.cpSync(path.join(root, d), path.join(tmp, d), { recursive: true });
for (const f of ['tsconfig.json', 'tsconfig.loose.json']) fs.copyFileSync(path.join(root, f), path.join(tmp, f));
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmp, 'node_modules'));
const strip = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) strip(p);
  else if (e.name.endsWith('.loose.js')) fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/^\/\/ @ts-nocheck[^\n]*\n/, ''));
} };
strip(path.join(tmp, 'src'));

const r = spawnSync('npx', ['tsc', '-p', 'tsconfig.loose.json', '--noEmit'], { cwd: tmp, encoding: 'utf8' });
fs.rmSync(tmp, { recursive: true, force: true });
const missing = `${r.stdout}${r.stderr}`.split('\n').filter(l => /error TS(2304|2552):/.test(l));
if (missing.length) { console.error(`✗ unresolved names in loose files:\n${missing.map(l => '  ' + l).join('\n')}`); process.exit(1); }
console.log('✓ no unresolved names in the *.loose.js files');
