// Tests for js/sw-update.js — the pure decisions behind the update nudge.
// The registration + toast are browser-only (guarded behind `'serviceWorker' in navigator`,
// which is false under node, so importing this module here has no side effects).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldNudge, isGameplayPage } from '../js/sw-update.js';

test('shouldNudge: only when a new worker installed AND one already controls the page', () => {
  assert.equal(shouldNudge('installed', true), true);    // genuine update → nudge
  assert.equal(shouldNudge('installed', false), false);  // first install (no controller) → silent
  assert.equal(shouldNudge('installing', true), false);  // not done installing yet
  assert.equal(shouldNudge('activated', true), false);   // already took over — too late to nudge
  assert.equal(shouldNudge('redundant', true), false);   // superseded worker
});

test('isGameplayPage: suppresses the toast only on live-driving pages (game/sandbox)', () => {
  assert.equal(isGameplayPage('/game.html'), true);
  assert.equal(isGameplayPage('/sandbox.html'), true);
  assert.equal(isGameplayPage('/DesktopDrift/game.html'), true);    // project-pages base path
  assert.equal(isGameplayPage('/'), false);                         // index served at the root
  assert.equal(isGameplayPage('/index.html'), false);
  assert.equal(isGameplayPage('/tracks.html'), false);
  assert.equal(isGameplayPage('/zen.html'), false);                 // zen picker is a menu page
  assert.equal(isGameplayPage('/mygame.html'), false);              // suffix must be a whole file name
  assert.equal(isGameplayPage(''), false);
  assert.equal(isGameplayPage(undefined), false);
});
