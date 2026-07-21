// Time Attack track-select screen — logic extracted verbatim from tracks.html's inline module
// (SPA Phase A). Renders a track card per track (stars / crown / trophy / perpetual badges, best
// record, cap+tire chips), a Normal/Reversed direction toggle, and a horizontal-swipe flip.
//
// The minimap renderer is the shared js/track-thumb.js (also used by the Zen screen).
//
// Screen contract: createTracksScreen(root=document) -> { destroy }. Persistent listeners (the two
// toggle buttons, the Back link, and the swipe handlers on #track-select) go through the on()
// accumulator so destroy() removes them; per-card click listeners are recreated on every render
// and die when renderCards clears container.innerHTML, so they are not tracked (verbatim behaviour).
import { TRACKS } from '../track-registry.js';
import { records, collectedCaps, tireSwept, hasTrophy, hasPerpetual, wallet } from '../store.js';
import { instanceId } from '../track-util.js';
import { isDDK } from '../economy.js';
import { initWalletHistory } from '../wallet-history.js';
import { sfx, tapThenGo, soundThenGo } from '../sound.js';
import { drawThumb } from '../track-thumb.js';

export const createTracksScreen = (root = document) => {
  const $ = (id) => root.getElementById(id);

  const listeners = [];
  const on = (el, type, fn, opts) => { el.addEventListener(type, fn, opts); listeners.push([el, type, fn, opts]); };
  let scrollRaf = 0;

  $('wallet-amount').textContent = wallet();
  initWalletHistory(root.querySelector('.wallet-pill'));

  // ── Best PPS record (keyed by instance: trackId, or trackId:rev for reversed) ──
  function bestRecord(instId) {
    const ta = records()?.[instId]?.timeattack;
    if (ta?.bestPPS == null) return null;
    return { pps: Math.round(ta.bestPPS), total: ta.bestPPSTotal, time: ta.bestPPSTime };
  }
  const starsOf       = (pps) => Math.min(5, Math.floor((pps ?? 0) / 100));
  const REV_UNLOCK    = 3;   // reversed unlocks at 3★ on the forward lap
  const forwardStars  = (trackId) => starsOf(bestRecord(trackId)?.pps);

  // ── Build the track cards for a direction (normal / reversed) ──────────────────
  const container = $('track-cards');

  function renderCards(reversed) {
    container.innerHTML = '';

    for (const track of TRACKS) {
      const inst   = instanceId(track.id, reversed);
      const locked = reversed && forwardStars(track.id) < REV_UNLOCK;
      const record = locked ? null : bestRecord(inst);

      // Locked reversed cards are inert <div>s; everything else is a link into the garage.
      const card = document.createElement(locked ? 'div' : 'a');
      card.className = 'track-card' + (locked ? ' is-locked' : '');
      if (!locked) {
        card.href = `select.html?track=${encodeURIComponent(track.id)}${reversed ? '&dir=rev' : ''}`;
        card.addEventListener('click', (e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey) return;
          e.preventDefault(); tapThenGo(card.getAttribute('href'));
        });
      }

      const top = document.createElement('div');
      top.className = 'track-card-top';

      const canvas = document.createElement('canvas');
      canvas.className = 'track-thumb';
      canvas.width  = 260;
      canvas.height = 140;
      top.appendChild(canvas);

      if (locked) {
        const lock = document.createElement('div');
        lock.className = 'track-lock';
        lock.innerHTML = `<span class="track-lock-ico">🔒</span><span>Earn ★★★ on the forward lap</span>`;
        top.appendChild(lock);
      } else {
        const badges = document.createElement('div');
        badges.className = 'track-badges';

        const stars = document.createElement('div');
        stars.className = 'track-stars';
        const starRow = document.createElement('div');
        starRow.className = 'track-star-row';
        const filled = starsOf(record?.pps);
        for (let s = 0; s < 5; s++) {
          const sp = document.createElement('span');
          sp.textContent = '★';
          sp.className = s < filled ? 'star-lit' : 'star-dim';
          starRow.appendChild(sp);
        }
        stars.appendChild(starRow);
        badges.appendChild(stars);

        // DDK crown — its own badge to the RIGHT of the stars once this instance's best is 600+ PPS.
        if (isDDK(record?.pps)) {
          const crown = document.createElement('span');
          crown.className = 'track-crown';
          crown.textContent = '👑';
          crown.title = 'DDK — 600+ PPS';
          badges.appendChild(crown);
        }
        // Participation Trophy — 🏅 badge once this instance has had a 1-PPS finish.
        if (hasTrophy(inst)) {
          const trophy = document.createElement('span');
          trophy.className = 'track-trophy';
          trophy.textContent = '🏅';
          trophy.title = 'Participation Trophy — finished a race with just 1 PPS';
          badges.appendChild(trophy);
        }
        // Perpetual Motion — ♾️ badge once this instance has had an unbroken-drift finish.
        if (hasPerpetual(inst)) {
          const perp = document.createElement('span');
          perp.className = 'track-perpetual';
          perp.textContent = '♾️';
          perp.title = 'Perpetual Motion — finished a race in one unbroken drift';
          badges.appendChild(perp);
        }
        top.appendChild(badges);
      }

      const scorePanel = document.createElement('div');
      scorePanel.className = 'track-card-score';
      scorePanel.innerHTML = record
        ? `<span class="tcs-label">Best score</span>` +
          `<span class="tcs-pps">${record.pps.toLocaleString()} <span class="tcs-unit">PPS</span></span>` +
          `<span class="tcs-label">Total</span>` +
          `<span class="tcs-total">${record.total.toLocaleString()} pts</span>` +
          `<span class="tcs-time">${record.time.toFixed(1)} s</span>`
        : `<span class="tcs-none">—</span>`;
      top.appendChild(scorePanel);
      card.appendChild(top);

      const body = document.createElement('div');
      body.className = 'track-card-body';

      const name = document.createElement('div');
      name.className   = 'track-card-name';
      name.textContent = track.name + (reversed ? ' ↺' : '');

      const desc = document.createElement('div');
      desc.className   = 'track-card-desc';
      desc.textContent = locked
        ? 'Locked — earn 3★ on the forward lap to unlock the reversed variant.'
        : track.desc;

      body.appendChild(name);
      body.appendChild(desc);

      if (!locked) {
        const rec = document.createElement('div');
        rec.className = 'track-card-record';
        rec.innerHTML = record
          ? `Score: <span class="val">${record.pps.toLocaleString()} PPS</span><span class="rec-sub">(Total: ${record.total.toLocaleString()} · ${record.time.toFixed(1)} s)</span>`
          : '—';
        body.appendChild(rec);

        // Collectible chips (caps + tires), keyed by this instance.
        const meta = document.createElement('div');
        meta.className = 'track-meta';
        if (track.caps > 0) {
          const collected = collectedCaps(inst).length;
          const chip = document.createElement('span');
          chip.className = 'track-chip cap' + (collected >= track.caps ? ' is-done' : '');
          chip.textContent = collected + '/' + track.caps + ' cap' + (track.caps !== 1 ? 's' : '');
          meta.appendChild(chip);
        }
        // Tires respawn every race, so instead of a count we show a wheel badge once the
        // player has clean-swept the track (collected every tire in a single run).
        if (track.tires > 0 && tireSwept(inst)) {
          const chip = document.createElement('span');
          chip.className = 'track-chip tire is-done';
          chip.textContent = '🛞 ✓';
          chip.title = 'All tires collected in one run';
          meta.appendChild(chip);
        }
        if (meta.children.length) body.appendChild(meta);
      }

      card.appendChild(body);
      container.appendChild(card);

      drawThumb(canvas, track.svgSrc, track.theme);   // same geometry both ways — no mirror
    }

    scrollRaf = requestAnimationFrame(() => { container.scrollTop = 0; });
  }

  // ── Direction toggle ───────────────────────────────────────────────────────────
  const btnNormal   = $('btn-normal');
  const btnReversed = $('btn-reversed');
  const setMode = (reversed) => {
    btnNormal.classList.toggle('is-active', !reversed);
    btnReversed.classList.toggle('is-active', reversed);
    renderCards(reversed);
  };
  on(btnNormal,   'click', () => { setMode(false); sfx.tap(); });
  on(btnReversed, 'click', () => { setMode(true);  sfx.tap(); });

  const _back = root.querySelector('.ts-back');
  if (_back) on(_back, 'click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); soundThenGo(_back.getAttribute('href'), 'back');
  });

  // Swipe left/right anywhere on the screen flips direction (mirrors the toggle). Cards scroll
  // vertically, so a clear horizontal swipe is unambiguous; passive listeners keep scroll smooth.
  const swipeZone = $('track-select');
  let _sx = 0, _sy = 0;
  const SWIPE_MIN = 60;
  on(swipeZone, 'touchstart', (e) => { const t = e.changedTouches[0]; _sx = t.clientX; _sy = t.clientY; }, { passive: true });
  on(swipeZone, 'touchend', (e) => {
    const t = e.changedTouches[0], dx = t.clientX - _sx, dy = t.clientY - _sy;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return;   // must be a clear horizontal swipe
    const reversedNow = btnReversed.classList.contains('is-active');
    if (dx < 0 && !reversedNow) setMode(true);    // swipe left  → Reversed
    if (dx > 0 &&  reversedNow) setMode(false);   // swipe right → Normal
  }, { passive: true });

  renderCards(false);

  const destroy = () => {
    cancelAnimationFrame(scrollRaf);
    while (listeners.length) { const [el, type, fn, opts] = listeners.pop(); el.removeEventListener(type, fn, opts); }
    if (container) container.innerHTML = '';
  };
  return { destroy };
};
