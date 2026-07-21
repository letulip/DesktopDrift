// Settings screen — logic extracted verbatim from settings.html's inline module (SPA Phase A).
// The page is now a thin shell that calls createSettingsScreen(); behaviour is identical.
//
// Screen contract (Phase A): returns { destroy }. destroy() removes every listener the screen
// added, via the on() accumulator — the same pattern the engine uses (game-engine.js on()/stop()).
// Nothing calls destroy() yet (the router arrives in Phase B), but it must exist and be idempotent
// so a future mount/unmount leaves no dangling listeners. No rAF, no window/document listeners and
// no body-state classes here, so those parts of the contract are legitimately empty for this screen.
import { settings, save } from '../store.js';
import { initProfileSync } from '../profile-sync.js';
import { sfx } from '../sound.js';
import { VOLUME_LEVELS, levelForVolume } from '../sound-params.js';

export const createSettingsScreen = (root = document) => {
  const $ = (id) => root.getElementById(id);
  const s = settings();

  const listeners = [];
  const on = (el, type, fn) => { el.addEventListener(type, fn); listeners.push([el, type, fn]); };

  // Speed units
  const btnKmh = $('btn-kmh');
  const btnMph = $('btn-mph');
  const apply = (units) => {
    s.units = units;
    save();
    btnKmh.classList.toggle('sel', units === 'kmh');
    btnMph.classList.toggle('sel', units === 'mph');
  };
  on(btnKmh, 'click', () => apply('kmh'));
  on(btnMph, 'click', () => apply('mph'));
  apply(s.units ?? 'kmh');   // restore saved choice

  // Haptic feedback toggle — only shown when the Vibration API is available.
  if ('vibrate' in navigator) {
    const group  = $('haptics-group');
    const btnOn  = $('btn-hap-on');
    const btnOff = $('btn-hap-off');
    const applyHaptics = (enabled) => {
      s.haptics = enabled;
      save();
      btnOn .classList.toggle('sel', enabled);
      btnOff.classList.toggle('sel', !enabled);
    };
    on(btnOn,  'click', () => applyHaptics(true));
    on(btnOff, 'click', () => applyHaptics(false));
    group.style.display = '';   // show only on supported devices
    applyHaptics(s.haptics ?? true);
  }

  // Sound on/off — always shown. `quiet` skips the confirmation blip on the initial restore so
  // the page doesn't chirp on load.
  const btnSndOn  = $('btn-snd-on');
  const btnSndOff = $('btn-snd-off');
  const applySound = (enabled, quiet) => {
    s.soundEnabled = enabled;
    save();
    btnSndOn .classList.toggle('sel', enabled);
    btnSndOff.classList.toggle('sel', !enabled);
    if (enabled && !quiet) sfx.toggle();
  };
  on(btnSndOn,  'click', () => applySound(true));
  on(btnSndOff, 'click', () => applySound(false));
  applySound(s.soundEnabled ?? true, true);

  // Volume — three discrete levels (a button-row, no slider). Auditions the new level on click.
  const volBtns = {
    low:  $('btn-vol-low'),
    med:  $('btn-vol-med'),
    high: $('btn-vol-high'),
  };
  const applyVolume = (level, quiet) => {
    s.volume = VOLUME_LEVELS[level] ?? VOLUME_LEVELS.med;
    save();
    for (const k in volBtns) volBtns[k].classList.toggle('sel', k === level);
    if (!quiet && (s.soundEnabled ?? true)) sfx.tap();
  };
  for (const k in volBtns) on(volBtns[k], 'click', () => applyVolume(k));
  applyVolume(levelForVolume(s.volume), true);

  // Profile / Sync — export & import the full save (see js/profile-sync.js). Its listeners are
  // element-scoped (buttons/inputs inside #profile-group), so they are cleaned when the screen's
  // DOM subtree is removed on unmount — no separate teardown needed for Phase A.
  initProfileSync();

  const destroy = () => {
    while (listeners.length) { const [el, type, fn] = listeners.pop(); el.removeEventListener(type, fn); }
  };
  return { destroy };
};
