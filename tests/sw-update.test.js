// Tests for js/sw-update.js — the one pure decision behind the update nudge.
// The registration + toast are browser-only (guarded behind `'serviceWorker' in navigator`,
// which is false under node, so importing this module here has no side effects).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldNudge } from '../js/sw-update.js';

test('shouldNudge: only when a new worker installed AND one already controls the page', () => {
  assert.equal(shouldNudge('installed', true), true);    // genuine update → nudge
  assert.equal(shouldNudge('installed', false), false);  // first install (no controller) → silent
  assert.equal(shouldNudge('installing', true), false);  // not done installing yet
  assert.equal(shouldNudge('activated', true), false);   // already took over — too late to nudge
  assert.equal(shouldNudge('redundant', true), false);   // superseded worker
});
