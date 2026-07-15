// Unit tests for pure tire placement (js/tire-seed.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedTires } from '../js/tire-seed.js';

// Build a straight closed loop (a thin rectangle traversed as a line there-and-back is
// awkward; instead use a long oval flattened to near-straight by sampling a wide ellipse).
// Simpler: a regular polygon approximates a circle; offsetEdges-style inner/outer via
// the left normal. We synthesise them directly here.
const makeCircle = (R, N, cw = false) => {
  const center = [], inner = [], outer = [], HALF = 30;
  for (let i = 0; i < N; i++) {
    const a = (cw ? -1 : 1) * (i / N) * Math.PI * 2;
    const cx = Math.cos(a) * R, cy = Math.sin(a) * R;
    // tangent (CCW): derivative → (-sin, cos); left normal = (-cos, -sin) points inward for CCW
    const tx = -Math.sin(a) * (cw ? -1 : 1), ty = Math.cos(a) * (cw ? -1 : 1);
    const nx = -ty, ny = tx; // left normal of the tangent
    center.push({ x: cx, y: cy });
    outer.push({ x: cx + nx * HALF, y: cy + ny * HALF });
    inner.push({ x: cx - nx * HALF, y: cy - ny * HALF });
  }
  return { center, inner, outer };
};

test('seedTires: returns exactly n points', () => {
  const { center, inner, outer } = makeCircle(500, 200);
  assert.equal(seedTires(center, inner, outer, 12).length, 12);
  assert.equal(seedTires(center, inner, outer, 1).length, 1);
});

test('seedTires: empty / non-positive n → []', () => {
  const { center, inner, outer } = makeCircle(500, 200);
  assert.deepEqual(seedTires(center, inner, outer, 0), []);
  assert.deepEqual(seedTires([], [], [], 5), []);
});

test('seedTires: on a curve, tires are pushed toward the concave (inner-of-corner) side', () => {
  // CCW circle: every point is a left turn; the concave side is toward the circle centre (0,0).
  const R = 500;
  const { center, inner, outer } = makeCircle(R, 200);
  const pts = seedTires(center, inner, outer, 8);
  // Each seeded point must be strictly closer to the centre than the centerline radius R.
  for (const p of pts) {
    const r = Math.hypot(p.x, p.y);
    assert.ok(r < R - 1, `expected offset inward: r=${r} (R=${R})`);
    assert.ok(r > R - 40, `should not overshoot past the inner edge (HALF=30): r=${r}`);
  }
});

test('seedTires: very gentle curvature → negligible offset (≈ on the racing line)', () => {
  // A circle is never truly straight, but at a huge radius the local turn is tiny, so the
  // offset must be a negligible fraction of the radius — i.e. essentially on the centerline.
  const R = 100000, N = 400;
  const { center, inner, outer } = makeCircle(R, N);
  const pts = seedTires(center, inner, outer, 6);
  for (const p of pts) {
    const r = Math.hypot(p.x, p.y);
    assert.ok(Math.abs(r - R) < R * 1e-3, `near-straight → ≈centerline: |r-R|=${Math.abs(r - R)}`);
  }
});

test('seedTires: deterministic (stable capId source)', () => {
  const { center, inner, outer } = makeCircle(500, 200);
  assert.deepEqual(seedTires(center, inner, outer, 10), seedTires(center, inner, outer, 10));
});
