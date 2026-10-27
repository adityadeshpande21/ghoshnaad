// What every sound recipe needs: the context to build nodes in and the shared white-noise buffer.
export interface Rig { c: BaseAudioContext; noise: AudioBuffer }

/** A burst of filtered noise with a fast attack and an exponential decay. */
export function noiseBurst(r: Rig, t: number, dur: number, f: number, q: number, gain: number, out: AudioNode, type: BiquadFilterType = 'bandpass'): void {
  const n = r.c.createBufferSource();
  n.buffer = r.noise;
  const b = r.c.createBiquadFilter();
  b.type = type; b.frequency.value = f; b.Q.value = q;
  const g = r.c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + .002);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  n.connect(b).connect(g).connect(out);
  n.start(t, Math.random() * .5);
  n.stop(t + dur + .02);
}
