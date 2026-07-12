// bakeSurfaceDims — offscreen surface sizing with safe-limit clamps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bakeSurfaceDims } from '../js/track-surface.js';

test('typical table: uses the requested scale, no clamp', () => {
  // Phone: DPR 1.5 × ZOOM 0.65 ≈ 0.975 px/unit on a ~3448×2948 world.
  const r = bakeSurfaceDims(3448, 2948, 0.975);
  assert.equal(r.scale, 0.975);
  assert.equal(r.pw, Math.ceil(3448 * 0.975));
  assert.equal(r.ph, Math.ceil(2948 * 0.975));
  assert.ok(r.pw <= 4096 && r.ph <= 4096);
});

test('per-side dimension clamp: never exceeds maxDim', () => {
  // A very wide world at high scale would blow past 4096 on the long side.
  const r = bakeSurfaceDims(6000, 2000, 1.5);
  assert.ok(r.pw <= 4096, `pw ${r.pw} <= 4096`);
  assert.ok(r.ph <= 4096, `ph ${r.ph} <= 4096`);
  assert.ok(r.scale < 1.5);                       // was clamped down
  assert.equal(r.pw, 4096);                        // long side pinned to the cap
});

test('area clamp: total pixels stay under maxArea even when both sides fit maxDim', () => {
  // 3400×2900 @ 1.5 → 5100×4350: dim-clamp brings it to 4096 wide, but 4096×~3492
  // ≈ 14.3M px still exceeds 12M → area clamp kicks in.
  const r = bakeSurfaceDims(3400, 2900, 1.5);
  // Ceil on each side can nudge the product a hair over maxArea; the tight bound is
  // maxArea + pw + ph. Still far under the iOS ~16.7M hard limit either way.
  assert.ok(r.pw * r.ph <= 12_000_000 + r.pw + r.ph, `area ${r.pw * r.ph} within maxArea+rounding`);
  assert.ok(r.pw <= 4096 && r.ph <= 4096);
  // Aspect ratio preserved (single uniform scale).
  assert.ok(Math.abs(r.pw / r.ph - 3400 / 2900) < 0.01);
});

test('degenerate world never yields a zero-size canvas', () => {
  const r = bakeSurfaceDims(0.1, 0.1, 1.5);
  assert.ok(r.pw >= 1 && r.ph >= 1);
});
