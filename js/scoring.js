// Pure drift scoring logic — no state, no side effects.
// Extracted from game-engine.js so it can be unit-tested (formulas were
// previously buried inside the startGame closure and unreachable). Behaviour is identical.
//
// Named constants replace magic numbers — these are the only combo balance knobs.
// To tune balance, change values here rather than hunting through the engine.

// Drift entry thresholds
export const DRIFT_MIN_SLIP  = 60;   // lateral speed |vS| above which a drift is counted
export const DRIFT_MIN_SPEED = 90;   // total speed below which no drift is registered

// Drift quality (slip/speed normalisation) and its ceiling
export const QUALITY_SLIP_REF  = 160;
export const QUALITY_SPEED_REF = 260;
export const QUALITY_MAX        = 1.4;

// Multiplier accumulation
export const MULT_GAIN_PER_S      = 0.14;  // multBuild growth per second of clean drift (× quality)
export const MULT_TRANSITION_BONUS = 0.3;  // multBuild bonus for a direction switch
export const MULT_NEARMISS_BONUS   = 0.28; // multBuild bonus for a near-miss
export const MULT_MAX              = 8;    // multiplier ceiling

// Slip sign threshold (for transition detection) and combo point rate
export const SLIP_SIGN_THRESHOLD = 50;
export const COMBO_RATE          = 0.0015; // slip × speed × dt × mult × COMBO_RATE

// Whether a drift is active at the given lateral / total speed.
export const isDrifting = (vS, speed) =>
  Math.abs(vS) > DRIFT_MIN_SLIP && speed > DRIFT_MIN_SPEED;

// Drift quality at this instant (0…QUALITY_MAX): higher slip and speed → higher quality.
export const driftQuality = (slip, speed) =>
  Math.min(QUALITY_MAX, (slip / QUALITY_SLIP_REF) * (speed / QUALITY_SPEED_REF));

// Final multiplier from accumulated multBuild (1…MULT_MAX).
export const comboMult = (multBuild) =>
  Math.min(MULT_MAX, 1 + multBuild);

// Combo points gained this frame.
export const comboGain = (slip, speed, dt, mult) =>
  slip * speed * dt * COMBO_RATE * mult;

// Slip sign: +1 / -1 / 0 (for transition detection and transition counter).
export const slipSign = (vS) =>
  vS > SLIP_SIGN_THRESHOLD ? 1 : (vS < -SLIP_SIGN_THRESHOLD ? -1 : 0);

// Efficiency metric: points per second (PPS).
// Denominator grows continuously — drifting in place collapses the metric.
export const pointsPerSecond = (score, totalTime) =>
  totalTime > 0 ? score / totalTime : 0;
