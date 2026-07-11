// car-stats.js — the pure star-rating math + its inverse. Guards the round-trip the car
// generator relies on (ratings → drive → ratings) and pins the numbers the garage shows.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speedRating, accRating, handlingRating, driveForRatings } from '../js/car-stats.js';

test('driveForRatings round-trips for every integer rating 1..10', () => {
  for (let h = 1; h <= 10; h++)
    for (let a = 1; a <= 10; a++)
      for (let s = 1; s <= 10; s++) {
        const d = driveForRatings({ handling: h, accel: a, speed: s });
        assert.equal(handlingRating(d), h, `handling ${h}`);
        assert.equal(accRating(d),      a, `accel ${a}`);
        assert.equal(speedRating(d),    s, `speed ${s}`);
      }
});

test('plum 7/7/7 → the expected drive params', () => {
  const d = driveForRatings({ handling: 7, accel: 7, speed: 7 });
  assert.equal(d.maxSpeed, 457);
  assert.equal(d.thrust, 630);
  assert.equal(d.steer, 3.5);
  assert.equal(d.lowSpeedTurn, 0.35);
});

test('matches the garage numbers for the legacy cars (Bismark 7/6/4, Panda 6/7/6)', () => {
  // Bismark drive (from config.js): maxSpeed 470, thrust 580, steer 2.2, lowSpeedTurn 0.20.
  const bismark = { maxSpeed: 470, thrust: 580, steer: 2.2, lowSpeedTurn: 0.20 };
  assert.equal(speedRating(bismark), 7);
  assert.equal(accRating(bismark), 6);
  assert.equal(handlingRating(bismark), 4);
  // Panda: maxSpeed 410, thrust 620, steer 3.0, lowSpeedTurn 0.30.
  const panda = { maxSpeed: 410, thrust: 620, steer: 3.0, lowSpeedTurn: 0.30 };
  assert.equal(speedRating(panda), 6);
  assert.equal(accRating(panda), 7);
  assert.equal(handlingRating(panda), 6);
});
