// The one audio context of the app, and everything that must be true before a sound can be heard:
// the master chain, the shared noise, the pre-rendered drum clips, per-part volume, iPhone unlock, interruptions.
import { Drums } from './drums.ts';
import type { Rig } from './rig.ts';
import { hz, playNote, saHzOf } from './melodic.ts';
import type { MelodicSettings, NoteEvent } from './melodic.ts';

export type EngineState = 'running' | 'suspended' | 'interrupted' | 'closed' | 'none';

export interface EngineOptions {
  /** Read every time a note sounds, so a change in settings is heard on the next note. */
  settings: () => MelodicSettings;
}

type AudioContextCtor = typeof AudioContext;

export class AudioEngine {
  ctx: BaseAudioContext | null = null;
  master: GainNode | null = null;
  noise: AudioBuffer | null = null;
  /** Per-part volume nodes; replaced (not cleared) when playback stops, so the old ones can fade out. */
  parts: Record<string, GainNode> = {};
  readonly drums: Drums;
  private listeners = new Set<(s: EngineState) => void>();
  private contextListeners = new Set<() => void>();
  private iosKeepAlive: HTMLAudioElement | null = null;
  private clipsReady: Promise<void> = Promise.resolve();

  private opts: EngineOptions;
  constructor(opts: EngineOptions) {
    this.opts = opts;
    this.drums = new Drums(() => this.rig());
  }

  /** Context and noise as one object, for the sound recipes. */
  rig(): Rig {
    if (!this.ctx || !this.noise) throw new Error('the audio engine has not been started (call unlock() inside a tap)');
    return { c: this.ctx, noise: this.noise };
  }

  get state(): EngineState { return this.ctx ? (this.ctx.state as EngineState) : 'none'; }
  get currentTime(): number { return this.ctx ? this.ctx.currentTime : 0; }

  /** Seconds between a sound being scheduled and being heard. */
  outputLatency(): number {
    const c = this.ctx as AudioContext | null;
    return c ? Math.min(.5, (c.outputLatency || 0) + (c.baseLatency || 0)) : 0;
  }

  onState(cb: (s: EngineState) => void): () => void { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  /** Called when the engine moves to another context (offline rendering), so callers can refresh what they hold. */
  onContext(cb: () => void): () => void { this.contextListeners.add(cb); return () => this.contextListeners.delete(cb); }

  /**
   * Start or resume sound. Must be called inside a tap or key press (browsers refuse otherwise).
   * First call creates the context, the noise and the drum clips; later calls resume a suspended or interrupted context.
   */
  unlock(): BaseAudioContext {
    if (!this.ctx) {
      const AC: AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext;
      let c: AudioContext;
      try { c = new AC({ latencyHint: 'playback' }); } catch { c = new AC(); }
      this.ctx = c;
      this.buildChain();
      const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = nb;
      this.clipsReady = this.drums.renderClips();
      c.addEventListener('statechange', () => this.emit());
      this.unmuteIOS();
    }
    const c = this.ctx as AudioContext;
    if (c.state === 'suspended' || (c.state as string) === 'interrupted') void c.resume();
    return c;
  }

  /** Resolves when the pre-rendered drum clips are ready (sound works before that, with the live recipes). */
  whenReady(): Promise<void> { return this.clipsReady; }

  private buildChain(): void {
    const c = this.ctx!;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(c.destination);
    const master = c.createGain(); master.gain.value = .85; master.connect(comp);
    this.master = master;
    this.parts = {};
  }

  /**
   * Move the engine to another context with the same noise and clips: used to render a rachana offline
   * (tests, and later MP3 export). The live context is not touched.
   */
  useContext(c: BaseAudioContext): void {
    this.ctx = c;
    this.buildChain();
    this.contextListeners.forEach(f => f());
  }

  /** The volume node of one part; `level` is its starting volume (0 = muted). */
  partOutput(key: string, level: number): GainNode {
    if (!this.parts[key]) {
      const g = this.ctx!.createGain();
      g.gain.value = level; g.connect(this.master!);
      this.parts[key] = g;
    }
    return this.parts[key];
  }

  /** Fade every part out and start fresh nodes for the next play. */
  fadeOutParts(): void {
    const c = this.ctx;
    if (!c) return;
    const old = this.parts;
    this.parts = {};
    Object.values(old).forEach(g => { g.gain.cancelScheduledValues(c.currentTime); g.gain.setTargetAtTime(0, c.currentTime, .02); });
    setTimeout(() => Object.values(old).forEach(g => g.disconnect()), 250);
  }

  /** Play one note of a melody part through `out`. */
  note(e: NoteEvent, t: number, out: AudioNode, voice: string): void { playNote(this.rig(), this.opts.settings(), e, t, out, voice); }
  hz(e: NoteEvent): number { return hz(this.opts.settings(), e); }
  saHz(pk: string): number { return saHzOf(this.opts.settings(), pk); }

  private emit(): void { const s = this.state; this.listeners.forEach(f => f(s)); }

  /**
   * iPhone and iPad: the silent switch mutes Web Audio unless the page is also playing a media element.
   * A silent looping <audio> started inside the first tap switches the page to the "playback" audio category.
   * Other devices are left alone (a media element could show lock-screen controls there).
   */
  private unmuteIOS(): void {
    const nav = navigator as Navigator & { audioSession?: { type: string }; maxTouchPoints: number };
    try { if (nav.audioSession) nav.audioSession.type = 'playback'; } catch { /* not supported */ }
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && nav.maxTouchPoints > 1);
    if (!ios || this.iosKeepAlive) return;
    const a = document.createElement('audio');
    a.src = silentWavUrl(); a.loop = true; a.preload = 'auto';
    a.setAttribute('playsinline', ''); a.setAttribute('x-webkit-airplay', 'deny');
    a.hidden = true;
    document.body.appendChild(a);                                   // attached, so the page keeps it alive
    this.iosKeepAlive = a;
    void a.play().catch(() => { a.remove(); this.iosKeepAlive = null; });
  }
}

/** A 0.1 s silent 8-bit mono 8 kHz WAV, built in memory (so nothing is fetched and the file stays small). */
function silentWavUrl(): string {
  const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
  const tag = (o: number, s: string) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  tag(0, 'RIFF'); v.setUint32(4, 36 + n, true); tag(8, 'WAVE'); tag(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); tag(36, 'data'); v.setUint32(40, n, true);
  b.fill(128, 44);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}
