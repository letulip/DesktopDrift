# SPA Phase C — bring the game into the shell

**Branch:** `feat/spa-phase-b` (continue on it; Phase B not yet shipped).

## What this actually is (read first)

Smaller than the ledger volume implies. Three subsystems are *already* Phase-C-ready and need **zero** code change:

- **Audio** — `sound.js` `_ctx` is lazy + memoized, never `.close()`d; unlock/visibility listeners register once at import (module-cached). A single AudioContext across in-document races is exactly what we want. Do **not** add per-race teardown.
- **Track geometry** — `center/inner/outer/checkpoints/TABLE` are never assigned during a race. Only `cones[]` element fields are mutated. `props[]`/`collectibles[]` are read-only per race.
- **`initRender()`** — already re-derives every *non-DOM* per-mount value (trackPath, cone paths, MINI transform, HUD prev-guards). The only things it doesn't re-do are the DOM refs and `resize()`.

So the real work is: **2 pure reset helpers + 1 pure route helper + 1 pure resolver pair**, a `const→let` + `initCanvas()` in `render.js`, injected exit/restart callbacks + a `gameplayActive` flag in the engine, one new `js/screens/game.js`, one `<template>` + one router line + one CSS `<link>` in the shell, and a SW bump. That's it. No factory-ization, no framework, no physics/feel change, no save-schema change.

The crutch we are removing: today "Race Again" = `location.reload()` and "exit" = `location.href='index.html'` (`game-engine.js:315-316`), and `race-results.js:44` = `location.reload()`. Full-document teardown frees rAF loops, listeners, audio nodes, and module state for free. In the shell there is no reload, so the engine must be re-entrant.

---

## Hazard ledger

Blockers first. Every row cites a line I read on `feat/spa-phase-b`.

| id | class | severity | what | minimal fix |
|----|-------|----------|------|-------------|
| **S-RESET-SCALARS** | S-state | **blocker** | `startGame` resets only `S.zen`/`S.reversed`/`S.caps`/`S.carModel` + `initCar` (`game-engine.js:56,58,85,333`). Every other `S` field (`state.js:12-51`) keeps last-race values. Worst: stale `S.score` (next race starts pre-scored), stale `S.startCd` rests ≤0 so the `if (S.startCd>0)` countdown block (`game-engine.js:388`) is **skipped entirely** → no 3-2-1, `sfx.go()`/`gameplayStart()` (`:392`) never fire, `S.goT` never set; stale `S.lapNum`/`S.bestLap`/`S.lastLap`. | Add `resetState()` to `state.js` that mutates `S` in place to defaults + clears `keys`/`pointers`; call it as the first line of `startGame`. |
| **H2 / R1 / IR-6** | render-reinit | **blocker** | `render.js` captures **all** game DOM at import: `canvas`(`:10`), `ctx=canvas.getContext`(`:14`, throws on null `#c`), `miniEl`/`mctx`(`:15-16`, `:16` throws), 11 `_hud*` refs(`:19-29`, return null silently, throw at first `draw()`), `resize()`+listener(`:64`). In the shell `render.js` is imported **once** (module-cached). Import before any `#c` → `getContext` TypeError at import; if the game screen is a static import in `router.js` this takes down the **whole shell**. Remount (router re-clones `#app`) → old refs point at detached nodes → black canvas + dead input + frozen HUD (no throw — see the `game-engine.js:323-324` note documenting exactly this freeze). | `const→let` for canvas/ctx/miniEl/mctx/`_hud*`; add idempotent `initCanvas(root)` that re-acquires all of them + calls `resize()`; guard `resize()` with `if(!canvas)return`; drop the top-level `resize()` call and getElementById calls. |
| **IR-1** | integration-routing | **blocker** | No `game` screen exists: `SCREENS` (`route.js:10`) lacks `'game'`; `REGISTRY`/`PAGE_TO_SCREEN` (`router.js:16-32`) omit it; no `tpl-game`. Nothing can mount the game in-document. | Add `'game'` to `SCREENS`; add `<template id="tpl-game">` with `#c`+`#hud` subtree; add `REGISTRY.game`; add `js/screens/game.js` → `createGameScreen(root,route)`. |
| **S-RESET-LAPSCORES** | S-state | high | `S.lapScores` (`state.js:40`) pushed per lap (`game-engine.js:513,598`), trimmed only in infinite mode (`:599`), never cleared on start. At finish `totalTime = S.lapScores.reduce(…)` (`:517`) → `pps` (`:519`) → payout + persisted best-PPS record (`:563-568`). A fixed-lap restart sums the **previous** race's lap times → corrupt payout **and** persisted record. | `S.lapScores.length = 0` inside `resetState()` (in place). |
| **H3 / IR-5 (exit)** | engine-lifecycle | high | In-race menu exit hard-navigates: `onExit:()=>{gameplayStop();location.href='index.html'}` (`game-engine.js:315`); `onRestart:()=>location.reload()` (`:316`). In the shell both reload the whole SPA, killing the single AudioContext — defeats the one-document win. | Inject `onExit`/`onRestart` via `opts` (defaults preserve standalone behavior); shell passes seam-routed exit + in-place restart. |
| **H4 / IR-5 (restart)** | engine-lifecycle | high | Results "Race Again" = `commercialBreak().then(()=>setTimeout(()=>location.reload(),100))` (`race-results.js:44`). "Back to tracks" (`:47`) already uses `soundThenGo` → seam-friendly, so only restart is broken. | `createRaceResults({onRestart})`; call injected `onRestart` instead of reload; default keeps standalone reload. |
| **H5** | engine-lifecycle | high | `pause`/`confirmExit`/`raceResults` append to `document.body`, not `#app`, so a router `#app` re-clone doesn't remove them. At finish `stop()` runs with `raceFinished=true` and **keeps** `raceResults` alive (`:634`) and `setActive(null)` (`:635`). On Race-Again the registry is already empty → `startGame`'s `prev.stop()` path (`:45-49`) doesn't fire → the stranded results overlay isn't torn down → `createRaceResults()` (`:259`) builds a **second** `#raceResultsOverlay` with orphaned live listeners. | Add `stop(full=false)`; expose on `api`; `createGameScreen.destroy()` and pre-restart call `api.stop(true)` to remove all three body overlays. |
| **cone-state-survives-restart** | track-mutable | high | `cones[]` elements keep `knocked/vx/vy/spin/ang` and drifted `x/y` across races: track module (hence `cones`) is ES-module-cached, `startGame` never resets cones (`game-engine.js:50` destructure only), and `reverseTrack` shares the same array (`track-util.js:321` `{...T}`). Cones mutated at `game-engine.js:215-221` + `collision.js:133,151`. Restart → pre-knocked cones sit displaced and `if(c.knocked)return` (`:215`) makes them non-colliding ghosts; `conesHit` stat (`:282`) inflated. | Store `x0/y0` in `placeCones` (`track-util.js:105,109`); add pure `resetCones(cones)`; call it after the destructure and **before** `initRender(T)` in `startGame`. |
| **IR-2** | integration-routing | high | `index.html` doesn't link `css/sandbox.css` (`:26-35` = base + 9 menu sheets, no sandbox). A mounted `tpl-game` renders unstyled HUD/overlays. Collision audit **verified safe**: index uses `.cust-panel`/`[data-panel]` not `.panel`; `body.zen` appears in no non-sandbox CSS. | Add `<link rel="stylesheet" href="css/sandbox.css">` after the menu sheets. Optionally tighten `sandbox.css:2` `canvas{}` → `#c{}`. |
| **IR-3** | integration-routing | high | Game needs `html.fixed-viewport` (`base.css:74-77`: height 100%, overflow hidden, touch-action none); shell `<html>` has no class (`index.html:2`) so menus scroll (`base.css:63-65`). Nothing toggles it. | `createGameScreen` adds `fixed-viewport` on mount, removes on destroy. Do **not** hard-code it on the shell `<html>`. |
| **AP-1** | audio-platform | medium | Drift + static-bed loop sources (`sound.js:178-179,198`) are hard-stopped only by `stopDrift()` (`:209-214`), reached only via engine `stop()` (`game-engine.js:627`). **Correction to ledger**: confirmExit is *not* the trigger (it pauses first → paused frame `drift(false,0)` at `:386` schedules stop). The real leak is a **router-driven `destroy()` mid-drift** (hash nav / browser Back): frame loop cancelled before it can hush → looping sources drone into the next screen. | `createGameScreen.destroy()` must reach engine `stop()` (→ `stopDrift()`). Covered by the H5 `api.stop(true)` wiring. No `sound.js` change. |
| **AP-6** | audio-platform | medium | `gameplayStop()` is **not** in `stop()` — fires only at finish (`game-engine.js:586`) and `onExit` (`:315`). A router-driven mid-race `destroy()`→`stop()` silences drift but never emits `gameplayStop()` → CrazyGames SDK stuck "gameplay active"; next race's GO fires a second `gameplayStart()` (`:392`) unpaired. Inert on the no-op `platform.js`, real on the crazygames build. | Add `let gameplayActive`; set true after `gameplayStart()` (`:392`); in `stop()` `if(gameplayActive){gameplayStop();gameplayActive=false}`; **remove** the now-redundant `gameplayStop()` at `:586` and `:315`. |
| **H6 / IR-1 (bootstrap)** | engine-lifecycle | medium | Game bootstrap reads `location.search` (`game.html:55-84`: track/mode/dir). No per-game document in the shell. | Pure `optsFromRoute(route)` in `route.js`; `createGameScreen` builds opts from the parsed route. |
| **KEYS-NOT-CLEARED** | S-state | medium | `keys{}` (`state.js:54`) set by keydown/keyup (`game-engine.js:237-240`), read by `resolveSteer` (`input.js:7-8`), cleared nowhere. A key held across a restart → keyup fires while listeners detached → stale `true` → phantom auto-steer. Edge-triggered, self-heals on next press+release. | `for(const k in keys)delete keys[k]` inside `resetState()`. |
| **IR-4** | integration-routing | medium | `body.zen` added on zen mount (`game.html:60`), never removed. In the shell it **leaks** → next non-zen race keeps HUD panels hidden. | `createGameScreen` toggles `body.zen` from `route.mode==='zen'` on mount, removes unconditionally on destroy. |
| **IR-7** | integration-routing | medium | SW cache not bumped and `js/screens/game.js` not in ASSETS (`sw.js:3` = `desktop-drift-v232`). New module missing offline; stale shell served until `CACHE` changes. | Add `js/screens/game.js` (+ `css/sandbox.css` if absent) to ASSETS; bump `CACHE` → `v233`. |
| **IR-8** | integration-routing | medium | Invalid-track / load-failure use `location.replace('tracks.html'|'zen.html')` (`game.html:63,73-76`) — hard nav in the shell. | `createGameScreen` uses `location.replace('#/'+(isZen?'zen':'tracks'))` or set hash + return empty `{destroy}`. |
| **S-RESET-SKIDS** | S-state | medium | `S.skids` (`state.js:46`) accumulates every drifting frame (`game-engine.js:488-490`), drained only by the 1500-cap splice. Restart → previous race's skid marks pre-painted (`render.js:270-273`). **Cosmetic only.** | `S.skids.length = 0` inside `resetState()` (in place). |
| **POINTERS-NOT-CLEARED** | S-state | low | `pointers` Map (`state.js:55`) fed by pointer handlers (`game-engine.js:243-246`), cleared on pause (`:353`) but not on start/stop. A pointer still down at restart biases steering until next pointer cycle. Pause clears it on the common path; self-heals. | `pointers.clear()` inside `resetState()`. |
| **R5 (dpr) / IR-10** | render-reinit | low | `_dprCap` reads `location.search` at import (`render.js:44-50`). In the shell dpr lives in the **hash**, search is empty → can't set a *new* dpr from the shell URL (persisted `localStorage['dd-dpr']` still honored). Debug-only A/B knob. | Extract pure `resolveDprCap(param, storage)`; thread `route.dpr` in; `render.js` stops touching `location`. |
| **R6 (surface) / IR-10** | render-reinit | low | `_surfaceMode` reads `location.search` at import (`render.js:130-137`). Same hash-vs-search mismatch; `USE_SURFACE_BAKE` frozen at import. Debug-only. | Extract pure `resolveSurfaceMode(param, storage)`; thread `route.surface` in. |
| **IR-9** | integration-routing | low | `document.title` set on game mount (`game.html:64`), never restored — no menu screen sets it, so the tab title stays `Desktop Drift — <track>` after exiting. Cosmetic. | `createGameScreen` captures `prevTitle`, restores on destroy. |

### Non-hazards (do NOT "fix")

- **`car{}`** — fully re-initialized every start by `initCar` (`state.js:5-8`, all 5 fields). Not stale.
- **`_texCache`** (`render.js:358`) — deliberately cross-track; **must persist** a remount. Do not clear it in `initCanvas`/`initRender`.
- **`render.js` holds no cached `S.*` array binding** — `drawSkids`/`drawCaps`/`draw` read `S.skids`/`S.caps` as fresh property accesses each frame. So `resetState` mutating the shared `S` object propagates correctly. In-place `.length=0` is chosen for consistency with the existing self-trim splice (`:490`) and defensiveness, **not** because reassignment would break bindings.
- **`props[]`/`collectibles[]`** — read-only per race; `S.caps` rebuilt every start (`game-engine.js:82-97`); collected state comes from the persisted store, not a mutated collectible.
- **IR-7-adjacent H7 (`#lapTotal` else branch)** — the router re-clones `tpl-game` per mount so `#lapTotal` is always fresh `-`; adding an `else` is speculative. Skip.
- **`steerInput`/`lapStarted`** — inert `S` fields (grep: zero writes / read-only). Mirror in `resetState` defaults for completeness only.

---

## TDD test list (write these FIRST, before touching engine code)

Only genuinely **pure** (node `--test`, no DOM) tests below. `state.js` and `route.js` import nothing DOM-bound. `track-util.js` cone helpers are pure. Everything DOM/AudioContext-bound is marked **structural (no unit test) — verify by click-test**.

1. **`tests/reset-state.test.js`** — forces `export const resetState = () => void` into `js/state.js`.
   Import `{ S, keys, pointers, resetState }`. Seed a dirty finished-race `S` (`S.score=9999; S.startCd=-0.004; S.goT=0; S.bestLap=12.3; S.lastLap=8.1; S.lapNum=7; S.mult=8; S.multBuild=5; S.nextCp=0; S.physT=999; S.steerSmooth=0.7; S.flashMsg='x'; S.flashColor='#f00'; S.driftGrace=3; S.crashCd=2; S.lapStarted=false; S.lapScoreStart=500`). Call `resetState()`. Assert every field back at its `state.js:12-51` default (`score=0`, `startCd=3.0`, `goT=0`, `bestLap=null`, `lastLap=null`, `lapNum=0`, `mult=1`, `multBuild=0`, `nextCp=1`, `physT=0`, `steerSmooth=0`, `flashMsg=''`, `flashColor='#fff'`, `driftGrace=0`, `crashCd=0`, `lapStarted=true`, `lapScoreStart=0`).
   - **Array in-place**: `const lsRef=S.lapScores; S.lapScores.push({n:1,pts:100,t:9.9}); resetState(); assert.equal(S.lapScores.length,0); assert.strictEqual(S.lapScores,lsRef)`. Same for `S.skids`.
   - **Object identity**: `const ref=S; resetState(); assert.strictEqual(S,ref)` (render.js's imported binding must still see the reset).
   - **Inputs**: `keys.ArrowLeft=true; keys.d=true; pointers.set(1,320); resetState(); assert.equal(Object.keys(keys).length,0); assert.equal(pointers.size,0`) and assert the `pointers` Map instance is unchanged.

2. **`tests/reset-cones.test.js`** (or extend `tests/track-util.test.js`) — forces `export const resetCones = (cones) => void` into `js/track-util.js` and `x0/y0` onto placed cones.
   - `placeCones` output: every cone has `c.x0===c.x && c.y0===c.y` at creation, for **both** outer-edge and inner-edge cones (feed a small outer/inner ring).
   - `resetCones` restores a corrupted cone: set `knocked=true`, `vx/vy/spin/ang` nonzero, move `x/y` away from `x0/y0`; call `resetCones`; assert `knocked===false && vx===0 && vy===0 && ang===0 && spin===0 && x===x0 && y===y0`.
   - Shared-array re-entry: build `T`, assert `reverseTrack(T).cones === T.cones` (documents the intentional share); knock several cones; `resetCones(T.cones)` once; assert every cone in **both** `T.cones` and `R.cones` is standing.

3. **`tests/opts-from-route.test.js`** — forces `export const optsFromRoute = (route) => ({…})` into `js/route.js`.
   - `optsFromRoute({track:'oval',mode:'zen',dir:null,car:null})` deep-equals `{trackId:'oval',zen:true,reversed:false,stock:false,initItems:true,car:null}`.
   - `optsFromRoute({track:'dev-desk',mode:'sandbox',dir:'rev',car:2})` deep-equals `{trackId:'dev-desk',zen:false,reversed:true,stock:true,initItems:true,car:2}`.
   - `optsFromRoute({track:'cafe-marble',mode:null,dir:null,car:0})` → `zen:false,reversed:false,stock:false,car:0`.
   - `assert.equal('laps' in optsFromRoute({track:'x'}), false)` — laps is `T.laps`, never a route field.

4. **Extend `tests/route.test.js`** — forces `'game'` into `SCREENS` (`route.js:10`). (Test-first: fails until added.)
   - `assert(SCREENS.includes('game'))`.
   - `parseRoute('#/game?track=steel-kitchen&dir=rev')` deep-equals `{screen:'game',track:'steel-kitchen',dir:'rev',mode:null,car:null,dpr:null,surface:null}`.
   - `routeToHash('game',{track:'steel-kitchen',dir:'rev'}) === '#/game?track=steel-kitchen&dir=rev'`.
   - `parseRoute('#/game?mode=zen').mode === 'zen'`; round-trip `parseRoute(routeToHash('game',{track:'x',mode:'sandbox'}))` stable.
   - `parseRoute('#/game?dpr=1&surface=bake')` yields `{dpr:'1',surface:'bake'}` (covers R5/R6 params).
   - Valid exit targets: `routeToHash('menu',{})==='#/menu'`, `routeToHash('tracks',{})==='#/tracks'`, `parseRoute('#/zen').screen==='zen'`.

5. **`tests/render-resolvers.test.js`** — forces `export const resolveDprCap = (param, storage=localStorage) => number` and `export const resolveSurfaceMode = (param, storage=localStorage) => string` into `js/render.js`. Inject a `Map`-backed storage stub (so the module's DOM capture doesn't need to run — put these resolvers **above/outside** the DOM-touching import lines, or in a tiny `render-config.js` if `render.js` can't import cleanly under node; a small `render-config.js` is acceptable and keeps the test pure).
   - `resolveDprCap('1.25', stub)` → `1.25` and persists `dd-dpr='1.25'`; `resolveDprCap(null, stub)` empty store → `1.5`; stored `'1'` + null param → `1`; out-of-range `'2'`/`'abc'` **not** stored, returns stored-or-`1.5`.
   - `resolveSurfaceMode('bake', stub)` → `'bake'` + persists; `resolveSurfaceMode(null, stub)` empty → `'live'`; stored `'bake'` + null → `'bake'`; unknown `'foo'` not stored → stored/`'live'`.

6. **Extend `tests/sw-assets.test.js`** — assert every `js/screens/*.js` on disk (incl. `game.js`) appears in `sw.js` ASSETS, and `CACHE` differs from the committed `desktop-drift-v232`.

7. **(Optional, AP-6) `tests/gameplay-balance.test.js`** — only if the `gameplayActive` guard is factored into a tiny pure helper (`start→true; stop emits iff true then clears`). Assert: GO→finish = 1/1; GO→destroy = 1/1; GO→stop→stop = 1 stop not 2. If left inline in the engine, skip — cover structurally.

**Structural (no unit test) — verify by click-test:** `initCanvas` re-acquisition + import-no-throw; `createGameScreen` mount/destroy; `tpl-game` presence; overlay-dedup on Race-Again (`querySelectorAll('#raceResultsOverlay').length` stays 1); `fixed-viewport`/`body.zen`/`document.title` toggle round-trips; seam-routed exit leaves `location.pathname` unchanged; mid-drift router-back silences audio; `_texCache` survives a remount while trackPath rebuilds.

---

## Implementation order

Each step = one coherent commit on `feat/spa-phase-b`. Follow the **desktopdrift-pr** skill loop (branch already exists; `npm test` + `node --check` per step; clear the SW before browser-verify; bump SW cache once at the end).

1. **Pure `resetState()` (S-state).** Write test 1 first (red). Add `resetState` to `state.js`. Green. No engine wiring yet. *Reviewer agent: light (pure diff).*

2. **Pure `resetCones()` + `x0/y0` (track-mutable).** Write test 2 first. Add `x0/y0` in `placeCones` (`track-util.js:105,109`) and `export resetCones`. Green. Re-run `tests/track-util.test.js` + `tests/reverse-track.test.js` (identity-preservation). *Reviewer: light.*

3. **Pure `optsFromRoute()` + `'game'` in SCREENS (routing seam).** Write tests 3 + 4 first. Add `'game'` to `SCREENS`, `optsFromRoute` to `route.js`. Green. *Reviewer: light.*

4. **Pure dpr/surface resolvers (render config).** Write test 5 first. Extract `resolveDprCap`/`resolveSurfaceMode` (from `render.js:44-50,130-137`) into a pure module (`render-config.js` if needed to stay node-pure). Green. `render.js` still reads `location.search` for now — this step only introduces the pure functions. *Reviewer: light.*

5. **`render.js` re-init (R1-R4, R7 guard).** No pure test — **structural, click-test**. `const→let` for `canvas/ctx/miniEl/mctx/_hud*`; add idempotent `export initCanvas(root=document)` that re-acquires all + calls `resize()`; delete the top-level getElementById/getContext/`resize()` calls; guard `resize()` with `if(!canvas)return`; keep the window `resize` listener at module level (register once). Call `initCanvas(document)` at the top of `initRender` (or from `startGame` before `initRender`). Thread the dpr/surface params from step 4 into `initCanvas`/`initRender` (callers pass `location.search` for standalone, `route.dpr/surface` for shell). **Wire `resetState()` + `resetCones(cones)` into `startGame`**: `resetState()` as the first executable line (before `:56`); `resetCones(cones)` right after the destructure (`:50`) and before `initRender(T)`. *Reviewer agent: REQUIRED (touches the hot render path + engine entry). Device/browser click-test REQUIRED: `game.html` + `sandbox.html` still start, HUD/minimap live, cones upright.*

6. **Engine re-entrancy: injected callbacks + `stop(full)` + `gameplayActive` (H3/H4/H5/AP-1/AP-6).** No new pure test unless step 7. `const onExit = opts.onExit ?? (default href)`, `const onRestart = opts.onRestart ?? (default reload)` used in `onMenuClick`. Add `stop(full=false)` → `if(full||!raceFinished)raceResults.destroy()`; expose on `api`. Add `let gameplayActive`; set after `gameplayStart()` (`:392`); emit `gameplayStop()` in `stop()` behind the flag; **remove** the redundant `gameplayStop()` at `:586` and `:315`. `createRaceResults({onRestart})`. Defaults preserve `game.html` behavior. *Reviewer: REQUIRED. Click-test on `game.html`: exit + Race Again + finish still work standalone.*

7. **`js/screens/game.js` = `createGameScreen(root, route)` (IR-1/IR-3/IR-4/IR-8/IR-9 + shell exit/restart).** Port `game.html:47-83` bootstrap: `const o = optsFromRoute(route)`; guard missing/invalid `o.trackId` → `location.replace('#/'+(isZen?'zen':'tracks'))`; dynamic-import `./js/track-${o.trackId}.js`; `reverseTrack` if `o.reversed`; hold a mutable `{stop}` handle. On mount: `documentElement.classList.add('fixed-viewport')`, toggle `body.zen` from `o.zen`, capture `prevTitle`, set race title, `startGame(T, {...o, onExit: seam-exit, onRestart: inPlaceRestart})`. `inPlaceRestart` = `api.stop(true)` then `startGame(T, sameOpts)` (engine's `__ddActiveGame` also auto-stops, but explicit `stop(true)` removes the finished results overlay first — **do NOT** re-set the same `location.hash`, an identical hash fires no `hashchange`). `seam-exit` = `gameplayStop()` handled by engine now → `soundThenGo('index.html','back')`. `destroy()`: `api.stop(true)`, remove `fixed-viewport`, remove `body.zen`, restore `document.title`. *Reviewer: REQUIRED. Click-test REQUIRED (see below).*

8. **Shell wiring: `tpl-game` + router + CSS (IR-1/IR-2).** Add `<template id="tpl-game">` to `index.html` containing `game.html:19-42` (`#c` + full `#hud` subtree + `#combo`/`#flash`/`#count`/`#hint`). Add `import { createGameScreen } from './screens/game.js'` + `REGISTRY.game = { make: createGameScreen, tpl: 'tpl-game' }` + `'game.html':'game'` in `PAGE_TO_SCREEN` (`router.js`). Add `<link rel="stylesheet" href="css/sandbox.css">` after the menu sheets in `index.html`. *Reviewer: REQUIRED. Full click-test REQUIRED.*

9. **SW bump (IR-7).** Extend `tests/sw-assets.test.js` (test 6). Add `js/screens/game.js` to `sw.js` ASSETS; bump `CACHE` → `desktop-drift-v233`. Keep `game.html` in ASSETS (deep-link back-compat). Mirror into `dist/sw.js` if the build output is committed. *Reviewer: light. Click-test: hard-reload with SW cleared, then confirm offline serves the new shell.*

**Consolidated click-test (after step 8, per desktopdrift-pr, SW cleared):**
- `#/tracks` → pick a track → race mounts in-document, countdown runs, HUD + minimap live, cones upright.
- Race Again from results → exactly one `#raceResultsOverlay`, fresh countdown (`S.startCd=3.0`), **no reload** (same `location.pathname`, same AudioContext).
- Exit mid-race → lands on a menu screen in-document; no audio drone; menu scrolls (no leaked `fixed-viewport`).
- Zen race then a normal race → HUD panels visible (no leaked `body.zen`).
- Browser Back mid-drift → screen changes, audio stops (AP-1), `document.title` restored (IR-9).
- `sandbox.html` still runs standalone (step 5 must be additive).

---

## Explicitly out of scope

- **Music bed / crossfade / persistent soundtrack.** The session-singleton AudioContext *enables* it (that's the Phase-C payoff), but building it is a follow-up. This phase adds no music.
- **Sandbox into the shell.** `sandbox.html` **stays a standalone document** — it bounds the blast radius, its `#c`/`#hud` exist at load and `<html class="fixed-viewport">` is static, so the additive `initCanvas` refactor keeps it working with no id/CSS collisions. (See open decision.)
- **Any physics/feel change.** No touching physics constants, drift tuning, or `initCar`. `resetState` restores *defaults*, changing nothing about how a fresh race already played.
- **Save-schema change.** `x0/y0` on cones are never persisted; `resetState`/`resetCones` touch only runtime state. Records/store formats untouched.
- **`game.html` / `donate.html` as separate documents.** They remain hard navigations; `game.html`'s own inline bootstrap stays unchanged (defaults preserve it).
- **`opts.car` → engine wiring.** `garage()` already supplies the car (`game-engine.js:333`); honoring `route.car` in the engine is a behavior change, not a re-entrancy requirement. `optsFromRoute` may surface `car` harmlessly, but do not rewire the engine to consume it here.

---

## Open decisions for the owner

1. **Race Again = in-place restart vs re-mount via hash.**
   **Recommend in-place restart** (`api.stop(true)` + `startGame(T, sameOpts)`). Re-setting the same `#/game` hash fires **no** `hashchange`, so the router never re-renders — you'd have to append a cache-buster to the hash, churning history. In-place restart reuses the mounted `tpl-game`, keeps the AudioContext, and the engine already auto-tears-down via `__ddActiveGame`. *Why: correct, minimal, no history pollution.*

2. **Does shell chrome hide during the game?**
   **Non-issue — recommend no work.** `index.html` `<body>` is only `<div id="app">` + `<template>`s; there is no header/footer to hide. Drop this from the plan.

3. **Sandbox: standalone vs pulled into the shell.**
   **Recommend keep standalone.** It's a free test-drive with no records/economy; pulling it in doubles the Phase-C surface for zero user-visible gain. The only constraint: step 5's `initCanvas` refactor must be **additive** (also acquires refs when `#c` exists at import) so `sandbox.html` keeps working. *Why: smallest blast radius.*

4. **`resetState` field list drift risk.**
   **Recommend a single `S_DEFAULTS` literal** that both the initial `export const S = {...S_DEFAULTS}` and `resetState` (`Object.assign(S, S_DEFAULTS)` for scalars, plus explicit in-place array/`keys`/`pointers` clears) read from, so the default list can't drift out of sync between the two. *Why: one source of truth; the two lists otherwise silently diverge on the next field added.*

5. **The intentional `startGame` "prev still active" `console.warn` (`game-engine.js:47`).**
   In-place restart calls `startGame` while `__ddActiveGame` may still hold the outgoing engine → the warn fires on every legit restart. **Recommend**: since `createGameScreen` calls `api.stop(true)` *before* `startGame`, the registry is already null and the warn won't fire — but confirm during click-test; if it still fires, gate it behind an `opts.expectRestart` flag rather than deleting the guard (it still protects against real double-rAF bugs).
