// Game screen for the SPA shell (SPA Phase C). Ports game.html's inline bootstrap into the screen
// contract createGameScreen(root, route) -> { destroy }. The race runs in-document, so restart and
// exit keep the single session AudioContext alive (no location.reload / hard nav). Menu screens and
// the game now share one document. game.html stays a standalone page (deep-link back-compat); its
// own inline bootstrap is unchanged and startGame's opts default to that standalone behavior.
import { TRACKS } from '../track-registry.js';
import { startGame } from '../game-engine.js';
import { reverseTrack } from '../track-util.js';
import { optsFromRoute } from '../route.js';
import { setDeviceTuning } from '../render.js';
import { soundThenGo } from '../sound.js';

export const createGameScreen = (root = document, route = null) => {
  const o = optsFromRoute(route ?? {});
  // Sandbox = mode=sandbox with no track → the un-registered oval free-drive (stock car, infinite
  // laps). Everything else is a registered Time Attack / Zen track.
  const isSandbox = o.stock && !o.trackId;
  const meta = isSandbox ? null : TRACKS.find(t => t.id === o.trackId);
  const html = document.documentElement;
  const prevTitle = document.title;

  let engine = null;    // current startGame() api ({ stop })
  let T = null;         // resolved (possibly reversed) track module
  let destroyed = false;

  // Invalid / missing track (Time Attack / Zen only) → bounce back to the picker via a hash nav (no
  // hard reload). Return an inert screen; the queued hashchange re-renders. Nothing mounted yet.
  if (!isSandbox && !meta) {
    location.replace('#/' + (o.zen ? 'zen' : 'tracks'));
    return { destroy() {} };
  }

  // Enter game chrome: full-viewport no-scroll (base.css .fixed-viewport), Zen HUD state, tab title,
  // and any ?dpr/?surface device knob from the hash (standalone pages read location.search instead).
  html.classList.add('fixed-viewport');
  document.body.classList.toggle('zen', o.zen);
  document.body.classList.toggle('sandbox', isSandbox);   // hides the tpl-game "tires" row (no economy)
  document.title = isSandbox
    ? 'Desktop Drift — Sandbox Free Drive'
    : `Desktop Drift — ${meta.name}${o.reversed ? ' (Reversed)' : ''}`;
  setDeviceTuning(route?.dpr ?? null, route?.surface ?? null);

  const start = () => {
    if (destroyed) return;   // navigated away (e.g. Back during a commercialBreak before onRestart) — don't mount a zombie
    engine = startGame(T, { ...o, onExit: exit, onRestart: restart });
  };

  // In-place restart: stop the current engine (also clears a finished results overlay) and start a
  // fresh race in the SAME mounted template — keeps the AudioContext. Do NOT re-set the hash: an
  // identical #/game fires no hashchange, so the router would never re-render.
  const restart = () => { if (engine) engine.stop(true); start(); };

  // Exit to the menu through the navigator seam (in-document hash nav; the router then destroys us).
  const exit = () => soundThenGo('index.html', 'back');

  // Dynamic import: sandbox is the un-registered oval; Time Attack / Zen load the chosen track. The
  // track module has a top-level await (SVG/geometry), so this resolves only once it is fully parsed.
  // reverseTrack is a pure transform of the parsed track (never applied to the sandbox oval).
  const trackModule = isSandbox ? '../track-oval.js' : `../track-${meta.id}.js`;
  import(trackModule).then(mod => {
    if (destroyed) return;                                  // navigated away before the track loaded
    T = (o.reversed && !isSandbox) ? reverseTrack(mod) : mod;
    start();
  }).catch(err => {
    console.error('[game screen] failed to load track:', err);
    if (!destroyed) location.replace('#/' + (o.zen ? 'zen' : 'tracks'));
  });

  return {
    destroy() {
      destroyed = true;
      if (engine) engine.stop(true);   // tears down the engine + pause/confirmExit/results overlays + drift audio
      engine = null;
      html.classList.remove('fixed-viewport');
      document.body.classList.remove('zen');
      document.body.classList.remove('sandbox');
      document.title = prevTitle;
    },
  };
};
