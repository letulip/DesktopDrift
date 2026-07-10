# Plan — Neon FX (6-zone customisable underglow)

ROADMAP Phase 2 "Cosmetic mods" follow-up. Turns the single-colour neon underglow into a
6-zone, multi-colour, optionally-animated cosmetic — sold in the shop as a records-safe tire
sink (see `docs/plans/economy.md`: achievements left a large tire surplus that needs sinks).

Workflow per `desktopdrift-pr` (branch → `npm test` + `node --check js/*.js` → SW-clear
browser smoke → bump SW cache → PR). English only. One commit per phase; tick the box in the
same commit.

---

## What we're building

Today: neon is a single `_carNeon` hex, drawn as **3 longitudinal rects** (nose / middle /
tail) with one `shadowBlur` pass per frame (`render.js` ~L598). Free, chosen from a 10-colour
`NEON_PALETTE`.

Target: the glow is split into **6 perimeter zones** —
`front-left, front-right, right-side, rear-right, rear-left, left-side` (clockwise) — driven by
a **config** the player customises + buys upgrades for:

- **Layout** — how many distinct colours and how they map to the 6 zones:
  `solid` (1, default) · `longitudinal` (2: left/right sides) · `front-mid-rear` (3) ·
  `per-zone` (6).
- **Animation** — `none` (default) · `pulse` (glow breathes) · `rainbow` (hue cycles around
  the ring) · `flow` (the chosen colours chase around the ring).
- **Colours** — 1–6 hex values (as many as the layout uses) + an animation `speed`.

Layouts and animations are **separate shop items**, freely combinable (e.g. `per-zone` +
`flow`). Solid + none stays free (today's behaviour).

### Records-safe
Pure cosmetic — no PPS / handling effect. Fits the economy guardrails (never sell power).

---

## Architecture — a pure resolver at the core

The heart is a **pure** function that turns the config + a time value into the 6 zone colours
(and per-zone glow intensity), so both the game render and the garage preview share one source
of truth and the whole thing is unit-testable with no canvas:

```
// js/neon.js  (pure — no DOM, no state)
zoneColors(neon, t) -> [{ color, blur, alpha } × 6]   // t = seconds; ordered clockwise
```

- **Layout** maps the `colors` array onto the 6 zones (e.g. `longitudinal` → left 3 zones =
  colour A, right 3 = colour B; `front-mid-rear` → front pair / sides / rear pair).
- **Animation** modulates the result from `t`:
  - `pulse` → a shared 0..1 breathe on blur/alpha.
  - `rainbow` → hue offset per zone + `t*speed` (full spectrum, ignores `colors`).
  - `flow` → rotate the mapped colours around the ring by `t*speed` (blend between them).
- `none`/`solid` → the static mapping.

`render.js` and `car-preview.js` just call `zoneColors(neon, t)` and draw 6 glows; all the
logic (and its tests) live in `js/neon.js`.

### The 6 zones (clockwise, for the flow/rainbow ring order)
`0 front-left · 1 front-right · 2 right-side · 3 rear-right · 4 rear-left · 5 left-side`.
Geometry (positions/radii relative to the car body) lives in `render.js` (it's draw-space);
`neon.js` only deals with the colour per zone index.

---

## Store schema (additive — no migration break)

`carLook(idx)` gains a `neon` object; the old `neonColor` is folded into it:

```
neon: { layout: 'solid', anim: 'none', colors: ['#39FF14'], speed: 1 }
```

- Deep-merge fills the default `neon` for old saves. A pre-existing `neonColor` migrates to
  `neon.colors[0]` + `layout:'solid'` (VERSION bump + MIGRATIONS entry — the reshape a merge
  can't express). Keep reading `neonColor` as a fallback so nothing is lost.
- `owned` gains the neon-fx item ids (layouts + animations) — account-wide like other cosmetics.

---

## Shop + economy (new "Neon FX" tab)

`js/shop-catalog.js` gains a `kind: 'neon-layout'` and `kind: 'neon-anim'` family. Prices
(tune by feel; records-safe; drains the tire surplus):

| Item | kind | price 🛞 |
|---|---|---|
| Longitudinal (2 colours) | neon-layout | 80 |
| Front / Mid / Rear (3) | neon-layout | 110 |
| Per-zone (6 colours) | neon-layout | 150 |
| Pulse | neon-anim | 120 |
| Rainbow | neon-anim | 150 |
| Circular Flow | neon-anim | 250 |

Solid + none are free (owned implicitly). `well-rounded` achievement already keys off distinct
shop `kind`s — adding two new kinds is fine (it just means "one purchase per section").

---

## Performance — the real risk (mobile), gated before ship

6 zones in distinct colours = up to **6 `shadowBlur` passes** per frame per car (a Gaussian
blur each). One car, but `shadowBlur` is the expensive primitive (see the `render.js` comment
at ~L505 and the `perf/mobile-fps-investigation` history).

Mitigations, applied in order:
1. **Batch by colour** — zones sharing a colour draw in one pass (solid = 1 pass; longitudinal
   = 2; static per-zone with repeats = fewer). Only `per-zone` with 6 *different* colours, or
   any animation (colours differ per frame), hits the full 6.
2. **Bounded blur** — a single tuned blur radius; no per-zone blur stacking.
3. If mobile still drops frames: cache the glow shape to an offscreen sprite and recolour/
   rotate it, or reduce the in-race blur radius vs the garage preview.

**Decision (default):** animations run in **both** the garage preview **and** the race. N7 is a
hard mobile-FPS gate — if `per-zone + anim` drops below target on a mid-range phone, we throttle
the in-race animation (lower tick rate) or cap in-race layouts, keeping the garage preview full.
This keeps the "wow" where the player shops and protects race FPS.

---

## Phases

- [x] **N1 — pure neon resolver** `[opus]`
      `js/neon.js`: `zoneColors(neon, t)` + layout mapping + animation math (`pulse`/`rainbow`/
      `flow`) + the `LAYOUTS` / `ANIMS` descriptors (id, label, colour-count). Pure, no DOM.
      Heavy unit tests: each layout maps the right colours to the 6 zone indices; `none` is
      static; `flow` rotates the mapping over `t` (colour at a zone changes as `t` advances and
      returns after a full cycle); `pulse` modulates blur/alpha in `[min,max]`; `rainbow`
      spreads hue around the ring; out-of-range/short `colors` arrays are handled safely.

- [x] **N2 — store schema** `[sonnet-high]`
      `carLook` default gains `neon: { layout:'solid', anim:'none', colors:[<current default>],
      speed:1 }`. VERSION bump + `MIGRATIONS[n]`: fold an existing `neonColor` into
      `neon.colors[0]` (+ keep a read fallback). `owned` unchanged in shape. Tests: default
      shape, migration from a `neonColor` save, deep-merge fills `neon` on a save that lacks it.

- [x] **N3 — render engine (6 zones + animator)** `[opus]`
      Rework the `render.js` neon block: define the 6 perimeter zone geometries; each frame call
      `zoneColors(equippedNeon, now)` and draw the glows, **batching same-colour zones into one
      `shadowBlur` pass**. Feed a per-session time value (reuse `S.physT` or a render clock).
      Keep the drop-shadow suppression. No behavioural change for a `solid/none` config (1 pass,
      looks like today). Browser smoke on ≥1 track.

- [x] **N4 — shop catalog + economy** `[sonnet-high]`
      `js/shop-catalog.js`: `neon-layout` + `neon-anim` items with the prices above. Confirm
      `buy`/`purchase` + `well-rounded` handle the new kinds. Update `docs/plans/economy.md`
      (new sink). Unit-test the catalog additions (ids unique, kinds present).

- [ ] **N5 — garage Neon FX panel** `[opus]`
      `modify.html`: a new "Neon FX" tab. Layout picker (locked until owned), per-zone colour
      pickers (as many as the layout uses, drawing from `NEON_PALETTE`), animation toggle
      (locked until owned) + speed. Writes `neon` into `carLook` on Apply; cart/buy for the
      layout/anim items (reuse the existing purchase + `syncStateAchievements` flow). Live
      preview updates as you pick.

- [x] **N6 — animated garage preview** `[sonnet-high]`
      `car-preview.js` (`drawCarPreview`) shares `zoneColors(neon, t)` and runs an rAF loop so
      the garage shows the live glow (pulse/rainbow/flow) exactly as in-race. Reuse N3's draw
      helper so there's one glow renderer.

- [ ] **N7 — mobile performance gate** `[opus]`
      Measure FPS with the heaviest config (`per-zone` + `flow`) on a throttled viewport / mobile
      profile. Confirm the colour-batching keeps `solid`/static cheap. If in-race drops below
      target, apply the fallback (throttle in-race animation tick / cap layout / cache-sprite)
      and document the decision. Log what was measured.

- [ ] **N8 — docs + SW + PR** `[sonnet-high]`
      `sw.js` bump + add `js/neon.js` to `ASSETS`. AGENTS.md (neon resolver + 6-zone model +
      store `neon` config + shop kinds + the perf decision), ROADMAP (Cosmetic mods → liveries
      still to come; neon FX done), economy.md sink note. Tick N1–N8; PR.

**Phase done when:** every layout+anim combo resolves correctly (unit-tested), the config
persists + migrates, the 6-zone glow renders in-race and in the garage preview (animated),
shop purchase gates the upgrades, mobile FPS holds at the target, `npm test` green, browser
smoke clean.

---

## Guardrails
- **Records-safe** — cosmetic only; never touches PPS/handling.
- **Pure resolver** — all layout/animation logic in `js/neon.js`, unit-tested without a canvas;
  render/preview are dumb consumers.
- **No dependencies** — vanilla Canvas 2D as today.
- **Additive schema** — one VERSION bump for the `neonColor → neon` reshape; no data loss.
- **Perf is a gate, not an afterthought** — N7 blocks ship if mobile FPS regresses.
- **Agent tags** — pure resolver + render + garage UX → `opus`; store/catalog/preview/docs
  plumbing → `sonnet-high`. Reviewer agent before the PR.
