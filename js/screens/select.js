// Garage / car-select screen — logic extracted verbatim from select.html's inline module (SPA
// Phase A). Coverflow car carousel, per-car equipped look, stat bars, two-tap buy, Race/Start CTA.
//
// This is the first screen with a NON-trivial destroy(): the inline script attached window
// keydown + resize listeners, ran an uncancellable neon-animation rAF loop, subscribed to
// onEmotionReady without keeping the unsubscribe, and armed a buy-confirm setTimeout. destroy()
// now tears all of those down (via the on() accumulator + captured rAF id / unsub / timer) and
// clears the cards + dots it created, so a future re-mount leaves nothing dangling. Per-card /
// dot / nav / gear listeners stay direct: they live on elements this screen creates and are
// dropped when destroy() empties #cars / #car-dots (verbatim with the original).
import { CARS } from '../config.js';
import { ownedFirstOrder } from '../car-order.js';
import { garage, save, wallet, carLook, carOwned, buyCar } from '../store.js';
import { drawCarPreview, CANVAS_W, CANVAS_H } from '../car-preview.js';
import { onEmotionReady } from '../emotion-overlay.js';
import { initWalletHistory } from '../wallet-history.js';
import { TRACKS } from '../track-registry.js';
import { flushAchievementToasts, showAchievementToasts } from '../ach-toast.js';
import { syncStateAchievements } from '../ach-sync.js';
import { speedRating, handlingRating, accRating } from '../car-stats.js';
import { sfx, tapThenGo, soundThenGo } from '../sound.js';

export const createSelectScreen = (root = document, route = null) => {
  const $ = (id) => root.getElementById(id);

  const listeners = [];
  const on = (el, type, fn, opts) => { el.addEventListener(type, fn, opts); listeners.push([el, type, fn, opts]); };
  let neonRaf = 0;
  let emotionOff = null;

  // Params come from the SPA router (a parsed hash route) or, when this runs as the standalone
  // select.html page, from the query string. Downstream reads params.get(...) either way, and
  // modifyHref rebuilds the child URL from `params`, so both paths carry track/mode/dir forward.
  const params = new URLSearchParams();
  if (route) {
    if (route.track) params.set('track', route.track);
    if (route.mode)  params.set('mode', route.mode);
    if (route.dir === 'rev') params.set('dir', 'rev');
  } else {
    for (const [k, v] of new URLSearchParams(location.search)) params.set(k, v);
  }
  const trackId   = params.get('track');                          // e.g. 'green-study'
  const rawMode   = params.get('mode');                           // 'zen', 'sandbox', or null
  const isZen     = rawMode === 'zen';
  const reversed  = params.get('dir') === 'rev';                   // reversed track variant
  const mode      = trackId ? 'timeattack' : (rawMode || 'sandbox');
  const trackMeta = trackId ? TRACKS.find(t => t.id === trackId) : null;
  // Sandbox is a free test-drive: every car is drawn STOCK (no saved paint/neon/finish) and
  // there's no Modify/tuning. Customisation belongs to Time Attack.
  const isSandbox = mode === 'sandbox';
  // Races (Time Attack / Zen) require owning the car; sandbox lets you drive any car free.
  const gated = !isSandbox;

  // Back button leads to track list (if we came from there) or to the main menu
  const backLink = $('backLink');
  backLink.href = isZen ? 'zen.html' : trackMeta ? 'tracks.html' : 'index.html';
  on(backLink, 'click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); soundThenGo(e.currentTarget.getAttribute('href'), 'back');
  });

  $('mode-title').textContent =
    trackMeta ? trackMeta.name : mode === 'sandbox' ? 'Sandbox' : 'Time Attack';

  if (isZen) $('raceBtn').textContent = 'Start Zen';
  if (isSandbox) $('ts-sub').textContent = 'Free test drive · stock cars';

  // Wallet HUD + tap-for-history
  $('wallet-amount').textContent = wallet();
  initWalletHistory(root.querySelector('.wallet-pill'));

  // ── Selected car (each car keeps its OWN look — see carLook) ──────────────────
  const g = garage();
  g.carIndex = Math.max(0, Math.min(g.carIndex ?? 0, CARS.length - 1));
  let sel = g.carIndex;                 // the active (centred) car — a real CARS index (identity)
  let downX = null, moved = false;      // pointer-drag state for swiping the carousel

  // Display permutation: owned cars sort to the front for convenience. `sel` stays a canonical CARS
  // index (selection/records/looks are index-keyed); only the visual LAYOUT + neighbour STEPPING go
  // through `order` (display position → CARS index) / `disp` (CARS index → display position).
  let order = [], disp = [];
  const rebuildOrder = () => {
    order = ownedFirstOrder(CARS, (M) => carOwned(M.id));
    disp = [];
    order.forEach((ci, p) => { disp[ci] = p; });
  };
  rebuildOrder();
  const stepTo = (delta) => setActive(order[Math.max(0, Math.min(disp[sel] + delta, order.length - 1))]);

  // Draw one car card with its per-car equipped look, without clobbering the factory
  // default body colour on the shared CARS descriptor. In sandbox the car is STOCK.
  const drawCard = (M, i, phase = 0) => {
    if (isSandbox) { drawCarPreview(cards[i].cvs, M, null, null, null, phase); return; }
    const look = carLook(i);
    const orig = M.body;
    M.body = look.bodyColor || orig;
    drawCarPreview(cards[i].cvs, M, look.neon ?? (look.neonColor || null), look.finish || null, null, phase, look.glassColor || null, look.outlineColor || null, look.expression || null);
    M.body = orig;
  };

  // A car's neon underglow animates when its config has a non-static animation
  // (pulse / rainbow / flow). Legacy string colours and solid/none never animate.
  const neonAnimated = (i) => { const n = carLook(i).neon; return !!(n && n.anim && n.anim !== 'none'); };

  // ── Stat bars (0–10 cells) — ratings come from the shared pure js/car-stats.js ─
  const makeStatRow = (label, n, cls) => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    const lbl = document.createElement('span');
    lbl.className = 'stat-lbl'; lbl.textContent = label;
    const bar = document.createElement('div');
    bar.className = 'stat-bar';
    for (let i = 0; i < 10; i++) {
      const cell = document.createElement('div');
      cell.className = 'stat-cell' + (i < n ? ' ' + cls : '');
      bar.appendChild(cell);
    }
    row.appendChild(lbl); row.appendChild(bar);
    return row;
  };

  // ── Car cards (pick a car; gear opens the modify screen) ──────────────────────
  const carsEl = $('cars');

  // Gear → modify.html for that car, carrying the current track/mode params.
  const modifyHref = (i) => {
    const p = new URLSearchParams(params);
    p.set('car', i);
    return 'modify.html?' + p.toString();
  };

  const DPR = Math.min(2, window.devicePixelRatio || 1);   // crisp card previews on retina (CSS sizes the display)
  const cards = CARS.map((M, i) => {
    const card = document.createElement('div');
    card.className = 'car-card' + (i === sel ? ' sel' : '');

    const cvs = document.createElement('canvas');
    cvs.width  = Math.round(CANVAS_W * DPR);
    cvs.height = Math.round(CANVAS_H * DPR);
    card.appendChild(cvs);

    // Modify (gear) — opens the per-car customization screen. The gear glyph is the
    // accent-coloured icons/settings.svg, applied via CSS mask (see .car-modify).
    // Hidden in sandbox: a test-drive has no tuning.
    if (!isSandbox) {
      const gear = document.createElement('a');
      gear.className = 'car-modify';
      gear.href      = modifyHref(i);
      gear.title     = 'Modify';
      gear.setAttribute('aria-label', 'Modify');
      gear.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); tapThenGo(gear.getAttribute('href')); });  // tap → open modify
      gear.addEventListener('pointerdown', (e) => e.stopPropagation()); // don't start a carousel drag (which captures the pointer + eats the link click)
      card.appendChild(gear);
    }

    const stats = document.createElement('div');
    stats.className = 'car-stats';
    stats.appendChild(makeStatRow('spd', speedRating(M._drive),    'spd'));
    stats.appendChild(makeStatRow('hdl', handlingRating(M._drive), 'hdl'));
    stats.appendChild(makeStatRow('acc', accRating(M._drive),      'acc'));
    card.appendChild(stats);

    const nm = document.createElement('div');
    nm.className   = 'car-name';
    nm.textContent = M.name;
    card.appendChild(nm);

    // Locked overlay for a paid car you don't own yet (races only; shown via .is-locked).
    if (gated && M.price) {
      const lock = document.createElement('div');
      lock.className = 'car-lock';
      lock.innerHTML = `<span class="car-lock-ico">🔒</span><span class="car-lock-price">🛞${M.price}</span>`;
      card.appendChild(lock);
    }

    card.addEventListener('click', () => { if (!moved) setActive(i); });   // tap a neighbour to select it
    carsEl.appendChild(card);
    return { card, cvs };
  });

  // ── Coverflow carousel: the active (centred) car is the selected car ──────────
  let dragDX = 0, dragging = false;    // live-drag offset while swiping

  const dotsEl = $('car-dots');
  const dots = CARS.map((_, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'car-dot' + (i === sel ? ' is-on' : '');
    d.setAttribute('aria-label', `Car ${i + 1}`);
    d.addEventListener('click', () => setActive(i));
    dotsEl.appendChild(d);
    return d;
  });

  // Circular prev/next arrows, layered on top of the back cards (easy tap targets).
  const mkNav = (cls, sym, delta) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'car-nav ' + cls;
    b.textContent = sym;
    b.setAttribute('aria-label', cls === 'prev' ? 'Previous car' : 'Next car');
    b.addEventListener('pointerdown', (e) => e.stopPropagation());   // don't start a carousel drag
    b.addEventListener('click', () => stepTo(delta));
    carsEl.appendChild(b);
    return b;
  };
  const navPrev = mkNav('prev', '❮', -1);
  const navNext = mkNav('next', '❯', +1);

  const stepPx = () => (cards[0].card.offsetWidth || 260) * 0.6;   // adjacent centres — ~40% overlap

  // Neighbours shown per side: 2 on desktop (5 cards), 1 on mobile (3).
  const mq = matchMedia('(max-width: 560px)');
  const sideCount = () => (mq.matches ? 1 : 2);

  // Place every card by its distance from the active index (+ any live drag): active = big +
  // centred, neighbours shrink + fade + sit behind, far cards hidden. While dragging we reveal
  // one extra card each side so the incoming car slides in instead of popping.
  const layout = () => {
    const base = sideCount();
    const side = base + (dragging ? 1 : 0);
    const step = stepPx();
    cards.forEach((c, i) => {
      const pos  = disp[i] - disp[sel];                       // 0 = centre, ±1 neighbour, … (display space)
      const abs  = Math.abs(pos);
      const scale = Math.max(0.5, 1 - abs * 0.16);            // shrink neighbours
      const el = c.card;
      el.style.transform = `translate(-50%, -50%) translateX(${pos * step + dragDX}px) scale(${scale})`;
      el.style.zIndex = String(100 - abs);                    // active on top, neighbours behind
      el.style.opacity = abs <= side ? '1' : '0';
      el.style.filter = abs === 0 ? 'none' : `brightness(${1 - abs * 0.18})`;
      el.style.pointerEvents = abs <= base ? 'auto' : 'none';
      el.classList.toggle('sel', pos === 0 && !dragging);
      el.classList.toggle('is-locked', gated && !!CARS[i].price && !carOwned(CARS[i].id));
    });
    dots.forEach((d, j) => { d.style.order = disp[j]; d.classList.toggle('is-on', j === sel); });
    navPrev.classList.toggle('is-off', disp[sel] === 0);
    navNext.classList.toggle('is-off', disp[sel] === order.length - 1);
    updateCTA();
  };

  // The main button is "Race!" for an owned car, or a two-tap "Buy → Confirm?" when the
  // centred car is locked (so a purchase is never a single accidental tap).
  const raceBtn = $('raceBtn');
  const walletEl = $('wallet-amount');
  const carLocked = (i) => gated && !!CARS[i].price && !carOwned(CARS[i].id);
  let buyArmed = false, armTimer = null;
  const disarm = () => { buyArmed = false; clearTimeout(armTimer); };
  const updateCTA = () => {
    if (carLocked(sel)) {
      const price = CARS[sel].price;
      const afford = wallet() >= price;
      raceBtn.textContent = (buyArmed && afford) ? `Confirm buy? 🛞${price}` : `🔒 Buy 🛞${price}`;
      raceBtn.classList.toggle('cant-afford', !afford);
      raceBtn.classList.toggle('confirm', buyArmed && afford);
    } else {
      raceBtn.textContent = isZen ? 'Start Zen' : 'Race! 🏁';
      raceBtn.classList.remove('cant-afford', 'confirm');
    }
  };

  const setActive = (i) => {
    i = Math.max(0, Math.min(i, CARS.length - 1));
    dragDX = 0;
    disarm();                              // switching cars cancels a pending buy-confirm
    if (i === sel) { layout(); return; }
    sel = i;
    sfx.select();                          // soft cue when the chosen car changes
    garage().carIndex = i; save();
    layout();
  };

  // Live drag: the strip follows the finger, then snaps to the nearest card on release.
  on(carsEl, 'pointerdown', (e) => {
    downX = e.clientX; moved = false; dragging = true;
    carsEl.classList.add('dragging');
    carsEl.setPointerCapture?.(e.pointerId);
  });
  on(carsEl, 'pointermove', (e) => {
    if (downX == null) return;
    dragDX = e.clientX - downX;
    if (Math.abs(dragDX) > 6) moved = true;
    layout();
  });
  const endDrag = (e) => {
    if (downX == null) return;
    const dx = (e.clientX ?? downX) - downX;
    downX = null; dragging = false;
    carsEl.classList.remove('dragging');
    stepTo(Math.round(-dx / stepPx()));            // snap to the nearest card in display order
  };
  on(carsEl, 'pointerup', endDrag);
  on(carsEl, 'pointercancel', endDrag);

  // Arrow keys + breakpoint/resize re-layout (desktop 5 ↔ mobile 3).
  on(window, 'keydown', (e) => {
    if (e.key === 'ArrowLeft')  stepTo(-1);
    if (e.key === 'ArrowRight') stepTo(+1);
  });
  on(window, 'resize', layout);

  // ── Race / Buy button ─────────────────────────────────────────────────────────
  on(raceBtn, 'click', () => {
    // Locked (paid, unowned, gated mode) → buy it here instead of racing (two-tap confirm).
    if (carLocked(sel)) {
      const car = CARS[sel];
      if (wallet() < car.price) { sfx.deny(); updateCTA(); return; }  // can't afford → soft deny, price stays
      if (!buyArmed) {                                              // 1st tap → arm "Confirm buy?"
        buyArmed = true; updateCTA(); sfx.tap();
        armTimer = setTimeout(() => { buyArmed = false; updateCTA(); }, 3000);   // auto-cancel
        return;
      }
      disarm();                                                     // 2nd tap → commit
      if (!buyCar(car.id, car.price).ok) { updateCTA(); return; }
      sfx.buy();
      showAchievementToasts(syncStateAchievements());               // celebrate New Wheels / Full Garage
      walletEl.textContent = wallet();                              // reflect price paid − any reward
      rebuildOrder();                                               // the just-bought car joins the owned group
      layout();                                                     // drop the lock overlay, flip the CTA to Race
      return;
    }
    garage().carIndex = sel; save();
    const dirParam = reversed ? '&dir=rev' : '';
    // Sandbox (no track) now runs in-document as the game screen too (game.html?mode=sandbox → the
    // shell maps it to #/game?mode=sandbox), so exiting it no longer reloads the document.
    const dest = isZen ? `game.html?track=${trackMeta.id}&mode=zen`
                       : (trackMeta ? `game.html?track=${trackMeta.id}${dirParam}` : 'game.html?mode=sandbox');
    soundThenGo(dest, 'tap');   // tap, then start the race (deferred so the sound isn't cut)
  });

  // ── Initial render — each car shows its own per-car look ──────────────────────
  CARS.forEach((M, i) => drawCard(M, i));
  // Emotion overlays load async; repaint the cards once a bitmap arrives (animated cards self-repaint).
  emotionOff = onEmotionReady(() => CARS.forEach((M, i) => drawCard(M, i)));
  layout();   // position the coverflow around the saved car

  // Live loop: re-draw only the cards whose neon animates, so pulse/rainbow/flow
  // move on the garage cards just like in the modify preview and in-race. Cards
  // without an animated neon are drawn once above; if none animate, no loop runs.
  // (Sandbox draws stock cars, so nothing animates there.)
  const animatedCards = isSandbox ? [] : CARS.map((_, i) => i).filter(neonAnimated);
  if (animatedCards.length) {
    const tick = () => {
      const phase = performance.now() / 1000;
      for (const i of animatedCards) drawCard(CARS[i], i, phase);
      neonRaf = requestAnimationFrame(tick);
    };
    neonRaf = requestAnimationFrame(tick);
  }

  // Celebrate anything a shop purchase just unlocked (stashed on Apply in modify.html).
  flushAchievementToasts();

  const destroy = () => {
    cancelAnimationFrame(neonRaf);
    if (emotionOff) emotionOff();
    disarm();   // clears the buy-confirm armTimer
    while (listeners.length) { const [el, type, fn, opts] = listeners.pop(); el.removeEventListener(type, fn, opts); }
    carsEl.innerHTML = '';    // remove the cards + nav buttons this screen created
    dotsEl.innerHTML = '';    // remove the dots
  };
  return { destroy };
};
