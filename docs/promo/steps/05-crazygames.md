# Step 05 — CrazyGames

**Status:** blocked by Step 04 (adapter) · **Wave 2 — the main growth bet**
**When:** adapter + CG SDK done, Step 00 assets ready. Review cycles take days–weeks.
**Who:** builder (SDK build) → promoter agent (submission package) → owner (account,
approve, submit).

## Goal

Full launch on crazygames.com (~35M MAU, non-exclusive, ad rev-share) — the
strongest algorithmic discovery available to us without exclusivity strings.

## Prerequisites

- Step 04 with `platform-crazygames.js`: SDK init, `gameplayStart/Stop`,
  `happytime()` on records, interstitial via `commercialBreak()` on
  restart/next-race. Test with their SDK's QA/dev mode before submitting.
- Build zip from `--platform=crazygames` (SW stripped, external links stripped).
- Fits limits (verified 07.2026): initial download ≤ 50 MB (we're ~1.4 MB ✅),
  ≤ 1,500 files (~185 ✅), PEGI-12 ✅, desktop + mobile playable ✅.
- Step 00: 16:9 cover; screenshots ✅.

## How

1. Owner registers on `developer.crazygames.com` (developer portal — open
   submissions).
2. **Re-verify current requirements** at `docs.crazygames.com` (requirements/intro,
   gameplay, SDK) — promoter does this fresh, per PROMOTER_AGENT.md Workflow A.
3. Promoter prepares the **submission package**: name, slug, category (Racing →
   Drift), description + controls, tags, cover/thumbnail set per their current
   spec, SDK QA checklist self-review (loads fast, no errors, ads fire, mobile
   controls work).
4. Owner approves → submit via the portal → track review feedback in the portal;
   fix-and-resubmit loops go back through the builder if code is involved.
5. After **Basic Launch**: watch their dashboard metrics (plays, playtime, rating).
   CrazyGames promotes games that retain — a strong first week matters; time the
   submission so owner can respond to feedback quickly.

## Gotchas

- Ad breaks mid-race would tank retention and their QA flags jarring placement —
  only on restart/next-race/menu transitions (already the Step 04 contract).
- Their QA tests mobile aggressively; the split-touch steering hint must be
  visible on first mobile run (it is — `#hint`).
- Name/branding must be original (✅ ours) — no "FNAF/Mario"-style keyword bait.
- Payout: monthly, €100 minimum threshold, rolls over.

## Done when

Game live on CrazyGames; SDK events visible in their dashboard; first payout
threshold tracking started; link + metrics baseline in `docs/promo/LOG.md`.
