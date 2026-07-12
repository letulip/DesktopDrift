// Profile import/export codec — pure, DOM-free (unit-tested in tests/profile-io.test.js).
// Turns the full store snapshot into a portable, single-line code for moving progress
// between devices, and decodes a code (or a raw JSON export file) back into a profile
// object. The REAL validation/heal happens in store.replaceAll(), which runs the imported
// object through the same migrate + merge-over-defaults path as a normal load — so here we
// only encode/decode, sanity-check the shape, and reject obvious garbage with a clear message.

const HEADER = 'DDP1.';   // Desktop Drift Profile, format v1 — proves a pasted code is ours.

// Top-level keys a real save carries (mirror of store.defaults()). We don't require all of
// them — the store back-fills anything missing — but a valid profile must look like one.
const KNOWN_KEYS = ['version', 'settings', 'garage', 'records', 'achievements',
                    'wallet', 'ledger', 'owned', 'ownedCars', 'stats'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// UTF-8-safe base64 (btoa/atob are Latin1-only; go through bytes so any character survives).
const b64encode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const b64decode = (b64) => {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

// Does this object look like a Desktop Drift profile? (Has ≥2 known top-level keys.)
export const validateProfile = (obj) =>
  isObj(obj) && KNOWN_KEYS.filter((k) => k in obj).length >= 2;

// Encode a full store snapshot into a portable, single-line code (header + base64 JSON).
export const encodeProfile = (state) => {
  if (!isObj(state)) throw new Error('Nothing to export.');
  return HEADER + b64encode(JSON.stringify(state));
};

// Pretty JSON for the downloadable .json file (also re-importable via decodeProfile).
export const profileJson = (state) => JSON.stringify(state, null, 2);

// Decode a pasted code (DDP1.…) OR raw exported JSON back into a profile object.
// Throws a user-facing Error if it isn't a readable Desktop Drift profile.
export const decodeProfile = (text) => {
  const t = (text ?? '').trim();
  if (!t) throw new Error('Paste a profile code or choose a file first.');
  let json;
  if (t.startsWith(HEADER)) {
    try { json = b64decode(t.slice(HEADER.length)); }
    catch { throw new Error('This profile code is damaged or incomplete.'); }
  } else {
    json = t;   // maybe a raw JSON export (file or pasted) — try to parse it directly.
  }
  let obj;
  try { obj = JSON.parse(json); }
  catch { throw new Error('This is not a valid Desktop Drift profile.'); }
  if (!validateProfile(obj)) throw new Error('This is not a Desktop Drift profile.');
  return obj;
};
