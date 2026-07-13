# Step 06 — Yandex Games (Яндекс Игры)

**Status:** blocked by Step 04 (adapter) · **Wave 2 — parallel with Step 05**
**When:** adapter + Yandex SDK done. Moderation: 3–5 working days per attempt.
**Who:** builder (SDK build, RU strings if needed) → promoter (package, RU copy) →
owner (Yandex account, submit).

## Goal

Live in the Yandex Games catalog — huge algorithmic distribution across RU/CIS
(and growing international), non-exclusive, ad rev-share. Complements CrazyGames
geographically.

## Prerequisites

- Step 04 with `platform-yandex.js`: mandatory SDK (`ysdk` init +
  `LoadingAPI.ready()` when the menu is interactive), fullscreen `adv` at the
  `commercialBreak()` points, sound muted during ads.
- **External links stripped is MANDATORY** (donate, YouTube, GitHub) — moderation
  rejects them; the Step 04 build flag handles it.
- No purchases outside their SDK — we have none ✅. No microtransactions ✅.
- Mobile fullscreen during gameplay ✅ (PWA viewport already does this).
- **Language:** verify the current rule in their console at submission — the RU
  catalog very likely requires Russian UI strings. The game is EN-only
  (`rules.md`: code is English — but *player-facing strings* can be localized).
  If required → builder task: minimal string table (menu labels, hint, results
  screen — ~30 strings), language picked from `ysdk.environment.i18n.lang`.
  Budget this BEFORE submitting, not as a rejection surprise.
- Assets: icon 512×512 ✅, cover + screenshots per their console spec (Step 00).

## How

1. Owner registers in the Yandex Games developer console
   (`yandex.ru/dev/games/` → console; the account can be the existing Yandex ID).
2. Promoter re-verifies current requirements
   (`yandex.ru/dev/games/doc/ru/concepts/requirements` + `criteria`) and drafts
   the **RU listing package**: название, короткое + полное описание, категория
   (Гонки/Аркады), теги, возрастной рейтинг, скриншоты/обложка.
3. Create the game draft in the console → upload the `--platform=yandex` zip →
   fill the listing → self-check against their moderation criteria page →
   owner approves → submit.
4. Moderation loop (3–5 раб. дней): fix → resubmit; code fixes go through the
   builder.
5. Post-launch: their dashboard metrics; Yandex's algorithm rewards session time
   and return visits — same retention logic as CrazyGames.

## Gotchas

- The draft can be tested on their sandbox domain before moderation — always do
  a full smoke there (SDK init succeeds only inside their iframe environment;
  the adapter must no-op gracefully when `ysdk` is absent so local dev still works).
- Saves: start with localStorage (works); their cloud-save API
  (`getPlayer().setData`) is a later nice-to-have — the `store.js` schema is
  sync-ready by design, don't build it now (YAGNI).
- The GitHub Pages / itch versions stay up — Yandex does not demand exclusivity.

## Done when

Live in the catalog; SDK ads firing; RU listing reads native (not machine-translated);
link + baseline metrics in `docs/promo/LOG.md`.
