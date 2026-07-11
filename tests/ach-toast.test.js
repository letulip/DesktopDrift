// ach-toast.js — the pure shop→garage hand-off (toastDefs + queue via sessionStorage).
// The rendering/confetti is presentational (DOM) and not unit-tested; this covers the
// serialisable contract the garage relies on.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal sessionStorage stand-in (the module reads the bare `sessionStorage` global).
const _store = new Map();
globalThis.sessionStorage = {
  getItem:    (k) => (_store.has(k) ? _store.get(k) : null),
  setItem:    (k, v) => _store.set(k, String(v)),
  removeItem: (k) => _store.delete(k),
};

const { toastDefs, queueAchievementToasts } = await import('../js/ach-toast.js');
const KEY = 'dd-ach-toasts';

test('toastDefs keeps only icon/name/reward and drops falsy entries', () => {
  const out = toastDefs([
    { id: 'fashionista', icon: '👗', name: 'Fashionista', reward: 30, check: () => true },
    null,
    { icon: '🧩', name: 'Well Rounded', reward: 30 },
  ]);
  assert.deepEqual(out, [
    { icon: '👗', name: 'Fashionista', reward: 30 },
    { icon: '🧩', name: 'Well Rounded', reward: 30 },
  ]);
});

test('queue stashes sanitised defs and appends across calls', () => {
  _store.clear();
  queueAchievementToasts([{ id: 'x', icon: '👗', name: 'Fashionista', reward: 30, check: () => 1 }]);
  assert.deepEqual(JSON.parse(_store.get(KEY)), [{ icon: '👗', name: 'Fashionista', reward: 30 }]);
  queueAchievementToasts([{ icon: '🧩', name: 'Well Rounded', reward: 30 }]);
  assert.equal(JSON.parse(_store.get(KEY)).length, 2);
});

test('queue is a no-op for empty / null / undefined', () => {
  _store.clear();
  queueAchievementToasts([]);
  queueAchievementToasts(null);
  queueAchievementToasts(undefined);
  assert.equal(_store.has(KEY), false);
});
