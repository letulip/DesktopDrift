import { CARS, TABLE } from './config.js';
import { car, S } from './state.js';

// --- Canvas ---
export const canvas = document.getElementById('c');
export const ctx    = canvas.getContext('2d');
const miniEl = document.getElementById('mini');
const mctx   = miniEl.getContext('2d');

export let W, H, DPR;
export const resize = () => {
  // Cap at 1.5 instead of 2: ~1.78× fewer fragment ops on DPR=2 devices;
  // on DPR=3 (iPhone / Android flagships) it also gives a sharper result
  // (2× exact upscale vs the 1.5× non-integer upscale of cap=2).
  // Visual difference is imperceptible for flat vector content in motion.
  DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize); resize();

// --- Colour theme (set via initRender from T.theme) ---
// Default = dining-oak scheme, so old tracks don't break.
const THEME_DEFAULT = {
  background: '#0f0b08',
  table:      '#2e241a',
  tableEdge:  '#5a4a36',
  track:      '#43372a',
  skid:       'rgba(15,9,6,1)',
  checkpoint: 'rgba(125,212,255,0.5)', // not used directly in render — replaced by universal colour
  cone:       '#ff7a1a',
};
let TH = THEME_DEFAULT;
let _skidRgb = '15,9,6'; // RGB portion of TH.skid; re-parsed in initRender

// --- Track data ---
// Single reference to the track module — set once by initRender, read by all draw functions.
// draw() / drawMini() / drawCaps() destructure what they need at call time rather than
// maintaining their own copies, so there is only one source of truth.
let _T   = null;
let MINI = null;

// Effective table dimensions for this session — set from T.TABLE in initRender.
// Kept separately so we never mutate the shared TABLE singleton from config.js.
let _TABLE = null;

// Session-specific car paint: garage body colour and neon colour.
// Written by setCarPaint() (called from game-engine after carModel is resolved),
// read by draw() — never written back to the CARS descriptor.
let _carBody = null;
let _carNeon = null;
export const setCarPaint = (body, neon) => { _carBody = body ?? null; _carNeon = neon ?? null; };
// Static geometry cache: built once in initRender, not rebuilt every frame
// (previously draw() re-traced ~830 lineTo calls for the edges, drawMini ~416).
let trackPath = null, miniTrackPath = null;

// Standing-cone cache: three Path2Ds (shadow / body / highlight).
// Rebuilt only when a cone is knocked — typically a handful of times per game,
// not every frame. Knocked cones are few and dynamic; they are drawn individually.
let _conesShadow = null, _conesBody = null, _conesHighlight = null;
let _coneKnockedCount = 0;  // number of knocked cones when paths were last built

// Build three Path2Ds for standing cones (called from initRender and on each knock event).
// Reads _T directly — must be called after _T is assigned.
// Each arc is preceded by moveTo at its natural start point (cx+r, cy) so that
// Canvas begins a fresh subpath instead of drawing a connecting line from the
// previous arc's end. Without moveTo, 166 circles become one giant connected
// polygon that fills the entire enclosed area — causing solid visual artifacts.
const _buildStandingCones = () => {
  const { cones, CONE_R } = _T;
  _conesShadow    = new Path2D();
  _conesBody      = new Path2D();
  _conesHighlight = new Path2D();
  for (const c of cones) {
    if (c.knocked) continue;
    _conesShadow.moveTo(c.x + 2 + CONE_R, c.y + 2);
    _conesShadow.arc(c.x + 2, c.y + 2, CONE_R, 0, Math.PI * 2);
    _conesBody.moveTo(c.x + CONE_R, c.y);
    _conesBody.arc(c.x, c.y, CONE_R, 0, Math.PI * 2);
    _conesHighlight.moveTo(c.x - 1 + CONE_R * 0.35, c.y - 1);
    _conesHighlight.arc(c.x - 1, c.y - 1, CONE_R * 0.35, 0, Math.PI * 2);
  }
};

// Called from game-engine.js before the game starts
export const initRender = (T) => {
  _T = T; // single source of truth — draw functions access track fields via _T
  // Effective table dimensions: use the track's own TABLE, fall back to the config default.
  // Never mutate the shared TABLE singleton from config.js.
  _TABLE = T.TABLE ?? TABLE;
  // Colour theme: T.theme overrides the default (dependency injection, same pattern as TABLE)
  TH = T.theme ? { ...THEME_DEFAULT, ...T.theme } : THEME_DEFAULT;
  const _sm = TH.skid.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  _skidRgb = _sm ? `${_sm[1]},${_sm[2]},${_sm[3]}` : '15,9,6';

  // Minimap: world → window transform
  const _pad = 12;
  let _ex = 0, _ey = 0;
  for (const o of T.outer) { _ex = Math.max(_ex, Math.abs(o.x)); _ey = Math.max(_ey, Math.abs(o.y)); }
  const _ms = Math.min((miniEl.width - _pad * 2) / (2 * _ex), (miniEl.height - _pad * 2) / (2 * _ey));
  MINI = {
    s:  _ms,
    X: x => miniEl.width  / 2 + x * _ms,
    Y: y => miniEl.height / 2 + y * _ms,
  };

  // Track polygon (outer + reversed inner, evenodd fill) — one Path2D per game session.
  trackPath = new Path2D();
  trackPath.moveTo(T.outer[0].x, T.outer[0].y);
  for (let i = 1; i < T.outer.length; i++) trackPath.lineTo(T.outer[i].x, T.outer[i].y);
  trackPath.closePath();
  const innerRev = T.inner.slice().reverse();
  trackPath.moveTo(innerRev[0].x, innerRev[0].y);
  for (let i = 1; i < innerRev.length; i++) trackPath.lineTo(innerRev[i].x, innerRev[i].y);
  trackPath.closePath();

  // Track centreline for minimap (pixel coords) — also static.
  miniTrackPath = new Path2D();
  miniTrackPath.moveTo(MINI.X(T.center[0].x), MINI.Y(T.center[0].y));
  for (let i = 1; i < T.center.length; i++) miniTrackPath.lineTo(MINI.X(T.center[i].x), MINI.Y(T.center[i].y));
  miniTrackPath.closePath();

  // Standing-cone paths: all cones are upright at game start.
  _coneKnockedCount = 0;
  _buildStandingCones();
}

// --- Helper primitives ---
// Skid marks: instead of one fillRect per mark (up to 1500/frame) we batch into
// SKID_LEVELS Path2D buckets by alpha level — a few fill() calls instead of ≤1500.
// Alpha is quantised to 6 levels — visually indistinguishable from the original gradient.
const SKID_LEVELS = 6;
const drawSkids = () => {
  if (!S.skids.length) return;
  const paths = [];
  for (let i = 0; i < SKID_LEVELS; i++) paths.push(new Path2D());
  for (const sk of S.skids) {
    let b = (sk.a * 10) | 0;            // a∈[0,0.6] → bucket 0..6
    if (b > SKID_LEVELS - 1) b = SKID_LEVELS - 1;
    paths[b].rect(sk.x - 3, sk.y - 3, 6, 6);
  }
  for (let i = 0; i < SKID_LEVELS; i++) {
    ctx.fillStyle = `rgba(${_skidRgb},${(i + 0.5) * 0.1})`;
    ctx.fill(paths[i]);
  }
};
const rrect = (x, y, w, h, r) => {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
const capPath = (hl, r) => {
  ctx.beginPath();
  ctx.moveTo(-hl, -r);
  ctx.lineTo(hl, -r);
  ctx.arc(hl, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-hl, r);
  ctx.arc(-hl, 0, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
}

// Car top-down view (nose along +X)
const drawCar = (M) => {
  if (M.path) {
    const s = M.len / M.vw;
    ctx.save();
    ctx.scale(M.flip ? -s : s, s);
    ctx.translate(-M.vw / 2, -M.vh / 2);
    ctx.fillStyle = _carBody ?? M.body; ctx.fill(M._p2d);
    if (M.details) for (const d of M.details) { ctx.fillStyle = d.c; ctx.fill(d._p2d); }
    ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = M.stroke;
    ctx.stroke(M._p2d);
    if (M._lines) for (const lp of M._lines) ctx.stroke(lp);
    ctx.restore();
    return;
  }
  const hl = M.len / 2, hw = M.wid / 2;
  ctx.fillStyle = _carBody ?? M.body; rrect(-hl, -hw, M.len, M.wid, hw * 0.7); ctx.fill();
  ctx.strokeStyle = M.accent; ctx.lineWidth = 1.5; rrect(-hl + 2, -hw + 2, M.len - 4, M.wid - 4, hw * 0.6); ctx.stroke();
  ctx.fillStyle = M.glass; rrect(-hl * 0.5, -hw * 0.82, hl * 0.78, hw * 1.64, hw * 0.45); ctx.fill();
  ctx.fillStyle = M.roof; rrect(-hl * 0.34, -hw * 0.66, hl * 0.46, hw * 1.32, hw * 0.4); ctx.fill();
  ctx.fillStyle = M.head;
  rrect(hl * 0.8, -hw * 0.72, hl * 0.09, hw * 0.42, 2); ctx.fill();
  rrect(hl * 0.8,  hw * 0.30, hl * 0.09, hw * 0.42, 2); ctx.fill();
  ctx.fillStyle = M.tail;
  rrect(-hl * 0.9, -hw * 0.72, hl * 0.06, hw * 0.42, 2); ctx.fill();
  rrect(-hl * 0.9,  hw * 0.30, hl * 0.06, hw * 0.42, 2); ctx.fill();
}

// Pre-load SVG images for props (called once from game-engine.js at startup)
export const initItems = (propList) => {
  for (const o of propList) {
    if (!o.imgSrc) continue;
    const img = new Image();
    img.onload  = () => { o.img = img; };
    img.onerror = () => { /* fall back to procedural render */ };
    img.src = o.imgSrc;
  }
}

// Prop on the table
const drawProp = (o) => {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  if (o.hl > 0) {
    ctx.save(); ctx.rotate(o.ang); ctx.translate(6, 8); capPath(o.hl, o.r); ctx.fill(); ctx.restore();
  } else {
    ctx.beginPath(); ctx.ellipse(6, 8, o.r * 1.03, o.r * 0.97, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.rotate(o.ang);

  // SVG image from items/ (if loaded).
  // Portrait SVGs (height > width) are saved vertically — long axis = Y in the file.
  // The capsule collider is horizontal (long axis = X after ctx.rotate).
  // π/2 rotation + fw/fh swap aligns the visual with physics for portrait SVGs.
  // Landscape SVGs (width >= height) are drawn directly — long axis is already horizontal.
  if (o.img) {
    const fw = o.hl > 0 ? (o.hl + o.r) * 2 : o.r * 2;
    const fh = o.r * 2;
    if (o.img.naturalHeight > o.img.naturalWidth) {
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(o.img, -fh / 2, -fw / 2, fh, fw);
    } else {
      ctx.drawImage(o.img, -fw / 2, -fh / 2, fw, fh);
    }
    ctx.restore();
    return;
  }

  if (o.kind === 'plate' || o.kind === 'saucer') {
    ctx.fillStyle = o.c; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, o.r * 0.82, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, o.r * 0.55, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(-o.r * 0.28, -o.r * 0.28, o.r * 0.16, 0, Math.PI * 2); ctx.fill();
  } else if (o.kind === 'bowl') {
    ctx.fillStyle = o.c; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.arc(0, 0, o.r * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(-o.r * 0.22, -o.r * 0.22, o.r * 0.2, 0, Math.PI * 2); ctx.fill();
  } else if (o.kind === 'board') {
    ctx.fillStyle = o.c; capPath(o.hl, o.r); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 4; capPath(o.hl, o.r); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-o.hl + 14, i * o.r * 0.32); ctx.lineTo(o.hl - 14, i * o.r * 0.32); ctx.stroke(); }
  } else if (o.kind === 'knife') {
    ctx.fillStyle = o.c;
    ctx.beginPath(); ctx.moveTo(-o.hl * 0.1, -o.r); ctx.lineTo(o.hl, -o.r * 0.2); ctx.lineTo(o.hl, o.r * 0.2); ctx.lineTo(-o.hl * 0.1, o.r); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#3a3a3a';
    ctx.save(); ctx.translate(-o.hl * 0.55, 0); capPath(o.hl * 0.45, o.r * 0.95); ctx.fill(); ctx.restore();
  } else if (o.kind === 'spoon') {
    ctx.strokeStyle = o.c; ctx.lineWidth = o.r * 0.42; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-o.hl, 0); ctx.lineTo(o.hl * 0.3, 0); ctx.stroke();
    ctx.fillStyle = o.c; ctx.beginPath(); ctx.ellipse(o.hl * 0.55, 0, o.r * 0.9, o.r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(o.hl * 0.55, 0, o.r * 0.6, o.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  } else if (o.kind === 'fork') {
    ctx.strokeStyle = o.c; ctx.lineWidth = o.r * 0.7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-o.hl, 0); ctx.lineTo(o.hl * 0.4, 0); ctx.stroke();
    ctx.lineWidth = o.r * 0.22;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(o.hl * 0.4, i * o.r * 0.6); ctx.lineTo(o.hl, i * o.r * 0.6); ctx.stroke(); }
  }
  ctx.restore();
}

// Cola cap collectibles
const drawCaps = () => {
  const collectibles = _T.collectibles ?? [];
  for (let i = 0; i < collectibles.length; i++) {
    const state = S.caps[i];
    if (!state) continue;
    const desc = collectibles[i];
    const { x, y, r, _img, _imgFull, c } = desc;
    const { sweep, collected, pop } = state;

    ctx.save();
    ctx.translate(x, y);

    // Pop burst — expanding ring that fades out after collection
    // pop counts down from 0.6 → 0 (matches game-engine cap.pop init value)
    if (collected && pop > 0) {
      const t = 1 - pop / 0.6;                   // 0 → 1 as burst plays out
      ctx.globalAlpha = (1 - t) * 0.75;
      ctx.strokeStyle = '#cc2200';
      ctx.lineWidth   = 3;
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur  = 12;
      ctx.beginPath(); ctx.arc(0, 0, r * (1.4 + t * 1.6), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha  = 1;
      ctx.shadowBlur   = 0;
      ctx.shadowColor  = 'transparent';
    }

    // Base image (empty cap) or fallback circle
    const baseImg = collected ? (_imgFull ?? _img) : _img;
    if (baseImg?.complete && baseImg.naturalWidth > 0) {
      ctx.drawImage(baseImg, -r, -r, r * 2, r * 2);
    } else {
      ctx.fillStyle = c ?? '#ff9999';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }

    // Red fill overlay — wedge clip on the cap itself, fills clockwise from top.
    // Skipped when collected and a filled image is available (it speaks for itself).
    // collected without imgFull = always full red; otherwise proportional to |sweep| / 2π.
    const progress = (collected && _imgFull) ? 0 : collected ? 1 : Math.min(1, Math.abs(sweep) / (Math.PI * 4)); // 2 loops
    if (progress > 0) {
      const sweepAng = progress * Math.PI * 2;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + sweepAng);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle   = '#cc2200';
      ctx.globalAlpha = collected ? 0.88 : 0.72;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
};

// --- Main render ---
export const draw = (speed) => {
  const { center, cones, props, checkpoints, TRACK_HALF, CONE_R, CP_R, startAngle } = _T;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  const camOffY = H * 0.10;
  // On narrow screens (mobile) zoom out — shows ~1.5× more of the track.
  // Only change this number: 0.65 = 1.5× more visible, 1.0 = no scaling.
  const ZOOM = W < 640 ? 0.65 : 1.0;
  ctx.translate(W / 2, H / 2 + camOffY);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-car.x, -car.y);

  // floor — covers the entire visible world rectangle with a small margin
  ctx.fillStyle = TH.background;
  ctx.fillRect(car.x - W / (2 * ZOOM), car.y - (H / 2 + camOffY) / ZOOM, W / ZOOM, H / ZOOM);

  // table
  ctx.fillStyle = TH.table;
  if (_TABLE.shape === 'round') {
    ctx.beginPath(); ctx.ellipse(0, 0, _TABLE.w / 2, _TABLE.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = TH.tableEdge; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.ellipse(0, 0, _TABLE.w / 2, _TABLE.h / 2, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.fillRect(-_TABLE.w / 2, -_TABLE.h / 2, _TABLE.w, _TABLE.h);
    ctx.strokeStyle = TH.tableEdge; ctx.lineWidth = 12;
    ctx.strokeRect(-_TABLE.w / 2, -_TABLE.h / 2, _TABLE.w, _TABLE.h);
  }

  // track surface (cached Path2D — no path rebuild every frame)
  ctx.fillStyle = TH.track;
  ctx.fill(trackPath, 'evenodd');

  // skid marks — batched by alpha level (a few fill() calls instead of ≤1500 fillRect/frame)
  drawSkids();

  // start/finish — chequered flag (2 rows × N cells across the track)
  {
    const c0 = center[0];
    const cell = 10; // cell size in game units
    const rows = 2;  // depth along the track
    const cols = Math.ceil(TRACK_HALF * 2 / cell); // number of cells across
    ctx.save();
    ctx.translate(c0.x, c0.y);
    ctx.rotate(startAngle); // X = direction of travel, Y = across the track
    // Chequered flag — always black/white regardless of track theme.
    // Universal racing symbol; no startLine field needed in the theme.
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.82)';
        ctx.fillRect(
          -rows * cell / 2 + r * cell, // along the track
          -TRACK_HALF + c * cell,       // across the track
          cell, cell
        );
      }
    }
    ctx.restore();
  }

  // next checkpoint (intermediate only — finish is already visualised by the chequered flag)
  // Double-stroke for contrast on both dark and light tracks: a wider dark ring drawn
  // first peeks out 2 px on each side of the cyan stroke — no shadowBlur needed.
  // shadowBlur forces a separate raster buffer + Gaussian pass; double-stroke is free.
  if (!S.zen && S.nextCp !== 0) {
    const cp = checkpoints[S.nextCp];
    ctx.beginPath(); ctx.arc(cp.x, cp.y, CP_R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = '#7dd4ff';           ctx.lineWidth = 5; ctx.stroke();
  }

  // props
  for (const o of props) drawProp(o);

  // cola cap collectibles
  drawCaps();

  // cones — standing batch (3 fill() calls total) + per-cone draw for knocked ones
  {
    // Rebuild standing-cone paths if any cone was newly knocked this frame.
    let knockedNow = 0;
    for (const c of cones) if (c.knocked) knockedNow++;
    if (knockedNow !== _coneKnockedCount) {
      _buildStandingCones();
      _coneKnockedCount = knockedNow;
    }

    // All standing cones: 3 fill() calls instead of (N × 3) beginPath/arc/fill.
    ctx.fillStyle = 'rgba(0,0,0,0.2)';       ctx.fill(_conesShadow);
    ctx.fillStyle = TH.cone;                  ctx.fill(_conesBody);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(_conesHighlight);

    // Knocked cones: few and dynamic — drawn individually every frame.
    for (const c of cones) {
      if (!c.knocked) continue;
      // Trapezoid (cone on its side) + white reflective stripe.
      // save/translate/rotate needed — shape is oriented by c.ang.
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.ang);

      const h     = CONE_R * 3;     // length of the lying cone
      const rBase = CONE_R;         // half-radius at the base (wide end)
      const rTip  = CONE_R * 0.25; // half-radius at the tip (narrow end)

      // Shadow — same trapezoid shifted (+2, +2)
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.moveTo(-h/2 + 2, -rBase + 2); ctx.lineTo(h/2 + 2, -rTip + 2);
      ctx.lineTo( h/2 + 2,  rTip  + 2); ctx.lineTo(-h/2 + 2, rBase + 2);
      ctx.closePath(); ctx.fill();

      // Cone body
      ctx.fillStyle = TH.cone;
      ctx.beginPath();
      ctx.moveTo(-h/2, -rBase); ctx.lineTo(h/2, -rTip);
      ctx.lineTo( h/2,  rTip);  ctx.lineTo(-h/2,  rBase);
      ctx.closePath(); ctx.fill();

      // White stripe: 70% of cone width at each x — guaranteed inside the body
      const x0 = -h * 0.05, w0 = (rBase + (rTip - rBase) * ((x0 + h/2) / h)) * 0.7;
      const x1 =  h * 0.22, w1 = (rBase + (rTip - rBase) * ((x1 + h/2) / h)) * 0.7;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(x0, -w0); ctx.lineTo(x1, -w1);
      ctx.lineTo(x1,  w1); ctx.lineTo(x0,  w0);
      ctx.closePath(); ctx.fill();

      ctx.restore();
    }
  }

  // car
  ctx.save();
  ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  const M = CARS[S.carModel];
  // drop-shadow suppressed when neon is active (they look wrong together)
  if (!_carNeon) {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(-M.len / 2 + 2, -M.wid / 2 + 3, M.len, M.wid, M.wid * 0.7); ctx.fill();
  }

  const wlen = M.len * 0.16, wwid = Math.max(4, M.wid * 0.20);
  const reveal = Math.abs(S.steerSmooth), wheelAng = S.steerSmooth * 0.5;
  const wAlpha = Math.min(1, reveal * 1.6);
  if (wAlpha > 0.02) {
    ctx.fillStyle = `rgba(13,14,16,${wAlpha})`;
    const track = M.wid * 0.42;
    for (const sy of [-1, 1]) {
      ctx.save();
      ctx.translate(M.len * 0.30, sy * track); ctx.rotate(wheelAng);
      rrect(-wlen / 2, -wwid / 2, wlen, wwid, 2); ctx.fill();
      ctx.restore();
    }
  }
  // neon underglow — drawn before the body so it sits underneath the car.
  // Three segments: nose→front axle | between axles | rear axle→tail
  if (_carNeon) {
    ctx.save();
    ctx.shadowColor = _carNeon;
    ctx.shadowBlur  = 22;
    ctx.globalAlpha = 0.65;
    ctx.fillStyle   = _carNeon;

    const hl     = M.len / 2;
    const carWid = M.wid ?? (M.vh * M.len / M.vw); // path-based cars don't have M.wid
    const gH     = carWid * 0.70;
    const ghy    = -gH / 2;
    // segments: 3% nose | 15.5% wheel gap | 58% between axles | 15.5% wheel gap | 8% tail
    const s1 = M.len * 0.03, s2 = M.len * 0.58, s3 = M.len * 0.08;
    const gp = M.len * 0.155;  // gap width per wheel

    const ei = M.len * 0.02;  // inset from tips — block doesn't reach the car edge
    ctx.beginPath();
    ctx.rect(hl - s1,           ghy, s1 - ei, gH);  // nose (inset from tip)
    ctx.rect(hl - s1 - gp - s2, ghy, s2,      gH);  // between axles (main segment)
    ctx.rect(-hl + ei,          ghy, s3 - ei,  gH);  // tail (inset from tip)
    ctx.fill();

    ctx.restore();
  }
  drawCar(M);
  ctx.restore();
  ctx.restore();

  // HUD
  document.getElementById('lap').textContent = S.lapTime.toFixed(2);
  document.getElementById('lapNum').textContent = S.lapNum + 1;
  document.getElementById('last').textContent = S.lastLap === null ? '—' : S.lastLap.toFixed(2) + ' s';
  document.getElementById('best').textContent = S.bestLap === null ? '—' : S.bestLap.toFixed(2) + ' s';
  document.getElementById('score').textContent = Math.round(S.score);
  document.getElementById('lapScores').innerHTML =
    S.lapScores.slice().reverse().map(l => 'lap ' + l.n + ': +' + l.pts).join('<br>');
  document.getElementById('spd').textContent = speed.toFixed(1);

  const comboEl = document.getElementById('combo');
  if (S.comboPoints > 0) { comboEl.style.opacity = 1; comboEl.textContent = '+' + Math.round(S.comboPoints) + '   ×' + S.mult.toFixed(1); }
  else comboEl.style.opacity = 0;

  const flashEl = document.getElementById('flash');
  flashEl.style.opacity = Math.max(0, S.flashT / 0.9);
  flashEl.style.color = S.flashColor;
  flashEl.textContent = S.flashMsg;

  const countEl = document.getElementById('count');
  if (S.startCd > 0) { countEl.style.opacity = 1; countEl.style.color = '#fff'; countEl.textContent = Math.ceil(S.startCd); }
  else if (S.goT > 0) { countEl.style.opacity = Math.min(1, S.goT / 0.4); countEl.style.color = '#9dff8f'; countEl.textContent = 'GO!'; }
  else countEl.style.opacity = 0;

  drawMini();
}

export const drawMini = () => {
  const { props, TRACK_HALF } = _T;
  mctx.clearRect(0, 0, miniEl.width, miniEl.height);
  mctx.lineJoin = mctx.lineCap = 'round';
  mctx.strokeStyle = 'rgba(255,255,255,.22)';
  mctx.lineWidth = Math.max(3, TRACK_HALF * 2 * MINI.s);
  mctx.stroke(miniTrackPath);
  mctx.fillStyle = 'rgba(255,255,255,.45)';
  for (const o of props) { mctx.beginPath(); mctx.arc(MINI.X(o.x), MINI.Y(o.y), Math.max(1.5, o.r * MINI.s), 0, Math.PI * 2); mctx.fill(); }
  const cx = MINI.X(car.x), cy = MINI.Y(car.y);
  mctx.save();
  mctx.translate(cx, cy); mctx.rotate(car.angle);
  mctx.fillStyle = '#ff5a3c';
  mctx.beginPath(); mctx.moveTo(6, 0); mctx.lineTo(-4, -4); mctx.lineTo(-4, 4); mctx.closePath(); mctx.fill();
  mctx.restore();
}
