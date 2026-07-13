// Pure HTML-transform helpers for per-platform builds (used by scripts/build.js,
// unit-tested in tests/build-helpers.test.js). Portals serve from their own CDN
// and forbid outbound links, so platform builds strip the Service Worker and
// every external anchor from the shipped HTML.

// Remove ServiceWorker-registration <script> blocks. The registration snippets
// are single <script> elements with no nested tags (see index.html et al.), so
// [^<]* is sufficient and cannot over-match into neighbouring elements.
export const stripServiceWorker = (html) =>
  html.replace(/[ \t]*<script>[^<]*serviceWorker[^<]*<\/script>\n?/g, '');

// Remove outbound anchors: any <a> whose href is an absolute http(s) URL
// (YouTube/GitHub/payment links) or the donate page. Internal navigation
// (<a href="tracks.html">) and <link>/<meta> tags are untouched.
export const stripExternalLinks = (html) =>
  html.replace(/[ \t]*<a\s[^>]*href="(?:https?:\/\/|donate\.html)[^"]*"[^>]*>[\s\S]*?<\/a>\n?/g, '');
