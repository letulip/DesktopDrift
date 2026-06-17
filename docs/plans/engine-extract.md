# Plan — extract & test `js/game-engine.js`

Goal: shrink the 580-line `startGame` closure into a thin orchestrator that calls small
pure modules, each unit-tested. Keep the drift **feel identical** at every step.

Branch: `refactor/engine-extract`. Workflow: `desktopdrift-pr` (branch → `npm test` +
`node --check js/*.js` → browser smoke with SW cleared → bump SW cache → PR). English only.
One commit per step; tick the box in the same commit.

## Safety net (the rule for every step)
- `tests/physics.test.js` is a **golden-master**: a frozen car trajectory. If a step changes
  it, you changed the feel — stop and confirm it was intentional, never edit the numbers blindly.
- Each new pure module ships with its own unit test in the same commit.
- After each step: `npm test` green + browser smoke (drive a track, console clean, feel unchanged).

## Pure vs orchestrator (what can / can't be unit-tested)
Testable (pure, node-safe — no DOM/canvas/rAF): physics, collision math, nearest-point,
near-miss, finish-crossing, input mapping, scoring (done). The `frame()` loop, listeners,
rAF, DOM/HUD writes stay in `game-engine.js` and ride the **browser smoke test** (repo doctrine).

## Steps

- [x] **0. Golden-master + physics extraction (Opus).** `js/physics.js` `stepCar(...)` (verbatim
      copy of the inline integration) + `tests/physics.test.js` (frozen trajectory). `frame()`
      now calls `stepCar`; returns `{ drifting, speed, vS, fwd, side }`. `fAdj` kept in `frame()`
      for knocked-cone decay. updateCaps moved one line later (post-integration cap sampling —
      sub-pixel, feel-irrelevant). Verified: 73 tests green, browser drift feel unchanged.

Remaining (Sonnet-friendly — each is near-pure, low risk, behind the golden master):

- [ ] **1. `nearestCenterIdx` / `distToTrack`.** Extract the windowed nearest-centerline scan
      (`frame()`'s `distToTrack`, with `NEAR_W`, `nearIdx`) into `js/track-util.js` (or a small
      helper) as a pure function of `(car{x,y}, center[], prevIdx, window)` → `{ dist, idx }`.
      `frame()` keeps the `nearIdx` state and calls it. Test: straight + figure-8 sample points;
      assert it tracks the moving nearest index without jumping across the loop seam.

- [ ] **2. `nearMissCheck` → pure.** Move the geometry (car vs table edge / cones / props
      capsule gaps within `NM_BAND`) into a pure `js/collision.js` function
      `(car, cones, props, TABLE, CONE_R, CR, NM_BAND) → bool`. Test: a prop just inside the
      band → true; well clear → false; below the speed gate → false.

- [ ] **3. Finish-line crossing → pure.** Extract the sign-flip detector
      (`prevFinishDot < 0 && fDot >= 0` about the start axis) into a pure
      `crossedFinish(prevDot, dot)` (+ a `finishDot(car, c0, cos, sin)` helper). `frame()` keeps
      `prevFinishDot` state. Test: approaching (neg→pos) crosses once; receding does not; exact-0 handled.

- [ ] **4. Input mapping → pure.** `updatePointerSteer`'s pointer-sum → sign, and the
      keyboard `kSteer` resolution, into a pure `resolveSteer(pointers, keys, W) → -1|0|1`.
      Test: left-half pointer → -1; both halves → 0; ArrowRight overrides; etc.

- [ ] **5. Wall + prop collision response → `js/collision.js` (CAREFUL — feel-critical).**
      Extract the rect/round wall capsule pushback and the prop nearest-point pushback into pure
      functions that take + return car kinematics (no mutation of singletons inside the pure fn;
      `frame()` applies the result). This one CAN change feel — add a golden-master like
      physics: freeze a car-into-wall and car-into-prop response trajectory BEFORE refactoring,
      assert identical after. Opus or careful Sonnet.

- [ ] **6. Knocked-cone update → pure.** The per-cone motion + cone-vs-prop pushback
      (`frame()`'s knocked branch) into `js/collision.js`. Deterministic except the initial
      random spin in `hitConeAt` — test the update step with a seeded/!fixed spin.

- [ ] **7. Lap / scoring bookkeeping pass.** After 1–6, `frame()` should be mostly: read input
      → `stepCar` → collision helpers → scoring (already pure in `scoring.js`) → draw. Tidy the
      remainder; ensure `game-engine.js` is a readable orchestrator. No new behavior.

## Definition of done
- [ ] `frame()` is a thin orchestrator; pure cores live in `physics.js` / `collision.js` /
      `track-util.js` with unit tests.
- [ ] `npm test` green (incl. all golden masters); `node --check js/*.js` clean.
- [ ] Browser smoke on ≥2 tracks: drift feel, collisions, caps, laps, results — all unchanged,
      console clean.
- [ ] AGENTS.md updated (new modules + dependency order); SW cache bumped; PR opened.
