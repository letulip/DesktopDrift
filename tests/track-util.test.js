// Юнит-тесты чистой геометрии треков (js/track-util.js). Раньше эти циклы были
// скопированы в три трек-модуля и не покрывались (side-effects на импорте).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chaikin, offsetEdges, placeCones, sampleCheckpoints, prepProp,
} from '../js/track-util.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('chaikin: n точек → 2n, выпуклая комбинация соседей', () => {
  const sq = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  const out = chaikin(sq);
  assert.equal(out.length, 8);
  // первая новая точка = 0.75*a + 0.25*b
  near(out[0].x, 0 * .75 + 10 * .25);
  near(out[0].y, 0);
});

test('offsetEdges: длины совпадают, края симметричны относительно центра', () => {
  const center = [
    { x: -100, y: -100 }, { x: 100, y: -100 },
    { x: 100, y: 100 }, { x: -100, y: 100 },
  ];
  const half = 40;
  const { center: c, outer, inner } = offsetEdges(center, half);
  assert.equal(c.length, 4);
  assert.equal(outer.length, 4);
  assert.equal(inner.length, 4);
  for (let i = 0; i < 4; i++) {
    // середина outer↔inner = центральная точка (края на противоположных нормалях)
    near((outer[i].x + inner[i].x) / 2, center[i].x);
    near((outer[i].y + inner[i].y) / 2, center[i].y);
    // расстояние от центра до края = half
    near(Math.hypot(outer[i].x - center[i].x, outer[i].y - center[i].y), half);
  }
});

test('placeCones: 2 конуса (внешний+внутренний) на каждый шаг', () => {
  const outer = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 }));
  const inner = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 5 }));
  const cones = placeCones(outer, inner, 5); // индексы 0,5 → 4 конуса
  assert.equal(cones.length, 4);
  assert.equal(cones[0].knocked, false);
  assert.equal(cones[0].vx, 0);
});

test('sampleCheckpoints: K точек, первая = center[0]', () => {
  const center = Array.from({ length: 16 }, (_, i) => ({ x: i, y: 0 }));
  const cps = sampleCheckpoints(center, 8);
  assert.equal(cps.length, 8);
  assert.equal(cps[0], center[0]);
  assert.equal(cps[1], center[2]); // floor(1/8*16)=2
});

test('prepProp: hl по умолчанию 0, кэш cos/sin', () => {
  const a = prepProp({ ang: 0 });
  assert.equal(a.hl, 0);
  near(a._cos, 1);
  near(a._sin, 0);
  const b = prepProp({ ang: Math.PI / 2, hl: 5 });
  assert.equal(b.hl, 5);
  near(b._cos, 0);
  near(b._sin, 1);
});
