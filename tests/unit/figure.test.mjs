// The Ghoshdand figure (pose solver and drawing) must give exactly what v1.1.0's sanket.js gave.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { Figure } from '../../src/screens/ghoshdand/figure.loose.js';
import { ROOT } from '../golden/lib.mjs';

const legacy = (() => {
  const sandbox = { module: { exports: {} }, window: undefined };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'legacy/src/app/sanket.js'), 'utf8'), sandbox);
  return sandbox.module.exports;
})();
const j = x => JSON.parse(JSON.stringify(x));          // the old module lives in its own realm: compare by value
const VIEWS = ['front', 'pramukh', 'side'];

test('the data (poses, signals, rules, phases, flags, animations) is the same', () => {
  for (const k of ['POSES', 'SIGNALS', 'RULES', 'PH', 'FLAGS', 'ANIM']) assert.deepEqual(j(Figure[k]), j(legacy[k]), k);
  assert.ok(Object.keys(Figure.POSES).length >= 8);
  assert.ok(Figure.SIGNALS.length >= 8);
});

test('every pose draws the same picture from every viewpoint', () => {
  for (const name of Object.keys(legacy.POSES)) for (const view of VIEWS) for (const label of [undefined, 'क']) {
    const o = { view, label };
    assert.equal(Figure.svg(name, o), legacy.svg(name, o), `${name} ${view}`);
    assert.deepEqual(j(Figure.state(name)), j(legacy.state(name)), name);
  }
  // the marching swing of the free hand
  for (const name of Object.keys(legacy.POSES)) for (const sw of [0, 1, -1])
    assert.deepEqual(j(Figure.swingLeft(Figure.state(name), sw)), j(legacy.swingLeft(legacy.state(name), sw)), `${name} swing ${sw}`);
});

test('every animation of every signal gives the same timeline and the same frames', () => {
  let frames = 0;
  for (const sg of legacy.SIGNALS) (sg.anim || []).forEach((a, i) => {
    const tl = legacy.timeline(a), mine = Figure.timeline(Figure.SIGNALS.find(x => x.id === sg.id).anim[i]);
    assert.deepEqual(j(mine), j(tl), `${sg.id}/${i} timeline`);
    const end = (tl.total ?? tl.end ?? tl.dur ?? 10);
    for (let t = 0; t <= end + .5; t += .137) {
      const was = legacy.frameAt(a, tl, t), now = Figure.frameAt(Figure.SIGNALS.find(x => x.id === sg.id).anim[i], mine, t);
      assert.deepEqual(j(now), j(was), `${sg.id}/${i} @${t.toFixed(2)}`);
      for (const view of VIEWS) assert.equal(Figure.draw(now.state, { view }), legacy.draw(was.state, { view }), `${sg.id}/${i} @${t.toFixed(2)} ${view}`);
      frames++;
    }
  });
  assert.ok(frames > 200, `only ${frames} frames compared`);
});

test('blending two poses agrees', () => {
  const names = Object.keys(legacy.POSES);
  for (let i = 0; i + 1 < names.length; i++) for (const t of [0, .3, .5, 1])
    assert.deepEqual(j(Figure.blend(Figure.state(names[i]), Figure.state(names[i + 1]), t)), j(legacy.blend(legacy.state(names[i]), legacy.state(names[i + 1]), t)));
});
