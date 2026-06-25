// Unit tests for the pure colour helper in js/finish.js.
// (paintBody itself is canvas drawing — exercised in the browser, not here.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToRgbStr, FINISHES } from '../js/finish.js';

test('hexToRgbStr: parses #RRGGBB (with or without #, any case) to "r,g,b"', () => {
  assert.equal(hexToRgbStr('#FF2244'), '255,34,68');
  assert.equal(hexToRgbStr('FF2244'),  '255,34,68');
  assert.equal(hexToRgbStr('#ff2244'), '255,34,68');
  assert.equal(hexToRgbStr('#000000'), '0,0,0');
  assert.equal(hexToRgbStr('#FFFFFF'), '255,255,255');
});

test('hexToRgbStr: null/invalid input → null (so callers fall back to the theme)', () => {
  assert.equal(hexToRgbStr(null), null);
  assert.equal(hexToRgbStr(undefined), null);
  assert.equal(hexToRgbStr(''), null);
  assert.equal(hexToRgbStr('#FFF'), null);        // shorthand not supported
  assert.equal(hexToRgbStr('red'), null);
  assert.equal(hexToRgbStr('#GG2244'), null);     // non-hex
});

test('FINISHES lists the four catalog finishes', () => {
  assert.deepEqual(FINISHES, ['matte', 'metallic', 'pearl', 'chrome']);
});
