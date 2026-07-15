# Step 07 — Aggregators: GameDistribution + GamePix

**Status:** blocked by Step 04 · **Wave 3**
**When:** after CrazyGames + Yandex are live and stable (reuse the adapter seam;
marginal cost per aggregator is one thin adapter + one submission).
**Who:** builder (2 small adapters) → promoter (submissions) → owner (accounts).

## Goal

Syndication across the long tail: GameDistribution feeds 2,000+ publisher sites,
GamePix a similar network. Individually small, together a steady baseline of
plays and ad revenue — with zero per-site effort.

## Why after Wave 2

- Same integration seam (Step 04), so the work is cheap — but the *audience
  quality* is lower than CG/Yandex. Do the high-leverage portals first, then
  syndicate.
- Also: some aggregator publishers re-upload games to portals themselves.
  Having the official CrazyGames/Yandex listings live FIRST establishes
  provenance.

## How

1. **GameDistribution:** developer account at their portal → builder writes
   `platform-gd.js` (their SDK: ad events + a loader callback) → upload the
   `--platform=gd` zip → listing package (title/desc/tags/cover 16:9 + 512×512)
   → submit. Their moderation is light; games go live to the publisher network
   via their iframe embed.
2. **GamePix:** same shape — account, `platform-gamepix.js`, zip, listing, submit.
3. Promoter records both dashboards in LOG.md and adds them to the monthly
   metrics check.

## Gotchas

- Revenue per play is materially lower than CG/Yandex — don't judge the game by
  aggregator numbers; they're bonus reach.
- Some aggregator embeds sitelock or wrap the game — verify our menu → game flow
  works inside their test embed before approving the listing.
- Keep the same version everywhere: add both to the release checklist (rebuild
  zips on notable releases; they accept updates through the same dashboards).

## Done when

Both networks serving the game; dashboards linked in LOG.md; release checklist
updated with the two rebuild targets.
