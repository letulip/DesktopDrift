// Zen track-select screen — logic extracted verbatim from zen.html's inline module (SPA Phase A).
// Renders a track card + minimap thumbnail per track; each card links to select.html?…&mode=zen.
//
// The minimap renderer is the shared js/track-thumb.js (also used by the Time Attack screen).
//
// Screen contract: createZenScreen(root=document) -> { destroy }. The only rAF is a single
// scrollTop reset (not a loop); destroy() cancels it defensively and clears the rendered cards so
// a re-mount does not stack duplicates.
import { TRACKS } from '../track-registry.js';
import { drawThumb } from '../track-thumb.js';

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
