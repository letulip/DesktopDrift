#!/usr/bin/env node
// Item clearance validator for Desktop Drift track SVGs.
//
// Checks every <line id="ITEM_*"> midpoint against the raw track_path polyline
// and reports items that are too close to the track centreline.
//
// Usage:
//   node tools/check-item-clearance.js tracks/workbench.svg
//
// Rule: dist(item_centre, track_centreline) must be > TRACK_HALF + item.r
// Uses scale=0.25, svgCx/svgCy = viewBox/2 — same as track-factory.js.
// Add a 30-50 GU buffer: Chaikin smoothing pulls corners inward slightly.

import { readFileSync } from 'fs';
import * as ITEMS from '../js/items.js';

const svgPath = process.argv[2];
if (!svgPath) { console.error('Usage: node tools/check-item-clearance.js <path/to/track.svg>'); process.exit(1); }

const svgText = readFileSync(svgPath, 'utf8');

// ── Coordinate transform (mirrors track-factory.js) ──────────────────────────
const SCALE = 0.25;
const TRACK_HALF = 100;
const vbMatch = svgText.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
if (!vbMatch) { console.error('No viewBox found in SVG'); process.exit(1); }
const svgCx = parseFloat(vbMatch[1]) / 2;
const svgCy = parseFloat(vbMatch[2]) / 2;
const toGame = (x, y) => ({ x: (x - svgCx) * SCALE, y: -(y - svgCy) * SCALE });

// ── Parse track_path ──────────────────────────────────────────────────────────
const pathMatch = svgText.match(/id="track_path"[^>]*d="([^"]+)"/);
if (!pathMatch) { console.error('No track_path element found'); process.exit(1); }

const pts = [];
let cx = 0, cy = 0, cmd = '';
const tokens = pathMatch[1].match(/[MLHVZmlhvz]|[-+]?[\d]*\.?[\d]+(?:[eE][-+]?[\d]+)?/g) || [];
let i = 0;
while (i < tokens.length) {
  const t = tokens[i];
  if (/[MLHVZmlhvz]/.test(t)) { cmd = t; i++; continue; }
  if (cmd === 'M' || cmd === 'L') { cx = +tokens[i]; cy = +tokens[i+1]; i += 2; pts.push({ x: cx, y: cy }); }
  else if (cmd === 'H') { cx = +tokens[i]; i++; pts.push({ x: cx, y: cy }); }
  else if (cmd === 'V') { cy = +tokens[i]; i++; pts.push({ x: cx, y: cy }); }
  else i++;
}
const trackPts = pts.map(p => toGame(p.x, p.y));

// ── Distance from a game point to the closed polyline ────────────────────────
function distToTrack(gx, gy) {
  let minD = Infinity;
  const n = trackPts.length;
  for (let i = 0; i < n; i++) {
    const a = trackPts[i], b = trackPts[(i + 1) % n];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((gx - a.x) * dx + (gy - a.y) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + t * dx - gx, py = a.y + t * dy - gy;
    minD = Math.min(minD, Math.sqrt(px * px + py * py));
  }
  return minD;
}

// ── Resolve ITEM_ id to items.js entry ───────────────────────────────────────
const resolveItem = (rawId) => {
  if (rawId in ITEMS) return ITEMS[rawId];
  const stripped = rawId.replace(/_\d+$/, '');
  return stripped in ITEMS ? ITEMS[stripped] : null;
};

// ── Check all ITEM_ lines ─────────────────────────────────────────────────────
const lineRe = /<line\s+id="(ITEM_[^"]+)"[^/]*x1="([^"]+)"\s*y1="([^"]+)"\s*x2="([^"]+)"\s*y2="([^"]+)"/g;
const pathRe = /<path\s+id="(ITEM_[^"]+)"[^/]*d="M\s*([\d.]+)\s+([\d.]+)\s*L\s*([\d.]+)\s+([\d.]+)"/g;

let anyBad = false;
const results = [];

for (const m of [...svgText.matchAll(lineRe), ...svgText.matchAll(pathRe)]) {
  const rawId = m[1];
  if (rawId === 'ITEM_COLA_CAP') continue; // collectible, no physics collider
  const item = resolveItem(rawId);
  const r = item?.r ?? 50; // fallback conservative estimate
  const x1 = parseFloat(m[2]), y1 = parseFloat(m[3]);
  const x2 = parseFloat(m[4]), y2 = parseFloat(m[5]);
  const { x: gx, y: gy } = toGame((x1 + x2) / 2, (y1 + y2) / 2);
  const dist = distToTrack(gx, gy);
  const need = TRACK_HALF + r;
  const margin = dist - need;
  results.push({ rawId, gx, gy, dist, need, margin, r, fallback: !item });
}

results.sort((a, b) => a.margin - b.margin);

console.log(`\nItem clearance report: ${svgPath}`);
console.log(`Scale=${SCALE}  TRACK_HALF=${TRACK_HALF}  svgCx=${svgCx}  svgCy=${svgCy}`);
console.log('─'.repeat(88));

let warnCount = 0;
for (const { rawId, gx, gy, dist, need, margin, fallback } of results) {
  if (margin > 60 && !fallback) continue; // only show tight/bad + fallback items
  const status = margin < 0  ? `❌ OVERLAP  ${(-margin).toFixed(0).padStart(3)} GU`
               : margin < 30 ? `⚡ tight    ${margin.toFixed(0).padStart(3)} GU`
               :               `⚠️  watch    ${margin.toFixed(0).padStart(3)} GU`;
  const fb = fallback ? ' (r=50 estimate)' : '';
  console.log(`${rawId.padEnd(26)} gx=${gx.toFixed(0).padStart(6)} gy=${gy.toFixed(0).padStart(6)}  dist=${dist.toFixed(0).padStart(4)}  need=${need}  ${status}${fb}`);
  if (margin < 0) { anyBad = true; warnCount++; }
}

console.log('─'.repeat(88));
if (anyBad) {
  console.log(`\n${warnCount} item(s) overlap the track — move them outward in the SVG.`);
  process.exit(1);
} else {
  console.log('\nAll items clear ✓');
}
