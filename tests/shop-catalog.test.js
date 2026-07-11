import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, byKind } from '../js/shop-catalog.js';
import { LAYOUTS, ANIMS } from '../js/neon.js';

describe('CATALOG invariants', () => {
  it('all ids are unique', () => {
    const ids = CATALOG.map(i => i.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('all prices are positive integers', () => {
    for (const item of CATALOG) {
      assert.ok(Number.isInteger(item.price) && item.price > 0,
        `${item.id}: price ${item.price} is not a positive integer`);
    }
  });

  it('all kinds are known', () => {
    const valid = new Set(['finish', 'trail', 'neon-layout', 'neon-anim']);
    for (const item of CATALOG) {
      assert.ok(valid.has(item.kind), `${item.id}: unknown kind '${item.kind}'`);
    }
  });

  it('all items have non-empty id, name, value', () => {
    for (const item of CATALOG) {
      assert.ok(item.id,    `missing id`);
      assert.ok(item.name,  `${item.id}: missing name`);
      assert.ok(item.value, `${item.id}: missing value`);
    }
  });
});

describe('byKind', () => {
  it('returns finish items', () => {
    const finishes = byKind('finish');
    assert.equal(finishes.length, 4);
    assert.ok(finishes.every(i => i.kind === 'finish'));
  });

  it('finish pricing matches plan (matte 40, metallic 80, pearl 150, chrome 250)', () => {
    const f = Object.fromEntries(byKind('finish').map(i => [i.value, i.price]));
    assert.equal(f.matte,    40);
    assert.equal(f.metallic, 80);
    assert.equal(f.pearl,   150);
    assert.equal(f.chrome,  250);
  });

  it('returns trail items', () => {
    const trails = byKind('trail');
    assert.equal(trails.length, 8);
    assert.ok(trails.every(i => i.kind === 'trail'));
  });

  it('trail values are hex colors', () => {
    for (const item of byKind('trail')) {
      assert.match(item.value, /^#[0-9A-Fa-f]{6}$/,
        `${item.id}: value '${item.value}' is not a hex color`);
    }
  });

  it('unknown kind returns empty array', () => {
    assert.deepEqual(byKind('livery'), []);
    assert.deepEqual(byKind(''), []);
  });
});

describe('Neon FX catalog', () => {
  it('sells 3 layouts (solid stays free/unlisted) with valid neon.js layout ids', () => {
    const layouts = byKind('neon-layout');
    assert.equal(layouts.length, 3);
    const ids = new Set(LAYOUTS.map(l => l.id));
    for (const it of layouts) assert.ok(ids.has(it.value), `${it.id}: value '${it.value}' not a layout`);
    assert.ok(!layouts.some(it => it.value === 'solid'), 'solid must stay free (unlisted)');
  });

  it('sells 3 animations (static stays free/unlisted) with valid neon.js anim ids', () => {
    const anims = byKind('neon-anim');
    assert.equal(anims.length, 3);
    const ids = new Set(ANIMS.map(a => a.id));
    for (const it of anims) assert.ok(ids.has(it.value), `${it.id}: value '${it.value}' not an anim`);
    assert.ok(!anims.some(it => it.value === 'none'), 'static must stay free (unlisted)');
  });
});
