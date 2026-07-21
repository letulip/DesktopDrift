// SPA hash router (SPA Phase B). Owns the one #app container in index.html: on every hash change
// it destroys the current screen, clones the matching <template> into #app, and mounts the screen
// module with the parsed route. Menu screens only — game / sandbox / donate stay separate
// documents. Pure route parsing lives in js/route.js; the navigation seam in js/sound.js.
import { parseRoute, routeToHash } from './route.js';
import { setNavigator } from './sound.js';
import { createMenuScreen }         from './screens/menu.js';
import { createTracksScreen }       from './screens/tracks.js';
import { createZenScreen }          from './screens/zen.js';
import { createSelectScreen }       from './screens/select.js';
import { createModifyScreen }       from './screens/modify.js';
import { createSettingsScreen }     from './screens/settings.js';
import { createAchievementsScreen } from './screens/achievements.js';
import { createGameScreen }         from './screens/game.js';

// screen name → { make: factory(root, route), tpl: template id in the shell }
const REGISTRY = {
  menu:         { make: createMenuScreen,         tpl: 'tpl-menu' },
  tracks:       { make: createTracksScreen,       tpl: 'tpl-tracks' },
  zen:          { make: createZenScreen,          tpl: 'tpl-zen' },
  select:       { make: createSelectScreen,       tpl: 'tpl-select' },
  modify:       { make: createModifyScreen,       tpl: 'tpl-modify' },
  settings:     { make: createSettingsScreen,     tpl: 'tpl-settings' },
  achievements: { make: createAchievementsScreen, tpl: 'tpl-achievements' },
  game:         { make: createGameScreen,         tpl: 'tpl-game' },
};

// Old-style page → screen name, for translating hrefs (from soundThenGo / tapThenGo / <a href>)
// into hash routes. game.html routes in-document now (SPA Phase C). Anything not here
// (sandbox.html / donate.html / external) is a hard navigation.
const PAGE_TO_SCREEN = {
  'index.html': 'menu', 'tracks.html': 'tracks', 'zen.html': 'zen',
  'select.html': 'select', 'modify.html': 'modify',
  'settings.html': 'settings', 'achievements.html': 'achievements',
  'game.html': 'game',
};

let current = null;   // { screen, instance }

// The navigator installed into sound.js: route internal pages in-document, hard-nav the rest.
const navTo = (href) => {
  const raw = String(href);
  if (raw.startsWith('#')) { location.hash = raw.replace(/^#/, ''); return; }   // already a hash route
  const [page, query = ''] = raw.split('?');
  const clean = page.replace(/^\.?\//, '');                                     // strip ./ or /
  const screen = PAGE_TO_SCREEN[clean];
  if (!screen) { location.href = raw; return; }                                // game/sandbox/donate/external
  const q = new URLSearchParams(query);
  const hash = routeToHash(screen, {
    track: q.get('track'), mode: q.get('mode'),
    dir: q.get('dir') === 'rev' ? 'rev' : null,
    car: q.get('car'), dpr: q.get('dpr'), surface: q.get('surface'),
  });
  location.hash = hash.slice(1);   // '#/foo' → set hash 'foo…' → fires hashchange → render()
};

const render = () => {
  const route = parseRoute(location.hash || '');
  const def = REGISTRY[route.screen] || REGISTRY.menu;

  // Resolve the template BEFORE tearing anything down: if it were ever missing (a REGISTRY id
  // drifting from the shell markup), bail with the current screen still up instead of blanking #app.
  const tpl = document.getElementById(def.tpl);
  if (!tpl) { console.error('[router] missing template:', def.tpl); return; }

  if (current?.instance?.destroy) {
    try { current.instance.destroy(); } catch (e) { console.error('[router] destroy failed:', e); }
  }

  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(tpl.content.cloneNode(true));

  let instance = null;
  try { instance = def.make(document, route) || {}; }
  catch (e) { console.error('[router] mount failed:', route.screen, e); instance = {}; }
  current = { screen: route.screen, instance };
  window.scrollTo(0, 0);
};

// Global fallback for plain <a href="…"> clicks a screen did NOT intercept (zen / settings /
// achievements navigate via bare links, not soundThenGo). Screens that preventDefault + tapThenGo
// (tracks / select / modify / menu) are skipped via e.defaultPrevented, so no double navigation.
// Only same-tab primary clicks on internal pages are routed; game / sandbox / donate / external /
// in-page anchors fall through to a normal browser navigation.
const onDocClick = (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest?.('a[href]');
  if (!a || a.target === '_blank') return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || /^[a-z]+:/i.test(href)) return;    // in-page anchor / external protocol
  const clean = href.split('?')[0].replace(/^\.?\//, '');
  if (!PAGE_TO_SCREEN[clean]) return;                                     // game/sandbox/donate/unknown → hard nav
  e.preventDefault();
  navTo(href);
};

export const startRouter = () => {
  setNavigator(navTo);                       // route soundThenGo/tapThenGo in-document
  addEventListener('hashchange', render);
  document.addEventListener('click', onDocClick);   // catch bare-link navigations (F6)
  render();                                  // mount whatever the current hash is (empty → menu)
};
