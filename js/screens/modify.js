// Car-modify / customization screen — logic extracted verbatim from modify.html's inline module
// (SPA Phase A). Body colour, Neon FX (on/off + layout + per-zone colours + animation), the shop
// (finish / trail / glass / outline / Moods) with a cart, a live preview, and Apply/Buy.
//
// destroy() tears down what the inline script left dangling: the preview rAF loop, the
// onEmotionReady subscription (its unsubscribe was discarded), and the persistent listeners
// (backLink, neon toggle, tabs, Apply) via the on() accumulator. It ALSO restores M.body:
// draw() mutates the shared CARS[carIdx].body and never puts it back (harmless in the MPA where
// the document unloads, but it would leak the pending colour into other screens once they share a
// document — the risk the SPA analysis flagged). draw() stays byte-for-byte as the original
// (mutating, no restore) so Phase A is a pure 1:1 extraction; the restore lives only in destroy(),
// which nothing calls until the Phase-B router — so it is inert at mount.
import { CARS } from '../config.js';
import { PALETTE, NEON_PALETTE } from '../palette.js';
import { garage, save, wallet, isOwned, purchase, carLook } from '../store.js';
import { CATALOG, byKind } from '../shop-catalog.js';
import { syncStateAchievements } from '../ach-sync.js';
import { queueAchievementToasts } from '../ach-toast.js';
import { drawCarPreview } from '../car-preview.js';
import { onEmotionReady } from '../emotion-overlay.js';
import { LAYOUTS, ANIMS, defaultNeon } from '../neon.js';
import { initWalletHistory } from '../wallet-history.js';
import { sfx, soundThenGo } from '../sound.js';

export const createModifyScreen = (root = document, route = null) => {
  const $ = (id) => root.getElementById(id);

  const listeners = [];
  const on = (el, type, fn, opts) => { el.addEventListener(type, fn, opts); listeners.push([el, type, fn, opts]); };
  let emotionOff = null;

  // Params come from the SPA router (a parsed hash route) or, standalone (modify.html), the query
  // string. carIdx + the backHref (select.html minus car) rebuild from `params` either way.
  const params = new URLSearchParams();
  if (route) {
    if (route.track) params.set('track', route.track);
    if (route.mode)  params.set('mode', route.mode);
    if (route.dir === 'rev') params.set('dir', 'rev');
    if (route.car != null) params.set('car', String(route.car));
  } else {
    for (const [k, v] of new URLSearchParams(location.search)) params.set(k, v);
  }
  const carIdx = Math.max(0, Math.min(parseInt(params.get('car'), 10) || 0, CARS.length - 1));
  const M = CARS[carIdx];
  const factoryBody = M.body;   // the car's STOCK colour — used when no custom body colour is picked

  // Cancel returns to the garage, preserving the track/mode context.
  const back = new URLSearchParams(params); back.delete('car');
  const backHref = 'select.html' + (back.toString() ? '?' + back.toString() : '');
  const backLink = $('backLink');
  backLink.href = backHref;
  on(backLink, 'click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); soundThenGo(e.currentTarget.getAttribute('href'), 'back');
  });

  $('car-name').textContent = M.name;

  // ── Pending look (in-memory; committed only on Apply / Buy) ───────────────────
  // Loaded from THIS car's saved look (per-car). Purchases stay account-wide.
  const look = carLook(carIdx);
  const pending = {
    body:    look.bodyColor ?? null,   // null = stock (factory colour)
    neonOn:  !!look.neon,
    // Neon FX config — a working copy so nothing is written to the store before Apply.
    neonCfg: look.neon
      ? { layout: look.neon.layout, anim: look.neon.anim, colors: (look.neon.colors || []).slice(), speed: look.neon.speed ?? 1 }
      : defaultNeon(NEON_PALETTE[0].hex),
    finish:  look.finish ?? null,
    trail:   look.trailColor ?? null,
    glass:   look.glassColor ?? null,
    outline: look.outlineColor ?? null,
    expression: look.expression ?? null,   // Moods face overlay id, or null = None (no face)
  };

  const itemFor = (kind, value) =>
    value ? CATALOG.find(c => c.kind === kind && c.value === value) : null;

  $('wallet-amount').textContent = wallet();
  initWalletHistory(root.querySelector('.wallet-pill'));

  // ── Preview (reflects the pending look) ───────────────────────────────────────
  const previewCvs = $('preview');
  const DPR = Math.min(2, window.devicePixelRatio || 1);   // crisp on retina (CSS sizes the display)
  previewCvs.width  = Math.round(440 * DPR);
  previewCvs.height = Math.round(164 * DPR);

  // The trail preview only shows on the Trail tab (when a colour is picked); there it
  // animates via requestAnimationFrame, otherwise the car is drawn once and centred.
  let activeTab = 'colour';
  let phase = 0, rafId = null;
  const trailNow = () => (activeTab === 'trail' ? pending.trail : null);
  const neonNow  = () => (pending.neonOn ? pending.neonCfg : null);
  // The preview loop must run whenever something animates: the drift trail (Trail tab)
  // OR the neon underglow with a live animation (pulse / rainbow / flow). Otherwise draw once.
  const neonAnimating = () => pending.neonOn && pending.neonCfg.anim !== 'none';
  const draw = () => {
    M.body = pending.body ?? factoryBody;   // stock colour when nothing custom is picked
    drawCarPreview(previewCvs, M, neonNow(), pending.finish, trailNow(), phase, pending.glass, pending.outline, pending.expression);
  };
  const loop = (ts) => { phase = ts * 0.001; draw(); rafId = requestAnimationFrame(loop); };
  const redraw = () => {
    if (trailNow() || neonAnimating()) { if (rafId == null) rafId = requestAnimationFrame(loop); }   // animate
    else { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } draw(); }
  };

  // ── Body colour (free → just updates the pending look) ────────────────────────
  const bodyPaletteEl = $('body-palette');
  const bodyName      = $('body-name');
  // Mark the swatch matching the pending body colour; none selected = STOCK (factory colour).
  const refreshBody = () => {
    const idx = PALETTE.findIndex(p => p.hex.toLowerCase() === (pending.body || '').toLowerCase());
    bodyEls.forEach((e, j) => e.classList.toggle('sel', j === idx));
    bodyName.textContent = idx >= 0 ? PALETTE[idx].name : 'Stock';
  };
  const bodyEls = PALETTE.map((entry) => {
    const el = document.createElement('div');
    el.className = 'swatch';
    el.style.background = entry.hex;
    el.title = entry.name;
    el.addEventListener('click', () => {
      // Toggle: tapping the selected colour again clears it back to stock (like the shop parts).
      pending.body = (pending.body || '').toLowerCase() === entry.hex.toLowerCase() ? null : entry.hex;
      refreshBody();
      redraw();
      sfx.pick();
    });
    bodyPaletteEl.appendChild(el);
    return el;
  });
  refreshBody();

  // ── Neon FX underglow (on/off + layout + per-zone colours + animation) ────────
  // On/off toggle, a layout selector (locked layouts cart their catalog item), N
  // per-zone colour pickers (N = the layout's colour count), and an animation
  // selector (locked anims cart too). Every change feeds the live preview via redraw().
  const neonBtn      = $('neon-btn');
  const neonControls = $('neon-controls');
  const colorsWrap   = $('neon-colors');

  // Colour-slot labels per layout (clockwise zone roles for per-zone).
  const ZONE_LABELS = {
    solid:            ['Colour'],
    longitudinal:     ['Left', 'Right'],
    'front-mid-rear': ['Front', 'Sides', 'Rear'],
    'per-zone':       ['Front L', 'Front R', 'Right', 'Rear R', 'Rear L', 'Left'],
  };
  const layoutColourCount = (id) => (LAYOUTS.find(l => l.id === id) || LAYOUTS[0]).colours;

  // Pad/truncate the pending colours to `n` slots (new slots default to the first palette hue),
  // preserving already-chosen colours when the layout changes.
  const fitColours = (n) => {
    const cols = pending.neonCfg.colors.slice(0, n);
    while (cols.length < n) cols.push(NEON_PALETTE[0].hex);
    pending.neonCfg.colors = cols;
  };
  fitColours(layoutColourCount(pending.neonCfg.layout));

  // Selected-but-unowned neon items (layout + anim) that go into the shop cart — only
  // while the underglow is on. Free options (solid / none) aren't in the catalog → null.
  const neonCartItems = () => {
    if (!pending.neonOn) return [];
    const out = [];
    const li = itemFor('neon-layout', pending.neonCfg.layout);
    const ai = itemFor('neon-anim',   pending.neonCfg.anim);
    if (li && !isOwned(li.id)) out.push(li);
    if (ai && !isOwned(ai.id)) out.push(ai);
    return out;
  };

  // Per-zone colour pickers — one NEON_PALETTE swatch row per layout colour slot.
  const renderColors = () => {
    colorsWrap.innerHTML = '';
    const n = layoutColourCount(pending.neonCfg.layout);
    const labels = ZONE_LABELS[pending.neonCfg.layout] || [];
    for (let i = 0; i < n; i++) {
      const row = document.createElement('div');
      row.className = 'finish-sub';
      const lab = document.createElement('div');
      lab.className = 'cust-sublabel';
      lab.textContent = labels[i] || String(i + 1);
      row.appendChild(lab);
      const grid = document.createElement('div');
      grid.className = 'swatch-grid';
      NEON_PALETTE.forEach((entry, j) => {
        const sw = document.createElement('div');
        sw.className = 'swatch' + (entry.hex === pending.neonCfg.colors[i] ? ' sel' : '');
        sw.style.background = entry.hex;
        sw.title = entry.name;
        sw.addEventListener('click', () => {
          pending.neonCfg.colors[i] = entry.hex;
          pending.neonOn = true;
          [...grid.children].forEach((c, k) => c.classList.toggle('sel', k === j));
          refresh(); redraw();
          sfx.pick();
        });
        grid.appendChild(sw);
      });
      row.appendChild(grid);
      colorsWrap.appendChild(row);
    }
  };

  // Layout + animation selectors (radio-style shop cards; the free option = solid / none).
  const neonCards = { 'neon-layout': [], 'neon-anim': [] };
  const buildNeonSelector = (descriptors, kind, contId, onPick) => {
    const cont = $(contId);
    for (const d of descriptors) {
      const item = itemFor(kind, d.id);   // null for the free option (not in the catalog)
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'shop-card';
      const nm = document.createElement('span');
      nm.className = 'shop-card-name';
      nm.textContent = d.label;
      el.appendChild(nm);
      const tag = document.createElement('span');
      tag.className = 'shop-card-tag';
      el.appendChild(tag);
      el.addEventListener('click', () => { onPick(d.id); pending.neonOn = true; refresh(); redraw(); sfx.pick(); });
      cont.appendChild(el);
      neonCards[kind].push({ el, tag, item, id: d.id });
    }
  };
  buildNeonSelector(LAYOUTS, 'neon-layout', 'neon-layout', (id) => {
    pending.neonCfg.layout = id;
    fitColours(layoutColourCount(id));
    renderColors();
  });
  buildNeonSelector(ANIMS, 'neon-anim', 'neon-anim', (id) => { pending.neonCfg.anim = id; });

  on(neonBtn, 'click', () => { pending.neonOn = !pending.neonOn; refresh(); redraw(); sfx.tap(); });

  // Reflect the pending neon config onto the panel (toggle, card states, dim when off).
  const refreshNeonGroup = (kind, current) => {
    for (const { el, tag, item, id } of neonCards[kind]) {
      const selected = id === current;
      const own      = item ? isOwned(item.id) : true;      // free options are always available
      const inCart   = selected && item && !own && pending.neonOn;
      el.classList.toggle('sel', selected);
      el.classList.toggle('owned', own);
      el.classList.toggle('in-cart', inCart);
      tag.textContent = !item || own
        ? '✓'                                            // owned / free → always show the check
        : (selected && pending.neonOn ? `🛒🛞${item.price}` : `🛞${item.price}`);
    }
  };
  const refreshNeon = () => {
    neonBtn.classList.toggle('active', pending.neonOn);
    neonBtn.style.setProperty('--nc', pending.neonCfg.colors[0] || NEON_PALETTE[0].hex);
    neonBtn.textContent = pending.neonOn ? '✦ Underglow: On' : '✦ Underglow: Off';
    neonControls.style.opacity = pending.neonOn ? '1' : '.45';
    refreshNeonGroup('neon-layout', pending.neonCfg.layout);
    refreshNeonGroup('neon-anim',   pending.neonCfg.anim);
  };
  renderColors();

  // ── Shop: finishes + trail colours (paid → cart) ──────────────────────────────
  // Tapping toggles the item into the pending look. Owned items apply for free;
  // unowned items go into the cart (checkmark) and are bought together on Apply.
  const FIELD = { finish: 'finish', trail: 'trail', glass: 'glass', outline: 'outline', expression: 'expression' };   // catalog kind → pending field
  const shopCards = [];
  let moodsNone = null;   // the free "None" (no face) card in Moods — not a catalog item
  const applyBtn  = $('applyBtn');
  const warnEl    = $('buy-warning');

  const buildGroup = (kind, contId) => {
    const cont = $(contId);
    for (const item of byKind(kind)) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'shop-card';
      if (kind === 'trail' || kind === 'glass' || kind === 'outline') {   // paid colour categories → colour dot
        const dot = document.createElement('span');
        dot.className = 'shop-dot';
        dot.style.background = item.value;
        el.appendChild(dot);
      }
      const nm = document.createElement('span');
      nm.className = 'shop-card-name';
      nm.textContent = item.name;
      el.appendChild(nm);
      const tag = document.createElement('span');
      tag.className = 'shop-card-tag';
      el.appendChild(tag);
      el.addEventListener('click', () => {
        const f = FIELD[item.kind];
        pending[f] = pending[f] === item.value ? null : item.value;  // toggle
        refresh(); redraw();
        sfx.pick();
      });
      cont.appendChild(el);
      shopCards.push({ el, tag, item });
    }
  };

  // Recompute card states + the cart (unowned selected items) and update the bar.
  // The button keeps its normal label; affordability is communicated by a warning
  // line above the bar (never by disabling/relabelling the button).
  const cartTotal = () => {
    let total = 0; let count = 0;
    for (const { item } of shopCards) {
      if (pending[FIELD[item.kind]] === item.value && !isOwned(item.id)) { total += item.price; count++; }
    }
    for (const it of neonCartItems()) { total += it.price; count++; }   // carted neon layout / anim
    return { total, count };
  };

  const refresh = () => {
    refreshNeon();   // keep the Neon FX panel (toggle + layout/anim cards) in sync
    for (const { el, tag, item } of shopCards) {
      const selected = pending[FIELD[item.kind]] === item.value;
      const own      = isOwned(item.id);
      const inCart   = selected && !own;
      el.classList.toggle('sel', selected);
      el.classList.toggle('owned', own);
      el.classList.toggle('in-cart', inCart);
      tag.textContent = own
        ? '✓'                                            // owned → always show the check
        : (selected ? `🛒🛞${item.price}` : `🛞${item.price}`);
    }
    if (moodsNone) moodsNone.classList.toggle('sel', pending.expression === null);   // None = no face
    const { total, count } = cartTotal();
    const have  = wallet();
    const short = count > 0 && have < total;
    // Total shown on its own line above the bar; the button stays a short label and
    // goes inactive when there aren't enough tires.
    applyBtn.textContent = count ? 'Buy & Apply' : 'Apply';
    applyBtn.disabled    = short;
    warnEl.hidden = count === 0;
    if (count) {
      warnEl.textContent = short
        ? `Total 🛞${total} — not enough (you have 🛞${have})`
        : `Total 🛞${total}`;
      warnEl.classList.toggle('is-short', short);
    }
  };

  buildGroup('finish',  'shop-finish');
  buildGroup('trail',   'shop-trail');
  buildGroup('glass',   'shop-glass');
  buildGroup('outline', 'shop-outline');
  buildGroup('expression', 'shop-moods');
  // Free "None" (no face) card, prepended before the 11 emotions — not a catalog item, so build by hand.
  moodsNone = document.createElement('button');
  moodsNone.type = 'button'; moodsNone.className = 'shop-card';
  moodsNone.innerHTML = '<span class="shop-card-name">None</span><span class="shop-card-tag"></span>';
  moodsNone.addEventListener('click', () => { pending.expression = null; refresh(); redraw(); sfx.pick(); });
  $('shop-moods').prepend(moodsNone);
  // The equipped face overlay loads async — repaint the preview once its bitmap arrives.
  emotionOff = onEmotionReady(() => { if (rafId == null) draw(); });

  // ── Tabs: show one customization panel at a time (Colour / Neon / Trail) ──────
  const tabs   = [...root.querySelectorAll('.shop-tab')];
  const panels = [...root.querySelectorAll('.cust-panel')];
  for (const tab of tabs) {
    on(tab, 'click', () => {
      sfx.tap();
      tabs.forEach(t => t.classList.toggle('is-active', t === tab));
      panels.forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.panel; });
      activeTab = tab.dataset.panel;
      redraw();   // start/stop the trail animation for this tab
    });
  }

  // ── Apply / Buy: purchase carted items, equip the whole look, persist ─────────
  on(applyBtn, 'click', () => {
    const cart = [];
    const fItem = itemFor('finish', pending.finish);
    const tItem = itemFor('trail',  pending.trail);
    const gItem = itemFor('glass',   pending.glass);
    const oItem = itemFor('outline', pending.outline);
    const eItem = itemFor('expression', pending.expression);
    if (fItem && !isOwned(fItem.id)) cart.push(fItem);
    if (tItem && !isOwned(tItem.id)) cart.push(tItem);
    if (gItem && !isOwned(gItem.id)) cart.push(gItem);
    if (oItem && !isOwned(oItem.id)) cart.push(oItem);
    if (eItem && !isOwned(eItem.id)) cart.push(eItem);
    for (const it of neonCartItems()) cart.push(it);           // carted neon layout / anim
    const total = cart.reduce((s, it) => s + it.price, 0);
    if (total > wallet()) { refresh(); return; }               // can't afford → show the warning
    for (const it of cart) { if (!purchase(it).ok) return; }   // abort if any fails
    // Shop achievements fire on buy; stash any newly unlocked so the garage can toast them
    // (this page navigates back immediately, so they can't be shown in place).
    if (cart.length) queueAchievementToasts(syncStateAchievements());

    garage().carIndex = carIdx;
    const lk = carLook(carIdx);     // write this car's own look
    lk.bodyColor    = pending.body;
    lk.finish       = pending.finish;
    lk.trailColor   = pending.trail;
    lk.glassColor   = pending.glass;
    lk.outlineColor = pending.outline;
    lk.expression   = pending.expression;
    // Neon FX: only equip options we now own (free solid/none, or purchased above); a
    // still-locked layout/anim (e.g. left carted but not bought) falls back to the free one.
    if (pending.neonOn) {
      const layoutOk = pending.neonCfg.layout === 'solid' || isOwned('neon-layout-' + pending.neonCfg.layout);
      const animOk   = pending.neonCfg.anim   === 'none'  || isOwned('neon-anim-'   + pending.neonCfg.anim);
      lk.neon = {
        layout: layoutOk ? pending.neonCfg.layout : 'solid',
        anim:   animOk   ? pending.neonCfg.anim   : 'none',
        colors: pending.neonCfg.colors.slice(),
        speed:  1,
      };
    } else {
      lk.neon = null;
    }
    lk.neonColor = null;   // `neon` is now authoritative; clear the legacy field
    save();
    // Buy → soft "cha-ching", plain apply → gentle confirm; defer nav so the sound is heard.
    soundThenGo(backHref, cart.length ? 'buy' : 'select', cart.length ? 130 : 100);
  });

  // (Shop-driven achievements are reconciled by syncStateAchievements() on buy — see
  //  js/ach-sync.js. The page navigates back immediately, so newly-unlocked defs are stashed
  //  via queueAchievementToasts and celebrated with a toast on the garage — see js/ach-toast.js.)

  // ── Initial render ────────────────────────────────────────────────────────────
  refresh();
  redraw();

  const destroy = () => {
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    if (emotionOff) emotionOff();
    M.body = factoryBody;   // undo the shared-descriptor mutation draw() leaves behind (see header)
    while (listeners.length) { const [el, type, fn, opts] = listeners.pop(); el.removeEventListener(type, fn, opts); }
    // Empty the containers this screen filled, so a re-mount does not stack duplicates.
    for (const id of ['body-palette', 'neon-colors', 'neon-layout', 'neon-anim',
                      'shop-finish', 'shop-trail', 'shop-glass', 'shop-outline', 'shop-moods']) {
      const c = $(id);
      if (c) c.innerHTML = '';
    }
  };
  return { destroy };
};
