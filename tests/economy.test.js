// Unit tests for pure tire-coin economy formulas (js/economy.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starsForPps, finishPayout, MAX_STARS, FINISH_FLAT, FINISH_PER_STAR } from '../js/economy.js';

test('starsForPps: 1 star per 100 PPS, capped at MAX_STARS', () => {
  assert.equal(starsForPps(0), 0);
  assert.equal(starsForPps(99), 0);
  assert.equal(starsForPps(100), 1);
  assert.equal(starsForPps(250), 2);
  assert.equal(starsForPps(599), 5);   // 5.99 → floor 5, capped
  assert.equal(starsForPps(99999), MAX_STARS);
});

test('starsForPps: defensive on missing / negative input', () => {
  assert.equal(starsForPps(undefined), 0);
  assert.equal(starsForPps(null), 0);
  assert.equal(starsForPps(-50), 0);
});

test('finishPayout: flat + per-star, 2..12 across 0..5 stars', () => {
  assert.equal(finishPayout(0), FINISH_FLAT);                       // 0 stars → 2
  assert.equal(finishPayout(100), FINISH_FLAT + FINISH_PER_STAR);   // 1 star  → 4
  assert.equal(finishPayout(99999), FINISH_FLAT + FINISH_PER_STAR * MAX_STARS); // 5 → 12
});
