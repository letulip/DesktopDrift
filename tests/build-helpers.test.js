// Pure HTML-strip helpers used by the --platform build — scripts/build-helpers.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripServiceWorker, stripExternalLinks } from '../scripts/build-helpers.js';

// ── stripServiceWorker ───────────────────────────────────────────────────────

test('removes the SW registration script line', () => {
  const html = [
    '<script type="module">import { startGame } from "./js/game-engine.js";</script>',
    "<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');</script>",
    '</body>',
  ].join('\n');
  const out = stripServiceWorker(html);
  assert.ok(!out.includes('serviceWorker'));
  assert.ok(out.includes('game-engine.js'), 'other scripts survive');
  assert.ok(out.includes('</body>'));
});

test('removes an indented SW registration including its line break', () => {
  const html = "<div>a</div>\n  <script>navigator.serviceWorker.register('./sw.js');</script>\n<div>b</div>";
  assert.equal(stripServiceWorker(html), '<div>a</div>\n<div>b</div>');
});

test('leaves HTML without SW registration untouched', () => {
  const html = '<script>console.log("hi")</script>';
  assert.equal(stripServiceWorker(html), html);
});

// ── stripExternalLinks ───────────────────────────────────────────────────────

test('removes the donate link/tile', () => {
  const html = '<div class="menu-foot">\n  <a href="donate.html" class="support-link">Support the Dev</a>\n</div>';
  const out = stripExternalLinks(html);
  assert.ok(!out.includes('donate.html'));
  assert.ok(!out.includes('Support the Dev'));
  assert.ok(out.includes('menu-foot'), 'the wrapper survives');
});

test('removes external http(s) anchors (YouTube/GitHub), including multi-line ones', () => {
  const html = [
    '<a href="https://youtube.com/@x" target="_blank">Trailer</a>',
    '<a class="gh"',
    '   href="https://github.com/letulip/DesktopDrift"',
    '   target="_blank" rel="noopener noreferrer">',
    '  <span>Source</span>',
    '</a>',
    '<a href="tracks.html">Tracks</a>',
  ].join('\n');
  const out = stripExternalLinks(html);
  assert.ok(!out.includes('youtube.com'));
  assert.ok(!out.includes('github.com'));
  assert.ok(!out.includes('Trailer'));
  assert.ok(!out.includes('Source'));
  assert.ok(out.includes('<a href="tracks.html">Tracks</a>'), 'internal navigation survives');
});

test('keeps internal anchors and <link>/<meta> URLs', () => {
  const html = [
    '<link rel="canonical" href="https://letulip.github.io/DesktopDrift/">',
    '<meta property="og:url" content="https://letulip.github.io/DesktopDrift/">',
    '<a class="settings-link" href="settings.html">Settings</a>',
  ].join('\n');
  assert.equal(stripExternalLinks(html), html);
});
