// Юнит-тесты чистой логики скоринга (js/scoring.js). Раньше эти формулы жили
// внутри замыкания startGame и были непокрываемы — теперь проверяемы напрямую.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDrifting, driftQuality, comboMult, comboGain, slipSign, pointsPerSecond,
  MULT_MAX, QUALITY_MAX, COMBO_RATE,
} from '../js/scoring.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('isDrifting: нужен и большой снос, и достаточная скорость', () => {
  assert.equal(isDrifting(70, 200), true);
  assert.equal(isDrifting(0, 200), false);   // нет сноса
  assert.equal(isDrifting(70, 80), false);   // мало скорости
  assert.equal(isDrifting(60, 200), false);  // граница строгая (> 60)
  assert.equal(isDrifting(-70, 200), true);  // знак сноса не важен
});

test('driftQuality: нормировка slip×speed с потолком', () => {
  near(driftQuality(160, 260), 1);          // референсные значения → 1
  near(driftQuality(0, 260), 0);
  assert.equal(driftQuality(320, 520), QUALITY_MAX); // выше — клампится
});

test('comboMult: 1 + multBuild, потолок MULT_MAX', () => {
  near(comboMult(0), 1);
  near(comboMult(3), 4);
  assert.equal(comboMult(7), MULT_MAX);
  assert.equal(comboMult(50), MULT_MAX);
});

test('comboGain: slip × speed × dt × mult × COMBO_RATE', () => {
  near(comboGain(160, 260, 1, 1), 160 * 260 * COMBO_RATE);
  near(comboGain(100, 100, 0.5, 2), 100 * 100 * 0.5 * COMBO_RATE * 2);
  near(comboGain(0, 260, 1, 5), 0);
});

test('slipSign: +1 / -1 / 0 по порогу', () => {
  assert.equal(slipSign(60), 1);
  assert.equal(slipSign(-60), -1);
  assert.equal(slipSign(10), 0);
  assert.equal(slipSign(50), 0);   // граница строгая
  assert.equal(slipSign(-50), 0);
});

test('pointsPerSecond: очки / время, защита от деления на 0', () => {
  near(pointsPerSecond(45000, 36), 1250);
  near(pointsPerSecond(0, 36), 0);
  near(pointsPerSecond(45000, 0), 0);  // totalTime=0 → 0, не Infinity
});
