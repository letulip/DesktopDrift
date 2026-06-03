# Desktop Drift — Roadmap

Living planning document. Move through it step-by-step; check items off as they ship.
For architecture and conventions see **AGENTS.md**; for coding rules see **rules.md**.

## North Star

A **polished, single-player, client-only** drift game. No backend until competitive
features genuinely demand one. Squeeze maximum value out of the existing pure-static
stack (GitHub Pages, no build step, no dependencies, offline via the service worker).

Guiding constraints:
- **Client-first.** Everything that can live in `localStorage` does.
- **Sync-ready schema.** The local save is shaped so a future backend can adopt it
  without a rewrite.
- **KISS / YAGNI / DRY / SoC** (see `rules.md`). No speculative abstractions.
- **Self-contained components** (the `pause.js` / `confirm-exit.js` pattern): each owns
  its own DOM, state, and events; nothing else reaches in.

## Architectural spine

Decisions that hold the whole thing together — settle these as they come up, don't drift.

1. **One persistence module — `js/store.js`.** A single, versioned save/load layer.
   Everything (settings, garage, records, achievements, unlocks) goes through it; no
   feature touches `localStorage` directly. This doubles as the sync-ready schema for an
   eventual backend.
   ```
   {
     version,
     settings:     { units: 'kmh' | 'mph', ... },
     garage:       { carIndex, bodyColor, unlocks: [] },
     records:      { [trackId]: { [mode]: { bestLap, bestScore } } },
     achievements: { [id]: { unlocked, progress } }
   }
   ```
2. **Data-driven content.** Tracks, achievements, colour palettes and (later) tuning specs
   are plain data tables. Logic stays generic; content is just data. Cars and items already
   follow this pattern — extend it.
3. **Track registry — `tracks/registry.js`.** One list of every track with metadata
   (id, name, mode, thumbnail, difficulty). Drives the selection screen, previews, and the
   `records` keys.
4. **Event seam in `game-engine.js`** — introduce *only* when Phase 2 starts. A tiny
   `emit(event, data)` + listener list (~10 lines, not a framework). Achievements, bonuses,
   ghost car and (later) sound subscribe as separate modules instead of bloating the engine.
   **Not before it is actually needed.**
5. **Tests guard every phase — `tests/` + `npm test`.** Pure logic (store, data tables,
   track geometry, the collision validator) ships with unit tests written in Node's
   built-in runner (`node --test`, zero deps). Canvas/DOM/game-loop code stays on the
   manual browser smoke test. Tests grow with the code so each new phase proves it broke
   nothing. See **AGENTS.md → Testing** and **rules.md → Testing**.

## Definition of done (every phase)

A phase is only "done" when:
- New pure logic has unit tests, and `npm test` is **green**.
- `node --check` passes on all JS.
- A manual browser smoke test of the touched flows passes.
- AGENTS.md / CLAUDE.md reflect any new files, modules, or gotchas.

---

## Phase 0 — Foundation  ▸ *current focus*

The boring layer everything else stands on. No flashy output, highest leverage.

- [x] `js/store.js` — versioned save/load using the schema above. *(unit-tested: defaults,
      save/load, version-mismatch reset — `tests/store*.test.js`)*
- [x] Migrate the existing `carConfig` into `store` (the `garage` slice). Written by
      `select.html`, read by `game-engine.js`.
- [x] **Test foundation** — `tests/` + `npm test` (`node --test`), store covered.
- [ ] `settings` slice + a minimal settings panel (entry point from the menu).
      *(Schema slice exists; the panel UI is deferred to Phase 1 alongside speed-units.)*

## Phase 1 — Personal progress & garage polish

Turns the tech demo into a game and fixes what bugs us now.

- [ ] **Records** — best lap + best score per (track, mode), stored via `store`.
- [ ] **Results screen** after a run ("NEW RECORD!", lap/score summary).
- [ ] **Speed units** km/h ⟷ mph — a setting, converted only at display time (default km/h).
- [x] **Custom colour palette (replaces the native `<input type="color">`).**
      20-colour body swatch grid (`PALETTE` in `palette.js`) + 10-colour neon
      underglow palette (`NEON_PALETTE`). Neon renders as 3 segments between wheel
      arches via `ctx.shadowBlur`; suppresses the black drop-shadow. Stored in
      `garage.bodyColor` / `garage.neonColor`. Phase 2 liveries extend `palette.js`
      with a `LIVERIES` array.
- [ ] **Track previews** on the selection screen — generalize `drawMini` into
      `renderTrackThumb(canvas, track)`. Cheap (the rendering already exists); start with the
      two existing tracks, gets richer once the track registry lands.

## Phase 2 — Depth & replayability

First add the **event seam** (spine #4). Then:

- [ ] **Achievements** — data table of definitions + `store` flags/progress; subscribe to
      engine events.
- [ ] **In-run bonuses** — drift zones, score multipliers, bonus-time pickups.
- [ ] **Cosmetic mods** — paint finishes (matte / metallic), maybe liveries. Builds on the
      palette UI from Phase 1.
- [ ] **Performance tuning** — grip / thrust / steer, etc. *Depends on the progression
      system:* tuning options **unlock progressively after completing tracks**. Tune with
      care — it shifts game balance and would affect leaderboard fairness in the online era.
- [ ] **Ghost car** — race your own best lap (records + a recorded position/input trace).
      Pure client-side, strong Time-Attack motivation.

## Phase 3 — Content

- [ ] **Track registry** (spine #3) + **collision validator**: a dev-time check that flags
      any prop whose collider overlaps the drivable corridor
      (`distance-to-centerline < TRACK_HALF + margin`). Turns "eyeball it" into an automated
      guard and eliminates the prop-blocks-the-racing-line bug class.
- [ ] **New track: "around the plates"** — author the SVG, place props, run the validator.
- [ ] **Zen drift mode** + transitions between locations (larger, content-heavy creative
      feature).
- [ ] Time-Attack: selectable lap count / difficulty.

## Phase 4 — Online era (deferred)

Only once competition is actually wanted. Not a near-term goal.

- [ ] Auth, global leaderboards, cloud save.
- [ ] A BaaS (Supabase / Firebase) is closest to "no server of our own" but adds a
      dependency and breaks "pure static" — a conscious decision, not to be made early.
- [ ] The Phase-0 sync-ready schema makes this additive rather than a rewrite.

---

## Cross-cutting pool

Small, mostly independent wins — slot into a phase as they fit.

- **Share result** — screenshot + Web Share API. Social without a backend. *(Phase 1–2)*
- **Daily challenge** — date-seeded, identical for everyone that day. Replayability, no
  server. *(Phase 2–3)*
- **Haptics** — vibrate on cone / crash (Vibration API, mobile). *(Phase 1, cheap)*
- **Onboarding / tutorial** — currently just the `#hint` line. *(Phase 1–2)*

## Parked / needs a decision

- **Sound & music.** High ROI for an arcade racer, but **licensing is unresolved** — decide
  on royalty-free or original assets before committing. Revisit later. When it lands it
  subscribes to the Phase-2 event seam, so no engine changes are needed.
