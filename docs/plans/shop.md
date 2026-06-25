# Plan — shop & cosmetics (Phase B)

Concept + pricing live in **ROADMAP.md → Phase 2.5**. Phase A (earn & wallet) is the
prerequisite and is already built (see `docs/plans/economy.md`). This is the step-by-step
build for **spending** those tires.

Each step is tagged **[sonnet-high]** (mechanical, well-specified, behind tests) or **[opus]**
(design / schema / feel / cross-cutting UX). Workflow per `desktopdrift-pr` (branch from main →
`npm test` + `node --check js/*.js` → ONE SW-clear browser smoke → bump SW cache → PR).
English only. One commit per step; tick the box in the same commit.

---

## Decisions (locked for B — flag in review to change)

These resolve the ROADMAP "open decisions" so the steps below are unambiguous:

1. **Location — garage tab, no new page.** The shop lives inside `select.html` (which *is*
   the garage). Add a purchasable catalog below the existing palette; gate locked cosmetics in
   place. No `shop.html`. Rationale: car + look + buy is one mental task; reuses the existing
   preview canvas and palette wiring.
2. **v1 cosmetic kinds — paint **finish** + **trail colour** only.** These two reuse the
   existing colour-swatch + `drawCar` pipeline with the smallest render change.
   **Liveries and wheel styles are deferred** to a later additive step (B6+, more art/render
   work) so B ships small. The catalog data model still carries a `kind` field so adding them
   later is data-only.
3. **Free tier stays free.** The 20 body colours (`PALETTE`) + 10 neon (`NEON_PALETTE`) are
   never gated. The shop is strictly additive on top.
4. **Pricing (from ROADMAP).** Finishes: matte 40, metallic 80, pearl 150, chrome 250.
   Trail colours: 40 each. (Tune in B2; these are placeholders that fit the ROADMAP tiers.)
5. **Records-safe.** Everything here is cosmetic — no stat, power, or grip change. Per-car
   records are a Phase C concern; B must not touch the `records` slice.

---

## Reuse what already exists
- **Persistence:** `js/store.js` deep-merges saves over `defaults()`, so adding an `owned`
  slice is **just an edit to `defaults()` — no VERSION bump, no data loss** (old players get it
  filled empty). Mirror the `wallet`/tire helpers added in Phase A.
- **Currency:** `wallet()` / `addTires(n)` already exist; spending is the same balance, downward.
- **Pure formulas:** put `canAfford` / `buy` next to `starsForPps`/`finishPayout` in
  `js/economy.js` (pure, unit-tested) — keep all economy math in one tested module.
- **Garage palette:** `select.html` already builds `#body-palette` / `#neon-palette` swatch
  grids from `PALETTE` / `NEON_PALETTE` and writes `garage.bodyColor` / `garage.neonColor`.
  The shop catalog renders with the same swatch/card pattern.
- **Render:** `drawCar` (game) in `js/render.js` and `drawPreview` in `select.html` both paint
  the body; finish/trail apply at those two sites.

---

## Phase B — shop + cosmetics

- [x] **B1. Owned-items schema + spend logic.** **[opus]** DONE.
      `defaults()` gained `owned: []` and `garage` gained equipped slots `finish: null`,
      `trailColor: null` (merge-store fills both for old saves — no migration). store.js exports
      `owned()`, `isOwned(id)`, `grant(id)` (idempotent), `equip(slot, value)`, and `purchase(item)`
      (wires the pure `buy()` → `addTires(-price)` + `grant` atomically, only on success). Pure
      `js/economy.js`: `canAfford(balance, price)` + `buy({wallet,owned}, item)` →
      `{ ok, wallet, owned }` or `{ ok:false, reason:'owned'|'broke' }` (owned checked first;
      snapshot never mutated). Tests: `economy.test.js` (canAfford + buy success/owned/broke/
      defaults) + `store.test.js` (owned default, grant idempotent, equip persists, purchase
      success/dup/broke) + `store-load.test.js` (owned + garage slots merge-fill on old saves).
      136 tests green, node --check clean. SW v86→v87. **No render yet.**

- [x] **B2. Cosmetics catalog (data).** **[sonnet-high]**
      New `js/shop-catalog.js`: `export const CATALOG = [...]` of
      `{ id, name, price, kind:'finish'|'trail', value }` where `value` is the render param
      (finish name e.g. `'matte'`, or a trail hex). Seed the v1 set from the Decisions pricing.
      Pure data + a tiny `byKind(kind)` helper; unit-test the helper + invariants (unique ids,
      positive prices). No UI, no render.

- [x] **B3. Shop UI in the garage.** **[opus]** DONE (code; live visual smoke handed to user
      — preview browser stuck on cached HTML).
      `select.html`: a "Shop" section under the neon palette with two groups (Finish, Trail) of
      `.shop-card`s built from `byKind()`, plus a fixed wallet HUD (`#wallet-hud` → 🛞 N) wired
      to `wallet()`. States per card: owned/equipped/locked (`disabled` + greyed when unowned &
      `!affordable`); tag shows ✓ / `🛞price` / `🔒price`. Click flow: unowned → `purchase()`
      (no-op on broke) then auto-`equip`; owned → toggle `equip(slot, value|null)`. Slots map
      `finish→garage.finish`, `trail→garage.trailColor`; `redrawSelected()` called on change
      (B4 will actually repaint finish/trail there). CSS in `css/select.css`. SW v88→v89.
      `node --check` clean, 145 tests green; server confirmed to serve the new markup+wiring.

- [ ] **B4. Apply cosmetics in render.** **[opus]** (feel/visual — careful)
      Paint the equipped **finish** in `drawCar` (game) and `drawPreview` (garage) — a small
      shading/gloss tweak per finish (matte = flat, metallic/chrome = highlight gradient,
      pearl = tinted sheen), driven by `garage.finish`. Paint the equipped **trail colour** in
      the skid/trail render, driven by `garage.trailColor` (falls back to the theme skid colour
      when null). Keep it subtle; no perf regressions. Visual smoke on ≥1 track + the garage
      preview.

- [ ] **B5. Docs + SW + PR.** **[sonnet-high]**
      `sw.js`: bump cache + add `js/shop-catalog.js` to `ASSETS`. AGENTS.md: document the shop
      (owned/equipped store slices, catalog module, `canAfford`/`buy`, render application).
      Tick B1–B5; PR.

**Phase B done when:** the garage shows a shop, tires can be spent on finishes + trail colours,
purchases persist (`owned`) and equip (`garage.finish`/`trailColor`), the equipped look renders
in both the garage preview and the game, free colours stay free, `npm test` green, browser smoke
clean.

---

## Deferred (additive, after B plays well)
- **B6. Liveries** — overlay stripes/patterns on the body (new render layer in `drawCar`).
- **B7. Wheel styles** — alternate wheel sprites/shapes.
- Both are data-only additions to `CATALOG` (`kind:'livery'|'wheel'`) plus their render branch;
  they slot into the same buy/equip plumbing from B1–B3.

## Notes / guardrails
- **One currency** (tires). No second currency, no real money.
- **Cosmetic-only** — never sell stats/power; per-car records (Phase C) keep PPS fair.
- **Anti-frustration:** prices fit the Phase A one-time bank (~560 tires) so a player can
  afford a couple of starters early; the rest is the finish-payout long tail.
- **Tag rationale:** schema/spend-atomicity/UX-integration/render-feel → opus; catalog data
  and docs/wiring-behind-a-spec → sonnet-high.
