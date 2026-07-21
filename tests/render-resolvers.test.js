// Unit tests for the pure device-tuning resolvers (js/render-config.js) — SPA Phase C.
// render.js captures DOM at import (can't load under node), so the dpr/surface param logic lives in
// this DOM-free module. A ?dpr / ?surface value in range is persisted to storage and wins; otherwise
// the stored value (or the default) is returned. Storage is injected so the test stays pure.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDprCap, resolveSurfaceMode } from '../js/render-config.js';

const store = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m };
};

test('resolveDprCap: an in-range param wins and is persisted', () => {
  const s = store();
  assert.equal(resolveDprCap('1.25', s), 1.25);
  assert.equal(s._m.get('dd-dpr'), '1.25');
});

test('resolveDprCap: no param falls back to stored, else 1.5', () => {
  assert.equal(resolveDprCap(null, store()), 1.5);                 // nothing stored → default
  assert.equal(resolveDprCap(null, store({ 'dd-dpr': '1' })), 1);  // honors the stored value
});

test('resolveDprCap: out-of-range / non-numeric params are ignored (not stored)', () => {
  const s = store();
  assert.equal(resolveDprCap('2', s), 1.5);       // '2' not an allowed cap → not stored
  assert.equal(s._m.has('dd-dpr'), false);
  const s2 = store({ 'dd-dpr': '1' });
  assert.equal(resolveDprCap('abc', s2), 1);      // junk param leaves the stored value intact
  assert.equal(s2._m.get('dd-dpr'), '1');
});

test('resolveSurfaceMode: an in-range param wins and is persisted', () => {
  const s = store();
  assert.equal(resolveSurfaceMode('bake', s), 'bake');
  assert.equal(s._m.get('dd-surface'), 'bake');
});

test('resolveSurfaceMode: no param falls back to stored, else live', () => {
  assert.equal(resolveSurfaceMode(null, store()), 'live');
  assert.equal(resolveSurfaceMode(null, store({ 'dd-surface': 'bake' })), 'bake');
});

test('resolveSurfaceMode: unknown param is ignored (not stored)', () => {
  const s = store({ 'dd-surface': 'bake' });
  assert.equal(resolveSurfaceMode('foo', s), 'bake');
  assert.equal(s._m.get('dd-surface'), 'bake');
});
