// Support / donate screen (SPA). Ported from donate.html: shows the Bybit UID with a copy button
// and an external Bybit Pay link. Contract: createDonateScreen(root = document) -> { destroy }.
// In-app links route in-document via the navigator seam (tapThenGo); the external Bybit link
// (target=_blank) opens normally. The copy button + its "Copied!" reset timer are torn down on destroy.
import { tapThenGo } from '../sound.js';

export const createDonateScreen = (root = document) => {
  const listeners = [];
  const on = (el, type, fn) => { if (el) { el.addEventListener(type, fn); listeners.push([el, type, fn]); } };
  let copyTimer = 0;

  // Soft-tap navigation on in-app links; the external Bybit link (target=_blank) is skipped so it
  // opens in a new tab as normal.
  for (const a of root.querySelectorAll('#menu a[href]')) {
    on(a, 'click', (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      e.preventDefault();
      tapThenGo(a.getAttribute('href'));
    });
  }

  // Copy the Bybit UID to the clipboard with a brief "Copied!" confirmation (falls back to showing
  // the UID inline where the clipboard API is unavailable).
  const btn   = root.getElementById('copyBtn');
  const uidEl = root.getElementById('uid');
  const flash = (text, cls) => {
    btn.textContent = text;
    if (cls) btn.classList.add(cls);
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { btn.textContent = 'Copy UID'; btn.classList.remove('copied'); }, 2000);
  };
  on(btn, 'click', () => {
    const uid = (uidEl?.textContent || '').trim();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(uid).then(() => flash('✓ Copied!', 'copied')).catch(() => flash(uid, null));
    } else {
      flash(uid, null);
    }
  });

  const destroy = () => {
    clearTimeout(copyTimer);
    while (listeners.length) { const [el, type, fn] = listeners.pop(); el.removeEventListener(type, fn); }
  };
  return { destroy };
};
