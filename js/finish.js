// Cosmetic paint finishes + colour helpers (shop Phase B4).
// `paintBody` fills the car body and overlays a subtle per-finish sheen; the pure
// colour helper is unit-tested. Used by render.js (game) and car-preview.js (garage).

export const FINISHES = ['matte', 'metallic', 'pearl', 'chrome'];

// "#RRGGBB" → "r,g,b" (for building rgba() skid/trail strings). null/invalid → null.
export const hexToRgbStr = (hex) => {
  if (typeof hex !== 'string') return null;
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

// Fill `path` with the `base` colour, then overlay a subtle finish sheen clipped to
// the path. `finish` ∈ FINISHES, or null/'' for the plain factory look. vw/vh = the
// path's local viewBox size (the car points along x; y runs across the body).
export const paintBody = (ctx, path, base, finish, vw, vh) => {
  ctx.fillStyle = base;
  ctx.fill(path);
  if (!finish) return;

  ctx.save();
  ctx.clip(path);
  if (finish === 'matte') {
    // Flatten: a faint uniform darken reads as a non-glossy matte coat.
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(0, 0, vw, vh);
  } else if (finish === 'pearl') {
    // Colour-shifting sheen along the length (white → tinted).
    const g = ctx.createLinearGradient(0, 0, vw, 0);
    g.addColorStop(0,   'rgba(255,255,255,0.20)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    g.addColorStop(1,   'rgba(170,200,255,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
  } else {
    // metallic / chrome: cylindrical highlight across the body (edges dark, centre bright).
    const chrome = finish === 'chrome';
    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0,   `rgba(0,0,0,${chrome ? 0.30 : 0.18})`);
    g.addColorStop(0.5, `rgba(255,255,255,${chrome ? 0.48 : 0.24})`);
    g.addColorStop(1,   `rgba(0,0,0,${chrome ? 0.30 : 0.18})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
  }
  ctx.restore();
};
