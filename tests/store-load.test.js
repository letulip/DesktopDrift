// store.js — "load existing data" path: localStorage already contains a save.
// The store must MERGE it over defaults (keep saved values, fill missing keys)
// — never reset and lose data. Separate file (not a separate test) to get a fresh
// process and a clean module cache for store.js (see the comment in store.test.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage } from './helpers.js';

installLocalStorage({
  'desktop-drift': JSON.stringify({
    version:      1,
    settings:     { units: 'mph' },
    garage:       { carIndex: 3, bodyColor: '#00ff00' },
    records:      { oval: { timeattack: { bestPPS: 1250, bestPPSTotal: 45000, bestPPSTime: 36 } } },
    achievements: { firstDrift: { unlocked: true, progress: 1 } },
  }),
});

const { settings, garage, records, achievements, stats, collectedCaps, wallet, tiresFor,
        owned, carLook } =
  await import('../js/store.js');

test('loads persisted settings + fills missing fields from defaults', () => {
  // Saved units kept; haptics absent in the save → filled from defaults (no data loss).
  assert.deepEqual(settings(), { units: 'mph', haptics: true });
});

test('v1→v2 migration: old global look moves onto the active car (per-car looks)', () => {
  // Saved carIndex 3 + a global bodyColor → migrated under cars['3'], top-level dropped.
  const g = garage();
  assert.equal(g.carIndex, 3);
  assert.equal(g.bodyColor, undefined);            // no more top-level look fields
  assert.deepEqual(carLook(3),
    { bodyColor: '#00ff00', neonColor: null, finish: null, trailColor: null });
  assert.equal(carLook(0).bodyColor, null);        // other cars start clean
});

test('owned: missing slice on an old save is filled from defaults ([])', () => {
  // The seeded save predates the shop — owned must appear as [], not undefined.
  assert.deepEqual(owned(), []);
});

test('loads persisted records / achievements (real PPS record shape)', () => {
  assert.deepEqual(records().oval.timeattack, { bestPPS: 1250, bestPPSTotal: 45000, bestPPSTime: 36 });
  assert.equal(achievements().firstDrift.unlocked, true);
});

test('stats: missing slice is filled from defaults on an existing save', () => {
  // The seeded save has no stats field — merge fills it; existing data is untouched.
  assert.deepEqual(stats(), { caps: {}, tires: {} });
});

test('wallet: missing field on an old save is filled from defaults (0)', () => {
  // The seeded save predates the economy — wallet must appear, not be undefined.
  assert.equal(wallet(), 0);
});

test('collectedCaps: returns [] when stats slice absent from save', () => {
  assert.deepEqual(collectedCaps('green-study'), []);
});

// Unknown / "future" version (e.g. a rolled-back deploy) must NOT wipe data —
// it is merged over defaults, same as any other save.
test('unknown version preserves data (no reset)', async () => {
  installLocalStorage({
    'desktop-drift': JSON.stringify({
      version: 999,
      settings: { units: 'mph' },
      records: { oval: { timeattack: { bestPPS: 42 } } },
    }),
  });
  const fresh = await import('../js/store.js?v=future');
  assert.deepEqual(fresh.settings(), { units: 'mph', haptics: true }); // saved kept, gap filled
  assert.equal(fresh.records().oval.timeattack.bestPPS, 42);           // records preserved
});

// Corrupt / unparseable data is the ONLY case that resets the whole store to defaults.
test('corrupt save falls back to defaults', async () => {
  installLocalStorage({ 'desktop-drift': '{ not valid json' });
  const fresh = await import('../js/store.js?v=corrupt');
  assert.deepEqual(fresh.settings(), { units: 'kmh', haptics: true });
  assert.deepEqual(fresh.records(), {});
});

// Content validation: a present-but-corrupt slice (wrong type / hand-deleted then a
// garbage value) heals to its default instead of throwing in a consumer later.
test('corrupt slice (wrong type) heals to default, other data kept', async () => {
  installLocalStorage({
    'desktop-drift': JSON.stringify({
      version: 1,
      settings: null,                 // garbled object → must heal to default shape
      garage: 'oops',                 // wrong type → must heal to default shape
      records: { oval: { timeattack: { bestPPS: 7 } } }, // valid → preserved
    }),
  });
  const fresh = await import('../js/store.js?v=corruptslice');
  assert.deepEqual(fresh.settings(), { units: 'kmh', haptics: true }); // no TypeError
  assert.equal(fresh.settings().units, 'kmh');
  assert.deepEqual(fresh.garage(), { carIndex: 0, cars: {} });
  assert.equal(fresh.records().oval.timeattack.bestPPS, 7);            // good data untouched
});

// A saved wallet balance and collected tires survive a load (economy persistence).
test('wallet + collected tires are preserved on load', async () => {
  installLocalStorage({
    'desktop-drift': JSON.stringify({
      version: 1,
      wallet: 137,
      stats: { caps: {}, tires: { 'green-study': ['t0', 't2'] } },
    }),
  });
  const fresh = await import('../js/store.js?v=econ');
  assert.equal(fresh.wallet(), 137);
  assert.deepEqual(fresh.tiresFor('green-study'), ['t0', 't2']);
});
