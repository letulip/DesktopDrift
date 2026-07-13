# Step 09 — Google Play via TWA (Trusted Web Activity)

**Status:** not started · **Wave 4**
**When:** after Wave 2 is live (Play is a separate audience; no rush, but cheap —
the PWA is already store-grade: manifest ✅, SW ✅, offline ✅, icons ✅).
**Who:** builder (packaging + asset links) + owner ($25 account, store listing).

## Goal

Android app on Google Play wrapping the existing PWA — Play's search +
recommendation surface, installable app presence, zero code rewrite.

## How

1. **Package:** PWABuilder (pwabuilder.com — fastest, spits out an AAB) or
   Bubblewrap CLI against `https://letulip.github.io/DesktopDrift/manifest.json`.
   Portrait+landscape allowed, fullscreen display ✅ (already in the manifest).
2. **Digital Asset Links — THE gotcha (see below):** the TWA verifies ownership
   via `https://letulip.github.io/.well-known/assetlinks.json` — that's the
   **domain root**, i.e. a separate `letulip/letulip.github.io` repo, NOT this
   project repo. Create/extend that repo with the assetlinks.json that
   PWABuilder/Bubblewrap generates (package name + SHA-256 of the signing key).
   Without it the app shows a browser URL bar — instant-reject territory.
3. **Play Console:** owner registers ($25 one-time) → create app → upload AAB to
   internal testing first → run it on a real phone (touch steering, offline
   start, haptics).
4. **Store listing** (promoter drafts): title "Desktop Drift", short + full
   description, icon 512 ✅, feature graphic 1024×500 (derive from Step 00
   cover), phone screenshots — the mobile set in `docs/promo/screenshots/` is
   the right aspect; capture 2–3 more if the listing looks thin.
5. **Forms:** content rating questionnaire (Everyone), Data safety = no data
   collected/shared (truth: everything is localStorage-local), ads = none
   (the Play build wraps the GitHub Pages origin — the no-op adapter, NOT a
   portal build).
6. Internal → closed → production rollout.

## Gotchas

- The TWA loads the LIVE site — every GitHub Pages deploy updates the app
  instantly. Powerful, but it means `main` deploy discipline now also covers the
  Play app (nothing new: main is already treated as production).
- Signing key: let Play manage app signing; keep the upload key in the owner's
  password manager. Losing it = losing the listing.
- Digital Asset Links break silently if that root-domain file is ever removed —
  add a note to the `letulip.github.io` repo README.

## Done when

App live on Play, opens fullscreen with no URL bar, offline start works,
listing linked in `docs/promo/LOG.md`.
