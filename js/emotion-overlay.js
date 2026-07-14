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
export const emotionKey = (carId, emotion, body, tint, finish, outline) => `${carId}|${emotion}|${body || ''}|${tint || ''}|${finish || ''}|${outline || ''}`;

export const recolorEmotion = (svgText, body, tint, outline) => {
  let s = svgText.replace(/#d9d9d9/gi, body || '#d9d9d9');                  // body colour (always)
  if (tint) s = s.replace(/#(3b97d3|222222)\b/gi, tint);                   // glass eyes follow the glass tint: #3B97D3 (open-eye iris) + #222222 (joy/lol/sleep dark eyes, = the car's default window colour)
  if (outline) s = s.replace(/#(000000|000|222)\b/gi, outline);            // outline stroke (#000/#222, 3-digit) follows the body outline; #222222 is a 6-digit glass eye handled above
  return s;
};

// Pure (unit-tested): drop the negative (null) entries from a cache map so failed loads can retry.
// Wired to the window 'online' event below — one network blip must not hide the equipped mood for
// the whole page session; positive entries (decoded bitmaps) are kept.
export const clearNegativeEntries = (map) => { for (const [k, v] of map) if (v === null) map.delete(k); };

// ── Browser-only cache + loader (guarded: the two functions touch fetch/Image only when called,
// so importing this module under node — for the pure-helper tests — runs no browser code) ──
const _ready = new Map();      // key → HTMLImageElement (decoded)
const _loading = new Map();    // key → Promise<Image|null> (in-flight, for dedupe + await)
const _listeners = new Set();  // repaint callbacks for one-shot previews (garage/modify)

// Connectivity back → let negatively-cached overlays retry (render.js preloads per frame, so the
// negative cache itself must stay — this just clears it at the one moment a retry can succeed).
if (typeof window !== 'undefined') window.addEventListener('online', () => clearNegativeEntries(_ready));

// Register a callback fired whenever an emotion bitmap finishes loading (so a preview that paints
// once can repaint when its overlay arrives). Returns an unsubscribe fn.
export const onEmotionReady = (cb) => { _listeners.add(cb); return () => _listeners.delete(cb); };

// Decode an SVG string to an Image via a data URI.
const rasterize = (svgText) => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => res(img); img.onerror = rej;
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
});

// The car's paint finish over the overlay's drawn region (mirrors finish.js paintBody so the
// emotion's #D9D9D9 body patch gets the SAME sheen as the surrounding painted body — otherwise a
// flat patch shows a seam on a metallic/pearl/chrome car). Every car is flip:true and the overlay is
// drawn un-flipped, so the horizontal (pearl) gradient is mirrored to match the on-screen body.
const applyFinish = (g, finish, w, h) => {
  if (finish === 'matte') { g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, 0, w, h); return; }
  if (finish === 'pearl') {
    const grad = g.createLinearGradient(w, 0, 0, 0);   // mirrored (flip:true)
    grad.addColorStop(0, 'rgba(255,255,255,0.20)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    grad.addColorStop(1, 'rgba(170,200,255,0.22)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h); return;
  }
  const chrome = finish === 'chrome';                  // metallic / chrome: vertical highlight (flip-invariant)
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0,   `rgba(0,0,0,${chrome ? 0.30 : 0.18})`);
  grad.addColorStop(0.5, `rgba(255,255,255,${chrome ? 0.48 : 0.24})`);
  grad.addColorStop(1,   `rgba(0,0,0,${chrome ? 0.30 : 0.18})`);
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
};

// Sync cache read for the render hot path. Returns the decoded bitmap (Image or Canvas) or null.
export const getEmotionBitmap = (carId, emotion, body, tint, finish, outline) =>
  (carId && emotion) ? (_ready.get(emotionKey(carId, emotion, body, tint, finish, outline)) || null) : null;

// Fetch + recolour + decode the overlay, caching the bitmap. Deduped per key; resolves to the bitmap
// (or null on any failure — offline before first fetch, 404, decode error — so callers degrade to no
// overlay instead of throwing). When a finish is equipped, the body patch is re-shaded to match it
// (finish over the whole overlay via source-atop, then the crisp eyes are drawn back on top).
export const preloadEmotion = (carId, emotion, body, tint, finish, outline) => {
  if (!carId || !emotion) return Promise.resolve(null);
  const key = emotionKey(carId, emotion, body, tint, finish, outline);
  if (_ready.has(key)) return Promise.resolve(_ready.get(key));
  if (_loading.has(key)) return _loading.get(key);
  const p = (async () => {
    try {
      const url = new URL(`../cars/emotions/${carId}-${emotion}.svg`, import.meta.url);   // same-origin → SW-cached
      const res = await fetch(url);
      if (!res.ok) throw new Error('emotion fetch ' + res.status);   // → catch → negative cache (no per-frame retry)
      const text = await res.text();
      const overlay = await rasterize(recolorEmotion(text, body, tint, outline));
      let bitmap = overlay;
      if (finish) {
        // Shade ONLY the #D9D9D9 body-skin with the car's finish (so it matches the painted body), leaving
        // the eyes/sclera crisp and the SVG's own z-order intact. Build a mask of just the skin path (every
        // other fill/stroke hidden), clip the finish gradient to it, then lay that over the overlay.
        // (An earlier "redraw eyes on top" approach exposed the white #fff sclera wherever the skin path was
        //  drawn OVER the eyes — on open-eye moods — turning the skin white.)
        const maskSvg = text.replace(/#d9d9d9/gi, 'SKINKEEP')
          .replace(/#[0-9a-f]{3,8}\b/gi, 'none')   // hide every other fill + stroke
          .replace(/SKINKEEP/g, '#000');           // the skin path → opaque mask
        const mask = await rasterize(maskSvg);
        const w = overlay.naturalWidth || overlay.width, h = overlay.naturalHeight || overlay.height;
        const fc = document.createElement('canvas'); fc.width = w; fc.height = h;
        const fg = fc.getContext('2d');
        fg.drawImage(mask, 0, 0);
        fg.globalCompositeOperation = 'source-in';   // finish gradient clipped to the skin shape
        applyFinish(fg, finish, w, h);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d');
        g.drawImage(overlay, 0, 0);
        g.drawImage(fc, 0, 0);                        // shade only the skin; eyes untouched
        bitmap = c;
      }
      _ready.set(key, bitmap);
      _listeners.forEach(cb => { try { cb(); } catch { /* a bad listener can't break loading */ } });
      return bitmap;
    } catch {
      _ready.set(key, null);   // negative cache — don't re-fetch a missing/broken overlay every frame (cleared on 'online' so a network blip can retry)
      return null;
    } finally {
      _loading.delete(key);
    }
  })();
  _loading.set(key, p);
  return p;
};
