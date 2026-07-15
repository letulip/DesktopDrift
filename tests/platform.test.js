// No-op platform adapter contract — js/platform.js.
// Every per-platform adapter must export these same five functions; game code
// calls them bare (no try/catch), so none may throw and the Promise-returning
// ones must resolve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as platform from '../js/platform.js';

const FNS = ['init', 'gameplayStart', 'gameplayStop', 'commercialBreak', 'happyMoment'];

test('adapter exports all five contract functions', () => {
  for (const name of FNS) assert.equal(typeof platform[name], 'function', name);
});

test('init() resolves', async () => {
  await platform.init(); // rejection or non-thenable would fail the test
});

test('commercialBreak() resolves (default: immediately, no ad)', async () => {
  await platform.commercialBreak();
});

test('signal functions do not throw', () => {
  platform.gameplayStart();
  platform.gameplayStop();
  platform.happyMoment();
});
