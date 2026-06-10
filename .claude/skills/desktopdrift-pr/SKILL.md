---
name: desktopdrift-pr
description: Use this skill whenever making, verifying, committing or PR-ing a change to this Desktop Drift repo. Triggers — "make a change", "fix this", "push it", "open a PR", "verify the change", "ship this", or any code/asset edit to the game. Encodes the safe loop: branch from main → npm test + node --check → run + browser-verify WITH the service worker cleared (key gotcha) → bump the SW cache version → push → open PR. NEVER push to main (main = live GitHub Pages deploy).
---

# Desktop Drift — make & verify a change (branch → PR)

The repeatable contribution loop for this repo. Read `AGENTS.md` + `ROADMAP.md` +
`rules.md` first — they are the source of truth (note: `DESIGN.md` here is a UI
aesthetics skill, not a game design doc).

> `main` → production (GitHub Pages). **Pushing to `main` = live deploy — never do it.**
> Work on a branch, open a PR.

## Steps

1. **Fresh main + branch.** `git fetch origin` → `git switch main` →
   `git merge --ff-only origin/main` → `git switch -c <type>/<short>`
   (`feat/`, `fix/`, `refactor/`, `perf/`, `chore/`). New branch per logical change.
2. **Edit** — minimal, per `rules.md` (KISS/DRY/YAGNI/SoC). All code is English —
   comments, identifiers, strings (rules.md: "use only english throughout"). No
   Russian. New pure logic ships with a unit test in the same change.
3. **Tests + syntax** (run before every commit):
   - `npm test` — `node --test tests/*.test.js`, must be green.
   - `node --check` on every touched `js/*.js`.
   - Canvas/DOM/game-loop code can't run in Node → it rides the browser smoke test.
4. **If assets/JS changed → bump the SW cache** `desktop-drift-vN` in `sw.js`
   (and add any new js module to the `ASSETS` array). Keep versions monotonic across
   parallel branches; on merge, a CACHE-line conflict → take the newest.
   The SW is **stale-while-revalidate**: a forgotten bump self-heals on the next load,
   but bumping guarantees a first-load-fresh deploy — so still bump. (Forgetting it was
   the v30→v31 prod-staleness bug.)
5. **Browser smoke test (required for runtime changes).** Serve via
   `.claude/launch.json` → config `desktopdrift` (`python3 -m http.server 8777`).
   - 🔴 **GOTCHA: the SW is cache-first and serves stale JS.** Before testing a branch,
     in the page console unregister the SW and clear caches:
     ```js
     (async()=>{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();
     for(const k of await caches.keys())await caches.delete(k);})()
     ```
     then hard-reload (network now serves current code).
   - **Confirm the server actually serves the NEW code:**
     `fetch('/js/<file>.js?x='+Date.now()).then(r=>r.text())` → check your change is present
     (a sentinel string). Don't trust "it works" without this.
   - Run Sandbox (`select.html?mode=sandbox` → `sandbox.html`) and a Time Attack track
     (`tracks.html` → pick → `select.html?track=<id>` → e.g. `green-study.html`): render,
     steering (ArrowLeft/Right), pause (P), exit (Menu), combo/scoring, lap counter, and
     the race-results overlay on the final lap; console must be error-free.
   - `requestAnimationFrame` freezes in a backgrounded tab (a self-rAF counter reads 0) —
     that's browser behaviour, not a bug; the tab must be active to see motion.
5. **Commit** (Conventional Commits: `feat:`/`fix:`/`refactor:`/`perf:`/`chore:`/`docs:`).
   Before pushing, update `AGENTS.md`/`ROADMAP.md` to reflect new files/gotchas
   (the project's "before every push" rule). Add/extend tests for new pure logic.
6. **Push + PR.** `git push -u origin <branch>` → open a PR into `main`
   (`https://github.com/letulip/DesktopDrift/pull/new/<branch>`).
7. Return the working tree to `main`.

## Merge conflicts
Branches cut before a sibling merged will conflict — usually just the `CACHE` line in
`sw.js`/`AGENTS.md`, occasionally the import block of `js/game-engine.js`. Fix on the
branch: `git merge origin/main`, resolve (take the newest cache version; keep both
sides' AGENTS entries), re-check `game-engine.js`, run tests, push.
