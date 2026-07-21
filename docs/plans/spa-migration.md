# SPA migration — one document, one AudioContext

Status: **parked, window not open yet** (see Trigger below). This plan exists so
the decision and its reasoning survive; do not start it ad hoc.

> **Companion:** `docs/plans/spa-migration-analysis.md` is the code-grounded impact
> map (advantages, a ranked risk register with `file:line`, invariants, open
> questions). Read it before committing to Phase C — it names the re-entrancy
> blockers this plan only gestures at (the `S` singleton reset, cone knocked-state
> leak, `reverseTrack` cones-by-reference, stale `render.js` DOM refs).

## Why (what a single-page app buys)

1. **The audio-activation problem dies as a class.** Today every page is a fresh
   document with a fresh suspended AudioContext; navigation does not carry user
   activation, and desktop Firefox never grants activation for arrow keys at all
   (see the Sound section in AGENTS.md — the #117 fix mitigates, a Space-gate
   covers the rest). In an SPA the first menu click unlocks audio once, for the
   whole session, in every browser. All workarounds become dead code.
2. **Music becomes possible — properly.** Not "music in the menu that restarts
   on every navigation", but a session-long track that crossfades between menu
   and race (one context = one timeline). This is the blocker behind the parked
   "Music / ambience" item in ROADMAP.
3. Instant screen transitions (no white flash in portal iframes), no re-parse of
   shared modules per page.

## The real cost (ranked by danger)

1. **`location.reload()` is currently a correctness guarantee.** "Race Again"
   reloads game.html — the browser cleans up RAF loops, listeners, audio nodes,
   module state for free. An SPA removes that safety net: the engine must be
   perfectly re-entrant, or every leak accumulates across races (worst on
   low-end mobile). The `on()/stop()` listener discipline already exists, but
   reload is the insurance on top of it. This is the phase that needs the most
   care and the most manual playtesting.
2. **Track modules are stateful at module level** (top-level await, SVG parsed
   at import). Browsers cache modules by URL — in one document a second
   `import()` of the same track returns the same instance. All track modules
   must become factory functions (`createTrack()` instead of top-level init).
3. **Inline page logic.** select.html / modify.html / tracks.html carry hundreds
   of lines of inline module scripts — the bulk of the migration is extracting
   them into screen modules. Mechanical, but wide.
4. **CSS collision audit.** 13 per-page stylesheets merge into one document;
   body-level state classes (`.zen` etc.) become screen-switch state.
5. **URLs / SEO churn.** Pages are indexed with canonicals + sitemap; a router
   changes the URL scheme. Low value for a game (traffic comes from portals,
   not search), but `?track=<id>` deep links must keep working.
6. **Memory on low-end mobile.** MPA gives the browser natural GC points
   between screens; the SPA must explicitly dispose track surfaces/offscreen
   canvases on screen exit.

## What makes this EASIER than a typical MPA→SPA rewrite

- The architectural spine already points here: **self-contained components that
  own their DOM, state, and cleanup** (`pause.js`, `confirm-exit.js`,
  `race-results.js`) — that pattern *is* the screen contract.
- `js/store.js` is the single persistence seam — saves are untouched by this
  migration (hard back-compat requirement stays trivially satisfied).
- 317+ unit tests + physics golden-masters guard the feel-critical core.
- No framework needed: a ~50-line hash router + a `mount()/destroy()` screen
  contract in the existing vanilla style. The build pipeline barely changes
  (still pure static files).

## Phases (each lands as its own PR train; a phase is DONE per ROADMAP's
definition of done, plus its gate below)

### Phase A — extract inline page scripts into modules  *(safe, useful regardless)*
Move the logic of select/modify/tracks/zen/settings/achievements into
`js/screens/*.js` modules; pages become thin shells that import them. No
behavior change. **Gate:** every page pixel- and behavior-identical (manual
smoke per page), tests green, no new globals.

### Phase B — shell + router + screen contract  *(menu screens only)*
One `index.html` shell; screens mount/destroy via the component contract; hash
routing with `?track=` deep-link compatibility; game and sandbox stay separate
documents for now. **Gate:** full menu flow works with back button; audio
unlocks once for the whole menu session; SW precache reshaped and update-nudge
still correct; memory stable across 50 screen switches (DevTools heap check).

### Phase C — the game joins the document  *(the dangerous one)*
Remove `location.reload()` restart; engine start/stop becomes fully re-entrant;
track modules become factories; audio is a session singleton (the ad-mute
contract from js/platform.js must hold unchanged); explicit disposal of track
surfaces on exit. **Gate:** 20 consecutive race restarts on a mid phone with
flat heap and stable FPS; all platform-adapter call sites re-verified; feel
unchanged (owner playtest — golden-masters only cover pure physics).

### Rollback criteria
Any phase that can't pass its gate in two fix iterations gets reverted (phases
are independent PRs; A and B deliver standalone value even if C never lands).

## Trigger — when to open this

ALL of: (1) promo Waves 1–2 are live and stable (portal QA must not race a
foundation rewrite); (2) no active portal moderation in flight; (3) the owner
wants music — that's the feature that pays for Phase C. Estimated effort at
builder pace: A ≈ 2–3 sessions, B ≈ 2–4, C ≈ 2–4 + heavy manual playtest;
roughly 1.5–3 weeks end to end, spread out safely.

## Explicitly NOT part of this plan

- Frameworks/bundlers (stays vanilla + current build.js).
- Save-schema changes (store.js untouched).
- The Firefox Space-gate (ships earlier with CrazyGames prep; becomes obsolete
  when Phase C lands — delete it then).
