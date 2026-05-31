# AGENTS.md Audit

Generated for the **Desktop Drift** project per the agents.md standard
(https://agents.md/).

## Files created

| File | Scope | Status |
|------|-------|--------|
| `DesktopDrift/AGENTS.md` | Root / project-level (the whole game) | ✅ created |
| `DesktopDrift/AGENTS_MD_AUDIT.md` | This audit report | ✅ created |

No **nested** AGENTS.md files were created: the project is a single static
module with no subprojects (no folder has its own `package.json` / `Cargo.toml`
/ `requirements.txt`). `index.html` and `sandbox.html` are two pages of one app,
not independent modules — so per the standard, one root AGENTS.md is correct.

## Deprecated / superseded files

None. There were no pre-existing AGENTS.md, `.cursorrules`,
`.github/copilot-instructions.md`, `.aider*`, or `.windsurfrules` files to
replace or deprecate.

## Validation results (Step 5)

| Check | Result |
|-------|--------|
| `python3` present (dev server) | ✅ Python 3.9.6 |
| `node` present (syntax check) | ✅ v24.6.0 |
| De-facto syntax check command runs | ✅ `node --check` → OK |
| Entry points exist | ✅ `index.html`, `sandbox.html` |
| Env vars documented vs `.env.example` | ✅ N/A — no env vars, no `.env` (correctly documented) |
| Deploy instructions vs CI workflows | ✅ N/A — no CI/workflows exist (correctly documented as TBD/none) |
| Test commands | ✅ N/A — 0 tests, documented honestly |
| No project source code modified | ✅ only `*.md` files written |

## Symlink recommendations

Several AI tools look for tool-specific filenames rather than `AGENTS.md`. If you
want broader auto-discovery without duplicating content, add symlinks (run from
inside `DesktopDrift/`):

```bash
# Claude Code
ln -s AGENTS.md CLAUDE.md
# Cursor (legacy single-file)
ln -s AGENTS.md .cursorrules
# GitHub Copilot
mkdir -p .github && ln -s ../AGENTS.md .github/copilot-instructions.md
# Gemini CLI
ln -s AGENTS.md GEMINI.md
```

Notes:
- These are **optional** and were not created automatically (the task brief
  scoped output to AGENTS.md files).
- On Windows, symlinks may require admin/dev-mode; copy the file instead if so.
- Tools increasingly support `AGENTS.md` natively (Codex, Aider, Windsurf), so
  those need no symlink.

## Recommendations / follow-ups

1. **Add a real `README.md`** for human contributors — AGENTS.md targets agents,
   not people.
2. **Initialize git + a remote** so the Commit/PR and Deployment sections can move
   from TBD to concrete (branch→env mapping, rollback, review policy).
3. **Decide on hosting** (GitHub Pages is a natural fit for a static folder) and
   then fill in the Deployment section.
4. **Frame-rate-independent physics** is the one substantive code gotcha flagged
   in AGENTS.md; consider addressing it so handling is consistent across 60/120 Hz
   displays.
5. Re-run the Step 5 validation block whenever Setup/Commands change so the docs
   stay truthful.
