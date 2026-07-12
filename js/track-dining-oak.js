// "Dining Oak" track (Breakfast Boulevard) — generated from tracks/dining-oak.svg.
// Warm oak breakfast table on the default dark scheme (matches render.js THEME_DEFAULT),
// so no light-surface HUD/flag fixes are needed. All 35 item ids resolve to existing
// descriptors in js/items.js (direct match, or a single trailing _N stripped).
import { makeTrack, TRACK_HALF, CONE_R, K, CP_R } from './track-factory.js';

export { TRACK_HALF, CONE_R, K, CP_R };

export const {
  center, outer, inner, cones, TABLE,
  props, collectibles, checkpoints,
  startPos, startAngle, id, laps, theme,
} = await makeTrack({
  svgPath: './tracks/dining-oak.svg',
  id:      'dining-oak',
  laps:    3,
  tires:   12,   // seeded along the centerline (see js/tire-seed.js); must match registry `tires`
  theme:   {
    background: '#0f0b08',
    table:      '#2e241a',
    tableEdge:  '#5a4a36',
    track:      '#cdbf9e',   // warm light tan, consistent with the other tracks (was the dark default #43372a)
    skid:       'rgba(15,9,6,0.5)',
    checkpoint: 'rgba(125,212,255,0.5)',
    cone:       '#ff7a1a',
  },
});
