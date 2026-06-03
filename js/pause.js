// ─────────────────────────────────────────────────────────────────────────────
// Компонент паузы — самодостаточный, без зависимостей от игрового стейта.
//
// Сам создаёт свой DOM (кнопку + оверлей), вешает горячую клавишу «P» и клики,
// и хранит собственный флаг paused. Игровой цикл только читает isPaused() и
// сам решает, что замораживать.
//
// Переместить кнопку → правь правило #pauseBtn в css/sandbox.css (top/left).
// Убрать компонент → удали один вызов createPause() в game-engine.js.
// ─────────────────────────────────────────────────────────────────────────────

export function createPause({ onChange } = {}) {
  let paused = false;

  // ── Кнопка (плавающая, позиция задаётся в CSS) ──
  const btn = document.createElement('button');
  btn.id = 'pauseBtn';
  btn.type = 'button';
  btn.title = 'Pause (P)';
  btn.setAttribute('aria-label', 'Pause');

  // ── Оверлей затемнения ──
  const overlay = document.createElement('div');
  overlay.id = 'pauseOverlay';
  overlay.innerHTML = '<div class="title">PAUSED</div><div class="sub">tap to resume</div>';

  document.body.appendChild(btn);
  document.body.appendChild(overlay);

  function render() {
    btn.textContent = paused ? '▶' : '⏸'; // ▶ на паузе / ⏸ в игре
    btn.classList.toggle('paused', paused);
    overlay.classList.toggle('show', paused);
  }

  function set(v) {
    v = !!v;
    if (v === paused) return;
    paused = v;
    render();
    if (onChange) onChange(paused);
  }
  function toggle() { set(!paused); }

  // ── События ──
  btn.addEventListener('click',     e => { e.preventDefault(); toggle(); });
  overlay.addEventListener('click', e => { e.preventDefault(); set(false); }); // тап по экрану снимает паузу
  addEventListener('keydown', e => {
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); toggle(); }
  });

  render();

  return {
    isPaused: () => paused,
    toggle,
    pause:  () => set(true),
    resume: () => set(false),
    set,
    btn,
    overlay,
  };
}
