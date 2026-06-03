# Desktop Drift

Top-down arcade drift-racing game that takes place on a kitchen table. Pure
client-side HTML5 Canvas 2D — no build step, no dependencies, no backend.

## Overview

- **Stack:** Single-page static site. Plain HTML + CSS + vanilla JavaScript
  (ES2020, native ES modules, no transpiler). Rendering via Canvas 2D
  (`requestAnimationFrame` loop). No framework, no bundler, no npm.
- **Pages (5):**
  - `index.html` — menu landing screen. Static markup only, no game logic.
    Tiles now link to `select.html?mode=sandbox` / `select.html?mode=timeattack`.
  - `select.html` — **garage / car-selection screen** shown between menu and game.
    Renders live canvas previews of all cars using `CARS[*]._p2d` from `config.js`.
    Player picks car model and body colour, saves `{ carIndex, bodyColor }` to
    `localStorage` and navigates to the target game page.
  - `sandbox.html` — free-drive mode on the parametric oval track. Inline
    `<script type="module">` imports `track-oval.js` and calls
    `startGame(T)` (no items).
  - `timeattack.html` — lap-timed mode on the config1 (SVG-derived) track.
    Inline `<script type="module">` imports `track.js` and calls
    `startGame(T, { initItems: true })`.
  - `donate.html` — donation page. Bybit UID with Copy button, link to Bybit Pay.
- **File layout:**
  - `css/base.css` — shared `html`/`body` reset.
  - `css/menu.css` — menu styles (`index.html`).
  - `css/sandbox.css` — HUD styles + mobile media query (shared by both game
    pages).
  - `js/config.js` — pure static data: `CFG`, `CARS` (with Path2D init),
    `TABLE`, physics constants (`PHYS_HZ`, `GRIP_WOBBLE`, `STEER_WOBBLE`,
    `NM_BAND`).
  - `js/items.js` — item catalog with 1:64-scale physics data. Each export is
    a plain object `{ hl, r, kind, imgSrc, c }`. No game state; no imports.
    Used by track files to spread item descriptors with position/angle.
  - `js/track.js` — config1 track (SVG-derived Chaikin-smoothed polygon).
    Exports: `center`, `outer`, `inner`, `cones`, `props`, `checkpoints`,
    `startPos`, `startAngle`, `TRACK_HALF`, `CONE_R`, `CP_R`, `K`.
    Imports item constants from `items.js` and places them via `addProp()`.
  - `js/track-oval.js` — parametric oval track (classic sandbox mode).
    Same export shape as `track.js`. Does NOT import `items.js` (no props).
  - `js/state.js` — all mutable game state: `car`, `S` (lap/scoring/physics),
    `keys`, `pointers`. Exports `initCar(T)` to set starting position/angle
    from the track namespace. No hardcoded track import.
  - `js/render.js` — canvas setup, `resize()`, `draw()`, `drawMini()`.
    Exports `initRender(T)` and `initItems(props)`. No hardcoded track import.
    SVG orientation is auto-detected (`naturalHeight > naturalWidth` → portrait
    → rotate π/2 + swap draw dimensions).
  - `js/game-engine.js` — sole entry point for both game modes. Exports
    `startGame(T, opts = {})`. Receives the full track namespace `T`, calls
    `initRender(T)` and `initCar(T)`, optionally `initItems(props)` when
    `opts.initItems` is true. All physics/input/scoring logic lives here.
    On init reads `carConfig` from `localStorage` (set by `select.html`) to
    apply the chosen car model and body colour.
  - `js/pause.js` — self-contained pause component. Creates `#pauseBtn` and
    `#pauseOverlay` DOM elements, handles P key. Returns `{ isPaused, toggle,
    pause, resume }`. Styled via `css/sandbox.css`.
  - `js/confirm-exit.js` — self-contained exit-confirmation dialog. Creates
    `#confirmExitOverlay` DOM. Returns `{ show({ onExit, onCancel }), hide }`.
    Called by `game-engine.js` when the Menu button is tapped.
  - **Dependency order (no circular deps):**
    `config.js` → `items.js` → `track*.js` → (`state.js` / `render.js`) →
    `game-engine.js` → (`pause.js` / `confirm-exit.js`).
    HTML inline module scripts are the outer shell.
    `select.html` imports only `config.js` (car previews).

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
| install | — (none) | No dependencies. |
| dev | `python3 -m http.server 8777` (inside `DesktopDrift/`) | Static file server. |
| build | — (none) | No build step. |
| test | — (none) | No test suite. |
| syntax check | `node --check js/config.js js/items.js js/track.js js/track-oval.js js/state.js js/render.js js/game-engine.js js/pause.js js/confirm-exit.js && echo OK` | Run before every commit. |

## Architecture

### Track dependency injection

Neither `state.js` nor `render.js` imports any track module. Instead, each
HTML page is a 3-line inline `<script type="module">` that:
1. Does `import * as T from './js/track-oval.js'` (or `track.js`).
2. Does `import { startGame } from './js/game-engine.js'`.
3. Calls `startGame(T)` or `startGame(T, { initItems: true })`.

`state.js` exposes `initCar({ startPos, startAngle })` to reset car position.
`render.js` exposes `initRender(T)` to wire all track arrays and recompute the
minimap scale (`MINI`). This makes both track files interchangeable.

### Track files

- **`track-oval.js`:** Parametric closed loop — `centerAt(a)` with sine
  harmonics; 300 `center` samples; `outer`/`inner` offset by `TRACK_HALF=100`.
  No `props` (no items in sandbox mode). Used by `sandbox.html`.
- **`track.js`:** 26-vertex SVG polygon (from `tracks/config1.svg`,
  `viewBox 0 0 245 121`, `SCALE=13`). Smoothed by 4 Chaikin passes
  (26→52→104→208→416 points). Imports item descriptors from `items.js` and
  places 12 items via `addProp()`. Used by `timeattack.html`.

### Items system (`items.js` + `track.js`)

`items.js` is a pure catalog — no side effects, no game state. Each item is:

```js
{ hl, r, kind, imgSrc, c }
// hl  = half-length of capsule (0 for circles like plates/cups)
// r   = capsule radius
// kind = 'bowl' | 'plate' | 'knife' | 'fork' | 'board'
// imgSrc = path to SVG asset (relative to site root)
// c   = fallback fill colour
```

`track.js` spreads item constants with position/angle:

```js
{ ...ITEM_KNIFE_1, x: -1211, y: -255, ang: 1.3 }
```

`addProp(o)` caches `o._cos = Math.cos(o.ang)` and `o._sin = Math.sin(o.ang)`
and pushes to `props[]`.

SVG assets in `items/` are saved **portrait** (tall). `render.js` auto-detects
orientation via `img.naturalHeight > img.naturalWidth`. Portrait SVGs are drawn
with `ctx.rotate(π/2)` + swapped `drawImage` dimensions so the SVG vertical
axis maps to the capsule long axis.

### Game loop (`game-engine.js`)

- `startGame(T, opts)` is the only export. It captures all track arrays from
  `T`, calls `initRender(T)` / `initCar(T)`, optionally `initItems(props)`.
- `requestAnimationFrame(frame)` drives physics at ~60–120 Hz. `dt` is clamped
  to `0.05` s.
- **Physics:** Velocity decomposed into forward `vF` and lateral `vS`. Per-frame
  multipliers raised to `dt * PHYS_HZ` for frame-rate independence. Grip
  breathing via `GRIP_WOBBLE` + `STEER_WOBBLE` (see Gotchas).
- **Scoring (combo bank/burn):** Drift points accumulate in `comboPoints`.
  Banked on clean drift end; burned on crash/off-track. Cones = flat −200.
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

### Service Worker (`sw.js`)

Cache-first strategy. Current cache key: **`desktop-drift-v11`**. Bump this
string whenever static assets change (forces all clients to re-download).
ASSETS list includes all HTML pages (including `select.html` and `donate.html`),
CSS, JS, and icon files. Does NOT cache individual SVG item assets (fetched
lazily by the browser).

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
Update `AGENTS.md` (and `CLAUDE.md`) to reflect the actual file structure,
new modules, changed constants, and any gotchas discovered during the work.

## Code style

- **Language:** Vanilla ES2020, native ES modules. No TypeScript, no JSX,
  no bundler.
- **Indentation:** 2 spaces. Semicolons used. `const`/`let` (no `var`).
- **Naming:** `camelCase` for vars/functions; `UPPER_SNAKE` for constants
  (`CFG`, `TABLE`, `TRACK_HALF`, `CONE_R`, `MINI`, `ITEM_*`).
- **Comments:** In-code comments are in **Russian**. Keep new comments
  consistent with surrounding code.
- **No circular deps:** The one-way chain must be preserved:
  `config → items → track* → state/render → game-engine → pause → [HTML inline script]`
- **Do not add npm packages** or a bundler without explicit instruction.

## Testing

- **Framework:** None. Zero automated tests.
- **Validation:** (1) `node --check` syntax pass on all JS files (see Commands).
  (2) Manual browser smoke test: `index.html` → both game modes, drive the car,
  check HUD, scoring, collisions, items visible and not fully blocking track.

## Deployment

- **Branch → environment:** `main` → GitHub Pages (`github-pages` environment).
  No staging branch.
- **CI/CD:** GitHub Actions `.github/workflows/static.yml` — deploys whole repo
  on push to `main`. No build step, no lint/test in CI — validate locally first.
- **Rollback:** Revert commit on `main` and push. Do **not** force-push `main`.
- **Feature branches:** Work in progress lives in `feat/*` branches, merged to
  `main` when ready. Currently active: `feat/car-selection`.

## Safety (DO NOT SHORTEN)

- **Never commit secrets, `.env`, or API keys.**
- **Never change a production database without a backup.** (No DB exists.)
- **Never deploy without a successful local build/validation.** "Build" = the
  `node --check` syntax pass plus a manual in-browser smoke test.
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
- **SW cache key must be bumped manually** (`desktop-drift-vN` in `sw.js`) when
  any static asset changes. Otherwise browsers keep serving stale files.
- **`MINI` is computed inside `initRender(T)`, not at module load time.** Do not
  call any render function before `initRender(T)` runs.
- **Portrait SVGs only.** All files in `items/` are portrait (taller than wide).
  The render auto-rotates them. If you add a landscape SVG, it will appear
  sideways — update `drawProp` or save the asset in portrait orientation.
- **Sandbox mode has no items.** `track-oval.js` does not import `items.js` and
  its `props` array is empty. `startGame(T)` (no `initItems` option) is correct.
- **Car config persists via `localStorage`** (`key: 'carConfig'`, value:
  `{ carIndex, bodyColor }`). Written by `select.html` on "Race!", read by
  `game-engine.js` on init. Defaults to car 0 / default body colour if absent.
- **Lap counter shows the in-progress lap** (`lapNum + 1`), not completed laps.
- **Cones vs. objects differ in scoring.** Hitting a cone = flat −200 (combo
  survives). Hitting a kitchen object or wall / going off-track = combo burned.

## Commit / PR conventions

- **Remote:** `git@github.com:letulip/DesktopDrift.git`. Default branch `main`.
- **Format:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`,
  `chore:`). Scope optional (e.g. `fix(items):`, `feat(track):`).
- **Required before commit:** `node --check` pass (see Commands) + manual
  browser smoke test served over HTTP.
- **Pushing to `main` = live production deploy.** Treat accordingly.
