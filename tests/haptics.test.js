// Tests for js/haptics.js
// Strategy: install navigator.vibrate spy + real localStorage before importing.
// Then mutate store settings() to toggle haptics flag and verify vibrate calls.

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage } from './helpers.js';

// Install localStorage BEFORE importing store/haptics (module uses it lazily).
installLocalStorage();

// Install a navigator.vibrate spy.
// Node 24 defines navigator as a getter-only property on globalThis, so we
// must use defineProperty to override it.
const calls = [];
Object.defineProperty(globalThis, 'navigator', {
  value:        { vibrate: (pattern) => { calls.push(pattern); return true; } },
  configurable: true,
  writable:     true,
});

// Import after the environment is ready.
const { settings } = await import('../js/store.js');
const { hapticCone, hapticCrash } = await import('../js/haptics.js');

const clearCalls = () => calls.splice(0);

// ── hapticCone ────────────────────────────────────────────────────────────────

describe('hapticCone', () => {
  beforeEach(() => { settings().haptics = true; clearCalls(); });

  it('calls navigator.vibrate with a short duration when haptics=true', () => {
    hapticCone();
    assert.equal(calls.length, 1);
    assert.equal(typeof calls[0], 'number');
    assert.ok(calls[0] > 0 && calls[0] <= 50, 'cone tap should be ≤ 50 ms');
  });

  it('does not call navigator.vibrate when haptics=false', () => {
    settings().haptics = false;
    hapticCone();
    assert.equal(calls.length, 0);
  });
});

// ── hapticCrash ───────────────────────────────────────────────────────────────

describe('hapticCrash', () => {
  beforeEach(() => { settings().haptics = true; clearCalls(); });

  it('calls navigator.vibrate with an array pattern when haptics=true', () => {
    hapticCrash();
    assert.equal(calls.length, 1);
    assert.ok(Array.isArray(calls[0]), 'crash pattern should be an array');
    assert.ok(calls[0].length >= 2, 'pattern should have at least 2 entries');
  });

  it('does not call navigator.vibrate when haptics=false', () => {
    settings().haptics = false;
    hapticCrash();
    assert.equal(calls.length, 0);
  });
});
