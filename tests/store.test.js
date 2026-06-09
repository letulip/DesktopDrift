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

const { settings, garage, records, achievements, save } =
  await import('../js/store.js');

test('defaults: garage', () => {
  const g = garage();
  assert.equal(g.carIndex, 0);
  assert.equal(g.bodyColor, null);
  assert.equal(g.neonColor, null);
});

test('defaults: settings / records / achievements', () => {
  assert.deepEqual(settings(), { units: 'kmh' });
  assert.deepEqual(records(), {});
  assert.deepEqual(achievements(), {});
});

test('getters return the same live object across calls', () => {
  assert.equal(garage(), garage());
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
  assert.deepEqual(raw.settings, { units: 'kmh' });
});
