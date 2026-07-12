// Unit tests for pure tire-coin economy formulas (js/economy.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starsForPps, finishPayout, MAX_STARS, FINISH_FLAT, FINISH_PER_STAR,
         canAfford, buy, FIRST_CLEAR_BONUS, DDK_PPS, isDDK, ONE_PPS_BONUS, isOnePps } from '../js/economy.js';

test('isOnePps: true only when PPS rounds to exactly 1 (matches the results screen)', () => {
  assert.equal(isOnePps(1), true);
  assert.equal(isOnePps(1.4), true);      // Math.round → 1
  assert.equal(isOnePps(0.5), true);      // Math.round(0.5) → 1
  assert.equal(isOnePps(1.5), false);     // rounds to 2
  assert.equal(isOnePps(0), false);       // shows "0 PPS"
  assert.equal(isOnePps(120), false);
  assert.equal(isOnePps(undefined), false);
  assert.ok(ONE_PPS_BONUS > 0);
});

test('DDK: crown threshold is 600 PPS; isDDK is inclusive', () => {
  assert.equal(DDK_PPS, 600);
  assert.equal(isDDK(599), false);
  assert.equal(isDDK(600), true);
  assert.equal(isDDK(1200), true);
  assert.equal(isDDK(0), false);
  assert.equal(isDDK(undefined), false);
});

test('DDK does not change finish payout (stays capped at MAX_STARS)', () => {
  assert.equal(finishPayout(600), FINISH_FLAT + FINISH_PER_STAR * MAX_STARS); // crown ≠ extra income
  assert.equal(finishPayout(9999), FINISH_FLAT + FINISH_PER_STAR * MAX_STARS);
});

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

test('FIRST_CLEAR_BONUS: the one-time per-instance reward is 20', () => {
  assert.equal(FIRST_CLEAR_BONUS, 20);
});

test('canAfford: balance must cover the price (defensive on missing balance)', () => {
  assert.equal(canAfford(100, 80), true);
  assert.equal(canAfford(80, 80), true);    // exact balance is affordable
  assert.equal(canAfford(79, 80), false);
  assert.equal(canAfford(undefined, 1), false);
});

test('buy: success deducts price and extends owned (snapshot untouched)', () => {
  const snap = { wallet: 100, owned: ['a'] };
  const r = buy(snap, { id: 'b', price: 80 });
  assert.deepEqual(r, { ok: true, wallet: 20, owned: ['a', 'b'] });
  // pure — the input snapshot is not mutated
  assert.deepEqual(snap, { wallet: 100, owned: ['a'] });
});

test('buy: rejects when already owned (checked before affordability)', () => {
  const r = buy({ wallet: 1000, owned: ['b'] }, { id: 'b', price: 80 });
  assert.deepEqual(r, { ok: false, reason: 'owned' });
});

test('buy: rejects when broke', () => {
  const r = buy({ wallet: 50, owned: [] }, { id: 'b', price: 80 });
  assert.deepEqual(r, { ok: false, reason: 'broke' });
});

test('buy: defaults to empty wallet/owned when snapshot fields missing', () => {
  assert.deepEqual(buy({}, { id: 'x', price: 0 }), { ok: true, wallet: 0, owned: ['x'] });
});
