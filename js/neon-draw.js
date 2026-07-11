// Shared 6-zone neon-underglow renderer — the one place the glow is drawn, used by the game
// (js/render.js) and the garage preview (js/car-preview.js). Colour/intensity logic is the pure
// resolver in js/neon.js; this module only turns that into canvas draws. See docs/plans/neon.md.

import { zoneColors } from './neon.js';

// 6 zone geometries in CAR-LOCAL space (+x = nose), as RECTS that sit UNDER the car body so
// only the blurred glow shows (no hard fill sticking past the car). Keeps the original
// underglow distribution: along the length nose 3% · wheel-gap 15.5% · mid 58% · wheel-gap
// 15.5% · tail 8% (inset 2% from the tips); across the width a 70% band split top/bottom into
// the two sides. Clockwise: 0 front-left · 1 front-right · 2 right-side · 3 rear-right ·
// 4 rear-left · 5 left-side (top = left, bottom = right).
const zoneGeom = (hl, hw) => {
  const len = hl * 2;
  const s1 = len * 0.03, s2 = len * 0.58, s3 = len * 0.08, gp = len * 0.155, ei = len * 0.02;
  const bh = hw * 0.70;                                   // band half-height; split at y = 0
  const noseX = hl - s1,           noseW = s1 - ei;       // near the front tip
  const midX  = hl - s1 - gp - s2, midW  = s2;            // between the axles
  const tailX = -hl + ei,          tailW = s3 - ei;       // near the rear tip
  return [
    { x: noseX, y: -bh, w: noseW, h: bh }, // 0 front-left  (top half)
    { x: noseX, y:  0,  w: noseW, h: bh }, // 1 front-right (bottom half)
    { x: midX,  y:  0,  w: midW,  h: bh }, // 2 right-side  (bottom)
    { x: tailX, y:  0,  w: tailW, h: bh }, // 3 rear-right  (bottom)
    { x: tailX, y: -bh, w: tailW, h: bh }, // 4 rear-left   (top)
    { x: midX,  y: -bh, w: midW,  h: bh }, // 5 left-side   (top)
  ];
};

const BASE_BLUR = 22, BASE_ALPHA = 0.65;

// Draw the underglow for a neon config at time `t` (seconds). The caller must already be in
// car-local space (translated to the car centre, rotated so +x = nose) and draw the CAR BODY
// AFTER this (the rect fills sit under the body; only the shadow-blur glow shows). Batches
// zones that share a colour into ONE shadowBlur pass — solid = 1 pass; per-zone / animated
// up to 6. `blurScale` compensates callers whose car is drawn larger (shadowBlur is device-px,
// unaffected by ctx.scale) — the garage preview passes >1 so the glow stays proportional.
// `alphaScale` brightens the glow for callers that need it more visible (the shop preview
// passes >1 so the underglow reads clearly on a small card); clamped so alpha never exceeds 1.
export const drawNeon = (ctx, hl, hw, neon, t = 0, blurScale = 1, alphaScale = 1) => {
  if (!neon) return;
  const zc = zoneColors(neon, t);
  const intensity = zc[0].intensity;                 // uniform across zones for every animation
  const blur  = BASE_BLUR  * (0.55 + 0.45 * intensity) * blurScale;
  const alpha = Math.min(1, BASE_ALPHA * (0.55 + 0.45 * intensity) * alphaScale);
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
    for (const i of idxs) { const g = geom[i]; ctx.rect(g.x, g.y, g.w, g.h); }
    ctx.fill();
  }
  ctx.restore();
};
