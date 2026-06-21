# Plan — split & test `js/render.js` (~600 lines)

Goal: turn the one big render module into a readable orchestrator + cohesive draw modules,
and pull out the *small* genuinely-pure surface into unit-tested helpers. Keep the rendered
result pixel-identical at every step.

Branch: `refactor/render-extract`. Workflow: `desktopdrift-pr` (branch → `npm test` +
`node --check js/*.js` → ONE SW-clear browser smoke → bump SW cache → PR). English only.
One commit per step; tick the box in the same commit.

## Reality check — what can and can't be tested
`render.js` is mostly **imperative canvas painting** (`ctx.*`, `mctx.*`) + **DOM HUD writes**
(`getElementById().textContent`). Those need Canvas2D/DOM → they ride the **browser smoke
test**, NOT node unit tests. There is **no pixel golden-master** (don't fake one in node).

So this split has two distinct aims:
1. **Extract the small PURE surface** (math/formatters/predicates) → unit tests. This is the
   real test-coverage win.
2. **Split the imperative rest** into cohesive modules for readability. Verified by browser
   smoke (drive a track, everything looks identical, console clean).

## Safety net (every step)
- After each step: `npm test` green + ONE SW-clear browser smoke on ≥1 track — table/track/
  cones/props/caps/car/minimap/HUD all look unchanged, console error-free.
- Pure helpers ship with their unit test in the same commit.
- Per the verification-budget rule: one SW-clear + reload; if a sentinel shows stale code,
  STOP and hand the visual check to the user (don't fight the preview cache).

## Pure extractions (unit-tested) — do these FIRST, lowest risk

- [ ] **1. HUD formatters → `js/hud-format.js`.** Pure string/number formatters currently
      inline in `draw()`: lap time (`s.toFixed(2)`), last/best (`'—'` vs `x.toFixed(2)+' s'`),
      score `toLocaleString`/round, speed `toFixed(1)`, the `lapScores` → HTML string, the
      `1/3` lap text. Each takes values, returns a string. `render.js` calls them, then does
      the `.textContent =` / prev-value-guard writes (those stay — they're DOM). Test: each
      formatter incl. null/edge inputs.

- [ ] **2. Minimap transform → `js/track-util.js` (or `mini.js`).** Extract the MINI math:
      from `outer` bounds + canvas w/h + pad → `{ scale, originX, originY }` (and/or the
      `X(x)`/`Y(y)` mappers). Pure. `initRender` builds the closures from it. Test: known
      bounds → expected scale/offset; a point maps to the expected pixel.

- [ ] **3. Theme resolve + skid RGB → `js/theme.js` (or keep in render, export pure bits).**
      `THEME_DEFAULT` + `resolveTheme(T.theme)` (merge over default) + `skidRgb(theme.skid)`
      (parse `rgba(r,g,b,a)` → `"r,g,b"`). Pure. Test: missing theme → defaults; partial
      theme → merged; skid string parsed; malformed skid → fallback.

- [ ] **4. SVG orientation predicate → small pure helper.** The `naturalHeight > naturalWidth`
      portrait test (+ the swapped draw-dimension choice) → `isPortrait(w, h)` / a function
      returning the `{dw, dh, rotate}` to use. Pure (takes numbers). Test the decision table.
      `drawProp` calls it; the actual `ctx.drawImage` stays in render.

- [ ] **5. Neon glow segment math (if present in car/cap render).** The inset-segment
      proportions (nose/gap/body/gap/tail percentages) → a pure function returning the rects,
      `drawCar`/neon code paints them. Test the proportions. (Skip if not worth it.)

## Imperative split (readability; browser-smoke verified)

- [ ] **6. `js/render-hud.js`.** Move the cached HUD refs + per-frame HUD writes (lap/score/
      speed/combo/flash/count/lapScores + the `#lapNum`/`#lapTotal` guard) out of `draw()`.
      Export `drawHud(S, displaySpeed)`; render.js calls it. ⚠️ Preserve the #lapNum cached-ref
      fix (don't recreate the span). Uses the Step-1 formatters.

- [ ] **7. `js/render-world.js`.** The world pass: background/table/track (cached Path2Ds),
      `drawSkids`, props (`drawProp`), caps (`drawCaps`), cones (cached standing Path2Ds +
      knocked), start/finish checkered flag, car (`drawCar`, neon, wheels). Shares `ctx` + the
      cached Path2Ds + `TH`. Keep the Path2D caches built in `initRender`.

- [ ] **8. `js/render-mini.js`.** `drawMini()` + its cached `miniTrackPath`, using the Step-2
      transform.

- [ ] **9. Orchestrator.** `render.js` keeps `canvas`/`ctx`, `resize`, `initRender(T)` (builds
      caches + theme + MINI, wires sub-modules), `draw(speed)` (camera transform → world →
      mini → hud), `initItems`, `setCarPaint`. Should read top-to-bottom as a sequence of calls.

## Gotchas to preserve (do NOT regress)
- Path2D caches built once in `initRender`, not per frame (perf).
- Skid batching into `SKID_LEVELS` alpha buckets.
- `#lapNum` is never recreated (cached ref); only `#lapTotal` text is set (the lap-counter fix).
- `MINI` computed in `initRender`, never referenced at module load.
- DPR capped at 1.5; uncapped rAF (no fps cap) — those live in resize / game-engine, untouched.
- Theme injection: world colours come from `TH` (merged `T.theme`), never hardcoded.

## Definition of done
- [ ] Pure helpers (`hud-format`, minimap transform, theme/skid, orientation) unit-tested;
      `npm test` green; `node --check js/*.js` clean.
- [ ] `render.js` is a thin orchestrator; world/hud/mini in their own modules.
- [ ] Browser smoke on ≥2 tracks (one dark, one light/steel): identical visuals, HUD correct,
      console clean.
- [ ] New modules added to `sw.js` ASSETS; SW cache bumped. AGENTS.md updated (modules +
      dependency order). PR opened.

## Suggested division of labour
- Steps 1–5 (pure, well-specified, tested) → Sonnet, one at a time, behind `npm test`.
- Steps 6–9 (imperative split, pixel-identical risk) → Opus or careful Sonnet, each behind a
  browser smoke; review at the end.
```
