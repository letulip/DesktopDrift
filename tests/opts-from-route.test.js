// Unit tests for optsFromRoute (js/route.js) — the pure route→startGame-opts mapping (SPA Phase C).
// The game <template> mounts via createGameScreen(root, route); this helper turns the parsed route
// into the same opts the old game.html inline bootstrap built from location.search
// (startGame(T, { initItems:true, zen, reversed }) — plus stock for a sandbox mode and the
// track id/car the screen itself needs). laps is NEVER a route field — it comes from T.laps.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { optsFromRoute } from '../js/route.js';

test('optsFromRoute: zen time-attack', () => {
  assert.deepEqual(
    optsFromRoute({ track: 'oval', mode: 'zen', dir: null, car: null }),
    { trackId: 'oval', zen: true, reversed: false, stock: false, initItems: true, car: null });
});

test('optsFromRoute: sandbox, reversed, with a car index', () => {
  assert.deepEqual(
    optsFromRoute({ track: 'dev-desk', mode: 'sandbox', dir: 'rev', car: 2 }),
    { trackId: 'dev-desk', zen: false, reversed: true, stock: true, initItems: true, car: 2 });
});

test('optsFromRoute: plain time-attack keeps car 0', () => {
  assert.deepEqual(
    optsFromRoute({ track: 'cafe-marble', mode: null, dir: null, car: 0 }),
    { trackId: 'cafe-marble', zen: false, reversed: false, stock: false, initItems: true, car: 0 });
});

test('optsFromRoute: laps is never surfaced (it is T.laps, not a route field)', () => {
  assert.equal('laps' in optsFromRoute({ track: 'x' }), false);
});
