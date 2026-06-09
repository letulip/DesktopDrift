// ─────────────────────────────────────────────────────────────────────────────
// Exit-confirmation dialog — self-contained component with no dependencies.
//
// Creates its own overlay + card, registers Escape and backdrop click (cancel).
// Callers pass onExit / onCancel callbacks into show().
// Styles — css/sandbox.css (#confirmExitOverlay).
// ─────────────────────────────────────────────────────────────────────────────

export const createConfirmExit = () => {
  const overlay = document.createElement('div');
  overlay.id = 'confirmExitOverlay';
  overlay.innerHTML = `
    <div id="confirmBox">
      <p  id="confirmTitle">Leave the race?</p>
      <div id="confirmBtns">
        <button id="confirmCancelBtn">Keep racing</button>
        <button id="confirmRestartBtn">↺ Restart</button>
        <button id="confirmExitBtn">Exit to menu</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let pendingCancel = null, pendingRestart = null, pendingExit = null;

  const hide = () => {
    overlay.classList.remove('show');
    pendingCancel = pendingRestart = pendingExit = null;
  }

  const show = ({ onExit, onCancel, onRestart } = {}) => {
    pendingCancel  = onCancel  || null;
    pendingRestart = onRestart || null;
    pendingExit    = onExit    || null;
    overlay.classList.add('show');
  }

  // ── "Keep racing" button ──
  document.getElementById('confirmCancelBtn').addEventListener('click', () => {
    const cb = pendingCancel; hide(); if (cb) cb();
  });

  // ── "Restart" button ──
  document.getElementById('confirmRestartBtn').addEventListener('click', () => {
    const cb = pendingRestart; hide(); if (cb) cb();
  });

  // ── "Exit" button ──
  document.getElementById('confirmExitBtn').addEventListener('click', () => {
    const cb = pendingExit; hide(); if (cb) cb();
  });

  // ── Click on backdrop (outside card) = cancel ──
  overlay.addEventListener('click', e => {
    if (e.target === overlay) { const cb = pendingCancel; hide(); if (cb) cb(); }
  });

  // ── Escape = cancel ──
  const onKey = e => {
    if (e.key === 'Escape' && overlay.classList.contains('show')) {
      e.preventDefault();
      const cb = pendingCancel; hide(); if (cb) cb();
    }
  };
  addEventListener('keydown', onKey);

  // Tears down the component: removes the global listener and its DOM
  // (buttons inside overlay are removed with it).
  const destroy = () => {
    removeEventListener('keydown', onKey);
    overlay.remove();
  };

  return { show, hide, destroy, isVisible: () => overlay.classList.contains('show') };
}
