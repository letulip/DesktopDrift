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
      cones.push({ x: outer[i].x, y: outer[i].y, vx: 0, vy: 0, ang: 0, spin: 0, knocked: false });
      outerAcc = 0;
    }
    if (i === 0 || innerAcc >= minSpacing) {
      cones.push({ x: inner[i].x, y: inner[i].y, vx: 0, vy: 0, ang: 0, spin: 0, knocked: false });
      innerAcc = 0;
    }
    outerAcc += Math.hypot(outer[next].x - outer[i].x, outer[next].y - outer[i].y);
    innerAcc += Math.hypot(inner[next].x - inner[i].x, inner[next].y - inner[i].y);
  }
  return cones;
};

// K checkpoints, evenly distributed by index along the centerline.
export const sampleCheckpoints = (center, K) => {
  const N = center.length, cps = [];
  for (let i = 0; i < K; i++) cps.push(center[Math.floor((i / K) * N)]);
  return cps;
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
