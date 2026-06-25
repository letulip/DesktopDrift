// Tire-coin history popup, shared by the garage / modify / tracks headers.
// Click the wallet pill → a modal lists recent transactions from store.ledger()
// (newest first): reason, when, signed amount, and the balance after. Styles live
// in css/wallet.css. Forward-compatible with achievements (they just call addTires
// with their own reason, which shows up here automatically).
import { ledger } from './store.js';

// "1726000000000" → "2m ago" / "3h ago" / "5d ago" / "just now".
const relTime = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60)    return 'just now';
  if (s < 3600)  return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
};

let overlay = null;

const build = () => {
  overlay = document.createElement('div');
  overlay.className = 'wh-overlay';
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="wh-panel" role="dialog" aria-label="Tire history" aria-modal="true">' +
      '<div class="wh-head"><span class="wh-title">🛞 Tire history</span>' +
        '<button class="wh-close" type="button" aria-label="Close">✕</button></div>' +
      '<div class="wh-list"></div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.wh-close').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
};

const render = () => {
  const list = overlay.querySelector('.wh-list');
  const items = ledger().slice().reverse();   // newest first
  if (!items.length) {
    list.innerHTML = '<div class="wh-empty">No tire activity yet.<br>Collect tires and finish races to earn them.</div>';
    return;
  }
  list.innerHTML = items.map((e) => {
    const pos  = e.amount >= 0;
    const sign = pos ? '+' : '−';
    return '<div class="wh-row">' +
      '<div class="wh-row-main">' +
        '<span class="wh-reason">' + (e.reason || 'Adjustment') + '</span>' +
        '<span class="wh-time">' + relTime(e.t) + '</span>' +
      '</div>' +
      '<div class="wh-row-amt">' +
        '<span class="wh-amt ' + (pos ? 'pos' : 'neg') + '">' + sign + '🛞' + Math.abs(e.amount) + '</span>' +
        '<span class="wh-bal">🛞' + e.balance + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
};

const open  = () => { if (!overlay) build(); render(); overlay.hidden = false; };
const close = () => { if (overlay) overlay.hidden = true; };

// Wire a wallet pill to open the history on click.
export const initWalletHistory = (pill) => {
  if (!pill) return;
  pill.classList.add('wallet-pill--clickable');
  pill.setAttribute('role', 'button');
  pill.setAttribute('tabindex', '0');
  pill.setAttribute('title', 'Tire history');
  pill.addEventListener('click', open);
  pill.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
};
