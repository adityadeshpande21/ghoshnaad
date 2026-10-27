// The signs of the book notation and what each means.
import type { Swara } from '../types.ts';

/** Swaras. `vikrit` (the small underline in the books) is komal for री ग ध नि and tivra for म. */
export const SWARA: Record<string, Swara> = { 'स': 'S', 'री': 'R', 'ग': 'G', 'म': 'M', 'प': 'P', 'ध': 'D', 'नि': 'N' };
export const SWARA_ALIAS: Record<string, string> = { 'सा': 'स', 'रे': 'री', 'रि': 'री', 'गा': 'ग', 'मा': 'म', 'पा': 'प', 'धा': 'ध', 'नी': 'नि' };

/** Percussion syllables (ध्वन्याक्षर). */
export const STROKE: Record<string, string> = {
  'त': 'ta',        // आनक: one stick
  'थ': 'tha',       // both sticks together
  'थ्र': 'thra',    // both sticks together with rebound
  'त्र': 'roll',    // रणन — realisation depends on the tala
  '+': 'click',     // sticks struck together
  'ध्वं': 'dhvam',  // पणव
  'धं': 'dham',     // खर्जानक
  'टं': 'tam',      // त्रिभुज
  'झं': 'jham',     // झल्लरी
};
export const HOLD = ['ऽ', 'S'];
export const REST = ['–', '-', '—'];

/** Longest first, so "ध्वं" is read before "ध". */
export const SYMBOLS = [
  ...Object.keys(STROKE), ...Object.keys(SWARA), ...Object.keys(SWARA_ALIAS), ...HOLD, ...REST,
].sort((a, b) => b.length - a.length);
