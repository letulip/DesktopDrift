// Registry for GENERATED cars (Variant B — see docs/plans/cars.md). The human-edited half:
// the generator (scripts/gen-cars.js) reads this + cars/<svg> and writes js/cars-data.js.
// Legacy cars (Bismark, Panda) stay inline in config.js and are NOT listed here.
//
// Fields:
//   id       stable identity (for the future ownership/pricing layer) + the SVG-derived key
//   name     garage label
//   svg      file under cars/
//   body     kuzov fill colour (not in the SVG — the outline path is stroke-only)
//   stroke   outline colour (optional; defaults to the SVG's stroke, black → #222222)
//   flip     mirror so the nose points +x (game convention); SVGs are authored nose-left
//   len      car length in game units (physics/collision scale; ~75–82 like the legacy cars)
//   ratings  { handling, accel, speed } 0..10 — drive params are derived (js/car-stats.js)
//   feel     optional drive overrides that don't move the star bars (steerSmooth/selfAlign/
//            grip/driftSteerBoost/…); defaults come from config.js CFG at load
export const CAR_REGISTRY = [
  {
    id: 'plum', name: 'Plum', svg: 'plum.svg',
    body: '#8e4585', stroke: '#222222', flip: true, len: 78,
    ratings: { handling: 7, accel: 7, speed: 7 },
    feel: { steerSmooth: 6, selfAlign: 0.85, grip: 0.98, driftSteerBoost: 1.25 },
  },
  {
    id: 'bavarian', name: 'Bavarian', svg: 'bavarian.svg',
    body: '#4a4a4a', stroke: '#222222', flip: true, len: 76,
    ratings: { handling: 8, accel: 6, speed: 7 },
    feel: { steerSmooth: 6, selfAlign: 0.85, grip: 0.98, driftSteerBoost: 1.25 },
  },
  {
    id: 'toretto', name: 'Toretto', svg: 'toretto.svg',
    body: '#c62828', stroke: '#222222', flip: true, len: 74,
    ratings: { handling: 9, accel: 6, speed: 6 },
    // "ideal for holding a drift" — a touch less self-align + more drift steer.
    feel: { steerSmooth: 6, selfAlign: 0.82, grip: 0.985, driftSteerBoost: 1.3 },
  },
  {
    id: 'horse', name: 'Horse', svg: 'horse.svg',
    body: '#6b4226', stroke: '#222222', flip: true, len: 80,   // chocolate, fast muscle car
    ratings: { handling: 5, accel: 8, speed: 8 },
    feel: { steerSmooth: 6, selfAlign: 0.85, grip: 0.98, driftSteerBoost: 1.25 },
  },
  {
    id: 'smasher', name: 'Smasher', svg: 'smasher.svg',
    body: '#BADA55', stroke: '#222222', flip: true, len: 82,   // lime "badass" — a top-speed beast
    ratings: { handling: 3, accel: 9, speed: 9 },
    feel: { steerSmooth: 6, selfAlign: 0.85, grip: 0.98, driftSteerBoost: 1.25 },
  },
];
