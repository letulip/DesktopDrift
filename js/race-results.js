// ─────────────────────────────────────────────────────────────────────────────
// Оверлей итогов заезда — самодостаточный компонент.
// Показывается после финиша последнего круга Time Attack.
// Стили — css/sandbox.css (#raceResultsOverlay).
//
// Важно: все querySelector вызываются на overlay, а не на document —
// чтобы не конфликтовать с ID других экземпляров (тесты, hot-reload).
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
        <button id="rr-back">Back to tracks</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Ищем кнопку внутри своего оверлея, а не через глобальный getElementById
  overlay.querySelector('#rr-back').addEventListener('click', () => {
    location.href = 'tracks.html';
  });

  // show({ score, bestLap, lapScores, isNewRecord, pps, totalTime })
  // lapScores: [{ n, pts, t }]  — n = lap number, pts = lap score, t = lap time (s)
  // pps: points per second (эффективность заезда)
  const show = ({ score, bestLap, lapScores, isNewRecord, pps, totalTime }) => {
    const ppsRounded = Math.round(pps);
    overlay.querySelector('#rr-score').innerHTML = `
      <span class="rr-label">Score</span>
      <span class="rr-val${isNewRecord ? ' rr-new' : ''}">${ppsRounded.toLocaleString()} PPS</span>
      ${isNewRecord ? '<span class="rr-badge">NEW RECORD</span>' : ''}
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

  // destroy() вызывается из stop() когда игра стартует заново поверх живой
  const destroy = () => { overlay.remove(); };

  return { show, destroy };
};
