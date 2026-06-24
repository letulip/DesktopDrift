# Plan — tire-coin economy (implementation)

Concept + numbers live in **ROADMAP.md → Phase 2.5**. This is the step-by-step build.
Each step is tagged **[sonnet-high]** (mechanical, well-specified, behind tests) or
**[opus]** (design / schema / feel / cross-cutting UX). Workflow per `desktopdrift-pr`
(branch from main → `npm test` + `node --check js/*.js` → ONE SW-clear browser smoke →
bump SW cache → PR). English only. One commit per step; tick the box in the same commit.

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

- [ ] **A6. HUD wallet counter.** **[sonnet-high]**
      Add a wallet element to the game HUD (markup in `game.html`) + per-frame write in
      `render.js` HUD section (use a prev-value guard like the others). Also show the wallet
      total on the menu (`index.html`) — small inline read of `store.wallet()`.

- [ ] **A7. Place tires + registry denominator.** **[sonnet-high]** (SVG authoring is the user's, in Figma)
      Author `<line id="ITEM_TIRE">` lines in ONE track SVG (green-study) per ROADMAP
      placement archetypes (on-line / off-line / drift-zone / greedy). Add `tires: n` to that
      registry entry (badge denominator, like `caps`). Roll out to other tracks after it plays well.

- [ ] **A8. Docs + SW + PR.** **[sonnet-high]**
      `sw.js`: bump cache (new modules already mostly listed; add any). AGENTS.md: document the
      tire economy (store slices, `kind:'tire'`, payout). Tick A1–A8; PR.

**Phase A done when:** tires collect on contact, persist per-track, wallet rises (pickups +
finish payout), HUD/menu show it, `npm test` green, browser smoke clean on ≥1 track.

---

## Phase B — shop + cosmetics

- [ ] **B1. Owned-items schema + spend.** **[opus]** `defaults().owned` (array of item ids) +
      pure `canAfford(price)` / `buy(itemId, price)` (deduct wallet, add to owned; reject if
      broke or already owned). Tests.
- [ ] **B2. Cosmetics catalog (data).** **[sonnet-high]** `js/shop-catalog.js` — data table of
      cosmetics `{ id, name, price, kind:'finish'|'livery'|'wheel'|'trail', apply }`. Free 20
      body + 10 neon colours stay free; catalog is additive.
- [ ] **B3. Shop UI.** **[opus]** Garage tab in `select.html` (or `shop.html` — decide; leaning
      garage tab): list catalog, show price/owned/wallet, buy button → `buy()`, gate owned
      cosmetics in the existing garage palette/picker by `owned`.
- [ ] **B4. Apply cosmetics in render.** **[opus]** Paint finishes / livery / wheel / trail
      colour in `drawCar` + skids, driven by the equipped cosmetic. Feel/visual — careful.
- [ ] **B5. Docs + SW + PR.** **[sonnet-high]**

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
