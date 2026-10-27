// @ts-check
// The words of the signals (names, when / does, captions, rules): src/content/<lang>/ghoshdand.md, put into the figure data.
import { parseKeyed, textSlots, fillSlots } from '../../content/keyed.ts';
import { textRoots } from './figure.loose.js';
import content from 'virtual:languages/content';     // src/content/<lang>/ghoshdand.md for every language that has one

fillSlots(textSlots(textRoots()), Object.fromEntries(Object.entries(content.ghoshdand).map(([lang, md]) => [lang, parseKeyed(md, `${lang}/ghoshdand.md`)])));
