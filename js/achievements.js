// Achievements — pure definitions + evaluator. The only import is the pure DDK threshold
// from economy.js (no store/DOM); everything else the checks need is injected via `ctx`
// (see docs/plans/achievements.md → ctx contract), so this whole module is unit-testable in
// Node. Persistence lives in js/store.js; the engine + shop assemble `ctx`, call evaluate(),
// then unlock + credit the tire reward.
import { DDK_PPS } from './economy.js';
export { DDK_PPS };   // re-export so consumers can take it from either module

// ── ctx / content normalisation ──────────────────────────────────────────────
// Checks read a normalised ctx so a partial input (e.g. the purchase-triggered eval with
// run:null, or a test with a minimal world) never throws.
const _content = (c = {}) => ({
  forwardIds:      c.forwardIds      ?? [],
  reversedIds:     c.reversedIds     ?? [],
  allInstanceIds:  c.allInstanceIds  ?? [],
  forwardTrackIds: c.forwardTrackIds ?? [],
  shopCategories:  c.shopCategories  ?? [],
  catalogById:     c.catalogById     ?? {},
  names:           c.names           ?? {},
});

const _norm = (ctx = {}) => ({
  run:      ctx.run ?? null,
  wallet:   ctx.wallet ?? 0,
  owned:    ctx.owned ?? [],
  cleared:  ctx.cleared ?? [],
  records:  ctx.records ?? {},
  caps:     ctx.caps ?? {},
  lifetime: { runs: ctx.lifetime?.runs ?? 0, driftSecs: ctx.lifetime?.driftSecs ?? 0 },
  content:  _content(ctx.content),
});

// Every forward/reversed/all instance is finished (and there is at least one to finish).
const _allCleared = (ids, cleared) => ids.length > 0 && ids.every(id => cleared.includes(id));

// ── Static catalog (content-independent: fixed thresholds + injected-content checks) ──
const STATIC = [
  // Progression ---------------------------------------------------------------
  { id: 'first-drift', name: 'First Drift', desc: 'Finish your first race.',
    icon: '🏁', category: 'progression', hidden: false, reward: 10,
    check: (x) => x.run?.finished === true },
  { id: 'road-tripper', name: 'Road Tripper', desc: 'Clear every track (forward).',
    icon: '🗺️', category: 'progression', hidden: false, reward: 30,
    check: (x) => _allCleared(x.content.forwardIds, x.cleared) },
  { id: 'mirror-walker', name: 'Through the Looking Glass', desc: 'Clear a reversed track.',
    icon: '🪞', category: 'progression', hidden: false, reward: 15,
    check: (x) => x.content.reversedIds.some(id => x.cleared.includes(id)) },
  { id: 'backwards', name: 'Reverse Psychology', desc: 'Clear every reversed track.',
    icon: '↩️', category: 'progression', hidden: false, reward: 30,
    check: (x) => _allCleared(x.content.reversedIds, x.cleared) },
  { id: 'completionist', name: 'Completionist', desc: 'Clear every track, both directions.',
    icon: '🏆', category: 'progression', hidden: false, reward: 75,
    check: (x) => _allCleared(x.content.allInstanceIds, x.cleared) },

  // Skill ---------------------------------------------------------------------
  { id: 'three-star', name: 'Solid Run', desc: 'Earn 3 stars in a race.',
    icon: '⭐', category: 'skill', hidden: false, reward: 5,
    check: (x) => (x.run?.stars ?? 0) >= 3 },
  { id: 'four-star', name: 'Dialed In', desc: 'Earn 4 stars in a race.',
    icon: '🌟', category: 'skill', hidden: false, reward: 20,
    check: (x) => (x.run?.stars ?? 0) >= 4 },
  { id: 'five-star', name: 'Flawless', desc: 'Earn 5 stars in a race.',
    icon: '💫', category: 'skill', hidden: false, reward: 40,
    check: (x) => (x.run?.stars ?? 0) >= 5 },
  { id: 'daredevil', name: 'Daredevil', desc: 'Land 10 near misses in one race.',
    icon: '😎', category: 'skill', hidden: false, reward: 25,
    check: (x) => (x.run?.nearMisses ?? 0) >= 10 },

  // Combo ---------------------------------------------------------------------
  { id: 'flow-1', name: 'In the Zone', desc: 'Hold an 8× combo for 10s total in a race.',
    icon: '🌀', category: 'combo', hidden: false, reward: 20,
    check: (x) => (x.run?.timeAt8 ?? 0) >= 10 },
  { id: 'flow-2', name: 'Untouchable Flow', desc: 'Hold an 8× combo for 30s total in a race.',
    icon: '🌪️', category: 'combo', hidden: false, reward: 35,
    check: (x) => (x.run?.timeAt8 ?? 0) >= 30 },
  { id: 'perpetual', name: 'Perpetual Motion', desc: 'Finish a race in one unbroken drift.',
    icon: '♾️', category: 'combo', hidden: true, reward: 75,
    check: (x) => x.run?.finished === true && x.run?.comboUnbroken === true },

  // Economy / collection ------------------------------------------------------
  { id: 'clean-sweep', name: 'Clean Sweep', desc: 'Collect every tire on a track in one run.',
    icon: '🧹', category: 'economy', hidden: false, reward: 20,
    check: (x) => (x.run?.tireTotalOnTrack ?? 0) > 0 && x.run.tiresThisRun === x.run.tireTotalOnTrack },
  { id: 'soda-pop', name: 'Soda Pop', desc: 'Collect your first cola cap.',
    icon: '🥤', category: 'economy', hidden: false, reward: 10,
    check: (x) => Object.values(x.caps).some(a => (a?.length ?? 0) > 0) },
  { id: 'big-spender', name: 'Retail Therapy', desc: 'Buy your first cosmetic.',
    icon: '🛍️', category: 'economy', hidden: false, reward: 15,
    check: (x) => x.owned.length >= 1 },
  { id: 'fashionista', name: 'Fashionista', desc: 'Own 5 cosmetics.',
    icon: '👗', category: 'economy', hidden: false, reward: 30,
    check: (x) => x.owned.length >= 5 },
  { id: 'well-rounded', name: 'Well Rounded', desc: 'Buy at least one item from every shop section.',
    icon: '🧩', category: 'economy', hidden: false, reward: 30,
    check: (x) => x.content.shopCategories.length > 0 &&
      x.content.shopCategories.every(cat => x.owned.some(id => x.content.catalogById[id] === cat)) },

  // Hidden --------------------------------------------------------------------
  { id: 'glass-cannon', name: 'Living Dangerously', desc: '5 stars and 15+ near misses in one race.',
    icon: '💥', category: 'hidden', hidden: true, reward: 40,
    check: (x) => (x.run?.stars ?? 0) >= 5 && (x.run?.nearMisses ?? 0) >= 15 },
  { id: 'untouchable', name: 'Untouchable', desc: 'Finish a race without a single crash.',
    icon: '🛡️', category: 'hidden', hidden: true, reward: 30,
    check: (x) => x.run?.finished === true && x.run?.crashes === 0 },
  { id: 'slalom-saint', name: 'Slalom Saint', desc: 'Finish a race without knocking a single cone.',
    icon: '🚧', category: 'hidden', hidden: true, reward: 60,
    check: (x) => x.run?.finished === true && (x.run?.conesTotal ?? 0) > 0 && x.run.conesHit === 0 },
  { id: 'bulldozer', name: 'Bulldozer', desc: 'Knock over every cone in a race.',
    icon: '🚜', category: 'hidden', hidden: true, reward: 30,
    check: (x) => (x.run?.conesTotal ?? 0) > 0 && x.run.conesHit === x.run.conesTotal },
  { id: 'cola-collector', name: 'Sugar High', desc: 'Collect the cola cap on every track.',
    icon: '🧃', category: 'hidden', hidden: true, reward: 40,
    check: (x) => x.content.forwardTrackIds.length > 0 &&
      x.content.forwardTrackIds.every(tid => (x.caps[tid]?.length ?? 0) > 0) },
  { id: 'night-owl', name: 'Night Owl', desc: 'Finish a race between 22:00 and 02:00.',
    icon: '🦉', category: 'hidden', hidden: true, reward: 15,
    check: (x) => [22, 23, 0, 1].includes(x.run?.hour) },
  { id: 'midnight-drift', name: 'Midnight Drift', desc: 'Finish a race between 02:00 and 05:00.',
    icon: '🌙', category: 'hidden', hidden: true, reward: 15,
    check: (x) => [2, 3, 4].includes(x.run?.hour) },
  { id: 'early-bird', name: 'Early Bird', desc: 'Finish a race between 05:00 and 08:00.',
    icon: '🐦', category: 'hidden', hidden: true, reward: 15,
    check: (x) => [5, 6, 7].includes(x.run?.hour) },

  // Absolute DDK (per-instance DDK crowns are generated below) -----------------
  { id: 'absolute-ddk', name: 'Absolute DDK', desc: 'Earn the crown on every track, both directions.',
    icon: '👑', category: 'ddk', hidden: true, reward: 1000,
    check: (x) => x.content.allInstanceIds.length > 0 &&
      x.content.allInstanceIds.every(id => (x.records[id] ?? 0) >= DDK_PPS) },
];

// ── Generated ladder families (fixed thresholds → counter achievements) ───────
// check() returns { progress, target } so evaluate() can unlock at target; the same
// `target`, `bar:true`, and `fmt` display formatter are also exposed as static fields so the
// achievements page can render a progress bar from the catalog + stored progress alone.
const _ladder = (prefix, icon, category, unit, tiers, valueOf, descOf, fmt) =>
  tiers.map(([threshold, reward, name]) => {
    const target = threshold * unit;
    return {
      id: `${prefix}-${threshold}`, name, icon, category, hidden: false, reward,
      desc: descOf(threshold), bar: true, target, fmt,
      check: (x) => ({ progress: valueOf(x), target }),
    };
  });

const DRIFT_TIERS = [[10, 20, 'Warm-Up'], [25, 30, 'Marathon'], [50, 40, 'Endurance'],
  [100, 60, 'Iron Wrists'], [250, 100, 'Tireless'], [500, 150, 'Eternal Drift']];
const RACES_TIERS = [[10, 15, 'Rookie'], [50, 30, 'Regular'], [100, 50, 'Veteran'],
  [250, 100, 'Devotee'], [500, 150, 'Legend']];
const HOARD_TIERS = [[500, 25, 'Tire Saver'], [1000, 40, 'Tire Lover'],
  [2500, 80, 'Tire Warehouse'], [5000, 150, 'Tire Factory']];

const _fmtMin   = (secs) => `${Math.floor(secs / 60)}m`;
const _fmtCount = (n) => `${n}`;

const LADDERS = [
  ..._ladder('drift', '⏱️', 'endurance', 60, DRIFT_TIERS, (x) => x.lifetime.driftSecs,
    (m) => `Drift for ${m} minutes total.`, _fmtMin),
  ..._ladder('races', '🔁', 'dedication', 1, RACES_TIERS, (x) => x.lifetime.runs,
    (n) => `Finish ${n} races.`, _fmtCount),
  ..._ladder('hoard', '🛞', 'wealth', 1, HOARD_TIERS, (x) => x.wallet,
    (n) => `Reach ${n} tires in the wallet.`, _fmtCount),
];

// Display order + section labels for the achievements page (any category not listed falls
// through to the end in insertion order).
export const CATEGORY_ORDER = [
  { key: 'progression', label: 'Progression' },
  { key: 'skill',       label: 'Skill' },
  { key: 'combo',       label: 'Combo' },
  { key: 'endurance',   label: 'Endurance' },
  { key: 'dedication',  label: 'Dedication' },
  { key: 'wealth',      label: 'Wealth' },
  { key: 'economy',     label: 'Economy' },
  { key: 'hidden',      label: 'Secrets' },
  { key: 'ddk',         label: 'DDK — Mastery' },
];

// Per-instance DDK crowns — generated from the content instance list (scales with tracks).
const _ddkDefs = (content) => content.allInstanceIds.map(id => ({
  id: `ddk-${id}`, name: `DDK ${content.names[id] ?? id}`,
  desc: 'Score 600+ PPS — a 6-star crown run.',
  icon: '👑', category: 'ddk', hidden: true, reward: 60,
  check: (x) => (x.records[id] ?? 0) >= DDK_PPS,
}));

// Build the `content` descriptor from the live registries (tracks + shop catalog). Pure —
// the registries are injected, not imported — so both the engine and the achievements page
// derive the identical content (and therefore the identical ids) from one place.
export const buildContent = (tracks, catalog) => {
  const forwardIds  = tracks.map(t => t.id);
  const reversedIds = forwardIds.map(id => `${id}:rev`);
  const names = {};
  tracks.forEach(t => { names[t.id] = t.name; names[`${t.id}:rev`] = `${t.name} (reversed)`; });
  return {
    forwardIds, reversedIds, allInstanceIds: [...forwardIds, ...reversedIds],
    forwardTrackIds: forwardIds,
    shopCategories: [...new Set(catalog.map(i => i.kind))],
    catalogById: Object.fromEntries(catalog.map(i => [i.id, i.kind])),
    names,
  };
};

// Flatten store.records() ({ [inst]: { timeattack: { bestPPS } } }) → { [inst]: bestPPS }
// for the DDK / Absolute-DDK checks. Shared by the engine + the shop ctx assembly.
export const flattenRecords = (records) => {
  const out = {};
  for (const k of Object.keys(records ?? {})) {
    const bp = records[k]?.timeattack?.bestPPS;
    if (bp != null) out[k] = bp;
  }
  return out;
};

// The full catalog for a given world. Both the engine and the achievements page call this
// with the same content so ids line up. Content-independent entries are shared singletons.
export const buildCatalog = (content) => {
  const c = _content(content);
  return [...STATIC, ...LADDERS, ..._ddkDefs(c)];
};

// ── The evaluator ─────────────────────────────────────────────────────────────
// Pure. `unlocked` is a Set of already-unlocked ids (store.achUnlocked()). Returns:
//   { unlocked: [{ id, name, icon, reward }], progress: [{ id, value }] }
// The caller persists (achUnlock + credit reward once) and records progress (achSetProgress,
// which latches to max). Already-unlocked achievements are skipped entirely (idempotent).
export const evaluate = (ctx, unlocked = new Set()) => {
  const x = _norm(ctx);
  const out = { unlocked: [], progress: [] };
  for (const a of buildCatalog(x.content)) {
    if (unlocked.has(a.id)) continue;
    const r = a.check(x);
    if (r && typeof r === 'object' && 'progress' in r) {
      out.progress.push({ id: a.id, value: r.progress });
      if (r.progress >= r.target) out.unlocked.push({ id: a.id, name: a.name, icon: a.icon, reward: a.reward });
    } else if (r === true) {
      out.unlocked.push({ id: a.id, name: a.name, icon: a.icon, reward: a.reward });
    }
  }
  return out;
};
