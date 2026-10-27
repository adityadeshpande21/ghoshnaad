// Small helpers on the rachana model.
import type { Gan3, YatiGan3 } from './types.ts';

/** A दीर्घ यति gan: silence for `span` matras, with no gats. */
export const isYati = (g: Gan3): g is YatiGan3 => !!g.yati;
