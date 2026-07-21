// Unit tests for resetState (js/state.js) — the re-entrant restart reset (SPA Phase C).
// startGame() must be able to restart a race in the same document (no location.reload), so every
// runtime S field has to return to its default, arrays must be cleared IN PLACE (render.js holds
// the same array references), and the input maps must be emptied.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { S, keys, pointers, resetState } from '../js/state.js';

// Mutate S into a "just finished a race" mess, then reset and assert defaults.
test('resetState: every scalar field returns to its default', () => {
  Object.assign(S, {
    score: 9999, startCd: -0.004, goT: 0.3, bestLap: 12.3, lastLap: 8.1, lapNum: 7,
    mult: 8, multBuild: 5, comboPoints: 420, driftTime: 3, transitions: 4, nearMisses: 2,
    nearMissCd: 0.5, crashCd: 2, nextCp: 0, physT: 999, steerSmooth: 0.7, steerInput: 0.5,
    flashMsg: 'x', flashColor: '#f00', flashT: 0.8, driftGrace: 3, lapStarted: false,
    lapScoreStart: 500, lastSlipSign: -1, lapTime: 42, zen: true, reversed: true,
  });

  resetState();

  assert.equal(S.score, 0);
  assert.equal(S.startCd, 3.0);      // stale ≤0 would SKIP the countdown/GO block entirely
  assert.equal(S.goT, 0);
  assert.equal(S.bestLap, null);
  assert.equal(S.lastLap, null);
  assert.equal(S.lapNum, 0);
  assert.equal(S.mult, 1);
  assert.equal(S.multBuild, 0);
  assert.equal(S.comboPoints, 0);
  assert.equal(S.driftTime, 0);
  assert.equal(S.transitions, 0);
  assert.equal(S.nearMisses, 0);
  assert.equal(S.nearMissCd, 0);
  assert.equal(S.crashCd, 0);
  assert.equal(S.nextCp, 1);
  assert.equal(S.physT, 0);
  assert.equal(S.steerSmooth, 0);
  assert.equal(S.steerInput, 0);
  assert.equal(S.flashMsg, '');
  assert.equal(S.flashColor, '#fff');
  assert.equal(S.flashT, 0);
  assert.equal(S.driftGrace, 0);
  assert.equal(S.lapStarted, true);
  assert.equal(S.lapScoreStart, 0);
  assert.equal(S.lastSlipSign, 0);
  assert.equal(S.lapTime, 0);
  assert.equal(S.zen, false);
  assert.equal(S.reversed, false);
});

test('resetState: array fields are emptied IN PLACE (same reference render.js reads)', () => {
  const lsRef = S.lapScores;
  const skRef = S.skids;
  S.lapScores.push({ n: 1, pts: 100, t: 9.9 });
  S.skids.push({ x: 1, y: 2, a: 0.3 });

  resetState();

  assert.equal(S.lapScores.length, 0);
  assert.equal(S.skids.length, 0);
  assert.strictEqual(S.lapScores, lsRef);   // reassigning would detach render.js's binding
  assert.strictEqual(S.skids, skRef);
});

test('resetState: the S object identity is preserved (render.js imports the same binding)', () => {
  const ref = S;
  resetState();
  assert.strictEqual(S, ref);
});

test('resetState: keys{} and pointers Map are cleared (no phantom steering on restart)', () => {
  keys.ArrowLeft = true;
  keys.d = true;
  pointers.set(1, 320);
  pointers.set(2, 40);
  const pRef = pointers;

  resetState();

  assert.equal(Object.keys(keys).length, 0);
  assert.equal(pointers.size, 0);
  assert.strictEqual(pointers, pRef);       // same Map instance the handlers mutate
});
