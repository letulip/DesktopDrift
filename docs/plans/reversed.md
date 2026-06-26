# Plan — reversed track variants (economy Phase D2)

Each track gets a **reversed** variant: drive the same circuit in the opposite direction.
This is the biggest remaining economy lever — it **doubles content** (×2 instances) and is the
**pacing gate** that splits the one-time bank (forward ≈ half, reversed ≈ half). Concept +
numbers: `docs/plans/economy.md` (Phase D2). Workflow per `desktopdrift-pr` (this branch →
`npm test` + `node --check` → ONE SW-clear smoke → bump SW → PR). English only.

## Why / economics
- Capacity model = **14 instances** = 7 tracks × (forward + reversed). Each instance has its
  own one-time pickups, caps, records and **first-clear bonus (+20)**.
- **Unlock gate:** a track's reversed is locked until its **forward** is completed (in
  `stats.cleared`) — completion, not mastery. This halves the guaranteed bank: clear 7 forward
  (≈210 one-time) → unlock reversed → ≈210 more. Progression breathes.

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

- [ ] **R1. `reverseTrack(track)` pure transform.** **[opus]**
      New pure helper (in `js/track-util.js` or `js/track-factory.js`): returns a reversed copy —
      `center`/`inner`/`outer` reversed in lockstep; `checkpoints`, `startPos`, `startAngle`
      recomputed from the reversed centreline; everything else shallow-copied. Unit tests
      (`tests/reverse-track.test.js`): centreline order reversed, inner/outer stay aligned to
      center, `startAngle` ≈ forward + π (mod 2π), checkpoints reversed, collectibles untouched,
      input not mutated.

- [ ] **R2. Instance-id keying across store + engine.** **[opus]** (schema/cross-cutting)
      Add `instanceId(trackId, reversed)` (pure; `js/track-util.js`). Thread it through the
      game-engine in place of the bare `T.id` for: `tireCollect`/`tiresFor`, `capCollect`/
      `collectedCaps`, `markCleared`, and the `records[key]` slot + first-clear. Store API is
      already keyed by string id, so this is mostly call-site changes. Tests: store treats
      `green-study` and `green-study:rev` as independent for tires/caps/cleared/records.

- [ ] **R3. Wire reversed into the game.** **[opus]** (touches the start/finish flow)
      `game.html`: read `dir`, `if (dir==='rev') T = reverseTrack(T)`, compute the instance id,
      pass both to `startGame`. `game-engine`: use the instance id for restore (collected
      caps/tires) + finish (records, first-clear, history labels — e.g. `{Track} (reversed) —
      finish bonus`). Confirm finish detection + lap counting work in reverse (they should, via
      R1's recomputed `startAngle`/checkpoints). Browser smoke: a reversed lap completes, pays
      out, records save under the `:rev` key.

- [ ] **R4. Track-select: Reversed toggle + unlock gate.** **[opus]** (UX integration)
      `tracks.html`: enable the now-locked **Reversed** toggle (`#btn-reversed`). In reversed
      view, a track card is **locked** until its forward is in `stats.cleared`; unlocked cards
      link to `game.html?track=X&dir=rev`. Show per-instance records/star-rating + the cap/tire
      chips for the selected direction. Locked card = lock icon + "Clear the forward lap first".

- [ ] **R5. Reversed thumbnail + per-mode badges.** **[sonnet-high]**
      `drawThumb` gets a direction hint (e.g. a ↺ arrow or reversed draw order) so reversed
      cards read as distinct. Cap/tire chip denominators read from the instance's stats. Mostly
      data wiring behind R2/R4.

- [ ] **R6. Docs + SW + PR.** **[sonnet-high]**
      Bump SW cache; AGENTS.md (reversed mode, `instanceId`, `reverseTrack`); tick economy.md
      **D2** + ROADMAP Phase 2 "reversed variants"; PR.

**Done when:** every track exposes a reversed variant gated behind its forward clear; reversed
runs have independent pickups/caps/records/first-clear; `npm test` green; browser smoke clean.

## Open questions (confirm before R1)
1. **Unlock rule** — reversed unlocks after *completing* the forward (any finish), correct? Or
   always available?
2. **Tire positions in reverse** — reuse forward positions for v1 (simple), re-seed later? Or
   re-seed now?
3. **Reversed thumbnail** — a small ↺ badge is enough, or do you want the preview itself drawn
   mirrored/reversed?

## Tag rationale
`reverseTrack` geometry, instance-key schema, start/finish wiring, unlock UX → **opus**;
thumbnail hint, badge wiring, docs → **sonnet-high**.
