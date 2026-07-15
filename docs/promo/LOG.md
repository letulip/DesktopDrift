# Desktop Drift — promotion log

Newest entries first. One entry per platform submission / campaign action.
Format defined in `PROMOTER_AGENT.md` → Session log.

---

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
