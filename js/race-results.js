// ─────────────────────────────────────────────────────────────────────────────
// Race-results overlay — self-contained component.
// Shown after the final lap of a Time Attack race.
// Styles — css/sandbox.css (#raceResultsOverlay).
//
// Important: all querySelector calls are scoped to the overlay element, not
// document — to avoid collisions with IDs in other instances (tests, hot-reload).
// ─────────────────────────────────────────────────────────────────────────────

import { sfx, soundThenGo } from './sound.js';
import { commercialBreak } from './platform.js';
import { createShareModal } from './share.js';

// How many unlocked achievements keep their full name on the results card; everything past
// this collapses to an icon + reward chip so a big burst can't overflow a short screen.
const ACH_NAMED = 4;

export const createRaceResults = ({ onRestart } = {}) => {
  // Restart action: injected by the SPA shell (in-document re-mount, keeps the AudioContext) or the
  // standalone default — reload game.html?track=<id> for a clean start.
  const restart = onRestart ?? (() => setTimeout(() => location.reload(), 100));
  const overlay = document.createElement('div');
  overlay.id = 'raceResultsOverlay';
  overlay.innerHTML = `
    <div id="rr-box">
      <h2 id="rr-title">Race Complete</h2>
      <div id="rr-score"></div>
      <div id="rr-tires"></div>
      <div id="rr-achievements"></div>
      <div id="rr-laps"></div>
      <div id="rr-best"></div>
      <div id="rr-actions">
        <button id="rr-share">↗ Share result</button>
        <button id="rr-restart">↺ Race Again</button>
        <button id="rr-back">Back to tracks</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Buttons scoped to their own overlay (not global getElementById)
  overlay.querySelector('#rr-restart').addEventListener('click', () => {
    sfx.tap();
    // Canonical interstitial slot (race is over, engine already stopped): a real
    // adapter shows an ad here; the default resolves immediately. Then restart.
    commercialBreak().then(() => restart());
  });
  overlay.querySelector('#rr-back').addEventListener('click', () => {
    soundThenGo('tracks.html', 'back');
  });

  // Share the result — a branded score card. The modal is built lazily on first use.
  let shareModal = null, lastResult = null;
  overlay.querySelector('#rr-share').addEventListener('click', () => {
    sfx.tap();
    if (!lastResult) return;
    shareModal ||= createShareModal();
    shareModal.show(lastResult);
  });

  // show({ score, bestLap, lapScores, isNewRecord, pps, totalTime, tires, ddk, unlocked })
  // lapScores: [{ n, pts, t }]  — n = lap number, pts = lap score, t = lap time (s)
  // pps: points per second (race efficiency)
  // tires: { pickup, cap, cleanSweep, firstClear, finish } — tire coins earned this race (optional)
  // ddk: true when pps ≥ 600 → the crown above the 5 stars
  // unlocked: [{ id, name, icon, reward }] — achievements unlocked this race (optional)
  const show = ({ score, bestLap, lapScores, isNewRecord, pps, totalTime, tires, ddk, unlocked, carModel, look, trackName, reversed }) => {
    const ppsRounded = Math.round(pps);
    // Star rating: 1 star per 100 PPS, max 5. At 600+ PPS a crown sits above the row (DDK).
    const filledStars = Math.min(5, Math.floor(ppsRounded / 100));
    const starsHtml = Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < filledStars ? 'star-lit' : 'star-dim'}">★</span>`).join('');
    const crownHtml = ddk ? '<span class="rr-crown" title="DDK — 600+ PPS">👑</span>' : '';
    overlay.querySelector('#rr-score').innerHTML = `
      <span class="rr-label">Score</span>
      <span class="rr-val${isNewRecord ? ' rr-new' : ''}">${ppsRounded.toLocaleString()} PPS</span>
      ${isNewRecord ? '<span class="rr-badge">NEW RECORD</span>' : ''}
      <div class="rr-stars">${crownHtml}<span class="rr-star-row">${starsHtml}</span></div>
      <span class="rr-sub">Total: ${score.toLocaleString()} · ${totalTime.toFixed(1)} s</span>
    `;

    // Tire earnings breakdown (hidden when nothing was earned, e.g. Zen).
    const t = tires || { pickup: 0, cap: 0, cleanSweep: 0, firstClear: 0, finish: 0 };
    const tireTotal = t.pickup + (t.cap || 0) + (t.cleanSweep || 0) + t.firstClear + t.finish + (t.trophy || 0) + (t.unbroken || 0);
    const tireParts = [];
    if (t.pickup)     tireParts.push(`pickups +${t.pickup}`);
    if (t.cap)        tireParts.push(`cola cap +${t.cap}`);
    if (t.cleanSweep) tireParts.push(`clean sweep +${t.cleanSweep}`);
    if (t.firstClear) tireParts.push(`first clear +${t.firstClear}`);
    if (t.finish)     tireParts.push(`finish +${t.finish}`);
    if (t.trophy)     tireParts.push(`🏅 trophy +${t.trophy}`);
    if (t.unbroken)   tireParts.push(`♾️ unbroken +${t.unbroken}`);
    overlay.querySelector('#rr-tires').innerHTML = tireTotal > 0
      ? `<span class="rr-tires-total">🛞 +${tireTotal} tires</span>` +
        `<span class="rr-tires-parts">${tireParts.join(' · ')}</span>`
      : '';

    // Achievements unlocked this race (hidden when none) — compact wrapping chips. A big unlock
    // burst (a returning player can clear half a dozen at once) used to grow the card past a short
    // screen and push the buttons out of reach, so only the first few keep their name; the rest
    // collapse to icon + reward, with the name preserved in the title attribute.
    const unlockedList = unlocked || [];
    overlay.querySelector('#rr-achievements').innerHTML = unlockedList.length
      ? `<span class="rr-ach-head">🏆 Unlocked</span>` +
        unlockedList.map((u, i) => {
          const rw = u.reward ? ` <b>+${u.reward}</b>` : '';
          return i < ACH_NAMED
            ? `<span class="rr-ach">${u.icon} ${u.name}${rw}</span>`
            : `<span class="rr-ach rr-ach-mini" title="${u.name}">${u.icon}${rw}</span>`;
        }).join('')
      : '';

    overlay.querySelector('#rr-laps').innerHTML = lapScores.map(l => {
      const isBest = l.t != null && bestLap != null && Math.abs(l.t - bestLap) < 0.001;
      return `<div class="rr-lap${isBest ? ' rr-lap-best' : ''}">
        <span class="rr-lap-n">Lap ${l.n}</span>
        <span class="rr-lap-t">${l.t != null ? l.t.toFixed(2) + ' s' : '—'}</span>
        <span class="rr-lap-pts">+${l.pts}</span>
      </div>`;
    }).join('');

    overlay.querySelector('#rr-best').textContent =
      bestLap != null ? `Best lap  ${bestLap.toFixed(2)} s` : '';

    lastResult = { pps, ddk, isNewRecord, trackName, reversed, bestLap, carModel, look };
    overlay.classList.add('show');
  };

  // destroy() is called from stop() when the game restarts on top of a live instance
  const destroy = () => { if (shareModal) shareModal.destroy(); overlay.remove(); };

  return { show, destroy };
};
