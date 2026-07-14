// Shared top-down car preview renderer — used by the garage (select.html) and the
// modify screen (modify.html). Pure drawing: it only touches the canvas it is given.
// Internal coordinates use the canvas's own width/height, so callers control the
// resolution (small cards vs a large modify preview) via the canvas size.
// Paints the equipped finish + parses the trail colour via shared helpers.
import { paintBody, hexToRgbStr } from './finish.js';
import { drawNeon } from './neon-draw.js';
import { defaultNeon } from './neon.js';
import { preloadEmotion, getEmotionBitmap } from './emotion-overlay.js';

export const CANVAS_W = 240;   // default card resolution (taller than the car so the neon fits)
export const CANVAS_H = 140;

// Neon glow spread, as a multiple of the car draw-scale `s`, so the underglow stays proportional
// to the car on any canvas size / DPR. 4.5 reproduces the previously-tuned flat blurScale of 2.1
// at the stock card scale (s ≈ 0.465); retina cards / the bigger modify + share previews draw the
// car larger, and the glow now scales with it instead of staying a fixed thin rim.
const NEON_SPREAD = 4.5;

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

// Draw car model M onto canvas `cvs`, optionally with a neon underglow (a neon CONFIG object
// { layout, anim, colors, speed } — or a legacy colour string, or null), a paint finish
// (matte/metallic/pearl/chrome), and a trail colour (a fading drift trail behind the car).
// `phase` (seconds) animates both the trail and any neon animation. null disables each.
export const drawCarPreview = (cvs, M, neon = null, finish = null, trail = null, phase = 0, glass = null, outline = null, emotion = null) => {
  const W = cvs.width, H = cvs.height;
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  // Proportional padding leaves air around the car so the neon underglow isn't
  // clipped at the canvas edge (≈12% on the big modify preview, a little on cards).
  const pad = Math.min(W, H) * 0.15;
  const fit = Math.min((W - pad * 2) / M.vw, (H - pad * 2) / M.vh);
  // With a trail, shrink the car a touch and shift it right to make room behind it.
  const s  = trail ? fit * 0.86 : fit;
  const cx = trail ? W * 0.58 : W / 2;
  const cy = H / 2;

  if (trail) drawTrail(ctx, trail, cx, cy, s, M, phase);

  // Neon underglow via the shared 6-zone renderer. Drawn in DEVICE space (shadowBlur is device-px,
  // unaffected by ctx.scale) at the car centre, with the car half-size scaled by `s`. The glow
  // spread (blurScale) is tied to `s` too — otherwise a DPR-inflated or larger canvas keeps it a
  // fixed pixel width and it shrinks to a thin rim relative to the bigger car. Brighter (1.45) than
  // in-race. A legacy colour string is wrapped as a solid config; a config object is used as-is.
  const neonCfg = typeof neon === 'string' ? defaultNeon(neon) : (neon || null);
  if (neonCfg) {
    ctx.save();
    ctx.translate(cx, cy);
    if (M.flip) ctx.scale(-1, 1);   // mirror front/rear zones to match a flipped body
    drawNeon(ctx, (M.vw / 2) * s, (M.vh / 2) * s, neonCfg, phase, s * NEON_SPREAD, 1.45);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(M.flip ? -s : s, s);
  ctx.translate(-M.vw / 2, -M.vh / 2);
  paintBody(ctx, M._p2d, M.body, finish, M.vw, M.vh);
  ctx.lineJoin   = 'round';
  // Scale-aware so the outline is a constant ~2.5 device px regardless of preview size — a fixed
  // lineWidth looked fat on the big modify preview (scaled up) and thin on the small carousel cards.
  ctx.lineWidth  = 2.5 / s;
  ctx.strokeStyle = outline || M.stroke;   // equipped outline colour (or stock #222222)
  ctx.stroke(M._p2d);
  if (M._lines) for (const lp of M._lines) ctx.stroke(lp);
  // Details (windows, headlights, tail-lights) go on TOP of the outline + panel lines so
  // edge-hugging lights aren't buried under the 5px body stroke or a panel-line stroke.
  // Glass tint recolours the dark #222222 window details (also recolours dark trim — same fill).
  if (M.details) for (const d of M.details) { ctx.fillStyle = (glass && d.c === '#222222') ? glass : d.c; ctx.fill(d._p2d); }
  ctx.restore();

  // Moods: equipped emotion face over the car, in canvas space (no flip — art is final-oriented). The
  // overlay bitmap is async; inline preload warms it and one-shot previews repaint via onEmotionReady.
  if (emotion) {
    preloadEmotion(M.id, emotion, M.body, glass, finish, outline);
    const emo = getEmotionBitmap(M.id, emotion, M.body, glass, finish, outline);
    if (emo) ctx.drawImage(emo, cx - s * M.vw / 2, cy - s * M.vh / 2, s * M.vw, s * M.vh);
  }
};
