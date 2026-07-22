// Desktop Drift — Service Worker
// Cache version: bump this string to force all clients to re-download assets.
const CACHE = 'desktop-drift-v237';

// Build absolute URLs relative to this SW's own location so the same file
// works on http://localhost:8777/ and https://letulip.github.io/DesktopDrift/
const BASE = new URL('.', self.location).href;
// Mood overlays (cars/emotions/) are a regular car x emotion grid — generate the
// 88 paths instead of hand-listing them. Precached (unlike items/ and objects/)
// because moods are PAID cosmetics: activate deletes old caches on every version
// bump, so a lazily runtime-cached mood would vanish offline after an update.
// tests/sw-assets.test.js asserts this grid matches cars/emotions/ on disk.
const MOOD_CARS = ['bavarian', 'bismark', 'catana', 'horse', 'panda', 'plum', 'smasher', 'toretto'];
const MOODS = ['angry', 'bored', 'evil', 'joy', 'lol', 'love', 'puzzled', 'questioned', 'sleep', 'smug', 'tired'];
const MOOD_ASSETS = MOOD_CARS.flatMap(car => MOODS.map(m => `cars/emotions/${car}-${m}.svg`));

// Item + collectible art (items/*.svg + the tire coin). PRECACHED, not runtime-cached: activate
// (below) deletes every non-current cache on each version bump, and the runtime cache lives in that
// SAME versioned cache — so lazily-cached art vanished offline after every deploy, and any track
// never opened online under the current cache version had no item art at all (it fell back to
// procedural placeholders). Precaching fixes both, and cold offline starts too — same reasoning as
// the moods above. Only the art actually referenced by items.js / collectibles.js is listed;
// tests/sw-assets.test.js asserts this covers every imgSrc/imgFull and has no stale/missing entry.
const ITEM_ASSETS = [
  'objects/tire.svg',
  'items/card-knife-ready.svg',
  'items/comb-ready.svg',
  'items/compass-ready.svg',
  'items/compass2-ready.svg',
  'items/cook-knife-ready.svg',
  'items/corrector-ready.svg',
  'items/cup-ready.svg',
  'items/cutlery-set1-ready.svg',
  'items/cutlery-set2-ready.svg',
  'items/daily-ready.svg',
  'items/doughnut-1-ready.svg',
  'items/doughnut-2-ready.svg',
  'items/doughnut-3-ready.svg',
  'items/drill-ready.svg',
  'items/ducttape-dispensor-ready.svg',
  'items/fork1-ready.svg',
  'items/fork2-ready.svg',
  'items/fries1-ready.svg',
  'items/fries2-ready.svg',
  'items/gloves1-ready.svg',
  'items/grater-ready.svg',
  'items/horseshoe-ready.svg',
  'items/hummer1-ready.svg',
  'items/kitchen-board-1-ready.svg',
  'items/kitchen-board-2-ready.svg',
  'items/knife1-ready.svg',
  'items/knife2-ready.svg',
  'items/knife3-ready.svg',
  'items/laptop-open-ready.svg',
  'items/laptop-ready.svg',
  'items/mitten-ready.svg',
  'items/mixer2-ready.svg',
  'items/nails1-ready.svg',
  'items/nails2-ready.svg',
  'items/notebook2-ready.svg',
  'items/opener-ready.svg',
  'items/pan-steer-ready.svg',
  'items/pan1-ready.svg',
  'items/pen-pencil-ready.svg',
  'items/pen1-ready.svg',
  'items/pencil-plus-ready.svg',
  'items/pencil-ready.svg',
  'items/pencil2-ready.svg',
  'items/phone1-ready.svg',
  'items/phone2-ready.svg',
  'items/plate-bbq-ready.svg',
  'items/plate-chicken-ready.svg',
  'items/plate-mashed-chicken-ready.svg',
  'items/plate-sausage-ready.svg',
  'items/plate-soup1-ready.svg',
  'items/plate-soup2-ready.svg',
  'items/plate-soup3-ready.svg',
  'items/plate1-ready.svg',
  'items/plate1-yellow-ready.svg',
  'items/plate2-ready.svg',
  'items/rubber-duck-ready.svg',
  'items/ruler-plus-ready.svg',
  'items/ruler-ready.svg',
  'items/ruler2-ready.svg',
  'items/screwdriver1-ready.svg',
  'items/screwdriver2-ready.svg',
  'items/smartphone1-ready.svg',
  'items/smartphone2-ready.svg',
  'items/spatula1-ready.svg',
  'items/spatula2-ready.svg',
  'items/stapler-ready.svg',
  'items/tablet-10inch-ready.svg',
  'items/toolset1-ready.svg',
  'items/toolset2-ready.svg',
  'items/trident1-ready.svg',
  'items/washer-ready.svg',
  'items/wrench1-ready.svg',
  'items/wrench2-ready.svg',
  'items/writing-board-ready.svg',
];

// Pre-cache: HTML, CSS, ALL js modules (critical for startup), track geometry SVGs, and now the
// item/collectible art too (see ITEM_ASSETS above — runtime caching lost it on every update). When
// adding a new js module, add it here; a new item SVG goes in ITEM_ASSETS (a test guards both).
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
  'js/route.js',
  'js/router.js',
  'js/redirect-shim.js',
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
  'js/emotion-overlay.js',
  'js/finish.js',
  'js/wallet-history.js',
  'js/profile-io.js',
  'js/profile-sync.js',
  'js/screens/menu.js',
  'js/screens/settings.js',
  'js/screens/achievements.js',
  'js/screens/zen.js',
  'js/screens/tracks.js',
  'js/screens/select.js',
  'js/screens/modify.js',
  'js/screens/game.js',
  'js/screens/donate.js',
  'js/physics.js',
  'js/render-config.js',
  'js/track-util.js',
  'js/track-thumb.js',
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
  ...MOOD_ASSETS,
  ...ITEM_ASSETS,
].map(p => BASE + p);

// Split the precache into a critical shell (the app can't run offline without it → atomic addAll,
// all-or-nothing) and best-effort art (item/mood/icon/sound SVGs + PNGs). A single failed cosmetic
// asset must NOT reject the whole install and leave the client with no offline cache at all — that
// was the "sometimes doesn't load offline" risk, made worse by the larger art set. Best-effort art
// still (re)caches on install; anything that slips through is picked up by the runtime cache later.
const isCritical = (url) =>
  url === BASE ||
  /\.(html|css|js|woff2)$/.test(url) ||
  /\/manifest\.json$/.test(url) ||
  /\/tracks\/[^/]+\.svg$/.test(url);   // track geometry — a track can't load offline without its SVG
const CRITICAL    = ASSETS.filter(isCritical);
const BEST_EFFORT = ASSETS.filter(u => !isCritical(u));

// Pre-cache on install: the shell atomically, the art best-effort.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c =>
    c.addAll(CRITICAL).then(() => Promise.allSettled(BEST_EFFORT.map(u => c.add(u))))
  ));
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
