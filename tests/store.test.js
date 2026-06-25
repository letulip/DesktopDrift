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
        wallet, addTires, tiresFor, tireCollect,
        owned, isOwned, grant, equip, purchase } =
  await import('../js/store.js');

test('defaults: garage', () => {
  const g = garage();
  assert.equal(g.carIndex, 0);
  assert.equal(g.bodyColor, null);
  assert.equal(g.neonColor, null);
  assert.equal(g.finish, null);
  assert.equal(g.trailColor, null);
});

test('defaults: settings / records / achievements', () => {
  assert.deepEqual(settings(), { units: 'kmh', haptics: true });
  assert.deepEqual(records(), {});
  assert.deepEqual(achievements(), {});
});

test('getters return the same live object across calls', () => {
  assert.equal(garage(), garage());
});

test('stats: defaults to { caps: {}, tires: {} }', () => {
  assert.deepEqual(stats(), { caps: {}, tires: {} });
});

test('wallet: defaults to 0; addTires accumulates, persists, and clamps at 0', () => {
  assert.equal(wallet(), 0);
  assert.equal(addTires(5), 5);
  assert.equal(addTires(3), 8);
  assert.equal(wallet(), 8);
  assert.equal(addTires(-100), 0);   // clamped, never negative
});

test('tiresFor / tireCollect: one-time collection per track (mirrors caps)', () => {
  assert.deepEqual(tiresFor('green-study'), []);
  tireCollect('green-study', 't0');
  tireCollect('green-study', 't0');  // no-op (already collected)
  tireCollect('green-study', 't1');
  assert.deepEqual(tiresFor('green-study'), ['t0', 't1']);
});

test('collectedCaps: returns [] for unknown track', () => {
  assert.deepEqual(collectedCaps('green-study'), []);
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
  const g = garage();
  g.carIndex  = 2;
  g.bodyColor = '#ff0000';
  g.neonColor = '#39FF14';
  save();

  const raw = JSON.parse(store.get('desktop-drift'));
  assert.equal(raw.version, 1);
  assert.equal(raw.garage.carIndex, 2);
  assert.equal(raw.garage.bodyColor, '#ff0000');
  assert.equal(raw.garage.neonColor, '#39FF14');
  assert.deepEqual(raw.settings, { units: 'kmh', haptics: true });
});

// ── Shop: owned / grant / equip / purchase ────────────────────────────────────

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

test('equip: writes a garage slot and persists', () => {
  equip('finish', 'matte');
  equip('trailColor', '#ff00aa');
  assert.equal(garage().finish, 'matte');
  assert.equal(garage().trailColor, '#ff00aa');
  const raw = JSON.parse(store.get('desktop-drift'));
  assert.equal(raw.garage.finish, 'matte');
  assert.equal(raw.garage.trailColor, '#ff00aa');
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
