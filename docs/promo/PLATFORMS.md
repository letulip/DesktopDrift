# Desktop Drift — Distribution Plan (staged)

Goal: platforms that **actively surface games to players** (algorithmic feeds,
"new games" sections, recommendation engines) come first. itch.io is already live
but has weak algorithmic discovery for browser games — it stays as the indie home
page, not the growth engine.

**Every step has an executable playbook in [`steps/`](steps/)** — what, how, when,
and who (owner / promoter agent / builder). This document is the map; the playbooks
are the instructions. Start from the [rollout table](#rollout-order--playbook-index)
at the bottom.

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
- **Playbook:** [steps/05-crazygames.md](steps/05-crazygames.md)

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
- **Playbook:** [steps/06-yandex-games.md](steps/06-yandex-games.md)

### 3. Poki — ⏸ deliberate decision point, not a quick win
- **Why careful:** ~60M MAU and hand-curated promotion — the biggest prize —
  but the default deal is **web-exclusive for 5 years**
  ([deal types](https://sdk.poki.com/deals)): on the open web the game may then
  live *only* on Poki (Steam/mobile stores excluded from the clause). That kills
  the multi-portal strategy above. A non-exclusive flat-fee option exists.
- **Strategy:** submit only after CrazyGames/Yandex produce metrics; if Poki
  bites, decide exclusivity vs. flat fee with real numbers in hand. Submission
  itself is free and non-binding.
- **Playbook:** [steps/08-poki-decision.md](steps/08-poki-decision.md)

## Stage 2 — Aggregator networks (one integration → many sites)

### 4. GameDistribution
- Aggregator feeding 2,000+ publisher sites; one SDK integration syndicates the
  game across the long tail of game portals. Rev share. Do after CrazyGames —
  reuse the platform-adapter layer.
- **Playbook:** [steps/07-aggregators-gd-gamepix.md](steps/07-aggregators-gd-gamepix.md)

### 5. GamePix
- Same model, smaller; cheap to add once the adapter exists.
- **Playbook:** same as #4 — [steps/07-aggregators-gd-gamepix.md](steps/07-aggregators-gd-gamepix.md)

## Stage 3 — Community / indie platforms (social discovery, credibility)

### 6. Newgrounds
- Direct HTML5 upload, frontpage curation, ratings/awards, real indie community.
  No SDK needed — fastest actual "new platform" win; do it while SDK work is in
  progress.
- **Playbook:** [steps/01-newgrounds.md](steps/01-newgrounds.md)

### 7. GameJolt
- Feed-based discovery, devlogs on-platform, followers. HTML5 upload, no SDK.
- **Playbook:** [steps/02-gamejolt.md](steps/02-gamejolt.md)

### 8. itch.io — 🟢 live, needs optimization
- Add a GIF cover (biggest CTR lever), full tag set, devlog posts (each bumps
  visibility), and enter web-game jams — jams are itch's main discovery event.
- **Playbook:** [steps/03-itchio-optimization.md](steps/03-itchio-optimization.md)

## Stage 4 — Ecosystems & wrappers

### 9. Google Play via TWA — the PWA is already store-ready
- PWABuilder/Bubblewrap wraps the existing PWA into an Android app.
  Play has real algorithmic discovery; one-time $25 fee. Good mid-term step.
- **Playbook:** [steps/09-google-play-twa.md](steps/09-google-play-twa.md)

### 10. VK Play / VK Mini Apps, Telegram Web Apps
- RU/CIS + viral messenger distribution. Telegram game-in-webview is a cheap
  experiment (the game is 1.4 MB and touch-ready).
- **Playbook:** [steps/10-telegram-vk.md](steps/10-telegram-vk.md)

### 11. Steam — defer
- Needs a desktop wrapper (Tauri/Electron), $100 fee, and wishlist-driven
  marketing. Revisit when content depth grows (tuning, ghost car, more tracks).
- **Playbook (decision record + revisit triggers):** [steps/11-steam-deferred.md](steps/11-steam-deferred.md)

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
   adapter behind it. → [steps/04-platform-adapter.md](steps/04-platform-adapter.md)
2. **Per-platform build flag** in `scripts/build.js` — inject the right SDK
   adapter; strip external links (donate/YouTube/GitHub) for Yandex.
   → same playbook: [steps/04-platform-adapter.md](steps/04-platform-adapter.md)
3. **Capture kit** — ✅ DONE: screenshots (`docs/promo/screenshots/`), gameplay
   GIF + video master + 16:9 cover art (`docs/promo/assets/`); tooling in
   `tools/capture/`. → [steps/00-capture-gif-cover.md](steps/00-capture-gif-cover.md)
4. *(Later, if Yandex requires it)* minimal i18n layer for RU strings —
   scoped inside [steps/06-yandex-games.md](steps/06-yandex-games.md).

## Rollout order + playbook index

Work top to bottom; a wave starts when its "When" trigger fires, not before.

| # | Step (playbook) | Wave | When (trigger) | Who leads |
|---|---|---|---|---|
| 00 | [GIF + cover art](steps/00-capture-gif-cover.md) | prep | **now** — blocks everything | builder |
| 01 | [Newgrounds](steps/01-newgrounds.md) | 1 | Step 00 done | promoter |
| 02 | [GameJolt](steps/02-gamejolt.md) | 1 | with/after Step 01 (same zip) | promoter |
| 03 | [itch.io optimization](steps/03-itchio-optimization.md) | 1 | Step 00 done | owner + promoter |
| 04 | [Platform adapter + build flag](steps/04-platform-adapter.md) | prep | parallel with Wave 1 | builder |
| 05 | [CrazyGames](steps/05-crazygames.md) | 2 | Step 04 + CG adapter done | builder → promoter |
| 06 | [Yandex Games](steps/06-yandex-games.md) | 2 | Step 04 + YG adapter done | builder → promoter |
| 07 | [GameDistribution + GamePix](steps/07-aggregators-gd-gamepix.md) | 3 | Wave 2 live and stable | builder → promoter |
| 08 | [Poki decision](steps/08-poki-decision.md) | 4 | 4–8 weeks of Wave 2 metrics | owner |
| 09 | [Google Play TWA](steps/09-google-play-twa.md) | 4 | after Wave 2 (independent) | builder + owner |
| 10 | [Telegram + VK](steps/10-telegram-vk.md) | 4 | any time after Wave 1 | owner + builder |
| 11 | [Steam](steps/11-steam-deferred.md) | — | parked; triggers in the playbook | owner |
