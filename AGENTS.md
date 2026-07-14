# Desktop Drift

Top-down arcade drift-racing game that takes place on a kitchen table. Pure
client-side HTML5 Canvas 2D. Build step minifies JS + CSS for production; source
stays readable. No framework, no bundler.

## Overview

- **Stack:** Single-page static site. Plain HTML + CSS + vanilla JavaScript
  (ES2020, native ES modules, no transpiler). Rendering via Canvas 2D
  (`requestAnimationFrame` loop). No framework, no bundler, no npm.
- **Pages (8):**
  - `index.html` — menu landing screen. Tiles: Sandbox → `select.html?mode=sandbox`;
    Time Attack → `tracks.html`; Zen Drift → `zen.html`. Contains one inline `<script>`
    that reads `localStorage` directly (no module import) to show the average PPS across
    all time attack records in the Time Attack tile (`#ta-avg-pps`, styled `.tile-stat`).
  - `tracks.html` — **track selection screen** for Time Attack mode. Shows a
    card per track from `js/track-registry.js`, each with a canvas preview rendered
    in the track's own `theme` colours. Preview uses **the same pipeline as the
    in-game mini-map**: `parseSvgPath` + game-coord transform (SCALE=0.25) +
    `chaikin`×4 → smooth centerline rendered as thick stroke (`TRACK_GU*2*s`),
    both from `js/track-util.js`. No Y-flip hack — `toGame` handles inversion.
    Shows PPS record ("Score: 1250 PPS (Total: 45,000 · 36.0 s)")
    from `store.records()[id].timeattack.{bestPPS, bestPPSTotal, bestPPSTime}`.
    Clicking a card → `select.html?track=<id>`. `noindex`.
  - `zen.html` — **track selection screen for Zen Drift mode**. Identical card-rendering
    pipeline to `tracks.html` (same drawThumb helper, same `parseSvgPath`+`chaikin`
    preview) but no score panel — cards show only the canvas preview, name, and desc.
    Clicking a card → `select.html?track=<id>&mode=zen`. `noindex`.
  - `select.html` — **garage / car-selection screen** shown between menu and game.
    Renders live canvas previews of all cars using `CARS[*]._p2d` from `config.js`.
    Each card shows three 10-cell stat bars: **spd** (amber, absolute 0–15 km/h),
    **hdl** (ice-blue, weighted steer+lowSpeedTurn composite), **acc** (mint-green,
    thrust). Scale maxima (`SPEED_MAX_KMH=15`, `STEER_MAX=5`, `LOWTURN_MAX=0.5`,
    `THRUST_MAX=900`) are intentionally above current car values — headroom for mods.
    Player picks car + body colour + neon, saves `{ carIndex, bodyColor, neonColor }`
    to `localStorage` and navigates to target game page.
    URL params: `?mode=sandbox` → `sandbox.html`; `?track=<id>` → `game.html?track=<id>`;
    `?track=<id>&mode=zen` → `game.html?track=<id>&mode=zen`.
    Back link: `zen.html` when `mode=zen`, `tracks.html` when `?track` is set, else `index.html`.
    Race button label changes to "Start Zen" when `mode=zen`.
  - `game.html` — **universal Time Attack / Zen Drift game page**. Reads `?track=<id>`
    and optional `?mode=zen` from URL. Validates track against `TRACKS` registry (redirect
    to `zen.html` or `tracks.html` on unknown ID). Adds `body.zen` class when mode=zen,
    which hides `#hud-left` and `#hud-right` via `css/sandbox.css`.
    Passes `{ initItems: true, zen: true }` to `startGame` when in zen mode. `noindex`.
  - `sandbox.html` — free-drive mode on the parametric oval track. Inline
    `<script type="module">` imports `track-oval.js` and calls
    `startGame(T)` (no items).
  - `sandbox.html` — free-drive mode on the parametric oval track. Inline
    `<script type="module">` imports `track-oval.js` and calls
    `startGame(T)` (no items).
  - `settings.html` — **settings screen** (Phase 0). Speed-units toggle (km/h ↔ mph),
    haptics toggle, and a **Profile / Sync** section (export/import the whole save to
    move progress between devices — `js/profile-sync.js` + `js/profile-io.js`).
    auto-saves via `store.js`. Entry point: ⚙ Settings link on the menu. `noindex`.
  - `donate.html` — donation page. Bybit UID with Copy button, link to Bybit Pay.
- **SEO files (root):**
  - `robots.txt` — allows all bots; points to `sitemap.xml`.
  - `sitemap.xml` — lists indexable pages (`index.html`, `sandbox.html`,
    `donate.html`). `tracks.html`, `game.html`, and `select.html` are `noindex`
    app screens, omitted. Update `<lastmod>` when content changes.
- **File layout:**
  - `css/base.css` — shared reset **+ design tokens** (`:root` vars) **+ `@font-face`**
    for the display font. Loaded by every page first (defines all `var(--…)`).
  - `css/menu.css` — menu styles + the staggered entrance animation
    (`index.html`, also loaded by `select`/`settings`/`donate`).
    `.logo sup` — trademark mark: `font-size:.24em; vertical-align:top` keeps it
    in flow so the parent's `background-clip:text` gradient covers it; has its own
    `background-clip:text` as a fallback; `margin-left:.1em` for side offset.
  - `css/sandbox.css` — HUD styles + mobile media query (shared by both game
    pages). **z-index ladder:** `#hud z-index:100` (pointer-events:none, always
    on top) → `#controls position:fixed z-index:35` (menuBtn, interactive above
    all overlays) → `#raceResultsOverlay 60` → `#confirmExitOverlay 50` →
    `#pauseBtn 40` → `#pauseOverlay 30`. `#hud` at 100 ensures the Menu button
    remains clickable during pause without needing to restructure the overlay stack.
  - `fonts/unbounded-800-latin.woff2` — self-hosted display font (Unbounded 800, OFL).
  - `js/config.js` — pure static data: `CFG`, `CARS` (with Path2D init),
    `TABLE`, physics constants (`PHYS_HZ`, `GRIP_WOBBLE`, `STEER_WOBBLE`,
    `NM_BAND`). `CARS = [...LEGACY_CARS, ...GENERATED_CARS]`: legacy cars
    (Bismark, Panda) are inline + hand-extracted; newer cars come from the
    generated `js/cars-data.js`. Append order is load-bearing — saved
    `carIndex` must stay stable, so new cars land at index 2+.
  - **Adding a car** (Variant B pipeline — see `docs/plans/cars.md`):
    1) drop the top-down SVG in `cars/` (convention: one `stroke`-only `<path>`
    = body silhouette; the longest wins if several, the rest become `lines`;
    each `fill` `<path>` = a detail; `viewBox` → `vw`/`vh`).
    2) add an entry to `js/car-registry.js` (`id`, `name`, `svg`, `body` colour,
    `flip`, `len`, `ratings:{handling,accel,speed}`, optional `feel`).
    3) `npm run gen:cars` → regenerates committed `js/cars-data.js`.
    4) SW: the car SVG is author-time only (path is baked into `cars-data.js`) —
    do NOT add it to `ASSETS`; just bump the cache. Stat math is the pure
    `js/car-stats.js` (`speedRating`/`handlingRating`/`accRating` +
    `driveForRatings`), shared by the garage display, the generator, and tests.
  - `js/items.js` — item catalog with 1:64-scale physics data. Each export is
    a plain object `{ hl, r, kind, imgSrc, c }`. No game state; no imports.
    Used by track files to spread item descriptors with position/angle.
    SVGs live in `items/`.
  - `js/collectibles.js` — collectible catalog (SVGs in `objects/`). Exports
    `COLA_CAP` (`{ kind:'cola', r, imgSrc, imgFull }`) — the drift-collected cola cap
    (see **Cola-cap collectibles** below) — and `TIRE` (`{ kind:'tire', r:20, value:5,
    imgSrc:'objects/tire.svg' }`) — proximity pickup that feeds the wallet.
  - `js/cola.js` — **pure cola-cap math** (no imports, no state): `angDelta(a,b)`
    (shortest signed angle), `capProgress(sweep)`, `stepSweep(...)` (accumulate swept
    angle when engaged, decay toward 0 when idle). Unit-tested in `tests/cola.test.js`.
  - `js/economy.js` — **pure tire-coin formulas** (no imports, no state): `starsForPps(pps)`
    (1 star / 100 PPS, cap 5), `finishPayout(pps)` = `2 + 2*stars` tires, and `isDDK(pps)` /
    `DDK_PPS` (600 — the 6-star "crown" tier; **display + achievement only, never changes
    payout**). The soft-currency maths for the Phase 2.5 economy; persistence lives in
    `store.js`. Unit-tested in `tests/economy.test.js`.
  - `js/achievements.js` — **pure achievement catalog + evaluator** (imports only `DDK_PPS`
    from economy). `evaluate(ctx, unlocked)` → `{ unlocked:[{id,name,icon,reward}],
    progress:[{id,value}] }` over an injected `ctx` snapshot (see
    `docs/plans/achievements.md`); zero side-effects, so the whole system is unit-testable
    (`tests/achievements.test.js`). Also: `buildContent(tracks, catalog)` (derives the
    instance/shop-section descriptor), `buildCatalog(content)` (static defs + generated
    ladder families + per-instance `ddk-*` + `absolute-ddk`), `flattenRecords(records)`,
    `CATEGORY_ORDER`. The engine (at finish) and `modify.html` (on purchase) assemble `ctx`,
    call `evaluate`, then persist via the `store.js` `ach*` helpers + credit the reward once.
  - `js/tire-seed.js` — **pure tire placement** (no imports, no state): `seedTires(center,
    inner, outer, n)` scatters `n` tire pickups by even arc-length — on the racing line on
    straights, pushed toward the inner (concave) edge on corners ∝ sharpness. Deterministic
    (positions = the persistent `capId`). Called by `track-factory.makeTrack({ tires })`;
    the count is also declared on the registry entry (`tires`) as the badge denominator.
    Unit-tested in `tests/tire-seed.test.js`.
  - `js/track-oval.js` — parametric oval track (classic sandbox mode).
    Same export shape as the Time Attack track modules. Does NOT import `items.js`
    (no props). Used by `sandbox.html`.
  - `js/track-registry.js` — **track registry**. Single source of truth for all
    Time Attack tracks: `TRACKS` array of `{ id, name, desc, svgSrc, caps, theme }`.
    `id` keys `store.records()`; `caps` = number of cola caps on the track (the
    static denominator for the cap badges — see **Cola-cap collectibles**);
    `theme` (background/table/tableEdge/track) is the
    canvas-world palette, used both by the `tracks.html` preview and (re-declared in
    the track module) by the game. Consumed by `tracks.html` (cards + previews) and
    `select.html` (routing). Adding a track = one entry here + a track module + an
    HTML page. Six future tracks are scaffolded as commented entries.
  - `js/track-green-study.js` — **Green Study track** (first Time Attack circuit).
    Uses top-level `await` to fetch `tracks/green-study.svg` at runtime. Parses
    `track_path` (M/L/H/V/Z) for the centerline, `<line id="ITEM_*">` proxy-lines
    for item placement. `SCALE=0.25` (viewBox 14462×7829, stroke-width 800 →
    `TRACK_HALF=100`). ID resolution: direct match in `items.js` first; strips
    trailing `_N` digit suffix for instance duplicates (`ITEM_PENCIL_2` → `ITEM_PENCIL`).
    Exports `TABLE` from actual `outer` bounds + `TABLE_MARGIN=250` game units
    (`initRender` applies it, overriding the global TABLE), plus `theme` (world
    colours), `id` (records key) and `laps` (3 — the lap count for the race).
    Logs `console.warn` only for unresolvable item IDs. **Figma SVG layout rule:**
    viewBox padding around the track path must leave **200–300 game units**
    (`TABLE_MARGIN`) on every side; with SCALE=0.25 that is **800–1200 SVG units** of
    clear space. **Authoring refs:** `tracks/TRACK_STYLE_GUIDE.svg`,
    `tracks/TRACK_COLOR_SCHEMES.svg`. **The repeatable build pipeline is the
    `desktopdrift-new-track` skill.**
  - `js/track-steel-kitchen.js` — **Steel Kitchen track** ("Stainless Speedway").
    Same structure as `track-green-study.js`. viewBox 16399×8756, SCALE=0.25,
    15 items (kitchen utensils: PAN_EGG, CLEAVER, SPATULA×2, MIXER, OPENER, SPRAY,
    BOARD×2, GRATER×2, MITTEN×2, CUP, COLA_CAP). **Light theme** — first bright track
    in the game; `background:#c6cace`, `table:#6b7178`. No `startLine` field needed
    (flag is now universal black/white). `#hint` text-shadow added in `css/sandbox.css`
    for readability on light backgrounds (applies to all future light-theme tracks too).
  - `js/track-workbench.js` — **Workbench track** ("Workshop Wasteland").
    Same structure as other SVG track modules. viewBox 16399×8756, SCALE=0.25,
    36 items (workshop tools: DRILL×2, WRENCH_1×2, WRENCH_2×2, HAMMER_1, SCREWDRIVER_1×2,
    SCREWDRIVER_2×2, TOOLSET_1, TOOLSET_2, GLOVES×2, NAILS_ROW×2, NAILS_CROSS, RULER_LONG×3,
    RULER, HORSESHOE, COMB, PEN_PENCIL×2, PEN_1, PENCIL_2×2, COMPASS_RULER, MITTEN, CUP,
    COLA_CAP). Dark industrial theme; `background:#181d1d`, `table:#574b39`.
  - `js/race-results.js` — **self-contained race-results overlay**. Creates
    `#raceResultsOverlay` DOM; `show({ score, bestLap, lapScores, isNewRecord, pps, totalTime })`
    renders the PPS score ("1250 PPS", NEW RECORD badge), sub-line "Total: 45,000 · 36.0 s",
    per-lap times (best lap highlighted) and a "Back to tracks" button → `tracks.html`.
    All queries are scoped to its own overlay element. Returns `{ show, destroy }`.
    Styled in `css/sandbox.css` (`#rr-*`, `.rr-sub`). Shown by `game-engine.js` on the final lap of a fixed-lap race.
  - `js/platform.js` — **platform adapter seam**, the ONLY platform file game code
    imports (contract at the top of the file): `init()`, `gameplayStart()` (after the
    countdown), `gameplayStop()` (race finish + exit-to-menu), `commercialBreak()`
    (Promise; awaited on the results-screen restart — a real adapter shows an
    interstitial and must mute sound while it runs), `happyMoment()` (new record).
    This default file is the no-op adapter; `npm run build -- --platform=<name>`
    swaps it for `js/platform-<name>.js` (error if missing — no committed stubs).
    Contract test: `tests/platform.test.js`; HTML-strip helpers for platform builds
    live in `scripts/build-helpers.js` (tested in `tests/build-helpers.test.js`).
    First real adapter: `js/platform-crazygames.js` (CrazyGames SDK v3 — injects the
    SDK script at runtime, self-inits at import since game code never calls `init()`,
    silent no-op off-platform, mutes ads via `sound.js setMuted()`; test:
    `tests/platform-crazygames.test.js`). Adapter files ship ONLY inside their own
    `--platform` build (as `platform.js`) — never as standalone files in any dist,
    and never in `sw.js` ASSETS.
  - `js/state.js` — all mutable game state: `car`, `S` (lap/scoring/physics),
    `keys`, `pointers`. Exports `initCar(T)` to set starting position/angle
    from the track namespace. No hardcoded track import.
  - `js/render.js` — canvas setup, `resize()`, `draw()`, `drawMini()`.
    Exports `initRender(T)` and `initItems(props)`. No hardcoded track import.
    SVG orientation is auto-detected (`naturalHeight > naturalWidth` → portrait
    → rotate π/2 + swap draw dimensions).
    **Collectible rendering:** `drawCaps()` handles `kind:'cola'`; `drawTires()`
    handles `kind:'tire'` (1:3 aspect, slow spin, amber glow, pop burst on pickup).
    Both called from `draw()`. **Wallet HUD:** `#wallet` span updated each frame
    via `wallet()` from `store.js` with a prev-value guard.
    **Theme (dependency injection):** world colours live in `THEME_DEFAULT`
    (background/table/tableEdge/track/cone/skid); `initRender` merges `T.theme`
    over it (same pattern as `T.TABLE`). Tracks ship their palette; no per-track
    literals in `render.js`. `TH.checkpoint` kept in shape for legacy but not used
    in rendering (replaced by fixed colour, see below).
    **Start/finish** is a **universal black/white** checkered flag
    (`rgba(255,255,255,0.92)` / `rgba(0,0,0,0.82)`) — not theme-dependent, always
    readable on any background. `startLine` is no longer a theme field.
    **Checkpoint circles** (intermediate only — finish has no circle): fixed
    `#7dd4ff` stroke. Double-stroke technique for contrast: dark wide outer stroke
    (`lineWidth 8`, `rgba(0,0,0,0.55)`) then cyan narrow inner stroke (`lineWidth 5`).
    Replaces `shadowBlur 14` which was expensive on mobile GPU (separate rasterisation
    buffer + Gaussian blur per frame).
    **Cone rendering (2.5D):** Standing cone — 3 arcs in world coords (no save/restore):
    shadow (+2,+2 offset dark circle) → base (`TH.cone`) → highlight (r×0.35, shifted
    −1,−1 to simulate top-left light source). Knocked cone — `save/translate/rotate(c.ang)`:
    shadow trapezoid (+2,+2) → cone body trapezoid (wide at base, `rTip=r×0.25` at tip,
    `h=r×3`) → white reflective stripe (70% of cone width, interpolated per x so it stays
    inside the body). No save/restore for standing cones — perf intentional.
    **Standing cones are cached as 3 `Path2D` objects** (shadow/base/highlight), rebuilt
    only when a cone transitions standing→knocked. Each frame: 3 `fill()` calls for all
    standing cones + one `save/translate/rotate/restore` pass for knocked cones only.
    `moveTo(cx+r, cy)` before every `arc()` in the Path2D is mandatory — without it the
    implicit `lineTo` connects consecutive arcs and fills the entire enclosed polygon.
    **Perf:** static geometry (track polygon, minimap line) is cached as `Path2D`
    in `initRender` — built once, not rebuilt per frame. Skid marks are batched into
    `SKID_LEVELS` alpha buckets (a few `fill()`s instead of up to 1500 `fillRect`/frame).
    DPR capped at 1.5 (`min(devicePixelRatio, 1.5)`) — saves ~1.78× fragment ops vs
    cap=2 with negligible visual difference for flat arcade style.
    Game loop runs at the display's native refresh rate (uncapped rAF); physics is
    frame-rate-independent (`Math.pow(k, dt*PHYS_HZ)`, `dt` clamped 0.05 s). A previous
    fixed-16.67 ms "60 fps cap" was **removed** — it downgraded 90 Hz panels to a juddery
    45 fps (no clean 60 exists on 90 Hz) and micro-stuttered on 60 Hz from rAF jitter.
    Do not reintroduce a fixed-ms frame cap; only halve when native rate is a clean
    multiple of 60 if battery ever demands it.
    **Mobile-GPU lesson — do NOT bake the track into a big offscreen bitmap by default.**
    An offscreen static-surface bake (table+track → one canvas, `drawImage` each frame) was
    tried to avoid the per-frame 200 px stroke. It BACKFIRED on weak GPUs: blitting a ~26–42 MB
    texture every frame is a net loss vs the decimated live stroke on fill-rate-poor Adreno
    (it made even the simple tracks lag on a Moto G8 Plus / Adreno 610), and it does NOT fix
    the Mali-G76 corruption on cafe-marble/dev-desk (that glitch is per-frame **translucent
    gradient-sprite overdraw** — the coffee/donut items — not the surface). The bake is now
    OFF by default (`_surfaceMode` / `USE_SURFACE_BAKE` in `render.js`, opt-in via
    `?surface=bake`). If you ever revisit it, gate it to strong GPUs only; don't make it the
    default. The real per-frame win is **off-screen culling** of props/collectibles (`_inView`
    in `draw()`): the camera zooms on the car, so most items aren't visible — skip them.
    Culling alone was NOT enough on cafe-marble (winding layout clusters the coffee/donut items,
    so several stay on-screen at once). The durable Mali fix is `initItems()` **pre-rendering
    oversized item art once into a ≤`TEX_CAP`(512) canvas, deduped by `imgSrc`** — the source SVGs
    are 1152² but items draw ~170 px, so the raw textures were minified ~6.7×/frame with no
    mipmaps; the downscale cuts resident texture memory ~20× and the per-frame sample cost. Props
    carry a cached `o._portrait` flag (a downscaled canvas has no `naturalWidth`). Also: the main
    2d context is `{ alpha:false }` (canvas is repainted opaque every frame), and a `?dpr=1|1.25|1.5`
    override (`_dprCap`, sticky) shrinks the backbuffer for on-device Mali A/B.
  - `js/store.js` — **single persistence layer**. All `localStorage` access goes
    through this module only. Exports `garage()`, `records()`, `settings()`,
    `achievements()`, `stats()` (live objects — mutate then call `save()`), plus
    `save()` / `collectedCaps()` / `capCollect()` and the economy:
    `wallet()` / `addTires(n)` / `tiresFor(id)` / `tireCollect(id, tireId)`
    (`wallet` int + `stats.tires` mirror the caps model). Achievements:
    `achAll()` / `achUnlocked()` (Set) / `achUnlock(id)` (idempotent) /
    `achSetProgress(id, n)` (latches to max) + lifetime `stats.runs` / `stats.driftSecs`.
    Whole-profile sync: `snapshot()` (full state, for export) / `replaceAll(obj)` (import,
    routed through the same migrate+merge heal; caller must reload).
    Track-instance markers: `tireSwept`/`markTireSwept` (clean-sweep wheel badge),
    `hasTrophy`/`markTrophy` (the 1-PPS 🏅 badge, `stats.trophies`), and
    `hasPerpetual`/`markPerpetual` (the unbroken-drift ♾️ badge, `stats.perpetuals`) — all
    drive a badge on the `tracks.html` card next to the stars (like the DDK crown).
    Key `'desktop-drift'`, `VERSION = 4`.
    **Schema evolution never wipes data:** on load the saved object is deep-MERGED over
    `defaults()` (missing keys filled, saved leaf values win, arrays replaced). `defaults()`
    is the shape spec: a save value that's the **wrong type** for an object slot (e.g.
    hand-edited `settings: null`) is discarded and that slot heals to its default — content
    validation, so a garbled save can't `TypeError` a consumer. So adding a
    field/slice = just edit `defaults()` — no `VERSION` bump, no reset (this replaced the
    old `stats` lazy-init hack — `stats` is a normal slice now). `VERSION` + the
    `MIGRATIONS` table are only for **breaking** reshapes: bump `VERSION` and add
    `MIGRATIONS[newVersion] = (s)=>…`; the chain runs old→VERSION, then merge fills the
    rest. Reset to defaults happens **only** for unparseable/corrupt data — an unknown
    ("future") version is merged, not wiped.
  - `js/profile-io.js` — **pure** profile codec for device sync. `encodeProfile(state)` →
    a `DDP1.`-prefixed base64 code, `decodeProfile(code|json)` → validated profile object
    (tolerates a raw JSON file export), `validateProfile` / `profileJson`. No DOM, no store —
    unit-tested in `tests/profile-io.test.js`.
  - `js/profile-sync.js` — settings "Profile / Sync" DOM glue. `initProfileSync()` wires
    copy-code / download-file export and paste-or-file import → native confirm →
    `store.replaceAll()` → reload. Persistence stays in `store.js`; codec in `profile-io.js`.
  - `js/palette.js` — curated colour palettes. Exports `PALETTE` (20 body colours,
    `{ hex, name }`) and `NEON_PALETTE` (10 vivid neon colours, same shape).
    Imported only by `select.html`. Designed to grow: Phase 2 liveries will add
    a `LIVERIES` array with `{ name, body, stroke, details }` entries here.
  - **Neon FX** (`js/neon.js` + `js/neon-draw.js`, docs/plans/neon.md) — the underglow is a
    **6-zone** cosmetic (clockwise: front-L, front-R, right-side, rear-R, rear-L, left-side)
    driven by a per-car config `neon: { layout, anim, colors[], speed }` (in `carLook`;
    VERSION-3 migration folds the legacy `neonColor` hex into it). `js/neon.js` is the **pure**
    resolver — `zoneColors(neon, t)` → 6 `{color,intensity}` — with `LAYOUTS`
    (solid/longitudinal/front-mid-rear/per-zone) and `ANIMS` (none/pulse/rainbow/flow);
    unit-tested (`tests/neon.test.js`). `js/neon-draw.js` `drawNeon(ctx, hl, hw, neon, t,
    blurScale)` is the one canvas renderer (6 ellipse zones, **same-colour zones batched into
    one `shadowBlur` pass** — solid = 1 pass, per-zone/animated up to 6), shared by
    `render.js` (in-race) and `car-preview.js` (garage). Shop sells `neon-layout` / `neon-anim`
    items (`shop-catalog.js`); solid+static stay free. Perf: measured negligible (per-zone+flow
    ~0.008 ms/frame desktop), animations run everywhere, no throttle (N7).
  - **Flair → Moods** (`js/emotion-overlay.js`) — Pixar-Cars windshield **eye/expression** overlays.
    88 SVGs at `cars/emotions/<carId>-<emotion>.svg` (8 cars × 11 moods), authored in the car's frame
    + final orientation. Equipped per car via `carLook().expression` (additive field, no migration;
    **read it as `look.expression`, NOT `look.emotion`** — a field-name mismatch silently drops the
    overlay). Loader fetches → recolours (case-insensitive): `#D9D9D9` → body **always**; the "glass eyes"
    `#3B97D3` (open-eye iris) + `#222222` (joy/lol/sleep dark eyes = the car's default window colour) →
    glass tint **only if a tint is equipped**; `#000`/`#222` (3-digit strokes) → body outline colour **only
    if an outline is equipped** (a 6-digit `#222222` is a glass eye, not a stroke). Then applies the car's
    paint **finish** to the body skin — masked to just the `#D9D9D9` skin path so it matches a
    metallic/pearl/chrome body without touching the eyes — → decodes to a bitmap cached by
    `(carId, emotion, body, tint, finish, outline)`. Rendered **no-flip** (art is final-oriented) over the car
    in BOTH `render.js` `drawCar` (via `setCarEmotion`) and `car-preview.js` `drawCarPreview` (garage /
    modify / share — `share-card.js` **awaits** `preloadEmotion` before reading pixels). Async: hot-path
    `getEmotionBitmap` is a sync cache read, `preloadEmotion` warms it (deduped + **negative-cached** so
    a missing/broken overlay isn't re-fetched every frame); `onEmotionReady` repaints one-shot previews.
    Shop sells `kind:'expression'` items; **None** (no face) is the free default. Pure helpers
    (`emotionKey`, `recolorEmotion`) unit-tested (`tests/emotion-overlay.test.js`). SVGs ship via the
    `cars/` build copy (not precached in `sw.js` — runtime-cached lazily like `items/`).
  - `js/game-engine.js` — sole entry point for all game modes. Exports
    `startGame(T, opts = {})`. Receives the full track namespace `T`, calls
    `initRender(T)` and `initCar(T)`, optionally `initItems(props)` when
    `opts.initItems` is true. All physics/input/scoring logic lives here.
    `opts.zen = true` activates Zen Drift: skips `S.score` accumulation, cone
    penalties, and the entire lap-detection block (no lap times, no race finish).
    Flash notifications (combo banked, crashes, TRANSITION!, NEAR MISS!) still fire.
    On init reads `garage()` from `store.js` to apply the chosen car model,
    body colour, and the neon config (`carLook().neon` → `setCarPaint` → `drawNeon`).
    Also reads `settings().units` once to compute `speedFactor` (1 for km/h,
    0.621371 for mph) and sets `#spdUnit` label. Speed passed to `draw()` is
    already converted — `render.js` just rounds and displays it.
    When a neon config is equipped, the black drop-shadow under the car is suppressed.
    **Lap count & finish:** `TOTAL_LAPS = T.laps ?? opts.laps ?? 0` (0 = endless,
    used by sandbox). With a finite count the HUD shows `1/3`. The finish line
    (checkpoint[0] = center[0]) is detected by **sign-change of the forward projection**
    of the car position onto `startAngle` — not a radius circle. `prevFinishDot` tracks
    the previous frame's dot product; when it goes from negative to positive (no lateral
    constraint — direction check + mandatory checkpoints are sufficient anti-fraud), the lap is counted. Intermediate checkpoints
    (1…K-1) still use the circle `CP_R`. When the final lap is crossed, the engine
    **first** banks the active combo (`bankCombo()`), **then** pushes the final lap entry
    to `S.lapScores` — this order is critical: reversing it would drop the last combo
    segment from both `pts` and the headline total. Calculates `pps = totalScore / totalTime`
    (Points Per Second), writes `bestPPS`/`bestPPSTotal`/`bestPPSTime` to
    `store.records()[T.id].timeattack` when a new record is set (via `save()`),
    calls `stop()`, manually updates `#score` DOM element to `totalScore` (the draw
    loop was cancelled before it could run with the banked combo), and shows the
    `race-results` overlay. `raceFinished` keeps that overlay alive past `stop()`.
    **Wall collision (rect):** uses capsule AABB — `absExtX = |hx|×nose + CR`,
    `absExtY = |hy|×nose + CR` — so the bumper, not the windshield, triggers the wall.
    **Wall collision (round/oval):** iterates body points, pushes car radially inward on
    first violation. **Prop collision:** finds closest body point to the prop capsule
    (`bodyPts` iteration), pushes car so that point clears the prop. Previously all three
    used only `car.x, car.y` with radius `CR`, causing ~24 gu of visual penetration before
    triggering.
    Returns `{ stop }` — removes every listener, cancels the `requestAnimationFrame`
    loop, and destroys the pause / confirm-exit (and, unless finished, race-results)
    components. The engine is reentrant: a second `startGame` auto-stops the previous
    one (no leaked listeners / no double RAF). The active-game registry lives on
    `globalThis.__ddActiveGame` (not module-scope), so even a duplicate module instance
    (e.g. an SW glitch in the installed PWA) shares one flag and can't run two engines
    at once; an unexpected live game at start logs a `console.warn` as a signal.
  - `js/pause.js` — self-contained pause component. Creates `#pauseBtn` and
    `#pauseOverlay` DOM elements, handles P key. Returns `{ isPaused, toggle,
    pause, resume, destroy }`. `destroy()` removes the keydown listener and its DOM.
    Styled via `css/sandbox.css`.
  - `js/confirm-exit.js` — self-contained exit-confirmation dialog. Creates
    `#confirmExitOverlay` DOM. Returns `{ show({ onExit, onCancel }), hide, destroy }`.
    `destroy()` removes the Escape listener and its DOM. Called by `game-engine.js`
    when the Menu button is tapped.
  - `js/track-util.js` — **pure track geometry helpers** (no imports, no state):
    `parseSvgPath`, `chaikin`, `offsetEdges` (center→outer/inner), `placeCones`,
    `sampleCheckpoints`, `sampleCheckpointsByCorner`, `prepProp`,
    `nearestCenter` (windowed O(window) nearest centreline scan, replaces the old O(N)
    loop in `frame()`), `circularAdvance` (forward arc distance on a closed loop; returns 0
    for backward movement). Shared by track modules, `tracks.html`, and `game-engine.js`.
    Unit-tested in `tests/track-util.test.js`.
    Key behaviours / gotchas:
    - `parseSvgPath(d)` → `[[x,y],…]` (M/L/H/V/Z, absolute coords). **Deduplicates
      the closing vertex**: track SVGs use `L start_x start_y Z` which makes the last
      parsed point equal to the first — a zero-length Chaikin edge that after 4 passes
      creates 16 coincident points, destabilising tangent normals near start/finish.
      Fix: `if dist(pts[0], pts[-1]) < 0.5` SVG-units → `pts.pop()`.
    - `offsetEdges(centerPts, half, minInnerGap=10)` — **clamps the inner offset on
      hairpins**. Estimates local radius R as the circumradius of the (prev,curr,next)
      triangle; inner offset = `min(half, max(R−minInnerGap, minInnerGap))`. Outer
      offset always = `half` (no inversion possible). Prevents self-intersecting inner
      edges on tracks where R < TRACK_HALF (green-study min R≈66 GU, workbench ≈55 GU).
    - `placeCones(outer, inner, minSpacing=160)` — **independent arc-length accumulators**
      for each edge. Outer and inner are sampled separately: outer (longer in corners)
      receives more cones, inner fewer. Cones are no longer always "directly across"
      from each other — staggered placement fills gaps on outer radii of bends.
    - `sampleCheckpointsByCorner(center, K)` — K checkpoints in equal **arc-length** sectors
      (not equal index count), biased toward curvature peaks. **Two hard guarantees enforced
      post-placement:** (1) `checkpoints[0]` is always `center[0]` — finish-line detection
      in `game-engine.js` uses `c0 = checkpoints[0]` as the reference point and it must
      match the visual chequered flag drawn at `center[0]` in `render.js`; never break this
      invariant. (2) Minimum arc-length gap of `totalLen/K/2` between consecutive
      checkpoints — prevents a 180° hairpin spanning two sectors from placing both
      checkpoints at its entry and exit; the later is pushed to its sector index-midpoint.
    - **Reversed mode** (`reverseTrack(T)` + `instanceId`): `reverseTrack(T)` is a pure
      transform — it reverses `center`/`inner`/`outer` in lockstep, recomputes
      `checkpoints`/`startPos`/`startAngle`, carries all other fields unchanged, and sets
      `reversed: true`. The existing finish/checkpoint logic then works without modification.
      `instanceId(trackId, reversed)` returns `trackId` for the forward run and
      `` `${trackId}:rev` `` for the reversed run; this key is used consistently across
      records, tire pickups, cola-cap pickups, the cleared flag, and the first-clear bonus
      (all persistence in `store.js` and `game-engine.js`). Entry point: `game.html?dir=rev`
      reads the param, calls `reverseTrack(T)`, and passes `reversed` to `startGame`.
      `tracks.html` shows a Normal/Reversed toggle; the reversed card is **locked until the
      forward run earns 3★ (bestPPS ≥ 300)**; the reversed card link includes `&dir=rev`,
      shows per-instance records/chips, and appends a ↺ to the name. The thumbnail is **not**
      mirrored — reversed is the same geometry the other way, so the preview matches forward and
      the ↺ suffix is the only marker. Forward and reversed are fully independent persistence
      instances — no store VERSION bump was needed (additive).
    - **Achievements** (pull-model, no event bus): the pure `evaluate()` in
      `js/achievements.js` is called at **two** sites — race finish (`game-engine.js`
      `awardAchievements(pps)`, Time Attack only) and after a purchase (`modify.html`
      `creditShopAchievements()`). Each assembles a `ctx` snapshot (run metrics + persistent
      state + `buildContent(TRACKS, CATALOG)`), evaluates, then persists via `store.js`
      (`achUnlock` gates the reward so it pays once; `achSetProgress` latches ladder progress
      to max) and credits tires. The engine tracks **per-run accumulators** separate from the
      per-combo `S.*` fields — `runNearMisses/runCrashes/runTimeAt8/runDriftSecs/
      runTirePickups/runCaps/comboUnbroken` — since e.g. `S.nearMisses` is zeroed on every
      combo reset. Lifetime `stats.runs`/`stats.driftSecs` feed the drift/race ladders.
      Newly-unlocked defs + a `ddk` flag are passed to `raceResults.show` (toast + crown).
      `achievements.html` renders the full catalog grouped by `CATEGORY_ORDER`; hidden-locked
      cards are masked to `???` (name/desc/reward never rendered into the DOM). Entry: 🏆 on
      the main menu; `absolute-ddk` lights a permanent crown there.
    - **Cola caps pay tires, not score** (since the achievements work): banking a cola-cap
      donut credits `CAP_TIRE_VALUE` (15) tires with its own ledger line, one-time per
      instance via `capCollect`. `CAP_BONUS` and the old PPS-strip are gone — score maps
      straight to PPS. (Tire *pickups* stay separate: `runTirePickups`/`tiresEarned` count
      only `kind:'tire'` so the `clean-sweep` invariant `tiresThisRun === tireTotalOnTrack`
      holds.)
  - `js/scoring.js` — **pure drift-scoring logic** (no imports, no state):
    `isDrifting`, `driftQuality`, `comboMult`, `comboGain`, `slipSign`, `pointsPerSecond`
    + named tuning constants. `pointsPerSecond(score, totalTime)` is the PPS metric
    (returns 0 when `totalTime = 0`). Used by `game-engine.js`; unit-tested in `tests/scoring.test.js`.
  - `js/physics.js` — **pure car kinematics step** (imports only `scoring.js`): `stepCar(car,
    S, steerTarget, P, K, dt)` — steering smoothing, velocity decomposition, grip/roll/
    drift-drag, wobble, angle integration, self-align, position. Mutates `car` + `S.steerSmooth/
    physT`; returns `{ drifting, speed, vS, fwd, side }` for the engine's scoring/skid code.
    A **verbatim** extraction of the old inline `frame()` integration — **feel-critical, do
    not reorder**. Locked by a golden-master in `tests/physics.test.js` (frozen trajectory;
    regenerate deliberately only when intentionally changing handling). `K` =
    `{ PHYS_HZ, GRIP_WOBBLE, STEER_WOBBLE }`.
  - `js/collision.js` — **pure collision / finish geometry** (no imports, no state):
    `finishDot` / `crossedFinish` (lap-line sign-flip), `nearMiss` (within-band check),
    `resolveWall(car, TABLE, CR, hx, hy, nose, bodyPts)` / `resolveProps(car, props, CR,
    bodyPts)` — wall + prop pushback, and `stepKnockedCone(c, props, CONE_R, dt, fAdj)` —
    advances a knocked cone one frame (translate + cone-vs-prop pushback + decay). The
    `resolve*` and `stepKnockedCone` MUTATE their first argument and return nothing (resolve*)
    or void (step*); side effects (haptics, combo burn, score) stay in `game-engine.js`.
    Verbatim extractions — **feel-critical**; locked by golden-masters in
    `tests/collision.test.js`. `bodyPts` is the pre-collision capsule snapshot.
  - `js/input.js` — **pure input mapping** (no imports, no state):
    `resolveSteer(pointers, keys, W) → -1|0|1` — sums pointer-half votes (left < W/2 → −1,
    right → +1) then applies keyboard (ArrowLeft/Right, a/A/d/D); keyboard takes priority
    over touch when non-zero. Called once per `frame()`. Unit-tested in `tests/input.test.js`.
  - **Dependency order (no circular deps):**
    `store.js` / `track-util.js` / `scoring.js` / `collision.js` / `input.js` /
    `economy.js` / `cola.js` / `track-registry.js` / `platform.js` (no imports) →
    `physics.js` → `config.js` → `items.js` → `track*.js` →
    (`state.js` / `render.js`) → `game-engine.js` → (`pause.js` / `confirm-exit.js` / `race-results.js`).
    HTML inline module scripts are the outer shell.
    `select.html` imports `config.js` + `palette.js` + `store.js` + `track-registry.js`
    (car previews + colour palette + persistence + track routing).
    `tracks.html` imports `track-registry.js` + `store.js`.
- **Non-shipped directories (not in the build, not deployed):**
  - `docs/promo/` — marketing/distribution pack: `PLATFORMS.md` (staged portal
    rollout plan — the map; its rollout table indexes the playbooks),
    `steps/NN-*.md` (one executable playbook per rollout step: what/how/when/who),
    `PROMOTER_AGENT.md` (standing prompt for the marketing agent),
    `BUILDER_AGENT.md` (standing prompt for the builder agent: git/worktree
    protocol, task intake + report formats), `SHORTS_PIPELINE.md` (YouTube
    Shorts workflow), `screenshots/` (store-listing screenshots, desktop +
    mobile), `assets/` (cover art, gameplay GIF/video masters).
  - `tools/capture/` — Playwright screenshot/video-capture kit (scripted driving +
    contact sheets); regenerates `docs/promo/screenshots/` and the gameplay
    video masters (`record.js`; `--mobile` = vertical 9:16 iPhone context).
    See its README — Playwright is installed *outside* the repo, never as a
    project dependency.

## Setup

- **Install dependencies:** None. There are no npm dependencies.
  `package.json` exists only to declare `"type": "module"` so that
  `node --check` accepts ES module syntax.
- **Env vars:** None.
- **Local run:** **Must be served over HTTP** — ES modules are blocked on
  `file://` URLs. Default port is **8777**.
  - From inside `DesktopDrift/`:
    `python3 -m http.server 8777`
  - Then open `http://localhost:8777/index.html`.
  - Pre-configured in `.claude/launch.json`.

## Commands

| Task | Command | Notes |
|------|---------|-------|
| install | `npm install` | Installs `terser` + `clean-css` devDeps. |
| dev | `python3 -m http.server 8777` (inside `DesktopDrift/`) | Serves source directly — no build needed for local dev. |
| build | `npm run build` | `scripts/build.js` → `dist/`. Copies asset dirs verbatim; minifies `css/*.css` (CleanCSS lvl 2) and `js/*.js` + `sw.js` (Terser, `module:true`). Not needed for local dev — source is served directly. |
| platform build | `npm run build -- --platform=<name>` | Portal variant → `dist-<name>/` (git-ignored): swaps `js/platform.js` for `js/platform-<name>.js` (error if missing), ships NO service worker (strips inline + `sw-update` registration tags from HTML, prunes `sw.js` + `js/sw-update.js`), strips external links from HTML, prunes SEO files (`google*.html`, `yandex_*.html`, `sitemap.xml`, `robots.txt`). No flag (or `--platform=none`) = default build, byte-identical. |
| portal zip | `npm run build -- --platform=portal --zip` | `portal` = SDK-less preset (Newgrounds/Game Jolt): same stripping/pruning but keeps the default no-op `js/platform.js` (no adapter swap). `--zip` (works with any platform build) packs the output into `dist-<name>.zip` via the system `zip` binary — `index.html` at the zip root, ready to upload. |
| test | `npm test` | `node --test tests/*.test.js`. Must be green before every commit. |
| syntax check | `node --check js/*.js && echo OK` | Run before every commit (all ES modules). |

## Architecture

### Track dependency injection

Neither `state.js` nor `render.js` imports any track module. Instead, each
HTML page is a 3-line inline `<script type="module">` that:
1. Does `import * as T from './js/track-oval.js'` (or `track-green-study.js`).
2. Does `import { startGame } from './js/game-engine.js'`.
3. Calls `startGame(T)` or `startGame(T, { initItems: true })`.

`state.js` exposes `initCar({ startPos, startAngle })` to reset car position.
`render.js` exposes `initRender(T)` to wire all track arrays, apply `T.theme` /
`T.TABLE`, and recompute the minimap scale (`MINI`). This makes track files
interchangeable; `T` also carries `theme`, `id`, `laps` (see game-engine).

### Track files

- **`track-oval.js`:** Parametric closed loop — `centerAt(a)` with sine
  harmonics; 300 `center` samples; `outer`/`inner` offset by `TRACK_HALF=100`.
  No `props` (no items in sandbox mode). Used by `sandbox.html`.
- **`track-green-study.js`:** SVG-driven Time Attack track (see file layout above).
  Used by `green-study.html`; registered in `track-registry.js`.
- *(The old hardcoded `track.js` / config1 track was removed with `timeattack.html`
  in the track-registry refactor; `tracks/config1–7.svg` remain only as references.)*

### Items system (`items.js` + track modules)

`items.js` is a pure catalog — no side effects, no game state. Each item is:

```js
{ hl, r, kind, imgSrc, c }
// hl  = half-length of capsule (0 for circles like plates/cups)
// r   = capsule radius
// kind = 'bowl' | 'plate' | 'knife' | 'fork' | 'board'
// imgSrc = path to SVG asset (relative to site root)
// c   = fallback fill colour
```

Track modules spread item constants with position/angle. SVG-driven tracks
(`track-green-study.js`) derive `x/y/ang` from `<line id="ITEM_*">` proxy-lines;
the older hand-authored style passed them inline, e.g.:

```js
{ ...ITEM_KNIFE_1, x: -1211, y: -255, ang: 1.3 }
```

`prepProp(o)` (in `track-util.js`) caches `o._cos`/`o._sin` and defaults `hl`,
then the track pushes to `props[]`.

SVG assets in `items/` are saved **portrait** (tall). `render.js` auto-detects
orientation via `img.naturalHeight > img.naturalWidth`. Portrait SVGs are drawn
with `ctx.rotate(π/2)` + swapped `drawImage` dimensions so the SVG vertical
axis maps to the capsule long axis.

### Game loop (`game-engine.js`)

- `startGame(T, opts)` is the only export. It captures all track arrays from
  `T`, calls `initRender(T)` / `initCar(T)`, optionally `initItems(props)`.
- `requestAnimationFrame(frame)` drives physics at ~60–120 Hz. `dt` is clamped
  to `0.05` s.
- **`frame()` is a thin orchestrator** — it delegates to pure modules and fires
  side effects (haptics, HUD writes, score, combo) on their return values:
  `resolveSteer` (input) → `stepCar` (physics) → `hitConeAt`+`stepKnockedCone`
  (cone hit + motion) → `resolveWall`/`resolveProps` (collision) →
  `nearestCenter` (track distance) → scoring helpers → finish/checkpoint logic → `draw`.
- **Scoring (combo bank/burn):** Drift points accumulate in `comboPoints`.
  Banked on clean drift end; burned on crash/off-track. Cone hit = flat −100.
- **Tire economy:** `updateCaps` dispatches by `kind`. `kind:'tire'` → proximity
  pickup (`dist < r + TIRE_CR`): `tireCollect`, `addTires(value)`, flash. `kind:'cola'`
  (the drift-donut cap) → banks `CAP_TIRE_VALUE` (15) tires one-time via `capCollect`
  (**not** score any more). On race finish: `addTires(finishPayout(pps))` adds 2–12 coins
  scaled by star rating, plus any achievement rewards (`awardAchievements`).
- **HUD:** DOM overlay (`#hud`). Elements: `#menuBtn`, `#timePanel`, `#mini`,
  score, `#lapCounter`, `#combo`, `#flash`, `#count`, `#hint`.
  Car/colour controls are **not** in the game HUD — selection lives entirely on
  `select.html` (saved to `localStorage`, read by `game-engine.js` on init).

### Rendering (`render.js`)

- `draw()` renders world (camera follows car, ~10% below screen centre).
- `drawMini()` renders minimap. `MINI` is computed inside `initRender(T)` from
  the track's outer extents. Do NOT reference `MINI` at module-load time.
- Portrait SVG detection in `drawProp`:
  ```js
  if (img.naturalHeight > img.naturalWidth) {
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -fh/2, -fw/2, fh, fw); // axes swapped
  } else {
    ctx.drawImage(img, -fw/2, -fh/2, fw, fh);
  }
  ```

### Cola-cap collectibles

Collect cola caps by drifting a full "donut" **around** them (no collision — you orbit,
never crash). The cap fills with red along the exact arc the car sweeps (radial wedge).

- **Placement:** a cap is a `<line id="ITEM_COLA_CAP">` proxy-line in the track SVG
  (same midpoint-as-position convention as items). Each track module's parse loop
  special-cases that id → pushes `{ ...COLA_CAP, x, y }` to its `collectibles` export
  instead of `props` (so no collider). The registry entry's `caps:` must equal the
  number of those lines in the SVG (it's the static badge denominator).
- **Mechanic (`js/game-engine.js` `updateCaps`):** per frame, when the car is in the ring
  `[CAP_INNER_R, CAP_OUTER_R]` around a cap **and** `isDrifting`, accumulate the signed
  swept angle via `stepSweep` (`js/cola.js`); idle → slow decay toward 0 (`CAP_DECAY`,
  ~2.5× slower than fill). `CAP_LOOPS` full circles (currently 2) → collected: `+CAP_TIRE_VALUE`
  (15) tires, flash, and `capCollect(id, i)` persists it one-time. Swept-angle is geometric → frame-rate
  independent (only decay is `dt`-scaled). Runtime per-cap state lives in `S.caps[i]`
  (sweep/prevAng/collected/pop), **not** on the descriptor.
- **Persistence (`js/store.js`):** `stats().caps[trackId]` = **array of collected cap
  indices** (index = position in the track's `collectibles`). `capCollect(id, i)` appends
  + saves; `collectedCaps(id)` reads it; restored on race start so caps stay collected.
  (`stats` is a normal slice in `defaults()`; the load-time merge fills it for old saves —
  no VERSION bump, no reset.)
- **Render (`js/render.js` `drawCaps`):** empty `cola.svg` base; reveal `cola-filled.svg`
  inside a wedge clip `[startAng, startAng+sweep]`; collected → full red + a brief `pop`.
- **UI:** `index.html` Time Attack tile shows total caps collected across tracks
  ("N cap(s) collected"); each `tracks.html` card shows an `N / M cap` badge
  (`is-done` when full). Both read `store` — totals use the registry `caps` denominator
  so neither page imports heavy track modules.
- **Caveat:** persisted index = position in `collectibles`; reordering/removing caps in an
  SVG shifts existing saved flags. Keep cap order stable.

### Sound (`js/sound.js` + `js/sound-params.js`)

Procedural Web Audio, mirroring `haptics.js`: a settings-gated wrapper safe to call anywhere,
silent when `settings().soundEnabled` is false or Web Audio is missing. One shared `AudioContext`,
created lazily and **unlocked on the first user gesture** (capture-phase `pointerdown`/`keydown`/
`touchend`); suspended on `visibilitychange` (tab hidden).

- **`js/sound-params.js` (pure, unit-tested — `tests/sound-params.test.js`):** the `SFX` table
  (each entry a short sine-only "bell" chime — `{ notes:[[freqHz, offsetSec],…], dur, gain, a }`)
  plus volume maths: `gainForVolume` (squared perceptual curve), `clampVolume`, `VOLUME_LEVELS`
  (low/med/high), `levelForVolume`. No DOM, no AudioContext.
- **`js/sound.js` (browser-only):** renders those params (sine osc + exp attack/decay through a
  gentle master lowpass + a light procedural-impulse reverb). `play(id, mag)` + named `sfx.*`
  helpers are fired imperatively at event sites (game-engine + UI handlers), like the haptic
  calls. A per-id throttle (`_MIN_GAP`) stops burst-prone sounds (pickup/cone/crash) machine-gunning.
  `soundThenGo(href, id)` / `tapThenGo(href)` play a cue then defer navigation ~100 ms so it isn't
  cut when the page (and its AudioContext) unloads — used by menu/back links.
  `setMuted(bool)` is a runtime-only mute for platform ad breaks (gates `_on()` + suspends the
  context; never touches persisted settings) — used by `js/platform-crazygames.js`.
- **Aesthetic:** toy-car arcade → soft discrete blips only; **no** engine-drone / tyre-squeal
  synth (a procedural continuous voice was tried and cut — it droned/fatigued). The one
  continuous voice is the **drift sound** (`drift(sliding, slip, active)` / `stopDrift`, called
  per frame from `game-engine.js`): two independent layers — a recorded cardboard-slide sample
  (`sounds/drift.mp3`, looped, volume+pitch react to slip) while actually sliding, plus a
  whisper-quiet band-passed noise "bed" that runs steadily while the combo counter is active
  (`S.comboPoints >= 1`) to give the slide a continuous body.
- **Settings:** `settings().soundEnabled` (default true) + `settings().volume` (0..1, default
  0.65) — added to `defaults()`; the load-time merge fills them for old saves (no VERSION bump).
  UI on `settings.html`: a Sound On/Off toggle + a Low/Med/High volume button-row.
- **Assets:** the only bundled audio is `sounds/drift.mp3` (Pixabay — see `CREDITS.md`),
  pre-cached in `sw.js` ASSETS (an SFX must be ready at event time — it can't wait for a first
  network fetch). Everything else is synthesized (zero files). Dev tool: `tools/sound-lab.html`
  (not shipped) auditions every SFX + live-tweaks params.

### Dev tools (`tools/*.html`, not shipped)
`tools/` holds dev-only prototype pages — NOT copied by `scripts/build.js` (its copy loop lists a
fixed set of dirs; `tools/` isn't one), so they never reach production and need no `sw.js` ASSETS
entry or cache bump. Current: `tools/sound-lab.html` (SFX auditioning) and `tools/car-eyes-lab.html`
(Phase-E0 prototype for the planned car-windshield "expressions" feature — draws procedural eyes on
the real cars via `drawCarPreview`, auto-detects each windshield from the `#222222` glass `details`,
with live tuning + an art-overlay slot). **Gotcha:** the game's service worker (registered on the
same origin) serves `tools/` pages via stale-while-revalidate, so while iterating locally append a
throwaway query (`?v=2`) to force a fresh fetch instead of the cached copy.
- **Gotcha:** changing any sound code/asset needs a `sw.js` cache bump; a new sound module or
  sample must also be added to `ASSETS`.

### Share result (`js/share.js` + `js/share-card.js` + `js/share-util.js`)

Client-only "share your score" from the race-results screen — no backend. A **template PNG**
(`share/template.png`, 1080², all static art + a baked QR) is drawn onto a canvas, then a
**dynamic layer** on top: the player's actual car (via `drawCarPreview`, sized by measuring its
solid bbox → 140px body, RIGHT-rear corner anchored, per `CARD` in `share-util.js`), the PPS
number, DDK crown (600+), stars, track name (auto-shrunk to fit) + best lap.

- `js/share-util.js` — pure, unit-tested (`tests/share-util.test.js`): `CARD` layout config,
  `buildShareText`, `shareFilename`, `litStars`, `pickShareMethod`, `SHARE_URL`.
- `js/share-card.js` — browser: `renderShareCard(canvas, data)` + `loadTemplate()`; reuses
  `car-preview.js`, imports `config.js` (Path2D) so it is browser-only.
- `js/share.js` — browser: `createShareModal()` (mirrors `confirm-exit.js`) — card preview +
  native Web Share (`navigator.canShare({ files })` → `navigator.share`, mobile) OR Download +
  Copy link (desktop). Wired from `race-results.js` (`#rr-share`); the engine passes
  `carModel / look / trackName` into `show()`.
- **Build gotcha (important):** `scripts/build.js` copies only a fixed dir list to `dist/`, so a
  shipped asset dir that isn't in it never reaches production. `share/` (and `sounds/`) had to be
  ADDED to that loop. Any new shipped asset dir must go in **both** `scripts/build.js` and the
  `sw.js` `ASSETS` list.

### Service Worker (`sw.js`)

**Stale-while-revalidate** strategy. The cache key (`const CACHE`) is bumped on every asset change.
The fetch handler serves the cached copy immediately (fast + offline) **and** in
parallel re-fetches from network, overwriting the cache — so updated assets reach
the player on the *next* load even if `CACHE` wasn't bumped (a forgotten bump
self-heals). **Still bump `CACHE` on any asset change**: the version bump byte-changes
`sw.js` so the browser installs a fresh worker, and `addAll(ASSETS)` re-primes the
precache. ASSETS lists every HTML page, CSS, JS, track SVGs, sounds, `share/template.png`,
and icons. Individual `items/` SVGs are NOT precached (fetched + runtime-cached lazily).

**Registration + update nudge (`js/sw-update.js`).** Every page loads this module
(`<script type="module" src="./js/sw-update.js">`) instead of an inline `register`. It
registers with `{ updateViaCache: 'none' }` (browser never serves a stale `sw.js` from the
HTTP cache), calls `reg.update()` on every `visibilitychange`→visible (catches the iOS-PWA
warm-resume case where a relaunch never cold-reloads), and when a fresh worker reaches
`installed` **while an old one still controls the page** (`shouldNudge`, unit-tested) shows a
bottom-centre "New version available — tap to update" toast — but never on the live-driving pages
(`game.html`/`sandbox.html`; `isGameplayPage`, unit-tested), where it would sit over the
touch-steering canvas: the waiting worker persists, so the nudge appears on the next menu page.
Tapping posts `{type:'SKIP_WAITING'}`
to the waiting worker and reloads on `controllerchange` (only after the user opts in — never on
first install, never mid-race). **`sw.js` no longer eagerly `skipWaiting()`s** — a new worker
*waits* so the nudge can offer the switch; it activates only on that message. Offline-safe by
construction: no network → no `updatefound` → no toast, the cached app runs untouched.

> Why prod sometimes showed stale content before v31: four commits changed
> `tracks.html` / `css/tracks.css` / `track-registry.js` without bumping `CACHE`,
> so cache-first kept serving the old precached copies. SWR + the bump fixes it.
> (Installed PWAs also lagged because iOS warm-resumes without cold-reloading — the
> `js/sw-update.js` nudge + `visibilitychange` re-check now surfaces updates there.)

## Development rules

> Full text: **`rules.md`** (adapted from Andrej Karpathy's CLAUDE.md).

### Think before coding
- State assumptions explicitly. If uncertain, ask — don't guess silently.
- If multiple interpretations exist, surface them and let the human decide.
- If a simpler approach exists, say so and push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity first (YAGNI / KISS)
- Write the minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked. No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- If the result is 200 lines and it could be 50 — rewrite it.

### Core principles
- **KISS** — as simple as possible, never simpler.
- **DRY** — every piece of logic has a single, unambiguous home.
- **YAGNI** — add a feature only when it is actually needed.
- **SoC** — each module/function addresses one concern (e.g. `pause.js` owns
  its own DOM, state, and key binding — nothing else touches it).

### Before every git push
Run `npm test` (must be green) + the `node --check` syntax pass. Update `AGENTS.md`
(and `CLAUDE.md`) to reflect the actual file structure, new modules, changed
constants, and any gotchas discovered during the work. Add/extend tests for any new
pure logic in the same change.

### Adding a new HTML page (SEO checklist)
Every new public-facing page must include in `<head>`:
1. `<title>` — descriptive, ideally "Desktop Drift — [Page Purpose]"
2. `<meta name="description" content="...">` — 1–2 sentence summary (≤ 160 chars)
3. `<link rel="canonical" href="https://letulip.github.io/DesktopDrift/page.html">`
4. If it's a transitional/app screen (not a real landing page): add
   `<meta name="robots" content="noindex, follow">` and omit it from `sitemap.xml`.

After adding the page:
- Add it to `sitemap.xml` (if indexable) with today's `<lastmod>` date.
- Add it to the `ASSETS` array in `sw.js` and bump the cache version.
- Add it to the AGENTS.md **Pages** list.

## Code style

- **Language:** Vanilla ES2020, native ES modules. No TypeScript, no JSX,
  no bundler.
- **Indentation:** 2 spaces. Semicolons used. `const`/`let` (no `var`).
- **Naming:** `camelCase` for vars/functions; `UPPER_SNAKE` for constants
  (`CFG`, `TABLE`, `TRACK_HALF`, `CONE_R`, `MINI`, `ITEM_*`).
- **Language:** **English throughout** — comments, identifiers, and strings
  (rules.md: "use only english throughout the entire project"). No Russian.
  *(Some legacy comments are still Russian; convert them to English when you
  touch that code, don't add new Russian.)*
- **No circular deps:** The one-way chain must be preserved:
  `config → items → track*(+track-util) → state/render → game-engine(+scoring) → pause → [HTML inline script]`
- **Do not add npm packages** or a bundler without explicit instruction.

## Design language

Guiding philosophy: **DESIGN.md** (distinctive, non-generic UI). All tokens live in
`css/base.css` `:root` — **use `var(--token)`, never hardcode** colours/fonts.

- **Theme:** warm, dark *kitchen-table* world. Deep brown-blacks, single amber accent.
- **Tokens (`css/base.css`):**
  - Backgrounds: `--bg-deep` `#0b0907` · `--bg-mid` `#14110f` · `--bg-raise` `#2a2622`.
    `--bg-vignette` (radial), `--grain` (feTurbulence noise), `--bg-screen`
    (grain over vignette — used by menu/garage/settings).
  - Accent: `--accent` `#ffb14d` (the one signature colour) · `--accent-gold` `#ffd34d`.
    Soft variants `--accent-tint` / `--accent-line` / `--accent-glow`;
    `--accent-text` (logo/heading gradient).
  - Surfaces: `--surface` / `--surface-line` (neutral panels & cards).
  - Stat bars: `--stat-spd` (amber) · `--stat-hdl` (ice-blue) · `--stat-acc` (mint).
  - Shape/motion: `--r-panel` 10px · `--r-card` 16px · `--ease` .14s.
  - Text: `--ink` `#fff`; dim via `opacity`, not separate greys.
  - Canvas-only colours (cone `#ff7a1a`, skids) stay JS literals in `render.js`.
  - Neon underglow: `NEON_PALETTE` in `palette.js` (player-chosen).
- **Typography:** `--font-display` = **Unbounded 800** (self-hosted
  `fonts/unbounded-800-latin.woff2`, OFL, in SW cache) for logo/headings/tile titles/
  arcade HUD moments. `--font-body` = system stack for everything else.
- **Texture & depth:** subtle film grain on menu/garage/settings via `--bg-screen`.
- **Motion:** staggered `riseIn` entrance on the menu (`menu.css`, `fill-mode:
  backwards`, gated by `prefers-reduced-motion`); `--ease` hover/active transitions.
- **PWA `theme-color`:** `#14110f` (warm), on every page.
- **Constraints:** see rules.md → Design (no CDN fonts; self-host + cache; 60 fps).

## Testing

- **Runner:** Node's built-in `node --test` + `node:assert/strict` (zero deps, no
  build — fits the pure-static stack). Run with `npm test`. Tests live in `tests/`,
  one `*.test.js` file per concern.
- **What gets unit-tested:** pure logic only — `store.js` (defaults, save/load,
  merge-over-defaults, corrupt-data reset, unknown-version preservation),
  `scoring.js` (drift/combo formulas), `physics.js` + `collision.js` (golden-masters),
  `track-util.js` (chaikin / edge offset / cones / checkpoints / prepProp), `cola.js`,
  `input.js`, and as they land: data tables in `config.js`, the future collision validator.
- **What stays manual:** anything needing Canvas2D / Path2D / DOM / `requestAnimationFrame`
  — `render.js`, `game-engine.js`, `pause.js`, `confirm-exit.js`. These can't run in
  Node, so they ride the browser smoke test below.
- **Manual smoke test:** `index.html` → Sandbox via `select.html`; Time Attack via
  `tracks.html` → pick a track → `select.html?track=<id>` → pick car + colour → drive.
  Check HUD, scoring, collisions, items visible and not blocking the racing line,
  pause + back-to-menu confirm, lap counter (`1/3`), and the race-results overlay
  (score + per-lap times + Back to tracks) on the final lap.
- **Process isolation:** `node --test` runs each `tests/*.test.js` in its own process,
  so module-level caches (`store.js`'s `_s`) don't leak between files. Conflicting
  setups (fresh-defaults vs. load-existing) live in **separate files** for that reason.
- **Discipline:** new pure logic ships with tests in the same change; a bug fix ships
  with a test that would have caught it. `npm test` must be green before every commit.

## Deployment

- **Branch → environment:** `main` → GitHub Pages (`github-pages` environment).
  No staging branch.
- **CI/CD:** GitHub Actions `.github/workflows/static.yml` — on push to `main`:
  `npm ci` → `npm run build` → deploys `dist/` to Pages. CI has no test step —
  run `npm test` + smoke test locally before merging.
- **Build script** (`scripts/build.js`): cleans `dist/`, copies asset dirs
  (`fonts/`, `icons/`, `cars/`, `items/`, `objects/`, `tracks/`) + all `.html` +
  root statics verbatim; minifies every `css/*.css` (CleanCSS level 2) and
  `js/*.js` + `sw.js` (Terser, `module: true, compress, mangle`). Exits 1 on
  any minification error so CI catches broken syntax before deploy.
- **`dist/` is never committed** — it is git-ignored and fully regenerated by CI.
  Run `npm run build` locally only to validate the production bundle or debug CI.
- **Rollback:** Revert commit on `main` and push. Do **not** force-push `main`.
- **Feature branches:** Work in progress lives in `feat/*` / `fix/*` / `chore/*`
  branches, merged to `main` via PR when ready.
- **Skills:** repo-specific workflows live in `.claude/skills/` —
  `desktopdrift-pr` (branch → test → SW-clear browser verify → bump → PR) and
  `desktopdrift-new-track` (the add-a-track pipeline). Use them.

## Safety (DO NOT SHORTEN)

- **Never commit secrets, `.env`, or API keys.**
- **Never change a production database without a backup.** (No DB exists.)
- **Never deploy without a successful local build/validation.** "Build" = green
  `npm test` plus the `node --check` syntax pass plus a manual in-browser smoke test.
- **Never force-push to `main`/`master`.**
- **Never delete migrations or rewrite git history.**
- **Run pre-flight checks before destructive operations** (file deletes, bulk
  rewrites, `git reset --hard`, branch deletion).
- **Do not modify project source code when the task is documentation only.**

## Gotchas

- **Frame-rate handling = consistent *average* + deliberate *liveliness*.**
  Per-frame multipliers are raised to `dt * PHYS_HZ` so the average per-second
  decay is identical at any refresh rate. Liveliness (drifting "alive" circles)
  is re-injected via smooth time-driven noise (`wob`): a sum of incommensurate
  sines of elapsed seconds `physT`, NOT frame count. Two layers: `wobSlow`
  (period ~3–8 s, main radius wander) + `wobFast` (chassis texture). Both gated
  by `cornering` (slip × speed) so straights stay clean. `PHYS_HZ`, `GRIP_WOBBLE`,
  `STEER_WOBBLE` are the tuning knobs in `config.js`.
- **Two `launch.json` configs with different cwd assumptions.** See the `.claude/`
  folder. Both use port **8777** — launching both at once conflicts on the port.
- **SW cache key should still be bumped** (`desktop-drift-vN` in `sw.js`) on any
  asset change — it guarantees the update on the *first* reload. The stale-while-
  revalidate handler does refresh the cache on the next load even without a bump, so
  a forgotten bump is no longer fatal (just one load late). New JS modules still must
  be added to the `ASSETS` array for offline precache.
- **`MINI` is computed inside `initRender(T)`, not at module load time.** Do not
  call any render function before `initRender(T)` runs.
- **Portrait SVGs only.** All files in `items/` are portrait (taller than wide).
  The render auto-rotates them. If you add a landscape SVG, it will appear
  sideways — update `drawProp` or save the asset in portrait orientation.
- **Sandbox mode has no items.** `track-oval.js` does not import `items.js` and
  its `props` array is empty. `startGame(T)` (no `initItems` option) is correct.
- **All persistence goes through `js/store.js`** — no module touches `localStorage`
  directly. Key: `'desktop-drift'`, versioned schema (V1). Garage slice holds
  `{ carIndex, bodyColor, neonColor }`; written by `select.html` on "Race!", read
  by `game-engine.js` on init. Future slices: `records`, `settings`, `achievements`.
- **Neon render.js details:** three segments (3 % nose | 15.5 % gap | 58 % body |
  15.5 % gap | 8 % tail), each inset 2 % from the car tips so the coloured fill
  doesn't peek out from under the body. `ctx.shadowBlur = 22` creates the glow.
  Black drop-shadow is suppressed when `M.neonColor` is set.
- **`overflow: hidden` + `max-height` animation (neon palette):** `#neon-palette-wrap`
  uses `box-sizing: border-box` + `padding: 8px 10px` so that at `max-height: 0`
  the entire box (padding included) collapses to 0, and at `max-height: 100px` the
  8 px breathing room prevents `box-shadow` rings on neon swatches from being clipped.
- **Nearest-centerline is an incremental windowed scan** (`distToTrack` in
  `game-engine.js`): searches ±`NEAR_W` points around the last index, not the whole
  loop. Assumes the car moves continuously along the closed centerline (true in normal
  play, incl. the figure-8 Work Desk track). If you ever teleport the car far, reset
  `nearIdx` to avoid a stale local minimum.
- **Lap counter shows the in-progress lap** (`lapNum + 1`), not completed laps.
- **Cones vs. objects differ in scoring.** Hitting a cone = flat −200 (combo
  survives). Hitting a kitchen object or wall / going off-track = combo burned.
- **Knocked cone → prop collision.** When a cone is knocked and slides across the
  table, `game-engine.js` checks it against every prop using the same capsule formula
  as car→prop collision (closest point on `hl`-capsule, not just center distance).
  On overlap: cone is pushed out along the contact normal; velocity reflected with
  restitution 0.8 (`vDotN * 0.8`), spin reversed and damped (`* −0.4`).
  Cost: O(knocked_cones × props) per frame — typically 0–45 checks, negligible.
- **Track SVG closing-vertex pattern.** All shipped SVGs end with `L start_x start_y Z`
  (explicit return to first vertex before the implicit Z-close). `parseSvgPath` now strips
  this duplicate automatically (`dist(pts[0], pts[-1]) < 0.5`). New SVGs authored the
  same way are handled; do **not** remove the dedup — it prevents 16 coincident Chaikin
  points and the resulting inner-edge normal instability at start/finish.
- **Hairpin inner-edge inversion.** When a corner has R < TRACK_HALF (100 GU), naive
  `±half` offset crosses the centre of curvature and inverts the inner arc (self-
  intersecting loop, fill overlap, misplaced cones). `offsetEdges` clamps the inner
  offset to `min(half, R−10)` via the local circumradius estimate. If you lower
  TRACK_HALF or add tracks with tighter hairpins, watch for R < new TRACK_HALF.
- **Item clearance validation.** After placing or resizing items in a track SVG,
  run the inline Node script below to check every `<line id="ITEM_*">` midpoint
  against the raw track-path polyline. Items need `dist > TRACK_HALF + item.r`
  from the nearest path segment. The script uses the same `scale=0.25` and
  `svgCx/svgCy = viewBox/2` logic as `track-factory.js`. Copy `itemSizes` from
  `js/items.js` for the items you changed; items not in the map default to `r=50`
  (conservative). A 30–50 GU buffer above the minimum is recommended because
  Chaikin smoothing pulls corners inward and may reduce clearance slightly.

  ```bash
  # Usage: node --input-type=module << 'EOF' ... EOF   (from DesktopDrift/)
  # Paste the script from the "Item clearance validator" section below, or use:
  node tools/check-item-clearance.js tracks/workbench.svg
  ```

  The script lives at `tools/check-item-clearance.js` (run standalone, no deps).
- **HUD DOM writes are guarded.** `render.js` caches the 10 HUD element refs in
  `initRender` and writes `textContent`/`innerHTML` only when the value changes. The
  prev-value guards are reset to `null` inside `initRender` on each track start — do
  not add unconditional per-frame DOM writes to the HUD loop.

## Commit / PR conventions

- **Remote:** `git@github.com:letulip/DesktopDrift.git`. Default branch `main`.
- **Format:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`,
  `chore:`). Scope optional (e.g. `fix(items):`, `feat(track):`).
- **Required before commit:** `npm test` green + `node --check` pass (see Commands)
  + manual browser smoke test served over HTTP.
- **Pushing to `main` = live production deploy.** Treat accordingly.
