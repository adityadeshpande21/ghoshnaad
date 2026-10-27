import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Transport } from '../../src/audio/transport.ts';

// A clock we move by hand, in place of the audio engine.
function fakeEngine() {
  const listeners = new Set();
  return { ctx: {}, t: 0, get currentTime() { return this.t; }, onState(cb) { listeners.add(cb); return () => listeners.delete(cb); }, emit(s) { listeners.forEach(f => f(s)); } };
}
const made = [];
afterEach(() => { made.splice(0).forEach(t => t.halt()); });   // never leave a timer running, even when an assertion fails
function make(items, end, extra = {}) {
  const eng = fakeEngine(), log = { played: [], late: 0, ended: 0, interrupted: [] };
  const tr = new Transport(eng, {
    dispatch: (it, at) => log.played.push([it.n, +at.toFixed(3)]),
    onEnd: () => { log.ended++; },
    onLate: () => { log.late++; },
    onInterrupt: pos => log.interrupted.push(+pos.toFixed(3)),
    ...extra,
  });
  tr.load(items, end);
  made.push(tr);
  return { eng, tr, log };
}
const item = (n, t) => ({ n, t });

test('only what falls inside the half-second look-ahead is scheduled, the rest as the clock moves', () => {
  const { eng, tr, log } = make([item('a', 0), item('b', .3), item('c', .6), item('d', 2)], 3);
  tr.start({ from: 0, lead: .12 });
  assert.deepEqual(log.played, [['a', .12], ['b', .42]]);        // c would sound at .72, beyond 0 + .5
  eng.t = .3; tr.pump();
  assert.deepEqual(log.played.slice(2), [['c', .72]]);           // now inside 0.3 + .5
  eng.t = 1.6; tr.pump();
  assert.deepEqual(log.played.slice(3), []);                      // d at 2.12 is still beyond 1.6 + .5
  eng.t = 1.7; tr.pump();
  assert.deepEqual(log.played.slice(3), [['d', 2.12]]);
  tr.halt();
});

test('starting part-way plays from that second, at the lead time', () => {
  const { tr, log } = make([item('a', 0), item('b', 1), item('c', 1.2)], 3);
  tr.start({ from: 1, lead: .2 });
  assert.deepEqual(log.played, [['b', .2], ['c', .4]]);
  tr.halt();
});

test('an item that would sound in the past is skipped and reported', () => {
  const { eng, tr, log } = make([item('a', 0), item('b', .1), item('c', .4)], 3);
  tr.start({ from: 0, lead: .12 });                              // a, b, c scheduled at .12, .22, .52 (c is beyond the look-ahead)
  tr.halt();
  const x = make([item('a', 0), item('b', .1)], 3);
  x.eng.t = 5; x.tr.state.playing = true; x.tr.state.t0 = 0; x.tr.state.off = 0; x.tr.state.idx = 0; x.tr.pump();
  assert.equal(x.log.late, 2); assert.deepEqual(x.log.played, []);
  x.tr.halt();
});

test('position follows the clock while playing and holds when stopped', () => {
  const { eng, tr } = make([item('a', 0)], 3);
  tr.start({ from: 1.5, lead: .1 });
  eng.t = 1;
  assert.ok(Math.abs(tr.position() - (1 - .1 + 1.5)) < 1e-9);
  tr.state.pos = 2.25; tr.halt();
  assert.equal(tr.position(), 2.25);
});

test('a loop window repeats and never plays beyond it', () => {
  const { eng, tr, log } = make([item('a', 0), item('w1', 1), item('w2', 1.5), item('z', 3)], 4);
  tr.start({ from: 0, window: { s: 1, e: 2 }, lead: 0 });       // from outside the window: starts at its beginning
  assert.deepEqual(log.played, [['w1', 0], ['w2', .5]]);
  eng.t = .6; tr.pump();                                          // the next pass is queued once the window end is near
  assert.deepEqual(log.played.slice(2), [['w1', 1]]);
  eng.t = 1.1; tr.pump();
  assert.deepEqual(log.played.slice(3), [['w2', 1.5]]);
  assert.ok(!log.played.some(([n]) => n === 'a' || n === 'z'));
  tr.halt();
});

test('the end of the piece is reported once the last sound has had time to ring', () => {
  const { eng, tr, log } = make([item('a', 0)], 1);
  tr.start({ from: 0, lead: 0 });
  eng.t = 1.3; tr.pump(); assert.equal(log.ended, 0);
  eng.t = 1.5; tr.pump(); assert.equal(log.ended, 1);
  tr.halt();
});

test('an interrupted audio context pauses playback where it was; starting again resumes from there', () => {
  const { eng, tr, log } = make([item('a', 0), item('b', 2), item('c', 4)], 6);
  tr.start({ from: 0, lead: .1 });
  eng.t = 2.1;                                                    // 2.0 s into the piece
  eng.emit('interrupted');
  assert.equal(tr.state.playing, false);
  assert.deepEqual(log.interrupted, [2]);
  assert.equal(tr.position(), 2);
  tr.start({ from: tr.position(), lead: .1 });
  assert.ok(log.played.some(([n, at]) => n === 'b' && Math.abs(at - 2.2) < 1e-9));
  tr.halt();
});

test('state changes that are not interruptions, or that arrive while stopped, do nothing', () => {
  const { eng, tr, log } = make([item('a', 0)], 1);
  eng.emit('suspended'); assert.deepEqual(log.interrupted, []);
  tr.start({ from: 0 }); eng.emit('running'); assert.equal(tr.state.playing, true); assert.deepEqual(log.interrupted, []);
  tr.halt();
});
