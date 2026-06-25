// Shared top-down car preview renderer — used by the garage (select.html) and the
// modify screen (modify.html). Pure drawing: it only touches the canvas it is given.
// Internal coordinates use the canvas's own width/height, so callers control the
// resolution (small cards vs a large modify preview) via the canvas size.
// Paints the equipped finish via the shared paintBody helper.
import { paintBody } from './finish.js';

export const CANVAS_W = 220;   // default card resolution
export const CANVAS_H = 82;

// Draw car model M onto canvas `cvs`, optionally with a neon underglow colour and
// a paint finish (matte/metallic/pearl/chrome or null for the plain look).
export const drawCarPreview = (cvs, M, neonColor = null, finish = null) => {
  const W = cvs.width, H = cvs.height;
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  // Proportional padding leaves air around the car so the neon underglow isn't
  // clipped at the canvas edge (≈12% on the big modify preview, a little on cards).
  const pad = Math.min(W, H) * 0.12;
  const sc  = Math.min((W - pad * 2) / M.vw, (H - pad * 2) / M.vh);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(M.flip ? -sc : sc, sc);
  ctx.translate(-M.vw / 2, -M.vh / 2);
  // Neon glow — three segments: nose→front axle | between axles | rear axle→tail.
  // 3% end | 15.5% wheel gap | 58% between axles | 15.5% wheel gap | 8% end
  // Drawn in path coordinates (after scale+translate), before the car body.
  if (neonColor) {
    const glowH = M.vh * 0.70;
    const gy    = (M.vh - glowH) / 2;
    const s1p = M.vw * 0.03, s2p = M.vw * 0.58, s3p = M.vw * 0.08;
    const gpp = M.vw * 0.155;  // gap per wheel

    ctx.shadowColor = neonColor;
    ctx.shadowBlur  = 18;
    ctx.globalAlpha = 0.65;
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
