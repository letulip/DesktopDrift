// Desktop Drift — Service Worker
// Cache version: bump this string to force all clients to re-download assets.
const CACHE = 'desktop-drift-v36';

// Build absolute URLs relative to this SW's own location so the same file
// works on http://localhost:8777/ and https://letulip.github.io/DesktopDrift/
const BASE = new URL('.', self.location).href;
// Pre-cache: HTML, CSS и ВСЕ js-модули (критичны для старта — должны быть
// доступны до первого офлайн-визита). SVG из items/ и objects/ намеренно НЕ
// здесь — их десятки, они подхватываются runtime-кэшем (fetch-хэндлер ниже)
// при первом запросе. Добавляя новый js-модуль, впиши его сюда.
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
  'js/race-results.js',
  'tracks/green-study.svg',
  'tracks/steel-kitchen.svg',
  'js/game-engine.js',
  'js/pause.js',
  'js/confirm-exit.js',
  'js/state.js',
  'js/render.js',
  'icons/icon.svg',
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

// Stale-while-revalidate: отдаём из кэша мгновенно (быстро + оффлайн), но В ФОНЕ
// всегда идём в сеть и обновляем кэш. Так свежий код доезжает до игрока на СЛЕДУЮЩЕЙ
// загрузке даже если забыли бампнуть CACHE — забытый бамп самозалечивается.
// (Бамп всё ещё полезен: гарантирует обновление на ПЕРВОЙ же загрузке через skipWaiting.)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(BASE)) return; // игнорируем cross-origin

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Параллельно с отдачей кэша тянем сеть и переписываем кэш свежим ответом.
      const network = fetch(e.request).then(resp => {
        if (resp.ok) {
          // Клонируем сразу — до любых await/then, пока тело ещё не начали читать.
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached); // оффлайн → довольствуемся кэшем

      // Есть кэш — отдаём немедленно; нет — ждём сеть (первый визит).
      return cached || network;
    })
  );
});
