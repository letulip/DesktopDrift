// Shop cosmetics catalog — pure data, no side-effects.
// kind:'finish'       → value is a finish name used by drawCar/drawPreview.
// kind:'trail'        → value is a hex color applied to skid/trail marks.
// kind:'glass'        → value is a hex color recolouring the car's dark windows (#222222 details).
// kind:'outline'      → value is a hex color recolouring the car's body outline + panel lines.
// kind:'expression'   → value is an emotion id → cars/emotions/<carId>-<value>.svg face overlay (Flair → Moods).
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

  // Glass tint — recolours the car's dark windows (the #222222 details)
  { id: 'glass-smoke',   name: 'Smoke',   price: 40, kind: 'glass', value: '#3a3f47' },
  { id: 'glass-slate',   name: 'Slate',   price: 40, kind: 'glass', value: '#566275' },
  { id: 'glass-azure',   name: 'Azure',   price: 40, kind: 'glass', value: '#2f6fb0' },
  { id: 'glass-sky',     name: 'Sky',     price: 40, kind: 'glass', value: '#4aa3e0' },
  { id: 'glass-teal',    name: 'Teal',    price: 40, kind: 'glass', value: '#2f9e9e' },
  { id: 'glass-jade',    name: 'Jade',    price: 40, kind: 'glass', value: '#1f8f6a' },
  { id: 'glass-mint',    name: 'Mint',    price: 40, kind: 'glass', value: '#4fbf8f' },
  { id: 'glass-lime',    name: 'Lime',    price: 40, kind: 'glass', value: '#6fae3a' },
  { id: 'glass-amber',   name: 'Amber',   price: 40, kind: 'glass', value: '#c8912f' },
  { id: 'glass-gold',    name: 'Gold',    price: 40, kind: 'glass', value: '#d4a828' },
  { id: 'glass-ember',   name: 'Ember',   price: 40, kind: 'glass', value: '#c85a2a' },
  { id: 'glass-crimson', name: 'Crimson', price: 40, kind: 'glass', value: '#c0304a' },
  { id: 'glass-rose',    name: 'Rose',    price: 40, kind: 'glass', value: '#b0446a' },
  { id: 'glass-violet',  name: 'Violet',  price: 40, kind: 'glass', value: '#6a4fb0' },

  // Outline colour — recolours the car's body outline + panel lines
  { id: 'outline-white',   name: 'White',   price: 40, kind: 'outline', value: '#e8e8e8' },
  { id: 'outline-silver',  name: 'Silver',  price: 40, kind: 'outline', value: '#b8bcc4' },
  { id: 'outline-ink',     name: 'Ink',     price: 40, kind: 'outline', value: '#101418' },
  { id: 'outline-crimson', name: 'Crimson', price: 40, kind: 'outline', value: '#d02240' },
  { id: 'outline-red',     name: 'Red',     price: 40, kind: 'outline', value: '#e83a2a' },
  { id: 'outline-orange',  name: 'Orange',  price: 40, kind: 'outline', value: '#e06a20' },
  { id: 'outline-gold',    name: 'Gold',    price: 40, kind: 'outline', value: '#e0b020' },
  { id: 'outline-lime',    name: 'Lime',    price: 40, kind: 'outline', value: '#7ad048' },
  { id: 'outline-green',   name: 'Green',   price: 40, kind: 'outline', value: '#30b050' },
  { id: 'outline-teal',    name: 'Teal',    price: 40, kind: 'outline', value: '#20b0a0' },
  { id: 'outline-azure',   name: 'Azure',   price: 40, kind: 'outline', value: '#2f8fd0' },
  { id: 'outline-blue',    name: 'Blue',    price: 40, kind: 'outline', value: '#3a5ce8' },
  { id: 'outline-violet',  name: 'Violet',  price: 40, kind: 'outline', value: '#8a5cf0' },
  { id: 'outline-magenta', name: 'Magenta', price: 40, kind: 'outline', value: '#d048b0' },

  // Flair → Moods — windshield eye/expression overlays (cars/emotions/<carId>-<value>.svg). None (no
  // face) is the free default and is not a catalog item. Owned account-wide, equipped per car.
  { id: 'emo-angry',      name: 'Angry',   price: 40, kind: 'expression', value: 'angry'      },
  { id: 'emo-bored',      name: 'Bored',   price: 40, kind: 'expression', value: 'bored'      },
  { id: 'emo-evil',       name: 'Evil',    price: 40, kind: 'expression', value: 'evil'       },
  { id: 'emo-joy',        name: 'Joy',     price: 40, kind: 'expression', value: 'joy'        },
  { id: 'emo-lol',        name: 'LOL',     price: 40, kind: 'expression', value: 'lol'        },
  { id: 'emo-love',       name: 'Love',    price: 40, kind: 'expression', value: 'love'       },
  { id: 'emo-puzzled',    name: 'Puzzled', price: 40, kind: 'expression', value: 'puzzled'    },
  { id: 'emo-questioned', name: 'Curious', price: 40, kind: 'expression', value: 'questioned' },
  { id: 'emo-sleep',      name: 'Sleepy',  price: 40, kind: 'expression', value: 'sleep'      },
  { id: 'emo-smug',       name: 'Smug',    price: 40, kind: 'expression', value: 'smug'       },
  { id: 'emo-tired',      name: 'Tired',   price: 40, kind: 'expression', value: 'tired'      },

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
