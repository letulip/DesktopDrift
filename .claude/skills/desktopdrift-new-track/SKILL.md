---
name: desktopdrift-new-track
description: Use this skill when adding a new Time Attack track / location to this Desktop Drift repo. Triggers — "add a track", "new location", "build the <name> track", "make a track from this SVG", "add a kitchen/office/workbench track", "new Time Attack circuit". Walks the pipeline: author/parse the track SVG (per tracks/TRACK_STYLE_GUIDE.svg) → new track module after js/track-green-study.js using js/track-util.js helpers → wire colours (tracks/TRACK_COLOR_SCHEMES.svg) + items (js/items.js) → track-registry entry + SW ASSETS + cache bump → browser smoke. No HTML page needed — game.html handles all tracks via dynamic import. For the branch/test/verify/PR mechanics it defers to the desktopdrift-pr skill.
---

# Desktop Drift — add a Time Attack track

Reference material lives in `tracks/TRACK_STYLE_GUIDE.svg` (authoring conventions) and
`tracks/TRACK_COLOR_SCHEMES.svg` (per-location palettes). Code template: `js/track-green-study.js`;
shared geometry: `js/track-util.js`; item catalog: `js/items.js`; track list: `js/track-registry.js`.

A track is plugged in by **registering it** (`js/track-registry.js`) — `tracks.html` then
auto-builds its selection card + preview, and `game.html?track=<id>` runs the race via
dynamic import. **No HTML page per track** — `game.html` handles all tracks.
No `index.html` tile, no sitemap entry (`game.html` is `noindex`).

> Branch / tests / browser-verify / PR mechanics → use the **desktopdrift-pr** skill
> (including the mandatory SW-clear before verifying). Below = track-specific work.

## Steps

1. **Geometry (SVG).** Author in Figma per `tracks/TRACK_STYLE_GUIDE.svg`:
   - `<path id="track_path" d="…">` — the CENTERLINE, commands M/L/H/V/Z only (absolute),
     `stroke-width=800` (= track width; TRACK_HALF 100 @ SCALE 0.25).
   - Items as proxy lines `<line id="ITEM_<NAME>" x1 y1 x2 y2/>`: midpoint = position,
     direction = angle; ID = an export from `js/items.js` (trailing `_N` is stripped, so
     `ITEM_PENCIL_2` → `ITEM_PENCIL`). The `track_path` must have NO id-clashing line.
   - viewBox centre = game (0,0); SVG +Y maps to game −Y.
   - Keep ≥ 800–1200 SVG units (TABLE_MARGIN 200–300 game units) clear between the outer
     track edge and the viewBox boundary. Save as `tracks/<id>.svg`.
2. **Track module** `js/track-<id>.js` — copy `js/track-green-study.js` and change the
   `fetch('./tracks/<id>.svg')` path + the viewBox-derived `SVG_CX`/`SVG_CY`/`SCALE`.
   It already: top-level `await fetch` → `DOMParser` → parse `track_path` → helpers from
   `js/track-util.js` (`chaikin` ×4, `offsetEdges`, `placeCones`, `sampleCheckpoints`,
   `prepProp`) → `TABLE` from outer bounds + margin → items from `line[id^="ITEM_"]`.
   Exports the full track shape **plus** `TABLE`, `theme`, `id` (records key) and
   `laps` (race length, default 3). `game-engine.js` reads `laps`/`id` to run the
   fixed-lap race + write `store.records()[id].timeattack` + show the results overlay —
   all automatic once those are exported.
3. **Colours (`theme`).** Pick a scheme from `tracks/TRACK_COLOR_SCHEMES.svg` /
   `tracks/track_themes.json` (dining-oak / steel-kitchen / cafe-marble / green-study /
   workbench / dev-desk). Theme injection is already wired: `render.js` merges `T.theme`
   over `THEME_DEFAULT` in `initRender`. So just (a) `export const theme = {…}` from the
   track module (background/table/tableEdge/track/startLine/checkpoint/cone/skid), and
   (b) put the same 4 preview colours (background/table/tableEdge/track) on the registry
   entry. ⚠️ Light schemes (cafe-marble, steel-kitchen) need HUD fixes: `#hint` (white, no
   backing) and a light start/finish flag vanish on a light surface — set a dark
   `startLine` in-theme and give `#hint` a text-shadow in `css/sandbox.css`.
4. **Items.** From `js/items.js`: existing `ITEM_*` exports drop straight in. Some SVGs
   exist without a descriptor — add a one-line `{ hl, r, kind, imgSrc, c }`. New items →
   draw a top-down SVG (portrait, 1:64 scale) + descriptor. Items must read from above
   (avoid bare circles); keep clear of the racing line
   (distance-to-centerline > TRACK_HALF + collider.r + margin); ~8–12 per track.
5. **Cola caps (collectibles).** Optional but free if you copied the template. Place one
   or more `<line id="ITEM_COLA_CAP" .../>` proxy-lines in the SVG (line midpoint =
   position) at WIDE corners where a drift "donut" fits clear of walls/props. The
   template's parse loop already special-cases `ITEM_COLA_CAP` → pushes `{ ...COLA_CAP }`
   into the `collectibles` export (NOT `props`, so no collision). Everything else is
   automatic: `game-engine.js` `updateCaps` handles the drift-to-collect mechanic + scoring
   + persistence (`store.capCollect`), `render.js` `drawCaps` fills the cap, and the
   `index.html` / `tracks.html` badges show progress. Each cap is keyed by `capId`
   (`"${cx},${cy}"`) — a stable coordinate key so adding/reordering caps in the SVG later
   won't corrupt previously saved collection state. See `js/track-green-study.js`.
6. **Register** — add/uncomment the `{ id, name, desc, svgSrc, caps, theme }` entry in
   `js/track-registry.js`. `name`/`desc` are player-facing (English); `caps` = the number
   of `ITEM_COLA_CAP` lines you placed in the SVG (0 if none — it's the badge denominator).
   This is what makes the track appear on `tracks.html`. **No `page` field** — routing is
   automatic via `game.html?track=<id>` (dynamic import of `js/track-${id}.js`).
7. **Service worker** `sw.js`: add `tracks/<id>.svg` and `js/track-<id>.js` to `ASSETS`,
   then bump the cache version. **No HTML to add** — `game.html` is already in ASSETS.
   (`js/cola.js` + the cola SVGs are already in ASSETS — shared across tracks.)
   (SWR self-heals a forgotten bump on the next load, but bump anyway for first-load-fresh.)
8. **Verify + PR** via the **desktopdrift-pr** skill (npm test + node --check + browser
   smoke with the SW cleared; branch `feat/track-<id>` → PR).

## What to eyeball in the smoke test
`tracks.html` card preview (right shape + theme colours, correctly oriented) → pick track
→ garage shows the track name → drive: track shape (minimap), items placed and NOT blocking
the racing line, start/finish checkered flag + cones readable against the theme, combo +
lap counter (`1/3`), and the **race-results overlay** (score, per-lap times, Back to tracks)
after the final lap. On figure-8 layouts confirm the windowed `distToTrack` scan gives no
false off-track. If the track has cola caps: drifting a donut around one fills it and
collects it (+score), the `tracks.html` card shows `N / M cap`, and the `index.html` Time
Attack tile shows the total. Console must be error-free.
