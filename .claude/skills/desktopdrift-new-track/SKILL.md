---
name: desktopdrift-new-track
description: Use this skill when adding a new Time Attack track / location to this Desktop Drift repo. Triggers — "add a track", "new location", "build the <name> track", "make a track from this SVG", "add a kitchen/office/workbench track", "new Time Attack circuit". Walks the pipeline: author/parse the track SVG (per tracks/TRACK_STYLE_GUIDE.svg) → new track module after js/track-workdesk.js using js/track-util.js helpers → wire colours (tracks/TRACK_COLOR_SCHEMES.svg) + items (js/items.js) → page + menu tile + sitemap + SW ASSETS + cache bump → browser smoke. For the branch/test/verify/PR mechanics it defers to the desktopdrift-pr skill.
---

# Desktop Drift — add a Time Attack track

Reference material lives in `tracks/TRACK_STYLE_GUIDE.svg` (authoring conventions) and
`tracks/TRACK_COLOR_SCHEMES.svg` (per-location palettes). Code template: `js/track-workdesk.js`;
shared geometry: `js/track-util.js`; item catalog: `js/items.js`.

> Branch / tests / browser-verify / PR mechanics → use the **desktopdrift-pr** skill
> (including the mandatory SW-clear before verifying). Below = track-specific work.

## Steps

1. **Geometry (SVG).** Author in Figma per `tracks/TRACK_STYLE_GUIDE.svg`:
   - `<path id="track_path" d="…">` — the CENTERLINE, commands M/L/H/V/Z only (absolute),
     `stroke-width=800` (= track width; TRACK_HALF 100 @ SCALE 0.25).
   - Items as proxy lines `<line id="ITEM_<NAME>" x1 y1 x2 y2/>`: midpoint = position,
     direction = angle; ID = an export from `js/items.js` (trailing `_N` is stripped).
   - viewBox centre = game (0,0); SVG +Y maps to game −Y.
   - Keep ≥ 800–1200 SVG units (TABLE_MARGIN 200–300 game units) clear between the outer
     track edge and the viewBox boundary. Save as `tracks/<NAME>.svg`.
2. **Track module** `js/track-<name>.js` after `track-workdesk.js`:
   top-level `await fetch('./tracks/<NAME>.svg')` → `DOMParser` → parse `track_path` →
   helpers from `js/track-util.js` (`chaikin` ×4, `offsetEdges`, `placeCones`,
   `sampleCheckpoints`, `prepProp`) → `TABLE` from outer bounds + margin → items from
   `line[id^="ITEM_"]`. Export the same shape as the other tracks (center/outer/inner/
   cones/props/checkpoints/startPos/startAngle/TRACK_HALF/CONE_R/CP_R/K/TABLE).
3. **Colours.** Pick a scheme from `tracks/TRACK_COLOR_SCHEMES.svg` (dining-oak /
   steel-kitchen / cafe-marble / green-study / workbench / dev-desk; hex labelled on each).
   World colours are currently literals in `render.js`; if not yet on dependency injection,
   first refactor `render.js` to read a `theme` from the track namespace (default = current
   dining-oak), then export `theme` from the track module. ⚠️ Light schemes (cafe-marble,
   steel-kitchen) need HUD fixes: `#hint` (white, no backing) and the start/finish line
   `#e8e8e8` vanish on a light surface — make the start line dark in-theme and give `#hint`
   a text-shadow.
4. **Items.** From `js/items.js`: existing `ITEM_*` exports drop straight in. Some SVGs
   exist without a descriptor (e.g. `grater`, `board1/2`, `cola-filled`) — add a one-line
   `{ hl, r, kind, imgSrc, c }`. New items → draw a top-down SVG (portrait, 1:64 scale) +
   descriptor. Items must read from above (avoid bare circles); keep clear of the racing
   line (distance-to-centerline > TRACK_HALF + collider.r + margin); ~8–12 per track.
5. **Page** `<name>.html` after `workdesk.html` (canvas + HUD; inline module imports the
   track and calls `startGame(T, { initItems: true })`); follow the SEO checklist in
   `AGENTS.md` (title/description/canonical; transitional → `noindex`). Add a tile to
   `index.html` and an entry to `sitemap.xml` (if indexable).
6. **Service worker** `sw.js`: add `tracks/<NAME>.svg` and `js/track-<name>.js` to
   `ASSETS`, then bump the cache version.
7. **Verify + PR** via the **desktopdrift-pr** skill (npm test + node --check + browser
   smoke with the SW cleared; branch `feat/track-<name>` → PR).

## What to eyeball in the smoke test
Track shape (minimap), items placed and NOT blocking the racing line, start/finish and
cones readable against the theme, combo/laps counting, and on figure-8 layouts the
windowed `distToTrack` scan giving no false off-track.
