// Menu / landing screen (SPA Phase B) — logic extracted verbatim from index.html's two inline
// scripts. Hydrates the Time-Attack tile stats from the save and wires the soft-tap navigation on
// the menu links (which, in the shell, route in-document via the navigator seam).
//
// Contract: createMenuScreen(root = document) -> { destroy }. The stats read is a one-shot; the
// link taps go through the on() accumulator so destroy() removes them. (The raw localStorage read
// is kept verbatim from the old inline — a later cleanup could route it through store.js.)
import { tapThenGo } from '../sound.js';

export const createMenuScreen = (root = document) => {
  // ── Time-Attack tile stats from the save (raw read, verbatim from the old index.html inline) ──
  try {
    const data = JSON.parse(localStorage.getItem('desktop-drift') || 'null');
    if (data?.records) {
      const ppsList = Object.values(data.records)
        .map(t => t.timeattack?.bestPPS)
        .filter(v => v != null);
      if (ppsList && ppsList.length > 0) {
        const avg = Math.round(ppsList.reduce((a, b) => a + b, 0) / ppsList.length);
        // Update only the text node, not the whole element — setting textContent
        // on the parent would destroy the #ta-caps child span.
        root.getElementById('ta-avg-pps').firstChild.textContent =
          'Avg ' + avg.toLocaleString() + ' PPS';
      }
    }
    if (data?.stats?.caps) {
      const total = Object.values(data.stats.caps)
        .reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
      if (total > 0) {
        const el = root.getElementById('ta-caps');
        el.textContent = total === 1 ? ` • 1 cap collected` : ` • ${total} caps collected`;
        el.style.display = '';
      }
    }
    if (data?.wallet > 0) {
      root.getElementById('wallet-count').textContent = data.wallet;
      root.getElementById('menu-wallet').style.display = '';
    }
    if (data?.achievements?.['absolute-ddk']?.unlocked) {
      root.getElementById('menu-crown').style.display = '';
    }
  } catch {}

  // Soft tap on every menu item; navigation is briefly deferred so the sound isn't cut. In the
  // shell these route in-document via the navigator seam (the router's setNavigator).
  const listeners = [];
  const on = (el, type, fn) => { el.addEventListener(type, fn); listeners.push([el, type, fn]); };
  for (const a of root.querySelectorAll('#menu a[href]')) {
    on(a, 'click', (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      e.preventDefault();
      tapThenGo(a.getAttribute('href'));
    });
  }

  const destroy = () => { while (listeners.length) { const [el, type, fn] = listeners.pop(); el.removeEventListener(type, fn); } };
  return { destroy };
};
