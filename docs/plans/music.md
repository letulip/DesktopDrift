# Music — menu + race soundtrack

Status: **plan for review.** Tasks 1–4 of the settings/audio batch shipped; this is the design for
task 5 (music + a settings control). Nothing here is built yet — the open decisions at the bottom
gate the implementation.

## What Phase C unlocked (why now)

Before the SPA, every page was a fresh document with a fresh, suspended `AudioContext`; music would
restart on every navigation. Phase C made the whole app **one document → one AudioContext for the
session** (`sound.js` `_ctx`, created lazily, never `.close()`d). So music can be a **session-long
track that crossfades between menu and race**, not a per-screen restart. This was the stated payoff
of the SPA migration (`docs/plans/spa-migration.md` §Why #2).

## Architecture — a music layer on the shared context

`js/sound.js` already owns the session `AudioContext` and, on it, two continuous **layers** beside
the one-shot SFX: the drift slide + the static bed (`_driftSrc` / `_bedSrc`). Music is a third layer
of the same shape, but big enough (asset loading, crossfade, menu/race state, its own settings +
gain) to live in its **own module** `js/music.js` (SoC), sharing `sound.js`'s context.

```
sound.js  _ctx ──┬── SFX bus → lowpass → (dry + reverb) → destination   (existing)
                 ├── drift/bed layers → destination                      (existing)
                 └── music gain → destination                            (NEW, js/music.js)
```

- **Shared context.** `sound.js` exposes a small `ensureAudioContext()` (returns `_ctx`, creating it
  lazily like `_ensureCtx`) so `music.js` connects its own gain node to `_ctx.destination`. Music
  gain is **independent** of the SFX master (`_bus`) and the SFX volume setting.
- **Ad-mute / suspend / unlock come for free.** `setMuted()` (the platform ad break) calls
  `suspend()`, which suspends the **whole** `_ctx` — so a music source on `_ctx` pauses too, and
  `resume()` continues it. Same for the visibility auto-suspend and the first-gesture unlock. So
  music automatically honors `commercialBreak()` (must mute + hold, `js/platform.js`) and the
  once-per-session unlock **without duplicating any of that logic** — verify, don't rebuild.
- **Independent enable.** Music is gated by its **own** `musicVolume` setting, NOT `soundEnabled`
  (SFX off + music on is a valid combo). The context-level suspend (ad-mute/visibility) still applies
  to both.

## Scene state (menu ↔ race)

`music.js` tracks the current scene and drives its gain toward a target:

- The **router** (`startRouter`/`render`) tells music the scene on each mount: game screen →
  `music.setScene('race')`, any menu screen → `music.setScene('menu')`. (One call in `render()`.)
- **Phase 1 (recommended first cut):** ONE ambient loop for the whole session; during a race it
  **ducks** a few dB so the engine/drift/SFX sit on top, and returns to full in menus. Simple, one
  asset, no crossfade seams.
- **Phase 2:** a second, more driving race loop that **crossfades** with the menu loop on scene
  change (two sources, gains ramped opposite). More music, more asset weight.

## Settings control

The Volume UI is deliberately **three discrete buttons, no slider** (`sound-params.js` comment;
`settings.js`). To stay consistent — and to fit the new inline settings rows (task 1) — add a
**Music row** mirroring it: label left, `[Off] [Low] [Med] [High]` right (Off = level 0). A free
slider would be the only slider in the app; a discrete row matches. `musicVolume` maps to a music
gain the same way `gainForVolume` maps the SFX volume (linear; kept gentle).

> Owner floated "maybe a volume slider?" — captured as open decision #2 (discrete row vs slider).

## Persistence

`settings` gains **`musicVolume`** (0..1; 0 = off). Because `store.js` loads via
`_merge(defaults(), migrate(raw))` — which fills any missing field from the defaults — simply adding
`musicVolume` to the `defaults()` settings literal auto-heals every existing save (exactly how
`haptics`/`volume` already behave). **No migration function needed**, and no VERSION bump for this
field. New pure test: the default settings shape includes `musicVolume` (extend the store tests).

## Where it starts (SPA lifecycle)

- `startRouter()` (or `sound.js` unlock) kicks `music.js`: it primes the loop and, once the context
  is unlocked + `musicVolume > 0`, starts the source at the scene's target gain. Like SFX, nothing
  is audible until the first user gesture unlocks `_ctx` (browser autoplay policy) — `sound.js`
  already arms those unlock listeners; music just needs to (re)apply its gain when the context
  resumes. Expose a `music.onUnlock()` hook that `sound.js`'s unlock calls, or have music read
  `_ctx.state`.
- Changing `musicVolume` in settings auditions live (ramp the music gain), same as the Volume row
  auditions SFX.

## The asset — the real fork

The game's audio ethos is "**a seasoning, not a soundtrack**" — every SFX is a procedural sine
chime, the only audio file is `sounds/drift.mp3`. Two ways to add music:

- **A) A looping file** (`sounds/music-*.mp3|ogg`). Richer, easy to author/swap. Costs: a binary
  asset (~100–500 KB/loop) in the SW precache, and **licensing** — needs a royalty-free or original
  track (I can't source/author audio; the owner supplies it).
- **B) Procedural ambient** generated on the `AudioContext` (slow sine/triangle pad + a gentle
  arpeggio from a scale, like an elaborated static bed). Costs: more dev, and care to not sound
  cheap. Benefits: **no binary asset, no licensing, matches the procedural DNA**, tiny footprint,
  and it can react to game state (key/tempo per track) later.

Given the codebase philosophy + no-licensing preference, **B (procedural ambient)** is the more
in-character choice and avoids the asset/licensing dependency; **A** ships a real tune faster if the
owner has/wants a specific track. This is the decision that most shapes the build.

## Testing

- **Pure (unit):** `musicVolume` → gain mapping; the scene→target-gain table (menu vs race duck);
  clamp of `musicVolume`. Extend `tests/sound-params.test.js` / a new `tests/music.test.js`, plus the
  store-default tests for the new field.
- **Structural (browser click-test):** music starts on first gesture; ducks entering a race and
  returns on exit; the Music settings row auditions + persists; **ad-mute** (a `commercialBreak`
  simulation → context suspend) silences music and it resumes after; no drone/leak across
  menu↔race↔restart; one AudioContext across the whole session (no per-nav restart).

## Implementation order (once decisions are locked)

1. `sound.js`: export `ensureAudioContext()` + an unlock hook. (small, pure-ish)
2. `js/music.js`: context-shared music gain + loop (procedural or file per decision #1) + `setScene`
   duck + `setVolume`. Pure level→gain + scene→gain helpers unit-tested first.
3. `store.js`: add `musicVolume` to defaults (+ test). No migration.
4. Settings: a Music row in `tpl-settings` + `settings.js` wiring (mirrors the Volume row, in the new
   inline layout).
5. Router: `music.setScene(...)` in `render()` (game vs menu).
6. SW: add `js/music.js` (+ any music asset) to ASSETS; bump cache.
7. Browser click-test (per the pr skill) + owner playtest for feel/volume.

## Open decisions for the owner

1. **Asset:** procedural ambient (in-character, no licensing, more dev) **[recommended]** vs a loop
   file (richer/faster, but you supply a royalty-free/original track + SW size).
2. **Settings control:** discrete Music row `[Off][Low][Med][High]` **[recommended, consistent]** vs
   a volume slider.
3. **Default:** music default-ON at a modest level (audible but subtle) vs default-OFF (opt-in).
   Recommend a **modest default-ON** so players hear it, matching the "make it audible" spirit of the
   volume-default change — but it's the most reversible of the three.
4. **Scope now:** Phase 1 only (one ducked ambient loop) **[recommended first PR]** vs Phase 1+2
   (separate menu/race loops with crossfade) in one go.

## Explicitly out of scope (this feature)

- Per-track music / dynamic tempo tied to combo or speed (a fun future, not now).
- Any change to the SFX system, the drift layers, or the volume curve.
- A full mixer UI — the Music row is the only new control.
