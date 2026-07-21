// Pure hash-route parsing for the SPA shell (SPA Phase B). No DOM — unit-testable in node; the
// DOM router (js/router.js) imports from here. See docs/plans/spa-migration.md + the analysis.
//
// Menu routes live in the hash so a GitHub-Pages refresh never 404s and a sandboxed portal iframe
// never throws on pushState. Shape: `#/<screen>?<query>`. Every screen (incl. game and donate) runs
// in the one shell document now; the legacy per-page URLs are thin redirect shims into these hashes.

// The screens the shell can mount. 'menu' is the landing (index) screen; the rest match the
// js/screens/*.js modules. An unknown screen name falls back to 'menu'.
export const SCREENS = ['menu', 'tracks', 'zen', 'select', 'modify', 'settings', 'achievements', 'game', 'donate'];

// Parse a hash route into a flat, dependency-free descriptor. Accepts a full URL
// ('https://…/index.html#/select?track=x'), a bare hash ('#/select?track=x'), or just the path
// ('/select?track=x' / 'select?track=x'). Unknown/empty → the menu screen. The param vocabulary is
// fully enumerated: track, mode ('zen'|'sandbox'), dir ('rev'), car (int ≥ 0), and the debug
// pass-throughs dpr / surface (consumed by the game document, carried through untouched here).
export const parseRoute = (input = '') => {
  const raw = String(input);
  const afterHash = raw.includes('#') ? raw.slice(raw.indexOf('#') + 1) : raw;   // part after '#'
  const [path, query = ''] = afterHash.replace(/^\/+/, '').split('?');            // drop leading slashes
  const screen = SCREENS.includes(path) ? path : 'menu';
  const q = new URLSearchParams(query);
  const carRaw = q.get('car');
  return {
    screen,
    track:   q.get('track') || null,
    mode:    q.get('mode')  || null,                         // 'zen' | 'sandbox' | null
    dir:     q.get('dir') === 'rev' ? 'rev' : null,          // only 'rev' is meaningful
    car:     carRaw == null ? null : Math.max(0, parseInt(carRaw, 10) || 0),
    dpr:     q.get('dpr')     || null,                        // debug pass-through (game reads it)
    surface: q.get('surface') || null,                        // debug pass-through (game reads it)
  };
};

// Build a hash route ('#/select?track=x&dir=rev') from a screen + params — the inverse of
// parseRoute, used by the router/navTo. Only non-empty, known params are emitted, in a stable
// order, so the same navigation always produces the same hash.
export const routeToHash = (screen, params = {}) => {
  const scr = SCREENS.includes(screen) ? screen : 'menu';
  const q = new URLSearchParams();
  for (const k of ['track', 'mode', 'dir', 'car', 'dpr', 'surface']) {
    const v = params[k];
    if (v != null && v !== '') q.set(k, String(v));
  }
  const qs = q.toString();
  return '#/' + scr + (qs ? '?' + qs : '');
};

// Map a parsed game route to the opts object startGame(T, opts) expects (SPA Phase C). Mirrors the
// old game.html inline bootstrap: startGame(T, { initItems:true, zen, reversed }), plus `stock`
// (a sandbox test-drive ignores equipped paint) and the `trackId`/`car` the game screen needs to
// pick the track. laps is intentionally absent — the engine reads T.laps, never a route field.
export const optsFromRoute = (route = {}) => ({
  trackId:   route.track ?? null,
  zen:       route.mode === 'zen',
  reversed:  route.dir === 'rev',
  stock:     route.mode === 'sandbox',
  initItems: true,
  car:       route.car ?? null,
});
