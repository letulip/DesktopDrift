import { TABLE } from './config.js';
import { placeCones, prepProp } from './track-util.js';

export const TRACK_HALF = 100;

const centerAt = (a) => {
  const R = 1100 + 215 * Math.sin(3 * a) + 170 * Math.sin(4 * a);
  return { x: R * Math.cos(a) * 1.15, y: R * Math.sin(a) * 0.94 };
};
const tangentAt = (a) => {
  const e = 0.001;
  const p1 = centerAt(a - e), p2 = centerAt(a + e);
  let tx = p2.x - p1.x, ty = p2.y - p1.y;
  const len = Math.hypot(tx, ty) || 1;
  return { x: tx / len, y: ty / len };
}

const SAMPLES = 300;
export const center = [], outer = [], inner = [];
for (let i = 0; i < SAMPLES; i++) {
  const a = (i / SAMPLES) * Math.PI * 2;
  const c = centerAt(a), t = tangentAt(a);
  const nx = -t.y, ny = t.x;
  center.push(c);
  outer.push({ x: c.x + nx * TRACK_HALF, y: c.y + ny * TRACK_HALF });
  inner.push({ x: c.x - nx * TRACK_HALF, y: c.y - ny * TRACK_HALF });
}

// Cones along the edges
export const CONE_R = 9;
export const cones = placeCones(outer, inner, 5);

// Props on the table
const distToTrackPoint = (x, y) => {
  let best = Infinity;
  for (const c of center) { const dx = x - c.x, dy = y - c.y; const d = dx * dx + dy * dy; if (d < best) best = d; }
  return Math.sqrt(best);
}
export const props = [];
const addProp = (o) => { props.push(prepProp(o)); }
// 1) Round tableware in the track pockets
const DISHES = [
  { kind: 'plate',  c: '#e6ebf0' },
  { kind: 'bowl',   c: '#3a6ea5' },
  { kind: 'saucer', c: '#ead9bf' },
  { kind: 'plate',  c: '#f0c419' }
];
{
  const rad = center.map(c => Math.hypot(c.x, c.y));
  const apex = [];
  for (let i = 0; i < SAMPLES; i++) {
    const p = rad[(i - 1 + SAMPLES) % SAMPLES], n = rad[(i + 1) % SAMPLES];
    if (rad[i] < p && rad[i] <= n) apex.push(i);
  }
  let di = 0;
  for (const i of apex) {
    const c = center[i], r = rad[i];
    const dirx = c.x / r, diry = c.y / r;
    const innerEdge = r - TRACK_HALF;
    const objR = Math.max(110, Math.min(240, innerEdge * 0.33));
    const cd = innerEdge - objR - 34;
    if (cd < objR * 0.4) continue;
    const d = DISHES[di++ % DISHES.length];
    addProp({ x: dirx * cd, y: diry * cd, ang: Math.atan2(diry, dirx), hl: 0, r: objR, kind: d.kind, c: d.c });
  }
}
// 2) Table-setting at the corners
const SETTING = [
  { x: 1350,  y: -1000, ang: 0.5,  hl: 150, r: 120, kind: 'board', c: '#b07b46' },
  { x: -1350, y: -1000, ang: -0.5, hl: 150, r: 22,  kind: 'knife', c: '#c8ccd2' },
  { x: -1380, y: 1100,  ang: 0.6,  hl: 110, r: 52,  kind: 'spoon', c: '#c8ccd2' },
  { x: 1430,  y: 1150,  ang: -0.4, hl: 120, r: 30,  kind: 'fork',  c: '#c8ccd2' }
];
for (const o of SETTING) {
  if (Math.abs(o.x) + o.hl + o.r > TABLE.w / 2 - 60) continue;
  if (Math.abs(o.y) + o.hl + o.r > TABLE.h / 2 - 60) continue;
  if (distToTrackPoint(o.x, o.y) > TRACK_HALF + o.r + 40) addProp(o);
}

// Checkpoints
export const K = 8, CP_R = TRACK_HALF + 70;
export const checkpoints = [];
for (let i = 0; i < K; i++) checkpoints.push(centerAt((i / K) * Math.PI * 2));

// Starting position
const _start = centerAt(0), _startT = tangentAt(0);
export const startPos   = { x: _start.x, y: _start.y };
export const startAngle = Math.atan2(_startT.y, _startT.x);
