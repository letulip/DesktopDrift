// Shared top-down car preview renderer — used by the garage (select.html) and the
// modify screen (modify.html). Pure drawing: it only touches the canvas it is given.
// Internal coordinates use the canvas's own width/height, so callers control the
// resolution (small cards vs a large modify preview) via the canvas size.
// Paints the equipped finish + parses the trail colour via shared helpers.
import { paintBody, hexToRgbStr } from './finish.js';

export const CANVAS_W = 220;   // default card resolution
export const CANVAS_H = 82;

// Two fading rows of skid marks streaming out behind the car (rear = its left edge),
// drawn in canvas pixels. `phase` (seconds) scrolls them so the trail flows / lives.
const drawTrail = (ctx, color, cx, cy, s, M, phase) => {
  const rgb     = hexToRgbStr(color) || '255,255,255';
  const halfLen = (M.vw / 2) * s;
  const rearX   = cx - halfLen + 6 * s;     // start just inside the rear bumper
  const dy      = M.vh * 0.36 * s;          // tracks sit out near the car's edges (its width)
  const mw      = M.vh * 0.10 * s;          // mark length (along travel)
  const mh      = M.vh * 0.14 * s;          // mark width — a chunky tyre tread, not a thin dot
  const gap     = mw * 1.6;
  const MARKS   = 24;
  const scroll  = (phase * 28) % gap;       // flow away from the car (~28 px/s)
  for (const ty of [cy - dy, cy + dy]) {
    for (let i = 0; i < MARKS; i++) {
      const x = rearX - i * gap - scroll;
      if (x < 3) break;                      // ran off the left edge
      const a = (1 - (rearX - x) / (MARKS * gap)) * 0.5;    // fade with distance
      if (a <= 0) continue;
      ctx.fillStyle = `rgba(${rgb},${a})`;
      ctx.fillRect(x - mw / 2, ty - mh / 2, mw, mh);
    }
  }
};

// Draw car model M onto canvas `cvs`, optionally with a neon underglow colour, a paint
// finish (matte/metallic/pearl/chrome), and a trail colour (a fading drift trail behind
// the car — `phase` animates it). null disables each.
export const drawCarPreview = (cvs, M, neonColor = null, finish = null, trail = null, phase = 0) => {
  const W = cvs.width, H = cvs.height;
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  // Proportional padding leaves air around the car so the neon underglow isn't
  // clipped at the canvas edge (≈12% on the big modify preview, a little on cards).
  const pad = Math.min(W, H) * 0.12;
  const fit = Math.min((W - pad * 2) / M.vw, (H - pad * 2) / M.vh);
  // With a trail, shrink the car a touch and shift it right to make room behind it.
  const s  = trail ? fit * 0.86 : fit;
  const cx = trail ? W * 0.58 : W / 2;
  const cy = H / 2;

  if (trail) drawTrail(ctx, trail, cx, cy, s, M, phase);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(M.flip ? -s : s, s);
  ctx.translate(-M.vw / 2, -M.vh / 2);
  // Neon glow — three segments: nose→front axle | between axles | rear axle→tail.
  // 3% end | 15.5% wheel gap | 58% between axles | 15.5% wheel gap | 8% end
  // Drawn in path coordinates (after scale+translate), before the car body.
  if (neonColor) {
    const glowH = M.vh * 0.78;
    const gy    = (M.vh - glowH) / 2;
    const s1p = M.vw * 0.03, s2p = M.vw * 0.58, s3p = M.vw * 0.08;
    const gpp = M.vw * 0.155;  // gap per wheel

    ctx.shadowColor = neonColor;
    ctx.shadowBlur  = 42;      // wide spread + full-strength fill so the underglow pops
    ctx.globalAlpha = 1;
    ctx.fillStyle   = neonColor;

    const ei_p = M.vw * 0.02;  // inset from path tips
    ctx.beginPath();
    ctx.rect(ei_p,         gy, s1p - ei_p, glowH);  // end 1 (inset from tip)
    ctx.rect(s1p + gpp,    gy, s2p,        glowH);  // between axles
    ctx.rect(M.vw - s3p,   gy, s3p - ei_p, glowH);  // end 2 (inset from tip)
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';
  }
  paintBody(ctx, M._p2d, M.body, finish, M.vw, M.vh);
  if (M.details) for (const d of M.details) { ctx.fillStyle = d.c; ctx.fill(d._p2d); }
  ctx.lineJoin   = 'round';
  ctx.lineWidth  = 5;
  ctx.strokeStyle = M.stroke;
  ctx.stroke(M._p2d);
  if (M._lines) for (const lp of M._lines) ctx.stroke(lp);
  ctx.restore();
};
