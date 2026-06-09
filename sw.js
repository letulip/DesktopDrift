// Desktop Drift — Service Worker
// Cache version: bump this string to force all clients to re-download assets.
const CACHE = 'desktop-drift-v40';

// Build absolute URLs relative to this SW's own location so the same file
// works on http://localhost:8777/ and https://letulip.github.io/DesktopDrift/
const BASE = new URL('.', self.location).href;
// Pre-cache: HTML, CSS and ALL js modules (critical for startup — must be
// available before the first offline visit). SVGs from items/ and objects/ are
// intentionally NOT here — there are dozens of them; they are picked up by the
// runtime cache (fetch handler below) on first request. When adding a new js
// module, add it here.
const ASSETS = [
  '',
  'index.html',
  'robots.txt',
  'sitemap.xml',
  'select.html',
  'settings.html',
  'sandbox.html',
  'tracks.html',
  'game.html',
  'donate.html',
  'manifest.json',
  'css/base.css',
  'css/menu.css',
  'css/sandbox.css',
  'css/select.css',
  'css/tracks.css',
  'css/settings.css',
  'css/donate.css',
  'fonts/unbounded-800-latin.woff2',
  'js/store.js',
  'js/config.js',
  'js/scoring.js',
  'js/track-util.js',
  'js/palette.js',
  'js/items.js',
  'js/collectibles.js',
  'js/track-oval.js',
  'js/track-registry.js',
  'js/track-green-study.js',
  'js/track-steel-kitchen.js',
  'js/track-workbench.js',
  'js/race-results.js',
  'tracks/green-study.svg',
  'tracks/steel-kitchen.svg',
  'tracks/workbench.svg',
  'js/game-engine.js',
  'js/pause.js',
  'js/confirm-exit.js',
  'js/state.js',
  'js/render.js',
  'icons/icon.svg',
  'icons/favicon.svg',
  'icons/icon-maskable.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
].map(p => BASE + p);

// Pre-cache all static assets on install
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting(); // activate immediately without waiting for old tabs to close
});

// Delete old caches when a new SW takes over
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // take control of all open tabs right away
});

// Stale-while-revalidate: serve from cache instantly (fast + offline), but IN THE
// BACKGROUND always fetch from the network and overwrite the cache. This way fresh
// code reaches the player on the NEXT load even if the CACHE bump was forgotten —
// a forgotten bump self-heals. (Bumping is still useful: it guarantees the update
// on the FIRST load via skipWaiting.)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(BASE)) return; // ignore cross-origin

  e.respondWith(
    caches.match(e.request).then(cached => {
      // In parallel with serving from cache, fetch from the network and refresh the cache.
      const network = fetch(e.request).then(resp => {
        if (resp.ok) {
          // Clone immediately — before any await/then, while the body hasn't been read yet.
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached); // offline → fall back to cache

      // Cache available — serve immediately; not available — wait for network (first visit).
      return cached || network;
    })
  );
});
