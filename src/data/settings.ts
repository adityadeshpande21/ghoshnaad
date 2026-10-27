// Preferences. Values are validated on the way out, so a damaged or hand-edited value falls back to the default
// instead of breaking the app; unknown keys are never read.
import { getJSON, setJSON } from './kv.ts';
import type { Kv } from './kv.ts';
import { SETTING_KEYS, isSettingKey } from './schema.ts';
import type { SettingKey } from './schema.ts';

const LANGS = ['mr', 'hi', 'en'];
type Validator = (v: unknown) => boolean;
const str: Validator = v => typeof v === 'string';
const ARR: Validator = v => Array.isArray(v);
const OBJ: Validator = v => !!v && typeof v === 'object' && !Array.isArray(v);

const VALID: Record<SettingKey, Validator> = {
  lang: v => typeof v === 'string' && LANGS.includes(v),
  theme: v => v === 'light' || v === 'dark',
  sec: str,
  insF: v => v === null || typeof v === 'string',
  saKeys: v => OBJ(v) && Object.values(v as object).every(x => Number.isInteger(x) && (x as number) >= 0 && (x as number) < 12),
  artic: v => v === 'santar' || v === 'nirantar',
  kanMs: v => typeof v === 'number' && v >= 20 && v <= 200,
  inst: OBJ,
  sel2: ARR,
  recent: ARR,
  lib: v => v === 'book' || v === 'mine',
  xstyle: v => v === 'rich' || v === 'plain',
  xlay: v => v === 'score' || v === 'pages',
  xsel2: ARR,
  skView: str,
  guideOff: v => typeof v === 'boolean',
};

export class Settings {
  private kv: Kv;
  constructor(kv: Kv) { this.kv = kv; }

  get<T = unknown>(key: SettingKey, fallback: T): T {
    const v = getJSON<unknown>(this.kv, key, undefined);
    // v1.1.0 stored the view choice as a bare word, not JSON
    const raw = v === undefined && key === 'skView' ? this.kv.get(key) : v;
    return raw !== undefined && VALID[key](raw) ? (raw as T) : fallback;
  }
  set(key: SettingKey, value: unknown): boolean {
    if (!VALID[key](value)) return false;
    return key === 'skView' ? this.kv.set(key, String(value)) : setJSON(this.kv, key, value);
  }
  /** Everything that is set and valid, for a backup. */
  all(): Partial<Record<SettingKey, unknown>> {
    const out: Partial<Record<SettingKey, unknown>> = {};
    for (const k of SETTING_KEYS) { const v = this.get<unknown>(k, undefined); if (v !== undefined) out[k] = v; }
    return out;
  }
  /** Keys of `values` that this device has not set yet. */
  missingFrom(values: Record<string, unknown>): SettingKey[] {
    return Object.keys(values).filter(isSettingKey).filter(k => this.kv.get(k) === null && VALID[k](values[k]));
  }
}
