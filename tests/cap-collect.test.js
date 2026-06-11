// Cola-cap collection mechanics tests.
//
// P0  stable capId key survives SVG reorder / insert / delete
// P1  2 full orbits → collected; capCollect fires exactly once (idempotency)
// P1  ZEN=true: cap collected + store updated, score unchanged
// P2  CW orbit (negative sweep) also collects; alternating jitter does not

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stepSweep } from '../js/cola.js';

const TAU         = 2 * Math.PI;
const CAP_INNER_R = 40;
const CAP_OUTER_R = 160;
const CAP_DECAY   = TAU / 6;   // rad/s drain when idle
const CAP_BONUS   = 500;
const CAP_LOOPS   = 2;
const THRESHOLD   = TAU * CAP_LOOPS; // 4π — must reach this to collect

// ─── Orbit frame generator ────────────────────────────────────────────────────
// Generates frames where the car circles the cap at (0,0) with given radius.
// direction: +1 = CCW (positive sweep accumulation), -1 = CW (negative).
//
// Why +2: the first frame always contributes delta=0 (prevAng=null → prevAng??ang = ang).
// Without it, `loops * stepsPerLoop` frames only produce `loops * stepsPerLoop - 1`
// effective angular steps — just under the threshold for an exact-loop count.
// Adding 2 extra frames guarantees a comfortable margin over the collection threshold.
const orbitFrames = (loops, stepsPerLoop, r = 100, direction = 1, dt = 1 / 60) => {
  const frames = [];
  const total  = Math.round(loops * stepsPerLoop) + 2;
  for (let k = 0; k < total; k++) {
    const angle = direction * (k / stepsPerLoop) * TAU;
    frames.push({ carX: r * Math.cos(angle), carY: r * Math.sin(angle), drifting: true, dt });
  }
  return frames;
};

// ─── Minimal updateCaps simulation ───────────────────────────────────────────
// Mirrors the core of game-engine.js updateCaps without any DOM/canvas deps.
//   cap          mutable { sweep, prevAng, collected } — modified in place
//   collectible  { x, y }
//   zen          if true, score/capBonus are not incremented (ZEN-mode contract)
// Returns { collected, capCollectCalls, score, capBonus }
const runCap = (frames, cap, collectible, zen = false) => {
  let score = 0, capBonus = 0, capCollectCalls = 0;
  for (const { carX, carY, drifting, dt } of frames) {
    if (cap.collected) continue; // already collected — extra frames must be no-ops
    const dx      = carX - collectible.x;
    const dy      = carY - collectible.y;
    const dist    = Math.hypot(dx, dy);
    const inDonut = dist > CAP_INNER_R && dist < CAP_OUTER_R;
    const ang     = Math.atan2(dy, dx);
    const engaged = inDonut && drifting;
    cap.sweep    = stepSweep(cap.sweep, cap.prevAng ?? ang, ang, engaged, dt, CAP_DECAY);
    cap.prevAng  = engaged ? ang : null;
    if (Math.abs(cap.sweep) >= THRESHOLD) {
      cap.collected = true;
      cap.sweep     = 0;
      if (!zen) { score += CAP_BONUS; capBonus += CAP_BONUS; }
      capCollectCalls++;
    }
  }
  return { collected: cap.collected, capCollectCalls, score, capBonus };
};

// Helper: fresh cap state
const freshCap = () => ({ sweep: 0, prevAng: null, collected: false });

// ─── P0: stable capId across SVG reorder / insert / delete ───────────────────

describe('P0: capId stable across SVG reorder / insert / delete', () => {
  // Mirrors the restore loop in game-engine.js:
  //   const prev = new Set(storedCapIds);
  //   collectibles.forEach((c, i) => { caps[i] = { collected: prev.has(c.capId ?? i) }; });
  const restore = (storedCapIds, collectibles) => {
    const prev = new Set(storedCapIds);
    const caps = {};
    collectibles.forEach((c, i) => { caps[i] = { collected: prev.has(c.capId ?? i) }; });
    return caps;
  };

  it('collected cap survives being moved to a lower index', () => {
    // Collected: "100,200".  SVG edit removes cap "50,60" (was index 0),
    // shifting "100,200" from index 1 → 0.
    const stored    = ['100,200'];
    const reordered = [{ capId: '100,200' }, { capId: '300,-50' }];
    const caps      = restore(stored, reordered);
    assert.ok(caps[0].collected,  '"100,200" should still be collected at new index 0');
    assert.ok(!caps[1].collected, '"300,-50" was never collected');
  });

  it('inserting a new cap before a collected one does not corrupt state', () => {
    // New cap added at index 0; collected "200,150" moves index 0 → 1.
    const stored     = ['200,150'];
    const withInsert = [{ capId: '-50,80' }, { capId: '200,150' }];
    const caps       = restore(stored, withInsert);
    assert.ok(!caps[0].collected, 'new cap should not appear collected');
    assert.ok(caps[1].collected,  '"200,150" should still be collected at new index 1');
  });

  it('deleting an uncollected cap does not mark the shifted cap as uncollected', () => {
    // Collected: "300,-50" (was index 1). Deleted: "50,60" (index 0). Now index 0.
    const stored      = ['300,-50'];
    const afterDelete = [{ capId: '300,-50' }];
    const caps        = restore(stored, afterDelete);
    assert.ok(caps[0].collected, '"300,-50" should still be collected after reindex');
  });

  it('two out of three caps collected, middle one removed — others unchanged', () => {
    const stored = ['0,0', '200,100'];
    // Cap "100,50" (was index 1) removed from SVG; remaining two shift.
    const after = [{ capId: '0,0' }, { capId: '200,100' }];
    const caps  = restore(stored, after);
    assert.ok(caps[0].collected,  '"0,0" must remain collected');
    assert.ok(caps[1].collected,  '"200,100" must remain collected');
  });

  it('numeric-index fallback still works for collectibles without capId', () => {
    // Legacy or non-cap collectibles carry no capId → fall back to array index.
    const stored       = [1]; // old-style numeric index
    const collectibles = [{}, {}]; // no capId field
    const caps         = restore(stored, collectibles);
    assert.ok(!caps[0].collected, 'index 0 not in stored list');
    assert.ok(caps[1].collected,  'index 1 is in stored list');
  });
});

// ─── P1: 2 full orbits → collected + idempotency ─────────────────────────────

describe('P1: CCW orbit collection and idempotency', () => {
  it('cap is NOT collected after only 1 full orbit', () => {
    const cap    = freshCap();
    const result = runCap(orbitFrames(1, 360), cap, { x: 0, y: 0 });
    assert.ok(!result.collected, 'should not collect after 1 orbit (threshold = 2 loops)');
  });

  it('cap IS collected after 2 full orbits', () => {
    const cap    = freshCap();
    const result = runCap(orbitFrames(2, 360), cap, { x: 0, y: 0 });
    assert.ok(result.collected, 'should collect after 2 orbits');
  });

  it('capCollect fires exactly once even when extra frames follow', () => {
    // 4 full orbits — well past threshold; must still fire only once.
    const cap    = freshCap();
    const result = runCap(orbitFrames(4, 360), cap, { x: 0, y: 0 });
    assert.strictEqual(result.capCollectCalls, 1, 'capCollect must fire exactly once');
  });

  it('score incremented by CAP_BONUS exactly once', () => {
    const cap    = freshCap();
    const result = runCap(orbitFrames(4, 360), cap, { x: 0, y: 0 });
    assert.strictEqual(result.score, CAP_BONUS, 'score += CAP_BONUS exactly once');
  });

  it('car too close to cap (inside inner radius) does not accumulate sweep', () => {
    // r = 20 < CAP_INNER_R (40) — inside the dead zone.
    const cap    = freshCap();
    const result = runCap(orbitFrames(5, 360, /* r= */ 20), cap, { x: 0, y: 0 });
    assert.ok(!result.collected, 'no collection inside inner radius');
    assert.strictEqual(cap.sweep, 0, 'sweep must stay 0 inside inner radius');
  });

  it('car too far from cap (outside outer radius) does not accumulate sweep', () => {
    // r = 200 > CAP_OUTER_R (160) — outside the donut.
    const cap    = freshCap();
    const result = runCap(orbitFrames(5, 360, /* r= */ 200), cap, { x: 0, y: 0 });
    assert.ok(!result.collected, 'no collection outside outer radius');
    assert.strictEqual(cap.sweep, 0, 'sweep must stay 0 outside outer radius');
  });

  it('idle gap between orbits drains sweep; a lone second orbit is not enough', () => {
    const cap        = freshCap();
    const collectible = { x: 0, y: 0 };
    // Phase 1: 1 complete CCW orbit → sweep ≈ 2π
    runCap(orbitFrames(1, 360), cap, collectible);
    assert.ok(Math.abs(cap.sweep) > Math.PI, 'sweep should be ~2π after 1 orbit');
    assert.ok(!cap.collected, 'not yet collected after 1 orbit');
    // Phase 2: 10 s idle (car far away, not drifting) → decay = 10 × TAU/6 ≈ 10.5 rad > 2π
    const idleFrames = Array.from({ length: 600 }, () => ({
      carX: 500, carY: 500, drifting: false, dt: 1 / 60,
    }));
    runCap(idleFrames, cap, collectible);
    assert.strictEqual(cap.sweep, 0, 'sweep must fully decay to 0 after 10 s idle');
    // Phase 3: 1 more orbit → sweep climbs back to ~2π, still below 4π threshold
    runCap(orbitFrames(1, 360), cap, collectible);
    assert.ok(!cap.collected, '1 orbit after full decay must not collect (need 2 continuous)');
  });
});

// ─── P1: ZEN mode ─────────────────────────────────────────────────────────────

describe('P1: ZEN mode — cap collected, store updated, score unchanged', () => {
  // NOTE: the current contract is that caps ARE permanently saved even in ZEN mode.
  // If a future decision (K2) changes this, update both the production guard and
  // this test together.
  it('ZEN=true: cap still reaches collected=true after 2 orbits', () => {
    const cap    = freshCap();
    const result = runCap(orbitFrames(2, 360), cap, { x: 0, y: 0 }, /* zen= */ true);
    assert.ok(result.collected, 'cap must be collected in ZEN mode');
  });

  it('ZEN=true: capCollect fires exactly once (cap is saved to store)', () => {
    const cap    = freshCap();
    const result = runCap(orbitFrames(2, 360), cap, { x: 0, y: 0 }, true);
    assert.strictEqual(result.capCollectCalls, 1, 'capCollect fires once in ZEN mode');
  });

  it('ZEN=true: score is not incremented', () => {
    const cap    = freshCap();
    const result = runCap(orbitFrames(2, 360), cap, { x: 0, y: 0 }, true);
    assert.strictEqual(result.score, 0, 'no score awarded in ZEN mode');
  });

  it('ZEN=true: capBonus accumulator stays 0 (PPS record unaffected)', () => {
    const cap    = freshCap();
    const result = runCap(orbitFrames(2, 360), cap, { x: 0, y: 0 }, true);
    assert.strictEqual(result.capBonus, 0, 'capBonus must be 0 in ZEN mode');
  });
});

// ─── P2: CW direction + jitter guard ─────────────────────────────────────────

describe('P2: CW direction collects; alternating jitter does not', () => {
  it('2 full CW orbits (negative sweep) → collected', () => {
    const cap    = freshCap();
    const result = runCap(orbitFrames(2, 360, 100, /* direction= */ -1), cap, { x: 0, y: 0 });
    assert.ok(result.collected, '2 CW orbits must collect the cap');
    assert.strictEqual(result.capCollectCalls, 1);
  });

  it('CW: not collected after only 1 orbit', () => {
    const cap    = freshCap();
    const result = runCap(orbitFrames(1, 360, 100, -1), cap, { x: 0, y: 0 });
    assert.ok(!result.collected, '1 CW orbit is not enough');
  });

  it('alternating angular jitter does not accumulate to threshold', () => {
    // Car inside donut, always drifting, but angle oscillates ±15° around a fixed point.
    // Cumulative sweep telescopes to ≈ ang[N-1] − ang[0] ≪ 4π → no collection.
    const cap    = freshCap();
    const r      = 100;
    const dt     = 1 / 60;
    const jitter = Array.from({ length: 1000 }, (_, k) => {
      const angle = (Math.PI / 12) * Math.sin(k * 0.5); // ±15° oscillation
      return { carX: r * Math.cos(angle), carY: r * Math.sin(angle), drifting: true, dt };
    });
    const result = runCap(jitter, cap, { x: 0, y: 0 });
    assert.ok(!result.collected, 'oscillating jitter must not collect the cap');
    assert.ok(
      Math.abs(cap.sweep) < THRESHOLD,
      `sweep stayed below threshold — got ${cap.sweep.toFixed(4)} rad`,
    );
  });

  it('back-and-forth half-orbits (CCW then CW reversal) do not accumulate', () => {
    // Car sweeps CCW 0→π then reverses CW back π→0, ten times.
    // Each CCW half adds +π; each CW reversal subtracts −π. Net per cycle = 0.
    // Frames are generated continuously (no angle discontinuity at transition)
    // so there is no artificial prevAng jump between phases.
    const cap    = freshCap();
    const r = 100, dt = 1 / 60, N = 180; // 180 steps per half-orbit
    const frames = [];
    for (let rep = 0; rep < 10; rep++) {
      for (let k = 0; k <= N; k++) {          // CCW: angle 0 → π
        const a = (k / N) * Math.PI;
        frames.push({ carX: r * Math.cos(a), carY: r * Math.sin(a), drifting: true, dt });
      }
      for (let k = N; k >= 0; k--) {          // CW reversal: angle π → 0
        const a = (k / N) * Math.PI;
        frames.push({ carX: r * Math.cos(a), carY: r * Math.sin(a), drifting: true, dt });
      }
    }
    const result = runCap(frames, cap, { x: 0, y: 0 });
    assert.ok(!result.collected, '10 CCW/CW back-and-forth cycles must not collect');
    assert.ok(
      Math.abs(cap.sweep) < THRESHOLD,
      `sweep stayed below threshold — got ${cap.sweep.toFixed(4)} rad`,
    );
  });
});
