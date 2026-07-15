// ach-sync.js — the retroactive/state-based reconcile (backwards compatibility). Seeds a
// save that already meets several achievement conditions (as a returning player would) and
// verifies syncStateAchievements() unlocks + credits them once, and never re-fires.
// Separate process (own module cache) per the store.js caching note.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage } from './helpers.js';
import { TRACKS } from '../js/track-registry.js';

// A pre-feature save: EVERY track cleared both ways, a 600+ record, 5 cosmetics across both
// shop sections, 600 tires, a cola cap on every track. Derived from the live registry so
// adding a track can't silently break the "unlocks everything" assertions.
const forwardIds = TRACKS.map(t => t.id);
const cleared    = [...forwardIds, ...forwardIds.map(id => `${id}:rev`)];
const caps       = Object.fromEntries(forwardIds.map(id => [id, [0]]));
const FIRST      = forwardIds[0];   // put the 640-PPS record on the first track (DDK + stars)

installLocalStorage({
  'desktop-drift': JSON.stringify({
    version: 2,
    wallet: 600,
    // one item from every shop section (finish/trail/glass/outline/expression/neon-layout/neon-anim) → well-rounded
    owned: ['finish-matte', 'trail-mint', 'trail-oro', 'glass-smoke', 'outline-white', 'emo-joy', 'neon-layout-per-zone', 'neon-anim-pulse'],
    stats: { caps, tires: {}, cleared, runs: 0, driftSecs: 0 },
    records: { [FIRST]: { timeattack: { bestPPS: 640, bestPPSTotal: 20000, bestPPSTime: 31 } } },
    achievements: {},
  }),
});

const { syncStateAchievements } = await import('../js/ach-sync.js');
const { wallet, achUnlocked } = await import('../js/store.js');

test('retroactive sweep unlocks everything already earned by state', () => {
  const before = wallet();
  const unlocked = new Set(syncStateAchievements().map(u => u.id));

  // Progression (from `cleared`)
  for (const id of ['road-tripper', 'mirror-walker', 'backwards', 'completionist'])
    assert.ok(unlocked.has(id), `expected ${id}`);
  // Economy (from `owned`) — both shop sections present → well-rounded too
  for (const id of ['big-spender', 'fashionista', 'well-rounded'])
    assert.ok(unlocked.has(id), `expected ${id}`);
  // Collection (from `caps`)
  assert.ok(unlocked.has('soda-pop'));
  assert.ok(unlocked.has('cola-collector'));
  // Wallet ladder (600 ≥ 500) + DDK crown (record 640 ≥ 600 on the first track)
  assert.ok(unlocked.has('hoard-500'));
  assert.ok(unlocked.has(`ddk-${FIRST}`));
  // Reconstructable from records: finished-ever + star tiers (640 PPS → 5★)
  assert.ok(unlocked.has('first-drift'));
  assert.ok(unlocked.has('three-star'));
  assert.ok(unlocked.has('four-star'));
  assert.ok(unlocked.has('five-star'));

  // Genuinely run-only (never stored: near misses, cones, combo, time) → still locked
  assert.ok(!unlocked.has('daredevil'));
  assert.ok(!unlocked.has('glass-cannon'));
  assert.ok(!unlocked.has('slalom-saint'));

  // Rewards were credited (wallet grew) and the store now records them as unlocked
  assert.ok(wallet() > before, 'rewards should be credited to the wallet');
  assert.ok(achUnlocked().has('completionist'));
});

test('sweep is idempotent — a second call unlocks nothing and pays nothing', () => {
  const w = wallet();
  const again = syncStateAchievements();
  assert.equal(again.length, 0);
  assert.equal(wallet(), w);
});
