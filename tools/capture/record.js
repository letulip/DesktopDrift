// Desktop Drift — automated gameplay video capture via Playwright
// Records ~45 s scripted drives (same deterministic steering as capture.js)
// as 1280x720 .webm files, one per track. Companion to capture.js (frames).
//
// Usage:
//   cd DesktopDrift && python3 -m http.server 8777   # serve the game
//   node record.js [outDir]                          # needs playwright installed
//   node record.js [outDir] --mobile                 # vertical 9:16 runs
//
// Output: <outDir>/green-study.webm and <outDir>/dev-desk.webm (desktop 1280x720),
// or <outDir>/green-study-mobile.webm and <outDir>/dining-oak-mobile.webm
// (--mobile: iPhone-like 390x844 @2x context recorded at 780x1688).
// Post-process with ffmpeg (see docs/promo/steps/00-capture-gif-cover.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8777';
const args = process.argv.slice(2);
const MOBILE = args.includes('--mobile');
const OUT = args.find((a) => !a.startsWith('--')) || path.join(__dirname, 'video');
fs.mkdirSync(OUT, { recursive: true });

// Seeded save: red body + cyan neon on the default car, some tires in the wallet,
// sound off (headless), haptics off. Same as capture.js.
const SAVE = JSON.stringify({
  version: 4,
  settings: { units: 'kmh', haptics: false, soundEnabled: false, volume: 0 },
  wallet: 264,
  garage: { carIndex: 0, cars: { '0': { bodyColor: '#D32F2F', neonColor: '#00E5FF' } } },
});

// deterministic LCG so runs are repeatable
function lcg(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

async function drive(page, secs, seed) {
  const rnd = lcg(seed);
  const t0 = Date.now();
  while ((Date.now() - t0) / 1000 < secs) {
    const r = rnd();
    // mostly steer (that's what makes drifts), sometimes coast straight
    const key = r < 0.42 ? 'ArrowLeft' : r < 0.84 ? 'ArrowRight' : null;
    const hold = 350 + rnd() * 650; // 350–1000ms phases
    if (key) await page.keyboard.down(key);
    await page.waitForTimeout(hold);
    if (key) await page.keyboard.up(key);
  }
}

// Desktop 1280x720 by default; --mobile records an iPhone-like 390x844 @2x
// context at 780x1688 (keyboard steering works in both — the game listens for
// arrow keys regardless of touch support). Same seeded SAVE either way.
const CONTEXT = MOBILE
  ? {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      recordVideo: { dir: OUT, size: { width: 780, height: 1688 } },
    }
  : {
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
    };

// One recording context per run so each drive flushes to its own video file.
async function recordRun(browser, track, secs, seed) {
  const ctx = await browser.newContext(CONTEXT);
  await ctx.addInitScript((save) => localStorage.setItem('desktop-drift', save), SAVE);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/game.html?track=${track}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4500); // countdown 3-2-1
  await drive(page, secs, seed);
  const video = page.video();
  await ctx.close(); // flushes the recording to disk
  const raw = await video.path();
  const dest = path.join(OUT, `${track}${MOBILE ? '-mobile' : ''}.webm`);
  fs.renameSync(raw, dest);
  console.log(`recorded ${dest}`);
}

(async () => {
  const browser = await chromium.launch();
  if (MOBILE) {
    // Seeds match capture.js mobile stills: both runs get lively in their late
    // halves (green: clipboard/stapler corners after ~20 s; oak: soup-plate
    // section after ~24 s) — 50 s runs so the good parts are on tape.
    await recordRun(browser, 'green-study', 50, 55);
    await recordRun(browser, 'dining-oak', 50, 66);
  } else {
    // Seeds picked by reviewing stills: 33 drifts mid-table on green-study after
    // ~30 s; 11 stays lively on dev-desk for the first ~30 s (44/55 hug the edge).
    await recordRun(browser, 'green-study', 45, 33);
    await recordRun(browser, 'dev-desk', 45, 11);
  }
  await browser.close();
  console.log(`DONE — videos in ${OUT}`);
})();
