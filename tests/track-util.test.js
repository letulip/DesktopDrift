// Unit tests for pure track geometry (js/track-util.js). Loops were previously
// duplicated across three track modules and untestable (side-effects on import).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSvgPath, chaikin, offsetEdges, placeCones, sampleCheckpoints, prepProp,
  nearestCenter, sampleCheckpointsByCorner, circularAdvance,
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

test('parseSvgPath: deduplicates explicit closing vertex (L back-to-start Z)', () => {
  // All three shipped track SVGs use "M x y L ... L x y Z" — the last L repeats
  // the start point.  Without dedup, Chaikin 4× produces 16 coincident points near
  // start/finish, destabilising normals and displacing inner edge cones.
  const pts = parseSvgPath('M10 20 L30 20 L50 40 L10 20 Z');
  // Last vertex (10,20) equals first → should be dropped → 3 unique vertices
  assert.equal(pts.length, 3);
  assert.deepEqual(pts[0], [10, 20]);
  assert.deepEqual(pts[2], [50, 40]); // last kept vertex is the one before the dup
  // Non-closing path (last != first) must not be trimmed
  const pts2 = parseSvgPath('M10 20 L30 20 L50 40 Z');
  assert.equal(pts2.length, 3);
});

test('chaikin: n points → 2n, convex combination of neighbours', () => {
  const sq = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  const out = chaikin(sq);
  assert.equal(out.length, 8);
  // first new point = 0.75*a + 0.25*b
  near(out[0].x, 0 * .75 + 10 * .25);
  near(out[0].y, 0);
});

test('offsetEdges: gentle curve (R >> half) — edges symmetric, outer = half from centre', () => {
  // Square with corner R ≈ 141 GU >> half=40 → no clamping, classic symmetric offset.
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

test('offsetEdges: hairpin (R < half) — inner offset clamped, no self-intersection', () => {
  // Three points on a circle of radius R=40, angles −60°/0°/+60°.
  // half=80 > R: without clamping the inner edge would cross the centre of curvature
  // and produce a self-intersecting loop (observed on green-study / workbench hairpins).
  // The fix clamps innerHalf to ≤ R − minInnerGap so the inner arc stays on the correct side.
  const R = 40, half = 80;
  const pts = [
    { x: R * Math.cos(-Math.PI / 3), y: R * Math.sin(-Math.PI / 3) },
    { x: R,                            y: 0 },
    { x: R * Math.cos( Math.PI / 3), y: R * Math.sin( Math.PI / 3) },
  ];
  const { outer, inner } = offsetEdges(pts, half);
  // Outer displacement must equal half (outer is never clamped).
  near(Math.hypot(outer[1].x - pts[1].x, outer[1].y - pts[1].y), half);
  // Inner displacement must be clamped to < half at the apex.
  const d = Math.hypot(inner[1].x - pts[1].x, inner[1].y - pts[1].y);
  assert.ok(d < half, `inner offset at apex ${d.toFixed(1)} should be < ${half} (clamped)`);
});

test('placeCones: independent arc-length accumulators — uniform edges give equal count', () => {
  // 10 points at x=0..9, spacing=1 GU on both edges.  minSpacing=5 →
  // each edge places a cone at i=0 and i=5 (accumulator hits 5 after 5 steps) → 2+2=4 cones.
  // On non-uniform tracks each edge samples its OWN arc: the outer (longer in corners)
  // gets more cones than the inner, eliminating gaps on the outer radius of bends.
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

test('sampleCheckpointsByCorner: returns K points', () => {
  const center = Array.from({ length: 32 }, (_, i) => ({ x: i * 10, y: 0 }));
  const cps = sampleCheckpointsByCorner(center, 8);
  assert.equal(cps.length, 8);
  for (const cp of cps) assert.ok(center.includes(cp), 'each cp is a centerline point');
});

test('sampleCheckpointsByCorner: picks the corner apex, not a straight point', () => {
  // L-shaped closed loop: straight along x then a 90° bend then straight along y.
  // 8 points total; index 4 is the apex (where the direction changes).
  // With K=2, sector 0 = [0..3] (all straight), sector 1 = [4..7] (has apex at 4).
  const center = [
    { x: 0,  y: 0  },  // 0
    { x: 10, y: 0  },  // 1
    { x: 20, y: 0  },  // 2
    { x: 30, y: 0  },  // 3  — straight, sector 0
    { x: 40, y: 0  },  // 4  — apex of 90° bend, sector 1
    { x: 40, y: 10 },  // 5
    { x: 40, y: 20 },  // 6
    { x: 40, y: 30 },  // 7
  ];
  const cps = sampleCheckpointsByCorner(center, 2);
  assert.equal(cps.length, 2);
  // Second checkpoint must be at the apex (index 4), not somewhere on the straight leg.
  assert.equal(cps[1], center[4], 'corner sector should land on the apex');
});

test('sampleCheckpointsByCorner: pure straight falls back to sector midpoint', () => {
  // All points collinear — no curvature anywhere.
  const center = Array.from({ length: 8 }, (_, i) => ({ x: i * 10, y: 0 }));
  const cps = sampleCheckpointsByCorner(center, 2);
  // Sector 0: lo=0, hi=4 → midpoint = floor((0+4)/2) = 2 → center[2]
  // Sector 1: lo=4, hi=8 → midpoint = floor((4+8)/2) = 6 → center[6]
  assert.equal(cps[0], center[2]);
  assert.equal(cps[1], center[6]);
});

test('nearestCenter: finds the nearest point on a straight centerline', () => {
  const center = [0, 10, 20, 30, 40].map(x => ({ x, y: 0 }));
  // car at (12, 5) → nearest is (10,0) at idx=1, dist=sqrt(4+25)
  const { dist, idx } = nearestCenter(12, 5, center, 0);
  assert.equal(idx, 1);
  near(dist, Math.sqrt(4 + 25));
});

test('nearestCenter: wraps correctly across the closed loop seam', () => {
  const center = [0, 10, 20, 30, 40].map(x => ({ x, y: 0 }));
  // prevIdx=4 (last), car near x=2 → must wrap and find idx=0
  const { dist, idx } = nearestCenter(2, 0, center, 4);
  assert.equal(idx, 0);
  near(dist, 2);
});

test('circularAdvance: forward step returns the distance', () => {
  assert.equal(circularAdvance(5, 0, 100), 5);
});

test('circularAdvance: same position returns 0', () => {
  assert.equal(circularAdvance(3, 3, 100), 0);
});

test('circularAdvance: backward movement returns 0', () => {
  assert.equal(circularAdvance(3, 5, 100), 0); // went back 2 → d=98 > 50
});

test('circularAdvance: crossing the lap seam counts as forward', () => {
  // ref=410, idx=3 on N=416: d=(3-410+416)%416=9, ≤208 → 9
  assert.equal(circularAdvance(3, 410, 416), 9);
});

test('nearestCenter: tracks moving car around a loop without index jumps', () => {
  const N = 40;
  const center = Array.from({ length: N }, (_, i) => ({
    x: Math.cos((i / N) * 2 * Math.PI) * 500,
    y: Math.sin((i / N) * 2 * Math.PI) * 500,
  }));
  let prevIdx = 0;
  for (let i = 0; i < N; i++) {
    const { dist, idx } = nearestCenter(center[i].x, center[i].y, center, prevIdx);
    assert.equal(idx, i);
    near(dist, 0);
    prevIdx = idx;
  }
});
