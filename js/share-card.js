// Browser-only: draws the share score card onto a canvas — the template PNG plus the dynamic
// layer (the player's actual car, PPS, DDK crown, stars, track + best lap). Layout numbers +
// pure helpers live in js/share-util.js; the car is rendered with the game's own drawCarPreview.
import { CARS } from './config.js';
import { drawCarPreview } from './car-preview.js';
import { preloadEmotion } from './emotion-overlay.js';
import { isOnePps } from './economy.js';
import { CARD, litStars } from './share-util.js';

// Template resolved from this module's URL so it works from any page. Cached after first load.
const TEMPLATE_URL = new URL('../share/template.png', import.meta.url).href;
let _tpl = null, _tplLoad = null;
export const loadTemplate = () => (_tplLoad ||= new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => { _tpl = img; res(img); };
  img.onerror = () => rej(new Error('share template failed to load'));
  img.src = TEMPLATE_URL;
}));

// Render the player's car (with its equipped look) to an offscreen canvas — same recipe as
// select.html's drawCard: override M.body, pass the look through drawCarPreview, then restore.
const renderCar = async (carModel, look) => {
  const c = document.createElement('canvas'); c.width = 560; c.height = 340;
  const M = CARS[Math.max(0, Math.min(carModel ?? 0, CARS.length - 1))];
  const orig = M.body;
  M.body = (look && look.bodyColor) || orig;
  const glass = (look && look.glassColor) || null, emotion = (look && look.expression) || null;
  const finish = (look && look.finish) || null, outline = (look && look.outlineColor) || null;
  // Await the emotion overlay before drawing — the canvas is read synchronously by carBBox().
  if (emotion) await preloadEmotion(M.id, emotion, M.body, glass, finish, outline);
  drawCarPreview(c, M, (look && (look.neon ?? (look.neonColor || null))) || null,
    finish, null, 0,   // no drift trail — the template already has baked skid marks
    glass, outline, emotion);
  M.body = orig;
  return c;
};

// Solid bounding box of the car (alpha>200 → body only, excludes the soft neon glow) so the body
// can be scaled to an exact on-card width regardless of which car / how much padding.
const carBBox = (c) => {
  const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 200) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};

const star = (ctx, cx, cy, r) => {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    const b = a + Math.PI / 5;
    ctx.lineTo(cx + Math.cos(b) * r * 0.45, cy + Math.sin(b) * r * 0.45);
  }
  ctx.closePath(); ctx.fill();
};

const crown = (ctx, cx, y, s) => {
  ctx.beginPath();
  ctx.moveTo(cx - s, y + s * 0.62); ctx.lineTo(cx - s, y); ctx.lineTo(cx - s * 0.42, y + s * 0.4);
  ctx.lineTo(cx, y - s * 0.15); ctx.lineTo(cx + s * 0.42, y + s * 0.4); ctx.lineTo(cx + s, y);
  ctx.lineTo(cx + s, y + s * 0.62); ctx.closePath(); ctx.fill();
  ctx.fillRect(cx - s, y + s * 0.62, s * 2, s * 0.24);
};

// Draw the full card. `data` = { pps, ddk, trackName, bestLap, carModel, look }. Async: waits for
// the display font + the template image. Sizes the canvas to the card and returns it.
export const renderShareCard = async (canvas, data) => {
  const { pps, ddk, isNewRecord, trackName, reversed, bestLap, carModel, look } = data;
  const onePps = isOnePps(pps);   // Participation Trophy — the 🏅 + "repeat it?" gag
  canvas.width = CARD.w; canvas.height = CARD.h;
  const ctx = canvas.getContext('2d');

  await document.fonts.load('800 100px Unbounded');
  const tpl = _tpl || await loadTemplate();
  const carC = await renderCar(carModel, look);

  ctx.clearRect(0, 0, CARD.w, CARD.h);
  ctx.drawImage(tpl, 0, 0, CARD.w, CARD.h);

  // Car — body scaled to CARD.car.bodyW wide (length proportional), rotated, with its RIGHT rear
  // corner anchored at (rearFromRight, rearFromBottom) from the edges.
  const bb = carBBox(carC), A = CARD.car.rot, sc = CARD.car.bodyW / bb.h, Len = bb.w * sc;
  const ax = CARD.w - CARD.car.rearFromRight, ay = CARD.h - CARD.car.rearFromBottom;
  const rot = (x, y) => [x * Math.cos(A) - y * Math.sin(A), x * Math.sin(A) + y * Math.cos(A)];
  const c1 = rot(-Len / 2, CARD.car.bodyW / 2), c2 = rot(-Len / 2, -CARD.car.bodyW / 2);
  const corner = c1[0] >= c2[0] ? c1 : c2;   // pick the RIGHT rear corner
  ctx.save(); ctx.translate(ax - corner[0], ay - corner[1]); ctx.rotate(A);
  ctx.drawImage(carC, -bb.cx * sc, -bb.cy * sc, carC.width * sc, carC.height * sc);
  ctx.restore();

  // Score + PPS label (soft shadow so text lifts off the green).
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const num = Math.round(pps || 0).toLocaleString();
  ctx.font = `800 ${CARD.score.numSize}px Unbounded`; ctx.fillStyle = CARD.score.color;
  ctx.fillText(num, CARD.score.x, CARD.score.baseY);
  const ppsX = CARD.score.x + ctx.measureText(num).width + CARD.score.gap;
  ctx.font = `800 ${CARD.score.ppsSize}px Unbounded`; ctx.fillStyle = CARD.score.ppsColor;
  ctx.fillText('PPS', ppsX, CARD.score.baseY);
  const ppsW = ctx.measureText('PPS').width;
  ctx.restore();

  // DDK crown over the PPS label (600+ PPS) — or the Participation Trophy 🏅 at exactly 1 PPS. The two
  // are mutually exclusive (1 vs 600+), so they share the spot above the PPS label.
  if (ddk) { ctx.fillStyle = CARD.crown.color; crown(ctx, ppsX + ppsW / 2, CARD.score.baseY - CARD.score.ppsSize + CARD.crown.dy, CARD.crown.size / 2); }
  else if (onePps) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `${CARD.medal.size}px sans-serif`;
    ctx.fillText('🏅', ppsX + ppsW / 2, CARD.score.baseY - CARD.score.ppsSize + CARD.medal.dy);
    ctx.restore();
  }

  // Stars — 5, lit by score.
  const lit = litStars(pps);
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i < lit ? CARD.stars.color : CARD.stars.dimColor; star(ctx, CARD.stars.x + CARD.stars.size + i * CARD.stars.gap, CARD.stars.y, CARD.stars.size); }

  // Track label + name (auto-shrunk to fit) + best lap.
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = CARD.track.labelColor; ctx.font = `800 ${CARD.track.labelSize}px system-ui`;
  ctx.fillText('T R A C K', CARD.track.x, CARD.track.labelY);
  ctx.fillStyle = CARD.track.nameColor;
  const name = (trackName || '') + (reversed ? ' ↺' : '');   // reversed → round arrow, like the track card
  let ns = CARD.track.nameSize; ctx.font = `800 ${ns}px Unbounded`;
  const nw = ctx.measureText(name).width;
  if (nw > CARD.track.maxW) { ns = ns * CARD.track.maxW / nw; ctx.font = `800 ${ns}px Unbounded`; }   // safety only; base names fit at full size
  ctx.fillText(name, CARD.track.x, CARD.track.nameY);
  ctx.fillStyle = CARD.track.lapColor; ctx.font = `700 ${CARD.track.lapSize}px system-ui`;
  ctx.fillText(bestLap != null ? `Best lap ${bestLap.toFixed(2)} s` : '', CARD.track.x, CARD.h - CARD.track.lapFromBottom);
  ctx.restore();

  // NEW RECORD badge (top-right pill) — only on a personal best.
  if (isNewRecord) {
    const nr = CARD.newRecord;
    ctx.save();
    ctx.font = `800 ${nr.size}px Unbounded`; ctx.letterSpacing = `${nr.spacing}px`;
    const label = 'NEW RECORD', tw = ctx.measureText(label).width;
    const pillW = tw + nr.padX * 2, pillH = nr.size + nr.padY * 2;
    const right = CARD.w - nr.fromRight, left = right - pillW, top = nr.cy - pillH / 2;
    ctx.strokeStyle = nr.color; ctx.lineWidth = 3;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(left, top, pillW, pillH, nr.radius);
    else ctx.rect(left, top, pillW, pillH);   // pre-Safari 16.4 / Chrome 99: square pill beats a thrown share
    ctx.stroke();
    ctx.fillStyle = nr.color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, left + nr.padX, nr.cy + 1);
    ctx.restore();
  }

  // Hook (bottom-left, italic) — "Can you repeat it?" on a 1-PPS Participation Trophy, else "Can you beat it?".
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = CARD.hook.color; ctx.font = `italic 800 ${CARD.hook.size}px Unbounded`;
  ctx.fillText(onePps ? 'Can you repeat it?' : 'Can you beat it?', CARD.hook.x, CARD.h - CARD.hook.fromBottom);
  ctx.restore();

  return canvas;
};
