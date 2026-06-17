// Unit tests for pure near-miss geometry (js/collision.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearMiss } from '../js/collision.js';

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
