// Single source of persistence — the only module that touches localStorage directly.
// All reads/writes go through the getters here + save().
//
// ── Schema evolution (never wipes player data) ────────────────────────────────
// On load we deep-MERGE the saved object over `defaults()`: missing keys are filled
// from defaults, saved values win, arrays are replaced wholesale. So the common case —
// adding a new field or slice — just means editing `defaults()`. No VERSION bump, no
// data loss. (This is why there is no `stats` lazy-init hack any more.)
//
// `VERSION` + the `MIGRATIONS` table are only for BREAKING changes that a merge can't
// express (renaming/reshaping/removing a field). To add one: (1) bump VERSION, (2) add
// `MIGRATIONS[newVersion] = (s) => <transform old shape to new>`. The chain runs
// old→VERSION, then the merge fills anything still missing.
//
// We only reset to defaults when the stored data is genuinely unrecoverable
// (unparseable / not an object). A version we don't recognise (e.g. a rolled-back
// deploy producing a "future" save) is merged, not wiped.

const KEY     = 'desktop-drift';
const VERSION = 1;

const defaults = () => ({
  version:      VERSION,
  settings:     { units: 'kmh', haptics: true },
  garage:       { carIndex: 0, bodyColor: null, neonColor: null },
  records:      {},        // { [trackId]: { [mode]: { bestPPS, bestPPSTotal, bestPPSTime } } }
  achievements: {},        // { [id]: { unlocked: bool, progress: number } }
  wallet:       0,         // tire-coin balance (soft currency — see ROADMAP Phase 2.5)
  stats:        { caps: {}, tires: {} }, // collected ids per track: caps + tires
});

// Breaking-change migrations, keyed by the target version. Empty while VERSION === 1.
// Each fn receives the saved object and returns it transformed to that version's shape.
const MIGRATIONS = {
  // 2: (s) => { /* example: rename s.records.*.bestScore → bestPPS, etc. */ return s; },
};

const _isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Deep-merge `over` onto `base`. `defaults()` (the base) defines the expected shape:
//  - default slot is an object → recurse if the save is also an object, otherwise KEEP
//    the default (the saved value is corrupt/wrong-type for that slot — discard it, don't
//    crash consumers). This is the content validation: a hand-deleted or garbled slice
//    (e.g. `settings: null`) heals to defaults instead of throwing later.
//  - default slot is a leaf (string/number/array) → take the saved value (replace).
//  - key only in the save (unknown/future field) → preserved as-is (forward-compatible).
const _merge = (base, over) => {
  if (!_isObj(base) || !_isObj(over)) return over;
  const out = { ...base };
  for (const k of Object.keys(over)) {
    out[k] = _isObj(base[k])
      ? (_isObj(over[k]) ? _merge(base[k], over[k]) : base[k])
      : over[k];
  }
  return out;
};

// Run the migration chain from the saved version up to VERSION.
const _migrate = (raw) => {
  let s = raw;
  const from = Number.isInteger(raw.version) ? raw.version : 0;
  for (let v = from + 1; v <= VERSION; v++) if (MIGRATIONS[v]) s = MIGRATIONS[v](s);
  return s;
};

let _s = null;

const _ensure = () => {
  if (_s) return;
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
  if (!_isObj(raw)) { _s = defaults(); return; }   // no/corrupt save → fresh defaults
  _s = _merge(defaults(), _migrate(raw));           // fill gaps from defaults, keep saved
  _s.version = VERSION;
  save();                                           // persist the upgraded/normalised shape
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

// stats — a normal slice now (defaults + merge guarantee `{ caps: {} }`).
export const stats = () => { _ensure(); return _s.stats; };

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

// ── Tire-coin economy (see ROADMAP Phase 2.5) ─────────────────────────────────
// wallet = soft-currency balance; tires are one-time pickups persisted per track by id
// (same model as caps). Pure payout/price formulas live in js/economy.js.

// Current tire-coin balance.
export const wallet = () => { _ensure(); return _s.wallet; };

// Add (or remove, if n<0) tire coins; clamped at 0. Persists. Returns the new balance.
export const addTires = (n) => {
  _ensure();
  _s.wallet = Math.max(0, _s.wallet + n);
  save();
  return _s.wallet;
};

// Ids of tires already collected on a track (empty if none yet).
export const tiresFor = (trackId) => {
  const st = stats();
  if (!st.tires) st.tires = {};
  return st.tires[trackId] ?? [];
};

// Mark a tire id as permanently collected for a track. No-op if already recorded.
export const tireCollect = (trackId, id) => {
  const st = stats();
  if (!st.tires) st.tires = {};
  const arr = st.tires[trackId] ?? (st.tires[trackId] = []);
  if (!arr.includes(id)) { arr.push(id); save(); }
};
