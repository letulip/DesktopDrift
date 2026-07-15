# Capture kit — screenshots + video

Automated gameplay/UI capture via Playwright, driven by scripted arrow-key
steering with a seeded save (red body + cyan neon, tires in the wallet):

- `capture.js` — screenshots: frames every ~0.7 s, desktop (1920×1080) +
  mobile (390×844 @2x) viewports, plus UI pages.
- `sheet.js` — contact-sheet grids from the captured frames, for fast review.
- `record.js` — video via Playwright `recordVideo`: desktop 1280×720 runs by
  default; `--mobile` records a vertical 9:16 pair (720×1280 portrait,
  isMobile+hasTouch) with `-mobile.webm` filename suffixes. Sources for
  `docs/promo/assets/` GIFs/masters (ffmpeg cuts documented in
  `docs/promo/steps/00-capture-gif-cover.md`).

Not part of the game or the build — dev tooling only.

## Usage

```bash
# 1. serve the game from the repo root
python3 -m http.server 8777

# 2. install playwright OUTSIDE the repo (once per machine session).
#    Use a scratch dir you can write to — in Claude Code sessions that's the
#    session scratchpad dir (plain /tmp may be sandbox-blocked); any
#    user-writable dir outside the repo works. Never install it in the repo.
cd <scratch-dir>
npm init -y && npm install playwright && npx playwright install chromium
# (the chromium download persists in ~/Library/Caches/ms-playwright)

# 3. run (from the playwright dir; scripts resolve output next to themselves)
cp <repo>/tools/capture/{capture,sheet,record}.js .
node capture.js   # ~4 min → ./shots/*.png (~250 frames)
node sheet.js     # contact-sheet grids per run → ./shots/sheet-*.png
node record.js            # desktop webm videos
node record.js --mobile   # vertical 9:16 webm videos
```

Review the sheets/stills, pick winners into `docs/promo/screenshots/` or cut
masters into `docs/promo/assets/`.

Tuning: track list, run length, and steering seeds sit at the bottom of
`capture.js` / `record.js` (a different seed = a different drive). Runs where
the car hugs a table edge produce weak material; re-run that track with
another seed.
