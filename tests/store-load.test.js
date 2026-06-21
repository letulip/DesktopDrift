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
    records:      { oval: { timeattack: { bestLap: 12345, bestScore: 999 } } },
    achievements: { firstDrift: { unlocked: true, progress: 1 } },
  }),
});

const { settings, garage, records, achievements, stats, collectedCaps } =
  await import('../js/store.js');

test('loads persisted settings + fills missing fields from defaults', () => {
  // Saved units kept; haptics absent in the save → filled from defaults (no data loss).
  assert.deepEqual(settings(), { units: 'mph', haptics: true });
});

test('loads persisted garage + fills missing fields', () => {
  // neonColor absent in the save → filled from defaults.
  assert.deepEqual(garage(), { carIndex: 3, bodyColor: '#00ff00', neonColor: null });
});

test('loads persisted records / achievements', () => {
  assert.equal(records().oval.timeattack.bestLap, 12345);
  assert.equal(achievements().firstDrift.unlocked, true);
});

test('stats: missing slice is filled from defaults on an existing save', () => {
  // The seeded save has no stats field — merge fills it; existing data is untouched.
  assert.deepEqual(stats(), { caps: {} });
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

// Corrupt / unparseable data is the ONLY case that resets to defaults.
test('corrupt save falls back to defaults', async () => {
  installLocalStorage({ 'desktop-drift': '{ not valid json' });
  const fresh = await import('../js/store.js?v=corrupt');
  assert.deepEqual(fresh.settings(), { units: 'kmh', haptics: true });
  assert.deepEqual(fresh.records(), {});
});
