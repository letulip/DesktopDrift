// Desktop Drift — neon MODES reel frame-grabber (dev tooling, not shipped).
// Drives tools/capture/neon-modes.html frame-by-frame over http and writes a
// numbered PNG sequence, then you assemble it with ffmpeg (commands printed at
// the end). Deterministic: each frame = STUDIO.render(panelIndex, phase), phase
// derived from the frame index, so re-runs are identical.
//
// Usage:
//   cd <repo> && python3 -m http.server 8789          # serve the game + this page
//   # copy this file next to a playwright install (outside the repo) and:
//   node neon-modes.js [outDir]
// Output: <outDir>/frame-00001.png ... + a manifest of panel cut points.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.DD_BASE || 'http://127.0.0.1:8789';
const PAGE = `${BASE}/tools/capture/neon-modes.html`;
const OUT = process.argv.slice(2).find((a) => !a.startsWith('--')) || path.join(__dirname, 'neon-modes-frames');
const FPS = 30;              // render fps (mp4 smooth; gif drops frames later)
const PANEL_SECS = 2.1;      // each car+mode holds ~2.1s → ~1 full cycle at speed 1.25
const FRAMES_PER = Math.round(FPS * PANEL_SECS);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(PAGE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__studioReady === true, null, { timeout: 15000 });

  const count = await page.evaluate(() => window.STUDIO.count);
  const stage = page.locator('#stage');
  const cuts = [];
  let frame = 0;

  for (let p = 0; p < count; p++) {
    const meta = await page.evaluate((i) => window.STUDIO.panel(i), p);
    cuts.push({ panel: p, label: meta.label, sub: meta.sub, startFrame: frame });
    for (let f = 0; f < FRAMES_PER; f++) {
      const phase = f / FPS;
      await page.evaluate(({ i, ph }) => window.STUDIO.render(i, ph), { i: p, ph: phase });
      const file = path.join(OUT, `frame-${String(++frame).padStart(5, '0')}.png`);
      await stage.screenshot({ path: file });
    }
    console.log(`panel ${p + 1}/${count} "${meta.label}" — ${FRAMES_PER} frames`);
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'cuts.json'),
    JSON.stringify({ fps: FPS, panelSecs: PANEL_SECS, framesPer: FRAMES_PER, total: frame, cuts }, null, 2));
  console.log(`\nDONE — ${frame} frames in ${OUT}`);
  console.log(`\nAssemble (mp4):\n  ffmpeg -y -framerate ${FPS} -i ${OUT}/frame-%05d.png \\` +
    `\n    -c:v libx264 -pix_fmt yuv420p -movflags +faststart neon-modes.mp4`);
  console.log(`\nAssemble (gif, palette pass):\n  ffmpeg -y -framerate ${FPS} -i ${OUT}/frame-%05d.png \\` +
    `\n    -vf "fps=15,scale=600:-1:flags=lanczos,palettegen=stats_mode=diff" palette.png\n` +
    `  ffmpeg -y -framerate ${FPS} -i ${OUT}/frame-%05d.png -i palette.png \\` +
    `\n    -lavfi "fps=15,scale=600:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer" neon-modes.gif`);
})();
