// Car object — fields mutated in place
export const car = { x: 0, y: 0, angle: 0, vx: 0, vy: 0 };

// Resets car to the track starting position/angle
export const initCar = ({ startPos, startAngle }) => {
  car.x = startPos.x; car.y = startPos.y; car.angle = startAngle;
  car.vx = 0; car.vy = 0;
}

// Scalar defaults — the SINGLE source of truth for both the initial S below and resetState().
// Keeping them in one literal means the two lists can't silently drift apart when a field is
// added. Array/Map/object state is declared separately on S (see below) so it keeps a stable
// reference across a reset — render.js reads S.skids / S.lapScores / S.caps by that reference.
const S_DEFAULTS = {
  carModel:      0,
  steerSmooth:   0,
  steerInput:    0,

  score:         0,
  comboPoints:   0,
  mult:          1,
  driftTime:     0,
  transitions:   0,
  driftGrace:    0,
  lastSlipSign:  0,
  multBuild:     0,
  nearMisses:    0,
  nearMissCd:    0,
  crashCd:       0,

  flashMsg:      '',
  flashT:        0,
  flashColor:    '#fff',

  lapTime:       0,
  lastLap:       null,
  bestLap:       null,
  lapStarted:    true,
  nextCp:        1,
  lapNum:        0,
  lapScoreStart: 0,

  startCd:       3.0,
  goT:           0,
  physT:         0,

  zen:           false,
  reversed:      false, // true when driving a track's reversed variant (Phase D2)
};

// All mutable game state in one object S.
// Both modules (game-engine.js writes, render.js reads) share one reference → no ES binding issues.
export const S = {
  ...S_DEFAULTS,
  lapScores:     [],   // per-lap {n,pts,t} — mutated in place; the reference is held by render.js
  skids:         [],   // drift skid marks — mutated in place; reference held by render.js
  caps:          {},   // runtime cap state keyed by index — reassigned per start by game-engine, read by render
};

// Input
export const keys     = {};
export const pointers = new Map();

// Reset ALL runtime state to defaults for a re-entrant restart (SPA Phase C: "Race Again" no longer
// does location.reload(), so the module-level singletons must be reset by hand). Scalars come from
// the single S_DEFAULTS source; the arrays are cleared IN PLACE (never reassigned) so render.js's
// imported bindings keep pointing at them; keys/pointers are emptied so a key/pointer held across a
// restart can't leak phantom steering. S.caps is left alone — startGame rebuilds it every race.
export const resetState = () => {
  Object.assign(S, S_DEFAULTS);
  S.lapScores.length = 0;
  S.skids.length = 0;
  for (const k in keys) delete keys[k];
  pointers.clear();
};
