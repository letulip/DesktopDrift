// ownedFirstOrder — owned/free cars sort to the front of the carousel, groups keep registry order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownedFirstOrder } from '../js/car-order.js';

const CARS = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

test('owned cars come first, each group in registry order', () => {
  const owned = new Set(['b', 'd']);
  // owned b(1), d(3) first (registry order), then a(0), c(2)
  assert.deepEqual(ownedFirstOrder(CARS, (c) => owned.has(c.id)), [1, 3, 0, 2]);
});

test('all owned → identity order', () => {
  assert.deepEqual(ownedFirstOrder(CARS, () => true), [0, 1, 2, 3]);
});

test('none owned → identity order', () => {
  assert.deepEqual(ownedFirstOrder(CARS, () => false), [0, 1, 2, 3]);
});

test('result is a permutation (every index once)', () => {
  const order = ownedFirstOrder(CARS, (c) => c.id === 'c');
  assert.equal(order[0], 2);                                  // the one owned car leads
  assert.deepEqual([...order].sort((x, y) => x - y), [0, 1, 2, 3]);
});
