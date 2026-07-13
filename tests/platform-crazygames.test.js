// CrazyGames adapter contract — js/platform-crazygames.js.
// Mirrors tests/platform.test.js: the five functions must exist, never throw,
// and the Promise-returning ones must resolve. Run under Node there is no DOM
// and no SDK, which is exactly the degraded environment the adapter must
// no-op in silently (script injection fails ⇒ sdk stays null).
// Also covers the sound.js setMuted() hook the adapter muters ads through.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage } from './helpers.js';

// Install localStorage BEFORE importing (adapter → sound.js → store.js).
const stored = installLocalStorage();
const platform = await import('../js/platform-crazygames.js');
const { setMuted } = await import('../js/sound.js');

const FNS = ['init', 'gameplayStart', 'gameplayStop', 'commercialBreak', 'happyMoment'];

test('adapter exports all five contract functions', () => {
  for (const name of FNS) assert.equal(typeof platform[name], 'function', name);
});

test('init() resolves without SDK/DOM (degraded environment)', async () => {
  await platform.init(); // must swallow the script-load failure and resolve
});

test('init() is idempotent — repeat calls return the same shared promise', () => {
  assert.equal(platform.init(), platform.init());
});

test('commercialBreak() resolves immediately when the SDK is unavailable', async () => {
  const t0 = Date.now();
  await platform.commercialBreak();
  assert.ok(Date.now() - t0 < 1000, 'no-SDK break must not wait on any timeout');
});

test('signal functions do not throw without SDK', () => {
  platform.gameplayStart();
  platform.gameplayStop();
  platform.happyMoment();
});

test('setMuted() toggles without throwing and without touching persisted settings', () => {
  const before = JSON.stringify([...stored.entries()].sort());
  setMuted(true);
  setMuted(true);   // repeat calls are fine
  setMuted(false);
  assert.equal(JSON.stringify([...stored.entries()].sort()), before,
    'runtime mute must never write to localStorage');
});
