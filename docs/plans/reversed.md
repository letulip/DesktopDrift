# Plan — reversed track variants (economy Phase D2)

Each track gets a **reversed** variant: drive the same circuit in the opposite direction.
This is the biggest remaining economy lever — it **doubles content** (×2 instances) and is the
**pacing gate** that splits the one-time bank (forward ≈ half, reversed ≈ half). Concept +
numbers: `docs/plans/economy.md` (Phase D2). Workflow per `desktopdrift-pr` (this branch →
`npm test` + `node --check` → ONE SW-clear smoke → bump SW → PR). English only.

## Why / economics
- Capacity model = **14 instances** = 7 tracks × (forward + reversed). Each instance has its
  own one-time pickups, caps, records and **first-clear bonus (+20)**.
- **Unlock gate (3★):** the Reversed section is always visible, but each track's reversed is
  **locked until its forward earns 3+ stars** (bestPPS ≥ 300 — 1★/100 PPS). A mild mastery gate,
  not just completion. Still roughly halves the guaranteed bank and adds a skill goal.

## Decisions (locked for D2 — flag in review to change)
1. **Instance id** = `trackId` (forward) / `` `${trackId}:rev` `` (reversed). ONE key used
   everywhere: `records`, `stats.tires`, `stats.caps`, `stats.cleared`, first-clear. Forward
   keeps the bare id → **no migration** (existing saves stay valid; reversed adds new keys).
2. **`reverseTrack(track)` is a PURE transform** of the already-parsed track object — no second
   SVG, no re-fetch. Reverse `center` / `inner` / `outer` in lockstep, then recompute
   `checkpoints` (via `sampleCheckpointsByCorner`), `startPos` (`center[0]`) and `startAngle`
   (`center[0]→center[1]`). `cones`, `props`, `collectibles`, `TABLE`, `theme`, `laps` unchanged.
   Because the existing finish/checkpoint logic only reads `startAngle` + `checkpoints` order, it
   works unchanged on a reversed track.
3. **Collectible positions reused as-is** (same geometry). Persistence is per-instance, so
   forward/reversed collect independently. *(Refinement for later: re-seed tires to the reverse
   racing line — corners face the other way. Not blocking.)*
4. **Mode plumbing:** new URL param `` `game.html?track=X&dir=rev` ``. `game.html` applies
   `reverseTrack` when `dir=rev` and passes the instance id to `startGame`. (Independent of the
   existing `mode=zen`; the two can combine later but Zen earns nothing anyway.)

## Steps

- [x] **R1. `reverseTrack(track)` pure transform.** **[opus]** DONE.
      `js/track-util.js` `reverseTrack(T)` — reverses `center`/`inner`/`outer` in lockstep,
      recomputes `checkpoints` (`sampleCheckpointsByCorner`, K via `T.K`), `startPos`,
      `startAngle`; spreads the rest (cones/props/collectibles/TABLE/theme/laps/id), sets
      `reversed: true`. Pure (input untouched). Tests `tests/reverse-track.test.js` (6 cases:
      order reversed, inner/outer lockstep, double-reverse identity, start flips 180°,
      checkpoints recomputed, content carried). 162 tests green.

- [x] **R2. Instance-id keying across store + engine.** **[opus]** DONE.
      `instanceId(trackId, reversed)` in `js/track-util.js`. Engine derives
      `INSTANCE = instanceId(T.id, opts.reversed)` and uses it for restore (`collectedCaps`/
      `tiresFor`), `tireCollect`/`capCollect`, `markCleared`, the `records[INSTANCE]` slot +
      first-clear, and the history label (` (reversed)` suffix). `S.reversed` added.
      `opts.reversed` defaults false → forward unchanged (INSTANCE == id); reversed reachable
      once R3 passes it. The store already keys by string id, so directions are independent.
      Test: `instanceId` forward/reversed. 163 tests green.

- [x] **R3. Wire reversed into the game.** **[opus]** DONE.
      `game.html`: reads `dir`, applies `reverseTrack(T)` when `dir=rev`, appends "(Reversed)" to
      the title, passes `reversed` to `startGame`. The engine already keys everything by
      `INSTANCE` (R2). Verified in browser: `game.html?track=green-study&dir=rev` loads with the
      `{...namespace}` spread carrying K/CP_R/TRACK_HALF, checkpoints recomputed (8), startAngle
      flipped ~180°, car at the (reversed) start line, countdown + HUD running.
      *(Full 3-lap finish/payout under `:rev` relies on R1's tested geometry — drive-test it.)*

- [x] **R4. Track-select: Reversed toggle + unlock gate.** **[opus]** DONE.
      `tracks.html`: card build refactored into `renderCards(reversed)`; the Normal/Reversed
      toggle (now enabled) re-renders for the direction. Reversed cards are **locked until the
      forward earns 3★** (`bestPPS ≥ 300`) — rendered as inert `<div>`s with a 🔒 overlay +
      "earn 3★" copy; unlocked cards are links to `select.html?track=X&dir=rev` (and `select.html`
      now forwards `dir=rev` to `game.html`). Records / star-rating / cap+tire chips all read per
      instance via `instanceId`; names get a ↺ suffix. Verified in browser. *(Thumbnail is still
      forward art — mirrored in R5.)*

- [x] **R5. Mirrored reversed thumbnail.** **[sonnet-high]** DONE (subagent).
      `drawThumb(canvas, svgSrc, theme, reversed=false)` mirrors horizontally (`translate(w,0)
      + scale(-1,1)` wrapped in save/restore) when reversed; `renderCards` passes `reversed`.
      Forward output unchanged. Per-mode chips/badges already done in R4. Verified in browser
      (reversed art flips vs forward). SW v113.

- [ ] **R6. Docs + SW + PR.** **[sonnet-high]**
      Bump SW cache; AGENTS.md (reversed mode, `instanceId`, `reverseTrack`); tick economy.md
      **D2** + ROADMAP Phase 2 "reversed variants"; PR.

**Done when:** every track exposes a reversed variant gated behind its forward clear; reversed
runs have independent pickups/caps/records/first-clear; `npm test` green; browser smoke clean.

## Resolved decisions (confirmed)
1. **Unlock rule** — reversed unlocks per-track at **3★ on the forward** (`bestPPS ≥ 300`). The
   section is visible; tracks are locked until the stars are earned.
2. **Tire positions in reverse** — **reuse forward positions.** The seeder offsets pickups by
   geometry (toward the concave/inner corner edge), which is *direction-agnostic* — re-seeding
   the reversed centreline yields essentially the same points. So reuse is both simplest and
   correct; per-instance persistence keeps forward/reversed collection independent.
3. **Reversed thumbnail** — **mirrored preview** (horizontal flip), see R5.

## Tag rationale
`reverseTrack` geometry, instance-key schema, start/finish wiring, unlock UX → **opus**;
thumbnail hint, badge wiring, docs → **sonnet-high**.
