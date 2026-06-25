import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, byKind } from '../js/shop-catalog.js';

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

  it('all kinds are finish or trail', () => {
    const valid = new Set(['finish', 'trail']);
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
