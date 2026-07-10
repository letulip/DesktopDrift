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
export const syncStateAchievements = () => {
  const st = stats();
  const ctx = {
    run: null,
    wallet: wallet(), owned: owned(), cleared: st.cleared ?? [],
    records: flattenRecords(records()), caps: st.caps ?? {},
    lifetime: { runs: st.runs ?? 0, driftSecs: st.driftSecs ?? 0 },
    content: buildContent(TRACKS, CATALOG),
  };
  const res = evaluate(ctx, achUnlocked());
  for (const p of res.progress) achSetProgress(p.id, p.value);
  const out = [];
  for (const u of res.unlocked) {
    if (achUnlock(u.id)) {                 // idempotent — pays once
      if (u.reward) addTires(u.reward, 'Achievement: ' + u.name);
      out.push(u);
    }
  }
  return out;
};
