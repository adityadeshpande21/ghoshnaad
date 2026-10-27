// One library-list row per rachana, derived from the compiled piece. Matches the rows v1.1.0 shipped in data/index.json.
import { buildTimeline3 } from '../../src/core/index.ts';

const PRINTED = ['shankh', 'vanshi', 'anak'];

export function catalogEntry(piece) {
  const R = piece.rhythm, m = piece.meta;
  const tl = buildTimeline3(piece, piece.layout.lead, { order: 'performance' });
  return {
    id: piece.id,
    dev: m.title.dev,
    rom: m.title.rom,
    alt: m.title.alt || [],
    sec: m.section,
    raga: (m.raga && m.raga.name) || '',
    talas: [...new Set(R.charans.map(c => R.talas[c.tala].name.dev))],
    laya: R.charans[0].laya,
    parts: Object.keys(piece.parts).filter(k => PRINTED.includes(k)),
    sec_s: Math.round(tl.total),
    standing: m.performance.mode,
  };
}
