// Desktop Drift — automated gameplay video capture via Playwright
// Records ~45 s scripted drives (same deterministic steering as capture.js)
// as 1280x720 .webm files, one per track. Companion to capture.js (frames).
//
// Usage:
//   cd DesktopDrift && python3 -m http.server 8777   # serve the game
//   node record.js [outDir]                          # needs playwright installed
//
// Output: <outDir>/green-study.webm and <outDir>/dev-desk.webm
// Post-process with ffmpeg (see docs/promo/steps/00-capture-gif-cover.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8777';
const OUT = process.argv[2] || path.join(__dirname, 'video');
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

// One recording context per run so each drive flushes to its own video file.
async function recordRun(browser, track, secs, seed) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
  });
  await ctx.addInitScript((save) => localStorage.setItem('desktop-drift', save), SAVE);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/game.html?track=${track}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4500); // countdown 3-2-1
  await drive(page, secs, seed);
  const video = page.video();
  await ctx.close(); // flushes the recording to disk
  const raw = await video.path();
  const dest = path.join(OUT, `${track}.webm`);
  fs.renameSync(raw, dest);
  console.log(`recorded ${dest}`);
}

(async () => {
  const browser = await chromium.launch();
  // Seeds picked by reviewing stills: 33 drifts mid-table on green-study after
  // ~30 s; 11 stays lively on dev-desk for the first ~30 s (44/55 hug the edge).
  await recordRun(browser, 'green-study', 45, 33);
  await recordRun(browser, 'dev-desk', 45, 11);
  await browser.close();
  console.log(`DONE — videos in ${OUT}`);
})();
