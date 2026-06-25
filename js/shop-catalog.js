// Shop cosmetics catalog — pure data, no side-effects.
// kind:'finish' → value is a finish name used by drawCar/drawPreview.
// kind:'trail'  → value is a hex color applied to skid/trail marks.
// Free palettes (PALETTE, NEON_PALETTE) are never listed here — they stay free.
export const CATALOG = [
  // Finishes — shading applied to the body colour in drawCar
  { id: 'finish-matte',    name: 'Matte',    price:  40, kind: 'finish', value: 'matte'    },
  { id: 'finish-metallic', name: 'Metallic', price:  80, kind: 'finish', value: 'metallic' },
  { id: 'finish-pearl',    name: 'Pearl',    price: 150, kind: 'finish', value: 'pearl'    },
  { id: 'finish-chrome',   name: 'Chrome',   price: 250, kind: 'finish', value: 'chrome'   },

  // Trail colours — applied to skid marks instead of the default near-black
  { id: 'trail-crimson', name: 'Crimson', price: 40, kind: 'trail', value: '#FF2244' },
  { id: 'trail-fuoco',   name: 'Fuoco',   price: 40, kind: 'trail', value: '#FF6600' },
  { id: 'trail-oro',     name: 'Oro',     price: 40, kind: 'trail', value: '#FFCC00' },
  { id: 'trail-mint',    name: 'Mint',    price: 40, kind: 'trail', value: '#00FF88' },
  { id: 'trail-azzurro', name: 'Azzurro', price: 40, kind: 'trail', value: '#00AAFF' },
  { id: 'trail-viola',   name: 'Viola',   price: 40, kind: 'trail', value: '#CC44FF' },
  { id: 'trail-rosa',    name: 'Rosa',    price: 40, kind: 'trail', value: '#FF44CC' },
  { id: 'trail-acqua',   name: 'Acqua',   price: 40, kind: 'trail', value: '#44FFCC' },
];

// Returns all catalog items of a given kind. Unknown kind → [].
export const byKind = (kind) => CATALOG.filter(item => item.kind === kind);
