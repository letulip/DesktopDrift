// Pure neon-underglow resolver — no DOM, no state. Turns a saved neon config + a time value
// into the per-zone colour + glow intensity the renderer draws. Shared by the game render
// (js/render.js) and the garage preview (js/car-preview.js) so there is one source of truth;
// fully unit-testable without a canvas. See docs/plans/neon.md.
//
// 6 zones, CLOCKWISE — the ring order the flow / rainbow animations rotate through:
//   0 front-left · 1 front-right · 2 right-side · 3 rear-right · 4 rear-left · 5 left-side

export const NEON_ZONES = 6;

// Layout descriptors — how many distinct colours a layout uses, and (via ZONE_MAP) how those
// colours map onto the 6 zones. `colours` drives how many pickers the garage UI shows.
export const LAYOUTS = [
  { id: 'solid',           label: 'Solid',             colours: 1 },
  { id: 'longitudinal',    label: 'Left / Right',      colours: 2 },
  { id: 'front-mid-rear',  label: 'Front / Mid / Rear', colours: 3 },
  { id: 'per-zone',        label: 'Per-zone',          colours: 6 },
];

export const ANIMS = [
  { id: 'none',    label: 'Static'        },
  { id: 'pulse',   label: 'Pulse'         },
  { id: 'rainbow', label: 'Rainbow'       },
  { id: 'flow',    label: 'Circular Flow' },
];

// Animation rates (× the config `speed`). Tuned to match the concept demo.
const PULSE_RATE  = 2.4;   // rad/s for the breathe
const RAINBOW_DEG = 70;    // hue degrees/s
const FLOW_REV    = 0.22;  // ring revolutions/s

const DEFAULT_COLOUR = '#39FF14';

// zone index → which colour slot it takes, per layout (each array is length 6, clockwise).
const ZONE_MAP = {
  solid:            [0, 0, 0, 0, 0, 0],
  longitudinal:     [0, 1, 1, 1, 0, 0],   // left trio {0,4,5}=A · right trio {1,2,3}=B
  'front-mid-rear': [0, 0, 1, 2, 2, 1],   // front {0,1}=A · sides {2,5}=B · rear {3,4}=C
  'per-zone':       [0, 1, 2, 3, 4, 5],
};

const _colours = (cols) => (Array.isArray(cols) && cols.length ? cols : [DEFAULT_COLOUR]);

// Resolve the 6 static base colours for a layout (before any animation).
export const layoutColours = (layout, colours) => {
  const map = ZONE_MAP[layout] ?? ZONE_MAP.solid;
  const c = _colours(colours);
  return map.map(ci => c[ci] ?? c[c.length - 1] ?? DEFAULT_COLOUR);
};

// ── Colour helpers ────────────────────────────────────────────────────────────
const _hex = (h) => {
  const s = String(h).replace('#', '');
  const n = s.length === 3 ? s.split('').map(x => x + x).join('') : s.padEnd(6, '0').slice(0, 6);
  const v = parseInt(n, 16) || 0;
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const _rgb = (r, g, b) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
const _mix = (c1, c2, t) => {
  const a = _hex(c1), b = _hex(c2);
  return _rgb(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
};
// Sample a smooth blend of the 6 base colours around the ring at position `pos` (revolutions).
const _ringSample = (base, pos) => {
  const p = (((pos % 1) + 1) % 1) * 6;   // 0..6
  const i = Math.floor(p);
  return _mix(base[i % 6], base[(i + 1) % 6], p - i);
};

// ── The resolver ────────────────────────────────────────────────────────────────
// Returns an array of 6 { color, intensity } (clockwise, zone order above). `intensity` is
// 0..1 (1 for everything except `pulse`, which breathes) — the renderer scales blur/alpha by
// it. `color` is any canvas-valid string (hex / rgb() / hsl()). Pure; `t` is seconds.
export const zoneColors = (neon, t = 0) => {
  const layout = neon?.layout ?? 'solid';
  const anim   = neon?.anim   ?? 'none';
  const speed  = neon?.speed  ?? 1;
  const base   = layoutColours(layout, neon?.colors);

  if (anim === 'pulse') {
    const intensity = 0.5 + 0.5 * Math.sin(t * speed * PULSE_RATE);
    return base.map(color => ({ color, intensity }));
  }
  if (anim === 'rainbow') {
    const spin = t * speed * RAINBOW_DEG;
    return base.map((_, i) => ({ color: `hsl(${(((i * 60 + spin) % 360) + 360) % 360} 100% 55%)`, intensity: 1 }));
  }
  if (anim === 'flow') {
    const phase = t * speed * FLOW_REV;
    return base.map((_, i) => ({ color: _ringSample(base, i / 6 - phase), intensity: 1 }));
  }
  return base.map(color => ({ color, intensity: 1 }));   // none / static
};

// A fresh default neon config (solid, static, one colour). Used by the store default.
export const defaultNeon = (colour = DEFAULT_COLOUR) => ({ layout: 'solid', anim: 'none', colors: [colour], speed: 1 });
