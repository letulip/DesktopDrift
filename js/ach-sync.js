// State-based achievement reconciliation — the glue between the pure evaluate() and the
// store. Assembles a run-less ctx from the CURRENT save and unlocks anything already earned
// by persistent state (cleared tracks, records/DDK, owned cosmetics, wallet, cola caps).
//
// Two callers: the shop (after a purchase) and the achievements page (a retroactive sweep so
// returning players — who earned the conditions before this feature shipped — see them light
// up + get the tire reward immediately, instead of waiting for their next race).
//
// Run-ONLY achievements (star tiers, combos, cones, near misses, time-of-day, clean-sweep)
// read ctx.run, which is null here, so they never fire from a sweep — they need a real race
// (that path is game-engine.js awardAchievements). Idempotent: achUnlock gates the reward.

import { stats, records, owned, wallet, achUnlocked, achUnlock, achSetProgress, addTires } from './store.js';
import { evaluate, buildContent, flattenRecords } from './achievements.js';
import { TRACKS } from './track-registry.js';
import { CATALOG } from './shop-catalog.js';

// Evaluate state-based achievements against the live save; persist unlocks + ladder progress
// and credit each new reward once. Returns the newly-unlocked defs ({ id, name, icon, reward }).
//
// Loops to a fixed point: crediting rewards raises the wallet, which can cross the next
// wallet-ladder tier (e.g. a big returning-player batch pushes 600 → 1000+ and earns
// hoard-1000 too). Re-evaluating with the fresh wallet each round catches that in one call,
// so a returning player unlocks everything reachable on a single page open — and a subsequent
// call is a true no-op. Bounded: each round unlocks ≥1 new id or breaks (finite catalog).
export const syncStateAchievements = () => {
  const st = stats();
  const base = {
    run: null,
    owned: owned(), cleared: st.cleared ?? [],
    records: flattenRecords(records()), caps: st.caps ?? {},
    lifetime: { runs: st.runs ?? 0, driftSecs: st.driftSecs ?? 0 },
    content: buildContent(TRACKS, CATALOG),
  };
  const out = [];
  for (;;) {
    const res = evaluate({ ...base, wallet: wallet() }, achUnlocked());
    for (const p of res.progress) achSetProgress(p.id, p.value);
    let credited = 0;
    for (const u of res.unlocked) {
      if (achUnlock(u.id)) {               // idempotent — pays once
        if (u.reward) addTires(u.reward, 'Achievement: ' + u.name);
        out.push(u); credited++;
      }
    }
    if (credited === 0) break;             // fixed point — nothing new this round
  }
  return out;
};
