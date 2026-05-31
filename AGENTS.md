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
  - `sandbox.html` — the entire game engine, inlined in one `<script>` block
    (~820 lines). This is where ~all logic lives.
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
| syntax check (de-facto) | extract the inline `<script>` and run `node --check` on it | Used in practice to validate `sandbox.html` edits. |

De-facto syntax check used in this repo:

```bash
node -e 'const fs=require("fs");const h=fs.readFileSync("sandbox.html","utf8");const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];fs.writeFileSync("/tmp/dd.js",m[0][1]);' \
  && node --check /tmp/dd.js && echo OK
```

## Architecture

Everything below refers to `sandbox.html` unless noted. There are no modules;
all state lives in top-level `let`/`const` globals in one inline `<script>`.

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
  no JSX. One inline `<script>` per page.
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
- **Current practice:** Validation is (1) the `node --check` syntax pass on the
  extracted inline script (see Commands), and (2) manual verification in a
  browser / preview — drive the car, watch the HUD, exercise scoring and
  collisions. There is no headless test harness committed.

## Deployment

- **Branch → environment mapping:** TBD — none configured.
- **CI/CD platform:** None. No GitHub Actions, no `.github/`, no pipeline files.
- **Manual steps:** This is a static site. Any static host (GitHub Pages,
  Netlify, Vercel static, S3, or `python3 -m http.server`) can serve the folder;
  no build is required. Entry point: `index.html`.
- **Rollback procedure:** TBD — establish once a host and git history exist.
  Until then, rollback = restore previous file copies.
- **Monitoring URL:** TBD — none.

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

- **Frame-rate-dependent handling (known issue).** `grip` and `rollFriction` are
  applied *per frame* (`vS *= grip`) without `dt` correction. On 120 Hz displays
  (e.g. ProMotion phones) these multiplications happen twice as often per second,
  so the car loses lateral grip faster and feels more oversteer-y than on 60 Hz.
  Tuning values are implicitly calibrated for ~60 fps. Making physics
  frame-rate-independent (raising factors to a `dt`-based power) is a deliberate,
  not-yet-done change that would shift the current feel.
- **Two `launch.json` configs with different cwd assumptions.**
  `../.claude/launch.json` (workspace root) passes `--directory DesktopDrift` and
  is meant to run from the workspace root; `DesktopDrift/.claude/launch.json`
  omits it and is meant to run from inside `DesktopDrift/`. Both use port 8777
  and name `desktopdrift`. Launching both at once will conflict on the port.
- **The whole game is one inline `<script>` in `sandbox.html` (~820 lines).**
  No modules means everything is a global and ordering matters. To syntax-check,
  extract the script and run `node --check` (see Commands) — you cannot
  `node --check` the `.html` directly.
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

- **Existing history:** None established (the repo had no git history before
  this documentation work).
- **Format:** Use **Conventional Commits** (`feat:`, `fix:`, `docs:`,
  `refactor:`, `chore:`). Example used for this task:
  `docs: add AGENTS.md for AI coding agents`.
- **Required checks:** Before committing code changes, run the `node --check`
  syntax pass and a manual browser smoke test. No automated CI gate exists.
- **Review policy:** TBD — no remote, branch protection, or reviewers configured.
- **This documentation task:** branch `docs/agents-md`; one commit per generated
  `.md` file. No push / PR is possible until a remote is configured.
