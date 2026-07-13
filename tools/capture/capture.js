// Desktop Drift — automated screenshot capture via Playwright
// Drives the game with scripted arrow-key steering and saves frames.
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8777';
const OUT = __dirname + '/shots';
fs.mkdirSync(OUT, { recursive: true });

// Seeded save: red body + cyan neon on the default car, some tires in the wallet,
// sound off (headless), haptics off.
const SAVE = JSON.stringify({
  version: 4,
  settings: { units: 'kmh', haptics: false, soundEnabled: false, volume: 0 },
  wallet: 264,
  garage: { carIndex: 0, cars: { '0': { bodyColor: '#D32F2F', neonColor: '#00E5FF' } } },
});

// deterministic LCG so runs are repeatable
function lcg(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

async function drive(page, tag, secs, seed) {
  const rnd = lcg(seed);
  const t0 = Date.now();
  let i = 0;
  while ((Date.now() - t0) / 1000 < secs) {
    const r = rnd();
    // mostly steer (that's what makes drifts), sometimes coast straight
    const key = r < 0.42 ? 'ArrowLeft' : r < 0.84 ? 'ArrowRight' : null;
    const hold = 350 + rnd() * 650; // 350–1000ms phases
    if (key) await page.keyboard.down(key);
    await page.waitForTimeout(hold);
    if (key) await page.keyboard.up(key);
    await page.screenshot({ path: `${OUT}/${tag}-${String(i++).padStart(2, '0')}.png` });
  }
}

async function gameRun(ctx, url, tag, secs, seed) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4500); // countdown 3-2-1
  await drive(page, tag, secs, seed);
  await page.close();
}

async function uiShot(ctx, url, tag, extraWait = 1500) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(extraWait); // entrance animations settle
  await page.screenshot({ path: `${OUT}/${tag}.png` });
  await page.close();
}

(async () => {
  const browser = await chromium.launch();

  // ── Desktop 1920×1080 ──
  const desk = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await desk.addInitScript((save) => localStorage.setItem('desktop-drift', save), SAVE);

  await uiShot(desk, 'index.html', 'ui-desk-menu', 2500);
  await uiShot(desk, 'select.html', 'ui-desk-garage', 2500);
  await uiShot(desk, 'tracks.html', 'ui-desk-tracks', 2000);
  await uiShot(desk, 'achievements.html', 'ui-desk-achievements', 2000);

  await gameRun(desk, 'game.html?track=green-study', 'play-desk-green', 32, 11);
  await gameRun(desk, 'game.html?track=cafe-marble', 'play-desk-cafe', 32, 22);
  await gameRun(desk, 'game.html?track=dev-desk', 'play-desk-devdesk', 32, 33);
  await gameRun(desk, 'game.html?track=steel-kitchen&mode=zen', 'play-desk-zen', 25, 44);
  await desk.close();

  // ── Mobile 390×844 @2x, touch ──
  const mob = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await mob.addInitScript((save) => localStorage.setItem('desktop-drift', save), SAVE);

  await uiShot(mob, 'index.html', 'ui-mob-menu', 2500);
  await uiShot(mob, 'select.html', 'ui-mob-garage', 2500);
  await uiShot(mob, 'tracks.html', 'ui-mob-tracks', 2000);

  await gameRun(mob, 'game.html?track=green-study', 'play-mob-green', 28, 55);
  await gameRun(mob, 'game.html?track=dining-oak', 'play-mob-oak', 28, 66);
  await mob.close();

  await browser.close();
  const n = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length;
  console.log(`DONE — ${n} frames in ${OUT}`);
})();
