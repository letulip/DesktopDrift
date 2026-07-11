// store.js — "clean start" path: no persisted data, return defaults,
// mutate live objects, save() writes correct JSON.
//
// IMPORTANT: store.js caches state in _s at module level after the first
// _ensure(). Therefore the "load existing data" path is tested in a separate
// file (store-load.test.js) — node:test runs each file in its own process,
// so the module is freshly loaded and the cache does not leak between scenarios.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage } from './helpers.js';

// localStorage must exist BEFORE importing store.js (the module accesses it
// lazily, but getItem is called on the first getter — install it upfront to be safe).
const store = installLocalStorage();

const { settings, garage, records, achievements, save, stats, collectedCaps, capCollect,
        wallet, addTires, tireSwept, markTireSwept,
        owned, isOwned, grant, carLook, purchase, ledger, recordTxn, markCleared,
        achAll, achUnlocked, achUnlock, achSetProgress } =
  await import('../js/store.js');

test('defaults: garage (selected car + empty per-car looks)', () => {
  const g = garage();
  assert.equal(g.carIndex, 0);
  assert.deepEqual(g.cars, {});
});

test('carLook: lazily returns a null-default look per car index', () => {
  assert.deepEqual(carLook(0), { bodyColor: null, neonColor: null, finish: null, trailColor: null, neon: null });
});

test('defaults: settings / records / achievements', () => {
  assert.deepEqual(settings(), { units: 'kmh', haptics: true });
  assert.deepEqual(records(), {});
  assert.deepEqual(achievements(), {});
});

test('getters return the same live object across calls', () => {
  assert.equal(garage(), garage());
});

test('stats: defaults to caps/tires/cleared + lifetime counters', () => {
  assert.deepEqual(stats(), { caps: {}, tires: {}, tiresSwept: [], cleared: [], runs: 0, driftSecs: 0 });
});

test('wallet: defaults to 0; addTires accumulates, persists, and clamps at 0', () => {
  assert.equal(wallet(), 0);
  assert.equal(addTires(5), 5);
  assert.equal(addTires(3), 8);
  assert.equal(wallet(), 8);
  assert.equal(addTires(-100), 0);   // clamped, never negative
});

test('tireSwept / markTireSwept: per-track clean-sweep flag, first-time only', () => {
  assert.equal(tireSwept('green-study'), false);
  assert.equal(markTireSwept('green-study'), true);   // first sweep → award
  assert.equal(tireSwept('green-study'), true);
  assert.equal(markTireSwept('green-study'), false);  // already swept → no re-award
  assert.equal(tireSwept('steel-kitchen'), false);    // independent per instance
});

test('collectedCaps: returns [] for unknown track', () => {
  assert.deepEqual(collectedCaps('green-study'), []);
});

test('markCleared: true on first finish of an instance, false thereafter', () => {
  assert.equal(markCleared('green-study'), true);   // first clear → award bonus
  assert.equal(markCleared('green-study'), false);  // already cleared → no bonus
  assert.equal(markCleared('green-study:rev'), true); // reversed is a separate instance
  assert.deepEqual(stats().cleared, ['green-study', 'green-study:rev']);
});

test('capCollect: records a cap index', () => {
  capCollect('green-study', 0);
  assert.deepEqual(collectedCaps('green-study'), [0]);
});

test('capCollect: no-op if index already recorded', () => {
  capCollect('green-study', 0);
  assert.deepEqual(collectedCaps('green-study'), [0]);
});

test('capCollect: appends new indices', () => {
  capCollect('green-study', 2);
  assert.deepEqual(collectedCaps('green-study'), [0, 2]);
});

test('mutate live object + save() persists correct JSON shape', () => {
  garage().carIndex = 2;
  const lk = carLook(2);
  lk.bodyColor = '#ff0000';
  lk.neonColor = '#39FF14';
  save();

  const raw = JSON.parse(store.get('desktop-drift'));
  assert.equal(raw.version, 3);
  assert.equal(raw.garage.carIndex, 2);
  assert.equal(raw.garage.cars['2'].bodyColor, '#ff0000');
  assert.equal(raw.garage.cars['2'].neonColor, '#39FF14');
  assert.deepEqual(raw.settings, { units: 'kmh', haptics: true });
});

// ── Shop: owned / grant / purchase + per-car looks ────────────────────────────

test('owned: defaults to [] empty', () => {
  assert.deepEqual(owned(), []);
});

test('grant: records ownership; idempotent; isOwned reflects it', () => {
  assert.equal(isOwned('finish-matte'), false);
  grant('finish-matte');
  grant('finish-matte');                       // no-op (already owned)
  assert.deepEqual(owned(), ['finish-matte']);
  assert.equal(isOwned('finish-matte'), true);
});

test('carLook: each car keeps an independent look', () => {
  const a = carLook(0); a.finish = 'matte';     a.trailColor = '#ff00aa';
  const b = carLook(1); b.finish = 'chrome';    b.neonColor  = '#00ffcc';
  save();
  assert.equal(carLook(0).finish, 'matte');
  assert.equal(carLook(0).trailColor, '#ff00aa');
  assert.equal(carLook(1).finish, 'chrome');
  assert.equal(carLook(0).neonColor, null);     // car 1's neon did NOT leak onto car 0
  const raw = JSON.parse(store.get('desktop-drift'));
  assert.equal(raw.garage.cars['0'].finish, 'matte');
  assert.equal(raw.garage.cars['1'].finish, 'chrome');
});

test('purchase: success deducts wallet, grants item; failure leaves state intact', () => {
  // wallet is 0 here (earlier addTires test clamped it back to 0) — top it up.
  addTires(100);                               // wallet → 100
  const ok = purchase({ id: 'finish-pearl', price: 80 });
  assert.deepEqual(ok, { ok: true, wallet: 20, owned: ['finish-matte', 'finish-pearl'] });
  assert.equal(wallet(), 20);
  assert.equal(isOwned('finish-pearl'), true);

  // already owned → rejected, no further deduction
  const dup = purchase({ id: 'finish-pearl', price: 80 });
  assert.deepEqual(dup, { ok: false, reason: 'owned' });
  assert.equal(wallet(), 20);

  // too expensive → rejected, wallet untouched
  const broke = purchase({ id: 'finish-chrome', price: 250 });
  assert.deepEqual(broke, { ok: false, reason: 'broke' });
  assert.equal(wallet(), 20);
  assert.equal(isOwned('finish-chrome'), false);
});

// ── Ledger (tire-coin history) ────────────────────────────────────────────────

test('ledger: addTires records a signed entry with reason + resulting balance', () => {
  const before = ledger().length;
  addTires(7, 'Test reward');
  const last = ledger()[ledger().length - 1];
  assert.equal(ledger().length, before + 1);
  assert.equal(last.amount, 7);
  assert.equal(last.reason, 'Test reward');
  assert.equal(last.balance, wallet());
  assert.ok(last.t > 0);
});

test('ledger: a zero-delta change records nothing', () => {
  const before = ledger().length;
  addTires(0, 'noop');
  assert.equal(ledger().length, before);
});

test('ledger: addTires WITHOUT a reason changes wallet but logs nothing (silent pickups)', () => {
  const before = ledger().length;
  const w = wallet();
  addTires(3);                                 // no reason → silent
  assert.equal(wallet(), w + 3);
  assert.equal(ledger().length, before);
});

test('recordTxn: logs an entry without changing the wallet (aggregated sums)', () => {
  const w = wallet();
  const before = ledger().length;
  recordTxn(12, 'Stainless Speedway — 12 tires');
  const last = ledger()[ledger().length - 1];
  assert.equal(wallet(), w);                    // balance unchanged
  assert.equal(ledger().length, before + 1);
  assert.equal(last.amount, 12);
  assert.equal(last.reason, 'Stainless Speedway — 12 tires');
  assert.equal(last.balance, w);
  recordTxn(0, 'noop');                         // 0 is a no-op
  assert.equal(ledger().length, before + 1);
});

test('ledger: purchase logs a "Bought …" entry with the negative amount', () => {
  addTires(500, 'topup');
  purchase({ id: 'trail-mint', name: 'Mint', price: 40, kind: 'trail', value: '#00FF88' });
  const last = ledger()[ledger().length - 1];
  assert.equal(last.reason, 'Bought Mint');
  assert.equal(last.amount, -40);
});

test('ledger: capped at 50 entries (oldest dropped)', () => {
  for (let i = 0; i < 60; i++) addTires(1, 'spam ' + i);
  assert.ok(ledger().length <= 50);
});

// ── Achievements slice (see docs/plans/achievements.md) ───────────────────────
test('achievements: default empty; achUnlocked() is an empty set', () => {
  assert.deepEqual(achAll(), {});
  assert.equal(achUnlocked().size, 0);
});

test('achUnlock: idempotent, persists, returns true only the first time', () => {
  assert.equal(achUnlock('first-drift'), true);
  assert.equal(achUnlock('first-drift'), false);      // already unlocked → no re-fire
  assert.ok(achUnlocked().has('first-drift'));
  assert.equal(achAll()['first-drift'].unlocked, true);
});

test('achSetProgress: latches to the max seen (never regresses)', () => {
  achSetProgress('races-10', 4);
  assert.equal(achAll()['races-10'].progress, 4);
  achSetProgress('races-10', 7);
  assert.equal(achAll()['races-10'].progress, 7);
  achSetProgress('races-10', 3);                       // lower value ignored
  assert.equal(achAll()['races-10'].progress, 7);
});

test('achUnlocked: reflects only unlocked ids, not mere progress', () => {
  achSetProgress('drift-50', 12);                      // progress but not unlocked
  assert.ok(!achUnlocked().has('drift-50'));
  achUnlock('drift-50');
  assert.ok(achUnlocked().has('drift-50'));
});

