#!/usr/bin/env node
// node tools/run-tests.mjs "<glob>" ...  — runs the node tests and FAILS when no test file matches or no test ran.
// (A pattern that matches nothing used to make `node --test` pass with zero tests, which hid missing files.)
import { globSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const patterns = process.argv.slice(2);
const files = patterns.flatMap(p => globSync(p)).sort();
if (!files.length) { console.error(`✗ no test files match ${patterns.join(' ')}`); process.exit(1); }
const r = spawnSync(process.execPath, ['--test', ...files], { encoding: 'utf8' });
process.stdout.write(r.stdout); process.stderr.write(r.stderr);
const ran = +(/ℹ tests (\d+)/.exec(r.stdout)?.[1] ?? 0);
if (!ran) { console.error('✗ no tests ran'); process.exit(1); }
process.exit(r.status ?? 1);
