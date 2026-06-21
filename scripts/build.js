#!/usr/bin/env node
// Build script: minifies js/ and css/, copies everything else → dist/
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { minify as terserMinify } from 'terser';
import CleanCSS from 'clean-css';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

// --- Clean dist ---
if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// --- Copy asset directories verbatim ---
for (const dir of ['fonts', 'icons', 'cars', 'items', 'objects', 'tracks']) {
  const src = join(ROOT, dir);
  if (existsSync(src)) cpSync(src, join(DIST, dir), { recursive: true });
}

// --- Copy root static files verbatim ---
for (const file of ['manifest.json', 'robots.txt', 'sitemap.xml']) {
  const src = join(ROOT, file);
  if (existsSync(src)) cpSync(src, join(DIST, file));
}

// --- Copy HTML files verbatim ---
for (const file of readdirSync(ROOT).filter(f => f.endsWith('.html'))) {
  cpSync(join(ROOT, file), join(DIST, file));
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
  const input = readFileSync(join(ROOT, 'js', file), 'utf8');
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

console.log(`Built dist/  (${jsCount + 1} JS files, ${cssCount} CSS files, cache=desktop-drift-${contentHash})`);
