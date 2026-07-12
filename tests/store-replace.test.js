// store.replaceAll() — the profile-IMPORT path. An imported profile must flow through the
// same migrate + merge-over-defaults heal as a normal load: back-fill missing keys, heal
// wrong-typed slices, run old→current migrations, re-stamp version, and persist. Separate
// file for a fresh module cache (store.js caches _s at module level — see store.test.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage } from './helpers.js';

const ls = installLocalStorage();
const { replaceAll, snapshot, settings, garage, wallet, ownedCars, owned } =
  await import('../js/store.js');

test('replaceAll: adopts a full imported profile and persists it', () => {
  const ok = replaceAll({
    version: 4,
    settings: { units: 'mph', haptics: false },
    garage: { carIndex: 3, cars: {} },
    wallet: 500,
    ownedCars: ['toretto'],
  });
  assert.equal(ok, true);
  assert.equal(settings().units, 'mph');
  assert.equal(garage().carIndex, 3);
  assert.equal(wallet(), 500);
  assert.deepEqual(ownedCars(), ['toretto']);
  // Persisted to localStorage under the canonical key, version stamped to current.
  const raw = JSON.parse(ls.get('desktop-drift'));
  assert.equal(raw.version, 4);
  assert.equal(raw.wallet, 500);
});

test('replaceAll: back-fills missing keys from defaults (partial import is safe)', () => {
  replaceAll({ settings: { units: 'kmh' }, wallet: 10 });   // no garage/stats/owned/…
  assert.deepEqual(garage(), { carIndex: 0, cars: {} });     // filled from defaults
  assert.deepEqual(owned(), []);                              // filled from defaults
  assert.equal(settings().haptics, true);                    // missing subfield filled
  assert.equal(wallet(), 10);                                // provided value kept
});

test('replaceAll: heals a wrong-typed slice instead of adopting it', () => {
  replaceAll({ settings: null, garage: 'oops', wallet: 3 });
  assert.deepEqual(settings(), { units: 'kmh', haptics: true }); // null → default shape
  assert.deepEqual(garage(), { carIndex: 0, cars: {} });         // 'oops' → default shape
  assert.equal(wallet(), 3);
});

test('replaceAll: runs the migration chain on an old-version import', () => {
  // v1 shape: a single global equipped look on garage → v2 migration moves it onto the car.
  replaceAll({ version: 1, garage: { carIndex: 2, bodyColor: '#00ff00' } });
  assert.equal(garage().carIndex, 2);
  assert.equal(garage().bodyColor, undefined);          // legacy top-level look removed
  assert.equal(garage().cars['2'].bodyColor, '#00ff00'); // migrated onto the active car
});

test('replaceAll: rejects a non-object without touching state', () => {
  replaceAll({ settings: { units: 'mph' }, wallet: 77 });
  assert.equal(replaceAll(null), false);
  assert.equal(replaceAll('nope'), false);
  assert.equal(replaceAll([1, 2]), false);
  assert.equal(wallet(), 77);                            // unchanged after the rejections
  assert.equal(settings().units, 'mph');
});

test('snapshot: returns the full live state object', () => {
  replaceAll({ settings: { units: 'kmh' }, wallet: 5 });
  const s = snapshot();
  assert.equal(s.wallet, 5);
  assert.equal(s.version, 4);
  assert.ok('garage' in s && 'stats' in s && 'achievements' in s);   // full shape
});
