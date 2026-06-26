// Unit tests for reverseTrack (js/track-util.js) — the pure track-reversal transform (D2 R1).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reverseTrack, instanceId } from '../js/track-util.js';

test('instanceId: bare id forward, `${id}:rev` reversed', () => {
  assert.equal(instanceId('green-study', false), 'green-study');
  assert.equal(instanceId('green-study', true),  'green-study:rev');
});

// Synthetic circular track: N points around a circle, with inner/outer offset radially
// (parallel to center, index-aligned). Enough structure to exercise the transform.
const makeCircleTrack = (N = 24, r = 100) => {
  const center = [], inner = [], outer = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    center.push({ x: r * c,        y: r * s });
    inner.push({ x: (r - 20) * c,  y: (r - 20) * s });
    outer.push({ x: (r + 20) * c,  y: (r + 20) * s });
  }
  return {
    center, inner, outer, K: 8,
    cones: [{ x: 1, y: 2 }], props: [{ x: 3 }], collectibles: [{ x: 5, y: 6, kind: 'tire' }],
    TABLE: { w: 1 }, theme: { track: '#fff' }, laps: 3, id: 'circle',
  };
};

test('reverseTrack: centreline order is reversed; input not mutated', () => {
  const T = makeCircleTrack();
  const origFirst = T.center[0], origLast = T.center[T.center.length - 1];
  const R = reverseTrack(T);
  assert.deepEqual(R.center[0], origLast);
  assert.deepEqual(R.center[R.center.length - 1], origFirst);
  assert.equal(R.center.length, T.center.length);
  // input untouched (pure)
  assert.deepEqual(T.center[0], origFirst);
  assert.notEqual(R.center, T.center);
});

test('reverseTrack: inner/outer reversed in lockstep with center', () => {
  const T = makeCircleTrack();
  const N = T.center.length;
  const R = reverseTrack(T);
  assert.deepEqual(R.inner[0], T.inner[N - 1]);
  assert.deepEqual(R.outer[0], T.outer[N - 1]);
  assert.equal(R.inner.length, N);
  assert.equal(R.outer.length, N);
});

test('reverseTrack: double reverse restores the original geometry', () => {
  const T = makeCircleTrack();
  const RR = reverseTrack(reverseTrack(T));
  assert.deepEqual(RR.center, T.center);
  assert.deepEqual(RR.inner, T.inner);
  assert.deepEqual(RR.outer, T.outer);
});

test('reverseTrack: start moves to the reversed first point, facing the opposite way', () => {
  const T = makeCircleTrack();
  const N = T.center.length;
  const R = reverseTrack(T);
  assert.deepEqual(R.startPos, { x: T.center[N - 1].x, y: T.center[N - 1].y });
  // The reversed start segment is the exact negation of the forward segment at that same
  // spot (center[N-2]→center[N-1]) → travel direction is flipped 180°.
  const fwd = { x: T.center[N - 1].x - T.center[N - 2].x, y: T.center[N - 1].y - T.center[N - 2].y };
  const rev = { x: R.center[1].x - R.center[0].x,         y: R.center[1].y - R.center[0].y };
  assert.ok(Math.abs(rev.x + fwd.x) < 1e-9 && Math.abs(rev.y + fwd.y) < 1e-9, 'start direction should flip 180°');
  // and startAngle matches that reversed segment
  assert.ok(Math.abs(R.startAngle - Math.atan2(rev.y, rev.x)) < 1e-9);
});

test('reverseTrack: checkpoints recomputed; other content carried over', () => {
  const T = makeCircleTrack();
  const R = reverseTrack(T);
  assert.ok(Array.isArray(R.checkpoints) && R.checkpoints.length > 0);
  assert.equal(R.reversed, true);
  assert.equal(R.id, 'circle');
  assert.equal(R.laps, 3);
  assert.equal(R.collectibles, T.collectibles);   // carried by reference (positions unchanged)
  assert.equal(R.cones, T.cones);
  assert.equal(R.theme, T.theme);
});
