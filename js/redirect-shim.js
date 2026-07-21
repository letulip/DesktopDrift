// Redirect shim for the legacy per-page URLs → the SPA shell hash route (SPA Phase B, B3).
// Each old <page>.html now loads only this module; it maps the page + its query string to
// index.html#/<screen>?... and replaces the history entry. Keeps bookmarks / deep links / the
// game's on-error redirects (game.html → tracks.html/zen.html) working after the markup moved into
// index.html's <template>s. game / sandbox / donate stay real pages and are NOT shimmed.
import { routeToHash } from './route.js';

const PAGE_TO_SCREEN = {
  'tracks.html': 'tracks', 'zen.html': 'zen', 'select.html': 'select',
  'modify.html': 'modify', 'settings.html': 'settings', 'achievements.html': 'achievements',
};

const page = location.pathname.split('/').pop() || '';
const screen = PAGE_TO_SCREEN[page] || 'menu';
const q = new URLSearchParams(location.search);

location.replace('index.html' + routeToHash(screen, {
  track:   q.get('track'),
  mode:    q.get('mode'),
  dir:     q.get('dir') === 'rev' ? 'rev' : null,
  car:     q.get('car'),
  dpr:     q.get('dpr'),
  surface: q.get('surface'),
}));
