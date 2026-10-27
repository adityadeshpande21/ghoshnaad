// Keeps the person's work from being lost without their knowing: asks the browser to keep the storage,
// reports how much is used, and says when a backup is due (7 days or 10 edits since the last one, whichever comes first).
import { getJSON, setJSON } from '../data/kv.ts';
import type { Kv } from '../data/kv.ts';

export interface BackupState { at: string | null; edits: number; firstEdit: string | null }
export interface StorageManagerLike {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
  estimate?: () => Promise<{ usage?: number; quota?: number }>;
}
export interface Due { due: boolean; reason: 'edits' | 'days' | null; edits: number; days: number | null }

export const REMIND_AFTER_DAYS = 7;
export const REMIND_AFTER_EDITS = 10;
const DAY = 86_400_000;

export class StorageGuard {
  private kv: Kv;
  private storage: StorageManagerLike | undefined;
  private now: () => Date;
  constructor(kv: Kv, env: { storage?: StorageManagerLike; now?: () => Date } = {}) {
    this.kv = kv; this.storage = env.storage; this.now = env.now ?? (() => new Date());
  }

  state(): BackupState {
    const s = getJSON<Partial<BackupState>>(this.kv, 'backup', {});
    return { at: typeof s.at === 'string' ? s.at : null, edits: Number.isInteger(s.edits) && s.edits! > 0 ? s.edits! : 0, firstEdit: typeof s.firstEdit === 'string' ? s.firstEdit : null };
  }
  private save(s: BackupState): void { setJSON(this.kv, 'backup', s); }

  /** Call whenever the person saves a change to their own work. */
  noteEdit(): void {
    const s = this.state();
    this.save({ ...s, edits: s.edits + 1, firstEdit: s.firstEdit ?? this.now().toISOString() });
  }
  /** Call when a backup file has been handed to the person. */
  noteBackup(): void { this.save({ at: this.now().toISOString(), edits: 0, firstEdit: null }); }

  due(): Due {
    const s = this.state();
    if (s.edits === 0) return { due: false, reason: null, edits: 0, days: s.at ? this.daysSince(s.at) : null };
    const since = s.at ?? s.firstEdit;
    const days = since ? this.daysSince(since) : 0;
    const reason = s.edits >= REMIND_AFTER_EDITS ? 'edits' : days >= REMIND_AFTER_DAYS ? 'days' : null;
    return { due: reason !== null, reason, edits: s.edits, days: since ? days : null };
  }
  daysSinceBackup(): number | null { const s = this.state(); return s.at ? this.daysSince(s.at) : null; }
  private daysSince(iso: string): number { return Math.max(0, Math.floor((this.now().getTime() - new Date(iso).getTime()) / DAY)); }

  /** Ask the browser not to clear this storage when space is short. Browsers may say no; the answer is shown in settings. */
  async persist(): Promise<boolean> {
    try { if (this.storage?.persisted && (await this.storage.persisted())) return true; return this.storage?.persist ? await this.storage.persist() : false; } catch { return false; }
  }
  async status(): Promise<{ persisted: boolean | null; usage: number | null; quota: number | null }> {
    let persisted: boolean | null = null, usage: number | null = null, quota: number | null = null;
    try { if (this.storage?.persisted) persisted = await this.storage.persisted(); } catch { /* unknown */ }
    try { if (this.storage?.estimate) { const e = await this.storage.estimate(); usage = e.usage ?? null; quota = e.quota ?? null; } } catch { /* unknown */ }
    return { persisted, usage, quota };
  }
}
