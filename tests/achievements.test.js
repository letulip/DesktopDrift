// achievements.js — pure catalog + evaluator. No store/DOM; every check reads an injected
// ctx (see docs/plans/achievements.md). These tests are the safety net for the whole system.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DDK_PPS, buildCatalog, buildContent, evaluate, flattenRecords } from '../js/achievements.js';

test('flattenRecords: { inst: { timeattack: { bestPPS } } } → { inst: bestPPS }', () => {
  const flat = flattenRecords({
    'green-study':     { timeattack: { bestPPS: 640, bestPPSTotal: 1, bestPPSTime: 2 } },
    'green-study:rev': { timeattack: { bestPPS: 300 } },
    'empty':           {},                       // no timeattack → skipped
  });
  assert.deepEqual(flat, { 'green-study': 640, 'green-study:rev': 300 });
  assert.deepEqual(flattenRecords(undefined), {});
});

test('buildContent: derives instances + shop sections from the registries', () => {
  const tracks = [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }];
  const catalog = [{ id: 'finish-x', kind: 'finish' }, { id: 'trail-y', kind: 'trail' },
                   { id: 'trail-z', kind: 'trail' }];
  const c = buildContent(tracks, catalog);
  assert.deepEqual(c.forwardIds, ['a', 'b']);
  assert.deepEqual(c.reversedIds, ['a:rev', 'b:rev']);
  assert.deepEqual(c.allInstanceIds, ['a', 'b', 'a:rev', 'b:rev']);
  assert.deepEqual(c.shopCategories, ['finish', 'trail']);   // distinct kinds, order preserved
  assert.equal(c.catalogById['trail-y'], 'trail');
  assert.equal(c.names['a:rev'], 'Alpha (reversed)');
});

// A representative world: 3 tracks × forward/reversed = 6 instances, shop with 2 sections.
const CONTENT = {
  forwardIds:      ['green-study', 'steel-kitchen', 'workbench'],
  reversedIds:     ['green-study:rev', 'steel-kitchen:rev', 'workbench:rev'],
  allInstanceIds:  ['green-study', 'steel-kitchen', 'workbench',
                    'green-study:rev', 'steel-kitchen:rev', 'workbench:rev'],
  forwardTrackIds: ['green-study', 'steel-kitchen', 'workbench'],
  shopCategories:  ['finish', 'trail'],
  catalogById:     { 'finish-matte': 'finish', 'trail-mint': 'trail' },
  cars:            ['plum', 'toretto', 'smasher'],
  names:           { 'green-study': 'Midnight Deadline', 'green-study:rev': 'Midnight Deadline (reversed)' },
};

// Minimal finished-run scaffold; spread + override per test.
const RUN = {
  finished: true, instanceId: 'green-study', trackId: 'green-study', reversed: false,
  pps: 120, stars: 1, ddk: false, nearMisses: 0, crashes: 3, conesHit: 2, conesTotal: 6,
  timeAt8: 0, comboUnbroken: false, tiresThisRun: 0, tireTotalOnTrack: 4, capsThisRun: 0, hour: 14,
};

const ctx = (over = {}) => ({ content: CONTENT, wallet: 0, owned: [], cleared: [], records: {},
  caps: {}, lifetime: { runs: 0, driftSecs: 0 }, run: null, ...over });

// Which ids does evaluate() unlock for this ctx (from a clean slate)?
const firing = (over) => new Set(evaluate(ctx(over), new Set()).unlocked.map(u => u.id));

// ── Catalog integrity ─────────────────────────────────────────────────────────
test('catalog: ids are unique', () => {
  const ids = buildCatalog(CONTENT).map(a => a.id);
  assert.equal(ids.length, new Set(ids).size);
});

test('catalog: every check runs on a null-run ctx without throwing', () => {
  const x = ctx();               // run: null (the purchase-eval shape)
  for (const a of buildCatalog(CONTENT)) assert.doesNotThrow(() => a.check(_normalizeForCheck(x)));
});

test('catalog: generates one DDK crown per instance + Absolute DDK', () => {
  const ids = buildCatalog(CONTENT).map(a => a.id);
  for (const inst of CONTENT.allInstanceIds) assert.ok(ids.includes(`ddk-${inst}`), `missing ddk-${inst}`);
  assert.ok(ids.includes('absolute-ddk'));
});

test('catalog: DDK name uses the display name from content', () => {
  const ddk = buildCatalog(CONTENT).find(a => a.id === 'ddk-green-study');
  assert.equal(ddk.name, 'DDK Midnight Deadline');
});

// ── Progression ────────────────────────────────────────────────────────────────
test('first-drift fires on a finished run OR any recorded history', () => {
  assert.ok(firing({ run: { ...RUN } }).has('first-drift'));
  assert.ok(!firing({ run: null }).has('first-drift'));                            // truly fresh save
  assert.ok(firing({ run: null, cleared: ['green-study'] }).has('first-drift'));   // finished before
  assert.ok(firing({ run: null, records: { 'green-study': 120 } }).has('first-drift'));
});

test('road-tripper needs every forward instance cleared (not just some)', () => {
  assert.ok(!firing({ cleared: ['green-study', 'steel-kitchen'] }).has('road-tripper'));
  assert.ok(firing({ cleared: CONTENT.forwardIds }).has('road-tripper'));
});

test('mirror-walker fires on any reversed clear; backwards needs all', () => {
  assert.ok(firing({ cleared: ['green-study:rev'] }).has('mirror-walker'));
  assert.ok(!firing({ cleared: ['green-study:rev'] }).has('backwards'));
  assert.ok(firing({ cleared: CONTENT.reversedIds }).has('backwards'));
});

test('completionist needs every instance, both directions', () => {
  assert.ok(!firing({ cleared: CONTENT.forwardIds }).has('completionist'));
  assert.ok(firing({ cleared: CONTENT.allInstanceIds }).has('completionist'));
});

// ── Skill ───────────────────────────────────────────────────────────────────────
test('star tiers fire at their thresholds and not below (this run)', () => {
  assert.ok(!firing({ run: { ...RUN, stars: 2 } }).has('three-star'));
  assert.ok(firing({ run: { ...RUN, stars: 3 } }).has('three-star'));
  const f4 = firing({ run: { ...RUN, stars: 4 } });
  assert.ok(f4.has('three-star') && f4.has('four-star') && !f4.has('five-star'));
  assert.ok(firing({ run: { ...RUN, stars: 5 } }).has('five-star'));
});

test('star tiers also fire from a recorded best (returning player, run:null)', () => {
  // starsForPps: 100/star. 250→2★, 300→3★, 520→5★.
  assert.ok(!firing({ run: null, records: { x: 250 } }).has('three-star')); // 2★ < 3
  assert.ok(firing({ run: null, records: { x: 300 } }).has('three-star'));  // 3★
  const f = firing({ run: null, records: { a: 120, b: 520 } });             // best = 520 → 5★
  assert.ok(f.has('three-star') && f.has('four-star') && f.has('five-star'));
});

test('daredevil at 10 near misses', () => {
  assert.ok(!firing({ run: { ...RUN, nearMisses: 9 } }).has('daredevil'));
  assert.ok(firing({ run: { ...RUN, nearMisses: 10 } }).has('daredevil'));
});

// ── Combo ─────────────────────────────────────────────────────────────────────
test('flow tiers key off timeAt8', () => {
  assert.ok(firing({ run: { ...RUN, timeAt8: 10 } }).has('flow-1'));
  assert.ok(!firing({ run: { ...RUN, timeAt8: 10 } }).has('flow-2'));
  assert.ok(firing({ run: { ...RUN, timeAt8: 30 } }).has('flow-2'));
  assert.ok(!firing({ run: { ...RUN, timeAt8: 30 } }).has('flow-3'));   // 60s tier
  assert.ok(firing({ run: { ...RUN, timeAt8: 60 } }).has('flow-3'));
});

test('perpetual needs a finished, unbroken run', () => {
  assert.ok(!firing({ run: { ...RUN, comboUnbroken: false } }).has('perpetual'));
  assert.ok(firing({ run: { ...RUN, comboUnbroken: true } }).has('perpetual'));
});

// ── Economy ──────────────────────────────────────────────────────────────────
test('clean-sweep: all tires this run, and the track has tires', () => {
  assert.ok(!firing({ run: { ...RUN, tiresThisRun: 3, tireTotalOnTrack: 4 } }).has('clean-sweep'));
  assert.ok(firing({ run: { ...RUN, tiresThisRun: 4, tireTotalOnTrack: 4 } }).has('clean-sweep'));
  assert.ok(!firing({ run: { ...RUN, tiresThisRun: 0, tireTotalOnTrack: 0 } }).has('clean-sweep')); // no tires → never
});

test('soda-pop fires once any cap is collected (works with run:null)', () => {
  assert.ok(!firing({ caps: {} }).has('soda-pop'));
  assert.ok(firing({ caps: { 'green-study': [0] } }).has('soda-pop'));
});

test('big-spender / fashionista / well-rounded on the purchase-eval (run:null)', () => {
  assert.ok(firing({ owned: ['finish-matte'] }).has('big-spender'));
  assert.ok(!firing({ owned: ['a', 'b', 'c', 'd'] }).has('fashionista'));
  assert.ok(firing({ owned: ['a', 'b', 'c', 'd', 'e'] }).has('fashionista'));
  assert.ok(!firing({ owned: ['finish-matte'] }).has('well-rounded'));           // only 1 of 2 sections
  assert.ok(firing({ owned: ['finish-matte', 'trail-mint'] }).has('well-rounded')); // both sections
});

// ── Hidden ────────────────────────────────────────────────────────────────────
test('glass-cannon: 5 stars AND 15+ near misses', () => {
  assert.ok(!firing({ run: { ...RUN, stars: 5, nearMisses: 14 } }).has('glass-cannon'));
  assert.ok(firing({ run: { ...RUN, stars: 5, nearMisses: 15 } }).has('glass-cannon'));
});

test('crash gags: fire per-race at 5/10/20/40, graduated, run-only', () => {
  assert.equal(firing({ run: { ...RUN, crashes: 4 } }).has('crash-5'), false);
  assert.ok(firing({ run: { ...RUN, crashes: 5 } }).has('crash-5'));
  assert.equal(firing({ run: { ...RUN, crashes: 5 } }).has('crash-10'), false);
  const f40 = firing({ run: { ...RUN, crashes: 40 } });
  assert.ok(f40.has('crash-5') && f40.has('crash-10') && f40.has('crash-20') && f40.has('crash-40'));  // one messy race unlocks all
  assert.equal(firing({ run: null }).has('crash-5'), false);                                            // not reconstructable
});

test('untouchable: finished with zero crashes', () => {
  assert.ok(!firing({ run: { ...RUN, crashes: 1 } }).has('untouchable'));
  assert.ok(firing({ run: { ...RUN, crashes: 0 } }).has('untouchable'));
});

test('cone achievements: slalom (none hit) vs bulldozer (all hit)', () => {
  assert.ok(firing({ run: { ...RUN, conesHit: 0, conesTotal: 6 } }).has('slalom-saint'));
  assert.ok(!firing({ run: { ...RUN, conesHit: 0, conesTotal: 0 } }).has('slalom-saint')); // no cones → not earned
  assert.ok(firing({ run: { ...RUN, conesHit: 6, conesTotal: 6 } }).has('bulldozer'));
  assert.ok(!firing({ run: { ...RUN, conesHit: 5, conesTotal: 6 } }).has('bulldozer'));
});

test('one-pps: fires only when the rounded run PPS is exactly 1', () => {
  assert.ok(firing({ run: { ...RUN, pps: 1 } }).has('one-pps'));       // a whole 1 PPS
  assert.ok(firing({ run: { ...RUN, pps: 1.4 } }).has('one-pps'));     // rounds to 1 (matches the results screen)
  assert.ok(!firing({ run: { ...RUN, pps: 1.5 } }).has('one-pps'));    // rounds to 2
  assert.ok(!firing({ run: { ...RUN, pps: 0 } }).has('one-pps'));      // shows "0 PPS", not 1
  assert.ok(!firing({ run: { ...RUN, pps: 120 } }).has('one-pps'));    // a normal run never triggers it
  assert.ok(!firing({ run: null }).has('one-pps'));                    // not reconstructable from history
});

test('cola-collector: a cap on every forward track', () => {
  assert.ok(!firing({ caps: { 'green-study': [0], 'steel-kitchen': [0] } }).has('cola-collector'));
  assert.ok(firing({ caps: { 'green-study': [0], 'steel-kitchen': [0], 'workbench': [0] } }).has('cola-collector'));
});

test('time-of-day buckets are disjoint and correct', () => {
  assert.ok(firing({ run: { ...RUN, hour: 23 } }).has('night-owl'));
  assert.ok(firing({ run: { ...RUN, hour: 1 } }).has('night-owl'));
  assert.ok(firing({ run: { ...RUN, hour: 3 } }).has('midnight-drift'));
  assert.ok(firing({ run: { ...RUN, hour: 6 } }).has('early-bird'));
  const noon = firing({ run: { ...RUN, hour: 12 } });
  assert.ok(!noon.has('night-owl') && !noon.has('midnight-drift') && !noon.has('early-bird'));
});

// ── DDK ──────────────────────────────────────────────────────────────────────
test('DDK_PPS is 600; per-instance crown fires at the threshold', () => {
  assert.equal(DDK_PPS, 600);
  assert.ok(!firing({ records: { 'green-study': 599 } }).has('ddk-green-study'));
  assert.ok(firing({ records: { 'green-study': 600 } }).has('ddk-green-study'));
});

test('absolute-ddk needs the crown on every instance', () => {
  const almost = {}; CONTENT.allInstanceIds.forEach(id => almost[id] = 600);
  almost['workbench:rev'] = 599;
  assert.ok(!firing({ records: almost }).has('absolute-ddk'));
  const all = {}; CONTENT.allInstanceIds.forEach(id => all[id] = 700);
  assert.ok(firing({ records: all }).has('absolute-ddk'));
});

// ── Ladders + evaluate mechanics ───────────────────────────────────────────────
test('ladders report progress and unlock at target', () => {
  const r = evaluate(ctx({ lifetime: { runs: 12, driftSecs: 25 * 60 } }), new Set());
  const races10 = r.progress.find(p => p.id === 'races-10');
  assert.equal(races10.value, 12);
  const ids = new Set(r.unlocked.map(u => u.id));
  assert.ok(ids.has('races-10'));       // 12 ≥ 10
  assert.ok(!ids.has('races-50'));      // 12 < 50
  assert.ok(ids.has('drift-10') && ids.has('drift-25')); // 25 min ≥ both
  assert.ok(!ids.has('drift-50'));
});

test('hoard ladder keys off the wallet balance', () => {
  const ids = new Set(evaluate(ctx({ wallet: 1200 }), new Set()).unlocked.map(u => u.id));
  assert.ok(ids.has('hoard-500') && ids.has('hoard-1000'));
  assert.ok(!ids.has('hoard-2500'));
});

test('evaluate skips already-unlocked ids (idempotent, no re-fire)', () => {
  const world = ctx({ run: { ...RUN, stars: 5 } });
  const first = evaluate(world, new Set());
  assert.ok(first.unlocked.some(u => u.id === 'five-star'));
  const again = evaluate(world, new Set(['five-star', 'first-drift', 'three-star', 'four-star']));
  assert.ok(!again.unlocked.some(u => u.id === 'five-star'));
});

test('evaluate returns name/icon/reward for the toast', () => {
  const u = evaluate(ctx({ run: { ...RUN } }), new Set()).unlocked.find(u => u.id === 'first-drift');
  assert.deepEqual(u, { id: 'first-drift', name: 'First Drift', icon: '🏁', reward: 10 });
});

// The catalog's checks expect the normalised ctx evaluate() builds internally; for the
// "no throw" integrity test we mirror that minimal normalisation.
function _normalizeForCheck(c) {
  return { run: c.run ?? null, wallet: c.wallet ?? 0, owned: c.owned ?? [], ownedCars: c.ownedCars ?? [],
    cleared: c.cleared ?? [], records: c.records ?? {}, caps: c.caps ?? {},
    lifetime: c.lifetime ?? { runs: 0, driftSecs: 0 },
    content: { ...c.content, cars: c.content?.cars ?? [] } };
}

test('car achievements fire from ownedCars', () => {
  assert.ok(!firing({}).has('new-wheels'));                                    // none owned
  assert.ok(firing({ ownedCars: ['plum'] }).has('new-wheels'));               // first car
  assert.ok(!firing({ ownedCars: ['plum', 'toretto'] }).has('three-car-garage'));
  assert.ok(firing({ ownedCars: ['plum', 'toretto', 'smasher'] }).has('three-car-garage'));
  assert.ok(!firing({ ownedCars: ['plum', 'toretto'] }).has('full-garage'));  // not all
  assert.ok(firing({ ownedCars: ['plum', 'toretto', 'smasher'] }).has('full-garage'));  // all 3
});
