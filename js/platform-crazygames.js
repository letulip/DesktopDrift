// ─────────────────────────────────────────────────────────────────────────────
// CrazyGames platform adapter — same five-function contract as js/platform.js
// (which this file replaces in `npm run build -- --platform=crazygames`).
//
// API verified against the CrazyGames HTML5 SDK v3 docs (07.2026):
//   https://docs.crazygames.com/sdk/intro/      script URL, SDK.init(), SDK.environment
//   https://docs.crazygames.com/sdk/game/       game.gameplayStart/Stop(), game.happytime()
//   https://docs.crazygames.com/sdk/video-ads/  ad.requestAd('midgame', callbacks)
//
// The SDK script is injected at runtime (no HTML edits). If it fails to load,
// init times out, or SDK.environment is 'disabled' (non-CrazyGames domain —
// where SDK calls THROW per the docs), `sdk` stays null and every function is
// a silent no-op. Adapters must never throw and must never leave the game
// muted — commercialBreak always unmutes before resolving, on every path.
//
// Game code never calls init() (see call sites in game-engine.js /
// race-results.js), so the adapter kicks off its own init at import; init()
// returns that same shared promise and stays idempotent.
// ─────────────────────────────────────────────────────────────────────────────
import { setMuted } from './sound.js';

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const INIT_TIMEOUT_MS = 5000;        // script load / SDK.init() budget, each
const AD_REQUEST_TIMEOUT_MS = 15000; // SDK never answered the ad request
const AD_PLAYBACK_TIMEOUT_MS = 90000; // ad started but never finished (watchdog)

let sdk = null;     // window.CrazyGames.SDK once usable; null ⇒ every call no-ops
let _initP = null;  // shared init promise (idempotent)

// Reject `promise` after `ms` — timer cleared on settle so no timer lingers
// (a leftover setTimeout would keep the Node test process alive).
const withTimeout = (promise, ms) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), ms);
  promise.then(
    v => { clearTimeout(timer); resolve(v); },
    e => { clearTimeout(timer); reject(e); },
  );
});

const loadScript = () => new Promise((resolve, reject) => {
  if (typeof document === 'undefined') { reject(new Error('no DOM')); return; }
  const s = document.createElement('script');
  s.src = SDK_URL;
  s.onload = resolve;
  s.onerror = () => reject(new Error('SDK script failed to load'));
  document.head.appendChild(s);
});

const doInit = async () => {
  try {
    await withTimeout(loadScript(), INIT_TIMEOUT_MS);
    const candidate = typeof window !== 'undefined' && window.CrazyGames?.SDK;
    if (!candidate) return;
    await withTimeout(candidate.init(), INIT_TIMEOUT_MS);
    // 'disabled' = foreign domain, SDK methods throw — stay a silent no-op.
    // 'local' (localhost) shows demo ads, which is the SDK's own QA mode.
    if (candidate.environment !== 'disabled') sdk = candidate;
  } catch (e) {
    console.warn('CrazyGames SDK unavailable — platform features off:', e.message || e);
  }
};

export const init = () => (_initP ??= doInit());

export const gameplayStart = () => { try { sdk?.game.gameplayStart(); } catch (e) { /* never throw into game code */ } };
export const gameplayStop  = () => { try { sdk?.game.gameplayStop();  } catch (e) { /* never throw into game code */ } };
export const happyMoment   = () => { try { sdk?.game.happytime();     } catch (e) { /* never throw into game code */ } };

// Midgame interstitial at the results-screen restart (the canonical slot —
// never mid-race). Mutes on adStarted; unmutes + resolves on adFinished,
// adError, or the watchdog timeout — whichever comes first, exactly once.
export const commercialBreak = () => {
  if (!sdk) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    let timer;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      setMuted(false);   // never leave the game muted
      resolve();
    };
    const arm = (ms) => { clearTimeout(timer); timer = setTimeout(finish, ms); };
    arm(AD_REQUEST_TIMEOUT_MS);
    try {
      sdk.ad.requestAd('midgame', {
        adStarted:  () => { if (done) return; setMuted(true); arm(AD_PLAYBACK_TIMEOUT_MS); },
        adFinished: finish,
        adError:    finish,
      });
    } catch (e) {
      finish();
    }
  });
};

// Self-start: game code never calls init() (the no-op default needs none).
init();
