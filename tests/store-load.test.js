// store.js — "load existing data" path: localStorage already contains a save
// with a matching version; store must load it rather than reset to defaults.
// Separate file (not a separate test) to get a fresh process and a clean
// module cache for store.js (see the comment in store.test.js).

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

const { settings, garage, records, achievements } =
  await import('../js/store.js');

test('loads persisted settings', () => {
  assert.deepEqual(settings(), { units: 'mph' });
});

test('loads persisted garage', () => {
  assert.deepEqual(garage(), { carIndex: 3, bodyColor: '#00ff00' });
});

test('loads persisted records / achievements', () => {
  assert.equal(records().oval.timeattack.bestLap, 12345);
  assert.equal(achievements().firstDrift.unlocked, true);
});

// version mismatch → reset to defaults (guard against incompatible schema)
test('version mismatch falls back to defaults', async () => {
  installLocalStorage({
    'desktop-drift': JSON.stringify({ version: 999, settings: { units: 'mph' } }),
  });
  // separate import with busting query — fresh module instance, clean _s
  const fresh = await import('../js/store.js?v=mismatch');
  assert.deepEqual(fresh.settings(), { units: 'kmh' });
});
