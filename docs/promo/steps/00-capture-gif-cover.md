# Step 00 — Finish the capture kit: gameplay GIF + cover art

**Status:** not started · **Blocks:** every listing below (each wants a cover; itch.io wants a GIF)
**When:** first — before any Wave 1 submission. Effort: one session.
**Who:** builder (tooling) + owner (final pick).

## Goal

Three missing assets, reusable across all platforms:
1. **Gameplay GIF** — 10–20 s, ≤ 3 MB, 630×500 (itch.io cover slot; also usable on
   social). A great GIF is the single biggest CTR lever on itch.
2. **Cover art 16:9** — 1920×1080 master (CrazyGames/Yandex covers, YouTube thumbnails).
   Downscale variants per platform.
3. **Gameplay video clip** — 20–30 s mp4 master the GIF is cut from (also the first
   Short — see SHORTS_PIPELINE.md).

## How

1. **Video source:** extend `tools/capture/capture.js` — Playwright contexts accept
   `recordVideo: { dir, size }`; run the existing scripted drives (green-study and
   dev-desk gave the best frames) and keep the video instead of frames.
   Alternative if quality disappoints: owner plays 60 s in a normal browser with
   QuickTime/OBS recording.
2. **Cut the best 10–20 s** (a corner chain with visible combo popups):
   `ffmpeg -ss <t0> -t <dur> -i run.webm -vf "crop=..., scale=630:-1" master.mp4`.
3. **GIF encode** (palette pass keeps it under 3 MB):
   `ffmpeg -i master.mp4 -vf "fps=15,scale=630:500:force_original_aspect_ratio=increase,crop=630:500,split[a][b];[a]palettegen[p];[b][p]paletteuse" cover.gif`
   — iterate `fps`/duration until ≤ 3 MB.
4. **Cover art:** compose in an HTML page (game font `Unbounded` is in `fonts/`) —
   best screenshot as background + logo/name + "free browser drift racing" tagline —
   screenshot it at 1920×1080 with Playwright (same trick as `sheet.js`).
5. Owner picks final assets → commit to `docs/promo/screenshots/` (or `assets/`).

## Done when

- `cover.gif` ≤ 3 MB, 630×500, loops cleanly.
- `cover-1920x1080.png` master + per-platform downscales.
- 20–30 s mp4 master saved for Shorts reuse.
