// Unit tests for pure scoring logic (js/scoring.js). Formulas were previously
// buried inside the startGame closure and untestable — now verified directly.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDrifting, driftQuality, comboMult, comboGain, slipSign, pointsPerSecond, isNewPpsRecord,
  MULT_MAX, QUALITY_MAX, COMBO_RATE,
} from '../js/scoring.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('isDrifting: needs both large lateral slip and sufficient speed', () => {
  assert.equal(isDrifting(70, 200), true);
  assert.equal(isDrifting(0, 200), false);   // no slip
  assert.equal(isDrifting(70, 80), false);   // too slow
  assert.equal(isDrifting(60, 200), false);  // threshold is strict (> 60)
  assert.equal(isDrifting(-70, 200), true);  // slip sign does not matter
});

test('driftQuality: normalised slip×speed with ceiling', () => {
  near(driftQuality(160, 260), 1);          // reference values → 1
  near(driftQuality(0, 260), 0);
  assert.equal(driftQuality(320, 520), QUALITY_MAX); // above ref — clamped
});

test('comboMult: 1 + multBuild, capped at MULT_MAX', () => {
  near(comboMult(0), 1);
  near(comboMult(3), 4);
  assert.equal(comboMult(7), MULT_MAX);
  assert.equal(comboMult(50), MULT_MAX);
});

test('comboGain: slip × speed × dt × mult × COMBO_RATE', () => {
  near(comboGain(160, 260, 1, 1), 160 * 260 * COMBO_RATE);
  near(comboGain(100, 100, 0.5, 2), 100 * 100 * 0.5 * COMBO_RATE * 2);
  near(comboGain(0, 260, 1, 5), 0);
});

test('slipSign: +1 / -1 / 0 by threshold', () => {
  assert.equal(slipSign(60), 1);
  assert.equal(slipSign(-60), -1);
  assert.equal(slipSign(10), 0);
  assert.equal(slipSign(50), 0);   // threshold is strict
  assert.equal(slipSign(-50), 0);
});

test('pointsPerSecond: points / time, protected against division by zero', () => {
  near(pointsPerSecond(45000, 36), 1250);
  near(pointsPerSecond(0, 36), 0);
  near(pointsPerSecond(45000, 0), 0);  // totalTime=0 → 0, not Infinity
});

test('isNewPpsRecord: no prior record (null/undefined) always counts as new', () => {
  assert.equal(isNewPpsRecord(null, 1000), true);       // never set before
  assert.equal(isNewPpsRecord(undefined, 1000), true);  // loose == also catches undefined
});

test('isNewPpsRecord: beats the stored best only when strictly higher', () => {
  assert.equal(isNewPpsRecord(1000, 1200), true);   // higher → new record
  assert.equal(isNewPpsRecord(1000, 800), false);   // lower → not a record
  assert.equal(isNewPpsRecord(1000, 1000), false);  // equal → not a record (strict >)
});
