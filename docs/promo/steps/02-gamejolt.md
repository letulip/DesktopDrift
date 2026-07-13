# Step 02 — Game Jolt

**Status:** not started · **Wave 1**
**When:** same session or right after Newgrounds (Step 01) — the same zip works.
**Who:** promoter agent + owner.

## Goal

Live page on gamejolt.com with the devlog cross-posted there — Game Jolt's
discovery is feed-based (followers see every post), so the page is also a
distribution channel for devlog updates, not just a listing.

## Prerequisites

- Step 01's build zip (identical: `dist/` contents, SW registration stripped,
  `index.html` at zip root).
- Step 00 assets: thumbnail (2:1 ~1000×500 works), header, screenshots ✅.

## How

1. Owner creates the account/game page (game URL slug: `desktop-drift`).
2. **Upload** the zip as a *Web build* (HTML); set viewport 1280×720 + fullscreen
   allowed; mark mobile-compatible.
3. **Listing package** (promoter drafts → owner approves): description with the
   tabletop hook + controls; genre Arcade/Racing; tags; maturity rating (Everyone);
   thumbnail + header + screenshots.
4. **Devlog seeding:** repost 2–3 best past updates (from the YouTube devlog
   backlog) as first posts so the page isn't empty, then include Game Jolt in the
   regular devlog cadence (see SHORTS_PIPELINE.md §3 — same copy, one more paste).
5. Publish; record the link in `docs/promo/LOG.md`.

## Gotchas

- Same iframe/localStorage notes as Newgrounds (Step 01 Gotchas).
- Game Jolt shows ads around free games by default — that's their default rev
  model; no SDK work needed.

## Done when

Page live + first devlog post published; link in LOG.md; Game Jolt added to the
devlog posting checklist.
