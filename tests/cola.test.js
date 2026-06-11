import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { angDelta, capProgress, stepSweep } from '../js/cola.js';

const TAU = 2 * Math.PI;

describe('angDelta', () => {
  it('returns 0 for equal angles', () => {
    assert.strictEqual(angDelta(1, 1), 0);
  });

  it('returns positive delta for CCW step', () => {
    const d = angDelta(0, 0.5);
    assert.ok(d > 0, `expected >0, got ${d}`);
  });

  it('wraps across +π boundary', () => {
    // 179° → -179°: shortest path is -2° ≈ -0.0349 rad
    const d = angDelta(Math.PI * 0.995, -Math.PI * 0.995);
    assert.ok(Math.abs(d) < 0.1, `expected small wrap, got ${d}`);
  });

  it('wraps across -π boundary', () => {
    // -179° → 179°: shortest path is +2°
    const d = angDelta(-Math.PI * 0.995, Math.PI * 0.995);
    assert.ok(Math.abs(d) < 0.1, `expected small wrap, got ${d}`);
  });

  it('result is always in (-π, π]', () => {
    const angles = [0, 1, -1, Math.PI, -Math.PI, TAU, -TAU, 3.1, -3.1];
    for (const a of angles) {
      for (const b of angles) {
        const d = angDelta(a, b);
        assert.ok(d > -Math.PI - 1e-9 && d <= Math.PI + 1e-9,
          `angDelta(${a}, ${b}) = ${d} out of range`);
      }
    }
  });
});

describe('capProgress', () => {
  it('returns 0 for sweep=0', () => {
    assert.strictEqual(capProgress(0), 0);
  });

  it('returns 0.5 for half loop', () => {
    assert.strictEqual(capProgress(Math.PI), 0.5);
  });

  it('returns 1 for exactly one full loop', () => {
    assert.strictEqual(capProgress(TAU), 1);
  });

  it('clamps to 1 beyond one loop', () => {
    assert.strictEqual(capProgress(TAU * 3), 1);
  });

  it('works for negative sweep (CW direction)', () => {
    assert.ok(Math.abs(capProgress(-Math.PI) - 0.5) < 1e-9);
    assert.strictEqual(capProgress(-TAU), 1);
  });
});

describe('stepSweep', () => {
  const DECAY = TAU / 6; // rad/s, as per spec

  it('accumulates when engaged', () => {
    const s = stepSweep(0, 0, 0.3, true, 0.016, DECAY);
    assert.ok(s > 0, `expected positive, got ${s}`);
  });

  it('accumulates correct delta when engaged', () => {
    const s = stepSweep(1.0, 1.0, 1.4, true, 0.016, DECAY);
    assert.ok(Math.abs(s - 1.4) < 1e-9, `expected 1.4, got ${s}`);
  });

  it('decays toward 0 when idle (positive sweep)', () => {
    const dt = 0.1;
    const s = stepSweep(1.0, 0, 0, false, dt, DECAY);
    assert.ok(s < 1.0 && s >= 0, `expected drain, got ${s}`);
  });

  it('decays toward 0 when idle (negative sweep)', () => {
    const dt = 0.1;
    const s = stepSweep(-1.0, 0, 0, false, dt, DECAY);
    assert.ok(s > -1.0 && s <= 0, `expected drain, got ${s}`);
  });

  it('never overshoots 0 from positive side', () => {
    // Large dt would overshoot without the clamp
    const s = stepSweep(0.01, 0, 0, false, 10, DECAY);
    assert.strictEqual(s, 0);
  });

  it('never overshoots 0 from negative side', () => {
    const s = stepSweep(-0.01, 0, 0, false, 10, DECAY);
    assert.strictEqual(s, 0);
  });

  it('stays 0 when already 0 and idle', () => {
    const s = stepSweep(0, 0, 0.5, false, 0.016, DECAY);
    assert.strictEqual(s, 0);
  });
});
