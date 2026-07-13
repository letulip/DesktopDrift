#!/usr/bin/env node
// Build script: minifies js/ and css/, copies everything else → dist/
// `--platform=<name>` builds a portal variant into dist-<name>/ instead:
// swaps js/platform.js for js/platform-<name>.js, strips SW registration and
// external links from HTML, prunes SEO files. No flag (or --platform=none)
// keeps the default build byte-identical.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { minify as terserMinify } from 'terser';
import CleanCSS from 'clean-css';
import { stripServiceWorker, stripExternalLinks } from './build-helpers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const platformArg = process.argv.find(a => a.startsWith('--platform='));
const platformVal = platformArg ? platformArg.slice('--platform='.length) : 'none';
const PLATFORM = platformVal === 'none' ? null : platformVal;
const DIST = join(ROOT, PLATFORM ? `dist-${PLATFORM}` : 'dist');

// A platform build swaps js/platform.js for the named adapter — fail fast if
// the adapter does not exist (adapters land one per promo step, no stubs).
const ADAPTER = PLATFORM ? join(ROOT, 'js', `platform-${PLATFORM}.js`) : null;
if (PLATFORM && !existsSync(ADAPTER)) {
  console.error(`build: --platform=${PLATFORM} needs js/platform-${PLATFORM}.js — adapter not found`);
  process.exit(1);
}

// --- Clean dist ---
if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// --- Copy asset directories verbatim ---
for (const dir of ['fonts', 'icons', 'cars', 'items', 'objects', 'tracks']) {
  const src = join(ROOT, dir);
  if (existsSync(src)) cpSync(src, join(DIST, dir), { recursive: true });
}

// --- Copy root static files verbatim (platform builds prune SEO files) ---
const staticFiles = PLATFORM ? ['manifest.json'] : ['manifest.json', 'robots.txt', 'sitemap.xml'];
for (const file of staticFiles) {
  const src = join(ROOT, file);
  if (existsSync(src)) cpSync(src, join(DIST, file));
}

// --- Copy HTML files (platform builds: prune SEO verification pages, strip SW + external links) ---
for (const file of readdirSync(ROOT).filter(f => f.endsWith('.html'))) {
  if (PLATFORM && /^(google|yandex_)/.test(file)) continue; // SEO verification pages
  if (PLATFORM) {
    const html = stripExternalLinks(stripServiceWorker(readFileSync(join(ROOT, file), 'utf8')));
    writeFileSync(join(DIST, file), html);
  } else {
    cpSync(join(ROOT, file), join(DIST, file));
  }
}

// Accumulate minified content for the SW cache-buster hash.
// Any JS or CSS change produces a new hash → the build always emits a fresh
// CACHE key in dist/sw.js without requiring a manual version bump.
const hashInputs = [];

// --- Minify CSS ---
mkdirSync(join(DIST, 'css'), { recursive: true });
const css = new CleanCSS({ level: 2, returnPromise: false });
let cssCount = 0;
for (const file of readdirSync(join(ROOT, 'css')).filter(f => f.endsWith('.css'))) {
  const input = readFileSync(join(ROOT, 'css', file), 'utf8');
  const result = css.minify(input);
  if (result.errors.length) {
    console.error(`CSS error in ${file}:`, result.errors);
    process.exit(1);
  }
  writeFileSync(join(DIST, 'css', file), result.styles);
  hashInputs.push(result.styles);
  cssCount++;
}

// --- Minify JS (js/ directory) ---
mkdirSync(join(DIST, 'js'), { recursive: true });
let jsCount = 0;
for (const file of readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js'))) {
  if (PLATFORM && /^platform-/.test(file)) continue; // other adapters never ship
  // The adapter swap: dist-<name>/js/platform.js is built from the adapter source.
  const srcPath = PLATFORM && file === 'platform.js' ? ADAPTER : join(ROOT, 'js', file);
  const input = readFileSync(srcPath, 'utf8');
  const result = await terserMinify(input, { module: true, compress: true, mangle: true });
  if (result.error) {
    console.error(`JS error in js/${file}:`, result.error);
    process.exit(1);
  }
  writeFileSync(join(DIST, 'js', file), result.code);
  hashInputs.push(result.code);
  jsCount++;
}

// --- Minify sw.js (root service worker) ---
// Inject a content-derived hash as the CACHE key before minification so every
// build that changes any JS or CSS file gets a unique cache version automatically.
const contentHash = createHash('sha1').update(hashInputs.join('')).digest('hex').slice(0, 8);
const swInput = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const swPatched = swInput.replace(/const CACHE\s*=\s*'[^']+'/, `const CACHE='desktop-drift-${contentHash}'`);
if (swPatched === swInput) {
  console.error("build: could not inject content hash — 'const CACHE' not found in sw.js");
  process.exit(1);
}
const swResult = await terserMinify(swPatched, { compress: true, mangle: true });
if (swResult.error) { console.error('JS error in sw.js:', swResult.error); process.exit(1); }
writeFileSync(join(DIST, 'sw.js'), swResult.code);

console.log(`Built ${PLATFORM ? `dist-${PLATFORM}` : 'dist'}/  (${jsCount + 1} JS files, ${cssCount} CSS files, cache=desktop-drift-${contentHash})`);
