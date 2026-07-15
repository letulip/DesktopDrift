// store.js v3 migration — a per-car `neonColor` hex folds into the new `neon` config object
// (Neon FX, docs/plans/neon.md). Separate file for a fresh module cache (see store.test.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage } from './helpers.js';

installLocalStorage({
  'desktop-drift': JSON.stringify({
    version: 2,
    garage: { carIndex: 0, cars: {
      '0': { bodyColor: '#112233', neonColor: '#FF00FF', finish: null, trailColor: null }, // had neon
      '1': { bodyColor: null,      neonColor: null,      finish: null, trailColor: null }, // no neon
    } },
  }),
});

const { carLook } = await import('../js/store.js');

test('v2→v3: a car with a neonColor gets a solid/static neon config from it', () => {
  assert.deepEqual(carLook(0).neon, { layout: 'solid', anim: 'none', colors: ['#FF00FF'], speed: 1 });
});

test('v2→v3: a car with no neonColor gets neon:null (off)', () => {
  assert.equal(carLook(1).neon, null);
});
