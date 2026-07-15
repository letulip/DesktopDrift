// Out-of-race achievement toast — a small celebratory popup shown when an out-of-race
// action (a shop purchase) unlocks achievements. The shop navigates back to the garage on
// Apply, so newly-unlocked defs are STASHED on buy (queueAchievementToasts) and FLUSHED on
// the landing page (flushAchievementToasts, called from select.html). Self-contained: no
// deps, an inline canvas confetti burst, auto-dissolve after a few seconds, and a × close.
//
// In-race unlocks use a separate results-overlay chip (js/race-results.js) — this module is
// only the out-of-race celebration.

const KEY         = 'dd-ach-toasts';                 // sessionStorage hand-off (shop → garage)
const HOLD_MS     = 4000;                            // fully-visible time before the auto-dissolve
const FADE_MS     = 550;                             // dissolve duration — keep in sync with .is-out in css/ach-toast.css
const CONFETTI_MS = 1300;                            // one-shot confetti lifetime
const COLORS      = ['#ffd34d', '#ffb14d', '#7fd4ff', '#9be37a', '#ff6a9c', '#c59bff'];

// Reduce a raw achievement def to just what the toast renders (drops check fns etc.),
// so the sessionStorage payload stays small and serialisable. Pure — unit-tested.
export const toastDefs = (defs) =>
  (defs || []).filter(Boolean).map(d => ({ icon: d.icon, name: d.name, reward: d.reward }));

// Stash newly-unlocked defs (from syncStateAchievements) to show on the NEXT page — the
// shop navigates away on buy, so they can't be rendered in place. Appends to any pending.
export const queueAchievementToasts = (defs) => {
  const clean = toastDefs(defs);
  if (!clean.length) return;
  try {
    const prev = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    sessionStorage.setItem(KEY, JSON.stringify([...prev, ...clean]));
  } catch {}
};

// Read + clear any queued toasts and show them. Call once on an out-of-race page load.
export const flushAchievementToasts = () => {
  let defs = [];
  try {
    defs = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    sessionStorage.removeItem(KEY);
  } catch {}
  if (Array.isArray(defs) && defs.length) showAchievementToasts(defs);
};

// ── Rendering ─────────────────────────────────────────────────────────────────

let container = null;
const getContainer = () => {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.id = 'ach-toasts';
  document.body.appendChild(container);
  return container;
};

// Show one toast per def immediately (stacked). Safe to call with an empty list.
export const showAchievementToasts = (defs) => {
  for (const d of toastDefs(defs)) spawnToast(d);
};

const spawnToast = (def) => {
  const host  = getContainer();
  const toast = document.createElement('div');
  toast.className = 'ach-toast';
  toast.setAttribute('role', 'status');

  const cvs = document.createElement('canvas');
  cvs.className = 'ach-toast-confetti';
  toast.appendChild(cvs);

  const icon = document.createElement('span');
  icon.className = 'ach-toast-icon';
  icon.textContent = def.icon || '🏆';
  toast.appendChild(icon);

  const body = document.createElement('div');
  body.className = 'ach-toast-body';
  const head = document.createElement('span');
  head.className = 'ach-toast-head';
  head.textContent = 'Achievement unlocked';
  const name = document.createElement('span');
  name.className = 'ach-toast-name';
  name.textContent = def.name || '';
  body.append(head, name);
  if (def.reward) {
    const rew = document.createElement('span');
    rew.className = 'ach-toast-reward';
    rew.textContent = `+${def.reward} 🛞`;
    body.appendChild(rew);
  }
  toast.appendChild(body);

  const close = document.createElement('button');
  close.className = 'ach-toast-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Dismiss');
  close.textContent = '×';
  toast.appendChild(close);

  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-in'));   // trigger the enter transition

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(holdT);
    toast.classList.add('is-out');
    setTimeout(() => toast.remove(), FADE_MS);
  };
  close.addEventListener('click', dismiss);
  const holdT = setTimeout(dismiss, HOLD_MS);

  requestAnimationFrame(() => burstConfetti(cvs, toast));       // size known after layout
};

// A single upward confetti burst inside the toast card (kept small + tidy — the card's
// overflow clips stray particles). Visual only; times off rAF timestamps.
const burstConfetti = (cvs, toast) => {
  const rect = toast.getBoundingClientRect();
  const W = Math.max(80, Math.round(rect.width));
  const H = Math.max(48, Math.round(rect.height));
  cvs.width = W; cvs.height = H;
  const ctx = cvs.getContext('2d');
  if (!ctx) return;

  const parts = [];
  for (let i = 0; i < 26; i++) {
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95;   // fan upward
    const spd = 80 + Math.random() * 150;
    parts.push({
      x: W * (0.12 + Math.random() * 0.5), y: H * 0.55,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      s: 3 + Math.random() * 3, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 14,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    });
  }

  const G = 460;                       // gravity, px/s²
  let start = null, prev = null;
  const step = (t) => {
    if (start === null) { start = prev = t; }
    const dt = Math.min(0.05, (t - prev) / 1000); prev = t;
    const el = t - start;
    ctx.clearRect(0, 0, W, H);
    const fade = 1 - Math.min(1, el / CONFETTI_MS);
    for (const p of parts) {
      p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
      ctx.restore();
    }
    if (el < CONFETTI_MS) requestAnimationFrame(step);
    else ctx.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(step);
};
