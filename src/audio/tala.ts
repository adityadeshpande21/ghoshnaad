// The three sounds of the tala timeline page: a wooden tick on every अंक, the पणव stroke on a ध्वंकार, a footfall.
// They are plain recipes (oscillators and filtered noise) and are heard exactly as on the v1.1.0 tala page.
import type { Rig } from './rig.ts';

/** ठेका: a short wooden tick on every अंक — सम highest, each गण start a step lower, each गट start lower, the rest soft. */
export function tick(r: Rig, t: number, lvl: number, out: AudioNode): void {
  const f = [1500, 1150, 950, 780][lvl], v = [.55, .4, .3, .18][lvl];
  const o = r.c.createOscillator(), g = r.c.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .8, t + .05);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
  o.connect(g).connect(out); o.start(t); o.stop(t + .08);
  const s = r.c.createBufferSource(), bp = r.c.createBiquadFilter(), ng = r.c.createGain();
  s.buffer = r.noise; bp.type = 'bandpass'; bp.frequency.value = f * 2.2; bp.Q.value = 3;
  ng.gain.setValueAtTime(v * .5, t); ng.gain.exponentialRampToValueAtTime(.0001, t + .02);
  s.connect(bp).connect(ng).connect(out); s.start(t); s.stop(t + .03);
}

/** Which of the four levels an अंक has: 0 = सम, 1 = start of a गण, 2 = start of a गट, 3 = any other. */
export function levelOf(gans: number[][], k: number): number {
  if (k === 1) return 0;
  let n = 0;
  for (const g of gans) {
    if (k === n + 1) return 1;
    let m = n;
    for (const gl of g) { if (k === m + 1) return 2; m += gl; }
    n = m;
  }
  return 3;
}

export function panavStroke(r: Rig, t: number, acc: boolean, out: AudioNode): void {
  const o = r.c.createOscillator(), g = r.c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(48, t + .16);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(acc ? .75 : .5, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .45);
  o.connect(g).connect(out); o.start(t); o.stop(t + .5);
}

export function footfall(r: Rig, t: number, out: AudioNode): void {
  const s = r.c.createBufferSource(), f = r.c.createBiquadFilter(), g = r.c.createGain();
  s.buffer = r.noise; f.type = 'lowpass'; f.frequency.value = 220;
  g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(.0001, t + .09);
  s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + .1);
}
