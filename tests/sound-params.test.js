// Tests for js/sound-params.js — the pure SFX param table + volume maths (no AudioContext).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SFX, VOLUME_DEFAULT, VOLUME_LEVELS, clampVolume, gainForVolume, levelForVolume, totalDuration,
} from '../js/sound-params.js';

const VALID_TYPES = new Set(['sine', 'triangle', 'square', 'sawtooth', 'noise']);

test('SFX: every entry is a non-empty sequence of well-formed steps', () => {
  const ids = Object.keys(SFX);
  assert.ok(ids.length >= 20, `expected the full catalog, got ${ids.length}`);
  for (const id of ids) {
    const sfx = SFX[id];
    assert.ok(Array.isArray(sfx.steps) && sfx.steps.length > 0, `${id} has steps`);
    for (const s of sfx.steps) {
      assert.ok(VALID_TYPES.has(s.type), `${id} step type "${s.type}" is valid`);
      assert.ok((s.gain ?? 0) > 0 && s.gain <= 1, `${id} gain in (0,1]`);
      if (s.type !== 'noise') assert.ok(Number.isFinite(s.f) && s.f > 0, `${id} osc step has a frequency`);
    }
  }
});

test('SFX: the UI + gameplay ids the wiring depends on all exist', () => {
  for (const id of ['tap', 'flip', 'select', 'back', 'buy', 'deny', 'toggle',
                    'count', 'go', 'pickup', 'cap', 'checkpoint', 'lap', 'crash', 'cone',
                    'transition', 'nearmiss', 'bank', 'combobreak', 'finish', 'achieve', 'record']) {
    assert.ok(SFX[id], `SFX.${id} is defined`);
  }
});

test('clampVolume: clamps to [0,1] and falls back to default on garbage', () => {
  assert.equal(clampVolume(0.5), 0.5);
  assert.equal(clampVolume(0), 0);
  assert.equal(clampVolume(1), 1);
  assert.equal(clampVolume(-1), 0);
  assert.equal(clampVolume(2), 1);
  assert.equal(clampVolume('0.4'), 0.4);        // numeric strings from <input> coerce
  assert.equal(clampVolume(undefined), VOLUME_DEFAULT);   // Number(undefined) is NaN → default
  assert.equal(clampVolume(NaN), VOLUME_DEFAULT);
  assert.equal(clampVolume('nope'), VOLUME_DEFAULT);      // unparseable string → default
  assert.equal(clampVolume(null), 0);                     // Number(null) === 0 (finite) → clamped, not default
});

test('gainForVolume: squared curve, monotonic, endpoints exact', () => {
  assert.equal(gainForVolume(0), 0);
  assert.equal(gainForVolume(1), 1);
  assert.equal(gainForVolume(0.5), 0.25);
  assert.ok(gainForVolume(0.3) < gainForVolume(0.6));   // monotonic increasing
  assert.equal(gainForVolume(2), 1);                    // clamps before squaring
});

test('VOLUME_LEVELS + levelForVolume: nearest discrete level for the button-row', () => {
  assert.deepEqual(Object.keys(VOLUME_LEVELS), ['low', 'med', 'high']);
  assert.equal(levelForVolume(VOLUME_LEVELS.low), 'low');
  assert.equal(levelForVolume(VOLUME_LEVELS.med), 'med');
  assert.equal(levelForVolume(VOLUME_LEVELS.high), 'high');
  assert.equal(levelForVolume(0.3), 'low');
  assert.equal(levelForVolume(0.9), 'high');
  assert.equal(levelForVolume(VOLUME_DEFAULT), 'med');   // default aligns to a level
});

test('totalDuration: positive for real SFX, 0 for empty/invalid', () => {
  assert.ok(totalDuration(SFX.finish) > 0);
  assert.ok(totalDuration(SFX.tap) > 0);
  assert.equal(totalDuration({ steps: [] }), 0);
  assert.equal(totalDuration(null), 0);
  assert.equal(totalDuration(undefined), 0);
});
