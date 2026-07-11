// Pure car-stat math — the single source for the garage's 0–10 star ratings and their inverse.
// No DOM, no Path2D, no imports: safe to run in the browser (garage display), in the author-time
// car generator (scripts/gen-cars.js), and in unit tests. config.js re-exports GU_TO_KMH from
// here so the speed conversion has ONE definition.
//
// A "drive" object is a car's physics bundle ({ maxSpeed, thrust, steer, lowSpeedTurn, ... }).
// Only those four fields affect the three displayed stars; the rest (grip, driftSteerBoost, …)
// are feel and don't move the bars.

// Speed conversion + rating scales. The scales sit above current values on purpose — headroom
// for future upgrades — so a maxed cosmetic/car doesn't peg every bar at 10.
export const GU_TO_KMH    = 0.023;   // game units/s → km/h (calibrated to real 1:64 models)
export const SPEED_MAX_KMH = 15;     // 10 bars = 15 km/h (physical limit of a 1:64 model)
export const STEER_MAX     = 5.0;    // max steer for the handling bar
export const LOWTURN_MAX   = 0.5;    // max lowSpeedTurn for the handling bar
export const THRUST_MAX    = 900;    // max thrust for the acceleration bar
export const MAX_RATING    = 10;

const clampRating = (n) => Math.max(0, Math.min(MAX_RATING, Math.round(n)));

// ── Ratings from a drive bundle (0..10) ───────────────────────────────────────
export const speedRating    = (d) => clampRating(d.maxSpeed * GU_TO_KMH / SPEED_MAX_KMH * 10);
export const accRating      = (d) => clampRating(d.thrust / THRUST_MAX * 10);
export const handlingRating = (d) =>
  clampRating((d.steer / STEER_MAX * 0.7 + d.lowSpeedTurn / LOWTURN_MAX * 0.3) * 10);

// ── Inverse: drive params that display the requested stars ─────────────────────
// Handling blends two knobs (steer 0.7 + lowSpeedTurn 0.3); tie both to the same fraction
// f = handling/10 so the weighted sum is exactly f and the bar reads back the same integer.
// speed/accel invert directly. Round-trips exactly for integer ratings 1..10.
export const driveForRatings = ({ handling = 5, accel = 5, speed = 5 }) => {
  const f = handling / 10;
  return {
    maxSpeed:     Math.round(speed * SPEED_MAX_KMH / (GU_TO_KMH * 10)),   // ← speedRating inverse
    thrust:       Math.round(accel * THRUST_MAX / 10),                    // ← accRating inverse
    steer:        +(f * STEER_MAX).toFixed(2),                            // ← handling (0.7 knob)
    lowSpeedTurn: +(f * LOWTURN_MAX).toFixed(3),                          // ← handling (0.3 knob)
  };
};
