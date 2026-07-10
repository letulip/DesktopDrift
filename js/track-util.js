// Pure geometric helpers for track construction — no state, no side effects, no browser APIs.
// Previously these loops were duplicated in track.js / track-workdesk.js (and partly
// track-oval.js) — now a single source of truth that can be unit-tested.

// Parse SVG path d: supports M, L, H, V, Z (absolute coordinates only).
// Returns an array of pairs [[x, y], ...].
// Consolidated from track modules and tracks.html — was three identical copies.
//
// Deduplicates the closing vertex: track SVGs commonly end with an explicit
// "L start_x start_y Z" which makes the last parsed point equal to the first.
// That zero-length closing edge produces 2^n coincident Chaikin points (n=passes),
// destabilising the tangent normal and displacing the inner/outer edges near
// start/finish.  Drop the duplicate if dist(first, last) < 0.5 SVG units.
export const parseSvgPath = (d) => {
  const pts = [];
  const tokens = d.match(/[MLHVZmlhvz]|[-+]?[0-9]*\.?[0-9]+/g) || [];
  let i = 0, cmd = '', x = 0, y = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[MLHVZmlhvz]/.test(t)) { cmd = t; i++; continue; }
    const v = parseFloat(t);
    if (cmd === 'M' || cmd === 'L') {
      x = v; y = parseFloat(tokens[++i]); i++;
      pts.push([x, y]);
    } else if (cmd === 'H') { x = v; i++; pts.push([x, y]); }
    else if (cmd === 'V')   { y = v; i++; pts.push([x, y]); }
    else i++;
  }
  // Remove duplicate closing vertex (explicit "L back-to-start Z" pattern).
  if (pts.length > 1) {
    const [f, l] = [pts[0], pts[pts.length - 1]];
    if (Math.hypot(l[0] - f[0], l[1] - f[1]) < 0.5) pts.pop();
  }
  return pts;
};

// Chaikin corner-cutting — one pass (call multiple times for smoother result).
// n points → 2n points. Closed contour (last connects back to first).
export const chaikin = (pts) => {
  const n = pts.length, r = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    r.push({ x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25 });
    r.push({ x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75 });
  }
  return r;
};

// Builds { center, outer, inner } from a centerline: outer and inner edges are offset
// by `half` along the perpendicular to the tangent (computed from neighbouring points).
// center holds the same point references as centerPts (as in the original track.js).
//
// On hairpins the naive ±half offset inverts when the local radius of curvature R < half
// (inner edge crosses the centre of curvature → self-intersecting loop).  This function
// estimates R as the circumradius of the (prev, curr, next) triangle and clamps the inner
// offset to min(half, R − minInnerGap) so the inner edge stays on the correct side.
// The outer offset is never clamped — outer radius R+half is always > half.
//
// minInnerGap: minimum distance from the estimated centre of curvature to the inner edge.
// Default 10 GU keeps the inner arc open without noticeably shrinking the track.
export const offsetEdges = (centerPts, half, minInnerGap = 10) => {
  const center = [], outer = [], inner = [];
  const N = centerPts.length;
  for (let i = 0; i < N; i++) {
    const c    = centerPts[i];
    const prev = centerPts[(i - 1 + N) % N];
    const next = centerPts[(i + 1) % N];
    const tx   = next.x - prev.x, ty = next.y - prev.y;
    const len  = Math.hypot(tx, ty) || 1;
    const nx   = -ty / len, ny = tx / len; // left-hand normal

    // Circumradius of the prev–curr–next triangle ≈ local radius of curvature.
    // Formula: R = (|AB|·|BC|·|CA|) / (2·|area|).  Collinear → R = ∞ (straight).
    const ax = prev.x - c.x, ay = prev.y - c.y;
    const bx = next.x - c.x, by = next.y - c.y;
    const cross = ax * by - ay * bx;           // 2 × signed triangle area
    const R = cross === 0 ? Infinity
      : (Math.hypot(ax, ay) * Math.hypot(bx, by) * Math.hypot(ax - bx, ay - by))
        / (2 * Math.abs(cross));
    // Clamp inner offset: never let the inner point pass the centre of curvature.
    const innerHalf = Math.min(half, Math.max(R - minInnerGap, minInnerGap));

    center.push(c);
    outer.push({ x: c.x + nx * half,      y: c.y + ny * half });
    inner.push({ x: c.x - nx * innerHalf, y: c.y - ny * innerHalf });
  }
  return { center, outer, inner };
};

// Places cones along outer and inner edges at equal arc-length intervals.
// minSpacing: minimum world-unit distance between consecutive cones on each edge.
// Each edge uses its own accumulator, so outer and inner are sampled independently.
// In a corner the outer arc is longer (larger radius) → outer receives proportionally
// more cones, eliminating the large gaps that appeared when both edges were driven by
// a single shared accumulator (symmetric pairing).  On straights outer ≈ inner so the
// two edges remain roughly aligned.  Arc-length sampling also avoids Chaikin-corner
// crowding — the old index-step approach gave gaps up to ~1750 GU on straights.
export const placeCones = (outer, inner, minSpacing = 160) => {
  const cones = [];
  const N = outer.length;
  let outerAcc = 0, innerAcc = 0;
  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    if (i === 0 || outerAcc >= minSpacing) {
      cones.push({ x: outer[i].x, y: outer[i].y, vx: 0, vy: 0, ang: 0, spin: 0, knocked: false, ci: i });
      outerAcc = 0;
    }
    if (i === 0 || innerAcc >= minSpacing) {
      cones.push({ x: inner[i].x, y: inner[i].y, vx: 0, vy: 0, ang: 0, spin: 0, knocked: false, ci: i });
      innerAcc = 0;
    }
    outerAcc += Math.hypot(outer[next].x - outer[i].x, outer[next].y - outer[i].y);
    innerAcc += Math.hypot(inner[next].x - inner[i].x, inner[next].y - inner[i].y);
  }
  return cones;
};

// Drop cones that a self-intersection pushed into the middle of the track. An edge cone
// belongs to centreline index `ci`; it legitimately hugs the centreline points NEAR ci
// (within `indexWindow`). If a cone also lands within ~half of a FAR-AWAY centreline point,
// it is sitting inside another lane at a crossing → remove it. Non-self-crossing tracks lose
// nothing (their edges are never near a non-adjacent part of the loop). Pure.
export const filterConesOnTrack = (cones, center, half, indexWindow = 24) => {
  const N = center.length;
  const g2 = half * half;   // within a full track-half of a foreign centreline = on that lane
  return cones.filter(cone => {
    for (let j = 0; j < N; j++) {
      let d = Math.abs(j - cone.ci);
      if (d > N / 2) d = N - d;                 // circular index distance
      if (d <= indexWindow) continue;           // the cone's own neighbourhood — expected to be near
      const dx = center[j].x - cone.x, dy = center[j].y - cone.y;
      if (dx * dx + dy * dy < g2) return false; // inside a non-adjacent lane → on the track
    }
    return true;
  });
};

// K checkpoints, evenly distributed by index along the centerline.
export const sampleCheckpoints = (center, K) => {
  const N = center.length, cps = [];
  for (let i = 0; i < K; i++) cps.push(center[Math.floor((i / K) * N)]);
  return cps;
};

// K checkpoints biased toward corners.
// Sectors are defined by equal ARC LENGTH (not equal index count) so that
// Chaikin-dense corners — which accumulate far more index points than straights
// per unit of track distance — cannot consume multiple sectors and cluster
// checkpoints, while leaving long straights uncovered.
// Within each arc-length sector the point with highest curvature (circumradius
// formula) is chosen as the checkpoint; falls back to the index-midpoint of the
// sector on pure straights (cross product = 0 everywhere in sector).
//
// Post-processing guarantees:
//  1. checkpoints[0] = center[0] always — finish-line detection (game-engine.js)
//     uses checkpoints[0] as the reference point; it must match the visual
//     chequered flag which render.js always draws at center[0].
//  2. Minimum arc-length spacing of totalLen/K/2 between consecutive checkpoints.
//     A 180° hairpin spanning two sectors places curvature peaks at both the entry
//     and exit; the later checkpoint is pushed to its sector's index-midpoint so
//     the two no longer cluster at the hairpin endpoints.
export const sampleCheckpointsByCorner = (center, K) => {
  const N = center.length;

  // arc[i] = cumulative distance from center[0] to center[i].
  // The closing edge (center[N-1] → center[0]) is added to totalLen so every
  // sector covers an equal share of the full loop distance.
  const arc = [0];
  for (let i = 1; i < N; i++)
    arc.push(arc[i - 1] + Math.hypot(center[i].x - center[i - 1].x, center[i].y - center[i - 1].y));
  const totalLen = arc[N - 1] + Math.hypot(center[0].x - center[N - 1].x, center[0].y - center[N - 1].y);

  const cpIdxs  = [];
  const midIdxs = [];

  for (let i = 0; i < K; i++) {
    const loLen = (i / K) * totalLen;
    const hiLen = ((i + 1) / K) * totalLen;

    // lo = first index whose arc-length position falls at or past loLen
    let lo = 0;
    while (lo < N - 1 && arc[lo + 1] <= loLen) lo++;
    // hi = first index past hiLen (exclusive upper bound)
    let hi = lo + 1;
    while (hi < N && arc[hi] < hiLen) hi++;

    const midIdx = Math.floor((lo + hi) / 2);
    midIdxs.push(midIdx);

    let bestIdx = midIdx;
    let bestCurv = -1;
    for (let j = lo; j < hi; j++) {
      const prev = center[(j - 1 + N) % N];
      const c    = center[j];
      const next = center[(j + 1) % N];
      const ax = prev.x - c.x, ay = prev.y - c.y;
      const bx = next.x - c.x, by = next.y - c.y;
      const cross = Math.abs(ax * by - ay * bx);
      if (cross === 0) continue;
      const R = (Math.hypot(ax, ay) * Math.hypot(bx, by) * Math.hypot(ax - bx, ay - by))
                / (2 * cross);
      const curv = 1 / R;
      if (curv > bestCurv) { bestCurv = curv; bestIdx = j; }
    }
    cpIdxs.push(bestIdx);
  }

  // Post-process 1: anchor checkpoint[0] at center[0] (the finish line).
  cpIdxs[0] = 0;

  // Post-process 2: enforce minimum arc-length gap between consecutive checkpoints.
  const minGap = totalLen / K / 2;
  for (let i = 1; i < K; i++) {
    const gap = (arc[cpIdxs[i]] - arc[cpIdxs[i - 1]] + totalLen) % totalLen;
    if (gap < minGap) cpIdxs[i] = midIdxs[i];
  }
  // Also check the wrap-around gap from cps[K-1] back to cps[0].
  if ((totalLen - arc[cpIdxs[K - 1]]) % totalLen < minGap) cpIdxs[K - 1] = midIdxs[K - 1];

  // Post-process 3: split oversized gaps so no long straight is left un-checkpointed (e.g. a
  // big finish→first-corner run). Any gap above 1.5× the average sector length gets evenly
  // spaced intermediate checkpoints at its arc-midpoints. Returns >K points for such tracks —
  // the engine cycles on checkpoints.length, not K.
  const maxGap = (totalLen / K) * 1.5;
  const idxAtArc = (len) => {                         // nearest centre index at arc-length len
    const t = ((len % totalLen) + totalLen) % totalLen;
    let lo = 0;
    while (lo < N - 1 && arc[lo + 1] < t) lo++;
    return lo;
  };
  const finalIdxs = [];
  for (let i = 0; i < K; i++) {
    finalIdxs.push(cpIdxs[i]);
    const a = arc[cpIdxs[i]];
    const gap = (arc[cpIdxs[(i + 1) % K]] - a + totalLen) % totalLen;
    const nInsert = Math.floor(gap / maxGap);
    for (let k = 1; k <= nInsert; k++) finalIdxs.push(idxAtArc(a + gap * k / (nInsert + 1)));
  }

  return finalIdxs.map(idx => center[idx]);
};

// SVG track file text → smoothed game-world centreline points (Array of {x,y}).
// Reads the `track_path` element and derives the game origin from the SVG viewBox
// automatically, so callers don't need to know the viewBox dimensions.
// scale: game units per SVG unit; 0.25 matches the standard stroke-width 800 convention
//        (TRACK_HALF 100 = 800/2 × 0.25).
// Returns null when the SVG has no track_path element.
export const svgToCentreline = (svgText, scale = 0.25) => {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const d   = doc.getElementById('track_path')?.getAttribute('d');
  if (!d) return null;
  const vb    = doc.querySelector('svg').getAttribute('viewBox').trim().split(/\s+/).map(Number);
  const svgCx = vb[2] / 2, svgCy = vb[3] / 2;
  let pts = parseSvgPath(d).map(([x, y]) => ({ x: (x - svgCx) * scale, y: -(y - svgCy) * scale }));
  for (let i = 0; i < 4; i++) pts = chaikin(pts);
  return pts;
};

// Prepares a prop descriptor for render/physics: defaults hl to 0, caches cos/sin of angle.
// Mutates and returns the same object (like the old addProp).
export const prepProp = (o) => {
  o.hl   = o.hl || 0;
  o._cos = Math.cos(o.ang);
  o._sin = Math.sin(o.ang);
  return o;
};

// Windowed nearest-centerline scan — O(2·window+1) instead of O(N).
// The car moves at most a few GU per frame, so searching ±window around the
// previous nearest index always finds the true nearest (window=24 covers ~50 GU
// at typical frame rates, car max speed is well below that).
// Returns { dist, idx }: idx is the new nearest index (caller stores it for the
// next frame); dist is the Euclidean distance to that centerline point.
export const nearestCenter = (carX, carY, center, prevIdx, window = 24) => {
  const N = center.length;
  let best = Infinity, bi = prevIdx;
  for (let k = -window; k <= window; k++) {
    const i = (((prevIdx + k) % N) + N) % N;
    const dx = carX - center[i].x, dy = carY - center[i].y;
    const d = dx * dx + dy * dy;
    if (d < best) { best = d; bi = i; }
  }
  return { dist: Math.sqrt(best), idx: bi };
};

// Returns the forward advancement from ref to idx on a circular track of N points.
// Values > N/2 are treated as backward movement and return 0.
export const circularAdvance = (idx, ref, N) => {
  const d = (idx - ref + N) % N;
  return d <= N / 2 ? d : 0;
};

// Persistence key for a track instance: the bare track id for forward, `${id}:rev` for
// reversed. One key for records, tire/cap pickups, cleared-flag and first-clear (Phase D2).
export const instanceId = (trackId, reversed) => (reversed ? `${trackId}:rev` : trackId);

// Reverse a parsed track — drive the same circuit the other way (economy Phase D2).
// Pure: returns a new object, the input is not mutated. center/inner/outer are reversed
// in lockstep, then checkpoints/startPos/startAngle are recomputed from the reversed
// centreline so the existing finish + checkpoint logic works unchanged. Everything else
// (cones, props, collectibles, TABLE, theme, laps, id) is carried over as-is.
// Note: inner/outer are reversed but intentionally NOT swapped — left/right flip when you
// drive the other way, but render builds the road as an even-odd polygon (see render.js)
// and collision treats it as a band, so the drivable surface is identical either direction.
export const reverseTrack = (T) => {
  const center = T.center.slice().reverse();
  const inner  = T.inner.slice().reverse();
  const outer  = T.outer.slice().reverse();
  const K = T.K ?? 8;
  const checkpoints = sampleCheckpointsByCorner(center, K);
  const c0 = center[0], c1 = center[1] ?? center[0];
  return {
    ...T,
    center, inner, outer, checkpoints,
    startPos:   { x: c0.x, y: c0.y },
    startAngle: Math.atan2(c1.y - c0.y, c1.x - c0.x),
    reversed:   true,
  };
};
