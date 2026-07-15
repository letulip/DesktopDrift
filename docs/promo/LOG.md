# Desktop Drift — promotion log

Newest entries first. One entry per platform submission / campaign action.
Format defined in `PROMOTER_AGENT.md` → Session log.

---

## 2026-07-15 — Game Jolt (Wave 1, playbook steps/02)

- **Status: LIVE.**
- Page: https://gamejolt.com/games/desktop-drift/1084155
- Build: same `dist-portal.zip` as Newgrounds (portal preset, index.html at zip
  root), main @ v218. Embed set to **1280×720** (the NG lesson — never leave the
  frame size blank, or short-frame clipping hides the Race! button).
- Listing: slug `desktop-drift` · dev stage Early Access · genre Racing · maturity
  Everyone · thumbnail `ddd-thumb-ready.png` (landscape) · same description/tags
  as NG · package (build) description was a separate ≤750-char field.
- **Version anchor set here: `0.9.0`** (first versioned build; Early Access → 0.x
  until the roadmap's headline features land = 1.0.0). Use the same number across
  all platforms + future updates. TODO: record it in package.json (no `version`
  field exists yet) so builds stay in sync.
- Game Jolt option noted: "Add to partner system" = referral rev-share, inert for
  a free game, non-exclusive, harmless — owner's call.
- **Next:** itch.io optimization (steps/03 — GIF cover + tags + devlog twins on
  the already-live page); optional devlog cross-posts to seed the GJ feed.

## 2026-07-15 — Newgrounds (Wave 1, playbook steps/01)

- **Status: PUBLISHED — Under Judgment.**
- Live page: https://www.newgrounds.com/portal/view/1042009
- Author profile: https://letulip.newgrounds.com/
- Build uploaded: `dist-portal.zip` (portal preset, no service worker, index.html
  at zip root), from main @ v218.
- Listing: Genre = Sports - Racing · Rating = E (all descriptors None) ·
  Icon = `ddd-thumb-ready.png` (16:9 landscape — NG game thumbnails are landscape,
  not square) · Embed 1280×720 · flags: Touchscreen friendly + Allow Embedding only ·
  tags: drift, drifting, racing, driving, car, top-down, arcade, score-attack,
  browser, singleplayer.
- **Gotcha learned (fold into steps/01):** NG's default embed frame is a tiny
  **980×505** if Embed Width/Height is left blank. The game's HTML-UI pages use
  `overflow:hidden` globally, so at that height the menu logo clips and the garage
  **Race! button is pushed off-screen → unplayable**. Fix = set Embed to 1280×720
  explicitly (the canvas race pages are fine at any size). Underlying short-viewport
  bug is latent and will recur on CrazyGames' shorter frames — parked fix on branch
  `fix/short-viewport-scroll` (land before Wave 2 / CrazyGames).
- **Next actions:**
  - Owner: optional News Post (draft prepared) after publish; reply to first
    comments in own voice (first 48h of Judgment weigh community response).
  - Promoter: Game Jolt next (playbook steps/02) — same `dist-portal.zip`, same
    assets, no SDK.
