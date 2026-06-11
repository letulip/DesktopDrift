// Unit tests for pure track geometry (js/track-util.js). Loops were previously
// duplicated across three track modules and untestable (side-effects on import).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSvgPath, chaikin, offsetEdges, placeCones, sampleCheckpoints, prepProp,
} from '../js/track-util.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('parseSvgPath: M/L/H/V/Z → array of [x,y] pairs', () => {
  // Simple rectangle
  const pts = parseSvgPath('M10 20 L30 20 H50 V40 Z');
  assert.equal(pts.length, 4);
  assert.deepEqual(pts[0], [10, 20]);
  assert.deepEqual(pts[1], [30, 20]);
  assert.deepEqual(pts[2], [50, 20]); // H50 → x=50, y=20
  assert.deepEqual(pts[3], [50, 40]); // V40 → x=50, y=40
  // Fractional coordinates (as in real track SVGs)
  const pts2 = parseSvgPath('M11374.3 1531.75L6486.45 2177.88Z');
  assert.equal(pts2.length, 2);
  assert.ok(Math.abs(pts2[0][0] - 11374.3) < 0.01);
  assert.ok(Math.abs(pts2[1][1] - 2177.88) < 0.01);
});

test('chaikin: n points → 2n, convex combination of neighbours', () => {
  const sq = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  const out = chaikin(sq);
  assert.equal(out.length, 8);
  // first new point = 0.75*a + 0.25*b
  near(out[0].x, 0 * .75 + 10 * .25);
  near(out[0].y, 0);
});

test('offsetEdges: lengths match, edges are symmetric around the centre', () => {
  const center = [
    { x: -100, y: -100 }, { x: 100, y: -100 },
    { x: 100, y: 100 }, { x: -100, y: 100 },
  ];
  const half = 40;
  const { center: c, outer, inner } = offsetEdges(center, half);
  assert.equal(c.length, 4);
  assert.equal(outer.length, 4);
  assert.equal(inner.length, 4);
  for (let i = 0; i < 4; i++) {
    // midpoint of outer↔inner = centre point (edges on opposite normals)
    near((outer[i].x + inner[i].x) / 2, center[i].x);
    near((outer[i].y + inner[i].y) / 2, center[i].y);
    // distance from centre to edge = half
    near(Math.hypot(outer[i].x - center[i].x, outer[i].y - center[i].y), half);
  }
});

test('placeCones: arc-length spacing — uniform points give same result as old index step', () => {
  // 10 points at x=0..9, spacing=1 GU.  minSpacing=5 → cones at i=0 (acc=0) and i=5
  // (acc reaches 5 after 5 segments of length 1) → 2 pairs = 4 cones.
  // On non-uniform point distributions (real tracks) arc-length sampling avoids
  // the corner-crowding and straight-gap problems of the old index-step approach.
  const outer = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 }));
  const inner = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 5 }));
  const cones = placeCones(outer, inner, 5); // minSpacing=5 GU, point spacing=1 GU → 4 cones
  assert.equal(cones.length, 4);
  assert.equal(cones[0].knocked, false);
  assert.equal(cones[0].vx, 0);
});

test('sampleCheckpoints: K points, first = center[0]', () => {
  const center = Array.from({ length: 16 }, (_, i) => ({ x: i, y: 0 }));
  const cps = sampleCheckpoints(center, 8);
  assert.equal(cps.length, 8);
  assert.equal(cps[0], center[0]);
  assert.equal(cps[1], center[2]); // floor(1/8*16)=2
});

test('prepProp: hl defaults to 0, caches cos/sin', () => {
  const a = prepProp({ ang: 0 });
  assert.equal(a.hl, 0);
  near(a._cos, 1);
  near(a._sin, 0);
  const b = prepProp({ ang: Math.PI / 2, hl: 5 });
  assert.equal(b.hl, 5);
  near(b._cos, 0);
  near(b._sin, 1);
});
