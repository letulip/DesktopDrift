// Single source of persistence — the only module that touches localStorage directly.
// All reads/writes go through the getters here + save().
//
// Pure shop purchase logic lives in js/economy.js (buy); this module applies it.
import { buy } from './economy.js';
import { defaultNeon } from './neon.js';
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
const VERSION = 3;

const defaults = () => ({
  version:      VERSION,
  settings:     { units: 'kmh', haptics: true },
  // garage: selected car + a PER-CAR equipped look (each car keeps its own body/neon/
  // finish/trail). cars is keyed by car index. Purchases (owned) stay account-wide.
  garage:       { carIndex: 0, cars: {} },
  records:      {},        // { [trackId]: { [mode]: { bestPPS, bestPPSTotal, bestPPSTime } } }
  achievements: {},        // { [id]: { unlocked: bool, progress: number } }
  wallet:       0,         // tire-coin balance (soft currency — see ROADMAP Phase 2.5)
  ledger:       [],        // tire-coin transactions: { t, amount, reason, balance } (newest last)
  owned:        [],        // purchased shop item ids (cosmetics — see docs/plans/shop.md)
  stats:        { caps: {}, tires: {}, cleared: [], runs: 0, driftSecs: 0 }, // collected ids/instances + lifetime counters (races finished, seconds drifted)
});

// Breaking-change migrations, keyed by the target version.
// Each fn receives the saved object and returns it transformed to that version's shape.
const MIGRATIONS = {
  // v2: the equipped look went from a single global set on `garage` to a per-car map
  // (garage.cars[carIndex]). Carry the old global look onto the car last customized.
  2: (s) => {
    if (!_isObj(s.garage)) return s;   // corrupt/missing garage → let the merge heal it
    const g = s.garage;
    if (!g.cars) g.cars = {};
    const hadLook = g.bodyColor != null || g.neonColor != null || g.finish != null || g.trailColor != null;
    if (hadLook) {
      g.cars[String(g.carIndex ?? 0)] = {
        bodyColor:  g.bodyColor  ?? null,
        neonColor:  g.neonColor  ?? null,
        finish:     g.finish     ?? null,
        trailColor: g.trailColor ?? null,
      };
    }
    delete g.bodyColor; delete g.neonColor; delete g.finish; delete g.trailColor;
    return s;
  },
  // v3: neon went from a single `neonColor` hex to a `neon` config object (6-zone Neon FX —
  // see docs/plans/neon.md). Fold each car's existing colour into `neon` (solid/static);
  // `neonColor` is left in place as a harmless legacy field.
  3: (s) => {
    if (!_isObj(s.garage) || !_isObj(s.garage.cars)) return s;
    for (const look of Object.values(s.garage.cars)) {
      if (_isObj(look) && look.neon === undefined) {
        look.neon = look.neonColor ? defaultNeon(look.neonColor) : null;
      }
    }
    return s;
  },
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

// ── Achievements (see docs/plans/achievements.md) ─────────────────────────────
// Slice shape: { [id]: { unlocked: bool, progress: number } }. Unlock logic is the
// pure evaluate() in js/achievements.js; this module just persists the result.

// The raw achievements map (live object — read-only from callers' perspective).
export const achAll = () => achievements();

// Set of ids already unlocked — the second arg evaluate() needs to avoid re-firing.
export const achUnlocked = () => {
  const a = achievements();
  return new Set(Object.keys(a).filter(id => a[id]?.unlocked));
};

// Mark an achievement unlocked. Idempotent; persists. Returns true the first time.
export const achUnlock = (id) => {
  const a = achievements();
  const e = a[id] ?? (a[id] = { unlocked: false, progress: 0 });
  if (e.unlocked) return false;
  e.unlocked = true; save();
  return true;
};

// Record ladder/counter progress, latching to the max seen (progress never regresses,
// so a wallet ladder stays unlocked after the balance is spent). Persists.
export const achSetProgress = (id, n) => {
  const a = achievements();
  const e = a[id] ?? (a[id] = { unlocked: false, progress: 0 });
  const next = Math.max(e.progress ?? 0, n);
  if (next !== e.progress) { e.progress = next; save(); }
};

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

// Tire-coin ledger: keep the most recent LEDGER_MAX transactions for the history view.
const LEDGER_MAX = 50;

const _pushLedger = (amount, reason) => {
  if (!Array.isArray(_s.ledger)) _s.ledger = [];
  _s.ledger.push({ t: Date.now(), amount, reason, balance: _s.wallet });
  if (_s.ledger.length > LEDGER_MAX) _s.ledger.splice(0, _s.ledger.length - LEDGER_MAX);
};

// Add (or remove, if n<0) tire coins; clamped at 0. Persists. Returns the new balance.
// A truthy `reason` logs a history entry; pass none for silent changes (e.g. per-tire
// pickups, which are aggregated into one ledger entry per race via recordTxn).
export const addTires = (n, reason = '') => {
  _ensure();
  const before = _s.wallet;
  _s.wallet = Math.max(0, _s.wallet + n);
  const delta = _s.wallet - before;
  if (delta !== 0 && reason) _pushLedger(delta, reason);
  save();
  return _s.wallet;
};

// Log a history entry for coins already added to the wallet (e.g. an aggregated
// per-race pickup sum) WITHOUT changing the balance again. No-op for amount 0.
export const recordTxn = (amount, reason) => {
  _ensure();
  if (!amount) return;
  _pushLedger(amount, reason);
  save();
};

// The tire-coin transaction history (oldest first). Empty until the first earn/spend.
export const ledger = () => { _ensure(); if (!Array.isArray(_s.ledger)) _s.ledger = []; return _s.ledger; };

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

// Replace a track's collected-tire list wholesale (used by the engine's self-heal to prune
// orphaned/duplicate ids so the count can't exceed the tile total). Persists only on change.
export const setTires = (trackId, ids) => {
  const st = stats();
  if (!st.tires) st.tires = {};
  const next = [...ids];
  const prev = st.tires[trackId] ?? [];
  if (prev.length !== next.length || prev.some((v, i) => v !== next[i])) {
    st.tires[trackId] = next; save();
  }
};

// Record a track instance (trackId, or trackId:mode later) as finished. Returns true the
// FIRST time it's recorded (→ award the first-clear bonus), false if already cleared.
export const markCleared = (instanceId) => {
  const st = stats();
  if (!Array.isArray(st.cleared)) st.cleared = [];
  if (st.cleared.includes(instanceId)) return false;
  st.cleared.push(instanceId); save();
  return true;
};

// ── Shop: owned cosmetics + equip (see docs/plans/shop.md) ────────────────────
// Purchase decisions are pure (js/economy.js → buy); this module applies the result.

// Ids of all purchased shop items.
export const owned = () => { _ensure(); return _s.owned; };

// True if the player already owns this item id.
export const isOwned = (id) => owned().includes(id);

// Record an item as owned. No-op if already present. Persists.
export const grant = (id) => {
  if (!_s.owned.includes(id)) { _s.owned.push(id); save(); }
};

// The per-car equipped look ({ bodyColor, neonColor, finish, trailColor }) for a car
// index. Returns a live object — mutate the fields and call save(). Lazily created
// with null defaults; purchases (owned) are shared across all cars, looks are not.
export const carLook = (carIndex) => {
  _ensure();
  if (!_s.garage.cars) _s.garage.cars = {};
  const key = String(carIndex);
  if (!_s.garage.cars[key]) _s.garage.cars[key] = { bodyColor: null, neonColor: null, finish: null, trailColor: null, neon: null };
  return _s.garage.cars[key];
};

// Apply a purchase: pure buy() against the current wallet+owned snapshot, then
// commit atomically (deduct tires + grant the item) only on success. Returns the
// buy() result ({ ok, ... } | { ok:false, reason }).
export const purchase = (item) => {
  _ensure();
  const result = buy({ wallet: _s.wallet, owned: _s.owned }, item);
  if (result.ok) { addTires(-item.price, 'Bought ' + (item.name || 'item')); grant(item.id); }
  return result;
};
