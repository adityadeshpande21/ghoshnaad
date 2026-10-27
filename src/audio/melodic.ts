// The melody instruments. One recipe, many voices: oscillators into a low-pass filter, with attack, scoop, vibrato and breath.
import type { Rig } from './rig.ts';

export interface VoiceSpec {
  oscs: [type: OscillatorType, mult: number, gain: number][];
  lp: { abs: number; q: number };
  atk: number;
  peak: number;
  scoop?: [number, number];
  breath?: number;
  vib?: [number, number, number];
  oct?: number;
}

export const VOICES: Record<string, VoiceSpec> = {
  shankh: { oscs: [['sawtooth', 1, 1], ['square', 1, .35]], lp: { abs: 1500, q: 1.2 }, atk: .045, scoop: [.96, .07], peak: .2 },
  vanshi: { oscs: [['sine', 1, 1], ['triangle', 2, .12]], lp: { abs: 3200, q: .7 }, breath: .05, atk: .05, vib: [5.2, 10, .35], peak: .24 },
  trumpet: { oscs: [['sawtooth', 1, 1]], lp: { abs: 2600, q: 1 }, atk: .03, scoop: [.97, .04], peak: .16 },
  venu: { oscs: [['sine', 1, 1], ['sine', 2, .08]], lp: { abs: 2500, q: .7 }, breath: .12, atk: .07, vib: [4.8, 14, .4], peak: .24 },
  clarinet: { oscs: [['square', 1, 1], ['sine', 1, .3]], lp: { abs: 2200, q: .8 }, atk: .04, peak: .15 },
  sax: { oscs: [['sawtooth', 1, 1]], lp: { abs: 1800, q: 2.5 }, breath: .03, atk: .035, vib: [5.5, 12, .3], peak: .16, oct: -1 },
  // मधुरिका (melodica): free reed — bright, reedy (odd + even harmonics), quick attack, steady (no vibrato), a little breath
  melodica: { oscs: [['square', 1, .7], ['sawtooth', 1, .45], ['sine', 2, .1]], lp: { abs: 2600, q: 1.1 }, breath: .025, atk: .018, peak: .15 },
};

/** वादनाची पट्टी, per part: शंख Sa = B♭4 (466 Hz), वंशी Sa = F♯5 (740 Hz). */
export const SA_DEF: Record<string, { key: number; oct: number }> = { shankh: { key: 10, oct: 4 }, vanshi: { key: 6, oct: 5 } };
export const SA_KEYS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const RATIO: Record<string, [number, number]> = { S: [1, 1], R: [16 / 15, 9 / 8], G: [6 / 5, 5 / 4], M: [4 / 3, 45 / 32], P: [3 / 2, 3 / 2], D: [8 / 5, 5 / 3], N: [9 / 5, 15 / 8] };

/** What the person can change in settings; read at the moment each note sounds. */
export interface MelodicSettings {
  saKeys: Record<string, number>;
  /** सांतर (default): each note stops a little before its time is up; निरंतर: full length. */
  artic: 'santar' | 'nirantar';
  /** कण स्वर: sounds on the beat for this long (ms), then the main note. */
  kanMs: number;
}

export interface NoteEvent {
  swara: string; octave?: number; vikrit?: boolean; dur: number;
  type?: string; accent?: boolean; swell?: string; slur?: string; grace?: NoteEvent[] | null;
  pk?: string; saHz?: number; fromKan?: boolean;
}

export const saHzOf = (s: MelodicSettings, pk: string): number => {
  const d = SA_DEF[pk] || SA_DEF.vanshi;
  return 440 * Math.pow(2, ((s.saKeys[pk in SA_DEF ? pk : 'vanshi']) - 9) / 12 + (d.oct - 4));
};

export const hz = (s: MelodicSettings, e: NoteEvent): number => {
  const r = RATIO[e.swara][e.vikrit ? (e.swara === 'M' ? 1 : 0) : (e.swara === 'M' ? 0 : 1)];
  return (e.saHz || saHzOf(s, e.pk || 'vanshi')) * r * Math.pow(2, e.octave || 0);
};

function breathNoise(r: Rig, t: number, d: number, f: number, gain: number, out: AudioNode): void {
  const n = r.c.createBufferSource(); n.buffer = r.noise; n.loop = true;
  const b = r.c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 1.5;
  const g = r.c.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .12); g.gain.linearRampToValueAtTime(0, t + d);
  n.connect(b).connect(g).connect(out); n.start(t, Math.random() * .5); n.stop(t + d + .05);
}

export function playNote(r: Rig, s: MelodicSettings, e: NoteEvent, t: number, out: AudioNode, part: string): void {
  const V = VOICES[part] || VOICES.vanshi;
  // कण स्वर: the grace note(s) take the start of the beat, the main note follows (म्ग = म briefly, then ग)
  const gn = e.grace ? e.grace.filter(g => g.type === 'note' || g.swara) : [];
  if (gn.length) {
    const gd = Math.min(s.kanMs / 1000, e.dur * .4 / gn.length);
    let tt = t;
    gn.forEach(g => { playNote(r, s, { ...g, pk: e.pk, saHz: e.saHz, grace: null, dur: gd, slur: 'start' }, tt, out, part); tt += gd; });
    return playNote(r, s, { ...e, grace: null, dur: e.dur - (tt - t), slur: e.slur === 'start' ? 'mid' : (e.slur || 'end'), fromKan: true }, tt, out, part);
  }
  const f = hz(s, e) * Math.pow(2, V.oct || 0);
  const held = !!e.slur && e.slur !== 'end';                          // slurred into the next note: full length
  const gap = s.artic === 'nirantar' || held ? 0 : Math.min(.08, Math.max(.03, e.dur * .12));
  const d = Math.max(.05, e.dur - gap), legato = e.slur === 'mid' || e.slur === 'end';
  const acc = !!e.accent && !e.fromKan;                               // ^ आघात: sharper, brighter, a little louder
  const peak = V.peak * (acc ? 1.3 : 1), atk = legato ? .02 : (acc ? .006 : V.atk);
  let p0 = peak, p1 = peak;
  if (e.swell === 'grow') { p0 = peak * .3; p1 = peak * 1.2; }
  if (e.swell === 'fade') { p0 = peak * 1.2; p1 = peak * .3; }
  const g = r.c.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(acc ? p0 * 1.35 : p0, t + atk);
  if (acc) g.gain.exponentialRampToValueAtTime(p0, t + atk + .09);
  // निरंतर (line above): a slurred note keeps full volume to its end and fades only while the next one starts — no gap
  const tail = held ? .035 : 0;
  g.gain.linearRampToValueAtTime(p1, t + Math.max(atk + .01, d - (held ? 0 : .04))); g.gain.linearRampToValueAtTime(0, t + d + tail);
  const lp = r.c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = V.lp.q || .7;
  if (acc) { lp.frequency.setValueAtTime(V.lp.abs * 2.4, t); lp.frequency.exponentialRampToValueAtTime(V.lp.abs, t + .16); } else lp.frequency.value = V.lp.abs;
  lp.connect(g).connect(out);
  const oscs = V.oscs.map(([type, mult, gain]) => {
    const o = r.c.createOscillator(); o.type = type;
    if (!legato && V.scoop) { o.frequency.setValueAtTime(f * mult * V.scoop[0], t); o.frequency.exponentialRampToValueAtTime(f * mult, t + V.scoop[1]); } else o.frequency.setValueAtTime(f * mult, t);
    const og = r.c.createGain(); og.gain.value = gain; o.connect(og).connect(lp);
    return o;
  });
  if (V.vib && d > V.vib[2] + .05) {
    const lfo = r.c.createOscillator(); lfo.frequency.value = V.vib[0];
    const lg = r.c.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(V.vib[1], t + V.vib[2]);
    lfo.connect(lg); oscs.forEach(o => lg.connect(o.detune)); lfo.start(t); lfo.stop(t + d + .05);
  }
  if (V.breath && !legato) breathNoise(r, t, d, f * 2, V.breath, out);
  oscs.forEach(o => { o.start(t); o.stop(t + d + tail + .05); });
}
