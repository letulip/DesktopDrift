// The SW precache generates mood overlay paths (cars/emotions/) from a
// MOOD_CARS x MOODS grid in sw.js. This test evaluates the real sw.js and
// asserts the generated set matches the files on disk exactly, so adding or
// removing an emotion SVG without updating the grid fails CI instead of
// silently missing the precache.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://example.test/app/';

// sw.js is a classic script (not an ES module). Evaluate it with a minimal
// service-worker-global stub — handlers are registered but never invoked, so
// only self.location matters. Top-level `const`s live in the context's lexical
// scope (not on the context object), so read ASSETS via the completion value.
const loadAssets = () => {
  const ctx = vm.createContext({
    URL,
    self: { location: ORIGIN, addEventListener: () => {} },
  });
  const src = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  // Array.from: the vm realm has its own Array.prototype, which deepStrictEqual rejects.
  return Array.from(vm.runInContext(src + '\nASSETS;', ctx));
};

test('SW precache covers cars/emotions/ on disk exactly (88 files)', () => {
  const prefix = ORIGIN + 'cars/emotions/';
  const precached = loadAssets()
    .filter(u => u.startsWith(prefix))
    .map(u => u.slice(prefix.length))
    .sort();
  const onDisk = fs.readdirSync(path.join(root, 'cars', 'emotions'))
    .filter(f => f.endsWith('.svg'))
    .sort();
  assert.equal(precached.length, 88);
  assert.deepEqual(precached, onDisk);
});

// Every screen module must be precached — else the SPA shell (which imports them, incl. the Phase-C
// game screen) breaks on the first offline visit. Guards against adding a js/screens/*.js and
// forgetting the ASSETS entry.
test('SW precache includes every js/screens/*.js module', () => {
  const assets = loadAssets().map(u => u.slice(ORIGIN.length));
  const onDisk = fs.readdirSync(path.join(root, 'js', 'screens'))
    .filter(f => f.endsWith('.js'))
    .map(f => 'js/screens/' + f)
    .sort();
  for (const m of onDisk) assert.ok(assets.includes(m), `sw.js ASSETS is missing ${m}`);
});

// Every item / collectible art file the game references (imgSrc / imgFull in items.js +
// collectibles.js) must be PRECACHED. Runtime caching alone loses it: activate wipes every
// non-current cache on each version bump, so lazily-cached art vanished offline after every deploy
// and on any not-yet-visited track. Guards against adding an item to items.js and forgetting the
// ITEM_ASSETS entry in sw.js (and against a referenced file that doesn't exist on disk).
test('SW precache covers every item/collectible art file the game references', () => {
  const assets = new Set(loadAssets().map(u => u.slice(ORIGIN.length)));
  const src = ['js/items.js', 'js/collectibles.js']
    .map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n')
    .replace(/\/\/.*$/gm, '');   // strip line comments so a commented-out example path isn't a "reference"
  const referenced = new Set([...src.matchAll(/(?:items|objects)\/[a-z0-9._-]+\.svg/gi)].map(m => m[0]));
  assert.ok(referenced.size >= 70, `expected the full item catalog, found only ${referenced.size}`);
  for (const art of referenced) {
    assert.ok(assets.has(art), `sw.js ASSETS is missing referenced art: ${art}`);
    assert.ok(fs.existsSync(path.join(root, art)), `referenced art does not exist on disk: ${art}`);
  }
});

// The Phase-C change reshapes the precache (adds the game screen), so the cache version must be
// bumped past the last shipped one or clients keep the stale shell.
test('SW cache version is a bumped desktop-drift-vN (past v232)', () => {
  const ctx = vm.createContext({ URL, self: { location: ORIGIN, addEventListener: () => {} } });
  const src = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const cache = vm.runInContext(src + '\nCACHE;', ctx);
  assert.match(cache, /^desktop-drift-v\d+$/);
  assert.notEqual(cache, 'desktop-drift-v232');
});
