// Settings "Profile / Sync" wiring — export the full save as a portable code or a
// downloadable file, and import one (replacing local progress after a confirm) so a player
// can move progress between devices. Pure codec lives in js/profile-io.js; all persistence
// goes through js/store.js. Call initProfileSync() once after the settings DOM exists.
import { snapshot, replaceAll } from './store.js';
import { encodeProfile, decodeProfile, profileJson } from './profile-io.js';

const $ = (id) => document.getElementById(id);

// Transient status line under the controls: green = success, red = problem, auto-fades.
const flash = (el, msg, ok = true) => {
  el.textContent = msg;
  el.style.color = ok ? 'var(--accent)' : '#ff6b6b';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 3200);
};

export const initProfileSync = () => {
  const status = $('profile-status');
  const input  = $('profile-input');

  // ── Export ──────────────────────────────────────────────────────────────────
  $('btn-profile-copy').addEventListener('click', async () => {
    const code = encodeProfile(snapshot());
    try {
      await navigator.clipboard.writeText(code);
      flash(status, '✓ Profile code copied — paste it on the other device');
    } catch {
      // No clipboard permission/API — drop the code into the box so it can be copied manually.
      input.value = code;
      input.focus(); input.select();
      flash(status, 'Copy the code from the box below', false);
    }
  });

  $('btn-profile-download').addEventListener('click', () => {
    const blob = new Blob([profileJson(snapshot())], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'desktopdrift-profile.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flash(status, '✓ Profile file downloaded');
  });

  // ── Import (destructive — replaces this device's progress) ────────────────────
  const doImport = (text) => {
    let profile;
    try { profile = decodeProfile(text); }
    catch (e) { flash(status, e.message, false); return; }
    const ok = window.confirm(
      'Import this profile?\n\n' +
      'It REPLACES all progress on this device — cars, unlocks, records and tire coins. ' +
      'Export your current profile first if you want to keep it.'
    );
    if (!ok) return;
    if (!replaceAll(profile)) { flash(status, 'This is not a Desktop Drift profile.', false); return; }
    // Reload so every module re-reads the imported save from scratch (see store.replaceAll).
    location.reload();
  };

  $('btn-profile-import').addEventListener('click', () => doImport(input.value));

  $('profile-file').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload  = () => doImport(String(reader.result));
    reader.onerror = () => flash(status, 'Could not read that file.', false);
    reader.readAsText(file);
    e.target.value = '';   // reset so choosing the same file again still fires 'change'
  });
};
