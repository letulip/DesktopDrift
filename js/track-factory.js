// Shared factory for all Time Attack track modules.
// Each track module calls makeTrack() with its 3 unique values
// (SVG source + origin, id, laps, theme) and re-exports the result.

import * as ITEMS from './items.js';
import { COLA_CAP } from './collectibles.js';
import { parseSvgPath, chaikin, offsetEdges, placeCones, sampleCheckpoints, prepProp } from './track-util.js';

// ── Shared constants (same for every track) ───────────────────────────────────
export const TRACK_HALF = 100;
export const CONE_R     = 9;
export const K          = 8;
export const CP_R       = TRACK_HALF + 70;

const TABLE_MARGIN = 250;

// Resolve a proxy-line layer ID to an items.js export key:
// 1) direct match; 2) strip trailing _N instance suffix (ITEM_PENCIL_2 → ITEM_PENCIL)
const resolveKey = (rawId) => {
  if (rawId in ITEMS) return rawId;
  const stripped = rawId.replace(/_\d+$/, '');
  return stripped in ITEMS ? stripped : null;
};

// ── Factory ───────────────────────────────────────────────────────────────────
// svgPath  — fetch path, e.g. './tracks/green-study.svg'
// scale    — game units per SVG unit; defaults to 0.25 (stroke-width 800 convention)
// id       — string key used in store.records() and track-registry.js
// laps     — race length
// theme    — colour palette object passed to render.js via initRender(T)
// (svgCx / svgCy are no longer params — auto-derived from the SVG viewBox)
export const makeTrack = async ({ svgPath, scale = 0.25, id, laps, theme }) => {
  // ── SVG load ────────────────────────────────────────────────────────────────
  const svgText = await fetch(svgPath).then(r => r.text());
  const _doc    = new DOMParser().parseFromString(svgText, 'image/svg+xml');

  // ── Game origin — derived from viewBox, no longer a caller-supplied constant ─
  const _vb   = _doc.querySelector('svg').getAttribute('viewBox').trim().split(/\s+/).map(Number);
  const svgCx = _vb[2] / 2, svgCy = _vb[3] / 2;
  const toGame = (x, y) => ({ x: (x - svgCx) * scale, y: -(y - svgCy) * scale });

  // ── Centreline ──────────────────────────────────────────────────────────────
  const rawVerts = parseSvgPath(_doc.getElementById('track_path').getAttribute('d'));
  let smoothPoly = rawVerts.map(([x, y]) => toGame(x, y));
  for (let i = 0; i < 4; i++) smoothPoly = chaikin(smoothPoly);

  const { center, outer, inner } = offsetEdges(smoothPoly, TRACK_HALF);
  const cones = placeCones(outer, inner, 5);

  // ── TABLE ───────────────────────────────────────────────────────────────────
  let _maxX = 0, _maxY = 0;
  for (const o of outer) { _maxX = Math.max(_maxX, Math.abs(o.x)); _maxY = Math.max(_maxY, Math.abs(o.y)); }
  const TABLE = { w: Math.round((_maxX + TABLE_MARGIN) * 2), h: Math.round((_maxY + TABLE_MARGIN) * 2), shape: 'rect' };

  // ── Items from proxy lines (line and path elements) ──────────────────────────
  const props        = [];
  const collectibles = [];

  _doc.querySelectorAll('line[id^="ITEM_"], path[id^="ITEM_"]').forEach(el => {
    const rawId = el.id;

    // Cola cap — collectible, not a physics prop
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
      console.warn(`[track: ${id}] unknown item id "${rawId}" — not found in items.js`);
      return;
    }
    const item = ITEMS[key];

    // Extract midpoint coordinates — handle both <line> and <path d="M x1 y1 L x2 y2"> proxies
    let x1, y1, x2, y2;
    if (el.tagName === 'path') {
      const m = el.getAttribute('d').match(/M\s*([\d.]+)\s+([\d.]+)\s*L\s*([\d.]+)\s+([\d.]+)/);
      if (!m) return;
      x1 = +m[1]; y1 = +m[2]; x2 = +m[3]; y2 = +m[4];
    } else {
      x1 = parseFloat(el.getAttribute('x1'));
      y1 = parseFloat(el.getAttribute('y1'));
      x2 = parseFloat(el.getAttribute('x2'));
      y2 = parseFloat(el.getAttribute('y2'));
    }

    const { x: gx, y: gy } = toGame((x1 + x2) / 2, (y1 + y2) / 2);
    const ang = Math.atan2(-(y2 - y1), x2 - x1);
    props.push(prepProp({ ...item, x: Math.round(gx), y: Math.round(gy), ang: parseFloat(ang.toFixed(3)) }));
  });

  // ── Checkpoints + start position ────────────────────────────────────────────
  const checkpoints = sampleCheckpoints(center, K);
  const _c0 = center[0], _c1 = center[1];
  const startPos   = { x: _c0.x, y: _c0.y };
  const startAngle = Math.atan2(_c1.y - _c0.y, _c1.x - _c0.x);

  return {
    TRACK_HALF, CONE_R, K, CP_R,
    center, outer, inner, cones, TABLE,
    props, collectibles, checkpoints,
    startPos, startAngle, id, laps, theme,
  };
};
