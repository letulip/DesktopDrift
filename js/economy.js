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
