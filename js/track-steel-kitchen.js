// "Steel Kitchen" track — generated from tracks/steel-kitchen.svg.
// Stainless worktop: light theme, kitchen utensils.
// Uses top-level await (ES modules, modern browsers).

import * as ITEMS from './items.js';
import { COLA_CAP } from './collectibles.js';
import { parseSvgPath, chaikin, offsetEdges, placeCones, sampleCheckpoints, prepProp } from './track-util.js';

// ── Constants ─────────────────────────────────────────────────────────────────
// viewBox 0 0 16399 8756; track stroke-width 800 → half = 400.
// SCALE = TRACK_HALF / 400 = 100 / 400 = 0.25.
const SVG_CX = 16399 / 2;
const SVG_CY = 8756  / 2;
const SCALE  = 0.25;

export const TRACK_HALF = 100;
export const CONE_R     = 9;
export const K          = 8;
export const CP_R       = TRACK_HALF + 70;

// ── Helpers ───────────────────────────────────────────────────────────────────

const toGame = (x, y) => ({ x: (x - SVG_CX) * SCALE, y: -(y - SVG_CY) * SCALE });

// Resolve a layer ID to an items.js key:
// 1) direct match; 2) strip trailing _N instance suffix
const resolveKey = (id) => {
  if (id in ITEMS) return id;
  const stripped = id.replace(/_\d+$/, '');
  return stripped in ITEMS ? stripped : null;
};

// ── SVG load ──────────────────────────────────────────────────────────────────
const svgText = await fetch('./tracks/steel-kitchen.svg').then(r => r.text());
const _doc    = new DOMParser().parseFromString(svgText, 'image/svg+xml');

// ── Centreline ────────────────────────────────────────────────────────────────
const rawVerts  = parseSvgPath(_doc.getElementById('track_path').getAttribute('d'));
let smoothPoly  = rawVerts.map(([x, y]) => toGame(x, y));
for (let i = 0; i < 4; i++) smoothPoly = chaikin(smoothPoly);

export const { center, outer, inner } = offsetEdges(smoothPoly, TRACK_HALF);

// ── Cones ─────────────────────────────────────────────────────────────────────
export const cones = placeCones(outer, inner, 5);

// ── TABLE: table size from actual outer bounds + margin ───────────────────────
const TABLE_MARGIN = 250;
let _maxX = 0, _maxY = 0;
for (const o of outer) { _maxX = Math.max(_maxX, Math.abs(o.x)); _maxY = Math.max(_maxY, Math.abs(o.y)); }
export const TABLE = { w: Math.round((_maxX + TABLE_MARGIN) * 2), h: Math.round((_maxY + TABLE_MARGIN) * 2), shape: 'rect' };

// ── Items from proxy lines ────────────────────────────────────────────────────
export const props = [];
export const collectibles = [];
const addProp = (o) => { props.push(prepProp(o)); };

_doc.querySelectorAll('line[id^="ITEM_"]').forEach(el => {
  const rawId = el.id;

  if (rawId === 'ITEM_COLA_CAP') {
    const x1 = parseFloat(el.getAttribute('x1'));
    const y1 = parseFloat(el.getAttribute('y1'));
    const x2 = parseFloat(el.getAttribute('x2'));
    const y2 = parseFloat(el.getAttribute('y2'));
    const { x, y } = toGame((x1 + x2) / 2, (y1 + y2) / 2);
    const cx = Math.round(x), cy = Math.round(y);
    collectibles.push({ ...COLA_CAP, x: cx, y: cy, capId: `${cx},${cy}` });
    return;
  }

  const key = resolveKey(rawId);
  if (!key) {
    console.warn(`[track-steel-kitchen] unknown item id "${rawId}" — not found in items.js`);
    return;
  }
  const item = ITEMS[key];

  const x1 = parseFloat(el.getAttribute('x1'));
  const y1 = parseFloat(el.getAttribute('y1'));
  const x2 = parseFloat(el.getAttribute('x2'));
  const y2 = parseFloat(el.getAttribute('y2'));

  const { x: gx, y: gy } = toGame((x1 + x2) / 2, (y1 + y2) / 2);
  const ang = Math.atan2(-(y2 - y1), x2 - x1);

  addProp({ ...item, x: Math.round(gx), y: Math.round(gy), ang: parseFloat(ang.toFixed(3)) });
});

// ── Checkpoints ───────────────────────────────────────────────────────────────
export const checkpoints = sampleCheckpoints(center, K);

// ── Start ─────────────────────────────────────────────────────────────────────
const _c0 = center[0], _c1 = center[1];
export const startPos   = { x: _c0.x, y: _c0.y };
export const startAngle = Math.atan2(_c1.y - _c0.y, _c1.x - _c0.x);

export const id   = 'steel-kitchen';
export const laps = 3;

// Light colour theme: stainless worktop, white tile.
// The default white start-line flag has no contrast on a light track,
// so both flag colours are already universal black/white — no override needed.
export const theme = {
  background:    '#c6cace',
  table:         '#6b7178',
  tableEdge:     '#444a50',
  track:         '#c6bca1',
  skid:          'rgba(30,34,40,0.5)',
  checkpoint:    'rgba(60,120,160,0.6)',
  cone:          '#ff7a1a',
};
