// Car "Moods" — emotion face overlays for the windshield (the Flair shop category).
// Each is a full-car SVG at cars/emotions/<carId>-<emotion>.svg, authored in the car's frame and
// final on-screen orientation. Two placeholder colours are recoloured at load (like the game
// recolours the #222222 glass detail): #D9D9D9 → the car body colour ALWAYS; #3B97D3 → the glass
// tint ONLY when a tint is equipped (else it stays the default eye colour). Placeholders are mixed
// case across files, so the replace is case-insensitive.
//
// Rasterising is async (fetch text → recolour → decode an Image), but the renderers draw every frame
// synchronously — so we cache the decoded bitmap keyed by (carId, emotion, body, tint): preloadEmotion
// kicks the async load (awaitable), getEmotionBitmap is a sync cache read on the hot path.

export const EMOTIONS = ['angry', 'bored', 'evil', 'joy', 'lol', 'love', 'puzzled', 'questioned', 'sleep', 'smug', 'tired'];

// Pure (unit-tested): cache key + the placeholder recolour.
export const emotionKey = (carId, emotion, body, tint) => `${carId}|${emotion}|${body || ''}|${tint || ''}`;

export const recolorEmotion = (svgText, body, tint) => {
  let s = svgText.replace(/#d9d9d9/gi, body || '#d9d9d9');   // body colour (always)
  if (tint) s = s.replace(/#3b97d3/gi, tint);               // eye colour follows the glass tint (only if equipped)
  return s;
};

// ── Browser-only cache + loader (guarded: the two functions touch fetch/Image only when called,
// so importing this module under node — for the pure-helper tests — runs no browser code) ──
const _ready = new Map();      // key → HTMLImageElement (decoded)
const _loading = new Map();    // key → Promise<Image|null> (in-flight, for dedupe + await)
const _listeners = new Set();  // repaint callbacks for one-shot previews (garage/modify)

// Register a callback fired whenever an emotion bitmap finishes loading (so a preview that paints
// once can repaint when its overlay arrives). Returns an unsubscribe fn.
export const onEmotionReady = (cb) => { _listeners.add(cb); return () => _listeners.delete(cb); };

// Sync cache read for the render hot path. Returns the decoded Image or null (not loaded / no emotion).
export const getEmotionBitmap = (carId, emotion, body, tint) =>
  (carId && emotion) ? (_ready.get(emotionKey(carId, emotion, body, tint)) || null) : null;

// Fetch + recolour + decode the overlay, caching the bitmap. Deduped per key; resolves to the Image
// (or null on any failure — offline before first fetch, 404, decode error — so callers degrade to no
// overlay instead of throwing).
export const preloadEmotion = (carId, emotion, body, tint) => {
  if (!carId || !emotion) return Promise.resolve(null);
  const key = emotionKey(carId, emotion, body, tint);
  if (_ready.has(key)) return Promise.resolve(_ready.get(key));
  if (_loading.has(key)) return _loading.get(key);
  const p = (async () => {
    try {
      const url = new URL(`../cars/emotions/${carId}-${emotion}.svg`, import.meta.url);   // same-origin → SW-cached
      const res = await fetch(url);
      if (!res.ok) return null;
      const svg = recolorEmotion(await res.text(), body, tint);
      const img = new Image();
      const decoded = new Promise((ok, err) => { img.onload = ok; img.onerror = err; });
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await decoded;
      _ready.set(key, img);
      _listeners.forEach(cb => { try { cb(); } catch { /* a bad listener can't break loading */ } });
      return img;
    } catch {
      return null;
    } finally {
      _loading.delete(key);
    }
  })();
  _loading.set(key, p);
  return p;
};
