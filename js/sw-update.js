// Service-worker registration + a small "new version available" nudge.
//
// Replaces the old inline `navigator.serviceWorker.register('./sw.js')` that lived in every
// page. Registers with { updateViaCache: 'none' } so the browser never serves a stale sw.js
// out of the HTTP cache, actively re-checks for updates whenever the app returns to the
// foreground (fixes the iOS-PWA warm-resume case where a relaunch never cold-reloads), and
// when a fresh worker has installed and is WAITING to take over — and only when an old worker
// is still in control, i.e. a real update, never the first install — shows a tap-to-refresh
// toast. Tapping messages the waiting worker to skipWaiting, then reloads once it takes over.
//
// Offline-safe by construction: `reg.update()` and the update fetch fail silently with no
// network, `updatefound` only fires after the browser successfully downloads a changed sw.js,
// and a worker only reaches 'installed' after its install (addAll) completes — which needs the
// network. So offline → no toast, and the already-cached app keeps running untouched. Every
// entry point is guarded/caught, so a browser without service workers (or a failed
// registration) silently falls back to today's behaviour with no error.

// Pure (unit-tested): should we show the nudge? Only when a new worker has finished installing
// AND one is already controlling the page — a genuine update, never the very first install.
export const shouldNudge = (state, hasController) => state === 'installed' && hasController;

// Pure (unit-tested): is this a live-driving page? The toast sits fixed bottom-centre over the
// touch-steering canvas there, and a mis-tap = location.reload() = lost race — so gameplay pages
// suppress it. The waiting worker persists, so the nudge shows on the next menu page instead.
export const isGameplayPage = (pathname) => /(?:^|\/)(?:game|sandbox)\.html$/.test(pathname || '');

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  const sw = navigator.serviceWorker;
  let userTriggered = false, reloading = false;

  // Reload once the new worker takes control — but only after the user opted in, so we never
  // reload on the first-install claim or auto-yank the page out from under someone mid-race.
  sw.addEventListener('controllerchange', () => {
    if (!userTriggered || reloading) return;
    reloading = true;
    location.reload();
  });

  const injectStyle = () => {
    if (document.getElementById('sw-update-style')) return;
    const s = document.createElement('style');
    s.id = 'sw-update-style';
    s.textContent = `
#sw-update{position:fixed;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translate(-50%,24px);opacity:0;z-index:2147483000;display:flex;max-width:min(92vw,360px);font-family:var(--font-body,-apple-system,system-ui,sans-serif);transition:opacity .3s ease,transform .3s cubic-bezier(.2,.8,.2,1);}
#sw-update.is-in{opacity:1;transform:translate(-50%,0);}
#sw-update.is-out{opacity:0;transform:translate(-50%,24px);}
#sw-update button{border:1px solid var(--accent-line,rgba(255,177,77,.4));background:linear-gradient(180deg,var(--bg-raise,#2a2622),var(--bg-mid,#14110f));color:var(--ink,#f4ede2);cursor:pointer;}
#sw-update-go{display:flex;align-items:center;gap:11px;padding:11px 14px;border-right:0;border-radius:14px 0 0 14px;text-align:left;box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 22px var(--accent-tint,rgba(255,177,77,.1));}
#sw-update-go .dot{flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:var(--accent,#ffb14d);box-shadow:0 0 8px var(--accent-glow,rgba(255,177,77,.7));animation:sw-pulse 1.6s ease-in-out infinite;}
#sw-update-go .txt{display:flex;flex-direction:column;gap:1px;line-height:1.2;}
#sw-update-go .txt b{font-size:13px;font-weight:800;}
#sw-update-go .txt span{font-size:11px;opacity:.7;}
#sw-update.is-busy #sw-update-go{opacity:.6;pointer-events:none;}
#sw-update-x{padding:0 12px;border-left:0;border-radius:0 14px 14px 0;box-shadow:0 10px 30px rgba(0,0,0,.45);opacity:.55;font-size:20px;line-height:1;}
#sw-update-x:hover{opacity:1;}
@keyframes sw-pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
@media (prefers-reduced-motion:reduce){#sw-update{transition:opacity .2s ease;transform:translate(-50%,0);}#sw-update-go .dot{animation:none;}}`;
    document.head.appendChild(s);
  };

  const nudge = (worker) => {
    if (isGameplayPage(location.pathname)) return;                 // never over live driving
    if (!worker || document.getElementById('sw-update')) return;   // one toast at a time
    injectStyle();
    const el = document.createElement('div');
    el.id = 'sw-update';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<button id="sw-update-go" type="button"><span class="dot"></span>' +
      '<span class="txt"><b>New version available</b><span>Tap to update</span></span></button>' +
      '<button id="sw-update-x" type="button" aria-label="Dismiss">×</button>';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));

    el.querySelector('#sw-update-go').addEventListener('click', () => {
      userTriggered = true;
      el.classList.add('is-busy');
      try { worker.postMessage({ type: 'SKIP_WAITING' }); } catch { /* fall through to the timeout */ }
      // Fallback: if controllerchange never lands (browser quirk), reload anyway.
      setTimeout(() => { if (!reloading) { reloading = true; location.reload(); } }, 2000);
    });
    el.querySelector('#sw-update-x').addEventListener('click', () => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 400);
    });
  };

  sw.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
    // A worker may already be waiting from an update check on a previous page.
    if (reg.waiting && sw.controller) nudge(reg.waiting);

    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (shouldNudge(nw.state, !!sw.controller)) nudge(reg.waiting || nw);
      });
    });

    // Actively re-check for a new worker each time the app is brought to the foreground.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => { /* registration failed — the app still runs, just without offline caching */ });
}
