# Plan — Achievements system

ROADMAP Phase 2 item. This plan covers the full build: event seam → store schema →
achievement definitions → engine wiring → display page → docs + PR.

Each step is tagged **[sonnet-high]** (mechanical, well-specified) or **[opus]**
(design / wording / feel / UX). Workflow per `desktopdrift-pr` (branch →
`npm test` + `node --check js/*.js` → SW-clear browser smoke → bump SW cache → PR).
English only. One commit per step; tick the box in the same commit.

---

## Context — what already exists

The store schema already plans for achievements (`defaults()` note in ROADMAP says
`achievements: { [id]: { unlocked, progress } }`) but the slice is not yet in
`defaults()`. All data needed to check achievements is already tracked:

| Signal                     | Source                                          |
|----------------------------|-------------------------------------------------|
| Race finish (pps, stars, trackId, isNewRecord) | `game-engine.js` finish branch |
| Cap collected              | `store.capCollect` (in-engine)                  |
| Tire collected             | `store.tireCollect` (in-engine)                 |
| Per-track caps / tires     | `store.capsFor(trackId)`, `store.tiresFor(trackId)` |
| All-track tire totals      | `store.stats().tires` keyed by trackId          |
| Wallet balance             | `store.wallet()`                                |
| Owned cosmetics            | `store.owned()`                                 |
| Tracks cleared (first-run) | `store.stats().cleared`                         |
| Best PPS per track         | `store.records()[trackId].timeattack.bestPPS`   |

There is **no event bus yet** — the first step adds one (10 lines, not a framework).
It is the seam achievements subscribe to without coupling modules directly.

---

## Decisions (locked for v1 — flag in review to change)

1. **Event bus, not direct coupling.** `js/events.js` — tiny `emit(name, data)` /
   `on(name, fn)` / `off(name, fn)`. Engine emits; achievements (and anything else)
   subscribe. No global singletons beyond the bus itself.

2. **Check-on-event, not polling.** The achievement engine subscribes to bus events.
   On each event it checks all not-yet-unlocked achievements against a pure predicate
   `check(ctx)` where `ctx = { event, store }`. No ticker, no game-loop hook.

3. **Pure predicates.** Every `check` function is a pure read of the store snapshot
   + the current event payload. No side-effects, easily unit-tested in Node.js.

4. **Store slice: `{ [id]: { unlocked: bool, progress: number } }`.** Fits the
   ROADMAP schema. `progress` is used for counter achievements (e.g. "finish 10 races");
   for one-shot achievements it stays 0. Deep-merge fills it for old saves — no migration.

5. **v1 display: a dedicated `achievements.html` page.** Linked from `index.html`
   menu. Lists all achievements grouped by category with lock / unlock state + progress
   bar for counter achievements. No in-game overlay for v1 — a toast on unlock is enough.

6. **Toast on unlock.** A brief (~2.5 s) overlay in-game confirms the unlock.
   Reuses the existing `flash()` helper (already in `game-engine.js`) — no new UI
   component needed for v1.

7. **Icons: single emoji per achievement.** Zero art budget; emoji renders everywhere.
   Can be swapped for SVGs later as a data-only change.

8. **v1 achievement set: 18 achievements across 5 categories.** See A3 below.
   Enough for a meaningful system; small enough to stay balanced without playtesting.

---

## Event catalog (events `js/events.js` must support)

| Event name      | Payload fields                                              | Emitted from        |
|-----------------|-------------------------------------------------------------|---------------------|
| `race:finish`   | `{ trackId, mode, pps, stars, isNewRecord, totalTime, tiresPickedUp }` | `game-engine.js` |
| `cap:collect`   | `{ trackId, capId }`                                        | `game-engine.js`    |
| `tire:collect`  | `{ trackId, tireId }`                                       | `game-engine.js`    |
| `shop:purchase` | `{ itemId, kind, price }`                                   | `store.purchase()`  |

The bus is synchronous and fire-and-forget. Listeners are called in registration order.

---

## v1 achievement set

### Completion
| id                 | Name             | Icon | Trigger / check                                        |
|--------------------|------------------|------|--------------------------------------------------------|
| `first-race`       | First Lap        | 🏁   | Finish any race (`race:finish`)                        |
| `all-tracks`       | Grand Tour       | 🗺️   | `stats.cleared` covers at least one instance per forward track id |
| `all-reversed`     | Wrong Way Driver | 🔄   | Same but for reversed track ids                        |
| `full-sweep`       | Table Clear      | 🧹   | All 6 instances (3 forward + 3 reversed) in `cleared`  |

### Skill
| id                 | Name             | Icon | Trigger / check                                        |
|--------------------|------------------|------|--------------------------------------------------------|
| `one-star`         | One Star         | ⭐   | Any run with `stars ≥ 1` (pps ≥ 100)                  |
| `three-stars`      | Three Stars      | 🌟   | Any run with `stars ≥ 3` (pps ≥ 300)                  |
| `five-stars`       | Five Stars       | 💫   | Any run with `stars ≥ 5` (pps ≥ 500)                  |
| `new-record`       | Personal Best    | 📈   | `isNewRecord === true` on any run                      |

### Collector
| id                 | Name             | Icon | Trigger / check                                        |
|--------------------|------------------|------|--------------------------------------------------------|
| `first-cap`        | Cork Pop         | 🫙   | `cap:collect` event (any track)                        |
| `cap-sweep`        | Bottle Collector | 🥂   | `capsFor` returns ≥ 1 entry on every track in TRACKS   |
| `first-tire`       | Pocket Change    | 🪙   | `tire:collect` event (any track)                       |
| `tire-track`       | Track Hoarder    | 🛞   | All tires collected on any single track                |
| `tire-sweep`       | Road Tax         | 🚧   | All tires collected on every track in TRACKS           |

### Economy
| id                 | Name             | Icon | Trigger / check                                        |
|--------------------|------------------|------|--------------------------------------------------------|
| `wallet-100`       | Spare Change     | 💰   | `wallet() ≥ 100` at any point after a race finish      |
| `wallet-500`       | Rolling in Tires | 🤑   | `wallet() ≥ 500`                                       |
| `first-purchase`   | First Buy        | 🛍️   | `shop:purchase` event (any item)                       |
| `collector`        | Collector        | 🎨   | `owned().length ≥ 3`                                   |

### Dedication
| id                 | Name             | Icon | Trigger / check                                        |
|--------------------|------------------|------|--------------------------------------------------------|
| `ten-races`        | Ten Laps         | 🔟   | `progress ≥ 10` (counter; increments each `race:finish`) |
| `fifty-races`      | Road Warrior     | 🏆   | `progress ≥ 50`                                        |

---

## Steps

- [ ] **A1. Event bus.** **[sonnet-high]**
      New `js/events.js`: exports `emit(name, data)`, `on(name, fn)`, `off(name, fn)`.
      Backed by a `Map<name, Set<fn>>`. Synchronous, fire-and-forget, no error swallowing
      (re-throw after logging). Wire `emit('race:finish', {...})` in `game-engine.js` at the
      finish branch; wire `emit('cap:collect', {...})` and `emit('tire:collect', {...})` in the
      collectible update. Add `js/events.js` to SW `ASSETS`.
      Unit-test: on/emit round-trip, off removes listener, unknown event is a no-op, error
      in listener propagates.

- [ ] **A2. Store schema.** **[sonnet-high]**
      Add `achievements: {}` to `defaults()` (deep-merge fills it for old saves).
      Add helpers: `achGet(id)` → `{ unlocked, progress }` (lazy-init the entry),
      `achUnlock(id)` (idempotent, persists), `achProgress(id, n)` (sets progress, persists).
      Unit-test: default shape, idempotent unlock, progress accumulates, old-save merge.

- [ ] **A3. Achievement definitions.** **[opus]**
      New `js/achievements.js`: `export const ACHIEVEMENTS = [...]` of
      `{ id, name, desc, icon, category, check }` per the table above.
      Each `check(ctx)` is a pure function: `ctx = { event, store }` (store = imported
      store module, not a snapshot — call `store.wallet()` etc. inside). `check` returns
      `true` to unlock, `{ progress: n }` for counter updates (used by ten-races / fifty-races
      — the engine calls `achProgress` and checks against the target), or `false/null`.
      Also export `byCategory(cat)` helper and `ACHIEVEMENT_MAP` (keyed by id for O(1) lookup).
      Unit-test: id uniqueness, all checks callable without throwing (pass a mock ctx),
      byCategory returns the right subset, ACHIEVEMENT_MAP covers all ids.

- [ ] **A4. Achievement engine.** **[sonnet-high]**
      New `js/ach-engine.js`: `initAchievements()` subscribes to all bus events.
      On each event: iterate `ACHIEVEMENTS`; for each not-yet-unlocked, call `check(ctx)`.
      If `true` → `achUnlock(id)` + `showAchievementToast(ach)`.
      If `{ progress: n }` → `achProgress(id, n)`; if progress ≥ target → unlock + toast.
      `showAchievementToast` uses the existing `flash()` mechanism (single-line: icon + name).
      `initAchievements()` called once from `game.html` script block (alongside `startEngine`).
      Unit-test: mock bus + store, verify unlock fires on the right events, verify idempotency.

- [ ] **A5. Achievements page.** **[opus]**
      New `achievements.html` page linked from `index.html` menu (between Tracks and Settings).
      Lists all 18 achievements grouped by category. Each card: icon + name + desc + lock/unlock
      status. Counter achievements show a `N / target` progress bar. Locked achievements show
      the desc (no spoilers hidden for v1 — these are all milestone-visible).
      CSS: reuse tokens from `base.css` / `content.css`; no new design vocabulary.
      Add `achievements.html` + any new CSS to SW `ASSETS`.

- [ ] **A6. Docs + SW + PR.** **[sonnet-high]**
      `sw.js`: bump cache; add `js/events.js`, `js/achievements.js`, `js/ach-engine.js`,
      `achievements.html` to `ASSETS` (some may already be there from prior steps).
      `AGENTS.md`: document the event bus (emit/on/off), achievement store slice
      (achGet/achUnlock/achProgress), and ach-engine init point.
      Tick A1–A6; PR.

**Phase done when:** all 18 achievements check correctly, unlocks persist, the page shows
the full list with live state, the in-game toast fires on unlock, `npm test` green,
browser smoke clean on ≥ 1 track.

---

## Guardrails

- **No stat gates.** Achievements are observational — they never block content.
- **No server round-trips.** Everything is local store; achievements are client-side only.
- **Pure check functions.** All `check()` must pass `node --check` and be testable
  without a DOM or canvas.
- **Records-safe.** No achievement increments a record or changes PPS — cosmetic only.
- **Tag rationale:** event bus plumbing / store helpers / engine wiring → sonnet-high;
  achievement wording / UX / category balance / page design → opus.
