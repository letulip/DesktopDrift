// Usage: addProp({ ...ITEM_PLATE_YELLOW, x: 800, y: -450, ang: 0 });

// --- Collectible items (coins) ---
// Tyre coin (slightly enlarged for gameplay, capsule collider)
export const ITEM_TIRE_COIN = { hl: 15, r: 12, kind: 'board', c: '#555555', imgSrc: 'objects/tire.svg' };

// --- Cola cap collectible ---
// Collected by drifting a full circle ("donut") around it.
// Not a physics prop — no collider; lives only in track.collectibles[].
export const COLA_CAP = {
  kind:     'cola',
  r:        26,              // visual radius in game units
  imgEmpty: 'objects/cola.svg',         // empty cap (pink)
  imgFull:  'objects/cola-filled.svg',  // full cap (red)
};
