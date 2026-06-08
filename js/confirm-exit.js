// ─────────────────────────────────────────────────────────────────────────────
// Диалог подтверждения выхода — самодостаточный компонент без зависимостей.
//
// Сам создаёт оверлей + карточку, вешает Escape и клик по подложке (cancel).
// Вызывающий код передаёт колбэки onExit / onCancel в show().
// Стили — в css/sandbox.css (#confirmExitOverlay).
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

  // ── Кнопка «Продолжить» ──
  document.getElementById('confirmCancelBtn').addEventListener('click', () => {
    const cb = pendingCancel; hide(); if (cb) cb();
  });

  // ── Кнопка «Рестарт» ──
  document.getElementById('confirmRestartBtn').addEventListener('click', () => {
    const cb = pendingRestart; hide(); if (cb) cb();
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
  const onKey = e => {
    if (e.key === 'Escape' && overlay.classList.contains('show')) {
      e.preventDefault();
      const cb = pendingCancel; hide(); if (cb) cb();
    }
  };
  addEventListener('keydown', onKey);

  // Разбирает компонент: снимает глобальный слушатель и удаляет свой DOM
  // (кнопки внутри overlay уходят вместе с ним).
  const destroy = () => {
    removeEventListener('keydown', onKey);
    overlay.remove();
  };

  return { show, hide, destroy, isVisible: () => overlay.classList.contains('show') };
}
