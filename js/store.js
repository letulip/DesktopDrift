// Single source of persistence — the only module that touches localStorage directly.
// All reads/writes go through the getters here + save().
//
// Schema migrations: (1) increment VERSION, (2) add a migration block in _ensure() below.

const KEY     = 'desktop-drift';
const VERSION = 1;

const defaults = () => ({
  version:      VERSION,
  settings:     { units: 'kmh' },
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
