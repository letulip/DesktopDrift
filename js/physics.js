// Pure car kinematics for one frame — no DOM, no singletons.
//
// This is a VERBATIM extraction of the integration that used to live inline in
// game-engine.js `frame()`. It is feel-critical: do NOT reorder the operations.
// Frame-rate independence comes from `Math.pow(k, dt * PHYS_HZ)` decay terms and a
// dt clamped by the caller — the math is identical at any refresh rate.
//
// Mutates:  car.{vx,vy,x,y,angle}  and  sm.{steerSmooth,physT}
// Returns:  the pre-/in-step kinematics snapshot the caller's scoring + skid code needs
//           ({ drifting, speed, vS, fwd, side }), matching the values those lines read
//           before this was extracted (vS is post-grip-decay; speed/fwd/side are
//           pre-integration).
//
// car         : { x, y, vx, vy, angle }     (mutated)
// sm          : the game state S            (sm.steerSmooth, sm.physT mutated)
// steerTarget : -1 | 0 | 1  (already resolved from keys/pointers by the caller)
// P           : the car's drive profile (CARS[i]._drive)
// K           : { PHYS_HZ, GRIP_WOBBLE, STEER_WOBBLE } physics constants from config.js

import { isDrifting } from './scoring.js';

export const stepCar = (car, sm, steerTarget, P, K, dt) => {
  sm.steerSmooth += (steerTarget - sm.steerSmooth) * Math.min(1, dt * P.steerSmooth);

  const fwd  = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  const side = { x: -Math.sin(car.angle), y: Math.cos(car.angle) };
  let vF = car.vx * fwd.x + car.vy * fwd.y;
  let vS = car.vx * side.x + car.vy * side.y;
  const speed = Math.hypot(car.vx, car.vy);
  const drifting = isDrifting(vS, speed);

  sm.physT += dt;
  const wobSlow = Math.sin(sm.physT * 0.8 + 1.7) + 0.5 * Math.sin(sm.physT * 1.9 + 4.2);
  const wobFast = 0.6 * Math.sin(sm.physT * 5.3 + 0.5) + 0.4 * Math.sin(sm.physT * 12.1 + 2.1);
  const wob  = 0.7 * wobSlow + 0.3 * wobFast;
  const live = Math.min(1, speed / P.maxSpeed) * (0.4 + 0.6 * Math.min(1, Math.abs(vS) / 80));
  const liveSteer = Math.min(1, speed / P.maxSpeed) * Math.min(1, Math.abs(vS) / 60);
  const fAdj    = dt * K.PHYS_HZ;
  const gripAdj = fAdj * (1 + K.GRIP_WOBBLE * wob * live);

  if (vF < P.maxSpeed) vF += P.thrust * dt;
  vF *= Math.pow(P.rollFriction, fAdj);
  vS *= Math.pow(P.grip, gripAdj);
  vF *= Math.max(0, 1 - P.driftDrag * Math.abs(vS) * dt);

  const turnFactor = Math.max(P.lowSpeedTurn, Math.min(speed / 160, 1));
  const authority  = drifting ? P.driftSteerBoost : 1;
  car.angle += sm.steerSmooth * P.steer * turnFactor * authority * dt;
  car.angle += K.STEER_WOBBLE * wobSlow * liveSteer * dt;

  car.vx = fwd.x * vF + side.x * vS;
  car.vy = fwd.y * vF + side.y * vS;

  if (speed > 40) {
    const moveAng = Math.atan2(car.vy, car.vx);
    let diff = moveAng - car.angle;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += diff * P.selfAlign * Math.min(1, speed / P.maxSpeed) * dt;
  }

  car.x += car.vx * dt;
  car.y += car.vy * dt;

  return { drifting, speed, vS, fwd, side };
};
