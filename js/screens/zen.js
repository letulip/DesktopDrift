// Zen track-select screen — logic extracted verbatim from zen.html's inline module (SPA Phase A).
// Renders a track card + minimap thumbnail per track; each card links to select.html?…&mode=zen.
//
// NOTE: drawThumb() + TRACK_GU are byte-identical to the copy in tracks.html's inline script. Per
// the plan they are copied verbatim here for now and de-duplicated into a shared js/track-thumb.js
// as a SEPARATE follow-up step (when tracks is extracted), so any render delta stays bisectable.
//
// Screen contract: createZenScreen(root=document) -> { destroy }. The only rAF is a single
// scrollTop reset (not a loop); destroy() cancels it defensively and clears the rendered cards so
// a re-mount does not stack duplicates.
import { TRACKS } from '../track-registry.js';
import { svgToCentreline } from '../track-util.js';

const TRACK_GU = 100;

async function drawThumb(canvas, svgSrc, theme) {
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

export const createZenScreen = (root = document) => {
  const container = root.getElementById('track-cards');

  for (const track of TRACKS) {
    const link = document.createElement('a');
    link.className = 'track-card';
    link.href = `select.html?track=${encodeURIComponent(track.id)}&mode=zen`;

    const top = document.createElement('div');
    top.className = 'track-card-top';

    const canvas = document.createElement('canvas');
    canvas.className = 'track-thumb track-thumb--full';
    canvas.width  = 260;
    canvas.height = 140;
    top.appendChild(canvas);
    link.appendChild(top);

    const body = document.createElement('div');
    body.className = 'track-card-body';

    const name = document.createElement('div');
    name.className   = 'track-card-name';
    name.textContent = track.name;

    const desc = document.createElement('div');
    desc.className   = 'track-card-desc';
    desc.textContent = track.desc;

    body.appendChild(name);
    body.appendChild(desc);
    link.appendChild(body);
    container.appendChild(link);

    drawThumb(canvas, track.svgSrc, track.theme);
  }

  const rafId = requestAnimationFrame(() => { container.scrollTop = 0; });

  const destroy = () => {
    cancelAnimationFrame(rafId);
    if (container) container.textContent = '';
  };
  return { destroy };
};
