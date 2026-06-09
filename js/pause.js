// ─────────────────────────────────────────────────────────────────────────────
// Pause component — self-contained, no dependency on game state.
//
// Creates its own DOM (button + overlay), registers the "P" hotkey and clicks,
// and owns its own `paused` flag. The game loop only reads isPaused() and
// decides what to freeze.
//
// To move the button → edit the #pauseBtn rule in css/sandbox.css (top/left).
// To remove the component → delete the single createPause() call in game-engine.js.
// ─────────────────────────────────────────────────────────────────────────────

export const createPause = ({ onChange } = {}) => {
  let paused = false;

  // ── Button (floating, position set in CSS) ──
  const btn = document.createElement('button');
  btn.id = 'pauseBtn';
  btn.type = 'button';
  btn.title = 'Pause (P)';
  btn.setAttribute('aria-label', 'Pause');

  // ── Dimming overlay ──
  const overlay = document.createElement('div');
  overlay.id = 'pauseOverlay';
  overlay.innerHTML = '<div class="title">PAUSED</div><div class="sub">tap to resume</div>';

  document.body.appendChild(btn);
  document.body.appendChild(overlay);

  const render = () => {
    btn.textContent = paused ? '▶' : '⏸'; // ▶ while paused / ⏸ while playing
    btn.classList.toggle('paused', paused);
    overlay.classList.toggle('show', paused);
  }

  const set = (v) => {
    v = !!v;
    if (v === paused) return;
    paused = v;
    render();
    if (onChange) onChange(paused);
  }
  const toggle = () => { set(!paused); }

  // ── Events ──
  btn.addEventListener('click',     e => { e.preventDefault(); toggle(); });
  overlay.addEventListener('click', e => { e.preventDefault(); set(false); }); // tap overlay to resume
  const onKey = e => {
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); toggle(); }
  };
  addEventListener('keydown', onKey);

  render();

  // Tears down the component: removes the global listener and its DOM.
  // btn/overlay click handlers are on the elements themselves → removed with them.
  const destroy = () => {
    removeEventListener('keydown', onKey);
    btn.remove();
    overlay.remove();
  };

  return {
    isPaused: () => paused,
    toggle,
    pause:  () => set(true),
    resume: () => set(false),
    set,
    destroy,
    btn,
    overlay,
  };
}
