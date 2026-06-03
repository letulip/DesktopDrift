# Desktop Drift — Claude Code Memory

This project is a pure client-side HTML5 Canvas arcade drift-racing game.
Full architecture and conventions are documented in **AGENTS.md**.
Development rules and coding principles are in **rules.md**.

## Quick-start

```bash
python3 -m http.server 8777   # serve from inside DesktopDrift/
# open http://localhost:8777/index.html
```

## Test + syntax check (run before every commit)

```bash
npm test   # node --test tests/*.test.js — must be green
node --check js/store.js js/config.js js/items.js js/track.js js/track-oval.js js/state.js js/render.js js/game-engine.js js/pause.js js/confirm-exit.js && echo OK
```

## Branch policy

- `main` → production (GitHub Pages). Pushing to `main` = live deploy.
- New feature / fix → new branch (`feat/…`, `fix/…`), then PR.
- **New branch for every new request with new logic** (don't keep accumulating unrelated changes on the same branch).

## Development rules (summary — full text in rules.md)

### Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity First
- Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- If you write 200 lines and it could be 50, rewrite it.

### Core Principles
- **KISS** — as simple as possible, never simpler.
- **DRY** — single source of truth for every piece of logic.
- **YAGNI** — add a feature only when it is actually needed.
- **SoC** — each module/function addresses one concern.

### Before every git push
Update AGENTS.md to reflect actual structure, new files, and any gotchas discovered.
