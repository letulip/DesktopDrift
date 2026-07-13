# Desktop Drift — YouTube Shorts Pipeline (semi-automated)

Problem: the devlog has a backlog of shipped features to show, and manual video
production is the bottleneck. Solution: **you only play and approve; everything
else is scripted.**

## The pipeline at a glance

```
[1. Capture]          [2. Cut]                [3. Copy]              [4. Upload]
you play, hotkey  →   ffmpeg script crops  →  Claude drafts title/  →  manual at first,
saves last 60s        to 9:16, trims,         description/hashtags     YouTube API later
(OBS replay buffer)   adds title overlay      from a one-line note
```

Owner's total time per short: ~3 minutes (play normally + one approval pass).

## 1. Capture — OBS replay buffer (recommended start)

> **Ready vertical master:** `docs/promo/assets/gameplay-mobile-master.mp4`
> (9:16, scripted drive via `tools/capture/record.js --mobile`) already exists —
> use it as the first Short source before any OBS setup.

- OBS Studio (free, macOS) → Settings → Output → enable **Replay Buffer** (60 s).
- Play the game in the browser at 16:9 or, better, in a **narrow browser window
  (~9:16)** — the camera follows the car, so the game is natively
  vertical-friendly; capturing vertical directly beats cropping.
- Hit one hotkey whenever something clip-worthy happens (big combo, near-miss
  chain, new car reveal). The last 60 s land in a folder. No editing mindset
  while playing — just tap the key.
- Raw clips accumulate in `~/Movies/DesktopDrift-raw/` (or similar).

**Later upgrade (builder task, ~50 lines):** in-game dev-flag recorder via
`canvas.captureStream(60)` + `MediaRecorder` → downloads a perfect-fps webm of
the canvas only (no browser chrome, exact resolution). The roadmap's ghost-car
input trace would eventually allow fully headless re-rendering of best runs —
that's the end-game automation, not the start.

## 2. Cut — one ffmpeg script (`tools/shorts/cut.sh`, to be written)

Input: raw clip + optional `title.txt`. Output: `out/<name>-short.mp4`.

- Crop/scale to 1080×1920 (skip if captured vertical).
- Trim to the best ≤ 59 s (start/end passed as args; picking the moment is the
  only human judgment in the step).
- Optional: 1.5–2× speed-up flag for slow sections, title text overlay
  (drawtext, project font `Unbounded`), end-card frame with the game URL.
- H.264 + AAC, YouTube-ready.

Claude Code writes and maintains this script; you run one command per clip, or
batch: `./cut.sh raw/*.mp4`.

## 3. Copy — batch drafting session

Weekly Claude Code session: for each new clip you provide one line ("cafe track
reversed, 900 PPS run"), the agent (see PROMOTER_AGENT.md, Workflow B) returns
title (≤100 chars, hook-first), description with play link, hashtags
(#shorts #indiegame #drifting + rotating), and a pinned-comment draft.
It also mines `git log` since the last devlog for episode topics.

## 4. Upload

- **Start manual:** drag 2–3 ready files into YouTube Studio weekly, paste the
  approved copy. Reliable, zero setup.
- **Automate later:** YouTube Data API v3 upload costs 1,600 quota units per
  video (default 10,000/day → ~6 uploads/day, plenty). A small script +
  OAuth once → scheduled publishing. Worth it only after the manual loop proves
  the cadence.

## Formats that fit the backlog

1. **"One feature in 30 seconds"** — neon shop, reversed tracks, achievements…
   each shipped ROADMAP item is one short. This alone clears the backlog.
2. **Pure gameplay flex** — a high-PPS run with the score visible, no talking.
3. **Before/after** — old vs new sound, old vs new track art (git history has
   the material).
4. **"No engine" dev bait** — 15 s of gameplay + "this is vanilla JS, 1.4 MB".
   Performs well with dev audiences, links back to the devlog.

## Cadence proposal

- Record raw clips passively during normal playtesting (hotkey habit).
- One weekly session: cut + copy + approve (~30–45 min).
- Publish 2–3 shorts/week; long-form devlog episode monthly, assembled from the
  same material.
