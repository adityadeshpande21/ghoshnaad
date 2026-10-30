// What the person chooses about the sound, kept per viewer: the पट्टी (Sa) of each melody part, सांतर / निरंतर, the length of a कण स्वर, and
// which real instruments play each part. Stored values are checked on the way in, so a damaged or hand-edited value falls back to the default.
// The engine reads `engineSettings()` every time a note sounds; the sound check changes `artic` and `kanMs` for a moment without saving them.
import { SA_DEF } from './melodic.ts';
import type { MelodicSettings } from './melodic.ts';

/** The storage the app gives its screens: values are JSON, keys are the app's own. */
export interface SettingsStore { get(key: string, fallback: unknown): unknown; set(key: string, value: unknown): void }

export type Articulation = 'santar' | 'nirantar';

/** The instruments of each part the person can choose from, in the order the sheet shows them. */
export const INSTRUMENT_OPTIONS: Record<string, readonly string[]> = {
  shankh: ['bugle', 'trumpet', 'melodica'],
  vanshi: ['flute', 'venu', 'clarinet', 'sax', 'melodica'],
  anak: ['side'],
  tal: ['bass', 'cym', 'tri'],
};
const INSTRUMENT_DEFAULT: Record<string, readonly string[]> = { shankh: ['bugle'], vanshi: ['flute'], anak: ['side'], tal: ['bass', 'cym', 'tri'] };
/** The voice (a name in src/audio/melodic.ts) each melody instrument plays with. */
export const VOICE_OF: Record<string, string> = { bugle: 'shankh', trumpet: 'trumpet', flute: 'vanshi', venu: 'venu', clarinet: 'clarinet', sax: 'sax', melodica: 'melodica' };
/** A part that has its own switch: [group, instrument] that must be chosen for the part to sound. */
const PART_INSTRUMENT: Record<string, readonly [string, string]> = { anak: ['anak', 'side'], panav: ['tal', 'bass'], jhallari: ['tal', 'cym'], tribhuj: ['tal', 'tri'] };

export const KAN_MS = { min: 20, max: 200, default: 60 };

export class SoundSettings {
  /** per melody part: which of the 12 notes is Sa (the octave stays: शंख 4th, वंशी 5th) */
  saKeys: Record<string, number>;
  /** सांतर (default): each note stops a little before its time is up; निरंतर: full length */
  artic: Articulation;
  /** कण स्वर: sounds on the beat for this many ms, then the main note */
  kanMs: number;
  /** group -> instruments chosen for it */
  inst: Record<string, string[]>;
  private store: SettingsStore;

  constructor(store: SettingsStore) {
    this.store = store;
    const keys = (store.get('saKeys', null) as Record<string, unknown> | null) ?? {};
    this.saKeys = {};
    for (const k of Object.keys(SA_DEF)) { const x = keys[k]; this.saKeys[k] = Number.isInteger(x) && (x as number) >= 0 && (x as number) < 12 ? (x as number) : SA_DEF[k]!.key; }
    this.artic = store.get('artic', 'santar') === 'nirantar' ? 'nirantar' : 'santar';
    const ms = +(store.get('kanMs', KAN_MS.default) as number);
    this.kanMs = ms >= KAN_MS.min && ms <= KAN_MS.max ? ms : KAN_MS.default;
    const saved = store.get('inst', null) as Record<string, unknown> | null;
    this.inst = {};
    for (const g of Object.keys(INSTRUMENT_DEFAULT)) {
      const ok = saved && Array.isArray(saved[g]) ? (saved[g] as unknown[]).filter((x): x is string => INSTRUMENT_OPTIONS[g]!.includes(x as string)) : null;
      this.inst[g] = ok && (ok.length || g === 'anak' || g === 'tal') ? ok : [...INSTRUMENT_DEFAULT[g]!];       // a melody part never has no instrument
    }
  }

  /** What the engine reads every time a note sounds. */
  engineSettings(): MelodicSettings { return { saKeys: this.saKeys, artic: this.artic, kanMs: this.kanMs }; }

  setSaKey(part: string, key: number): void { this.saKeys[part] = key; this.store.set('saKeys', this.saKeys); }
  setArtic(a: Articulation): void { this.artic = a; this.store.set('artic', a); }
  setKanMs(ms: number): void { this.kanMs = ms; this.store.set('kanMs', ms); }

  /** Switch an instrument of a group on or off. A melody part (शंख, वंशी) keeps at least one: returns false when that is what was refused. */
  toggleInstrument(group: string, id: string): boolean {
    const cur = this.inst[group]!;
    if (cur.includes(id)) { if ((group === 'shankh' || group === 'vanshi') && cur.length === 1) return false; this.inst[group] = cur.filter(x => x !== id); }
    else this.inst[group] = [...cur, id];
    this.store.set('inst', this.inst);
    return true;
  }

  /** Is this part switched on in the instrument choice (parts without a switch always are)? */
  enabled(part: string): boolean { const m = PART_INSTRUMENT[part]; return !m || this.inst[m[0]]!.includes(m[1]); }
  /** The voices that play a part: its chosen instruments, each as the voice it uses. */
  voicesFor(part: string): string[] { return (this.inst[part] ?? [part]).map(x => VOICE_OF[x] ?? x); }
}
