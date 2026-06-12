// Single source of persistence — the only module that touches localStorage directly.
// All reads/writes go through the getters here + save().
//
// Schema migrations: (1) increment VERSION, (2) add a migration block in _ensure() below.

const KEY     = 'desktop-drift';
const VERSION = 1;

const defaults = () => ({
  version:      VERSION,
  settings:     { units: 'kmh', haptics: true },
  garage:       { carIndex: 0, bodyColor: null, neonColor: null },
  records:      {},        // { [trackId]: { [mode]: { bestLap, bestScore } } }
  achievements: {},        // { [id]: { unlocked: bool, progress: number } }
});

let _s = null;

const _ensure = () => {
  if (_s) return;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw?.version === VERSION) { _s = raw; return; }
    // Version mismatch — reset to defaults.
    // Add a migration here (raw.version → VERSION) if data should be preserved.
  } catch {}
  _s = defaults();
};

// Writes current state to localStorage. Call after any mutation of returned objects.
export const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(_s)); } catch {}
};

// Getters return live objects — mutate the needed fields, then call save().
export const settings     = () => { _ensure(); return _s.settings; };
export const garage       = () => { _ensure(); return _s.garage; };
export const records      = () => { _ensure(); return _s.records; };
export const achievements = () => { _ensure(); return _s.achievements; };

// stats — lazily self-initialised so adding it never bumps VERSION or resets
// existing saves. Shape: { caps: { [trackId]: number[] } }
export const stats = () => { _ensure(); if (!_s.stats) _s.stats = {}; return _s.stats; };

// Returns the array of collected cap indices for a track (empty if none yet).
export const collectedCaps = (trackId) => {
  const st = stats();
  if (!st.caps) st.caps = {};
  return st.caps[trackId] ?? [];
};

// Mark a cap index as permanently collected for a track. No-op if already recorded.
export const capCollect = (trackId, idx) => {
  const st = stats();
  if (!st.caps) st.caps = {};
  const arr = st.caps[trackId] ?? (st.caps[trackId] = []);
  if (!arr.includes(idx)) { arr.push(idx); save(); }
};
