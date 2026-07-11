// Car ownership hook (store.carOwned / ownedCars / grantCar). The gate is OFF during dev
// (economy.CAR_GATING_ENABLED === false), so carOwned() is true for every car; the data
// plumbing is in place for when car pricing ships. See docs/plans/cars.md.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage } from './helpers.js';
import { CAR_GATING_ENABLED } from '../js/economy.js';

installLocalStorage({});
const { ownedCars, carOwned, grantCar } = await import('../js/store.js');

test('ownedCars defaults to empty', () => {
  assert.deepEqual(ownedCars(), []);
});

test('carOwned is true for any car while the gate is off (dev default)', () => {
  assert.equal(CAR_GATING_ENABLED, false);
  assert.equal(carOwned('plum'), true);
  assert.equal(carOwned('bismark'), true);
  assert.equal(carOwned('not-a-real-car'), true);
});

test('grantCar records a car id and is idempotent', () => {
  grantCar('plum');
  assert.deepEqual(ownedCars(), ['plum']);
  grantCar('plum');
  assert.deepEqual(ownedCars(), ['plum']);
});
