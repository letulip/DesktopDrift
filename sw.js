// Desktop Drift — Service Worker
// Cache version: bump this string to force all clients to re-download assets.
const CACHE = 'desktop-drift-v203';

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
  'modify.html',
  'settings.html',
  'sandbox.html',
  'tracks.html',
  'achievements.html',
  'zen.html',
  'game.html',
  'donate.html',
  'manifest.json',
  'css/base.css',
  'css/header.css',
  'css/content.css',
  'css/footer.css',
  'css/menu.css',
  'css/sandbox.css',
  'css/select.css',
  'css/wallet.css',
  'css/tracks.css',
  'css/achievements.css',
  'css/settings.css',
  'css/donate.css',
  'css/ach-toast.css',
  'fonts/unbounded-800-latin.woff2',
  'js/store.js',
  'js/config.js',
  'js/car-stats.js',
  'js/car-order.js',
  'js/cars-data.js',
  'js/scoring.js',
  'js/economy.js',
  'js/achievements.js',
  'js/ach-sync.js',
  'js/ach-toast.js',
  'js/shop-catalog.js',
  'js/car-preview.js',
  'js/finish.js',
  'js/wallet-history.js',
  'js/profile-io.js',
  'js/profile-sync.js',
  'js/physics.js',
  'js/track-util.js',
  'js/collision.js',
  'js/input.js',
  'js/palette.js',
  'js/items.js',
  'js/collectibles.js',
  'js/track-oval.js',
  'js/track-factory.js',
  'js/track-registry.js',
  'js/track-green-study.js',
  'js/track-steel-kitchen.js',
  'js/track-workbench.js',
  'js/track-cafe-marble.js',
  'js/track-dev-desk.js',
  'js/track-dining-oak.js',
  'js/haptics.js',
  'js/sw-update.js',
  'js/sound.js',
  'js/sound-params.js',
  'sounds/drift.mp3',
  'js/share-util.js',
  'js/share-card.js',
  'js/share.js',
  'share/template.png',
  'js/race-results.js',
  'js/platform.js',
  'js/cola.js',
  'js/tire-seed.js',
  'js/neon.js',
  'js/neon-draw.js',
  'tracks/green-study.svg',
  'tracks/steel-kitchen.svg',
  'tracks/workbench.svg',
  'tracks/cafe-marble.svg',
  'tracks/dev-desk.svg',
  'tracks/dining-oak.svg',
  'objects/cola.svg',
  'objects/cola-filled.svg',
  'js/game-engine.js',
  'js/pause.js',
  'js/confirm-exit.js',
  'js/state.js',
  'js/render.js',
  'js/track-surface.js',
  'icons/icon.svg',
  'icons/favicon.svg',
  'icons/settings.svg',
  'icons/icon-maskable.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
].map(p => BASE + p);

// Pre-cache all static assets on install
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  // NB: no eager skipWaiting — a fresh worker stays in "waiting" so the page (js/sw-update.js)
  // can show a "new version" nudge and the user chooses when to switch, instead of the page
  // being reloaded out from under them. The waiting worker activates on the message below.
});

// The update nudge (js/sw-update.js) asks the waiting worker to take over now.
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
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
// a forgotten bump self-heals. (Bumping is still useful: it installs a fresh worker
// and re-primes the precache; js/sw-update.js then nudges the player to switch to it.)
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
      }).catch(() => {
        if (cached) return cached;
        // Offline navigate: the requested URL may have a query string (e.g. game.html?track=x)
        // that wasn't pre-cached as an exact key.  Try the path without search params, then
        // fall back to the root (index.html) so the user sees the app shell instead of a blank page.
        if (e.request.mode === 'navigate') {
          const clean = new URL(e.request.url);
          clean.search = '';
          return caches.match(clean.href).then(r => r || caches.match(BASE));
        }
      });

      // Cache available — serve immediately; not available — wait for network (first visit).
      return cached || network;
    })
  );
});
