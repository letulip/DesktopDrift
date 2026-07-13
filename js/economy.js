// Pure tire-coin economy formulas — no imports, no state, no DOM.
// Concept + tuning rationale: ROADMAP.md → Phase 2.5. Persistence (wallet, collected
// tires) lives in js/store.js; this module is just the maths so it stays unit-testable.

// Star rating from a run's PPS: 1 star per STAR_PPS, capped at MAX_STARS.
// (Mirrors the rating shown on the race-results overlay.)
export const STAR_PPS  = 100;
export const MAX_STARS = 5;
export const starsForPps = (pps) =>
  Math.max(0, Math.min(MAX_STARS, Math.floor((pps || 0) / STAR_PPS)));

// Repeatable tire payout for finishing a race, scaled by performance:
//   FINISH_FLAT + FINISH_PER_STAR * stars  → 2..12 tires at 0..5 stars.
// This is the sustainable income faucet; one-time track pickups are separate.
export const FINISH_FLAT     = 2;
export const FINISH_PER_STAR = 2;
export const finishPayout = (pps) => FINISH_FLAT + FINISH_PER_STAR * starsForPps(pps);

// One-time bonus for finishing a track instance for the first time (economy.md Phase D1).
export const FIRST_CLEAR_BONUS = 20;

// DDK — a run at 600+ PPS earns a 6th "crown" star. Display + achievement only; payout
// (starsForPps) stays capped at MAX_STARS so the crown never inflates finish income.
export const DDK_PPS = 600;
export const isDDK   = (pps) => (pps || 0) >= DDK_PPS;

// Participation Trophy — the gag at the other end: finishing with a rounded PPS of exactly 1
// (the number the results screen shows). Pays ONE_PPS_BONUS tires EVERY qualifying race (a
// repeatable pity payout on top of the finish bonus) and earns the 🏅 badge on the track card.
export const ONE_PPS_BONUS = 5;
export const isOnePps = (pps) => Math.round(pps || 0) === 1;

// Perpetual Motion — a repeatable per-race bonus for finishing in one unbroken drift (the same
// feat as the one-time 'perpetual' achievement, reward 75). A hard skill feat, so it stays worth
// repeating; paid on top of the finish payout, like the 1-PPS trophy + clean-sweep pattern.
export const UNBROKEN_BONUS = 30;

// ── Car ownership gate (see docs/plans/cars.md) ───────────────────────────────
// Sandbox is a free test-drive of every car; Time Attack / Zen (races) require OWNING the
// car — bought in the garage carousel. The two starter cars are always owned (free).
export const CAR_GATING_ENABLED = true;
export const FREE_CARS = ['bismark', 'panda'];   // starter cars — never gated

// ── Shop purchase logic (see ROADMAP Phase 2.5 + docs/plans/shop.md) ───────────
// Pure decision only — no state, no persistence. js/store.js applies the result to
// the wallet + owned list. Cosmetics are sidegrades; never sell power (records-safe).

// True when the balance covers the price.
export const canAfford = (balance, price) => (balance || 0) >= price;

// Resolve a purchase of `item` against a snapshot { wallet, owned }.
// Success → { ok: true, wallet, owned } with the new balance + extended owned list.
// Failure → { ok: false, reason: 'owned' | 'broke' }, snapshot left untouched.
export const buy = ({ wallet = 0, owned = [] }, item) => {
  if (owned.includes(item.id)) return { ok: false, reason: 'owned' };
  if (!canAfford(wallet, item.price)) return { ok: false, reason: 'broke' };
  return { ok: true, wallet: wallet - item.price, owned: [...owned, item.id] };
};
