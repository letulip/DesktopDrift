// ─────────────────────────────────────────────────────────────────────────────
// Share-result modal — self-contained component (mirrors js/confirm-exit.js).
// Renders the score card (js/share-card.js) into a preview canvas, then offers the
// right action for the device: the native share sheet with the PNG (mobile), or
// Download PNG + Copy link (desktop). Styles — css/sandbox.css (#shareOverlay).
// ─────────────────────────────────────────────────────────────────────────────
import { renderShareCard } from './share-card.js';
import { buildShareText, shareFilename, pickShareMethod, SHARE_URL } from './share-util.js';
import { sfx } from './sound.js';

export const createShareModal = () => {
  const overlay = document.createElement('div');
  overlay.id = 'shareOverlay';
  overlay.innerHTML = `
    <div id="share-box">
      <button id="share-close" aria-label="Close">✕</button>
      <div id="share-preview"><canvas id="share-canvas"></canvas></div>
      <div id="share-actions"><span class="share-loading">Rendering…</span></div>
      <div id="share-hint"></div>
    </div>`;
  document.body.appendChild(overlay);

  const canvas   = overlay.querySelector('#share-canvas');
  const actions  = overlay.querySelector('#share-actions');
  const hint     = overlay.querySelector('#share-hint');

  let blob = null;

  const hide = () => overlay.classList.remove('show');

  const show = async (data) => {
    overlay.classList.add('show');
    actions.innerHTML = '<span class="share-loading">Rendering…</span>';
    hint.textContent = '';
    try {
      await renderShareCard(canvas, data);
      blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('toBlob returned null');   // iOS Safari under memory pressure → share-err path
      buildActions(data);
    } catch (e) {
      actions.innerHTML = '<span class="share-err">Couldn\'t build the card.</span>';
    }
  };

  const download = (data) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = shareFilename(data); a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const buildActions = (data) => {
    const file = new File([blob], shareFilename(data), { type: 'image/png' });
    const canShareFiles = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    const coarsePointer = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    const useShare = pickShareMethod({ canShareFiles, coarsePointer }) === 'share';   // native sheet on touch only

    const btns = [];
    if (useShare) btns.push('<button id="share-do" class="share-primary">↗ Share</button>');
    btns.push('<button id="share-dl">⬇ Download</button>');
    btns.push('<button id="share-copy">🔗 Copy link</button>');
    actions.innerHTML = btns.join('');
    hint.textContent = 'Post it anywhere — the QR takes people straight to the game.';

    if (useShare) overlay.querySelector('#share-do').addEventListener('click', async () => {
      sfx.tap();
      try { await navigator.share({ files: [file], text: buildShareText(data), url: SHARE_URL }); }
      catch (e) { /* user dismissed the share sheet — nothing to do */ }
    });
    overlay.querySelector('#share-dl').addEventListener('click', () => { sfx.tap(); download(data); });
    const copyBtn = overlay.querySelector('#share-copy');
    copyBtn.addEventListener('click', async () => {
      sfx.tap();
      try {
        await navigator.clipboard.writeText(SHARE_URL);
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => { copyBtn.textContent = '🔗 Copy link'; }, 2000);
      } catch (e) { copyBtn.textContent = SHARE_URL; }
    });
  };

  overlay.querySelector('#share-close').addEventListener('click', () => { sfx.tap(); hide(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) hide(); });
  const onKey = e => { if (e.key === 'Escape' && overlay.classList.contains('show')) { e.preventDefault(); hide(); } };
  addEventListener('keydown', onKey);

  const destroy = () => { removeEventListener('keydown', onKey); overlay.remove(); };

  return { show, hide, destroy };
};
