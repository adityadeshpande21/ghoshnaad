import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SoundSettings, INSTRUMENT_OPTIONS, VOICE_OF } from '../../src/audio/soundSettings.ts';
import { SA_DEF } from '../../src/audio/melodic.ts';

const store = (o = {}) => { const m = { ...o }; return { get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = v; }, dump: () => m }; };

test('defaults: शंख Sa B♭ (10), वंशी Sa F♯ (6), सांतर, 60 ms, one instrument per melody part and every tala instrument', () => {
  const s = new SoundSettings(store());
  assert.deepEqual(s.saKeys, { shankh: SA_DEF.shankh.key, vanshi: SA_DEF.vanshi.key }); assert.equal(s.saKeys.shankh, 10); assert.equal(s.saKeys.vanshi, 6);
  assert.equal(s.artic, 'santar'); assert.equal(s.kanMs, 60);
  assert.deepEqual(s.inst, { shankh: ['bugle'], vanshi: ['flute'], anak: ['side'], tal: ['bass', 'cym', 'tri'] });
});
test('stored values are checked: a damaged one falls back to the default', () => {
  const s = new SoundSettings(store({ saKeys: { shankh: 99, vanshi: 3.5, extra: 1 }, artic: 'sideways', kanMs: 5, inst: { shankh: [], vanshi: ['flute', 'tuba', 'sax'], anak: [], tal: 'bass' } }));
  assert.deepEqual(s.saKeys, { shankh: 10, vanshi: 6 });
  assert.equal(s.artic, 'santar'); assert.equal(s.kanMs, 60);
  assert.deepEqual(s.inst.shankh, ['bugle']);                          // an empty melody part is not allowed
  assert.deepEqual(s.inst.vanshi, ['flute', 'sax']);                   // unknown instruments are dropped
  assert.deepEqual(s.inst.anak, []);                                   // the drum may be switched off
  assert.deepEqual(s.inst.tal, ['bass', 'cym', 'tri']);
  const ok = new SoundSettings(store({ saKeys: { shankh: 0, vanshi: 11 }, artic: 'nirantar', kanMs: 200 }));
  assert.deepEqual([ok.saKeys.shankh, ok.saKeys.vanshi, ok.artic, ok.kanMs], [0, 11, 'nirantar', 200]);
  assert.equal(new SoundSettings(store({ kanMs: 201 })).kanMs, 60); assert.equal(new SoundSettings(store({ kanMs: 20 })).kanMs, 20);
});
test('changes are saved under the keys v1.1.0 used, and the engine sees them at once', () => {
  const st = store(), s = new SoundSettings(st), live = s.engineSettings();
  s.setSaKey('vanshi', 8); s.setArtic('nirantar'); s.setKanMs(90);
  assert.deepEqual([st.dump().saKeys.vanshi, st.dump().artic, st.dump().kanMs], [8, 'nirantar', 90]);
  assert.equal(s.engineSettings().saKeys.vanshi, 8); assert.equal(live.saKeys.vanshi, 8);     // the same record: no copy to go stale
  s.artic = 'santar'; assert.equal(s.engineSettings().artic, 'santar'); assert.equal(st.dump().artic, 'nirantar');   // a plain assignment (the sound check) is not saved
  assert.deepEqual(new SoundSettings(st).saKeys, { shankh: 10, vanshi: 8 });
});
test('instruments: a melody part keeps one, a drum or tala instrument may all be off; the voices follow the choice', () => {
  const st = store(), s = new SoundSettings(st);
  assert.equal(s.toggleInstrument('shankh', 'bugle'), false); assert.deepEqual(s.inst.shankh, ['bugle']);    // the last one stays
  assert.equal(s.toggleInstrument('shankh', 'trumpet'), true); assert.deepEqual(s.inst.shankh, ['bugle', 'trumpet']);
  assert.deepEqual(s.voicesFor('shankh'), ['shankh', 'trumpet']);
  assert.equal(s.toggleInstrument('shankh', 'bugle'), true); assert.deepEqual(s.inst.shankh, ['trumpet']);
  assert.deepEqual(st.dump().inst.shankh, ['trumpet']);
  s.toggleInstrument('anak', 'side'); assert.deepEqual(s.inst.anak, []);
  assert.equal(s.enabled('anak'), false); assert.equal(s.enabled('panav'), true); assert.equal(s.enabled('shankh'), true);
  s.toggleInstrument('tal', 'bass'); assert.equal(s.enabled('panav'), false); assert.equal(s.enabled('jhallari'), true);
  assert.deepEqual(s.voicesFor('steps'), ['steps']);                    // a part with no choice plays as itself
});
test('every instrument that can be chosen has a voice', () => {
  for (const [g, ids] of Object.entries(INSTRUMENT_OPTIONS)) if (g === 'shankh' || g === 'vanshi') for (const id of ids) assert.ok(VOICE_OF[id], `${g}: ${id}`);
});
