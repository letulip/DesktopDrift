// Tests for js/emotion-overlay.js pure helpers (the cache key + placeholder recolour).
// The fetch/Image loader is browser-only and guarded, so importing here runs no browser code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMOTIONS, emotionKey, recolorEmotion } from '../js/emotion-overlay.js';

test('EMOTIONS: the 11 mood ids matching the cars/emotions/*.svg suffixes', () => {
  assert.deepEqual(EMOTIONS,
    ['angry', 'bored', 'evil', 'joy', 'lol', 'love', 'puzzled', 'questioned', 'sleep', 'smug', 'tired']);
});

test('emotionKey: stable, varies by every input, tint-optional', () => {
  assert.equal(emotionKey('plum', 'joy', '#8e4585', '#3a3f47'), 'plum|joy|#8e4585|#3a3f47');
  assert.equal(emotionKey('plum', 'joy', '#8e4585', null), 'plum|joy|#8e4585|');
  assert.notEqual(emotionKey('plum', 'joy', '#8e4585', null), emotionKey('plum', 'joy', '#000000', null));
  assert.notEqual(emotionKey('plum', 'joy', '#8e4585', null), emotionKey('bismark', 'joy', '#8e4585', null));
});

test('recolorEmotion: #D9D9D9 → body always; #3B97D3 → tint only when a tint is applied', () => {
  const svg = '<path fill="#D9D9D9"/><path fill="#3B97D3"/>';
  // no tint → body applied, eye colour kept as the default
  assert.equal(recolorEmotion(svg, '#8e4585', null), '<path fill="#8e4585"/><path fill="#3B97D3"/>');
  // tint applied → both recoloured
  assert.equal(recolorEmotion(svg, '#8e4585', '#2f6fb0'), '<path fill="#8e4585"/><path fill="#2f6fb0"/>');
});

test('recolorEmotion: case-insensitive (placeholders are mixed-case across files)', () => {
  assert.equal(recolorEmotion('fill="#d9d9d9"', '#abc123', null), 'fill="#abc123"');
  assert.equal(recolorEmotion('fill="#3b97d3"', '#000', '#ffffff'), 'fill="#ffffff"');
});

test('recolorEmotion: no placeholders (e.g. the all-hearts "love") passes through unchanged', () => {
  const hearts = '<path fill="#ff2244"/>';
  assert.equal(recolorEmotion(hearts, '#8e4585', '#2f6fb0'), hearts);
});
