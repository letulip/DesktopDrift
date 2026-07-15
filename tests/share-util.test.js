// Tests for js/share-util.js — the pure share helpers + card layout config (no DOM/canvas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHARE_URL, CARD, litStars, buildShareText, shareFilename, pickShareMethod } from '../js/share-util.js';

test('SHARE_URL is the canonical game URL', () => {
  assert.match(SHARE_URL, /^https:\/\/letulip\.github\.io\/DesktopDrift\/?$/);
});

test('CARD: 1080-square canvas with the anchors the renderer needs', () => {
  assert.equal(CARD.w, 1080);
  assert.equal(CARD.h, 1080);
  for (const k of ['rot', 'bodyW', 'rearFromRight', 'rearFromBottom']) assert.ok(k in CARD.car, `car.${k}`);
  assert.equal(CARD.car.bodyW, 140);
  for (const k of ['x', 'baseY', 'numSize', 'ppsSize']) assert.ok(k in CARD.score, `score.${k}`);
  for (const k of ['x', 'nameSize', 'maxW', 'lapFromBottom']) assert.ok(k in CARD.track, `track.${k}`);
  assert.equal(CARD.score.x, 54);              // left texts share the same left margin
  assert.equal(CARD.stars.x, 54);
  assert.equal(CARD.track.x, 54);
});

test('litStars: 1 per 100 PPS, capped at 5, floor', () => {
  assert.equal(litStars(0), 0);
  assert.equal(litStars(99), 0);
  assert.equal(litStars(100), 1);
  assert.equal(litStars(349), 3);
  assert.equal(litStars(500), 5);
  assert.equal(litStars(685), 5);              // DDK still caps at 5 (crown is separate)
  assert.equal(litStars(undefined), 0);
});

test('buildShareText: PPS + track + hook, no URL (Web Share carries the url separately)', () => {
  const s = buildShareText({ trackName: 'Breakfast Boulevard', pps: 685 });
  assert.match(s, /685 PPS/);
  assert.match(s, /Breakfast Boulevard/);
  assert.match(s, /Can you beat it\?/);
  assert.ok(!s.includes('http'), 'no URL baked into the caption');
  assert.match(buildShareText({ trackName: 'X', pps: 1234.6 }), /1,235 PPS/);   // rounded + grouped
});

test('shareFilename: slugged, safe, .png', () => {
  assert.equal(shareFilename({ trackName: 'Breakfast Boulevard', pps: 685 }), 'desktop-drift-breakfast-boulevard-685pps.png');
  assert.equal(shareFilename({ trackName: 'Macchiato Madness (reversed)', pps: 642.4 }), 'desktop-drift-macchiato-madness-reversed-642pps.png');
  assert.equal(shareFilename({ trackName: '', pps: 0 }), 'desktop-drift-run-0pps.png');   // empty name → safe fallback
});

test('pickShareMethod: native share only when files are shareable AND touch-primary', () => {
  assert.equal(pickShareMethod({ canShareFiles: true, coarsePointer: true }), 'share');
  assert.equal(pickShareMethod({ canShareFiles: true, coarsePointer: false }), 'download');   // desktop → reliable download path
  assert.equal(pickShareMethod({ canShareFiles: false, coarsePointer: true }), 'download');
  assert.equal(pickShareMethod({ canShareFiles: false, coarsePointer: false }), 'download');
});
