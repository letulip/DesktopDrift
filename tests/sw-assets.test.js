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
