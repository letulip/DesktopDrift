// Unit tests for resetCones + the x0/y0 standing anchor on placed cones (js/track-util.js).
// SPA Phase C: track modules are ES-module-cached, so a restarted race reuses the SAME cones[]
// array. During a race cones get knocked (knocked/vx/vy/spin/ang) and drift away from their
// standing x/y. Without a reset they'd sit displaced and non-colliding on the next race. resetCones
// restores each cone to its recorded standing position; placeCones records that position as x0/y0.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeCones, resetCones, reverseTrack } from '../js/track-util.js';

// A small square ring; tiny minSpacing so every index places a cone (default 160 would place only
// the i===0 pair on a ring this small).
const RING_OUTER = [{ x: 100, y: 0 }, { x: 0, y: 100 }, { x: -100, y: 0 }, { x: 0, y: -100 }];
const RING_INNER = [{ x: 80, y: 0 }, { x: 0, y: 80 }, { x: -80, y: 0 }, { x: 0, y: -80 }];

test('placeCones: every cone records its standing position as x0/y0', () => {
  const cones = placeCones(RING_OUTER, RING_INNER, 1);
  assert.ok(cones.length >= 4, 'expected several cones from the ring');
  for (const c of cones) {
    assert.equal(c.x0, c.x);
    assert.equal(c.y0, c.y);
  }
  // Both edges represented — outer (x=±100/y=±100) and inner (±80) anchors present.
  assert.ok(cones.some(c => c.x0 === 100 || c.y0 === 100));
  assert.ok(cones.some(c => c.x0 === 80 || c.y0 === 80));
});

test('resetCones: a knocked, drifted cone is restored to standing', () => {
  const [c] = placeCones(RING_OUTER, RING_INNER, 1);
  const { x0, y0 } = c;
  c.knocked = true; c.vx = 5; c.vy = -3; c.ang = 1.2; c.spin = 0.7;
  c.x = 999; c.y = -999;                     // drifted far from its anchor

  resetCones([c]);

  assert.equal(c.knocked, false);
  assert.equal(c.vx, 0);
  assert.equal(c.vy, 0);
  assert.equal(c.ang, 0);
  assert.equal(c.spin, 0);
  assert.equal(c.x, x0);
  assert.equal(c.y, y0);
});

// A minimal circular track sufficient for reverseTrack (needs center points for sampleCheckpoints).
const makeTrack = () => {
  const N = 24, r = 100;
  const center = [], inner = [], outer = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    center.push({ x: r * c, y: r * s });
    inner.push({ x: (r - 20) * c, y: (r - 20) * s });
    outer.push({ x: (r + 20) * c, y: (r + 20) * s });
  }
  const cones = placeCones(outer, inner, 40);
  return { center, inner, outer, cones, K: 8, id: 'ring' };
};

test('resetCones covers the shared cones array of a reversed track in one call', () => {
  const T = makeTrack();
  const R = reverseTrack(T);
  assert.strictEqual(R.cones, T.cones, 'reverseTrack intentionally shares the cones array');

  // Knock several cones and displace them.
  for (const c of T.cones) { c.knocked = true; c.x += 500; c.spin = 2; }

  resetCones(T.cones);

  // One reset stands up every cone as seen through BOTH the forward and reversed handles.
  for (const c of T.cones) { assert.equal(c.knocked, false); assert.equal(c.x, c.x0); assert.equal(c.spin, 0); }
  for (const c of R.cones) { assert.equal(c.knocked, false); assert.equal(c.x, c.x0); }
});
