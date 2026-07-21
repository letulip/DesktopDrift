// Shared track-minimap thumbnail renderer for the track-select screens (Time Attack + Zen).
// Extracted verbatim from the byte-identical copies that lived in tracks.html and zen.html — this
// is the de-dup follow-up to the SPA Phase-A screen extraction, kept as its own commit so any
// future change to the thumbnail is isolated from the screen logic.
//
// Draws the track centreline (from its SVG) onto a small canvas: background + rounded table + the
// track stroke, using the track's theme colours (with fallbacks). Async — it fetches the SVG.
import { svgToCentreline } from './track-util.js';

const TRACK_GU = 100;

export async function drawThumb(canvas, svgSrc, theme) {
  const th = {
    background: theme?.background ?? '#0b0907',
    table:      theme?.table      ?? '#2e241a',
    tableEdge:  theme?.tableEdge  ?? '#5a4a36',
    track:      theme?.track      ?? '#ffb14d',
  };

  let text;
  try { text = await fetch(svgSrc).then(r => r.text()); }
  catch { return; }

  try {
    const pts = svgToCentreline(text);
    if (!pts) return;

    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    const extW = maxX - minX + TRACK_GU * 2;
    const extH = maxY - minY + TRACK_GU * 2;
    const pad  = 10;
    const sx   = (canvas.width  - pad * 2) / extW;
    const sy   = (canvas.height - pad * 2) / extH;
    const s    = Math.min(sx, sy);
    const ox   = (canvas.width  - extW * s) / 2 + TRACK_GU * s;
    const oy   = (canvas.height - extH * s) / 2 + TRACK_GU * s;
    const toC  = p => ({ x: (p.x - minX) * s + ox, y: (p.y - minY) * s + oy });

    const cx = canvas.getContext('2d');

    cx.fillStyle = th.background;
    cx.fillRect(0, 0, canvas.width, canvas.height);

    const ti = 5, tr = 5;
    cx.beginPath();
    cx.roundRect(ti, ti, canvas.width - ti * 2, canvas.height - ti * 2, tr);
    cx.fillStyle = th.table; cx.fill();
    cx.strokeStyle = th.tableEdge; cx.lineWidth = 2; cx.stroke();

    cx.lineWidth   = TRACK_GU * 2 * s;
    cx.strokeStyle = th.track;
    cx.lineCap     = 'round';
    cx.lineJoin    = 'round';
    cx.beginPath();
    pts.forEach((p, idx) => {
      const { x, y } = toC(p);
      idx === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
    });
    cx.closePath();
    cx.stroke();
  } catch { /* render error — canvas keeps its fallback background */ }
}
