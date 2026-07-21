// Achievements screen — logic extracted verbatim from achievements.html's inline module (SPA
// Phase A). A one-shot render (no listeners, no rAF): syncStateAchievements() sweeps the save,
// then the catalog is grouped by category and drawn into the page.
//
// Screen contract: createAchievementsScreen(root=document) -> { destroy }. This screen adds no
// listeners, so destroy() instead clears what it rendered (idempotent) — that is the real teardown
// for a render-only screen and keeps a future re-mount from stacking duplicate sections.
import { TRACKS } from '../track-registry.js';
import { CATALOG } from '../shop-catalog.js';
import { buildContent, buildCatalog, CATEGORY_ORDER } from '../achievements.js';
import { achAll, wallet } from '../store.js';
import { syncStateAchievements } from '../ach-sync.js';

export const createAchievementsScreen = (root = document) => {
  const $ = (id) => root.getElementById(id);

  // Retroactive sweep: unlock + credit anything already earned by the current save (cleared
  // tracks, records/DDK, owned cosmetics, wallet, caps) before rendering — so returning
  // players who met the conditions before this feature shipped see them light up here.
  syncStateAchievements();

  const catalog = buildCatalog(buildContent(TRACKS, CATALOG));
  const state   = achAll();

  // ── Group defs by category, counting unlocked as we go ─────────────────────
  const byCategory = new Map();
  let unlockedCount = 0;

  for (const def of catalog) {
    const s = state[def.id];
    if (s?.unlocked) unlockedCount++;
    if (!byCategory.has(def.category)) byCategory.set(def.category, []);
    byCategory.get(def.category).push(def);
  }

  $('ach-count').textContent = `${unlockedCount} / ${catalog.length}`;

  // Section order: CATEGORY_ORDER first (only categories that actually have defs),
  // then any leftover category in first-seen order.
  const orderedKeys = CATEGORY_ORDER.map(c => c.key);
  const labelOf     = Object.fromEntries(CATEGORY_ORDER.map(c => [c.key, c.label]));
  const extraKeys   = [...byCategory.keys()].filter(k => !orderedKeys.includes(k));
  const sectionKeys = [...orderedKeys, ...extraKeys].filter(k => byCategory.has(k));

  // ── Small helpers to build DOM without innerHTML ────────────────────────────
  const el = (tag, className, text) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  };

  function renderBar(value, target, fmt, complete) {
    const wrap  = el('div', 'ach-bar-wrap');
    const track = el('div', 'ach-bar-track');
    const fill  = el('div', 'ach-bar-fill');
    const ratio = target > 0 ? Math.min(1, value / target) : 0;
    fill.style.width = `${ratio * 100}%`;
    track.appendChild(fill);
    const label = el('div', 'ach-bar-label', complete ? 'Complete' : `${fmt(value)} / ${fmt(target)}`);
    wrap.appendChild(track);
    wrap.appendChild(label);
    return wrap;
  }

  function renderCard(def, s) {
    const unlocked = !!s?.unlocked;
    const progress = s?.progress ?? 0;

    // Locked + hidden → masked. Never leak name/desc/reward.
    if (!unlocked && def.hidden) {
      const card = el('div', 'ach-card is-hidden');
      card.appendChild(el('div', 'ach-icon', '🔒'));
      const body = el('div', 'ach-body');
      body.appendChild(el('div', 'ach-name', '???'));
      body.appendChild(el('div', 'ach-desc ach-desc--muted', 'Hidden'));
      card.appendChild(body);
      return card;
    }

    const card = el('div', 'ach-card' + (unlocked ? ' is-unlocked' : ' is-locked'));
    card.appendChild(el('div', 'ach-icon', def.icon));

    const body = el('div', 'ach-body');
    body.appendChild(el('div', 'ach-name', def.name));
    body.appendChild(el('div', 'ach-desc', def.desc));
    if (def.bar) {
      // Wallet ladders ('wealth') are non-monotonic — spending tires lowers the balance — but stored
      // progress latches to the peak. Show the LIVE wallet on a locked wealth bar so it reflects the
      // current balance (e.g. 300 / 1000), not the historical max. (Unlock still uses live wallet.)
      const barVal = (!unlocked && def.category === 'wealth') ? wallet() : progress;
      body.appendChild(unlocked
        ? renderBar(def.target, def.target, def.fmt, true)
        : renderBar(barVal, def.target, def.fmt, false));
    }
    card.appendChild(body);

    const reward = el('div', unlocked ? 'ach-reward' : 'ach-reward ach-reward--goal', `+${def.reward} 🛞`);
    card.appendChild(reward);
    return card;
  }

  const sectionsRoot = $('ach-sections');
  for (const key of sectionKeys) {
    const section = el('section', 'ach-section');
    section.appendChild(el('h2', 'ach-section-title', labelOf[key] ?? key));

    const grid = el('div', 'ach-grid');
    for (const def of byCategory.get(key)) grid.appendChild(renderCard(def, state[def.id]));
    section.appendChild(grid);

    sectionsRoot.appendChild(section);
  }

  const destroy = () => {
    if (sectionsRoot) sectionsRoot.textContent = '';
    const count = $('ach-count');
    if (count) count.textContent = '';
  };
  return { destroy };
};
