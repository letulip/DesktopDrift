// Shared 6-zone neon-underglow renderer — the one place the glow is drawn, used by the game
// (js/render.js) and the garage preview (js/car-preview.js). Colour/intensity logic is the pure
// resolver in js/neon.js; this module only turns that into canvas draws. See docs/plans/neon.md.

import { zoneColors } from './neon.js';

// 6 perimeter zone geometries in CAR-LOCAL space (+x = nose, ±y = the two sides), clockwise:
//   0 front-left · 1 front-right · 2 right-side · 3 rear-right · 4 rear-left · 5 left-side.
// Ellipses hug the corners/sides so the glow reads as an underglow ring.
const zoneGeom = (hl, hw) => ([
  { x:  hl * 0.55, y: -hw * 0.80, rx: hl * 0.26, ry: hw * 0.60 }, // front-left
  { x:  hl * 0.55, y:  hw * 0.80, rx: hl * 0.26, ry: hw * 0.60 }, // front-right
  { x:  0,         y:  hw * 0.92, rx: hl * 0.42, ry: hw * 0.48 }, // right-side
  { x: -hl * 0.55, y:  hw * 0.80, rx: hl * 0.26, ry: hw * 0.60 }, // rear-right
  { x: -hl * 0.55, y: -hw * 0.80, rx: hl * 0.26, ry: hw * 0.60 }, // rear-left
  { x:  0,         y: -hw * 0.92, rx: hl * 0.42, ry: hw * 0.48 }, // left-side
]);

const BASE_BLUR = 20, BASE_ALPHA = 0.62;

// Draw the underglow for a neon config at time `t` (seconds). The caller must already be in
// car-local space (translated to the car centre, rotated so +x = nose). Batches zones that
// share a colour into ONE shadowBlur pass — solid = 1 pass; per-zone / animated = up to 6.
// `blurScale` compensates callers whose car is drawn larger (shadowBlur is device-px, not
// affected by ctx.scale) — the garage preview passes >1 so the glow stays proportional.
export const drawNeon = (ctx, hl, hw, neon, t = 0, blurScale = 1) => {
  if (!neon) return;
  const zc = zoneColors(neon, t);
  const intensity = zc[0].intensity;                 // uniform across zones for every animation
  const blur  = BASE_BLUR  * (0.55 + 0.45 * intensity) * blurScale;
  const alpha = BASE_ALPHA * (0.55 + 0.45 * intensity);
  const geom = zoneGeom(hl, hw);

  // group zone indices by resolved colour so same-colour zones fill in a single blur pass
  const byColour = new Map();
  zc.forEach((z, i) => {
    let arr = byColour.get(z.color);
    if (!arr) { arr = []; byColour.set(z.color, arr); }
    arr.push(i);
  });

  ctx.save();
  ctx.globalAlpha = alpha;
  for (const [color, idxs] of byColour) {
    ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.fillStyle = color;
    ctx.beginPath();
    for (const i of idxs) { const g = geom[i]; ctx.ellipse(g.x, g.y, g.rx, g.ry, 0, 0, Math.PI * 2); }
    ctx.fill();
  }
  ctx.restore();
};
