// Pure sizing helper for the offscreen static-track-surface bake in render.js.
//
// The table + track ribbon never move during a race, so render.js pre-renders them
// ONCE into an offscreen canvas (world coordinates) and blits that each frame instead
// of re-stroking the 200px round-join centreline. This function decides how big that
// offscreen bitmap is: it picks pixels-per-world-unit at the device's on-screen
// sharpness (targetScale), then clamps so the canvas stays within safe limits —
// iOS Safari fails above ~4096 px per side, and a huge backing store can fail to
// allocate on low-end devices. maxArea caps the total (12M px ≈ 48 MB @ RGBA).
export const bakeSurfaceDims = (worldW, worldH, targetScale, maxDim = 4096, maxArea = 12_000_000) => {
  let scale = Math.min(targetScale, maxDim / worldW, maxDim / worldH);
  if (worldW * scale * worldH * scale > maxArea)
    scale = Math.sqrt(maxArea / (worldW * worldH));
  return {
    scale,
    pw: Math.max(1, Math.ceil(worldW * scale)),
    ph: Math.max(1, Math.ceil(worldH * scale)),
  };
};
