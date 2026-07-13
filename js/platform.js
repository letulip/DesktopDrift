// ─────────────────────────────────────────────────────────────────────────────
// Platform adapter — the ONLY platform file game code ever imports.
//
// This file is the default no-op adapter (GitHub Pages / portals without an
// SDK). A per-platform build (`npm run build -- --platform=<name>`) swaps this
// file's content for js/platform-<name>.js, which must export the same five
// functions:
//
//   init()            → Promise; resolves when the platform SDK is ready.
//   gameplayStart()   the race actually starts (called after the countdown).
//   gameplayStop()    the race ends, or the player exits to the menu.
//   commercialBreak() natural pause point → Promise. A real adapter shows an
//                     interstitial here and MUST mute sound and keep the game
//                     paused until the Promise resolves (pause.js pattern).
//                     The default resolves immediately.
//   happyMoment()     new record / achievement signal (e.g. CrazyGames
//                     happytime). Fire-and-forget.
//
// Adapters must never throw — game code calls these bare, with no try/catch.
// ─────────────────────────────────────────────────────────────────────────────

export const init = () => Promise.resolve();
export const gameplayStart = () => {};
export const gameplayStop = () => {};
export const commercialBreak = () => Promise.resolve();
export const happyMoment = () => {};
