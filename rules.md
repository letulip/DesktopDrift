## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## Core Programming Principles.

- **KISS (Keep It Simple, Stupid)** Solutions should always be as simple as possible rather than overly complex. Simple code is easier to understand, maintain, and debug, significantly lowering the barrier for other developers to read and update your work.
- **DRY (Don't Repeat Yourself)** Every piece of logic, data, or function should have a single, unambiguous representation in a system. Duplicating code lengthens your program and makes updates tedious, as a single change would require modifying multiple areas.
- **YAGNI (You Aren't Gonna Need It)** Features or functionality should only be added when they are strictly required, rather than when you anticipate needing them in the future. This prevents code bloat and ensures you focus purely on current, validated requirements.
- **Separation of Concerns (SoC)** A computer program should be divided into distinct sections, where each section addresses a separate, specific concern or business rule. This prevents the creation of tangled, interdependent codebases.

## JS rules

- all functions should be arrow functions
- use clean functions and immutable data if possible

## Testing

**Every new piece of pure logic ships with a test. Every phase ends green.**

- Runner is Node's built-in `node --test` + `node:assert/strict` — zero deps, no
  build, in keeping with the pure-static stack. Run with `npm test`.
- **Test the testable.** Pure logic (store, data tables, track geometry, the future
  collision validator) gets unit tests. Canvas / DOM / the game loop (`render.js`,
  `game-engine.js`, `pause.js`, `confirm-exit.js`) can't run in Node — those stay on
  the manual browser smoke test documented in AGENTS.md.
- **Grow tests with the code.** New logic → new/updated tests in the same change. A bug
  fix → a test that would have caught it. Don't let coverage rot behind features.
- Node runs each `tests/*.test.js` file in its own process, so module-level caches
  (e.g. store.js's `_s`) don't leak between scenarios — split conflicting setups into
  separate files rather than fighting the cache.

## Design

For any UI / visual work, follow **DESIGN.md** (distinctive, production-grade,
non-generic aesthetics). Adapt its principles to this project's hard constraints —
they win when they conflict:

- **No new dependencies, offline-first.** Web fonts/icons must be self-hosted
  (file in repo + added to `sw.js` ASSETS), never fetched from a CDN. No build step.
- **60 fps canvas.** Decorative effects must not touch the game render loop's budget.
- **One cohesive direction.** The project's aesthetic is a *warm, dark, kitchen-table*
  theme with a single amber accent (`#ffb14d`). Extend it; don't fork it.
- **Tokens over literals.** Shared colours/fonts live as CSS variables in `:root`
  (see AGENTS.md → Design language), not hardcoded per element.

## Before each git push

- Run `npm test` — it must be green.
- Update roadmap with current state.
- Update agents with actual structure and nuances.
- Update sw.js if needed.

## General

- use only english throught the entire project.