# Screenshot capture kit

Automated gameplay/UI screenshots via Playwright: scripted arrow-key steering,
frames every ~0.7 s, desktop (1920×1080) + mobile (390×844 @2x) viewports,
seeded save (red body + cyan neon, tires in the wallet).

Not part of the game or the build — dev tooling only.

## Usage

```bash
# 1. serve the game from the repo root
python3 -m http.server 8777

# 2. install playwright anywhere outside the repo (once)
mkdir -p /tmp/dd-capture && cd /tmp/dd-capture
npm init -y && npm install playwright && npx playwright install chromium

# 3. run (from the playwright dir; scripts resolve output next to themselves)
cp <repo>/tools/capture/{capture,sheet}.js .
node capture.js   # ~4 min → ./shots/*.png (~250 frames)
node sheet.js     # contact-sheet grids per run → ./shots/sheet-*.png
```

Review the sheets, pick winners into `docs/promo/screenshots/`.

Tuning: track list, run length, and steering seeds are at the bottom of
`capture.js` (`gameRun(...)` calls — a different seed = a different drive).
Runs where the car gets stuck near a table edge produce weak frames; just
re-run that track with another seed.
