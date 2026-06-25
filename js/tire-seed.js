// Pure tire placement — no imports, no state, no DOM.
//
// Scatters `n` tire pickups along a closed centerline, evenly spaced by arc length.
// On straights a tire sits on the racing line (easy "flow" income); on corners it is
// pushed toward the INNER (concave) edge — proportional to how sharp the corner is — so
// the greedy line is harder to hold. Deterministic: same track + n → same positions
// (positions double as the persistent `capId`, so they must be stable).
//
// `center` / `inner` / `outer` are the parallel arrays from track-util `offsetEdges`,
// where `outer = center + leftNormal·HALF` and `inner = center − leftNormal·HALF`
// (nominal left/right, NOT curvature-aware). On a left turn (cross > 0) the concave side
// is `outer`; on a right turn, `inner`.

const CURVE_GAIN = 2.2;   // |sinθ| → offset fraction (steeper corner = bigger offset)
const MAX_FRAC   = 0.65;  // cap: never push past 65% of the way to the inner edge
const WINDOW     = 6;     // points each side used to estimate the local tangent

export const seedTires = (center, inner, outer, n) => {
  const N = center.length;
  if (!N || n <= 0) return [];

  // Cumulative arc length around the closed loop.
  const cum = new Array(N + 1);
  cum[0] = 0;
  for (let i = 0; i < N; i++) {
    const a = center[i], b = center[(i + 1) % N];
    cum[i + 1] = cum[i] + Math.hypot(b.x - a.x, b.y - a.y);
  }
  const total = cum[N];

  const out = [];
  for (let k = 0; k < n; k++) {
    const targetArc = (k + 0.5) * total / n;        // half-offset so none sits on the start line
    // Find the centerline index nearest that arc position.
    let i = 0;
    while (i < N && cum[i + 1] < targetArc) i++;
    if (i >= N) i = N - 1;

    // Local turn: signed sine of the angle between the in- and out-tangents.
    const p  = center[i];
    const a  = center[(i - WINDOW + N) % N];
    const b  = center[(i + WINDOW) % N];
    const t1x = p.x - a.x, t1y = p.y - a.y;
    const t2x = b.x - p.x, t2y = b.y - p.y;
    const m1 = Math.hypot(t1x, t1y) || 1, m2 = Math.hypot(t2x, t2y) || 1;
    const sinT = (t1x * t2y - t1y * t2x) / (m1 * m2);   // >0 left turn, <0 right turn

    const frac = Math.min(MAX_FRAC, Math.abs(sinT) * CURVE_GAIN);
    const edge = sinT > 0 ? outer[i] : inner[i];        // concave (inner-of-corner) side
    const x = p.x + (edge.x - p.x) * frac;
    const y = p.y + (edge.y - p.y) * frac;
    out.push({ x: Math.round(x), y: Math.round(y) });
  }
  return out;
};
