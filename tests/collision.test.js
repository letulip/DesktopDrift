// Unit tests for pure near-miss geometry (js/collision.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearMiss, finishDot, crossedFinish, resolveWall, resolveProps, stepKnockedCone } from '../js/collision.js';

const TABLE_RECT  = { w: 3400, h: 2900, shape: 'rect' };
const TABLE_ROUND = { w: 3400, h: 2900, shape: 'round' };
const CONE_R = 18, CR = 30, NM_BAND = 42;
const fastCar = (x, y) => ({ x, y, vx: 200, vy: 0 });
const slowCar = (x, y) => ({ x, y, vx: 100, vy: 0 });

test('nearMiss: below speed gate → false regardless of position', () => {
  // Car right next to a cone but too slow — no near-miss credit.
  const car  = slowCar(0, 0);
  const cone = { x: CONE_R + CR + 10, y: 0, knocked: false };
  assert.equal(nearMiss(car, [cone], [], TABLE_RECT, CONE_R, CR, NM_BAND), false);
});

test('nearMiss: prop just inside the band → true', () => {
  // Point prop (hl=0) at distance CONE_R+CR+NM_BAND/2 from car → gap < NM_BAND
  const gap  = NM_BAND / 2;
  const prop = { x: 0, y: CR + 20 + gap, r: 20, hl: 0, _cos: 1, _sin: 0 };
  assert.equal(nearMiss(fastCar(0, 0), [], [prop], TABLE_RECT, CONE_R, CR, NM_BAND), true);
});

test('nearMiss: prop well clear of band → false', () => {
  const prop = { x: 0, y: CR + 20 + NM_BAND + 50, r: 20, hl: 0, _cos: 1, _sin: 0 };
  assert.equal(nearMiss(fastCar(0, 0), [], [prop], TABLE_RECT, CONE_R, CR, NM_BAND), false);
});

test('nearMiss: standing cone just inside band → true', () => {
  const gap  = NM_BAND / 2;
  const cone = { x: CONE_R + CR + gap, y: 0, knocked: false };
  assert.equal(nearMiss(fastCar(0, 0), [cone], [], TABLE_RECT, CONE_R, CR, NM_BAND), true);
});

test('nearMiss: knocked cone is ignored', () => {
  const gap  = NM_BAND / 2;
  const cone = { x: CONE_R + CR + gap, y: 0, knocked: true };
  assert.equal(nearMiss(fastCar(0, 0), [cone], [], TABLE_RECT, CONE_R, CR, NM_BAND), false);
});

test('nearMiss: rect table edge just inside band → true', () => {
  // Car near right wall: TABLE.w/2 - CR - gap = wall edge minus car half-width minus small gap
  const gap = NM_BAND / 2;
  const car = fastCar(TABLE_RECT.w / 2 - CR - gap, 0);
  assert.equal(nearMiss(car, [], [], TABLE_RECT, CONE_R, CR, NM_BAND), true);
});

test('finishDot: returns positive when car is past the line, negative when behind', () => {
  const c0 = { x: 0, y: 0 };
  // Axis points right (cos=1, sin=0)
  assert.ok(finishDot({ x:  10, y: 0 }, c0, 1, 0) > 0, 'past line → positive');
  assert.ok(finishDot({ x: -10, y: 0 }, c0, 1, 0) < 0, 'behind line → negative');
  assert.equal(finishDot({ x: 0, y: 0 }, c0, 1, 0), 0,  'on line → 0');
  // Lateral offset does not affect dot when axis is horizontal
  assert.ok(finishDot({ x: 5, y: 999 }, c0, 1, 0) > 0, 'lateral offset irrelevant');
});

test('crossedFinish: approaching (neg→pos) → true', () => {
  assert.equal(crossedFinish(-1, 1),   true);
  assert.equal(crossedFinish(-0.1, 0), true);  // dot exactly 0 counts as crossing
});

test('crossedFinish: receding, same side, or exact-0 prevDot → false', () => {
  assert.equal(crossedFinish(1,  -1),  false); // receding
  assert.equal(crossedFinish(-1, -1),  false); // still behind
  assert.equal(crossedFinish(1,   1),  false); // already past
  assert.equal(crossedFinish(0,   1),  false); // prevDot=0 is not < 0
});

test('nearMiss: capsule prop — nearest point on segment used, not centre', () => {
  // Capsule along X axis from x=100 to x=300 (hl=100), r=20.
  // Car at (200, CR+20+NM_BAND/2) — nearest point on segment is (200,0), gap=NM_BAND/2 → true.
  const prop = { x: 200, y: 0, r: 20, hl: 100, _cos: 1, _sin: 0 };
  const car  = fastCar(200, CR + 20 + NM_BAND / 2);
  assert.equal(nearMiss(car, [], [prop], TABLE_RECT, CONE_R, CR, NM_BAND), true);
  // Car at (200, CR+20+NM_BAND+50) — gap too large → false.
  const farCar = fastCar(200, CR + 20 + NM_BAND + 50);
  assert.equal(nearMiss(farCar, [], [prop], TABLE_RECT, CONE_R, CR, NM_BAND), false);
});

// ── Collision-response golden masters (feel lock) ───────────────────────────────
// Frozen outputs of the verbatim-extracted wall/prop response. A change to these
// numbers changes how the car bounces off walls/objects — confirm intent in the
// browser before regenerating, never edit blindly.
const EPS = 1e-5;
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < EPS, `${msg}: got ${a}, want ${b}`);
const bodyPtsOf = (car, hx, hy, nose) =>
  [[car.x + hx * nose, car.y + hy * nose], [car.x, car.y], [car.x - hx * nose, car.y - hy * nose]];

test('resolveWall — rect wall pushback + impact (golden)', () => {
  const TABLE = { w: 3400, h: 2900, shape: 'rect' };
  const hx = 1, hy = 0, nose = 25, RR = 40;
  const car = { x: 1660, y: 0, vx: 300, vy: 50 };
  const hit = resolveWall(car, TABLE, RR, hx, hy, nose, bodyPtsOf(car, hx, hy, nose));
  near(car.x, 1635, 'x'); near(car.y, 0, 'y');
  near(car.vx, -90, 'vx'); near(car.vy, 42.5, 'vy'); near(hit, 300, 'hit');
});

test('resolveWall — round wall pushback + impact (golden)', () => {
  const TABLE = { w: 2000, h: 2000, shape: 'round' };
  const hx = Math.cos(0.3), hy = Math.sin(0.3), nose = 25, RR = 40;
  const car = { x: 950, y: 120, vx: 200, vy: 60 };
  const hit = resolveWall(car, TABLE, RR, hx, hy, nose, bodyPtsOf(car, hx, hy, nose));
  near(car.x, 928.007825, 'x'); near(car.y, 117.123332, 'y');
  near(car.vx, -65.657399, 'vx'); near(car.vy, 25.250906, 'vy'); near(hit, 206.092633, 'hit');
});

test('resolveProps — circular prop pushout + reflection (golden)', () => {
  const RR = 40, hx = 1, hy = 0, nose = 25;
  const props = [{ x: 100, y: 0, r: 30, hl: 0, _cos: 1, _sin: 0 }];
  const car = { x: 60, y: 0, vx: 250, vy: 0 };
  const crash = resolveProps(car, props, RR, bodyPtsOf(car, hx, hy, nose));
  near(car.x, 5, 'x'); near(car.y, 0, 'y');
  near(car.vx, -100, 'vx'); near(car.vy, 0, 'vy'); near(crash, 250, 'crash');
});

test('resolveWall/resolveProps — no contact leaves the car untouched', () => {
  const TABLE = { w: 3400, h: 2900, shape: 'rect' };
  const hx = 1, hy = 0, nose = 25, RR = 40;
  const car = { x: 0, y: 0, vx: 100, vy: 0 };
  assert.equal(resolveWall(car, TABLE, RR, hx, hy, nose, bodyPtsOf(car, hx, hy, nose)), 0);
  assert.equal(resolveProps(car, [{ x: 1000, y: 1000, r: 20, hl: 0, _cos: 1, _sin: 0 }], RR, bodyPtsOf(car, hx, hy, nose)), 0);
  near(car.x, 0, 'x'); near(car.vx, 100, 'vx');
});

const makeCone = (x, y, vx, vy, spin = 0) =>
  ({ x, y, vx, vy, ang: 0, spin, knocked: true });

test('stepKnockedCone: free cone — position advances, velocity decays, angle updates', () => {
  const c = makeCone(0, 0, 100, 50, 2);
  const dt = 1 / 60, fAdj = dt * 60; // PHYS_HZ=60
  stepKnockedCone(c, [], CONE_R, dt, fAdj);
  const dAdj = Math.pow(0.9, fAdj);
  near(c.x,   100 * dt,        1e-9);
  near(c.y,   50  * dt,        1e-9);
  near(c.vx,  100 * dAdj,      1e-9);
  near(c.vy,  50  * dAdj,      1e-9);
  near(c.ang, 2   * dt,        1e-9); // spin * dt before spin decays
  near(c.spin, 2  * dAdj,      1e-9);
});

test('stepKnockedCone: cone overlapping point prop — pushed out, velocity damped', () => {
  // Cone at (0,0) moving toward a prop above it (positive vy → up).
  // The code removes 80% of the normal approach speed (not a full bounce-back).
  const propR = 20, overlap = 1;
  const propY = CONE_R + propR - overlap; // 37
  const prop = { x: 0, y: propY, r: propR, hl: 0, _cos: 1, _sin: 0 };
  const c = makeCone(0, 0, 0, 100, 0);
  const dt = 1 / 60, fAdj = 1;
  stepKnockedCone(c, [prop], CONE_R, dt, fAdj);
  // Cone must be pushed outside the prop (distance ≥ CONE_R + propR).
  near(c.y, propY - (CONE_R + propR), 1e-6);
  // vy is reduced compared to free decay (100 * 0.9 = 90): collision removes 80% of
  // the normal component first, leaving 20 before decay → 20 * 0.9 = 18.
  assert.ok(c.vy < 100 * Math.pow(0.9, fAdj), `vy should be less than free-decay value, got ${c.vy}`);
});

test('stepKnockedCone: cone clear of all props — no pushback', () => {
  const prop = { x: 500, y: 500, r: 20, hl: 0, _cos: 1, _sin: 0 };
  const c = makeCone(0, 0, 10, 0, 0);
  const x0 = c.x + 10 / 60; // expected position after free motion
  stepKnockedCone(c, [prop], CONE_R, 1 / 60, 1);
  near(c.x, x0, 1e-9);
});
