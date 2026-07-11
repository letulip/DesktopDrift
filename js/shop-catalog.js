// Shop cosmetics catalog — pure data, no side-effects.
// kind:'finish'       → value is a finish name used by drawCar/drawPreview.
// kind:'trail'        → value is a hex color applied to skid/trail marks.
// kind:'neon-layout'  → value is a neon.js LAYOUT id (unlocks that zone layout).
// kind:'neon-anim'    → value is a neon.js ANIM id (unlocks that animation).
// Free palettes (PALETTE, NEON_PALETTE) + the default solid/static neon stay free (not listed).
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

  // Neon FX — zone layouts (solid stays free/unlisted) — see docs/plans/neon.md
  { id: 'neon-layout-longitudinal',   name: 'Left / Right',       price:  80, kind: 'neon-layout', value: 'longitudinal'    },
  { id: 'neon-layout-front-mid-rear', name: 'Front / Mid / Rear', price: 110, kind: 'neon-layout', value: 'front-mid-rear'  },
  { id: 'neon-layout-per-zone',       name: 'Per-zone',           price: 150, kind: 'neon-layout', value: 'per-zone'        },

  // Neon FX — animations (static stays free/unlisted)
  { id: 'neon-anim-pulse',   name: 'Pulse',          price: 120, kind: 'neon-anim', value: 'pulse'   },
  { id: 'neon-anim-rainbow', name: 'Rainbow',        price: 150, kind: 'neon-anim', value: 'rainbow' },
  { id: 'neon-anim-flow',    name: 'Circular Flow',  price: 250, kind: 'neon-anim', value: 'flow'    },
];

// Returns all catalog items of a given kind. Unknown kind → [].
export const byKind = (kind) => CATALOG.filter(item => item.kind === kind);
