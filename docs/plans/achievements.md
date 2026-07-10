# Plan — Achievements system

ROADMAP Phase 2 item. Full build: store schema → pure definitions/evaluator → engine
wiring + new mechanics → results toast → track crowns → achievements page → docs + PR.

Workflow per `desktopdrift-pr` (branch → `npm test` + `node --check js/*.js` → SW-clear
browser smoke → bump SW cache → PR). English only. One commit per phase; tick the box in
the same commit.

> **Supersedes the earlier A1–A6 draft.** That draft used a pub/sub **event bus**
> (`js/events.js` + `ach-engine.js`) and an 18-achievement set. We deliberately drop the
> bus (YAGNI — see "Approach") and expand the set (DDK crowns, ladders, cone/combo/time
> achievements, cola→tires). The event seam stays deferred until in-run bonuses / sound
> actually need it (ROADMAP spine #4).

---

## Approach — pull-model, not an event bus

A single **pure** function is the heart:

```
evaluate(ctx, unlocked) -> [newlyUnlockedId, ...]
```

- `ctx` is a plain data snapshot (see contract below) — no store/DOM imports inside.
- `unlocked` is the set of already-unlocked ids (so we never re-fire).
- Returns the ids that just crossed their threshold. The **caller** persists them,
  credits the tire reward, and shows the toast. `evaluate` has zero side-effects →
  trivially unit-testable in Node.

**Two call sites** (a bus would be overkill for two):
1. **Race finish** (`game-engine.js`) — the main path; covers skill/progression/economy/
   time/DDK. Shows an in-game toast for anything newly unlocked.
2. **After a purchase** (`store.purchase`) — covers `big-spender` / `fashionista` /
   `well-rounded` so they don't wait for the next race. Toast on the shop page.

Everything else (caps, tires, wallet) changes only during a race, so the finish call
catches it.

---

## ctx contract (what the caller assembles, what `evaluate` reads)

`evaluate` is pure over this shape. `run` is `null` for the purchase-triggered call.

```
ctx = {
  run: {                    // the just-finished race (null on purchase eval)
    finished:     true,
    instanceId,             // 'green-study' | 'green-study:rev' | …
    trackId, reversed,
    pps, stars,             // stars = economy.starsForPps(pps), 0..5
    ddk:          pps >= DDK_PPS,   // 600
    nearMisses,             // S.nearMisses
    crashes,                // S.crashes (new)
    conesHit, conesTotal,   // S.conesHit (new) / cones.length
    timeAt8,                // seconds held at MULT_MAX this run (new)
    comboUnbroken,          // never dropped combo since start (new)
    tiresThisRun,           // tire pickups collected this run
    tireTotalOnTrack,       // tires that exist on this instance
    capsThisRun,            // cola caps banked this run
    hour,                   // new Date().getHours() at finish (caller-supplied → keeps evaluate pure)
  } | null,

  wallet,                   // store.wallet()
  owned,                    // store.owned() — array of item ids
  cleared,                  // store.stats().cleared — instance ids finished ≥ once
  records,                  // { [instanceId]: bestPPS }  (flattened from store.records())
  caps,                     // store.stats().caps  — { [trackId]: [idx…] }
  lifetime: { runs, driftSecs },   // store.stats().runs / .driftSecs (new)

  content: {                // injected from the TRACKS registry + shop catalog (pure inputs)
    forwardIds, reversedIds, allInstanceIds,   // for progression / completionist / DDK
    forwardTrackIds,                            // for cola-collector (per track)
    shopCategories,                             // ['body','neon','finish','trail'] for well-rounded
    catalogById,                                // { [itemId]: category } for well-rounded
  },
}
```

Rationale: all *content* (which instances/tracks/categories exist) is injected, so tests
construct any world without importing the registry. DDK/completionist scale automatically
as tracks are added.

---

## Achievement catalog

Each definition: `{ id, name, desc, icon, category, hidden, reward, check }`.
`check(ctx)` returns `true` (unlock), a `{ progress, target }` object (ladder/counter — the
page renders a bar; unlock when `progress ≥ target`), or `false`/`null`. `reward` = one-time
tires credited on unlock (ledger reason `Achievement: <name>`).

Icons are single emoji (zero art budget, swappable later as data-only).

### Progression (visible)
| id | name | icon | reward | check |
|---|---|---|---|---|
| `first-drift` | First Drift | 🏁 | 10 | `run.finished` |
| `road-tripper` | Road Tripper | 🗺️ | 30 | every `content.forwardIds` ∈ `cleared` |
| `mirror-walker` | Through the Looking Glass | 🪞 | 15 | any reversed id ∈ `cleared` |
| `backwards` | Reverse Psychology | ↩️ | 30 | every `content.reversedIds` ∈ `cleared` |
| `completionist` | Completionist | 🏆 | 75 | every `content.allInstanceIds` ∈ `cleared` |

### Skill (visible)
| id | name | icon | reward | check |
|---|---|---|---|---|
| `three-star` | Solid Run | ⭐ | 5 | `run.stars ≥ 3` |
| `four-star` | Dialed In | 🌟 | 20 | `run.stars ≥ 4` |
| `five-star` | Flawless | 💫 | 40 | `run.stars ≥ 5` |
| `daredevil` | Daredevil | 😎 | 25 | `run.nearMisses ≥ 10` |

### Combo (visible + one hidden)
| id | name | icon | hidden | reward | check |
|---|---|---|---|---|---|
| `flow-1` | In the Zone | 🌀 | – | 20 | `run.timeAt8 ≥ 10` |
| `flow-2` | Untouchable Flow | 🌪️ | – | 35 | `run.timeAt8 ≥ 30` |
| `perpetual` | Perpetual Motion | ♾️ | ✓ | 75 | `run.finished && run.comboUnbroken` |

### Ladders (visible; each tier a distinct id, generated from a config)
- **Drift time (lifetime minutes)** — icon ⏱️, `check → { progress: lifetime.driftSecs/60, target }`:
  `drift-10`(20) · `drift-25`(30) · `drift-50`(40) · `drift-100`(60) · `drift-250`(100) · `drift-500`(150).
- **Races finished (lifetime)** — icon 🔁, `{ progress: lifetime.runs, target }`:
  `races-10`(15) · `races-50`(30) · `races-100`(50) · `races-250`(100) · `races-500`(150).
- **Wallet reached (latches; never un-unlocks on spend)** — icon 🛞,
  `{ progress: max(wallet, alreadyProgress), target }`:
  `hoard-500` Tire Saver (25) · `hoard-1000` Tire Lover (40) · `hoard-2500` Tire Warehouse (80) ·
  `hoard-5000` Tire Factory (150).

### Economy / collection (visible)
| id | name | icon | reward | check |
|---|---|---|---|---|
| `clean-sweep` | Clean Sweep | 🧹 | 20 | `run.tireTotalOnTrack > 0 && run.tiresThisRun === run.tireTotalOnTrack` |
| `soda-pop` | Soda Pop | 🥤 | 10 | any cap collected (`caps` non-empty) |
| `big-spender` | Retail Therapy | 🛍️ | 15 | `owned.length ≥ 1` |
| `fashionista` | Fashionista | 👗 | 30 | `owned.length ≥ 5` |
| `well-rounded` | Well Rounded | 🧩 | 30 | `owned` covers every `content.shopCategories` |

### Hidden
| id | name | icon | reward | check |
|---|---|---|---|---|
| `glass-cannon` | Living Dangerously | 💥 | 40 | `run.stars ≥ 5 && run.nearMisses ≥ 15` |
| `untouchable` | Untouchable | 🛡️ | 30 | `run.finished && run.crashes === 0` |
| `slalom-saint` | Slalom Saint | 🚧 | 60 | `run.finished && run.conesTotal > 0 && run.conesHit === 0` |
| `bulldozer` | Bulldozer | 🚜 | 30 | `run.conesTotal > 0 && run.conesHit === run.conesTotal` |
| `cola-collector` | Sugar High | 🧃 | 40 | every `content.forwardTrackIds` has a collected cap |
| `night-owl` | Night Owl | 🦉 | 15 | `run.hour ∈ {22,23,0,1}` |
| `midnight-drift` | Midnight Drift | 🌙 | 15 | `run.hour ∈ {2,3,4}` |
| `early-bird` | Early Bird | 🐦 | 15 | `run.hour ∈ {5,6,7}` |

### DDK — 6-star mastery (generated, hidden)
`DDK_PPS = 600`. A run at 600+ PPS = a **crown** above the 5 stars.
- Per instance, generated from `content.allInstanceIds`:
  `ddk-<instanceId>` — name `DDK <TrackName>` (`+ ' (reversed)'`), icon 👑, hidden,
  reward **60**, `check → records[instanceId] ≥ DDK_PPS`.
- `absolute-ddk` — name **Absolute DDK**, icon 👑✨, hidden, reward **1000**,
  `check → every content.allInstanceIds has records[id] ≥ DDK_PPS`. Also lights a
  permanent crown on the main menu.

**Reward-total note (economy):** at full content (14 instances) achievements grant
≈ **3.6k** one-time tires, ~1.8k of it the DDK tail. Nearly all is gated behind mastery
(600 PPS, 500 min drift, unbroken drift) or grind (ladders). Intended as the completionist
long-tail; the sink (cars/cosmetics, Phase C/D) must keep pace. Revisit tuning when Phase C
cars land. Tracked in `docs/plans/economy.md`.

---

## New mechanics folded into this feature

1. **DDK crown.** `DDK_PPS = 600` in `js/economy.js`; `isDDK(pps)`. Star badge (results
   screen + track cards) renders a 👑 above the 5 stars when `pps ≥ 600` (else hidden).
   Payout `starsForPps` stays capped at 5 — the crown is display + achievement only,
   never changes finish payout.

2. **Cola cap → tires (not score).** Today the donut-cap banks `CAP_BONUS` **score**
   (`game-engine.js` ~L156) which is then stripped from PPS (dead points). Replace with a
   fixed **`CAP_TIRE_VALUE = 15`** tire award, one-time per track via `capCollect`, logged
   to the ledger. Remove `CAP_BONUS`, `capBonus`, and the PPS-strip (`ppsScore = totalScore`
   afterwards). Verify caps are one-time before shipping (if per-run today, make them
   one-time so it stays a controlled faucet).

3. **Run instrumentation** (all reset in the per-run init, read at finish):
   - `S.crashes` — ++ on wall/prop impact (untouchable).
   - `S.conesHit` — ++ when a cone flips (`hitConeAt`); `conesTotal = cones.length`.
   - `S.timeAt8` — `+= dt` while `S.mult >= MULT_MAX`.
   - `S.comboUnbroken` — starts `true`; set `false` in `resetCombo`/`burnCombo`.
   - `S.capsThisRun` — ++ on donut-cap bank.
   - `tiresThisRun` already exists (`tiresEarned`); `tireTotalOnTrack` = count of tire
     collectibles on the instance.

---

## Store additions

- `defaults().stats` gains `runs: 0`, `driftSecs: 0` (deep-merge fills old saves; no
  migration). Incremented once per race finish in the engine.
- `defaults().achievements` already `{}`. New helpers:
  - `achAll()` → the raw `{ [id]: { unlocked, progress } }` map.
  - `achUnlocked()` → `Set` of unlocked ids (for `evaluate`).
  - `achUnlock(id)` → idempotent, sets `unlocked:true`, persists.
  - `achSetProgress(id, n)` → stores `progress = max(existing, n)`, persists (ladders latch).
- No new localStorage outside `store.js` (rule).

---

## UI

- **Toast** on unlock: reuse `flash()` in-engine (`🏆 <name>  +N 🛞`); on the shop page a
  small equivalent toast in `modify.html`.
- **Crown on star badge**: results screen (`race-results.js`) + track cards
  (`tracks.html`) — 👑 above the 5 stars when `pps ≥ 600`.
- **`achievements.html`**: grid grouped by category; each card = icon + name + desc +
  state. Hidden+locked → `???` with the reward masked; visible+locked → greyed with desc;
  unlocked → full colour + `+N 🛞`. Ladder/counter cards show a `progress / target` bar.
  Header shows `unlocked / total`. Vendor prefixes by hand (no autoprefixer).
- **Menu button**: 🏆 Achievements on `index.html`, a second column beside ⚙ Settings.
- **Absolute-DDK crown**: a badge by the title on the main menu, shown only when
  `absolute-ddk` is unlocked.

---

## Phases

- [x] **E1 — store** `[sonnet-high]`
      `stats.runs` + `stats.driftSecs` in `defaults()`; `achAll/achUnlocked/achUnlock/
      achSetProgress` helpers. Unit tests (default shape, idempotent unlock, progress
      latches to max, old-save merge). No SW/UI yet.

- [x] **E2 — definitions + evaluator** `[opus]`
      `js/achievements.js`: `ACHIEVEMENTS` (static) + generated families (ladders, `ddk-*`,
      `absolute-ddk`) + pure `evaluate(ctx, unlocked)` + `DDK_PPS`. Heavy unit tests: every
      check callable on a mock ctx without throwing; id uniqueness; each achievement fires on
      the intended ctx and *not* otherwise; ladders return progress; `evaluate` never returns
      an already-unlocked id.

- [x] **E3 — engine wiring + mechanics** `[opus]`
      Per-run accumulators `runNearMisses/runCrashes/runTimeAt8/runDriftSecs/runTirePickups/
      runCaps/comboUnbroken` (separate from the per-combo `S.*`); cola→tires
      (`CAP_TIRE_VALUE=15`, removed `CAP_BONUS`/PPS-strip); `isDDK`/`DDK_PPS` in economy
      (`achievements.js` re-exports). At finish (Time Attack only): bump `stats.runs`/
      `driftSecs`, `awardAchievements(pps)` assembles `ctx` → `evaluate` → `achSetProgress`
      per ladder + `achUnlock` + credit reward per new id, passes `unlocked`/`ddk` to
      `raceResults.show`. Economy pieces unit-tested (`isDDK`, payout unchanged).
      *(Purchase-side eval + toast moved to E6 — shop achievements are still caught at the
      next finish; E6 makes them immediate on `modify.html`.)*

- [x] **E4 — results toast + crown** `[sonnet-high]`
      `race-results.js`: render newly-unlocked toast list + the 👑 crown above stars when
      `pps ≥ 600`. CSS in `sandbox.css`.

- [x] **E5 — track-card crowns** `[sonnet-high]`
      `tracks.html`: 👑 above the star badge on any instance whose `bestPPS ≥ 600`.

- [x] **E6 — achievements page + menu button + shop eval** `[opus]`
      `achievements.html` (grid, hidden/locked/unlocked states, progress bars, `X/N`
      header) + 🏆 button on `index.html` beside Settings + Absolute-DDK menu crown.
      New CSS file (`css/achievements.css`) with hand-written vendor prefixes.
      Immediate purchase-side eval + toast on `modify.html` (assemble a run-less `ctx`,
      call `evaluate`, unlock + credit, toast) so shop achievements fire without waiting
      for a race.

- [ ] **E7 — docs + SW + PR** `[sonnet-high]`
      `sw.js` bump + add `js/achievements.js`, `achievements.html`, `css/achievements.css`
      to `ASSETS`; AGENTS.md (evaluator + store helpers + new `S.*` fields + cola→tires +
      DDK), ROADMAP tick (Phase 2 Achievements), economy.md faucet note. Tick E1–E7; PR.

**Phase done when:** every check fires correctly (unit-tested), unlocks persist + credit
tires once, the page shows live state with progress bars, the in-game toast and the DDK
crown render, `npm test` green, browser smoke clean on ≥ 1 track.

---

## Guardrails

- **Observational only** — achievements never gate content, never change a record or PPS.
- **Records-safe** — rewards are soft currency (cosmetics/cars sink), never power.
- **Pure evaluator** — `evaluate` + every `check` pass `node --check` and test without a
  DOM/canvas; all time/content is injected via `ctx`, never read from globals.
- **One tire credit per unlock** — idempotent; re-finishing an already-unlocked achievement
  pays nothing.
- **Agent tags** — store/engine/UI plumbing → `sonnet-high`; evaluator design + wording +
  page UX → `opus`. Reviewer agent runs before the PR.
