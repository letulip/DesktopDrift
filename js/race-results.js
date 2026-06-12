// ─────────────────────────────────────────────────────────────────────────────
// Race-results overlay — self-contained component.
// Shown after the final lap of a Time Attack race.
// Styles — css/sandbox.css (#raceResultsOverlay).
//
// Important: all querySelector calls are scoped to the overlay element, not
// document — to avoid collisions with IDs in other instances (tests, hot-reload).
// ─────────────────────────────────────────────────────────────────────────────

export const createRaceResults = () => {
  const overlay = document.createElement('div');
  overlay.id = 'raceResultsOverlay';
  overlay.innerHTML = `
    <div id="rr-box">
      <h2 id="rr-title">Race Complete</h2>
      <div id="rr-score"></div>
      <div id="rr-laps"></div>
      <div id="rr-best"></div>
      <div id="rr-actions">
        <button id="rr-restart">↺ Race Again</button>
        <button id="rr-back">Back to tracks</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Buttons scoped to their own overlay (not global getElementById)
  overlay.querySelector('#rr-restart').addEventListener('click', () => {
    location.reload(); // reload game.html?track=<id> — clean start
  });
  overlay.querySelector('#rr-back').addEventListener('click', () => {
    location.href = 'tracks.html';
  });

  // show({ score, bestLap, lapScores, isNewRecord, pps, totalTime })
  // lapScores: [{ n, pts, t }]  — n = lap number, pts = lap score, t = lap time (s)
  // pps: points per second (race efficiency)
  const show = ({ score, bestLap, lapScores, isNewRecord, pps, totalTime }) => {
    const ppsRounded = Math.round(pps);
    // Star rating: 1 star per 100 PPS, max 5
    const filledStars = Math.min(5, Math.floor(ppsRounded / 100));
    const starsHtml = Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < filledStars ? 'star-lit' : 'star-dim'}">★</span>`).join('');
    overlay.querySelector('#rr-score').innerHTML = `
      <span class="rr-label">Score</span>
      <span class="rr-val${isNewRecord ? ' rr-new' : ''}">${ppsRounded.toLocaleString()} PPS</span>
      ${isNewRecord ? '<span class="rr-badge">NEW RECORD</span>' : ''}
      <div class="rr-stars">${starsHtml}</div>
      <span class="rr-sub">Total: ${score.toLocaleString()} · ${totalTime.toFixed(1)} s</span>
    `;

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

    overlay.classList.add('show');
  };

  // destroy() is called from stop() when the game restarts on top of a live instance
  const destroy = () => { overlay.remove(); };

  return { show, destroy };
};
