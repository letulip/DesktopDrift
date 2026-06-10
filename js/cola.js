// Cola-cap collectible — pure angle math, no imports, no state.

// Shortest signed angle from a → b, result in (-π, π].
export const angDelta = (a, b) => {
  let d = b - a;
  while (d >  Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

// Progress toward a full loop: |sweep| / 2π, clamped to [0, 1].
export const capProgress = (sweep) => Math.min(1, Math.abs(sweep) / (2 * Math.PI));

// Advance the sweep by one frame.
//   engaged  → accumulate signed angle delta
//   idle     → decay toward 0, never overshooting past it
//   dt       → frame delta seconds (only used for decay)
//   decay    → rad/s drain rate when idle
export const stepSweep = (sweep, prevAng, ang, engaged, dt, decay) => {
  if (engaged) return sweep + angDelta(prevAng, ang);
  if (sweep > 0) return Math.max(0, sweep - decay * dt);
  if (sweep < 0) return Math.min(0, sweep + decay * dt);
  return 0;
};
