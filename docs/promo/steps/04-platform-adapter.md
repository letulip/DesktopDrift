# Step 04 — Platform adapter layer + per-platform build (builder task)

**Status:** not started · **Unblocks Wave 2** (CrazyGames, Yandex) and Wave 3
**When:** in parallel with Wave 1 submissions. Effort: 1–2 builder sessions
(adapter + build flag), then ~1 session per SDK adapter.
**Who:** builder (via desktopdrift-pr skill — branch, tests, SW bump, PR).

## Goal

One thin seam so every portal SDK plugs in without touching game code, plus a
build flag that produces per-platform `dist/` variants.

## Design (KISS — mirrors the existing self-contained-component pattern)

### `js/platform.js` — the only file game code ever imports

```
init()                 // resolves when the platform SDK is ready (no-op default)
gameplayStart()        // race actually starts (after countdown)
gameplayStop()         // race ends / player exits to menu
commercialBreak()      // natural pause point — returns a Promise; default resolves
                       // immediately. Adapter shows an interstitial; MUST mute
                       // sound + pause the loop while showing (pause.js pattern)
happyMoment()          // new record / achievement — some SDKs (CrazyGames
                       // happytime) want these signals; default no-op
```

- Default export = the **no-op adapter** (GitHub Pages / itch / NG / GJ builds).
- Call sites (builder wires exactly these, nothing more):
  - `game-engine.js`: `gameplayStart()` after countdown; `gameplayStop()` +
    `happyMoment()` (on new record) in the finish path.
  - `race-results.js` (or engine restart path): `commercialBreak()` on
    restart/next-race — the canonical interstitial spot, NOT mid-race.
- New pure logic = unit test in the same change (adapter selection, no-op
  contract).

### Build flag in `scripts/build.js`

- `npm run build -- --platform=<none|crazygames|yandex|gd|gamepix>`.
- What it does per platform:
  1. Swaps `js/platform.js` for `js/platform-<name>.js` (adapter includes the
     SDK `<script>`/import per that platform's docs).
  2. **Strips SW registration** from all HTML (portals serve from their CDN;
     stale-while-revalidate caching on foreign origins is asking for trouble).
  3. **Strips external links** (`donate.html` link, YouTube/GitHub links) when
     the platform forbids them (Yandex: mandatory; CrazyGames: keep clean too).
  4. Prunes non-game files from `dist/` (SEO verification files, sitemap).
- Output `dist-<platform>/` + zip. The default `npm run build` stays byte-identical
  to today's output (no regression for GitHub Pages CI).

## Order of adapters

1. `platform-crazygames.js` (Step 05) — SDK: init, gameplayStart/Stop, happytime,
   ad break.
2. `platform-yandex.js` (Step 06) — SDK: ysdk init + LoadingAPI.ready(),
   fullscreen adv at the same break points; RU strings if moderation demands
   (see Step 06).
3. `platform-gd.js` / `platform-gamepix.js` (Step 07) — same seam, smaller SDKs.

## Done when

- `npm test` green; default build unchanged (diff `dist/` before/after).
- `--platform=crazygames` zip boots locally with the SDK in test mode, ads fire
  on restart, sound mutes during the break.
- AGENTS.md documents the seam + flag; SW cache bumped (game JS changed).
