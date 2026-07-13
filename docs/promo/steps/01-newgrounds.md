# Step 01 — Newgrounds

**Status:** not started · **Wave 1**
**When:** as soon as Step 00 assets exist. No SDK, no code changes — fastest new
platform win. Effort: one promoter session.
**Who:** promoter agent (draft + form fill) + owner (account, approve, submit).

## Goal

Live game page on newgrounds.com; survive the judgement phase; aim for a frontpage
feature (editorially curated — quality + novelty of the tabletop theme is the pitch).

## Prerequisites

- Step 00: GIF + cover. Screenshots: ✅ `docs/promo/screenshots/`.
- A build zip (see below). Owner has/creates a Newgrounds account.

## How

1. **Build the upload zip** — `npm run build -- --platform=portal --zip` →
   `dist-portal/` + `dist-portal.zip` with `index.html` at the zip root, SW
   registration and external links stripped, SEO files pruned (uploads are
   served from Newgrounds' CDN in an iframe; a failing/odd SW is noise we
   don't need).
   - Everything else is relative-path static — works as-is in their iframe.
2. **Create the project** (Project System → Games): upload zip, set an embed size
   (1280×720, "fit to screen" enabled — the game is fullscreen-responsive).
3. **Listing package** (promoter drafts, owner approves — per PROMOTER_AGENT.md):
   title, description (lead with kitchen-table drift hook), controls block,
   genre = Racing/Driving, rating **E**, tags (drift, racing, top-down, arcade,
   score-attack), icon/thumbnail from Step 00 assets.
4. **Publish** → new games enter *Under Judgment* (community votes). Nothing to do
   but it explains early vote swings.
5. **Post-launch:** reply to the first comments (owner voice); NG community weighs
   this heavily.

## Gotchas

- Test the zip locally before upload: `cd dist-portal && python3 -m http.server` —
  the build must run from a plain static serve with no SW.
- localStorage works in their iframe but can be partitioned — progress is
  per-platform, that's expected and fine (mention profile export in the description).
- `google*/yandex*` verification files and `sitemap.xml`/`robots.txt` are pruned
  by the portal build automatically — nothing to strip by hand.

## Done when

Page is live, plays clean on desktop + mobile browser, listed in Games → Racing;
link recorded in `docs/promo/LOG.md`.
