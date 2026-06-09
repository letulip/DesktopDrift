// Test helpers. Node has no localStorage — we substitute a minimal Map-based
// implementation so store.js works in a clean process without a browser.

// Installs a global localStorage backed by a Map. seed — initial contents
// (object of key→string). Returns the Map so tests can inspect it directly.
export const installLocalStorage = (seed = {}) => {
  const m = new Map(Object.entries(seed));
  globalThis.localStorage = {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    clear: () => m.clear(),
  };
  return m;
};
