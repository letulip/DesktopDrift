# Desktop Drift

Top-down arcade drift-racing game that takes place on a kitchen table. Pure
client-side HTML5 Canvas 2D — no build step, no dependencies, no backend.

## Overview

- **Stack:** Single-page static site. Plain HTML + CSS + vanilla JavaScript
  (ES2020, no modules, no transpiler). Rendering via Canvas 2D
  (`requestAnimationFrame` loop). No framework, no bundler, no npm.
- **Pages (2):**
  - `index.html` — menu landing screen. Static markup only, no game logic.
    Has a "Sandbox" tile linking to the game and a disabled "Time Attack"
    placeholder.
  - `sandbox.html` — the game page: markup only. All logic lives in the
    external `js/game.js` (~730 lines), loaded via
    `<script src="js/game.js"></script>` at the end of `<body>`.
- **File layout:** HTML, CSS and JS are split into separate files (no build
  step — plain `<link>`/`<script src>`):
  - `css/base.css` — shared `html`/`body` reset (both pages).
  - `css/menu.css` — menu styles (`index.html`).
  - `css/sandbox.css` — HUD styles + mobile media query (`sandbox.html`).
  - `js/game.js` — the whole game engine.
- **Relationship:** `index.html` → `sandbox.html` via `<a href="sandbox.html">`.
  In-game "☰ Menu" button navigates back with `location.href = 'index.html'`.
- **Assets:** `bismark.svg`, `panda.svg` are **reference art only** — they are
  NOT loaded at runtime. Cars are drawn from SVG `path` strings hard-coded in
  the `CARS` array inside `sandbox.html`. (The old `*.jpg` references and the
  `ae86.*`/`w124.*` names were removed; filenames now match the in-code car
  names.)

## Setup

- **Install dependencies:** None. There are no dependencies and no manifest
  (`package.json` does not exist).
- **Env vars:** None. The project reads no environment variables and has no
  `.env` file.
- **Local run:** Serve the folder over HTTP (Canvas + module-free JS work from
  `file://` too, but use a server for parity). Default port is **8777**.
  - From the workspace root (`Projects/Claude/`):
    `python3 -m http.server 8777 --directory DesktopDrift`
  - From inside `DesktopDrift/`:
    `python3 -m http.server 8777`
  - Then open `http://localhost:8777/index.html`.
  - Both invocations are pre-configured in `.claude/launch.json` (see Gotchas —
    the two configs assume different working directories).

## Commands

| Task      | Command                                                       | Notes |
|-----------|--------------------------------------------------------------|-------|
| install   | — (none)                                                      | No dependencies. |
| dev       | `python3 -m http.server 8777` (run inside `DesktopDrift/`)    | Static file server. |
| build     | — (none)                                                      | No build step; files are shipped as-is. |
| test      | — (none)                                                      | No test suite. See Testing. |
| lint      | — (none)                                                      | No linter configured. |
| typecheck | — (none)                                                      | Plain JS, no TypeScript. |
| syntax check (de-facto) | `node --check js/game.js` | Used in practice to validate game-logic edits. |

De-facto syntax check used in this repo (now that the JS is a standalone
file, no extraction is needed):

```bash
node --check js/game.js && echo OK
```

## Architecture

Everything below refers to `js/game.js` (the game engine for `sandbox.html`)
unless noted. There are no modules; the file is loaded as a classic
`<script>` (not `type="module"`), so all state lives in top-level
`let`/`const` globals and works from `file://` too.

- **Entry / loop:** `requestAnimationFrame(frame)` drives `frame(now)`. Delta
  time `dt` is computed per frame and clamped to `0.05` s. `resize()` keeps the
  canvas DPR-aware (DPR clamped to ≤2).
- **Car config pattern (config merge):** Base tuning lives in `CFG`. Each car in
  the `CARS` array may override fields via its own `drive: {...}`; the two are
  merged (`Object.assign({}, CFG, car.drive)`) and physics reads the merged
  per-car object. Cars: `Bismark` (`len: 82`) and `Panda` (`len: 75`).
- **Track generation:** Parametric closed loop. `centerAt(a)` returns a polar
  radius with sine harmonics; `SAMPLES = 300` points form the centerline, plus
  `outer`/`inner` edges offset by `TRACK_HALF = 100`. Table is
  `TABLE = { w:3400, h:2900, shape:'rect' }`.
- **Props & cones:** Cones (radius `CONE_R = 9`) line the track edges. Larger
  "kitchen objects" (`props`, capsule-shaped via `hl`/`r`) sit in apex pockets
  and corners. Apexes are found via local minima of distance-to-origin.
- **Checkpoints / laps:** `K = 8` checkpoints, `CP_R = TRACK_HALF + 70`.
  `nextCp` advances around the loop; a lap completes when the start checkpoint is
  reached again. `lapNum`, `lapScores` (last 3 kept) track scoring per lap.
- **Input:** Keyboard (`keydown`/`keyup`; arrows steer, `C` swaps car) and
  Pointer Events for touch (hold the LEFT/RIGHT half of the screen to steer).
- **Physics:** Velocity is decomposed into forward `vF` and lateral `vS`.
  Key tunables: `grip` (lateral retention/slide), `selfAlign` (snaps heading to
  motion — lower = holds slide longer), `thrust`, `maxSpeed`, `steer`,
  `steerSmooth`, `driftSteerBoost`, `rollFriction`, `driftDrag`.
- **Scoring (combo bank/burn model):** Points accumulate into `comboPoints`
  during a drift (`slip × speed × dt × 0.0015 × mult`). The combo is **banked**
  into `score` only on a clean drift finish (`bankCombo`), and **burned** with no
  payout on a wall/object crash or off-track flyout (`burnCombo`). Cones cost a
  flat `-200` and do NOT burn the combo. The multiplier is
  `mult = min(8, 1 + multBuild)`, where `multBuild` grows from a slow
  quality-scaled base plus discrete bonuses for sharp transitions and near-miss
  passes (`nearMissCheck`).
- **Rendering:** `draw()` renders world (camera follows car, offset ~10% below
  screen center), `drawMini()` renders the minimap via the `MINI` transform.
- **HUD:** A DOM overlay (`#hud`), not canvas-drawn. Elements: `#timePanel`
  (lap/last/best), `#mini` (minimap canvas), score panel, `#lapCounter`,
  `#combo`, `#flash`, `#count`, `#hint`. A `@media (max-width: 640px)` block
  restacks controls for mobile.
- **Schema / DB:** None. No persistence of any kind (no `localStorage`).

## Code style

- **Language:** Vanilla ES2020. No TypeScript, no modules (`import`/`export`),
  no JSX. Game logic is one classic `<script src>` file (`js/game.js`); CSS is
  in `css/*.css`. Keep it that way — do not switch to ES modules (it would break
  `file://` use and the no-build setup).
- **Linter / formatter:** None configured. Match the existing style by hand.
- **Indentation:** 2 spaces. Semicolons used. `const`/`let` (no `var`).
- **Naming:** `camelCase` for variables/functions; `UPPER_SNAKE` /
  `PascalCase`-ish caps for tuning constants and data tables (`CFG`, `CARS`,
  `TABLE`, `SAMPLES`, `CONE_R`, `K`, `TRACK_HALF`, `CP_R`, `MINI`).
- **Comments:** Existing in-code comments are written in **Russian**. Keep new
  comments consistent with surrounding code; do not mass-translate.
- **Imports / deps:** Do not add npm packages, build tooling, or a bundler
  without explicit instruction — the project's whole value is being
  dependency-free and runnable from a static folder.
- **Error handling:** Game-loop code favors clamping/guarding over throwing
  (e.g., `dt` clamp, `Math.max(0, ...)` on score). There is no error-reporting
  framework.

## Testing

- **Framework:** None. There are currently **0 automated tests** — be honest
  about this; do not claim coverage.
- **Run all / one test:** N/A.
- **Coverage threshold:** N/A.
- **Current practice:** Validation is (1) the `node --check js/game.js` syntax
  pass (see Commands), and (2) manual verification in a browser / preview —
  drive the car, watch the HUD, exercise scoring and collisions. There is no
  headless test harness committed.

## Deployment

- **Branch → environment mapping:** `main` → GitHub Pages (`github-pages`
  environment). There is no separate staging branch.
- **CI/CD platform:** GitHub Actions — `.github/workflows/static.yml` ("Deploy
  static content to Pages"). It runs on every push to `main` (and can be run
  manually via `workflow_dispatch` from the Actions tab). No build step: it
  uploads the **entire repository** (`path: '.'`) as the Pages artifact and
  deploys it. Reference art, `items/`, and `.md` files are published too.
- **Manual steps:** None for the live site — just push to `main`. Locally, any
  static host (`python3 -m http.server`, Netlify, Vercel static, S3) can serve
  the folder; no build is required. Entry point: `index.html`.
- **Rollback procedure:** Revert the offending commit on `main` and push — the
  workflow redeploys automatically. (Or re-run an earlier successful "Deploy to
  Pages" run from the Actions tab.) Do not force-push `main`.
- **Monitoring URL:** the GitHub Pages site for the `letulip/DesktopDrift` repo
  (the deploy job exposes the live `page_url` in its `github-pages` environment).

## Safety (DO NOT SHORTEN)

- **Never commit secrets, `.env`, or API keys.** (None exist today — keep it
  that way; do not introduce credential files.)
- **Never change a production database without a backup.** (No DB exists; if one
  is ever added, this rule applies in full.)
- **Never deploy without a successful local build/validation.** For this repo,
  "build" = the `node --check` syntax pass plus a manual in-browser smoke test of
  `index.html` → `sandbox.html`.
- **Never force-push to `main`/`master`.**
- **Never delete migrations or rewrite git history.** (No migrations exist; do
  not delete history once a repo is initialized.)
- **Run pre-flight checks before destructive operations** (file deletes, bulk
  rewrites, `git reset --hard`, branch deletion): confirm the target, confirm a
  copy/commit exists, and prefer non-destructive alternatives.
- **Do not modify project source code when the task is documentation only.**
  AGENTS.md work touches `*.md` files exclusively.

## Gotchas

- **Frame-rate-independent handling (how the per-frame factors work).** `grip`,
  `rollFriction` and the knocked-cone damping are per-frame multipliers, so they
  are raised to the power `dt * PHYS_HZ` each frame (`vS *= Math.pow(P.grip,
  fAdj)`). `PHYS_HZ = 120` is the reference rate: the exponent is 1 at 120 Hz
  (the values are the literal per-frame factors there) and 2 at 60 Hz, which
  keeps per-second decay — and the handling feel — identical at any refresh
  rate. When tuning `grip`/`rollFriction`, remember the number you type is the
  **per-frame-at-120 Hz** factor, not per-second.
- **Two `launch.json` configs with different cwd assumptions.**
  `../.claude/launch.json` (workspace root) passes `--directory DesktopDrift` and
  is meant to run from the workspace root; `DesktopDrift/.claude/launch.json`
  omits it and is meant to run from inside `DesktopDrift/`. Both use port 8777
  and name `desktopdrift`. Launching both at once will conflict on the port.
- **The whole game is one file: `js/game.js` (~730 lines).** No modules means
  everything is a global and ordering matters (the file runs top-to-bottom). It
  is a standalone `.js`, so syntax-check it directly: `node --check js/game.js`
  (see Commands).
- **Car names & history.** In-code car names are `Bismark` (formerly
  "Mercedes W124") and `Panda` (formerly "Toyota AE86"). Reference-art files now
  match: `bismark.svg` and `panda.svg`. (Earlier revisions kept the old
  `w124.*`/`ae86.*` filenames; that mismatch no longer exists.)
- **Reference art is not loaded at runtime.** `bismark.svg`/`panda.svg` are
  design references; the cars render from inline SVG `path` strings in `CARS`.
  Editing the image files changes nothing in-game.
- **No persistence.** Chosen car and body color reset on every reload (no
  `localStorage`).
- **Lap counter shows the in-progress lap** (`lapNum + 1`), not completed laps.
- **Cones vs. objects differ in scoring.** Hitting a cone = flat `-200` and the
  combo survives; hitting a kitchen object / wall, or flying off-track = the
  whole pending combo is burned (lost).

## Commit / PR conventions

- **Remote:** `git@github.com:letulip/DesktopDrift.git`. Default branch `main`.
  Changes land via PRs merged into `main` (e.g. #1 docs, #2 Pages workflow).
- **Format:** Use **Conventional Commits** (`feat:`, `fix:`, `docs:`,
  `refactor:`, `chore:`). Examples from history:
  `docs: add AGENTS.md for AI coding agents`,
  `refactor: split HTML, CSS and JS into separate files`.
- **Required checks:** Before committing code changes, run
  `node --check js/game.js` and a manual browser smoke test. CI
  (`static.yml`) only **deploys** on push to `main` — it runs no tests/lint, so
  it will not catch a broken build. Validate locally first.
- **Review policy:** No branch protection or required reviewers configured;
  pushing/merging to `main` is unrestricted. Pushing to `main` triggers a live
  Pages deploy, so treat `main` as production.
