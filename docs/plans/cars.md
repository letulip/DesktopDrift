# Plan — New cars (scalable pipeline + garage carousel)

Add new drivable cars (starting with **plum**, 7/7/7) and make adding the next ~7 cheap. Two
parts: a **data/SVG pipeline** so a car = an SVG + a tiny metadata entry, and a **garage
carousel** front-end. Branch: `feat/new-cars`. English only. Workflow per `desktopdrift-pr`.

## Decisions (locked with the owner)
- **Architecture = Variant B**: an author-time generator parses `cars/*.svg` + a registry and
  commits a static `js/cars-data.js`. The game stays **synchronous** (no runtime fetch, no
  async refactor of garage/game/preview). Adding a car = drop SVG + registry entry + run the
  generator.
- **Pricing**: all cars **free** during development. Ownership/tire-gating comes later, before
  prod — do not build it now, but don't design against it (keep car identity keyed by a stable
  `id`).
- **Carousel**: horizontal scroll-snap in the garage (try it, iterate).
- **plum** body `#8e4585`, stroke `#222222`, flip `true`, ratings 7/7/7.

## How a car is defined today
Inline objects in `js/config.js` `CARS[]`: `path` (body silhouette) + `details` ([{c,d}] filled
shapes) + optional `lines` (stroke-only panel paths) + `drive` (physics) + `body`/`stroke`/`vw`/
`vh`/`flip`/`len`. The `for (m of CARS)` loop builds `_p2d`/`_drive` (browser-only Path2D). SVGs
live in `cars/`. Legacy cars (Bismark, Panda) were hand-extracted.

### SVG convention (verified on plum/bismark/panda)
- `<path stroke=... >` with no fill = **body silhouette**. If several stroke paths exist, the
  **longest `d`** is the body, the rest are `lines` (Panda has 2). plum/bismark = 1 stroke path.
- `<path fill=#hex>` (fill ≠ none) = a **detail** → `{ c: fill, d }`.
- `viewBox`/`width`/`height` → `vw`/`vh`. `body`/`stroke`/`flip`/`len`/`ratings` are NOT in the
  SVG — they come from the registry.

## Stat ↔ physics math (single source)
Rating formulas currently live inline in `select.html`. Extract them to a pure `js/car-stats.js`
so display, the generator, and tests share one source:
- `speedRating(d)=round(maxSpeed·GU_TO_KMH/SPEED_MAX_KMH·10)`
- `accRating(d)=round(thrust/THRUST_MAX·10)`
- `handlingRating(d)=round((steer/STEER_MAX·0.7 + lowSpeedTurn/LOWTURN_MAX·0.3)·10)`
- **inverse** `driveForRatings({handling,accel,speed})`: `maxSpeed=round(speed·SPEED_MAX_KMH/
  (GU_TO_KMH·10))`, `thrust=accel·THRUST_MAX/10`, and tie the two handling knobs to the same
  fraction `f=handling/10` → `steer=handling·STEER_MAX/10`, `lowSpeedTurn=handling·LOWTURN_MAX/10`.
  This round-trips exactly (7/7/7 → maxSpeed 457, thrust 630, steer 3.5, lowSpeedTurn 0.35 →
  back to 7/7/7). Feel knobs (steerSmooth/selfAlign/grip/driftSteerBoost) come from CFG or a
  per-car `feel` override; they don't affect the 3 displayed stars.

## Phases

- [x] **C1 — pure stat module** `js/car-stats.js` (ratings + `driveForRatings` + the constants),
      `tests/car-stats.test.js` (round-trip for ratings 1..10; matches select.html's current
      numbers for Bismark/Panda). `select.html` imports its rating fns from here (dedup).

- [x] **C2 — car registry** `js/car-registry.js`: per-car metadata `{ id, name, svg, body,
      stroke?, flip?, len?, ratings:{handling,accel,speed}, feel? }`. Seed with `plum`.

- [x] **C3 — generator** `scripts/gen-cars.js` (Node, zero-dep, regex SVG parse per the
      convention) → writes committed `js/cars-data.js` (`export const GENERATED_CARS = [...]`
      with `drive` computed via `driveForRatings` + `feel`). `npm run gen:cars`. Unit-test the
      pure parse helper (`tests/gen-cars.test.js`): plum SVG → 1 body path + N details, right vw/vh.

- [x] **C4 — wire config** `js/config.js`: `import { GENERATED_CARS }` and
      `export const CARS = [ ...legacyInline, ...GENERATED_CARS ]`. Order preserved so existing
      saved `carIndex` (0/1) is stable; new cars get 2+. Init loop unchanged.

- [x] **C5 — garage carousel** `select.html` + `css/select.css`: `#cars` from wrap-grid to a
      horizontal scroll-snap track. Each car = a centered hero card (big preview + name + spd/hdl/
      acc bars + Modify gear). Snap selects the centered car; dots indicator; Race uses it.
      Keep it keyboard/pointer accessible. (Animated-neon cards keep their rAF loop.)

- [x] **C6 — plum end-to-end**: generate, appears in the carousel with 7/7/7, drives in a race
      (preview + in-race render correct, flip right). Tune `len`/feel if it drives oddly.

- [x] **C7 — docs + SW + PR**: AGENTS.md (car pipeline + "add a car" steps + the SVG
      convention), `sw.js` add ONLY the runtime modules `js/car-stats.js` + `js/cars-data.js`
      and bump the cache — `cars/plum.svg`, `js/car-registry.js` and `scripts/gen-cars.js` are
      author-time only (the path is baked into `cars-data.js`), not fetched at runtime.
      `npm test` + `node --check` + browser smoke. PR.

**Done when:** plum (and any future SVG) becomes a car via SVG + registry entry + `gen:cars`;
the carousel reads well on mobile; ratings display 7/7/7 and round-trip; `npm test` green.

## Sandbox test-drive + car ownership (added after C1–C7)
Owner idea: **Sandbox is a free test-drive of every car, always STOCK** (no tuning) — like a
real dealer test-drive. **Time Attack (races) will require owning the car** (paid, later).
- [x] Sandbox = stock: `sandbox.html` calls `startGame(T, { stock: true })`; the engine then
      applies a factory look (ignores `carLook`). `select.html` in sandbox mode draws stock
      previews, hides the Modify gear, and skips the neon-anim loop (subtitle "Free test drive").
- [x] Ownership hook (gate OFF): `store.ownedCars` + `carOwned(id)` + `grantCar(id)`; the flag
      `economy.CAR_GATING_ENABLED = false` keeps `carOwned()` true for every car. Time Attack's
      Race button calls the gate (always passes now). Every car (incl. legacy) has a stable `id`.
      Flip the flag + populate `ownedCars` on purchase when car pricing ships. Unit-tested.

## Car shop (gate ON)
- **Prices** live in `car-registry.js` (`price:` per car) → generated into `cars-data.js`. Legacy
  Bismark/Panda have no price = free starters (`economy.FREE_CARS`). Paid: Plum 300 · Catana 350 ·
  Bavarian 400 · Stallion 450 · Toretto 550 · Smasher 650.
- **Gate ON** (`CAR_GATING_ENABLED = true`): Sandbox = free test-drive of any car; Time Attack / Zen
  require owning it. `carOwned(id)` = gating-off ‖ free starter ‖ purchased. `store.buyCar(id, price)`
  deducts + `grantCar`.
- **Buy in the carousel** (`select.html`): a locked (paid + unowned) car gets a light overlay + 🔒 +
  price; the main button becomes "🔒 Buy 🛞N" for the centred locked car (dim when unaffordable).
  Buying drops the overlay, flips the button to Race, and fires an achievement toast.
- **Achievements**: `new-wheels` (first car, 25), `three-car-garage` (own 3, 40), hidden `full-garage`
  (own all paid cars, 150). Checks read `ctx.ownedCars` + `content.cars` (paid ids); wired in
  `ach-sync.js` (via pure `cars-data.js`) and the engine. Unit-tested.

## Guardrails
- **Synchronous cars** — no runtime fetch; generated data is committed and imported statically.
- **Legacy untouched** — Bismark/Panda stay inline; the generator only owns new cars.
- **Single stat source** — all rating math in `js/car-stats.js`, unit-tested, no duplication.
- **Stable identity** — cars keyed by `id` (for the future ownership/pricing layer).
- **No deps** — generator uses Node built-ins + regex; runtime stays zero-dep Canvas.
