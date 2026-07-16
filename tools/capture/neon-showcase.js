// Desktop Drift — neon livery showcase recorder (#screenshotsaturday).
// Records N runs on green-study that share ONE identical drift line, each run
// wearing a different body + neon livery, so an ffmpeg montage can cut between
// them mid-drift and the car appears to "switch livery" on a fixed racing line.
//
// Deterministic sync — the whole trick:
//   * STEERING is a seeded LCG (same seed = same inputs), as in capture.js.
//   * The drift model's only physics randomness is the cone-hit spin kick
//     (js/game-engine.js: `c.spin = (Math.random() - 0.5) * 18`). Left alone it
//     would diverge each run's path. So we ALSO override Math.random with a
//     seeded mulberry32 (identical seed every run) via addInitScript BEFORE the
//     game loads. Cosmetics never touch physics, so with steering seed +
//     Math.random both fixed, all runs are position-synced frame-for-frame.
//   * Per run we log goOffsetMs (video time of drive-start) so the montage can
//     anchor every clip to GO and cut at matched post-GO timestamps.
//
// Usage:
//   cd <worktree> && python3 -m http.server 8789   # serve the game
//   # copy this file next to a playwright install (outside the repo) and:
//   node neon-showcase.js [outDir]
// Output: <outDir>/<livery>.webm (6 clips, 1280x720) + <outDir>/manifest.json.
// Assemble with ffmpeg (see the montage step in the neon-showcase task).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.DD_BASE || 'http://127.0.0.1:8789';
const OUT = process.argv.slice(2).find((a) => !a.startsWith('--')) || path.join(__dirname, 'neon-video');
fs.mkdirSync(OUT, { recursive: true });

const TRACK = 'green-study';   // dark table — neon reads best
const STEER_SEED = 33;         // lively mid-table donut on green-study (~17 s in)
const RNG_SEED = 0x9E3779B9;   // fixed Math.random seed — same for every run
const DRIVE_SECS = 30;         // long enough to reach the chosen window with margin

// 6 liveries — body colours from js/palette.js (PALETTE), neon from js/neon.js
// (NEON_PALETTE). Body cycles red / white / blue; neon cycles 6 distinct hues so
// both change at every montage cut.
const COMBOS = [
  { name: 'cyan-red',      body: '#D32F2F', neon: '#00CFFF' }, // Rosso  + Cielo
  { name: 'magenta-white', body: '#F5F5F5', neon: '#FF00FF' }, // Bianco + Magenta
  { name: 'lime-blue',     body: '#1565C0', neon: '#39FF14' }, // Blu    + Verde
  { name: 'orange-red',    body: '#D32F2F', neon: '#FF6700' }, // Rosso  + Fuoco
  { name: 'purple-white',  body: '#F5F5F5', neon: '#BF00FF' }, // Bianco + Viola
  { name: 'pink-blue',     body: '#1565C0', neon: '#FF073A' }, // Blu    + Corsa
];

// mulberry32 override injected before any page script — deterministic Math.random.
const RNG_INIT = (seed) => {
  let a = seed >>> 0;
  Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Seeded save: equipped body + neon on the default car (same shape capture.js
// uses — legacy `neonColor` resolves to a solid static glow). Sound/haptics off.
const SAVE = (body, neon) => JSON.stringify({
  version: 4,
  settings: { units: 'kmh', haptics: false, soundEnabled: false, volume: 0 },
  wallet: 264,
  garage: { carIndex: 0, cars: { '0': { bodyColor: body, neonColor: neon } } },
});

// deterministic LCG for steering — identical to capture.js / record.js.
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
// recordVideo.size MUST equal the viewport (record.js lesson) or the game lands
// in a corner with the rest grey.
async function recordRun(browser, combo) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
  });
  await ctx.addInitScript(RNG_INIT, RNG_SEED);
  await ctx.addInitScript((s) => localStorage.setItem('desktop-drift', s), SAVE(combo.body, combo.neon));
  const page = await ctx.newPage();
  const tPage = Date.now();                 // ≈ video t0 (recording starts at page creation)
  await page.goto(`${BASE}/game.html?track=${TRACK}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4500);          // countdown 3-2-1
  const goOffsetMs = Date.now() - tPage;    // video timestamp of drive-start
  await drive(page, DRIVE_SECS, STEER_SEED);
  const video = page.video();
  await ctx.close(); // flushes the recording to disk
  const raw = await video.path();
  const dest = path.join(OUT, `${combo.name}.webm`);
  fs.renameSync(raw, dest);
  console.log(`recorded ${combo.name} (goOffset ${goOffsetMs} ms)`);
  return { name: combo.name, body: combo.body, neon: combo.neon, file: `${combo.name}.webm`, goOffsetMs };
}

(async () => {
  const browser = await chromium.launch();
  const runs = [];
  for (const combo of COMBOS) runs.push(await recordRun(browser, combo));
  await browser.close();
  const manifest = { track: TRACK, steerSeed: STEER_SEED, rngSeed: RNG_SEED, driveSecs: DRIVE_SECS, runs };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`DONE — ${runs.length} clips + manifest.json in ${OUT}`);
})();
