// Browser entry for the compiler: the composer, fixer and folder library call window.GhoshCompile.
import { compile3 } from '../core/index.ts';
import type { TalaLibrary } from '../core/index.ts';
import talasJson from '../../rules/talas.json';

const talas = talasJson as unknown as TalaLibrary;
(window as unknown as { GhoshCompile: unknown }).GhoshCompile = {
  compile3: (src: Parameters<typeof compile3>[0], opts: { now?: string } = {}) => compile3(src, { talas, ...opts }),
  talas,
};
