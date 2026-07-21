// Pure device-tuning resolvers for render.js (SPA Phase C). Kept DOM-free (no canvas/location) so
// they are node-unit-testable and can be re-run per game mount with the param from the route hash
// instead of only once at import from location.search. Both persist an in-range param to storage so
// an on-device A/B choice sticks across track re-selection.

// Per-device DPR cap. An in-range ?dpr (1 | 1.25 | 1.5) is persisted and wins; otherwise the stored
// value, else 1.5. Lowering it shrinks the canvas backbuffer (fewer fragments + less Mali tiler
// write-out — the buffer whose stale tiles show as scanline garbage on Mali).
export const resolveDprCap = (param, storage = globalThis.localStorage) => {
  try {
    if (param === '1' || param === '1.25' || param === '1.5') storage.setItem('dd-dpr', param);
    return parseFloat(storage.getItem('dd-dpr')) || 1.5;
  } catch { return 1.5; }
};

// Offscreen static-surface bake mode. An in-range ?surface (bake | live) is persisted and wins;
// otherwise the stored value, else 'live' (the default — the live decimated stroke is cheaper on
// weak GPUs; see render.js _buildTrackSurface).
export const resolveSurfaceMode = (param, storage = globalThis.localStorage) => {
  try {
    if (param === 'bake' || param === 'live') storage.setItem('dd-surface', param);
    return storage.getItem('dd-surface') || 'live';
  } catch { return 'live'; }
};
