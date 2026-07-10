# Plan — tire-coin economy (implementation)

Concept + numbers live in **ROADMAP.md → Phase 2.5**. This is the step-by-step build.
Each step is tagged **[sonnet-high]** (mechanical, well-specified, behind tests) or
**[opus]** (design / schema / feel / cross-cutting UX). Workflow per `desktopdrift-pr`
(branch from main → `npm test` + `node --check js/*.js` → ONE SW-clear browser smoke →
bump SW cache → PR). English only. One commit per step; tick the box in the same commit.

## Economy balance & numbers (the source of truth for tuning)

Designed top-down from real content. **Capacity = 14 track instances** = 7 tracks × (forward +
reversed). Decide how much currency exists → price the sinks → check the pacing.
**Ratios matter more than absolutes** — tune the levers by feel, keep the roles intact.

### Currency rule
- **1 tire pickup = 1 coin** (Mario-coin feel: plentiful, the collect is juicy). The history
  reads cleanly: "{Track} — N tires" == +N coins.

### 1) Faucets — how many tires exist
| Source | Amount | Total over 14 |
|---|---|---|
| Tires on track (one-time) | ~10 / instance | 140 |
| First-clear bonus | +20 / instance | 280 |
| Cola cap (one-time, drift donut) | 15 / instance | ~210 |
| Finish payout (repeatable) | `2 + 2×stars` → 2–12 / race | ∞ (thin stream) |
| **Achievements (one-time)** | see `achievements.md` | **≈ 3,600** (~1.8k is the DDK tail) |

→ **Guaranteed one-time bank ≈ 420 tires** (collect everything + clear all 14), then an endless
trickle from finishes, tied to PPS/stars. Roles: **one-time = starting capital**, **finish
payout = the long-progress engine**.

> **Achievements are now the dominant one-time faucet (~3,600 tires).** Deliberate: nearly all
> of it is gated behind mastery (600-PPS DDK crowns, 500 min drift, an unbroken-drift finish) or
> grind (the drift/race/wallet ladders), so it pays out slowly over the completionist tail — not
> up front. **The sink must keep pace** (Phase C cars + more cosmetics); revisit these numbers
> when Phase C lands so the player doesn't drown in tires. Also note **cola caps pay 15 tires
> now** (they were dead score) — a small skill-gated one-time faucet.

### 2) Sinks — what we spend on
| Cosmetics | Price |
|---|---|
| Tier 1 (trail colour, basic matte) | 40–80 |
| Tier 2 (livery, metallic) | 150–250 |
| Tier 3 (chrome/pearl, premium livery) | 400 |
| **Full cosmetics catalog** | **~1,800** |

| Cars | Price |
|---|---|
| First new (the hook) | 400 |
| Second | 800 |
| Third (aspirational) | 1,400 |
| **All cars** | **~2,600** |

→ **Everything ≈ 4,400 tires.**

### 3) Pacing check
- Starting capital **~420** → covers starter cosmetics + **almost the first car (400)**. The
  first car is deliberately cheap = the early hook (reach it by collecting content OR ~40 races).
- The rest is funded by **finish payouts (~10/race for a strong driver)**: full cosmetics + the
  other cars are a completionist long tail, never mandatory.
- **Reversed gate splits the bank in half:** 7 forward ≈ 210 one-time → unlock reversed → +210.
  Progression breathes.
- Verdict: good as a start. Want faster? raise the finish payout. Want the collect to feel more
  valuable? more tires per track. Ratios over absolutes.

### Implementation status vs this model
| Lever | Target | Built |
|---|---|---|
| 1 tire = 1 coin | yes | ✅ (`TIRE.value` = 1) |
| Finish payout `2 + 2×stars` | yes | ✅ (`js/economy.js`) |
| First-clear bonus (+20/instance) | yes | ❌ **not yet** — biggest remaining faucet |
| Tires/track ~10 | ~10 | live: green-study 12 / steel-kitchen 11 / workbench 13 (≈ target) |
| Reversed mode (×2 instances + gate) | yes | ✅ done (reverseTrack + instanceId `:rev` keying + dir=rev + tracks.html 3★ gate; see `docs/plans/reversed.md`) |
| Cosmetics catalog ~1,800 | ~1,800 | today ~840 (finishes 40/80/150/250 + 8 trails ×40); liveries/wheels pending |
| Cars (400/800/1,400) | yes | ❌ Phase C |

### History (ledger) granularity
- Aggregate **per race**, not per pickup: one entry **"{Track} — N tires"** (sum of the run's
  pickups) + one **"{Track} — finish bonus"**. Pickups still credit the wallet live (HUD), but
  the ledger logs the global events only.

---

## Current state vs the model — assessment

- **Content live:** 3 tracks, **forward only** (green-study, steel-kitchen, workbench) = 3 of
  the 14 target instances.
- **Faucets live:** pickups **36** one-time (12+11+13 @ 1/coin) + finish payout (2–12/race).
  **No first-clear bonus, no reversed.** → current one-time bank ≈ **36** vs the **~420** target.
- **Sinks live:** cosmetics catalog **~840** (finishes 40/80/150/250 + 8 trails @ 40). No cars.
- **Read on prices:** the catalog is priced for the *full* model (~420 bank). With only 3
  forward tracks and no first-clear bonus, early supply is thin → cosmetics feel expensive
  *right now*. **Fix by adding the missing faucets/content, not by cutting prices.** Cheapest,
  highest-leverage add = the **first-clear bonus**. Tier mapping is sound (finishes = tier 1–3;
  trails = tier 1); catalog reaches ~1,800 once liveries/wheels land; cars priced in Phase C.

## Phase D — integrate the model into the game (faucets & gating)

Close the gap between the model and what's built. Order = impact × cheapness. Each step ships
behind tests + one browser smoke (per `desktopdrift-pr`).

- [ ] **D1. First-clear bonus (+20 / instance).** **[opus]** Biggest missing faucet, smallest change.
      - `js/economy.js`: `export const FIRST_CLEAR_BONUS = 20;`
      - `js/store.js`: `stats.cleared` (array of instance ids) + `markCleared(id)` → returns
        `true` the first time only, persists (additive — no VERSION bump).
      - `game-engine.js` on finish: instance id = `T.id` (+ `:rev` later for reversed); if
        `markCleared(id)` → `addTires(FIRST_CLEAR_BONUS, '{Track} — first clear')`.
        Ledger order: pickups sum → first clear → finish bonus.
      - Tests: granted once per instance, never re-awarded.

- [x] **D2. Reversed mode + per-track unlock gate.** **[opus]** Doubles content (×2 instances)
      and is the bank's pacing gate. **DONE.** Detail plan: `docs/plans/reversed.md`.
      - `js/track-util.js`: `reverseTrack(T)` pure transform; `instanceId(trackId, reversed)`
        → bare id (forward) or `` `${trackId}:rev` `` (reversed).
      - **Instance keying:** records, tire pickups, caps, cleared flag, and first-clear bonus
        all keyed by `instanceId` (forward = bare id for back-compat, reversed = `:rev`).
      - `game.html?dir=rev` reads param, applies `reverseTrack`, passes `reversed` to `startGame`.
      - `tracks.html`: Normal/Reversed toggle; reversed locked until forward earns 3★
        (bestPPS ≥ 300); per-instance records/chips; ↺ name suffix (thumbnail not mirrored —
        same geometry both ways).

- [x] **D3. Pricing validation pass.** **[opus]** DONE (analysis — no code/price changes).
      Re-checked the pacing with D1 + D2 live on the current 3 tracks (6 instances = 3 fwd + 3 rev):
      | Source | fwd (3) | rev (3, behind 3★) | one-time |
      |---|---|---|---|
      | Tires @1 | 36 | 36 | 72 |
      | First-clear +20 | 60 | 60 | 120 |
      | **One-time bank** | **96** | **+96** | **≈192** |
      | Finish payout | 2–12/race | 2–12/race | ∞ |
      First-clear ~tripled the early bank (36 → 96 forward); reversed doubles it (→192). Matches
      the model's slope (6/14 instances → ~180 expected ≈ 192). Catalog ~840 today → completion
      is a finish-payout long tail (~80 races), early hook (Matte+trail ≈ 80) affordable fast.
      **Findings:** prices stay; **3★ gate confirmed reasonable** (3★ readily attainable; 4–5★ is
      the real skill challenge); don't touch `FINISH_FLAT`/`FINISH_PER_STAR` until cars (D5) add a
      big sink; tires/track 12/11/13 (≈ target ~10) kept — collect feels juicier. Caps give score,
      not currency, and are stripped from record-PPS, so they don't inflate payout (anti-grind ok).

- [ ] **D4. Catalog completion → ~1,800.** **[sonnet-high]** Liveries + wheel styles = shop
      **B6/B7** (data + a render branch). Additive; do after faucets so there's money to spend.

- [ ] **D5. Cars (the aspirational sink).** **[opus]** Phase C below (C1 per-car records
      migration → C2 roster → C3 buy), priced 400 / 800 / 1,400. Gate behind a real faucet
      (D1/D2) so they're reachable.

**Sequencing:** D1 now (fast win) → D2 (reversed: the big content + pacing lever) → D3 validate
→ then D4 (B6/B7) + D5 (Phase C) as content grows. More tracks toward the 7-track target is
ongoing content work that feeds the same model.

---

## Reuse the cola-cap pipeline (already in the codebase)
Tires mirror cola caps but with **proximity pickup** (drive over it) instead of the
drift-arc, and they feed the **wallet** instead of score. The template to copy:
- parse: `ITEM_COLA_CAP` special-case in **`js/track-factory.js`** → `collectibles`.
- engine: `updateCaps()` in `js/game-engine.js`.
- render: `drawCaps()` in `js/render.js`.
- persist: `capCollect` / `collectedCaps` in `js/store.js`.
- badges: `tracks.html` / `index.html`.
Tires are a **separate `kind:'tire'`** collectible (no collision, like caps).

`js/store.js` now deep-merges saves over `defaults()`, so **adding `wallet`/tire slices is
just an edit to `defaults()` — no VERSION bump, no data loss** (old players get them filled).

---

## Phase A — earn & wallet (NO shop yet). Ship first.

- [x] **A1. Store schema + economy helpers.** **[opus]** DONE.
      `defaults()` gained `wallet: 0` and `stats.tires: { [trackId]: id[] }` (mirrors caps;
      merge-store fills both for old saves — no migration). store.js exports `wallet()`,
      `addTires(n)` (clamped ≥0, persists), `tiresFor(trackId)`, `tireCollect(trackId, id)`.
      Pure formulas in new **`js/economy.js`**: `starsForPps(pps)` (1/100, cap 5) +
      `finishPayout(pps)` = `2 + 2*stars` (2..12). Tests: `tests/economy.test.js` +
      wallet/tires in store tests. 121 tests green, node --check clean. SW v71→v72.

- [x] **A2. `TIRE` collectible descriptor.** **[sonnet-high]**
      In `js/collectibles.js`: `export const TIRE = { kind:'tire', r, value, imgSrc:'objects/tire.svg' }`.
      (`tire.svg` already exists.) `value` = tires per pickup (start: 5 — tune later).

- [x] **A3. Parse `ITEM_TIRE` proxy-lines.** **[sonnet-high]**
      In `js/track-factory.js`, add an `ITEM_TIRE` special-case next to `ITEM_COLA_CAP`:
      push `{ ...TIRE, x, y, capId }` into `collectibles` (no collision). Verify a track with
      `ITEM_TIRE` lines parses the expected count (browser/node sentinel).

- [x] **A4. Engine: pickup + finish payout.** **[opus]** (touches the race-finish/results flow)
      In `game-engine.js`: extend the collectible update so `kind:'tire'` collects on
      **proximity** (dist < r+CR), one-time, persists via `tireCollect`, `addTires(value)`,
      flash + pop (cheaper than the cap drift-arc). On race finish, compute
      `finishPayout(pps, stars)` and `addTires(...)`. Keep cap logic untouched; dispatch by `kind`.

- [x] **A5. Render: `drawTires`.** **[sonnet-high]**
      Mirror `drawCaps` — draw `tire.svg` sprite at each uncollected tire + a brief pop on
      collect; skip collected ones (or draw faded). Dispatch collectibles by `kind` in the
      world pass. Browser smoke: tires visible, pop on pickup.

- [x] **A6. HUD wallet counter.** **[sonnet-high]**
      Add a wallet element to the game HUD (markup in `game.html`) + per-frame write in
      `render.js` HUD section (use a prev-value guard like the others). Also show the wallet
      total on the menu (`index.html`) — small inline read of `store.wallet()`.

- [x] **A7. Seed tires + registry denominator + tracks.html badge.** **[opus]** DONE.
      Chose an **algorithmic seeder** over hand-placed SVG lines: new pure `js/tire-seed.js`
      `seedTires(center, inner, outer, n)` — even arc-spacing; on straights it sits on the
      racing line, on corners it's pushed toward the inner (concave) edge ∝ sharpness (harder
      to grab). `track-factory.makeTrack({ tires })` calls it; green-study seeds **12**
      (registry `tires: 12` mirrors it as the badge denominator). `tracks.html` shows a
      "🛞 N/M" badge under the cap badge. Unit-tested (`tests/tire-seed.test.js`, 5 cases:
      count, empty, inner-offset on a curve, ≈centerline on near-straight, determinism).
      Verified in browser: 12 tires seeded, pickup → wallet 0→5 + HUD + persist, badge shows
      "🛞 0/12". 126 tests green, console clean. Rollout to other tracks = `tires:N` + registry.
      *(was [sonnet-high]; upgraded to [opus] — the placement algorithm has feel implications.)*
      Author `<line id="ITEM_TIRE">` lines in ONE track SVG (green-study) per ROADMAP
      placement archetypes (on-line / off-line / drift-zone / greedy). Add `tires: n` to that
      registry entry (badge denominator, like `caps`). Roll out to other tracks after it plays well.

- [x] **A8. Docs + SW + PR.** **[sonnet-high]**
      `sw.js`: bump cache (new modules already mostly listed; add any). AGENTS.md: document the
      tire economy (store slices, `kind:'tire'`, payout). Tick A1–A8; PR.

**Phase A done when:** tires collect on contact, persist per-track, wallet rises (pickups +
finish payout), HUD/menu show it, `npm test` green, browser smoke clean on ≥1 track.

---

## Phase B — shop + cosmetics

Detailed step-by-step build moved to its own doc: **`docs/plans/shop.md`** (B1–B5, with the
shop-location / cosmetic-scope / pricing decisions locked there).

## Phase C — new cars + per-car records

- [ ] **C1. Per-car records schema.** **[opus]** Re-key `records[trackId].timeattack` by car
      (`[carId]`), with a migration that moves the existing single best under the current car
      id (the merge-store + a `MIGRATIONS` entry — this is the first real breaking migration).
      Update `tracks.html` to show best-per-selected-car. Tests for the migration.
- [ ] **C2. Car roster (art + stats).** **[opus]** New `CARS` entries (top-down SVG layers +
      Path2D + a sidegrade stat profile per ROADMAP: Wagon/Kei/Muscle/Wedge) + price. Art is
      content work; balance is feel-critical.
- [ ] **C3. Buy/unlock cars in shop.** **[sonnet-high]** Extend the shop + garage to gate cars
      by `owned`; `buy()` reused.
- [ ] **C4. Docs + SW + PR.** **[sonnet-high]**

---

## Notes / guardrails
- **Records-safe:** the spend is cosmetic + sidegrade cars only — never raw power. Per-car
  records (C1) keep PPS comparisons fair. Do not add stat upgrades that inflate the global best.
- **One currency** (tires). Caps stay a separate skill-flex collectible (score + badge), not money.
- **Anti-grind:** one-time pickups (finite per track) + PPS-scaled finish payout (the ongoing
  faucet). No respawning pickups.
- **Tag rationale:** schema/records/feel/UX-integration → opus; descriptors, parsing, sprite
  render, catalog data, wiring-behind-a-spec → sonnet-high.
```
