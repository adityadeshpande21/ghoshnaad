#!/usr/bin/env node
// npm run typecheck — two levels, because the code is at two stages:
//   1. tsconfig.json (strict): everything that is typed. The files named *.loose.js were moved from v1.1.0 and do not carry full annotations yet, but typed files
//      import them, so TypeScript reads them here too; errors located in them are left to level 2.
//   2. tsconfig.loose.json (checkJs, implicit any allowed): the *.loose.js files, src/app/app.js and src/app/platform.js, checked as plain JavaScript.
//      A wrong name, a property that does not exist, a wrong argument type or a syntax error fails here, in every one of those files.
// Typing a file further means adding annotations until it passes level 1 too, then dropping `.loose` from its name.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsc = project => spawnSync('npx', ['tsc', '-p', project, '--noEmit'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const problems = out => {
  // an error starts with "path(line,col): error TSnnnn:"; the indented lines under it belong to it
  const keep = []; let file = '';
  for (const line of out.split('\n')) {
    const m = /^(\S+?)\(\d+,\d+\): error TS\d+/.exec(line);
    if (m) file = m[1];
    if (line.trim() && (m || /^\s/.test(line)) && file) keep.push({ file, line });
    else if (line.trim() && !m && !/^\s/.test(line)) keep.push({ file: '', line });
  }
  return keep;
};

const strict = problems(tsc('tsconfig.json').stdout).filter(p => !p.file.endsWith('.loose.js'));
if (strict.length) { console.error(`✗ type errors (strict):\n${strict.map(p => '  ' + p.line).join('\n')}`); process.exit(1); }
const loose = problems(tsc('tsconfig.loose.json').stdout);
if (loose.length) { console.error(`✗ type errors in the *.loose.js files, app.js and platform.js:\n${loose.map(p => '  ' + p.line).join('\n')}`); process.exit(1); }
console.log('✓ typecheck: typed files strict; *.loose.js, app.js and platform.js checked as plain JavaScript');
