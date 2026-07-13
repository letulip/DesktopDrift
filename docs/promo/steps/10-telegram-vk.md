# Step 10 — Telegram Mini App + VK

**Status:** not started · **Wave 4 — cheap experiments**
**When:** any time after Wave 1; each is a ~half-day experiment. Telegram first
(cheaper, viral-share mechanics).
**Who:** builder (small) + owner (bot/app registration).

## Goal

Messenger-native distribution in RU/CIS+ — share-to-chat virality that portals
don't have. Low expected volume, near-zero cost, real upside if a chat share
catches.

## Telegram Mini App

1. Owner creates a bot via @BotFather → `/newapp` → Mini App pointing at
   `https://letulip.github.io/DesktopDrift/` (HTTPS ✅, touch-ready ✅ — the
   existing deploy works as-is; no rebuild needed for the MVP).
2. Builder (optional polish, one small change): detect
   `window.Telegram.WebApp` → call `ready()` + `expand()` for fullscreen; that's
   the whole integration. Do NOT build score-sync/cloud storage now (YAGNI).
3. Promoter drafts the bot card copy + a share message template
   (`t.me/<bot>/<appname>` links preview nicely in chats).
4. Seed: owner shares into 2–3 relevant RU gamedev/indie chats (per each chat's
   self-promo rules — promoter checks first).

## VK (VK Mini Apps / VK Play)

1. Verify the current option set at dev.vk.com when starting: HTML5 games run as
   VK Mini Apps (iframe, vk-bridge init required) and/or via the VK Play catalog.
2. Builder: `platform-vk.js` adapter (vk-bridge `VKWebAppInit`) behind the same
   Step 04 seam; strip external links (their moderation dislikes them too).
3. Listing in RU (reuse Step 06 copy), icon/cover per their spec, submit to
   moderation.

## Gotchas

- Telegram webview on iOS throttles differently — smoke the frame rate on a real
  iPhone before seeding shares.
- localStorage inside Telegram/VK webviews is origin-scoped and can be cleared —
  progress is more volatile here; the Settings profile-export is the answer,
  mention it in the card copy.
- VK moderation queues can be slow; batch it with other Wave 4 work.

## Done when

Mini App link opens the game fullscreen in Telegram (iOS + Android smoke) and the
share template exists; VK listing live or explicitly parked — both logged in
`docs/promo/LOG.md`.
