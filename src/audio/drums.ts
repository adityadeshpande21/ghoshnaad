// आनक and the ताल वाद्ये. Every stroke is a recipe of oscillators and filtered noise (the `live*` functions).
// To keep the player light, each recipe is rendered ONCE into a short clip when sound starts, and every stroke
// replays a clip; until the clips are ready the live recipe is used, so the sound is the same either way.
import type { Rig } from './rig.ts';
import { noiseBurst as noise } from './rig.ts';

export interface StrokeEvent {
  stroke?: string; accent?: boolean; dur: number; matraDur: number; beat?: number;
  rollPerMatra?: number; tala?: string; grace?: { stroke?: string }[];
}

export function liveHit(r: Rig, t: number, vel: number, out: AudioNode): void {
  noise(r, t, .13, 3200, .8, .55 * vel, out); noise(r, t, .05, 7000, .5, .25 * vel, out, 'highpass');
  const o = r.c.createOscillator(), g = r.c.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(150, t + .07);
  g.gain.setValueAtTime(.45 * vel, t); g.gain.exponentialRampToValueAtTime(.0001, t + .09);
  o.connect(g).connect(out); o.start(t); o.stop(t + .1);
}
export function liveClick(r: Rig, t: number, vel: number, out: AudioNode): void { noise(r, t, .025, 2600, 9, .9 * vel, out); }
/** + : the two sticks struck on each other — a sharp wooden clack, as loud as a तंकार. */
export function liveStick(r: Rig, t: number, vel: number, out: AudioNode): void {
  noise(r, t, .05, 1900, 2.2, 1.15 * vel, out); noise(r, t, .035, 3900, 2, .75 * vel, out); noise(r, t, .014, 7500, .7, .34 * vel, out, 'highpass');
  const o = r.c.createOscillator(), g = r.c.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(1350, t); o.frequency.exponentialRampToValueAtTime(1150, t + .03);
  g.gain.setValueAtTime(.38 * vel, t); g.gain.exponentialRampToValueAtTime(.0001, t + .045);
  o.connect(g).connect(out); o.start(t); o.stop(t + .06);
}
export function livePanav(r: Rig, t: number, v: number, out: AudioNode): void {
  const o = r.c.createOscillator(), g = r.c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(46, t + .16);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.95 * v, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .5);
  o.connect(g).connect(out); o.start(t); o.stop(t + .55);
  noise(r, t, .05, 700, .7, .4 * v, out, 'lowpass');
}
export function liveJhal(r: Rig, t: number, v: number, out: AudioNode): void {
  noise(r, t, .6, 6800, .6, .26 * v, out, 'highpass'); noise(r, t, .22, 3600, 1.4, .16 * v, out);
}
export function liveTrib(r: Rig, t: number, v: number, out: AudioNode): void {
  ([[2350, 1], [6150, .45], [8550, .25]] as const).forEach(([f, a]) => {
    const o = r.c.createOscillator(), g = r.c.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07 * a * v, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + .9);
    o.connect(g).connect(out); o.start(t); o.stop(t + .95);
  });
}
export function liveFoot(r: Rig, t: number, foot: string, out: AudioNode): void {
  noise(r, t, .09, foot === 'L' ? 190 : 250, .9, .8, out, 'lowpass'); noise(r, t, .03, 1800, 2, .25, out);
}

type Draw = (r: Rig, out: AudioNode) => void;
const CLIPS: [name: string, length: number, copies: number, draw: Draw][] = [
  ['hit', .16, 4, (r, o) => liveHit(r, 0, 1, o)],
  ['click', .06, 2, (r, o) => liveClick(r, 0, 1, o)],
  ['stick', .08, 3, (r, o) => liveStick(r, 0, 1, o)],
  ['panav', .58, 2, (r, o) => livePanav(r, 0, 1, o)],
  ['jhal', .64, 3, (r, o) => liveJhal(r, 0, 1, o)],
  ['trib', .96, 1, (r, o) => liveTrib(r, 0, 1, o)],
  ['footL', .12, 2, (r, o) => liveFoot(r, 0, 'L', o)],
  ['footR', .12, 2, (r, o) => liveFoot(r, 0, 'R', o)],
];

/** The drum kit bound to an engine: it asks the engine for the current context, so it follows an offline rebind. */
export class Drums {
  private clips: Record<string, AudioBuffer[]> = {};
  private made = false;
  private rig: () => Rig;
  constructor(rig: () => Rig) { this.rig = rig; }

  /** Render every clip into a buffer. Safe to call twice; resolves when all are ready. */
  renderClips(): Promise<void> {
    if (this.made) return Promise.resolve();
    this.made = true;
    const live = this.rig();
    const OAC: typeof OfflineAudioContext | undefined = typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext
      : (globalThis as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!OAC) return Promise.resolve();
    const jobs: Promise<void>[] = [];
    for (const [name, len, copies, draw] of CLIPS) {
      const pending: Promise<AudioBuffer | null>[] = [];
      for (let k = 0; k < copies; k++) {
        let off: OfflineAudioContext;
        try { off = new OAC(1, Math.ceil(live.c.sampleRate * len), live.c.sampleRate); } catch { return Promise.all(jobs).then(() => undefined); }
        try { draw({ c: off, noise: live.noise }, off.destination); } catch { /* keep the live recipe for this clip */ }
        pending.push(off.startRendering().then(b => b, () => null));
      }
      // clips are published together, in the order they were drawn, so a stroke never picks from a half-filled set
      jobs.push(Promise.all(pending).then(bs => { const ok = bs.filter((b): b is AudioBuffer => !!b); if (ok.length) this.clips[name] = ok; }));
    }
    return Promise.all(jobs).then(() => undefined);
  }

  private playClip(name: string, t: number, vel: number, out: AudioNode, maxLen?: number): boolean {
    const a = this.clips[name];
    if (!a || !a.length) return false;
    const { c } = this.rig();
    const b = a[(Math.random() * a.length) | 0], s = c.createBufferSource(), g = c.createGain();
    s.buffer = b; g.gain.setValueAtTime(vel, t);
    let end = t + b.duration;
    if (maxLen && maxLen < b.duration) { g.gain.setTargetAtTime(0, t + maxLen * .7, maxLen * .12); end = t + maxLen + .08; }
    s.connect(g).connect(out); s.start(t); s.stop(end);
    return true;
  }

  hit(t: number, vel: number, out: AudioNode): void { if (!this.playClip('hit', t, vel, out)) liveHit(this.rig(), t, vel, out); }
  click(t: number, vel: number, out: AudioNode): void { if (!this.playClip('click', t, vel, out)) liveClick(this.rig(), t, vel, out); }
  stick(t: number, vel: number, out: AudioNode): void { if (!this.playClip('stick', t, vel, out)) liveStick(this.rig(), t, vel, out); }
  // ताल वाद्ये: maxLen shortens the ring at a fast लय, so one stroke does not ring into the next
  panav(t: number, v: number, out: AudioNode, maxLen?: number): void { if (!this.playClip('panav', t, v, out, maxLen)) livePanav(this.rig(), t, v, out); }
  jhal(t: number, v: number, out: AudioNode, maxLen?: number): void { if (!this.playClip('jhal', t, v, out, maxLen)) liveJhal(this.rig(), t, v, out); }
  trib(t: number, v: number, out: AudioNode, maxLen?: number): void { if (!this.playClip('trib', t, v, out, maxLen)) liveTrib(this.rig(), t, v, out); }
  footfall(t: number, foot: string, out: AudioNode): void { if (!this.playClip('foot' + foot, t, 1, out)) liveFoot(this.rig(), t, foot, out); }

  /** त्र (रणन). केरवा: 4 तंकार per matra, each followed by one अनुतंकार; खेमटा: 3 per matra = one तंकार + two अनुतंकार,
   *  with a light accent on the first matra of every गट (घोष परिचय p. 54). Other talas roll like केरवा (p. 52). */
  roll(t: number, dur: number, md: number, triple: boolean, v: number, out: AudioNode, beat?: number): void {
    if (triple) {
      const n = Math.max(1, Math.round(dur / md * 3)), st = dur / n;
      for (let k = 0; k < n; k++) {
        const j = Math.floor(k / 3), gat = beat ? ((beat - 1 + j) % 3 === 0) : false;
        this.hit(t + k * st, k % 3 === 0 ? (k === 0 ? v : 1) * (gat ? 1.15 : .9) : .42, out);
      }
    } else {
      const n = Math.max(1, Math.round(dur / md * 4)), st = dur / n;
      for (let k = 0; k < n; k++) { this.hit(t + k * st, (k === 0 ? v : 1) * .7, out); this.hit(t + k * st + st * .5, .3, out); }
    }
  }

  playStroke(e: StrokeEvent, t: number, out: AudioNode): void {
    const v = e.accent ? 1.45 : 1;
    // `तत (त्त): the other stick strikes one तंकार just before the main one.
    // त्र्त: just before the main तंकार the other stick plays a तंकार with its अनुतंकार (घोष परिचय p. 46).
    if (e.grace) e.grace.forEach(g => { if (g.stroke === 'roll') { this.hit(t - .06, .45, out); this.hit(t - .034, .28, out); } else this.hit(t - .035, .4, out); });
    switch (e.stroke) {
      case 'ta': this.hit(t, v, out); break;
      case 'tha': this.hit(t, 1.25 * v, out); this.hit(t + .008, .9 * v, out); break;
      case 'thra': this.hit(t, 1.2 * v, out); this.hit(t + .008, .8 * v, out); for (let k = 1; k < 5; k++) this.hit(t + k * .028, .32 / k * v, out); break;
      case 'click': this.stick(t, v, out); break;
      case 'roll': this.roll(t, e.dur, e.matraDur, e.rollPerMatra ? e.rollPerMatra === 3 : e.tala === 'khemta', v, out, e.beat); break;
      default: this.hit(t, v, out);
    }
  }
}
