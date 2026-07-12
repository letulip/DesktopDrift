// profile-io.js — pure encode/decode/validate for the profile sync feature.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeProfile, decodeProfile, validateProfile, profileJson } from '../js/profile-io.js';

const SAMPLE = {
  version: 4,
  settings: { units: 'mph', haptics: false },
  garage: { carIndex: 2, cars: { 2: { bodyColor: '#BADA55', neon: null } } },
  records: { 'cafe-marble': { timeattack: { bestPPS: 640 } } },
  achievements: { 'first-drift': { unlocked: true, progress: 1 } },
  wallet: 137,
  ledger: [{ t: 1, amount: 12, reason: 'race', balance: 137 }],
  owned: ['finish-chrome'],
  ownedCars: ['toretto'],
  stats: { caps: {}, tires: {}, tiresSwept: ['cafe-marble'], cleared: ['cafe-marble'], runs: 9, driftSecs: 42 },
};

test('encode → decode round-trips the exact profile', () => {
  const code = encodeProfile(SAMPLE);
  assert.ok(code.startsWith('DDP1.'), 'code carries the format header');
  assert.deepEqual(decodeProfile(code), SAMPLE);
});

test('code is a single line (safe to copy/paste)', () => {
  const code = encodeProfile(SAMPLE);
  assert.ok(!/\s/.test(code), 'no whitespace/newlines in the code');
});

test('decode also accepts a raw JSON export (the downloadable file)', () => {
  const json = profileJson(SAMPLE);          // pretty-printed, no header
  assert.deepEqual(decodeProfile(json), SAMPLE);
});

test('round-trips non-ASCII content (UTF-8-safe base64)', () => {
  const p = { version: 4, settings: { units: 'kmh' }, garage: { carIndex: 0, cars: {} }, note: 'café ▲ 日本' };
  assert.deepEqual(decodeProfile(encodeProfile(p)), p);
});

test('validateProfile: real profiles pass, garbage fails', () => {
  assert.equal(validateProfile(SAMPLE), true);
  assert.equal(validateProfile({ settings: {}, wallet: 0 }), true);   // ≥2 known keys
  assert.equal(validateProfile({ foo: 1, bar: 2 }), false);           // unrelated object
  assert.equal(validateProfile({ version: 4 }), false);               // only 1 known key
  assert.equal(validateProfile(null), false);
  assert.equal(validateProfile([1, 2, 3]), false);                    // arrays are not profiles
  assert.equal(validateProfile('DDP1.x'), false);
});

test('decode rejects empty / whitespace input with a clear message', () => {
  assert.throws(() => decodeProfile(''), /Paste a profile code/);
  assert.throws(() => decodeProfile('   '), /Paste a profile code/);
  assert.throws(() => decodeProfile(null), /Paste a profile code/);
});

test('decode rejects a damaged code and non-profile JSON', () => {
  assert.throws(() => decodeProfile('DDP1.!!!not base64!!!'), /damaged|not a valid/i);
  assert.throws(() => decodeProfile('{ not json'), /not a valid Desktop Drift profile/);
  assert.throws(() => decodeProfile('{"foo":1,"bar":2}'), /not a Desktop Drift profile/);
});

test('encode rejects a non-object', () => {
  assert.throws(() => encodeProfile(null), /Nothing to export/);
  assert.throws(() => encodeProfile('x'), /Nothing to export/);
});
