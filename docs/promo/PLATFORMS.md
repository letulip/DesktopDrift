# Desktop Drift — Distribution Plan (staged)

Goal: platforms that **actively surface games to players** (algorithmic feeds,
"new games" sections, recommendation engines) come first. itch.io is already live
but has weak algorithmic discovery for browser games — it stays as the indie home
page, not the growth engine.

Status legend: 🟢 live · 🟡 ready to submit · 🔴 blocked (needs prep work)

---

## Stage 1 — Algorithmic web portals (the growth engine)

### 1. CrazyGames — 🔴 first priority
- **Why first:** ~35M MAU, open submissions via [developer portal](https://developer.crazygames.com/),
  **non-exclusive**, strong driving/racing category, real recommendation engine +
  "new games" feed. Ad revenue share via their SDK, monthly payout from €100.
- **Requirements** ([docs](https://docs.crazygames.com/requirements/intro/)):
  SDK integration, initial download ≤ 50 MB (we're 1.4 MB ✅), ≤ 1,500 files
  (we're 185 ✅), PEGI-12 content (✅), playable desktop + mobile (✅),
  original name/assets (✅).
- **Blockers:** CrazyGames SDK integration (init, ad breaks, happytime events) —
  builder task; screenshot/cover set.

### 2. Yandex Games — 🔴 parallel with #1
- **Why:** huge algorithmic catalog (RU + CIS + growing intl), open submission,
  moderation 3–5 working days, non-exclusive. Ad rev-share via their SDK.
- **Requirements** ([dev docs](https://yandex.ru/dev/games/doc/ru/concepts/requirements)):
  Yandex Games SDK mandatory; **no external links or purchases** (strip
  `donate.html`, YouTube/GitHub links in this build); fullscreen on mobile;
  likely needs **Russian UI strings** for the RU catalog — verify during
  submission, plan an i18n pass.
- **Blockers:** Yandex SDK integration; per-platform build flag that strips
  external links; possible RU localization.

### 3. Poki — ⏸ deliberate decision point, not a quick win
- **Why careful:** ~60M MAU and hand-curated promotion — the biggest prize —
  but the default deal is **web-exclusive for 5 years**
  ([deal types](https://sdk.poki.com/deals)): on the open web the game may then
  live *only* on Poki (Steam/mobile stores excluded from the clause). That kills
  the multi-portal strategy above. A non-exclusive flat-fee option exists.
- **Strategy:** submit only after CrazyGames/Yandex produce metrics; if Poki
  bites, decide exclusivity vs. flat fee with real numbers in hand. Submission
  itself is free and non-binding.

## Stage 2 — Aggregator networks (one integration → many sites)

### 4. GameDistribution
- Aggregator feeding 2,000+ publisher sites; one SDK integration syndicates the
  game across the long tail of game portals. Rev share. Do after CrazyGames —
  reuse the platform-adapter layer.

### 5. GamePix
- Same model, smaller; cheap to add once the adapter exists.

## Stage 3 — Community / indie platforms (social discovery, credibility)

### 6. Newgrounds
- Direct HTML5 upload, frontpage curation, ratings/awards, real indie community.
  No SDK needed — fastest actual "new platform" win; do it while SDK work is in
  progress.

### 7. GameJolt
- Feed-based discovery, devlogs on-platform, followers. HTML5 upload, no SDK.

### 8. itch.io — 🟢 live, needs optimization
- Add a GIF cover (biggest CTR lever), full tag set, devlog posts (each bumps
  visibility), and enter web-game jams — jams are itch's main discovery event.

## Stage 4 — Ecosystems & wrappers

### 9. Google Play via TWA — the PWA is already store-ready
- PWABuilder/Bubblewrap wraps the existing PWA into an Android app.
  Play has real algorithmic discovery; one-time $25 fee. Good mid-term step.

### 10. VK Play / VK Mini Apps, Telegram Web Apps
- RU/CIS + viral messenger distribution. Telegram game-in-webview is a cheap
  experiment (the game is 1.4 MB and touch-ready).

### 11. Steam — defer
- Needs a desktop wrapper (Tauri/Electron), $100 fee, and wishlist-driven
  marketing. Revisit when content depth grows (tuning, ghost car, more tracks).

---

## Marketing channels (not stores — the promoter agent works these)

- **Reddit:** r/WebGames, r/playmygame, r/IndieGaming, r/incremental-adjacent
  casual subs. Follow each sub's self-promo rules strictly.
- **X/Twitter:** #screenshotsaturday weekly GIF; build-in-public thread.
- **DTF (RU):** indie section — longform "made a drift game with no engine" posts
  perform well there.
- **YouTube:** the existing devlog + Shorts pipeline (see SHORTS_PIPELINE.md).

## Prep work (builder tasks, ordered)

1. **Platform adapter layer** — one small module (`js/platform.js`): init hook,
   ad-break hooks (natural spots: race finish / restart), mute/pause during ads,
   no-op default for the GitHub Pages build. Each portal SDK becomes a thin
   adapter behind it.
2. **Per-platform build flag** in `scripts/build.js` — inject the right SDK
   adapter; strip external links (donate/YouTube/GitHub) for Yandex.
3. **Capture kit** — screenshots ✅ (`docs/promo/screenshots/`, captured via
   `tools/capture/capture.js`). Still missing: a 10–20 s gameplay GIF and 16:9
   cover art; 512×512 icon exists ✅.
4. *(Later, if Yandex requires it)* minimal i18n layer for RU strings.

## Rollout order (summary)

| Wave | Platforms | Needs |
|---|---|---|
| 1 | Newgrounds, GameJolt, itch.io optimization | capture kit only |
| 2 | CrazyGames, Yandex Games | adapter layer + SDKs + capture kit |
| 3 | GameDistribution, GamePix | reuse adapter |
| 4 | Poki (decision), Google Play TWA, Telegram | metrics from waves 1–3 |
