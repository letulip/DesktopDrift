// Tests for js/emotion-overlay.js pure helpers (the cache key + placeholder recolour).
// The fetch/Image loader is browser-only and guarded, so importing here runs no browser code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMOTIONS, emotionKey, recolorEmotion } from '../js/emotion-overlay.js';

test('EMOTIONS: the 11 mood ids matching the cars/emotions/*.svg suffixes', () => {
  assert.deepEqual(EMOTIONS,
    ['angry', 'bored', 'evil', 'joy', 'lol', 'love', 'puzzled', 'questioned', 'sleep', 'smug', 'tired']);
});

test('emotionKey: stable, varies by every input, tint/finish/outline optional', () => {
  assert.equal(emotionKey('plum', 'joy', '#8e4585', '#3a3f47', 'chrome', '#e8e8e8'), 'plum|joy|#8e4585|#3a3f47|chrome|#e8e8e8');
  assert.equal(emotionKey('plum', 'joy', '#8e4585', null, null, null), 'plum|joy|#8e4585|||');
  assert.notEqual(emotionKey('plum', 'joy', '#8e4585', null, null, null), emotionKey('plum', 'joy', '#000000', null, null, null));
  assert.notEqual(emotionKey('plum', 'joy', '#8e4585', null, null, null), emotionKey('bismark', 'joy', '#8e4585', null, null, null));
  assert.notEqual(emotionKey('plum', 'joy', '#8e4585', null, 'matte', null), emotionKey('plum', 'joy', '#8e4585', null, 'chrome', null));   // finish varies
  assert.notEqual(emotionKey('plum', 'joy', '#8e4585', null, null, '#fff'), emotionKey('plum', 'joy', '#8e4585', null, null, '#000'));       // outline varies
});

test('recolorEmotion: #D9D9D9 → body always; #3B97D3 + #222222 → glass tint only when a tint is applied', () => {
  const svg = '<path fill="#D9D9D9"/><path fill="#3B97D3"/><path fill="#222222"/>';
  // no tint → body applied, glass eyes keep their defaults
  assert.equal(recolorEmotion(svg, '#8e4585', null), '<path fill="#8e4585"/><path fill="#3B97D3"/><path fill="#222222"/>');
  // tint applied → both glass placeholders (open-eye iris + dark eyes) follow the tint
  assert.equal(recolorEmotion(svg, '#8e4585', '#2f6fb0'), '<path fill="#8e4585"/><path fill="#2f6fb0"/><path fill="#2f6fb0"/>');
});

test('recolorEmotion: outline stroke (#000/#222, 3-digit) → outline colour; a 6-digit #222222 glass eye is NOT an outline', () => {
  const svg = '<path stroke="#000"/><path stroke="#222"/><path fill="#222222"/><circle fill="#35495e"/>';
  assert.equal(recolorEmotion(svg, '#8e4585', null, null), svg);   // no outline equipped → strokes untouched
  assert.equal(recolorEmotion(svg, '#8e4585', null, '#e8e8e8'),
    '<path stroke="#e8e8e8"/><path stroke="#e8e8e8"/><path fill="#222222"/><circle fill="#35495e"/>');   // 3-digit strokes recoloured; 6-digit glass eye + other fills left alone
});

test('recolorEmotion: case-insensitive (placeholders are mixed-case across files)', () => {
  assert.equal(recolorEmotion('fill="#d9d9d9"', '#abc123', null), 'fill="#abc123"');
  assert.equal(recolorEmotion('fill="#3b97d3"', '#000', '#ffffff'), 'fill="#ffffff"');
});

test('recolorEmotion: no placeholders (e.g. the all-hearts "love") passes through unchanged', () => {
  const hearts = '<path fill="#ff2244"/>';
  assert.equal(recolorEmotion(hearts, '#8e4585', '#2f6fb0'), hearts);
});
