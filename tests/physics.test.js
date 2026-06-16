// Golden-master (characterization) test for the car physics step.
//
// These frozen numbers were captured from the extracted `stepCar` — which is a verbatim
// copy of the integration that shipped inside game-engine.js `frame()`. They therefore
// pin the CURRENT drift feel: any later refactor of the physics that changes a number
// here changes how the car drives. If a step legitimately changes behaviour, regenerate
// the snapshot deliberately (and confirm the new feel in the browser) — never "fix" the
// numbers blindly.
//
// Scenario: a Bismark-profile car from rest, fixed dt = 1/60, steering hard right for 40
// steps then hard left for 40. Pure — no collisions, no DOM, no RNG.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepCar } from '../js/physics.js';

// Bismark `_drive` profile (CFG ⊕ car override) — inlined so the test pins the physics
// math, not the live config (which is tuned independently).
const P = { thrust: 580, maxSpeed: 470, steer: 2.2, steerSmooth: 4.5, lowSpeedTurn: 0.20,
            selfAlign: 0.82, grip: 0.98, rollFriction: 0.995, driftDrag: 0.004, driftSteerBoost: 1.2 };
const K = { PHYS_HZ: 120, GRIP_WOBBLE: 0.7, STEER_WOBBLE: 0.16 };
const DT = 1 / 60;

// Expected car state at the recorded steps (see scenario above).
const GOLDEN = [
  { i: 1,  x: 0.159504,   y: 0,          vx: 9.570242,   vy: 0,          angle: 0.00055,  steerSmooth: 0.075 },
  { i: 10, x: 8.514045,   y: 0.051443,   vx: 91.479714,  vy: 1.129742,   angle: 0.042859, steerSmooth: 0.541418 },
  { i: 40, x: 105.688556, y: 23.315309,  vx: 242.842036, vy: 127.111312, angle: 0.952639, steerSmooth: 0.955775 },
  { i: 41, x: 109.717303, y: 25.552082,  vx: 241.724767, vy: 134.206354, angle: 0.98506,  steerSmooth: 0.809092 },
  { i: 80, x: 274.424315, y: 179.775095, vx: 323.354674, vy: 251.50645,  angle: 0.297955, steerSmooth: -0.913506 },
];

const EPS = 1e-5;

test('stepCar reproduces the golden drift trajectory (feel lock)', () => {
  const car = { x: 0, y: 0, vx: 0, vy: 0, angle: 0 };
  const sm  = { steerSmooth: 0, physT: 0 };
  const want = new Map(GOLDEN.map(g => [g.i, g]));

  for (let i = 1; i <= 80; i++) {
    const steerTarget = i <= 40 ? 1 : -1;
    stepCar(car, sm, steerTarget, P, K, DT);
    const g = want.get(i);
    if (!g) continue;
    for (const key of ['x', 'y', 'vx', 'vy', 'angle']) {
      assert.ok(Math.abs(car[key] - g[key]) < EPS,
        `step ${i} car.${key}: got ${car[key]}, want ${g[key]}`);
    }
    assert.ok(Math.abs(sm.steerSmooth - g.steerSmooth) < EPS,
      `step ${i} steerSmooth: got ${sm.steerSmooth}, want ${g.steerSmooth}`);
  }
});

test('stepCar returns the kinematics snapshot the engine scoring/skid code needs', () => {
  const car = { x: 0, y: 0, vx: 120, vy: 40, angle: 0.3 };
  const sm  = { steerSmooth: 0, physT: 0 };
  const r = stepCar(car, sm, 1, P, K, DT);
  assert.equal(typeof r.drifting, 'boolean');
  assert.equal(typeof r.speed, 'number');
  assert.equal(typeof r.vS, 'number');
  assert.ok(r.fwd && typeof r.fwd.x === 'number' && typeof r.fwd.y === 'number');
  assert.ok(r.side && typeof r.side.x === 'number' && typeof r.side.y === 'number');
  // speed is the pre-step speed (hypot of the entry velocity)
  assert.ok(Math.abs(r.speed - Math.hypot(120, 40)) < EPS);
});
