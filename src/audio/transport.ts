// "What is playing now": a look-ahead scheduler over one sorted list of timed items.
// It owns the clock, the loop window, the position and the reaction to an interrupted audio context.
// It knows nothing about what an item sounds like; the owner passes `dispatch` for that.
import type { AudioEngine, EngineState } from './engine.ts';

const EPS = 1e-6;
const AHEAD = .5;           // seconds of sound scheduled in advance
const TICK_MS = 25;

/** A thing at a time (seconds). What else it holds is the caller's: the player's items carry a part and a step, the tala page's a count, the Ghoshdand page's a function. */
export interface Timed { t: number; [payload: string]: any }
export interface Window { s: number; e: number }

/** Plain, readable state: the screens read (and a few write) these fields directly. */
export interface TransportState {
  playing: boolean;
  /** engine clock time at which timeline second `off` is heard */
  t0: number;
  /** timeline second playback started from */
  off: number;
  /** index of the next item to schedule */
  idx: number;
  winS: number;
  winE: number;
  /** the timer / animation-frame handles and count-in timeouts of the owner */
  timer: 'w' | ReturnType<typeof setInterval> | null;
  raf: number | null;
  cnt: ReturnType<typeof setTimeout>[];
  /** where playback was left (timeline seconds) */
  pos: number;
  /** a range chosen by the composer; plays in a loop like a loop window */
  custom: Window | null;
}

export interface TransportHooks<I extends Timed> {
  /** Sound one item at engine time `at`. */
  dispatch(item: I, at: number): void;
  /** The end of the piece was reached. */
  onEnd(): void;
  /** An item was skipped because it would have come too late. */
  onLate?(): void;
  /** The audio context was interrupted (call, lock screen, tab switch) while playing. `pos` is where to resume. */
  onInterrupt?(pos: number): void;
}

export class Transport<I extends Timed> {
  readonly state: TransportState = { playing: false, t0: 0, off: 0, idx: 0, winS: 0, winE: Infinity, timer: null, raf: null, cnt: [], pos: 0, custom: null };
  items: I[] = [];
  end = 0;
  private engine: AudioEngine;
  private hooks: TransportHooks<I>;
  private ticker: Worker | null = null;

  constructor(engine: AudioEngine, hooks: TransportHooks<I>) {
    this.engine = engine;
    this.hooks = hooks;
    engine.onState(s => this.engineState(s));
  }

  /** Replace what is to be played. `items` must be sorted by time. */
  load(items: I[], end: number): void { this.items = items; this.end = end; }

  /** Timeline second now playing (or where playback stopped). */
  position(): number {
    const s = this.state;
    return s.playing && this.engine.ctx ? Math.max(0, this.engine.currentTime - s.t0 + s.off) : s.pos;
  }

  /**
   * Start from timeline second `from`. `window` loops that range (the loop button, or the composer's range).
   * `lead` is how many seconds from now the first second is heard (a count-in makes it longer).
   */
  start(o: { from: number; window?: Window | null; lead?: number }): void {
    const s = this.state;
    if (s.playing) this.halt();
    s.off = o.from; s.winS = 0; s.winE = Infinity;
    if (o.window) { s.winS = o.window.s; s.winE = o.window.e; if (o.from < s.winS || o.from >= s.winE) s.off = s.winS; }
    s.t0 = this.engine.currentTime + (o.lead ?? .12);
    s.idx = this.items.findIndex(x => x.t >= s.off - EPS);
    if (s.idx < 0) s.idx = this.items.length;
    s.playing = true;
    s.timer = this.tick(true);
    this.pump();
  }

  /** Stop scheduling. Fading the sound out is the engine's job (`fadeOutParts`). */
  halt(): void {
    const s = this.state;
    s.playing = false;
    this.untick(s.timer);
    s.timer = null;
  }

  private engineState(st: EngineState): void {
    if (!this.state.playing || st === 'running') return;
    const pos = this.position();
    this.halt();
    this.state.pos = pos;
    this.hooks.onInterrupt?.(pos);
  }

  /** Schedule everything due within the look-ahead. Called by the clock; public so a test can drive it with a fake clock. */
  pump(): void {
    const s = this.state;
    if (!s.playing || !this.engine.ctx) return;
    const now = this.engine.currentTime, ahead = now + AHEAD;
    for (;;) {
      if (s.idx >= this.items.length || this.items[s.idx].t >= s.winE - EPS) {
        if (s.winE !== Infinity) {                                   // loop: queue the window again
          const next = s.t0 + (s.winE - s.off);
          if (next - ahead > .2) return;
          s.t0 = next; s.off = s.winS;
          s.idx = this.items.findIndex(x => x.t >= s.winS - EPS);
          continue;
        }
        if (this.engine.currentTime > s.t0 + (this.end - s.off) + .4) this.hooks.onEnd();
        return;
      }
      const it = this.items[s.idx], at = s.t0 + (it.t - s.off);
      if (at > ahead) return;
      if (at < now - .02) { s.idx++; this.hooks.onLate?.(); continue; }
      this.hooks.dispatch(it, at);
      s.idx++;
    }
  }

  /** A steady clock: a tiny background worker ticks every 25 ms (browsers slow down page timers, not workers). */
  private tick(on: boolean): TransportState['timer'] {
    if (!on) return null;
    try {
      if (!this.ticker) {
        this.ticker = new Worker(URL.createObjectURL(new Blob(['let i=null;onmessage=e=>{clearInterval(i);if(e.data>0)i=setInterval(()=>postMessage(0),e.data)}'], { type: 'text/javascript' })));
        this.ticker.onmessage = () => this.pump();
      }
      this.ticker.postMessage(TICK_MS);
      return 'w';
    } catch {
      this.ticker = null;
      return setInterval(() => this.pump(), 40);
    }
  }
  private untick(id: TransportState['timer']): void {
    if (id === 'w') { try { this.ticker!.postMessage(0); } catch { /* worker gone */ } }
    else if (id) clearInterval(id);
  }
}
