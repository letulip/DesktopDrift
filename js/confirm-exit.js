// ─────────────────────────────────────────────────────────────────────────────
// Диалог подтверждения выхода — самодостаточный компонент без зависимостей.
//
// Сам создаёт оверлей + карточку, вешает Escape и клик по подложке (cancel).
// Вызывающий код передаёт колбэки onExit / onCancel в show().
// Стили — в css/sandbox.css (#confirmExitOverlay).
// ─────────────────────────────────────────────────────────────────────────────

export function createConfirmExit() {
  const overlay = document.createElement('div');
  overlay.id = 'confirmExitOverlay';
  overlay.innerHTML = `
    <div id="confirmBox">
      <p  id="confirmTitle">Leave the race?</p>
      <div id="confirmBtns">
        <button id="confirmCancelBtn">Keep racing</button>
        <button id="confirmExitBtn">Exit to menu</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let pendingCancel = null, pendingExit = null;

  function hide() {
    overlay.classList.remove('show');
    pendingCancel = pendingExit = null;
  }

  function show({ onExit, onCancel } = {}) {
    pendingCancel = onCancel || null;
    pendingExit  = onExit  || null;
    overlay.classList.add('show');
  }

  // ── Кнопка «Продолжить» ──
  document.getElementById('confirmCancelBtn').addEventListener('click', () => {
    const cb = pendingCancel; hide(); if (cb) cb();
  });

  // ── Кнопка «Выйти» ──
  document.getElementById('confirmExitBtn').addEventListener('click', () => {
    const cb = pendingExit; hide(); if (cb) cb();
  });

  // ── Клик по подложке (вне карточки) = отмена ──
  overlay.addEventListener('click', e => {
    if (e.target === overlay) { const cb = pendingCancel; hide(); if (cb) cb(); }
  });

  // ── Escape = отмена ──
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('show')) {
      e.preventDefault();
      const cb = pendingCancel; hide(); if (cb) cb();
    }
  });

  return { show, hide, isVisible: () => overlay.classList.contains('show') };
}
