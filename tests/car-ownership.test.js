// Car ownership + purchase (store.carOwned / ownedCars / grantCar / buyCar). The gate is ON:
// free starters are always owned, other cars must be bought. See docs/plans/cars.md.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage } from './helpers.js';
import { CAR_GATING_ENABLED, FREE_CARS } from '../js/economy.js';

installLocalStorage({ 'desktop-drift': JSON.stringify({ version: 3, wallet: 500 }) });
const { ownedCars, carOwned, grantCar, buyCar, wallet } = await import('../js/store.js');

test('gate is on; free starters are owned, paid cars are not (until bought)', () => {
  assert.equal(CAR_GATING_ENABLED, true);
  for (const id of FREE_CARS) assert.equal(carOwned(id), true, `${id} is a free starter`);
  assert.equal(carOwned('plum'), false);
  assert.equal(carOwned('smasher'), false);
});

test('ownedCars defaults to empty', () => {
  assert.deepEqual(ownedCars(), []);
});

test('buyCar deducts the price, grants the car, and is not re-buyable', () => {
  assert.equal(wallet(), 500);
  const r = buyCar('plum', 300);
  assert.deepEqual(r, { ok: true });
  assert.equal(wallet(), 200);
  assert.equal(carOwned('plum'), true);
  assert.deepEqual(buyCar('plum', 300), { ok: false, reason: 'owned' });   // already owned
  assert.equal(wallet(), 200);                                             // no double charge
});

test('buyCar refuses when broke (wallet unchanged)', () => {
  assert.equal(wallet(), 200);
  assert.deepEqual(buyCar('smasher', 650), { ok: false, reason: 'broke' });
  assert.equal(wallet(), 200);
  assert.equal(carOwned('smasher'), false);
});

test('grantCar records a car id and is idempotent', () => {
  grantCar('catana');
  grantCar('catana');
  assert.ok(ownedCars().includes('catana'));
  assert.equal(ownedCars().filter(x => x === 'catana').length, 1);
});
