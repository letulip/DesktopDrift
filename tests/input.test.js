// Unit tests for pure input mapping (js/input.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSteer } from '../js/input.js';

const W = 1000; // screen width for tests
const noKeys = {};

test('resolveSteer: no input → 0', () => {
  assert.equal(resolveSteer(new Map(), noKeys, W), 0);
});

test('resolveSteer: pointer on left half → -1', () => {
  assert.equal(resolveSteer(new Map([[1, 200]]), noKeys, W), -1);
});

test('resolveSteer: pointer on right half → +1', () => {
  assert.equal(resolveSteer(new Map([[1, 800]]), noKeys, W), 1);
});

test('resolveSteer: two pointers on opposite halves cancel → 0', () => {
  assert.equal(resolveSteer(new Map([[1, 200], [2, 800]]), noKeys, W), 0);
});

test('resolveSteer: ArrowLeft → -1, no pointer needed', () => {
  assert.equal(resolveSteer(new Map(), { ArrowLeft: true }, W), -1);
});

test('resolveSteer: ArrowRight → +1', () => {
  assert.equal(resolveSteer(new Map(), { ArrowRight: true }, W), 1);
});

test('resolveSteer: keyboard overrides pointer — ArrowRight wins over left-half touch', () => {
  assert.equal(resolveSteer(new Map([[1, 200]]), { ArrowRight: true }, W), 1);
});

test('resolveSteer: both arrow keys cancel, falls back to pointer', () => {
  const keys = { ArrowLeft: true, ArrowRight: true };
  assert.equal(resolveSteer(new Map([[1, 200]]), keys, W), -1); // kSteer=0 → pointer
  assert.equal(resolveSteer(new Map(),           keys, W), 0);  // kSteer=0, no pointer
});

test('resolveSteer: a/A/d/D aliases work', () => {
  assert.equal(resolveSteer(new Map(), { a: true }, W), -1);
  assert.equal(resolveSteer(new Map(), { A: true }, W), -1);
  assert.equal(resolveSteer(new Map(), { d: true }, W), 1);
  assert.equal(resolveSteer(new Map(), { D: true }, W), 1);
});
