// New versions. The website is the update channel: the offline-cache worker is registered, version.json is checked,
// and a new version is switched to only when nothing is playing and nothing is unsaved.
// (The downloaded Ghoshnaad.html has no worker and no network check: it is replaced by hand.)

export interface VersionInfo { version: string; date?: string; whatsNew?: Record<string, string[]> }
export type UpdateState = { kind: 'none' } | { kind: 'available' | 'ready'; info: VersionInfo };

interface WorkerLike { state: string; postMessage(m: unknown): void; addEventListener(t: string, f: () => void): void }
interface RegistrationLike {
  waiting: WorkerLike | null; installing: WorkerLike | null;
  addEventListener(t: string, f: () => void): void; update(): Promise<unknown>;
}
export interface UpdateEnv {
  appVersion: string;
  fetchVersion(): Promise<VersionInfo | null>;
  sw?: { register(url: string): Promise<RegistrationLike>; controller: unknown; addEventListener(t: string, f: () => void): void };
  reload(): void;
  /** true while something is playing or an edit is unsaved: the switch must wait */
  busy(): boolean;
}

/** Compare "2.0.0-alpha.1" style versions: a release is newer than its own pre-releases. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => { const [core, pre] = v.split('-'); return { n: core.split('.').map(x => parseInt(x, 10) || 0), pre: pre ?? null }; };
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) { const d = (x.n[i] ?? 0) - (y.n[i] ?? 0); if (d) return d < 0 ? -1 : 1; }
  if (x.pre === y.pre) return 0;
  if (x.pre === null) return 1;
  if (y.pre === null) return -1;
  const px = x.pre.split('.'), py = y.pre.split('.');
  for (let i = 0; i < Math.max(px.length, py.length); i++) {
    const a1 = px[i], b1 = py[i];
    if (a1 === undefined) return -1; if (b1 === undefined) return 1;
    const na = /^\d+$/.test(a1), nb = /^\d+$/.test(b1);
    if (na && nb) { const d = +a1 - +b1; if (d) return d < 0 ? -1 : 1; }
    else if (a1 !== b1) return a1 < b1 ? -1 : 1;
  }
  return 0;
}

export class UpdateManager {
  private env: UpdateEnv;
  private reg: RegistrationLike | null = null;
  private listeners = new Set<(s: UpdateState) => void>();
  private _state: UpdateState = { kind: 'none' };
  private applying = false;

  constructor(env: UpdateEnv) { this.env = env; }
  get state(): UpdateState { return this._state; }
  onChange(cb: (s: UpdateState) => void): () => void { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  private set(s: UpdateState): void {
    const same = s.kind === this._state.kind && (s.kind === 'none' || (this._state.kind !== 'none' && s.info.version === this._state.info.version));
    if (same) return;
    this._state = s; this.listeners.forEach(f => f(s));
  }

  /** Register the worker and look for a newer version. Safe to call once at start-up. */
  async start(): Promise<void> {
    const sw = this.env.sw;
    if (sw) {
      try {
        this.reg = await sw.register('sw.js');
        const watch = (w: WorkerLike | null) => { if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && sw.controller) void this.check(); }); };
        watch(this.reg.installing);
        this.reg.addEventListener('updatefound', () => watch(this.reg!.installing));
      } catch { this.reg = null; }
    }
    await this.check();
  }

  /** Ask the network (and the worker) whether there is a newer version. */
  async check(): Promise<UpdateState> {
    let info: VersionInfo | null = null;
    try { info = await this.env.fetchVersion(); } catch { info = null; }
    try { await this.reg?.update(); } catch { /* offline */ }
    if (info && compareVersions(info.version, this.env.appVersion) > 0) this.set({ kind: this.reg?.waiting ? 'ready' : 'available', info });
    else this.set({ kind: 'none' });
    return this._state;
  }

  /** Switch to the new version, unless something is playing or unsaved. Returns false (and does nothing) in that case. */
  apply(): boolean {
    if (this._state.kind === 'none' || this.applying || this.env.busy()) return false;
    this.applying = true;
    const waiting = this.reg?.waiting;
    if (waiting && this.env.sw) {
      this.env.sw.addEventListener('controllerchange', () => this.env.reload());
      waiting.postMessage('skip-waiting');
    } else this.env.reload();
    return true;
  }
}
