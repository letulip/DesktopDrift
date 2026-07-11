// neon.js — pure 6-zone underglow resolver. No DOM. This is the safety net for the whole
// Neon FX feature (render + garage preview are dumb consumers). See docs/plans/neon.md.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NEON_ZONES, LAYOUTS, ANIMS, layoutColours, zoneColors, defaultNeon } from '../js/neon.js';

test('descriptors: 6 zones; layouts + anims expose ids and colour counts', () => {
  assert.equal(NEON_ZONES, 6);
  assert.deepEqual(LAYOUTS.map(l => l.id), ['solid', 'longitudinal', 'front-mid-rear', 'per-zone']);
  assert.deepEqual(LAYOUTS.map(l => l.colours), [1, 2, 3, 6]);
  assert.deepEqual(ANIMS.map(a => a.id), ['none', 'pulse', 'rainbow', 'flow']);
});

// ── Layout mapping (clockwise: 0 FL · 1 FR · 2 R-side · 3 RR · 4 RL · 5 L-side) ──
test('layoutColours: solid paints every zone the first colour', () => {
  assert.deepEqual(layoutColours('solid', ['#111111']), Array(6).fill('#111111'));
});

test('layoutColours: longitudinal splits left trio {0,4,5} vs right trio {1,2,3}', () => {
  const [a, b] = ['#aaaaaa', '#bbbbbb'];
  const z = layoutColours('longitudinal', [a, b]);
  assert.deepEqual([z[0], z[4], z[5]], [a, a, a]);   // left side
  assert.deepEqual([z[1], z[2], z[3]], [b, b, b]);   // right side
});

test('layoutColours: front-mid-rear → front {0,1} · sides {2,5} · rear {3,4}', () => {
  const [f, s, r] = ['#f00000', '#00f000', '#0000f0'];
  const z = layoutColours('front-mid-rear', [f, s, r]);
  assert.deepEqual([z[0], z[1]], [f, f]);
  assert.deepEqual([z[2], z[5]], [s, s]);
  assert.deepEqual([z[3], z[4]], [r, r]);
});

test('layoutColours: per-zone maps one colour per zone in order', () => {
  const cols = ['#000001', '#000002', '#000003', '#000004', '#000005', '#000006'];
  assert.deepEqual(layoutColours('per-zone', cols), cols);
});

test('layoutColours: too-few colours fall back to the last one (never undefined)', () => {
  const z = layoutColours('per-zone', ['#123456', '#654321']); // only 2 for 6 zones
  assert.equal(z.length, 6);
  assert.ok(z.every(c => typeof c === 'string'));
  assert.equal(z[5], '#654321');           // beyond the array → last colour
});

test('layoutColours: empty/absent colours → a safe default, unknown layout → solid', () => {
  assert.equal(layoutColours('solid', []).length, 6);
  assert.ok(layoutColours('solid', [])[0].startsWith('#'));
  assert.deepEqual(layoutColours('bogus', ['#abcabc']), Array(6).fill('#abcabc'));
});

// ── zoneColors resolver ──────────────────────────────────────────────────────
test('zoneColors: static returns 6 {color,intensity:1} matching the layout', () => {
  const out = zoneColors({ layout: 'per-zone', anim: 'none',
    colors: ['#010101', '#020202', '#030303', '#040404', '#050505', '#060606'] }, 5);
  assert.equal(out.length, 6);
  assert.deepEqual(out.map(z => z.color), ['#010101', '#020202', '#030303', '#040404', '#050505', '#060606']);
  assert.ok(out.every(z => z.intensity === 1));
});

test('zoneColors: missing/partial config resolves safely (defaults to solid/static)', () => {
  const out = zoneColors(undefined, 0);
  assert.equal(out.length, 6);
  assert.ok(out.every(z => typeof z.color === 'string' && z.intensity === 1));
});

test('zoneColors: pulse breathes intensity in [0,1], shared across zones; 0.5 at t=0', () => {
  const cfg = { layout: 'solid', anim: 'pulse', colors: ['#00ffff'], speed: 1 };
  const at0 = zoneColors(cfg, 0);
  assert.ok(Math.abs(at0[0].intensity - 0.5) < 1e-9);
  assert.ok(at0.every(z => z.intensity === at0[0].intensity)); // all zones breathe together
  assert.ok(at0.every(z => z.color === '#00ffff'));            // colour unchanged by pulse
  // sweep a cycle: intensity stays within [0,1] and actually varies
  let min = 1, max = 0;
  for (let i = 0; i < 60; i++) { const v = zoneColors(cfg, i / 20)[0].intensity; min = Math.min(min, v); max = Math.max(max, v); }
  assert.ok(min < 0.1 && max > 0.9, `pulse should span most of [0,1] (min ${min}, max ${max})`);
});

test('zoneColors: rainbow spreads distinct hues around the ring and rotates over time', () => {
  const cfg = { layout: 'solid', anim: 'rainbow', colors: ['#ffffff'], speed: 1 };
  const a = zoneColors(cfg, 0);
  assert.ok(a.every(z => z.color.startsWith('hsl(')));
  assert.equal(new Set(a.map(z => z.color)).size, 6);          // 6 different hues
  const b = zoneColors(cfg, 1);                                 // 1s later → rotated
  assert.notEqual(a[0].color, b[0].color);
});

test('zoneColors: flow rotates the mapped colours around the ring and is periodic', () => {
  const cfg = { layout: 'per-zone', anim: 'flow', speed: 1,
    colors: ['#ff0000', '#ffaa00', '#ffff00', '#00ff00', '#0000ff', '#ff00ff'] };
  const z0 = zoneColors(cfg, 0);
  // a given zone's colour changes as the ring flows
  const later = zoneColors(cfg, 1);
  assert.notEqual(z0[0].color, later[0].color);
  // one full revolution (speed*FLOW_REV*t = 1 → t = 1/0.22) returns to the start
  const period = 1 / 0.22;
  const zP = zoneColors(cfg, period);
  for (let i = 0; i < 6; i++) assert.equal(z0[i].color, zP[i].color);
});

test('defaultNeon: solid/static single colour', () => {
  assert.deepEqual(defaultNeon('#39FF14'), { layout: 'solid', anim: 'none', colors: ['#39FF14'], speed: 1 });
});
